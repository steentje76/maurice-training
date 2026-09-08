/* fSupplementRepoWideAudit.test.js — SUP-EVIDENCE-02.
 *
 * Bewaakt dat de nieuwe registry niet per ongeluk een tweede,
 * concurrerende claimbron krijgt naast zichzelf, en dat de verwijderde
 * elektrolyt-claim nergens anders in de repo alsnog positief opduikt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- 33: geen duplicate supplementclaims buiten de registry ----
// index.html mag GEEN eigen, handgeschreven claim-teksten/evidence-labels
// bevatten voor de P0-substances -- alle inhoud moet uit de nieuwe
// EducationService komen zodra die aan de UI wordt gekoppeld.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
const verdachtePatronen = [
  /creatine.{0,40}(sterk bewijs|verbetert kracht)/i,
  /cafe[iï]ne.{0,40}(mg\/kg|3-6\s*mg)/i,
  /natrium.{0,40}voorkomt.{0,20}hyponatri/i
];
verdachtePatronen.forEach((re, i) => {
  ok(!re.test(html), '33.' + (i + 1) + ': index.html bevat geen eigen, hardgecodeerde claim-tekst die de registry dupliceert (' + re + ')');
});

// ---- de verwijderde claim mag NERGENS in de repo positief voorkomen ----
const CORE_DIR = path.join(ROOT, 'core');
const coreFiles = fs.readdirSync(CORE_DIR).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));
let foundPositiveSodiumClaim = false;
coreFiles.forEach((f) => {
  const src = fs.readFileSync(path.join(CORE_DIR, f), 'utf8');
  // Toegestaan: de REMOVE-record zelf (claim-veld) en de weerlegging
  // (ELEC-HYPONATREMIA-CAUSE-001). Verboden: een NIEUWE, positieve
  // bewering buiten die twee, bekende, al-gecontroleerde plekken.
  if (f === 'nutritionSupplementEvidenceRegistry.js') return; // bevat de REMOVE-record zelf, al apart getest
  if (/natrium.{0,30}voorkomt.{0,20}hyponatri/i.test(src)) foundPositiveSodiumClaim = true;
});
ok(!foundPositiveSodiumClaim, '33b: geen enkel ander core-bestand herintroduceert de verwijderde "natrium voorkomt hyponatriemie"-claim');
ok(!html.includes('natrium voorkomt hyponatri'), '33c: index.html bevat de verwijderde claim niet');

// ---- SUP-EVIDENCE-02A / 6.C: UI toont nergens "dopingveilig" of een ongecertificeerde WADA-uitspraak ----
ok(!/dopingveilig|wada toegestaan/i.test(html), '6C: index.html bevat nergens "dopingveilig" of "WADA toegestaan"');
ok(!/anti_doping_relevance/i.test(html), '6C-b: index.html rendert het interne triageveld anti_doping_relevance niet rechtstreeks');

// ---- geen enkel ander bestand claimt AI mag zelfstandig een dosis berekenen ----
const alleCoreSrc = coreFiles.map((f) => fs.readFileSync(path.join(CORE_DIR, f), 'utf8')).join('\n');
ok(!/AI.{0,20}(berekent|rekent uit).{0,30}(dosis|dosering)/i.test(alleCoreSrc),
  'geen enkel core-bestand suggereert dat AI zelfstandig een persoonlijke dosis berekent');

// ---- de vier nieuwe bestanden bestaan en zijn onderling consistent geladen ----
['nutritionSupplementCatalog.js', 'nutritionSupplementSourceRegistry.js', 'nutritionSupplementEvidenceRegistry.js', 'nutritionSupplementEducationService.js'].forEach((f) => {
  ok(fs.existsSync(path.join(CORE_DIR, f)), 'bestand bestaat: ' + f);
});

console.log('fSupplementRepoWideAudit: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
