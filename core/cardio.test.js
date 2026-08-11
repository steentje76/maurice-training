/* TrainingKompas — Cardio Core test suite (node, standalone).
 * Draai: node core/cardio.test.js   (oracle: TK_INDEX of ../index.html)
 * Bewijst: golden, edge, determinisme, purity, expliciete units, en LEGACY === CANONICAL. */
const fs = require('fs');
const path = require('path');
const CardioCore = require('./cardio.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const near = (a, b, m) => { if (Math.abs(a - b) > 1e-9) throw new Error((m || '') + ' verwacht ~' + b + ', kreeg ' + a); };

// ---- Legacy uit de echte index.html extraheren ----
const IDX = fs.readFileSync(process.env.TK_INDEX || path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(IDX);
  if (!m) throw new Error('legacy fn ' + name + ' niet gevonden');
  let i = IDX.indexOf('{', m.index), d = 0, j = i;
  for (; j < IDX.length; j++) { const c = IDX[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return IDX.slice(m.index, j);
}
function extractCardioEngine() {
  const m = /const\s+CardioEngine\s*=\s*\{/.exec(IDX);
  if (!m) throw new Error('legacy CardioEngine niet gevonden');
  let i = IDX.indexOf('{', m.index), d = 0, j = i;
  for (; j < IDX.length; j++) { const c = IDX[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return 'const CardioEngine = ' + IDX.slice(i, j) + ';';
}
const legacy = new Function(
  extractFn('parseTimeToSec') + '\n' + extractCardioEngine() +
  '\n return { parseTimeToSec, CardioEngine };'
)();
const LE = legacy.CardioEngine;
const J = a => JSON.stringify(a);

// ================= A. cardio_time.v1 — parse/format =================
console.log('\n[A] parseTime + formatTime (cardio_time.v1)');
const parseCases = [null, '', '0', '8:20', '1:02:03', '90', '2:03', 'abc', '  7:30  ', '500', '0:00', '00:45', '1:2:3', '12.5'];
T('old===new: parseTime === legacy parseTimeToSec', () => parseCases.forEach(s => eq(CardioCore.parseTime(s), legacy.parseTimeToSec(s), 'parseTime('+String(s)+')')));
T('old===new: parseTime === legacy CardioEngine.parseTime', () => parseCases.forEach(s => eq(CardioCore.parseTime(s), LE.parseTime(s), 'parse('+String(s)+')')));
const fmtCases = [null, NaN, -5, 0, 45, 60, 90, 125, 500, 3600, 3661, 7325, 8.4, 8.6, 599];
T('old===new: formatTime === legacy CardioEngine.formatTime', () => fmtCases.forEach(s => eq(CardioCore.formatTime(s), LE.formatTime(s), 'fmt('+String(s)+')')));
T('ankers: parseTime("8:20")=500; formatTime(500)="8:20"; formatTime(3661)="1:01:01"', () => {
  eq(CardioCore.parseTime('8:20'), 500); eq(CardioCore.formatTime(500), '8:20'); eq(CardioCore.formatTime(3661), '1:01:01');
});
T('UNIT: 500 s ≠ 500 min — parseTime("500")=500 s (geen minuten)', () => { eq(CardioCore.parseTime('500'), 500); ok(CardioCore.parseTime('500') !== 500 * 60); });

// ================= B. cardio_split.v1 — split/dist/time =================
console.log('\n[B] split/dist/time conversies (cardio_split.v1)');
const splitCases = [[1000,200,500],[2000,492,500],[500,120,500],[0,200,500],[1000,0,500],[1000,200,1000],[400,90,100]];
T('old===new: splitFromDistTime', () => splitCases.forEach(([d,t,b]) => eq(CardioCore.splitFromDistTime(d,t,b), LE.splitFromDistTime(d,t,b), 'split('+d+','+t+','+b+')')));
T('old===new: timeFromDistSplit', () => splitCases.forEach(([d,t,b]) => eq(CardioCore.timeFromDistSplit(d,t,b), LE.timeFromDistSplit(d,t,b))));
T('old===new: distFromTimeSplit', () => splitCases.forEach(([d,t,b]) => eq(CardioCore.distFromTimeSplit(d,t,b), LE.distFromTimeSplit(d,t,b))));
T('anker: 2000 m in 8:12 (492 s) → split /500m = 123 s (2:03)', () => { const sp=CardioCore.splitFromDistTime(2000,492,500); near(sp,123); eq(CardioCore.formatTime(sp),'2:03'); });
T('null-guard: 0 dist of 0 time → null', () => { eq(CardioCore.splitFromDistTime(0,200,500),null); eq(CardioCore.splitFromDistTime(1000,0,500),null); });
T('UNIT: basis 500m ≠ 1000m geeft andere split', () => ok(CardioCore.splitFromDistTime(1000,200,500) !== CardioCore.splitFromDistTime(1000,200,1000)));
T('round-trip: dist→split→time→dist consistent', () => {
  const b=500, d=2000, t=492; const sp=CardioCore.splitFromDistTime(d,t,b);
  near(CardioCore.timeFromDistSplit(d,sp,b), t); near(CardioCore.distFromTimeSplit(t,sp,b), d);
});

// ================= C. cardio_power.v1 — Concept2 watt =================
console.log('\n[C] wattFromSplit500 + splitFromWatt500 (cardio_power.v1)');
const wattCases = [90,100,110,120,150,60,0,null];
T('old===new: wattFromSplit500', () => wattCases.forEach(s => eq(CardioCore.wattFromSplit500(s), LE.wattFromSplit500(s), 'watt('+s+')')));
T('old===new: splitFromWatt500', () => [185,200,100,50,0,null].forEach(w => eq(CardioCore.splitFromWatt500(w), LE.splitFromWatt500(w), 'split('+w+')')));
T('Concept2-formule behouden: split 120s → watt = 2.80/(120/500)^3', () => near(CardioCore.wattFromSplit500(120), 2.80/Math.pow(120/500,3)));
T('inverse consistent: split→watt→split', () => { const w=CardioCore.wattFromSplit500(115); near(CardioCore.splitFromWatt500(w),115); });
T('null-guard: 0/null → null', () => { eq(CardioCore.wattFromSplit500(0),null); eq(CardioCore.wattFromSplit500(null),null); eq(CardioCore.splitFromWatt500(0),null); });
T('lager split (sneller) → hoger watt', () => ok(CardioCore.wattFromSplit500(100) > CardioCore.wattFromSplit500(120)));

// ================= D. cardio_split.v1 — auto/manual splits =================
console.log('\n[D] autoSplits + fromManualSplits (cardio_split.v1)');
T('old===new: autoSplits', () => [[492,2000,500],[0,2000,500],[300,1000,250],[492,2000,0]].forEach(([tt,td,sd]) => eq(J(CardioCore.autoSplits(tt,td,sd)), J(LE.autoSplits(tt,td,sd)), 'auto('+tt+','+td+','+sd+')')));
T('old===new: fromManualSplits', () => [{1:120,2:118,3:122,4:119},{1:0,2:null,3:120},{},{1:NaN}].forEach(m => eq(J(CardioCore.fromManualSplits(m)), J(LE.fromManualSplits(m)), 'manual('+J(m)+')')));
T('autoSplits: 2000 m / 500 m = 4 intervallen, elk 123 s', () => { const s=CardioCore.autoSplits(492,2000,500); eq(Object.keys(s).length,4); near(s[1],123); });
T('fromManualSplits: total/avg/count', () => { const a=CardioCore.fromManualSplits({1:120,2:118,3:122,4:120}); eq(a.count,4); eq(a.total,480); eq(a.avg,120); });
T('fromManualSplits: alleen positieve geldige waarden tellen', () => { const a=CardioCore.fromManualSplits({1:0,2:null,3:120,4:NaN}); eq(a.count,1); eq(a.total,120); });

// ================= E. Architecture guards (purity) =================
console.log('\n[E] Architecture guards');
const RAWSRC = fs.readFileSync(path.join(__dirname, 'cardio.js'), 'utf8');
const SRC = RAWSRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const forbidden = ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'];
T('cardio-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => forbidden.forEach(tok => ok(!SRC.includes(tok), 'verboden token: ' + tok)));
T('VERSIONS compleet (time/split/power)', () => { eq(CardioCore.VERSIONS.time,'cardio_time.v1'); eq(CardioCore.VERSIONS.split,'cardio_split.v1'); eq(CardioCore.VERSIONS.power,'cardio_power.v1'); });
T('offline: pure functie zonder runtime-context', () => { eq(CardioCore.parseTime('2:03'),123); near(CardioCore.wattFromSplit500(120), 2.80/Math.pow(120/500,3)); });
T('device-agnostisch: geen concept2/assault/device-referentie in code', () => { ['concept2','assault','bluetooth','ble','pm5'].forEach(t => ok(SRC.toLowerCase().indexOf(t)===-1, 'device-token in core: '+t)); });

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: old !== new of guard faalt.'); process.exit(1); }
console.log('✅ Alle cardio golden/guard-tests groen. LEGACY === CANONICAL.');
