/* ==========================================================================
 * TrainingKompas — ADAPTIVE COACHING CORE  (Sprint 7 fundering)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen browser-opslag, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: een TrainingPrescription (bv. "5×5 @ 80%") automatisch, UITLEGBAAR
 * aanpassen op basis van REEDS DOOR CalcCore/DecisionCore BEREKENDE waarden
 * (readiness-classificatie, detraining-factor, RPE-historie). Dit bestand
 * berekent zelf NIETS sportiefs — het past uitsluitend EXPLICIETE regels toe
 * op reeds-berekende input en legt exact uit waarom.
 *
 * HARDE REGEL: de AI beslist dit niet. Elke TrainingAdjustment is een puur
 * data-object met rule/reason/magnitude — vrij van elke AI-aanroep. Een coach
 * kan iedere automatische aanpassing overrulen (zie AdjustmentSource hieronder).
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { adjustment: 'training_adjustment.v1' };

  var ADJUSTMENT_SOURCES = ['automatic', 'coach_approved', 'coach_overridden'];

  // Expliciete, benoembare regels — elke regel is een pure functie van
  // (readinessCls, rpeTrend) naar een concreet, uitlegbaar besluit.
  // Nieuwe regels toevoegen = nieuwe entry, GEEN if/else-boom in UI-code.
  var ADJUSTMENT_RULES = [
    {
      id: 'HIGH_FATIGUE',
      appliesTo: function (input) { return input.readinessCls === 'r'; },
      resolve: function () { return { action: 'reduce_intensity', magnitudePct: -2.5 }; },
      explanation: 'Readiness-classificatie is rood (dagfactor laag) — intensiteit conservatief verlaagd.'
    },
    {
      id: 'MODERATE_FATIGUE',
      appliesTo: function (input) { return input.readinessCls === 'y'; },
      resolve: function () { return { action: 'hold_or_feel', magnitudePct: 0 }; },
      explanation: 'Readiness-classificatie is geel — trainen op gevoel, geen automatische verlaging.'
    },
    {
      id: 'HIGH_RPE_TREND',
      appliesTo: function (input) { return input.readinessCls === 'g' && typeof input.recentRpeAvg === 'number' && input.recentRpeAvg >= 9; },
      resolve: function () { return { action: 'reduce_intensity', magnitudePct: -5 }; },
      explanation: 'Readiness is groen, maar recente RPE-gemiddelde (≥9) wijst op opgebouwde vermoeidheid — voorzichtige verlaging ondanks groene readiness.'
    },
    {
      id: 'NORMAL',
      appliesTo: function () { return true; },  // fallback, altijd van toepassing
      resolve: function () { return { action: 'proceed_as_prescribed', magnitudePct: 0 }; },
      explanation: 'Geen van de vermoeidheidsregels van toepassing — uitvoeren zoals voorgeschreven.'
    }
  ];

  // buildAdjustment: doorloopt ADJUSTMENT_RULES in volgorde, past de EERSTE
  // van toepassing zijnde regel toe (NORMAL is altijd de laatste, vangt alles).
  // input: { readinessCls: 'g'|'y'|'r', recentRpeAvg?: number }
  function buildAdjustment(prescription, input, source) {
    if (!prescription) return null;
    var i = input || {};
    var src = ADJUSTMENT_SOURCES.indexOf(source) !== -1 ? source : 'automatic';

    var rule = null;
    for (var k = 0; k < ADJUSTMENT_RULES.length; k++) {
      if (ADJUSTMENT_RULES[k].appliesTo(i)) { rule = ADJUSTMENT_RULES[k]; break; }
    }
    var result = rule.resolve(i);

    return {
      version: VERSIONS.adjustment,
      prescription: prescription,
      rule: rule.id,
      action: result.action,
      magnitudePct: result.magnitudePct,
      reason: rule.explanation,
      source: src,
      overridable: src !== 'coach_overridden'
    };
  }

  // applyCoachOverride: een coach vervangt de automatische uitkomst door zijn
  // eigen besluit — het ORIGINELE automatische besluit blijft bewaard in
  // `automaticOriginal`, nooit stilzwijgend overschreven (audit/uitlegbaarheid).
  function applyCoachOverride(adjustment, overrideAction, overrideMagnitudePct, coachReason) {
    if (!adjustment) return null;
    return {
      version: VERSIONS.adjustment,
      prescription: adjustment.prescription,
      rule: adjustment.rule,
      action: overrideAction,
      magnitudePct: overrideMagnitudePct,
      reason: coachReason || 'Handmatig overruled door coach.',
      source: 'coach_overridden',
      overridable: false,
      automaticOriginal: {
        action: adjustment.action,
        magnitudePct: adjustment.magnitudePct,
        rule: adjustment.rule,
        reason: adjustment.reason
      }
    };
  }

  function listRuleIds() {
    return ADJUSTMENT_RULES.map(function (r) { return r.id; });
  }

  var AdaptiveCoachingCore = {
    ADJUSTMENT_SOURCES: ADJUSTMENT_SOURCES,
    buildAdjustment: buildAdjustment,
    applyCoachOverride: applyCoachOverride,
    listRuleIds: listRuleIds,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = AdaptiveCoachingCore; }
  if (global) { global.AdaptiveCoachingCore = AdaptiveCoachingCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
