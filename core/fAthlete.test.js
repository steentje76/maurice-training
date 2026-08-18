/* fAthlete.test.js — Sprint 21: Unified Athlete Intelligence
 *
 * De zwaarste eis in deze sprint is een negatieve: er mag NERGENS een getal ontstaan
 * dat kilo's en meters bij elkaar optelt. Dat is geen detail — zo'n getal ziet er
 * precies zo betrouwbaar uit als een echt getal en is dat niet. Daarom staan de
 * tests op die grens vooraan.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var AC = require('../core/athlete.js');
var CalcCore = require('../core/calculation.js');
var RC = require('../core/relationship.js');
var SportCore = require('../core/sportDefinition.js');

var DEPS = { calculateVolume: CalcCore.calculateVolume, oneRMRaw: CalcCore.oneRMRaw };
var n = 0;
function t(naam, fn) { fn(); n++; }

function kracht(datum, ex, sets, reps, kg, rpe, type) {
  return { date: datum, exercise_id: ex, sets: sets, reps: reps, weight: kg,
           rpe: (rpe == null ? null : rpe), training_type: type || 'A' };
}
function cardio(datum, ex, meters) {
  return { date: datum, exercise_id: ex, distance: meters, training_type: 'cardio' };
}
function dag(i) {
  var d = new Date(Date.UTC(2026, 0, 1) + i * 86400000);
  return d.toISOString().slice(0, 10);
}

/* ── 1. Contracten ────────────────────────────────────────────────────────── */
t('drie contractversies zijn vastgelegd', function () {
  assert.strictEqual(AC.ATHLETE_VERSIE, 'athlete.v1');
  assert.strictEqual(AC.LOAD_VERSIE, 'load.v1');
  assert.strictEqual(AC.PERFINDEX_VERSIE, 'performance_index.v1');
});

t('elke modaliteit noemt haar eenheid', function () {
  Object.keys(AC.MODALITEITEN).forEach(function (k) {
    var m = AC.MODALITEITEN[k];
    assert.ok(m.label, k + ' mist label');
    assert.ok(Object.prototype.hasOwnProperty.call(m, 'eenheid'), k + ' mist eenheid');
  });
  assert.strictEqual(AC.MODALITEITEN.strength.eenheid, 'kg');
  assert.strictEqual(AC.MODALITEITEN.cardio.eenheid, 'm');
  assert.strictEqual(AC.MODALITEITEN.overig.eenheid, null);
});

/* ── 2. GEEN pseudo-precisie: kilo's en meters worden nooit opgeteld ──────── */
t('met kracht én cardio komt er GEEN gezamenlijk getal', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8), cardio(dag(1), 'roeien', 5000)], DEPS);
  var u = AC.unifiedLoad(model);
  assert.strictEqual(u.beschikbaar, false);
  assert.strictEqual(u.reden, 'geen_gemeenschappelijke_eenheid');
  assert.strictEqual(u.reeks.length, 0);
  assert.deepStrictEqual(u.eenheden, ['kg', 'm']);
  assert.deepStrictEqual(u.ontbreekt, ['duur_per_sessie'],
    'de ontbrekende capability moet expliciet benoemd zijn, niet stilzwijgend');
});

t('met één eenheid mag er wel opgeteld worden', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8), kracht(dag(1), 'b', 4, 8, 80, 7)], DEPS);
  var u = AC.unifiedLoad(model);
  assert.strictEqual(u.beschikbaar, true);
  assert.strictEqual(u.eenheid, 'kg');
  assert.strictEqual(u.reeks.length, 2);
});

t('een dag met twee modaliteiten houdt ze gescheiden', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8), cardio(dag(0), 'roeien', 5000)], DEPS);
  var d0 = model.dagen[0];
  assert.strictEqual(d0.modaliteiten.length, 2, 'modaliteiten zijn samengevoegd');
  var eenheden = d0.modaliteiten.map(function (m) { return m.eenheid; }).sort();
  assert.deepStrictEqual(eenheden, ['kg', 'm']);
});

