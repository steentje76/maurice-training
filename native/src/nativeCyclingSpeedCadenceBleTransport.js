/*
 * nativeCyclingSpeedCadenceBleTransport.js — DEVICES/WEARABLES MASTER SPRINT.
 *
 * Generieke Bluetooth SIG CSC-transport (Service 0x1816, Measurement 0x2A5B)
 * -- hergebruikt exact dezelfde BleGateway-interface als de andere drie
 * transports. Houdt uitsluitend de VORIGE ruwe meting bij (nodig voor de
 * delta-gebaseerde cadans-afleiding, sectie 10) en geeft die door aan
 * BleCyclingSpeedCadenceCore.deriveCadenceRpm() -- de daadwerkelijke
 * berekening leeft in de Calculation Engine-module, niet hier (zelfde
 * scheiding als bij Heart Rate/Cycling Power: transport = alleen
 * scan/connect/notify + decode, geen sportmetric-berekening in het
 * transport-object zelf, behalve het bijhouden van de vorige ruwe meting).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NativeCyclingSpeedCadenceBleTransport = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function makeNativeCyclingSpeedCadenceBleTransport(deps) {
    deps = deps || {};
    var gateway = deps.gateway;
    var CSC = deps.bleCscCore;
    if (!gateway) throw new Error('NativeCyclingSpeedCadenceBleTransport: gateway ontbreekt');
    if (!CSC || !CSC.parseCscMeasurement) throw new Error('NativeCyclingSpeedCadenceBleTransport: bleCyclingSpeedCadence-core ontbreekt');

    var SERVICE_UUID = CSC.CSC_SERVICE_UUID;
    var CHAR_UUID = CSC.CSC_MEASUREMENT_CHAR_UUID;

    var connState = 'idle';
    var deviceId = null;
    var prevReading = null; // vorige ruwe CSC-meting, voor de cadans-delta
    var cadenceListeners = [];
    var connListeners = [];

    function emitConn(state) {
      connState = state;
      for (var i = 0; i < connListeners.length; i++) { try { connListeners[i]({ state: state, deviceId: deviceId }); } catch (e) {} }
    }
    function emitCadence(result) {
      for (var i = 0; i < cadenceListeners.length; i++) { try { cadenceListeners[i](result); } catch (e) {} }
    }
    function onNotification(dv) {
      var raw = CSC.parseCscMeasurement(dv);
      if (!raw) return;
      if (prevReading) {
        var derived = CSC.deriveCadenceRpm(prevReading, raw);
        if (derived.status === 'OK') emitCadence(derived);
        // NO_NEW_EVENT/INSUFFICIENT_INPUT/IMPLAUSIBLE: stil genegeerd (eerlijk
        // geen fake update), prevReading wordt hieronder alsnog bijgewerkt.
      }
      prevReading = raw;
    }

    return {
      VERSION: '1.0.0',
      __native: true,
      available: true,

      async discover() {
        emitConn('scanning');
        var found = [];
        try {
          await gateway.scan([SERVICE_UUID], function (dev) {
            if (!found.some(function (f) { return f.deviceId === dev.deviceId; })) found.push(dev);
          });
          await new Promise(function (resolve) { setTimeout(resolve, 4000); });
        } finally {
          try { await gateway.stopScan(); } catch (e) {}
        }
        emitConn('idle');
        return found;
      },

      async connect(selectedDeviceId) {
        deviceId = selectedDeviceId;
        prevReading = null; // nieuwe verbinding = geen geldige "vorige meting" meer
        emitConn('connecting');
        await gateway.connect(deviceId, function () { emitConn('disconnected'); deviceId = null; prevReading = null; });
        await gateway.startNotifications(deviceId, SERVICE_UUID, CHAR_UUID, onNotification);
        emitConn('connected');
      },

      async disconnect() {
        if (!deviceId) return;
        try { await gateway.stopNotifications(deviceId, SERVICE_UUID, CHAR_UUID); } catch (e) {}
        try { await gateway.disconnect(deviceId); } catch (e) {}
        emitConn('disconnected');
        deviceId = null;
        prevReading = null;
      },

      getConnectionState() { return connState; },
      onCadence(cb) { if (typeof cb === 'function') cadenceListeners.push(cb); },
      onConnectionChange(cb) { if (typeof cb === 'function') connListeners.push(cb); }
    };
  }

  return { makeNativeCyclingSpeedCadenceBleTransport: makeNativeCyclingSpeedCadenceBleTransport };
}));
