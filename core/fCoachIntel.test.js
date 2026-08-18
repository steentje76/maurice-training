/* fCoachIntel.test.js — Sprint 22: Coach Intelligence Integration
 *
 * De vraag die deze tests beantwoorden is niet "praat de coach mooi", maar: kan de AI
 * bij iets waar hij niet bij mag? Alles wat het model bereikt loopt door
 * intelligenceAiPayload; wat daar niet doorheen komt kan hij niet herinterpreteren.
 * Daarom staan de payload-tests hier centraal en niet als bijzaak.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var CC = require('../core/coaching.js');
var RC = require('../core/relationship.js');
var AC = require('../core/athlete.js');

var n = 0;
function t(naam, fn) { fn(); n++; }

function rel(over) {
  return Object.assign({
    relationship_id: 'sleep__hrv', bronLabel: 'Slaap', doelLabel: 'HRV',
    domein: 'recovery', domeinLabel: 'Herstel', crossDomein: false,
    status: 'STRONG_PATTERN', is_patroon: true, effect: 0.62, effect_direction: 'higher',
    sample_count: 42, confidence: 'hoog', strength_label: 'Sterke samenhang',
    zin: 'Op dagen waarop je langer sliep, lag je HRV gemiddeld hoger.',
    onderbouwing: 'Gebaseerd op 42 dagen met beide metingen.',
    disclaimer: 'Dit is een samenhang, geen oorzaak.',
    data_quality: { niveau: 'goed', uitgesloten: 0 }
  }, over || {});
}

/* ── 1. Contract ──────────────────────────────────────────────────────────── */
t('het contract is coach_intelligence.v1', function () {
  assert.strictEqual(CC.INTEL_VERSIE, 'coach_intelligence.v1');
  assert.strictEqual(CC.VERSIONS.intelligence, 'coach_intelligence.v1');
  assert.strictEqual(CC.buildIntelligenceContext({}).versie, 'coach_intelligence.v1');
});

t('de bestaande coachlagen blijven bestaan', function () {
  ['buildLiveContext', 'liveCoachMessage', 'liveAiPayload', 'buildReadinessContext',
   'readinessCoachMessage', 'buildContext', 'aiPayload', 'buildCoachConclusion']
    .forEach(function (fn) {
      assert.strictEqual(typeof CC[fn], 'function', 'bestaande coachfunctie verdwenen: ' + fn);
    });
});

/* ── 2. Alleen vrijgegeven patronen bereiken de coach ─────────────────────── */
t('een relatie met te weinig data wordt niet doorgegeven', function () {
  var c = CC.buildIntelligenceContext({ relaties: [rel({
    status: 'INSUFFICIENT_DATA', is_patroon: false, sample_count: 12, zin: null })] });
  assert.strictEqual(c.inzichten.length, 0);
  assert.strictEqual(c.onderzocht, 1);
  assert.strictEqual(c.vrijgegeven, 0);
  assert.ok(c.redenen.indexOf('geen_vrijgegeven_patroon') >= 0);
});

t('geen patroon wordt niet als inzicht doorgegeven', function () {
  var c = CC.buildIntelligenceContext({ relaties: [rel({
    status: 'NO_PATTERN', is_patroon: false,
    zin: 'Tussen je slaap en je HRV is in deze periode geen duidelijke samenhang te zien.' })] });
  assert.strictEqual(c.inzichten.length, 0);
});

t('een vrijgegeven patroon komt er ongewijzigd doorheen', function () {
  var c = CC.buildIntelligenceContext({ relaties: [rel()] });
  assert.strictEqual(c.inzichten.length, 1);
  assert.strictEqual(c.inzichten[0].zin, rel().zin, 'de zin is geherformuleerd');
  assert.strictEqual(c.inzichten[0].dagen, 42);
  assert.strictEqual(c.inzichten[0].disclaimer, 'Dit is een samenhang, geen oorzaak.');
});

t('een patroon zonder zin bereikt de coach niet', function () {
  var c = CC.buildIntelligenceContext({ relaties: [rel({ zin: null })] });
  assert.strictEqual(c.inzichten.length, 0);
});

