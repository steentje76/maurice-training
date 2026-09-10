// Geplande achtergrondtaak (zie netlify.toml — draait @daily) die accounts verwijdert
// die na 30 dagen hun e-mailadres nog steeds niet bevestigd hebben. Draait als
// service_role, zonder JWT (geen ingelogde gebruiker die dit aanvraagt — dit is een
// achtergrondtaak, geen user-actie), dus GEEN JWT-verificatiestap zoals in
// delete-account.js. In plaats daarvan bepaalt de query zelf (email_confirmed_at IS
// NULL + ouder dan 30 dagen) wie in aanmerking komt — nooit input van buitenaf.
//
// Zelfde opruim-volgorde/tabellenlijst als delete-account.js (bewust gedupliceerd,
// niet gedeeld via een module — dit project heeft geen build-stap voor Netlify
// Functions, dus geen gedeelde imports tussen functiebestanden). Bij wijzigingen aan
// de een, ook de ander nalopen.
const USER_DATA_TABLES = [
  'program_block_exercises', 'custom_training_exercises', 'training_exercises',
  'program_blocks', 'custom_trainings', 'vaste_trainingen', 'programs',
  'athlete_conditions', 'atleet_profiel', 'body_comp', 'chat_history',
  'checkin_conditions', 'exercise_favorites', 'hrv_log', 'sessions', 'weight_log',
  // FUNCTIONAL FREEZE AUDIT: de bovenstaande lijst was in de loop van de tijd
  // uiteengelopen met die in delete-account.js (16 vs 88 entries), ondanks de
  // instructie hierboven om beide gelijk te houden. Dat is voor het overgrote
  // deel ONSCHADELIJK: deze functie verwijdert de auth-user zelf (zie hieronder),
  // en verreweg de meeste gebruikerstabellen hebben ON DELETE CASCADE naar
  // auth.users en worden daardoor sowieso opgeruimd.
  // De echte restrisico's zijn uitsluitend de tabellen met een eigen user_id
  // maar ZONDER FK-cascade -- exact dezelfde elf die in delete-account.js zijn
  // toegevoegd (PR #316/#317). Zonder deze regels zouden ze bij een
  // opgeruimd, nooit-bevestigd account achterblijven.
  // Live geverifieerd ten tijde van deze audit: 0 onbevestigde accounts en 0
  // bijbehorende rijen, dus er is nu geen data-impact -- dit sluit een LATENT
  // gat, geen actueel lek.
  'program_regeneration_log', 'ai_usage',
  'bak_p_sessions', 'bak_p_training_instances', 'bak_p_exercises', 'bak_p_goals',
  'bak_p_training_exercises', 'bak_p_exercise_equipment', 'bak_p_exercise_goals',
  'bak_p_program_block_exercises', 'hrv_log_archive_v500'
];

exports.handler = async function () {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('cleanup-unverified-accounts: SUPABASE_SERVICE_ROLE_KEY niet ingesteld');
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld' }) };
  }
  const sbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // public.users heeft sinds migratie v334 een email_confirmed_at-spiegelkolom —
    // NULL betekent nooit bevestigd. created_at is het registratiemoment.
    const staleRes = await fetch(
      `${supabaseUrl}/rest/v1/users?email_confirmed_at=is.null&created_at=lt.${cutoff}&select=id,email`,
      { headers: sbHeaders }
    );
    if (!staleRes.ok) {
      const err = await staleRes.text();
      console.error('cleanup-unverified-accounts: kon stale users niet ophalen', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Kon accounts niet ophalen: ' + err }) };
    }
    const stale = await staleRes.json();

    const results = [];
    for (const u of stale) {
      const failedTables = [];
      for (const table of USER_DATA_TABLES) {
        const r = await fetch(`${supabaseUrl}/rest/v1/${table}?user_id=eq.${u.id}`, {
          method: 'DELETE',
          headers: { ...sbHeaders, Prefer: 'return=minimal' }
        });
        if (!r.ok) failedTables.push(table);
      }
      const exR = await fetch(`${supabaseUrl}/rest/v1/exercises?created_by=eq.${u.id}&scope=eq.personal`, {
        method: 'DELETE', headers: { ...sbHeaders, Prefer: 'return=minimal' }
      });
      if (!exR.ok) failedTables.push('exercises (personal)');

      const usersR = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${u.id}`, {
        method: 'DELETE', headers: { ...sbHeaders, Prefer: 'return=minimal' }
      });
      if (!usersR.ok) failedTables.push('users');

      const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
      });

      results.push({ id: u.id, email: u.email, deleted: delRes.ok, failedTables: failedTables.length ? failedTables : undefined });
    }

    console.log(`cleanup-unverified-accounts: ${results.length} account(s) verwerkt`, results);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ processed: results.length, results }) };
  } catch (e) {
    console.error('cleanup-unverified-accounts exception', e);
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
