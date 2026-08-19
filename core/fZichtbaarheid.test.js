/* fZichtbaarheid.test.js — Sprint 26: Relationship Visibility & Evidence
 *
 * Deze sprint bouwt geen intelligentie. Hij zorgt dat wat de engines al weten de sporter
 * ook bereikt. De tests hieronder bewaken precies dat: dat er niets stil verdwijnt, dat
 * een status niet iets anders gaat betekenen dan de engine bedoelde, en dat de vier
 * aangesloten variabelen echte, bestaande functies gebruiken in plaats van een tweede
 * berekening. Plus een harde regressiegrens rond Home, Training en Fitbit.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var RC = require('../core/relationship.js');
var AC = require('../core/athlete.js');
var CalcCore = require('../core/calculation.js');
var CardioCore = require('../core/cardio.js');
var DeviceCore = require('../core/deviceIntegration.js');
var DecisionCore = require('../core/decision.js');
var CoachingCore = require('../core/coaching.js');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var n = 0;
function t(naam, fn) { fn(); n++; }

var DEPS = { spearman: CalcCore.spearman, pairQuality: DeviceCore.pairQuality,
             releaseVerband: DecisionCore.releaseVerband, verbandIsCirculair: DecisionCore.verbandIsCirculair };
var ADEPS = { calculateVolume: CalcCore.calculateVolume, oneRMRaw: CalcCore.oneRMRaw,
              parseTime: CardioCore.parseTime, splitFromDistTime: CardioCore.splitFromDistTime };

function dag(i) { return new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString().slice(0, 10); }
function meting(k, fn, start) { var u = []; for (var i = 0; i < k; i++) u.push({ date: dag(i + (start || 0)), value: fn(i) }); return u; }
function pak(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'functie niet gevonden in index.html: ' + naam);
  return m[0];
}
function zandbak(namen, extra) {
  var ctx = Object.assign({
    RelationshipCore: RC, CalcCore: CalcCore, DeviceCore: DeviceCore, DecisionCore: DecisionCore,
    AthleteCore: AC, CardioCore: CardioCore, console: console,
    escHtml: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(namen.map(pak).join('\n'), ctx);
  return ctx;
}

/* ══ A. BESTAANDE RELATIONSHIP-IDs BLIJVEN BESTAAN ═══════════════════════ */
console.log('\nA. Bestaande relationship-IDs');

t('A1: alle 20 registersleutels bestaan nog', function () {
  var verwacht = ['hrv', 'rhr', 'sleep', 'dagfactor', 'readiness', 'gewicht', 'volume', 'rpe',
    'sets', 'load', 'load_vorige_dag', 'weekbelasting', 'duur', 'rust', 'e1rm', 'topgewicht',
    'cardio_split', 'temperatuur', 'luchtvochtigheid', 'wind'];
  var aanwezig = RC.VARIABLE_REGISTRY.map(function (v) { return v.key; });
  verwacht.forEach(function (k) { assert.ok(aanwezig.indexOf(k) >= 0, 'registersleutel verdwenen: ' + k); });
  assert.strictEqual(aanwezig.length, verwacht.length, 'registeromvang gewijzigd');
});

t('A2: de drie oorspronkelijke verbanden blijven vormbaar', function () {
  var bronnen = { hrv: meting(40, function (i) { return 40 + (i % 15); }),
                  rhr: meting(40, function (i) { return 60 - (i % 10); }),
                  sleep: meting(40, function (i) { return 6 + (i % 8) * 0.2; }) };
  var ids = RC.candidates(RC.inventory(bronnen), DEPS).kandidaten.map(function (c) { return c.id; });
  ['sleep__hrv', 'hrv__sleep', 'sleep__rhr', 'rhr__sleep', 'hrv__rhr', 'rhr__hrv'].forEach(function () {});
  assert.ok(ids.indexOf('hrv__rhr') >= 0 || ids.indexOf('rhr__hrv') >= 0, 'HRV/RHR verdwenen');
  assert.ok(ids.indexOf('hrv__sleep') >= 0 || ids.indexOf('sleep__hrv') >= 0, 'HRV/slaap verdwenen');
  assert.ok(ids.indexOf('rhr__sleep') >= 0 || ids.indexOf('sleep__rhr') >= 0, 'RHR/slaap verdwenen');
});

t('A3: de drempels zijn niet verschoven', function () {
  assert.strictEqual(RC.REL_MIN_PATROON, 30);
  assert.strictEqual(RC.REL_MIN_KANDIDAAT, 10);
  assert.strictEqual(RC.REL_MIN_DISTINCT, 5);
  assert.strictEqual(RC.REL_MAX_UITSLUIT, 0.35);
  assert.strictEqual(RC.REL_TOON_MAX, 12);
  assert.strictEqual(DecisionCore.VERBAND_MIN_N, 30);
});

