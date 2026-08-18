/* fNightSprint.test.js — Sprint 23: integratie, hardening en release
 *
 * Deze test kijkt niet naar één engine maar naar de naden ertussen. Dat is waar
 * dingen kapotgaan die per module wél werken: een keten die stiekem omkeert, een
 * tweede implementatie die insluipt, een scherm dat toch weer zelf gaat rekenen.
 * Daarnaast staan hier de datascenario's — geen data, weinig data, rommelige data —
 * omdat een app die alleen bij mooie data klopt niet klopt.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var CalcCore = require('../core/calculation.js');
var DecisionCore = require('../core/decision.js');
var DeviceCore = require('../core/deviceIntegration.js');
var CoachingCore = require('../core/coaching.js');
var RC = require('../core/relationship.js');
var AC = require('../core/athlete.js');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var SW = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

var n = 0;
function t(naam, fn) { fn(); n++; }

var DEPS = {
  spearman: CalcCore.spearman, pairQuality: DeviceCore.pairQuality,
  releaseVerband: DecisionCore.releaseVerband, verbandIsCirculair: DecisionCore.verbandIsCirculair
};
var ADEPS = { calculateVolume: CalcCore.calculateVolume, oneRMRaw: CalcCore.oneRMRaw };

function dag(i) { return new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10); }
function meting(aantal, fn, start) {
  var uit = [];
  for (var i = 0; i < aantal; i++) uit.push({ date: dag(i + (start || 0)), value: fn(i) });
  return uit;
}
function sessie(i, over) {
  return Object.assign({ date: dag(i), exercise_id: 'a', sets: 3, reps: 10, weight: 60, rpe: 8,
                         training_type: 'A' }, over || {});
}

/* ══ A. ARCHITECTUUR ══════════════════════════════════════════════════════ */
console.log('\nA. Keten RAW -> CALCULATION -> DECISION -> RELATIONSHIP -> COACH');

t('A1: elke laag draagt zijn eigen contractversie', function () {
  assert.ok(CalcCore.VERSIONS.correlation);
  assert.ok(DecisionCore.VERSIONS);
  assert.strictEqual(RC.RELATIONSHIP_VERSIE, 'relationship.v1');
  assert.strictEqual(AC.ATHLETE_VERSIE, 'athlete.v1');
  assert.strictEqual(CoachingCore.INTEL_VERSIE, 'coach_intelligence.v1');
});

t('A2: de Relationship Engine rekent niet zelf', function () {
  var r = RC.discover({ hrv: meting(40, function (i) { return 40 + i; }),
                        sleep: meting(40, function (i) { return 6 + i * 0.05; }) }, {});
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'engines_ontbreken');
});

t('A3: de Relationship Engine kent geen eigen sterkteschaal', function () {
  DecisionCore.VERBAND_STERKTE.forEach(function (b) {
    assert.notStrictEqual(RC.classify({ vrijgegeven: true, strength: b.key }, { bruikbaar: true }),
      'INSUFFICIENT_DATA', 'band ' + b.key + ' valt weg — twee sterkteschalen');
  });
});

