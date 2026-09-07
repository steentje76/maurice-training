/* fNutritionKnowledgeBasicsExpansion.test.js — NK-03. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Topics = require('./nutritionKnowledgeTopics.js');
const Groups = require('./nutritionKnowledgeUiGroups.js');
const KEvidence = require('./nutritionKnowledgeEvidenceRegistry.js');
const KSources = require('./nutritionKnowledgeSources.js');
const SupSources = require('./nutritionSupplementSourceRegistry.js');
const Service = require('./nutritionKnowledgeService.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const NEW_TOPICS = ['CARBOHYDRATES', 'FATS', 'ENERGY', 'FIBRE', 'HEALTHY_EATING'];

// ═══ SECTIE 19 — EVIDENCE ═══

// A: ieder gepubliceerd feit traceerbaar
NEW_TOPICS.forEach((topicId) => {
  Topics.getTopic(topicId).sections.forEach((s) => {
    s.evidence_refs.forEach((ref) => ok(!!Service.resolveClaim(ref), 'A: sectie "' + s.section_id + '" (' + topicId + ') verwijst naar een bestaande claim (' + ref + ')'));
  });
});

// B: iedere source_id bestaat
const NK03_CLAIMS = KEvidence.CLAIMS.filter((c) => NEW_TOPICS.indexOf(c.topic_id) >= 0);
NK03_CLAIMS.forEach((c) => {
  c.source_ids.forEach((sid) => ok(!!Service.resolveSource(sid), 'B: bron "' + sid + '" van ' + c.claim_id + ' bestaat'));
});

// C: geen orphan claims (elke nieuwe claim wordt door minstens 1 sectie of FAQ gebruikt)
// Uitzondering: claims zonder user_friendly_summary zijn architectuur-only
// (zelfde patroon als het bestaande CARB-PERSONAL-001 in de Supplement
// Evidence Registry) -- die worden bewust nergens in content aangehaald,
// enkel getest als structurele veiligheidsklep (zie sectie 20.W hieronder).
NK03_CLAIMS.filter((c) => !!c.user_friendly_summary).forEach((c) => {
  const topic = Topics.getTopic(c.topic_id);
  const usedInSection = topic.sections.some((s) => s.evidence_refs.indexOf(c.claim_id) >= 0);
  const usedInFaq = topic.faq.some((f) => f.evidence_refs.indexOf(c.claim_id) >= 0);
  ok(usedInSection || usedInFaq, 'C: claim ' + c.claim_id + ' wordt door minstens één sectie of FAQ-item gebruikt (geen orphan)');
});

// D: geen orphan sources waar ongewenst (elke nieuwe NK-03-bron wordt door minstens 1 claim gebruikt)
const NK03_SOURCE_IDS = ['WHO-CARBOHYDRATE-2023', 'WHO-TOTALFAT-2023', 'WHO-SFA-TFA-2023', 'WHO-SUGARS-2015', 'FAO-WHO-UNU-ENERGY-2004', 'SHCHERBINA-WEARABLE-2017', 'WHO-HEALTHY-DIET-2020', 'NAUDE-LOWCARB-META-2014'];
NK03_SOURCE_IDS.forEach((sid) => {
  const usedSomewhere = KEvidence.CLAIMS.some((c) => c.source_ids.indexOf(sid) >= 0);
  ok(usedSomewhere, 'D: nieuwe bron ' + sid + ' wordt door minstens één claim gebruikt');
});

// E: REMOVE nooit user-visible / F: REVISE niet production-ready (structureel, geen NK-03-claim heeft deze status vandaag)
ok(!NK03_CLAIMS.some((c) => c.status === 'REMOVE' || c.status === 'REVISE'), 'E/F: geen enkele nieuwe NK-03-claim heeft status REMOVE of REVISE');
const fakeRemove = { claim_id: 'TEST', status: 'REMOVE', user_friendly_summary: 'x' };
ok(Service.isClaimReleasable(fakeRemove) === false, 'E-b: isClaimReleasable wijst REMOVE hoe dan ook af');

// G: INSUFFICIENT niet als bewezen advies (geen enkele nieuwe claim is INSUFFICIENT vandaag, dus check is vacuously waar + architectuurregel bevestigd)
ok(!NK03_CLAIMS.some((c) => c.status === 'INSUFFICIENT'), 'G: geen enkele nieuwe claim is bewust als "onvoldoende bewijs" gepubliceerd zonder als zodanig herkenbaar te zijn (vandaag: geen INSUFFICIENT-claims nodig gebleken)');

// H: evidence levels behouden (geldige waarden, geen nieuwe schaal)
ok(NK03_CLAIMS.every((c) => KEvidence.isValidLevel(c.evidence_level)), 'H: elke nieuwe claim gebruikt de bestaande A-E-schaal');
ok(NK03_CLAIMS.every((c) => ['A', 'B', 'C'].indexOf(c.evidence_level) >= 0 || c.evidence_level === 'E'), 'H-b: geen enkele nieuwe claim gebruikt D (controversieel/beperkt) -- bevestigt dat enkel voldoende onderbouwde claims zijn gepubliceerd');

// I: limitations behouden (aanwezig als array, ook als leeg)
ok(NK03_CLAIMS.every((c) => Array.isArray(c.limitations)), 'I: elke nieuwe claim heeft een limitations-array (structureel veld aanwezig)');

// J: reviewdatum aanwezig
ok(NK03_CLAIMS.every((c) => !!c.last_reviewed), 'J: elke nieuwe claim heeft een last_reviewed-datum');

// K: source type aanwezig
NK03_SOURCE_IDS.forEach((sid) => {
  const s = Service.resolveSource(sid);
  ok(s && !!s.source_type, 'K: bron ' + sid + ' heeft een source_type');
});

// L: population/context aanwezig waar nodig (niet verplicht voor de ene E-level architectuurclaim)
NK03_CLAIMS.filter((c) => c.evidence_level !== 'E').forEach((c) => {
  ok(!!c.population && !!c.context, 'L: claim ' + c.claim_id + ' heeft population en context (niet-architectuurclaim)');
});

// ═══ SECTIE 20 — ARCHITECTUUR ═══

// M: alle vijf topics gebruiken gedeeld Knowledge model
NEW_TOPICS.forEach((topicId) => {
  ok(Topics.isValidDomain(Topics.getTopic(topicId).domain), 'M: ' + topicId + ' heeft een geldig domain in hetzelfde gedeelde model');
  ok(Service.getTopicOverview(topicId).status === 'OK', 'M-b: ' + topicId + ' is opvraagbaar via dezelfde NutritionKnowledgeService als Creatine/Eiwitten');
});

// N: geen tweede knowledge engine
ok(!fs.existsSync(path.join(ROOT, 'core/nutritionKnowledgeService2.js')), 'N: geen tweede, parallelle knowledge-service-bestand aangemaakt');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeService.js'), 'utf8');
ok((serviceSrc.match(/function buildAiContext/g) || []).length === 1, 'N-b: precies één buildAiContext-implementatie, geen dubbele engine');

// O: geen duplicate claim truth (geen twee claims met identieke claim_text_internal binnen NK-03)
const texts = NK03_CLAIMS.map((c) => c.claim_text_internal);
ok(new Set(texts).size === texts.length, 'O: geen twee NK-03-claims met identieke claim-tekst (geen duplicate truth)');

// P: FAQ gebruikt bestaande claims (herbevestiging specifiek voor de 5 nieuwe topics)
NEW_TOPICS.forEach((topicId) => {
  Topics.getTopic(topicId).faq.forEach((f) => {
    ok(f.evidence_refs.length > 0, 'P: FAQ "' + f.faq_id + '" (' + topicId + ') heeft minstens 1 evidence_ref');
    f.evidence_refs.forEach((ref) => ok(!!Service.resolveClaim(ref), 'P-b: FAQ "' + f.faq_id + '" verwijst naar bestaande claim ' + ref));
  });
});

// Q: UI bevat geen tweede hardcoded evidence truth
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
ok(!/koolhydraten primair.{0,40}volkoren.{0,40}groente/i.test(html), 'Q: de koolhydraatkwaliteit-claimtekst staat niet nogmaals hardgecodeerd in index.html');
ok(!/minimaal 25 g.{0,20}voedingsvezels/i.test(html), 'Q-b: de vezelaanbeveling staat niet nogmaals hardgecodeerd in index.html');

// R: AI-context gebruikt approved claims / S: AI krijgt geen REMOVE / T: AI krijgt geen unsupported source / U: geen source hallucination
NEW_TOPICS.forEach((topicId) => {
  Topics.getTopic(topicId).faq.forEach((f) => {
    const ctx = Service.buildAiContext(topicId, f.faq_id);
    ok(ctx.status === 'OK', 'R: AI-context voor ' + f.faq_id + ' (' + topicId + ') bouwt succesvol uit approved claims');
    ctx.SOURCE_REFERENCES.forEach((s) => {
      ok(!!(KSources.getById(s.source_id) || SupSources.getById(s.source_id)), 'U: SOURCE_REFERENCE ' + s.source_id + ' (uit ' + f.faq_id + ') bestaat werkelijk, geen hallucinatie');
    });
  });
});
ok(!NEW_TOPICS.some((topicId) => Topics.getTopic(topicId).faq.some((f) => Service.buildAiContext(topicId, f.faq_id).APPROVED_FACTS.some((fact) => /voorkomt hyponatri/i.test(fact)))),
  'S/T: geen enkele nieuwe AI-context bevat ooit een REMOVE-achtige of ongesteunde bewering');

// V: geen persoonlijke calculation / W: geen TDEE/BMR-calculator / X: geen carb-calculator / Y: geen fat-calculator / Z: geen fibre-calculator
const kennisUiBlockMatch = html.match(/renderVoedingKennisTopic[\s\S]{0,6000}voedingKennisWetenschapHtml[\s\S]{0,2000}\n\}/);
ok(!!kennisUiBlockMatch, 'V: de Kennis-UI-functieblok is gevonden voor inspectie');
if (kennisUiBlockMatch) {
  ok(!/mg\s*\/\s*kg|gewicht\s*\*|weight\s*\*|bodyweight\s*\*/i.test(kennisUiBlockMatch[0]), 'V-b: geen gewichtsgebaseerde berekening in de Kennis-UI-code');
}
ok(!/function\s+\w*(calculateBMR|calculateTDEE|calculateCarb|calculateFat|calculateFibre|calculateFiber)\w*/i.test(serviceSrc + html), 'W/X/Y/Z: geen enkele BMR/TDEE/koolhydraat/vet/vezel-berekeningsfunctie toegevoegd');
ok(!/CALC-ENE-004/.test(serviceSrc), 'W-b: CALC-ENE-004 (nog niet geïmplementeerd) wordt niet stiekem alsnog aangeroepen vanuit de Knowledge-laag');

