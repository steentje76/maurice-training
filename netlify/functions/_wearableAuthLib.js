// netlify/functions/_wearableAuthLib.js — B9-H3B
//
// Gedeelde, herbruikbare token-ophaal-en-refresh-logica voor Google Health,
// GEËXTRAHEERD op basis van het exacte, bewezen patroon in wearable-sync.js
// (F13 Post-Audit Remediation P1-09: token-vault, refresh-rotation).
//
// Sectie 43/47 van de B9-H3B-opdracht: hergebruik bestaande connection-
// model/token-vault-architectuur, geen tweede systeem. wearable-sync.js
// ZELF blijft ONGEWIJZIGD (0 regressierisico op een reeds bewezen, kritiek
// bestand, 43+79 tests) -- deze module is de gedeelde basis voor NIEUWE
// wearable-sync-*-functies (zoals wearable-sync-activities.js), zodat een
// derde, toekomstige functie niet opnieuw hoeft te copy-pasten.
'use strict';

const { getWearableTokenSecret, updateWearableTokenSecret } = require('./wearableTokenVault.js');

const ERR = {
  AUTH: 'AUTH_ERROR',
  TOKEN_REFRESH: 'TOKEN_REFRESH_ERROR',
  NOT_CONNECTED: 'NOT_CONNECTED'
};

/**
 * Haalt een geldige (indien nodig ververste) Google Health access token op
 * voor de gegeven gebruiker. Retourneert { ok:true, accessToken, conn } of
 * { ok:false, status, body } (klaar om direct als HTTP-response te gebruiken).
 */
async function getValidGoogleHealthAccessToken(supabaseUrl, serviceKey, sbHeaders, userId) {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;

  const connRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health&limit=1`, { headers: sbHeaders });
  const connBody = await connRes.json().catch(() => null);
  if (!connRes.ok || !Array.isArray(connBody)) {
    return { ok: false, status: 502, body: { code: 'SUPABASE_ERROR', error: { message: 'kon wearable_connections niet lezen' } } };
  }
  const conn = connBody[0];
  if (!conn) {
    return { ok: false, status: 200, body: { status: 'not_connected', code: ERR.NOT_CONNECTED, reason: 'not_connected' } };
  }

  let accessToken = await getWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id);
  const refreshTokenValue = conn.refresh_token_secret_id ? await getWearableTokenSecret(supabaseUrl, serviceKey, conn.refresh_token_secret_id) : null;
  if (!accessToken) {
    return { ok: false, status: 200, body: { status: 'token_expired', code: ERR.TOKEN_REFRESH, reason: 'token_secret_unavailable' } };
  }

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    if (!refreshTokenValue || !clientId || !clientSecret) {
      return { ok: false, status: 200, body: { status: 'token_expired', code: ERR.TOKEN_REFRESH, reason: 'token_expired_no_refresh' } };
    }
    const ververst = await vernieuwGoogleHealthToken({ supabaseUrl, serviceKey, sbHeaders, userId, conn, refreshTokenValue, clientId, clientSecret });
    if (!ververst.ok) {
      return ververst.permanent
        ? { ok: false, status: 200, body: { status: 'token_expired', code: ERR.TOKEN_REFRESH, reason: 'refresh_failed' } }
        : { ok: false, status: 200, body: { status: 'provider_unavailable', code: ERR.TOKEN_REFRESH, reason: 'refresh_unavailable' } };
    }
    accessToken = ververst.accessToken;
  }

  return { ok: true, accessToken, conn };
}

/* ── TOKEN-REFRESH (v4.70.25, DEC-VAULT-001) ─────────────────────────────────────────────
 * Eén gedeelde implementatie voor wearable-sync.js en getValidGoogleHealthAccessToken().
 *
 *  - PERMANENT vs TIJDELIJK. Alleen wanneer Google het refresh-token zelf afwijst
 *    (invalid_grant: verlopen, ingetrokken, of het 7-dagenplafond van een OAuth-app in
 *    testmodus) is opnieuw koppelen nodig. Een storing bij Google (5xx, 429, netwerk) is
 *    tijdelijk: de koppeling blijft geldig en mag NIET als "opnieuw koppelen" eindigen.
 *  - ROTATIE. Geeft Google bij het vernieuwen een nieuw refresh-token mee, dan vervangt dat
 *    het oude in hetzelfde Vault-secret. Het oude is vanaf dat moment mogelijk ongeldig.
 *  - VERVALTIJD. token_expires_at wordt alleen vooruitgezet als het nieuwe access-token ook
 *    echt in Vault staat. Anders zou een verlopen token een uur lang als geldig doorgaan.
 *  - DIAGNOSE. Alleen Googles foutcode (bv. invalid_grant) wordt teruggegeven voor de log;
 *    nooit een token, nooit de respons zelf.
 *
 * @returns {{ok:true, accessToken:string, rotated:boolean, stored:boolean}
 *          |{ok:false, permanent:boolean, oauthError:string, httpStatus:number}}
 */
const PERMANENTE_OAUTH_FOUTEN = { invalid_grant: true, invalid_client: true, unauthorized_client: true };
function veiligeOAuthFout(body) {
  const c = body && typeof body.error === 'string' ? body.error : '';
  return /^[a-z_]{1,40}$/.test(c) ? c : 'onbekend';
}
async function vernieuwGoogleHealthToken(o) {
  const { supabaseUrl, serviceKey, sbHeaders, userId, conn, refreshTokenValue, clientId, clientSecret } = o;
  let refreshRes;
  try {
    refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: refreshTokenValue, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' })
    });
  } catch (_) {
    return { ok: false, permanent: false, oauthError: 'netwerk', httpStatus: 0 };
  }
  let refreshed = null;
  try { refreshed = await refreshRes.json(); } catch (_) { refreshed = null; }
  if (!refreshRes.ok || !refreshed || !refreshed.access_token) {
    const oauthError = veiligeOAuthFout(refreshed);
    // Permanent: Google wijst de toestemming zelf af (4xx met een bekende code). Al het
    // andere -- 5xx, 429, onleesbaar antwoord -- is tijdelijk.
    const permanent = refreshRes.status >= 400 && refreshRes.status < 500 && refreshRes.status !== 429 && PERMANENTE_OAUTH_FOUTEN[oauthError] === true;
    return { ok: false, permanent, oauthError, httpStatus: refreshRes.status };
  }
  const accessToken = refreshed.access_token;
  const stored = await updateWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id, accessToken);
  let rotated = false;
  if (refreshed.refresh_token && refreshed.refresh_token !== refreshTokenValue && conn.refresh_token_secret_id) {
    rotated = await updateWearableTokenSecret(supabaseUrl, serviceKey, conn.refresh_token_secret_id, refreshed.refresh_token);
  }
  if (stored) {
    const newExpiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
    await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health`, {
      method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ token_expires_at: newExpiresAt })
    });
  }
  return { ok: true, accessToken, rotated, stored };
}

module.exports = { getValidGoogleHealthAccessToken, vernieuwGoogleHealthToken, veiligeOAuthFout, ERR };
