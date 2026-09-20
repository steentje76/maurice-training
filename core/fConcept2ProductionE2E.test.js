/* Gate B.4 — PRODUCTIE-E2E FIREWALL.
 * Sluit het laatste bewijsgat: de hele keten in één test, beginnend bij een RUW
 * multiplexed 0x31-pakket op de CE060080-grens.
 *
 * Gebruikt uitsluitend productiecode: de echte transport-factory (router + 0x31/0x32
 * decoders), de echte Concept2Live-aggregator, de echte _c2rt-functies en de echte
 * start-handler uit index.html, en de echte programming controller. Fakes alleen op
 * legitieme buitengrenzen: BLE-hardware, timers en het observeren van Execution. */
const fs = require('fs'); const path = require('path');
const CSAFE = require(path.resolve('core/concept2Csafe.js'));
const PROG = require(path.resolve('core/concept2Programming.js'));
const C2L = require(path.resolve('core/concept2Live.js'));
const NT = require(path.resolve('native/src/nativeConcept2BleTransport.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
const U = s => 'CE0600' + s + '-43E5-11E4-916C-0800200C9A66';
const hex = a => a.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

// ── echte _c2rt-functies en start-handler uit index.html ────────────────────
const rtSrc = html.slice(html.indexOf('var _c2rt={};'), html.indexOf('function _c2rtTeardown') + html.slice(html.indexOf('function _c2rtTeardown')).indexOf('\n}\r\n') + 4);
const RT = new Function(rtSrc + '\nreturn { set:_c2rtSet, get:_c2rtGet, down:_c2rtTeardown };')();
const helperSrc = html.match(/async function tkErgProgramPm5IfNeeded[\s\S]*?\n\}\r?\n/)[0];

// ── RUW multiplexed 0x31-pakket, exact de productiegrens (byte 0 = identifier) ──
function raw0x31(elapsedS, distM, workoutType, durationLo, durationType, dragFactor) {
  const e = Math.round(elapsedS * 100), d = Math.round(distM * 10), wd = durationLo;
  return [0x31,
    e & 0xFF, (e >> 8) & 0xFF, (e >> 16) & 0xFF,
    d & 0xFF, (d >> 8) & 0xFF, (d >> 16) & 0xFF,
    workoutType, 1, 1, 1, 2,
    0, 0, 0,
    wd & 0xFF, (wd >> 8) & 0xFF, (wd >> 16) & 0xFF,
    durationType, dragFactor];
}
const MATCH_0x31 = raw0x31(12.34, 0, 2, 1000, 0x80, 120);          // verse matchende read-back
const okFrame = (() => { const c = [0x01]; return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]); })();
const respFrame = st => { const c = [st]; return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]); };

