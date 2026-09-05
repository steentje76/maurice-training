/* core/nutritionFoundation2.js — NUTRITION FOUNDATION 2.0.
 *
 * Pure, deterministische calculation/resolution-laag boven het nieuwe,
 * canonical food/product/meal/hydration/supplement-model
 * (nutrition_foods/nutrition_products/nutrition_product_identifiers/
 * nutrition_nutrient_values/nutrition_meals/nutrition_meal_items/
 * nutrition_hydration_entries/nutrition_supplement_*).
 *
 * AANVULLEND op, NIET ter vervanging van, de bestaande, volwassen manual-
 * logging-laag (NutritionFoundationCore/NutritionIntelligenceCore, B9-09/
 * 10/11) -- die blijft ongewijzigd de canonical bron voor nutrition_entries.
 *
 * HARDE PRINCIPES:
 * - UNKNOWN != 0: een ontbrekende nutrient-waarde geeft NOOIT een 0-total,
 *   uitsluitend een expliciete KNOWN/PARTIAL/UNKNOWN-status.
 * - Barcode is een RESOLUTION mechanism, geen primary identity.
 * - Geen medische claims, geen doseringsadvies, geen werkzaamheidsclaims.
 * - Geen AI-herberekening: dit is de enige, deterministische bron voor
 *   portion-conversie en meal/daily-aggregatie.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionFoundation2Core = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { schema: 'nutrition_foundation_2.v1' };
  var IDENTIFIER_TYPES = ['EAN_13', 'EAN_8', 'UPC_A', 'GTIN_14', 'OTHER'];
  var DATA_QUALITY_LEVELS = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'VERIFIED'];
  var VERIFICATION_STATES = ['USER_PRIVATE', 'COMMUNITY_UNVERIFIED', 'COMMUNITY_REVIEWED', 'VERIFIED'];
  var NUTRIENT_FIELDS = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g', 'fiber_g', 'sugar_g', 'saturated_fat_g', 'sodium_mg'];

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function round1(v) { return Math.round(v * 10) / 10; }

  /* normalizeBarcode: puur, deterministisch -- verwijdert whitespace,
   * detecteert het meest waarschijnlijke identifier_type op basis van
   * lengte (geen checksum-validatie in v1, expliciet OTHER als onzeker). */
  function normalizeBarcode(raw) {
    if (!raw) return null;
    var clean = String(raw).replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (!clean) return null;
    var type = 'OTHER';
    if (clean.length === 13) type = 'EAN_13';
    else if (clean.length === 8) type = 'EAN_8';
    else if (clean.length === 12) type = 'UPC_A';
    else if (clean.length === 14) type = 'GTIN_14';
    return { value: clean, identifier_type: type };
  }

  /* resolveBarcode: puur functie over reeds-opgehaalde kandidaat-rijen
   * (de daadwerkelijke database-query gebeurt in de aanroepende laag).
   * Retourneert een van drie, expliciete uitkomsten -- NOOIT een lege
   * productkaart met nullen. */
  function resolveBarcode(normalizedBarcode, matchingIdentifierRows) {
    if (!normalizedBarcode) return { status: 'NOT_FOUND', reason: 'invalid_barcode' };
    var rows = Array.isArray(matchingIdentifierRows) ? matchingIdentifierRows : [];
    if (rows.length === 0) return { status: 'NOT_FOUND', barcode: normalizedBarcode.value };
    var distinctProducts = rows.filter(function (r, i, arr) {
      return arr.findIndex(function (x) { return x.product_id === r.product_id; }) === i;
    });
    if (distinctProducts.length > 1) {
      return { status: 'AMBIGUOUS', barcode: normalizedBarcode.value, candidateProductIds: distinctProducts.map(function (r) { return r.product_id; }) };
    }
    return { status: 'FOUND', barcode: normalizedBarcode.value, productId: distinctProducts[0].product_id };
  }

  /* portionToNutrients: deterministische conversie van een opgeslagen
   * nutrient_values-rij (PER_100G/PER_100ML/PER_SERVING) naar een
   * concrete hoeveelheid. UNKNOWN != 0: een ontbrekend brongegeven blijft
   * null in de output, wordt nooit stilzwijgend 0. */
  function portionToNutrients(nutrientRow, quantity, quantityUnit) {
    if (!nutrientRow || !isNum(quantity) || quantity <= 0) return null;
    var factor = null;
    if (nutrientRow.basis === 'PER_100G' && (quantityUnit === 'g' || quantityUnit === 'piece')) factor = quantity / 100;
    else if (nutrientRow.basis === 'PER_100ML' && quantityUnit === 'ml') factor = quantity / 100;
    else if (nutrientRow.basis === 'PER_SERVING' && quantityUnit === 'serving') factor = quantity;
    else return { status: 'INVALID_SERVING', basis: nutrientRow.basis, quantityUnit: quantityUnit };

    var out = { status: 'valid' };
    NUTRIENT_FIELDS.forEach(function (field) {
      var v = nutrientRow[field];
      out[field] = isNum(v) ? round1(v * factor) : null; // UNKNOWN != 0
    });
    return out;
  }

  /* aggregateNutrients: som van meerdere portionToNutrients()-resultaten.
   * Per veld: KNOWN (alle items hadden een waarde), PARTIAL (sommige),
   * UNKNOWN (geen enkel item had een waarde) -- nooit een verzwegen 0. */
  function aggregateNutrients(items) {
    var lijst = Array.isArray(items) ? items.filter(function (i) { return i && i.status === 'valid'; }) : [];
    if (!lijst.length) {
      var emptyOut = { schema: VERSIONS.schema, status: 'UNKNOWN', item_count: 0, data_quality: {} };
      NUTRIENT_FIELDS.forEach(function (f) { emptyOut[f] = null; emptyOut.data_quality[f] = 'UNKNOWN'; });
      return emptyOut;
    }
    var totals = {}, counts = {};
    NUTRIENT_FIELDS.forEach(function (f) { totals[f] = 0; counts[f] = 0; });
    lijst.forEach(function (item) {
      NUTRIENT_FIELDS.forEach(function (f) {
        if (isNum(item[f])) { totals[f] += item[f]; counts[f]++; }
      });
    });
    var out = { schema: VERSIONS.schema, status: 'valid', item_count: lijst.length, data_quality: {} };
    NUTRIENT_FIELDS.forEach(function (f) {
      out[f] = counts[f] > 0 ? round1(totals[f]) : null;
      if (counts[f] === 0) out.data_quality[f] = 'UNKNOWN';
      else if (counts[f] === lijst.length) out.data_quality[f] = 'KNOWN';
      else out.data_quality[f] = 'PARTIAL';
    });
    return out;
  }

  /* canModifyCanonicalRecord: community-correcties mogen VERIFIED-data
   * nooit stil overschrijven (sectie 13). Alleen de oorspronkelijke
   * creator mag een bestaande rij wijzigen; een VERIFIED-rij is voor
   * niemand (behalve via een aparte, hier niet gebouwde review-flow)
   * stil te overschrijven. */
  function canModifyCanonicalRecord(userId, record) {
    if (!userId || !record) return false;
    if (record.verification_state === 'VERIFIED') return false;
    return record.created_by === userId;
  }

  var NutritionFoundation2Core = {
    VERSIONS: VERSIONS,
    IDENTIFIER_TYPES: IDENTIFIER_TYPES,
    DATA_QUALITY_LEVELS: DATA_QUALITY_LEVELS,
    VERIFICATION_STATES: VERIFICATION_STATES,
    NUTRIENT_FIELDS: NUTRIENT_FIELDS,
    normalizeBarcode: normalizeBarcode,
    resolveBarcode: resolveBarcode,
    portionToNutrients: portionToNutrients,
    aggregateNutrients: aggregateNutrients,
    canModifyCanonicalRecord: canModifyCanonicalRecord
  };

  return NutritionFoundation2Core;
}));
