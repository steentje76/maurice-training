/* fRelationship.test.js — Sprint 19: Relationship Discovery Engine (relationship.v1)
 *
 * Wat hier bewaakt wordt is niet alleen "rekent het goed", maar vooral: blijft deze
 * engine binnen zijn rol? Hij mag inventariseren, kandidaten vormen, keuren, classificeren
 * en rangschikken. Hij mag NIET correleren, NIET keuren op reeksniveau en NIET formuleren —
 * dat doen CalcCore, DeviceCore en DecisionCore. De architectuurtests onderaan dwingen dat af.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var RC = require('../core/relationship.js');
var CalcCore = require('../core/calculation.js');
var DeviceCore = require('../core/deviceIntegration.js');
var DecisionCore = require('../core/decision.js');

var n = 0;
function t(naam, fn) { fn(); n++; }

var DEPS = {
  spearman: CalcCore.spearman,
  pairQuality: DeviceCore.pairQuality,
  releaseVerband: DecisionCore.releaseVerband,
  verbandIsCirculair: DecisionCore.verbandIsCirculair
};

/* Hulpje: dagreeks bouwen zonder Date-afhankelijkheid (vaste startdatum). */
function reeks(aantal, fn, startDag) {
  var uit = [], d0 = new Date(Date.UTC(2026, 0, 1));
  for (var i = 0; i < aantal; i++) {
    var d = new Date(d0.getTime() + (i + (startDag || 0)) * 86400000);
    uit.push({ date: d.toISOString().slice(0, 10), value: fn(i) });
  }
  return uit;
}

/* ── 1. Contract en register ──────────────────────────────────────────────── */
t('contractversie is relationship.v1', function () {
  assert.strictEqual(RC.RELATIONSHIP_VERSIE, 'relationship.v1');
  assert.strictEqual(RC.VERSIONS.relationship, 'relationship.v1');
});

t('registersleutels zijn uniek', function () {
  var gezien = {};
  RC.VARIABLE_REGISTRY.forEach(function (v) {
    assert.ok(!gezien[v.key], 'dubbele sleutel: ' + v.key);
    gezien[v.key] = true;
  });
});

t('elke variabele heeft een geldig domein', function () {
  var geldig = RC.DOMEINEN.map(function (d) { return d.key; });
  RC.VARIABLE_REGISTRY.forEach(function (v) {
    assert.ok(geldig.indexOf(v.domein) >= 0, v.key + ' heeft onbekend domein ' + v.domein);
  });
});

t('elke variabele noemt haar ruwe invoer', function () {
  RC.VARIABLE_REGISTRY.forEach(function (v) {
    assert.ok(Array.isArray(v.inputs) && v.inputs.length > 0, v.key + ' mist inputs');
  });
});

t('elke variabele heeft label, zinNaam, conditie en noemer', function () {
  RC.VARIABLE_REGISTRY.forEach(function (v) {
    assert.ok(v.label && v.zinNaam && v.conditie && v.noemer, v.key + ' mist taalvelden');
  });
});

t('beschikbaarheid is nu of toekomstig', function () {
  RC.VARIABLE_REGISTRY.forEach(function (v) {
    assert.ok(v.beschikbaarheid === 'nu' || v.beschikbaarheid === 'toekomstig', v.key);
  });
});

t('variableByKey vindt en mist correct', function () {
  assert.strictEqual(RC.variableByKey('hrv').label, 'HRV');
  assert.strictEqual(RC.variableByKey('bestaat_niet'), null);
});

t('de vier UI-domeinen bestaan met label', function () {
  var keys = RC.DOMEINEN.map(function (d) { return d.key; });
  ['recovery', 'training', 'performance', 'environment'].forEach(function (k) {
    assert.ok(keys.indexOf(k) >= 0, 'domein ontbreekt: ' + k);
  });
  assert.strictEqual(RC.domeinLabel('recovery'), 'Herstel');
  assert.strictEqual(RC.domeinLabel('onbekend'), null);
});

/* ── 2. Drempels ──────────────────────────────────────────────────────────── */
t('minimum voor een patroon is gelijk aan de bestaande verbanddrempel', function () {
  assert.strictEqual(RC.REL_MIN_PATROON, DecisionCore.VERBAND_MIN_N,
    'de discovery-engine mag de bestaande productdrempel niet verlagen');
});

