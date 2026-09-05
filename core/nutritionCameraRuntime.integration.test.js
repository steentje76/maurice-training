'use strict';
/* core/nutritionCameraRuntime.integration.test.js
 *
 * ECHTE runtime-integratietests -- verwerkt daadwerkelijke
 * afbeeldingspixels (core/fixtures/nutrition/*.png), niet handmatig
 * aangeleverde barcode-strings of OCR-tekst. Vereist Playwright
 * (chromium) en een lokale Tesseract-taaldata-cache.
 *
 * Deze tests draaien NIET als onderdeel van de standaard, snelle
 * release-gate-suite (ze zijn traag: browser-opstart + OCR-init) --
 * apart uitgevoerd en hier gedocumenteerd met hun daadwerkelijke,
 * geobserveerde resultaten.
 */
const path = require('path');
const fs = require('fs');
const assert = require('assert');

let pass = 0, fail = 0;
async function t(label, fn) {
  try { await fn(); pass++; console.log('OK:', label); }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

(async () => {
  let chromium, Tesseract;
  try {
    chromium = require('playwright').chromium;
    Tesseract = require('tesseract.js');
  } catch (e) {
    console.log('OVERGESLAGEN: playwright/tesseract.js niet geinstalleerd in deze omgeving.');
    console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)');
    return;
  }
  const OcrRuntime = require('./nutritionOcrRuntime.js');
  const LabelParser = require('./nutritionLabelParser.js');

  const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'nutrition');
  const LANG_PATH = path.join(FIXTURE_DIR, 'tessdata');
  const CACHE_PATH = '/tmp/tess_cache';
  if (!fs.existsSync(path.join(LANG_PATH, 'eng.traineddata.gz'))) {
    console.log('OVERGESLAGEN: Tesseract-taaldata niet gevonden op', LANG_PATH);
    console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)');
    return;
  }

  // -- ECHTE OCR op echte, gerenderde pixels (geen handmatige string) ------
  await t('OCR: echte afbeelding (label_nl_per100g.png) -> energy_kj=2227 (echt, uit pixels herkend)', async () => {
    const result = await OcrRuntime.extractStructuredNutrientsFromImage(
      path.join(FIXTURE_DIR, 'label_nl_per100g.png'),
      {
        tesseractLib: { recognize: async (img) => {
          const worker = await Tesseract.createWorker('eng', 1, { langPath: LANG_PATH, gzip: true, cachePath: CACHE_PATH });
          const r = await worker.recognize(img); await worker.terminate(); return r;
        } },
        labelParser: LabelParser, lang: 'eng'
      }
    );
    assert.strictEqual(result.status, 'OK');
    assert.strictEqual(result.observations.energy_kj.normalized_value, 2227);
  });

  await t('OCR: echte afbeelding -> salt_g=0.1 (echt, uit pixels herkend, KOMMA-DECIMAAL correct verwerkt)', async () => {
    const result = await OcrRuntime.extractStructuredNutrientsFromImage(
      path.join(FIXTURE_DIR, 'label_nl_per100g.png'),
      {
        tesseractLib: { recognize: async (img) => {
          const worker = await Tesseract.createWorker('eng', 1, { langPath: LANG_PATH, gzip: true, cachePath: CACHE_PATH });
          const r = await worker.recognize(img); await worker.terminate(); return r;
        } },
        labelParser: LabelParser, lang: 'eng'
      }
    );
    assert.strictEqual(result.observations.salt_g.normalized_value, 0.1);
  });

  await t('OCR: nooit een kJ-waarde als kcal (adversarial, tegen echte OCR-output, niet alleen tegen een handmatige teststring)', async () => {
    const result = await OcrRuntime.extractStructuredNutrientsFromImage(
      path.join(FIXTURE_DIR, 'label_nl_per100g.png'),
      {
        tesseractLib: { recognize: async (img) => {
          const worker = await Tesseract.createWorker('eng', 1, { langPath: LANG_PATH, gzip: true, cachePath: CACHE_PATH });
          const r = await worker.recognize(img); await worker.terminate(); return r;
        } },
        labelParser: LabelParser, lang: 'eng'
      }
    );
    assert.notStrictEqual(result.observations.energy_kcal.normalized_value, 2227);
  });

  // -- ECHTE barcode-decodering op echte, gerenderde pixels ------------------
  await t('Barcode: echte EAN-13-afbeelding -> FOUND via ZXing-fallback, checksum gevalideerd (geen handmatige string)', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const zxingLib = fs.readFileSync(path.join(__dirname, '..', 'node_modules', '@zxing', 'library', 'umd', 'index.min.js'), 'utf8');
    await page.addScriptTag({ content: zxingLib });
    for (const f of ['nutritionCameraCapture.js', 'nutritionFoundation2.js', 'nutritionBarcodeRuntime.js']) {
      await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, f), 'utf8') });
    }
    const imgBase64 = fs.readFileSync(path.join(FIXTURE_DIR, 'ean13_valid.png')).toString('base64');
    await page.setContent(`<img id="bc" src="data:image/png;base64,${imgBase64}">`);
    await page.waitForFunction(() => document.getElementById('bc').complete);
    const result = await page.evaluate(async () => {
      const img = document.getElementById('bc');
      const zxingReader = new ZXing.BrowserMultiFormatReader();
      const zxingAdapter = { decodeFromImageElement: (im) => zxingReader.decodeFromImageElement(im) };
      return await NutritionBarcodeRuntime.decodeBarcodeFromImage(img, {
        globalObj: window,
        normalizeBarcodeFn: NutritionFoundation2Core.normalizeBarcode,
        resolveBarcodeDetectionResultFn: NutritionCameraCapture.resolveBarcodeDetectionResult,
        zxingReader: zxingAdapter
      });
    });
    await browser.close();
    assert.strictEqual(result.status, 'FOUND');
    assert.strictEqual(result.identifier.value, '4006381333931');
    assert.strictEqual(result.identifier.status, 'valid');
    assert.strictEqual(result.path, 'zxing_fallback');
  });

  await t('Barcode: NO_BARCODE bij een afbeelding zonder enige barcode (echte pixels, geen barcode aanwezig)', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const zxingLib = fs.readFileSync(path.join(__dirname, '..', 'node_modules', '@zxing', 'library', 'umd', 'index.min.js'), 'utf8');
    await page.addScriptTag({ content: zxingLib });
    for (const f of ['nutritionCameraCapture.js', 'nutritionFoundation2.js', 'nutritionBarcodeRuntime.js']) {
      await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, f), 'utf8') });
    }
    // Hergebruik het label-plaatje (bevat tekst, geen barcode) als "geen barcode"-fixture.
    const imgBase64 = fs.readFileSync(path.join(FIXTURE_DIR, 'label_nl_per100g.png')).toString('base64');
    await page.setContent(`<img id="bc" src="data:image/png;base64,${imgBase64}">`);
    await page.waitForFunction(() => document.getElementById('bc').complete);
    const result = await page.evaluate(async () => {
      const img = document.getElementById('bc');
      const zxingReader = new ZXing.BrowserMultiFormatReader();
      const zxingAdapter = { decodeFromImageElement: (im) => zxingReader.decodeFromImageElement(im) };
      return await NutritionBarcodeRuntime.decodeBarcodeFromImage(img, {
        globalObj: window,
        normalizeBarcodeFn: NutritionFoundation2Core.normalizeBarcode,
        resolveBarcodeDetectionResultFn: NutritionCameraCapture.resolveBarcodeDetectionResult,
        zxingReader: zxingAdapter
      });
    });
    await browser.close();
    assert.strictEqual(result.status, 'NO_BARCODE');
  });

  console.log(`\nRuntime integratietests: ${pass} geslaagd, ${fail} mislukt`);
  console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
  if (fail > 0) process.exit(1);
})();
