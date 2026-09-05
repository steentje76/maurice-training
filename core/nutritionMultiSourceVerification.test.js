'use strict';
const assert = require('assert');
const Verify = require('./nutritionMultiSourceVerification.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

// -- compareField ---------------------------------------------------------
t('compareField: MATCH bij exact gelijke waarden (OFF kcal 42, LABEL kcal 42)', () => {
  assert.strictEqual(Verify.compareField(42, 42), 'MATCH');
});
t('compareField: CONFLICT bij een echt verschil (OFF protein 3.2, LABEL protein 3.5)', () => {
  assert.strictEqual(Verify.compareField(3.2, 3.5), 'CONFLICT');
});
t('compareField: CLOSE_MATCH binnen de gedocumenteerde, kleine tolerantie (afronding)', () => {
  assert.strictEqual(Verify.compareField(6.3, 6.32), 'CLOSE_MATCH');
});
t('compareField: SOURCE_ONLY wanneer slechts één bron een waarde heeft (OFF protein null, LABEL protein 3.5)', () => {
  assert.strictEqual(Verify.compareField(null, 3.5), 'SOURCE_ONLY');
  assert.strictEqual(Verify.compareField(3.5, null), 'SOURCE_ONLY');
});
t('compareField: UNKNOWN wanneer beide bronnen geen waarde hebben', () => {
  assert.strictEqual(Verify.compareField(null, null), 'UNKNOWN');
});
t('compareField: geen enkele automatische keuze -- de functie retourneert nooit een waarde, alleen een status (structurele check)', () => {
  const r = Verify.compareField(1, 2);
  assert.strictEqual(typeof r, 'string');
  assert.strictEqual(Verify.COMPARISON_STATES.indexOf(r) !== -1, true);
});
t('compareField: tolerantie is exact gedocumenteerd, geen brede, willekeurige marge (adversarial -- net buiten tolerantie is CONFLICT)', () => {
  assert.strictEqual(Verify.compareField(6.3, 6.36), 'CONFLICT'); // verschil 0.06 > 0.05-tolerantie
});

// -- compareProducts (veld-voor-veld, geen samengevoegd resultaat) -------
t('compareProducts: correcte per-veld-vergelijking over alle nutrients', () => {
  const off = { energy_kcal: 42, protein_g: 3.2, carbohydrate_g: 10.6, fat_g: 0 };
  const label = { energy_kcal: 42, protein_g: 3.5, carbohydrate_g: 10.6, fat_g: null };
  const r = Verify.compareProducts('OPEN_FOOD_FACTS', off, 'USER_LABEL_SCAN', label);
  assert.strictEqual(r.fields.energy_kcal, 'MATCH');
  assert.strictEqual(r.fields.protein_g, 'CONFLICT');
  assert.strictEqual(r.fields.carbohydrate_g, 'MATCH');
  assert.strictEqual(r.fields.fat_g, 'SOURCE_ONLY');
});
t('compareProducts: robuust bij ontbrekende/null nutrient-objecten (adversarial)', () => {
  const r = Verify.compareProducts('A', null, 'B', { energy_kcal: 100 });
  assert.strictEqual(r.fields.energy_kcal, 'SOURCE_ONLY');
});

// -- hasAnyConflict (puur informatief, geen resolutie) --------------------
t('hasAnyConflict: true wanneer minstens één veld CONFLICT is', () => {
  const off = { protein_g: 3.2 };
  const label = { protein_g: 3.5 };
  const r = Verify.compareProducts('A', off, 'B', label);
  assert.strictEqual(Verify.hasAnyConflict(r), true);
});
t('hasAnyConflict: false zonder enig conflict', () => {
  const off = { energy_kcal: 42 };
  const label = { energy_kcal: 42 };
  const r = Verify.compareProducts('A', off, 'B', label);
  assert.strictEqual(Verify.hasAnyConflict(r), false);
});
t('hasAnyConflict: false bij null-input (fail-safe, geen crash)', () => {
  assert.strictEqual(Verify.hasAnyConflict(null), false);
});

// -- Voorbeeldscenario uit de opdracht zelf, letterlijk nagebouwd --------
t('scenario: OFF protein null + LABEL protein 3.5 -> SOURCE_ONLY (Fase 16, exact opdracht-voorbeeld)', () => {
  const off = { protein_g: null };
  const label = { protein_g: 3.5 };
  const r = Verify.compareProducts('OPEN_FOOD_FACTS', off, 'USER_LABEL_SCAN', label);
  assert.strictEqual(r.fields.protein_g, 'SOURCE_ONLY');
});

console.log(`NutritionMultiSourceVerification: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
