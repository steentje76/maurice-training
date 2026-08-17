/* wearable-sync PURE helpers (netlify/functions/_wearableSyncLib.js) — provenance-tag,
 * row-bouw, schrijf-classificatie, datum-/slaap-parsing, canoniek sync-resultaat.
 * De echte Google-Health-fetch/Supabase-write is I/O (EXTERN BLOCKED); hier testen we de
 * deterministische logica die de "0 dagen / verkeerde bron"-bugs repareert.
 * Draai: node core/fWearableSync.test.js
 */
const L = require('../netlify/functions/_wearableSyncLib.js');

let pass = 0, fail = 0;
function eq(a, b, m){ if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

// ── PROVENANCE-TAG (repareert verkeerde bron: server schreef "Fitbit (auto-sync)" i.p.v. [src:fitbit]) ──
eq(L.provenanceNote(null), '[src:fitbit]', 'lege note → [src:fitbit]');
eq(L.provenanceNote(''), '[src:fitbit]', 'leeg string → [src:fitbit]');
eq(L.provenanceNote('ochtend'), 'ochtend [src:fitbit]', 'handmatige note behouden + tag toegevoegd');
eq(L.provenanceNote('x [src:fitbit]'), 'x [src:fitbit]', 'idempotent: bestaande tag niet verdubbeld');
ok(/\[src:fitbit\]/i.test(L.provenanceNote('Fitbit (auto-sync)')), 'oude "Fitbit (auto-sync)" krijgt nu de leesbare tag');

// ── ROW-BOUW: wearable wint, tag alleen bij bijdrage, handmatig behouden ──
const rWear = L.buildRow('2026-08-17', 'u1', { hrv:42, rhr:54, sleep:450 }, null);
eq(rWear.row.hrv, 42, 'row: wearable HRV 42');
ok(/\[src:fitbit\]/.test(rWear.row.note), 'row: wearable-bijdrage → [src:fitbit]-tag');
eq(rWear.isUpdate, false, 'row: geen bestaande → insert');
// wearable vult aan op bestaande handmatige rij; wearable-waarde wint, ontbrekende blijft handmatig
const rMerge = L.buildRow('2026-08-17', 'u1', { hrv:42, rhr:null, sleep:null }, { id:9, hrv:29, rhr:58, sleep:432, note:'ochtend' });
eq(rMerge.row.hrv, 42, 'merge: wearable-HRV wint van handmatig');
eq(rMerge.row.rhr, 58, 'merge: ontbrekende wearable-RHR valt terug op handmatig 58 (geen 0/fabricage)');
eq(rMerge.row.sleep, 432, 'merge: ontbrekende wearable-slaap valt terug op handmatig');
ok(/ochtend/.test(rMerge.row.note) && /\[src:fitbit\]/.test(rMerge.row.note), 'merge: handmatige note behouden + tag toegevoegd');
eq(rMerge.isUpdate, true, 'merge: bestaande → update');
// puur handmatige update zonder enige wearable-waarde → GEEN tag (blijft "Check-in")
const rNoContrib = L.buildRow('2026-08-16', 'u1', { hrv:null, rhr:null, sleep:null }, { id:8, hrv:29, note:'check-in' });
eq(rNoContrib.contributed, false, 'geen wearable-waarde → contributed false');
ok(!/\[src:fitbit\]/.test(String(rNoContrib.row.note)), 'geen bijdrage → geen Fitbit-tag (blijft Check-in)');

// ── SCHRIJF-CLASSIFICATIE (eerlijke telling imported/updated/skipped) ──
eq(L.classifyWrite({ hrv:42 }, false), 'imported', 'nieuw + waarde → imported');
eq(L.classifyWrite({ hrv:42 }, true), 'updated', 'bestaand + waarde → updated');
eq(L.classifyWrite({ hrv:null, rhr:null, sleep:null }, true), 'skipped', 'geen waarde → skipped');

// ── DATUM-/SLAAP-PARSING ──
eq(L.dailyDateOf({ date: '2026-08-17T00:00:00Z' }), '2026-08-17', 'daily date string');
eq(L.dailyDateOf({ date: { year:2026, month:8, day:7 } }), '2026-08-07', 'daily date object (padding)');
eq(L.dailyDateOf({}), null, 'daily geen date → null');
eq(L.sessionDateOf({ interval:{ endTime:'2026-08-17T06:30:00Z' } }), '2026-08-17', 'session einddatum');
eq(L.sleepGuard = L.sleepMinutesOf({ sleep:{ summary:{ totalDurationMillis: 27000000 } } }), 450, 'slaap 27000000ms → 450 min');
eq(L.sleepMinutesOf({ sleep:{ totalDurationSeconds: 27000 } }), 450, 'slaap 27000s → 450 min');
eq(L.sleepMinutesOf({ sleep:{} }), null, 'slaap onbekend → null (geen fabricage)');

// ── STRUCTURELE DIAGNOSTIEK (alleen keys, geen waarden) ──
ok(L.pointShape({ date:'x', dailyHeartRateVariability:{} }).indexOf('dailyHeartRateVariability') !== -1, 'pointShape geeft top-level keys (onthult veldstructuur)');
eq(L.pointShape(null), [], 'pointShape(null) → []');

// ── CANONIEK SYNC-RESULTAAT (OAuth-succes ≠ data-succes) ──
const s0 = L.syncResult({ imported:0, updated:0, skipped:3 });
eq(s0.status, 'no_new_data', '0 geschreven → no_new_data (geen fake success)');
eq(s0.daysWritten, 0, '0 geschreven → daysWritten 0 (backward-compat)');
const s3 = L.syncResult({ imported:2, updated:1, skipped:0 });
eq(s3.status, 'success', '3 geschreven → success');
eq(s3.daysWritten, 3, 'daysWritten = imported+updated = 3');
eq(s3.provider, 'fitbit', 'provider fitbit');

// ── PRODUCTIE-SHAPE PARSERS (echte Google-Health nested records — live-log bewees parsed:0) ──
// De live-shape: HRV=[dataSource,dailyHeartRateVariability], RHR=[dataSource,dailyRestingHeartRate],
// Sleep=[name,dataSource,sleep]. Datum + waarde zitten GENEST, niet top-level.
const hrvPoint = { dataSource:'x', dailyHeartRateVariability: { date:{year:2026,month:8,day:17}, averageHeartRateVariabilityMilliseconds: 42 } };
const rHrv = L.parseHrvPoint(hrvPoint);
eq(rHrv.value, 42, 'PS1: HRV genest averageHeartRateVariabilityMilliseconds=42');
eq(rHrv.date, '2026-08-17', 'PS1: HRV datum uit genest date-object {year,month,day}');
// RHR-FIX: dag-aggregaat gebruikt averageBeatsPerMinute (net als HRV averageHeartRateVariabilityMilliseconds)
const rhrPoint = { dataSource:'x', dailyRestingHeartRate: { date:{year:2026,month:8,day:17}, averageBeatsPerMinute: 54 } };
const rRhr = L.parseRhrPoint(rhrPoint);
eq(rRhr.value, 54, 'PS2: RHR genest averageBeatsPerMinute=54 (parsed.rhr=0-fix)');
eq(rRhr.date, '2026-08-17', 'PS2: RHR datum uit genest date');
eq(L.parseRhrPoint({ dailyRestingHeartRate:{ date:'2026-08-16', beatsPerMinute:56 } }).value, 56, 'PS2b: legacy beatsPerMinute-fallback behouden');
eq(L.parseRhrPoint({ dataSource:'x', dailyRestingHeartRate:{ date:{year:2026,month:8,day:17} } }).value, null, 'PS2c: RHR zonder waarde → null (geen fabricage)');
// geneste structuur-diagnostiek (alleen keys)
ok(L.recordShape(rhrPoint,'dailyRestingHeartRate').indexOf('averageBeatsPerMinute')!==-1, 'PS2d: recordShape onthult geneste RHR-leaf-keys (geen waarden)');
const sleepPoint = { name:'n', dataSource:'x', sleep: { interval: { startTime:'2026-08-16T23:00:00Z', endTime:'2026-08-17T06:30:00Z' } } };
const rSleep = L.parseSleepPoint(sleepPoint);
eq(rSleep.value, 450, 'PS3: slaapduur deterministisch uit interval (23:00→06:30 = 450 min)');
eq(rSleep.date, '2026-08-17', 'PS3: slaapdatum = einddatum interval (ochtend)');
// officiële summary.minutesAsleep wint indien aanwezig
eq(L.parseSleepPoint({ sleep:{ interval:{ startTime:'2026-08-16T23:00:00Z', endTime:'2026-08-17T07:00:00Z' }, summary:{ minutesAsleep: 415 } } }).value, 415, 'PS4: summary.minutesAsleep wint van interval-berekening');
// malformed/missing nested value → value null (skipped, geen fabricatie)
eq(L.parseHrvPoint({ dataSource:'x', dailyHeartRateVariability: { date:{year:2026,month:8,day:17} } }).value, null, 'PS5: HRV zonder waarde → null (skipped)');
eq(L.parseHrvPoint({ dataSource:'x', SOMETHING_ELSE:{} }), null, 'PS6: geen HRV-record → null');
eq(L.parseSleepPoint({ sleep:{} }).value, null, 'PS7: slaap zonder interval/summary → null (geen fabricatie)');
// ISO-string date (alternatief) blijft werken
eq(L.parseHrvPoint({ dailyHeartRateVariability:{ date:'2026-08-15T00:00:00Z', averageHeartRateVariabilityMilliseconds:40 } }).date, '2026-08-15', 'PS8: HRV date als ISO-string ook ondersteund');
// legacy fallback (backward-compat met oude S1-vorm): top-level date + rmssdMillis
eq(L.parseHrvPoint({ date:'2026-08-14', dailyHeartRateVariability:{ rmssdMillis:38 } }).value, 38, 'PS9: legacy rmssdMillis-fallback behouden');
eq(L.parseHrvPoint({ date:'2026-08-14', dailyHeartRateVariability:{ rmssdMillis:38 } }).date, '2026-08-14', 'PS9: legacy top-level date-fallback behouden');

// ── TODAY-SEMANTIEK (Europe/Amsterdam) ──
// zomertijd: 23:30 UTC op 16-08 = 01:30 Amsterdam op 17-08 → today MOET 17-08 zijn (niet 16 zoals UTC)
eq(L.amsterdamToday(Date.UTC(2026, 7, 16, 23, 30)), '2026-08-17', 'TZ1: 23:30 UTC → Amsterdam vandaag = 17-08 (niet UTC-16)');
eq(L.amsterdamToday(Date.UTC(2026, 7, 17, 9, 33)), '2026-08-17', 'TZ2: 09:33 UTC → Amsterdam 17-08');
// wintertijd (UTC+1): 23:30 UTC 15-01 = 00:30 Amsterdam 16-01
eq(L.amsterdamToday(Date.UTC(2026, 0, 15, 23, 30)), '2026-01-16', 'TZ3: wintertijd off-by-one correct');

// todaySummary: onderscheidt fetched (datapunt bestond) vs parsed (bruikbare waarde) → classificeert A/B/C
var _T = '2026-08-17';
var sA = L.todaySummary({ '2026-08-16': { hrv: 29, rhr: 58, sleep: 432 } }, _T);
eq(sA.available, false, 'TS-A: geen vandaag-data → available=false');
eq(sA.fetched.hrv, false, 'TS-A: fetched.hrv=false (upstream heeft vandaag niet → classificatie A)');
var sB = L.todaySummary({ '2026-08-17': { hrv: null, rhr: null } }, _T);
eq(sB.fetched.hrv, true, 'TS-B: fetched.hrv=true (datapunt bestond)');
eq(sB.metrics.hrv, false, 'TS-B: parsed.hrv=false → classificatie B (veldnaam/parser)');
eq(sB.available, false, 'TS-B: geen bruikbare waarde → available=false');
var sC = L.todaySummary({ '2026-08-17': { hrv: 31, rhr: null, sleep: 420 } }, _T);
eq(sC.available, true, 'TS-C: vandaag heeft data → available=true');
eq(sC.metrics.hrv, true, 'TS-C: metrics.hrv=true');
eq(sC.metrics.rhr, false, 'TS-C: metrics.rhr=false (rhr ontbreekt vandaag)');
eq(sC.metrics.sleep, true, 'TS-C: metrics.sleep=true');
eq(sC.date, _T, 'TS-C: datum = Amsterdamse vandaag');

console.log('\nwearable-sync PURE helpers: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
