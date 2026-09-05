/* core/nutritionCameraCapture.js — NUTRITION CAMERA CAPTURE (contract laag).
 *
 * Pure, technologie-onafhankelijke logica boven een reeds uitgevoerde
 * barcode-detectie (native BarcodeDetector of een polyfill -- die
 * technologie-keuze hoort in de UI-integratielaag, niet hier). Dit
 * bestand bepaalt uitsluitend hoe RUWE detectieresultaten omgezet
 * worden naar veilige, gestructureerde states, en roept NOOIT zelf
 * Open Food Facts of enige provider aan -- dat blijft exclusief bij de
 * bestaande Wave 3-architectuur (NutritionFoundation2Core.
 * normalizeBarcode/resolveBarcode, nutrition-off-lookup.js).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionCameraCapture = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CAMERA_ACCESS_STATES = ['SUCCESS', 'PERMISSION_DENIED', 'NO_CAMERA', 'UNSUPPORTED', 'CAPTURE_CANCELLED', 'CAPTURE_FAILED'];
  var BARCODE_DETECTION_STATES = ['FOUND', 'NO_BARCODE', 'MULTIPLE_BARCODES', 'INVALID_IDENTIFIER', 'LOW_CONFIDENCE', 'UNSUPPORTED_FORMAT', 'IMAGE_UNREADABLE'];
  var LOW_CONFIDENCE_THRESHOLD = 0.5; // conservatief; expliciet gedocumenteerd, geen magic number verspreid

  /* resolveCameraAccessResult: normaliseert een ruw camera-access-
   * resultaat (bv. een afgevangen getUserMedia-exception) naar een van
   * de vaste, expliciete states. Nooit een stille fallback naar
   * nepdata. */
  function resolveCameraAccessResult(rawError) {
    if (!rawError) return { status: 'SUCCESS' };
    var name = rawError.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return { status: 'PERMISSION_DENIED' };
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return { status: 'NO_CAMERA' };
    if (name === 'AbortError') return { status: 'CAPTURE_CANCELLED' };
    if (name === 'NotSupportedError') return { status: 'UNSUPPORTED' };
    return { status: 'CAPTURE_FAILED', reason: name || 'unknown' };
  }

  /* resolveBarcodeDetectionResult: neemt een ruwe lijst van gedetecteerde
   * raw-values (van BarcodeDetector.detect() of een polyfill-equivalent)
   * + hun checksum-validatie (via de BESTAANDE Foundation 2-functie,
   * hier als parameter meegegeven, geen tweede implementatie) en bepaalt
   * de juiste, expliciete state. Kiest NOOIT automatisch tussen
   * meerdere, geldige kandidaten. */
  function resolveBarcodeDetectionResult(rawDetections, normalizeBarcodeFn) {
    if (!Array.isArray(rawDetections) || rawDetections.length === 0) {
      return { status: 'NO_BARCODE' };
    }
    var normalized = rawDetections.map(function (d) {
      var confidence = typeof d.confidence === 'number' ? d.confidence : null;
      var n = normalizeBarcodeFn(d.rawValue);
      return { raw: d, normalized: n, confidence: confidence };
    });

    // Laagvertrouwen-detecties (indien de onderliggende technologie een
    // confidence-score levert) worden apart gemeld, niet stilzwijgend
    // gefilterd en dan als "gevonden" gepresenteerd.
    var lowConfidence = normalized.filter(function (n) { return n.confidence !== null && n.confidence < LOW_CONFIDENCE_THRESHOLD; });
    if (lowConfidence.length === normalized.length && normalized.length > 0) {
      return { status: 'LOW_CONFIDENCE', candidates: normalized.map(function (n) { return n.raw.rawValue; }) };
    }

    var validCandidates = normalized.filter(function (n) {
      return n.normalized && n.normalized.status !== 'INVALID_IDENTIFIER' && n.normalized.identifier_type !== 'OTHER';
    });

    if (validCandidates.length === 0) {
      // Alle gedetecteerde codes waren checksum-ongeldig of niet-
      // interpreteerbaar.
      var allInvalid = normalized.every(function (n) { return n.normalized && n.normalized.status === 'INVALID_IDENTIFIER'; });
      if (allInvalid) return { status: 'INVALID_IDENTIFIER' };
      return { status: 'UNSUPPORTED_FORMAT' };
    }

    if (validCandidates.length > 1) {
      // Meerdere, geldige, verschillende barcodes -- NOOIT automatisch
      // kiezen (Fase 5, hard rule).
      var distinctValues = validCandidates
        .map(function (n) { return n.normalized.value; })
        .filter(function (v, i, arr) { return arr.indexOf(v) === i; });
      if (distinctValues.length > 1) {
        return { status: 'MULTIPLE_BARCODES', candidates: distinctValues };
      }
    }

    return { status: 'FOUND', identifier: validCandidates[0].normalized };
  }

  var NutritionCameraCapture = {
    CAMERA_ACCESS_STATES: CAMERA_ACCESS_STATES,
    BARCODE_DETECTION_STATES: BARCODE_DETECTION_STATES,
    LOW_CONFIDENCE_THRESHOLD: LOW_CONFIDENCE_THRESHOLD,
    resolveCameraAccessResult: resolveCameraAccessResult,
    resolveBarcodeDetectionResult: resolveBarcodeDetectionResult
  };

  return NutritionCameraCapture;
}));