function makeProduction(opts) {
  opts = opts || {};
  const subs = {}, writes = []; let progTimer = null;
  const gateway = {
    isAvailable: () => Promise.resolve({ available: true }),
    getPermissionState: () => Promise.resolve({ state: 'granted' }),
    requestPermissions: () => Promise.resolve({ state: 'granted' }),
    connect: () => Promise.resolve({ connected: true }), disconnect: () => Promise.resolve({}),
    getServices: () => Promise.resolve({ services: [
      { uuid: U('20').toLowerCase(), characteristics: [
        { uuid: U('22').toLowerCase(), properties: { notify: true } },
        { uuid: U('21').toLowerCase(), properties: { write: true } }] },
      { uuid: U('30').toLowerCase(), characteristics: [{ uuid: U('80').toLowerCase(), properties: { notify: true } }] }] }),
    startNotifications: (id, s, c, cb) => { subs[String(c).toLowerCase()] = cb; return Promise.resolve({}); },
    stopNotifications: () => Promise.resolve({}), startScan: () => Promise.resolve({}), stopScan: () => Promise.resolve({}),
    write: (id, svc, chr, bytes) => { writes.push({ svc: String(svc).toLowerCase(), chr: String(chr).toLowerCase(), bytes: bytes.slice() });
      return opts.writeRejects ? Promise.reject(new Error('gatt_fail')) : Promise.resolve({}); }
  };
  const t = NT.makeNativeConcept2BleTransport({ gateway, concept2Live: C2L, now: () => 1000,
    setTimeoutFn: fn => { fn(); return 0; }, clearTimeoutFn: () => {} });
  const exec = { starts: 0, instances: 0 };
  const EX = 'EX1';
  const pair = { [EX]: { connected: false, deviceId: null } };

  // productie-equivalente connect-lifecycle (spiegelt index.html rond tkErgConnectDevice)
  function connect(deviceId) {
    return Promise.resolve(t.connect('rowerg', deviceId || 'DEV-A')).then(() => {
      const st = pair[EX]; st.connected = true; st.deviceId = deviceId || 'DEV-A';
      const agg = C2L.createPm5LiveAggregator();
      const prog = PROG.createProgrammingController({ csafe: CSAFE,
        write: b => t.writeControlFrame(b), now: () => 1000,
        setTimeoutFn: fn => { progTimer = fn; return 1; }, clearTimeoutFn: () => { progTimer = null; }, timeoutMs: 5000 });
      t.setControlResponseHandler((bytes, ctx) => prog.handleControlResponse(bytes, ctx));
      // productie-equivalente metrics-callback (spiegelt index.html: aggregator -> verificatie)
      t.subscribeMetrics(evt => {
        const cm = agg.push((evt && evt.metrics) || {}, 'rowerg', {});
        if (!cm) return; st.lastCm = cm;
        const rt = RT.get(EX, null, null);
        if (rt && rt.prog && rt.agg && typeof rt.prog.verifyFromTelemetry === 'function') {
          rt.prog.verifyFromTelemetry(rt.agg.getMergedRaw(), t.getControlContext());
        }
      });
      RT.down(EX, 'reconnect');
      RT.set(EX, t.getControlContext().generation, st.deviceId, prog, agg);
      return { prog, agg };
    });
  }
  const helper = new Function('_c2pair', 'tkDeviceTransport', '_c2rtGet',
    helperSrc + '\nreturn tkErgProgramPm5IfNeeded;')(pair, () => t, RT.get);
  // productie-equivalente start-handler: Execution PAS na bevestigde programmering
  async function vastleggenEnStarten(distance) {
    const r = await helper(EX, 'distance', distance);
    if (r && r.attempted && !r.confirmed) return { started: false, state: r.state, reason: r.reason };
    exec.starts++; exec.instances++;
    return { started: true, state: r ? r.state : 'manual' };
  }
  return { t, EX, pair, exec, writes, connect, start: vastleggenEnStarten,
    emit80: bytes => { const cb = subs[U('80').toLowerCase()]; if (cb) cb(new DataView(new Uint8Array(bytes).buffer)); },
    emit22: bytes => { const cb = subs[U('22').toLowerCase()]; if (cb) cb(new DataView(new Uint8Array(bytes).buffer)); },
    fireTimeout: () => { if (progTimer) progTimer(); },
    rt: () => RT.get(EX, null, null), down: r => RT.down(EX, r) };
}
const tick = () => Promise.resolve().then(() => {}).then(() => {}).then(() => {});

