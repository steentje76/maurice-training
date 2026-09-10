/* core/bleHeartRate.js — DEVICES/WEARABLES MASTER SPRINT.
 * Pure, deterministische parser voor de OFFICIËLE Bluetooth SIG Heart Rate
 * Service (0x180D) / Heart Rate Measurement-characteristic (0x2A37).
 * Bron: Bluetooth SIG GATT-specificatie -- geen vendor-specifieke aannames,
 * geen gegokte byte-layout (in tegenstelling tot Concept2/PM5, waar de
 * meeste characteristics bewust UNKNOWN blijven zolang er geen officiële
 * spec/echte capture is). Heart Rate Measurement IS officieel gespecificeerd
 * en mag daarom wél gedecodeerd worden.
 *
 * Byte-layout (Flags-byte bepaalt de rest):
 *   bit 0: 0 = HR-waarde is UINT8, 1 = HR-waarde is UINT16
 *   bit 1-2: Sensor Contact Status (00/01 = niet ondersteund, 10 = niet
 *            gedetecteerd, 11 = gedetecteerd)
 *   bit 3: Energy Expended aanwezig (UINT16, genegeerd -- niet nodig voor V1)
 *   bit 4: RR-Interval(s) aanwezig (genegeerd -- niet nodig voor V1)
 * Geen DOM/database/network-toegang (Calculation/Decision Core purity).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.BleHeartRateCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
  var HEART_RATE_MEASUREMENT_CHAR_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

  function byteAt(dv, i) {
    if (typeof dv.getUint8 === 'function') return dv.getUint8(i);
    // Fallback voor een Uint8Array/gewone array i.p.v. een echte DataView.
    return dv[i];
  }
  function u16At(dv, i) {
    if (typeof dv.getUint16 === 'function') return dv.getUint16(i, true /* little-endian, GATT-standaard */);
    return dv[i] | (dv[i + 1] << 8);
  }
  function dvLength(dv) {
    if (typeof dv.byteLength === 'number') return dv.byteLength;
    return dv.length || 0;
  }

  // Retourneert {bpm, sensorContact:'not_supported'|'not_detected'|'detected'} of
  // null bij een te korte/malformed payload -- NOOIT een geraden waarde.
  function parseHeartRateMeasurement(dataView) {
    if (!dataView || dvLength(dataView) < 2) return null;
    var flags = byteAt(dataView, 0);
    var is16bit = (flags & 0x01) === 0x01;
    var contactBits = (flags >> 1) & 0x03;
    var bpm;
    if (is16bit) {
      if (dvLength(dataView) < 3) return null;
      bpm = u16At(dataView, 1);
    } else {
      bpm = byteAt(dataView, 1);
    }
    if (!isFinite(bpm) || bpm <= 0 || bpm > 300) return null; // plausibiliteitsgrens, geen fysiologische claim
    var sensorContact = 'not_supported';
    if (contactBits === 0x02) sensorContact = 'not_detected';
    else if (contactBits === 0x03) sensorContact = 'detected';
    return { bpm: bpm, sensorContact: sensorContact };
  }

  // Eenvoudig, deterministisch gemiddelde over een sessie -- geen Calculation
  // Engine-duplicatie, dit is uitsluitend arrayaggregatie van reeds-gedecodeerde
  // BPM-samples (TrainingLoadCore/CardioCore blijven de canonieke rekenlaag
  // voor alles wat verder gaat dan een simpel gemiddelde).
  function averageBpm(samples) {
    var valid = (samples || []).filter(function (s) { return typeof s === 'number' && isFinite(s) && s > 0; });
    if (!valid.length) return null;
    var sum = 0;
    for (var i = 0; i < valid.length; i++) sum += valid[i];
    return Math.round(sum / valid.length);
  }

  return {
    HEART_RATE_SERVICE_UUID: HEART_RATE_SERVICE_UUID,
    HEART_RATE_MEASUREMENT_CHAR_UUID: HEART_RATE_MEASUREMENT_CHAR_UUID,
    parseHeartRateMeasurement: parseHeartRateMeasurement,
    averageBpm: averageBpm
  };
}));
