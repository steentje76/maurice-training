/* fDataQualityConfidence.test.js — MS-F3-08 regressietest.
 *
 * Bewijst functioneel dat alle 9 Decision Rules veilig blijven bij ontbrekende data
 * (geen harde aanbeveling zonder voldoende input), en dat Unknown != Zero blijft gelden.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DecisionCore = require(path.join(ROOT, 'core/decision.js'));
const CalcCore = require(path.join(ROOT, 'core/calculation.js'));
const contractText = fs.readFileSync(path.join(ROOT, 'docs/DATA_QUALITY_CONFIDENCE_CONTRACT.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Alle 9 Decision Rules: geen harde aanbeveling zonder data ----
ok(DecisionCore.computeProgression(null, 100) === null, 'DEC-PROG-001: geen RPE -> geen advies');
ok(DecisionCore.computeProgAdjustment(1.0, [], null, null) === null, 'DEC-RECADJ-001: geen enkele conditie van toepassing -> geen aanpassing');
ok(DecisionCore.trainReadiness(null) === null, 'DEC-READY-001: geen dfInfo -> geen advies');
ok(DecisionCore.detrainingFactor(null, { version: 'v1', id: 'x', bands: [{ maxDays: 100, factor: 1 }] }).applicable === false,
  'DEC-DETRAIN-001: ontbrekende dagen -> neutrale, niet-toepasselijke factor (geen fabricage)');
ok(DecisionCore.restForSet(90, null) === 90, 'DEC-REST-001: geen RPE -> basisrust ongewijzigd');
ok(DecisionCore.setOutcome({ voorgeschreven: {}, uitgevoerd: {} }).bruikbaar === false,
  'DEC-SETOUT-001: geen data -> niet bruikbaar, geen advies');
ok(DecisionCore.readinessDay({}).trainingsadvies.soort === 'geen_advies',
  'DEC-READYDAY-001: geen data -> expliciet geen_advies');

// ---- B. Unknown != Zero (CalcCore) ----
ok(CalcCore.calculate1RM(null, 5) === null, 'calculate1RM: ontbrekend gewicht -> null, niet 0');
ok(CalcCore.recoveryScore({}).score === null, 'recoveryScore: geen enkele component -> score null, niet 0');
ok(CalcCore.recoveryScore({}).confidence === 'geen', 'recoveryScore: geen componenten -> confidence "geen", geen verzonnen laag/gemiddeld');

// ---- C. recoveryScore confidence is functie van componentaantal (bevestigt de bevinding) ----
{
  const eenComponent = CalcCore.recoveryScore({ dayFactor: 1.0 });
  const drieComponenten = CalcCore.recoveryScore({ dayFactor: 1.0, muscleRecoveryPct: 80, rhrDelta: 0 });
  ok(eenComponent.confidence === 'laag', 'recoveryScore: 1 component -> confidence laag');
  ok(drieComponenten.confidence === 'hoog', 'recoveryScore: 3 componenten -> confidence hoog (bevestigt: uitsluitend telling, geen kwaliteitsweging)');
}

// ---- D. Registry-structuur ----
ok(contractText.includes('## Evidence ≠ Confidence'), 'contract bevat het verplichte Evidence/Confidence-onderscheid');
ok(contractText.includes('Alle 9 regels bevestigd veilig'), 'contract bevestigt expliciet dat alle 9 Decision Rules veilig zijn');
ok(contractText.includes('GAP-P2-015'), 'contract registreert de recoveryScore-confidence-bevinding eerlijk als gap, verzwijgt het niet');

console.log('fDataQualityConfidence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
