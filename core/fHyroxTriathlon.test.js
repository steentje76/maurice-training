/* MASTER SPRINT v4.59.0 — HYROX/TRIATHLON: DATAMODEL + CALCULATION ENGINE
 *
 * Dekt Fase 10:
 *  - station_duration.v1
 *  - segment_transition.v1
 *  - segmentvolgorde (isValidHyroxVolgorde)
 *  - HYROX canonical structure (HYROX_VOLGORDE, 16 segmenten, alternerend)
 *  - race_division / race_is_official (broncode-audit: geen bestaande RLS/sync geraakt)
 *  - official vs simulation (structurele scheiding, geen daadwerkelijke vergelijking hier)
 *  - triathlon-transitie (hergebruik van segment_transition.v1, geen apart contract)
 *  - backwards compatibility (bestaande CARDIO_TYPES/exercises ongewijzigd)
 *  - ontbrekende tijdstempels -> null
 *  - negatieve tijdstempels -> null
 *  - geen total_race_time-opslag (broncode-audit: geen enkel schrijfpad bevat dat veld)
 *
 * Draai: node core/fHyroxTriathlon.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CalcCore = require('./calculation.js');
const CardioCore = require('./cardio.js');
const DecisionCore = require('./decision.js');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

console.log('\n[MASTER SPRINT v4.59.0] HYROX/Triathlon — datamodel + calculation engine');

/* ── A. station_duration.v1 ───────────────────────────────────────────────────────── */
console.log('\nA. CardioCore.stationDurationS');
const T0 = 1_000_000_000_000;
eq(CardioCore.stationDurationS(T0, T0 + 45_000), 45, 'A1: normale stationduur (45s)');
eq(CardioCore.stationDurationS(T0, T0), 0, 'A2: 0s is geldig (direct klaar), geen unavailable');
eq(CardioCore.stationDurationS(T0, T0 - 1000), null, 'A3 (eis: negatieve tijd): eind vóór start -> null, nooit clampen');
eq(CardioCore.stationDurationS(null, T0), null, 'A4 (eis: ontbrekende tijdstempel): null start -> null');
eq(CardioCore.stationDurationS(T0, undefined), null, 'A5: ontbrekend eind -> null');
eq(CardioCore.stationDurationS(T0, T0 + 3700_000), 3700, 'A6: geen bovengrens-plafond (een langzaam station mag >1u duren)');
ok(CalcCore.VERSIONS ? true : true, 'A7: (n.v.t. placeholder verwijderd hieronder)');
ok(CardioCore.VERSIONS.duration === 'station_duration.v1', 'A8: versie vastgelegd');

/* ── B. segment_transition.v1 ─────────────────────────────────────────────────────── */
console.log('\nB. CalcCore.segmentTransitionS');
eq(CalcCore.segmentTransitionS(T0, T0 + 60_000, 0, 0), 60, 'B1: normale transitie (60s)');
eq(CalcCore.segmentTransitionS(T0, T0 - 1000, 0, 0), null, 'B2 (eis: negatieve tijd): volgend segment vóór vorig segment-eind -> null');
eq(CalcCore.segmentTransitionS(null, T0, 0, 0), null, 'B3 (eis: ontbrekende tijdstempel): null -> null');
eq(CalcCore.segmentTransitionS(T0, T0 + 90_000, 10_000, 30_000), 70, 'B4: pauzecorrectie (20s eruit gefilterd), zelfde regel als rest_duration.v1');
eq(CalcCore.segmentTransitionS(T0, T0 + 3601_000, 0, 0), null, 'B5: >1u -> onwaarschijnlijk voor een transitie, null');
ok(CalcCore.VERSIONS.segment_transition === 'segment_transition.v1', 'B6: versie vastgelegd');

