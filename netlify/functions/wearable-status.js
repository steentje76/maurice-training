const { withCors } = require('./_cors.js');   // v4.49.0 — CORS voor de Capacitor-app (https://localhost)
// Geeft alleen onschadelijke metadata terug (wel/niet gekoppeld, laatste sync) — nooit
// access_token/refresh_token. Zelfde JWT-verificatiepatroon als delete-account.js.
const _handler = async function (event) {
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
      `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health&select=connected_at,last_sync_at,last_sync_status&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await r.json();
    const row = rows[0];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row
        ? { connected: true, provider: 'google_health', connectedAt: row.connected_at, lastSyncAt: row.last_sync_at, lastSyncStatus: row.last_sync_status }
        : { connected: false }
      )
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};

// v4.49.0 — de handler blijft ongewijzigd; withCors voegt alleen de CORS-headers toe en
// beantwoordt de preflight, zodat de Capacitor-app (https://localhost) deze functie kan bereiken.
exports.handler = withCors(_handler);