/* ── 3. Prioritering: niet alles tonen ────────────────────────────────────── */
t('er gaan er standaard hooguit drie doorheen', function () {
  var veel = [];
  for (var i = 0; i < 10; i++) veel.push(rel({ relationship_id: 'r' + i }));
  var c = CC.buildIntelligenceContext({ relaties: veel });
  assert.strictEqual(c.inzichten.length, CC.INTEL_MAX_INZICHTEN);
  assert.strictEqual(c.getoond, 3);
  assert.strictEqual(c.nietGetoond, 7, 'de coach hoort te weten hoeveel hij weglaat');
});

t('sterkere patronen gaan voor', function () {
  var c = CC.buildIntelligenceContext({ max: 1, relaties: [
    rel({ relationship_id: 'zwak', status: 'POSSIBLE_PATTERN' }),
    rel({ relationship_id: 'sterk', status: 'STRONG_PATTERN' })
  ] });
  assert.strictEqual(c.inzichten[0].id, 'sterk');
});

t('bij gelijke sterkte gaat betrouwbaarheid voor', function () {
  var c = CC.buildIntelligenceContext({ max: 1, relaties: [
    rel({ relationship_id: 'laag', confidence: 'laag' }),
    rel({ relationship_id: 'hoog', confidence: 'hoog' })
  ] });
  assert.strictEqual(c.inzichten[0].id, 'hoog');
});

t('een cross-domein verband wint van een verband binnen een domein', function () {
  var c = CC.buildIntelligenceContext({ max: 1, relaties: [
    rel({ relationship_id: 'binnen', crossDomein: false }),
    rel({ relationship_id: 'kruis', crossDomein: true })
  ] });
  assert.strictEqual(c.inzichten[0].id, 'kruis');
});

t('de volgorde is stabiel bij volledig gelijke relaties', function () {
  var a = [rel({ relationship_id: 'zebra' }), rel({ relationship_id: 'appel' })];
  var b = [rel({ relationship_id: 'appel' }), rel({ relationship_id: 'zebra' })];
  assert.deepStrictEqual(
    CC.buildIntelligenceContext({ relaties: a }).inzichten.map(function (z) { return z.id; }),
    CC.buildIntelligenceContext({ relaties: b }).inzichten.map(function (z) { return z.id; }));
});

/* ── 4. Belasting, herstel en prestatie ───────────────────────────────────── */
t('belasting komt binnen als feit en wordt niet herberekend', function () {
  var c = CC.buildIntelligenceContext({ belasting: {
    week: 12500, eenheid: 'kg', frequentie7: 3, frequentie28: 11,
    monotonie: { waarde: 1.42, reden: 'ok' }, acwr: { waarde: 1.08, reden: 'ok' } } });
  assert.strictEqual(c.belasting.week, 12500);
  assert.strictEqual(c.belasting.monotonie, 1.42);
  assert.strictEqual(c.belasting.acwr, 1.08);
});

t('een ontbrekende belastingmaat draagt haar reden mee', function () {
  var c = CC.buildIntelligenceContext({ belasting: {
    week: 500, eenheid: 'kg',
    monotonie: { waarde: null, reden: 'te_weinig_dagen' },
    acwr: { waarde: null, reden: 'te_kort_bereik' } } });
  assert.strictEqual(c.belasting.monotonie, null);
  assert.strictEqual(c.belasting.monotonieReden, 'te_weinig_dagen');
  assert.strictEqual(c.belasting.acwrReden, 'te_kort_bereik');
});

t('een herstelstatus zonder score wordt niet doorgegeven', function () {
  var c = CC.buildIntelligenceContext({ herstel: { score: null, band: 'hoog' } });
  assert.strictEqual(c.herstel, null);
  assert.ok(c.redenen.indexOf('geen_herstelstatus') >= 0);
});

t('een herstelstatus met score wordt afgerond doorgegeven', function () {
  var c = CC.buildIntelligenceContext({ herstel: { score: 72.6, band: 'gemiddeld', confidence: 'hoog' } });
  assert.strictEqual(c.herstel.score, 73);
  assert.strictEqual(c.herstel.band, 'gemiddeld');
});

