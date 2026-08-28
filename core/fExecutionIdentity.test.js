/* fExecutionIdentity.test.js — MS-F2-01 regressietest.
 *
 * Bevinding: van de 4 functies die een trainingsuitvoering starten (startT,
 * startCustomTraining, startRepeatWorkout, launchProgramTrainScreen) resetten
 * er maar 2 (startT, startCustomTraining) de globale `activeInstanceId` expliciet
 * vóórdat een nieuwe sessie begint. `guardExistingDraft()` — door alle 4 aangeroepen
 * bij een botsende training — wist alleen de localStorage-draft, nooit deze
 * in-memory variabele.
 *
 * Concreet risico (data-misattributie, geen dataverlies): start training A (echte
 * Preview-flow, activeInstanceId=X) → onderbreek zonder af te ronden (geen
 * confirmLeave/finish, dus activeInstanceId blijft X in het geheugen) → start in
 * dezelfde sessie een Repeat Workout of Programmatraining → zonder reset worden de
 * NIEUW gelogde sets aan X (training A) gekoppeld i.p.v. aan de daadwerkelijk actieve
 * training, en wordt bij het afronden de VERKEERDE training_instances-rij completed.
 *
 * STATISCHE CONTRACT-CHECK: extraheert elke functiebody (bracket-matching, robuust
 * tegen de bestandsgrootte van index.html) en controleert dat `activeInstanceId`
 * ergens vroeg in de body een expliciete waarde krijgt (null, of een bewuste
 * draft-restore) — nooit stilzwijgend de oude waarde behoudt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// Extraheert de body van "async function NAME(...) { ... }" of "function NAME(...) { ... }"
// via bracket-matching (robuust, want index.html heeft geen kant-en-klare AST-tooling).
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

const RESETS_INSTANCE_ID = /activeInstanceId\s*=\s*(null|draft\.instanceId|_draft\.instanceId|_resume\?)/;

[
  'startT',
  'startCustomTraining',
  'startRepeatWorkout',
  'launchProgramTrainScreen'
].forEach(fnName => {
  const body = extractFunctionBody(html, fnName);
  ok(body !== null, fnName + '() wordt gevonden in index.html');
  if (body) {
    ok(RESETS_INSTANCE_ID.test(body),
      fnName + '() geeft activeInstanceId expliciet een waarde (null of bewuste draft-restore) — geen stilzwijgend hergebruik van een oude sessie-instance');
  }
});

// Regressiebescherming op de exacte MS-F2-01-fix: startRepeatWorkout had geen eigen
// resume-pad en moet daarom altijd onvoorwaardelijk "activeInstanceId=null" bevatten.
['startRepeatWorkout'].forEach(fnName => {
  const body = extractFunctionBody(html, fnName);
  if (body) {
    ok(/activeInstanceId\s*=\s*null/.test(body),
      fnName + '() bevat specifiek "activeInstanceId=null" (de MS-F2-01-fix, niet alleen een draft-restore-pad)');
  }
});
// launchProgramTrainScreen kreeg tijdens MS-F2-07 een eigen resume-pad (zie
// fProgramResume.test.js): "null bij een verse start, of de eigen draft-instanceId bij
// resume" is nu het juiste, sterkere contract — niet langer een kale, onvoorwaardelijke
// "activeInstanceId=null" (die het legitieme draft.instanceId niet meer zou onderscheiden
// van resume vs. vers). De algemene RESETS_INSTANCE_ID-check hierboven dekt dit al af.
{
  const body = extractFunctionBody(html, 'launchProgramTrainScreen');
  if (body) {
    ok(/activeInstanceId=_resume\?\(_draft\.instanceId\|\|null\):null/.test(body),
      'launchProgramTrainScreen() gebruikt het conditionele resume-contract (null bij verse start, eigen draft.instanceId bij resume) — nooit een vreemde/oude instance-ID');
  }
}

// MS-F2-01: bevroren-timer-defect bij custom trainingen (startTrainTimer('A') hardcoded,
// zocht altijd naar 'elapsed-a' i.p.v. het daadwerkelijke, zichtbare element).
{
  const body = extractFunctionBody(html, 'startCustomTraining');
  ok(body !== null, 'startCustomTraining() wordt gevonden voor de timer-check');
  if (body) {
    ok(/startTrainTimer\(\s*curT\s*\)/.test(body),
      'startCustomTraining() start de timer met de daadwerkelijke, actieve ctxT (curT), niet met een hardcoded losse waarde');
  }
  // Het DOM-element waar de timer naar schrijft moet exact dezelfde ctxT-conventie volgen
  // als vaste/programma-trainingen (elapsed-${ctxT.toLowerCase()}), niet een losse hardcoded ID.
  ok(html.includes('id="elapsed-${ctxT.toLowerCase()}">00:00</span>'),
    'het elapsed-tijd-element van een custom training gebruikt dezelfde ctxT-conventie als vaste/programma-trainingen');
}

console.log('fExecutionIdentity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);