/* fIosFeasibilityIntegrity.test.js — MS-F13-06 regressietest.
 * Bewaakt dat geen kunstmatige, halve iOS-structuur wordt toegevoegd
 * zonder een echte, verantwoorde reden (conform de expliciete eis
 * "bouw niet kunstmatig een halve iOS-app uitsluitend om een vinkje
 * te zetten").
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

ok(!Object.keys(pkg.dependencies || {}).includes('@capacitor/ios'),
  'A1: geen @capacitor/ios-dependency toegevoegd zonder een daadwerkelijk werkend, gevalideerd iOS-buildproces (MS-F13-06: research-only, geen implementatie)');
ok(!fs.existsSync(path.join(ROOT, 'ios')),
  'A2: geen ios/-map aanwezig (zou een niet-gecompileerde, nooit-geteste projectstructuur zijn)');

const doc = fs.readFileSync(path.join(ROOT, 'docs/MS-F13-06_IOS_FEASIBILITY_RESEARCH.md'), 'utf8');
ok(doc.includes('SOFTWARE RESEARCH COMPLETE'), 'B1: de feasibility-status is eerlijk vastgelegd als research-only, niet als geïmplementeerd');
ok(doc.includes('iOS TIMING PRODUCT DECISION BLIJFT OPEN'), 'B2: de open Product Owner-beslissing wordt niet stilzwijgend als afgehandeld beschouwd');

console.log('fIosFeasibilityIntegrity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
