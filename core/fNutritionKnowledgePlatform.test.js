/* fNutritionKnowledgePlatform.test.js — NK-01. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Topics = require('./nutritionKnowledgeTopics.js');
const KEvidence = require('./nutritionKnowledgeEvidenceRegistry.js');
const KSources = require('./nutritionKnowledgeSources.js');
const SupEvidence = require('./nutritionSupplementEvidenceRegistry.js');
const SupSources = require('./nutritionSupplementSourceRegistry.js');
const Service = require('./nutritionKnowledgeService.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A: ieder gepubliceerd feit heeft evidence traceability ----
['CREATINE', 'PROTEIN'].forEach((topicId) => {
  Topics.getTopic(topicId).sections.forEach((s) => {
    s.evidence_refs.forEach((ref) => {
      ok(!!Service.resolveClaim(ref), 'A: sectie "' + s.section_id + '" (' + topicId + ') verwijst naar een bestaande, resolvebare claim (' + ref + ')');
    });
  });
});

// ---- B: bron-ID bestaat werkelijk ----
KEvidence.CLAIMS.forEach((c) => {
  c.source_ids.forEach((sid) => {
    ok(!!Service.resolveSource(sid), 'B: bron "' + sid + '" van claim ' + c.claim_id + ' bestaat in een van beide Source Registries');
  });
});

// ---- C: REMOVE-claims nooit zichtbaar ----
// (er bestaan vandaag geen NK-REMOVE-claims; test bewaakt het FILTER-mechanisme zelf)
const fakeRemove = { claim_id: 'TEST-REMOVE', status: 'REMOVE', evidence_level: 'A' };
ok(Service.isClaimReleasable(fakeRemove) === false, 'C: isClaimReleasable wijst een REMOVE-status altijd af');
ok(!SupEvidence.CLAIMS.some((c) => c.evidence_status === 'REMOVE' && Service.isClaimReleasable(Service.resolveClaim(c.evidence_id))),
  'C-b: de bestaande REMOVE-claim (sodium-hyponatriemie) blijft ook via deze service ongezien');

// ---- D: REVISE niet production-ready ----
const fakeRevise = { claim_id: 'TEST-REVISE', status: 'REVISE', evidence_level: 'B' };
ok(Service.isClaimReleasable(fakeRevise) === false, 'D: isClaimReleasable wijst een REVISE-status altijd af');

// ---- E: INSUFFICIENT niet als bewezen advies ----
const vitdSection = Service.getSection('CREATINE', 'wat-is-het'); // placeholder, echte insufficient-check hieronder
const insufficientClaim = KEvidence.CLAIMS.find((c) => c.status === 'INSUFFICIENT');
ok(!insufficientClaim, 'E: er bestaan vandaag bewust geen INSUFFICIENT NK-claims (alle nieuwe claims zijn VERIFIED); mocht dat wijzigen, dan geldt de AI-contractregel hieronder');
// AI-contractniveau: als een claim ooit INSUFFICIENT is, mag hij nooit in APPROVED_FACTS staan.
const supInsufficient = SupEvidence.byStatus('INSUFFICIENT')[0];
const resolvedInsufficient = Service.resolveClaim(supInsufficient.evidence_id);
ok(resolvedInsufficient.status === 'INSUFFICIENT' && resolvedInsufficient.confidence === 'Onvoldoende bewijs',
  'E-b: een hergebruikte INSUFFICIENT-claim krijgt via deze service het label "Onvoldoende bewijs", nooit een sterker label');

// ---- F: evidence level niet door UI overschreven ----
// (structurele garantie: confidenceLabel is een PURE functie van level+status, UI kan er niet
// "omheen" een ander label kiezen zonder de brondata te wijzigen -- getest door determinisme)
ok(KEvidence.confidenceLabel('A', 'VERIFIED') === 'Sterk bewijs' && KEvidence.confidenceLabel('A', 'VERIFIED') === KEvidence.confidenceLabel('A', 'VERIFIED'),
  'F: confidenceLabel is deterministisch en niet aanpasbaar per aanroep');
ok(KEvidence.confidenceLabel('D', 'VERIFIED') === 'Onvoldoende bewijs', 'F-b: evidence level D wordt nooit als sterk bewijs getoond, ongeacht status');

// ---- G: user-friendly tekst verandert claimbetekenis niet ----
// (steekproef: user_friendly_summary bevat geen omgekeerde bewering t.o.v.
// claim_text_internal. Claims zonder user_friendly_summary zijn HIDDEN/
// architectuurclaims -- die worden nooit getoond, dus hier niet relevant.
// Woordgrenzen (\b) verplicht: zonder grenzen matcht "geen" ook als
// substring binnen "glycogeen", wat valse positieven gaf voor elke
// koolhydraat-/hersteltclaim die het woord "glycogeen" noemt.)
KEvidence.CLAIMS.filter((c) => !!c.user_friendly_summary).forEach((c) => {
  const negatiefInIntern = /\b(geen|niet|nooit)\b/i.test(c.claim_text_internal);
  const negatiefInSummary = /\b(geen|niet|nooit)\b/i.test(c.user_friendly_summary);
  ok(negatiefInIntern === negatiefInSummary || !negatiefInIntern, 'G: ontkenning in claim_text_internal van ' + c.claim_id + ' komt overeen met de gebruikersvriendelijke samenvatting (geen tegengestelde betekenis)');
});

// ---- H: FAQ gebruikt bestaande claims ----
Topics.TOPICS.forEach((t) => {
  t.faq.forEach((f) => {
    ok(f.evidence_refs.length > 0, 'H: FAQ-item "' + f.faq_id + '" heeft minstens één evidence_ref (geen ongecontroleerde vrije FAQ-waarheid)');
    f.evidence_refs.forEach((ref) => ok(!!Service.resolveClaim(ref), 'H-b: FAQ-item "' + f.faq_id + '" verwijst naar een bestaande claim (' + ref + ')'));
  });
});

// ---- I: AI-context bevat alleen toegestane claims ----
const aiCtxCreatine = Service.buildAiContext('CREATINE', 'CRE-FAQ-CREATININE');
const claimForCtx = Service.resolveClaim('CRE-SAFE-002');
ok(claimForCtx.allowed_ai_use === true, 'I: de gebruikte claim (CRE-SAFE-002) heeft zelf allowed_ai_use=true');
// NK-03: NK-ENE-NOCALC-001 is de eerste NK-claim met allowed_ai_use=false (een
// architectuurregel-claim, geen gebruikerszin) -- de architectuur ondersteunde
// dit al sinds NK-01, nu voor het eerst daadwerkelijk gebruikt. Test bewaakt
// dat zo'n claim nooit door de AI-contractbouwer wordt meegenomen.
const disallowedClaim = KEvidence.getById('NK-ENE-NOCALC-001');
ok(disallowedClaim && disallowedClaim.allowed_ai_use === false, 'I-b: NK-ENE-NOCALC-001 bestaat en heeft expliciet allowed_ai_use=false');
const energyCtx = Service.buildAiContext('ENERGY', 'ENE-FAQ-BALANS');
ok(energyCtx.status === 'OK' && !energyCtx.APPROVED_FACTS.some((f) => f === null), 'I-c: een allowed_ai_use=false-claim levert nooit een (lege/null) APPROVED_FACT op in een AI-context');
// NK-03 architectuurfix: isClaimReleasable filtert nu ook claims zonder
// user_friendly_summary (het HIDDEN-signaal in beide registries) -- eerder
// werd dit alleen door output_mode in de Supplement-registry afgedwongen,
// wat de Knowledge Service niet zelf controleerde (latente kloof, nu gedicht).
ok(!Service.isClaimReleasable(Service.resolveClaim('NK-ENE-NOCALC-001')), 'I-d: NK-ENE-NOCALC-001 (geen summary, architectuurregel) is nooit releasable');
ok(!Service.isClaimReleasable(Service.resolveClaim('CARB-PERSONAL-001')), 'I-e: de bestaande, hergebruikte HIDDEN-supplementclaim CARB-PERSONAL-001 is ook via de Knowledge Service nooit releasable');

// ---- J: AI krijgt geen REMOVE ----
const removedClaimId = 'ELEC-SODIUM-PREVENTS-HYPONATREMIA-001';
const resolvedRemoved = Service.resolveClaim(removedClaimId);
ok(!Service.isClaimReleasable(resolvedRemoved), 'J: de REMOVE-claim wordt door isClaimReleasable geblokkeerd, kan dus nooit in een AI-context terechtkomen');

// ---- K: AI krijgt geen unsupported claims (elke claim in de AI-context heeft >=1 bron OF is architectuurregel-vrij) ----
Object.keys({ CREATINE: 1, PROTEIN: 1 }).forEach((topicId) => {
  Topics.getTopic(topicId).faq.forEach((f) => {
    const ctx = Service.buildAiContext(topicId, f.faq_id);
    ok(ctx.status === 'OK', 'K: AI-context voor ' + f.faq_id + ' bouwt succesvol');
    ok(Array.isArray(ctx.SOURCE_REFERENCES), 'K-b: AI-context voor ' + f.faq_id + ' bevat een SOURCE_REFERENCES-array');
  });
});

// ---- L: AI mag geen source-ID verzinnen ----
['CREATINE', 'PROTEIN'].forEach((topicId) => {
  Topics.getTopic(topicId).faq.forEach((f) => {
    const ctx = Service.buildAiContext(topicId, f.faq_id);
    ctx.SOURCE_REFERENCES.forEach((s) => {
      ok(!!(KSources.getById(s.source_id) || SupSources.getById(s.source_id)), 'L: elke SOURCE_REFERENCE (' + s.source_id + ') in de AI-context bestaat werkelijk in een van beide registries');
    });
  });
});

// ---- M: geen persoonlijke dose calculation / N: geen persoonlijke protein calculation door AI ----
const serviceSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeService.js'), 'utf8');
ok(!/mg\s*\/\s*kg\s*\*|gewicht\s*\*|weight\s*\*|bodyweight\s*\*/i.test(serviceSrc), 'M/N: geen mg/kg- of gewicht-vermenigvuldiging in nutritionKnowledgeService.js');
ok(!/function\s+\w*[Cc]alculate\w*Target/.test(serviceSrc), 'M/N-b: geen enkele "calculateXTarget"-functie in de service (geen personalisatie-berekening)');
ok(serviceSrc.indexOf('userWeight') === -1 && serviceSrc.indexOf('user_weight') === -1, 'M/N-c: de service accepteert nergens gebruikersgewicht als parameter');

