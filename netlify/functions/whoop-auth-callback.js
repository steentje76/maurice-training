// netlify/functions/whoop-auth-callback.js
// Devices/Wearables V1 MUST — WHOOP. Ontvangt de browser-redirect na
// toestemming. Token-endpoint officieel bevestigd (developer.whoop.com/
// docs/tutorials/refresh-token-javascript, /docs/tutorials/
// access-token-postman/): POST https://api.prod.whoop.com/oauth/oauth2/token,
// standaard authorization_code grant met client_secret (geen PKCE vereist
// voor de standaard user-flow, in tegenstelling tot Garmin).
const { storeWearableTokenSecret } = require('./wearableTokenVault.js');

exports.handler = async function (event) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;
  const appUrl = process.env.APP_URL || 'https://maurice-art.netlify.app';

  const redirectToApp = (status) => ({
    statusCode: 302,
    headers: { Location: `${appUrl}/?wearable=${status}&provider=whoop` }
  });

  if (!serviceKey || !clientId || !clientSecret || !redirectUri) {
    console.error('whoop-auth-callback: ontbrekende env vars');
    return redirectToApp('config_error');
  }

  const { code, state, error: oauthError } = event.queryStringParameters || {};
  if (oauthError) return redirectToApp('denied');
  if (!code || !state) return redirectToApp('invalid_request');

  try {
    // State eenmalig bruikbaar: opzoeken en direct verwijderen (CSRF/replay-
    // bescherming, zelfde patroon als Polar/Garmin).
    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?state=eq.${state}&provider=eq.whoop&select=user_id,created_at`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    const stateRows = await stateRes.json();
    if (!stateRows.length) return redirectToApp('expired');
    const { user_id: userId, created_at } = stateRows[0];
    await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?state=eq.${state}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    const ageMinutes = (Date.now() - new Date(created_at).getTime()) / 60000;
    if (ageMinutes > 10) return redirectToApp('expired');

    const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });
    let tokens = null;
    try { tokens = await tokenRes.json(); } catch (_) { tokens = null; }
    if (!tokenRes.ok || !tokens || !tokens.access_token) {
      console.error('whoop-auth-callback: token-exchange mislukt', tokenRes.status);
      return redirectToApp('token_error');
    }

    const accessSecretId = await storeWearableTokenSecret(supabaseUrl, serviceKey, tokens.access_token, `whoop_access_${userId}`);
    const refreshSecretId = tokens.refresh_token
      ? await storeWearableTokenSecret(supabaseUrl, serviceKey, tokens.refresh_token, `whoop_refresh_${userId}`)
      : null;
    if (!accessSecretId) return redirectToApp('save_error');

    const expiresAt = new Date(Date.now() + (Number(tokens.expires_in) || 3600) * 1000).toISOString();

    await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.whoop`, {
      method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId, provider: 'whoop',
        access_token_secret_id: accessSecretId, refresh_token_secret_id: refreshSecretId,
        token_expires_at: expiresAt, scope: tokens.scope || null,
        connected_at: new Date().toISOString()
      })
    });
    if (!insertRes.ok) return redirectToApp('save_error');

    return redirectToApp('connected');
  } catch (e) {
    console.error('whoop-auth-callback error', e.message);
    return redirectToApp('server_error');
  }
};
