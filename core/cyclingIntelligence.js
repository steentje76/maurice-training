/* core/cyclingIntelligence.js — B9-05 Cycling Intelligence.
 *
 * Pure, deterministische aggregatie/trend-bouwstenen voor Cycling.
 * Geen DOM/database/network-toegang (Calculation/Decision Core purity).
 *
 * ARCHITECTUURBESLISSING (B9-05, analoog aan de B9-04-generalisatie van
 * runningExecution.js -> enduranceExecution.js): een audit van
 * core/runningIntelligence.js bevestigde dat de generieke aggregatie-
 * mechaniek (weeklyVolume/consistency) volledig sport-neutraal is --
 * geen enkele functie-body bevat een running-specifieke aanname, beide
 * werken al generiek op elke activities-rij. Deze twee functies worden
 * daarom DIRECT hergebruikt (RunningIntelligenceCore.weeklyVolume()/
 * consistency()), GEEN duplicaat gebouwd.
 *
 * Wat WEL sport-specifiek, nieuw werk vereist (geen tweede, bijna-
 * identieke engine, maar een echt inhoudelijk verschil, geen naam-
 * verschil): running_lt5km/5-10km/... zijn typische hardloopafstanden
 * (5-25km); fietsafstanden liggen typisch 5-10x hoger (20-150km+) --
 * dezelfde banden hergebruiken zou een fietsrit van 15km (kort, licht)
 * in dezelfde categorie zetten als een marathon-afstand-hardloop
 * (zwaar) qua label-semantiek. Cycling gebruikt daarom eigen,
 * schaal-passende banden. Critical Power gebruikt bovendien vermogen
 * (avg_power_watts) i.p.v. afstand/duur als primaire input -- een
 * volledig ander eligibility-filter dan Critical Speed.
 *
 * BEWUST NIET GEBOUWD in B9-05 (zie docs/B9_05_CYCLING_INTELLIGENCE_REPORT.md):
 * - Power zones: geen gevalideerde, canonieke formule (geen "% van FTP"-
 *   bro-science zonder formele registratie).
 * - Canonieke FTP-testprotocol-berekening: alleen user-entered blijft
 *   de bron, geen "95% van 20-min-power"-schatting toegevoegd.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.CyclingIntelligenceCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { speedBand: 'cycling_speed_band.v1', cpEligibility: 'cycling_cp_eligibility.v1' };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // Sectie 8-analoog (appels-met-appels voor snelheid/tempo-vergelijking):
  // fietsafstanden zijn typisch 5-10x groter dan hardloopafstanden --
  // eigen, schaal-passende banden. Een korte, snelle rit (15km) wordt
  // nooit vergeleken met een lange toertocht (120km).
  function speedBandKey(distanceMeters) {
    if (!isNum(distanceMeters) || distanceMeters <= 0) return null;
    var km = distanceMeters / 1000;
    if (km < 20) return 'cycling_lt20km';
    if (km < 50) return 'cycling_20_50km';
    if (km < 100) return 'cycling_50_100km';
    return 'cycling_100km_plus';
  }

  // Critical Power-geschiktheid (analoog aan CS-eligibility, sectie
  // 11/12 van B9-03, hier toegepast op vermogen i.p.v. afstand/duur):
  // uitsluitend expliciet gemarkeerde (is_max_effort=true) activiteiten
  // met geldig avg_power_watts/duration_seconds mogen CardioCore.
  // criticalPower() voeden -- nooit een normale, rustige rit.
  function criticalPowerEligiblePerformances(activities, minEfforts) {
    var min = isNum(minEfforts) && minEfforts > 0 ? minEfforts : 3;
    var lijst = Array.isArray(activities) ? activities : [];
    var geschikt = lijst.filter(function (a) {
      return a && a.is_max_effort === true && isNum(a.avg_power_watts) && a.avg_power_watts > 0 && isNum(a.duration_seconds) && a.duration_seconds > 0;
    }).map(function (a) {
      return { avg_power_w: a.avg_power_watts, duration_s: a.duration_seconds, recorded_at: a.recorded_at };
    });
    if (geschikt.length < min) {
      return { status: 'insufficient', label: 'Nog onvoldoende gemarkeerde maximale inspanningen met vermogensdata', n: geschikt.length, minRequired: min };
    }
    return { status: 'eligible', n: geschikt.length, performances: geschikt };
  }

  return {
    VERSIONS: VERSIONS,
    speedBandKey: speedBandKey,
    criticalPowerEligiblePerformances: criticalPowerEligiblePerformances
  };
}));
