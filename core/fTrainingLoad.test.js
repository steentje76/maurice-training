/* ============================================================================
 * fTrainingLoad.test.js — Product Gap Discovery V8 (trainingLoad.v1)
 * ----------------------------------------------------------------------------
 * Puur, deterministisch. Uitsluitend classificatie van een REEDS BEREKENDE
 * ACWR-waarde (AthleteCore.acuteChronic(), protected core, ONGEWIJZIGD) --
 * deze module berekent zelf GEEN ACWR, uitsluitend de neutrale duiding.
 * ========================================================================== */
'use strict';
const T = require('./trainingLoad.js');
const AC = require('./athlete.js');
const CC = require('./calculation.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + label); } }
function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label + ' (kreeg ' + JSON.stringify(actual) + ', verwacht ' + JSON.stringify(expected) + ')');
}

console.log('\nA. classifyAcwr() — grenswaarden (Gabbett 2016-banden, inclusief onderkant)');
eq(T.classifyAcwr(null), null, 'A1: null -> null, geen gok');
eq(T.classifyAcwr(undefined), null, 'A2: undefined -> null');
eq(T.classifyAcwr(NaN), null, 'A3: NaN -> null, geen crash');
eq(T.classifyAcwr(-0.5), null, 'A4: negatieve waarde (ongeldig voor een ratio) -> null');
eq(T.classifyAcwr('1.5'), null, 'A5: string i.p.v. number -> null, geen impliciete coercion');
eq(T.classifyAcwr(0), 'lager', 'A6: 0 (geen belasting) -> lager');
eq(T.classifyAcwr(0.79), 'lager', 'A7: net onder 0.8 -> lager');
eq(T.classifyAcwr(0.8), 'vergelijkbaar', 'A8: exact 0.8 -> vergelijkbaar (inclusieve ondergrens)');
eq(T.classifyAcwr(1.0), 'vergelijkbaar', 'A9: 1.0 (exact gelijk aan gemiddelde) -> vergelijkbaar');
eq(T.classifyAcwr(1.29), 'vergelijkbaar', 'A10: net onder 1.3 -> vergelijkbaar');
eq(T.classifyAcwr(1.3), 'hoger', 'A11: exact 1.3 -> hoger (inclusieve ondergrens)');
eq(T.classifyAcwr(1.49), 'hoger', 'A12: net onder 1.5 -> hoger');
eq(T.classifyAcwr(1.5), 'sterk_hoger', 'A13: exact 1.5 -> sterk_hoger (inclusieve ondergrens)');
eq(T.classifyAcwr(3.0), 'sterk_hoger', 'A14: extreem hoge waarde -> sterk_hoger');
eq(T.classifyAcwr(1.94), 'sterk_hoger', 'A15: 1.94 (de echte, met productiedata berekende waarde) -> sterk_hoger');

console.log('\nB. acwrAdvisoryText() — neutrale taal, geen medische/blessure-claim');
ok(!!T.acwrAdvisoryText('lager'), 'B1: geeft tekst terug voor "lager"');
ok(!!T.acwrAdvisoryText('vergelijkbaar'), 'B2: geeft tekst terug voor "vergelijkbaar"');
ok(!!T.acwrAdvisoryText('hoger'), 'B3: geeft tekst terug voor "hoger"');
ok(!!T.acwrAdvisoryText('sterk_hoger'), 'B4: geeft tekst terug voor "sterk_hoger"');
eq(T.acwrAdvisoryText(null), '', 'B5: null-classificatie -> lege string, geen verzonnen boodschap');
eq(T.acwrAdvisoryText('onbekende_waarde'), '', 'B6: onbekende classificatie -> lege string, geen crash');
[T.acwrAdvisoryText('lager'), T.acwrAdvisoryText('vergelijkbaar'), T.acwrAdvisoryText('hoger'), T.acwrAdvisoryText('sterk_hoger')].forEach(function(tekst, i) {
  ok(!/blessure|risico|gevaar|waarschuwing|diagnose|ziek/i.test(tekst), 'B7.' + i + ': "' + tekst + '" bevat geen blessurerisico-/medische-/alarmerende taal');
  ok(!/moet|zou moeten|verplicht/i.test(tekst), 'B7b.' + i + ': geen dwingend advies -- puur beschrijvend, geen opgelegde actie');
});

console.log('\nC. Integratie met de echte, protected AthleteCore.acuteChronic() -- geen dubbele berekening');
const echteSessies = [
  { date: '2026-03-25', exercise_id: 'x', sets: 3, reps: 3, weight: 87.5, training_type: 'A' },
  { date: '2026-04-11', exercise_id: 'x', sets: 4, reps: 3, weight: 80, training_type: 'A' },
  { date: '2026-04-30', exercise_id: 'x', sets: 3, reps: 3, weight: 100, training_type: 'A' },
  { date: '2026-05-28', exercise_id: 'x', sets: 4, reps: 2, weight: 90, training_type: 'A' },
  { date: '2026-06-14', exercise_id: 'x', sets: 3, reps: 3, weight: 90, training_type: 'A' },
  { date: '2026-07-05', exercise_id: 'x', sets: 2, reps: 3, weight: 90, training_type: 'A' },
  { date: '2026-07-26', exercise_id: 'x', sets: 4, reps: 6, weight: 70, training_type: 'A' },
  { date: '2026-08-08', exercise_id: 'x', sets: 4, reps: 1, weight: 105, training_type: 'A' },
  { date: '2026-08-14', exercise_id: 'x', sets: 4, reps: 1, weight: 100, training_type: 'A' },
  { date: '2026-08-22', exercise_id: 'x', sets: 4, reps: 10, weight: 106, training_type: 'A' }
];
const model = AC.dailyModel(echteSessies, { calculateVolume: CC.calculateVolume });
const belasting = AC.serie(model, 'strength', 'belasting');
const acwrResultaat = AC.acuteChronic(belasting, 7, 28);
ok(acwrResultaat.reden === 'ok', 'C1: AthleteCore.acuteChronic() (protected, ONGEWIJZIGD) geeft een geldig resultaat met deze reeks');
const classificatie = T.classifyAcwr(acwrResultaat.waarde);
ok(['lager', 'vergelijkbaar', 'hoger', 'sterk_hoger'].indexOf(classificatie) !== -1, 'C2: de classificatie van het ECHTE AthleteCore-resultaat is altijd een van de vier geldige banden');
ok(typeof T.acwrAdvisoryText(classificatie) === 'string' && T.acwrAdvisoryText(classificatie).length > 0, 'C3: levert een niet-lege, neutrale tekst op voor het echte resultaat');

console.log('\nD. Onvoldoende data (protected AthleteCore.acuteChronic() zelf gedrempeld)');
const teWeinigData = AC.acuteChronic([{ date: '2026-08-20', value: 100 }], 7, 28);
ok(teWeinigData.reden !== 'ok', 'D1: AthleteCore.acuteChronic() (ongewijzigd) weigert terecht bij te weinig data');
eq(T.classifyAcwr(teWeinigData.waarde), null, 'D2: deze module classificeert een ontbrekende/onbetrouwbare waarde correct als null, toont dus niets bij onvoldoende data');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Training Load Advisory niet groen.'); process.exitCode = 1; }
else console.log('✅ trainingLoad.v1 volledig deterministisch en getest.');
