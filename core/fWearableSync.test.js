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
const rWear = L.buildRow('2026-08-17', 'u1', { hrv:42, rhr:54, sleep:7.5 }, null);
eq(rWear.row.hrv, 42, 'row: wearable HRV 42');
ok(/\[src:fitbit\]/.test(rWear.row.note), 'row: wearable-bijdrage → [src:fitbit]-tag');
eq(rWear.isUpdate, false, 'row: geen bestaande → insert');
// wearable vult aan op bestaande handmatige rij; wearable-waarde wint, ontbrekende blijft handmatig
const rMerge = L.buildRow('2026-08-17', 'u1', { hrv:42, rhr:null, sleep:null }, { id:9, hrv:29, rhr:58, sleep:7.2, note:'ochtend' });
eq(rMerge.row.hrv, 42, 'merge: wearable-HRV wint van handmatig');
eq(rMerge.row.rhr, 58, 'merge: ontbrekende wearable-RHR valt terug op handmatig 58 (geen 0/fabricage)');
eq(rMerge.row.sleep, 7.2, 'merge: ontbrekende wearable-slaap valt terug op handmatig');
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
eq(rSleep.value, 7.5, 'PS3: slaapduur uit interval (23:00→06:30 = 450 min) → 7,5 uur');
eq(rSleep.date, '2026-08-17', 'PS3: slaapdatum = einddatum interval (ochtend)');
// officiële summary.minutesAsleep wint indien aanwezig
eq(L.parseSleepPoint({ sleep:{ interval:{ startTime:'2026-08-16T23:00:00Z', endTime:'2026-08-17T07:00:00Z' }, summary:{ minutesAsleep: 415 } } }).value, 6.92, 'PS4: summary.minutesAsleep (415 min) wint en wordt 6,92 uur');
// malformed/missing nested value → value null (skipped, geen fabricatie)
eq(L.parseHrvPoint({ dataSource:'x', dailyHeartRateVariability: { date:{year:2026,month:8,day:17} } }).value, null, 'PS5: HRV zonder waarde → null (skipped)');
eq(L.parseHrvPoint({ dataSource:'x', SOMETHING_ELSE:{} }), null, 'PS6: geen HRV-record → null');
eq(L.parseSleepPoint({ sleep:{} }).value, null, 'PS7: slaap zonder interval/summary → null (geen fabricatie)');

// ── sleep_unit.v1 — hrv_log.sleep is canoniek DECIMALE UREN ────────────────────
eq(L.minutesToHours(468), 7.8,  'U1: 7u48m (468 min) → 7,8 uur');
eq(L.minutesToHours(432), 7.2,  'U2: 7u12m (432 min) → 7,2 uur');
eq(L.minutesToHours(450), 7.5,  'U3: 450 min → 7,5 uur');
eq(L.minutesToHours(0),   null, 'U4: 0 min → null (geen fabricage)');
eq(L.minutesToHours(null),null, 'U5: null blijft null');
eq(L.buildRow('2026-08-17','u1',{hrv:null,rhr:null,sleep:7.8},null).row.sleep, 7.8,
   'U6: de sync schrijft uren, nooit minuten');
// ISO-string date (alternatief) blijft werken
eq(L.parseHrvPoint({ dailyHeartRateVariability:{ date:'2026-08-15T00:00:00Z', averageHeartRateVariabilityMilliseconds:40 } }).date, '2026-08-15', 'PS8: HRV date als ISO-string ook ondersteund');
// legacy fallback (backward-compat met oude S1-vorm): top-level date + rmssdMillis
eq(L.parseHrvPoint({ date:'2026-08-14', dailyHeartRateVariability:{ rmssdMillis:38 } }).value, 38, 'PS9: legacy rmssdMillis-fallback behouden');
eq(L.parseHrvPoint({ date:'2026-08-14', dailyHeartRateVariability:{ rmssdMillis:38 } }).date, '2026-08-14', 'PS9: legacy top-level date-fallback behouden');


