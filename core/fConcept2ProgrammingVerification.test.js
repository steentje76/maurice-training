/* Gate B.3 — read-back verificatie via canonieke 0x31, versheid en PROGRAMMED-gate.
 * Geen tweede decoder: de 0x31-velden lopen door de bestaande Concept2Live-aggregator. */
const path = require('path');
const CSAFE = require(path.resolve('core/concept2Csafe.js'));
const PROG = require(path.resolve('core/concept2Programming.js'));
const C2L = require(path.resolve('core/concept2Live.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const S = PROG.STATE;
const CTX = { connected: true, generation: 3, deviceId: 'DEV-A' };
const OK_F = (() => { const c = [0x01]; return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]); })();

// canonieke read-back zoals de aggregator hem levert uit een 0x31-payload
const readback = (type, dur, durType) => C2L.pm5RawToCanonical({ workoutType: type, workoutDuration: dur, workoutDurationType: durType });
const MATCH = readback(2, 1000, 0x80);

function mk() {
  const writes = []; let timerFn = null;
  const c = PROG.createProgrammingController({
    csafe: CSAFE, write: b => { writes.push(b.slice()); return Promise.resolve(); },
    now: () => 1000, setTimeoutFn: fn => { timerFn = fn; return 1; }, clearTimeoutFn: () => { timerFn = null; }, timeoutMs: 5000
  });
  return { c, writes, fireTimeout: () => { if (timerFn) timerFn(); } };
}
async function armed(dist) {                       // tot en met FRAME_ACCEPTED/VERIFYING
  const h = mk(); const p = h.c.programFixedDistance(dist || 1000, CTX);
  await Promise.resolve(); await Promise.resolve();
  h.c.handleControlResponse(OK_F, CTX);
  return Object.assign(h, { p });
}

