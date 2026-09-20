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
    getServices: function () { state.calls.getServices = (state.calls.getServices || 0) + 1; return Promise.resolve(Array.isArray(cfg.services) ? cfg.services : []); },
    startNotifications: function (id, svc, ch, onValue) {
      state.calls.startNotif++;
      // cfg.failNotif: lijst (lowercase char-uuid-prefix) die 'Characteristic not found.' simuleert (plugin-gedrag)
      var lcCh = String(ch).toLowerCase();
      if (Array.isArray(cfg.failNotif) && cfg.failNotif.some(function (p) { return lcCh.indexOf(String(p).toLowerCase()) === 0; })) {
        return Promise.reject(new Error('Characteristic not found.'));
      }
      notifyCbs[lcCh] = onValue; return Promise.resolve();
    },
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
  cfg = cfg || {};
  var gw = makeMockGateway(cfg);
  var t = NT.makeNativeConcept2BleTransport({
    subscriptionMode: cfg.subscriptionMode,
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

    // 3. alleen CE060080 heeft een officieel onderbouwde decoder (spec rev. 1.30 Tabel 4);
    //    alle overige notify-chars blijven UNKNOWN (geen gegokte decoder)
  var ds = c.decoderStatus();
    var MUX = 'ce060080-43e5-11e4-916c-0800200c9a66';
    eq(ds[MUX], 'CONFIRMED', 'CE060080 heeft de officieel gespecificeerde multiplexed router');
    var restUnknown = Object.keys(ds).every(function (u) { return u === MUX || ds[u] === 'UNKNOWN'; });
    ok(restUnknown && Object.keys(ds).length > 1, 'alle overige notify-decoders blijven UNKNOWN');

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
    cn.gw._emit('CE060080-43E5-11E4-916C-0800200C9A66', [0x10, 0x20, 0x30]);
    eq(metricHits, 0, 'UNKNOWN characteristic emit GEEN metric');
    eq(cn.t.getCapture().length, 0, 'capture uit -> niets vastgelegd');

    // 9. capture AAN -> record {uuid,t,bytes} vastgelegd, nog steeds geen metric
    cn.t.enableCapture();
    cn.gw._emit('CE060080-43E5-11E4-916C-0800200C9A66', [0xDE, 0xAD, 0xBE]);
    var cap = cn.t.getCapture();
    eq(cap.length, 1, 'capture aan -> 1 record');
    eq(cap[0].hex, 'deadbe', 'capture legt ruwe bytes (hex) vast');
    eq(cap[0].t, 1000, 'capture record heeft timestamp');
    ok(cap[0].uuid.indexOf('ce060080') === 0, 'capture record heeft characteristic-uuid');
    eq(metricHits, 0, 'capture aan verandert niets aan metric-emit (nog UNKNOWN)');
    // geen PII/health-velden in capture-record
    ok(!('hr' in cap[0]) && !('heartRate' in cap[0]) && !('name' in cap[0]), 'capture-record bevat geen PII/health-velden');

    // 10. exportCapture maskeert device-id (privacy)
    var exp = cn.t.exportCapture();
    ok(exp.deviceIdMasked && exp.deviceIdMasked.charAt(0) === '…' && exp.deviceIdMasked.slice(-4) === '2:33' && exp.deviceIdMasked.length === 5, 'exportCapture maskeert deviceId (… + laatste 4)');

    // 11. BEVESTIGDE decoder -> metric wordt WEL geëmit als {metrics:raw}, raw gaat door normalizeLiveMetric
    cn.t.registerDecoder('CE060080-43E5-11E4-916C-0800200C9A66', function (d) {
      return { distanceM: d.getUint8(0), elapsedTimeS: d.getUint8(1), strokeRateSPM: d.getUint8(2) };
    }, 'CONFIRMED');
    var lastRaw = null;
    cn.t.subscribeMetrics(function (evt) { lastRaw = evt.metrics; });
    cn.gw._emit('CE060080-43E5-11E4-916C-0800200C9A66', [100, 42, 30]);
    ok(lastRaw && lastRaw.distanceM === 100 && lastRaw.strokeRateSPM === 30, 'bevestigde decoder emit RAW metric');
    // web-laag normaliseert die raw:
    var canon = Concept2Live.normalizeLiveMetric(lastRaw, 'rowerg', {});
    ok(canon && canon.exerciseId === 'roeien', 'raw -> Concept2Live.normalizeLiveMetric -> exerciseId roeien');

    // 12. (Fase B, Connection Observability) diagnostiek is gevuld na connect (J/K/L)
    var cd = cn.t.getConnectionDiagnostics();
    ok(typeof cd.connectedAt === 'number', 'J: connectedAt gezet na connect');
    ok(cd.subscriptions.length === 2 && cd.subscriptions.every(function (r) { return r.attempted === true && typeof r.ok === 'boolean' && typeof r.at === 'number' && typeof r.order === 'number'; }),
      'J: elke subscription-poging is geregistreerd met order (control 0x0022 + multiplexed 0x0080 = 2; individuele data-chars NIET tegelijk)');
    ok(cd.totals.subscriptionsOk + cd.totals.subscriptionsFailed === cd.subscriptions.length, 'J: totals consistent met subscriptielijst');
    ok(cd.notifications['ce060080-43e5-11e4-916c-0800200c9a66'] && cd.notifications['ce060080-43e5-11e4-916c-0800200c9a66'].count >= 1 && typeof cd.notifications['ce060080-43e5-11e4-916c-0800200c9a66'].lastAt === 'number',
      'K: notificatie-teller + lastNotificationAt per characteristic bijgewerkt');
    ok(cd.totals.notifications >= 1, 'K: totaal-notificatieteller > 0');
    ok(!JSON.stringify(cd).includes('hex') && !JSON.stringify(cd).includes('"bytes"'), 'N: verbindingsdiagnostiek bevat GEEN payload');
    eq(cd.state, 'connected', 'L: connected zonder telemetry-decoder blijft connected');
    eq(cd.lastDisconnectReason, null, 'geen disconnect-reden zolang verbonden');

    // 13. expliciete app-disconnect (user) VOOR de plugin-disconnect: stopt notifs + gateway.disconnect + bekende reden
    var cn2 = makeTransport({});
    cn2.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function () {
      return cn2.t.disconnect('user_disconnect');
    }).then(function () {
      ok(cn2.gw._state.calls.disconnect >= 1, 'disconnect roept gateway.disconnect');
      ok(cn2.gw._state.calls.stopNotif >= 2, 'disconnect stopt notify-subscriptions');
      eq(cn2.t.getStatus().state, 'disconnected', 'status=disconnected na disconnect');
      var d2 = cn2.t.getConnectionDiagnostics();
      eq(d2.lastDisconnectReason, 'KNOWN_APP_REASON:user_disconnect', 'app-disconnect krijgt een bekende reden (eerlijk contract)');
      ok(typeof d2.disconnectedAt === 'number', 'disconnectedAt gezet bij app-disconnect');
    }).then(function () {
      // 13b. (Fase B) ECHTE plugin-disconnect tijdens connected -> 'disconnected' (GEEN fake 'reconnecting'), deviceId null, eerlijke reden
      cn.gw._fireDisconnect();
      ok(connEvents[connEvents.length - 1] === 'disconnected', 'E/G: plugin-disconnect tijdens connected -> disconnected (geen fake reconnecting)');
      ok(connEvents.indexOf('reconnecting') === -1, 'G: het transport emit nooit meer reconnecting');
      eq(cn.t.getStatus().state, 'disconnected', 'E: transport-state disconnected na plugin-disconnect');
      eq(cn.t.getStatus().deviceId, null, 'E: deviceId=null na plugin-disconnect (GATT is door de plugin gesloten)');
      var d3 = cn.t.getConnectionDiagnostics();
      eq(d3.lastDisconnectReason, 'PLUGIN_DISCONNECT:unknown_native_disconnect', 'eerlijk contract: geen verzonnen native statuscode');
      ok(typeof d3.disconnectedAt === 'number', 'disconnectedAt gezet bij plugin-disconnect');
      ok(d3.subscriptions.length === 2, 'subscriptie-historie blijft beschikbaar na disconnect (diagnose achteraf)');
      // 13c. na plugin-disconnect is een app-disconnect idempotent (geen tweede gateway.disconnect nodig)
      var before = cn.gw._state.calls.disconnect;
      return cn.t.disconnect().then(function () {
        eq(cn.gw._state.calls.disconnect, before, 'disconnect na plugin-disconnect roept gateway.disconnect niet opnieuw (deviceId al null)');
        eq(cn.t.getStatus().state, 'disconnected', 'status blijft disconnected');
      });
    }).then(function () {
      // 13d. (Fase B, §8/§I) partial subscription failure: ontbrekende characteristics falen
      //      fail-safe (geen fatal disconnect), en de uitkomst per char is zichtbaar in de diagnostiek.
      var pf = makeTransport({ failNotif: ['ce060080'] }); // multiplexed data-char ontbreekt op dit toestel
      var pfEvents = [];
      pf.t.subscribeConnection(function (e) { pfEvents.push(e.state); });
      return pf.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function (res) {
        eq(res.connected, true, 'I: connect slaagt ondanks ontbrekende characteristic (fail-safe, ongewijzigd gedrag)');
        eq(pf.t.getStatus().state, 'connected', 'I: state blijft connected na partial subscription failure');
        ok(pfEvents.indexOf('error') === -1 && pfEvents.indexOf('disconnected') === -1, 'I: geen error/disconnected-event door ontbrekende char');
        var pd = pf.t.getConnectionDiagnostics();
        var failed = pd.subscriptions.filter(function (r) { return r.ok === false; });
        eq(failed.length, 1, 'J: exact de mislukte subscription is als failed geregistreerd');
        ok(failed.every(function (r) { return r.error === 'Characteristic not found.'; }), 'J: plugin-foutstring per mislukte char vastgelegd');
        eq(pd.totals.subscriptionsFailed, 1, 'J: totals.subscriptionsFailed = 1');
        eq(pd.totals.subscriptionsOk, pd.subscriptions.length - 1, 'J: totals.subscriptionsOk = rest');
        eq(pd.lastDisconnectReason, null, 'I: subscription failure zet geen disconnect-reden (niet fatal)');
        pf.gw._emit('CE060022-43E5-11E4-916C-0800200C9A66', [1, 2, 3]);
        eq(pf.t.getConnectionDiagnostics().totals.notifications, 1, 'K: notificaties op wél-geslaagde chars worden geteld');
      });
    }).then(function () {
      // 13e. (ErgData-forensics sprint) SUBSCRIPTION STRATEGY — discovery-driven, sequentieel, nooit beide
      var U = function (x) { return ('ce0600' + x + '-43e5-11e4-916c-0800200c9a66'); };
      var notify = function (u) { return { uuid: u, properties: { notify: true, read: false, write: false } }; };
      var rw = function (u) { return { uuid: u, properties: { notify: false, read: true, write: false } }; };
      var SVC_FULL = [
        { uuid: U('20'), characteristics: [{ uuid: U('21'), properties: { write: true } }, notify(U('22'))] },
        { uuid: U('30'), characteristics: [rw(U('34')), notify(U('35')), notify(U('37')), notify(U('38')), notify(U('39')), notify(U('3a')), notify(U('80'))] },
        { uuid: '00001826-0000-1000-8000-00805f9b34fb', characteristics: [notify('00002ad1-0000-1000-8000-00805f9b34fb')] }
      ];
      // a) AUTO + multiplex aanwezig -> MULTIPLEXED conform spec rev. 1.30 (0x0080 in lieu of 0x31..0x3B),
      //    individuele data-chars NIET tegelijk (die onderdrukken de multiplexed stroom), control eerst
      var sa = makeTransport({ services: SVC_FULL });
      return sa.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function () {
        var d = sa.t.getConnectionDiagnostics();
        eq(d.discovery && d.discovery.ok, true, 'S1: service discovery via gateway.getServices() gebruikt');
        eq(d.discovery.serviceCount, 3, 'S1: ontdekte services geregistreerd');
        eq(d.strategy.selected, 'MULTIPLEXED', 'S2: AUTO kiest MULTIPLEXED wanneer 0x0080 aanwezig is (spec rev. 1.30)');
        eq(d.strategy.reason, 'android_pm5_multiplexed_supported', 'S2: reden geregistreerd');
        eq(d.strategy.order[0], 'ctrlTransmit', 'S3: control (CSAFE tx) als eerste in de volgorde');
        ok(d.strategy.order.indexOf('strokeData') === -1 && d.strategy.order.indexOf('splitData') === -1,
          'S4: individuele PM-data chars NIET tegelijk met multiplexed (spec: onderdrukken elkaar)');
        ok(d.strategy.order.indexOf('forceCurve') === -1, 'S5: niet-aanwezige characteristic (0x003C) wordt niet geprobeerd');
        eq(d.subscriptions.length, 2, 'S5: exact 2 canonical subscriptions (ctrl 0x0022 + multiplexed 0x0080)');
        ok(d.subscriptions.every(function (r, i) { return r.order === i + 1 && r.ok === true; }), 'S6: sequentieel, oplopende order, alle geslaagd');
        ok(!d.subscriptions.some(function (r) { return r.ok === false; }), 'S6: geen blinde mislukte pogingen meer');
        ok(d.discoveredServices.length === 3 && d.discoveredServices[1].characteristics.some(function (c) { return c.uuid === U('35') && c.notify; }), 'S7: discoveredServices in diagnostiek (uuid + notify-capability)');
        eq(d.lastSubscriptionBeforeDisconnect, 'multiplexed', 'S8: laatste geslaagde subscription bijgehouden');
        ok(d.lastLifecycleEvent && d.lastLifecycleEvent.event === 'subscribing', 'S9: lastLifecycleEvent gezet');
        ok(typeof d.connectionDurationMs === 'number' && d.connectionDurationMs >= 0, 'S10: connectionDurationMs beschikbaar zolang verbonden');
        sa.gw._emit(U('80').toUpperCase(), [0x31, 1, 2]);
        var n = sa.t.getConnectionDiagnostics().notifications[U('80')];
        ok(n && n.count === 1 && typeof n.firstAt === 'number' && typeof n.lastAt === 'number', 'S11: firstNotificationAt + lastNotificationAt per char');
      }).then(function () {
        // b) AUTO + alleen multiplex aanwezig -> MULTIPLEXED (spec-voorkeur, niet beide)
        var SVC_MUX = [{ uuid: U('30'), characteristics: [notify(U('80'))] }];
        var sb = makeTransport({ services: SVC_MUX });
        return sb.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function () {
          var d = sb.t.getConnectionDiagnostics();
          eq(d.strategy.selected, 'MULTIPLEXED', 'S12: MULTIPLEXED wanneer 0x0080 aanwezig is');
          eq(d.strategy.reason, 'android_pm5_multiplexed_supported', 'S12: spec-conforme reden');
          eq(d.subscriptions.length, 1, 'S12: exact 1 subscription (0x0080); geen control want niet aanwezig');
        });
      }).then(function () {
        // c) discovery onbeschikbaar (leeg) -> veilige default MULTIPLEXED (spec-conform), geen crash
        var sc = makeTransport({ services: [] });
        return sc.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function () {
          var d = sc.t.getConnectionDiagnostics();
          eq(d.discovery.ok, false, 'S13: discovery onbeschikbaar geregistreerd');
          eq(d.strategy.reason, 'discovery_unavailable_default_multiplexed', 'S13: default MULTIPLEXED bij ontbrekende discovery');
          ok(d.strategy.order.indexOf('strokeData') === -1, 'S13: nooit individuele PM-data chars zonder bewijs');
          eq(d.strategy.order.length, 2, 'S13: ctrl + multiplexed (fail-safe per char)');
        });
      }).then(function () {
        // c2) SPEC rev. 1.30: 0x0080 afwezig -> veilige fallback naar INDIVIDUAL (geen telemetrieverlies)
        var sf = makeTransport({ services: [
          { uuid: U('20'), characteristics: [notify(U('22'))] },
          { uuid: U('30'), characteristics: [notify(U('35')), notify(U('37'))] }
        ] });
        return sf.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function () {
          var d = sf.t.getConnectionDiagnostics();
          eq(d.strategy.selected, 'INDIVIDUAL', 'M1: 0x0080 afwezig -> fallback INDIVIDUAL');
          eq(d.strategy.reason, 'multiplexed_absent_fallback_individual', 'M1: fallback-reden geregistreerd');
          ok(d.strategy.order.indexOf('multiplexed') === -1, 'M1: geen multiplexed wanneer niet aanwezig');
        });
      }).then(function () {
        // c3) SPEC: control 0x0022 blijft naast multiplexed gesubscribed, en telt notificaties apart
        var sg = makeTransport({ services: [
          { uuid: U('20'), characteristics: [notify(U('22'))] },
          { uuid: U('30'), characteristics: [notify(U('80')), notify(U('35')), notify(U('31'))] }
        ] });
        return sg.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function () {
          var d = sg.t.getConnectionDiagnostics();
          eq(d.strategy.selected, 'MULTIPLEXED', 'M2: multiplexed gekozen');
          ok(d.strategy.order.indexOf('ctrlTransmit') === 0, 'M2: control 0x0022 blijft eerste subscription');
          ok(d.strategy.order.indexOf('multiplexed') !== -1, 'M2: telemetrie via 0x0080');
          eq(d.subscriptions.length, 2, 'M2: exact 2 canonical subscriptions');
          // diagnostiek telt VOOR decoding: onbekende multiplexed payload telt wel mee
          sg.gw._emit(U('80').toUpperCase(), [0x99, 1, 2, 3]);
          var d2 = sg.t.getConnectionDiagnostics();
          eq(d2.totals.notifications, 1, 'M3: notificatieteller loopt vóór decoding, ook bij onbekende identifier');
          ok(d2.notifications[U('80')] && d2.notifications[U('80')].count === 1, 'M3: per-characteristic teller op 0x0080');
          // control-notificatie wordt apart geteld
          sg.gw._emit(U('22').toUpperCase(), [0xF1, 0x00, 0xF2]);
          var d3 = sg.t.getConnectionDiagnostics();
          eq(d3.totals.notifications, 2, 'M4: control-respons telt apart mee');
          ok(d3.notifications[U('22')] && d3.notifications[U('22')].count === 1, 'M4: per-characteristic teller op 0x0022');
        });
      }).then(function () {
        // R) CE060080 multiplexed router - officiele layouts, spec rev. 1.30 Tabel 4
        var sr = makeTransport({ services: [
          { uuid: U('20'), characteristics: [notify(U('22'))] },
          { uuid: U('30'), characteristics: [notify(U('80'))] }
        ] });
        return sr.t.connect('rowerg', 'AA:BB:CC:11:22:33').then(function () {
          var raws = [];
          sr.t.subscribeMetrics(function (e) { raws.push(e.metrics); });
          // 0x31: elapsed 12345*0.01=123.45s, distance 20000*0.1=2000.0m, drag 120
          var p31 = [0x31, 0x39,0x30,0x00, 0x20,0x4E,0x00, 3, 1, 1, 1, 2, 0xE8,0x03,0x00, 0x00,0x00,0x00, 0x80, 120];
          sr.gw._emit(U('80').toUpperCase(), p31);
          var r31 = raws[raws.length - 1];
          ok(Math.abs(r31.elapsedTimeS - 123.45) < 1e-9, 'R1: 0x31 elapsed time LE24 * 0.01 s');
          ok(Math.abs(r31.distanceM - 2000) < 1e-9, 'R1: 0x31 distance LE24 * 0.1 m');
          eq(r31.workoutType, 3, 'R1: 0x31 workout type');
          eq(r31.workoutState, 1, 'R1: 0x31 workout state');
          eq(r31.dragFactor, 120, 'R1: 0x31 drag factor');
          eq(r31.workoutDurationType, 0x80, 'R1: 0x31 duration type = distance');
          eq(r31.multiplexedId, '0x31', 'R1: provenance multiplexedId');
          eq(r31.source, 'concept2_pm5', 'R1: provenance source');
          eq(r31.protocol, 'concept2_bts', 'R1: provenance protocol');
          // 0x32: speed 4500*0.001=4.5 m/s, SPM 28, HR 255 invalid, pace 11000*0.01=110s, power 250 W
          var p32 = [0x32, 0x39,0x30,0x00, 0x94,0x11, 28, 255, 0xF8,0x2A, 0xF8,0x2A, 0x00,0x00, 0x00,0x00,0x00, 0xFA,0x00, 0];
          sr.gw._emit(U('80').toUpperCase(), p32);
          var r32 = raws[raws.length - 1];
          ok(Math.abs(r32.speedMps - 4.5) < 1e-9, 'R2: 0x32 speed LE16 * 0.001 m/s');
          eq(r32.strokeRateSPM, 28, 'R2: 0x32 stroke rate spm');
          eq(r32.heartRateBpm, null, 'R2: 0x32 HR 255 = invalid -> null, geen fake waarde');
          ok(Math.abs(r32.currentPaceS - 110) < 1e-9, 'R2: 0x32 current pace LE16 * 0.01 s');
          eq(r32.averagePowerW, 250, 'R2: 0x32 average power W (multiplexed offset 16-17)');
          eq(r32.multiplexedId, '0x32', 'R2: provenance multiplexedId');
          var p32b = p32.slice(); p32b[7] = 140;
          sr.gw._emit(U('80').toUpperCase(), p32b);
          eq(raws[raws.length - 1].heartRateBpm, 140, 'R3: geldige HR wordt doorgegeven');
          var before = raws.length;
          sr.gw._emit(U('80').toUpperCase(), [0x31, 1, 2, 3]);
          eq(raws.length, before, 'R4: truncated packet emit GEEN metric');
          sr.gw._emit(U('80').toUpperCase(), [0x35, 1, 2, 3]);
          eq(raws.length, before, 'R5: recognized_not_decoded emit GEEN metric');
          sr.gw._emit(U('80').toUpperCase(), [0x99, 1, 2]);
          eq(raws.length, before, 'R6: onbekende identifier emit GEEN metric');
          sr.gw._emit(U('80').toUpperCase(), []);
          eq(raws.length, before, 'R7: leeg pakket veilig afgehandeld');
          var md = sr.t.getMultiplexedDiagnostics();
          eq(md.byId['0x31'].count, 2, 'R8: per-ID teller 0x31 (1 geldig + 1 truncated)');
          eq(md.byId['0x31'].decoded, 1, 'R8: 0x31 decoded telt alleen geslaagde');
          eq(md.byId['0x31'].failed, 1, 'R8: 0x31 failed telt truncated');
          eq(md.byId['0x32'].count, 2, 'R8: per-ID teller 0x32');
          eq(md.byId['0x35'].count, 1, 'R9: recognized_not_decoded wordt geteld');
          eq(md.byId['0x99'].count, 1, 'R9: onbekende identifier wordt geteld');
          eq(md.unknownIds, 1, 'R9: unknownIds teller');
          eq(md.lastDecodedId, '0x32', 'R10: laatst gedecodeerde identifier');
          ok(md.decoded === 3 && md.decodeFailures >= 1, 'R10: decode-succes en -failures apart geteld');
          var cd = sr.t.getConnectionDiagnostics();
          eq(cd.notifications[U('80')].count, 7, 'R11: notificatieteller loopt voor decoding (ook bij failures)');
          ok(JSON.stringify(md).indexOf('hex') === -1, 'R12: multiplexed diagnostiek bevat geen payload');
        });
      }).then(function () {
        // d) forced modes (dev/test-injecteerbaar) + AUTO zonder bekende data-chars
        var sd = makeTransport({ services: SVC_FULL, subscriptionMode: 'MULTIPLEXED' });
        var se = makeTransport({ services: SVC_FULL, subscriptionMode: 'INDIVIDUAL' });
        var sf = makeTransport({ services: [{ uuid: U('30'), characteristics: [rw(U('34'))] }] });
        return Promise.all([sd.t.connect('rowerg', 'A'), se.t.connect('rowerg', 'A'), sf.t.connect('rowerg', 'A')]).then(function () {
          eq(sd.t.getConnectionDiagnostics().strategy.selected, 'MULTIPLEXED', 'S14: forced MULTIPLEXED gerespecteerd');
          ok(sd.t.getConnectionDiagnostics().strategy.order.indexOf('strokeData') === -1, 'S14: forced MULTIPLEXED subscribet geen individuele chars');
          eq(se.t.getConnectionDiagnostics().strategy.selected, 'INDIVIDUAL', 'S15: forced INDIVIDUAL gerespecteerd');
          eq(sf.t.getConnectionDiagnostics().strategy.selected, 'NONE', 'S16: geen bekende data-chars -> NONE (geen gok), verbinding blijft');
          eq(sf.t.getStatus().state, 'connected', 'S16: connected ondanks 0 data-subscriptions (eerlijk, geen fout)');
          eq(sf.t.getSubscriptionMode(), 'AUTO_DISCOVERED', 'S17: default mode AUTO_DISCOVERED');
          ok(sa.t.SUBSCRIPTION_MODES.join(',') === 'AUTO_DISCOVERED,INDIVIDUAL,MULTIPLEXED', 'S17: modes-lijst gepubliceerd');
        });
      });
    }).then(function () {

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
