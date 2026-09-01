/* core/runningIntelligence.js — B9-03 Running Intelligence.
 *
 * Pure, deterministische aggregatie/trend-bouwstenen voor Running.
 * Geen DOM/database/network-toegang (Calculation/Decision Core purity).
 *
 * Hergebruikt bewust bestaande, canonieke infrastructuur i.p.v. een
 * tweede trend-/load-engine te bouwen:
 * - ProgressionCore.trendBy()/comparableHistory() voor pace-trends
 *   (appels-met-appels via een expliciete distance-band-key).
 * - TrainingLoadCore.sessionLoadSRPE()/rollingLoadSum() voor load
 *   (via het nieuwe activities.rpe-veld, B9-03 migratie_v534.sql).
 * - core/cardio.js (criticalSpeed) voor Critical Speed zelf -- deze
 *   module bepaalt uitsluitend welke activiteiten daarvoor in
 *   aanmerking komen (is_max_effort=true), niet de berekening zelf.
 *
 * BEWUST NIET GEBOUWD in B9-03 (expliciete, gemotiveerde keuzes, zie
 * docs/B9_03_RUNNING_INTELLIGENCE_REPORT.md):
 * - HR-zones: geen gevalideerde, canonieke formule (geen "220-leeftijd").
 * - TRIMP: methodologische complexiteit (sex-specifieke aannames) niet
 *   passend gebleken -- sRPE/rolling load is de eenvoudigere,
 *   beter onderbouwde loadmetriek die al bestaat.
 * - Aerobic decoupling: activities/activity_laps bevatten alleen
 *   gemiddelde HR per activiteit/lap, geen continue tijdreeks --
 *   onvoldoende granulariteit voor een valide berekening.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.RunningIntelligenceCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { weeklyVolume: 'running_weekly_volume.v1', distanceBand: 'running_distance_band.v1', csEligibility: 'running_cs_eligibility.v1' };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // ISO-achtige weeksleutel (maandag als start), zonder externe libs.
  // Puur, deterministisch: dezelfde datum geeft altijd dezelfde weeksleutel.
  function weekKeyFromDate(dateInput) {
    var d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    var day = (d.getUTCDay() + 6) % 7; // maandag=0 ... zondag=6
    var monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
    return monday.toISOString().slice(0, 10); // 'YYYY-MM-DD' van de maandag
  }

  // Weekly volume (sectie 6): aggregeert echte activities, geen
  // duplicatie met sessions. Retourneert een map weekKey -> {distanceMeters, durationSeconds, count}.
  // Een activity zonder recorded_at wordt genegeerd (geen fabricage van een datum).
  function weeklyVolume(activities) {
    var lijst = Array.isArray(activities) ? activities : [];
    var perWeek = {};
    lijst.forEach(function (a) {
      if (!a || !a.recorded_at) return;
      var wk = weekKeyFromDate(a.recorded_at);
      if (!wk) return;
      if (!perWeek[wk]) perWeek[wk] = { weekKey: wk, distanceMeters: 0, durationSeconds: 0, count: 0 };
      if (isNum(a.distance_meters)) perWeek[wk].distanceMeters += a.distance_meters;
      if (isNum(a.duration_seconds)) perWeek[wk].durationSeconds += a.duration_seconds;
      perWeek[wk].count += 1;
    });
    return perWeek;
  }

  // Sectie 8 (appels-met-appels): een distance-band-key voor pace-
  // vergelijking -- een 5km-tempo-run wordt nooit vergeleken met een
  // 25km-duurloop. Banden: <5km, 5-10km, 10-15km, 15km+. Geen
  // afstand bekend -> null (geen band, geen vergelijking mogelijk).
  function distanceBandKey(distanceMeters) {
    if (!isNum(distanceMeters) || distanceMeters <= 0) return null;
    var km = distanceMeters / 1000;
    if (km < 5) return 'running_lt5km';
    if (km < 10) return 'running_5_10km';
    if (km < 15) return 'running_10_15km';
    return 'running_15km_plus';
  }

  // Sectie 9 (consistency, Evidence Level E -- technisch/afgeleid, geen
  // performance-voorspelling): aantal weken met >=1 activiteit binnen
  // de laatste N weken (inclusief de huidige, gedeeltelijke week).
  function consistency(activities, totalWeeks, referenceDate) {
    var n = isNum(totalWeeks) && totalWeeks > 0 ? Math.floor(totalWeeks) : 8;
    var ref = referenceDate ? new Date(referenceDate) : new Date();
    var refWeekMonday = new Date(weekKeyFromDate(ref) + 'T00:00:00Z');
    var perWeek = weeklyVolume(activities);
    var actieveWeken = 0;
    for (var i = 0; i < n; i++) {
      var wkDate = new Date(refWeekMonday.getTime() - i * 7 * 24 * 3600 * 1000);
      var wk = wkDate.toISOString().slice(0, 10);
      if (perWeek[wk] && perWeek[wk].count > 0) actieveWeken++;
    }
    return { activeWeeks: actieveWeken, totalWeeks: n, ratio: actieveWeken / n, evidenceLevel: 'E' };
  }

  // Sectie 11/12 (Critical Speed-geschiktheid): welke activiteiten
  // mogen CriticalSpeed voeden? Uitsluitend expliciet gemarkeerde
  // (is_max_effort=true) EN met geldige distance/duration. Retourneert
  // de {distance_m, duration_s}-array die core/cardio.js verwacht, of
  // een insufficient-status als er te weinig geldige punten zijn.
  function criticalSpeedEligiblePerformances(activities, minEfforts) {
    var min = isNum(minEfforts) && minEfforts > 0 ? minEfforts : 3;
    var lijst = Array.isArray(activities) ? activities : [];
    var geschikt = lijst.filter(function (a) {
      return a && a.is_max_effort === true && isNum(a.distance_meters) && a.distance_meters > 0 && isNum(a.duration_seconds) && a.duration_seconds > 0;
    }).map(function (a) {
      return { distance_m: a.distance_meters, duration_s: a.duration_seconds, recorded_at: a.recorded_at };
    });
    if (geschikt.length < min) {
      return { status: 'insufficient', label: 'Nog onvoldoende gemarkeerde maximale inspanningen', n: geschikt.length, minRequired: min };
    }
    return { status: 'eligible', n: geschikt.length, performances: geschikt };
  }

  return {
    VERSIONS: VERSIONS,
    weekKeyFromDate: weekKeyFromDate,
    weeklyVolume: weeklyVolume,
    distanceBandKey: distanceBandKey,
    consistency: consistency,
    criticalSpeedEligiblePerformances: criticalSpeedEligiblePerformances
  };
}));
