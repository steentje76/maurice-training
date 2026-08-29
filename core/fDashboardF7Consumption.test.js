/* fDashboardF7Consumption.test.js — MS-F7-05 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const fnMatch = html.match(/async function renderF7Attention\(\)\{[\s\S]*?\n\}/);
const fnSrc = fnMatch ? fnMatch[0] : '';

// ---- A. Uitsluitend canonieke consumptie, geen shadow-calculatie ----
ok(fnSrc.length > 0, 'A0: renderF7Attention() bestaat in index.html');
ok(fnSrc.includes('PlateauDetectionCore.classify('), 'A1: gebruikt PlateauDetectionCore.classify() -- geen eigen plateau-logica');
ok(fnSrc.includes('AdherenceIntelligenceCore.aggregate('), 'A2: gebruikt AdherenceIntelligenceCore.aggregate() -- geen eigen adherence-formule');
ok(!/completed\.length\s*\/\s*\w+\.length/.test(fnSrc), 'A3: geen inline "completed/total"-percentageberekening (shadow adherence)');
ok(!/avgStep\s*[<>]=?\s*0\.\d/.test(fnSrc), 'A4: geen eigen, hardcoded plateau-stabiliteitsdrempel');
ok(!/state\s*===\s*['"]STAGNATION_CANDIDATE['"][\s\S]{0,60}plateau/i.test(fnSrc),
  'A5: STAGNATION_CANDIDATE wordt nergens als "plateau" gepresenteerd');

// ---- B. Container correct opgezet ----
ok(html.includes('id="home-f7-attention"'), 'B1: de nieuwe container home-f7-attention bestaat in de actieve Home-structuur');
ok(/el\.innerHTML\s*=\s*kaarten\.length\s*\?\s*kaarten\.join\(''\)\s*:\s*''/.test(fnSrc),
  'B2: bij geen kaarten (onvoldoende data) blijft de container leeg -- geen fabricage van content');

// ---- C. computeProgramProgress() (ouder, ander concept) blijft ongewijzigd ----
ok(html.includes("return {adherencePct:Math.round(completed.length/blocks.length*100),avgRpeDelta,doneCount:completed.length,total:blocks.length};"),
  'C1: de bestaande computeProgramProgress()-functie (programma-doorloop, ander concept dan F7-adherence) is ongewijzigd gebleven');

console.log('fDashboardF7Consumption: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
