/* fSessieDuur.test.js — v4.49.0: Trainingsduur en sessiebelasting (Foster session-RPE)
 *
 * Dit is de eerste keer dat de app een DUUR per training vastlegt. Daarmee wordt een
 * grootheid mogelijk die er tot nu toe bewust niet was: één belasting die over kracht én
 * cardio heen geldig is. De tests hieronder bewaken drie dingen, in deze volgorde van
 * belang:
 *
 *  1. De negatieve eis blijft staan. Zonder gemeten duur mag er nog steeds GEEN
 *     gezamenlijk getal ontstaan. Een AU-reeks die op halve gegevens rust is gevaarlijker
 *     dan geen reeks, want hij ziet er net zo betrouwbaar uit.
 *  2. De rekenregel is deterministisch en weigert liever dan te gokken.
 *  3. De schrijfkant kan de app niet stukmaken zolang migratie_v449 nog niet gedraaid is,
 *     en presenteert een geweigerde write nooit als succes.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var CalcCore = require('../core/calculation.js');
var AC = require('../core/athlete.js');
var RC = require('../core/relationship.js');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

var geslaagd = 0, mislukt = 0;
function t(naam, fn) {
  try { fn(); geslaagd++; console.log('  ✓ ' + naam); }
  catch (e) { mislukt++; console.log('  ✗ ' + naam + ' :: ' + (e && e.message)); }
}

var DEPS = { calculateVolume: CalcCore.calculateVolume, oneRMRaw: CalcCore.oneRMRaw,
             sessionRpeLoad: CalcCore.sessionRpeLoad };

function dag(i) { return new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10); }
function kracht(datum, ex, sets, reps, kg, rpe, type, duur) {
  var r = { date: datum, exercise_id: ex, sets: sets, reps: reps, weight: kg,
            rpe: (rpe == null ? null : rpe), training_type: type || 'A' };
  if (duur != null) r.duration_s = duur;
  return r;
}
function cardio(datum, ex, meters, rpe, type, duur) {
  var r = { date: datum, exercise_id: ex, distance: meters, training_type: type || 'cardio' };
  if (rpe != null) r.rpe = rpe;
  if (duur != null) r.duration_s = duur;
  return r;
}

/* ══ A. DE REKENREGEL (srpe.v1) ═════════════════════════════════════════════ */
console.log('\nA. srpe.v1 — Foster session-RPE');

t('A1: het contract is vastgelegd en apart van load.v1', function () {
  assert.strictEqual(CalcCore.VERSIONS.srpe, 'srpe.v1');
  assert.strictEqual(AC.SRPE_VERSIE, 'srpe.v1');
  assert.strictEqual(AC.LOAD_VERSIE, 'load.v1',
    'load.v1 beschrijft nog steeds de belasting BINNEN een modaliteit en mag niet stil van betekenis veranderen');
});

t('A2: RPE 8 gedurende 60 minuten is 480 AU', function () {
  var r = CalcCore.sessionRpeLoad(8, 3600);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.waarde, 480);
  assert.strictEqual(r.eenheid, 'AU');
  assert.strictEqual(r.duur_min, 60);
});

t('A3: halve RPE en niet-ronde duur blijven exact', function () {
  assert.strictEqual(CalcCore.sessionRpeLoad(7.5, 2700).waarde, 337.5);
  assert.strictEqual(CalcCore.sessionRpeLoad(6, 1000).waarde, 100);
});

t('A4: zonder duur komt er GEEN getal, met een reden', function () {
  var r = CalcCore.sessionRpeLoad(8, null);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.waarde, null);
  assert.strictEqual(r.reden, 'duur_ontbreekt');
});

t('A5: zonder RPE komt er GEEN getal — een RPE wordt nooit geschat', function () {
  var r = CalcCore.sessionRpeLoad(null, 3600);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reden, 'geen_invoer');
});

