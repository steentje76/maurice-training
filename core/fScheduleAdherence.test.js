/* ============================================================================
 * fScheduleAdherence.test.js — Program Adaptation V1 (scheduleAdherence.v1)
 * ----------------------------------------------------------------------------
 * Puur, deterministisch. Dekt alle 17 scenario's uit de opdracht (voor zover
 * ze de Calculation/Decision Engine raken -- UI-scenario's worden apart in
 * fHardening.test.js gecontroleerd).
 * ========================================================================== */
'use strict';
const S = require('./scheduleAdherence.js');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + label); } }
function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label + ' (kreeg ' + JSON.stringify(actual) + ', verwacht ' + JSON.stringify(expected) + ')');
}

console.log('\nA. daysLate() — basisberekening');
eq(S.daysLate('2026-08-24', '2026-08-27'), 3, 'A1: 3 dagen te laat');
eq(S.daysLate('2026-08-27', '2026-08-27'), 0, 'A2: exact vandaag -> 0');
eq(S.daysLate('2026-08-28', '2026-08-27'), -1, 'A3: morgen gepland -> -1 (nog niet zover)');
eq(S.daysLate(null, '2026-08-27'), null, 'A4: ontbrekende plannedDate -> null, geen gok');
eq(S.daysLate('2026-08-24', null), null, 'A5: ontbrekende today -> null');

console.log('\nB. resolveScheduleGap() — Scenario 1/2/6/7/11/12 (alle vijf statussen)');
eq(S.resolveScheduleGap('2026-08-27', '2026-08-27', null, null), 'TODAY', 'B1 (Scenario 1): gepland vandaag -> TODAY, geen prompt nodig');
eq(S.resolveScheduleGap('2026-08-26', '2026-08-27', null, null), 'MISSED', 'B2 (Scenario 2/7): gisteren gepland -> MISSED');
eq(S.resolveScheduleGap('2026-08-28', '2026-08-27', null, null), 'FUTURE', 'B3 (Scenario 6): morgen gepland, vandaag geopend -> FUTURE, NIET als gemist behandelen');
eq(S.resolveScheduleGap('2026-08-20', '2026-08-27', '2026-08-20T09:00:00Z', null), 'COMPLETED', 'B4 (Scenario 11): afgerond, ondanks datum in het verleden -> COMPLETED, nooit MISSED');
eq(S.resolveScheduleGap('2026-08-20', '2026-08-27', null, 'skipped'), 'SKIPPED', 'B5 (Scenario 12): bewust overgeslagen -> SKIPPED, niet als gewone MISSED behandeld');
eq(S.resolveScheduleGap('2026-08-20', '2026-08-27', '2026-08-25T09:00:00Z', 'rescheduled'), 'COMPLETED', 'B6: completed_at wint ALTIJD, ongeacht schedule_status');
eq(S.resolveScheduleGap(null, '2026-08-27', null, null), null, 'B7: ontbrekende plannedDate -> null, geen verzonnen status');

console.log('\nC. hasScheduleConflict() — Scenario 8/9 (botsing, geen stille overschrijving)');
const blokken = [
  { id: 1, planned_date: '2026-08-24', completed_at: null, schedule_status: null },
  { id: 2, planned_date: '2026-08-27', completed_at: null, schedule_status: null },
  { id: 3, planned_date: '2026-08-29', completed_at: '2026-08-29T09:00:00Z', schedule_status: null },
  { id: 4, planned_date: '2026-08-30', completed_at: null, schedule_status: 'skipped' }
];
ok(S.hasScheduleConflict(blokken, '2026-08-27', 1) !== null, 'C1 (Scenario 8): block 2 staat al op 27 aug -> botsing gedetecteerd bij verplaatsen van block 1 naar die datum');
eq(S.hasScheduleConflict(blokken, '2026-08-27', 1).id, 2, 'C2: de botsende block wordt correct geretourneerd (id 2), zodat de UI kan tonen WELKE training conflicteert');
eq(S.hasScheduleConflict(blokken, '2026-08-25', 1), null, 'C3: geen botsing op een vrije datum -> null');
eq(S.hasScheduleConflict(blokken, '2026-08-27', 2), null, 'C4: een block botst NOOIT met zichzelf (excludeBlockId)');
eq(S.hasScheduleConflict(blokken, '2026-08-29', 1), null, 'C5: een AFGERONDE training (block 3) blokkeert een nieuwe reschedule NIET -- die dag is feitelijk weer vrij');
eq(S.hasScheduleConflict(blokken, '2026-08-30', 1), null, 'C6: een OVERGESLAGEN training (block 4) blokkeert een nieuwe reschedule NIET');
eq(S.hasScheduleConflict([], '2026-08-27', 1), null, 'C7: lege lijst -> geen botsing, geen crash');