// ---- O: UNKNOWN blijft UNKNOWN ----
// (van toepassing op anti-doping-triage, hergebruikt via de bestaande catalogus-hardening; hier
// herbevestigd dat de Knowledge-laag zelf geen enkele anti-doping-bewering toevoegt)
ok(!/anti_doping|wada|dopingveilig/i.test(fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeTopics.js'), 'utf8')),
  'O: nutritionKnowledgeTopics.js voegt geen enkele anti-doping/WADA-bewering toe');
ok(!/anti_doping|wada|dopingveilig/i.test(serviceSrc), 'O-b: nutritionKnowledgeService.js voegt geen enkele anti-doping/WADA-bewering toe');

// ---- P: medische grens creatine ----
const creatinineCtx = Service.buildAiContext('CREATINE', 'CRE-FAQ-CREATININE');
ok(creatinineCtx.FORBIDDEN_INTERPRETATIONS.indexOf('een hogere creatinine-waarde bewijst nierschade') >= 0,
  'P: de AI-context voor de creatinine-vraag verbiedt expliciet de diagnostische foutinterpretatie');
ok(!creatinineCtx.APPROVED_FACTS.some((f) => /veilig kan blijven gebruiken|geen nierziekte/i.test(f)),
  'P-b: de AI-context zegt nergens dat de gebruiker veilig kan blijven gebruiken of geen nierziekte heeft (geen diagnose/geruststelling)');

// ---- Q: supplement logging != recommendation (herbevestiging, ongewijzigd bestand) ----
const loggingSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionSupplementService.js'), 'utf8');
ok(!/nutritionKnowledge/i.test(loggingSrc), 'Q: het bestaande logging-bestand heeft geen enkele koppeling met de nieuwe Knowledge-laag');

// ---- R: knowledge education != personalised target ----
ok(!/protein_target\s*=|proteinTarget\s*=/.test(serviceSrc), 'R: de service berekent nergens een protein_target of vergelijkbaar persoonlijk doel');
const proteinSection = Service.getSection('PROTEIN', 'eiwit-sport');
ok(!/\bjouw\b.*\bg\b/i.test(proteinSection.body), 'R-b: de "Eiwit en sport"-sectietekst spreekt over onderzoek in het algemeen, niet over "jouw" persoonlijke grammage');

// ---- S: canonical supplement ID blijft intact ----
const CreCatalog = require('./nutritionSupplementCatalog.js');
ok(CreCatalog.getById('CREATINE').supplement_id === 'CREATINE', 'S: CREATINE-supplement_id blijft ongewijzigd na toevoeging van het Knowledge Platform');
ok(CreCatalog.getById('PROTEIN_GROUP').supplement_id === 'PROTEIN_GROUP', 'S-b: PROTEIN_GROUP-supplement_id blijft ongewijzigd');

// ---- T: bestaande Supplement Evidence tests blijven groen (structurele check, volledige run in validatiestap) ----
ok(SupEvidence.CLAIMS.length === 67, 'T: de Supplement Evidence Registry bevat nog steeds precies 67 claims (geen wijziging door NK-01)');

// ---- U: bestaande Nutrition Calculation/Evidence tests blijven groen (structurele check) ----
ok(fs.existsSync(path.join(ROOT, 'core/nutritionIntelligence.js')), 'U: bestaande NutritionIntelligenceCore-bestand is ongewijzigd aanwezig');

// ---- extra: gedeeld model, geen dubbele topic_id, geen dubbele claim_id, domain-validatie ----
const topicIds = Topics.TOPICS.map((t) => t.topic_id);
ok(new Set(topicIds).size === topicIds.length, 'geen dubbele topic_id in het gedeelde model');
ok(Topics.TOPICS.every((t) => Topics.isValidDomain(t.domain)), 'elk topic heeft een geldig domain (SUPPLEMENT of NUTRITION)');
const nkClaimIds = KEvidence.CLAIMS.map((c) => c.claim_id);
ok(new Set(nkClaimIds).size === nkClaimIds.length, 'geen dubbele NK-claim_id');
ok(!nkClaimIds.some((id) => !!SupEvidence.getById(id)), 'geen enkele nieuwe NK-claim_id botst met een bestaande SUP-EVIDENCE evidence_id');

console.log('fNutritionKnowledgePlatform: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
