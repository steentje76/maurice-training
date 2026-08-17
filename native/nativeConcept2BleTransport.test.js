/*
 * Unit tests voor NativeConcept2BleTransport — draait in node ZONDER fysiek PM5.
 * Gebruikt een MockBleGateway die het BleGateway-contract implementeert.
 * GEEN verzonnen payloads als "bewijs": de mock levert alleen synthetische bytes
 * om het WIRING (capture/decoder-emit/verbindingsstates) te testen, niet om
 * echte PM5-metrics te valideren (dat blijft EXTERN BLOCKED).
 */
'use strict';
var path = require('path');
var Concept2Live = require(path.join(__dirname, '..', 'core', 'concept2Live.js'));
var NT = require(path.join(__dirname, 'src', 'nativeConcept2BleTransport.js'));

var pass = 0, fail = 0, msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }
function eq(a, b, label) { ok(a === b, label + ' (verwacht ' + b + ', kreeg ' + a + ')'); }

// ---- deterministische klok + timer -----------------------------------------
var _t = 1000;
function fakeNow() { return _t; }
function immediateTimeout(fn) { fn(); return 1; }
function noopClear() {}

// ---- DataView-helper --------------------------------------------------------
function dv(bytes) {
  var b = new Uint8Array(bytes);
  return new DataView(b.buffer);
}

// ---- MockBleGateway ---------------------------------------------------------
function makeMockGateway(cfg) {
  cfg = cfg || {};
  var notifyCbs = {};   // charUuidLower -> onValue
  var state = {
    enabled: cfg.enabled !== false,
    permission: cfg.permission || 'granted',
    scanned: cfg.scanned || [],
    connected: false,
    disconnectCb: null,
    calls: { scan: 0, stopScan: 0, connect: 0, disconnect: 0, startNotif: 0, stopNotif: 0, read: 0 }
  };
  var gw = {
    isEnabled: function () { return Promise.resolve(state.enabled); },
    checkPermission: function () { return Promise.resolve(state.permission); },
    requestPermission: function () { state.permission = cfg.grantOnRequest === false ? 'denied' : 'granted'; return Promise.resolve(state.permission); },
    scan: function (svc, onResult) {
      state.calls.scan++;
      state.scanned.forEach(function (d) { onResult(d); });
      return Promise.resolve();
    },
    stopScan: function () { state.calls.stopScan++; return Promise.resolve(); },
    connect: function (id, onDisconnect) { state.calls.connect++; state.connected = true; state.disconnectCb = onDisconnect; return Promise.resolve(); },
    disconnect: function () { state.calls.disconnect++; state.connected = false; return Promise.resolve(); },
    getServices: function () { return Promise.resolve([]); },
    startNotifications: function (id, svc, ch, onValue) { state.calls.startNotif++; notifyCbs[String(ch).toLowerCase()] = onValue; return Promise.resolve(); },
    stopNotifications: function () { state.calls.stopNotif++; return Promise.resolve(); },
    read: function () { state.calls.read++; return Promise.resolve(dv([0x01, 0x02])); },
    readRssi: function () { return Promise.resolve(-55); },
    // test-helpers
    _emit: function (charUuid, bytes) { var cb = notifyCbs[String(charUuid).toLowerCase()]; if (cb) cb(dv(bytes)); },
    _fireDisconnect: function () { if (state.disconnectCb) state.disconnectCb('dev'); },
    _state: state
  };
  return gw;
}

function makeTransport(cfg) {
  var gw = makeMockGateway(cfg);
  var t = NT.makeNativeConcept2BleTransport({
    gateway: gw, concept2Live: Concept2Live,
    now: fakeNow, setTimeoutFn: immediateTimeout, clearTimeoutFn: noopClear
  });
  return { t: t, gw: gw };
}

