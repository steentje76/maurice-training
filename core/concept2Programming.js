/* ==========================================================================
 * Concept2 PM5 — PROGRAMMING CONTROLLER (Gate B.2)
 *
 * Keten (niet-onderhandelbaar):
 *   TK fixed-distance target -> Concept2Csafe -> CE060021 write ->
 *   WAITING_RESPONSE -> CE060022 response -> parseResponseFrame ->
 *   Previous Frame Status -> CONFIRMED / FAILED / TIMEOUT -> Execution
 *
 * HARDE REGELS
 *   - Een geresolvede BLE-write is NOOIT een programmeerbevestiging. De CSAFE-spec
 *     rev. 0.31 kent geen frame-level ACK/NAK; de status van het vorige frame komt
 *     via de statusbyte (masker 0x30) in het eerstvolgende geldige responseframe.
 *   - Alleen Previous Frame Status OK bevestigt. REJECT en BAD falen; NOT_READY is
 *     geen succes.
 *   - Elke operatie is gebonden aan device + generation. Een laat antwoord uit een
 *     oude sessie mag een nieuwe sessie nooit bevestigen.
 *   - Geen protocolkennis in deze laag: alle encoding/parsing komt uit Concept2Csafe.
 *   - Geen tweede BLE-stack: schrijven en abonneren gaan via de meegegeven transport.
 * ========================================================================== */
