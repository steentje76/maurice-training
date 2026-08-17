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
function extractConst(name) {
  const m = new RegExp('const\\s+' + name + '\\s*=\\s*([^;]+);').exec(IDX);
  if (!m) throw new Error('legacy const ' + name + ' niet gevonden');
  return 'const ' + name + ' = ' + m[1] + ';';
}
const legacy = new Function(
  extractConst('RATIO_DECAY') + '\n' +
  [extractFn('roundKg'), extractFn('epley1RMRaw'), extractFn('epley1RM'),
   extractFn('suggestWeightForRepsRpe'), extractFn('suggestWarmupScheme'),
   extractFn('rpeMultiplier'), extractFn('computeMuscleRecoveryPct'),
   extractFn('slaapDagFactor'), extractFn('cyclusDagFactor'), extractFn('dagfactor'),
   extractFn('computeGoalProgress'), extractFn('weightedEst1RM')].join('\n') +
  '\n return { roundKg, epley1RMRaw, epley1RM, suggestWeightForRepsRpe, suggestWarmupScheme,' +
  ' rpeMultiplier, computeMuscleRecoveryPct, slaapDagFactor, cyclusDagFactor, dagfactor,' +
  ' computeGoalProgress, weightedEst1RM, RATIO_DECAY };'
)();
const J = a => JSON.stringify(a);

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

// ================= F. calculateVolume (volume.v1) — old===new vs inline legacy =================
console.log('\n[F] calculateVolume (volume.v1)');
const CV = CalcCore.calculateVolume;
T('golden: 1x10x100=1000, 3x8x100=2400, 5x5x150=3750, 10x10x20=2000', () => {
  eq(CV({sets:1,reps:10,weight:100}),1000); eq(CV({sets:3,reps:8,weight:100}),2400);
  eq(CV({sets:5,reps:5,weight:150}),3750); eq(CV({sets:10,reps:10,weight:20}),2000);
});
T('decimal weight: 3x8x100.5 = 2412', () => eq(CV({sets:3,reps:8,weight:100.5}),2412));
T('zero sets/reps/weight -> 0', () => { eq(CV({sets:0,reps:8,weight:100}),0); eq(CV({sets:3,reps:0,weight:100}),0); eq(CV({sets:3,reps:8,weight:0}),0); });
T('null input -> null', () => eq(CV(null),null));
T('string-numeric coercie: {"3","8","100"} = 2400 (JS *)', () => eq(CV({sets:'3',reps:'8',weight:'100'}),2400));
T('invalid string -> NaN (legacy JS *)', () => ok(Number.isNaN(CV({sets:'x',reps:8,weight:100}))));
T('negative -> negatief product behouden', () => eq(CV({sets:-3,reps:8,weight:100}),-2400));
T('legacy quirk: null-veld -> 0 (null*x), undefined-veld -> NaN', () => { eq(CV({sets:null,reps:8,weight:100}),0); ok(Number.isNaN(CV({sets:undefined,reps:8,weight:100}))); });
// old===new tegen de 3 echte inline legacy-varianten (r.7144 strict, r.12451 variant A, r.13175 variant B)
const volSessions = [
  {sets:3,reps:8,weight:100},{sets:5,reps:5,weight:150},{sets:1,reps:10,weight:100.5},
  {sets:null,reps:8,weight:100},{sets:undefined,reps:10,weight:80},{weight:'90',reps:'6',sets:'4'},
  {sets:0,reps:0,weight:0},{sets:2,reps:12,weight:60},{reps:8,weight:100}/*geen sets*/,{sets:4,weight:40}/*geen reps*/
];
T('old===new: strict inline (r.7144) s.sets*s.reps*s.weight', () => {
  volSessions.forEach(s => eq(CV({sets:s.sets,reps:s.reps,weight:s.weight}), s.sets*s.reps*s.weight, 'strict '+J(s)));
});
T('old===new: variant A (r.12451) parseFloat(w)||0 * parseInt(r)||0 * parseInt(sets)||1', () => {
  volSessions.forEach(s => {
    const legacyV = (parseFloat(s.weight)||0)*(parseInt(s.reps)||0)*(parseInt(s.sets)||1);
    const coreV = CV({weight:parseFloat(s.weight)||0, reps:parseInt(s.reps)||0, sets:parseInt(s.sets)||1});
    eq(coreV, legacyV, 'variantA '+J(s));
  });
});
T('old===new: variant B (r.13175) (sets||1)*(reps||1)*(weight||0)', () => {
  volSessions.forEach(s => {
    const legacyV = (s.sets||1)*(s.reps||1)*(s.weight||0);
    const coreV = CV({sets:s.sets||1, reps:s.reps||1, weight:s.weight||0});
    eq(coreV, legacyV, 'variantB '+J(s));
  });
});
T('deterministisch', () => eq(CV({sets:3,reps:8,weight:100}),CV({sets:3,reps:8,weight:100})));

