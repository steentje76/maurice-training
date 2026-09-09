/* core/calendarMonthView.js — SPRINT C1: Internal Calendar Future Planning.
 *
 * PUUR · DETERMINISTISCH. Geen DOM, geen Supabase/fetch, geen AI, geen
 * mutatie. Calendar is een PROJECTIE boven canonical bronnen -- deze
 * module bouwt uitsluitend een per-dag-samenvatting voor een maandgrid,
 * het rekent GEEN trainingslogica opnieuw uit en creëert geen nieuwe
 * planningbron.
 *
 * Canonical bronnen (ongewijzigd, B0/Sprint-B-bewezen):
 * - program_blocks.planned_date -> toekomstige/canonical Program-planning
 * - sessions -> canonical, uitgevoerde historie (verleden)
 * - availability_periods -> canonical beschikbaarheidscontext
 *
 * training_instances wordt BEWUST NERGENS in deze module gebruikt --
 * geen toekomstige planning mag daaruit ontstaan (sectie 5, Hard Gate).
 *
 * De conflict-classificatie wordt NIET hier herïmplementeerd (zou een
 * tweede, parallelle conflictberekening zijn, expliciet verboden sectie
 * 8) -- de bestaande getProgramAvailabilityConflict()-functie (Sprint B,
 * index.html) wordt als dependency-injected functie meegegeven, exact
 * hetzelfde resultaat als de Availability-conflictkaarten.
 */
(function (global) {
  'use strict';

  /* ── daysInMonth(year, month1based) ─────────────────────────────────── */
  function daysInMonth(year, month1based) {
    return new Date(year, month1based, 0).getDate(); // dag 0 van volgende maand = laatste dag van deze maand
  }

  /* ── ymd(year, month1based, day) ────────────────────────────────────
   * Pure stringbouw, GEEN Date-object-toISOString/UTC-conversie -- exact
   * dezelfde discipline als td() elders in de app (geen off-by-one door
   * tijdzone/DST, sectie 28/29).
   */
  function ymd(year, month1based, day) {
    return year + '-' + String(month1based).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  /* ── buildMonthGrid(year, month1based, options) ─────────────────────────
   * options:
   *   programBlocks: array van canonical program_blocks-rijen (id,
   *     planned_date, fase_naam, completed_at, schedule_status,
   *     program_id)
   *   sessions: array van canonical, gelogde sessions-rijen (date, ...)
   *     -- puur voor "heeft deze dag historie", geen herberekening.
   *   availabilityPeriods: array van canonical availability_periods-rijen
   *   today: 'YYYY-MM-DD' (injecteerbaar voor deterministische tests,
   *     anders door de caller met td() bepaald)
   *   getConflict: de ECHTE, bestaande getProgramAvailabilityConflict-
   *     functie (dependency injection -- geen duplicaat-implementatie)
   *   getAvailability: de ECHTE, bestaande getAvailabilityForDate-functie
   *
   * Retourneert: array van dag-cellen, één per kalenderdag van de maand:
   *   { date, isPast, isToday, isFuture,
   *     plannedBlocks: [...], completedBlocks: [...], skippedBlocks: [...],
   *     hasHistory: bool,
   *     availability: null | {contextType, trainingAvailability},
   *     conflictLevel: 'none' | 'context' | 'conflict' (hoogste van alle
   *       geplande blocks die dag, of 'none' als geen enkel block bestaat) }
   *
   * GEEN mutatie van enige input. GEEN nieuwe planningbron -- uitsluitend
   * een read-only samenvatting van reeds bestaande canonical rijen.
   */
  function buildMonthGrid(year, month1based, options) {
    options = options || {};
    var programBlocks = Array.isArray(options.programBlocks) ? options.programBlocks : [];
    var sessions = Array.isArray(options.sessions) ? options.sessions : [];
    var availabilityPeriods = Array.isArray(options.availabilityPeriods) ? options.availabilityPeriods : [];
    var today = options.today || null;
    var getConflict = typeof options.getConflict === 'function' ? options.getConflict : null;
    var getAvailability = typeof options.getAvailability === 'function' ? options.getAvailability : null;

    var n = daysInMonth(year, month1based);
    var cellen = [];
    for (var d = 1; d <= n; d++) {
      var date = ymd(year, month1based, d);
      var blocksVandaag = programBlocks.filter(function (b) { return b && b.planned_date === date; });
      var planned = blocksVandaag.filter(function (b) { return !b.completed_at && b.schedule_status !== 'skipped'; });
      var completed = blocksVandaag.filter(function (b) { return !!b.completed_at; });
      var skipped = blocksVandaag.filter(function (b) { return !b.completed_at && b.schedule_status === 'skipped'; });
      var heeftHistorie = sessions.some(function (s) { return s && s.date === date; });

      var avail = getAvailability ? getAvailability(date, availabilityPeriods) : null;
      var avContext = avail ? { contextType: avail.contextType, trainingAvailability: avail.trainingAvailability } : null;

      var hoogsteConflict = 'none';
      if (getConflict) {
        planned.forEach(function (b) {
          var c = getConflict(b, availabilityPeriods);
          if (c && c.conflictLevel === 'conflict') hoogsteConflict = 'conflict';
          else if (c && c.conflictLevel === 'context' && hoogsteConflict !== 'conflict') hoogsteConflict = 'context';
        });
      }

      cellen.push({
        date: date,
        isPast: today ? date < today : false,
        isToday: today ? date === today : false,
        isFuture: today ? date > today : false,
        plannedBlocks: planned,
        completedBlocks: completed,
        skippedBlocks: skipped,
        hasHistory: heeftHistorie,
        availability: avContext,
        conflictLevel: hoogsteConflict
      });
    }
    return cellen;
  }

  /* ── expandAvailabilityForMonth(periods, year, month1based) ────────────
   * Puur, read-only "date-range expanderen voor rendering" (sectie 33) --
   * creëert GEEN nieuwe canonical records, retourneert uitsluitend welke
   * dagen van deze maand door welke bestaande periode geraakt worden.
   * Nuttig voor het tonen van een doorlopende multi-day-availability-balk
   * zonder per-dag de resolver te hoeven aanroepen vanuit de UI-laag.
   */
  function expandAvailabilityForMonth(periods, year, month1based) {
    if (!Array.isArray(periods)) return [];
    var n = daysInMonth(year, month1based);
    var maandStart = ymd(year, month1based, 1);
    var maandEind = ymd(year, month1based, n);
    return periods.filter(function (p) {
      return p && p.start_date <= maandEind && p.end_date >= maandStart;
    });
  }

  var CalendarMonthViewCore = {
    daysInMonth: daysInMonth,
    ymd: ymd,
    buildMonthGrid: buildMonthGrid,
    expandAvailabilityForMonth: expandAvailabilityForMonth
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CalendarMonthViewCore; }
  else { global.CalendarMonthViewCore = CalendarMonthViewCore; }
}(typeof self !== 'undefined' ? self : this));
