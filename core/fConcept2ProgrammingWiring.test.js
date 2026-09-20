/* Gate B.3 — controller gekoppeld aan het ECHTE Concept2-transport.
 * Keten: production start -> Concept2Programming -> transport.writeControlFrame
 *        -> CE060021 (gateway.write) -> CE060022 notificatie -> transport routing
 *        -> controller.handleControlResponse -> echte concept2Csafe parser
 *        -> CONFIRMED -> Execution-start.
 * Geen mock die concept2Csafe of de transportlaag overslaat. */
const path = require('path');
const CSAFE = require(path.resolve('core/concept2Csafe.js'));
const PROG = require(path.resolve('core/concept2Programming.js'));
const C2L = require(path.resolve('core/concept2Live.js'));
const NT = require(path.resolve('native/src/nativeConcept2BleTransport.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const S = PROG.STATE;
const U = s => 'CE0600' + s + '-43E5-11E4-916C-0800200C9A66';
function respFrame(status) {
  const c = [status];
  return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]);
}
const OK_F = respFrame(0x01), REJECT_F = respFrame(0x11), BAD_F = respFrame(0x21);

/* Production-equivalente omgeving: echt transport + echte controller + de
 * start-handler zoals productie die uitvoert (programmeren, daarna pas Execution). */
function makeProduction(opts) {
  opts = opts || {};
  const subs = {}; const writes = [];
  let timerFn = null;
  const gateway = {
    isAvailable: () => Promise.resolve({ available: true }),
    getPermissionState: () => Promise.resolve({ state: 'granted' }),
    requestPermissions: () => Promise.resolve({ state: 'granted' }),
    connect: () => Promise.resolve({ connected: true }),
    disconnect: () => Promise.resolve({}),
    getServices: () => Promise.resolve({ services: [
      { uuid: U('20').toLowerCase(), characteristics: [
        { uuid: U('22').toLowerCase(), properties: { notify: true } },
        { uuid: U('21').toLowerCase(), properties: { write: true } } ] },
      { uuid: U('30').toLowerCase(), characteristics: [{ uuid: U('80').toLowerCase(), properties: { notify: true } }] }
    ] }),
    startNotifications: (id, s, c, cb) => { subs[String(c).toLowerCase()] = cb; return Promise.resolve({}); },
    stopNotifications: () => Promise.resolve({}),
    write: (id, svc, chr, bytes) => {
      writes.push({ id, svc: String(svc).toLowerCase(), chr: String(chr).toLowerCase(), bytes: bytes.slice() });
      return opts.writeRejects ? Promise.reject(new Error('gatt_fail')) : Promise.resolve({});
    },
    startScan: () => Promise.resolve({}), stopScan: () => Promise.resolve({})
  };
  const T = NT.makeNativeConcept2BleTransport({
    gateway, concept2Live: C2L, now: () => 1000,
    setTimeoutFn: (fn) => { fn(); return 0; }, clearTimeoutFn: () => {}
  });
  const controller = PROG.createProgrammingController({
    csafe: CSAFE,
    write: (bytes) => T.writeControlFrame(bytes),
    now: () => 1000,
    setTimeoutFn: (fn) => { timerFn = fn; return 1; }, clearTimeoutFn: () => { timerFn = null; },
    timeoutMs: 5000
  });
  T.setControlResponseHandler((bytes, ctx) => controller.handleControlResponse(bytes, ctx));
  const exec = { starts: 0 };
  // production start-handler: Execution start PAS na CONFIRMED
  async function vastleggenEnStarten(distance) {
    if (!opts.pm5) { exec.starts++; return { route: 'manual', started: true }; }
    const r = await controller.programFixedDistance(distance, T.getControlContext());
    if (r.ok && r.state === S.CONFIRMED) { exec.starts++; return { route: 'pm5', started: true, state: r.state }; }
    return { route: 'pm5', started: false, state: r.state, reason: r.reason };
  }
  return {
    T, controller, exec, writes, subs,
    connect: () => Promise.resolve(T.connect('rowerg', 'AA:BB:CC:11:22:33')),
    emitCtrl: (bytes) => { const cb = subs[U('22').toLowerCase()]; if (cb) cb(new DataView(new Uint8Array(bytes).buffer)); },
    fireTimeout: () => { if (timerFn) timerFn(); },
    start: vastleggenEnStarten
  };
}
const P = () => makeProduction({ pm5: true });

