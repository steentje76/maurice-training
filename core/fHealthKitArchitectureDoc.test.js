/* fHealthKitArchitectureDoc.test.js — MS-F5-04 regressietest.
 *
 * Licht, structureel: bevestigt dat het architectuurdocument bestaat, de kritieke
 * architectuurwet correct vastlegt (geen REST/OAuth-model voor HealthKit), en de
 * HRV-methodologie-nuance expliciet erkent (geen stilzwijgende gelijkstelling).
 * Bevestigt ook dat er GEEN iOS-implementatiecode is toegevoegd (deze sprint is
 * ontwerp-only, conform sectie 56).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/MS-F5-04_APPLE_HEALTHKIT_ARCHITECTURE.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

ok(doc.includes('geen REST-endpoint, geen OAuth-flow, geen server-side token'),
  'documenteert de fundamentele HealthKit-architectuurwet (on-device, geen cloud-API)');
ok(doc.includes('heartRateVariabilitySDNN'),
  'documenteert het officiële, geverifieerde HKQuantityTypeIdentifier voor HRV');
ok(doc.includes('Methodologisch verschil, niet stilzwijgend gelijkstellen'),
  'erkent expliciet de HRV-methodologie-nuance -- geen geforceerde equivalentie');
ok(doc.includes('Geen iOS-code geschreven, geen implementatie voorgewend'),
  'bevestigt expliciet dat dit een ontwerp-only sprint is');

const iosDirExists = fs.existsSync(path.join(ROOT, 'ios'));
ok(iosDirExists === false, 'geen ios/-map toegevoegd -- deze sprint blijft ontwerp-only');

console.log('fHealthKitArchitectureDoc: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
