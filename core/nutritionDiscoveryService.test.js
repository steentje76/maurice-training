'use strict';
const assert = require('assert');
const Discovery = require('./nutritionDiscoveryService.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

t('buildSearchFilter: TOO_SHORT bij minder dan 2 tekens (voorkomt zinloze queries)', () => {
  assert.strictEqual(Discovery.buildSearchFilter('a').status, 'TOO_SHORT');
});
t('buildSearchFilter: null bij lege string (ontbrekende, betekenisloze input)', () => {
  assert.strictEqual(Discovery.buildSearchFilter(''), null);
});
t('buildSearchFilter: null bij ontbrekende input', () => {
  assert.strictEqual(Discovery.buildSearchFilter(null), null);
});
t('buildSearchFilter: OK met een geldig ilike-patroon', () => {
  const r = Discovery.buildSearchFilter('kipfilet');
  assert.strictEqual(r.status, 'OK');
  assert.strictEqual(r.ilikePattern, '*kipfilet*');
});
t('buildSearchFilter: verwijdert PostgREST-speciale tekens (adversarial, injectie-preventie)', () => {
  const r = Discovery.buildSearchFilter('kip%*,filet');
  assert.strictEqual(r.ilikePattern, '*kipfilet*');
});

t('rankRecentFoods: meest recente eerst', () => {
  const items = [
    { food_id: 'a', occurred_at: '2026-09-01T10:00:00Z' },
    { food_id: 'b', occurred_at: '2026-09-03T10:00:00Z' }
  ];
  const r = Discovery.rankRecentFoods(items);
  assert.strictEqual(r[0].food_id, 'b');
});
t('rankRecentFoods: dedupliceert hetzelfde food_id (adversarial, geen dubbele items in recents)', () => {
  const items = [
    { food_id: 'a', occurred_at: '2026-09-01T10:00:00Z' },
    { food_id: 'a', occurred_at: '2026-09-03T10:00:00Z' }
  ];
  const r = Discovery.rankRecentFoods(items);
  assert.strictEqual(r.length, 1);
});
t('rankRecentFoods: respecteert de limiet', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ food_id: 'f' + i, occurred_at: '2026-09-01T10:00:00Z' }));
  const r = Discovery.rankRecentFoods(items, 5);
  assert.strictEqual(r.length, 5);
});

t('rankFrequentFoods: telt en sorteert op frequentie', () => {
  const items = [
    { food_id: 'a' }, { food_id: 'a' }, { food_id: 'a' },
    { food_id: 'b' }, { food_id: 'b' }
  ];
  const r = Discovery.rankFrequentFoods(items);
  assert.strictEqual(r[0].food_id, 'a');
  assert.strictEqual(r[0].count, 3);
});
t('rankFrequentFoods: negeert items zonder food_id/product_id (adversarial)', () => {
  const items = [{ food_id: 'a' }, {}];
  const r = Discovery.rankFrequentFoods(items);
  assert.strictEqual(r.length, 1);
});

console.log(`NutritionDiscoveryService: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
