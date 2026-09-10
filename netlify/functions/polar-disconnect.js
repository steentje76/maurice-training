// netlify/functions/polar-disconnect.js
// Loskoppelen: verwijdert de opgeslagen token en deregistreert de gebruiker
// bij Polar zelf (DELETE /v3/users/{user-id} -- "This will revoke the
// access token authorized by user", bevestigd via twee onafhankelijke,
// uit Polar's eigen OpenAPI-spec gegenereerde clientbibliotheken).
// Zelfde JWT-verificatiepatroon als wearable-disconnect.js.
const { getWearableTokenSecret, deleteWearableTokenSecret } = require('./wearableTokenVault.js');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const { id: userId } = await userRes.json();
    if (!userId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    const r = await fetch(
      `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.polar&select=access_token_secret_id,provider_user_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await r.json();
    const conn = rows && rows[0];

    if (conn) {
      const accessToken = conn.access_token_secret_id ? await getWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id) : null;
      // Best-effort: ook bij Polar zelf deregistreren. Een mislukking hier
      // blokkeert het lokale loskoppelen niet (de gebruiker moet altijd
      // lokaal kunnen loskoppelen, ook als Polar's API niet bereikbaar is).
      if (accessToken && conn.provider_user_id) {
        try {
          await fetch(`https://www.polaraccesslink.com/v3/users/${conn.provider_user_id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` }
          });
        } catch (e) { /* best-effort */ }
      }
      if (conn.access_token_secret_id) await deleteWearableTokenSecret(supabaseUrl, serviceKey, conn.access_token_secret_id);
    }

    await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.polar`, {
      method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disconnected: true, provider: 'polar' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
