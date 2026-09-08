/* fNutritionKnowledgeConversationalAi.test.js — NK-04C. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Resolver = require('./nutritionKnowledgeResolver.js');
const AIOutputContract = require('./aiOutputContract.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

// ── A: vague question -> clarification ──
let r = Resolver.resolveQuestion('Hoeveel moet ik eten?', 'PRE_TRAINING');
ok(r.status === 'CLARIFY', 'A: vage, timing-ambigue vraag levert CLARIFY op i.p.v. een claim-dump');
ok(!!r.clarifyQuestion && r.clarifyQuestion.length < 80, 'A-b: de vervolgvraag is kort (geen formulier)');

// ── B: personal amount -> no calculation ──
r = Resolver.resolveQuestion('Ik weeg 105 kg. Hoeveel eiwit moet ik eten?', 'PROTEIN');
ok(r.status === 'OK', 'B: persoonlijke hoeveelheidsvraag met duidelijk topic levert een resultaat op');
if (r.status === 'OK') {
  ok(!r.APPROVED_FACTS.some((f) => /\b105\b/.test(f)), 'B-b: "105" komt niet terug in een berekend feit');
  ok(Resolver.buildSystemPrompt(r).indexOf('LET OP: deze vraag bevat een persoonlijk getal') > 0, 'B-c: systeeminstructie krijgt de persoonlijk-getal-waarschuwing');
}
ok(Resolver.classifyIntent('Ik weeg 105 kg. Hoeveel eiwit moet ik eten?') === 'PERSONAL_AMOUNT', 'B-d: intent wordt correct herkend als PERSONAL_AMOUNT');

// ── C: missing duration -> not invented ──
r = Resolver.resolveQuestion('Heb ik koolhydraten nodig tijdens mijn training?', 'DURING_TRAINING');
ok(r.status === 'OK', 'C: vraag zonder duur levert alsnog een resultaat op (geen verzonnen duur)');
if (r.status === 'OK') ok(!r.APPROVED_FACTS.some((f) => /\b\d+\s*(min|uur)\b.*\bjouw\b/i.test(f)), 'C-b: geen enkel feit doet alsof een specifieke, niet-gegeven duur van de gebruiker bekend is');

// ── D: missing timing -> clarification ──
r = Resolver.resolveQuestion('Hoeveel koolhydraten moet ik nemen?', 'DURING_TRAINING');
ok(r.status === 'CLARIFY', 'D: persoonlijke hoeveelheidsvraag zonder timing binnen de timing-ambigue groep vraagt om verduidelijking');

// ── E: follow-up state retained ──
const gecombineerd = Resolver.combineWithClarificationAnswer('Hoeveel moet ik eten?', 'Tijdens');
ok(gecombineerd.indexOf('Hoeveel moet ik eten?') === 0 && gecombineerd.indexOf('Tijdens') > 0, 'E: combineWithClarificationAnswer voegt vraag+antwoord samen zonder iets te verliezen');
const r2 = Resolver.resolveQuestion(gecombineerd, 'PRE_TRAINING');
ok(r2.status === 'OK', 'E-b: na het combineren met het vervolgantwoord ("Tijdens") wordt de vraag wél verantwoord beantwoord');
ok(html.indexOf('_nkAiPendingClarification') > 0, 'E-c: client-side conversation-state (pending clarification) is aanwezig');
ok(html.indexOf('NutritionKnowledgeResolver.combineWithClarificationAnswer') > 0, 'E-d: de client gebruikt combineWithClarificationAnswer() bij een openstaande verduidelijking');

// ── F: irrelevant protein claim excluded from carb timing question ──
r = Resolver.resolveQuestion('Hoeveel koolhydraten moet ik tijdens mijn training eten?', 'DURING_TRAINING');
ok(r.status === 'OK', 'F-sanity: query levert een resultaat op');
if (r.status === 'OK') {
  const heeftEiwitRangeClaim = r.usedClaimIds.some((id) => id === 'PROT-TOTAL-001' || id === 'PROT-HIGH-001' || id === 'PROT-HYPOCAL-001');
  ok(!heeftEiwitRangeClaim, 'F: de algemene dagelijkse-eiwitrange-claim wordt niet meegenomen in een koolhydraat/tijdens-training-vraag');
}

// ── G: during-exercise claim excluded from pre-exercise question where irrelevant ──
r = Resolver.resolveQuestion('Ik weeg 105 kg, hoeveel moet ik voor mijn training eten?', 'PRE_TRAINING');
ok(r.status === 'OK' || r.status === 'CLARIFY', 'G-sanity: query levert een resultaat of gerichte vervolgvraag op');
if (r.status === 'OK') {
  ok(!r.usedClaimIds.some((id) => id === 'CARB-MID-001' || id === 'CARB-LONG-001'), 'G: de tijdens-training-koolhydraatranges (30-60/90 g/u) worden niet meegenomen in een vóór-training-vraag');
}

// ── H: cross-topic relevant query ──
r = Resolver.resolveQuestion('Wat is het verschil tussen creatine en eiwit?');
ok(r.status === 'OK' && r.matchedTopics.indexOf('CREATINE') >= 0 && r.matchedTopics.indexOf('PROTEIN') >= 0, 'H: een oprecht cross-topic-vraag blijft correct beide topics combineren');

// ── I: safety claim retained when required ──
r = Resolver.resolveQuestion('Ik denk dat ik RED-S heb, wat betekent dat?');
ok(r.status === 'OK', 'I-sanity: medische/veiligheidsvraag levert een resultaat op');
if (r.status === 'OK') ok(r.usedClaimIds.indexOf('NK-ENE-REDS-001') >= 0, 'I: de relevante RED-S-veiligheidsclaim blijft behouden bij een RED-S-vraag');

// ── J: unknown query ──
r = Resolver.resolveQuestion('Kun je een grapje vertellen?');
ok(Resolver.classifyIntent('Kun je een grapje vertellen?') === 'UNKNOWN' || r.status === 'INSUFFICIENT', 'J: een niet-herkende, irrelevante vraag wordt als UNKNOWN/INSUFFICIENT behandeld, niet geforceerd in een intent geperst');

// ── K: insufficient evidence ──
r = Resolver.resolveQuestion('Wat is het beste boek over de tweede wereldoorlog?');
ok(r.status === 'INSUFFICIENT', 'K: buiten-domein-vraag blijft INSUFFICIENT opleveren');

// ── L: max one clarification question ──
r = Resolver.resolveQuestion('Hoeveel moet ik eten?', 'PRE_TRAINING');
ok(r.status === 'CLARIFY' && (r.clarifyQuestion.match(/\?/g) || []).length === 1, 'L: er wordt hoogstens één vraagteken/vervolgvraag per beurt gesteld');

// ── M: no claim dump ──
['Hoeveel moet ik eten?', 'Hoeveel koolhydraten moet ik nemen?'].forEach((q) => {
  const res = Resolver.resolveQuestion(q, 'PRE_TRAINING');
  ok(res.status === 'CLARIFY' || (res.usedClaimIds || []).length <= Resolver.MAX_CLAIMS, 'M: "' + q + '" resulteert nooit in een ongefilterde claim-dump (CLARIFY of begrensd)');
});

// ── N: source traceability (ongewijzigd principe, herbevestiging) ──
r = Resolver.resolveQuestion('Wat is carb loading?');
if (r.status === 'OK') r.SOURCE_REFERENCES.forEach((s) => ok(!!s.source_id && !!s.title, 'N: elke bronvermelding heeft nog steeds een geldige source_id + titel'));

// ── O: output validation (AIOutputContract ongewijzigd van kracht) ──
ok(!AIOutputContract.validateAiOutputText('Jouw persoonlijke koolhydraatinname is 320 gram per dag.').valid, 'O: AIOutputContract blijft persoonlijke-berekeningstaal weigeren, ook na de NK-04C-uitbreiding');

// ── P: FAQ path remains separate ──
const faqFnMatch = html.match(/function voedingKennisFaqHtml\(topicId\)\{[\s\S]{0,600}?\n\}/);
ok(!!faqFnMatch && faqFnMatch[0].indexOf('classifyIntent') === -1 && faqFnMatch[0].indexOf('resolveQuestion') === -1, 'P: de FAQ-tab gebruikt geen intent-resolutie/Resolver -- blijft de eenvoudige, vaste FAQ-lookup');

// ── Q: no raw Markdown regression ──
ok(html.indexOf('nkStripMarkdownLite(raw)') > 0, 'Q: de markdown-stripper (NK-04B) blijft toegepast op elk AI-antwoord, ook na de NK-04C-wijzigingen');

// ── R: no AI calculation ──
const resolverSrc = fs.readFileSync(path.join(ROOT, 'core/nutritionKnowledgeResolver.js'), 'utf8');
const resolverCodeOnly = resolverSrc.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
ok(!/\d+\s*\*\s*\d+/.test(resolverCodeOnly.replace(/require\([^)]*\)/g, '')), 'R: geen enkele vermenigvuldiging/berekening in de Resolver-code zelf (puur matchen/filteren, geen rekenwerk)');
ok(resolverSrc.indexOf('function classifyIntent') > 0 && resolverSrc.indexOf('function combineWithClarificationAnswer') > 0, 'R-sanity: intent-classificatie en state-combinatie blijven pure, tekstuele operaties');

console.log('fNutritionKnowledgeConversationalAi: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
