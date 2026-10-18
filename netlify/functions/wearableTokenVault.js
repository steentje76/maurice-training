// wearableTokenVault.js — F13 Post-Audit Remediation (P1-09).
//
// Gedeelde helperfuncties voor het veilig opslaan/ophalen/vernieuwen van
// wearable-OAuth-tokens via Supabase Vault (Transparent Column
// Encryption). Vervangt het eerdere, kritieke lek waarbij access_token/
// refresh_token in plaintext in wearable_connections stonden.
//
// ARCHITECTUUR: drie kleine, service-role-only RPC's in de database
// (store_wearable_token_secret/get_wearable_token_secret/
// update_wearable_token_secret, migratie_v527.sql) wrappen de eigenlijke
// vault.create_secret()/vault.decrypted_secrets/vault.update_secret()-
// primitieven. Encrypt/decrypt gebeurt altijd server-side, in de
// database zelf -- deze module roept uitsluitend de RPC's aan met de
// service-role-sleutel, bevat zelf geen enkele cryptografische logica
// ("geen crypto theater": de sleutel wordt door Supabase beheerd,
// buiten de database, nooit door deze applicatiecode).
'use strict';

const crypto = require('crypto');

// Logt van een mislukte PostgREST-respons uitsluitend de foutcode (bv. 23505), nooit de
// volledige fouttekst: die kan secretnamen, user-id's of rij-inhoud bevatten.
async function foutCode(res) {
  try { const j = await res.json(); return (j && typeof j.code === 'string') ? j.code.slice(0, 20) : 'geen_code'; }
  catch (_) { return 'geen_json'; }
}

async function storeWearableTokenSecret(supabaseUrl, serviceKey, secretValue, naam) {
  if (!secretValue) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/store_wearable_token_secret`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: secretValue, p_naam: naam })
    });
    if (!res.ok) { console.error('storeWearableTokenSecret mislukt', res.status, await foutCode(res)); return null; }
    return await res.json();
  } catch (e) { console.error('storeWearableTokenSecret catch', e && e.message); return null; }
}

async function getWearableTokenSecret(supabaseUrl, serviceKey, secretId) {
  if (!secretId) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_wearable_token_secret`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret_id: secretId })
    });
    if (!res.ok) { console.error('getWearableTokenSecret mislukt', res.status, await foutCode(res)); return null; }
    return await res.json();
  } catch (e) { console.error('getWearableTokenSecret catch', e && e.message); return null; }
}

async function updateWearableTokenSecret(supabaseUrl, serviceKey, secretId, nieuweWaarde) {
  if (!secretId) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/update_wearable_token_secret`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret_id: secretId, p_nieuwe_waarde: nieuweWaarde })
    });
    if (!res.ok) { console.error('updateWearableTokenSecret mislukt', res.status, await foutCode(res)); return false; }
    return true;
  } catch (e) { console.error('updateWearableTokenSecret catch', e && e.message); return false; }
}

async function deleteWearableTokenSecret(supabaseUrl, serviceKey, secretId) {
  if (!secretId) return true;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_wearable_token_secret`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret_id: secretId })
    });
    if (!res.ok) { console.error('deleteWearableTokenSecret mislukt', res.status, await foutCode(res)); return false; }
    return true;
  } catch (e) { console.error('deleteWearableTokenSecret catch', e && e.message); return false; }
}

// ════════════════════════════════════════════════════════════════════════════
// TOKEN-LIFECYCLE (v4.70.25, DEC-VAULT-001)
//
// AANLEIDING (productie, 11 oktober 2026): tokens werden opgeslagen onder een VASTE naam
// ('wearable_access_<userId>'). vault.secrets heeft een unieke index op name. Bleef een oud
// secret achter (loskoppelen ruimde het niet op), dan faalde elke nieuwe koppeling met
// SQLSTATE 23505 / HTTP 409 -> "Koppelen mislukt (opslaan)".
//
// INVARIANTEN:
//  1. Elke autorisatie krijgt een eigen, unieke secretnaam -> een achtergebleven secret kan
//     een nieuwe koppeling nooit meer blokkeren.
//  2. Volgorde bij (her)koppelen: nieuwe secrets opslaan -> koppeling laten wijzen naar de
//     nieuwe secrets -> pas dan de oude secrets opruimen. Een werkende koppeling blijft
//     intact tot de nieuwe volledig is vastgelegd.
//  3. Mislukt een stap, dan worden de zojuist aangemaakte secrets weer verwijderd
//     (compensatie) en blijft de bestaande koppeling ongewijzigd.
//  4. Opruimen gebeurt op secret-id, nooit op naam; een mislukte opruiming laat hooguit een
//     versleuteld, niet-blokkerend wees-secret achter (zie cleanup_orphan_wearable_token_secrets,
//     migratie_v581.sql).
//  5. Tokens en secretwaarden komen nooit in logs, responses of de browser.
// ════════════════════════════════════════════════════════════════════════════

