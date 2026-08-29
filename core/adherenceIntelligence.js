/* ==========================================================================
 * TrainingKompas — ADHERENCE INTELLIGENCE CORE  (F7.3, MS-F7-03)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: uitsluitend de ONTBREKENDE geaggregeerde adherence-laag bouwen boven
 * de reeds bestaande, ongewijzigde ScheduleAdherenceCore.resolveScheduleGap().
 * Geen dubbele schedule-gap-logica -- deze module roept resolveScheduleGap()
 * per item aan (dependency injection) en telt uitsluitend de resultaten.
 *
 * KRITIEK SEMANTISCH ONDERSCHEID:
 *   ADHERENCE   = planned versus completed (vereist een bekend schema).
 *   CONSISTENCY = trainingsgedrag over tijd (kan bestaan ZONDER schema).
 * Een atleet zonder programma kan wel consistent zijn, maar heeft GEEN
 * geldige schedule-adherence. NO SCHEDULE != 0% ADHERENCE -- canonieke
 * status 'NOT_AVAILABLE', nooit een gefabriceerd percentage.
 *
 * NOEMER-DEFINITIE (closure-critical):
 *   IN de noemer: COMPLETED, SKIPPED, MISSED (afgehandelde geplande items).
 *   NOOIT in de noemer: FUTURE, TODAY, en items zonder geldige datum (null).
 *
 * SKIPPED-SEMANTIEK (bevestigd vanuit de bestaande runtime): SKIPPED is een
 * EXPLICIETE, gebruiker-geïnitieerde keuze, GEEN automatisch afgeleide
 * status zoals MISSED. Geen Decision Rule classificeert SKIPPED als
 * neutraal/gerechtvaardigd -- deze module behandelt SKIPPED daarom
 * conservatief als "niet voltooid", net als MISSED.
 *
 * RESCHEDULE-VEILIGHEID (architecturaal al gewaarborgd, hier uitsluitend
 * bevestigd): een verplaatst program_block is ALTIJD een UPDATE van
 * hetzelfde record, nooit een INSERT. Dubbele bestraffing is door
 * constructie onmogelijk zolang de aggregatie itereert over de HUIDIGE
 * program_blocks-rijen.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'adherence.v1' };

  function aggregate(items, today, ScheduleAdherenceCore) {
    if (!ScheduleAdherenceCore || typeof ScheduleAdherenceCore.resolveScheduleGap !== 'function') {
      return { schema: VERSIONS.schema, status: 'invalid', reason: 'schedule_adherence_core_missing' };
    }
    var lijst = Array.isArray(items) ? items : [];
    if (!lijst.length) {
      return { schema: VERSIONS.schema, status: 'NOT_AVAILABLE', reason: 'no_schedule',
        planned_eligible: 0, completed: 0, missed: 0, skipped: 0, percentage: null, window: null };
    }
    var completed = 0, missed = 0, skipped = 0, eligible = 0;
    lijst.forEach(function (it) {
      if (!it) return;
      var gap = ScheduleAdherenceCore.resolveScheduleGap(it.planned_date, today, it.completed_at, it.schedule_status);
      if (gap === 'FUTURE' || gap === 'TODAY' || gap == null) return;
      eligible++;
      if (gap === 'COMPLETED') completed++;
      else if (gap === 'SKIPPED') skipped++;
      else if (gap === 'MISSED') missed++;
    });
    if (eligible === 0) {
      return { schema: VERSIONS.schema, status: 'INSUFFICIENT_DATA', reason: 'no_eligible_items_yet',
        planned_eligible: 0, completed: 0, missed: 0, skipped: 0, percentage: null, window: null };
    }
    var percentage = Math.round((completed / eligible) * 1000) / 10;
    return {
      schema: VERSIONS.schema, status: 'valid',
      planned_eligible: eligible, completed: completed, missed: missed, skipped: skipped,
      percentage: percentage, window: { from: null, to: today }
    };
  }

  var AdherenceIntelligenceCore = {
    aggregate: aggregate,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = AdherenceIntelligenceCore; }
  else { global.AdherenceIntelligenceCore = AdherenceIntelligenceCore; }
})(typeof window !== 'undefined' ? window : this);
