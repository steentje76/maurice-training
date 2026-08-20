/* MASTER SPRINT v4.51.0 — RUSTDUUR PER SET: DATA FOUNDATION
 * CORRECTIE-VERSIE (na audit): "begin volgende set" = de EERSTE invoer-aanraking van die
 * set (logSet() oninput, bestaand event), NIET het rusttimer-eind. De rusttimer is een
 * UI-hulpmiddel en levert sinds deze correctie geen enkele data meer aan rest_duration_s.
 *
 * Dekt Fase 6 van de sprintopdracht + de aanvullende scenario's uit de correctie-opdracht:
 *  1  normale rustduur
 *  2  eerste set -> NULL
 *  3  meerdere sets
 *  4  lange rust
 *  5  korte rust
 *  6  negatieve tijd -> reject/unavailable
 *  7  ontbrekende timestamp -> unavailable
 *  8  onderbroken sessie (pauze wordt uit de meting gefilterd)
 *  9  offline sessie (structureel: rest_duration_s is een extra sleutel in de al bestaande
 *     sets_detail-schrijfweg; de offline-queue-infrastructuur zelf is ongewijzigd, gedekt
 *     door core/fOfflineHardening.test.js)
 * 10  sync naar Supabase (idem — writeSessionRow/sbPostQ zijn niet aangeraakt)
 * 11  bestaande sets zonder rest_duration_s (oude rijen) blijven leesbaar
 * 12  duplicate/retry sync -> zelfde invoer, zelfde uitvoer (puur/deterministisch)
 * 13  meerdere oefeningen -> geen kruisbesmetting tussen oefeningen
 * 14  meerdere sets per oefening (zie 3)
 * 15  sessieherstel -> ruwe tijdstempels zijn gewone getallen, overleven een JSON-rondje
 *  E1 gegeven voorbeeld: set 1 klaar 10:00, timer eindigt 10:01:30, set 2 begint 10:02:10
 *     -> rest_duration_s = 130 (NIET 90 — het timer-eind is irrelevant)
 *  E2 timer overgeslagen, sporter begint pas later
 *  E3 timer loopt af en sporter begint direct (start valt samen met timer-eind, toevallig)
 *  E4 ontbrekende starttimestamp (sporter vinkt af zonder velden aan te raken)
 *  E5 pauze tussen sets
 *  E6 beide flows
 *  E7 regressie: bestaande kg/reps/rpe/evidence/sets/weight-velden ongewijzigd
 *
 * Draai: node core/fRestDuration.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CalcCore = require('./calculation.js');
const DecisionCore = require('./decision.js');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// De ECHTE functie uit index.html, via brace-balancing — geen kopie.
function extractFn(name){
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  if (end < 0) throw new Error('einde niet gevonden: ' + name);
  return html.slice(start, end + 1);
}
const buildStrengthSessionRow = new Function(
  'DecisionCore', 'CalcCore',
  extractFn('tkSetEvidence') + '\n' + extractFn('buildStrengthSessionRow') + '; return buildStrengthSessionRow;'
)(DecisionCore, CalcCore);

console.log('\n[MASTER SPRINT v4.51.0] Rustduur per set — data foundation (CORRECTIE: start i.p.v. timer-eind)');

/* ── A. CalcCore.restDurationS — de zuivere regel zelf (ongewijzigd door de correctie) ── */
console.log('\nA. CalcCore.restDurationS (rest_duration.v1) — puur, los van de brontijdstempel');
const T0 = 1_000_000_000_000;

