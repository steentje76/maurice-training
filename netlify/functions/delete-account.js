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
    const USER_DATA_TABLES = [
      // eerst tabellen die naar andere tabellen hieronder kunnen verwijzen
      'program_block_exercises', 'custom_training_exercises', 'training_exercises',
      'external_records',                       // verwijst naar external_connections
      // dan de tabellen waar die mogelijk naar verwijzen
      'program_blocks', 'custom_trainings', 'vaste_trainingen', 'programs',
      'external_connections',
      // overige, op zichzelf staande gebruikersdata
      'athlete_conditions', 'atleet_profiel', 'body_comp', 'chat_history',
      'checkin_conditions', 'exercise_favorites', 'hrv_log', 'sessions', 'weight_log',
      'goals', 'equipment_types', 'exercise_goals',
      'cycle_periods',            // v4.51.0 — cyclustracking-MVP (RAW DATA, geen FK-cascade)
      'cycle_symptom_logs',       // v4.52.0 — PMS/symptoomregistratie (RAW DATA, geen FK-cascade)
      // RC0-aanvulling
      'training_instances',      // uitgevoerde sessies met hun voorschrift-snapshot
      'training_context',        // frequentie, locatie, uitrusting, te vermijden oefeningen
      'common_data_points',      // ruwe gezondheids- en prestatiemetingen
      'wearable_connections',    // OAuth access- EN refresh-token van de koppeling
      'wearable_oauth_state',    // lopende koppelpogingen
      'race_segments',           // HYROX/Triathlon-brick-segmenten (v4.91.0) — al veilig
                                  // afgedekt via ON DELETE CASCADE vanuit training_instances,
                                  // hier expliciet vermeld voor auditeerbaarheid (DEC-027)
      'memberships',             // lidmaatschap van gym/team/trainingsgroep
      'usage_log',               // gebruik per functie
      'user_credit_purchases'    // aangekochte credits
    ];
    const failedTables = [];
    for (const table of USER_DATA_TABLES) {
      const r = await fetch(`${supabaseUrl}/rest/v1/${table}?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
      });
      if (!r.ok) failedTables.push(table);
    }

    // content_shares: beide richtingen. v5.8.4 liet de DELENDE kant bewust open omdat de
    // kolomnaam toen niet met zekerheid uit de front-end af te leiden was. RC0 heeft het
    // schema rechtstreeks opgevraagd: de kolommen heten shared_by en shared_with. Zonder de
    // shared_by-tak bleven de deelrecords van een verwijderde gebruiker als wees achter en
    // bleef gedeelde content bij anderen naar een niet-bestaand account verwijzen.
    for (const kolom of ['shared_with', 'shared_by']) {
      const csR = await fetch(`${supabaseUrl}/rest/v1/content_shares?${kolom}=eq.${userId}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
      });
      if (!csR.ok) failedTables.push('content_shares (' + kolom + ')');
    }

    // equipment_catalog en exercise_equipment dragen zowel gym_id als user_id. Alleen de
    // PERSOONLIJKE rijen (gym_id leeg) horen bij deze gebruiker; rijen met een gym_id zijn
    // gedeelde gym-inrichting die voor de overige leden moet blijven bestaan. Daarom hier
    // expliciet met een gym_id-filter en niet in de tabellenlijst hierboven.
    for (const tabel of ['equipment_catalog', 'exercise_equipment']) {
      const eqR = await fetch(`${supabaseUrl}/rest/v1/${tabel}?user_id=eq.${userId}&gym_id=is.null`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
      });
      if (!eqR.ok) failedTables.push(tabel + ' (persoonlijk)');
    }

    // exercises: aparte behandeling, want (a) de eigenaarskolom heet created_by, niet
    // user_id zoals de rest, en (b) alleen scope='personal' mag echt weg — gym/global-
    // oefeningen van deze gebruiker blijven bestaan (gedeelde content voor anderen),
    // created_by wordt daar automatisch NULL via ON DELETE SET NULL zodra het account
    // hieronder (stap 3) verwijderd wordt. Zonder deze stap blijven persoonlijke
    // oefeningen achter als onzichtbare rijen (created_by=NULL matcht geen enkele RLS-
    // policy meer, dus niemand kan ze ooit nog zien of opruimen).
    const exR = await fetch(`${supabaseUrl}/rest/v1/exercises?created_by=eq.${userId}&scope=eq.personal`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    if (!exR.ok) failedTables.push('exercises (personal)');

    // public.users: aparte behandeling — dit is de gym-lidmaatschapsrij zelf (rol,
    // gym_id), primary key is 'id' (niet 'user_id' zoals de rest). Er bestaat GEEN
    // echte foreign key/cascade naar auth.users (users.id is text, auth.users.id is
    // uuid — geen automatische opruiming), dus zonder deze stap blijft de gebruiker
    // na verwijdering als "spooklid" in de Team-ledenlijst van de gym staan.
    const usersR = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
    });
    if (!usersR.ok) failedTables.push('users');

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
