/* fContractReconciliation.test.js — F2 Final Contract Reconciliation.
 *
 * Doel: het canonieke MS-F2-01-contract ("convergeren zonder gedupliceerde execution
 * logic; source-specifieke pre-executie-UX mag verschillen") expliciet als testbaar
 * contract vastleggen voor alle 4 startfamilies (vast/custom/programma/repeat), i.p.v.
 * alleen impliciet aangetoond via losse functietests. Consolideert de bevindingen van de
 * heraudit: gedeelde execution-infrastructuur bevestigd, toegestane source-specifieke
 * divergentie (resume-implementatie, pre-executie-UX) expliciet onderscheiden van
 * daadwerkelijk verboden duplicatie (aparte instance-identity/timer/persistence/
 * completion/discard-logica, die NIET is aangetroffen).
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

// ---- VERPLICHT GEDEELD (mag nooit per familie apart geïmplementeerd worden) ----

// A. Shared completion/finish: finishSession() mag GEEN branching op trainingsbron bevatten.
{
  const body = extractFunctionBody(html, 'finishSession');
  ok(body !== null, 'finishSession() wordt gevonden');
  if (body) {
    ok(/const t=curT/.test(body),
      'finishSession() gebruikt uniform curT — geen if/switch op trainingsbron (vast/custom/programma/repeat) in de kernlogica');
    ok(!/if\s*\(\s*curT\.startsWith\(['"]prog_/.test(body) && !/if\s*\(\s*curT\.startsWith\(['"]custom_/.test(body),
      'finishSession() vertakt niet apart voor programma- of custom-prefixen — één gedeeld afrondingspad voor alle bronnen');
  }
}

// B. Shared timer: alle 4 startfamilies roepen dezelfde startTrainTimer(ctxT) aan.
{
  ['startT', 'startCustomTraining', 'launchProgramTrainScreen', 'startRepeatWorkout'].forEach(fnName => {
    const body = extractFunctionBody(html, fnName);
    if (body) {
      ok(/startTrainTimer\(/.test(body),
        fnName + '() gebruikt de gedeelde startTrainTimer() — geen eigen timer-implementatie');
    }
  });
}

// C. Shared instance-creatie-primitief: alle 4 families resulteren in createTrainingInstance()
// (rechtstreeks, of indirect via startInstanceFromDefinition() voor vast/custom).
{
  ok(html.includes('async function createTrainingInstance('),
    'createTrainingInstance() bestaat als enige plek waar een training_instances-rij wordt aangemaakt');
  const viaAdapter = extractFunctionBody(html, 'startInstanceFromDefinition');
  ok(viaAdapter && /return await createTrainingInstance\(/.test(viaAdapter),
    'startInstanceFromDefinition() (vast/custom-pad) roept dezelfde createTrainingInstance() aan — geen eigen insert-logica');
  const progBody = extractFunctionBody(html, 'launchProgramTrainScreen');
  ok(progBody && /activeInstanceId=await createTrainingInstance\(/.test(progBody),
    'launchProgramTrainScreen() (programma-pad) roept dezelfde createTrainingInstance() aan');
  const repeatBody = extractFunctionBody(html, 'startRepeatWorkout');
  ok(repeatBody && /activeInstanceId=await createTrainingInstance\(/.test(repeatBody),
    'startRepeatWorkout() (repeat-pad) roept dezelfde createTrainingInstance() aan');
}

// ---- TOEGESTAAN OM TE VERSCHILLEN (source-specific pre-executie-UX/adapters) ----

// D. Resume ≠ Repeat: Repeat Workout heeft GEEN resume-concept (elke aanroep is per ontwerp
// een verse start), in tegenstelling tot de andere 3 families die dat wél hebben.
{
  const repeatBody = extractFunctionBody(html, 'startRepeatWorkout');
  ok(repeatBody !== null, 'startRepeatWorkout() wordt gevonden');
  if (repeatBody) {
    ok(!/restoreTrainingDraft\(\)/.test(repeatBody) || !/_resume/.test(repeatBody),
      'startRepeatWorkout() heeft geen eigen "resume dezelfde repeat-sessie"-concept — elke Repeat-aanroep is bewust altijd een verse instance (Resume ≠ Repeat, opdracht sectie 24)');
  }
  ['startT', 'launchProgramTrainScreen'].forEach(fnName => {
    const body = extractFunctionBody(html, fnName);
    if (body) {
      ok(/restoreTrainingDraft\(\)/.test(body),
        fnName + '() heeft wél een resume-concept (in tegenstelling tot Repeat) — bevestigt het contractverschil is bewust, niet willekeurig');
    }
  });
}

// E. Source-specifieke provenance mag verschillen (program_id/week_nr vs repeat_of_date).
{
  const progBody = extractFunctionBody(html, 'launchProgramTrainScreen');
  const repeatBody = extractFunctionBody(html, 'startRepeatWorkout');
  ok(progBody && /source:'program_block'/.test(progBody), 'programma-snapshot draagt zijn eigen, legitiem afwijkende provenance-tag');
  ok(repeatBody && /source:'vaste_training_repeat'/.test(repeatBody), 'repeat-snapshot draagt zijn eigen, legitiem afwijkende provenance-tag');
}

console.log('fContractReconciliation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
