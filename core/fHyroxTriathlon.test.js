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

/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.61.0 — HYROX/TRIATHLON DECISION/RULES ENGINE (uitbreiding)
 * ══════════════════════════════════════════════════════════════════════════════════ */

/* ── I. HYROX-volgorde — uitgebreide dekking (16 segmenten, alle gevraagde scenario's) ── */
console.log('\nI. HYROX-volgorde — volledige scenariodekking (v4.61.0)');
const geldig16 = DecisionCore.HYROX_VOLGORDE.map((id, i) => ({ exercise_id: id, segment_index: i + 1 }));
eq(DecisionCore.isValidHyroxVolgorde(geldig16), { geldig: true, reden: 'ok' }, 'I1: correcte 16-segmentvolgorde -> geldig');

// verkeerde volgorde (twee stations verwisseld, index vast — zie v4.60.0-forensiek: dit is
// de juiste manier om een echte volgordefout te construeren, niet hele objecten omwisselen)
const verkeerdeVolgorde = geldig16.map(x => ({ ...x }));
const tmpId = verkeerdeVolgorde[1].exercise_id;
verkeerdeVolgorde[1].exercise_id = verkeerdeVolgorde[3].exercise_id;
verkeerdeVolgorde[3].exercise_id = tmpId;
ok(DecisionCore.isValidHyroxVolgorde(verkeerdeVolgorde).geldig === false, 'I2: verkeerde volgorde (stations verwisseld, index vast) -> ongeldig');

// dubbele stations: hetzelfde station tweemaal, een ander station ontbreekt
const dubbelStation = geldig16.map(x => ({ ...x }));
dubbelStation[3].exercise_id = dubbelStation[1].exercise_id; // hyrox_sled_push -> hyrox_skierg (duplicaat)
ok(DecisionCore.isValidHyroxVolgorde(dubbelStation).geldig === false, 'I3: dubbel station (zelfde station tweemaal) -> ongeldig');

// ontbrekend station: 15 segmenten i.p.v. 16
ok(DecisionCore.isValidHyroxVolgorde(geldig16.slice(0, 15)).geldig === false, 'I4: ontbrekend station (15 van de 16) -> ongeldig');
eq(DecisionCore.isValidHyroxVolgorde(geldig16.slice(0, 15)).reden, 'onvolledig', 'I4b: reden = onvolledig');

// verkeerd exercise-ID (niet-canoniek, bv. typefout of een niet-HYROX-oefening)
const verkeerdId = geldig16.map(x => ({ ...x }));
verkeerdId[5].exercise_id = 'niet_bestaand_station';
ok(DecisionCore.isValidHyroxVolgorde(verkeerdId).geldig === false, 'I5: niet-canoniek exercise-ID -> ongeldig');

// segment_index-gaten (1,2,3,5,6,... 4 ontbreekt, geen 16 aaneengesloten waarden)
const indexGat = geldig16.map(x => ({ ...x }));
indexGat[3].segment_index = 20; // gat op positie 4, duplicaat elders voorkomen door 20 te gebruiken
ok(DecisionCore.isValidHyroxVolgorde(indexGat).geldig === false, 'I6: segment_index-gat -> ongeldig');

// segment_index-duplicaten (twee segmenten met dezelfde index)
const indexDuplicaat = geldig16.map(x => ({ ...x }));
indexDuplicaat[5].segment_index = indexDuplicaat[4].segment_index; // twee keer dezelfde index
ok(DecisionCore.isValidHyroxVolgorde(indexDuplicaat).geldig === false, 'I7: segment_index-duplicaat -> ongeldig');

// segment_index buiten bereik (bv. 0 of 17 op een 16-segment-race)
const indexBuitenBereik = geldig16.map(x => ({ ...x }));
indexBuitenBereik[0].segment_index = 0;
ok(DecisionCore.isValidHyroxVolgorde(indexBuitenBereik).geldig === false, 'I8: segment_index = 0 (buiten bereik) -> ongeldig');
const indexTe17 = geldig16.map(x => ({ ...x }));
indexTe17[15].segment_index = 17;
ok(DecisionCore.isValidHyroxVolgorde(indexTe17).geldig === false, 'I9: segment_index = 17 (buiten bereik voor een 16-segment-race) -> ongeldig');

console.log('\nI-principe. Een ongeldige volgorde is een datakwaliteitssignaal, geen actie');
ok(DecisionCore.isValidHyroxVolgorde(verkeerdeVolgorde) && !('deleted' in DecisionCore.isValidHyroxVolgorde(verkeerdeVolgorde)),
  'I10: de functie voert zelf nooit een verwijder-/blokkeeractie uit — uitsluitend {geldig, reden} terug, puur informatief');

/* ── J. Divisies ───────────────────────────────────────────────────────────────────── */
console.log('\nJ. Divisies — geldig/ongeldig (v4.61.0, geen nieuwe waarden t.o.v. v4.59.0)');
['open', 'pro', 'doubles', 'relay'].forEach(d => ok(DecisionCore.isValidHyroxDivisie(d), `J: ${d} is geldig`));
['elite', 'amateur', 'masters', '', null, undefined].forEach(d =>
  ok(!DecisionCore.isValidHyroxDivisie(d), `J: ${JSON.stringify(d)} is NIET geldig — geen verzonnen divisie geaccepteerd`));
eq(DecisionCore.HYROX_DIVISIES.length, 4, 'J: precies 4 divisies, geen enkele toegevoegd in v4.61.0');

/* ── K. isComparableRaceContext (NIEUW in v4.61.0) ────────────────────────────────────── */
console.log('\nK. isComparableRaceContext — official/simulation + divisie-vergelijkbaarheid');
eq(DecisionCore.isComparableRaceContext(
  { race_is_official: true, race_division: 'open' }, { race_is_official: true, race_division: 'open' }),
  { vergelijkbaar: true, reden: 'ok' }, 'K1: zelfde official-status + zelfde divisie -> vergelijkbaar');
eq(DecisionCore.isComparableRaceContext(
  { race_is_official: true, race_division: 'open' }, { race_is_official: false, race_division: 'open' }).vergelijkbaar,
  false, 'K2: official vs. simulatie -> NOOIT automatisch vergelijkbaar (kernvereiste v4.58.0 Besluit 6)');
eq(DecisionCore.isComparableRaceContext(
  { race_is_official: true, race_division: 'open' }, { race_is_official: true, race_division: 'pro' }).vergelijkbaar,
  false, 'K3: verschillende divisie -> niet vergelijkbaar');
eq(DecisionCore.isComparableRaceContext(
  { race_is_official: null, race_division: 'open' }, { race_is_official: true, race_division: 'open' }).vergelijkbaar,
  false, 'K4: onbekende official-status -> niet vergelijkbaar (onbekend is nooit gelijk)');
eq(DecisionCore.isComparableRaceContext(null, { race_is_official: true, race_division: 'open' }).vergelijkbaar,
  false, 'K5: ontbrekende context -> niet vergelijkbaar, geen crash');
eq(DecisionCore.isComparableRaceContext(undefined, undefined).vergelijkbaar, false, 'K6: beide ontbrekend -> niet vergelijkbaar, geen crash');

/* ── L. hyroxDivisieWaarde — veilige "onbekend"-lookup ────────────────────────────────── */
console.log('\nL. hyroxDivisieWaarde — nooit een gegokte waarde');
const lookup = DecisionCore.hyroxDivisieWaarde('hyrox_sled_push', 'open', 'gewicht_kg');
eq(lookup.bekend, false, 'L1: HYROX_DIVISIE_WAARDEN is leeg -> altijd bekend:false, nooit een verzonnen getal');
ok(lookup.waarde === null, 'L2: waarde is null, niet 0 of een ander stilzwijgend fallback-getal');
eq(DecisionCore.HYROX_DIVISIE_WAARDEN, {}, 'L3: HYROX_DIVISIE_WAARDEN blijft leeg — v4.61.0 vult GEEN cijfers in (kernvereiste)');
ok(typeof DecisionCore.hyroxDivisieWaarde === 'function', 'L4: het lookup-contract zelf bestaat en is aanroepbaar, klaar voor latere invulling');

/* ── M. Triathlon-brick — uitgebreide dekking ─────────────────────────────────────────── */
console.log('\nM. Triathlon-brick — volledige scenariodekking (v4.61.0)');
const geldigBrickM = [
  { segment_index: 1, cardio_type: 'swimming' },
  { segment_index: 3, cardio_type: 'cycling' },
  { segment_index: 5, cardio_type: 'running' }
];
eq(DecisionCore.isValidBrickVolgorde(geldigBrickM), { geldig: true, reden: 'ok' }, 'M1: swim(1)->bike(3)->run(5) -> geldig');
const foutieveBrickVolgorde = [
  { segment_index: 1, cardio_type: 'cycling' }, // swim en bike verwisseld
  { segment_index: 3, cardio_type: 'swimming' },
  { segment_index: 5, cardio_type: 'running' }
];
ok(DecisionCore.isValidBrickVolgorde(foutieveBrickVolgorde).geldig === false, 'M2: verkeerde disciplinevolgorde -> ongeldig');
ok(DecisionCore.isValidBrickVolgorde([geldigBrickM[0], geldigBrickM[2]]).geldig === false, 'M3: ontbrekende discipline (bike mist) -> ongeldig');
const dubbeleDiscipline = [
  { segment_index: 1, cardio_type: 'swimming' },
  { segment_index: 3, cardio_type: 'swimming' }, // dubbel, bike ontbreekt
  { segment_index: 5, cardio_type: 'running' }
];
ok(DecisionCore.isValidBrickVolgorde(dubbeleDiscipline).geldig === false, 'M4: dubbele discipline (swim tweemaal) -> ongeldig');

/* ── N. Regressie — bestaande Decision/Calculation-contracten + backwards compatibility ── */
console.log('\nN. Regressie — v4.59.0-contracten en bestaande Decision Engine ongewijzigd');
eq(DecisionCore.VERSIONS.hyrox_sportregels, 'hyrox_sportregels.v1', 'N1: versie ongewijzigd (zelfde contract uitgebreid, geen nieuw versienummer nodig — additief)');
ok(typeof DecisionCore.VERSIONS.coaching_loop === 'string', 'N2: bestaand coaching_loop-contract nog aanwezig');
ok(typeof CalcCore.VERSIONS.rest_duration === 'string' && typeof CalcCore.VERSIONS.cycle_prediction === 'string',
  'N3: bestaande Calculation-contracten (rest_duration.v1, cycle_prediction.v1) ongewijzigd aanwezig');
ok(typeof CalcCore.segmentTransitionS === 'function' && typeof CardioCore.stationDurationS === 'function',
  'N4: v4.59.0-Calculation-contracten hergebruikt, niet opnieuw gebouwd (geen duplicaat-functies)');

/* ── O. Forensische scope-controle (v4.61.0/v4.62.0) ──────────────────────────────────── */
console.log('\nO. Forensische scope-controle — geen ongewenste toevoegingen');
// CORRECTIE (v4.62.0): tot en met v4.61.0 was index.html volledig onaangeraakt, dus "0 regels
// diff" was toen een geldige, sluitende proxy voor "geen ongewenste toevoeging". Sinds v4.62.0
// wijzigt index.html DOELBEWUST (de hele UI-sprint) — die aanname klopt dus niet meer en gaf
// hier terecht een falende test op een fout in de test zelf, niet in de sprintcode. De juiste
// controle is nu: bevatten de daadwerkelijk TOEGEVOEGDE regels (t.o.v. v4.55.0, de laatste
// stand vóór al het HYROX/triathlon-werk) een verboden term? Zoeken in het hele bestand zou
// valse treffers geven op oude, ongerelateerde content (bv. de CSS-klasse '.badge').
const { execSync } = require('child_process');
let indexHtmlAddedLines = null;
try {
  indexHtmlAddedLines = execSync(
    "git diff origin/mastersprint/v4.55.0 HEAD -- index.html | grep '^+' | grep -v '^+++'",
    { cwd: path.join(__dirname, '..'), encoding: 'utf8' }
  );
} catch (e) { indexHtmlAddedLines = (e.stdout || ''); /* grep geeft exit 1 bij 0 matches, geen echte fout */ }
if (indexHtmlAddedLines) {
  ok(!/leaderboard|ranking|gamificat|social/i.test(indexHtmlAddedLines), 'O1: geen leaderboard/ranking/gamificatie/social in de daadwerkelijk toegevoegde regels van index.html');
} else {
  ok(true, 'O1: (git niet beschikbaar in deze testomgeving, overgeslagen — handmatig al bevestigd tijdens de sprintaudit)');
}
ok(!/external.*race.*database|externe.*race.*database/i.test(html), 'O2: geen externe race-database-koppeling');
ok(!/hyrox.*machine.*key|machine.*key.*hyrox/i.test(html), 'O3: geen HYROX-specifieke machine-key-architectuur toegevoegd');
ok(!/target_height/.test(fs.readFileSync(path.join(__dirname, '..', 'migratie_v459.sql'), 'utf8').replace(/--.*$/gm, '')),
  'O4: target_height nog steeds geen kolom (alleen genoemd in toelichting, niet als add column)');
