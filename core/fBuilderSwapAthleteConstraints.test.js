/* fBuilderSwapAthleteConstraints.test.js — BUILDER + ATHLETECONSTRAINTS COMPLETION (Connection Gap fix)
 * Bewijst: WB.swapAlternative() past nu dezelfde AthleteConstraints-core toe als de
 * Execution/Preview-swap-picker (F23) en de autobuild-generator (F24). Canonical bron
 * (altList → relations) ongewijzigd; AthleteConstraints blijft puur filter; fail-safe.
 *
 * Draai: node core/fBuilderSwapAthleteConstraints.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var AC = require('./athleteConstraints.js');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

function extractFn(name, startIdx) {
  var st = HTML.indexOf('function ' + name + '(', startIdx || 0);
  assert.ok(st >= 0, 'functie niet gevonden: ' + name);
  var d = 0, e = -1;
  for (var j = HTML.indexOf('{', st); j < HTML.length; j++) {
    var ch = HTML[j];
    if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) { e = j; break; } }
  }
  return HTML.slice(st, e + 1);
}

var SWAP_FN = extractFn('swapAlternative');
var ALT_FN = extractFn('altList');
var GENERATE_FN = extractFn('generate');
var PREVIEW_FN = extractFn('previewRenderSwapPicker');

/* ══ A. Statisch: swapAlternative() past AthleteConstraints toe, zelfde patroon als F23/F24 ══ */
console.log('A. swapAlternative() gebruikt de AthleteConstraints-core');
ok(SWAP_FN.indexOf('AthleteConstraints.applyConstraints(') > -1, 'A1: swapAlternative() roept AthleteConstraints.applyConstraints() aan');
ok(SWAP_FN.indexOf('athleteEquipmentSet()') > -1 && SWAP_FN.indexOf('athleteAvoidTerms()') > -1,
  'A2: dezelfde context-bronnen (athleteEquipmentSet/athleteAvoidTerms) als F23/F24 -- geen eigen contextresolutie');
ok(/var alts=altList\(cur\.id\)[\s\S]*AthleteConstraints\.applyConstraints[\s\S]*if\(!alts\.length\)return null;[\s\S]*alts\.sort/.test(SWAP_FN),
  'A3: volgorde = canonical altList → AthleteConstraints-filter → lege-check → goalScore-sortering (constraints VÓÓR selectie, niet erna)');
ok(/_r\.kept\.map\(function\(w\)\{return w\._ref;\}\)/.test(SWAP_FN), 'A4: filtert op de "kept"-set en behoudt de originele catalogus-objecten (geen identity-corruptie)');
ok(/\{name:\(ex\.identity&&ex\.identity\.name\)\|\|'', equipment:\(ex\.identity&&ex\.identity\.equipment\)\|\|null, _ref:ex\}/.test(SWAP_FN),
  'A5: exact dezelfde candidate-wrapping als de autobuild-generator (F24) -- geen afwijkend contract');

/* ══ B. Patroon-consistentie met F23 (Preview) en F24 (autobuild) ══ */
console.log('B. Consistentie met bestaande, reeds aangesloten surfaces');
ok(GENERATE_FN.indexOf('AthleteConstraints.applyConstraints(') > -1, 'B1: autobuild generate() blijft AthleteConstraints toepassen (F24, ongewijzigd)');
ok(PREVIEW_FN.indexOf('applyAthleteConstraints(') > -1, 'B2: Preview-swap-picker blijft AthleteConstraints toepassen (F23, ongewijzigd)');
ok(SWAP_FN.indexOf('AthleteConstraints') > -1, 'B3: Builder-edit swapAlternative() is nu de vierde surface met dezelfde core -- geen surface meer zonder');

/* ══ C. Canonical bron ongewijzigd (relations) -- geen shadow source ══ */
console.log('C. Canonical bron intact');
ok(ALT_FN.indexOf('ex.relations') > -1 && ALT_FN.indexOf('r.alternatives') > -1, 'C1: altList() leest nog steeds EX_CATALOG.relations (ongewijzigd)');
ok(!/muscle_primary|regionOk|filterSwapCandidates/.test(SWAP_FN), 'C2: geen muscle-matching/eigen kandidaatgeneratie in swapAlternative() toegevoegd -- alleen filter op de canonical set');

