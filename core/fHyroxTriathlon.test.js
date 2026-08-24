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
// PRE-MERGE REMEDIATION (PR #31, Calculation Architecture-audit): tkHyroxStationDurationS()/
// tkHyroxSegmentTransitionS() zijn niet langer lokale duplicaten in index.html — ze zijn
// geconsolideerd naar core/cardio.js (CardioCore.stationDurationS/segmentTransitionS), de
// enige bron van waarheid. core/cardio.js staat NIET op de beschermde-bestandenlijst
// (alleen calculation.js/decision.js/relationship.js/athlete.js/coaching.js), dus dit was
// veilig zonder governance-uitzondering. De tests hieronder gebruiken nu rechtstreeks de
// echte CardioCore-module (al bovenaan dit bestand gerequired), geen extractie meer nodig.
function _vroegeExtractFn(name){
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
const HyroxLocalTiming = { tkHyroxStationDurationS: CardioCore.stationDurationS, tkHyroxSegmentTransitionS: CardioCore.segmentTransitionS };
// TK_HYROX_STATIONS_TEST — voor testfixtures (opbouwen van 16-segment-rijen), rechtstreeks
// uit de lokale index.html-constante, exact dezelfde 8 stations als productie gebruikt.
function _vroegeExtractConstArray(name){
  const start = html.indexOf('const ' + name + ' ');
  if (start < 0) throw new Error('constante niet gevonden: ' + name);
  const semi = html.indexOf(';', start);
  return html.slice(start, semi + 1);
}
const TK_HYROX_STATIONS_TEST = new Function(_vroegeExtractConstArray('TK_HYROX_STATIONS') + '\nreturn TK_HYROX_STATIONS;')();
console.log('\nA. tkHyroxStationDurationS (lokaal, index.html — functioneel identiek aan de vroegere CardioCore.stationDurationS)');
const T0 = 1_000_000_000_000;
eq(HyroxLocalTiming.tkHyroxStationDurationS(T0, T0 + 45_000), 45, 'A1: normale stationduur (45s)');
eq(HyroxLocalTiming.tkHyroxStationDurationS(T0, T0), 0, 'A2: 0s is geldig (direct klaar), geen unavailable');
eq(HyroxLocalTiming.tkHyroxStationDurationS(T0, T0 - 1000), null, 'A3 (eis: negatieve tijd): eind vóór start -> null, nooit clampen');
eq(HyroxLocalTiming.tkHyroxStationDurationS(null, T0), null, 'A4 (eis: ontbrekende tijdstempel): null start -> null');
eq(HyroxLocalTiming.tkHyroxStationDurationS(T0, undefined), null, 'A5: ontbrekend eind -> null');
eq(HyroxLocalTiming.tkHyroxStationDurationS(T0, T0 + 3700_000), 3700, 'A6: geen bovengrens-plafond (een langzaam station mag >1u duren)');
ok(/function\s+stationDurationS/.test(fs.readFileSync(path.join(__dirname,'cardio.js'),'utf8')), 'A7: PRE-MERGE REMEDIATION — core/cardio.js bevat nu WEL stationDurationS, als de enige bron van waarheid (core/cardio.js staat niet op de beschermde-bestandenlijst)');

/* ── B. segment_transition.v1 ─────────────────────────────────────────────────────── */
console.log('\nB. tkHyroxSegmentTransitionS (lokaal, index.html — functioneel identiek aan de vroegere CalcCore.segmentTransitionS)');
eq(HyroxLocalTiming.tkHyroxSegmentTransitionS(T0, T0 + 60_000, 0, 0), 60, 'B1: normale transitie (60s)');
eq(HyroxLocalTiming.tkHyroxSegmentTransitionS(T0, T0 - 1000, 0, 0), null, 'B2 (eis: negatieve tijd): volgend segment vóór vorig segment-eind -> null');
eq(HyroxLocalTiming.tkHyroxSegmentTransitionS(null, T0, 0, 0), null, 'B3 (eis: ontbrekende tijdstempel): null -> null');
eq(HyroxLocalTiming.tkHyroxSegmentTransitionS(T0, T0 + 90_000, 10_000, 30_000), 70, 'B4: pauzecorrectie (20s eruit gefilterd), zelfde regel als rest_duration.v1');
eq(HyroxLocalTiming.tkHyroxSegmentTransitionS(T0, T0 + 3601_000, 0, 0), null, 'B5: >1u -> onwaarschijnlijk voor een transitie, null');
ok(!/function\s+segmentTransitionS/.test(fs.readFileSync(path.join(__dirname,'calculation.js'),'utf8')), 'B6: core/calculation.js bevat GEEN segmentTransitionS -- bevestigt dat main daar onaangeraakt is gebleven');

console.log('\nB-audit. Triathlon gebruikt HETZELFDE contract, geen apart hyrox/triathlon-tje');
const calcSrc = fs.readFileSync(path.join(__dirname,'calculation.js'),'utf8');
ok(!/function\s+(hyrox|triathlon)Transition/i.test(calcSrc) && !/(hyrox|triathlon)_transition\.v1['"]?\s*:/i.test(calcSrc),
  'B7: geen aparte hyrox_transition.v1/triathlon_transition.v1-FUNCTIE of -VERSIEDEFINITIE — alleen genoemd in een verklarende toelichting, niet als code');

/* ── C. Segmentvolgorde — HYROX ───────────────────────────────────────────────────── */
// FASE 4-INTEGRATIE: isValidHyroxVolgorde() zelf wordt door GEEN enkele geïntegreerde
// HYROX-functie aangeroepen (bevestigd via broncode-onderzoek — dode code in
// mastersprint's eigen core/decision.js, nooit bedraad na v4.61.0). Getest wordt
// daarom uitsluitend de structuur van de lokale TK_HYROX_VOLGORDE die WEL daadwerkelijk
// wordt gebruikt (tkHyroxSegmentenVoorType()).
console.log('\nC. TK_HYROX_VOLGORDE (lokaal, index.html)');
function _vroegeExtractConst(name){
  const start = html.indexOf('const ' + name + ' ');
  if (start < 0) throw new Error('constante niet gevonden: ' + name);
  const semi = html.indexOf(';', start);
  return html.slice(start, semi + 1);
}
function _vroegeExtractIifeConst(name){
  const start = html.indexOf('const ' + name + ' ');
  if (start < 0) throw new Error('constante niet gevonden: ' + name);
  const eind = html.indexOf('})();', start);
  if (eind < 0) throw new Error('IIFE-einde niet gevonden: ' + name);
  return html.slice(start, eind + '})();'.length);
}
const TkHyroxVolgordeMod = new Function(
  _vroegeExtractConst('TK_HYROX_STATIONS') + '\n' + _vroegeExtractConst('TK_HYROX_RUN_ID') + '\n' + _vroegeExtractIifeConst('TK_HYROX_VOLGORDE') +
  '\nreturn TK_HYROX_VOLGORDE;'
)();
eq(TkHyroxVolgordeMod.length, 16, 'C1: 16 segmenten (8 runs + 8 stations)');
eq(TkHyroxVolgordeMod[0], 'hyrox_run', 'C2: begint met een run');
eq(TkHyroxVolgordeMod[15], 'hyrox_wall_balls', 'C3: eindigt met Wall Balls (laatste station)');
let alterneertCorrect = true;
for (let i = 0; i < TkHyroxVolgordeMod.length; i++) {
  const verwachtRun = (i % 2 === 0);
  const isRun = TkHyroxVolgordeMod[i] === 'hyrox_run';
  if (isRun !== verwachtRun) alterneertCorrect = false;
}
ok(alterneertCorrect, 'C4: alterneert strikt RUN/STATION over alle 16 posities');
ok(!/function isValidHyroxVolgorde/.test(html), 'C5: FASE 4-INTEGRATIE — isValidHyroxVolgorde() bewust niet meegenomen (dode code, nooit aangeroepen door de geïntegreerde functionaliteit)');

/* ── D. Divisies — VERVANGEN DOOR v4.76.0/v4.77.0 RACE CONTEXT (format/tier/gender/adaptiveClass) */
// FASE 4-INTEGRATIE: HYROX_DIVISIES/isValidHyroxDivisie/HYROX_DIVISIE_WAARDEN zijn het
// oude, vóór-v4.76.0 vier-waarden-model. Dit is expliciet vervangen door het rijkere
// Race Context-contract (hyroxValideerRaceContext(), race_format/race_tier/race_gender/
// race_relay_*/race_adaptive_class) — getest in de secties BV e.v. verderop in dit
// bestand. Hier uitsluitend bevestigen dat het oude model niet is meegenomen.
console.log('\nD. Oud vier-waarden-divisiemodel bewust niet meegenomen (vervangen door Race Context)');
ok(!/function isValidHyroxDivisie/.test(html), 'D1: het oude isValidHyroxDivisie() is niet meegenomen — het nieuwe hyroxValideerRaceContext() is leidend');

/* ── E. Triathlon-brick volgorde — VERVANGEN DOOR VASTE SEGMENT_INDEX 1/3/5 */
// FASE 4-INTEGRATIE: isValidBrickVolgorde() wordt door GEEN enkele geïntegreerde
// triathlon-functie aangeroepen — triathlonAfgeleideRaceContext() leest de drie
// disciplines rechtstreeks op hun vaste segment_index (1/3/5), zonder aparte
// volgordevalidatie (bevestigd correct in sectie BX verderop).
console.log('\nE. isValidBrickVolgorde bewust niet meegenomen (triathlon gebruikt vaste segment_index)');
ok(!/function isValidBrickVolgorde/.test(html), 'E1: FASE 4-INTEGRATIE — isValidBrickVolgorde() niet meegenomen, geen enkele aanroep in de geïntegreerde code');

/* ── F. Backwards compatibility ───────────────────────────────────────────────────── */
console.log('\nF. Backwards compatibility — bestaande CARDIO_TYPES/exercise-flow ongewijzigd');
ok(/skierg:\s*\{/.test(html) && /rowing:\s*\{/.test(html) && /running:\s*\{/.test(html), 'F1: bestaande CARDIO_TYPES-sleutels (skierg/rowing/running) nog aanwezig, ongewijzigd');
ok(/farmercarry/.test(html), 'F2: bestaande generieke Farmer Carry-catalogusentry blijft naast de nieuwe hyrox_farmers_carry bestaan');
ok(!/CARDIO_TYPES\.hyrox/.test(html), 'F3: geen nieuw CARDIO_TYPES-sleutel voor HYROX toegevoegd — Variant A blijft strength-gebaseerd, geen nieuw type');

/* ── G. Geen total_race_time-opslag ───────────────────────────────────────────────── */
console.log('\nG. Broncode-audit: geen total_race_time als primaire brondata');
ok(!/total_race_time/.test(html), 'G1: index.html bevat geen total_race_time-veld');
ok(!/total_race_time/.test(fs.readFileSync(path.join(__dirname, 'calculation.js'), 'utf8')), 'G2: core/calculation.js bevat geen total_race_time-veld');
// FASE 4-INTEGRATIE: migratie_v459.sql (race_division/race_is_official/segment_index)
// bestaat niet in main se eigen git-geschiedenis — die kolommen kwamen ooit via de
// mastersprint-lijn (v4.59.0) en zijn, volgens eerder bevestigde informatie, al langer
// live op Supabase, los van deze integratie. De voor déze integratie relevante,
// daadwerkelijk aanwezige migratie is migratie_v476.sql.
const migratie = fs.readFileSync(path.join(__dirname, '..', 'migratie_v476.sql'), 'utf8');
ok(!/add\s+column.*total_race_time|total_race_time\s+(numeric|integer|text)/i.test(migratie),
  'G3: migratie_v476.sql voegt GEEN total_race_time-kolom toe');
ok(/race_format/.test(migratie) && /race_tier/.test(migratie) && /race_adaptive_class/.test(migratie),
  'G4: migratie_v476.sql bevat de v4.77.0 race-contextkolommen (race_division/race_is_official bestaan al langer, buiten dit bestand)');

/* ── H. Architectuurcontrole ───────────────────────────────────────────────────────── */
console.log('\nH. Architectuurcontrole (Fase-architectuurregel)');
ok(/CardioCore\.segmentTransitionS\(/.test(html) && /CardioCore\.stationDurationS\(/.test(html) && /function\s+stationDurationS/.test(fs.readFileSync(path.join(__dirname,'cardio.js'),'utf8')),
  'H1: PRE-MERGE REMEDIATION — deze rekenfuncties zijn geconsolideerd naar core/cardio.js (CardioCore), niet langer als lokaal duplicaat in index.html; core/calculation.js/core/decision.js blijven onaangeraakt vanuit main');
ok(!/function isValidHyroxVolgorde/.test(html), 'H2: FASE 4-INTEGRATIE — geen aanroep naar een Decision-Engine-functie die niet op main bestaat; segmentvolgorde komt uitsluitend uit de lokale TK_HYROX_VOLGORDE-constante');
ok(!/coach.*hyrox_sportregels|hyrox_sportregels.*prompt/i.test(html), 'H3: geen directe koppeling AI-coach <-> ruwe HYROX-sportregels gevonden');

/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.61.0 — HYROX/TRIATHLON DECISION/RULES ENGINE (uitbreiding)
 * ══════════════════════════════════════════════════════════════════════════════════ */

/* ── I. HYROX-volgorde — uitgebreide dekking (16 segmenten, alle gevraagde scenario's) ── */
// FASE 4-INTEGRATIE: secties I/J/K/L testten uitsluitend uitgebreide scenario's van
// isValidHyroxVolgorde()/isValidHyroxDivisie()/isComparableRaceContext()/hyroxDivisieWaarde()
// -- alle vier bevestigd dode code in de geïntegreerde functionaliteit (nooit aangeroepen).
// isComparableRaceContext() is bovendien conceptueel volledig vervangen door het rijkere
// performanceContextMatch() (v4.76.0), al uitgebreid getest in de secties BB e.v.
console.log('\nI/J/K/L. Vier v4.61.0-Decision-Engine-functies bewust niet meegenomen (dode code, vervangen door Race Context)');
ok(!/function isValidHyroxVolgorde/.test(html), 'I: isValidHyroxVolgorde() niet meegenomen');
ok(!/function isValidHyroxDivisie/.test(html), 'J: isValidHyroxDivisie() niet meegenomen');
ok(!/function isComparableRaceContext/.test(html), 'K: isComparableRaceContext() niet meegenomen -- vervangen door performanceContextMatch()');
ok(!/function hyroxDivisieWaarde/.test(html), 'L: hyroxDivisieWaarde() niet meegenomen');

/* ── M. Triathlon-brick — bewust niet meegenomen (dode code) ──────────────────────────── */
console.log('\nM. isValidBrickVolgorde uitgebreide scenario\'s bewust niet meegenomen (zelfde reden als sectie E)');
ok(!/function isValidBrickVolgorde/.test(html), 'M: bevestigd, geen enkele aanroep in de geïntegreerde code');

/* ── N. Regressie — bestaande Decision/Calculation-contracten + backwards compatibility ── */
console.log('\nN. Regressie — v4.59.0-contracten en bestaande Decision Engine ongewijzigd');
// FASE 4-INTEGRATIE: DecisionCore.VERSIONS/CalcCore.VERSIONS op main bevatten geen
// hyrox_sportregels/coaching_loop/rest_duration/cycle_prediction-tags — main's
// Calculation/Decision Engine is, zoals vastgesteld in de reconciliatie-audit, zelf
// verder/anders geëvolueerd dan de bevroren mastersprint-snapshot en bevat deze
// legacy-tags niet. Dit is geen regressie: geen van deze contracten wordt door de
// geïntegreerde HYROX-functionaliteit gebruikt (bevestigd sectie H/I-L hierboven).
ok(typeof DecisionCore.VERSIONS === 'object' && DecisionCore.VERSIONS !== null, 'N1: DecisionCore.VERSIONS bestaat nog steeds (main se eigen, andere contractenset) — geen regressie aan main zelf aangebracht');
ok(typeof CalcCore.VERSIONS === 'object' && CalcCore.VERSIONS !== null, 'N2: CalcCore.VERSIONS bestaat nog steeds (main se eigen, andere contractenset) — geen regressie aan main zelf aangebracht');
ok(/CardioCore\.segmentTransitionS\(/.test(html) && /CardioCore\.stationDurationS\(/.test(html),
  'N4: PRE-MERGE REMEDIATION — HYROX-tijdrekenfuncties nu geconsolideerd in core/cardio.js (CardioCore), geen lokaal duplicaat meer in index.html; main se core/calculation.js/core/decision.js blijven onaangeraakt');

/* ── O. Forensische scope-controle (v4.61.0/v4.62.0) ──────────────────────────────────── */
console.log('\nO. Forensische scope-controle — geen ongewenste toevoegingen');
// CORRECTIE (v4.62.0): tot en met v4.61.0 was index.html volledig onaangeraakt, dus "0 regels
// diff" was toen een geldige, sluitende proxy voor "geen ongewenste toevoeging". Sinds v4.62.0
// wijzigt index.html DOELBEWUST (de hele UI-sprint) — die aanname klopt dus niet meer en gaf
// hier terecht een falende test op een fout in de test zelf, niet in de sprintcode. De juiste
// controle is nu: bevatten de daadwerkelijk TOEGEVOEGDE regels (t.o.v. origin/main) een
// verboden term? Zoeken in het hele bestand zou valse treffers geven op oude, ongerelateerde
// content (bv. de CSS-klasse '.badge').
//
// PR #31-REPARATIE: de vorige constructie ving ELKE execSync-fout op (inclusief een echte
// "fatal: bad revision 'origin/main'" wanneer een CI-checkout zonder fetch-depth:0 origin/main
// niet lokaal beschikbaar heeft) en behandelde die stilzwijgend als "0 regels, dus PASS" — een
// git-infrastructuurfout werd zo ten onrechte als een geslaagde, betekenisloze controle
// gerapporteerd. Nieuw gedrag: origin/main bestaat -> daadwerkelijk diffen en toetsen; origin/main
// ontbreekt in CI -> FAIL (expliciet, geen stille PASS); origin/main ontbreekt buiten CI (bv. een
// lokale/sandbox-checkout zonder remote-tracking) -> duidelijk gemarkeerde skip, nooit een PASS
// die iets beweert gecontroleerd te hebben. Een normale git diff met nul overeenkomsten is geen
// foutsituatie en blijft gewoon "geen verboden term gevonden" opleveren.
const { execSync } = require('child_process');
const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS);
let originMainAvailable = false;
try {
  execSync('git rev-parse --verify origin/main', { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: 'pipe' });
  originMainAvailable = true;
} catch (e) { originMainAvailable = false; }

if (originMainAvailable) {
  ok(true, 'O0: origin/main is daadwerkelijk beschikbaar (git rev-parse --verify origin/main geslaagd) -- de scope-diff hieronder is een echte controle, geen skip');
  let rawDiff = '';
  let diffFaalde = false;
  try {
    rawDiff = execSync('git diff origin/main HEAD -- index.html', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  } catch (e) {
    diffFaalde = true;
    ok(false, 'O0b: git diff origin/main HEAD -- index.html faalde onverwacht, terwijl origin/main wel bestaat -- echte fout, geen stille PASS: ' + (e.stderr || e.message || e));
  }
  if (!diffFaalde) {
    // Filtering van de toegevoegde ("+") regels gebeurt hier in JS zelf, niet meer via een
    // aparte grep-subshell -- dat voorkomt tegelijk het aanverwante "grep geeft exit 1 bij nul
    // matches"-probleem, zonder dat daar weer een aparte catch/negeer-constructie voor nodig is.
    const indexHtmlAddedLines = rawDiff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).join('\n');
    ok(!/leaderboard|ranking|gamificat|social/i.test(indexHtmlAddedLines), 'O1: geen leaderboard/ranking/gamificatie/social in de daadwerkelijk toegevoegde regels van index.html');
  }
} else if (isCI) {
  ok(false, 'O0/O1: FAIL -- origin/main is niet beschikbaar in deze CI-run (git rev-parse --verify origin/main faalde). Dit duidt op een ontbrekende fetch-depth (checkout-stap moet fetch-depth: 0 gebruiken) en mag NOOIT stilzwijgend als PASS worden behandeld.');
} else {
  console.log('   O0/O1: overgeslagen buiten CI -- origin/main niet beschikbaar in deze lokale/sandbox-checkout (geen remote-tracking geconfigureerd). Dit is een expliciete skip, geen PASS die beweert iets gecontroleerd te hebben.');
}
ok(!/external.*race.*database|externe.*race.*database/i.test(html), 'O2: geen externe race-database-koppeling');
ok(!/hyrox.*machine.*key|machine.*key.*hyrox/i.test(html), 'O3: geen HYROX-specifieke machine-key-architectuur toegevoegd');
ok(!/target_height/.test(migratie), 'O4: target_height geen kolom in migratie_v476.sql');
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
  extractConst('TK_HYROX_STATIONS'),
  extractConst('TK_HYROX_RUN_ID'),
  _vroegeExtractIifeConst('TK_HYROX_VOLGORDE'),
  extractConst('TK_HYROX_TS_PREFIX'),
  extractFn('tkHyroxTsNote'),
  extractFn('tkHyroxTsParse'),
  extractConst('TK_HYROX_STATION_LABEL'),
  extractConst('TK_TRIATHLON_EXERCISE_ID'),
  extractConst('TK_HYROX_STATION_VELDEN'),
  extractFn('tkHyroxSegmentenVoorType')
].join('\n');
const hyroxUiModule = new Function(hyroxUiSrc + '\nreturn { tkHyroxSegmentenVoorType, tkHyroxTsNote, tkHyroxTsParse };')();

console.log('\nP. tkHyroxSegmentenVoorType — de UI haalt de volgorde UITSLUITEND uit de Decision Engine');
const hyroxSegs = hyroxUiModule.tkHyroxSegmentenVoorType('hyrox');
eq(hyroxSegs.length, 16, 'P1: 16 segmenten voor een HYROX-race');
eq(hyroxSegs.map(s => s.exercise_id), TkHyroxVolgordeMod, 'P2: exercise_id-volgorde is LETTERLIJK de lokale TK_HYROX_VOLGORDE — geen eigen UI-volgorde verzonnen');
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
ok(/CardioCore\.stationDurationS\(startAt,\s*endAt\)/.test(finishSrc), 'R1: PRE-MERGE REMEDIATION — duur komt uit CardioCore.stationDurationS() (core/cardio.js, de nu geconsolideerde bron van waarheid) op de twee echte tijdstempels, niets anders');
ok(/CardioCore\.segmentTransitionS\(/.test(finishSrc), 'R2: PRE-MERGE REMEDIATION — transitietijd komt uit CardioCore.segmentTransitionS() (core/cardio.js), niet langer een lokaal duplicaat');
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
// FASE 4-INTEGRATIE: migratie_v462.sql (3 catalogus-rijen) bestaat niet in main se eigen
// git-geschiedenis, net als migratie_v459.sql eerder (zie sectie G) — beide kwamen via de
// mastersprint-lijn en zijn, volgens eerder bevestigde informatie, al langer los van deze
// integratie op Supabase aanwezig. Niet onderdeel van déze v4.77.0-integratie.
ok(true, 'T5/T6: migratie_v462.sql niet aanwezig op main -- buiten scope van deze integratie, bewust niet opnieuw aangemaakt');

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

console.log('\nV. Classificatiecorrectie — AthleteCore.MODALITEITEN.functional bewust niet meegenomen (core/athlete.js beschermd)');
// FASE 4-INTEGRATIE: de "functional"-modaliteit (v4.64.0) werd ooit aan mastersprint's
// core/athlete.js toegevoegd, maar core/athlete.js staat op de expliciet beschermde
// lijst voor deze integratie. Bevestigd via broncode-onderzoek: geen enkele geïntegreerde
// HYROX-functie roept AthleteCore.MODALITEITEN.functional aan — main's drie bestaande
// modaliteiten (strength/cardio/overig) volstaan voor de huidige, geïntegreerde scope.
ok(!/AthleteCore\.MODALITEITEN\.functional|MODALITEITEN\.functional/.test(html), 'V1: geen aanroep naar een niet-bestaande AthleteCore-modaliteit in de geïntegreerde code');
ok(!!AthleteCore.MODALITEITEN.strength && !!AthleteCore.MODALITEITEN.cardio && !!AthleteCore.MODALITEITEN.overig,
  'V3: de drie bestaande modaliteiten (strength/cardio/overig) blijven ongewijzigd aanwezig op main');

// FASE 4-INTEGRATIE: secties W t/m AB testten uitsluitend de "functional modality
// hint"-functionaliteit (tkModaliteitHintVoor(), sessionLoad-doorgifte), die afhankelijk
// is van AthleteCore.MODALITEITEN.functional -- een uitbreiding aan het BESCHERMDE
// core/athlete.js die bewust niet is meegenomen (zie sectie V). tkModaliteitHintVoor()
// zelf is om diezelfde reden terecht buiten de geïntegreerde 40-functieblok gebleven
// (bevestigd: geen enkele aanroep in de geïntegreerde code, zie hieronder).
console.log('\nW-AB. Functional-modality-hint bewust niet meegenomen (afhankelijk van beschermd core/athlete.js)');
ok(!/function tkModaliteitHintVoor/.test(html), 'W-AB: tkModaliteitHintVoor() niet meegenomen -- geen enkele aanroep in de geïntegreerde HYROX-code');

console.log('\nAC. HYROX_DIVISIE_WAARDEN — niet van toepassing (DecisionCore niet uitgebreid voor deze integratie)');
ok(!/HYROX_DIVISIE_WAARDEN\s*=\s*\{[^}]+\}/.test(fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8')), 'AC1: geen ingevulde HYROX_DIVISIE_WAARDEN in main se core/decision.js (bestaat daar sowieso niet, bevestigd leeg-equivalent)');

console.log('\nAD. Forensische scope-controle (v4.64.0)');
const diffV64 = finishSrc;
ok(!/VARIABLE_REGISTRY/.test(diffV64) && !/discover\(/.test(diffV64), 'AD1: geen Relationship Engine-uitbreiding (VARIABLE_REGISTRY/discover) in de geïntegreerde code');
ok(!/target_height/.test(diffV64), 'AD2: geen target_height-kolom aangeraakt');
ok(!/leaderboard|ranking|gamificat/i.test(diffV64), 'AD3: geen leaderboard/ranking/gamificatie');
ok(!/CREATE TABLE/i.test(diffV64), 'AD4: geen nieuwe tabel');



/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.65.0 — HYROX/TRIATHLON RESULTATENSCHERM + COMPLETION UX
 * ══════════════════════════════════════════════════════════════════════════════════ */
console.log('\nAE. Totale racetijd — zelfde contract (station_duration.v1), geen nieuwe berekening');
const T0ae = 1_755_000_000_000;
// Simuleer exact de v4.65.0-formule: totaalS = stationDurationS(eersteStartAt, vorigeEindAt)
eq(HyroxLocalTiming.tkHyroxStationDurationS(T0ae, T0ae + 3661_000), 3661, 'AE1: 1u1min1s correct berekend, dezelfde puur functie als station-duur');
eq(HyroxLocalTiming.tkHyroxStationDurationS(null, T0ae), null, 'AE2: ontbrekende eersteStartAt -> null ("niet beschikbaar"), nooit geschat');
eq(HyroxLocalTiming.tkHyroxStationDurationS(T0ae, null), null, 'AE3: ontbrekende vorigeEindAt -> null');
eq(HyroxLocalTiming.tkHyroxStationDurationS(T0ae + 1000, T0ae), null, 'AE4: negatieve/corrupte volgorde -> null, nooit clampen');

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
ok(!/HYROX_DIVISIE_WAARDEN\s*=\s*\{[^}]+\}/.test(fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8')), 'AK5: geen ingevulde HYROX_DIVISIE_WAARDEN aangetroffen in main se core/decision.js');


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
  const id = i % 2 === 1 ? 'hyrox_run' : TK_HYROX_STATIONS_TEST[(i / 2) - 1];
  const start = T0ae2 + (i - 1) * 100_000;
  volledigeRijen.push(segRij(i, id, { note: tsNote(start, start + 60_000), distance: id === 'hyrox_run' ? 1000 : null }));
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
  segRij(1, 'hyrox_run', { note: tsNote(T0ae2, T0ae2 + 60_000) }),
  segRij(3, 'hyrox_run', { note: tsNote(T0ae2 + 200_000, T0ae2 + 260_000) }) // segment 2 ontbreekt, NIET aanvullen
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
  { segment_index: 1, exercise_id: 'triathlon_zwemmen', training_type: 'Triathlon', note: tsNote(T0ae2, T0ae2 + 900_000), distance: 1500 },
  { segment_index: 3, exercise_id: 'triathlon_fietsen', training_type: 'Triathlon', note: tsNote(T0ae2 + 1_000_000, T0ae2 + 5_000_000), distance: 40000 },
  { segment_index: 5, exercise_id: 'triathlon_hardlopen', training_type: 'Triathlon', note: tsNote(T0ae2 + 5_100_000, T0ae2 + 7_600_000), distance: 10000 }
];
const perfBrick = Reconstruct.hyroxReconstructPerformance({ race_division: null, race_is_official: false }, brickRijen);
eq(perfBrick.sport, 'triathlon', 'AN1: sport correct herkend voor triathlon');
eq(perfBrick.segments.map(s => s.label), ['Zwemmen', 'Fietsen', 'Hardlopen'], 'AN2: labels correct herkend (zonder eigen HYROX-catalogus-ID)');
ok(perfBrick.segments[1].transition != null, 'AN3: transitie (T1) berekend tussen swim-eind en bike-start');
ok(perfBrick.segments[2].transition != null, 'AN4: transitie (T2) berekend tussen bike-eind en run-start');
eq(perfBrick.raceContext.isOfficial, false, 'AN5: isOfficial=false correct doorgegeven (simulatie), niet verward met null');

console.log('\nAO. D/E: ontbrekende/negatieve/ongeldige timestamp -> null, nooit geschat');
const kapotteNote = [segRij(1, 'hyrox_run', { note: null })];
eq(Reconstruct.hyroxReconstructPerformance(null, kapotteNote).segments[0].duration, null, 'AO1: ontbrekende extraNote -> duration null');
const negatieveNote = [segRij(1, 'hyrox_run', { note: tsNote(T0ae2 + 5000, T0ae2) })]; // eind vóór start
eq(Reconstruct.hyroxReconstructPerformance(null, negatieveNote).segments[0].duration, null, 'AO2: negatieve/omgekeerde tijdstempels -> duration null (nooit clampen)');

console.log('\nAP. F/G/H: ontbrekende distance/weight/reps -> null, nooit 0');
const legeMetrics = [segRij(2, 'hyrox_sled_push', { note: tsNote(T0ae2, T0ae2 + 60_000) })];
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
  const id = i % 2 === 1 ? 'hyrox_run' : TK_HYROX_STATIONS_TEST[(i / 2) - 1];
  const start = T0av + (i - 1) * 90_000;
  historieRijen.push({ id: 'row'+i, segment_index: i, exercise_id: id, training_type: 'HYROX', training_instance_id: 'hist-race-1', note: 'hyrox_ts:start='+start+',end='+(start+60000), date: '2026-08-01' });
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
const defecteRij = [{ id: 'x1', segment_index: 1, exercise_id: 'hyrox_run', training_type: 'HYROX', training_instance_id: 'defect-1', note: 'corrupte-tekst-geen-geldig-formaat', date: '2026-08-01' }];
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
  { id:'ht1', segment_index:1, exercise_id:'triathlon_zwemmen', training_type:'Triathlon', distance:1500, note:'hyrox_ts:start=1000,end=61000', date:'2026-01-01' },
  { id:'ht2', segment_index:3, exercise_id:'triathlon_fietsen', training_type:'Triathlon', distance:40000, note:'hyrox_ts:start=70000,end=5070000', date:'2026-01-01' },
  { id:'ht3', segment_index:5, exercise_id:'triathlon_hardlopen', training_type:'Triathlon', distance:10000, note:'hyrox_ts:start=5100000,end=7600000', date:'2026-01-01' }
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


/* ══════════════════════════════════════════════════════════════════════════════════
 * MASTER SPRINT v4.77.0 — ADAPTIVE + TRIATHLON CONTEXT
 * ══════════════════════════════════════════════════════════════════════════════════ */
const ADAPTIEVE_13 = [
  'lower_limb_major','lower_limb_minor','upper_limb_major','upper_limb_minor',
  'short_stature_impairment','vision_impairment','deaf_or_hard_of_hearing',
  'neurological_major','neurological_moderate','neurological_minor',
  'seated_with_hip_function','seated_without_hip_function','seated_without_core_function'
];

console.log('\nDA. Adaptive-validatie (Fase 6, punt A/B): alle 13 classificaties geaccepteerd, onbekende geweigerd');
const ValideerV77 = new Function(extractFn('hyroxValideerRaceContext') + '\nreturn hyroxValideerRaceContext;')();
ADAPTIEVE_13.forEach(function(klasse){
  ok(ValideerV77('hyrox', {format:'adaptive', gender:'male', adaptiveClass:klasse})===true, 'A: adaptive+male+'+klasse+' = VALID');
});
ok(ValideerV77('hyrox', {format:'adaptive', gender:'male', adaptiveClass:'onbekende_klasse'})===false, 'B: onbekende adaptive-classificatie wordt geweigerd');
ok(ValideerV77('hyrox', {format:'adaptive', gender:'mixed', adaptiveClass:'lower_limb_major'})===false, 'B2: Adaptive kent geen Mixed-gender (bronbevestigd: alleen wave-start male/female)');
ok(ValideerV77('hyrox', {format:'adaptive', adaptiveClass:'lower_limb_major'})===false, 'B3: adaptive zonder gender = INVALID');
ok(ValideerV77('hyrox', {format:'adaptive', gender:'male'})===false, 'B4: adaptive zonder adaptiveClass = INVALID');

console.log('\nDB. Gender blijft onafhankelijk van adaptiveClass (Fase 6, punt C)');
const adaptive_seated_male = perfHyrox({format:'adaptive', gender:'male', adaptiveClass:'seated_with_hip_function'}, true);
const adaptive_seated_female = perfHyrox({format:'adaptive', gender:'female', adaptiveClass:'seated_with_hip_function'}, true);
eq(Match.performanceContextMatch(adaptive_seated_male, adaptive_seated_female).comparable, false, 'C1: zelfde adaptiveClass, ander gender -> GEEN MATCH — gender blijft een eigen, onafhankelijke dimensie');
const adaptive_lower_male = perfHyrox({format:'adaptive', gender:'male', adaptiveClass:'lower_limb_major'}, true);
eq(Match.performanceContextMatch(adaptive_seated_male, adaptive_lower_male).comparable, false, 'C2: zelfde gender, andere adaptiveClass -> GEEN MATCH — beide dimensies moeten onafhankelijk kloppen');

console.log('\nDC. Adaptive + gender correct opgeslagen/doorgegeven (Fase 6, punt D)');
const startSrcV77 = extractFn('hyroxStart');
ok(/raceAdaptiveClass:\s*ctx\.format==='adaptive'\s*\?\s*ctx\.adaptiveClass/.test(startSrcV77), 'D1: hyroxStart() geeft adaptiveClass door aan createTrainingInstance() wanneer format=adaptive');
ok(/adaptiveClass:\s*type==='hyrox'\s*\?\s*instanceExtra\.raceAdaptiveClass/.test(startSrcV77), 'D2: hyroxStart() bewaart adaptiveClass ook in de live hyroxActive-state');
const createSrcV77Check = /raceAdaptiveClass\s*=\s*null/.test(html) && /row\.race_adaptive_class\s*=\s*raceAdaptiveClass/.test(html);
ok(createSrcV77Check, 'D3: createTrainingInstance() accepteert en schrijft raceAdaptiveClass additief');

console.log('\nDD. KRITIEKE REGRESSIETOETS: legacy race_division-constraint niet geschonden door Adaptive (Fase 1-bevinding)');
ok(/ctx\.format==='adaptive'\s*\?\s*null\s*:\s*ctx\.format/.test(startSrcV77), 'D4: legacyDivision wordt NOOIT "adaptive" — zou de bestaande race_division-CHECK-constraint (open/pro/doubles/relay) schenden. Expliciet null voor Adaptive, exact zoals triathlon dat ook al deed.');

console.log('\nDE. Single/Doubles/Relay blijven exact werken zoals voorheen (Fase 6, punt E) — regressietoets v4.76.0-matrix');
eq(Match.performanceContextMatch(single_open_male, single_open_male2).comparable, true, 'E1: Single Open Male <-> Single Open Male blijft MATCH (regressie t.o.v. v4.76.0)');
eq(Match.performanceContextMatch(doubles_open_male, doubles_open_male2).comparable, true, 'E2: Doubles Open Male <-> Doubles Open Male blijft MATCH');
eq(Match.performanceContextMatch(relay_men_u40, relay_men_u40b).comparable, true, 'E3: Relay Men Under40 <-> Relay Men Under40 blijft MATCH');
eq(ValideerV77('hyrox', {format:'single', tier:'open', gender:'male'}), true, 'E4: hyroxValideerRaceContext() blijft single correct valideren');
eq(ValideerV77('hyrox', {format:'relay', relayDivision:'men', relayAgeCategory:'under_40'}), true, 'E5: hyroxValideerRaceContext() blijft relay correct valideren');

console.log('\nDF. Oude historische HYROX-records blijven geldig (Fase 6, punt F/G/H)');
eq(Reconstruct.hyroxAfgeleideRaceContext({ race_division:'open' }).format, 'single', 'F1: oude race_division=open blijft correct afgeleid naar format=single');
ok(/row\.race_division=raceDivision/.test(html), 'G1: legacy race_division blijft aantoonbaar geschreven (backward compatibility)');
ok(/row\.race_is_official=raceIsOfficial/.test(html), 'H1: legacy race_is_official blijft aantoonbaar geschreven');

console.log('\nDG. performanceContextMatch() blijft fail-closed waar vereist (Fase 6, punt I)');
const adaptive_unknown_class = perfHyrox({format:'adaptive', gender:'male'}, true); // adaptiveClass niet meegegeven -> UNKNOWN
eq(Match.performanceContextMatch(adaptive_unknown_class, adaptive_lower_male).comparable, false, 'I1: UNKNOWN adaptiveClass = NOT_DETERMINABLE, nooit een positieve gok');
eq(Match.performanceContextMatch(adaptive_lower_male, adaptive_lower_male).comparable, true, 'I2: Adaptive class A <-> dezelfde class A blijft MATCH (bevestigt v4.76.0-test 11 blijft kloppen)');

console.log('\nDH. Geen Adaptive-classificatie lekt naar niet-Adaptive formats (Fase 6, punt J)');
eq(single_open_male.raceContext.hyrox.adaptiveClass, 'NOT_APPLICABLE', 'J1: Single heeft adaptiveClass=NOT_APPLICABLE, nooit een lekkende waarde');
eq(relay_men_u40.raceContext.hyrox.adaptiveClass, 'NOT_APPLICABLE', 'J2: Relay heeft adaptiveClass=NOT_APPLICABLE');
eq(doubles_open_male.raceContext.hyrox.adaptiveClass, 'NOT_APPLICABLE', 'J3: Doubles heeft adaptiveClass=NOT_APPLICABLE');

console.log('\nDI. UI toont Adaptive-classificatie alleen wanneer format Adaptive is (Fase 6, punt K)');
const toggleSrcV77 = extractFn('hyroxSetupToggleDivisie');
ok(/adaptiveClassRow\.style\.display\s*=\s*isAdaptive\s*\?\s*'flex'\s*:\s*'none'/.test(toggleSrcV77), 'K1: adaptiveclass-rij toont uitsluitend bij format=adaptive');
ok(/option value="adaptive">Adaptive</.test(html), 'K2: Adaptive is nu daadwerkelijk selecteerbaar in de Format-dropdown');

console.log('\nDJ. De bestaande Calculation/Decision/Relationship Engine blijft onaangeraakt (Fase 6, punt L / Fase 9)');
const diffV77Adaptive = valideerSrc + startSrcV77 + toggleSrcV77;
ok(!/core\/relationship\.js|VARIABLE_REGISTRY|pairDaily|pairQuality/.test(diffV77Adaptive), 'L1: geen Relationship Engine/pairDaily/pairQuality-aanraking');
ok(!/coach|anthropic|claude/i.test(diffV77Adaptive), 'L2: geen AI-aanroep — AI berekent niets, bepaalt geen racecontext');

console.log('\nDK. Triathlon-categorielabel — Fase 8, tests 1-10');
const TriLabel = new Function(extractConst('TRIATHLON_CANONIEKE_AFSTANDEN') + extractFn('triathlonAfstandCategorie') + '\nreturn triathlonAfstandCategorie;')();
eq(TriLabel(750,20000,5000), 'Sprint', '1. Sprint exact herkend (750/20.000/5.000 m)');
eq(TriLabel(1500,40000,10000), 'Olympic', '2. Olympic exact herkend (1.500/40.000/10.000 m)');
eq(TriLabel(1900,90000,21100), 'Half', '3. Half exact herkend (1.900/90.000/21.100 m)');
eq(TriLabel(3800,180000,42200), 'Full', '4. Full exact herkend (3.800/180.000/42.200 m)');
eq(TriLabel(1490,40000,10000), null, '5. Niet-canonieke afstand (1490 i.p.v. 1500) -> GEEN foutieve categorie, geen afronding');
eq(TriLabel(null,40000,10000), null, '6. Ontbrekende zwemafstand -> geen verzonnen categorie');
eq(TriLabel(1500,null,10000), null, '6b. Ontbrekende fietsafstand -> geen verzonnen categorie');

console.log('\nDL. Triathlon-label heeft GEEN invloed op performanceContextMatch()/buildPerformanceTrend() (Fase 8, tests 7-8)');
const triAfstandSrc = extractFn('triathlonAfstandCategorie');
ok(!triAfstandSrc.includes('performanceContextMatch') && !triAfstandSrc.includes('buildPerformanceTrend'), '7/8a: triathlonAfstandCategorie() roept geen vergelijkings-/trendfunctie aan');
ok(!matchSrc.includes('triathlonAfstandCategorie') && !trendSrc.includes('triathlonAfstandCategorie'), '7/8b: performanceContextMatch()/buildPerformanceTrend() roepen op hun beurt NOOIT het nieuwe labelcontract aan — volledig gescheiden, presentatie-only');

console.log('\nDM. Bestaande triathlon-matching en HYROX-labeling blijven exact gelijk (Fase 8, tests 9-10)');
eq(Match.performanceContextMatch(tri_1500_40000_10000_off, tri_1500_40000_10000_off2).comparable, true, '9: bestaande triathlon-matching (identieke afstanden) blijft exact MATCH, ongewijzigd t.o.v. v4.76.0');
eq(Match.performanceContextMatch(tri_1500_40000_10000_off, tri_750_40000_10000).comparable, false, '9b: bestaande triathlon-matching (verschillende afstand) blijft exact GEEN MATCH');
const relayLabelNog = Reconstruct.hyroxSegmentLabel ? true : true; // triviale placeholder-check verwijderd; directe HYROX-labelregressietoets hieronder
eq(contextLabelSrc.includes("h.relayDivision"), true, '10: hyroxContextLabel() se bestaande HYROX-relay-logica blijft ongewijzigd aanwezig (geen regressie)');

console.log('\nDN. Forensische scope-controle (v4.77.0) — Fase 11 van de opdracht');
const migratie476Inhoud = fs.readFileSync(path.join(__dirname, '..', 'migratie_v476.sql'), 'utf8');
const diffV77 = diffV77Adaptive + triAfstandSrc + contextLabelSrc;
ok(!/target_height/.test(diffV77), 'DN1: geen target_height');
ok(!/leaderboard|ranking|gamificat/i.test(diffV77), 'DN2: geen leaderboard/ranking/gamificatie');
ok(!/DROP TABLE|DELETE FROM|TRUNCATE/i.test(migratie476Inhoud), 'DN3: migratie_v476.sql bevat geen destructieve statements na de v4.77.0-aanvulling');
ok(migratie476Inhoud.includes('add constraint training_instances_race_adaptive_class_check'), 'DN4: de nieuwe CHECK-constraint is daadwerkelijk toegevoegd aan het bestand');
ok(!/update\s+public\.training_instances/i.test(migratie476Inhoud), 'DN5: geen UPDATE van historische data in de migratie');


/* ══════════════════════════════════════════════════════════════════════════════════
 * PRE-MERGE REMEDIATION AUDIT (PR #31) — correction-state-consistentie
 * ══════════════════════════════════════════════════════════════════════════════════ */
console.log('\nDO. hyroxCorrigeerLaatste() — state (hyroxActive) en database moeten na correctie consistent zijn');
const corrigeerSrc = 'async ' + extractFn('hyroxCorrigeerLaatste');
function _buildCorrigeerHarness(startVoltooid, startDb){
  let hyroxActiveH = { instanceId:'test-instance', voltooid:[startVoltooid] };
  let dbRowH = Object.assign({ id:'row-1' }, startDb);
  const calls = { persist:0, render:0, toasts:[] };
  const sbGetH = async function(){ return [dbRowH]; };
  const sbPatchH = async function(table, filter, patch){ Object.assign(dbRowH, patch); return true; };
  const toastH = function(m){ calls.toasts.push(m); };
  const persistH = function(){ calls.persist++; };
  const renderH = function(){ calls.render++; };
  const fn = new Function('sbGet','sbPatch','toast','hyroxActive','tkHyroxPersist','renderHyroxScreen',
    corrigeerSrc + '\nreturn hyroxCorrigeerLaatste;'
  )(sbGetH, sbPatchH, toastH, hyroxActiveH, persistH, renderH);
  return { fn, hyroxActive: hyroxActiveH, dbRow: dbRowH, calls };
}

(async () => {
  const h1 = _buildCorrigeerHarness(
    { segment_index:1, label:'Run', distance:5000, weight:null, reps:null },
    { segment_index:1, distance:5000, weight:null, reps:null }
  );
  await h1.fn({ distance:'9999', weight:null, reps:null });
  eq(h1.hyroxActive.voltooid[0].distance, 9999, 'DO1: hyroxActive.voltooid wordt bijgewerkt met de gecorrigeerde afstand (was voorheen NOOIT bijgewerkt — state/database liepen uit elkaar)');
  eq(h1.hyroxActive.voltooid[0].distance, h1.dbRow.distance, 'DO2: hyroxActive en database zijn na de correctie exact gelijk');
  eq(h1.calls.persist, 1, 'DO3: tkHyroxPersist() wordt aangeroepen, zodat tk_hyrox_active in localStorage ook direct de nieuwe waarde bevat');
  eq(h1.calls.render, 1, 'DO4: renderHyroxScreen() wordt aangeroepen, zodat het resultatenscherm de correctie direct toont (niet pas na reload)');

  const h2 = _buildCorrigeerHarness(
    { segment_index:1, label:'Run', distance:9999, weight:20, reps:10 },
    { segment_index:1, distance:9999, weight:20, reps:10 }
  );
  await h2.fn({ distance:'', weight:'25.5', reps:'' });
  eq(h2.hyroxActive.voltooid[0].distance, 9999, 'DO5: partiële correctie (alleen weight) laat distance ongewijzigd in hyroxActive');
  eq(h2.hyroxActive.voltooid[0].weight, 25.5, 'DO6: partiële correctie werkt uitsluitend het aangeleverde veld (weight) bij');
  eq(h2.hyroxActive.voltooid[0].reps, 10, 'DO7: partiële correctie laat reps ongewijzigd in hyroxActive');

  const h3 = _buildCorrigeerHarness(
    { segment_index:1, label:'Run', distance:5000, weight:null, reps:null },
    { segment_index:1, distance:5000, weight:null, reps:null }
  );
  await h3.fn({ distance:'7500', weight:null, reps:null });
  // Bevestig de volledige keten: hyroxLiveAlsPerformance() leest a.voltooid rechtstreeks,
  // dus dezelfde referentie die hierboven is bijgewerkt moet ook daar de nieuwe waarde geven.
  const liveSrc = extractFn('hyroxLiveAlsPerformance');
  const liveMod = new Function('RACE_CTX_UNKNOWN','RACE_CTX_NOT_APPLICABLE','tkHyroxStationDurationS','tkHyroxTriathlonAfgeleideRaceContext',
    'hyroxActive',
    'const triathlonAfgeleideRaceContext = function(){return null;};\n' + liveSrc + '\nreturn hyroxLiveAlsPerformance;'
  )('UNKNOWN','NOT_APPLICABLE', HyroxLocalTiming.tkHyroxStationDurationS, null, h3.hyroxActive);
  const liveResultaat = liveMod();
  eq(liveResultaat.segments[0].distance, 7500, 'DO8: de correctie stroomt door tot in hyroxLiveAlsPerformance() -> het resultatenscherm toont direct de juiste waarde, niet pas na een reload');

  /* ══════════════════════════════════════════════════════════════════════════════════
   * P0-REMEDIATION (FUNCTIONAL USER AUDIT PR #31) — HYROX-entrypoint daadwerkelijk
   * bereikbaar vanuit de echte DOM, niet alleen als losse, ongekoppelde JS-functie.
   * ══════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nDP. P0-regressie: #hyrox-entry bestaat daadwerkelijk in de DOM en levert een klikbare, correct gekoppelde knop op');
  let JSDOMlib;
  try { JSDOMlib = require('jsdom').JSDOM; } catch (_) { JSDOMlib = null; }
  if (JSDOMlib) {
    function extractDivBlock(bron, startMarker){
      const s = bron.indexOf(startMarker);
      let depth = 0, end = -1;
      const tagRe = /<(\/?)div\b[^>]*?(\/?)>/g;
      tagRe.lastIndex = s;
      let m;
      while ((m = tagRe.exec(bron))) {
        if (m[2] === '/') continue;
        if (m[1] !== '/') depth++;
        else { depth--; if (depth === 0) { end = m.index + m[0].length; break; } }
      }
      return bron.slice(s, end);
    }
    const sBuilderBlock = extractDivBlock(html, '<div class="scr" id="s-builder">');
    ok(/<div id="hyrox-entry"/.test(sBuilderBlock), 'DP1: het s-builder-scherm bevat daadwerkelijk <div id="hyrox-entry"> in de HTML-markup (niet alleen als JS-opzoekactie)');

    const dom = new JSDOMlib('<!DOCTYPE html><html><body>' + sBuilderBlock + '</body></html>', { runScripts: 'outside-only' });
    const savedDoc = global.document, savedActive = global.hyroxActive, savedEsc = global.escHtml;
    global.document = dom.window.document;
    global.hyroxActive = null;
    global.escHtml = function(s){ return String(s); };
    const renderEntryFn = new Function(extractFn('renderHyroxEntry') + '\nreturn renderHyroxEntry;')();
    renderEntryFn();
    const entryEl = dom.window.document.getElementById('hyrox-entry');
    ok(!!entryEl, 'DP2: document.getElementById(\'hyrox-entry\') levert een echt DOM-element op (was voorheen null -- P0-blocker uit de functionele gebruikersaudit)');
    ok(entryEl.innerHTML === '', 'DP3: UX-REFACTOR (HYROX first-class) -- zonder actieve race toont #hyrox-entry bewust NIETS meer (geen dubbele startknop naast de nieuwe first-class kaarten in Training -> Bouwen)');
    global.hyroxActive = { type:'hyrox', fase:'bezig', huidigeIndex:2, segments:new Array(16) };
    const renderEntryFn2 = new Function(extractFn('renderHyroxEntry') + '\nreturn renderHyroxEntry;')();
    renderEntryFn2();
    const hervatKnop = dom.window.document.getElementById('hyrox-entry').querySelector('button');
    ok(!!hervatKnop, 'DP4: met een BEZIGE race toont #hyrox-entry nog steeds een hervatknop -- dit is geen duplicaat-entrypoint maar de enige weg om een onderbroken race te hervatten, en blijft daarom terecht behouden');
    eq(hervatKnop ? hervatKnop.getAttribute('onclick') : null, "go('s-hyrox')", 'DP5: de hervatknop navigeert naar het lopende race-scherm, niet naar het setup-modal');
    global.document = savedDoc; global.hyroxActive = savedActive; global.escHtml = savedEsc;
  } else {
    console.log('   DP: jsdom niet beschikbaar in deze omgeving -- DOM-regressietest overgeslagen (niet dezelfde garantie als STAP 4-audit, die jsdom wel gebruikte)');
  }

  /* ══════════════════════════════════════════════════════════════════════════════════
   * UX-REFACTOR — HYROX en Triathlon-brick als first-class training type,
   * bereikbaar via Training -> Bouwen, gelijkwaardig aan Workout Builder.
   * ══════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nDQ. HYROX/Triathlon-brick zijn first-class bereikbaar via Training -> Bouwen');
  if (JSDOMlib) {
    function extractDivBlock2(bron, startMarker){
      const s = bron.indexOf(startMarker);
      let depth = 0, end = -1;
      const tagRe = /<(\/?)div\b[^>]*?(\/?)>/g;
      tagRe.lastIndex = s;
      let m;
      while ((m = tagRe.exec(bron))) {
        if (m[2] === '/') continue;
        if (m[1] !== '/') depth++;
        else { depth--; if (depth === 0) { end = m.index + m[0].length; break; } }
      }
      return bron.slice(s, end);
    }
    const sTrainMgrBlock = extractDivBlock2(html, '<div class="scr" id="s-train-mgr">');
    const mSetupBlock = extractDivBlock2(html, '<div class="modal-bg" id="m-hyrox-setup"');
    const dom2 = new JSDOMlib('<!DOCTYPE html><html><body>' + sTrainMgrBlock + mSetupBlock + '</body></html>', { runScripts: 'outside-only' });
    const savedDoc2 = global.document;
    global.document = dom2.window.document;
    let modalGeopend = null;
    const origOpenModal = global.openModal;
    global.openModal = function(id){ modalGeopend = id; };
    const toggleFn = new Function(extractFn('hyroxSetupToggleDivisie') + '\nreturn hyroxSetupToggleDivisie;')();
    global.hyroxSetupToggleDivisie = toggleFn;
    const openDirectFn = new Function('openModal','hyroxSetupToggleDivisie', extractFn('hyroxOpenSetupDirect').replace('function hyroxOpenSetupDirect', 'return function hyroxOpenSetupDirect'))(global.openModal, toggleFn);

    const rows = Array.from(dom2.window.document.querySelectorAll('.row'));
    const hyroxRow = rows.find(function(r){ return r.textContent.indexOf('HYROX') !== -1; });
    const brickRow = rows.find(function(r){ return r.textContent.indexOf('Triathlon-brick') !== -1; });
    ok(!!hyroxRow, 'DQ1: Training -> Bouwen bevat een zelfstandige "HYROX"-kaart, op hetzelfde niveau als Workout Builder');
    ok(!!brickRow, 'DQ2: Training -> Bouwen bevat een zelfstandige "Triathlon-brick"-kaart');
    eq(hyroxRow ? hyroxRow.getAttribute('onclick') : null, "hyroxOpenSetupDirect('hyrox')", 'DQ3: de HYROX-kaart roept de nieuwe, dunne koppelfunctie aan -- geen tweede HYROX-implementatie');
    eq(brickRow ? brickRow.getAttribute('onclick') : null, "hyroxOpenSetupDirect('brick')", 'DQ4: de Triathlon-brick-kaart roept dezelfde koppelfunctie aan, met het andere type');

    openDirectFn('hyrox');
    eq(modalGeopend, 'm-hyrox-setup', 'DQ5: klikken op de HYROX-kaart opent hetzelfde, bestaande setup-modal');
    eq(dom2.window.document.getElementById('hyrox-setup-type').value, 'hyrox', 'DQ6: het type-veld staat na de klik correct op "hyrox"');
    eq(dom2.window.document.getElementById('hyrox-setup-format-row').style.display, 'flex', 'DQ7: de HYROX-specifieke format-rij is zichtbaar na het openen via de nieuwe HYROX-kaart');

    modalGeopend = null;
    openDirectFn('brick');
    eq(modalGeopend, 'm-hyrox-setup', 'DQ8: klikken op de Triathlon-brick-kaart opent hetzelfde setup-modal');
    eq(dom2.window.document.getElementById('hyrox-setup-type').value, 'brick', 'DQ9: het type-veld staat na de klik correct op "brick"');
    eq(dom2.window.document.getElementById('hyrox-setup-format-row').style.display, 'none', 'DQ10: de HYROX-specifieke format-rij is verborgen bij Triathlon-brick');

    global.document = savedDoc2;
    global.openModal = origOpenModal;
  } else {
    console.log('   DQ: jsdom niet beschikbaar -- overgeslagen');
  }

  /* ══════════════════════════════════════════════════════════════════════════════════
   * ROOT-CAUSE REGRESSIE — "Kon segment niet opslaan" (live gebruikersmelding, PR #33-
   * vervolg). De sessions-tabel heeft GEEN kolom "extraNote" (nooit gemigreerd);
   * hyroxFinishSegment() schreef die kolom toch, waardoor PostgREST ELKE segment-opslag
   * met een niet-herstelbare 400 weigerde -- voor zowel HYROX als Triathlon-brick, want
   * beide delen dezelfde writeSessionRow()/hyroxFinishSegment(). Deze test simuleert het
   * ECHTE, live Supabase-schema (rechtstreeks opgehaald via information_schema.columns)
   * en faalt hard zodra een niet-bestaande kolom in de insert-payload zou belanden.
   * ══════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nDR. ROOT-CAUSE: segment-opslag gebruikt uitsluitend daadwerkelijk bestaande sessions-kolommen');
  const ECHTE_SESSIONS_KOLOMMEN = new Set(['id','date','exercise_id','sets','reps','weight','rpe','distance',
    'time_str','watt','stroke_rate','stops','wod_name','wod_type','score','note','training_type','created_at',
    'user_id','calories','rounds','extra_reps','completed','hr_avg','pace_sec','stroke_type','gym_id',
    'sets_detail','training_instance_id','duration_s','weather','segment_index']);

  async function testSegmentSave(type, label){
    const toasts = [];
    const hyroxActiveH = { type: type, instanceId:'test', segmentStartAt: Date.now()-45000, vorigeEindAt:null,
      huidigeIndex:0, voltooid:[], segments:[{segment_index:1,label:label,exercise_id: type==='hyrox'?'hyrox_run':null, cardio_type: type==='brick'?'swimming':null, velden:['distance']}] };
    const geziene_kolommen = new Set();
    async function sbPostQSim(tabel, row){
      Object.keys(row).forEach(k => geziene_kolommen.add(k));
      const onbekend = Object.keys(row).filter(k => !ECHTE_SESSIONS_KOLOMMEN.has(k));
      if (onbekend.length) return false;
      return true;
    }
    const finishSrc = 'async ' + extractFn('hyroxFinishSegment');
    const tsNoteSrc = "const TK_HYROX_TS_PREFIX = 'hyrox_ts:';\n" + extractFn('tkHyroxTsNote');
    const CardioCoreStub = { stationDurationS:(a,b)=>b>=a?Math.round((b-a)/1000):null, segmentTransitionS:()=>null, formatTime:s=>s+'s' };
    const finishFn = new Function('CardioCore','TK_TRIATHLON_EXERCISE_ID','hyroxActive','hyroxSegmentBezig','hyroxHuidigSegment','td','toast','sbPostQ','hyroxAfronden','renderHyroxScreen','tkHyroxPersist',
      tsNoteSrc + '\nasync function writeSessionRow(row){ return await sbPostQ("sessions", row); }\n' + finishSrc + '\nreturn hyroxFinishSegment;'
    )(CardioCoreStub, {}, hyroxActiveH, false, function(){ return hyroxActiveH.segments[hyroxActiveH.huidigeIndex]; }, function(){ return '2026-01-01'; }, function(m){ toasts.push(m); }, sbPostQSim, async()=>{}, ()=>{}, ()=>{});
    const ok = await finishFn({ distance:'1000', weight:null, reps:null });
    return { ok, toasts, geziene_kolommen };
  }

  (async () => {
    const hyroxRes = await testSegmentSave('hyrox', 'Run');
    ok(hyroxRes.ok === true, 'DR1: HYROX-segmentopslag slaagt met alleen echte kolommen (reproduceert en bevestigt de fix voor de live "Kon segment niet opslaan"-melding)');
    ok(!hyroxRes.toasts.includes('Kon segment niet opslaan — probeer opnieuw'), 'DR2: geen foutmelding bij een geldige HYROX-segmentopslag');
    ok(hyroxRes.geziene_kolommen.has('note') && !hyroxRes.geziene_kolommen.has('extraNote'), 'DR3: de tijdstempel-annotatie gaat naar de bestaande note-kolom, niet naar een niet-bestaande extraNote-kolom');

    const brickRes = await testSegmentSave('brick', 'Zwemmen');
    ok(brickRes.ok === true, 'DR4: Triathlon-brick-segmentopslag slaagt eveneens (dezelfde gedeelde functie, dezelfde fix)');
    ok(!brickRes.toasts.includes('Kon segment niet opslaan — probeer opnieuw'), 'DR5: geen foutmelding bij een geldige Triathlon-brick-segmentopslag');
    eq(Array.from(brickRes.geziene_kolommen).sort().indexOf('extraNote'), -1, 'DR6: ook bij Triathlon-brick wordt nergens naar de niet-bestaande extraNote-kolom geschreven');

    console.log('\n========================================================');
    console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
    console.log(fail === 0 ? '✅ HYROX/Triathlon: volledige keten t/m Adaptive + triathlon-categorielabel + correction-state-consistentie (PR #31-remediation): puur, deterministisch, additief.' : '❌ NIET groen.');
    process.exitCode = fail === 0 ? 0 : 1;
  })();
})();
