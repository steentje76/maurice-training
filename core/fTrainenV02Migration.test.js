/* core/fTrainenV02Migration.test.js
 * First Controlled Screen Migration: Trainen v0.2 (Design System v1).
 * Bewaakt: alle bestaande routes/functionaliteit blijven werken na de visuele
 * herstructurering, canonical DS-01..05-componenten worden hergebruikt (geen
 * tweede design system), max. 5 zichtbare activity-tiles met "Meer" voor de
 * rest, geen mockdata hardcoded, bottom-nav (gedeelde component) ongewijzigd,
 * de gedeelde v43RenderPlan-functie (ook gebruikt door Home) niet aangepast.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const trainMgr = html.split('<div class="scr" id="s-train-mgr">')[1].split('<div class="scr" id="s-train-detail">')[0];

// ---- 1. Header conform de canonical baseline (titel + subtitel + avatar) ----
ok(trainMgr.includes('>Trainen<') && trainMgr.includes('Plan, start en beheer je trainingen'),
  '1: header-titel/subtitel matchen exact de canonical trainen-v0.2.png (was "Training"/"Bouw, plan en start")');
ok(trainMgr.includes("go('s-profiel')"), '1b: avatar rechtsboven opent Profiel (bestaande route, ongewijzigd doel)');

// ---- 2. Alle bestaande routes blijven exact aanwezig (functional preservation) ----
[
  ["go('s-train-mine')", 'Mijn trainingen'],
  ["go('s-programma')", "Programma's"],
  ["go('s-kalender')", 'Planning/Kalender'],
  ["go('s-builder')", 'Training maken / Workout Builder'],
  ["go('s-running')", 'Hardlopen'],
  ["go('s-cycling')", 'Fietsen'],
  ["hyroxOpenSetupDirect('hyrox')", 'HYROX'],
  ["hyroxOpenSetupDirect('brick')", 'Triathlon-brick (via Meer)'],
  ["go('s-library')", 'Oefeningen'],
  ["openLosOefening()", 'Losse oefening (via Meer)'],
  ["go('s-hist')", 'Trainingshistorie/Logboek']
].forEach(function (pair) {
  ok(trainMgr.includes(pair[0]), '2 (' + pair[1] + '): de bestaande route/handler is exact behouden');
});

// ---- 3. Sport-switcher (bestaande functionaliteit) blijft aanwezig ----
ok(trainMgr.includes('id="sport-switcher"') && trainMgr.includes('setActiveSport'),
  '3: de sport-switcher-select blijft ongewijzigd aanwezig');

// ---- 4. Max. 5 zichtbare hoofdtiles in "Start een activiteit", rest via "Meer" ----
{
  const startBlok = trainMgr.split('>Start een activiteit</div>')[1].split('Maken &amp; ontdekken')[0];
  const zichtbareTiles = (startBlok.match(/class="quick-act"/g) || []).length;
  ok(zichtbareTiles === 7, '4a: 7 quick-act-elementen totaal -- 5 primair zichtbaar (Kracht/Hardlopen/Fietsen/HYROX/Meer, PO-contract max. 5) + 2 initieel verborgen in de "Meer"-uitklap (Triathlon/Losse oefening)');
  ok(startBlok.includes('id="trainen-meer-activiteiten"') && startBlok.includes('style="display:none'),
    '4b: de "Meer"-activiteiten (Triathlon, Losse oefening) zijn initieel verborgen (display:none), niet verwijderd -- toegankelijk via de Meer-toggle, geen tweede execution-path/nieuw scherm');
  ok(startBlok.includes('id="trainen-meer-btn"') && startBlok.includes('aria-expanded="false"'),
    '4c: de Meer-knop heeft aria-expanded voor toegankelijkheid');
  // Precieze PO-eis: het EERSTE, primair zichtbare blok (vóór de "Meer"-uitklap-div)
  // bevat exact 5 tiles -- niet toevallig 7 door de twee verborgen tiles mee te tellen.
  const primairZichtbaarBlok = startBlok.split('id="trainen-meer-activiteiten"')[0];
  const primairAantal = (primairZichtbaarBlok.match(/class="quick-act"/g) || []).length;
  ok(primairAantal === 5, '4d: het primair zichtbare blok (vóór de Meer-uitklap) bevat exact 5 tiles -- Kracht/Hardlopen/Fietsen/HYROX/Meer, conform het PO-contract "exact maximaal 5 zichtbare hoofdkeuzes"');
}

// ---- 5. Canonical DS-componenten hergebruikt, geen tweede design system ----
ok((trainMgr.match(/tk-card tk-card-l3/g) || []).length >= 4,
  '5a: meerdere Level-3 (standard function) cards gebruiken de canonical .tk-card-l3-klasse');
ok(trainMgr.includes('tk-card tk-card-l2'), '5b: de empty-state gebruikt een canonical Level-2 (context) card');
ok((trainMgr.match(/data-icon="/g) || []).length >= 10,
  '5c (gecorrigeerd na de PR #229-runtimefix): de nieuwe secties gebruiken statisch gerenderde tk-icon-SVG (data-icon-attribuut) i.p.v. runtime tkIcon()-aanroepen -- ${tkIcon(...)} in STATISCHE HTML wordt NOOIT door JS geevalueerd (geen omringende template literal), dus werd letterlijk als tekst gerenderd in de echte browser. Root cause zelf gevonden, herbevestigd, en hier permanent geblokkeerd (zie ook fTrainenTemplateLiteralAudit.test.js).');
ok(!trainMgr.match(/\.tk-btn-custom|\.tk-card-custom|\.trainen-btn-|\.trainen-card-/),
  '5d: geen nieuwe, lokale button-/card-family geintroduceerd -- uitsluitend de bestaande canonical DS-04/DS-05-klassen hergebruikt');

// ---- 6. Geen mockdata hardcoded als productie-inhoud ----
ok(!trainMgr.includes('Training A') || trainMgr.split('Training A').length <= 1,
  '6: "Training A" (mockup-voorbeeldnaam) komt niet hardcoded voor in de Trainen-scherm-HTML zelf -- de echte trainingsnaam komt uitsluitend uit de gedeelde v43RenderPlan()-functie met window.homeNextT als databron');
ok(!trainMgr.match(/19:00|Gym · Strength|7 oefeningen<\/span>/),
  '6b: geen hardcoded mockup-tijd/locatie/oefeningaantal in de statische HTML');

// ---- 7. De gedeelde v43RenderPlan-functie (ook gebruikt door Home) blijft backward-compatible ----
{
  const fnMatch = html.match(/function v43RenderPlan\(elId,nextT,opts\)\{[\s\S]*?\n\}/);
  ok(fnMatch && fnMatch[0].includes("if(!nextT){el.innerHTML='';return;}"),
    '7 (Visual Fidelity Pass, backward-compatible uitgebreid): v43RenderPlan() heeft een nieuwe, optionele 3e parameter (opts) voor Trainen v0.2 (Bekijk details-knop, compacte padding) -- Home roept de functie nog steeds met exact 2 argumenten aan, dus opts is daar altijd undefined en het gedrag/de HTML voor Home is 100% ongewijzigd');
  ok(html.includes("v43RenderPlan('home-plan',nextT)"),
    '7a: Home roept v43RenderPlan nog steeds aan met precies 2 argumenten (geen opts) -- geen regressie op s-home');
  ok(html.includes("v43RenderPlan('v43-train-plan',window.homeNextT,{detailsButton:true,compact:true})"),
    '7b: Trainen roept dezelfde, gedeelde functie aan met de nieuwe, optionele parameters -- geen gedupliceerde, tweede renderlogica voor dezelfde "volgende training"-kaart');
}

// ---- 8. Aanvullende, Trainen-specifieke empty state (additief, buiten de gedeelde functie) ----
ok(html.includes('id="trainen-plan-empty"') && html.includes('Nog geen training gepland'),
  '8: een aparte, Trainen-specifieke empty-state-div is toegevoegd naast (niet in plaats van) de gedeelde v43-train-plan-div -- vult de eerder geconstateerde "lege string bij geen training"-gap zonder Home te raken');

// ---- 9. Bottom navigation (gedeelde component) is NIET gemigreerd ----
ok(trainMgr.includes('.bnav') === false, '9a: geen nieuwe .bnav-CSS-klasse gedefinieerd binnen dit scherm (blijft de bestaande, gedeelde stijl gebruiken)');
ok(trainMgr.includes("<span class=\"ni-label\">Training</span>") && trainMgr.includes('🏋️'),
  '9b: de bottom-nav-labels/iconen (legacy: Home/Training/Lichaam/Coach/Voortgang) zijn bewust ongewijzigd -- een gedeelde component die op elk scherm verschijnt; een label-wijziging hier zou een onbedoelde, halve app-brede navigatiemigratie zijn (NAVIGATION MIGRATION DEPENDENCY, zie het implementatierapport)');

// ---- 10. Bestaande schermen (s-train-detail, s-kalender) blijven correct terugverwijzen ----
ok(html.includes("onclick=\"go('s-train-mgr')\" aria-label=\"Sluiten, terug naar Training\""),
  '10: bestaande sub-schermen (dagdetail, kalender) verwijzen nog correct terug naar s-train-mgr -- geen gebroken back-navigatie door de scherminhoud-wijziging');

// ---- 11. Canonical visual baseline blijft byte-identiek (geen wijziging aan de PNG's zelf) ----
{
  const EXPECTED_HASHES = {
    'vandaag-v0.11.png': 'dce35fd2eb97f8666c52d47fcf31dfafda6a2833d05d5cf8644fe44c8c02f584',
    'trainen-v0.2.png': 'e9602c6e3527efbfa3bd9ecbaea8f5199a2d261cbc15bcfa0bd707682a70cf1a',
    'inzicht-v0.1.png': '7c1ed35fdc2b8d0fadbfe0ea88ca5a388d2c7a532cfa96667396e7c8a424bf8a',
    'coach-v0.2.png': 'ee209edcdd0ae3ece0fc24b64ac90bc784576ee5d26e4f1dc78eb329a0defca5',
    'samen-v0.1.png': 'cc4479b912b059c1c3f7749f758649fe432c4271a4aafe1e419de30fe0453ffb',
    'profiel-v0.1.png': 'adeca214e5dc3644ea0e98ad7d3346105361d8aa5449ae3b6997f56e4e343ad4'
  };
  const baseDir = path.join(ROOT, 'docs/ux/baseline/v1');
  let allMatch = true;
  Object.keys(EXPECTED_HASHES).forEach(function (fname) {
    const p = path.join(baseDir, fname);
    const hash = fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null;
    if (hash !== EXPECTED_HASHES[fname]) allMatch = false;
  });
  ok(allMatch, '11: alle 6 canonical PNG-hashes zijn byte-identiek -- de target-referentie zelf is nooit aangepast om de runtime "passend" te maken');
}

// ---- 12. Geen andere hoofdscherm is gemigreerd deze sprint ----
ok(!html.match(/id="s-home-v2"|id="s-inzicht-v2"|id="s-coach-v2"|id="s-samen-v2"|id="s-profiel-v2"/),
  '12: geen van de overige vijf hoofdschermen (Vandaag/Inzicht/Coach/Samen/Profiel) is als nieuw scherm geimplementeerd -- uitsluitend Trainen deze sprint');

// ---- Fase 5 (statische, snelle aanvulling op fTrainenBrowserRuntime.test.js) ----
// Deze checks draaien altijd (geen browser/CI-afhankelijkheid) en blokkeren de
// meest voorkomende variant van de PR #229-regressie al op source-niveau,
// als eerste, snelle verdedigingslinie vóór de echte browsertest.
ok(!html.match(/\$\{tkIcon\(/), 'FASE5-1: geen enkele letterlijke "${tkIcon(" in de volledige index.html (STATISCHE HTML mag nooit een onuitgevoerde template-expressie bevatten)');
ok(!trainMgr.match(/\$\{[a-zA-Z_]/), 'FASE5-2: geen enkele "${" gevolgd door een JS-identifier binnen s-train-mgr (zou duiden op een onuitgevoerde template-literal-interpolatie in statische markup)');
ok((trainMgr.match(/<svg class="tk-icon"/g) || []).length >= 12, 'FASE5-3: canonical icon markup resolveert daadwerkelijk naar <svg (bron-niveau bevestiging, aanvullend op de browser-DOM-test)');

console.log('fTrainenV02Migration: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);