/* ══ D. Fail-safe: geen context → geen filter, zoals F23/F24 ══ */
console.log('D. Fail-safe bij ontbrekende context');
ok(/if\(_set \|\| \(_avoid&&_avoid\.length\)\)\{/.test(SWAP_FN), 'D1: filter wordt uitsluitend toegepast als er daadwerkelijk context is (equipment-set of avoid-termen)');
ok(/try\{[\s\S]*AthleteConstraints\.applyConstraints[\s\S]*\}catch\(e\)\{\}/.test(SWAP_FN), 'D2: volledige try/catch -- een fout in de constraints-laag kan swapAlternative() nooit laten crashen (valt terug op ongefilterde set)');

/* ══ E. Functionele simulatie met de ECHTE AthleteConstraints-core ══ */
console.log('E. Functionele simulatie (echte core, deterministisch)');
(function () {
  var B = { catalog_id: 'TK-B', identity: { name: 'Dumbbell Bench Press', equipment: ['dumbbell'] } };
  var C = { catalog_id: 'TK-C', identity: { name: 'Barbell Bench Press', equipment: ['barbell'] } };
  var D = { catalog_id: 'TK-D', identity: { name: 'Push-Up', equipment: ['bodyweight'] } };
  function applyLikeSwap(alts, availableSet, avoidTerms) {
    var cands = alts.map(function (ex) { return { name: ex.identity.name, equipment: ex.identity.equipment, _ref: ex }; });
    var r = AC.applyConstraints(cands, { availableSet: availableSet, avoidTerms: avoidTerms });
    return r.kept.map(function (w) { return w._ref; });
  }
  // Scenario 1: canonical alt + toegestaan (thuis met dumbbells) → B blijft
  var s1 = applyLikeSwap([B], AC.normalizeEquipment(['dumbbell']), []);
  eq(s1.length, 1, 'E1: canonical alternatief dat past bij beschikbaar materiaal wordt aangeboden');
  eq(s1[0].catalog_id, 'TK-B', 'E1b: identity intact');
  // Scenario 2: canonical alt + verboden (alleen dumbbells thuis; C vereist barbell) → C valt weg
  var s2 = applyLikeSwap([B, C], AC.normalizeEquipment(['dumbbell']), []);
  eq(s2.length, 1, 'E2: alternatief dat materiaal vereist dat niet beschikbaar is, wordt uitgesloten');
  eq(s2[0].catalog_id, 'TK-B', 'E2b: het toegestane alternatief blijft over, verboden (barbell) weg');
  // Scenario 3: meerdere alternatieven, één via avoid-term uitgesloten → [B,D] zonder corruptie
  var s3 = applyLikeSwap([B, C, D], AC.normalizeEquipment(['dumbbell', 'barbell', 'bodyweight']), ['barbell bench press']);
  eq(s3.length, 2, 'E3: exact-avoid-term sluit één van drie uit');
  ok(s3.map(function (x) { return x.catalog_id; }).join(',') === 'TK-B,TK-D', 'E3b: volgorde en identity van de overgebleven set intact ([B,D])');
  // Scenario 4: alle canonical alternatieven uitgesloten → wat doet de core werkelijk? (rapporteren, niet wensen)
  var s4 = applyLikeSwap([C], AC.normalizeEquipment(['dumbbell']), []);
  // De core's "nooit leeg"-garantie: als ALLES wegvalt, valt hij terug op de originele set (bewezen gedrag F23).
  ok(s4.length >= 1, 'E4: bestaand core-gedrag bij "alles uitgesloten": nooit een lege set (valt terug op origineel) -- swapAlternative() erft dit exact, geen eigen afwijkend gedrag');
  // Scenario 5: geen constraints → set ongewijzigd
  var s5 = applyLikeSwap([B, C, D], null, []);
  eq(s5.length, 3, 'E5: zonder context blijven alle canonical alternatieven ongewijzigd (null-set = geen filter)');
})();

/* ══ F. Custom/legacy zonder relations → altList leeg → swapAlternative null (ongewijzigd) ══ */
console.log('F. Custom/legacy bron');
ok(/if\(!ex\)return \[\];var r=ex\.relations\|\|\{\};/.test(ALT_FN), 'F1: altList() retourneert [] voor een oefening zonder catalogus-entry/relations (ongewijzigd)');
ok(/if\(!alts\.length\)return null;/.test(SWAP_FN), 'F2: swapAlternative() retourneert null bij lege set -- geen crash, geen verzonnen alternatief');

/* ══ G. Persistence/identity ongewijzigd ══ */
console.log('G. Persistence en identity');
ok(/st\.plan\.items\[idx\]\.id=alts\[0\]\.catalog_id;saveDraft\(\);return alts\[0\]\.catalog_id;/.test(SWAP_FN),
  'G1: opgeslagen identity blijft het canonical catalog_id (TK-ID), geen provider-slug -- ongewijzigd');
var REPLACE_FN = extractFn('replaceItem');
ok(/st\.plan\.items\[idx\]\.id=newId;saveDraft\(\);/.test(REPLACE_FN), 'G2: replaceItem() ongewijzigd');

/* ══ H. AthleteConstraints-core zelf onaangeraakt (geen wijziging aan de pure filter) ══ */
console.log('H. AthleteConstraints-core onaangeraakt');
var CORE = fs.readFileSync(path.join(__dirname, 'athleteConstraints.js'), 'utf8');
ok(!/goalScore|relations|alternatives|catalog_id/.test(CORE), 'H1: de core kent nog steeds geen Builder-/catalogus-/goal-concepten -- blijft een pure equipment/avoid-filter');
ok(typeof AC.applyConstraints === 'function' && typeof AC.normalizeEquipment === 'function', 'H2: publieke API van de core ongewijzigd');

/* ══ I. Regressie-guards: Execution (#337/#338) intact ══ */
console.log('I. Execution-swap (PR #337/#338) intact');
var OPEN_SWAP = extractFn('openSwapExercise');
var CONFIRM = extractFn('confirmSwapExercise');
ok(OPEN_SWAP.indexOf('resolveCanonicalAlternatives(') > -1 && /Andere suggesties op spiergroep/.test(OPEN_SWAP), 'I1: Execution canonical-first + fallback-label (PR #337) ongewijzigd');
ok(/canonicalNewExerciseItem\(newId, sessionExtra\[idx\]\)/.test(CONFIRM) && CONFIRM.indexOf('suggestedWeight:null') === -1, 'I2 (GAP-P3-033): geen A-gewicht-carry-over -- B canonical opnieuw geresolved (opvolger van PR #338)');

console.log('\n========================================================');
console.log('fBuilderSwapAthleteConstraints.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