t('A4: de vijf classificaties zijn ongewijzigd', function () {
  assert.deepStrictEqual(Object.keys(RC.CLASSIFICATIES).sort(),
    ['INSUFFICIENT_DATA', 'MODERATE_PATTERN', 'NO_PATTERN', 'POSSIBLE_PATTERN', 'STRONG_PATTERN']);
});

/* ══ B. BESTAANDE UITKOMSTEN VERANDEREN NIET ═════════════════════════════ */
console.log('\nB. Bestaande uitkomsten ongewijzigd');

t('B1: een sterk verband levert exact dezelfde uitkomst als voorheen', function () {
  var r = RC.discover({ hrv: meting(60, function (i) { return 35 + (i % 20); }),
                        sleep: meting(60, function (i) { return 5.5 + (i % 20) * 0.15; }) }, DEPS);
  var rel = r.relaties[0];
  assert.strictEqual(rel.status, 'STRONG_PATTERN');
  assert.strictEqual(rel.effect_direction, 'higher');
  assert.ok(rel.effect > 0.5);
  assert.strictEqual(rel.confidence, 'hoog');
  assert.strictEqual(rel.minimum_sample_required, 30);
});

t('B2: geen patroon blijft geen patroon', function () {
  var N = 40;
  var r = RC.discover({ hrv: meting(N, function (i) { return 30 + i * 0.5; }),
                        sleep: meting(N, function (i) { return 5 + Math.abs(i - (N - 1) / 2) * 0.1; }) }, DEPS);
  assert.strictEqual(r.relaties[0].status, 'NO_PATTERN');
  assert.strictEqual(r.relaties[0].effect, 0);
});

t('B3: te weinig data blijft te weinig data', function () {
  var r = RC.discover({ hrv: meting(12, function (i) { return 40 + (i % 9); }),
                        sleep: meting(12, function (i) { return 6 + (i % 5) * 0.5; }) }, DEPS);
  assert.strictEqual(r.relaties[0].status, 'INSUFFICIENT_DATA');
  assert.strictEqual(r.relaties[0].nog_nodig, 18);
});

t('B4: circulaire paren blijven geweigerd', function () {
  var bronnen = {};
  ['volume', 'sets', 'load', 'rpe', 'weekbelasting'].forEach(function (k) {
    bronnen[k] = meting(40, function (i) { return 100 + i; });
  });
  var ids = RC.candidates(RC.inventory(bronnen), DEPS).kandidaten.map(function (c) { return c.id; });
  ['volume', 'sets', 'load', 'rpe'].forEach(function (term) {
    assert.ok(ids.indexOf(term + '__weekbelasting') < 0 && ids.indexOf('weekbelasting__' + term) < 0,
      'circulair paar toegestaan: ' + term);
  });
});

/* ══ C+D. EVIDENCE ══════════════════════════════════════════════════════ */
console.log('\nC/D. Evidence');

t('C1: beide schrijfpaden geven een tijdstempel mee', function () {
  /* Zonder `at` markeert buildDecisionEvidence het snapshot als ongeldig en verdwijnt het
     bewijsspoor stil. Het Guided-pad deed dat tot v4.45.1 — dit is de regressiegrens. */
  var regels = HTML.split('\n');
  var aanroepen = [];
  regels.forEach(function (r, i) {
    var kaal = r.replace(/^\s+/, '');
    var isCommentaar = kaal.indexOf('//') === 0 || kaal.indexOf('*') === 0 || kaal.indexOf('/*') === 0;
    if (!isCommentaar && r.indexOf('buildStrengthSessionRow(') >= 0
        && r.indexOf('function buildStrengthSessionRow') < 0) {
      aanroepen.push(regels.slice(i, i + 4).join('\n'));
    }
  });
  assert.ok(aanroepen.length >= 2, 'minder aanroepers dan verwacht: ' + aanroepen.length);
  aanroepen.forEach(function (blok, i) {
    assert.ok(/\bat:/.test(blok), 'aanroeper ' + (i + 1) + ' geeft geen `at` mee — evidence valt stil weg');
    assert.ok(/voorschrift:/.test(blok), 'aanroeper ' + (i + 1) + ' geeft geen `voorschrift` mee');
  });
});

t('C2: met tijdstempel en besluit ontstaat een geldig snapshot', function () {
  var ev = DecisionCore.buildDecisionEvidence({
    at: '2026-08-19T10:00:00.000Z',
    context: { trainingInstanceId: 'i1', exerciseId: 'ex1', setNummer: 1, date: '2026-08-19' },
    raw: { kg: 100, reps: 5, rpe: 8, voorgeschrevenKg: 100, voorgeschrevenReps: 5, voorgeschrevenRpe: 8 },
    calculated: { effKg: 100 },
    decision: DecisionCore.progressionDecision(8, 100)
  });
  assert.strictEqual(ev.geldig, true);
  assert.strictEqual(ev.versie, 'evidence_snapshot.v1');
  assert.deepStrictEqual(ev.missing, []);
});

