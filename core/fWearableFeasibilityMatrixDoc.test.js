/* fWearableFeasibilityMatrixDoc.test.js — MS-F5-05 regressietest.
 *
 * Licht, structureel: bevestigt dat het feasibility-rapport alle 5 verplichte
 * providers behandelt, alle 8 verplichte scoredimensies bevat, en expliciet geen
 * commerciële/contractuele beslissing neemt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/MS-F5-05_WEARABLE_PROVIDER_FEASIBILITY_MATRIX.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

['Garmin', 'Polar', 'WHOOP', 'Suunto', 'COROS'].forEach(provider => {
  ok(doc.includes(provider), 'behandelt de verplichte provider: ' + provider);
});

['Technical', 'Access', 'Athlete value', 'Data uniqueness', 'Overlap', 'Implementation effort', 'Maintenance', 'Privacy complexity'].forEach(dim => {
  ok(doc.includes(dim), 'bevat de verplichte scoredimensie: ' + dim);
});

ok(doc.includes('geen contracten getekend, geen betaalde aanvragen ingediend'),
  'bevestigt expliciet: geen commerciële/contractuele beslissing genomen');
ok(doc.includes('geen aanname uit training'),
  'bevestigt dat het onderzoek actueel en gericht was, niet uit trainingsdata aangenomen');
ok(doc.includes('Nadrukkelijk NIET gedaan') && doc.includes('reverse-engineering'),
  'bevestigt expliciet dat geen reverse-engineering/scraping is toegepast');

const decisions = fs.readFileSync(path.join(ROOT, 'docs/F5_PRODUCT_OWNER_DECISIONS.md'), 'utf8');
ok(decisions.includes('Beslissing 2') && decisions.includes('Garmin'),
  'de Garmin-toegangsbarrière is vastgelegd als een apart, niet-blokkerend besluitpunt');

console.log('fWearableFeasibilityMatrixDoc: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