eq(CalcCore.restDurationS(T0, T0 + 75_000, 0, 0), 75, 'A1: normale rustduur (75s)');
eq(CalcCore.restDurationS(null, T0 + 75_000, 0, 0), null, 'A2 (eis 7): ontbrekende prev-tijdstempel -> unavailable');
eq(CalcCore.restDurationS(T0, null, 0, 0), null, 'A2b (eis 7): ontbrekende start-tijdstempel -> unavailable');
eq(CalcCore.restDurationS(T0, T0 + 10 * 60_000, 0, 0), 600, 'A3 (eis 4): lange rust (10 min)');
eq(CalcCore.restDurationS(T0, T0 + 5_000, 0, 0), 5, 'A4 (eis 5): korte rust (5s)');
eq(CalcCore.restDurationS(T0, T0, 0, 0), 0, 'A5: direct beginnen (0s) is een geldige gemeten waarde');
eq(CalcCore.restDurationS(T0, T0 - 5_000, 0, 0), null, 'A6 (eis 6): negatieve tijd -> unavailable, nooit geclampt naar 0');
eq(CalcCore.restDurationS(T0, T0 + 3601_000, 0, 0), null, 'A7: > REST_MAX_DUUR_S (1u) -> onwaarschijnlijk, unavailable');
eq(CalcCore.restDurationS(T0, T0 + 90_000, 10_000, 30_000), 70, 'A8 (eis 8): 20s gepauzeerde tijd wordt uit de meting gefilterd');
ok(CalcCore.restDurationS(T0, T0 + 1000, 0, 0) === CalcCore.restDurationS(T0, T0 + 1000, 0, 0), 'A9 (eis 12): deterministisch bij identieke invoer');

/* ── E1. Het exacte voorbeeld uit de correctie-opdracht ─────────────────────────────── */
console.log('\nE1. Gegeven voorbeeld: einde set1 10:00, timer eindigt 10:01:30, set2 begint 10:02:10');
const T_1000 = new Date('2026-08-20T10:00:00.000Z').getTime();
const T_timer_eind = new Date('2026-08-20T10:01:30.000Z').getTime(); // MAG GEEN ROL SPELEN
const T_set2_begin = new Date('2026-08-20T10:02:10.000Z').getTime();
const voorbeeld = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T_1000, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T_set2_begin + 1000, donePausedMs: 0, startAt: T_set2_begin, startPausedMs: 0 }
], { date: '2026-08-20', training_type: 'A', note: '', instanceId: 'i1' });
eq(voorbeeld.setsDetail[1].rest_duration_s, 130, 'E1a: rest_duration_s = 130s (10:00 -> 10:02:10), NIET 90s (10:00->10:01:30 timer-eind)');
ok(T_timer_eind !== T_set2_begin, 'E1b: het timer-eind-tijdstip zelf komt nergens in de invoer voor — puur ter illustratie dat het genegeerd wordt');

/* ── B. buildStrengthSessionRow — de ECHTE schrijfweg, met startAt i.p.v. restEndAt ──── */
console.log('\nB. buildStrengthSessionRow: rest_duration_s op basis van startAt (begin volgende set)');
const opts = { date: '2026-08-20', training_type: 'A', note: '', instanceId: 'i1' };

// eis 2: eerste set heeft nooit een voorafgaande rust
const eersteSet = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 8, doneAt: T0, donePausedMs: 0 }
], opts);
eq(eersteSet.setsDetail[0].rest_duration_s, null, 'B1 (eis 2): eerste set -> rest_duration_s = null');

// eis 1 + 3 + 14: meerdere sets, elk met een eigen, correcte rustduur (op basis van startAt)
const meerdereSets = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0,           donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 205_000, donePausedMs: 0, startAt: T0 + 120_000,  startPausedMs: 0 },
  { kg: 110, effKg: 110, reps: 3, rpe: 9, doneAt: T0 + 505_000, donePausedMs: 0, startAt: T0 + 305_000,  startPausedMs: 0 }
], opts);
eq(meerdereSets.setsDetail[0].rest_duration_s, null, 'B2: set 1 -> null');
eq(meerdereSets.setsDetail[1].rest_duration_s, 120, 'B3 (eis 1/3): set 2 -> 120s rust (einde set1 T0 -> begin set2 T0+120s)');
eq(meerdereSets.setsDetail[2].rest_duration_s, 100, 'B4 (eis 3/14): set 3 -> 100s rust (einde set2 T0+205s -> begin set3 T0+305s)');
eq(meerdereSets.row.weight, 110, 'B5: kop-gewicht ongewijzigd (regressie)');
eq(meerdereSets.row.sets, 3, 'B6: sets-telling ongewijzigd (regressie)');

// eis 7 / E4: ontbrekende startAt (sporter vinkt af zonder de velden aan te raken) -> unavailable
const zonderStart = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0 } // geen startAt
], opts);
eq(zonderStart.setsDetail[1].rest_duration_s, null, 'B7/E4 (eis 7): geen startAt -> rest_duration_s = null, niet geschat');