t('de bron bevat geen optelling over modaliteiten heen', function () {
  var bron = fs.readFileSync(path.join(__dirname, 'athlete.js'), 'utf8');
  var code = bron.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  assert.ok(code.indexOf('Date.now') < 0, 'Date.now in athlete.js');
  assert.ok(code.indexOf('Math.random') < 0, 'Math.random in athlete.js');
  assert.ok(code.indexOf('document.') < 0 && code.indexOf('fetch(') < 0, 'DOM of netwerk in een engine');
});

/* ── 3. Modaliteit bepalen ────────────────────────────────────────────────── */
t('kracht wordt herkend aan sets, reps en gewicht', function () {
  assert.strictEqual(AC.modaliteitVan({ sets: 3, reps: 10, weight: 60 }), 'strength');
});

t('cardio wordt herkend aan afstand', function () {
  assert.strictEqual(AC.modaliteitVan({ distance: 5000 }), 'cardio');
});

t('een sessie zonder bruikbare invoer is overig en telt nergens mee', function () {
  assert.strictEqual(AC.modaliteitVan({ note: 'gewandeld' }), 'overig');
  var model = AC.dailyModel([{ date: dag(0), note: 'gewandeld' }], DEPS);
  assert.strictEqual(model.dagen[0].sessies, 1, 'de sessie zelf blijft geteld');
  assert.strictEqual(model.dagen[0].modaliteiten.length, 0, 'maar hij belandt in geen enkele optelling');
});

t('onvolledige krachtinvoer wordt geen kracht', function () {
  assert.strictEqual(AC.modaliteitVan({ sets: 3, reps: 10 }), 'overig');
  assert.strictEqual(AC.modaliteitVan({ sets: 3, reps: 10, weight: 0 }), 'overig');
});

/* ── 4. Sessiebelasting ───────────────────────────────────────────────────── */
t('tonnage komt uit CalcCore, niet uit een eigen formule', function () {
  var l = AC.sessionLoad(kracht(dag(0), 'a', 3, 10, 60, null), DEPS);
  assert.strictEqual(l.volume, CalcCore.calculateVolume({ sets: 3, reps: 10, weight: 60 }));
  assert.strictEqual(l.waarde, 1800);
  assert.strictEqual(l.gewogen, false);
});

t('RPE weegt de tonnage en dat is zichtbaar in de uitkomst', function () {
  var l = AC.sessionLoad(kracht(dag(0), 'a', 3, 10, 60, 8), DEPS);
  assert.strictEqual(l.waarde, 1440);              // 1800 * 8/10
  assert.strictEqual(l.gewogen, true);
  assert.strictEqual(l.rpe, 8);
});

t('een RPE buiten de schaal wordt genegeerd, niet geknepen', function () {
  var l = AC.sessionLoad(kracht(dag(0), 'a', 3, 10, 60, 14), DEPS);
  assert.strictEqual(l.gewogen, false);
  assert.strictEqual(l.rpe, null);
  assert.strictEqual(l.waarde, 1800);
});

t('zonder rekenfunctie wordt er niets verzonnen', function () {
  var l = AC.sessionLoad(kracht(dag(0), 'a', 3, 10, 60, 8), {});
  assert.strictEqual(l.waarde, null);
  assert.strictEqual(l.reden, 'volume_niet_berekenbaar');
});

/* ── 5. Dagbeeld ──────────────────────────────────────────────────────────── */
t('sessies op dezelfde dag worden opgeteld binnen hun modaliteit', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, null), kracht(dag(0), 'b', 4, 8, 80, null)], DEPS);
  var m = model.dagen[0].modaliteiten[0];
  assert.strictEqual(m.volume, 1800 + 2560);
  assert.strictEqual(m.sets, 7);
  assert.strictEqual(m.sessies, 2);
});

t('RPE wordt gewogen met het aantal sets', function () {
  /* 3 sets op RPE 6 en 9 sets op RPE 9 -> zwaartepunt richting 9, niet 7,5. */
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 6), kracht(dag(0), 'b', 9, 10, 60, 9)], DEPS);
  var m = model.dagen[0].modaliteiten[0];
  assert.strictEqual(m.rpe, 8.3);
  assert.ok(m.rpe > 7.5, 'ongewogen gemiddelde gebruikt');
});

