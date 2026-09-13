/* fBuilderAthleteConstraints.test.js — BUILDER + ATHLETECONSTRAINTS FASE B
 * Bewijst: swapAlternative() in de Workout Builder gebruikt nu dezelfde canonical
 * AthleteConstraints-laag (applyAthleteConstraints()) als Preview/Execution/Autobuild,
 * toegepast VÓÓR de plan-uniciteitsfilter. Geen nieuwe filter-engine, geen duplicatie van
 * equipment/avoid-logica, bestaande fail-safe-semantiek ("nooit leeg, val terug op origineel")
 * exact hergebruikt.
 *
 * Draai: node core/fBuilderAthleteConstraints.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }

function extractFn(name) {
  var st = HTML.indexOf('function ' + name + '(');
  assert.ok(st >= 0, 'functie niet gevonden: ' + name);
  var d = 0, e = -1;
  for (var j = HTML.indexOf('{', st); j < HTML.length; j++) {
    var ch = HTML[j];
    if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) { e = j; break; } }
  }
  return HTML.slice(st, e + 1);
}

var SWAP_FN = extractFn('swapAlternative');
var ALTLIST_FN = extractFn('altList');
var GENERATE_FN = extractFn('generate');
var PREVIEW_FN = extractFn('previewRenderSwapPicker');
var CONFIRM_SWAP_FN = extractFn('confirmSwapExercise');
var CONSTRAINTS_CORE = fs.readFileSync(path.join(__dirname, 'athleteConstraints.js'), 'utf8');

/* ══ A. Statisch bewijs: canonical keten in de juiste volgorde ══ */
console.log('A. Statisch bewijs -- canonical keten');
ok(SWAP_FN.indexOf('applyAthleteConstraints') > -1, 'A1: swapAlternative() roept de bestaande applyAthleteConstraints()-wrapper aan');
var posAltList = SWAP_FN.indexOf('var alts=altList(cur.id);');
var posConstraints = SWAP_FN.indexOf('applyAthleteConstraints(wrapped)');
var posUniqueFilter = SWAP_FN.indexOf('alts=alts.filter(function(ex){return !st.plan.items.some');
ok(posAltList >= 0 && posConstraints > posAltList && posUniqueFilter > posConstraints,
  'A2: AthleteConstraints wordt toegepast NA altList() en VÓÓR de plan-uniciteitsfilter (juiste volgorde, conform de gewenste keten)');
ok(/alts\.sort\(function\(a,b\)\{return goalScore\(b,st\.sel\.goal\)-goalScore\(a,st\.sel\.goal\);\}\);/.test(SWAP_FN),
  'A3: bestaande goal-score-sortering staat ongewijzigd ná de constraints-filter');
ok(/st\.plan\.items\[idx\]\.id=alts\[0\]\.catalog_id;saveDraft\(\);return alts\[0\]\.catalog_id;/.test(SWAP_FN),
  'A4: replaceItem-achtige persistence (catalog_id -> st.plan.items[idx].id, saveDraft()) ongewijzigd');

/* ══ B. Geen nieuwe filter-engine / geen duplicatie ══ */
console.log('B. Geen duplicatie van equipment/avoid/home-travel-logica');
ok(!/normalizeEquipment|allowedByEquipment|avoidMatch/.test(SWAP_FN),
  'B1: swapAlternative() bevat geen eigen equipment/avoid-matchlogica -- uitsluitend de bestaande wrapper');
