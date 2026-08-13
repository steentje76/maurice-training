/* ==========================================================================
 * TrainingKompas — COMMON DATA MODEL CORE  (Unified Sport & Data Architecture, fundering)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen browser-opslag, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: provider-agnostische normalisatielaag TUSSEN externe databronnen
 * (Google Health, en later Garmin/WHOOP/Strava/Concept2/EGYM/Technogym) en de
 * bestaande Calculation Engine. Dit bestand kent GEEN enkele provider-specifieke
 * logica — dat hoort in aparte, toekomstige adapters die hier alleen op INVOEREN.
 *
 * HARDE REGEL: dit bestand berekent NIETS sportief/coachend. Het normaliseert,
 * converteert eenheden en dedupliceert/groepeert — puur mechanisch. Alle
 * sportieve interpretatie blijft bij CalcCore/DecisionCore.
 *
 * RAW SOURCE DATA -> normalizeDataPoint() -> NormalizedDataPoint -> CalcCore
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = {
    normalize: 'common_data_normalize.v1',
    unitConvert: 'common_data_unit_convert.v1',
    merge: 'common_data_merge.v1',
    grouping: 'common_data_grouping.v1'
  };

  // Canonieke metric-sleutels. Nieuwe providers MOETEN naar één van deze mappen —
  // voorkomt dat provider-specifieke veldnamen doorlekken naar de Calculation Engine.
  var CANONICAL_METRICS = [
    'heart_rate', 'hrv', 'sleep', 'resting_heart_rate', 'calories', 'power',
    'cadence', 'pace', 'distance', 'duration', 'reps', 'sets', 'load', 'rpe',
    'strokes', 'split'
  ];

  // Canonieke eenheid per metric — elke provider-adapter converteert hiernaartoe
  // vóórdat normalizeDataPoint() aangeroepen wordt (conversie zelf via convertUnit()).
  var CANONICAL_UNITS = {
    heart_rate: 'bpm', hrv: 'ms', sleep: 'hours', resting_heart_rate: 'bpm',
    calories: 'kcal', power: 'watt', cadence: 'rpm', pace: 'sec_per_km',
    distance: 'meters', duration: 'seconds', reps: 'count', sets: 'count',
    load: 'kg', rpe: 'scale_1_10', strokes: 'count', split: 'sec_per_500m'
  };

  function canonicalUnitFor(metric) {
    return Object.prototype.hasOwnProperty.call(CANONICAL_UNITS, metric) ? CANONICAL_UNITS[metric] : null;
  }

  function isKnownMetric(metric) {
    return CANONICAL_METRICS.indexOf(metric) !== -1;
  }

  // Kleine, expliciete conversietabel — alleen veelvoorkomende, ondubbelzinnige gevallen.
  // Onbekende paren geven null terug (geen giswerk, geen stille foutieve aanname).
  var CONVERSIONS = {
    'km->meters': function (v) { return v * 1000; },
    'miles->meters': function (v) { return v * 1609.344; },
    'lb->kg': function (v) { return v * 0.45359237; },
    'min->seconds': function (v) { return v * 60; },
    'hours->seconds': function (v) { return v * 3600; },
    'sec_per_mile->sec_per_km': function (v) { return v / 1.609344; },
    'watt->watt': function (v) { return v; }
  };

  function convertUnit(value, fromUnit, toUnit) {
    if (value == null || isNaN(value)) return null;
    if (fromUnit === toUnit) return value;
    var key = fromUnit + '->' + toUnit;
    var fn = CONVERSIONS[key];
    return typeof fn === 'function' ? fn(value) : null;
  }

  // normalizeDataPoint: zet een reeds-in-canonieke-eenheid aangeleverd ruw punt om
  // naar de vaste NormalizedDataPoint-vorm. Roept GEEN unit-conversie zelf aan —
  // de aanroeper (toekomstige provider-adapter) moet al canonicalUnitFor(metric)
  // hebben toegepast; dit voorkomt stille, onopgemerkte eenheidsfouten hier.
  function normalizeDataPoint(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.source || !raw.sourceType || !raw.metric || !raw.timestamp) return null;
    if (!isKnownMetric(raw.metric)) return null;

    var expectedUnit = canonicalUnitFor(raw.metric);
    if (expectedUnit && raw.unit && raw.unit !== expectedUnit) return null; // fail-closed, geen gok

    return {
      source: String(raw.source),
      sourceType: String(raw.sourceType),
      athleteId: raw.athleteId != null ? String(raw.athleteId) : null,
      timestamp: String(raw.timestamp),
      metric: raw.metric,
      value: (raw.value == null || isNaN(raw.value)) ? null : Number(raw.value),
      unit: expectedUnit,
      durationSeconds: raw.durationSeconds != null ? Number(raw.durationSeconds) : null,
      distanceMeters: raw.distanceMeters != null ? Number(raw.distanceMeters) : null,
      heartRate: raw.heartRate != null ? Number(raw.heartRate) : null,
      hrv: raw.hrv != null ? Number(raw.hrv) : null,
      calories: raw.calories != null ? Number(raw.calories) : null,
      power: raw.power != null ? Number(raw.power) : null,
      cadence: raw.cadence != null ? Number(raw.cadence) : null,
      paceSecPerKm: raw.paceSecPerKm != null ? Number(raw.paceSecPerKm) : null,
      reps: raw.reps != null ? Number(raw.reps) : null,
      sets: raw.sets != null ? Number(raw.sets) : null,
      loadKg: raw.loadKg != null ? Number(raw.loadKg) : null,
      rpe: raw.rpe != null ? Number(raw.rpe) : null,
      deviceMetadata: raw.deviceMetadata && typeof raw.deviceMetadata === 'object' ? raw.deviceMetadata : null,
      provenance: {
        rawRef: raw.provenanceRef != null ? raw.provenanceRef : null,
        version: VERSIONS.normalize
      }
    };
  }

  // mergeDataPoints: dedupliceert punten met exact zelfde (source, metric, timestamp).
  // Deterministische tie-break: laatste in de invoerlijst wint (aanroeper bepaalt
  // dus prioriteit door volgorde — geen verborgen "nieuwste wint op systeemklok").
  function mergeDataPoints(points) {
    var byKey = {};
    var order = [];
    (points || []).forEach(function (p) {
      if (!p) return;
      var key = p.source + '|' + p.metric + '|' + p.timestamp;
      if (!Object.prototype.hasOwnProperty.call(byKey, key)) order.push(key);
      byKey[key] = p;
    });
    return order.map(function (k) { return byKey[k]; });
  }

  // groupByWindow: groepeert punten die binnen windowSeconds van elkaar liggen
  // (bv. Concept2-workout + wearable-HR + handmatige RPE rond dezelfde sessie).
  // Puur windowing — GEEN interpretatie van wat een "workout" betekent.
  function groupByWindow(points, windowSeconds) {
    var w = windowSeconds > 0 ? windowSeconds : 0;
    var sorted = (points || []).slice().filter(function (p) { return p && p.timestamp; })
      .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
    var groups = [];
    var current = null, currentEnd = null;
    sorted.forEach(function (p) {
      var t = new Date(p.timestamp).getTime();
      if (current && t - currentEnd <= w * 1000) {
        current.push(p);
        currentEnd = Math.max(currentEnd, t);
      } else {
        current = [p];
        currentEnd = t;
        groups.push(current);
      }
    });
    return groups;
  }

  var CommonDataCore = {
    CANONICAL_METRICS: CANONICAL_METRICS,
    CANONICAL_UNITS: CANONICAL_UNITS,
    canonicalUnitFor: canonicalUnitFor,
    isKnownMetric: isKnownMetric,
    convertUnit: convertUnit,
    normalizeDataPoint: normalizeDataPoint,
    mergeDataPoints: mergeDataPoints,
    groupByWindow: groupByWindow,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CommonDataCore; }
  if (global) { global.CommonDataCore = CommonDataCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