t('D1: zonder tijdstempel blijft evidence expliciet ontbrekend', function () {
  var ev = DecisionCore.buildDecisionEvidence({
    context: { exerciseId: 'ex1' }, raw: { kg: 100, reps: 5, rpe: 8 },
    decision: DecisionCore.progressionDecision(8, 100)
  });
  assert.strictEqual(ev.geldig, false);
  assert.ok(ev.missing.indexOf('at') >= 0, 'het ontbrekende veld wordt niet benoemd');
});

t('D2: een ontbrekend veld wordt benoemd, niet geraden', function () {
  var ev = DecisionCore.buildDecisionEvidence({
    at: '2026-08-19T10:00:00.000Z', context: {}, raw: { kg: 100 },
    decision: DecisionCore.progressionDecision(8, 100)
  });
  assert.ok(ev.missing.length > 0, 'ontbrekende ruwe velden worden niet gemeld');
  ev.missing.forEach(function (m) { assert.strictEqual(typeof m, 'string'); });
});

t('D3: evidence reist mee in sets_detail en verandert de sessierij niet', function () {
  var ctx = zandbak(['tkSetEvidence', 'buildStrengthSessionRow']);
  var ws = [{ kg: '100', reps: '5', rpe: '8', effKg: 100 }];
  var zonder = ctx.buildStrengthSessionRow('ex1', ws, { date: '2026-08-19', training_type: 'A' });
  var met = ctx.buildStrengthSessionRow('ex1', ws, { date: '2026-08-19', training_type: 'A',
    at: '2026-08-19T10:00:00.000Z', voorschrift: { kg: 100, reps: 5, rpe: 8 } });
  assert.strictEqual(zonder.setsDetail[0].evidence, undefined, 'zonder `at` toch evidence');
  assert.ok(met.setsDetail[0].evidence, 'met `at` geen evidence');
  /* De sessierij zelf moet identiek blijven — evidence is additief in sets_detail. */
  var strip = function (r) { var c = Object.assign({}, r); delete c.sets_detail; return JSON.stringify(c); };
  assert.strictEqual(strip(zonder.row), strip(met.row), 'de sessierij is veranderd door evidence');
  assert.strictEqual(met.row.sets, zonder.row.sets);
  assert.strictEqual(met.row.weight, zonder.row.weight);
});

/* ══ E. DE VIER INPUTS ══════════════════════════════════════════════════ */
console.log('\nE. De vier aangesloten inputs');

t('E1: topgewicht is het maximum van de dag, geen gemiddelde', function () {
  var ss = [{ date: dag(0), exercise_id: 'a', sets: 3, reps: 10, weight: 60 },
            { date: dag(0), exercise_id: 'b', sets: 2, reps: 5, weight: 120 }];
  var m = AC.dailyModel(ss, ADEPS);
  assert.strictEqual(m.dagen[0].modaliteiten[0].topgewicht, 120);
});

t('E2: de split komt uit CardioCore, niet uit een eigen formule', function () {
  var ss = [{ date: dag(0), exercise_id: 'roeien', distance: 2000, time_str: '8:00.0' }];
  var m = AC.dailyModel(ss, ADEPS);
  var verwacht = CardioCore.splitFromDistTime(2000, CardioCore.parseTime('8:00.0'), AC.SPLIT_BASIS_M);
  assert.strictEqual(m.dagen[0].modaliteiten[0].split, Math.round(verwacht * 10) / 10);
});

t('E3: zonder CardioCore blijft de split null in plaats van geschat', function () {
  var ss = [{ date: dag(0), exercise_id: 'roeien', distance: 2000, time_str: '8:00.0' }];
  var m = AC.dailyModel(ss, { calculateVolume: CalcCore.calculateVolume });
  assert.strictEqual(m.dagen[0].modaliteiten[0].split, null);
});

t('E4: de beste split van de dag is de laagste', function () {
  var ss = [{ date: dag(0), exercise_id: 'roeien', distance: 2000, time_str: '8:00.0' },
            { date: dag(0), exercise_id: 'roeien', distance: 2000, time_str: '7:00.0' }];
  var m = AC.dailyModel(ss, ADEPS);
  assert.strictEqual(m.dagen[0].modaliteiten[0].split, 105, 'hoogste split gekozen i.p.v. beste');
});

