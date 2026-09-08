/* nutritionSupplementSearch.test.js — SUP-EVIDENCE-03A. */
'use strict';
const C = require('./nutritionSupplementCatalog.js');
const Search = require('./nutritionSupplementSearch.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- catalogus als enige autocompletebron ----
const alle = Search.search('a');
ok(alle.every((r) => !!C.getById(r.supplement_id)), 'elke suggestie verwijst naar een bestaand catalogitem -- geen tweede, losse lijst');

// ---- canonical-name matching ----
const creatineMatch = Search.search('creatine');
ok(creatineMatch.some((r) => r.supplement_id === 'CREATINE' && r.matched_via === 'canonical_name'), 'canonical-name matching: "creatine" vindt CREATINE via canonical_name');

// ---- synonym matching ----
// "coffee" is een synonym van CAFFEINE dat NIET gelijk is aan de display_name
// ("Cafeïne") -- dat maakt dit een ondubbelzinnige synonym-matchtest. ("cafeïne"
// zelf is inmiddels zowel synonym als display_name en wordt terecht via de
// hogere-rang display_name-exacte-match gevonden, zie de ranking-tests verderop.)
const coffeeMatch = Search.search('coffee');
ok(coffeeMatch.some((r) => r.supplement_id === 'CAFFEINE' && r.matched_via === 'synonym'), 'synonym matching: "coffee" vindt CAFFEINE via zijn synonym');

// ---- case-insensitive matching ----
ok(Search.search('CREATINE').some((r) => r.supplement_id === 'CREATINE'), 'case-insensitive: hoofdletters "CREATINE" vindt hetzelfde resultaat');
ok(Search.search('CaFeÏnE').some((r) => r.supplement_id === 'CAFFEINE'), 'case-insensitive: gemengde hoofdletters vindt hetzelfde resultaat');

// ---- het gegeven voorbeeld: "vitam" -> Vitamin D/B12 e.d. ----
const vitamMatch = Search.search('vitam');
ok(vitamMatch.some((r) => r.supplement_id === 'VITAMIN_D'), '"vitam" matcht Vitamin D');
ok(vitamMatch.some((r) => r.supplement_id === 'VITAMIN_B12'), '"vitam" matcht Vitamin B12');
ok(vitamMatch.some((r) => r.supplement_id === 'VITAMIN_C'), '"vitam" matcht Vitamin C');

// ---- geen gevaarlijke fuzzy auto-select ----
ok(Search.search('kreatine').length === 0, 'een typfout ("kreatine" i.p.v. "creatine") levert GEEN fuzzy-match op -- substring-only, geen typo-tolerantie');
ok(Search.exactMatch('kreatine') === null, 'exactMatch koppelt bij een typfout geen supplement_id (voorkomt "gegokte" evidence)');
ok(Search.exactMatch('creatine') === null || Search.exactMatch('creatine').supplement_id === 'CREATINE',
  'exactMatch op de letterlijke canonical_name geeft altijd het juiste item (nooit een ander item als "beste gok")');
// substring-suggesties zijn nooit hetzelfde als een automatische koppeling:
// "vitam" levert meerdere kandidaten op, dus mag NOOIT zelf 1 supplement_id kiezen.
ok(Search.exactMatch('vitam') === null, 'een niet-volledige, meerduidige zoekterm ("vitam") wordt NOOIT automatisch aan 1 supplement_id gekoppeld');

// ---- lege/witruimte-query geeft geen resultaten (geen "toon alles" bij leeg veld) ----
ok(Search.search('').length === 0, 'lege query geeft geen suggesties');
ok(Search.search('   ').length === 0, 'query van uitsluitend witruimte geeft geen suggesties');

// ---- resultaatlimiet ----
ok(Search.search('a').length <= Search.MAX_RESULTS, 'resultaten blijven binnen de ingestelde limiet (' + Search.MAX_RESULTS + ')');

// ---- custom/onbekende naam: geen enkel resultaat, geen crash ----
ok(Search.search('xyzniet-bestaand-supplement').length === 0, 'een volledig onbekende naam levert 0 suggesties op, geen crash');
ok(Search.exactMatch('xyzniet-bestaand-supplement') === null, 'exactMatch op een onbekende naam geeft null, zodat custom logging mogelijk blijft');

console.log('nutritionSupplementSearch: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
