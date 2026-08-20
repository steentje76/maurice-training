/* _userData.js — v4.50.0
 *
 * WAAROM DIT BESTAAT.
 * Twee functies verwijderen alle gegevens van één gebruiker: delete-account.js (op verzoek
 * van de sporter zelf) en cleanup-unverified-accounts.js (de dagelijkse opruiming van
 * accounts die na 30 dagen nog niet bevestigd zijn). Beide hadden hun eigen kopie van de
 * tabellenlijst, met in de code de aantekening "bij wijzigingen aan de een, ook de ander
 * nalopen". Dat is precies gegaan zoals zulke aantekeningen gaan: delete-account groeide
 * naar 30 tabellen, cleanup bleef op 16 staan. Onder de veertien die alleen in
 * delete-account stonden zat `wearable_connections` — de tabel met het OAuth access- én
 * refresh-token van de koppeling. Een niet-bevestigd account werd dus opgeruimd met zijn
 * tokens erin.
 *
 * De aanname dat een gedeelde module niet kon ("dit project heeft geen build-stap voor
 * Netlify Functions") klopte niet: _cors.js wordt sinds v4.49.0 door acht functies
 * geladen. Vandaar deze module — één lijst, twee gebruikers, geen synchronisatie meer.
 *
 * VOLGORDE IS BETEKENISVOL. Tabellen die naar andere verwijzen staan eerst, zodat een
 * foreign key niet in de weg zit.
 */

/* Tabellen met een gewone user_id-kolom. */
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
  'training_instances',      // uitgevoerde sessies met hun voorschrift-snapshot
  'training_context',        // frequentie, locatie, uitrusting, te vermijden oefeningen
  'common_data_points',      // ruwe gezondheids- en prestatiemetingen
  'wearable_connections',    // OAuth access- EN refresh-token van de koppeling
  'wearable_oauth_state',    // lopende koppelpogingen
  'memberships',             // lidmaatschap van gym/team/trainingsgroep
  'usage_log',               // gebruik per functie
  'user_credit_purchases',   // aangekochte credits
  'ai_usage'                 // v4.50.0 — quotumtellers van de AI-coach
];

/* Verwijdert alle gegevens van één gebruiker. Geeft de tabellen terug die niet gelukt
 * zijn, zodat de aanroeper daar eerlijk over kan rapporteren in plaats van te doen alsof
 * alles weg is. */
async function verwijderGebruikersdata(supabaseUrl, serviceKey, userId) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'return=minimal' };
  const mislukt = [];
  const del = async (pad, label) => {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/${pad}`, { method: 'DELETE', headers });
      if (!r.ok) mislukt.push(label || pad);
    } catch (e) { mislukt.push((label || pad) + ' (netwerk)'); }
  };

  for (const tabel of USER_DATA_TABLES) {
    await del(`${tabel}?user_id=eq.${encodeURIComponent(userId)}`, tabel);
  }

  // content_shares: beide richtingen. Zonder de shared_by-tak blijven de deelrecords van
  // een verwijderde gebruiker als wees achter en verwijst gedeelde content bij anderen
  // naar een niet-bestaand account.
  for (const kolom of ['shared_with', 'shared_by']) {
    await del(`content_shares?${kolom}=eq.${encodeURIComponent(userId)}`, `content_shares (${kolom})`);
  }

  // equipment_catalog en exercise_equipment dragen zowel gym_id als user_id. Alleen de
  // PERSOONLIJKE rijen (gym_id leeg) horen bij deze gebruiker; rijen met een gym_id zijn
  // gedeelde gym-inrichting die voor de overige leden moet blijven bestaan.
  for (const tabel of ['equipment_catalog', 'exercise_equipment']) {
    await del(`${tabel}?user_id=eq.${encodeURIComponent(userId)}&gym_id=is.null`, `${tabel} (persoonlijk)`);
  }

  // exercises: de eigenaarskolom heet created_by, en alleen scope='personal' mag echt weg —
  // gym- en global-oefeningen van deze gebruiker blijven bestaan als gedeelde content.
  await del(`exercises?created_by=eq.${encodeURIComponent(userId)}&scope=eq.personal`, 'exercises (personal)');

  // public.users: de gym-lidmaatschapsrij zelf. Primary key is 'id', en er is geen echte
  // foreign key naar auth.users, dus zonder deze stap blijft de gebruiker als "spooklid"
  // in de Team-ledenlijst staan.
  await del(`users?id=eq.${encodeURIComponent(userId)}`, 'users');

  return mislukt;
}

module.exports = { USER_DATA_TABLES, verwijderGebruikersdata };
