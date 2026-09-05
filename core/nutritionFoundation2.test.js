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
  const r = N2.normalizeBarcode('4006381333931');
  assert.strictEqual(r.identifier_type, 'EAN_13');
  assert.strictEqual(r.value, '4006381333931');
});
t('normalizeBarcode: whitespace en non-digits worden verwijderd', () => {
  const r = N2.normalizeBarcode(' 4006 3813 33931 ');
  assert.strictEqual(r.value, '4006381333931');
});
t('normalizeBarcode: EAN-8', () => {
  assert.strictEqual(N2.normalizeBarcode('96385074').identifier_type, 'EAN_8');
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
  const norm = N2.normalizeBarcode('4006381333931');
  assert.strictEqual(N2.resolveBarcode(norm, []).status, 'NOT_FOUND');
});
t('resolveBarcode: NOT_FOUND bij ongeldige barcode', () => {
  assert.strictEqual(N2.resolveBarcode(null, []).status, 'NOT_FOUND');
});
t('resolveBarcode: FOUND bij exact 1 distinct product', () => {
  const norm = N2.normalizeBarcode('4006381333931');
  const r = N2.resolveBarcode(norm, [{ product_id: 'p1' }]);
  assert.strictEqual(r.status, 'FOUND');
  assert.strictEqual(r.productId, 'p1');
});
t('resolveBarcode: AMBIGUOUS bij meerdere, conflicterende producten (adversarial -- nooit automatisch gokken)', () => {
  const norm = N2.normalizeBarcode('4006381333931');
  const r = N2.resolveBarcode(norm, [{ product_id: 'p1' }, { product_id: 'p2' }]);
  assert.strictEqual(r.status, 'AMBIGUOUS');
  assert.deepStrictEqual(r.candidateProductIds, ['p1', 'p2']);
});
t('resolveBarcode: FOUND (niet AMBIGUOUS) bij dubbele rijen voor hetzelfde product (dedup-check)', () => {
  const norm = N2.normalizeBarcode('4006381333931');
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

// -- PER_100G + piece: KERN-FIX (1 piece != 1 gram) -------------------------
t('portionToNutrients: PER_100G + 1 piece + GEEN piece-gewicht -> UNKNOWN_CONVERSION, nooit een gok (KERN-FIX)', () => {
  const row = { basis: 'PER_100G', energy_kcal: 200 };
  const r = N2.portionToNutrients(row, 1, 'piece');
  assert.strictEqual(r.status, 'UNKNOWN_CONVERSION');
  assert.strictEqual(r.reason, 'missing_piece_weight_g');
});
t('portionToNutrients: PER_100G + 1 piece + bekend piece-gewicht 80g -> correcte 80g-berekening', () => {
  const row = { basis: 'PER_100G', energy_kcal: 200, protein_g: 10 };
  const r = N2.portionToNutrients(row, 1, 'piece', 80);
  assert.strictEqual(r.status, 'valid');
  assert.strictEqual(r.energy_kcal, 160); // 200 * 0.8
  assert.strictEqual(r.protein_g, 8);
});
t('portionToNutrients: PER_100G + 2 pieces a 80g -> correcte 160g-berekening', () => {
  const row = { basis: 'PER_100G', energy_kcal: 200 };
  const r = N2.portionToNutrients(row, 2, 'piece', 80);
  assert.strictEqual(r.status, 'valid');
  assert.strictEqual(r.energy_kcal, 320); // 200 * 1.6
});
t('portionToNutrients: PER_100G + piece + ongeldig piece-gewicht (0/negatief) -> UNKNOWN_CONVERSION, nooit stil berekend (adversarial)', () => {
  const row = { basis: 'PER_100G', energy_kcal: 200 };
  assert.strictEqual(N2.portionToNutrients(row, 1, 'piece', 0).status, 'UNKNOWN_CONVERSION');
  assert.strictEqual(N2.portionToNutrients(row, 1, 'piece', -5).status, 'UNKNOWN_CONVERSION');
});
t('portionToNutrients: PER_SERVING + piece is compatibel zonder gewichtsconversie (1 piece = 1 serving, geen gok over gewicht)', () => {
  const row = { basis: 'PER_SERVING', energy_kcal: 150 };
  const r = N2.portionToNutrients(row, 1, 'piece');
  assert.strictEqual(r.status, 'valid');
  assert.strictEqual(r.energy_kcal, 150);
});
t('portionToNutrients: PER_100ML + piece -> INVALID_SERVING (piece heeft geen zinvolle ml-conversie, adversarial)', () => {
  const row = { basis: 'PER_100ML', energy_kcal: 40 };
  const r = N2.portionToNutrients(row, 1, 'piece');
  assert.strictEqual(r.status, 'INVALID_SERVING');
});

// -- Checksum-validatie (closure-fix, alle 4 standaarden) -------------------
t('normalizeBarcode: valide EAN-13 -> identifier_type gezet, status=valid', () => {
  const r = N2.normalizeBarcode('4006381333931');
  assert.strictEqual(r.identifier_type, 'EAN_13');
  assert.strictEqual(r.status, 'valid');
});
t('normalizeBarcode: ongeldige EAN-13-checksum -> INVALID_IDENTIFIER, nooit stilzwijgend OTHER (KERN-FIX)', () => {
  const r = N2.normalizeBarcode('4006381333932'); // laatste cijfer fout
  assert.strictEqual(r.status, 'INVALID_IDENTIFIER');
  assert.strictEqual(r.identifier_type, null);
  assert.strictEqual(r.claimedType, 'EAN_13');
});
t('normalizeBarcode: valide EAN-8', () => {
  const r = N2.normalizeBarcode('96385074');
  assert.strictEqual(r.identifier_type, 'EAN_8');
  assert.strictEqual(r.status, 'valid');
});
t('normalizeBarcode: ongeldige EAN-8-checksum -> INVALID_IDENTIFIER', () => {
  const r = N2.normalizeBarcode('96385075');
  assert.strictEqual(r.status, 'INVALID_IDENTIFIER');
});
t('normalizeBarcode: valide UPC-A', () => {
  const r = N2.normalizeBarcode('036000291452');
  assert.strictEqual(r.identifier_type, 'UPC_A');
  assert.strictEqual(r.status, 'valid');
});
t('normalizeBarcode: ongeldige UPC-A-checksum -> INVALID_IDENTIFIER', () => {
  const r = N2.normalizeBarcode('036000291453');
  assert.strictEqual(r.status, 'INVALID_IDENTIFIER');
});
t('normalizeBarcode: valide GTIN-14', () => {
  const r = N2.normalizeBarcode('00036000291452');
  assert.strictEqual(r.identifier_type, 'GTIN_14');
  assert.strictEqual(r.status, 'valid');
});
t('normalizeBarcode: ongeldige GTIN-14-checksum -> INVALID_IDENTIFIER', () => {
  const r = N2.normalizeBarcode('00036000291453');
  assert.strictEqual(r.status, 'INVALID_IDENTIFIER');
});
t('normalizeBarcode: whitespace-normalisatie blijft werken met een valide barcode', () => {
  const r = N2.normalizeBarcode(' 4006 3813 33931 ');
  assert.strictEqual(r.value, '4006381333931');
  assert.strictEqual(r.status, 'valid');
});
t('normalizeBarcode: non-digit garbage blijft null geven (adversarial, ongewijzigd)', () => {
  assert.strictEqual(N2.normalizeBarcode('abc-def'), null);
});
t('normalizeBarcode: onbekende lengte blijft legitiem OTHER (geen checksum-eis voor niet-standaard lengtes)', () => {
  const r = N2.normalizeBarcode('123');
  assert.strictEqual(r.identifier_type, 'OTHER');
});

// -- resolveBarcode: nooit een lookup bij INVALID_IDENTIFIER (KERN-FIX) -----
t('resolveBarcode: INVALID_IDENTIFIER wordt doorgegeven, GEEN lookup uitgevoerd zelfs met kandidaat-rijen aanwezig (adversarial)', () => {
  const invalidNorm = N2.normalizeBarcode('4006381333932'); // foute checksum
  const r = N2.resolveBarcode(invalidNorm, [{ product_id: 'p1' }]); // rijen zouden een match kunnen suggereren
  assert.strictEqual(r.status, 'INVALID_IDENTIFIER');
  assert.strictEqual(r.productId, undefined); // geen product teruggegeven, ondanks de aanwezige rij
});

// -- canonicalGtin14: cross-standaard duplicatiepreventie (closure-fix) ----
t('canonicalGtin14: UPC-A en zijn GTIN-14-equivalent leveren dezelfde canonical waarde (KERN, database functioneel bevestigd)', () => {
  assert.strictEqual(N2.canonicalGtin14('036000291452', 'UPC_A'), '00036000291452');
  assert.strictEqual(N2.canonicalGtin14('00036000291452', 'GTIN_14'), '00036000291452');
});
t('canonicalGtin14: EAN-13 correct gepad naar 14 cijfers', () => {
  assert.strictEqual(N2.canonicalGtin14('4006381333931', 'EAN_13'), '04006381333931');
});
t('canonicalGtin14: EAN-8 correct gepad naar 14 cijfers', () => {
  assert.strictEqual(N2.canonicalGtin14('96385074', 'EAN_8'), '00000096385074');
});
t('canonicalGtin14: null voor OTHER (geen canonical vorm, adversarial)', () => {
  assert.strictEqual(N2.canonicalGtin14('123', 'OTHER'), null);
});
t('canonicalGtin14: null bij ontbrekende input', () => {
  assert.strictEqual(N2.canonicalGtin14(null, 'EAN_13'), null);
  assert.strictEqual(N2.canonicalGtin14('123', null), null);
});

// -- Fase 5: extra UNKNOWN != 0 sabotagetests --------------------------------
t('sabotage: unknown serving size (geen serving_size_g/ml) + PER_SERVING blijft correct rekenen op de opgegeven multiplier, geen 0', () => {
  const row = { basis: 'PER_SERVING', energy_kcal: 150 }; // geen serving_size_g/ml aanwezig, hoeft ook niet voor PER_SERVING
  const r = N2.portionToNutrients(row, 1, 'serving');
  assert.strictEqual(r.energy_kcal, 150);
});
t('sabotage: unknown nutrient (protein_g ontbreekt) geeft null, nooit 0, ook bij PER_SERVING', () => {
  const row = { basis: 'PER_SERVING', energy_kcal: 150 };
  const r = N2.portionToNutrients(row, 1, 'serving');
  assert.strictEqual(r.protein_g, null);
});
t('sabotage: missing quantity (undefined) geeft null, geen 0-berekening', () => {
  const row = { basis: 'PER_100G', energy_kcal: 200 };
  assert.strictEqual(N2.portionToNutrients(row, undefined, 'g'), null);
});
t('sabotage: invalid unit combinatie geeft INVALID_SERVING, nooit een gegokte waarde', () => {
  const row = { basis: 'PER_SERVING', energy_kcal: 150 };
  const r = N2.portionToNutrients(row, 100, 'g'); // serving-basis met g-eenheid
  assert.strictEqual(r.status, 'INVALID_SERVING');
});
t('sabotage: invalid barcode (checksum fout) geeft nooit een FOUND-resultaat, ook niet toevallig', () => {
  const invalidNorm = N2.normalizeBarcode('4006381333932');
  const r = N2.resolveBarcode(invalidNorm, [{ product_id: 'p1' }, { product_id: 'p2' }]);
  assert.notStrictEqual(r.status, 'FOUND');
  assert.notStrictEqual(r.status, 'AMBIGUOUS');
  assert.strictEqual(r.status, 'INVALID_IDENTIFIER');
});
t('sabotage: provider not found (lege kandidatenlijst) geeft nooit lege productdata als geldig', () => {
  const norm = N2.normalizeBarcode('4006381333931');
  const r = N2.resolveBarcode(norm, []);
  assert.strictEqual(r.status, 'NOT_FOUND');
  assert.strictEqual(r.productId, undefined);
});

console.log(`NutritionFoundation2Core: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
