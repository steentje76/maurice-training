/* fProgramResume.test.js — MS-F2-07 regressietest (data-verlies-fix).
 *
 * BEVINDING (P1, data-verlies-risico, gevonden tijdens de Home-resume-audit):
 * launchProgramTrainScreen() reset sessionLog/sessionExtra ALTIJD onvoorwaardelijk, zonder
 * ooit een bestaande, geldige draft voor DEZELFDE programmatraining te herstellen -- in
 * tegenstelling tot startT()/startCustomTraining(), die dit al correct deden. guardExistingDraft()
 * beschermt hier niet tegen: die vraagt alleen bevestiging bij een ANDERE training
 * (draft.t!==ctxT), niet wanneer het dezelfde training betreft. Gevolg vóór de fix: een
 * gebruiker die een programmatraining start, sets logt, de app sluit zonder af te ronden, en
 * later dezelfde programmatraining opnieuw opent, verloor stilzwijgend alle al gelogde sets.
 *
 * FIX: dezelfde resume-branch als startT/startCustomTraining toegevoegd.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

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

{
  const body = extractFunctionBody(html, 'launchProgramTrainScreen');
  ok(body !== null, 'launchProgramTrainScreen() wordt gevonden');
  if (body) {
    ok(/const _draft=restoreTrainingDraft\(\)/.test(body),
      'launchProgramTrainScreen() haalt een bestaande draft op vóór het resetten van de sessie');
    ok(/_draft\.t===ctxT/.test(body),
      'launchProgramTrainScreen() controleert of de draft bij DEZELFDE programmatraining hoort (ctxT-match)');
    ok(/draftHasData\(_draft\)/.test(body),
      'launchProgramTrainScreen() controleert of de draft daadwerkelijk gelogde data bevat vóór resume');
    ok(/if\s*\(_resume\)\s*{\s*sessionLog=_draft\.sessionLog\|\|{}/.test(body),
      'launchProgramTrainScreen() herstelt sessionLog uit de draft bij resume — geen onvoorwaardelijke reset meer');
    ok(/restoreSessionLogToDom\(ctxT\)/.test(body),
      'launchProgramTrainScreen() zet de herstelde sets ook daadwerkelijk terug in de DOM bij resume');
    ok(/trainStart=Date\.now\(\)-\(Number\(_draft\.elapsedMs\)\|\|0\)/.test(body),
      'launchProgramTrainScreen() laat de klok bij resume doorlopen vanaf de opgeslagen verstreken tijd, niet vanaf 0');
  }
}

console.log('fProgramResume: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
