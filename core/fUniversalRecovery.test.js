/* P1 (16-08) — universele recovery: applySessionRecovery past de sessie-aanpassing DETERMINISTISCH op
 * KOPIEËN van het voorschrift toe (vaste + overige routes via getSessionExs), nooit op de config, en
 * idempotent (herhaald toepassen op de basis compound niet). Extraheert de ECHTE functie uit index.html.
 * Draai: node core/fUniversalRecovery.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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
// stubs: cardio-detectie op type==='rowing'/'cardio'; sessie-aanpassing
let sessionRxAdj = {};
function resolveCardioType(ex){ return (ex && (ex.type==='rowing'||ex.type==='cardio')) ? ex.type : null; }
const applySessionRecovery = eval('(' + extractFn('applySessionRecovery') + ')');
const rhrBaselineDelta = eval('(' + extractFn('rhrBaselineDelta') + ')');
// Guided recovery: gewichtsfactor (working_weight.v1-ratio) + plan-aanpassing
const CalcCore = require('./calculation.js');
function roundKg(v){ return Math.round(v*2)/2; }
const recoveryWeightFactor = eval('(' + extractFn('recoveryWeightFactor') + ')');
const applyRecoveryToGuidedPlan = eval('(' + extractFn('applyRecoveryToGuidedPlan') + ')');

let pass = 0, fail = 0;
function eq(a, b, m){ if (a === b) pass++; else { fail++; console.log('  ✗ ' + m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); } }
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

const cfg = [
  {id:'bench', type:'strength', sets:4, rpe:'8'},
  {id:'squat', type:'strength', sets:3, rpe:'7'},
  {id:'roeien', type:'rowing'},
];

// ── geen aanpassing gezet → lijst ongewijzigd (zelfde referentie) ──
sessionRxAdj = {};
eq(applySessionRecovery('A', cfg), cfg, 'geen adj → zelfde lijst terug (geen kopie nodig)');

// ── laag herstel: -1 set, RPE -0.5 → op KOPIEËN ──
sessionRxAdj = { A: { setsDelta:-1, rpeDelta:-0.5 } };
let out = applySessionRecovery('A', cfg);
eq(out[0].sets, 3, 'bench 4→3 sets (−1)');
eq(out[0].rpe, '7.5', 'bench RPE 8→7.5 (−0.5)');
eq(out[1].sets, 2, 'squat 3→2 sets');
eq(out[1].rpe, '6.5', 'squat RPE 7→6.5');
eq(out[2].type, 'rowing', 'roeien blijft cardio (geen sets/RPE-aanpassing)');
ok(out[2].sets === undefined, 'cardio krijgt geen sets');

// ── config NIET gemuteerd (kopieën) ──
eq(cfg[0].sets, 4, 'config bench.sets ongewijzigd (4)');
eq(cfg[0].rpe, '8', 'config bench.rpe ongewijzigd (8)');
ok(out[0] !== cfg[0], 'output is een KOPIE, niet dezelfde referentie');

// ── IDEMPOTENT: opnieuw toepassen op de BASIS geeft identiek resultaat (geen 4→3→2) ──
let out2 = applySessionRecovery('A', cfg);
eq(out2[0].sets, 3, 'herhaald op basis: bench nog steeds 3 (niet 2)');
eq(out2[1].sets, 2, 'herhaald op basis: squat nog steeds 2 (niet 1)');

// ── ondergrenzen: sets ≥1, RPE ≥5 ──
sessionRxAdj = { A: { setsDelta:-5, rpeDelta:-5 } };
out = applySessionRecovery('A', [{id:'x',type:'strength',sets:2,rpe:'7'}]);
eq(out[0].sets, 1, 'sets ondergrens 1 (2-5 → 1)');
eq(out[0].rpe, '5', 'RPE ondergrens 5 (7-5=2 → 5)');

// ── bovengrens RPE ≤10 bij positieve delta ──
sessionRxAdj = { A: { setsDelta:0, rpeDelta:+5 } };
out = applySessionRecovery('A', [{id:'x',type:'strength',sets:3,rpe:'8'}]);
eq(out[0].rpe, '10', 'RPE bovengrens 10 (8+5 → 10)');

// ── rhrBaselineDelta: vandaag t.o.v. baseline (gem. eerdere metingen); <2 → null (geen fabricage) ──
eq(rhrBaselineDelta([]), null, 'geen data → null');
eq(rhrBaselineDelta([{rhr:55}]), null, '1 meting → null (geen baseline)');
eq(rhrBaselineDelta([{rhr:60},{rhr:50},{rhr:50}]), 10, 'vandaag 60 vs baseline 50 → +10 (slechter)');
eq(rhrBaselineDelta([{rhr:48},{rhr:50},{rhr:52}]), -3, 'vandaag 48 vs baseline 51 → -3 (beter)');
eq(rhrBaselineDelta([{rhr:'60'},{rhr:'50'}]), 10, 'string-rhr wordt geparsed');
ok(rhrBaselineDelta([{rhr:0},{rhr:0}]) === null, 'ongeldige (0) rhr → genegeerd → null');

// ── GUIDED recovery: gewichtsfactor (working_weight.v1-ratio, oneRM-onafhankelijk) ──
eq(recoveryWeightFactor(8, 0), 1, 'rpeDelta 0 → factor exact 1 (geen aanpassing)');
eq(recoveryWeightFactor(8, undefined), 1, 'geen rpeDelta → factor 1');
ok(recoveryWeightFactor(8, -1) < 1, 'negatieve rpeDelta (lager herstel) → factor <1 (lichter)');
ok(recoveryWeightFactor(8, +1) > 1, 'positieve rpeDelta → factor >1 (zwaarder)');
eq(recoveryWeightFactor(8, -1), recoveryWeightFactor(8, -1), 'deterministisch (zelfde input → zelfde factor)');
ok(recoveryWeightFactor(8, -1) === recoveryWeightFactor('8', -1), 'reps als string → zelfde factor (geparsed)');

// ── GUIDED recovery: plan-aanpassing op KOPIEËN, idempotent ──
const gbase = { items:[
  {id:'a', sets:4, reps:8, weight:100},
  {id:'b', sets:3, reps:5, weight:80},
  {id:'c', sets:3, reps:10}, // geen gewicht (bodyweight) → alleen sets
]};
function cloneBase(){ return { items: gbase.items.map(x=>({...x})) }; }

// geen aanpassing → plan ongewijzigd teruggegeven
const gp0 = cloneBase();
const gr0 = applyRecoveryToGuidedPlan(gp0, {setsDelta:0, rpeDelta:0});
eq(gr0.items[0].sets, 4, 'geen adj → sets ongewijzigd');
eq(gr0.items[0].weight, 100, 'geen adj → gewicht ongewijzigd');
eq(applyRecoveryToGuidedPlan(cloneBase(), null).items[0].sets, 4, 'adj null → plan ongewijzigd');

// laag herstel: -1 set, RPE -0.5 → minder sets + lichter gewicht
const g1 = applyRecoveryToGuidedPlan(cloneBase(), {setsDelta:-1, rpeDelta:-0.5});
eq(g1.items[0].sets, 3, 'sets 4→3 (−1)');
eq(g1.items[1].sets, 2, 'sets 3→2 (−1)');
ok(g1.items[0].weight < 100, 'gewicht verlaagd bij lager herstel (a)');
ok(g1.items[1].weight < 80, 'gewicht verlaagd bij lager herstel (b)');
eq(g1.items[0]._rxAdjusted, true, 'gewicht gemarkeerd als aangepast');
eq(g1.items[2].sets, 2, 'bodyweight-item: sets 3→2');
ok(g1.items[2].weight === undefined, 'bodyweight-item krijgt geen verzonnen gewicht');

// sets-ondergrens 1
const g2 = applyRecoveryToGuidedPlan({items:[{id:'x', sets:2, reps:8, weight:50}]}, {setsDelta:-5, rpeDelta:0});
eq(g2.items[0].sets, 1, 'sets ondergrens 1 (2−5 → 1)');

// originele base NIET gemuteerd (kopieën)
eq(gbase.items[0].sets, 4, 'base item.sets ongewijzigd (kopie)');
eq(gbase.items[0].weight, 100, 'base item.weight ongewijzigd (kopie)');

// IDEMPOTENT: op verse basis-kopie opnieuw → identiek resultaat (geen 4→3→2)
const g3 = applyRecoveryToGuidedPlan(cloneBase(), {setsDelta:-1, rpeDelta:-0.5});
eq(g3.items[0].sets, g1.items[0].sets, 'idempotent: sets identiek bij herhaald op basis');
eq(g3.items[0].weight, g1.items[0].weight, 'idempotent: gewicht identiek bij herhaald op basis');

console.log('\nUniversele recovery: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