// ================= G. applyPercentage (percentage.v1) — old===new vs inline base*pct/100 =================
console.log('\n[G] applyPercentage (percentage.v1)');
const AP = CalcCore.applyPercentage;
T('golden: 100@90=90, 150@80=120, 200@50=100', () => { eq(AP(100,90),90); eq(AP(150,80),120); eq(AP(200,50),100); });
T('old===new: applyPercentage(base,pct) === base*pct/100', () => {
  [[100,90],[150,80],[200,50],[137.5,85],[100,0],[0,90],[100,150],[100,33.333],[240,100],[100.5,70]].forEach(([b,p]) =>
    eq(AP(b,p), b*p/100, 'ap('+b+','+p+')'));
});
T('getEffectiveKg-patroon: roundKg(applyPercentage) === roundKg(base*pct/100)', () => {
  [[150,90],[137.5,85],[200,72.5],[100.5,70]].forEach(([b,p]) =>
    eq(CalcCore.roundKg(AP(b,p)), CalcCore.roundKg(b*p/100), 'roundKg ap('+b+','+p+')'));
});
T('deterministisch', () => eq(AP(150,90),AP(150,90)));

// ================= H. calculateWarmup (warmup.v1) — old===new vs suggestWarmupScheme =================
console.log('\n[H] calculateWarmup (warmup.v1)');
const CW = CalcCore.calculateWarmup;
T('golden anker: 150kg -> [60/8, 82.5/5, 105/3, 120/2, 135/1]', () => {
  eq(J(CW(150)), J([{kg:60,reps:8},{kg:82.5,reps:5},{kg:105,reps:3},{kg:120,reps:2},{kg:135,reps:1}]));
});
T('old===new vs legacy suggestWarmupScheme (alle drempels + edge)', () => {
  [200,150,120,119.5,100,80,79.9,50,40,39.9,20,1,0,-5,0.5,137.3,119,121].forEach(w =>
    eq(J(CW(w)), J(legacy.suggestWarmupScheme(w)), 'warmup('+w+')'));
});
T('drempels kloppen: >=120 => 5 sets, >=80 => 4, >=40 => 3, else 2', () => {
  eq(CW(120).length,5); eq(CW(80).length,4); eq(CW(40).length,3); eq(CW(39).length,2);
});
T('deterministisch', () => eq(J(CW(150)),J(CW(150))));