// ── INCIDENT 18-08-2026 — int64-als-JSON-string (proto3-mapping) ──────────────
// De Google Health API gaf 8 daily-resting-heart-rate-datapunten (http 200,
// fetched.rhr=8) maar parsed.rhr bleef 0. Oorzaak: `beatsPerMinute` is int64 en
// wordt volgens de proto3-JSON-mapping als STRING geserialiseerd ("57"); de oude
// `typeof v === 'number'`-guard gooide die waarde weg. HRV (double) en slaap
// (afgeleid uit tijdstempels) waren wél getallen — vandaar dat alléén RHR faalde.
eq(L.toNum(57), 57, 'N1: getal blijft getal');
eq(L.toNum('57'), 57, 'N2: int64-als-string wordt getal');
eq(L.toNum(' 57 '), 57, 'N3: spaties rond de string');
eq(L.toNum('28.5'), 28.5, 'N4: decimale string');
eq(L.toNum('abc'), null, 'N5: niet-numerieke string → null (nooit fabriceren)');
eq(L.toNum('12px'), null, 'N6: half-numerieke string → null');
eq(L.toNum(''), null, 'N7: lege string → null');
eq(L.toNum(null), null, 'N8: null blijft null');
eq(L.toNum(NaN), null, 'N9: NaN → null');
eq(L.toNum(Infinity), null, 'N10: Infinity → null');
eq(L.toNum({}), null, 'N11: object → null');

// EXACTE productie-shape uit de live diag: ["date","beatsPerMinute","dailyRestingHeartRateMetadata"]
const rhrLive = L.parseRhrPoint({ dataSource:'d', dailyRestingHeartRate:{ date:{year:2026,month:8,day:18}, beatsPerMinute:'57', dailyRestingHeartRateMetadata:{ calculationMethod:'WITH_SLEEP' } } });
eq(rhrLive.value, 57, 'R1: RHR uit int64-string "57" wordt 57 (dit was de parsed.rhr=0-bug)');
eq(rhrLive.date, '2026-08-18', 'R1: RHR-datum uit het geneste date-object');
eq(L.parseRhrPoint({ dailyRestingHeartRate:{ date:'2026-08-18', beatsPerMinute:57 } }).value, 57, 'R2: numerieke vorm blijft werken');
eq(L.parseRhrPoint({ dailyRestingHeartRate:{ date:'2026-08-18', beatsPerMinute:56.6 } }).value, 57, 'R3: hrv_log.rhr is integer → afgerond');
eq(L.parseRhrPoint({ dailyRestingHeartRate:{ date:'2026-08-18', beatsPerMinute:'onzin' } }).value, null, 'R4: onbruikbare waarde → null (skipped, niet 0)');
eq(L.parseRhrPoint({ dailyRestingHeartRate:{ date:'2026-08-18' } }).value, null, 'R5: geen waarde → null');

// HRV en slaap moeten dezelfde coercie krijgen (dezelfde klasse fout kan daar ontstaan)
eq(L.parseHrvPoint({ dailyHeartRateVariability:{ date:'2026-08-18', averageHeartRateVariabilityMilliseconds:'28.5' } }).value, 28.5, 'H1: HRV als string wordt getal');
eq(L.parseSleepPoint({ sleep:{ interval:{ endTime:'2026-08-18T06:30:00Z' }, summary:{ minutesAsleep:'415' } } }).value, 6.92, 'S1: minutesAsleep als string → 6,92 uur');
eq(L.parseSleepPoint({ sleep:{ interval:{ endTime:'2026-08-18T06:30:00Z' }, summary:{ totalSleepDurationMillis:'27000000' } } }).value, 7.5, 'S2: totalSleepDurationMillis (int64-string) → 7,5 uur');

// Structurele diagnostiek: alleen KEYS, nooit waarden
eq(L.sleepSummaryShape({ sleep:{ summary:{ minutesAsleep:415, stages:{} } } }), ['minutesAsleep','stages'], 'D1: sleepSummaryShape geeft uitsluitend keys');
eq(L.sleepSummaryShape({ sleep:{} }), [], 'D2: geen summary → lege lijst');

// asArray: PostgREST-foutobject mag geen TypeError (→ generieke 500 "Serverfout") geven
eq(L.asArray([{a:1}]).length, 1, 'A1: array blijft array');
eq(L.asArray({ code:'PGRST301', message:'x' }), [], 'A2: PostgREST-foutobject → lege array i.p.v. crash');
eq(L.asArray(null), [], 'A3: null → lege array');

console.log('\nwearable-sync PURE helpers: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