t('sampleTier respecteert alle grenzen', function () {
  assert.strictEqual(RC.sampleTier(0).key, 'geen');
  assert.strictEqual(RC.sampleTier(9).key, 'geen');
  assert.strictEqual(RC.sampleTier(10).key, 'voorlopig');
  assert.strictEqual(RC.sampleTier(19).key, 'voorlopig');
  assert.strictEqual(RC.sampleTier(20).key, 'opkomend');
  assert.strictEqual(RC.sampleTier(29).key, 'opkomend');
  assert.strictEqual(RC.sampleTier(30).key, 'redelijk');
  assert.strictEqual(RC.sampleTier(49).key, 'redelijk');
  assert.strictEqual(RC.sampleTier(50).key, 'ruim');
  assert.strictEqual(RC.sampleTier(5000).key, 'ruim');
});

t('sampleTier is veilig bij onzin', function () {
  ['x', null, undefined, NaN, -4].forEach(function (v) {
    assert.strictEqual(RC.sampleTier(v).key, 'geen');
  });
});

/* ── 3. Spreiding ─────────────────────────────────────────────────────────── */
t('spreiding telt verschillende waarden, niet metingen', function () {
  var s = RC.spreiding([7, 7, 7, 7, 7, 7, 7, 7, 7, 7]);
  assert.strictEqual(s.n, 10);
  assert.strictEqual(s.distinct, 1);
  assert.strictEqual(s.voldoende, false);
  assert.strictEqual(s.reden, 'te_weinig_variatie');
});

t('spreiding keurt genoeg variatie goed', function () {
  var s = RC.spreiding([1, 2, 3, 4, 5]);
  assert.strictEqual(s.distinct, 5);
  assert.strictEqual(s.voldoende, true);
  assert.strictEqual(s.reden, 'ok');
});

t('spreiding negeert niet-numerieke waarden', function () {
  var s = RC.spreiding([1, 'a', null, undefined, NaN, Infinity, 2]);
  assert.strictEqual(s.n, 2);
  assert.strictEqual(s.distinct, 2);
});

/* ── 4. Datakwaliteit van een kandidaat ───────────────────────────────────── */
t('te veel uitgesloten dagen maakt de kandidaat onbruikbaar', function () {
  var q = RC.relationQuality({ comparableDays: 30, excludedDays: 30 },
                             RC.spreiding([1, 2, 3, 4, 5]), RC.spreiding([1, 2, 3, 4, 5]));
  assert.strictEqual(q.niveau, 'onvoldoende');
  assert.strictEqual(q.bruikbaar, false);
  assert.ok(q.redenen.indexOf('te_veel_uitgesloten') >= 0);
});

t('matige uitsluiting geeft beperkt, niet onbruikbaar', function () {
  var q = RC.relationQuality({ comparableDays: 30, excludedDays: 10 },
                             RC.spreiding([1, 2, 3, 4, 5]), RC.spreiding([1, 2, 3, 4, 5]));
  assert.strictEqual(q.niveau, 'beperkt');
  assert.strictEqual(q.bruikbaar, true);
});

t('schone data geeft goed', function () {
  var q = RC.relationQuality({ comparableDays: 40, excludedDays: 0 },
                             RC.spreiding([1, 2, 3, 4, 5]), RC.spreiding([1, 2, 3, 4, 5]));
  assert.strictEqual(q.niveau, 'goed');
  assert.strictEqual(q.uitgeslotenAandeel, 0);
});

t('te weinig variatie blokkeert ongeacht steekproefgrootte', function () {
  var q = RC.relationQuality({ comparableDays: 400, excludedDays: 0 },
                             RC.spreiding([7, 7, 7]), RC.spreiding([1, 2, 3, 4, 5]));
  assert.strictEqual(q.bruikbaar, false);
  assert.ok(q.redenen.indexOf('te_weinig_variatie_bron') >= 0);
});

/* ── 5. Classificatie ─────────────────────────────────────────────────────── */
t('classificatie kent precies vijf toestanden', function () {
  assert.deepStrictEqual(Object.keys(RC.CLASSIFICATIES).sort(),
    ['INSUFFICIENT_DATA', 'MODERATE_PATTERN', 'NO_PATTERN', 'POSSIBLE_PATTERN', 'STRONG_PATTERN']);
});

t('classificatie gebruikt nooit TRUE, FALSE of CAUSE', function () {
  Object.keys(RC.CLASSIFICATIES).forEach(function (k) {
    assert.ok(['TRUE', 'FALSE', 'CAUSE', 'CAUSAL'].indexOf(k) < 0, 'verboden classificatie: ' + k);
  });
});

