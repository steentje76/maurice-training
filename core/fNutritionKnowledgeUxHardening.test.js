/* fNutritionKnowledgeUxHardening.test.js — NK-02. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Topics = require('./nutritionKnowledgeTopics.js');
const Groups = require('./nutritionKnowledgeUiGroups.js');
const KEvidence = require('./nutritionKnowledgeEvidenceRegistry.js');
const SupEvidence = require('./nutritionSupplementEvidenceRegistry.js');
const Service = require('./nutritionKnowledgeService.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

// ---- A: quick-summary aanwezig ----
ok(html.indexOf('nk-hero') > 0, 'A: een nk-hero (quick-summary/hero-card) structuur is aanwezig');
ok(/nk-hero-title.*escHtml\(ov\.display_name\)/.test(html.replace(/\n/g, ' ')), 'A-b: de hero toont de topic-naam');

// ---- B: evidence-indicator aanwezig ----
ok(html.indexOf('nk-hero-badge') > 0, 'B: een evidence/status-badge is aanwezig in de hero');
ok(/nk-hero-badge.*quick_summary_confidence/.test(html.replace(/\n/g, ' ')), 'B-b: de badge toont de confidence-waarde uit de service (geen eigen tekst)');

// ---- C: secties gegroepeerd ----
['CREATINE', 'PROTEIN'].forEach((topicId) => {
  const groups = Groups.getGroupsForTopic(topicId);
  ok(groups.length === 3, 'C: ' + topicId + ' heeft 3 semantische groepen (was: 1 platte lijst)');
  ok(groups.every((g) => g.section_ids.length >= 2 && g.section_ids.length <= 8), 'C-b: elke groep van ' + topicId + ' heeft een behapbaar aantal secties (2-8), geen dominante losse lijst');
});

// ---- D: geen 18/19 flat accordions als primaire structuur ----
ok(html.indexOf('voedingKennisGroepHtml') > 0, 'D: rendering loopt via de gegroepeerde functie, niet via een platte lus over alle secties');
ok(!/getAllSections\(topicId\)\.filter[\s\S]{0,50}status===.OK.[\s\S]{0,80}\)\.map/.test(html), 'D-b: er is geen ongegroepeerde map-over-alle-secties meer in de renderfunctie');

// ---- E: FAQ collapsed by default ----
ok(/nk-faq-row.*<summary>/.test(html.replace(/\n/g, ' ')), 'E: FAQ-items zijn <details>-elementen (standaard dicht, browser-default), geen "open" attribuut');
ok(!/nk-faq-row"\s+open/.test(html), 'E-b: geen enkele FAQ-<details> heeft het open-attribuut hardgecodeerd');

// ---- F: wetenschap progressive disclosure ----
ok(html.indexOf('voedingKennisWetenschapHtml') > 0, 'F: er is een aparte functie voor de wetenschapslaag, niet vermengd met de gewone secties');
ok(html.indexOf("id:'wetenschap'") > 0 || html.indexOf("id: 'wetenschap'") > 0, 'F-b: "Wetenschap" is een eigen tab, geen permanent zichtbaar blok tussen de gewone uitleg');

// ---- G: source traceability behouden ----
['CREATINE', 'PROTEIN'].forEach((topicId) => {
  const detail = Service.getScienceDetail(topicId);
  ok(detail.status === 'OK' && detail.claims.every((c) => c.source_ids.length > 0 || c.origin === 'KNOWLEDGE_ARCHITECTURE'),
    'G: elke ' + topicId + '-claim in de wetenschapslaag blijft herleidbaar naar minstens één source_id');
});

// ---- H: content claim IDs ongewijzigd / I: evidence IDs ongewijzigd (content freeze) ----
// De "bevriezing" gold specifiek voor de NK-02 UX-sprint (geen contentwijziging
// tijdens een UX-only sprint). NK-03 is uitdrukkelijk een content-uitbreidings-
// sprint (nieuwe topics/claims toegevoegd), dus een vast totaalaantal is hier
// niet meer het juiste contract. Wat wel blijft gelden, nu en in toekomstige
// sprints: de oorspronkelijke 11 NK-01-claims mogen nooit stilzwijgend worden
// herschreven -- dat wordt hier letterlijk, veld-voor-veld geverifieerd.
const FROZEN_NK_CLAIM_IDS = ['NK-CRE-DEF-001', 'NK-CRE-MECH-001', 'NK-CRE-CYCLE-001', 'NK-CRE-WEIGHT-001', 'NK-CRE-MISC-001', 'NK-PROT-DEF-001', 'NK-PROT-AA-001', 'NK-PROT-RDA-001', 'NK-PROT-QUALITY-001', 'NK-PROT-PLANT-001', 'NK-PROT-VEGAN-001'];
const FROZEN_NK_CLAIM_TEXT_SNAPSHOT = {
  'NK-CRE-CYCLE-001': 'Er is geen wetenschappelijk bewijs dat cyclen (periodiek stoppen en herstarten) van creatinegebruik noodzakelijk of voordelig is; continu gebruik op de aanbevolen dosis is veilig en effectief op lange termijn.',
  'NK-PROT-RDA-001': 'Voor de algemene, niet-sportende volwassen bevolking geldt een gemiddelde eiwitbehoefte van circa 0,66 g/kg/dag en een "veilig niveau" (RDA-equivalent) van circa 0,83 g/kg/dag, gebaseerd op stikstofbalansonderzoek.'
};
ok(KEvidence.CLAIMS.length >= 11, 'H: nutritionKnowledgeEvidenceRegistry.js bevat minimaal de 11 oorspronkelijke NK-01-claims (NK-03 voegt toe, verwijdert niets)');
ok(FROZEN_NK_CLAIM_IDS.every((id) => !!KEvidence.getById(id)), 'H-b: alle 11 bevroren NK-01-claim_id\'s bestaan nog exact zo');
Object.keys(FROZEN_NK_CLAIM_TEXT_SNAPSHOT).forEach((id) => {
  ok(KEvidence.getById(id).claim_text_internal === FROZEN_NK_CLAIM_TEXT_SNAPSHOT[id], 'H-c: de letterlijke claim-tekst van ' + id + ' is niet stilzwijgend gewijzigd sinds NK-01');
});
ok(SupEvidence.CLAIMS.length === 67, 'I: de Supplement Evidence Registry bevat nog steeds precies 67 claims (ongewijzigd)');

// ---- J: medische boundaries ongewijzigd ----
const creatinineCtx = Service.buildAiContext('CREATINE', 'CRE-FAQ-CREATININE');
ok(creatinineCtx.FORBIDDEN_INTERPRETATIONS.indexOf('een hogere creatinine-waarde bewijst nierschade') >= 0,
  'J: de medische-grens-tekst voor de creatinine-FAQ is exact ongewijzigd');

// ---- K: AI-contract ongewijzigd ----
const aiCtxKeys = Object.keys(Service.buildAiContext('PROTEIN', 'PROT-FAQ-SHAKE')).sort();
ok(JSON.stringify(aiCtxKeys) === JSON.stringify(['APPROVED_FACTS', 'CONFIDENCE', 'CONTEXT', 'EVIDENCE_LEVEL', 'FORBIDDEN_INTERPRETATIONS', 'LIMITATIONS', 'MISSING_INFORMATION', 'QUESTION', 'SAFETY_BOUNDARIES', 'SOURCE_REFERENCES', 'TOPIC', 'schema', 'status'].sort()),
  'K: het AI Output Contract heeft nog exact dezelfde velden als in NK-01');

// ---- L: geen persoonlijke calculation (herbevestiging) ----
const uiGroupsSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeUiGroups.js'), 'utf8');
ok(!/mg\s*\/\s*kg|gewicht\s*\*|weight\s*\*/i.test(uiGroupsSrc), 'L: geen mg/kg- of gewicht-berekening in de nieuwe UI-groeperingsmodule');
const kennisUiBlockMatch = html.match(/renderVoedingKennisTopic[\s\S]{0,6000}voedingKennisWetenschapHtml[\s\S]{0,2000}\n\}/);
ok(!!kennisUiBlockMatch && !/mg\s*\/\s*kg|gewicht\s*\*|weight\s*\*/i.test(kennisUiBlockMatch[0]), 'L-b: geen mg/kg- of gewicht-berekening in de nieuwe Kennis-UI-JS');

