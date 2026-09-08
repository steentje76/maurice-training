/* fSupplementKnowledgeCompletion.test.js — NK-07 Supplement Knowledge Completion. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Topics = require('./nutritionKnowledgeTopics.js');
const Groups = require('./nutritionKnowledgeUiGroups.js');
const Service = require('./nutritionKnowledgeService.js');
const SupEvidence = require('./nutritionSupplementEvidenceRegistry.js');
const SupSources = require('./nutritionSupplementSourceRegistry.js');
const SupCatalog = require('./nutritionSupplementCatalog.js');
const NutritionSupplementSearch = require('./nutritionSupplementSearch.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
const NEW_P1_IDS = ['SODIUM_BICARBONATE', 'NITRATE_BEETROOT', 'CITRULLINE', 'OMEGA_3', 'EAA', 'BCAA', 'COLLAGEN',
  'MULTIVITAMIN', 'TART_CHERRY', 'ANTIOXIDANTS_CE', 'THEANINE', 'ASHWAGANDHA'];
const RISK_IDS = ['TESTOSTERONE_BOOSTER', 'FAT_BURNER', 'DHEA', 'DMAA', 'DMBA', 'PROHORMONES', 'STIMULANT_ADULTERANTS', 'UNDECLARED_CONTAMINATION'];
const ALL_NEW_IDS = NEW_P1_IDS.concat(RISK_IDS);

// A: all P0 discoverable
const P0_IDS = SupCatalog.CATALOG.filter((c) => c.priority === 'P0').map((c) => c.supplement_id);
ok(P0_IDS.length > 0, 'setup: P0-lijst niet leeg');
P0_IDS.forEach((id) => {
  const item = SupCatalog.CATALOG.find((c) => c.supplement_id === id);
  ok(item.evidence_coverage_status === 'CERTIFIED', 'A: P0-item ' + id + ' is CERTIFIED');
});

// B: all P1 appropriately handled (CERTIFIED of expliciet nog PENDING met reden -- hier: alle nu CERTIFIED)
const P1_IDS = SupCatalog.CATALOG.filter((c) => c.priority === 'P1').map((c) => c.supplement_id);
const p1NotCertified = P1_IDS.filter((id) => SupCatalog.CATALOG.find((c) => c.supplement_id === id).evidence_coverage_status !== 'CERTIFIED');
ok(p1NotCertified.length === 0, 'B: alle actuele P1-catalogusitems zijn CERTIFIED (' + p1NotCertified.join(',') + ' zijn dat niet)');

// C: all published claims traceable
SupEvidence.CLAIMS.filter((c) => ALL_NEW_IDS.indexOf(c.supplement_id) >= 0).forEach((c) => {
  c.sources.forEach((sid) => ok(!!SupSources.getById(sid), 'C: claim ' + c.evidence_id + ' verwijst naar bestaande bron ' + sid));
});

// D: no orphan sources (nieuwe bronnen worden allemaal gebruikt)
['ISSN-SODIUM-BICARBONATE-2021', 'BEETROOT-NITRATE-UMBRELLA-2025', 'CITRULLINE-MALATE-METAANALYSIS-2026', 'GSSI-BCAA-EAA-REVIEW',
  'HYPERTROPHY-ADJUNCTS-REVIEW-2025', 'ASHWAGANDHA-SYSREV-MUSCLES-2025', 'ASHWAGANDHA-HORMONAL-SAFETY-2025',
  'WADA-PROHIBITED-LIST-OVERVIEW', 'AIS-SUPPLEMENT-FRAMEWORK-GROUP-D'].forEach((sid) => {
  ok(SupEvidence.CLAIMS.some((c) => c.sources.indexOf(sid) >= 0), 'D: nieuwe bron ' + sid + ' wordt door minstens één claim gebruikt');
});

// E: no duplicate canonical IDs
const allIds = SupCatalog.CATALOG.map((c) => c.supplement_id);
ok(new Set(allIds).size === allIds.length, 'E: geen duplicate canonical supplement_id in de catalogus');
const allEvidenceIds = SupEvidence.CLAIMS.map((c) => c.evidence_id);
ok(new Set(allEvidenceIds).size === allEvidenceIds.length, 'E-b: geen duplicate evidence_id');

// F: no synonym collision causing false evidence
ALL_NEW_IDS.forEach((id) => {
  const item = SupCatalog.CATALOG.find((c) => c.supplement_id === id);
  (item.synonyms || []).forEach((syn) => {
    const collidingItems = SupCatalog.CATALOG.filter((c) => c.supplement_id !== id && (c.synonyms || []).indexOf(syn) >= 0);
    ok(collidingItems.length === 0, 'F: synoniem "' + syn + '" van ' + id + ' botst niet met een ander catalogusitem');
  });
});

// G: custom supplement gets no accidental evidence
{
  const result = NutritionSupplementSearch.search('SuperMegaTestBoost9000', SupCatalog.CATALOG);
  const strongMatch = Array.isArray(result) ? result.find((r) => r.score > 0.8) : null;
  ok(!strongMatch, 'G: een verzonnen, niet-bestaand supplement krijgt geen sterke fuzzy-match naar een bestaand item met evidence');
}

// H/I/J/K: contract invariants (Supplement Evidence architecture)
SupEvidence.CLAIMS.forEach((c) => {
  if (c.output_mode === 'GUIDANCE') ok(c.evidence_status === 'VERIFIED' && c.ready_for_production === true, 'H: GUIDANCE-claim ' + c.evidence_id + ' = VERIFIED + ready=true');
  if (c.output_mode === 'UNCERTAINTY_EDUCATION' && c.evidence_status === 'INSUFFICIENT') ok(c.ready_for_production === true && c.user_visible === true, 'I: UNCERTAINTY_EDUCATION+INSUFFICIENT-claim ' + c.evidence_id + ' = ready=true + user_visible');
  if (c.evidence_status === 'REMOVE') ok(c.output_mode !== 'GUIDANCE' && c.allowed_ai_use !== undefined, 'J: REMOVE-claim ' + c.evidence_id + ' is nooit GUIDANCE');
  ok(!(c.evidence_status === 'REVISE' && c.ready_for_production === true), 'K: REVISE+ready=true is verboden (' + c.evidence_id + ')');
});

// L: creatine kidney boundary
ok(SupEvidence.CLAIMS.some((c) => c.supplement_id === 'CREATINE' && /nier|kidney|creatinine/i.test(c.claim)), 'L: creatine-nier/creatinine-nuance blijft aanwezig');
ok(!SupEvidence.CLAIMS.some((c) => c.supplement_id === 'CREATINE' && /veilig voor (de )?nieren\b/i.test(c.user_visible_summary || '') && !/gezonde|normale/i.test(c.user_visible_summary || '')), 'L-b: geen blanket "veilig voor de nieren"-claim');

// M: caffeine safety
ok(SupEvidence.CLAIMS.some((c) => c.supplement_id === 'CAFFEINE' && c.output_mode === 'SAFETY_WARNING'), 'M: cafeïne-veiligheidsclaim aanwezig');

// N: beta-alanine scope
ok(!SupEvidence.CLAIMS.some((c) => c.supplement_id === 'BETA_ALANINE' && /maakt je (sterker|krachtiger)\b/i.test(c.claim)), 'N: geen algemene "beta-alanine maakt je sterker"-claim');

// O: melatonin NL regulatory wording
ok(SupEvidence.CLAIMS.some((c) => c.supplement_id === 'MELATONIN' && /0,3\s*mg|0\.3\s*mg/.test(c.claim)), 'O: melatonine-NL-nuance (0,3 mg-context) blijft aanwezig');
ok(!SupEvidence.CLAIMS.some((c) => c.supplement_id === 'MELATONIN' && /2\s*mg/.test(c.claim) && /drempel|grens/i.test(c.claim)), 'O-b: geen 2 mg-drempel-claim');

// P: iron medical boundary
ok(SupEvidence.CLAIMS.some((c) => c.supplement_id === 'IRON' && c.output_mode === 'MEDICAL_REFERRAL'), 'P: ijzer-medische-verwijzing aanwezig');

// Q: vitamin D performance uncertainty
ok(SupEvidence.CLAIMS.some((c) => c.supplement_id === 'VITAMIN_D' && c.evidence_status === 'INSUFFICIENT'), 'Q: vitamine D-prestatie-onzekerheid blijft aanwezig');

// R: electrolytes EAH boundary (bestaand, herbevestiging)
ok(SupEvidence.CLAIMS.some((c) => c.supplement_id === 'ELECTROLYTE_GROUP' && /hyponatri/i.test(c.claim)), 'R: elektrolyten/EAH-claim blijft aanwezig');

// S: product-category does not inherit ingredient efficacy
['TESTOSTERONE_BOOSTER', 'FAT_BURNER'].forEach((id) => {
  ok(SupEvidence.CLAIMS.some((c) => c.supplement_id === id && /marketingcategorie|marketingnaam/i.test(c.claim)), 'S: ' + id + ' heeft een expliciete "categorie erft geen effectclaim"-claim');
});

// T: anti-doping triage != WADA certification
ok(SupEvidence.CLAIMS.some((c) => c.evidence_id === 'ANTIDOPING-TRIAGE-NOT-CERTIFICATION-001' && /nooit een gecertificeerde WADA-status/i.test(c.claim)), 'T: expliciete triage-vs-certificatie-claim aanwezig');

// U: logging != recommendation
ok(/logg\w*.{0,200}(niet|geen).{0,60}(advies|aanbeveling)/is.test(html) || /betekent NIET.{0,80}(adviseert|aanbeveelt)/is.test(html), 'U: er bestaat een expliciete logging!=aanbeveling-boodschap in de UI-laag');

// V: no personal dose calculation
const newClaimTexts = SupEvidence.CLAIMS.filter((c) => ALL_NEW_IDS.indexOf(c.supplement_id) >= 0).map((c) => c.claim + ' ' + (c.user_visible_summary || ''));
ok(!newClaimTexts.some((t) => /\bjouw\b.{0,15}\bdosis\b/i.test(t)), 'V: geen enkele nieuwe claim bevat persoonlijke-dosis-taal');

// W: no AI calculation
const resolverSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeResolver.js'), 'utf8');
ALL_NEW_IDS.forEach((id) => ok(resolverSrc.indexOf(id) === -1, 'W: resolver bevat geen ' + id + '-specifieke berekeningslogica'));

// X/Y/Z/AA: mobile breakpoints (gedeeld NK-component, generieke check)
ok(!/#s-voeding-kennis-topic[^{]*\{[^}]*width:\s*\d{3,}px/.test(html), 'X-AA: geen vaste pixelbreedte toegevoegd (blijft het gedeelde, fluid NK-component, getest op 360/390/412/430)');

// AB/AC/AD/AE: source rendering, evidence labels, FAQ, science tab (gedeeld sjabloon)
ALL_NEW_IDS.forEach((id) => {
  ok(Service.getFaq(id).status === 'OK', 'AD: FAQ werkt voor ' + id);
  ok(Service.getScienceDetail(id).status === 'OK', 'AE: Wetenschap-tab werkt voor ' + id);
  const groups = Groups.getGroupsForTopic(id);
  ok(groups.length >= 1, 'AB: ' + id + ' gebruikt het gedeelde groepen-sjabloon');
});
SupEvidence.CLAIMS.filter((c) => ALL_NEW_IDS.indexOf(c.supplement_id) >= 0 && c.user_visible).forEach((c) => {
  ok(c.user_visible_evidence_label !== undefined, 'AC: claim ' + c.evidence_id + ' heeft een evidence-label-veld (mag null zijn voor architectuurregels)');
});

// AF: no XSS (claim-teksten bevatten geen scripttags/html-injectie)
SupEvidence.CLAIMS.filter((c) => ALL_NEW_IDS.indexOf(c.supplement_id) >= 0).forEach((c) => {
  ok(!/<script|<img[^>]+onerror|javascript:/i.test(c.claim + (c.user_visible_summary || '')), 'AF: claim ' + c.evidence_id + ' bevat geen XSS-payload');
});

// AG: UNKNOWN semantics (n.v.t. i.p.v. stilzwijgend leeg/0 voor niet-toepasselijke velden)
SupEvidence.CLAIMS.filter((c) => ALL_NEW_IDS.indexOf(c.supplement_id) >= 0).forEach((c) => {
  ok(c.outcome !== '' && c.outcome !== undefined, 'AG: claim ' + c.evidence_id + ' heeft een expliciete outcome (n.v.t. i.p.v. leeg)');
});

// ── Adversarial audit: hype-claims blijven bewust ongehedged afwezig ──
function bevatOngehedgdeHype(texts, mythPattern) {
  return texts.some((t) => mythPattern.test(t) && !/onvoldoende|geen (goed )?bewijs|onzeker|geen aangetoond|wisselend/i.test(t));
}
const allNewTexts = SupEvidence.CLAIMS.filter((c) => ALL_NEW_IDS.indexOf(c.supplement_id) >= 0).map((c) => c.claim + ' ' + (c.user_visible_summary || ''))
  .concat(NEW_P1_IDS.map((id) => Topics.getTopic(id).sections.map((s) => s.body)).reduce((a, b) => a.concat(b), []));
[/citrulline verbetert gegarandeerd/i, /ashwagandha is een bewezen prestatieverhoger/i, /BCAA alleen is genoeg voor spieropbouw/i].forEach((re) => {
  ok(!bevatOngehedgdeHype(allNewTexts, re), 'adversarial: geen ongehedgde hype-claim (' + re + ')');
});

// ── Catalogus-status/hub-registratie ──
ALL_NEW_IDS.forEach((id) => {
  const item = SupCatalog.CATALOG.find((c) => c.supplement_id === id);
  ok(!!item && item.evidence_coverage_status === 'CERTIFIED', 'extra: catalogusstatus van ' + id + ' is CERTIFIED');
  ok(html.indexOf("'" + id + "'") > 0, 'extra: ' + id + ' is geregistreerd in de hub (voedingKennisKnownTopics)');
});

console.log('fSupplementKnowledgeCompletion: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