// ===== TESTS =================================================================
(function run() {

  // 1. contract-vorm
  var c = makeTransport().t;
  eq(c.available, true, 'available===true');
  ['getPermissionState','discover','connect','disconnect','getStatus','getDeviceInfo',
   'subscribeMetrics','unsubscribeMetrics','subscribeConnection','getCurrentMetrics','reset']
   .forEach(function (m) { ok(typeof c[m] === 'function', 'contract-methode ' + m); });

  // 2. notify-chars afgeleid uit Concept2Live UUID-matrix (incl. stroke/split/summary/csafe)
  var uuids = c._notifyChars.map(function (n) { return String(n.uuid).toUpperCase(); });
  ok(uuids.some(function (u) { return u.indexOf('CE060035') === 0; }), 'notify bevat strokeData 0x0035');
  ok(uuids.some(function (u) { return u.indexOf('CE060022') === 0; }), 'notify bevat CSAFE transmit 0x0022');
  ok(c._scanServiceUuids.length >= 1, 'scan-filter heeft minstens 1 service-UUID');

  // 3. alle decoders standaard UNKNOWN (geen gegokte decoder)
  var ds = c.decoderStatus();
  var allUnknown = Object.keys(ds).every(function (u) { return ds[u] === 'UNKNOWN'; });
  ok(allUnknown && Object.keys(ds).length > 0, 'alle notify-decoders standaard UNKNOWN');

  // 4. permissie-mapping — getPermissionState is SYNCHROON (contractvorm zoals mock)
  var syncP = makeTransport().t;
  eq(typeof syncP.getPermissionState(), 'string', 'getPermissionState is synchroon (string)');
  eq(syncP.getPermissionState(), 'granted', 'getPermissionState default optimistisch granted');
  // refreshPermissionState is async en ververst de cache
  var offP = makeTransport({ enabled: false });
  offP.t.refreshPermissionState().then(function (s) {
    eq(s, 'bluetooth_off', 'refresh: bluetooth uit -> bluetooth_off');
    eq(offP.t.getPermissionState(), 'bluetooth_off', 'sync-cache bijgewerkt naar bluetooth_off');
  });
  var denyP = makeTransport({ permission: 'denied' });
  denyP.t.refreshPermissionState().then(function (s) { eq(s, 'denied', 'refresh: geweigerd -> denied'); });

  // 5. discovery mapt scan-resultaten -> {id,name,machineType:'unknown',rssi}
  var dsc = makeTransport({ scanned: [
    { deviceId: 'AA:BB:CC:11:22:33', name: 'PM5 430', rssi: -60 },
    { deviceId: 'AA:BB:CC:11:22:33', name: 'PM5 430', rssi: -60 }, // duplicate -> 1
    { deviceId: 'DD:EE:FF:44:55:66', name: 'PM5', rssi: -75 }
  ]});
  dsc.t.discover({ scanMs: 10 }).then(function (list) {
    eq(list.length, 2, 'discovery dedupliceert op deviceId');
    ok(list[0].machineType === 'unknown', 'discovery machineType=unknown (niet gegokt pre-connect)');
    ok(typeof list[0].rssi === 'number', 'discovery levert rssi door');
    eq(dsc.gw._state.calls.stopScan, 1, 'discovery stopt de scan');
  });

  // 6. discovery met bluetooth uit -> reject bluetooth_off, geen scan
  var offD = makeTransport({ enabled: false });
  offD.t.discover({ scanMs: 10 }).then(function () { ok(false, 'discovery had moeten falen (bluetooth uit)'); },
    function (err) { ok(err && err.code === 'bluetooth_off', 'discovery faalt met code bluetooth_off'); eq(offD.gw._state.calls.scan, 0, 'geen scan bij bluetooth uit'); });

  // 7. connect: echte gateway-connect, subscribe op notify-chars, connected-event, NOOIT fake
  var cn = makeTransport({ scanned: [] });
  var connEvents = [];
  cn.t.subscribeConnection(function (e) { connEvents.push(e.state); });
  cn.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function (res) {
    eq(res.connected, true, 'connect -> connected:true');
    eq(res.machineType, 'rowerg', 'connect bewaart door-gebruiker-bevestigde machineType rowerg');
    eq(cn.gw._state.calls.connect, 1, 'connect roept gateway.connect exact 1x');
    ok(cn.gw._state.calls.startNotif >= 2, 'connect abonneert op meerdere notify-chars');
    ok(connEvents.indexOf('connecting') !== -1 && connEvents.indexOf('connected') !== -1, 'connect emit connecting->connected');
    eq(cn.t.getStatus().state, 'connected', 'status=connected na connect');

    // 8. UNKNOWN payload: capture UIT -> geen capture, geen metric-emit
    var metricHits = 0;
    cn.t.subscribeMetrics(function () { metricHits++; });
    cn.gw._emit('CE060035-43E5-11E4-916C-0800200C9A66', [0x10, 0x20, 0x30]);
    eq(metricHits, 0, 'UNKNOWN characteristic emit GEEN metric');
    eq(cn.t.getCapture().length, 0, 'capture uit -> niets vastgelegd');

    // 9. capture AAN -> record {uuid,t,bytes} vastgelegd, nog steeds geen metric
    cn.t.enableCapture();
    cn.gw._emit('CE060035-43E5-11E4-916C-0800200C9A66', [0xDE, 0xAD, 0xBE]);
    var cap = cn.t.getCapture();
    eq(cap.length, 1, 'capture aan -> 1 record');
    eq(cap[0].hex, 'deadbe', 'capture legt ruwe bytes (hex) vast');
    eq(cap[0].t, 1000, 'capture record heeft timestamp');
    ok(cap[0].uuid.indexOf('ce060035') === 0, 'capture record heeft characteristic-uuid');
    eq(metricHits, 0, 'capture aan verandert niets aan metric-emit (nog UNKNOWN)');
    // geen PII/health-velden in capture-record
    ok(!('hr' in cap[0]) && !('heartRate' in cap[0]) && !('name' in cap[0]), 'capture-record bevat geen PII/health-velden');

    // 10. exportCapture maskeert device-id (privacy)
    var exp = cn.t.exportCapture();
    ok(exp.deviceIdMasked && exp.deviceIdMasked.charAt(0) === '…' && exp.deviceIdMasked.slice(-4) === '2:33' && exp.deviceIdMasked.length === 5, 'exportCapture maskeert deviceId (… + laatste 4)');

    // 11. BEVESTIGDE decoder -> metric wordt WEL geëmit als {metrics:raw}, raw gaat door normalizeLiveMetric
    cn.t.registerDecoder('CE060035-43E5-11E4-916C-0800200C9A66', function (d) {
      return { distanceM: d.getUint8(0), elapsedTimeS: d.getUint8(1), strokeRateSPM: d.getUint8(2) };
    }, 'CONFIRMED');
    var lastRaw = null;
    cn.t.subscribeMetrics(function (evt) { lastRaw = evt.metrics; });
    cn.gw._emit('CE060035-43E5-11E4-916C-0800200C9A66', [100, 42, 30]);
    ok(lastRaw && lastRaw.distanceM === 100 && lastRaw.strokeRateSPM === 30, 'bevestigde decoder emit RAW metric');
    // web-laag normaliseert die raw:
    var canon = Concept2Live.normalizeLiveMetric(lastRaw, 'rowerg', {});
    ok(canon && canon.exerciseId === 'roeien', 'raw -> Concept2Live.normalizeLiveMetric -> exerciseId roeien');

    // 12. reconnect-signaal bij echte disconnect tijdens connected (workout NIET resetten)
    var before = connEvents.length;
    cn.gw._fireDisconnect();
    ok(connEvents[connEvents.length - 1] === 'reconnecting', 'gateway-disconnect tijdens connected -> reconnecting');

    // 13. disconnect: stopt notifs + gateway.disconnect + disconnected-event
    cn.t.disconnect().then(function () {
      ok(cn.gw._state.calls.disconnect >= 1, 'disconnect roept gateway.disconnect');
      ok(cn.gw._state.calls.stopNotif >= 2, 'disconnect stopt notify-subscriptions');
      eq(cn.t.getStatus().state, 'disconnected', 'status=disconnected na disconnect');

      // 14. reset: alles schoon
      cn.t.enableCapture();
      cn.gw._emit && cn.t.getCapture(); // noop
      cn.t.reset().then(function () {
        eq(cn.t.getCapture().length, 0, 'reset wist capture');
        eq(cn.t.getCurrentMetrics(), null, 'reset wist currentMetrics');
        eq(cn.t.getStatus().state, 'idle', 'reset -> idle');

        // ---- rapport ----
        setImmediate ? setImmediate(report) : report();
      });
    });
  }).catch(function (e) { fail++; msgs.push('EXCEPTIE: ' + (e && e.message)); report(); });

  function report() {
    if (msgs.length) console.log(msgs.join('\n'));
    console.log('NativeConcept2BleTransport: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
    if (fail > 0) process.exit(1);
  }
})();
