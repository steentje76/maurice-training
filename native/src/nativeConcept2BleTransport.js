/*
 * NativeConcept2BleTransport (concept2_native.v1)
 * -----------------------------------------------
 * Platform-ONAFHANKELIJKE adapter die het window.TKDeviceTransport-contract
 * implementeert bovenop een geïnjecteerde BleGateway (bewezen Capacitor BLE-plugin).
 *
 * ARCHITECTUUR:
 *   PM5 -> BleGateway (Capacitor plugin) -> NativeConcept2BleTransport (deze) -> RAW
 *       -> Concept2Live.normalizeLiveMetric (web-laag) -> canonical -> Training UI
 *
 * REGELS (zie sprint):
 *  - GEEN fake connection / GEEN fake device: elke status komt uit de gateway.
 *  - GEEN gegokte byte-layouts: decoders zijn standaard UNKNOWN (decode=null).
 *    Zolang een characteristic UNKNOWN is, wordt de payload ALLEEN in capture-mode
 *    vastgelegd (uuid + timestamp + bytes) en NOOIT als metric geëmit.
 *  - GEEN Concept2-parsing in de plugin: UUID's/capture/decoders wonen hier.
 *  - GEEN tweede logging-systeem: metrics gaan als RAW door naar de web-laag,
 *    die normaliseert en logt via de bestaande Concept2Live/liveWorkoutToActual.
 *  - Machine-productlogica (pace-basis, exercise-mapping) blijft in Concept2Live.
 *
 * Deze module bevat GEEN BLE/DOM/fetch. Alle platform-IO loopt via `gateway`.
 * Daardoor is de volledige adapter in node te unit-testen met een MockBleGateway.
 */
