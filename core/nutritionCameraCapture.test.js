'use strict';
const assert = require('assert');
const Capture = require('./nutritionCameraCapture.js');
const N2 = require('./nutritionFoundation2.js'); // hergebruik van bestaande checksum-validatie

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

// -- resolveCameraAccessResult ------------------------------------------
t('resolveCameraAccessResult: SUCCESS zonder error', () => {
  assert.strictEqual(Capture.resolveCameraAccessResult(null).status, 'SUCCESS');
});
t('resolveCameraAccessResult: PERMISSION_DENIED bij NotAllowedError', () => {
  assert.strictEqual(Capture.resolveCameraAccessResult({ name: 'NotAllowedError' }).status, 'PERMISSION_DENIED');
});
t('resolveCameraAccessResult: NO_CAMERA bij NotFoundError', () => {
  assert.strictEqual(Capture.resolveCameraAccessResult({ name: 'NotFoundError' }).status, 'NO_CAMERA');
});
t('resolveCameraAccessResult: CAPTURE_CANCELLED bij AbortError', () => {
  assert.strictEqual(Capture.resolveCameraAccessResult({ name: 'AbortError' }).status, 'CAPTURE_CANCELLED');
});
t('resolveCameraAccessResult: CAPTURE_FAILED als fallback, nooit stille SUCCESS bij onbekende fout (adversarial)', () => {
  const r = Capture.resolveCameraAccessResult({ name: 'SomeWeirdError' });
  assert.strictEqual(r.status, 'CAPTURE_FAILED');
});

// -- resolveBarcodeDetectionResult (KERN: nooit automatisch kiezen) -----
t('resolveBarcodeDetectionResult: NO_BARCODE bij lege detectie', () => {
  assert.strictEqual(Capture.resolveBarcodeDetectionResult([], N2.normalizeBarcode).status, 'NO_BARCODE');
});
t('resolveBarcodeDetectionResult: FOUND bij één, geldige EAN-13 (echte, geverifieerde barcode)', () => {
  const r = Capture.resolveBarcodeDetectionResult([{ rawValue: '4006381333931' }], N2.normalizeBarcode);
  assert.strictEqual(r.status, 'FOUND');
  assert.strictEqual(r.identifier.value, '4006381333931');
});
t('resolveBarcodeDetectionResult: INVALID_IDENTIFIER bij foute checksum, doorgegeven van de bestaande Foundation 2-validatie (geen tweede implementatie)', () => {
  const r = Capture.resolveBarcodeDetectionResult([{ rawValue: '4006381333932' }], N2.normalizeBarcode);
  assert.strictEqual(r.status, 'INVALID_IDENTIFIER');
});
t('resolveBarcodeDetectionResult: MULTIPLE_BARCODES bij twee verschillende, geldige codes -- NOOIT automatisch kiezen (KERN, Fase 5)', () => {
  const r = Capture.resolveBarcodeDetectionResult([
    { rawValue: '4006381333931' }, { rawValue: '036000291452' }
  ], N2.normalizeBarcode);
  assert.strictEqual(r.status, 'MULTIPLE_BARCODES');
  assert.strictEqual(r.candidates.length, 2);
});
t('resolveBarcodeDetectionResult: FOUND (niet MULTIPLE) bij dezelfde barcode dubbel gedetecteerd (dedup, geen vals-positief)', () => {
  const r = Capture.resolveBarcodeDetectionResult([
    { rawValue: '4006381333931' }, { rawValue: '4006381333931' }
  ], N2.normalizeBarcode);
  assert.strictEqual(r.status, 'FOUND');
});
t('resolveBarcodeDetectionResult: LOW_CONFIDENCE wanneer alle detecties onder de drempel liggen (adversarial, nooit als FOUND presenteren)', () => {
  const r = Capture.resolveBarcodeDetectionResult([{ rawValue: '4006381333931', confidence: 0.2 }], N2.normalizeBarcode);
  assert.strictEqual(r.status, 'LOW_CONFIDENCE');
});
t('resolveBarcodeDetectionResult: UNSUPPORTED_FORMAT bij een onbekende-lengte, niet-checksum-valideerbare code (geen OTHER-gok als succes)', () => {
  const r = Capture.resolveBarcodeDetectionResult([{ rawValue: '123' }], N2.normalizeBarcode);
  assert.strictEqual(r.status, 'UNSUPPORTED_FORMAT');
});

console.log(`NutritionCameraCapture: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
