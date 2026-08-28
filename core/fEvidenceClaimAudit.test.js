/* fEvidenceClaimAudit.test.js — MS-F3-09 regressietest.
 *
 * Machine-reproduceerbare Evidence-telling over alle CALC-items (docs/CALCULATION_
 * REGISTRY.md) en alle Decision Rules (docs/DECISION_RULE_REGISTRY.md). Bewaakt
 * expliciet dat geen enkele bestaande product heuristic stilzwijgend naar A/B kan
 * opschuiven, dat NOT_IMPLEMENTED-items nooit als geverifieerde implementatie
 * gelezen kunnen worden, en dat de MS-F3-09-heraudit van Epley/Brzycki daadwerkelijk
 * de formule-specifieke bronnen bevat (geen citation laundering).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const calcText = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8');
const decText = fs.readFileSync(path.join(ROOT, 'docs/DECISION_RULE_REGISTRY.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Reproduceerbare evidence-telling over alle CALC-items ----
function countCalcEvidence(text) {
  const items = text.split(/(?=^### CALC-)/m).filter(s => s.startsWith('### CALC-'));
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, NOT_IMPLEMENTED: 0, GEEN_EVIDENCE_VELD: 0, total: items.length };
  items.forEach(it => {
    const isNotImpl = /NIET GEÏMPLEMENTEERD|NOT_IMPLEMENTED/.test(it);
    const ev = it.match(/Evidence level \| \*\*([A-E])\*\*/);
    if (isNotImpl) counts.NOT_IMPLEMENTED++;
    else if (ev) counts[ev[1]]++;
    else counts.GEEN_EVIDENCE_VELD++;
  });
  return counts;
}
const calcCounts = countCalcEvidence(calcText);
ok(calcCounts.total === 23, 'exact 23 CALC-items geregistreerd (reproduceerbare telling, niet handmatig)');
ok(calcCounts.A === 1, 'exact 1 CALC-item met evidence A');
ok(calcCounts.B === 4, 'exact 4 CALC-items met evidence B (Epley/Brzycki/Foster-sRPE/HRV-baseline)');
ok(calcCounts.C === 4, 'exact 4 CALC-items met evidence C');
ok(calcCounts.D === 1, 'exact 1 CALC-item met evidence D (Recovery Score)');
ok(calcCounts.E === 7, 'exact 7 CALC-items met evidence E');
ok(calcCounts.NOT_IMPLEMENTED === 3, 'exact 3 CALC-items expliciet NOT_IMPLEMENTED (CS/CP, TRIMP/decoupling/zones, BMR/RMR/TDEE)');

// ---- B. Decision Rules: geen enkele stiekem A/B ----
const decRows = decText.match(/^\| (DEC-[A-Z0-9-]+) \|.*\|$/gm) || [];
ok(decRows.length === 9, 'exact 9 Decision Rules geregistreerd');
decRows.forEach(row => {
  const idMatch = row.match(/DEC-[A-Z0-9-]+/);
  ok(!/\|\s*\*\*A\*\*\s*\(/.test(row) && !/\|\s*\*\*B\*\*\s*\(/.test(row),
    (idMatch ? idMatch[0] : row) + ' is geen A/B in de Decision Rule Registry (product heuristics blijven correct gelabeld)');
});

// ---- C. Epley/Brzycki-heraudit: formule-specifieke bronnen daadwerkelijk aanwezig (geen citation laundering) ----
{
  const epley = calcText.split(/(?=^### CALC-STR-001)/m)[1].split(/(?=^### CALC-STR-002)/m)[0];
  ok(/LeSuer/.test(epley), 'CALC-STR-001 citeert de formule-specifieke validatiestudie (LeSuer et al. 1997), niet alleen een algemene review');
  ok(/oorspronkelijk NIET uit een peer-reviewed onderzoek/.test(epley),
    'CALC-STR-001 erkent expliciet dat de Epley-formule zelf niet uit peer-reviewed onderzoek komt (geen overclaim van de bron)');

  const brzycki = calcText.split(/(?=^### CALC-STR-002)/m)[1].split(/(?=^### CALC-STR-003)/m)[0];
  ok(/Journal of Physical Education, Recreation & Dance/.test(brzycki),
    'CALC-STR-002 citeert de exacte, formule-specifieke oorspronkelijke Brzycki-publicatie');
}

// ---- D. NOT_IMPLEMENTED-items kunnen nooit als VERIFIED/geïmplementeerd gelezen worden ----
{
  const csCp = calcText.split(/(?=^### CALC-END-004)/m)[1].split(/(?=^### CALC-END-005)/m)[0];
  ok(!/Status \| \*\*VERIFIED\*\*/.test(csCp), 'CALC-END-004 (CS/CP) is nooit gelabeld als VERIFIED implementatie');
}

console.log('fEvidenceClaimAudit: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