t('E5: topgewicht wordt als bron aangeboden', function () {
  var ss = [];
  for (var i = 0; i < 12; i++) ss.push({ date: dag(i), exercise_id: 'a', sets: 3, reps: 10, weight: 60 + i, rpe: 8 });
  var uit = AC.relationshipSources(ss, ADEPS);
  assert.ok(uit.bronnen.topgewicht && uit.bronnen.topgewicht.length, 'topgewicht ontbreekt');
  Object.keys(uit.bronnen).forEach(function (k) {
    assert.ok(RC.variableByKey(k), 'onbekende bronsleutel: ' + k);
  });
});

t('E5b: cardio_split wordt BEWUST niet als bron aangeboden', function () {
  /* De split per sessie klopt, maar een dagreeks eroverheen zou machines mengen —
     58 s/500 m op een bike-erg naast 108 op een roeier. De app kent al een machine- en
     afstand-bewuste regel voor cardio-records; welke sleutel de reeks moet dragen is een
     productbeslissing. Tot die er is blijft de reeks afwezig in plaats van misleidend. */
  var ss = [{ date: dag(0), exercise_id: 'roeien', distance: 1000, time_str: '3:40' },
            { date: dag(0), exercise_id: 'bike_erg', distance: 5000, time_str: '9:47' }];
  var uit = AC.relationshipSources(ss, ADEPS);
  assert.strictEqual(uit.bronnen.cardio_split, undefined,
    'cardio_split wordt aangeleverd terwijl de machinesleutel nog niet is besloten');
  /* De berekening zelf blijft wel bestaan en klopt per sessie. */
  var m = AC.dailyModel(ss, ADEPS);
  assert.ok(typeof m.dagen[0].modaliteiten[0].split === 'number', 'de split is helemaal verdwenen');
});

t('E6: dagfactor en gereedheid gebruiken de BESTAANDE keten', function () {
  var bron = pak('tkDagfactorReeksen');
  assert.ok(bron.indexOf('hrvDagFactorPersonal(') > 0, 'gebruikt de persoonlijke HRV-baseline niet');
  assert.ok(bron.indexOf('dagfactor(') > 0, 'gebruikt de bestaande dagfactor niet');
  assert.ok(bron.indexOf('CC.readinessPercent(') > 0, 'gebruikt readiness_percent.v1 niet');
  ['0.85', '0.20', 'Math.min(', 'Math.max('].forEach(function (v) {
    assert.ok(bron.indexOf(v) < 0, 'eigen berekening in de UI: ' + v);
  });
});

t('E7: de dagfactorreeks gebruikt de baseline van die dag, niet die van vandaag', function () {
  var bron = pak('tkDagfactorReeksen');
  assert.ok(/hrvDagFactorPersonal\(hrvRows,\s*d\)/.test(bron),
    'refDate wordt niet meegeschoven — oude dagen worden met het huidige kennisniveau beoordeeld');
});

t('E8: drie van de vier variabelen zijn aangesloten, de vierde bewust niet', function () {
  var bronBlok = HTML.slice(HTML.indexOf('function tkRelBronnen('), HTML.indexOf('function tkRelDeps('));
  var athBron = fs.readFileSync(path.join(__dirname, 'athlete.js'), 'utf8');
  assert.ok(bronBlok.indexOf('bronnen.dagfactor') > 0, 'dagfactor niet aangesloten');
  assert.ok(bronBlok.indexOf('bronnen.readiness') > 0, 'readiness niet aangesloten');
  assert.ok(athBron.indexOf('uit.topgewicht') > 0, 'topgewicht niet aangesloten');
  /* cardio_split is bewust NIET aangesloten — zie E5b. De variabele blijft in het
     register staan zodat hij zichtbaar wacht op de machinesleutel-beslissing. */
  assert.ok(RC.variableByKey('cardio_split'), 'cardio_split uit het register verwijderd');
});

t('E9: dagfactor blijft circulair met HRV en slaap — dat hoort zo', function () {
  var bronnen = { dagfactor: meting(40, function (i) { return 0.9 + (i % 10) * 0.01; }),
                  hrv: meting(40, function (i) { return 40 + (i % 15); }),
                  sleep: meting(40, function (i) { return 6 + (i % 8) * 0.2; }) };
  var k = RC.candidates(RC.inventory(bronnen), DEPS);
  var ids = k.kandidaten.map(function (c) { return c.id; });
  assert.ok(ids.indexOf('hrv__dagfactor') < 0 && ids.indexOf('sleep__dagfactor') < 0,
    'dagfactor tegen zijn eigen invoer toegestaan');
});

t('E10: dagfactor tegen training is wel een geldige kandidaat', function () {
  var bronnen = { dagfactor: meting(40, function (i) { return 0.9 + (i % 10) * 0.01; }),
                  volume: meting(40, function (i) { return 1000 + i * 20; }) };
  var k = RC.candidates(RC.inventory(bronnen), DEPS);
  assert.strictEqual(k.kandidaten.length, 1, 'geldig cross-domein paar geweigerd');
  assert.strictEqual(k.kandidaten[0].crossDomein, true);
});