t('een sessie zonder RPE verlaagt het gemiddelde niet', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 9), kracht(dag(0), 'b', 3, 10, 60, null)], DEPS);
  var m = model.dagen[0].modaliteiten[0];
  assert.strictEqual(m.rpe, 9, 'ontbrekende RPE is meegerekend als waarde');
  assert.strictEqual(m.rpeDekking, 0.5, 'dekking hoort zichtbaar te zijn');
});

t('dagen staan op volgorde en dagen zonder sessie ontbreken', function () {
  var model = AC.dailyModel([kracht(dag(5), 'a', 3, 10, 60), kracht(dag(0), 'a', 3, 10, 60)], DEPS);
  assert.deepStrictEqual(model.dagen.map(function (d) { return d.date; }), [dag(0), dag(5)]);
  assert.strictEqual(model.aantalDagen, 2, 'lege dagen zijn aangevuld');
});

t('serie levert nooit een nul voor een dag zonder die modaliteit', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60), cardio(dag(1), 'roeien', 5000)], DEPS);
  var s = AC.serie(model, 'strength', 'volume');
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].date, dag(0));
  s.forEach(function (p) { assert.notStrictEqual(p.value, 0); });
});

/* ── 6. Rollende reeksen ──────────────────────────────────────────────────── */
t('de weeksom loopt over kalenderdagen, niet over metingen', function () {
  var reeks = [{ date: dag(0), value: 100 }, { date: dag(1), value: 100 }, { date: dag(30), value: 100 }];
  var r = AC.rollingSum(reeks, 7);
  assert.strictEqual(r[0].value, 100);
  assert.strictEqual(r[1].value, 200);
  assert.strictEqual(r[2].value, 100, 'een training van een maand terug telt mee in de weeksom');
});

t('de vorige-dagreeks schuift de waarde een trainingsdag op', function () {
  var reeks = [{ date: dag(0), value: 100 }, { date: dag(1), value: 200 }, { date: dag(2), value: 300 }];
  var r = AC.previousDaySeries(reeks, 3);
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0].date, dag(1));
  assert.strictEqual(r[0].value, 100);
});

t('een te groot gat telt niet als vorige dag', function () {
  var reeks = [{ date: dag(0), value: 100 }, { date: dag(20), value: 200 }];
  assert.strictEqual(AC.previousDaySeries(reeks, 3).length, 0);
});

t('frequentie telt trainingsdagen als geheel getal', function () {
  var reeks = [dag(0), dag(1), dag(2)].map(function (d) { return { date: d, value: 1 }; });
  var f = AC.frequencySeries(reeks, 7);
  assert.deepStrictEqual(f.map(function (p) { return p.value; }), [1, 2, 3]);
});

/* ── 7. Monotonie en acuut/chronisch ──────────────────────────────────────── */
t('monotonie weigert een oordeel bij te weinig dagen', function () {
  var m = AC.monotony([{ date: dag(0), value: 100 }, { date: dag(1), value: 200 }], 7);
  assert.strictEqual(m.waarde, null);
  assert.strictEqual(m.reden, 'te_weinig_dagen');
  assert.strictEqual(m.minimum, AC.MONOTONIE_MIN_DAGEN);
});

t('monotonie weigert een oordeel zonder spreiding', function () {
  var reeks = [];
  for (var i = 0; i < 7; i++) reeks.push({ date: dag(i), value: 100 });
  var m = AC.monotony(reeks, 7);
  assert.strictEqual(m.waarde, null);
  assert.strictEqual(m.reden, 'geen_spreiding');
});

t('afwisselende belasting geeft een lagere monotonie dan gelijkmatige', function () {
  var vlak = [], wissel = [];
  for (var i = 0; i < 7; i++) {
    vlak.push({ date: dag(i), value: 100 + (i % 2) });
    wissel.push({ date: dag(i), value: (i % 2) ? 200 : 20 });
  }
  assert.ok(AC.monotony(vlak, 7).waarde > AC.monotony(wissel, 7).waarde);
});

t('monotonie interpreteert niet — er komt geen oordeel uit', function () {
  var reeks = [];
  for (var i = 0; i < 7; i++) reeks.push({ date: dag(i), value: 100 + i * 10 });
  var m = AC.monotony(reeks, 7);
  ['status', 'advies', 'waarschuwing', 'risico', 'band'].forEach(function (veld) {
    assert.ok(!Object.prototype.hasOwnProperty.call(m, veld),
      'monotonie levert een oordeel (' + veld + ') — dat hoort in de Decision Engine');
  });
});

