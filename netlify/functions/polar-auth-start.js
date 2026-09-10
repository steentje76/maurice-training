// netlify/functions/polar-auth-start.js
// Start van de OAuth2-koppeling met Polar AccessLink. Zelfde JWT-
// verificatiepatroon als wearable-auth-start.js (Google Health) --
// user_id komt nooit van de client zelf.
//
// Geverifieerd tegen meerdere onafhankelijke, uit Polar's eigen OpenAPI-
// spec gegenereerde clientbibliotheken + de officiele polar.com/
// polar-api-v4-pagina (allemaal identiek):
//   Autorisatie: https://auth.polar.com/oauth/authorize
//   Token-exchange: https://polarremote.com/v2/oauth2/token (HTTP Basic
//     Auth met client_id:client_secret, geen client-secret in de body)
// Polar AccessLink-registratie is ZELFBEDIENING (admin.polaraccesslink.com)
// -- geen goedkeuringsperiode zoals bij Garmin.
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const clientId = process.env.POLAR_CLIENT_ID;
  const redirectUri = process.env.POLAR_REDIRECT_URI; // bv. https://maurice-art.netlify.app/.netlify/functions/polar-auth-callback

  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };
  if (!clientId || !redirectUri) return { statusCode: 500, body: JSON.stringify({ error: { message: 'POLAR_CLIENT_ID/POLAR_REDIRECT_URI niet ingesteld op Netlify -- zie PO Action List (docs/DEVICES_PROVIDER_TRACKER.md)' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    const userId = user.id;
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    // Zelfde oauth_state-patroon als wearable-auth-start.js (Google Health) --
    // gedeelde wearable_oauth_state-tabel. provider='polar' wordt sinds
    // migratie_v561 expliciet gezet (voorheen impliciet ontbrekend/
    // 'google_health' via de kolom-default) -- puur data-hygiëne, geen
    // functionele wijziging (state zelf is al een unieke UUID).
    await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state?user_id=eq.${userId}&provider=eq.polar`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    const stateRes = await fetch(`${supabaseUrl}/rest/v1/wearable_oauth_state`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: userId, provider: 'polar' })
    });
    if (!stateRes.ok) {
      const err = await stateRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: { message: 'Kon oauth-state niet aanmaken: ' + err } }) };
    }
    const [stateRow] = await stateRes.json();

    // Scope: accesslink.read_all (minimale toegang die alle relevante V1-
    // datacategorieen dekt -- exercises/daily-activity/nightly-recharge).
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'accesslink.read_all',
      state: stateRow.state
    });
    const authUrl = `https://auth.polar.com/oauth/authorize?${params.toString()}`;

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authUrl }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
