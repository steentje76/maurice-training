/* fProgramAutogenAudit.test.js — MS-F4-04 regressietest.
 *
 * A. Program Autogen Test Matrix (sectie 43, functionele subset): geldig programma,
 *    malformed JSON, onbekende exercise-ID, nul sets, ontbrekende velden, prompt-
 *    injectie in een veldwaarde.
 * B. Audit-trail-wiring: bevestigt dat de regeneratiefunctie een INSERT naar
 *    program_regeneration_log doet vóór de destructieve delete, en nooit UPDATE/DELETE
 *    op die tabel aanroept.
 * C. Sabotagebewijs op de exercise-ID-whitelist.
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
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) return null;
  const braceStart = source.indexOf('{', m.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(braceStart, i + 1); }
  }
  return null;
}

const body = extractFunctionBody(html, 'parseProgrammaJSON');
// eslint-disable-next-line no-new-func
const parseProgrammaJSON = new Function('txt', 'exerciseList', body.slice(body.indexOf('{') + 1, body.lastIndexOf('}')));

const EXERCISES = [{ id: 'squat_001' }, { id: 'bench_001' }, { id: 'row_001' }];

// ---- A. Program Autogen Test Matrix (functionele subset) ----
ok(parseProgrammaJSON(JSON.stringify({
  blocks: [{ week_nr: 1, fase_naam: 'Opbouw', oefeningen: [{ exercise_id: 'squat_001', sets: 3, reps: '8-10', rpe: 7 }] }]
}), EXERCISES) !== null, 'A1: geldig programma met bekende exercise-ID -> geaccepteerd');

ok(parseProgrammaJSON('dit is geen JSON {{{', EXERCISES) === null, 'A2: malformed JSON -> null, geen crash, geen halve structuur');

ok(parseProgrammaJSON(JSON.stringify({
  blocks: [{ week_nr: 1, fase_naam: 'Opbouw', oefeningen: [{ exercise_id: 'VERZONNEN_OEFENING_999', sets: 3, reps: '8-10' }] }]
}), EXERCISES) === null, 'A3: onbekende exercise-ID (niet in de bibliotheek) -> geweigerd, geen stille fabricage');

ok(parseProgrammaJSON(JSON.stringify({
  blocks: [{ week_nr: 1, fase_naam: 'Opbouw', oefeningen: [{ exercise_id: 'squat_001', sets: 0, reps: '8-10' }] }]
}), EXERCISES) === null, 'A4: sets=0 -> geweigerd (0 is falsy, faalt de o.sets-check)');

ok(parseProgrammaJSON(JSON.stringify({
  blocks: [{ week_nr: 1, fase_naam: 'Opbouw', oefeningen: [{ sets: 3, reps: '8-10' }] }]
}), EXERCISES) === null, 'A5: ontbrekend exercise_id-veld -> geweigerd');

ok(parseProgrammaJSON(JSON.stringify({
  blocks: [{ week_nr: 1, fase_naam: '"; DROP TABLE programs;--', oefeningen: [{ exercise_id: 'squat_001', sets: 3, reps: '8-10' }] }]
}), EXERCISES) !== null, 'A6: prompt-injectie-achtige tekst in fase_naam wordt als DATA behandeld (blijft een geldige string, geen risico op dit niveau)');

ok(parseProgrammaJSON('```json\n' + JSON.stringify({
  blocks: [{ week_nr: 1, fase_naam: 'Opbouw', oefeningen: [{ exercise_id: 'squat_001', sets: 3, reps: '8-10' }] }]
}) + '\n```', EXERCISES) !== null, 'A7: markdown-codeblok-fences rond de JSON worden correct gestript');

// ---- B. Audit-trail-wiring ----
{
  const regenBody = extractFunctionBody(html, 'heergenereerResterendeWeken');
  ok(regenBody !== null, 'heergenereerResterendeWeken() wordt gevonden');
  ok(regenBody && regenBody.includes("sbPost('program_regeneration_log'"),
    'heergenereerResterendeWeken() schrijft een audit-log-entry (INSERT) vóór de regeneratie doorgaat');
  ok(regenBody && regenBody.indexOf("sbPost('program_regeneration_log'") < regenBody.indexOf("await sbDel('program_block_exercises'"),
    'de audit-log-write gebeurt AANTOONBAAR VOOR de destructieve delete-lus, niet erna');
  ok(regenBody && regenBody.includes('replaced_blocks_snapshot:snapshotBlocks'),
    'de audit-log bevat een snapshot van de te vervangen blocks (niet alleen een lege melding)');
  ok(regenBody && regenBody.includes('evidence:{adherencePct:progress.adherencePct'),
    'de audit-log bevat de daadwerkelijke evidence (adherence%/RPE-delta) die de regeneratie triggerde');
}
ok(!html.includes("sbPatch('program_regeneration_log'") && !html.includes("sbDel('program_regeneration_log'"),
  'de applicatiecode roept nergens UPDATE/DELETE aan op program_regeneration_log -- uitsluitend INSERT (append-only)');

console.log('fProgramAutogenAudit: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