// eis 6: corrupte/negatieve volgorde (start vóór het einde van de vorige set) -> unavailable
const negatieveVolgorde = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0 + 100_000, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0, startAt: T0, startPausedMs: 0 }
], opts);
eq(negatieveVolgorde.setsDetail[1].rest_duration_s, null, 'B8 (eis 6): startAt vóór vorige doneAt -> unavailable');

// eis 8 / E5: onderbroken sessie — gepauzeerde tijd tussen de twee sets wordt gefilterd
const onderbroken = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 5_000 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 300_000, donePausedMs: 0, startAt: T0 + 180_000, startPausedMs: 65_000 }
], opts);
eq(onderbroken.setsDetail[1].rest_duration_s, 120, 'B9/E5 (eis 8): 60s pauze correct uit de rustmeting gefilterd');

// eis 11: bestaande/oude sets zonder enige tijdstempel blijven werken
const oudeSetsZonderTijdstempels = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8 }
], opts);
eq(oudeSetsZonderTijdstempels.setsDetail[0].rest_duration_s, null, 'B10 (eis 11): oude set 1 zonder tijdstempels -> null, geen crash');
eq(oudeSetsZonderTijdstempels.setsDetail[1].rest_duration_s, null, 'B11 (eis 11): oude set 2 zonder tijdstempels -> null, geen crash');
eq(oudeSetsZonderTijdstempels.setsDetail[1].kg, 105, 'B12 (eis 11): bestaande velden (kg/reps/rpe) blijven intact op oude rijen');

// eis 12: dezelfde invoer nogmaals (retry) -> byte-identieke sets_detail
const retryInvoer = () => buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0, startAt: T0 + 120_000, startPausedMs: 0 }
], opts);
eq(retryInvoer().setsDetail, retryInvoer().setsDetail, 'B13 (eis 12): identieke invoer (retry) -> identieke sets_detail');

// eis 13: meerdere oefeningen — geen gedeelde/lekkende state tussen oefeningen
const squat = buildStrengthSessionRow('squat', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0, startAt: T0 + 120_000, startPausedMs: 0 }
], opts);
const bench = buildStrengthSessionRow('bench', [
  { kg: 60, effKg: 60, reps: 8, rpe: 6, doneAt: T0 + 1_000_000, donePausedMs: 0 },
  { kg: 65, effKg: 65, reps: 6, rpe: 7, doneAt: T0 + 1_300_000, donePausedMs: 0, startAt: T0 + 1_240_000, startPausedMs: 0 }
], opts);
eq(squat.setsDetail[1].rest_duration_s, 120, 'B14 (eis 13): squat-rust ongewijzigd naast een andere oefening');
eq(bench.setsDetail[1].rest_duration_s, 240, 'B15 (eis 13): bench-rust correct, geen kruisbesmetting met squat-tijdstempels');

/* ── E2/E3. Timer-scenario's: het TIMER-gebeuren zelf mag NOOIT de uitkomst bepalen ──── */
console.log('\nE2/E3. Timer overgeslagen-maar-later-begonnen / timer afgelopen-en-direct-begonnen');
const laatBegonnen = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 }, // timer zou hier bv. na 90s aflopen/overgeslagen worden — niet gemodelleerd, want irrelevant
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 400_000, donePausedMs: 0, startAt: T0 + 380_000, startPausedMs: 0 } // pas na 380s echt begonnen
], opts);
eq(laatBegonnen.setsDetail[1].rest_duration_s, 380, 'E2: rust = 380s (tot de daadwerkelijke start), ongeacht wanneer de timer afliep/overgeslagen werd');

const directBegonnen = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 190_000, donePausedMs: 0, startAt: T0 + 90_000, startPausedMs: 0 }
], opts);
eq(directBegonnen.setsDetail[1].rest_duration_s, 90, 'E3: rust = 90s, gemeten via startAt (toevallig gelijk aan een fictief timer-eind), niet via de timer zelf');

