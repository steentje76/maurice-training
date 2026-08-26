/* ============================================================================
 * fCycleTraining.test.js — Women's Performance Blueprint Fase 2:
 * Cyclus <-> Training-correlatie (cycleTraining.v1)
 * ----------------------------------------------------------------------------
 * Puur, deterministisch. Elke test bewijst zowel de correctheid van de
 * berekening als de afwezigheid van causale/medische taal (de output is
 * uitsluitend getallen en fase-sleutels, nooit tekst).
 * ========================================================================== */
'use strict';
const CTC = require('./cycleTraining.js');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + label); }
}
function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label + ' (kreeg ' + JSON.stringify(actual) + ', verwacht ' + JSON.stringify(expected) + ')');
}

const drieCycli = [
  { start_date: '2026-06-01' }, { start_date: '2026-06-29' }, { start_date: '2026-07-27' }
];

console.log('\nA. trainingCountByPhase() — feitelijke tellingen');
eq(CTC.trainingCountByPhase([], []), { menstruatie: 0, folliculair: 0, ovulatie: 0, luteaal: 0, onbekend: 0 }, 'A1: geen data -> alle tellingen 0');
const tellingen = CTC.trainingCountByPhase(drieCycli, [
  { date: '2026-06-03' }, { date: '2026-06-10' }, { date: '2026-07-10' }
]);
eq(tellingen.menstruatie, 1, 'A2: 3 juni (dag 3) -> 1x menstruatie');
ok(tellingen.folliculair + tellingen.ovulatie + tellingen.luteaal >= 2, 'A3: de overige twee sessies vallen in een andere, geldige fase');
eq(CTC.trainingCountByPhase(drieCycli, [{ foo: 'bar' }, null, { date: null }]).onbekend, 0, 'A4: rommelige/ontbrekende datums crashen niet en tellen niet mee als "onbekend" (worden simpelweg overgeslagen)');

console.log('\nB. averageMetricByPhase() — minimumdrempel per emmer (nooit een gemiddelde op <3 sessies)');
eq(CTC.averageMetricByPhase(drieCycli, [{ date: '2026-06-03', rpe: 8 }], 'rpe'), {}, 'B1: slechts 1 sessie in de menstruatie-emmer -> GEEN gemiddelde getoond');
eq(CTC.averageMetricByPhase(drieCycli, [{ date: '2026-06-03', rpe: 8 }, { date: '2026-06-04', rpe: 6 }], 'rpe'), {}, 'B2: 2 sessies -> nog steeds onder de drempel -> {}');
const drieRpeSessies = [
  { date: '2026-06-02', rpe: 8 }, { date: '2026-06-03', rpe: 6 }, { date: '2026-06-04', rpe: 7 }
];
const gemRpe = CTC.averageMetricByPhase(drieCycli, drieRpeSessies, 'rpe');
ok(!!gemRpe.menstruatie, 'B3: 3 sessies in dezelfde emmer -> WEL een gemiddelde');
eq(gemRpe.menstruatie.gemiddelde, 7, 'B4: gemiddelde correct berekend ((8+6+7)/3=7)');
eq(gemRpe.menstruatie.aantalSessies, 3, 'B5: aantal sessies correct meegegeven (transparantie over de bron van het gemiddelde)');
eq(CTC.averageMetricByPhase(drieCycli, [{ date: '2026-06-02', rpe: null }, { date: '2026-06-03' }], 'rpe'), {}, 'B6: ontbrekende rpe-waarden worden overgeslagen, niet als 0 meegeteld');

console.log('\nC. trainingDuringMenstruation() — feitelijke telling, geen advies');
eq(CTC.trainingDuringMenstruation([], []), { totaalSessies: 0, tijdensMenstruatie: 0 }, 'C1: geen data -> beide 0');
const tijdensMenstrCheck = CTC.trainingDuringMenstruation(drieCycli, [
  { date: '2026-06-02' }, { date: '2026-06-20' }, { date: '2026-06-29' }
]);
eq(tijdensMenstrCheck.totaalSessies, 3, 'C2: telt alle sessies mee');
eq(tijdensMenstrCheck.tijdensMenstruatie, 2, 'C3: correct 2 van de 3 sessies vielen tijdens (geregistreerde) menstruatie (2 en 29 juni), 20 juni niet');

console.log('\nD. cycleTrainingSummary() — samengesteld resultaat, drempel op cyclusniveau');
const samenvattingWeinigData = CTC.cycleTrainingSummary([{ start_date: '2026-08-01' }], [{ date: '2026-08-03', rpe: 7 }]);
eq(samenvattingWeinigData.voldoendeCycliVoorFaseVergelijking, false, 'D1: slechts 1 gelogde cyclus -> geen fasevergelijking beschikbaar');
eq(samenvattingWeinigData.aantalPerFase, null, 'D2: geen aantalPerFase-uitsplitsing bij onvoldoende cycli');
const samenvattingVoldoende = CTC.cycleTrainingSummary(drieCycli, drieRpeSessies);
eq(samenvattingVoldoende.voldoendeCycliVoorFaseVergelijking, true, 'D3: 3 gelogde cycli -> fasevergelijking wel beschikbaar');
ok(!!samenvattingVoldoende.aantalPerFase, 'D4: aantalPerFase aanwezig bij voldoende cycli');
ok(!!samenvattingVoldoende.menstruatieEnTraining, 'D5: menstruatieEnTraining altijd aanwezig (vereist geen cyclusdrempel, is een pure telling)');

console.log('\nE. TAALVEILIGHEID — de output bevat uitsluitend getallen/sleutels, nooit tekst/claims');
const volledigeOutput = JSON.stringify(CTC.cycleTrainingSummary(drieCycli, drieRpeSessies));
ok(!/hormo|diagnos|oorzaak|veroorzaak|zwanger|anticoncep|vruchtbaar/i.test(volledigeOutput), 'E1: geen enkele causale/medische term in de gehele Calculation-output (de module levert uitsluitend getallen, taal hoort in de UI-laag met eigen voorbehoud)');

console.log('\nF. INCONSISTENTIE-BUGFIX (v4.53.0) — trainingCountByPhase en trainingDuringMenstruation moeten CONSISTENT zijn');
// Regressietest voor de gevonden cycleContext()-bug: vóór de fix gaf trainingCountByPhase
// een sessie aan als 'menstruatie' terwijl trainingDuringMenstruation() diezelfde sessie
// (foutief) niet als 'tijdens menstruatie' telde, voor exact dezelfde datum.
const consistentieSessies = [{ date: '2026-06-03' }];
const perFaseCheck = CTC.trainingCountByPhase(drieCycli, consistentieSessies);
const tijdensCheck = CTC.trainingDuringMenstruation(drieCycli, consistentieSessies);
eq(perFaseCheck.menstruatie, 1, 'F1: 3 juni correct geclassificeerd als menstruatie-fase');
eq(tijdensCheck.tijdensMenstruatie, 1, 'F2: DEZELFDE sessie (3 juni) moet OOK als "tijdens menstruatie" tellen -- consistent met F1, ondanks dat er later nog twee cycli gelogd zijn');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Cyclus-training-correlatie niet groen.'); process.exitCode = 1; }
else console.log('✅ Cyclus-training-correlatie (cycleTraining.v1) volledig deterministisch, consistent en getest.');
