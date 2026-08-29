/* ==========================================================================
 * TrainingKompas — CARDIO CALCULATION CORE  (F1.12)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen localStorage, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * Device-ONAFHANKELIJK: CardioCore weet NIET of data van Concept2, AssaultBike,
 * handmatige invoer of een wearable komt — dat hoort in de adapter/source-laag.
 *
 * EENHEDEN zijn expliciet (cardio is unit-gevoelig):
 *   - afstand: METERS (m)          — 1000 m ≠ 1 km
 *   - tijd:    SECONDEN (s)        — 500 s ≠ 500 min
 *   - split:   SECONDEN per `basis` meter (Concept2-basis = 500 m)
 *   - vermogen: WATT
 *
 * Alle functies zijn 1-op-1 uit legacy CardioEngine + parseTimeToSec geëxtraheerd (old===new).
 * De Concept2-formule (watt = 2.80/(split/500)^3) is BEWUST ongewijzigd.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { time: 'cardio_time.v1', split: 'cardio_split.v1', power: 'cardio_power.v1', criticalSpeed: 'critical_speed.v1' };

  // --- cardio_time.v1 (parse) --- exact gelijk aan legacy parseTimeToSec.
  // "mm:ss" of "h:mm:ss" of los getal -> seconden. Legacy-quirk behouden: leeg/ongeldig -> null.
  function parseTime(str) {
    if (!str) return null;
    var p = String(str).trim().split(':');
    var sec;
    if (p.length === 2) sec = parseFloat(p[0]) * 60 + parseFloat(p[1]);
    else if (p.length === 3) sec = parseFloat(p[0]) * 3600 + parseFloat(p[1]) * 60 + parseFloat(p[2]);
    else sec = parseFloat(str);
    return isNaN(sec) ? null : sec;
  }

  // --- cardio_time.v1 (format) --- exact gelijk aan legacy CardioEngine.formatTime.
  // seconden -> "mm:ss" of "h:mm:ss". Ongeldig/negatief -> ''.
  function formatTime(sec) {
    if (sec == null || isNaN(sec) || sec < 0) return '';
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    var ss = String(s).padStart(2, '0');
    return h > 0 ? (h + ':' + mm + ':' + ss) : (mm + ':' + ss);
  }

  // --- cardio_split.v1 --- split/pace = tijd (s) per `basis` meter. Exact legacy.
  function splitFromDistTime(dist, timeSec, basis) {
    if (!dist || !timeSec) return null;
    return (timeSec / dist) * basis;
  }
  function timeFromDistSplit(dist, splitSec, basis) {
    if (!dist || !splitSec) return null;
    return (splitSec / basis) * dist;
  }
  function distFromTimeSplit(timeSec, splitSec, basis) {
    if (!timeSec || !splitSec) return null;
    return (timeSec / splitSec) * basis;
  }

  // --- cardio_power.v1 --- Concept2-formule (roei/ski/bike-erg, split-basis 500 m):
  // watt = 2.80 / (split_per_500m_in_sec / 500)^3, en de inverse. BEWUST ongewijzigd.
  function wattFromSplit500(splitSec) {
    if (!splitSec) return null;
    return 2.80 / Math.pow(splitSec / 500, 3);
  }
  function splitFromWatt500(watt) {
    if (!watt) return null;
    return Math.cbrt(2.80 / watt) * 500;
  }

  // --- cardio_split.v1 (intervallen) --- gelijkmatige auto-splits + aggregatie van handmatige splits.
  function autoSplits(totalTimeSec, totalDist, splitDist) {
    if (!totalTimeSec || !totalDist || !splitDist) return [];
    var n = Math.max(1, Math.round(totalDist / splitDist));
    var per = totalTimeSec / n;
    var splits = {};
    for (var i = 1; i <= n; i++) splits[i] = per;
    return splits;
  }
  function fromManualSplits(splitSecMap) {
    var vals = Object.values(splitSecMap).filter(function (v) { return v != null && !isNaN(v) && v > 0; });
    if (!vals.length) return null;
    var total = vals.reduce(function (a, b) { return a + b; }, 0);
    return { total: total, avg: total / vals.length, count: vals.length };
  }

  // --- cardio_validate.v1 --- PURE input-classificatie (F3.6). Beschermt de actual-write:
  // een negatieve/niet-eindige/onmogelijke cardio-waarde mag NOOIT in een sessions-row belanden.
  // Onderscheid: 'empty' (leeg/whitespace) · 'invalid' (NaN/Infinity/negatief) · 'valid'.
  // Puur presentatie/validatie: geen DOM, geen clamping van geldige invoer.
  function classifyNumericInput(raw) {
    if (raw === undefined || raw === null) return { status: 'empty', value: null, reason: null };
    var s = String(raw).trim();
    if (s === '') return { status: 'empty', value: null, reason: null };
    var v = Number(s);
    if (!isFinite(v)) return { status: 'invalid', value: null, reason: 'niet-eindig' };
    if (v < 0) return { status: 'invalid', value: null, reason: 'negatief' };
    return { status: 'valid', value: v, reason: null };
  }
  // Tijd-invoer ("mm:ss"/"h:mm:ss"/getal) via parseTime; negatief of onleesbaar -> invalid.
  function classifyTimeInput(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') return { status: 'empty', value: null, reason: null };
    var sec = parseTime(raw);
    if (sec === null || !isFinite(sec)) return { status: 'invalid', value: null, reason: 'onleesbaar' };
    if (sec < 0) return { status: 'invalid', value: null, reason: 'negatief' };
    return { status: 'valid', value: sec, reason: null };
  }

  // PRE-MERGE REMEDIATION (PR #31, Calculation Architecture-audit) — station_duration.v1 /
  // segment_transition.v1. Deze twee functies bestonden tot deze fix uitsluitend als lokale,
  // functioneel identieke duplicaten in index.html (tkHyroxStationDurationS/
  // tkHyroxSegmentTransitionS), gebouwd om de destijds beschermde core/calculation.js niet
  // te hoeven aanraken tijdens de v4.77.0-integratie. core/cardio.js staat NIET op de
  // beschermde-bestandenlijst, dus dit is de correcte, veilige, enige bron van waarheid:
  // index.html roept nu uitsluitend CardioCore.stationDurationS()/segmentTransitionS() aan,
  // geen eigen kopie meer.
  function stationDurationS(startMs, endMs) {
    var a = (typeof startMs === 'number') ? startMs : parseFloat(startMs);
    var b = (typeof endMs === 'number') ? endMs : parseFloat(endMs);
    if (a == null || b == null || !isFinite(a) || !isFinite(b)) return null;
    var rawMs = b - a;
    if (rawMs < 0) return null;
    return Math.round(rawMs / 1000);
  }

  var SEGMENT_TRANSITIE_MAX_DUUR_S = 3600;
  function segmentTransitionS(prevSegmentEndMs, nextSegmentStartMs, pausedMsPrev, pausedMsThis) {
    var a = (typeof prevSegmentEndMs === 'number') ? prevSegmentEndMs : parseFloat(prevSegmentEndMs);
    var b = (typeof nextSegmentStartMs === 'number') ? nextSegmentStartMs : parseFloat(nextSegmentStartMs);
    if (a == null || b == null || !isFinite(a) || !isFinite(b)) return null;
    var pa = (pausedMsPrev == null || !isFinite(pausedMsPrev)) ? 0 : pausedMsPrev;
    var pb = (pausedMsThis == null || !isFinite(pausedMsThis)) ? 0 : pausedMsThis;
    var pausedDelta = pb - pa;
    if (!(pausedDelta > 0)) pausedDelta = 0;
    var rawMs = b - a - pausedDelta;
    if (rawMs < 0) return null;
    var s = Math.round(rawMs / 1000);
    if (s > SEGMENT_TRANSITIE_MAX_DUUR_S) return null;
    return s;
  }

  // --- critical_speed.v1 (MS-F6-01) --------------------------------------
  // Tweeparametermodel (Monod & Scherrer 1965; toegepast op hardlopen door o.a.
  // Hughson et al. 1984): afstand = CS·tijd + D' (D' = anaerobe-afstandscapaciteit).
  // Lineaire regressie op {distance_m, duration_s}-paren van NABIJ-MAXIMALE,
  // constante-inspanning tijdritten (2-15 min-bereik is gangbaar in de literatuur).
  //
  // KRITIEKE, EERLIJKE BEPERKING (bevestigd tijdens de F6 Entry Audit): het TK-
  // datamodel heeft GEEN manier om een gelogde sessie te markeren als een genuine
  // maximale-inspanning-tijdrit versus een rustige duurloop. Deze functie neemt
  // daarom NOOIT automatisch trainingsgeschiedenis als input — de aanroeper moet
  // expliciet, gecureerde tijdrit-prestaties aanleveren. Automatische wiring op
  // willekeurige sessiedata zou een wetenschappelijk ongeldig model opleveren
  // (het CS-model vereist genuine uitputtende inspanningen, geen duurlopen).
  //
  // Vereist minimaal 2 performances (3+ sterk aanbevolen voor stabiliteit), met
  // AANTOONBAAR VERSCHILLENDE duren (anders is de regressie ongedefinieerd/instabiel).
  // Bij onvoldoende/ongeldige input: expliciete 'insufficient'/'invalid'-status,
  // NOOIT een verzonnen of laag-confidence-maar-toch-getoond resultaat.
  function criticalSpeed(performances) {
    if (!Array.isArray(performances)) return { status: 'invalid', reason: 'not_array' };
    var valid = performances.filter(function (p) {
      return p && isFinite(p.distance_m) && isFinite(p.duration_s) && p.distance_m > 0 && p.duration_s > 0;
    });
    if (valid.length < 2) return { status: 'insufficient', reason: 'min_2_performances_required', n: valid.length };
    var durations = valid.map(function (p) { return p.duration_s; });
    var uniqueDurations = durations.filter(function (v, i) { return durations.indexOf(v) === i; });
    if (uniqueDurations.length < 2) return { status: 'insufficient', reason: 'durations_not_distinct', n: valid.length };
    // Lineaire regressie: distance = CS*time + D' (kleinste-kwadraten op (time, distance)).
    var n = valid.length;
    var sumT = 0, sumD = 0, sumTT = 0, sumTD = 0;
    valid.forEach(function (p) {
      sumT += p.duration_s; sumD += p.distance_m;
      sumTT += p.duration_s * p.duration_s; sumTD += p.duration_s * p.distance_m;
    });
    var denom = (n * sumTT - sumT * sumT);
    if (denom === 0) return { status: 'insufficient', reason: 'degenerate_regression', n: n };
    var cs = (n * sumTD - sumT * sumD) / denom; // m/s
    var dPrime = (sumD - cs * sumT) / n; // m
    if (!isFinite(cs) || cs <= 0) return { status: 'invalid', reason: 'non_positive_cs' };
    // R² voor transparantie (geen aparte 'confidence'-fabricage, puur statistische fit).
    var meanD = sumD / n;
    var ssTot = 0, ssRes = 0;
    valid.forEach(function (p) {
      var pred = cs * p.duration_s + dPrime;
      ssRes += Math.pow(p.distance_m - pred, 2);
      ssTot += Math.pow(p.distance_m - meanD, 2);
    });
    var rSquared = (ssTot === 0) ? null : (1 - ssRes / ssTot);
    var confidence = (n >= 3 && rSquared != null && rSquared >= 0.95) ? 'hoog'
      : (n >= 2 && rSquared != null && rSquared >= 0.85) ? 'middel' : 'laag';
    return {
      status: 'valid', schema: 'critical_speed.v1',
      cs_m_s: cs, d_prime_m: (dPrime > 0 ? dPrime : 0),
      n_performances: n, r_squared: rSquared, confidence: confidence,
      // D' < 0 is fysiologisch onmogelijk (regressie-artefact bij te weinig/inconsistente data) —
      // op 0 geklemd voor weergave, maar de R²/confidence blijft het onderliggende signaal.
      limitations: 'Vereist genuine maximale-inspanningsprestaties (geen duurlopen); model is minder betrouwbaar buiten het 2-15 min-duurbereik; TK identificeert zelf geen tijdritten in trainingsgeschiedenis.'
    };
  }

  var CardioCore = {
    parseTime: parseTime,
    formatTime: formatTime,
    splitFromDistTime: splitFromDistTime,
    timeFromDistSplit: timeFromDistSplit,
    distFromTimeSplit: distFromTimeSplit,
    wattFromSplit500: wattFromSplit500,
    splitFromWatt500: splitFromWatt500,
    autoSplits: autoSplits,
    fromManualSplits: fromManualSplits,
    classifyNumericInput: classifyNumericInput,
    classifyTimeInput: classifyTimeInput,
    stationDurationS: stationDurationS,
    segmentTransitionS: segmentTransitionS,
    criticalSpeed: criticalSpeed,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CardioCore; }
  if (global) { global.CardioCore = CardioCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
