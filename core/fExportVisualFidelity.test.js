/* fExportVisualFidelity.test.js — EXPORTEREN SPRINT 3B: canonical visual correction
 *
 * AANLEIDING. m-export toonde vijf .csv-btn-knoppen met emoji-iconen op een vlakke
 * grijze achtergrond -- afwijkend van de canonical Profiel-/Account & data-visuele
 * taal. Daarnaast bleek "Alles exporteren (JSON backup)" feitelijk onjuist:
 * exportJSON() bevat slechts 7 van de ~70+ gebruikersdata-tabellen (sessions,
 * weight_log, hrv_log, body_comp, exercises, atleet, customTrainings) -- geen
 * voeding, endurance-activiteiten, HYROX/triathlon, doelen, condities, cyclus,
 * AI-coach-geschiedenis, social, etc.
 *
 * Deze suite legt vast dat:
 *   1. alle 5 exportopties nog aanwezig zijn;
 *   2. alle 5 handlers exact ongewijzigd zijn (zelfde functienamen/parameters);
 *   3. de CSV-datasets (sessions/weight_log/hrv_log/body_comp) ongewijzigd zijn;
 *   4. de JSON-handler (tabellen/velden) ongewijzigd is;
 *   5. geen emoji-iconen meer in m-export voorkomen;
 *   6. #m-export een expliciete, eigen pf-*-CSS-scope heeft (dezelfde bewezen fix
 *      als #m-account, want ook dit modal is een DOM-sibling buiten #s-profiel);
 *   7. de SVG's daarbinnen een begrensde width/height hebben;
 *   8/9. geen horizontale-overflow-gevoelige vaste breedtes, rijen blijven op de
 *      bestaande, al bewezen 44px-hoge #s-profiel-maatvoering;
 *   10. de copy niet langer "Alles"/"Volledige backup/back-up" claimt, en de
 *       JSON-subtitel exact de daadwerkelijk geëxporteerde categorieën noemt.
 *
 * Draai: node core/fExportVisualFidelity.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

function blok(id) {
  var s = HTML.indexOf('id="' + id + '"');
  assert.ok(s >= 0, id + ' niet gevonden');
  var e = HTML.indexOf('<div class="modal-bg" id="', s + 10);
  return e > s ? HTML.slice(s, e) : HTML.slice(s);
}
var M_EXPORT = blok('m-export');

/* ── 1-2. Alle 5 exportopties + exacte, ongewijzigde handlers ────────────────── */
console.log('1-2. Exportopties en handlers');
var HANDLERS = ["exportCSV('sessions')", "exportCSV('weight_log')", "exportCSV('hrv_log')", "exportCSV('body_comp')", "exportJSON()"];
HANDLERS.forEach(function (h) {
  ok(M_EXPORT.indexOf('onclick="' + h + '"') !== -1, '1/2. handler aanwezig en ongewijzigd: ' + h);
});
ok((M_EXPORT.match(/onclick="export(CSV|JSON)\(/g) || []).length === 5, '1. precies 5 exportopties, niet meer/minder');

/* ── 3. CSV-datasets ongewijzigd (functie-inhoud, niet alleen de aanroep) ────── */
console.log('3. CSV-datasetlogica ongewijzigd');
var startCsv = HTML.indexOf('async function exportCSV(table){');
var eindCsv = HTML.indexOf('async function exportJSON(){', startCsv);
assert.ok(startCsv > 0 && eindCsv > startCsv, 'exportCSV() niet gevonden');
var CSV_BRON = HTML.slice(startCsv, eindCsv);
ok(CSV_BRON.indexOf("sbGet(table,'&order=date.asc&limit=5000')") !== -1, '3a. exportCSV() query ongewijzigd (order=date.asc&limit=5000)');
ok(CSV_BRON.indexOf('downloadFile(csv') !== -1, '3b. exportCSV() gebruikt nog steeds downloadFile()');
ok(CSV_BRON.indexOf('.csv') !== -1, '3c. CSV-bestandsextensie ongewijzigd');

/* ── 4. JSON-handler (tabellen/velden) ongewijzigd ───────────────────────────── */
console.log('4. JSON-handlerinhoud ongewijzigd');
var startJson = HTML.indexOf('async function exportJSON(){');
var eindJson = HTML.indexOf('function downloadFile(', startJson);
assert.ok(startJson > 0 && eindJson > startJson, 'exportJSON() niet gevonden');
var JSON_BRON = HTML.slice(startJson, eindJson);
var VERWACHTE_TABELLEN = ['sessions', 'weight_log', 'hrv_log', 'body_comp', 'exercises'];
ok(JSON_BRON.indexOf("tables = ['sessions','weight_log','hrv_log','body_comp','exercises']") !== -1,
  '4a. exportJSON() exporteert exact dezelfde 5 tabellen, geen uitbreiding');
ok(JSON_BRON.indexOf('backup.atleet = atleet') !== -1, '4b. atleet-object ongewijzigd meegenomen');
ok(JSON_BRON.indexOf('backup.customTrainings = customTrainings') !== -1, '4c. customTrainings ongewijzigd meegenomen');
ok(JSON_BRON.indexOf(".json'") !== -1, '4d. JSON-bestandsextensie ongewijzigd');

/* ── 5. Geen emoji-iconen meer ────────────────────────────────────────────────── */
console.log('5. Geen emoji-iconen');
var EMOJIS = ['📊', '⚖️', '❤️', '📏', '💾'];
EMOJIS.forEach(function (e) {
  ok(M_EXPORT.indexOf(e) === -1, '5. emoji verwijderd: ' + e);
});
ok(M_EXPORT.indexOf('csv-btn') === -1, '5b. oude .csv-btn-class niet meer gebruikt in m-export');

/* ── 6-7. #m-export eigen pf-*-CSS-scope, begrensde SVG-afmetingen ───────────── */
console.log('6-7. #m-export CSS-scope (zelfde bewezen fix als #m-account)');
var SELECTORS = ['.pf-row', '.pf-ic', '.pf-ic svg', '.pf-tx', '.pf-lb', '.pf-sb', '.pf-chev'];
var exportRules = {};
SELECTORS.forEach(function (sel) {
  var re = new RegExp('#m-export ' + sel.replace(/\./g, '\\.') + '\\{([^}]*)\\}');
  var m = HTML.match(re);
  ok(!!m, '6. #m-export ' + sel + ' -- regel bestaat');
  if (m) exportRules[sel] = m[1];
});
if (exportRules['.pf-ic']) {
  ok(/width:\d+px/.test(exportRules['.pf-ic']) && /height:\d+px/.test(exportRules['.pf-ic']),
    '7a. #m-export .pf-ic heeft expliciete, begrensde width/height');
}
if (exportRules['.pf-ic svg']) {
  ok(/width:\d+px/.test(exportRules['.pf-ic svg']) && /height:\d+px/.test(exportRules['.pf-ic svg']),
    '7b. #m-export .pf-ic svg heeft expliciete, begrensde width/height -- voorkomt de bewezen "enorme icoon"-regressie');
}
Object.keys(exportRules).forEach(function (sel) {
  ok(exportRules[sel].indexOf('!important') === -1, '6c. #m-export ' + sel + ' gebruikt geen !important');
});

/* ── 1-op-1 met #m-account (dezelfde canonical waarden, geen eigen interpretatie) ── */
console.log('   1-op-1 vergelijking met #m-account (zelfde canonical bron)');
SELECTORS.forEach(function (sel) {
  var reAcc = new RegExp('#m-account ' + sel.replace(/\./g, '\\.') + '\\{([^}]*)\\}');
  var mAcc = HTML.match(reAcc);
  if (mAcc && exportRules[sel]) {
    ok(mAcc[1] === exportRules[sel], '   #m-export ' + sel + ' identiek aan #m-account ' + sel);
  }
});

/* ── 8-9. 390px/44px: hergebruikt de al bewezen #s-profiel-rijmaatvoering ────── */
console.log('8-9. Maatvoering (hergebruik van reeds bewezen #s-profiel-waarden)');
ok(/#m-export \.pf-row\{min-height:48px/.test(HTML), '8/9. rijhoogte (48px) identiek aan de bewezen, al 44px-conforme #s-profiel-rij');
ok(!/#m-export[^{]*\{[^}]*width:\d{3,}px/.test(HTML), '8. geen vaste driecijferige pixelbreedtes in de nieuwe #m-export-regels (geen horizontale-overflow-risico)');

/* ── 10. Copy claimt geen volledigheid meer ──────────────────────────────────── */
console.log('10. Copy-waarheid');
ok(M_EXPORT.indexOf('Alles exporteren') === -1, '10a. "Alles exporteren" komt niet meer voor');
ok(M_EXPORT.indexOf('Volledige back-up') === -1 && M_EXPORT.indexOf('Volledige backup') === -1,
  '10b. "Volledige back-up/backup" komt niet meer voor');
ok(M_EXPORT.indexOf('Kerngegevens exporteren') !== -1, '10c. nieuwe, feitelijk correcte JSON-label aanwezig');
['Trainingen', 'gewicht', 'HRV', 'lichaamscompositie', 'oefeningen', 'profiel', 'eigen trainingen'].forEach(function (term) {
  ok(M_EXPORT.toLowerCase().indexOf(term.toLowerCase()) !== -1, '10d. JSON-subtitel noemt: ' + term);
});
ok(HTML.indexOf("toast('Volledige backup gedownload')") === -1, '10e. de bevestigingstoast claimt ook geen "volledige backup" meer');
ok(HTML.indexOf("toast('Kerngegevens gedownload')") !== -1, '10f. nieuwe, feitelijk correcte toast-tekst aanwezig');

console.log('\n========================================================');
console.log('fExportVisualFidelity.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
