/* core/nutritionIngestService.js — NUTRITION PRODUCT INGEST SERVICE.
 *
 * Pure, deterministische ingest-logica boven een reeds genormaliseerde
 * provider-candidate (bv. van core/nutritionProviderOpenFoodFacts.js).
 * Geen netwerk-/database-code hier -- de aanroepende laag (Netlify
 * Function) voert de daadwerkelijke DB-queries uit en geeft de
 * resultaten hier binnen voor de beslissingslogica.
 *
 * HARD RULE: EXTERNAL PROVIDER != CANONICAL TRUTH. Een provider-object
 * wordt nooit direct canonical -- deze service bepaalt uitsluitend OF
 * en HOE het geingest mag worden, rekening houdend met bestaande
 * verification_state (nooit VERIFIED overschrijven) en identity-
 * conflicten (nooit stil samenvoegen bij onzekerheid).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionIngestService = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* resolveIngestDecision: bepaalt wat er met een genormaliseerde
   * provider-candidate moet gebeuren, gegeven de bestaande, lokale
   * canonical staat (indien aanwezig via een eerdere barcode-lookup).
   *
   * existingProduct: null (geen lokale match) of { id, verification_state }
   * -- afkomstig van resolveBarcode()->FOUND, buiten deze functie opgehaald.
   */
  function resolveIngestDecision(candidate, existingProduct) {
    if (!candidate || !candidate.name) {
      return { action: 'REJECT', reason: 'INCOMPLETE_PRODUCT' };
    }
    if (!existingProduct) {
      return { action: 'CREATE_NEW' };
    }
    // Er bestaat al een lokaal, canonical product voor deze barcode.
    if (existingProduct.verification_state === 'VERIFIED') {
      // Nooit overschrijven -- de provider-data wordt uitsluitend als
      // niet-canonical candidate/revision bewaard (buiten deze functie,
      // door de aanroeper, indien gewenst), nooit toegepast.
      return { action: 'KEEP_EXISTING_VERIFIED', reason: 'VERIFIED_PRECEDENCE', existingProductId: existingProduct.id };
    }
    if (existingProduct.verification_state === 'USER_PRIVATE') {
      // Geen automatische koppeling aan een prive, user-eigen product --
      // dat zou een impliciete identiteitsclaim zijn die de gebruiker
      // niet zelf heeft gemaakt.
      return { action: 'KEEP_EXISTING_USER_PRIVATE', reason: 'USER_PRIVATE_PRECEDENCE', existingProductId: existingProduct.id };
    }
    // COMMUNITY_UNVERIFIED / COMMUNITY_REVIEWED: een nieuwe provider-
    // snapshot mag een aanvullende revisie toevoegen (additief), de
    // bestaande rij blijft ongewijzigd staan (geen UPDATE-in-place).
    return { action: 'ADD_REVISION', existingProductId: existingProduct.id };
  }

  /* detectConflict: expliciete, geen-gok-conflictdetectie voor Fase 9.
   * "changed nutrients" op zich is GEEN conflict (dat is een normale
   * revisie); een conflict is uitsluitend wanneer de PRODUCTIDENTITEIT
   * onzeker is (bv. dezelfde barcode retourneert twee, duidelijk
   * verschillende productnamen van de provider tussen twee lookups). */
  function detectConflict(existingProduct, newCandidate) {
    if (!existingProduct || !existingProduct.name || !newCandidate || !newCandidate.name) {
      return { conflict: false };
    }
    var normalize = function (s) { return String(s).trim().toLowerCase(); };
    if (normalize(existingProduct.name) !== normalize(newCandidate.name)) {
      return { conflict: true, reason: 'IDENTITY_MISMATCH', existingName: existingProduct.name, newName: newCandidate.name };
    }
    return { conflict: false };
  }

  /* buildNutrientSnapshot: bevriest de exacte, op dit moment geldende
   * nutrient-waarden + provenance voor een meal-item -- garandeert
   * historische reproduceerbaarheid (Fase 7, hard gate) onafhankelijk
   * van latere wijzigingen aan nutrition_nutrient_values. */
  function buildNutrientSnapshot(nutrientValues, sourceVersion) {
    if (!nutrientValues || nutrientValues.status !== 'valid') return null;
    return {
      basis: nutrientValues.basis,
      energy_kcal: nutrientValues.energy_kcal,
      protein_g: nutrientValues.protein_g,
      carbohydrate_g: nutrientValues.carbohydrate_g,
      fat_g: nutrientValues.fat_g,
      fiber_g: nutrientValues.fiber_g,
      sugar_g: nutrientValues.sugar_g,
      saturated_fat_g: nutrientValues.saturated_fat_g,
      sodium_mg: nutrientValues.sodium_mg,
      snapshot_source_version: sourceVersion || null
    };
  }

  /* isSnapshotStillValid: puur, informatief -- controleert OF een oude
   * snapshot en de huidige, canonical nutrient-waarden nog overeenkomen.
   * Gebruikt om (buiten deze functie) eventueel een "deze waarde is
   * sindsdien bijgewerkt"-signaal te tonen, NOOIT om de snapshot zelf
   * te overschrijven. */
  function isSnapshotStillValid(snapshot, currentNutrientValues) {
    if (!snapshot || !currentNutrientValues || currentNutrientValues.status !== 'valid') return null;
    var fields = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g'];
    return fields.every(function (f) { return snapshot[f] === currentNutrientValues[f]; });
  }

  var NutritionIngestService = {
    resolveIngestDecision: resolveIngestDecision,
    detectConflict: detectConflict,
    buildNutrientSnapshot: buildNutrientSnapshot,
    isSnapshotStillValid: isSnapshotStillValid
  };

  return NutritionIngestService;
}));