async function run() {
  // ── 1000 m production E2E ──
  {
    const h = P(); await h.connect();
    const started = h.start(1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    eq(h.writes.length, 1, 'E2E: exact één gateway.write');
    eq(h.writes[0].chr, U('21').toLowerCase(), 'E2E: write gaat naar CE060021');
    eq(h.writes[0].svc, U('20').toLowerCase(), 'E2E: op de control-service CE060020');
    eq(h.controller.getState(), S.WAITING_RESPONSE, 'E2E: write resolved -> WAITING_RESPONSE');
    eq(h.exec.starts, 0, 'E2E: Execution nog NIET gestart na enkel een write');
    const f = h.writes[0].bytes;
    let be = false, le = false;
    for (let i = 0; i + 3 < f.length; i++) {
      if (f[i] === 0x00 && f[i+1] === 0x00 && f[i+2] === 0x03 && f[i+3] === 0xE8) be = true;
      if (f[i] === 0xE8 && f[i+1] === 0x03 && f[i+2] === 0x00 && f[i+3] === 0x00) le = true;
    }
    ok(be, 'E2E: 1000 m als 00 00 03 E8 (BIG-ENDIAN) uit de echte CSAFE-core');
    ok(!le, 'E2E: geen little-endian E8 03 00 00');
    eq(f[0], CSAFE.FLAG.STANDARD_START, 'E2E: frame start F1');
    h.emitCtrl(OK_F);                                   // via de echte transport-routing
    const r = await started;
    eq(r.started, true, 'E2E: Execution toegestaan na CONFIRMED');
    eq(r.state, S.CONFIRMED, 'E2E: eindstate CONFIRMED');
    eq(h.exec.starts, 1, 'E2E: exact één Execution-start');
    eq(h.writes.length, 1, 'E2E: nog steeds één write');
  }
  // ── negatieve production-scenario's: nul Execution-starts ──
  for (const [frame, want, label] of [[REJECT_F, S.FAILED, 'REJECT'], [BAD_F, S.FAILED, 'BAD']]) {
    const h = P(); await h.connect();
    const st = h.start(1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    h.emitCtrl(frame);
    const r = await st;
    eq(r.state, want, 'NEG: ' + label + ' -> ' + want);
    eq(r.started, false, 'NEG: ' + label + ' start geen Execution');
    eq(h.exec.starts, 0, 'NEG: ' + label + ' -> 0 Execution-starts');
  }
  { const h = P(); await h.connect();                    // geen response -> TIMEOUT
    const st = h.start(1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    h.fireTimeout();
    const r = await st;
    eq(r.state, S.TIMEOUT, 'NEG: geen response -> TIMEOUT');
    eq(h.exec.starts, 0, 'NEG: timeout -> 0 Execution-starts');
  }
  { const h = P(); await h.connect();                    // malformed
    const st = h.start(1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    const bad = OK_F.slice(); bad[bad.length - 2] ^= 0x7F;
    h.emitCtrl(bad); h.emitCtrl([0x01, 0x02]);
    ok(h.controller.getState() !== S.CONFIRMED, 'NEG: malformed bevestigt niet');
    eq(h.exec.starts, 0, 'NEG: malformed -> 0 Execution-starts');
    h.fireTimeout(); await st;
  }
  { const h = P(); await h.connect();                    // disconnect tijdens wachten
    const st = h.start(1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    h.controller.cancel('disconnect');
    const r = await st;
    eq(r.state, S.CANCELLED, 'NEG: disconnect -> CANCELLED');
    h.emitCtrl(OK_F);
    eq(h.exec.starts, 0, 'NEG: late OK na disconnect -> 0 Execution-starts');
  }
  { const h = P(); await h.connect();                    // stale generation
    const st = h.start(1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    const ctx = h.T.getControlContext();
    ok(ctx.generation >= 1, 'ISO: transport levert een generation');
    const r = h.controller.handleControlResponse(OK_F, { connected: true, deviceId: ctx.deviceId, generation: ctx.generation + 5 });
    eq(r.reason, 'stale_generation', 'ISO: vreemde generation genegeerd');
    eq(h.exec.starts, 0, 'ISO: stale response -> 0 Execution-starts');
    h.fireTimeout(); await st;
  }
  { const h = P(); await h.connect();                    // dubbeltap
    const a = h.start(1000), b = h.start(1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    eq(h.writes.length, 1, 'DUBBELTAP: exact één CE060021 write');
    const rb = await b;
    eq(rb.started, false, 'DUBBELTAP: tweede tik start geen Execution');
    h.emitCtrl(OK_F);
    const ra = await a;
    eq(ra.started, true, 'DUBBELTAP: eerste operatie bevestigt');
    eq(h.exec.starts, 1, 'DUBBELTAP: exact één Execution-start');
    eq(h.writes.length, 1, 'DUBBELTAP: nog steeds één write');
  }
  { const h = P(); await h.connect();                    // write-fout
    const h2 = makeProduction({ pm5: true, writeRejects: true }); await h2.connect();
    const r = await h2.start(1000);
    eq(r.started, false, 'WRITE: gefaalde write start geen Execution');
    eq(h2.exec.starts, 0, 'WRITE: 0 Execution-starts');
  }
  // ── manual/non-PM5 flow blijft werken ──
  { const m = makeProduction({ pm5: false }); await m.connect();
    const r = await m.start(1000);
    eq(r.route, 'manual', 'MANUAL: zonder PM5 loopt de bestaande flow');
    eq(r.started, true, 'MANUAL: training start gewoon');
    eq(m.writes.length, 0, 'MANUAL: geen CE060021 write zonder PM5');
  }
  // ── transport-guards ──
  { const h = P();                                       // zonder verbinding
    let err = null;
    await h.T.writeControlFrame([0xF1, 0xF2]).catch(e => { err = e.message; });
    eq(err, 'not_connected', 'GUARD: geen write zonder actieve verbinding');
    await h.connect();
    let e2 = null; await h.T.writeControlFrame([]).catch(e => { e2 = e.message; });
    eq(e2, 'empty_frame', 'GUARD: leeg frame geweigerd');
  }
  // ── CE060080 blijft telemetrie: geen cross-routing ──
  { const h = P(); await h.connect();
    const st = h.start(1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    const cb = h.subs[U('80').toLowerCase()];
    if (cb) cb(new DataView(new Uint8Array(OK_F).buffer));   // OK-frame op de telemetriechar
    ok(h.controller.getState() !== S.CONFIRMED, 'ROUTING: CE060080 bevestigt nooit een programming operation');
    eq(h.exec.starts, 0, 'ROUTING: geen Execution via telemetriekanaal');
    h.fireTimeout(); await st;
  }
  console.log('Concept2 programming wiring: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.log('EXCEPTIE: ' + e.message); process.exit(1); });
