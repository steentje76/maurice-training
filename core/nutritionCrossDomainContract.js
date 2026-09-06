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

  /* buildTargetContext: canonieke target/consumed/remaining voor andere
   * domeinen/AI. Waarden komen UITSLUITEND uit NutritionTargetService.
   * computeDailyProgress(); niemand (ook AI niet) rekent 'remaining'
   * opnieuw uit. source_wording is verplicht 'je ingestelde doel' voor
   * USER_DEFINED -- nooit 'optimale behoefte'. */
  function buildTargetContext(progress, target) {
    if (!progress || !progress.has_any_target) return { status: 'NO_TARGET' };
    var out = { status: 'OK', source: (target && target.source) || 'USER_DEFINED', source_wording: 'je ingestelde doel', fields: {} };
    Object.keys(progress.fields).forEach(function (f) {
      var r = progress.fields[f];
      out.fields[f] = { target: r.target, consumed: r.consumed, remaining: r.remaining, status: r.status, coverage: r.coverage };
    });
    return out;
  }

  var NutritionCrossDomainContract = {
    buildDailyNutritionContext: buildDailyNutritionContext,
    buildTargetContext: buildTargetContext,
    evaluateCorrectionRequest: evaluateCorrectionRequest
  };

  return NutritionCrossDomainContract;
}));