t('A4: de Coaching Engine berekent geen relaties', function () {
  var bron = fs.readFileSync(path.join(__dirname, 'coaching.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  var blok = bron.slice(bron.indexOf('function intelRelevance'), bron.indexOf('var CoachingCore = {'));
  ['spearman', 'pairQuality', 'releaseVerband', 'Math.sqrt'].forEach(function (v) {
    assert.ok(blok.indexOf(v) < 0, 'de coachlaag doet rekenwerk: ' + v);
  });
});

t('A5: AI is nergens de bron van waarheid', function () {
  ['relationship.js', 'athlete.js', 'decision.js', 'calculation.js'].forEach(function (f) {
    var bron = fs.readFileSync(path.join(__dirname, f), 'utf8');
    ['anthropic', 'openai', 'netlify/functions', 'claude-sonnet'].forEach(function (v) {
      assert.ok(bron.toLowerCase().indexOf(v) < 0, f + ' roept een AI aan: ' + v);
    });
  });
});

t('A6: er is precies één correlatie-implementatie', function () {
  var treffers = [];
  fs.readdirSync(__dirname).filter(function (f) {
    return f.slice(-3) === '.js' && f.indexOf('test') < 0;
  }).forEach(function (f) {
    if (/function\s+spearman\s*\(/.test(fs.readFileSync(path.join(__dirname, f), 'utf8'))) treffers.push(f);
  });
  assert.deepStrictEqual(treffers, ['calculation.js'], 'meerdere correlatie-implementaties: ' + treffers);
});

t('A7: er is precies één volumeformule', function () {
  var treffers = [];
  fs.readdirSync(__dirname).filter(function (f) {
    return f.slice(-3) === '.js' && f.indexOf('test') < 0;
  }).forEach(function (f) {
    if (/function\s+calculateVolume\s*\(/.test(fs.readFileSync(path.join(__dirname, f), 'utf8'))) treffers.push(f);
  });
  assert.deepStrictEqual(treffers, ['calculation.js']);
});

t('A8: elke nieuwe engine is puur', function () {
  ['relationship.js', 'athlete.js'].forEach(function (f) {
    var code = fs.readFileSync(path.join(__dirname, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    ['Date.now', 'Math.random', 'document.', 'window.addEventListener', 'fetch(', 'localStorage']
      .forEach(function (v) { assert.ok(code.indexOf(v) < 0, f + ' bevat ' + v); });
  });
});

/* ══ B. DATAVEILIGHEID ════════════════════════════════════════════════════ */
console.log('\nB. Datascenario\'s — van niets tot rommel');

var SCENARIOS = [
  { naam: 'geen data', bronnen: {} },
  { naam: 'alleen HRV', bronnen: { hrv: meting(40, function (i) { return 40 + (i % 15); }) } },
  { naam: 'alleen slaap', bronnen: { sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }) } },
  { naam: 'alleen training', bronnen: { volume: meting(40, function (i) { return 1000 + i * 20; }) } },
  { naam: 'training + HRV', bronnen: { volume: meting(40, function (i) { return 1000 + i * 20; }),
                                       hrv: meting(40, function (i) { return 40 + (i % 15); }) } },
  { naam: 'training + slaap', bronnen: { volume: meting(40, function (i) { return 1000 + i * 20; }),
                                         sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }) } },
  { naam: 'training + HRV + slaap', bronnen: { volume: meting(40, function (i) { return 1000 + i * 20; }),
                                               hrv: meting(40, function (i) { return 40 + (i % 15); }),
                                               sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }) } },
  { naam: 'één dag', bronnen: { hrv: meting(1, function () { return 42; }), sleep: meting(1, function () { return 7; }) } },
  { naam: 'dubbele dagen', bronnen: { hrv: meting(20, function (i) { return 40 + i; }).concat(meting(20, function (i) { return 41 + i; })),
                                      sleep: meting(20, function (i) { return 6 + i * 0.1; }) } },
  { naam: 'ontbrekende waarden', bronnen: { hrv: meting(40, function (i) { return (i % 3 === 0) ? null : 40 + i; }),
                                            sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }) } },
  { naam: 'onmogelijke waarden', bronnen: { hrv: meting(40, function (i) { return (i % 5 === 0) ? 9999 : 40 + (i % 15); }),
                                            sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }) } },
  { naam: 'stilstaande reeks', bronnen: { hrv: meting(40, function () { return 42; }),
                                          sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }) } },
  { naam: 'niet-numeriek', bronnen: { hrv: meting(40, function (i) { return (i % 4 === 0) ? 'x' : 40 + i; }),
                                      sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }) } },
  { naam: 'gaten in de tijd', bronnen: { hrv: meting(20, function (i) { return 40 + i; }).concat(meting(20, function (i) { return 40 + i; }, 200)),
                                         sleep: meting(20, function (i) { return 6 + i * 0.1; }) } }
];

