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

// ---- 31: 68->100+ schaalbaarheid -- bewijs dat een non-P0-item zonder enginewijziging werkt ----
// (de daadwerkelijke EducationService-aanroep op een non-P0-item staat in
// nutritionSupplementEducationService.test.js; hier bewijzen we dat de
// catalogus zelf willekeurig P1/P2/P3-items bevat zonder speciale code)
const p1Sample = C.getById('SODIUM_BICARBONATE');
ok(!!p1Sample && p1Sample.priority === 'P1' && p1Sample.evidence_coverage_status === 'PENDING_VERIFICATION',
  '31: een P1-item bestaat in de catalogus als gewone databuit, geen hardgecodeerde negen-items-aanname');
ok(C.byPriority('P0').length === 9, 'P0-telling is exact 9 (de gecertificeerde set)');
ok(C.byPriority('P1').length + C.byPriority('P2').length + C.byPriority('P3').length > 50,
  'ruim meer dan 50 niet-P0-items aanwezig, klaar voor toekomstige claim-batches zonder enginewijziging');

console.log('nutritionSupplementCatalog: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
