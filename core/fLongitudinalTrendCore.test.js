/* fLongitudinalTrendCore.test.js — MS-F7-01 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PC = require(path.join(ROOT, 'core/progression.js'));
const CC = require(path.join(ROOT, 'core/calculation.js'));
const LT = require(path.join(ROOT, 'core/longitudinalTrend.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. fromTrendBy() ----
{
  const histUp = [
    { key: 'squat', date: '2026-07-01', e1rm: 100 },
    { key: 'squat', date: '2026-07-15', e1rm: 105 },
    { key: 'squat', date: '2026-08-01', e1rm: 110 }
  ];
  const n1 = LT.fromTrendBy(PC.trendBy(histUp, 'squat', 'e1rm', 'max', 3), 'e1rm', 'strength', 'squat', 3);
  ok(n1.status === 'trend' && n1.direction === 'improving', 'A1: stijgend e1RM -> direction=improving');
  ok(n1.context === 'squat' && n1.metric === 'e1rm' && n1.domain === 'strength', 'A2: identity-context correct behouden in de output');
  ok(n1.observation_count === 3 && n1.latest === 110 && n1.baseline === 100, 'A3: observation_count/latest/baseline correct uitgelezen, niet herberekend');

  const histPace = [
    { key: 'run_5k', date: '2026-07-01', pace: 300 },
    { key: 'run_5k', date: '2026-07-15', pace: 295 },
    { key: 'run_5k', date: '2026-08-01', pace: 288 }
  ];
  const n2 = LT.fromTrendBy(PC.trendBy(histPace, 'run_5k', 'pace', 'min', 3), 'pace', 'endurance', 'run_5k', 3);
  ok(n2.direction === 'improving', 'A4: dalende pace (dir=min) -> correct improving, geen hardcoded "hoger=beter"-aanname');

  const nInsuff = LT.fromTrendBy(PC.trendBy(histUp.slice(0, 1), 'squat', 'e1rm', 'max', 3), 'e1rm', 'strength', 'squat', 3);
  ok(nInsuff.status === 'insufficient_data' && nInsuff.direction === 'insufficient_data' && nInsuff.confidence === 'laag',
    'A5: onvoldoende observaties -> insufficient_data, confidence=laag, geen fabricage');
}

// ---- B. fromTrendClassify() ----
{
  const nDecl = LT.fromTrendClassify(CC.trendClassify([60, 58, 55, 52, 50, 48]), 'hrv', 'recovery', null);
  ok(nDecl.status === 'trend' && nDecl.direction === 'declining', 'B1: dalende HRV-reeks -> direction=declining');

  const nStable = LT.fromTrendClassify(CC.trendClassify([60, 60, 61, 60, 59, 60]), 'rhr', 'recovery', null);
  ok(nStable.direction === 'stable', 'B2: vlakke reeks -> direction=stable');

  const nInsuff2 = LT.fromTrendClassify(CC.trendClassify([60]), 'sleep', 'recovery', null);
  ok(nInsuff2.status === 'insufficient_data', 'B3: te weinig dagwaarden -> insufficient_data');
}

// ---- C. Gedeeld canoniek schema, geen source-lekken ----
{
  const n1 = LT.fromTrendBy(PC.trendBy([{ key: 'k', date: 'a', v: 1 }, { key: 'k', date: 'b', v: 2 }, { key: 'k', date: 'c', v: 3 }], 'k', 'v', 'max', 3), 'v', 'd', 'k', 3);
  const n2 = LT.fromTrendClassify(CC.trendClassify([1, 2, 3, 4]), 'v', 'd', null);
  const keys1 = Object.keys(n1).sort().join(',');
  const keys2 = Object.keys(n2).sort().join(',');
  ok(keys1 === keys2, 'C1: fromTrendBy() en fromTrendClassify() retourneren exact dezelfde veldenset (uniform contract)');
  ok(n1.schema === 'longitudinal_trend.v1' && n2.schema === 'longitudinal_trend.v1', 'C2: beide dragen hetzelfde schema-versienummer');
}

// ---- D. Determinisme ----
{
  const raw = PC.trendBy([{ key: 'k', date: 'a', v: 1 }, { key: 'k', date: 'b', v: 2 }, { key: 'k', date: 'c', v: 3 }], 'k', 'v', 'max', 3);
  const r1 = JSON.stringify(LT.fromTrendBy(raw, 'v', 'd', 'k', 3));
  const r2 = JSON.stringify(LT.fromTrendBy(raw, 'v', 'd', 'k', 3));
  ok(r1 === r2, 'D1: herhaalde aanroep met identieke input geeft byte-identieke output (determinisme)');
}

console.log('fLongitudinalTrendCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
