'use strict';
const assert = require('assert');
const OFF = require('./nutritionProviderOpenFoodFacts.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

/* Echte, live opgehaalde fixtures (september 2026, niet gesimuleerd) --
 * ingekort tot de relevante velden. Volledige respons in
 * docs/NUTRITION_OFF_FIELD_MAPPING.md. */
const NUTELLA_RESPONSE = {
  code: '3017624010701',
  status: 1,
  status_verbose: 'product found',
  product: {
    rev: 105,
    product_name: 'Nutella',
    brands: 'Ferrero',
    allergens_tags: ['en:nuts'],
    nutrition_data_per: '100g',
    nutriments: {
      'energy-kcal_100g': 539, 'energy_100g': 2227.9,
      proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9,
      sugars_100g: 56.3, 'saturated-fat_100g': 10.6,
      sodium_100g: 0.043, salt_100g: 0.1075
    }
  }
};

const COCACOLA_RESPONSE = {
  code: '5449000000996',
  status: 1,
  status_verbose: 'product found',
  product: {
    product_name: 'Coca-Cola',
    brands: 'Coca-Cola',
    nutrition_data_per: '100g',
    nutriments: {
      energy: 180, 'energy-kcal': 42, 'energy-kj': 180, // let op: geen _100g-suffix hier, adversarial-case
      'energy-kcal_100g': 42, carbohydrates_100g: 10.6,
      'energy-kcal_serving': 139, carbohydrates_serving: 35
    }
  }
};

const NOT_FOUND_RESPONSE = { code: '00000000', status: 0, status_verbose: 'no code or invalid code' };
const EMPTY_PRODUCT_RESPONSE = { code: '3017624010701', status: 1, status_verbose: 'product found', product: {} };

// -- validateResponse (KERN: status in body, niet HTTP-status) -------------
t('validateResponse: valid=true bij status=1 met gevuld product', () => {
  assert.strictEqual(OFF.validateResponse(NUTELLA_RESPONSE).valid, true);
});
t('validateResponse: NOT_FOUND bij status=0 (adversarial -- HTTP 200 met status:0, geen 404)', () => {
  const r = OFF.validateResponse(NOT_FOUND_RESPONSE);
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.reason, 'NOT_FOUND');
});
t('validateResponse: INCOMPLETE_PRODUCT bij status=1 maar leeg product-object (bevestigd, extern gedocumenteerd randgeval)', () => {
  const r = OFF.validateResponse(EMPTY_PRODUCT_RESPONSE);
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.reason, 'INCOMPLETE_PRODUCT');
});
t('validateResponse: MALFORMED_RESPONSE bij null/non-object', () => {
  assert.strictEqual(OFF.validateResponse(null).reason, 'MALFORMED_RESPONSE');
  assert.strictEqual(OFF.validateResponse('garbage').reason, 'MALFORMED_RESPONSE');
});

// -- extractEnergyKcal (KERN, adversarieel bevestigde kJ/kcal-val) ---------
t('extractEnergyKcal: leest energy-kcal_100g, NOOIT het kale energy-veld (KERN-FIX, Coca-Cola-bewijs)', () => {
  const kcal = OFF.extractEnergyKcal(COCACOLA_RESPONSE.product.nutriments);
  assert.strictEqual(kcal, 42); // NIET 180 (dat is kJ)
});
t('extractEnergyKcal: null wanneer energy-kcal_100g ontbreekt, ook al is het kale energy-veld aanwezig (adversarial)', () => {
  const kcal = OFF.extractEnergyKcal({ energy: 180 });
  assert.strictEqual(kcal, null);
});
t('extractEnergyKcal: correcte waarde voor Nutella', () => {
  assert.strictEqual(OFF.extractEnergyKcal(NUTELLA_RESPONSE.product.nutriments), 539);
});