t('A6: een RPE buiten de CR-10-schaal wordt geweigerd, niet afgekapt', function () {
  assert.strictEqual(CalcCore.sessionRpeLoad(11, 600).reden, 'rpe_buiten_schaal');
  assert.strictEqual(CalcCore.sessionRpeLoad(0, 600).reden, 'rpe_buiten_schaal');
  assert.strictEqual(CalcCore.sessionRpeLoad(-3, 600).reden, 'rpe_buiten_schaal');
});

t('A7: een onmogelijke duur is geen duur', function () {
  assert.strictEqual(CalcCore.sessionRpeLoad(8, 0).reden, 'duur_ontbreekt');
  assert.strictEqual(CalcCore.sessionRpeLoad(8, -60).reden, 'duur_ontbreekt');
  assert.strictEqual(CalcCore.sessionRpeLoad(8, 86401).reden, 'duur_onwaarschijnlijk');
  assert.strictEqual(CalcCore.SRPE_MAX_DUUR_S, 86400, 'moet gelijk zijn aan de check-constraint op sessions.duration_s');
});

t('A8: deterministisch — dezelfde invoer geeft dezelfde uitvoer', function () {
  var a = JSON.stringify(CalcCore.sessionRpeLoad(8.5, 4321));
  for (var i = 0; i < 25; i++) assert.strictEqual(JSON.stringify(CalcCore.sessionRpeLoad(8.5, 4321)), a);
});

t('A9: tekstinvoer wordt getypeerd, niet geraden', function () {
  assert.strictEqual(CalcCore.sessionRpeLoad('8', '3600').waarde, 480);
  assert.strictEqual(CalcCore.sessionRpeLoad('acht', 3600).reden, 'geen_invoer');
});

/* ══ B. DAGBEELD — duur en sessiebelasting per dag ═══════════════════════════ */
console.log('\nB. Dagbeeld');

t('B1: een dag zonder duur houdt duur en srpe leeg — er wordt niets ingevuld', function () {
  var m = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8)], DEPS);
  assert.strictEqual(m.dagen[0].duur_s, null);
  assert.strictEqual(m.dagen[0].srpe.waarde, null);
  assert.strictEqual(m.dagen[0].srpe.volledig, false);
});

t('B2: alle rijen van dezelfde training dragen dezelfde duur — die telt één keer', function () {
  var m = AC.dailyModel([
    kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600),
    kracht(dag(0), 'b', 4, 8, 80, 8, 'A', 3600),
    kracht(dag(0), 'c', 3, 5, 100, 8, 'A', 3600)
  ], DEPS);
  assert.strictEqual(m.dagen[0].duur_s, 3600, 'de duur is per training, niet per oefening');
  assert.strictEqual(m.dagen[0].srpe.waarde, 480);
});

t('B3: bij afwijkende waarden binnen één training wint de HOOGSTE', function () {
  /* Beschermt tegen een gedeeltelijk geschreven sessie: de eerste rijen kunnen een
     lagere stand dragen dan de laatste. Te laag zou de belasting onderschatten. */
  var m = AC.dailyModel([
    kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 1800),
    kracht(dag(0), 'b', 3, 10, 60, 8, 'A', 3600)
  ], DEPS);
  assert.strictEqual(m.dagen[0].duur_s, 3600);
});

t('B4: twee trainingen op één dag tellen op, elk met hun eigen duur en RPE', function () {
  var m = AC.dailyModel([
    kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600),          // 8 x 60 = 480
    cardio(dag(0), 'roeien', 5000, 6, 'cardio', 1800)      // 6 x 30 = 180
  ], DEPS);
  assert.strictEqual(m.dagen[0].srpe.waarde, 660);
  assert.strictEqual(m.dagen[0].srpe.trainingen, 2);
  assert.strictEqual(m.dagen[0].duur_min, 90);
});

t('B5: één training zonder duur maakt de hele dag onvolledig', function () {
  var m = AC.dailyModel([
    kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600),
    cardio(dag(0), 'roeien', 5000, 6, 'cardio', null)
  ], DEPS);
  assert.strictEqual(m.dagen[0].srpe.volledig, false);
  assert.strictEqual(m.dagen[0].srpe.waarde, null, 'een halve dagbelasting is erger dan geen');
  assert.strictEqual(m.dagen[0].srpe.gemeten, 1);
  assert.strictEqual(m.dagen[0].srpe.trainingen, 2);
});

