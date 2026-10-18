// Loskoppelen: verwijdert de opgeslagen tokens en probeert (best-effort) de toegang ook
// bij Google zelf in te trekken. Zelfde JWT-verificatiepatroon als delete-account.js.
const { getWearableTokenSecret, verwijderWearableKoppeling } = require('./wearableTokenVault.js');
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
      `${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&provider=eq.google_health&select=access_token_secret_id,refresh_token_secret_id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = r.ok ? await r.json() : null;
    if (!Array.isArray(rows)) return { statusCode: 502, body: JSON.stringify({ error: { message: 'Loskoppelen mislukt' } }) };
    const rij = rows[0] || null;

    // Het token voor de intrekking bij Google wordt opgehaald VOORDAT er iets verwijderd
    // wordt. Voorkeur voor het refresh-token: daarmee trekt Google de hele toestemming in,
    // ook als het access-token al verlopen is (precies de situatie na een mislukte refresh).
    let tokenVoorRevoke = null;
    if (rij) {
      tokenVoorRevoke = rij.refresh_token_secret_id ? await getWearableTokenSecret(supabaseUrl, serviceKey, rij.refresh_token_secret_id) : null;
      if (!tokenVoorRevoke && rij.access_token_secret_id) tokenVoorRevoke = await getWearableTokenSecret(supabaseUrl, serviceKey, rij.access_token_secret_id);
    }

    // v4.70.25 (DEC-VAULT-001): eerst de koppeling, daarna de Vault-secrets. Tot dusver
    // bleven de secrets hier staan; samen met de vaste secretnaam blokkeerde dat elke
    // nieuwe koppeling (HTTP 409 / SQLSTATE 23505).
    const weg = await verwijderWearableKoppeling({ supabaseUrl, serviceKey, userId, provider: 'google_health', rij });
    if (!weg.ok) return { statusCode: 500, body: JSON.stringify({ error: { message: 'Loskoppelen mislukt' } }) };

    if (tokenVoorRevoke) {
      // Best-effort: de gebruiker moet altijd kunnen loskoppelen, ongeacht Google's status.
      // Het token gaat in de body, niet in de URL (URL's belanden in logs).
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: tokenVoorRevoke })
        });
      } catch (e) { console.warn('wearable-disconnect: revoke bij Google mislukt', e && e.message); }
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error('wearable-disconnect exception', e && e.message);
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout' } }) };
  }
};

// v4.70.25 (DEC-API-001): bereikbaar vanuit de Android-app (zie _cors.js). Web ongewijzigd.
exports.handler = require('./_cors.js').withCors(exports.handler);