/* ══ F. NIETS WORDT STIL AFGEKAPT ═══════════════════════════════════════ */
console.log('\nF. Geen stille afkapping');

t('F1: rank levert de volledige lijst naast de afgekapte', function () {
  var veel = [];
  for (var i = 0; i < 40; i++) {
    veel.push({ relationship_id: 'r' + i, status: 'MODERATE_PATTERN', confidence: 'hoog',
                sample_count: 40, is_patroon: true });
  }
  var o = RC.rank(veel, { max: 12 });
  assert.strictEqual(o.zichtbaar.length, 12);
  assert.strictEqual(o.inAanmerking.length, 40, 'de volledige lijst ontbreekt');
  assert.strictEqual(o.verborgen, 28);
  assert.strictEqual(o.maximum, 12);
});

t('F2: zichtbaar is exact het eerste stuk van de volledige lijst', function () {
  var veel = [];
  for (var i = 0; i < 30; i++) {
    veel.push({ relationship_id: 'r' + i, status: i < 5 ? 'STRONG_PATTERN' : 'INSUFFICIENT_DATA',
                confidence: 'hoog', sample_count: 40 - i, is_patroon: i < 5 });
  }
  var o = RC.rank(veel, { max: 12 });
  assert.strictEqual(JSON.stringify(o.zichtbaar), JSON.stringify(o.inAanmerking.slice(0, 12)),
    'de afkapping volgt niet de rangschikking');
});

t('F3: de ondergrens blijft gelden voor beide lijsten', function () {
  var o = RC.rank([{ relationship_id: 'te_klein', status: 'INSUFFICIENT_DATA', confidence: 'laag', sample_count: 9 },
                   { relationship_id: 'genoeg', status: 'INSUFFICIENT_DATA', confidence: 'laag', sample_count: 10 }]);
  assert.deepStrictEqual(o.inAanmerking.map(function (r) { return r.relationship_id; }), ['genoeg']);
  assert.strictEqual(o.verborgen, 0);
});

t('F4: de UI meldt hoeveel er niet getoond worden', function () {
  var bron = pak('renderLichaamVerbandenOverzicht');
  assert.ok(bron.indexOf('inAanmerking') > 0, 'de UI leest de volledige lijst niet');
  assert.ok(bron.indexOf('weggelaten') > 0, 'de UI berekent niet hoeveel er wegvallen');
  assert.ok(/verband'\+\(weggelaten===1\?'':'en'\)/.test(bron) || bron.indexOf('Nog \'+weggelaten') > 0,
    'de weglating wordt niet aan de sporter gemeld');
});

t('F5: de sporter kan de rest alsnog opvragen', function () {
  assert.ok(HTML.indexOf('function tkRelToonAllesZet') > 0, 'geen uitklapmogelijkheid');
  var bron = pak('tkRelToonAllesZet');
  assert.ok(bron.indexOf('renderLichaamVerbandenOverzicht') > 0);
});

t('F6: de filters kijken naar de volledige lijst, niet naar de afgekapte', function () {
  var bron = pak('renderLichaamVerbandenOverzicht');
  assert.ok(/volledig\.forEach\(function \(r\)\{ aanwezig\[r\.domein\]=true; \}\)|volledig\.forEach/.test(bron),
    'een categorie kan verdwijnen doordat hij net buiten de afkapping valt');
});

/* ══ G. STATUSSEN BLIJVEN KLOPPEN ═══════════════════════════════════════ */
console.log('\nG. Gevonden / geen patroon / meer data nodig / te weinig variatie');

function relV(over) {
  return Object.assign({ relationship_id: 'x', bronLabel: 'HRV', doelLabel: 'Lichaamsgewicht',
    status: 'INSUFFICIENT_DATA', is_patroon: false, effect: null, effect_direction: 'none',
    sample_count: 35, nog_nodig: 0, minimum_sample_required: 30, confidence: 'laag',
    zin: null, disclaimer: 'Dit is een samenhang, geen oorzaak.', kwaliteit_zin: null,
    data_quality: { niveau: 'onvoldoende', uitgesloten: 0, redenen: ['te_weinig_variatie_doel'] } }, over || {});
}

t('G1: te weinig variatie heet geen "meer data nodig"', function () {
  var ctx = zandbak(['tkRelOnvoldoendeReden', 'tkRelStatusTekst']);
  assert.strictEqual(ctx.tkRelStatusTekst(relV()), 'Te weinig variatie');
});

