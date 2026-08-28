/* fRecoveryRegistry.test.js — MS-F3-03 regressietest.
 *
 * Structurele registry-tests voor CALC-REC-001..004 in docs/CALCULATION_REGISTRY.md, plus
 * gerichte functionele tests voor de bestaande (index.html-only) HRV-functiegroep -- deze
 * functies leven niet in core/, dus worden hier via bracket-matching geëxtraheerd en met
 * new Function() geëvalueerd om hun daadwerkelijke gedrag te bewijzen (niet alleen
 * string-search), consistent met de eerdere F2-testpatronen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const registryText = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function extractFunctionBody(source, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) return null;
  const braceStart = source.indexOf('{', m.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return null;
}

// ---- A. lnRmssd: puur, correct wiskundig gedrag ----
{
  const body = extractFunctionBody(html, 'lnRmssd');
  ok(body !== null, 'lnRmssd() wordt gevonden');
  if (body) {
    // eslint-disable-next-line no-new-func
    const lnRmssd = new Function('v', body.slice(1, -1));
    ok(Math.abs(lnRmssd(50) - Math.log(50)) < 1e-9, 'lnRmssd(50) === Math.log(50) (correcte transformatie)');
    ok(lnRmssd(0) === null, 'lnRmssd(0) -> null (geen log van nul/negatief, geen fabricage)');
    ok(lnRmssd(-5) === null, 'lnRmssd(-5) -> null');
    ok(lnRmssd('abc') === null, 'lnRmssd(niet-numeriek) -> null');
  }
}

// ---- B. HRV-baseline-constanten: bevestig dat de gedocumenteerde minimums ook echt gelden ----
{
  ok(html.includes('HRV_BASELINE_MIN_DAYS = 14'), 'HRV_BASELINE_MIN_DAYS is 14 (matcht de registry-documentatie)');
  ok(html.includes('HRV_BASELINE_MIN_N = 4'), 'HRV_BASELINE_MIN_N is 4');
  ok(html.includes('HRV_SWC_MULTIPLIER = 0.5'), 'HRV_SWC_MULTIPLIER is 0.5 (Plews et al. SWC-aanpak)');
  const baselineBody = extractFunctionBody(html, 'hrvBaseline');
  ok(baselineBody && /if\(days < HRV_BASELINE_MIN_DAYS \|\| n < HRV_BASELINE_MIN_N\)/.test(baselineBody),
    'hrvBaseline() weigert een claim ("ready") vóór de minimumdrempels zijn gehaald');
}

// ---- C. Registry-structuur ----
const items = registryText.split(/(?=^### CALC-REC-)/m).filter(s => s.startsWith('### CALC-REC-'));
ok(items.length === 4, 'exact 4 CALC-REC-items gevonden (001 t/m 004)');

const REQUIRED_FIELDS = ['Domain', 'Name', 'Version', 'Formula', 'Implementation', 'Evidence level', 'Limitations', 'Forbidden interpretations'];
items.forEach(item => {
  const idMatch = item.match(/### (CALC-REC-\d+)/);
  const id = idMatch ? idMatch[1] : '???';
  REQUIRED_FIELDS.forEach(f => {
    ok(new RegExp('\\|\\s*' + f + '\\s*\\|').test(item), id + ' bevat het verplichte registry-veld "' + f + '"');
  });
});

// ---- D. Evidence-inflatie-detectie (claim-specifiek, niet functie-breed) ----
{
  const hrv = items.find(i => i.startsWith('### CALC-REC-001'));
  ok(hrv && /Evidence level \| \*\*B\*\*/.test(hrv), 'CALC-REC-001 (HRV-baseline) is B, wetenschappelijk goed onderbouwd maar niet overclaimd naar A');

  const dagfactor = items.find(i => i.startsWith('### CALC-REC-002'));
  ok(dagfactor && /Evidence level \| \*\*C\*\*/.test(dagfactor),
    'CALC-REC-002 (dagfactor-compositie) is C, NIET hoger dan zijn zwakste schakel (de multiplicatieve combinatie zelf is productontwerp)');

  const score = items.find(i => i.startsWith('### CALC-REC-003'));
  ok(score && /Evidence level \| \*\*D\*\*/.test(score),
    'CALC-REC-003 (Recovery Score) is D — de samengestelde gewichtsverdeling is expliciet een product heuristic, geen evidence-inflatie ondanks goed-onderbouwde componenten');

  const rhr = items.find(i => i.startsWith('### CALC-REC-004'));
  ok(rhr && /Evidence level \| \*\*C\*\*/.test(rhr), 'CALC-REC-004 (RHR-delta) is C, niet hoger');
}

// ---- E. HRV-guardrail expliciet vastgelegd ----
{
  const hrv = items.find(i => i.startsWith('### CALC-REC-001'));
  ok(hrv && /overtraining/.test(hrv) && /medische/.test(hrv) && /rustdag/.test(hrv),
    'CALC-REC-001 legt expliciet de HRV-guardrail vast (geen overtraining-diagnose, medische claim, of verplichte rustdag)');
}

// ---- F. Claim-specifieke evidence binnen dezelfde functiegroep (SWC vs "ernstige daling") ----
{
  ok(html.includes("HRV_SEVERE_DROP_PCT = 0.15") && html.includes('athletedata.health'),
    'De HRV_SEVERE_DROP_PCT-drempel citeert zijn eigen (zwakkere) bron in het bestaande code-commentaar, apart van de sterkere SWC-bron -- claim-specifieke evidence, geen functie-brede aanname');
}

console.log('fRecoveryRegistry: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
