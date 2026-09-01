/* core/cloudActivityIngestion.js — B9-H3B Cross-Sport Cloud Provider Integration.
 *
 * PURE, deterministische Provider Adapter + Sport Mapper + Metric Mapper
 * voor het omzetten van een Google Health `exercise`-datapoint (officieel
 * Google Health API v4-contract, geverifieerd tegen developers.google.com/
 * health/data-types/workouts, augustus 2026) naar een canonieke
 * `activities`-rij (bestaande tabel, hergebruikt ongewijzigd -- sectie 15:
 * "Canonical Activity Is Source Of Truth", geen parallelle tabel).
 *
 * Geen netwerk/database-toegang in dit bestand -- puur normalisatie/mapping.
 *
 * ARCHITECTUURPRINCIPE (sectie 13): dit is een ADAPTER, geen sportengine.
 * De output is een canonieke activity-rij die de bestaande Running/Cycling
 * Calculation Engines ongewijzigd kunnen consumeren -- geen calculation
 * hier, geen shadow decision.
 *
 * SPORT CAPABILITY REGISTRY (sectie 14): SPORT_MAPPING hieronder is de
 * enige plek waar provider-sporttypen naar canonieke sporten worden
 * gemapt. Uitbreiding naar een tweede provider vereist alleen een nieuwe
 * adapter-functie die dezelfde canonieke output produceert -- de
 * downstream-keten (activities-tabel, Calculation Engines) blijft
 * ongewijzigd (sectie 82: "Architecture Must Be Provider-2 Ready").
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.CloudActivityIngestionCore = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIONS = { schema: 'cloud_activity_ingestion.v1' };

  // Sport Capability Registry (sectie 14/34): Google Health exerciseType
  // -> canonieke Trainingskompas-sport. Uitsluitend de twee, in deze
  // sprint verplichte sporten (Running/Cycling) + een expliciete
  // "onbekend"-fallback (sectie 34: "Unknown sport: geen crash").
  // Uitbreiding naar Rowing/Swimming/Walking is hier triviaal toe te
  // voegen zodra de bestaande `activities.sport`-check-constraint dat
  // toestaat (rowing/swimming staan al toe, running/cycling ook).
  var SPORT_MAPPING = {
    RUNNING: 'running',
    TRAIL_RUNNING: 'running',
    TREADMILL_RUNNING: 'running',
    BIKING: 'cycling',
    ROAD_BIKING: 'cycling',
    MOUNTAIN_BIKING: 'cycling',
    INDOOR_CYCLING: 'cycling'
  };

  function mapSport(exerciseType) {
    if (!exerciseType) return null;
    var canonical = SPORT_MAPPING[exerciseType];
    return canonical || null; // onbekend -> null, NOOIT een gok/crash
  }

  // Metric Mapper (sectie 17/32): expliciete eenheidsconversie. Google
  // Health levert distance in MILLIMETERS en duur als een string met een
  // 's'-suffix (bijv. "1800s") -- beide expliciet, apart geconverteerd
  // om precies de in sectie 32 genoemde bugklasses te voorkomen
  // (mm-naar-m, seconden-als-string-naar-integer).
  function parseGoogleHealthDuration(durationString) {
    // "1800s" -> 1800 (integer seconden). Missing/malformed -> null,
    // NOOIT 0 (sectie 35: missing != zero).
    if (durationString == null || typeof durationString !== 'string') return null;
    var match = durationString.match(/^(\d+(?:\.\d+)?)s$/);
    if (!match) return null;
    var seconds = parseFloat(match[1]);
    return isFinite(seconds) ? Math.round(seconds) : null;
  }

  function millimetersToMeters(mm) {
    if (mm == null || typeof mm !== 'number' || !isFinite(mm)) return null;
    return Math.round((mm / 1000) * 100) / 100; // 2 decimalen, geen valse precisie voorbij wat de bron levert
  }

  // Deduplicatie (sectie 23-26): deterministische, provider-specifieke
  // dedupe_key. Gebruikt de externe, provider-eigen datapoint-naam
  // (uniek per Google Health-account) -- de meest betrouwbare, EXACT-
  // confidence dedupe-sleutel (sectie 25), geen fingerprint-heuristiek
  // nodig zolang de provider een stabiele external ID levert.
  function buildDedupeKey(provider, externalActivityId) {
    if (!provider || !externalActivityId) return null;
    return provider + ':' + externalActivityId;
  }

  // Provider Adapter (sectie 12): zet één Google Health exercise-
  // datapoint om naar een canonieke activities-rij. GEEN database-call
  // hier -- de caller (Netlify-functie) voert de daadwerkelijke
  // insert/upsert uit.
  function normalizeGoogleHealthExercise(dataPoint, userId) {
    if (!dataPoint || !dataPoint.exercise) {
      return { valid: false, reason: 'missing_exercise_payload' };
    }
    var exercise = dataPoint.exercise;
    var sport = mapSport(exercise.exerciseType);
    if (!sport) {
      return { valid: false, reason: 'unsupported_sport', rawSportType: exercise.exerciseType || null };
    }
    var externalActivityId = dataPoint.name || null;
    if (!externalActivityId) {
      return { valid: false, reason: 'missing_external_id' };
    }
    var durationSeconds = parseGoogleHealthDuration(exercise.activeDuration);
    var distanceMeters = exercise.metricsSummary
      ? millimetersToMeters(exercise.metricsSummary.distanceMillimeters)
      : null;
    var recordedAt = exercise.interval ? exercise.interval.startTime : null;

    return {
      valid: true,
      activity: {
        user_id: userId,
        sport: sport,
        duration_seconds: durationSeconds,
        distance_meters: distanceMeters,
        elevation_gain_meters: null, // Google Health exercise.metricsSummary levert dit niet standaard -- missing, niet 0
        avg_heart_rate_bpm: null, // niet in metricsSummary; apart datatype, niet in deze sprint geconsumeerd
        avg_power_watts: null,
        avg_cadence_rpm: null,
        source_provenance: 'provider_derived',
        source_provider: 'google_health',
        data_quality: 'provider_verified',
        recorded_at: recordedAt,
        dedupe_key: buildDedupeKey('google_health', externalActivityId)
      }
    };
  }

  return {
    VERSIONS: VERSIONS,
    SPORT_MAPPING: SPORT_MAPPING,
    mapSport: mapSport,
    parseGoogleHealthDuration: parseGoogleHealthDuration,
    millimetersToMeters: millimetersToMeters,
    buildDedupeKey: buildDedupeKey,
    normalizeGoogleHealthExercise: normalizeGoogleHealthExercise
  };
}));
