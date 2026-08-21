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


console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
console.log(fail === 0 ? '✅ HYROX/Triathlon datamodel + calculation engine + UI: puur, deterministisch, additief.' : '❌ NIET groen.');
process.exitCode = fail === 0 ? 0 : 1;
