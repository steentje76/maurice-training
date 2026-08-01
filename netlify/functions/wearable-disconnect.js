// Loskoppelen: verwijdert de opgeslagen tokens en probeert (best-effort) de toegang ook
// bij Google zelf in te trekken. Zelfde JWT-verificatiepatroon als delete-account.js.
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
      `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health&select=access_token`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await r.json();
    if (rows[0]?.access_token) {
      // Best-effort: als dit faalt (bv. token al verlopen) gaat het loskoppelen lokaal
      // gewoon door — de gebruiker moet altijd kunnen loskoppelen, ongeacht Google's status.
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(rows[0].access_token)}`, { method: 'POST' });
      } catch (e) { console.warn('wearable-disconnect: revoke bij Google mislukt', e.message); }
    }

    const delRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    if (!delRes.ok) return { statusCode: 500, body: JSON.stringify({ error: { message: 'Loskoppelen mislukt: ' + await delRes.text() } }) };

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
