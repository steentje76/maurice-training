// Ontvangt de browser-redirect van Google na toestemming (kale GET, geen Authorization-
// header — vandaar de state-lookup i.p.v. JWT-verificatie zoals de andere functions).
// Wisselt de code om voor tokens en slaat ze op voor de gebruiker die bij deze state
// hoort. Eenmalig bruikbaar: de state-rij wordt na gebruik verwijderd.
const { storeWearableTokenSecret } = require('./wearableTokenVault.js');
exports.handler = async function (event) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI;
  const appUrl = process.env.APP_URL || 'https://maurice-art.netlify.app';

  const redirectToApp = (status) => ({
    statusCode: 302,
    headers: { Location: `${appUrl}/?wearable=${status}` }
  });

  if (!serviceKey || !clientId || !clientSecret || !redirectUri) {
    console.error('wearable-auth-callback: ontbrekende env vars');
    return redirectToApp('config_error');
  }

  const { code, state, error: oauthError } = event.queryStringParameters || {};
  if (oauthError) return redirectToApp('denied');
  if (!code || !state) return redirectToApp('invalid_request');

  try {
    // Stap 1: state opzoeken en meteen verwijderen (eenmalig gebruik).
    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?state=eq.${state}&select=user_id,created_at`, {
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

    // Stap 2: code omwisselen voor tokens.
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error('wearable-auth-callback token exchange failed', tokens);
      return redirectToApp('token_error');
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    // F13 Post-Audit Remediation (P1-09): OAuth-tokens worden nooit meer
    // in plaintext opgeslagen. store_wearable_token_secret() gebruikt
    // Supabase Vault (Transparent Column Encryption) -- de encryptie-
    // sleutel zelf is nooit beschikbaar via SQL, wordt buiten de database
    // beheerd. Encrypt gebeurt uitsluitend server-side, hier, met de
    // service-role-sleutel.
    const accessTokenSecretId = await storeWearableTokenSecret(supabaseUrl, serviceKey, tokens.access_token, 'wearable_access_' + userId);
    const refreshTokenSecretId = tokens.refresh_token
      ? await storeWearableTokenSecret(supabaseUrl, serviceKey, tokens.refresh_token, 'wearable_refresh_' + userId)
      : null;
    if (!accessTokenSecretId) {
      console.error('wearable-auth-callback: kon access-token niet veilig opslaan in Vault');
      return redirectToApp('save_error');
    }

    // Stap 3: opslaan (upsert — herkoppelen overschrijft de vorige koppeling voor deze
    // gebruiker/provider-combinatie, dankzij de UNIQUE(user_id, provider) constraint).
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections`, {
      method: 'POST',
      headers: {
        apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id: userId,
        provider: 'google_health',
        access_token_secret_id: accessTokenSecretId,
        refresh_token_secret_id: refreshTokenSecretId,
        token_expires_at: expiresAt,
        scope: tokens.scope || null,
        connected_at: new Date().toISOString(),
        last_sync_status: null,
        last_sync_at: null
      })
    });
    if (!upsertRes.ok) {
      console.error('wearable-auth-callback upsert failed', await upsertRes.text());
      return redirectToApp('save_error');
    }

    return redirectToApp('connected');
  } catch (e) {
    console.error('wearable-auth-callback exception', e);
    return redirectToApp('server_error');
  }
};
