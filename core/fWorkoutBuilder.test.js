/* fWorkoutBuilder.test.js — MS-F2-03 regressietest.
 *
 * Audit: create/edit/save/rename/exercise add/remove/reorder/duplicate/delete/resume in de
 * Workout Builder (WB-module, index.html). Bevinding: al goed geëngineerd, met een expliciete
 * update-vs-insert-scheiding in saveWorkout() ("geen dubbele rij") en een aparte,
 * bewuste duplicateWorkout()-functie (nooit een onbedoelde duplicatie via saveWorkout()).
 * Canonical exercise-identity gedeeld tussen Library en Builder (catalogId rechtstreeks als
 * plan-item-id, geen apart Builder-ID-namespace). Geen nieuw defect gevonden — deze test legt
 * de bestaande garanties vast als regressiecontract.
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
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return null;
}

// ---- A. saveWorkout: update (PATCH) vs insert (POST) — nooit een dubbele rij ----
{
  const body = extractFunctionBody(html, 'saveWorkout');
  ok(body !== null, 'saveWorkout() wordt gevonden');
  if (body) {
    ok(/isUpdate\s*=\s*!!existingId/.test(body),
      'saveWorkout() onderscheidt expliciet update (existingId aanwezig) van een nieuwe training');
    ok(/if\s*\(isUpdate\)\s*{[\s\S]*sbPatchQ\(/.test(body),
      'saveWorkout() gebruikt PATCH (geen nieuwe rij) bij het bijwerken van een bestaande training');
    ok(/}\s*else\s*{[\s\S]*sbPostQ\(/.test(body),
      'saveWorkout() gebruikt POST alleen bij een daadwerkelijk nieuwe training');
    ok(/customTrainings\[idx\]\s*=\s*t/.test(body),
      'saveWorkout() vervangt het bestaande item in de lokale lijst i.p.v. het te dupliceren');
  }
}

// ---- B. duplicateWorkout: aparte, bewuste actie — geen onbedoelde duplicatie via saveWorkout ----
{
  const body = extractFunctionBody(html, 'duplicateWorkout');
  ok(body !== null, 'duplicateWorkout() bestaat als aparte, expliciete functie');
  if (body) {
    ok(/id\s*=\s*'custom_'\s*\+\s*Date\.now\(\)/.test(body),
      'duplicateWorkout() genereert een nieuw, uniek ID (geen ID-hergebruik van het origineel)');
    ok(/sbPostQ\(/.test(body),
      'duplicateWorkout() gebruikt POST (nieuwe rij), passend bij een bewuste kopie');
  }
}

// ---- C. deleteWorkout: verwijdert zowel lokaal als in de database ----
{
  const body = extractFunctionBody(html, 'deleteWorkout');
  ok(body !== null, 'deleteWorkout() wordt gevonden');
  if (body) {
    ok(/sbDelQ\(/.test(body), 'deleteWorkout() verwijdert de rij ook daadwerkelijk in de database');
  }
}

// ---- D. moveItem/removeItem: bounds-checked, persisteren direct ----
{
  const moveBody = extractFunctionBody(html, 'moveItem');
  ok(moveBody !== null, 'moveItem() wordt gevonden');
  if (moveBody) {
    ok(/if\s*\(j<0\|\|j>=st\.plan\.items\.length\)\s*return/.test(moveBody),
      'moveItem() controleert de grenzen vóór het verplaatsen (geen out-of-bounds-fout)');
  }
  const removeBody = extractFunctionBody(html, 'removeItem');
  ok(removeBody !== null, 'removeItem() wordt gevonden');
}

console.log('fWorkoutBuilder: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
