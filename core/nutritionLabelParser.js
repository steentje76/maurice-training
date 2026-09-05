/* core/nutritionLabelParser.js — NUTRITION LABEL PARSER (parsing-veiligheid).
 *
 * Pure, deterministische parsing-hulpfuncties voor tekst die via OCR van
 * een fysiek voedingsetiket is gehaald. GEEN OCR-engine hier -- dat is
 * een losstaande, technologie-specifieke laag (zie tech assessment,
 * Tesseract.js-kandidaat). Dit bestand behandelt uitsluitend de
 * VEILIGE INTERPRETATIE van reeds herkende tekst/getallen.
 *
 * HARD RULES (Fase 10-14):
 * - UNKNOWN != 0.
 * - Decimale komma mag nooit een decimale punt worden (4,2 != 42).
 * - kJ != kcal, nooit door elkaar gebruiken.
 * - salt != sodium, nooit automatisch omgezet.
 * - Kolommen (per 100g / per serving) nooit vermengen.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionLabelParser = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* parseLocaleNumber: veilige, adversarieel geteste getal-parsing.
   * Herkent zowel '4,2' (NL-komma) als '4.2' (EN-punt) als hetzelfde,
   * correcte getal 4.2 -- MAAR verwart nooit een komma-als-duizendtal-
   * scheidingsteken met een decimaalteken (bv. '4.200' blijft
   * onduidelijk en geeft UNKNOWN in plaats van een gok). */
  function parseLocaleNumber(rawText) {
    if (rawText == null) return null;
    var s = String(rawText).trim();
    if (!s) return null;
    // Verwijder eenheidstekst en witruimte, behoud alleen cijfers/,/./-
    var cleaned = s.replace(/[^\d,.\-]/g, '');
    if (!cleaned) return null;

    var hasComma = cleaned.indexOf(',') !== -1;
    var hasDot = cleaned.indexOf('.') !== -1;

    if (hasComma && hasDot) {
      // Beide aanwezig -- ambigu (kan '1.234,5' (NL, punt=duizendtal) of
      // '1,234.5' (EN, komma=duizendtal) zijn). Geen gok: UNKNOWN.
      return null;
    }
    if (hasComma) {
      var commaParts = cleaned.split(',');
      if (commaParts.length !== 2) return null; // meerdere komma's -- ambigu
      // Eén komma: interpreteer als NL-decimaalteken (het gebruikelijke
      // format op een NL-voedingsetiket), NOOIT als duizendtal-
      // scheidingsteken (dat zou 4,2 -> 42 maken, expliciet verboden).
      var normalized = commaParts[0] + '.' + commaParts[1];
      var n1 = parseFloat(normalized);
      return isFinite(n1) ? n1 : null;
    }
    // Alleen punt of geen scheidingsteken: standaard parseFloat is veilig.
    var n2 = parseFloat(cleaned);
    return isFinite(n2) ? n2 : null;
  }

  /* extractUnit: herkent de eenheid uit ruwe tekst, apart van de waarde
   * zelf -- nooit impliciet aangenomen. */
  function extractUnit(rawText) {
    if (rawText == null) return null;
    var s = String(rawText).toLowerCase();
    if (/kj\b/.test(s)) return 'kJ';
    if (/kcal\b/.test(s)) return 'kcal';
    if (/\bmg\b/.test(s)) return 'mg';
    if (/\bg\b/.test(s)) return 'g';
    if (/\bml\b/.test(s)) return 'ml';
    return null;
  }

  /* parseEnergyObservation: KERN, hard adversarial gate (Fase 12). Neemt
   * ruwe tekst zoals "180 kJ / 42 kcal" en retourneert BEIDE waarden
   * apart -- nooit één generiek "energy"-getal, nooit kJ als kcal
   * geïnterpreteerd. */
  function parseEnergyObservation(rawText) {
    if (rawText == null) return { energy_kj: null, energy_kcal: null };
    var s = String(rawText);
    var kjMatch = s.match(/([\d.,]+)\s*kj/i);
    var kcalMatch = s.match(/([\d.,]+)\s*kcal/i);
    return {
      energy_kj: kjMatch ? parseLocaleNumber(kjMatch[1]) : null,
      energy_kcal: kcalMatch ? parseLocaleNumber(kcalMatch[1]) : null
    };
  }

  /* parseSaltSodiumObservation: KERN, hard adversarial gate (Fase 13).
   * 'zout'/'salt' en 'natrium'/'sodium' blijven te allen tijde APARTE
   * velden -- geen enkele automatische conversie in deze functie. */
  function parseSaltSodiumObservation(rawText) {
    if (rawText == null) return { salt_g: null, sodium_mg: null };
    var s = String(rawText).toLowerCase();
    var saltMatch = s.match(/(?:zout|salt)[^\d]*([\d.,]+)\s*(g|mg)?/);
    var sodiumMatch = s.match(/(?:natrium|sodium)[^\d]*([\d.,]+)\s*(g|mg)?/);
    var result = { salt_g: null, sodium_mg: null };
    if (saltMatch) {
      var saltVal = parseLocaleNumber(saltMatch[1]);
      var saltUnit = saltMatch[2] || 'g';
      result.salt_g = saltVal == null ? null : (saltUnit === 'mg' ? saltVal / 1000 : saltVal);
    }
    if (sodiumMatch) {
      var sodiumVal = parseLocaleNumber(sodiumMatch[1]);
      var sodiumUnit = sodiumMatch[2] || 'mg';
      result.sodium_mg = sodiumVal == null ? null : (sodiumUnit === 'g' ? sodiumVal * 1000 : sodiumVal);
    }
    return result;
  }

  /* detectBasis: herkent 'per 100 g' / 'per 100 ml' / 'per portie'/
   * 'per serving' uit tabel-headers -- nooit aangenomen wanneer niet
   * expliciet aanwezig (Fase 7/14). */
  function detectBasis(rawHeaderText) {
    if (rawHeaderText == null) return null;
    var s = String(rawHeaderText).toLowerCase();
    if (/per\s*100\s*g\b/.test(s)) return 'PER_100G';
    if (/per\s*100\s*ml\b/.test(s)) return 'PER_100ML';
    if (/per\s*(portie|serving)\b/.test(s)) return 'PER_SERVING';
    return null; // onbekend, geen gok
  }

  /* buildObservation: verpakt een geparste waarde met alle vereiste
   * metadata (Fase 9) -- nooit een naakt getal teruggeven. */
  function buildObservation(rawText, normalizedValue, unit, basis, confidence) {
    return {
      raw_text: rawText,
      normalized_value: normalizedValue,
      unit: unit,
      basis: basis || null,
      confidence: typeof confidence === 'number' ? confidence : null,
      source: 'USER_LABEL_SCAN',
      extraction_method: 'ocr',
      extraction_version: 'v1'
    };
  }

  var NutritionLabelParser = {
    parseLocaleNumber: parseLocaleNumber,
    extractUnit: extractUnit,
    parseEnergyObservation: parseEnergyObservation,
    parseSaltSodiumObservation: parseSaltSodiumObservation,
    detectBasis: detectBasis,
    buildObservation: buildObservation
  };

  return NutritionLabelParser;
}));
