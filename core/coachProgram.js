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

  /* validateTemplateContent(content, knownExerciseIds): DETERMINISTISCHE
   * validator voor coach-programma-inhoud. knownExerciseIds is een Set (of
   * array) van canonieke exercise-IDs uit de bestaande Exercise Library --
   * deze module kent zelf geen database, dus de caller levert de whitelist
   * aan. Retourneert { valid: boolean, errors: string[] }. Bij ongeldige
   * content: GEEN materialisatie (afgedwongen door de caller/RPC, dit is
   * uitsluitend het deterministische oordeel).
   *
   * SCHEMA (v1):
   * { schema_version: 1, days: [ { week_nr, day_offset, training_name,
   *   exercises: [ { exercise_id, sets, reps, rpe? } ] } ] }
   */
  function validateTemplateContent(content, knownExerciseIds) {
    var errors = [];
    var knownSet = (knownExerciseIds instanceof Array) ? knownExerciseIds : Array.from(knownExerciseIds || []);

    if (!content || typeof content !== 'object') { errors.push('content ontbreekt of is geen object'); return { valid: false, errors: errors }; }
    if (content.schema_version !== 1) errors.push('onbekende of ontbrekende schema_version (uitsluitend versie 1 ondersteund)');
    if (!Array.isArray(content.days) || content.days.length === 0) {
      errors.push('days ontbreekt of is leeg');
      return { valid: false, errors: errors };
    }

    content.days.forEach(function (day, dIdx) {
      var prefix = 'dag[' + dIdx + ']: ';
      if (!day || typeof day !== 'object') { errors.push(prefix + 'ongeldige dag-entry'); return; }
      if (!Number.isInteger(day.week_nr) || day.week_nr < 1) errors.push(prefix + 'week_nr moet een positief geheel getal zijn');
      if (!Number.isInteger(day.day_offset) || day.day_offset < 0) errors.push(prefix + 'day_offset moet een niet-negatief geheel getal zijn');
      if (typeof day.training_name !== 'string' || day.training_name.trim() === '') errors.push(prefix + 'training_name ontbreekt');
      if (!Array.isArray(day.exercises) || day.exercises.length === 0) { errors.push(prefix + 'exercises ontbreekt of is leeg'); return; }

      var gezienIds = {};
      day.exercises.forEach(function (ex, eIdx) {
        var exPrefix = prefix + 'oefening[' + eIdx + ']: ';
        if (!ex || typeof ex !== 'object') { errors.push(exPrefix + 'ongeldige exercise-entry'); return; }
        if (typeof ex.exercise_id !== 'string' || ex.exercise_id.trim() === '') {
          errors.push(exPrefix + 'exercise_id ontbreekt');
        } else if (knownSet.indexOf(ex.exercise_id) === -1) {
          errors.push(exPrefix + 'onbekend exercise_id "' + ex.exercise_id + '" (niet in de canonieke Exercise Library)');
        } else if (gezienIds[ex.exercise_id]) {
          errors.push(exPrefix + 'duplicate exercise_id "' + ex.exercise_id + '" binnen dezelfde dag');
        } else {
          gezienIds[ex.exercise_id] = true;
        }
        if (!Number.isInteger(ex.sets) || ex.sets < 1) errors.push(exPrefix + 'sets moet een positief geheel getal zijn');
        if (ex.reps !== undefined && ex.reps !== null && typeof ex.reps !== 'string' && typeof ex.reps !== 'number') {
          errors.push(exPrefix + 'reps heeft een onverwacht type');
        }
      });
    });

    return { valid: errors.length === 0, errors: errors };
  }

  var CoachProgramCore = {
    VERSIONS: VERSIONS, ASSIGNMENT_STATUSES: ASSIGNMENT_STATUSES,
    canManageTemplate: canManageTemplate,
    canAssignTemplate: canAssignTemplate,
    canMaterializeAssignment: canMaterializeAssignment,
    isAlreadyMaterialized: isAlreadyMaterialized,
    nextRevision: nextRevision,
    validateTemplateContent: validateTemplateContent
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CoachProgramCore; }
  else { global.CoachProgramCore = CoachProgramCore; }
})(typeof window !== 'undefined' ? window : this);
