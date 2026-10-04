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
  'slaapDagFactor', 'cyclusDagFactor', 'tkHealthQualified', 'tkSignaalOnbetrouwbaar', 'tkRhrDeltaHerstel', 'dagfactor',
  'tkDagfactorHeeftBasis', 'recoveryScoreFrom', 'rhrBaselineDelta', 'todayPainMuscle', 'recoveryAdjustmentForToday',
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
  if (!opts.zonderDeviceCore) sb.DeviceCore = DeviceCore;
  vm.createContext(sb); vm.runInContext(PROD, sb);
  sb.__calls = calls;
  return sb;
}
// De Home-orkestratie, letterlijk zoals refreshHome hem uitvoert (zie sectie G voor de bronbinding).
function homeDf(sb, hdRuw) {
  const hq = sb.tkHealthQualified(hdRuw); const hd = hq.rows; const lh = hd[0];
  return lh ? sb.dagfactor(sb.hrvDagFactorPersonal(hd), lh.sleep, lh.cyclus_fase, hq.signalen) : null;
}
async function draai(state) {
  const sb = runtime(state);
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
    const oud = DeviceCore.qualifyHealthRows(reeks(5, 'wearable', 10), { today: VANDAAG });
    eq([oud.signalen.hrv.kwaliteit, oud.signalen.hrv.versheid, oud.uitgesloten.length, oud.rows[0].hrv != null], ['stale', 'stale', 0, true], 'A13 een meting van 10 dagen oud krijgt de bestaande status stale en wordt NIET uitgesloten');
    const zonderDatum = DeviceCore.qualifyHealthRows(reeks(5, 'wearable'), {});
    ok(zonderDatum.signalen.hrv.versheid === 'unknown', 'A14 zonder today wordt geen versheid verzonnen (unknown)');
    const sf = { status: 'sync_failed' };
    eq(DeviceCore.qualifyHealthRows(reeks(5, 'wearable'), { today: VANDAAG, sync: sf }).signalen.hrv.kwaliteit, 'sync_failed', 'A15 mislukte sync + wearable-bron -> sync_failed');
    eq(DeviceCore.qualifyHealthRows(reeks(5, 'manual'), { today: VANDAAG, sync: sf }).signalen.hrv.kwaliteit, 'current', 'A16 een handmatige waarde wordt niet ongeldig door een mislukte wearable-sync');
    eq(DeviceCore.qualifyHealthRows(reeks(5, 'unknown'), { today: VANDAAG, sync: sf }).signalen.hrv.kwaliteit, 'sync_failed', 'A17 bij onbekende bron telt de sync-status wel (geen geruststelling bij twijfel)');
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
    const hd = reeks(30, 'wearable');
    const okSync = await draai({ hd: kloon(hd), recRows: REC });
    const mislukt = await draai({ hd: kloon(hd), recRows: REC, sync: { status: 'sync_failed' } });
    eq([okSync.herstel.betrouwbaarheid, mislukt.herstel.betrouwbaarheid, mislukt.herstel.score], ['hoog', 'laag', 75], 'D5 mislukte sync (wearable): dagfactor en RHR zijn geen betrouwbare component meer; alleen spierherstel telt');
    eq(mislukt.df.basis, { hrv: false, slaap: false, cyclus: false }, 'D6 de basis van de dagfactor volgt dezelfde lijst als readinessDay');
    eq([mislukt.df.factor, mislukt.start.setsDelta, mislukt.start.rpeDelta], [okSync.df.factor, okSync.start.setsDelta, okSync.start.rpeDelta], 'D7 de dagfactor zelf en de trainingsaanpassing veranderen NIET door de sync-status');
    const hand = await draai({ hd: reeks(30, 'manual'), recRows: REC, sync: { status: 'sync_failed' } });
    eq([hand.herstel.score, hand.herstel.betrouwbaarheid], [okSync.herstel.score, 'hoog'], 'D8 handmatige data + mislukte wearable-sync: herstelscore ongewijzigd');
    const token = await draai({ hd: kloon(hd), recRows: REC, sync: { status: 'token_expired' } });
    eq(token.herstel.betrouwbaarheid, 'laag', 'D9 verlopen token geldt als sync_failed (bestaande observationQuality-semantiek)');
  }

  /* ══ E. readinessDay krijgt in runtime de bestaande kwaliteit ════════════ */
  {
    const r = await draai({ hd: reeks(30, 'wearable'), recRows: REC });
    eq([r.signalen.hrv.kwaliteit, r.signalen.rhr.kwaliteit, r.signalen.slaap.kwaliteit], ['current', 'current', 'current'], 'E1 de echte tkReadinessVandaag geeft kwaliteit mee aan DecisionCore.readinessDay');
    ok(typeof r.signalen.hrv.waarde === 'number' && r.aanroepen === 1, 'E2 waarde blijft meegegeven; readinessDay wordt precies één keer aangeroepen');
    const m = await draai({ hd: reeks(30, 'wearable'), recRows: REC, sync: { status: 'sync_failed' } });
    eq([m.signalen.hrv.kwaliteit, m.besluit.beschikbaar, m.besluit.datakwaliteit], ['sync_failed', ['spierherstel', 'trainingsbelasting'], 'gedeeltelijk'], 'E3 het bestaande filter werkt nu in de echte keten: bij sync_failed vallen hrv/rhr/slaap weg');
    eq([m.besluit.zone, m.besluit.trainingsadvies], [r.besluit.zone, r.besluit.trainingsadvies], 'E4 zone en trainingsadvies blijven van dezelfde Decision-functie komen en veranderen niet');
    const z = runtime({ hd: reeks(30, 'wearable'), recRows: REC }, { zonderDeviceCore: true });
    const hq = z.tkHealthQualified(reeks(3, 'wearable'));
    eq([hq.version, hq.signalen, hq.rows.length], [null, {}, 3], 'E5 zonder DeviceCore: rijen ongewijzigd en GEEN kwaliteit verzonnen');
    await z.tkReadinessVandaag(homeDf(z, reeks(30, 'wearable')), REC, null);
    ok(z.__calls[0].signalen.hrv.kwaliteit === null && z.window._tkReadiness.beschikbaar.indexOf('hrv') >= 0, 'E6 ontbrekende kwaliteit blijft null en wordt geen positieve of negatieve status');
  }

  /* ══ F. stale: bestaande contractsemantiek, geen eigen keuze ═════════════ */
  {
    eq(DecisionCore.READINESS_ONBETROUWBARE_KWALITEIT, ['no_data', 'sync_failed'], 'F1 de Decision-lijst is inhoudelijk ongewijzigd: stale staat er NIET in');
    const hd = reeks(25, 'wearable', 10);
    const r = await draai({ hd: kloon(hd), recRows: REC }); const oud = legacy(r.sb, hd, REC);
    eq([r.signalen.hrv.kwaliteit, r.signalen.slaap.kwaliteit], ['stale', 'stale'], 'F2 een meting van 10 dagen oud gaat met de bestaande status stale naar readinessDay');
    eq([r.df.factor, r.herstel.score, r.herstel.betrouwbaarheid, r.besluit.beschikbaar.indexOf('hrv') >= 0], [oud.factor, oud.herstel.score, oud.herstel.confidence, true], 'F3 stale sluit niets uit en verandert geen uitkomst (open productbesluit, hier niet genomen)');
  }

  /* ══ G. Bedrading en lagen ═══════════════════════════════════════════════ */
  ['refreshHome', 'tkReadinessVandaag', 'recoveryAdjustmentForToday', 'evaluateProgAdjustment', 'renderLichaamPremium', 'openRecoveryDetail'].forEach(function (naam) {
    const src = extractFn(HTML, naam);
    ok(/tkHealthQualified\(/.test(src) && !/(?:const|let)\s+hd\s*=\s*await\s+(?:sbGet|v43SafeGet)\('hrv_log'/.test(src), 'G1 ' + naam + ' rekent op gekeurde rijen (geen rauwe hrv_log naar de keten)');
  });
  const home = extractFn(HTML, 'refreshHome');
  ok(/const hq=tkHealthQualified\(await v43SafeGet\('hrv_log'[^)]*\)\);\s*const hd=hq\.rows;\s*const lh=hd\[0\];/.test(home) && /dagfactor\(hrvComponent,lh\.sleep,lh\.cyclus_fase,hq\.signalen\)/.test(home), 'G2 refreshHome voert exact de orkestratie uit die deze suite gebruikt');
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
