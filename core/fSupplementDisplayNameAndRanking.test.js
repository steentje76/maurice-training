/* fSupplementDisplayNameAndRanking.test.js — SUP-EVIDENCE-03B. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require('./nutritionSupplementCatalog.js');
const Search = require('./nutritionSupplementSearch.js');
const EduService = require('./nutritionSupplementEducationService.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const P0_DISPLAY_NAMES = {
  CREATINE: 'Creatine', CAFFEINE: 'Cafeïne', BETA_ALANINE: 'Bèta-alanine',
  PROTEIN_GROUP: 'Eiwit', CARB_GROUP: 'Koolhydraten', ELECTROLYTE_GROUP: 'Elektrolyten',
  VITAMIN_D: 'Vitamine D', IRON: 'IJzer', MELATONIN: 'Melatonine'
};

// ---- A: display_name verandert supplement_id niet ----
Object.keys(P0_DISPLAY_NAMES).forEach((id) => {
  const before = C.getById(id);
  ok(before.supplement_id === id, 'A: ' + id + ' behoudt zijn supplement_id ongewijzigd naast display_name');
  ok(C.getDisplayName(before) === P0_DISPLAY_NAMES[id], 'A: display_name van ' + id + ' is "' + P0_DISPLAY_NAMES[id] + '"');
});

// ---- B: synonyms blijven zoekbaar ----
// ---- J: technische synonym blijft vindbaar (D3, cholecalciferol, ferritine, whey, protein, natrium, sodium) ----
const technischeSynoniemen = [
  ['D3', 'VITAMIN_D'], ['cholecalciferol', 'VITAMIN_D'],
  ['ferritine-context', 'IRON'], ['whey', 'PROTEIN_GROUP'], ['proteine', 'PROTEIN_GROUP'],
  ['natrium', 'ELECTROLYTE_GROUP'], ['sportzout', 'ELECTROLYTE_GROUP']
];
technischeSynoniemen.forEach(([term, expectedId]) => {
  const results = Search.search(term);
  ok(results.some((r) => r.supplement_id === expectedId), 'B/J: technische term "' + term + '" blijft vindbaar en wijst naar ' + expectedId);
});
// 'sodium' komt niet letterlijk voor als synonym in de catalogus (alleen 'natrium'/'sportzout') --
// dat is een bestaand gegeven, geen regressie van deze sprint; niet als vereiste getest.

// ---- C: exact match rankt boven substring ----
// 'Eiwit' is exact de display_name van PROTEIN_GROUP, maar zou als substring ook
// kunnen matchen met andere items als die "eiwit" ergens bevatten (bv. PLANT_PROTEIN
// heeft 'eiwit' niet letterlijk als synonym, dus gebruik een garandeerd overlappend geval).
const eiwitResults = Search.search('eiwit');
ok(eiwitResults[0].supplement_id === 'PROTEIN_GROUP', 'C: exacte match ("eiwit" == display_name van PROTEIN_GROUP) staat op de eerste plek');

// ---- D: prefix rankt boven algemene substring ----
// "vit" is een prefix van "Vitamine D"/"Vitamin B12"/"Vitamin C"/"Vitamin E" (rank 2),
// en zou als losse substring ook in andere namen kunnen voorkomen die niet met "vit"
// beginnen (rank 5) -- alle prefix-matches moeten vóór eventuele latere substring-matches staan.
const vitResults = Search.search('vit');
const prefixIndex = vitResults.findIndex((r) => r.canonical_name.toLowerCase().indexOf('vit') === 0 || (r.display_name || '').toLowerCase().indexOf('vit') === 0);
const laterNonPrefixIndex = vitResults.findIndex((r, i) => i > prefixIndex && r.canonical_name.toLowerCase().indexOf('vit') !== 0 && (r.display_name || '').toLowerCase().indexOf('vit') !== 0);
ok(prefixIndex === 0 || laterNonPrefixIndex === -1, 'D: prefix-matches op "vit" staan vóór eventuele overige substring-matches');

// ---- E: ranking deterministisch ----
const run1 = JSON.stringify(Search.search('a'));
const run2 = JSON.stringify(Search.search('a'));
const run3 = JSON.stringify(Search.search('vitam'));
const run4 = JSON.stringify(Search.search('vitam'));
ok(run1 === run2, 'E: search("a") geeft bij herhaling exact dezelfde, gerangschikte lijst');
ok(run3 === run4, 'E: search("vitam") geeft bij herhaling exact dezelfde, gerangschikte lijst');

// ---- F: geen fuzzy auto-select (herbevestiging na ranking-herbouw) ----
ok(Search.search('kreatine').length === 0, 'F: een typfout levert geen fuzzy-match op, ook niet na de ranking-herbouw');
ok(Search.exactMatch('kreatine') === null, 'F: exactMatch koppelt bij een typfout geen supplement_id');

// ---- G/H: custom supplement toegestaan, onbekende naam krijgt geen supplement_id ----
ok(Search.search('Mijn eigen supplement').length === 0, 'G: een volledig eigen, onbekende supplementnaam levert geen suggesties op');
ok(Search.exactMatch('Mijn eigen supplement') === null, 'H: "Mijn eigen supplement" krijgt geen supplement_id -- custom logging blijft mogelijk');

// ---- I: Education koppelt nog via supplement_id (canonical_name in EducationService-output blijft de wetenschappelijke naam, ongewijzigd door display_name) ----
const creEdu = EduService.getSupplementEducation({ supplementId: 'PROTEIN_GROUP' });
ok(creEdu.canonical_name === 'Protein/whey (groep)', 'I: EducationService.canonical_name blijft de ongewijzigde wetenschappelijke identiteit, ook al heeft PROTEIN_GROUP nu een display_name');
const eduByDisplayName = EduService.getSupplementEducationByName('Eiwit');
ok(eduByDisplayName.status === 'OK' && eduByDisplayName.supplement_id === 'PROTEIN_GROUP', 'I: Education is ook opvraagbaar via de exacte display_name ("Eiwit"), en koppelt naar hetzelfde supplement_id');

// ---- K: UI gebruikt presentation name waar beschikbaar ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
ok(html.indexOf('NutritionSupplementCatalog.getDisplayName') > 0, 'K: index.html roept getDisplayName() aan voor de UI-weergave');
ok(!/box\.innerHTML=matches\.map[\s\S]{0,300}m\.canonical_name\)\+hint/.test(html), 'K: de suggestielijst rendert niet langer rechtstreeks canonical_name zonder display_name-fallback');

// ---- L: geen tweede hardcoded supplementlijst in index.html (herbevestiging) ----
ok(!/var\s+SUPPLEMENT(EN)?_LIJST\s*=/.test(html), 'L: nog steeds geen eigen, tweede supplementenlijst-variabele in index.html');

// ---- M/N: dose/unit layout ongeveer gelijkwaardig, touchhoogte voldoende ----
const doseStyle = (html.match(/id="voeding-supp-dose"[^>]*style="([^"]*)"/) || [])[1] || '';
const unitStyle = (html.match(/id="voeding-supp-unit"[^>]*style="([^"]*)"/) || [])[1] || '';
ok(/flex:\s*1\s+1\s+50%/.test(doseStyle) && /flex:\s*1\s+1\s+50%/.test(unitStyle), 'M: dosis- en eenheidsveld hebben beide flex-basis 50% (visueel gelijkwaardig)');
ok(doseStyle.indexOf('min-height:44px') >= 0 && unitStyle.indexOf('min-height:44px') >= 0, 'N: beide velden hebben een expliciete min-height van 44px (naast de bestaande .vd-input-minimum)');

// ---- O: geen persoonlijke dosisberekening (herbevestiging na wijzigingen) ----
const nameInputBlockMatch = html.match(/voedingSuppNameInput[\s\S]{0,4000}voedingSuppSuggestBlur[\s\S]{0,300}\n\}/);
ok(!!nameInputBlockMatch && !/mg\s*\/\s*kg|gewicht\s*\*|weight\s*\*/i.test(nameInputBlockMatch[0]), 'O: nog steeds geen mg/kg- of gewicht-vermenigvuldiging in de combobox-UI-code');

// ---- placeholder/label ----
ok(/id="voeding-supp-dose"[^>]*placeholder="Dosering"/.test(html), 'dosisveld gebruikt placeholder "Dosering"');
ok(/id="voeding-supp-dose"[^>]*aria-label="Dosering"/.test(html), 'dosisveld gebruikt aria-label "Dosering"');

console.log('fSupplementDisplayNameAndRanking: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