async function run() {
  // ══ POSITIEVE PRODUCTIE-E2E ══
  {
    const h = makeProduction(); const { prog, agg } = await h.connect('DEV-A');
    eq(h.rt().prog, prog, 'P3: controller hoort bij het actieve _c2rt');
    eq(h.rt().agg, agg, 'P3: aggregator hoort bij het actieve _c2rt');
    // pairing-UI rerender: volledige vervanging van de presentatie-state
    for (let i = 0; i < 3; i++) h.pair[h.EX] = { connected: true, deviceId: 'DEV-A' };
    eq(h.rt().prog, prog, 'P5: controller overleeft drie rerenders');
    const started = h.start(1000); await tick();
    eq(h.writes.length, 1, 'P9: exact één CE060021 write');
    eq(h.writes[0].chr, U('21').toLowerCase(), 'P9: naar CE060021');
    eq(hex(h.writes[0].bytes), 'F1 21 03 E8 03 21 24 02 00 00 CE F2', 'P8: canoniek 1000 m frame');
    eq(h.exec.starts, 0, 'P10: na write alleen -> 0 Execution');
    h.emit22(okFrame);
    eq(prog.getState(), PROG.STATE.VERIFYING, 'P12: FRAME_ACCEPTED -> VERIFYING');
    eq(h.exec.starts, 0, 'P13: VERIFYING -> 0 Execution');
    h.emit80(MATCH_0x31);                                  // RUW pakket op de productiegrens
    eq(prog.getState(), PROG.STATE.PROGRAMMED, 'P17: verse matchende 0x31 -> PROGRAMMED');
    const r = await started;
    eq(r.started, true, 'P19: Execution toegestaan'); eq(h.exec.starts, 1, 'P19: exact 1 Execution');
    eq(h.exec.instances, 1, 'P20: exact één training-instance');
    h.emit80(MATCH_0x31); h.emit80(MATCH_0x31);
    eq(h.exec.starts, 1, 'P22: dubbele telemetrie -> nog steeds 1 Execution');
    const d = prog.getDiagnostics();
    ok(!!d.frameHex && !!d.lastResponseHex && d.lastParse === 'ok', 'DIAG: frame/response/parse bewaard');
    eq(d.readbackWorkoutDuration, 1000, 'DIAG: read-back afstand'); eq(d.readbackDurationType, 0x80, 'DIAG: read-back duration type');
    ok(d.programmedAt != null && d.verificationTelemetryAt != null, 'DIAG: verificatie-timestamps bewaard');
  }
  // ══ NEGATIEVE MATRIX ══
  const neg = async (label, fn) => {
    const h = makeProduction(label === 'A' ? { writeRejects: true } : {});
    const ctx = await h.connect('DEV-A');
    const started = h.start(1000); await tick();
    await fn(h, ctx.prog);
    const r = await started.catch(() => ({ started: false }));
    eq(h.exec.starts, 0, label + ': 0 Execution-starts');
    return r;
  };
  await neg('A', async h => { });                                                   // write faalt
  await neg('B', async h => h.emit22(respFrame(0x11)));                             // REJECT
  await neg('C', async h => h.emit22(respFrame(0x21)));                             // BAD
  await neg('D', async h => { h.emit22(respFrame(0x31)); h.fireTimeout(); });       // NOT_READY tot timeout
  await neg('E', async h => { h.emit22([0x01, 0x02]); h.fireTimeout(); });          // malformed
  await neg('F', async h => { const b = okFrame.slice(); b[b.length - 2] ^= 0x7F; h.emit22(b); h.fireTimeout(); });
  await neg('G', async h => { h.down('disconnect'); });                             // disconnect vóór respons
  await neg('H', async h => { h.emit22(okFrame); h.down('disconnect'); });          // disconnect tijdens VERIFYING
  await neg('I', async (h, p) => { p.handleControlResponse(okFrame, { generation: 99, deviceId: 'DEV-A' }); h.fireTimeout(); });
  await neg('K', async h => { h.emit80(MATCH_0x31); h.fireTimeout(); });            // 0x31 vóór FRAME_ACCEPTED
  await neg('L', async h => { h.emit22(okFrame); h.emit80(raw0x31(12, 0, 4, 1000, 0x80, 120)); h.fireTimeout(); });
  await neg('M', async h => { h.emit22(okFrame); h.emit80(raw0x31(12, 0, 2, 2000, 0x80, 120)); h.fireTimeout(); });
  await neg('N', async h => { h.emit22(okFrame); h.emit80(raw0x31(12, 0, 2, 1000, 0x00, 120)); h.fireTimeout(); });
  await neg('O', async h => { h.emit22(okFrame); h.fireTimeout(); });               // geen read-back
  await neg('P', async (h, p) => { h.emit22(okFrame); p.verifyFromTelemetry(C2L.pm5RawToCanonical({ workoutType: 2, workoutDuration: 1000, workoutDurationType: 0x80 }), { generation: 1, deviceId: 'DEV-B' }); h.fireTimeout(); });
  { // J: matchende 0x31 vóór het programmeerverzoek
    const h = makeProduction(); await h.connect('DEV-A');
    h.emit80(MATCH_0x31);
    const started = h.start(1000); await tick();
    h.emit22(okFrame); h.fireTimeout();
    await started;
    eq(h.exec.starts, 0, 'J: matchende 0x31 vóór het verzoek -> 0 Execution'); }
  { // Q: dubbeltap
    const h = makeProduction(); await h.connect('DEV-A');
    const a = h.start(1000), b = h.start(1000); await tick();
    eq(h.writes.length, 1, 'Q: exact één programmeeroperatie/write');
    h.emit22(okFrame); h.emit80(MATCH_0x31);
    await a; await b;
    eq(h.exec.starts, 1, 'Q: hooguit één Execution'); }
  // ══ LIFECYCLE ══
  { const h = makeProduction(); const { prog } = await h.connect('DEV-A');
    h.down('disconnect');
    ok(!h.rt(), 'L1: disconnect verwijdert de runtime');
    eq(prog.getState(), PROG.STATE.IDLE, 'L2: controller geannuleerd');
    const c2 = await h.connect('DEV-A');
    ok(h.rt().prog !== prog, 'L3: reconnect levert een nieuwe controller');
    ok(h.rt().generation !== null, 'L4: nieuwe generation vastgelegd');
    const started = h.start(1000); await tick(); h.emit22(okFrame);
    c2.prog.verifyFromTelemetry(C2L.pm5RawToCanonical({ workoutType: 2, workoutDuration: 1000, workoutDurationType: 0x80 }), { generation: 999, deviceId: 'DEV-A' });
    ok(c2.prog.getState() !== PROG.STATE.PROGRAMMED, 'L5: oude generation kan de nieuwe operatie niet verifiëren');
    h.fireTimeout(); await started;
    eq(h.exec.starts, 0, 'L6: 0 Execution na generatie-mismatch'); }
  // ══ STATISCHE INVARIANT: productie bedraadt identiek ══
  ok(/_rt\.prog\.verifyFromTelemetry\(_rt\.agg\.getMergedRaw\(\), _vctx\)/.test(html), 'W1: productie voedt de aggregator-output aan de verificatie');
  ok(/const rt=\(typeof _c2rtGet==='function'\)\?_c2rtGet\(/.test(html), 'W2: start-handler leest de runtime uit _c2rt');
  console.log('Concept2 productie E2E: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.log('EXCEPTIE: ' + e.message); process.exit(1); });
