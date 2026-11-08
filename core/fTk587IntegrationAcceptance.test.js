'use strict';
/* TK #587 x main (#504/#603) — cruciale acceptatieproef uit de integratie-opdracht.
 *
 * Synthetisch programma met acht oefeningen, uitgevoerd met de ECHTE handlers uit
 * index.html: oorspronkelijke oefeningen loggen (decimaal 67,5), een niet-uitgevoerde
 * oefening vervangen door een MoveKit-catalogusoefening, een gedeeltelijk uitgevoerde
 * oefening vervangen (uitgevoerde sets blijven onder de oorspronkelijke ID), een extra
 * oefening en een extra werkset toevoegen, onderbreken (procesherstart via de echte
 * draft-serializer/-restorer), hervatten, met een offline-fout afronden, opnieuw
 * afronden (idempotent) en daarna planning, uitvoering, opgeslagen rijen en historie
 * vergelijken. Geen productieaccount, geen netwerk, geen databasewrites.
 *
 * Draai: node core/fTk587IntegrationAcceptance.test.js
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync(process.env.TK587_SOURCE || path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r/g, '');
function fn(name) {
  const start = html.search(new RegExp('(?:async )?function ' + name + '\\('));
  assert(start >= 0, 'missing ' + name);
  return html.slice(start, html.indexOf('\n}', start) + 2);
}
let pass = 0;
function ok(cond, label) { assert(cond, label); pass++; }

const OWNER_A = 'synthetic-owner-A', OWNER_B = 'synthetic-owner-B';
const CATALOG = {
  'TK-000500': { catalog_id: 'TK-000500', source: { provider: 'movekit', provider_id: 'mk-synthetic-500' }, identity: { name: 'Synthetic Catalog Row' } },
  'TK-000501': { catalog_id: 'TK-000501', source: { provider: 'movekit', provider_id: 'mk-synthetic-501' }, identity: { name: 'Synthetic Catalog Press' } }
};
const PLAN = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

function env() {
  const elements = {}, storage = new Map(), noop = () => {};
  const c = {
    console, Date, Set, Map, Math, Number, JSON, Object, Array, String, parseFloat, parseInt, Promise,
    setTimeout: noop, clearTimeout: noop,
    // Execution state (same globals the app uses).
    execCompleteBusy: false, sessionLog: {}, sessionExtra: [], resolvedWorkout: null, TRAIN_CFG: {}, curT: 'prog_synthetic8',
    execFocus: { prog_synthetic8: 0 }, execSkipped: {}, sessionProgramSnapshot: null, activeInstanceId: null, activePlannedAssignmentId: null,
    exercises: [], repPRCache: {}, exerciseGoals: new Map(), sessionPrBase: {}, BARBELL_EXERCISES: new Set(), lastSetDoneAt: {},
    pctSelection: {}, rpeManual: {}, warmupState: {}, cardioSplitMode: {}, cardioSplits: {}, manualKgSets: {}, sessionRxAdj: {},
    saveState: '', lastSaveTs: null, finishSessionBezig: false, trainStart: 0, pausedAccumMs: 0, swapCtx: null,
    owner: OWNER_A,
    document: {
      getElementById: id => elements[id] || null, querySelectorAll: () => [],
      createElement: () => { const holder = {}; Object.defineProperty(holder, 'innerHTML', { set(v) { holder.firstElementChild = { id: (v.match(/id="([^"]+)"/) || [])[1] }; } }); return holder; }
    },
    window: {},
    localStorage: { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
    normNumStr: v => v == null ? '' : String(v).replace(',', '.'), numNL: v => Number(String(v).replace(',', '.')),
    getEffectiveKg: (id, i) => Number(String(elements[`s-${id}-${i}-kg`]?.value || '').replace(',', '.')) || null,
    td: () => '2026-11-07', prFor: () => Infinity, nearestRepBucket: () => 10,
    updateProgress: noop, updateSummary: noop, scheduleAutosave: noop, refreshActiveSetBanner: noop, unlockAudio: noop,
    showPostSetAdvice: noop, showSetCompletionFeedback: noop, autoRestAfterSet: noop, updateSaveIndicator: noop,
    applySessionRecovery: (t, x) => x, applyExecutionFocus: noop, showSessionSummary: noop, confirmModal: async () => true,
    resolveCardioType: () => null, toast: m => { c.toasts.push(m); }, toasts: [],
    currentWorkoutElapsedMs: () => 1000, execSkipSet: t => c.execSkipped[t] || new Set(),
    closeModal: noop, openModal: noop, renderTrainScreen: async () => {}, stopTrainTimer: noop, tkErgDisconnectAll: noop,
    tkEigenaarUid: () => c.owner, TK504_TYPED_FK_SESSION_RELEASE: true, tk603LiveSource: Object.create(null),
    ExerciseCatalogService: { byId: id => CATALOG[id] || null },
    // Catalog picker objects as catalogToPickerEx produces them; personal rows keep owner fields.
    resolvePickerEx: (id, source = 'auto') => CATALOG[id] && source !== 'legacy'
      ? { id, name: CATALOG[id].identity.name, type: 'strength', _catalog: true, catalog_id: id }
      : { id, name: id, type: 'strength', scope: 'personal', user_id: c.owner },
    canonicalNewExerciseItem: async (id, intent) => ({ suggestedWeight: null, sets: intent && intent.sets, reps: intent && intent.reps }),
    buildWorkSetRow: (id, i) => `<div class="set-row" id="sr-${id}-${i}"></div>`,
    ensureSessionExerciseRows: async () => ({}), tkSessieOptsVoor: () => ({ status: 'confirmed' }), tkSessieUitkomst: noop,
    getExerciseMuscles: () => [], DecisionCore: { releaseRecord: () => ({ isRecord: false }) },
    newClientRowId: () => 'row-' + (++c.seq), seq: 0,
    server: new Map(), writes: 0, offline: new Set(),
    writeSessionRow: async row => { c.writes++; if (c.offline.has(row.exercise_id)) return false; c.server.set(row.id, JSON.parse(JSON.stringify(row))); return true; },
    createTrainingInstance: async ({ snapshot }) => { c.createdSnapshot = JSON.parse(JSON.stringify(snapshot)); return 'synthetic-instance-8'; },
    completeTrainingInstance: async (id, snapshot) => { c.completed = { id, snapshot: JSON.parse(JSON.stringify(snapshot)) }; return true; },
    clearTrainingDraft: () => { c.cleared = true; storage.delete('tk_draft_training'); },
    sbPatchQ: async (table) => { c.patched.push(table); return true; }, patched: [],
    generateSessionSummaryAI: async () => '', refreshStats: noop, escHtml: x => String(x)
  };
  c.window.toast = c.toast;
  c.elements = elements;
  c.field = (id, value = '') => { const set = new Set(); return elements[id] = { value, classList: { contains: x => set.has(x), toggle: x => set.has(x) ? set.delete(x) : set.add(x), add: x => set.add(x), remove: x => set.delete(x) }, querySelector: () => null, querySelectorAll: () => [] }; };
  vm.createContext(c);
  for (const n of ['tk504CatalogSourceRefFromCatalog', 'tk504CatalogSourceRefFromSelection', 'tk603CatalogRefFromPickerSelection',
    'tk504ValidateCatalogSourceRef', 'tk603LiveSourceKey', 'tk603CanUpdatePersonalRecord', 'tk603DraftOwnerMatches',
    'logSet', 'toggleSetDone', 'getSessionExs', 'execFocusGo', 'execCompleteExercise', 'execExerciseHasData', 'addWorkSet',
    'confirmSwapExercise', 'persistTrainingDraft', 'restoreExecutionDraft', 'buildStrengthSessionRow', 'finishSession', 'programHistoryHtml'])
    vm.runInContext(fn(n), c);
  return c;
}
function fill(c, id, rows) {
  rows.forEach(([kg, reps], k) => {
    const i = k + 1;
    c.field(`s-${id}-${i}-kg`, String(kg)); c.field(`s-${id}-${i}-reps`, String(reps)); c.field(`s-${id}-${i}-rpe`, '8');
    c.field(`sc-${id}-${i}`); c.field(`sr-${id}-${i}`);
  });
}
async function complete(c, id) {
  c.execFocus[c.curT] = c.getSessionExs(c.curT).findIndex(e => e.id === id);
  assert(c.execFocus[c.curT] >= 0, 'exercise visible: ' + id);
  await c.execCompleteExercise(c.curT);
}
const ids = c => c.getSessionExs(c.curT).map(e => e.id);
const loggedSets = log => Object.entries(log).flatMap(([id, l]) => (l.sets || []).filter(s => s && (s.kg || s.reps)).map(s => ({ id, kg: Number(s.kg), reps: Number(s.reps) })));

(async () => {
  let c = env();
  // ── Plan: eight exercises, immutable program snapshot (no instance yet: lazy create path).
  c.sessionProgramSnapshot = { version: 'program_snapshot.v1', items: PLAN.map(id => ({ exercise_id: id, sets: 3, reps: '8-10', rpe: '8' })) };
  const planFrozen = JSON.stringify(c.sessionProgramSnapshot);
  c.sessionExtra = PLAN.map(id => ({ id, _t: c.curT, type: 'strength', sets: 3, reps: '8-10' }));
  ok(ids(c).join() === PLAN.join(), 'A1 plan shows eight exercises');

  // ── Original exercises with decimal input.
  fill(c, 'p1', [['67,5', 10], ['67,5', 9], ['67,5', 8]]); await complete(c, 'p1');
  fill(c, 'p2', [[40, 10], [40, 10], [40, 10]]); await complete(c, 'p2');
  ok(c.sessionLog.p1.sets.every(s => s.kg === '67.5' && s.done === true), 'A2 decimal 67,5 kg stored exactly as 67.5 and confirmed');

  // ── Replace unperformed p3 by a MoveKit catalog exercise (tapped catalog tile).
  c.swapCtx = { fromId: 'p3', t: c.curT };
  await c.confirmSwapExercise('TK-000500', 'catalog');
  const swapped = c.sessionExtra.find(e => e.id === 'TK-000500');
  ok(swapped && swapped._replaces === 'p3', 'A3 replacement records the original slot');
  ok(swapped.tk504_catalog_ref && swapped.tk504_catalog_ref.provider_id === 'mk-synthetic-500', 'A3 catalog source claim only from the tapped catalog object');
  ok(!ids(c).includes('p3') && !c.sessionExtra.some(e => e.id === 'p3' && e._retainedPerformed), 'A3 unperformed original is not retained as performed');

  // ── A personal exercise with a catalog-shaped ID never gets a catalog claim (#603).
  c.swapCtx = { fromId: 'p5', t: c.curT };
  await c.confirmSwapExercise('TK-000501', 'legacy');
  const personal = c.sessionExtra.find(e => e.id === 'TK-000501');
  ok(personal && personal.tk504_catalog_ref == null, 'A4 personal row with catalog-shaped ID gets no catalog provenance');

  // ── Partially perform p4, then replace it: performed sets stay under p4 (TK584).
  fill(c, 'p4', [[50, 8]]); c.toggleSetDone('p4', 1);
  c.swapCtx = { fromId: 'p4', t: c.curT };
  await c.confirmSwapExercise('r4', 'auto');
  ok(c.sessionLog.p4.sets[0].kg === '50' && !c.sessionLog.r4, 'A5 performed p4 set retained, not copied to r4');
  ok(c.sessionExtra.some(e => e.id === 'p4' && e._retainedPerformed) && ids(c).includes('r4'), 'A5 both retained original and replacement visible');

  // ── Extra exercise added during execution (session-only), extra work set on p1.
  c.sessionExtra.push({ id: 'x9', _t: c.curT, type: 'strength', sets: 2, reps: '12' });
  const rows = [1, 2, 3].map(i => ({ id: 'sr-p1-' + i }));
  c.elements['body-p1'] = { querySelectorAll: () => rows, querySelector: () => null, appendChild: r => rows.push(r), insertBefore: r => rows.push(r) };
  c.addWorkSet('p1', 'strength');
  ok(rows.length === 4 && c.sessionLog.p1._workSetCount === 4, 'A6 extra work set row created');
  fill(c, 'p1', [['67,5', 10], ['67,5', 9], ['67,5', 8], ['62,5', 12]]);
  await complete(c, 'p1');
  ok(c.sessionLog.p1.sets.length === 4 && c.sessionLog.p1.sets[3].kg === '62.5', 'A6 extra set logged as 4th set');

  // ── Interrupt: real draft serializer; process restart wipes memory.
  c.persistTrainingDraft(true);
  const raw = c.localStorage.getItem('tk_draft_training');
  ok(raw && JSON.parse(raw).owner_uid === OWNER_A, 'B1 draft bound to owner');
  const beforeRestart = { log: JSON.stringify(c.sessionLog), order: ids(c).join() };
  const draft = JSON.parse(raw);
  // Another account on the same device may not adopt the draft.
  c.owner = OWNER_B; ok(c.tk603DraftOwnerMatches(draft) === false, 'B2 account B cannot resume account A draft'); c.owner = OWNER_A;
  c.sessionLog = {}; c.sessionExtra = []; c.resolvedWorkout = null; c.sessionProgramSnapshot = null; c.execSkipped = {};
  ok(c.tk603DraftOwnerMatches(draft) === true, 'B3 owner A may resume');
  c.sessionLog = draft.sessionLog; c.sessionExtra = draft.sessionExtra; c.restoreExecutionDraft(draft);
  ok(JSON.stringify(c.sessionLog) === beforeRestart.log, 'B4 resumed log identical (decimal, extra set, retained sets)');
  ok(ids(c).join() === beforeRestart.order, 'B4 resumed the MODIFIED execution, not the original program');
  ok(JSON.stringify(c.sessionProgramSnapshot) === planFrozen, 'B4 original plan snapshot restored unchanged');

  // ── Continue after resume.
  fill(c, 'TK-000500', [[55, 10], [55, 10], [55, 9]]); await complete(c, 'TK-000500');
  fill(c, 'r4', [[30, 12], [30, 12]]); await complete(c, 'r4');
  fill(c, 'TK-000501', [[20, 15], [20, 15], [20, 15]]); await complete(c, 'TK-000501');
  fill(c, 'x9', [[12, 12], [12, 12]]); await complete(c, 'x9');
  // p6, p7, p8 intentionally not performed.

  const expected = loggedSets(c.sessionLog);
  const expectedVolume = expected.reduce((v, s) => v + s.kg * s.reps, 0);

  // ── Finish with one offline exercise: no clear, no false success.
  c.field('ai-summary-body');
  c.offline.add('r4');
  const warn = c.console; c.console = { ...console, warn: () => {} };
  await c.finishSession();
  c.console = warn;
  ok(!c.cleared && c.toasts.some(t => /mislukt|opnieuw/i.test(t)), 'C1 partial failure keeps draft and reports honestly');
  ok(c.createdSnapshot && JSON.stringify(c.createdSnapshot) === planFrozen, 'C1 lazily created instance stores the unchanged plan');
  const firstServer = c.server.size;

  // ── Retry online: idempotent, same row IDs, no duplicates.
  c.offline.clear(); c.finishSessionBezig = false;
  // finishSession retires sessionLog only on full success; resume the same log object.
  await c.finishSession();
  ok(c.cleared === true, 'C2 full success clears draft');
  const rowsSaved = [...c.server.values()];
  ok(rowsSaved.length === firstServer + 1, 'C2 retry writes only the missing exercise (no duplicate rows)');
  ok(new Set(rowsSaved.map(r => r.exercise_id)).size === rowsSaved.length, 'C2 one row per performed exercise');
  ok(rowsSaved.every(r => r.training_instance_id === 'synthetic-instance-8'), 'C2 every row bound to the same program instance');

  // ── Compare actual registered values with stored rows: exact, nothing missing/duplicated/fabricated.
  const stored = rowsSaved.flatMap(r => (r.sets_detail || []).map(d => ({ id: r.exercise_id, kg: Number(d.effKg ?? d.kg), reps: Number(d.reps) })));
  const key = s => s.id + '|' + s.kg + '|' + s.reps;
  ok(stored.length === expected.length, 'D1 stored set count equals registered set count (' + expected.length + ')');
  ok(JSON.stringify(stored.map(key).sort()) === JSON.stringify(expected.map(key).sort()), 'D1 stored sets equal registered sets exactly');
  ok(stored.reduce((v, s) => v + s.kg * s.reps, 0) === expectedVolume, 'D1 stored volume equals registered volume (' + expectedVolume + ' kg)');
  ok(!rowsSaved.some(r => ['p3', 'p5', 'p6', 'p7', 'p8'].includes(r.exercise_id)), 'D2 unperformed/replaced-unperformed exercises produce no rows');
  ok(rowsSaved.some(r => r.exercise_id === 'p4') && rowsSaved.some(r => r.exercise_id === 'r4'), 'D3 partially performed original and its replacement both stored');
  ok(c.patched.every(t => t === 'program_blocks'), 'D4 no writes to other tables (historical records untouched)');

  // ── Instance snapshot: plan immutable, execution separate.
  const snap = c.completed.snapshot;
  ok(c.completed.id === 'synthetic-instance-8', 'E1 completion uses the bound instance');
  ok(JSON.stringify(snap.items) === JSON.stringify(JSON.parse(planFrozen).items), 'E1 original plan unchanged in completion snapshot');
  const exe = snap.execution.items.map(x => x.id);
  ok(exe.includes('TK-000500') && exe.includes('r4') && exe.includes('x9') && exe.includes('p4'), 'E2 execution holds replacements, retained original and added exercise');
  ok(snap.execution.items.find(x => x.id === 'TK-000500').tk504_catalog_ref.provider_id === 'mk-synthetic-500', 'E2 catalog provenance kept in execution evidence');

  // ── History view distinguishes plan, modifications and actual records.
  const history = c.programHistoryHtml({ status: 'completed', snapshot: snap }, rowsSaved);
  for (const label of ['Oorspronkelijk gepland', 'Tijdens training aangepast', 'Werkelijk uitgevoerd', 'Vervangen:', 'Toegevoegd:'])
    ok(history.includes(label), 'F1 history shows ' + label);
  ok(!/p6<\/b>|p7<\/b>|p8<\/b>/.test(history), 'F1 unperformed planned items not shown as performed');

  // ── G. Lazy program instance edge cases (review MINOR-3/4).
  {
    const snap1 = { version: 'program_snapshot.v1', items: [{ exercise_id: 'g1', sets: 1, reps: '5' }] };
    const mk = snapshot => { const g = env(); g.sessionProgramSnapshot = snapshot; g.sessionExtra = [{ id: 'g1', _t: g.curT, type: 'strength', sets: 1, reps: '5' }]; g.field('ai-summary-body'); g.creates = 0; return g; };
    let g = mk(snap1);
    g.createTrainingInstance = async () => { g.creates++; return 'orphan'; };
    await g.finishSession();
    ok(g.creates === 0 && g.server.size === 0, 'G1 empty finish creates no orphan program instance');
    g = mk(snap1); fill(g, 'g1', [[80, 5]]); await complete(g, 'g1');
    g.createTrainingInstance = async () => { g.creates++; g.owner = OWNER_B; return 'instance-of-A'; };
    await g.finishSession();
    ok(g.creates === 1 && g.activeInstanceId === null && g.server.size === 0, 'G2 account switch during late create: instance id never lands in the other account, no rows');
    g = mk(null); fill(g, 'g1', [[80, 5]]); await complete(g, 'g1');
    g.createTrainingInstance = async () => { g.creates++; return 'x'; };
    await g.finishSession();
    const gRows = [...g.server.values()];
    ok(g.creates === 0 && g.cleared === true && gRows.length === 1 && gRows[0].training_instance_id == null, 'G3 older draft without plan snapshot finishes (rows without instance) instead of being trapped');
  }

  console.log('fTk587IntegrationAcceptance: ' + pass + ' geslaagd, 0 mislukt — 8 oefeningen, ' + expected.length + ' sets, ' + expectedVolume + ' kg');
  console.log('RESULTAAT: ' + pass + ' geslaagd, 0 mislukt');
})().catch(e => { console.error(e); console.log('RESULTAAT: ' + pass + ' geslaagd, 1 mislukt'); process.exitCode = 1; });
