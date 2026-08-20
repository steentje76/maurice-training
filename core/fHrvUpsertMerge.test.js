/* fHrvUpsertMerge — REGRESSIETEST voor de dataverlies-bug van 18-08-2026.
 *
 * SYMPTOOM: na een geslaagde Fitbit-sync (hrv+slaap gevuld) vulde de gebruiker in de
 * check-in ALLEEN de rusthartslag in. Er ontstond een TWEEDE hrv_log-rij voor dezelfde
 * dag met hrv=null en sleep=null. Alle schermen lezen
 * `order=date.desc,created_at.desc&limit=1` en pakten die nieuwste, half-lege rij →
 * HRV en slaap leken gewist en de dagfactor werd op onvolledige data berekend.
 *
 * BEWAAKT: tkMergeHealthRow (in index.html) mag NOOIT een bestaande waarde met null
 * overschrijven, en moet de [src:fitbit]-provenance behouden.
 * De functie wordt uit index.html geëxtraheerd zodat de test de ECHTE productiecode
 * meet en niet een kopie die uit de pas kan lopen.
 * Draai: node core/fHrvUpsertMerge.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } };
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function tkMergeHealthRow(');
if (start === -1) { console.log('  ✗ tkMergeHealthRow niet gevonden in index.html'); process.exit(1); }
// Balanceer de accolades vanaf de eerste '{' zodat we exact één functie pakken.
const open = html.indexOf('{', start);
let depth = 0, end = -1;
for (let i = open; i < html.length; i++) {
  if (html[i] === '{') depth++;
  else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const src = html.slice(start, end);
const tkMergeHealthRow = new Function(src + '; return tkMergeHealthRow;')();

console.log('\n[fHrvUpsertMerge] check-in mag gesynchroniseerde wearable-data niet wissen');

// 1) HET INCIDENT: Fitbit-rij bestaat, gebruiker vult alleen RHR in.
const fitbitRow = { id: 'x', date: '2026-08-18', hrv: 28.5, rhr: null, sleep: 6.07, cyclus_fase: null, edema: null, note: '[src:fitbit]' };
let m = tkMergeHealthRow(fitbitRow, { hrv: null, rhr: 57, sleep: null, cyclus_fase: null, edema: null, note: null });
eq(m.hrv, 28.5, 'HRV van de sync blijft staan bij een RHR-only check-in');
eq(m.sleep, 6.07, 'Slaap van de sync blijft staan bij een RHR-only check-in');
eq(m.rhr, 57, 'Handmatige RHR wordt overgenomen');
eq(m.note, '[src:fitbit]', 'Provenance-tag blijft behouden');

// 2) Omgekeerd: handmatige rij bestaat, sync vult later aan (geen verlies andersom).
m = tkMergeHealthRow({ hrv: null, rhr: 57, sleep: null, note: null }, { hrv: 28.5, sleep: 6.07, rhr: null, note: null });
eq([m.hrv, m.rhr, m.sleep], [28.5, 57, 6.07], 'Aanvullen in beide richtingen zonder verlies');

// 3) Notitie + provenance: handmatige tekst wist de wearable-herkomst niet.
m = tkMergeHealthRow({ hrv: 28.5, note: 'iets [src:fitbit]' }, { note: 'Moe' });
ok(/\[src:fitbit\]/.test(m.note), 'Nieuwe notitie behoudt [src:fitbit]');
ok(/Moe/.test(m.note), 'Nieuwe notitie-tekst blijft leesbaar');

// 4) Geen bestaande rij → incoming is leidend, ontbrekend blijft null (niets verzinnen).
m = tkMergeHealthRow(null, { rhr: 57 });
eq([m.hrv, m.rhr, m.sleep], [null, 57, null], 'Zonder bestaande rij alleen het ingevulde veld');

// 5) Lege string telt als "niet ingevuld" (inputvelden leveren '' bij leeg).
m = tkMergeHealthRow({ hrv: 30 }, { hrv: '' });
eq(m.hrv, 30, "Lege invoer ('') wist een bestaande waarde niet");

// 6) 0 is een geldige meting en mag niet als "leeg" gelden.
m = tkMergeHealthRow({ rhr: 57 }, { rhr: 0 });
eq(m.rhr, 0, 'Waarde 0 wordt wel overgenomen (geen falsy-val)');

// 7) Cyclus/edema volgen dezelfde regel.
m = tkMergeHealthRow({ cyclus_fase: 'luteaal', edema: 'Knie: licht' }, { hrv: 25 });
eq([m.cyclus_fase, m.edema], ['luteaal', 'Knie: licht'], 'Cyclus en condities blijven behouden');

console.log('\n========================================================');
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exit(1);
console.log('✅ Check-in kan gesynchroniseerde wearable-data niet meer overschaduwen.');
