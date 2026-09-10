// netlify/functions/polar-auth-callback.js
// Ontvangt de browser-redirect van Polar na toestemming. Wisselt de code om
// voor tokens via HTTP Basic Auth (client_id:client_secret) op
// https://polarremote.com/v2/oauth2/token -- geverifieerd tegen meerdere
// onafhankelijke Polar AccessLink-clientbibliotheken.
//
// KRITIEKE, VERPLICHTE STAP (meerdere onafhankelijke bronnen bevestigen dit
// expliciet): de gebruiker moet na de token-exchange NOG EXPLICIET
// geregistreerd worden via POST /v3/users, anders falen alle latere
// data-aanroepen ook met een geldig access_token. We gebruiken onze eigen
// Supabase user_id als 'member-id' (Polar's eigen koppel-sleutel, geen
// gevoelige data). Een 409 Conflict betekent 'al geregistreerd' -- dat is
// geen fout (bv. bij opnieuw koppelen na eerder loskoppelen).
const { storeWearableTokenSecret } = require('./wearableTokenVault.js');

exports.handler = async function (event) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.POLAR_CLIENT_ID;
  const clientSecret = process.env.POLAR_CLIENT_SECRET;
  const redirectUri = process.env.POLAR_REDIRECT_URI;
  const appUrl = process.env.APP_URL || 'https://maurice-art.netlify.app';

  const redirectToApp = (status) => ({
    statusCode: 302,
    headers: { Location: `${appUrl}/?wearable=${status}&provider=polar` }
  });

  if (!serviceKey || !clientId || !clientSecret || !redirectUri) {
    console.error('polar-auth-callback: ontbrekende env vars');
    return redirectToApp('config_error');
  }

  const { code, state, error: oauthError } = event.queryStringParameters || {};
  if (oauthError) return redirectToApp('denied');
  if (!code || !state) return redirectToApp('invalid_request');

  try {
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

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://polarremote.com/v2/oauth2/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    });
    if (!tokenRes.ok) { console.error('polar-auth-callback: token-exchange mislukt', tokenRes.status); return redirectToApp('token_error'); }
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    const polarUserId = tokenJson.x_user_id; // Polar's eigen interne user-id, nodig als {user-id} path-param bij elke latere aanroep
    if (!accessToken || polarUserId == null) { console.error('polar-auth-callback: onverwachte tokenrespons-vorm'); return redirectToApp('token_error'); }

    // Verplichte user-registratiestap (zie module-comment). 409 = al geregistreerd, geen fout.
    const registerRes = await fetch('https://www.polaraccesslink.com/v3/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'member-id': userId })
    });
    if (!registerRes.ok && registerRes.status !== 409) {
      console.error('polar-auth-callback: user-registratie mislukt', registerRes.status);
      return redirectToApp('save_error');
    }

    // Polar geeft GEEN refresh_token uit bij AccessLink (tokens zijn
    // langdurig geldig zolang de gebruiker de koppeling niet intrekt) --
    // vandaar refresh_token_secret_id hier bewust null, in tegenstelling
    // tot Google Health.
    const accessTokenSecretId = await storeWearableTokenSecret(supabaseUrl, serviceKey, accessToken, 'polar_access_' + userId);
    if (!accessTokenSecretId) { console.error('polar-auth-callback: kon token niet veilig opslaan'); return redirectToApp('save_error'); }

    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId, provider: 'polar',
        access_token_secret_id: accessTokenSecretId, refresh_token_secret_id: null,
        token_expires_at: null, // geen vervaldatum-semantiek bij Polar AccessLink-tokens
        provider_user_id: String(polarUserId), scope: 'accesslink.read_all',
        connected_at: new Date().toISOString()
      })
    });
    if (!upsertRes.ok) { console.error('polar-auth-callback: opslaan connectie mislukt', upsertRes.status); return redirectToApp('save_error'); }

    return redirectToApp('connected');
  } catch (e) {
    console.error('polar-auth-callback error', e.message);
    return redirectToApp('server_error');
  }
};