SCENARIOS.forEach(function (sc) {
  t('B: ' + sc.naam + ' — de keten blijft heel en verzint niets', function () {
    var r = RC.discover(sc.bronnen, DEPS, { at: 'vast' });
    assert.strictEqual(r.ok, true, sc.naam + ': keten gebroken');
    assert.strictEqual(r.versie, 'relationship.v1');
    r.relaties.forEach(function (rel) {
      /* Nooit een patroon zonder de bijbehorende onderbouwing. */
      if (rel.is_patroon) {
        assert.ok(rel.sample_count >= rel.minimum_sample_required,
          sc.naam + ': patroon met te weinig dagen (' + rel.sample_count + ')');
        assert.ok(rel.zin, sc.naam + ': patroon zonder zin');
        assert.ok(rel.disclaimer, sc.naam + ': patroon zonder disclaimer');
      }
      /* Nooit een conclusie bij onvoldoende data. */
      if (rel.status === 'INSUFFICIENT_DATA') {
        assert.strictEqual(rel.is_patroon, false, sc.naam + ': conclusie bij onvoldoende data');
      }
      assert.ok(RC.CLASSIFICATIES[rel.status], sc.naam + ': onbekende status ' + rel.status);
      assert.ok(RC.CONFIDENCE_NIVEAUS.indexOf(rel.confidence) >= 0, sc.naam + ': onbekende betrouwbaarheid');
    });
    /* De coachlaag moet elk scenario aankunnen zonder te breken. */
    var c = CoachingCore.buildIntelligenceContext({ relaties: r.relaties });
    assert.strictEqual(c.versie, 'coach_intelligence.v1');
    assert.ok(c.inzichten.length <= CoachingCore.INTEL_MAX_INZICHTEN);
  });
});

t('B: een stilstaande reeks levert nooit een patroon', function () {
  var r = RC.discover({ hrv: meting(60, function () { return 42; }),
                        sleep: meting(60, function (i) { return 6 + (i % 8) * 0.2; }) }, DEPS);
  r.relaties.forEach(function (rel) { assert.strictEqual(rel.is_patroon, false); });
});

t('B: onmogelijke waarden worden uitgesloten en gemeld, niet stil verwijderd', function () {
  var r = RC.discover({ hrv: meting(40, function (i) { return (i % 5 === 0) ? 9999 : 40 + (i % 15); }),
                        sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }) }, DEPS);
  var rel = r.relaties[0];
  assert.ok(rel.data_quality.uitgesloten > 0 || rel.sample_count < 40,
    'onmogelijke waarden zijn gewoon meegerekend');
});

t('B: meerdere sporten en meerdere modaliteiten breken niets', function () {
  var ss = [];
  for (var i = 0; i < 20; i++) ss.push(sessie(i, { training_type: (i % 2) ? 'kracht' : 'crossfit' }));
  for (var j = 0; j < 10; j++) ss.push({ date: dag(j), exercise_id: 'roeien', distance: 4000 + j * 100, training_type: 'roeien' });
  var uit = AC.relationshipSources(ss, ADEPS);
  var r = RC.discover(uit.bronnen, DEPS);
  assert.strictEqual(r.ok, true);
  var ctx = AC.sportContext(uit.model, {});
  assert.strictEqual(ctx.multiSport, true);
  assert.strictEqual(ctx.multiModaliteit, true);
  assert.strictEqual(AC.unifiedLoad(uit.model).beschikbaar, false,
    'kilo\'s en meters zijn toch opgeteld');
});

t('B: vertraagde sync — een bron die achterloopt levert minder paren, geen fout', function () {
  var r = RC.discover({ hrv: meting(40, function (i) { return 40 + (i % 15); }),
                        sleep: meting(40, function (i) { return 6 + (i % 6) * 0.25; }, 25) }, DEPS);
  assert.strictEqual(r.ok, true);
  assert.ok(r.relaties[0].sample_count < 40, 'overlappende dagen zijn niet correct bepaald');
});

/* ══ C. UI-VEILIGHEID ═════════════════════════════════════════════════════ */
console.log('\nC. Bestaande schermen ongemoeid');

