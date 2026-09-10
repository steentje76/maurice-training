// netlify/functions/oura-auth-callback.js
// Devices/Wearables V1 MUST — Oura. Ontvangt de browser-redirect na
// toestemming. Token-endpoint officieel bevestigd (cloud.ouraring.com/
// docs/authentication): POST https://api.ouraring.com/oauth/token.
const { storeWearableTokenSecret } = require('./wearableTokenVault.js');

exports.handler = async function (event) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const redirectUri = process.env.OURA_REDIRECT_URI;
  const appUrl = process.env.APP_URL || 'https://maurice-art.netlify.app';

  const redirectToApp = (status) => ({
    statusCode: 302,
    headers: { Location: `${appUrl}/?wearable=${status}&provider=oura` }
  });

  if (!serviceKey || !clientId || !clientSecret || !redirectUri) {
    console.error('oura-auth-callback: ontbrekende env vars');
    return redirectToApp('config_error');
  }

  const { code, state, error: oauthError } = event.queryStringParameters || {};
  if (oauthError) return redirectToApp('denied');
  if (!code || !state) return redirectToApp('invalid_request');

  try {
    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?state=eq.${state}&provider=eq.oura&select=user_id,created_at`, {
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

    const tokenRes = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    });
    let tokens = null;
    try { tokens = await tokenRes.json(); } catch (_) { tokens = null; }
    if (!tokenRes.ok || !tokens || !tokens.access_token) {
      console.error('oura-auth-callback: token-exchange mislukt', tokenRes.status);
      return redirectToApp('token_error');
    }

    const accessSecretId = await storeWearableTokenSecret(supabaseUrl, serviceKey, tokens.access_token, `oura_access_${userId}`);
    const refreshSecretId = tokens.refresh_token
      ? await storeWearableTokenSecret(supabaseUrl, serviceKey, tokens.refresh_token, `oura_refresh_${userId}`)
      : null;
    if (!accessSecretId) return redirectToApp('save_error');

    // Vervaltijd: gebruik het door Oura teruggegeven expires_in-veld. Als
    // dat ontbreekt, een conservatieve fallback van 1 uur (niet met
    // dezelfde zekerheid bevestigd als de endpoint-URL's zelf) -- een te
    // korte fallback leidt hooguit tot een onnodig vroege refresh-poging,
    // nooit tot een stille, onopgemerkte tokenveroudering.
    const expiresAt = new Date(Date.now() + (Number(tokens.expires_in) || 3600) * 1000).toISOString();

    await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.oura`, {
      method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId, provider: 'oura',
        access_token_secret_id: accessSecretId, refresh_token_secret_id: refreshSecretId,
        token_expires_at: expiresAt, scope: tokens.scope || null,
        connected_at: new Date().toISOString()
      })
    });
    if (!insertRes.ok) return redirectToApp('save_error');

    return redirectToApp('connected');
  } catch (e) {
    console.error('oura-auth-callback error', e.message);
    return redirectToApp('server_error');
  }
};
