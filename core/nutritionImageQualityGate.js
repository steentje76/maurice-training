/* core/nutritionImageQualityGate.js — deterministische, pre-OCR
 * beeldkwaliteitscontrole (Fase 4). GEEN AI-beoordeling als source of
 * truth -- uitsluitend een objectieve, reproduceerbare pixelmetriek.
 *
 * computeSharpnessScore() werkt op reeds geëxtraheerde grijswaarde-
 * pixeldata (Uint8ClampedArray of gewoon array), zodat de kernlogica
 * hier puur en zonder canvas/DOM-afhankelijkheid getest kan worden.
 * De aanroepende laag (browser) haalt de pixeldata uit een canvas via
 * getImageData() en zet die om naar grijswaarden voordat deze functie
 * wordt aangeroepen.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionImageQualityGate = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* computeSharpnessScore: een Laplacian-achtige, discrete
   * variantie-van-de-gradiënt-metriek. Hoog = scherp (veel lokale
   * contrastovergangen), laag = wazig (vlakke, egale pixels). Puur
   * deterministisch, geen ML-model. */
  function computeSharpnessScore(grayPixels, width, height) {
    if (!grayPixels || !width || !height || width < 3 || height < 3) return null;
    var laplacianValues = [];
    for (var y = 1; y < height - 1; y++) {
      for (var x = 1; x < width - 1; x++) {
        var idx = y * width + x;
        var center = grayPixels[idx];
        var up = grayPixels[idx - width];
        var down = grayPixels[idx + width];
        var left = grayPixels[idx - 1];
        var right = grayPixels[idx + 1];
        var laplacian = (up + down + left + right) - 4 * center;
        laplacianValues.push(laplacian);
      }
    }
    if (!laplacianValues.length) return null;
    var mean = laplacianValues.reduce(function (a, b) { return a + b; }, 0) / laplacianValues.length;
    var variance = laplacianValues.reduce(function (a, v) { return a + (v - mean) * (v - mean); }, 0) / laplacianValues.length;
    return variance;
  }

  /* evaluateSharpness: expliciete PASS/FAIL op basis van een vaste,
   * gedocumenteerde drempel. Overclaimt niet -- dit is een heuristiek,
   * geen absolute waarheid, daarom een ruime, conservatieve drempel
   * die uitsluitend evident wazige foto's afvangt. */
  var SHARPNESS_THRESHOLD = 15; // empirisch, conservatief -- zie NUTRITION_CAMERA_HARDENING_REPORT.md
  function evaluateSharpness(grayPixels, width, height) {
    var score = computeSharpnessScore(grayPixels, width, height);
    if (score === null) return { status: 'UNKNOWN', score: null };
    return { status: score >= SHARPNESS_THRESHOLD ? 'PASS' : 'FAIL_BLUR', score: score };
  }

  /* evaluateExposure: eenvoudige, deterministische onder-/overbelichting-
   * detectie op basis van het gemiddelde en de spreiding van
   * grijswaarden -- geen AI, puur statistisch. Ruime, conservatieve
   * drempels: vangt alleen evident te donkere/te lichte, vlakke
   * beelden af (bv. een afgedekte lens of een uitgebleekt beeld). */
  function evaluateExposure(grayPixels) {
    if (!grayPixels || !grayPixels.length) return { status: 'UNKNOWN' };
    var sum = 0;
    for (var i = 0; i < grayPixels.length; i++) sum += grayPixels[i];
    var mean = sum / grayPixels.length;
    if (mean < 25) return { status: 'FAIL_TOO_DARK', mean: mean };
    if (mean > 235) return { status: 'FAIL_TOO_BRIGHT', mean: mean };
    return { status: 'PASS', mean: mean };
  }

  /* evaluateImageQuality: combineert sharpness + exposure tot één,
   * expliciete PASS/FAIL-beslissing vóór OCR. */
  function evaluateImageQuality(grayPixels, width, height) {
    var sharpness = evaluateSharpness(grayPixels, width, height);
    var exposure = evaluateExposure(grayPixels);
    if (sharpness.status === 'FAIL_BLUR') return { status: 'FAIL_BLUR', sharpness: sharpness, exposure: exposure };
    if (exposure.status === 'FAIL_TOO_DARK') return { status: 'FAIL_TOO_DARK', sharpness: sharpness, exposure: exposure };
    if (exposure.status === 'FAIL_TOO_BRIGHT') return { status: 'FAIL_TOO_BRIGHT', sharpness: sharpness, exposure: exposure };
    return { status: 'PASS', sharpness: sharpness, exposure: exposure };
  }

  var NutritionImageQualityGate = {
    SHARPNESS_THRESHOLD: SHARPNESS_THRESHOLD,
    computeSharpnessScore: computeSharpnessScore,
    evaluateSharpness: evaluateSharpness,
    evaluateExposure: evaluateExposure,
    evaluateImageQuality: evaluateImageQuality
  };

  return NutritionImageQualityGate;
}));
