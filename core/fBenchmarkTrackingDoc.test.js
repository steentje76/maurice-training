/* fBenchmarkTrackingDoc.test.js — MS-F4-06 regressietest.
 *
 * Licht, structureel: bevestigt dat het benchmark-trackingdocument bestaat en de
 * kern-differentiators + de eerlijke erkenning van Hevy's voorsprong bevat (geen
 * eenzijdige marketingclaim).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/MS-F4-06_LONGITUDINAL_BENCHMARK_TRACKING.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

ok(doc.includes('Hevy Trainer is expliciet een algoritme, geen AI/LLM'),
  'documenteert het bevestigde feit dat Hevy Trainer een algoritme is, geen AI/LLM (geen overclaim in de andere richting)');
ok(doc.includes('Hevy Trainer gebruikt geen herstelsignalen als programmeer-input'),
  'documenteert het bevestigde TK-differentiator-feit (herstel-/HRV-bewustzijn)');
ok(doc.includes('Bevestigde Hevy-voorsprong, eerlijk erkend'),
  'erkent expliciet een Hevy-voorsprong -- geen eenzijdige, marketing-achtige claim dat TK overal beter is');
ok(doc.includes('Geen automatisch, geplande "benchmark-cronjob"'),
  'bevestigt bewust geen overbouwde infrastructuur voor een P2-documentatie-item (geen architectuur-om-architectuur)');

console.log('fBenchmarkTrackingDoc: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
