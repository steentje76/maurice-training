/* TrainingKompas — Calculation Core test suite (node, standalone).
 * Draai: node core/calculation.test.js
 * Bewijst: golden cases, determinisme, purity, versies, en LEGACY === CANONICAL. */
const fs = require('fs');
const path = require('path');
const CalcCore = require('./calculation.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

// ---- Legacy uit de echte index.html extraheren (brace-matched) ----
// TK_INDEX kan wijzen naar de ORIGINELE index.html (vóór delegatie-edits); anders ../index.html.
const IDX = fs.readFileSync(process.env.TK_INDEX || path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(IDX);
  if (!m) throw new Error('legacy ' + name + ' niet gevonden');
  let i = IDX.indexOf('{', m.index), d = 0, j = i;
  for (; j < IDX.length; j++) { const c = IDX[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return IDX.slice(m.index, j);
}
const legacy = new Function(
  extractFn('roundKg') + '\n' + extractFn('epley1RMRaw') + '\n' + extractFn('epley1RM') + '\n' +
  extractFn('suggestWeightForRepsRpe') +
  '\n return { roundKg, epley1RMRaw, epley1RM, suggestWeightForRepsRpe };'
)();

// ================= A. roundKg golden (42) =================
console.log('\n[A] roundKg golden (rounding.v1)');
const rkNum = [0,0.1,0.24,0.25,0.26,0.49,0.5,0.51,1,1.24,1.25,1.26,1.49,1.5,1.51,2.25,2.5,2.75,5,10,20,67.25,67.5,67.75,72.25,72.5,72.75,100,102.5,112.4,117.5,125];
const rkEdge = [null, undefined, NaN, '67.5', 'abc', -0.25, -1.25, -2.5, 0.001, 1e-9];
T('42 golden cases: canonical === legacy (Object.is)', () => {
  [...rkNum, ...rkEdge].forEach(v => eq(CalcCore.roundKg(v), legacy.roundKg(v), 'roundKg(' + String(v) + ')'));
});
T('roundKg vaste ankers', () => { eq(CalcCore.roundKg(0.25), 0.5); eq(CalcCore.roundKg(2.75), 3); eq(CalcCore.roundKg(67.25), 67.5); eq(CalcCore.roundKg(112.4), 112.5); });
T('legacy quirk behouden: roundKg(null) === 0', () => eq(CalcCore.roundKg(null), 0));
T('roundKg deterministisch', () => eq(CalcCore.roundKg(83.3), CalcCore.roundKg(83.3)));
T('roundKg output ligt op 0,5 (property, geldige input)', () => rkNum.forEach(v => ok((CalcCore.roundKg(v) * 2) % 1 === 0, 'niet op 0,5: ' + v)));

// ================= B. calculate1RM golden + edge =================
console.log('\n[B] calculate1RM / oneRMRaw (e1rm.v1)');
const oneRMcases = [[100,1],[100,3],[100,8],[100,10],[85,3],[240,3],[100.5,1],[0,5],[100,0],[100,'x'],[100,null]];
T('golden+edge: canonical calculate1RM === legacy epley1RM', () => {
  oneRMcases.forEach(([w,r]) => eq(CalcCore.calculate1RM(w,r), legacy.epley1RM(w,r), '1RM('+w+','+r+')'));
});
T('golden+edge: canonical oneRMRaw === legacy epley1RMRaw', () => {
  oneRMcases.forEach(([w,r]) => eq(CalcCore.oneRMRaw(w,r), legacy.epley1RMRaw(w,r), 'raw('+w+','+r+')'));
});
T('1RM ankers', () => { eq(CalcCore.calculate1RM(100,1),100); eq(CalcCore.calculate1RM(100,3),110); eq(CalcCore.calculate1RM(100,8),127); eq(CalcCore.calculate1RM(100,10),133); });
T('meer reps => hogere schatting', () => ok(CalcCore.calculate1RM(100,8) > CalcCore.calculate1RM(100,3)));
T('1 rep => gewicht zelf (raw)', () => eq(CalcCore.oneRMRaw(100,1),100));
T('deterministisch', () => eq(CalcCore.calculate1RM(100,5), CalcCore.calculate1RM(100,5)));

// ================= B2. calculateWorkingWeight (Brzycki) golden + edge =================
console.log('\n[B2] calculateWorkingWeight (working_weight.v1)');
const wwCases = [[150,5,8],[150,5,undefined],[100,8,7],[100,1,8],[100,20,8],[100,25,8],[125,10,9],[100.5,5,8],[0,5,8],[100,0,8],[null,5,8],[100,null,8],[100,5,null],[100,5,'8'],[100,5,'abc']];
T('golden+edge: canonical calculateWorkingWeight === legacy suggestWeightForRepsRpe', () => {
  wwCases.forEach(([o,r,p]) => eq(CalcCore.calculateWorkingWeight(o,r,p), legacy.suggestWeightForRepsRpe(o,r,p), 'ww('+o+','+r+','+p+')'));
});
T('working-weight golden anker: 150/5/RPE8 -> 125 kg', () => eq(CalcCore.calculateWorkingWeight(150,5,8),125));
T('working-weight: geen 1RM of reps -> null', () => { eq(CalcCore.calculateWorkingWeight(0,5,8),null); eq(CalcCore.calculateWorkingWeight(100,0,8),null); eq(CalcCore.calculateWorkingWeight(null,5,8),null); });
T('working-weight: default RPE 8 bij ontbrekende rpe', () => eq(CalcCore.calculateWorkingWeight(150,5,undefined), CalcCore.calculateWorkingWeight(150,5,8)));
T('working-weight: hoge reps geplafonneerd (reps-to-failure <= 20)', () => eq(CalcCore.calculateWorkingWeight(100,25,8), CalcCore.calculateWorkingWeight(100,20,8)));
T('working-weight: output op 0,5 kg (via roundKg)', () => { const w=CalcCore.calculateWorkingWeight(137,7,8); ok((w*2)%1===0,'niet op 0,5: '+w); });
T('working-weight deterministisch', () => eq(CalcCore.calculateWorkingWeight(150,5,8),CalcCore.calculateWorkingWeight(150,5,8)));

// ================= C. Contract / versies =================
console.log('\n[C] Result-contract & versies');
T('roundKgResult heeft value+unit+type+version', () => { const r=CalcCore.roundKgResult(67.25); eq(r.value,67.5); eq(r.unit,'kg'); eq(r.calculationType,'rounding'); eq(r.calculationVersion,'rounding.v1'); });
T('oneRMResult heeft value+unit+type+version', () => { const r=CalcCore.oneRMResult(100,8); eq(r.value,127); eq(r.calculationType,'e1rm'); eq(r.calculationVersion,'e1rm.v1'); });
T('workingWeightResult heeft value+unit+type+version', () => { const r=CalcCore.workingWeightResult(150,5,8); eq(r.value,125); eq(r.unit,'kg'); eq(r.calculationType,'working_weight'); eq(r.calculationVersion,'working_weight.v1'); });
T('VERSIONS aanwezig', () => { eq(CalcCore.VERSIONS.rounding,'rounding.v1'); eq(CalcCore.VERSIONS.e1rm,'e1rm.v1'); eq(CalcCore.VERSIONS.working_weight,'working_weight.v1'); });

// ================= D. Architecture guards (purity, offline) =================
console.log('\n[D] Architecture guards');
const RAWSRC = fs.readFileSync(path.join(__dirname, 'calculation.js'), 'utf8');
// alleen CODE scannen (commentaar strippen), zodat prose als "geen document/DOM" de guard niet trigger
const SRC = RAWSRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const forbidden = ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'];
T('core bevat geen DOM/DB/AI/network-afhankelijkheid', () => {
  forbidden.forEach(tok => ok(!SRC.includes(tok), 'verboden token aanwezig: ' + tok));
});
T('core gebruikt window alleen als global-export (geen DOM)', () => {
  // enige window-referentie is de UMD-export onderaan
  const winRefs = (SRC.match(/window/g) || []).length;
  ok(winRefs <= 2, 'onverwachte window-usage: ' + winRefs);
});
T('offline: pure functie werkt zonder enige runtime-context', () => { eq(CalcCore.roundKg(112.4),112.5); eq(CalcCore.calculate1RM(100,8),127); });

// ================= E. AI-BOUNDARY GUARD (ai_guard.v1) — security/integriteit =================
console.log('\n[E] validateProposedWeight (ai_guard.v1) — AI mag geen numerieke waarheid injecteren');
const V = CalcCore.validateProposedWeight;
T('geldig voorstel -> ok + engine-afgerond (82.3 -> 82.5)', () => { const r=V(82.3,200); ok(r.ok===true); eq(r.value,82.5); eq(r.source,'ai_suggested'); eq(r.calculationVersion,'ai_guard.v1'); });
T('TEST7: NaN -> rejected', () => ok(V(NaN,200).ok===false));
T('TEST8: string-injectie "abc" -> rejected', () => ok(V('abc',200).ok===false));
T('string-getal "82.5" -> ok (defensief geparsed)', () => { const r=V('82.5',200); ok(r.ok===true); eq(r.value,82.5); });
T('TEST10: negatief -> rejected', () => ok(V(-50,200).ok===false));
T('nul -> rejected', () => ok(V(0,200).ok===false));
T('Infinity -> rejected', () => ok(V(Infinity,200).ok===false));
T('TEST9: extreem hoog met 1RM -> rejected (>1.2x1RM)', () => ok(V(9999,200).ok===false));
T('extreem hoog zonder 1RM -> rejected (>500 cap)', () => ok(V(9999,null).ok===false));
T('op de 1RM-grens (1.2x) -> ok, net erboven -> rejected', () => { ok(V(240,200).ok===true); ok(V(240.5,200).ok===false); });
T('zonder 1RM binnen cap -> ok, boven cap -> rejected', () => { ok(V(400,null).ok===true); ok(V(600,null).ok===false); });
T('deterministisch', () => { const a=V(100,200),b=V(100,200); ok(JSON.stringify(a)===JSON.stringify(b)); });

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: old !== new of guard faalt.'); process.exit(1); }
console.log('✅ Alle golden/guard-tests groen. LEGACY === CANONICAL.');