console.log('\nD. resolveRescheduleDecision() — Decision Engine, expliciete opties');
eq(S.resolveRescheduleDecision(blokken, '2026-08-27', 1), 'CONFLICT_WARNING', 'D1 (Scenario 8): botsing -> CONFLICT_WARNING, NOOIT automatisch overschrijven');
eq(S.resolveRescheduleDecision(blokken, '2026-08-25', 1), 'PROCEED', 'D2: geen botsing -> PROCEED, veilig om direct te schrijven');

console.log('\nE. sessionsMissed() / daysUntilNextPlanned() — Scenario 9/10 (meerdere gemiste, geen automatische reactie)');
const drieGemist = [
  { planned_date: '2026-08-20', completed_at: null, schedule_status: null },
  { planned_date: '2026-08-22', completed_at: null, schedule_status: null },
  { planned_date: '2026-08-24', completed_at: null, schedule_status: null },
  { planned_date: '2026-08-29', completed_at: null, schedule_status: null }
];
eq(S.sessionsMissed(drieGemist, '2026-08-27'), 3, 'E1 (Scenario 10): drie gemiste trainingen correct geteld, puur informatief');
eq(S.daysUntilNextPlanned(drieGemist, '2026-08-27'), 2, 'E2: eerstvolgende toekomstige training (29 aug) correct berekend, negeert de gemiste');
eq(S.daysUntilNextPlanned([], '2026-08-27'), null, 'E3: geen enkele toekomstige planning -> null, geen verzonnen 0');
const alleenGemistOfAfgerond = [
  { planned_date: '2026-08-20', completed_at: '2026-08-20T09:00Z', schedule_status: null },
  { planned_date: '2026-08-22', completed_at: null, schedule_status: 'skipped' }
];
eq(S.daysUntilNextPlanned(alleenGemistOfAfgerond, '2026-08-27'), null, 'E4: afgeronde/overgeslagen blocks tellen niet mee als "toekomstig" -> null');

console.log('\nF. Middernacht/tijdzone (Scenario 15) — kale datumvergelijking, geen tijdcomponent-verrassingen');
eq(S.resolveScheduleGap('2026-08-27', '2026-08-27', null, null), 'TODAY', 'F1: exacte datumgelijkheid, geen tijdzone-drift binnen de puur-datum-vergelijking');
eq(S.daysLate('2026-12-31', '2027-01-02'), 2, 'F2: jaargrens correct doorgeteld');

console.log('\nG. Deload-week (Scenario 16) — deze module raakt fase/week_nr NOOIT');
ok(!Object.keys(S).some(function(k){ return /week|fase|phase/i.test(k) && k !== 'weeksUntilEvent'; }), 'G1: geen enkele functie in deze module raakt week_nr of fase_naam -- reschedule is uitsluitend een datumwijziging op het aangeklikte block');

console.log('\nH. GOAL/EVENT-DATE AWARENESS (v4.56.0) — daysUntilEvent()/weeksUntilEvent()');
eq(S.daysUntilEvent(null, '2026-08-27'), null, 'H1: geen event_date ingesteld -> null, geen verzonnen getal');
eq(S.daysUntilEvent('2026-08-27', '2026-08-27'), 0, 'H2: evenement is vandaag -> 0');
eq(S.daysUntilEvent('2026-08-28', '2026-08-27'), 1, 'H3: evenement morgen -> 1');
eq(S.daysUntilEvent('2026-11-19', '2026-08-27'), 84, 'H4: 12 weken vooruit -> 84 dagen (Scenario HYROX over 12 weken)');
eq(S.daysUntilEvent('2026-08-20', '2026-08-27'), -7, 'H5: evenement al 7 dagen geleden -> negatief, feitelijk, geen verbloeming');
eq(S.daysUntilEvent(null, null), null, 'H6: beide ontbrekend -> null, geen crash');
eq(S.weeksUntilEvent('2026-11-19', '2026-08-27'), 12, 'H7: 84 dagen -> exact 12 weken');
eq(S.weeksUntilEvent('2026-09-04', '2026-08-27'), 2, 'H8: 8 dagen -> naar boven afgerond naar 2 weken (nooit een wedstrijd te vroeg laten lijken door naar beneden af te ronden)');
eq(S.weeksUntilEvent('2026-08-20', '2026-08-27'), null, 'H9: verlopen evenement -> weeksUntilEvent=null (UI toont "verlopen", geen negatief weken-getal)');
eq(S.weeksUntilEvent(null, '2026-08-27'), null, 'H10: geen event_date -> null');
eq(S.daysUntilEvent('2027-08-27', '2026-08-27'), 365, 'H11: jaargrens correct doorgeteld (2026 is geen schrikkeljaar)');
eq(S.daysUntilEvent('2028-08-27', '2027-08-27'), 366, 'H12: schrikkeljaar (2028, met 29 februari) correct verdisconteerd');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Program Adaptation V1 (Calculation/Decision) niet groen.'); process.exitCode = 1; }
else console.log('✅ scheduleAdherence.v1 volledig deterministisch en getest.');
