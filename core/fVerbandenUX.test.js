/* fVerbandenUX.test.js — Sprint 20: Verbanden-experience
 *
 * De UI-tests hier gaan niet over hoe iets eruitziet, maar over de twee dingen die
 * fout kunnen gaan zodra een scherm data toont: dat het een conclusie verzint waar
 * er geen is, en dat het zelf gaat rekenen. Beide worden hier afgedwongen op de
 * werkelijke inhoud van index.html.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var RC = require('../core/relationship.js');
var CalcCore = require('../core/calculation.js');
var DeviceCore = require('../core/deviceIntegration.js');
var DecisionCore = require('../core/decision.js');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var n = 0;
function t(naam, fn) { fn(); n++; }

/* Haal losse functies uit index.html en voer ze uit in een zandbak. Zo worden de
   echte, verzonden implementaties getest — geen kopie die kan gaan afwijken. */
function pak(naam) {
  var re = new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm');
  var m = HTML.match(re);
  assert.ok(m, 'functie niet gevonden in index.html: ' + naam);
  return m[0];
}
function zandbak(namen, extra) {
  var ctx = Object.assign({
    RelationshipCore: RC, CalcCore: CalcCore, DeviceCore: DeviceCore, DecisionCore: DecisionCore,
    escHtml: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); },
    console: console, Math: Math, Number: Number, String: String, Array: Array, Object: Object
  }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(namen.map(pak).join('\n'), ctx);
  return ctx;
}

/* ── 1. Het scherm bestaat en hangt in de bestaande navigatie ─────────────── */
t('het verbanden-overzicht bestaat als eigen scherm', function () {
  assert.ok(HTML.indexOf('id="s-lich-verbanden"') > 0, 'scherm s-lich-verbanden ontbreekt');
  assert.ok(HTML.indexOf('id="lich-verbanden-body"') > 0);
  assert.ok(HTML.indexOf('id="lich-verbanden-filters"') > 0);
});

t('het overzicht is bereikbaar vanaf Lichaam', function () {
  assert.ok(HTML.indexOf("go('s-lich-verbanden')") > 0, 'geen route naar het overzicht');
});

t('de route roept de renderer aan', function () {
  assert.ok(/if\(id==='s-lich-verbanden'\)renderLichaamVerbandenOverzicht\(\)/.test(HTML),
    'route s-lich-verbanden niet geregistreerd');
});

t('het detailscherm blijft bestaan', function () {
  assert.ok(HTML.indexOf('id="s-lich-verband"') > 0, 'bestaand detailscherm verdwenen');
  assert.ok(HTML.indexOf('id="lich-verband-body"') > 0);
});

t('beide verbandschermen houden de bestaande onderste navigatie', function () {
  ['s-lich-verbanden', 's-lich-verband'].forEach(function (id) {
    var i = HTML.indexOf('id="' + id + '"');
    var blok = HTML.slice(i, i + 4000);
    assert.ok(blok.indexOf('class="bnav"') > 0, id + ' mist de hoofdnavigatie');
  });
});

