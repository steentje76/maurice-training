/* fWearableTokenLifecycle.test.js — v4.70.25 (DEC-VAULT-001, DEC-API-001).
 *
 * AANLEIDING (productie, 11 oktober 2026). Zes keer HTTP 409 / SQLSTATE 23505 op
 * store_wearable_token_secret: tokens stonden in Vault onder een vaste naam per gebruiker,
 * loskoppelen liet de secrets staan, en vault.secrets heeft een unieke index op name.
 * Daarnaast faalde elke serveraanroep vanuit de Android-app (relatieve /.netlify/functions/-
 * paden op https://localhost) en bleef een verlopen koppeling groen "Gekoppeld".
 *
 * OPZET. De echte serverfuncties draaien tegen een nagebouwde Supabase die de relevante
 * productie-eigenschappen afdwingt:
 *   - unieke secretnaam (409 + code 23505, zoals secrets_name_idx);
 *   - UNIQUE(user_id, provider) op wearable_connections;
 *   - PostgREST-upsert lost zonder on_conflict alleen een conflict op de primaire sleutel op.
 * Geen echte Google- of Supabase-aanroep. Alle console-uitvoer en alle URL's worden
 * opgevangen en doorzocht op tokenwaarden.
 *
 * A  eerste koppeling                         G  token-refresh (permanent/tijdelijk/rotatie)
 * B  bestaande Vault-secretnaam (productie)   H  verbindingsstatus (server + client)
 * C  loskoppelen en opnieuw koppelen          I  Android API-routing en CORS
 * D  herkoppelen na verlopen token            J  web-OAuth en terugkeer (web + Android)
 * E  mislukte tokenopslag                     K  geen tokens in logs, URL's of responses
 * F  onvolledige transacties en herstel       L  statische bewaking
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.GOOGLE_HEALTH_CLIENT_ID = 'cid';
process.env.GOOGLE_HEALTH_CLIENT_SECRET = 'csec-GEHEIM';
process.env.GOOGLE_HEALTH_REDIRECT_URI = 'https://test.netlify.app/.netlify/functions/wearable-auth-callback';
process.env.APP_URL = 'https://test.netlify.app';

let pass = 0, fail = 0;
const msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// ── Alle console-uitvoer opvangen: wordt in K doorzocht op tokenwaarden ─────────────────
const logRegels = [];
['log', 'warn', 'error', 'info'].forEach(function (k) {
  console[k] = function () { logRegels.push(Array.prototype.map.call(arguments, function (a) { return typeof a === 'string' ? a : JSON.stringify(a); }).join(' ')); };
});
const echteLog = process.stdout.write.bind(process.stdout);
function uit(s) { echteLog(s + '\n'); }

const GEHEIMEN = []; // elke tokenwaarde die in deze test voorkomt
function token(soort) { const t = (soort === 'refresh' ? '1//REFRESH-' : 'ya29.ACCESS-') + crypto.randomBytes(9).toString('hex'); GEHEIMEN.push(t); return t; }

// Vaste synthetische id's -- nooit echte accounts in een test.
const UID = '11111111-aaaa-4aaa-8aaa-111111111111';
const UID2 = '22222222-bbbb-4bbb-8bbb-222222222222';
const KWARTIER = 15 * 60 * 1000;

function J(obj, status) {
  status = status || 200;
  return { ok: status >= 200 && status < 300, status: status, json: async function () { return obj; }, text: async function () { return JSON.stringify(obj); } };
}

/* ── Nagebouwde Supabase + Google ─────────────────────────────────────────────────────── */
function wereld(opts) {
  opts = opts || {};
  const w = {
    caller: opts.caller === undefined ? UID : opts.caller,
    secrets: new Map(),          // id -> { naam, waarde, gemaakt }
    conns: [],                   // rijen wearable_connections
    states: new Map(),           // state -> { user_id, created_at }
    calls: [],                   // { method, url, body }
    revokes: [],
    cleanupRpc: !!opts.cleanupRpc,
    faal: {},                    // injecteerbare fouten
    google: { exchange: null, refresh: null },
    storeTeller: 0
  };
  w.secretIds = function () { return Array.from(w.secrets.keys()); };
  w.namen = function () { return Array.from(w.secrets.values()).map(function (s) { return s.naam; }); };
  w.conn = function (uid, provider) { return w.conns.find(function (c) { return c.user_id === (uid || UID) && c.provider === (provider || 'google_health'); }) || null; };
  w.waarde = function (id) { const s = w.secrets.get(id); return s ? s.waarde : null; };
  w.wezen = function () {
    return w.secretIds().filter(function (id) { return !w.conns.some(function (c) { return c.access_token_secret_id === id || c.refresh_token_secret_id === id; }); });
  };
  w.legSecret = function (naam, waarde, ouderdomMs) {
    const id = crypto.randomUUID();
    w.secrets.set(id, { naam: naam, waarde: waarde, gemaakt: Date.now() - (ouderdomMs || 0) });
    return id;
  };
  w.fetch = async function (url, o) {
    url = String(url); o = o || {};
    const method = o.method || 'GET';
    const bodyRaw = o.body == null ? null : String(o.body);
    w.calls.push({ method: method, url: url, body: bodyRaw });
    const q = function (naam) { const m = new RegExp('[?&]' + naam + '=eq\\.([^&]*)').exec(url); return m ? decodeURIComponent(m[1]) : null; };

    if (url.indexOf('/auth/v1/user') !== -1) return w.caller ? J({ id: w.caller }) : J({}, 401);

    if (url.indexOf('/rpc/store_wearable_token_secret') !== -1) {
      const b = JSON.parse(bodyRaw); w.storeTeller++;
      if (w.faal.store && w.faal.store(w.storeTeller, b.p_naam)) return J({ code: 'XX000', message: 'storing' }, 500);
      if (w.namen().indexOf(b.p_naam) !== -1) return J({ code: '23505', details: 'Key (name)=(' + b.p_naam + ') already exists.', message: 'duplicate key value violates unique constraint "secrets_name_idx"' }, 409);
      return J(w.legSecret(b.p_naam, b.p_secret, 0));
    }
    if (url.indexOf('/rpc/get_wearable_token_secret') !== -1) return J(w.waarde(JSON.parse(bodyRaw).p_secret_id));
    if (url.indexOf('/rpc/update_wearable_token_secret') !== -1) {
      const b = JSON.parse(bodyRaw);
      if (w.faal.update && w.faal.update(b.p_secret_id)) return J({ code: 'XX000' }, 500);
      const s = w.secrets.get(b.p_secret_id); if (s) s.waarde = b.p_nieuwe_waarde;
      return J(null);
    }
    if (url.indexOf('/rpc/delete_wearable_token_secret') !== -1) {
      const b = JSON.parse(bodyRaw);
      if (w.faal.del && w.faal.del(b.p_secret_id)) return J({ code: 'XX000' }, 500);
      w.secrets.delete(b.p_secret_id);
      return J(null);
    }
    if (url.indexOf('/rpc/cleanup_orphan_wearable_token_secrets') !== -1) {
      if (!w.cleanupRpc) return J({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      const uid = JSON.parse(bodyRaw).p_user_id; let n = 0;
      w.wezen().forEach(function (id) {
        const s = w.secrets.get(id);
        if (new RegExp('^(wearable|whoop|oura|garmin|polar)_(access|refresh)_' + uid + '(_[0-9a-f-]{36})?$').test(s.naam) && Date.now() - s.gemaakt > KWARTIER) { w.secrets.delete(id); n++; }
      });
      return J(n);
    }

    if (url.indexOf('/rest/v1/wearable_connections') !== -1) {
      const uid = q('user_id'), provider = q('provider');
      const match = function (c) { return (!uid || c.user_id === uid) && (!provider || c.provider === provider); };
      if (method === 'GET') { if (w.faal.connRead) return J({ code: 'XX000' }, 500); return J(JSON.parse(JSON.stringify(w.conns.filter(match)))); } // kopie, zoals een echte HTTP-respons
      if (method === 'DELETE') { if (w.faal.connDelete) return J({ code: 'XX000' }, 500); w.conns = w.conns.filter(function (c) { return !match(c); }); return J({}, 204); }
      if (method === 'PATCH') { const b = JSON.parse(bodyRaw); w.conns.filter(match).forEach(function (c) { Object.assign(c, b); }); return J({}, 204); }
      if (method === 'POST') {
        // F1/F8 toetsen een DEFINITIEVE database-afwijzing (409), niet een 5xx waarvan
        // de commitstatus onbekend kan zijn. Onzekere uitkomsten hebben eigen regressies.
        if (w.faal.connWrite) return J({ code: '23505' }, 409);
        const b = JSON.parse(bodyRaw);
        const bestaand = w.conn(b.user_id, b.provider);
        const merge = /resolution=merge-duplicates/.test(String((o.headers || {}).Prefer || ''));
        const opUniek = /[?&]on_conflict=user_id,provider(&|$)/.test(url);
        if (bestaand) {
          // PostgREST: zonder on_conflict geldt alleen de primaire sleutel -> UNIQUE(user_id, provider) faalt.
          if (!(merge && opUniek)) return J({ code: '23505', message: 'duplicate key value violates unique constraint "wearable_connections_user_id_provider_key"' }, 409);
          Object.assign(bestaand, b);
        } else { w.conns.push(Object.assign({ id: crypto.randomUUID() }, b)); }
        return J({}, 201);
      }
    }

    if (url.indexOf('/rest/v1/wearable_oauth_state') !== -1) {
      if (method === 'POST') { const st = crypto.randomUUID(); w.states.set(st, { user_id: w.caller, created_at: new Date().toISOString() }); return J([{ state: st, user_id: w.caller }]); }
      const st = q('state');
      if (method === 'DELETE') { if (st) w.states.delete(st); else w.states.forEach(function (v, k) { if (v.user_id === q('user_id')) w.states.delete(k); }); return J({}, 204); }
      const rij = st ? w.states.get(st) : null;
      return J(rij ? [rij] : []);
    }

    if (url.indexOf('oauth2.googleapis.com/token') !== -1) {
      const p = new URLSearchParams(bodyRaw);
      return p.get('grant_type') === 'refresh_token' ? w.google.refresh(p) : w.google.exchange(p);
    }
    if (url.indexOf('oauth2.googleapis.com/revoke') !== -1) { w.revokes.push({ url: url, body: bodyRaw }); return J({}); }
    return J({}, 404);
  };
  return w;
}

const startMod = require('../netlify/functions/wearable-auth-start.js');
const callbackMod = require('../netlify/functions/wearable-auth-callback.js');
const disconnectMod = require('../netlify/functions/wearable-disconnect.js');
const statusMod = require('../netlify/functions/wearable-status.js');
const syncMod = require('../netlify/functions/wearable-sync.js');
const authLib = require('../netlify/functions/_wearableAuthLib.js');
const vault = require('../netlify/functions/wearableTokenVault.js');
const cors = require('../netlify/functions/_cors.js');

const AUTH = { httpMethod: 'POST', headers: { authorization: 'Bearer sessie' } };

// Volledige koppelflow: start -> (Google) -> callback. Geeft de redirect-locatie terug.
async function koppel(w, o) {
  o = o || {};
  const at = token('access'), rt = o.geenRefresh ? null : token('refresh');
  w.google.exchange = function () { return J(Object.assign({ access_token: at, expires_in: 3600, scope: 's' }, rt ? { refresh_token: rt } : {})); };
  global.fetch = w.fetch;
  const start = await startMod.handler(Object.assign({}, AUTH, o.android ? { body: JSON.stringify({ client: 'android' }) } : {}));
  const authUrl = JSON.parse(start.body).authUrl;
  const state = new URL(authUrl).searchParams.get('state');
  const res = await callbackMod.handler({ httpMethod: 'GET', queryStringParameters: { code: 'code-' + crypto.randomBytes(4).toString('hex'), state: state } });
  return { loc: res.headers.Location, status: res.statusCode, at: at, rt: rt, state: state, authUrl: authUrl };
}
function locStatus(loc) { return new URL(loc).searchParams.get('wearable'); }

async function main() {
  /* ══ A. Eerste koppeling ══════════════════════════════════════════════════════════════ */
  {
    const w = wereld();
    const r = await koppel(w);
    eq(locStatus(r.loc), 'connected', 'A1 eerste koppeling slaagt');
    const c = w.conn();
    ok(c && c.provider === 'google_health' && c.user_id === UID, 'A2 er is precies één koppeling voor deze gebruiker');
    eq(w.secrets.size, 2, 'A3 precies twee secrets (access + refresh)');
    ok(w.waarde(c.access_token_secret_id) === r.at && w.waarde(c.refresh_token_secret_id) === r.rt, 'A4 de koppeling verwijst naar secrets met de ontvangen tokens');
    ok(!('access_token' in c) && !('refresh_token' in c), 'A5 geen plaintext token in de koppelrij');
    ok(w.namen().every(function (n) { return new RegExp('^wearable_(access|refresh)_' + UID + '_[0-9a-f-]{36}$').test(n); }), 'A6 secretnaam = prefix + user-id + unieke uuid');
    eq(w.wezen().length, 0, 'A7 geen wees-secrets na een geslaagde koppeling');
    ok(c.last_sync_status === null && c.last_sync_at === null && !!c.token_expires_at, 'A8 syncstatus is leeg en de vervaltijd is gezet');
  }

  /* ══ B. Bestaande Vault-secretnaam: de productiesituatie van 11 oktober ══════════════ */
  {
    const w = wereld(); // RPC voor opruimen bestaat NIET (migratie v581 niet toegepast)
    const oudA = w.legSecret('wearable_access_' + UID, token('access'), 31 * 24 * 3600 * 1000);
    const oudR = w.legSecret('wearable_refresh_' + UID, token('refresh'), 31 * 24 * 3600 * 1000);
    const r = await koppel(w);
    eq(locStatus(r.loc), 'connected', 'B1 koppelen slaagt terwijl de oude secrets met de vaste naam nog bestaan (was: save_error / HTTP 409)');
    ok(!w.calls.some(function (c) { return /store_wearable_token_secret/.test(c.url) && (JSON.parse(c.body).p_naam === 'wearable_access_' + UID || JSON.parse(c.body).p_naam === 'wearable_refresh_' + UID); }), 'B2 de vaste naam wordt niet meer gebruikt');
    ok(w.secrets.has(oudA) && w.secrets.has(oudR), 'B3 zonder migratie blijven de oude wees-secrets staan (niet blokkerend, niets handmatig verwijderd)');
    ok(w.waarde(w.conn().access_token_secret_id) === r.at, 'B4 de koppeling gebruikt het nieuwe secret');

    // Met de opruim-RPC (migratie v581 toegepast) verdwijnen de oude wezen bij de volgende koppeling.
    const w2 = wereld({ cleanupRpc: true });
    w2.legSecret('wearable_access_' + UID, token('access'), 31 * 24 * 3600 * 1000);
    w2.legSecret('wearable_refresh_' + UID, token('refresh'), 31 * 24 * 3600 * 1000);
    const vreemd = w2.legSecret('wearable_access_' + UID2, token('access'), 31 * 24 * 3600 * 1000);
    const anders = w2.legSecret('mollie_api_key', 'iets-anders', 31 * 24 * 3600 * 1000);
    const r2 = await koppel(w2);
    eq(locStatus(r2.loc), 'connected', 'B5 koppelen slaagt ook met de opruim-RPC');
    eq(w2.wezen().sort(), [vreemd, anders].sort(), 'B6 de eigen oude wezen zijn opgeruimd; secrets van een andere gebruiker en andere Vault-secrets blijven staan');
  }

  /* ══ C. Loskoppelen en opnieuw koppelen ══════════════════════════════════════════════ */
  {
    const w = wereld();
    const r1 = await koppel(w);
    global.fetch = w.fetch;
    const d = await disconnectMod.handler(AUTH);
    eq(d.statusCode, 200, 'C1 loskoppelen slaagt');
    ok(w.conn() === null, 'C2 de koppeling is verwijderd');
    eq(w.secrets.size, 0, 'C3 de Vault-secrets zijn opgeruimd (was: bleven staan)');
    eq(w.revokes.length, 1, 'C4 de toestemming is bij Google ingetrokken');
    ok(new URLSearchParams(w.revokes[0].body).get('token') === r1.rt && w.revokes[0].url.indexOf('token=') === -1, 'C5 intrekken gebeurt met het refresh-token, in de body en niet in de URL');
    const volgorde = w.calls.map(function (c) { return /wearable_connections/.test(c.url) && c.method === 'DELETE' ? 'rij' : (/delete_wearable_token_secret/.test(c.url) ? 'secret' : null); }).filter(Boolean);
    eq(volgorde, ['rij', 'secret', 'secret'], 'C6 volgorde: eerst de koppelrij, dan de secrets');
    const r2 = await koppel(w);
    eq(locStatus(r2.loc), 'connected', 'C7 opnieuw koppelen na loskoppelen slaagt (was: HTTP 409)');
    eq(w.secrets.size, 2, 'C8 na herkoppelen precies twee secrets');

    // Mislukt het verwijderen van de rij, dan blijft alles staan.
    const w3 = wereld();
    await koppel(w3);
    w3.faal.connDelete = true; global.fetch = w3.fetch;
    const d3 = await disconnectMod.handler(AUTH);
    ok(d3.statusCode === 500 && w3.conn() !== null && w3.secrets.size === 2 && w3.revokes.length === 0, 'C9 mislukte ontkoppeling: koppeling en secrets ongewijzigd, niets ingetrokken bij Google');
    ok(d3.body.indexOf('XX000') === -1, 'C10 de foutrespons bevat geen databasefouttekst');

    // Loskoppelen zonder koppeling is geen fout.
    const w4 = wereld(); global.fetch = w4.fetch;
    eq((await disconnectMod.handler(AUTH)).statusCode, 200, 'C11 loskoppelen zonder koppeling geeft 200');
  }

  /* ══ D. Herkoppelen na een verlopen token (koppeling bestaat nog) ═══════════════════ */
  {
    const w = wereld();
    const r1 = await koppel(w);
    const c1 = Object.assign({}, w.conn());
    Object.assign(w.conn(), { last_sync_status: 'refresh_failed', last_sync_at: '2026-09-17T16:00:00Z', token_expires_at: '2026-09-15T21:54:00Z' });
    w.calls.length = 0;
    const r2 = await koppel(w);
    eq(locStatus(r2.loc), 'connected', 'D1 herkoppelen over een bestaande koppeling slaagt (was: 409 op de secretnaam en op UNIQUE(user_id, provider))');
    const c2 = w.conn();
    eq(w.conns.length, 1, 'D2 nog steeds precies één koppeling');
    ok(c2.access_token_secret_id !== c1.access_token_secret_id && w.waarde(c2.access_token_secret_id) === r2.at && w.waarde(c2.refresh_token_secret_id) === r2.rt, 'D3 de koppeling verwijst naar de nieuwe secrets');
    ok(!w.secrets.has(c1.access_token_secret_id) && !w.secrets.has(c1.refresh_token_secret_id), 'D4 de oude secrets zijn opgeruimd');
    ok(c2.last_sync_status === null, 'D5 de status refresh_failed is gewist');
    const iUpsert = w.calls.findIndex(function (c) { return c.method === 'POST' && /wearable_connections/.test(c.url); });
    const iEersteDelete = w.calls.findIndex(function (c) { return /delete_wearable_token_secret/.test(c.url); });
    const iLaatsteStore = w.calls.map(function (c) { return /store_wearable_token_secret/.test(c.url); }).lastIndexOf(true);
    ok(iLaatsteStore < iUpsert && iUpsert < iEersteDelete, 'D6 volgorde: nieuwe secrets opslaan -> koppeling omzetten -> pas dan oude secrets opruimen');
    ok(/[?&]on_conflict=user_id,provider/.test(w.calls[iUpsert].url), 'D7 de upsert noemt on_conflict=user_id,provider expliciet');
    ok(r1.at !== r2.at, 'D8 (controle) de twee autorisaties gaven verschillende tokens');

    // Geen nieuw refresh-token ontvangen: het bestaande blijft gekoppeld en wordt niet verwijderd.
    const w2 = wereld();
    const a = await koppel(w2);
    const oudRefreshId = w2.conn().refresh_token_secret_id;
    const b = await koppel(w2, { geenRefresh: true });
    ok(locStatus(b.loc) === 'connected' && w2.conn().refresh_token_secret_id === oudRefreshId && w2.waarde(oudRefreshId) === a.rt, 'D9 zonder nieuw refresh-token blijft het bestaande refresh-secret behouden');
    eq(w2.secrets.size, 2, 'D10 en er blijft geen wees-secret achter');
  }

  /* ══ E. Mislukte tokenopslag ═════════════════════════════════════════════════════════ */
  {
    // E1: access-secret opslaan mislukt -> bestaande koppeling ongewijzigd
    const w = wereld();
    const r1 = await koppel(w);
    const voor = JSON.stringify(w.conn()), idsVoor = w.secretIds().sort();
    w.storeTeller = 0; w.faal.store = function (n) { return n === 1; };
    const r2 = await koppel(w);
    eq(locStatus(r2.loc), 'save_error', 'E1 mislukte opslag van het access-token -> save_error');
    ok(JSON.stringify(w.conn()) === voor, 'E2 de bestaande koppeling is byte-voor-byte ongewijzigd');
    eq(w.secretIds().sort(), idsVoor, 'E3 de bestaande secrets staan er nog, er is geen nieuw secret achtergebleven');
    ok(w.waarde(w.conn().access_token_secret_id) === r1.at, 'E4 de werkende koppeling is niet verloren');

    // E5: refresh-secret opslaan mislukt -> het zojuist opgeslagen access-secret wordt teruggedraaid
    w.storeTeller = 0; w.faal.store = function (n) { return n === 2; };
    const r3 = await koppel(w);
    eq(locStatus(r3.loc), 'save_error', 'E5 mislukte opslag van het refresh-token -> save_error');
    eq(w.secretIds().sort(), idsVoor, 'E6 het halve resultaat is teruggedraaid (geen wees-access-secret)');
    ok(JSON.stringify(w.conn()) === voor, 'E7 de bestaande koppeling is ongewijzigd');
    ok(!w.namen().some(function (n) { return GEHEIMEN.indexOf(n) !== -1; }), 'E8 (controle) secretnamen bevatten geen tokenwaarde');

    // E9: eerste koppeling waarbij opslaan mislukt -> niets achtergelaten
    const w2 = wereld(); w2.faal.store = function () { return true; };
    const r4 = await koppel(w2);
    ok(locStatus(r4.loc) === 'save_error' && w2.conns.length === 0 && w2.secrets.size === 0, 'E9 eerste koppeling met mislukte opslag laat niets achter');

    // E10: de bestaande koppeling kan niet gelezen worden -> stoppen vóór er iets is aangemaakt
    const w3 = wereld(); await koppel(w3); const n3 = w3.secrets.size; w3.faal.connRead = true;
    const r5 = await koppel(w3);
    ok(locStatus(r5.loc) === 'save_error' && w3.secrets.size === n3, 'E10 onleesbare koppeling -> save_error zonder dat er een secret is aangemaakt');
  }

  /* ══ F. Onvolledige transacties en herstel ═══════════════════════════════════════════ */
  {
    // F1: secrets opgeslagen, koppeling omzetten mislukt -> compensatie
    const w = wereld();
    const r1 = await koppel(w);
    const voor = JSON.stringify(w.conn()), idsVoor = w.secretIds().sort();
    w.faal.connWrite = true;
    const r2 = await koppel(w);
    eq(locStatus(r2.loc), 'save_error', 'F1 mislukte upsert -> save_error');
    eq(w.secretIds().sort(), idsVoor, 'F2 beide nieuwe secrets zijn weer verwijderd (compensatie)');
    ok(JSON.stringify(w.conn()) === voor && w.waarde(w.conn().access_token_secret_id) === r1.at, 'F3 de bestaande koppeling werkt nog');
    w.faal.connWrite = false;
    eq(locStatus((await koppel(w)).loc), 'connected', 'F4 een volgende poging slaagt gewoon');

    // F5: koppeling omgezet, opruimen van de oude secrets mislukt -> toch gekoppeld, wees blijft, blokkeert niets
    const w2 = wereld();
    await koppel(w2);
    w2.faal.del = function () { return true; };
    const r3 = await koppel(w2);
    eq(locStatus(r3.loc), 'connected', 'F5 een mislukte opruiming maakt de nieuwe koppeling niet ongedaan');
    eq(w2.wezen().length, 2, 'F6 de oude secrets blijven als wees achter');
    w2.faal.del = null;
    eq(locStatus((await koppel(w2)).loc), 'connected', 'F7 wees-secrets blokkeren een volgende koppeling niet');

    // F8: compensatie zelf mislukt (upsert faalt EN delete faalt) -> nog steeds geen blokkade, wel wezen
    const w3 = wereld();
    w3.faal.connWrite = true; w3.faal.del = function () { return true; };
    eq(locStatus((await koppel(w3)).loc), 'save_error', 'F8 dubbele fout -> save_error');
    eq(w3.wezen().length, 2, 'F9 de niet-teruggedraaide secrets zijn wezen');
    w3.faal.connWrite = false; w3.faal.del = null;
    eq(locStatus((await koppel(w3)).loc), 'connected', 'F10 herstel: de volgende koppeling slaagt ondanks de wezen');

    // F11: met de opruim-RPC worden wezen pas na de beschermingstermijn verwijderd
    const w4 = wereld({ cleanupRpc: true });
    const jong = w4.legSecret('wearable_access_' + UID + '_' + crypto.randomUUID(), token('access'), 60 * 1000);
    const oud = w4.legSecret('wearable_access_' + UID + '_' + crypto.randomUUID(), token('access'), 16 * 60 * 1000);
    await koppel(w4);
    ok(w4.secrets.has(jong) && !w4.secrets.has(oud), 'F11 een wees jonger dan 15 minuten blijft staan (beschermt een lopende koppeling), een oudere verdwijnt');

    // F12: twee gelijktijdige callbacks voor dezelfde gebruiker -> één geldige koppeling, geen fout
    const w5 = wereld(); global.fetch = w5.fetch;
    const s1 = new URL(JSON.parse((await startMod.handler(AUTH)).body).authUrl).searchParams.get('state');
    w5.states.set('11111111-1111-4111-8111-111111111111', { user_id: UID, created_at: new Date().toISOString() });
    const tA = token('access'), tB = token('access'); let beurt = 0;
    w5.google.exchange = function () { beurt++; return J({ access_token: beurt === 1 ? tA : tB, refresh_token: token('refresh'), expires_in: 3600 }); };
    const beide = await Promise.all([
      callbackMod.handler({ queryStringParameters: { code: 'a', state: s1 } }),
      callbackMod.handler({ queryStringParameters: { code: 'b', state: '11111111-1111-4111-8111-111111111111' } })
    ]);
    ok(beide.every(function (r) { return locStatus(r.headers.Location) === 'connected'; }) && w5.conns.length === 1, 'F12 gelijktijdige koppelingen: beide slagen, er is precies één koppeling');
    ok(!!w5.waarde(w5.conn().access_token_secret_id) && !!w5.waarde(w5.conn().refresh_token_secret_id), 'F13 en die koppeling verwijst naar bestaande secrets');
  }

  /* ══ G. Token-refresh ════════════════════════════════════════════════════════════════ */
  {
    async function verlopenKoppeling() {
      const w = wereld();
      const r = await koppel(w);
      w.conn().token_expires_at = new Date(Date.now() - 3600 * 1000).toISOString();
      global.fetch = w.fetch;
      return { w: w, r: r };
    }
    // G1: Google wijst het refresh-token af (invalid_grant) -> opnieuw koppelen
    let x = await verlopenKoppeling();
    x.w.google.refresh = function () { return J({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, 400); };
    let res = JSON.parse((await syncMod.handler(AUTH)).body);
    ok(res.status === 'token_expired' && res.reason === 'refresh_failed', 'G1 invalid_grant -> token_expired / refresh_failed');
    eq(x.w.conn().last_sync_status, 'refresh_failed', 'G2 de koppeling krijgt status refresh_failed');
    ok(logRegels.some(function (l) { return /wearable\.token\.refresh_failed/.test(l) && /invalid_grant/.test(l) && /"http_status":400/.test(l); }), 'G3 de log noemt Googles foutcode en de HTTP-status (diagnose: testmodus/ingetrokken)');

    // G4: storing bij Google (503) -> tijdelijk, GEEN opnieuw koppelen
    x = await verlopenKoppeling();
    x.w.google.refresh = function () { return J({ error: 'backend_error' }, 503); };
    res = JSON.parse((await syncMod.handler(AUTH)).body);
    ok(res.status === 'provider_unavailable' && res.synced === false, 'G4 503 bij Google -> provider_unavailable, niet token_expired');
    eq(x.w.conn().last_sync_status, 'error:TOKEN_REFRESH_ERROR', 'G5 de status is een tijdelijke fout, niet refresh_failed');
    ok(JSON.parse((await statusMod.handler(AUTH)).body).needsReconnect === false, 'G6 na een tijdelijke storing vraagt de app niet om opnieuw te koppelen');

    // G7: netwerkfout -> tijdelijk
    x = await verlopenKoppeling();
    x.w.google.refresh = function () { throw new Error('fetch failed'); };
    let rr = await authLib.vernieuwGoogleHealthToken({ supabaseUrl: process.env.SUPABASE_URL, serviceKey: 'k', sbHeaders: {}, userId: UID, conn: x.w.conn(), refreshTokenValue: x.r.rt, clientId: 'c', clientSecret: 's' });
    ok(rr.ok === false && rr.permanent === false && rr.oauthError === 'netwerk', 'G7 netwerkfout -> tijdelijk');

    // G8: 429 met invalid_grant-achtige body blijft tijdelijk; 400 zonder bekende code ook
    x.w.google.refresh = function () { return J({ error: 'invalid_grant' }, 429); };
    rr = await authLib.vernieuwGoogleHealthToken({ supabaseUrl: process.env.SUPABASE_URL, serviceKey: 'k', sbHeaders: {}, userId: UID, conn: x.w.conn(), refreshTokenValue: x.r.rt, clientId: 'c', clientSecret: 's' });
    ok(rr.permanent === false, 'G8 429 is nooit permanent');
    x.w.google.refresh = function () { return J({ error: 'Iets met <script> en een heel lang verhaal' }, 400); };
    rr = await authLib.vernieuwGoogleHealthToken({ supabaseUrl: process.env.SUPABASE_URL, serviceKey: 'k', sbHeaders: {}, userId: UID, conn: x.w.conn(), refreshTokenValue: x.r.rt, clientId: 'c', clientSecret: 's' });
    ok(rr.permanent === false && rr.oauthError === 'onbekend', 'G9 een onbekende foutcode wordt niet doorgegeven en telt niet als permanent');

    // G10: geslaagde refresh -> zelfde secret-id bijgewerkt (rotation strategy), vervaltijd vooruit
    x = await verlopenKoppeling();
    const nieuwAT = token('access');
    const accessId = x.w.conn().access_token_secret_id, refreshId = x.w.conn().refresh_token_secret_id;
    x.w.google.refresh = function () { return J({ access_token: nieuwAT, expires_in: 3600 }); };
    rr = await authLib.vernieuwGoogleHealthToken({ supabaseUrl: process.env.SUPABASE_URL, serviceKey: 'k', sbHeaders: {}, userId: UID, conn: x.w.conn(), refreshTokenValue: x.r.rt, clientId: 'c', clientSecret: 's' });
    ok(rr.ok && rr.accessToken === nieuwAT && rr.stored === true && rr.rotated === false, 'G10 geslaagde refresh');
    ok(x.w.waarde(accessId) === nieuwAT && x.w.secrets.size === 2, 'G11 hetzelfde access-secret is bijgewerkt; geen nieuw secret per refresh');
    ok(x.w.waarde(refreshId) === x.r.rt, 'G12 zonder rotatie blijft het refresh-token ongewijzigd');
    ok(new Date(x.w.conn().token_expires_at).getTime() > Date.now() + 50 * 60 * 1000, 'G13 de vervaltijd is vooruitgezet');

    // G14: tokenrotatie -> het nieuwe refresh-token vervangt het oude in hetzelfde secret
    x = await verlopenKoppeling();
    const rotAT = token('access'), rotRT = token('refresh');
    const rId = x.w.conn().refresh_token_secret_id;
    x.w.google.refresh = function () { return J({ access_token: rotAT, refresh_token: rotRT, expires_in: 3600 }); };
    rr = await authLib.vernieuwGoogleHealthToken({ supabaseUrl: process.env.SUPABASE_URL, serviceKey: 'k', sbHeaders: {}, userId: UID, conn: x.w.conn(), refreshTokenValue: x.r.rt, clientId: 'c', clientSecret: 's' });
    ok(rr.ok && rr.rotated === true && x.w.waarde(rId) === rotRT, 'G14 een geroteerd refresh-token wordt opgeslagen (was: genegeerd)');

    // G15: access-secret bijwerken mislukt -> token nog bruikbaar voor deze aanroep, vervaltijd NIET vooruit
    x = await verlopenKoppeling();
    const expVoor = x.w.conn().token_expires_at, mAT = token('access');
    x.w.faal.update = function () { return true; };
    x.w.google.refresh = function () { return J({ access_token: mAT, expires_in: 3600 }); };
    rr = await authLib.vernieuwGoogleHealthToken({ supabaseUrl: process.env.SUPABASE_URL, serviceKey: 'k', sbHeaders: {}, userId: UID, conn: x.w.conn(), refreshTokenValue: x.r.rt, clientId: 'c', clientSecret: 's' });
    ok(rr.ok && rr.accessToken === mAT && rr.stored === false, 'G15 mislukte opslag na refresh: het token is voor deze aanroep bruikbaar');
    eq(x.w.conn().token_expires_at, expVoor, 'G16 de vervaltijd is niet vooruitgezet (anders gold een verlopen token een uur als geldig)');
  }

  /* ══ H. Verbindingsstatus ════════════════════════════════════════════════════════════ */
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  function fnBron(naam) {
    const s = html.indexOf('function ' + naam + '(');
    if (s < 0) return null;
    const start = html.lastIndexOf('async ', s) === s - 6 ? s - 6 : s;
    let d = 0;
    for (let k = html.indexOf('{', s); k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (d === 0) return html.slice(start, k + 1); } }
    return null;
  }
  {
    const w = wereld(); await koppel(w); global.fetch = w.fetch;
    let b = JSON.parse((await statusMod.handler(AUTH)).body);
    ok(b.connected === true && b.needsReconnect === false, 'H1 verse koppeling: connected, geen herkoppeling nodig');
    w.conn().last_sync_status = 'refresh_failed';
    b = JSON.parse((await statusMod.handler(AUTH)).body);
    ok(b.connected === true && b.needsReconnect === true, 'H2 refresh_failed -> needsReconnect');
    w.conn().last_sync_status = 'token_expired_no_refresh';
    ok(JSON.parse((await statusMod.handler(AUTH)).body).needsReconnect === true, 'H3 token_expired_no_refresh -> needsReconnect');
    w.faal.connRead = true;
    const r = await statusMod.handler(AUTH);
    ok(r.statusCode === 502 && JSON.parse(r.body).connected === undefined, 'H4 een storing bij het ophalen is een fout, geen "niet gekoppeld"');
    w.faal.connRead = false; w.conns = [];
    eq(JSON.parse((await statusMod.handler(AUTH)).body), { connected: false }, 'H5 zonder koppeling: connected=false');

    // Client: één vertaling van serverstatus naar het canonieke statusmodel (DeviceCore).
    const DeviceCore = require(path.join(ROOT, 'core/deviceIntegration.js'));
    const tkWearableConnInput = new Function(fnBron('tkWearableConnInput') + '\nreturn tkWearableConnInput;')();
    const staat = function (st) { const i = tkWearableConnInput(st); return i ? DeviceCore.deviceConnectionState(i, { now: new Date().toISOString() }).status : null; };
    const nu = new Date().toISOString();
    eq(staat({ connected: true, lastSyncAt: nu, lastSyncStatus: 'ok' }), 'connected', 'H6 client: ok -> connected');
    eq(staat({ connected: true, lastSyncAt: nu, lastSyncStatus: 'refresh_failed' }), 'token_expired', 'H7 client: refresh_failed -> token_expired (was: groen "Gekoppeld")');
    eq(staat({ connected: true, lastSyncAt: nu, lastSyncStatus: 'token_expired_no_refresh' }), 'token_expired', 'H8 client: token_expired_no_refresh -> token_expired');
    eq(staat({ connected: true, lastSyncAt: nu, lastSyncStatus: null, needsReconnect: true }), 'token_expired', 'H9 client: needsReconnect van de server telt');
    eq(staat({ connected: true, lastSyncAt: nu, lastSyncStatus: 'error:TOKEN_REFRESH_ERROR' }), 'sync_failed', 'H10 client: error:<code> -> sync_failed (was: "Gekoppeld")');
    eq(staat({ connected: false }), 'not_connected', 'H11 client: niet gekoppeld');
    eq(staat({ connected: false, statusUnavailable: true }), null, 'H12 client: status niet op te halen -> onbekend, geen aanname');
    ok(/if\(!r\.ok\)return \{connected:false,statusUnavailable:true\};/.test(fnBron('fetchWearableStatus')) && /catch\(e\)\{[^}]*statusUnavailable:true/.test(fnBron('fetchWearableStatus')), 'H13 client: een mislukte statusaanroep wordt als onbekend gemeld');
    ok((html.match(/tokenExpired:\s*st\.lastSyncStatus\s*===\s*'token_expired_no_refresh'/g) || []).length === 0, 'H14 client: de oude, onvolledige afleiding voor de Fitbit-koppeling is weg');
    eq((html.match(/tkWearableConnInput\(st\)/g) || []).length, 3, 'H15 client: beide schermen gebruiken dezelfde vertaling (definitie + 2 aanroepen)');
    ok(/const herkoppelen = !!\(sync && sync\.status==='token_expired'\);/.test(html) && /herkoppelen\?'Opnieuw koppelen':'Fitbit koppelen'/.test(html), 'H16 client: bij een verlopen koppeling heet de koppelknop "Opnieuw koppelen"');
    eq((html.match(/onclick="wearableConnect\(\)"/g) || []).length, 1, 'H17 client: er blijft precies één koppelknop');
    ok(/const koppelKleur = !gekoppeld \? 'var\(--g4\)' : \(\(sync\.status==='token_expired'\|\|sync\.status==='sync_failed'\) \? 'var\(--status-warn\)' : 'var\(--status-good\)'\);/.test(html), 'H18 client: groen alleen bij een werkende koppeling (verlopen/mislukt = waarschuwingskleur)');
    ok(/!sync \? 'De koppelstatus is nu niet op te halen\. Je gegevens zijn ongewijzigd\.'/.test(html) && /onclick="renderLichaamGegevens\(\)">Opnieuw proberen</.test(html), 'H19 client: bij een onbekende status geen koppeloproep maar "opnieuw proberen"');
  }

  /* ══ I. Android API-routing en CORS ══════════════════════════════════════════════════ */
  {
    const a = html.indexOf('var TkApi=(function(){'), e = html.indexOf('function tkApiUrl(path){ return TkApi.url(path); }');
    ok(a > 0 && e > a, 'I1 de centrale resolver staat in index.html');
    const mk = function (win) { return new Function('window', html.slice(a, e) + '\nfunction tkApiUrl(path){ return TkApi.url(path); }\nreturn { TkApi: TkApi, tkApiUrl: tkApiUrl };')(win); };
    const web = mk({}), android = mk({ Capacitor: { isNativePlatform: function () { return true; }, getPlatform: function () { return 'android'; } } });
    const pwa = mk({ Capacitor: { isNativePlatform: function () { return false; }, getPlatform: function () { return 'web'; } } });
    const oud = mk({ Capacitor: { getPlatform: function () { return 'android'; } } });
    const stuk = mk({ Capacitor: { isNativePlatform: function () { throw new Error('x'); } } });
    eq(web.tkApiUrl('/.netlify/functions/wearable-auth-start'), '/.netlify/functions/wearable-auth-start', 'I2 web: het pad blijft relatief (same-origin, ongewijzigd)');
    eq(pwa.tkApiUrl('/.netlify/functions/coach'), '/.netlify/functions/coach', 'I3 Capacitor-web/PWA: relatief');
    eq(android.tkApiUrl('/.netlify/functions/wearable-auth-start'), 'https://maurice-art.netlify.app/.netlify/functions/wearable-auth-start', 'I4 Android: absolute publieke oorsprong (was: https://localhost/... -> direct mislukt)');
    eq(oud.tkApiUrl('/.netlify/functions/wearable-status'), 'https://maurice-art.netlify.app/.netlify/functions/wearable-status', 'I5 Android zonder isNativePlatform: getPlatform() telt');
    eq(stuk.tkApiUrl('/.netlify/functions/wearable-status'), '/.netlify/functions/wearable-status', 'I6 een falende bridge valt terug op relatief');
    eq(android.TkApi.origin(), 'https://maurice-art.netlify.app', 'I7 de oorsprong is één vaste constante');
    ['https://evil.example/.netlify/functions/coach', '//evil.example/.netlify/functions/coach', '/.netlify/functions/../x', '/.netlify/functions/', '/andere/route', '/.netlify/functions/coach#x', '/.netlify/functions/Coach', null, 12].forEach(function (p) {
      let gooit = false; try { android.tkApiUrl(p); } catch (_) { gooit = true; }
      ok(gooit, 'I8 ongeldig pad wordt geweigerd (fail closed): ' + String(p));
    });
    eq(android.tkApiUrl('/.netlify/functions/calendar-feed?token=abc-123'), 'https://maurice-art.netlify.app/.netlify/functions/calendar-feed?token=abc-123', 'I9 een querystring is toegestaan');

    // Geen enkele serveraanroep in de app gaat nog buiten de resolver om.
    eq((html.match(/fetch\(\s*['"`]\/\.netlify\/functions\//g) || []).length, 0, 'I10 geen fetch met een kaal relatief functiepad');
    const kaal = html.split(/\r?\n/).filter(function (l) { return /['"`]\/\.netlify\/functions\//.test(l) && !/tkApiUrl\(/.test(l) && !/TkApi\.origin\(\)/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) && !/RE_FN=/.test(l) && !/<naam>/.test(l); });
    eq(kaal.map(function (l) { return l.trim().slice(0, 80); }), [], 'I11 elk functiepad in uitvoerbare code loopt via tkApiUrl/TkApi');
    ok((html.match(/fetch\(tkApiUrl\('\/\.netlify\/functions\/[a-z0-9-]+'\)/g) || []).length >= 42, 'I12 alle 42 bestaande aanroepen zijn omgezet');
    ok(/\(TkApi\.origin\(\)\|\|window\.location\.origin\)\+'\/\.netlify\/functions\/calendar-feed\?token='/.test(html), 'I13 de agenda-link gebruikt op Android de publieke oorsprong, niet https://localhost');

    // CORS: alleen de eigen native app, geen wildcard, geen credentials.
    let aangeroepen = 0;
    const h = cors.withCors(async function (ev) { aangeroepen++; return ev.httpMethod === 'POST' ? { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{}' } : { statusCode: 405, body: '' }; });
    let r = await h({ httpMethod: 'OPTIONS', headers: { origin: 'https://localhost', 'access-control-request-headers': 'authorization,content-type' } });
    ok(r.statusCode === 204 && r.headers['Access-Control-Allow-Origin'] === 'https://localhost' && aangeroepen === 0, 'I14 preflight vanaf de Android-app -> 204, de functie zelf wordt niet uitgevoerd');
    ok(/Authorization/.test(r.headers['Access-Control-Allow-Headers']) && /Content-Type/.test(r.headers['Access-Control-Allow-Headers']) && /POST/.test(r.headers['Access-Control-Allow-Methods']) && r.headers.Vary === 'Origin', 'I15 preflight staat Authorization + Content-Type en POST toe, met Vary: Origin');
    ok(!('Access-Control-Allow-Credentials' in r.headers) && r.headers['Access-Control-Allow-Origin'] !== '*', 'I16 geen credentials, geen wildcard');
    r = await h({ httpMethod: 'POST', headers: { Origin: 'https://localhost' } });
    ok(r.statusCode === 200 && r.headers['Access-Control-Allow-Origin'] === 'https://localhost' && r.headers['Content-Type'] === 'application/json', 'I17 antwoord aan de Android-app krijgt de CORS-header, bestaande headers blijven');
    r = await h({ httpMethod: 'OPTIONS', headers: { origin: 'https://evil.example' } });
    ok(r.statusCode === 405 && !(r.headers && r.headers['Access-Control-Allow-Origin']), 'I18 preflight van een vreemde oorsprong: geen CORS-header, gedrag als voorheen');
    const kaalAntwoord = { statusCode: 200, body: 'x' };
    const h2 = cors.withCors(async function () { return kaalAntwoord; });
    ok((await h2({ httpMethod: 'POST', headers: { origin: 'https://maurice-art.netlify.app' } })) === kaalAntwoord, 'I19 de webapp (zelfde oorsprong): het antwoord is exact hetzelfde object, niets toegevoegd');
    ok((await h2({ httpMethod: 'POST', headers: {} })) === kaalAntwoord && (await h2({ httpMethod: 'POST' })) === kaalAntwoord, 'I20 zonder Origin-header: ongewijzigd');
    ['http://localhost', 'https://localhost:8443', 'https://localhost.evil.example', 'null', 'https://LOCALHOST'].forEach(function (o) {
      ok(!cors.NATIVE_APP_ORIGINS.has(o), 'I21 geen toegestane oorsprong: ' + o);
    });

    // Elke functie die de app aanroept is bereikbaar vanaf Android; callbacks/webhooks juist niet.
    const namen = Array.from(new Set((html.match(/tkApiUrl\('\/\.netlify\/functions\/([a-z0-9-]+)'\)/g) || []).map(function (m) { return /functions\/([a-z0-9-]+)/.exec(m)[1]; })));
    const zonder = namen.filter(function (n) {
      const p = path.join(ROOT, 'netlify/functions', n + '.js');
      if (!fs.existsSync(p)) return false;
      const s = fs.readFileSync(p, 'utf8');
      return !/exports\.handler = require\('\.\/_cors\.js'\)\.withCors\(exports\.handler\);\s*$/.test(s);
    });
    eq(zonder, [], 'I22 elke door de app aangeroepen functie beantwoordt de preflight van de Android-app');
    const nietVoorBrowsers = fs.readdirSync(path.join(ROOT, 'netlify/functions')).filter(function (f) { return /(callback|webhook|^cleanup-|^calendar-feed)/.test(f); })
      .filter(function (f) { return /withCors/.test(fs.readFileSync(path.join(ROOT, 'netlify/functions', f), 'utf8')); });
    eq(nietVoorBrowsers, [], 'I23 callbacks, webhooks en geplande taken krijgen geen CORS');

    // Echte functie door de wrapper heen: preflight bereikt de sessiecontrole niet, een POST wel.
    const w = wereld(); global.fetch = w.fetch;
    r = await statusMod.handler({ httpMethod: 'OPTIONS', headers: { origin: 'https://localhost' } });
    ok(r.statusCode === 204 && w.calls.length === 0, 'I24 wearable-status: preflight zonder sessie en zonder databaseverzoek');
    r = await statusMod.handler({ httpMethod: 'POST', headers: { origin: 'https://localhost' } });
    ok(r.statusCode === 401 && r.headers['Access-Control-Allow-Origin'] === 'https://localhost', 'I25 wearable-status: zonder sessie nog steeds 401 (CORS is geen authenticatie), leesbaar voor de app');
  }

  /* ══ J. Web-OAuth en terugkeer ═══════════════════════════════════════════════════════ */
  {
    // Web: ongewijzigd
    let w = wereld();
    let r = await koppel(w);
    ok(/^[0-9a-f-]{36}$/.test(r.state), 'J1 web: state is de kale uuid');
    eq(r.loc, 'https://test.netlify.app/?wearable=connected', 'J2 web: terug naar de webapp met ?wearable=connected (ongewijzigd)');
    const u = new URL(r.authUrl);
    ok(u.origin + u.pathname === 'https://accounts.google.com/o/oauth2/v2/auth' && u.searchParams.get('access_type') === 'offline' && u.searchParams.get('prompt') === 'consent' && u.searchParams.get('redirect_uri') === process.env.GOOGLE_HEALTH_REDIRECT_URI, 'J3 web: autorisatie-URL ongewijzigd (offline + consent -> refresh-token)');

    // Android: hint -> terugkeerpagina
    w = wereld();
    r = await koppel(w, { android: true });
    ok(/^[0-9a-f-]{36}~android$/.test(r.state), 'J4 Android: state draagt de terugkeerhint');
    eq(r.loc, 'https://test.netlify.app/wearable-return.html?wearable=connected', 'J5 Android: na toestemming naar de terugkeerpagina');
    ok(w.conn() && w.conn().user_id === UID, 'J6 Android: de koppeling is vastgelegd voor de gebruiker van de state');
    ok(!w.states.size, 'J7 de state is eenmalig (verwijderd)');

    // Hint is geen autorisatie: alleen de exacte waarde telt, al het andere is web
    global.fetch = w.fetch;
    const startAnders = await startMod.handler(Object.assign({}, AUTH, { body: JSON.stringify({ client: 'https://evil.example' }) }));
    ok(/^[0-9a-f-]{36}$/.test(new URL(JSON.parse(startAnders.body).authUrl).searchParams.get('state')), 'J8 een andere client-waarde wordt genegeerd');
    const startStuk = await startMod.handler(Object.assign({}, AUTH, { body: '{geen json' }));
    eq(startStuk.statusCode, 200, 'J9 een onleesbare body breekt het starten niet');

    // Fouten komen ook op de juiste plek terug
    w = wereld(); w.faal.store = function () { return true; };
    r = await koppel(w, { android: true });
    eq(r.loc, 'https://test.netlify.app/wearable-return.html?wearable=save_error', 'J10 Android: ook een fout komt op de terugkeerpagina');
    global.fetch = w.fetch;
    let res = await callbackMod.handler({ queryStringParameters: { error: 'access_denied', state: '11111111-1111-4111-8111-111111111111~android' } });
    eq(res.headers.Location, 'https://test.netlify.app/wearable-return.html?wearable=denied', 'J11 Android: geweigerde toestemming -> terugkeerpagina');
    res = await callbackMod.handler({ queryStringParameters: { error: 'access_denied' } });
    eq(res.headers.Location, 'https://test.netlify.app/?wearable=denied', 'J12 web: geweigerde toestemming -> webapp');

    // State-validatie: niets dat geen uuid is bereikt de database
    for (const slecht of ['x&select=*', 'not.is.null', '11111111-1111-4111-8111-111111111111&user_id=not.is.null', '11111111-1111-4111-8111-111111111111~ios', '~android', '']) {
      w = wereld(); global.fetch = w.fetch;
      res = await callbackMod.handler({ queryStringParameters: { code: 'c', state: slecht } });
      ok(locStatus(res.headers.Location) === 'invalid_request' && w.calls.length === 0, 'J13 misvormde state geweigerd zonder databaseverzoek: ' + JSON.stringify(slecht));
    }
    eq(callbackMod.parseState('ABCDEF12-1111-4111-8111-111111111111~android'), { id: 'abcdef12-1111-4111-8111-111111111111', client: 'android' }, 'J14 parseState normaliseert en herkent de hint');

    // Verlopen en hergebruikte state
    w = wereld(); global.fetch = w.fetch;
    w.states.set('22222222-2222-4222-8222-222222222222', { user_id: UID, created_at: new Date(Date.now() - 11 * 60000).toISOString() });
    res = await callbackMod.handler({ queryStringParameters: { code: 'c', state: '22222222-2222-4222-8222-222222222222' } });
    ok(locStatus(res.headers.Location) === 'expired' && w.secrets.size === 0, 'J15 state ouder dan 10 minuten -> expired, niets opgeslagen');
    res = await callbackMod.handler({ queryStringParameters: { code: 'c', state: '22222222-2222-4222-8222-222222222222' } });
    eq(locStatus(res.headers.Location), 'expired', 'J16 hergebruik van een state -> expired');

    // Client: terugkeer in de Android-app
    const bron = [fnBron('wearableConnect'), 'var _tkWearablePending=null;', 'var TK_WEARABLE_RETURN_MS=15*60*1000;', fnBron('tkWearableCheckReturn')].join('\n');
    function app(o) {
      const s = { status: o.status, toasts: [], nav: null, gestart: [], synced: 0, renders: 0 };
      const ctx = {
        TkApi: { isNative: function () { return !!o.native; } }, tkApiUrl: function (p) { return (o.native ? 'https://maurice-art.netlify.app' : '') + p; },
        wearableAuthHeaders: function () { return { Authorization: 'Bearer sessie' }; },
        fetchWearableStatus: async function () { return s.status; },
        fetch: async function (url, init) { s.gestart.push({ url: url, init: init }); return { ok: true, json: async function () { return { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' }; } }; },
        toast: function (m) { s.toasts.push(m); }, renderWearableCard: function () { s.renders++; }, tkVerversGegevensScherm: function () {},
        wearableSyncNow: function () { s.synced++; }, window: { location: { set href(v) { s.nav = v; } } }, Date: Date, JSON: JSON, Object: Object
      };
      vm.createContext(ctx); new vm.Script(bron).runInContext(ctx);
      return { ctx: ctx, s: s };
    }
    let A = app({ native: true, status: { connected: true, connectedAt: '2026-09-10T15:09:42Z', lastSyncStatus: 'refresh_failed', needsReconnect: true } });
    await A.ctx.wearableConnect();
    eq(A.s.gestart[0].url, 'https://maurice-art.netlify.app/.netlify/functions/wearable-auth-start', 'J17 Android: koppelen start op de publieke oorsprong');
    eq(JSON.parse(A.s.gestart[0].init.body), { client: 'android' }, 'J18 Android: de client-hint gaat mee');
    ok(A.s.gestart[0].init.headers.Authorization === 'Bearer sessie', 'J19 de sessie gaat mee');
    ok(/^https:\/\/accounts\.google\.com\//.test(A.s.nav), 'J20 de toestemming opent bij Google (Capacitor opent een externe oorsprong in de systeembrowser)');
    ok(await A.ctx.tkWearableCheckReturn() === false && A.s.synced === 0, 'J21 terug in de app zonder nieuwe koppeling: geen succesmelding');
    A.s.status = { connected: false, statusUnavailable: true };
    ok(await A.ctx.tkWearableCheckReturn() === false, 'J22 status tijdelijk niet op te halen: de terugkeer blijft openstaan');
    A.s.status = { connected: true, connectedAt: '2026-10-11T09:30:00Z', lastSyncStatus: null, needsReconnect: false };
    ok(await A.ctx.tkWearableCheckReturn() === true && A.s.synced === 1 && A.s.toasts.indexOf('Wearable gekoppeld!') !== -1, 'J23 terug in de app na een geslaagde koppeling: melding + eerste sync');
    ok(await A.ctx.tkWearableCheckReturn() === false && A.s.synced === 1, 'J24 de terugkeer wordt precies één keer verwerkt');

    A = app({ native: false, status: { connected: false } });
    await A.ctx.wearableConnect();
    eq(A.s.gestart[0].url, '/.netlify/functions/wearable-auth-start', 'J25 web: relatief pad');
    eq(JSON.parse(A.s.gestart[0].init.body), {}, 'J26 web: geen hint');
    ok(await A.ctx.tkWearableCheckReturn() === false && A.s.renders === 0, 'J27 web: geen terugkeerbewaking (de bestaande ?wearable=-afhandeling blijft)');
    ok(/handleWearableRedirect\(\);/.test(html) && /const w=params\.get\('wearable'\);/.test(html), 'J28 web: handleWearableRedirect is ongewijzigd aanwezig');
    ok(/flushOfflineQueue\(\);\s*\/\/ v4\.70\.25[^\n]*\s*try\{ if\(typeof tkWearableCheckReturn==='function'\) tkWearableCheckReturn\(\); \}catch\(_\)\{\}\s*\}\);/.test(html), 'J29 de terugkeercontrole hangt aan de bestaande visibilitychange-handler, na de sessievalidatie');

    // Verlopen terugkeer
    A = app({ native: true, status: { connected: false } });
    await A.ctx.wearableConnect();
    const echt = Date.now; Date.now = function () { return echt() + 16 * 60 * 1000; };
    A.s.status = { connected: true, connectedAt: '2026-10-11T09:30:00Z' };
    const laat = await A.ctx.tkWearableCheckReturn(); Date.now = echt;
    ok(laat === false && A.s.synced === 0, 'J30 na 15 minuten vervalt de terugkeerbewaking');

    // Terugkeerpagina en deep link
    const ret = fs.readFileSync(path.join(ROOT, 'wearable-return.html'), 'utf8');
    ok(!/innerHTML|document\.write|eval\(/.test(ret), 'J31 terugkeerpagina: geen innerHTML/document.write');
    ok(/hasOwnProperty\.call\(TEKST,w\)/.test(ret) && /textContent=t\[0\]/.test(ret), 'J32 terugkeerpagina: de parameter is alleen een sleutel in een vaste lijst');
    ['connected', 'denied', 'expired', 'token_error', 'save_error', 'config_error', 'server_error', 'invalid_request'].forEach(function (k) { ok(new RegExp('\\b' + k + ':\\[').test(ret), 'J33 terugkeerpagina kent status ' + k); });
    ok(/noindex/.test(ret) && /no-referrer/.test(ret) && /href="trainingskompas:\/\/wearable"/.test(ret), 'J34 terugkeerpagina: noindex, geen referrer, link terug naar de app');
    const manifest = fs.readFileSync(path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    ok(/<data android:scheme="trainingskompas" android:host="wearable" \/>/.test(manifest) && /android\.intent\.category\.BROWSABLE/.test(manifest) && /android:launchMode="singleTask"/.test(manifest), 'J35 Android: de app heeft een deep link om terug naar de voorgrond te komen');
  }

  /* ══ K. Geen tokens in logs, URL's of responses ══════════════════════════════════════ */
  {
    const w = wereld();
    const at = token('access'), rt = token('refresh');
    w.google.exchange = function () { return J({ error: 'invalid_grant', error_description: 'bevat ' + at, access_token_hint: rt }, 400); };
    global.fetch = w.fetch;
    const s = new URL(JSON.parse((await startMod.handler(AUTH)).body).authUrl).searchParams.get('state');
    const res = await callbackMod.handler({ queryStringParameters: { code: 'c', state: s } });
    eq(locStatus(res.headers.Location), 'token_error', 'K1 mislukte code-uitwisseling -> token_error');
    ok(logRegels.some(function (l) { return /token exchange failed/.test(l) && /invalid_grant/.test(l); }), 'K2 de log noemt alleen status en foutcode');

    const alles = logRegels.join('\n');
    const lek = GEHEIMEN.filter(function (g) { return alles.indexOf(g) !== -1; });
    eq(lek.length, 0, 'K3 geen enkele tokenwaarde in de console-uitvoer van alle scenario\'s (' + GEHEIMEN.length + ' waarden, ' + logRegels.length + ' regels)');
    ok(alles.indexOf('csec-GEHEIM') === -1 && alles.indexOf('test-service-key') === -1, 'K4 geen client-secret of service-sleutel in de log');
    ok(!/Key \(name\)=/.test(alles), 'K5 de databasefouttekst (met secretnaam en user-id) wordt niet gelogd, alleen de code');
    // Een echt naamconflict (rechtstreeks op de RPC) wordt gelogd als status + code, zonder naam.
    const wk = wereld(); wk.legSecret('wearable_access_' + UID, 'x', 0); global.fetch = wk.fetch;
    const geen = await vault.storeWearableTokenSecret(process.env.SUPABASE_URL, 'k', token('access'), 'wearable_access_' + UID);
    ok(geen === null && logRegels.some(function (l) { return l === 'storeWearableTokenSecret mislukt 409 23505'; }), 'K6 een naamconflict wordt gelogd als "409 23505", zonder secretnaam of user-id');
  }
  {
    // URL's: geen token in een query-string, bij geen enkele aanroep in een volledige cyclus
    const w = wereld();
    const r = await koppel(w); global.fetch = w.fetch;
    w.conn().token_expires_at = new Date(Date.now() - 1000).toISOString();
    w.google.refresh = function () { return J({ error: 'invalid_grant' }, 400); };
    await syncMod.handler(AUTH); await statusMod.handler(AUTH); await disconnectMod.handler(AUTH);
    const inUrl = w.calls.filter(function (c) { return GEHEIMEN.some(function (g) { return c.url.indexOf(g) !== -1 || c.url.indexOf(encodeURIComponent(g)) !== -1; }); });
    eq(inUrl.length, 0, 'K7 geen tokenwaarde in een URL (start, callback, sync, status, loskoppelen)');
    const st = await statusMod.handler(AUTH);
    ok(GEHEIMEN.every(function (g) { return st.body.indexOf(g) === -1; }) && !/secret_id/.test(st.body), 'K8 de statusrespons bevat geen token en geen secret-id');
    ok(r.loc.indexOf(r.at) === -1 && r.authUrl.indexOf('csec-GEHEIM') === -1, 'K9 de redirect en de autorisatie-URL bevatten geen token of client-secret');
  }

  /* ══ L. Statische bewaking ═══════════════════════════════════════════════════════════ */
  {
    const dir = path.join(ROOT, 'netlify/functions');
    const direct = fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f) && f !== 'wearableTokenVault.js'; })
      .filter(function (f) { return /storeWearableTokenSecret\s*\(/.test(fs.readFileSync(path.join(dir, f), 'utf8')); });
    eq(direct, [], 'L1 geen enkele functie slaat nog rechtstreeks een secret op; alles loopt via vervangWearableTokens (unieke naam + compensatie)');
    ['wearable', 'polar', 'whoop', 'oura', 'garmin'].forEach(function (p) {
      const s = fs.readFileSync(path.join(dir, p + '-auth-callback.js'), 'utf8');
      ok(/vervangWearableTokens\(\{/.test(s) && !/_(access|refresh)_['`]?\s*(\+\s*userId|\$\{userId\})/.test(s), 'L2 ' + p + '-auth-callback: geen vaste secretnaam meer');
      ok(!/method:\s*'DELETE'[^\n]*\n?[^\n]*wearable_connections|wearable_connections\?user_id=eq\.\$\{userId\}&provider=eq\.[a-z_]+`,\s*\{\s*\n?\s*method:\s*'DELETE'/.test(s), 'L3 ' + p + '-auth-callback: de bestaande koppeling wordt niet meer vooraf verwijderd');
    });
    const namen = new Set(); for (let i = 0; i < 500; i++) namen.add(vault.uniekeSecretNaam('wearable_access', UID));
    eq(namen.size, 500, 'L4 uniekeSecretNaam geeft elke keer een andere naam');
    let gooit = false; try { vault.uniekeSecretNaam("x'; drop table", UID); } catch (_) { gooit = true; }
    ok(gooit, 'L5 een onverwachte prefix wordt geweigerd');
    const disc = fs.readFileSync(path.join(dir, 'wearable-disconnect.js'), 'utf8');
    ok(/verwijderWearableKoppeling\(/.test(disc) && !/revoke\?token=/.test(disc), 'L6 wearable-disconnect ruimt de secrets op en zet het token niet in de revoke-URL');
    const vsrc = fs.readFileSync(path.join(dir, 'wearableTokenVault.js'), 'utf8');
    ok(!/await res\.text\(\)/.test(vsrc) && !/console\.(error|warn|log)\([^)]*\be\)/.test(vsrc), 'L7 de Vault-module logt geen volledige fouttekst en geen foutobject');
    const cb = fs.readFileSync(path.join(dir, 'wearable-auth-callback.js'), 'utf8');
    ok(!/console\.error\([^)]*,\s*tokens\)/.test(cb), 'L8 de callback logt de tokenrespons van Google niet meer');

    const mig = fs.readFileSync(path.join(ROOT, 'migratie_v581.sql'), 'utf8');
    ['delete_wearable_token_secret', 'cleanup_orphan_wearable_token_secrets'].forEach(function (fn) {
      ok(new RegExp('revoke all on function public\\.' + fn + '\\(uuid\\) from public, anon, authenticated;').test(mig) && new RegExp('grant execute on function public\\.' + fn + '\\(uuid\\) to service_role;').test(mig), 'L9 ' + fn + ' is service-role-only');
    });
    ok(/security definer\s+set search_path = public, vault/.test(mig), 'L10 SECURITY DEFINER met vaste search_path');
    const code = mig.split('\n').filter(function (l) { return !/^\s*--/.test(l); }).join('\n');
    ok(!/decrypted_secret|vault\.decrypted_secrets/.test(code), 'L11 de migratie leest nooit een ontsleutelde waarde');
    ok(!/^\s*(delete|update|insert|truncate|drop)\b/im.test(code.replace(/\$\$[\s\S]*?\$\$/g, '')), 'L12 de migratie zelf wijzigt of verwijdert geen data (alleen functiedefinities en rechten)');
    ok(/NIET TOEGEPAST OP PRODUCTIE/.test(mig), 'L13 de migratie vermeldt dat zij niet is toegepast');
    const grants = require(path.join(ROOT, 'tools/check-function-grants.js'));
    eq(grants.checkMigration('migratie_v581.sql', mig), [], 'L14 de migratie voldoet aan de function-grants guard (R1-R5)');
    ok(/vernieuwGoogleHealthToken/.test(fs.readFileSync(path.join(dir, 'wearable-sync.js'), 'utf8')) && !/oauth2\.googleapis\.com\/token/.test(fs.readFileSync(path.join(dir, 'wearable-sync.js'), 'utf8')), 'L15 wearable-sync gebruikt de gedeelde refresh (geen tweede implementatie)');
  }
}

main().then(function () {
  uit('fWearableTokenLifecycle: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) uit(msgs.join('\n'));
  uit('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { uit('fWearableTokenLifecycle: onverwachte fout ' + (e && e.stack)); process.exit(1); });
