/* FASE 2A — Concept2 finalize-lifecycle (H3 logging, H4 cleanup, H5 orphan-preventie).
 * Draait de ECHTE functies uit index.html (finishSession, saveLosOefening, tkErgStartProtocol,
 * tkC2ExecutionCleanup, tkErgDisconnect, _c2rtTeardown, cardioDataToRow, ...) in een sandbox met
 * de ECHTE browserbinding van Concept2Live (geen bare liveWorkoutToActual-global). Daarmee wordt
 * expliciet de buitenste guard van finishSession geraakt die de eerdere mocks omzeilden.
 * Sabotage-blok onderaan bewijst dat de tests de reparaties daadwerkelijk raken. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const C2L = require(path.join(ROOT, 'core/concept2Live.js'));
const DC = require(path.join(ROOT, 'core/deviceIntegration.js'));
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const EPI = require(path.join(ROOT, 'core/ergProtocolIdentity.js'));
const IEC = require(path.join(ROOT, 'core/intervalEngine.js'));
const DecisionCore = require(path.join(ROOT, 'core/decision.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');

function fnSrc(html, name) {
  let start = html.indexOf('async function ' + name + '(');
  if (start === -1) start = html.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('niet gevonden: ' + name);
  let d = 0; const b = html.indexOf('{', html.indexOf(')', start));
  for (let k = b; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (d === 0) return html.slice(start, k + 1); } }
  throw new Error('onvolledig: ' + name);
}
function constSrc(html, decl) {
  const s = html.indexOf(decl); let d = 0; const b = html.indexOf('{', s);
  for (let k = b; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (d === 0) return html.slice(s, k + 1) + ';'; } }
}
const FNS = ['finishSession', 'saveLosOefening', 'clearLosSessionState', 'losHasUnsavedData', 'tkErgStartProtocol',
  'tkErgOnCanonicalMeasurement', 'tkC2IsLoggableSummary', 'tkC2Converter', 'tkC2SessionRowFromLog', 'tkC2ExecutionCleanup',
  'tkErgDisconnect', 'tkErgDisconnectAll', '_c2rtTeardown', '_c2rtSet', '_c2rtGet', '_c2repaint', '_c2idleInner', '_c2note', '_c2btn',
  'cardioDataToRow', 'resolveCardioType', 'tkErgProtocolSection', 'tkErgProtocolProjectionFor', 'tkErgProtocolInstanceId',
  'tkIsErgCardioType', 'execLeaveDiscard', 'resetLosAllState', 'resetLosExerciseSelection', 'buildStrengthSessionRow', 'tkC2TrainingExecIds'];
const UNDEF = Symbol('undef');
function deepNoop() {
  const f = function () { return deepNoop(); };
  return new Proxy(f, { get: (t, k) => (k === 'then' || k === Symbol.toPrimitive) ? undefined : deepNoop(), apply: () => deepNoop() });
}
function element(v) { return { value: v || '', style: {}, textContent: '', className: '', innerHTML: '', disabled: false, classList: { toggle() {}, add() {}, remove() {}, contains: () => false }, querySelectorAll: () => [], querySelector: () => null, setAttribute() {} }; }

function makeWorld(html, over) {
  over = over || {};
  const events = []; const writes = []; const creates = []; const disconnects = []; const toasts = []; const completes = [];
  const transport = { disconnect: (r) => disconnects.push(r), getStatus: () => ({ state: 'idle' }) };
  const fields = over.fields || {};
  const env = {
    // echte modules zoals in de browser geladen (globals) -- bewust GEEN bare liveWorkoutToActual
    Concept2Live: C2L, DeviceCore: DC, DecisionCore: DecisionCore, sessionPrBase: {}, prFor: () => null, upsertExerciseGoalField: async () => {}, tkSetEvidence: UNDEF, CardioCore: CardioCore, ErgProtocolIdentity: EPI, IntervalEngineCore: IEC,
    liveWorkoutToActual: UNDEF, TKWeather: UNDEF, tkC2DiagFinishPath: UNDEF, tkC2DiagFinishEx: UNDEF, tkC2DiagFinishCalled: UNDEF, tkC2DiagOnCanonical: UNDEF,
    curT: 't1', trainStart: Date.now() - 60000, pausedAccumMs: 0, activeInstanceId: over.activeInstanceId || null,
    sessionLog: {}, sessionExtra: [], finishSessionBezig: false, _tkErgPending: null, _ergProtocol: {}, _c2pair: {}, _c2rt: {}, _c2liveLast: {},
    LOS_DOMID: 'los', losSelectedExId: null,
    exercisesList: [], getSessionExs: () => env.exercisesList, getExerciseMuscles: () => [],
    ensureSessionExerciseRows: async () => {}, ensureExerciseRow: async () => {},
    writeSessionRow: async (row) => { if (env.failWrites > 0) { env.failWrites--; if (over.writeReturnsFalse) return false; throw new Error('netwerk'); } writes.push(JSON.parse(JSON.stringify(row))); events.push('write:' + (row.training_instance_id || '-')); return true; },
    failWrites: 0,
    sbPostQ: async (table, row) => { if (table !== 'sessions') throw new Error('onverwachte tabel ' + table); return env.writeSessionRow(row); },
    createTrainingInstance: async (arg) => { creates.push(arg); return over.createReturns === undefined ? ('inst-' + creates.length) : over.createReturns; },
    completeTrainingInstance: async (id) => { events.push('complete:' + id); if (over.completeThrows) throw new Error('offline'); completes.push(id); },
    sbPatchQ: async (t) => { events.push('patch:' + t); return true; }, sbDeleteQ: async (t) => { events.push('DELETE:' + t); return true; },
    tkDeviceTransport: () => transport,
    resolvePickerEx: (id) => env.exIndex[id] || null, exIndex: {},
    localStorage: { getItem: () => '', setItem() {}, removeItem() {} },
    document: { getElementById: (id) => element(fields[id]), querySelectorAll: () => [], querySelector: () => null },
    window: { toast: (m) => toasts.push(m) }, toast: (m) => toasts.push(m),
    td: () => '2026-09-27', TK_IV_SPORT_LABEL: { rowing: 'RowErg', skierg: 'SkiErg', bikeerg: 'BikeErg' },
    snapshotFromCustomTraining: (def) => ({ source: 'custom_training', definition_id: def.id, intervalPrescription: def.intervalPrescription }),
    console: { log() {}, warn() {}, error() {}, info() {} }, CARDIO_TYPES: null, CARDIO_TYPE_BY_ID: null
  };
  Object.assign(env, over.env || {});
  const proxy = new Proxy(env, {
    has: () => true,
    get: (t, k) => { if (k === Symbol.unscopables) return undefined; if (k in t) return t[k] === UNDEF ? undefined : t[k]; if (k in globalThis) return globalThis[k]; return deepNoop(); },
    set: (t, k, v) => { t[k] = v; return true; }
  });
  const src = constSrc(html, 'const CARDIO_TYPES = {').replace('const CARDIO_TYPES', 'CARDIO_TYPES') + '\n' +
    constSrc(html, 'const CARDIO_TYPE_BY_ID').replace('const CARDIO_TYPE_BY_ID', 'CARDIO_TYPE_BY_ID') + '\n' +
    FNS.map(n => fnSrc(html, n)).join('\n') + '\nreturn {' + FNS.join(',') + '};';
  const api = new Function('__env', 'with(__env){\n' + src + '\n}')(proxy);
  return { env, api, events, writes, creates, disconnects, toasts, completes, transport };
}
const CM = { row: { machineType: 'rowerg', distanceM: 2000, elapsedTimeS: 420, watts: 240, strokeRateSPM: 30, heartRateBPM: 150, dragFactor: 125 },
  bike: { machineType: 'bikeerg', distanceM: 5000, elapsedTimeS: 600, watts: 190, strokeRateSPM: 85 },
  ski: { machineType: 'skierg', distanceM: 1500, elapsedTimeS: 390, watts: 205, strokeRateSPM: 36 } };
const EX = { roeien: { id: 'roeien', naam: 'Roeien', type: 'cardio', cardioType: 'rowing' }, bikeerg: { id: 'bikeerg', naam: 'BikeErg', type: 'cardio', cardioType: 'bikeerg' },
  skierg: { id: 'skierg', naam: 'SkiErg', type: 'cardio', cardioType: 'skierg' }, assault: { id: 'assault', naam: 'Assault', type: 'cardio', cardioType: 'assaultbike' } };

async function suite(html, label) {
  const R = {};
  const L = (s) => label + s;
  // resolveCardioType moet de echte mapping gebruiken; check dat de fixtures erg-typen opleveren
  { const w = makeWorld(html); R.ct = w.api.resolveCardioType(EX.roeien); }

  // 1. Training PM5-only, leeg handmatig formulier -> exact één correcte row
  { const w = makeWorld(html, { activeInstanceId: 'I-T' }); w.env.exercisesList = [EX.roeien];
    w.api.tkErgOnCanonicalMeasurement('roeien', CM.row);
    await w.api.finishSession();
    R.t1 = w.writes.length; R.t1row = w.writes[0] || null; }
  // 3. PM5 + handmatige velden -> géén dubbele row, PM5 wint
  { const w = makeWorld(html); w.env.exercisesList = [EX.roeien];
    w.api.tkErgOnCanonicalMeasurement('roeien', CM.row); w.env.sessionLog.roeien.cardio = { type: 'rowing', time: '9:59', dist: '1234' };
    await w.api.finishSession(); R.t3 = w.writes.length; R.t3dist = w.writes[0] && w.writes[0].distance; }
  // 4. ongeldige/onvolledige .c2 -> geen fake row (training)
  for (const [k, c2] of [['zero', { machineType: 'rowerg', distanceM: 0, elapsedTimeS: 0 }], ['nomt', { distanceM: 800, elapsedTimeS: 200 }], ['empty', {}], ['nan', { machineType: 'rowerg', distanceM: 'x', elapsedTimeS: null }]]) {
    const w = makeWorld(html); w.env.exercisesList = [EX.roeien]; w.env.sessionLog.roeien = { c2: c2 };
    await w.api.finishSession(); R['t4' + k] = w.writes.length; }
  // 5+7. write failure -> retry-state behouden, geen voortijdige cleanup; retry -> één row + cleanup
  { const w = makeWorld(html); w.env.exercisesList = [EX.roeien]; w.env.failWrites = 1;
    w.env._ergProtocol.roeien = { type: 'distance', value: 500, instanceId: 'I-A', prescription: null };
    w.env._c2rt.roeien = { generation: 1, deviceId: 'D', prog: { cancel() {} }, agg: { reset() {} } };
    w.api.tkErgOnCanonicalMeasurement('roeien', CM.row);
    await w.api.finishSession();
    R.t5writes = w.writes.length; R.t5keptLog = !!(w.env.sessionLog.roeien && w.env.sessionLog.roeien.c2);
    R.t5keptProto = !!(w.env._ergProtocol.roeien && w.env._ergProtocol.roeien.instanceId); R.t5keptRt = !!w.env._c2rt.roeien;
    R.t5toast = w.toasts.some(t => /mislukt/i.test(t));
    await w.api.finishSession();
    R.t5retry = w.writes.length; R.t5inst = w.writes[0] && w.writes[0].training_instance_id;
    R.t5unlocked = !w.env._ergProtocol.roeien; R.t5rtGone = !w.env._c2rt.roeien;
    const sec = w.api.tkErgProtocolSection('roeien', 'rowing'); R.t5buttons = !!sec && !/disabled/.test(sec); }
  // 2. Losse PM5-only -> één correcte row (+ protocolidentiteit/instance)
  { const w = makeWorld(html); w.env.exIndex.roeien = EX.roeien; w.env.losSelectedExId = 'roeien';
    w.env._ergProtocol.los = { type: 'distance', value: 500, instanceId: 'I-LOS', prescription: EPI.continuousErgPrescription ? IEC.normalizePrescription(EPI.continuousErgPrescription('rowing', 'distance', 500)) : null };
    w.api.tkErgOnCanonicalMeasurement('los', CM.row);
    await w.api.saveLosOefening(null);
    R.l2 = w.writes.length; R.l2row = w.writes[0] || null; R.l2unlocked = !w.env._ergProtocol.los; R.l2logGone = !w.env.sessionLog.los; }
  // Losse write failure -> state behouden
  { const w = makeWorld(html, { writeReturnsFalse: true }); w.env.exIndex.roeien = EX.roeien; w.env.losSelectedExId = 'roeien'; w.env.failWrites = 1;
    w.env._ergProtocol.los = { type: 'time', value: 60, instanceId: 'I-L2' };
    w.api.tkErgOnCanonicalMeasurement('los', CM.row);
    await w.api.saveLosOefening(null);
    R.l5writes = w.writes.length; R.l5kept = !!(w.env.sessionLog.los && w.env.sessionLog.los.c2) && !!w.env._ergProtocol.los; R.l5toast = w.toasts.some(t => /Fout bij opslaan/.test(t)); }
  // Losse ongeldige .c2 -> geen PM5-data in de row (handmatig pad ongewijzigd)
  { const w = makeWorld(html); w.env.exIndex.roeien = EX.roeien; w.env.losSelectedExId = 'roeien';
    w.env.sessionLog.los = { c2: { machineType: 'rowerg', distanceM: 0, elapsedTimeS: 0 } };
    await w.api.saveLosOefening(null);
    R.l4 = w.writes[0] || null; }
  // Losse PM5 + handmatig -> één row, PM5 wint
  { const w = makeWorld(html, { fields: { 'los-time': '9:59', 'los-dist': '1111' } }); w.env.exIndex.roeien = EX.roeien; w.env.losSelectedExId = 'roeien';
    w.api.tkErgOnCanonicalMeasurement('los', CM.row); await w.api.saveLosOefening(null);
    R.l3 = w.writes.length; R.l3dist = w.writes[0] && w.writes[0].distance; }
  // 8. Bike los -> finalize -> Row los zonder state leakage
  { const w = makeWorld(html); w.env.exIndex.bikeerg = EX.bikeerg; w.env.exIndex.roeien = EX.roeien;
    let unsub = 0; const bikeCb = []; w.env._c2pair.los = { cardioType: 'bikeerg', mt: 'bikeerg', devices: [], connected: true, deviceId: 'BIKE',
      _unsubMetrics: () => { unsub++; }, _unsubConn: () => {}, lastCm: CM.bike };
    w.env._c2rt.los = { generation: 7, deviceId: 'BIKE', prog: { cancel() {} }, agg: { reset() {} } };
    w.env._ergProtocol.los = { type: 'time', value: 1, instanceId: 'I-BIKE' };
    w.env.losSelectedExId = 'bikeerg'; w.api.tkErgOnCanonicalMeasurement('los', CM.bike);
    await w.api.saveLosOefening(null);
    R.b8write = w.writes.length && w.writes[0].exercise_id; R.b8dist = w.writes[0] && w.writes[0].distance;
    R.b8disc = w.disconnects.slice(); R.b8unsub = unsub; R.b8rt = !!w.env._c2rt.los; R.b8proto = !!w.env._ergProtocol.los; R.b8log = !!w.env.sessionLog.los;
    R.b8pairConnected = !!(w.env._c2pair.los && w.env._c2pair.los.connected);
    // volgende losse RowErg: schone start
    w.env.losSelectedExId = 'roeien';
    const sec = w.api.tkErgProtocolSection('los', 'rowing'); R.b8buttons = !!sec && !/disabled/.test(sec);
    R.b8has = w.api.losHasUnsavedData();
    w.api.tkErgOnCanonicalMeasurement('los', CM.row); await w.api.saveLosOefening(null);
    R.b8row2 = w.writes[1] || null; }
  // Losse wisselen zonder opslaan met PM5-data: telt als niet-opgeslagen data
  { const w = makeWorld(html); w.api.tkErgOnCanonicalMeasurement('los', CM.row);
    w.env.document.getElementById = (id) => id === 'los-body' ? element('') : element('');
    R.lUnsaved = w.api.losHasUnsavedData(); }
  // 9. nieuwe execution na afgeronde execution (A -> finalize -> B)
  { const w = makeWorld(html); w.env.exercisesList = [EX.roeien];
    w.env._ergProtocol.roeien = { type: 'distance', value: 500, instanceId: 'I-A' };
    w.api.tkErgOnCanonicalMeasurement('roeien', CM.row); await w.api.finishSession();
    w.env.sessionLog = {}; w.env.finishSessionBezig = false;
    w.env._ergProtocol.roeien = { type: 'distance', value: null, instanceId: null };
    w.env.document.getElementById = (id) => element(id === 'ergp-val-roeien' ? '1000' : '');
    await w.api.tkErgStartProtocol('roeien', 'rowing');
    R.t9newInst = w.env._ergProtocol.roeien && w.env._ergProtocol.roeien.instanceId; R.t9creates = w.creates.length; }
  // 10. programming/start failure -> geen nieuwe orphan instance
  { const w = makeWorld(html, { env: { tkErgProgramPm5IfNeeded: async () => ({ attempted: true, confirmed: false, state: 'TIMEOUT', message: 'x' }) } });
    w.env._ergProtocol.roeien = { type: 'distance', value: null, instanceId: null };
    w.env.document.getElementById = () => element('500');
    await w.api.tkErgStartProtocol('roeien', 'rowing');
    R.t10creates = w.creates.length; R.t10inst = w.env._ergProtocol.roeien.instanceId; R.t10busy = w.env._ergProtocol.roeien.busy;
    await w.api.tkErgStartProtocol('roeien', 'rowing'); R.t10retryCreates = w.creates.length; }
  // 11. succesvolle start -> precies één correcte instance (PM5 bevestigd, en zonder PM5)
  for (const [k, pr] of [['conf', { attempted: true, confirmed: true, state: 'PROGRAMMED' }], ['nopm5', { attempted: false }]]) {
    const w = makeWorld(html, { env: { tkErgProgramPm5IfNeeded: async () => pr } });
    w.env._ergProtocol.roeien = { type: 'distance', value: null, instanceId: null };
    w.env.document.getElementById = () => element('500');
    await w.api.tkErgStartProtocol('roeien', 'rowing');
    R['t11' + k] = [w.creates.length, w.env._ergProtocol.roeien.instanceId]; }
  // Tijd zonder PM5-programmering (H2 ongewijzigd): instance zoals voorheen
  { const w = makeWorld(html, { env: { tkErgProgramPm5IfNeeded: async () => ({ attempted: false }) } });
    w.env._ergProtocol.skierg = { type: 'time', value: null, instanceId: null };
    w.env.document.getElementById = () => element('30:00');
    await w.api.tkErgStartProtocol('skierg', 'skierg');
    R.t11time = [w.creates.length, w.env._ergProtocol.skierg.instanceId]; }
  // training discard = terminaal -> cleanup, geen writes
  { const w = makeWorld(html, { env: { confirmModal: async () => true } }); w.env.exercisesList = [EX.roeien];
    w.env._ergProtocol.roeien = { type: 'time', value: 60, instanceId: 'I-D' }; w.api.tkErgOnCanonicalMeasurement('roeien', CM.row);
    w.env._ergProtocol.los = { type: 'time', value: 60, instanceId: 'I-LOSSE' };
    await w.api.execLeaveDiscard(); R.tdisc = [w.writes.length, !!w.env._ergProtocol.roeien]; R.tdiscLos = !!w.env._ergProtocol.los; }
  // 13. regressie: niet-Concept2 cardio (handmatig, geen .c2) -> bestaand pad
  { const w = makeWorld(html); w.env.exercisesList = [EX.assault];
    w.env.sessionLog.assault = { cardio: { type: 'assaultbike', time: '10:00', cals: '120' } };
    await w.api.finishSession(); R.r13 = w.writes.length; R.r13row = w.writes[0] || null; }
  { const w = makeWorld(html); w.env.exercisesList = [EX.roeien];
    w.env.sessionLog.roeien = { cardio: { type: 'rowing', time: '7:30', dist: '2000' } };
    await w.api.finishSession(); R.r13b = w.writes.length; R.r13brow = w.writes[0] || null; }
  { const w = makeWorld(html, { activeInstanceId: 'I-S' }); w.env.exercisesList = [{ id: 'squat', naam: 'Squat', type: 'strength' }, EX.roeien];
    w.env.sessionLog.squat = { sets: [{ kg: '100', reps: '5', rpe: '8' }, { kg: '105', reps: '3', rpe: '9' }] };
    w.api.tkErgOnCanonicalMeasurement('roeien', CM.row);
    await w.api.finishSession(); R.r13s = w.writes.map(r => [r.exercise_id, r.sets || null, r.weight || null, r.distance || null]); R.r13sInst = w.writes.map(r => r.training_instance_id); }
  { const w = makeWorld(html); w.env.exercisesList = [EX.roeien];         // leeg formulier, geen .c2 -> niets (ongewijzigd)
    w.env.sessionLog.roeien = { cardio: { type: 'rowing' } };
    await w.api.finishSession(); R.r13c = w.writes.length; }
  // ── FASE 2A.1 (H5) — completion-lifecycle ──
  // A. Losse PM5 succesvol -> row gekoppeld aan instance -> instance completed (na de write, vóór cleanup)
  { const w = makeWorld(html); w.env.exIndex.roeien = EX.roeien; w.env.losSelectedExId = 'roeien';
    w.env._ergProtocol.los = { type: 'distance', value: 500, instanceId: 'I-C1', prescription: IEC.normalizePrescription(EPI.continuousErgPrescription('rowing', 'distance', 500)) };
    w.api.tkErgOnCanonicalMeasurement('los', CM.row);
    await w.api.saveLosOefening(null);
    R.c1 = { events: w.events.slice(), completes: w.completes.slice(), rows: w.writes.length, rowInst: w.writes[0] && w.writes[0].training_instance_id, proto: !!w.env._ergProtocol.los }; }
  // B. write failure -> niet completed -> retry met DEZELFDE instance -> één row -> completed
  { const w = makeWorld(html, { writeReturnsFalse: true }); w.env.exIndex.roeien = EX.roeien; w.env.losSelectedExId = 'roeien'; w.env.failWrites = 1;
    w.env._ergProtocol.los = { type: 'time', value: 600, instanceId: 'I-C2' };
    w.api.tkErgOnCanonicalMeasurement('los', CM.row);
    await w.api.saveLosOefening(null);
    R.c2a = { completes: w.completes.slice(), rows: w.writes.length, kept: !!(w.env._ergProtocol.los && w.env._ergProtocol.los.instanceId === 'I-C2') };
    await w.api.saveLosOefening(null);
    R.c2b = { completes: w.completes.slice(), rows: w.writes.length, rowInst: w.writes[0] && w.writes[0].training_instance_id, creates: w.creates.length, events: w.events.slice() }; }
  // C. completion faalt (offline/exception) -> oefening blijft opgeslagen, state opgeruimd, geen tweede row
  { const w = makeWorld(html, { completeThrows: true }); w.env.exIndex.roeien = EX.roeien; w.env.losSelectedExId = 'roeien';
    w.env._ergProtocol.los = { type: 'distance', value: 500, instanceId: 'I-C3' };
    w.api.tkErgOnCanonicalMeasurement('los', CM.row);
    await w.api.saveLosOefening(null);
    R.c3 = { rows: w.writes.length, toastOk: w.toasts.includes('Opgeslagen'), cleaned: !w.env._ergProtocol.los }; }
  // D. Losse zonder instance (Vrij / niet-Concept2) -> geen completion-aanroep (ongewijzigd)
  { const w = makeWorld(html); w.env.exIndex.roeien = EX.roeien; w.env.losSelectedExId = 'roeien';
    w.api.tkErgOnCanonicalMeasurement('los', CM.row); await w.api.saveLosOefening(null);
    R.c4 = { completes: w.completes.length, patches: w.events.filter(e => /^patch/.test(e)).length, rows: w.writes.length }; }
  // E. normale training-lifecycle ongewijzigd: exact activeInstanceId completed, na de writes
  { const w = makeWorld(html, { activeInstanceId: 'I-TR' }); w.env.exercisesList = [EX.roeien];
    w.api.tkErgOnCanonicalMeasurement('roeien', CM.row); await w.api.finishSession();
    R.c5 = { completes: w.completes.slice(), events: w.events.slice() }; }
  { const w = makeWorld(html, { activeInstanceId: 'I-TR2' }); w.env.exercisesList = [EX.roeien]; w.env.failWrites = 1;
    w.api.tkErgOnCanonicalMeasurement('roeien', CM.row); await w.api.finishSession();
    R.c5fail = w.completes.length; }
  // F. start -> verlaten zonder opslag: GEEN DB-write (open gap, zie rapport) en nooit DELETE
  { const w = makeWorld(html); w.env._ergProtocol.los = { type: 'time', value: 600, instanceId: 'I-LEFT' };
    w.api.tkErgOnCanonicalMeasurement('los', CM.row); w.api.clearLosSessionState();
    R.c6 = { events: w.events.slice(), proto: !!w.env._ergProtocol.los }; }
  return R;
}

(async function run() {
  const R = await suite(HTML, '');
  ok(R.ct === 'rowing', 'fixture: roeien is rowing-cardio (' + R.ct + ')');
  eq(R.t1, 1, 'T1: Training PM5-only met leeg formulier -> exact één row (buitenste guard geraakt)');
  ok(R.t1row && R.t1row.distance === 2000 && R.t1row.watt === 240 && R.t1row.stroke_rate === 30, 'T1: row draagt de gemeten PM5-waarden');
  ok(R.t1row && typeof R.t1row.time_str === 'string' && R.t1row.time_str.length > 0, 'T1: duur als time_str via de canonieke converter');
  ok(R.t1row && /drag 125/.test(R.t1row.note) && /hr 150/.test(R.t1row.note), 'T1: converter-note (drag/hr) aanwezig');
  eq(R.t1row && R.t1row.training_instance_id, 'I-T', 'T1: training_instance_id behouden');
  eq(R.t1row && R.t1row.exercise_id, 'roeien', 'T1: exercise_id ongewijzigd');
  eq(R.t3, 1, 'T3: PM5 + handmatig -> géén dubbele row'); eq(R.t3dist, 2000, 'T3: PM5-meting wint van het formulier');
  ['zero', 'nomt', 'empty', 'nan'].forEach(k => eq(R['t4' + k], 0, 'T4: ongeldige .c2 (' + k + ') -> geen fake row'));
  eq(R.t5writes, 0, 'T5: mislukte write -> niets geschreven'); ok(R.t5keptLog, 'T5: sessionLog.c2 behouden voor retry');
  ok(R.t5keptProto, 'T7: protocol NIET voortijdig vrijgegeven bij mislukte finalize'); ok(R.t5keptRt, 'T7: runtime NIET voortijdig opgeruimd');
  ok(R.t5toast, 'T5: opslagfout zichtbaar voor de gebruiker');
  eq(R.t5retry, 1, 'T5: retry -> exact één row'); eq(R.t5inst, 'I-A', 'T5: ad-hoc protocol-instance gekoppeld');
  ok(R.t5unlocked, 'T6: na geslaagde finalize is het protocol vrijgegeven'); ok(R.t5rtGone, 'T6: runtime opgeruimd na finalize');
  ok(R.t5buttons, 'T6: protocolknoppen weer beschikbaar (geen disabled)');
  eq(R.l2, 1, 'L2: Losse PM5-only -> exact één row');
  ok(R.l2row && R.l2row.distance === 2000 && R.l2row.watt === 240, 'L2: Losse row draagt de PM5-waarden (zelfde canonieke conversie)');
  ok(R.l2row && /^Losse oefening/.test(R.l2row.note) && /drag 125/.test(R.l2row.note), 'L2: Losse note-compositie + converter-note');
  eq(R.l2row && R.l2row.training_instance_id, 'I-LOS', 'L2: Losse row gekoppeld aan de ad-hoc instance');
  eq(R.l2row && R.l2row.protocol_type, 'distance', 'L2: protocol_type uit de immutable projectie');
  eq(R.l2row && R.l2row.protocol_value, 500, 'L2: protocol_value uit de immutable projectie');
  eq(R.l2row && R.l2row.exercise_id, 'roeien', 'L2: exercise_id ongewijzigd');
  ok(R.l2unlocked && R.l2logGone, 'L2: na geslaagde losse opslag is los-state opgeruimd');
  eq(R.l5writes, 0, 'L5: Losse mislukte write -> niets'); ok(R.l5kept, 'L5: Losse retry-state behouden'); ok(R.l5toast, 'L5: fout zichtbaar');
  ok(R.l4 && R.l4.distance == null && R.l4.watt == null && !/drag|split:/.test(R.l4.note || ''), 'L4: ongeldige .c2 levert geen PM5-data in de losse row');
  eq(R.l3, 1, 'L3: Losse PM5 + handmatig -> één row'); eq(R.l3dist, 2000, 'L3: PM5 wint');
  eq(R.b8write, 'bikeerg', 'B8: BikeErg losse row opgeslagen'); eq(R.b8dist, 5000, 'B8: BikeErg-waarden');
  ok(R.b8disc.length === 1, 'B8: PM5 van de losse execution netjes ontkoppeld'); eq(R.b8unsub, 1, 'B8: metric-listener van BikeErg afgemeld (geen doorlek)');
  ok(!R.b8rt && !R.b8proto && !R.b8log && !R.b8pairConnected, 'B8: runtime/protocol/sessionLog/pairing van los opgeruimd');
  ok(R.b8buttons, 'B8: RowErg losse sessie start met vrije protocolknoppen'); eq(R.b8has, false, 'B8: geen BikeErg-data meer als niet-opgeslagen');
  ok(R.b8row2 && R.b8row2.exercise_id === 'roeien' && R.b8row2.distance === 2000 && R.b8row2.training_instance_id == null && R.b8row2.protocol_type == null, 'B8: RowErg-row zonder BikeErg-instance/protocol (geen leakage)');
  ok(R.lUnsaved === true, 'L: PM5-meting telt als niet-opgeslagen data (geen stil verlies bij Terug/wisselen)');
  ok(typeof R.t9newInst === 'string' && R.t9creates === 1, 'T9: na afgeronde execution start een nieuwe execution schoon');
  eq(R.t10creates, 0, 'T10: mislukte PM5-programmering -> GEEN instance aangemaakt'); eq(R.t10inst, null, 'T10: geen instanceId');
  eq(R.t10busy, false, 'T10: busy vrijgegeven'); eq(R.t10retryCreates, 0, 'T10: ook herpoging maakt geen orphan');
  eq(JSON.stringify(R.t11conf), JSON.stringify([1, 'inst-1']), 'T11: bevestigde programmering -> precies één instance');
  eq(JSON.stringify(R.t11nopm5), JSON.stringify([1, 'inst-1']), 'T11: zonder PM5 -> precies één instance (ongewijzigd)');
  eq(JSON.stringify(R.t11time), JSON.stringify([1, 'inst-1']), 'T11: Tijd zonder programmering -> instance zoals voorheen (H2 ongewijzigd)');
  eq(JSON.stringify(R.tdisc), JSON.stringify([0, false]), 'T-DISC: verwerpen schrijft niets en ontgrendelt het protocol');
  ok(R.tdiscLos, 'T-DISC: training verwerpen raakt de losse execution (los) niet');
  eq(R.r13, 1, 'R13: niet-Concept2 cardio (AssaultBike) blijft via het handmatige pad opslaan');
  ok(R.r13row && R.r13row.time_str != null, 'R13: handmatige waarden in de row');
  eq(R.r13b, 1, 'R13: handmatige roeiregistratie zonder PM5 ongewijzigd'); ok(R.r13brow && R.r13brow.distance === 2000, 'R13: handmatige afstand');
  eq(JSON.stringify(R.r13s), JSON.stringify([['squat', 2, 105, null], ['roeien', null, null, 2000]]), 'R13: krachttraining + PM5-cardio in één sessie -> exact twee correcte rows');
  eq(JSON.stringify(R.r13sInst), JSON.stringify(['I-S', 'I-S']), 'R13: beide rows aan de training-instance gekoppeld');
  eq(R.r13c, 0, 'R13: leeg formulier zonder PM5 schrijft niets (ongewijzigd)');

  // FASE 2A.1
  eq(JSON.stringify(R.c1.completes), JSON.stringify(['I-C1']), 'C1: Losse PM5 succesvol -> ad-hoc instance completed (exact één keer)');
  eq(R.c1.rows, 1, 'C1: exact één sessions-row'); eq(R.c1.rowInst, 'I-C1', 'C1: row gekoppeld aan dezelfde instance');
  ok(R.c1.events.indexOf('write:I-C1') > -1 && R.c1.events.indexOf('write:I-C1') < R.c1.events.indexOf('complete:I-C1'), 'C1: completion pas NA de geslaagde write');
  ok(!R.c1.proto, 'C1: lokale protocolidentiteit pas na completion opgeruimd');
  eq(R.c2a.completes.length, 0, 'C2: mislukte write -> instance NIET completed'); eq(R.c2a.rows, 0, 'C2: geen row'); ok(R.c2a.kept, 'C2: instance-identiteit behouden voor retry');
  eq(R.c2b.rows, 1, 'C2: retry -> exact één row'); eq(R.c2b.rowInst, 'I-C2', 'C2: retry gebruikt dezelfde instance');
  eq(JSON.stringify(R.c2b.completes), JSON.stringify(['I-C2']), 'C2: na geslaagde retry exact één completion van dezelfde instance');
  eq(R.c2b.creates, 0, 'C2: retry maakt geen nieuwe instance');
  ok(R.c3.rows === 1 && R.c3.toastOk && R.c3.cleaned, 'C3: mislukte completion maakt de opgeslagen oefening niet ongedaan');
  ok(R.c4.completes === 0 && R.c4.patches === 0 && R.c4.rows === 1, 'C4: losse opslag zonder instance roept geen completion aan (ongewijzigd)');
  eq(JSON.stringify(R.c5.completes), JSON.stringify(['I-TR']), 'C5: normale training completeert exact activeInstanceId (ongewijzigd)');
  ok(R.c5.events.indexOf('complete:I-TR') > R.c5.events.lastIndexOf('write:I-TR'), 'C5: training-completion na de writes (ongewijzigd)');
  eq(R.c5fail, 0, 'C5: mislukte training-write -> geen completion (ongewijzigd)');
  ok(!R.c6.events.some(e => /^(patch|DELETE|complete|write)/.test(e)), 'C6: verlaten zonder opslag schrijft niets naar de DB (open gap, geen improvisatie)');
  const allEvents = [].concat(R.c1.events, R.c2b.events, R.c5.events, R.c6.events);
  ok(!allEvents.some(e => /^DELETE/.test(e)), 'C7: nergens een DELETE');
  const losSrc = fnSrc(HTML, 'saveLosOefening');
  ok(!/sbDelete|DELETE|status:\s*'aborted'/.test(losSrc), 'C7: saveLosOefening verwijdert niets en verzint geen status');

  // 12. historische/bestaande instances: nergens delete/patch in de nieuwe code
  const cleanup = fnSrc(HTML, 'tkC2ExecutionCleanup'), start = fnSrc(HTML, 'tkErgStartProtocol');
  ok(!/sb[A-Z]\w*\(|fetch\(|training_instances|sessionLog/.test(cleanup), 'T12: cleanup raakt geen DB, instances of sessions');
  ok(!/sbDelete|sbPatch|completeTrainingInstance|DELETE/.test(start), 'T12: startflow verwijdert/wijzigt geen bestaande instances');
  ok((start.match(/createTrainingInstance\(/g) || []).length === 1, 'T12: exact één create-pad');
  // scope-gate: geen CSAFE/verificatie/timeout gewijzigd door deze sprint
  ok(!/buildFixedDistanceWorkout|parseResponseFrame|verifyFromTelemetry|DEFAULT_TIMEOUT/.test(cleanup + start + fnSrc(HTML, 'tkC2SessionRowFromLog')), 'SCOPE: geen CSAFE-/verificatiecode in FASE 2A-functies');

  // ── SABOTAGE / BUG-REVERSAL: elke reparatie terugdraaien moet een test laten falen ──
  const sab = [
    ['bare converter (oude H3-binding)', h => h.replace("var _c2conv=(typeof tkC2Converter==='function')?tkC2Converter():null;", "var _c2conv=(typeof liveWorkoutToActual==='function')?liveWorkoutToActual:null;"), R2 => R2.t1 !== 1],
    ['buitenste guard (oude H3-guard)', h => h.replace("if(_c2Loggable || (l.cardio &&", "if((l.cardio &&"), R2 => R2.t1 !== 1],
    ['losse c2-tak weg', h => h.replace("if(_losConv&&typeof tkC2IsLoggableSummary==='function'&&tkC2IsLoggableSummary(_losC2)){", "if(false){"), R2 => R2.l2row === null || R2.l2row.distance !== 2000],
    ['finalize-cleanup weg (H4)', h => h.replace("try{ if(typeof tkC2ExecutionCleanup==='function') tkC2ExecutionCleanup(list.map(", "try{ if(false) tkC2ExecutionCleanup(list.map("), R2 => !R2.t5unlocked],
    ['discard-cleanup weg (H4)', h => h.replace("tkC2ExecutionCleanup(tkC2TrainingExecIds(),'leave_execution')", "void 0"), R2 => R2.tdisc[1] === true],
    ['losse cleanup weg (H4)', h => h.replace("try{ if(typeof tkC2ExecutionCleanup==='function') tkC2ExecutionCleanup([LOS_DOMID],'leave_execution'); }catch(_cl){}", ""), R2 => R2.b8proto || R2.b8rt],
    ['instance vóór programmering (oude H5)', h => h.replace("instanceId=await createTrainingInstance({vasteTrainingId:null,customTrainingId:null,snapshot});\n  }", "}").replace("  let instanceId=null;\n  try{\n", "  let instanceId=await createTrainingInstance({vasteTrainingId:null,customTrainingId:null,snapshot});\n  try{\n"), R2 => R2.t10creates > 0],
    ['losse completion weg (H5 2A.1)', h => h.replace("    try{ await completeTrainingInstance(row.training_instance_id); }\r\n    catch(e){ try{ console.warn('completeTrainingInstance mislukt (losse oefening is wel opgeslagen)'", "    try{ void 0; }\r\n    catch(e){ try{ console.warn('completeTrainingInstance mislukt (losse oefening is wel opgeslagen)'"), R2 => R2.c1.completes.length === 0],
    ['losse completion vóór de write (H5 2A.1)', h => h.replace("  const ok=await sbPostQ('sessions',row); // == writeSessionRow(row)", "  if(row.training_instance_id){ try{ await completeTrainingInstance(row.training_instance_id); }catch(_s){} }\r\n  const ok=await sbPostQ('sessions',row); // == writeSessionRow(row)"), R2 => R2.c2a.completes.length > 0],
    ['eligibility te ruim (0 m / 0 s)', h => h.replace("return (isFinite(dn)&&dn>0)||(isFinite(en)&&en>0);", "return true;"), R2 => R2.t4zero > 0]
  ];
  for (const [name, mut, detects] of sab) {
    const h2 = mut(HTML);
    if (h2 === HTML) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
    let R2 = null; try { R2 = await suite(h2, 'SAB '); } catch (e) { R2 = null; }
    if (process.env.SAB_DEBUG) console.log('SAB', name, R2 === null ? 'EXCEPTION' : ('detect=' + detects(R2)));
    ok(R2 !== null && detects(R2), 'SABOTAGE gedetecteerd via assertie (geen exception): ' + name);
  }
  console.log('\n[Concept2 FASE 2A finalize-lifecycle] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('MISLUKT: exception ' + (e && e.stack)); process.exit(1); });
