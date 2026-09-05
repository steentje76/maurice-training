/* core/nutritionCrossDomainContract.js — veilig read-model voor
 * Vandaag/Inzicht/Coach (Fase 12).
 *
 * Geen enkele nieuwe berekening -- uitsluitend een gestructureerde
 * doorgifte van reeds elders berekende, canonical waarden
 * (NutritionMealService.aggregateDailyNutrition(), ongewijzigd). Geen
 * causale claims, geen AI-herberekening toegestaan door dit contract.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionCrossDomainContract = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* buildDailyNutritionContext: het enige, canonical read-model dat
   * andere domeinen mogen consumeren. Bevat uitsluitend feiten +
   * coverage, nooit een advies of oorzaak-gevolg-claim. */
  function buildDailyNutritionContext(aggregateResult, hydrationTotalMl) {
    if (!aggregateResult) return { status: 'NO_DATA' };
    return {
      status: 'OK',
      energy_kcal: aggregateResult.energy_kcal,
      protein_g: aggregateResult.protein_g,
      carbohydrate_g: aggregateResult.carbohydrate_g,
      fat_g: aggregateResult.fat_g,
      hydration_ml: isFinite(hydrationTotalMl) ? hydrationTotalMl : null,
      data_completeness: aggregateResult.coverage,
      item_count: aggregateResult.item_count
      // Bewust GEEN velden als "advies", "tekort", "te weinig" --
      // dat zou een Decision-laag-claim zijn, geen feitelijk contract.
    };
  }

  /* correctionRequest: modelleert een correctie-poging (Fase I) --
   * bepaalt uitsluitend OF de correctie is toegestaan volgens de
   * bestaande precedence-regels (hergebruikt NutritionFoundation2Core.
   * canModifyCanonicalRecord(), ongewijzigd), nooit de correctie zelf
   * uitvoert. */
  function evaluateCorrectionRequest(userId, existingRecord, canModifyFn) {
    if (!existingRecord) return { allowed: true, reason: 'NEW_RECORD' };
    var allowed = canModifyFn(userId, existingRecord);
    return {
      allowed: allowed,
      reason: allowed ? 'OWNER_NON_VERIFIED' : (existingRecord.verification_state === 'VERIFIED' ? 'VERIFIED_PROTECTED' : 'NOT_OWNER')
    };
  }

  var NutritionCrossDomainContract = {
    buildDailyNutritionContext: buildDailyNutritionContext,
    evaluateCorrectionRequest: evaluateCorrectionRequest
  };

  return NutritionCrossDomainContract;
}));
