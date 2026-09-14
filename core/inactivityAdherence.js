/* core/inactivityAdherence.js — INACTIVITY & ADHERENCE (GAP-P3-031b)
 * CALC-ACT-001 inactivity.v1 — dagen sinds laatste uitgevoerde training (overall / kracht / endurance, per sport)
 * CALC-ACT-002 adherence.v1  — gepland vs. uitgevoerd binnen een venster (program_blocks + Mijn-training-occurrences)
 *
 * Descriptieve Context-signalen. Ze wijzigen NOOIT zelfstandig een trainingsvoorschrift (geen Decision Rule,
 * geen gewicht/sets/RPE, geen rustdag). Deterministisch, reproduceerbaar, uitsluitend persisted input,
 * null/unknown blijft null (geen 0-fallback), geen fysiologische interpretatie, geen drempels
 * ("14 dagen = slecht" bestaat hier niet). Kalenderdagen (YYYY-MM-DD) zoals TK-breed (td()).
 * Missed-semantiek = ScheduleAdherenceCore.resolveScheduleGap (canonical, hergebruikt): een afgeronde of
 * overgeslagen training is nooit MISSED; "geen planning" ≠ "missed"; verplaatst telt één keer op de nieuwe datum.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./scheduleAdherence.js'));
  else root.InactivityAdherenceCore = factory(root.ScheduleAdherenceCore);
})(typeof self !== 'undefined' ? self : this, function (SA) {
  'use strict';
  var VERSIONS = { inactivity: 'inactivity.v1', adherence: 'adherence.v1' };
  var ENDURANCE_SPORTS = ['running', 'cycling', 'swimming'];

  function isISODate(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d); }
  function toDay(d) { return isISODate(d) ? d.slice(0, 10) : null; }
  function daysBetween(a, b) { // kalenderdagen b - a (a <= b), null bij ongeldige input; via UTC-middernacht → geen DST-offby-one
    if (!isISODate(a) || !isISODate(b)) return null;
    var da = Date.parse(a.slice(0, 10) + 'T00:00:00Z'), db = Date.parse(b.slice(0, 10) + 'T00:00:00Z');
    if (isNaN(da) || isNaN(db)) return null;
    return Math.round((db - da) / 86400000);
  }
  function maxDay(list, getter) {
    var best = null;
    (list || []).forEach(function (r) { var d = toDay(getter(r)); if (d && (!best || d > best)) best = d; });
    return best;
  }

  /* CALC-ACT-001 — inactivity.v1
   * input: { today: 'YYYY-MM-DD', strengthSessions: [{date}], allSessions: [{date}], activities: [{sport, localDate}] }
   *   strengthSessions = sessions met gewicht+reps (kracht); allSessions = alle sessions-rijen (kracht + erg/cardio in sessions);
   *   activities.localDate = lokale kalenderdag van recorded_at (bepaald door de caller met dezelfde td()-semantiek).
   * output per dimensie: { lastDate, daysSince } — daysSince null als er geen laatste datum is (geen verzonnen 0). */
  function inactivity(input) {
    input = input || {};
    var today = toDay(input.today);
    var lastStrength = maxDay(input.strengthSessions, function (r) { return r && r.date; });
    var lastSession = maxDay(input.allSessions, function (r) { return r && r.date; });
    var acts = Array.isArray(input.activities) ? input.activities : [];
    var lastEndurance = maxDay(acts, function (a) { return a && a.localDate; });
    var perSport = {};
    ENDURANCE_SPORTS.forEach(function (sp) {
      var d = maxDay(acts.filter(function (a) { return a && a.sport === sp; }), function (a) { return a.localDate; });
      perSport[sp] = { lastDate: d, daysSince: today && d ? daysBetween(d, today) : null };
    });
    var lastOverall = [lastSession, lastEndurance].filter(Boolean).sort().pop() || null;
    function dim(d) { return { lastDate: d, daysSince: (today && d) ? daysBetween(d, today) : null }; }
    return {
      version: VERSIONS.inactivity, referenceDate: today,
      overall: dim(lastOverall), strength: dim(lastStrength), endurance: dim(lastEndurance), enduranceBySport: perSport,
      dataQuality: today ? ((lastSession || lastEndurance) ? 'ok' : 'no_history') : 'no_reference_date'
    };
  }

  /* CALC-ACT-002 — adherence.v1
   * input: { today, windowDays, programBlocks: [{planned_date, completed_at, schedule_status}],
   *          occurrences: [{id, planned_date, status}], assignments: [{occurrence_id, status, training_instance_id}] }
   * Alleen items met een planned_date binnen [today-windowDays+1, today]. Toekomst telt niet.
   * Statussen: program_blocks via ScheduleAdherenceCore.resolveScheduleGap (COMPLETED/SKIPPED/MISSED/TODAY);
   *            occurrences: cancelled → uitgesloten; assignment completed → COMPLETED; skipped → SKIPPED;
   *            planned & planned_date < today → MISSED; planned_date == today → TODAY (nog niet beoordeelbaar).
   * output: { planned, completed, skipped, missed, pending, adherencePct (null als planned==0), missedStreak, items[] } */
  function adherence(input) {
    input = input || {};
    var today = toDay(input.today);
    var win = (input.windowDays > 0) ? Math.floor(input.windowDays) : 28;
    if (!today) return { version: VERSIONS.adherence, referenceDate: null, windowDays: win, planned: null, completed: null, skipped: null, missed: null, pending: null, adherencePct: null, missedStreak: null, items: [], dataQuality: 'no_reference_date' };
    var startMs = Date.parse(today + 'T00:00:00Z') - (win - 1) * 86400000;
    var start = new Date(startMs).toISOString().slice(0, 10);
    var items = [];
    (input.programBlocks || []).forEach(function (b) {
      var d = toDay(b && b.planned_date); if (!d || d < start || d > today) return;
      var st = SA && typeof SA.resolveScheduleGap === 'function' ? SA.resolveScheduleGap(d, today, b.completed_at, b.schedule_status) : null;
      if (!st) return;
      items.push({ source: 'program_block', date: d, status: st });
    });
    var assByOcc = {};
    (input.assignments || []).forEach(function (a) { if (a && a.occurrence_id) assByOcc[a.occurrence_id] = a; });
    (input.occurrences || []).forEach(function (o) {
      if (!o || o.status === 'cancelled') return;
      var d = toDay(o.planned_date); if (!d || d < start || d > today) return;
      var a = assByOcc[o.id] || null;
      var st;
      if (a && a.status === 'completed') st = 'COMPLETED';
      else if (a && a.status === 'skipped') st = 'SKIPPED';
      else if (d === today) st = 'TODAY';
      else st = 'MISSED';
      items.push({ source: 'occurrence', date: d, status: st });
    });
    items.sort(function (x, y) { return x.date < y.date ? -1 : (x.date > y.date ? 1 : 0); });
    var counts = { COMPLETED: 0, SKIPPED: 0, MISSED: 0, TODAY: 0 };
    items.forEach(function (it) { counts[it.status] = (counts[it.status] || 0) + 1; });
    var assessed = counts.COMPLETED + counts.SKIPPED + counts.MISSED; // TODAY is nog niet beoordeelbaar
    var streak = 0;
    for (var i = items.length - 1; i >= 0; i--) { if (items[i].status === 'TODAY') continue; if (items[i].status === 'MISSED') streak++; else break; }
    return {
      version: VERSIONS.adherence, referenceDate: today, windowStart: start, windowDays: win,
      planned: items.length, completed: counts.COMPLETED, skipped: counts.SKIPPED, missed: counts.MISSED, pending: counts.TODAY,
      adherencePct: assessed > 0 ? Math.round(100 * counts.COMPLETED / assessed) : null,
      missedStreak: streak, items: items,
      dataQuality: items.length ? 'ok' : 'no_planning'
    };
  }

  return { VERSIONS: VERSIONS, ENDURANCE_SPORTS: ENDURANCE_SPORTS.slice(), daysBetween: daysBetween, inactivity: inactivity, adherence: adherence };
});