t('onbruikbare kwaliteit levert altijd INSUFFICIENT_DATA', function () {
  var c = RC.classify({ vrijgegeven: true, strength: 'sterk' }, { bruikbaar: false });
  assert.strictEqual(c, 'INSUFFICIENT_DATA');
});

t('niet vrijgegeven levert INSUFFICIENT_DATA', function () {
  var c = RC.classify({ vrijgegeven: false, reason: 'te_weinig_data' }, { bruikbaar: true });
  assert.strictEqual(c, 'INSUFFICIENT_DATA');
});

t('sterktebanden vertalen een-op-een naar classificaties', function () {
  assert.strictEqual(RC.classify({ vrijgegeven: true, strength: 'verwaarloosbaar' }, { bruikbaar: true }), 'NO_PATTERN');
  assert.strictEqual(RC.classify({ vrijgegeven: true, strength: 'zwak' }, { bruikbaar: true }), 'POSSIBLE_PATTERN');
  assert.strictEqual(RC.classify({ vrijgegeven: true, strength: 'matig' }, { bruikbaar: true }), 'MODERATE_PATTERN');
  assert.strictEqual(RC.classify({ vrijgegeven: true, strength: 'sterk' }, { bruikbaar: true }), 'STRONG_PATTERN');
});

t('elke sterkteband uit DecisionCore heeft een classificatie', function () {
  DecisionCore.VERBAND_STERKTE.forEach(function (b) {
    var c = RC.classify({ vrijgegeven: true, strength: b.key }, { bruikbaar: true });
    assert.notStrictEqual(c, 'INSUFFICIENT_DATA',
      'band ' + b.key + ' valt door de mand — sterkteschalen lopen uiteen');
  });
});

/* ── 6. Betrouwbaarheid ───────────────────────────────────────────────────── */
t('betrouwbaarheid stijgt met de steekproef', function () {
  var goed = { niveau: 'goed', bruikbaar: true };
  assert.strictEqual(RC.confidence(5, goed), 'laag');
  assert.strictEqual(RC.confidence(15, goed), 'laag');
  assert.strictEqual(RC.confidence(25, goed), 'gemiddeld');
  assert.strictEqual(RC.confidence(35, goed), 'hoog');
  assert.strictEqual(RC.confidence(90, goed), 'hoog');
});

t('beperkte kwaliteit verlaagt de betrouwbaarheid een stap', function () {
  assert.strictEqual(RC.confidence(35, { niveau: 'beperkt', bruikbaar: true }), 'gemiddeld');
  assert.strictEqual(RC.confidence(25, { niveau: 'beperkt', bruikbaar: true }), 'laag');
});

t('onbruikbare kwaliteit geeft altijd laag', function () {
  assert.strictEqual(RC.confidence(500, { niveau: 'onvoldoende', bruikbaar: false }), 'laag');
});

t('betrouwbaarheid is altijd een van de drie niveaus', function () {
  [0, 1, 10, 20, 30, 50, 200].forEach(function (v) {
    ['goed', 'beperkt', 'onvoldoende'].forEach(function (niv) {
      var c = RC.confidence(v, { niveau: niv, bruikbaar: niv !== 'onvoldoende' });
      assert.ok(RC.CONFIDENCE_NIVEAUS.indexOf(c) >= 0, 'onbekend niveau: ' + c);
    });
  });
});

/* ── 7. Inventarisatie ────────────────────────────────────────────────────── */
t('inventarisatie van niets meldt niets aanwezig en verzint niets', function () {
  var inv = RC.inventory({});
  assert.strictEqual(inv.aanwezig.length, 0);
  assert.strictEqual(inv.variabelen.length, RC.VARIABLE_REGISTRY.length);
  inv.variabelen.forEach(function (v) {
    assert.strictEqual(v.aanwezig, false);
    assert.strictEqual(v.dagen, 0);
    assert.strictEqual(v.eerste, null);
    assert.strictEqual(v.laatste, null);
  });
});

t('inventarisatie telt dagen, niet metingen', function () {
  var inv = RC.inventory({ hrv: [
    { date: '2026-01-01', value: 40 }, { date: '2026-01-01', value: 42 }, { date: '2026-01-02', value: 44 }
  ] });
  var hrv = inv.variabelen.filter(function (v) { return v.key === 'hrv'; })[0];
  assert.strictEqual(hrv.metingen, 3);
  assert.strictEqual(hrv.dagen, 2);
  assert.strictEqual(hrv.eerste, '2026-01-01');
  assert.strictEqual(hrv.laatste, '2026-01-02');
});

