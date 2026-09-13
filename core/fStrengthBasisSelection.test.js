/* fStrengthBasisSelection.test.js — STRENGTH BASIS RECENCY, FASE B1 (CALC-STR-006, strength_basis.v1).
 * Bewijst met ECHTE productiecode (CalcCore.selectStrengthBasis + de app-helpers uit index.html):
 * recente representatieve prestatie = prescription-basis; historische piek blijft apart (analytics);
 * rep-PR is geen 1RM-basis; handmatige 1RM houdt precedence met provenance-datum; onbekende datum is
 * fail-safe (geen numerieke straf); geen dubbele straf met DEC-DETRAIN-001; één canonical selectie-helper.
 *
 * Draai: node core/fStrengthBasisSelection.test.js
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
  'resolveProgramItemWeight', 'computeProgPrefill', 'resolvePrescriptionRepTarget', 'loadStrengthBasis', 'loadPrevPerformance',
  'loadEstOneRM', 'strengthBasisProvenance', 'getOneRM', 'oneRMFor', 'prFor', 'manualOneRMDate', 'previewOneRM', 'estimatedOneRM',
  'previewResolveItemWeight', 'previewResolveItemDetrain', 'previewRepsMid', 'epley1RMRaw', 'roundKg', 'strengthBasisText', 'buildPrevBlock',
  'upsertExerciseGoalField'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'functie gevonden: ' + n); });
const RULES_SRC = (html.match(/const DETRAINING_RULES_V1=\{[\s\S]*?\n\};/) || [''])[0];
const TODAY = '2026-09-13';
const dAgo = (n) => new Date(Date.parse(TODAY + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
const S = (w, reps, d) => ({ weight: w, reps, rpe: 8, date: dAgo(d), created_at: dAgo(d) + 'T10:00:00Z' });

function sandbox(sessions, goals) {
  const ctx = {
    DecisionCore, CalcCore, console, Date, Math, JSON, Promise, Object, Array, String, Number, isFinite, isNaN, parseFloat, parseInt, encodeURIComponent,
    td: () => TODAY, estOneRMCache: {}, previewCtx: null, window: {}, localStorage: { getItem: () => null }, escHtml: (x) => String(x),
    exerciseGoals: new Map(goals ? [['ex', goals]] : []), strengthBasisCache: {},
    sbGet: async (t, q) => { const m = /limit=(\d+)/.exec(q); const rows = sessions.slice().sort((a, b) => b.date.localeCompare(a.date)); return rows.slice(0, m ? +m[1] : rows.length); }
  };
  vm.createContext(ctx);
  vm.runInContext(RULES_SRC + '\nconst DETRAINING_RULES=DETRAINING_RULES_V1;\n' + FNS.map((n) => SRC[n]).join('\n'), ctx);
  return ctx;
}
async function resolveAll(c) {
  const prev = await c.loadPrevPerformance('ex');
  c.previewCtx = { prevMap: { ex: prev }, overrides: {} };
  const preview = c.previewResolveItemWeight({ exercise_id: 'ex', reps: '5', rpe: 8 });
  const prog = c.resolveProgramItemWeight('ex', '5', 8, prev);
  const normal = c.computeProgPrefill({ id: 'ex', reps: '5', rpe: 8 }, prev, c.previewOneRM('ex'));
  return { prev, preview, prog, normal: normal ? normal.kg : null, basis: c.strengthBasisCache.ex };
}

(async () => {
  // ── CalcCore.selectStrengthBasis (pure) ──
  const b0 = CalcCore.selectStrengthBasis([S(100, 5, 3), S(120, 5, 120), S(60, 15, 1)], { maxReps: 10 });
  eq(b0.version, 'strength_basis.v1', 'CALC-STR-006 versie');
  ok(b0.recent && b0.recent.weight === 100 && b0.recent.reps === 5 && b0.recent.date === dAgo(3) && b0.recent.e1rm === 117, 'recent = meest recente representatieve prestatie (100×5, reps<=10), niet de 15-rep-set van gisteren');
  ok(b0.peak && b0.peak.e1rm === 140 && b0.peak.date === dAgo(120), 'peak = hoogste e1RM met datum (apart beschikbaar)');
  ok(b0.prev && b0.prev.reps === 15 && b0.prev.date === dAgo(1), 'prev = laatste rij ongeacht reps (detraining-datum / vorige keer)');
  ok(CalcCore.selectStrengthBasis([]).recent === null && CalcCore.selectStrengthBasis([]).peak === null, 'geen rijen → recent/peak null (geen fabricatie)');
  ok(CalcCore.selectStrengthBasis([S(80, 12, 2), S(70, 20, 5)]).recent === null, 'alleen >10-rep-sets → geen representatieve basis (recent null)');
  const unsorted = CalcCore.selectStrengthBasis([S(90, 5, 30), S(100, 5, 2)]); eq(unsorted.recent.weight, 100, 'sorteert zelf op datum (ongeordende input)');
  ok(!/Math\.pow|decay|verval|\*\s*0\.\d/.test(SRC.strengthBasisProvenance + SRC.loadStrengthBasis), 'geen decay/verval-formule in de basis-helpers');

  // ── Scenario A–F (vorige audit) op de echte prescription-paden ──
  let c = sandbox([S(120, 5, 1), S(115, 5, 8)]); let r = await resolveAll(c);
  eq(r.prog.oneRM, 140, 'A: verse hoge e1RM → basis 140'); eq(r.prog.suggested, 116.5, 'A: prescription 116,5');
  c = sandbox([S(100, 5, 3), S(100, 5, 10), S(120, 5, 120)]); r = await resolveAll(c);
  eq(r.prog.oneRM, 117, 'B: oude piek (120×5, 120 d) + recent 100×5 → basis = recente 117 (was 140)');
  eq(r.prog.suggested, 97.5, 'B: prescription 97,5 (was 116,5) — oude piek stuurt niet meer');
  ok(r.basis.peak && r.basis.peak.e1rm === 140, 'B: peak 140 blijft apart beschikbaar voor analytics');
  ok(r.preview === r.prog.suggested && r.prog.suggested === r.normal, 'B: Preview = Programma = Normal');
  eq(r.prog.strengthBasis.source, 'recent_e1rm', 'B: provenance source recent_e1rm'); eq(r.prog.strengthBasis.basisDate, dAgo(3), 'B: basisDate = datum van de recente sessie');
  eq(r.prog.strengthBasis.ageDays, 3, 'B: ageDays 3'); eq(r.prog.strengthBasis.dataQuality, 'high', 'B: dataQuality high (<=14 d, productcategorie)');
  c = sandbox([S(120, 5, 120)]); r = await resolveAll(c);
  eq(r.prog.oneRM, 140, 'C: alleen oude piek → die is óók de recente prestatie → basis 140'); eq(r.prog.factor, 0.80, 'C: detraining 120 d → 0.80 (DEC-DETRAIN-001 ongewijzigd)'); eq(r.prog.suggested, 93, 'C: prescription 93');
  eq(r.prog.strengthBasis.dataQuality, 'low', 'C: basis 120 d oud → dataQuality low (provenance, geen extra numerieke straf)');
  c = sandbox([S(100, 5, 3)], { one_rm: 150, pr: null, updated_at: '2026-01-05T10:00:00Z' }); r = await resolveAll(c);
  eq(r.prog.oneRM, 150, 'D: handmatige 1RM houdt precedence (150)'); eq(r.prog.suggested, 125, 'D: prescription 125 — geen automatische numerieke verlaging (productbesluit)');
  eq(r.prog.strengthBasis.source, 'manual_1rm', 'D: provenance manual_1rm'); eq(r.prog.strengthBasis.basisDate, '2026-01-05', 'D: basisDate uit exercise_goals.updated_at'); eq(r.prog.strengthBasis.dataQuality, 'low', 'D: oud → low');
  c = sandbox([S(100, 5, 3)], { one_rm: 150, pr: null, updated_at: null }); r = await resolveAll(c);
  eq(r.prog.oneRM, 150, 'D-null: handmatige 1RM zonder datum blijft basis'); eq(r.prog.strengthBasis.ageDays, null, 'fail-safe: onbekende datum → ageDays null'); eq(r.prog.strengthBasis.dataQuality, 'low', 'fail-safe: onbekende datum → low, geen fake datum');
  ok(/datum onbekend/.test(c.strengthBasisText(r.prog.strengthBasis)), 'uitleg: "datum onbekend" letterlijk, geen verzonnen datum');
  c = sandbox([S(100, 5, 3)], { one_rm: null, pr: 130, updated_at: null }); r = await resolveAll(c);
  eq(c.getOneRM('ex'), null, 'PR-proxy: getOneRM negeert het rep-PR (130) — geen 1RM'); eq(c.prFor('ex'), 130, 'PR-data blijft bestaan (prFor)');
  eq(r.prog.oneRM, 117, 'D2: basis = recente e1RM 117, niet PR 130'); eq(r.prog.suggested, 97.5, 'D2: prescription 97,5 (was 108,5)');
  c = sandbox([S(120, 5, 21), S(118, 5, 28)]); r = await resolveAll(c);
  eq(r.prog.oneRM, 140, 'E: 21 d absence, laatste = piek → basis 140'); eq(r.prog.factor, 0.94, 'E: detraining 0.94'); eq(r.prog.suggested, 109.5, 'E: prescription 109,5 (ongewijzigd)');
  eq(r.prog.strengthBasis.ageDays, 21, 'E: basis-leeftijd = detraining-dagen (zelfde sessie) → geen dubbele straf: alleen DEC-DETRAIN-001 corrigeert');
  c = sandbox([S(100, 5, 21), S(120, 5, 60)]); r = await resolveAll(c);
  eq(r.prog.oneRM, 117, 'E2: piek 60 d, laatste 100×5 (21 d) → basis recente 117 (was 140)'); eq(r.prog.suggested, 91.5, 'E2: prescription 91,5 (was 109,5)'); eq(r.prog.factor, 0.94, 'E2: detraining blijft 0.94 (één keer)');
  c = sandbox([]); r = await resolveAll(c);
  eq(r.prog.oneRM, null, 'F: geen historie → no-base'); eq(r.prog.reason, 'no-base', 'F: reason no-base'); eq(r.prog.strengthBasis.source, 'none', 'F: provenance none');
  c = sandbox([S(80, 12, 2), S(120, 5, 40)]); r = await resolveAll(c);
  eq(r.prog.oneRM, 140, 'reps>10 zijn geen representatieve basis: laatste ≤10-rep-set (120×5, 40 d) telt'); eq(r.prev.reps, 12, 'prev (detraining-datum) blijft de laatste sessie (12 reps, 2 d)'); eq(r.prog.days, 2, 'detraining op laatste uitvoering (2 d)');

  // ── Detraining-suite-semantiek ongewijzigd ──
  [[0, 1.00], [7, 1.00], [8, 0.97], [14, 0.97], [15, 0.94], [28, 0.94], [29, 0.90], [56, 0.90], [57, 0.85], [90, 0.85], [91, 0.80]].forEach(([d, f]) => { const x = c.detrainingFactor(d); ok(x.factor === f, 'DEC-DETRAIN-001 ' + d + ' d → ' + f + ' ongewijzigd'); });
  ok(/\{maxDays:7,\s*factor:1\.00\}[\s\S]*\{maxDays:Infinity,\s*factor:0\.80\}/.test(RULES_SRC), 'DETRAINING_RULES_V1 ongewijzigd');

  // ── Normal execution: loadEstOneRM via dezelfde helper; uitleg ──
  c = sandbox([S(100, 5, 3), S(120, 5, 120)]);
  eq(await c.loadEstOneRM('ex'), 117, 'loadEstOneRM (Normal execution) = recente basis via loadStrengthBasis (geen eigen max-selectie)');
  const blk = c.buildPrevBlock({ weight: 100, reps: 5, date: dAgo(3) }, { id: 'ex', reps: '5' }, 97.5, { days: 3, factor: 1, reason: 'baseline', basis: { source: 'recent_e1rm', value: 117, basisDate: dAgo(3), ageDays: 3, sampleReps: 5, dataQuality: 'high' } });
  ok(/Basis: geschat 1RM 117 kg uit je sessie van/.test(blk), 'Normal execution toont compacte basisbron/datum');
  ok(!/%/.test(c.strengthBasisText({ source: 'recent_e1rm', value: 117, basisDate: dAgo(3), ageDays: 3, sampleReps: 5, dataQuality: 'high' })), 'uitleg zonder percentages');

  // ── Static gates: één canonical selectie-helper; PR-proxy weg; provenance-datum bij manual ──
  const code = html.replace(/\/\/[^\n]*/g, '');
  eq((code.match(/if\(!best\|\|est>best\)best=est/g) || []).length, 0, 'static: geen losse "max over 30"-selectie meer in index.html');
  eq((code.match(/CalcCore\.selectStrengthBasis\(/g) || []).length, 3, 'static: selectStrengthBasis gebruikt door helper + progress-context + stats (peak = analytics)');
  ok(!/return prFor\(exId\)\|\|null;/.test(SRC.getOneRM), 'static: getOneRM zonder prFor-fallback');
  ok(/patch\.updated_at=\(value==null\?null:new Date\(\)\.toISOString\(\)\)/.test(SRC.upsertExerciseGoalField) && /if\(field==='one_rm'\)/.test(SRC.upsertExerciseGoalField), 'static: updated_at alleen bij one_rm-wijziging');
  ok(fs.existsSync(path.join(ROOT, 'migratie_v564.sql')) && /add column if not exists updated_at timestamptz null/.test(fs.readFileSync(path.join(ROOT, 'migratie_v564.sql'), 'utf8')), 'migratie_v564: nullable updated_at, idempotent');
  ok(/out\.strengthBasis=/.test(SRC.resolveWorkingWeight), 'resolver draagt strengthBasis-provenance');
  ok(!/strengthBasis|selectStrengthBasis/.test(extractFn('buildCtx') || ''), 'AI/Context rekent niets met de basis');
  ok(/CALC-STR-006/.test(fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8')), 'CALC-STR-006 geregistreerd');

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fStrengthBasisSelection: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
