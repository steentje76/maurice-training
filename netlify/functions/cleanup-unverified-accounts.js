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
  'checkin_conditions', 'exercise_favorites', 'hrv_log', 'sessions', 'weight_log'
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
