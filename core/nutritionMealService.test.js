'use strict';
const assert = require('assert');
const MealService = require('./nutritionMealService.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

t('validateMealType: canonical types geaccepteerd', () => {
  assert.strictEqual(MealService.validateMealType('breakfast'), true);
  assert.strictEqual(MealService.validateMealType('snack'), true);
});
t('validateMealType: onbekend type geweigerd (adversarial, geen vrije tekst)', () => {
  assert.strictEqual(MealService.validateMealType('brunch'), false);
});

t('canModifyMeal: alleen de eigenaar', () => {
  const meal = { user_id: 'u1' };
  assert.strictEqual(MealService.canModifyMeal('u1', meal), true);
  assert.strictEqual(MealService.canModifyMeal('u2', meal), false);
});

t('aggregateDailyNutrition: NO_ITEMS bij lege lijst, alle velden UNKNOWN (nooit 0)', () => {
  const r = MealService.aggregateDailyNutrition([]);
  assert.strictEqual(r.status, 'NO_ITEMS');
  assert.strictEqual(r.energy_kcal, null);
  assert.strictEqual(r.coverage.energy_kcal, 'UNKNOWN');
});
t('aggregateDailyNutrition: COMPLETE coverage wanneer alle items een veld hebben', () => {
  const items = [
    { nutrient_snapshot: { energy_kcal: 300, protein_g: 10 } },
    { nutrient_snapshot: { energy_kcal: 200, protein_g: 5 } }
  ];
  const r = MealService.aggregateDailyNutrition(items);
  assert.strictEqual(r.energy_kcal, 500);
  assert.strictEqual(r.coverage.energy_kcal, 'COMPLETE');
});
t('aggregateDailyNutrition: PARTIAL coverage wanneer slechts een deel van de items fiber_g heeft (KERN, voorbeeld uit de opdracht: 70% coverage)', () => {
  const items = [
    { nutrient_snapshot: { energy_kcal: 300, fiber_g: 5 } },
    { nutrient_snapshot: { energy_kcal: 200 } }, // geen fiber_g
    { nutrient_snapshot: { energy_kcal: 100 } }  // geen fiber_g
  ];
  const r = MealService.aggregateDailyNutrition(items);
  assert.strictEqual(r.energy_kcal, 600);
  assert.strictEqual(r.fiber_g, 5); // som van de bekende waarden, geen 0 voor de ontbrekende
  assert.strictEqual(r.coverage.fiber_g, 'PARTIAL');
});
t('aggregateDailyNutrition: UNKNOWN coverage wanneer GEEN enkel item een veld heeft (nooit 0-totaal)', () => {
  const items = [{ nutrient_snapshot: { energy_kcal: 300 } }];
  const r = MealService.aggregateDailyNutrition(items);
  assert.strictEqual(r.sodium_mg, null);
  assert.strictEqual(r.coverage.sodium_mg, 'UNKNOWN');
});
t('aggregateDailyNutrition: bekende 0-waarde blijft 0, niet null (adversarial -- genuine zero != unknown)', () => {
  const items = [{ nutrient_snapshot: { energy_kcal: 100, fiber_g: 0 } }];
  const r = MealService.aggregateDailyNutrition(items);
  assert.strictEqual(r.fiber_g, 0);
  assert.strictEqual(r.coverage.fiber_g, 'COMPLETE');
});
t('aggregateDailyNutrition: negeert items zonder nutrient_snapshot (adversarial)', () => {
  const items = [{ nutrient_snapshot: { energy_kcal: 100 } }, { nutrient_snapshot: null }, {}];
  const r = MealService.aggregateDailyNutrition(items);
  assert.strictEqual(r.item_count, 1);
});

t('validateQuantity: geldige waarde geaccepteerd', () => {
  assert.strictEqual(MealService.validateQuantity(150).valid, true);
});
t('validateQuantity: 0 en negatief geweigerd, apart onderscheiden (adversarial)', () => {
  assert.strictEqual(MealService.validateQuantity(0).reason, 'ZERO_QUANTITY');
  assert.strictEqual(MealService.validateQuantity(-5).reason, 'NEGATIVE_QUANTITY');
});
t('validateQuantity: extreme waarde geweigerd (adversarial)', () => {
  assert.strictEqual(MealService.validateQuantity(999999).reason, 'EXTREME_QUANTITY');
});
t('validateQuantity: niet-numeriek geweigerd (adversarial)', () => {
  assert.strictEqual(MealService.validateQuantity('abc').reason, 'INVALID_QUANTITY');
  assert.strictEqual(MealService.validateQuantity(NaN).reason, 'INVALID_QUANTITY');
});

console.log(`NutritionMealService: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
