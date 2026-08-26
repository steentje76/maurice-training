/* ============================================================================
 * fCycle.test.js — Cyclustracking MVP: Calculation Engine (cycle.v1)
 * ----------------------------------------------------------------------------
 * Puur, deterministisch, geen mocks van externe systemen nodig (de module zelf
 * doet geen I/O). Elke test controleert een expliciet, benoemd scenario uit de
 * MVP-opdracht: normale/korte/lange/onregelmatige cyclus, ontbrekende data,
 * correctie, grensdagen, nieuwe cyclus, jaargrens.
 * ========================================================================== */
'use strict';
const assert = require('assert');
const CycleCore = require('./cycle.js');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + label); }
}
function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label + ' (kreeg ' + JSON.stringify(actual) + ', verwacht ' + JSON.stringify(expected) + ')');
}

console.log('\nA. cycleDay() — basisberekening en grensdagen');
eq(CycleCore.cycleDay([{ start_date: '2026-08-01' }], '2026-08-01'), 1, 'A1: startdatum zelf is dag 1');
eq(CycleCore.cycleDay([{ start_date: '2026-08-01' }], '2026-08-02'), 2, 'A2: dag erna is dag 2');
eq(CycleCore.cycleDay([{ start_date: '2026-08-01' }], '2026-08-28'), 28, 'A3: dag 28 correct geteld');
eq(CycleCore.cycleDay([], '2026-08-05'), null, 'A4: geen periodes gelogd -> null, geen verzonnen dag');
eq(CycleCore.cycleDay([{ start_date: '2026-08-10' }], '2026-08-05'), null, 'A5: referentiedatum vóór de enige gelogde start -> null');
eq(CycleCore.cycleDay(null, '2026-08-05'), null, 'A6: null-invoer crasht niet, geeft null');

console.log('\nB. cycleDay() — meerdere cycli, jaargrens');
const meerdereCycli = [
  { start_date: '2026-07-01' },
  { start_date: '2026-07-29' },
  { start_date: '2026-12-30' }
];
eq(CycleCore.cycleDay(meerdereCycli, '2026-08-05'), 8, 'B1: telt vanaf de MEEST RECENTE relevante startdatum (29 juli), niet de eerste');
eq(CycleCore.cycleDay(meerdereCycli, '2027-01-03'), 5, 'B2: jaargrens (30 dec -> 3 jan) correct doorgeteld');

console.log('\nC. averageCycleLength() — normaal, kort, lang, onregelmatig, onvoldoende data');
eq(CycleCore.averageCycleLength([]), null, 'C1: 0 periodes -> null');
eq(CycleCore.averageCycleLength([{ start_date: '2026-08-01' }]), null, 'C2: 1 periode -> onvoldoende data -> null');
eq(CycleCore.averageCycleLength([{ start_date: '2026-07-01' }, { start_date: '2026-07-29' }]), 28, 'C3: normale 28-dagen-cyclus');
eq(CycleCore.averageCycleLength([{ start_date: '2026-07-01' }, { start_date: '2026-07-22' }]), 21, 'C4: korte 21-dagen-cyclus');
eq(CycleCore.averageCycleLength([{ start_date: '2026-07-01' }, { start_date: '2026-08-05' }]), 35, 'C5: lange 35-dagen-cyclus');
eq(CycleCore.averageCycleLength([{ start_date: '2026-01-01' }, { start_date: '2026-01-22' }, { start_date: '2026-02-28' }]), 29, 'C6: onregelmatige cycli -> correct gemiddelde (21 en 37 dagen -> 29)');

console.log('\nD. estimatedNextPeriod() — voorspelling alleen bij voldoende data');
eq(CycleCore.estimatedNextPeriod([{ start_date: '2026-08-01' }]), null, 'D1: 1 periode -> onvoldoende data -> GEEN voorspelling (nooit gokken op één datapunt)');
eq(CycleCore.estimatedNextPeriod([{ start_date: '2026-07-01' }, { start_date: '2026-07-29' }]), '2026-08-26', 'D2: 2 periodes (28 dagen) -> volgende geschat op 29 juli + 28 dagen');
eq(CycleCore.estimatedNextPeriod([]), null, 'D3: geen periodes -> null');

