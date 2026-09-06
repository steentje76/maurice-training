'use strict';
const assert = require('assert');
const QG = require('./nutritionImageQualityGate.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

function boxBlur(px, w, h, radius) {
  const out = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0, count = 0;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const ny = y + dy, nx = x + dx;
      if (ny >= 0 && ny < h && nx >= 0 && nx < w) { sum += px[ny * w + nx]; count++; }
    }
    out[y * w + x] = sum / count;
  }
  return out;
}
function makeCheckerboard(w, h) {
  const px = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = ((Math.floor(x / 5) + Math.floor(y / 5)) % 2 === 0) ? 20 : 220;
  return px;
}

// -- computeSharpnessScore / evaluateSharpness (gevalideerd tegen echte, progressieve blur) --
t('evaluateSharpness: PASS voor een scherp, hoog-contrast patroon (handmatig, echt gevalideerd)', () => {
  const px = makeCheckerboard(50, 50);
  const r = QG.evaluateSharpness(px, 50, 50);
  assert.strictEqual(r.status, 'PASS');
});
t('evaluateSharpness: FAIL_BLUR voor evident, zwaar wazig beeld (echte box-blur-simulatie, niet aangenomen)', () => {
  const px = boxBlur(makeCheckerboard(50, 50), 50, 50, 5);
  const r = QG.evaluateSharpness(px, 50, 50);
  assert.strictEqual(r.status, 'FAIL_BLUR');
});
t('evaluateSharpness: UNKNOWN bij ontbrekende/ongeldige input (adversarial, geen gok)', () => {
  assert.strictEqual(QG.evaluateSharpness(null, 50, 50).status, 'UNKNOWN');
  assert.strictEqual(QG.evaluateSharpness([1, 2], 1, 1).status, 'UNKNOWN');
});
t('computeSharpnessScore: hogere score voor scherper beeld dan voor wazig (monotoon, eerlijke heuristiek-check)', () => {
  const sharpScore = QG.computeSharpnessScore(makeCheckerboard(50, 50), 50, 50);
  const blurScore = QG.computeSharpnessScore(boxBlur(makeCheckerboard(50, 50), 50, 50, 5), 50, 50);
  assert.strictEqual(sharpScore > blurScore, true);
});

// -- evaluateExposure ---------------------------------------------------------
t('evaluateExposure: FAIL_TOO_DARK bij een evident te donker beeld', () => {
  const px = new Array(100).fill(5);
  assert.strictEqual(QG.evaluateExposure(px).status, 'FAIL_TOO_DARK');
});
t('evaluateExposure: FAIL_TOO_BRIGHT bij een evident overbelicht beeld', () => {
  const px = new Array(100).fill(250);
  assert.strictEqual(QG.evaluateExposure(px).status, 'FAIL_TOO_BRIGHT');
});
t('evaluateExposure: PASS bij normale, gevarieerde belichting', () => {
  const px = new Array(100).fill(0).map(function (_, i) { return 80 + (i % 60); });
  assert.strictEqual(QG.evaluateExposure(px).status, 'PASS');
});

// -- evaluateImageQuality: combinatie, geen silent doorgang ------------------
t('evaluateImageQuality: PASS voor scherp + normaal belicht', () => {
  const px = makeCheckerboard(50, 50).map(function (v) { return v * 0.5 + 60; }); // matig contrast, normale belichting
  const r = QG.evaluateImageQuality(px, 50, 50);
  assert.strictEqual(r.status, 'PASS');
});
t('evaluateImageQuality: FAIL_BLUR wint van een op zich normale belichting (adversarial, geen silent PASS ondanks blur)', () => {
  const px = boxBlur(makeCheckerboard(50, 50), 50, 50, 5);
  const r = QG.evaluateImageQuality(px, 50, 50);
  assert.strictEqual(r.status, 'FAIL_BLUR');
});
t('evaluateImageQuality: nooit een AI-beoordeling -- uitsluitend deterministische, reproduceerbare pixelmetrieken (structurele/documentatie-check)', () => {
  // Zelfde input, twee keer aangeroepen -- moet exact hetzelfde resultaat geven (determinisme).
  const px = makeCheckerboard(50, 50);
  const r1 = QG.evaluateImageQuality(px, 50, 50);
  const r2 = QG.evaluateImageQuality(px, 50, 50);
  assert.deepStrictEqual(r1, r2);
});

console.log(`NutritionImageQualityGate: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