t('G2: echt te weinig dagen heet nog steeds "meer data nodig"', function () {
  var ctx = zandbak(['tkRelOnvoldoendeReden', 'tkRelStatusTekst']);
  var r = relV({ sample_count: 12, nog_nodig: 18, data_quality: { niveau: 'goed', uitgesloten: 0, redenen: [] } });
  assert.strictEqual(ctx.tkRelStatusTekst(r), 'Meer data nodig');
});

t('G3: de kaart noemt bij variatie WELKE meting stilstaat', function () {
  var ctx = zandbak(['tkVerbandPijl', 'tkRelBadge', 'tkRelOnvoldoendeReden', 'tkRelOnvoldoendeZin',
                     'tkRelStatusTekst', 'tkRelConfTekst', 'tkRelKaartHtml']);
  var html = ctx.tkRelKaartHtml(relV());
  assert.ok(html.indexOf('Lichaamsgewicht verandert te weinig') > 0, 'de reden ontbreekt: ' + html);
  assert.ok(html.indexOf('genoeg dagen') > 0);
});

t('G4: bij variatie verdwijnt de zinloze teller "nog 0 te gaan"', function () {
  var ctx = zandbak(['tkVerbandPijl', 'tkRelBadge', 'tkRelOnvoldoendeReden', 'tkRelOnvoldoendeZin',
                     'tkRelStatusTekst', 'tkRelConfTekst', 'tkRelKaartHtml']);
  var html = ctx.tkRelKaartHtml(relV({ nog_nodig: 0 }));
  assert.ok(html.indexOf('te gaan') < 0, 'nog steeds een teller bij een variatieweigering');
  assert.ok(html.indexOf('35 vergelijkbare dagen') > 0, 'het aantal dagen hoort er wel te staan');
});

t('G5: bij een echt tekort blijft de teller staan', function () {
  var ctx = zandbak(['tkVerbandPijl', 'tkRelBadge', 'tkRelOnvoldoendeReden', 'tkRelOnvoldoendeZin',
                     'tkRelStatusTekst', 'tkRelConfTekst', 'tkRelKaartHtml']);
  var html = ctx.tkRelKaartHtml(relV({ sample_count: 12, nog_nodig: 18,
    data_quality: { niveau: 'goed', uitgesloten: 0, redenen: [] } }));
  assert.ok(html.indexOf('nog 18 te gaan') > 0);
});

t('G6: te veel uitgesloten dagen krijgt zijn eigen uitleg', function () {
  var ctx = zandbak(['tkRelOnvoldoendeReden', 'tkRelOnvoldoendeZin']);
  var r = relV({ data_quality: { niveau: 'onvoldoende', uitgesloten: 20, redenen: ['te_veel_uitgesloten'] } });
  assert.strictEqual(ctx.tkRelOnvoldoendeReden(r), 'kwaliteit');
  assert.ok(ctx.tkRelOnvoldoendeZin(r).indexOf('datakwaliteitscontrole') > 0);
});

t('G7: gevonden patroon en geen patroon zijn ongewijzigd', function () {
  var ctx = zandbak(['tkRelOnvoldoendeReden', 'tkRelStatusTekst']);
  assert.strictEqual(ctx.tkRelStatusTekst({ status: 'STRONG_PATTERN' }), 'Sterk patroon');
  assert.strictEqual(ctx.tkRelStatusTekst({ status: 'MODERATE_PATTERN' }), 'Duidelijk patroon');
  assert.strictEqual(ctx.tkRelStatusTekst({ status: 'POSSIBLE_PATTERN' }), 'Mogelijk patroon');
  assert.strictEqual(ctx.tkRelStatusTekst({ status: 'NO_PATTERN' }), 'Geen patroon');
});

t('G8: het onderscheid komt uit de engine, niet uit een eigen drempel', function () {
  var bron = pak('tkRelOnvoldoendeReden');
  assert.ok(bron.indexOf('data_quality') > 0 && bron.indexOf('redenen') > 0,
    'de reden wordt niet uit het engine-record gelezen');
  /* De `>= 0` van een indexOf is geen drempel; die filteren we eruit voordat we op
     getalsvergelijkingen zoeken. Wat NIET mag: zelf tellen of zelf een grens leggen. */
  var zonderIndexOf = bron.replace(/indexOf\([^)]*\)\s*>=\s*0/g, '');
  [/0\.\d/, /sample_count/, /nog_nodig/, /minimum_sample_required/].forEach(function (re) {
    assert.ok(!re.test(zonderIndexOf), 'eigen drempel of eigen telling in de UI: ' + re);
  });
});

/* ══ H. GEEN CAUSALITEIT ════════════════════════════════════════════════ */
console.log('\nH. Geen causaliteitsclaim');

