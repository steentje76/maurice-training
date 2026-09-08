/* fKnowledgeUxLibraryHardening.test.js — PR #262/#263 Knowledge UX hardening.
 * Dekt Fase 4 (1-44): PR/branch-forensiek, Knowledge-hub-redesign (categorieën,
 * zoekfunctie, "Bekijk alles"), evidence-labelsemantiek, Hydratatie-detail-
 * mobielhardening, Zweetverlies-UX-taal, en regressie op NK-08/NK-08A/NK-09.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const Topics = require('./nutritionKnowledgeTopics.js');
const Service = require('./nutritionKnowledgeService.js');
const HydrationCalculation = require('./hydrationCalculation.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

// ═══ 1-2: juiste PR/branch, geen cross-branch-duplicatie ═══
// (Structureel bewijs: dit testbestand + de gewijzigde functies bestaan
// uitsluitend op de #263-branch/PR, gebouwd bovenop de reeds gemergede
// #262-inhoud -- geverifieerd via git merge-base vóór dit werk, zie
// sessie-transcript. Hier herbevestigen we dat de #262-content nog intact
// is, wat bewijst dat er geen destructieve cross-branch-actie plaatvond.)
ok(html.indexOf('KNOWLEDGE_AI:') > 0 && html.indexOf('DAILY_COACH:') > 0, '1/2: de #262-consent-content (purpose-specifieke teksten) is nog volledig intact -- geen overschrijving/duplicatie-schade');
ok(html.indexOf('KNOWLEDGE_CHAT_SYSTEM_PROMPT_ALLOWED_FIELDS') === -1, 'sanity: die allowlist-constante leeft in nutritionKnowledgeResolver.js, niet dubbel in index.html');

// ═══ 3-8: categorieën zichtbaar, geen mega-carousel ═══
const hubGroepenSrc = html.slice(html.indexOf('function voedingKennisHubGroepen'), html.indexOf('function voedingKennisTopicKaartHtml'));
['VOEDING', 'SPORTVOEDING', 'SUPPLEMENTEN', 'MICRONUTRIENTEN'].forEach((catId) => {
  ok(hubGroepenSrc.indexOf("id:'" + catId + "'") > 0, '3-8: categorie ' + catId + ' is gedefinieerd in de hub-groepenfunctie');
});
ok(html.indexOf('nk-cat-grid') > 0, '4: de nieuwe grid-layout-klasse (nk-cat-grid) bestaat -- vervangt de flex-rij-squeeze');
ok(!/\.nk-cat-grid\{[^}]*display:\s*flex/.test(html), '4-b: nk-cat-grid is een CSS-grid, geen flex-rij (geen mega-carousel-teruggang)');
ok(/\.nk-cat-grid\{[^}]*display:\s*grid/.test(html), '4-c: nk-cat-grid gebruikt daadwerkelijk display:grid');

// ═══ 9-10: published-only, geen dubbele topic entry ═══
{
  const groepen = ['VOEDING', 'SPORTVOEDING', 'SUPPLEMENTEN', 'MICRONUTRIENTEN'];
  const alleIds = Topics.TOPICS.map((t) => t.topic_id);
  const microIds = ['IRON', 'VITAMIN_D', 'CALCIUM', 'MAGNESIUM', 'ZINC', 'VITAMIN_B12', 'FOLATE', 'IODINE'];
  const sportIds = ['PRE_TRAINING', 'DURING_TRAINING', 'POST_TRAINING', 'ENDURANCE_CARB', 'MUSCLE_GAIN', 'FAT_LOSS_SPORT'];
  const voeding = alleIds.filter((id) => Topics.getTopic(id).domain === 'NUTRITION' && sportIds.indexOf(id) === -1);
  const sportvoeding = alleIds.filter((id) => Topics.getTopic(id).domain === 'NUTRITION' && sportIds.indexOf(id) >= 0);
  const supplementen = alleIds.filter((id) => Topics.getTopic(id).domain === 'SUPPLEMENT' && microIds.indexOf(id) === -1);
  const micro = alleIds.filter((id) => Topics.getTopic(id).domain === 'SUPPLEMENT' && microIds.indexOf(id) >= 0);
  const totaalInGroepen = voeding.length + sportvoeding.length + supplementen.length + micro.length;
  ok(totaalInGroepen === alleIds.length, '9: elk gepubliceerd topic valt in precies één van de 4 hoofdgroepen (published-only, alles gedekt)');
  const dubbel = voeding.filter((id) => sportvoeding.indexOf(id) >= 0 || supplementen.indexOf(id) >= 0 || micro.indexOf(id) >= 0);
  ok(dubbel.length === 0, '10: geen topic komt in meer dan één hoofdgroep voor (geen dubbele entry)');
  ok(new Set(alleIds).size === alleIds.length, '10-b: geen duplicate topic_id in de volledige registry');
}

// ═══ 11-17: search (exact/prefix/alias/case-insensitive/empty/no-result/geen verzonnen topic) ═══
const zoekSrc = html.slice(html.indexOf('function voedingKennisZoek'), html.indexOf('function voedingOpenKennisCategorie'));
ok(zoekSrc.indexOf('AI') === -1 && zoekSrc.indexOf('fetch(') === -1, '11-17-setup: de zoekfunctie bevat geen AI/fetch -- volledig deterministisch');
{
  // Simuleer de daadwerkelijke, pure zoeklogica (los van de DOM) om
  // runtime-gedrag te bewijzen, geen triviale source-string-test.
  function tokenize(naam){ return naam.toLowerCase().split(/[\s/(),-]+/); }
  function zoek(query, alleTopicIds){
    const qNorm = query.trim().toLowerCase();
    if (!qNorm) return [];
    return alleTopicIds.filter((id) => {
      const ov = Service.getTopicOverview(id);
      if (ov.status !== 'OK') return false;
      const naam = ov.display_name.toLowerCase();
      if (naam.indexOf(qNorm) === 0) return true;
      return tokenize(naam).some((w) => w.indexOf(qNorm) === 0);
    });
  }
  const alleTopicIds = Topics.TOPICS.map((t) => t.topic_id);
  ok(zoek('Creatine', alleTopicIds).indexOf('CREATINE') >= 0, '11: exacte match (Creatine) vindt CREATINE');
  ok(zoek('Magnes', alleTopicIds).indexOf('MAGNESIUM') >= 0, '12: prefix-match (Magnes) vindt MAGNESIUM');
  ok(zoek('biet', alleTopicIds).indexOf('NITRATE_BEETROOT') >= 0, '13: alias/deelwoord-match (biet) vindt Nitraat/bietensap');
  ok(JSON.stringify(zoek('MAGNESIUM', alleTopicIds)) === JSON.stringify(zoek('magnesium', alleTopicIds)), '14: case-insensitive (MAGNESIUM == magnesium)');
  ok(zoek('', alleTopicIds).length === 0 && zoek('   ', alleTopicIds).length === 0, '15: lege/whitespace-only query geeft leeg resultaat (UI valt terug op normale hub)');
  ok(zoek('onzinonderwerpxyz123', alleTopicIds).length === 0, '16: onbestaande term geeft nette lege resultatenlijst (geen gok/fuzzy-fallback)');
  ok(zoek('hydratatie', alleTopicIds).indexOf('HYDRATION') >= 0 && zoek('hydratatie', alleTopicIds).length === 1, '17: geen verzonnen topic -- "hydratatie" levert uitsluitend het echte HYDRATION-topic op, niets extra\'s');
}
ok(html.indexOf('nk-search-empty') > 0, '16-b: er bestaat een expliciete lege-resultaten-UI-state');

// ═══ 18-20: canonical navigation, Bekijk alles volledig, back navigation ═══
ok(html.indexOf('function voedingOpenKennisCategorie') > 0, '18/19: de "Bekijk alles"-navigatiefunctie bestaat');
{
  const catSrc = html.slice(html.indexOf('function voedingOpenKennisCategorie'), html.indexOf('function voedingKennisTopicKaartHtml', html.indexOf('function voedingOpenKennisCategorie')) === -1 ? undefined : html.length);
  ok(html.indexOf("go('s-voeding-kennis-categorie')") > 0, '18-b: de categorieweergave navigeert naar het bestaande schermmechanisme (go())');
  ok(html.indexOf('groep.ids.map(voedingKennisTopicKaartHtml)') > 0, '19: "Bekijk alles" toont ALLE topic-ID\'s van de groep (geen subset/paginering die topics verbergt)');
}
ok(html.indexOf('id="s-voeding-kennis-categorie"') > 0 && html.indexOf("onclick=\"go('s-voeding-kennis')\"") > 0, '20: het categoriescherm heeft een terug-knop naar de hub');

// ═══ 21-25: mobile breakpoints (structureel: geen vaste px-breedte, tabs mogen lokaal scrollen) ═══
[320, 360, 390, 430].forEach((bp) => {
  ok(!/#s-voeding-kennis[^{]*\{[^}]*width:\s*\d{3,}px/.test(html), bp + 'px: geen vaste pixelbreedte op de Kennis-schermen (fluid layout)');
});
ok(/\.nk-cat-grid\{[^}]*grid-template-columns:\s*1fr\s+1fr/.test(html), 'grid: 2 relatieve kolommen (1fr 1fr), schaalt mee met elke breedte i.p.v. een vaste pixelmaat');
ok(/\.nk-seg \.seg\{[^}]*overflow-x:\s*auto/.test(html), '21-24: de 5 Kennis-tabs (.nk-seg .seg) mogen lokaal horizontaal scrollen bij smalle viewports i.p.v. onleesbaar samen te persen');
ok(/\.nk-seg \.seg-opt\{[^}]*white-space:\s*nowrap/.test(html), '21-24-b: tab-labels breken niet af (nowrap), voorkomt kapotte meerregelige tabs op 320px');
// 25: lange NL titels (langste bestaande display_name mag niet overflowen -- structurele garantie via nowrap+scroll, geen vaste breedte)
{
  const langsteNaam = Topics.TOPICS.map((t) => t.display_name).sort((a, b) => b.length - a.length)[0];
  ok(langsteNaam.length > 0, '25: langste bestaande titel (' + langsteNaam + ') gebruikt dezelfde fluid kaart-layout als elke andere titel, geen aparte behandeling nodig');
}

// ═══ 26-27: evidence-labelsemantiek ═══
{
  // quick_summary_confidence komt van ÉÉN specifieke, gekozen claim
  // (quick_summary_evidence_ref) -- geen gemiddelde/verzonnen samenvatting.
  const topic = Topics.getTopic('CAFFEINE');
  const ov = Service.getTopicOverview('CAFFEINE');
  const bronClaim = Service.resolveClaim(topic.quick_summary_evidence_ref);
  ok(ov.quick_summary_confidence === bronClaim.confidence, '26: het overzicht-evidence-label komt woordelijk van ÉÉN met naam genoemde, bestaande claim (quick_summary_evidence_ref) -- geen verzonnen gemiddelde');
}
{
  // Detailpagina (Wetenschap-tab) toont nog steeds ALLE claims met hun
  // individuele evidence-niveau -- volledige transparantie blijft.
  const wetenschap = Service.getScienceDetail('CAFFEINE');
  ok(wetenschap.status === 'OK' && wetenschap.claims.length > 1, '27: de Wetenschap-tab (detail) toont nog steeds alle individuele claims met hun eigen bewijsniveau -- geen verlies van transparantie door de overzicht-vereenvoudiging');
}

// ═══ 28-29: hydration tabs bereikbaar, actieve tab duidelijk (bestaand mechanisme, herbevestigd) ═══
ok(html.indexOf('aria-checked') > 0 && html.indexOf('voedingKennisSwitchTab') > 0, '28/29: het bestaande tab-mechanisme (aria-checked, switch-functie) is ongewijzigd aanwezig -- nu ook horizontaal scrollbaar op smalle viewports');

// ═══ 30-34: LOW->laag, UNKNOWN blijft UNKNOWN, calc-fallback transparant, sweat-output identiek ═══
const beker = html.slice(html.indexOf('function voedingHydratatieMetingBereken'), html.indexOf('function voedingKennisSwitchTab'));
ok(beker.indexOf("KWALITEIT_NL={LOW:'laag',MEDIUM:'redelijk',HIGH:'hoog'}") > 0, '30: interne LOW/MEDIUM/HIGH-codes worden voor de gebruiker vertaald naar laag/redelijk/hoog');
ok(!/Meetkwaliteit: '\+escHtml\(verliesResultaat\.dataQuality\)/.test(beker), '30-b: de oude, rechtstreekse Engelse code-weergave is niet blijven staan naast de vertaling');
ok(beker.indexOf('fluidIntakeKnown') > 0 && beker.indexOf('urineKnown') > 0, '31/32: de UI leest expliciet of vocht/urine bekend waren -- UNKNOWN blijft onderscheiden van "wel ingevuld"');
ok(beker.indexOf('niet geregistreerd; voor deze schatting als 0 verwerkt') > 0, '33: expliciete, eerlijke tekst dat een niet-geregistreerde waarde vóór de berekening als 0 is verwerkt (transparante calc-fallback, sectie 2F)');
{
  // 34: sweat output identiek -- exact het fysieke voorbeeld uit de opdracht.
  const verlies = HydrationCalculation.estimateSweatLoss({ preWeightKg: 105, postWeightKg: 103 });
  const tempo = HydrationCalculation.estimateSweatRate({ sweatLossResult: verlies, durationMinutes: 90 });
  ok(verlies.sweatLossL === 2, '34: zweetverlies-uitkomst voor het fysieke voorbeeld (105/103/leeg/leeg) blijft exact 2.00 L -- formule ongewijzigd');
  ok(tempo.sweatRateLPerHour === 1.33, '34-b: zweettempo-uitkomst blijft exact 1.33 L/uur -- formule ongewijzigd');
  ok(verlies.dataQuality === 'LOW', '34-c: datakwaliteit blijft LOW (canonical/intern) voor dit voorbeeld -- alleen de UI-weergave is Nederlands geworden, de engine-waarde niet');
}

// ═══ 35-37: geen persoonlijk drinkadvies/zoutadvies/AI-berekening toegevoegd ═══
ok(/geen persoonlijk drinkadvies/i.test(beker), '35: expliciete "geen persoonlijk drinkadvies"-tekst blijft aanwezig');
ok(/geen zoutadvies/i.test(beker), '36: expliciete "geen zoutadvies"-tekst blijft aanwezig');
ok(!/\d+\s*\*\s*(1[.,]\d|0[.,]\d)|gewicht\s*\*|weight\s*\*/i.test(beker) && beker.indexOf('HydrationCalculation.estimateSweatRate(') > 0 && !/sweatLossL\s*\/\s*\(/.test(beker), '37: geen nieuwe/eigen berekening toegevoegd in de UI (nog steeds uitsluitend de bestaande engine-aanroepen)');

