/* fMovekitUnknownState.test.js — MOVEKIT GATE CLOSURE A
 * Bewaakt de canonieke UNKNOWN-semantiek voor exercise intelligence en de
 * feitelijke posterdekking van de movekit-posters provider.
 *
 * Kernprincipe: UNKNOWN is afwezigheid van kennis. UNKNOWN is nooit 0, nooit 50,
 * nooit "gemiddeld" en nooit een lage-confidence-schatting. UNKNOWN mag de sporter
 * niet worden getoond als ware het een vastgestelde waarde.
 *
 * Draai: node core/fMovekitUnknownState.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
var CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'exercise-catalog.json'), 'utf8'));

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  \u2717 ' + m); } }

var byId = {};
CAT.catalog.forEach(function (c) { byId[c.catalog_id] = c; });
var NEW_IDS = [];
for (var i = 207; i <= 226; i++) NEW_IDS.push('TK-' + String(i).padStart(6, '0'));

/* Laad de echte ExerciseIntelligence-module uit index.html (geen nagebouwde kopie). */
function loadEI() {
  var s = HTML.indexOf('var ExerciseIntelligence=(function(){');
  assert.ok(s >= 0, 'ExerciseIntelligence niet gevonden');
  var e = HTML.indexOf('/* \u2550\u2550\u2550 Motivatie', s);
  assert.ok(e > s, 'einde ExerciseIntelligence niet gevonden');
  var fn = new Function('EX_CATALOG', 'ExerciseCatalogService',
    HTML.slice(s, e) + '; return ExerciseIntelligence;');
  return fn(CAT, { all: function () { return CAT.catalog; } });
}
var EI = loadEI();

/* ══ 1. UNKNOWN-schema in de catalogus ══ */
console.log('1. UNKNOWN-schema op TK-000207..226');
var schemaOk = NEW_IDS.every(function (id) {
  var I = byId[id] && byId[id].intelligence;
  return I && I.fatigue === null && I.recovery === null && I.confidence === null &&
    I.evidence_level && I.evidence_level.fatigue === 'unavailable' &&
    I.human_verified === false && I.validation && I.validation.status === 'unreviewed';
});
ok(schemaOk, '1a: alle 20 nieuwe records dragen expliciete UNKNOWN-semantiek (null + unavailable)');
var noFabrication = NEW_IDS.every(function (id) {
  var I = byId[id].intelligence;
  return typeof I.fatigue !== 'number' && typeof I.recovery !== 'number' && typeof I.confidence !== 'number';
});
ok(noFabrication, '1b: geen enkel verzonnen numeriek intelligence-veld op de nieuwe records');

/* ══ 2. UNKNOWN-detectie ══ */
console.log('2. UNKNOWN-detectie per score');
var DEPS = ['cns', 'vermoeidheid', 'herstelduur', 'calorie', 'herstelbelasting'];
ok(DEPS.every(function (k) { return EI.unknown(byId['TK-000226'], k) === true; }),
  '2a: alle intelligence-afhankelijke scores zijn UNKNOWN op een nieuw record');
ok(DEPS.every(function (k) { return EI.unknown(byId['TK-000001'], k) === false; }),
  '2b: dezelfde scores zijn NIET unknown op een bestaand, geclassificeerd record');
ok(['kracht', 'hypertrofie', 'techniek', 'stabiliteit', 'coordinatie'].every(function (k) {
  return EI.unknown(byId['TK-000226'], k) === false;
}), '2c: scores die niet van intelligence afhangen blijven bepaald (geen over-blokkering)');

/* ══ S1/S2/S3 — presentatie mag nooit 50 of "Gemiddeld" tonen ══ */
console.log('S1-S3. Athlete-facing presentatie van UNKNOWN');
var barFn = (function () {
  var s = HTML.indexOf('function _idxBar(c,k){');
  var d = 0, e = -1;
  for (var j = HTML.indexOf('{', s); j < HTML.length; j++) {
    if (HTML[j] === '{') d++; else if (HTML[j] === '}') { d--; if (d === 0) { e = j; break; } }
  }
  return HTML.slice(s, e + 1);
})();
var render = new Function('ExerciseIntelligence', 'escHtml', '_scoreLabel', '_scoreCol',
  barFn + '; return _idxBar;')(EI, function (x) { return String(x); },
  function (v) { return v >= 85 ? 'UITSTEKEND' : (v >= 67 ? 'HOOG' : (v >= 40 ? 'GEMIDDELD' : 'LAAG')); },
  function () { return '#000'; });

/* Semantische UNKNOWN-contractcontrole. Bewust NIET op het losse teken "\u2014": dat komt ook
   voor in legitieme WHY-copy van BEKENDE records (bv. "Zeer vermoeiend \u2014 houd het volume in
   de gaten."). Getoetst wordt de expliciete markerset die uitsluitend de UNKNOWN-tak zet. */