t('B6: de sessie-RPE weegt met het aantal sets, niet ongewogen', function () {
  /* 5 sets op RPE 9 en 1 set op RPE 5 -> (9*5 + 5*1) / 6 = 8.3, niet 7.0 */
  var m = AC.dailyModel([
    kracht(dag(0), 'a', 5, 5, 100, 9, 'A', 3600),
    kracht(dag(0), 'b', 1, 10, 40, 5, 'A', 3600)
  ], DEPS);
  assert.strictEqual(m.dagen[0].srpe.perType[0].rpe, 8.3);
});

t('B7: een onmogelijke duur in de data wordt genegeerd, niet doorgerekend', function () {
  var m = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 999999)], DEPS);
  assert.strictEqual(m.dagen[0].duur_s, null);
  assert.strictEqual(m.dagen[0].srpe.waarde, null);
});

t('B8: zonder ingespoten rekenregel ontstaat er geen belasting — athlete.js rekent niet zelf', function () {
  var m = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600)],
                        { calculateVolume: CalcCore.calculateVolume });
  assert.strictEqual(m.dagen[0].srpe.waarde, null);
  assert.strictEqual(m.dagen[0].srpe.perType[0].reden, 'geen_rekenregel');
  assert.strictEqual(m.dagen[0].duur_s, 3600, 'de gemeten duur zelf blijft wel gewoon zichtbaar');
});

/* ══ C. DE GEZAMENLIJKE BELASTING — de negatieve eis blijft staan ════════════ */
console.log('\nC. unifiedLoad');

t('C1: zonder duur blijft kracht + cardio ONbeschikbaar (ongewijzigd gedrag)', function () {
  var m = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8), cardio(dag(1), 'roeien', 5000)], DEPS);
  var u = AC.unifiedLoad(m);
  assert.strictEqual(u.beschikbaar, false);
  assert.strictEqual(u.reden, 'geen_gemeenschappelijke_eenheid');
  assert.deepStrictEqual(u.ontbreekt, ['duur_per_sessie']);
  assert.strictEqual(u.reeks.length, 0);
});

t('C2: met duur én RPE op ELKE dag ontstaat er wél één reeks, in AU', function () {
  var m = AC.dailyModel([
    kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600),
    cardio(dag(1), 'roeien', 5000, 7, 'cardio', 1800)
  ], DEPS);
  var u = AC.unifiedLoad(m);
  assert.strictEqual(u.beschikbaar, true);
  assert.strictEqual(u.eenheid, 'AU');
  assert.strictEqual(u.bron, 'srpe');
  assert.strictEqual(u.belastingVersie, 'srpe.v1');
  assert.deepStrictEqual(u.reeks, [{ date: dag(0), value: 480 }, { date: dag(1), value: 210 }]);
});

t('C3: ÉÉN onvolledige dag blokkeert de hele reeks, met dekkingsgraad', function () {
  var m = AC.dailyModel([
    kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600),
    cardio(dag(1), 'roeien', 5000, 7, 'cardio', null)
  ], DEPS);
  var u = AC.unifiedLoad(m);
  assert.strictEqual(u.beschikbaar, false);
  assert.strictEqual(u.reeks.length, 0);
  assert.strictEqual(u.dekking, 0.5, 'de dekkingsgraad moet zichtbaar maken hoe dichtbij het is');
});

t('C4: bij één eenheid blijft de bestaande optelling in kg staan', function () {
  var m = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600),
                         kracht(dag(1), 'b', 4, 8, 80, 7, 'A', 3600)], DEPS);
  var u = AC.unifiedLoad(m);
  assert.strictEqual(u.beschikbaar, true);
  assert.strictEqual(u.eenheid, 'kg', 'bestaande betekenis mag niet stil veranderen in AU');
});

