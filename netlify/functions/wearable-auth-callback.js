// Ontvangt de browser-redirect van Google na toestemming (kale GET, geen Authorization-
// header — vandaar de state-lookup i.p.v. JWT-verificatie zoals de andere functions).
// Wisselt de code om voor tokens en slaat ze op voor de gebruiker die bij deze state
// hoort. Eenmalig bruikbaar: de state-rij wordt na gebruik verwijderd.
const { vervangWearableTokens } = require('./wearableTokenVault.js');

// state = <uuid> of <uuid>~android. Het deel na ~ zegt alleen WAARHEEN de gebruiker na afloop
// wordt teruggestuurd (webapp of de terugkeerpagina voor de Android-app); het is geen
// autorisatiegegeven. Alles wat niet exact dit patroon heeft wordt geweigerd, zodat er nooit
// een onbewerkte waarde in een databasefilter terechtkomt.
const STATE_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(~android)?$/i;
function parseState(raw) {
  const m = STATE_RE.exec(String(raw || ''));
  return m ? { id: m[1].toLowerCase(), client: m[2] ? 'android' : 'web' } : null;
}
exports.handler = async function (event) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI;
  const appUrl = process.env.APP_URL || 'https://maurice-art.netlify.app';

  // Web: terug naar de webapp (ongewijzigd). Android-app: de gebruiker zit op dit moment in de
  // systeembrowser, niet in de app -> naar een kleine terugkeerpagina die naar de app verwijst.
  let client = 'web';
  const redirectToApp = (status) => ({
    statusCode: 302,
    headers: {
      Location: client === 'android' ? `${appUrl}/wearable-return.html?wearable=${status}` : `${appUrl}/?wearable=${status}`,
      'Cache-Control': 'no-store'
    }
  });

  if (!serviceKey || !clientId || !clientSecret || !redirectUri) {
    console.error('wearable-auth-callback: ontbrekende env vars');
    return redirectToApp('config_error');
  }

  const { code, state: rawState, error: oauthError } = event.queryStringParameters || {};
  const parsed = parseState(rawState);
  if (parsed) client = parsed.client;
  if (oauthError) return redirectToApp('denied');
  if (!code || !parsed) return redirectToApp('invalid_request');
  const state = parsed.id;

  try {
    // Stap 1: state opzoeken en meteen verwijderen (eenmalig gebruik).
    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?state=eq.${state}&select=user_id,created_at`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    const stateRows = await stateRes.json();
    if (!Array.isArray(stateRows) || !stateRows.length) return redirectToApp('expired');
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
      // Alleen status en Googles foutcode loggen -- nooit de respons zelf.
      console.error('wearable-auth-callback token exchange failed', tokenRes.status, safeOAuthError(tokens));
      return redirectToApp('token_error');
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    // Tokens gaan uitsluitend versleuteld naar Supabase Vault (P1-09), nooit in plaintext.
    // v4.70.25 (DEC-VAULT-001): vervangWearableTokens() slaat eerst de nieuwe secrets op
    // onder een unieke naam, laat daarna de koppeling ernaar wijzen en ruimt pas dan de oude
    // secrets op. Mislukt een stap, dan blijft een bestaande, werkende koppeling intact.
    const resultaat = await vervangWearableTokens({
      supabaseUrl, serviceKey, userId, provider: 'google_health', prefix: 'wearable',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      velden: {
        token_expires_at: expiresAt,
        scope: tokens.scope || null,
        connected_at: new Date().toISOString(),
        last_sync_status: null,
        last_sync_at: null
      }
    });
    if (!resultaat.ok) {
      console.error('wearable-auth-callback: koppeling niet opgeslagen, fase', resultaat.fase);
      return redirectToApp('save_error');
    }

    return redirectToApp('connected');
  } catch (e) {
    console.error('wearable-auth-callback exception', e && e.message);
    return redirectToApp('server_error');
  }
};

// Googles OAuth-foutcode (bv. invalid_grant) is geen geheim en is nodig voor diagnose.
// Alleen een korte code in het verwachte formaat wordt doorgelaten.
function safeOAuthError(body) {
  const c = body && typeof body.error === 'string' ? body.error : '';
  return /^[a-z_]{1,40}$/.test(c) ? c : 'onbekend';
}
exports.parseState = parseState;
