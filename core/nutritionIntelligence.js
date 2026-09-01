/* core/nutritionIntelligence.js — B9-11 Nutrition Intelligence.
 *
 * Pure, deterministische Calculation/Context/Decision-laag boven
 * reeds bestaande, user-entered Nutrition-data (B9-09/B9-10). Geen
 * DOM/database/network-toegang. Registreert-samenvat-contextualiseert
 * -- diagnosticeert nooit, doseert nooit.
 *
 * ARCHITECTUUR (bindend): RAW DATA -> Calculation -> Context ->
 * Decision -> (AI alleen als toegestaan output-object bestaat, hier
 * bewust NIET gebouwd, zie docs/B9_11_NUTRITION_INTELLIGENCE_
 * EXISTING_STATE_AUDIT.md) -> sporter.
 *
 * ABSOLUTE REGEL (sectie 16 van de opdracht): logging gap != nutrition
 * gap. Geen enkele functie hier concludeert een tekort uit afwezige
 * data -- uitsluitend "wel/niet geregistreerd".
 *
 * BEWUST NIET GEBOUWD: caloriedoel/macrodoel/hydratatievoorschrift,
 * "low protein"/"low hydration"-drempels, AI-integratie, causale taal.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.NutritionIntelligenceCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { context: 'nutrition_context.v1', rules: 'nutrition_rules.v1' };

  // NUTR-CALC-002 (Training-Window Logged Intake Summary): telt,
  // uitsluitend op basis van de reeds bestaande, user-entered
  // timing_context (B9-09/B9-10 -- geen automatische tijdsinterpretatie,
  // conform sectie 14), hoeveel entries er per venster bestaan voor een
  // gegeven dag. Puur tellen, geen dosering.
  function trainingWindowSummary(entries) {
    var lijst = Array.isArray(entries) ? entries : null;
    if (lijst === null) return { schema: VERSIONS.context, status: 'NOT_AVAILABLE' };
    var out = { schema: VERSIONS.context, status: 'valid', pre_training_entries: 0, during_training_entries: 0, post_training_entries: 0 };
    lijst.forEach(function (e) {
      if (!e) return;
      if (e.timing_context === 'pre_training') out.pre_training_entries++;
      else if (e.timing_context === 'during_training') out.during_training_entries++;
      else if (e.timing_context === 'post_training') out.post_training_entries++;
    });
    return out;
  }

  // Context Engine (nutrition_context.v1): puur samenvatten, geen
  // aanbevelingslogica hier (sectie 11: "Context Engine mag alleen
  // samenvatten. Geen aanbevelingslogica in Context Engine.").
  function buildNutritionContext(entries, dailyTotals) {
    var windowSummary = trainingWindowSummary(entries);
    return {
      schema: VERSIONS.context,
      logged_energy: dailyTotals ? dailyTotals.energy_kcal_logged_total : null,
      logged_protein: dailyTotals ? dailyTotals.protein_g_logged_total : null,
      logged_carbohydrate: dailyTotals ? dailyTotals.carbohydrate_g_logged_total : null,
      logged_fat: dailyTotals ? dailyTotals.fat_g_logged_total : null,
      logged_fluid: dailyTotals ? dailyTotals.fluid_ml_logged_total : null,
      data_quality: dailyTotals ? dailyTotals.data_quality : null,
      pre_training_entries: windowSummary.pre_training_entries != null ? windowSummary.pre_training_entries : null,
      during_training_entries: windowSummary.during_training_entries != null ? windowSummary.during_training_entries : null,
      post_training_entries: windowSummary.post_training_entries != null ? windowSummary.post_training_entries : null
    };
  }

  // Decision Engine -- versioneerbare regels die uitsluitend DATA-
  // AANWEZIGHEID detecteren, NOOIT een fysiologisch tekort (sectie 16/47).
  //
  // NUTR-RULE-001 "Nutrition Data Insufficient" v1: geen enkele
  // timing_context-registratie rond de training -> output is expliciet
  // "geen data", NOOIT "te weinig gegeten/gedronken".
  // NUTR-RULE-002 "Training-Linked Nutrition Context Available" v1:
  // minimaal één timing_context-registratie aanwezig -> toon de
  // bijbehorende, vaste, Evidence-Level-C-gebonden context-tekst
  // (NUTR-EV-001/002/003), nooit een dosering.
  function evaluateNutritionDecisionRules(context) {
    if (!context || context.pre_training_entries == null) {
      return { rule_id: 'NUTR-RULE-001', version: 1, outcome: 'NOT_AVAILABLE', evidence_id: null };
    }
    var totaalEntries = context.pre_training_entries + context.during_training_entries + context.post_training_entries;
    if (totaalEntries === 0) {
      return {
        rule_id: 'NUTR-RULE-001', version: 1, outcome: 'insufficient_data',
        message: 'Geen voedings- of hydratatieregistratie rond deze training gevonden.',
        evidence_id: null, confidence: null
      };
    }
    var signalen = [];
    if (context.pre_training_entries > 0) signalen.push({ rule_id: 'NUTR-RULE-002', version: 1, timing: 'pre_training', evidence_id: 'NUTR-EV-001', confidence: 'LOW' });
    if (context.during_training_entries > 0) signalen.push({ rule_id: 'NUTR-RULE-002', version: 1, timing: 'during_training', evidence_id: 'NUTR-EV-002', confidence: 'LOW' });
    if (context.post_training_entries > 0) signalen.push({ rule_id: 'NUTR-RULE-002', version: 1, timing: 'post_training', evidence_id: 'NUTR-EV-003', confidence: 'LOW' });
    return { rule_id: 'NUTR-RULE-002', version: 1, outcome: 'context_available', signals: signalen };
  }

  return {
    VERSIONS: VERSIONS,
    trainingWindowSummary: trainingWindowSummary,
    buildNutritionContext: buildNutritionContext,
    evaluateNutritionDecisionRules: evaluateNutritionDecisionRules
  };
}));
