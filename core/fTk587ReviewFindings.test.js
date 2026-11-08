'use strict';
/* TK #587 x main — regressieproef voor de bevindingen uit de onafhankelijke review van merge 51f4cb9.
 * Echte functies uit index.html in een vm; alleen randafhankelijkheden zijn gestubd.
 *  G1  Preview "Kies zelf uit de bibliotheek": een persoonlijke tegel met catalogusvormige ID krijgt
 *      geen MoveKit-claim, ook niet als het paneel diezelfde ID als alternatief aanbood (#603).
 *  G2  Uitvoeringsprefill van een catalogus-gebonden item gebruikt nooit de persoonlijke 1RM met gelijke ID.
 *  G3  Behouden uitgevoerde oefening wordt niet dubbel herstel-aangepast.
 *  G4  Vervangen/verwijderen bij een vaste training zonder Preview (TRAIN_CFG) werkt echt,
 *      dupliceert niets en laat het sjabloon ongemoeid.
 * Draai: node core/fTk587ReviewFindings.test.js */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync(process.env.TK587_SOURCE || path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r/g, '');
function fn(name) {
  const start = html.search(new RegExp('(?:async )?function ' + name + '\\('));
  assert(start >= 0, 'missing ' + name);
  return html.slice(start, html.indexOf('\n}', start) + 2);
}
let pass = 0;
function ok(cond, label) { assert(cond, label); pass++; console.log('  ok ' + label); }
const noop = () => {};
const OWNER = 'synthetic-owner-A';
const CATALOG = { 'TK-000038': { catalog_id: 'TK-000038', source: { provider: 'movekit', provider_id: 'mk-38' }, identity: { name: 'Synthetic Catalog 38' } } };
const REF_FNS = ['tk504CatalogSourceRefFromCatalog', 'tk504CatalogSourceRefFromSelection', 'tk603CatalogRefFromPickerSelection', 'tk504ValidateCatalogSourceRef'];
function load(ctx, names) { vm.createContext(ctx); names.forEach(n => vm.runInContext(fn(n), ctx)); return ctx; }

