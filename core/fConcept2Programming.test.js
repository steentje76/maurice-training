/* Gate B.2 — programming controller: state machine, CE060021 write-pad,
 * CE060022 response-pad, confirmation-semantiek, isolatie, timeout, dubbeltap.
 * Geen mock die concept2Csafe overslaat: alle frames gaan door de echte core. */
const path = require('path');
const CSAFE = require(path.resolve('core/concept2Csafe.js'));
const P = require(path.resolve('core/concept2Programming.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const S = P.STATE;

// echte CSAFE-responseframes bouwen (geen handgeschreven bytes)
function respFrame(statusByte) {
  const contents = [statusByte];
  return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(contents.concat([CSAFE.checksum(contents)]))).concat([CSAFE.FLAG.STOP]);
}
const OK_F = respFrame(0x01);                       // prev OK (0x00) + state Ready
const REJECT_F = respFrame(0x10 | 0x01);
const BAD_F = respFrame(0x20 | 0x01);
const NOTREADY_F = respFrame(0x30 | 0x01);

function harness(opts) {
  opts = opts || {};
  const writes = [];
  let timer = null, timerFn = null;
  const c = P.createProgrammingController({
    csafe: CSAFE,
    write: (bytes) => { writes.push(bytes.slice()); return opts.writeRejects ? Promise.reject(new Error('gatt_fail')) : Promise.resolve(); },
    now: () => 1000,
    setTimeoutFn: (fn) => { timerFn = fn; timer = 1; return 1; },
    clearTimeoutFn: () => { timer = null; timerFn = null; },
    timeoutMs: 5000
  });
  return { c, writes, fireTimeout: () => { if (timerFn) timerFn(); }, timerActive: () => timer !== null };
}
const CTX = { connected: true, generation: 7, deviceId: 'DEV-A' };

async function run() {
  // ── 1000 m E2E: request -> write -> WAITING -> OK-response -> CONFIRMED ──
  {
    const h = harness();
    const states = []; h.c.subscribe(d => states.push(d.state));
    const pr = h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    eq(h.writes.length, 1, 'E2E: exact één CE060021 write');
    eq(h.c.getState(), S.WAITING_RESPONSE, 'E2E: write resolved -> WAITING_RESPONSE, NIET CONFIRMED');
    // byte-exact: de 1000 m payload is BIG-ENDIAN binnen het echte frame
    const f = h.writes[0];
    const be = [0x00, 0x00, 0x03, 0xE8];
    let found = false;
    for (let i = 0; i + 3 < f.length; i++) if (f[i] === be[0] && f[i+1] === be[1] && f[i+2] === be[2] && f[i+3] === be[3]) found = true;
    ok(found, 'E2E: 1000 m staat als 00 00 03 E8 (BIG-ENDIAN) in het frame');
    let le = false;
    for (let i = 0; i + 3 < f.length; i++) if (f[i] === 0xE8 && f[i+1] === 0x03 && f[i+2] === 0x00 && f[i+3] === 0x00) le = true;
    ok(!le, 'E2E: little-endian volgorde E8 03 00 00 komt NIET voor');
    eq(f[0], CSAFE.FLAG.STANDARD_START, 'E2E: frame start F1');
    eq(f[f.length - 1], CSAFE.FLAG.STOP, 'E2E: frame stop F2');
    const r = h.c.handleControlResponse(OK_F, CTX);
    eq(r.state, S.CONFIRMED, 'E2E: Previous Frame Status OK -> CONFIRMED');
    const res = await pr;
    eq(res.ok, true, 'E2E: promise ok=true');
    eq(res.state, S.CONFIRMED, 'E2E: eindstate CONFIRMED');
    ok(states.indexOf(S.VALIDATING) < states.indexOf(S.ENCODING), 'E2E: VALIDATING voor ENCODING');
    ok(states.indexOf(S.ENCODING) < states.indexOf(S.WRITING), 'E2E: ENCODING voor WRITING');
    ok(states.indexOf(S.WRITING) < states.indexOf(S.WAITING_RESPONSE), 'E2E: WRITING voor WAITING_RESPONSE');
    ok(states[states.length - 1] === S.CONFIRMED, 'E2E: laatste transitie CONFIRMED');
    ok(!h.timerActive(), 'E2E: timer opgeruimd na CONFIRMED');
    eq(h.c.isPending(), false, 'E2E: geen pending operatie meer');
  }
  // ── negatieve scenario's ──
  for (const [frame, want, label] of [[REJECT_F, S.FAILED, 'REJECT'], [BAD_F, S.FAILED, 'BAD']]) {
    const h = harness(); const pr = h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    h.c.handleControlResponse(frame, CTX);
    const res = await pr;
    eq(res.state, want, 'NEG: ' + label + ' -> ' + want);
    eq(res.ok, false, 'NEG: ' + label + ' is geen succes');
  }
  { // NOT_READY: geen succes, blijft wachten
    const h = harness(); h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    const r = h.c.handleControlResponse(NOTREADY_F, CTX);
    eq(r.state, S.WAITING_RESPONSE, 'NEG: NOT_READY blijft WAITING_RESPONSE');
    eq(r.reason, 'previous_frame_not_ready', 'NEG: NOT_READY expliciet gerapporteerd');
    ok(h.c.getState() !== S.CONFIRMED, 'NEG: NOT_READY bevestigt NOOIT');
  }
  { // malformed / bad checksum / truncated
    const h = harness(); h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    const bad = OK_F.slice(); bad[bad.length - 2] = (bad[bad.length - 2] ^ 0xFF) & 0x7F;
    ok(h.c.handleControlResponse(bad, CTX).handled === false, 'NEG: foute checksum bevestigt niet');
    ok(h.c.handleControlResponse([0x01, 0x02], CTX).handled === false, 'NEG: geen framevlaggen bevestigt niet');
    ok(h.c.handleControlResponse([], CTX).handled === false, 'NEG: leeg frame bevestigt niet');
    eq(h.c.getState(), S.WAITING_RESPONSE, 'NEG: state ongewijzigd na ongeldige frames');
    ok(h.c.getState() !== S.CONFIRMED, 'NEG: nooit CONFIRMED door ongeldig frame');
  }
  { // timeout
    const h = harness(); const pr = h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    eq(h.c.getState(), S.WAITING_RESPONSE, 'TIMEOUT: wacht op response');
    h.fireTimeout();
    const res = await pr;
    eq(res.state, S.TIMEOUT, 'TIMEOUT: write resolved zonder response -> TIMEOUT');
    eq(res.ok, false, 'TIMEOUT: geen succes');
    ok(!h.timerActive(), 'TIMEOUT: timer opgeruimd');
    ok(h.c.handleControlResponse(OK_F, CTX).handled === false, 'TIMEOUT: late OK-response bevestigt niet meer');
  }
  { // write-fout
    const h = harness({ writeRejects: true }); const pr = h.c.programFixedDistance(1000, CTX);
    const res = await pr;
    eq(res.state, S.FAILED, 'WRITE: gefaalde BLE-write -> FAILED');
    ok(String(res.reason).indexOf('write_failed') === 0, 'WRITE: reden vastgelegd');
  }
  { // disconnect tijdens WAITING_RESPONSE
    const h = harness(); const pr = h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    h.c.cancel('disconnect');
    const res = await pr;
    eq(res.state, S.CANCELLED, 'DISCONNECT: pending operatie beëindigd');
    ok(!h.timerActive(), 'DISCONNECT: geen zombie-timer');
    ok(h.c.handleControlResponse(OK_F, CTX).handled === false, 'DISCONNECT: late response bevestigt niet');
  }
  { // generation- en device-isolatie
    const h = harness(); h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    const r1 = h.c.handleControlResponse(OK_F, { connected: true, generation: 8, deviceId: 'DEV-A' });
    eq(r1.reason, 'stale_generation', 'ISO: response uit andere generation genegeerd');
    const r2 = h.c.handleControlResponse(OK_F, { connected: true, generation: 7, deviceId: 'DEV-B' });
    eq(r2.reason, 'other_device', 'ISO: response van ander device genegeerd');
    ok(h.c.getState() !== S.CONFIRMED, 'ISO: geen bevestiging door vreemde response');
    eq(h.c.handleControlResponse(OK_F, CTX).state, S.CONFIRMED, 'ISO: eigen generation bevestigt wel');
  }
  { // sessie A pending -> disconnect -> sessie B mag niet bevestigd worden
    const h = harness(); h.c.programFixedDistance(1000, { connected: true, generation: 1, deviceId: 'DEV-A' });
    await Promise.resolve(); await Promise.resolve();
    h.c.cancel('disconnect');
    h.c.programFixedDistance(2000, { connected: true, generation: 2, deviceId: 'DEV-A' });
    await Promise.resolve(); await Promise.resolve();
    const late = h.c.handleControlResponse(OK_F, { connected: true, generation: 1, deviceId: 'DEV-A' });
    eq(late.reason, 'stale_generation', 'SESSIE: laat antwoord uit A bevestigt B niet');
    ok(h.c.getState() !== S.CONFIRMED, 'SESSIE: B blijft onbevestigd');
    eq(h.c.getDiagnostics().requestedDistanceM, 2000, 'SESSIE: B draagt eigen afstand');
  }
  { // dubbeltap
    const h = harness();
    const p1 = h.c.programFixedDistance(1000, CTX);
    const p2 = h.c.programFixedDistance(1000, CTX);
    const r2 = await p2;
    eq(r2.reason, 'already_pending', 'DUBBELTAP: tweede aanroep geweigerd');
    await Promise.resolve(); await Promise.resolve();
    eq(h.writes.length, 1, 'DUBBELTAP: exact één CE060021 write');
    h.c.handleControlResponse(OK_F, CTX);
    const r1 = await p1;
    eq(r1.state, S.CONFIRMED, 'DUBBELTAP: eerste operatie bevestigt normaal');
    eq(h.writes.length, 1, 'DUBBELTAP: nog steeds één write na bevestiging');
  }
  { // guards: niet verbonden, ongeldige afstanden
    const h = harness();
    const nc = await h.c.programFixedDistance(1000, { connected: false, generation: 1 });
    eq(nc.reason, 'not_connected', 'GUARD: geen write zonder verbinding');
    eq(h.writes.length, 0, 'GUARD: nul writes zonder verbinding');
    for (const d of [99, 0, -1, 1000000, NaN, Infinity, null, undefined]) {
      const h2 = harness();
      const r = await h2.c.programFixedDistance(d, CTX);
      eq(r.state, S.FAILED, 'GUARD: afstand ' + String(d) + ' geweigerd');
      eq(h2.writes.length, 0, 'GUARD: geen write voor afstand ' + String(d));
    }
    for (const d of [100, 500, 1000, 2000, 5000, 50000, 999999]) {
      const h3 = harness();
      h3.c.programFixedDistance(d, CTX);
      await Promise.resolve(); await Promise.resolve();
      eq(h3.writes.length, 1, 'GUARD: geldige afstand ' + d + ' levert één write');
      ok(h3.writes[0].length <= CSAFE.MAX_FRAME_BYTES, 'GUARD: frame binnen officiële maxlengte bij ' + d);
    }
  }
  { // diagnostiek voor Developer Mode
    const h = harness(); h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    let d = h.c.getDiagnostics();
    eq(d.state, S.WAITING_RESPONSE, 'DEV: state zichtbaar');
    eq(d.requestedDistanceM, 1000, 'DEV: aangevraagde afstand zichtbaar');
    eq(d.requestedWorkoutType, CSAFE.WORKOUT_TYPE.FIXEDDIST_NOSPLITS, 'DEV: workout type = FIXEDDIST_NOSPLITS');
    eq(d.writeAttempted, 1, 'DEV: write attempted geteld');
    eq(d.writeCompleted, 1, 'DEV: write completed geteld');
    eq(d.generation, 7, 'DEV: actieve generation zichtbaar');
    h.c.handleControlResponse(OK_F, CTX);
    d = h.c.getDiagnostics();
    eq(d.state, S.CONFIRMED, 'DEV: eindstate zichtbaar');
    eq(d.previousFrameStatus, 'ok', 'DEV: Previous Frame Status label zichtbaar');
    ok(JSON.stringify(d).indexOf('DEV-A') === -1, 'DEV: geen device-id in diagnostiek');
  }
  console.log('Concept2 programming controller: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.log('EXCEPTIE: ' + e.message); process.exit(1); });
