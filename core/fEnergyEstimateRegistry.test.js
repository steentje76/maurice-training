/* fEnergyEstimateRegistry.test.js — MS-F3-05 regressietest.
 *
 * Kernbevinding: Trainingskompas berekent zelf geen energieverbruik -- geen MET-tabel,
 * geen BMR/RMR/TDEE-formule. Deze test bewaakt dat dit zo blijft (geen stille introductie
 * van een nieuwe, ongevalideerde energieberekening) en dat de bestaande calorie-/BMR-
 * waarden correct als extern/niet-berekend gelabeld blijven.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const deviceCode = fs.readFileSync(path.join(ROOT, 'core/deviceIntegration.js'), 'utf8');
const registryText = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Geen eigen energieberekening geïntroduceerd (bevestigt de kernbevinding blijft waar) ----
ok(!/function\s+(calculateCalories|estimateCalories|calculateBMR|calculateTDEE|calculateRMR|calculateMET)\s*\(/i.test(html),
  'index.html bevat geen eigen calorie-/BMR-/TDEE-/MET-berekeningsfunctie (blijft bewust NOT_IMPLEMENTED)');
ok(!/function\s+(calculateCalories|estimateCalories|calculateBMR|calculateTDEE|calculateRMR|calculateMET)\s*\(/i.test(fs.readFileSync(path.join(ROOT, 'core/calculation.js'), 'utf8')),
  'core/calculation.js bevat geen eigen calorie-/BMR-/TDEE-/MET-berekeningsfunctie');

// ---- B. calPerMin blijft een triviale, foutloze ratio ----
ok(/calPerMin\s*=\s*\(calories!=null && durationSec\) \? \(calories\/\(durationSec\/60\)\) : null/.test(html),
  'calPerMin blijft de exacte, triviale ratio-formule (calories/(duration/60)) -- geen verborgen aanpassingsfactor toegevoegd');

// ---- C. BMR blijft expliciet gelabeld als "ingevoerd" (extern), niet als TK-berekening ----
ok(/soort:'ingevoerd'/.test(html), 'BMR-weergave blijft expliciet gelabeld als "ingevoerd" (extern/Tanita), niet als TK-eigen berekening');

// ---- D. Wearable-calorieën blijven eerlijk "OPTIONAL/nog niet gevalideerd", geen voortijdige claim ----
ok(/calories:\s*{ status: 'OPTIONAL',\s*unit: 'kcal',\s*note: 'dagcalorieën — nog niet gemapt\/gevalideerd' }/.test(deviceCode),
  'wearable-dagcalorieën blijven eerlijk gelabeld als niet-gevalideerd -- geen voortijdige precisieclaim geïntroduceerd');

// ---- E. Registry-structuur ----
const items = registryText.split(/(?=^### CALC-ENE-)/m).filter(s => s.startsWith('### CALC-ENE-'));
ok(items.length === 4, 'exact 4 CALC-ENE-items gevonden (001 t/m 004)');

{
  const bmr = items.find(i => i.startsWith('### CALC-ENE-004'));
  ok(bmr && /\*\*NOT_IMPLEMENTED/.test(bmr), 'CALC-ENE-004 (BMR/RMR/TDEE) is expliciet NOT_IMPLEMENTED, geen willekeurig gekozen formule');
  ok(bmr && /PRODUCT_DECISION_REQUIRED/.test(bmr), 'CALC-ENE-004 registreert correct dat een methodekeuze een productbeslissing vereist, geen fabricage');

  const manual = items.find(i => i.startsWith('### CALC-ENE-002'));
  ok(manual && /USER_REPORTED/.test(manual), 'CALC-ENE-002 is correct gelabeld als USER_REPORTED');

  const wearable = items.find(i => i.startsWith('### CALC-ENE-003'));
  ok(wearable && /WEARABLE_ESTIMATE/.test(wearable), 'CALC-ENE-003 is correct gelabeld als WEARABLE_ESTIMATE');
}

console.log('fEnergyEstimateRegistry: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
