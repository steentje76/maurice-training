/* core/nutritionMultiSourceVerification.js — MULTI-SOURCE VERIFICATION.
 *
 * Pure, deterministische vergelijkingslogica tussen maximaal drie
 * bronnen per nutrient-veld: LOCAL_CANONICAL, OPEN_FOOD_FACTS,
 * USER_LABEL_SCAN. Kiest NOOIT automatisch een winnaar (Fase 16/18) --
 * bepaalt uitsluitend de vergelijkingsstatus. Source-precedence-
 * beslissingen (welke waarde canonical wordt) horen bij
 * NutritionIngestService (Wave 3, hergebruikt), niet hier.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionMultiSourceVerification = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COMPARISON_STATES = ['MATCH', 'CLOSE_MATCH', 'CONFLICT', 'SOURCE_ONLY', 'UNKNOWN', 'INVALID'];

  // Fase 17: exacte, gedocumenteerde tolerantie -- uitsluitend voor
  // afrondingsverschillen op decimaal niveau, geen brede, willekeurige
  // marge. 0.05 dekt het verschil tussen bv. 6.3 en 6.30 afgerond op
  // een andere decimaal, niet een inhoudelijk verschil.
  var CLOSE_MATCH_TOLERANCE = 0.05;

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* compareField: vergelijkt een enkel nutrient-veld tussen twee
   * waarden (bv. LOCAL vs. LABEL). Retourneert nooit een gekozen
   * waarde, uitsluitend de vergelijkingsstatus. */
  function compareField(valueA, valueB) {
    var aKnown = isNum(valueA), bKnown = isNum(valueB);
    if (!aKnown && !bKnown) return 'UNKNOWN';
    if (aKnown && !bKnown) return 'SOURCE_ONLY';
    if (!aKnown && bKnown) return 'SOURCE_ONLY';
    var diff = Math.abs(valueA - valueB);
    if (diff === 0) return 'MATCH';
    if (diff <= CLOSE_MATCH_TOLERANCE) return 'CLOSE_MATCH';
    return 'CONFLICT';
  }

  /* compareProducts: vergelijkt alle nutrient-velden tussen twee
   * genormaliseerde nutrient-objecten (elk in het Foundation 2/Wave 3-
   * formaat: {energy_kcal, protein_g, carbohydrate_g, fat_g, ...}).
   * Retourneert een status per veld, nooit een samengevoegd product. */
  function compareProducts(sourceALabel, nutrientsA, sourceBLabel, nutrientsB) {
    var fields = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g', 'fiber_g', 'sugar_g', 'saturated_fat_g', 'sodium_mg'];
    var result = { sourceA: sourceALabel, sourceB: sourceBLabel, fields: {} };
    fields.forEach(function (f) {
      var a = nutrientsA ? nutrientsA[f] : undefined;
      var b = nutrientsB ? nutrientsB[f] : undefined;
      result.fields[f] = compareField(a, b);
    });
    return result;
  }

  /* hasAnyConflict: puur, informatief -- geen resolutie. */
  function hasAnyConflict(comparisonResult) {
    if (!comparisonResult || !comparisonResult.fields) return false;
    return Object.keys(comparisonResult.fields).some(function (f) { return comparisonResult.fields[f] === 'CONFLICT'; });
  }

  var NutritionMultiSourceVerification = {
    COMPARISON_STATES: COMPARISON_STATES,
    CLOSE_MATCH_TOLERANCE: CLOSE_MATCH_TOLERANCE,
    compareField: compareField,
    compareProducts: compareProducts,
    hasAnyConflict: hasAnyConflict
  };

  return NutritionMultiSourceVerification;
}));
