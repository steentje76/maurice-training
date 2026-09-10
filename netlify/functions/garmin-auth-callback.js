// netlify/functions/garmin-auth-callback.js
// Devices/Wearables V1 MUST — Garmin. Ontvangt de browser-redirect van
// Garmin na toestemming (kale GET, geen Authorization-header — vandaar de
// state-lookup i.p.v. JWT-verificatie, zelfde patroon als
// wearable-auth-callback.js voor Google Health).
//
// Token-endpoint officieel bevestigd (developerportal.garmin.com/sites/
// default/files/OAuth2PKCE_1.pdf):
//   POST https://diauth.garmin.com/di-oauth2-service/oauth/token
//   grant_type=authorization_code, client_id, client_secret, code,
//   code_verifier (PKCE, RFC 7636), redirect_uri
//   Respons bevat: access_token, expires_in (86400s), token_type=bearer,
//   refresh_token, scope.
const { storeWearableTokenSecret } = require('./wearableTokenVault.js');

exports.handler = async function (event) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri = process.env.GARMIN_REDIRECT_URI;
  const appUrl = process.env.APP_URL || 'https://maurice-art.netlify.app';

  const redirectToApp = (status) => ({
    statusCode: 302,
    headers: { Location: `${appUrl}/?wearable=${status}&provider=garmin` }
  });

  if (!serviceKey || !clientId || !clientSecret || !redirectUri) {
    console.error('garmin-auth-callback: ontbrekende env vars');
    return redirectToApp('config_error');
  }

  const { code, state, error: oauthError } = event.queryStringParameters || {};
  if (oauthError) return redirectToApp('denied');
  if (!code || !state) return redirectToApp('invalid_request');

  try {
    // Stap 1: state + code_verifier opzoeken en meteen verwijderen (eenmalig gebruik).
    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?state=eq.${state}&provider=eq.garmin&select=user_id,code_verifier,created_at`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    const stateRows = await stateRes.json();
    if (!stateRows.length) return redirectToApp('expired');
    const { user_id: userId, code_verifier: codeVerifier, created_at } = stateRows[0];
    await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?state=eq.${state}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });

    const ageMinutes = (Date.now() - new Date(created_at).getTime()) / 60000;
    if (ageMinutes > 15) return redirectToApp('expired');
    if (!codeVerifier) return redirectToApp('config_error'); // moet altijd aanwezig zijn voor Garmin (PKCE verplicht)

    // Stap 2: code + code_verifier omwisselen voor tokens.
    const tokenRes = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri
      })
    });
    let tokens = null;
    try { tokens = await tokenRes.json(); } catch (_) { tokens = null; }
    if (!tokenRes.ok || !tokens || !tokens.access_token) {
      console.error('garmin-auth-callback: token-exchange mislukt', tokenRes.status);
      return redirectToApp('token_error');
    }

    // Stap 3: tokens veilig opslaan (Vault, zelfde patroon als Google Health --
    // nooit plaintext in wearable_connections).
    const accessSecretId = await storeWearableTokenSecret(supabaseUrl, serviceKey, tokens.access_token, `garmin_access_${userId}`);
    const refreshSecretId = tokens.refresh_token
      ? await storeWearableTokenSecret(supabaseUrl, serviceKey, tokens.refresh_token, `garmin_refresh_${userId}`)
      : null;
    if (!accessSecretId) return redirectToApp('save_error');

    const expiresAt = new Date(Date.now() + (Number(tokens.expires_in) || 86400) * 1000).toISOString();

    // upsert: een gebruiker heeft maximaal één actieve Garmin-connectie.
    await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.garmin`, {
      method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId, provider: 'garmin',
        access_token_secret_id: accessSecretId, refresh_token_secret_id: refreshSecretId,
        token_expires_at: expiresAt, scope: tokens.scope || null,
        connected_at: new Date().toISOString()
      })
    });
    if (!insertRes.ok) return redirectToApp('save_error');

    return redirectToApp('connected');
  } catch (e) {
    console.error('garmin-auth-callback error', e.message);
    return redirectToApp('server_error');
  }
};