t('inventarisatie negeert ongeldige waarden', function () {
  var inv = RC.inventory({ hrv: [
    { date: '2026-01-01', value: null }, { date: '2026-01-02', value: 'x' },
    { date: '2026-01-03', value: NaN }, { date: '2026-01-04', value: 40 }
  ] });
  var hrv = inv.variabelen.filter(function (v) { return v.key === 'hrv'; })[0];
  assert.strictEqual(hrv.dagen, 1);
  assert.strictEqual(hrv.aanwezig, true);
});

t('inventarisatie is bestand tegen onzin-invoer', function () {
  [null, undefined, 0, 'x', []].forEach(function (bron) {
    var inv = RC.inventory(bron);
    assert.strictEqual(inv.versie, 'relationship.v1');
    assert.strictEqual(inv.aanwezig.length, 0);
  });
});

/* ── 8. Kandidaatvorming ──────────────────────────────────────────────────── */
function invMet(keys) {
  var bron = {};
  keys.forEach(function (k) { bron[k] = reeks(5, function (i) { return i + 1; }); });
  return RC.inventory(bron);
}

t('zonder data zijn er geen kandidaten', function () {
  var k = RC.candidates(RC.inventory({}), DEPS);
  assert.strictEqual(k.kandidaten.length, 0);
});

t('elk paar komt precies een keer voor', function () {
  var k = RC.candidates(invMet(['hrv', 'rhr', 'sleep']), DEPS);
  var gezien = {};
  k.kandidaten.forEach(function (c) {
    var sleutel = [c.bron, c.doel].sort().join('|');
    assert.ok(!gezien[sleutel], 'paar dubbel: ' + sleutel);
    gezien[sleutel] = true;
  });
});

t('een variabele wordt nooit met zichzelf gepaard', function () {
  var k = RC.candidates(invMet(['hrv', 'rhr', 'sleep', 'volume', 'rpe']), DEPS);
  k.kandidaten.forEach(function (c) { assert.notStrictEqual(c.bron, c.doel); });
});

t('circulaire paren worden geweigerd, niet verborgen', function () {
  var k = RC.candidates(invMet(['hrv', 'dagfactor', 'sleep']), DEPS);
  var ids = k.kandidaten.map(function (c) { return c.id; });
  assert.ok(ids.indexOf('hrv__dagfactor') < 0, 'dagfactor komt uit HRV — mag geen kandidaat zijn');
  assert.ok(ids.indexOf('sleep__dagfactor') < 0, 'dagfactor komt uit slaap — mag geen kandidaat zijn');
  assert.ok(k.overgeslagen.length > 0, 'weigering moet zichtbaar zijn');
  k.overgeslagen.forEach(function (o) { assert.strictEqual(o.reden, 'circulair'); });
});

/* Gevonden tijdens de eindanalyse van Sprint 23 op echte data: weekbelasting kwam als
 * "sterk patroon" tegenover volume, sets en belasting naar boven — met r tussen 0,62
 * en 0,71 en hoge betrouwbaarheid. Dat was geen bevinding maar een rekenfout in het
 * register: de weekbelasting IS de som van die dagwaarden, dus je vergelijkt een som
 * met een van zijn eigen termen. Zulke uitkomsten zijn juist gevaarlijk omdat ze er
 * overtuigender uitzien dan echte bevindingen, en twee ervan haalden de coach.
 * Deze tests bewaken de hele klasse, niet alleen het ene geval. */
t('een rollende som wordt nooit tegen zijn eigen termen gezet', function () {
  var bronnen = {};
  ['volume', 'sets', 'load', 'rpe', 'weekbelasting'].forEach(function (k) {
    bronnen[k] = reeks(40, function (i) { return 100 + i; });
  });
  var k = RC.candidates(RC.inventory(bronnen), DEPS);
  var ids = k.kandidaten.map(function (c) { return c.id; });
  ['volume', 'sets', 'load', 'rpe'].forEach(function (term) {
    assert.ok(ids.indexOf(term + '__weekbelasting') < 0 && ids.indexOf('weekbelasting__' + term) < 0,
      'weekbelasting tegen zijn eigen term ' + term);
  });
});

t('het venster van zeven dagen bevat gisteren, dus ook dat paar valt af', function () {
  var bronnen = {
    weekbelasting: reeks(40, function (i) { return 1000 + i * 10; }),
    load_vorige_dag: reeks(40, function (i) { return 100 + i; })
  };
  var k = RC.candidates(RC.inventory(bronnen), DEPS);
  assert.strictEqual(k.kandidaten.length, 0, 'weekbelasting tegen belasting-van-gisteren');
});

