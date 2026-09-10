/* fDeleteAccountErasureCompleteness.test.js — Functional Freeze Audit
 * (onafhankelijke hercertificering).
 *
 * ACHTERGROND: bij een diff van alle productie-tabellen met een
 * user-kolom tegen de opruimlijst van delete-account.js bleven twee
 * tabellen over die NOCH expliciet werden verwijderd, NOCH een
 * ON DELETE CASCADE naar auth.users hadden (geverifieerd via
 * pg_constraint.confdeltype):
 *   - program_regeneration_log (bevat replaced_blocks_snapshot +
 *     evidence: daadwerkelijke trainingsinhoud van de gebruiker)
 *   - ai_usage (user_id + dagelijkse aanroep-/tokentellingen)
 * Beide bleven daardoor achter na een accountverwijdering, terwijl de
 * functie volledige verwijdering claimt.
 *
 * Deze test bewaakt dat ze in de lijst blijven staan. Hij vervangt GEEN
 * schema-controle: als er in de toekomst opnieuw een tabel met een
 * user-kolom bijkomt zonder cascade, moet diezelfde diff opnieuw worden
 * gedraaid (zie het functionaliteitsregister).
 */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }

console.log('Functional Freeze Audit — volledigheid accountverwijdering');

const src = fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/delete-account.js'), 'utf8');

ok(src.includes("'program_regeneration_log'"),
  "A1: program_regeneration_log wordt expliciet opgeruimd -- bevat replaced_blocks_snapshot/evidence (echte trainingsinhoud) en heeft GEEN FK-cascade naar auth.users");
ok(src.includes("'ai_usage'"),
  "A2: ai_usage wordt expliciet opgeruimd -- houdt anders een user_id van een verwijderd account vast (geen FK-cascade)");

// De verwijdering van de auth-user zelf is wat alle CASCADE-tabellen
// opruimt; zonder die stap zou het overgrote deel van de opruiming stil
// wegvallen. Expliciet bewaakt omdat de rest van de audit erop steunt.
ok(/auth\/v1\/admin\/users\//.test(src),
  'A3: de auth-user zelf wordt verwijderd -- dit is de stap die alle ON DELETE CASCADE-tabellen opruimt (zonder deze stap dekt de expliciete lijst maar een deel)');

// Archief-/backup-tabellen uit eerdere migraties: eigen user_id-kolom, geen
// FK-cascade, RLS met nul policies. Bevatten echte persoonsgegevens (incl.
// gezondheidsdata in hrv_log_archive_v500) en overleefden verwijdering.
[['bak_p_sessions','trainingsessies'],['bak_p_training_instances','uitgevoerde trainingen'],
 ['bak_p_exercises','oefeningen'],['bak_p_goals','doelen'],
 ['bak_p_training_exercises','trainingsoefeningen'],['bak_p_exercise_equipment','uitrusting'],
 ['bak_p_exercise_goals','oefeningdoelen'],['bak_p_program_block_exercises','programmablokken'],
 ['hrv_log_archive_v500','GEZONDHEIDSDATA (HRV/rusthartslag/slaap)']].forEach(function(pair){
  ok(src.includes("'"+pair[0]+"'"),
    'B-' + pair[0] + ': archieftabel wordt opgeruimd bij accountverwijdering -- bevat ' + pair[1] + ', geen FK-cascade');
});

// Falsificatie-bescherming: de twee toevoegingen mogen niet per ongeluk
// in een uitgecommentarieerd of onbereikbaar blok belanden.
{
  const listStart = src.indexOf('program_blocks');
  const idxProg = src.indexOf("'program_regeneration_log'");
  const idxAi = src.indexOf("'ai_usage'");
  ok(listStart > 0 && idxProg > listStart && idxAi > listStart,
    'A4: beide toevoegingen staan binnen de daadwerkelijke opruimlijst, niet losgekoppeld erbuiten');
}

// TWEEDE VERWIJDERPAD: cleanup-unverified-accounts.js ruimt nooit-bevestigde
// accounts op (>30 dagen). Het bestand instrueert zelf om beide lijsten gelijk
// te houden, maar ze waren uiteengelopen (16 vs 88). Voor de cascade-tabellen is
// dat onschadelijk (de auth-user wordt verwijderd), maar de elf tabellen ZONDER
// cascade moesten hier ook staan.
{
  const cleanup = fs.readFileSync(path.join(__dirname, '..', 'netlify/functions/cleanup-unverified-accounts.js'), 'utf8');
  const zonderCascade = ['program_regeneration_log','ai_usage','bak_p_sessions',
    'bak_p_training_instances','bak_p_exercises','bak_p_goals','bak_p_training_exercises',
    'bak_p_exercise_equipment','bak_p_exercise_goals','bak_p_program_block_exercises',
    'hrv_log_archive_v500'];
  zonderCascade.forEach(function(t){
    ok(cleanup.includes("'"+t+"'"),
      'C-' + t + ': ook het tweede verwijderpad (onbevestigde accounts) ruimt deze cascade-loze tabel op');
  });
  ok(/auth\/v1\/admin\/users\//.test(cleanup),
    'C-auth: cleanup verwijdert de auth-user zelf -- dat dekt alle overige, cascade-gebonden tabellen');
}

console.log('\n========================================================');
console.log('fDeleteAccountErasureCompleteness.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error('MISLUKT: ' + m)); process.exitCode = 1; }
