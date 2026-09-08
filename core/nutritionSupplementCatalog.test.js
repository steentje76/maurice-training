/* nutritionSupplementCatalog.test.js — SUP-EVIDENCE-02. */
'use strict';
const C = require('./nutritionSupplementCatalog.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- 1: unieke supplement_id ----
const ids = C.CATALOG.map((c) => c.supplement_id);
ok(new Set(ids).size === ids.length, '1: elke supplement_id is uniek (' + ids.length + ' items, ' + new Set(ids).size + ' uniek)');

// ---- 3: geldige entity_type ----
ok(C.CATALOG.every((c) => C.isValidEntityType(c.entity_type)), '3: elk catalogitem heeft een geldig entity_type');
ok(C.CATALOG.every((c) => C.isValidPriority(c.priority)), '3b: elk catalogitem heeft een geldige priority');

// ---- 4 (structureel, claim-koppeling zelf getest in evidence-registry-test): elk item heeft de basisvelden ----
const REQUIRED_FIELDS = ['supplement_id', 'canonical_name', 'entity_type', 'categories', 'priority', 'evidence_coverage_status'];
ok(C.CATALOG.every((c) => REQUIRED_FIELDS.every((f) => c[f] !== undefined)), '4: elk catalogitem heeft alle verplichte velden');

// ---- geen entity_type-vermenging binnen bekende clusters ----
ok(C.getById('CREATINE').entity_type === 'SUBSTANCE', 'CREATINE is SUBSTANCE');
ok(C.getById('PROTEIN_GROUP').entity_type === 'INGREDIENT_GROUP', 'PROTEIN_GROUP is INGREDIENT_GROUP');
ok(C.getById('TESTOSTERONE_BOOSTER').entity_type === 'PRODUCT_CATEGORY', 'TESTOSTERONE_BOOSTER is PRODUCT_CATEGORY (geen eigen substance)');
ok(C.getById('PROHORMONES').entity_type === 'RISK_CATEGORY', 'PROHORMONES is RISK_CATEGORY');

// ---- schaalbaarheid: catalogus is niet vastgeklonken aan de negen P0-items;
// nieuwe P1/P2/P3-items zijn puur databuit, geen enginewijziging nodig.
// Getallen komen uit CATALOG zelf, nooit uit een hardgecodeerd historisch cijfer. ----
// NK-07 heeft SODIUM_BICARBONATE (het oorspronkelijke voorbeeld hier) inmiddels
// gecertificeerd -- exact het bewijs dat dit systeem data-gedreven is, geen
// vast aantal. De test blijft daarom bewust dynamisch: zoek een willekeurig
// item dat NU nog PENDING_VERIFICATION is, in plaats van één vastgepind ID.
const stillPending = C.CATALOG.find(x => x.evidence_coverage_status === 'PENDING_VERIFICATION');
ok(!!stillPending && (stillPending.priority === 'P1' || stillPending.priority === 'P2' || stillPending.priority === 'P3'),
  'een P1/P2/P3-item bestaat in de catalogus als gewone databuit, geen hardgecodeerde negen-items-aanname');
ok(C.byPriority('P0').length === 9, 'P0-telling is exact 9 (de gecertificeerde set)');
ok(C.byPriority('P1').length + C.byPriority('P2').length + C.byPriority('P3').length > 50,
  'ruim meer dan 50 niet-P0-items aanwezig, klaar voor toekomstige claim-batches zonder enginewijziging');

// ---- SUP-EVIDENCE-02A / 6.E: catalog count wordt uit data afgeleid, nooit hardgecodeerd ----
// Er is bewust GEEN "expect(C.CATALOG.length).toBe(<vast getal>)"-assertie: de
// telling zelf is een afgeleide grootheid, geen functioneel contract. Deze
// test bewaakt uitsluitend dat de afgeleide tellingen intern consistent
// optellen tot het totaal, ongeacht wat dat totaal op enig moment is.
const actualCount = C.CATALOG.length;
const sumByPriority = C.PRIORITIES.reduce((acc, p) => acc + C.byPriority(p).length, 0);
const sumByEntityType = C.ENTITY_TYPES.reduce((acc, t) => acc + C.byEntityType(t).length, 0);
ok(sumByPriority === actualCount, '6E: som van alle priority-groepen (' + sumByPriority + ') is gelijk aan CATALOG.length (' + actualCount + ')');
ok(sumByEntityType === actualCount, '6E: som van alle entity_type-groepen (' + sumByEntityType + ') is gelijk aan CATALOG.length (' + actualCount + ')');
console.log('Actuele catalog count (uit data, geen hardgecodeerd cijfer): ' + actualCount);
console.log('  per priority: ' + C.PRIORITIES.map((p) => p + '=' + C.byPriority(p).length).join(', '));
console.log('  per entity_type: ' + C.ENTITY_TYPES.map((t) => t + '=' + C.byEntityType(t).length).join(', '));

// ---- SUP-EVIDENCE-02A / 6.F: alle supplement_id's uniek (herhaling van test 1, expliciet als eigen contractpunt) ----
ok(new Set(ids).size === C.CATALOG.length, '6F: alle ' + C.CATALOG.length + ' supplement_id\'s zijn uniek');

// ---- SUP-EVIDENCE-02A / 6.G: geen synonym-duplicates -- geen canonical_name/synonym van item A
// is de canonical_name van item B (zou op een verkapt duplicaat wijzen) ----
let synonymDuplicateFound = null;
C.CATALOG.forEach((item) => {
  (item.synonyms || []).forEach((syn) => {
    const clash = C.CATALOG.find((other) => other.supplement_id !== item.supplement_id && other.canonical_name.toLowerCase() === syn.toLowerCase());
    if (clash) synonymDuplicateFound = item.supplement_id + ' synonym "' + syn + '" == canonical_name van ' + clash.supplement_id;
  });
});
ok(synonymDuplicateFound === null, '6G: geen enkele synonym van het ene item is de canonical_name van een ander item (' + (synonymDuplicateFound || 'geen conflict') + ')');

// ---- SUP-EVIDENCE-02A / sectie 4-5: anti_doping_relevance is interne triage-metadata, geen WADA-status ----
ok(C.CATALOG.every((c) => C.isValidAntiDopingTriage(c.anti_doping_relevance)),
  'elk catalogitem heeft een geldige, gecontroleerde anti_doping_relevance-triagewaarde (NONE/REVIEW_REQUIRED/HIGH_RELEVANCE/UNKNOWN)');
const WADA_STATUS_LOOKALIKES = ['geen', 'niet verboden', 'verboden', 'dopingveilig', 'wada toegestaan', 'toegestaan'];
ok(C.CATALOG.every((c) => WADA_STATUS_LOOKALIKES.indexOf(String(c.anti_doping_relevance).toLowerCase()) === -1),
  'C: geen enkele anti_doping_relevance-waarde is (meer) een vrije tekst die als feitelijke WADA-uitspraak gelezen kan worden');

console.log('nutritionSupplementCatalog: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
