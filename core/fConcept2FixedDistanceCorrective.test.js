/* CONCEPT2 FIXED-DISTANCE CORRECTIVE (v4.70.2) — acceptance op basis van de real-device
 * capture (RowErg PM5 430621526, 500 m): frame f12103f4012124020000d0f2 werd "geaccepteerd"
 * (f18181f2) maar de PM5 veranderde niet; read-back bleef 3/0/128.
 *   FIX 1  units 0x24 (meters) i.p.v. 0x21 (km)
 *   FIX 2  GOINUSE (0x85) na SETPROGRAM
 *   FIX 3  PROGRAMMED alleen bij verse 0x31 (packet-sequence > acceptatie) met type ∈ {2,3}
 *          EN duration === gevraagde meters EN duration type 0x80
 *   FIX 4  GETSTATUS-vervolgframe: pas dat antwoord draagt de status van het programmeerframe
 * Sabotageblok onderaan bewijst dat de tests de reparaties raken. RESET wordt NIET getest
 * omdat hij bewust niet is toegevoegd (alleen: afwezig). */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const csafeSrc = fs.readFileSync(path.join(ROOT, 'core/concept2Csafe.js'), 'utf8');
const progSrc = fs.readFileSync(path.join(ROOT, 'core/concept2Programming.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// De ECHTE read-back-helper uit index.html (geen spiegel-implementatie), met Concept2Live in scope.
const readbackSrc = (html.match(/function tkC2ReadbackFromPacket\(evt, vctx\)\{[\s\S]*?\n\}/) || [''])[0];
const tkC2ReadbackFromPacket = readbackSrc ? new Function('Concept2Live', readbackSrc + '\nreturn tkC2ReadbackFromPacket;')(require(path.join(ROOT, 'core/concept2Live.js'))) : null;
const C2L = require(path.join(ROOT, 'core/concept2Live.js'));
const NT = require(path.join(ROOT, 'native/src/nativeConcept2BleTransport.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');
const hex = a => Array.from(a).map(b => (b < 16 ? '0' : '') + b.toString(16)).join(' ');
let finished = false;
process.on('exit', function (code) { if (!finished && code === 0) { console.log('MISLUKT: test eindigde zonder samenvatting (hangende promise)'); process.exitCode = 1; } });

function loadCsafe(src) { const m = { exports: {} }; new Function('module', 'exports', 'require', 'self', src)(m, m.exports, require, {}); return m.exports; }
function loadProg(src, csafe) { const m = { exports: {} }; new Function('module', 'exports', 'require', 'self', src)(m, m.exports, p => /concept2Csafe/.test(p) ? csafe : require(p), {}); return m.exports; }
function frame(CS, statusByte) { const c = [statusByte]; return [0xF1].concat(CS.stuff(c.concat([CS.checksum(c)]))).concat([0xF2]); }
const CTX = { connected: true, generation: 3, deviceId: 'DEV-A' };
const rb = (t, d, dt) => C2L.pm5RawToCanonical({ workoutType: t, workoutDuration: d, workoutDurationType: dt });

async function suite(CS, PROG) {
  const R = {};
  const OK = frame(CS, 0x01), REJ = frame(CS, 0x11), BAD = frame(CS, 0x21), NR = frame(CS, 0x31);
  // ── FIX 1/2: encoder ──
  const f = CS.buildFixedDistanceWorkout(500).frame;
  R.hex500 = hex(f);
  R.unit = f[5];
  R.goinuseIdx = f.indexOf(0x85); R.setprogIdx = f.indexOf(0x24, 6);
  let x = 0; f.slice(1, f.length - 2).forEach(v => { x ^= v; }); R.cksumIndep = (x === f[f.length - 2]);
  R.hasReset = f.indexOf(0x81) !== -1;
  // ── controller-harnas ──
  function mk() {
    const writes = []; let timer = null;
    const c = PROG.createProgrammingController({ csafe: CS, write: b => { writes.push(Array.from(b)); return Promise.resolve(); },
      now: () => 1000, setTimeoutFn: fn => { timer = fn; return 1; }, clearTimeoutFn: () => { timer = null; }, timeoutMs: 5000 });
    return { c, writes, fire: () => { if (timer) timer(); } };
  }
  const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
  async function armed(dist, ackCtx) {
    const h = mk(); h.p = h.c.programFixedDistance(dist || 500, CTX); await tick();
    h.direct = h.c.handleControlResponse(OK, CTX);
    h.ack = h.c.handleControlResponse(OK, ackCtx || Object.assign({}, CTX, { muxSeq: 40 }));
    return h;
  }
  const P31 = (seq, o) => Object.assign({}, CTX, { packetId: '0x31', packetSeq: seq }, o || {});
  async function readback(t, d, dt, dist) {
    const h = await armed(dist || 500);
    const r = h.c.verifyFromTelemetry(rb(t, d, dt), P31(41));
    if (h.c.getState() !== 'PROGRAMMED') h.fire();
    const res = await h.p;
    return { verified: !!r.verified, reason: r.reason || null, state: res.state };
  }
  R.rb_2_500 = await readback(2, 500, 0x80);
  R.rb_3_500 = await readback(3, 500, 0x80);
  R.rb_3_0 = await readback(3, 0, 0x80);           // gemeten beginstate op de hardware
  R.rb_2_0 = await readback(2, 0, 0x80);
  R.rb_wrongDist = await readback(3, 1000, 0x80);
  R.rb_wrongDt = await readback(3, 500, 0x00);
  R.rb_type4 = await readback(4, 500, 0x80);
  // stale/pre-acceptance 0x31 (packetSeq <= acceptatie-sequence)
  { const h = await armed(500);
    R.stale31 = h.c.verifyFromTelemetry(rb(3, 500, 0x80), P31(40)).reason;
    R.stale31b = h.c.verifyFromTelemetry(rb(3, 500, 0x80), P31(12)).reason;
    R.no31id = h.c.verifyFromTelemetry(rb(3, 500, 0x80), Object.assign({}, CTX, { packetId: '0x32', packetSeq: 41 })).reason;
    R.noSeq = h.c.verifyFromTelemetry(rb(3, 500, 0x80), Object.assign({}, CTX, { packetId: '0x31' })).reason;
    h.fire(); R.staleEnd = (await h.p).state; }
  // acceptatie zonder mux-sequence -> fail closed
  { const h = await armed(500, CTX);
    R.noAccSeq = h.c.verifyFromTelemetry(rb(3, 500, 0x80), P31(99)).reason; h.fire(); await h.p; }
  // verkeerd device / generation (ack én read-back)
  { const h = mk(); const p = h.c.programFixedDistance(500, CTX); await tick();
    h.c.handleControlResponse(OK, CTX);
    R.ackGen = h.c.handleControlResponse(OK, Object.assign({}, CTX, { generation: 99, muxSeq: 40 })).reason;
    R.ackDev = h.c.handleControlResponse(OK, Object.assign({}, CTX, { deviceId: 'DEV-B', muxSeq: 40 })).reason;
    h.c.handleControlResponse(OK, Object.assign({}, CTX, { muxSeq: 40 }));
    R.rbGen = h.c.verifyFromTelemetry(rb(3, 500, 0x80), P31(41, { generation: 99 })).reason;
    R.rbDev = h.c.verifyFromTelemetry(rb(3, 500, 0x80), P31(42, { deviceId: 'DEV-B' })).reason;
    h.fire(); R.isoEnd = (await p).state; }
  // Reject/Bad/Not Ready: direct en via GETSTATUS
  for (const [k, fr] of [['REJ', REJ], ['BAD', BAD], ['NR', NR]]) {
    { const h = mk(); const p = h.c.programFixedDistance(500, CTX); await tick();
      h.c.handleControlResponse(fr, CTX); h.fire(); const r = await p; R['direct' + k] = [r.ok, r.state, r.reason, h.writes.length]; }
    { const h = mk(); const p = h.c.programFixedDistance(500, CTX); await tick();
      h.c.handleControlResponse(OK, CTX); h.c.handleControlResponse(fr, Object.assign({}, CTX, { muxSeq: 40 }));
      h.c.verifyFromTelemetry(rb(3, 500, 0x80), P31(41)); h.fire(); const r = await p; R['ack' + k] = [r.ok, r.state, r.reason]; }
  }
  // alleen direct f18181f2 is niet zelfstandig voldoende
  { const h = mk(); const p = h.c.programFixedDistance(500, CTX); await tick();
    const d = h.c.handleControlResponse(OK, CTX);
    R.directOnlyState = d.state;
    R.directOnlyVerify = h.c.verifyFromTelemetry(rb(3, 500, 0x80), P31(999)).reason;
    R.getstatusHex = hex(h.writes[1] || []);
    h.fire(); const r = await p; R.directOnly = [r.ok, r.state, r.reason]; }
  // geen response / timeouts blijven failure
  { const h = mk(); const p = h.c.programFixedDistance(500, CTX); await tick(); h.fire(); const r = await p; R.noResp = [r.ok, r.state, r.reason]; }
  { const h = await armed(500); h.fire(); const r = await h.p; R.noReadback = [r.ok, r.state, r.reason]; }
  // ── verse 0x32 + stale 0x31 via de ECHTE transport en een productie-gelijke callback ──
  { const U = s => ('ce0600' + s + '-43e5-11e4-916c-0800200c9a66');
    const dv = bytes => new DataView(new Uint8Array(bytes).buffer); const cbs = {};
    const gw = { isEnabled: () => Promise.resolve(true), checkPermission: () => Promise.resolve('granted'), requestPermission: () => Promise.resolve('granted'),
      scan: () => Promise.resolve(), stopScan: () => Promise.resolve(), connect: () => Promise.resolve(), disconnect: () => Promise.resolve(),
      getServices: () => Promise.resolve([{ uuid: U('20'), characteristics: [{ uuid: U('22'), properties: { notify: true } }, { uuid: U('21'), properties: { write: true } }] }, { uuid: U('30'), characteristics: [{ uuid: U('80'), properties: { notify: true } }] }]),
      startNotifications: (id, svc, ch, cb) => { cbs[String(ch).toLowerCase()] = cb; return Promise.resolve(); },
      stopNotifications: () => Promise.resolve(), read: () => Promise.resolve(dv([1])), readRssi: () => Promise.resolve(-50), write: () => Promise.resolve() };
    const t = NT.makeNativeConcept2BleTransport({ gateway: gw, concept2Live: C2L, now: () => 1000, setTimeoutFn: fn => { fn(); return 1; }, clearTimeoutFn: () => {} });
    await t.connect('rowerg', 'AA:BB:CC:11:22:33');
    let timer = null;
    const c = PROG.createProgrammingController({ csafe: CS, write: b => t.writeControlFrame(b), now: () => 1000, setTimeoutFn: fn => { timer = fn; return 1; }, clearTimeoutFn: () => { timer = null; }, timeoutMs: 5000 });
    t.setControlResponseHandler((bytes, ctx) => c.handleControlResponse(bytes, ctx));
    const agg = C2L.createPm5LiveAggregator();
    t.subscribeMetrics(evt => {                       // gebruikt de echte index.html-helper (FIX 3)
      agg.push((evt && evt.metrics) || {}, 'rowerg', {});
      const vctx = t.getControlContext();
      c.verifyFromTelemetry(tkC2ReadbackFromPacket(evt, vctx), vctx);
    });
    const p31 = (t_, dur, dt) => [0x31, 0x39, 0x30, 0x00, 0, 0, 0, t_, 0, 0, 0, 0, 0, 0, 0, dur & 255, (dur >> 8) & 255, 0, dt, 118];
    const p32 = [0x32, 0x39, 0x30, 0x00, 0x94, 0x11, 28, 255, 0xF8, 0x2A, 0xF8, 0x2A, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFA, 0x00, 0];
    const p = c.programFixedDistance(500, t.getControlContext()); await tick();
    cbs[U('80')](dv(p31(3, 500, 0x80)));            // matchende 0x31 VÓÓR acceptatie
    cbs[U('22')](dv(OK)); cbs[U('22')](dv(OK));      // direct + GETSTATUS
    cbs[U('80')](dv(p32));                           // verse 0x32; merged state bevat de oude 0x31
    R.fresh32Stale31 = c.getState();
    R.fresh32Reason = c.getDiagnostics().lastPendingVerifyReason;
    agg.getMergedRaw();                              // merged 0x31 zou matchen -- mag niet tellen
    R.mergedWouldMatch = agg.getMergedRaw().workout_duration_readback === 500;
    cbs[U('80')](dv(p31(3, 500, 0x80)));            // echte verse 0x31 na acceptatie
    R.freshAfter = c.getState();
    R.muxAccepted = c.getDiagnostics().acceptedMuxSeq; R.pktSeq = c.getDiagnostics().readbackPacketSeq;
    if (c.getState() !== 'PROGRAMMED' && timer) timer();
    const r = await p; R.transportEnd = r.state; }
  return R;
}

(async function run() {
  const CS = loadCsafe(csafeSrc), PROG = loadProg(progSrc, CS);
  const R = await suite(CS, PROG);
  // FIX 1/2
  eq(R.hex500, 'f1 21 03 f4 01 24 24 02 00 00 85 50 f2', '500 m: kandidaatvector');
  eq(R.unit, 0x24, 'FIX1: 500 m encodeert met units 0x24 (meters)');
  ok(R.cksumIndep, 'FIX1/2: checksum onafhankelijk nagerekend (XOR van de frame-inhoud)');
  ok(R.goinuseIdx > R.setprogIdx && R.setprogIdx > 0, 'FIX2: GOINUSE aanwezig en NA SETPROGRAM');
  ok(R.hex500 !== 'f1 21 03 f4 01 21 24 02 00 00 d0 f2', 'FIX1: oude 0x21-vector (hardware-weerlegd) wordt niet gebouwd');
  ok(!R.hasReset, 'RESET is bewust NIET toegevoegd');
  // FIX 3
  ok(R.rb_2_500.verified && R.rb_2_500.state === 'PROGRAMMED', 'FIX3: read-back 2/500/128 slaagt');
  ok(R.rb_3_500.verified && R.rb_3_500.state === 'PROGRAMMED', 'FIX3: read-back 3/500/128 slaagt');
  ok(!R.rb_3_0.verified && R.rb_3_0.state === 'TIMEOUT' && R.rb_3_0.reason === 'distance_mismatch', 'FIX3: gemeten beginstate 3/0/128 faalt');
  ok(!R.rb_2_0.verified && R.rb_2_0.reason === 'distance_mismatch', 'FIX3: 2/0/128 faalt');
  ok(!R.rb_wrongDist.verified && R.rb_wrongDist.reason === 'distance_mismatch', 'FIX3: verkeerde afstand faalt');
  ok(!R.rb_wrongDt.verified && R.rb_wrongDt.reason === 'duration_type_mismatch', 'FIX3: verkeerd duration type faalt');
  ok(!R.rb_type4.verified && R.rb_type4.reason === 'workout_type_mismatch', 'FIX3: type buiten {2,3} faalt');
  eq(R.stale31, 'stale_packet_before_acceptance', 'FIX3: 0x31 met sequence = acceptatie faalt');
  eq(R.stale31b, 'stale_packet_before_acceptance', 'FIX3: pre-programming 0x31 faalt');
  eq(R.no31id, 'readback_not_0x31', 'FIX3: read-back uit een 0x32 telt nooit');
  eq(R.noSeq, 'no_packet_seq', 'FIX3: 0x31 zonder packet-sequence faalt (fail closed)');
  eq(R.staleEnd, 'TIMEOUT', 'FIX3: stale read-back eindigt in TIMEOUT');
  eq(R.noAccSeq, 'no_acceptance_packet_seq', 'FIX3: acceptatie zonder mux-sequence -> nooit PROGRAMMED');
  eq(R.fresh32Stale31, 'VERIFYING', 'FIX3: verse 0x32 + stale 0x31 (via echte transport) -> geen PROGRAMMED');
  eq(R.fresh32Reason, 'readback_not_0x31', 'FIX3: reden bij verse 0x32');
  ok(R.mergedWouldMatch, 'FIX3: (controle) de merged state bevatte wél een matchende oude 0x31');
  eq(R.freshAfter, 'PROGRAMMED', 'FIX3: pas een echte verse 0x31 na acceptatie -> PROGRAMMED');
  ok(typeof R.muxAccepted === 'number' && R.pktSeq > R.muxAccepted, 'FIX3: read-back packet-seq > acceptatie-seq (diagnostiek)');
  eq(R.transportEnd, 'PROGRAMMED', 'FIX3: transport-E2E eindigt PROGRAMMED');
  // device/generation
  eq(R.ackGen, 'stale_generation', 'ISO: GETSTATUS-antwoord uit andere generation genegeerd');
  eq(R.ackDev, 'other_device', 'ISO: GETSTATUS-antwoord van ander device genegeerd');
  eq(R.rbGen, 'stale_generation', 'ISO: read-back uit andere generation faalt');
  eq(R.rbDev, 'other_device', 'ISO: read-back van ander device faalt');
  eq(R.isoEnd, 'TIMEOUT', 'ISO: eindigt zonder PROGRAMMED');
  // FIX 4
  eq(JSON.stringify(R.directREJ), JSON.stringify([false, 'FAILED', 'previous_frame_reject', 1]), 'FIX4: direct Reject -> FAILED, geen GETSTATUS');
  eq(JSON.stringify(R.directBAD), JSON.stringify([false, 'FAILED', 'previous_frame_bad', 1]), 'FIX4: direct Bad -> FAILED');
  eq(JSON.stringify(R.directNR), JSON.stringify([false, 'TIMEOUT', 'no_response_within_timeout', 1]), 'FIX4: direct Not Ready -> geen succes (timeout)');
  eq(JSON.stringify(R.ackREJ), JSON.stringify([false, 'FAILED', 'ack_previous_frame_reject']), 'FIX4: GETSTATUS meldt Reject -> FAILED, ook met matchende 0x31');
  eq(JSON.stringify(R.ackBAD), JSON.stringify([false, 'FAILED', 'ack_previous_frame_bad']), 'FIX4: GETSTATUS meldt Bad -> FAILED');
  eq(JSON.stringify(R.ackNR), JSON.stringify([false, 'TIMEOUT', 'ack_not_ready']), 'FIX4: GETSTATUS meldt Not Ready -> geen succes');
  eq(R.directOnlyState, 'AWAITING_ACK', 'FIX4: direct f18181f2 -> nog geen acceptatie');
  eq(R.directOnlyVerify, 'not_verifying', 'FIX4: matchende 0x31 na alleen direct Ok telt niet');
  eq(R.getstatusHex, 'f1 80 80 f2', 'FIX4: vervolgframe is GETSTATUS');
  eq(JSON.stringify(R.directOnly), JSON.stringify([false, 'TIMEOUT', 'no_ack_within_timeout']), 'FIX4: zonder GETSTATUS-antwoord -> TIMEOUT');
  eq(JSON.stringify(R.noResp), JSON.stringify([false, 'TIMEOUT', 'no_response_within_timeout']), 'geen response -> TIMEOUT (failure)');
  eq(JSON.stringify(R.noReadback), JSON.stringify([false, 'TIMEOUT', 'frame_accepted_but_not_verified']), 'geaccepteerd zonder read-back -> TIMEOUT (failure)');
  eq(require(path.join(ROOT, 'core/concept2Programming.js')).DEFAULT_TIMEOUT_MS, 5000, 'timeout ongewijzigd (5000 ms)');
  // productie-wiring
  ok(/_rt\.prog\.verifyFromTelemetry\(tkC2ReadbackFromPacket\(evt,_vctx\), _vctx\)/.test(html) && !/verifyFromTelemetry\(_rt\.agg\.getMergedRaw\(\)/.test(html), 'WIRING: index.html verifieert met de read-back van het packet zelf (nooit merged state)');
  ok(typeof tkC2ReadbackFromPacket === 'function' && /Concept2Live\.pm5RawToCanonical\(pkt\)/.test(readbackSrc), 'WIRING: echte helper tkC2ReadbackFromPacket geëxtraheerd en gebruikt');
  ok(/raw\.packetSeq = muxDiag\.globalSeq;/.test(fs.readFileSync(path.join(ROOT, 'native/src/nativeConcept2BleTransport.js'), 'utf8')), 'WIRING: transport stempelt elke multiplexed notificatie met packetSeq');

  // Developer Mode toont de acknowledgement (#464-diagnostiek uitgebreid)
  { const DM = await import(path.join(ROOT, 'native/src/developerMode.mjs'));
    DM.setProgrammingSource(() => ({ getDiagnostics: () => ({ state: 'VERIFYING', directResponseHex: 'f18181f2', directPreviousFrameStatus: 'ok',
      ackFrameHex: 'f18080f2', ackWriteAttempted: 1, ackWriteCompleted: 1, ackResponseHex: 'f10505f2', ackPreviousFrameStatus: 'ok', ackStateMachineState: 'in_use',
      acceptedMuxSeq: 40, readbackPacketId: '0x31', readbackPacketSeq: 41, acceptedWorkoutTypes: [2, 3] }) }));
    const txt = DM.diagnosticsToText(DM.buildDiagnosticsSnapshot({ VERSION: 'x', getConnectionDiagnostics: () => ({ state: 'connected' }) }));
    ['CSAFE acknowledgement (GETSTATUS)', 'GETSTATUS frame: f18080f2', 'Status programmeerframe (via GETSTATUS): ok · PM state in_use', 'Acceptatie mux-seq: 40 · read-back packet 0x31 seq 41', 'Toegestane workout types: 2/3']
      .forEach(t => ok(txt.indexOf(t) > -1, 'DEV: Developer Mode toont "' + t + '"'));
    DM.setProgrammingSource(null); }

  // ── SABOTAGE / BUG-REVERSAL ──
  const sab = [
    ['unit terug naar 0x21', { csafe: s => s.replace('var UNITS = { METERS: 0x24 };', 'var UNITS = { METERS: 0x21 };') }, R2 => R2.unit !== 0x24],
    ['GOINUSE weg', { csafe: s => s.replace(".concat(encodeShortCommand(CMD.GOINUSE))", "") }, R2 => R2.goinuseIdx === -1],
    ['duration-check weg', { prog: s => s.replace("if (Number(d) !== Number(pending.requestedDistanceM)) return { verified: false, reason: 'distance_mismatch' };", "") }, R2 => R2.rb_3_0.verified === true],
    ['duration-type-check weg', { prog: s => s.replace("if (Number(dt) !== DURATION_TYPE_DISTANCE) return { verified: false, reason: 'duration_type_mismatch' };", "") }, R2 => R2.rb_wrongDt.verified === true],
    ['packet-versheid weg', { prog: s => s.replace("if (Number(ctx.packetSeq) <= pending.acceptedMuxSeq) return { verified: false, reason: 'stale_packet_before_acceptance' };", "") }, R2 => R2.stale31 !== 'stale_packet_before_acceptance'],
    ['0x31-identiteit weg', { prog: s => s.replace("if (ctx.packetId !== '0x31') return { verified: false, reason: 'readback_not_0x31' };", "") }, R2 => R2.no31id !== 'readback_not_0x31'],
    ['GETSTATUS overgeslagen (direct Ok = acceptatie)', { prog: s => s.replace("      sendAck(op);\n      return { handled: true, state: state, reason: 'direct_ok_awaiting_ack' };", "      op.frameAcceptedAt = now(); op.frameAcceptedSeq = telemetrySeq; op.acceptedMuxSeq = (ctx.muxSeq != null) ? Number(ctx.muxSeq) : 0; setState(STATE.VERIFYING);\n      return { handled: true, state: STATE.VERIFYING, reason: 'frame_accepted_awaiting_verification' };") }, R2 => R2.directOnlyState !== 'AWAITING_ACK'],
    ['type-eis terug naar alleen 2', { prog: s => s.replace("var DURATION_TYPE_DISTANCE = 0x80, DEFAULT_ACCEPTED_TYPES = [2, 3];", "var DURATION_TYPE_DISTANCE = 0x80, DEFAULT_ACCEPTED_TYPES = [2];"), csafe: s => s.replace("acceptedWorkoutTypes: [WORKOUT_TYPE.FIXEDDIST_NOSPLITS, WORKOUT_TYPE.FIXEDDIST_SPLITS],", "acceptedWorkoutTypes: [WORKOUT_TYPE.FIXEDDIST_NOSPLITS],") }, R2 => R2.rb_3_500.verified === false]
  ];
  for (const [name, mut, detects] of sab) {
    const cs2 = mut.csafe ? mut.csafe(csafeSrc) : csafeSrc, pr2 = mut.prog ? mut.prog(progSrc) : progSrc;
    if (cs2 === csafeSrc && pr2 === progSrc) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
    if ((mut.csafe && cs2 === csafeSrc) || (mut.prog && pr2 === progSrc)) { ok(false, 'SABOTAGE deels niet toepasbaar: ' + name); continue; }
    let R2 = null; try { const CS2 = loadCsafe(cs2); R2 = await suite(CS2, loadProg(pr2, CS2)); } catch (e) { R2 = null; }
    ok(R2 !== null && detects(R2), 'SABOTAGE gedetecteerd via assertie: ' + name);
  }
  finished = true;
  console.log('\n[Concept2 fixed-distance corrective] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('MISLUKT: exception ' + (e && e.stack)); process.exit(1); });
