// Start van de OAuth-koppeling met Google Health API (Fitbit-opvolger). Bouwt de
// autorisatie-URL en geeft die terug aan de client, die de gebruiker daar naartoe
// stuurt. De user_id wordt NU al vastgelegd (via de meegestuurde sessie) in
// wearable_oauth_state, zodat wearable-auth-callback.js straks — als Google terugstuurt
// zonder Authorization-header — weet welke gebruiker dit was. Zelfde JWT-verificatiepatroon
// als delete-account.js: nooit een user_id van de client zelf vertrouwen.
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_HEALTH_REDIRECT_URI; // bv. https://maurice-art.netlify.app/.netlify/functions/wearable-auth-callback

  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };
  if (!clientId || !redirectUri) return { statusCode: 500, body: JSON.stringify({ error: { message: 'GOOGLE_HEALTH_CLIENT_ID/GOOGLE_HEALTH_REDIRECT_URI niet ingesteld op Netlify' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader }
    });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    const userId = user.id;
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    // Vorige, nog niet-afgeronde state-rijen voor deze gebruiker opruimen (voorkomt opstapeling
    // als iemand de koppel-flow meerdere keren start zonder af te ronden).
    await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });

    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: userId })
    });
    if (!stateRes.ok) {
      const err = await stateRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: { message: 'Kon oauth-state niet aanmaken: ' + err } }) };
    }
    const [stateRow] = await stateRes.json();

    // Scopes: alleen wat we daadwerkelijk gebruiken (HRV, rusthartslag, slaap) — principe
    // van minimale toegang. Geverifieerd tegen developers.google.com/health/scopes na een
    // eerdere live 400 invalid_scope-fout met de verkeerde (health.*) scope-namen —
    // de juiste prefix is googlehealth.*, niet health.*.
    const scope = [
      'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
      'https://www.googleapis.com/auth/googlehealth.sleep.readonly'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline', // nodig voor een refresh_token
      prompt: 'consent',      // dwingt refresh_token af, ook bij herkoppelen
      scope,
      state: stateRow.state
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authUrl }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
