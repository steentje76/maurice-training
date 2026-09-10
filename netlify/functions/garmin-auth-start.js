// netlify/functions/garmin-auth-start.js
// Devices/Wearables V1 MUST — Garmin. Start van de OAuth 2.0 + PKCE-flow.
//
// Officieel bevestigd (evidence-niveau A: developerportal.garmin.com/sites/
// default/files/OAuth2PKCE_1.pdf, de authentieke Garmin Connect Developer
// Program OAuth2-PKCE-specificatie):
//   Autorisatie-URL: GET https://connect.garmin.com/oauth2Confirm
//     ?client_id=...&response_type=code&state=...&redirect_uri=...
//     &code_challenge=...&code_challenge_method=S256
//
// Zelfde JWT-verificatiepatroon als delete-account.js/wearable-auth-start.js:
// nooit een user_id van de client zelf vertrouwen. PKCE (RFC 7636):
// code_verifier wordt hier gegenereerd en tijdelijk opgeslagen (via de
// bestaande wearable_oauth_state-tabel, migratie_v561 -- provider/
// code_verifier-kolommen), zodat garmin-auth-callback.js hem kan
// meesturen bij de token-exchange (Garmin vereist dit expliciet, geen
// implicit-grant-alternatief).
const crypto = require('crypto');

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const clientId = process.env.GARMIN_CLIENT_ID;
  const redirectUri = process.env.GARMIN_REDIRECT_URI; // bv. https://maurice-art.netlify.app/.netlify/functions/garmin-auth-callback

  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };
  if (!clientId || !redirectUri) return { statusCode: 500, body: JSON.stringify({ error: { message: 'GARMIN_CLIENT_ID/GARMIN_REDIRECT_URI niet ingesteld op Netlify -- PO ACTION: Garmin Connect Developer Program-goedkeuring nodig (zie docs/WEARABLE_PROVIDER_SOURCE_PACK.md)' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    const userId = user.id;
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    // Vorige, nog niet-afgeronde Garmin-state-rijen voor deze gebruiker opruimen
    // (voorkomt opstapeling bij herhaald starten zonder afronden) -- alleen
    // voor deze provider, andere providers se state blijft ongemoeid.
    await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?user_id=eq.${userId}&provider=eq.garmin`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });

    // PKCE (RFC 7636): code_verifier = cryptografisch willekeurige string
    // (43-128 tekens, unreserved characters); code_challenge = BASE64URL(
    // SHA256(code_verifier)), method S256 -- exact zoals in de officiele
    // Garmin-spec gedemonstreerd.
    const codeVerifier = base64url(crypto.randomBytes(64)).slice(0, 128);
    const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());

    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: userId, provider: 'garmin', code_verifier: codeVerifier })
    });
    if (!stateRes.ok) {
      const err = await stateRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: { message: 'Kon oauth-state niet aanmaken: ' + err } }) };
    }
    const [stateRow] = await stateRes.json();

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      state: stateRow.state,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    const authUrl = `https://connect.garmin.com/oauth2Confirm?${params.toString()}`;

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authUrl }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