t('H1: geen enkel nieuw UI-fragment claimt een oorzaak', function () {
  var stukken = ['tkRelOnvoldoendeZin', 'tkRelStatusTekst', 'tkRelKaartHtml',
                 'renderLichaamVerbandenOverzicht'].map(pak).join(' ').toLowerCase();
  ['veroorzaakt', 'zorgt voor', 'leidt tot', 'dankzij', 'heeft als gevolg', 'bewijst', 'komt door']
    .forEach(function (w) { assert.ok(stukken.indexOf(w) < 0, 'oorzaakwoord in de UI: ' + w); });
});

t('H2: geen populatieclaim in de nieuwe teksten', function () {
  var stukken = ['tkRelOnvoldoendeZin', 'renderLichaamVerbandenOverzicht'].map(pak).join(' ').toLowerCase();
  RC.RELATIE_POPULATIE_WOORDEN.forEach(function (w) {
    assert.ok(stukken.indexOf(w) < 0, 'populatieclaim: ' + w);
  });
});

t('H3: de disclaimer staat nog steeds op elke vrijgegeven kaart', function () {
  var ctx = zandbak(['tkVerbandPijl', 'tkRelBadge', 'tkRelOnvoldoendeReden', 'tkRelOnvoldoendeZin',
                     'tkRelStatusTekst', 'tkRelConfTekst', 'tkRelKaartHtml']);
  var html = ctx.tkRelKaartHtml(relV({ status: 'STRONG_PATTERN', is_patroon: true, effect: 0.6,
    effect_direction: 'higher', confidence: 'hoog', zin: 'Op dagen waarop je HRV hoger was, lag je gewicht hoger.',
    data_quality: { niveau: 'goed', uitgesloten: 0, redenen: [] } }));
  assert.ok(html.indexOf('geen oorzaak') > 0);
});

/* ══ I. AI KAN DE UITKOMST NIET WIJZIGEN ════════════════════════════════ */
console.log('\nI. AI-grens');

t('I1: de AI-payload bevat nog steeds geen coefficient of interne sleutels', function () {
  var c = CoachingCore.buildIntelligenceContext({ relaties: [{
    relationship_id: 'hrv__rhr', is_patroon: true, status: 'STRONG_PATTERN', confidence: 'hoog',
    sample_count: 37, effect: -0.515, strength_label: 'Sterke samenhang',
    zin: 'Op dagen waarop je HRV hoger was, lag je rusthartslag gemiddeld lager.',
    disclaimer: 'Dit is een samenhang, geen oorzaak.',
    data_quality: { niveau: 'goed', uitgesloten: 0 } }] });
  var tekst = JSON.stringify(CoachingCore.intelligenceAiPayload(c));
  ['0.515', 'relationship_id', 'data_quality', 'effect'].forEach(function (v) {
    assert.ok(tekst.indexOf(v) < 0, 'lekt naar de AI: ' + v);
  });
});

t('I2: een niet-vrijgegeven relatie bereikt de coach niet', function () {
  var c = CoachingCore.buildIntelligenceContext({ relaties: [relV()] });
  assert.strictEqual(c.inzichten.length, 0);
});

t('I3: de coachregels verbieden nog steeds eigen berekening en advies uit een verband', function () {
  var r = CoachingCore.intelligenceRegels().toLowerCase();
  assert.ok(r.indexOf('niet opnieuw') > 0);
  assert.ok(r.indexOf('geen nieuwe verbanden') > 0);
  assert.ok(r.indexOf('nooit een oorzaak') > 0);
  assert.ok(r.indexOf('decision engine') > 0);
});

t('I4: geen engine roept een AI aan', function () {
  ['relationship.js', 'athlete.js', 'decision.js', 'calculation.js', 'cardio.js'].forEach(function (f) {
    var bron = fs.readFileSync(path.join(__dirname, f), 'utf8').toLowerCase();
    ['anthropic', 'openai', 'netlify/functions', 'claude-sonnet'].forEach(function (v) {
      assert.ok(bron.indexOf(v) < 0, f + ' roept een AI aan: ' + v);
    });
  });
});

/* ══ J. CALCULATION EN DECISION ONAANGETAST ═════════════════════════════ */
console.log('\nJ. Calculation en Decision onaangetast');

t('J1: er is nog steeds precies één correlatie- en één volumeformule', function () {
  ['spearman', 'calculateVolume'].forEach(function (fn) {
    var treffers = fs.readdirSync(__dirname)
      .filter(function (f) { return f.slice(-3) === '.js' && f.indexOf('test') < 0; })
      .filter(function (f) { return new RegExp('function\\s+' + fn + '\\s*\\(').test(fs.readFileSync(path.join(__dirname, f), 'utf8')); });
    assert.deepStrictEqual(treffers, ['calculation.js'], fn + ' bestaat meerdere keren: ' + treffers);
  });
});

