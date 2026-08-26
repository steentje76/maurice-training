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

console.log('\nG. cycleTrainingSummary() — nieuwe transparantievelden (Fase 3, Advanced Insights)');
const samenvattingUitgebreid = CTC.cycleTrainingSummary(drieCycli, [
  { date: '2026-06-02', rpe: 7 }, { date: '2026-06-10', rpe: 6 }, { date: '2026-07-05' }
]);
eq(samenvattingUitgebreid.aantalGebruikteTrainingen, 3, 'G1: telt exact het aantal geldige sessies dat in de analyse is gebruikt');
eq(samenvattingUitgebreid.aantalGeregistreerdeCycli, 3, 'G2: telt het aantal geregistreerde cycli (3 periodes)');
eq(samenvattingUitgebreid.datumbereik, { van: '2026-06-02', tot: '2026-07-05' }, 'G3: datumbereik correct berekend uit de daadwerkelijke sessiedatums (vroegste/laatste), niet verzonnen');
eq(CTC.cycleTrainingSummary([], []).datumbereik, null, 'G4: geen sessies -> datumbereik expliciet null, geen leeg-object-verzinsel');
eq(CTC.cycleTrainingSummary([], []).aantalGebruikteTrainingen, 0, 'G5: geen sessies -> 0, niet undefined/null');

console.log('\nH. trainingTrendPerCycle() — HISTORISCHE trend per afgeronde cyclus, geen voorspelling');
eq(CTC.trainingTrendPerCycle([{ start_date: '2026-06-01' }], []), [], 'H1: slechts 1 periode gelogd -> GEEN enkele afgeronde cyclus mogelijk -> lege array');
eq(CTC.trainingTrendPerCycle([], []), [], 'H2: geen data -> lege array, geen crash');
const trend = CTC.trainingTrendPerCycle(drieCycli, [
  { date: '2026-06-05' }, { date: '2026-06-15' }, // in cyclus 1 (1 juni t/m 28 juni)
  { date: '2026-07-01' } // in cyclus 2 (29 juni t/m 26 juli)
]);
eq(trend.length, 2, 'H3: 3 gelogde periodes -> exact 2 AFGERONDE cycli (de laatste, lopende cyclus telt NIET mee -- geen extrapolatie van een onvoltooide cyclus)');
eq(trend[0].cyclusNummer, 1, 'H4: cyclusnummers chronologisch, beginnend bij 1');
eq(trend[0].startDatum, '2026-06-01', 'H5: startdatum van cyclus 1 correct');
eq(trend[0].eindDatum, '2026-06-29', 'H6: einddatum = startdatum van de VOLGENDE periode (exclusief), niet verzonnen');
eq(trend[0].aantalTrainingen, 2, 'H7: 2 sessies vallen binnen cyclus 1 (5 en 15 juni)');
eq(trend[1].aantalTrainingen, 1, 'H8: 1 sessie valt binnen cyclus 2 (1 juli)');
eq(trend[0].gemiddeldeRpe, null, 'H9: geen enkele sessie in cyclus 1 heeft een rpe-waarde -> null, geen 0 verzinnen');
const trendMetRpe = CTC.trainingTrendPerCycle(drieCycli, [
  { date: '2026-06-05', rpe: 6 }, { date: '2026-06-10', rpe: 8 }, { date: '2026-06-15', rpe: 7 }
]);
eq(trendMetRpe[0].gemiddeldeRpe, 7, 'H10: 3 rpe-waarden (>=drempel) -> correct gemiddelde ((6+8+7)/3=7)');
const trendOnderDrempel = CTC.trainingTrendPerCycle(drieCycli, [
  { date: '2026-06-05', rpe: 6 }, { date: '2026-06-10', rpe: 8 }
]);
eq(trendOnderDrempel[0].gemiddeldeRpe, null, 'H11: slechts 2 rpe-waarden (< MIN_SESSIES_PER_EMMER=3) -> null, geen schijngemiddelde');

console.log('\nI. symptomTrainingOverlap() — feitelijke, neutrale overlap-telling, geen causaliteit');
eq(CTC.symptomTrainingOverlap([], [], 'headache'), { onvoldoendeData: true, aantalDagenMetSymptoom: 0 }, 'I1: geen symptoomdata -> onvoldoendeData=true');
const tweeHeadacheLogs = [
  { log_date: '2026-06-02', symptoms: { headache: 6 } }, { log_date: '2026-06-03', symptoms: { headache: 5 } }
];
eq(CTC.symptomTrainingOverlap(tweeHeadacheLogs, [], 'headache').onvoldoendeData, true, 'I2: slechts 2 dagen met dit symptoom (< MIN_SYMPTOOM_DAGEN=3) -> onvoldoendeData=true, ongeacht trainingsdata');
const vierHeadacheLogs = [
  { log_date: '2026-06-02', symptoms: { headache: 6 } }, { log_date: '2026-06-03', symptoms: { headache: 5 } },
  { log_date: '2026-06-04', symptoms: { headache: 7 } }, { log_date: '2026-06-05', symptoms: { headache: 4 } }
];
const overlapResultaat = CTC.symptomTrainingOverlap(vierHeadacheLogs, [
  { date: '2026-06-02' }, { date: '2026-06-04' }, { date: '2026-06-04' }, { date: '2026-06-10' }
], 'headache');
eq(overlapResultaat.onvoldoendeData, false, 'I3: 4 dagen met symptoom (>= drempel) -> voldoende data');
eq(overlapResultaat.aantalDagenMetSymptoom, 4, 'I4: telt het EXACTE aantal dagen met dit symptoom');
eq(overlapResultaat.aantalMetTraining, 2, 'I5: 2 van de 4 symptoomdagen (2 en 4 juni) hadden OOK een training -- 4 juni telt maar 1x mee ondanks 2 sessies op die dag (feitelijke dagtelling, geen sessietelling)');
ok(!JSON.stringify(overlapResultaat).toLowerCase().match(/hormo|diagnos|oorzaak|veroorzaak|beinvloed/), 'I6: de output bevat geen causale taal -- uitsluitend getallen');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Cyclus-training-correlatie niet groen.'); process.exitCode = 1; }
else console.log('✅ Cyclus-training-correlatie (cycleTraining.v1) volledig deterministisch, consistent en getest.');
