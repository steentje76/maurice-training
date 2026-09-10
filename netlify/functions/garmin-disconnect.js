// netlify/functions/garmin-disconnect.js
// Devices/Wearables V1 MUST — Garmin. Loskoppelen: verwijdert de opgeslagen
// Vault-tokens EN deregistreert de gebruiker bij Garmin zelf.
//
// CORRECTIE (onafhankelijk herverifieerd, evidence-niveau A -- verbatim
// teruggevonden in de officiele Garmin Connect Developer Program OAuth2.0
// PKCE-specificatie, developerportal.garmin.com/sites/default/files/
// OAuth2PKCE_1.pdf, EN corroborerend bevestigd door een onafhankelijke
// referentie-implementatie): het deregistratie-endpoint is wel degelijk
// met dezelfde zekerheid bevestigd als de OAuth2-token-endpoint:
//   DELETE https://apis.garmin.com/wellness-api/rest/user/registration
//   Authorization: Bearer <access_token>
// Dit "revokes the access token authorized by user" (Garmin's eigen
// terminologie). Best-effort: een mislukking hier blokkeert het lokale
// loskoppelen niet (de gebruiker moet altijd lokaal kunnen loskoppelen,
// ook als Garmin's API niet bereikbaar is).
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

    const { getWearableTokenSecret, deleteWearableTokenSecret } = require('./wearableTokenVault.js');
    const r = await fetch(
      `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.garmin&select=access_token_secret_id,refresh_token_secret_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await r.json();
    if (rows[0]) {
      const accessToken = rows[0].access_token_secret_id ? await getWearableTokenSecret(supabaseUrl, serviceKey, rows[0].access_token_secret_id) : null;
      if (accessToken) {
        try {
          await fetch('https://apis.garmin.com/wellness-api/rest/user/registration', {
            method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` }
          });
        } catch (e) { /* best-effort, zie module-comment */ }
      }
      await deleteWearableTokenSecret(supabaseUrl, serviceKey, rows[0].access_token_secret_id);
      if (rows[0].refresh_token_secret_id) await deleteWearableTokenSecret(supabaseUrl, serviceKey, rows[0].refresh_token_secret_id);
    }
    await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.garmin`, {
      method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disconnected: true, provider: 'garmin' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};

