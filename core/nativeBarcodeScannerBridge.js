/* core/nativeBarcodeScannerBridge.js — NATIVE ANDROID BARCODE SCANNER (CameraX + ML Kit).
 *
 * PUUR/TESTBAAR waar mogelijk: dit bestand bevat de technologie-
 * onafhankelijke logica (capability-detectie, resultaat-mapping,
 * duplicate-scan-lock, permission-state-resolutie, ondersteunde
 * formaten). De daadwerkelijke Capacitor-plugin-aanroepen (async,
 * platform-afhankelijk) zitten in een dunne shim onderaan, die uitsluitend
 * de pure functies hierboven aanroept -- nooit een tweede, parallelle
 * beslislaag.
 *
 * ARCHITECTUURGRENS (ongewijzigd t.o.v. nutritionBarcodeRuntime.js):
 * dit bestand roept NOOIT zelf Open Food Facts of enige provider aan, en
 * bepaalt NOOIT zelf een canonical product -- het levert uitsluitend een
 * ruwe identifier-kandidaat door aan de BESTAANDE, ongewijzigde
 * NutritionCameraCapture.resolveBarcodeDetectionResult() +
 * NutritionFoundation2Core.normalizeBarcode(). Zelfde contract, derde pad
 * naast native BarcodeDetector en ZXing (zie nutritionBarcodeRuntime.js).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NativeBarcodeScannerBridge = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Sectie 6: "Activeer bewust minimaal EAN-13/EAN-8/UPC-A/UPC-E. Controleer
  // of Code 128 werkelijk productwaarde toevoegt." -- geverifieerd tegen de
  // BESTAANDE, ongewijzigde core/nutritionFoundation2.js:
  // normalizeBarcode()/CHECKSUM_SPECS ondersteunt uitsluitend numerieke
  // lengtes 8/12/13/14 (EAN_8/UPC_A/EAN_13/GTIN_14). CODE_128 is
  // alfanumeriek/variabele-lengte met een ander controlegetal-algoritme --
  // activeren zou vrijwel altijd tot INVALID_IDENTIFIER leiden, dus GEEN
  // productwaarde: bewust NIET geactiveerd (was eerder abusievelijk wel
  // aangezet, hier gecorrigeerd). UPC_E ontbreekt EVENEENS in
  // CHECKSUM_SPECS -- een correcte ondersteuning vereist een UPC-E->UPC-A-
  // expansie die ik zonder een echt gescand UPC-E-voorbeeld om tegen te
  // verifiëren niet verantwoord kan implementeren (risico op een SILENT
  // VERKEERDE match is erger dan het format nog niet ondersteunen). Bewust
  // als open, gerapporteerde gap achtergelaten i.p.v. gegokt -- zie
  // eindrapport.
  var SUPPORTED_FORMATS = ['EAN_13', 'EAN_8', 'UPC_A'];

  var PERMISSION_STATES = ['NOT_DETERMINED', 'GRANTED', 'DENIED', 'PERMANENTLY_DENIED', 'UNAVAILABLE'];

  /* isNativeAndroidScannerAvailable: echte capability-detectie (geen
   * user-agent-sniffing) -- vereist zowel een Capacitor-native-runtime
   * als de daadwerkelijk geregistreerde plugin. Retourneert altijd een
   * boolean, nooit een exception bij een ontbrekend/onvolledig window. */
  function isNativeAndroidScannerAvailable(globalObj) {
    var g = globalObj || (typeof window !== 'undefined' ? window : {});
    try {
      return !!(g.Capacitor && typeof g.Capacitor.isNativePlatform === 'function'
        && g.Capacitor.isNativePlatform() && g.Capacitor.getPlatform && g.Capacitor.getPlatform() === 'android'
        && g.Capacitor.Plugins && g.Capacitor.Plugins.TkBarcodeScanner);
    } catch (e) {
      return false;
    }
  }

  /* mapNativeResultToRawDetection: zet het vaste, minimale native
   * plugin-contract ({rawValue, format, timestamp}) om naar exact de
   * vorm die resolveBarcodeDetectionResult() al kent ({rawValue,
   * confidence}). ML Kit levert geen betrouwbare confidence-score voor
   * barcodes -- expliciet null (spiegelt detectWithNative() in
   * nutritionBarcodeRuntime.js), NOOIT een verzonnen getal. Valideert
   * het format tegen de eigen allow-list (sectie 6) -- een onverwacht/
   * niet-geconfigureerd format van een gemanipuleerde/oudere native
   * build wordt hier al geweigerd, vóór het de resolver bereikt. */
  function mapNativeResultToRawDetection(nativeResult) {
    if (!nativeResult || typeof nativeResult.rawValue !== 'string' || !nativeResult.rawValue) return null;
    if (SUPPORTED_FORMATS.indexOf(nativeResult.format) === -1) return null;
    return { rawValue: nativeResult.rawValue, confidence: null };
  }

  /* resolvePermissionUiState: puur, deterministisch. Zet de native
   * plugin-permissiestatus (Android: GRANTED/DENIED, met een apart
   * signaal voor "permanently denied"/"don't ask again" -- Capacitor
   * levert dit via canRequestAgain=false) om naar een van de vaste UI-
   * states (sectie 11, A-H). */
  function resolvePermissionUiState(nativeStatus) {
    if (!nativeStatus || typeof nativeStatus !== 'object') return 'UNAVAILABLE';
    if (nativeStatus.camera === 'granted') return 'GRANTED';
    if (nativeStatus.camera === 'denied') {
      return nativeStatus.canRequestAgain === false ? 'PERMANENTLY_DENIED' : 'DENIED';
    }
    if (nativeStatus.camera === 'prompt' || nativeStatus.camera === 'prompt-with-rationale') return 'NOT_DETERMINED';
    return 'UNAVAILABLE';
  }

  /* ScanLock: sectie 8, duplicate scan protection. Puur/testbaar object
   * i.p.v. losse module-level mutable state, zodat meerdere onafhankelijke
   * scan-sessies (en tests) elkaar nooit kunnen beinvloeden. Regel:
   * zodra een geldige barcode is doorgegeven, blokkeert de lock alle
   * volgende detecties tot een EXPLICIETE resume -- nooit een impliciete
   * timeout/auto-hervatting (voorkomt tientallen events per fysieke
   * barcode, sectie 8) en nooit oneindig vast blijven zitten (de UI-laag
   * roept expliciet resume() aan zodra de gebruiker teruggaat of het
   * product niet bruikbaar bleek, exact zoals de opdracht voorschrijft). */
  function createScanLock() {
    var locked = false;
    var lastValue = null;
    return {
      isLocked: function () { return locked; },
      /* tryAcquire(value): true als deze detectie mag doorgaan (en de
       * lock meteen sluit); false als de lock al dicht zit -- ongeacht
       * of het dezelfde of een andere waarde is (sectie 8: "scanner lock
       * zodra geldige barcode is gevonden", niet per-waarde-dedup). */
      tryAcquire: function (value) {
        if (locked) return false;
        locked = true;
        lastValue = value;
        return true;
      },
      resume: function () { locked = false; },
      lastValue: function () { return lastValue; }
    };
  }

  var NativeBarcodeScannerBridge = {
    SUPPORTED_FORMATS: SUPPORTED_FORMATS,
    PERMISSION_STATES: PERMISSION_STATES,
    isNativeAndroidScannerAvailable: isNativeAndroidScannerAvailable,
    mapNativeResultToRawDetection: mapNativeResultToRawDetection,
    resolvePermissionUiState: resolvePermissionUiState,
    createScanLock: createScanLock
  };

  // ── Onderstaande shim is NIET puur (echte Capacitor-plugin-calls) --
  // dun, bevat zelf geen beslislogica, delegeert alles hierboven. Alleen
  // geladen/aangeroepen in een browser/Capacitor-context, nooit in Node-
  // tests (module.exports hierboven stopt vóór dit punt in Node).
  if (typeof window !== 'undefined') {
    NativeBarcodeScannerBridge.startScan = function (onDetected, onError) {
      var g = window;
      if (!isNativeAndroidScannerAvailable(g)) return false;
      var lock = createScanLock();
      NativeBarcodeScannerBridge._activeLock = lock;
      g.Capacitor.Plugins.TkBarcodeScanner.addListener('barcodeDetected', function (nativeResult) {
        if (!lock.tryAcquire(nativeResult && nativeResult.rawValue)) return; // sectie 8: reeds vergrendeld, negeer
        var mapped = mapNativeResultToRawDetection(nativeResult);
        if (!mapped) { lock.resume(); return; } // onbekend/ongeldig format: nooit blokkeren op ruis
        onDetected(mapped);
      });
      g.Capacitor.Plugins.TkBarcodeScanner.startBarcodeScan({ formats: SUPPORTED_FORMATS }).catch(onError);
      return true;
    };
    NativeBarcodeScannerBridge.stopScan = function () {
      var g = window;
      if (!isNativeAndroidScannerAvailable(g)) return;
      g.Capacitor.Plugins.TkBarcodeScanner.stopBarcodeScan();
      NativeBarcodeScannerBridge._activeLock = null;
    };
    NativeBarcodeScannerBridge.resumeScan = function () {
      if (NativeBarcodeScannerBridge._activeLock) NativeBarcodeScannerBridge._activeLock.resume();
    };
    NativeBarcodeScannerBridge.setTorch = function (enabled) {
      var g = window;
      if (!isNativeAndroidScannerAvailable(g)) return Promise.resolve(false);
      return g.Capacitor.Plugins.TkBarcodeScanner.setTorch({ enabled: !!enabled });
    };
    NativeBarcodeScannerBridge.requestCameraPermission = function () {
      var g = window;
      if (!isNativeAndroidScannerAvailable(g)) return Promise.resolve('UNAVAILABLE');
      return g.Capacitor.Plugins.TkBarcodeScanner.requestCameraPermission().then(resolvePermissionUiState);
    };
    NativeBarcodeScannerBridge.cameraPermissionStatus = function () {
      var g = window;
      if (!isNativeAndroidScannerAvailable(g)) return Promise.resolve('UNAVAILABLE');
      return g.Capacitor.Plugins.TkBarcodeScanner.cameraPermissionStatus().then(resolvePermissionUiState);
    };
  }

  return NativeBarcodeScannerBridge;
}));
