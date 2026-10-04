/* fHrvSingleWriter.test.js — hrv-log-atomicity-001/B: één canonieke writer voor hrv_log.
 *
 * AANLEIDING. upsert_daily_health (migratie_v500/v525/v560) is de canonieke, atomaire
 * schrijfroute voor dagelijkse health-rijen. importFromFile() in index.html schreef
 * daarnaast rechtstreeks naar /rest/v1/hrv_log (resolution=ignore-duplicates) en omzeilde
 * zo autorisatie op p_user_id, bronvalidatie, per-veld COALESCE-merge en per-veld provenance.
 *
 * WAT DEZE SUITE BEWIJST (op echte, uit de productiecode geëxtraheerde functies):
 *   A. upsertHrvLog (check-in) schrijft uitsluitend via de RPC.
 *   B. wearable-sync.js (echte handler, gestubde fetch) schrijft uitsluitend via de RPC.
 *   C. importFromFile / tkImportHrvRows / tkHrvImportCalls schrijven uitsluitend via de RPC,
 *      met behoud van per-veld bron, zonder null-overschrijving, deterministisch.
 *   D. Het mergecontract zelf: gedeeltelijke, herhaalde en door elkaar lopende writes.
 *   E. Guard: er bestaat geen directe hrv_log-writer meer, en de guard faalt aantoonbaar
 *      wanneer er opnieuw een wordt toegevoegd.
 *   G. Phase 2 (migratie_v579): de database trekt de directe mutatierechten in; gedrag bewezen in
 *      core/fHrvDbSingleWriterEnforcement.test.js.
 *
 * GRENS VAN HET BEWIJS. De atomiciteit van INSERT..ON CONFLICT..DO UPDATE is een eigenschap
 * van Postgres en is hier niet te reproduceren zonder database. Sectie D draait op een
 * JS-model van het contract; sectie F bindt dat model aan de SQL-tekst van de laatste
 * migratie die de functie definieert, zodat een contractwijziging deze suite laat falen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }

/* ── Productiecode uit index.html halen ─────────────────────────────────────── */
function extractFn(src, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('functie niet gevonden in index.html: ' + name);
  let i = src.indexOf('{', m.index), depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(m.index, i + 1); }
  }
  throw new Error('functie niet afgesloten: ' + name);
}
const SOURCES_DECL = (HTML.match(/const TK_HEALTH_SOURCES=\[[^\]]*\];/) || [null])[0];
ok(!!SOURCES_DECL, 'index.html definieert TK_HEALTH_SOURCES');
const PROD = [SOURCES_DECL, extractFn(HTML, 'upsertHrvLog'), extractFn(HTML, 'tkHrvImportCalls'),
  extractFn(HTML, 'tkImportHrvRows'), extractFn(HTML, 'importFromFile')].join('\n');

/* ── JS-model van het upsert_daily_health-contract (zie sectie F) ───────────── */
const BRONNEN = ['manual', 'wearable', 'unknown'];
function maakDb() {
  const rijen = new Map();
  return {
    rijen: rijen,
    rij: function (uid, date) { return rijen.get(uid + '|' + date) || null; },
    alles: function () { return Array.from(rijen.keys()).sort().map(function (k) { return rijen.get(k); }); },
    // caller: { uid, role } — zelfde autorisatieregel als de RPC.
    rpc: function (fn, a, caller) {
      if (fn !== 'upsert_daily_health') throw new Error('onverwachte RPC: ' + fn);
      if (caller.role !== 'service_role' && (!caller.uid || caller.uid !== a.p_user_id)) return null;
      const bron = a.p_source === undefined ? 'manual' : a.p_source;
      if (BRONNEN.indexOf(bron) < 0) return null;
      const nn = function (v) { return v === undefined ? null : v; };
      const key = a.p_user_id + '|' + a.p_date;
      const cur = rijen.get(key);
      const nieuw = cur ? Object.assign({}, cur) : { user_id: a.p_user_id, date: a.p_date,
        hrv: null, hrv_source: null, rhr: null, rhr_source: null, sleep: null, sleep_source: null,
        cyclus_fase: null, edema: null, note: null, steps: null, steps_source: null };
      ['hrv', 'rhr', 'sleep', 'steps'].forEach(function (k) {
        const v = nn(a['p_' + k]);
        if (v !== null) { nieuw[k] = v; nieuw[k + '_source'] = bron; }
      });
      ['cyclus_fase', 'edema', 'note'].forEach(function (k) {
        const v = nn(a['p_' + k]);
        if (v !== null) nieuw[k] = v;
      });
      rijen.set(key, nieuw);
      return Object.assign({}, nieuw);
    }
  };
}

