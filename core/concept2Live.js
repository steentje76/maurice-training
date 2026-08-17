/* ==========================================================================
 * TrainingKompas — CONCEPT2 LIVE (PM5 / BLE) FOUNDATION  concept2_live.v1
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · platform-onafhankelijk. Geen BLE, geen DOM, geen fetch,
 * geen Date.now/Math.random. Levert het canonieke model + state machines + UUID-matrix
 * + mock-transport voor de Concept2 PM5-integratie. De ECHTE BLE leeft in een native
 * transport (window.TKDeviceTransport / NativeConcept2BleTransport) — NIET hier.
 *
 * Keten (niet-onderhandelbaar): PM5 → BLE-transport → RAW → normalizeLiveMetric →
 *   CANONICAL → Calculation → Decision → AI. NOOIT RAW → AI.
 *
 * BRONCLASSIFICATIE:
 *   CONFIRMED_OFFICIAL = Concept2 PM Bluetooth Smart Interface Definition (officiële spec)
 *   APK_OBSERVED       = ErgData 2.16.0 (360), black-box strings-analyse (geen code gekopieerd)
 *   BOTH               = officieel én in de APK waargenomen
 *   INFERRED / UNKNOWN = afgeleid resp. niet betrouwbaar toe te wijzen (nooit gefabriceerd)
 * ==========================================================================*/
