/* v4.70.3 — PM5 COMPLETION / FREEZE (real-device: SkiErg Losse 100 m, workoutState 12).
 * Bewijst met de ECHTE keten (transport-decoder -> aggregator -> tkC2NoteMeta ->
 * tkErgOnCanonicalMeasurement uit index.html -> Concept2Live-tracker):
 *   - active -> 12 -> freeze 100 m -> 13 -> 0 m -> nieuwe workout: .c2 blijft exact 100 m;
 *   - terminal zonder eerdere activiteit (oude 12 na connect): geen freeze;
 *   - terminal van verkeerde generation/device: geen freeze;
 *   - 11 = terminated (nooit als normale completion);
 *   - GEEN database-write, GEEN finishSession() en GEEN saveLosOefening() bij PM5-finish.
 * Sabotageblok onderaan: elke guard terugdraaien laat een assertie falen. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const LIVE_SRC = fs.readFileSync(path.join(ROOT, 'core/concept2Live.js'), 'utf8');
const DC = require(path.join(ROOT, 'core/deviceIntegration.js'));
const NT = require(path.join(ROOT, 'native/src/nativeConcept2BleTransport.js'));
let pass = 0, fail = 0, finished = false;
process.on('exit', function (code) { if (!finished && code === 0) { console.log('MISLUKT: test eindigde zonder samenvatting'); process.exitCode = 1; } });
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');

function loadLive(src) {
  const m = { exports: {} };
  new Function('module', 'exports', 'require', 'self', src)(m, m.exports, p => /deviceIntegration/.test(p) ? DC : require(p), {});
  return m.exports;
}
function fnSrc(html, name) {
  let s = html.indexOf('function ' + name + '('); if (s < 0) throw new Error('niet gevonden: ' + name);
  let d = 0; const b = html.indexOf('{', html.indexOf(')', s));
  for (let k = b; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (d === 0) return html.slice(s, k + 1); } }
}
const FNS = ['_c2completionTracker', 'tkC2PacketMeta', 'tkC2NoteMeta', 'tkC2CompletionObserve', 'tkC2CompletionIgnored', 'tkC2FrozenFor',
  'tkErgOnCanonicalMeasurement', 'tkC2IsLoggableSummary', 'tkC2Converter', 'tkC2SessionRowFromLog', '_c2connectedInner'];
function makeWorld(html, C2L) {
  const spies = { finishSession: 0, saveLosOefening: 0, writeSessionRow: 0, sbPostQ: 0, completeTrainingInstance: 0 };
  const env = { sessionLog: {}, _c2rt: {}, _c2pair: {}, LOS_DOMID: 'los', _C2ERGLBL: { rowing: 'RowErg', skierg: 'SkiErg', bikeerg: 'BikeErg' } };
  const names = ['sessionLog', '_c2rt', '_c2pair', 'LOS_DOMID', '_C2ERGLBL', 'Concept2Live', 'DeviceCore', 'finishSession', 'saveLosOefening', 'writeSessionRow', 'sbPostQ', 'completeTrainingInstance'];
  const vals = [env.sessionLog, env._c2rt, env._c2pair, env.LOS_DOMID, env._C2ERGLBL, C2L, DC,
    () => { spies.finishSession++; }, () => { spies.saveLosOefening++; }, () => { spies.writeSessionRow++; }, () => { spies.sbPostQ++; }, () => { spies.completeTrainingInstance++; }];
  const src = 'var _c2completion={}, _c2packetMeta={};\n' + FNS.map(n => fnSrc(html, n)).join('\n') + '\nreturn {' + FNS.join(',') + ', _c2completion:_c2completion};';
  const api = new Function(...names, src)(...vals);
  return { env, api, spies };
}
// ── byte-niveau: echte transport-decoder + aggregator, zoals de producer in index.html ──
const U = s => ('ce0600' + s + '-43e5-11e4-916c-0800200c9a66');
const dv = bytes => new DataView(new Uint8Array(bytes).buffer);
function p31(elapsedS, distM, wtype, wstate, dur, dt) {
  const e = Math.round(elapsedS * 100), d = Math.round(distM * 10);
  return [0x31, e & 255, (e >> 8) & 255, (e >> 16) & 255, d & 255, (d >> 8) & 255, (d >> 16) & 255, wtype, 1, wstate, wstate === 1 ? 1 : 0, 0,
    Math.round(distM) & 255, (Math.round(distM) >> 8) & 255, 0, dur & 255, (dur >> 8) & 255, 0, dt, 91];
}
const P32 = [0x32, 0x39, 0x30, 0x00, 0x94, 0x11, 37, 255, 0xF8, 0x2A, 0xF8, 0x2A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x85, 0x00, 0x80];
async function chain(C2L, html, deviceMac) {
  const w = makeWorld(html, C2L);
  const cbs = {};
  const gw = { isEnabled: () => Promise.resolve(true), checkPermission: () => Promise.resolve('granted'), requestPermission: () => Promise.resolve('granted'),
    scan: () => Promise.resolve(), stopScan: () => Promise.resolve(), connect: () => Promise.resolve(), disconnect: () => Promise.resolve(),
    getServices: () => Promise.resolve([{ uuid: U('20'), characteristics: [{ uuid: U('22'), properties: { notify: true } }] }, { uuid: U('30'), characteristics: [{ uuid: U('80'), properties: { notify: true } }] }]),
    startNotifications: (id, svc, ch, cb) => { cbs[String(ch).toLowerCase()] = cb; return Promise.resolve(); },
    stopNotifications: () => Promise.resolve(), read: () => Promise.resolve(dv([1])), readRssi: () => Promise.resolve(-50), write: () => Promise.resolve() };
  const t = NT.makeNativeConcept2BleTransport({ gateway: gw, concept2Live: C2L, now: () => 1000, setTimeoutFn: fn => { fn(); return 1; }, clearTimeoutFn: () => {} });
  await t.connect('skierg', deviceMac || 'AA:BB:CC:11:22:33');
  const agg = C2L.createPm5LiveAggregator();
  t.subscribeMetrics(evt => {                  // exact de producer-volgorde uit index.html
    const cm = agg.push((evt && evt.metrics) || {}, 'skierg', {});
    if (!cm) return;
    w.api.tkC2NoteMeta('los', evt, t); w.api.tkErgOnCanonicalMeasurement('los', cm);
  });
  const ctx = t.getControlContext(); w.env._c2rt.los = { generation: ctx.generation, deviceId: ctx.deviceId, prog: null, agg: agg };
  return { w, t, send: b => cbs[U('80')](dv(b)) };
}

async function suite(C2L, html) {
  const R = {};
  R.cls = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, null, 'x', true].map(C2L.classifyPm5WorkoutState);
  R.why = [10, 11, 12, 1].map(C2L.pm5TerminalReason);

  // 1. KERNBEWIJS: active -> 12 -> freeze 100 m -> 13 -> 0 m -> nieuwe workout
  { const c = await chain(C2L, html);
    c.send(p31(10, 40, 3, 1, 100, 0x80)); c.send(P32);
    c.send(p31(20, 80, 3, 1, 100, 0x80)); c.send(P32);
    c.send(p31(27.57, 100, 3, 12, 100, 0x80));                  // WORKOUTLOGGED
    const frozenAt = c.w.env.sessionLog.los.c2Completed ? c.w.env.sessionLog.los.c2Completed.at : null;
    c.send(P32); c.send(p31(27.57, 100, 3, 12, 100, 0x80));      // herhaling 12 + 0x32
    c.send(p31(0, 0, 3, 13, 100, 0x80));                         // REARM
    c.send(p31(0, 0, 0, 0, 0, 0)); c.send(P32);                  // WAITTOBEGIN, 0 m
    c.send(p31(3, 12, 0, 1, 0, 0));                              // nieuwe workout begint
    const L = c.w.env.sessionLog.los;
    R.core = { dist: L.c2.distanceM, el: L.c2.elapsedTimeS, ws: L.c2.workoutState, mt: L.c2.machineType, reason: L.c2Completed && L.c2Completed.reason,
      term: L.c2Completed && L.c2Completed.terminalState, sameAt: L.c2Completed && L.c2Completed.at === frozenAt,
      frozenDist: L.c2Completed && L.c2Completed.measurement.distanceM, diagLast31Dist: c.t.getMultiplexedDiagnostics().last31.fields.distanceM,
      tracker: c.w.api._c2completion.los.snapshot(), spies: Object.assign({}, c.w.spies) };
    const row = c.w.api.tkC2SessionRowFromLog(L.c2, { date: '2026-09-27', training_type: null, training_instance_id: null }, c.w.api.tkC2Converter());
    R.core.row = { distance: row.distance, time_str: row.time_str, watt: row.watt, stroke_rate: row.stroke_rate };
    c.w.env._c2pair.los = { mt: 'skierg', cardioType: 'skierg' };
    R.core.ui = c.w.api._c2connectedInner('los', { distanceM: 0, elapsedTimeS: 0, machineType: 'skierg' }); }

  // 2. oude terminal direct na connect (geen activiteit) -> geen freeze
  { const c = await chain(C2L, html);
    c.send(p31(27.57, 100, 3, 12, 100, 0x80)); c.send(P32); c.send(p31(27.57, 100, 3, 12, 100, 0x80));
    R.stale = { frozen: !!c.w.env.sessionLog.los.c2Completed, reason: c.w.api._c2completion.los.snapshot().lastReason, c2dist: c.w.env.sessionLog.los.c2.distanceM };
    // daarna een echte workout: 13 -> 0 -> 1 -> 12 bevriest wel
    c.send(p31(0, 0, 3, 13, 100, 0x80)); c.send(p31(0, 0, 3, 0, 100, 0x80)); c.send(p31(15, 60, 3, 1, 100, 0x80)); c.send(p31(29, 100, 3, 12, 100, 0x80));
    R.staleThenReal = c.w.env.sessionLog.los.c2Completed ? c.w.env.sessionLog.los.c2Completed.measurement.elapsedTimeS : null; }

  // 3. verkeerde generation / device
  { const w = makeWorld(html, C2L); const cmA = { machineType: 'skierg', distanceM: 50, elapsedTimeS: 10, workoutState: 1 }, cmT = { machineType: 'skierg', distanceM: 100, elapsedTimeS: 27, workoutState: 12 };
    const T = (g, d) => ({ getControlContext: () => ({ generation: g, deviceId: d }) }), E = seq => ({ metrics: { multiplexedId: '0x31', packetSeq: seq } });
    w.api.tkC2NoteMeta('los', E(1), T(1, 'A')); w.api.tkErgOnCanonicalMeasurement('los', cmA);
    w.api.tkC2NoteMeta('los', E(2), T(2, 'A')); w.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.wrongGen = !!w.env.sessionLog.los.c2Completed;
    const w2 = makeWorld(html, C2L);
    w2.api.tkC2NoteMeta('los', E(1), T(1, 'A')); w2.api.tkErgOnCanonicalMeasurement('los', cmA);
    w2.api.tkC2NoteMeta('los', E(2), T(1, 'B')); w2.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.wrongDev = !!w2.env.sessionLog.los.c2Completed;
    const w3 = makeWorld(html, C2L); w3.env._c2rt.los = { generation: 5, deviceId: 'A' };   // runtime zegt gen 5
    w3.api.tkC2NoteMeta('los', E(1), T(4, 'A')); w3.api.tkErgOnCanonicalMeasurement('los', cmA);
    w3.api.tkC2NoteMeta('los', E(2), T(4, 'A')); w3.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.runtimeMismatch = [!!w3.env.sessionLog.los.c2Completed, w3.api._c2completion.los.snapshot().lastReason];
    const w4 = makeWorld(html, C2L);                                                         // goede generation: wel freeze
    w4.api.tkC2NoteMeta('los', E(1), T(1, 'A')); w4.api.tkErgOnCanonicalMeasurement('los', cmA);
    w4.api.tkC2NoteMeta('los', E(2), T(1, 'A')); w4.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.sameGen = !!w4.env.sessionLog.los.c2Completed;
    const w5 = makeWorld(html, C2L);                                                         // 0x32 draagt nooit de terminal
    w5.api.tkC2NoteMeta('los', E(1), T(1, 'A')); w5.api.tkErgOnCanonicalMeasurement('los', cmA);
    w5.api.tkC2NoteMeta('los', { metrics: { multiplexedId: '0x32', packetSeq: 2 } }, T(1, 'A')); w5.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.via32 = !!w5.env.sessionLog.los.c2Completed;
    const w6 = makeWorld(html, C2L);                                                         // zonder meta (andere aanroeper): nooit freeze
    w6.api.tkErgOnCanonicalMeasurement('los', cmA); w6.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.noMeta = !!w6.env.sessionLog.los.c2Completed; }

  // 4. programmeer-acceptatie (#466 acceptedMuxSeq, read-only) en lopende programmering
  { const T = { getControlContext: () => ({ generation: 1, deviceId: 'A' }) }, E = seq => ({ metrics: { multiplexedId: '0x31', packetSeq: seq } });
    const cmA = { machineType: 'skierg', distanceM: 50, elapsedTimeS: 10, workoutState: 1 }, cmT = { machineType: 'skierg', distanceM: 100, elapsedTimeS: 27, workoutState: 12 };
    const w = makeWorld(html, C2L); w.env._c2rt.los = { generation: 1, deviceId: 'A', prog: { getDiagnostics: () => ({ isPending: false, acceptedMuxSeq: 50 }) } };
    w.api.tkC2NoteMeta('los', E(40), T); w.api.tkErgOnCanonicalMeasurement('los', cmA);      // activiteit VÓÓR acceptatie
    w.api.tkC2NoteMeta('los', E(60), T); w.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.beforeAccept = !!w.env.sessionLog.los.c2Completed;
    w.api.tkC2NoteMeta('los', E(61), T); w.api.tkErgOnCanonicalMeasurement('los', cmA);      // activiteit NA acceptatie
    w.api.tkC2NoteMeta('los', E(62), T); w.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.afterAccept = !!w.env.sessionLog.los.c2Completed;
    const w2 = makeWorld(html, C2L); w2.env._c2rt.los = { generation: 1, deviceId: 'A', prog: { getDiagnostics: () => ({ isPending: true, acceptedMuxSeq: null }) } };
    w2.api.tkC2NoteMeta('los', E(1), T); w2.api.tkErgOnCanonicalMeasurement('los', cmA);
    w2.api.tkC2NoteMeta('los', E(2), T); w2.api.tkErgOnCanonicalMeasurement('los', cmT);
    R.pending = !!w2.env.sessionLog.los.c2Completed; }

  // 5. 11 = terminated; 10 = ended; niet-opslagwaardige terminal; boven doel; disconnect na finish
  { const T = g => ({ getControlContext: () => ({ generation: g, deviceId: 'A' }) }), E = seq => ({ metrics: { multiplexedId: '0x31', packetSeq: seq } });
    const run = (term, dist, el) => { const w = makeWorld(html, C2L);
      w.api.tkC2NoteMeta('los', E(1), T(1)); w.api.tkErgOnCanonicalMeasurement('los', { machineType: 'skierg', distanceM: 30, elapsedTimeS: 5, workoutState: 1 });
      w.api.tkC2NoteMeta('los', E(2), T(1)); w.api.tkErgOnCanonicalMeasurement('los', { machineType: 'skierg', distanceM: dist, elapsedTimeS: el, workoutState: term });
      return w; };
    const w11 = run(11, 62, 15); R.term11 = w11.env.sessionLog.los.c2Completed ? w11.env.sessionLog.los.c2Completed.reason : null;
    w11.env._c2pair.los = { mt: 'skierg', cardioType: 'skierg' }; R.ui11 = w11.api._c2connectedInner('los', null);
    const w10 = run(10, 100, 27); R.term10 = w10.env.sessionLog.los.c2Completed ? w10.env.sessionLog.los.c2Completed.reason : null;
    const w0 = run(11, 0, 0); R.zero = !!w0.env.sessionLog.los.c2Completed;
    const wo = run(12, 105, 29); R.over = wo.env.sessionLog.los.c2Completed ? wo.env.sessionLog.los.c2.distanceM : null;
    // disconnect direct na finish + nieuwe verbinding (gen 2) met oude 12 en daarna 0 m: blijft 105 m
    wo.api.tkC2NoteMeta('los', E(1), T(2)); wo.api.tkErgOnCanonicalMeasurement('los', { machineType: 'skierg', distanceM: 105, elapsedTimeS: 29, workoutState: 12 });
    wo.api.tkC2NoteMeta('los', E(2), T(2)); wo.api.tkErgOnCanonicalMeasurement('los', { machineType: 'skierg', distanceM: 0, elapsedTimeS: 0, workoutState: 0 });
    R.afterReconnect = wo.env.sessionLog.los.c2.distanceM;
    // training-oefening: zelfde freeze, nooit finishSession/opslaan
    const wt = makeWorld(html, C2L); wt.env._c2pair.skierg = { mt: 'skierg', cardioType: 'skierg' };
    wt.api.tkC2NoteMeta('skierg', E(1), T(1)); wt.api.tkErgOnCanonicalMeasurement('skierg', { machineType: 'skierg', distanceM: 30, elapsedTimeS: 5, workoutState: 1 });
    wt.api.tkC2NoteMeta('skierg', E(2), T(1)); wt.api.tkErgOnCanonicalMeasurement('skierg', { machineType: 'skierg', distanceM: 100, elapsedTimeS: 27, workoutState: 12 });
    R.training = { frozen: !!wt.env.sessionLog.skierg.c2Completed, spies: Object.assign({}, wt.spies), ui: wt.api._c2connectedInner('skierg', null) }; }
  return R;
}

(async function run() {
  const C2L = loadLive(LIVE_SRC);
  const R = await suite(C2L, HTML);
  eq(R.cls.join(','), 'waiting,active,rest,rest,active,active,rest,rest,rest,rest,terminal,terminal,terminal,rearm,unknown,unknown,unknown,unknown', 'S1: classifier 0-13 volgens OBJ_WORKOUTSTATE_T');
  eq(R.why.join(','), 'ended,terminated,logged,', 'S2: terminal reasons 10/11/12 (11 = terminated)');
  eq(R.core.dist, 100, 'CORE: na 12 -> 13 -> 0 m -> nieuwe workout blijft .c2 exact 100 m');
  eq(R.core.el, 27.57, 'CORE: elapsed blijft exact 27.57 s');
  eq(R.core.ws, 12, 'CORE: .c2 is de terminal-meting (state 12)');
  eq(R.core.mt, 'skierg', 'CORE: machine ongewijzigd');
  eq(R.core.reason, 'logged', 'CORE: freeze reason logged'); eq(R.core.term, 12, 'CORE: terminal state 12');
  ok(R.core.sameAt === true, 'CORE: herhaalde 12 bevriest niet opnieuw (zelfde tijdstip)');
  eq(R.core.frozenDist, 100, 'CORE: vastgezette kopie 100 m');
  eq(R.core.diagLast31Dist, 12, 'CORE: diagnostiek ziet de latere packets nog wel (laatste 0x31 = 12 m)');
  ok(R.core.tracker.ignoredAfterFreeze >= 5 && R.core.tracker.freezes === 1, 'CORE: latere packets geteld als genegeerd, precies één freeze');
  eq(R.core.row.distance, 100, 'CORE: actual-rij uit de bevroren .c2: 100 m');
  ok(R.core.row.time_str != null && R.core.row.watt != null, 'CORE: actual-rij draagt tijd en watt');
  eq(JSON.stringify(R.core.spies), JSON.stringify({ finishSession: 0, saveLosOefening: 0, writeSessionRow: 0, sbPostQ: 0, completeTrainingInstance: 0 }), 'CORE: GEEN DB-write, GEEN finishSession, GEEN automatische opslag bij PM5-finish');
  ok(/Workout voltooid op de PM5/.test(R.core.ui) && /tik Opslaan/.test(R.core.ui) && /<b>100<\/b> m/.test(R.core.ui), 'CORE: Losse UI toont vastgezette 100 m + Opslaan-hint');
  eq(R.stale.frozen, false, 'STALE: oude 12 direct na connect bevriest niet'); eq(R.stale.reason, 'terminal_without_activity', 'STALE: reden terminal_without_activity');
  eq(R.staleThenReal, 29, 'STALE: daarna bevriest een echte workout (13 -> 0 -> 1 -> 12) wel');
  eq(R.wrongGen, false, 'GEN: terminal van andere generation bevriest niet'); eq(R.wrongDev, false, 'DEV: terminal van ander device bevriest niet');
  eq(JSON.stringify(R.runtimeMismatch), JSON.stringify([false, 'runtime_mismatch']), 'GEN: meta wijkt af van runtime-registry -> geen freeze');
  eq(R.sameGen, true, 'GEN: zelfde generation+device bevriest wel');
  eq(R.via32, false, 'PKT: terminal via 0x32 (merged state) bevriest niet');
  eq(R.noMeta, false, 'PKT: zonder packet-meta nooit freeze');
  eq(R.beforeAccept, false, 'ACC: activiteit vóór #466-acceptatie telt niet'); eq(R.afterAccept, true, 'ACC: activiteit ná acceptatie + terminal bevriest');
  eq(R.pending, false, 'ACC: tijdens lopende programmering geen freeze');
  eq(R.term11, 'terminated', 'T11: state 11 bevriest als terminated'); ok(/afgebroken/.test(R.ui11) && !/voltooid/.test(R.ui11), 'T11: UI noemt het afgebroken, niet voltooid');
  eq(R.term10, 'ended', 'T10: state 10 bevriest als ended');
  eq(R.zero, false, 'ZERO: terminal zonder opslagwaardige meting (0 m/0 s) bevriest niet');
  eq(R.over, 105, 'OVER: meting boven doel wordt ongewijzigd vastgezet');
  eq(R.afterReconnect, 105, 'DISC: na disconnect + reconnect (oude 12, 0 m) blijft 105 m staan');
  ok(R.training.frozen === true, 'TRAIN: training-oefening bevriest ook');
  eq(JSON.stringify(R.training.spies), JSON.stringify({ finishSession: 0, saveLosOefening: 0, writeSessionRow: 0, sbPostQ: 0, completeTrainingInstance: 0 }), 'TRAIN: nooit automatisch finishSession() of opslaan');
  ok(/wordt opgeslagen bij Training afronden/.test(R.training.ui), 'TRAIN: UI verwijst naar Training afronden');

  // ── SABOTAGE ──
  const sab = [
    ['freeze-guard in consumer weg', { html: h => h.replace("  if(sessionLog[exId].c2Completed){ try{ if(typeof tkC2CompletionIgnored==='function') tkC2CompletionIgnored(exId, cm); }catch(_ci){} return; }\r\n", '') }, R2 => R2.core.dist !== 100],
    ['activiteit-eis weg', { live: s => s.replace("if (!activitySeen) return res(false, 'terminal_without_activity');", '') }, R2 => R2.stale.frozen === true],
    ['generation/device-binding weg', { live: s => s.replace('if (!bind || bind.generation !== g || bind.deviceId !== d) {', 'if (!bind) {') }, R2 => R2.wrongGen === true || R2.wrongDev === true],
    ['runtime-mismatch-guard weg', { html: h => h.replace("{ tr.note('runtime_mismatch'); return null; }", '{ tr.note("runtime_mismatch"); }') }, R2 => R2.runtimeMismatch[0] === true],
    ['acceptedMuxSeq-guard weg', { live: s => s.replace("return res(false, 'before_acceptance');", "void 0;") }, R2 => R2.beforeAccept === true],
    ['11 als normale completion', { live: s => s.replace("n === 11 ? 'terminated'", "n === 11 ? 'logged'") }, R2 => R2.term11 !== 'terminated'],
    ['0x31-eis weg', { live: s => s.replace("if (meta.packetId != null && meta.packetId !== '0x31') return res(false, 'not_0x31');", '') }, R2 => R2.via32 === true],
    ['automatische finishSession bij freeze', { html: h => h.replace("if(_fz) sessionLog[exId].c2Completed=_fz;", "if(_fz){ sessionLog[exId].c2Completed=_fz; if(typeof finishSession==='function') finishSession(); }") }, R2 => R2.training.spies.finishSession > 0],
    ['loggability-eis weg', { html: h => h.replace("{ tr.note('terminal_not_loggable'); return null; }", "{ tr.note('terminal_not_loggable'); }") }, R2 => R2.zero === true]
  ];
  for (const [name, mut, detects] of sab) {
    const h2 = mut.html ? mut.html(HTML) : HTML, l2 = mut.live ? mut.live(LIVE_SRC) : LIVE_SRC;
    if ((mut.html && h2 === HTML) || (mut.live && l2 === LIVE_SRC)) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
    let R2 = null; try { R2 = await suite(loadLive(l2), h2); } catch (e) { R2 = null; }
    ok(R2 !== null && detects(R2), 'SABOTAGE gedetecteerd via assertie: ' + name);
  }
  finished = true;
  console.log('\n[Concept2 PM5 completion/freeze] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('MISLUKT: exception ' + (e && e.stack)); process.exit(1); });
