/* fContextContract.test.js — MS-F3-06 regressietest.
 *
 * A. Bevestigt de kernbevinding blijft waar: ContextEngineCore blijft puur/berekent
 *    niets, en buildCtx() delegeert aan canonieke calculaties zonder zelf te
 *    herberekenen.
 * B. Bevestigt de cruciale AI-grens-instructietekst rond het Live Coach-blok blijft
 *    exact aanwezig (geen stille verzwakking van "wijzig het advies niet").
 * C. Structurele registry-tests voor CONTEXT_CONTRACT.md.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ContextEngineCore = require(path.join(ROOT, 'core/contextEngine.js'));
const contractText = fs.readFileSync(path.join(ROOT, 'docs/CONTEXT_CONTRACT.md'), 'utf8');

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

// ---- A1. ContextEngineCore berekent niets (functioneel bewezen, niet alleen beweerd) ----
{
  const merged = ContextEngineCore.mergeAthleteContexts([
    { sport: { id: 'crossfit' } },
    { sport: { id: 'running' } },
    { sport: { id: 'crossfit' } } // duplicaat, telt niet dubbel
  ]);
  ok(merged.activeSports.length === 2, 'mergeAthleteContexts telt/dedupliceert alleen sport-ID\'s, berekent geen belasting of som');
  ok(merged.contextCount === 3, 'contextCount is een simpele telling van de invoerlijst, geen berekening');
  ok(ContextEngineCore.normalizeMembership(null) === null, 'normalizeMembership(null) blijft null (personal-only, geen fabricage)');
  ok(ContextEngineCore.buildStructuredContext({}).athlete.id === null,
    'buildStructuredContext vult een ontbrekend athleteId niet met een default, blijft null');
}

// ---- A2. buildCtx() delegeert aan canonieke calculaties, herberekent niets lokaal ----
{
  const body = extractFunctionBody(html, 'buildCtx');
  ok(body !== null, 'buildCtx() wordt gevonden');
  if (body) {
    ok(/hrvDagFactorPersonal\(/.test(body), 'buildCtx() gebruikt de canonieke hrvDagFactorPersonal() i.p.v. zelf een HRV-factor te berekenen');
    ok(/TrainingLoadCore\.classifyAcwr\(/.test(body), 'buildCtx() gebruikt de canonieke TrainingLoadCore.classifyAcwr() i.p.v. een eigen ACWR-classificatie');
    ok(/TrainingLoadCore\.corroboratedLoadSignal\(/.test(body), 'buildCtx() gebruikt de canonieke corroboratieregel, geen eigen "hoge belasting"-logica');
  }
}

// ---- B. AI-grens-instructietekst blijft exact aanwezig ----
ok(html.includes("wijzig het advies of het getal niet, vul ontbrekende gegevens niet in en beschrijf geen"),
  'De cruciale AI-grens-instructie bij het Live Coach-contextblok blijft exact aanwezig -- geen stille verzwakking');
ok(html.includes("reeds besloten door de Decision Engine — niet herberekenen"),
  'Het Live Coach-blok blijft expliciet labelen dat de AI niet mag herberekenen');

// ---- C. Registry-structuur ----
ok(contractText.includes('## Context Field Inventory'), 'CONTEXT_CONTRACT.md bevat de verplichte Context Field Inventory');
ok(contractText.includes('## Context Engine berekent niets'), 'CONTEXT_CONTRACT.md bevat de expliciete "berekent niets"-bevestiging');
ok(contractText.includes('## No fabricated context'), 'CONTEXT_CONTRACT.md bevat de expliciete "geen fabricage"-bevestiging');
ok(contractText.includes('GAP-P2-014'), 'CONTEXT_CONTRACT.md registreert de ContextEngineCore-dode-code-bevinding als gap, verzwijgt het niet');

console.log('fContextContract: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
