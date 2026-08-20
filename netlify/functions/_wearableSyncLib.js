/* ==========================================================================
 * wearable-sync — PURE, TESTBARE HELPERS (geen fetch, geen secrets, geen PII).
 * Node CommonJS. Bevat uitsluitend deterministische logica die lokaal getest kan
 * worden: provenance-tag, per-datum row-bouw, schrijf-classificatie, datum-/slaap-
 * parsing, structurele diagnostiek (alleen KEYS, nooit waarden) en het canonieke
 * sync-resultaat. De echte Google-Health-fetch/Supabase-writes blijven in
 * wearable-sync.js (I/O), en zijn EXTERN BLOCKED zonder deploy/credentials.
 * ==========================================================================*/
'use strict';

/* ── NUMERIEKE COERCIE (proto3 int64 → JSON-string) ───────────────────────────
 * De Google Health API serialiseert int64/uint64-velden volgens de proto3-JSON-
 * mapping als STRING ("57"), niet als getal. `beatsPerMinute` (daily-resting-heart-
 * rate) is int64 → kwam binnen als "57" en werd door een strikte `typeof === number`-
 * check weggegooid (RHR parsed:0 terwijl fetched:8). HRV (double) en slaap (afgeleid
 * uit tijdstempels) zijn wél getallen, vandaar dat alleen RHR faalde.
 * toNum accepteert getal én numerieke string en geeft anders null (nooit fabriceren).
 * ────────────────────────────────────────────────────────────────────────────*/
function toNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'string') {
    var s = v.trim();
    if (!s) return null;
    if (!/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(s)) return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }
  return null;
}
// Eerste veld uit `keys` dat naar een eindig getal coerceert (volgorde = prioriteit).
function firstNum(rec, keys) {
  if (!rec) return null;
  for (var i = 0; i < keys.length; i++) {
    var n = toNum(rec[keys[i]]);
    if (n != null) return n;
  }
  return null;
}
// Defensief: PostgREST geeft bij een fout een OBJECT i.p.v. een array. `const [x] = obj`
// gooit dan een TypeError → generieke 500 "Serverfout". asArray voorkomt die klasse fouten.
function asArray(x) { return Array.isArray(x) ? x : []; }

function provenanceNote(existingNote) {
  var base = (existingNote == null ? '' : String(existingNote)).trim();
  if (/\[src:fitbit\]/i.test(base)) return base;
  if (!base) return '[src:fitbit]';
  return base + ' [src:fitbit]';
}

function contributed(vals) {
  vals = vals || {};
  return (vals.hrv != null) || (vals.rhr != null) || (vals.sleep != null);
}

function buildRow(date, userId, vals, existing) {
  vals = vals || {};
  var contrib = contributed(vals);
  var row = {
    date: date,
    user_id: userId,
    hrv:   vals.hrv   != null ? vals.hrv   : (existing ? existing.hrv   : null),
    rhr:   vals.rhr   != null ? vals.rhr   : (existing ? existing.rhr   : null),
    sleep: vals.sleep != null ? vals.sleep : (existing ? existing.sleep : null),
    note:  contrib ? provenanceNote(existing ? existing.note : null)
                   : (existing ? existing.note : null)
  };
  return { row: row, contributed: contrib, isUpdate: !!existing };
}

function classifyWrite(vals, hasExisting) {
  if (!contributed(vals)) return 'skipped';
  return hasExisting ? 'updated' : 'imported';
}

function dailyDateOf(point) {
  var d = point && point.date;
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  if (d.year && d.month && d.day) return d.year + '-' + String(d.month).padStart(2, '0') + '-' + String(d.day).padStart(2, '0');
  return null;
}
function sessionDateOf(point) {
  var iv = point && point.interval;
  var t = (iv && (iv.endTime || iv.civilEndTime)) || (point && point.endTime);
  return t ? String(t).split('T')[0] : null;
}
function sleepMinutesOf(point) {
  var s = point && point.sleep;
  var ms = firstNum(s && s.summary, ['totalDurationMillis']);
  if (ms == null) ms = firstNum(s, ['totalDurationMillis']);
  if (ms) return Math.round(ms / 60000);
  var sec = firstNum(s && s.summary, ['totalDurationSeconds']);
  if (sec == null) sec = firstNum(s, ['totalDurationSeconds']);
  if (sec) return Math.round(sec / 60);
  return null;
}