/* ── C. Sessieherstel (eis 15) — ruwe tijdstempels overleven een JSON-rondje ───────── */
console.log('\nC. Sessieherstel — tijdstempels overleven localStorage-serialisatie');
const setMetTijdstempels = { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 1234, startAt: T0 + 120_000, startPausedMs: 567 };
const naJsonRondje = JSON.parse(JSON.stringify(setMetTijdstempels));
eq(naJsonRondje, setMetTijdstempels, 'C1 (eis 15): doneAt/startAt/pausedMs zijn gewone getallen, geserialiseerd zonder verlies');
const herrekend = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  naJsonRondje
], opts).setsDetail[1].rest_duration_s;
// 120.000ms ruwe spanne, 567ms pauze -> 119.433s -> afgerond 119s
eq(herrekend, 119, 'C2 (eis 15): na hervatten (JSON-rondje) rekent buildStrengthSessionRow nog exact hetzelfde uit (incl. pauze-correctie)');

/* ── D. Architectuurcontrole ──────────────────────────────────────────────────────── */
console.log('\nD. Architectuurcontrole (Fase 7)');
ok(typeof CalcCore.restDurationS === 'function', 'D1: rest_duration.v1 leeft in de Calculation Core, niet los in de UI');
ok(!/Math\.random|prompt\(|Anthropic|claude|coach\.js/i.test(CalcCore.restDurationS.toString()), 'D2: geen AI/gokken/niet-determinisme in de regel zelf');
ok(CalcCore.VERSIONS.rest_duration === 'rest_duration.v1', 'D3: versie vastgelegd in VERSIONS (reproduceerbaar/auditbaar)');

/* ── F. Bron-audit: rusttimer levert GEEN data meer aan rest_duration_s ────────────── */
console.log('\nF. Bron-audit: de rusttimer is uitsluitend UI (regressie op de correctie zelf)');
const openRestTimerSrc = extractFn('openRestTimer');
const cancelRestTimerSrc = extractFn('cancelRestTimer');
const startRestTimerSrc = extractFn('startRestTimer');
ok(!/sessionLog/.test(openRestTimerSrc), 'F1: openRestTimer() schrijft niet meer naar sessionLog');
ok(!/sessionLog/.test(cancelRestTimerSrc), 'F2: cancelRestTimer() ("Overslaan") schrijft niet meer naar sessionLog');
ok(!/sessionLog/.test(startRestTimerSrc), 'F3: startRestTimer()/de tick-lus schrijft niet meer naar sessionLog');
const rateSetSrc = extractFn('rateSet');
const restTickSrc = extractFn('restTick');
const skipRestSrc = extractFn('skipRest');
ok(!/restPending|restEndAt/.test(rateSetSrc), 'F4: Guided Workout rateSet() bevat geen restPending/restEndAt meer');
ok(!/restPending/.test(restTickSrc), 'F5: Guided Workout restTick() legt geen rust-eind meer vast');
ok(!/restPending/.test(skipRestSrc), 'F6: Guided Workout skipRest() legt geen rust-eind meer vast');

// eis "beide flows" (E6): logSet() (normale Execution) legt startAt eenmalig vast bij de EERSTE
// invoer-aanraking, en overschrijft die niet bij latere toetsaanslagen op dezelfde set.
console.log('\nE6. Beide flows — bronaudit logSet() (normale Execution) + Guided Workout-beperking');
const logSetSrc = extractFn('logSet');
ok(/startAt==null/.test(logSetSrc), 'E6a: logSet() zet startAt alleen als hij nog niet bestaat (geen overschrijving bij latere toetsaanslagen)');
ok(/tkPausedMsNu/.test(logSetSrc), 'E6b: logSet() legt de pauze-stand vast op het moment van de eerste aanraking');
const persistToSessionsSrc = extractFn('persistToSessions');
ok(!/startAt\s*:/.test(persistToSessionsSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'E6c: Guided Workout persistToSessions() geeft bewust GEEN startAt-veld mee — geen betrouwbaar start-event beschikbaar (audit), dus rest_duration_s blijft daar null i.p.v. een gok');

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
console.log(fail === 0 ? '✅ Rustduur per set: gecorrigeerd, puur, deterministisch en additief.' : '❌ Rustduur per set NIET groen.');
process.exitCode = fail === 0 ? 0 : 1;