t('J2: alle bestaande contracten bestaan nog', function () {
  ['releaseVerband', 'verbandIsCirculair', 'verbandTrainingContext', 'readinessDay', 'dayZone',
   'restForSet', 'setOutcome', 'releaseRecord', 'buildDecisionEvidence', 'progressionDecision']
    .forEach(function (f) { assert.strictEqual(typeof DecisionCore[f], 'function', 'weg: ' + f); });
  ['spearman', 'calculateVolume', 'oneRMRaw', 'recoveryScore', 'readinessPercent',
   'trendClassify', 'calculateDayFactor'].forEach(function (f) {
    assert.strictEqual(typeof CalcCore[f], 'function', 'weg: CalcCore.' + f);
  });
});

t('J3: de nieuwe engines blijven puur', function () {
  ['relationship.js', 'athlete.js'].forEach(function (f) {
    var code = fs.readFileSync(path.join(__dirname, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    ['Date.now', 'Math.random', 'document.', 'fetch(', 'localStorage']
      .forEach(function (v) { assert.ok(code.indexOf(v) < 0, f + ' bevat ' + v); });
  });
});

t('J4: AthleteCore bouwt geen eigen tijdparser', function () {
  var bron = fs.readFileSync(path.join(__dirname, 'athlete.js'), 'utf8');
  ['split(\':\')', 'parseFloat(mm', 'function parseTime'].forEach(function (v) {
    assert.ok(bron.indexOf(v) < 0, 'tweede tijdparser in athlete.js: ' + v);
  });
  assert.ok(bron.indexOf('d.parseTime') > 0, 'de bestaande parser wordt niet ingespoten');
});

/* ══ K/L/M. HOME, TRAINING EN FITBIT ════════════════════════════════════ */
console.log('\nK/L/M. Home, Training en Fitbit onaangetast');

var BESCHERMD = [
  ['id="s-home"', 'Home-scherm'], ['id="home-readiness"', 'Home readinesskaart'],
  ['id="home-coach-vandaag"', 'Home coachkaart'], ['id="home-plan"', 'Home planblok'],
  ['function refreshHome', 'Home-renderer'], ['function tkReadinessVandaag', 'readiness'],
  ['function tkLiveCoachUpdate', 'live coach'], ['function tkLiveCoachHtml', 'live coach html'],
  ['function tkLiveCoachVraagAi', 'live coach AI'], ['resolvedWorkout', 'Workout Builder'],
  ['function createTrainingInstance', 'training instance'], ['function snapshotFromVasteTraining', 'snapshot'],
  ['exPickerCallback', 'exercise picker'], ['wearable-sync', 'Fitbit sync'],
  ['wearable-status', 'Fitbit status'], ['function tkSetEvidence', 'evidence-schrijver']
];
BESCHERMD.forEach(function (p) {
  t('K: ' + p[1] + ' bestaat nog', function () {
    assert.ok(HTML.indexOf(p[0]) > 0, 'verdwenen: ' + p[0]);
  });
});

t('L1: de onderste navigatie heeft nog steeds vijf items', function () {
  var i = HTML.indexOf('id="s-home"');
  var blok = HTML.slice(i, i + 20000);
  var nav = blok.slice(blok.indexOf('<nav class="bnav"'), blok.indexOf('</nav>'));
  assert.strictEqual((nav.match(/class="ni[ "]/g) || []).length, 5);
});

t('M1: de Fitbit-keten is ongewijzigd', function () {
  ['wearable-auth-start', 'wearable-auth-callback', 'wearable-disconnect', 'wearable-sync', 'wearable-status']
    .forEach(function (f) {
      assert.ok(fs.existsSync(path.join(__dirname, '..', 'netlify', 'functions', f + '.js')),
        'Netlify-functie verdwenen: ' + f);
    });
});

t('M2: de Guided-sessierij bevat nog steeds dezelfde kolommen', function () {
  var ctx = zandbak(['tkSetEvidence', 'buildStrengthSessionRow']);
  var r = ctx.buildStrengthSessionRow('ex1', [{ kg: '100', reps: '5', rpe: '8', effKg: 100 }],
    { date: '2026-08-19', training_type: 'guided', instanceId: 'i1', at: '2026-08-19T10:00:00.000Z',
      voorschrift: { kg: 100, reps: 5, rpe: 8 } }).row;
  assert.deepStrictEqual(Object.keys(r).sort(),
    ['date', 'exercise_id', 'note', 'reps', 'rpe', 'sets', 'sets_detail', 'training_instance_id',
     'training_type', 'weight'].sort(), 'kolommen van de sessierij gewijzigd');
});

console.log('\n' + '='.repeat(56));
console.log('fZichtbaarheid.test.js — ' + n + ' asserts geslaagd');
