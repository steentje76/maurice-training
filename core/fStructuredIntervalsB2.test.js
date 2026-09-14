/* fStructuredIntervalsB2.test.js — STRUCTURED INTERVALS B2: cycling + swimming op dezelfde canonical keten als
 * running (Definition → Preview → instance-snapshot → IntervalEngineCore → EnduranceExecutionCore-laps met
 * bloksemantiek → activities.training_instance_id → History). Echte productiefuncties (sportneutrale laag +
 * sportspecifieke lap/finish/render-hooks) in een sandbox; stub-DB levert alleen rijen.
 *
 * Draai: node core/fStructuredIntervalsB2.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const IntervalEngineCore = require(path.join(ROOT, 'core/intervalEngine.js'));
const EnduranceExecutionCore = require(path.join(ROOT, 'core/enduranceExecution.js'));
const RunningExecutionCore = require(path.join(ROOT, 'core/runningExecution.js'));
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
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
const FNS = ['saveIntervalWorkout', 'ivRaw', 'ivFromRaw', 'snapshotFromCustomTraining', 'startInstanceFromDefinition', 'renderRunDetailStructuredHtml', 'tkStructuredLapActualText', 'tkEnduranceCtxProject',
  'startStructuredEnduranceExecution', 'startStructuredRunningExecution', 'tkEndu', 'tkAdhocIntervalPrescription', 'structuredBlockLabel', 'structuredBlockIndexNowFor',
  'structuredBlockStartS', 'structuredSyncFor', 'structuredCloseOpenBlockFor', 'structuredLapFor', 'huidigeStructuredStapFor', 'huidigeIntervalStap', 'huidigeCyclingIntervalStap',
  'huidigeSwimmingIntervalStap', 'tkIvTerminationText', 'tkIvTargetText', 'cyclingLap', 'swimmingLap', 'cyclingRequestFinish', 'swimmingRequestFinish', 'runningLap'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'functie gevonden: ' + n); });
const CONST = (html.match(/const TK_IV_BLOCK_LABEL=\{[^\n]*\n/) || [''])[0] + (html.match(/const TK_IV_SPORT_LABEL=\{[^\n]*\n/) || [''])[0];
const DISPATCH = (html.match(/const TK_ENDU_SPORT=\{[\s\S]*?\n\};\nconst TK_STRUCTURED_SPORTS=\[[^\]]*\];/) || [''])[0];
ok(DISPATCH, 'TK_ENDU_SPORT dispatch gevonden');
const PREVIEW_START = extractFn('previewStartTraining'), CYC_FIN = extractFn('cyclingConfirmFinish'), SWIM_FIN = extractFn('swimmingConfirmFinish'), RUN_FIN = extractFn('runningConfirmFinish');
const RIDE = extractFn('renderRideDetail'), SWIM = extractFn('renderSwimDetail'), BUILDER = html.slice(html.indexOf('function intervalEditorView'), html.indexOf('function intervalEditorView') + 4000);

const RAW = { version: 'interval_prescription.v1', sport: 'cycling', blocks: [{ type: 'warmup', termination: { type: 'time', seconds: 300 } }, { repeat: 2, of: [{ type: 'work', termination: { type: 'time', seconds: 120 }, target: { power: 250 } }, { type: 'recovery', termination: { type: 'time', seconds: 60 } }] }, { type: 'cooldown', termination: { type: 'time', seconds: 120 } }] };
function makeSandbox(sport) {
  const toasts = [], persisted = { n: 0 }, rendered = { n: 0 };
  const ctx = {
    IntervalEngineCore, EnduranceExecutionCore, RunningExecutionCore, CardioCore, console, Date, Math, JSON, Object, Array, String, Number, isFinite, isNaN, parseFloat, parseInt,
    toast: (t) => toasts.push(t), go: () => {}, escHtml: (x) => String(x),
    _runningPreviewConfig: null, _runningExecState: null, _runningGekozenVorm: null,
    _cyclingPreviewConfig: null, _cyclingExecState: null, _cyclingGekozenVorm: null,
    _swimmingPreviewConfig: null, _swimmingExecState: null, _swimmingGekozenVorm: null,
    persisteerRunningExecState: () => persisted.n++, persisteerCyclingExecState: () => persisted.n++, persisteerSwimmingExecState: () => persisted.n++,
    renderRunningExecutionScreen: () => rendered.n++, renderCyclingExecutionScreen: () => rendered.n++, renderSwimmingExecutionScreen: () => rendered.n++,
    startRunningExecution: () => { ctx._runningExecState = RunningExecutionCore.start(RunningExecutionCore.createSession(ctx.Date.now()), ctx.Date.now()).state; },
    startCyclingExecution: () => { ctx._cyclingExecState = EnduranceExecutionCore.start(EnduranceExecutionCore.createSession(ctx.Date.now()), ctx.Date.now()).state; },
    startSwimmingExecution: () => { ctx._swimmingExecState = EnduranceExecutionCore.start(EnduranceExecutionCore.createSession(ctx.Date.now()), ctx.Date.now()).state; },
    _toasts: toasts, _persisted: persisted, _rendered: rendered
  };
  vm.createContext(ctx);
  vm.runInContext(CONST + '\n' + DISPATCH + '\n' + FNS.map((n) => SRC[n]).join('\n'), ctx);
  return ctx;
}
const T0 = 1_800_000_000_000;

(async () => {
  const norm = IntervalEngineCore.normalizePrescription(RAW); ok(norm.geldig && norm.blocks.length === 6, 'fixture: 6 blokken (warmup, 2×(work,recovery), cooldown)');
  // ── A: cycling canonical executie (Definition-prescriptie → auto-laps → manual lap → finish sluit deelblok) ──
  let c = makeSandbox('cycling'); c.Date.now = () => T0;
  ok(c.startStructuredEnduranceExecution('cycling', { definitionId: 'ct-c', naam: 'Fiets', instanceId: 'inst-c', prescription: norm, rawPrescription: RAW }) === true, 'A: starter accepteert cycling');
  ok(c._cyclingPreviewConfig.canonical === true && c._cyclingPreviewConfig.sport === 'cycling' && c._cyclingPreviewConfig.instanceId === 'inst-c' && c._cyclingExecState.status === 'RUNNING', 'A: cycling config canonical + instance + state RUNNING');
  ok(c._runningPreviewConfig === null && c._swimmingPreviewConfig === null, 'A/sport-isolatie: running/swimming state onaangeraakt');
  let st = c.huidigeCyclingIntervalStap(T0 + 10_000); ok(st && st.canonical === true && /Warming-up/.test(st.blok.label) && st.totaal === 6 && st.resterendS === 290, 'A: huidige stap uit prescriptie (warmup, 290 s resterend)');
  c.structuredSyncFor('cycling', T0 + 301_000);
  eq(c._cyclingExecState.laps.length, 1, 'A: auto-lap voor voltooide warmup'); eq((c._cyclingExecState.laps[0] && c._cyclingExecState.laps[0].lap_type), 'warmup', 'A: lap_type warmup'); eq((c._cyclingExecState.laps[0] && c._cyclingExecState.laps[0].block_index), 0, 'A: block_index 0');
  st = c.huidigeCyclingIntervalStap(T0 + 305_000); ok(st && st.blok && /Werk 1\/2|Work 1\/2/.test(st.blok.label) && /250/.test(st.blok.label), 'A: werkblok 1/2 met vermogenstarget in label');
  c.Date.now = () => T0 + 350_000; c.cyclingLap();
  eq(c._cyclingExecState.laps.length, 2, 'A: handmatige lap sluit werkblok 1 (manual transitie)'); eq((c._cyclingExecState.laps[1] && c._cyclingExecState.laps[1].block_index), 1, 'A: block_index 1'); eq((c._cyclingExecState.laps[1] && c._cyclingExecState.laps[1].repeat_index), 0, 'A: repeat_index 0');
  ok(c._cyclingPreviewConfig.manualFromIndex === 2 && c._cyclingPreviewConfig.manualFromElapsedS === 350, 'A: tijdsprogressie hervat vanaf blok 2 op 350 s');
  c.Date.now = () => T0 + 350_500; c.cyclingLap(); eq(c._cyclingExecState.laps.length, 2, 'A: dubbele tik <2 s → geen 0-seconden-lap');
  c.Date.now = () => T0 + 380_000; c.cyclingRequestFinish();
  eq(c._cyclingExecState.status, 'FINISH_CONFIRM', 'A: finish-verzoek'); eq(c._cyclingExecState.laps.length, 3, 'A: lopend herstelblok (30 s) als actual-lap afgesloten bij finish'); eq((c._cyclingExecState.laps[2] && c._cyclingExecState.laps[2].lap_type), 'recovery', 'A: lap_type recovery');
  ok(c._persisted.n >= 2, 'A: persist bij auto-/manual-lap');
  // ── B: swimming idem (pace /100m) ──
  const RAW_S = Object.assign({}, RAW, { sport: 'swimming', blocks: [{ type: 'warmup', termination: { type: 'time', seconds: 120 } }, { repeat: 1, of: [{ type: 'work', termination: { type: 'time', seconds: 60 }, target: { pace: '1:45/100m' } }] }] });
  const normS = IntervalEngineCore.normalizePrescription(RAW_S);
  c = makeSandbox('swimming'); c.Date.now = () => T0; c.startStructuredEnduranceExecution('swimming', { definitionId: 'ct-s', naam: 'Zwem', instanceId: 'inst-s', prescription: normS, rawPrescription: RAW_S });
  ok(c._swimmingExecState.status === 'RUNNING' && c._swimmingPreviewConfig.sport === 'swimming', 'B: swimming start');
  c.structuredSyncFor('swimming', T0 + 121_000); eq(c._swimmingExecState.laps.length, 1, 'B: auto-lap warmup'); eq((c._swimmingExecState.laps[0] && c._swimmingExecState.laps[0].lap_type), 'warmup', 'B: lap_type');
  st = c.huidigeSwimmingIntervalStap(T0 + 125_000); ok(st && st.blok && /1:45\/100m/.test(st.blok.label), 'B: pace-target /100m in label (sport-eenheid)');
  c.Date.now = () => T0 + 130_000; c.swimmingLap(); eq(c._swimmingExecState.laps.length, 2, 'B: manual lap sluit werkblok'); eq((c._swimmingExecState.laps[1] && c._swimmingExecState.laps[1].lap_type), 'work', 'B: lap_type work');
  c.Date.now = () => T0 + 131_000; c.swimmingLap(); ok(c._toasts.some((t) => /voltooid/.test(t)), 'B: na laatste blok: "Training is voltooid" (geen extra lap)');
  eq(c._swimmingExecState.laps.length, 2, 'B: geen lap na voltooiing');
  ok(c._runningExecState === null && c._cyclingExecState === null, 'B/sport-isolatie: andere sporten onaangeraakt');
  // ── C: ad-hoc formulier-interval = zelfde model (niet canonical, geen instance) ──
  const ad = c.tkAdhocIntervalPrescription('cycling', 3, 240, 120, 600, 600);
  ok(ad && ad.norm.geldig && ad.norm.blocks.length === 8 && ad.norm.sport === 'cycling' && ad.raw.blocks[1].repeat === 3, 'C: ad-hoc → IntervalEngineCore-prescriptie (warmup + 3×(work,recovery) + cooldown = 8 blokken)');
  eq(ad.norm.blocks.map((b) => b.type).join(','), 'warmup,work,recovery,work,recovery,work,recovery,cooldown', 'C: blokvolgorde exact warm-up → (werk → herstel)×3 → cool-down (werk vóór herstel binnen elke herhaling)');
  eq(ad.norm.blocks[1].termination.seconds, 240, 'C: werkduur 240 s'); eq(ad.norm.blocks[2].termination.seconds, 120, 'C: herstel 120 s');
  eq(ad.norm.blocks[0].termination.seconds, 600, 'C: vaste warming-up 600 s behouden (geen UX-wijziging)'); eq(ad.norm.blocks[7].termination.seconds, 600, 'C: vaste cooling-down 600 s behouden');
  eq(c.tkAdhocIntervalPrescription('swimming', 1, 60, 30, 300, 300).norm.blocks[0].termination.seconds, 300, 'C: zwemmen behoudt zijn eigen 300 s warming-up');
  ok(c.tkAdhocIntervalPrescription('swimming', 2, 60, 0, 300, 300).norm.blocks.length === 4, 'C: swimming ad-hoc zonder herstel: warmup + 2×work + cooldown');
  const mini = c.tkAdhocIntervalPrescription('running', 0, 5, 0, 0, 0); ok(mini && mini.norm.blocks.length === 1 && mini.norm.blocks[0].termination.seconds === 10, 'C: minimale ad-hoc: repeats 0→1, werk <10 s → 10 s (IntervalEngineCore-ondergrens), geen warm-up/cool-down bij 0 s');
  c = makeSandbox('running'); c.Date.now = () => T0; c._runningPreviewConfig = Object.assign({ vorm: 'interval', canonical: false, instanceId: null, manualFromIndex: 0, manualFromElapsedS: 0 }, { prescription: ad.norm, rawPrescription: ad.raw }); c._runningGekozenVorm = 'interval'; c.startRunningExecution();
  st = c.huidigeIntervalStap(T0 + 5_000); ok(st && st.canonical === false && /Warming-up/.test(st.blok.label), 'C: ad-hoc running gebruikt dezelfde structured-stap (canonical:false)');
  c.structuredSyncFor('running', T0 + 601_000); eq(c._runningExecState.laps.length, 1, 'C: ad-hoc krijgt óók auto-laps met bloksemantiek'); eq((c._runningExecState.laps[0] && c._runningExecState.laps[0].lap_type), 'warmup', 'C: lap_type');
  ok((html.replace(/\/\/[^\n]*/g, '').match(/intervalBlokken/g) || []).length === 0, 'C: legacy intervalBlokken volledig verwijderd (static gate)');
  ok(!/^function huidigeCyclingIntervalStap\(nu\)\{\n  if/m.test(html) && !/^function huidigeSwimmingIntervalStap\(nu\)\{\n  if/m.test(html), 'C: legacy huidige*IntervalStap-implementaties verwijderd (alleen delegaties)');
  // ── D: finish-payloads + laps met semantiek + instance-link ──
  ok(/training_instance_id:\(_cyclingPreviewConfig&&_cyclingPreviewConfig\.instanceId\)\|\|null/.test(CYC_FIN) && /lap_type:lap\.lap_type\|\|null,block_index:/.test(CYC_FIN), 'D: cycling finish schrijft training_instance_id + lap_type/block_index/repeat_index');
  ok(/training_instance_id:\(_swimmingPreviewConfig&&_swimmingPreviewConfig\.instanceId\)\|\|null/.test(SWIM_FIN) && /lap_type:lap\.lap_type\|\|null,block_index:/.test(SWIM_FIN), 'D: swimming finish idem');
  ok(/training_instance_id:\(_runningPreviewConfig&&_runningPreviewConfig\.instanceId\)\|\|null/.test(RUN_FIN), 'D: running ongewijzigd');
  // ── E: Preview-gate + History + Builder ──
  ok(/TK_STRUCTURED_SPORTS\.indexOf\(norm\.sport\)===-1/.test(PREVIEW_START) && /startStructuredEnduranceExecution\(norm\.sport,/.test(PREVIEW_START), 'E: preview start gate accepteert running/cycling/swimming via de sportneutrale starter');
  ok(/renderRunDetailStructuredHtml\(act,laps\|\|\[\]\)/.test(RIDE) && /\$\{structured\}/.test(RIDE) && /renderRunDetailStructuredHtml\(act,laps\|\|\[\]\)/.test(SWIM) && /\$\{structured\}/.test(SWIM), 'E: ride/swim History tonen planned-vs-actual (sportneutrale renderer)');
  ok(/WBUI\.ivSet\(\\'sport\\',this\.value\)/.test(BUILDER) && /\['running','cycling','swimming'\]/.test(BUILDER), 'E: Builder sportkeuze running/cycling/swimming');
  ok(/Doelvermogen werk \(optioneel, bv\. 250 W\)/.test(BUILDER) && /1:45\/100m/.test(BUILDER) && /4:30\/km/.test(BUILDER), 'E: sportspecifieke targetlabels (watt / pace per 100 m / pace per km)');
  ok(!/norm\.sport!=='running'/.test(PREVIEW_START), 'E: geen running-only-gate meer');
  // ── F: sportneutrale laag = IntervalEngineCore; geen eigen formule; erg niet aangeraakt ──
  const LAYER = SRC.structuredBlockIndexNowFor + SRC.structuredSyncFor + SRC.structuredCloseOpenBlockFor + SRC.structuredLapFor + SRC.huidigeStructuredStapFor;
  ok(/IntervalEngineCore\.blockIndexAtElapsed\(/.test(LAYER) && /IntervalEngineCore\.stateAt\(/.test(LAYER) && !/Math\.pow|Math\.exp|regress/.test(LAYER), 'F: executie-semantiek = IntervalEngineCore, geen eigen formule');
  ok(!/_ivExec|finishIntervalExecution|exNote/.test(LAYER + PREVIEW_START), 'F: erg-pad (_ivExec/exNote) niet aangeraakt (B3)');
  eq((DISPATCH.match(/const TK_STRUCTURED_SPORTS=\[[^\]]*\]/) || [''])[0], "const TK_STRUCTURED_SPORTS=['running','cycling','swimming']", 'F: structured-sportlijst bevat exact running/cycling/swimming — erg (rowing/bikeerg/skierg) uitgesloten');
  ['rowing', 'bikeerg', 'skierg'].forEach((sp) => { ok(c.tkEndu(sp) == null, 'F: geen dispatch-entry voor ' + sp + ' (erg blijft B3)'); });
  ok(c.startStructuredEnduranceExecution('rowing', { prescription: norm }) === false, 'F: starter weigert erg-sport (fail-safe, geen state gezet)');
  ok(/tkEndu\(sport\)/.test(LAYER) && (DISPATCH.match(/get cfg\(\)/g) || []).length === 3, 'F: één dispatch met exact drie sporten');

  // ══════════════════════════════════════════════════════════════════════════════
  // DYNAMISCHE BEWIJZEN (remediatie na review): Definition-round-trip, immutable snapshot,
  // History per sport, incomplete/abort, Calculation→Context-continuïteit.
  // ══════════════════════════════════════════════════════════════════════════════
  function defSandbox() {
    const db = { custom_trainings: [], training_instances: [], patched: [] };
    const ctx = {
      IntervalEngineCore, CardioCore, DecisionCore: require(path.join(ROOT, 'core/decision.js')),
      CyclingIntelligenceCore: require(path.join(ROOT, 'core/cyclingIntelligence.js')),
      RunningIntelligenceCore: require(path.join(ROOT, 'core/runningIntelligence.js')),
      SwimmingIntelligenceCore: (() => { try { return require(path.join(ROOT, 'core/swimmingIntelligence.js')); } catch (e) { return undefined; } })(),
      TrainingLoadCore: require(path.join(ROOT, 'core/trainingLoad.js')), ProgressionCore: require(path.join(ROOT, 'core/progression.js')),
      console, Date, Math, JSON, Object, Array, String, Number, isFinite, isNaN, parseFloat, parseInt, encodeURIComponent,
      customTrainings: [], lsSet: () => {}, pushCustomTrainingExercisesRich: () => {}, escHtml: (x) => String(x), Promise, decodeURIComponent,
      sbPostQ: async (t, row) => { db[t] = db[t] || []; db[t].push(row); return true; },
      sbPatchQ: async (t, q, patch) => { db.patched.push({ t, q, patch }); const id = /id=eq\.(.+)/.exec(q)[1]; const r = db.custom_trainings.find((x) => x.id === id); if (r) Object.assign(r, patch); return true; },
      sbGet: async (t, q) => { if (t === 'training_instances') { const m = /id=eq\.([^&]+)/.exec(q); return db.training_instances.filter((r) => r.id === decodeURIComponent(m[1])); } return []; },
      decodeURIComponent,
      createTrainingInstance: async ({ customTrainingId, snapshot }) => { const id = 'inst-' + (db.training_instances.length + 1); db.training_instances.push({ id, custom_training_id: customTrainingId, snapshot: JSON.parse(JSON.stringify(snapshot)) }); return id; },
      _db: db
    };
    vm.createContext(ctx);
    vm.runInContext(CONST + '\n' + DISPATCH + '\nvar _iv=null;\n' + ['saveIntervalWorkout', 'ivRaw', 'ivFromRaw', 'snapshotFromCustomTraining', 'startInstanceFromDefinition', 'renderRunDetailStructuredHtml', 'tkStructuredLapActualText', 'structuredBlockLabel', 'tkIvTerminationText', 'tkIvTargetText', 'tkEnduranceCtxProject'].map((n) => SRC[n]).join('\n'), ctx);
    return ctx;
  }
  // ── 1/2: Definition round-trip cycling + swimming via de ECHTE Builder-functies ──
  for (const [sport, work, target] of [['cycling', { workTerm: 'time', workMin: 5, workPace: '250 W' }, '250 W'], ['swimming', { workTerm: 'distance', workM: 100, workPace: '1:45/100m' }, '1:45/100m']]) {
    const d = defSandbox();
    d._iv = Object.assign({ sport, naam: 'Test ' + sport, warmupMin: 10, repeats: 4, workTerm: 'time', workMin: 4, workM: 1000, workPace: '', workRpe: 7, recMin: 2, cooldownMin: 10 }, work);
    const raw = d.ivRaw();
    eq(raw.sport, sport, '1/2 (' + sport + '): ivRaw() zet het gekozen sportveld');
    const id = await d.saveIntervalWorkout('Test ' + sport, raw, null);
    ok(id && d._db.custom_trainings.length === 1, '1/2 (' + sport + '): saveIntervalWorkout persisteert een custom_trainings-rij');
    const row = d._db.custom_trainings[0];
    eq(row.metadata.sel.sport, sport, '1/2 (' + sport + '): metadata.sel.sport gepersisteerd');
    eq(row.metadata.intervalPrescription.sport, sport, '1/2 (' + sport + '): metadata.intervalPrescription.sport gepersisteerd');
    // reload → normalize → alle plan-eigenschappen intact
    const reloaded = IntervalEngineCore.normalizePrescription(row.metadata.intervalPrescription);
    ok(reloaded.geldig && reloaded.sport === sport, '1/2 (' + sport + '): reload+normalize geldig met juiste sport');
    eq(reloaded.blocks.filter((b) => b.type === 'work').length, 4, '1/2 (' + sport + '): 4 herhalingen bewaard');
    eq(reloaded.blocks.map((b) => b.type).join(','), 'warmup,work,recovery,work,recovery,work,recovery,work,recovery,cooldown', '1/2 (' + sport + '): blokvolgorde bewaard');
    const w0 = reloaded.blocks[1];
    if (sport === 'swimming') { eq(w0.termination.type, 'distance', '1/2 (swimming): afstandsterminatie bewaard'); eq(w0.termination.meters, 100, '1/2 (swimming): 100 m bewaard'); }
    else { eq(w0.termination.type, 'time', '1/2 (cycling): tijdterminatie bewaard'); eq(w0.termination.seconds, 300, '1/2 (cycling): 300 s bewaard'); }
    eq(w0.target.pace, target, '1/2 (' + sport + '): target bewaard (' + target + ')');
    eq(w0.target.rpe, 7, '1/2 (' + sport + '): RPE-target bewaard');
    // editor-round-trip: ivFromRaw(raw) → ivRaw() levert dezelfde prescriptie
    d._iv = d.ivFromRaw(row.metadata.intervalPrescription); d._iv.naam = 'x';
    eq(JSON.stringify(d.ivRaw()), JSON.stringify(raw), '1/2 (' + sport + '): editor-round-trip (ivFromRaw → ivRaw) identiek');
  }
  // ── 3: immutable training_instance snapshot (cycling + swimming) ──
  for (const sport of ['cycling', 'swimming']) {
    const d = defSandbox();
    d._iv = { sport, naam: 'S', warmupMin: 5, repeats: 2, workTerm: 'time', workMin: 3, workM: 100, workPace: sport === 'cycling' ? '240 W' : '1:50/100m', workRpe: '', recMin: 1, cooldownMin: 5 };
    const raw = d.ivRaw(); await d.saveIntervalWorkout('S', raw, null);
    const row = d._db.custom_trainings[0];
    const def = { id: row.id, source: 'custom', name: row.naam, exercises: [], intervalPrescription: row.metadata.intervalPrescription };
    const instId = await d.startInstanceFromDefinition(def, []);
    const snap = d._db.training_instances[0].snapshot;
    eq(snap.intervalPrescription.sport, sport, '3 (' + sport + '): snapshot bevat de sport');
    eq(snap.intervalPrescriptionNormalized.blocks.length, 6, '3 (' + sport + '): snapshot bevat de genormaliseerde blokken');
    const planBefore = JSON.stringify(snap);
    // History VÓÓR de mutatie (productie-renderer leest training_instances, niet custom_trainings)
    const lapsSnap = [{ lap_index: 1, duration_seconds: 300, distance_meters: sport === 'cycling' ? 2500 : 200, lap_type: 'warmup', block_index: 0, repeat_index: 0 }];
    const histVoor = await d.renderRunDetailStructuredHtml({ training_instance_id: instId, sport }, lapsSnap);
    ok(histVoor && /6 blokken gepland/.test(histVoor), '3 (' + sport + '): History toont het plan uit het instance-snapshot (6 blokken)');
    // muteer de BRON-definition ná de start (lokale cache én het def-object dat de start gebruikte)
    row.metadata.intervalPrescription.blocks[1].repeat = 9;
    row.metadata.intervalPrescription.sport = 'running';
    def.intervalPrescription.blocks[0].termination.seconds = 9999;
    eq(JSON.stringify(d._db.training_instances[0].snapshot), planBefore, '3 (' + sport + '): het gepersisteerde instance-snapshot blijft ongewijzigd na mutatie van de bron-Definition');
    eq(d._db.training_instances[0].snapshot.intervalPrescriptionNormalized.blocks.filter((b) => b.type === 'work').length, 2, '3 (' + sport + '): 2 werkblokken in het snapshot (bron zegt inmiddels 9)');
    const histNa = await d.renderRunDetailStructuredHtml({ training_instance_id: instId, sport }, lapsSnap);
    eq(histNa, histVoor, '3 (' + sport + '): History-output identiek ná bronmutatie — de renderer herleest de Definition niet');
    ok(/training_instances/.test(SRC.renderRunDetailStructuredHtml) && !/custom_trainings/.test(SRC.renderRunDetailStructuredHtml), '3 (' + sport + '): renderer haalt het plan uitsluitend uit training_instances (statische bevestiging)');
    // executie leest het snapshot, niet de bron
    const e = makeSandbox(sport); e.Date.now = () => T0;
    e.startStructuredEnduranceExecution(sport, { definitionId: def.id, naam: 'S', instanceId: instId, prescription: snap.intervalPrescriptionNormalized, rawPrescription: snap.intervalPrescription });
    eq(e.tkEndu(sport).cfg.prescription.blocks.length, 6, '3 (' + sport + '): executie draait op het snapshot (6 blokken), niet op de gemuteerde bron');
  }
  // ── 4/5: History dynamisch per sport, inclusief eenheden ──
  {
    const d = defSandbox();
    const rawC = { version: 'interval_prescription.v1', sport: 'cycling', blocks: [{ type: 'warmup', termination: { type: 'time', seconds: 300 } }, { repeat: 2, of: [{ type: 'work', termination: { type: 'time', seconds: 120 }, target: { power: 250 } }, { type: 'recovery', termination: { type: 'time', seconds: 60 } }] }] };
    const normC = IntervalEngineCore.normalizePrescription(rawC);
    d._db.training_instances.push({ id: 'i-c', snapshot: { intervalPrescription: rawC, intervalPrescriptionNormalized: normC } });
    const lapsC = [{ lap_index: 1, duration_seconds: 300, distance_meters: 2500, lap_type: 'warmup', block_index: 0, repeat_index: 0 }, { lap_index: 2, duration_seconds: 118, distance_meters: 1400, lap_type: 'work', block_index: 1, repeat_index: 0, avg_power_watts: 243 }];
    const hC = await d.renderRunDetailStructuredHtml({ training_instance_id: 'i-c', sport: 'cycling' }, lapsC);
    ok(/gepland vs\. uitgevoerd/.test(hC) && /5 blokken gepland/.test(hC) && /2 van 5 blokken gelogd/.test(hC), '4 (cycling): History leest het plan uit het instance-snapshot');
    ok(/250\s*W/.test(hC), '4 (cycling): geplande target (250 W) uit het snapshot');
    ok(/1\.40 km/.test(hC) && /243 W/.test(hC), '5 (cycling): actuals in km + gemeten vermogen (fietsconventie)');
    ok(/niet gelogd/.test(hC), '4 (cycling): ontbrekende actuals blijven "niet gelogd" (geen prescribed→actual)');
    ok(!/2:00<\/td><td[^>]*>2:00/.test(hC), '4 (cycling): geplande duur wordt niet als actual herhaald');
    const rawS = { version: 'interval_prescription.v1', sport: 'swimming', blocks: [{ type: 'warmup', termination: { type: 'distance', meters: 200 } }, { repeat: 2, of: [{ type: 'work', termination: { type: 'distance', meters: 100 }, target: { pace: '1:45/100m' } }, { type: 'recovery', termination: { type: 'time', seconds: 30 } }] }] };
    const normS = IntervalEngineCore.normalizePrescription(rawS);
    d._db.training_instances.push({ id: 'i-s', snapshot: { intervalPrescription: rawS, intervalPrescriptionNormalized: normS } });
    const lapsS = [{ lap_index: 1, duration_seconds: 240, distance_meters: 200, lap_type: 'warmup', block_index: 0, repeat_index: 0 }, { lap_index: 2, duration_seconds: 105, distance_meters: 100, lap_type: 'work', block_index: 1, repeat_index: 0 }];
    const hS = await d.renderRunDetailStructuredHtml({ training_instance_id: 'i-s', sport: 'swimming' }, lapsS);
    ok(/1:45\/100m/.test(hS), '4 (swimming): geplande pace-target /100m uit het snapshot');
    ok(/200 m/.test(hS) && /100 m/.test(hS) && !/km/.test(hS), '6 (swimming): actuals in meters, GEEN km-notatie (zwemconventie)');
    ok(/1:45\/100m/.test(d.tkStructuredLapActualText('swimming', lapsS[1])) && /2:00\/100m/.test(d.tkStructuredLapActualText('swimming', lapsS[0])), '6 (swimming): actual pace per 100 m uit gemeten afstand+tijd (CardioCore), niet uit het plan');
    eq(d.tkStructuredLapActualText('cycling', { duration_seconds: 118, distance_meters: 1400 }), '1:58 · 1.40 km', '6 (cycling): km-conventie behouden');
    eq(d.tkStructuredLapActualText('swimming', { duration_seconds: 60, distance_meters: null }), '1:00', '6: ontbrekende afstand → geen verzonnen waarde');
  }
  // ── 7: incomplete/abort — alleen daadwerkelijk uitgevoerd werk wordt gelogd ──
  for (const sport of ['cycling', 'swimming']) {
    const e = makeSandbox(sport); e.Date.now = () => T0;
    const rawI = { version: 'interval_prescription.v1', sport, blocks: [{ type: 'warmup', termination: { type: 'time', seconds: 300 } }, { repeat: 3, of: [{ type: 'work', termination: { type: 'time', seconds: 120 } }, { type: 'recovery', termination: { type: 'time', seconds: 60 } }] }, { type: 'cooldown', termination: { type: 'time', seconds: 300 } }] };
    const nI = IntervalEngineCore.normalizePrescription(rawI);
    eq(nI.blocks.length, 8, '7 (' + sport + '): 8 geplande blokken');
    e.startStructuredEnduranceExecution(sport, { instanceId: 'i-x', prescription: nI, rawPrescription: rawI });
    e.structuredSyncFor(sport, T0 + 421_000); // warmup + werk 1 klaar, midden in herstel 1
    const st = e.tkEndu(sport).state;
    eq(st.laps.length, 2, '7 (' + sport + '): alleen de twee voltooide blokken hebben een lap');
    ok(st.laps.every((l) => l && typeof l.lap_type === 'string'), '7 (' + sport + '): elke lap heeft bloksemantiek');
    e.Date.now = () => T0 + 440_000;
    (sport === 'cycling' ? e.cyclingRequestFinish : e.swimmingRequestFinish)();
    const laps = e.tkEndu(sport).state.laps;
    eq(laps.length, 3, '7 (' + sport + '): vroegtijdig afronden sluit alleen het LOPENDE blok af');
    eq(laps[2] && laps[2].block_index, 2, '7 (' + sport + '): dat is blok 2 (herstel 1), niet een toekomstig blok');
    ok(laps.length > 0 && laps.every((l) => typeof l.block_index === 'number' && l.block_index <= 2), '7 (' + sport + '): geen toekomstige geplande blokken als actual gelogd');
    eq(laps[2] && laps[2].duration_seconds, 19, '7 (' + sport + '): werkelijke (deel)duur 19 s, niet de geplande 60 s');
    ok(laps.every((l) => l && (l.distance_meters == null || l.distance_meters === 0)), '7 (' + sport + '): geen verzonnen afstand bij software-executie zonder sensor');
    eq(e.tkEndu(sport).state.status, 'FINISH_CONFIRM', '7 (' + sport + '): status eerlijk (nog niet COMPLETED)');
  }
  // ── 8: Calculation → Context-continuïteit met de canonieke records ──
  {
    const d = defSandbox();
    const nowD = new Date('2026-09-14T12:00:00Z');
    const acts = [
      { sport: 'cycling', recorded_at: '2026-09-12T10:00:00Z', duration_seconds: 3600, distance_meters: 30000, avg_power_watts: 210, training_instance_id: 'i-c', rpe: 6 },
      { sport: 'swimming', recorded_at: '2026-09-13T10:00:00Z', duration_seconds: 1800, distance_meters: 1500, training_instance_id: 'i-s', rpe: 5 }
    ];
    const ctxTxt = d.tkEnduranceCtxProject(['cycling', 'swimming'], acts, [], nowD);
    ok(typeof ctxTxt === 'string' && ctxTxt.length > 0, '8: Context-projectie consumeert de structured activity-records');
    ok(/Fietsen/.test(ctxTxt) && /Zwemmen/.test(ctxTxt), '8: beide sporten verschijnen als eigen contextblok');
    ok(/30[.,]0 km|30 km|30\.0/.test(ctxTxt) || /weekvolume/i.test(ctxTxt), '8 (cycling): bestaande volume-berekening blijft gevoed');
    ok(!/training_instance_id|lap_type|block_index/.test(ctxTxt), '8: nieuwe kolommen lekken niet naar Context (alleen berekende feiten)');
    const onlyC = d.tkEnduranceCtxProject(['cycling'], acts, [], nowD);
    ok(/Fietsen/.test(onlyC) && !/Zwemmen/.test(onlyC), '8: sport-isolatie — zwemmen niet in de cycling-context');
    ok(/30\.0 km · 1 sessies/.test(onlyC), '8: cycling-weekvolume telt exact 1 sessie / 30,0 km — de zwemsessie lekt niet in de cycling-berekening');
    ok(/7 d 360 AU/.test(onlyC) && /\(1 sessies\)/.test(onlyC), '8: cycling-sRPE telt alleen de fietssessie (360 AU, 1 sessie)');
    const cycAlleen = d.tkEnduranceCtxProject(['cycling'], [acts[0]], [], nowD);
    eq(onlyC, cycAlleen, '8: cycling-context met of zonder zwemrecord in de dataset is identiek (harde isolatie)');
    const onlyS = d.tkEnduranceCtxProject(['swimming'], acts, [], nowD);
    ok(/Zwemmen/.test(onlyS) && !/Fietsen/.test(onlyS), '8: sport-isolatie omgekeerd');
    eq(onlyS, d.tkEnduranceCtxProject(['swimming'], [acts[1]], [], nowD), '8: swimming-context identiek zonder het fietsrecord');
    const zonder = d.tkEnduranceCtxProject(['cycling'], acts.map((a) => { const b = Object.assign({}, a); delete b.training_instance_id; return b; }), [], nowD);
    eq(zonder, onlyC, '8: identieke Context met/zonder training_instance_id — consumenten breken niet op de nieuwe nullable kolom');
  }
  // ── 9: architectuur-invariant (gedrag/statisch, niet op commentaartekst) ──
  {
    const code = html.replace(/\/\/[^\n]*/g, '');
    eq((code.match(/IntervalEngineCore\.blockIndexAtElapsed\(/g) || []).length, 1, '9: exact één aanroep van blockIndexAtElapsed in index.html (uitsluitend de sportneutrale laag) — geen parallelle timing-engine');
    ok(!/function\s+huidige\w*IntervalStap\(nu\)\{\s*\n\s*(?:const|let|var)\s/.test(html), '9: geen sport-eigen interval-stap-implementatie meer (alleen delegaties)');
    eq((code.match(/structuredBlockIndexNowFor\(/g) || []).length >= 4, true, '9: alle structured-functies gebruiken dezelfde index-bepaling');
    const legacyTimingPattern = /cumS\s*\+=\s*blok\.duration_s/;
    ok(!legacyTimingPattern.test(code), '9: geen duplicate blok/timing-berekening (legacy cumS-lus verdwenen)');
    ok(/function structuredRunningSync\(nu\)\{ return structuredSyncFor\('running',nu\); \}/.test(html) && /function huidigeIntervalStap\(nu\)\{ return huidigeStructuredStapFor\('running',nu\); \}/.test(html), '9: running-wrappers zijn compatibiliteitsdelegaties (B1-contract behouden)');
  }
  // ── 10: executie-grens weigert niet-ondersteunde sporten (core valideert sport niet) ──
  {
    const e = makeSandbox('running');
    ok(IntervalEngineCore.normalizePrescription({ version: 'interval_prescription.v1', sport: 'onzin', blocks: [{ type: 'work', termination: { type: 'time', seconds: 60 } }] }).geldig === true, '10: IntervalEngineCore valideert het sportveld bewust niet (generiek model)');
    ['onzin', 'rowing', 'bikeerg', 'skierg', null, undefined, ''].forEach((sp) => {
      eq(e.startStructuredEnduranceExecution(sp, { prescription: norm }), false, '10: executie-grens weigert sport ' + JSON.stringify(sp));
    });
    ok(e._runningPreviewConfig === null && e._cyclingPreviewConfig === null && e._swimmingPreviewConfig === null, '10: geweigerde start zet geen enkele sport-state (fail closed)');
    ok(/TK_STRUCTURED_SPORTS\.indexOf\(norm\.sport\)===-1/.test(PREVIEW_START), '10: Preview-gate gebruikt dezelfde sportlijst');
  }

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fStructuredIntervalsB2: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