var UNKNOWN_MARKERS = ['lib-idx--unknown', 'NIET BEPAALD', 'lvl-unknown'];
function marksUnknown(html) {
  for (var mi = 0; mi < UNKNOWN_MARKERS.length; mi++) {
    if (html.indexOf(UNKNOWN_MARKERS[mi]) < 0) return false;
  }
  return true;
}
function anyUnknownMarker(html) {
  for (var mj = 0; mj < UNKNOWN_MARKERS.length; mj++) {
    if (html.indexOf(UNKNOWN_MARKERS[mj]) >= 0) return true;
  }
  return false;
}

[['S1', 'vermoeidheid'], ['S2', 'herstelduur'], ['S3', 'cns']].forEach(function (t) {
  var out = render(byId['TK-000226'], t[1]);
  ok(out.indexOf('>50 ') < 0 && out.indexOf('>50<') < 0, t[0] + 'a: ' + t[1] + ' rendert geen score 50');
  ok(out.toLowerCase().indexOf('gemiddeld') < 0, t[0] + 'b: ' + t[1] + ' rendert geen "gemiddeld"-copy');
  ok(marksUnknown(out), t[0] + 'c: ' + t[1] + ' draagt ALLE expliciete UNKNOWN-markers (lib-idx--unknown, NIET BEPAALD, lvl-unknown)');
  ok(!/>\s*\d+\s+<em>/.test(out), t[0] + 'c2: ' + t[1] + ' toont geen enkele numerieke scorewaarde');
  ok(out.indexOf('width:0%') >= 0, t[0] + 'd: ' + t[1] + ' rendert een lege balk (geen suggestieve vulling)');
});

/* ══ S5 — bestaande bekende waarden blijven ongewijzigd zichtbaar ══ */
console.log('S5. Bestaande heuristische waarden blijven intact');
var knownOut = render(byId['TK-000001'], 'cns');
var knownVal = EI.scores(byId['TK-000001']).cns;
ok(knownOut.indexOf('>' + knownVal + ' ') >= 0, 'S5a: bestaand record toont nog steeds zijn werkelijke score (' + knownVal + ')');
ok(!anyUnknownMarker(knownOut), 'S5b: bestaand record draagt GEEN enkele UNKNOWN-marker');
ok(EI.scores(byId['TK-000001']).vermoeidheid === 15, 'S5c: bestaande scorewaarden zijn numeriek ongewijzigd');
/* S5d: exhaustief \u2014 geen enkel bestaand record mag op een intelligence-afhankelijke score
   als UNKNOWN worden gerenderd, ongeacht in welke WHY-band de waarde valt. Dit invariant werd
   door de eerdere, op "\u2014" gebaseerde assertie slechts bij toeval bewaakt. */
var DEP_KEYS = ['cns', 'vermoeidheid', 'herstelduur', 'calorie', 'herstelbelasting'];
var ghosts = [], renderCount = 0;
for (var oi = 1; oi <= 206; oi++) {
  var oid = 'TK-' + String(oi).padStart(6, '0');
  for (var di = 0; di < DEP_KEYS.length; di++) {
    var o = render(byId[oid], DEP_KEYS[di]);
    renderCount++;
    if (anyUnknownMarker(o)) ghosts.push(oid + '/' + DEP_KEYS[di]);
  }
}
ok(ghosts.length === 0, 'S5d: geen van de ' + renderCount + ' renders van TK-000001..206 draagt een UNKNOWN-marker (' + ghosts.slice(0, 3).join(', ') + ')');
/* S5e/S5f: precies het geval waarop de oude assertie stukliep \u2014 een KNOWN record waarvan de
   legitieme WHY-copy zelf een em-dash bevat. */
var dashOut = render(byId['TK-000024'], 'vermoeidheid');
ok(dashOut.indexOf('\u2014') >= 0, 'S5e-voorwaarde: TK-000024 WHY-copy bevat inderdaad een legitiem "\u2014"');
ok(!anyUnknownMarker(dashOut), 'S5e: een KNOWN record met "\u2014" in de WHY-copy wordt NIET als UNKNOWN geclassificeerd');
ok(dashOut.indexOf('>' + EI.scores(byId['TK-000024']).vermoeidheid + ' ') >= 0, 'S5f: datzelfde record toont onverminderd zijn werkelijke score');

/* ══ S4 — confidence-comparator ══ */
console.log('S4. Confidence-sortering');
var cmpSrc = (function () {
  var i = HTML.indexOf("else if(sort==='confidence')r.sort(function(a,b){");
  assert.ok(i >= 0, 'confidence-comparator niet gevonden');
  var s = HTML.indexOf('function(a,b){', i);
  var d = 0, e = -1;
  for (var j = HTML.indexOf('{', s); j < HTML.length; j++) {
    if (HTML[j] === '{') d++; else if (HTML[j] === '}') { d--; if (d === 0) { e = j; break; } }
  }
  return HTML.slice(s, e + 1);
})();
var cmp = new Function('ExerciseIntelligence', 'return ' + cmpSrc + ';')(EI);
var sample = CAT.catalog.slice();
var nanSeen = false;
/* Exhaustief op de kritieke as: elk record tegen elk UNKNOWN-record en omgekeerd,
   plus alle UNKNOWN-paren onderling. Een steekproef zou juist het NaN-pad kunnen missen. */
