/* fPlateauDetection.test.js — MS-F7-02 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PC = require(path.join(ROOT, 'core/progression.js'));
const PD = require(path.join(ROOT, 'core/plateauDetection.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Golden cases ----
{
  const histUp = [
    { key: 'squat', date: '01', e1rm: 100 }, { key: 'squat', date: '02', e1rm: 103 },
    { key: 'squat', date: '03', e1rm: 106 }, { key: 'squat', date: '04', e1rm: 110 }
  ];
  ok(PD.classify(histUp, 'squat', 'e1rm', 'max', PC).state === 'IMPROVING', 'A1: duidelijke verbetering -> IMPROVING');

  const histFlat = [
    { key: 'squat', date: '01', e1rm: 100 }, { key: 'squat', date: '02', e1rm: 101 }, { key: 'squat', date: '03', e1rm: 99 },
    { key: 'squat', date: '04', e1rm: 100 }, { key: 'squat', date: '05', e1rm: 100 }, { key: 'squat', date: '06', e1rm: 101 }
  ];
  ok(PD.classify(histFlat, 'squat', 'e1rm', 'max', PC).state === 'PLATEAU', 'A2: 6 vlakke sessies, geen PR -> PLATEAU');

  const histDecl4 = [
    { key: 'squat', date: '01', e1rm: 110 }, { key: 'squat', date: '02', e1rm: 106 },
    { key: 'squat', date: '03', e1rm: 103 }, { key: 'squat', date: '04', e1rm: 100 }
  ];
  ok(PD.classify(histDecl4, 'squat', 'e1rm', 'max', PC).state === 'TEMPORARY_REGRESSION',
    'A3: 4 duidelijk dalende sessies (net MIN_OBSERVATIONS) -> TEMPORARY_REGRESSION, niet PLATEAU');

  ok(PD.classify([{ key: 'squat', date: '01', e1rm: 100 }, { key: 'squat', date: '02', e1rm: 105 }], 'squat', 'e1rm', 'max', PC).state === 'INSUFFICIENT_DATA',
    'A4: 2 observaties -> INSUFFICIENT_DATA');
}

// ---- B. Verplichte false-positive-cases ----
{
  ok(PD.classify([{ key: 'squat', date: '01', e1rm: 100 }, { key: 'squat', date: '02', e1rm: 100 }, { key: 'squat', date: '03', e1rm: 95 }], 'squat', 'e1rm', 'max', PC).state === 'INSUFFICIENT_DATA',
    'B1: 1 slechte sessie na 2 stabiele (totaal 3, onder MIN_OBSERVATIONS) -> INSUFFICIENT_DATA, NOOIT plateau op basis van 1 slechte sessie');

  ok(PD.classify([], 'nieuwe_oefening', 'e1rm', 'max', PC).state === 'INSUFFICIENT_DATA',
    'B2: geheel nieuwe oefening (geen geschiedenis) -> INSUFFICIENT_DATA');

  const histFlatMetPr = [
    { key: 'squat', date: '01', e1rm: 100 }, { key: 'squat', date: '02', e1rm: 100 }, { key: 'squat', date: '03', e1rm: 100 },
    { key: 'squat', date: '04', e1rm: 100 }, { key: 'squat', date: '05', e1rm: 100 }, { key: 'squat', date: '06', e1rm: 108 }
  ];
  const rPr = PD.classify(histFlatMetPr, 'squat', 'e1rm', 'max', PC);
  ok(rPr.state !== 'PLATEAU', 'B3: een nieuwe PR in de laatste sessie voorkomt een PLATEAU-classificatie');

  const gemengd = [
    { key: 'squat', date: '01', e1rm: 100 }, { key: 'squat', date: '02', e1rm: 100 }, { key: 'squat', date: '03', e1rm: 100 }, { key: 'squat', date: '04', e1rm: 100 },
    { key: 'deadlift', date: '01', e1rm: 150 }, { key: 'deadlift', date: '02', e1rm: 160 }, { key: 'deadlift', date: '03', e1rm: 170 }, { key: 'deadlift', date: '04', e1rm: 180 }
  ];
  const rSquat = PD.classify(gemengd, 'squat', 'e1rm', 'max', PC);
  const rDeadlift = PD.classify(gemengd, 'deadlift', 'e1rm', 'max', PC);
  ok(rSquat.observation_count === 4 && rDeadlift.observation_count === 4, 'B4: canonieke exercise-isolatie -- squat-data lekt niet naar deadlift');
  ok(rDeadlift.state === 'IMPROVING', 'B5: deadlift correct apart geclassificeerd van de vlakke squat');
}

// ---- C. Hergebruik, geen duplicatie ----
ok(!Object.keys(PD).some(function (k) { return /trendBy|comparableHistory|isNewBest/.test(k); }),
  'C1: PlateauDetectionCore herimplementeert geen trendBy/comparableHistory/isNewBest zelf');

console.log('fPlateauDetection: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