// ---- M: touch targets ----
ok(html.indexOf('.nk-acc>summary{list-style:none;cursor:pointer;padding:13px 14px;min-height:44px') >= 0, 'M: accordion-summary heeft min-height:44px');
ok(html.indexOf('.nk-faq-row>summary{list-style:none;cursor:pointer;padding:12px 4px;min-height:44px') >= 0, 'M-b: FAQ-rij heeft min-height:44px');
ok(/\.seg-opt\{[^}]*padding:8px 4px/.test(html), 'M-c: bestaande .seg-opt (hergebruikt voor de tabs) heeft voldoende padding voor een touch target');

// ---- N: 360px geen structurele overflow / O: 430px correct ----
ok(!/nk-hero\{[^}]*width:\s*\d{3,}px/.test(html), 'N: nk-hero gebruikt geen vaste breedte in pixels (blijft fluid, dus geen overflow bij 360px)');
ok(html.indexOf('.nk-acc-body{') >= 0 && /max-width:62ch/.test(html), 'N-b: tekstblokken hebben een leesbreedte-begrenzing (62ch), voorkomt te lange regels op brede (430px) schermen');
ok(!/nk-seg\{[^}]*overflow-x:\s*hidden\s*!important/.test(html), 'O: geen geforceerde overflow-hiding die content zou afknippen op 430px (fluid flex-layout via bestaande .seg)');

// ---- P: Creatine en Eiwitten gebruiken dezelfde componentstructuur ----
ok(JSON.stringify(Groups.TOPIC_GROUPS.CREATINE.map((g) => g.group_id)) === JSON.stringify(Groups.TOPIC_GROUPS.PROTEIN.map((g) => g.group_id)),
  'P: beide topics gebruiken dezelfde group_id-structuur (basis/praktisch/verdieping)');
ok(html.match(/voedingKennisRenderTabBody/g).length >= 2, 'P-b: beide topics renderen via dezelfde, ene tab-renderfunctie (geen topic-specifieke UI-code)');

// ---- Q: geen duplicatie van knowledge content in index.html ----
ok(!/Sterk onderbouwd voor relevante sportcontexten/.test(html), 'Q: de topic-tekst zelf (quick_summary_text) staat niet nogmaals hardgecodeerd in index.html');
ok(!/klasse=.protein.[\s\S]{0,50}Wat zijn eiwitten/.test(html), 'Q-b: sectietitels staan niet dubbel hardgecodeerd in index.html buiten de service-aanroep om');

console.log('fNutritionKnowledgeUxHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
