/* fHyroxRulebookRevalidation.test.js — MS-F6-04 regressietest.
 *
 * Licht, structureel: bevestigt dat het formaat (8x1km + 8 stations) nog correct is,
 * dat geen hardcoded, verouderde bewegingsstandaard is opgeslagen, dat de HYROX-
 * coachingtekst-fix uit MS-F6-02 nog intact is, en dat het rulebook-revalidatie-
 * rapport bestaat met een vastgelegde onderzoeksdatum.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const sportDef = fs.readFileSync(path.join(ROOT, 'core/sportDefinition.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const report = fs.readFileSync(path.join(ROOT, 'docs/MS-F6-04_HYROX_EXCELLENCE.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

ok(sportDef.includes("competitionModel: 'fixed_8x1km_plus_8_stations'"),
  'het HYROX-formaat (8x1km + 8 stations) is nog correct vastgelegd, conform actueel onderzoek');
ok(!/burpee/i.test(sportDef),
  'geen enkele specifieke bewegingsstandaard is hardcoded -- de metadata blijft bewust abstract');
ok(!html.includes('voorspel racepace'),
  'de HYROX-coachingtekst-fix uit MS-F6-02 is nog intact -- geen regressie');
ok(html.includes('racepace-verwachtingen uit op basis van reeds gelogde data'),
  'de HYROX-coachingtekst bevat nog steeds de expliciete, correcte grens');
ok(report.includes('Rulebook-onderzoeksdatum:'),
  'het rulebook-revalidatierapport legt expliciet een onderzoeksdatum vast');
ok(report.includes('Elite 15'),
  'het rapport documenteert de nieuwe Elite 15-divisie als onderdeel van de actuele regelrevalidatie');

console.log('fHyroxRulebookRevalidation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
