/* fMicronutrientsIntelligence.test.js — NK-06. */
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
const Resolver = require('./nutritionKnowledgeResolver.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const MICRO_TOPICS = ['IRON', 'VITAMIN_D', 'CALCIUM', 'MAGNESIUM', 'ZINC', 'VITAMIN_B12', 'FOLATE', 'IODINE'];
const NEW_MICRO_SUPPLEMENT_IDS = ['CALCIUM', 'MAGNESIUM', 'VITAMIN_B12', 'ZINC', 'FOLATE', 'IODINE'];
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

// A: all claims traceable
MICRO_TOPICS.forEach((topicId) => {
  Topics.getTopic(topicId).sections.forEach((s) => {
    s.evidence_refs.forEach((r) => ok(!!Service.resolveClaim(r), 'A: sectie "' + s.section_id + '" (' + topicId + ') verwijst naar een bestaande claim'));
  });
});

// B: no orphan source (elke nieuwe bron wordt door minstens 1 claim gebruikt)
['EFSA-DRV-TOPIC-OVERVIEW', 'COCHRANE-MAGNESIUM-CRAMPS-2020', 'MTE-ATHLETIC-PERFORMANCE-SYSREV-2019'].forEach((sid) => {
  const used = SupEvidence.CLAIMS.some((c) => c.sources.indexOf(sid) >= 0);
  ok(used, 'B: nieuwe bron ' + sid + ' wordt door minstens één claim gebruikt');
});

// C: deficiency != low intake (claims maken dit onderscheid, geen gelijkstelling)
ok(SupEvidence.getById('IRON-DIAGNOSIS-001').claim.match(/bloedmarkers/i), 'C: IJzertekort-diagnose vereist bloedmarkers, niet alleen "lage inname"-taal');
ok(SupEvidence.getById('B12-DIAGNOSIS-001').claim.match(/bloedonderzoek/i), 'C-b: B12-tekort-diagnose vereist bloedonderzoek, niet alleen inname');

// D: no symptom diagnosis
['IRON-FORBIDDEN-001', 'B12-DIAGNOSIS-001', 'IOD-DIAGNOSIS-001'].forEach((id) => {
  const c = SupEvidence.getById(id);
  ok(c.forbidden_interpretations.some((f) => /vermoeidheid|vaststellen/i.test(f)) || /vermoeidheid/i.test(c.claim), 'D: ' + id + ' verbiedt expliciet symptoom-alleen-diagnose (bv. vermoeidheid)');
});

// E: iron medical boundary
ok(SupEvidence.getById('IRON-FORBIDDEN-001').output_mode === 'MEDICAL_REFERRAL', 'E: IJzer-architectuurregel is expliciet MEDICAL_REFERRAL');
ok(SupEvidence.getById('IRON-PERF-DEFICIENT-001').requires_medical_referral === true, 'E-b: IJzersuppletie-bij-tekort-claim vereist medische verwijzing');

// F: vitamin D performance boundary (geen automatische "verbetert prestatie"-claim user-visible)
ok(SupEvidence.getById('VITD-PERF-GENERAL-001').output_mode === 'HIDDEN' && SupEvidence.getById('VITD-PERF-GENERAL-001').user_visible === false, 'F: de ongefundeerde "vitamine D verbetert prestatie bij iedereen"-claim blijft HIDDEN');
ok(!Service.isClaimReleasable(Service.resolveClaim('VITD-PERF-GENERAL-001')), 'F-b: die claim is ook via de Knowledge Service nooit releasable');

// G: magnesium hype blocked
const magCramp = SupEvidence.getById('MAG-CRAMP-001');
ok(magCramp.evidence_status === 'INSUFFICIENT' && magCramp.forbidden_interpretations.some((f) => /voorkomt spierkramp/i.test(f)), 'G: "magnesium voorkomt kramp" is expliciet als INSUFFICIENT + forbidden geregistreerd, niet als bewezen feit gepubliceerd');
// Let op: de mythe mag WEL genoemd worden om 'm te weerleggen (bv. tussen
// aanhalingstekens gevolgd door "onvoldoende onderbouwd") -- dat is precies
// de correcte weerlegging, geen overtreding. Alleen een sectie die de
// mythe noemt ZONDER ergens in diezelfde tekst een weerlegging/hedge te
// bevatten, is een echte overtreding.
function bevatOngehedgdeHype(sectionBodies, mythPattern) {
  return sectionBodies.some((body) => mythPattern.test(body) && !/onvoldoende|geen (goed )?bewijs|geen aangetoond|zwak.{0,20}onderzoek|industrie-gelieerd/i.test(body));
}
ok(!bevatOngehedgdeHype(Topics.getTopic('MAGNESIUM').sections.map((s) => s.body), /magnesium (voorkomt|verhelpt|geneest) (spier)?kramp\b/i), 'G-b: elke sectie die de magnesium-kramp-mythe noemt, weerlegt hem ook in dezelfde tekst');

// H: zinc testosterone hype blocked
const zincT = SupEvidence.getById('ZINC-TESTOSTERONE-001');
ok(zincT.evidence_status === 'INSUFFICIENT' && zincT.forbidden_interpretations.some((f) => /verhoogt testosteron/i.test(f)), 'H: "zink verhoogt testosteron" is expliciet als INSUFFICIENT + forbidden geregistreerd');
ok(!bevatOngehedgdeHype(Topics.getTopic('ZINC').sections.map((s) => s.body), /zink verhoogt (je |jouw )?testosteron\b/i), 'H-b: elke sectie die de zink-testosteron-mythe noemt, weerlegt hem ook in dezelfde tekst');

// I: B12 vegan context scoped
ok(SupEvidence.getById('B12-VEGAN-001').population === 'veganisten' && SupEvidence.getById('B12-VEGAN-001').forbidden_interpretations.some((f) => /per definitie/i.test(f)), 'I: B12/vegan-claim is gescoped aan veganisten en verbiedt "per definitie een tekort"-overclaim');

// J: folate medical boundary (UL != target, correct gelabeld)
const folUl = SupEvidence.getById('FOL-UL-001');
ok(folUl.output_mode === 'SAFETY_WARNING' && folUl.forbidden_interpretations.some((f) => /aanbevolen dagelijkse hoeveelheid/i.test(f)), 'J: FOL-UL-001 markeert de bovengrens expliciet als GEEN streefwaarde');

// K: calcium bone context
ok(SupEvidence.getById('CALC-REDS-001').sources.indexOf('IOC-REDS-CONSENSUS-2023') >= 0, 'K: Calcium/RED-S-claim hergebruikt de bestaande IOC-REDS-bron (geen duplicate truth)');
ok(!SupEvidence.getById('CALC-REDS-001').claim.match(/calcium alleen voorkomt/i), 'K-b: geen causale oversimplificatie ("calcium alleen voorkomt stressfracturen")');

// L: iodine thyroid boundary
ok(SupEvidence.getById('IOD-BALANCE-001').forbidden_interpretations.some((f) => /jodiumsupplementen verbeteren sportprestatie/i.test(f)), 'L: Jodium-claim verbiedt expliciet een ongefundeerde prestatieclaim');
ok(SupEvidence.getById('IOD-DIAGNOSIS-001').output_mode === 'MEDICAL_REFERRAL', 'L-b: schildklierdiagnose blijft MEDICAL_REFERRAL, geen zelfbeoordeling');

// M: UL != target (herbevestiging, generiek over meerdere claims)
[SupEvidence.getById('FOL-UL-001'), SupEvidence.getById('VITD-SAFE-001')].forEach((c) => {
  ok(c.output_mode === 'SAFETY_WARNING', 'M: bovengrens-gerelateerde claim (' + c.evidence_id + ') is een SAFETY_WARNING, geen streefwaarde-GUIDANCE');
});

// N: no personal supplement dose
NEW_MICRO_SUPPLEMENT_IDS.forEach((sid) => {
  SupEvidence.CLAIMS.filter((c) => c.supplement_id === sid).forEach((c) => {
    ok(!/\bjouw\b.{0,20}\bdosis\b|\bjouw persoonlijke\b/i.test(c.claim), 'N: claim ' + c.evidence_id + ' bevat geen persoonlijke dosis-taal');
  });
});

// O: no AI calculation (dezelfde architectuurgrens, geen berekeningscode toegevoegd)
const resolverSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeResolver.js'), 'utf8');
ok(resolverSrc.indexOf('CALCIUM') === -1 && resolverSrc.indexOf('MAGNESIUM') === -1, 'O: de Knowledge Resolver bevat geen micronutriënt-specifieke berekeningslogica (puur generieke matching)');

// P: uncertainty preserved (INSUFFICIENT-claims blijven als zodanig herkenbaar via de Service)
['MAG-CRAMP-001', 'ZINC-TESTOSTERONE-001'].forEach((id) => {
  const resolved = Service.resolveClaim(id);
  ok(resolved.status === 'INSUFFICIENT', 'P: ' + id + ' blijft via de Service herkenbaar als INSUFFICIENT (onzekerheid behouden)');
});

// Q: cross-topic claim reuse (Iron/VitaminD volledig hergebruikt, Calcium/RED-S hergebruikt IOC-bron)
ok(SupEvidence.CLAIMS.filter((c) => c.supplement_id === 'IRON').length === 7 && SupEvidence.CLAIMS.filter((c) => c.supplement_id === 'VITAMIN_D').length === 6, 'Q: IJzer (7) en Vitamine D (6) zijn volledig hergebruikt, geen enkele nieuwe claim voor deze twee');

// R: no duplicate truth (geen twee identieke claim-teksten binnen de nieuwe set)
const newClaimTexts = SupEvidence.CLAIMS.filter((c) => NEW_MICRO_SUPPLEMENT_IDS.indexOf(c.supplement_id) >= 0).map((c) => c.claim);
ok(new Set(newClaimTexts).size === newClaimTexts.length, 'R: geen twee nieuwe micronutriënt-claims met identieke tekst');

// S: FAQ / T: Science tab / U: sources (gedeelde NK-template, generiek getest)
MICRO_TOPICS.forEach((topicId) => {
  ok(Service.getFaq(topicId).status === 'OK', 'S: FAQ werkt voor ' + topicId);
  ok(Service.getScienceDetail(topicId).status === 'OK', 'T: Wetenschap-tab werkt voor ' + topicId);
  const groups = Groups.getGroupsForTopic(topicId);
  ok(groups.length === 3, 'U: ' + topicId + ' gebruikt de gedeelde 3-groepen-template');
});

// V-Y: 360/390/412/430 (fluid, gedeeld component -- geen nieuwe vaste-breedte CSS)
ok(!/#s-voeding-kennis-topic[^{]*\{[^}]*width:\s*\d{3,}px/.test(html), 'V-Y: geen vaste pixelbreedte toegevoegd voor micronutriënt-schermen (blijft het gedeelde, fluid NK-component)');

// Z: AI intent/relevance regression from NK-04C (ongewijzigd, geen regressie)
const r = Resolver.resolveQuestion('Ik weeg 105 kg. Hoeveel eiwit moet ik eten?', 'PROTEIN');
ok(r.status === 'OK' && !r.APPROVED_FACTS.some((f) => /\b105\b/.test(f)), 'Z: NK-04C-gedrag (geen persoonlijk getal in het antwoord) blijft ongewijzigd werken na NK-06');

// ── Aanvullend: catalogus-status bijgewerkt, geen orphan claims, hub-registratie ──
NEW_MICRO_SUPPLEMENT_IDS.forEach((sid) => {
  const item = SupCatalog.CATALOG.find((c) => c.supplement_id === sid);
  ok(!!item && item.evidence_coverage_status === 'CERTIFIED', 'extra: catalogusstatus van ' + sid + ' is bijgewerkt naar CERTIFIED');
});
SupEvidence.CLAIMS.filter((c) => NEW_MICRO_SUPPLEMENT_IDS.indexOf(c.supplement_id) >= 0).forEach((c) => {
  const topic = Topics.getTopic(c.supplement_id);
  const used = topic && (topic.sections.some((s) => s.evidence_refs.indexOf(c.evidence_id) >= 0) || topic.faq.some((f) => f.evidence_refs.indexOf(c.evidence_id) >= 0));
  ok(used, 'extra: nieuwe claim ' + c.evidence_id + ' wordt door minstens één sectie/FAQ-item gebruikt (geen orphan)');
});
ok(html.indexOf("'IRON', 'VITAMIN_D', 'CALCIUM'") > 0, 'extra: de 8 micronutriëntentopics zijn geregistreerd in de hub (voedingKennisKnownTopics)');

// ── Adversarial audit (repo-breed, sectie 53 vooruitgetrokken voor deze fase) ──
const allNewMicroTexts = SupEvidence.CLAIMS.filter((c) => NEW_MICRO_SUPPLEMENT_IDS.indexOf(c.supplement_id) >= 0).map((c) => c.user_visible_summary || '')
  .concat(MICRO_TOPICS.map((t) => Topics.getTopic(t).sections.map((s) => s.body)).reduce((a, b) => a.concat(b), []));
[/magnesium (voorkomt|verhelpt|geneest) (spier)?kramp\b/i, /zink verhoogt (je |jouw )?testosteron\b/i, /jodium.{0,20}verbetert.{0,20}prestatie/i].forEach((re) => {
  ok(!bevatOngehedgdeHype(allNewMicroTexts, re), 'adversarial: geen ONGEHEDGDE hype-claim (' + re + ') in nieuwe micronutriënt-content');
});

console.log('fMicronutrientsIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