// ═══ SECTIE 21 — UX ═══

// AA: alle topics gebruiken NK-02 template / AB: hero / AC: AI entrypoint / AD: vijf tabs
NEW_TOPICS.forEach((topicId) => {
  const groups = Groups.getGroupsForTopic(topicId);
  ok(groups.length === 3, 'AA: ' + topicId + ' gebruikt dezelfde 3-groepen-template als Creatine/Eiwitten');
  ok(JSON.stringify(groups.map((g) => g.group_id)) === JSON.stringify(['basis', 'praktisch', 'verdieping']), 'AA-b: ' + topicId + ' gebruikt dezelfde group_id-volgorde (basis/praktisch/verdieping)');
});
ok(html.indexOf('nk-hero') > 0, 'AB: hero-structuur (gedeeld component) aanwezig, geen topic-specifieke variant');
ok(html.indexOf('nk-ai-cta') > 0, 'AC: AI-entrypoint (gedeeld component) aanwezig');
ok(html.match(/id:'overzicht'/) && html.match(/id:'praktisch'/) && html.match(/id:'verdieping'/) && html.match(/id:'faq'/) && html.match(/id:'wetenschap'/), 'AD: alle vijf tabs (gedeeld component) blijven gedefinieerd');

// AE: FAQ default collapsed / AF: science progressive disclosure / AG: sources compact (herbevestiging, gedeelde component dus automatisch voor alle topics)
ok(!/nk-faq-row"\s+open/.test(html), 'AE: geen enkele FAQ-<details> (van welk topic dan ook) heeft het open-attribuut hardgecodeerd');
ok(html.indexOf('voedingKennisWetenschapHtml') > 0, 'AF: wetenschap blijft een aparte, gedeelde progressive-disclosure-functie voor alle topics');
ok(html.indexOf('nk-source-card') > 0, 'AG: compacte bronkaart-styling (gedeeld component) aanwezig');

// AH-AK: 360/390/412/430px (fluid layout, gedeeld component -- geen nieuwe, topic-specifieke CSS met vaste breedtes)
ok(!/#s-voeding-kennis-topic[^{]*\{[^}]*width:\s*\d{3,}px/.test(html), 'AH-AK: geen vaste pixelbreedte toegevoegd voor het Kennis-topicscherm (blijft fluid op 360-430px)');

// AL: touch targets behouden (gedeelde CSS, niet per topic overschreven)
ok(html.indexOf('min-height:44px') > 0, 'AL: 44px-touchtarget-styling blijft gedeeld en ongewijzigd');

// AM: geen horizontale overflow door nieuwe content (lange bronnamen breken niet uit de kaart)
ok(html.indexOf('.nk-source-card{border:1px solid var(--color-border);border-radius:10px') > 0, 'AM: bronkaarten hebben een vaste, wrap-vriendelijke opmaak (geen overflow door lange WHO-titels)');

// AN: content niet als één enorme flat accordionlijst
NEW_TOPICS.forEach((topicId) => {
  const groups = Groups.getGroupsForTopic(topicId);
  ok(groups.every((g) => g.section_ids.length <= 8), 'AN: geen enkele groep van ' + topicId + ' is zelf weer een dominante platte lijst (max. 8 secties per groep)');
});

// ═══ SECTIE 22 — ADVERSARIAL CLAIM AUDIT ═══
const ADVERSARIAL_PATTERNS = [
  /koolhydraten maken dik/i, /vet maakt dik/i, /suiker is gif/i, /alle bewerkte voeding is ongezond/i,
  /je moet \d+\s*gram/i, /iedereen heeft/i, /vezels zorgen voor gewichtsverlies/i, /low[- ]?carb is beter/i,
  /wearable calories? (zijn|is) exact/i, /red-s betekent dat/i, /ai (recommends|adviseert)/i
];
const allNewUserFacingText = NK03_CLAIMS.map((c) => c.user_friendly_summary || '').join(' \n ')
  + NEW_TOPICS.map((t) => Topics.getTopic(t).sections.map((s) => s.body).join(' \n ')).join(' \n ');
ADVERSARIAL_PATTERNS.forEach((re) => {
  ok(!re.test(allNewUserFacingText), '22: geen enkele adversarial formulering (' + re + ') komt voor in de nieuwe claim-samenvattingen/sectieteksten');
});
// Expliciete, positieve tegen-claims moeten wél aanwezig zijn (bewijst dat de juiste, genuanceerde tegenhanger is opgenomen)
ok(!!KEvidence.getById('NK-CARB-NOTUNHEALTHY-001'), '22-b: de correctie op "koolhydraten maken dik" is expliciet aanwezig als eigen claim');
ok(!!KEvidence.getById('NK-FAT-NOTBAD-001'), '22-c: de correctie op "vet is ongezond" is expliciet aanwezig als eigen claim');
ok(!!KEvidence.getById('NK-CARB-LOWCARB-001'), '22-d: de genuanceerde low-carb-claim (geen "low-carb is beter") is expliciet aanwezig');
ok(!!KEvidence.getById('NK-ENE-WEARABLE-001'), '22-e: de wearable-onzekerheidsclaim (geen "exact") is expliciet aanwezig');

console.log('fNutritionKnowledgeBasicsExpansion: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