t('weekbelasting tegen een herstelmeting blijft wel een geldige kandidaat', function () {
  var bronnen = {
    weekbelasting: reeks(40, function (i) { return 1000 + i * 10; }),
    hrv: reeks(40, function (i) { return 40 + (i % 15); })
  };
  var k = RC.candidates(RC.inventory(bronnen), DEPS);
  assert.strictEqual(k.kandidaten.length, 1, 'te streng: herstel en belasting delen geen invoer');
  assert.strictEqual(k.kandidaten[0].crossDomein, true);
});

t('elke afgeleide grootheid deelt invoer met de grootheid waaruit hij volgt', function () {
  /* Generieke vangnet: een afgeleide grootheid die met NIEMAND invoer deelt, is
     verdacht — dan is zijn inputs-lijst waarschijnlijk verzonnen in plaats van
     afgeleid, en glipt hij overal langs de circulariteitstoets. */
  var afgeleid = RC.VARIABLE_REGISTRY.filter(function (v) {
    return v.afgeleid && v.beschikbaarheid === 'nu';
  });
  afgeleid.forEach(function (v) {
    var deelt = RC.VARIABLE_REGISTRY.some(function (w) {
      return w.key !== v.key && w.inputs.some(function (i) { return v.inputs.indexOf(i) >= 0; });
    });
    assert.ok(deelt, v.key + ' is afgeleid maar deelt met niemand ruwe invoer');
  });
});

t('de bestaande drie verbanden blijven kandidaat', function () {
  var k = RC.candidates(invMet(['hrv', 'rhr', 'sleep']), DEPS);
  var ids = k.kandidaten.map(function (c) { return c.id; });
  ['sleep__hrv', 'sleep__rhr', 'hrv__rhr'].forEach(function (id) {
    var omgekeerd = id.split('__').reverse().join('__');
    assert.ok(ids.indexOf(id) >= 0 || ids.indexOf(omgekeerd) >= 0, 'bestaand verband verdwenen: ' + id);
  });
});

t('cross-domein wordt gemarkeerd', function () {
  var k = RC.candidates(invMet(['hrv', 'volume']), DEPS);
  assert.strictEqual(k.kandidaten.length, 1);
  assert.strictEqual(k.kandidaten[0].crossDomein, true);
});

t('kandidaten binnen een domein zijn niet cross-domein', function () {
  var k = RC.candidates(invMet(['hrv', 'rhr']), DEPS);
  assert.strictEqual(k.kandidaten[0].crossDomein, false);
});

t('elke kandidaat draagt een volledige definitie voor DecisionCore', function () {
  var k = RC.candidates(invMet(['hrv', 'sleep', 'volume', 'rpe']), DEPS);
  assert.ok(k.kandidaten.length > 0);
  k.kandidaten.forEach(function (c) {
    var d = c.definition;
    assert.ok(d.a && d.a.veld && d.a.conditie && d.a.inputs.length, 'a onvolledig: ' + c.id);
    assert.ok(d.b && d.b.veld && d.b.noemer && d.b.inputs.length, 'b onvolledig: ' + c.id);
    assert.strictEqual(d.minimumN, RC.REL_MIN_PATROON);
  });
});

/* ── 9. Volledige keten ───────────────────────────────────────────────────── */
t('discover meldt ontbrekende engines in plaats van iets te verzinnen', function () {
  var r = RC.discover({ hrv: reeks(40, function (i) { return 40 + (i % 7); }) }, {});
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'engines_ontbreken');
  assert.deepStrictEqual(r.relaties, []);
  assert.ok(r.ontbreekt.indexOf('spearman') >= 0);
  assert.ok(r.ontbreekt.indexOf('pairQuality') >= 0);
  assert.ok(r.ontbreekt.indexOf('releaseVerband') >= 0);
});

t('discover zonder data levert een lege maar geldige uitkomst', function () {
  var r = RC.discover({}, DEPS);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.relaties.length, 0);
  assert.strictEqual(r.overzicht.zichtbaar.length, 0);
});