const NAAM_PREFIX_RE = /^[a-z0-9]{2,20}_(access|refresh)$/;

// Unieke secretnaam per autorisatie. De user-id blijft in de naam staan zodat wees-secrets
// per gebruiker herkenbaar en opruimbaar blijven.
function uniekeSecretNaam(prefix, userId) {
  if (!NAAM_PREFIX_RE.test(String(prefix))) throw new Error('ongeldige secret-prefix');
  return prefix + '_' + userId + '_' + crypto.randomUUID();
}

function sbHeaders(serviceKey, extra) {
  return Object.assign({ apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' }, extra || {});
}

// Best-effort: ruimt wees-secrets van deze gebruiker op (niet door een koppeling gerefereerd
// en ouder dan de beschermingstermijn). De RPC komt uit migratie_v581.sql; bestaat hij nog
// niet (migratie niet toegepast), dan is dat geen fout -- opruimen op id blijft werken.
async function ruimWeesSecretsOp(supabaseUrl, serviceKey, userId) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/cleanup_orphan_wearable_token_secrets`, {
      method: 'POST', headers: sbHeaders(serviceKey), body: JSON.stringify({ p_user_id: userId })
    });
    if (!res.ok) return null;
    const n = await res.json();
    return typeof n === 'number' ? n : null;
  } catch (_) { return null; }
}

/**
 * Legt een nieuwe set tokens veilig vast voor (userId, provider) en vervangt een eventuele
 * bestaande koppeling zonder haar te verliezen als er onderweg iets misgaat.
 *
 * @param {object} o
 *   supabaseUrl, serviceKey, userId, provider   verplicht
 *   prefix          naamvoorvoegsel, bv. 'wearable' -> 'wearable_access_<userId>_<uuid>'
 *   accessToken     verplicht
 *   refreshToken    optioneel; ontbreekt hij, dan blijft een bestaand refresh-secret behouden
 *   velden          overige kolommen voor wearable_connections (token_expires_at, scope, ...)
 * @returns {{ok:true}|{ok:false, fase:string}}  fase: 'lezen'|'access'|'refresh'|'koppeling'
 */
async function vervangWearableTokens(o) {
  const { supabaseUrl, serviceKey, userId, provider, prefix, accessToken, refreshToken } = o;
  if (!supabaseUrl || !serviceKey || !userId || !provider || !accessToken) return { ok: false, fase: 'invoer' };

  // 1. Bestaande koppeling lezen. Lukt dat niet, dan stoppen: zonder de oude secret-id's is
  //    veilig vervangen en opruimen niet mogelijk.
  let bestaand = null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.${provider}&select=access_token_secret_id,refresh_token_secret_id&limit=1`,
      { headers: sbHeaders(serviceKey) }
    );
    const rows = res.ok ? await res.json() : null;
    if (!Array.isArray(rows)) { console.error('vervangWearableTokens: koppeling lezen mislukt', res.status); return { ok: false, fase: 'lezen' }; }
    bestaand = rows[0] || null;
  } catch (e) { console.error('vervangWearableTokens: koppeling lezen catch', e && e.message); return { ok: false, fase: 'lezen' }; }

  // 2. Nieuwe secrets opslaan onder een unieke naam.
  const nieuwAccessId = await storeWearableTokenSecret(supabaseUrl, serviceKey, accessToken, uniekeSecretNaam(prefix + '_access', userId));
  if (!nieuwAccessId) return { ok: false, fase: 'access' };
  let nieuwRefreshId = null;
  if (refreshToken) {
    nieuwRefreshId = await storeWearableTokenSecret(supabaseUrl, serviceKey, refreshToken, uniekeSecretNaam(prefix + '_refresh', userId));
    if (!nieuwRefreshId) {
      await deleteWearableTokenSecret(supabaseUrl, serviceKey, nieuwAccessId); // compensatie
      return { ok: false, fase: 'refresh' };
    }
  }
  // Geen nieuw refresh-token ontvangen: het bestaande blijft geldig en blijft dus gekoppeld.
  const behoudOudRefresh = !nieuwRefreshId && !!(bestaand && bestaand.refresh_token_secret_id);
  const refreshIdVoorRij = nieuwRefreshId || (behoudOudRefresh ? bestaand.refresh_token_secret_id : null);

  // 3. Koppeling laten wijzen naar de nieuwe secrets. on_conflict is expliciet: zonder dat
  //    lost PostgREST een conflict alleen op de primaire sleutel op en faalt herkoppelen op
  //    UNIQUE(user_id, provider).
  let opgeslagen = false;
  let uitkomstOnzeker = false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?on_conflict=user_id,provider`, {
      method: 'POST',
      headers: sbHeaders(serviceKey, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(Object.assign({}, o.velden || {}, {
        user_id: userId, provider: provider,
        access_token_secret_id: nieuwAccessId, refresh_token_secret_id: refreshIdVoorRij
      }))
    });
    opgeslagen = res.ok;
    // 429/5xx kunnen optreden nadat de database de upsert al heeft gecommit.
    if (!res.ok) {
      uitkomstOnzeker = res.status === 429 || res.status >= 500;
      console.error('vervangWearableTokens: koppeling opslaan mislukt', res.status, await foutCode(res));
    }
  } catch (e) {
    // Geen HTTP-bevestiging betekent NIET dat de databasewijziging niet is uitgevoerd.
    uitkomstOnzeker = true;
    console.error('vervangWearableTokens: koppeling opslaan catch', e && e.message);
  }

  if (!opgeslagen && uitkomstOnzeker) {
    // Read-after-write kan een ontvangen commit aantonen. Zelfs als deze read geen nieuwe
    // koppeling laat zien, kan de oorspronkelijke write nog onderweg zijn. Verwijder in dit
    // onzekere geval NOOIT nieuwe secrets: een latere commit kan ernaar gaan verwijzen.
    try {
      const controle = await fetch(
        `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.${provider}&select=access_token_secret_id,refresh_token_secret_id&limit=1`,
        { headers: sbHeaders(serviceKey) }
      );
      const rows = controle.ok ? await controle.json() : null;
      const rij = Array.isArray(rows) ? rows[0] : null;
      opgeslagen = !!(rij && rij.access_token_secret_id === nieuwAccessId &&
        rij.refresh_token_secret_id === refreshIdVoorRij);
    } catch (_) { /* onbekende stand: behoud alle secrets voor latere reconciliation */ }
    if (!opgeslagen) return { ok: false, fase: 'koppeling_onzeker' };
  }

  if (!opgeslagen) {
    // Alleen bij een definitieve afwijzing (niet een netwerk-/serverstoring) compenseren.
    await deleteWearableTokenSecret(supabaseUrl, serviceKey, nieuwAccessId);
    if (nieuwRefreshId) await deleteWearableTokenSecret(supabaseUrl, serviceKey, nieuwRefreshId);
    return { ok: false, fase: 'koppeling' };
  }

  // 4. Pas nu de oude secrets opruimen (best-effort; een mislukking blokkeert niets).
  if (bestaand) {
    if (bestaand.access_token_secret_id && bestaand.access_token_secret_id !== nieuwAccessId) {
      await deleteWearableTokenSecret(supabaseUrl, serviceKey, bestaand.access_token_secret_id);
    }
    if (bestaand.refresh_token_secret_id && !behoudOudRefresh && bestaand.refresh_token_secret_id !== nieuwRefreshId) {
      await deleteWearableTokenSecret(supabaseUrl, serviceKey, bestaand.refresh_token_secret_id);
    }
  }
  await ruimWeesSecretsOp(supabaseUrl, serviceKey, userId);
  return { ok: true };
}

/**
 * Verwijdert de koppeling (userId, provider) en daarna de bijbehorende secrets.
 * Volgorde: eerst de rij, dan de secrets. Mislukt het verwijderen van de rij, dan blijft
 * alles staan (geen koppeling die naar verdwenen secrets wijst).
 *
 * @returns {{ok:true, bestond:boolean}|{ok:false, fase:string}}
 */
async function verwijderWearableKoppeling(o) {
  const { supabaseUrl, serviceKey, userId, provider } = o;
  let rij = o.rij || null;
  if (!rij) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.${provider}&select=access_token_secret_id,refresh_token_secret_id&limit=1`,
        { headers: sbHeaders(serviceKey) }
      );
      const rows = res.ok ? await res.json() : null;
      if (!Array.isArray(rows)) return { ok: false, fase: 'lezen' };
      rij = rows[0] || null;
    } catch (_) { return { ok: false, fase: 'lezen' }; }
  }
  try {
    const del = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.${provider}`, {
      method: 'DELETE', headers: sbHeaders(serviceKey, { Prefer: 'return=minimal' })
    });
    if (!del.ok) { console.error('verwijderWearableKoppeling: rij verwijderen mislukt', del.status, await foutCode(del)); return { ok: false, fase: 'koppeling' }; }
  } catch (e) { console.error('verwijderWearableKoppeling: catch', e && e.message); return { ok: false, fase: 'koppeling' }; }

  if (rij) {
    if (rij.access_token_secret_id) await deleteWearableTokenSecret(supabaseUrl, serviceKey, rij.access_token_secret_id);
    if (rij.refresh_token_secret_id) await deleteWearableTokenSecret(supabaseUrl, serviceKey, rij.refresh_token_secret_id);
  }
  await ruimWeesSecretsOp(supabaseUrl, serviceKey, userId);
  return { ok: true, bestond: !!rij };
}

module.exports = {
  storeWearableTokenSecret, getWearableTokenSecret, updateWearableTokenSecret, deleteWearableTokenSecret,
  uniekeSecretNaam, vervangWearableTokens, verwijderWearableKoppeling, ruimWeesSecretsOp
};