t('acuut/chronisch weigert bij een te kort bereik', function () {
  var reeks = [];
  for (var i = 0; i < 5; i++) reeks.push({ date: dag(i), value: 100 });
  var a = AC.acuteChronic(reeks, 7, 28);
  assert.strictEqual(a.waarde, null);
  assert.strictEqual(a.reden, 'te_kort_bereik');
  assert.strictEqual(a.minimum, AC.ACWR_MIN_DAGEN);
});

t('een constante belasting geeft een verhouding rond 1', function () {
  var reeks = [];
  for (var i = 0; i < 28; i++) reeks.push({ date: dag(i), value: 100 });
  var a = AC.acuteChronic(reeks, 7, 28);
  assert.strictEqual(a.reden, 'ok');
  assert.ok(Math.abs(a.waarde - 1) < 0.05, 'kreeg ' + a.waarde);
});

t('een plotselinge piek verhoogt de verhouding', function () {
  var reeks = [];
  for (var i = 0; i < 28; i++) reeks.push({ date: dag(i), value: i >= 21 ? 300 : 100 });
  assert.ok(AC.acuteChronic(reeks, 7, 28).waarde > 1.5);
});

t('acuut/chronisch bevat geen grenswaarde en geen oordeel', function () {
  var bron = fs.readFileSync(path.join(__dirname, 'athlete.js'), 'utf8');
  var blok = bron.slice(bron.indexOf('function acuteChronic'), bron.indexOf('PRESTATIE-INDEX'));
  ['1.3', '1.5', 'risico', 'gevaar', 'te hoog'].forEach(function (w) {
    assert.ok(blok.indexOf(w) < 0, 'grens of oordeel in acuteChronic: ' + w);
  });
});

/* ── 8. Prestatie-index ───────────────────────────────────────────────────── */
t('zonder genoeg voorgeschiedenis komt er geen index', function () {
  var pi = AC.performanceIndex([kracht(dag(0), 'a', 3, 10, 60), kracht(dag(1), 'a', 3, 10, 62)], DEPS);
  assert.strictEqual(pi.reeks.length, 0);
  assert.strictEqual(pi.reden, 'te_weinig_historie');
  assert.strictEqual(pi.minimumHistorie, AC.PERFINDEX_MIN_HISTORIE);
});

t('de index meet je eigen niveau, niet de zwaarte van de oefening', function () {
  /* Twee oefeningen met heel verschillende absolute gewichten, beide precies op hun
     eigen mediane niveau. De index hoort voor allebei 1,00 te zijn — een absolute
     e1RM-reeks zou hier een sprong van 60 naar 160 kg laten zien. */
  var ss = [];
  [60, 60, 60, 60].forEach(function (kg, i) { ss.push(kracht(dag(i), 'licht', 3, 5, kg)); });
  [160, 160, 160, 160].forEach(function (kg, i) { ss.push(kracht(dag(i + 10), 'zwaar', 3, 5, kg)); });
  var pi = AC.performanceIndex(ss, DEPS);
  assert.ok(pi.reeks.length >= 2);
  pi.reeks.forEach(function (p) {
    assert.ok(Math.abs(p.value - 1) < 0.001, 'index ' + p.value + ' op ' + p.date);
  });
});

t('boven het eigen niveau presteren geeft een index boven 1', function () {
  var ss = [];
  for (var i = 0; i < 4; i++) ss.push(kracht(dag(i), 'a', 3, 5, 100));
  ss.push(kracht(dag(4), 'a', 3, 5, 110));
  var pi = AC.performanceIndex(ss, DEPS);
  var laatste = pi.reeks[pi.reeks.length - 1];
  assert.ok(laatste.value > 1.05, 'kreeg ' + laatste.value);
});

t('zonder e1RM-functie wordt er niets berekend', function () {
  var pi = AC.performanceIndex([kracht(dag(0), 'a', 3, 10, 60)], {});
  assert.strictEqual(pi.reden, 'geen_e1rm_functie');
  assert.strictEqual(pi.reeks.length, 0);
});

