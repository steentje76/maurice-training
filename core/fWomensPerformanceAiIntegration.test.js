/* fWomensPerformanceAiIntegration.test.js — MS-F8-03 vervolgtest (AI-koppeling). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const fnMatch = html.match(/async function tkWomensPerformanceCoachContext\(\)\{[\s\S]*?\n\}/);
const fnSrc = fnMatch ? fnMatch[0] : '';

// ---- A. Functie bestaat en is aangeroepen ----
ok(fnSrc.length > 0, 'A0: tkWomensPerformanceCoachContext() bestaat');
ok(html.includes('tkWomensPerformanceCoachContext().catch('), 'A1: wordt aangeroepen binnen de Promise.all van buildCtx()');
ok(html.includes('womensCtxTekst') && /\$\{womensCtxTekst\?/.test(html), 'A2: het resultaat wordt daadwerkelijk in de AI-prompt-template opgenomen');

// ---- B. Expliciete, harde AI-grens direct naast de context ----
ok(/bereken zelf NOOIT cyclusdag\/fase\/hormonen/.test(html), 'B1: expliciet verbod op zelf cyclusdag/fase/hormonen berekenen');
ok(/leid nooit zwangerschap\/fertility af/.test(html), 'B2: expliciet verbod op zwangerschap/fertility-inferentie');
ok(/stel nooit een diagnose/.test(html), 'B3: expliciet verbod op diagnose');
ok(/pas nooit automatisch trainingsvolume\/-intensiteit aan/.test(html), 'B4: expliciet verbod op automatische trainingsaanpassing');

// ---- C. Geen hormoon-causale taal in de nieuwe functie ----
ok(!/hormoon.*veroorzaakt|veroorzaakt.*hormoon/i.test(fnSrc), 'C1: geen hormoon-causale taal in de functie');
ok(!/fertil|ovulatiekans|conceptiekans/i.test(fnSrc), 'C2: geen fertility-gerelateerde taal in de functie');

// ---- D. Uitsluitend canonieke consumptie ----
ok(fnSrc.includes('WomensPerformanceContextCore.build('), 'D1: gebruikt uitsluitend WomensPerformanceContextCore.build()');
ok(fnSrc.includes('CycleCore.cycleContext('), 'D2: gebruikt de bestaande, ongewijzigde CycleCore.cycleContext()');
ok(!/estimatedNextPeriod|averageCycleLength|cycleDay\(/.test(fnSrc), 'D3: herimplementeert geen cyclusberekeningslogica zelf');
ok(fnSrc.includes("if(!periodes||!periodes.length) return '';"), 'D4: retourneert lege string als er geen tracking-data is');

console.log('fWomensPerformanceAiIntegration: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
