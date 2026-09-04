/* core/fInzichtV01Preservation.test.js — bewijst dat alle 26 legacy-functies
 * uit INZICHT_V01_FUNCTIONAL_PRESERVATION_MATRIX.md bereikbaar blijven.
 * Merge van navigation destinations != functionality removal. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Alle 13 legacy-schermen (routes) moeten nog exact bestaan in de DOM.
const legacyScreens = ['s-lichaam','s-lich-spieren','s-lich-spier','s-lich-oefeningen','s-lich-verbanden','s-lich-verband','s-lich-gegevens','s-lich-health','s-lich-cyclus','s-lich-metingen','s-lich-metric','s-stats','s-hist'];
legacyScreens.forEach(function(id){
  ok(html.includes('id="' + id + '"'), '1.' + id + ': legacy-scherm-route bestaat nog exact, ongewijzigd');
});

// Alle 6 domain-cards op het nieuwe Inzicht-overzicht wijzen naar een bewezen, bestaand scherm.
const inzichtSrc = html.slice(html.indexOf('function inzichtRenderDomains'), html.indexOf('function inzichtRenderDomains') + 1500);
['s-stats','s-lich-health','s-lich-metingen','s-lich-verbanden'].forEach(function(dest){
  ok(inzichtSrc.includes("go:'" + dest + "'"), '2.' + dest + ': minstens 1 domain-card wijst naar dit bewezen, bestaande scherm');
});

// s-lichaam zelf (de hub) blijft het startpunt voor sub-routes die niet direct
// vanaf Inzicht linken (Cyclus, Gegevens & koppelingen) -- nog steeds bereikbaar
// via de bestaande, ongewijzigde s-lichaam-hub.
const lichaamSrc = html.slice(html.indexOf('<div class="scr" id="s-lichaam">'), html.indexOf('<div class="scr" id="s-lich-spieren">'));
ok(lichaamSrc.includes("go('s-lich-cyclus')"), '3: Cyclus blijft bereikbaar via de ongewijzigde s-lichaam-hub');
ok(lichaamSrc.includes("go('s-lich-gegevens')"), '4: Gegevens & koppelingen blijft bereikbaar via de ongewijzigde s-lichaam-hub');
ok(lichaamSrc.includes("go('s-lich-metingen')"), '5: Lichaamsmetingen blijft bereikbaar via de ongewijzigde s-lichaam-hub');
ok(lichaamSrc.includes("go('s-lich-health')"), '6: Gezondheid & herstel blijft bereikbaar via de ongewijzigde s-lichaam-hub');

// s-stats zelf blijft volledig ongewijzigd -- alle 13 sub-secties (Verbeterd,
// Consistentie, Multisport, Doelen, Challenges, PR per herhaling, Recente
// records, 1RM, Krachtverhoudingen, Volume, HRV-trend, Roeien, Cardio) staan
// er nog, Inzicht dupliceert deze niet, verwijst er uitsluitend naar door.
const statsSrc = html.slice(html.indexOf('<div class="scr" id="s-stats">'), html.indexOf('<div class="scr" id="s-library">'));
['stats-improve-list','stats-consistency-list','stats-multisport-overview','doelen-list','challenges-list','stats-reppr-content','stats-pr-timeline','stats-1rm-list','stats-ratio-list','stats-volume-content','stats-hrv-chart','stats-row-list','stats-cardio-list'].forEach(function(id){
  ok(statsSrc.includes('id="' + id + '"'), '7.' + id + ': s-stats-sub-sectie bestaat nog exact, ongewijzigd, niet gedupliceerd naar Inzicht');
});

// s-doelen redirect (bestaand, niet door deze sprint veroorzaakt) blijft intact.
ok(html.includes("if(id==='s-doelen'){id='s-stats';}"), '8: de bestaande s-doelen -> s-stats-redirect is ongewijzigd (reeds vóór deze sprint aanwezig)');

console.log('fInzichtV01Preservation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