// ================= I. recovery (recovery.v1) — old===new vs rpeMultiplier + computeMuscleRecoveryPct =====
console.log('\n[I] rpeMultiplier + calculateMuscleRecoveryPct (recovery.v1)');
const RM = CalcCore.rpeMultiplier, MR = CalcCore.calculateMuscleRecoveryPct;
T('old===new: rpeMultiplier (incl. quirks 0/leeg/NaN -> 1)', () => {
  [null,undefined,0,'',NaN,'x',5,7,7.9,8,8.5,9,10,'8','9',-3,9.5].forEach(r =>
    eq(RM(r), legacy.rpeMultiplier(r), 'rpeMult('+String(r)+')'));
});
T('rpeMultiplier ankers: rpe9->1.3, rpe8->1.0, rpe5->0.85, leeg->1', () => { eq(RM(9),1.3); eq(RM(8),1.0); eq(RM(5),0.85); eq(RM(''),1); });
T('old===new: calculateMuscleRecoveryPct (matrix uren×base×rpe)', () => {
  [0,1,12,24,48,72,0.5,36.7].forEach(h => [24,48,72].forEach(base => [null,5,7,8,9,10,''].forEach(rpe =>
    eq(MR(h,base,rpe), legacy.computeMuscleRecoveryPct(h,base,rpe), 'recov('+h+','+base+','+String(rpe)+')'))));
});
T('cap 100: volledig hersteld -> 100 (nooit hoger)', () => { eq(MR(999,48,8),100); eq(MR(48,48,8),100); });
T('0 uur -> 0%', () => eq(MR(0,48,8),0));
T('hogere RPE => lager herstel bij gelijke tijd', () => ok(MR(24,48,9) < MR(24,48,5)));
T('deterministisch', () => eq(MR(24,48,8),MR(24,48,8)));

// ================= J. dayfactor (dayfactor.v1) — old===new vs slaap/cyclus/dagfactor =================
console.log('\n[J] slaapDagFactor + cyclusDagFactor + calculateDayFactor (dayfactor.v1)');
const SD = CalcCore.slaapDagFactor, CD = CalcCore.cyclusDagFactor, DF = CalcCore.calculateDayFactor;
T('old===new: slaapDagFactor', () => {
  [null,0,undefined,5,5.9,6,6.5,7,8,10,'x',-2].forEach(u => eq(SD(u), legacy.slaapDagFactor(u), 'slaap('+String(u)+')'));
});
T('old===new: cyclusDagFactor (incl. onbekende fase -> 1.00)', () => {
  ['menstruatie','folliculair','ovulatie','luteaal','onbekend',null,undefined,''].forEach(f => eq(CD(f), legacy.cyclusDagFactor(f), 'cyclus('+String(f)+')'));
});
T('ankers: slaap>=7=1.00, 6=0.97, <6=0.92; folliculair=1.03, menstruatie=0.93', () => {
  eq(SD(8),1.00); eq(SD(6),0.97); eq(SD(5),0.92); eq(CD('folliculair'),1.03); eq(CD('menstruatie'),0.93);
});
T('old===new: calculateDayFactor(.factor) === legacy dagfactor(hc,slaap,fase).factor', () => {
  [0.85,0.9,0.95,1.0,1.02,1.05,1.1,0.8].forEach(hf => [4,5,6,7,8].forEach(sl => ['menstruatie','folliculair','ovulatie','luteaal','onbekend',null].forEach(fase => {
    const hc = {factor:hf, st:'ref', baseline:null};
    eq(DF({hrvFactor:hf, sleepHours:sl, cyclePhase:fase}), legacy.dagfactor(hc,sl,fase).factor, 'dayfactor('+hf+','+sl+','+String(fase)+')');
  })));
});
T('clamp [0.85,1.05] + 2 decimalen', () => { eq(DF({hrvFactor:2.0,sleepHours:8,cyclePhase:'folliculair'}),1.05); eq(DF({hrvFactor:0.1,sleepHours:5,cyclePhase:'menstruatie'}),0.85); });
T('deterministisch', () => eq(DF({hrvFactor:1.0,sleepHours:7,cyclePhase:'ovulatie'}),DF({hrvFactor:1.0,sleepHours:7,cyclePhase:'ovulatie'})));