t('te weinig data levert INSUFFICIENT_DATA met een teller, geen conclusie', function () {
  var r = RC.discover({
    hrv:   reeks(12, function (i) { return 40 + (i % 9); }),
    sleep: reeks(12, function (i) { return 6 + (i % 5) * 0.5; })
  }, DEPS);
  assert.strictEqual(r.ok, true);
  var rel = r.relaties[0];
  assert.strictEqual(rel.status, 'INSUFFICIENT_DATA');
  assert.strictEqual(rel.is_patroon, false);
  assert.strictEqual(rel.sample_count, 12);
  assert.strictEqual(rel.nog_nodig, RC.REL_MIN_PATROON - 12);
  assert.strictEqual(rel.effect_direction, 'none');
  assert.strictEqual(rel.strength, null);
});

t('genoeg data met een sterk verband levert STRONG_PATTERN', function () {
  var r = RC.discover({
    hrv:   reeks(60, function (i) { return 35 + (i % 20); }),
    sleep: reeks(60, function (i) { return 5.5 + (i % 20) * 0.15; })
  }, DEPS);
  var rel = r.relaties[0];
  assert.strictEqual(rel.status, 'STRONG_PATTERN');
  assert.strictEqual(rel.is_patroon, true);
  assert.strictEqual(rel.effect_direction, 'higher');
  assert.ok(rel.effect > 0.5, 'coefficient te laag: ' + rel.effect);
  assert.strictEqual(rel.confidence, 'hoog');
  assert.ok(rel.zin && rel.zin.length > 0, 'zin ontbreekt');
});

t('genoeg data zonder patroon is NO_PATTERN, niet INSUFFICIENT_DATA', function () {
  /* Een symmetrisch V-patroon: de ene reeks loopt strak op, de andere daalt en stijgt
     er spiegelbeeldig omheen. Ruim boven de drempel, schone data, volop variatie —
     en per constructie geen rangcorrelatie. Precies het geval dat NIET als
     "onvoldoende data" mag worden gepresenteerd: we weten het wel, er is alleen
     geen patroon. */
  var N = 40;
  var r = RC.discover({
    hrv:   reeks(N, function (i) { return 30 + i * 0.5; }),
    sleep: reeks(N, function (i) { return 5 + Math.abs(i - (N - 1) / 2) * 0.1; })
  }, DEPS);
  var rel = r.relaties[0];
  assert.strictEqual(rel.sample_count, N);
  assert.strictEqual(rel.effect, 0);
  assert.strictEqual(rel.status, 'NO_PATTERN');
  assert.strictEqual(rel.is_patroon, false);
  assert.notStrictEqual(rel.status, 'INSUFFICIENT_DATA',
    'genoeg data mag nooit als onvoldoende data worden gepresenteerd');
  assert.strictEqual(rel.effect_direction, 'none');
  assert.ok(rel.zin && rel.zin.indexOf('geen duidelijke samenhang') >= 0, 'zin: ' + rel.zin);
});

t('een stilstaande reeks wordt geweigerd ondanks veel data', function () {
  var r = RC.discover({
    hrv:   reeks(60, function (i) { return 40 + (i % 15); }),
    sleep: reeks(60, function () { return 7.5; })
  }, DEPS);
  var rel = r.relaties[0];
  assert.strictEqual(rel.status, 'INSUFFICIENT_DATA');
  assert.strictEqual(rel.data_quality.bruikbaar, false);
  assert.ok(rel.data_quality.redenen.join(',').indexOf('variatie') >= 0);
});

t('het relationship-record bevat alle contractvelden', function () {
  var r = RC.discover({
    hrv:   reeks(40, function (i) { return 35 + (i % 15); }),
    sleep: reeks(40, function (i) { return 6 + (i % 10) * 0.2; })
  }, DEPS, { periode: '180d', vensterDagen: 180, at: '2026-08-18T00:00:00.000Z' });
  var rel = r.relaties[0];
  ['relationship_id', 'source_variable', 'target_variable', 'period', 'sample_count',
   'effect', 'effect_direction', 'strength', 'confidence', 'data_quality', 'status',
   'minimum_sample_required', 'actual_sample_count', 'calculation_version', 'created_at'
  ].forEach(function (veld) {
    assert.ok(Object.prototype.hasOwnProperty.call(rel, veld), 'veld ontbreekt: ' + veld);
  });
  assert.strictEqual(rel.period, '180d');
  assert.strictEqual(rel.period_days, 180);
  assert.strictEqual(rel.created_at, '2026-08-18T00:00:00.000Z');
  assert.strictEqual(rel.calculation_version, 'spearman');
  assert.strictEqual(rel.decision_version, 'verband.v1');
});

