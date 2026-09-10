/* fProviderSportMapping.test.js — Functional Freeze Audit, canonical-
 * aansluiting-pas. Bewijst dat Polar/WHOOP/Oura nu een ENKELE, gedeelde
 * sport-mapping-functie gebruiken i.p.v. drie bijna-identieke, los
 * onderhouden kopieen (P1-kandidaat: providers met elk hun eigen model,
 * canonical layer ontbrak -- nu geconsolideerd).
 */
'use strict';
const fs = require('fs');
let pass = 0, fail = 0;
const msgs = [];
function ok(c, m) { if (c) pass++; else { fail++; msgs.push(m); } }

console.log('Functional Freeze Audit — gedeelde provider-sport-mapping');

const { mapProviderSportToCanonical } = require('../netlify/functions/_providerSportMapping.js');

ok(mapProviderSportToCanonical('RUNNING') === 'running', 'A1: RUNNING -> running');
ok(mapProviderSportToCanonical('trail_running') === 'running', 'A2: trail_running -> running (substring)');
ok(mapProviderSportToCanonical('BIKING') === 'cycling', 'A3: BIKING -> cycling');
ok(mapProviderSportToCanonical('SPINNING') === 'cycling', 'A4: SPINNING -> cycling (spin-substring)');
ok(mapProviderSportToCanonical('rowing_machine') === 'rowing', 'A5: rowing_machine -> rowing');
ok(mapProviderSportToCanonical('pool_swimming') === 'swimming', 'A6: pool_swimming -> swimming');
ok(mapProviderSportToCanonical('weightlifting') === null, 'A7: niet-mapbaar sporttype -> null, geen gok');
ok(mapProviderSportToCanonical(null) === null && mapProviderSportToCanonical(undefined) === null, 'A8: ontbrekend sporttype -> null, geen crash');

// Bewijs dat de drie providers nu daadwerkelijk deze gedeelde functie
// gebruiken i.p.v. hun eigen, verwijderde kopie.
const polar = fs.readFileSync(require('path').join(__dirname, '..', 'netlify/functions/polar-sync.js'), 'utf8');
const whoop = fs.readFileSync(require('path').join(__dirname, '..', 'netlify/functions/whoop-sync.js'), 'utf8');
const oura = fs.readFileSync(require('path').join(__dirname, '..', 'netlify/functions/oura-sync.js'), 'utf8');

ok(polar.includes("require('./_providerSportMapping.js')") && !polar.includes('function mapPolarSportToCanonical'), 'B1: polar-sync.js gebruikt de gedeelde mapper, eigen kopie verwijderd');
ok(whoop.includes("require('./_providerSportMapping.js')") && !whoop.includes('function mapWhoopSportToCanonical'), 'B2: whoop-sync.js gebruikt de gedeelde mapper, eigen kopie verwijderd');
ok(oura.includes("require('./_providerSportMapping.js')") && !oura.includes('function mapOuraActivityToCanonical'), 'B3: oura-sync.js gebruikt de gedeelde mapper, eigen kopie verwijderd');

console.log('\n========================================================');
console.log('fProviderSportMapping.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error('MISLUKT: ' + m)); process.exitCode = 1; }