t('C5: kilo\'s en meters worden nooit rechtstreeks opgeteld', function () {
  var bron = fs.readFileSync(path.join(__dirname, 'athlete.js'), 'utf8');
  var code = bron.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  assert.ok(code.indexOf('Date.now') < 0 && code.indexOf('Math.random') < 0, 'athlete.js moet deterministisch blijven');
  assert.ok(code.indexOf('document.') < 0 && code.indexOf('fetch(') < 0, 'geen DOM of netwerk in een engine');
});

/* ══ D. AANSLUITING OP DE RELATIONSHIP ENGINE ═══════════════════════════════ */
console.log('\nD. Relationship Engine');

t('D1: trainingsduur is niet langer "toekomstig"', function () {
  var v = RC.VARIABLE_REGISTRY.filter(function (x) { return x.key === 'duur'; })[0];
  assert.ok(v, 'de registersleutel duur bestaat niet meer');
  assert.strictEqual(v.beschikbaarheid, 'nu');
  assert.strictEqual(v.eenheid, 'min');
});

t('D2: sessiebelasting staat als eigen grootheid in het register', function () {
  var v = RC.VARIABLE_REGISTRY.filter(function (x) { return x.key === 'srpe'; })[0];
  assert.ok(v, 'srpe ontbreekt in het register');
  assert.strictEqual(v.eenheid, 'AU');
  assert.deepStrictEqual(v.inputs.slice().sort(), ['duration', 'rpe'],
    'de invoer moet expliciet zijn, anders werkt de circulariteitstoets niet');
});

t('D3: de reeksen worden alleen geleverd als ze er echt zijn', function () {
  var zonder = AC.relationshipSources([kracht(dag(0), 'a', 3, 10, 60, 8)], DEPS).bronnen;
  assert.ok(!zonder.duur && !zonder.srpe, 'zonder gemeten duur mag er geen reeks ontstaan');
  var met = AC.relationshipSources([
    kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600),
    kracht(dag(1), 'b', 3, 10, 60, 7, 'A', 2700)
  ], DEPS).bronnen;
  assert.strictEqual(met.duur.length, 2);
  assert.strictEqual(met.duur[0].value, 60, 'de duur wordt in minuten geleverd, zoals het register zegt');
  assert.strictEqual(met.srpe.length, 2);
  assert.strictEqual(met.srpe[0].value, 480);
});

t('D4: een dag zonder duur ontbreekt in de reeks in plaats van als 0 mee te tellen', function () {
  var b = AC.relationshipSources([
    kracht(dag(0), 'a', 3, 10, 60, 8, 'A', 3600),
    kracht(dag(1), 'b', 3, 10, 60, 8, 'A', null),
    kracht(dag(2), 'c', 3, 10, 60, 8, 'A', 3600)
  ], DEPS).bronnen;
  assert.strictEqual(b.duur.length, 2);
  assert.deepStrictEqual(b.duur.map(function (p) { return p.date; }), [dag(0), dag(2)]);
});

t('D5: sessiebelasting is circulair met RPE, duur en belasting — en moet dus uitgesloten worden', function () {
  var reg = {};
  RC.VARIABLE_REGISTRY.forEach(function (v) { reg[v.key] = v; });
  function deeltInvoer(a, b) {
    return (reg[a].inputs || []).some(function (i) { return (reg[b].inputs || []).indexOf(i) >= 0; });
  }
  assert.ok(deeltInvoer('srpe', 'rpe'), 'srpe deelt RPE en mag daar geen verband mee vormen');
  assert.ok(deeltInvoer('srpe', 'duur'), 'srpe deelt de duur');
  assert.ok(deeltInvoer('srpe', 'load'), 'srpe deelt RPE met de belasting');
  assert.ok(!deeltInvoer('srpe', 'hrv'), 'tegenover herstel is er juist wél een zinnige vraag');
  assert.ok(!deeltInvoer('srpe', 'sleep'), 'tegenover slaap is er juist wél een zinnige vraag');
});

/* ══ E. DE SCHRIJFKANT IN DE APP ════════════════════════════════════════════ */
console.log('\nE. Schrijfkant (index.html)');

