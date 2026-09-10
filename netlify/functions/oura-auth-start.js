// netlify/functions/oura-auth-start.js
// Devices/Wearables V1 MUST — Oura. Start van de OAuth2 authorization
// code flow. Zelfde JWT-verificatiepatroon als de andere providers.
//
// Officieel bevestigd (evidence-niveau A, cloud.ouraring.com/docs/
// authentication, Oura's eigen officiele pagina, verbatim teruggevonden):
//   Autorisatie: https://cloud.ouraring.com/oauth/authorize
//   Token-exchange: https://api.ouraring.com/oauth/token
// Scopes (bevestigd, zelfde bron): email, personal, daily, heartrate,
// workout, tag, session, spo2Daily. Zelfbediening: een API-applicatie mag
// tot 10 gebruikers zonder Oura-goedkeuring -- daarboven is goedkeuring
// vereist (bevestigd via cloud.ouraring.com/v2/docs). Voor de initiele
// koppeling en test is dit dus zelfbediening; bij groei kan een
// goedkeuringsstap nodig worden (apart PO-aandachtspunt, geen blokkade nu).
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const clientId = process.env.OURA_CLIENT_ID;
  const redirectUri = process.env.OURA_REDIRECT_URI;

  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };
  if (!clientId || !redirectUri) return { statusCode: 500, body: JSON.stringify({ error: { message: 'OURA_CLIENT_ID/OURA_REDIRECT_URI niet ingesteld op Netlify -- zie docs/DEVICES_PROVIDER_TRACKER.md' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    const userId = user.id;
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?user_id=eq.${userId}&provider=eq.oura`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: userId, provider: 'oura' })
    });
    if (!stateRes.ok) {
      const err = await stateRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: { message: 'Kon oauth-state niet aanmaken: ' + err } }) };
    }
    const [stateRow] = await stateRes.json();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'daily heartrate workout',
      state: stateRow.state
    });
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?${params.toString()}`;

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authUrl }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
