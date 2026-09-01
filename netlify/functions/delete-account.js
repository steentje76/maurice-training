// Server-side accountverwijdering — vereist de service_role key, die nooit
// in de browser mag staan. Verifieert eerst dat de meegestuurde sessie
// geldig is en haalt het user-id daar rechtstreeks uit op, zodat een
// gebruiker nooit een ander account dan zijn eigen kan laten verwijderen
// (er wordt bewust geen user-id van de client zelf geaccepteerd).
const { deleteWearableTokenSecret } = require('./wearableTokenVault.js');
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

    // Stap 2: verwijder eerst alle persoonlijke data. De MEESTE van deze
    // tabellen hebben GEEN foreign key met ON DELETE CASCADE naar auth.users.
    // CORRECTIE (MS-F10-01, F10 Baseline Audit): dit bleek GEEN universele
    // waarheid -- coach_athlete_relationships heeft WEL ON DELETE CASCADE op
    // beide user-kolommen (bevestigd via pg_get_constraintdef op de live
    // database), en coach_access_scopes erft dit via een tweede-niveau
    // CASCADE. Beide staan hieronder/verderop ALSNOG expliciet vermeld, voor
    // auditeerbaarheid en omdat deze stap (stap 2) toch al vóór de
    // auth.users-verwijdering (stap 3) draait -- exact het bestaande
    // race_segments-patroon (al CASCADE-afgedekt, hier toch expliciet
    // genoemd). Vertrouw dus NOOIT blind op deze algemene aanname; audit
    // CASCADE-gedrag per tabel voordat je een tabel hier weglaat.
    // Zonder deze stap blijft alle trainingsdata van de gebruiker achter
    // als wees-data na het verwijderen van het account.
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
      'activities',              // B9-01 -- canonical endurance-activiteitenmodel (running/
                                  // cycling/rowing/swimming), ON DELETE CASCADE vanuit auth.users
      'athlete_endurance_profile', // B9-01 -- FTP/threshold-pace/Critical Speed-Power-profiel,
                                  // ON DELETE CASCADE vanuit auth.users
      // LET OP: activity_laps staat BEWUST NIET in deze lijst -- die tabel heeft, anders
      // dan race_segments, GEEN eigen (gedenormaliseerde) user_id-kolom, alleen een FK naar
      // activities.id. Een generieke "DELETE ... WHERE user_id=eq.X" zou hier falen (kolom
      // bestaat niet). activity_laps wordt volledig, aantoonbaar afgedekt via de bestaande
      // ON DELETE CASCADE-keten (activity_laps.activity_id -> activities.id -> activities.
      // user_id -> auth.users.id), live geverifieerd in migratie_v533.sql en bewaakt door
      // core/fB9EnduranceFoundation.test.js (delete-completeness-sectie).
      'memberships',             // lidmaatschap van gym/team/trainingsgroep
      'usage_log',               // gebruik per functie
      'user_credit_purchases',   // aangekochte credits
      // F9 (MS-F9-01/02/03) -- Social & Community. Deze vier hebben een
      // standaard user_id-kolom (zelfde patroon als de rest van deze lijst).
      // De overige F9-tabellen hebben afwijkende/dubbele eigenaarskolommen
      // (follower_id/followee_id, blocker_id/blocked_id, enz.) en worden
      // hieronder apart, expliciet per kolomnaam verwijderd -- exact het
      // bestaande content_shares-patroon, geen nieuw mechanisme.
      'social_profiles', 'social_group_memberships', 'social_challenge_participants'
    ];
    const failedTables = [];
    // F13 Post-Audit Remediation (P1-09): de Vault-secrets zelf hebben
    // geen FK-cascade vanuit wearable_connections -- zonder deze
    // expliciete opruiming zou een versleutelde, maar praktisch
    // onbruikbare "wees"-secret achterblijven na accountverwijdering.
    // Best-effort: een mislukte opruiming hier blokkeert de rest van de
    // accountverwijdering niet (de secret is al versleuteld, geen
    // plaintext-blootstellingsrisico als hij achterblijft).
    try {
      const connRes = await fetch(`${supabaseUrl}/rest/v1/wearable_connections?user_id=eq.${userId}&select=access_token_secret_id,refresh_token_secret_id`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
      });
      const connRows = connRes.ok ? await connRes.json() : [];
      for (const row of connRows) {
        if (row.access_token_secret_id) await deleteWearableTokenSecret(supabaseUrl, serviceKey, row.access_token_secret_id);
        if (row.refresh_token_secret_id) await deleteWearableTokenSecret(supabaseUrl, serviceKey, row.refresh_token_secret_id);
      }
    } catch (e) { console.warn('delete-account: opruimen van wearable Vault-secrets mislukt (best-effort)', e.message); }
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

    // F9 (Social & Community) — bevinding tijdens de F9 Final Integration
    // Audit: deze zes tabellen dragen GEEN standaard user_id-kolom (net als
    // content_shares hierboven), en stonden daardoor nog niet in de generieke
    // USER_DATA_TABLES-lijst. Zonder deze stap blijven o.a. connecties, blocks,
    // reports, groepen/challenges die deze gebruiker aanmaakte, gedeelde
    // activiteiten en notificaties als privacygevoelige wees-data achter.
    // social_groups.owner_user_id/social_challenges.creator_id: het verwijderen
    // van de rij zelf ruimt via ON DELETE CASCADE ook de bijbehorende
    // memberships/participants van ANDEREN op (die al hierboven, apart op hun
    // eigen user_id, verwijderd zijn voor deze gebruiker als lid/deelnemer).
    for (const [tabel, kolommen] of [
      ['social_connections', ['follower_id', 'followee_id']],
      // MS-F10-01 (Coach Consent & Permissions) -- expliciet vermeld voor
      // auditeerbaarheid, ondanks dat deze tabel al via ON DELETE CASCADE
      // wordt opgeruimd zodra stap 3 (auth.users-verwijdering) draait (zie
      // de gecorrigeerde uitleg bovenaan deze functie). coach_access_scopes
      // hoeft hier NIET apart te staan: die heeft geen eigen user-kolom en
      // wordt automatisch via een tweede-niveau CASCADE vanaf
      // coach_athlete_relationships opgeruimd.
      ['coach_athlete_relationships', ['coach_user_id', 'athlete_user_id']],
      // MS-F10-03 (Coach Programming & Assignment) -- zelfde auditeerbaarheids-
      // patroon. Beide hebben al ON DELETE CASCADE naar auth.users (coach_
      // program_templates.coach_user_id; coach_program_assignments.coach_user_id
      // EN .athlete_user_id), dus dit werkt al via stap 3 hieronder -- hier
      // expliciet vermeld voor auditeerbaarheid. Het athlete-owned, gemate-
      // rialiseerde programs-record zelf heeft GEEN FK naar deze tabellen en
      // blijft dus, terecht, intact als de COACH wordt verwijderd -- alleen
      // de provenance-koppeling verdwijnt (live bevestigd: geen FK-pad van
      // programs naar coach_program_assignments/coach_program_templates).
      ['coach_program_templates', ['coach_user_id']],
      ['coach_program_assignments', ['coach_user_id', 'athlete_user_id']],
      // MS-F11-01 (Organization & Location Core) -- organizations.owner_user_id
      // heeft GEEN ON DELETE CASCADE (bevestigd via pg_get_constraintdef) --
      // zonder deze expliciete stap zou het verwijderen van een organisatie-
      // eigenaar's account falen op de foreign-key-constraint, of (als de FK
      // ooit RESTRICT->CASCADE zou wijzigen) wees-organisaties achterlaten.
      // memberships.user_id heeft WEL CASCADE, hier toch expliciet vermeld
      // voor auditeerbaarheid (race_segments-patroon). locations heeft geen
      // eigen user-kolom en wordt automatisch opgeruimd via de bestaande
      // locations.organization_id -> organizations(id) ON DELETE CASCADE
      // zodra de organisatie zelf hieronder wordt verwijderd.
      ['organizations', ['owner_user_id']],
      ['memberships', ['user_id']],
      ['social_blocks', ['blocker_id', 'blocked_id']],
      ['social_reports', ['reporter_user_id', 'target_user_id']],
      ['social_notifications', ['recipient_id', 'actor_id']],
      ['social_groups', ['owner_user_id']],
      ['social_challenges', ['creator_id']],
      ['social_shared_activities', ['athlete_id']],
      // P1-FIX (zelf gevonden bij B9-07-closure-verificatie, migratie_v535):
      // social_comments/social_reactions hebben GEEN foreign-key-CASCADE op
      // user_id naar auth.users (uitsluitend op shared_activity_id) -- als
      // een commentator/reageerder wordt verwijderd terwijl de shared
      // activity van een ander blijft bestaan, zou user_id anders een
      // orphaned verwijzing achterlaten. Expliciet toegevoegd, zelfde
      // patroon als de overige social_*-tabellen hierboven.
      ['social_comments', ['user_id']],
      ['social_reactions', ['user_id']],
      // B9-09: nutrition_entries heeft wel een CASCADE-foreign-key op
      // user_id naar auth.users (net als de meeste andere persoonsgebonden
      // tabellen), maar wordt hier toch expliciet vermeld voor
      // auditeerbaarheid, consistent met het bestaande patroon
      // (bijv. memberships.user_id hierboven).
      ['nutrition_entries', ['user_id']],
      // B9-H2C: alle drie hebben al correcte CASCADE/SET NULL-foreign-
      // keys naar auth.users (live bevestigd via pg_constraint), hier
      // toch expliciet vermeld voor auditeerbaarheid, consistent met
      // het bestaande patroon (bijv. memberships.user_id hierboven).
      // BELANGRIJKE, BEKENDE SEMANTIEK: team_events.created_by heeft
      // ON DELETE CASCADE -- als de maker van een team-event zijn
      // account verwijdert, verdwijnt het hele event (en daarmee de
      // operationele geschiedenis voor de rest van het team). Dit is
      // een bestaande, niet in deze sprint gewijzigde keuze; expliciet
      // gedocumenteerd als bekend aandachtspunt voor een toekomstige
      // sprint (mogelijk: created_by op SET NULL i.p.v. CASCADE, zodat
      // het team-record blijft bestaan zonder een gekoppelde maker).
      ['team_events', ['created_by']],
      ['event_attendance', ['user_id']],
      ['event_responsibilities', ['assigned_user_id']]
    ]) {
      for (const kolom of kolommen) {
        const sfR = await fetch(`${supabaseUrl}/rest/v1/${tabel}?${kolom}=eq.${userId}`, {
          method: 'DELETE',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' }
        });
        if (!sfR.ok) failedTables.push(tabel + ' (' + kolom + ')');
      }
    }

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
