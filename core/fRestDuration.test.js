/* MASTER SPRINT v4.51.0 — RUSTDUUR PER SET: DATA FOUNDATION
 *
 * Dekt Fase 6 van de sprintopdracht:
 *  1  normale rustduur
 *  2  eerste set -> NULL
 *  3  meerdere sets
 *  4  lange rust
 *  5  korte rust
 *  6  negatieve tijd -> reject/unavailable
 *  7  ontbrekende timestamp -> unavailable
 *  8  onderbroken sessie (pauze wordt uit de meting gefilterd)
 *  9  offline sessie (structureel: rest_duration_s is gewoon een extra sleutel in de al
 *     bestaande sets_detail-schrijfweg; de offline-queue-infrastructuur zelf is niet
 *     gewijzigd en wordt al gedekt door core/fOfflineHardening.test.js)
 * 10  sync naar Supabase (idem — writeSessionRow/sbPostQ zijn niet aangeraakt)
 * 11  bestaande sets zonder rest_duration_s (oude rijen) blijven leesbaar
 * 12  duplicate/retry sync -> zelfde invoer, zelfde uitvoer (puur/deterministisch)
 * 13  meerdere oefeningen -> geen kruisbesmetting tussen oefeningen
 * 14  meerdere sets per oefening (zie 3)
 * 15  sessieherstel -> de ruwe tijdstempels zijn gewone getallen en overleven een
 *     JSON-rondje (localStorage-serialisatie), zoals de rest van sessionLog/st.active al deed
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

console.log('\n[MASTER SPRINT v4.51.0] Rustduur per set — data foundation');

/* ── A. CalcCore.restDurationS — de zuivere regel zelf ──────────────────── */
console.log('\nA. CalcCore.restDurationS (rest_duration.v1)');
const T0 = 1_000_000_000_000; // willekeurig vast referentiepunt (epoch ms)

eq(CalcCore.restDurationS(T0, T0 + 75_000, 0, 0), 75, 'A1: normale rustduur (75s)');
eq(CalcCore.restDurationS(null, T0 + 75_000, 0, 0), null, 'A2 (eis 7): ontbrekende prev-tijdstempel -> unavailable');
eq(CalcCore.restDurationS(T0, null, 0, 0), null, 'A2b (eis 7): ontbrekende rest-eind-tijdstempel -> unavailable');
eq(CalcCore.restDurationS(T0, T0 + 10 * 60_000, 0, 0), 600, 'A3 (eis 4): lange rust (10 min)');
eq(CalcCore.restDurationS(T0, T0 + 5_000, 0, 0), 5, 'A4 (eis 5): korte rust (5s)');
eq(CalcCore.restDurationS(T0, T0, 0, 0), 0, 'A5: direct overgeslagen (0s) is een geldige gemeten waarde, geen unavailable');
eq(CalcCore.restDurationS(T0, T0 - 5_000, 0, 0), null, 'A6 (eis 6): negatieve tijd -> unavailable, nooit geclampt naar 0');
eq(CalcCore.restDurationS(T0, T0 + 3601_000, 0, 0), null, 'A7: > REST_MAX_DUUR_S (1u) -> onwaarschijnlijk, unavailable');
eq(CalcCore.restDurationS(T0, T0 + 3600_000, 0, 0), 3600, 'A8: exact op de grens (1u) telt nog mee');
eq(CalcCore.restDurationS(T0, T0 + 90_000, 10_000, 30_000), 70, 'A9 (eis 8): 20s gepauzeerde tijd wordt uit de meting gefilterd');
eq(CalcCore.restDurationS(T0, T0 + 90_000, 10_000, 10_000), 90, 'A10: geen pauze-toename -> geen aftrek');
eq(CalcCore.restDurationS(T0, T0 + 90_000, 30_000, 10_000), 90, 'A11: een dalende pauzeteller (corrupt) wordt genegeerd, niet als negatieve aftrek gebruikt');
eq(CalcCore.restDurationS('abc', T0, 0, 0), null, 'A12: niet-numerieke invoer -> unavailable, geen crash');
eq(CalcCore.restDurationS(T0, Infinity, 0, 0), null, 'A13: niet-eindige invoer -> unavailable');
ok(CalcCore.restDurationS(T0, T0 + 1000, 0, 0) === CalcCore.restDurationS(T0, T0 + 1000, 0, 0), 'A14 (eis 12): deterministisch bij identieke invoer');

