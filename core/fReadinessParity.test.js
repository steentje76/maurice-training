/* fReadinessParity.test.js — GAP-P3-032 READINESS INPUT & APPLICATION PARITY.
 * Bewijst met echte productiefuncties (index.html) + echte DecisionCore/CalcCore:
 * één canonical readiness-pad (recoveryAdjustmentForToday -> DEC-RECADJ-001 -> applySessionRecovery /
 * applyRecoveryToGuidedPlan) voor Programma = Normal = Guided; gevoel-/pijn-input-parity uit dezelfde
 * persisted bronnen; expliciete gewichts-override is finaal; detraining + readiness ieder één keer;
 * DEC-RECADJ-001 / DEC-DETRAIN-001 ongewijzigd; DEC-PROG-001 opt-in.
 *
 * Draai: node core/fReadinessParity.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const DecisionCore = require(path.join(ROOT, 'core/decision.js'));
const CalcCore = require(path.join(ROOT, 'core/calculation.js'));
let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(a === b, l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function extractFn(name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(html); if (!m) return null;
  let i = html.indexOf('{', m.index), d = 0;
  for (let j = i; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (d === 0) return html.slice(m.index, j + 1); } }
  return null;
}
const FNS = ['recoveryAdjustmentForToday', 'todayPainMuscle', 'computeProgAdjustment', 'applySessionRecovery', 'applyRecoveryToGuidedPlan',
  'recoveryWeightFactor', 'readinessInputsText', 'buildPrevBlock', 'strengthBasisText', 'roundKg', 'resolveWorkingWeight', 'detrainingFactor',
  'daysBetweenDates', 'suggestWeightForRepsRpe', 'resolvePrescriptionRepTarget', 'previewOneRM', 'estimatedOneRM', 'getOneRM', 'oneRMFor',
  'strengthBasisProvenance', 'manualOneRMDate', 'recoveryAdjustToast'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'functie gevonden: ' + n); });
const LAUNCH = extractFn('launchProgramTrainScreen'), EVAL = extractFn('evaluateProgAdjustment'), START_T = extractFn('startT'), POSTSET = extractFn('showPostSetAdvice');
const RULES_SRC = (html.match(/const DETRAINING_RULES_V1=\{[\s\S]*?\n\};/) || [''])[0];
const TODAY = '2026-09-14';

function sandbox(cfg) {
  cfg = cfg || {};
  const toasts = [];
  const ctx = {
    DecisionCore, CalcCore, console, Date, Math, JSON, Promise, Object, Array, String, Number, isFinite, isNaN, parseFloat, parseInt, encodeURIComponent,
    td: () => TODAY, estOneRMCache: {}, strengthBasisCache: {}, exerciseGoals: new Map(), localStorage: { getItem: () => null }, window: {},
    escHtml: (x) => String(x), toast: (t) => toasts.push(t), resolveCardioType: () => null,
    dagfactor: () => ({ factor: cfg.factor != null ? cfg.factor : 1.0 }), hrvDagFactorPersonal: () => null,
    getRelevantMuscleRecovery: async () => cfg.recRows || [], rhrBaselineDelta: () => null, recoveryScoreFrom: () => ({ score: 70, band: 'goed', confidence: 'middel' }),
    sbGet: async (t, q) => {
      if (t === 'hrv_log') return cfg.hrv || [];
      if (t === 'checkin_conditions') return (q.includes('date=eq.' + TODAY) && cfg.painToday) ? [{ date: TODAY, condition_label: 'Pijn: ' + cfg.painToday }] : [];
      return [];
    },
    sessionRxAdj: {}
  };
  vm.createContext(ctx);
  vm.runInContext(RULES_SRC + '\nconst DETRAINING_RULES=DETRAINING_RULES_V1;\n' + FNS.map((n) => SRC[n]).join('\n'), ctx);
  ctx._toasts = toasts; return ctx;
}
const item = (extra) => Object.assign({ id: 'ex', naam: 'Squat', type: 'strength', sets: 4, reps: '5', rpe: '8', suggestedWeight: 100 }, extra || {});

(async () => {
  // ── Regels ongewijzigd ──
  ok(/\{maxDays:7,\s*factor:1\.00\}[\s\S]*\{maxDays:Infinity,\s*factor:0\.80\}/.test(RULES_SRC), 'DEC-DETRAIN-001 banden ongewijzigd');
  const a1 = DecisionCore.computeProgAdjustment(0.85, [], null, null), a2 = DecisionCore.computeProgAdjustment(0.95, [], null, null), a3 = DecisionCore.computeProgAdjustment(1, [], 'slecht', null), a4 = DecisionCore.computeProgAdjustment(1, [], null, 'schouder');
  ok(a1.rpeDelta === -1.5 && a1.setsDelta === -1 && a2.rpeDelta === -0.5 && a2.setsDelta === 0 && a3.rpeDelta === -1.5 && a4.rpeDelta === 0 && a4.painMuscle === 'schouder' && /pijn/.test(a4.redenen[0]) && DecisionCore.computeProgAdjustment(1, [], null, null) === null, 'DEC-RECADJ-001 (progression_adjust.v1) exact ongewijzigd: −0.5/−1.5, sets −1; pijn alleen = reden/provenance zonder numerieke delta; null zonder reden');

  // ── Input-parity: gevoel uit hrv_log, pijn uit checkin_conditions (Normal-pad zonder expliciete opts) ──
  let c = sandbox({ factor: 1, hrv: [{ date: TODAY, voelt: 'matig' }], painToday: 'schouder' });
  let adj = await c.recoveryAdjustmentForToday(['quadriceps']);
  eq(adj.inputs.voelt, 'matig', 'Normal: gevoel uit hrv_log.voelt van vandaag'); eq(adj.inputs.painMuscle, 'schouder', 'Normal: pijn uit checkin_conditions van vandaag (was altijd null)');
  eq(adj.inputs.source.pain, 'checkin_conditions', 'provenance pijnbron'); eq(adj.rpeDelta, -0.5, 'matig → −0.5 (DEC-RECADJ-001)'); ok(adj.redenen.some((x) => /pijn\/ongemak gemeld: schouder/.test(x)), 'pijn in de redenen (bestaande rule-semantiek: reden, geen extra delta)'); eq(adj.ruleId, 'DEC-RECADJ-001', 'rule-ID in provenance');
  // Programma: expliciete check-in → identieke uitkomst
  let cp = sandbox({ factor: 1, hrv: [], painToday: null });
  let adjP = await cp.recoveryAdjustmentForToday(['quadriceps'], { voelt: 'matig', painMuscle: 'schouder' });
  ok(adjP.rpeDelta === adj.rpeDelta && adjP.setsDelta === adj.setsDelta && adjP.inputs.voelt === 'matig' && adjP.inputs.painMuscle === 'schouder' && adjP.inputs.source.pain === 'checkin', 'Programma (expliciete check-in) = Normal (persisted) voor dezelfde gevoel/pijn-input');
  // geen readiness verzinnen
  c = sandbox({ factor: 1, hrv: [{ date: '2026-09-10', voelt: 'slecht' }], painToday: null });
  adj = await c.recoveryAdjustmentForToday(['q']);
  ok(adj.rpeDelta === 0 && adj.inputs.voelt === null && adj.inputs.painMuscle === null && adj.inputs.source.voelt === 'geen', 'oude hrv_log-voelt (niet vandaag) en geen pijn → geen aanpassing verzonnen');
  c = sandbox({ factor: 1, hrv: [], painToday: null }); adj = await c.recoveryAdjustmentForToday(['q'], { voelt: null, painMuscle: null });
  eq(adj.rpeDelta, 0, 'expliciet lege check-in → 0');

  // ── Application-parity: Programma = Normal = Guided (zelfde adj, zelfde item) ──
  c = sandbox({ factor: 0.85, hrv: [], painToday: null }); adj = await c.recoveryAdjustmentForToday(['q']);
  eq(adj.rpeDelta, -1.5, 'dagfactor 0.85 → −1.5'); eq(adj.setsDelta, -1, 'sets −1');
  c.sessionRxAdj['vt1'] = adj; c.sessionRxAdj['prog_1'] = adj;
  const normal = c.applySessionRecovery('vt1', [item()])[0];
  const program = c.applySessionRecovery('prog_1', [item({ _t: 'prog_1', _preloaded: true })])[0];
  const guided = c.applyRecoveryToGuidedPlan({ items: [{ id: 'ex', sets: 4, reps: '5', weight: 100 }] }, adj).items[0];
  const expW = c.roundKg(100 * c.recoveryWeightFactor('5', -1.5));
  ok(normal.suggestedWeight === expW && program.suggestedWeight === expW && guided.weight === expW, 'gewicht: Normal = Programma = Guided = ' + expW + ' (één recoveryWeightFactor, CalcCore-ratio)');
  ok(normal.rpe === '6.5' && program.rpe === '6.5' && normal.sets === 3 && program.sets === 3 && guided.sets === 3, 'RPE/sets: Normal = Programma = Guided (RPE 8→6.5, sets 4→3)');
  ok(normal._rxAdjusted === true && normal._rxRpeDelta === -1.5 && normal._rxInputs && normal._rxInputs.dagfactor === 0.85, 'provenance op item (_rxAdjusted/_rxRpeDelta/_rxInputs)');
  // cap/floor
  c.sessionRxAdj['cap'] = { rpeDelta: -1.5, setsDelta: -1 };
  const capped = c.applySessionRecovery('cap', [item({ sets: 1, rpe: '5.5' })])[0];
  ok(capped.sets === 1 && capped.rpe === '5', 'cap/floor: sets ≥1, RPE ≥5 (ongewijzigd)');
  // idempotent (geen compounding)
  const twice = c.applySessionRecovery('vt1', c.applySessionRecovery('vt1', [item()]).map((x) => item()))[0];
  eq(twice.suggestedWeight, expW, 'idempotent: opnieuw toepassen op de basis geeft hetzelfde (geen compounding)');

  // ── Override is finaal ──
  const ov = c.applySessionRecovery('vt1', [item({ suggestedWeight: 87.5, _weightOverride: true })])[0];
  ok(ov.suggestedWeight === 87.5 && ov._rxOverrideBypass === true && ov.rpe === '6.5' && ov.sets === 3, 'override + slechte readiness: gewicht exact 87.5 (bypass), sets/RPE wel aangepast + provenance');
  c = sandbox({ factor: 0.95, hrv: [], painToday: 'schouder' }); adj = await c.recoveryAdjustmentForToday(['q']); c.sessionRxAdj['vt2'] = adj;
  const ov2 = c.applySessionRecovery('vt2', [item({ suggestedWeight: 87.5, _weightOverride: true })])[0];
  ok(adj.rpeDelta === -0.5 && adj.inputs.painMuscle === 'schouder' && ov2.suggestedWeight === 87.5 && ov2._rxOverrideBypass === true, 'override + pijn (+dagfactor 0.95): gewicht exact 87.5, pijn in provenance');
  const ovPainOnly = sandbox({ factor: 1, hrv: [], painToday: 'schouder' }); const adjPO = await ovPainOnly.recoveryAdjustmentForToday(['q']); ovPainOnly.sessionRxAdj['po'] = adjPO;
  const po = ovPainOnly.applySessionRecovery('po', [item({ suggestedWeight: 87.5, _weightOverride: true })])[0];
  ok(adjPO.rpeDelta === 0 && po.suggestedWeight === 87.5 && adjPO.inputs.painMuscle === 'schouder', 'alleen pijn: geen numerieke delta (rule), gewicht 87.5, pijn wel zichtbaar in provenance');
  const ovg = c.applyRecoveryToGuidedPlan({ items: [{ id: 'ex', sets: 4, reps: '5', weight: 87.5, _weightOverride: true }] }, adj).items[0];
  ok(ovg.weight === 87.5 && ovg._rxOverrideBypass === true, 'Guided: override finaal');
  // detraining + readiness ieder één keer: resolver (override → geen detraining), daarna readiness op niet-override
  const r = c.resolveWorkingWeight('ex', { reps: 5, rpe: 8, prev: { weight: 100, reps: 5, date: '2026-08-24' }, override: 87.5, oneRM: 117 });
  ok(r.suggested === 87.5 && r.reason === 'override' && r.factor === 1, 'resolver: override → geen detraining (bestaand)');
  const r2 = c.resolveWorkingWeight('ex', { reps: 5, rpe: 8, prev: { weight: 100, reps: 5, date: '2026-08-24' }, oneRM: 117 });
  const after = c.applySessionRecovery('vt2', [item({ suggestedWeight: r2.suggested })])[0];
  ok(r2.factor === 0.94 && after.suggestedWeight === c.roundKg(r2.suggested * c.recoveryWeightFactor('5', -0.5)), 'detraining (×0.94, in resolver) en readiness (factor, in applySessionRecovery) ieder precies één keer, in deze volgorde');

  // ── Explainability ──
  const blk = c.buildPrevBlock({ weight: 100, reps: 5, date: '2026-09-12' }, Object.assign(item(), { _rxAdjusted: true, _rxSetsDelta: 0, _rxRpeDelta: -0.5, _rxOverrideBypass: true, _rxInputs: adj.inputs }), 87.5, null);
  ok(/Herstel vandaag: RPE -0\.5 · gewicht blijft jouw eigen instelling \(pijn: schouder, herstel-dagfactor 0\.95\)/.test(blk), 'Normal-uitleg: delta + override-bypass + gebruikte inputs');
  c.recoveryAdjustToast(adj); ok(/pijn: schouder/.test(c._toasts[0] || ''), 'toast toont gebruikte inputs');

  // ── Statisch: programmapad zonder pre-Brzycki-mutatie; canonical pad; post-set opt-in ──
  const L = LAUNCH.replace(/\/\/[^\n]*/g, '');
  ok(!/rpe=Math\.max\(5,Math\.min\(10,rpe\+\(adjustment\.rpeDelta/.test(L) && !/sets=Math\.max\(1,sets\+\(adjustment\.setsDelta/.test(L), 'Programma: geen pre-Brzycki sets/RPE-mutatie meer');
  ok(/sessionRxAdj\[ctxT\]=window\._tkProgRxAdj/.test(L) && /window\._tkProgRxAdj=\(adjustment&&\(adjustment\.rpeDelta\|\|adjustment\.setsDelta\)\)\?adjustment/.test(L), 'Programma: readiness via sessionRxAdj[ctxT] → applySessionRecovery (canonical pad)');
  ok(/recoveryAdjustmentForToday\(\[\.\.\.muscleSet\],\{voelt:progCheckinCtx\.voelt,painMuscle:\(progCheckinCtx\.pijn\|\|null\)\}\)/.test(EVAL) && !/computeProgAdjustment\(df\.factor/.test(EVAL), 'evaluateProgAdjustment gebruikt de canonical functie met check-in-inputs');
  ok(/sessionRxAdj\[t\]=_adj/.test(START_T) && /recoveryAdjustmentForToday\(\[\.\.\.new Set\(_mus\)\]\)/.test(START_T), 'Normal (startT): zelfde canonical functie → sessionRxAdj');
  ok(!/painMuscle:null|,\s*null\)\|\|\{rpeDelta/.test(SRC.recoveryAdjustmentForToday.replace(/\/\/[^\n]*/g, '')), 'Normal geeft pijn niet meer hard als null door');
  ok(/todayPainMuscle\(\)/.test(SRC.recoveryAdjustmentForToday) && /checkin_conditions/.test(SRC.todayPainMuscle), 'pijn uit persisted checkin_conditions');
  ok(/applyAdviceToSet\(/.test(POSTSET) && /<button/.test(POSTSET) && !/inp\.value=|nextInp\.value=/.test(POSTSET.replace(/\/\/[^\n]*/g, '')), 'DEC-PROG-001 blijft opt-in (knop), overschrijft niets stil');
  ok((html.match(/recoveryWeightFactor\(/g) || []).length >= 3 && !/Math\.pow|0\.9\d\s*\*|\*\s*0\.9\d/.test(SRC.applySessionRecovery + SRC.applyRecoveryToGuidedPlan), 'geen tweede gewichtsformule; alleen recoveryWeightFactor (CalcCore-ratio)');
  ok(!/computeProgAdjustment\(/.test(extractFn('buildCtx') || ''), 'AI/Context rekent geen readiness');

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fReadinessParity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
