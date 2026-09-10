// netlify/functions/whoop-auth-start.js
// Devices/Wearables V1 MUST — WHOOP. Start van de OAuth2 authorization
// code flow. Zelfde JWT-verificatiepatroon als de andere providers.
//
// Officieel bevestigd (evidence-niveau A, developer.whoop.com, meerdere
// documentatiepagina's -- /docs/developing/oauth/, /docs/tutorials/
// access-token-postman/, /docs/tutorials/access-token-passport/):
//   Autorisatie: GET https://api.prod.whoop.com/oauth/oauth2/auth
//   Token-exchange: POST https://api.prod.whoop.com/oauth/oauth2/token
// Zelfbediening: sign-in via id.whoop.com, Team + App aanmaken in het
// Developer Dashboard (developer.whoop.com), geen goedkeuringsperiode.
// Scopes (bevestigd): offline (voor refresh_token), read:profile,
// read:recovery, read:sleep, read:workout, read:cycles,
// read:body_measurement.
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const clientId = process.env.WHOOP_CLIENT_ID;
  const redirectUri = process.env.WHOOP_REDIRECT_URI; // bv. https://maurice-art.netlify.app/.netlify/functions/whoop-auth-callback

  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };
  if (!clientId || !redirectUri) return { statusCode: 500, body: JSON.stringify({ error: { message: 'WHOOP_CLIENT_ID/WHOOP_REDIRECT_URI niet ingesteld op Netlify -- zie docs/DEVICES_PROVIDER_TRACKER.md' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    const userId = user.id;
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    // Vorige, nog niet-afgeronde WHOOP-state-rijen voor deze gebruiker opruimen
    // -- alleen voor deze provider, andere providers' state blijft ongemoeid.
    await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?user_id=eq.${userId}&provider=eq.whoop`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: userId, provider: 'whoop' })
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
      scope: 'offline read:profile read:recovery read:sleep read:workout read:cycles read:body_measurement',
      state: stateRow.state
    });
    const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authUrl }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
