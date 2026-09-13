/* fStructuredIntervalsCanonical.test.js — STRUCTURED ENDURANCE INTERVALS, FASE B1 (running).
 * Bewijst de canonical lifecycle: Definition (custom_trainings.metadata.intervalPrescription)
 * → Preview → training_instances.snapshot → IntervalEngineCore-executie → structured
 * activity_laps + activities.training_instance_id → History planned-vs-actual, plus
 * scheduling-, calculation-, context- en isolatiegaranties. Echte functies uit index.html in
 * een vm-sandbox met de ECHTE cores en stub-DB (geen netwerk).
 *
 * Draai: node core/fStructuredIntervalsCanonical.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const IntervalEngineCore = require(path.join(ROOT, 'core/intervalEngine.js'));
const RunningExecutionCore = require(path.join(ROOT, 'core/runningExecution.js'));
const EnduranceExecutionCore = require(path.join(ROOT, 'core/enduranceExecution.js'));
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const TrainingLoadCore = require(path.join(ROOT, 'core/trainingLoad.js'));
const RunningIntelligenceCore = require(path.join(ROOT, 'core/runningIntelligence.js'));
const ProgressionCore = require(path.join(ROOT, 'core/progression.js'));
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
const FNS = ['snapshotFromCustomTraining', 'startInstanceFromDefinition', 'tkIvTerminationText', 'tkIvTargetText', 'renderTPInterval',
  'startStructuredRunningExecution', 'structuredBlockLabel', 'structuredBlockIndexNow', 'structuredRunningSync', 'huidigeIntervalStap',
  'runningLap', 'renderRunDetailStructuredHtml', 'startRunningExecution', 'persisteerRunningExecState',
  'structuredRunningCloseOpenBlock', 'runningRequestFinish', 'runningPause'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'functie gevonden: ' + n); });
const CONST_LINE = (html.match(/const TK_IV_BLOCK_LABEL=\{[^\n]*\n/) || [''])[0] + (html.match(/const TK_IV_SPORT_LABEL=\{[^\n]*\n/) || [''])[0];
ok(CONST_LINE.includes('warmup') && CONST_LINE.includes('running'), 'labelconstanten gevonden');
const PREVIEW_START = extractFn('previewStartTraining'), RUN_FINISH = extractFn('runningConfirmFinish'), GET_DEF = extractFn('getTrainingDefinition');
const BUILD_CTX = extractFn('buildCtx'), REN_DETAIL = extractFn('renderRunDetail');
ok(PREVIEW_START && RUN_FINISH && GET_DEF && BUILD_CTX && REN_DETAIL, 'lifecycle-functies gevonden');

// ── Fixture: raw Definition-prescriptie (auteursvorm met repeat-groep) ──
const RAW = { version: 'interval_prescription.v1', sport: 'running', blocks: [
  { type: 'warmup', termination: { type: 'time', seconds: 600 } },
  { repeat: 3, of: [{ type: 'work', termination: { type: 'time', seconds: 240 }, target: { pace: '4:30/km', rpe: 8 } }, { type: 'recovery', termination: { type: 'time', seconds: 120 } }] },
  { type: 'cooldown', termination: { type: 'time', seconds: 600 } } ] };

function makeSandbox(opts) {
  opts = opts || {};
  const db = { training_instances: [], activities: [], activity_laps: [] };
  const dom = {};
  const ctx = {
    IntervalEngineCore, RunningExecutionCore, EnduranceExecutionCore, CardioCore, DecisionCore: { Evidence: { decisionRulesSnapshot: () => null } },
    console, Date, Math, JSON, Promise, Object, Array, String, Number, isFinite, encodeURIComponent, setInterval: () => 0, clearInterval: () => {},
    authSession: { user: { id: 'user-1' } }, DETRAINING_RULES: null, SB_URL: 'x', SB_H: {},
    escHtml: (x) => String(x), tpHeader: () => '', toast: (m) => { ctx._toasts.push(m); }, _toasts: [], go: (s) => { ctx._nav.push(s); }, _nav: [],
    closeModal: () => {}, hrPairResetForNewSession: () => {}, localStorage: { setItem() {}, getItem() { return null; }, removeItem() {} },
    document: { getElementById: (id) => ({ set innerHTML(v) { dom[id] = v; }, get innerHTML() { return dom[id] || ''; }, value: '', checked: false }) },
    newTrainingInstanceId: () => 'inst-' + (db.training_instances.length + 1),
    createTrainingInstance: async ({ vasteTrainingId, customTrainingId, snapshot }) => { const id = ctx.newTrainingInstanceId(); db.training_instances.push({ id, custom_training_id: customTrainingId, snapshot }); return id; },
    sbGet: async (table, q) => { if (table === 'training_instances') { const m = /id=eq\.([^&]+)/.exec(q); return db.training_instances.filter((r) => r.id === decodeURIComponent(m[1])); } return []; },
    sbPostQ: async (table, row) => { if (opts.failLaps && table === 'activity_laps') return false; db[table].push(row); return true; },
    _runningPreviewConfig: null, _runningExecState: null, _runningGekozenVorm: null, _runningExecTimerHandle: null, previewCtx: null, previewStarting: false,
    _db: db, _dom: dom
  };
  vm.createContext(ctx);
  vm.runInContext(CONST_LINE + '\n' + FNS.map((n) => SRC[n]).join('\n') + '\nfunction runningExecLocalStorageKey(){return "k";}\nfunction renderRunningExecutionScreen(){ structuredRunningSync(Date.now()); }', ctx);
  return ctx;
}

(async () => {
  // ── A: normalizePrescription round-trip (raw → normalized, idempotent op normalized structuur) ──
  const n1 = IntervalEngineCore.normalizePrescription(RAW);
  const n2 = IntervalEngineCore.normalizePrescription(JSON.parse(JSON.stringify(RAW)));
  ok(n1.geldig && n1.blocks.length === 8 && JSON.stringify(n1) === JSON.stringify(n2), 'A: round-trip raw → normalized deterministisch (8 blokken, repeats uitgerold)');
  eq(IntervalEngineCore.totalPlannedSeconds(n1), 600 + 3 * 360 + 600, 'A: totalPlannedSeconds via core');
  ok(n1.blocks[1].type === 'work' && n1.blocks[1].repeatIndex === 0 && n1.blocks[1].repeatTotal === 3 && n1.blocks[6].repeatIndex === 2, 'K: repeatIndex/repeatTotal correct');
  ok(['warmup', 'work', 'recovery', 'work', 'recovery', 'work', 'recovery', 'cooldown'].join() === n1.blocks.map((b) => b.type).join(), 'J: blokvolgorde warmup→(work,recovery)×3→cooldown');

  // ── B/C: Builder save → Definition → reload (statisch + engine-contract) ──
  const WB_SAVE = html.slice(html.indexOf('function saveIntervalWorkout('), html.indexOf('function saveWorkout('));
  ok(/metadata:\{sel:\{sport:raw\.sport\|\|'running',goal:'conditie'\},intervalPrescription:raw/.test(WB_SAVE), 'B: Builder schrijft metadata.intervalPrescription = raw prescriptie');
  ok(/IntervalEngineCore\.normalizePrescription\(raw\)/.test(WB_SAVE) && /if\(!norm\.geldig\)return null/.test(WB_SAVE), 'B: Builder valideert via IntervalEngineCore vóór opslaan');
  ok(/sbPostQ\('custom_trainings'/.test(WB_SAVE) && /source:'builder'/.test(WB_SAVE) && !/exercise_targets:\[[^\]]/.test(WB_SAVE), 'B: opslag in custom_trainings (source builder), geen oefeningen');
  ok(/intervalPrescription:\(local\.metadata&&local\.metadata\.intervalPrescription\)\|\|null/.test(GET_DEF) && /intervalPrescription:\(def\.metadata&&def\.metadata\.intervalPrescription\)\|\|null/.test(GET_DEF), 'C: getTrainingDefinition levert intervalPrescription (lokaal + DB) — geen reconstructie');
  ok(/interval:\(t\.metadata&&t\.metadata\.intervalPrescription\)\|\|null/.test(html), 'C: savedList exposeert de opgeslagen prescriptie voor bewerken');

  // ── D/E: Preview leest opgeslagen prescriptie ──
  let c = makeSandbox();
  c.previewCtx = { def: { id: 'ct-1', name: '6×4 drempel', intervalPrescription: RAW }, source: 'custom' };
  c.renderTPInterval(c.document.getElementById('tp-body'));
  const pv = c._dom['tp-body'];
  ok(pv.includes('Hardlopen') && pv.includes('3× herhalen') && pv.includes('Warming-up') && pv.includes('Werk') && pv.includes('Herstel') && pv.includes('Cooling-down'), 'D: Preview toont sport, repeats, warmup/work/recovery/cooldown');
  ok(pv.includes('10:00') && pv.includes('4:00') && pv.includes('2:00') && pv.includes('pace 4:30/km') && pv.includes('RPE 8'), 'D: terminatie + pace/RPE-targets zichtbaar');
  ok(pv.includes(CardioCore.formatTime(2280) + ' gepland'), 'D: totale duur via IntervalEngineCore.totalPlannedSeconds');
  ok(!/afstandKm|_runningGekozenVorm|running-afstand|document\.getElementById\('running-/.test(SRC.renderTPInterval), 'E: Preview reconstrueert niets uit running-formuliervelden');
  ok(/previewCtx\.def&&previewCtx\.def\.intervalPrescription\)renderTPInterval\(el\)/.test(html), 'D: renderTrainingPreview routeert op de opgeslagen Definition');

  // ── F/G/H: instance-snapshot bevat prescriptie; executie ontvangt exact de snapshot-normalisatie ──
  c = makeSandbox();
  const def = { id: 'ct-1', source: 'custom', name: '6×4 drempel', intervalPrescription: RAW, exercises: [] };
  const instId = await c.startInstanceFromDefinition(def, []);
  const inst = c._db.training_instances[0];
  ok(instId === 'inst-1' && inst.custom_training_id === 'ct-1', 'F: createTrainingInstance met custom_training_id');
  ok(JSON.stringify(inst.snapshot.intervalPrescription) === JSON.stringify(RAW), 'F: snapshot bevat exact de Definition-prescriptie (raw)');
  ok(JSON.stringify(inst.snapshot.intervalPrescriptionNormalized) === JSON.stringify(n1), 'F: snapshot bevat de canonieke normalisatie (executie-input)');
  ok(/if\(def&&def\.intervalPrescription\)\{/.test(PREVIEW_START) && /startStructuredRunningExecution\(\{definitionId:def\.id,naam:def\.name,instanceId:instanceId\|\|null,prescription:norm,rawPrescription:def\.intervalPrescription\}\)/.test(PREVIEW_START),
    'G: previewStartTraining geeft de Definition-prescriptie (genormaliseerd) door aan de structured executie met instance-id');
  ok(/norm\.sport!=='running'/.test(PREVIEW_START), 'AB: alleen running wordt in B1 gestructureerd uitgevoerd (cycling/swimming/erg niet uitgebreid)');
  ok(PREVIEW_START.indexOf('if(def&&def.intervalPrescription)') < PREVIEW_START.indexOf("if(mode==='guided'"), 'G: structured pad vóór guided/strength-executie');

  // ── H/L/M/N/O/P/AC: executie via IntervalEngineCore, auto-laps, manual-lap, guard ──
  c = makeSandbox();
  const T0 = 1_000_000_000_000;
  c.Date.now = () => T0; // startmoment
  c.startStructuredRunningExecution({ definitionId: 'ct-1', naam: 'x', instanceId: 'inst-1', prescription: n1, rawPrescription: RAW });
  ok(c._nav.includes('s-running') && c._runningExecState && c._runningExecState.status === 'RUNNING', 'executie gestart op het bestaande running-scherm');
  eq(c._runningPreviewConfig.canonical, true, 'config gemarkeerd als canonical (Definition-gedreven)');
  ok(!c._runningPreviewConfig.intervalBlokken, 'H: canonical pad gebruikt GEEN legacy intervalBlokken');
  const stap0 = c.huidigeIntervalStap(T0 + 1000);
  ok(stap0 && stap0.canonical === true && stap0.blok && String(stap0.blok.label).startsWith('Warming-up') && stap0.index === 0 && stap0.totaal === 8, 'H: huidig blok via IntervalEngineCore.stateAt/blockIndexAtElapsed');
  // tijdtransitie: na 601 s warmup voltooid → auto-lap
  c.structuredRunningSync(T0 + 601_000);
  eq(c._runningExecState.laps.length, 1, 'L: tijdtransitie → exact 1 auto-lap voor de warming-up');
  ok(c._runningExecState.laps[0] && c._runningExecState.laps[0].lap_type === 'warmup' && c._runningExecState.laps[0].block_index === 0 && c._runningExecState.laps[0].repeat_index === 0, 'N/O/P: lap draagt lap_type/block_index/repeat_index');
  eq(c._runningExecState.laps[0] && c._runningExecState.laps[0].duration_seconds, 601, 'L: lap-duur = actieve tijd tot de transitie');
  c.structuredRunningSync(T0 + 601_000); c.structuredRunningSync(T0 + 700_000);
  eq(c._runningExecState.laps.length, 1, 'AC: herhaalde sync binnen hetzelfde blok maakt geen extra lap');
  // manual lap tijdens werkblok 1 (idx 1) na 700 s
  c.Date.now = () => T0 + 700_000;
  c.runningLap();
  eq(c._runningExecState.laps.length, 2, 'M: handmatige lap sluit het huidige werkblok');
  ok(c._runningExecState.laps[1] && c._runningExecState.laps[1].lap_type === 'work' && c._runningExecState.laps[1].block_index === 1, 'M: manual lap met bloksemantiek');
  eq(c._runningPreviewConfig.manualFromIndex, 2, 'M: tijdsprogressie hervat vanaf het volgende blok');
  c.runningLap();
  eq(c._runningExecState.laps.length, 2, 'AC: dubbel tikken direct na de transitie geeft geen dubbele lap (guard)');
  ok(c._toasts.some((t) => /al afgesloten|afgesloten/.test(t)), 'AC: gebruiker krijgt feedback, geen stille dubbele lap');
  // vanaf 700 s: herstel 2:00 loopt tot 820 s; auto + manual gelijktijdig op de grens
  c.structuredRunningSync(T0 + 821_000);
  eq(c._runningExecState.laps.length, 3, 'L: recovery (idx 2) auto-lap na 120 s vanaf de handmatige transitie');
  c.Date.now = () => T0 + 821_000; c.runningLap();
  eq(c._runningExecState.laps.length, 3, 'AC: handmatig tikken exact op/vlak na de auto-transitie (<2 s in het nieuwe blok) maakt GEEN dubbele/0-seconden-lap');
  ok(c._toasts.some((t) => /net gestart/.test(t)), 'AC: guard geeft feedback');
  c.Date.now = () => T0 + 825_000; c.runningLap();
  eq(c._runningExecState.laps.length, 4, 'AC: handmatig na >2 s sluit het NIEUWE blok (work 2/3), nooit het al afgesloten blok dubbel');
  ok(c._runningExecState.laps[3] && c._runningExecState.laps[2] && c._runningExecState.laps[3].block_index === 3 && c._runningExecState.laps[2].block_index === 2 && c._runningExecState.laps[3].lap_type === 'work' && c._runningExecState.laps[3].repeat_index === 1, 'AC: blokindices strikt oplopend, geen duplicaat; repeat_index 1 voor work 2/3');
  // volledig doorlopen
  c.structuredRunningSync(T0 + 10_000_000);
  const stapEnd = c.huidigeIntervalStap(T0 + 10_000_000);
  ok(stapEnd && stapEnd.voltooid === true, 'executie meldt voltooid na het laatste blok');
  ok(c._runningExecState.laps.every((l, i) => l.block_index === i), 'J/K: laps volgen exact de genormaliseerde blokvolgorde (0..7)');
  eq(c._runningExecState.laps.length, 8, 'alle 8 blokken hebben exact één lap');

  // ── Review-fix (concurrency-review §7 B): vroegtijdige finish sluit het lopende blok als actual-lap ──
  c = makeSandbox();
  c.Date.now = () => T0;
  c.startStructuredRunningExecution({ definitionId: 'ct-1', naam: 'x', instanceId: 'inst-1', prescription: n1, rawPrescription: RAW });
  c.structuredRunningSync(T0 + 601_000); // warmup voltooid (auto-lap)
  c.Date.now = () => T0 + 700_000;       // 99 s in werkblok 1
  c.runningRequestFinish();
  eq(c._runningExecState.status, 'FINISH_CONFIRM', 'finish-verzoek → FINISH_CONFIRM (bestaande state machine)');
  eq(c._runningExecState.laps.length, 2, 'review-fix: het lopende werkblok wordt bij finish-verzoek als lap afgesloten (geen verlies van het deelblok)');
  ok(c._runningExecState.laps[1] && c._runningExecState.laps[1].lap_type === 'work' && c._runningExecState.laps[1].block_index === 1 && c._runningExecState.laps[1].duration_seconds === 99, 'review-fix: deelblok-lap draagt bloksemantiek + werkelijke duur (99 s)');
  c.Date.now = () => T0 + 700_500; c.runningRequestFinish();
  eq(c._runningExecState.laps.length, 2, 'review-fix: tweede finish-verzoek maakt geen dubbele lap (cursor-guard)');
  // grens: vanuit PAUSED kan de core geen lap maken → alleen voltooide blokken gelogd, geen fake lap
  c = makeSandbox(); c.Date.now = () => T0;
  c.startStructuredRunningExecution({ definitionId: 'ct-1', naam: 'x', instanceId: 'inst-1', prescription: n1, rawPrescription: RAW });
  c.structuredRunningSync(T0 + 601_000); c.Date.now = () => T0 + 700_000; c.runningPause(); c.Date.now = () => T0 + 760_000; c.runningRequestFinish();
  eq(c._runningExecState.laps.length, 1, 'review-fix grens: pauze → finish logt geen fake lap voor het gepauzeerde blok (eerlijk: alleen voltooide blokken)');
  // blok < 2 s actief bij finish → geen 0-seconden-lap
  c = makeSandbox(); c.Date.now = () => T0;
  c.startStructuredRunningExecution({ definitionId: 'ct-1', naam: 'x', instanceId: 'inst-1', prescription: n1, rawPrescription: RAW });
  c.structuredRunningSync(T0 + 601_000); c.Date.now = () => T0 + 601_500; c.runningRequestFinish();
  eq(c._runningExecState.laps.length, 1, 'review-fix guard: blok <2 s actief bij finish → geen 0-seconden-lap');
  ok(/structuredRunningCloseOpenBlock\(Date\.now\(\)\)/.test(SRC.runningRequestFinish), 'review-fix: hook zit in runningRequestFinish (status nog RUNNING), niet pas in confirmFinish');

  // ── Q/R/N: finish-payload en lap-writes (statisch op de echte finish-functie) ──
  ok(/training_instance_id:\(_runningPreviewConfig&&_runningPreviewConfig\.instanceId\)\|\|null/.test(RUN_FINISH), 'Q/R: activities.training_instance_id = actieve instance, NULL voor legacy');
  ok(/lap_type:lap\.lap_type\|\|null,block_index:\(typeof lap\.block_index==='number'\)\?lap\.block_index:null,repeat_index:\(typeof lap\.repeat_index==='number'\)\?lap\.repeat_index:null/.test(RUN_FINISH), 'N/O/P: activity_laps-write bevat lap_type/block_index/repeat_index');
  ok(!/exNote/.test(RUN_FINISH) && !/planned_duration|planned_distance|planned_pace/.test(RUN_FINISH), 'AE/11: geen free-text-only persistentie en geen planned-duplicatie in laps');
  ok(/is_max_effort:isMaxEffort/.test(RUN_FINISH) && /const isMaxEffort=isMaxEffortEl\?isMaxEffortEl\.checked:false/.test(html.slice(html.indexOf('async function runningConfirmFinish'))), 'X/P: is_max_effort blijft uitsluitend de expliciete checkbox (niet automatisch bij interval)');

  // ── S/T/U: History planned-vs-actual via instance + legacy ongewijzigd ──
  c = makeSandbox();
  c._db.training_instances.push({ id: 'inst-9', custom_training_id: 'ct-1', snapshot: { intervalPrescription: RAW, intervalPrescriptionNormalized: n1 } });
  const laps = [{ lap_index: 1, duration_seconds: 601, distance_meters: 1500, lap_type: 'warmup', block_index: 0, repeat_index: 0 }, { lap_index: 2, duration_seconds: 240, distance_meters: 890, lap_type: 'work', block_index: 1, repeat_index: 0 }];
  let hist = await c.renderRunDetailStructuredHtml({ training_instance_id: 'inst-9' }, laps);
  ok(hist.includes('gepland vs. uitgevoerd') && hist.includes('8 blokken gepland') && hist.includes('2 van 8 blokken gelogd'), 'S: History haalt het plan op via training_instances.snapshot');
  ok(hist.includes('Werk 1/3') && hist.includes('4:00') && hist.includes('pace 4:30/km') && hist.includes('890 m') && hist.includes('niet gelogd'), 'T: planned (terminatie/targets) naast actual laps per blok; ontbrekende blokken eerlijk "niet gelogd"');
  hist = await c.renderRunDetailStructuredHtml({ training_instance_id: null }, [{ lap_index: 1, duration_seconds: 300 }]);
  eq(hist, '', 'U: legacy activity zonder instance → geen structured blok (oude rendering intact)');
  hist = await c.renderRunDetailStructuredHtml({ training_instance_id: 'onbekend' }, []);
  eq(hist, '', 'U: ontbrekende instance → fail-safe leeg');
  ok(/\$\{structured\}/.test(REN_DETAIL) && /l\.lap_type\?\(TK_IV_BLOCK_LABEL\[l\.lap_type\]/.test(REN_DETAIL), 'T/U: run-detail toont het blok en labelt laps alleen als lap_type bestaat');
  ok(!/regress|Math\.pow|acwr|criticalSpeed/.test(SRC.renderRunDetailStructuredHtml), 'History bevat geen berekening');

  // ── V: scheduling round-trip (bestaande generieke keten, statisch bewezen) ──
  ok(/openTrainingPreview\('custom',/.test(html) && /startInstanceFromDefinition\(def,modifications\)/.test(PREVIEW_START), 'V: Mijn training → openTrainingPreview(custom) → previewStartTraining → createTrainingInstance (bestaande generieke scheduling, geen endurance-scheduler)');
  ok(!/planned_training_occurrences|planned_training_assignments/.test(SRC.startStructuredRunningExecution + PREVIEW_START.slice(PREVIEW_START.indexOf('intervalPrescription'))), 'V: geen nieuwe scheduling-tabellen/-logica');

  // ── W: bestaande calculations consumeren de structured activity ongewijzigd ──
  const act = { sport: 'running', recorded_at: '2026-09-13T10:00:00Z', distance_meters: 8000, duration_seconds: 2280, rpe: 7, is_max_effort: false };
  eq(TrainingLoadCore.sessionLoadSRPE(act.duration_seconds, act.rpe), Math.round(2280 / 60 * 7), 'W: sRPE op de structured activity via TrainingLoadCore');
  ok(RunningIntelligenceCore.weeklyVolume([act])[Object.keys(RunningIntelligenceCore.weeklyVolume([act]))[0]].distanceMeters === 8000, 'W: weekvolume via RunningIntelligenceCore');
  ok(CardioCore.splitFromDistTime(8000, 2280, 1000) === 285, 'W: pace via CardioCore.splitFromDistTime');
  eq(RunningIntelligenceCore.criticalSpeedEligiblePerformances([act], 3).status, 'insufficient', 'X: intervaltraining zonder max-effort-vinkje is NIET CS-eligible');
  ok(ProgressionCore.trendBy([{ key: 'a', date: '2026-09-01', v: 300 }, { key: 'a', date: '2026-09-08', v: 290 }, { key: 'a', date: '2026-09-13', v: 285 }], 'a', 'v', 'min', 3).status === 'trend', 'W: trendBy ongewijzigd inzetbaar');

  // ── Y/Z/AA/AB: grenzen ──
  ok(!/activity_laps|intervalPrescription|intervalBlokken/.test(BUILD_CTX), 'Y: buildCtx() bevat geen raw laps/intervals (geen AI-berekening)');
  ok(!/IntervalEngineCore/.test(BUILD_CTX), 'Y: Context roept de interval-engine niet aan');
  ok(!/Concept2|nativeConcept2|concept2Live/.test(SRC.startStructuredRunningExecution + SRC.structuredRunningSync + SRC.runningLap + WB_SAVE), 'AA: geen Concept2-wijzigingen in het B1-pad');
  ok(!/huidigeCyclingIntervalStap|huidigeSwimmingIntervalStap/.test(SRC.structuredRunningSync + SRC.huidigeIntervalStap), 'AB: cycling/swimming executie niet aangeraakt');
  ok(/^function huidigeCyclingIntervalStap/m.test(html) && /^function huidigeSwimmingIntervalStap/m.test(html), 'AB: legacy cycling/swimming-paden bestaan ongewijzigd');
  ok(/if\(!_runningPreviewConfig\|\|!_runningPreviewConfig\.intervalBlokken\)return null;/.test(SRC.huidigeIntervalStap), 'legacy ad-hoc running (intervalBlokken) blijft compatibel na het canonical pad');
  ok(!/Math\.pow|Math\.exp|regress|slope/.test(SRC.structuredRunningSync + SRC.structuredBlockIndexNow + SRC.huidigeIntervalStap), 'I: geen duplicate/eigen intervalformule (alleen IntervalEngineCore + core-laps)');
  ok(/IntervalEngineCore\.blockIndexAtElapsed\(/.test(SRC.structuredBlockIndexNow) && /IntervalEngineCore\.stateAt\(/.test(SRC.huidigeIntervalStap), 'H: IntervalEngineCore is de executie-semantiek');

  // ── AD: migratie nullable, forward-only ──
  const mig = fs.readFileSync(path.join(ROOT, 'migratie_v563.sql'), 'utf8');
  ok(/add column if not exists training_instance_id uuid null\s+references public\.training_instances\(id\) on delete set null/.test(mig), 'AD: activities.training_instance_id nullable, ON DELETE SET NULL (geen cascade-verlies van historie)');
  ok(/add column if not exists lap_type text null/.test(mig) && /add column if not exists block_index integer null/.test(mig) && /add column if not exists repeat_index integer null/.test(mig), 'AD: lap-kolommen nullable');
  const migCode = mig.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  ok(!/update public\.|backfill|exNote|drop policy|alter policy|disable row level security|create policy/i.test(migCode), 'AD: geen backfill, geen exNote-parsing, geen RLS-wijziging (uitsluitend additieve nullable kolommen + index)');

  // ── W: strength-executie ongewijzigd (statisch: startCustomTraining/startT-aanroep in preview intact) ──
  ok(/startCustomTraining\(id,resolvedItems\)/.test(PREVIEW_START) && /startT\(id\)/.test(PREVIEW_START), 'Z: strength/custom-executiepaden in previewStartTraining ongewijzigd');

  // ── W (reload): config incl. prescription wordt met de exec-state gepersisteerd ──
  ok(/config:_runningPreviewConfig/.test(SRC.persisteerRunningExecState) || /_runningPreviewConfig/.test(SRC.persisteerRunningExecState), 'W: prescription/config gaat mee in de bestaande localStorage-persistentie (reload-herstel)');

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fStructuredIntervalsCanonical: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
