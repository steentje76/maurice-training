/* fCoachProgramAssignmentGap.test.js — MS-F10-03 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v508.sql'), 'utf8');
const gaps = fs.readFileSync(path.join(ROOT, 'docs/GAP_ANALYSIS_V2.md'), 'utf8');

ok(migratie.includes('drop policy if exists coach_creates_program_for_athlete on public.programs'),
  'A1: de gefaalde policy wordt expliciet verwijderd in de migratie');
ok(!/create policy coach_creates_program_for_athlete/.test(migratie),
  'A2: de gefaalde policy wordt nergens opnieuw aangemaakt in dit bestand');

ok(migratie.includes('coach_program_assignments') && migratie.includes('functioneel nog ONGEBRUIKT'),
  'B1: de provenance-tabel is eerlijk gemarkeerd als nog niet functioneel bruikbaar');

ok(gaps.includes('GAP-P2-023') && gaps.toLowerCase().includes('trg_set_user_id'),
  'C1: de blokkerende bevinding is geregistreerd met de technische root cause');
ok(!/GAP-P2-023[\s\S]{0,50}status.*CLOSED/i.test(gaps),
  'C2: GAP-P2-023 is niet per ongeluk als gesloten gemarkeerd');

console.log('fCoachProgramAssignmentGap: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
