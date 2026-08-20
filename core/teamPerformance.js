/* ==========================================================================
 * TrainingKompas — TEAM PERFORMANCE CORE  (Sprint 9 fundering)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen browser-opslag, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * HARDE REGEL (expliciet uit de sprintopdracht): "Gebruik alleen bestaande
 * Calculation Engine-output. Geen nieuwe berekeningen in UI-code." Dit bestand
 * AGGREGEERT uitsluitend reeds-door-CalcCore/DecisionCore berekende waarden
 * per atleet tot een teamniveau — het berekent zelf NOOIT een nieuwe
 * sportmetric (geen eigen 1RM/load/readiness-formule).
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { teamAggregate: 'team_performance.v1' };

  function round2(n) { return Math.round(n * 100) / 100; }

  // aggregateMetric: puur statistisch (min/max/avg/count) over een reeds-
  // berekende metric per atleet. Geen sportinhoudelijke interpretatie.
  // rows: [{ athleteId, value }]
  function aggregateMetric(rows) {
    var vals = (rows || []).filter(function (r) { return r && typeof r.value === 'number' && !isNaN(r.value); }).map(function (r) { return r.value; });
    if (!vals.length) return { count: 0, min: null, max: null, avg: null };
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    return {
      count: vals.length,
      min: round2(Math.min.apply(null, vals)),
      max: round2(Math.max.apply(null, vals)),
      avg: round2(sum / vals.length)
    };
  }

  // buildAttentionFlags: markeert atleten met een reeds-berekende readiness-
  // classificatie 'r' (rood) of een completionRate onder een expliciete
  // drempel — puur filteren van bestaande, al-berekende waarden.
  // athleteStates: [{ athleteId, readinessCls, completionRate }]
  function buildAttentionFlags(athleteStates, completionThreshold) {
    var threshold = typeof completionThreshold === 'number' ? completionThreshold : 0.6;
    var flags = [];
    (athleteStates || []).forEach(function (a) {
      if (!a || !a.athleteId) return;
      if (a.readinessCls === 'r') flags.push({ athleteId: a.athleteId, reason: 'readiness rood' });
      if (typeof a.completionRate === 'number' && a.completionRate < threshold) {
        flags.push({ athleteId: a.athleteId, reason: 'lage completion rate (' + a.completionRate + ')' });
      }
    });
    return flags;
  }

  // buildTeamSummary: combineert bovenstaande tot één rapportageobject.
  function buildTeamSummary(input) {
    var i = input || {};
    return {
      version: VERSIONS.teamAggregate,
      teamId: i.teamId != null ? String(i.teamId) : null,
      readinessDistribution: countBy((i.athleteStates || []).map(function (a) { return a && a.readinessCls; })),
      completion: aggregateMetric((i.athleteStates || []).map(function (a) { return { athleteId: a && a.athleteId, value: a && a.completionRate }; })),
      attentionFlags: buildAttentionFlags(i.athleteStates, i.completionThreshold)
    };
  }

  function countBy(values) {
    var out = {};
    (values || []).forEach(function (v) {
      if (v == null) return;
      out[v] = (out[v] || 0) + 1;
    });
    return out;
  }

  var TeamPerformanceCore = {
    aggregateMetric: aggregateMetric,
    buildAttentionFlags: buildAttentionFlags,
    buildTeamSummary: buildTeamSummary,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = TeamPerformanceCore; }
  if (global) { global.TeamPerformanceCore = TeamPerformanceCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
