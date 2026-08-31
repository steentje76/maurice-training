/* fAiPromptNumericBoundary.test.js — F13 Post-Audit Remediation P1-03.
 * Bewaakt dat de client-side system-promptopbouw (buildCtx()) de AI
 * nooit instrueert om zelfstandig een gewicht te verzinnen -- alleen
 * om een reeds door de Calculation/Decision Engine berekende waarde
 * te gebruiken.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

ok(!html.match(/Geef\s+altijd\s+een\s+concreet\s+gewicht\s+als\s+advies/i),
  'A1: de onvoorwaardelijke instructie "Geef altijd een concreet gewicht als advies" bestaat niet meer');
ok(html.includes('verzin') && html.match(/zelf\s+NOOIT\s+een\s+getal/i),
  'A2: de prompt bevat een expliciet verbod om zelf een getal te verzinnen zonder engine-context');
ok(html.match(/Calculation\/Decision Engine berekende waarde/i),
  'A3: de prompt verwijst expliciet naar een reeds door de engine berekende waarde als voorwaarde voor een gewichtsadvies');

console.log('fAiPromptNumericBoundary: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