var unknownRecs = sample.filter(function (c) { return EI.confidenceOf(c) === null; });
var probes = [];
sample.forEach(function (x) {
  unknownRecs.forEach(function (u) { probes.push([x, u]); probes.push([u, x]); });
});
unknownRecs.forEach(function (u1) {
  unknownRecs.forEach(function (u2) { probes.push([u1, u2]); });
});
probes.forEach(function (pr) {
  var r = cmp(pr[0], pr[1]);
  if (typeof r !== 'number' || isNaN(r)) { nanSeen = true; }
});
ok(!nanSeen, 'S4a: comparator retourneert nooit NaN over een brede steekproef');
var sorted = CAT.catalog.slice().sort(cmp);
var firstUnknown = sorted.findIndex(function (c) { return EI.confidenceOf(c) === null; });
var lastKnown = sorted.map(function (c) { return EI.confidenceOf(c); }).lastIndexOf(
  sorted.map(function (c) { return EI.confidenceOf(c); }).filter(function (v) { return v !== null; }).slice(-1)[0]);
ok(firstUnknown >= 0 && sorted.slice(firstUnknown).every(function (c) { return EI.confidenceOf(c) === null; }),
  'S4b: alle UNKNOWN-records staan aaneengesloten achteraan');
ok(sorted.slice(0, firstUnknown).every(function (c, i, arr) {
  return i === 0 || EI.confidenceOf(arr[i - 1]) >= EI.confidenceOf(c);
}), 'S4c: bekende confidence sorteert aflopend');
var again = CAT.catalog.slice().reverse().sort(cmp);
ok(JSON.stringify(sorted.map(function (c) { return c.catalog_id; })) ===
   JSON.stringify(again.map(function (c) { return c.catalog_id; })),
  'S4d: sortering is deterministisch, ongeacht invoervolgorde');

/* ══ S6 — posterdekking-metadata ══ */
console.log('S6. Posterdekking-metadata');
var prov = CAT.asset_providers.filter(function (p) { return p.id === 'movekit-posters'; })[0];
function posterKeys() {
  var i = HTML.indexOf('EXERCISE_POSTERS');
  var seg = HTML.slice(i, i + 2500000);
  var block = seg.slice(0, seg.indexOf('};'));
  var keys = (block.match(/"[a-z0-9\-]+":"data:image\/webp/g) || []).map(function (s) { return s.split('"')[1]; });
  var ea = (HTML.match(/"?movekit_slug"?:"[^"]+"/g) || []).map(function (s) { return s.split(':"')[1].replace(/"$/, ''); });
  var set = {};
  keys.concat(ea).forEach(function (k) { set[k] = 1; });
  return set;
}
var cover = posterKeys();
var resolving = CAT.catalog.filter(function (c) { return cover[c.source.provider_id]; }).length;
ok(prov.total === resolving, 'S6a: asset_providers.total (' + prov.total + ') == werkelijk resolvende posters (' + resolving + ')');
ok(prov.catalog_entries === CAT.catalog.length, 'S6b: catalog_entries (' + prov.catalog_entries + ') == catalogusomvang (' + CAT.catalog.length + ')');
ok(prov.missing === CAT.catalog.length - resolving, 'S6c: missing (' + prov.missing + ') == records zonder poster');
ok(NEW_IDS.every(function (id) { return !cover[byId[id].source.provider_id]; }),
  'S6d: geen enkel Batch-001-record heeft een poster (0/20, geen stille toevoeging)');
ok(!cover['cycling-intervals'] && !cover['cycling-sprint'],
  'S6e: cycling-intervals en cycling-sprint blijven zonder poster (SOURCE_ASSET_REVIEW_REQUIRED)');

/* ══ Engine/AI-veiligheid ══ */
console.log('7. Engine- en AI-veiligheid');
ok(prov.format === 'webp', '7a: posterformaat blijft webp (feitelijk runtimeformaat, ongewijzigd)');
ok(CAT.catalog.filter(function (c) { return c.intelligence && c.intelligence.human_verified === true; }).length === 0,
  '7b: geen enkel record wordt als human_verified gemarkeerd (geen valse validatieclaim)');
ok(NEW_IDS.every(function (id) {
  var r = byId[id].relations;
  return r.alternatives.length === 0 && r.progressions.length === 0 && r.regressions.length === 0;
}), '7c: relations blijven leeg — geen gereconstrueerde relatie-intelligentie');

console.log('\n========================================================');
console.log('fMovekitUnknownState.test.js \u2014 ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) process.exit(1);
