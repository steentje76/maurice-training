/* ==========================================================================
 * wearable-sync — PURE, TESTBARE HELPERS (geen fetch, geen secrets, geen PII).
 * Node CommonJS. Bevat uitsluitend deterministische logica die lokaal getest kan
 * worden: provenance-tag, per-datum row-bouw, schrijf-classificatie, datum-/slaap-
 * parsing, structurele diagnostiek (alleen KEYS, nooit waarden) en het canonieke
 * sync-resultaat. De echte Google-Health-fetch/Supabase-writes blijven in
 * wearable-sync.js (I/O), en zijn EXTERN BLOCKED zonder deploy/credentials.
 * ==========================================================================*/
'use strict';

// Markeer een hrv_log-rij als Fitbit/Google-Health-afkomstig, zodat de client 'Fitbit' toont
// (client leest [src:fitbit] uit note). Behoudt bestaande (handmatige) note-tekst; voegt de tag
// éénmalig toe (idempotent). ALLEEN aanroepen wanneer de sync ≥1 wearable-waarde naar de rij schrijft.
function provenanceNote(existingNote) {
  var base = (existingNote == null ? '' : String(existingNote)).trim();
  if (/\[src:fitbit\]/i.test(base)) return base;          // al getagd → niet verdubbelen
  if (!base) return '[src:fitbit]';
  return base + ' [src:fitbit]';
}

// Heeft de wearable voor deze datum minstens één echte waarde geleverd?
function contributed(vals) {
  vals = vals || {};
  return (vals.hrv != null) || (vals.rhr != null) || (vals.sleep != null);
}

// Bouw de hrv_log-row voor één datum. Wearable-waarden WINNEN; ontbrekend valt terug op de
// bestaande (evt. handmatige) rij — geen fabricage, geen 0. Tag alleen als de wearable bijdroeg.
// Zo blijft een puur-handmatige dag 'Check-in' en wordt een dag met echte wearable-data 'Fitbit'.
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

// Eerlijke telling per datum: imported (nieuw), updated (bestaande bijgewerkt) of skipped (geen waarde).
function classifyWrite(vals, hasExisting) {
  if (!contributed(vals)) return 'skipped';
  return hasExisting ? 'updated' : 'imported';
}

// ── DATUM-/SLAAP-PARSING (identiek aan de function; puur) ──
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

