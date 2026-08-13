/* ==========================================================================
 * TrainingKompas — COACH PROGRAMMING CORE  (Sprint 6 fundering)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen browser-opslag, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: het expliciete onderscheid COACH PRESCRIPTION -> ATHLETE EXECUTION ->
 * ACTUAL DATA bruikbaar maken als pure logica, zodat UI-code niet zelf hoeft
 * te interpreteren wanneer een assignment "voltooid", "aangepast" of "gemist"
 * is. Rekent GEEN trainingsbelasting/1RM — dat blijft CalcCore/DecisionCore.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { assignment: 'assignment_status.v1' };

  var VALID_STATUSES = ['assigned', 'completed', 'modified', 'skipped'];

  // resolveAssignmentStatus: gegeven een prescription (wat gepland was) en een
  // execution-record (wat daadwerkelijk gebeurde, of null als nog niets is
  // gedaan), bepaal de status. Puur structureel — geen sportinhoudelijke
  // interpretatie van WAT er anders was, alleen OF er iets is uitgevoerd.
  function resolveAssignmentStatus(prescription, execution, now) {
    if (!prescription) return { status: null, reason: 'geen prescription meegegeven' };
    if (!execution) {
      var deadlinePassed = prescription.scheduledFor && now && new Date(now) > new Date(prescription.scheduledFor);
      return { status: deadlinePassed ? 'skipped' : 'assigned', reason: deadlinePassed ? 'deadline verstreken zonder uitvoering' : 'nog niet uitgevoerd' };
    }
    if (execution.customTrainingId && execution.customTrainingId === prescription.customTrainingId) {
      return { status: 'completed', reason: 'exact volgens prescription uitgevoerd' };
    }
    return { status: 'modified', reason: 'uitgevoerd, maar afwijkend van de prescription (ander custom_training-record)' };
  }

  function isValidStatus(status) {
    return VALID_STATUSES.indexOf(status) !== -1;
  }

  // buildProgramSummary: puur tellen/groeperen van reeds-opgehaalde assignment-
  // rijen — GEEN nieuwe berekening, uitsluitend aggregatie van bestaande statussen.
  function buildProgramSummary(assignments) {
    var counts = { assigned: 0, completed: 0, modified: 0, skipped: 0 };
    (assignments || []).forEach(function (a) {
      if (a && isValidStatus(a.status)) counts[a.status]++;
    });
    var total = counts.assigned + counts.completed + counts.modified + counts.skipped;
    return {
      version: VERSIONS.assignment,
      total: total,
      counts: counts,
      completionRate: total > 0 ? Math.round(((counts.completed + counts.modified) / total) * 1000) / 1000 : null
    };
  }

  var CoachProgrammingCore = {
    VALID_STATUSES: VALID_STATUSES,
    resolveAssignmentStatus: resolveAssignmentStatus,
    isValidStatus: isValidStatus,
    buildProgramSummary: buildProgramSummary,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CoachProgrammingCore; }
  if (global) { global.CoachProgrammingCore = CoachProgrammingCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
