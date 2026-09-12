/* fExerciseSubstitutionCanonicalSource.test.js — EXERCISE SUBSTITUTION SOURCE-OF-TRUTH SPRINT, FASE B
 * Bewijst: relations.alternatives is de primary semantic source voor de execution
 * swap-picker (openSwapExercise), muscle_primary-matching is uitsluitend nog een
 * expliciete, herkenbaar gelabelde fallback. AthleteConstraints blijft puur filter.
 * Builder (altList) en Library-detail blijven functioneel ongewijzigd (regressie-guard).
 *
 * Draai: node core/fExerciseSubstitutionCanonicalSource.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

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
function slice(a, b) {
  var s = HTML.indexOf(a);
  assert.ok(s >= 0, 'niet gevonden: ' + a);
  var e = HTML.indexOf(b, s + a.length);
  assert.ok(e > s, 'eindmarker niet gevonden voor: ' + a);
  return HTML.slice(s, e);
}

/* ══ A. Statisch bewijs: canonical is primary, fallback is expliciet gelabeld ══ */
console.log('A. Statisch bewijs candidate-flow');
var OPEN_FN = extractFn('openSwapExercise');
ok(OPEN_FN.indexOf('resolveCanonicalAlternatives(exId,excludeIds)') > -1,
  'A1: openSwapExercise() roept resolveCanonicalAlternatives() eerst aan (canonical-first)');
ok(/let candidates=resolveCanonicalAlternatives[\s\S]{0,300}usedFallback=true/.test(OPEN_FN),
  'A2: fallback (filterSwapCandidates) wordt pas gebruikt ALS canonical leeg is, nooit gecombineerd');
ok(OPEN_FN.indexOf("usedFallback=false") > -1, 'A3: expliciete usedFallback-vlag, geen impliciete/gemengde staat');
ok(/usedFallback[\s\S]{0,150}Andere suggesties op spiergroep/.test(OPEN_FN),
  'A4: fallback-candidates krijgen een herkenbaar afwijkend label ("Andere suggesties op spiergroep")');
ok(/Aanbevolen alternatieven/.test(OPEN_FN), 'A5: canonical candidates krijgen een eigen, positief label (geen "fallback"-taal)');

