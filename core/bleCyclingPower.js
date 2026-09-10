/* core/bleCyclingPower.js — DEVICES/WEARABLES MASTER SPRINT.
 * Pure, deterministische parser voor de OFFICIËLE Bluetooth SIG Cycling
 * Power Service (0x1818) / Cycling Power Measurement-characteristic (0x2A63).
 *
 * BEWUST BEPERKTE SCOPE (geen giswerk, sectie 7/11 van de opdracht): de
 * Cycling Power Measurement-payload heeft een 16-bit flags-veld met elf
 * optionele, flag-afhankelijke datavelden (pedal power balance, accumulated
 * torque, wheel/crank revolution data, extreme force/torque angles, top/
 * bottom dead spot angles, accumulated energy) -- de exacte bit-posities en
 * byte-breedtes van die optionele velden zijn uit beschikbare fragmentarische
 * bronnen niet met voldoende zekerheid te bevestigen. Uitsluitend het
 * VERPLICHTE, ALTIJD-AANWEZIGE "Instantaneous Power"-veld (sint16, watt, op
 * een vaste offset direct na het flags-veld) wordt hier geparsed -- dat veld
 * is universeel en ondubbelzinnig gedocumenteerd, ongeacht welke optionele
 * flags een specifiek device verder zet. Cadans/snelheid uit crank/wheel-
 * revolution-data (die bovendien een stateful delta-berekening tussen twee
 * metingen vereist) is een bewust NIET-gebouwd, gedocumenteerd gat -- geen
 * gegokte byte-layout, exact de Concept2/PM5-discipline toegepast op een
 * officieel profiel.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.BleCyclingPowerCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CYCLING_POWER_SERVICE_UUID = '00001818-0000-1000-8000-00805f9b34fb';
  var CYCLING_POWER_MEASUREMENT_CHAR_UUID = '00002a63-0000-1000-8000-00805f9b34fb';

  function dvLength(dv) { return (typeof dv.byteLength === 'number') ? dv.byteLength : (dv.length || 0); }
  function i16At(dv, i) {
    // Signed, little-endian 16-bit (GATT-standaard byte-order).
    if (typeof dv.getInt16 === 'function') return dv.getInt16(i, true);
    var v = dv[i] | (dv[i + 1] << 8);
    return (v & 0x8000) ? (v - 0x10000) : v;
  }

  // Retourneert {watts} of null bij een te korte/malformed payload -- NOOIT
  // een geraden waarde, en NOOIT de optionele velden (zie module-comment).
  function parseCyclingPowerMeasurement(dataView) {
    if (!dataView || dvLength(dataView) < 4) return null; // 2 bytes flags + 2 bytes instantaneous power
    var watts = i16At(dataView, 2);
    if (!isFinite(watts)) return null;
    // Plausibiliteitsgrens (technisch, geen fysiologische claim): een fietser
    // produceert in de praktijk niet meer dan enkele duizenden watt piekvermogen.
    if (watts < 0 || watts > 3000) return null;
    return { watts: watts };
  }

  function averageWatts(samples) {
    var valid = (samples || []).filter(function (s) { return typeof s === 'number' && isFinite(s) && s >= 0; });
    if (!valid.length) return null;
    var sum = 0;
    for (var i = 0; i < valid.length; i++) sum += valid[i];
    return Math.round(sum / valid.length);
  }

  return {
    CYCLING_POWER_SERVICE_UUID: CYCLING_POWER_SERVICE_UUID,
    CYCLING_POWER_MEASUREMENT_CHAR_UUID: CYCLING_POWER_MEASUREMENT_CHAR_UUID,
    parseCyclingPowerMeasurement: parseCyclingPowerMeasurement,
    averageWatts: averageWatts
  };
}));
