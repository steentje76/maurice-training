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

// -- Scanner-scherm bestaat, met alle vereiste UI-elementen -----------------
t('s-voeding-scanner-scherm bestaat met live preview, kader en instructie', () => {
  assert.strictEqual(html.includes('id="s-voeding-scanner"'), true);
  assert.strictEqual(html.includes('id="voeding-scanner-video"'), true);
  assert.strictEqual(html.includes('id="voeding-scanner-frame"'), true);
  assert.strictEqual(html.includes('Houd de barcode binnen het kader'), true);
});
t('"Scan barcode"-knop navigeert naar het scannerscherm, niet naar een silent achtergrondscan (KERN, adversarial regressie tegen de gerapporteerde bug)', () => {
  const fnStart = html.indexOf('function voedingOpenBarcodeUnavailable');
  const fnEnd = html.indexOf('\n', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("go('s-voeding-scanner')"), true);
});
t('Geen enkele duplicate voedingOpenBarcodeUnavailable-definitie (adversarial, voorkomt de oude, silente flow)', () => {
  const matches = html.match(/function voedingOpenBarcodeUnavailable\(\)/g) || [];
  assert.strictEqual(matches.length, 1);
});

// -- Handmatige invoer --------------------------------------------------------
t('Handmatig-barcode-invoerscherm bestaat en hergebruikt de bestaande checksum-validatie (geen tweede parser)', () => {
  assert.strictEqual(html.includes('id="s-voeding-scanner-handmatig"'), true);
  const fnStart = html.indexOf('function voedingLookupManualBarcode');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('NutritionFoundation2Core.normalizeBarcode'), true);
});

// -- Not-found-state: nooit alleen een toast ---------------------------------
t('BARCODE_NOT_FOUND toont een echte, in-scherm staat met twee acties (Opnieuw proberen + Barcode handmatig invoeren), niet alleen een toast (KERN)', () => {
  assert.strictEqual(html.includes('id="voeding-scanner-notfound"'), true);
  assert.strictEqual(html.includes('Nog geen barcode gevonden'), true);
  assert.strictEqual(html.includes('Houd de camera stil en zorg dat de barcode scherp en volledig zichtbaar is.'), true);
  assert.strictEqual(html.includes('voedingScannerRetry'), true);
});
t('voedingRunScanLoop schakelt naar de not-found-staat bij INVALID_IDENTIFIER, blijft NIET stilzwijgend doorscannen zonder feedback (structureel)', () => {
  const fnStart = html.indexOf('async function voedingRunScanLoop');
  const fnEnd = html.indexOf('function voedingScannerRetry', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("result.status==='INVALID_IDENTIFIER'"), true);
  assert.strictEqual(fnBody.includes("voeding-scanner-notfound').style.display='block'"), true);
});

// -- Geen silent flow: elke staat heeft zichtbare feedback -------------------
t('voedingStartScanner toont expliciet CAMERA_STARTING/PERMISSION_REQUIRED-tekst, nooit een stille flow', () => {
  const fnStart = html.indexOf('async function voedingStartScanner');
  const fnEnd = html.indexOf('async function voedingRunScanLoop', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('Camera wordt gestart'), true);
  assert.strictEqual(fnBody.includes('PERMISSION_DENIED'), true);
  assert.strictEqual(fnBody.includes('Camera kon niet worden geopend'), true);
});
t('Barcode-detectie routeert naar lookup (BARCODE_DETECTED -> LOOKUP_IN_PROGRESS), niet direct terug naar zoeken zonder feedback', () => {
  const fnStart = html.indexOf('async function voedingRunScanLoop');
  const fnEnd = html.indexOf('function voedingScannerRetry', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("result.status==='FOUND'"), true);
  assert.strictEqual(fnBody.includes('Product opzoeken'), true);
});

// -- Geen browser-native dialogen (Blocker 1, opnieuw bevestigd voor de scanner) --
t('Scanner-flow bevat geen enkele alert()/prompt()/confirm() (adversarial)', () => {
  const fnStart = html.indexOf('function voedingSetScannerStatus');
  const fnEnd = html.indexOf('async function voedingLookupBarcodeValue') + 300;
  const fnBody = html.slice(fnStart, fnEnd);
  const found = fnBody.match(/\b(alert|prompt|confirm)\(/g) || [];
  assert.deepStrictEqual(found, []);
});

// -- Hergebruik van de bestaande barcode-runtime, geen tweede implementatie --
t('Scanner hergebruikt NutritionBarcodeRuntime.decodeBarcodeFromImage + NutritionFoundation2Core.normalizeBarcode (geen tweede decoder)', () => {
  const fnStart = html.indexOf('async function voedingRunScanLoop');
  const fnEnd = html.indexOf('function voedingScannerRetry', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('NutritionBarcodeRuntime.decodeBarcodeFromImage'), true);
  assert.strictEqual(fnBody.includes('NutritionFoundation2Core.normalizeBarcode'), true);
});

// -- Camera-resource-veiligheid: altijd stoppen bij verlaten -----------------
t('voedingCloseScanner stopt alle media-tracks (geen camera die op de achtergrond actief blijft)', () => {
  const fnStart = html.indexOf('function voedingCloseScanner');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('getTracks().forEach'), true);
  assert.strictEqual(fnBody.includes('.stop()'), true);
});
t('go() roept voedingCloseScanner() aan bij elke navigatie weg van het scannerscherm (structurele check, voorkomt achtergrond-camera)', () => {
  const idx = html.indexOf("if(id==='s-voeding-scanner')voedingStartScanner(); else voedingCloseScanner();");
  assert.notStrictEqual(idx, -1);
});

// -- Realistische camera-constraints, geen hardcoded, onveilige waarden -----
t('Camera-aanvraag gebruikt facingMode:environment + redelijke ideal-resolutie, geen hardcoded exacte device-waarden (adversarial)', () => {
  const fnStart = html.indexOf('async function voedingStartScanner');
  const fnEnd = html.indexOf('catch(e)', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("facingMode:'environment'"), true);
  assert.strictEqual(fnBody.includes('ideal:1280'), true);
  assert.strictEqual(/exact:/.test(fnBody), false, 'geen harde exact-constraints die op specifieke devices kunnen falen');
});

console.log(`fVoedingBarcodeScanner: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
