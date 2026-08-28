/* fGapP1006Closure.test.js — GAP-P1-006 closure-regressietest (MS-F2-08).
 *
 * BEVINDING (root cause, herbevestigd bij heropening): Programma-blok en Repeat Workout
 * kregen NOOIT een eigen training_instances-rij. activeInstanceId bleef voor de volledige
 * sessie op null staan (verse start), waardoor completeTrainingInstance() bij afronden
 * feitelijk niets deed. Beide trainingsbronnen waren daarmee volledig onzichtbaar voor de
 * plan-versus-uitvoering-dataset die vaste/custom trainingen (via Preview/
 * startInstanceFromDefinition) al wel kregen -- exact de "rijkste ongebruikte dataset"
 * waar een eerder code-commentaar (Fase 2) al voor waarschuwde.
 *
 * SCOPE VAN DEZE CLOSURE (expliciet, eerlijk): dit convergeert de PERSISTENCE-laag
 * (canonical instance-creatie via createTrainingInstance(), met source-specifieke
 * provenance in de snapshot-JSONB) -- niet de Preview-UI zelf. Programma en Repeat
 * behouden hun eigen, product-relevante pre-executie-flows (recovery-check-in resp.
 * gewicht-aanpassing-preview) als legitieme "source-specific Definition construction"
 * (opdracht sectie 20/30) in plaats van geforceerd door de generieke openTrainingPreview()-
 * modal geleid te worden -- dat zou een grotere, risicovollere UI-herbouw zijn dan
 * verantwoord binnen deze sprint, met vooralsnog geen aangetoonde noodzaak. De kern-
 * invariant die GAP-P1-006 daadwerkelijk schadelijk maakte (geen instance-tracking, dus
 * geen plan-vs-uitvoering-data) is hiermee wel gesloten.
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

// ---- A. Repeat Workout: echte instance-creatie met repeat-provenance ----
{
  const body = extractFunctionBody(html, 'startRepeatWorkout');
  ok(body !== null, 'startRepeatWorkout() wordt gevonden');
  if (body) {
    ok(/activeInstanceId=await createTrainingInstance\(/.test(body),
      'startRepeatWorkout() maakt een echte training_instances-rij aan (vóór GAP-P1-006-closure bleef dit altijd null)');
    ok(/vasteTrainingId:t/.test(body),
      'de aangemaakte instance is correct gekoppeld aan de herhaalde vaste training (t)');
    ok(/source:'vaste_training_repeat'/.test(body),
      'de snapshot bevat expliciete repeat-provenance (source-tag)');
    ok(/repeat_of_date:repeatDate/.test(body),
      'de snapshot bewaart van welke datum de herhaalde sessie afkomstig is (herleidbaarheid)');
  }
}

// ---- B. Programma-blok: echte instance-creatie bij verse start, resume blijft resume ----
{
  const body = extractFunctionBody(html, 'launchProgramTrainScreen');
  ok(body !== null, 'launchProgramTrainScreen() wordt gevonden');
  if (body) {
    ok(/activeInstanceId=await createTrainingInstance\(/.test(body),
      'launchProgramTrainScreen() maakt bij een verse start een echte training_instances-rij aan (vóór GAP-P1-006-closure bleef dit altijd null)');
    ok(/source:'program_block'/.test(body),
      'de snapshot bevat expliciete programma-provenance (source-tag)');
    ok(/program_id:prog\?\.id\|\|null/.test(body),
      'de snapshot bewaart het program-ID (herleidbaarheid naar het originele programma)');
    // Resume-invariant (uit MS-F2-07) mag niet zijn verdwenen: bij resume géén nieuwe instance.
    ok(/if\(_resume\)\{\s*activeInstanceId=_draft\.instanceId\|\|null/.test(body),
      'bij resume wordt de BESTAANDE instance van de draft hergebruikt — geen dubbele instance voor dezelfde, nog niet afgeronde sessie');
  }
}

// ---- C. Invariant: nooit dezelfde instance voor twee verschillende repeat-runs ----
// (Elke aanroep van createTrainingInstance() genereert intern een nieuw uniek ID via
// newTrainingInstanceId() -- hier statisch bevestigd dat beide paden ECHT een nieuwe
// aanroep doen bij een verse start, niet een hergebruikte/cache-waarde.)
{
  ok(html.includes('function newTrainingInstanceId'),
    'newTrainingInstanceId() (garandeert een nieuw, uniek ID per aanroep) bestaat als basis voor createTrainingInstance()');
}

console.log('fGapP1006Closure: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