/* ── Sandbox waarin de echte client-functies draaien ────────────────────────── */
const UID = '11111111-1111-1111-1111-111111111111';
const ANDER = '22222222-2222-2222-2222-222222222222';
function maakClient(opts) {
  opts = opts || {};
  const db = opts.db || maakDb();
  const rpcCalls = [], fetchCalls = [], status = { textContent: '' }, toasts = [];
  const sandbox = {
    console: { error: function () {}, log: function () {}, warn: function () {} },
    authSession: opts.uitgelogd ? null : { user: { id: UID } },
    td: function () { return opts.vandaag || '2026-10-03'; },
    SB_URL: 'https://x.supabase.co', SB_H: { apikey: 'k', Authorization: 'Bearer jwt' },
    sbRpc: async function (fn, args) {
      rpcCalls.push({ fn: fn, args: JSON.parse(JSON.stringify(args)) });
      if (opts.rpcFaalt && opts.rpcFaalt(args, rpcCalls.length)) return null;
      return db.rpc(fn, args, { uid: opts.uitgelogd ? null : UID, role: 'authenticated' });
    },
    fetch: async function (url, o) { fetchCalls.push({ url: String(url), method: (o && o.method) || 'GET' }); return { ok: true, text: async function () { return ''; } }; },
    document: { getElementById: function () { return status; } },
    toast: function (t) { toasts.push(t); },
    refreshHome: function () {}
  };
  vm.createContext(sandbox);
  vm.runInContext(PROD, sandbox);
  return { sb: sandbox, db: db, rpcCalls: rpcCalls, fetchCalls: fetchCalls, status: status, toasts: toasts };
}
function bestand(data) { return { files: [{ text: async function () { return JSON.stringify(data); } }], value: 'x' }; }

