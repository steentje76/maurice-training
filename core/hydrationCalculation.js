/* ==========================================================================
 * TrainingKompas — HYDRATION CALCULATION CORE  (NK-05)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * Formele Calculation Registry-entries (sectie 19/20/30 van de NK-05-
 * opdracht). Methode/formule geverifieerd tegen ACSM Position Stand:
 * Exercise and Fluid Replacement (Sawka et al. 2007, Med Sci Sports Exerc
 * 39(2):377-90, DOI 10.1249/mss.0b013e31802ca597) -- "Individual sweat
 * rates can be estimated by measuring body weight before and after
 * exercise." Dezelfde bron als de reeds gecertificeerde ELECTROLYTE_GROUP-
 * evidence (nutritionSupplementSourceRegistry.js: ACSM-FLUID-REPLACEMENT-2007).
 *
 * AI-BOUNDARY: de AI mag een reeds berekende uitkomst van deze module later
 * UITLEGGEN, maar NOOIT zelf herberekenen (zelfde architectuurgrens als
 * CalcCore/ai_guard.v1 in calculation.js).
 *
 * BELANGRIJKE SCOPEGRENS (sectie 25/28 van de NK-05-opdracht): dit bestand
 * levert uitsluitend de CALCULATION. Er bestaat bewust GEEN:
 * - persoonlijke hydratatiegeschiedenis/database (geen migratie uitgevoerd
 *   -- zie NK-05-eindrapport, "PERSONAL HYDRATION RECOMMENDATION:
 *   NOT_IMPLEMENTED");
 * - Decision Rule die van een zweettempo automatisch een drinkadvies
 *   ("drink X ml/u") maakt -- expliciet NOT_IMPLEMENTED, toegestaan per
 *   sectie 28 ("CALCULATION mag bestaan, maar recommendation rule blijft
 *   NOT_IMPLEMENTED. Dat is acceptabel.").
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { sweat_loss: 'sweat_loss_estimate.v1', sweat_rate: 'sweat_rate_estimate.v1' };

  // ── Calculation Registry-metadata (sectie 30) ───────────────────────────
  var CALCULATION_REGISTRY = [
    {
      calculation_id: 'sweat_loss_estimate.v1',
      domain: 'HYDRATION',
      name: 'Zweetverlies-schatting (lichaamsgewichtmethode)',
      version: 1,
      formula: 'zweetverlies_L = (pre_gewicht_kg - post_gewicht_kg) + vochtinname_L - urine_L',
      inputs: ['preWeightKg', 'postWeightKg', 'fluidIntakeL (optioneel, default 0)', 'urineL (optioneel, default 0, UNKNOWN != 0 -- zie sectie 24)'],
      outputs: ['sweatLossL'],
      units: { weight: 'kg', volume: 'L' },
      supported_sports: 'algemeen (alle sporten waarbij vóór/na-weging mogelijk is)',
      minimum_data: ['preWeightKg', 'postWeightKg'],
      evidence_level: 'A',
      sources: ['ACSM-FLUID-REPLACEMENT-2007'],
      limitations: [
        'Kleding (met name natte kleding) en gegeten voedsel tijdens de sessie zijn niet apart verrekend en kunnen de schatting vertekenen.',
        'Substraatoxidatie (verbranding van glycogeen/vet) draagt een klein, hier niet verrekend gewichtsverlies bij.',
        'Weegschaalprecisie en het tijdsverloop tussen wegen en trainen beïnvloeden de nauwkeurigheid.',
        'Dit is een schatting, geen laboratoriummeting.'
      ],
      applicability: 'Individuele schatting van zweetverlies tijdens één sessie; geen groepsgemiddelde.',
      forbidden_interpretations: ['dit is een exact dehydratiepercentage', 'dit getal is medisch-diagnostisch te gebruiken'],
      allowed_decision_use: false, // sectie 28: geen automatische drinkaanbeveling hierop bouwen (NOT_IMPLEMENTED)
      allowed_ai_use: true, // AI mag de reeds berekende uitkomst uitleggen, nooit herberekenen
      user_visible_values: true
    },
    {
      calculation_id: 'sweat_rate_estimate.v1',
      domain: 'HYDRATION',
      name: 'Zweettempo-schatting',
      version: 1,
      formula: 'zweettempo_L_per_uur = zweetverlies_L / (duur_minuten / 60)',
      inputs: ['sweatLossL (output van sweat_loss_estimate.v1)', 'durationMinutes'],
      outputs: ['sweatRateLPerHour'],
      units: { volume: 'L', rate: 'L/uur', duration: 'minuten' },
      supported_sports: 'algemeen',
      minimum_data: ['sweatLossL', 'durationMinutes (>0)'],
      evidence_level: 'A',
      sources: ['ACSM-FLUID-REPLACEMENT-2007'],
      limitations: ['Zweettempo varieert met intensiteit, temperatuur, luchtvochtigheid en acclimatisatie -- één meting is geen vaste, blijvende waarde.'],
      applicability: 'Individuele schatting voor de gemeten sessie/omstandigheden.',
      forbidden_interpretations: ['dit zweettempo geldt voor elke toekomstige sessie ongeacht omstandigheden'],
      allowed_decision_use: false,
      allowed_ai_use: true,
      user_visible_values: true
    }
  ];

  // ── Plausibiliteitsgrenzen (sectie 24) ──────────────────────────────────
  var MAX_PLAUSIBLE_WEIGHT_KG = 300;
  var MIN_PLAUSIBLE_WEIGHT_KG = 20;
  var MAX_PLAUSIBLE_SWEAT_LOSS_L = 6; // extreem hoog, maar niet fysiek onmogelijk bij zeer lange, hete inspanning
  var MAX_PLAUSIBLE_DURATION_MIN = 24 * 60;

  function isFiniteNumber(v) { return typeof v === 'number' && isFinite(v); }

  /**
   * estimateSweatLoss(input) -> pure, deterministisch. GEEN stille coercion
   * naar 0: ontbrekende/ongeldige verplichte input -> status INSUFFICIENT_INPUT.
   * fluidIntakeL/urineL: expliciet UNKNOWN (null/undefined) != 0 (sectie 24) --
   * als niet opgegeven, wordt dit apart gemarkeerd in dataQuality (LOW),
   * NIET stilzwijgend als 0 L behandeld voor de confidence-beoordeling
   * (de formule zelf gebruikt voor de berekening 0 als neutraal element,
   * maar de kwaliteitsbeoordeling weet dat dit een aanname is, geen meting).
   */
  function estimateSweatLoss(input) {
    input = input || {};
    var pre = input.preWeightKg, post = input.postWeightKg;
    var fluidGiven = input.fluidIntakeL !== undefined && input.fluidIntakeL !== null;
    var urineGiven = input.urineL !== undefined && input.urineL !== null;
    var fluid = fluidGiven ? input.fluidIntakeL : 0;
    var urine = urineGiven ? input.urineL : 0;

    if (!isFiniteNumber(pre) || !isFiniteNumber(post)) {
      return { status: 'INSUFFICIENT_INPUT', schema: VERSIONS.sweat_loss, reason: 'preWeightKg/postWeightKg ontbreken of zijn geen geldig getal' };
    }
    if (pre <= 0 || post <= 0 || pre < MIN_PLAUSIBLE_WEIGHT_KG || pre > MAX_PLAUSIBLE_WEIGHT_KG || post < MIN_PLAUSIBLE_WEIGHT_KG || post > MAX_PLAUSIBLE_WEIGHT_KG) {
      return { status: 'IMPLAUSIBLE', schema: VERSIONS.sweat_loss, reason: 'gewicht(en) buiten fysiek plausibel bereik' };
    }
    if (fluidGiven && (!isFiniteNumber(fluid) || fluid < 0)) {
      return { status: 'IMPLAUSIBLE', schema: VERSIONS.sweat_loss, reason: 'fluidIntakeL is negatief of geen geldig getal' };
    }
    if (urineGiven && (!isFiniteNumber(urine) || urine < 0)) {
      return { status: 'IMPLAUSIBLE', schema: VERSIONS.sweat_loss, reason: 'urineL is negatief of geen geldig getal' };
    }

    var sweatLossL = (pre - post) + fluid - urine;
    if (!isFiniteNumber(sweatLossL) || sweatLossL < -2 || sweatLossL > MAX_PLAUSIBLE_SWEAT_LOSS_L) {
      return { status: 'IMPLAUSIBLE', schema: VERSIONS.sweat_loss, reason: 'berekend zweetverlies valt buiten een fysiek plausibel bereik' };
    }

    // Data quality (sectie 22): HIGH alleen als beide invoer-vochtvelden
    // expliciet zijn opgegeven (geen aannames); anders MEDIUM/LOW.
    var dataQuality = (fluidGiven && urineGiven) ? 'HIGH' : (fluidGiven || urineGiven) ? 'MEDIUM' : 'LOW';
    // Confidence (sectie 23) != evidence: evidence is vast (A, de methode
    // zelf is degelijk); confidence hangt af van deze specifieke invoer.
    var confidence = dataQuality === 'HIGH' ? 'Hoog' : dataQuality === 'MEDIUM' ? 'Redelijk' : 'Laag (vocht-/urine-inname niet geregistreerd, als 0 aangenomen voor de berekening)';

    return {
      status: 'OK', schema: VERSIONS.sweat_loss,
      sweatLossL: Math.round(sweatLossL * 100) / 100,
      dataQuality: dataQuality,
      confidence: confidence,
      inputsUsed: { preWeightKg: pre, postWeightKg: post, fluidIntakeL: fluid, urineL: urine, fluidIntakeKnown: fluidGiven, urineKnown: urineGiven }
    };
  }

  /**
   * estimateSweatRate(input) -> pure, deterministisch. Neemt bij voorkeur
   * het resultaat-object van estimateSweatLoss() (of een los sweatLossL-
   * getal) + durationMinutes. Guards tegen 0/negatieve/ontbrekende duur.
   */
  function estimateSweatRate(input) {
    input = input || {};
    var sweatLossL = isFiniteNumber(input.sweatLossL) ? input.sweatLossL
      : (input.sweatLossResult && input.sweatLossResult.status === 'OK') ? input.sweatLossResult.sweatLossL : null;
    var duration = input.durationMinutes;

    if (sweatLossL === null || !isFiniteNumber(sweatLossL)) {
      return { status: 'INSUFFICIENT_INPUT', schema: VERSIONS.sweat_rate, reason: 'geen geldig sweatLossL beschikbaar (lever eerst een geslaagde estimateSweatLoss()-uitkomst)' };
    }
    if (!isFiniteNumber(duration)) {
      return { status: 'INSUFFICIENT_INPUT', schema: VERSIONS.sweat_rate, reason: 'durationMinutes ontbreekt of is geen geldig getal' };
    }
    if (duration <= 0) {
      return { status: 'IMPLAUSIBLE', schema: VERSIONS.sweat_rate, reason: 'durationMinutes moet groter dan 0 zijn (geen deling door nul/negatief)' };
    }
    if (duration > MAX_PLAUSIBLE_DURATION_MIN) {
      return { status: 'IMPLAUSIBLE', schema: VERSIONS.sweat_rate, reason: 'durationMinutes valt buiten een fysiek plausibel bereik' };
    }

    var sweatRateLPerHour = sweatLossL / (duration / 60);
    var dataQuality = input.dataQuality || (input.sweatLossResult && input.sweatLossResult.dataQuality) || 'LOW';
    var confidence = dataQuality === 'HIGH' ? 'Hoog' : dataQuality === 'MEDIUM' ? 'Redelijk' : 'Laag';

    return {
      status: 'OK', schema: VERSIONS.sweat_rate,
      sweatRateLPerHour: Math.round(sweatRateLPerHour * 100) / 100,
      dataQuality: dataQuality,
      confidence: confidence
    };
  }

  function getCalculationRegistry() { return CALCULATION_REGISTRY.slice(); }
  function getCalculation(calculationId) {
    for (var i = 0; i < CALCULATION_REGISTRY.length; i++) if (CALCULATION_REGISTRY[i].calculation_id === calculationId) return CALCULATION_REGISTRY[i];
    return null;
  }

  var HydrationCalculation = {
    VERSIONS: VERSIONS,
    CALCULATION_REGISTRY: CALCULATION_REGISTRY,
    estimateSweatLoss: estimateSweatLoss,
    estimateSweatRate: estimateSweatRate,
    getCalculationRegistry: getCalculationRegistry,
    getCalculation: getCalculation
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = HydrationCalculation; }
  if (typeof window !== 'undefined') { window.HydrationCalculation = HydrationCalculation; }
  if (typeof global !== 'undefined') { global.HydrationCalculation = HydrationCalculation; }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
