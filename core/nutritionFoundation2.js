/* core/nutritionFoundation2.js — NUTRITION FOUNDATION 2.0.
 *
 * Pure, deterministische calculation/resolution-laag boven het nieuwe,
 * canonical food/product/meal/hydration/supplement-model
 * (nutrition_foods/nutrition_products/nutrition_product_identifiers/
 * nutrition_nutrient_values/nutrition_meals/nutrition_meal_items/
 * nutrition_hydration_entries/nutrition_supplement_*).
 *
 * AANVULLEND op, NIET ter vervanging van, de bestaande, volwassen manual-
 * logging-laag (NutritionFoundationCore/NutritionIntelligenceCore, B9-09/
 * 10/11) -- die blijft ongewijzigd de canonical bron voor nutrition_entries.
 *
 * HARDE PRINCIPES:
 * - UNKNOWN != 0: een ontbrekende nutrient-waarde geeft NOOIT een 0-total,
 *   uitsluitend een expliciete KNOWN/PARTIAL/UNKNOWN-status.
 * - Barcode is een RESOLUTION mechanism, geen primary identity.
 * - Geen medische claims, geen doseringsadvies, geen werkzaamheidsclaims.
 * - Geen AI-herberekening: dit is de enige, deterministische bron voor
 *   portion-conversie en meal/daily-aggregatie.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionFoundation2Core = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { schema: 'nutrition_foundation_2.v1' };
  var IDENTIFIER_TYPES = ['EAN_13', 'EAN_8', 'UPC_A', 'GTIN_14', 'OTHER'];
  var DATA_QUALITY_LEVELS = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'VERIFIED'];
  var VERIFICATION_STATES = ['USER_PRIVATE', 'COMMUNITY_UNVERIFIED', 'COMMUNITY_REVIEWED', 'VERIFIED'];
  var NUTRIENT_FIELDS = ['energy_kcal', 'protein_g', 'carbohydrate_g', 'fat_g', 'fiber_g', 'sugar_g', 'saturated_fat_g', 'sodium_mg'];

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function round1(v) { return Math.round(v * 10) / 10; }

  /* computeCheckDigit: puur, deterministisch GS1-mod-10-algoritme.
   * firstWeight bepaalt de weging van het eerste (meest linkse) cijfer
   * van de check-digit-loze reeks -- 1 voor standaarden met een oneven
   * totale lengte (EAN-13: 12+1), 3 voor standaarden met een even totale
   * lengte (EAN-8: 7+1, UPC-A: 11+1, GTIN-14: 13+1). Geverifieerd tegen
   * bekende, geldige referentiebarcodes vóór implementatie (zie
   * commit-boodschap / test suite): EAN-13 4006381333931, UPC-A
   * 036000291452, EAN-8 96385074, GTIN-14 00036000291452. */
  function computeCheckDigit(digits, firstWeight) {
    var weights = firstWeight === 3 ? [3, 1] : [1, 3];
    var sum = 0;
    for (var i = 0; i < digits.length; i++) sum += digits[i] * weights[i % 2];
    return (10 - (sum % 10)) % 10;
  }

  var CHECKSUM_SPECS = {
    EAN_8: { totalLength: 8, firstWeight: 3 },
    EAN_13: { totalLength: 13, firstWeight: 1 },
    UPC_A: { totalLength: 12, firstWeight: 3 },
    GTIN_14: { totalLength: 14, firstWeight: 3 }
  };

  /* validateChecksum: expliciet, geen gok. */
  function validateChecksum(digitsString, identifierType) {
    var spec = CHECKSUM_SPECS[identifierType];
    if (!spec || digitsString.length !== spec.totalLength) return false;
    var digits = digitsString.split('').map(Number);
    var checkDigit = digits[digits.length - 1];
    var body = digits.slice(0, -1);
    return computeCheckDigit(body, spec.firstWeight) === checkDigit;
  }

  /* normalizeBarcode: puur, deterministisch -- verwijdert whitespace,
   * detecteert het meest waarschijnlijke identifier_type op basis van
   * lengte, valideert vervolgens de checksum voor bekende standaarden
   * (closure-fix). Een lengte die een bekende standaard claimt maar een
   * foute checksum heeft wordt NOOIT stilzwijgend OTHER -- expliciet
   * INVALID_IDENTIFIER. OTHER blijft gereserveerd voor lengtes die geen
   * enkele bekende standaard claimen. */
  function normalizeBarcode(raw) {
    if (!raw) return null;
    var clean = String(raw).replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (!clean) return null;
    var claimedType = null;
    if (clean.length === 13) claimedType = 'EAN_13';
    else if (clean.length === 8) claimedType = 'EAN_8';
    else if (clean.length === 12) claimedType = 'UPC_A';
    else if (clean.length === 14) claimedType = 'GTIN_14';

    if (claimedType === null) {
      // Lengte claimt geen enkele bekende standaard -- dit is de enige,
      // legitieme OTHER-situatie.
      return { value: clean, identifier_type: 'OTHER' };
    }
    if (!validateChecksum(clean, claimedType)) {
      // Lengte claimt een bekende standaard, maar de checksum klopt niet.
      // NOOIT stilzwijgend als OTHER doorlaten (dat zou een ongeldige
      // barcode alsnog laten opzoeken).
      return { value: clean, identifier_type: null, status: 'INVALID_IDENTIFIER', claimedType: claimedType };
    }
    return { value: clean, identifier_type: claimedType, status: 'valid' };
  }

  /* resolveBarcode: puur functie over reeds-opgehaalde kandidaat-rijen
   * (de daadwerkelijke database-query gebeurt in de aanroepende laag).
   * Retourneert een van drie, expliciete uitkomsten -- NOOIT een lege
   * productkaart met nullen. */
  function resolveBarcode(normalizedBarcode, matchingIdentifierRows) {
    if (!normalizedBarcode) return { status: 'NOT_FOUND', reason: 'invalid_barcode' };
    if (normalizedBarcode.status === 'INVALID_IDENTIFIER') {
      // Checksum klopt niet -- GEEN externe/lokale lookup uitvoeren, geen
      // enkele match proberen op een barcode die zelf al ongeldig is.
      return { status: 'INVALID_IDENTIFIER', barcode: normalizedBarcode.value, claimedType: normalizedBarcode.claimedType };
    }
    var rows = Array.isArray(matchingIdentifierRows) ? matchingIdentifierRows : [];
    if (rows.length === 0) return { status: 'NOT_FOUND', barcode: normalizedBarcode.value };
    var distinctProducts = rows.filter(function (r, i, arr) {
      return arr.findIndex(function (x) { return x.product_id === r.product_id; }) === i;
    });
    if (distinctProducts.length > 1) {
      return { status: 'AMBIGUOUS', barcode: normalizedBarcode.value, candidateProductIds: distinctProducts.map(function (r) { return r.product_id; }) };
    }
    return { status: 'FOUND', barcode: normalizedBarcode.value, productId: distinctProducts[0].product_id };
  }

  /* canonicalGtin14: normaliseert elke ondersteunde identifier-standaard
   * naar zijn 14-cijferige GTIN-14-equivalent (GS1-conventie: kortere
   * standaarden worden links met nullen aangevuld tot 14 cijfers).
   * Voorkomt dat dezelfde fysieke barcode als twee "unieke" identifiers
   * wordt opgeslagen wanneer hij in verschillende representaties
   * binnenkomt (bv. UPC-A '036000291452' en diens GTIN-14-vorm
   * '00036000291452' zijn dezelfde fysieke barcode). */
  function canonicalGtin14(value, identifierType) {
    if (!value || !identifierType) return null;
    var padLength = { EAN_8: 6, UPC_A: 2, EAN_13: 1, GTIN_14: 0 }[identifierType];
    if (padLength === undefined) return null; // OTHER heeft geen canonical GTIN-14-vorm
    return '0'.repeat(padLength) + value;
  }

  /* portionToNutrients: deterministische conversie van een opgeslagen
   * nutrient_values-rij (PER_100G/PER_100ML/PER_SERVING) naar een
   * concrete hoeveelheid. UNKNOWN != 0: een ontbrekend brongegeven blijft
   * null in de output, wordt nooit stilzwijgend 0.
   *
   * KERN-REGEL (closure-fix): 1 piece != 1 gram. Een PER_100G-waarde mag
   * uitsluitend met 'g' worden gecombineerd. 'piece' wordt alleen naar
   * gram omgerekend wanneer een expliciete, betrouwbare pieceWeightG
   * (bv. uit een canonical serving-definitie) wordt meegegeven -- nooit
   * geraden, nooit een default aangenomen. Ontbreekt die conversie, dan
   * is de uitkomst expliciet UNKNOWN_CONVERSION, niet een gok en niet 0. */
  function portionToNutrients(nutrientRow, quantity, quantityUnit, pieceWeightG) {
    if (!nutrientRow || !isNum(quantity) || quantity <= 0) return null;
    var factor = null;
    var effectiveUnit = quantityUnit;
    var effectiveQuantity = quantity;

    if (quantityUnit === 'serving' && (nutrientRow.basis === 'PER_100G' || nutrientRow.basis === 'PER_100ML')) {
      // NUT-PORTION-01: canonical portiegrootte (serving_size_g/serving_size_ml),
      // door de gebruiker zelf ingevoerd bij het product (geen AI, geen gok, geen
      // afleiding uit de naam). Ontbreekt dit veld, dan is 'serving' voor dit
      // product expliciet niet converteerbaar -- geen stille terugval, geen 0.
      var servingField = nutrientRow.basis === 'PER_100G' ? 'serving_size_g' : 'serving_size_ml';
      var servingUnit = nutrientRow.basis === 'PER_100G' ? 'g' : 'ml';
      var servingSize = nutrientRow[servingField];
      if (!isNum(servingSize) || servingSize <= 0) {
        return { status: 'UNKNOWN_CONVERSION', basis: nutrientRow.basis, quantityUnit: quantityUnit, reason: 'missing_' + servingField };
      }
      effectiveUnit = servingUnit;
      effectiveQuantity = quantity * servingSize;
    }

    if (quantityUnit === 'piece') {
      if (nutrientRow.basis === 'PER_SERVING') {
        // Een PER_SERVING-waarde en 'piece' zijn compatibel zonder
        // gewichtsconversie (1 piece = 1 serving is hier de canonical
        // aanname van de serving-definitie zelf, geen gok over gewicht).
        factor = quantity;
        var out0 = { status: 'valid' };
        NUTRIENT_FIELDS.forEach(function (field) {
          var v0 = nutrientRow[field];
          out0[field] = isNum(v0) ? round1(v0 * factor) : null;
        });
        return out0;
      }
      if (nutrientRow.basis === 'PER_100G') {
        if (!isNum(pieceWeightG) || pieceWeightG <= 0) {
          // GEEN gok: zonder een expliciete, betrouwbare piece-gewicht-
          // conversie kan een PER_100G-waarde niet zinvol naar 'piece'
          // worden vertaald.
          return { status: 'UNKNOWN_CONVERSION', basis: nutrientRow.basis, quantityUnit: quantityUnit, reason: 'missing_piece_weight_g' };
        }
        effectiveUnit = 'g';
        effectiveQuantity = quantity * pieceWeightG;
      } else {
        return { status: 'INVALID_SERVING', basis: nutrientRow.basis, quantityUnit: quantityUnit };
      }
    }

    if (nutrientRow.basis === 'PER_100G' && effectiveUnit === 'g') factor = effectiveQuantity / 100;
    else if (nutrientRow.basis === 'PER_100ML' && effectiveUnit === 'ml') factor = effectiveQuantity / 100;
    else if (nutrientRow.basis === 'PER_SERVING' && effectiveUnit === 'serving') factor = effectiveQuantity;
    else if (factor === null) return { status: 'INVALID_SERVING', basis: nutrientRow.basis, quantityUnit: quantityUnit };

    var out = { status: 'valid' };
    NUTRIENT_FIELDS.forEach(function (field) {
      var v = nutrientRow[field];
      out[field] = isNum(v) ? round1(v * factor) : null; // UNKNOWN != 0
    });
    return out;
  }

  /* aggregateNutrients: som van meerdere portionToNutrients()-resultaten.
   * Per veld: KNOWN (alle items hadden een waarde), PARTIAL (sommige),
   * UNKNOWN (geen enkel item had een waarde) -- nooit een verzwegen 0. */
  function aggregateNutrients(items) {
    var lijst = Array.isArray(items) ? items.filter(function (i) { return i && i.status === 'valid'; }) : [];
    if (!lijst.length) {
      var emptyOut = { schema: VERSIONS.schema, status: 'UNKNOWN', item_count: 0, data_quality: {} };
      NUTRIENT_FIELDS.forEach(function (f) { emptyOut[f] = null; emptyOut.data_quality[f] = 'UNKNOWN'; });
      return emptyOut;
    }
    var totals = {}, counts = {};
    NUTRIENT_FIELDS.forEach(function (f) { totals[f] = 0; counts[f] = 0; });
    lijst.forEach(function (item) {
      NUTRIENT_FIELDS.forEach(function (f) {
        if (isNum(item[f])) { totals[f] += item[f]; counts[f]++; }
      });
    });
    var out = { schema: VERSIONS.schema, status: 'valid', item_count: lijst.length, data_quality: {} };
    NUTRIENT_FIELDS.forEach(function (f) {
      out[f] = counts[f] > 0 ? round1(totals[f]) : null;
      if (counts[f] === 0) out.data_quality[f] = 'UNKNOWN';
      else if (counts[f] === lijst.length) out.data_quality[f] = 'KNOWN';
      else out.data_quality[f] = 'PARTIAL';
    });
    return out;
  }

  /* canModifyCanonicalRecord: community-correcties mogen VERIFIED-data
   * nooit stil overschrijven (sectie 13). Alleen de oorspronkelijke
   * creator mag een bestaande rij wijzigen; een VERIFIED-rij is voor
   * niemand (behalve via een aparte, hier niet gebouwde review-flow)
   * stil te overschrijven. */
  function canModifyCanonicalRecord(userId, record) {
    if (!userId || !record) return false;
    if (record.verification_state === 'VERIFIED') return false;
    return record.created_by === userId;
  }

  /* availableQuantityUnits: capability-check voor de UI (NUT-PORTION-01, sectie
   * "CAPABILITY-AWARE UI") -- welke eenheden kan portionToNutrients() voor DIT
   * canonical product daadwerkelijk verwerken? Puur, leest alleen canonical
   * velden, rekent niets. Nooit een unit aanbieden die de engine zou weigeren. */
  function availableQuantityUnits(nutrientRow) {
    if (!nutrientRow) return [];
    if (nutrientRow.basis === 'PER_100G') {
      var units = ['g'];
      if (isNum(nutrientRow.serving_size_g) && nutrientRow.serving_size_g > 0) units.push('serving');
      if (isNum(nutrientRow.piece_weight_g) && nutrientRow.piece_weight_g > 0) units.push('piece');
      return units;
    }
    if (nutrientRow.basis === 'PER_100ML') {
      var unitsMl = ['ml'];
      if (isNum(nutrientRow.serving_size_ml) && nutrientRow.serving_size_ml > 0) unitsMl.push('serving');
      return unitsMl;
    }
    if (nutrientRow.basis === 'PER_SERVING') return ['serving', 'piece'];
    return [];
  }

  var NutritionFoundation2Core = {
    VERSIONS: VERSIONS,
    IDENTIFIER_TYPES: IDENTIFIER_TYPES,
    DATA_QUALITY_LEVELS: DATA_QUALITY_LEVELS,
    VERIFICATION_STATES: VERIFICATION_STATES,
    NUTRIENT_FIELDS: NUTRIENT_FIELDS,
    normalizeBarcode: normalizeBarcode,
    resolveBarcode: resolveBarcode,
    canonicalGtin14: canonicalGtin14,
    validateChecksum: validateChecksum,
    computeCheckDigit: computeCheckDigit,
    portionToNutrients: portionToNutrients,
    aggregateNutrients: aggregateNutrients,
    canModifyCanonicalRecord: canModifyCanonicalRecord,
    availableQuantityUnits: availableQuantityUnits
  };

  return NutritionFoundation2Core;
}));