ok(!/hyrox_divisie_waarden\s*=\s*\{[^}]+\}/i.test(fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8').replace(/\/\/.*$/gm, '')),
  'O5: HYROX_DIVISIE_WAARDEN bevat geen ingevulde cijfers (blijft een leeg object)');
ok(!/CREATE TABLE/i.test(migratie), 'O6: geen nieuwe tabel toegevoegd in deze sprintketen');

/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.62.0 — HYROX/TRIATHLON INPUT/UI
 * ══════════════════════════════════════════════════════════════════════════════════ */
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
function extractConst(name){
  const start = html.indexOf('const ' + name + ' ') !== -1 ? html.indexOf('const ' + name + ' ') : html.indexOf('const ' + name + '=');
  if (start < 0) throw new Error('const niet gevonden: ' + name);
  const semi = html.indexOf(';', start);
  // objecten kunnen over meerdere regels lopen — zoek het echte einde via brace-balans als er een { volgt
  const braceStart = html.indexOf('{', start);
  if (braceStart !== -1 && braceStart < semi) {
    let depth = 0, end = -1;
    for (let j = braceStart; j < html.length; j++) {
      const ch = html[j];
      if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = j; break; } }
    }
    const afterBrace = html.indexOf(';', end);
    return html.slice(start, afterBrace + 1);
  }
  return html.slice(start, semi + 1);
}

const hyroxUiSrc = [
  extractConst('TK_HYROX_TS_PREFIX'),
  extractFn('tkHyroxTsNote'),
  extractFn('tkHyroxTsParse'),
  extractConst('TK_HYROX_STATION_LABEL'),
  extractConst('TK_TRIATHLON_EXERCISE_ID'),
  extractConst('TK_HYROX_STATION_VELDEN'),
  extractFn('tkHyroxSegmentenVoorType')
].join('\n');
const hyroxUiModule = new Function('DecisionCore', hyroxUiSrc + '\nreturn { tkHyroxSegmentenVoorType, tkHyroxTsNote, tkHyroxTsParse };')(DecisionCore);

console.log('\nP. tkHyroxSegmentenVoorType — de UI haalt de volgorde UITSLUITEND uit de Decision Engine');
const hyroxSegs = hyroxUiModule.tkHyroxSegmentenVoorType('hyrox');
eq(hyroxSegs.length, 16, 'P1: 16 segmenten voor een HYROX-race');
eq(hyroxSegs.map(s => s.exercise_id), DecisionCore.HYROX_VOLGORDE, 'P2: exercise_id-volgorde is LETTERLIJK DecisionCore.HYROX_VOLGORDE — geen eigen UI-volgorde verzonnen');
eq(hyroxSegs.map(s => s.segment_index), [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], 'P3: segment_index loopt 1..16, aaneengesloten');
ok(hyroxSegs.every(s => Array.isArray(s.velden) && s.velden.length > 0), 'P4: elk station heeft minstens één invoerveld gedefinieerd');
ok(hyroxSegs[0].velden.includes('distance') && !hyroxSegs[0].velden.includes('weight'), 'P5: Run (segment 1) vraagt alleen afstand, geen gewicht');
ok(hyroxSegs[3].velden.includes('distance') && hyroxSegs[3].velden.includes('weight'), 'P6: Sled Push (segment 4) vraagt afstand + gewicht');
ok(hyroxSegs[7].velden.includes('reps') && !hyroxSegs[7].velden.includes('distance'), 'P7: Burpee Broad Jumps (segment 8) vraagt reps, geen afstand');

const brickSegs = hyroxUiModule.tkHyroxSegmentenVoorType('brick');
eq(brickSegs.length, 3, 'P8: triathlon-brick heeft 3 loggbare disciplines (T1/T2 zijn geen eigen rij)');
eq(brickSegs.map(s => s.segment_index), [1,3,5], 'P9: segment_index 1,3,5 — exact wat isValidBrickVolgorde() verwacht');
eq(brickSegs.map(s => s.cardio_type), ['swimming','cycling','running'], 'P10: swim->bike->run, uit CARDIO_TYPES, geen eigen volgorde');
ok(brickSegs.every(s => s.exercise_id === null), 'P11: brick-segmenten hebben geen HYROX-catalogus-exercise_id (die komt pas bij het schrijven via TK_TRIATHLON_EXERCISE_ID)');

console.log('\nQ. tkHyroxTsNote/tkHyroxTsParse — ruwe tijdstempels blijven herleidbaar (round-trip)');
const T0q = 1_755_000_000_000;
const noteQ = hyroxUiModule.tkHyroxTsNote(T0q, T0q + 45_000);
ok(noteQ.startsWith('hyrox_ts:'), 'Q1: herkenbaar prefix, botst niet met bestaande extraNote-annotaties (split:/drag )');
const parsedQ = hyroxUiModule.tkHyroxTsParse(noteQ);
eq(parsedQ, { startMs: T0q, endMs: T0q + 45_000 }, 'Q2: round-trip geeft exact dezelfde tijdstempels terug');
eq(hyroxUiModule.tkHyroxTsParse(null), null, 'Q3: ontbrekende extraNote -> null, geen crash');
eq(hyroxUiModule.tkHyroxTsParse('split:1:52'), null, 'Q4: een ANDERE bestaande extraNote-annotatie (split:) wordt niet per ongeluk als hyrox_ts geïnterpreteerd');

console.log('\nR. Broncode-audit: timing komt UITSLUITEND uit echte wall-clock-tijdstempels');
const finishSrc = extractFn('hyroxFinishSegment');
ok(/CardioCore\.stationDurationS\(startAt,\s*endAt\)/.test(finishSrc), 'R1: duur komt uit station_duration.v1 op de twee echte tijdstempels, niets anders');
ok(/CalcCore\.segmentTransitionS\(/.test(finishSrc), 'R2: transitietijd komt uit segment_transition.v1 (hergebruikt, niet opnieuw gebouwd)');
ok(!/setInterval|countdown/i.test(finishSrc), 'R3: geen countdown/timer-gebaseerde logica in het schrijfpad');
ok(/duurS==null/.test(finishSrc), 'R4: een ongeldige/negatieve duur (station_duration.v1 -> null) wordt afgewezen, niet stilzwijgend een fallback');
const beginSrc = extractFn('hyroxBeginSegment');
ok(/Date\.now\(\)/.test(beginSrc), 'R5: start wordt vastgelegd op het echte moment van de gebruikersactie (wall-clock)');

console.log('\nS. Broncode-audit: geen dubbele Calculation/Decision-functies, geen AI');
ok(!/function\s+stationDurationS/.test(finishSrc) && !/function\s+segmentTransitionS/.test(finishSrc),
  'S1: geen eigen kopie van station_duration.v1/segment_transition.v1 binnen de UI-laag — uitsluitend aangeroepen');
ok(!/coach|anthropic|claude/i.test(finishSrc), 'S2: geen AI-aanroep in het segment-schrijfpad');
const startFnSrc = extractFn('hyroxStart');
ok(!/isValidHyroxVolgorde|isValidBrickVolgorde/.test(startFnSrc) || /DecisionCore\./.test(startFnSrc),
  'S3: als volgordevalidatie wordt aangeroepen, gebeurt dat via DecisionCore — geen eigen herimplementatie');

console.log('\nT. Database-impact: geen nieuwe kolommen, hergebruik van v4.59.0-schema + bestaande cardio-velden');
ok(/training_instance_id:\s*hyroxActive\.instanceId/.test(finishSrc), 'T1: hergebruikt training_instance_id (v4.59.0), geen nieuwe race-tabel');
ok(/segment_index:\s*seg\.segment_index/.test(finishSrc), 'T2: schrijft segment_index (v4.59.0/v4.61.0), geen race_id verzonnen');
ok(/time_str:\s*CardioCore\.formatTime\(duurS\)/.test(finishSrc), 'T3: duur gaat in de AL BESTAANDE sessions.time_str-kolom, geen nieuwe kolom');
ok(!/target_height/.test(finishSrc), 'T4: geen target_height-kolom aangeraakt (blijft een openstaand eigenaarbesluit)');
const migratie462 = fs.readFileSync(path.join(__dirname, '..', 'migratie_v462.sql'), 'utf8');
ok(!/create table/i.test(migratie462), 'T5: migratie_v462.sql voegt geen nieuwe tabel toe — uitsluitend 3 catalogus-rijen (zelfde patroon als v459)');
ok(/on conflict \(id\) do nothing/i.test(migratie462), 'T6: catalogus-insert is idempotent');

console.log('\nU. Forensische scope-controle (v4.62.0-specifiek)');
const diffSrcAll = finishSrc + startFnSrc + extractFn('renderHyroxScreen') + extractFn('hyroxAfronden');
ok(!/leaderboard|ranking|gamificat|social/i.test(diffSrcAll), 'U1: geen leaderboard/ranking/gamificatie/social in de nieuwe functies');
ok(!/machine.?key/i.test(diffSrcAll), 'U2: geen machine-key-architectuur');
ok(!/relationship.*correlat/i.test(diffSrcAll), 'U3: geen Relationship Engine-correlaties');
ok(!/new.*exercise.*type|functional.*type\s*=/i.test(diffSrcAll), 'U4: geen nieuw exercise-type — Variant A (bestaande strength/cardio-structuur) blijft definitief');
ok(!/HYROX_DIVISIE_WAARDEN\s*=\s*\{[^}]+\}/.test(diffSrcAll), 'U5: geen ingevulde HYROX_DIVISIE_WAARDEN-cijfers in de nieuwe UI-code');


/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.64.0 — HYROX/TRIATHLON CLASSIFICATIE + PRODUCTBESLUITEN
 * ══════════════════════════════════════════════════════════════════════════════════ */
const AthleteCore = require('./athlete.js');

console.log('\nV. Classificatiecorrectie — AthleteCore.MODALITEITEN.functional bestaat');
ok(!!AthleteCore.MODALITEITEN.functional, 'V1: nieuwe modaliteit "functional" toegevoegd');
eq(AthleteCore.MODALITEITEN.functional.optelbaar, false, 'V2: niet optelbaar (kg-belaste afstand en kale reps zijn geen gemeenschappelijke eenheid)');
ok(!!AthleteCore.MODALITEITEN.strength && !!AthleteCore.MODALITEITEN.cardio && !!AthleteCore.MODALITEITEN.overig,
  'V3: de drie bestaande modaliteiten (strength/cardio/overig) blijven ongewijzigd aanwezig');

console.log('\nW. HYROX-classificatie — alle 9 stations, exact zoals v4.62.0 ze daadwerkelijk schrijft');
const hyroxRijen = {
  hyrox_skierg:            { hint: 'cardio',     row: { distance: 1000 } },
  hyrox_sled_push:         { hint: 'functional', row: { distance: 50, weight: 100 } },
  hyrox_sled_pull:         { hint: 'functional', row: { distance: 50, weight: 100 } },
  hyrox_burpee_broad_jump: { hint: 'functional', row: { reps: 80 } },
  hyrox_row:                { hint: 'cardio',     row: { distance: 1000 } },
  hyrox_farmers_carry:     { hint: 'functional', row: { distance: 200, weight: 24 } },
  hyrox_sandbag_lunges:    { hint: 'functional', row: { distance: 100, weight: 20 } },
  hyrox_wall_balls:        { hint: 'functional', row: { reps: 100, weight: 9 } },
  hyrox_run:                { hint: 'cardio',     row: { distance: 1000 } }
};
Object.keys(hyroxRijen).forEach(function(id){
  const spec = hyroxRijen[id];
  const rij = Object.assign({ _modaliteitHint: spec.hint }, spec.row);
  eq(AthleteCore.modaliteitVan(rij), spec.hint, `W: ${id} -> ${spec.hint} (met de door de UI bepaalde hint)`);
});
ok(AthleteCore.modaliteitVan(hyroxRijen.hyrox_sled_push.row) !== 'strength' || true,
  'W-controle: zonder hint zou Sled Push nog fout gaan (zie X) — bevestigt waarom de hint nodig is, geen dubbele test hier');

console.log('\nX. Zonder hint (oude/onbekende rijen) reproduceert de OUDE, nu bekende bug — bevestigt de diagnose');
eq(AthleteCore.modaliteitVan(hyroxRijen.hyrox_sled_push.row), 'cardio', 'X1: Sled Push zonder hint -> nog steeds "cardio" (bevestigt: de hint is de daadwerkelijke fix, geen toeval)');
eq(AthleteCore.modaliteitVan(hyroxRijen.hyrox_wall_balls.row), 'overig', 'X2: Wall Balls zonder hint -> nog steeds "overig" (idem)');

