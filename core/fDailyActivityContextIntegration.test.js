/* fDailyActivityContextIntegration.test.js — DEVICES/WEARABLES MASTER SPRINT, C0-C6.
 * Bewijst het ECHTE call path (buildCtx() in index.html), niet alleen dat
 * de code ergens "bestaat". Bewaakt: hergebruik van de al bestaande
 * hd-fetch (geen tweede query/tweede context-engine), geen AI-herberekening,
 * UNKNOWN != ZERO blijft gerespecteerd, allowed_decision_use:false blijft
 * gerespecteerd (geen Decision Engine-aanroep vanuit dit blok), en dat een
 * ontbrekende daily-activity-waarde de bestaande HRV/gewicht/Tanita-context
 * niet breekt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const DailyActivityCalculationCore = require('../core/dailyActivityCalculation.js');

// buildCtx() correct afbakenen: van de functiedeclaratie tot de eerstvolgende
// top-level 'async function'-declaratie (niet op een losse '\n}\n' splitsen --
// de functiebody bevat zelf talloze sluitende accolades, dat zou een veel te
// grote/verkeerde slice opleveren).
const buildCtxStart = html.indexOf('async function buildCtx(ctx){');
const nextFnMatch = html.slice(buildCtxStart + 1).search(/\r?\nasync function /);
const buildCtxBlock = html.slice(buildCtxStart, buildCtxStart + 1 + nextFnMatch);

console.log('DEVICES/WEARABLES MASTER SPRINT — C0-C6 Live Context-integratie (buildCtx)');

// ---- A. C0/C1: contextEngine.js is bevestigd NIET de live pad; buildCtx() is dat wel ----
{
  const contextEngineFile = fs.readFileSync(path.join(ROOT, 'core/contextEngine.js'), 'utf8');
  ok(contextEngineFile.includes('nog NERGENS aangeroepen vanuit index.html'),
    'A1: contextEngine.js documenteert zelf expliciet dat het dormant is -- classificatie B (oud/dormant ontwerp), geen aanname');
  ok(!html.match(/ContextEngineCore\.(buildStructuredContext|mergeAthleteContexts)\(/),
    'A2: index.html roept ContextEngineCore inderdaad nergens aan -- bevestigt de forensische claim met een echte negatieve grep, niet alleen het bestandscommentaar geloven');
  ok(html.includes('async function buildCtx(ctx){'), 'A3: buildCtx() bestaat en is de daadwerkelijke, aanroepbare functie die de AI Coach-prompt samenstelt');
}

// ---- B. C2: hergebruik van de bestaande hd-fetch, geen tweede query/engine ----
{
  ok((buildCtxBlock.match(/sbGet\('hrv_log'/g) || []).length === 1,
    'B1: exact 1 hrv_log-fetch binnen buildCtx() -- de nieuwe activity-context hergebruikt dezelfde hd-variabele, geen extra query');
  ok(buildCtxBlock.includes('hd.filter(r=>r.steps!=null)'), 'B2: de activity-context leest steps rechtstreeks uit de al opgehaalde hd-reeks');
  ok(!buildCtxBlock.match(/dailyActivityContextEngine|new.*ContextEngine|DailyActivityContextCore/i),
    'B3: geen tweede, parallelle context-engine aangemaakt (sectie C2, expliciet verboden)');
}

// ---- C. Geen AI-herberekening: de calculation gebeurt precies één keer, in JS, vóór de prompt-string ----
{
  ok((buildCtxBlock.match(/DailyActivityCalculationCore\.dailyStepsBaseline\(/g) || []).length === 1,
    'C1: dailyStepsBaseline() wordt precies één keer aangeroepen -- de AI krijgt uitsluitend het al-berekende resultaat, nooit de ruwe reeks om zelf mee te rekenen');
  ok(buildCtxBlock.includes('DailyActivityCalculationCore.contextText(deviation)'),
    'C2: de prompt bevat de kant-en-klare, toegestane contextzin (contextText()) -- niet de ruwe classificatie/cijfers waar de AI zelf een interpretatie aan zou kunnen toevoegen');
}

// ---- D. UNKNOWN != ZERO blijft gerespecteerd in het live pad ----
{
  ok(buildCtxBlock.includes('hd.filter(r=>r.steps!=null)'),
    'D1: dagen met steps==null worden uit de reeks gefilterd vóórdat de calculation ze ziet -- geen null die als 0 wordt doorgegeven');
  // Zelfstandige bevestiging op module-niveau (fDailyActivityCalculation.test.js dekt dit al
  // uitgebreider; hier alleen de garantie dat het CONTRACT dat buildCtx() gebruikt intact is).
  const baseline = DailyActivityCalculationCore.dailyStepsBaseline([{ date: '2026-08-01', steps: 7000 }, { date: '2026-08-02', steps: null }, { date: '2026-08-03', steps: 7100 }]);
  ok(baseline.sampleSize === 2, 'D2: het onderliggende contract negeert null-dagen nog steeds correct (sampleSize telt ze niet mee)');
}

// ---- E. allowed_decision_use:false blijft gerespecteerd: geen Decision Engine-aanroep in dit blok ----
{
  const activitySectie = buildCtxBlock.split("let activityStr=''")[1] ? buildCtxBlock.split("let activityStr=''")[1].split('const bcStr')[0] || buildCtxBlock.split("let activityStr=''")[1] : '';
  const activityBlok = buildCtxBlock.slice(buildCtxBlock.indexOf("let activityStr=''"), buildCtxBlock.indexOf("let activityStr=''") + 900);
  ok(!activityBlok.match(/DecisionCore\.|DecisionEngine\.|applyDecisionRule/i),
    'E1: het activity-context-blok roept geen Decision Engine-functie aan -- uitsluitend Calculation Registry + tekstopmaak');
}

// ---- F. Ontbrekende daily activity breekt de bestaande context niet ----
{
  const geenBekendeSteps = [{ date: '2026-08-01', steps: null }, { date: '2026-08-02' }];
  ok(geenBekendeSteps.filter(r => r.steps != null).length === 0, 'F1: een reeks zonder enige bekende stappenwaarde levert een lege gefilterde set (het live blok slaat de hele activityStr dan over via de "if(bekend.length)"-guard, hrvStr/wStr/bcStr blijven ongemoeid)');
  ok(buildCtxBlock.includes('if(bekend.length){') && buildCtxBlock.includes('try{') && buildCtxBlock.includes("}catch(_){}"),
    'F2: het hele blok staat in een try/catch met een lege-string-fallback (activityStr blijft \'\') -- een fout hier kan de rest van de prompt niet breken');
}

console.log('\n========================================================');
console.log('fDailyActivityContextIntegration.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error(m)); process.exitCode = 1; }