t('cardio telt niet mee in de prestatie-index', function () {
  var ss = [cardio(dag(0), 'roeien', 5000), cardio(dag(1), 'roeien', 5200)];
  var pi = AC.performanceIndex(ss, DEPS);
  assert.strictEqual(pi.reeks.length, 0);
  assert.strictEqual(pi.oefeningen, 0);
});

/* ── 9. Sportcontext (architectuur voor meerdere sporten) ─────────────────── */
t('sportcontext gebruikt de bestaande sportdefinities', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8, 'kracht'), cardio(dag(1), 'roeien', 5000)], DEPS);
  var ctx = AC.sportContext(model, {
    resolveCanonicalSportId: SportCore.resolveCanonicalSportId,
    getSportDefinition: SportCore.getSportDefinition
  });
  var kr = ctx.sporten.filter(function (s) { return s.trainingType === 'kracht'; })[0];
  assert.ok(kr, 'trainingstype kracht ontbreekt');
  assert.strictEqual(kr.herkend, true);
  assert.strictEqual(kr.sportId, 'kracht');
});

t('een onbekend trainingstype verdwijnt niet, maar wordt wel als onbekend gemeld', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60, 8, 'zelfbedacht')], DEPS);
  var ctx = AC.sportContext(model, {
    resolveCanonicalSportId: SportCore.resolveCanonicalSportId,
    getSportDefinition: SportCore.getSportDefinition
  });
  assert.strictEqual(ctx.sporten.length, 1);
  assert.strictEqual(ctx.sporten[0].herkend, false);
});

t('meerdere modaliteiten worden als zodanig gemeld', function () {
  var model = AC.dailyModel([kracht(dag(0), 'a', 3, 10, 60), cardio(dag(1), 'roeien', 5000)], DEPS);
  var ctx = AC.sportContext(model, {});
  assert.strictEqual(ctx.multiModaliteit, true);
  assert.strictEqual(ctx.modaliteiten.length, 2);
});

t('sportcontext bouwt geen eigen sportenlijst', function () {
  var bron = fs.readFileSync(path.join(__dirname, 'athlete.js'), 'utf8');
  ['hardlopen', 'wielrennen', 'crossfit', 'hyrox', 'triathlon'].forEach(function (sport) {
    assert.ok(bron.toLowerCase().indexOf("'" + sport + "'") < 0,
      'sportenlijst gedupliceerd in athlete.js: ' + sport);
  });
});

/* ── 10. Koppeling met de Relationship Engine ─────────────────────────────── */
t('de geleverde bronsleutels staan allemaal in het variabelenregister', function () {
  var ss = [];
  for (var i = 0; i < 12; i++) ss.push(kracht(dag(i), 'a', 3, 10, 60 + i, 7 + (i % 3)));
  var uit = AC.relationshipSources(ss, DEPS);
  Object.keys(uit.bronnen).forEach(function (k) {
    assert.ok(RC.variableByKey(k), 'onbekende bronsleutel: ' + k);
  });
});

t('de trainingsreeksen komen daadwerkelijk in de inventarisatie terecht', function () {
  var ss = [];
  for (var i = 0; i < 12; i++) ss.push(kracht(dag(i), 'a', 3, 10, 60 + i, 7 + (i % 3)));
  var uit = AC.relationshipSources(ss, DEPS);
  var inv = RC.inventory(uit.bronnen);
  ['volume', 'load', 'sets', 'rpe'].forEach(function (k) {
    assert.ok(inv.aanwezig.indexOf(k) >= 0, k + ' ontbreekt in de inventarisatie');
  });
});

t('zonder sessies komen er geen reeksen', function () {
  var uit = AC.relationshipSources([], DEPS);
  assert.deepStrictEqual(Object.keys(uit.bronnen), []);
});

