/* core/nutritionCustomProductService.js — custom food/product lifecycle
 * + correction workflow + duplicate handling.
 *
 * Pure logica boven de bestaande, ongewijzigde Nutrition Foundation 2/
 * Ingest Service (Wave 3/4). Geen parallel model.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionCustomProductService = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VALID_BASES = ['PER_100G', 'PER_100ML', 'PER_SERVING'];

  /* validateCustomProduct: minimale, veilige validatie voor een door
   * de gebruiker aangemaakt product. source_type wordt hier ALTIJD
   * 'USER' -- nooit EXTERNAL_DATABASE/MANUFACTURER, en
   * verification_state ALTIJD 'USER_PRIVATE' bij aanmaak (nooit
   * automatisch VERIFIED). */
  function validateCustomProduct(input) {
    if (!input || typeof input.name !== 'string' || !input.name.trim()) {
      return { valid: false, reason: 'NAME_REQUIRED' };
    }
    if (input.basis && VALID_BASES.indexOf(input.basis) === -1) {
      return { valid: false, reason: 'INVALID_BASIS' };
    }
    return {
      valid: true,
      canonicalFields: {
        name: input.name.trim(),
        brand: input.brand || null,
        source_type: 'USER',
        verification_state: 'USER_PRIVATE'
      }
    };
  }

  /* detectDuplicateCandidates: puur, op reeds opgehaalde kandidaten --
   * geen enkele destructieve samenvoeging, uitsluitend een expliciete
   * classificatie van de situatie. */
  function detectDuplicateCandidates(newProductName, newBarcode, existingByBarcode, existingByName) {
    if (newBarcode && existingByBarcode && existingByBarcode.length > 0) {
      return { status: 'EXISTING_FOUND', match: existingByBarcode[0] };
    }
    if (newProductName && Array.isArray(existingByName) && existingByName.length > 0) {
      var normalize = function (s) { return String(s).trim().toLowerCase(); };
      var exact = existingByName.filter(function (p) { return normalize(p.name) === normalize(newProductName); });
      if (exact.length > 0) return { status: 'POSSIBLE_DUPLICATE', candidates: exact };
    }
    return { status: 'CREATE_NEW_ALLOWED' };
  }

  /* evaluateProductCorrection: modelleert de vijf, expliciet vereiste
   * correctie-situaties (Fase 3 A-E). Hergebruikt de bestaande
   * canModifyCanonicalRecord()-logica (Foundation 2, ongewijzigd) via
   * dependency-injectie, geen dubbele implementatie. */
  function evaluateProductCorrection(scenario, userId, existingRecord, canModifyFn) {
    if (!existingRecord) return { status: 'NEW_CANDIDATE', allowSilentApply: true };

    var canModify = canModifyFn(userId, existingRecord);
    var isVerifiedConflict = existingRecord.verification_state === 'VERIFIED';

    if (isVerifiedConflict) {
      // Scenario E: conflict met VERIFIED -- NOOIT stil overschrijven,
      // ongeacht scenario A-D.
      return { status: 'CONFLICT_VERIFIED_PROTECTED', allowSilentApply: false, requiresReview: true };
    }
    if (!canModify) {
      return { status: 'NOT_OWNER', allowSilentApply: false };
    }
    // Scenario A/B/C/D: eigenaar, niet-VERIFIED -- een aanvullende
    // revisie is toegestaan, maar NOOIT stilzwijgend (de aanroeper
    // moet dit altijd expliciet als revisie/candidate behandelen, geen
    // in-place silent overwrite van de bestaande betekenis).
    return { status: 'CORRECTION_CANDIDATE_ALLOWED', allowSilentApply: false, scenario: scenario };
  }

  var NutritionCustomProductService = {
    VALID_BASES: VALID_BASES,
    validateCustomProduct: validateCustomProduct,
    detectDuplicateCandidates: detectDuplicateCandidates,
    evaluateProductCorrection: evaluateProductCorrection
  };

  return NutritionCustomProductService;
}));
