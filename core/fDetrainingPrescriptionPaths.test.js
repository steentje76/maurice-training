/* fDetrainingPrescriptionPaths.test.js — RETURN AFTER ABSENCE / DELOAD, FASE B1.
 * Bewijst dat DEC-DETRAIN-001 (detraining.v1, DETRAINING_RULES_V1) op ALLE relevante
 * kracht-prescription-paden via de canonical resolveWorkingWeight() loopt:
 * Preview (previewResolveItemWeight) = Programma (resolveProgramItemWeight /
 * launchProgramTrainScreen) = Normal execution (computeProgPrefill / ex.suggestedWeight).
 * Draait de ECHTE productiefuncties uit index.html met de ECHTE cores en een stub-sbGet.
 *
 * Draai: node core/fDetrainingPrescriptionPaths.test.js
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
const FNS = ['resolveWorkingWeight', 'detrainingFactor', 'daysBetweenDates', 'suggestWeightForRepsRpe', 'repsPrefillFromRange',
  'loadStrengthBasis', 'strengthBasisProvenance', 'getOneRM', 'oneRMFor', 'manualOneRMDate', 'strengthBasisText',
  'resolvePrescriptionRepTarget', 'resolveProgramItemWeight', 'computeProgPrefill', 'loadPrevPerformance', 'previewResolveItemWeight',
  'previewResolveItemDetrain', 'previewRepsMid', 'previewOneRM', 'estimatedOneRM', 'epley1RMRaw', 'roundKg', 'buildPrevBlock'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'functie gevonden: ' + n); });
const RULES_SRC = (html.match(/const DETRAINING_RULES_V1=\{[\s\S]*?\n\};/) || [''])[0];
ok(RULES_SRC.includes("id:'detraining_conservative', version:1"), 'DETRAINING_RULES_V1 gevonden');
const LAUNCH = extractFn('launchProgramTrainScreen'), RENDER = extractFn('renderTrainScreen'), BUILD_ITEMS = extractFn('buildResolvedExecutionItems');
ok(LAUNCH && RENDER && BUILD_ITEMS, 'programmapad/Normal execution/Preview-bouwfuncties gevonden');

const TODAY = '2026-09-13';
function sandbox(sessionsByEx) {
  const ctx = {
    DecisionCore, CalcCore, console, Date, Math, JSON, Promise, Object, Array, String, Number, isFinite, isNaN, parseFloat, parseInt, encodeURIComponent,
    td: () => TODAY, estOneRMCache: {}, previewCtx: null, window: {},
    sbGet: async (table, q) => { if (table !== 'sessions') return []; const m = /exercise_id=eq\.([^&]+)/.exec(q); return (sessionsByEx[decodeURIComponent(m[1])] || []).slice(); },
    prFor: () => null, escHtml: (x) => String(x)
  };
  vm.createContext(ctx);
  ctx.exerciseGoals = new Map(); ctx.localStorage = { getItem: () => null }; ctx.strengthBasisCache = {};
  vm.runInContext(RULES_SRC + '\nconst DETRAINING_RULES=DETRAINING_RULES_V1;\n' + FNS.map((n) => SRC[n]).join('\n'), ctx);
  return ctx;
}
const dAgo = (n) => { const d = new Date(Date.parse(TODAY + 'T00:00:00Z') - n * 86400000); return d.toISOString().slice(0, 10); };
// Historie: laatste uitvoering 100 kg × 5 @ RPE 8 (Epley ≈ 116.7 → 1RM 117), N dagen geleden
const hist = (n) => ({ 'ex-squat': [{ weight: 100, reps: 5, rpe: 8, date: dAgo(n) }, { weight: 95, reps: 5, rpe: 8, date: dAgo(n + 7) }] });

(async () => {
  // ── R: regel ongewijzigd ──
  ok(/\{maxDays:7,\s*factor:1\.00\}/.test(RULES_SRC) && /\{maxDays:14,\s*factor:0\.97\}/.test(RULES_SRC) && /\{maxDays:28,\s*factor:0\.94\}/.test(RULES_SRC) && /\{maxDays:56,\s*factor:0\.90\}/.test(RULES_SRC) && /\{maxDays:90,\s*factor:0\.85\}/.test(RULES_SRC) && /\{maxDays:Infinity,\s*factor:0\.80\}/.test(RULES_SRC), 'R: DETRAINING_RULES_V1 banden exact ongewijzigd');
  // ── I: alle bandgrenzen tegen de BESTAANDE rule (DecisionCore) ──
  const c0 = sandbox(hist(0));
  [[0, 1.00, false], [7, 1.00, false], [8, 0.97, true], [14, 0.97, true], [15, 0.94, true], [21, 0.94, true], [28, 0.94, true], [29, 0.90, true], [56, 0.90, true], [57, 0.85, true], [90, 0.85, true], [91, 0.80, true], [365, 0.80, true]]
    .forEach(([d, f, a]) => { const r = c0.detrainingFactor(d); ok(r.factor === f && r.applicable === a && r.ruleId === 'detraining_conservative' && r.version === 1, 'I: ' + d + ' dagen → factor ' + f + ' (applicable ' + a + ')'); });
  const rn = c0.detrainingFactor(null); ok(rn.factor === 1.00 && rn.applicable === false && rn.days === null, 'H: null historie → factor 1.00, applicable:false');

  // ── D/E/B/N/J: cross-path bij 21 dagen en ≤7 dagen ──
  for (const [days, factor] of [[3, 1.00], [21, 0.94]]) {
    const c = sandbox(hist(days));
    const prev = await c.loadPrevPerformance('ex-squat');
    ok(prev && prev.weight === 100 && prev.reps === 5 && prev.date === dAgo(days), 'D: gedeelde prev-bron levert laatste uitvoering incl. date (' + days + ' d)');
    eq(c.estOneRMCache['ex-squat'], 117, 'D: estOneRMCache gevuld door de gedeelde bron (recente representatieve e1RM, CALC-STR-006)');
    // Preview
    c.previewCtx = { prevMap: { 'ex-squat': prev }, overrides: {} };
    const wPreview = c.previewResolveItemWeight({ exercise_id: 'ex-squat', reps: '5', rpe: 8 });
    const dPreview = c.previewResolveItemDetrain({ exercise_id: 'ex-squat', reps: '5', rpe: 8 });
    // Programma
    const rProg = c.resolveProgramItemWeight('ex-squat', '5', 8, prev);
    // Normal execution prog-tak
    const pre = c.computeProgPrefill({ id: 'ex-squat', reps: '5', rpe: 8, sets: 3 }, prev, 117);
    // referentie: canonical resolver + rule, geen eigen formule in de test
    const base = c.suggestWeightForRepsRpe(117, 5, 8);
    const expected = c.roundKg(base * factor);
    ok(wPreview != null && wPreview === expected, 'A/F/G: Preview = base × ' + factor + ' (' + days + ' d) = ' + expected);
    ok(rProg.suggested === expected && rProg.days === days && rProg.factor === factor, 'B/E: Programma via resolver met prev.date → ' + expected);
    ok(pre && pre.kg === expected, 'N: computeProgPrefill (Normal execution prog-tak) = ' + expected);
    ok(wPreview === rProg.suggested && rProg.suggested === pre.kg, 'J: cross-path gelijkheid Preview = Programma = Normal execution (' + days + ' d)');
    ok(dPreview && dPreview.days === days && dPreview.factor === factor, 'P: provenance (days/factor/rule) beschikbaar voor uitleg');
    if (factor < 1) {
      ok(/^detraining:21d$/.test(rProg.reason) && pre.detrain && pre.detrain.reason === 'detraining:21d', 'F: reason detraining:21d op beide paden');
      const blk = c.buildPrevBlock(prev, { id: 'ex-squat', reps: '5' }, pre.kg, pre.detrain);
      ok(blk.includes('Je deed deze oefening 21 dagen niet — daarom starten we vandaag iets conservatiever.'), '13: bestaande F0.7L-uitleg in Normal execution (buildPrevBlock)');
    } else {
      ok(rProg.reason === 'baseline' && rProg.applicable !== true, 'G: ≤7 dagen → baseline, geen detraining');
      const blk = c.buildPrevBlock(prev, { id: 'ex-squat', reps: '5' }, pre.kg, pre.detrain);
      ok(!blk.includes('daarom starten we vandaag iets conservatiever'), '13: geen uitleg zonder detraining');
    }
    // L: precies één keer toegepast (geen double detraining): suggested == roundKg(base×factor), niet ×factor²
    ok(Math.abs(rProg.suggested - c.roundKg(base * factor * factor)) > 0.01 || factor === 1, 'L: detraining precies één keer toegepast (geen ×factor²)');
  }
  // ── K: override precedence ──
  const co = sandbox(hist(21)); const prev21 = await co.loadPrevPerformance('ex-squat');
  const ro = co.resolveWorkingWeight('ex-squat', { reps: 5, rpe: 8, prev: prev21, override: 87.5 });
  ok(ro.suggested === 87.5 && ro.reason === 'override' && ro.factor === 1.00, 'K: expliciete override wint, geen detraining erop (F0.7L-semantiek)');
  co.previewCtx = { prevMap: { 'ex-squat': prev21 }, overrides: { 'ex-squat': 87.5 } };
  eq(co.previewResolveItemWeight({ exercise_id: 'ex-squat', reps: '5', rpe: 8 }), 87.5, 'K: Preview respecteert override');
  // ── H: geen historie → null prev → factor 1.00, applicable false; zonder 1RM → no-base ──
  const cn = sandbox({}); const pn = await cn.loadPrevPerformance('ex-squat');
  eq(pn, null, 'H: geen sessies → prev null (geen fake prev/date)');
  const rnb = cn.resolveProgramItemWeight('ex-squat', '5', 8, null);
  ok(rnb.suggested === null && rnb.reason === 'no-base' && rnb.days === null, 'H: zonder 1RM/historie → no-base, geen verzonnen gewicht');
  const pnb = cn.computeProgPrefill({ id: 'ex-squat', reps: '5', rpe: 8 }, { weight: 80, reps: 5 }, null);
  eq(pnb.kg, 80, 'H: zonder 1RM valt computeProgPrefill terug op vorige gewicht als ruwe referentie (ongewijzigd)');
  // ── M: readiness/recovery-keten rekent niet met dagen (aparte laag, ongewijzigd) ──
  const RECADJ = extractFn('recoveryAdjustmentForToday') || '';
  ok(RECADJ && !/detrainingFactor|resolveWorkingWeight|daysBetweenDates/.test(RECADJ), 'M: recoveryAdjustmentForToday bevat geen detraining (aparte laag, geen dubbele toepassing)');
  ok(!/detrainingFactor\(/.test(RENDER) && !/DETRAINING_RULES/.test(RENDER), 'L: renderTrainScreen past zelf geen (tweede) detraining toe');

  // ── B/S/Q statisch: programmapad en Preview via resolver; geen directe formule; geen AI ──
  ok(/const _prev=await loadPrevPerformance\(ex\.id\)/.test(LAUNCH) && /resolveProgramItemWeight\(ex\.id,_reps,rpe,_prev\)/.test(LAUNCH), 'B: launchProgramTrainScreen gebruikt loadPrevPerformance + resolveProgramItemWeight');
  ok(!/suggestWeightForRepsRpe\(_1rm|getOneRM\(ex\.id\)\|\|estimatedOneRM\(ex\.id\)/.test(LAUNCH.replace(/\/\/[^\n]*/g, '')), 'B: geen directe suggestWeightForRepsRpe/1RM-shortcut meer op het programmapad');
  ok(/_detrain:_detrain/.test(LAUNCH), 'P: programma-item draagt resolver-provenance');
  ok(/resolveWorkingWeight\(ex\.id,\{reps:parseFloat\(repsForWeight\),rpe:ex\.rpe,prev:prevS\|\|null,oneRM/.test(SRC.computeProgPrefill) && !/suggestWeightForRepsRpe/.test(SRC.computeProgPrefill), 'N: computeProgPrefill delegeert aan de resolver');
  ok(/const prev=await loadPrevPerformance\(eid\)/.test(html) && /previewCtx\.prevMap=pmap/.test(html), 'D: Preview gebruikt dezelfde gedeelde prev-bron');
  ok(/resolveWorkingWeight\(id,\{reps:previewRepsMid\(it\),rpe:\(it\.rpe!=null\?it\.rpe:8\),prev:prev,override:override\}\)/.test(SRC.previewResolveItemWeight), 'A: Preview gebruikt resolver met prev+override');
  ok(/_detrain:previewResolveItemDetrain\(it\)/.test(BUILD_ITEMS), 'P: Preview-items dragen resolver-provenance naar Normal execution');
  const callers = (html.replace(/\/\/[^\n]*/g, '').match(/suggestWeightForRepsRpe\(/g) || []).length; // code, geen commentaar
  eq(callers, 2, '19: exact 2 voorkomens van suggestWeightForRepsRpe( (definitie + resolver-intern) — geen duplicate prescription-caller');
  ok(!/Math\.pow|Math\.exp|0\.94|0\.97|0\.90|0\.85|0\.80/.test(SRC.resolveProgramItemWeight + SRC.computeProgPrefill + SRC.loadPrevPerformance + SRC.previewResolveItemDetrain), 'Q: geen nieuwe detraining-formule/factor buiten DETRAINING_RULES_V1');
  ok(/rxWeight=\(prefillData&&prefillData\.kg!=null\)\?prefillData\.kg:\(ex\.suggestedWeight!=null\?ex\.suggestedWeight:null\)/.test(RENDER) && /window\._rxWeightMap\[ex\.id\]=rxWeight/.test(RENDER), 'O: _rxWeightMap = exact de getoonde prefill/prescription (ongewijzigd)');
  ok(/buildPrevBlock\(prevS, ex, rxWeight, ex\._detrain\|\|null\)/.test(RENDER), '13: Normal execution geeft provenance aan buildPrevBlock');
  ok(/decision_rules:DecisionCore\.Evidence\.decisionRulesSnapshot\(\(typeof DETRAINING_RULES!=='undefined'\)\?DETRAINING_RULES:null\)/.test(html), 'P: instance-snapshot behoudt decision_rules-provenance (ongewijzigd)');
  const BUILD_CTX = extractFn('buildCtx') || '';
  ok(!/detrainingFactor|resolveWorkingWeight|DETRAINING_RULES/.test(BUILD_CTX), 'S: Context/AI rekent geen detraining (geen AI-calculation)');
  ok(!/tkEnduranceCoachContext|activities/.test(SRC.resolveProgramItemWeight + SRC.loadPrevPerformance), 'U: endurance-paden ongeraakt');
  ok(/structuredRunningCloseOpenBlock/.test(html) && /intervalPrescription/.test(html), 'V: Structured Intervals B1 ongewijzigd aanwezig');

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fDetrainingPrescriptionPaths: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
