/* core/swimmingIntelligence.js — ENDURANCE MASTER SPRINT, E4 Swimming Foundation.
 *
 * Pure, deterministische aggregatie-bouwsteen voor Swimming. Geen DOM/
 * database/network-toegang (Calculation/Decision Core purity).
 *
 * ARCHITECTUURBESLISSING (analoog aan B9-05 Cycling Intelligence): de
 * generieke aggregatie (RunningIntelligenceCore.weeklyVolume()/consistency())
 * is al sport-neutraal en wordt DIRECT hergebruikt voor Swimming -- geen
 * derde, bijna-identieke engine. Wat wel echt sport-specifiek is: zwem-
 * afstanden liggen typisch 5-25x lager dan hardloopafstanden (honderden tot
 * enkele duizenden meters, niet kilometers) -- Running se afstandsbanden
 * zouden een 1500m-zwemtraining (lang, zwaar voor die discipline) in
 * dezelfde categorie zetten als een korte 5km-hardloop-opwarming. Eigen,
 * schaal-passende banden, zelfde patroon als Cycling se speedBandKey().
 *
 * BEWUST NIET GEBOUWD (E4-opdracht sectie 13/18): CSS (Critical Swim Speed),
 * swolf, stroke-rate-analytics, en een aparte "zwem-AI-score" -- geen van
 * alle is bewezen noodzakelijk voor Triathlon >=9 (Triathlon-kern vereist
 * een bruikbare standalone discipline, geen specialistische zwemcoach-app).
 * CardioCore.splitFromDistTime() (al bestaand, generiek) wordt hergebruikt
 * voor zwem-pace -- met 100m als eenheid i.p.v. Running/Cycling se 1000m,
 * een bestaande parameter, geen nieuwe berekening.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.SwimmingIntelligenceCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { distanceBand: 'swimming_distance_band.v1' };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // Typische zwemsessie-schaal: pool-intervaltrainingen liggen vaak
  // onder de 1000m, een gemiddelde clubtraining rond 1000-2500m, een
  // langere triatlon-specifieke of open-water-sessie 2500m+.
  function distanceBandKey(distanceMeters) {
    if (!isNum(distanceMeters) || distanceMeters <= 0) return null;
    if (distanceMeters < 1000) return 'swimming_lt1000m';
    if (distanceMeters < 2500) return 'swimming_1000_2500m';
    return 'swimming_2500m_plus';
  }

  var SwimmingIntelligenceCore = {
    VERSIONS: VERSIONS,
    distanceBandKey: distanceBandKey
  };

  return SwimmingIntelligenceCore;
}));