async function run() {
  // ── A. canonieke veldmapping uit de aggregator ──
  eq(MATCH.workout_type_readback, 2, 'A1: workoutType -> canoniek veld');
  eq(MATCH.workout_duration_readback, 1000, 'A2: workoutDuration -> canoniek veld (meters bij distance-type)');
  eq(MATCH.workout_duration_type_readback, 0x80, 'A3: workoutDurationType -> canoniek veld');
  { const agg = C2L.createPm5LiveAggregator();
    agg.push({ distanceM: 500, elapsedTimeS: 10 }, 'rowerg', {});
    const cm = agg.push({ workoutType: 2, workoutDuration: 1000, workoutDurationType: 0x80 }, 'rowerg', {});
    eq(cm.distanceM, 500, 'A4: read-back wist bestaande live-state niet (partial merge intact)');
    eq(agg.getMergedRaw().workout_duration_readback, 1000, 'A5: read-back leeft in de canonieke merged raw'); }

  // ── B. positief: verse matchende telemetrie -> PROGRAMMED ──
  { const h = await armed();
    eq(h.c.getState(), S.VERIFYING, 'B1: na Ok in VERIFYING');
    const r = h.c.verifyFromTelemetry(MATCH, CTX);
    eq(r.verified, true, 'B2: verse matchende 0x31 verifieert');
    eq(r.state, S.PROGRAMMED, 'B3: PROGRAMMED bereikt');
    const res = await h.p;
    eq(res.ok, true, 'B4: promise lost precies één keer op met succes');
    eq(res.state, S.PROGRAMMED, 'B5: eindstate PROGRAMMED');
    // late telemetrie mag niet opnieuw settelen
    eq(h.c.verifyFromTelemetry(MATCH, CTX).reason, 'not_verifying', 'B6: telemetrie na settlement doet niets');
    const d = h.c.getDiagnostics();
    eq(d.readbackWorkoutType, 2, 'B7: read-back type in diagnostiek');
    eq(d.readbackWorkoutDuration, 1000, 'B8: read-back afstand in diagnostiek');
    eq(d.readbackDurationType, 0x80, 'B9: read-back duration type in diagnostiek');
    ok(d.verificationStartedAt != null, 'B10: verificationStartedAt bewaard');
    ok(d.verificationTelemetryAt != null, 'B11: verificationTelemetryAt bewaard');
    ok(d.programmedAt != null, 'B12: PROGRAMMED timestamp bewaard');
    ok(!!d.lastResult && d.lastResult.programmedAt != null, 'B13: diagnostiek overleeft settle()'); }

  // ── C. versheid ──
  { const h = mk(); h.c.verifyFromTelemetry(MATCH, CTX);        // vóór het request
    const p = h.c.programFixedDistance(1000, CTX);
    await Promise.resolve(); await Promise.resolve();
    eq(h.c.verifyFromTelemetry(MATCH, CTX).reason, 'not_verifying', 'C1: matchende 0x31 vóór FRAME_ACCEPTED verifieert niet');
    h.c.handleControlResponse(OK_F, CTX);
    eq(h.c.getState(), S.VERIFYING, 'C2: pas na Ok in VERIFYING');
    eq(h.c.verifyFromTelemetry(MATCH, CTX).verified, true, 'C3: eerstvolgende verse telemetrie verifieert wel');
    await p; }
  { const h = await armed();
    eq(h.c.verifyFromTelemetry(MATCH, { connected: true, generation: 99, deviceId: 'DEV-A' }).reason, 'stale_generation', 'C4: oude generation verifieert niet');
    eq(h.c.verifyFromTelemetry(MATCH, { connected: true, generation: 3, deviceId: 'DEV-B' }).reason, 'other_device', 'C5: ander device verifieert niet');
    ok(h.c.getState() !== S.PROGRAMMED, 'C6: geen PROGRAMMED door vreemde telemetrie');
    h.fireTimeout(); await h.p; }

  // ── D. mismatches ──
  for (const [rb, reason, label] of [
    [readback(4, 1000, 0x80), 'workout_type_mismatch', 'verkeerd workout type'],
    [readback(2, 2000, 0x80), 'distance_mismatch', 'verkeerde afstand'],
    [readback(2, 1000, 0x00), 'duration_type_mismatch', 'verkeerd duration type'],
    [C2L.pm5RawToCanonical({ workoutType: 2 }), 'incomplete_readback', 'onvolledige read-back'],
    [null, 'no_telemetry', 'geen telemetrie']]) {
    const h = await armed();
    const r = h.c.verifyFromTelemetry(rb, CTX);
    eq(r.verified, false, 'D: ' + label + ' verifieert niet');
    eq(r.reason, reason, 'D: ' + label + ' -> ' + reason);
    ok(h.c.getState() !== S.PROGRAMMED, 'D: ' + label + ' bereikt geen PROGRAMMED');
    h.fireTimeout(); await h.p;
  }

  // ── E. timeout en disconnect tijdens VERIFYING ──
  { const h = await armed(); h.fireTimeout();
    const r = await h.p;
    eq(r.state, S.TIMEOUT, 'E1: geen read-back -> TIMEOUT');
    eq(r.reason, 'frame_accepted_but_not_verified', 'E2: expliciete reden');
    eq(h.c.verifyFromTelemetry(MATCH, CTX).reason, 'not_verifying', 'E3: telemetrie na timeout verifieert niet'); }
  { const h = await armed(); h.c.cancel('disconnect');
    const r = await h.p;
    eq(r.state, S.CANCELLED, 'E4: disconnect tijdens VERIFYING -> CANCELLED');
    eq(h.c.verifyFromTelemetry(MATCH, CTX).reason, 'not_verifying', 'E5: geen late PROGRAMMED na disconnect'); }

  // ── F. generiek: niet gebonden aan 1000 m ──
  for (const d of [100, 500, 2000, 50000]) {
    const h = await armed(d);
    eq(h.c.verifyFromTelemetry(readback(2, d, 0x80), CTX).verified, true, 'F: ' + d + ' m verifieert generiek');
    eq(h.c.verifyFromTelemetry(readback(2, 1000, 0x80), CTX).reason, 'not_verifying', 'F: ' + d + ' m al gesettled');
    await h.p;
  }
  { const h = await armed(2000);
    eq(h.c.verifyFromTelemetry(readback(2, 1000, 0x80), CTX).reason, 'distance_mismatch', 'F: 1000 m read-back bevestigt geen 2000 m request');
    h.fireTimeout(); await h.p; }
  console.log('Concept2 programming verification: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.log('EXCEPTIE: ' + e.message); process.exit(1); });
