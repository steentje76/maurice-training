/* fHealthSeriesProvenance.test.js — GAP-P2-018 R6: de bron in healthSeries() is per veld.
 *
 * VOOR: healthSeries() bepaalde de bron uit de rij-brede [src:...]-tag in note. Een wearable-sync
 * zet die tag op de hele rij, dus een handmatig ingevulde rusthartslag op een dag met een
 * wearable-HRV kreeg de bron 'Fitbit'. pickLatestMetric()/bodyMetricsFromLog() lazen de bron al
 * uit de canonieke per-veld kolom (<veld>_source) met de tag als terugval.
 *
 * NA: healthSeries() gebruikt dezelfde volgorde: eerst <veld>_source, dan pas de legacy-tag voor
 * historische rijen waar die kolom leeg is. Alleen de bron verandert; de waarden niet.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const DC = require('./deviceIntegration.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }

const END = '2026-10-04';
const bron = (rows, veld, datum) => (DC.healthSeries(rows, veld, END, 10).find((p) => p.date === datum) || {}).source;
const waarde = (rows, veld, datum) => (DC.healthSeries(rows, veld, END, 10).find((p) => p.date === datum) || {}).value;

/* ── A. Volgorde: per-veld kolom boven de legacy-tag ─────────────────────── */
eq(bron([{ date: '2026-10-01', hrv: 50, hrv_source: 'wearable', note: 'eigen notitie' }], 'hrv', '2026-10-01'), 'Fitbit', 'A1 hrv_source=wearable + note zonder tag -> wearable (Fitbit)');
eq(bron([{ date: '2026-10-01', hrv: 50, hrv_source: 'wearable', note: '[src:manual]' }], 'hrv', '2026-10-01'), 'Fitbit', 'A1b hrv_source=wearable + tegengestelde tag -> de kolom wint');
eq(bron([{ date: '2026-10-01', hrv: 50, hrv_source: 'manual', note: '[src:fitbit]' }], 'hrv', '2026-10-01'), 'Check-in', 'A2 hrv_source=manual + note fitbit -> manual (Check-in); de rij-brede tag wint niet meer');
eq(bron([{ date: '2026-10-01', hrv: 50, hrv_source: null, note: '[src:fitbit]' }], 'hrv', '2026-10-01'), 'Fitbit', 'A3 hrv_source leeg + legacy-tag fitbit -> terugval op de tag (Fitbit)');
eq(bron([{ date: '2026-10-01', hrv: 50, note: 'x [src:google_health]' }], 'hrv', '2026-10-01'), 'Google Health', 'A3b kolom afwezig + legacy-tag google_health -> ongewijzigd label');
const gemengd = [{ date: '2026-10-01', hrv: 50, hrv_source: 'wearable', rhr: 58, rhr_source: 'manual', sleep: 7.5, sleep_source: 'manual', steps: 9000, steps_source: 'wearable', note: '[src:fitbit]' }];
eq(['hrv', 'rhr', 'sleep', 'steps'].map((v) => bron(gemengd, v, '2026-10-01')), ['Fitbit', 'Check-in', 'Check-in', 'Fitbit'], 'A4 gemengde rij: HRV en stappen wearable, rusthartslag en slaap handmatig -> bron per metric');
eq([bron([{ date: '2026-10-01', hrv: 50, hrv_source: null, note: null }], 'hrv', '2026-10-01'), bron([{ date: '2026-10-01', hrv: 50 }], 'hrv', '2026-10-01')], ['Check-in', 'Check-in'], 'A5 geen kolom en geen tag -> bestaand contract (Check-in)');
eq(bron([{ date: '2026-10-01', hrv: 50, hrv_source: 'unknown', note: '[src:fitbit]' }], 'hrv', '2026-10-01'), null, 'A5b hrv_source=unknown -> bron null: een expliciet onbekende bron wordt geen Fitbit of Check-in');
eq(DC.sourceKind(bron([{ date: '2026-10-01', hrv: 50, hrv_source: 'unknown' }], 'hrv', '2026-10-01')), 'unknown', 'A5c en telt daarna als herkomst unknown, niet als gemeten');
eq(bron([{ date: '2026-10-01', hrv: 50, hrv_source: 'wearable', rhr: null, rhr_source: 'manual' }], 'rhr', '2026-10-01'), null, 'A6 geen waarde -> geen bron, ook al staat er een sourcekolom');
eq(bron(gemengd, 'hrv', '2026-10-03'), null, 'A7 dag zonder rij -> bron null (gat blijft gat)');

