/* core/bleCyclingSpeedCadence.js — DEVICES/WEARABLES MASTER SPRINT.
 * Pure, deterministische parser voor de OFFICIËLE Bluetooth SIG Cycling
 * Speed and Cadence Service (0x1816) / CSC Measurement-characteristic
 * (0x2A5B). Bron: bluetooth.com/wp-content/uploads/Files/Specification/
 * HTML/CSCS_v1.0 (officiële spec) + GATT-karakteristiek-XML, corroborerend
 * bevestigd door meerdere onafhankelijke technische bronnen.
 *
 * Byte-layout (little-endian, LSO->MSO, Flags bepaalt welke velden volgen):
 *   Flags (1 byte):
 *     bit 0 = Wheel Revolution Data Present
 *     bit 1 = Crank Revolution Data Present
 *   Indien bit 0 = 1: Cumulative Wheel Revolutions (UINT32) +
 *                      Last Wheel Event Time (UINT16, eenheid 1/1024s,
 *                      rolt over elke 64s)
 *   Indien bit 1 = 1: Cumulative Crank Revolutions (UINT16) +
 *                      Last Crank Event Time (UINT16, eenheid 1/1024s)
 *   (crank-velden staan NA de wiel-velden als beide aanwezig zijn)
 *
 * ARCHITECTUURGRENS (sectie 10 van de opdracht, expliciet): dit bestand
 * DECODEERT UITSLUITEND HET PROTOCOL -- het berekent GEEN cadans/snelheid.
 * Die afleiding (twee opeenvolgende metingen -> delta revoluties/delta tijd)
 * hoort bij een Calculation Engine-functie (zie deriveCadenceRpm hieronder,
 * bewust in een apart, duidelijk gemarkeerd blok) en NOOIT in de BLE-parser
 * zelf. Snelheid wordt NIET afgeleid: dat vereist de wielomtrek, die nergens
 * in TK wordt vastgelegd -- GEEN snelheid verzinnen (sectie 10, hard vereist).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.BleCyclingSpeedCadenceCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CSC_SERVICE_UUID = '00001816-0000-1000-8000-00805f9b34fb';
  var CSC_MEASUREMENT_CHAR_UUID = '00002a5b-0000-1000-8000-00805f9b34fb';

  function dvLength(dv) { return (typeof dv.byteLength === 'number') ? dv.byteLength : (dv.length || 0); }
  function u8At(dv, i) { return (typeof dv.getUint8 === 'function') ? dv.getUint8(i) : dv[i]; }
  function u16At(dv, i) { return (typeof dv.getUint16 === 'function') ? dv.getUint16(i, true) : (dv[i] | (dv[i + 1] << 8)); }
  function u32At(dv, i) { return (typeof dv.getUint32 === 'function') ? dv.getUint32(i, true) : (dv[i] | (dv[i + 1] << 8) | (dv[i + 2] << 16) | (dv[i + 3] << 24)) >>> 0; }

  // ── PARSER: decodeert uitsluitend het protocol, geen sportmetric-berekening ──
  function parseCscMeasurement(dataView) {
    if (!dataView || dvLength(dataView) < 1) return null;
    var flags = u8At(dataView, 0);
    var wheelPresent = (flags & 0x01) === 0x01;
    var crankPresent = (flags & 0x02) === 0x02;
    if (!wheelPresent && !crankPresent) return null; // niets bruikbaars in deze notificatie

    var offset = 1;
    var result = { wheelRevolutions: null, wheelEventTime: null, crankRevolutions: null, crankEventTime: null };

    if (wheelPresent) {
      if (dvLength(dataView) < offset + 6) return null; // 4 (uint32) + 2 (uint16) bytes verplicht als de bit gezet is
      result.wheelRevolutions = u32At(dataView, offset);
      result.wheelEventTime = u16At(dataView, offset + 4);
      offset += 6;
    }
    if (crankPresent) {
      if (dvLength(dataView) < offset + 4) return null; // 2 + 2 bytes verplicht als de bit gezet is
      result.crankRevolutions = u16At(dataView, offset);
      result.crankEventTime = u16At(dataView, offset + 2);
      offset += 4;
    }
    return result;
  }

  // ══════════════════════════════════════════════════════════
  // CALCULATION ENGINE-BLOK — afgeleide sportmetric uit twee opeenvolgende
  // RUWE metingen. Uitdrukkelijk GESCHEIDEN van de parser hierboven (sectie
  // 10: "Parser: decodeert protocol. Calculation Engine: berekent afgeleide
  // sportmetric."). Formele Calculation Registry-entry, zelfde stijl als
  // core/hydrationCalculation.js/core/dailyActivityCalculation.js.
  // ══════════════════════════════════════════════════════════
  var CALC_VERSION = 'cadence_from_csc.v1';
  var CALCULATION_REGISTRY = [{
    calculation_id: CALC_VERSION,
    domain: 'CYCLING',
    name: 'Cadans uit CSC-crankomwentelingen (Bluetooth SIG-officieel)',
    version: 1,
    formula: 'cadans_rpm = (delta_crank_omwentelingen / delta_event_tijd_seconden) * 60, met correcte 16-bit rollover-afhandeling op beide velden',
    inputs: ['prevReading ({crankRevolutions, crankEventTime})', 'currReading ({crankRevolutions, crankEventTime})'],
    outputs: ['cadenceRpm'],
    units: { cadence: 'rpm', eventTime: '1/1024 s (rolt over elke 64s, UINT16)' },
    supported_sports: 'cycling (elk apparaat met de officiële CSC-service, crank-omwentelingsdata)',
    minimum_data: ['twee opeenvolgende CSC-metingen met crankRevolutions/crankEventTime beide niet-null'],
    evidence_level: 'A',
    sources: ['BLUETOOTH-SIG-CSCS-v1.0'],
    limitations: [
      'Vereist minimaal twee metingen -- de allereerste notificatie na het koppelen levert nog geen cadans op.',
      'Bij nul cranktrappen tussen twee events (fietser stopt met trappen) is delta_omwentelingen 0 -> cadans 0, dit is een correcte meting, geen fout.',
      'Snelheid wordt bewust NIET afgeleid -- vereist de wielomtrek, die nergens in TK wordt vastgelegd (sectie 10, hard vereist: geen snelheid verzinnen).'
    ],
    applicability: 'Directe, deterministische afleiding uit officieel gespecificeerde protocoldata -- geen schatting.',
    forbidden_interpretations: ['dit is een gemiddelde cadans over de hele rit (dit is de instantane cadans tussen twee events)'],
    allowed_decision_use: false,
    allowed_ai_use: true,
    user_visible_values: true
  }];

  var EVENT_TIME_ROLLOVER = 65536; // UINT16, eenheid 1/1024s -> rolt over elke 64s
  var CRANK_REV_ROLLOVER = 65536;  // UINT16

  function isFiniteNonNeg(v) { return typeof v === 'number' && isFinite(v) && v >= 0; }

  /**
   * deriveCadenceRpm(prevReading, currReading) -> pure, deterministisch.
   * Handelt de 16-bit rollover van zowel crankEventTime als crankRevolutions
   * correct af (sectie 9: "units/wrap behavior" expliciet vereist). Retourneert
   * null (nooit 0 als vervanging) wanneer een betrouwbare afleiding niet
   * mogelijk is.
   */
  function deriveCadenceRpm(prevReading, currReading) {
    if (!prevReading || !currReading) return { status: 'INSUFFICIENT_INPUT', schema: CALC_VERSION, reason: 'prevReading/currReading ontbreekt (eerste meting na koppelen heeft nog geen vorige waarde)' };
    var pRev = prevReading.crankRevolutions, pTime = prevReading.crankEventTime;
    var cRev = currReading.crankRevolutions, cTime = currReading.crankEventTime;
    if (!isFiniteNonNeg(pRev) || !isFiniteNonNeg(pTime) || !isFiniteNonNeg(cRev) || !isFiniteNonNeg(cTime)) {
      return { status: 'INSUFFICIENT_INPUT', schema: CALC_VERSION, reason: 'crankRevolutions/crankEventTime ontbreekt in één van beide metingen (device levert mogelijk geen crank-data)' };
    }

    var deltaRev = cRev - pRev;
    if (deltaRev < 0) deltaRev += CRANK_REV_ROLLOVER; // 16-bit rollover
    var deltaTimeTicks = cTime - pTime;
    if (deltaTimeTicks < 0) deltaTimeTicks += EVENT_TIME_ROLLOVER; // 16-bit rollover, 1/1024s-eenheid

    if (deltaTimeTicks === 0) {
      // Zelfde event-tijd = geen nieuw event sinds de vorige meting (notificatie
      // kwam binnen zonder dat de sensor een nieuwe cranktrap registreerde) --
      // geen deling door nul, geen fake 0-cadans: gewoon nog geen nieuwe data.
      return { status: 'NO_NEW_EVENT', schema: CALC_VERSION, reason: 'geen nieuw crank-event sinds de vorige meting' };
    }

    var deltaSeconds = deltaTimeTicks / 1024;
    var cadenceRpm = (deltaRev / deltaSeconds) * 60;

    if (!isFinite(cadenceRpm) || cadenceRpm < 0 || cadenceRpm > 300) {
      return { status: 'IMPLAUSIBLE', schema: CALC_VERSION, reason: 'berekende cadans valt buiten een fysiek plausibel bereik (mogelijk een gemiste rollover of sensorstoring)' };
    }

    return { status: 'OK', schema: CALC_VERSION, cadenceRpm: Math.round(cadenceRpm), deltaRevolutions: deltaRev, deltaSeconds: Math.round(deltaSeconds * 100) / 100 };
  }

  return {
    CSC_SERVICE_UUID: CSC_SERVICE_UUID,
    CSC_MEASUREMENT_CHAR_UUID: CSC_MEASUREMENT_CHAR_UUID,
    parseCscMeasurement: parseCscMeasurement,
    deriveCadenceRpm: deriveCadenceRpm,
    CALCULATION_REGISTRY: CALCULATION_REGISTRY
  };
}));
