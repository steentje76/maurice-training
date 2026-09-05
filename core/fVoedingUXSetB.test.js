'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const setBStart = html.indexOf('VOEDING SET B');
const setBJsStart = html.indexOf('VOEDING SET B', html.indexOf('async function voedingRenderOverview'));
const setBJsEnd = html.indexOf('function voedingConfirmGoToMeal');
const jsBlock = html.slice(setBJsStart, setBJsEnd);

// -- Vendor-integriteit (geen node_modules-referenties, geen CDN) -----------
t('Vendor-bestanden bestaan: zxing.min.js, tesseract.min.js', () => {
  assert.strictEqual(fs.existsSync(path.join(__dirname, 'vendor', 'zxing.min.js')), true);
  assert.strictEqual(fs.existsSync(path.join(__dirname, 'vendor', 'tesseract.min.js')), true);
});
t('index.html verwijst niet naar node_modules (productie-build zou dit breken, adversarial)', () => {
  assert.strictEqual(html.includes('node_modules'), false);
});
t('index.html gebruikt uitsluitend lokale core/vendor-paden voor Tesseract-configuratie (geen impliciete CDN-fallback in de wiring)', () => {
  const fnStart = html.indexOf('async function voedingRunRecognitionOnEnter');
  const fnEnd = html.indexOf('function voedingRenderMatch', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('core/vendor'), true);
});

// -- Geen duplicate runtime: hergebruik van Wave 3/4-modules, geen nieuwe implementatie ----
t('Barcode-scan in Set B hergebruikt NutritionBarcodeRuntime.decodeBarcodeFromImage (geen tweede decoder)', () => {
  const fnStart = html.indexOf('async function voedingScanLiveBarcode');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('NutritionBarcodeRuntime.decodeBarcodeFromImage'), true);
  assert.strictEqual(fnBody.includes('NutritionFoundation2Core.normalizeBarcode'), true);
});
t('OCR-flow hergebruikt NutritionOcrRuntime.extractStructuredNutrientsFromImage + NutritionLabelParser (geen tweede parser)', () => {
  assert.strictEqual(jsBlock.includes('NutritionOcrRuntime.extractStructuredNutrientsFromImage'), true);
  assert.strictEqual(jsBlock.includes('labelParser:NutritionLabelParser'), true);
});
t('Match/conflict-logica hergebruikt NutritionLabelIngestBridge + NutritionMultiSourceVerification (geen eigen vergelijkingslogica)', () => {
  assert.strictEqual(jsBlock.includes('NutritionLabelIngestBridge.processLabelScanAgainstExisting'), true);
  assert.strictEqual(jsBlock.includes('multiSourceVerification:NutritionMultiSourceVerification'), true);
});
t('Custom product/duplicate-detectie hergebruikt NutritionCustomProductService (geen eigen duplicate-logica)', () => {
  assert.strictEqual(jsBlock.includes('NutritionCustomProductService.validateCustomProduct'), true);
  assert.strictEqual(jsBlock.includes('NutritionCustomProductService.detectDuplicateCandidates'), true);
});
t('Correctie-workflow hergebruikt NutritionCrossDomainContract.evaluateCorrectionRequest + canModifyCanonicalRecord (geen eigen VERIFIED-check)', () => {
  assert.strictEqual(jsBlock.includes('NutritionCrossDomainContract.evaluateCorrectionRequest'), true);
  assert.strictEqual(jsBlock.includes('NutritionFoundation2Core.canModifyCanonicalRecord'), true);
});

// -- Geen shadow calculation ------------------------------------------------
t('Nieuw-product-opslag kopieert observaties 1-op-1 uit de OCR-runtime, geen eigen (her)berekening (adversarial)', () => {
  const fnStart = html.indexOf('async function voedingSaveNewProductFromLabel');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(/[a-z_]+\s*\*\s*\d/i.test(fnBody), false, 'geen vermenigvuldiging/eigen berekening in de persistence-functie');
});

// -- Correctie: additief, geen UPDATE-in-place op bestaande nutrient-waarden --
t('Correctie voegt altijd een NIEUWE nutrient_values-rij toe (additief), nooit een UPDATE op een bestaande rij (KERN, historische reproduceerbaarheid)', () => {
  const fnStart = html.indexOf('async function voedingSubmitCorrection');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('sbPostQ'), true);
  assert.strictEqual(fnBody.includes('sbPatchQ'), false, 'correctie mag nooit een bestaande nutrient-rij patchen/overschrijven');
});

// -- VERIFIED-precedence in de UI --------------------------------------------
t('Correctie-UI toont een expliciete VERIFIED-beschermingsmelding, biedt geen directe overschrijf-actie aan (structurele UI-check)', () => {
  const fnStart = html.indexOf('async function voedingRenderCorrectieForm');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('VERIFIED_PROTECTED'), true);
  assert.strictEqual(fnBody.includes('canonical gegevens worden niet automatisch overschreven') || fnBody.includes('canonical blijft ongewijzigd'), true);
});

console.log(`fVoedingUXSetB: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
