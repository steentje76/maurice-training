/* core/nutritionBarcodeRuntime.js — ECHTE, uitvoerbare barcode-runtime.
 *
 * Wrapper rond native BarcodeDetector (waar beschikbaar) met een
 * ZXing-fallback. Roept NOOIT zelf Open Food Facts aan -- levert
 * uitsluitend een genormaliseerde identifier-kandidaat, verwerkt
 * daarna via de bestaande NutritionCameraCapture.resolveBarcodeDetectionResult()
 * (Wave 4-foundation, ongewijzigd) + NutritionFoundation2Core.normalizeBarcode()
 * (Wave 3, ongewijzigd).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionBarcodeRuntime = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* isBarcodeDetectorAvailable: echte capability-detectie, geen aanname. */
  function isBarcodeDetectorAvailable(globalObj) {
    var g = globalObj || (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {}));
    return typeof g.BarcodeDetector === 'function';
  }

  /* detectWithNative: echte aanroep van de native BarcodeDetector op een
   * ImageBitmap/HTMLImageElement/HTMLVideoElement. Retourneert de ruwe
   * detecties in hetzelfde formaat als NutritionCameraCapture verwacht
   * ({ rawValue, confidence? }). */
  async function detectWithNative(BarcodeDetectorCtor, imageSource, formats) {
    var detector = new BarcodeDetectorCtor({ formats: formats || ['ean_13', 'ean_8', 'upc_a', 'code_128'] });
    var results = await detector.detect(imageSource);
    return results.map(function (r) { return { rawValue: r.rawValue, confidence: null }; });
    // Native BarcodeDetector levert geen confidence-score -- expliciet
    // null, nooit een verzonnen getal (spiegelt de bestaande
    // resolveBarcodeDetectionResult()-aanname dat confidence=null
    // betekent "geen score beschikbaar", niet "lage kwaliteit").
  }

  /* detectWithZXing: fallback via @zxing/library (echte, npm-
   * geinstalleerde dependency), voor browsers zonder native
   * BarcodeDetector (iOS Safari, Firefox, desktop-Windows/Linux). */
  async function detectWithZXing(ZXingReader, imageSource) {
    try {
      var result = await ZXingReader.decodeFromImageElement(imageSource);
      return [{ rawValue: result.getText(), confidence: null }];
    } catch (e) {
      // ZXing gooit een NotFoundException wanneer geen enkele barcode
      // gevonden wordt -- dit is GEEN fout, gewoon "niets gedetecteerd".
      return [];
    }
  }

  /* decodeBarcodeFromImage: de ECHTE, uitvoerbare orchestratie-laag.
   * Kiest native BarcodeDetector waar beschikbaar, anders ZXing.
   * Geeft de ruwe detecties door aan de bestaande, geteste
   * resolveBarcodeDetectionResult() (geen tweede beslislaag). */
  async function decodeBarcodeFromImage(imageSource, deps) {
    var globalObj = deps.globalObj;
    var normalizeBarcodeFn = deps.normalizeBarcodeFn;
    var resolveBarcodeDetectionResultFn = deps.resolveBarcodeDetectionResultFn;
    var zxingReader = deps.zxingReader; // optioneel, alleen nodig als fallback-pad genomen wordt

    var rawDetections;
    var pathUsed;
    try {
      if (isBarcodeDetectorAvailable(globalObj)) {
        rawDetections = await detectWithNative(globalObj.BarcodeDetector, imageSource);
        pathUsed = 'native_barcode_detector';
      } else if (zxingReader) {
        rawDetections = await detectWithZXing(zxingReader, imageSource);
        pathUsed = 'zxing_fallback';
      } else {
        return { status: 'UNSUPPORTED', path: 'none' };
      }
    } catch (e) {
      return { status: 'IMAGE_UNREADABLE', path: pathUsed || 'unknown', error: e && e.message };
    }

    var resolved = resolveBarcodeDetectionResultFn(rawDetections, normalizeBarcodeFn);
    resolved.path = pathUsed;
    return resolved;
  }

  var NutritionBarcodeRuntime = {
    isBarcodeDetectorAvailable: isBarcodeDetectorAvailable,
    detectWithNative: detectWithNative,
    detectWithZXing: detectWithZXing,
    decodeBarcodeFromImage: decodeBarcodeFromImage
  };

  return NutritionBarcodeRuntime;
}));
