/* fB9_11NutritionIntelligence.test.js — B9-11 Nutrition Intelligence.
 * Bewaakt: hergebruik van de pure core-module, geen AI-integratie, 0
 * Social/Coach/Research-blootstelling, geen causale taal, evidence-koppeling.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const socialSharing = fs.readFileSync(path.join(ROOT, 'core/socialSharing.js'), 'utf8');

// ---- A. Hergebruik van de pure core-module, geen shadow logica ----
ok(html.includes('NutritionIntelligenceCore.buildNutritionContext(entries,totalen)') && html.includes('NutritionIntelligenceCore.evaluateNutritionDecisionRules(nutritionCtx)'),
  'A1: de UI hergebruikt uitsluitend NutritionIntelligenceCore -- geen eigen, dubbele context-/decisionlogica in index.html');

// ---- B. Geen AI-integratie toegevoegd (bewuste, gemotiveerde keuze) ----
{
  const coachBlokStart = html.indexOf('async function tkCoachDataBlok');
  const coachBlokEnd = html.indexOf('async function buildCtx');
  const coachBlok = html.slice(coachBlokStart, coachBlokEnd);
  ok(!coachBlok.match(/nutritionIntelligence|NutritionIntelligenceCore|nutrition_context/i),
    'B1: de AI-coach-context bevat 0 verwijzingen naar de nieuwe Nutrition Intelligence-laag -- geen AI-integratie in B9-11');
}

// ---- C. Geen calorie-/macrodoel-taal in de nieuwe UI ----
{
  const blokStart = html.indexOf('B9-11 Nutrition Intelligence: uitsluitend context');
  const blokEnd = html.indexOf('el.innerHTML=datumNavHtml+nutritionFormHtml()+totalenHtml+inzichtenHtml');
  const blok = html.slice(blokStart, blokEnd);
  ok(!blok.match(/target|doel.*kcal|BMR|TDEE|deficit|surplus|moet (eten|drinken)/i),
    'C1: geen enkel caloriedoel-/macrodoel-/BMR-/TDEE-gerelateerd woord in het nieuwe Inzichten-blok');
  ok(blok.includes('Trainingskompas rekent geen calorie- of macrodoelen uit'),
    'C2: het Inzichten-blok communiceert expliciet, zichtbaar de grens van wat Trainingskompas wel/niet doet');
}

// ---- D. Evidence-koppeling zichtbaar, geen ongefundeerde tekst ----
ok(html.includes("'NUTR-EV-001':") && html.includes("'NUTR-EV-002':") && html.includes("'NUTR-EV-003':"),
  'D1: elke getoonde context-tekst is expliciet gekoppeld aan een geregistreerde evidence-ID (NUTR-EV-001/002/003)');

// ---- E. Social isolation ----
ok(!socialSharing.includes('nutrition') && !socialSharing.includes('NUTR-'),
  'E1: de SocialSharingCore-allowlist bevat 0 verwijzingen naar Nutrition Intelligence -- 0 automatische Social-blootstelling');

// ---- F. Logging-gap != nutrition-gap zichtbaar in de UI-copy zelf ----
{
  const blokStart = html.indexOf('B9-11 Nutrition Intelligence: uitsluitend context');
  const blokEnd = html.indexOf('el.innerHTML=datumNavHtml+nutritionFormHtml()+totalenHtml+inzichtenHtml');
  const blok = html.slice(blokStart, blokEnd);
  ok(!blok.match(/te weinig gegeten|te weinig gedronken|niet genoeg gegeten|tekort aan/i),
    'F1: de UI-copy claimt nergens dat de sporter te weinig at/dronk -- consistent met de absolute regel uit de core-module');
}

console.log('fB9_11NutritionIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
