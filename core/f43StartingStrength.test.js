/* F43 — Unit tests voor estimateStartingStrength (deterministische startgewichten).
 * De functie leeft in index.html; deze test EXTRAHEERT de echte functietekst en draait
 * die met de ECHTE CalcCore (core/calculation.js) + de ECHTE LIFT_NORMS uit index.html.
 * Draai: node core/f43StartingStrength.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CalcCore = require('./calculation.js'); // echte core (epley/oneRMRaw)

function extractFn(name){
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++;
    else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}
function extractConst(name){
  // pak "const LIFT_NORMS = { ... };" met balanced braces
  const start = html.indexOf('const ' + name + ' = {');
  if (start < 0) throw new Error('const niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++;
    else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1) + ';';
}

// scope-globals die de geëxtraheerde functies nodig hebben (module-scope, deelbaar via eval)
var LIFT_NORMS;
var estimateStartingStrength;
function epley1RMRaw(kg, reps){ return CalcCore.oneRMRaw(kg, reps); }
eval(
  extractConst('LIFT_NORMS').replace(/^const\s+LIFT_NORMS\s*=/, 'LIFT_NORMS =') + '\n' +
  extractFn('estimateStartingStrength').replace(/^function\s+estimateStartingStrength/, 'estimateStartingStrength = function')
);

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// referentiewaarde: epley 1RM van 100kg × 5 = 100*(1+5/30)=116.67 → round 117
const e100x5 = Math.round(CalcCore.oneRMRaw(100, 5));

// ── 1. Opgegeven lift → 1RM via CalcCore ──
(() => {
  const r = estimateStartingStrength([{ lift:'backsquat', weight:100, reps:5 }]);
  ok(!!r.provided.backsquat, 'provided bevat backsquat');
  eq(r.provided.backsquat.est1RM, e100x5, 'backsquat 1RM = epley(100,5)');
  eq(r.provided.backsquat.source, 'opgegeven', 'source = opgegeven');
  eq(r.provided.backsquat.confidence, 'Hoog', 'confidence = Hoog');
})();

// ── 2. Cross-lift-afleiding via LIFT_NORMS-ratio ──
(() => {
  const r = estimateStartingStrength([{ lift:'backsquat', weight:100, reps:5 }]);
  // bench afgeleid: norm bench(1.0)/backsquat(1.5) = 0.667 → est = round(117*0.667)=78
  ok(!!r.derived.bench, 'derived bevat bench');
  eq(r.derived.bench.fromLift, 'backsquat', 'bench afgeleid uit backsquat');
  eq(r.derived.bench.est1RM, Math.round(e100x5 * (1.0/1.5)), 'bench = squat1RM * (norm bench/norm squat)');
  eq(r.derived.bench.source, 'richtlijn', 'derived source = richtlijn');
  eq(r.derived.bench.confidence, 'Laag', 'derived confidence = Laag');
})();

// ── 3. Eigen opgave heeft voorrang boven afleiding ──
(() => {
  const r = estimateStartingStrength([
    { lift:'backsquat', weight:100, reps:5 },
    { lift:'bench', weight:80, reps:3 }
  ]);
  ok(!!r.provided.bench, 'bench nu provided (eigen opgave)');
  ok(!r.derived.bench, 'bench NIET meer in derived (opgave wint)');
  eq(r.provided.bench.est1RM, Math.round(CalcCore.oneRMRaw(80, 3)), 'bench 1RM = epley(80,3)');
})();

// ── 4. Meest-compound anker gekozen voor afleiding ──
(() => {
  // twee ankers: backsquat(1.5) en shoulderpress(0.65). frontsquat moet uit backsquat komen (hoogste norm).
  const r = estimateStartingStrength([
    { lift:'backsquat', weight:100, reps:1 },
    { lift:'shoulderpress', weight:40, reps:1 }
  ]);
  eq(r.derived.frontsquat.fromLift, 'backsquat', 'frontsquat afgeleid uit meest-compound anker (backsquat)');
})();

// ── 5. TK-alias voor squat wordt óók afgeleid (huidige squat-id) ──
(() => {
  const r = estimateStartingStrength([{ lift:'bench', weight:80, reps:1 }]);
  ok(!!r.derived['TK-000038'], 'TK-000038 (canonical squat) afgeleid → bruikbaar als exercise_id');
})();

// ── 6. Ongeldige/robuuste input ──
(() => {
  eq(Object.keys(estimateStartingStrength([]).provided).length, 0, 'lege input → geen provided');
  eq(Object.keys(estimateStartingStrength(null).provided).length, 0, 'null input → geen crash, geen provided');
  const r = estimateStartingStrength([
    { lift:'onbekende_lift', weight:100, reps:5 },   // niet in LIFT_NORMS → skip
    { lift:'bench', weight:0, reps:5 },              // gewicht 0 → skip
    { lift:'backsquat', weight:100, reps:99 },       // reps onrealistisch → skip
    { lift:'frontsquat', weight:120, reps:3 }        // geldig
  ]);
  eq(Object.keys(r.provided).length, 1, 'alleen de geldige lift wordt provided');
  ok(!!r.provided.frontsquat, 'frontsquat is de geldige provided');
})();

// ── 7. Determinisme: zelfde input → identieke output ──
(() => {
  const a = JSON.stringify(estimateStartingStrength([{ lift:'backsquat', weight:140, reps:2 }]));
  const b = JSON.stringify(estimateStartingStrength([{ lift:'backsquat', weight:140, reps:2 }]));
  ok(a === b, 'deterministisch: identieke output bij identieke input');
})();

console.log('\nF43 starting-strength: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