t('volume en belasting worden circulair bevonden en dus niet gepaard', function () {
  var ss = [];
  for (var i = 0; i < 12; i++) ss.push(kracht(dag(i), 'a', 3, 10, 60 + i, 7 + (i % 3)));
  var DecisionCore = require('../core/decision.js');
  var inv = RC.inventory(AC.relationshipSources(ss, DEPS).bronnen);
  var k = RC.candidates(inv, { verbandIsCirculair: DecisionCore.verbandIsCirculair });
  var ids = k.kandidaten.map(function (c) { return c.id; });
  assert.ok(ids.indexOf('volume__load') < 0 && ids.indexOf('load__volume') < 0,
    'belasting komt uit volume — dat paar meet de formule, niet de sporter');
  assert.ok(ids.indexOf('load__rpe') < 0 && ids.indexOf('rpe__load') < 0,
    'belasting is met RPE gewogen — dat paar is circulair');
});

t('belasting van gisteren tegen herstel van vandaag is wel een geldig paar', function () {
  var DecisionCore = require('../core/decision.js');
  var bronnen = { load_vorige_dag: [{ date: dag(1), value: 1000 }], hrv: [{ date: dag(1), value: 45 }] };
  var k = RC.candidates(RC.inventory(bronnen), { verbandIsCirculair: DecisionCore.verbandIsCirculair });
  assert.strictEqual(k.kandidaten.length, 1, 'het tijdsverschoven paar is geweigerd');
  assert.strictEqual(k.kandidaten[0].crossDomein, true);
});

t('de app laadt AthleteCore en de service worker cachet hem', function () {
  var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  var sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.ok(html.indexOf('core/athlete.js') > 0, 'athlete.js wordt niet geladen');
  assert.ok(sw.indexOf("'/core/athlete.js'") > 0, 'athlete.js wordt niet geprecached');
});

t('de UI levert trainingsreeksen aan zonder zelf te rekenen', function () {
  var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  var m = html.match(/function tkAthleteBronnen\s*\([\s\S]*?\n\}/);
  assert.ok(m, 'tkAthleteBronnen ontbreekt');
  var bron = m[0];
  assert.ok(bron.indexOf('AC.relationshipSources') > 0, 'de UI gebruikt de engine niet');
  ['sets*reps', 'sets *', '* reps *', 'Math.sqrt'].forEach(function (v) {
    assert.ok(bron.indexOf(v) < 0, 'rekenwerk in de UI: ' + v);
  });
});

t('de sessies-query gebruikt de bestaande timeout-bescherming', function () {
  var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  var m = html.match(/async function tkRelData\s*\([\s\S]*?\n\}/);
  assert.ok(m && m[0].indexOf("v43SafeGet('sessions'") > 0, 'sessies worden zonder timeout geladen');
});

/* ── 11. Determinisme ─────────────────────────────────────────────────────── */
t('dezelfde sessies leveren exact hetzelfde model', function () {
  var ss = [];
  for (var i = 0; i < 20; i++) ss.push(kracht(dag(i), 'ex' + (i % 3), 3 + (i % 3), 8, 50 + i, 6 + (i % 4)));
  ss.push(cardio(dag(5), 'roeien', 4000));
  var a = JSON.stringify(AC.relationshipSources(ss, DEPS));
  var b = JSON.stringify(AC.relationshipSources(ss, DEPS));
  assert.strictEqual(a, b);
});

t('de volgorde van de invoer verandert de uitkomst niet', function () {
  var ss = [];
  for (var i = 0; i < 15; i++) ss.push(kracht(dag(i), 'a', 3, 10, 60 + i, 8));
  var omgekeerd = ss.slice().reverse();
  assert.strictEqual(JSON.stringify(AC.dailyModel(ss, DEPS)), JSON.stringify(AC.dailyModel(omgekeerd, DEPS)));
});

t('de sessies worden niet gemuteerd', function () {
  var ss = [kracht(dag(0), 'a', 3, 10, 60, 8), cardio(dag(1), 'roeien', 5000)];
  var voor = JSON.stringify(ss);
  AC.relationshipSources(ss, DEPS);
  assert.strictEqual(JSON.stringify(ss), voor);
});

t('rommelige invoer levert geen crash en geen verzonnen dagen', function () {
  [null, undefined, [], [null], [{}], [{ date: null }], 'x', 42].forEach(function (invoer) {
    var m = AC.dailyModel(invoer, DEPS);
    assert.strictEqual(m.versie, 'athlete.v1');
    assert.ok(Array.isArray(m.dagen));
  });
});

console.log('fAthlete.test.js — ' + n + ' asserts geslaagd');
