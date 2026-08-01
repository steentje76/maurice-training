// Server-side AI-proxy — sleutel staat hier als environment variable,
// nooit in de browser. Vervangt de rechtstreekse client-call naar
// api.anthropic.com die de sleutel in localStorage nodig had.
//
// v3.3.10-fix: JWT-verificatie toegevoegd — als ENIGE Netlify Function in dit project
// miste deze functie de auth-check die alle andere functies (delete-account.js,
// gym-team.js, wearable-*.js) al hadden. Zonder die check kon letterlijk iedereen met
// de URL, zonder in te loggen, deze proxy gebruiken als gratis/onbeperkte Claude-API op
// kosten van de ANTHROPIC_API_KEY hierboven — geen rate limiting, geen kostenplafond.
// Zelfde verificatiepatroon als de rest van het project.
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY niet ingesteld op Netlify' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    if (!user.id) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };
  } catch (e) {
    return { statusCode: 401, body: JSON.stringify({ error: { message: 'Sessie kon niet geverifieerd worden' } }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: payload.model || 'claude-sonnet-4-5',
        max_tokens: payload.max_tokens || 1000,
        system: payload.system,
        messages: payload.messages
      })
    });
    const data = await res.json();
    return { statusCode: res.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Proxy-fout: ' + e.message } }) };
  }
};
