// Server-side accountverwijdering — vereist de service_role key, die nooit
// in de browser mag staan. Verifieert eerst dat de meegestuurde sessie
// geldig is en haalt het user-id daar rechtstreeks uit op, zodat een
// gebruiker nooit een ander account dan zijn eigen kan laten verwijderen
// (er wordt bewust geen user-id van de client zelf geaccepteerd).
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';

  if (!serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };
  }

  try {
    // Stap 1: valideer de meegestuurde JWT bij Supabase Auth zelf en haal
    // het echte, geverifieerde user-id op.
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader }
    });
    if (!userRes.ok) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    }
    const user = await userRes.json();
    const userId = user.id;
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };
    }

    // Stap 2: verwijder het account via de Admin API (vereist service_role).
    // Dit verwijdert de rij in auth.users. Tabellen met een foreign key
    // naar auth.users met ON DELETE CASCADE ruimen automatisch mee op;
    // tabellen zonder cascade houden mogelijk wees-rijen over (user_id
    // verwijst dan naar een niet meer bestaande gebruiker). Nog te
    // controleren of dat voor deze database het geval is — zie
    // Story-notitie in CURRENT_STATE.md.
    const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    if (!delRes.ok) {
      const errBody = await delRes.text();
      return { statusCode: delRes.status, body: JSON.stringify({ error: { message: 'Verwijderen mislukt: ' + errBody } }) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
