/* ==========================================================================
 * wearable-sync — PURE, TESTBARE HELPERS (geen fetch, geen secrets, geen PII).
 * Node CommonJS. Bevat uitsluitend deterministische logica die lokaal getest kan
 * worden: provenance-tag, per-datum row-bouw, schrijf-classificatie, datum-/slaap-
 * parsing, structurele diagnostiek (alleen KEYS, nooit waarden) en het canonieke
 * sync-resultaat. De echte Google-Health-fetch/Supabase-writes blijven in
 * wearable-sync.js (I/O), en zijn EXTERN BLOCKED zonder deploy/credentials.
 * ==========================================================================*/
'use strict';

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
  var ms = (s && s.summary && s.summary.totalDurationMillis) != null ? s.summary.totalDurationMillis
         : (s && s.totalDurationMillis);
  if (ms) return Math.round(ms / 60000);
  var sec = (s && s.summary && s.summary.totalDurationSeconds) != null ? s.summary.totalDurationSeconds
          : (s && s.totalDurationSeconds);
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
  var v = (rec.averageHeartRateVariabilityMilliseconds != null) ? rec.averageHeartRateVariabilityMilliseconds
        : (rec.rmssdMillis != null ? rec.rmssdMillis : null);
  return { date: date, value: (typeof v === 'number' && isFinite(v)) ? v : null };
}
function parseRhrPoint(point) {
  var rec = point && point.dailyRestingHeartRate; if (!rec) return null;
  var date = _dateFrom(rec.date) || _dateFrom(point && point.date);
  var v = (rec.averageBeatsPerMinute != null) ? rec.averageBeatsPerMinute
        : (rec.beatsPerMinute != null ? rec.beatsPerMinute
        : (rec.restingHeartRateBpm != null ? rec.restingHeartRateBpm
        : (rec.bpm != null ? rec.bpm : null)));
  return { date: date, value: (typeof v === 'number' && isFinite(v)) ? v : null };
}
function parseSleepPoint(point) {
  var s = point && point.sleep; if (!s) return null;
  var iv = s.interval || (point && point.interval) || null;
  var date = _dateFrom(iv && (iv.endTime || iv.civilEndTime)) || _dateFrom(s.date) || _dateFrom(point && point.endTime);
  var min = null;
  var sum = s.summary;
  if (sum && sum.minutesAsleep != null) min = Math.round(sum.minutesAsleep);
  else if (sum && sum.totalSleepMinutes != null) min = Math.round(sum.totalSleepMinutes);
  else if (sum && sum.totalDurationMillis != null) min = Math.round(sum.totalDurationMillis / 60000);
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
  provenanceNote: provenanceNote, contributed: contributed, buildRow: buildRow,
  classifyWrite: classifyWrite, dailyDateOf: dailyDateOf, sessionDateOf: sessionDateOf,
  sleepMinutesOf: sleepMinutesOf, minutesToHours: minutesToHours, pointShape: pointShape, recordShape: recordShape,
  amsterdamToday: amsterdamToday, todaySummary: todaySummary, syncResult: syncResult,
  parseHrvPoint: parseHrvPoint, parseRhrPoint: parseRhrPoint, parseSleepPoint: parseSleepPoint
};
