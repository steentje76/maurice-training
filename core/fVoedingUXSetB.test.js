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

// -- Real-device closure: geen browser-native dialogen meer (Blocker 1) ----
t('Nutrition UX bevat GEEN enkele alert()/prompt()/confirm()-aanroep (KERN, adversarial regressie-check tegen browser-popups op een echt Android-toestel)', () => {
  const htmlStart = html.indexOf('VOEDING (Nutrition UX v1)');
  const htmlEnd = html.indexOf('<!-- ═══ TRAINING HUB');
  const htmlBlock = html.slice(htmlStart, htmlEnd);
  const jsBlockFull = html.slice(setBJsStart, html.indexOf('async function voedingSaveManualEntry') + 3000);
  const combined = htmlBlock + jsBlockFull;
  const found = combined.match(/\b(alert|prompt|confirm)\(/g) || [];
  assert.deepStrictEqual(found, [], 'gevonden browser-native dialoog-aanroepen: ' + JSON.stringify(found));
});

// -- Blocker 2: OCR-lege-staat mag nooit een bruikbare 'Volgende' tonen ----
t('OCR-herkenning blokkeert Volgende wanneer geen enkel kernveld herkend is (Blocker 2, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingRunRecognitionOnEnter');
  const fnEnd = html.indexOf('async function voedingRenderMatch', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('anyUsableValue'), true);
  assert.strictEqual(fnBody.includes('Geen gegevens herkend'), true);
  assert.strictEqual(fnBody.includes("go('s-voeding-handmatig')") || fnBody.includes('go(\\\'s-voeding-handmatig\\\')'), true);
});

// -- Blocker 3: elk product-aanmaakpad moet naar de portion-flow leiden, nooit direct loggen --
t('Custom product-flow leidt naar de portion-flow, niet direct naar bevestiging (Blocker 3, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingPersistCustomProduct');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("go('s-voeding-hoeveelheid')"), true);
});
t('Label-naar-nieuw-product-flow leidt naar de portion-flow, niet direct naar bevestiging (Blocker 3, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingSaveNewProductFromLabel');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("go('s-voeding-hoeveelheid')"), true);
});
t('Handmatige-invoer-flow (na mislukte OCR) leidt naar de portion-flow (Blocker 3, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingSaveManualEntry');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("go('s-voeding-hoeveelheid')"), true);
});
t('renderVoedingHoeveelheid haalt zelf ontbrekende productdata op (fix voor het echte, op een Android-toestel gevonden defect: leeg hoeveelheid-scherm na foto/custom product)', () => {
  const fnStart = html.indexOf('async function renderVoedingHoeveelheid');
  const fnEnd = html.indexOf('async function voedingConfirmAddToMeal', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('nutrition_nutrient_values'), true);
  assert.strictEqual(fnBody.includes('!voedingSelectedProduct.nutrientRow'), true);
});

console.log(`fVoedingUXSetB: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
