/* ==========================================================================
 * TrainingKompas — SCHEDULE ADHERENCE  (scheduleAdherence.v1)
 * --------------------------------------------------------------------------
 * PROGRAM ADAPTATION V1 (v4.55.0). Maakt gemiste/verplaatste program_blocks
 * begrijpelijk en bestuurbaar, zonder het programma zelfstandig te herschrijven.
 *
 * ARCHITECTUUR: RAW DATA (program_blocks) -> CALCULATION ENGINE (dit bestand:
 * feiten als daysLate/gap-status) -> DECISION ENGINE (dit bestand: expliciete
 * opties als CONFLICT_WARNING) -> UI/gebruikerskeuze -> database-update ->
 * bestaande trainingsflow. AI is hier nergens de bron van waarheid: geen van
 * deze functies raadpleegt de AI, en geen enkele roept iets buiten haar eigen
 * argumenten aan (geen Supabase, geen DOM, geen Date.now() binnen de functies
 * zelf -- 'today' wordt altijd expliciet meegegeven door de aanroeper).
 *
 * BINDENDE PRODUCTPRINCIPES (uit de opdracht, niet-onderhandelbaar):
 * - Geen stille automatische herplanning van het hele programma.
 * - Een reschedule raakt UITSLUITEND het aangeklikte block (nooit week_nr,
 *   nooit fase_naam, nooit andere blocks).
 * - Bij een botsing: altijd waarschuwen, nooit stil overschrijven.
 * ========================================================================== */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ScheduleAdherenceCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIE = 'scheduleAdherence.v1';

  function parseISODate(d) {
    if (!d) return null;
    var t = (d instanceof Date) ? d : new Date(String(d).slice(0, 10) + 'T00:00:00Z');
    return isFinite(t.getTime()) ? t : null;
  }
  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  /* ── days_late.v1 ──────────────────────────────────────────────────────────
   * Aantal dagen dat `today` ná `plannedDate` ligt. Negatief = nog in de
   * toekomst. 0 = vandaag. null bij ontbrekende/ongeldige datum (nooit gokken). */
  function daysLate(plannedDate, today) {
    var p = parseISODate(plannedDate), t = parseISODate(today);
    if (!p || !t) return null;
    return daysBetween(p, t);
  }

  /* ── resolve_schedule_gap.v1 ───────────────────────────────────────────────
   * Bepaalt deterministisch de status van één program_block t.o.v. vandaag.
   * Volgorde van voorrang: COMPLETED/SKIPPED (afgeronde toestanden) gaan altijd
   * vóór een datumvergelijking -- een afgeronde of bewust overgeslagen training
   * is nooit alsnog "MISSED", ongeacht de datum.
   * Retourneert altijd exact één van: 'COMPLETED' | 'SKIPPED' | 'FUTURE' |
   * 'TODAY' | 'MISSED'. Geen enkele andere waarde, geen null bij geldige
   * invoer (bij ontbrekende plannedDate/today: null, nooit een gok). */
  function resolveScheduleGap(plannedDate, today, completedAt, scheduleStatus) {
    if (completedAt) return 'COMPLETED';
    if (scheduleStatus === 'skipped') return 'SKIPPED';
    var dl = daysLate(plannedDate, today);
    if (dl == null) return null;
    if (dl < 0) return 'FUTURE';
    if (dl === 0) return 'TODAY';
    return 'MISSED';
  }

  /* ── has_schedule_conflict.v1 ─────────────────────────────────────────────
   * Controleert of een ANDER, niet-afgerond en niet-overgeslagen program_block
   * al gepland staat op `newDate`. Retourneert het botsende block (of null).
   * Sluit het eigen block (excludeBlockId) uit -- een block "botst" nooit met
   * zichzelf wanneer het simpelweg op zijn eigen datum blijft staan. */
  function hasScheduleConflict(blocks, newDate, excludeBlockId) {
    var target = parseISODate(newDate);
    if (!target) return null;
    var targetStr = String(newDate).slice(0, 10);
    var match = (blocks || []).find(function (b) {
      if (!b || b.id === excludeBlockId) return false;
      if (b.completed_at || b.schedule_status === 'skipped') return false;
      if (!b.planned_date) return false;
      return String(b.planned_date).slice(0, 10) === targetStr;
    });
    return match || null;
  }

  /* ── sessions_missed.v1 ────────────────────────────────────────────────────
   * Feitelijke telling: hoeveel blocks hebben resolveScheduleGap()==='MISSED'
   * t.o.v. `today`. Puur informatief (bv. voor "je staat 3 trainingen achter"),
   * geen automatische actie. */
  function sessionsMissed(blocks, today) {
    return (blocks || []).filter(function (b) {
      return b && resolveScheduleGap(b.planned_date, today, b.completed_at, b.schedule_status) === 'MISSED';
    }).length;
  }

  /* ── days_until_next_planned.v1 ────────────────────────────────────────────
   * Aantal dagen tot de eerstvolgende, nog niet afgeronde/overgeslagen,
   * toekomstige planned_date (>vandaag). null als er geen enkele toekomstige
   * planning is -- nooit 0 of een verzonnen getal bij afwezigheid van data. */
  function daysUntilNextPlanned(blocks, today) {
    var t = parseISODate(today);
    if (!t) return null;
    var toekomstig = (blocks || [])
      .filter(function (b) { return b && b.planned_date && !b.completed_at && b.schedule_status !== 'skipped'; })
      .map(function (b) { return parseISODate(b.planned_date); })
      .filter(function (d) { return d && d.getTime() > t.getTime(); })
      .sort(function (a, b) { return a.getTime() - b.getTime(); });
    if (!toekomstig.length) return null;
    return daysBetween(t, toekomstig[0]);
  }

  /* ── resolve_reschedule_decision.v1 ────────────────────────────────────────
   * DECISION ENGINE: wanneer de gebruiker "Planning aanpassen" kiest naar
   * `newDate`, bepaalt deze functie het vervolg. Puur, deterministisch --
   * de UI toont het resultaat, schrijft nooit stil door bij een botsing.
   * Retourneert: 'CONFLICT_WARNING' (er is al een ander block op newDate --
   * toon waarschuwing, wacht op expliciete bevestiging) of 'PROCEED' (veilig
   * om de planned_date-update direct uit te voeren). */
  function resolveRescheduleDecision(blocks, newDate, excludeBlockId) {
    return hasScheduleConflict(blocks, newDate, excludeBlockId) ? 'CONFLICT_WARNING' : 'PROCEED';
  }

  /* ── days_until_event.v1 ───────────────────────────────────────────────────
   * GOAL/EVENT-DATE AWARENESS (v4.56.0). Puur informatief -- beïnvloedt GEEN
   * bestaande planning/fase/belasting-logica (zie architectuurgrens hierboven).
   * eventDate=null -> null (geen evenement ingesteld, geen verzonnen getal).
   * eventDate===today -> 0. eventDate>today -> positief (dagen te gaan).
   * eventDate<today -> negatief (evenement al geweest) -- de UI-laag bepaalt
   * zelf de nette weergave ("verlopen" i.p.v. een negatief getal tonen), deze
   * functie geeft uitsluitend het feitelijke, ondubbelzinnige getal terug. */
  function daysUntilEvent(eventDate, today) {
    var e = parseISODate(eventDate), t = parseISODate(today);
    if (!e || !t) return null;
    return daysBetween(t, e);
  }

  /* ── weeks_until_event.v1 ──────────────────────────────────────────────────
   * Afgeleid van daysUntilEvent(), naar boven afgerond zodat "8 dagen" nog
   * steeds als "1 week" wordt getoond (niet 1.14 of afgerond naar 1 met verlies
   * van de "iets meer dan een week"-nuance -- Math.ceil is hier de veiligste
   * keuze: nooit een wedstrijd te vroeg laten lijken door naar beneden af te
   * ronden). null bij null/negatieve input (verlopen evenement -> null, de UI
   * toont in dat geval "verlopen" op basis van daysUntilEvent()'s teken, niet
   * een verzonnen negatief-weken-getal). */
  function weeksUntilEvent(eventDate, today) {
    var d = daysUntilEvent(eventDate, today);
    if (d == null || d < 0) return null;
    return Math.ceil(d / 7);
  }

  return {
    versie: VERSIE,
    daysLate: daysLate,
    resolveScheduleGap: resolveScheduleGap,
    hasScheduleConflict: hasScheduleConflict,
    sessionsMissed: sessionsMissed,
    daysUntilNextPlanned: daysUntilNextPlanned,
    resolveRescheduleDecision: resolveRescheduleDecision,
    daysUntilEvent: daysUntilEvent,
    weeksUntilEvent: weeksUntilEvent
  };
});