/* ── B. buildStrengthSessionRow — de ECHTE schrijfweg, met de nieuwe tijdstempels ── */
console.log('\nB. buildStrengthSessionRow: rest_duration_s in sets_detail');
const opts = { date: '2026-08-20', training_type: 'A', note: '', instanceId: 'i1' };

// eis 2: eerste set heeft nooit een voorafgaande rust
const eersteSet = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 8, doneAt: T0, donePausedMs: 0 }
], opts);
eq(eersteSet.setsDetail[0].rest_duration_s, null, 'B1 (eis 2): eerste set -> rest_duration_s = null');

// eis 1 + 3 + 14: meerdere sets, elk met een eigen, correcte rustduur
const meerdereSets = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0,             donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000,   donePausedMs: 0, restEndAt: T0 + 120_000,  restEndPausedMs: 0 },
  { kg: 110, effKg: 110, reps: 3, rpe: 9, doneAt: T0 + 500_000,   donePausedMs: 0, restEndAt: T0 + 300_000,  restEndPausedMs: 0 }
], opts);
eq(meerdereSets.setsDetail[0].rest_duration_s, null, 'B2: set 1 -> null');
eq(meerdereSets.setsDetail[1].rest_duration_s, 120, 'B3 (eis 1/3): set 2 -> 120s rust (einde set1 T0 -> restEnd T0+120s)');
eq(meerdereSets.setsDetail[2].rest_duration_s, 100, 'B4 (eis 3/14): set 3 -> 100s rust (einde set2 T0+200s -> restEnd T0+300s)');
// bestaande velden blijven exact gelijk
eq(meerdereSets.row.weight, 110, 'B5: kop-gewicht ongewijzigd (regressie)');
eq(meerdereSets.row.sets, 3, 'B6: sets-telling ongewijzigd (regressie)');

// eis 7: ontbrekende restEndAt (bv. sets buiten volgorde afgevinkt) -> unavailable, geen gok
const zonderRestEnd = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0 } // geen restEndAt
], opts);
eq(zonderRestEnd.setsDetail[1].rest_duration_s, null, 'B7 (eis 7): geen restEndAt -> rest_duration_s = null, niet geschat');

// eis 6: corrupte/negatieve volgorde (restEnd vóór het einde van de vorige set) -> unavailable
const negatieveVolgorde = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0 + 100_000, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0, restEndAt: T0, restEndPausedMs: 0 }
], opts);
eq(negatieveVolgorde.setsDetail[1].rest_duration_s, null, 'B8 (eis 6): restEndAt vóór vorige doneAt -> unavailable');

// eis 8: onderbroken sessie — gepauzeerde tijd tussen de twee sets moet eruit gefilterd worden
const onderbroken = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 5_000 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 300_000, donePausedMs: 0, restEndAt: T0 + 180_000, restEndPausedMs: 65_000 }
], opts);
// ruwe spanne = 180s, gepauzeerd tussen de twee momenten = 65s - 5s = 60s -> gemeten rust = 120s
eq(onderbroken.setsDetail[1].rest_duration_s, 120, 'B9 (eis 8): 60s pauze correct uit de rustmeting gefilterd');

// eis 11: bestaande/oude sets zonder enige tijdstempel blijven werken — nooit een crash, nooit een gok
const oudeSetsZonderTijdstempels = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8 }
], opts);
eq(oudeSetsZonderTijdstempels.setsDetail[0].rest_duration_s, null, 'B10 (eis 11): oude set 1 zonder tijdstempels -> null, geen crash');
eq(oudeSetsZonderTijdstempels.setsDetail[1].rest_duration_s, null, 'B11 (eis 11): oude set 2 zonder tijdstempels -> null, geen crash');
eq(oudeSetsZonderTijdstempels.setsDetail[1].kg, 105, 'B12 (eis 11): bestaande velden (kg/reps/rpe) blijven intact op oude rijen');

