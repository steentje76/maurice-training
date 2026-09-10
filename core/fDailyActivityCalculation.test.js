/* fDailyActivityCalculation.test.js — DEVICES/WEARABLES MASTER SPRINT.
 * Bewaakt: UNKNOWN != ZERO (dagen zonder bekende waarde tellen niet mee),
 * geen vaste "20.000 = rood"-grens (relatief aan de EIGEN baseline), geen
 * causale/medische claims in de athlete-facing tekst, en exact het PO-
 * voorbeeldscenario uit de opdracht.
 */
'use strict';
const assert = require('assert');
const DailyActivityCalculationCore = require('../core/dailyActivityCalculation.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.error('MISLUKT: ' + label); } }

console.log('DEVICES/WEARABLES MASTER SPRINT — Daily Activity Calculation (stappen-baseline)');

function reeks(waarden) {
  return waarden.map((s, i) => ({ date: '2026-08-' + String(i + 1).padStart(2, '0'), steps: s }));
}

// ---- A. Baseline: te weinig data ----
{
  const r = DailyActivityCalculationCore.dailyStepsBaseline(reeks([7000, 7200, 6900]));
  ok(r.status === 'INSUFFICIENT_DATA' && r.sampleSize === 3, 'A1: minder dan 7 bekende dagen -> INSUFFICIENT_DATA (geen baseline forceren op te weinig data)');
}

// ---- B. UNKNOWN != ZERO: dagen zonder bekende waarde tellen niet mee ----
{
  const dagen = reeks([7000, 7200, 6900, 7100, 7300, 7050, 6950, 7150]);
  dagen.push({ date: '2026-08-09', steps: null }); // onbekende dag, moet genegeerd worden
  dagen.push({ date: '2026-08-10', steps: undefined });
  const r = DailyActivityCalculationCore.dailyStepsBaseline(dagen);
  ok(r.status === 'OK' && r.sampleSize === 8, 'B1: null/undefined-dagen worden genegeerd, tellen niet mee als 0 en niet mee in sampleSize');
}

// ---- C. Mediaan i.p.v. gemiddelde: robuust tegen een incidentele uitschieter ----
{
  const dagen = reeks([7000, 7000, 7000, 7000, 7000, 7000, 40000]); // één marathon-achtige dag
  const r = DailyActivityCalculationCore.dailyStepsBaseline(dagen);
  ok(r.status === 'OK' && r.baselineSteps === 7000, 'C1: mediaan trekt niet mee met één extreme dag (gemiddelde zou hier >11.000 zijn geweest)');
}

// ---- D. Exact het PO-voorbeeldscenario (sectie 4 van de opdracht) ----
{
  const dagen = reeks([7400, 7350, 7420, 7380, 7410, 7395, 7405]); // stabiel rond 7400
  const baseline = DailyActivityCalculationCore.dailyStepsBaseline(dagen);
  ok(baseline.status === 'OK' && baseline.baselineSteps === 7400, 'D1: baseline komt overeen met de stabiele ~7.400/dag uit het PO-voorbeeld');
  const deviation = DailyActivityCalculationCore.dailyStepsDeviation(20316, baseline);
  ok(deviation.status === 'OK' && deviation.classification === 'well_above_baseline',
    'D2: 20.316 stappen t.o.v. baseline 7.400 wordt geclassificeerd als well_above_baseline (~174% afwijking)');
  const tekst = DailyActivityCalculationCore.contextText(deviation);
  ok(!tekst.match(/vermoeidheid|herstel|blessure|slecht|risico|minder trainen|moet/i),
    'D3: de athlete-facing tekst bevat GEEN causale/medische claim (sectie 8/19: "extra context", niet "daarom...")');
  ok(tekst.includes('gebruikelijke niveau'), 'D4: de tekst is beschrijvend en verwijst naar het eigen gebruikelijke niveau, geen bevolkingsnorm');
}

// ---- E. Geen vaste "20.000 = rood"-grens: dezelfde 20.316 stappen bij een andere baseline geeft een andere classificatie ----
{
  const hogeBaselineDagen = reeks([18000, 19000, 20500, 19500, 20000, 19800, 18700]); // actieve sporter, baseline al hoog
  const baseline = DailyActivityCalculationCore.dailyStepsBaseline(hogeBaselineDagen);
  const deviation = DailyActivityCalculationCore.dailyStepsDeviation(20316, baseline);
  ok(deviation.classification === 'within_baseline',
    'E1: exact dezelfde 20.316 stappen valt "within_baseline" bij een sporter die dat al gewend is -- geen vaste, universele grens (sectie 5, expliciet verboden: "20.000 stappen = rood")');
}

// ---- F. Nooit een geraden waarde bij ontbrekende input ----
ok(DailyActivityCalculationCore.dailyStepsDeviation(null, { status: 'OK', baselineSteps: 7000 }).status === 'INSUFFICIENT_INPUT',
  'F1: todaySteps=null geeft INSUFFICIENT_INPUT, nooit een berekening alsof het 0 was');
ok(DailyActivityCalculationCore.dailyStepsDeviation(8000, { status: 'INSUFFICIENT_DATA' }).status === 'NO_BASELINE',
  'F2: geen geldige baseline -> NO_BASELINE, geen afwijkingsclaim zonder referentiepunt');
ok(DailyActivityCalculationCore.contextText({ status: 'NO_BASELINE' }) === null, 'F3: geen tekst zonder een geldige OK-deviation');

// ---- G. allowed_decision_use blijft false (sectie 8: geen automatische trainingsregel) ----
{
  const baselineEntry = DailyActivityCalculationCore.CALCULATION_REGISTRY.find(c => c.calculation_id === 'daily_steps_baseline.v1');
  const deviationEntry = DailyActivityCalculationCore.CALCULATION_REGISTRY.find(c => c.calculation_id === 'daily_steps_deviation.v1');
  ok(baselineEntry.allowed_decision_use === false && deviationEntry.allowed_decision_use === false,
    'G1: beide Calculation Registry-entries hebben allowed_decision_use=false -- geen automatische trainingsaanpassing hierop bouwen zonder expliciete, aparte Decision Engine-evidence');
  ok(baselineEntry.evidence_level === 'E' && deviationEntry.evidence_level === 'E', 'G2: Evidence Level E (technisch/afgeleid), consistent met het bestaande Consistency-precedent');
}

console.log('\n========================================================');
console.log('fDailyActivityCalculation.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exitCode = 1;
