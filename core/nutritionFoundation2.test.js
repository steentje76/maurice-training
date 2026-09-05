'use strict';
const assert = require('assert');
const N2 = require('./nutritionFoundation2.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

// -- normalizeBarcode --------------------------------------------------------
t('normalizeBarcode: EAN-13 correct herkend op lengte', () => {
  const r = N2.normalizeBarcode('8710398513896');
  assert.strictEqual(r.identifier_type, 'EAN_13');
  assert.strictEqual(r.value, '8710398513896');
});
t('normalizeBarcode: whitespace en non-digits worden verwijderd', () => {
  const r = N2.normalizeBarcode(' 8710 3985 13896 ');
  assert.strictEqual(r.value, '8710398513896');
});
t('normalizeBarcode: EAN-8', () => {
  assert.strictEqual(N2.normalizeBarcode('12345678').identifier_type, 'EAN_8');
});
t('normalizeBarcode: onbekende lengte -> OTHER (geen gok, adversarial)', () => {
  assert.strictEqual(N2.normalizeBarcode('123').identifier_type, 'OTHER');
});
t('normalizeBarcode: null bij lege/ongeldige input', () => {
  assert.strictEqual(N2.normalizeBarcode(''), null);
  assert.strictEqual(N2.normalizeBarcode(null), null);
  assert.strictEqual(N2.normalizeBarcode('abc'), null);
});

// -- resolveBarcode (NOT_FOUND/AMBIGUOUS/FOUND, geen gok) -------------------
t('resolveBarcode: NOT_FOUND bij geen enkele match (nooit een lege productkaart)', () => {
  const norm = N2.normalizeBarcode('8710398513896');
  assert.strictEqual(N2.resolveBarcode(norm, []).status, 'NOT_FOUND');
});
t('resolveBarcode: NOT_FOUND bij ongeldige barcode', () => {
  assert.strictEqual(N2.resolveBarcode(null, []).status, 'NOT_FOUND');
});
t('resolveBarcode: FOUND bij exact 1 distinct product', () => {
  const norm = N2.normalizeBarcode('8710398513896');
  const r = N2.resolveBarcode(norm, [{ product_id: 'p1' }]);
  assert.strictEqual(r.status, 'FOUND');
  assert.strictEqual(r.productId, 'p1');
});
t('resolveBarcode: AMBIGUOUS bij meerdere, conflicterende producten (adversarial -- nooit automatisch gokken)', () => {
  const norm = N2.normalizeBarcode('8710398513896');
  const r = N2.resolveBarcode(norm, [{ product_id: 'p1' }, { product_id: 'p2' }]);
  assert.strictEqual(r.status, 'AMBIGUOUS');
  assert.deepStrictEqual(r.candidateProductIds, ['p1', 'p2']);
});
t('resolveBarcode: FOUND (niet AMBIGUOUS) bij dubbele rijen voor hetzelfde product (dedup-check)', () => {
  const norm = N2.normalizeBarcode('8710398513896');
  const r = N2.resolveBarcode(norm, [{ product_id: 'p1' }, { product_id: 'p1' }]);
  assert.strictEqual(r.status, 'FOUND');
});

// -- portionToNutrients (UNKNOWN != 0, unit-conversie) ----------------------
t('portionToNutrients: PER_100G correct geschaald naar 150g', () => {
  const row = { basis: 'PER_100G', energy_kcal: 200, protein_g: 10, carbohydrate_g: 20, fat_g: 5 };
  const r = N2.portionToNutrients(row, 150, 'g');
  assert.strictEqual(r.energy_kcal, 300);
  assert.strictEqual(r.protein_g, 15);
});
t('portionToNutrients: PER_100ML correct geschaald naar 250ml', () => {
  const row = { basis: 'PER_100ML', energy_kcal: 40 };
  const r = N2.portionToNutrients(row, 250, 'ml');
  assert.strictEqual(r.energy_kcal, 100);
});
t('portionToNutrients: PER_SERVING met quantity=2 servings', () => {
  const row = { basis: 'PER_SERVING', energy_kcal: 150 };
  const r = N2.portionToNutrients(row, 2, 'serving');
  assert.strictEqual(r.energy_kcal, 300);
});
t('portionToNutrients: ontbrekende nutrient blijft null, NOOIT 0 (KERN UNKNOWN!=0)', () => {
  const row = { basis: 'PER_100G', energy_kcal: 200 }; // protein_g ontbreekt volledig
  const r = N2.portionToNutrients(row, 100, 'g');
  assert.strictEqual(r.protein_g, null);
  assert.notStrictEqual(r.protein_g, 0);
});
t('portionToNutrients: INVALID_SERVING bij mismatch tussen basis en unit (adversarial)', () => {
  const row = { basis: 'PER_100ML', energy_kcal: 40 };
  const r = N2.portionToNutrients(row, 100, 'g'); // ml-basis, maar g opgegeven
  assert.strictEqual(r.status, 'INVALID_SERVING');
});
t('portionToNutrients: null bij ontbrekende/ongeldige quantity (adversarial)', () => {
  const row = { basis: 'PER_100G', energy_kcal: 200 };
  assert.strictEqual(N2.portionToNutrients(row, 0, 'g'), null);
  assert.strictEqual(N2.portionToNutrients(row, -5, 'g'), null);
  assert.strictEqual(N2.portionToNutrients(null, 100, 'g'), null);
});

// -- aggregateNutrients (meal/daily totals, UNKNOWN/PARTIAL/KNOWN) ----------
t('aggregateNutrients: UNKNOWN status en 0 item_count bij lege lijst (nooit 0-totaal)', () => {
  const r = N2.aggregateNutrients([]);
  assert.strictEqual(r.status, 'UNKNOWN');
  assert.strictEqual(r.energy_kcal, null);
  assert.strictEqual(r.data_quality.energy_kcal, 'UNKNOWN');
});
t('aggregateNutrients: KNOWN wanneer alle items een waarde hadden voor een veld', () => {
  const items = [{ status: 'valid', energy_kcal: 100 }, { status: 'valid', energy_kcal: 200 }];
  const r = N2.aggregateNutrients(items);
  assert.strictEqual(r.energy_kcal, 300);
  assert.strictEqual(r.data_quality.energy_kcal, 'KNOWN');
});
t('aggregateNutrients: PARTIAL wanneer slechts een deel van de items een waarde had (KERN UNKNOWN!=0)', () => {
  const items = [{ status: 'valid', energy_kcal: 100, protein_g: 10 }, { status: 'valid', energy_kcal: 200 }]; // 2e mist protein_g
  const r = N2.aggregateNutrients(items);
  assert.strictEqual(r.protein_g, 10);
  assert.strictEqual(r.data_quality.protein_g, 'PARTIAL');
});
t('aggregateNutrients: UNKNOWN voor een veld wanneer GEEN enkel item het had (nooit 0)', () => {
  const items = [{ status: 'valid', energy_kcal: 100 }];
  const r = N2.aggregateNutrients(items);
  assert.strictEqual(r.protein_g, null);
  assert.strictEqual(r.data_quality.protein_g, 'UNKNOWN');
});
t('aggregateNutrients: negeert items met status anders dan valid (bv. INVALID_SERVING, adversarial)', () => {
  const items = [{ status: 'valid', energy_kcal: 100 }, { status: 'INVALID_SERVING', energy_kcal: 999 }];
  const r = N2.aggregateNutrients(items);
  assert.strictEqual(r.energy_kcal, 100);
  assert.strictEqual(r.item_count, 1);
});

// -- canModifyCanonicalRecord (community correcties mogen VERIFIED niet overschrijven)
t('canModifyCanonicalRecord: true voor de eigen creator van een niet-VERIFIED rij', () => {
  const record = { created_by: 'u1', verification_state: 'USER_PRIVATE' };
  assert.strictEqual(N2.canModifyCanonicalRecord('u1', record), true);
});
t('canModifyCanonicalRecord: false voor VERIFIED, zelfs voor de oorspronkelijke creator (KERN sectie 13)', () => {
  const record = { created_by: 'u1', verification_state: 'VERIFIED' };
  assert.strictEqual(N2.canModifyCanonicalRecord('u1', record), false);
});
t('canModifyCanonicalRecord: false voor een andere gebruiker (adversarial)', () => {
  const record = { created_by: 'u1', verification_state: 'USER_PRIVATE' };
  assert.strictEqual(N2.canModifyCanonicalRecord('u2', record), false);
});

console.log(`NutritionFoundation2Core: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