t('zonder ingespoten tijdstempel blijft created_at null', function () {
  var r = RC.discover({
    hrv: reeks(40, function (i) { return 35 + (i % 15); }),
    rhr: reeks(40, function (i) { return 70 - (i % 15); })
  }, DEPS);
  assert.strictEqual(r.relaties[0].created_at, null);
});

/* ── 10. Rangschikking en spamrem ─────────────────────────────────────────── */
function nepRel(id, status, conf, n2, cross) {
  return { relationship_id: id, status: status, confidence: conf, sample_count: n2,
           crossDomein: !!cross, is_patroon: status !== 'INSUFFICIENT_DATA' && status !== 'NO_PATTERN' };
}

t('sterkere patronen staan bovenaan', function () {
  var out = RC.rank([
    nepRel('a', 'POSSIBLE_PATTERN', 'hoog', 50),
    nepRel('b', 'STRONG_PATTERN', 'laag', 30),
    nepRel('c', 'NO_PATTERN', 'hoog', 90)
  ]);
  assert.deepStrictEqual(out.zichtbaar.map(function (r) { return r.relationship_id; }), ['b', 'a', 'c']);
});

t('bij gelijke sterkte wint betrouwbaarheid', function () {
  var out = RC.rank([
    nepRel('laag', 'MODERATE_PATTERN', 'laag', 40),
    nepRel('hoog', 'MODERATE_PATTERN', 'hoog', 40)
  ]);
  assert.strictEqual(out.zichtbaar[0].relationship_id, 'hoog');
});

t('de volgorde is stabiel bij volledig gelijke relaties', function () {
  var a = RC.rank([nepRel('zebra', 'NO_PATTERN', 'laag', 20), nepRel('appel', 'NO_PATTERN', 'laag', 20)]);
  var b = RC.rank([nepRel('appel', 'NO_PATTERN', 'laag', 20), nepRel('zebra', 'NO_PATTERN', 'laag', 20)]);
  assert.deepStrictEqual(a.zichtbaar.map(function (r) { return r.relationship_id; }),
                         b.zichtbaar.map(function (r) { return r.relationship_id; }));
});

t('kandidaten onder de ondergrens worden niet getoond', function () {
  var out = RC.rank([nepRel('bijna', 'INSUFFICIENT_DATA', 'laag', 9),
                     nepRel('genoeg', 'INSUFFICIENT_DATA', 'laag', 10)]);
  assert.deepStrictEqual(out.zichtbaar.map(function (r) { return r.relationship_id; }), ['genoeg']);
});

t('het overzicht wordt afgekapt en meldt hoeveel er verborgen zijn', function () {
  var veel = [];
  for (var i = 0; i < 30; i++) veel.push(nepRel('r' + i, 'MODERATE_PATTERN', 'hoog', 40));
  var out = RC.rank(veel, { max: 5 });
  assert.strictEqual(out.zichtbaar.length, 5);
  assert.strictEqual(out.verborgen, 25);
});

t('rank telt patronen en onvoldoende-datagevallen apart', function () {
  var out = RC.rank([nepRel('a', 'STRONG_PATTERN', 'hoog', 40),
                     nepRel('b', 'INSUFFICIENT_DATA', 'laag', 12),
                     nepRel('c', 'NO_PATTERN', 'hoog', 40)]);
  assert.strictEqual(out.patronen, 1);
  assert.strictEqual(out.onvoldoende, 1);
});

/* ── 11. Taal: geen causaliteit, geen populatieclaims ─────────────────────── */
t('geen enkele geproduceerde tekst bevat een oorzaakwoord', function () {
  var r = RC.discover({
    hrv:   reeks(60, function (i) { return 35 + (i % 20); }),
    sleep: reeks(60, function (i) { return 5.5 + (i % 20) * 0.15; }),
    rhr:   reeks(60, function (i) { return 70 - (i % 20); })
  }, DEPS);
  r.relaties.forEach(function (rel) {
    var tekst = [rel.zin, rel.onderbouwing, rel.disclaimer, rel.sterkte_uitleg, rel.kwaliteit_zin]
      .filter(Boolean).join(' ').toLowerCase();
    RC.RELATIE_VERBODEN_WOORDEN.forEach(function (w) {
      assert.ok(tekst.indexOf(w) < 0, 'oorzaakwoord "' + w + '" in: ' + tekst);
    });
  });
});

