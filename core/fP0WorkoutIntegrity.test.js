/* P0 (14-08) — Workout data-integriteit: NL-decimaal parsen + persistente workout-timer.
 * Extraheert de ECHTE functies uit index.html. Draai: node core/fP0WorkoutIntegrity.test.js
 * Kernregel: "73,5" mag NOOIT 73, 735 of 500 worden — altijd 73.5. En de timer moet bij
 * hervatten verder lopen vanaf de verstreken tijd (niet op 0).
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(name){
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}

// timer-globals + Date.now-stub (deterministisch)
let trainStart = null, pausedAccumMs = 0, trainPaused = false, pausedAt = 0;
let _NOW = 1000000000;
const _realNow = Date.now;
Date.now = () => _NOW;

eval([extractFn('numNL'), extractFn('normNumStr'), extractFn('currentWorkoutElapsedMs')].join('\n'));

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// ── numNL — de kritieke komma-bug ──
eq(numNL('73,5'), 73.5, 'numNL: "73,5" → 73.5');
eq(numNL('73.5'), 73.5, 'numNL: "73.5" → 73.5');
ok(numNL('73,5') !== 500 && numNL('73,5') !== 735 && numNL('73,5') !== 73, 'numNL: "73,5" is NOOIT 500/735/73');
eq(numNL('500'), 500, 'numNL: "500" → 500');
eq(numNL('72,5'), 72.5, 'numNL: "72,5" → 72.5');
eq(numNL('77,5'), 77.5, 'numNL: "77,5" → 77.5');
eq(numNL('140'), 140, 'numNL: "140" → 140');
eq(numNL(' 80 '), 80, 'numNL: witruimte getrimd');
ok(isNaN(numNL('abc')), 'numNL: "abc" → NaN');
ok(isNaN(numNL('')), 'numNL: "" → NaN');
ok(isNaN(numNL(null)), 'numNL: null → NaN');
ok(isNaN(numNL('12,')), 'numNL: "12," (geen decimaal) → NaN');
ok(isNaN(numNL('1.2.3')), 'numNL: "1.2.3" → NaN (geen stille foutwaarde)');
eq(numNL('-2.5'), -2.5, 'numNL: negatief met punt');

// ── normNumStr — opslag-normalisatie (komma→punt), ongeldig → leeg ──
eq(normNumStr('73,5'), '73.5', 'normNumStr: "73,5" → "73.5"');
eq(normNumStr('73.5'), '73.5', 'normNumStr: "73.5" → "73.5"');
eq(normNumStr('80'), '80', 'normNumStr: "80" → "80"');
eq(normNumStr(''), '', 'normNumStr: "" → ""');
eq(normNumStr('abc'), '', 'normNumStr: ongeldig → "" (geen foutieve opslag)');
// round-trip: opslag → parse levert exact 73.5
eq(numNL(normNumStr('73,5')), 73.5, 'round-trip: "73,5" opgeslagen → geparsed = 73.5');

// ── currentWorkoutElapsedMs — persistente timer ──
trainStart = _NOW - 125000; pausedAccumMs = 0; trainPaused = false; pausedAt = 0;
eq(currentWorkoutElapsedMs(), 125000, 'timer: 125s verstreken');
pausedAccumMs = 5000;
eq(currentWorkoutElapsedMs(), 120000, 'timer: pauze-tijd (5s) afgetrokken');
trainPaused = true; pausedAt = _NOW - 3000; pausedAccumMs = 0;
eq(currentWorkoutElapsedMs(), 122000, 'timer: huidige pauze (3s) meegeteld als niet-verstreken');
trainStart = null;
eq(currentWorkoutElapsedMs(), 0, 'timer: geen start → 0');
// resume-simulatie: trainStart = now - elapsed → elapsed blijft behouden (niet 0)
trainStart = _NOW - 90000; pausedAccumMs = 0; trainPaused = false; pausedAt = 0;
const saved = currentWorkoutElapsedMs();
eq(saved, 90000, 'timer: elapsed vóór "app sluiten" = 90s');
// na hervatten zet startT trainStart = Date.now()-savedElapsed → zelfde elapsed
trainStart = _NOW - saved;
eq(currentWorkoutElapsedMs(), 90000, 'timer: na hervatten loopt verder vanaf 90s (NIET 0)');

Date.now = _realNow;
console.log('\nP0 workout-integriteit: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
