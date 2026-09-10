/*
 * nativeCyclingPowerBleTransport.js — DEVICES/WEARABLES MASTER SPRINT.
 *
 * Generieke Bluetooth SIG Cycling Power-transport (Service 0x1818,
 * Measurement 0x2A63) -- hergebruikt exact dezelfde BleGateway-interface als
 * NativeHeartRateBleTransport/NativeConcept2BleTransport. Uitsluitend het
 * verplichte instantaneous-power-veld wordt gedecodeerd (zie
 * core/bleCyclingPower.js voor de scope-motivatie). Zelfde mid-workout-
 * attach-invariant: dit transport heeft geen enkele kennis van/invloed op
 * enige workout-execution-state.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NativeCyclingPowerBleTransport = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function makeNativeCyclingPowerBleTransport(deps) {
    deps = deps || {};
    var gateway = deps.gateway;
    var CP = deps.bleCyclingPowerCore;
    if (!gateway) throw new Error('NativeCyclingPowerBleTransport: gateway ontbreekt');
    if (!CP || !CP.parseCyclingPowerMeasurement) throw new Error('NativeCyclingPowerBleTransport: bleCyclingPower-core ontbreekt');

    var SERVICE_UUID = CP.CYCLING_POWER_SERVICE_UUID;
    var CHAR_UUID = CP.CYCLING_POWER_MEASUREMENT_CHAR_UUID;

    var connState = 'idle';
    var deviceId = null;
    var wattListeners = [];
    var connListeners = [];

    function emitConn(state) {
      connState = state;
      for (var i = 0; i < connListeners.length; i++) { try { connListeners[i]({ state: state, deviceId: deviceId }); } catch (e) {} }
    }
    function emitWatts(reading) {
      for (var i = 0; i < wattListeners.length; i++) { try { wattListeners[i](reading); } catch (e) {} }
    }
    function onNotification(dv) {
      var parsed = CP.parseCyclingPowerMeasurement(dv);
      if (parsed) emitWatts(parsed);
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
      onWatts(cb) { if (typeof cb === 'function') wattListeners.push(cb); },
      onConnectionChange(cb) { if (typeof cb === 'function') connListeners.push(cb); }
    };
  }

  return { makeNativeCyclingPowerBleTransport: makeNativeCyclingPowerBleTransport };
}));
