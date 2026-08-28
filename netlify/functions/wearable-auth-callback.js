// Ontvangt de browser-redirect van Google na toestemming (kale GET, geen Authorization-
// header — vandaar de state-lookup i.p.v. JWT-verificatie zoals de andere functions).
// Wisselt de code om voor tokens en slaat ze op voor de gebruiker die bij deze state
// hoort. Eenmalig bruikbaar: de state-rij wordt na gebruik verwijderd.
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
      // v4.69.2 — Fase 6 vervolgaudit: was `console.error(..., tokens)` — logde het volledige
      // responsobject ongefilterd. Nooit veilig aannemen dat een foutrespons geen gevoelige
      // velden bevat; expliciet whitelisten i.p.v. blacklisten. Zelfde sanitized contract als
      // de refresh-failure in wearable-sync.js (RFC 6749 §5.2 error/error_description only).
      const oauthError = (tokens && typeof tokens.error === 'string') ? tokens.error.slice(0, 64) : null;
      const oauthErrorDesc = (tokens && typeof tokens.error_description === 'string') ? tokens.error_description.slice(0, 200) : null;
      console.error('wearable-auth-callback token_exchange_failed', JSON.stringify({
        provider: 'google_health', phase: 'token_exchange', at: new Date().toISOString(),
        httpStatus: tokenRes.status, oauthError: oauthError, oauthErrorDescription: oauthErrorDesc
      }));
      return redirectToApp('token_error');
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

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
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
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