t('geen enkele geproduceerde tekst bevat een populatieclaim', function () {
  var r = RC.discover({
    hrv:   reeks(60, function (i) { return 35 + (i % 20); }),
    sleep: reeks(60, function (i) { return 5.5 + (i % 20) * 0.15; })
  }, DEPS);
  r.relaties.forEach(function (rel) {
    var tekst = [rel.zin, rel.onderbouwing, rel.sterkte_uitleg].filter(Boolean).join(' ').toLowerCase();
    RC.RELATIE_POPULATIE_WOORDEN.forEach(function (w) {
      assert.ok(tekst.indexOf(w) < 0, 'populatieclaim "' + w + '" in: ' + tekst);
    });
  });
});

t('een vrijgegeven relatie draagt altijd de samenhang-disclaimer', function () {
  var r = RC.discover({
    hrv:   reeks(60, function (i) { return 35 + (i % 20); }),
    sleep: reeks(60, function (i) { return 5.5 + (i % 20) * 0.15; })
  }, DEPS);
  var rel = r.relaties[0];
  assert.ok(rel.disclaimer && rel.disclaimer.indexOf('geen oorzaak') >= 0, 'disclaimer: ' + rel.disclaimer);
});

/* ── 12. Architectuurgrenzen ──────────────────────────────────────────────── */
var BRON_RUW = fs.readFileSync(path.join(__dirname, 'relationship.js'), 'utf8');
/* Commentaar eruit: deze tests gaan over wat de engine DOET, niet over wat de
 * toelichting erover zegt. Zonder deze stap zou juist de regel die uitlegt dat
 * Date.now bewust ontbreekt, de test op Date.now laten falen. */
var BRON = BRON_RUW.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

t('de engine is deterministisch: geen Date.now, geen Math.random', function () {
  assert.ok(BRON.indexOf('Date.now') < 0, 'Date.now in relationship.js');
  assert.ok(BRON.indexOf('Math.random') < 0, 'Math.random in relationship.js');
  assert.ok(BRON.indexOf('new Date(') < 0, 'new Date in relationship.js');
});

t('de engine raakt geen DOM en geen netwerk aan', function () {
  ['document.', 'window.addEventListener', 'fetch(', 'XMLHttpRequest', 'localStorage']
    .forEach(function (verboden) {
      assert.ok(BRON.indexOf(verboden) < 0, verboden + ' hoort niet in een engine');
    });
});

t('de engine implementeert zelf geen correlatie', function () {
  ['function spearman', 'function _ranks', 'function pearson', 'Math.sqrt(da', 'rangcorrelatie berekenen']
    .forEach(function (verboden) {
      assert.ok(BRON.indexOf(verboden) < 0, 'tweede correlatie-implementatie: ' + verboden);
    });
});

t('de engine kent geen eigen sterktegrenzen', function () {
  /* De Cohen-grenzen 0.10 / 0.30 / 0.50 horen uitsluitend in DecisionCore thuis. */
  ['0.10', '0.30', '0.50'].forEach(function (grens) {
    var regels = BRON.split('\n').filter(function (r) {
      return r.indexOf(grens) >= 0 && r.indexOf('grens') >= 0;
    });
    assert.strictEqual(regels.length, 0, 'sterktegrens ' + grens + ' gedupliceerd in relationship.js');
  });
});

t('dezelfde invoer levert exact dezelfde uitvoer', function () {
  var bron = {
    hrv:   reeks(45, function (i) { return 35 + (i % 17); }),
    sleep: reeks(45, function (i) { return 6 + (i % 11) * 0.2; }),
    rhr:   reeks(45, function (i) { return 68 - (i % 13); })
  };
  var a = JSON.stringify(RC.discover(bron, DEPS, { at: 'vast' }));
  var b = JSON.stringify(RC.discover(bron, DEPS, { at: 'vast' }));
  assert.strictEqual(a, b, 'engine is niet deterministisch');
});

t('de engine muteert de aangeleverde reeksen niet', function () {
  var bron = { hrv: reeks(40, function (i) { return 35 + (i % 15); }),
               sleep: reeks(40, function (i) { return 6 + (i % 9) * 0.2; }) };
  var voor = JSON.stringify(bron);
  RC.discover(bron, DEPS);
  assert.strictEqual(JSON.stringify(bron), voor, 'invoer is gemuteerd');
});

t('registerregels zijn losse objecten, geen gedeelde referenties', function () {
  var a = RC.variableRegistry(), b = RC.variableRegistry();
  a.push({ key: 'test' });
  assert.strictEqual(b.length, RC.VARIABLE_REGISTRY.length, 'register lekt via variableRegistry()');
});

console.log('fRelationship.test.js — ' + n + ' asserts geslaagd');
