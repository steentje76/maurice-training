const { withCors } = require('./_cors.js');   // v4.49.0 — CORS voor de Capacitor-app (https://localhost)
const { verwijderGebruikersdata } = require('./_userData.js');   // v4.50.0 — één gedeelde opruimroutine
// Server-side accountverwijdering — vereist de service_role key, die nooit
// in de browser mag staan. Verifieert eerst dat de meegestuurde sessie
// geldig is en haalt het user-id daar rechtstreeks uit op, zodat een
// gebruiker nooit een ander account dan zijn eigen kan laten verwijderen
// (er wordt bewust geen user-id van de client zelf geaccepteerd).
const _handler = async function (event) {
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

    // Stap 2: verwijder eerst alle persoonlijke data. Er bestaat GEEN foreign
    // key met ON DELETE CASCADE van deze tabellen naar auth.users (expliciet
    // gecontroleerd — de enige CASCADE-relaties zitten in Supabase's eigen
    // interne auth.*-tabellen). Zonder deze stap blijft alle trainingsdata
    // van de gebruiker achter als wees-data na het verwijderen van het account.
    // v5.8.4 (Privacy-audit): 'goals' en 'equipment_types' toegevoegd — zelfde
    // per-gebruiker-configureerbare patroon als athlete_conditions, maar stonden
    // hier nog niet in. Zonder deze twee bleven iemands doelen en eigen
    // uitrustingslabels achter als wees-data, net als het probleem dat
    // hierboven al voor 'exercises' is opgelost.
    // RC0 (release-audit): de lijst is opnieuw vergeleken met ELKE tabel in de database die
    // een user_id draagt. Er ontbraken er elf. De zwaarste was wearable_connections: die
    // tabel bewaart het access- en refresh-token van de Fitbit-/Google Health-koppeling in
    // leesbare vorm. Die tokens bleven na het verwijderen van een account gewoon staan —
    // in strijd met de privacyverklaring van de app en met de Google Play-eis dat
    // accountverwijdering ALLE gegevens verwijdert. Ook common_data_points (ruwe
    // gezondheidsmetingen) en external_records (onbewerkte wearable-payloads) bleven achter.
    /* v4.50.0 — de opruimlijst en de bijzondere gevallen staan sinds deze versie in
       netlify/functions/_userData.js, zodat delete-account.js en
       cleanup-unverified-accounts.js niet langer twee kopieën onderhouden. Die twee
       kopieën waren uit elkaar gelopen: cleanup stond nog op 16 van de 30 tabellen, met
       wearable_connections (access- én refresh-token) aan de verkeerde kant van dat
       verschil. De inhoud van de lijst is ongewijzigd overgenomen en aangevuld met
       ai_usage (nieuw in v4.50.0). */
    const failedTables = await verwijderGebruikersdata(supabaseUrl, serviceKey, userId);

    // Stap 3: verwijder het account zelf via de Admin API (vereist service_role).
    const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    });
    if (!delRes.ok) {
      const errBody = await delRes.text();
      return { statusCode: delRes.status, body: JSON.stringify({ error: { message: 'Verwijderen mislukt: ' + errBody }, failedTables } ) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, failedTables: failedTables.length ? failedTables : undefined })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};

// v4.49.0 — de handler blijft ongewijzigd; withCors voegt alleen de CORS-headers toe en
// beantwoordt de preflight, zodat de Capacitor-app (https://localhost) deze functie kan bereiken.
exports.handler = withCors(_handler);
