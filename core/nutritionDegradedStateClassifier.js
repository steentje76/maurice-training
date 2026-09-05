/* core/nutritionDegradedStateClassifier.js — eerlijke classificatie
 * van offline/degraded gedrag per capability (Fase 5-6).
 *
 * Puur, deterministisch: geen enkele capability wordt hier als
 * "offline werkend" geclaimd zonder dat dit expliciet, per functie,
 * is vastgelegd.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionDegradedStateClassifier = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* CAPABILITY_OFFLINE_MATRIX: expliciete, eerlijke classificatie.
   * LOCAL_OK = werkt zonder netwerk zodra data al lokaal aanwezig is.
   * REQUIRES_NETWORK = vereist altijd een externe aanroep. */
  var CAPABILITY_OFFLINE_MATRIX = {
    manual_meal_logging: 'LOCAL_OK',
    known_local_product_lookup: 'LOCAL_OK',
    recent_frequent_retrieval: 'LOCAL_OK',
    hydration_logging: 'LOCAL_OK',
    supplement_logging: 'LOCAL_OK',
    open_food_facts_lookup: 'REQUIRES_NETWORK',
    remote_barcode_provider_lookup: 'REQUIRES_NETWORK',
    cloud_ocr: 'REQUIRES_NETWORK' // n.v.t. voor Trainingskompas (Tesseract.js is client-side), maar hier gedocumenteerd voor het geval dit ooit wijzigt
  };

  /* classifyCapability: geeft de eerlijke, vooraf vastgelegde status --
   * nooit een aanname voor een niet-opgenomen capability. */
  function classifyCapability(capabilityKey) {
    var known = CAPABILITY_OFFLINE_MATRIX[capabilityKey];
    if (!known) return { status: 'UNKNOWN_CAPABILITY' };
    return { status: known };
  }

  /* resolveProviderFailure: expliciete, onderscheiden foutstatussen
   * voor een externe-provider-aanroep (Fase 5) -- nooit een silent
   * fallback die de betekenis van de data verandert. */
  function resolveProviderFailure(errorContext) {
    if (!errorContext) return { status: 'UNKNOWN_ERROR' };
    if (errorContext.offline) return { status: 'OFFLINE' };
    if (errorContext.timeout) return { status: 'RETRYABLE_FAILURE' };
    if (errorContext.httpStatus === 404 || errorContext.notFound) return { status: 'NOT_FOUND' };
    if (errorContext.httpStatus >= 500) return { status: 'PROVIDER_UNAVAILABLE' };
    if (errorContext.persistenceFailed) return { status: 'PERSISTENCE_FAILED' };
    return { status: 'PROVIDER_UNAVAILABLE' };
  }

  var NutritionDegradedStateClassifier = {
    CAPABILITY_OFFLINE_MATRIX: CAPABILITY_OFFLINE_MATRIX,
    classifyCapability: classifyCapability,
    resolveProviderFailure: resolveProviderFailure
  };

  return NutritionDegradedStateClassifier;
}));
