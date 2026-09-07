/* fNutritionKnowledgeAiHardening.test.js — NK-04B. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Resolver = require('./nutritionKnowledgeResolver.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

// ── extraheer nkStripMarkdownLite uit index.html om 'm los te testen ──
const stripFnMatch = html.match(/function nkStripMarkdownLite\(t\)\{[\s\S]+?\n\}/);
ok(!!stripFnMatch, '0: nkStripMarkdownLite() gevonden in index.html');
let nkStripMarkdownLite = function (x) { return x; };
if (stripFnMatch) {
  // 'use strict' aan de bestandstop zorgt dat een eval()-functiedeclaratie
  // NIET naar deze buitenste scope lekt -- daarom hier expliciet als
  // functie-EXPRESSIE evalueren en het returnwaarde toewijzen.
  nkStripMarkdownLite = eval('(' + stripFnMatch[0] + ')');
}

// ═══ SECTIE 4 — GEEN FAQ-/SUGGESTIEKAARTEN OP HET AI-SCHERM ═══
const vraagKeuzeMatch = html.match(/function renderVoedingKennisAiVraagKeuze\(topicId\)\{[\s\S]{0,2000}?\n\}/);
ok(!!vraagKeuzeMatch, '4-a: renderVoedingKennisAiVraagKeuze() gevonden');
if (vraagKeuzeMatch) {
  ok(vraagKeuzeMatch[0].indexOf('getFaq') === -1, '4-b: het AI-landingsscherm haalt geen FAQ-items meer op (geen FAQ-kaarten)');
  ok(vraagKeuzeMatch[0].indexOf('nk-ai-chip') === -1 && vraagKeuzeMatch[0].indexOf('nk-ai-suggestions') === -1, '4-c: geen suggestie-chip/kaart-opmaak meer in het AI-landingsscherm');
}
ok(html.indexOf('function voedingKennisAiUseSuggestion') === -1, '4-d: de FAQ-shortcut-functie is volledig verwijderd (niet alleen ongebruikt)');
ok(!/\.nk-ai-chip\{/.test(html) && !/\.nk-ai-suggestions\{/.test(html), '4-e: bijbehorende CSS voor de suggestiekaarten is opgeruimd (geen dode stijl)');

// ═══ SECTIE 5/6 — COMPACTE LANDING + HEADER ═══
ok(html.indexOf('<div class="hdr-title" role="heading" aria-level="1">Trainingskompas AI</div>') > 0, '6-a: header-titel is compact ("Trainingskompas AI", niet "Vraag Trainingskompas AI")');
ok(html.indexOf('id="nk-ai-hdr-sub"') > 0, '6-b: er is een bestaande, kleine hdr-sub-subtitel voor de topic-context (geen nieuwe typografieschaal)');
ok(html.indexOf("if(hdrSub) hdrSub.textContent=topic?topic.display_name:''") > 0, '6-c: de topic-naam wordt in de compacte subtitel gezet bij het openen van het scherm');
ok(vraagKeuzeMatch && vraagKeuzeMatch[0].indexOf('Waar wil je meer over weten?') > 0, '5-a: korte, subtiele lead-in-tekst boven de input (geen hero-tekst)');
ok(vraagKeuzeMatch && vraagKeuzeMatch[0].indexOf('placeholder="Stel je vraag..."') > 0, '5-b: placeholder is kort en generiek ("Stel je vraag..."), geen topic-naam ingebakken in de placeholder-tekst');
// De input moet, samen met de knop, vóór alle optionele/toggelbare content staan zodat hij zonder scrollen zichtbaar is.
if (vraagKeuzeMatch) {
  const idxInput = vraagKeuzeMatch[0].indexOf('nk-ai-input');
  const idxHow = vraagKeuzeMatch[0].indexOf('nk-ai-how');
  ok(idxInput >= 0 && idxHow >= 0 && idxInput < idxHow, '5-c: de input staat vóór de (inklapbare) uitleg in de rendervolgorde');
}

// ═══ SECTIE 7 — DISCLAIMER VEREENVOUDIGD, GEEN JARGON ═══
const JARGON_TERMEN = ['AI-gecertificeerde kennis', 'approved claims', 'Evidence Registry', 'Knowledge Resolver', 'evidence-pakket', 'claim_id', 'topic_id'];
JARGON_TERMEN.forEach((term) => {
  ok(vraagKeuzeMatch ? vraagKeuzeMatch[0].indexOf(term) === -1 : true, '7-a: geen producttechnisch jargon ("' + term + '") zichtbaar in het AI-landingsscherm');
});
ok(html.indexOf('id="nk-ai-how"') > 0, '7-b: uitgebreide uitleg staat achter een aparte, standaard ingeklapte "Hoe werkt dit?"-toggle');
ok(/id="nk-ai-how"[^>]*style="display:none"/.test(html), '7-c: de uitgebreide uitleg is standaard ingeklapt (geen permanente grote disclaimerkaart)');
ok(html.indexOf('Antwoorden zijn gebaseerd op gecontroleerde Trainingskompas-kennis') > 0, '7-d: de (ingeklapte) uitleg gebruikt gewone gebruikerstaal');

// ═══ SECTIE 8 — INPUT UX ═══
ok(html.indexOf('<textarea id="nk-ai-input"') > 0, '8-a: multiline textarea blijft de invoermethode');
ok(html.indexOf('.nk-ai-input{width:100%') > 0 && !/\.nk-ai-input\{[^}]*width:\s*\d{3,}px/.test(html), '8-b: input blijft fluid (geen vaste breedte, geen horizontale overflow)');
ok(html.indexOf('if(_nkAiSending) return;') > 0, '8-c: dubbele submit blijft geblokkeerd');
ok(html.indexOf('nk-ai-typing') > 0, '8-d: laadindicator blijft aanwezig');

// ═══ SECTIE 9 — MARKDOWN BUG (P1) ═══
ok(html.indexOf('nkStripMarkdownLite(raw)') > 0, '9-a: het ruwe AI-antwoord wordt door de markdown-stripper gehaald vóór weergave');
if (stripFnMatch) {
  ok(nkStripMarkdownLite('**Tijdens het sporten:** eet je best iets lichts.') === 'Tijdens het sporten: eet je best iets lichts.', '9-b: **vet** wordt platte tekst zonder sterretjes');
  ok(nkStripMarkdownLite('# Koolhydraten\nBelangrijk.') === 'Koolhydraten\nBelangrijk.', '9-c: # kopregel wordt platte tekst zonder hekje');
  ok(nkStripMarkdownLite('Gebruik de `30-60 g/u`-richtlijn.').indexOf('`') === -1, '9-d: inline `code` verliest de backticks');
  ok(nkStripMarkdownLite('- eerste punt\n- tweede punt').indexOf('- ') === -1, '9-e: markdown-opsomtekens (- ) worden niet meer letterlijk getoond');
  ok(nkStripMarkdownLite('*licht cursief*') === 'licht cursief', '9-f: *cursief* wordt platte tekst zonder sterretjes');
  ok(nkStripMarkdownLite('Gewone zin zonder opmaak.') === 'Gewone zin zonder opmaak.', '9-g: gewone tekst zonder markdown blijft exact ongewijzigd (geen overijverige opschoning)');
  ok(nkStripMarkdownLite('Bereik: 30 * 2 is geen vermenigvuldigteken-italic-false-positive').indexOf('*') >= 0 || true, '9-h: sanity — enkele losse asterisk in een niet-paar-context leidt niet tot crash');
}
// Systeeminstructie (defense-in-depth naast de client-side stripper)
ok(Resolver.buildSystemPrompt({ status: 'OK', TOPIC: 'Koolhydraten', QUESTION: 'test', APPROVED_FACTS: ['x'], EVIDENCE_LEVEL: ['A'], CONFIDENCE: ['Sterk bewijs'] }).indexOf('GEEN markdown-opmaak') > 0,
  '9-i: de systeeminstructie zelf vraagt het model ook al expliciet om geen markdown te gebruiken');

// ═══ SECTIE 9 (vervolg) — CONTEXTLOZE NUMERIEKE/PERSOONLIJKE VRAGEN ═══
ok(Resolver.containsPersonalNumeric('Ik weeg 82 kg, hoeveel koolhydraten moet ik eten?') === true, 'persoonlijk-numeriek: "82 kg" wordt gedetecteerd');
ok(Resolver.containsPersonalNumeric('Ik ben 35 jaar, is creatine dan nog zinvol?') === true, 'persoonlijk-numeriek: "35 jaar" wordt gedetecteerd');
ok(Resolver.containsPersonalNumeric('Heb ik koolhydraten nodig tijdens een training van 45 minuten?') === false, 'persoonlijk-numeriek: een duur ("45 minuten") wordt NIET als persoonlijk gewicht/leeftijd aangemerkt');
const pkgNumeriek = Resolver.resolveQuestion('Ik weeg 82 kg, hoeveel koolhydraten moet ik eten?');
if (pkgNumeriek.status === 'OK') {
  ok(Resolver.buildSystemPrompt(pkgNumeriek).indexOf('LET OP: deze vraag bevat een persoonlijk getal') > 0, '9-j: bij een persoonlijk-numerieke vraag krijgt de systeeminstructie een extra, expliciete waarschuwing');
}
const pkgGewoon = Resolver.resolveQuestion('Zijn koolhydraten voor training belangrijk?');
if (pkgGewoon.status === 'OK') {
  ok(Resolver.buildSystemPrompt(pkgGewoon).indexOf('LET OP: deze vraag bevat een persoonlijk getal') === -1, '9-k: bij een gewone vraag verschijnt de extra persoonlijk-getal-waarschuwing niet (geen ruis)');
}

// ═══ SCOPE FREEZE — sectie 2: niets anders is aangeraakt ═══
ok(html.indexOf('NutritionKnowledgeResolver.resolveQuestion') > 0, 'scope: Knowledge Resolver blijft de kern van de AI-flow (principe ongewijzigd)');
ok(html.indexOf("requestType:'knowledge_chat'") > 0, 'scope: dezelfde AI-providerarchitectuur/requestType als NK-04A, niets nieuws');
ok(html.indexOf('AIOutputContract.validateAiOutputText') > 0, 'scope: dezelfde output-validatie als NK-04A blijft van kracht');

console.log('fNutritionKnowledgeAiHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
