/* F1.12 CardioCore delegation patcher — CRLF-safe, asserted. utf8. */
const fs = require('fs');
const FILE = process.argv[2] || 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
const CRLF = '\r\n';
let ops = 0;

function balancedFrom(openIdx) {
  let d = 0, j = openIdx;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return j;
}
function replaceConstObj(name, replLines) {
  const m = new RegExp('const\\s+' + name + '\\s*=\\s*\\{').exec(src);
  if (!m) throw new Error('CONST OBJ NOT FOUND: ' + name);
  const open = src.indexOf('{', m.index);
  const end = balancedFrom(open);
  // consume trailing ';' if present
  let tail = end; if (src[tail] === ';') tail++;
  const block = src.slice(m.index, tail);
  if (src.split(block).length - 1 !== 1) throw new Error('CONST OBJ NOT UNIQUE: ' + name);
  src = src.replace(block, replLines.join(CRLF));
  ops++; console.log('  ✓ const ' + name);
}
function replaceFn(name, repl) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('FN NOT FOUND: ' + name);
  const open = src.indexOf('{', m.index);
  const end = balancedFrom(open);
  const block = src.slice(m.index, end);
  if (src.split(block).length - 1 !== 1) throw new Error('FN NOT UNIQUE: ' + name);
  src = src.replace(block, repl);
  ops++; console.log('  ✓ fn ' + name);
}

replaceConstObj('CardioEngine', [
  'const CardioEngine = { /* F1.12: canonical shared CardioCore (cardio_time/split/power .v1) */',
  '  parseTime(str){ return CardioCore.parseTime(str); },',
  '  formatTime(sec){ return CardioCore.formatTime(sec); },',
  '  splitFromDistTime(dist,timeSec,basis){ return CardioCore.splitFromDistTime(dist,timeSec,basis); },',
  '  timeFromDistSplit(dist,splitSec,basis){ return CardioCore.timeFromDistSplit(dist,splitSec,basis); },',
  '  distFromTimeSplit(timeSec,splitSec,basis){ return CardioCore.distFromTimeSplit(timeSec,splitSec,basis); },',
  '  wattFromSplit500(splitSec){ return CardioCore.wattFromSplit500(splitSec); },',
  '  splitFromWatt500(watt){ return CardioCore.splitFromWatt500(watt); },',
  '  autoSplits(totalTimeSec,totalDist,splitDist){ return CardioCore.autoSplits(totalTimeSec,totalDist,splitDist); },',
  '  fromManualSplits(splitSecMap){ return CardioCore.fromManualSplits(splitSecMap); }',
  '};'
]);
replaceFn('parseTimeToSec', 'function parseTimeToSec(str){ return CardioCore.parseTime(str); } /* F1.12: canonical CardioCore (cardio_time.v1) */');

// script-include na core/decision.js
const inc = '<script src="core/decision.js"></script>';
if (src.split(inc).length - 1 !== 1) throw new Error('decision include niet uniek/gevonden');
src = src.replace(inc, inc + CRLF + '<script src="core/cardio.js"></script>');
ops++; console.log('  ✓ include core/cardio.js');

fs.writeFileSync(FILE, src, 'utf8');
console.log('TOTAL OPS: ' + ops + ' (expected 3)');
if (ops !== 3) { console.error('ASSERT FAIL'); process.exit(1); }
