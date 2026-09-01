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
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: refreshTokenValue, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' })
    });
    let refreshed = null;
    try { refreshed = await refreshRes.json(); } catch (_) { refreshed = null; }
    if (!refreshRes.ok || !refreshed || !refreshed.access_token) {
      return { ok: false, status: 200, body: { status: 'token_expired', code: ERR.TOKEN_REFRESH, reason: 'refresh_failed' } };
    }
    accessToken = refreshed.access_token;
    const newExpiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
    await updateWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id, accessToken);
    await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health`, {
      method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ token_expires_at: newExpiresAt })
    });
  }

  return { ok: true, accessToken, conn };
}

module.exports = { getValidGoogleHealthAccessToken, ERR };