/* ── B. Zelfde volgorde als pickLatestMetric / bodyMetricsFromLog ────────── */
[
  { hrv: 50, hrv_source: 'wearable', note: null },
  { hrv: 50, hrv_source: 'manual', note: '[src:fitbit]' },
  { hrv: 50, hrv_source: null, note: '[src:fitbit]' },
  { hrv: 50, hrv_source: null, note: null }
].forEach((r, i) => {
  const rows = [Object.assign({ date: '2026-10-02' }, r)];
  eq(bron(rows, 'hrv', '2026-10-02'), DC.pickLatestMetric(rows, 'hrv').source, 'B' + (i + 1) + ' healthSeries en pickLatestMetric geven dezelfde bron voor ' + JSON.stringify(r));
});
const bm = DC.bodyMetricsFromLog(gemengd);
eq([bron(gemengd, 'hrv', '2026-10-01'), bron(gemengd, 'rhr', '2026-10-01'), bron(gemengd, 'sleep', '2026-10-01')], [bm.hrv.source, bm.rhr.source, bm.sleep.source], 'B5 gemengde rij: reeks en nieuwste-meting-beeld zijn het eens per metric');

/* ── C. Waarden, trend en statistiek zijn ongewijzigd ────────────────────── */
const reeks = [];
for (let i = 0; i < 10; i++) {
  const d = '2026-09-' + String(25 + i > 30 ? 25 + i - 30 : 25 + i).padStart(2, '0');
  const datum = (25 + i > 30) ? '2026-10-' + String(25 + i - 30).padStart(2, '0') : d;
  reeks.push({ date: datum, hrv: 44 + ((i * 7) % 9), hrv_source: i % 2 ? 'wearable' : 'manual', rhr: 54 + (i % 4), rhr_source: i % 3 ? 'manual' : 'wearable', sleep: 6.5 + (i % 3) * 0.5, sleep_source: null, note: i % 2 ? '[src:fitbit]' : null });
}
const zonderKolommen = reeks.map((r) => ({ date: r.date, hrv: r.hrv, rhr: r.rhr, sleep: r.sleep, note: r.note }));
['hrv', 'rhr', 'sleep'].forEach((v) => {
  const metK = DC.healthSeries(reeks, v, END, 10), zonderK = DC.healthSeries(zonderKolommen, v, END, 10);
  eq(metK.map((p) => [p.date, p.value]), zonderK.map((p) => [p.date, p.value]), 'C1 ' + v + ': datums en waarden zijn identiek met en zonder sourcekolommen');
  eq([DC.healthTrend(metK), DC.healthStats(metK), DC.healthSummary(metK)], [DC.healthTrend(zonderK), DC.healthStats(zonderK), DC.healthSummary(zonderK)], 'C2 ' + v + ': trend, statistiek en samenvatting zijn identiek');
  eq(metK.map((p) => p.value), reeks.map((r) => r[v]), 'C3 ' + v + ': elke dag draagt exact de opgeslagen waarde');
});
ok(DC.healthSeries(reeks, 'rhr', END, 10).some((p, i) => p.source !== DC.healthSeries(zonderKolommen, 'rhr', END, 10)[i].source), 'C4 alleen de bron verschilt waar de kolom iets anders zegt dan de tag');

/* ── D. Twee rijen op één dag (historisch): wearable wint nog steeds ─────── */
eq([waarde([{ date: '2026-10-02', hrv: 40, hrv_source: 'manual' }, { date: '2026-10-02', hrv: 48, hrv_source: 'wearable' }], 'hrv', '2026-10-02'),
    waarde([{ date: '2026-10-02', hrv: 48, hrv_source: 'wearable' }, { date: '2026-10-02', hrv: 40, hrv_source: 'manual' }], 'hrv', '2026-10-02'),
    waarde([{ date: '2026-10-02', hrv: 40 }, { date: '2026-10-02', hrv: 48, note: '[src:fitbit]' }], 'hrv', '2026-10-02')], [48, 48, 48], 'D1 wearable wint van check-in, ongeacht de volgorde en via kolom of legacy-tag');
eq(waarde([{ date: '2026-10-02', hrv: 40, hrv_source: 'manual' }, { date: '2026-10-02', hrv: 41, hrv_source: 'manual' }], 'hrv', '2026-10-02'), 40, 'D2 binnen dezelfde bron geen stille overschrijving (eerste blijft)');

/* ── E. Bron en architectuur ─────────────────────────────────────────────── */
const src = fs.readFileSync(path.join(__dirname, 'deviceIntegration.js'), 'utf8');
const hs = src.slice(src.indexOf('function healthSeries('), src.indexOf('function healthTrend('));
ok(/r\[field \+ '_source'\]/.test(hs) && /kolomBron \? kolomBron : _parseSrcTag\(r\.note\)/.test(hs), 'E1 healthSeries: kolom eerst, tag als terugval (zelfde uitdrukking als pickLatestMetric)');
ok(/kolomBron \? kolomBron : _parseSrcTag\(r\.note\)/.test(src.slice(src.indexOf('function pickLatestMetric('), src.indexOf('function bodyMetricsFromLog('))), 'E2 pickLatestMetric gebruikt dezelfde volgorde');
ok(!/hrv_source|rhr_source|sleep_source|steps_source/.test(hs.replace(/\/\/.*$/gm, '')), 'E3 geen metricnamen in de code: de kolom is generiek <veld>_source');

console.log('fHealthSeriesProvenance: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