// -- normalizeNutrients (UNKNOWN_BASIS, salt/sodium-scheiding, eenheidsconversie)
t('normalizeNutrients: correcte PER_100G-normalisatie voor Nutella (echte fixture)', () => {
  const n = OFF.normalizeNutrients(NUTELLA_RESPONSE.product);
  assert.strictEqual(n.status, 'valid');
  assert.strictEqual(n.basis, 'PER_100G');
  assert.strictEqual(n.energy_kcal, 539);
  assert.strictEqual(n.protein_g, 6.3);
});
t('normalizeNutrients: sodium correct van g naar mg omgezet (43 mg, niet 0.043)', () => {
  const n = OFF.normalizeNutrients(NUTELLA_RESPONSE.product);
  assert.strictEqual(n.sodium_mg, 43);
});
t('normalizeNutrients: salt_100g wordt NIET gebruikt/omgezet naar sodium (geen shadow calculation, adversarial)', () => {
  const n = OFF.normalizeNutrients(NUTELLA_RESPONSE.product);
  assert.strictEqual(n.hasOwnProperty('salt_g'), false); // geen salt-veld in canonical output
  assert.notStrictEqual(n.sodium_mg, 107.5); // dat zou salt (0.1075g=107.5mg) zijn, niet sodium
});
t('normalizeNutrients: UNKNOWN_BASIS wanneer nutrition_data_per niet bevestigd 100g is (geen gok, adversarial)', () => {
  const n = OFF.normalizeNutrients({ nutrition_data_per: 'serving', nutriments: { 'energy-kcal_100g': 100 } });
  assert.strictEqual(n.status, 'UNKNOWN_BASIS');
});
t('normalizeNutrients: correct energy_kcal voor Coca-Cola (42, niet 180 -- KERN-FIX in context)', () => {
  const n = OFF.normalizeNutrients(COCACOLA_RESPONSE.product);
  assert.strictEqual(n.energy_kcal, 42);
});
t('normalizeNutrients: null (nooit 0) voor ontbrekende fiber/sugar bij Coca-Cola (UNKNOWN != 0)', () => {
  const n = OFF.normalizeNutrients(COCACOLA_RESPONSE.product);
  assert.strictEqual(n.fiber_g, null);
  assert.strictEqual(n.sugar_g, null);
});

// -- normalizeProduct (generiek candidate-formaat, geen OFF-lekkage) --------
t('normalizeProduct: correcte naam/merk voor Nutella', () => {
  const p = OFF.normalizeProduct(NUTELLA_RESPONSE.product, '3017624010701');
  assert.strictEqual(p.name, 'Nutella');
  assert.strictEqual(p.brand, 'Ferrero');
});
t('normalizeProduct: null naam bij ontbrekende/lege product_name (adversarial, geen lege-string-aanname)', () => {
  const p = OFF.normalizeProduct({ product_name: '' }, '123');
  assert.strictEqual(p.name, null);
});
t('normalizeProduct: allergen_metadata alleen gevuld met echte tags, anders null', () => {
  const p1 = OFF.normalizeProduct(NUTELLA_RESPONSE.product, '3017624010701');
  assert.deepStrictEqual(p1.allergen_metadata, { tags: ['en:nuts'] });
  const p2 = OFF.normalizeProduct(COCACOLA_RESPONSE.product, '5449000000996');
  assert.strictEqual(p2.allergen_metadata, null);
});
t('normalizeProduct: output bevat GEEN OFF-specifieke veldnamen (geen provider-lekkage, adversarial structuurcheck)', () => {
  const p = OFF.normalizeProduct(NUTELLA_RESPONSE.product, '3017624010701');
  const keys = Object.keys(p);
  assert.strictEqual(keys.includes('nutrition_data_per'), false);
  assert.strictEqual(keys.includes('brands'), false); // canonical heet 'brand', niet 'brands'
});

// -- getSourceMetadata (provenance) -----------------------------------------
t('getSourceMetadata: correcte provenance-velden', () => {
  const meta = OFF.getSourceMetadata(NUTELLA_RESPONSE, '2026-09-05T00:00:00Z');
  assert.strictEqual(meta.source_type, 'EXTERNAL_DATABASE');
  assert.strictEqual(meta.source_name, 'OPEN_FOOD_FACTS');
  assert.strictEqual(meta.source_record_id, '3017624010701');
  assert.strictEqual(meta.source_version, '105');
  assert.strictEqual(meta.fetched_at, '2026-09-05T00:00:00Z');
});

// -- evaluateDataQuality (KERN: nooit automatisch VERIFIED) -----------------
t('evaluateDataQuality: nooit VERIFIED of HIGH puur omdat een record bestaat (KERN PO-regel 7, adversarial)', () => {
  const candidate = OFF.normalizeProduct(NUTELLA_RESPONSE.product, '3017624010701');
  const q = OFF.evaluateDataQuality(candidate, 0.7625);
  assert.notStrictEqual(q, 'VERIFIED');
  assert.notStrictEqual(q, 'HIGH');
});
t('evaluateDataQuality: MEDIUM bij alle 4 kernvelden aanwezig + hoge OFF-completeness', () => {
  const candidate = OFF.normalizeProduct(NUTELLA_RESPONSE.product, '3017624010701');
  assert.strictEqual(OFF.evaluateDataQuality(candidate, 0.7625), 'MEDIUM');
});
t('evaluateDataQuality: UNKNOWN zonder naam', () => {
  assert.strictEqual(OFF.evaluateDataQuality({ name: null }, 0.9), 'UNKNOWN');
});
t('evaluateDataQuality: UNKNOWN bij UNKNOWN_BASIS-nutrients (adversarial)', () => {
  const candidate = { name: 'Test', nutrients: { status: 'UNKNOWN_BASIS' } };
  assert.strictEqual(OFF.evaluateDataQuality(candidate, 0.9), 'LOW');
});

console.log(`OpenFoodFactsAdapter: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
