/* fReplacementPrescription.test.js — GAP-P3-033 (+031a): gewisselde/toegevoegde oefeningen gebruiken
 * dezelfde canonical prescription-keten als normale oefeningen (loadStrengthBasis → CALC-STR-006 →
 * resolveWorkingWeight → DEC-DETRAIN-001 → DEC-RECADJ-001 via applySessionRecovery). Echte productie-
 * functies uit index.html + echte CalcCore/DecisionCore; stub-DB levert alleen rijen.
 *
 * Draai: node core/fReplacementPrescription.test.js
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
const FNS = ['canonicalNewExerciseItem', 'loadStrengthBasis', 'loadPrevPerformance', 'strengthBasisProvenance', 'resolveWorkingWeight', 'detrainingFactor',
  'daysBetweenDates', 'suggestWeightForRepsRpe', 'repsPrefillFromRange', 'resolvePrescriptionRepTarget', 'previewOneRM', 'estimatedOneRM', 'getOneRM',
  'oneRMFor', 'manualOneRMDate', 'roundKg', 'applySessionRecovery', 'recoveryWeightFactor', 'computeProgAdjustment', 'epley1RMRaw'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'functie gevonden: ' + n); });
const RULES_SRC = (html.match(/const DETRAINING_RULES_V1=\{[\s\S]*?\n\};/) || [''])[0];
const CONFIRM = extractFn('confirmSwapExercise'), REPLACE = extractFn('execReplaceExercise'), ADD = extractFn('addExConfirm'), RENDER = extractFn('renderTrainScreen');
const GW_REPLACE = (html.match(/function replaceEx\(newId\)\{[\s\S]*?persist\(\);return true;\}/) || [''])[0];
const GW_ASYNC = (html.match(/async function replaceExAsync\(newId\)\{[^\n]*/) || [''])[0];
ok(CONFIRM && REPLACE && ADD && RENDER && GW_REPLACE && GW_ASYNC, 'swap/replace/add/guided-functies gevonden');
const TODAY = '2026-09-14';
const dAgo = (n) => new Date(Date.parse(TODAY + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
const S = (w, r, d) => ({ weight: w, reps: r, rpe: 8, date: dAgo(d) });

function sandbox(sessionsByEx, goals) {
  const ctx = {
    DecisionCore, CalcCore, console, Date, Math, JSON, Promise, Object, Array, String, Number, isFinite, isNaN, parseFloat, parseInt, encodeURIComponent,
    td: () => TODAY, estOneRMCache: {}, strengthBasisCache: {}, exerciseGoals: new Map(Object.entries(goals || {})), localStorage: { getItem: () => null }, window: {},
    resolveCardioType: () => null, sessionRxAdj: {},
    sbGet: async (t, q) => { if (t !== 'sessions') return []; const m = /exercise_id=eq\.([^&]+)/.exec(q); const rows = (sessionsByEx[decodeURIComponent(m[1])] || []).slice().sort((a, b) => b.date.localeCompare(a.date)); const l = /limit=(\d+)/.exec(q); return rows.slice(0, l ? +l[1] : rows.length); }
  };
  vm.createContext(ctx);
  vm.runInContext(RULES_SRC + '\nconst DETRAINING_RULES=DETRAINING_RULES_V1;\n' + FNS.map((n) => SRC[n]).join('\n'), ctx);
  return ctx;
}
// A = oude oefening (100 kg laatste), B = nieuwe oefening met eigen canonical basis (recent 60×5 → e1RM 70 → 5@8 ≈ 58.5)
const A = [S(100, 5, 2)], B_RECENT = [S(60, 5, 3)];
const intentA = { id: 'A', naam: 'A', type: 'strength', sets: 4, reps: '5', rpe: '8', rest: 120, suggestedWeight: 100, _detrain: { days: 2, factor: 1, reason: 'baseline' }, _weightOverride: true };

(async () => {
  // 1. SWAP A→B: B's canonical prescription, niet 100
  let c = sandbox({ A, B: B_RECENT });
  let rx = await c.canonicalNewExerciseItem('B', intentA);
  const refB = c.roundKg(c.suggestWeightForRepsRpe(70, 5, 8));
  eq(rx.suggestedWeight, refB, '1: swap A(100 kg)→B gebruikt B canonical basis (' + refB + '), niet 100');
  ok(rx._weightOverride === false && rx._rxOverrideBypass === false && rx._rxAdjusted === false, '1: oude override-/readiness-vlaggen van A worden NIET meegenomen');
  ok(rx._detrain && rx._detrain.basis && rx._detrain.basis.source === 'recent_e1rm' && rx._detrain.basis.basisDate === dAgo(3), '1/7: provenance = basis van B (recent_e1rm, datum van B-sessie)');
  const merged = { ...intentA, id: 'B', ...rx };
  ok(merged.sets === 4 && merged.reps === '5' && merged.rpe === '8' && merged.rest === 120, '9: workout-intent (sets/reps/RPE/rest) blijft volgens #338 behouden');
  // 2. B: recente lagere prestatie wint van historische piek
  c = sandbox({ B: [S(60, 5, 3), S(90, 5, 100)] }); rx = await c.canonicalNewExerciseItem('B', intentA);
  eq(rx.suggestedWeight, refB, '2: CALC-STR-006 recent (60×5) wint van piek (90×5, 100 d)'); ok(c.strengthBasisCache.B.peak.e1rm === 105, '2: piek blijft apart beschikbaar');
  // 3. B: 21 dagen inactiviteit → detraining exact één keer
  c = sandbox({ B: [S(60, 5, 21)] }); rx = await c.canonicalNewExerciseItem('B', intentA);
  ok(rx._detrain.days === 21 && rx._detrain.factor === 0.94 && rx.suggestedWeight === c.roundKg(c.suggestWeightForRepsRpe(70, 5, 8) * 0.94), '3: DEC-DETRAIN-001 0.94 precies één keer (via resolver, prev.date van B)');
  // 4. B + slechte readiness → readiness één keer ná resolver via applySessionRecovery
  c = sandbox({ B: B_RECENT }); c.sessionRxAdj.t1 = DecisionCore.computeProgAdjustment(0.85, [], null, null); // readiness al bekend vóór de swap
  rx = await c.canonicalNewExerciseItem('B', intentA);
  eq(rx.suggestedWeight, refB, '4: helper levert het ONaangepaste resolver-gewicht (readiness pas via applySessionRecovery)');
  const after = c.applySessionRecovery('t1', [{ ...intentA, id: 'B', ...rx, _t: 't1' }])[0];
  eq(after.suggestedWeight, c.roundKg(refB * c.recoveryWeightFactor('5', -1.5)), '4: readiness (DEC-RECADJ-001) exact één keer ná resolver, op B-gewicht');
  ok(after.rpe === '6.5' && after.sets === 3 && after._rxAdjusted === true, '4: sets/RPE volgen readiness');
  const twice = c.applySessionRecovery('t1', [{ ...intentA, id: 'B', ...rx, _t: 't1' }])[0]; eq(twice.suggestedWeight, after.suggestedWeight, '4: idempotent (geen tweede toepassing)');
  // 5. B met expliciete geldige override (nieuw, voor B zelf) → override finaal
  const rOv = c.resolveWorkingWeight('B', { reps: 5, rpe: 8, prev: c.strengthBasisCache.B.prev, override: 55 });
  const ovItem = c.applySessionRecovery('t1', [{ ...intentA, id: 'B', suggestedWeight: rOv.suggested, _weightOverride: true, _t: 't1' }])[0];
  ok(rOv.suggested === 55 && rOv.reason === 'override' && ovItem.suggestedWeight === 55 && ovItem._rxOverrideBypass === true, '5: expliciete override voor B blijft exact 55 (detraining/readiness raken het niet; #349)');
  // 6. B zonder basis → geen verzonnen gewicht, geen A-lekkage
  c = sandbox({ A, B: [] }); rx = await c.canonicalNewExerciseItem('B', intentA);
  ok(rx.suggestedWeight === null && rx._detrain.reason === 'no-base' && rx._detrain.basis.source === 'none', '6: geen basis → suggestedWeight null (no-base), geen 100 kg van A');
  // 7. ADD: zelfde helper, zelfde semantiek (default intent 4×6-8 @8)
  c = sandbox({ B: B_RECENT }); const addRx = await c.canonicalNewExerciseItem('B', { sets: 4, reps: '6-8', rpe: '8' });
  eq(addRx.suggestedWeight, c.roundKg(c.suggestWeightForRepsRpe(70, 6, 8)), '7: toegevoegde oefening: canonical basis van B met low-end reps (6) van de intent');
  // 8. Guided replaceEx: prev.date via strengthBasisCache → detraining correct
  ok(/prev:\(cb&&cb\.prev\)\|\|null/.test(GW_REPLACE) && /strengthBasisCache\[newId\]/.test(GW_REPLACE), '8: Guided replaceEx geeft canonical prev (incl. date) aan de resolver');
  ok(/await loadStrengthBasis\(newId\)/.test(GW_ASYNC) && /GW\.replaceExAsync\(alts\[0\]\.catalog_id\)/.test(html), '8: Guided laadt de basis vóór replaceEx (replaceExAsync) op het call-pad');
  ok(/window\._tkGuidedRxAdj/.test(GW_REPLACE) && /c\._weightOverride=false; c\._rxOverrideBypass=false/.test(GW_REPLACE), '8: Guided past readiness één keer (opgeslagen adjustment) toe en reset override-vlaggen');
  ok(!/c\.prev&&c\.prev\.weight!=null\)\?c\.prev\.weight/.test(GW_REPLACE.replace(/\/\/[^\n]*/g, '')), '8: Guided valt niet meer terug op guided-historie-gewicht (geen verzonnen basis)');
  // 10. volgende logging: nieuwe identity → nieuwe CALC-STR-006-basis
  c = sandbox({ B: [S(58.5, 5, 0), S(60, 5, 3)] }); const b2 = await c.loadStrengthBasis('B');
  ok(b2.recent.weight === 58.5 && b2.recent.date === TODAY, '10: na loggen onder de nieuwe identity is die sessie de nieuwe recente basis');

  // ── Statisch: swap/replace/add via helper; geen prevS-fallback van A; geen dubbele readiness ──
  ok(/const _rx=await canonicalNewExerciseItem\(newId, sessionExtra\[idx\]\)/.test(CONFIRM) && !/suggestedWeight:null/.test(CONFIRM), 'confirmSwapExercise via canonicalNewExerciseItem (geen suggestedWeight:null)');
  ok(/canonicalNewExerciseItem\(replaced\.id, old\)/.test(REPLACE) && /canonicalNewExerciseItem\(replaced\.id, sessionExtra\[sxIdx\]\)/.test(REPLACE), 'execReplaceExercise: beide spiegels canonical');
  ok(/async function addExConfirm/.test(ADD) && /await canonicalNewExerciseItem\(ex\.id, extra\)/.test(ADD), 'addExConfirm: toegevoegde oefening canonical');
  ok(!/recoveryWeightFactor|applySessionRecovery|computeProgAdjustment/.test(SRC.canonicalNewExerciseItem), 'helper past zelf geen readiness toe (dat doet de bestaande route één keer)');
  ok(!/suggestedWeight:\s*(intent|old|sessionExtra)/.test(SRC.canonicalNewExerciseItem), 'helper kopieert nooit een gewicht van de oude oefening');
  ok(/\{kg:prevS\.weight/.test(RENDER), 'bestaande no-basis-fallback in renderTrainScreen ongewijzigd (prevS is altijd keyed op het NIEUWE id)');
  ok(/\{maxDays:7,\s*factor:1\.00\}[\s\S]*\{maxDays:Infinity,\s*factor:0\.80\}/.test(RULES_SRC), 'DEC-DETRAIN-001 ongewijzigd');

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fReplacementPrescription: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
