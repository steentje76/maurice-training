/* CONCEPT2 REAL-DEVICE DIAGNOSTIC INSTRUMENTATION GATE — regressie + observability.
 * Bewijst dat de diagnostiek UITSLUITEND observeert:
 *  A  controller-gedrag byte-identiek aan de baseline (44692317) — bevroren traces
 *  B  instrumentatie is transparant: zonder recorder exact dezelfde traces
 *  C  verify-reden/attempts blijven zichtbaar na TIMEOUT; stale generation/device nog steeds afgewezen
 *  D  transport telt 0x31 en 0x32 afzonderlijk, met globale en per-ID sequence + echte decoded velden
 *  E  H1-meetbaarheid: stale merged 0x31 via verse 0x32 is aantoonbaar herkenbaar (geen fix)
 *  F  canonical observability creëert geen tweede loggingroute; consumer/bridge ongewijzigd
 *  G  fail-open: een crashende recorder blokkeert geen consumer/finish-bridge
 *  H  Developer Mode UIT = identieke functionele uitkomst
 *  I  Developer Mode toont de gevraagde velden
 *  J  sabotage: zonder recordVerify faalt de observability-assertie
 * Geen hypothese (H1–H5) wordt hier bevestigd; alleen meetbaar gemaakt. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const CSAFE = require(path.join(ROOT, 'core/concept2Csafe.js'));
const PROG = require(path.join(ROOT, 'core/concept2Programming.js'));
const C2L = require(path.join(ROOT, 'core/concept2Live.js'));
const NT = require(path.join(ROOT, 'native/src/nativeConcept2BleTransport.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const progSrc = fs.readFileSync(path.join(ROOT, 'core/concept2Programming.js'), 'utf8');

// Bevroren gedragstraces, gegenereerd met core/concept2Programming.js op baseline 44692317.
const BASELINE_TRACES = {"programmed":{"steps":[{"handled":true,"state":"VERIFYING","reason":"frame_accepted_awaiting_verification"},{"verified":false,"reason":"duration_type_mismatch","state":null},{"verified":true,"reason":null,"state":"PROGRAMMED"},{"verified":false,"reason":"not_verifying","state":null},{"ok":true,"state":"PROGRAMMED","reason":null}],"states":["VALIDATING","ENCODING","WRITING","WAITING_RESPONSE","FRAME_ACCEPTED","VERIFYING","PROGRAMMED"],"writes":1},"timeout":{"steps":[{"handled":true,"state":"VERIFYING","reason":"frame_accepted_awaiting_verification"},{"verified":false,"reason":"incomplete_readback","state":null},{"verified":false,"reason":"workout_type_mismatch","state":null},{"verified":false,"reason":"distance_mismatch","state":null},{"ok":false,"state":"TIMEOUT","reason":"frame_accepted_but_not_verified"},{"verified":false,"reason":"not_verifying","state":null}],"states":["VALIDATING","ENCODING","WRITING","WAITING_RESPONSE","FRAME_ACCEPTED","VERIFYING","TIMEOUT"],"writes":1},"stale":{"steps":[{"handled":false,"reason":"stale_generation"},{"handled":false,"reason":"other_device"},{"handled":true,"state":"VERIFYING","reason":"frame_accepted_awaiting_verification"},{"verified":false,"reason":"stale_generation","state":null},{"verified":false,"reason":"other_device","state":null},{"ok":false,"state":"TIMEOUT","reason":"frame_accepted_but_not_verified"}],"states":["VALIDATING","ENCODING","WRITING","WAITING_RESPONSE","FRAME_ACCEPTED","VERIFYING","TIMEOUT"],"writes":1},"reject":{"steps":[{"handled":true,"state":"FAILED"},{"ok":false,"state":"FAILED","reason":"previous_frame_reject"}],"states":["VALIDATING","ENCODING","WRITING","WAITING_RESPONSE","FAILED"],"writes":1},"noresp":{"steps":[{"ok":false,"state":"TIMEOUT","reason":"no_response_within_timeout"}],"states":["VALIDATING","ENCODING","WRITING","WAITING_RESPONSE","TIMEOUT"],"writes":1},"cancel":{"steps":[{"ok":false,"state":"CANCELLED","reason":"disconnect"},{"verified":false,"reason":"not_verifying","state":null}],"states":["VALIDATING","ENCODING","WRITING","WAITING_RESPONSE","FRAME_ACCEPTED","VERIFYING","CANCELLED"],"writes":1}};

async function traces(PROG, CSAFE, C2L){
  const OK_F=(()=>{const c=[0x01];return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]);})();
  const REJ_F=(()=>{const c=[0x10];return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]);})();
  const rb=(t,d,dt)=>C2L.pm5RawToCanonical({workoutType:t,workoutDuration:d,workoutDurationType:dt});
  const CTX={connected:true,generation:3,deviceId:'DEV-A'};
  function mk(){ let timer=null; const states=[]; const writes=[];
    const c=PROG.createProgrammingController({csafe:CSAFE,write:b=>{writes.push(Array.from(b));return Promise.resolve();},now:()=>1000,
      setTimeoutFn:fn=>{timer=fn;return 1;},clearTimeoutFn:()=>{timer=null;},timeoutMs:5000});
    c.subscribe(s=>states.push(s.state));
    return {c,states,writes,fire:()=>{if(timer)timer();}}; }
  const pick=r=>r?{ok:r.ok,state:r.state,reason:r.reason}:null;
  const vr=r=>({verified:!!r.verified,reason:r.reason||null,state:r.state||null});
  const tick=async()=>{await Promise.resolve();await Promise.resolve();};
  const out={};
  const scen={
    programmed: async h=>{ const L=[]; const p=h.c.programFixedDistance(1000,CTX); await tick();
      L.push(h.c.handleControlResponse(OK_F,CTX));
      L.push(vr(h.c.verifyFromTelemetry(rb(0,0,0),CTX)));
      L.push(vr(h.c.verifyFromTelemetry(rb(2,1000,0x80),CTX)));
      L.push(vr(h.c.verifyFromTelemetry(rb(2,1000,0x80),CTX)));
      L.push(pick(await p)); return L; },
    timeout: async h=>{ const L=[]; const p=h.c.programFixedDistance(2000,CTX); await tick();
      L.push(h.c.handleControlResponse(OK_F,CTX));
      L.push(vr(h.c.verifyFromTelemetry({},CTX)));
      L.push(vr(h.c.verifyFromTelemetry(rb(1,2000,0x80),CTX)));
      L.push(vr(h.c.verifyFromTelemetry(rb(2,1000,0x80),CTX)));
      h.fire(); L.push(pick(await p));
      L.push(vr(h.c.verifyFromTelemetry(rb(2,2000,0x80),CTX))); return L; },
    stale: async h=>{ const L=[]; const p=h.c.programFixedDistance(1000,CTX); await tick();
      L.push(h.c.handleControlResponse(OK_F,{connected:true,generation:99,deviceId:'DEV-A'}));
      L.push(h.c.handleControlResponse(OK_F,{connected:true,generation:3,deviceId:'DEV-B'}));
      L.push(h.c.handleControlResponse(OK_F,CTX));
      L.push(vr(h.c.verifyFromTelemetry(rb(2,1000,0x80),{connected:true,generation:99,deviceId:'DEV-A'})));
      L.push(vr(h.c.verifyFromTelemetry(rb(2,1000,0x80),{connected:true,generation:3,deviceId:'DEV-B'})));
      h.fire(); L.push(pick(await p)); return L; },
    reject: async h=>{ const L=[]; const p=h.c.programFixedDistance(1000,CTX); await tick();
      L.push(h.c.handleControlResponse(REJ_F,CTX)); L.push(pick(await p)); return L; },
    noresp: async h=>{ const L=[]; const p=h.c.programFixedDistance(1000,CTX); await tick(); h.fire(); L.push(pick(await p)); return L; },
    cancel: async h=>{ const L=[]; const p=h.c.programFixedDistance(1000,CTX); await tick(); h.c.handleControlResponse(OK_F,CTX); h.c.cancel('disconnect'); L.push(pick(await p)); L.push(vr(h.c.verifyFromTelemetry(rb(2,1000,0x80),CTX))); return L; }
  };
  for(const k of Object.keys(scen)){ const h=mk(); const L=await scen[k](h); out[k]={steps:L,states:h.states,writes:h.writes.length}; }
  return out;
};


function loadProgFromSource(src) {
  const m = { exports: {} };
  new Function('module', 'exports', 'require', 'self', src)(m, m.exports, function (p) { return /concept2Csafe/.test(p) ? CSAFE : require(p); }, {});
  return m.exports;
}
function extractBlock(startMarker, endMarker) {
  const i = html.indexOf(startMarker), j = html.indexOf(endMarker, i);
  if (i < 0 || j < 0) return null;
  return html.slice(i, j + endMarker.length);
}
function fnBody(name) {
  const m = html.match(new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
  return m ? m[0] : null;
}
const OK_F = (() => { const c = [0x01]; return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]); })();
const rb = (t, d, dt) => C2L.pm5RawToCanonical({ workoutType: t, workoutDuration: d, workoutDurationType: dt });
const CTX = { connected: true, generation: 3, deviceId: 'DEV-A' };

async function run() {
  // ── A. gedrag identiek aan baseline ──
  const now = await traces(PROG, CSAFE, C2L);
  eq(JSON.stringify(now), JSON.stringify(BASELINE_TRACES), 'A1: states/resultaten/writes identiek aan baseline 44692317');
  Object.keys(BASELINE_TRACES).forEach(k => eq(now[k].writes, BASELINE_TRACES[k].writes, 'A2: ' + k + ': aantal CE060021-writes ongewijzigd'));
  eq(now.timeout.steps[4].reason, 'frame_accepted_but_not_verified', 'A3: timeout-reden ongewijzigd (geen succesbehandeling)');
  eq(PROG.DEFAULT_TIMEOUT_MS, 5000, 'A4: timeout ongewijzigd');

  // ── B. transparantie: recorder eruit -> identiek ──
  ok(progSrc.indexOf('return recordVerify(verifyCore(raw, ctx, seq), seq, wasPending);') > -1, 'B0: recorder-aanroep aanwezig');
  const bare = loadProgFromSource(progSrc.replace('return recordVerify(verifyCore(raw, ctx, seq), seq, wasPending);', 'return verifyCore(raw, ctx, seq);'));
  eq(JSON.stringify(await traces(bare, CSAFE, C2L)), JSON.stringify(now), 'B1: zonder diagnostiek-recorder exact dezelfde traces');
  ok(!/verifyDiag\.[a-zA-Z]+\s*(===|!==|<|>)/.test(progSrc.replace(/function recordVerify[\s\S]*?\n    \}\n/, '')), 'B2: verifyDiag wordt nergens buiten de recorder voor een beslissing gelezen');

  // ── C. reden zichtbaar na TIMEOUT, stale nog steeds afgewezen ──
  { let timer = null;
    const c = PROG.createProgrammingController({ csafe: CSAFE, write: () => Promise.resolve(), now: () => 1000,
      setTimeoutFn: fn => { timer = fn; return 1; }, clearTimeoutFn: () => { timer = null; }, timeoutMs: 5000 });
    const p = c.programFixedDistance(1000, CTX); await Promise.resolve(); await Promise.resolve();
    c.handleControlResponse(OK_F, CTX);
    eq(c.verifyFromTelemetry(rb(2, 1000, 0x80), { connected: true, generation: 99, deviceId: 'DEV-A' }).reason, 'stale_generation', 'C1: stale generation afgewezen');
    eq(c.verifyFromTelemetry(rb(2, 1000, 0x80), { connected: true, generation: 3, deviceId: 'DEV-B' }).reason, 'other_device', 'C2: ander device afgewezen');
    c.verifyFromTelemetry(rb(0, 0, 0), CTX);
    timer(); const r = await p;
    eq(r.state, 'TIMEOUT', 'C3: operatie loopt af op TIMEOUT');
    c.verifyFromTelemetry(rb(2, 1000, 0x80), CTX); c.verifyFromTelemetry(rb(2, 1000, 0x80), CTX);
    const d = c.getDiagnostics();
    eq(d.state, 'TIMEOUT', 'C4: state blijft TIMEOUT (late telemetrie bevestigt niet)');
    eq(d.verifyAttempts, 5, 'C5: verifyAttempts telt alle aanroepen, ook na timeout');
    eq(d.verifyAttemptsWhilePending, 3, 'C6: pogingen tijdens de operatie apart geteld');
    eq(d.lastPendingVerifyReason, 'duration_type_mismatch', 'C7: laatste reden tijdens de operatie behouden na TIMEOUT');
    eq(d.lastVerifyReason, 'not_verifying', 'C8: laatste reden overall zichtbaar');
    eq(d.verifyReasonCounts.stale_generation, 1, 'C9: stale_generation zichtbaar in de tellers');
    eq(d.verifyReasonCounts.other_device, 1, 'C10: other_device zichtbaar in de tellers');
    eq(d.lastResult.reason, 'frame_accepted_but_not_verified', 'C11: eindreden zichtbaar');
    eq(d.readbackWorkoutType, 0, 'C12: echte readback workoutType zichtbaar');
    eq(d.readbackDurationType, 0, 'C13: echte readback durationType zichtbaar');
    ok(typeof d.frameAcceptedTelemetrySeq === 'number' && typeof d.lastPendingVerifyTelemetrySeq === 'number', 'C14: telemetry-sequences zichtbaar');
    // nieuwe operatie reset uitsluitend de diag, niet het gedrag
    const p2 = c.programFixedDistance(1000, CTX); await Promise.resolve(); await Promise.resolve();
    eq(c.getDiagnostics().verifyAttempts, 0, 'C15: diag-tellers per operatie gereset');
    c.cancel('test'); await p2; }

  // ── D. transport: 0x31 en 0x32 afzonderlijk, met sequence en echte velden ──
  const U = s => ('ce0600' + s + '-43e5-11e4-916c-0800200c9a66');
  const dv = bytes => new DataView(new Uint8Array(bytes).buffer);
  const cbs = {}; let clock = 5000;
  const gw = { isEnabled: () => Promise.resolve(true), checkPermission: () => Promise.resolve('granted'), requestPermission: () => Promise.resolve('granted'),
    scan: () => Promise.resolve(), stopScan: () => Promise.resolve(), connect: () => Promise.resolve(), disconnect: () => Promise.resolve(),
    getServices: () => Promise.resolve([{ uuid: U('20'), characteristics: [{ uuid: U('22'), properties: { notify: true } }] }, { uuid: U('30'), characteristics: [{ uuid: U('80'), properties: { notify: true } }] }]),
    startNotifications: (id, svc, ch, cb) => { cbs[String(ch).toLowerCase()] = cb; return Promise.resolve(); },
    stopNotifications: () => Promise.resolve(), read: () => Promise.resolve(dv([1])), readRssi: () => Promise.resolve(-50), write: () => Promise.resolve() };
  const t = NT.makeNativeConcept2BleTransport({ gateway: gw, concept2Live: C2L, now: () => clock, setTimeoutFn: fn => { fn(); return 1; }, clearTimeoutFn: () => {} });
  await t.connect('rowerg', 'AA:BB:CC:11:22:33');
  const emitted = []; t.subscribeMetrics(e => emitted.push(e.metrics));
  const emit = b => { clock += 10; cbs[U('80')](dv(b)); };
  const p31 = [0x31, 0x39, 0x30, 0x00, 0x20, 0x4E, 0x00, 1, 0, 1, 1, 2, 0xE8, 0x03, 0x00, 0xD0, 0x07, 0x00, 0x80, 118];
  const p32 = [0x32, 0x39, 0x30, 0x00, 0x94, 0x11, 28, 255, 0xF8, 0x2A, 0xF8, 0x2A, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFA, 0x00, 0];
  emit(p31); emit(p32); emit(p32); emit([0x33, 1, 2]);
  const md = t.getMultiplexedDiagnostics();
  eq(md.totalNotifications, 4, 'D1: totaal multiplexed notifications');
  eq(md.byId['0x31'].count, 1, 'D2: 0x31 apart geteld');
  eq(md.byId['0x32'].count, 2, 'D3: 0x32 apart geteld');
  eq(md.byId['0x33'].count, 1, 'D4: overige packet-ID geteld');
  eq(md.globalSeq, 4, 'D5: globale sequence');
  eq(md.byId['0x31'].lastSeq, 1, 'D6: laatste 0x31 seq');
  eq(md.byId['0x32'].lastSeq, 3, 'D7: laatste 0x32 seq');
  eq(md.last31.seq, 1, 'D8: laatste echte 0x31 met seq');
  eq(md.last31.at, 5010, 'D9: laatste echte 0x31 met timestamp');
  eq(md.last32.seq, 3, 'D10: laatste echte 0x32 met seq');
  const f = md.last31.fields, dec = emitted[0];
  ['elapsedTimeS', 'distanceM', 'workoutType', 'workoutState', 'rowingState', 'workoutDuration', 'workoutDurationType', 'intervalType', 'dragFactor']
    .forEach(k => eq(f[k], dec[k], 'D11: 0x31.' + k + ' = productie-decoderoutput'));
  eq(f.workoutDuration, 2000, 'D12: workoutDuration rauw uit de decoder (geen schaling)');
  eq(f.workoutDurationType, 0x80, 'D13: durationType rauw');
  eq(emitted.length, 3, 'D14: emit-gedrag ongewijzigd (0x33 niet ge-emit)');
  ok(!/function decodeMux31[\s\S]*function decodeMux31/.test(fs.readFileSync(path.join(ROOT, 'native/src/nativeConcept2BleTransport.js'), 'utf8')), 'D15: geen tweede 0x31-decoder');

  // ── E/F/G/H. index.html-instrumentatie in sandbox ──
  const helpers = extractBlock('var _c2diag={', "window.tkC2LifecycleSnapshot=tkC2LifecycleSnapshot; }catch(_){}");
  ok(!!helpers, 'E0: diagnostische helperblok gevonden');
  ok(!/sessionLog\[[^\]]+\]\s*(\.[a-zA-Z0-9_]+)?\s*=[^=]/.test(helpers), 'F1: helpers schrijven nooit naar sessionLog');
  ok(!/writeSessionRow|sbPost|liveWorkoutToActual\(|createTrainingInstance|localStorage|indexedDB/.test(helpers), 'F2: helpers persisteren niets en roepen geen logging/converter aan');
  ok(!/_ergProtocol\[[^\]]+\]\s*=|\.instanceId\s*=[^=]|_c2rt\[[^\]]+\]\s*=|_c2pair\[[^\]]+\]\s*=/.test(helpers), 'F3: helpers muteren _ergProtocol/_c2rt/_c2pair niet');
  function world(opts) {
    opts = opts || {};
    const env = { sessionLog: {}, _c2pair: { roeien: { connected: true, mt: 'rowerg' } }, _c2rt: {}, _ergProtocol: { roeien: { type: 'distance', value: 1000, instanceId: 'I1' } },
      curT: 'losse', trainStart: 1, activeInstanceId: null, finishSessionBezig: false, _ivExec: null };
    const names = Object.keys(env).concat(['_c2rtGet', 'window']);
    const cons = fnBody('tkErgOnCanonicalMeasurement');
    const src = (opts.noHelpers ? '' : helpers + '\n') + (opts.throwing ? 'tkC2DiagOnCanonical=function(){throw new Error("boom")};\n' : '') + cons +
      '\nreturn {cons:tkErgOnCanonicalMeasurement, diag:(typeof _c2diag!=="undefined")?_c2diag:null, snap:(typeof tkC2LifecycleSnapshot!=="undefined")?tkC2LifecycleSnapshot:null, vcall:(typeof tkC2DiagVerifyCall!=="undefined")?tkC2DiagVerifyCall:null};';
    const r = new Function(...names, src)(...names.map(n => n === '_c2rtGet' ? (id => env._c2rt[id] || null) : (n === 'window' ? {} : env[n])));
    return Object.assign(r, { env });
  }
  { const w = world(), cm = C2L.normalizeLiveMetric({ distance_m: 250, elapsed_s: 60, watts: 180, stroke_rate_spm: 26, workout_state: 1 }, 'rowerg', {});
    w.cons('roeien', cm); w.cons('roeien', cm);
    ok(w.env.sessionLog.roeien.c2 === cm, 'F4: sessionLog[exId].c2 blijft exact de canonieke cm (zelfde object)');
    eq(Object.keys(w.env.sessionLog).join(','), 'roeien', 'F5: geen extra sessionLog-entries');
    eq(Object.keys(w.env.sessionLog.roeien).join(','), 'c2', 'F6: geen extra velden op sessionLog[exId]');
    eq(w.diag.canonicalCount, 2, 'F7: teller canonical measurements bereikt');
    ok(w.diag.lastCanonical !== cm && w.diag.lastCanonical.distanceM === 250, 'F8: diag bewaart een kopie, geen referentie/tweede route');
    const s = w.snap();
    eq(s.exercises.roeien.sessionLogC2Exists, true, 'F9: lifecycle toont dat sessionLog.c2 bestaat');
    eq(s.exercises.roeien.protocol.type, 'distance', 'F10: protocol zichtbaar');
    eq(s.exercises.roeien.protocol.locked, true, 'F11: vergrendeling (H4) meetbaar');
    eq(s.exercises.roeien.concept2SessionState, null, 'F12: geen verzonnen Concept2 session-state');
    eq(w.env._ergProtocol.roeien.instanceId, 'I1', 'F13: snapshot muteert _ergProtocol niet'); }
  { const w = world({ throwing: true }), cm = { distanceM: 1 };
    let threw = false; try { w.cons('roeien', cm); } catch (_) { threw = true; }
    ok(!threw && w.env.sessionLog.roeien.c2 === cm, 'G1: crashende recorder blokkeert de consumer niet (fail-open)'); }
  { const a = world(), b = world({ noHelpers: true }), cm = { distanceM: 7, elapsedTimeS: 3 };
    a.cons('x', cm); b.cons('x', cm);
    eq(JSON.stringify(a.env.sessionLog), JSON.stringify(b.env.sessionLog), 'H1: met of zonder diagnostiek identieke execution-state'); }

  // H1-meetbaarheid via echte transport-diag + echte controller
  { const w = world(); let tt = null;
    const c = PROG.createProgrammingController({ csafe: CSAFE, write: () => Promise.resolve(), now: () => clock, setTimeoutFn: fn => { tt = fn; return 1; }, clearTimeoutFn: () => {} });
    w.env._c2rt.roeien = { prog: c, agg: C2L.createPm5LiveAggregator() };
    const pp = c.programFixedDistance(1000, CTX); await Promise.resolve(); await Promise.resolve();
    clock += 10; c.handleControlResponse(OK_F, CTX);            // acceptatie NA de laatste 0x31 (seq 1)
    emit(p32);                                                   // verse 0x32, merged 0x31 is van vóór acceptatie
    const res = c.verifyFromTelemetry(rb(1, 0, 0), CTX);
    w.vcall('roeien', res, t);
    const lv = w.diag.lastVerifyCall;
    eq(lv.triggeredByPacket, '0x32', 'E1: verify-aanroep herkenbaar als getriggerd door 0x32');
    eq(lv.last31SeqAtCall, 1, 'E2: laatste echte 0x31 seq bij aanroep');
    eq(lv.last32SeqAtCall, 5, 'E3: laatste echte 0x32 seq bij aanroep');
    eq(lv.muxGlobalSeqAtCall, 5, 'E4: globale mux seq bij aanroep');
    eq(lv.last31BeforeFrameAcceptance, true, 'E5: stale merged 0x31 aantoonbaar (meetbaar, niet gerepareerd)');
    eq(w.diag.verifyCallsWith31BeforeAcceptance, 1, 'E6: teller stale-0x31-aanroepen');
    ok(typeof lv.controllerTelemetrySeq === 'number', 'E7: controller-seq gecorreleerd');
    eq(lv.reason, 'duration_type_mismatch', 'E8: reden bij aanroep');
    eq(c.getState(), 'VERIFYING', 'E9: diag-aanroep verandert de controllerstate niet');
    tt(); await pp; }

  // finishSession-markers: bridge-slice identiek met/zonder diagnostiek (H3 alleen meetbaar)
  { const fin = html.slice(html.indexOf('async function finishSession()'), html.indexOf('async function finishSession()') + 12000);
    ok(/tkC2DiagFinishCalled\(\)/.test(fin), 'H2: finishSession-aanroep wordt geobserveerd');
    ok(/tkC2DiagFinishEx\(ex\.id,l\); \}catch\(_dfe\)\{\} \/\* DIAG, fail-open \*\/if\(!l\)continue;/.test(fin), 'H3: lus-controleflow ongewijzigd (continue blijft)');
    ok(/if\(l\.cardio && CARDIO_TYPES\[l\.cardio\.type\] && \(l\.cardio\.time\|\|l\.cardio\.dist\|\|l\.cardio\.dist_km\|\|l\.cardio\.cals\)\)\{/.test(fin), 'H4: cardio-eligibility-guard ongewijzigd (H3 niet gerepareerd)');
    const _bs = html.indexOf('var _c2s=l.c2;'); const _be = html.indexOf('cRow=cardioDataToRow(l.cardio.type,l.cardio);', _bs);
    const bridge = html.slice(_bs, html.indexOf('}', _be) + 1);
    const stripped = bridge.split(/\r?\n/).filter(x => x.indexOf('tkC2DiagFinishPath') === -1).join('\n');
    const mk = src => (l, fn) => new Function('l', 'today', 't', 'activeInstanceId', 'liveWorkoutToActual', 'cardioDataToRow', 'tkC2DiagFinishPath',
      src + '\nreturn {row:cRow, viaC2:_c2ok};')(l, '2026-09-26', 'duur', 'I', C2L.liveWorkoutToActual, () => ({ __manual: true, extraNote: 'm' }), fn);
    const L = { cardio: { type: 'rowing', time: '07:00' }, c2: { machineType: 'rowerg', distanceM: 2000, elapsedTimeS: 420, watts: 240, strokeRateSPM: 30 } };
    const withDiag = mk(bridge)(JSON.parse(JSON.stringify(L)), () => {});
    const noDiag = mk(stripped)(JSON.parse(JSON.stringify(L)), undefined);
    const crash = mk(bridge)(JSON.parse(JSON.stringify(L)), () => { throw new Error('boom'); });
    eq(JSON.stringify(withDiag), JSON.stringify(noDiag), 'H5: Developer Mode/diag UIT geeft identieke rij (c2-pad)');
    eq(JSON.stringify(crash), JSON.stringify(noDiag), 'H6: crashende finish-recorder verandert de rij niet (fail-open)');
    const Lm = { cardio: { type: 'rowing', time: '07:00' } };
    eq(JSON.stringify(mk(bridge)(Lm, () => {})), JSON.stringify(mk(stripped)(Lm, undefined)), 'H7: identiek op het handmatige pad'); }

  // ── I. Developer Mode-weergave ──
  const DM = await import(path.join(ROOT, 'native/src/developerMode.mjs'));
  { const w = world(); w.cons('roeien', { distanceM: 10, machineType: 'rowerg' });
    const snapLc = w.snap();
    const fakeT = { VERSION: 'x', getMultiplexedDiagnostics: () => t.getMultiplexedDiagnostics(), getConnectionDiagnostics: () => ({ state: 'connected' }) };
    DM.setLifecycleSource(() => snapLc);
    DM.setProgrammingSource(() => ({ getDiagnostics: () => ({ state: 'TIMEOUT', verifyAttempts: 4, lastPendingVerifyReason: 'distance_mismatch', lastVerifyReason: 'not_verifying', readbackWorkoutType: 2, readbackWorkoutDuration: 999, readbackDurationType: 128, lastResult: { state: 'TIMEOUT', reason: 'frame_accepted_but_not_verified' } }) }));
    const txt = DM.diagnosticsToText(DM.buildDiagnosticsSnapshot(fakeT));
    ['Totaal multiplexed notifications: 5', '0x31: 1x', '0x32: 3x', 'Laatste echte 0x31 General Status', 'rowingState:', 'intervalType:', 'workoutDurationType: 128',
     'laatste reason distance_mismatch', 'readbackWorkoutDuration: 999', 'verifyFromTelemetry attempts: 4', 'frame_accepted_but_not_verified',
     'tkErgOnCanonicalMeasurement bereikt: 1x', 'Protocol: distance', 'sessionLog.c2: ja', 'finishSession() aangeroepen: 0x', 'Concept2 live/session state: -']
      .forEach(s => ok(txt.indexOf(s) > -1, 'I: Developer Mode toont "' + s + '"'));
    DM.setLifecycleSource(() => { throw new Error('x'); });
    let t2 = null; try { t2 = DM.diagnosticsToText(DM.buildDiagnosticsSnapshot(fakeT)); } catch (_) {}
    ok(typeof t2 === 'string' && t2.indexOf('Geen lifecycle-bron beschikbaar') > -1, 'I2: falende lifecycle-bron blokkeert het panel niet');
    DM.setLifecycleSource(null); DM.setProgrammingSource(null); }

  // ── J. sabotage: recorder weg -> observability-assertie faalt aantoonbaar ──
  { const sab = loadProgFromSource(progSrc.replace('return recordVerify(verifyCore(raw, ctx, seq), seq, wasPending);', 'return verifyCore(raw, ctx, seq);'));
    let tm = null;
    const c = sab.createProgrammingController({ csafe: CSAFE, write: () => Promise.resolve(), now: () => 1, setTimeoutFn: fn => { tm = fn; return 1; }, clearTimeoutFn: () => {} });
    const p = c.programFixedDistance(1000, CTX); await Promise.resolve(); await Promise.resolve(); c.handleControlResponse(OK_F, CTX);
    c.verifyFromTelemetry(rb(0, 0, 0), CTX); tm(); await p;
    ok(c.getDiagnostics().lastPendingVerifyReason === null, 'J1: sabotage gedetecteerd (zonder recorder geen reden na TIMEOUT)'); }

  console.log('\n[Concept2 Diagnostics Instrumentation] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (fail) process.exit(1);
}
run().catch(e => { console.log('MISLUKT: exception ' + (e && e.stack)); process.exit(1); });
