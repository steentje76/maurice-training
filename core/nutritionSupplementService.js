/* core/nutritionSupplementService.js — supplement-LOGGING (geen
 * medisch advies, geen dosering-voorschrift, geen interactie-check).
 *
 * Pure logica boven de bestaande nutrition_supplement_definitions/
 * nutrition_supplement_logs (Wave 3, ongewijzigd).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionSupplementService = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* validateSupplementDefinition: minimale, veilige validatie -- naam
   * verplicht, geen enkel veld voor "aanbevolen dosering" of
   * "werkzaamheid" (dat zou een medische claim zijn, buiten scope). */
  function validateSupplementDefinition(def) {
    if (!def || typeof def.name !== 'string' || !def.name.trim()) {
      return { valid: false, reason: 'NAME_REQUIRED' };
    }
    return { valid: true };
  }

  /* validateSupplementLog: dosis/eenheid-validatie -- puur registratie,
   * geen enkele beoordeling of dit een "juiste" of "veilige" dosis is. */
  function validateSupplementLog(log) {
    if (!log || !log.supplement_id) return { valid: false, reason: 'SUPPLEMENT_ID_REQUIRED' };
    if (log.dose !== null && log.dose !== undefined) {
      if (!isNum(log.dose) || log.dose <= 0) return { valid: false, reason: 'INVALID_DOSE' };
    }
    return { valid: true };
  }

  /* canModifySupplementLog: ownership-regel, spiegelt bestaande RLS. */
  function canModifySupplementLog(userId, log) {
    return !!userId && !!log && log.user_id === userId;
  }

  var NutritionSupplementService = {
    validateSupplementDefinition: validateSupplementDefinition,
    validateSupplementLog: validateSupplementLog,
    canModifySupplementLog: canModifySupplementLog
  };

  return NutritionSupplementService;
}));