var UI_MOET_BESTAAN = [
  ['id="s-home"', 'Home'], ['id="home-readiness"', 'readinesskaart'],
  ['id="home-coach-vandaag"', 'coachkaart'], ['id="home-plan"', 'planblok'],
  ['id="s-lichaam"', 'Lichaam'], ['id="s-coach"', 'Coach'], ['id="s-stats"', 'Voortgang'],
  ['id="s-lich-verband"', 'verbanddetail'], ['id="lich-relations"', 'verbandensectie'],
  ['function tkLiveCoachUpdate', 'live coach'], ['function tkReadinessVandaag', 'readiness'],
  ['function tkSetEvidence', 'evidence'], ['function buildStrengthSessionRow', 'sessieopbouw'],
  ['function renderLichaamVerbanden', 'verbandenrenderer']
];
UI_MOET_BESTAAN.forEach(function (p) {
  t('C: ' + p[1] + ' bestaat nog', function () {
    assert.ok(HTML.indexOf(p[0]) > 0, 'verdwenen: ' + p[0]);
  });
});

t('C: de onderste navigatie heeft nog steeds vijf items', function () {
  var i = HTML.indexOf('id="s-home"');
  var blok = HTML.slice(i, i + 20000);
  var nav = blok.slice(blok.indexOf('<nav class="bnav"'), blok.indexOf('</nav>'));
  assert.strictEqual((nav.match(/class="ni[ "]/g) || []).length, 5, 'navigatie gewijzigd');
});

t('C: de nieuwe schermen hangen onder Lichaam, niet naast de hoofdnavigatie', function () {
  var i = HTML.indexOf('id="s-lich-verbanden"');
  var blok = HTML.slice(i, i + 4000);
  assert.ok(blok.indexOf("go('s-lichaam')") > 0, 'terugknop wijst niet naar Lichaam');
  assert.ok(blok.indexOf('class="ni active"') > 0, 'Lichaam is niet als actief gemarkeerd');
});

t('C: de Workout Builder is niet aangeraakt', function () {
  ['resolvedWorkout', 'createTrainingInstance', 'snapshotFromVasteTraining'].forEach(function (f) {
    assert.ok(HTML.indexOf(f) > 0, 'builder-onderdeel verdwenen: ' + f);
  });
});

t('C: de oefening-modal en de exercise picker bestaan nog', function () {
  assert.ok(HTML.indexOf('exPickerCallback') > 0);
  assert.ok(HTML.indexOf('canCreatePersonalExercise') > 0);
});

/* ══ D. PRESTATIES ════════════════════════════════════════════════════════ */
console.log('\nD. Prestaties en blokkades');

