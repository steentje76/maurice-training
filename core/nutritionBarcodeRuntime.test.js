'use strict';
const assert = require('assert');
const BarcodeRuntime = require('./nutritionBarcodeRuntime.js');

let pass = 0, fail = 0;
async function t(label, fn) {
  try { await fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

(async () => {
  // -- isBarcodeDetectorAvailable ------------------------------------------
  await t('isBarcodeDetectorAvailable: true wanneer BarcodeDetector bestaat als functie', () => {
    assert.strictEqual(BarcodeRuntime.isBarcodeDetectorAvailable({ BarcodeDetector: function () {} }), true);
  });
  await t('isBarcodeDetectorAvailable: false wanneer afwezig (adversarial, echte browser-capability-detectie)', () => {
    assert.strictEqual(BarcodeRuntime.isBarcodeDetectorAvailable({}), false);
  });

  // -- decodeBarcodeFromImage: orchestratie, gemockte detectoren ----------
  await t('decodeBarcodeFromImage: gebruikt native pad wanneer BarcodeDetector beschikbaar is', async () => {
    var nativeCalled = false, zxingCalled = false;
    function FakeBarcodeDetector() {}
    FakeBarcodeDetector.prototype.detect = async function () { nativeCalled = true; return [{ rawValue: '4006381333931' }]; };
    var result = await BarcodeRuntime.decodeBarcodeFromImage({}, {
      globalObj: { BarcodeDetector: FakeBarcodeDetector },
      normalizeBarcodeFn: function (v) { return { value: v, identifier_type: 'EAN_13', status: 'valid' }; },
      resolveBarcodeDetectionResultFn: function (raw, norm) { return { status: 'FOUND', identifier: norm(raw[0].rawValue) }; },
      zxingReader: { decodeFromImageElement: async () => { zxingCalled = true; throw new Error('should not be called'); } }
    });
    assert.strictEqual(nativeCalled, true);
    assert.strictEqual(zxingCalled, false);
    assert.strictEqual(result.status, 'FOUND');
    assert.strictEqual(result.path, 'native_barcode_detector');
  });

  await t('decodeBarcodeFromImage: valt terug op ZXing wanneer BarcodeDetector ontbreekt (adversarial, KERN fallback-logica)', async () => {
    var zxingCalled = false;
    var result = await BarcodeRuntime.decodeBarcodeFromImage({}, {
      globalObj: {},
      normalizeBarcodeFn: function (v) { return { value: v, identifier_type: 'EAN_13', status: 'valid' }; },
      resolveBarcodeDetectionResultFn: function (raw, norm) { return raw.length ? { status: 'FOUND', identifier: norm(raw[0].rawValue) } : { status: 'NO_BARCODE' }; },
      zxingReader: { decodeFromImageElement: async () => { zxingCalled = true; return { getText: () => '4006381333931' }; } }
    });
    assert.strictEqual(zxingCalled, true);
    assert.strictEqual(result.path, 'zxing_fallback');
    assert.strictEqual(result.status, 'FOUND');
  });

  await t('decodeBarcodeFromImage: UNSUPPORTED wanneer geen native EN geen ZXing beschikbaar (adversarial)', async () => {
    var result = await BarcodeRuntime.decodeBarcodeFromImage({}, {
      globalObj: {},
      normalizeBarcodeFn: function () { return null; },
      resolveBarcodeDetectionResultFn: function () { return { status: 'NO_BARCODE' }; },
      zxingReader: null
    });
    assert.strictEqual(result.status, 'UNSUPPORTED');
  });

  await t('decodeBarcodeFromImage: IMAGE_UNREADABLE bij een fout tijdens detectie (adversarial, geen crash)', async () => {
    function FakeBarcodeDetector() {}
    FakeBarcodeDetector.prototype.detect = async function () { throw new Error('corrupt image data'); };
    var result = await BarcodeRuntime.decodeBarcodeFromImage({}, {
      globalObj: { BarcodeDetector: FakeBarcodeDetector },
      normalizeBarcodeFn: function () { return null; },
      resolveBarcodeDetectionResultFn: function () { return { status: 'FOUND' }; }
    });
    assert.strictEqual(result.status, 'IMAGE_UNREADABLE');
  });

  await t('detectWithZXing: lege array (geen fout) wanneer geen barcode gevonden wordt (adversarial, ZXing-NotFoundException-afhandeling)', async () => {
    var fakeReader = { decodeFromImageElement: async () => { throw new Error('not found'); } };
    var result = await BarcodeRuntime.detectWithZXing(fakeReader, {});
    assert.deepStrictEqual(result, []);
  });

  console.log(`NutritionBarcodeRuntime: ${pass} geslaagd, ${fail} mislukt`);
  console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
  if (fail > 0) process.exit(1);
})();
