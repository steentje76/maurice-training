/* Lichaam 2.0 — metric-detailscherm + healthStats. Unit- en regressietest.
 *
 * Dekt:
 *   A  healthStats: gemiddelde, min, max, spreiding, dekking, gaten en randgevallen
 *   B  availablePeriods: een periode wordt alleen aangeboden als hij iets toevoegt
 *   C  weightSeries: gewicht uit weight_log in dezelfde serievorm, zonder interpolatie
 *   D  de route: vier metrics, één scherm, één renderer, geen tweede router
 *   E  de configuratie van de vier metrics (veld, eenheid, grafiektype)
 *   F  regressie: overzicht, anatomie, verbanden en Fitbit blijven ongemoeid
 *
 * De DOM- en routecontroles lezen de ECHTE index.html — geen tweede source of truth.
 * Draai: node core/fLichaamMetricDetail.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('./deviceIntegration.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

console.log('\n[Lichaam 2.0] metric-detail & healthStats');

// ── A. healthStats ───────────────────────────────────────────────────────────
console.log('  A healthStats');
const serie = [
  { date: '2026-08-11', value: 20 },
  { date: '2026-08-12', value: null },   // gat — telt in de dekking, NOOIT als 0
  { date: '2026-08-13', value: 30 },
  { date: '2026-08-14', value: 40 }
];
let st = D.healthStats(serie);
eq(st.count, 3, 'A1: alleen echte metingen tellen mee');
eq(st.days, 4, 'A2: het venster blijft 4 dagen');
eq(st.mean, 30, 'A3: gemiddelde over de metingen (30), niet over de dagen (22,5)');
eq(st.min, 20, 'A4: minimum');
eq(st.max, 40, 'A5: maximum');
eq(st.range, 20, 'A6: spreidingsbreedte max−min');
eq(st.coverage, 0.75, 'A7: dekking 3 van 4 dagen');
eq(st.complete, false, 'A8: niet volledig bij een gat');
ok(Math.abs(st.sd - 8.16) < 0.01, 'A9: standaarddeviatie over de metingen (populatie-SD ≈ 8,16)');

eq(D.healthStats([{ date: 'a', value: null }, { date: 'b', value: null }]),
   { count: 0, days: 2, coverage: 0, complete: false, mean: null, min: null, max: null, sd: null, range: null },
   'A10: geen metingen → alles null, nooit 0');
eq(D.healthStats([]).count, 0, 'A11: lege reeks is veilig');
eq(D.healthStats(null).days, 0, 'A12: null is veilig');
eq(D.healthStats([{ date: 'a', value: 5 }, { date: 'b', value: null }]).sd, null,
   'A13: spreiding is null bij één meting — 0 zou "geen variatie" beweren');
eq(D.healthStats([{ date: 'a', value: 5 }, { date: 'b', value: 5 }]).sd, 0,
   'A14: twee identieke metingen geven wél spreiding 0');
eq(D.healthStats([{ date: 'a', value: 4 }, { date: 'b', value: 6 }]).mean, 5, 'A15: gemiddelde van twee punten');
eq(D.healthStats([{ date: 'a', value: 'x' }, { date: 'b', value: 6 }]).count, 1,
   'A16: onbruikbare waarde telt niet mee (geen NaN in het gemiddelde)');
eq(D.healthStats([{ date: 'a', value: 6 }, { date: 'b', value: 6 }]).complete, true, 'A17: volledig venster');
// determinisme: tien keer dezelfde invoer geeft tien keer dezelfde uitkomst
let zelfde = true;
const ref = JSON.stringify(D.healthStats(serie));
for (let i = 0; i < 10; i++) if (JSON.stringify(D.healthStats(serie)) !== ref) zelfde = false;
ok(zelfde, 'A18: deterministisch — geen Date.now, geen random');

// Slaap blijft decimale uren; healthStats rekent niet om.
eq(D.healthStats([{ date: 'a', value: 6.07 }, { date: 'b', value: 7.2 }]).mean, 6.64,
   'A19: slaap in decimale uren blijft decimale uren');

// ── B. availablePeriods ──────────────────────────────────────────────────────
console.log('  B availablePeriods');
const maak = (n) => Array.from({ length: n }, (_, i) => ({ date: 'd' + i, value: i }));
// 5 metingen: 7d toont er 5, langere perioden voegen niets toe → alleen 7d aanbieden
eq(D.availablePeriods((p) => maak(Math.min(p, 5)), [7, 14, 30, 90, 365]), [7],
   'B1: langere perioden zonder extra metingen worden niet aangeboden');
// oplopende data: elke periode toont meer
eq(D.availablePeriods((p) => maak(p), [7, 14, 30]), [7, 14, 30],
   'B2: elke periode die meer laat zien wordt wél aangeboden');
// één meting: er valt geen verloop te tekenen
eq(D.availablePeriods((p) => maak(1), [7, 14, 30]), [],
   'B3: één meting levert geen enkele periode op — geen lijn door één punt');
eq(D.availablePeriods((p) => [], [7, 14]), [], 'B4: geen data → geen perioden');
eq(D.availablePeriods(() => { throw new Error('stuk'); }, [7]), [],
   'B5: een fout in de reeks levert geen periode op i.p.v. een crash');
eq(D.MIN_POINTS_FOR_PERIOD, 2, 'B6: de rendervoorwaarde staat expliciet op twee punten');
// volgorde-onafhankelijk
eq(D.availablePeriods((p) => maak(p), [30, 7, 14]), [7, 14, 30], 'B7: perioden komen oplopend terug');

// ── C. weightSeries ──────────────────────────────────────────────────────────
console.log('  C weightSeries');
const wrows = [
  { date: '2026-08-18', weight: 80.2, scale: 'Tanita' },
  { date: '2026-08-18', weight: 79.9, scale: 'Tanita' },   // oudere rij van dezelfde dag
  { date: '2026-08-16', weight: 80.6, scale: 'Tanita' }
];
const ws = D.weightSeries(wrows, '2026-08-18', 4);
eq(ws.map(x => x.date), ['2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18'], 'C1: aaneengesloten dagvenster');
eq(ws.map(x => x.value), [null, 80.6, null, 80.2], 'C2: gaten blijven null — geen interpolatie, geen nul');
eq(D.weightSeries([], '2026-08-18', 3).filter(x => x.value != null).length, 0, 'C3: zonder rijen alleen gaten');
eq(D.weightSeries([{ date: '2026-08-18', weight: null }], '2026-08-18', 1)[0].value, null,
   'C4: een rij zonder gewicht levert geen waarde');
// identiek aan de eerdere inline-constructie van het overzicht
const inline = (rows, end, days) => {
  const byDate = {};
  rows.forEach(r => { if (r && r.date && r.weight != null && byDate[String(r.date).slice(0, 10)] == null) byDate[String(r.date).slice(0, 10)] = r.weight; });
  return D.dateRange(end, days).map(d => ({ date: d, value: byDate[d] != null ? byDate[d] : null }));
};
eq(ws, inline(wrows, '2026-08-18', 4), 'C5: uitkomst identiek aan de vervangen inline-constructie van het overzicht');

// healthSeries zelf interpoleert nog steeds niet (regressie op de bestaande laag)
eq(D.healthSeries([{ date: '2026-08-18', hrv: 28.5 }], 'hrv', '2026-08-18', 3).map(x => x.value),
   [null, null, 28.5], 'C6: healthSeries laat gaten leeg');

// ── D. route en scherm ───────────────────────────────────────────────────────
console.log('  D route en scherm');
ok(html.indexOf('id="s-lich-metric"') >= 0, 'D1: het metric-detailscherm staat in de DOM');
ok(html.indexOf('id="lich-metric-body"') >= 0, 'D2: de renderdoel-container bestaat');
const routeM = html.match(/const TK_LICH_METRIC_ROUTE=\{([^}]*)\}/);
ok(!!routeM, 'D3: de routetabel bestaat nog steeds als één tabel');
['hrv', 'rhr', 'slaap', 'gewicht'].forEach(k => {
  ok(new RegExp(k + ":'s-lich-metric'").test(routeM[1]), 'D4: ' + k + ' routeert naar het gedeelde detailscherm');
});
ok(/if\(id==='s-lich-metric'\)renderLichaamMetricDetail\(\);/.test(html),
   'D5: de BESTAANDE go()-router dispatcht het scherm — geen tweede router');
eq((html.match(/function renderLichaamMetricDetail\(/g) || []).length, 1, 'D6: precies één renderer');
ok(/function openLichaamMetric\(key\)\{[^}]*lichMetricSel=key/.test(html),
   'D7: openLichaamMetric legt de gekozen metric vast (zelfde patroon als lichSpierSel)');
ok(html.indexOf(':is(#s-lichaam,#s-lich-spieren,#s-lich-spier,#s-lich-health,#s-lich-metingen,#s-lich-metric,#s-lich-oefeningen)') >= 0,
   'D8: het scherm erft de bestaande Lichaam-cascade i.p.v. eigen stijlen');
ok(/id="s-lich-metric"[\s\S]{0,2600}class="bnav"/.test(html), 'D9: de bestaande bottom navigation staat op het scherm');

// ── E. metricconfiguratie ────────────────────────────────────────────────────
console.log('  E metricconfiguratie');
const cfgBlok = html.slice(html.indexOf('const TK_LICH_METRICS = {'), html.indexOf('let lichMetricSel'));
['hrv', 'rhr', 'slaap', 'gewicht'].forEach(k => ok(new RegExp('\\b' + k + ':\\s*\\{').test(cfgBlok), 'E1: configuratie voor ' + k));
ok(/field:'hrv'/.test(cfgBlok) && /field:'rhr'/.test(cfgBlok) && /field:'sleep'/.test(cfgBlok) && /field:'weight'/.test(cfgBlok),
   'E2: elke metric wijst naar zijn eigen veld');
ok(/src:'weight_log'/.test(cfgBlok) && /src:'hrv_log'/.test(cfgBlok), 'E3: gewicht komt uit weight_log, de rest uit hrv_log');
ok(/chart:'bar'/.test(cfgBlok), 'E4: slaap wordt als staafdiagram getoond');
ok(/kind:'entered'/.test(cfgBlok), 'E5: gewicht is expliciet ingevoerd, niet gemeten');
ok(html.indexOf('const TK_LICH_METRIC_PERIODS = TK_HEALTH_PERIODS.concat([365])') >= 0,
   'E6: de periodelijst bouwt voort op de bestaande TK_HEALTH_PERIODS (7/14/30/90 + 1j)');
ok(/tkSleepHours\(p\.value\)/.test(html.slice(html.indexOf('function _tkMetricSeries'), html.indexOf('function tkSetMetricPeriod'))),
   'E7: slaap wordt via de bestaande sleep_unit-normalisatie naar decimale uren gebracht');
ok(html.indexOf('dc.availablePeriods(function(p)') >= 0, 'E8: het scherm biedt alleen beschikbare perioden aan');
// De renderer mag geen eigen grafiek- of statistiekmotor bevatten.
const rend = html.slice(html.indexOf('async function renderLichaamMetricDetail'), html.indexOf('// Lichaam 2.0 — alle vier de trendkaarten'));
ok(rend.indexOf('tkRenderHealthChart(') >= 0, 'E9: de bestaande grafiekrenderer wordt hergebruikt');
ok(rend.indexOf('dc.healthStats(') >= 0 && rend.indexOf('dc.observation(') >= 0 && rend.indexOf('dc.healthTrend(') >= 0,
   'E10: statistiek, observatie en trend komen uit DeviceCore');
ok(!/Math\.sqrt|reduce\(function\s*\([^)]*\)\s*\{\s*return\s*[a-z]\s*\+/.test(rend), 'E11: geen eigen statistiek in de UI');
ok(rend.indexOf('correlat') < 0 && rend.indexOf('pearson') < 0, 'E12: geen correlatielogica in het detailscherm');

// ── F. regressie op wat níét mocht veranderen ────────────────────────────────
console.log('  F regressie');
ok(html.indexOf('<div class="lich-figpair">') >= 0, 'F1: beide anatomiefiguren staan nog in de overzichtsmarkup');
ok(html.indexOf('id="lich-fig-front"') >= 0 && html.indexOf('id="lich-fig-back"') >= 0,
   'F2: voor- en achterzijde zijn direct zichtbaar op het overzicht, niet achter een route');
ok(html.indexOf('Nog geen verbanden vrijgegeven') >= 0, 'F3: de veilige verbandentoestand is intact');
ok(!/minimaal \d+ (vergelijkbare )?waarnemingen/.test(html), 'F4: nog steeds geen verzonnen drempel voor verbanden');
ok(html.indexOf('id="lich-hero"') >= 0 && html.indexOf('id="lich-checkin"') >= 0 && html.indexOf('id="lich-datastatus"') >= 0,
   'F5: de goedgekeurde overzichtsblokken staan er ongewijzigd');
ok(html.indexOf("go('s-lich-spier')") >= 0 && html.indexOf('function renderLichaamSpierDetail') >= 0,
   'F6: het spiergroep-detail uit v4.28 is ongemoeid');
ok(html.indexOf('calculateMuscleRecoveryPct') >= 0, 'F7: de bestaande herstelberekening is niet vervangen');
ok(html.indexOf("fetch('/.netlify/functions/wearable-sync'") >= 0, 'F8: de Fitbit-sync-aanroep is ongewijzigd aanwezig');
ok(html.indexOf('function upsertHrvLog') >= 0 && html.indexOf('function tkMergeHealthRow') >= 0,
   'F9: de v4.29.1-dataverliesfix is intact');
// Geen CRUD-belofte op het detail- of metingenscherm.
ok(rend.indexOf('sbDel(') < 0 && rend.indexOf('Verwijderen') < 0 && rend.indexOf('Corrigeren') < 0,
   'F10: geen corrigeren/verwijderen — CRUD staat buiten deze sprint');
// Herkomst bij metingen, zonder nieuwe statusdrempels.
ok(html.indexOf('function tkMetingHerkomst') >= 0, 'F11: metingen tonen bron, meetmoment en ingevoerd/gemeten');
ok(html.indexOf('.bc-herkomst{') >= 0 && html.indexOf('.bc-src{') >= 0, 'F12: de herkomstregels hebben eigen stijl, bestaande tokens');
const herk = html.slice(html.indexOf('function tkMetingHerkomst'), html.indexOf('async function askCoachProfiel'));
ok(herk.indexOf('Date.now') < 0, 'F13: geen eigen tijdlogica in de herkomstregel');
ok(herk.indexOf('dc.observation(') >= 0, 'F14: versheid komt uit de bestaande observatielaag');

// ── G. faalveiligheid (productiebevinding 18-08) ─────────────────────────────
// Direct na een deploy draait een geopende pagina nog op de core/*.js uit de vorige
// service-worker-cache. DeviceCore miste dan de nieuwe functies, de renderer stopte
// halverwege en het scherm bleef leeg. De renderer moet dat opvangen zoals elke andere
// Lichaam-renderer dat doet.
console.log('  G faalveiligheid');
ok(/async function renderLichaamMetricDetail\(\)\{[\s\S]{0,400}catch\(e\)\{/.test(html),
   'G1: de renderer heeft een foutgrens');
ok(/Herlaad de pagina om verder te gaan/.test(html),
   'G2: bij een fout verschijnt een bruikbare melding in plaats van een leeg scherm');
ok(/typeof dc\.availablePeriods!=='function'\|\|typeof dc\.healthStats!=='function'/.test(html),
   'G3: een onvolledige DeviceCore wordt herkend en niet stilzwijgend omzeild');
ok(html.indexOf('async function _renderLichaamMetricDetail(el)') >= 0,
   'G4: de opbouw zit in één functie achter de foutgrens — nog steeds één renderer per metric');
const grens = html.slice(html.indexOf('async function renderLichaamMetricDetail'), html.indexOf('async function _renderLichaamMetricDetail'));
ok(grens.indexOf("innerHTML=''") < 0 && grens.indexOf('lich-empty') >= 0,
   'G5: de foutafhandeling vult het scherm met de bestaande lege-toestandcomponent, nooit met niets');

console.log('\n========================================================');
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exit(1);
console.log('✅ Metric-detail draait op de bestaande engines; geen tweede rekenwaarheid.');
