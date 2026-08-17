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

  var VERSIONS = { time: 'cardio_time.v1', split: 'cardio_split.v1', power: 'cardio_power.v1' };

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
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CardioCore; }
  if (global) { global.CardioCore = CardioCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