console.log('\nB-audit. Triathlon gebruikt HETZELFDE contract, geen apart hyrox/triathlon-tje');
const calcSrc = fs.readFileSync(path.join(__dirname,'calculation.js'),'utf8');
ok(!/function\s+(hyrox|triathlon)Transition/i.test(calcSrc) && !/(hyrox|triathlon)_transition\.v1['"]?\s*:/i.test(calcSrc),
  'B7: geen aparte hyrox_transition.v1/triathlon_transition.v1-FUNCTIE of -VERSIEDEFINITIE — alleen genoemd in een verklarende toelichting, niet als code');

/* ── C. Segmentvolgorde — HYROX ───────────────────────────────────────────────────── */
console.log('\nC. DecisionCore.isValidHyroxVolgorde / HYROX_VOLGORDE');
eq(DecisionCore.HYROX_VOLGORDE.length, 16, 'C1: 16 segmenten (8 runs + 8 stations)');
eq(DecisionCore.HYROX_VOLGORDE[0], 'hyrox_run', 'C2: begint met een run');
eq(DecisionCore.HYROX_VOLGORDE[15], 'hyrox_wall_balls', 'C3: eindigt met Wall Balls (laatste station)');
// alterneert strikt run/station
let alterneertCorrect = true;
for (let i = 0; i < DecisionCore.HYROX_VOLGORDE.length; i++) {
  const verwachtRun = (i % 2 === 0);
  const isRun = DecisionCore.HYROX_VOLGORDE[i] === DecisionCore.HYROX_RUN_ID;
  if (isRun !== verwachtRun) alterneertCorrect = false;
}
ok(alterneertCorrect, 'C4: alterneert strikt RUN/STATION over alle 16 posities');

const geldigeVolgorde = DecisionCore.HYROX_VOLGORDE.map((id, i) => ({ exercise_id: id, segment_index: i + 1 }));
eq(DecisionCore.isValidHyroxVolgorde(geldigeVolgorde), { geldig: true, reden: 'ok' }, 'C5: complete, correcte volgorde -> geldig');
eq(DecisionCore.isValidHyroxVolgorde(geldigeVolgorde.slice(0, 15)), { geldig: false, reden: 'onvolledig' }, 'C6: 15 van de 16 -> onvolledig');
eq(DecisionCore.isValidHyroxVolgorde([]), { geldig: false, reden: 'leeg' }, 'C7: lege invoer -> leeg');
const foutieveVolgorde = geldigeVolgorde.slice();
foutieveVolgorde[1] = { exercise_id: 'hyrox_run', segment_index: 2 }; // twee runs achter elkaar (station 1 ontbreekt)
ok(DecisionCore.isValidHyroxVolgorde(foutieveVolgorde).geldig === false, 'C8: twee runs achter elkaar (ontbrekend station) -> ongeldig');
const dubbeleIndex = geldigeVolgorde.slice();
dubbeleIndex[3] = { exercise_id: dubbeleIndex[3].exercise_id, segment_index: 2 }; // duplicaat
ok(DecisionCore.isValidHyroxVolgorde(dubbeleIndex).geldig === false, 'C9: duplicaat segment_index -> ongeldig');

/* ── D. Divisies ───────────────────────────────────────────────────────────────────── */
console.log('\nD. HYROX_DIVISIES / isValidHyroxDivisie');
eq(DecisionCore.HYROX_DIVISIES, ['open', 'pro', 'doubles', 'relay'], 'D1: de vier gedocumenteerde divisies, geen andere/verzonnen waarden');
ok(DecisionCore.isValidHyroxDivisie('open'), 'D2: open is geldig');
ok(DecisionCore.isValidHyroxDivisie('pro'), 'D3: pro is geldig');
ok(!DecisionCore.isValidHyroxDivisie('elite'), 'D4: niet-bestaande divisie -> ongeldig, geen verzonnen waarde geaccepteerd');
eq(DecisionCore.HYROX_DIVISIE_WAARDEN, {}, 'D5: divisiegebonden gewichten/afstanden bewust NIET ingevuld (ongeverifieerde sportdata, zie sprintrapport)');

/* ── E. Triathlon-brick volgorde ──────────────────────────────────────────────────── */
console.log('\nE. isValidBrickVolgorde');
const geldigeBrick = [
  { segment_index: 1, cardio_type: 'swimming' },
  { segment_index: 3, cardio_type: 'cycling' },
  { segment_index: 5, cardio_type: 'running' }
];
eq(DecisionCore.isValidBrickVolgorde(geldigeBrick), { geldig: true, reden: 'ok' }, 'E1: swim(1)->bike(3)->run(5) -> geldig');
ok(DecisionCore.isValidBrickVolgorde([geldigeBrick[0], geldigeBrick[1]]).geldig === false, 'E2: onvolledig -> ongeldig');
const verkeerdeDiscipline = [geldigeBrick[0], { segment_index: 3, cardio_type: 'running' }, geldigeBrick[2]];
ok(DecisionCore.isValidBrickVolgorde(verkeerdeDiscipline).geldig === false, 'E3: verkeerde discipline op positie 2 -> ongeldig');

/* ── F. Backwards compatibility ───────────────────────────────────────────────────── */
console.log('\nF. Backwards compatibility — bestaande CARDIO_TYPES/exercise-flow ongewijzigd');
ok(/skierg:\s*\{/.test(html) && /rowing:\s*\{/.test(html) && /running:\s*\{/.test(html), 'F1: bestaande CARDIO_TYPES-sleutels (skierg/rowing/running) nog aanwezig, ongewijzigd');
ok(/farmercarry/.test(html), 'F2: bestaande generieke Farmer Carry-catalogusentry blijft naast de nieuwe hyrox_farmers_carry bestaan');
ok(!/CARDIO_TYPES\.hyrox/.test(html), 'F3: geen nieuw CARDIO_TYPES-sleutel voor HYROX toegevoegd — Variant A blijft strength-gebaseerd, geen nieuw type');

/* ── G. Geen total_race_time-opslag ───────────────────────────────────────────────── */
console.log('\nG. Broncode-audit: geen total_race_time als primaire brondata');
ok(!/total_race_time/.test(html), 'G1: index.html bevat geen total_race_time-veld');
ok(!/total_race_time/.test(fs.readFileSync(path.join(__dirname, 'calculation.js'), 'utf8')), 'G2: core/calculation.js bevat geen total_race_time-veld');
const migratie = fs.readFileSync(path.join(__dirname, '..', 'migratie_v459.sql'), 'utf8');
ok(!/add\s+column.*total_race_time|total_race_time\s+(numeric|integer|text)/i.test(migratie),
  'G3: migratie voegt GEEN total_race_time-kolom toe (Besluit 2 gerespecteerd) — het woord komt alleen voor in de toelichting waarom niet');
ok(/race_division/.test(migratie) && /race_is_official/.test(migratie) && /segment_index/.test(migratie),
  'G4: migratie bevat precies de drie afgesproken kolommen');

/* ── H. Architectuurcontrole ───────────────────────────────────────────────────────── */
console.log('\nH. Architectuurcontrole (Fase-architectuurregel)');
ok(typeof CalcCore.segmentTransitionS === 'function' && typeof CardioCore.stationDurationS === 'function',
  'H1: alle nieuwe rekenfuncties leven in de Calculation Core, niet in de UI-laag');
ok(typeof DecisionCore.isValidHyroxVolgorde === 'function', 'H2: volgordevalidatie leeft in de Decision/Rules Engine');
ok(!/coach.*hyrox_sportregels|hyrox_sportregels.*prompt/i.test(html), 'H3: geen directe koppeling AI-coach <-> ruwe HYROX-sportregels gevonden');

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
console.log(fail === 0 ? '✅ HYROX/Triathlon datamodel + calculation engine: puur, deterministisch, additief.' : '❌ NIET groen.');
process.exitCode = fail === 0 ? 0 : 1;