t('zonder enige invoer is de context niet beschikbaar en zegt hij waarom', function () {
  var c = CC.buildIntelligenceContext({});
  assert.strictEqual(c.beschikbaar, false);
  assert.ok(c.redenen.length >= 2);
  assert.ok(c.redenen.indexOf('geen_relaties_onderzocht') >= 0);
});

/* ── 5. AI-grens: de payload is een zeef, geen doorgeefluik ───────────────── */
t('de payload bevat uitsluitend toegestane contextvelden', function () {
  var c = CC.buildIntelligenceContext({ relaties: [rel()], herstel: { score: 70, band: 'hoog' } });
  var p = CC.intelligenceAiPayload(c);
  Object.keys(p).forEach(function (k) {
    assert.ok(CC.INTEL_AI_FIELDS.indexOf(k) >= 0, 'veld lekt naar de AI: ' + k);
  });
});

t('interne velden bereiken de AI niet', function () {
  var c = CC.buildIntelligenceContext({ relaties: [rel()] });
  var p = CC.intelligenceAiPayload(c);
  ['onderzocht', 'vrijgegeven', 'getoond', 'nietGetoond', 'maximum', 'redenen', 'versie']
    .forEach(function (k) {
      assert.strictEqual(p[k], undefined, 'intern veld lekt naar de AI: ' + k);
    });
});

t('de ruwe coefficient bereikt de AI niet', function () {
  var c = CC.buildIntelligenceContext({ relaties: [rel()] });
  var p = CC.intelligenceAiPayload(c);
  var tekst = JSON.stringify(p);
  assert.ok(tekst.indexOf('0.62') < 0, 'de coefficient lekt — de AI zou hem kunnen herinterpreteren');
  assert.ok(tekst.indexOf('relationship_id') < 0);
  assert.ok(tekst.indexOf('data_quality') < 0);
});

t('elk inzicht in de payload bevat alleen toegestane velden', function () {
  var p = CC.intelligenceAiPayload(CC.buildIntelligenceContext({ relaties: [rel()] }));
  Object.keys(p.inzichten[0]).forEach(function (k) {
    assert.ok(CC.INTEL_INZICHT_FIELDS.indexOf(k) >= 0, 'inzichtveld lekt: ' + k);
  });
});

t('de disclaimer gaat altijd mee naar de AI', function () {
  var p = CC.intelligenceAiPayload(CC.buildIntelligenceContext({ relaties: [rel()] }));
  assert.ok(p.inzichten[0].disclaimer.indexOf('geen oorzaak') >= 0);
});

t('de onderbouwing gaat mee zodat de coach kan zeggen waarop iets berust', function () {
  var p = CC.intelligenceAiPayload(CC.buildIntelligenceContext({ relaties: [rel()] }));
  assert.ok(p.inzichten[0].onderbouwing.indexOf('42') >= 0);
  assert.strictEqual(p.inzichten[0].dagen, 42);
});

/* ── 6. Taal en grenzen ───────────────────────────────────────────────────── */
t('geen enkele geproduceerde tekst claimt een oorzaak', function () {
  var c = CC.buildIntelligenceContext({ relaties: [rel(), rel({ relationship_id: 'x', effect_direction: 'lower',
    zin: 'Op dagen waarop je langer sliep, lag je rusthartslag gemiddeld lager.' })] });
  var tekst = JSON.stringify(c).toLowerCase();
  CC.INTEL_VERBODEN_WOORDEN.forEach(function (w) {
    assert.ok(tekst.indexOf(w) < 0, 'verboden formulering in de context: ' + w);
  });
});

t('de regels verbieden expliciet advies uit een verband', function () {
  var r = CC.intelligenceRegels().toLowerCase();
  assert.ok(r.indexOf('geen trainingsadvies af') >= 0 || r.indexOf('leid uit een verband geen trainingsadvies') >= 0,
    'de regel over advies uit verbanden ontbreekt: ' + r);
  assert.ok(r.indexOf('decision engine') >= 0, 'de regels wijzen advies niet toe aan de Decision Engine');
});