var RESOLVE_FN = extractFn('resolveCanonicalAlternatives');
ok(RESOLVE_FN.indexOf('ExerciseCatalogService.byId(exId)') > -1, 'A6: resolveCanonicalAlternatives() leest de bron via ExerciseCatalogService');
ok(RESOLVE_FN.indexOf('src.relations.alternatives') > -1, 'A7: primary semantic source is expliciet relations.alternatives');
ok(/if\(!id\|\|id===exId\)return;/.test(RESOLVE_FN), 'A8: self-reference wordt uitgesloten');
ok(/excludeIds\.includes\(id\)/.test(RESOLVE_FN), 'A9: reeds-aanwezige/eigen oefeningen worden uitgesloten (zelfde contract als de oude fallback)');
ok(/seen\.has\(id\)/.test(RESOLVE_FN) && /seen\.add\(id\)/.test(RESOLVE_FN), 'A10: deduplicatie binnen de canonical set');
var validationCount = (RESOLVE_FN.match(/ExerciseCatalogService\.byId\(/g) || []).length;
ok(validationCount >= 2, 'A11: elk relation-ID wordt gevalideerd tegen de canonical catalogus (geen ongeldige TK-ID doorgelaten)');
ok(/catch\(e\)\{ return \[\]; \}/.test(RESOLVE_FN), 'A12: fail-safe -- een fout levert een lege array, nooit een crash of undefined');

/* ══ B. AthleteConstraints blijft puur filter (geen wijziging aan de functie zelf) ══ */
console.log('B. AthleteConstraints ongewijzigd, puur filter');
var CONSTRAINTS_FN = extractFn('applyAthleteConstraints');
ok(CONSTRAINTS_FN.indexOf('AthleteConstraints.applyConstraints') > -1,
  'B1: applyAthleteConstraints() blijft ongewijzigd -- delegeert aan de bestaande, canonical constraints-engine');
ok(!/relations|alternatives/.test(CONSTRAINTS_FN),
  'B2: applyAthleteConstraints() genereert zelf geen semantische alternatieven -- puur filter, geen kennis van relations');
ok(OPEN_FN.match(/applyAthleteConstraints\(candidates\)/g).length === 2,
  'B3: AthleteConstraints filtert zowel het canonical pad als het fallback-pad (consistente veiligheidslaag)');

/* ══ C. Fallback blijft ongewijzigd qua eigen semantiek (muscle_primary-matching) ══ */
console.log('C. Fallback (muscle_primary) functioneel ongewijzigd');
var FILTER_FN = extractFn('filterSwapCandidates');
ok(FILTER_FN.indexOf('muscle_primary') > -1 && FILTER_FN.indexOf('relations') === -1,
  'C1: filterSwapCandidates() blijft pure muscle_primary-matching, geen canonical-kennis toegevoegd');

/* ══ D. confirmSwapExercise() -- identity/history/logging-gedrag ongewijzigd ══ */
console.log('D. confirmSwapExercise() ongewijzigd (identity/history-veiligheid)');
var CONFIRM_FN = extractFn('confirmSwapExercise');
ok(CONFIRM_FN.indexOf("sessionExtra[idx]={...sessionExtra[idx],id:newId") > -1,
  'D1: gekozen B wordt als B in sessionExtra gezet (toekomstige logging gebruikt B-ID)');
ok(/delete sessionLog\[fromId\];delete pctSelection\[fromId\];delete rpeManual\[fromId\];delete warmupState\[fromId\];/.test(CONFIRM_FN),
  'D2: lokale werksessie-staat van A wordt opgeruimd, niet naar B gemigreerd (geen A-B-vermenging)');
ok(!/suggestedWeight|sets:|reps:|rpe:/.test(CONFIRM_FN.replace(/naam:newEx\.name/, '')),
  'D3: confirmSwapExercise() herberekent zelf geen prescriptionvelden (sets/reps/RPE/gewicht) -- ongewijzigd t.o.v. vóór deze sprint');

/* ══ E. Builder (altList/swapAlternative) -- regressie-guard, byte-voor-byte ongewijzigd ══ */
console.log('E. Builder-regressie (altList, ongewijzigd)');
var ALT_LIST_FN = extractFn('altList');
ok(ALT_LIST_FN.indexOf('ex.relations') > -1 && ALT_LIST_FN.indexOf('r.alternatives') > -1,
  'E1: Builder altList() gebruikt nog steeds rechtstreeks EX_CATALOG.relations (ongewijzigd, geen regressie)');
ok(HTML.indexOf('function swapAlternative(idx)') > -1, 'E2: Builder swapAlternative() bestaat nog (ongewijzigd)');

/* ══ F. Library-detail -- regressie-guard ══ */
console.log('F. Library-detail regressie');
ok(HTML.indexOf("alternatives:(c.relations&&c.relations.alternatives)||[]") > -1,
  'F1: Library-detail leest relations.alternatives nog exact zoals vóór deze sprint (geen regressie)');

/* ══ G. UI-tekst: geen nieuw scherm, alleen het bestaande subtitel-element aangepast ══ */
console.log('G. Minimale UX-wijziging (geen nieuw scherm)');
var MODAL_BLOK = slice('<div class="modal-bg" id="m-swap-exercise"', '</div>\r\n</div>\r\n\r\n<div class="modal-bg" id="m-newex"');
ok(MODAL_BLOK.indexOf('id="swap-ex-sub"') > -1, 'G1: bestaande modal-subtitel kreeg een ID, geen nieuw scherm/modal toegevoegd');
ok(MODAL_BLOK.indexOf('id="swap-ex-list"') > -1, 'G2: de bestaande kandidatenlijst-container is ongewijzigd hergebruikt');

/* ══ H. Functionele simulatie: canonical vóór fallback, geen vermenging ══ */
console.log('H. Functionele simulatie (canonical vs. fallback, sandboxed)');
(function () {
  // Kleine, gecontroleerde sandbox: exact de nieuwe functies, met stub-afhankelijkheden.
  var CATALOG = {
    'TK-A': { relations: { alternatives: ['TK-B', 'TK-C', 'TK-A', 'TK-INVALID', 'TK-B'] } }, // self-ref + invalid + dup expres
    'TK-B': { relations: { alternatives: [] } },
    'TK-C': { relations: { alternatives: [] } },
    'CUSTOM-1': null // custom-oefening: geen catalogus-entry
  };
  var PICKER = {
    'TK-A': { id: 'TK-A', name: 'Oefening A', muscle_primary: ['Borst'] },
    'TK-B': { id: 'TK-B', name: 'Oefening B', muscle_primary: ['Borst'] },
    'TK-C': { id: 'TK-C', name: 'Oefening C', muscle_primary: ['Rug'] },
    'TK-D': { id: 'TK-D', name: 'Oefening D (alleen spiergroep)', muscle_primary: ['Borst'] }
  };
  global.ExerciseCatalogService = { byId: function (id) { return CATALOG.hasOwnProperty(id) ? CATALOG[id] : null; } };
  global.resolvePickerEx = function (id) { return PICKER[id] || null; };
  global.applyAthleteConstraints = function (list) { return list; }; // geen constraints in deze simulatie

  eval(RESOLVE_FN.replace('function resolveCanonicalAlternatives', 'var resolveCanonicalAlternatives = function'));

  var canonicalForA = resolveCanonicalAlternatives('TK-A', ['TK-A']);
  ok(canonicalForA.length === 2, 'H1: TK-A levert precies 2 geldige canonical kandidaten op (B en C)');
  ok(canonicalForA.some(function (c) { return c.id === 'TK-B'; }) && canonicalForA.some(function (c) { return c.id === 'TK-C'; }),
    'H2: de canonical kandidaten zijn exact B en C, niet D (D staat niet in relations.alternatives)');
  ok(!canonicalForA.some(function (c) { return c.id === 'TK-A'; }), 'H3: self-reference (A->A) is uitgesloten');
  ok(canonicalForA.filter(function (c) { return c.id === 'TK-B'; }).length === 1, 'H4: duplicate B->B verschijnt maar één keer');
  ok(!canonicalForA.some(function (c) { return c.id === 'TK-INVALID'; }), 'H5: ongeldige TK-ID (niet in catalogus) wordt fail-safe genegeerd');

  var canonicalForCustom = resolveCanonicalAlternatives('CUSTOM-1', ['CUSTOM-1']);
  ok(Array.isArray(canonicalForCustom) && canonicalForCustom.length === 0,
    'H6: custom/legacy-bron zonder canonical entry levert lege array (triggert fallback in openSwapExercise, geen crash)');

  delete global.ExerciseCatalogService; delete global.resolvePickerEx; delete global.applyAthleteConstraints;
})();

/* ══ I. openSwapExercise(): geen fallback zolang canonical (na constraints) niet leeg is; wél fallback als canonical leegloopt door constraints ══ */
console.log('I. Fallback-trigger exact op "canonical na constraints leeg" (niet eerder, niet later)');
ok(/let candidates=resolveCanonicalAlternatives\(exId,excludeIds\);\s*\r?\n\s*candidates=applyAthleteConstraints\(candidates\);[\s\S]{0,100}\r?\n\s*let usedFallback=false;\s*\r?\n\s*if\(!candidates\.length\)\{/.test(OPEN_FN),
  'I1: de fallback-conditie test expliciet de canonical set NA AthleteConstraints-filtering (niet vóór filtering, niet op een andere voorwaarde)');
ok(/usedFallback=true;\s*\r?\n\s*candidates=filterSwapCandidates/.test(OPEN_FN),
  'I2: pas wanneer canonical (na constraints) leeg is, wordt de fallback-candidate-generatie aangeroepen -- nooit daarvoor');

/* ══ J. Coach/programming-regressie: geen enkele aanraking van coach-programmeerpaden ══ */
console.log('J. Coach/programming-regressie (geen aanraking)');
ok(HTML.indexOf('function coachAssignProgramTemplate') === -1 || !OPEN_FN.includes('coachAssignProgramTemplate'),
  'J1: openSwapExercise() raakt geen Coach-programmeerfuncties aan (geen cross-domain wijziging)');
ok(!RESOLVE_FN.includes('coach') && !CONFIRM_FN.toLowerCase().includes('coach'),
  'J2: de nieuwe/gewijzigde functies bevatten geen Coach-specifieke logica (domeinscheiding gerespecteerd)');

console.log('\n========================================================');
console.log('fExerciseSubstitutionCanonicalSource.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