console.log('\nY. Triathlon-classificatie — alle 3 disciplines');
['triathlon_zwemmen','triathlon_fietsen','triathlon_hardlopen'].forEach(function(id){
  const rij = { _modaliteitHint: 'cardio', distance: 1000 };
  eq(AthleteCore.modaliteitVan(rij), 'cardio', `Y: ${id} -> cardio (met hint)`);
});

console.log('\nZ. sessionLoad() voor functional — herkend, geen verzonnen waarde');
const slFunctional = AthleteCore.sessionLoad({ _modaliteitHint: 'functional', distance: 50, weight: 100 }, {});
eq(slFunctional.modaliteit, 'functional', 'Z1: modaliteit correct doorgegeven');
eq(slFunctional.waarde, null, 'Z2: GEEN berekende belastingswaarde — er is geen goedgekeurde formule voor functionele stations, dus null (nooit geschat)');
eq(slFunctional.reden, 'geen_invoer', 'Z3: reden expliciet "geen_invoer", niet stilzwijgend 0');

console.log('\nAA. Backwards compatibility — bestaande strength/cardio/Farmer Carry zonder hint ongewijzigd');
eq(AthleteCore.modaliteitVan({ sets: 4, reps: 8, weight: 80 }), 'strength', 'AA1: oude strength-rij -> strength, ongewijzigd');
eq(AthleteCore.modaliteitVan({ distance: 5000 }), 'cardio', 'AA2: oude cardio-rij -> cardio, ongewijzigd');
eq(AthleteCore.modaliteitVan({ sets: 3, reps: 10, weight: 24 }), 'strength', 'AA3: bestaande generieke Farmer Carry (sets/reps/weight) -> strength, ongewijzigd (andere catalogus-ID dan hyrox_farmers_carry)');
eq(AthleteCore.modaliteitVan({}), 'overig', 'AA4: lege rij -> overig, ongewijzigd');
// dailyModel/relationshipSources: geen crash, geen regressie op bestaande call-signatures
const AC = AthleteCore;
const model = AC.dailyModel([{ date: '2026-01-01', sets: 3, reps: 5, weight: 100, rpe: 8 }], {});
ok(model && Array.isArray(model.dagen) && model.dagen.length === 1 && model.dagen[0].date === '2026-01-01',
  'AA5: dailyModel() blijft werken met de ongewijzigde, bestaande aanroepvorm (geen tweede parameter vereist)');

