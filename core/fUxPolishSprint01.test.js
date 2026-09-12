/* fUxPolishSprint01.test.js — UX/UI POLISH SPRINT 01 (Inzicht + Belasting/Herstel + PO-01-UX)
 * Adversariële regressietest voor de PO-goedgekeurde visuele polish:
 * label-hernoeming (PO-01), stale-banner-verwijdering, emoji->lijnicoon-
 * conversie op Lichaam, en entry-precisie voor Prestaties/Trainingsbelasting/
 * Doelen (RC-IA-01).
 *
 * Draai: node core/fUxPolishSprint01.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

function slice(a, b) {
  var s = HTML.indexOf(a);
  assert.ok(s >= 0, 'niet gevonden: ' + a);
  var e = HTML.indexOf(b, s + a.length);
  assert.ok(e > s, 'eindmarker niet gevonden voor: ' + a);
  return HTML.slice(s, e);
}

/* ══ A. PO-01 labelwijzigingen ══ */
console.log('A. PO-01 labels');
ok(HTML.indexOf("title:'Trainingsbelasting'") > -1, 'A1: Inzicht-domeinkaart heet nu "Trainingsbelasting"');
ok(HTML.indexOf("title:'Belasting'") === -1, 'A2: de dubbelzinnige, kale "Belasting"-titel bestaat niet meer op Inzicht');
ok(/lich-mode-load"[^>]*>Spierbelasting</.test(HTML), 'A3: Lichaam-tab heet nu "Spierbelasting"');
ok(!/lich-mode-load"[^>]*>Belasting</.test(HTML), 'A4: de oude "Belasting"-tab-tekst is weg');
ok(HTML.indexOf('Spierbelasting &middot; laatste 7 dagen') > -1, 'A5: s-lich-spieren-sectiekop is consistent hernoemd naar Spierbelasting');

/* ══ B. Stale preview-banner weg ══ */
console.log('B. Stale banner');
ok(HTML.indexOf('Preview: nieuw Inzicht-scherm') === -1, 'B1: de verouderde preview-banner-tekst bestaat niet meer');
ok(HTML.indexOf('TIJDELIJKE PREVIEW-ACCESS (PR #232)') === -1, 'B2: het bijbehorende commentaarblok is mee verwijderd');

/* ══ C. Emoji -> lijniconen op Lichaam-hoofdscherm ══ */
console.log('C. Canonical iconen (Lichaam-hoofdscherm)');
var LICHAAM_BLOK = slice('<div class="scr" id="s-lichaam">', '<div class="scr" id="s-lich-spieren">');
['🔗', '🤖', '🏋️', '📈', '⚖️', '＋'].forEach(function (em) {
  ok(LICHAAM_BLOK.indexOf(em) === -1, 'C: emoji "' + em + '" komt niet meer voor op het Lichaam-hoofdscherm');
});
ok((LICHAAM_BLOK.match(/<span class="ic"><svg/g) || []).length >= 6, 'C-svg: minstens 6 knoppen gebruiken nu een canonical inline-SVG-icoon i.p.v. emoji');
// 🌙 (Cyclus) en 🍽️ (Voeding-snelkoppeling) hebben bewust geen canonical
// equivalent in de icon-registry en zijn NIET aangepast (zie eindrapport) --
// dit wordt hier bevestigd, niet verzwegen.
ok(LICHAAM_BLOK.indexOf('🌙') > -1, 'C-debt1: Cyclus-emoji is bewust nog aanwezig (geen canonical icoon beschikbaar, gerapporteerd als resterende debt)');
ok(LICHAAM_BLOK.indexOf('🍽️') > -1, 'C-debt2: Voeding-snelkoppeling-emoji is bewust nog aanwezig (geen canonical icoon beschikbaar, gerapporteerd als resterende debt)');

/* ══ D. Entry-precisie (RC-IA-01): Prestaties/Trainingsbelasting/Doelen ══ */
console.log('D. Entry-precisie (RC-IA-01)');
['goInzichtPrestaties', 'goInzichtTrainingsbelasting', 'goInzichtDoelen'].forEach(function (fn) {
  ok(HTML.indexOf('function ' + fn + '(') > -1, 'D: ' + fn + '() bestaat');
});
var PREST_FN = slice('function goInzichtPrestaties(', '\n}');
var BELAST_FN = slice('function goInzichtTrainingsbelasting(', '\n}');
var DOEL_FN = slice('function goInzichtDoelen(', '\n}');
[PREST_FN, BELAST_FN, DOEL_FN].forEach(function (fn, i) {
  var naam = ['goInzichtPrestaties', 'goInzichtTrainingsbelasting', 'goInzichtDoelen'][i];
  ok(fn.indexOf("go('s-stats')") > -1, naam + '() navigeert intern naar het bestaande, ongewijzigde s-stats-scherm (geen nieuw scherm)');
  ok(fn.indexOf('scrollIntoView') > -1, naam + '() scrollt naar een specifieke sectie (zelfde patroon als openHelpFeedback())');
});
ok(PREST_FN.indexOf('stats-anchor-prestaties') > -1, 'D-anchor1: Prestaties scrollt naar #stats-anchor-prestaties');
ok(BELAST_FN.indexOf('stats-anchor-belasting') > -1, 'D-anchor2: Trainingsbelasting scrollt naar #stats-anchor-belasting');
ok(DOEL_FN.indexOf('stats-anchor-doelen') > -1, 'D-anchor3: Doelen scrollt naar #stats-anchor-doelen');
// De drie anchors bestaan daadwerkelijk in s-stats, op bestaande, semantisch
// overeenkomende sectiekoppen (geen nieuwe secties/schermen).
var STATS_BLOK = slice('<div class="scr" id="s-stats">', '<div class="scr" id="s-inzicht">');
ok(STATS_BLOK.indexOf('id="stats-anchor-doelen"') > -1 && /id="stats-anchor-doelen"[^>]*>Doelen</.test(STATS_BLOK),
  'D-target1: stats-anchor-doelen zit op de bestaande "Doelen"-sectiekop');
ok(STATS_BLOK.indexOf('id="stats-anchor-prestaties"') > -1 && /id="stats-anchor-prestaties"[^>]*>Persoonlijke records</.test(STATS_BLOK),
  'D-target2: stats-anchor-prestaties zit op de bestaande "Persoonlijke records"-sectiekop');
ok(STATS_BLOK.indexOf('id="stats-anchor-belasting"') > -1 && /id="stats-anchor-belasting"[^>]*>Trends</.test(STATS_BLOK),
  'D-target3: stats-anchor-belasting zit op de bestaande "Trends"-sectiekop');
// Inzicht-domeinenlijst en de Vandaag-doelenkaart (A-10) roepen de nieuwe,
// precieze functies aan i.p.v. de generieke go('s-stats')/go('s-doelen').
ok(HTML.indexOf("fn:'goInzichtPrestaties'") > -1, 'D-caller1: Inzicht-domeinkaart Prestaties gebruikt de precieze functie');
ok(HTML.indexOf("fn:'goInzichtTrainingsbelasting'") > -1, 'D-caller2: Inzicht-domeinkaart Trainingsbelasting gebruikt de precieze functie');
ok(HTML.indexOf("fn:'goInzichtDoelen'") > -1, 'D-caller3: Inzicht-domeinkaart Doelen gebruikt de precieze functie');
ok(HTML.indexOf('onclick="goInzichtDoelen()"') > -1, 'D-caller4: Vandaag-doelenkaart (A-10) gebruikt de precieze functie i.p.v. go(\'s-doelen\')');

/* ══ E. Geen Training-execution-wijziging (R-006) ══ */
console.log('E. Training execution ongewijzigd (R-006)');
[PREST_FN, BELAST_FN, DOEL_FN].forEach(function (fn, i) {
  var naam = ['goInzichtPrestaties', 'goInzichtTrainingsbelasting', 'goInzichtDoelen'][i];
  ok(!/curT\s*=[^=]|activeInstanceId\s*=[^=]|sessionLog\s*=|trainStart\s*=/.test(fn),
    naam + '() raakt geen Training-execution-state aan');
});
ok(HTML.indexOf("function startT(t){") !== -1, 'E-startT: startT() bestaat nog, functioneel ongewijzigd (buiten scope van deze sprint)');

/* ══ F. Geen Nutrition-wijziging (E-06/FD-01 blijft buiten scope) ══ */
console.log('F. Nutrition ongewijzigd');
ok(HTML.indexOf("go:'s-voeding'") > -1, 'F1: de Voeding-domeinkaart op Inzicht bestaat nog ongewijzigd (geen E-06-fix in deze sprint)');

console.log('\n========================================================');
console.log('fUxPolishSprint01.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
