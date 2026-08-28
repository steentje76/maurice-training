/* fExecutionReliability.test.js — MS-F2-02 regressietest.
 *
 * Doel: de execution-reliability-audit (timer/logging/resume/finish/discard/offline)
 * bevestigde dat de bestaande code al zeer zorgvuldig is gebouwd, met meerdere
 * historische bugfix-referenties (F0.7N, RC0, migratie v446, A1/A5). Er is GEEN nieuw
 * defect van dezelfde ernst als de twee MS-F2-01-vondsten aangetroffen. Deze test legt
 * de al-bestaande garanties vast als regressiecontract, zodat een toekomstige wijziging
 * ze niet stilzwijgend kan slopen.
 *
 * STATISCHE CONTRACT-CHECK (zelfde bracket-matching-aanpak als fExecutionIdentity.test.js
 * — index.html leent zich niet voor directe unit-tests door DOM-koppeling).
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

// ---- A. finishSession: dubbele-finish-bescherming + gegarandeerde reset ----
{
  const body = extractFunctionBody(html, 'finishSession');
  ok(body !== null, 'finishSession() wordt gevonden');
  if (body) {
    ok(/if\s*\(\s*finishSessionBezig\s*\)\s*return/.test(body),
      'finishSession() weigert een tweede, gelijktijdige aanroep (dubbele-tap-bescherming)');
    ok(/finally\s*{[\s\S]*finishSessionBezig\s*=\s*false/.test(body),
      'finishSession() reset de dubbele-tap-guard gegarandeerd via finally (ook bij een fout)');
    ok(/catch\s*\([^)]*\)\s*{[\s\S]*(toast|console\.warn)/.test(body),
      'finishSession() geeft zichtbare feedback bij een schrijffout (geen silent failure)');
  }
}

// ---- B. execLeaveDiscard: correcte state-cleanup bij verwerpen ----
{
  const body = extractFunctionBody(html, 'execLeaveDiscard');
  ok(body !== null, 'execLeaveDiscard() wordt gevonden');
  if (body) {
    ok(/confirmModal\(/.test(body),
      'execLeaveDiscard() vraagt expliciete bevestiging vóór onomkeerbaar verwerpen');
    ok(/activeInstanceId\s*=\s*null/.test(body),
      'execLeaveDiscard() reset activeInstanceId (geen stale instance na verwerpen)');
    ok(/clearTrainingDraft\(\)/.test(body),
      'execLeaveDiscard() ruimt de localStorage-draft op');
  }
}

// ---- C. persistTrainingDraft: fail-safe autosave (geen valse "opgeslagen"-status) ----
{
  const body = extractFunctionBody(html, 'persistTrainingDraft');
  ok(body !== null, 'persistTrainingDraft() wordt gevonden');
  if (body) {
    ok(/catch\s*\([^)]*\)\s*{\s*saveState\s*=\s*'dirty'/.test(body),
      'persistTrainingDraft() zet de status naar "dirty" bij een mislukte write — nooit stilzwijgend "saved" tonen bij falen');
  }
}

// ---- D. previewStartTraining: dubbele-tap-bescherming op de Start-knop ----
{
  const body = extractFunctionBody(html, 'previewStartTraining');
  ok(body !== null, 'previewStartTraining() wordt gevonden');
  if (body) {
    ok(/if\s*\(!previewCtx\s*\|\|\s*previewStarting\)\s*return/.test(body),
      'previewStartTraining() weigert een tweede, gelijktijdige aanroep (dubbele-tap op Start-knop)');
  }
}

console.log('fExecutionReliability: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