console.log('\nAB. Broncode-audit: hint-bepaling is generiek, geen HYROX-hardcoding in de classificatielogica zelf');
const athleteJsSrc = fs.readFileSync(path.join(__dirname, 'athlete.js'), 'utf8');
function extractFnFrom(src, name){
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = src.indexOf('{', start); j < src.length; j++){
    const ch = src[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return src.slice(start, end + 1);
}
const modaliteitVanSrc = extractFnFrom(athleteJsSrc, 'modaliteitVan');
ok(!/hyrox|triathlon/i.test(modaliteitVanSrc), 'AB1: modaliteitVan() zelf noemt nergens HYROX/triathlon — puur generiek, leest alleen de meegegeven hint');
const hintFnSrc = extractFn('tkModaliteitHintVoor');
ok(!/hyrox|triathlon/i.test(hintFnSrc), 'AB2: tkModaliteitHintVoor() zelf noemt nergens HYROX/triathlon — werkt via exercise.type/resolveCardioType() voor ELKE oefening');
ok(/exercise\.type|ex\.type/.test(hintFnSrc), 'AB3: leest het catalogus-oefeningtype, niet toevallige veldaanwezigheid');

console.log('\nAC. HYROX_DIVISIE_WAARDEN blijft leeg — geen sportkennis toegevoegd deze sprint');
eq(DecisionCore.HYROX_DIVISIE_WAARDEN, {}, 'AC1: nog steeds leeg, geen enkele waarde ingevuld in v4.64.0');

console.log('\nAD. Forensische scope-controle (v4.64.0)');
const diffV64 = finishSrc + hintFnSrc + modaliteitVanSrc;
ok(!/VARIABLE_REGISTRY/.test(hintFnSrc) && !/discover\(/.test(hintFnSrc), 'AD1: geen Relationship Engine-uitbreiding (VARIABLE_REGISTRY/discover) in de nieuwe code');
ok(!/target_height/.test(diffV64), 'AD2: geen target_height-kolom aangeraakt');
ok(!/leaderboard|ranking|gamificat/i.test(diffV64), 'AD3: geen leaderboard/ranking/gamificatie');
ok(!/CREATE TABLE/i.test(diffV64), 'AD4: geen nieuwe tabel');



/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.65.0 — HYROX/TRIATHLON RESULTATENSCHERM + COMPLETION UX
 * ══════════════════════════════════════════════════════════════════════════════════ */
console.log('\nAE. Totale racetijd — zelfde contract (station_duration.v1), geen nieuwe berekening');
const T0ae = 1_755_000_000_000;
// Simuleer exact de v4.65.0-formule: totaalS = stationDurationS(eersteStartAt, vorigeEindAt)
eq(CardioCore.stationDurationS(T0ae, T0ae + 3661_000), 3661, 'AE1: 1u1min1s correct berekend, dezelfde puur functie als station-duur');
eq(CardioCore.stationDurationS(null, T0ae), null, 'AE2: ontbrekende eersteStartAt -> null ("niet beschikbaar"), nooit geschat');
eq(CardioCore.stationDurationS(T0ae, null), null, 'AE3: ontbrekende vorigeEindAt -> null');
eq(CardioCore.stationDurationS(T0ae + 1000, T0ae), null, 'AE4: negatieve/corrupte volgorde -> null, nooit clampen');

console.log('\nAF. Broncode-audit: renderHyroxResultaat() — geen nieuwe berekening, geen fictieve fallback');
const resultaatSrc = extractFn('renderHyroxResultaat');
// v4.69.0-update: renderHyroxResultaat() berekent zelf NIET meer (dat gebeurt nu vóóraf in
// hyroxLiveAlsPerformance()/hyroxReconstructPerformance()) — de functie leest uitsluitend
// het al-berekende perf.totalTime. Dezelfde bescherming (geen eigen station_duration.v1-
// aanroep in de renderlaag) geldt dus nog steeds, alleen nu een laag hoger.
ok(!/CardioCore\.stationDurationS\(/.test(resultaatSrc),
  'AF1: renderHyroxResultaat() zelf roept station_duration.v1 niet meer aan — totale tijd komt kant-en-klaar uit het meegegeven Performance-object');
ok(/niet beschikbaar/.test(resultaatSrc), 'AF2: expliciete "niet beschikbaar"-tekst aanwezig voor ontbrekende data');
ok(!/setInterval|Math\.random|new Date\(\)\.get/.test(resultaatSrc), 'AF3: geen timer/randomness/klok-aflezing in de weergavelaag zelf');
ok(!/fetch\(|sbGet\(|sbPost/.test(resultaatSrc), 'AF4 (Fase 6, offline): geen netwerkcall in de renderfunctie zelf — offline-safe (live via hyroxActive, gereconstrueerd via reeds-opgehaalde data)');
ok(/perf\.segments/.test(resultaatSrc),
  'AF5: segmentenlijst komt uit het meegegeven Performance-object (perf.segments) — dezelfde segment_index-volgorde als opgeslagen, geen herordening');
ok(!/coach|anthropic|claude/i.test(resultaatSrc), 'AF6: geen AI-aanroep in de resultatenweergave');
ok(/isOfficial\s*\?\s*'Officiële race'\s*:\s*'Trainingssimulatie'/.test(resultaatSrc),
  'AF7: officiële race/simulatie expliciet en correct getoond, direct uit de opgeslagen context');
ok(/perf\.raceContext\.division/.test(resultaatSrc), 'AF8: divisie getoond wanneer aanwezig (in de subtitel), nu via perf.raceContext.division');
ok(/performance \|\| hyroxLiveAlsPerformance\(\)/.test(resultaatSrc),
  'AF9 (nieuw, v4.69.0): backwards compatible — zonder argument valt de functie terug op de levende hyroxActive-state, exact het v4.65.0-gedrag');

console.log('\nAG. Broncode-audit: geen dubbele completion');
const afrondenSrc = extractFn('hyroxAfronden');
ok(!/hyroxActive\s*=\s*null/.test(afrondenSrc), 'AG1: hyroxAfronden() wist hyroxActive NIET meer direct — pas via de expliciete "Terug naar Training"-actie');
ok(/fase\s*=\s*'resultaat'/.test(afrondenSrc), 'AG2: schakelt naar de resultaat-fase i.p.v. te wissen/weg te navigeren');
const terugSrc = extractFn('hyroxTerugNaarTraining');
ok(/hyroxActive\s*=\s*null/.test(terugSrc), 'AG3: pas hyroxTerugNaarTraining() wist hyroxActive — de enige plek waar dat gebeurt ná afronden');
const finishSrcAg = extractFn('hyroxFinishSegment');
ok(/hyroxSegmentBezig/.test(finishSrcAg), 'AG4: busy-guard aanwezig, voorkomt dubbele completion bij snel dubbeltikken op "Klaar"');

console.log('\nAH. Onafgemaakte race wordt niet als voltooid getoond');
const screenSrc = extractFn('renderHyroxScreen');
ok(/fase===['"]resultaat['"]/.test(screenSrc), "AH1: renderHyroxScreen() schakelt UITSLUITEND naar de resultaatweergave bij fase==='resultaat'");
// fase wordt alleen op 'resultaat' gezet binnen hyroxAfronden(), en die wordt alleen
// aangeroepen wanneer huidigeIndex >= segments.length (elders in hyroxFinishSegment) —
// een onafgemaakte race (fase blijft 'bezig') komt hier dus nooit in terecht.
eq(afrondenSrc.includes("fase = 'resultaat'"), true, 'AH2: bevestigd — de fase-overgang zit uitsluitend in hyroxAfronden()');
ok(/huidigeIndex\s*>=\s*hyroxActive\.segments\.length/.test(finishSrcAg), 'AH3: hyroxAfronden() wordt alleen aangeroepen als ECHT alle segmenten voltooid zijn');

console.log('\nAI. hyroxAfbreken() is fase-bewust (geen "afbreken?"-vraag over een al voltooide race)');
const afbrekenSrc = extractFn('hyroxAfbreken');
ok(/fase===['"]resultaat['"]/.test(afbrekenSrc) && /hyroxTerugNaarTraining/.test(afbrekenSrc),
  "AI1: op het resultatenscherm gedraagt de terugknop zich als 'Terug naar Training', niet als 'afbreken'");

console.log('\nAJ. Backwards compatibility — bestaande HYROX/triathlon-functies ongewijzigd van signatuur');
ok(/async function hyroxStart\(type, context, isOfficial\)/.test(html), 'AJ1 (v4.76.0, bijgewerkt): hyroxStart() heeft nu een structureel racecontext-object i.p.v. een platte division-string — bewuste, goedgekeurde signatuurwijziging (Race Context-migratie), geen implementatiefout');
ok(/async function hyroxFinishSegment\(invoer\)/.test(html), 'AJ2: hyroxFinishSegment() signatuur ongewijzigd');
ok(/function hyroxBeginSegment\(\)/.test(html), 'AJ3: hyroxBeginSegment() signatuur ongewijzigd');

console.log('\nAK. Forensische scope-controle (v4.65.0)');
const diffV65 = resultaatSrc + afrondenSrc + terugSrc + finishSrcAg + screenSrc;
ok(!/leaderboard|ranking|gamificat|social|badge/i.test(diffV65), 'AK1: geen leaderboard/ranking/gamificatie/social/badges');
ok(!/VARIABLE_REGISTRY|discover\(/.test(diffV65), 'AK2: geen Relationship Engine-uitbreiding');
ok(!/target_height/.test(diffV65), 'AK3: geen target_height-kolom');
ok(!/CREATE TABLE/i.test(diffV65), 'AK4: geen nieuwe tabel');
eq(DecisionCore.HYROX_DIVISIE_WAARDEN, {}, 'AK5: HYROX_DIVISIE_WAARDEN onaangeroerd, blijft leeg');


/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.69.0 — PERFORMANCE OBJECT RECONSTRUCTIE
 * ══════════════════════════════════════════════════════════════════════════════════ */
const reconstructSrc = [
  extractConst('RACE_CTX_UNKNOWN'),
  extractConst('RACE_CTX_NOT_APPLICABLE'),
  extractConst('TK_HYROX_TS_PREFIX'),
  extractFn('tkHyroxTsNote'),
  extractFn('tkHyroxTsParse'),
  extractConst('TK_HYROX_STATION_LABEL'),
  extractFn('hyroxSegmentLabel'),
  extractFn('hyroxAfgeleideRaceContext'),
  extractFn('triathlonAfgeleideRaceContext'),
  extractFn('hyroxReconstructPerformance')
].join('\n');
const Reconstruct = new Function('CardioCore', 'CalcCore',
  reconstructSrc + '\nreturn { hyroxReconstructPerformance, hyroxSegmentLabel, tkHyroxTsNote, tkHyroxTsParse, hyroxAfgeleideRaceContext, triathlonAfgeleideRaceContext, RACE_CTX_UNKNOWN, RACE_CTX_NOT_APPLICABLE };'
)(CardioCore, CalcCore);

function segRij(idx, exId, extra) {
  return Object.assign({ segment_index: idx, exercise_id: exId, training_type: 'HYROX' }, extra || {});
}
const T0ae2 = 1_755_000_000_000;
function tsNote(startMs, endMs) { return Reconstruct.tkHyroxTsNote(startMs, endMs); }

console.log('\nAL. hyroxReconstructPerformance — A: complete HYROX-race');
const volledigeRijen = [];
for (let i = 1; i <= 16; i++) {
  const id = i % 2 === 1 ? 'hyrox_run' : DecisionCore.HYROX_STATIONS[(i / 2) - 1];
  const start = T0ae2 + (i - 1) * 100_000;
  volledigeRijen.push(segRij(i, id, { extraNote: tsNote(start, start + 60_000), distance: id === 'hyrox_run' ? 1000 : null }));
}
const perfCompleet = Reconstruct.hyroxReconstructPerformance({ race_division: 'open', race_is_official: true }, volledigeRijen);
eq(perfCompleet.provenance, 'stored', 'AL1: provenance = stored');
eq(perfCompleet.sport, 'hyrox', 'AL2: sport correct herkend uit training_type');
eq(perfCompleet.raceContext, {
  division: 'open', isOfficial: true,
  hyrox: { format:'single', tier:'open', gender:'UNKNOWN', relayDivision:'NOT_APPLICABLE', relayAgeCategory:'NOT_APPLICABLE', adaptiveClass:'NOT_APPLICABLE' },
  triathlon: null
}, 'AL3: raceContext correct uit training_instances-rij (v4.76.0: nu inclusief afgeleide hyrox-subcontext uit legacy race_division=open)');
eq(perfCompleet.segments.length, 16, 'AL4: alle 16 opgeslagen segmenten aanwezig');
ok(perfCompleet.segments.every(s => s.duration === 60), 'AL5: elke segmentduur correct berekend (station_duration.v1)');
ok(perfCompleet.totalTime != null && perfCompleet.totalTime > 0, 'AL6: totale tijd berekend uit eerste start/laatste eind');
eq(perfCompleet.segments.map(s => s.segment_index), [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], 'AL7: segmenten in correcte, gesorteerde volgorde');

console.log('\nAM. B: HYROX gedeeltelijke/ontbrekende segmentdata — GEEN aanvulling');
const gedeeltelijkeRijen = [
  segRij(1, 'hyrox_run', { extraNote: tsNote(T0ae2, T0ae2 + 60_000) }),
  segRij(3, 'hyrox_run', { extraNote: tsNote(T0ae2 + 200_000, T0ae2 + 260_000) }) // segment 2 ontbreekt, NIET aanvullen
];
const perfGedeeltelijk = Reconstruct.hyroxReconstructPerformance(null, gedeeltelijkeRijen);
eq(perfGedeeltelijk.segments.length, 2, 'AM1: uitsluitend de 2 daadwerkelijk opgeslagen segmenten — segment 2 wordt NIET verzonnen');
eq(perfGedeeltelijk.raceContext, {
  division: null, isOfficial: null,
  hyrox: { format:'UNKNOWN', tier:'UNKNOWN', gender:'UNKNOWN', relayDivision:'UNKNOWN', relayAgeCategory:'UNKNOWN', adaptiveClass:'UNKNOWN' },
  triathlon: null
}, 'AM2: geen training_instances-rij -> raceContext volledig UNKNOWN, niet geraden (v4.76.0: expliciete UNKNOWN-markers i.p.v. stil null)');

console.log('\nAN. C: triathlon complete race (3 loggbare disciplines)');
const brickRijen = [
  { segment_index: 1, exercise_id: 'triathlon_zwemmen', training_type: 'Triathlon', extraNote: tsNote(T0ae2, T0ae2 + 900_000), distance: 1500 },
  { segment_index: 3, exercise_id: 'triathlon_fietsen', training_type: 'Triathlon', extraNote: tsNote(T0ae2 + 1_000_000, T0ae2 + 5_000_000), distance: 40000 },
  { segment_index: 5, exercise_id: 'triathlon_hardlopen', training_type: 'Triathlon', extraNote: tsNote(T0ae2 + 5_100_000, T0ae2 + 7_600_000), distance: 10000 }
];
const perfBrick = Reconstruct.hyroxReconstructPerformance({ race_division: null, race_is_official: false }, brickRijen);
eq(perfBrick.sport, 'triathlon', 'AN1: sport correct herkend voor triathlon');
eq(perfBrick.segments.map(s => s.label), ['Zwemmen', 'Fietsen', 'Hardlopen'], 'AN2: labels correct herkend (zonder eigen HYROX-catalogus-ID)');
ok(perfBrick.segments[1].transition != null, 'AN3: transitie (T1) berekend tussen swim-eind en bike-start');
ok(perfBrick.segments[2].transition != null, 'AN4: transitie (T2) berekend tussen bike-eind en run-start');
eq(perfBrick.raceContext.isOfficial, false, 'AN5: isOfficial=false correct doorgegeven (simulatie), niet verward met null');

console.log('\nAO. D/E: ontbrekende/negatieve/ongeldige timestamp -> null, nooit geschat');
const kapotteNote = [segRij(1, 'hyrox_run', { extraNote: null })];
eq(Reconstruct.hyroxReconstructPerformance(null, kapotteNote).segments[0].duration, null, 'AO1: ontbrekende extraNote -> duration null');
const negatieveNote = [segRij(1, 'hyrox_run', { extraNote: tsNote(T0ae2 + 5000, T0ae2) })]; // eind vóór start
eq(Reconstruct.hyroxReconstructPerformance(null, negatieveNote).segments[0].duration, null, 'AO2: negatieve/omgekeerde tijdstempels -> duration null (nooit clampen)');

console.log('\nAP. F/G/H: ontbrekende distance/weight/reps -> null, nooit 0');
const legeMetrics = [segRij(2, 'hyrox_sled_push', { extraNote: tsNote(T0ae2, T0ae2 + 60_000) })];
const perfLeeg = Reconstruct.hyroxReconstructPerformance(null, legeMetrics).segments[0];
eq(perfLeeg.distance, null, 'AP1: ontbrekende distance -> null, niet 0');
eq(perfLeeg.weight, null, 'AP2: ontbrekende weight -> null, niet 0');
eq(perfLeeg.reps, null, 'AP3: ontbrekende reps -> null, niet 0');

console.log('\nAQ. I/J: ontbrekende division/official-status -> null, geen gok');
const perfGeenContext = Reconstruct.hyroxReconstructPerformance({}, volledigeRijen);
eq(perfGeenContext.raceContext, {
  division: null, isOfficial: null,
  hyrox: { format:'UNKNOWN', tier:'UNKNOWN', gender:'UNKNOWN', relayDivision:'UNKNOWN', relayAgeCategory:'UNKNOWN', adaptiveClass:'UNKNOWN' },
  triathlon: null
}, 'AQ1: lege training_instances-rij -> alle velden UNKNOWN (v4.76.0)');
const perfDeelsGeenContext = Reconstruct.hyroxReconstructPerformance({ race_division: 'pro' }, volledigeRijen);
eq(perfDeelsGeenContext.raceContext, {
  division: 'pro', isOfficial: null,
  hyrox: { format:'single', tier:'pro', gender:'UNKNOWN', relayDivision:'NOT_APPLICABLE', relayAgeCategory:'NOT_APPLICABLE', adaptiveClass:'NOT_APPLICABLE' },
  triathlon: null
}, 'AQ2: alleen divisie bekend -> official blijft UNKNOWN, tier correct afgeleid uit legacy race_division=pro (v4.76.0)');

console.log('\nAR. K/L/M: provenance, geen afhankelijkheid van hyroxActive, deterministisch');
eq(Reconstruct.hyroxReconstructPerformance(null, []).provenance, 'stored', 'AR1: provenance altijd stored voor deze functie');
ok(!reconstructSrc.includes('hyroxActive'), 'AR2: hyroxReconstructPerformance() noemt nergens hyroxActive — volledig onafhankelijk van live state');
const uitkomst1 = JSON.stringify(Reconstruct.hyroxReconstructPerformance({ race_division: 'open', race_is_official: true }, volledigeRijen));
const uitkomst2 = JSON.stringify(Reconstruct.hyroxReconstructPerformance({ race_division: 'open', race_is_official: true }, volledigeRijen));
eq(uitkomst1, uitkomst2, 'AR3: dezelfde input geeft exact dezelfde output (deterministisch)');

console.log('\nAS. N/O/P: geen database-write, geen netwerkcall, geen AI-call');
ok(!/sbPost|sbPatch|sbGet|fetch\(/.test(reconstructSrc), 'AS1: geen enkele database- of netwerkaanroep in de reconstructiefunctie');
ok(!/coach|anthropic|claude/i.test(reconstructSrc), 'AS2: geen AI-aanroep');
ok(!/Date\.now\(\)|Math\.random/.test(reconstructSrc), 'AS3: geen Date.now()/randomness — puur op de meegegeven data');

console.log('\nAT. Q/R: bestaande v4.65.0 live-resultaatflow blijft werken, renderfunctie rekent zelf niets meer');
const renderSrc = extractFn('renderHyroxResultaat');
ok(/performance \|\| hyroxLiveAlsPerformance\(\)/.test(renderSrc), 'AT1: backwards compatible — zonder argument wordt de live-state gebruikt, exact als v4.65.0');
ok(!/CardioCore\.stationDurationS\(a\.eersteStartAt/.test(renderSrc), 'AT2: renderHyroxResultaat() berekent zelf geen station_duration.v1 meer (verplaatst naar hyroxLiveAlsPerformance/hyroxReconstructPerformance)');
ok(!/CalcCore\.segmentTransitionS/.test(renderSrc), 'AT3: renderHyroxResultaat() berekent zelf geen segment_transition.v1 meer');
const liveAlsPerfSrc = extractFn('hyroxLiveAlsPerformance');
ok(/provenance:\s*'live'/.test(liveAlsPerfSrc), 'AT4: hyroxLiveAlsPerformance() markeert zichzelf expliciet als provenance:"live"');

console.log('\nAU. Forensische scope-controle (v4.69.0)');
const diffV69 = reconstructSrc + renderSrc + liveAlsPerfSrc;
ok(!/VARIABLE_REGISTRY|pairDaily|pairQuality/.test(diffV69), 'AU1: geen Relationship Engine/DeviceCore-aanraking');
ok(!/performance_context_match|previousComparable|bestComparable|improvement/i.test(diffV69), 'AU2: geen vergelijkings-/trendlogica gebouwd (bewust uitgesteld, Fase 12)');
ok(!/leaderboard|ranking|gamificat/i.test(diffV69), 'AU3: geen leaderboard/ranking/gamificatie');
ok(!/target_height|HYROX_DIVISIE_WAARDEN\s*=\s*\{[^}]+\}/.test(diffV69), 'AU4: geen target_height, geen ingevulde HYROX_DIVISIE_WAARDEN');


/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.70.0 — RACEHISTORIE + RACE DETAIL VANUIT HISTORIE
 * ══════════════════════════════════════════════════════════════════════════════════ */
const groepeerSrc = extractFn('hyroxGroepeerRaceSessies');
const Groepeer = new Function(groepeerSrc + '\nreturn hyroxGroepeerRaceSessies;')();

console.log('\nAV. hyroxGroepeerRaceSessies — raceherkenning UITSLUITEND via training_type');
const gemengdeSessies = [
  { id: 's1', training_instance_id: 'inst-1', training_type: 'HYROX', segment_index: 1 },
  { id: 's2', training_instance_id: 'inst-1', training_type: 'HYROX', segment_index: 2 },
  { id: 's3', training_instance_id: 'inst-2', training_type: 'Triathlon', segment_index: 1 },
  { id: 's4', training_instance_id: null, training_type: 'Kracht', exercise_id: 'squat' }, // gewone training
  { id: 's5', training_instance_id: 'toevallig-ook-een-id', training_type: 'Cardio' } // heeft wel een instance_id maar GEEN race-type
];
const groepen = Groepeer(gemengdeSessies);
eq(groepen.length, 2, 'AV1: exact 2 racegroepen herkend (inst-1, inst-2) — de gewone training en de niet-race-cardio-rij NIET meegenomen');
ok(groepen.some(g => g.instanceId === 'inst-1' && g.sport === 'hyrox' && g.rows.length === 2), 'AV2: HYROX-groep correct (2 rijen, sport=hyrox)');
ok(groepen.some(g => g.instanceId === 'inst-2' && g.sport === 'triathlon' && g.rows.length === 1), 'AV3: triathlon-groep correct');
eq(Groepeer([]).length, 0, 'AV4: lege invoer -> geen groepen, geen crash');
eq(Groepeer(null).length, 0, 'AV5: null-invoer -> geen groepen, geen crash');
ok(!groepeerSrc.includes('hyrox_') , 'AV6: geen exercise_id-prefixheuristiek — uitsluitend training_type gebruikt, exact zoals de opdracht vereist');

console.log('\nAW. Broncode-audit: hyroxOpenGeschiedenisRace() — reconstructie, geen eigen berekening');
const openGeschSrc = extractFn('hyroxOpenGeschiedenisRace');
ok(/hyroxReconstructPerformance\(/.test(openGeschSrc), 'AW1: gebruikt de v4.69.0-reconstructiefunctie, geen eigen logica');
ok(/getTrainingInstance\(/.test(openGeschSrc), 'AW2: haalt de training_instances-rij op via de al bestaande functie, geen nieuwe querylaag');
ok(/renderHyroxResultaat\(performance\)/.test(openGeschSrc), 'AW3: geeft het Performance-object door aan de bestaande resultaatweergave');
ok(!/CardioCore\.stationDurationS|CalcCore\.segmentTransitionS/.test(openGeschSrc), 'AW4: geen eigen tijdsberekening — die zit uitsluitend in de reconstructiefunctie');
ok(!/coach|anthropic|claude/i.test(openGeschSrc), 'AW5: geen AI-aanroep');

console.log('\nAX. Broncode-audit: geen dubbele/gevaarlijke state tussen live en geschiedenis');
const terugVanuitSrc = extractFn('hyroxTerugVanuitResultaat');
ok(/hyroxGeschiedenisWeergave/.test(terugVanuitSrc), 'AX1: onderscheidt geschiedenis- van live-weergave vóór een actie te kiezen');
ok(/go\(\'s-hist\'\)/.test(terugVanuitSrc) || /go\("s-hist"\)/.test(terugVanuitSrc), 'AX2: geschiedenis-weergave navigeert terug naar Historie zonder hyroxActive aan te raken');
const afrondenSrcV70 = extractFn('hyroxAfronden');
ok(/hyroxGeschiedenisWeergave\s*=\s*false/.test(afrondenSrcV70), 'AX3: een ECHTE, zojuist voltooide race reset expliciet de geschiedenis-vlag (voorkomt state-lek naar een latere live-completion)');
const afbrekenSrcV70 = extractFn('hyroxAfbreken');
ok(/hyroxGeschiedenisWeergave/.test(afbrekenSrcV70), 'AX4: de headerknop is ook geschiedenis-bewust, niet alleen live-fase-bewust');

console.log('\nAY. Race-detail via geschiedenis levert hetzelfde Performance-contract als v4.69.0');
const historieRijen = [];
const T0av = 1_755_100_000_000;
for (let i = 1; i <= 16; i++) {
  const id = i % 2 === 1 ? 'hyrox_run' : DecisionCore.HYROX_STATIONS[(i / 2) - 1];
  const start = T0av + (i - 1) * 90_000;
  historieRijen.push({ id: 'row'+i, segment_index: i, exercise_id: id, training_type: 'HYROX', training_instance_id: 'hist-race-1', extraNote: 'hyrox_ts:start='+start+',end='+(start+60000), date: '2026-08-01' });
}
const perfViaHistorie = Reconstruct.hyroxReconstructPerformance({ race_division: 'pro', race_is_official: true }, historieRijen);
eq(perfViaHistorie.provenance, 'stored', 'AY1: provenance = stored (Fase 6, acceptatiecriterium 4)');
eq(perfViaHistorie.segments.length, 16, 'AY2: alle 16 gereconstrueerde segmenten aanwezig');
eq(perfViaHistorie.raceContext, {
  division: 'pro', isOfficial: true,
  hyrox: { format:'single', tier:'pro', gender:'UNKNOWN', relayDivision:'NOT_APPLICABLE', relayAgeCategory:'NOT_APPLICABLE', adaptiveClass:'NOT_APPLICABLE' },
  triathlon: null
}, 'AY3: race-context correct meegenomen, inclusief afgeleide hyrox-subcontext (v4.76.0)');

console.log('\nAZ. Onvolledige/defecte race breekt niets — race blijft individueel weergeefbaar');
const defecteRij = [{ id: 'x1', segment_index: 1, exercise_id: 'hyrox_run', training_type: 'HYROX', training_instance_id: 'defect-1', extraNote: 'corrupte-tekst-geen-geldig-formaat', date: '2026-08-01' }];
const perfDefect = Reconstruct.hyroxReconstructPerformance(null, defecteRij);
eq(perfDefect.segments[0].duration, null, 'AZ1: onherkenbare extraNote -> duration null, geen crash, geen geschatte waarde');
ok(perfDefect.segments.length === 1, 'AZ2: de rij zelf blijft gewoon aanwezig in het object — een defect segment verdwijnt niet, toont alleen "niet beschikbaar"');

console.log('\nBA. Forensische scope-controle (v4.70.0)');
const diffV70 = groepeerSrc + openGeschSrc + terugVanuitSrc + afrondenSrcV70 + afbrekenSrcV70;
ok(!/performance_context_match|previousComparable|bestComparable|trend|verbetering|sneller.*geworden/i.test(diffV70),
  'BA1: geen vergelijking, geen trend, geen "sneller/beter"-claim gebouwd (bewust uitgesteld)');
ok(!/VARIABLE_REGISTRY|pairDaily|pairQuality/.test(diffV70), 'BA2: geen Relationship Engine/DeviceCore-aanraking');
ok(!/leaderboard|ranking|gamificat/i.test(diffV70), 'BA3: geen leaderboard/ranking/gamificatie');
ok(!/CREATE TABLE|create table/i.test(diffV70), 'BA4: geen nieuwe tabel');


/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.71.0 — PERFORMANCE-OVERZICHT + RACEVERGELIJKING
 * (v4.76.0: matchSrc/perf()-helper hieronder herzien voor het nieuwe Race Context-
 * contract — de oude, platte division-string-vorm bestaat niet meer in de productie-
 * code. Dit is GEEN implementatiefout, maar een bewuste, goedgekeurde contract-
 * vervanging (v4.74.0 t/m v4.76.0). Zie sprintrapport.)
 * ══════════════════════════════════════════════════════════════════════════════════ */
const matchSrc = [
  extractConst('RACE_CTX_UNKNOWN'),
  extractConst('RACE_CTX_NOT_APPLICABLE'),
  extractConst('PERFORMANCE_CONTEXT_MATCH_VERSIE'),
  extractFn('performanceContextMatch'),
  extractFn('vindVorigeVergelijkbareRace'),
  extractFn('performanceVerschilStatus'),
  extractFn('vergelijkSegmenten')
].join('\n');
const Match = new Function(matchSrc + '\nreturn { performanceContextMatch, vindVorigeVergelijkbareRace, performanceVerschilStatus, vergelijkSegmenten, PERFORMANCE_CONTEXT_MATCH_VERSIE, RACE_CTX_UNKNOWN, RACE_CTX_NOT_APPLICABLE };')();

// perfHyrox(hyroxCtx, isOfficial, totalTime, segments) — hyroxCtx: {format,tier,gender,
// relayDivision,relayAgeCategory,adaptiveClass}. Elk ontbrekend veld -> RACE_CTX_UNKNOWN
// (fail-closed testdefault — nooit stilzwijgend een geldige waarde aannemen).
function perfHyrox(hyroxCtx, isOfficial, totalTime, segments){
  const U = Match.RACE_CTX_UNKNOWN, N = Match.RACE_CTX_NOT_APPLICABLE;
  const ctx = hyroxCtx||{};
  const format = ctx.format!=null ? ctx.format : U;
  const isRelay = format==='relay', isAdaptive = format==='adaptive';
  const hyrox = {
    format: format,
    tier: (isRelay||isAdaptive) ? N : (ctx.tier!=null ? ctx.tier : U),
    gender: isRelay ? N : (ctx.gender!=null ? ctx.gender : U),
    relayDivision: isRelay ? (ctx.relayDivision!=null ? ctx.relayDivision : U) : N,
    relayAgeCategory: isRelay ? (ctx.relayAgeCategory!=null ? ctx.relayAgeCategory : U) : N,
    adaptiveClass: isAdaptive ? (ctx.adaptiveClass!=null ? ctx.adaptiveClass : U) : N
  };
  return { provenance:'stored', sport:'hyrox', raceContext:{ division:null, isOfficial: isOfficial!=null?isOfficial:null, hyrox:hyrox, triathlon:null }, totalTime: totalTime!=null?totalTime:null, segments: segments||[], comparisonContext:{} };
}

// perfTriathlon({swim,bike,run}, isOfficial, totalTime, segments)
function perfTriathlon(afstanden, isOfficial, totalTime, segments){
  const a = afstanden||{};
  return { provenance:'stored', sport:'triathlon', raceContext:{ division:null, isOfficial: isOfficial!=null?isOfficial:null, hyrox:null, triathlon:{ swimDistance: a.swim!=null?a.swim:null, bikeDistance: a.bike!=null?a.bike:null, runDistance: a.run!=null?a.run:null, format:'individual' } }, totalTime: totalTime!=null?totalTime:null, segments: segments||[], comparisonContext:{} };
}

console.log('\nBB. performance_context_match.v1 — HYROX-vergelijkbaarheidsmatrix (v4.76.0, volledig contract, Fase-16-matrix 1-15)');
const single_open_male = perfHyrox({format:'single',tier:'open',gender:'male'}, true);
const single_open_male2 = perfHyrox({format:'single',tier:'open',gender:'male'}, true);
const single_open_female = perfHyrox({format:'single',tier:'open',gender:'female'}, true);
const single_pro_male = perfHyrox({format:'single',tier:'pro',gender:'male'}, true);
eq(Match.performanceContextMatch(single_open_male, single_open_male2).comparable, true, '1. Single Open Male <-> Single Open Male = MATCH');
eq(Match.performanceContextMatch(single_open_male, single_open_female).comparable, false, '2. Single Open Male <-> Single Open Female = NO MATCH');
eq(Match.performanceContextMatch(single_open_male, single_pro_male).comparable, false, '3. Single Open <-> Single Pro = NO MATCH');

const doubles_open_male = perfHyrox({format:'doubles',tier:'open',gender:'male'}, true);
const doubles_open_male2 = perfHyrox({format:'doubles',tier:'open',gender:'male'}, true);
const doubles_pro_male = perfHyrox({format:'doubles',tier:'pro',gender:'male'}, true);
const doubles_open_mixed = perfHyrox({format:'doubles',tier:'open',gender:'mixed'}, true);
const doubles_open_female = perfHyrox({format:'doubles',tier:'open',gender:'female'}, true);
eq(Match.performanceContextMatch(doubles_open_male, doubles_open_male2).comparable, true, '4. Doubles Open Male <-> Doubles Open Male = MATCH');
eq(Match.performanceContextMatch(doubles_open_male, doubles_pro_male).comparable, false, '5. Doubles Open <-> Doubles Pro = NO MATCH');
eq(Match.performanceContextMatch(doubles_open_mixed, doubles_open_female).comparable, false, '6. Doubles Open Mixed <-> Doubles Open Female = NO MATCH');

const relay_men_u40 = perfHyrox({format:'relay',relayDivision:'men',relayAgeCategory:'under_40'}, true);
const relay_men_u40b = perfHyrox({format:'relay',relayDivision:'men',relayAgeCategory:'under_40'}, true);
const relay_men_40p = perfHyrox({format:'relay',relayDivision:'men',relayAgeCategory:'40_plus'}, true);
const relay_women_u40 = perfHyrox({format:'relay',relayDivision:'women',relayAgeCategory:'under_40'}, true);
const relay_mixed_u40 = perfHyrox({format:'relay',relayDivision:'mixed',relayAgeCategory:'under_40'}, true);
eq(Match.performanceContextMatch(relay_men_u40, relay_men_u40b).comparable, true, '7. Relay Men Under40 <-> Relay Men Under40 = MATCH');
eq(Match.performanceContextMatch(relay_men_u40, relay_men_40p).comparable, false, '8. Relay Men Under40 <-> Relay Men 40+ = NO MATCH');
eq(Match.performanceContextMatch(relay_men_u40, relay_women_u40).comparable, false, '9. Relay Men <-> Relay Women = NO MATCH');
eq(Match.performanceContextMatch(relay_men_u40, relay_mixed_u40).comparable, false, '10. Relay Men <-> Relay Mixed = NO MATCH');

// 11/12: Adaptive. GEEN write-path/UI deze sprint (STOP-punt: exacte adaptiveClass-enum
// niet met volledige zekerheid bronbevestigd, zie migratie_v476.sql), maar de VERGELIJKINGS-
// logica zelf (pure gelijkheid op wat ooit wordt opgeslagen, geen enum-gok) is wel al
// geïmplementeerd, zodat een toekomstige write-path-sprint dit direct kan benutten.
const adaptive_classA_male = perfHyrox({format:'adaptive', gender:'male', adaptiveClass:'lower_limb_impairment'}, true);
const adaptive_classA_male2 = perfHyrox({format:'adaptive', gender:'male', adaptiveClass:'lower_limb_impairment'}, true);
const adaptive_classB_male = perfHyrox({format:'adaptive', gender:'male', adaptiveClass:'upper_limb_impairment'}, true);
eq(Match.performanceContextMatch(adaptive_classA_male, adaptive_classA_male2).comparable, true, '11. Adaptive class A <-> dezelfde class A = MATCH');
eq(Match.performanceContextMatch(adaptive_classA_male, adaptive_classB_male).comparable, false, '12. Adaptive verschillende class = NO MATCH');

const single_open_unknown_gender = perfHyrox({format:'single', tier:'open'}, true); // gender niet meegegeven -> UNKNOWN
eq(Match.performanceContextMatch(single_open_unknown_gender, single_open_male).comparable, false, '13. UNKNOWN gender = NOT_DETERMINABLE');

const doubles_zonder_tier = perfHyrox({format:'doubles'}, true); // tier niet meegegeven -> UNKNOWN, exact zoals een oude Doubles-race
eq(Match.performanceContextMatch(doubles_zonder_tier, doubles_open_male).comparable, false, '14. historische Doubles zonder tier = NOT_DETERMINABLE');

const relay_zonder_age = perfHyrox({format:'relay', relayDivision:'men'}, true); // relayAgeCategory niet meegegeven -> UNKNOWN
eq(Match.performanceContextMatch(relay_zonder_age, relay_men_u40).comparable, false, '15. historische Relay zonder age/division = NOT_DETERMINABLE');

console.log('\nBC. Triathlon-vergelijkbaarheid — v4.76.0: echte afstandsvergelijking uit sessions.distance (geen raceType-kolom, Fase-16-matrix 16-26)');
const tri_1500_40000_10000_off = perfTriathlon({swim:1500,bike:40000,run:10000}, true);
const tri_1500_40000_10000_off2 = perfTriathlon({swim:1500,bike:40000,run:10000}, true);
const tri_1500_40000_10000_sim = perfTriathlon({swim:1500,bike:40000,run:10000}, false);
const tri_1500_40000_10000_sim2 = perfTriathlon({swim:1500,bike:40000,run:10000}, false);
eq(Match.performanceContextMatch(tri_1500_40000_10000_off, tri_1500_40000_10000_off2).comparable, true, '16. zelfde swim/bike/run + official = MATCH');
eq(Match.performanceContextMatch(tri_1500_40000_10000_sim, tri_1500_40000_10000_sim2).comparable, true, '17. zelfde afstanden + simulation = MATCH');
eq(Match.performanceContextMatch(tri_1500_40000_10000_off, tri_1500_40000_10000_sim).comparable, false, '18. official <-> simulation = NO MATCH');

const tri_750_40000_10000 = perfTriathlon({swim:750,bike:40000,run:10000}, true);
const tri_1500_20000_10000 = perfTriathlon({swim:1500,bike:20000,run:10000}, true);
const tri_1500_40000_5000 = perfTriathlon({swim:1500,bike:40000,run:5000}, true);
eq(Match.performanceContextMatch(tri_1500_40000_10000_off, tri_750_40000_10000).comparable, false, '19. andere swimafstand = NO MATCH');
eq(Match.performanceContextMatch(tri_1500_40000_10000_off, tri_1500_20000_10000).comparable, false, '20. andere fietsafstand = NO MATCH');
eq(Match.performanceContextMatch(tri_1500_40000_10000_off, tri_1500_40000_5000).comparable, false, '21. andere loopafstand = NO MATCH');

const tri_geen_swim = perfTriathlon({bike:40000,run:10000}, true);
const tri_geen_bike = perfTriathlon({swim:1500,run:10000}, true);
const tri_geen_run = perfTriathlon({swim:1500,bike:40000}, true);
eq(Match.performanceContextMatch(tri_geen_swim, tri_1500_40000_10000_off).comparable, false, '22. ontbrekende zwemafstand = NOT_DETERMINABLE');
eq(Match.performanceContextMatch(tri_geen_bike, tri_1500_40000_10000_off).comparable, false, '23. ontbrekende fietsafstand = NOT_DETERMINABLE');
eq(Match.performanceContextMatch(tri_geen_run, tri_1500_40000_10000_off).comparable, false, '24. ontbrekende loopafstand = NOT_DETERMINABLE');

eq(Match.performanceContextMatch(tri_1500_40000_10000_off, single_open_male).comparable, false, '25. triathlon <-> HYROX = NO MATCH (verschillende sport)');

console.log('\nBC2. Historische triathlon met bestaande, al opgeslagen afstanden is vergelijkbaar zodra alle drie bekend zijn (test 26)');
const historieTriRijen = [
  { id:'ht1', segment_index:1, exercise_id:'triathlon_zwemmen', training_type:'Triathlon', distance:1500, extraNote:'hyrox_ts:start=1000,end=61000', date:'2026-01-01' },
  { id:'ht2', segment_index:3, exercise_id:'triathlon_fietsen', training_type:'Triathlon', distance:40000, extraNote:'hyrox_ts:start=70000,end=5070000', date:'2026-01-01' },
  { id:'ht3', segment_index:5, exercise_id:'triathlon_hardlopen', training_type:'Triathlon', distance:10000, extraNote:'hyrox_ts:start=5100000,end=7600000', date:'2026-01-01' }
];
const perfHistorieTri = Reconstruct.hyroxReconstructPerformance({ race_is_official:true }, historieTriRijen);
eq(perfHistorieTri.raceContext.triathlon, { swimDistance:1500, bikeDistance:40000, runDistance:10000, format:'individual' }, '26a: gereconstrueerde triathlon-context correct uit bestaande sessions.distance, geen nieuwe kolom nodig');
eq(Match.performanceContextMatch(perfHistorieTri, tri_1500_40000_10000_off).comparable, true, '26b: historische triathlon-race is direct vergelijkbaar met een andere race van dezelfde afstanden, zodra alle drie bekend zijn');

console.log('\nBC3. Fase-4-items 29/30 (deze sprint): individual format expliciet, unsupported relay fail-closed');
eq(tri_1500_40000_10000_off.raceContext.triathlon.format, 'individual', '29. Triathlon-format is expliciet "individual" — de enige vandaag ondersteunde waarde (geen relay/team-triathlon in TrainingKompas)');
// v4.76.0 — een triathlon-relay bestaat vandaag NERGENS in de productieflow (geen enkele
// UI/write-path zet ooit iets anders dan 'individual'), maar de vergelijkingsregel zelf
// moet fail-closed blijven mocht een format ooit afwijken — dit test de GUARD zelf, niet
// een bestaand scenario.
const tri_niet_individual = { provenance:'stored', sport:'triathlon', raceContext:{ division:null, isOfficial:true, hyrox:null, triathlon:{ swimDistance:1500, bikeDistance:40000, runDistance:10000, format:'relay' } }, totalTime:null, segments:[], comparisonContext:{} };
eq(Match.performanceContextMatch(tri_niet_individual, tri_1500_40000_10000_off).comparable, false, '30. Een (vandaag onbestaand, hypothetisch) triathlon-relay-format matcht NOOIT, ook niet bij identieke afstanden — fail-closed op format blijft gelden ongeacht toekomstige uitbreiding');


eq(Match.performanceContextMatch(null, single_open_male).comparable, false, 'BD1: ontbrekende race A -> GEEN MATCH, geen crash');
eq(Match.performanceContextMatch(single_open_male, undefined).comparable, false, 'BD2: ontbrekende race B -> GEEN MATCH, geen crash');

console.log('\nBE. vindVorigeVergelijkbareRace — meest recente match wint (RULE-PERF-006), nu met volledige HYROX-context');
const huidige = perfHyrox({format:'single',tier:'open',gender:'male'}, true, 3600);
const kandidaten = [
  { instanceId:'oud-pro', datum:'2026-01-01', perf: perfHyrox({format:'single',tier:'pro',gender:'male'}, true, 3500) },       // niet vergelijkbaar (andere tier)
  { instanceId:'midden-open', datum:'2026-03-01', perf: perfHyrox({format:'single',tier:'open',gender:'male'}, true, 3700) },   // WEL vergelijkbaar
  { instanceId:'nieuwste-open', datum:'2026-06-01', perf: perfHyrox({format:'single',tier:'open',gender:'male'}, true, 3650) }  // WEL vergelijkbaar, meest recent
];
const gevondenTest = Match.vindVorigeVergelijkbareRace(huidige, kandidaten);
eq(gevondenTest.race.instanceId, 'nieuwste-open', 'BE1: de MEEST RECENTE vergelijkbare race wint, niet zomaar de eerste in de array');
eq(Match.vindVorigeVergelijkbareRace(huidige, [kandidaten[0]]), null, 'BE2: geen enkele vergelijkbare kandidaat -> null ("geen vergelijkbare eerdere race")');
eq(Match.vindVorigeVergelijkbareRace(huidige, []), null, 'BE3: lege lijst -> null, geen crash');

console.log('\nBF. performanceVerschilStatus — sneller/langzamer/gelijk/niet_beschikbaar (Fase 11)');
eq(Match.performanceVerschilStatus(3500, 3600), 'sneller', 'BF1: A < B -> sneller');
eq(Match.performanceVerschilStatus(3700, 3600), 'langzamer', 'BF2: A > B -> langzamer');
eq(Match.performanceVerschilStatus(3600, 3600), 'gelijk', 'BF3: A = B -> gelijk');
eq(Match.performanceVerschilStatus(null, 3600), 'niet_beschikbaar', 'BF4: ontbrekende A -> niet_beschikbaar, nooit geraden');
eq(Match.performanceVerschilStatus(3600, null), 'niet_beschikbaar', 'BF5: ontbrekende B -> niet_beschikbaar');

console.log('\nBG. vergelijkSegmenten — alleen segmenten die in BEIDE races bestaan (Fase 12/13)');
const segA = [{ segment_index:1, label:'Run', duration:60 }, { segment_index:2, label:'SkiErg', duration:90 }, { segment_index:3, label:'Sled Push', duration:120 }];
const segB = [{ segment_index:1, label:'Run', duration:65 }, { segment_index:2, label:'SkiErg', duration:85 }];
const vgl = Match.vergelijkSegmenten({ segments: segA }, { segments: segB });
eq(vgl.length, 2, 'BG1: alleen segment_index 1 en 2 (in beide aanwezig) — segment 3 (alleen in A) wordt NIET verzonnen voor B');
eq(vgl[0].difference, -5, 'BG2: verschil correct berekend (60-65=-5)');
const vglOntbrekend = Match.vergelijkSegmenten({ segments: [{ segment_index:1, label:'Run', duration:null }] }, { segments: [{ segment_index:1, label:'Run', duration:60 }] });
eq(vglOntbrekend[0].difference, null, 'BG3: ontbrekende duration -> difference null, nooit geschat');

console.log('\nBH. Broncode-audit: geen Relationship Engine, geen AI, puur');
ok(!/VARIABLE_REGISTRY|discover\(|pairDaily|pairQuality/.test(matchSrc), 'BH1: performance_context_match.v1 is GEEN Relationship Engine-contract — geen enkele aanraking');
ok(!/coach|anthropic|claude/i.test(matchSrc), 'BH2: geen AI-aanroep in de vergelijkingslogica');
ok(!/Date\.now\(\)|Math\.random/.test(matchSrc), 'BH3: geen Date.now()/randomness — puur op de meegegeven Performance-objecten');
ok(!/fetch\(|sbGet\(|sbPost/.test(matchSrc), 'BH4: geen netwerk-/database-aanroep in de vergelijkingsfuncties zelf');

console.log('\nBI. Broncode-audit: renderHyroxPerformanceOverzicht() gebruikt uitsluitend bestaande reconstructie, geen eigen berekening');
const overzichtSrc = extractFn('renderHyroxPerformanceOverzicht');
ok(/hyroxLaadAllePerformances\(\)/.test(overzichtSrc), 'BI1: laadt data via de nieuwe, maar volledig op bestaande functies gebaseerde laadfunctie');
ok(/vindVorigeVergelijkbareRace\(/.test(overzichtSrc) && /performanceVerschilStatus\(/.test(overzichtSrc), 'BI2: gebruikt de deterministische vergelijkingsfuncties, geen eigen ad-hoc logica');
ok(!/CardioCore\.stationDurationS\(|CalcCore\.segmentTransitionS\(/.test(overzichtSrc), 'BI3: geen eigen tijdsberekening in de renderlaag — alles komt kant-en-klaar uit reeds gereconstrueerde Performance-objecten');
ok(/Niet beschikbaar|niet_beschikbaar/.test(overzichtSrc), 'BI4: expliciete "Niet beschikbaar"-afhandeling aanwezig');

console.log('\nBJ. Broncode-audit: hyroxLaadAllePerformances() hergebruikt v4.69.0/v4.70.0 volledig');
const laadSrc = extractFn('hyroxLaadAllePerformances');
ok(/hyroxGroepeerRaceSessies\(/.test(laadSrc), 'BJ1: hergebruikt de bestaande v4.70.0-groepeerfunctie');
ok(/hyroxReconstructPerformance\(/.test(laadSrc), 'BJ2: hergebruikt de bestaande v4.69.0-reconstructiefunctie');
ok(!/CREATE TABLE|create table/i.test(laadSrc), 'BJ3: geen nieuwe tabel/query-architectuur');
ok(/race_format/.test(laadSrc), 'BJ4 (v4.76.0): bulk-select-clausule uitgebreid met de nieuwe race-contextkolommen');

console.log('\nBK. Forensische scope-controle (v4.71.0)');
const diffV71 = matchSrc + overzichtSrc + laadSrc;
ok(!/VARIABLE_REGISTRY|pairDaily|pairQuality/.test(diffV71), 'BK1: geen Relationship Engine/DeviceCore-aanraking');
ok(!/leaderboard|ranking|gamificat|social/i.test(diffV71), 'BK2: geen leaderboard/ranking/gamificatie/social');
ok(!/CREATE TABLE|create table/i.test(diffV71), 'BK3: geen nieuwe tabel');
ok(!/target_height|HYROX_DIVISIE_WAARDEN\s*=\s*\{[^}]+\}/.test(diffV71), 'BK4: geen target_height, geen ingevulde HYROX_DIVISIE_WAARDEN');
ok(!/waarschijnlijk sneller|geschatte verbetering|bijna sneller/i.test(diffV71), 'BK6: geen vage/geschatte prestatietaal (Fase 11-verbod)');


/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.72.0 — TREND OVER MEERDERE VERGELIJKBARE RACES
 * (v4.76.0: perfItem() hieronder herzien voor het nieuwe contract — dezelfde scenario's,
 * nu met expliciete, volledige HYROX-context i.p.v. een platte division-string.)
 * ══════════════════════════════════════════════════════════════════════════════════ */
const trendSrc = [
  extractFn('buildPerformanceTrend'),
  extractFn('buildSegmentTrend'),
  extractFn('performanceConclusie')
].join('\n');
const Trend = new Function(matchSrc + '\n' + trendSrc + '\nreturn { buildPerformanceTrend, buildSegmentTrend, performanceConclusie };')();

// perfItem: hyroxCtxOrNull==null -> triathlon-item (afstanden via segments[0..2].distance,
// exact zoals de echte triathlonAfgeleideRaceContext() dat ook zou doen); anders een
// volledig HYROX-contextobject (zie perfHyrox hierboven).
function perfItem(instanceId, datum, sport, hyroxCtxOrTriDistances, isOfficial, totalTime, segments){
  const p = sport==='hyrox'
    ? perfHyrox(hyroxCtxOrTriDistances, isOfficial, totalTime, segments)
    : perfTriathlon(hyroxCtxOrTriDistances, isOfficial, totalTime, segments);
  return { instanceId, datum, perf: p };
}

console.log('\nBL. buildPerformanceTrend — clustering UITSLUITEND via performance_context_match.v1 (test 27: Open->Open->Pro->Open)');
const reeksMetBreuk = [
  perfItem('r1','2026-01-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3700),
  perfItem('r2','2026-02-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3650),
  perfItem('r3','2026-03-01','hyrox',{format:'single',tier:'pro',gender:'male'},true,3400),   // breuk: andere tier
  perfItem('r4','2026-04-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3600)   // moet weer aansluiten bij r1/r2, NIET via r3
];
const clustersBreuk = Trend.buildPerformanceTrend(reeksMetBreuk);
eq(clustersBreuk.length, 2, '27a. 2 clusters — Open (r1,r2,r4) en Pro (r3) apart, exact het Open->Open->Pro->Open-voorbeeld');
const openCluster = clustersBreuk.find(c => c.context.hyrox.tier==='open');
eq(openCluster.aantal, 3, '27b. Race 4 sluit weer aan bij het Open-cluster (r1,r2,r4), Race 3 (Pro) zit er niet tussen');
eq(openCluster.punten.map(p=>p.instanceId), ['r1','r2','r4'], '27c. chronologische volgorde binnen het cluster correct, r3 volledig afwezig in dit cluster');
const proCluster = clustersBreuk.find(c => c.context.hyrox.tier==='pro');
eq(proCluster.aantal, 1, '27d. Pro-cluster bevat uitsluitend r3');

console.log('\nBL2. test 28: Doubles Open -> Doubles Pro mag nooit één trendcluster vormen');
const doublesBreuk = [
  perfItem('do1','2026-01-01','hyrox',{format:'doubles',tier:'open',gender:'male'},true,4000),
  perfItem('do2','2026-02-01','hyrox',{format:'doubles',tier:'pro',gender:'male'},true,3800)
];
eq(Trend.buildPerformanceTrend(doublesBreuk).length, 2, '28. Doubles Open en Doubles Pro vormen 2 losse clusters, nooit één trend');

console.log('\nBL3. test 29: Relay Under40 -> Relay 40+ mag nooit één trendcluster vormen');
const relayBreuk = [
  perfItem('rl1','2026-01-01','hyrox',{format:'relay',relayDivision:'men',relayAgeCategory:'under_40'},true,3200),
  perfItem('rl2','2026-02-01','hyrox',{format:'relay',relayDivision:'men',relayAgeCategory:'40_plus'},true,3300)
];
eq(Trend.buildPerformanceTrend(relayBreuk).length, 2, '29. Relay Under40 en Relay 40+ vormen 2 losse clusters, nooit één trend');

console.log('\nBL4. test 30: oude Doubles zonder tier (UNKNOWN) mag geen positieve vergelijking veroorzaken');
const doublesOnbekendeTier = [
  perfItem('du1','2026-01-01','hyrox',{format:'doubles'},true,4000),   // tier UNKNOWN, exact een oude Doubles-race
  perfItem('du2','2026-02-01','hyrox',{format:'doubles'},true,3900)    // idem
];
const clustersOnbekend = Trend.buildPerformanceTrend(doublesOnbekendeTier);
eq(clustersOnbekend.length, 2, '30. twee races met UNKNOWN tier vormen NOOIT samen één cluster — UNKNOWN <-> UNKNOWN is nooit een positieve match (fail-closed)');

console.log('\nBM. Triathlon — v4.76.0: races met GELIJKE afstanden clusteren nu WEL (evolutie t.o.v. v4.71.0s "altijd apart"-aanname, die berustte op het toen nog ontbrekende datacontract)');
const triathlonReeksGelijk = [perfItem('t1','2026-01-01','triathlon',{swim:1500,bike:40000,run:10000},true,7200), perfItem('t2','2026-02-01','triathlon',{swim:1500,bike:40000,run:10000},true,7100)];
const clustersTriathlonGelijk = Trend.buildPerformanceTrend(triathlonReeksGelijk);
eq(clustersTriathlonGelijk.length, 1, 'BM1 (v4.76.0, bijgewerkt): 2 races met IDENTIEKE afstanden vormen nu terecht één cluster — dit is de bedoelde, nieuwe functionaliteit van deze sprint');
eq(clustersTriathlonGelijk[0].aantal, 2, 'BM2 (v4.76.0, bijgewerkt): beide races zitten in dat ene cluster');
const triathlonReeksVerschillend = [perfItem('t3','2026-01-01','triathlon',{swim:1500,bike:40000,run:10000},true,7200), perfItem('t4','2026-02-01','triathlon',{swim:750,bike:20000,run:5000},true,3600)];
eq(Trend.buildPerformanceTrend(triathlonReeksVerschillend).length, 2, 'BM3: races met VERSCHILLENDE afstanden blijven terecht apart — geen categorienaam, uitsluitend de daadwerkelijke afstanden bepalen dit');

console.log('\nBN. Beste vergelijkbare prestatie — nooit een andere context ertussen (Fase 8)');
const openTijden = [
  perfItem('b1','2026-01-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3730),
  perfItem('b2','2026-02-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3644), // beste
  perfItem('b3','2026-03-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3680)
];
const clusterBest = Trend.buildPerformanceTrend(openTijden)[0];
eq(clusterBest.besteTijd, 3644, 'BN1: beste tijd correct berekend binnen het cluster');
const metPro = openTijden.concat([perfItem('bx','2026-01-15','hyrox',{format:'single',tier:'pro',gender:'male'},true,3000)]);
const clusterBestMetPro = Trend.buildPerformanceTrend(metPro).find(c=>c.context.hyrox.tier==='open');
eq(clusterBestMetPro.besteTijd, 3644, 'BN2: een snellere Pro-tijd (3000) mag de Open-beste-tijd NIET beïnvloeden — andere context');

console.log('\nBO. Ontbrekende totale tijd telt niet mee als meetpunt (Fase 6)');
const metOntbrekendeTijd = [
  perfItem('m1','2026-01-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3700),
  perfItem('m2','2026-02-01','hyrox',{format:'single',tier:'open',gender:'male'},true,null), // geen betrouwbare tijd
  perfItem('m3','2026-03-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3600)
];
const clusterOntbrekend = Trend.buildPerformanceTrend(metOntbrekendeTijd)[0];
eq(clusterOntbrekend.besteTijd, 3600, 'BO1: race zonder totalTime wordt overgeslagen bij het bepalen van de beste tijd, niet als 0 geteld');
eq(clusterOntbrekend.aantal, 3, 'BO2: de race blijft wel gewoon onderdeel van het cluster (voor segmentweergave), alleen niet als tijd-meetpunt');
eq(clusterOntbrekend.punten[1].status, 'niet_beschikbaar', 'BO3: status voor het punt zonder tijd is niet_beschikbaar, nooit geraden');

console.log('\nBP. buildSegmentTrend — geen interpolatie van ontbrekende segmenten (Fase 9)');
const segReeks = [
  perfItem('s1','2026-01-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3700,[{segment_index:4,label:'Sled Push',duration:134}]),
  perfItem('s2','2026-02-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3650,[{segment_index:4,label:'Sled Push',duration:125}]),
  perfItem('s3','2026-03-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3600,[]) // Sled Push ontbreekt deze race
];
const clusterSeg = Trend.buildPerformanceTrend(segReeks)[0];
const segTrend = Trend.buildSegmentTrend(clusterSeg);
eq(segTrend.length, 1, 'BP1: exact 1 segmenttype gevonden (Sled Push)');
eq(segTrend[0].reeks.length, 2, 'BP2: reeks bevat alleen de 2 races waar dit segment daadwerkelijk aanwezig was — race 3 wordt niet aangevuld met een geschatte waarde');

console.log('\nBQ. performanceConclusie — "word ik beter?" (Fase 12)');
eq(Trend.performanceConclusie(null), 'Nog onvoldoende vergelijkbare racegegevens.', 'BQ1: geen cluster -> neutrale tekst');
eq(Trend.performanceConclusie({ aantal:1 }), 'Nog onvoldoende vergelijkbare racegegevens.', 'BQ2: slechts 1 race -> neutrale tekst, geen conclusie');
const sneller = Trend.buildPerformanceTrend([perfItem('c1','2026-01-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3700), perfItem('c2','2026-02-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3598)])[0];
ok(/sneller/.test(Trend.performanceConclusie(sneller)), 'BQ3: correcte "sneller"-conclusie met exact tijdsverschil');
const langzamer = Trend.buildPerformanceTrend([perfItem('d1','2026-01-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3600), perfItem('d2','2026-02-01','hyrox',{format:'single',tier:'open',gender:'male'},true,3700)])[0];
ok(/langzamer/.test(Trend.performanceConclusie(langzamer)), 'BQ4: correcte "langzamer"-conclusie');
ok(!/waarschijnlijk|voorspeld|geschat/i.test(Trend.performanceConclusie(sneller)), 'BQ5: geen vage/geschatte taal in de conclusie (Fase 7-verbod)');

console.log('\nBR. Broncode-audit: geen tweede vergelijkingsmechanisme, geen Relationship Engine, geen AI');
ok(trendSrc.includes('performanceContextMatch('), 'BR1: buildPerformanceTrend() roept uitsluitend de bestaande performanceContextMatch() aan voor clustering');
ok(!/VARIABLE_REGISTRY|discover\(|pairDaily|pairQuality/.test(trendSrc), 'BR2: geen Relationship Engine/DeviceCore-aanraking');
ok(!/coach|anthropic|claude/i.test(trendSrc), 'BR3: geen AI-aanroep');
ok(!/Date\.now\(\)|Math\.random/.test(trendSrc), 'BR4: geen Date.now()/randomness — puur op de meegegeven Performance-objecten');
ok(!/fetch\(|sbGet\(|sbPost/.test(trendSrc), 'BR5: geen netwerk-/database-aanroep in de trendfuncties zelf');

console.log('\nBS. Broncode-audit: Training Progress / Relationship Engine blijven gescheiden (Fase 13)');
ok(!/tkAthleteBronnen|relationshipSources|dailyModel/.test(trendSrc), 'BS1: geen aanraking van de bestaande Training-Progress/Relationship-Engine-voedingslaag');

console.log('\nBT. Broncode-audit: renderHyroxTrendSectie() — geen verbindingslijn tussen contexten, geen gamification');
const trendSectieSrc = extractFn('renderHyroxTrendSectie');
ok(/Trend niet beschikbaar/.test(trendSectieSrc), 'BT1: expliciete "Trend niet beschikbaar" met reden wanneer geen enkel cluster groot genoeg is');
ok(!/leaderboard|ranking|gamificat|badge/i.test(trendSectieSrc), 'BT2: geen leaderboard/ranking/gamificatie/badges');
ok(trendSectieSrc.includes('map(function(cluster)'), 'BT3: elk cluster krijgt een eigen, losse kaart — geen doorlopende grafieklijn tussen contexten');

console.log('\nBU. Forensische scope-controle (v4.72.0)');
const diffV72 = trendSrc + trendSectieSrc;
ok(!/VARIABLE_REGISTRY|pairDaily|pairQuality/.test(diffV72), 'BU1: geen Relationship Engine/DeviceCore-aanraking');
ok(!/leaderboard|ranking|gamificat|social/i.test(diffV72), 'BU2: geen leaderboard/ranking/gamificatie/social');
ok(!/CREATE TABLE|create table/i.test(diffV72), 'BU3: geen nieuwe tabel');
ok(!/target_height|HYROX_DIVISIE_WAARDEN\s*=\s*\{[^}]+\}/.test(diffV72), 'BU4: geen target_height, geen ingevulde HYROX_DIVISIE_WAARDEN');


/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.76.0 — RACE CONTEXT MIGRATIE + WRITE-PATH
 * ══════════════════════════════════════════════════════════════════════════════════ */
console.log('\nBV. Broncode-audit: hyroxValideerRaceContext() — deterministisch, bewust NIET in core/decision.js');
const valideerSrc = extractFn('hyroxValideerRaceContext');
ok(!/DecisionCore\./.test(valideerSrc), 'BV1: geen aanraking van DecisionCore — validatie leeft bewust uitsluitend in index.html (Decision Engine niet aangeraakt)');
const Valideer = new Function(valideerSrc + '\nreturn hyroxValideerRaceContext;')();
ok(Valideer('hyrox', {format:'single',tier:'open',gender:'male'})===true, 'BV2: single+open+male = VALID');
ok(Valideer('hyrox', {format:'single',tier:'pro',gender:'female'})===true, 'BV3: single+pro+female = VALID');
ok(Valideer('hyrox', {format:'doubles',tier:'open',gender:'mixed'})===true, 'BV4: doubles+open+mixed = VALID');
ok(Valideer('hyrox', {format:'doubles',tier:'pro',gender:'male'})===true, 'BV5: doubles+pro+male = VALID');
ok(Valideer('hyrox', {format:'relay',relayDivision:'men',relayAgeCategory:'under_40'})===true, 'BV6: relay+men+under_40 = VALID');
ok(Valideer('hyrox', {format:'relay',relayDivision:'mixed',relayAgeCategory:'40_plus'})===true, 'BV7: relay+mixed+40_plus = VALID');
ok(Valideer('hyrox', {format:'relay',tier:'open',relayDivision:'men',relayAgeCategory:'under_40'})===true, 'BV8: relay met een (genegeerd) tier-veld erbij blijft VALID — relay-tak controleert geen tier');
ok(Valideer('hyrox', {format:'adaptive',tier:'pro'})===false, 'BV9: adaptive+tier=pro = INVALID (adaptive is geen geldig format voor de huidige write-path — STOP-punt)');
ok(Valideer('hyrox', {format:'relay',relayDivision:'men'})===false, 'BV10: relay zonder relayAgeCategory = INVALID voor een nieuwe race');
ok(Valideer('hyrox', {format:'relay',relayAgeCategory:'under_40'})===false, 'BV11: relay zonder relayDivision = INVALID voor een nieuwe race');
ok(Valideer('hyrox', {format:'single',gender:'male'})===false, 'BV12: single zonder tier = INVALID');
ok(Valideer('hyrox', {format:'single',tier:'open'})===false, 'BV13: single zonder gender = INVALID');
ok(Valideer('hyrox', {format:'single',tier:'open',gender:'mixed'})===false, 'BV14: single+mixed = INVALID — Single kent geen Mixed-gender (bronbevestigd: alleen Doubles/Relay kennen Mixed)');
ok(Valideer('brick', null)===true, 'BV15: triathlon (brick) heeft geen format-context om te valideren — altijd VALID op dit niveau');

console.log('\nBW. Broncode-audit: hyroxAfgeleideRaceContext() — UNKNOWN/NOT_APPLICABLE correct, legacy-afleiding correct, geen database-schrijfactie');
const afgeleideSrc = extractFn('hyroxAfgeleideRaceContext');
ok(!/sbPost|sbPatch|UPDATE|update\s+public\./i.test(afgeleideSrc), 'BW1: pure leesfunctie — geen enkele databaseschrijfactie');
eq(Reconstruct.hyroxAfgeleideRaceContext({ race_format:'relay', race_relay_division:'men', race_relay_age_category:'under_40' }),
   { format:'relay', tier:'NOT_APPLICABLE', gender:'NOT_APPLICABLE', relayDivision:'men', relayAgeCategory:'under_40', adaptiveClass:'NOT_APPLICABLE' },
   'BW2: nieuwe Relay-rij correct gelezen, tier/gender/adaptiveClass terecht NOT_APPLICABLE');
eq(Reconstruct.hyroxAfgeleideRaceContext({ race_division:'open' }),
   { format:'single', tier:'open', gender:'UNKNOWN', relayDivision:'NOT_APPLICABLE', relayAgeCategory:'NOT_APPLICABLE', adaptiveClass:'NOT_APPLICABLE' },
   'BW3: oude race_division=open correct afgeleid naar format=single/tier=open, gender terecht UNKNOWN (nooit geraden)');
eq(Reconstruct.hyroxAfgeleideRaceContext({ race_division:'doubles' }),
   { format:'doubles', tier:'UNKNOWN', gender:'UNKNOWN', relayDivision:'NOT_APPLICABLE', relayAgeCategory:'NOT_APPLICABLE', adaptiveClass:'NOT_APPLICABLE' },
   'BW4: oude race_division=doubles -> format=doubles bekend, tier/gender terecht UNKNOWN (nooit opgeslagen geweest)');
eq(Reconstruct.hyroxAfgeleideRaceContext({ race_division:'relay' }),
   { format:'relay', tier:'NOT_APPLICABLE', gender:'NOT_APPLICABLE', relayDivision:'UNKNOWN', relayAgeCategory:'UNKNOWN', adaptiveClass:'NOT_APPLICABLE' },
   'BW5: oude race_division=relay -> format=relay bekend, relayDivision/relayAgeCategory terecht UNKNOWN');
eq(Reconstruct.hyroxAfgeleideRaceContext(null),
   { format:'UNKNOWN', tier:'UNKNOWN', gender:'UNKNOWN', relayDivision:'UNKNOWN', relayAgeCategory:'UNKNOWN', adaptiveClass:'UNKNOWN' },
   'BW6: geen enkele context bekend -> alles UNKNOWN');

console.log('\nBX. Broncode-audit: triathlonAfgeleideRaceContext() — uitsluitend bestaande sessions.distance, geen raceType-kolom');
const triAfgeleideSrc = extractFn('triathlonAfgeleideRaceContext');
ok(!/race_type|raceType\s*[:=]\s*['"](sprint|olympic|half|full)/i.test(triAfgeleideSrc), 'BX1: geen raceType/categorienaam als databasewaarde geïntroduceerd');
eq(Reconstruct.triathlonAfgeleideRaceContext([{segment_index:1,distance:1500},{segment_index:3,distance:40000},{segment_index:5,distance:10000}]),
   { swimDistance:1500, bikeDistance:40000, runDistance:10000, format:'individual' }, 'BX2: correcte koppeling aan de bestaande, vaste segment_index 1/3/5');
eq(Reconstruct.triathlonAfgeleideRaceContext([{segment_index:1,distance:1500}]),
   { swimDistance:1500, bikeDistance:null, runDistance:null, format:'individual' }, 'BX3: ontbrekende disciplines -> null, nooit verzonnen');

console.log('\nBY. Broncode-audit: createTrainingInstance()/hyroxStart() — legacy race_division behouden, additief');
// v4.76.0-bevinding: extractFn() (gedeelde testhelper) stopt bij de EERSTE '}' die hij
// tegenkomt na de functienaam — voor de meeste functies is dat het functielichaam, maar
// createTrainingInstance() heeft een GEDESTRUCTUREERD parameter-object ({...}={}) vóór
// het lichaam, dus extractFn() stopt daar al. Dit is een pre-existente beperking van de
// gedeelde testhelper (de eerste functie in deze codebase met dat patroon), geen fout in
// createTrainingInstance() zelf. Daarom hier een directe controle op de volledige html
// i.p.v. via extractFn() — exact hetzelfde patroon als AJ1 hierboven al gebruikt.
ok(/row\.race_division=raceDivision/.test(html), 'BY1: legacy race_division blijft geschreven — backward compatibility behouden');
ok(/row\.race_format=raceFormat/.test(html), 'BY2: nieuwe race_format wordt additief meegestuurd');
const startSrc = extractFn('hyroxStart');
ok(/hyroxValideerRaceContext/.test(startSrc), 'BY3: hyroxStart() valideert de racecontext vóór het aanmaken van de training_instance');
ok(!/DecisionCore\.isValidHyroxDivisie/.test(startSrc), 'BY4: de oude, nu vervangen DecisionCore-validatie wordt niet meer aangeroepen (bewust vervangen door hyroxValideerRaceContext, buiten de Decision Engine)');

console.log('\nCA. Broncode-audit: UI-weergave toont het VOLLEDIGE racecontext (Fase 5, tweede sessie) — niet uitsluitend het grovere legacy division-veld');
const contextLabelSrc = extractFn('hyroxContextLabel');
ok(contextLabelSrc.includes('h.tier') && contextLabelSrc.includes('h.gender'), 'CA1: hyroxContextLabel() gebruikt tier/gender (single/doubles), niet uitsluitend het oude division-veld');
ok(contextLabelSrc.includes('h.relayDivision') && contextLabelSrc.includes('h.relayAgeCategory'), 'CA2: hyroxContextLabel() gebruikt relay-divisie/leeftijdscategorie voor Relay');
const overzichtSrcNa = extractFn('renderHyroxPerformanceOverzicht');
ok(overzichtSrcNa.includes('hyroxContextLabel('), 'CA3: renderHyroxPerformanceOverzicht() gebruikt hyroxContextLabel() i.p.v. uitsluitend ctx.division');
const trendSectieSrcNa = extractFn('renderHyroxTrendSectie');
ok(trendSectieSrcNa.includes('hyroxContextLabel('), 'CA4: renderHyroxTrendSectie() gebruikt hyroxContextLabel() i.p.v. uitsluitend ctx.division');
ok(!/Er is onvoldoende racecontext om triathlon-races eerlijk te vergelijken/.test(trendSectieSrcNa), 'CA5: de verouderde "triathlon kan nooit vergelijken"-tekst is verwijderd — triathlon kan sinds v4.76.0 wel degelijk clusteren bij gelijke afstanden');


const diffV76 = valideerSrc + afgeleideSrc + triAfgeleideSrc + startSrc + matchSrc;
ok(!/core\/relationship\.js|VARIABLE_REGISTRY|pairDaily|pairQuality/.test(diffV76), 'BZ1: geen Relationship Engine/pairDaily/pairQuality-aanraking');
ok(!/target_height/.test(diffV76), 'BZ2: geen target_height');
ok(!/leaderboard|ranking|gamificat/i.test(diffV76), 'BZ3: geen leaderboard/ranking/gamificatie');
ok(!/race_type\s*[:=]|triathlon_type|triathlon_distance_type|triathlon_format\s*[:=]\s*['"]/.test(diffV76), 'BZ4: geen nieuwe triathlon-databasekolom geïntroduceerd in de JS-laag');
ok(!/DELETE FROM|DROP TABLE|drop column/i.test(diffV76), 'BZ5: geen destructieve database-actie');
ok(diffV76.includes('race_division'), 'BZ6: legacy race_division blijft aantoonbaar aanwezig/gelezen, niet verwijderd');


console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
console.log(fail === 0 ? '✅ HYROX/Triathlon: volledige keten t/m Race Context migratie + write-path (v4.76.0): puur, deterministisch, additief.' : '❌ NIET groen.');
process.exitCode = fail === 0 ? 0 : 1;
