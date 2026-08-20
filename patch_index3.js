/* F1.6/DataAccess extractie-patcher — CRLF-safe, asserted counts. read/write utf8. */
const fs = require('fs');
const FILE = process.argv[2] || 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
let ops = 0;
function replaceFn(name, repl) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(src);
  if (!m) throw new Error('FN NOT FOUND: ' + name);
  let i = src.indexOf('{', m.index), d = 0, j = i;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  const block = src.slice(m.index, j);
  if (src.split(block).length - 1 !== 1) throw new Error('FN NOT UNIQUE: ' + name);
  src = src.replace(block, repl);
  ops++;
  console.log('  ✓ fn ' + name);
}
// DataAccess-split: caller haalt data op; core rekent zuiver. `new Date()`-default + config blijven in de wrapper.
replaceFn('computeGoalProgress', 'function computeGoalProgress(g, currentVal){ return CalcCore.calculateGoalProgress(g, currentVal); } /* F1.6/DataAccess: canonical core (goal.v1) */');
replaceFn('weightedEst1RM', 'function weightedEst1RM(sessions, refDate){ return CalcCore.weightedOneRM(sessions, refDate?new Date(refDate):new Date(), RATIO_DECAY); } /* F1.6/DataAccess: canonical core (e1rm_weighted.v1) */');
fs.writeFileSync(FILE, src, 'utf8');
console.log('TOTAL OPS: ' + ops + ' (expected 2)');
if (ops !== 2) { console.error('ASSERT FAIL: op count'); process.exit(1); }