(function (global) {
  'use strict';
  var CSAFE = (typeof require !== 'undefined')
    ? require('./concept2Csafe.js')
    : (global.Concept2Csafe || null);

  var VERSION = 'concept2_programming.v1';

  var STATE = {
    IDLE: 'IDLE',
    VALIDATING: 'VALIDATING',
    ENCODING: 'ENCODING',
    WRITING: 'WRITING',
    WAITING_RESPONSE: 'WAITING_RESPONSE',
    /* Gate B.2 — SEMANTIEK. Previous Frame Status Ok bewijst alleen dat de PM5 het
       VORIGE CSAFE-frame heeft verwerkt; op echte hardware volgde daaruit geen
       workoutconfiguratie. FRAME_ACCEPTED zegt dus precies dat, en niets meer.
       VERIFYING wacht op read-back; PROGRAMMED vereist bewijs uit 0x31 en wordt
       pas in Gate B.3 bereikbaar. CONFIRMED blijft bestaan als alias van
       PROGRAMMED voor bestaande consumenten, maar wordt nergens meer gezet. */
    FRAME_ACCEPTED: 'FRAME_ACCEPTED',
    VERIFYING: 'VERIFYING',
    PROGRAMMED: 'PROGRAMMED',
    UNAVAILABLE: 'UNAVAILABLE',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED',
    TIMEOUT: 'TIMEOUT',
    CANCELLED: 'CANCELLED'
  };
  // Eindtoestanden: hierna is er geen pending operatie meer en is de timer opgeruimd.
  var TERMINAL = [STATE.PROGRAMMED, STATE.FAILED, STATE.TIMEOUT, STATE.CANCELLED];
/* FRAME_ACCEPTED en VERIFYING zijn NIET terminaal en betekenen geen succes. */
  var DEFAULT_TIMEOUT_MS = 5000;

  /**
   * @param deps.csafe       Concept2Csafe (injecteerbaar voor tests)
   * @param deps.write       function(bytes) -> Promise  — schrijft naar CE060021
   * @param deps.now         function() -> number
   * @param deps.setTimeoutFn/clearTimeoutFn
   * @param deps.timeoutMs   bounded wachttijd op CE060022
   */
  function createProgrammingController(deps) {
    deps = deps || {};
    var csafe = deps.csafe || CSAFE;
    var writeFn = deps.write;
    var now = deps.now || function () { return Date.now(); };
    var setT = deps.setTimeoutFn || function (fn, ms) { return setTimeout(fn, ms); };
    var clearT = deps.clearTimeoutFn || function (h) { return clearTimeout(h); };
    var timeoutMs = typeof deps.timeoutMs === 'number' ? deps.timeoutMs : DEFAULT_TIMEOUT_MS;

    var state = STATE.IDLE;
    var pending = null;      // { generation, deviceId, requestedDistanceM, workoutType, startedAt, timer, resolve }
    var last = null;         // laatste afgeronde operatie (diagnostiek)
    var listeners = [];
    var writeAttempts = 0;
    var writeCompletions = 0;
    var responsesSeen = 0;
    var responsesIgnored = 0;
    /* DIAG (real-device instrumentation): uitsluitend observatie van verifyFromTelemetry().
       Deze waarden worden NERGENS gelezen voor een beslissing; ze bestaan alleen voor
       Developer Mode. Reset per nieuwe programmeeroperatie, behouden na TIMEOUT/FAILED. */
    function freshVerifyDiag() {
      return { attempts: 0, lastReason: null, lastTelemetrySeq: null, lastAt: null, reasonCounts: {},
               // 'Pending' = er liep een operatie tijdens de aanroep. Na TIMEOUT blijven deze staan,
               // ook als daarna nog 'not_verifying'-aanroepen binnenkomen (die overschrijven alleen lastReason).
               attemptsWhilePending: 0, lastPendingReason: null, lastPendingTelemetrySeq: null, lastPendingAt: null };
    }
    var verifyDiag = freshVerifyDiag();
    function recordVerify(res, seq, wasPending) {
      try {
        var r = (res && res.verified === true) ? 'verified' : ((res && res.reason) || 'unknown');
        verifyDiag.attempts++;
        verifyDiag.lastReason = r;
        verifyDiag.lastTelemetrySeq = seq;
        verifyDiag.lastAt = now();
        verifyDiag.reasonCounts[r] = (verifyDiag.reasonCounts[r] || 0) + 1;
        if (wasPending) {
          verifyDiag.attemptsWhilePending++;
          verifyDiag.lastPendingReason = r;
          verifyDiag.lastPendingTelemetrySeq = seq;
          verifyDiag.lastPendingAt = verifyDiag.lastAt;
        }
      } catch (e) { /* diagnostiek is fail-open */ }
      return res;
    }

    function emit() {
      var snap = getDiagnostics();
      for (var i = 0; i < listeners.length; i++) { try { listeners[i](snap); } catch (e) {} }
    }
    function setState(s) { state = s; emit(); }
    function clearTimer() {
      if (pending && pending.timer != null) { clearT(pending.timer); pending.timer = null; }
    }
    // Sluit de huidige operatie af in een eindtoestand. Timer altijd opruimen, zodat
    // er nooit een zombie-timer of late bevestiging kan optreden.
    function settle(s, reason) {
      if (!pending) { setState(s); return null; }
      clearTimer();
      var op = pending;
      pending = null;
      last = {
        state: s, reason: reason || null,
        requestedDistanceM: op.requestedDistanceM, workoutType: op.workoutType,
        generation: op.generation, startedAt: op.startedAt, endedAt: now(),
        frameHex: op.frameHex || null, lastResponseHex: op.lastResponseHex || null,
        lastResponseAt: op.lastResponseAt || null, lastParse: op.lastParse || null,
        frameAcceptedAt: op.frameAcceptedAt || null,
        frameAcceptedSeq: op.frameAcceptedSeq != null ? op.frameAcceptedSeq : null,
        verificationStartedAt: op.verificationStartedAt || null,
        verificationTelemetryAt: op.verificationTelemetryAt || null,
        readbackWorkoutType: op.readbackWorkoutType != null ? op.readbackWorkoutType : null,
        readbackWorkoutDuration: op.readbackWorkoutDuration != null ? op.readbackWorkoutDuration : null,
        readbackDurationType: op.readbackDurationType != null ? op.readbackDurationType : null,
        programmedAt: op.programmedAt || null,
        previousFrameStatus: op.previousFrameStatus != null ? op.previousFrameStatus : null,
        previousFrameLabel: op.previousFrameLabel || null,
        stateMachineLabel: op.stateMachineLabel || null
      };
      setState(s);
      if (typeof op.resolve === 'function') op.resolve({ ok: s === STATE.PROGRAMMED, state: s, reason: reason || null, result: last });
      return last;
    }

    /**
     * Programmeert een fixed-distance workout. Genereert exact één write per
     * aanroep; een tweede aanroep terwijl er een operatie loopt wordt geweigerd
     * (dubbeltapbescherming) en doet GEEN extra write.
     */
    function programFixedDistance(distanceMeters, ctx) {
      ctx = ctx || {};
      if (pending) {
        return Promise.resolve({ ok: false, state: state, reason: 'already_pending', result: null });
      }
      setState(STATE.VALIDATING);
      if (!ctx.connected) { setState(STATE.FAILED); return Promise.resolve({ ok: false, state: STATE.FAILED, reason: 'not_connected', result: null }); }
      if (typeof writeFn !== 'function') { setState(STATE.FAILED); return Promise.resolve({ ok: false, state: STATE.FAILED, reason: 'no_write_path', result: null }); }

      setState(STATE.ENCODING);
      var built = csafe.buildFixedDistanceWorkout(distanceMeters, { splits: !!ctx.splits });
      if (!built || built.ok !== true) {
        setState(STATE.FAILED);
        return Promise.resolve({ ok: false, state: STATE.FAILED, reason: built && built.error ? built.error : 'encode_failed', result: null });
      }

      var op = {
        generation: ctx.generation != null ? ctx.generation : null,
        deviceId: ctx.deviceId != null ? ctx.deviceId : null,
        requestedDistanceM: distanceMeters,
        workoutType: built.workoutType != null ? built.workoutType : null,
        frame: built.frame, frameHex: built.hex || null, startedAt: now(), timer: null, resolve: null,
        frameAcceptedAt: null, lastResponseHex: null, lastParse: null
      };
      pending = op;
      verifyDiag = freshVerifyDiag();
      var promise = new Promise(function (res) { op.resolve = res; });

      setState(STATE.WRITING);
      writeAttempts++;
      Promise.resolve(writeFn(built.frame)).then(function () {
        if (pending !== op) return;              // geannuleerd tijdens de write
        writeCompletions++;
        // Een geslaagde write betekent WRITE_COMPLETED, niet PROGRAMMING_CONFIRMED.
        setState(STATE.WAITING_RESPONSE);
        op.timer = setT(function () {
          if (pending === op) settle(STATE.TIMEOUT, (state === STATE.VERIFYING) ? 'frame_accepted_but_not_verified' : 'no_response_within_timeout');
        }, timeoutMs);
      }).catch(function (e) {
        if (pending !== op) return;
        settle(STATE.FAILED, 'write_failed:' + ((e && e.message) || 'unknown'));
      });
      return promise;
    }

    /**
     * Verwerkt een CE060022-notificatie. Negeert alles wat niet bij de actieve
     * operatie hoort: geen pending operatie, verkeerde generation of ander device.
     */
    function handleControlResponse(bytes, ctx) {
      ctx = ctx || {};
      responsesSeen++;
      if (!pending || state !== STATE.WAITING_RESPONSE) { responsesIgnored++; return { handled: false, reason: 'no_pending_operation' }; }
      if (ctx.generation != null && pending.generation != null && ctx.generation !== pending.generation) {
        responsesIgnored++; return { handled: false, reason: 'stale_generation' };
      }
      if (ctx.deviceId != null && pending.deviceId != null && ctx.deviceId !== pending.deviceId) {
        responsesIgnored++; return { handled: false, reason: 'other_device' };
      }
      var hexOf = function (b) { var o='', i; for (i=0;i<(b?b.length:0);i++){ o += (b[i]<16?'0':'') + (b[i]&0xFF).toString(16); } return o; };
      pending.lastResponseHex = hexOf(bytes);
      pending.lastResponseAt = now();
      var parsed = csafe.parseResponseFrame(bytes);
      pending.lastParse = (parsed && parsed.ok) ? 'ok' : ('failed:' + ((parsed && parsed.error) || 'unknown'));
      if (!parsed || parsed.ok !== true) {
        // Protocolmatig ongeldig frame bevestigt nooit; we blijven wachten tot de
        // bounded timeout, zodat één corrupt pakket de operatie niet laat falen.
        return { handled: false, reason: 'invalid_frame:' + ((parsed && parsed.error) || 'unknown') };
      }
      pending.previousFrameStatus = parsed.previousFrameStatus;
      pending.previousFrameLabel = parsed.previousFrameLabel;
      pending.stateMachineLabel = parsed.stateMachineLabel;
      var S = csafe.PREVIOUS_FRAME_STATUS;
      if (parsed.previousFrameStatus === S.OK) {
        // Ok bevestigt het FRAME, niet de workout. Geen settle: de operatie blijft open
        // en gaat naar VERIFYING. Zonder read-back (Gate B.3) wordt PROGRAMMED nooit
        // bereikt en loopt de operatie af op de bounded timeout. Fail closed.
        pending.frameAcceptedAt = now();
        pending.frameAcceptedSeq = telemetrySeq;
        pending.verificationStartedAt = now();
        setState(STATE.FRAME_ACCEPTED);
        setState(STATE.VERIFYING);
        return { handled: true, state: STATE.VERIFYING, reason: 'frame_accepted_awaiting_verification' };
      }
      if (parsed.previousFrameStatus === S.REJECT) { settle(STATE.FAILED, 'previous_frame_reject'); return { handled: true, state: STATE.FAILED }; }
      if (parsed.previousFrameStatus === S.BAD) { settle(STATE.FAILED, 'previous_frame_bad'); return { handled: true, state: STATE.FAILED }; }
      // NOT_READY is geen succes en geen definitieve fout: de PM5 is nog niet zover.
      return { handled: true, state: STATE.WAITING_RESPONSE, reason: 'previous_frame_not_ready' };
    }

    /* Gate B.3 - READ-BACK VERIFICATIE.
     * Previous Frame Status Ok bewijst alleen frame-acceptatie. PROGRAMMED vereist dat
     * de PM5 ZELF de gevraagde configuratie rapporteert via de canonieke 0x31 General
     * Status, die al via CE060080 binnenkomt. Geen tweede decoder, geen shadow-telemetrie.
     *
     * VERSHEID is hard: alleen telemetrie NA frame-acceptatie telt, en alleen van hetzelfde
     * device en dezelfde connection generation. Een oude 0x31 met toevallig dezelfde waarden
     * mag een nieuwe operatie nooit bevestigen. We gebruiken een monotoon volgnummer naast
     * de tijdstempel, zodat gelijke klokwaarden geen gat openen.
     *
     * Vergelijking in CANONIEKE eenheden: bij duration type distance draagt 0x31 de afstand
     * in meters, exact zoals de aangevraagde waarde. Geen schaling hier. */
    var DURATION_TYPE_DISTANCE = 0x80, FIXEDDIST_NOSPLITS = 2;
    var telemetrySeq = 0;
    function verifyFromTelemetry(raw, ctx) {
      telemetrySeq++;
      var seq = telemetrySeq;
      var wasPending = !!pending;
      return recordVerify(verifyCore(raw, ctx, seq), seq, wasPending);
    }
    function verifyCore(raw, ctx, seq) {
      if (!pending || state !== STATE.VERIFYING) return { verified: false, reason: 'not_verifying' };
      if (pending.frameAcceptedSeq == null) return { verified: false, reason: 'not_frame_accepted' };
      if (seq <= pending.frameAcceptedSeq) return { verified: false, reason: 'stale_telemetry_before_acceptance' };
      ctx = ctx || {};
      if (ctx.generation != null && pending.generation != null && ctx.generation !== pending.generation) return { verified: false, reason: 'stale_generation' };
      if (ctx.deviceId != null && pending.deviceId != null && ctx.deviceId !== pending.deviceId) return { verified: false, reason: 'other_device' };
      if (!raw || typeof raw !== 'object') return { verified: false, reason: 'no_telemetry' };
      var t = raw.workout_type_readback, d = raw.workout_duration_readback, dt = raw.workout_duration_type_readback;
      if (t == null || d == null || dt == null) return { verified: false, reason: 'incomplete_readback' };
      pending.verificationTelemetryAt = now();
      pending.readbackWorkoutType = t; pending.readbackWorkoutDuration = d; pending.readbackDurationType = dt;
      if (Number(dt) !== DURATION_TYPE_DISTANCE) return { verified: false, reason: 'duration_type_mismatch' };
      if (Number(t) !== FIXEDDIST_NOSPLITS) return { verified: false, reason: 'workout_type_mismatch' };
      if (Number(d) !== Number(pending.requestedDistanceM)) return { verified: false, reason: 'distance_mismatch' };
      pending.programmedAt = now();
      settle(STATE.PROGRAMMED, null);
      return { verified: true, state: STATE.PROGRAMMED };
    }

    // Disconnect of sessiewissel: pending operatie veilig beëindigen, timer weg.
    function cancel(reason) {
      if (!pending) { if (state !== STATE.IDLE) setState(STATE.IDLE); return null; }
      return settle(STATE.CANCELLED, reason || 'cancelled');
    }
    function reset() { clearTimer(); pending = null; last = null; state = STATE.IDLE; }

    function getDiagnostics() {
      return {
        version: VERSION,
        state: state,
        isPending: !!pending,
        requestedWorkoutType: pending ? pending.workoutType : (last ? last.workoutType : null),
        requestedDistanceM: pending ? pending.requestedDistanceM : (last ? last.requestedDistanceM : null),
        writeAttempted: writeAttempts,
        writeCompleted: writeCompletions,
        responsesSeen: responsesSeen,
        responsesIgnored: responsesIgnored,
        frameHex: pending ? pending.frameHex : (last ? last.frameHex : null),
        lastResponseHex: pending ? pending.lastResponseHex : (last ? last.lastResponseHex : null),
        lastResponseAt: pending ? pending.lastResponseAt : (last ? last.lastResponseAt : null),
        lastParse: pending ? pending.lastParse : (last ? last.lastParse : null),
        frameAcceptedAt: pending ? pending.frameAcceptedAt : (last ? last.frameAcceptedAt : null),
        verificationStartedAt: pending ? pending.verificationStartedAt : (last ? last.verificationStartedAt : null),
        verificationTelemetryAt: pending ? pending.verificationTelemetryAt : (last ? last.verificationTelemetryAt : null),
        readbackWorkoutType: pending ? pending.readbackWorkoutType : (last ? last.readbackWorkoutType : null),
        readbackWorkoutDuration: pending ? pending.readbackWorkoutDuration : (last ? last.readbackWorkoutDuration : null),
        readbackDurationType: pending ? pending.readbackDurationType : (last ? last.readbackDurationType : null),
        programmedAt: pending ? pending.programmedAt : (last ? last.programmedAt : null),
        previousFrameStatus: pending && pending.previousFrameLabel ? pending.previousFrameLabel : (last ? last.previousFrameLabel : null),
        pmStateMachineState: pending && pending.stateMachineLabel ? pending.stateMachineLabel : (last ? last.stateMachineLabel : null),
        generation: pending ? pending.generation : (last ? last.generation : null),
        startedAt: pending ? pending.startedAt : (last ? last.startedAt : null),
        lastResult: last,
        verifyAttempts: verifyDiag.attempts,
        lastVerifyReason: verifyDiag.lastReason,
        lastVerifyTelemetrySeq: verifyDiag.lastTelemetrySeq,
        lastVerifyAt: verifyDiag.lastAt,
        verifyReasonCounts: JSON.parse(JSON.stringify(verifyDiag.reasonCounts)),
        verifyAttemptsWhilePending: verifyDiag.attemptsWhilePending,
        lastPendingVerifyReason: verifyDiag.lastPendingReason,
        lastPendingVerifyTelemetrySeq: verifyDiag.lastPendingTelemetrySeq,
        lastPendingVerifyAt: verifyDiag.lastPendingAt,
        frameAcceptedTelemetrySeq: pending ? (pending.frameAcceptedSeq != null ? pending.frameAcceptedSeq : null) : (last ? last.frameAcceptedSeq : null)
      };
    }

    return {
      STATE: STATE, TERMINAL: TERMINAL,
      programFixedDistance: programFixedDistance,
      handleControlResponse: handleControlResponse,
      verifyFromTelemetry: verifyFromTelemetry,
      cancel: cancel, reset: reset,
      getState: function () { return state; },
      isPending: function () { return !!pending; },
      getDiagnostics: getDiagnostics,
      subscribe: function (cb) { listeners.push(cb); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; }
    };
  }

  var Concept2Programming = { VERSION: VERSION, STATE: STATE, TERMINAL: TERMINAL, DEFAULT_TIMEOUT_MS: DEFAULT_TIMEOUT_MS, createProgrammingController: createProgrammingController };
  if (typeof module !== 'undefined' && module.exports) module.exports = Concept2Programming;
  else global.Concept2Programming = Concept2Programming;
})(typeof self !== 'undefined' ? self : this);
