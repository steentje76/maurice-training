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

console.log('\nwearable-sync PURE helpers: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