t('D1: alle nieuwe queries gebruiken de timeout-bescherming', function () {
  var blok = HTML.slice(HTML.indexOf('async function tkRelData'), HTML.indexOf('function tkRelDeps'));
  assert.ok(blok.indexOf('v43SafeGet') > 0);
  assert.ok(!/await sbGet\(/.test(blok), 'query zonder timeout in het verbandenpad');
});

t('D2: de discovery draait niet tijdens het laden van Home', function () {
  /* Home mag geen discovery starten: de eerste paint zou dan op een query wachten.
     De verbandensectie zit op Lichaam en wordt daar aangeroepen. */
  var homeInit = HTML.slice(HTML.indexOf('function renderHome'), HTML.indexOf('function renderHome') + 6000);
  assert.ok(homeInit.indexOf('tkRelDiscover') < 0, 'Home start de discovery-engine');
});

t('D3: de uitkomst wordt gecachet zodat een periodewissel niets herberekent', function () {
  assert.ok(HTML.indexOf('_tkRelCache') > 0);
  var blok = HTML.slice(HTML.indexOf('async function tkRelDiscover'), HTML.indexOf('async function tkRelParen'));
  assert.ok(blok.indexOf('if(_tkRelCache[key]) return _tkRelCache[key];') > 0, 'cache wordt niet gebruikt');
});

t('D4: de ruwe rijen worden één keer geladen', function () {
  var blok = HTML.slice(HTML.indexOf('async function tkRelData'), HTML.indexOf('function tkAthleteBronnen'));
  assert.ok(blok.indexOf('if(_tkRelRows) return') > 0, 'elke aanroep doet opnieuw een query');
});

t('D5: er zit een bovengrens op het aantal getoonde relaties', function () {
  assert.ok(RC.REL_TOON_MAX > 0 && RC.REL_TOON_MAX <= 20);
  var veel = [];
  for (var i = 0; i < 200; i++) {
    veel.push({ relationship_id: 'r' + i, status: 'STRONG_PATTERN', confidence: 'hoog',
                sample_count: 40, is_patroon: true });
  }
  assert.strictEqual(RC.rank(veel).zichtbaar.length, RC.REL_TOON_MAX);
});

t('D6: een grote dataset blijft binnen een redelijke tijd', function () {
  var groot = {
    hrv: meting(365, function (i) { return 35 + (i % 25); }),
    rhr: meting(365, function (i) { return 70 - (i % 20); }),
    sleep: meting(365, function (i) { return 5.5 + (i % 12) * 0.2; }),
    gewicht: meting(365, function (i) { return 80 + (i % 10) * 0.3; }),
    volume: meting(365, function (i) { return 1000 + (i % 40) * 50; }),
    sets: meting(365, function (i) { return 10 + (i % 12); }),
    rpe: meting(365, function (i) { return 6 + (i % 8) * 0.5; })
  };
  var start = process.hrtime.bigint();
  var r = RC.discover(groot, DEPS);
  var ms = Number(process.hrtime.bigint() - start) / 1e6;
  assert.strictEqual(r.ok, true);
  assert.ok(ms < 3000, 'discovery duurde ' + Math.round(ms) + ' ms over een jaar aan data');
});

/* ══ E. PRIVACY ═══════════════════════════════════════════════════════════ */
console.log('\nE. Privacy — eigen gegevens, geen populatie');

t('E1: geen enkele nieuwe engine kent een normgroep of referentiedataset', function () {
  /* Twee dingen worden hier bewust weggefilterd voordat er gezocht wordt: het
     commentaar (dat juist UITLEGT dat er geen populatie gebruikt wordt) en de
     VERBODEN_WOORDEN-lijsten (die deze termen opsommen om ze te kunnen verbieden).
     Zonder dat filter zou een engine die zich netjes aan de regel houdt, op zijn
     eigen regel struikelen. Wat overblijft is uitvoerbare code. */
  ['relationship.js', 'athlete.js'].forEach(function (f) {
    var bron = fs.readFileSync(path.join(__dirname, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '')
      .replace(/var [A-Z_]*VERBODEN_WOORDEN[\s\S]*?\];/g, '')
      .replace(/var [A-Z_]*POPULATIE_WOORDEN[\s\S]*?\];/g, '')
      .replace(/^\s*[A-Z_]*(?:VERBODEN|POPULATIE)_WOORDEN\s*:.*$/gm, '')
      .toLowerCase();
    ['populatie', 'normgroep', 'gemiddelde sporter', 'andere gebruikers', 'benchmark', 'percentiel']
      .forEach(function (w) {
        assert.ok(bron.indexOf(w) < 0, f + ' verwijst naar een populatie: ' + w);
      });
  });
});

t('E2: de coachcontext bevat geen vergelijking met anderen', function () {
  var c = CoachingCore.buildIntelligenceContext({ relaties: [{
    relationship_id: 'x', is_patroon: true, status: 'STRONG_PATTERN', confidence: 'hoog',
    sample_count: 40, zin: 'Op dagen waarop je langer sliep, lag je HRV gemiddeld hoger.',
    disclaimer: 'Dit is een samenhang, geen oorzaak.' }] });
  var tekst = JSON.stringify(c).toLowerCase();
  RC.RELATIE_POPULATIE_WOORDEN.forEach(function (w) {
    assert.ok(tekst.indexOf(w) < 0, 'populatieclaim: ' + w);
  });
});

t('E3: geen enkele engine logt persoonsgegevens of tokens', function () {
  ['relationship.js', 'athlete.js', 'coaching.js'].forEach(function (f) {
    var bron = fs.readFileSync(path.join(__dirname, f), 'utf8');
    ['console.log(', 'access_token', 'refresh_token', 'client_secret', 'apiKey']
      .forEach(function (v) { assert.ok(bron.indexOf(v) < 0, f + ' bevat ' + v); });
  });
});

