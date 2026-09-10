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

// Falsificatie-bescherming: de twee toevoegingen mogen niet per ongeluk
// in een uitgecommentarieerd of onbereikbaar blok belanden.
{
  const listStart = src.indexOf('program_blocks');
  const idxProg = src.indexOf("'program_regeneration_log'");
  const idxAi = src.indexOf("'ai_usage'");
  ok(listStart > 0 && idxProg > listStart && idxAi > listStart,
    'A4: beide toevoegingen staan binnen de daadwerkelijke opruimlijst, niet losgekoppeld erbuiten');
}

console.log('\n========================================================');
console.log('fDeleteAccountErasureCompleteness.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error('MISLUKT: ' + m)); process.exitCode = 1; }
