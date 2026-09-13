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
    lastScanServices: null,
    calls: { scan: 0, stopScan: 0, connect: 0, disconnect: 0, startNotif: 0, stopNotif: 0, read: 0 }
  };
  var gw = {
    isEnabled: function () { return Promise.resolve(state.enabled); },
    checkPermission: function () { return Promise.resolve(state.permission); },
    requestPermission: function () { state.permission = cfg.grantOnRequest === false ? 'denied' : 'granted'; return Promise.resolve(state.permission); },
    scan: function (svc, onResult) {
      state.calls.scan++;
      state.lastScanServices = Array.isArray(svc) ? svc.slice() : svc;
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
  ['getPermissionState','discover','getLastDiscoveryDiagnostics','connect','disconnect','getStatus','getDeviceInfo',
   'subscribeMetrics','unsubscribeMetrics','subscribeConnection','getCurrentMetrics','reset']
   .forEach(function (m) { ok(typeof c[m] === 'function', 'contract-methode ' + m); });

  // 2. notify-chars afgeleid uit Concept2Live UUID-matrix (incl. stroke/split/summary/csafe)
  var uuids = c._notifyChars.map(function (n) { return String(n.uuid).toUpperCase(); });
  ok(uuids.some(function (u) { return u.indexOf('CE060035') === 0; }), 'notify bevat strokeData 0x0035');
  ok(uuids.some(function (u) { return u.indexOf('CE060022') === 0; }), 'notify bevat CSAFE transmit 0x0022');
  ok(c._scanServiceUuids.length >= 1, 'software-classificatie kent Concept2 service-UUIDs');

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

  // 5. discovery scant OS-ongefilterd en classificeert uitsluitend op geadverteerde C2-service-UUIDs
  var pmDataUuid = Concept2Live.CONCEPT2_BLE_UUIDS.services.pmData.uuid;
  var deviceInfoUuid = Concept2Live.CONCEPT2_BLE_UUIDS.services.deviceInfo.uuid;
  var dsc = makeTransport({ scanned: [
    { deviceId: 'AA:BB:CC:11:22:33', name: 'PM5 430', rssi: -60, uuids: [pmDataUuid] },
    { deviceId: 'AA:BB:CC:11:22:33', name: 'PM5 430', rssi: -60, uuids: [pmDataUuid] }, // duplicate -> 1 resultaat
    { deviceId: 'DD:EE:FF:44:55:66', name: 'PM5', rssi: -75, uuids: [deviceInfoUuid] },
    { deviceId: '11:22:33:44:55:66', name: 'PM5 fake name', rssi: -50, uuids: ['0000180d-0000-1000-8000-00805f9b34fb'] }
  ]});
  dsc.t.discover({ scanMs: 10 }).then(function (list) {
    eq(dsc.gw._state.lastScanServices.length, 0, 'Concept2 discovery gebruikt GEEN OS-level servicefilter');
    eq(list.length, 2, 'discovery accepteert C2-advertenties, dedupliceert en sluit niet-C2 uit');
    ok(list[0].machineType === 'unknown', 'discovery machineType=unknown (niet gegokt pre-connect)');
    ok(typeof list[0].rssi === 'number', 'discovery levert rssi door');
    eq(dsc.gw._state.calls.stopScan, 1, 'discovery stopt de scan');
    var diag = dsc.t.getLastDiscoveryDiagnostics();
    eq(diag.permissionState, 'granted', 'diagnostiek bevat permissionstatus');
    eq(diag.advertisementsSeen, 4, 'diagnostiek telt alle BLE-advertenties');
    eq(diag.devices.length, 4, 'diagnostiek bevat elk gezien device');
    eq(diag.devices.filter(function (d) { return d.matched; }).length, 3, 'diagnostiek markeert alleen C2-UUID-advertenties als match');
    ok(diag.devices.some(function (d) { return !d.matched && d.name === 'PM5 fake name'; }), 'device-naam alleen is NOOIT voldoende voor Concept2-classificatie');
    ok(diag.devices.every(function (d) { return d.deviceIdMasked && d.deviceIdMasked.charAt(0) === '…'; }), 'diagnostiek maskeert device-id');
  });

  // 5b. REAL-DEVICE REGRESSIE (Concept2 RowErg + PM5, Android APK, 13-09-2026):
  //     de echte PM5 adverteert FTMS 0x1826 + de canonieke Concept2 BASE-UUID (CE060000),
  //     NIET de specifieke CE0600xx-services. Dit patroon werd vóór deze fix afgewezen
  //     (no_concept2_service_uuid). Geen enkel fysiek device-ID hieronder; het echte
  //     serienummer in de naam is bewust irrelevant voor de classificatie.
  var FTMS = '00001826-0000-1000-8000-00805f9b34fb';
  var BASE_LC = 'ce060000-43e5-11e4-916c-0800200c9a66';
  var BASE_UC = 'CE060000-43E5-11E4-916C-0800200C9A66';
  eq(String(Concept2Live.CONCEPT2_BLE_UUIDS.base).toLowerCase(), BASE_LC, 'CE060000 is de canonieke Concept2 base-UUID in concept2Live.js (spec/APK_OBSERVED)');
  var rd = makeTransport({ scanned: [
    { deviceId: 'test-pm5-device', name: 'PM5 430716776 Row', rssi: -40, uuids: [FTMS, BASE_LC] },             // echte PM5-advertentie
    { deviceId: 'test-pm5-device', name: 'PM5 430716776 Row', rssi: -40, uuids: [BASE_LC, FTMS, BASE_LC] },    // J: dubbele/gemengde UUIDs, zelfde device
    { deviceId: 'test-ftms-only',  name: 'Generic Bike',       rssi: -55, uuids: [FTMS] },                      // F: generiek FTMS
    { deviceId: 'test-random',     name: 'Random BLE',         rssi: -70, uuids: ['0000180d-0000-1000-8000-00805f9b34fb'] }, // G
    { deviceId: 'test-uppercase',  name: 'PM5 other Row',      rssi: -50, uuids: [BASE_UC] },                   // I: uppercase base
    { deviceId: 'test-name-only',  name: 'PM5 000000 Row',     rssi: -45, uuids: [] },                          // naam alleen
    { deviceId: 'test-svc-30',     name: 'PM5 svc',            rssi: -52, uuids: [pmDataUuid] }                 // H: specifieke service
  ]});
  rd.t.discover({ scanMs: 10 }).then(function (list) {
    // A. OS-level scan blijft ongefilterd
    eq(rd.gw._state.lastScanServices.length, 0, 'A: gateway.scan() krijgt [] als servicefilter (ongefilterde discovery intact)');
    // B/C. echte PM5-advertentie geaccepteerd, exact één device-entry
    var pm5 = list.filter(function (d) { return d.id === 'test-pm5-device'; });
    eq(pm5.length, 1, 'B/C/J: echte PM5-advertentie (FTMS + CE060000) wordt als Concept2 geaccepteerd, precies één device-entry ondanks herhaalde/dubbele UUIDs');
    eq(pm5[0] && pm5[0].name, 'PM5 430716776 Row', 'C: discover() levert de device-naam door (bestaand contract)');
    eq(pm5[0] && pm5[0].machineType, 'unknown', 'C: machineType blijft unknown pre-connect (geen gok)');
    eq(pm5[0] && pm5[0].rssi, -40, 'C: rssi doorgegeven');
    // F/G/naam: negatieve tests
    ok(!list.some(function (d) { return d.id === 'test-ftms-only'; }), 'F: generiek FTMS-apparaat (alleen 0x1826) is GEEN Concept2');
    ok(!list.some(function (d) { return d.id === 'test-random'; }), 'G: willekeurig BLE-apparaat zonder Concept2-UUID is GEEN Concept2');
    ok(!list.some(function (d) { return d.id === 'test-name-only'; }), 'naam "PM5 ... Row" zonder UUID is GEEN Concept2 (geen name-fallback, geen hardcode)');
    // H/I. specifieke service en uppercase base blijven werken
    ok(list.some(function (d) { return d.id === 'test-svc-30'; }), 'H: bestaande specifieke Concept2-service-UUID (CE060030) blijft matchen');
    ok(list.some(function (d) { return d.id === 'test-uppercase'; }), 'I: uppercase CE060000 base-UUID matcht identiek (lc()-normalisatie)');
    eq(list.length, 3, 'exact 3 Concept2-devices: echte PM5, uppercase-base, specifieke-service');
    // D/E. diagnostics + reason-semantiek
    var diag = rd.t.getLastDiscoveryDiagnostics();
    var dPm5 = diag.devices.filter(function (d) { return d.name === 'PM5 430716776 Row'; });
    ok(dPm5.length === 2 && dPm5.every(function (d) { return d.matched === true; }), 'D: diagnostics rapporteert matched=true voor de echte PM5-advertentie');
    ok(dPm5.every(function (d) { return d.reason === 'concept2_base_uuid'; }), 'E: reason = concept2_base_uuid bij base-match');
    var dSvc = diag.devices.filter(function (d) { return d.name === 'PM5 svc'; })[0];
    eq(dSvc && dSvc.reason, 'concept2_service_uuid', 'E/H: reason = concept2_service_uuid bij specifieke-service-match (bestaande code behouden)');
    var dFtms = diag.devices.filter(function (d) { return d.name === 'Generic Bike'; })[0];
    ok(dFtms && dFtms.matched === false && dFtms.reason === 'no_concept2_service_uuid', 'F: FTMS-only krijgt matched=false, reason=no_concept2_service_uuid');
    ok(diag.devices.every(function (d) { return d.uuids.every(function (u) { return u === u.toLowerCase(); }); }), 'I: alle UUIDs in diagnostics zijn lowercase-genormaliseerd (één canonical lc())');
    eq(diag.devices.filter(function (d) { return d.matched; }).length, 4, 'J: matchtelling per advertentie (2x PM5 + uppercase + service), geen extra tellingen door dubbele UUIDs binnen één advertentie');
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