t('de regels verbieden zelf rekenen en zelf verbanden zoeken', function () {
  var r = CC.intelligenceRegels().toLowerCase();
  assert.ok(r.indexOf('niet opnieuw') >= 0);
  assert.ok(r.indexOf('geen nieuwe verbanden') >= 0);
});

t('de regels verbieden gaten opvullen', function () {
  var r = CC.intelligenceRegels().toLowerCase();
  assert.ok(r.indexOf('vul niets in') >= 0 && r.indexOf('schat niets') >= 0);
});

t('de regels benoemen dat een verband geen oorzaak is', function () {
  assert.ok(CC.intelligenceRegels().toLowerCase().indexOf('nooit een oorzaak') >= 0);
});

/* ── 7. Puurheid ──────────────────────────────────────────────────────────── */
t('de intelligence-laag rekent niets en is deterministisch', function () {
  var bron = fs.readFileSync(path.join(__dirname, 'coaching.js'), 'utf8');
  /* Eerst commentaar verwijderen uit het HELE bestand, daarna pas het blok afsnijden:
     de toelichting boven deze laag noemt Date.now juist om uit te leggen dat hij er
     niet in staat. Zou je andersom werken, dan test je de toelichting in plaats van
     de code. */
  var schoon = bron.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  var code = schoon.slice(schoon.indexOf('function intelRelevance'),
                          schoon.indexOf('var CoachingCore = {'));
  assert.ok(code.length > 800, 'het intelligence-blok is niet gevonden');
  ['Date.now', 'Math.random', 'document.', 'fetch(', 'spearman', 'Math.sqrt']
    .forEach(function (v) {
      assert.ok(code.indexOf(v) < 0, v + ' hoort niet in de coach-intelligencelaag');
    });
});

t('dezelfde invoer levert exact dezelfde context', function () {
  var invoer = { relaties: [rel(), rel({ relationship_id: 'b', status: 'MODERATE_PATTERN' })],
                 belasting: { week: 1000, eenheid: 'kg' }, herstel: { score: 70, band: 'hoog' } };
  assert.strictEqual(JSON.stringify(CC.buildIntelligenceContext(invoer)),
                     JSON.stringify(CC.buildIntelligenceContext(invoer)));
});

t('de invoer wordt niet gemuteerd', function () {
  var invoer = { relaties: [rel()], belasting: { week: 1000, eenheid: 'kg' } };
  var voor = JSON.stringify(invoer);
  CC.buildIntelligenceContext(invoer);
  assert.strictEqual(JSON.stringify(invoer), voor);
});

t('rommelige invoer levert geen crash', function () {
  [null, undefined, 0, 'x', [], { relaties: 'x' }, { relaties: [null, {}] }].forEach(function (v) {
    var c = CC.buildIntelligenceContext(v);
    assert.strictEqual(c.versie, 'coach_intelligence.v1');
    assert.ok(Array.isArray(c.inzichten));
  });
});

/* ── 8. Aansluiting op de echte keten ─────────────────────────────────────── */
t('de context accepteert echte relationship.v1-records ongewijzigd', function () {
  function reeks(n2, fn) {
    var uit = [], d0 = Date.UTC(2026, 0, 1);
    for (var i = 0; i < n2; i++) uit.push({ date: new Date(d0 + i * 86400000).toISOString().slice(0, 10), value: fn(i) });
    return uit;
  }
  var CalcCore = require('../core/calculation.js');
  var DeviceCore = require('../core/deviceIntegration.js');
  var DecisionCore = require('../core/decision.js');
  var uit = RC.discover({
    hrv: reeks(60, function (i) { return 35 + (i % 20); }),
    sleep: reeks(60, function (i) { return 5.5 + (i % 20) * 0.15; })
  }, { spearman: CalcCore.spearman, pairQuality: DeviceCore.pairQuality,
       releaseVerband: DecisionCore.releaseVerband, verbandIsCirculair: DecisionCore.verbandIsCirculair });
  var c = CC.buildIntelligenceContext({ relaties: uit.relaties });
  assert.strictEqual(c.inzichten.length, 1);
  assert.strictEqual(c.inzichten[0].zin, uit.relaties[0].zin);
  assert.strictEqual(c.beschikbaar, true);
});