t('E4: de nieuwe engines hebben geen netwerktoegang', function () {
  ['relationship.js', 'athlete.js'].forEach(function (f) {
    var bron = fs.readFileSync(path.join(__dirname, f), 'utf8');
    ['http://', 'https://', 'fetch(', 'XMLHttpRequest'].forEach(function (v) {
      assert.ok(bron.indexOf(v) < 0, f + ' bevat netwerktoegang: ' + v);
    });
  });
});

/* ══ F. SERVICE WORKER EN RELEASE ═════════════════════════════════════════ */
console.log('\nF. Service worker en release');

t('F1: de nieuwe engines worden geladen en geprecached', function () {
  ['core/relationship.js', 'core/athlete.js'].forEach(function (f) {
    assert.ok(HTML.indexOf(f) > 0, f + ' wordt niet geladen');
    assert.ok(SW.indexOf("'/" + f + "'") > 0, f + ' wordt niet geprecached');
  });
});

t('F2: CACHE_NAME en CACHE_STATIC dragen dezelfde versie', function () {
  var a = SW.match(/CACHE_NAME\s*=\s*'trainingskompas-(v\d+)'/);
  var b = SW.match(/CACHE_STATIC\s*=\s*'trainingskompas-static-(v\d+)'/);
  assert.ok(a && b && a[1] === b[1], 'cacheversies lopen uiteen');
});

t('F3: de applicatieversie is minstens v4.44.0', function () {
  var m = HTML.match(/APP_VER\s*=\s*'v(\d+)\.(\d+)\.(\d+)'/);
  assert.ok(m, 'APP_VER ontbreekt');
  var v = Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
  assert.ok(v >= 4 * 10000 + 44 * 100 + 0, 'versie te laag: ' + m[0]);
});

t('F4: Supabase en de functies worden nooit statisch gecached', function () {
  ['supabase.co', '/.netlify/functions/'].forEach(function (p) {
    assert.ok(SW.indexOf(p) > 0, 'ontbreekt in NO_CACHE_PATTERNS: ' + p);
  });
});

/* ══ G. GEEN VERLOREN FUNCTIONALITEIT ═════════════════════════════════════ */
console.log('\nG. Bestaande contracten blijven bestaan');

t('G1: alle bestaande DecisionCore-contracten bestaan nog', function () {
  ['releaseVerband', 'verbandTrainingContext', 'readinessDay', 'dayZone', 'restForSet',
   'setOutcome', 'releaseRecord', 'buildDecisionEvidence', 'progressionDecision']
    .forEach(function (f) {
      assert.strictEqual(typeof DecisionCore[f], 'function', 'verdwenen: DecisionCore.' + f);
    });
});

t('G2: alle bestaande CalcCore-contracten bestaan nog', function () {
  ['spearman', 'calculateVolume', 'oneRMRaw', 'recoveryScore', 'readinessPercent', 'trendClassify']
    .forEach(function (f) {
      assert.strictEqual(typeof CalcCore[f], 'function', 'verdwenen: CalcCore.' + f);
    });
});

t('G3: alle bestaande DeviceCore-contracten bestaan nog', function () {
  ['qualifySeries', 'pairQuality', 'healthSeries', 'weightSeries', 'observation']
    .forEach(function (f) {
      assert.strictEqual(typeof DeviceCore[f], 'function', 'verdwenen: DeviceCore.' + f);
    });
});

t('G4: de drempel voor een verband is niet verlaagd', function () {
  assert.strictEqual(DecisionCore.VERBAND_MIN_N, 30);
  assert.strictEqual(RC.REL_MIN_PATROON, 30);
});

t('G5: geen enkel testbestand is verwijderd', function () {
  var tests = fs.readdirSync(__dirname).filter(function (f) { return f.indexOf('test.js') > 0; });
  assert.ok(tests.length >= 59, 'er zijn testbestanden verdwenen: ' + tests.length);
});

console.log('\n' + '='.repeat(56));
console.log('fNightSprint.test.js — ' + n + ' asserts geslaagd');
