/*
 * nativeFtmsBleTransport.js — DEVICES/WEARABLES MASTER SPRINT.
 *
 * FTMS-transport (Service 0x1826) -- hergebruikt dezelfde generieke
 * BleGateway-interface als de andere vier transports. Discovery/verbinden/
 * herkennen van het machinetype werkt volledig (bevestigde UUID's, zie
 * core/ftmsCore.js).
 *
 * CORRECTIE: de volledige, geadopteerde FTMS 1.0.1-specificatie is
 * beschikbaar gebleken (bluetooth.com/specifications/specs/
 * fitness-machine-service-1-0-1/) en de byte-layout van Indoor Bike Data
 * en Rower Data is drievoudig gecorroboreerd (zie core/ftmsCore.js-
 * moduledocumentatie) -- deze twee characteristics zijn daarom bij
 * aanvang al CONFIRMED geregistreerd, niet langer UNKNOWN. Treadmill Data
 * en de overige machinetypes blijven UNKNOWN totdat hun byte-layout met
 * dezelfde zekerheid bevestigd is (exact het Concept2-precedent, nu
 * per-machinetype i.p.v. voor de hele service).
 *
 * Bij het verbinden wordt geprobeerd op elk van de zes bevestigde Data-
 * characteristics te abonneren (geen vertrouwen op een ongeverifieerde
 * exacte retourvorm van gateway.getServices()) -- een fysiek apparaat
 * biedt er precies één aan, de overige vijf falen dan stil.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NativeFtmsBleTransport = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function makeNativeFtmsBleTransport(deps) {
    deps = deps || {};
    var gateway = deps.gateway;
    var FTMS = deps.ftmsCore;
    if (!gateway) throw new Error('NativeFtmsBleTransport: gateway ontbreekt');
    if (!FTMS || !FTMS.FTMS_SERVICE_UUID) throw new Error('NativeFtmsBleTransport: ftmsCore ontbreekt');

    var decoderRegistry = FTMS.createDecoderRegistry();
    // Indoor Bike Data en Rower Data: byte-layout drievoudig bevestigd (zie
    // core/ftmsCore.js) -- vanaf nu CONFIRMED, geen UNKNOWN meer voor deze twee.
    decoderRegistry.registerDecoder(FTMS.MACHINE_DATA_CHARACTERISTICS.indoorBike.uuid, FTMS.parseIndoorBikeData, 'CONFIRMED');
    decoderRegistry.registerDecoder(FTMS.MACHINE_DATA_CHARACTERISTICS.rower.uuid, FTMS.parseRowerData, 'CONFIRMED');

    var connState = 'idle';
    var deviceId = null;
    var machineType = null; // {key,label} of null zolang onbekend
    var dataListeners = [];
    var connListeners = [];

    function emitConn(state) {
      connState = state;
      for (var i = 0; i < connListeners.length; i++) { try { connListeners[i]({ state: state, deviceId: deviceId, machineType: machineType }); } catch (e) {} }
    }
    function emitData(payload) {
      for (var i = 0; i < dataListeners.length; i++) { try { dataListeners[i](payload); } catch (e) {} }
    }
    function onNotification(charUuid) {
      return function (dv) {
        var decoded = decoderRegistry.decode(charUuid, dv);
        // UNKNOWN -> decoded is null -> geen emit (eerlijk: "wachten op bevestigde data").
        if (decoded) emitData(decoded);
      };
    }

    return {
      VERSION: '1.0.0',
      __native: true,
      available: true,

      async discover() {
        emitConn('scanning');
        var found = [];
        try {
          await gateway.scan([FTMS.FTMS_SERVICE_UUID], function (dev) {
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
        machineType = null;
        emitConn('connecting');
        await gateway.connect(deviceId, function () { emitConn('disconnected'); deviceId = null; machineType = null; });

        // Geen vertrouwen op een ongeverifieerde exacte retourvorm van
        // gateway.getServices() (de bestaande Concept2-transport documenteert
        // die zelf al uitsluitend als "optioneel/diagnostiek", niet als
        // primair mechanisme). In plaats daarvan: probeer een subscribe op
        // elk van de zes BEVESTIGDE machinetype-characteristics. Een fysiek
        // apparaat biedt er precies een van aan; de overige vijf falen dan
        // stil (characteristic bestaat niet op dit apparaat) -- een normaal,
        // veilig patroon voor optionele GATT-characteristics.
        var machineChars = FTMS.MACHINE_DATA_CHARACTERISTICS;
        for (var key in machineChars) {
          if (!machineChars.hasOwnProperty(key)) continue;
          var charUuid = machineChars[key].uuid;
          try {
            await gateway.startNotifications(deviceId, FTMS.FTMS_SERVICE_UUID, charUuid, onNotification(charUuid));
            machineType = { key: key, label: machineChars[key].label };
            break; // eerste succesvolle subscribe = het daadwerkelijke machinetype van dit apparaat
          } catch (e) { /* deze characteristic bestaat niet op dit apparaat -- probeer de volgende */ }
        }
        // Geen enkele characteristic beschikbaar -> toch 'connected' (de BLE-
        // verbinding is echt tot stand gekomen), machineType blijft null; de
        // UI toont dit eerlijk ("apparaat verbonden, type onbekend").
        emitConn('connected');
      },

      async disconnect() {
        if (!deviceId) return;
        try { await gateway.disconnect(deviceId); } catch (e) {}
        emitConn('disconnected');
        deviceId = null;
        machineType = null;
      },

      getConnectionState() { return connState; },
      getMachineType() { return machineType; },
      onData(cb) { if (typeof cb === 'function') dataListeners.push(cb); },
      onConnectionChange(cb) { if (typeof cb === 'function') connListeners.push(cb); },
      // Extensiepunt voor zodra de volledige officiele spec/een echte
      // capture beschikbaar komt (zie core/ftmsCore.js-moduledocumentatie).
      registerDecoder(uuid, decodeFn, status) { decoderRegistry.registerDecoder(uuid, decodeFn, status); },
      decoderStatus() { return decoderRegistry.status(); }
    };
  }

  return { makeNativeFtmsBleTransport: makeNativeFtmsBleTransport };
}));
