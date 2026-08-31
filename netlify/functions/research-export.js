// netlify/functions/research-export.js — F14 MS-F14-02.
//
// Server-side wrapper rond de export_research_dataset()-RPC (migratie_v531.sql).
// KRITIEK: roept de RPC aan met de eigen JWT van de aanroepende gebruiker
// (nooit de service-role-sleutel) -- dit is wat garandeert dat auth.uid()
// binnen de RPC exact de ingelogde gebruiker is, en dat er geen enkel
// user-id-veld bestaat dat gemanipuleerd zou kunnen worden voor een
// cross-user-export. Geen enkele parameter in de request-body wordt
// gebruikt om te bepalen WIENS data wordt geexporteerd.
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: { message: 'Authenticatie vereist' } }) };
  }
  try {
    // De user-JWT wordt hier doorgegeven, NIET de service-role-sleutel --
    // de RPC draait dus met de rechten en identiteit van de aanroeper zelf.
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/export_research_dataset`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: { message: 'Export mislukt' } }) };
    }
    const data = await res.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Onverwachte fout bij export' } }) };
  }
};
