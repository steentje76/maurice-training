/* core/nutritionOcrRuntime.js — ECHTE, uitvoerbare OCR-runtime.
 *
 * Wrapper rond Tesseract.js (echte, npm-geinstalleerde dependency) die
 * ruwe tekst uit een afbeelding haalt, en die tekst vervolgens door de
 * bestaande, veilige NutritionLabelParser (Wave 4-foundation,
 * ongewijzigd) laat lopen. GEEN AI-berekening -- Tesseract voert
 * uitsluitend tekstherkenning uit, de veilige parsing-regels
 * (4,2!=42, kJ!=kcal, salt!=sodium) blijven exclusief in
 * nutritionLabelParser.js.
 *
 * Talen (Fase 7): Nederlands + Engels ('nld+eng'). Tesseract.js haalt
 * taal-trainingsdata op (lokaal gecached na eerste gebruik via de
 * standaard Tesseract.js-cache-strategie) -- geen eigen, nieuw
 * netwerk-/cache-mechanisme gebouwd.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionOcrRuntime = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* runOcrOnImage: de ECHTE Tesseract.js-aanroep. `tesseractLib` wordt
   * als dependency meegegeven (niet hard `require`-t) zodat deze pure
   * module ook zonder Tesseract geladen kan worden voor unit-tests van
   * de orchestratie-logica zelf. */
  async function runOcrOnImage(imageSource, tesseractLib, lang) {
    try {
      var result = await tesseractLib.recognize(imageSource, lang || 'nld+eng');
      return { status: 'OK', text: result.data.text, confidence: result.data.confidence };
    } catch (e) {
      return { status: 'OCR_FAILED', error: e && e.message };
    }
  }

  /* extractStructuredNutrientsFromImage: de volledige, ECHTE pipeline:
   * IMAGE -> OCR TEXT -> bestaande, veilige parser -> structured
   * observations. Roept GEEN enkele eigen berekening aan -- delegeert
   * volledig aan NutritionLabelParser (ongewijzigd, Wave 4-foundation). */
  async function extractStructuredNutrientsFromImage(imageSource, deps) {
    var tesseractLib = deps.tesseractLib;
    var parser = deps.labelParser; // NutritionLabelParser, ongewijzigd
    var lang = deps.lang;

    var ocrResult = await runOcrOnImage(imageSource, tesseractLib, lang);
    if (ocrResult.status !== 'OK' || !ocrResult.text || !ocrResult.text.trim()) {
      return { status: 'OCR_FAILED', ocrResult: ocrResult };
    }

    var rawText = ocrResult.text;
    var energy = parser.parseEnergyObservation(rawText);
    var saltSodium = parser.parseSaltSodiumObservation(rawText);
    var basis = parser.detectBasis(rawText);

    // Regelgebaseerde, deterministische extractie per bekend Nederlands/
    // Engels label-trefwoord -- geen AI-inferentie, uitsluitend
    // tekstzoekpatronen op de reeds herkende OCR-tekst.
    var lines = rawText.split(/\n/);
    function findValueNear(keywords) {
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].toLowerCase();
        for (var k = 0; k < keywords.length; k++) {
          if (line.indexOf(keywords[k]) !== -1) {
            var numMatch = lines[i].match(/([\d.,]+)\s*g\b/i);
            if (numMatch) return parser.parseLocaleNumber(numMatch[1]);
          }
        }
      }
      return null; // UNKNOWN != 0: geen match betekent null, nooit 0
    }

    var observations = {
      energy_kj: parser.buildObservation(rawText, energy.energy_kj, 'kJ', basis, ocrResult.confidence),
      energy_kcal: parser.buildObservation(rawText, energy.energy_kcal, 'kcal', basis, ocrResult.confidence),
      protein_g: parser.buildObservation(rawText, findValueNear(['eiwit', 'protein']), 'g', basis, ocrResult.confidence),
      carbohydrate_g: parser.buildObservation(rawText, findValueNear(['koolhydr', 'carbohydrate']), 'g', basis, ocrResult.confidence),
      sugar_g: parser.buildObservation(rawText, findValueNear(['suiker', 'sugar']), 'g', basis, ocrResult.confidence),
      fat_g: parser.buildObservation(rawText, findValueNear(['vet', 'fat']), 'g', basis, ocrResult.confidence),
      saturated_fat_g: parser.buildObservation(rawText, findValueNear(['verzadigd', 'saturated']), 'g', basis, ocrResult.confidence),
      fiber_g: parser.buildObservation(rawText, findValueNear(['vezel', 'fiber', 'fibre']), 'g', basis, ocrResult.confidence),
      salt_g: parser.buildObservation(rawText, saltSodium.salt_g, 'g', basis, ocrResult.confidence),
      sodium_mg: parser.buildObservation(rawText, saltSodium.sodium_mg, 'mg', basis, ocrResult.confidence)
    };

    return { status: 'OK', basis: basis, observations: observations, raw_text: rawText, ocr_confidence: ocrResult.confidence };
  }

  var NutritionOcrRuntime = {
    runOcrOnImage: runOcrOnImage,
    extractStructuredNutrientsFromImage: extractStructuredNutrientsFromImage
  };

  return NutritionOcrRuntime;
}));