ok(!/location===.thuis.|location===.hybride./.test(SWAP_FN), 'B2: swapAlternative() bevat geen eigen home/travel-logica');
ok(!/injury|letsel/i.test(SWAP_FN), 'B3: swapAlternative() bevat geen eigen injury-logica');
ok(!/[^/]AthleteConstraints\.applyConstraints\(/.test(SWAP_FN.replace(/\/\/.*$/gm, '')),
  'B4: swapAlternative() roept de core-laag niet rechtstreeks aan (buiten commentaar) -- gebruikt de app-wrapper, geen tweede aanroeppad');

/* ══ C. Fail-safe-semantiek: bestaande, canonical gedrag hergebruikt (niet zelf verzonnen) ══ */
console.log('C. Fail-safe-semantiek (canonical, ongewijzigd)');
ok(/Veiligheid: nooit een lege training\. Val terug op de oorspronkelijke set\./.test(CONSTRAINTS_CORE),
  'C1: de canonical "nooit leeg, val terug op origineel"-regel bestaat nog exact zo in AthleteConstraints.applyConstraints() (niet aangepast)');
ok(/if \(candidates\.length && !kept\.length\) \{ diag\.fellBack = true; return \{ kept: candidates\.slice\(\), diagnostics: diag \}; \}/.test(CONSTRAINTS_CORE),
  'C2: de exacte fallback-implementatie is ongewijzigd -- swapAlternative() introduceert geen eigen fallback-beleid');

/* ══ D. Functionele simulatie: canonical toegestaan/verboden/gedeeltelijk/alles-uitgesloten ══ */
console.log('D. Functionele simulatie (sandboxed, exacte AthleteConstraints-core)');
(function () {
  eval(CONSTRAINTS_CORE.replace(
    "if (typeof module !== 'undefined' && module.exports) { module.exports = AthleteConstraints; }",
    'global.AthleteConstraints = AthleteConstraints;'
  ));

  function simulateApplyAthleteConstraints(list, availableSet, avoidTerms) {
    // Exacte replica van de app-wrapper applyAthleteConstraints() uit index.html, met
    // geïnjecteerde context (i.p.v. tkTrainingCtx) -- zelfde candidate-shape/unwrap-patroon.
    if (!global.AthleteConstraints || !Array.isArray(list) || !list.length) return list;
    if (!availableSet && (!avoidTerms || !avoidTerms.length)) return list;
    var cands = list.map(function (it) { return { name: it.naam || it.name || '', equipment: it._equip || null, _ref: it }; });
    var r = global.AthleteConstraints.applyConstraints(cands, { availableSet: availableSet, avoidTerms: avoidTerms });
    return r.kept.map(function (c) { return c._ref; });
  }

  // Scenario 1: canonical alternatief toegestaan (geen constraints actief) -> blijft beschikbaar.
  var alts1 = [{ catalog_id: 'TK-B', naam: 'Oefening B', _equip: ['dumbbell'] }];
  var r1 = simulateApplyAthleteConstraints(alts1, null, []);
  eq(r1.map(function (x) { return x.catalog_id; }), ['TK-B'], 'D1: canonical alternatief toegestaan (geen constraints) blijft beschikbaar');

  // Scenario 2: canonical alternatief verboden door equipment (met een toegestane controle-
  // kandidaat ernaast, zodat dit niet toevallig samenvalt met het "alles uitgesloten"-scenario
  // van D4) -> het verboden alternatief wordt niet geselecteerd.
  var alts2 = [
    { catalog_id: 'TK-B', naam: 'Barbell Squat', _equip: ['barbell'] },
    { catalog_id: 'TK-X', naam: 'Dumbbell Squat', _equip: ['dumbbell'] }
  ];
  var r2 = simulateApplyAthleteConstraints(alts2, global.AthleteConstraints.normalizeEquipment(['dumbbell']), []);
  eq(r2.map(function (x) { return x.catalog_id; }), ['TK-X'], 'D2: canonical alternatief zonder beschikbaar materiaal (TK-B) wordt uitgesloten, toegestane controle-kandidaat (TK-X) blijft');

  // Scenario 3: meerdere alternatieven, gedeeltelijk verboden -> alleen toegestane set gaat door.
  var alts3 = [
    { catalog_id: 'TK-B', naam: 'Barbell Squat', _equip: ['barbell'] },
    { catalog_id: 'TK-C', naam: 'Dumbbell Squat', _equip: ['dumbbell'] },
    { catalog_id: 'TK-D', naam: 'Goblet Squat', _equip: ['dumbbell'] }
  ];
  var r3 = simulateApplyAthleteConstraints(alts3, global.AthleteConstraints.normalizeEquipment(['dumbbell']), []);
  eq(r3.map(function (x) { return x.catalog_id; }).sort(), ['TK-C', 'TK-D'], 'D3: gedeeltelijke uitsluiting -- alleen TK-C en TK-D (dumbbell) gaan door naar scoring, TK-B (barbell) niet');

  // Scenario 4: ALLE canonical alternatieven uitgesloten -> canonical fail-safe (val terug op origineel).
  var alts4 = [
    { catalog_id: 'TK-B', naam: 'Barbell Squat', _equip: ['barbell'] },
    { catalog_id: 'TK-C', naam: 'Barbell Front Squat', _equip: ['barbell'] }
  ];
  var r4 = simulateApplyAthleteConstraints(alts4, global.AthleteConstraints.normalizeEquipment(['dumbbell']), []);
  eq(r4.map(function (x) { return x.catalog_id; }).sort(), ['TK-B', 'TK-C'], 'D4: alle alternatieven zouden worden uitgesloten -- canonical fail-safe valt terug op de ORIGINELE set (geen lege kandidatenlijst, geen zelfbedacht beleid)');

  // Scenario 5: avoid-term sluit één specifiek alternatief uit (exact), ambigue treffer blijft beschikbaar.
  var alts5 = [
    { catalog_id: 'TK-B', naam: 'Overhead Press', _equip: null },
    { catalog_id: 'TK-C', naam: 'Push-up', _equip: null }
  ];
  var r5 = simulateApplyAthleteConstraints(alts5, null, ['overhead press']);
  eq(r5.map(function (x) { return x.catalog_id; }), ['TK-C'], 'D5: exacte avoid-term sluit het bijbehorende alternatief uit, andere blijft beschikbaar');
})();

/* ══ E. Geen context/AthleteConstraints ontbreekt -> gedrag ongewijzigd ══ */
console.log('E. Geen constraints/context -- gedrag ongewijzigd');
ok(/if\(!window\.AthleteConstraints \|\| !Array\.isArray\(list\) \|\| !list\.length\) return list;/.test(HTML),
  'E1: de bestaande app-wrapper (hergebruikt door swapAlternative()) geeft de ongewijzigde lijst terug zonder AthleteConstraints/context');

/* ══ F. Custom/legacy zonder relations -- ongewijzigde null-flow ══ */
console.log('F. Custom/legacy zonder canonical relations');
ok(/function altList\(id\)\{var ex=E\(\)\.byId\(id\);if\(!ex\)return \[\];/.test(ALTLIST_FN),
  'F1: altList() blijft [] retourneren voor een onbekende/custom bron (ongewijzigd)');
ok(/if\(!alts\.length\)return null;/.test(SWAP_FN),
  'F2: swapAlternative() retourneert nog steeds null zonder kandidaten -- exact het bestaande, ongewijzigde gedrag (nu ook bereikbaar via een lege lijst ná constraints, dezelfde afhandeling)');

/* ══ G. Plan-uniciteitsfilter en goal-score-sortering blijven intact ══ */
console.log('G. Plan-uniciteitsfilter en goal-score-sortering intact');
ok(/return !st\.plan\.items\.some\(function\(it\)\{return it\.id===ex\.catalog_id;\}\);/.test(SWAP_FN),
  'G1: de bestaande plan-uniciteitsfilter (geen dubbele oefening in hetzelfde plan) is ongewijzigd aanwezig');
ok(SWAP_FN.indexOf('goalScore(b,st.sel.goal)-goalScore(a,st.sel.goal)') > -1, 'G2: de bestaande goal-score-sortering is ongewijzigd aanwezig');

/* ══ H. Canonical ID/persistence intact ══ */
console.log('H. Canonical ID/persistence intact');
ok(/st\.plan\.items\[idx\]\.id=alts\[0\]\.catalog_id;/.test(SWAP_FN), 'H1: het gekozen alternatief wordt met zijn canonical catalog_id opgeslagen (geen MoveKit-provider-ID)');
ok(HTML.indexOf('function replaceItem(idx,newId){if(!st.plan||!st.plan.items[idx])return;st.plan.items[idx].id=newId;saveDraft();}') > -1,
  'H2: replaceItem() zelf is volledig ongewijzigd (niet aangeraakt door deze fix)');

/* ══ I. Regressie-guards: Preview / Execution / PR #338 / Autobuild F24 blijven groen ══ */
console.log('I. Regressie-guards (Preview, Execution, #338, Autobuild)');
ok(PREVIEW_FN.indexOf('applyAthleteConstraints') > -1, 'I1: Preview swap-picker (previewRenderSwapPicker) ongewijzigd -- gebruikt nog steeds applyAthleteConstraints()');
ok(CONFIRM_SWAP_FN.indexOf('suggestedWeight:null') > -1, 'I2: Execution confirmSwapExercise() -- PR #338 suggestedWeight-invalidatie staat nog exact zo');
ok(GENERATE_FN.indexOf('AthleteConstraints.applyConstraints') > -1, 'I3: Autobuild generate() (F24) ongewijzigd -- gebruikt nog steeds AthleteConstraints.applyConstraints() rechtstreeks vóór scoring');
var RESOLVE_CANON_FN = extractFn('resolveCanonicalAlternatives');
ok(RESOLVE_CANON_FN.indexOf('src.relations.alternatives') > -1, 'I4: canonical substitution source-of-truth (PR #337) ongewijzigd -- resolveCanonicalAlternatives() intact');

console.log('\n========================================================');
console.log('fBuilderAthleteConstraints.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
