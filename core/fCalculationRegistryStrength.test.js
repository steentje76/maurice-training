/* fCalculationRegistryStrength.test.js — MS-F3-01 regressietest.
 *
 * Doel: bewijst dat elk CALC-STR-*-item in docs/CALCULATION_REGISTRY.md de vereiste
 * registry-velden bevat (Master Roadmap 2.0 v1.1 §7), en dat de geciteerde implementatie
 * daadwerkelijk bestaat en getest is in core/calculation.js. Geen evidence-inflatie:
 * bevestigt expliciet dat CALC-STR-004/005 NIET als A/B geclassificeerd zijn.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const registryText = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8');
const calcCode = fs.readFileSync(path.join(ROOT, 'core/calculation.js'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// Splits de registry op per CALC-STR-item.
const items = registryText.split(/(?=^### CALC-STR-)/m).filter(s => s.startsWith('### CALC-STR-'));
ok(items.length === 5, 'exact 5 CALC-STR-items gevonden (001 t/m 005)');

const REQUIRED_FIELDS = [
  'Domain', 'Name', 'Version', 'Formula', 'Implementation', 'Evidence level',
  'Limitations', 'Forbidden interpretations', 'AI permissions'
];

items.forEach(item => {
  const idMatch = item.match(/### (CALC-STR-\d+)/);
  const id = idMatch ? idMatch[1] : '???';
  REQUIRED_FIELDS.forEach(f => {
    ok(new RegExp('\\|\\s*' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\|').test(item),
      id + ' bevat het verplichte registry-veld "' + f + '"');
  });

  // Implementation-referentie moet daadwerkelijk in calculation.js bestaan.
  const implMatch = item.match(/`(\w+)`\/`?(\w+)`?\s*$/m) || item.match(/— `(\w+)`/);
  // Robuustere check: elke functienaam genoemd na "Implementation" moet in calcCode voorkomen.
  const implLine = (item.match(/\|\s*Implementation\s*\|([^\n]*)\|/) || [])[1] || '';
  const fnNames = (implLine.match(/`(\w+)`/g) || []).map(s => s.replace(/`/g, ''));
  fnNames.filter(n => n !== 'calculation.js').forEach(fn => {
    ok(calcCode.includes('function ' + fn), id + ': geciteerde implementatie "' + fn + '()" bestaat daadwerkelijk in core/calculation.js');
  });
});

// Evidence-inflatie-check: CALC-STR-004 (warmup-heuristiek) en 005 (RPE-multiplier)
// mogen NOOIT als A of B geclassificeerd zijn (opdracht sectie 43: C/D/E is beter dan
// een onterechte A/B).
{
  const warmup = items.find(i => i.startsWith('### CALC-STR-004'));
  const recovery = items.find(i => i.startsWith('### CALC-STR-005'));
  ok(warmup && /Evidence level \| \*\*E\*\*/.test(warmup),
    'CALC-STR-004 (warmup-heuristiek) is correct als E geclassificeerd, geen evidence-inflatie naar A/B');
  ok(recovery && /Evidence level \| \*\*C\*\*/.test(recovery),
    'CALC-STR-005 (RPE-multiplier) is correct als C geclassificeerd, geen evidence-inflatie naar A/B');
}

// Geen calculation krijgt evidence A zonder een concrete, citeerbare bron.
items.forEach(item => {
  const idMatch = item.match(/### (CALC-STR-\d+)/);
  const id = idMatch ? idMatch[1] : '???';
  if (/Evidence level \| \*\*A\*\*/.test(item)) {
    ok(/Scientific sources \|[^\n]{20,}/.test(item), id + ': evidence-niveau A heeft een concrete, niet-lege bronvermelding');
  }
});

console.log('fCalculationRegistryStrength: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
