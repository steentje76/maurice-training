/* core/nutritionLabelIngestBridge.js — DE ONTBREKENDE SCHAKEL.
 *
 * Verbindt (1) echte OCR-observaties (van NutritionOcrRuntime, in het
 * per-veld { normalized_value, unit, confidence, source, ... }-formaat)
 * met (2) NutritionMultiSourceVerification (verwacht een plat
 * { energy_kcal, protein_g, ... }-object) en (3) NutritionIngestService
 * (Wave 3, ongewijzigd -- beslist CREATE_NEW/ADD_REVISION/
 * KEEP_EXISTING_VERIFIED/KEEP_EXISTING_USER_PRIVATE).
 *
 * GEEN parallel ingest-systeem: deze module bevat zelf geen enkele
 * database-aanroep of nieuwe beslisregel -- uitsluitend de conversie-
 * en orchestratiestap tussen drie, reeds bestaande, ongewijzigde
 * modules.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionLabelIngestBridge = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* observationsToFlatNutrients: converteert het OCR-observaties-formaat
   * (elk veld = {normalized_value, unit, ...}) naar het platte formaat
   * dat NutritionMultiSourceVerification.compareProducts() en
   * NutritionIngestService.buildNutrientSnapshot() verwachten. Geen
   * berekening -- uitsluitend structuur-conversie. UNKNOWN != 0 blijft
   * behouden: een observatie met normalized_value=null blijft null. */
  function observationsToFlatNutrients(observations) {
    if (!observations) return null;
    return {
      status: 'valid',
      basis: null, // basis wordt apart bijgehouden op het observaties-object zelf (result.basis), niet hier gedupliceerd
      energy_kcal: observations.energy_kcal ? observations.energy_kcal.normalized_value : null,
      protein_g: observations.protein_g ? observations.protein_g.normalized_value : null,
      carbohydrate_g: observations.carbohydrate_g ? observations.carbohydrate_g.normalized_value : null,
      fat_g: observations.fat_g ? observations.fat_g.normalized_value : null,
      fiber_g: observations.fiber_g ? observations.fiber_g.normalized_value : null,
      sugar_g: observations.sugar_g ? observations.sugar_g.normalized_value : null,
      saturated_fat_g: observations.saturated_fat_g ? observations.saturated_fat_g.normalized_value : null,
      sodium_mg: observations.sodium_mg ? observations.sodium_mg.normalized_value : null
    };
  }

  /* processLabelScanAgainstExisting: DE VOLLEDIGE, ECHTE ORCHESTRATIE.
   * Neemt een reeds uitgevoerde OCR-extractie (echte pixels, via
   * NutritionOcrRuntime) en een reeds bekende, bestaande productstaat
   * (lokaal canonical EN/OF OFF, of null bij een onbekend product), en
   * bepaalt de volledige uitkomst: vergelijking + ingest-beslissing.
   * Voert zelf GEEN database-IO uit -- de aanroeper (Netlify Function/
   * client) voert de daadwerkelijke persistence uit op basis van deze
   * beslissing, exact zoals Wave 3 al deed voor de OFF-ingest-flow. */
  function processLabelScanAgainstExisting(ocrExtractionResult, existingProduct, existingNutrients, deps, userConfirmedName) {
    var multiSource = deps.multiSourceVerification;
    var ingestService = deps.ingestService;

    if (!ocrExtractionResult || ocrExtractionResult.status !== 'OK') {
      return { status: 'OCR_FAILED' };
    }

    var labelNutrients = observationsToFlatNutrients(ocrExtractionResult.observations);

    // Multi-source vergelijking: alleen uitgevoerd wanneer er iets is
    // om tegen te vergelijken (lokaal canonical en/of OFF-nutrients).
    // Bij een volledig onbekend product (geen existingNutrients) is er
    // geen conflict mogelijk -- de label-observatie is dan de enige bron.
    var comparison = existingNutrients
      ? multiSource.compareProducts('EXISTING', existingNutrients, 'USER_LABEL_SCAN', labelNutrients)
      : null;
    var conflict = comparison ? multiSource.hasAnyConflict(comparison) : false;

    // Ingest-beslissing: hergebruikt EXACT dezelfde, bestaande,
    // ongewijzigde Wave 3-logica als de OFF-ingest-flow. De bron
    // (USER_LABEL_SCAN vs. OPEN_FOOD_FACTS) verandert niets aan de
    // precedence-regels -- VERIFIED blijft altijd beschermd.
    var candidateProduct = { name: existingProduct ? existingProduct.name : (userConfirmedName || null) };
    var decision = ingestService.resolveIngestDecision(candidateProduct, existingProduct);

    return {
      status: 'OK',
      comparison: comparison,
      hasConflict: conflict,
      ingestDecision: decision,
      labelNutrients: labelNutrients,
      basis: ocrExtractionResult.basis,
      snapshotCandidate: ingestService.buildNutrientSnapshot(
        Object.assign({ status: 'valid', basis: ocrExtractionResult.basis || 'PER_100G' }, labelNutrients),
        null // USER_LABEL_SCAN heeft geen source_version zoals OFF's rev-nummer
      )
    };
  }

  var NutritionLabelIngestBridge = {
    observationsToFlatNutrients: observationsToFlatNutrients,
    processLabelScanAgainstExisting: processLabelScanAgainstExisting
  };

  return NutritionLabelIngestBridge;
}));