(function (global) {
  'use strict';
  var DC = (typeof require !== 'undefined') ? require('./deviceIntegration.js') : (global.DeviceCore || null);
  var VERSION = 'concept2_live.v1';

  // ── BLE UUID-MATRIX (APK_OBSERVED in ErgData + officiële spec-structuur) ──────────────
  // Alle 35 CE060-UUID's hieronder zijn LETTERLIJK in de ErgData-APK aangetroffen (APK_OBSERVED).
  // De rol-toewijzing volgt de officiële PM5-spec-structuur; per entry een confidence-label.
  var BASE = 'CE060000-43E5-11E4-916C-0800200C9A66';
  function U(short) { return 'CE0600' + short + '-43E5-11E4-916C-0800200C9A66'; }
  var CONCEPT2_BLE_UUIDS = {
    base: BASE,
    services: {
      deviceInfo: { uuid: U('10'), role: 'device_information',        confidence: 'BOTH' },
      control:    { uuid: U('20'), role: 'control_service_csafe',     confidence: 'BOTH' },
      pmData:     { uuid: U('30'), role: 'pm_erg_data_service',       confidence: 'BOTH' },
      pmData2:    { uuid: U('60'), role: 'pm_erg_data_service_ext',   confidence: 'APK_OBSERVED' }
    },
    characteristics: {
      serialNumber:      { uuid: U('11'), service: 'deviceInfo', props: ['read'],          role: 'module_serial_number',         confidence: 'BOTH' },
      firmwareRev:       { uuid: U('12'), service: 'deviceInfo', props: ['read'],          role: 'firmware_revision',            confidence: 'BOTH' },
      hardwareRev:       { uuid: U('13'), service: 'deviceInfo', props: ['read'],          role: 'hardware_revision',            confidence: 'BOTH' },
      manufacturer:      { uuid: U('14'), service: 'deviceInfo', props: ['read'],          role: 'manufacturer_name',            confidence: 'BOTH' },
      machineType:       { uuid: U('15'), service: 'deviceInfo', props: ['read'],          role: 'erg_machine_type',             confidence: 'BOTH' },
      ctrlReceive:       { uuid: U('21'), service: 'control',    props: ['write'],         role: 'csafe_receive',                confidence: 'BOTH' },
      ctrlTransmit:      { uuid: U('22'), service: 'control',    props: ['notify'],        role: 'csafe_transmit',               confidence: 'BOTH' },
      sampleRate:        { uuid: U('34'), service: 'pmData',     props: ['read', 'write'], role: 'sample_rate',                  confidence: 'BOTH' },
      strokeData:        { uuid: U('35'), service: 'pmData',     props: ['notify'],        role: 'stroke_data',                  confidence: 'BOTH' },
      splitData:         { uuid: U('37'), service: 'pmData',     props: ['notify'],        role: 'split_interval_data',          confidence: 'BOTH' },
      addSplitData:      { uuid: U('38'), service: 'pmData',     props: ['notify'],        role: 'additional_split_interval_data', confidence: 'BOTH' },
      workoutSummary:    { uuid: U('39'), service: 'pmData',     props: ['notify'],        role: 'end_of_workout_summary',       confidence: 'BOTH' },
      addWorkoutSummary: { uuid: U('3A'), service: 'pmData',     props: ['notify'],        role: 'additional_workout_summary',   confidence: 'BOTH' },
      forceCurve:        { uuid: U('3C'), service: 'pmData',     props: ['notify'],        role: 'force_curve_data',             confidence: 'APK_OBSERVED' },
      multiplexed:       { uuid: U('80'), service: 'pmData',     props: ['notify'],        role: 'multiplexed_information',      confidence: 'BOTH' }
    },
    // In de APK aanwezig maar rol niet betrouwbaar toe te wijzen → NOOIT gokken.
    unknown: ['CE060016','CE060017','CE060018','CE06003D','CE06003E','CE060043',
              'CE060061','CE060062','CE060063','CE060064','CE060065','CE060066','CE060067','CE060068','CE060069']
  };

  // ── MACHINE TYPES (APK_OBSERVED: WorkoutMachineType) → canonieke exercise-ids ──
  // RowErg = canonieke id 'roeien' (GEEN rename; historische data intact). dynamic → RowErg-familie.
  var MACHINE_TYPES = ['rowerg', 'skierg', 'bikeerg', 'dynamic'];
  var MACHINE_EXERCISE = { rowerg: 'roeien', skierg: 'skierg', bikeerg: 'bikeerg', dynamic: 'roeien' };
  function paceBasisFor(mt) { return mt === 'bikeerg' ? 1000 : 500; } // row/ski 500m, bike 1000m
  function exerciseForMachine(mt) { return MACHINE_EXERCISE[mt] || 'roeien'; }

  // ── CONNECTIE-LIFECYCLE STATE MACHINE (§5) — deterministisch, nooit fake connected ──
  var CONN_STATES = ['not_available','idle','scanning','connecting','connected','reconnecting','out_of_range','disconnecting','disconnected','error','unsupported'];
  var CONN_TX = {
    not_available: { enable: 'idle' },
    idle:          { scan: 'scanning', unsupported: 'unsupported' },
    scanning:      { found: 'connecting', cancel: 'idle', timeout: 'disconnected', error: 'error' },
    connecting:    { connected: 'connected', fail: 'error', cancel: 'idle', timeout: 'disconnected' },
    connected:     { signal_lost: 'reconnecting', range_lost: 'out_of_range', user_disconnect: 'disconnecting', error: 'error' },
    reconnecting:  { connected: 'connected', timeout: 'disconnected', range_lost: 'out_of_range', give_up: 'disconnected' },
    out_of_range:  { back_in_range: 'reconnecting', give_up: 'disconnected' },
    disconnecting: { done: 'disconnected' },
    disconnected:  { scan: 'scanning', idle: 'idle' },
    error:         { retry: 'scanning', idle: 'idle' },
    unsupported:   {}
  };
  function nextConnState(cur, ev) { var t = CONN_TX[cur]; return (t && t[ev]) ? t[ev] : cur; }

  // ── LIVE SESSION STATE MACHINE (§14) ──
  var SESSION_STATES = ['not_started','connecting','connected','ready','workout_active','paused','interval','rest','finishing','completed','disconnected','error'];
  var SESSION_TX = {
    not_started:    { connect: 'connecting' },
    connecting:     { connected: 'connected', fail: 'error' },
    connected:      { ready: 'ready', disconnect: 'disconnected' },
    ready:          { start: 'workout_active', disconnect: 'disconnected' },
    workout_active: { pause: 'paused', interval: 'interval', rest: 'rest', finish: 'finishing', signal_lost: 'disconnected' },
    paused:         { resume: 'workout_active', finish: 'finishing' },
    interval:       { work: 'workout_active', rest: 'rest', finish: 'finishing' },
    rest:           { work: 'workout_active', interval: 'interval', finish: 'finishing' },
    finishing:      { complete: 'completed' },
    completed:      {},
    disconnected:   { reconnect: 'connecting' },
    error:          { reset: 'not_started' }
  };
  function nextSessionState(cur, ev) { var t = SESSION_TX[cur]; return (t && t[ev]) ? t[ev] : cur; }

  // APK_OBSERVED WorkoutState-waarden (waiting/active/rest/countdown/calibrating).
  var WORKOUT_STATES = ['waiting', 'countdown', 'calibrating', 'active', 'rest', 'interval', 'ended'];

  // ── FAILURE MODEL (§26) + NL-microcopy ──
  var CONCEPT2_FAILURES = {
    bluetooth_unavailable: 'Bluetooth staat uit of is niet beschikbaar. Zet Bluetooth aan.',
    permission_denied:     'Geen toestemming voor Bluetooth. Sta toegang toe in de instellingen.',
    device_not_found:      'Geen Concept2 PM5 gevonden. Zorg dat je monitor aan staat en dichtbij is.',
    connection_failed:     'Verbinden met de PM5 is mislukt. Probeer het opnieuw.',
    connection_lost:       'De verbinding met de PM5 is verbroken.',
    out_of_range:          'De PM5 is buiten bereik. Kom dichterbij.',
    unsupported_device:    'Dit apparaat wordt niet ondersteund.',
    unsupported_firmware:  'De firmware van deze PM5 wordt niet ondersteund.',
    protocol_error:        'Communicatiefout met de PM5.',
    invalid_packet:        'Onleesbare data van de PM5.',
    timeout:               'De PM5 reageerde niet op tijd.',
    already_connected:     'De PM5 is al met een andere app verbonden. Sluit die app of verbreek daar de verbinding.',
    user_cancelled:        'Koppelen geannuleerd.'
  };
  function failureMessage(code) { return CONCEPT2_FAILURES[code] || 'Er ging iets mis met de apparaatkoppeling.'; }

  // ── PAIRING-FLOW (discover → select → connect) — states + NL-microcopy (§7) ──
  var PAIRING_STATES = ['disconnected','bluetooth_off','permission_required','scanning','device_found',
                        'connecting','connected','reconnecting','failed','not_available','unsupported'];
  var PAIRING_MICROCOPY = {
    disconnected:       'Meet je training automatisch vanaf je PM5.',
    bluetooth_off:      'Bluetooth staat uit. Zet Bluetooth aan om je Concept2 te koppelen.',
    permission_required:'Trainingskompas heeft Bluetooth-toegang nodig om je PM5 te vinden.',
    scanning:           'Concept2-apparaten zoeken… Bluetooth moet aan staan.',
    device_found:       'Tik op je apparaat om te verbinden.',
    connecting:         'Verbinden met Concept2 PM5…',
    connected:          'Verbonden.',
    reconnecting:       'Verbinding verbroken — opnieuw verbinden…',
    failed:             'Verbinden met de PM5 is niet gelukt.',
    not_available:      'Live koppeling is beschikbaar in de app-versie met apparaatondersteuning.',
    unsupported:        'Dit apparaat wordt niet ondersteund.'
  };
  function pairingMessage(state) { return PAIRING_MICROCOPY[state] || ''; }

  // Signaalsterkte-label uit RSSI (dBm). Geen exacte waarde tonen aan de gebruiker.
  function signalLabel(rssi) {
    if (rssi == null || !isFinite(rssi)) return '';
    if (rssi >= -60) return 'Sterk signaal';
    if (rssi >= -75) return 'Matig signaal';
    return 'Zwak signaal';
  }

  // Machine-context: hoort het ontdekte apparaat bij de huidige oefening? cardioType uit de app
  // (rowing/skierg/bikeerg) → verwachte machineType. Onbekend machineType → geen mismatch (laat bevestigen).
  var CARDIO_TO_MACHINE = { rowing: 'rowerg', skierg: 'skierg', bikeerg: 'bikeerg' };
  function machineMatchesExercise(deviceMachineType, cardioType) {
    var expected = CARDIO_TO_MACHINE[cardioType] || null;
    if (!deviceMachineType || deviceMachineType === 'unknown') return { match: true, known: false, message: null };
    if (!expected || deviceMachineType === expected) return { match: true, known: true, message: null };
    var lbl = { rowerg: 'RowErg', skierg: 'SkiErg', bikeerg: 'BikeErg' };
    return { match: false, known: true,
      message: 'Dit apparaat is een ' + (lbl[deviceMachineType] || deviceMachineType) + '. Deze oefening gebruikt ' + (lbl[expected] || expected) + '.' };
  }

  function _num(v) { if (v == null) return null; var n = Number(v); return isFinite(n) ? n : null; }

  // ── CANONICAL LIVE METRIC (§8) — RAW → canonical. Pace-basis per machine; measured≠derived watts ──
  function normalizeLiveMetric(raw, machineType, ctx) {
    raw = raw || {}; ctx = ctx || {};
    var dist = _num(raw.distance_m), el = _num(raw.elapsed_s);
    var basis = paceBasisFor(machineType);
    var paceMeasured = _num(raw.pace_s_500m);
    var pace500 = (paceMeasured != null) ? paceMeasured : ((dist != null && el != null && DC) ? DC.derivePace500(dist, el) : null);
    var pace1000 = (pace500 != null) ? pace500 * 2 : null;
    var wMeasured = _num(raw.watts);
    var watts = (wMeasured != null) ? wMeasured : ((dist != null && el != null && DC) ? DC.deriveWatts(dist, el) : null);
    var wattsSource = (wMeasured != null) ? 'concept2_measured' : (watts != null ? 'concept2_derived' : null);
    var hr = _num(raw.heart_rate_bpm);
    return {
      schema: VERSION,
      timestamp: ctx.timestamp != null ? ctx.timestamp : null,
      machineType: machineType || null,
      exerciseId: exerciseForMachine(machineType),
      distanceM: dist, elapsedTimeS: el,
      pace500M: pace500, pace1000M: pace1000, paceBasisM: basis,
      watts: watts, wattsSource: wattsSource,
      strokeRateSPM: _num(raw.stroke_rate_spm), strokeCount: _num(raw.stroke_count),
      heartRateBPM: hr, heartRateSource: hr != null ? (raw.hr_source || 'concept2_pm5') : null,
      calories: _num(raw.calories_kcal), dragFactor: _num(raw.drag_factor),
      workoutState: raw.workout_state || null,
      intervalNumber: _num(raw.interval_number), restState: !!raw.rest_state
    };
  }

  // ── CANONICAL INTERVAL / SPLIT (§16) ──
  function normalizeInterval(raw, machineType) {
    raw = raw || {};
    var dist = _num(raw.distance_m), wt = _num(raw.work_time_s);
    return {
      intervalNumber: _num(raw.interval_number),
      type: raw.type || null, // fixed_distance | fixed_time | variable | rest | undefined_rest
      workTimeS: wt, restTimeS: _num(raw.rest_time_s),
      distanceM: dist,
      pace500M: (dist != null && wt != null && DC) ? DC.derivePace500(dist, wt) : null,
      watts: _num(raw.watts), strokeRateSPM: _num(raw.stroke_rate_spm),
      heartRateBPM: _num(raw.heart_rate_bpm), calories: _num(raw.calories_kcal), dragFactor: _num(raw.drag_factor)
    };
  }

  // ── LOKALE WORKOUT-IDENTITEIT + DEDUP (§15) ──
  // Live workouts zonder Logbook-resultId krijgen een lokale id ([c2local:]). Bij latere Logbook-import
  // dedupliceren tegen zowel [c2:] als [c2local:] → NO DUPLICATES.
  function localWorkoutId(seed) { return 'local-' + String(seed == null ? '' : seed); }
  function localTag(id) { return (id != null && id !== '') ? ('[c2local:' + id + ']') : ''; }
  function alreadyLoggedLive(anyId, sessions) {
    if (anyId == null || anyId === '') return false;
    var id = String(anyId), re = /\[c2(?:local)?:([^\]]+)\]/g;
    for (var i = 0; i < (sessions || []).length; i++) {
      var note = sessions[i] && sessions[i].note != null ? String(sessions[i].note) : '', m; re.lastIndex = 0;
      while ((m = re.exec(note))) { if (m[1] === id) return true; }
    }
    return false;
  }

  // ── WORKOUT COMPLETION → CANONICAL ACTUAL (§15) — sessions-shape; prescription onaangeroerd ──
  function liveWorkoutToActual(summary, opts) {
    summary = summary || {}; opts = opts || {};
    var mt = summary.machineType || 'rowerg';
    var exId = exerciseForMachine(mt);
    var dist = _num(summary.distance_m), dur = _num(summary.duration_s);
    var basis = paceBasisFor(mt);
    var spm = _num(summary.stroke_rate_spm), drag = _num(summary.drag_factor), hr = _num(summary.heart_rate_bpm);
    var wMeasured = _num(summary.watts);
    var watts = (wMeasured != null) ? wMeasured : ((dist != null && dur != null && DC) ? DC.deriveWatts(dist, dur) : null);
    var wattsSource = (wMeasured != null) ? 'concept2_measured' : (watts != null ? 'concept2_derived' : null);
    var split = (dist != null && dur != null && DC) ? DC.splitFromDistTime(dist, dur, basis) : null;
    var extId = summary.resultId != null ? String(summary.resultId) : null;
    var tag = extId != null ? ('[c2:' + extId + ']') : localTag(summary.localId != null ? summary.localId : opts.localId);
    var noteParts = [];
    if (split) noteParts.push('split:' + split + '/' + (basis === 1000 ? '1000m' : '500m'));
    if (drag != null) noteParts.push('drag ' + Math.round(drag));
    if (hr != null) noteParts.push('hr ' + Math.round(hr));
    if (tag) noteParts.push(tag);
    var row = {
      date: (summary.date || opts.date || null),
      exercise_id: exId,
      training_type: opts.training_type != null ? opts.training_type : null,
      note: noteParts.join(' · '),
      distance: dist != null ? Math.round(dist) : null,
      time_str: (dur != null && DC) ? DC.formatDurationStr(dur) : null,
      watt: watts != null ? Math.round(watts * 10) / 10 : null,
      stroke_rate: spm != null ? Math.round(spm) : null,
      rpe: null // ACTUAL-only; nooit een prescription/target overschrijven
    };
    if (opts.training_instance_id != null) row.training_instance_id = opts.training_instance_id;
    return {
      row: row,
      provenance: {
        provider: 'concept2', source: 'concept2_live_ble', machineType: mt, exerciseId: exId,
        watts_source: wattsSource, externalId: extId,
        localId: (summary.localId != null ? summary.localId : (opts.localId != null ? opts.localId : null)),
        heart_rate_source: hr != null ? (summary.hr_source || 'concept2_pm5') : null
      }
    };
  }

  // ── MOCK PM5 TRANSPORT (§27/28) — implementeert het DeviceTransport-contract; realistische events ──
  function makeMockConcept2PM5(scenario) {
    scenario = scenario || {};
    var mt = scenario.machineType || 'rowerg';
    var points = scenario.points || [];
    var metricCb = null, connCb = null, i = 0, status = 'idle', current = null;
    function emitConn(s) { status = s; if (connCb) connCb({ state: s, machineType: mt, deviceInfo: scenario.deviceInfo || null }); }
    return {
      available: true,
      getPermissionState: function () { return scenario.permission || 'granted'; }, // granted|denied|bluetooth_off
      discover: function () {
        if (Array.isArray(scenario.devices)) return scenario.devices;
        return [{ id: scenario.deviceId || 'PM5-MOCK', name: 'Concept2 PM5', machineType: mt, rssi: scenario.rssi != null ? scenario.rssi : -55 }];
      },
      connect: function (dt, deviceId) { emitConn('connecting'); emitConn('connected'); return { connected: true, machineType: mt, deviceId: deviceId || (scenario.deviceId || 'PM5-MOCK') }; },
      disconnect: function () { emitConn('disconnecting'); emitConn('disconnected'); metricCb = null; return { ok: true }; },
      getStatus: function () { return { state: status, machineType: mt }; },
      getDeviceInfo: function () { return scenario.deviceInfo || { provider: 'concept2', deviceType: 'pm5', machineType: mt, serialNumber: null, firmwareVersion: null }; },
      subscribeMetrics: function (cb) { metricCb = cb; },
      unsubscribeMetrics: function () { metricCb = null; },
      subscribeConnection: function (cb) { connCb = cb; },
      getCurrentMetrics: function () { return current; },
      reset: function () { i = 0; current = null; },
      // testhulp: één sample vooruit + genormaliseerd event emitten
      _tick: function (ctx) {
        if (i >= points.length) return null;
        var raw = points[i++];
        current = normalizeLiveMetric(raw, mt, ctx || {});
        if (metricCb) metricCb({ provider: 'concept2', device: scenario.deviceId || 'PM5-MOCK', machineType: mt, timestamp: (ctx && ctx.timestamp) || null, metrics: current, provenance: { source: 'concept2_live_ble' } });
        return current;
      },
      _finish: function () { return liveWorkoutToActual(scenario.finishSummary || {}, { machineType: mt }); }
    };
  }

  var Concept2Live = {
    VERSION: VERSION, CONCEPT2_BLE_UUIDS: CONCEPT2_BLE_UUIDS,
    MACHINE_TYPES: MACHINE_TYPES, MACHINE_EXERCISE: MACHINE_EXERCISE, paceBasisFor: paceBasisFor, exerciseForMachine: exerciseForMachine,
    CONN_STATES: CONN_STATES, nextConnState: nextConnState,
    SESSION_STATES: SESSION_STATES, nextSessionState: nextSessionState, WORKOUT_STATES: WORKOUT_STATES,
    CONCEPT2_FAILURES: CONCEPT2_FAILURES, failureMessage: failureMessage,
    PAIRING_STATES: PAIRING_STATES, PAIRING_MICROCOPY: PAIRING_MICROCOPY, pairingMessage: pairingMessage,
    signalLabel: signalLabel, CARDIO_TO_MACHINE: CARDIO_TO_MACHINE, machineMatchesExercise: machineMatchesExercise,
    normalizeLiveMetric: normalizeLiveMetric, normalizeInterval: normalizeInterval,
    localWorkoutId: localWorkoutId, localTag: localTag, alreadyLoggedLive: alreadyLoggedLive,
    liveWorkoutToActual: liveWorkoutToActual, makeMockConcept2PM5: makeMockConcept2PM5
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Concept2Live;
  else global.Concept2Live = Concept2Live;
})(typeof self !== 'undefined' ? self : this);
