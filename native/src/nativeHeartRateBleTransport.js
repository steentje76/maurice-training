/*
 * nativeHeartRateBleTransport.js — DEVICES/WEARABLES MASTER SPRINT.
 *
 * Generieke Bluetooth SIG Heart Rate-transport (Service 0x180D, Measurement
 * 0x2A37) -- hergebruikt EXACT dezelfde BleGateway-interface als
 * NativeConcept2BleTransport (scan/connect/discover/subscribe), geen tweede
 * BLE-abstractielaag. In tegenstelling tot Concept2 (waar de meeste
 * characteristics bewust UNKNOWN blijven zonder officiële spec) is de Heart
 * Rate Measurement-byte-layout WEL officieel gespecificeerd (Bluetooth SIG) --
 * decoderen is hier dus verantwoord, via core/bleHeartRate.js (BleHeartRateCore).
 *
 * Mid-workout attach (sectie 12/15 van de opdracht, HARD REQUIREMENT):
 * dit transport-object heeft GEEN kennis van/invloed op de workout-execution-
 * state (EnduranceExecutionCore) -- het publiceert uitsluitend BPM-samples via
 * een listener-callback. De aanroepende UI (Running/Cycling execution-scherm)
 * beslist zelf wat ermee gebeurt, exact zoals Concept2Live dat al doet. Device-
 * lifecycle bezit dus nooit de workout-execution-lifecycle.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NativeHeartRateBleTransport = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function lc(u) { return String(u || '').toLowerCase(); }

  function makeNativeHeartRateBleTransport(deps) {
    deps = deps || {};
    var gateway = deps.gateway;
    var HR = deps.bleHeartRateCore;
    if (!gateway) throw new Error('NativeHeartRateBleTransport: gateway ontbreekt');
    if (!HR || !HR.parseHeartRateMeasurement) throw new Error('NativeHeartRateBleTransport: bleHeartRate-core ontbreekt');

    var SERVICE_UUID = HR.HEART_RATE_SERVICE_UUID;
    var CHAR_UUID = HR.HEART_RATE_MEASUREMENT_CHAR_UUID;

    var connState = 'idle'; // idle | scanning | connected | disconnected
    var deviceId = null;
    var bpmListeners = [];
    var connListeners = [];
    var scanning = false;

    function emitConn(state) {
      connState = state;
      for (var i = 0; i < connListeners.length; i++) { try { connListeners[i]({ state: state, deviceId: deviceId }); } catch (e) {} }
    }
    function emitBpm(reading) {
      for (var i = 0; i < bpmListeners.length; i++) { try { bpmListeners[i](reading); } catch (e) {} }
    }
    function onNotification(dv) {
      var parsed = HR.parseHeartRateMeasurement(dv);
      if (parsed) emitBpm(parsed); // UNKNOWN/malformed -> stil genegeerd, nooit een geraden BPM
    }

    return {
      VERSION: '1.0.0',
      __native: true,
      available: true,

      async discover() {
        scanning = true;
        emitConn('scanning');
        var found = [];
        try {
          await gateway.scan([SERVICE_UUID], function (dev) {
            if (!found.some(function (f) { return f.deviceId === dev.deviceId; })) found.push(dev);
          });
          // Korte, begrensde scanvenster (zelfde UX-patroon als Concept2: één duidelijke
          // actie, geen handmatige tuning) -- de aanroeper (UI) toont "scannen…" tot dit klaar is.
          await new Promise(function (resolve) { setTimeout(resolve, 4000); });
        } finally {
          try { await gateway.stopScan(); } catch (e) {}
          scanning = false;
        }
        emitConn(found.length ? 'idle' : 'idle');
        return found;
      },

      async connect(selectedDeviceId) {
        deviceId = selectedDeviceId;
        emitConn('connecting');
        await gateway.connect(deviceId, function () { emitConn('disconnected'); deviceId = null; });
        await gateway.startNotifications(deviceId, SERVICE_UUID, CHAR_UUID, onNotification);
        emitConn('connected');
      },

      async disconnect() {
        if (!deviceId) return;
        try { await gateway.stopNotifications(deviceId, SERVICE_UUID, CHAR_UUID); } catch (e) {}
        try { await gateway.disconnect(deviceId); } catch (e) {}
        emitConn('disconnected');
        deviceId = null;
      },

      getConnectionState() { return connState; },
      onBpm(cb) { if (typeof cb === 'function') bpmListeners.push(cb); },
      onConnectionChange(cb) { if (typeof cb === 'function') connListeners.push(cb); }
    };
  }

  return { makeNativeHeartRateBleTransport: makeNativeHeartRateBleTransport };
}));