(function (global) {
  'use strict';

  var VERSION = 'concept2_native.v1';

  // ---- helpers (puur) -------------------------------------------------------

  function bytesToHex(bytes) {
    // bytes: Uint8Array | number[] | {byteLength, getUint8} DataView-achtig
    var out = '';
    var i, n, b;
    if (bytes == null) return '';
    if (typeof bytes.getUint8 === 'function' && typeof bytes.byteLength === 'number') {
      n = bytes.byteLength;
      for (i = 0; i < n; i++) { b = bytes.getUint8(i); out += (b < 16 ? '0' : '') + b.toString(16); }
      return out;
    }
    n = bytes.length;
    for (i = 0; i < n; i++) { b = bytes[i] & 0xff; out += (b < 16 ? '0' : '') + b.toString(16); }
    return out;
  }

  function dataViewLength(dv) {
    if (dv == null) return 0;
    if (typeof dv.byteLength === 'number') return dv.byteLength;
    if (typeof dv.length === 'number') return dv.length;
    return 0;
  }

  function lc(u) { return String(u || '').toLowerCase(); }

  // ---- factory --------------------------------------------------------------

  /**
   * @param {Object} deps
   * @param {Object} deps.gateway  BleGateway-implementatie (zie interface onder).
   * @param {Object} deps.concept2Live  het Concept2Live-module (UUID's + productlogica).
   * @param {Function=} deps.now  klok (default Date.now) — injecteerbaar voor tests.
   * @param {Function=} deps.setTimeoutFn  (default setTimeout).
   * @param {Function=} deps.clearTimeoutFn (default clearTimeout).
   * @param {number=}   deps.captureMax  max capture-records (default 2000).
   *
   * BleGateway-interface (async, Promise-based):
   *   isEnabled(): Promise<boolean>                         // bluetooth aan?
   *   checkPermission(): Promise<'granted'|'denied'>        // BLE-permissie
   *   requestPermission(): Promise<'granted'|'denied'>
   *   scan(serviceUuids:string[], onResult:fn, opts): Promise<void>
   *        onResult({deviceId, name, rssi})                 // per gevonden device
   *   stopScan(): Promise<void>
   *   connect(deviceId, onDisconnect:fn): Promise<void>     // onDisconnect(deviceId)
   *   disconnect(deviceId): Promise<void>
   *   getServices(deviceId): Promise<Array>                 // optioneel (diagnostiek)
   *   startNotifications(deviceId, service, characteristic, onValue:fn): Promise<void>
   *        onValue(DataView)
   *   stopNotifications(deviceId, service, characteristic): Promise<void>
   *   read(deviceId, service, characteristic): Promise<DataView>
   *   readRssi(deviceId): Promise<number>                   // optioneel
   */
  function makeNativeConcept2BleTransport(deps) {
    deps = deps || {};
    var gateway = deps.gateway;
    var CL = deps.concept2Live;
    if (!gateway) throw new Error('NativeConcept2BleTransport: gateway ontbreekt');
    if (!CL || !CL.CONCEPT2_BLE_UUIDS) throw new Error('NativeConcept2BleTransport: concept2Live ontbreekt');

    var now = deps.now || function () { return Date.now(); };
    var setT = deps.setTimeoutFn || (typeof setTimeout !== 'undefined' ? setTimeout : null);
    var clrT = deps.clearTimeoutFn || (typeof clearTimeout !== 'undefined' ? clearTimeout : null);
    var CAPTURE_MAX = deps.captureMax || 2000;

    var UU = CL.CONCEPT2_BLE_UUIDS;
    var SERVICES = UU.services || {};
    var CHARS = UU.characteristics || {};

    // notify-characteristics waarop we (in capture-mode) subscriben na connect.
    var NOTIFY_CHARS = [];
    (function () {
      for (var key in CHARS) {
        if (!CHARS.hasOwnProperty(key)) continue;
        var c = CHARS[key];
        var props = c.props || [];
        if (props.indexOf('notify') !== -1) {
          NOTIFY_CHARS.push({ key: key, uuid: c.uuid, service: SERVICES[c.service] ? SERVICES[c.service].uuid : c.service, confidence: c.confidence });
        }
      }
    })();

    // scan-filter: primaire PM erg-data service (val terug op device-info).
    var SCAN_SERVICE_UUIDS = [];
    if (SERVICES.pmData) SCAN_SERVICE_UUIDS.push(SERVICES.pmData.uuid);
    if (SERVICES.deviceInfo) SCAN_SERVICE_UUIDS.push(SERVICES.deviceInfo.uuid);

    // -------- interne state --------
    var connState = 'idle';            // uit Concept2Live.CONN_STATES-vocabulaire
    // gecachete permissie-string zodat getPermissionState() SYNCHROON is (zoals de
    // MockConcept2PM5-contractvorm die de web-UI verwacht). Async ververst via
    // refreshPermissionState()/ensureReady(). Default optimistisch 'granted'.
    var permStateCache = 'granted';
    var deviceId = null;
    var machineType = 'unknown';
    var lastMetrics = null;
    var metricListeners = [];
    var connListeners = [];
    var scanTimer = null;
    var captureEnabled = false;
    var capture = [];

    // decoder-registry: uuid(lc) -> { status:'UNKNOWN'|'CONFIRMED', decode(dv)->rawObj|null }
    // Standaard: ALLE bekende notify-chars UNKNOWN (geen gegokte decoder).
    var decoders = {};
    (function () {
      for (var i = 0; i < NOTIFY_CHARS.length; i++) {
        decoders[lc(NOTIFY_CHARS[i].uuid)] = { status: 'UNKNOWN', decode: null };
      }
    })();

    function emitConn(state) {
      connState = state;
      for (var i = 0; i < connListeners.length; i++) {
        try { connListeners[i]({ state: state, deviceId: deviceId, machineType: machineType }); } catch (e) {}
      }
    }
    function emitMetrics(raw) {
      lastMetrics = raw;
      for (var i = 0; i < metricListeners.length; i++) {
        try { metricListeners[i]({ metrics: raw }); } catch (e) {}
      }
    }

    function pushCapture(uuid, dv) {
      if (!captureEnabled) return;
      if (capture.length >= CAPTURE_MAX) capture.shift();
      capture.push({ uuid: lc(uuid), t: now(), len: dataViewLength(dv), hex: bytesToHex(dv) });
    }

    function onNotification(uuid, dv) {
      // 1) capture (alleen expliciet aangezet; ruwe bytes voor dev/validatie)
      pushCapture(uuid, dv);
      // 2) decode ALLEEN als er een BEVESTIGDE decoder is (anders UNKNOWN → niets emitten)
      var d = decoders[lc(uuid)];
      if (d && d.status === 'CONFIRMED' && typeof d.decode === 'function') {
        var raw = null;
        try { raw = d.decode(dv); } catch (e) { raw = null; }
        if (raw && typeof raw === 'object') emitMetrics(raw);
      }
      // UNKNOWN → geen metric. Eerlijk: UI toont "verbonden, wachten op data".
    }

    function onDisconnect() {
      // echte disconnect uit de gateway → reconnecting-signaal (workout niet resetten)
      if (connState === 'connected') emitConn('reconnecting');
      else emitConn('disconnected');
    }

    // -------- permissie --------
    // SYNCHROON (contractvorm): geeft de laatst-bekende gecachete status terug.
    function getPermissionState() { return permStateCache; }

    // ASYNC: echte query bij de gateway; ververst de cache. Roep dit aan bij
    // bootstrap-init en vóór discover/connect zodat de sync-status accuraat is.
    function refreshPermissionState() {
      return Promise.resolve()
        .then(function () { return gateway.isEnabled(); })
        .then(function (on) {
          if (!on) { permStateCache = 'bluetooth_off'; return 'bluetooth_off'; }
          return gateway.checkPermission().then(function (p) {
            permStateCache = (p === 'granted') ? 'granted' : 'denied';
            return permStateCache;
          });
        })
        .catch(function () { permStateCache = 'denied'; return 'denied'; });
    }

    function ensureReady() {
      // vraag permissie PAS hier (bij koppelen), niet bij app-start.
      return refreshPermissionState().then(function (state) {
        if (state === 'bluetooth_off') { var e = new Error('bluetooth_off'); e.code = 'bluetooth_off'; throw e; }
        if (state === 'granted') return 'granted';
        return gateway.requestPermission().then(function (p) {
          permStateCache = (p === 'granted') ? 'granted' : 'denied';
          if (p === 'granted') return 'granted';
          var e2 = new Error('permission_denied'); e2.code = 'permission_denied'; throw e2;
        });
      });
    }

    // -------- discovery --------
    function discover(opts) {
      opts = opts || {};
      var scanMs = opts.scanMs || 6000;
      var found = {};   // deviceId -> device
      return ensureReady().then(function () {
        emitConn('scanning');
        return new Promise(function (resolve, reject) {
          function onResult(dev) {
            if (!dev || !dev.deviceId) return;
            var id = dev.deviceId;
            // machineType is pre-connect NIET betrouwbaar leesbaar (0x0015 layout UNKNOWN)
            // -> 'unknown'; de UI bevestigt/mismatcht via Concept2Live.machineMatchesExercise.
            found[id] = {
              id: id,
              name: dev.name || 'Concept2 PM5',
              machineType: 'unknown',
              rssi: (typeof dev.rssi === 'number') ? dev.rssi : null
            };
          }
          function finish() {
            if (scanTimer && clrT) { clrT(scanTimer); scanTimer = null; }
            Promise.resolve(gateway.stopScan()).catch(function () {})
              .then(function () {
                var list = [];
                for (var k in found) { if (found.hasOwnProperty(k)) list.push(found[k]); }
                emitConn('idle');
                resolve(list);
              });
          }
          Promise.resolve(gateway.scan(SCAN_SERVICE_UUIDS, onResult, { scanMs: scanMs }))
            .then(function () { if (setT) scanTimer = setT(finish, scanMs); else finish(); })
            .catch(function (err) { emitConn('idle'); reject(err); });
        });
      });
    }

    // -------- connect --------
    function connect(reqMachineType, reqDeviceId) {
      var id = reqDeviceId;
      if (!id) return Promise.reject(new Error('connect: deviceId vereist'));
      emitConn('connecting');
      return Promise.resolve(gateway.connect(id, onDisconnect))
        .then(function () {
          deviceId = id;
          // machineType: gebruiker-bevestigd/gekozen (of 'unknown'); NIET gegokt uit BLE.
          machineType = (reqMachineType && CL.MACHINE_TYPES && CL.MACHINE_TYPES.indexOf(reqMachineType) !== -1)
            ? reqMachineType : 'unknown';
          // subscribe op alle bekende notify-chars t.b.v. capture (+ toekomstige decoders)
          var subs = NOTIFY_CHARS.map(function (nc) {
            return Promise.resolve(
              gateway.startNotifications(id, nc.service, nc.uuid, function (dv) { onNotification(nc.uuid, dv); })
            ).catch(function () { /* niet elke char is altijd aanwezig; negeer per-char fout */ });
          });
          return Promise.all(subs);
        })
        .then(function () {
          emitConn('connected');
          return { connected: true, machineType: machineType, deviceId: deviceId };
        })
        .catch(function (err) {
          emitConn('error');
          throw err;
        });
    }

    function disconnect() {
      var id = deviceId;
      if (!id) { emitConn('disconnected'); return Promise.resolve(); }
      var stops = NOTIFY_CHARS.map(function (nc) {
        return Promise.resolve(gateway.stopNotifications(id, nc.service, nc.uuid)).catch(function () {});
      });
      return Promise.all(stops)
        .then(function () { return gateway.disconnect(id); })
        .then(function () { deviceId = null; emitConn('disconnected'); })
        .catch(function () { deviceId = null; emitConn('disconnected'); });
    }

    function getStatus() {
      return { state: connState, deviceId: deviceId, machineType: machineType, available: true };
    }

    // device-info: lees RAW; NIET decoderen (layouts deels UNKNOWN). Alleen voor capture/diagnostiek.
    function getDeviceInfo() {
      if (!deviceId) return Promise.resolve({ deviceId: null });
      var svc = SERVICES.deviceInfo ? SERVICES.deviceInfo.uuid : null;
      var wanted = ['serialNumber', 'firmwareRev', 'hardwareRev', 'manufacturer', 'machineType'];
      var raw = {};
      var chain = Promise.resolve();
      wanted.forEach(function (key) {
        var ch = CHARS[key];
        if (!svc || !ch) return;
        chain = chain.then(function () {
          return Promise.resolve(gateway.read(deviceId, svc, ch.uuid))
            .then(function (dv) { raw[key] = { hex: bytesToHex(dv), len: dataViewLength(dv), confidence: ch.confidence }; })
            .catch(function () {});
        });
      });
      return chain.then(function () {
        // GEEN gedecodeerde velden (serial/firmware/machineType) — layout niet bevestigd.
        return { deviceId: deviceId, machineType: machineType, rawCharacteristics: raw };
      });
    }

    function subscribeMetrics(cb) {
      if (typeof cb !== 'function') return function () {};
      metricListeners.push(cb);
      return function () { var i = metricListeners.indexOf(cb); if (i !== -1) metricListeners.splice(i, 1); };
    }
    function unsubscribeMetrics() { metricListeners = []; }

    function subscribeConnection(cb) {
      if (typeof cb !== 'function') return function () {};
      connListeners.push(cb);
      return function () { var i = connListeners.indexOf(cb); if (i !== -1) connListeners.splice(i, 1); };
    }

    function getCurrentMetrics() { return lastMetrics; }

    function reset() {
      if (scanTimer && clrT) { clrT(scanTimer); scanTimer = null; }
      var p = deviceId ? disconnect() : Promise.resolve();
      return p.then(function () {
        metricListeners = [];
        connListeners = [];
        lastMetrics = null;
        capture = [];
        machineType = 'unknown';
        connState = 'idle';
      });
    }

    // -------- capture-mode (dev/validatie; geen productie-logging) --------
    function enableCapture() { captureEnabled = true; }
    function disableCapture() { captureEnabled = false; }
    function isCaptureEnabled() { return captureEnabled; }
    function getCapture() { return capture.slice(); }
    function clearCapture() { capture = []; }
    function exportCapture() {
      // JSON die de gebruiker kan bewaren om tegen de officiële PM5-spec te valideren.
      return {
        version: VERSION,
        exportedAt: now(),
        deviceIdMasked: deviceId ? ('…' + String(deviceId).slice(-4)) : null,
        machineType: machineType,
        records: capture.slice()
      };
    }

    // -------- decoder-registry (uitbreidpunt na spec-validatie) --------
    // Registreer PAS een decoder wanneer de byte-layout tegen de officiële
    // Concept2 PM5 Bluetooth-spec + een echte capture is bevestigd.
    function registerDecoder(uuid, decodeFn, status) {
      decoders[lc(uuid)] = { status: status || 'CONFIRMED', decode: decodeFn };
    }
    function decoderStatus() {
      var out = {};
      for (var u in decoders) { if (decoders.hasOwnProperty(u)) out[u] = decoders[u].status; }
      return out;
    }

    return {
      // contract (window.TKDeviceTransport)
      available: true,
      VERSION: VERSION,
      getPermissionState: getPermissionState,
      refreshPermissionState: refreshPermissionState,
      discover: discover,
      connect: connect,
      disconnect: disconnect,
      getStatus: getStatus,
      getDeviceInfo: getDeviceInfo,
      subscribeMetrics: subscribeMetrics,
      unsubscribeMetrics: unsubscribeMetrics,
      subscribeConnection: subscribeConnection,
      getCurrentMetrics: getCurrentMetrics,
      reset: reset,
      // capture-mode
      enableCapture: enableCapture,
      disableCapture: disableCapture,
      isCaptureEnabled: isCaptureEnabled,
      getCapture: getCapture,
      clearCapture: clearCapture,
      exportCapture: exportCapture,
      // decoder-registry
      registerDecoder: registerDecoder,
      decoderStatus: decoderStatus,
      // introspectie (tests/diagnostiek)
      _notifyChars: NOTIFY_CHARS,
      _scanServiceUuids: SCAN_SERVICE_UUIDS
    };
  }

  var api = {
    VERSION: VERSION,
    makeNativeConcept2BleTransport: makeNativeConcept2BleTransport,
    bytesToHex: bytesToHex
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { global.NativeConcept2BleTransport = api; }
})(typeof self !== 'undefined' ? self : this);
