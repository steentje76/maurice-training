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

  // ══════════════════════════════════════════════════════════
  // OFFICIEEL BEVESTIGDE VELD-PARSERS (correctie: de volledige, geadopteerde
  // FTMS 1.0.1-specificatie is beschikbaar via bluetooth.com; de exacte
  // byte-layout hieronder is drievoudig gecorroboreerd tegen onafhankelijke,
  // hoogwaardige bronnen die zelf rechtstreeks uit de officiële GATT-
  // definities zijn afgeleid: (1) de ruwe, veelgeciteerde GATT-XML-mirror
  // van de officiële Bluetooth SIG-characteristic-definities
  // (github.com/oesmith/gatt-xml), (2) embassy.dev's systematisch uit de
  // officiële YAML/assigned-numbers gegenereerde documentatie, en (3) een
  // onafhankelijk, met echte hardware geverifieerd forumverslag (Nordic
  // DevZone) dat exact dezelfde bit-volgorde en "omgekeerde eerste bit"
  // bevestigt. Waar een veld met minder zekerheid is bevestigd (Expended
  // Energy-groep, Heart Rate, Metabolic Equivalent, Elapsed/Remaining Time),
  // wordt de offset WEL correct doorgeschoven (bekende, veelvuldig
  // gedocumenteerde veldbreedtes) maar de WAARDE bewust niet blootgesteld --
  // zelfde UNKNOWN-discipline als de rest van deze module, nu toegepast per
  // veld i.p.v. per hele characteristic.
  //
  // BELANGRIJKE BIT 0-VAL (expliciet door meerdere bronnen bevestigd, en
  // een bekende bron van fouten bij minder zorgvuldige implementaties):
  // bit 0 heet "More Data", maar bit 0 = 0 betekent dat het EERSTE veld
  // (Instantaneous Speed resp. Stroke Rate + Stroke Count) WEL aanwezig is
  // -- het enige veld in deze characteristics met omgekeerde presence-logica
  // t.o.v. alle andere bits (waar 1 = aanwezig).
  // ══════════════════════════════════════════════════════════
  function dvLength(dv) { return (typeof dv.byteLength === 'number') ? dv.byteLength : (dv.length || 0); }
  function u8At(dv, i) { return (typeof dv.getUint8 === 'function') ? dv.getUint8(i) : dv[i]; }
  function u16At(dv, i) { return (typeof dv.getUint16 === 'function') ? dv.getUint16(i, true) : (dv[i] | (dv[i + 1] << 8)); }
  function i16At(dv, i) { var v = u16At(dv, i); return (v & 0x8000) ? (v - 0x10000) : v; }
  function u24At(dv, i) { return u8At(dv, i) | (u8At(dv, i + 1) << 8) | (u8At(dv, i + 2) << 16); }

  // parseIndoorBikeData(dataView) -> { instantaneousSpeedKmh, averageSpeedKmh,
  //   instantaneousCadenceRpm, averageCadenceRpm, totalDistanceM,
  //   instantaneousPowerW, averagePowerW } of null bij malformed input. Elk
  // veld is null als de bron-flag het niet aanmerkt als aanwezig (UNKNOWN,
  // nooit 0 geraden).
  function parseIndoorBikeData(dataView) {
    if (!dataView || dvLength(dataView) < 2) return null;
    var flags = u16At(dataView, 0);
    var offset = 2;
    var out = {
      instantaneousSpeedKmh: null, averageSpeedKmh: null,
      instantaneousCadenceRpm: null, averageCadenceRpm: null,
      totalDistanceM: null, instantaneousPowerW: null, averagePowerW: null
    };
    function need(n) { if (dvLength(dataView) < offset + n) throw new Error('truncated'); }
    try {
      // bit 0=0 -> Instantaneous Speed aanwezig (omgekeerde logica, zie module-comment).
      if ((flags & 0x0001) === 0) { need(2); out.instantaneousSpeedKmh = Math.round(u16At(dataView, offset) * 0.01 * 100) / 100; offset += 2; }
      if ((flags & 0x0002) !== 0) { need(2); out.averageSpeedKmh = Math.round(u16At(dataView, offset) * 0.01 * 100) / 100; offset += 2; }
      if ((flags & 0x0004) !== 0) { need(2); out.instantaneousCadenceRpm = u16At(dataView, offset) * 0.5; offset += 2; }
      if ((flags & 0x0008) !== 0) { need(2); out.averageCadenceRpm = u16At(dataView, offset) * 0.5; offset += 2; }
      if ((flags & 0x0010) !== 0) { need(3); out.totalDistanceM = u24At(dataView, offset); offset += 3; }
      if ((flags & 0x0020) !== 0) { need(2); offset += 2; } // Resistance Level -- offset correct, waarde bewust niet blootgesteld
      if ((flags & 0x0040) !== 0) { need(2); out.instantaneousPowerW = i16At(dataView, offset); offset += 2; }
      if ((flags & 0x0080) !== 0) { need(2); out.averagePowerW = i16At(dataView, offset); offset += 2; }
      if ((flags & 0x0100) !== 0) { need(5); offset += 5; } // Expended Energy-groep (Total/PerHour/PerMinute) -- offset correct, waarde niet blootgesteld
      if ((flags & 0x0200) !== 0) { need(1); offset += 1; } // Heart Rate
      if ((flags & 0x0400) !== 0) { need(1); offset += 1; } // Metabolic Equivalent
      if ((flags & 0x0800) !== 0) { need(2); offset += 2; } // Elapsed Time
      if ((flags & 0x1000) !== 0) { need(2); offset += 2; } // Remaining Time
    } catch (e) { return null; } // truncated/malformed payload -- geen halve/gegokte waarde
    return out;
  }

  // parseRowerData(dataView) -> { strokeRatePerMin, strokeCount,
  //   averageStrokeRatePerMin, totalDistanceM, instantaneousPaceSecPer500m }
  // of null bij malformed input. Zelfde UNKNOWN-per-veld-discipline.
  function parseRowerData(dataView) {
    if (!dataView || dvLength(dataView) < 2) return null;
    var flags = u16At(dataView, 0);
    var offset = 2;
    var out = {
      strokeRatePerMin: null, strokeCount: null,
      averageStrokeRatePerMin: null, totalDistanceM: null, instantaneousPaceSecPer500m: null
    };
    function need(n) { if (dvLength(dataView) < offset + n) throw new Error('truncated'); }
    try {
      // bit 0=0 -> Stroke Rate + Stroke Count aanwezig (omgekeerde logica).
      if ((flags & 0x0001) === 0) {
        need(1); out.strokeRatePerMin = u8At(dataView, offset) * 0.5; offset += 1;
        need(2); out.strokeCount = u16At(dataView, offset); offset += 2;
      }
      if ((flags & 0x0002) !== 0) { need(1); out.averageStrokeRatePerMin = u8At(dataView, offset) * 0.5; offset += 1; }
      if ((flags & 0x0004) !== 0) { need(3); out.totalDistanceM = u24At(dataView, offset); offset += 3; }
      if ((flags & 0x0008) !== 0) { need(2); out.instantaneousPaceSecPer500m = u16At(dataView, offset); offset += 2; }
      if ((flags & 0x0010) !== 0) { need(2); offset += 2; } // Average Pace
      if ((flags & 0x0020) !== 0) { need(2); offset += 2; } // Instantaneous Power
      if ((flags & 0x0040) !== 0) { need(2); offset += 2; } // Average Power
      if ((flags & 0x0080) !== 0) { need(2); offset += 2; } // Resistance Level
      if ((flags & 0x0100) !== 0) { need(5); offset += 5; } // Expended Energy-groep
      if ((flags & 0x0200) !== 0) { need(1); offset += 1; } // Heart Rate
      if ((flags & 0x0400) !== 0) { need(1); offset += 1; } // Metabolic Equivalent
      if ((flags & 0x0800) !== 0) { need(2); offset += 2; } // Elapsed Time
      if ((flags & 0x1000) !== 0) { need(2); offset += 2; } // Remaining Time
    } catch (e) { return null; }
    return out;
  }

  // parseTreadmillData(dataView) -> { instantaneousSpeedKmh, averageSpeedKmh,
  //   totalDistanceM, inclinationPercent } of null bij malformed input.
  //
  // BEWUST BEPERKTE SCOPE (correctie, sectie 3 van de opdracht: "Bouw
  // alleen wanneer alle relevante byte-layoutdetails voldoende bewezen
  // zijn"): uitsluitend de eerste vier velden (bits 0-3) zijn met dezelfde
  // drievoudige zekerheid bevestigd als Indoor Bike/Rower. De velden
  // DAARNA (Elevation Gain-paar, Pace, Force on Belt/Power Output, Energy,
  // Heart Rate, MET, Elapsed/Remaining Time) hebben WEL bevestigde namen/
  // grootte uit de officiële spec-tekst, maar niet met dezelfde zekerheid
  // bevestigde bit-VOLGORDE -- en cruciaal: Cross Trainer Data (een ander
  // FTMS-machinetype) plaatst zijn eigen Elevation Gain-paar op een ANDERE
  // bit-positie (bit 5) dan waar Treadmill's positie zou liggen als de
  // volgorde simpelweg werd doorgetrokken -- het bewijs dat bit-volgorde
  // NOOIT tussen machinetypes mag worden aangenomen. Deze parser stopt
  // daarom bewust na Inclination/Ramp Angle Setting (bit 3) -- geen
  // gegokte offset voor de latere velden, geen halve/foutieve waarde.
  function parseTreadmillData(dataView) {
    if (!dataView || dvLength(dataView) < 2) return null;
    var flags = u16At(dataView, 0);
    var offset = 2;
    var out = { instantaneousSpeedKmh: null, averageSpeedKmh: null, totalDistanceM: null, inclinationPercent: null };
    function need(n) { if (dvLength(dataView) < offset + n) throw new Error('truncated'); }
    try {
      // bit 0=0 -> Instantaneous Speed aanwezig (zelfde omgekeerde logica als Indoor Bike/Cross Trainer).
      if ((flags & 0x0001) === 0) { need(2); out.instantaneousSpeedKmh = Math.round(u16At(dataView, offset) * 0.01 * 100) / 100; offset += 2; }
      if ((flags & 0x0002) !== 0) { need(2); out.averageSpeedKmh = Math.round(u16At(dataView, offset) * 0.01 * 100) / 100; offset += 2; }
      if ((flags & 0x0004) !== 0) { need(3); out.totalDistanceM = u24At(dataView, offset); offset += 3; }
      if ((flags & 0x0008) !== 0) {
        // "Inclination and Ramp Angle Setting Present" is één gedeelde bit
        // voor een veldPAAR (bevestigd via de officiële spec-tekst: "if the
        // Inclination and Ramp Angle Setting Present bit... is set to 1").
        need(4);
        out.inclinationPercent = i16At(dataView, offset) * 0.1;
        offset += 4; // Inclination (2 bytes, gebruikt) + Ramp Angle Setting (2 bytes, offset correct doorgeschoven, waarde niet blootgesteld)
      }
      // Bewust GEEN verdere velden gedecodeerd (zie moduledocumentatie) --
      // een eventueel hogere flag-bit wordt hier niet gecontroleerd, dus de
      // functie claimt ook niets over data die daarna zou volgen.
    } catch (e) { return null; }
    return out;
  }

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
    createDecoderRegistry: createDecoderRegistry,
    parseIndoorBikeData: parseIndoorBikeData,
    parseRowerData: parseRowerData,
    parseTreadmillData: parseTreadmillData
  };
}));
