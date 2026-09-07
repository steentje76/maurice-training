/* fSupplementMobileInputHardening.test.js — SUP-EVIDENCE-03A. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

// ---- doseringveld niet meer icon-width/smal: flex-basis-verhouding aanwezig, geen 50/50 meer ----
const doseMatch = html.match(/id="voeding-supp-dose"[^>]*style="([^"]*)"/);
const unitMatch = html.match(/id="voeding-supp-unit"[^>]*style="([^"]*)"/);
ok(!!doseMatch && !!unitMatch, 'dose- en unit-elementen hebben een style-attribuut om de breedteverdeling te controleren');
if (doseMatch && unitMatch) {
  const doseFlexPct = parseFloat((doseMatch[1].match(/flex:\s*[\d.]+\s+[\d.]+\s+(\d+)%/) || [])[1]);
  const unitFlexPct = parseFloat((unitMatch[1].match(/flex:\s*[\d.]+\s+[\d.]+\s+(\d+)%/) || [])[1]);
  ok(doseFlexPct >= 48 && doseFlexPct <= 52, 'dosisveld heeft een flex-basis binnen de (SUP-EVIDENCE-03B) gevraagde 50%-richtwaarde (gevonden: ' + doseFlexPct + '%)');
  ok(unitFlexPct >= 48 && unitFlexPct <= 52, 'eenheidsveld heeft een flex-basis binnen de (SUP-EVIDENCE-03B) gevraagde 50%-richtwaarde (gevonden: ' + unitFlexPct + '%)');
  ok(doseMatch[1].indexOf('min-width:0') >= 0, 'dosisveld heeft min-width:0 zodat de flex-basis niet wordt overschreven');
  ok(unitMatch[1].indexOf('min-width:0') >= 0, 'eenheidsveld (select) heeft min-width:0 -- voorkomt dat de langste optietekst ("capsule") de flexverdeling overschrijft (het gerapporteerde Android-probleem)');
}
// dosis en eenheid zijn niet meer gelijk verdeeld (flex:1 + flex:1, het oude, gerapporteerd-kapotte patroon)
ok(!/id="voeding-supp-dose"[^>]*style="flex:1"/.test(html), 'dosisveld gebruikt niet meer de oude, gelijkverdeelde flex:1-stijl');

// ---- numeriek toetsenbord met decimalen, geen calculator ----
ok(/id="voeding-supp-dose"[^>]*inputmode="decimal"/.test(html), 'dosisveld heeft inputmode="decimal" voor een passend mobiel numeriek toetsenbord');
ok(/id="voeding-supp-dose"[^>]*step="any"/.test(html), 'dosisveld ondersteunt nog steeds decimale invoer (step="any", ongewijzigd)');

// ---- combobox-toegankelijkheid ----
ok(/id="voeding-supp-name"[^>]*role="combobox"/.test(html), 'naamveld heeft role="combobox"');
ok(/id="voeding-supp-suggest"[^>]*role="listbox"/.test(html), 'suggestielijst heeft role="listbox"');

// ---- catalogus blijft de enige autocompletebron (geen tweede, hardgecodeerde lijst) ----
ok(html.indexOf('NutritionSupplementSearch') > 0, 'index.html gebruikt NutritionSupplementSearch voor suggesties');
ok(!/var\s+SUPPLEMENT(EN)?_LIJST\s*=/.test(html), 'geen eigen, tweede supplementenlijst-variabele geintroduceerd in index.html');

// ---- geen persoonlijke dosisberekening in de nieuwe UI-code ----
const jsBlokMatch = html.match(/voedingSuppNameInput[\s\S]{0,4000}voedingSuppSuggestBlur[\s\S]{0,300}\n\}/);
ok(!!jsBlokMatch, 'de nieuwe combobox-functieblok is gevonden voor inspectie');
if (jsBlokMatch) {
  ok(!/mg\s*\/\s*kg|gewicht\s*\*|weight\s*\*/i.test(jsBlokMatch[0]), 'geen mg/kg- of gewicht-vermenigvuldiging in de nieuwe combobox-UI-code');
}

// ---- de pure zoekmodule bestaat en wordt geladen vóór gebruik ----
ok(fs.existsSync(path.join(ROOT, 'core/nutritionSupplementSearch.js')), 'core/nutritionSupplementSearch.js bestaat');
ok(html.indexOf('<script src="core/nutritionSupplementSearch.js">') > 0, 'nutritionSupplementSearch.js wordt als script geladen');
const catalogScriptPos = html.indexOf('<script src="core/nutritionSupplementCatalog.js">');
const searchScriptPos = html.indexOf('<script src="core/nutritionSupplementSearch.js">');
ok(catalogScriptPos >= 0 && searchScriptPos > catalogScriptPos, 'nutritionSupplementCatalog.js laadt vóór nutritionSupplementSearch.js (dependency-volgorde)');

console.log('fSupplementMobileInputHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
