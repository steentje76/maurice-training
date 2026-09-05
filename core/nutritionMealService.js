/* core/nutritionMealService.js — CANONICAL Nutrition service layer.
 *
 * Pure, testbare logica boven de bestaande Nutrition Foundation 2 +
 * Ingest Service (Wave 3/4, ongewijzigd). Geen directe database-IO --
 * de aanroepende laag (client/Netlify) voert de daadwerkelijke
 * queries uit; deze module bepaalt WAT er berekend/beslist wordt.
 *
 * Dekt: meal CRUD-regels, daily aggregation met expliciete
 * COMPLETE/PARTIAL/UNKNOWN-coverage per nutrient (nooit een missend
 * nutrient stil op 0 zetten), en canonical meal-type-enum.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionMealService = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  var NUTRIENT_FIELDS = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g', 'fiber_g', 'sugar_g', 'saturated_fat_g', 'sodium_mg'];

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function round1(v) { return Math.round(v * 10) / 10; }

  /* validateMealType: canonical, enumerated -- geen vrije tekst. */
  function validateMealType(mealType) {
    return MEAL_TYPES.indexOf(mealType) !== -1;
  }

  /* canModifyMealItem/canDeleteMeal: ownership-regel, spiegelt de
   * bestaande RLS (user_id = auth.uid()) -- puur voor client-side UI-
   * beslissingen, NOOIT de enige controle (RLS blijft de echte grens). */
  function canModifyMeal(userId, meal) {
    return !!userId && !!meal && meal.user_id === userId;
  }

  /* aggregateDailyNutrition: som van meal-item-snapshots voor een dag,
   * MET expliciete coverage-metadata per nutrient. Dit is de kern van
   * Fase D/L (UNKNOWN != 0, coverage transparantie).
   *
   * items: array van { nutrient_snapshot: {energy_kcal, protein_g, ...} }
   * -- elk item is al een bevroren snapshot (Wave 4-architectuur,
   * ongewijzigd), geen nieuwe berekening van de onderliggende waarden. */
  function aggregateDailyNutrition(items) {
    var validItems = Array.isArray(items) ? items.filter(function (i) { return i && i.nutrient_snapshot; }) : [];
    var totalItemCount = validItems.length;

    var out = { status: totalItemCount === 0 ? 'NO_ITEMS' : 'valid', item_count: totalItemCount, coverage: {} };
    if (totalItemCount === 0) {
      NUTRIENT_FIELDS.forEach(function (f) { out[f] = null; out.coverage[f] = 'UNKNOWN'; });
      return out;
    }

    var sums = {}, knownCounts = {};
    NUTRIENT_FIELDS.forEach(function (f) { sums[f] = 0; knownCounts[f] = 0; });

    validItems.forEach(function (item) {
      NUTRIENT_FIELDS.forEach(function (f) {
        var v = item.nutrient_snapshot[f];
        if (isNum(v)) { sums[f] += v; knownCounts[f]++; }
      });
    });

    NUTRIENT_FIELDS.forEach(function (f) {
      var known = knownCounts[f];
      if (known === 0) {
        out[f] = null; // UNKNOWN != 0: geen enkel item had dit veld
        out.coverage[f] = 'UNKNOWN';
      } else {
        out[f] = round1(sums[f]);
        out.coverage[f] = known === totalItemCount ? 'COMPLETE' : 'PARTIAL';
      }
    });
    return out;
  }

  /* coveragePercentage: puur, informatief hulpmiddel (bv. "eiwit-
   * dekking 100%, vezel-dekking 62%") -- geen aparte betekenis, enkel
   * een leesbare afgeleide van het coverage-veld hierboven. */
  function coveragePercentage(aggregateResult, field) {
    if (!aggregateResult || aggregateResult.item_count === 0) return 0;
    if (aggregateResult.coverage[field] === 'UNKNOWN') return 0;
    if (aggregateResult.coverage[field] === 'COMPLETE') return 100;
    return null; // PARTIAL: exact percentage vereist de ruwe knownCounts, niet hier herberekend om geen tweede waarheid te creeren
  }

  /* validateQuantity: adversariale invoer-validatie voor meal-items
   * (Fase O: invalid quantity, error states). */
  function validateQuantity(quantity) {
    if (!isNum(quantity)) return { valid: false, reason: 'INVALID_QUANTITY' };
    if (quantity <= 0) return { valid: false, reason: quantity === 0 ? 'ZERO_QUANTITY' : 'NEGATIVE_QUANTITY' };
    if (quantity > 100000) return { valid: false, reason: 'EXTREME_QUANTITY' };
    return { valid: true };
  }

  var NutritionMealService = {
    MEAL_TYPES: MEAL_TYPES,
    NUTRIENT_FIELDS: NUTRIENT_FIELDS,
    validateMealType: validateMealType,
    canModifyMeal: canModifyMeal,
    aggregateDailyNutrition: aggregateDailyNutrition,
    coveragePercentage: coveragePercentage,
    validateQuantity: validateQuantity
  };

  return NutritionMealService;
}));
