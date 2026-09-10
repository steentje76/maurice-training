/* core/ftmsCore.js — DEVICES/WEARABLES MASTER SPRINT.
 * Bluetooth SIG Fitness Machine Service (FTMS, 0x1826).
 *
 * TOEGANGSBEPERKING (expliciet vastgelegd, sectie 14 van de opdracht: "Als
 * toegang tot de volledige spec login/licentie vereist: registreer exact
 * welke toegang nodig is"): de officiele FTMS_v1.0-PDF
 * (bluetooth.org/DocMan/handlers/DownloadDoc.ashx?doc_id=423422) is
 * ROBOTS-DISALLOWED voor geautomatiseerde toegang (bevestigd, geen
 * aanname) -- de exacte byte-per-byte veldindeling van elke Data-
 * characteristic (Indoor Bike/Treadmill/Rower/Cross Trainer/Step Climber/
 * Stair Climber Data) kan daardoor NIET met dezelfde zekerheid worden
 * bevestigd als bij Heart Rate/Cycling Power/CSC. Community-bronnen
 * bevestigen bovendien reeel risico (Nordic DevZone: "Most of the FTMS
 * data characteristics ... has a flipped first bit. That tricked me
 * first.") -- een indicatie dat zelfs ervaren ontwikkelaars hier fouten
 * maken zonder de officiele spec zelf.
 *
 * WAT WEL MET ZEKERHEID BEVESTIGD IS (twee onafhankelijke, hoogwaardige
 * bronnen -- bleak's officiele assigned-numbers-tabel EN de G.FIT
 * spec-afgeleide userguide -- geven IDENTIEKE UUID's): de service-UUID en
 * ALLE characteristic-UUID's. Discovery/scannen/verbinden/herkennen welk
 * machinetype een apparaat is, kan dus veilig gebouwd worden.
 *
 * Exact het Concept2/PM5-precedent (core/concept2Live.js): een
 * UNKNOWN/CONFIRMED-decoder-registry. Bij aanvang is ELKE Data-
 * characteristic UNKNOWN -- geen enkele byte wordt geinterpreteerd totdat
 * een decoder expliciet wordt geregistreerd (pas mogelijk na toegang tot
 * de volledige officiele spec of een echte, gevalideerde device-capture).
 * "Verbonden, wachten op bevestigde data" is de eerlijke tussenstatus --
 * NOOIT een gefabriceerde meting.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.FtmsCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FTMS_SERVICE_UUID = '00001826-0000-1000-8000-00805f9b34fb';

  // Machinetype -> Data-characteristic-UUID (bevestigd, zie module-comment).
  var MACHINE_DATA_CHARACTERISTICS = {
    treadmill:     { uuid: '00002acd-0000-1000-8000-00805f9b34fb', label: 'Loopband' },
    crossTrainer:  { uuid: '00002ace-0000-1000-8000-00805f9b34fb', label: 'Crosstrainer' },
    stepClimber:   { uuid: '00002acf-0000-1000-8000-00805f9b34fb', label: 'Stepper' },
    stairClimber:  { uuid: '00002ad0-0000-1000-8000-00805f9b34fb', label: 'Trapmachine' },
    rower:         { uuid: '00002ad1-0000-1000-8000-00805f9b34fb', label: 'Roeimachine' },
    indoorBike:    { uuid: '00002ad2-0000-1000-8000-00805f9b34fb', label: 'Indoor bike' }
  };
  // Overige, bevestigde FTMS-characteristics -- hier uitsluitend gedocumenteerd
  // (UUID's bekend), NIET gebruikt: Control Point vereist "control ownership"
  // en is expliciet lager geprioriteerd (sectie 13 van de opdracht: alleen
  // bouwen als veilig/noodzakelijk/grondig getest -- geen van die
  // voorwaarden haalbaar zonder een officieel bevestigde spec + real device).
  var OTHER_CHARACTERISTICS = {
    fitnessMachineFeature: '00002acc-0000-1000-8000-00805f9b34fb',
    trainingStatus:        '00002ad3-0000-1000-8000-00805f9b34fb',
    controlPoint:          '00002ad9-0000-1000-8000-00805f9b34fb', // NIET gebruikt (zie boven)
    fitnessMachineStatus:  '00002ada-0000-1000-8000-00805f9b34fb'
  };

  function lc(u) { return String(u || '').toLowerCase(); }

  // Zoek welk bevestigd machinetype bij een gevonden characteristic-UUID hoort.
  // Retourneert null als de UUID niet in de bevestigde lijst voorkomt (geen
  // gok naar het "dichtstbijzijnde" type).
  function machineTypeForCharacteristic(charUuid) {
    var target = lc(charUuid);
    for (var key in MACHINE_DATA_CHARACTERISTICS) {
      if (MACHINE_DATA_CHARACTERISTICS.hasOwnProperty(key) && lc(MACHINE_DATA_CHARACTERISTICS[key].uuid) === target) {
        return { key: key, label: MACHINE_DATA_CHARACTERISTICS[key].label };
      }
    }
    return null;
  }

  // ── UNKNOWN/CONFIRMED decoder-registry (exact het Concept2-precedent) ──
  function createDecoderRegistry() {
    var decoders = {};
    for (var key in MACHINE_DATA_CHARACTERISTICS) {
      if (MACHINE_DATA_CHARACTERISTICS.hasOwnProperty(key)) {
        decoders[lc(MACHINE_DATA_CHARACTERISTICS[key].uuid)] = { status: 'UNKNOWN', decode: null };
      }
    }
    return {
      // Registreer PAS een decoder wanneer de byte-layout tegen de volledige
      // officiele FTMS-spec + een echte device-capture is bevestigd.
      registerDecoder: function (uuid, decodeFn, status) {
        decoders[lc(uuid)] = { status: status || 'CONFIRMED', decode: decodeFn };
      },
      decode: function (uuid, dataView) {
        var d = decoders[lc(uuid)];
        if (!d || d.status !== 'CONFIRMED' || typeof d.decode !== 'function') return null; // UNKNOWN -> nooit een gefabriceerde waarde
        try { return d.decode(dataView); } catch (e) { return null; }
      },
      status: function () {
        var out = {};
        for (var u in decoders) { if (decoders.hasOwnProperty(u)) out[u] = decoders[u].status; }
        return out;
      }
    };
  }

  return {
    FTMS_SERVICE_UUID: FTMS_SERVICE_UUID,
    MACHINE_DATA_CHARACTERISTICS: MACHINE_DATA_CHARACTERISTICS,
    OTHER_CHARACTERISTICS: OTHER_CHARACTERISTICS,
    machineTypeForCharacteristic: machineTypeForCharacteristic,
    createDecoderRegistry: createDecoderRegistry
  };
}));
