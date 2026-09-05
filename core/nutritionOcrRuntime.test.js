'use strict';
const assert = require('assert');
const OcrRuntime = require('./nutritionOcrRuntime.js');
const LabelParser = require('./nutritionLabelParser.js');

let pass = 0, fail = 0;
async function t(label, fn) {
  try { await fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

(async () => {
  await t('runOcrOnImage: geeft OK + tekst terug bij succesvolle recognize()', async () => {
    var fakeLib = { recognize: async () => ({ data: { text: 'test', confidence: 90 } }) };
    var r = await OcrRuntime.runOcrOnImage({}, fakeLib);
    assert.strictEqual(r.status, 'OK');
    assert.strictEqual(r.text, 'test');
  });

  await t('runOcrOnImage: OCR_FAILED bij een fout, geen crash (adversarial)', async () => {
    var fakeLib = { recognize: async () => { throw new Error('worker crashed'); } };
    var r = await OcrRuntime.runOcrOnImage({}, fakeLib);
    assert.strictEqual(r.status, 'OCR_FAILED');
  });

  await t('extractStructuredNutrientsFromImage: OCR_FAILED bij lege/ontbrekende tekst (adversarial, geen lege observaties als geldig presenteren)', async () => {
    var fakeLib = { recognize: async () => ({ data: { text: '   ', confidence: 0 } }) };
    var r = await OcrRuntime.extractStructuredNutrientsFromImage({}, { tesseractLib: fakeLib, labelParser: LabelParser });
    assert.strictEqual(r.status, 'OCR_FAILED');
  });

  await t('extractStructuredNutrientsFromImage: gebruikt de bestaande, veilige parser -- kJ/kcal blijven apart (regressie op gemockte OCR-tekst)', async () => {
    var fakeLib = { recognize: async () => ({ data: { text: 'Energie 180 kJ / 42 kcal\nEiwitten 5,2 g', confidence: 88 } }) };
    var r = await OcrRuntime.extractStructuredNutrientsFromImage({}, { tesseractLib: fakeLib, labelParser: LabelParser });
    assert.strictEqual(r.observations.energy_kj.normalized_value, 180);
    assert.strictEqual(r.observations.energy_kcal.normalized_value, 42);
    assert.notStrictEqual(r.observations.energy_kcal.normalized_value, 180);
  });

  await t('extractStructuredNutrientsFromImage: elke observatie draagt source=USER_LABEL_SCAN (KERN provenance-eis)', async () => {
    var fakeLib = { recognize: async () => ({ data: { text: 'Eiwitten 5,2 g', confidence: 80 } }) };
    var r = await OcrRuntime.extractStructuredNutrientsFromImage({}, { tesseractLib: fakeLib, labelParser: LabelParser });
    Object.keys(r.observations).forEach(function (k) {
      assert.strictEqual(r.observations[k].source, 'USER_LABEL_SCAN');
    });
  });

  await t('extractStructuredNutrientsFromImage: ontbrekend nutrient blijft null, nooit 0 (UNKNOWN != 0, tegen gemockte maar realistische OCR-tekst)', async () => {
    var fakeLib = { recognize: async () => ({ data: { text: 'Energie 100 kJ / 24 kcal', confidence: 85 } }) }; // geen eiwit/vet/etc vermeld
    var r = await OcrRuntime.extractStructuredNutrientsFromImage({}, { tesseractLib: fakeLib, labelParser: LabelParser });
    assert.strictEqual(r.observations.protein_g.normalized_value, null);
    assert.strictEqual(r.observations.fat_g.normalized_value, null);
  });

  console.log(`NutritionOcrRuntime: ${pass} geslaagd, ${fail} mislukt`);
  console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
  if (fail > 0) process.exit(1);
})();
