/* core/nutrition/providers/openFoodFactsAdapter.js
 *
 * Pure, deterministische Open Food Facts (OFF) provider-adapter.
 * GEEN netwerk-code hier -- uitsluitend normalisatie/validatie van een
 * reeds opgehaalde, ruwe OFF-response naar het generieke, provider-
 * agnostische candidate-formaat dat NutritionFoundation2Core/de ingest-
 * laag verwacht. De daadwerkelijke HTTP-aanroep (met verplichte
 * User-Agent, zie NUTRITION_OPEN_FOOD_FACTS_INTEGRATION_ASSESSMENT.md)
 * hoort in een server-side laag (zie sectie "Server-side boundary" in
 * het implementation report), niet in dit bestand.
 *
 * HARD RULE: EXTERNAL PROVIDER != CANONICAL TRUTH. Deze adapter maakt
 * nooit een product automatisch VERIFIED, vult nooit een ontbrekende
 * nutrient met 0, en laat nooit een OFF-specifiek veld doorlekken in
 * het canonical schema (de output is uitsluitend het generieke
 * candidate-formaat, dezelfde vorm voor elke toekomstige provider).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.OpenFoodFactsAdapter = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PROVIDER_NAME = 'OPEN_FOOD_FACTS';

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* validateResponse: OFF geeft HTTP 200 terug voor zowel gevonden als
   * niet-gevonden barcodes -- succes/falen zit uitsluitend in
   * response.status (1=gevonden, 0=niet gevonden), NIET in de
   * HTTP-status. Vangt bovendien het bevestigde randgeval af waarbij
   * status=1 maar het product-object leeg is (bv. door een te beperkte
   * fields-query). */
  function validateResponse(rawResponse) {
    if (!rawResponse || typeof rawResponse !== 'object') {
      return { valid: false, reason: 'MALFORMED_RESPONSE' };
    }
    if (rawResponse.status !== 1) {
      return { valid: false, reason: 'NOT_FOUND' };
    }
    var product = rawResponse.product;
    if (!product || typeof product !== 'object' || Object.keys(product).length === 0) {
      return { valid: false, reason: 'INCOMPLETE_PRODUCT' };
    }
    return { valid: true };
  }

  /* extractEnergyKcal: KRITIEKE, adversarieel bevestigde regel -- leest
   * UITSLUITEND het expliciet gesuffixte 'energy-kcal_100g'-veld, NOOIT
   * het kale 'energy'-veld (dat soms in kJ staat, niet kcal; bevestigd
   * via een echte, live Coca-Cola-response: energy=180 (kJ) versus
   * energy-kcal=42 (kcal) voor hetzelfde product -- een factor ~4,2
   * verschil). Geen kJ->kcal-fallback-conversie in deze sprint (zie
   * field mapping-document, sectie energy-kcal). */
  function extractEnergyKcal(nutriments) {
    if (!nutriments) return null;
    var v = nutriments['energy-kcal_100g'];
    return isNum(v) ? v : null;
  }

  /* normalizeNutrients: mapt uitsluitend de velden die betrouwbaar naar
   * canonical fields vertalen (Fase 7). Salt en sodium blijven
   * bewust APART -- geen automatische salt<->sodium-conversie (dat zou
   * een shadow calculation zijn). Sodium wordt van g (OFF) naar mg
   * (canonical) omgezet -- een expliciete, gedocumenteerde
   * eenheidstransformatie, geen chemische aanname. */
  function normalizeNutrients(rawProduct) {
    var n = (rawProduct && rawProduct.nutriments) || {};
    var basis = rawProduct && rawProduct.nutrition_data_per === '100g' ? 'PER_100G' : null;
    if (basis === null) {
      // Geen betrouwbare bevestiging van de basis -- niet gokken.
      return { status: 'UNKNOWN_BASIS' };
    }
    return {
      status: 'valid',
      basis: basis,
      energy_kcal: extractEnergyKcal(n),
      protein_g: isNum(n.proteins_100g) ? n.proteins_100g : null,
      carbohydrate_g: isNum(n.carbohydrates_100g) ? n.carbohydrates_100g : null,
      fat_g: isNum(n.fat_100g) ? n.fat_100g : null,
      fiber_g: isNum(n.fiber_100g) ? n.fiber_100g : null,
      sugar_g: isNum(n.sugars_100g) ? n.sugars_100g : null,
      saturated_fat_g: isNum(n['saturated-fat_100g']) ? n['saturated-fat_100g'] : null,
      sodium_mg: isNum(n.sodium_100g) ? Math.round(n.sodium_100g * 1000 * 10) / 10 : null
    };
  }

  /* normalizeProduct: mapt naar het generieke candidate-formaat.
   * GEEN OFF-specifieke veldnamen in de output -- dit is de grens
   * tussen provider-specifieke ruwe data en de canonical core. */
  function normalizeProduct(rawProduct, barcode) {
    if (!rawProduct) return null;
    var name = rawProduct.product_name;
    var brand = rawProduct.brands ? String(rawProduct.brands).split(',')[0].trim() : null;
    return {
      name: (typeof name === 'string' && name.trim()) ? name.trim() : null,
      brand: brand,
      barcode: barcode,
      allergen_metadata: Array.isArray(rawProduct.allergens_tags) && rawProduct.allergens_tags.length
        ? { tags: rawProduct.allergens_tags } : null,
      nutrients: normalizeNutrients(rawProduct)
    };
  }

  /* getSourceMetadata: provenance, apart van de productdata zelf. */
  function getSourceMetadata(rawResponse, retrievedAtIso) {
    var product = rawResponse && rawResponse.product;
    return {
      source_type: 'EXTERNAL_DATABASE',
      source_name: PROVIDER_NAME,
      source_record_id: (rawResponse && rawResponse.code) || null,
      source_version: (product && product.rev != null) ? String(product.rev) : null,
      fetched_at: retrievedAtIso || null
    };
  }

  /* evaluateDataQuality: GEEN automatische VERIFIED-status puur omdat
   * een OFF-record bestaat (Fase 8, PO-regel 7). Heuristiek uitsluitend
   * op basis van objectief aanwezige bronvelden -- geen willekeurige
   * score. */
  function evaluateDataQuality(candidate, offCompleteness) {
    if (!candidate || !candidate.name) return 'UNKNOWN';
    var n = candidate.nutrients;
    if (!n || n.status !== 'valid') return 'LOW';
    var coreFieldsPresent = [n.energy_kcal, n.protein_g, n.carbohydrate_g, n.fat_g].filter(isNum).length;
    if (coreFieldsPresent === 4 && isNum(offCompleteness) && offCompleteness >= 0.7) return 'MEDIUM';
    if (coreFieldsPresent === 4) return 'LOW';
    return 'UNKNOWN';
    // Nooit 'HIGH' of 'VERIFIED' -- die vereisen een expliciete,
    // menselijke review-stap die deze adapter niet zelf uitvoert.
  }

  var OpenFoodFactsAdapter = {
    PROVIDER_NAME: PROVIDER_NAME,
    validateResponse: validateResponse,
    extractEnergyKcal: extractEnergyKcal,
    normalizeNutrients: normalizeNutrients,
    normalizeProduct: normalizeProduct,
    getSourceMetadata: getSourceMetadata,
    evaluateDataQuality: evaluateDataQuality
  };

  return OpenFoodFactsAdapter;
}));