// ── PRODUCTIE-SHAPE PARSERS (echte Google-Health nested records) ──────────────────────
// De LIVE productie-log bewees dat datum ÉN waarde GENEST zitten in het record-object
// (dailyHeartRateVariability / dailyRestingHeartRate / sleep), NIET top-level. De oude parser
// las top-level `point.date` (bestaat niet) → elk punt viel weg vóór de waarde → parsed:0.
// Primair de OFFICIËLE veldnamen; per veld één gedocumenteerde legacy-fallback (backward-compat) —
// GEEN "try everything". Ontbrekend/onbruikbaar → value null (→ skipped, nooit gefabriceerd).
// Officiële velden (Google Health API v4):
//   HRV  : dailyHeartRateVariability.date + .averageHeartRateVariabilityMilliseconds
//   RHR  : dailyRestingHeartRate.date + .beatsPerMinute
//   Sleep: sleep.interval{startTime,endTime} (physical time) + sleep.summary (duur indien aanwezig)
function _dateFrom(d) {
  if (d == null) return null;
  if (typeof d === 'string') return d.split('T')[0];
  if (d.year && d.month && d.day) return d.year + '-' + String(d.month).padStart(2, '0') + '-' + String(d.day).padStart(2, '0');
  return null;
}
function parseHrvPoint(point) {
  var rec = point && point.dailyHeartRateVariability; if (!rec) return null;
  var date = _dateFrom(rec.date) || _dateFrom(point && point.date); // primair genest; legacy top-level
  var v = (rec.averageHeartRateVariabilityMilliseconds != null) ? rec.averageHeartRateVariabilityMilliseconds
        : (rec.rmssdMillis != null ? rec.rmssdMillis : null);                    // legacy-fallback
  return { date: date, value: (typeof v === 'number' && isFinite(v)) ? v : null };
}
function parseRhrPoint(point) {
  var rec = point && point.dailyRestingHeartRate; if (!rec) return null;
  var date = _dateFrom(rec.date) || _dateFrom(point && point.date);
  // FIX (parsed.rhr=0): Google Health dag-aggregaat gebruikt de "average<Metric>"-conventie —
  // net als HRV (averageHeartRateVariabilityMilliseconds). De oude `beatsPerMinute` matchte niet.
  // Primair `averageBeatsPerMinute`; daarna gedocumenteerde varianten. Geen "try everything".
  var v = (rec.averageBeatsPerMinute != null) ? rec.averageBeatsPerMinute
        : (rec.beatsPerMinute != null ? rec.beatsPerMinute
        : (rec.restingHeartRateBpm != null ? rec.restingHeartRateBpm
        : (rec.bpm != null ? rec.bpm : null)));
  return { date: date, value: (typeof v === 'number' && isFinite(v)) ? v : null };
}
function parseSleepPoint(point) {
  var s = point && point.sleep; if (!s) return null;
  var iv = s.interval || (point && point.interval) || null;
  // slaapnacht hoort bij de OCHTEND → einddatum van het interval
  var date = _dateFrom(iv && (iv.endTime || iv.civilEndTime)) || _dateFrom(s.date) || _dateFrom(point && point.endTime);
  var min = null;
  var sum = s.summary;
  if (sum && sum.minutesAsleep != null) min = Math.round(sum.minutesAsleep);            // officieel indien aanwezig
  else if (sum && sum.totalSleepMinutes != null) min = Math.round(sum.totalSleepMinutes);
  else if (sum && sum.totalDurationMillis != null) min = Math.round(sum.totalDurationMillis / 60000);
  else if (iv && iv.startTime && iv.endTime) {                                          // deterministisch uit interval
    var ms = Date.parse(iv.endTime) - Date.parse(iv.startTime);
    if (isFinite(ms) && ms > 0) min = Math.round(ms / 60000);
  }
  // hrv_log.sleep is canoniek DECIMALE UREN (de check-in schrijft dat al zo). De provider
  // levert minuten; die worden hier omgerekend zodat er nooit meer twee eenheden in één
  // kolom terechtkomen. Bestaande rijen blijven ongemoeid — die vangt de leeslaag op.
  return { date: date, value: minutesToHours(min) };
}

// Minuten → decimale uren, op twee decimalen. Geen fabricage: null blijft null.
function minutesToHours(min) {
  if (typeof min !== 'number' || !isFinite(min) || min <= 0) return null;
  return Math.round(min / 60 * 100) / 100;
}

// Structurele diagnostiek: top-level keys van een datapoint (GEEN waarden, geen PII, geen
// gezondheidsgetallen) — onthult welke veldstructuur de echte API teruggeeft, zodat na één
// live sync de juiste veldpaden bevestigd kunnen worden zonder ooit waarden te loggen.
function pointShape(point) {
  return (point && typeof point === 'object') ? Object.keys(point) : [];
}
// GENESTE structuur-diagnostiek: keys van het geneste record (bv. dailyRestingHeartRate) — ALLEEN keys,
// geen waarden. Onthult de exacte leaf-veldnaam zodat een live sync het definitief bevestigt zonder PII.
function recordShape(point, recordKey) {
  var rec = point && point[recordKey];
  return (rec && typeof rec === 'object') ? Object.keys(rec) : [];
}

// Canoniek sync-resultaat uit tellingen (past 1-op-1 op DeviceCore.parseSyncResponse aan de client).
// success ALLEEN als er daadwerkelijk iets is geschreven; anders no_new_data. Nooit fake success.
function syncResult(counts) {
  counts = counts || {};
  var imported = counts.imported || 0, updated = counts.updated || 0, skipped = counts.skipped || 0;
  var status = (imported + updated > 0) ? 'success' : 'no_new_data';
  return {
    provider: 'fitbit', status: status,
    imported: imported, updated: updated, skipped: skipped,
    daysWritten: imported + updated,   // backward-compat met de bestaande client
    synced: true
  };
}

module.exports = {
  provenanceNote: provenanceNote, contributed: contributed, buildRow: buildRow,
  classifyWrite: classifyWrite, dailyDateOf: dailyDateOf, sessionDateOf: sessionDateOf,
  sleepMinutesOf: sleepMinutesOf, minutesToHours: minutesToHours, pointShape: pointShape, recordShape: recordShape, syncResult: syncResult,
  // productie-shape parsers (nested Google-Health records)
  parseHrvPoint: parseHrvPoint, parseRhrPoint: parseRhrPoint, parseSleepPoint: parseSleepPoint
};