async function main() {
  /* ══ A. Check-in: upsertHrvLog ═══════════════════════════════════════════ */
  {
    const c = maakClient();
    c.db.rpc('upsert_daily_health', { p_user_id: UID, p_date: '2026-10-03', p_hrv: 48, p_sleep: 7.5, p_source: 'wearable' }, { role: 'service_role' });
    const res = await c.sb.upsertHrvLog({ rhr: 52, hrv: '', sleep: null });
    ok(res === true, 'A1 upsertHrvLog slaagt');
    eq(c.rpcCalls.map(function (x) { return x.fn; }), ['upsert_daily_health'], 'A2 upsertHrvLog doet precies één RPC-aanroep op de canonieke writer');
    eq(c.fetchCalls, [], 'A3 upsertHrvLog doet geen enkele directe REST-aanroep');
    eq([c.rpcCalls[0].args.p_user_id, c.rpcCalls[0].args.p_date, c.rpcCalls[0].args.p_source, c.rpcCalls[0].args.p_hrv], [UID, '2026-10-03', 'manual', null], 'A4 RPC-argumenten: eigen gebruiker, vandaag, bron manual, leeg veld = null');
    const r = c.db.rij(UID, '2026-10-03');
    eq([r.hrv, r.hrv_source, r.sleep, r.sleep_source, r.rhr, r.rhr_source], [48, 'wearable', 7.5, 'wearable', 52, 'manual'],
      'A5 gedeeltelijke check-in (alleen RHR) wist de wearable-HRV/slaap niet en laat hun bron intact');
  }

  /* ══ B. Wearable-sync: de echte handler met gestubde fetch ═══════════════ */
  {
    const db = maakDb();
    db.rpc('upsert_daily_health', { p_user_id: UID, p_date: '2026-09-30', p_hrv: 61, p_cyclus_fase: 'luteaal', p_source: 'manual' }, { uid: UID, role: 'authenticated' });
    const verzoeken = [];
    const antwoord = function (body, okFlag) { return { ok: okFlag !== false, status: okFlag === false ? 500 : 200, json: async function () { return body; }, text: async function () { return JSON.stringify(body); } }; };
    const oudFetch = global.fetch, oudEnv = Object.assign({}, process.env);
    const oudLog = console.log, oudWarn = console.warn;
    console.log = function () {}; console.warn = function () {};
    process.env.SUPABASE_URL = 'https://sb.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
    global.fetch = async function (url, o) {
      url = String(url); const method = (o && o.method) || 'GET';
      verzoeken.push({ url: url, method: method, body: o && o.body });
      if (url.indexOf('/auth/v1/user') >= 0) return antwoord({ id: UID });
      if (url.indexOf('/rest/v1/wearable_connections') >= 0 && method === 'GET') return antwoord([{ access_token_secret_id: 's1', refresh_token_secret_id: null, token_expires_at: new Date(Date.now() + 3600e3).toISOString() }]);
      if (url.indexOf('/rest/v1/rpc/get_wearable_token_secret') >= 0) return antwoord('tok');
      if (url.indexOf('/rest/v1/rpc/upsert_daily_health') >= 0) { const row = db.rpc('upsert_daily_health', JSON.parse(o.body), { role: 'service_role' }); return row ? antwoord(row) : antwoord({ message: 'x' }, false); }
      if (url.indexOf('/rest/v1/hrv_log') >= 0 && method === 'GET') return antwoord([{ id: 'bestaat' }]);
      if (url.indexOf('daily-resting-heart-rate') >= 0) return antwoord({ dataPoints: [{ dailyRestingHeartRate: { date: { year: 2026, month: 9, day: 30 }, beatsPerMinute: '54' } }] });
      if (url.indexOf('daily-heart-rate-variability') >= 0) return antwoord({ dataPoints: [] });
      if (url.indexOf('dataTypes/sleep') >= 0) return antwoord({ dataPoints: [] });
      if (url.indexOf('dailyRollUp') >= 0) return antwoord({ rollupDataPoints: [] });
      return antwoord({});
    };
    let uit = null;
    try {
      delete require.cache[require.resolve('../netlify/functions/wearable-sync.js')];
      uit = await require('../netlify/functions/wearable-sync.js').handler({ httpMethod: 'POST', headers: { authorization: 'Bearer user-jwt' } });
    } finally {
      global.fetch = oudFetch; console.log = oudLog; console.warn = oudWarn;
      Object.keys(process.env).forEach(function (k) { if (!(k in oudEnv)) delete process.env[k]; });
      Object.assign(process.env, oudEnv);
    }
    ok(uit && uit.statusCode === 200, 'B1 wearable-sync handler rondt af (status 200)');
    const rpc = verzoeken.filter(function (v) { return v.url.indexOf('/rest/v1/rpc/upsert_daily_health') >= 0; });
    ok(rpc.length === 1, 'B2 wearable-sync schrijft de dag via precies één upsert_daily_health-aanroep');
    ok(rpc.length === 1 && JSON.parse(rpc[0].body).p_source === 'wearable' && JSON.parse(rpc[0].body).p_user_id === UID, 'B3 RPC draagt bron wearable en de geverifieerde gebruiker');
    eq(verzoeken.filter(function (v) { return /\/rest\/v1\/hrv_log/.test(v.url) && v.method !== 'GET'; }), [], 'B4 wearable-sync doet geen enkele schrijvende aanroep op /rest/v1/hrv_log');
    const r = db.rij(UID, '2026-09-30');
    eq([r.hrv, r.hrv_source, r.rhr, r.rhr_source, r.cyclus_fase], [61, 'manual', 54, 'wearable', 'luteaal'],
      'B5 gedeeltelijke wearable-data (alleen RHR) wist handmatige HRV/cyclus niet; bron per veld klopt');
  }

  /* ══ C. Bestand-import ═══════════════════════════════════════════════════ */
  {
    // C1-C4: parser (bron-specifiek, geen persistentie)
    const c = maakClient();
    const P = c.sb.tkHrvImportCalls;
    const vol = P({ id: 'file-id', user_id: ANDER, created_at: '2026-08-20T07:00:00+00:00', date: '2026-08-20', hrv: 45.5, hrv_source: 'wearable', rhr: 58, rhr_source: 'manual', sleep: '7.25', sleep_source: 'wearable', steps: 9000, steps_source: 'wearable', cyclus_fase: 'folliculair', edema: null, note: 'goed [src:fitbit]', hrv_metric_type: 'rmssd' }, UID);
    eq(vol.calls.map(function (x) { return x.p_source; }), ['manual', 'wearable'], 'C1 gemengde bronnen: één RPC-aanroep per bron, in vaste volgorde');
    eq(vol.calls[0], { p_user_id: UID, p_date: '2026-08-20', p_hrv: null, p_rhr: 58, p_sleep: null, p_cyclus_fase: 'folliculair', p_edema: null, p_note: 'goed [src:fitbit]', p_source: 'manual', p_steps: null }, 'C2 manual-aanroep: alleen RHR + de niet-meetvelden (één keer)');
    eq(vol.calls[1], { p_user_id: UID, p_date: '2026-08-20', p_hrv: 45.5, p_rhr: null, p_sleep: 7.25, p_cyclus_fase: null, p_edema: null, p_note: null, p_source: 'wearable', p_steps: 9000 }, 'C3 wearable-aanroep: HRV/slaap/stappen, numerieke string geparsed, niet-meetvelden niet herhaald');
    ok(vol.calls.every(function (x) { return x.p_user_id === UID && Object.keys(x).sort().join() === 'p_cyclus_fase,p_date,p_edema,p_hrv,p_note,p_rhr,p_sleep,p_source,p_steps,p_user_id'; }),
      'C4 id/user_id/created_at/hrv_metric_type uit het bestand gaan nooit mee; altijd de ingelogde gebruiker');
    eq(P({ date: '2026-08-21', hrv: 40, hrv_source: null, rhr: 60, rhr_source: 'garmin' }, UID).calls.map(function (x) { return [x.p_source, x.p_hrv, x.p_rhr]; }), [['unknown', 40, 60]], 'C5 ontbrekende of ongeldige bron wordt unknown (geen herkomst geraden)');
    eq(P({ date: '2026-08-21T00:00:00', note: 'alleen notitie' }, UID).calls, [{ p_user_id: UID, p_date: '2026-08-21', p_hrv: null, p_rhr: null, p_sleep: null, p_cyclus_fase: null, p_edema: null, p_note: 'alleen notitie', p_source: 'manual', p_steps: null }], 'C6 rij met alleen een notitie: één aanroep, datum genormaliseerd');
    eq(P({ date: '2026-08-22', hrv: null, rhr: '', sleep: undefined }, UID), { skip: true }, 'C7 rij zonder enige waarde wordt overgeslagen (geen lege dagrij)');
    ok(!!P({ date: '22-08-2026', hrv: 40 }, UID).error && !!P({ hrv: 40 }, UID).error && !!P(null, UID).error && !!P([1], UID).error, 'C8 ongeldige/ontbrekende datum of geen record -> fout, geen aanroep');
    ok(!!P({ date: '2026-08-22', hrv: 'veel' }, UID).error && !!P({ date: '2026-08-22', rhr: 52.4 }, UID).error && !!P({ date: '2026-08-22', steps: -1 }, UID).error && !!P({ date: '2026-08-22', sleep: {} }, UID).error, 'C9 niet-numerieke waarde, niet-gehele RHR of negatieve stappen -> hele rij afgewezen (geen deel-write)');
    ok(!!P({ date: '2026-08-22', hrv: 40 }, null).error, 'C10 zonder ingelogde gebruiker -> fout');
    eq(c.rpcCalls, [], 'C11 de parser zelf schrijft niets');
  }
  {
    // C12-C16: import op een bestaande dag — mergecontract, geen null-overschrijving
    const c = maakClient();
    c.db.rpc('upsert_daily_health', { p_user_id: UID, p_date: '2026-08-20', p_hrv: 50, p_rhr: 55, p_sleep: 8, p_steps: 12000, p_note: 'bestaand', p_source: 'wearable' }, { role: 'service_role' });
    const res = await c.sb.tkImportHrvRows([{ date: '2026-08-20', hrv: null, rhr: 57, rhr_source: 'manual', sleep: '', steps: undefined, note: null }]);
    eq(res, { ok: 1, fail: 0, skipped: 0 }, 'C12 gedeeltelijke import op bestaande dag slaagt');
    const r = c.db.rij(UID, '2026-08-20');
    eq([r.hrv, r.hrv_source, r.sleep, r.sleep_source, r.steps, r.steps_source, r.note], [50, 'wearable', 8, 'wearable', 12000, 'wearable', 'bestaand'], 'C13 lege/ontbrekende importvelden overschrijven bestaande HRV/slaap/stappen/notitie NIET');
    eq([r.rhr, r.rhr_source], [57, 'manual'], 'C14 het wel aangeleverde veld wordt volgens het mergecontract bijgewerkt, met eigen bron');
    eq(c.db.alles().length, 1, 'C15 geen tweede rij voor dezelfde dag');
    eq(c.fetchCalls, [], 'C16 tkImportHrvRows doet geen enkele directe REST-aanroep');
  }
  {
    // C17-C19: determinisme en herhaalbaarheid
    const rijen = [
      { date: '2026-06-01', created_at: '2026-06-01T06:00:00+00:00', hrv: 30, rhr: 60, note: 'ochtend' },
      { date: '2026-06-01', created_at: '2026-06-01T20:00:00+00:00', hrv: 34, sleep: 7, sleep_source: 'manual' },
      { date: '2026-06-02', hrv: 41, hrv_source: 'wearable', rhr: 59, rhr_source: 'manual' }
    ];
    const a = maakClient(), b = maakClient();
    await a.sb.tkImportHrvRows(rijen);
    await b.sb.tkImportHrvRows(rijen.slice().reverse());
    eq(a.db.alles(), b.db.alles(), 'C17 dubbele dagrijen in het bestand: eindtoestand is onafhankelijk van de volgorde in het bestand');
    eq([a.db.rij(UID, '2026-06-01').hrv, a.db.rij(UID, '2026-06-01').rhr, a.db.rij(UID, '2026-06-01').sleep, a.db.rij(UID, '2026-06-01').note], [34, 60, 7, 'ochtend'], 'C18 nieuwste echte waarde wint per veld; oudere velden zonder nieuwere waarde blijven staan');
    const voor = JSON.stringify(a.db.alles());
    const her = await a.sb.tkImportHrvRows(rijen);
    ok(JSON.stringify(a.db.alles()) === voor && her.ok === 3, 'C19 dezelfde import nogmaals uitvoeren verandert niets (idempotent)');
  }
  {
    // C20-C22: fouten zijn zichtbaar, geen stille verliezen
    const c = maakClient({ rpcFaalt: function (args) { return args.p_date === '2026-07-02'; } });
    const res = await c.sb.tkImportHrvRows([{ date: '2026-07-01', hrv: 40 }, { date: '2026-07-02', hrv: 41 }, { date: 'kapot', hrv: 42 }, { date: '2026-07-04' }]);
    eq(res, { ok: 1, fail: 2, skipped: 1 }, 'C20 RPC-fout en ongeldige rij tellen als mislukt, lege rij als overgeslagen — niets verdwijnt stil');
    const u = maakClient({ uitgelogd: true });
    eq(await u.sb.tkImportHrvRows([{ date: '2026-07-01', hrv: 40 }]), { ok: 0, fail: 1, skipped: 0 }, 'C21 zonder sessie: mislukt, geen write');
    eq(u.rpcCalls, [], 'C22 zonder sessie wordt de RPC niet eens aangeroepen');
  }
  {
    // C23-C27: importFromFile end-to-end
    const c = maakClient();
    await c.sb.importFromFile(bestand({
      sessions: [{ id: 's1' }], weight_log: [{ date: '2026-08-20', weight: 80 }], body_comp: [],
      hrv_log: [{ id: 'h1', user_id: ANDER, date: '2026-08-20', hrv: 45, hrv_source: 'wearable', rhr: 58, rhr_source: 'manual' }, { date: '2026-08-21' }, { date: 'x', hrv: 1 }]
    }));
    eq(c.fetchCalls.map(function (f) { return f.url.split('/rest/v1/')[1]; }), ['sessions', 'weight_log'], 'C23 importFromFile raakt /rest/v1/hrv_log niet meer aan (overige tabellen ongewijzigd)');
    ok(c.rpcCalls.length === 2 && c.rpcCalls.every(function (x) { return x.fn === 'upsert_daily_health' && x.args.p_user_id === UID; }), 'C24 HRV-rijen uit het bestand gaan via upsert_daily_health naar de ingelogde gebruiker');
    const r = c.db.rij(UID, '2026-08-20');
    eq([r.hrv, r.hrv_source, r.rhr, r.rhr_source], [45, 'wearable', 58, 'manual'], 'C25 per-veld bron uit het bestand blijft behouden');
    ok(c.db.rij(ANDER, '2026-08-20') === null, 'C26 er wordt nooit voor de user_id uit het bestand geschreven');
    ok(/3 records geïmporteerd · 1 mislukt · 1 leeg overgeslagen/.test(c.status.textContent), 'C27 statusregel meldt geïmporteerd, mislukt en leeg overgeslagen (' + c.status.textContent + ')');
  }

  /* ══ D. Mergecontract: door elkaar lopende writers ═══════════════════════ */
  {
    const dag = '2026-09-01';
    const checkin = { p_user_id: UID, p_date: dag, p_rhr: 52, p_cyclus_fase: 'ovulatie', p_source: 'manual' };
    const wearable = { p_user_id: UID, p_date: dag, p_hrv: 47, p_sleep: 7.1, p_source: 'wearable', p_steps: 8000 };
    const c = maakClient();
    const imp = c.sb.tkHrvImportCalls({ date: dag, note: 'uit backup' }, UID).calls[0];
    const writers = [checkin, wearable, imp];
    const perm = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const uitkomsten = perm.map(function (volg) {
      const db = maakDb();
      volg.forEach(function (i) { db.rpc('upsert_daily_health', writers[i], { role: 'service_role' }); });
      return JSON.stringify(db.rij(UID, dag));
    });
    ok(uitkomsten.every(function (u) { return u === uitkomsten[0]; }), 'D1 check-in, wearable en import op verschillende velden van dezelfde dag: elke volgorde geeft dezelfde rij (geen lost update)');
    const r = JSON.parse(uitkomsten[0]);
    eq([r.rhr, r.rhr_source, r.hrv, r.hrv_source, r.steps, r.cyclus_fase, r.note], [52, 'manual', 47, 'wearable', 8000, 'ovulatie', 'uit backup'], 'D2 alle drie de bijdragen staan in één rij, elk met eigen bron');
    const db = maakDb();
    db.rpc('upsert_daily_health', { p_user_id: UID, p_date: dag, p_hrv: 40, p_source: 'wearable' }, { role: 'service_role' });
    db.rpc('upsert_daily_health', { p_user_id: UID, p_date: dag, p_hrv: 44, p_source: 'manual' }, { uid: UID, role: 'authenticated' });
    eq([db.rij(UID, dag).hrv, db.rij(UID, dag).hrv_source], [44, 'manual'], 'D3 zelfde veld, twee writers: de laatste atomaire write wint en de bron volgt de waarde');
    ok(db.rpc('upsert_daily_health', { p_user_id: ANDER, p_date: dag, p_hrv: 1, p_source: 'manual' }, { uid: UID, role: 'authenticated' }) === null && db.rij(ANDER, dag) === null, 'D4 contract weigert een write voor een andere gebruiker');
    ok(db.rpc('upsert_daily_health', { p_user_id: UID, p_date: dag, p_hrv: 1, p_source: 'import' }, { uid: UID, role: 'authenticated' }) === null, 'D5 contract weigert een onbekende bronwaarde');
  }

  /* ══ E. Guard: geen directe hrv_log-writer ═══════════════════════════════ */
  // Elke code-vermelding van hrv_log moet in een bekende LEES-context staan. Een nieuwe
  // vermelding (bv. sbPost('hrv_log',…), een fetch naar /rest/v1/hrv_log of een tabellijst
  // voor een schrijflus) valt buiten de allowlist en laat de gate falen.
  const LEES_VOOR = [
    /(?:sbGet|v43SafeGet|inzichtGetOrNull|exportCSV)\(\s*['"]$/,        // lezen / CSV-export
    /\bdata\.$/,                                                          // sleutel in het importbestand
    /\bsrc:\s*'$/,                                                        // metric-configuratie (leesbron)
    /hdVoelt\?'$/,                                                        // label van een inputbron
    /const tables = \['sessions','weight_log','$/                         // exportJSON (sbGet-lus)
  ];
  function codeVermeldingen(tekst) {
    const uit = [];
    tekst.split('\n').forEach(function (regel, nr) {
      const re = /hrv_log(?![a-z_])/g; let m;
      while ((m = re.exec(regel))) {
        const voor = regel.slice(0, m.index);
        const t = voor.trim();
        if (t.indexOf('//') === 0 || t.indexOf('*') === 0 || t.indexOf('/*') === 0) continue;   // commentaarregel
        if (/(^|[^:])\/\/(?!.*['"`]\s*$)/.test(voor) && !/['"`(]$/.test(voor)) continue;        // commentaar achter code
        uit.push({ nr: nr + 1, voor: voor, na: regel.slice(m.index + 7) });
      }
    });
    return uit;
  }
  function overtredingenHtml(tekst) {
    return codeVermeldingen(tekst).filter(function (v) {
      return !LEES_VOOR.some(function (re) { return re.test(v.voor); });
    }).map(function (v) { return 'regel ' + v.nr + ': …' + v.voor.slice(-50) + 'hrv_log' + v.na.slice(0, 30); });
  }
  eq(overtredingenHtml(HTML), [], 'E1 index.html: elke code-vermelding van hrv_log staat in een bekende lees-context (geen directe writer)');
  ok((HTML.match(/sbRpc\('upsert_daily_health'/g) || []).length === 2, 'E2 index.html: precies twee aanroepen van de canonieke writer (upsertHrvLog + tkImportHrvRows)');
  ok(/const tables = \['sessions','weight_log','hrv_log','body_comp','exercises'\];[\s\S]{0,200}backup\[t\] = await sbGet\(t,/.test(HTML), 'E3 de tabellijst met hrv_log hoort bij exportJSON en wordt alleen gelezen (sbGet)');
  // De guard moet zelf aantoonbaar falen op een opnieuw toegevoegde directe writer.
  [
    "await fetch(`${SB_URL}/rest/v1/hrv_log`,{method:'POST',headers:SB_H,body:JSON.stringify(h)});",
    "await sbPost('hrv_log',{date:td(),hrv:50});",
    "await sbPatch('hrv_log','id=eq.'+id,{hrv:50});",
    "await sbUpsert('hrv_log',rij);",
    "await sbPostQ('hrv_log',rij);",
    "await sbDel('hrv_log','id=eq.'+id);",
    "for(const t of ['weight_log','hrv_log']){ await sbPost(t,rij); }"
  ].forEach(function (regel, i) {
    ok(overtredingenHtml(HTML + '\n' + regel + '\n').length === 1, 'E4.' + (i + 1) + ' guard faalt op een opnieuw toegevoegde directe writer: ' + regel.slice(0, 48));
  });
  ok(overtredingenHtml(HTML + "\nconst hd=await sbGet('hrv_log','&limit=1'); // leest hrv_log\n").length === 0, 'E5 guard laat een nieuwe LEES-aanroep door');

  // Server-side en core: alleen bekende, niet-schrijvende vermeldingen.
  const FN_DIR = path.join(ROOT, 'netlify', 'functions');
  const ACCOUNT_DELETE = ['delete-account.js', 'cleanup-unverified-accounts.js']; // accountverwijdering: ander domein
  const serverFout = [];
  fs.readdirSync(FN_DIR).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
    const src = fs.readFileSync(path.join(FN_DIR, f), 'utf8');
    codeVermeldingen(src).forEach(function (v) {
      if (ACCOUNT_DELETE.indexOf(f) >= 0) return;
      if (f === 'wearable-sync.js') {
        const leesCheck = /fetch\(`\$\{supabaseUrl\}\/rest\/v1\/$/.test(v.voor) && /^\?user_id=eq\.\$\{userId\}&date=eq\.\$\{date\}&select=id&limit=1`, \{ headers: sbHeaders \}\);/.test(v.na);
        const label = /sbRows\(existsRes, '$/.test(v.voor);
        if (leesCheck || label) return;
      }
      serverFout.push(f + ':' + v.nr);
    });
    if (/rest\/v1\/hrv_log[^`'"]*[`'"]\s*,\s*\{[^}]*method:\s*['"](POST|PATCH|PUT|DELETE)/.test(src)) serverFout.push(f + ': schrijvende fetch op hrv_log');
  });
  eq(serverFout, [], 'E6 netlify/functions: geen vermelding van hrv_log buiten de RPC-route, de diagnostische lees-check en accountverwijdering');
  const coreFout = [];
  fs.readdirSync(path.join(ROOT, 'core')).filter(function (f) { return /\.js$/.test(f) && !/\.test\.js$/.test(f); }).forEach(function (f) {
    if (codeVermeldingen(fs.readFileSync(path.join(ROOT, 'core', f), 'utf8')).length) coreFout.push(f);
  });
  eq(coreFout, [], 'E7 core/*.js (niet-test): geen code die hrv_log aanspreekt');
  const ws = fs.readFileSync(path.join(FN_DIR, 'wearable-sync.js'), 'utf8');
  ok(ws.indexOf('/rest/v1/rpc/upsert_daily_health') > 0, 'E8 wearable-sync.js gebruikt de canonieke writer');

  /* ══ F. Het SQL-contract waar sectie D op leunt ══════════════════════════ */
  const migs = fs.readdirSync(ROOT).filter(function (f) { return /^migratie_v\d+\.sql$/.test(f); })
    .sort(function (a, b) { return Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]); });
  const defs = migs.filter(function (f) { return /CREATE OR REPLACE FUNCTION public\.upsert_daily_health\(/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8')); });
  const laatste = defs[defs.length - 1];
  const sql = fs.readFileSync(path.join(ROOT, laatste), 'utf8');
  ok(laatste === 'migratie_v560.sql', 'F1 laatste definitie van upsert_daily_health staat in migratie_v560.sql (kreeg ' + laatste + ') — wijzigt het contract, herzie dan het model in sectie D');
  ok(sql.indexOf('ON CONFLICT (user_id, date) DO UPDATE') > 0, 'F2 atomaire INSERT..ON CONFLICT (user_id, date) DO UPDATE');
  ['hrv', 'rhr', 'sleep', 'steps'].forEach(function (k) {
    ok(new RegExp(k + '\\s*=\\s*COALESCE\\(EXCLUDED\\.' + k + ', public\\.hrv_log\\.' + k + '\\)').test(sql)
      && new RegExp(k + '_source\\s*=\\s*CASE WHEN EXCLUDED\\.' + k + '\\s+IS NOT NULL THEN EXCLUDED\\.' + k + '_source\\s+ELSE public\\.hrv_log\\.' + k + '_source\\s+END').test(sql),
      'F3 ' + k + ': COALESCE-merge en bron volgt de waarde');
  });
  ['cyclus_fase', 'edema', 'note'].forEach(function (k) {
    ok(new RegExp(k + '\\s*=\\s*COALESCE\\(EXCLUDED\\.' + k + ', public\\.hrv_log\\.' + k + '\\)').test(sql), 'F4 ' + k + ': COALESCE-merge (null overschrijft niet)');
  });
  ok(/IF auth\.role\(\) IS DISTINCT FROM 'service_role' THEN\s+IF v_caller IS NULL OR v_caller <> p_user_id THEN\s+RAISE EXCEPTION/.test(sql), 'F5 autorisatie: alleen eigen gebruiker, tenzij service_role');
  ok(sql.indexOf("IF p_source NOT IN ('manual','wearable','unknown') THEN") > 0, 'F6 bronvalidatie');
  // Geen andere SQL-functie of migratie die hrv_log beschrijft buiten deze functie en de eenmalige v500-opschoning.
  const sqlFout = [];
  migs.forEach(function (f) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const schrijft = /(insert\s+into|update|delete\s+from)\s+(public\.)?hrv_log\b/i.test(s.replace(/--.*$/gm, ''));
    if (schrijft && defs.indexOf(f) < 0) sqlFout.push(f);
  });
  eq(sqlFout, [], 'F7 geen migratie buiten de upsert_daily_health-definities (v500 incl. eenmalige opschoning, v525, v560) schrijft naar hrv_log');

  /* ══ G. Phase 2: de database dwingt dezelfde invariant af (migratie_v579) ═ */
  // Het privilegegedrag zelf wordt op echte PostgreSQL bewezen in core/fHrvDbSingleWriterEnforcement.test.js.
  const v579 = fs.existsSync(path.join(ROOT, 'migratie_v579.sql')) ? fs.readFileSync(path.join(ROOT, 'migratie_v579.sql'), 'utf8').replace(/--.*$/gm, '') : '';
  ok(/revoke insert, update, delete, truncate on table public\.hrv_log from anon, authenticated, public;/.test(v579), 'G1 migratie_v579 trekt directe mutatierechten op hrv_log in van anon, authenticated en PUBLIC');
  ok(fs.existsSync(path.join(ROOT, 'core', 'fHrvDbSingleWriterEnforcement.test.js')) && fs.existsSync(path.join(ROOT, 'tools', 'verify-hrv-single-writer.sql')), 'G2 database-gedragssuite en live-verificatiescript aanwezig');
}

main().then(function () {
  console.log('fHrvSingleWriter: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { console.error('fHrvSingleWriter: onverwachte fout', e); process.exit(1); });
