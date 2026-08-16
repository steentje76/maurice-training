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

console.log('\nUniversele recovery: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
