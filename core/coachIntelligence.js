/* ==========================================================================
 * TrainingKompas — COACH INTELLIGENCE CORE  (F10.4, MS-F10-04)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen AI zelf -- dit is uitsluitend
 * het whitelist-contract dat bepaalt welke, reeds-berekende, canonieke data
 * een AI-samenvatting voor een MENSELIJKE coach mag ontvangen.
 *
 * ARCHITECTUURWET: ATHLETE DATA -> Calculation -> Context -> Decision ->
 * Evidence -> COACH INTELLIGENCE VIEW -> HUMAN COACH. Deze module voegt
 * GEEN nieuwe berekening toe -- selectie- en autorisatielaag bovenop
 * bestaande outputs (AdherenceIntelligenceCore, PlateauDetectionCore,
 * RelationshipCore). Analoog aan WomensPerformanceContextCore (F8.3).
 *
 * AI COACH != HUMAN COACH: geen relatie met netlify/functions/coach.js.
 *
 * SCOPE-ISOLATIE (herbruikt CoachAccessCore):
 *   TRAINING_CORE     -> adherence/plateau/progression.
 *   RECOVERY_HEALTH    -> readiness, uitsluitend als apart actief.
 *   WOMENS_PERFORMANCE -> nooit via andere scopes, uitsluitend eigen scope.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'coach_intelligence.v1' };

  function buildAthleteSummaryPayload(coachId, athleteId, relationships, scopeRows, canonicalOutputs, CoachAccessCoreRef) {
    var CAC = CoachAccessCoreRef || ((typeof module !== 'undefined' && module.exports) ? require('./coachAccess.js') : global.CoachAccessCore);
    var payload = { schema: VERSIONS.schema, athlete_id: athleteId, sections: {} };
    var outputs = canonicalOutputs || {};

    if (CAC.canViewTrainingCore(coachId, athleteId, relationships, scopeRows)) {
      if (outputs.adherence) payload.sections.adherence = outputs.adherence;
      if (outputs.plateau) payload.sections.plateau = outputs.plateau;
      if (outputs.progression) payload.sections.progression = outputs.progression;
    }
    if (CAC.canViewRecoveryHealth(coachId, athleteId, relationships, scopeRows)) {
      if (outputs.readiness) payload.sections.readiness = outputs.readiness;
    }
    if (CAC.canViewWomensPerformance(coachId, athleteId, relationships, scopeRows)) {
      if (outputs.womensPerformance) payload.sections.womensPerformance = outputs.womensPerformance;
    }

    return payload;
  }

  function hasAnyContent(payload) {
    return !!payload && !!payload.sections && Object.keys(payload.sections).length > 0;
  }

  var CoachIntelligenceCore = {
    VERSIONS: VERSIONS,
    buildAthleteSummaryPayload: buildAthleteSummaryPayload,
    hasAnyContent: hasAnyContent
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CoachIntelligenceCore; }
  else { global.CoachIntelligenceCore = CoachIntelligenceCore; }
})(typeof window !== 'undefined' ? window : this);
