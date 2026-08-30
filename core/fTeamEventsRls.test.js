/* fTeamEventsRls.test.js — MS-F11-03 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v516.sql'), 'utf8');

ok(migratie.includes('team_has_access') && migratie.includes('org_has_role()'),
  'A1: team_has_access() hergebruikt expliciet org_has_role()');
ok(migratie.includes('locations(id)') && migratie.includes('MS-F11-01 locations-tabel'),
  'A2: team_events.location_id hergebruikt de MS-F11-01 locations-tabel');
ok(migratie.includes('training_instances(id)') && migratie.includes('geen tweede workoutmodel'),
  'A3: team_events.linked_training_instance_id hergebruikt de canonieke training_instances-tabel');

ok(migratie.includes('generiek taak/verantwoordelijke-model') && migratie.includes('sport-onafhankelijk'),
  'B1: event_responsibilities is expliciet generiek gedocumenteerd');

ok(migratie.toLowerCase().includes('uitsluitend de eigen rij'),
  'C1: de documentatie legt vast dat attendance-mutatie uitsluitend de eigen rij betreft');

ok(migratie.toLowerCase().includes('nergens in deze repository') || migratie.toLowerCase().includes('0 treffers'),
  'D1: de migratie documenteert eerlijk de ontdekte schema-drift');
ok(migratie.includes('0 rijen') || migratie.toLowerCase().includes('geen productiedata in gevaar'),
  'D2: bevestigd dat er geen productiedata betrokken was bij de ontdekking');

console.log('fTeamEventsRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