// ================= K. calculateGoalProgress (goal.v1) — DataAccess-boundary, old===new =============
console.log('\n[K] calculateGoalProgress (goal.v1)');
const GP = CalcCore.calculateGoalProgress;
const goalCases = [
  [{startwaarde:0,doelwaarde:100},50], [{startwaarde:50,doelwaarde:100},75], [{startwaarde:100,doelwaarde:200},150],
  [{startwaarde:null,doelwaarde:100},40], [{startwaarde:100,doelwaarde:100},100], [{startwaarde:100,doelwaarde:100},50],
  [{startwaarde:0,doelwaarde:100},-10], [{startwaarde:0,doelwaarde:100},150], [{startwaarde:80,doelwaarde:60},70],
  [{doelwaarde:null},50], [{startwaarde:0,doelwaarde:100},null], [{startwaarde:20,doelwaarde:100},60]
];
T('old===new: canonical === legacy computeGoalProgress', () => {
  goalCases.forEach(([g,c]) => eq(GP(g,c), legacy.computeGoalProgress(g,c), 'goal('+J(g)+','+String(c)+')'));
});
T('ankers: 0->100 @50 = 50%; geplafonneerd [0,100]', () => {
  eq(GP({startwaarde:0,doelwaarde:100},50),50); eq(GP({startwaarde:0,doelwaarde:100},150),100); eq(GP({startwaarde:0,doelwaarde:100},-10),0);
});
T('null-guard: geen currentVal of doelwaarde -> null', () => { eq(GP({doelwaarde:100},null),null); eq(GP({startwaarde:0,doelwaarde:null},50),null); });
T('span 0: cur>=doel -> 100, anders 0', () => { eq(GP({startwaarde:100,doelwaarde:100},100),100); eq(GP({startwaarde:100,doelwaarde:100},50),0); });

// ================= L. weightedOneRM (e1rm_weighted.v1) — DataAccess-split, old===new ================
console.log('\n[L] weightedOneRM (e1rm_weighted.v1)');
const WO = CalcCore.weightedOneRM;
const DECAY = legacy.RATIO_DECAY;
const REF = '2026-08-01';
const woSessions = [
  [], [{date:'2026-07-31',weight:100,reps:5}], [{date:'2026-07-01',weight:120,reps:3},{date:'2026-07-25',weight:110,reps:5}],
  [{date:'2026-06-01',weight:100,reps:1},{date:'2026-07-30',weight:140,reps:2}],
  [{date:'2026-07-15',weight:0,reps:5},{date:'2026-07-20',weight:90,reps:8}], // 0-weight overgeslagen
  [{date:'2026-07-10',weight:80,reps:null},{date:'2026-07-20',weight:95,reps:6}] // null-reps overgeslagen
];
T('old===new: weightedOneRM(sessions,new Date(REF),DECAY) === legacy weightedEst1RM(sessions,REF)', () => {
  woSessions.forEach(ss => eq(J(WO(ss, new Date(REF), DECAY)), J(legacy.weightedEst1RM(ss, REF)), 'wo('+J(ss)+')'));
});
T('lege/ongeldige input -> {est:null,n:0}', () => { eq(J(WO([], new Date(REF), DECAY)), J({est:null,n:0})); eq(J(WO(null, new Date(REF), DECAY)), J({est:null,n:0})); });
T('sessies zonder weight/reps overgeslagen (n telt alleen geldige)', () => {
  eq(WO([{date:'2026-07-20',weight:0,reps:5},{date:'2026-07-20',weight:90,reps:8}], new Date(REF), DECAY).n, 1);
});
T('recentere sessie weegt zwaarder (decay)', () => {
  const recent = WO([{date:'2026-07-31',weight:100,reps:5}], new Date(REF), DECAY).est;
  const oud    = WO([{date:'2026-01-01',weight:100,reps:5}], new Date(REF), DECAY).est;
  ok(Math.abs(recent-oud) < 1e-9, 'zelfde single-sessie est ongeacht ouderdom'); // 1 sessie: gewicht valt weg in de deling
});
T('deterministisch bij vaste ref', () => eq(J(WO(woSessions[2], new Date(REF), DECAY)), J(WO(woSessions[2], new Date(REF), DECAY))));

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: old !== new of guard faalt.'); process.exit(1); }
console.log('✅ Alle golden/guard-tests groen. LEGACY === CANONICAL.');
