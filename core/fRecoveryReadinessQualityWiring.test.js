/* fRecoveryReadinessQualityWiring.test.js — GAP-P2-015: bestaande datakwaliteit doorgeven aan
 * de herstel-/readinessketen.
 *
 * VOOR deze wijziging las de keten hrv_log-rijen rauw:
 *   hrv_log -> hd[0] / hrvDagFactorPersonal(hd) / rhrBaselineDelta(hd) -> dagfactor -> recoveryScore
 *           -> readinessDay({hrv:{waarde}})            (zonder kwaliteit: het filter deed niets)
 * Een waarde buiten het brondata-contract rekende volledig mee, en een dagfactor zonder enige
 * invoer (1.00) telde als aanwezige herstelcomponent.
 *
 * NA: één keuringspunt (index.html tkHealthQualified -> DeviceCore.qualifyHealthRows), dat
 * uitsluitend de BESTAANDE lagen aanroept (dataquality.v1 + observation.v1).
 *
 * Productbesluiten DEC-DQ-001 (4 oktober 2026), hier vastgepind:
 *   - stale (7+ dagen) telt niet als actueel signaal voor vandaag; de historie blijft staan;
 *   - sync-status is geen meetgeldigheid en is geen invoer van de keten;
 *   - extreme_uitschieter binnen het contract blijft meetellen (en blijft gemarkeerd);
 *   - valt de keuringslaag weg, dan gaan HRV/RHR/slaap NIET rauw de berekening in (fail-closed).
 *
 * Deze suite draait op de ECHTE functies: ze worden uit index.html gehaald en met de echte
 * cores uitgevoerd. Alleen de datatoegang (v43SafeGet/sbGet/spierherstel) is vervangen.
 * Datums zijn relatief aan vandaag, omdat CalcCore.hrvBaseline zonder refDate met 'nu' rekent.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CalcCore = require('./calculation.js');
const DecisionCore = require('./decision.js');
const DeviceCore = require('./deviceIntegration.js');
const CoachingCore = require('./coaching.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }

function extractFn(src, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('functie niet gevonden in index.html: ' + name);
  let i = src.indexOf('{', m.index), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return src.slice(m.index, i + 1); } }
  throw new Error('functie niet afgesloten: ' + name);
}
const NAMEN = ['td', 'tkSleepHours', 'lnRmssd', 'hrvBaseline', 'hrvRollingRecent', 'hrvStPersonal', 'hrvDagFactorPersonal',
  'slaapDagFactor', 'cyclusDagFactor', 'tkCyclusFaseVandaag', 'tkHealthFailClosed', 'tkHealthQualified', 'tkSignaalOnbetrouwbaar', 'tkRhrDeltaHerstel', 'dagfactor',
  'tkDagfactorHeeftBasis', 'tkDagfactorVoorAdvies', 'tkCheckinVandaag', 'tkSpierherstelEvidence', 'recoveryScoreFrom', 'rhrBaselineDelta', 'todayPainMuscle', 'recoveryAdjustmentForToday',
  'computeProgAdjustment', 'v43GereedheidScore', 'tkReadinessVandaag'];
const PROD = NAMEN.map(function (n) { return extractFn(HTML, n); }).join('\n');

function runtime(state, opts) {
  opts = opts || {};
  const calls = [];
  const sb = {
    console: console, window: { _tkLichSync: state.sync || null },
    CalcCore: CalcCore, CoachingCore: CoachingCore,
    DecisionCore: Object.assign({}, DecisionCore, { readinessDay: function (inp) { calls.push(JSON.parse(JSON.stringify(inp))); return DecisionCore.readinessDay(inp); } }),
    v43SafeGet: async function (t) { return t === 'hrv_log' ? state.hd : (t === 'sessions' ? (state.sessions || []) : []); },
    sbGet: async function (t) { return t === 'hrv_log' ? state.hd : []; },
    getRelevantMuscleRecovery: async function () { return state.recRows || []; }
  };
  if (opts.deviceCore !== undefined) { if (opts.deviceCore) sb.DeviceCore = opts.deviceCore; }
  else sb.DeviceCore = DeviceCore;
  vm.createContext(sb); vm.runInContext(PROD, sb);
  sb.__calls = calls;
  return sb;
}
// De dagfactor zoals refreshHome hem berekent (zie sectie G voor de bronbinding). refreshHome geeft hem
// door als dfInfo MET `basis`; dat de basis onderweg behouden blijft bewaakt sectie G hieronder en, op de
// echte Home-flow, core/fHomeDagfactorBasisSafety.test.js (DEC-DQ-002).
function homeDf(sb, hdRuw) {
  const hq = sb.tkHealthQualified(hdRuw); const hd = hq.rows; const lh = hd[0];
  return lh ? sb.dagfactor(sb.hrvDagFactorPersonal(hd), lh.sleep, sb.tkCyclusFaseVandaag(lh), hq.signalen) : null;
}
async function draai(state, opts) {
  const sb = runtime(state, opts);
  const df = homeDf(sb, state.hd);
  await sb.tkReadinessVandaag(df, state.recRows || [], null);
  const b = sb.window._tkReadiness;
  const adj = await sb.recoveryAdjustmentForToday(['borst'], {});
  return { sb: sb, df: df, besluit: b, herstel: b.herstel, start: adj, signalen: sb.__calls[0].signalen, aanroepen: sb.__calls.length };
}
// Het OUDE gedrag, uitgedrukt met dezelfde (ongewijzigde) canonieke functies op RAUWE rijen.
function legacy(sb, hd, recRows) {
  const lh = hd[0];
  const factor = lh ? CalcCore.calculateDayFactor({ hrvFactor: CalcCore.hrvDagFactorPersonal(hd).factor, sleepHours: CalcCore.normalizeSleepHours(lh.sleep), cyclePhase: lh.cyclus_fase }) : null;
  const input = {};
  if (typeof factor === 'number') input.dayFactor = factor;
  const pcts = (recRows || []).map(function (r) { return r.pct; });
  if (pcts.length) input.muscleRecoveryPct = Math.round(pcts.reduce(function (a, c) { return a + c; }, 0) / pcts.length);
  const d = sb.rhrBaselineDelta(hd); if (typeof d === 'number') input.rhrDelta = d;
  return { factor: factor, herstel: CalcCore.recoveryScore(input) };
}

function dag(n) { const d = new Date(); d.setDate(d.getDate() - n); const p = function (x) { return ('0' + x).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function reeks(n, bron, start) {
  const uit = [];
  for (let i = (start || 0); i < n + (start || 0); i++) {
    uit.push({ date: dag(i), hrv: 50 + ((i * 7) % 9) - 4, hrv_source: bron, rhr: 55 + ((i * 3) % 5) - 2, rhr_source: bron,
      sleep: 7.5 - ((i % 4) * 0.25), sleep_source: bron, cyclus_fase: null, note: null });
  }
  return uit;
}
const kloon = function (x) { return JSON.parse(JSON.stringify(x)); };
const REC = [{ pct: 80 }, { pct: 70 }];
const VANDAAG = dag(0);

async function main() {
  /* ══ A. De brug zelf (DeviceCore.qualifyHealthRows) ══════════════════════ */
  {
    const rows = reeks(6, 'wearable');
    const q = DeviceCore.qualifyHealthRows(rows, { today: VANDAAG, sync: null, sleepHours: CalcCore.normalizeSleepHours });
    ok(q.version === 'healthinput.v1' && q.rows.length === 6 && q.rows.every(function (r, i) { return r === rows[i]; }), 'A1 geldige rijen komen als DEZELFDE objecten terug (geen kopie, geen wijziging)');
    eq([q.signalen.hrv.kwaliteit, q.signalen.rhr.kwaliteit, q.signalen.slaap.kwaliteit], ['current', 'current', 'current'], 'A2 geldige, verse metingen: bestaande status current');
    eq(q.uitgesloten, [], 'A3 niets uitgesloten bij geldige invoer');
  }
  {
    const rows = reeks(6, 'wearable'); rows[0].hrv = 450; rows[1].rhr = 150; rows[2].sleep = 2000; rows[3].hrv = -5; rows[4].rhr = 'veel';
    const voor = kloon(rows);
    const q = DeviceCore.qualifyHealthRows(rows, { today: VANDAAG, sleepHours: CalcCore.normalizeSleepHours });
    eq([q.rows[0].hrv, q.rows[1].rhr, q.rows[2].sleep, q.rows[3].hrv, q.rows[4].rhr], [null, null, null, null, null], 'A4 buiten contract (HRV 450, RHR 150, slaap 2000 min = 33u), negatief en niet-numeriek worden null');
    eq(q.uitgesloten.map(function (u) { return u.veld + ':' + u.reason; }).sort(), ['hrv:buiten_contract', 'hrv:buiten_contract', 'rhr:buiten_contract', 'rhr:niet_numeriek', 'sleep:buiten_contract'], 'A5 elke uitsluiting draagt de reden uit dataquality.v1');
    eq(rows, voor, 'A6 de invoer wordt niet gemuteerd');
    eq([q.rows[0].hrv_source, q.rows[0].rhr, q.rows[0].sleep, q.rows[1].rhr_source], ['wearable', rows[0].rhr, rows[0].sleep, 'wearable'], 'A7 provenance en de overige velden van dezelfde rij blijven onaangeroerd');
    ok(q.rows[5] === rows[5], 'A8 een rij zonder uitgesloten waarde blijft hetzelfde object');
  }
  {
    // kwaliteit hangt niet af van de bron, en de bron niet van de kwaliteit
    const a = reeks(5, 'wearable'), b = reeks(5, 'manual'), c = reeks(5, 'unknown');
    [a, b, c].forEach(function (r) { r[0].hrv = 450; });
    const uit = [a, b, c].map(function (r) { const q = DeviceCore.qualifyHealthRows(r, { today: VANDAAG }); return [q.rows[0].hrv, q.rows[1].hrv, q.signalen.hrv.kwaliteit, q.signalen.hrv.bron]; });
    eq(uit.map(function (u) { return u.slice(0, 3); }), [[null, a[1].hrv, 'current'], [null, a[1].hrv, 'current'], [null, a[1].hrv, 'current']], 'A9 dezelfde waarde krijgt dezelfde kwaliteit bij bron wearable, manual en unknown');
    eq(uit.map(function (u) { return u[3]; }), ['wearable', 'manual', 'unknown'], 'A10 de bron wordt ongewijzigd meegedragen');
  }
  {
    const q = DeviceCore.qualifyHealthRows([{ date: VANDAAG, hrv: null, rhr: null, sleep: null }], { today: VANDAAG });
    eq([q.signalen.hrv.kwaliteit, q.signalen.rhr.kwaliteit, q.signalen.slaap.kwaliteit], ['no_data', 'no_data', 'no_data'], 'A11 geen meting -> no_data, nooit een positieve status');
    const leeg = DeviceCore.qualifyHealthRows(null, {});
    eq([leeg.rows, leeg.signalen.hrv.kwaliteit], [[], 'no_data'], 'A12 lege/ongeldige invoer is veilig');
    const oudeRijen = reeks(5, 'wearable', 10);
    const oud = DeviceCore.qualifyHealthRows(oudeRijen, { today: VANDAAG });
    eq([oud.signalen.hrv.kwaliteit, oud.signalen.hrv.versheid, oud.uitgesloten.length], ['stale', 'stale', 0], 'A13 een meting van 10 dagen oud krijgt de bestaande status stale');
    ok(oud.rows.every(function (r, i) { return r === oudeRijen[i]; }), 'A13b en blijft onaangeroerd in de rijen staan (stale voor vandaag is niet historisch ongeldig)');
    eq([6, 7].map(function (n) { return DeviceCore.qualifyHealthRows(reeks(3, 'wearable', n), { today: VANDAAG }).signalen.hrv.kwaliteit; }), ['current', 'stale'], 'A13c de grens is de bestaande van observation.v1: 6 dagen recent, 7 dagen stale (FRESHNESS_RECENT_DAYS=' + DeviceCore.FRESHNESS_RECENT_DAYS + ')');
    const zonderDatum = DeviceCore.qualifyHealthRows(reeks(5, 'wearable'), {});
    ok(zonderDatum.signalen.hrv.versheid === 'unknown', 'A14 zonder today wordt geen versheid verzonnen (unknown)');
    const sf = { status: 'sync_failed' };
    const metSync = DeviceCore.qualifyHealthRows(reeks(5, 'wearable'), { today: VANDAAG, sync: sf });
    const zonderSync = DeviceCore.qualifyHealthRows(reeks(5, 'wearable'), { today: VANDAAG });
    eq(metSync, zonderSync, 'A15 sync-status is geen invoer van de brug: zelfde rijen, zelfde uitkomst');
    eq(metSync.signalen.hrv.kwaliteit, 'current', 'A16 een actuele, geldige opgeslagen meting blijft current bij een mislukte sync');
    const obs = DeviceCore.observation(reeks(5, 'wearable').reverse().map(function (r) { return { date: r.date, value: r.hrv, source: r.hrv_source }; }), { today: VANDAAG });
    eq([DeviceCore.observationQuality(obs, sf), DeviceCore.observationQuality(obs, null)], ['sync_failed', 'current'], 'A17 de sync-status blijft apart zichtbaar voor UI/observability via observationQuality(obs, sync)');
    const min = DeviceCore.qualifyHealthRows([{ date: VANDAAG, sleep: 420, sleep_source: 'manual' }], { today: VANDAAG, sleepHours: CalcCore.normalizeSleepHours });
    eq([min.rows[0].sleep, min.uitgesloten.length], [420, 0], 'A18 legacy-slaap in minuten (420) blijft geldig en ongewijzigd (sleep_unit.v1)');
  }

  /* ══ B. Volledig geldige invoer: numeriek ongewijzigd ════════════════════ */
  for (const [naam, bron] of [['wearable', 'wearable'], ['handmatig', 'manual']]) {
    const hd = reeks(30, bron);
    const r = await draai({ hd: kloon(hd), recRows: REC });
    const oud = legacy(r.sb, hd, REC);
    eq([r.df.factor, r.herstel.score, r.herstel.band, r.herstel.betrouwbaarheid], [oud.factor, oud.herstel.score, oud.herstel.band, oud.herstel.confidence], 'B1 ' + naam + ': dagfactor, herstelscore, band en betrouwbaarheid gelijk aan het oude gedrag');
    eq([r.start.factor, r.start.score, r.start.band, r.start.confidence, r.start.setsDelta, r.start.rpeDelta], [oud.factor, oud.herstel.score, oud.herstel.band, oud.herstel.confidence, 0, 0], 'B2 ' + naam + ': startpad (recoveryAdjustmentForToday) gelijk aan het oude gedrag');
    eq(r.besluit.beschikbaar, ['hrv', 'rhr', 'slaap', 'spierherstel', 'trainingsbelasting'], 'B3 ' + naam + ': readiness telt dezelfde signalen');
    eq([r.besluit.zone, r.besluit.datakwaliteit, r.besluit.reden], ['ready', 'volledig', 'ok'], 'B4 ' + naam + ': zone en datakwaliteit ongewijzigd');
  }
  {
    const hd = reeks(30, 'wearable'); hd[0].sleep = null;
    const r = await draai({ hd: kloon(hd), recRows: REC }); const oud = legacy(r.sb, hd, REC);
    eq([r.df.factor, r.herstel.score, r.herstel.betrouwbaarheid], [oud.factor, oud.herstel.score, oud.herstel.confidence], 'B5 ontbrekende slaap: gelijk aan het oude gedrag (ontbrekend blijft ontbrekend)');
    const alleenSlaap = [{ date: VANDAAG, hrv: null, rhr: null, sleep: 6.5, sleep_source: 'manual' }];
    const p = await draai({ hd: kloon(alleenSlaap), recRows: REC }); const oudP = legacy(p.sb, alleenSlaap, REC);
    eq([p.df.factor, p.herstel.score, p.herstel.band, p.herstel.betrouwbaarheid], [oudP.factor, oudP.herstel.score, oudP.herstel.band, oudP.herstel.confidence], 'B6 gedeeltelijke data (alleen slaap): gelijk aan het oude gedrag');
  }

  /* ══ C. Uitgesloten waarden bereiken de berekening niet ══════════════════ */
  {
    const basis = reeks(30, 'wearable');
    const metFout = kloon(basis); metFout[0].hrv = 450;
    const zonder = kloon(basis); zonder[0].hrv = null;
    const a = await draai({ hd: metFout, recRows: REC }), b = await draai({ hd: zonder, recRows: REC });
    eq([a.df.factor, a.df.hrvFactor, a.herstel.score, a.herstel.betrouwbaarheid], [b.df.factor, b.df.hrvFactor, b.herstel.score, b.herstel.betrouwbaarheid], 'C1 HRV 450 ms vandaag rekent exact als een ontbrekende HRV (uitgesloten VOOR de berekening)');
    ok(a.signalen.hrv === null && a.besluit.beschikbaar.indexOf('hrv') < 0 && a.besluit.ontbreekt.indexOf('hrv') >= 0, 'C2 de uitgesloten HRV is voor readinessDay een ontbrekend signaal');
    eq([a.start.factor, a.start.score, a.start.confidence], [b.start.factor, b.start.score, b.start.confidence], 'C2b ook het startpad (recoveryAdjustmentForToday) rekent zonder de uitgesloten HRV');
    const ruw = CalcCore.hrvRollingRecent(kloon(basis).map(function (r, i) { return i === 0 ? Object.assign(r, { hrv: 450 }) : r; }));
    const gekeurd = CalcCore.hrvRollingRecent(a.sb.tkHealthQualified(metFout).rows);
    ok(ruw.meanRaw > gekeurd.meanRaw + 40, 'C3 zonder keuring zou 450 het 7-daags HRV-gemiddelde vervuilen (' + Math.round(ruw.meanRaw) + ' tegen ' + Math.round(gekeurd.meanRaw) + ' ms)');
  }
  {
    const basis = reeks(30, 'wearable');
    const metFout = kloon(basis); metFout[0].rhr = 150;
    const zonder = kloon(basis); zonder[0].rhr = null;
    const a = await draai({ hd: metFout, recRows: REC }), b = await draai({ hd: zonder, recRows: REC });
    const oud = legacy(a.sb, metFout, REC);
    eq([a.herstel.score, a.herstel.betrouwbaarheid], [b.herstel.score, b.herstel.betrouwbaarheid], 'C4 rusthartslag 150 vandaag rekent exact als een ontbrekende rusthartslag');
    ok(oud.herstel.score < a.herstel.score, 'C5 het oude gedrag liet 150 bpm de herstelscore drukken (' + oud.herstel.score + ' tegen nu ' + a.herstel.score + ')');
    ok(a.signalen.rhr === null && a.besluit.beschikbaar.indexOf('rhr') < 0, 'C6 de uitgesloten rusthartslag telt niet als readiness-signaal');
    eq([a.start.score, a.start.confidence], [b.start.score, b.start.confidence], 'C6b ook het startpad rekent zonder de uitgesloten rusthartslag');
    ok(legacy(a.sb, metFout, REC).herstel.score !== a.start.score, 'C6c en wijkt daarmee af van het oude startpad, dat 150 bpm meerekende');
  }
  {
    const basis = reeks(30, 'wearable');
    const metFout = kloon(basis); metFout[0].sleep = 2000;
    const zonder = kloon(basis); zonder[0].sleep = null;
    const a = await draai({ hd: metFout, recRows: REC }), b = await draai({ hd: zonder, recRows: REC });
    eq([a.df.factor, a.df.slaapFactor, a.df.basis.slaap], [b.df.factor, b.df.slaapFactor, false], 'C7 slaap buiten contract (2000 minuten = 33 uur) rekent als ontbrekende slaap en is geen basis voor de dagfactor');
    const neg = kloon(basis); neg[0].hrv = -5; neg[0].rhr = 'abc';
    const n = await draai({ hd: neg, recRows: REC });
    ok(n.signalen.hrv === null && n.signalen.rhr === null && typeof n.df.factor === 'number', 'C8 negatieve en niet-numerieke waarden: ontbrekend, keten blijft werken');
  }

  {
    // Extreme maar plausibele metingen: dataquality.v1 noemt ze 'extreme_uitschieter'. Voor de
    // training van vandaag blijven ze staan (open productbesluit) — het gedrag is gelijk aan het oude.
    const hd = reeks(30, 'wearable'); hd[0].sleep = 3; hd[0].hrv = 12;
    const q = DeviceCore.qualifyHealthRows(hd, { today: VANDAAG, sleepHours: CalcCore.normalizeSleepHours });
    const dq = DeviceCore.qualifySeries(hd.slice().reverse().map(function (r) { return { date: r.date, value: r.sleep }; }), { field: 'sleep' });
    ok(dq.points[dq.points.length - 1].reason === 'extreme_uitschieter', 'C9 uitgangspunt: dataquality.v1 merkt een nacht van 3 uur in een regelmatige reeks als extreme_uitschieter');
    eq([q.rows[0].sleep, q.rows[0].hrv, q.uitgesloten.length, q.uitschieters.map(function (u) { return u.veld; }).sort(), q.rows[0] === hd[0]], [3, 12, 0, ['hrv', 'sleep'], true], 'C10 de brug laat zulke metingen staan en meldt ze apart');
    const r = await draai({ hd: kloon(hd), recRows: REC }); const oud = legacy(r.sb, hd, REC);
    eq([r.df.factor, r.df.slaapFactor, r.herstel.score, r.herstel.betrouwbaarheid], [oud.factor, 0.92, oud.herstel.score, oud.herstel.confidence], 'C11 een korte nacht en een scherpe HRV-daling blijven de dagfactor sturen, exact als voorheen');
  }

  /* ══ D. Herstelscore: betrouwbaarheid volgt bruikbare componenten ════════ */
  {
    const leeg = [{ date: VANDAAG, hrv: null, rhr: null, sleep: null, note: 'alleen notitie' }];
    const r = await draai({ hd: kloon(leeg), recRows: REC });
    eq([r.df.factor, r.df.basis], [1, { hrv: false, slaap: false, cyclus: false }], 'D1 dagfactor zonder enige invoer is 1.00 zonder basis');
    eq([r.herstel.score, r.herstel.betrouwbaarheid], [75, 'laag'], 'D2 die dagfactor telt niet als component: alleen spierherstel (75), betrouwbaarheid laag (was gemiddeld)');
    const niets = await draai({ hd: kloon(leeg), recRows: [] });
    ok(niets.herstel === null && niets.besluit.ontbreekt.indexOf('herstelscore') >= 0 && niets.start.score === null && niets.start.band === 'onbekend', 'D3 zonder enige bruikbare component is er GEEN herstelscore (was 75 uit een neutrale invulling), nooit 0');
    const cyc = [{ date: VANDAAG, hrv: null, rhr: null, sleep: null, cyclus_fase: 'luteaal' }];
    const c = await draai({ hd: kloon(cyc), recRows: REC });
    ok(c.df.basis.cyclus === true && c.herstel.betrouwbaarheid === 'gemiddeld', 'D4 een ingevulde cyclusfase is wel een basis');
  }
  {
    // Besluit 2: sync-status is transport, geen meetgeldigheid — en geen verborgen invoer.
    const hd = reeks(30, 'wearable');
    const kern = function (r) { return { factor: r.df.factor, basis: r.df.basis, herstel: r.herstel, zone: r.besluit.zone, datakwaliteit: r.besluit.datakwaliteit, beschikbaar: r.besluit.beschikbaar, advies: r.besluit.trainingsadvies,
      start: [r.start.score, r.start.band, r.start.confidence, r.start.factor, r.start.setsDelta, r.start.rpeDelta], signalen: r.signalen }; };
    const zonder = kern(await draai({ hd: kloon(hd), recRows: REC }));
    eq([zonder.herstel.score, zonder.herstel.betrouwbaarheid, zonder.datakwaliteit], [92, 'hoog', 'volledig'], 'D5 uitgangspunt: actuele geldige wearable-data');
    for (const status of ['sync_failed', 'token_expired', 'stale', 'syncing', 'not_connected', 'connected']) {
      eq(kern(await draai({ hd: kloon(hd), recRows: REC, sync: { status: status } })), zonder, 'D6 window._tkLichSync=' + status + ' (Lichaam geopend): exact dezelfde dagfactor, herstelscore, readiness en trainingsaanpassing');
    }
    ok(extractFn(HTML, 'tkHealthQualified').indexOf('_tkLichSync') < 0 && extractFn(HTML, 'tkReadinessVandaag').indexOf('_tkLichSync') < 0 && extractFn(HTML, 'recoveryAdjustmentForToday').indexOf('_tkLichSync') < 0,
      'D7 de keten leest window._tkLichSync niet meer (geen navigatie-afhankelijke invoer)');
    ok(/window\._tkLichSync\s*=\s*sync/.test(HTML) && /observationQuality\(obs, window\._tkLichSync\|\|\{\}\)/.test(HTML), 'D8 het Lichaam-scherm toont de sync-status nog steeds zelf');
  }

  /* ══ E. readinessDay krijgt in runtime de bestaande kwaliteit ════════════ */
  {
    const r = await draai({ hd: reeks(30, 'wearable'), recRows: REC });
    eq([r.signalen.hrv.kwaliteit, r.signalen.rhr.kwaliteit, r.signalen.slaap.kwaliteit], ['current', 'current', 'current'], 'E1 de echte tkReadinessVandaag geeft kwaliteit mee aan DecisionCore.readinessDay');
    ok(typeof r.signalen.hrv.waarde === 'number' && r.aanroepen === 1, 'E2 waarde blijft meegegeven; readinessDay wordt precies één keer aangeroepen');
    const leeg = await draai({ hd: [{ date: VANDAAG, hrv: null, rhr: null, sleep: null }], recRows: REC });
    eq([leeg.signalen.hrv, leeg.signalen.rhr, leeg.signalen.slaap], [null, null, null], 'E3 geen meting -> geen signaal; er wordt geen kwaliteit bij verzonnen');
  }

  /* ══ F. stale: telt niet voor vandaag, blijft historie (besluit 1) ═══════ */
  {
    eq(DecisionCore.READINESS_ONBETROUWBARE_KWALITEIT, ['no_data', 'stale'], 'F1 de ene Decision-lijst: no_data en stale; sync_failed staat er niet in');
    const hd = reeks(25, 'wearable', 10);
    const r = await draai({ hd: kloon(hd), recRows: REC }); const oud = legacy(r.sb, hd, REC);
    eq([r.signalen.hrv.kwaliteit, r.signalen.rhr.kwaliteit, r.signalen.slaap.kwaliteit], ['stale', 'stale', 'stale'], 'F2 een meting van 10 dagen oud gaat met status stale naar readinessDay');
    eq(r.besluit.beschikbaar, ['spierherstel', 'trainingsbelasting'], 'F3 en telt daar niet als actueel HRV/RHR/slaap-signaal');
    ok(['hrv', 'rhr', 'slaap'].every(function (k) { return r.besluit.ontbreekt.indexOf(k) >= 0; }), 'F4 de drie signalen staan bij ontbreekt');
    eq([oud.factor, r.df.factor, r.df.hrvSt, r.df.slaapFactor, r.df.basis], [1.05, 1, 'ref', 1, { hrv: false, slaap: false, cyclus: false }], 'F5 de dagfactor van vandaag wordt niet meer door de oude HRV/slaap gestuurd (was 1.05, nu neutraal zonder basis)');
    eq([oud.herstel.score, oud.herstel.confidence, r.herstel.score, r.herstel.betrouwbaarheid], [92, 'hoog', 75, 'laag'], 'F6 herstelscore: dagfactor en RHR-delta zijn geen component meer; alleen spierherstel telt');
    eq([r.start.factor, r.start.score, r.start.confidence, r.start.setsDelta, r.start.rpeDelta], [1, 75, 'laag', 0, 0], 'F7 het startpad volgt dezelfde uitkomst');
    const hq = r.sb.tkHealthQualified(kloon(hd));
    eq([hq.rows.length, hq.rows[0].hrv, hq.rows[0].rhr, hq.rows[0].sleep, hq.uitgesloten.length], [25, hd[0].hrv, hd[0].rhr, hd[0].sleep, 0], 'F8 de oude metingen staan nog volledig in de historie');
    const basisRuw = CalcCore.hrvBaseline(hd), basisNa = CalcCore.hrvBaseline(hq.rows);
    eq([basisNa.ready, basisNa.n, basisNa.meanRaw], [basisRuw.ready, basisRuw.n, basisRuw.meanRaw], 'F9 de HRV-baseline rekent nog met dezelfde historische metingen');
    ok(r.df.hrvBaseline && r.df.hrvBaseline.n === basisRuw.n, 'F10 en blijft beschikbaar in de dagfactor-uitleg');
    // deels verouderd: HRV oud, slaap van vandaag
    const gemengd = reeks(25, 'wearable', 10); gemengd.unshift({ date: VANDAAG, hrv: null, rhr: null, sleep: 6.5, sleep_source: 'manual', cyclus_fase: null });
    const g = await draai({ hd: gemengd, recRows: REC });
    eq([g.signalen.slaap.kwaliteit, g.df.basis, g.df.slaapFactor, g.besluit.beschikbaar.indexOf('slaap') >= 0], ['current', { hrv: false, slaap: true, cyclus: false }, 0.97, true], 'F11 per signaal: actuele slaap telt, verouderde HRV niet');
    const zes = reeks(25, 'wearable', 6); const z = await draai({ hd: kloon(zes), recRows: REC }); const oudZ = legacy(z.sb, zes, REC);
    eq([z.df.factor, z.herstel.score, z.herstel.betrouwbaarheid, z.besluit.beschikbaar.indexOf('hrv') >= 0], [oudZ.factor, oudZ.herstel.score, oudZ.herstel.confidence, true], 'F12 6 dagen oud is recent (bestaande grens): gedrag ongewijzigd');
  }

  /* ══ H. Fail-closed: zonder keuringslaag geen rauwe health-waarden ═══════ */
  {
    const hd = reeks(30, 'wearable'); hd[0].hrv = 450; hd[0].rhr = 150; hd[0].sleep = 4;
    const sabotages = {
      'DeviceCore ontbreekt': false,
      'qualifyHealthRows ontbreekt': Object.assign({}, DeviceCore, { qualifyHealthRows: undefined }),
      'qualifyHealthRows gooit': Object.assign({}, DeviceCore, { qualifyHealthRows: function () { throw new Error('kapot'); } }),
      'qualifyHealthRows geeft geen rijen': Object.assign({}, DeviceCore, { qualifyHealthRows: function () { return { rows: null, signalen: {} }; } }),
      'qualifyHealthRows geeft te weinig rijen': Object.assign({}, DeviceCore, { qualifyHealthRows: function (r) { return { rows: r.slice(1), signalen: {} }; } }),
      'qualifyHealthRows zonder signalen': Object.assign({}, DeviceCore, { qualifyHealthRows: function (r) { return { rows: r }; } })
    };
    const oud = legacy(runtime({ hd: hd }), hd, REC);
    ok(oud.herstel.score !== 75 && oud.factor !== 1, 'H0 uitgangspunt: rauw zouden HRV 450, RHR 150 en 4 uur slaap de uitkomst sturen (dagfactor ' + oud.factor + ', herstel ' + oud.herstel.score + ')');
    for (const naam of Object.keys(sabotages)) {
      const r = await draai({ hd: kloon(hd), recRows: REC }, { deviceCore: sabotages[naam] });
      const hq = r.sb.tkHealthQualified(kloon(hd));
      ok(hq.rows.length === 30 && hq.rows.every(function (x) { return x.hrv === null && x.rhr === null && x.sleep === null; }), 'H1 ' + naam + ': geen enkele rauwe HRV/RHR/slaap bereikt de keten');
      eq([hq.signalen.hrv.kwaliteit, hq.signalen.rhr.kwaliteit, hq.signalen.slaap.kwaliteit, hq.gekeurd], ['no_data', 'no_data', 'no_data', false], 'H2 ' + naam + ': bestaande status no_data, geen positieve kwaliteit');
      eq([hq.rows[0].date, hq.rows[0].hrv_source], [hd[0].date, 'wearable'], 'H3 ' + naam + ': datum en provenance blijven staan');
      eq([r.df.factor, r.df.basis, r.signalen.hrv, r.signalen.rhr, r.signalen.slaap], [1, { hrv: false, slaap: false, cyclus: false }, null, null, null], 'H4 ' + naam + ': dagfactor neutraal zonder basis; geen health-signaal naar readinessDay');
      eq([r.herstel.score, r.herstel.betrouwbaarheid, r.start.score, r.start.confidence, r.besluit.beschikbaar], [75, 'laag', 75, 'laag', ['spierherstel', 'trainingsbelasting']], 'H5 ' + naam + ': spierherstel blijft werken; de app valt niet om');
    }
    const cyc = [{ date: VANDAAG, hrv: 450, rhr: 150, sleep: 4, cyclus_fase: 'luteaal' }];
    const c = await draai({ hd: cyc, recRows: REC }, { deviceCore: false });
    eq([c.df.cyclusFactor, c.df.basis.cyclus, c.df.hrvFactor, c.df.slaapFactor], [0.97, true, 1, 1], 'H6 een onafhankelijk signaal (cyclusfase) blijft functioneren in fail-closed');
    ok(!/rows\s*:\s*rijen\s*[,}]/.test(extractFn(HTML, 'tkHealthQualified')) && /tkHealthFailClosed\(rijen\)/.test(extractFn(HTML, 'tkHealthQualified')), 'H7 tkHealthQualified kent geen pad meer dat de rauwe rijen teruggeeft');
  }

  /* ══ G. Bedrading en lagen ═══════════════════════════════════════════════ */
  ['refreshHome', 'tkReadinessVandaag', 'recoveryAdjustmentForToday', 'evaluateProgAdjustment', 'renderLichaamPremium', 'openRecoveryDetail'].forEach(function (naam) {
    const src = extractFn(HTML, naam);
    ok(/tkHealthQualified\(/.test(src) && !/(?:const|let)\s+hd\s*=\s*await\s+(?:sbGet|v43SafeGet)\('hrv_log'/.test(src), 'G1 ' + naam + ' rekent op gekeurde rijen (geen rauwe hrv_log naar de keten)');
  });
  const home = extractFn(HTML, 'refreshHome');
  ok(/dfInfo=\{factor:df\.factor,basis:df\.basis,/.test(home) && /tkReadinessVandaag\(dfInfo,recRows,nextT\)/.test(home) && /const dfAdvies=tkDagfactorVoorAdvies\(dfInfo\);/.test(extractFn(HTML, 'tkReadinessVandaag')), 'G0 refreshHome geeft de dagfactor met `basis` door en tkReadinessVandaag keurt hem aan de grens (DEC-DQ-002); de tests hierboven modelleren dus de echte aanroep');
  ok(/const hq=tkHealthQualified\(await v43SafeGet\('hrv_log'[^)]*\)\);\s*const hd=hq\.rows;\s*const lh=hd\[0\];/.test(home) && /const cyclusVandaag=tkCyclusFaseVandaag\(lh\);/.test(home) && /dagfactor\(hrvComponent,lh\.sleep,cyclusVandaag,hq\.signalen\)/.test(home), 'G2 refreshHome voert exact de orkestratie uit die deze suite gebruikt');
  const rv = extractFn(HTML, 'tkReadinessVandaag');
  ok((rv.match(/DecisionCore\.readinessDay\(/g) || []).length === 1 && /kwaliteit:kw\('hrv'\)/.test(rv) && /kwaliteit:kw\('rhr'\)/.test(rv) && /kwaliteit:kw\('slaap'\)/.test(rv), 'G3 één Decision-aanroep, met kwaliteit voor hrv, rhr en slaap');
  ok(!/trainReadiness|dayZone|computeProgAdjustment/.test(rv), 'G4 tkReadinessVandaag bevat geen tweede readiness-/zoneberekening');
  const calcSrc = fs.readFileSync(path.join(ROOT, 'core', 'calculation.js'), 'utf8');
  ok(!/qualifySeries|observationQuality|ONBETROUWBA|kwaliteit/.test(calcSrc), 'G5 de Calculation Engine bevat geen kwaliteitslogica (ontvangt gekeurde invoer)');
  const brug = DeviceCore.qualifyHealthRows.toString();
  ok(/qualifySeries\(/.test(brug) && /observationQuality\(/.test(brug) && !/\b(400|120|24|0\.5|3\.5)\b/.test(brug), 'G6 de brug roept de bestaande lagen aan en bevat geen eigen grenzen');
  ok(/DecisionCore\.READINESS_ONBETROUWBARE_KWALITEIT/.test(extractFn(HTML, 'tkSignaalOnbetrouwbaar')) && !/no_data|sync_failed/.test(extractFn(HTML, 'tkSignaalOnbetrouwbaar') + extractFn(HTML, 'tkRhrDeltaHerstel') + extractFn(HTML, 'dagfactor')), 'G7 index.html gebruikt de lijst van DecisionCore en houdt er geen eigen kopie van');
  const rs = CalcCore.recoveryScore;
  eq([rs({ dayFactor: 1.05, muscleRecoveryPct: 75, rhrDelta: 0 }), rs({ muscleRecoveryPct: 75 }), rs({})],
    [{ score: 92, band: 'hoog', confidence: 'hoog', components: 3 }, { score: 75, band: 'gemiddeld', confidence: 'laag', components: 1 }, { score: null, band: 'onbekend', confidence: 'geen', components: 0 }],
    'G8 recovery_score.v1 zelf is ongewijzigd (zelfde uitkomst, zelfde contract)');
}

main().then(function () {
  console.log('fRecoveryReadinessQualityWiring: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch(function (e) { console.error('fRecoveryReadinessQualityWiring: onverwachte fout', e); process.exit(1); });
