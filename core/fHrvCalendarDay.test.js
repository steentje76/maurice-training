/* fHrvCalendarDay.test.js — de HRV-baseline telt KALENDERDAGEN, niet verstreken etmalen.
 *
 * BUG (productcode, core/calculation.js). hrv_log.date is een kalenderdatum (YYYY-MM-DD). De
 * baseline rekende echter met tijdstippen:
 *
 *     days = Math.round((ref - eersteMeting) / 86400000)      // ref = nu, mét kloktijd
 *
 * `new Date('YYYY-MM-DD')` is 00:00 UTC. Daardoor gaf dezelfde dataset op dezelfde kalenderdag
 * vóór 12:00 UTC N dagen en daarna N+1: de teller "nog X dagen tot je eigen baseline" versprong
 * midden op de dag, en de overgang referentie -> baseline (14 dagen) en voorlopig -> volledig
 * (28 dagen) vond een halve dag te vroeg plaats. Tussen 00:00 lokale tijd en 00:00 UTC viel de
 * meting van vandaag bovendien buiten de reeks (`r.date <= ref`), en het venster van
 * hrvRollingRecent sloot de meting van precies 7 dagen eerder wel in bij een ref op de datumgrens
 * (het vastgelegde contract) maar niet bij ref = nu.
 *
 * FIX. Eén pure helper zet elke datum om naar een kalenderdagnummer; alle vergelijkingen lopen
 * daarover. Geen drempel is gewijzigd (14 / 28 dagen, min. 4 metingen, SWC, 15%).
 *
 * Deze suite laadt de ECHTE core/calculation.js in een vm met een vervangen klok, en draait
 * zichzelf in drie tijdzones (UTC, Europe/Amsterdam, America/Los_Angeles).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ZONES = ['UTC', 'Europe/Amsterdam', 'America/Los_Angeles'];
if (!process.env.TK_CALDAY_CHILD) {
  let fout = 0, totaal = 0;
  ZONES.forEach(function (tz) {
    const r = spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { TZ: tz, TK_CALDAY_CHILD: '1' }), encoding: 'utf8' });
    const m = /KIND: (\d+) geslaagd, (\d+) mislukt/.exec(r.stdout || '');
    if (!m || r.status !== 0) { fout++; console.log('TZ ' + tz + ': MISLUKT\n' + (r.stdout || '') + (r.stderr || '')); }
    else { totaal += Number(m[1]); console.log('TZ ' + tz + ': ' + m[1] + ' geslaagd, 0 mislukt'); }
  });
  console.log('fHrvCalendarDay: ' + totaal + ' geslaagd in ' + ZONES.length + ' tijdzones, ' + fout + ' tijdzone(s) mislukt');
  console.log('Resultaat: ' + totaal + ' geslaagd, ' + fout + ' mislukt');
  process.exit(fout ? 1 : 0);
}

/* ── kindproces: één tijdzone ─────────────────────────────────────────────── */
const SRC = fs.readFileSync(path.join(__dirname, 'calculation.js'), 'utf8');
let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }

// De echte core, met `new Date()` vastgezet op een gekozen lokaal moment.
function coreOp(y, m, d, uur, min) {
  const nu = new Date(y, m - 1, d, uur, min, 0, 0).getTime();
  class Klok extends Date {
    constructor(...a) { if (a.length === 0) super(nu); else super(...a); }
    static now() { return nu; }
  }
  const sb = { Date: Klok, Math: Math, module: { exports: {} } };
  vm.createContext(sb);
  vm.runInContext(SRC, sb);
  return sb.module.exports;
}
const pad = (x) => ('0' + x).slice(-2);
// Kalenderdatum + n dagen, zuiver op de kalender (geen klok, geen tijdzone).
function plus(ymd, n) { const p = ymd.split('-').map(Number); const t = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
// n metingen op opeenvolgende kalenderdagen vanaf `start`.
function reeks(start, n, waarde) { const uit = []; for (let i = 0; i < n; i++) uit.push({ date: plus(start, i), hrv: typeof waarde === 'function' ? waarde(i) : (waarde || 50 + (i % 5)) }); return uit; }
const KLOK = [[0, 1], [6, 0], [11, 59], [12, 1], [18, 0], [23, 59]];
const kern = (b) => [b.ready, b.fase, b.n, b.days, b.ready ? Math.round(b.meanRaw * 1000) / 1000 : null];
const status = (s) => [s.st, s.direction, s.baseline.days, s.baseline.fase, s.recent ? [s.recent.n, s.recent.bron, Math.round(s.recent.meanRaw * 1000) / 1000] : null];

/* ══ A. Zelfde kalenderdag, zes kloktijden: identieke uitkomst (default ref = nu) ═ */
[
  ['dag 9 (referentie)', '2026-10-06', reeks('2026-09-27', 10), 9, false, 'referentie'],
  ['dag 13 (dag vóór de grens)', '2026-10-06', reeks('2026-09-23', 14), 13, false, 'referentie'],
  ['dag 14 (grens)', '2026-10-06', reeks('2026-09-22', 15), 14, true, 'voorlopig'],
  ['dag 27 (dag vóór volledig)', '2026-10-06', reeks('2026-09-09', 28), 27, true, 'voorlopig'],
  ['dag 28 (volledig)', '2026-10-06', reeks('2026-09-08', 29), 28, true, 'volledig']
].forEach(function (c) {
  const p = c[1].split('-').map(Number);
  const uit = KLOK.map(function (k) { const C = coreOp(p[0], p[1], p[2], k[0], k[1]); return [kern(C.hrvBaseline(c[2])), status(C.hrvStPersonal(c[2])), C.hrvDagFactorPersonal(c[2]).factor]; });
  ok(uit.every(function (u) { return JSON.stringify(u) === JSON.stringify(uit[0]); }), 'A ' + c[0] + ': baseline, HRV-status en factor zijn gelijk om 00:01, 06:00, 11:59, 12:01, 18:00 en 23:59 (kreeg days ' + JSON.stringify(uit.map(function (u) { return u[0][3]; })) + ', ready ' + JSON.stringify(uit.map(function (u) { return u[0][0]; })) + ')');
  eq([uit[0][0][3], uit[0][0][0], uit[0][0][1], uit[0][0][2]], [c[3], c[4], c[5], c[2].length], 'A ' + c[0] + ': days ' + c[3] + ', ready ' + c[4] + ', fase ' + c[5] + ' — de meting van vandaag telt mee');
});

/* ══ B. Expliciete refDate: de kloktijd in de waarde doet er niet toe ═════════ */
{
  const C = coreOp(2030, 1, 1, 12, 0);       // 'nu' ligt bewust ver weg: mag geen rol spelen
  const rows = reeks('2026-09-22', 15);
  const verwacht = kern(C.hrvBaseline(rows, '2026-10-06'));
  eq(verwacht, [true, 'voorlopig', 15, 14, verwacht[4]], 'B1 ref als datumtekst: 14 kalenderdagen, voorlopig');
  ['2026-10-06T00:01:00', '2026-10-06T11:59:59', '2026-10-06T12:00:01', '2026-10-06T23:59:59', '2026-10-06T23:59:59Z', '2026-10-06T00:00:00+14:00', '2026-10-06T23:59:59-12:00'].forEach(function (t) {
    eq(kern(C.hrvBaseline(rows, t)), verwacht, 'B2 ref ' + t + ': de geschreven kalenderdatum telt, niet het tijdstip of de offset');
  });
  KLOK.forEach(function (k) {
    eq(kern(C.hrvBaseline(rows, new Date(2026, 9, 6, k[0], k[1]))), verwacht, 'B3 ref als Date om ' + pad(k[0]) + ':' + pad(k[1]) + ' lokaal: zelfde kalenderdag, zelfde uitkomst');
    eq(status(C.hrvStPersonal(rows, new Date(2026, 9, 6, k[0], k[1]))), status(C.hrvStPersonal(rows, '2026-10-06')), 'B3b en dezelfde HRV-status om ' + pad(k[0]) + ':' + pad(k[1]));
  });
  eq(kern(C.hrvBaseline(rows, new Date('2026-10-06'))), verwacht, 'B4 ref als Date op de datumgrens (new Date("YYYY-MM-DD")): die kalenderdatum, in elke tijdzone');
  eq(kern(C.hrvBaseline(rows, new Date(2026, 9, 6, 15, 30).getTime())), verwacht, 'B5 ref als tijdstempel (getal): lokale kalenderdag');
  eq([C.hrvBaseline(rows, 'geen datum').n, C.hrvBaseline(rows, new Date(NaN)).n], [0, 0], 'B6 onleesbare ref: geen reeks, geen verzonnen dag');
}

/* ══ C. Grenzen, exact volgens het bestaande contract ═════════════════════════ */
{
  const C = coreOp(2030, 1, 1, 12, 0);
  const B = (start, n, ref) => { const b = C.hrvBaseline(reeks(start, n), ref); return [b.days, b.ready, b.fase]; };
  eq([B('2026-03-01', 14, '2026-03-14'), B('2026-03-01', 15, '2026-03-15')], [[13, false, 'referentie'], [14, true, 'voorlopig']], 'C1 13 kalenderdagen: niet ready; exact 14: ready/voorlopig');
  eq(C.hrvBaseline(reeks('2026-03-01', 3).concat([{ date: '2026-03-15', hrv: 0 }]), '2026-03-15').ready, false, 'C2 14 dagen maar minder dan 4 geldige metingen: niet ready (min. N ongewijzigd)');
  eq([B('2026-03-01', 28, '2026-03-28'), B('2026-03-01', 29, '2026-03-29')], [[27, true, 'voorlopig'], [28, true, 'volledig']], 'C3 27 dagen: voorlopig; exact 28: volledig');
  eq([B('2026-01-25', 10, '2026-02-08'), B('2026-04-20', 10, '2026-05-04')], [[14, true, 'voorlopig'], [14, true, 'voorlopig']], 'C4 over een maandgrens (31 en 30 dagen): 14 kalenderdagen');
  eq(B('2025-12-25', 10, '2026-01-08'), [14, true, 'voorlopig'], 'C5 over de jaargrens: 14 kalenderdagen');
  eq([B('2028-02-20', 10, '2028-03-05'), B('2027-02-20', 10, '2027-03-06')], [[14, true, 'voorlopig'], [14, true, 'voorlopig']], 'C6 schrikkeldag: 20 feb -> 5 mrt (2028) en 20 feb -> 6 mrt (2027) zijn elk 14 kalenderdagen');
  // zomer-/wintertijd: een dag van 23 of 25 uur telt als één kalenderdag
  eq([B('2026-03-20', 10, '2026-04-03'), B('2026-10-18', 10, '2026-11-01'), B('2026-03-01', 10, '2026-03-15'), B('2026-10-25', 10, '2026-11-08')], [[14, true, 'voorlopig'], [14, true, 'voorlopig'], [14, true, 'voorlopig'], [14, true, 'voorlopig']], 'C7 over de EU- en VS-klokwissels (29 mrt, 25 okt, 8 mrt, 1 nov 2026): telkens exact 14');
  [['2026-03-29', 2026, 3, 29], ['2026-10-25', 2026, 10, 25], ['2026-03-08', 2026, 3, 8], ['2026-11-01', 2026, 11, 1]].forEach(function (d) {
    const rows = reeks(plus(d[0], -14), 15);
    const uit = KLOK.concat([[1, 30], [2, 30], [3, 30]]).map(function (k) { return kern(coreOp(d[1], d[2], d[3], k[0], k[1]).hrvBaseline(rows)); });
    ok(uit.every(function (u) { return JSON.stringify(u) === JSON.stringify(uit[0]); }) && uit[0][3] === 14 && uit[0][0] === true, 'C8 op de klokwisseldag ' + d[0] + ' zelf: 14 dagen en ready op elk tijdstip, ook rond 02:00');
  });
  eq(C.hrvBaseline([{ date: '2026-03-01', hrv: 50 }, { date: '2026-03-16', hrv: 51 }, { date: '2026-03-20', hrv: 52 }], '2026-03-15').n, 1, 'C9 metingen ná de referentiedag tellen niet mee');
  eq(C.hrvBaseline([{ date: '2026-03-15T07:30:00+02:00', hrv: 50 }, { date: '2026-02-30', hrv: 50 }, { date: 'x', hrv: 50 }, { date: null, hrv: 50 }], '2026-03-15').n, 1, 'C10 een rijdatum met tijdstempel telt op haar kalenderdatum; een onbestaande of onleesbare datum telt niet');
  const ongeraakt = reeks('2026-03-01', 15); const kopie = JSON.stringify(ongeraakt); C.hrvBaseline(ongeraakt, '2026-03-15');
  ok(JSON.stringify(ongeraakt) === kopie, 'C11 de invoer wordt niet gemuteerd');
}

/* ══ D. Het 7-daagse venster: t/m 7 kalenderdagen terug, grens inclusief ═════ */
// Bestaand contract (fHrvBaselineCanonicalization): "meting exact 7 dagen vóór refDate telt mee".
// Vóór de fix gold dat alleen bij een ref op de datumgrens; bij ref = nu (met kloktijd) viel
// diezelfde meting buiten het venster. Nu geldt het contract op elk tijdstip.
{
  const C = coreOp(2030, 1, 1, 12, 0);
  const R = (rows, ref) => { const r = C.hrvRollingRecent(rows, ref); return r ? [r.n, r.bron, r.meanRaw] : null; };
  const negen = reeks('2026-05-02', 9, (i) => 40 + i);                   // 2 t/m 10 mei
  eq(R(negen, '2026-05-10'), [8, '7d-gemiddelde', 44.5], 'D1 de meting van precies 7 dagen eerder (3 mei) telt mee; die van 8 dagen eerder (2 mei) niet');
  eq(R([{ date: '2026-05-02', hrv: 40 }, { date: '2026-05-03', hrv: 41 }, { date: '2026-05-04', hrv: 42 }, { date: '2026-05-05', hrv: 43 }], '2026-05-10'), [1, 'laatste meting', 43], 'D2 minder dan 4 metingen in het venster: terugval op de laatste meting (ongewijzigd)');
  const uit = KLOK.map(function (k) { const K = coreOp(2026, 5, 10, k[0], k[1]); const r = K.hrvRollingRecent(negen); return [r.n, r.bron, r.meanRaw]; });
  ok(uit.every(function (u) { return JSON.stringify(u) === JSON.stringify([8, '7d-gemiddelde', 44.5]); }), 'D3 default ref = nu: hetzelfde venster op elk tijdstip van de dag (kreeg n ' + JSON.stringify(uit.map(function (u) { return u[0]; })) + ')');
  KLOK.forEach(function (k) { eq(R(negen, new Date(2026, 4, 10, k[0], k[1])), [8, '7d-gemiddelde', 44.5], 'D4 ref als Date om ' + pad(k[0]) + ':' + pad(k[1]) + ': zelfde venster als de datumtekst'); });
  eq([R([], '2026-05-10'), R([{ date: '2026-05-11', hrv: 50 }], '2026-05-10')], [null, null], 'D5 geen metingen t/m de referentiedag: null');
}

/* ══ E. Drempels en formules zijn niet aangeraakt ═════════════════════════════ */
{
  const C = coreOp(2030, 1, 1, 12, 0);
  eq([C.HRV_BASELINE_MIN_DAYS, C.HRV_BASELINE_FULL_DAYS, C.HRV_BASELINE_MIN_N], [14, 28, 4], 'E1 14 / 28 dagen en minimaal 4 metingen ongewijzigd');
  const rows = reeks('2026-01-01', 30, (i) => 50 + (i % 7));
  const b = C.hrvBaseline(rows, '2026-01-30');
  const ln = rows.map((r) => Math.log(r.hrv)); const gem = ln.reduce((s, v) => s + v, 0) / ln.length;
  const sd = Math.sqrt(ln.reduce((s, v) => s + Math.pow(v - gem, 2), 0) / ln.length);
  ok(Math.abs(b.meanLn - gem) < 1e-12 && Math.abs(b.sdLn - sd) < 1e-12 && Math.abs(b.swc - 0.5 * sd) < 1e-12 && b.days === 29 && b.fase === 'volledig', 'E2 gemiddelde, SD en SWC (0,5 x SD) van de baseline zijn rekenkundig ongewijzigd');
  const laag = rows.concat(reeks('2026-01-31', 5, 30));
  eq([C.hrvStPersonal(laag, '2026-02-04').st, C.hrvDagFactorPersonal(laag, '2026-02-04').factor, C.hrvDagFactorPersonal(rows, '2026-01-30').factor], ['r', 0.85, C.hrvDagFactorPersonal(rows, '2026-01-30').factor], 'E3 sterke daling geeft nog steeds st r / factor 0.85');
  ok(!/Math\.round\(\(ref - rows\[0\]\.date\) \/ 86400000\)/.test(SRC), 'E4 de etmaal-afronding is uit de baseline verdwenen');
}

console.log('KIND: ' + pass + ' geslaagd, ' + fail + ' mislukt' + (msgs.length ? '\n' + msgs.join('\n') : ''));
process.exit(fail ? 1 : 0);