console.log('\nE. estimatedPhaseFromDay() — sluit aan op de BESTAANDE CalcCore.cyclusDagFactor()-vocabulaire');
eq(CycleCore.estimatedPhaseFromDay(null, 28), null, 'E1: geen cyclusdag -> null, geen gok');
eq(CycleCore.estimatedPhaseFromDay(0, 28), null, 'E2: dag 0 (ongeldig) -> null');
eq(CycleCore.estimatedPhaseFromDay(2, 28), 'menstruatie', 'E3: dag 2 van 28 -> menstruatie');
eq(CycleCore.estimatedPhaseFromDay(5, 28), 'menstruatie', 'E4: dag 5 (grensdag) -> nog menstruatie');
eq(CycleCore.estimatedPhaseFromDay(6, 28), 'folliculair', 'E5: dag 6 (grensdag) -> folliculair');
eq(CycleCore.estimatedPhaseFromDay(14, 28), 'ovulatie', 'E6: dag 14 (midden van 28) -> geschatte ovulatie');
eq(CycleCore.estimatedPhaseFromDay(20, 28), 'luteaal', 'E7: dag 20 -> luteaal');
ok(['menstruatie', 'folliculair', 'ovulatie', 'luteaal'].indexOf(CycleCore.estimatedPhaseFromDay(10, 28)) !== -1,
  'E8: elke geschatte fase is een van de vier BESTAANDE, door CalcCore.cyclusDagFactor() erkende waarden');
eq(CycleCore.estimatedPhaseFromDay(10, null), CycleCore.estimatedPhaseFromDay(10, 28), 'E9: geen bekende cycluslengte -> valt terug op de standaard 28-dagen-aanname (gedocumenteerd, geen crash)');

console.log('\nF. normalizePeriods() — robuustheid tegen rommelige invoer');
eq(CycleCore.normalizePeriods([{ start_date: null }, { foo: 'bar' }, { start_date: '2026-08-01' }]).length, 1, 'F1: ongeldige rijen worden genegeerd, niet gecrasht');
const gesorteerd = CycleCore.normalizePeriods([{ start_date: '2026-08-15' }, { start_date: '2026-07-01' }]);
eq(gesorteerd[0].start_date, '2026-07-01', 'F2: periodes worden op startdatum GESORTEERD (invoervolgorde is niet betrouwbaar)');

console.log('\nG. cycleContext() — samengesteld contextobject (Context Engine-voorbereiding)');
const ctxLeeg = CycleCore.cycleContext([], '2026-08-05');
eq(ctxLeeg.trackingBeschikbaar, false, 'G1: geen periodes -> trackingBeschikbaar=false');
eq(ctxLeeg.cyclusDag, null, 'G2: geen periodes -> cyclusDag=null');
eq(ctxLeeg.voldoendeDataVoorVoorspelling, false, 'G3: geen periodes -> voldoendeDataVoorVoorspelling=false');

const ctxEenPeriode = CycleCore.cycleContext([{ start_date: '2026-08-01' }], '2026-08-03');
eq(ctxEenPeriode.trackingBeschikbaar, true, 'G4: 1 periode -> trackingBeschikbaar=true');
eq(ctxEenPeriode.cyclusDag, 3, 'G5: cyclusdag correct doorgegeven');
eq(ctxEenPeriode.menstruatieActief, true, 'G6: dag 3 van een lopende periode -> menstruatieActief=true');
eq(ctxEenPeriode.voldoendeDataVoorVoorspelling, false, 'G7: nog steeds maar 1 cyclus -> geen voorspelling');
eq(ctxEenPeriode.geschatteVolgendePeriode, null, 'G8: geen voorspelling bij onvoldoende data');

const ctxTweeVolledige = CycleCore.cycleContext(
  [{ start_date: '2026-07-01', end_date: '2026-07-05' }, { start_date: '2026-07-29' }],
  '2026-08-10'
);
eq(ctxTweeVolledige.voldoendeDataVoorVoorspelling, true, 'G9: 2 cycli -> voorspelling wel beschikbaar');
ok(ctxTweeVolledige.geschatteVolgendePeriode != null, 'G10: geschatte volgende periode is een echte datum, geen null');
eq(ctxTweeVolledige.menstruatieActief, false, 'G11: dag 13 (buiten het menstruatievenster) -> menstruatieActief=false');

console.log('\nH. AFGERONDE PERIODE (correctie/nieuwe-cyclus-scenario)');
const ctxAfgerond = CycleCore.cycleContext(
  [{ start_date: '2026-08-01', end_date: '2026-08-05' }],
  '2026-08-03'
);
eq(ctxAfgerond.menstruatieActief, true, 'H1: dag 3, binnen de expliciete start/eind-range -> actief');
const ctxNaAfloop = CycleCore.cycleContext(
  [{ start_date: '2026-08-01', end_date: '2026-08-05' }],
  '2026-08-07'
);
eq(ctxNaAfloop.menstruatieActief, false, 'H2: dag 7, na de expliciete einddatum -> niet meer actief');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Cyclustracking-Calculation niet groen.'); process.exitCode = 1; }
else console.log('✅ Cyclustracking-Calculation (cycle.v1) volledig deterministisch en getest.');