t('de context accepteert echte belastingcijfers uit AthleteCore', function () {
  var CalcCore = require('../core/calculation.js');
  var ss = [];
  for (var i = 0; i < 30; i++) {
    ss.push({ date: new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10),
              exercise_id: 'a', sets: 3, reps: 10, weight: 60 + i, rpe: 8 });
  }
  var model = AC.dailyModel(ss, { calculateVolume: CalcCore.calculateVolume });
  var belastingReeks = AC.serie(model, 'strength', 'belasting');
  var c = CC.buildIntelligenceContext({ belasting: {
    week: AC.rollingSum(belastingReeks, 7).pop().value, eenheid: 'kg',
    monotonie: AC.monotony(belastingReeks, 7), acwr: AC.acuteChronic(belastingReeks, 7, 28) } });
  assert.ok(c.belasting.week > 0);
  assert.ok(typeof c.belasting.monotonie === 'number');
  assert.strictEqual(c.beschikbaar, true);
});

/* ── 9. Integratie in de app ──────────────────────────────────────────────── */
var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function pak(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'functie niet gevonden: ' + naam);
  return m[0];
}

t('de coach-context gebruikt de intelligence-laag', function () {
  var blok = HTML.slice(HTML.indexOf('async function tkCoachDataBlok'), HTML.indexOf('async function buildCtx'));
  assert.ok(blok.indexOf('CoachingCore.buildIntelligenceContext') > 0, 'de prioriteringslaag wordt niet gebruikt');
  assert.ok(blok.indexOf('tkRelDiscover') > 0, 'de coach draait niet op de discovery-engine');
});

t('de coach en het scherm delen één berekeningspad', function () {
  assert.ok(HTML.indexOf('function tkVerbandBereken') < 0,
    'het oude tweede pad bestaat nog — coach en scherm kunnen dan uiteenlopen');
  assert.ok(HTML.indexOf('function tkVerbandData') < 0, 'oude data-fetcher niet opgeruimd');
});

t('de instructie aan de AI komt uit CoachingCore, niet uit de UI', function () {
  var blok = HTML.slice(HTML.indexOf('async function tkCoachDataBlok'), HTML.indexOf('async function buildCtx'));
  assert.ok(blok.indexOf('CoachingCore.intelligenceRegels') > 0, 'de regels staan los in de UI');
});

t('de coach-context rekent zelf nog steeds niets', function () {
  var blok = HTML.slice(HTML.indexOf('async function tkCoachDataBlok'), HTML.indexOf('async function buildCtx'));
  ['spearman(', 'recoveryScore(', 'calculateDayFactor', 'Math.sqrt'].forEach(function (v) {
    assert.ok(blok.indexOf(v) < 0, 'rekenwerk in de coach-context: ' + v);
  });
});

t('belasting en prestatie komen uit AthleteCore', function () {
  var b = pak('tkCoachBelasting');
  assert.ok(b.indexOf('AC.dailyModel') > 0 && b.indexOf('AC.monotony') > 0 && b.indexOf('AC.acuteChronic') > 0);
  var p = pak('tkCoachPrestatie');
  assert.ok(p.indexOf('AC.performanceIndex') > 0);
});

t('de belastinghelper laadt via de bestaande timeout-bescherming', function () {
  var b = pak('tkCoachBelasting');
  assert.ok(b.indexOf('await tkRelData()') > 0, 'eigen query in plaats van het gedeelde laadpad');
  assert.ok(b.indexOf('sbGet(') < 0, 'directe query zonder timeout');
});

t('de live coach uit Sprint 13 is niet aangeraakt', function () {
  ['tkLiveCoachUpdate', 'tkLiveCoachHtml', 'tkLiveCoachVraagAi'].forEach(function (fn) {
    assert.ok(HTML.indexOf('function ' + fn) > 0, 'live coach beschadigd: ' + fn);
  });
});

console.log('fCoachIntel.test.js — ' + n + ' asserts geslaagd');
