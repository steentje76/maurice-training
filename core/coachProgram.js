/* ==========================================================================
 * TrainingKompas — COACH PROGRAM CORE  (F10.3, MS-F10-03)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * NON-NEGOTIABLE INVARIANT: public.programs.user_id representeert de
 * eigenaar/athlete van het uitvoerbare programma en wordt NOOIT door een
 * coach gespoofd. trg_set_user_id/set_user_id_from_auth() blijven volledig
 * intact -- dit contract bestrijdt die bescherming niet, maar bouwt eromheen.
 *
 * ARCHITECTUUR (drie gescheiden verantwoordelijkheden):
 *   A. coach-authored: coach_program_templates (coach-owned)
 *   B. assignment: coach_program_assignments (coach X stelt template Y
 *      beschikbaar aan athlete Z)
 *   C. athlete-owned executable: public.programs (materialized_program_id),
 *      loopt daarna door de bestaande Training Preview -> Execution ->
 *      Logging-keten. GEEN tweede workout-execution engine.
 *
 * MATERIALISATIE gebeurt UITSLUITEND server-side (materialize_coach_assignment
 * RPC), aangeroepen terwijl de ATHLETE zelf is ingelogd -- trg_set_user_id
 * zet dan vanzelf, correct, user_id naar de athlete. Dit contract levert
 * uitsluitend client-side beslislogica -- RPC + RLS blijven de bron van
 * waarheid.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'coach_program.v1' };
  var ASSIGNMENT_STATUSES = ['assigned', 'accepted', 'modified_by_athlete'];

  function canManageTemplate(userId, template) {
    return !!template && template.coach_user_id === userId;
  }

  function canAssignTemplate(coachId, athleteId, template, relationships, scopeRows, CoachAccessCoreRef) {
    if (!template || template.coach_user_id !== coachId) return false;
    var CAC = CoachAccessCoreRef || ((typeof module !== 'undefined' && module.exports) ? require('./coachAccess.js') : global.CoachAccessCore);
    return CAC.canViewTrainingCore(coachId, athleteId, relationships, scopeRows);
  }

  function canMaterializeAssignment(userId, assignment) {
    return !!assignment && assignment.athlete_user_id === userId;
  }

  function isAlreadyMaterialized(assignment) {
    return !!assignment && assignment.materialized_program_id != null;
  }

  function nextRevision(template) {
    return (!!template && typeof template.revision === 'number') ? template.revision + 1 : 1;
  }

  var CoachProgramCore = {
    VERSIONS: VERSIONS, ASSIGNMENT_STATUSES: ASSIGNMENT_STATUSES,
    canManageTemplate: canManageTemplate,
    canAssignTemplate: canAssignTemplate,
    canMaterializeAssignment: canMaterializeAssignment,
    isAlreadyMaterialized: isAlreadyMaterialized,
    nextRevision: nextRevision
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CoachProgramCore; }
  else { global.CoachProgramCore = CoachProgramCore; }
})(typeof window !== 'undefined' ? window : this);
