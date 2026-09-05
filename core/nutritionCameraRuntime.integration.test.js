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

  // -- ECHTE end-to-end: OCR -> bridge -> multi-source (MATCH + CONFLICT) --
  const Bridge = require('./nutritionLabelIngestBridge.js');
  const MultiSource = require('./nutritionMultiSourceVerification.js');
  const IngestService = require('./nutritionIngestService.js');
  const bridgeDeps = { multiSourceVerification: MultiSource, ingestService: IngestService };

  async function runRealOcr(fixtureFile) {
    return OcrRuntime.extractStructuredNutrientsFromImage(
      path.join(FIXTURE_DIR, fixtureFile),
      { tesseractLib: { recognize: async (img) => {
          const worker = await Tesseract.createWorker('eng', 1, { langPath: LANG_PATH, gzip: true, cachePath: CACHE_PATH });
          const r = await worker.recognize(img); await worker.terminate(); return r;
        } }, labelParser: LabelParser, lang: 'eng' }
    );
  }

  await t('END-TO-END: echte afbeelding (label_nl_clear.png) -> echte OCR -> MATCH tegen identieke, bestaande waarden (geen handmatig ingespoten string)', async () => {
    const ocrResult = await runRealOcr('label_nl_clear.png');
    assert.strictEqual(ocrResult.observations.energy_kcal.normalized_value, 539);
    const existingNutrients = { energy_kcal: 539, protein_g: 6.3, carbohydrate_g: 57.5, fat_g: 30.9 };
    const r = Bridge.processLabelScanAgainstExisting(ocrResult, { name: 'Testproduct', verification_state: 'COMMUNITY_UNVERIFIED' }, existingNutrients, bridgeDeps);
    assert.strictEqual(r.comparison.fields.energy_kcal, 'MATCH');
    assert.strictEqual(r.comparison.fields.protein_g, 'MATCH');
    assert.strictEqual(r.hasConflict, false);
  });

  await t('END-TO-END: dezelfde, echte OCR-uitkomst -> CONFLICT tegen duidelijk afwijkende, bestaande waarden (echte pixels, geen gok, geen automatische winnaar)', async () => {
    const ocrResult = await runRealOcr('label_nl_clear.png');
    const conflictingExisting = { energy_kcal: 539, protein_g: 20.0 }; // duidelijk afwijkend van de echte 6.3
    const r = Bridge.processLabelScanAgainstExisting(ocrResult, { name: 'Testproduct', verification_state: 'COMMUNITY_UNVERIFIED' }, conflictingExisting, bridgeDeps);
    assert.strictEqual(r.comparison.fields.protein_g, 'CONFLICT');
    assert.strictEqual(r.hasConflict, true);
  });

  await t('END-TO-END: VERIFIED blijft beschermd tegen een echt, uit een foto herkend conflict (KERN precedence, echte pixels)', async () => {
    const ocrResult = await runRealOcr('label_nl_clear.png');
    const conflictingExisting = { protein_g: 20.0 };
    const r = Bridge.processLabelScanAgainstExisting(ocrResult, { name: 'VERIFIED Testproduct', verification_state: 'VERIFIED' }, conflictingExisting, bridgeDeps);
    assert.strictEqual(r.hasConflict, true);
    assert.strictEqual(r.ingestDecision.action, 'KEEP_EXISTING_VERIFIED');
  });

  await t('END-TO-END: onbekend product (geen lokaal/OFF-record) -> echte OCR -> REJECT zonder bevestigde naam (nooit een naam verzinnen)', async () => {
    const ocrResult = await runRealOcr('label_nl_clear.png');
    const r = Bridge.processLabelScanAgainstExisting(ocrResult, null, null, bridgeDeps);
    assert.strictEqual(r.comparison, null); // geen bestaande data om tegen te vergelijken
    assert.strictEqual(r.ingestDecision.action, 'REJECT');
  });

  await t('END-TO-END: onbekend product + gebruiker bevestigt naam -> CREATE_NEW candidate met snapshot uit echte OCR-waarden', async () => {
    const ocrResult = await runRealOcr('label_nl_clear.png');
    const r = Bridge.processLabelScanAgainstExisting(ocrResult, null, null, bridgeDeps, 'Nieuw, onbekend product');
    assert.strictEqual(r.ingestDecision.action, 'CREATE_NEW');
    assert.strictEqual(r.snapshotCandidate.energy_kcal, 539);
    assert.strictEqual(r.snapshotCandidate.protein_g, 6.3);
  });

  await t('HISTORISCHE REPRODUCEERBAARHEID: een oude, bevroren meal-snapshot blijft numeriek ongewijzigd wanneer een NIEUWE, echte label-scan afwijkende waarden oplevert (hard gate, Fase 8/22)', async () => {
    // Simuleert: op dag 1 werd een maaltijd gelogd met deze bevroren
    // snapshot (bv. uit een oudere OFF- of label-scan-waarde).
    const historicalSnapshot = { energy_kcal: 500, protein_g: 5.0, carbohydrate_g: 55.0, fat_g: 28.0 };
    const frozenCopy = JSON.parse(JSON.stringify(historicalSnapshot));

    // Op dag 20 wordt hetzelfde product opnieuw gescand -- de ECHTE OCR
    // levert nu andere, nieuwere waarden op (539/6.3/57.5/30.9).
    const newOcrResult = await runRealOcr('label_nl_clear.png');
    const newlyExtracted = Bridge.observationsToFlatNutrients(newOcrResult.observations);

    // isSnapshotStillValid() (Wave 3, ongewijzigd) mag de oude snapshot
    // nooit aanpassen -- uitsluitend, puur, INFORMATIEF melden dat hij
    // inmiddels afwijkt.
    const stillValid = IngestService.isSnapshotStillValid(historicalSnapshot, newlyExtracted);
    assert.strictEqual(stillValid, false); // correct: de waarden zijn wel degelijk anders

    // KERN, HARDE GATE: de oorspronkelijke, historische snapshot zelf
    // is door bovenstaande aanroep NIET gemuteerd.
    assert.deepStrictEqual(historicalSnapshot, frozenCopy);
    assert.strictEqual(historicalSnapshot.energy_kcal, 500); // NIET retroactief 539 geworden
  });

  console.log(`\nRuntime integratietests: ${pass} geslaagd, ${fail} mislukt`);
  console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
  if (fail > 0) process.exit(1);
})();