t('E1: de duur wordt gemeten met de bestaande pauzeveilige timer', function () {
  assert.ok(/function tkSessieDuurS\(\)/.test(HTML), 'tkSessieDuurS ontbreekt');
  var fn = HTML.match(/function tkSessieDuurS\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(fn.indexOf('currentWorkoutElapsedMs') >= 0, 'er wordt een tweede timer gebruikt in plaats van de bestaande');
  assert.ok(fn.indexOf('86400') >= 0, 'de plausibiliteitsgrens ontbreekt');
});

t('E2: de duur wordt gemeten VOOR de schrijflus, zodat elke rij dezelfde waarde krijgt', function () {
  var iMeting = HTML.indexOf('const _sessDurS=tkSessieDuurS()');
  var iLus = HTML.indexOf('for(const ex of list){', iMeting);
  assert.ok(iMeting > 0, 'de meting ontbreekt in finishSession');
  assert.ok(iLus > iMeting, 'de duur wordt pas tijdens of na de schrijflus bepaald');
});

t('E3: de duur wordt gemeten voordat de timer wordt gestopt', function () {
  var iMeting = HTML.indexOf('const _sessDurS=tkSessieDuurS()');
  var iStop = HTML.indexOf('stopTrainTimer()', iMeting);
  assert.ok(iStop > iMeting, 'stopTrainTimer staat vóór de meting — de duur zou nul worden');
});

t('E4: het veld gaat alleen mee als de kolom aantoonbaar bestaat', function () {
  assert.ok(/async function tkDurationKolomBeschikbaar\(\)/.test(HTML), 'de schema-controle ontbreekt');
  assert.ok(HTML.indexOf('const _durOk=(_sessDurS!=null) && await tkDurationKolomBeschikbaar();') >= 0,
    'finishSession schrijft de duur zonder de kolom te controleren — een nog niet gedraaide migratie zou de sessie doen mislukken');
});

t('E5: een negatief antwoord wordt niet blijvend onthouden', function () {
  var fn = HTML.match(/async function tkDurationKolomBeschikbaar\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(fn.indexOf("localStorage.setItem(TK_DUR_CAP_KEY,'1')") >= 0, 'het positieve antwoord wordt niet onthouden');
  assert.ok(fn.indexOf("setItem(TK_DUR_CAP_KEY,'0')") < 0,
    'een negatief antwoord blijvend onthouden betekent dat de app de migratie nooit meer opmerkt');
});

t('E6: een geweigerde write telt NIET als opgeslagen', function () {
  assert.ok(HTML.indexOf("throw new Error('sessions-write geweigerd (kracht)')") >= 0,
    'een false uit writeSessionRow wordt bij kracht nog steeds als succes geteld');
  assert.ok(HTML.indexOf("throw new Error('sessions-write geweigerd (cardio)')") >= 0,
    'een false uit writeSessionRow wordt bij cardio nog steeds als succes geteld');
});

t('E7: de rekenregel wordt ingespoten waar AthleteCore gebruikt wordt', function () {
  var n = (HTML.match(/sessionRpeLoad:\s*CC\.sessionRpeLoad/g) || []).length;
  assert.ok(n >= 2, 'srpe.v1 is niet overal ingespoten (' + n + ' van de 2 aanroepen)');
});

t('E8: de vastgelegde duur is ook zichtbaar voor de sporter', function () {
  assert.ok(HTML.indexOf("cell(_durStr,'duur')") >= 0,
    'de duur wordt opgeslagen maar nergens getoond — niet controleerbaar voor de sporter');
  assert.ok(HTML.indexOf('CardioCore.formatTime(_sessDurS)') >= 0,
    'er wordt een tweede tijdformatter gebruikt in plaats van cardio_time.v1');
});

/* ══ SLOT ═══════════════════════════════════════════════════════════════════ */
console.log('\n========================================================');
console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
if (mislukt) { console.log('❌ Sessieduur/sRPE niet groen.'); process.exit(1); }
console.log('✅ Trainingsduur en sessiebelasting groen.');