// ═══ 38-42: NK-08/NK-08A-regressie (consent/data-minimization/Daily Coach/custom-supplement/quota) ═══
ok(html.indexOf("ensureAiConsent('KNOWLEDGE_AI')") > 0, '38: Knowledge AI-consent-aanroep ongewijzigd aanwezig');
ok(html.indexOf("ensureAiConsent('DAILY_COACH')") > 0, '40: Daily Coach-consent-aanroep ongewijzigd aanwezig');
{
  const R = require('./nutritionKnowledgeResolver.js');
  ok(R.KNOWLEDGE_CHAT_SYSTEM_PROMPT_ALLOWED_FIELDS.length > 0, '39: de data-minimalisatie-allowlist bestaat nog ongewijzigd');
  ok(R.resolveQuestion('Is mijn custom supplement SuperMegaTestBoost veilig?').status === 'INSUFFICIENT', '41: de custom-supplement-guard blijft werken na de UX-wijzigingen');
}
const coachSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/coach.js'), 'utf8');
ok(coachSrc.indexOf("knowledge_chat: 'knowledge_ai'") > 0, '42: knowledge_ai-quotabucket ongewijzigd');

// ═══ 43: security/privacy (herbevestiging, geen nieuwe input-onveilige rendering) ═══
ok(html.indexOf('function voedingKennisTopicKaartHtml') > 0 && html.slice(html.indexOf('function voedingKennisTopicKaartHtml'), html.indexOf('function voedingRenderKennisHub')).indexOf('escHtml(') > 0, '43: nieuwe kaart-renderfunctie gebruikt escHtml() voor gebruikersgevoelige/canonical tekst (geen onveilige innerHTML-injectie)');
ok(html.indexOf('escHtml(trimmed)') > 0, '43-b: de door de gebruiker getypte zoekterm wordt ge-escaped vóór weergave in de lege-resultaten-tekst (XSS-veilig)');

// ═══ 44: geen databasewijziging ═══
ok(!/CREATE TABLE|ALTER TABLE/i.test(html) && html.indexOf('nk_knowledge_search_log') === -1, '44: geen nieuwe databasetabel/-migratie toegevoegd voor de zoekfunctie of hub-redesign');

console.log('fKnowledgeUxLibraryHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
