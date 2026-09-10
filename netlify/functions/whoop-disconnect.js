// netlify/functions/whoop-disconnect.js
// Loskoppelen: verwijdert de opgeslagen Vault-tokens en de connectie-rij.
//
// EERLIJKE BEPERKING: WHOOP's API-changelog noemt het bestaan van een
// "revokeUserOauthAccess"-mechanisme ("if a user wants to disable your
// integration, you can revoke their access token from your application"),
// maar de exacte, aanroepbare REST-endpoint-URL daarvoor is in deze sessie
// niet met dezelfde A-zekerheid bevestigd als de OAuth-token-endpoints
// zelf. Deze functie roept die aanroep daarom bewust NIET blind aan (geen
// gegokte URL) en verwijdert in elk geval altijd de lokale tokens/
// koppeling (dat is binnen onze eigen controle en altijd correct/veilig).
// PO ACTION: exacte revoke-endpoint bevestigen zodra WHOOP-credentials
// beschikbaar zijn (dan is de officiele documentatie voor ingelogde
// developers mogelijk vollediger).
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

    const { deleteWearableTokenSecret } = require('./wearableTokenVault.js');
    const r = await fetch(
      `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.whoop&select=access_token_secret_id,refresh_token_secret_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await r.json();
    if (rows[0]) {
      if (rows[0].access_token_secret_id) await deleteWearableTokenSecret(supabaseUrl, serviceKey, rows[0].access_token_secret_id);
      if (rows[0].refresh_token_secret_id) await deleteWearableTokenSecret(supabaseUrl, serviceKey, rows[0].refresh_token_secret_id);
    }
    await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.whoop`, {
      method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disconnected: true, provider: 'whoop' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
