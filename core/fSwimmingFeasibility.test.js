/* fSwimmingFeasibility.test.js — MS-F6-06 regressietest.
 *
 * Docs/research-only sprint: uitsluitend structurele tests die bestaande garanties
 * beschermen, geen nep-unittests voor niet-bestaande zwemfunctionaliteit.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const calcRegistry = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8');
const report = fs.readFileSync(path.join(ROOT, 'docs/MS-F6-06_SWIMMING_FEASIBILITY_ASSESSMENT.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Generieke swimming-cardio-ondersteuning blijft bestaan ----
ok(html.includes("swimming: {") && html.includes("splitUnit:'/100m'") && html.includes("derivePaceSec:true"),
  'A1: CARDIO_TYPES.swimming blijft aanwezig, ongewijzigd door deze feasibility-sprint');

// ---- B. CSS-AI-boundary-tekst (MS-F6-02) blijft intact ----
ok(!html.includes('Herbereken CSS'),
  'B1: de zwem-coachingtekst instrueert de AI nog steeds niet om CSS te herberekenen');
ok(html.includes('AI berekent of herberekent CSS zelf nooit'),
  'B2: de expliciete CSS-grens uit MS-F6-02 staat nog correct');

// ---- C. Geen fictieve SWOLF/CSS-registratie als geïmplementeerd ----
ok(!/SWOLF[\s\S]{0,80}GEÏMPLEMENTEERD/i.test(calcRegistry) && !/critical.swim.speed[\s\S]{0,80}GEÏMPLEMENTEERD/i.test(calcRegistry),
  'C1: geen SWOLF- of CSS-calculation staat geregistreerd als GEÏMPLEMENTEERD');

// ---- D. Het rapport bevat de vereiste, expliciete feasibility-classificatie ----
ok(report.includes('FEASIBILITY DECISION:') && report.includes('PARTIAL -- PROVIDER DEPENDENCIES OPEN'),
  'D1: het rapport bevat een expliciete, toegestane feasibility-beslissing');
ok(report.includes('SPRINT CLOSED') && report.includes('swimming-feature zelf blijft terecht NOT_IMPLEMENTED'),
  'D2: het rapport onderscheidt expliciet "sprint gesloten" van "feature geïmplementeerd"');

console.log('fSwimmingFeasibility: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
