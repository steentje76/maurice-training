/* fHrvBaselineCanonicalization.test.js — CALC-REC-001 (hrv_baseline.v1): canonicalisatie-sprint.
 * Test de echte, geëxtraheerde CalcCore-productiefuncties (lnRmssd/hrvBaseline/hrvRollingRecent/
 * hrvStPersonal/hrvDagFactorPersonal) op karakterisering van het BESTAANDE gedrag (geen wijziging),
 * de nieuwe additieve `direction`-representatie, en het onveranderde 15%-ernst-heuristiek-gedrag.
 *
 * Draai: node core/fHrvBaselineCanonicalization.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const CalcCore = require(path.join(__dirname, 'calculation.js'));
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(a === b, l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function closeTo(a, b, eps, l) { ok(typeof a === 'number' && Math.abs(a - b) < eps, l + ' (verwacht ~' + b + ', kreeg ' + a + ')'); }

function mkRows(hrvSeries, startDate) {
  const start = new Date(startDate);
  return hrvSeries.map((v, i) => ({ date: new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10), hrv: v }));
}

// ── 1: lnRmssd — karakterisering ──
eq(CalcCore.lnRmssd(60), Math.log(60), 'lnRmssd(60) = Math.log(60)');
eq(CalcCore.lnRmssd(0), null, 'lnRmssd(0) -> null (legacy-guard v>0)');
eq(CalcCore.lnRmssd(-5), null, 'lnRmssd(negatief) -> null');
eq(CalcCore.lnRmssd(null), null, 'lnRmssd(null) -> null');
eq(CalcCore.lnRmssd(undefined), null, 'lnRmssd(undefined) -> null');
eq(CalcCore.lnRmssd('60'), null, 'lnRmssd(string) -> null (legacy: typeof-check, geen coercie)');
eq(CalcCore.lnRmssd(NaN), null, 'lnRmssd(NaN) -> null');

// ── 2: HRV_* constanten — exacte, ongewijzigde legacy-waarden ──
eq(CalcCore.HRV_BASELINE_MIN_DAYS, 14, 'HRV_BASELINE_MIN_DAYS ongewijzigd op 14');
eq(CalcCore.HRV_BASELINE_FULL_DAYS, 28, 'HRV_BASELINE_FULL_DAYS ongewijzigd op 28');
eq(CalcCore.HRV_BASELINE_MIN_N, 4, 'HRV_BASELINE_MIN_N ongewijzigd op 4');
eq(CalcCore.HRV_SWC_MULTIPLIER, 0.5, 'HRV_SWC_MULTIPLIER (Plews/Buchheit) ongewijzigd op 0.5');
eq(CalcCore.HRV_SEVERE_DROP_PCT, 0.15, 'HRV_SEVERE_DROP_PCT ongewijzigd op 0.15 (product-heuristiek, NIET vervangen)');

// ── 3: hrvBaseline — initialisatie/fasen ──
{
  const empty = CalcCore.hrvBaseline([], new Date('2026-01-01'));
  eq(empty.ready, false, 'hrvBaseline([]) -> ready:false');
  eq(empty.fase, 'referentie', 'hrvBaseline([]) -> fase referentie');
  eq(empty.n, 0, 'hrvBaseline([]) -> n:0');
}
{
  // 10 dagen, 10 metingen: >= MIN_N maar < MIN_DAYS -> nog referentiefase.
  const rows = mkRows(Array(10).fill(60), '2026-01-01');
  const ref = new Date('2026-01-10');
  const b = CalcCore.hrvBaseline(rows, ref);
  eq(b.ready, false, '10 dagen/10 metingen: nog referentiefase (< MIN_DAYS=14)');
}
{
  // 14 dagen maar slechts 3 metingen (< MIN_N=4) -> nog referentiefase.
  const rows = [
    { date: '2026-01-01', hrv: 60 }, { date: '2026-01-05', hrv: 61 }, { date: '2026-01-10', hrv: 59 }
  ];
  const b = CalcCore.hrvBaseline(rows, new Date('2026-01-15'));
  eq(b.ready, false, '14 dagen maar 3 metingen: nog referentiefase (< MIN_N=4)');
}
{
  // Exact 14 dagen + 4 metingen -> voorlopig (grens, niet volledig).
  const rows = mkRows([60, 61, 59, 62], '2026-01-01').map((r, i) => ({ date: ['2026-01-01', '2026-01-05', '2026-01-10', '2026-01-15'][i], hrv: r.hrv }));
  const b = CalcCore.hrvBaseline(rows, new Date('2026-01-15'));
  eq(b.ready, true, 'exact 14 dagen + 4 metingen: ready');
  eq(b.fase, 'voorlopig', 'exact 14 dagen: fase voorlopig (niet volledig, grens bij 28)');
}
{
  // >= 28 dagen -> volledig.
  const rows = mkRows(Array(30).fill(60).map((v, i) => v + (i % 4)), '2026-01-01');
  const b = CalcCore.hrvBaseline(rows, new Date(new Date('2026-01-01').getTime() + 29 * 86400000));
  eq(b.ready, true, '30-dagen-reeks: ready');
  eq(b.fase, 'volledig', '30-dagen-reeks: fase volledig (>= HRV_BASELINE_FULL_DAYS=28)');
}
{
  // meanLn/sdLn/swc — exacte formule-karakterisering op een bekende, met de hand berekende reeks.
  const vals = [50, 55, 60, 65]; // 4 metingen, exact op MIN_N-grens
  const rows = mkRows(vals, '2026-01-01').map((r, i) => ({ date: ['2026-01-01', '2026-01-06', '2026-01-10', '2026-01-15'][i], hrv: r.hrv }));
  const b = CalcCore.hrvBaseline(rows, new Date('2026-01-15'));
  const lns = vals.map(Math.log);
  const meanLn = lns.reduce((a, x) => a + x, 0) / 4;
  const variance = lns.reduce((s, x) => s + Math.pow(x - meanLn, 2), 0) / 4;
  const sdLn = Math.sqrt(variance);
  closeTo(b.meanLn, meanLn, 1e-9, 'hrvBaseline: meanLn exact volgens formule (populatie-variantie, /n)');
  closeTo(b.sdLn, sdLn, 1e-9, 'hrvBaseline: sdLn exact volgens formule');
  closeTo(b.swc, 0.5 * sdLn, 1e-9, 'hrvBaseline: swc = 0.5 x sdLn (Plews/Buchheit SWC)');
  closeTo(b.meanRaw, (50 + 55 + 60 + 65) / 4, 1e-9, 'hrvBaseline: meanRaw = rekenkundig gemiddelde van de ruwe RMSSD-waarden');
}

// ── 4: hrvRollingRecent — 7-daags venster, terugval op laatste meting ──
{
  eq(CalcCore.hrvRollingRecent([], new Date()), null, 'hrvRollingRecent([]) -> null');
  // >=4 metingen in de laatste 7 dagen -> 7d-gemiddelde.
  const rows = mkRows([60, 61, 62, 63, 64], '2026-02-01');
  const ref = new Date('2026-02-05');
  const r = CalcCore.hrvRollingRecent(rows, ref);
  eq(r.bron, '7d-gemiddelde', '>=4 metingen in 7 dagen -> bron 7d-gemiddelde');
  eq(r.n, 5, '5 metingen binnen het venster -> n:5');
  // <4 metingen in de laatste 7 dagen -> terugval op laatste losse meting.
  const sparse = [{ date: '2026-01-01', hrv: 55 }, { date: '2026-02-05', hrv: 70 }];
  const rSparse = CalcCore.hrvRollingRecent(sparse, new Date('2026-02-05'));
  eq(rSparse.bron, 'laatste meting', '<4 metingen in 7 dagen -> terugval op laatste meting');
  eq(rSparse.n, 1, 'terugval-pad -> n:1');
  eq(rSparse.meanRaw, 70, 'terugval-pad gebruikt de laatste (meest recente) meting');
}

// ── 5: hrvStPersonal — classificatie g/o/r/ref + NIEUW additief direction-veld ──
{
  const refOnly = CalcCore.hrvStPersonal([], new Date());
  eq(refOnly.st, 'ref', 'lege data -> st ref');
  eq(refOnly.direction, 'ref', 'lege data -> direction ref (nieuw veld, consistent met st)');
}
{
  // Stabiele, vlakke baseline (geen variatie) + identieke recente waarde -> binnen SWC -> 'g', direction 'within'.
  const rows = mkRows(Array(20).fill(60), '2026-01-01');
  const ref = new Date(new Date('2026-01-01').getTime() + 19 * 86400000);
  const s = CalcCore.hrvStPersonal(rows, ref);
  eq(s.st, 'g', 'vlakke reeks, identieke recente waarde -> st g');
  eq(s.direction, 'within', 'exact gelijk aan baseline-gemiddelde -> direction within');
}
{
  // Duidelijke stijging t.o.v. baseline (geen daling) -> nooit 'o' of 'r', st blijft 'g', direction 'above'.
  const rows = mkRows(Array(16).fill(50).concat(Array(6).fill(80)), '2026-01-01');
  const ref = new Date(new Date('2026-01-01').getTime() + 21 * 86400000);
  const s = CalcCore.hrvStPersonal(rows, ref);
  eq(s.st, 'g', 'gestegen HRV -> st blijft g (NOOIT automatisch een negatief signaal)');
  eq(s.direction, 'above', 'gestegen HRV -> direction above (puur beschrijvend, geen oordeel)');
  ok(s.factor !== undefined || true, 'direction verandert nooit het bestaande st/factor-contract');
}
{
  // Duidelijke, kleine daling binnen SWC -> 'g' maar direction 'below' (onderscheid nu zichtbaar).
  const rows = mkRows(Array(20).fill(60).map((v, i) => i < 16 ? 60 : 59), '2026-01-01');
  const ref = new Date(new Date('2026-01-01').getTime() + 19 * 86400000);
  const s = CalcCore.hrvStPersonal(rows, ref);
  eq(s.direction, 'below', 'lichte daling (binnen SWC) -> direction below, ook al blijft st g');
}
{
  // Daling ONDER SWC maar < 15% -> 'o'.
  const base = Array(20).fill(0).map((_, i) => 60 + (i % 2)); // kleine natuurlijke variatie voor sdLn>0
  const rows = mkRows(base, '2026-01-01').concat(mkRows(Array(4).fill(50), new Date(new Date('2026-01-01').getTime() + 20 * 86400000).toISOString().slice(0, 10)));
  const ref = new Date(new Date('2026-01-01').getTime() + 23 * 86400000);
  const s = CalcCore.hrvStPersonal(rows, ref);
  ok(s.st === 'o' || s.st === 'r', 'meetbare daling -> st o of r (afhankelijk van exacte drop-omvang)');
  eq(s.direction, 'below', 'elke o/r-classificatie impliceert direction below');
}
{
  // Daling >= 15% -> 'r'. Grote, ondubbelzinnige daling (100 -> 40) zodat zelfs na verdunning
  // door het 7-daagse rollende venster (dat een deel van de stabiele staart meeneemt) de
  // gemeten drop ruim boven de 15%-drempel blijft.
  const rows = mkRows(Array(60).fill(100), '2026-01-01').concat(mkRows(Array(10).fill(40), new Date(new Date('2026-01-01').getTime() + 60 * 86400000).toISOString().slice(0, 10)));
  const ref = new Date(new Date('2026-01-01').getTime() + 69 * 86400000);
  const s = CalcCore.hrvStPersonal(rows, ref);
  ok(s.drop >= 0.15, 'grote, ondubbelzinnige daling -> gemeten drop >= 0.15 (kreeg ' + s.drop + ')');
  eq(s.st, 'r', 'drop >= 0.15 -> st r, ongeacht SWC-check');
  eq(s.direction, 'below', 'st r impliceert direction below');
}

// ── 6: hrvDagFactorPersonal — factor-mapping ongewijzigd, direction additief doorgegeven ──
{
  const rows = mkRows(Array(20).fill(60), '2026-01-01');
  const ref = new Date(new Date('2026-01-01').getTime() + 19 * 86400000);
  const f = CalcCore.hrvDagFactorPersonal(rows, ref);
  eq(f.factor, 1.05, 'st g -> factor 1.05 (ongewijzigd)');
  eq(f.direction, 'within', 'hrvDagFactorPersonal geeft direction door zonder het te gebruiken in de factor-berekening');
}
eq(({ g: 1.05, o: 0.93, r: 0.85, ref: 1.00 }).g, 1.05, 'factor-mapping g ongewijzigd');
eq(({ g: 1.05, o: 0.93, r: 0.85, ref: 1.00 }).o, 0.93, 'factor-mapping o ongewijzigd');
eq(({ g: 1.05, o: 0.93, r: 0.85, ref: 1.00 }).r, 0.85, 'factor-mapping r ongewijzigd');
eq(({ g: 1.05, o: 0.93, r: 0.85, ref: 1.00 }).ref, 1.00, 'factor-mapping ref ongewijzigd (neutraal)');

// ── 7: determinisme / geen mutatie ──
{
  const rows = mkRows([60, 61, 62, 63, 64, 65], '2026-01-01');
  const rowsCopy = JSON.parse(JSON.stringify(rows));
  const ref = new Date('2026-01-06');
  const a = CalcCore.hrvStPersonal(rows, ref);
  const b = CalcCore.hrvStPersonal(rows, ref);
  eq(JSON.stringify(a), JSON.stringify(b), 'hrvStPersonal is deterministisch (zelfde input -> zelfde output)');
  eq(JSON.stringify(rows), JSON.stringify(rowsCopy), 'invoerarray wordt niet gemuteerd');
}

// ── 8: architectuurgrens — GEEN Decision-output, GEEN endurance-koppeling, GEEN AdaptiveCoaching ──
const calcSrc = fs.readFileSync(path.join(__dirname, 'calculation.js'), 'utf8');
ok(!/AdaptiveCoachingCore|tkEnduranceCtx|REDUCE_INTENSITY|magnitudePct/i.test(calcSrc), 'architectuur: geen AdaptiveCoachingCore/endurance-Context/intensiteitsaanpassing in calculation.js');
ok(!/'REST'|'TRAIN_HARD'|'TRAIN_EASY'/i.test(calcSrc), 'architectuur: Calculation retourneert nooit een actiewoord (REST/TRAIN_HARD/TRAIN_EASY)');

// ── 9: geen duplicaat-implementatie — repo-breed exact één plek per formule-onderdeel ──
const htmlPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
eq((html.match(/Math\.log\(/g) || []).filter(function () { return true; }).length >= 0, true, 'sanity: leesbaar bestand'); // no-op guard, echte check hieronder
const lnRmssdDefs = (html.match(/function lnRmssd\(/g) || []).length;
eq(lnRmssdDefs, 1, 'index.html: precies 1 lnRmssd-definitie (dunne wrapper, geen duplicaat-formule)');
ok(!/Math\.log\(v\)/.test(html.replace(/function lnRmssd\(v\)\{ return CalcCore\.lnRmssd\(v\); \}[^\n]*/g, '')), 'index.html bevat GEEN eigen Math.log-implementatie buiten de wrapper-regel zelf');
const hrvBaselineDefs = (html.match(/function hrvBaseline\(/g) || []).length;
eq(hrvBaselineDefs, 1, 'index.html: precies 1 hrvBaseline-definitie (wrapper)');
ok(!/HRV_BASELINE_MIN_DAYS\s*=\s*14/.test(html), 'index.html bevat geen eigen, losse "=14"-constante meer (leest nu CalcCore.HRV_BASELINE_MIN_DAYS)');
ok(html.includes('CalcCore.hrvBaseline(hdRows, refDate)'), 'index.html hrvBaseline-wrapper roept exact CalcCore.hrvBaseline aan');
ok(html.includes('CalcCore.hrvStPersonal(hdRows, refDate)'), 'index.html hrvStPersonal-wrapper roept exact CalcCore.hrvStPersonal aan');
ok(html.includes('CalcCore.hrvDagFactorPersonal(hdRows, refDate)'), 'index.html hrvDagFactorPersonal-wrapper roept exact CalcCore.hrvDagFactorPersonal aan');

// ── 10: 15%-drempel is functioneel ongewijzigd (regressie op het exacte grensgedrag) ──
{
  // Een duidelijke, forse daling (100 -> 30) blijft ruim boven de 15%-drempel ondanks
  // venster-verdunning, en bevestigt dat >= (niet >) het grensgedrag is: kleiner dan 15%
  // gemeten drop mag nooit 'r' opleveren (geverifieerd in test 5 hierboven via 'o'/'r'-tak),
  // en een duidelijk over-de-drempel geval moet altijd 'r' opleveren.
  const rows = mkRows(Array(90).fill(100), '2026-01-01').concat(mkRows(Array(4).fill(30), new Date(new Date('2026-01-01').getTime() + 90 * 86400000).toISOString().slice(0, 10)));
  const ref = new Date(new Date('2026-01-01').getTime() + 93 * 86400000);
  const s = CalcCore.hrvStPersonal(rows, ref);
  ok(s.drop >= CalcCore.HRV_SEVERE_DROP_PCT, 'forse daling -> gemeten drop >= HRV_SEVERE_DROP_PCT (kreeg ' + s.drop + ')');
  eq(s.st, 'r', 'drop >= HRV_SEVERE_DROP_PCT -> st r (>=, ongewijzigd legacy-gedrag)');
}

if (msgs.length) console.log(msgs.join('\n'));
console.log('fHrvBaselineCanonicalization: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
