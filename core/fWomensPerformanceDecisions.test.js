/* fWomensPerformanceDecisions.test.js — MS-F8-01 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cycleCoreSrc = fs.readFileSync(path.join(ROOT, 'core/cycle.js'), 'utf8');
const coachingSrc = fs.readFileSync(path.join(ROOT, 'core/coaching.js'), 'utf8');
const decisions = fs.readFileSync(path.join(ROOT, 'docs/MS-F8-01_WOMENS_PERFORMANCE_PRODUCT_DECISIONS.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. De drie DEFER-domeinen zijn niet stilzwijgend geimplementeerd ----
ok(!/contraceptie.*advies|contraceptie.*aanbeveling/i.test(html.replace(/data:image[^"]*/g, '')),
  'A1: geen contraceptie-advies-functionaliteit in de runtime');
ok(!/trimester.*belasting.*\d+%|trimester.*reductie.*\d+%/i.test(html),
  'A2: geen trimester-gebaseerde belastingsreductie-percentage in de runtime');
ok(!/menopauze.*leeftijd|leeftijd.*menopauze/i.test(html),
  'A3: geen leeftijd-naar-menopauze-aanname in de runtime');

// ---- B. De IMPLEMENT-domeinen (cycle/symptoms) behouden hun grenzen ----
ok(cycleCoreSrc.includes('nooit een verzonnen getal'),
  'B1: CycleCore blijft expliciet: onvoldoende data geeft null, nooit een gefabriceerd getal');
ok(!/hormoonspiegel|hormonen.*veroorzaakt/i.test(html),
  'B2: geen hormoon-causale claims in de runtime');
ok(!coachingSrc.includes('cyclus') && !coachingSrc.includes('cycle'),
  'B3: core/coaching.js bevat nog geen cyclus-referentie -- bevestigt dat AI-koppeling nog niet bestaat');

// ---- C. Alle vijf beslissingen zijn expliciet vastgelegd ----
['Beslissing 1: Cycle', 'Beslissing 2: Symptoms', 'Beslissing 3: Contraception',
 'Beslissing 4: Pregnancy / Postpartum', 'Beslissing 5: Perimenopause / Menopause / Pelvic Floor'
].forEach(function (kop) {
  ok(decisions.includes(kop), 'C: "' + kop + '" is vastgelegd');
});
ok((decisions.match(/IMPLEMENT \/ ARCHITECTURE ONLY \/ DEFER: DEFER --/g) || []).length === 3, 'C6: exact drie domeinen zijn DEFER');
ok((decisions.match(/: IMPLEMENT \(/g) || []).length === 2, 'C7: exact twee domeinen zijn IMPLEMENT');

console.log('fWomensPerformanceDecisions: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
