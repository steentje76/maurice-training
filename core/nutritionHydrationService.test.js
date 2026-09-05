'use strict';
const assert = require('assert');
const Hydration = require('./nutritionHydrationService.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

t('normalizeHydrationAmount: 250 ml -> 250', () => {
  assert.deepStrictEqual(Hydration.normalizeHydrationAmount(250, 'ml'), { status: 'OK', amount_ml: 250 });
});
t('normalizeHydrationAmount: 500 ml -> 500', () => {
  assert.strictEqual(Hydration.normalizeHydrationAmount(500, 'ml').amount_ml, 500);
});
t('normalizeHydrationAmount: 0.75 L -> 750 ml (correcte L->ml-conversie)', () => {
  assert.strictEqual(Hydration.normalizeHydrationAmount(0.75, 'L').amount_ml, 750);
});
t('normalizeHydrationAmount: UNSUPPORTED_UNIT bij een onbekende eenheid (adversarial, geen gok)', () => {
  assert.strictEqual(Hydration.normalizeHydrationAmount(1, 'cup').status, 'UNSUPPORTED_UNIT');
});
t('normalizeHydrationAmount: INVALID_QUANTITY bij negatief/niet-numeriek (adversarial)', () => {
  assert.strictEqual(Hydration.normalizeHydrationAmount(-5, 'ml').status, 'INVALID_QUANTITY');
  assert.strictEqual(Hydration.normalizeHydrationAmount('x', 'ml').status, 'INVALID_QUANTITY');
});
t('normalizeHydrationAmount: ZERO_QUANTITY apart onderscheiden van negatief (adversarial)', () => {
  assert.strictEqual(Hydration.normalizeHydrationAmount(0, 'ml').status, 'ZERO_QUANTITY');
});

t('aggregateDailyHydration: correcte som van meerdere, echte entries (250+500+750=1500)', () => {
  const entries = [{ amount_ml: 250 }, { amount_ml: 500 }, { amount_ml: 750 }];
  const r = Hydration.aggregateDailyHydration(entries);
  assert.strictEqual(r.total_ml, 1500);
  assert.strictEqual(r.item_count, 3);
});
t('aggregateDailyHydration: NO_ITEMS bij lege lijst (nooit 0 als geldig totaal presenteren)', () => {
  const r = Hydration.aggregateDailyHydration([]);
  assert.strictEqual(r.status, 'NO_ITEMS');
  assert.strictEqual(r.total_ml, null);
});
t('aggregateDailyHydration: negeert ongeldige entries (adversarial)', () => {
  const entries = [{ amount_ml: 250 }, { amount_ml: null }, {}];
  const r = Hydration.aggregateDailyHydration(entries);
  assert.strictEqual(r.item_count, 1);
});

t('canModifyHydrationEntry: alleen de eigenaar', () => {
  const entry = { user_id: 'u1' };
  assert.strictEqual(Hydration.canModifyHydrationEntry('u1', entry), true);
  assert.strictEqual(Hydration.canModifyHydrationEntry('u2', entry), false);
});

console.log(`NutritionHydrationService: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