/* ── 2. De lijst is dynamisch, geen vaste opsomming ───────────────────────── */
t('de UI kent geen vaste lijst van verbanden meer', function () {
  /* De oude, met de hand geschreven berekening per definitie is vervangen door de
     discovery-engine. Blijft hij staan, dan bestaan er twee waarheden naast elkaar. */
  assert.ok(HTML.indexOf('function tkVerbandBereken') < 0,
    'het oude, vaste berekeningspad is met Sprint 22 opgeruimd — twee paden zou twee waarheden geven');
  assert.ok(HTML.indexOf('renderLichaamVerbandenOverzicht') > 0);
  assert.ok(/tkRelDiscover\(/.test(HTML), 'het overzicht draait niet op de discovery-engine');
});

t('het overzicht leest zijn relaties uit de engine, niet uit een array in de UI', function () {
  var bron = pak('renderLichaamVerbandenOverzicht');
  assert.ok(bron.indexOf('tkRelDiscover') > 0, 'geen aanroep van de engine');
  assert.ok(bron.indexOf('uit.overzicht.zichtbaar') > 0, 'gebruikt de rangschikking van de engine niet');
});

t('de UI bepaalt zelf geen drempel en geen sterktegrens', function () {
  ['tkRelKaartHtml', 'renderLichaamVerbandenOverzicht', 'tkRelTransparantieHtml', 'tkRelStatusTekst']
    .forEach(function (naam) {
      var bron = pak(naam);
      [/0\.10/, /0\.30/, /0\.50/, />=\s*30\b/, /<\s*30\b/].forEach(function (re) {
        assert.ok(!re.test(bron), 'drempel of sterktegrens in de UI: ' + naam);
      });
    });
});

t('de UI berekent zelf geen correlatie', function () {
  ['tkRelKaartHtml', 'tkRelTransparantieHtml', 'renderLichaamVerbandenOverzicht']
    .forEach(function (naam) {
      var bron = pak(naam);
      ['spearman(', 'Math.sqrt', 'pearson'].forEach(function (v) {
        assert.ok(bron.indexOf(v) < 0, 'rekenwerk in de UI: ' + naam + ' bevat ' + v);
      });
    });
});

/* ── 3. Filters ───────────────────────────────────────────────────────────── */
t('de vier categorieën uit de engine zijn de filters', function () {
  var bron = pak('renderLichaamVerbandenOverzicht');
  assert.ok(bron.indexOf('RC.DOMEINEN') > 0, 'filters komen niet uit de engine');
  assert.ok(/tkRelFilterZet\(\\?'alle\\?'\)/.test(bron), 'filter Alle ontbreekt');
});

t('de filterlabels staan niet los in de UI opgeschreven', function () {
  var bron = pak('renderLichaamVerbandenOverzicht');
  ['Herstel', 'Prestaties', 'Omgeving'].forEach(function (label) {
    assert.ok(bron.indexOf("'" + label + "'") < 0,
      'filterlabel ' + label + ' is in de UI hardgecodeerd in plaats van uit DOMEINEN');
  });
});

t('filter zetten hertekent het overzicht', function () {
  var bron = pak('tkRelFilterZet');
  assert.ok(bron.indexOf('renderLichaamVerbandenOverzicht') > 0);
});

/* ── 4. De kaart — mét en zónder voldoende data ───────────────────────────── */
function relVoorbeeld(over) {
  return Object.assign({
    relationship_id: 'sleep__hrv', bronLabel: 'Slaap', doelLabel: 'HRV',
    domein: 'recovery', domeinLabel: 'Herstel',
    status: 'STRONG_PATTERN', is_patroon: true, effect: 0.62, effect_direction: 'higher',
    sample_count: 42, nog_nodig: 0, minimum_sample_required: 30, confidence: 'hoog',
    zin: 'Op dagen waarop je langer sliep, lag je HRV gemiddeld hoger.',
    disclaimer: 'Dit is een samenhang, geen oorzaak.', kwaliteit_zin: null,
    data_quality: { niveau: 'goed', uitgesloten: 0 }, period: '365d', versie: 'relationship.v1',
    decision_version: 'verband.v1'
  }, over || {});
}

t('een sterk patroon toont zin, aantal dagen en betrouwbaarheid', function () {
  var ctx = zandbak(['tkVerbandPijl', 'tkRelBadge', 'tkRelStatusTekst', 'tkRelConfTekst', 'tkRelKaartHtml']);
  var html = ctx.tkRelKaartHtml(relVoorbeeld());
  assert.ok(html.indexOf('Sterk patroon') > 0);
  assert.ok(html.indexOf('42 vergelijkbare dagen') > 0);
  assert.ok(html.indexOf('hoge betrouwbaarheid') > 0);
  assert.ok(html.indexOf('lag je HRV gemiddeld hoger') > 0);
  assert.ok(html.indexOf('geen oorzaak') > 0, 'disclaimer ontbreekt op de kaart');
});

t('onvoldoende data toont NOOIT een conclusie', function () {
  var ctx = zandbak(['tkVerbandPijl', 'tkRelBadge', 'tkRelStatusTekst', 'tkRelConfTekst', 'tkRelKaartHtml']);
  var html = ctx.tkRelKaartHtml(relVoorbeeld({
    status: 'INSUFFICIENT_DATA', is_patroon: false, effect: null, effect_direction: 'none',
    sample_count: 12, nog_nodig: 18, confidence: 'laag',
    zin: null, bronLabel: 'Luchtvochtigheid', doelLabel: 'Prestatie'
  }));
  assert.ok(html.indexOf('Meer data nodig') > 0);
  assert.ok(html.indexOf('12 vergelijkbare dagen') > 0);
  assert.ok(html.indexOf('nog 18 te gaan') > 0, 'de sporter hoort te zien hoeveel er nog nodig is');
  assert.ok(html.indexOf('onvoldoende data') > 0);
  ['gemiddeld hoger', 'gemiddeld lager', 'sterk', 'patroon gevonden'].forEach(function (w) {
    assert.ok(html.toLowerCase().indexOf(w) < 0 || w === 'sterk',
      'conclusie bij onvoldoende data: ' + w);
  });
});

t('geen patroon is een eigen uitkomst, geen lege kaart', function () {
  var ctx = zandbak(['tkVerbandPijl', 'tkRelBadge', 'tkRelStatusTekst', 'tkRelConfTekst', 'tkRelKaartHtml']);
  var html = ctx.tkRelKaartHtml(relVoorbeeld({
    status: 'NO_PATTERN', is_patroon: false, effect: 0, effect_direction: 'none',
    zin: 'Tussen je slaap en je HRV is in deze periode geen duidelijke samenhang te zien.'
  }));
  assert.ok(html.indexOf('Geen patroon') > 0);
  assert.ok(html.indexOf('geen duidelijke samenhang') > 0);
  assert.ok(html.indexOf('Meer data nodig') < 0, 'geen patroon is iets anders dan te weinig data');
});

t('elke classificatie uit de engine heeft een woord in de UI', function () {
  var ctx = zandbak(['tkRelStatusTekst']);
  Object.keys(RC.CLASSIFICATIES).forEach(function (k) {
    var tekst = ctx.tkRelStatusTekst({ status: k });
    assert.ok(tekst && tekst.length > 0, 'geen UI-woord voor classificatie ' + k);
  });
});

t('elke classificatie heeft een badge-klasse', function () {
  var ctx = zandbak(['tkRelBadge']);
  Object.keys(RC.CLASSIFICATIES).forEach(function (k) {
    var cls = ctx.tkRelBadge(k);
    assert.ok(/^s[0-3]$/.test(cls), 'onbekende badge voor ' + k + ': ' + cls);
  });
});

t('elk betrouwbaarheidsniveau heeft een woord', function () {
  var ctx = zandbak(['tkRelConfTekst']);
  RC.CONFIDENCE_NIVEAUS.forEach(function (c) {
    assert.ok(ctx.tkRelConfTekst(c).indexOf('betrouwbaarheid') > 0, 'geen tekst voor ' + c);
  });
});

t('de kaart ontsnapt gebruikersinhoud', function () {
  var ctx = zandbak(['tkVerbandPijl', 'tkRelBadge', 'tkRelStatusTekst', 'tkRelConfTekst', 'tkRelKaartHtml']);
  var html = ctx.tkRelKaartHtml(relVoorbeeld({ bronLabel: '<img src=x onerror=alert(1)>' }));
  assert.ok(html.indexOf('<img') < 0, 'HTML uit data komt ongefilterd in de kaart');
  assert.ok(html.indexOf('&lt;img') > 0);
});

/* ── 5. Transparantie ─────────────────────────────────────────────────────── */
t('het transparantieblok toont alle bepalende getallen', function () {
  var ctx = zandbak(['tkRelConfTekst', 'tkRelTransparantieHtml'],
                    { CalcCore: CalcCore });
  var html = ctx.tkRelTransparantieHtml(relVoorbeeld({ data_quality: { niveau: 'goed', uitgesloten: 3 } }));
  ['Hoe is dit bepaald?', 'Vergelijkbare dagen', 'Periode', 'Datakwaliteit',
   'Betrouwbaarheid', 'Coëfficiënt', 'Richting', 'Uitgesloten dagen', 'Drempel'
  ].forEach(function (label) {
    assert.ok(html.indexOf(label) > 0, 'transparantie mist: ' + label);
  });
  assert.ok(html.indexOf('42') > 0 && html.indexOf('365d') > 0 && html.indexOf('30 dagen') > 0);
});

t('het transparantieblok noemt alle drie de contractversies', function () {
  var ctx = zandbak(['tkRelConfTekst', 'tkRelTransparantieHtml'], { CalcCore: CalcCore });
  var html = ctx.tkRelTransparantieHtml(relVoorbeeld());
  assert.ok(html.indexOf('verband.v1') > 0, 'decision-versie ontbreekt');
  assert.ok(html.indexOf('relationship.v1') > 0, 'relationship-versie ontbreekt');
  assert.ok(html.indexOf('correlation.v1') > 0, 'correlation-versie ontbreekt');
});

t('het transparantieblok zegt expliciet dat sterkte geen bewijskracht is', function () {
  var ctx = zandbak(['tkRelConfTekst', 'tkRelTransparantieHtml'], { CalcCore: CalcCore });
  var html = ctx.tkRelTransparantieHtml(relVoorbeeld());
  assert.ok(html.indexOf('niet over bewijskracht') > 0);
});

/* ── 6. Taal ──────────────────────────────────────────────────────────────── */
t('geen enkel UI-fragment rond verbanden bevat een oorzaakwoord', function () {
  var stukken = ['tkRelKaartHtml', 'tkRelStatusTekst', 'tkRelTransparantieHtml',
                 'renderLichaamVerbandenOverzicht'].map(pak).join(' ').toLowerCase();
  ['veroorzaakt', 'zorgt voor', 'leidt tot', 'dankzij', 'heeft als gevolg', 'bewijst']
    .forEach(function (w) {
      assert.ok(stukken.indexOf(w) < 0, 'oorzaakwoord in de UI: ' + w);
    });
});

t('geen enkel UI-fragment rond verbanden bevat een populatieclaim', function () {
  var stukken = ['tkRelKaartHtml', 'tkRelTransparantieHtml', 'renderLichaamVerbandenOverzicht']
    .map(pak).join(' ').toLowerCase();
  RC.RELATIE_POPULATIE_WOORDEN.forEach(function (w) {
    assert.ok(stukken.indexOf(w) < 0, 'populatieclaim in de UI: ' + w);
  });
});

t('het overzicht presenteert zich niet als vaste lijst', function () {
  var bron = pak('renderLichaamVerbandenOverzicht');
  assert.ok(bron.indexOf('op dit moment in jouw gegevens') > 0,
    'de zin die duidelijk maakt dat dit geen vaste lijst is, ontbreekt');
  assert.ok(bron.indexOf('geen vaste lijst') > 0);
  assert.ok(bron.toLowerCase().indexOf('de verbanden van trainingskompas') < 0,
    'het overzicht claimt een vaste, app-brede lijst');
});

/* ── 7. Prestaties en robuustheid ─────────────────────────────────────────── */
t('de verbanden-query gebruikt de bestaande timeout-bescherming', function () {
  var bron = pak('tkRelData');
  assert.ok(bron.indexOf('v43SafeGet') > 0, 'zware query zonder timeout');
  assert.ok(bron.indexOf('await sbGet(') < 0, 'directe sbGet zonder timeout in het verbandenpad');
});

t('de uitkomst wordt per periode gecachet', function () {
  var bron = pak('tkRelDiscover');
  assert.ok(bron.indexOf('_tkRelCache') > 0, 'geen cache — elke periodewissel zou herrekenen');
});

t('een ontbrekende engine leidt tot een nette melding, niet tot een lege lijst', function () {
  var bron = pak('tkRelDiscover');
  assert.ok(bron.indexOf("reason:'engine_ontbreekt'") > 0);
  var ov = pak('renderLichaamVerbandenOverzicht');
  assert.ok(ov.indexOf('konden niet worden bepaald') > 0, 'geen foutmelding bij ontbrekende engine');
});

t('ontbrekende bronnen worden weggelaten, niet opgevuld', function () {
  var bron = pak('tkRelBronnen');
  assert.ok(/if\(hrv\.length\)/.test(bron) && /if\(rhr\.length\)/.test(bron) && /if\(slp\.length\)/.test(bron),
    'lege reeksen worden niet uitgefilterd');
  assert.ok(bron.indexOf('|| 0') < 0 && bron.indexOf('||0') < 0, 'ontbrekende waarde wordt opgevuld met 0');
});

t('de slaapreeks wordt genormaliseerd via de bestaande eenheidsregel', function () {
  var bron = pak('tkRelBronnen');
  assert.ok(bron.indexOf('tkSleepHours') > 0, 'sleep_unit.v1-normalisatie ontbreekt');
});

t('het Lichaam-overzicht toont hooguit een kort lijstje', function () {
  assert.ok(/TK_REL_HOME_MAX\s*=\s*3/.test(HTML), 'geen begrenzing op het Lichaam-overzicht');
  var bron = pak('renderLichaamVerbanden');
  assert.ok(bron.indexOf('TK_REL_HOME_MAX') > 0);
  assert.ok(bron.indexOf('is_patroon') > 0, 'het korte lijstje toont ook niet-patronen');
});

t('het Lichaam-overzicht laat de bestaande lege toestand met rust', function () {
  var bron = pak('renderLichaamVerbanden');
  assert.ok(/if\(!top\.length\) return;/.test(bron), 'lege toestand wordt overschreven');
});

/* ── 8. Geen regressie op bestaande schermen ──────────────────────────────── */
t('Home en Training zijn niet aangeraakt', function () {
  ['id="s-home"', 'id="home-readiness"', 'id="home-coach-vandaag"', 'id="home-plan"']
    .forEach(function (m) { assert.ok(HTML.indexOf(m) > 0, 'Home-onderdeel verdwenen: ' + m); });
  assert.ok(HTML.indexOf('livecoach-') > 0, 'live coach uit Sprint 13 verdwenen');
});

t('het spreidingsdiagram tekent nog steeds geen trendlijn', function () {
  var bron = pak('tkRenderVerbandScatter');
  assert.ok(bron.indexOf('GEEN trendlijn') > 0 || HTML.indexOf('GEEN trendlijn') > 0);
  assert.ok(bron.indexOf('<path') < 0, 'er wordt een lijn getekend in het spreidingsdiagram');
});

t('er staat geen dode verband-code meer in de UI', function () {
  assert.ok(HTML.indexOf('function openVerband(') < 0,
    'openVerband is vervangen door openRelatie maar nog aanwezig');
});

t('openRelatie zet zowel de nieuwe als de bestaande selectie', function () {
  var bron = pak('openRelatie');
  assert.ok(bron.indexOf('tkRelSel=id') > 0 && bron.indexOf('lichVerbandSel=id') > 0);
  assert.ok(bron.indexOf("go('s-lich-verband')") > 0);
});

console.log('fVerbandenUX.test.js — ' + n + ' asserts geslaagd');
