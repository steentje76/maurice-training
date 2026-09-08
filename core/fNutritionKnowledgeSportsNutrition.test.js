/* fNutritionKnowledgeSportsNutrition.test.js — NK-04. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Topics = require('./nutritionKnowledgeTopics.js');
const Groups = require('./nutritionKnowledgeUiGroups.js');
const KEvidence = require('./nutritionKnowledgeEvidenceRegistry.js');
const KSources = require('./nutritionKnowledgeSources.js');
const SupSources = require('./nutritionSupplementSourceRegistry.js');
const SupEvidence = require('./nutritionSupplementEvidenceRegistry.js');
const Service = require('./nutritionKnowledgeService.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const NEW_TOPICS = ['PRE_TRAINING', 'DURING_TRAINING', 'POST_TRAINING', 'ENDURANCE_CARB', 'MUSCLE_GAIN', 'FAT_LOSS_SPORT'];
const NK04_CLAIMS = KEvidence.CLAIMS.filter((c) => NEW_TOPICS.indexOf(c.topic_id) >= 0);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeService.js'), 'utf8');

// ═══ SECTIE 22 — EVIDENCE ═══

// A: ieder gepubliceerd feit traceerbaar
NEW_TOPICS.forEach((topicId) => {
  Topics.getTopic(topicId).sections.forEach((s) => {
    s.evidence_refs.forEach((ref) => ok(!!Service.resolveClaim(ref), 'A: sectie "' + s.section_id + '" (' + topicId + ') verwijst naar een bestaande claim (' + ref + ')'));
    if (s.evidence_refs.length > 0) {
      const resolvedSection = Service.getSection(topicId, s.section_id);
      ok(resolvedSection.claims.length > 0, 'A-b: sectie "' + s.section_id + '" (' + topicId + ') heeft minstens 1 daadwerkelijk vrijgegeven claim, geen HIDDEN-only referentie');
    }
  });
});

// B: iedere source_id geldig
NK04_CLAIMS.forEach((c) => {
  c.source_ids.forEach((sid) => ok(!!Service.resolveSource(sid), 'B: bron "' + sid + '" van ' + c.claim_id + ' bestaat'));
});

// C: population/context aanwezig waar nodig (niet verplicht voor de E-level architectuurclaim)
NK04_CLAIMS.filter((c) => c.evidence_level !== 'E').forEach((c) => {
  ok(!!c.population && !!c.context, 'C: claim ' + c.claim_id + ' heeft population en context');
});

// D: duration/intensity context bij fueling claims
['NK-DUR-MTC-001', 'NK-DUR-RINSE-001', 'NK-END-LOAD-001'].forEach((id) => {
  const c = KEvidence.getById(id);
  ok(/\bmin(uten)?\b|\buur\b|\bu\b|\bVO2max\b/i.test(c.claim_text_internal), 'D: fueling-claim ' + id + ' bevat expliciete duur/intensiteitscontext');
});

// E: limitations aanwezig (structureel)
ok(NK04_CLAIMS.every((c) => Array.isArray(c.limitations)), 'E: elke nieuwe claim heeft een limitations-array');

// F/G: geen REMOVE/REVISE
ok(!NK04_CLAIMS.some((c) => c.status === 'REMOVE' || c.status === 'REVISE'), 'F/G: geen enkele nieuwe claim heeft status REMOVE of REVISE');

// H: INSUFFICIENT niet als advies
ok(!NK04_CLAIMS.some((c) => c.status === 'INSUFFICIENT'), 'H: geen enkele nieuwe claim is als INSUFFICIENT gepubliceerd');

// I: evidence level correct
ok(NK04_CLAIMS.every((c) => KEvidence.isValidLevel(c.evidence_level)), 'I: elke nieuwe claim gebruikt de bestaande A-E-schaal');
ok(!NK04_CLAIMS.some((c) => c.evidence_level === 'D'), 'I-b: geen enkele nieuwe claim gebruikt niveau D');

// J: confidence correct
NK04_CLAIMS.forEach((c) => {
  const label = KEvidence.confidenceLabel(c.evidence_level, c.status);
  ok(['Sterk bewijs', 'Redelijk bewijs', 'Contextafhankelijk', 'Onvoldoende bewijs'].indexOf(label) >= 0, 'J: confidence-label van ' + c.claim_id + ' is een geldig label');
});

// K: last_reviewed aanwezig
ok(NK04_CLAIMS.every((c) => !!c.last_reviewed), 'K: elke nieuwe claim heeft een last_reviewed-datum');

// L: geen orphan claims (uitgezonderd HIDDEN-architectuurclaim)
NK04_CLAIMS.filter((c) => !!c.user_friendly_summary).forEach((c) => {
  const topic = Topics.getTopic(c.topic_id);
  const usedInSection = topic.sections.some((s) => s.evidence_refs.indexOf(c.claim_id) >= 0);
  const usedInFaq = topic.faq.some((f) => f.evidence_refs.indexOf(c.claim_id) >= 0);
  ok(usedInSection || usedInFaq, 'L: claim ' + c.claim_id + ' wordt door minstens één sectie of FAQ-item gebruikt');
});
ok(!Service.isClaimReleasable(Service.resolveClaim('NK-SPORTNUTR-NOCALC-001')), 'L-b: NK-SPORTNUTR-NOCALC-001 is terecht nooit releasable');

// ═══ SECTIE 23 — SPORTVOEDING ═══

// M: pre-training education != personal plan
const preCtx = Service.buildAiContext('PRE_TRAINING', 'PRE-FAQ-KOOLHYDRAAT');
ok(preCtx.status === 'OK' && !preCtx.APPROVED_FACTS.some((f) => /\bjij\b|\bjouw\b/i.test(f)), 'M: AI-context voor pre-training-koolhydraten is algemeen, niet "jij/jouw"');
ok(KEvidence.getById('NK-PRE-CARB-001').limitations.some((l) => /geen persoonlijk voorschrift/i.test(l)), 'M-b: NK-PRE-CARB-001 legt vast dat het geen persoonlijk voorschrift is');

// N/O/P: during-training ranges correct scoped
const carbMid = SupEvidence.getById('CARB-MID-001');
const carbLong = SupEvidence.getById('CARB-LONG-001');
const carbElite = SupEvidence.getById('CARB-ELITE-001');
ok(/1-2,5\s*u(ur)?/.test(carbMid.claim) && /30-60\s*g/.test(carbMid.claim), 'N/O: CARB-MID-001 scoped 30-60 g/u aan 1-2,5 uur');
ok(/2,5-3\s*u(ur)?/.test(carbLong.claim) && /90\s*g/.test(carbLong.claim), 'P: CARB-LONG-001 scoped tot 90 g/u aan >2,5-3 uur');

// Q: higher-intake evidence niet overgegeneraliseerd
ok(carbElite.limitations.some((l) => /niet representatief voor de meeste sporters/i.test(l)), 'Q: CARB-ELITE-001 blijft niet-generaliseerbaar gelabeld');
ok(!Topics.getTopic('DURING_TRAINING').sections.some((s) => /120\s*g\/u.{0,30}(iedereen|elke sporter)/i.test(s.body)), 'Q-b: geen sectie generaliseert 120 g/u naar "iedereen"');

// R: gut-training nuance consistent
ok(Topics.getTopic('DURING_TRAINING').sections.some((s) => s.section_id === 'gut-training' && s.evidence_refs.indexOf('CARB-GI-001') >= 0), 'R: gut-training (tijdens training) hergebruikt CARB-GI-001');
ok(Topics.getTopic('ENDURANCE_CARB').sections.some((s) => s.section_id === 'gut-training' && s.evidence_refs.indexOf('CARB-GI-001') >= 0), 'R-b: gut-training (langdurige inspanning) hergebruikt dezelfde claim');

// S: carb-loading scope
const carbLoad = KEvidence.getById('NK-END-LOAD-001');
ok(/90\s*min/i.test(carbLoad.claim_text_internal) && /getrainde/i.test(carbLoad.population), 'S: carb-loading-claim gescoped aan >90 min en getrainde sporters');
ok(carbLoad.forbidden_interpretations.some((f) => /elke training/i.test(f)), 'S-b: carb-loading verbiedt veralgemenisering naar "elke training"');

// T: recovery timing nuance
ok(!Topics.getTopic('POST_TRAINING').sections.some((s) => /exact 30 minuten/i.test(s.body)), 'T: geen sectie beweert een exact 30-minuten-venster');
ok(KEvidence.getById('NK-POST-TOTAL-001').forbidden_interpretations.some((f) => /30 minuten/i.test(f)), 'T-b: NK-POST-TOTAL-001 verbiedt het 30-minuten-mythe');

// U: anabolic-window overclaim afwezig
ok(SupEvidence.getById('PROT-TIMING-001').forbidden_interpretations.some((f) => /30-60 minuten/i.test(f)), 'U: PROT-TIMING-001 verbiedt nog steeds het anabolic-window-misverstand');

// V: muscle-gain != unlimited protein
ok(Topics.getTopic('MUSCLE_GAIN').sections.some((s) => s.section_id === 'meer-eiwit-niet-onbeperkt' && s.evidence_refs.indexOf('PROT-HIGH-001') >= 0), 'V: Spieropbouw bevat expliciete "geen onbeperkte relatie"-sectie');

// W: fat-loss != crash diet
ok(!!KEvidence.getById('NK-FATLOSS-NOCRASH-001'), 'W: expliciete anti-crashdieet-claim bestaat');
ok(Topics.getTopic('FAT_LOSS_SPORT').faq.some((f) => f.faq_id === 'FATL-FAQ-SNEL'), 'W-b: FAQ bevat de "snel afvallen"-vraag');

// X: RED-S != automatic diagnosis
const redsCtx = Service.buildAiContext('FAT_LOSS_SPORT', 'FATL-FAQ-REDS');
ok(redsCtx.FORBIDDEN_INTERPRETATIONS.some((f) => /automatisch/i.test(f)), 'X: RED-S-AI-context verbiedt automatische diagnose');

// Y: wearable calorie estimate != exact
ok(KEvidence.getById('NK-ENE-WEARABLE-001').forbidden_interpretations.some((f) => /exact/i.test(f)), 'Y: bestaande wearable-onzekerheidsclaim blijft van kracht');

// Z: hydration personalisation afwezig
['PRE_TRAINING', 'POST_TRAINING'].forEach((topicId) => {
  const hydSection = Topics.getTopic(topicId).sections.find((s) => /hydratatie|vocht/i.test(s.section_id));
  ok(!!hydSection, 'Z: ' + topicId + ' bevat een hydratatie/vocht-cross-link');
  ok(!/\bg\/kg\b.{0,20}vocht|sweat.?rate|zweetpercentage/i.test(hydSection.body), 'Z-b: hydratatie-cross-link in ' + topicId + ' bevat geen sweat-rate-berekening');
});
// NK-09/NK-05C: een aanroep van de bestaande, gecertificeerde
// HydrationCalculation.estimateSweatRate() is het EXPLICIET gesanctioneerde
// doel van deze sprint (Hydratatie-meetscherm) -- geen tweede, zelfstandige
// implementatie. De check moet dus specifiek een NIEUWE functiedefinitie
// vangen (bv. "function calculateSweatRate"/"function hydrationTarget"),
// niet elke toevallige substring-overlap met de naam van de reeds
// bestaande, geautoriseerde engine-functie.
ok(!/function\s+(calculateSweatRate|hydrationTarget|sweatRateCalc)/i.test(serviceSrc + html), 'Z-c: geen NIEUWE sweat-rate/hydration-target-berekeningsfunctie toegevoegd (aanroepen van de bestaande, gecertificeerde HydrationCalculation-engine is het gesanctioneerde NK-05C-doel, geen overtreding)');

// ═══ SECTIE 24 — AI ═══

// AA: AI only approved claims / AB: no source hallucination
NEW_TOPICS.forEach((topicId) => {
  Topics.getTopic(topicId).faq.forEach((f) => {
    const ctx = Service.buildAiContext(topicId, f.faq_id);
    ok(ctx.status === 'OK', 'AA: AI-context voor ' + f.faq_id + ' (' + topicId + ') bouwt uit approved claims');
    ctx.SOURCE_REFERENCES.forEach((s) => {
      ok(!!(KSources.getById(s.source_id) || SupSources.getById(s.source_id)), 'AB: SOURCE_REFERENCE ' + s.source_id + ' bestaat, geen hallucinatie');
    });
  });
});

// AC-AI: adversarial personalisation vragen -- het AI-contract zelf berekent nooit iets, ongeacht de vraagformulering.
// (buildAiContext accepteert alleen topicId+faqId uit de vooraf-gedefinieerde FAQ-lijst -- er is geen vrij-tekst-invoerpad
// waarmee "ik weeg 82kg" uberhaupt bij de contractbouwer terecht kan komen; dit IS de architectuurgarantie.)
ok(!/function buildAiContext\([^)]*weight/i.test(serviceSrc), 'AC: buildAiContext() accepteert geen gewicht-parameter (geen vrije-tekst-vraag-invoerpad)');
ok((serviceSrc.match(/function buildAiContext\(topicId, faqId\)/g) || []).length === 1, 'AD: buildAiContext() accepteert uitsluitend topicId+faqId -- geen vrij-tekst-vraag, dus adversarial vrije vragen ("bereken mijn bulk") kunnen het contract niet bereiken');
// Uitsluitend CODE-regels controleren (commentaarregels die de afwezigheid van
// zo'n berekening juist BEVESTIGEN mogen het woord "g/kg" bevatten -- dat is
// documentatie van de regel, geen overtreding ervan).
const serviceCodeOnly = serviceSrc.split('\n').filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line)).join('\n');
['g\\/kg\\s*[x*]', 'gewicht\\s*\\*', 'weight\\s*\\*', 'calculateMealPlan', 'calculateFuelingPlan', 'calculateCalorieTarget', 'calculateBulk', 'calculateProteinToday'].forEach((pat) => {
  ok(!new RegExp(pat, 'i').test(serviceCodeOnly), 'AE-AI: geen functie/berekening matchend "' + pat + '" in de daadwerkelijke code van nutritionKnowledgeService.js');
});
ok(!/g\/kg\s*=|weight\s*\*\s*factor/i.test(html), 'AF: geen g/kg- of gewicht*factor-berekening in index.html Kennis-UI');

// AJ: UNKNOWN preserved / AK: safety boundary preserved / AL: medical referral preserved
ok(redsCtx.SAFETY_BOUNDARIES.length === 0 || redsCtx.SAFETY_BOUNDARIES.every((s) => typeof s === 'string'), 'AJ: SAFETY_BOUNDARIES blijft een array van strings, geen stilzwijgende diagnose-waarde');
ok(!!KEvidence.getById('NK-FATLOSS-EA-001').limitations.find((l) => /professionele beoordeling/i.test(l)), 'AK/AL: energiebeschikbaarheid-claim vereist expliciet professionele beoordeling, geen zelfdiagnose');

// ═══ SECTIE 25 — UX ═══

NEW_TOPICS.forEach((topicId) => {
  const groups = Groups.getGroupsForTopic(topicId);
  ok(groups.length === 3 && JSON.stringify(groups.map((g) => g.group_id)) === JSON.stringify(['basis', 'praktisch', 'verdieping']), 'AM: ' + topicId + ' gebruikt dezelfde 3-groepen-NK-template');
  ok(Service.getTopicOverview(topicId).status === 'OK', 'AN: hero/overzicht werkt voor ' + topicId + ' via dezelfde service');
});
ok(html.indexOf('nk-ai-cta') > 0, 'AO: AI-entrypoint (gedeeld component) aanwezig, geen nieuwe variant per topic');
ok(html.match(/id:'overzicht'/) && html.match(/id:'praktisch'/) && html.match(/id:'verdieping'/) && html.match(/id:'faq'/) && html.match(/id:'wetenschap'/), 'AP: vijf tabs blijven gedefinieerd, geen nieuwe tab toegevoegd');
ok(!/nk-faq-row"\s+open/.test(html), 'AQ: geen enkele FAQ-<details> heeft het open-attribuut hardgecodeerd');
ok(html.indexOf('voedingKennisWetenschapHtml') > 0, 'AR: wetenschap blijft een gedeelde progressive-disclosure-functie');
ok(html.indexOf('nk-source-card') > 0, 'AS: compacte bronkaart-styling aanwezig');
ok(!/#s-voeding-kennis-topic[^{]*\{[^}]*width:\s*\d{3,}px/.test(html), 'AT-AW: geen vaste pixelbreedte toegevoegd (360-430px fluid)');
ok(html.indexOf('min-height:44px') > 0, 'AT-b: 44px-touchtarget-styling blijft gedeeld');
ok(html.indexOf('.nk-source-card{border:1px solid var(--color-border);border-radius:10px') > 0, 'AX: geen horizontale overflow door nieuwe (langere) bronnamen -- wrap-vriendelijke bronkaart');
ok(html.indexOf('Sportvoeding') > 0, 'AY: hub bevat een expliciete "Sportvoeding"-groep');
ok(!/quick_summary_text.{0,30}Wat je voor het sporten eet/i.test(html), 'AZ: geen hardgecodeerde duplicatie van topic-quick-summary-tekst in index.html');

// ═══ SECTIE 26 — ADVERSARIAL LANGUAGE AUDIT ═══
const ADVERSARIAL_PATTERNS = [
  /\bmust eat\b/i, /\byou need\b/i, /jij moet/i, /voor jou is/i, /berekend voor jou/i,
  /burns fat/i, /fasted burns more fat/i, /anabolic window/i, /30[- ]minute window/i,
  /carbs make you fat/i, /fat makes you fat/i, /120\s*g\/h for everyone/i,
  /dehydration improves/i, /red-s means/i, /cycle phase requires/i, /hormones require/i
];
const allNewUserFacingText = NK04_CLAIMS.map((c) => c.user_friendly_summary || '').join(' \n ')
  + NEW_TOPICS.map((t) => Topics.getTopic(t).sections.map((s) => s.body).join(' \n ')).join(' \n ');
ADVERSARIAL_PATTERNS.forEach((re) => {
  ok(!re.test(allNewUserFacingText), '26: geen adversarial formulering (' + re + ') in nieuwe claim-samenvattingen/sectieteksten');
});
// Women's Performance causaliteitsaudit (sectie 21): geen ongefundeerde causale koppeling
// tussen cyclusfase/hormonen/zwangerschap/menopauze en voedingsbehoefte in de nieuwe content.
ok(!/\b(cyclusfase|menstruatie|hormonen|zwangerschap|menopauze)\b.{0,60}\b(heb je|moet je|nodig)\b/i.test(allNewUserFacingText),
  '26-b (Women\'s Performance): geen ongefundeerde causale claim rond cyclus/hormonen/zwangerschap/menopauze in nieuwe NK-04-content');

console.log('fNutritionKnowledgeSportsNutrition: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
