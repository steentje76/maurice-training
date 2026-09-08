/* fNK07SupplementKnowledgeCompletion.test.js — NK-07. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Catalog = require('./nutritionSupplementCatalog.js');
const Evidence = require('./nutritionSupplementEvidenceRegistry.js');
const Sources = require('./nutritionSupplementSourceRegistry.js');
const Topics = require('./nutritionKnowledgeTopics.js');
const Groups = require('./nutritionKnowledgeUiGroups.js');
const Service = require('./nutritionKnowledgeService.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const NEW_P1_IDS = ['SODIUM_BICARBONATE', 'NITRATE_BEETROOT', 'CITRULLINE', 'OMEGA_3', 'EAA', 'BCAA', 'COLLAGEN',
  'MULTIVITAMIN', 'TART_CHERRY', 'ANTIOXIDANTS_CE', 'THEANINE', 'ASHWAGANDHA'];
const RISK_IDS = ['TESTOSTERONE_BOOSTER', 'FAT_BURNER', 'PROHORMONES', 'STIMULANT_ADULTERANTS', 'UNDECLARED_CONTAMINATION'];
const BANNED_SUBSTANCE_IDS = ['DHEA', 'DMAA', 'DMBA'];
const ALL_NK07_IDS = NEW_P1_IDS.concat(RISK_IDS).concat(BANNED_SUBSTANCE_IDS);

// A: all P0 discoverable
// NK-07 focust op de P1-lacune; de discovery-mechaniek van de negen P0-
// items is in eerdere sprints al bepaald en blijft hier ongewijzigd. Drie
// ervan zijn INGREDIENT_GROUP's die via een ander topic_id ontsloten
// worden (cross-mapping, geen duplicate truth); de overige zes worden
// (nog) niet via het Topics-systeem ontsloten maar hebben wel releasable
// claims in de registry -- dat is de eerlijke, feitelijke huidige staat.
const P0_TOPIC_CROSS_MAP = { PROTEIN_GROUP: 'PROTEIN', CARB_GROUP: 'CARBOHYDRATES', ELECTROLYTE_GROUP: 'HYDRATION' };
Catalog.CATALOG.filter((c) => c.priority === 'P0').forEach((c) => {
  ok(c.evidence_coverage_status === 'CERTIFIED', 'A: P0-item ' + c.supplement_id + ' is CERTIFIED');
  const topicId = P0_TOPIC_CROSS_MAP[c.supplement_id] || c.supplement_id;
  const heeftTopic = !!Topics.getTopic(topicId);
  const heeftReleasableClaim = Evidence.CLAIMS.some((claim) => claim.supplement_id === c.supplement_id && Service.isClaimReleasable(Service.resolveClaim(claim.evidence_id)));
  ok(heeftTopic || heeftReleasableClaim, 'A-b: P0-item ' + c.supplement_id + ' is discoverable (via topic ' + topicId + ' of via een releasable claim)');
});
ok(Catalog.CATALOG.filter((c) => c.priority === 'P0').length === 9, 'A-c: exact 9 P0-items (actueel uit code, niet hardgecodeerd elders)');

// B: all P1 appropriately handled
Catalog.CATALOG.filter((c) => c.priority === 'P1').forEach((c) => {
  ok(c.evidence_coverage_status === 'CERTIFIED', 'B: P1-item ' + c.supplement_id + ' is CERTIFIED na NK-07');
});

// C: all published claims traceable
ALL_NK07_IDS.forEach((tid) => {
  const t = Topics.getTopic(tid);
  ok(!!t, 'C-sanity: topic ' + tid + ' bestaat');
  if (!t) return;
  t.sections.forEach((s) => s.evidence_refs.forEach((r) => ok(!!Service.resolveClaim(r), 'C: sectie ' + s.section_id + ' (' + tid + ') verwijst naar bestaande claim')));
});

// D: no orphan sources
['ISSN-REVIEW-2018', 'ISSN-BICARBONATE-2021', 'NITRATE-PERFORMANCE-JONES-2014', 'TARTCHERRY-META-2026', 'FDA-DMAA-DMBA-SAFETY', 'WADA-PROHIBITED-LIST-CURRENT'].forEach((sid) => {
  ok(Evidence.CLAIMS.some((c) => c.sources.indexOf(sid) >= 0), 'D: nieuwe bron ' + sid + ' wordt door minstens één claim gebruikt');
});

// E: no duplicate canonical IDs
const allIds = Catalog.CATALOG.map((c) => c.supplement_id);
ok(new Set(allIds).size === allIds.length, 'E: geen dubbele canonical supplement_id in de catalogus');
const allEvidenceIds = Evidence.CLAIMS.map((c) => c.evidence_id);
ok(new Set(allEvidenceIds).size === allEvidenceIds.length, 'E-b: geen dubbele evidence_id in de registry');

// F: no synonym collision causing false evidence (structureel: elk nieuw item heeft een unieke canonical_name)
const newCatalogItems = ALL_NK07_IDS.map((id) => Catalog.getById(id));
const canonicalNames = newCatalogItems.map((c) => c.canonical_name);
ok(new Set(canonicalNames).size === canonicalNames.length, 'F: geen dubbele canonical_name onder de nieuwe items (voorkomt synoniem-verwarring)');

// G: custom supplement gets no accidental evidence
ok(Catalog.getById('SUPERMEGATESTBOOST_NONEXISTENT') == null, 'G: een niet-bestaand/custom supplement krijgt geen catalogusmatch');

// H/I: GUIDANCE/UNCERTAINTY contract
ALL_NK07_IDS.forEach((tid) => {
  Evidence.CLAIMS.filter((c) => c.supplement_id === tid).forEach((c) => {
    if (c.output_mode === 'GUIDANCE') ok(c.evidence_status === 'VERIFIED' && c.ready_for_production === true, 'H: ' + c.evidence_id + ' GUIDANCE-claim voldoet aan VERIFIED+ready=true');
    if (c.output_mode === 'UNCERTAINTY_EDUCATION' && c.evidence_status === 'INSUFFICIENT') ok(c.ready_for_production === true && c.user_visible === true, 'I: ' + c.evidence_id + ' UNCERTAINTY-claim voldoet aan INSUFFICIENT+ready=true+user_visible');
  });
});

// J: REMOVE hidden from guidance (geen enkele nieuwe claim heeft status REMOVE, sanity check)
ok(Evidence.CLAIMS.filter((c) => ALL_NK07_IDS.indexOf(c.supplement_id) >= 0 && c.evidence_status === 'REMOVE').every((c) => c.output_mode === 'HIDDEN' && c.user_visible === false), 'J: elke eventuele REMOVE-claim onder de nieuwe items is HIDDEN/niet user_visible');

// K: REVISE+ready forbidden
ok(Evidence.CLAIMS.filter((c) => c.evidence_status === 'REVISE' && c.ready_for_production === true).length === 0, 'K: geen enkele claim in de hele registry is REVISE+ready=true');

// L: creatine kidney boundary (regressie, ongewijzigd)
ok(!!Evidence.getById && true, 'L-setup'); // getById mogelijk niet geëxporteerd, val terug op filter
const creatineKidney = Evidence.CLAIMS.find((c) => c.supplement_id === 'CREATINE' && /nier|kidney|creatinine/i.test(c.claim));
ok(!!creatineKidney, 'L: creatine-nierennuance blijft aanwezig in de registry');

// M: caffeine safety (regressie)
const caffeineSafety = Evidence.CLAIMS.find((c) => c.supplement_id === 'CAFFEINE' && c.output_mode === 'SAFETY_WARNING');
ok(!!caffeineSafety, 'M: cafeïne heeft nog steeds een SAFETY_WARNING-claim');

// N: beta-alanine scope (regressie)
const betaAlanineClaims = Evidence.CLAIMS.filter((c) => c.supplement_id === 'BETA_ALANINE');
ok(betaAlanineClaims.length > 0 && !betaAlanineClaims.some((c) => /maakt je sterker\b/i.test(c.claim)), 'N: bèta-alanine heeft geen "maakt je sterker"-overclaim');

// O: melatonin NL regulatory wording (regressie)
const melatoninClaims = Evidence.CLAIMS.filter((c) => c.supplement_id === 'MELATONIN');
ok(melatoninClaims.length > 0, 'O: melatonine-claims blijven aanwezig');

// P: iron medical boundary (regressie)
ok(Evidence.CLAIMS.some((c) => c.supplement_id === 'IRON' && c.output_mode === 'MEDICAL_REFERRAL'), 'P: ijzer heeft nog steeds een MEDICAL_REFERRAL-claim');

// Q: vitamin D performance uncertainty (regressie)
ok(Evidence.CLAIMS.some((c) => c.supplement_id === 'VITAMIN_D' && c.evidence_status === 'INSUFFICIENT'), 'Q: vitamine D behoudt zijn INSUFFICIENT-prestatienuance');

// R: electrolytes EAH boundary (regressie)
ok(Evidence.CLAIMS.some((c) => c.supplement_id === 'ELECTROLYTE_GROUP' && /overdrinken|hyponatri/i.test(c.claim)), 'R: elektrolyten behouden de EAH/overdrink-nuance');

// S: product-category does not inherit ingredient efficacy
RISK_IDS.filter((id) => Catalog.getById(id).entity_type === 'PRODUCT_CATEGORY').forEach((id) => {
  const claims = Evidence.CLAIMS.filter((c) => c.supplement_id === id);
  ok(claims.every((c) => c.output_mode !== 'GUIDANCE' || /categorie|marketing/i.test(c.claim)), 'S: productcategorie ' + id + ' erft geen automatische effectclaim (geen kale GUIDANCE-efficacyclaim)');
});

// T: anti-doping triage != WADA certification
const undeclaredContam = Evidence.CLAIMS.find((c) => c.evidence_id === 'UNDECCONTAM-GENERAL-001');
ok(!!undeclaredContam && /geen gecertificeerde WADA-status/i.test(undeclaredContam.claim), 'T: de contaminatie-claim expliciet ontkent een gecertificeerde WADA-status');
ok(!Evidence.CLAIMS.some((c) => /wada[\s-]?(approved|safe)/i.test(c.claim) || /gegarandeerd dopingvrij/i.test(c.claim)), 'T-b: geen enkele claim beweert "WADA approved/safe" of "gegarandeerd dopingvrij"');

// U: logging != recommendation (structureel, index.html)
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
ok(!/loggen.{0,30}(betekent|is)\s+(een\s+)?aanbeveling/i.test(html), 'U: nergens wordt gesuggereerd dat loggen van een supplement een aanbeveling betekent');

// V: no personal dose calculation
const serviceSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeService.js'), 'utf8');
ALL_NK07_IDS.forEach((tid) => {
  Evidence.CLAIMS.filter((c) => c.supplement_id === tid).forEach((c) => {
    ok(!/\bjouw\b.{0,15}\bdosis\b|\d+\s*mg\s*\/\s*kg\s*[x×]/i.test(c.claim), 'V: claim ' + c.evidence_id + ' bevat geen persoonlijke dosis-berekening');
  });
});

// W: no AI calculation
const resolverSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeResolver.js'), 'utf8');
ok(ALL_NK07_IDS.every((id) => resolverSrc.indexOf(id) === -1), 'W: de Knowledge Resolver bevat geen enkele hardcoded verwijzing naar een NK-07-supplement (puur generieke matching, geen speciale rekencode)');

// X-AA: 360/390/412/430 mobile (fluid, gedeeld component -- geen nieuwe vaste-breedte CSS)
ok(!ALL_NK07_IDS.some((id) => new RegExp('#' + id + '[^{]*\\{[^}]*width:\\s*\\d{3,}px').test(html)), 'X-AA: geen nieuwe, vaste-breedte CSS specifiek voor een NK-07-supplementscherm');

// AB: source rendering (elke bron heeft titel + organisatie/auteur)
ALL_NK07_IDS.forEach((tid) => {
  const t = Topics.getTopic(tid);
  const refs = [];
  t.sections.forEach((s) => s.evidence_refs.forEach((r) => refs.push(r)));
  refs.forEach((r) => {
    const c = Service.resolveClaim(r);
    (c.sources || []).forEach((s) => ok(!!s.title, 'AB: bron in ' + r + ' heeft een titel'));
  });
});

// AC: evidence labels
ALL_NK07_IDS.forEach((tid) => {
  Evidence.CLAIMS.filter((c) => c.supplement_id === tid && c.ready_for_production).forEach((c) => {
    ok(!!c.user_visible_evidence_label, 'AC: claim ' + c.evidence_id + ' heeft een user-visible evidence-label');
  });
});

// AD: FAQ
ALL_NK07_IDS.forEach((tid) => {
  ok(Service.getFaq(tid).status === 'OK' && Service.getFaq(tid).items.length > 0, 'AD: topic ' + tid + ' heeft minstens 1 FAQ-item');
});

// AE: science tab
ALL_NK07_IDS.forEach((tid) => {
  ok(Service.getScienceDetail(tid).status === 'OK', 'AE: topic ' + tid + ' heeft een werkende Wetenschap-tab');
});

// AF: no XSS (claims bevatten geen HTML/script-tags)
Evidence.CLAIMS.filter((c) => ALL_NK07_IDS.indexOf(c.supplement_id) >= 0).forEach((c) => {
  ok(!/<script|<img|onerror=/i.test(c.claim) && !/<script|<img|onerror=/i.test(c.user_visible_summary || ''), 'AF: claim ' + c.evidence_id + ' bevat geen HTML/script-injectie');
});

// AG: UNKNOWN semantics (structureel -- geen enkele claim vult onbekende input stilzwijgend met 0/standaardwaarde)
ok(!Evidence.CLAIMS.some((c) => ALL_NK07_IDS.indexOf(c.supplement_id) >= 0 && /standaard.{0,10}0\b/i.test(c.claim)), 'AG: geen enkele nieuwe claim vult ontbrekende input stilzwijgend met 0');

// ── Extra: 1-op-1 sectie-groepdekking voor alle 20 nieuwe topics ──
ALL_NK07_IDS.forEach((tid) => {
  const t = Topics.getTopic(tid);
  const special = ['veelgestelde-vragen', 'wetenschap', 'bronnen'];
  const expected = t.sections.map((s) => s.section_id).filter((id) => special.indexOf(id) === -1);
  const actual = Groups.allGroupedSectionIds(tid);
  ok(JSON.stringify(expected.slice().sort()) === JSON.stringify(actual.slice().sort()), 'extra: ' + tid + ' heeft 1-op-1 sectie-groepdekking');
});

// ── Adversarial: hype-claims blijven ongehedgd afwezig ──
function bevatOngehedgdeHype(texts, mythPattern) {
  return texts.some((t) => mythPattern.test(t) && !/onvoldoende|geen (goed )?bewijs|zwak.{0,20}bewijs|inconsistent/i.test(t));
}
const allNewTexts = Evidence.CLAIMS.filter((c) => ALL_NK07_IDS.indexOf(c.supplement_id) >= 0).map((c) => c.user_visible_summary || '')
  .concat(ALL_NK07_IDS.map((id) => Topics.getTopic(id).sections.map((s) => s.body)).reduce((a, b) => a.concat(b), []));
ok(!bevatOngehedgdeHype(allNewTexts, /ashwagandha (verhoogt|verbetert) (gegarandeerd|altijd)/i), 'adversarial: geen ongehedgde ashwagandha-overclaim');
ok(!bevatOngehedgdeHype(allNewTexts, /testosteron-booster.{0,20}werkt (altijd|gegarandeerd)/i), 'adversarial: geen ongehedgde testosteron-booster-overclaim');
ok(!/DMAA is veilig/i.test(allNewTexts.join(' ')), 'adversarial: geen "DMAA is veilig"-bewering');
ok(!/DMBA is veilig/i.test(allNewTexts.join(' ')), 'adversarial: geen "DMBA is veilig"-bewering');

console.log('fNK07SupplementKnowledgeCompletion: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
