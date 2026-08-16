/* Sprint 5 (15-08) — Pace/tijd NL-komma + subseconde-nauwkeurigheid.
 * Bug: parseTime("1:52,425") deed parseFloat("52,425")=52 → komma-decimaal + ms verloren (→112 i.p.v. 112.425).
 * Fix (index-only wrappers, geen core-wijziging): komma→punt vóór CardioCore.parseTime.
 * Deze test extraheert de ECHTE wrapper parseTimeToSec uit index.html en draait die tegen CardioCore.
 * Draai: node core/fPacePrecision.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CardioCore = require('./cardio.js');

function extractFn(name){
  const st = html.indexOf('function ' + name + '(');
  if (st < 0) throw new Error('functie niet gevonden: ' + name);
  let d = 0, e = -1;
  for (let j = html.indexOf('{', st); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') d++; else if (ch === '}'){ d--; if (d === 0){ e = j; break; } }
  }
  return html.slice(st, e + 1);
}
const parseTimeToSec = eval('(' + extractFn('parseTimeToSec') + ')');

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function near(a, b, m){ if (Math.abs(a-b) < 1e-6) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ~' + b + ', kreeg ' + a + ')'); } }

// ── KERN: NL-komma + subseconde ──
near(parseTimeToSec('1:52,425'), 112.425, '"1:52,425" → 112.425 (komma + ms behouden, NOOIT 112)');
eq(parseTimeToSec('1:52,425') !== 112 && parseTimeToSec('1:52,425') !== 112.0 || parseTimeToSec('1:52,425') === 112.425, true, '"1:52,425" wordt niet afgekapt op 112');
near(parseTimeToSec('1:52.425'), 112.425, '"1:52.425" (punt) → 112.425');
near(parseTimeToSec('1:52,4'), 112.4, '"1:52,4" → 112.4');
near(parseTimeToSec('73,5'), 73.5, 'los getal "73,5" → 73.5 (komma)');

// ── Non-komma cases ongewijzigd (regressie tegen bestaande cardio.test) ──
eq(parseTimeToSec('8:20'), 500, '"8:20" → 500 (ongewijzigd)');
eq(parseTimeToSec('500'), 500, '"500" → 500 s (geen minuten)');
eq(parseTimeToSec('2:03'), 123, '"2:03" → 123');
eq(parseTimeToSec(''), null, 'leeg → null');
eq(parseTimeToSec('abc'), null, 'ongeldig → null');
eq(parseTimeToSec('1:02:03'), 3723, '"1:02:03" → 3723');

// ── CardioCore zelf blijft onaangeroerd (komma is nog steeds "legacy" daar; normalisatie zit in de wrapper) ──
eq(CardioCore.parseTime('8:20'), 500, 'CardioCore ongewijzigd: "8:20" → 500');

console.log('\nPace-precisie: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
