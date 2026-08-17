/* F44/Phase1 + Phase13 — Starting Strength UI-contract.
 * Extraheert de ECHTE parser + compute-laag uit index.html en draait ze met de ECHTE
 * CalcCore + REFERENCE_LIFTS + LIFT_NORMS. Verifieert: deterministische parsing, VERSTREKT
 * vs GESCHAT, provided-only-persistence-contract (storeIds), deadlift-zonder-norm.
 * Draai: node core/f44StartingStrengthUI.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CalcCore = require('./calculation.js');

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
function extractDecl(name){
  const idx = html.indexOf('const ' + name + ' =');
  if (idx < 0) throw new Error('const niet gevonden: ' + name);
  let s = idx; while (html[s] !== '{' && html[s] !== '[') s++;
  const open = html[s], close = open === '{' ? '}' : ']';
  let depth = 0, end = -1;
  for (let j = s; j < html.length; j++){
    const ch = html[j];
    if (ch === open) depth++; else if (ch === close){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(idx, end + 1) + ';';
}

var LIFT_NORMS, REFERENCE_LIFTS, estimateStartingStrength, parseReferenceLifts, computeStartingStrength;
function epley1RMRaw(kg, reps){ return CalcCore.oneRMRaw(kg, reps); }
eval(
  extractDecl('LIFT_NORMS').replace(/^const\s+LIFT_NORMS\s*=/, 'LIFT_NORMS =') + '\n' +
  extractDecl('REFERENCE_LIFTS').replace(/^const\s+REFERENCE_LIFTS\s*=/, 'REFERENCE_LIFTS =') + '\n' +
  extractFn('estimateStartingStrength').replace(/^function\s+estimateStartingStrength/, 'estimateStartingStrength = function') + '\n' +
  extractFn('parseReferenceLifts').replace(/^function\s+parseReferenceLifts/, 'parseReferenceLifts = function') + '\n' +
  extractFn('computeStartingStrength').replace(/^function\s+computeStartingStrength/, 'computeStartingStrength = function')
);

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// ── 1. Parser: natuurlijke varianten ──
(() => {
  const p = parseReferenceLifts('Bench 80 voor 5\nSquat 100 x 5\nDeadlift 140x3');
  eq(p.length, 3, 'parser: 3 liften herkend');
  const b = p.find(x=>x.key==='bench'); eq(b && b.weight, 80, 'parser: bench 80'); eq(b && b.reps, 5, 'parser: bench 5 reps');
  const s = p.find(x=>x.key==='squat'); eq(s && s.weight, 100, 'parser: squat 100'); eq(s && s.reps, 5, 'parser: squat 5 reps');
  const d = p.find(x=>x.key==='deadlift'); eq(d && d.weight, 140, 'parser: deadlift 140'); eq(d && d.reps, 3, 'parser: deadlift 3 reps');
})();

// ── 2. Parser: alleen gewicht → 1RM (reps=1); Dutch synoniemen; komma-decimaal ──
(() => {
  const p = parseReferenceLifts('bankdrukken 82,5');
  eq(p.length, 1, 'parser: Dutch synoniem herkend');
  eq(p[0].key, 'bench', 'parser: bankdrukken → bench');
  eq(p[0].weight, 82.5, 'parser: komma-decimaal 82,5');
  eq(p[0].reps, 1, 'parser: alleen gewicht → reps 1 (1RM)');
})();

// ── 3. Parser: onbekende woorden geven niets (geen fuzzy) ──
(() => {
  eq(parseReferenceLifts('lunges 40 x 8').length, 0, 'parser: niet-referentielift → genegeerd (geen fuzzy)');
  eq(parseReferenceLifts('').length, 0, 'parser: lege string → leeg');
  eq(parseReferenceLifts(null).length, 0, 'parser: null → leeg, geen crash');
})();

// ── 4. compute: VERSTREKT + GESCHAT ──
(() => {
  const r = computeStartingStrength([{key:'squat', weight:100, reps:5}]);
  const sq = r.provided.find(p=>p.key==='squat');
  ok(!!sq, 'compute: squat provided');
  eq(sq.est1RM, Math.round(CalcCore.oneRMRaw(100,5)), 'compute: squat 1RM = epley(100,5)');
  eq(JSON.stringify(sq.storeIds), JSON.stringify(['backsquat','TK-000038']), 'compute: squat storeIds = legacy + TK');
  const benchDer = r.derived.find(d=>d.key==='bench');
  ok(!!benchDer, 'compute: bench derived (richtlijn) aanwezig');
  ok(r.derived.every(d=>d.key!=='squat'), 'compute: squat niet in derived (is provided)');
})();

// ── 5. compute: eigen opgave heeft voorrang boven afleiding ──
(() => {
  const r = computeStartingStrength([{key:'squat', weight:100, reps:1},{key:'bench', weight:80, reps:1}]);
  ok(r.provided.some(p=>p.key==='bench'), 'compute: bench nu provided');
  ok(!r.derived.some(d=>d.key==='bench'), 'compute: bench niet meer derived');
})();

// ── 6. compute: deadlift (geen LIFT_NORM) → VERSTREKT, nooit derived ──
(() => {
  const r = computeStartingStrength([{key:'deadlift', weight:140, reps:3}]);
  const dl = r.provided.find(p=>p.key==='deadlift');
  ok(!!dl, 'compute: deadlift provided (zonder norm, via epley)');
  eq(dl.est1RM, Math.round(CalcCore.oneRMRaw(140,3)), 'compute: deadlift 1RM = epley(140,3)');
  eq(JSON.stringify(dl.storeIds), JSON.stringify(['deadlift','TK-000024']), 'compute: deadlift storeIds');
  ok(!r.derived.some(d=>d.key==='deadlift'), 'compute: deadlift nooit in derived (geen norm)');
})();

// ── 7. Persistence-contract: alleen provided heeft storeIds; derived NOOIT opgeslagen ──
(() => {
  const r = computeStartingStrength([{key:'squat', weight:120, reps:3}]);
  ok(r.provided.every(p=>Array.isArray(p.storeIds) && p.storeIds.length), 'contract: elke provided heeft storeIds (persisteerbaar)');
  ok(r.derived.every(d=>!('storeIds' in d)), 'contract: derived heeft GEEN storeIds (nooit opslaan)');
})();

// ── 8. Determinisme + robuuste input ──
(() => {
  const a = JSON.stringify(computeStartingStrength([{key:'bench', weight:90, reps:2}]));
  const b = JSON.stringify(computeStartingStrength([{key:'bench', weight:90, reps:2}]));
  ok(a === b, 'deterministisch: identieke output');
  eq(computeStartingStrength([{key:'bench', weight:0, reps:5}]).provided.length, 0, 'robuust: gewicht 0 → geen provided');
  eq(computeStartingStrength([]).provided.length, 0, 'robuust: lege input → geen provided');
})();

console.log('\nF44 starting-strength UI: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