// eis 12: dezelfde invoer nogmaals (zoals een sync-retry na een mislukte eerste poging)
// levert BYTE-IDENTIEKE sets_detail op — geen tweede, afwijkende meting.
const retry1 = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0, restEndAt: T0 + 120_000, restEndPausedMs: 0 }
], opts);
const retry2 = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0, restEndAt: T0 + 120_000, restEndPausedMs: 0 }
], opts);
eq(retry1.setsDetail, retry2.setsDetail, 'B13 (eis 12): identieke invoer (retry) -> identieke sets_detail');

// eis 13: meerdere oefeningen — elke buildStrengthSessionRow-aanroep is onafhankelijk, geen
// gedeelde/lekkende state tussen oefeningen (elke aanroep krijgt zijn eigen ws-array).
const squat = buildStrengthSessionRow('squat', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 0, restEndAt: T0 + 120_000, restEndPausedMs: 0 }
], opts);
const bench = buildStrengthSessionRow('bench', [
  { kg: 60, effKg: 60, reps: 8, rpe: 6, doneAt: T0 + 1_000_000, donePausedMs: 0 },
  { kg: 65, effKg: 65, reps: 6, rpe: 7, doneAt: T0 + 1_300_000, donePausedMs: 0, restEndAt: T0 + 1_240_000, restEndPausedMs: 0 }
], opts);
eq(squat.setsDetail[1].rest_duration_s, 120, 'B14 (eis 13): squat-rust ongewijzigd naast een andere oefening');
eq(bench.setsDetail[1].rest_duration_s, 240, 'B15 (eis 13): bench-rust correct, geen kruisbesmetting met squat-tijdstempels');

/* ── C. Sessieherstel (eis 15) — ruwe tijdstempels overleven een JSON-rondje ───── */
console.log('\nC. Sessieherstel — tijdstempels overleven localStorage-serialisatie');
const setMetTijdstempels = { kg: 105, effKg: 105, reps: 5, rpe: 8, doneAt: T0 + 200_000, donePausedMs: 1234, restEndAt: T0 + 120_000, restEndPausedMs: 567 };
const naJsonRondje = JSON.parse(JSON.stringify(setMetTijdstempels));
eq(naJsonRondje, setMetTijdstempels, 'C1 (eis 15): doneAt/restEndAt/pausedMs zijn gewone getallen, geserialiseerd zonder verlies');
const herrekend = buildStrengthSessionRow('sq', [
  { kg: 100, effKg: 100, reps: 5, rpe: 7, doneAt: T0, donePausedMs: 0 },
  naJsonRondje
], opts).setsDetail[1].rest_duration_s;
// let op: naJsonRondje draagt restEndPausedMs=567 (prev donePausedMs=0) -> 567ms pauze wordt
// terecht afgetrokken van de 120.000ms ruwe spanne = 119.433s -> afgerond 119s.
eq(herrekend, 119, 'C2 (eis 15): na hervatten (JSON-rondje) rekent buildStrengthSessionRow nog exact hetzelfde uit (incl. pauze-correctie)');

/* ── D. Architectuurcontrole — AI mag rest_duration_s niet zelf verzinnen/berekenen ── */
console.log('\nD. Architectuurcontrole (Fase 7)');
ok(typeof CalcCore.restDurationS === 'function', 'D1: rest_duration.v1 leeft in de Calculation Core, niet los in de UI');
ok(!/Math\.random|prompt\(|Anthropic|claude|coach\.js/i.test(CalcCore.restDurationS.toString()), 'D2: geen AI/gokken/niet-determinisme in de regel zelf');
ok(CalcCore.VERSIONS.rest_duration === 'rest_duration.v1', 'D3: versie vastgelegd in VERSIONS (reproduceerbaar/auditbaar)');

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
console.log(fail === 0 ? '✅ Rustduur per set: puur, deterministisch en additief.' : '❌ Rustduur per set NIET groen.');
process.exitCode = fail === 0 ? 0 : 1;
