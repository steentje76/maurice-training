/* TrainingKompas — Decision + Evidence Core test suite (node, standalone).
 * Draai: node core/decision.test.js   (oracle: TK_INDEX of ../index.html)
 * Bewijst: golden, determinisme, purity, versies, en LEGACY === CANONICAL. */
const fs = require('fs');
const path = require('path');
const DecisionCore = require('./decision.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const J = a => JSON.stringify(a);

// ---- Legacy uit de echte index.html extraheren (brace-matched) ----
const IDX = fs.readFileSync(process.env.TK_INDEX || path.join(__dirname, '..', 'index.html'), 'utf8');
function sliceBraced(startIdx) {
  let i = IDX.indexOf('{', startIdx), d = 0, j = i;
  for (; j < IDX.length; j++) { const c = IDX[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return IDX.slice(startIdx, j);
}
function extractFn(name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(IDX);
  if (!m) throw new Error('legacy fn ' + name + ' niet gevonden');
  return sliceBraced(m.index);
}
function extractConstObj(name) {
  const m = new RegExp('const\\s+' + name + '\\s*=\\s*\\{').exec(IDX);
  if (!m) throw new Error('legacy const ' + name + ' niet gevonden');
  // van 'const NAME=' tot balanced '}' (+ ';')
  return IDX.slice(m.index, IDX.indexOf('{', m.index)) + sliceBraced(m.index + IDX.slice(m.index).indexOf('{'));
}
const legacy = new Function(
  extractConstObj('DETRAINING_RULES_V1') + ';\n' +
  'const DETRAINING_RULES=DETRAINING_RULES_V1;\n' +
  [extractFn('computeProgression'), extractFn('computeProgAdjustment'), extractFn('trainReadiness'),
   extractFn('detrainingFactor'), extractFn('phaseForWeek')].join('\n') +
  '\n return { DETRAINING_RULES_V1, computeProgression, computeProgAdjustment, trainReadiness, detrainingFactor, phaseForWeek };'
)();
const RULES = legacy.DETRAINING_RULES_V1;

// ================= A. progression.v1 =================
console.log('\n[A] computeProgression (progression.v1)');
const PROG = DecisionCore.computeProgression;
const progCases = [[7,100],[7.5,100],[7.6,100],[8,100],[8.5,100],[8.6,100],[9,100],[10,100],[null,100],[NaN,100],[8,0],[8,null],[5,42.5],[8.5,200],[undefined,100]];
T('golden+edge: canonical === legacy computeProgression', () => {
  progCases.forEach(([r, k]) => eq(J(PROG(r, k)), J(legacy.computeProgression(r, k)), 'prog(' + String(r) + ',' + String(k) + ')'));
});
T('ankers: rpe7=+2.5, rpe8=0, rpe9=-7.5; geen curKg -> null', () => {
  eq(PROG(7, 100).delta, 2.5); eq(PROG(8, 100).delta, 0); eq(PROG(9, 100).delta, -7.5); eq(PROG(8, 0), null);
});
T('deterministisch', () => eq(J(PROG(8, 100)), J(PROG(8, 100))));

// ================= B. progression_adjust.v1 =================
console.log('\n[B] computeProgAdjustment (progression_adjust.v1)');
const PA = DecisionCore.computeProgAdjustment;
const paCases = [
  [1.00, [], 'goed', null], [0.96, [], 'goed', null], [0.89, [], 'goed', null],
  [1.00, [{muscle:'borst',pct:60}], 'goed', null], [1.00, [], 'slecht', null], [1.00, [], 'matig', null],
  [1.00, [], 'goed', 'knie'], [0.85, [{muscle:'rug',pct:50}], 'slecht', 'schouder'], [0.97, [], 'goed', null],
  [0.965, [{muscle:'been',pct:69}], 'matig', null], [1.00, null, undefined, null]
];
T('golden+edge: canonical === legacy computeProgAdjustment', () => {
  paCases.forEach((a) => eq(J(PA.apply(null, a)), J(legacy.computeProgAdjustment.apply(null, a)), 'pa(' + J(a) + ')'));
});
T('geen aanpassing nodig -> null; wel nodig -> object met redenen', () => {
  eq(PA(1.00, [], 'goed', null), null); ok(PA(0.85, [], 'slecht', null).rpeDelta === -1.5);
});

// ================= C. readiness.v1 =================
console.log('\n[C] trainReadiness (readiness.v1)');
const TR = DecisionCore.trainReadiness;
[null, {factor:1.05}, {factor:1.00}, {factor:0.99}, {factor:0.93}, {factor:0.92}, {factor:0.85}].forEach(df => {
  T('old===new readiness ' + J(df), () => eq(J(TR(df)), J(legacy.trainReadiness(df))));
});
T('ankers: >=1 groen, >=0.93 geel, anders rood', () => { eq(TR({factor:1}).cls,'g'); eq(TR({factor:0.95}).cls,'y'); eq(TR({factor:0.9}).cls,'r'); });

// ================= D. detraining.v1 =================
console.log('\n[D] detrainingFactor (detraining.v1)');
const DFN = DecisionCore.detrainingFactor;
const dCases = [null, undefined, NaN, 0, 3, 7, 8, 14, 15, 28, 29, 56, 57, 90, 91, 400, -5, 7.9, 12.3];
T('old===new: canonical(days,RULES) === legacy(days) [zelfde rules]', () => {
  dCases.forEach(d => eq(J(DFN(d, RULES)), J(legacy.detrainingFactor(d)), 'detr(' + String(d) + ')'));
});
T('banden: 7d=1.00, 14d=0.97, 28d=0.94, 56d=0.90, 90d=0.85, >90=0.80', () => {
  eq(DFN(7, RULES).factor, 1.00); eq(DFN(14, RULES).factor, 0.97); eq(DFN(28, RULES).factor, 0.94);
  eq(DFN(56, RULES).factor, 0.90); eq(DFN(90, RULES).factor, 0.85); eq(DFN(400, RULES).factor, 0.80);
});
T('null/NaN -> factor 1.00, applicable:false (geen detraining fabriceren)', () => {
  eq(DFN(null, RULES).factor, 1.00); eq(DFN(null, RULES).applicable, false); eq(DFN(NaN, RULES).applicable, false);
});
T('version/ruleId meegenomen', () => { eq(DFN(30, RULES).version, RULES.version); eq(DFN(30, RULES).ruleId, RULES.id); });

// ================= E. phase.v1 (context) =================
console.log('\n[E] phaseForWeek (phase.v1 / context)');
const PW = DecisionCore.phaseForWeek;
const phaseCases = [];
[1, 2, 3, 4, 6, 8, 12].forEach(weken => { for (let wk = 1; wk <= weken; wk++) phaseCases.push([wk, weken]); });
T('old===new: canonical === legacy phaseForWeek (volledige matrix)', () => {
  phaseCases.forEach(([wk, weken]) => eq(PW(wk, weken), legacy.phaseForWeek(wk, weken), 'phase(' + wk + '/' + weken + ')'));
});
T('ankers: 1 week=Opbouw; 8w laatste week=Deload/Peak', () => { eq(PW(1, 1), 'Opbouw'); eq(PW(8, 8), 'Deload / Peak'); });

// ================= F. DECISION CONTRACT (additief) =================
console.log('\n[F] progressionDecision (decision-contract, additief)');
const PD = DecisionCore.progressionDecision;
T('contract bevat outcome/deltaKg/ruleId/ruleVersion/inputs', () => {
  const d = PD(7, 100); eq(d.outcome, 'increase'); eq(d.deltaKg, 2.5); eq(d.ruleId, 'progression_rpe');
  eq(d.ruleVersion, 'progression.v1'); eq(d.inputs.rpe, 7); eq(d.inputs.curKg, 100);
});
T('outcome-mapping: increase/hold/deload', () => { eq(PD(7,100).outcome,'increase'); eq(PD(8,100).outcome,'hold'); eq(PD(9,100).outcome,'deload'); });
T('deltaKg === legacy computeProgression.delta (AI verandert getal niet)', () => {
  [[7,100],[8,100],[9,100],[8.5,80]].forEach(([r,k]) => eq(PD(r,k).deltaKg, legacy.computeProgression(r,k).delta));
});
T('geen curKg -> null', () => eq(PD(8, 0), null));

// ================= G. EVIDENCE CONTRACT (evidence.v1) =================
console.log('\n[G] Evidence contract (evidence.v1)');
const EV = DecisionCore.Evidence;
T('decisionRulesSnapshot reproduceert EXACT de bestaande snapshot-provenance', () => {
  const legacyInline = (typeof RULES !== 'undefined') ? { detraining: { id: RULES.id, version: RULES.version } } : null;
  eq(J(EV.decisionRulesSnapshot(RULES)), J(legacyInline));
});
T('decisionRulesSnapshot(null) -> null (guard identiek)', () => eq(EV.decisionRulesSnapshot(null), null));
T('buildEvidence: alleen meegegeven velden + versie (geen metadata-explosie)', () => {
  const e = EV.buildEvidence({ source: 'calculation', calculationVersion: 'working_weight.v1', decision: { ruleId: 'progression_rpe', ruleVersion: 'progression.v1' }, inputs: { rpe: 8 } });
  eq(e.source, 'calculation'); eq(e.evidenceVersion, 'evidence.v1'); eq(e.calculationVersion, 'working_weight.v1');
  eq(e.decision.ruleVersion, 'progression.v1'); eq(e.inputs.rpe, 8); ok(!('override' in e)); ok(!('ai' in e));
});
T('buildEvidence AI-pad: source ai_suggested + validatedBy', () => {
  const e = EV.buildEvidence({ source: 'ai_suggested', ai: { validatedBy: 'ai_guard.v1' } });
  eq(e.source, 'ai_suggested'); eq(e.ai.validatedBy, 'ai_guard.v1');
});
T('default source = calculation', () => eq(EV.buildEvidence({}).source, 'calculation'));

// ================= H. Architecture guards (purity) =================
console.log('\n[H] Architecture guards');
const RAWSRC = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
const SRC = RAWSRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const forbidden = ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'];
T('decision-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => {
  forbidden.forEach(tok => ok(!SRC.includes(tok), 'verboden token: ' + tok));
});
T('VERSIONS compleet', () => {
  ['progression','progression_adjust','readiness','detraining','phase','evidence'].forEach(k => ok(DecisionCore.VERSIONS[k], 'mist ' + k));
});
T('offline: pure decision zonder runtime-context', () => { eq(PROG(7,100).delta, 2.5); eq(PW(1,1), 'Opbouw'); });

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: old !== new of contract faalt.'); process.exit(1); }
console.log('✅ Alle decision/evidence-tests groen. LEGACY === CANONICAL.');