function _dateFrom(d) {
  if (d == null) return null;
  if (typeof d === 'string') return d.split('T')[0];
  if (d.year && d.month && d.day) return d.year + '-' + String(d.month).padStart(2, '0') + '-' + String(d.day).padStart(2, '0');
  return null;
}
function parseHrvPoint(point) {
  var rec = point && point.dailyHeartRateVariability; if (!rec) return null;
  var date = _dateFrom(rec.date) || _dateFrom(point && point.date);
  // RMSSD in ms. Volgorde = prioriteit; toNum accepteert ook de int64-als-string-vorm.
  var v = firstNum(rec, ['averageHeartRateVariabilityMilliseconds', 'rmssdMillis']);
  return { date: date, value: v };
}
function parseRhrPoint(point) {
  var rec = point && point.dailyRestingHeartRate; if (!rec) return null;
  var date = _dateFrom(rec.date) || _dateFrom(point && point.date);
  // `beatsPerMinute` is int64 → komt als STRING binnen (proto3-JSON). firstNum/toNum
  // vangt beide vormen. hrv_log.rhr is een integer-kolom → afronden vóór opslag.
  var v = firstNum(rec, ['averageBeatsPerMinute', 'beatsPerMinute', 'restingHeartRateBpm', 'bpm']);
  return { date: date, value: v == null ? null : Math.round(v) };
}
function parseSleepPoint(point) {
  var s = point && point.sleep; if (!s) return null;
  var iv = s.interval || (point && point.interval) || null;
  var date = _dateFrom(iv && (iv.endTime || iv.civilEndTime)) || _dateFrom(s.date) || _dateFrom(point && point.endTime);
  var min = null;
  var sum = s.summary;
  // Alle duurvelden kunnen int64-als-string zijn; firstNum coerceert veilig.
  var asleepMin = firstNum(sum, ['minutesAsleep', 'totalSleepMinutes']);
  var asleepMs  = firstNum(sum, ['totalSleepDurationMillis', 'totalDurationMillis']);
  if (asleepMin != null) min = Math.round(asleepMin);
  else if (asleepMs != null) min = Math.round(asleepMs / 60000);
  else if (iv && iv.startTime && iv.endTime) {
    var ms = Date.parse(iv.endTime) - Date.parse(iv.startTime);
    if (isFinite(ms) && ms > 0) min = Math.round(ms / 60000);
  }
  return { date: date, value: minutesToHours(min) };
}

function minutesToHours(min) {
  if (typeof min !== 'number' || !isFinite(min) || min <= 0) return null;
  return Math.round(min / 60 * 100) / 100;
}

function pointShape(point) {
  return (point && typeof point === 'object') ? Object.keys(point) : [];
}
// Structurele diagnostiek van sleep.summary — alleen KEYS, nooit waarden. Maakt
// zichtbaar of Google een echte "asleep"-duur levert of dat we op interval
// (= tijd in bed) terugvallen.
function sleepSummaryShape(point) {
  var sum = point && point.sleep && point.sleep.summary;
  return (sum && typeof sum === 'object') ? Object.keys(sum) : [];
}
function recordShape(point, recordKey) {
  var rec = point && point[recordKey];
  return (rec && typeof rec === 'object') ? Object.keys(rec) : [];
}

// Current calendar date in Europe/Amsterdam. Uses the IANA timezone database so
// CET/CEST transitions are handled correctly; no UTC-offset guessing.
function amsterdamToday(timestamp) {
  var ts = timestamp == null ? Date.now() : timestamp;
  var d = new Date(ts);
  if (!isFinite(d.getTime())) throw new TypeError('Invalid timestamp');
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  var out = {};
  parts.forEach(function (p) { if (p.type !== 'literal') out[p.type] = p.value; });
  return out.year + '-' + out.month + '-' + out.day;
}

// Pure summary for the Amsterdam "today" row. It deliberately exposes only
// availability/count information, never wearable values.
function todaySummary(byDate, todayDate) {
  byDate = byDate || {};
  var vals = byDate[todayDate] || {};
  var metrics = {
    hrv: vals.hrv != null,
    rhr: vals.rhr != null,
    sleep: vals.sleep != null
  };
  var available = metrics.hrv || metrics.rhr || metrics.sleep;
  return {
    date: todayDate,
    fetched: Object.prototype.hasOwnProperty.call(byDate, todayDate),
    metrics: metrics,
    available: available
  };
}

function syncResult(counts) {
  counts = counts || {};
  var imported = counts.imported || 0, updated = counts.updated || 0, skipped = counts.skipped || 0;
  var status = (imported + updated > 0) ? 'success' : 'no_new_data';
  return {
    provider: 'fitbit', status: status,
    imported: imported, updated: updated, skipped: skipped,
    daysWritten: imported + updated,
    synced: true
  };
}

module.exports = {
  toNum: toNum, firstNum: firstNum, asArray: asArray, sleepSummaryShape: sleepSummaryShape,
  provenanceNote: provenanceNote, contributed: contributed, buildRow: buildRow,
  classifyWrite: classifyWrite, dailyDateOf: dailyDateOf, sessionDateOf: sessionDateOf,
  sleepMinutesOf: sleepMinutesOf, minutesToHours: minutesToHours, pointShape: pointShape, recordShape: recordShape,
  amsterdamToday: amsterdamToday, todaySummary: todaySummary, syncResult: syncResult,
  parseHrvPoint: parseHrvPoint, parseRhrPoint: parseRhrPoint, parseSleepPoint: parseSleepPoint
};
