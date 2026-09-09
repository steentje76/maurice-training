/* core/myTrainingScheduling.js — SPRINT C2-B: Mijn Trainingen canonical
 * occurrence + assignment scheduling.
 *
 * PUUR · DETERMINISTISCH. Geen DOM/DB/AI. Eén canonical afgeleide-datum-
 * functie zodat Calendar/Availability/External Calendar/Preview allemaal
 * DEZELFDE effectieve datum gebruiken (sectie 6, Hard Gate) -- geen vier
 * aparte implementaties.
 */
(function (global) {
  'use strict';

  /* ── effectivePlannedDate(assignment, occurrence) ────────────────────
   * effective date = personal_date_override indien aanwezig, anders
   * occurrence.planned_date. V1 self-scheduling heeft normaal geen
   * override (creator===athlete), maar de functie ondersteunt het
   * concept al volledig voor een toekomstige coach/team-personal-override
   * (PO-beslissing 1C) zonder dat Calendar/Availability/ICS ooit hoeven
   * te wijzigen wanneer die feature later gebouwd wordt.
   */
  function effectivePlannedDate(assignment, occurrence) {
    if (assignment && assignment.personal_date_override) return assignment.personal_date_override;
    return occurrence ? occurrence.planned_date : null;
  }

  /* ── toCalendarSourceEvents(occurrences, assignmentsByOccurrenceId) ──
   * Zet occurrence+assignment-paren om naar hetzelfde provider-neutrale
   * shape dat Calendar al gebruikt voor program_blocks (sourceType/
   * sourceId/plannedDate/title/status) -- geen Calendar-database-tabel,
   * geen tweede projectie-implementatie: dit is uitsluitend een adapter
   * die de bestaande CalendarMonthViewCore-vorm oplevert.
   * Puur, muteert niets, doet geen DB-aanroep.
   */
  function toCalendarSourceEvents(occurrences, assignmentsByOccurrenceId) {
    if (!Array.isArray(occurrences)) return [];
    var out = [];
    occurrences.forEach(function (occ) {
      if (!occ || occ.status === 'cancelled') return; // gecancelde occurrence: niet tonen (analoog aan skipped bij Programs)
      var ass = (assignmentsByOccurrenceId && assignmentsByOccurrenceId[occ.id]) || [];
      ass.forEach(function (a) {
        var effDate = effectivePlannedDate(a, occ);
        out.push({
          sourceType: 'my_training',
          sourceId: occ.id,
          assignmentId: a.id,
          workoutDefinitionId: occ.workout_definition_id,
          plannedDate: effDate,
          title: (occ.definition_snapshot && occ.definition_snapshot.naam) || 'Mijn Training',
          status: a.status // planned | skipped | completed -- assignment-niveau, NOOIT occurrence-niveau (PO-beslissing 1E, sectie 35)
        });
      });
    });
    return out;
  }

  var MyTrainingSchedulingCore = {
    effectivePlannedDate: effectivePlannedDate,
    toCalendarSourceEvents: toCalendarSourceEvents
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = MyTrainingSchedulingCore; }
  else { global.MyTrainingSchedulingCore = MyTrainingSchedulingCore; }
}(typeof self !== 'undefined' ? self : this));
