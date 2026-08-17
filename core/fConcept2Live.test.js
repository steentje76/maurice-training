/* Concept2 LIVE (PM5/BLE) foundation — PURE. UUID-matrix, machine-mapping, pace-basis,
 * measured/derived, state machines, live-metric normalisatie, intervals, workout-completion,
 * idempotency, prescription≠actual, mock PM5-simulator (RowErg/SkiErg/BikeErg).
 * Draai: node core/fConcept2Live.test.js
 */
const C = require('./concept2Live.js');

let pass = 0, fail = 0;
function eq(a, b, m){ if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function close(a, b, m, eps){ if (a!=null && Math.abs(a - b) <= (eps || 0.5)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ~' + b + ', kreeg ' + a + ')'); } }

// ── A. UUID-MATRIX (APK_OBSERVED) ──
eq(C.CONCEPT2_BLE_UUIDS.base, 'CE060000-43E5-11E4-916C-0800200C9A66', 'A: base-UUID');
eq(C.CONCEPT2_BLE_UUIDS.characteristics.strokeData.uuid, 'CE060035-43E5-11E4-916C-0800200C9A66', 'A: stroke_data UUID CE060035');
eq(C.CONCEPT2_BLE_UUIDS.characteristics.machineType.uuid, 'CE060015-43E5-11E4-916C-0800200C9A66', 'A: erg_machine_type UUID CE060015');
eq(C.CONCEPT2_BLE_UUIDS.services.control.role, 'control_service_csafe', 'A: control service = CSAFE');
ok(C.CONCEPT2_BLE_UUIDS.unknown.indexOf('CE060043') !== -1, 'A: onbekende UUID CE060043 gemarkeerd (niet gefabriceerd)');
ok(Object.keys(C.CONCEPT2_BLE_UUIDS.characteristics).every(k=>/^CE0600[0-9A-F]{2}-43E5-11E4-916C-0800200C9A66$/.test(C.CONCEPT2_BLE_UUIDS.characteristics[k].uuid)), 'A: alle characteristic-UUIDs juiste vorm');

// ── B/C. MACHINE MAPPING (RowErg=roeien, geen rename) ──
eq(C.exerciseForMachine('rowerg'), 'roeien', 'C: rowerg → roeien (RowErg canonieke id)');
eq(C.exerciseForMachine('skierg'), 'skierg', 'C: skierg → skierg');
eq(C.exerciseForMachine('bikeerg'), 'bikeerg', 'C: bikeerg → bikeerg');
ok(C.exerciseForMachine('bikeerg') !== 'roeien', 'C: BikeErg NOOIT → roeien');
eq(C.exerciseForMachine('dynamic'), 'roeien', 'C: dynamic → RowErg-familie');

// ── G. PACE BASIS ──
eq(C.paceBasisFor('rowerg'), 500, 'G: RowErg pace-basis 500m');
eq(C.paceBasisFor('skierg'), 500, 'G: SkiErg pace-basis 500m');
eq(C.paceBasisFor('bikeerg'), 1000, 'G: BikeErg pace-basis 1000m');

// ── D. CONNECTION STATE MACHINE ──
eq(C.nextConnState('idle', 'scan'), 'scanning', 'D: idle+scan → scanning');
eq(C.nextConnState('scanning', 'found'), 'connecting', 'D: scanning+found → connecting');
eq(C.nextConnState('connecting', 'connected'), 'connected', 'D: connecting+connected → connected');
eq(C.nextConnState('connected', 'signal_lost'), 'reconnecting', 'E: connected+signal_lost → reconnecting');
eq(C.nextConnState('reconnecting', 'connected'), 'connected', 'E: reconnecting+connected → connected (herstel)');
eq(C.nextConnState('connected', 'range_lost'), 'out_of_range', 'E: connected+range_lost → out_of_range');
eq(C.nextConnState('connecting', 'onbekend_event'), 'connecting', 'D: onbekend event → geen transitie (stabiel)');
eq(C.nextConnState('connected', 'connected'), 'connected', 'D: geen fake reconnect-loop op dubbel-connected');

// ── LIVE SESSION STATE MACHINE ──
eq(C.nextSessionState('ready', 'start'), 'workout_active', 'sessie: ready+start → workout_active');
eq(C.nextSessionState('workout_active', 'finish'), 'finishing', 'sessie: active+finish → finishing');
eq(C.nextSessionState('finishing', 'complete'), 'completed', 'sessie: finishing+complete → completed');
eq(C.nextSessionState('workout_active', 'signal_lost'), 'disconnected', 'sessie: signal_lost → disconnected (data niet verloren, apart afgehandeld)');

// ── F. METRIC NORMALIZATION (RAW → canonical) ──
const m = C.normalizeLiveMetric({ distance_m:1240, elapsed_s:228, stroke_rate_spm:31, heart_rate_bpm:148, drag_factor:120 }, 'rowerg', { timestamp: 1000 });
eq(m.distanceM, 1240, 'F: distanceM 1240');
eq(m.elapsedTimeS, 228, 'F: elapsedTimeS 228');
eq(m.machineType, 'rowerg', 'F: machineType');
eq(m.exerciseId, 'roeien', 'F: exerciseId roeien');
eq(m.strokeRateSPM, 31, 'F: SPM 31');
eq(m.heartRateBPM, 148, 'F: HR 148');
eq(m.heartRateSource, 'concept2_pm5', 'R(HR): HR-bron concept2_pm5 (niet Fitbit)');
// pace afgeleid uit dist/tijd, basis 500m
close(m.pace500M, (228/1240)*500, 'F: pace500 afgeleid (91.9s/500m)', 0.1);

// ── H. MEASURED vs DERIVED ──
const mMeasured = C.normalizeLiveMetric({ distance_m:500, elapsed_s:90, watts:205 }, 'rowerg', {});
eq(mMeasured.wattsSource, 'concept2_measured', 'H: geleverde watts → concept2_measured');
eq(mMeasured.watts, 205, 'H: gemeten watt 205 gebruikt');
const mDerived = C.normalizeLiveMetric({ distance_m:2000, elapsed_s:480 }, 'rowerg', {});
eq(mDerived.wattsSource, 'concept2_derived', 'H: geen watts → concept2_derived');
close(mDerived.watts, 202.5, 'H: afgeleide watt ~202.5', 1);

// ── I. INTERVALS ──
const iv = C.normalizeInterval({ interval_number:1, type:'fixed_distance', distance_m:500, work_time_s:100, watts:180, stroke_rate_spm:28 }, 'rowerg');
eq(iv.intervalNumber, 1, 'I: intervalNumber 1');
eq(iv.type, 'fixed_distance', 'I: type fixed_distance');
close(iv.pace500M, 100, 'I: interval-pace 100s/500m', 0.1);

// ── J/K. WORKOUT COMPLETION → ACTUAL + IDEMPOTENCY ──
const rowActual = C.liveWorkoutToActual({ machineType:'rowerg', date:'2026-08-17', distance_m:2000, duration_s:480, stroke_rate_spm:31, drag_factor:120, heart_rate_bpm:150, resultId:'987' }, { training_type:'A' });
eq(rowActual.row.exercise_id, 'roeien', 'J: RowErg actual → exercise_id roeien');
eq(rowActual.row.distance, 2000, 'J: distance 2000');
eq(rowActual.row.time_str, '8:00', 'J: time_str 8:00');
eq(rowActual.row.stroke_rate, 31, 'J: stroke_rate 31');
eq(rowActual.row.rpe, null, 'N: ACTUAL-only rpe null (prescription onaangeroerd)');
ok(/\[c2:987\]/.test(rowActual.row.note), 'K: Logbook-resultId → [c2:987] identiteit');
ok(/split:2:00\/500m/.test(rowActual.row.note) && /hr 150/.test(rowActual.row.note), 'J: split 500m + hr in note');
// bike → 1000m + eigen exercise
const bikeActual = C.liveWorkoutToActual({ machineType:'bikeerg', date:'2026-08-17', distance_m:4000, duration_s:600 }, {});
eq(bikeActual.row.exercise_id, 'bikeerg', 'L: BikeErg live → exercise_id bikeerg (niet roeien)');
ok(/\/1000m/.test(bikeActual.row.note), 'L: BikeErg split-basis 1000m');
// ski
eq(C.liveWorkoutToActual({ machineType:'skierg', distance_m:1000, duration_s:240 }, {}).row.exercise_id, 'skierg', 'M: SkiErg live → skierg');
// lokale identiteit als geen resultId + dedup tegen [c2:] én [c2local:]
const localActual = C.liveWorkoutToActual({ machineType:'rowerg', distance_m:1000, duration_s:240, localId:'abc' }, {});
ok(/\[c2local:abc\]/.test(localActual.row.note), 'K: geen resultId → lokale identiteit [c2local:abc]');
ok(C.alreadyLoggedLive('abc', [{ note:'x [c2local:abc]' }]) === true, 'K: dedup herkent bestaande lokale import');
ok(C.alreadyLoggedLive('987', [{ note:'y [c2:987]' }]) === true, 'K: dedup herkent bestaande Logbook-import');
ok(C.alreadyLoggedLive('nieuw', [{ note:'[c2:987]' }]) === false, 'K: nieuwe workout niet als duplicaat');
// measured vs derived provenance op completion
eq(C.liveWorkoutToActual({ machineType:'rowerg', distance_m:2000, duration_s:480 }, {}).provenance.watts_source, 'concept2_derived', 'H: completion afgeleide watts → concept2_derived');
eq(C.liveWorkoutToActual({ machineType:'rowerg', distance_m:2000, duration_s:480, watts:210 }, {}).provenance.watts_source, 'concept2_measured', 'H: completion gemeten watts → concept2_measured');
// geen prescription-velden
ok(!('sets' in rowActual.row) && !('reps' in rowActual.row), 'N: actual bevat geen prescription/target-velden');

// ── L/M. MOCK PM5-SIMULATOR (RowErg/SkiErg/BikeErg) ──
function runScenario(mt, points, finish){
  const t = C.makeMockConcept2PM5({ machineType: mt, points: points, finishSummary: finish });
  const conn = []; t.subscribeConnection(e => conn.push(e.state));
  const updates = []; t.subscribeMetrics(e => updates.push(e.metrics));
  const c = t.connect(); ok(c.connected === true, 'sim '+mt+': connect → connected (echt, niet fake)');
  let tick = 0; while (t._tick({ timestamp: ++tick }) !== null) {}
  ok(updates.length === points.length, 'sim '+mt+': live updates = aantal samples ('+updates.length+')');
  ok(updates[updates.length-1].distanceM >= updates[0].distanceM, 'sim '+mt+': afstand loopt op');
  const actual = t._finish();
  eq(actual.row.exercise_id, C.exerciseForMachine(mt), 'sim '+mt+': completion → juiste exercise_id');
  t.disconnect(); ok(conn.indexOf('connected') !== -1 && conn.indexOf('disconnected') !== -1, 'sim '+mt+': connectie-events geëmit');
  return { updates, actual };
}
runScenario('rowerg', [{distance_m:0,elapsed_s:0,stroke_rate_spm:0},{distance_m:500,elapsed_s:95,stroke_rate_spm:30,watts:200},{distance_m:1000,elapsed_s:190,stroke_rate_spm:31,watts:205},{distance_m:2000,elapsed_s:380,stroke_rate_spm:30,watts:210}], {machineType:'rowerg',distance_m:2000,duration_s:380,watts:210});
runScenario('skierg', [{distance_m:0,elapsed_s:0},{distance_m:500,elapsed_s:100},{distance_m:1000,elapsed_s:205}], {machineType:'skierg',distance_m:1000,duration_s:205});
runScenario('bikeerg', [{distance_m:0,elapsed_s:0},{distance_m:1000,elapsed_s:110},{distance_m:2000,elapsed_s:225}], {machineType:'bikeerg',distance_m:2000,duration_s:225});

// ── N/O. FAILURE MODEL (NL microcopy) ──
ok(/Bluetooth/.test(C.failureMessage('bluetooth_unavailable')), 'O: bluetooth_unavailable NL-microcopy');
ok(/andere app/.test(C.failureMessage('already_connected')), 'O: already_connected microcopy (connection ownership)');
ok(/toestemming/.test(C.failureMessage('permission_denied')), 'O: permission_denied microcopy');
eq(C.CONN_STATES.length, 11, 'device-lifecycle: 11 states');

// ── PAIRING-FLOW helpers (discover → select → connect) ──
eq(C.pairingMessage('bluetooth_off'), 'Bluetooth staat uit. Zet Bluetooth aan om je Concept2 te koppelen.', 'pairing: bluetooth_off microcopy');
ok(/Bluetooth-toegang nodig/.test(C.pairingMessage('permission_required')), 'pairing: permission microcopy');
ok(/zoeken/.test(C.pairingMessage('scanning')), 'pairing: scanning microcopy');
ok(/app-versie/.test(C.pairingMessage('not_available')), 'pairing: web-fallback microcopy (geen fake)');
ok(C.PAIRING_STATES.indexOf('device_found')!==-1 && C.PAIRING_STATES.length===11, 'pairing: 11 states');
// signaal-label
eq(C.signalLabel(-50), 'Sterk signaal', 'signal: -50 → sterk');
eq(C.signalLabel(-70), 'Matig signaal', 'signal: -70 → matig');
eq(C.signalLabel(-85), 'Zwak signaal', 'signal: -85 → zwak');
eq(C.signalLabel(null), '', 'signal: onbekend → leeg (geen fake)');
// machine-context match
eq(C.machineMatchesExercise('rowerg','rowing').match, true, 'machine: RowErg-apparaat past bij rowing-oefening');
eq(C.machineMatchesExercise('skierg','rowing').match, false, 'machine: SkiErg-apparaat past NIET bij rowing');
ok(/SkiErg[\s\S]*RowErg/.test(C.machineMatchesExercise('skierg','rowing').message), 'machine: mismatch-melding noemt beide machines');
eq(C.machineMatchesExercise('unknown','rowing').match, true, 'machine: onbekend type → geen mismatch (laat bevestigen)');
eq(C.machineMatchesExercise('bikeerg','bikeerg').match, true, 'machine: BikeErg past bij bikeerg');
// mock discovery: echte device-lijst met machineType + rssi
var mk = C.makeMockConcept2PM5({ machineType:'rowerg', devices:[
  { id:'PM5-A1B2', name:'Concept2 PM5', machineType:'rowerg', rssi:-52 },
  { id:'PM5-C3D4', name:'Concept2 PM5', machineType:'skierg', rssi:-80 }
]});
var found = mk.discover();
eq(found.length, 2, 'discovery: 2 ontdekte apparaten');
eq(found[0].machineType, 'rowerg', 'discovery: eerste = RowErg');
eq(C.signalLabel(found[0].rssi), 'Sterk signaal', 'discovery: rssi → signaal-label');
eq(mk.getPermissionState(), 'granted', 'discovery: permission-state opvraagbaar');

console.log('\nConcept2 LIVE foundation: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