(async () => {
  // ── G1 Preview library path vs offered alternative.
  const mkPreview = () => {
    const c = load({
      console, Object, JSON, Array, toasts: [], toast: m => c.toasts.push(m),
      ExerciseCatalogService: { byId: id => CATALOG[id] || null },
      previewCtx: null, previewWorkingList: () => [{ original_exercise_id: 'O', exercise_id: 'O' }],
      resolvePickerEx: (id, source) => ({ id, name: id, active: true, source }), resolveCardioType: () => null,
      renderTrainingPreview: noop, loadPrevPerformance: async () => null, openExPicker: async cb => { c.pick = cb; }
    }, [...REF_FNS, 'previewChooseReplacement', 'previewApplySwap']);
    const offered = c.tk504CatalogSourceRefFromCatalog(CATALOG['TK-000038']);
    c.previewCtx = { order: ['O'], swaps: {}, swapRefs: {}, overrides: {}, swapCandidateFor: 'O', swapCandidateRefs: { 'TK-000038': offered }, swapPickerFor: 'O' };
    return c;
  };
  let p = mkPreview();
  await p.previewChooseReplacement();
  await p.pick({ id: 'TK-000038', name: 'Persoonlijk', type: 'strength', scope: 'personal', user_id: OWNER });
  ok(p.previewCtx.swaps.O === 'TK-000038' && p.previewCtx.swapRefs.O === null, 'G1 personal library tile with offered catalog-shaped ID stays personal (no MoveKit claim)');
  p = mkPreview();
  await p.previewChooseReplacement();
  await p.pick({ id: 'TK-000038', name: 'Synthetic Catalog 38', type: 'strength', _catalog: true, catalog_id: 'TK-000038' });
  ok(p.previewCtx.swapRefs.O && p.previewCtx.swapRefs.O.provider_id === 'mk-38', 'G1 tapped catalog library tile keeps its catalog claim');
  p = mkPreview();
  await p.previewApplySwap('O', 'TK-000038');
  ok(p.previewCtx.swapRefs.O && p.previewCtx.swapRefs.O.provider_id === 'mk-38', 'G1 offered alternative ("Kies") keeps its catalog claim');
  p = mkPreview(); p.previewCtx.swapCandidateRefs = {};
  await p.previewApplySwap('O', 'TK-000038');
  ok(p.previewCtx.swapRefs.O === null, 'G1 bare ID without an offered ref never becomes a catalog claim');

  // ── G2 Execution prefill: catalog-bound item vs personal same-ID 1RM.
  const q = load({
    console, Object, TK504_TYPED_FK_SESSION_RELEASE: true, tk603LiveSource: Object.create(null), tkEigenaarUid: () => OWNER,
    strengthBasisCache: {}, getOneRM: () => 100, estimatedOneRM: () => null,
    resolvePrescriptionRepTarget: () => 5, repsPrefillFromRange: () => 5,
    resolveWorkingWeight: (id, opts) => { q.opts = opts; return { suggested: opts.oneRM ? Math.round(opts.oneRM * 0.8) : null, reason: opts.oneRM ? 'baseline' : 'no-base' }; }
  }, ['tk603LiveSourceKey', 'tk603LiveOneRM', 'tk603LiveIsCatalog', 'strengthExecutionPrefill']);
  let out = q.strengthExecutionPrefill({ id: 'TK-000038', sets: 4, reps: '5', rpe: 8 }, null);
  ok(out.kg === 80 && q.opts.sourceBound === false, 'G2 legacy/personal item keeps its manual 1RM path (80 kg)');
  q.tk603LiveSource['TK-000038'] = { owner: OWNER, key: 'TKC-000038' };
  out = q.strengthExecutionPrefill({ id: 'TK-000038', sets: 4, reps: '5', rpe: 8 }, null);
  ok(out.kg === null && q.opts.oneRM === null && q.opts.sourceBound === true, 'G2 catalog-bound item without own basis gets no weight from the personal 1RM');
  q.strengthBasisCache['TKC-000038'] = { recent: { e1rm: 60 } };
  out = q.strengthExecutionPrefill({ id: 'TK-000038', sets: 4, reps: '5', rpe: 8 }, null);
  ok(out.kg === 48 && q.opts.oneRM === 60, 'G2 catalog-bound item uses only its own catalog e1RM');

  // ── G3/G4 Execution replace/remove.
  const mkExec = (resolved, cfg) => {
    const c = load({
      console, Object, JSON, Array, Set, toasts: [], toast: m => c.toasts.push(m), exercises: [],
      ExerciseCatalogService: { byId: id => CATALOG[id] || null },
      resolvedWorkout: resolved, TRAIN_CFG: cfg, sessionExtra: [], activeInstanceId: null, execFocus: { A: 0 },
      sessionLog: { bench: { sets: [{ kg: '100', reps: '5', done: true }] } },
      applySessionRecovery: (t, base) => base.map(e => ({ ...e, sets: e.sets - 1, suggestedWeight: e.suggestedWeight != null ? e.suggestedWeight * 0.95 : e.suggestedWeight })),
      openExPicker: async cb => { c.pick = cb; }, confirmModal: async () => true,
      canonicalNewExerciseItem: async () => ({ suggestedWeight: null }),
      renderTrainScreen: noop, scheduleAutosave: noop, execLeaveDiscard: noop, tkC2IsLoggableSummary: () => false
    }, [...REF_FNS, 'getSessionExs', 'execExerciseHasData', 'execEnsureEditableWorkout', 'execReplaceExercise', 'execRemoveExercise']);
    return c;
  };
  const tpl = () => [{ id: 'bench', type: 'strength', sets: 4, reps: '5', suggestedWeight: 100 }, { id: 'row', type: 'strength', sets: 3, reps: '8', suggestedWeight: 60 }];
  let e = mkExec({ t: 'A', items: tpl(), instanceId: null }, { A: tpl() });
  e.execReplaceExercise('A', 'bench'); await e.pick({ id: 'incline', name: 'Incline', type: 'strength', scope: 'personal' });
  const retained = e.sessionExtra.find(x => x.id === 'bench' && x._retainedPerformed);
  ok(retained && retained.sets === 4 && retained.suggestedWeight === 100, 'G3 retained original stored raw (sets 4, 100 kg), not pre-adjusted');
  const shown = e.getSessionExs('A').find(x => x.id === 'bench');
  ok(shown.sets === 3 && shown.suggestedWeight === 95, 'G3 retained original adjusted exactly once in the execution view');

  const cfg = { A: tpl() }, cfgFrozen = JSON.stringify(cfg);
  e = mkExec(null, cfg);
  e.execReplaceExercise('A', 'bench'); await e.pick({ id: 'incline', name: 'Incline', type: 'strength', scope: 'personal' });
  const order = e.getSessionExs('A').map(x => x.id);
  ok(order.join() === 'incline,row,bench', 'G4 TRAIN_CFG start: replacement is real, performed original retained once (' + order.join() + ')');
  ok(order.filter(x => x === 'bench').length === 1 && e.toasts.includes('Vervangen door Incline'), 'G4 no duplicate card; success toast matches the real change');
  ok(JSON.stringify(cfg) === cfgFrozen, 'G4 TRAIN_CFG template unchanged');
  ok(e.resolvedWorkout && e.resolvedWorkout.t === 'A' && e.resolvedWorkout.items[0]._replaces === 'bench', 'G4 session copy carries the replacement, so draft/resume keeps it');
  e = mkExec(null, { A: tpl() }); e.sessionLog = {};
  await e.execRemoveExercise('A', 'row');
  ok(e.getSessionExs('A').map(x => x.id).join() === 'bench' && e.toasts.includes('Oefening verwijderd'), 'G4 TRAIN_CFG start: remove is real');
  e = mkExec(null, { A: tpl() });
  e.execReplaceExercise('A', 'ghost'); await e.pick({ id: 'incline', name: 'Incline', scope: 'personal' });
  ok(e.resolvedWorkout === null && !e.toasts.some(t => /Vervangen door/.test(t)), 'G4 unknown item: no fake success, nothing materialised');

  console.log('RESULTAAT: ' + pass + ' geslaagd, 0 mislukt');
})().catch(err => { console.error(err); console.log('RESULTAAT: ' + pass + ' geslaagd, 1 mislukt'); process.exitCode = 1; });
