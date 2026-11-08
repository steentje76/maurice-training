'use strict';
/* #614 fase 1 P1 storage (bron: #613 gebruikerstrial). Reproduceert het patroon
 * "programma met 2 vervangen catalogusoefeningen -> Opslaan & Afsluiten -> 2 mislukte writes"
 * en de losse catalogusregistratie die "wacht op bevestiging" blijft, met de ECHTE functies
 * uit index.html in een offline sandbox: execReplaceExercise -> finishSession ->
 * ensureSessionExerciseRows -> tk504VerifySessionBinding -> writeSessionRow -> sbPostQ, en
 * saveLosOefening -> tk603LosStorePending/ReplayPending.
 * Alleen synthetische accounts/IDs; geen netwerk, geen database, geen persoonsgegevens.
 *
 * RED tegen main (492bf3d):  TK614_HTML=<pad naar main-index.html> node core/tk614ProgramPartialSaveStorage.test.js
 * Gemarkeerde RED-asserties (prefix "[RED#614]") falen op main en slagen na de fix.
 * Alle overige asserties zijn contract/diagnostiek en horen op main en na de fix te slagen. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const HTML = fs.readFileSync(process.env.TK614_HTML || path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0; const failures = [];
function ok(cond, label) { if (cond) pass++; else failures.push(label); }
function eq(a, b, label) { ok(a === b, label + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

function fnSrc(html, name) {
  let start = html.indexOf('async function ' + name + '(');
  if (start === -1) start = html.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('originele functie ontbreekt: ' + name);
  for (let end = html.indexOf('}', start); end >= 0; end = html.indexOf('}', end + 1)) {
    const candidate = html.slice(start, end + 1);
    try { new vm.Script(candidate); return candidate; } catch (_) { /* nog niet compleet */ }
  }
  throw new Error('onvolledig: ' + name);
}

// --- Releasestand en echte embedded catalogus -------------------------------------------
const flag = /const TK504_TYPED_FK_SESSION_RELEASE = (true|false);/.exec(HTML);
assert(flag, 'releaseflag-declaratie ontbreekt');
const RELEASE = flag[1] === 'true';
const catMatch = HTML.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(catMatch, 'embedded EX_CATALOG ontbreekt');
const CATALOG = JSON.parse(catMatch[1]).catalog;
const byId = id => CATALOG.find(c => c.catalog_id === id) || null;
const PEC = byId('TK-000188'), PUSH = byId('TK-000063');
assert(PEC && PEC.identity.name === 'Machine Pec Fly' && PEC.source.provider_id === 'machine-pec-fly');
assert(PUSH && PUSH.identity.name === 'Cable Bar Pushdown' && PUSH.source.provider_id === 'cable-bar-pushdown');
ok(RELEASE === true, 'diagnose: main heeft TK504_TYPED_FK_SESSION_RELEASE=true (client vereist serverbinding voor cataloguskeuzes)');

const FNS = ['catalogToPickerEx', 'tk504CatalogSourceRefFromCatalog', 'tk504CatalogSourceRefFromSelection',
  'tk603CatalogRefFromPickerSelection', 'tk504ValidateCatalogSourceRef', 'tk504VerifySessionBinding',
  'tk504RewriteVerifiedSessionRow', 'tk504StableSessionId', 'writeSessionRow', 'sbPostQ', 'tkNormalizeSessionsRow',
  'ensureExerciseRowStatus', 'ensureExerciseRow', 'ensureSessionExerciseRows', 'tkSessieSchrijfOpts',
  'tkSessieOptsVoor', 'tkSessieUitkomst', 'tk603CanUpdatePersonalRecord', 'buildStrengthSessionRow',
  'persistTrainingDraft', 'clearTrainingDraft', 'finishSession', 'execExerciseHasData', 'execReplaceExercise',
  'tk603LosOwner', 'tk603LosContext', 'tk603LosCurrent', 'tk603LosReset', 'tk603LosReadPending',
  'tk603LosStorePending', 'tk603LosFreezePending', 'tk603LosWritePending', 'tk603LosRemoveConfirmed',
  'tk603LosReplayPending', 'saveLosOefening'];
const SRC = FNS.map(n => fnSrc(HTML, n)).join('\n') + '\nreturn {' + FNS.join(',') + '};';

const UNDEF = Symbol('undef');
const A = 'synthetic-athlete-A', B = 'synthetic-athlete-B';
const T = 'prog_synthetic_week1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY = ['bench_press', 'squat', 'shoulder_press', 'seated_cable_row', 'romanian_deadlift',
  'synthetic_fly_original', 'synthetic_triceps_original'].map(id => ({ id, name: id, type: 'strength', scope: 'personal' }))
  .concat([{ id: 'skierg', name: 'SkiErg', type: 'cardio', scope: 'personal' }]);
const SETS = () => [{ kg: 60, reps: 10, rpe: 7 }, { kg: 60, reps: 10, rpe: 7 }, { kg: 60, reps: 10, rpe: 8 }];

function makeWorld() {
  const st = { owner: A, online: true, binding: 'missing', rpcs: [], posts: [], rows: new Map(), queue: [],
    toasts: [], uuid: 0, fetchRule: null, els: Object.create(null), store: new Map(), patches: [], losResets: 0, picker: null };
  const element = id => st.els[id] || (st.els[id] = { id, value: '', style: {}, textContent: '', innerHTML: '', className: '',
    disabled: false, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    querySelectorAll: () => [], querySelector: () => null, setAttribute() {} });
  const env = {
    TK504_TYPED_FK_SESSION_RELEASE: RELEASE,
    TK603_LOS_PENDING_KEY: 'tk603_los_pending_v1', tk603LosEpoch: 0, tk603LosPending: null, tk603LosBusy: null,
    ExerciseCatalogService: { byId },
    exercises: LEGACY.map(x => Object.assign({}, x)),
    _ensureRowInflight: {},
    localStorage: { getItem: k => (st.store.has(k) ? st.store.get(k) : null), setItem: (k, v) => { st.store.set(k, String(v)); },
      removeItem: k => { st.store.delete(k); } },
    navigator: { get onLine() { return st.online; } },
    tkEigenaarUid: () => st.owner,
    // Server-RPC zoals gestaged in supabase/migrations/20261106110000_tk504_typed_catalog_fk_stage.sql.
    // 'missing' = functie niet uitgerold of binding niet actief/gereviewd: sbRpc levert dan null.
    sbRpc: async (fn, args) => {
      st.rpcs.push({ fn, args: Object.assign({}, args), owner: st.owner });
      if (fn !== 'tk504_resolve_catalog_fk') return null;
      if (st.binding === 'owner-change') { st.owner = B; return 'TKC-' + args.p_catalog_id.slice(3); }
      if (st.binding === 'wrong') return 'TKC-000019';
      if (st.binding !== 'ok') return null;
      const c = byId(args.p_catalog_id);
      return c && c.source.provider_id === args.p_provider_id ? 'TKC-' + args.p_catalog_id.slice(3) : null;
    },
    sbFetch: async (url, init) => {
      const table = String(url).split('/rest/v1/')[1].split('?')[0];
      const body = JSON.parse(JSON.stringify(init.body));
      const rule = st.fetchRule ? st.fetchRule(table, body) : 'ok';
      st.posts.push({ table, body, prefer: init.prefer, owner: st.owner });
      if (rule === 'throw') throw new Error('synthetic network loss');
      if (typeof rule === 'number') return { ok: false, status: rule, text: async () => 'synthetic' };
      // Server-trigger tk504_validate_typed_session_fk: TKC-FK alleen bij actieve gereviewde binding.
      if (table === 'sessions' && /^TKC-/.test(String(body.exercise_id || '')) && st.binding !== 'ok')
        return { ok: false, status: 400, text: async () => '23514' };
      if (table === 'sessions') {
        if (!body.id) return { ok: false, status: 400, text: async () => 'missing id' };
        st.rows.set(body.id, body); // merge-duplicates op PK: dezelfde UUID = dezelfde rij
      }
      return { ok: true, status: 201, text: async () => '[]', json: async () => [] };
    },
    SB_URL: 'https://synthetic.invalid',
    IDEMPOTENT_TABELLEN_MET_CLIENT_ID: { sessions: true }, TK_IDEMPOTENT_ZONDER_UPDATE: {}, TK_WACHTRIJ_OUDERS: {},
    TK_SCHRIJF_TIMEOUT_MS: 20000,
    tkMetTimeout: p => p, sbRetryable: s => s === 401 || s === 429 || s >= 500, tkFoutcode: x => String(x).slice(0, 16),
    tkLogSchrijf: () => {}, tkSchrijfUitkomst: status => ({ status }), tkWachtrijHeeftOuder: async () => false,
    offlineQueueAdd: async item => { st.queue.push(JSON.parse(JSON.stringify(item))); return true; },
    updateOfflineBadge: () => {},
    newClientRowId: () => '00000000-0000-4000-8000-' + String(++st.uuid).padStart(12, '0'),
    curT: null, sessionLog: {}, sessionExtra: [], resolvedWorkout: null, activeInstanceId: null,
    activePlannedAssignmentId: null, finishSessionBezig: false, _finishSessionContext: null,
    trainStart: null, pausedAccumMs: 0, sessionPrBase: {}, prFor: () => null, upsertExerciseGoalField: async () => {},
    DecisionCore: { releaseRecord: () => ({ isRecord: false }) },
    CARDIO_TYPES: { skierg: { fields: ['time', 'dist'] } },
    cardioDataToRow: (type, d) => ({ time_str: d.time || null, distance: d.dist ? Number(d.dist) : null, extraNote: '' }),
    resolveCardioType: ex => (ex && ex.id === 'skierg' ? 'skierg' : null),
    getExerciseMuscles: () => [],
    getSessionExs: t => ((env.resolvedWorkout && env.resolvedWorkout.t === t) ? env.resolvedWorkout.items : [])
      .concat((env.sessionExtra || []).filter(e => e._t === t)),
    td: () => '2026-11-08',
    execFocus: {}, saveState: 'saved', lastSaveTs: null, updateSaveIndicator: () => {}, currentWorkoutElapsedMs: () => 0,
    window: { toast: m => st.toasts.push(m) }, toast: m => st.toasts.push(m),
    closeModal: () => {}, openModal: () => {}, stopTrainTimer: () => {}, tkErgDisconnectAll: () => {},
    completeTrainingInstance: async () => {}, sbPatchQ: async t => { st.patches.push(t); return true; },
    generateSessionSummaryAI: async () => 'synthetic', refreshStats: () => {}, go: () => {}, escHtml: s => String(s),
    renderTrainScreen: () => {}, scheduleAutosave: () => {}, canonicalNewExerciseItem: async () => ({}),
    openExPicker: cb => { st.picker = cb; }, confirmModal: async () => true,
    LOS_DOMID: 'los', losSelectedExId: null, losCurEx: null,
    collectWorkSets: () => [1, 2, 3].map(() => ({ kg: '40', effKg: 40, reps: '15', rpe: '5' })),
    collectWuSets: () => [],
    resetLosAllState: () => { st.losResets++; },
    resolvePickerEx: () => null,
    document: { getElementById: element, querySelectorAll: () => [], querySelector: () => null },
    console: { log() {}, warn() {}, error() {}, info() {} },
    // Optionele hooks die in de echte app typeof-gegate zijn: hier expliciet afwezig.
    TKWeather: UNDEF, tkC2DiagFinishCalled: UNDEF, tkC2DiagFinishEx: UNDEF, tkC2DiagFinishPath: UNDEF,
    tkC2IsLoggableSummary: UNDEF, tkC2Converter: UNDEF, tkC2SessionRowFromLog: UNDEF,
    tkErgProtocolProjectionFor: UNDEF, tkErgProtocolInstanceId: UNDEF, tkC2ExecutionCleanup: UNDEF,
    tkSetEvidence: UNDEF, CalcCore: UNDEF, tkProductTelemetry: UNDEF, invalidateExPickerPool: UNDEF
  };
  const proxy = new Proxy(env, {
    has: () => true,
    get: (t, k) => {
      if (k === Symbol.unscopables) return undefined;
      if (k in t) return t[k] === UNDEF ? undefined : t[k];
      if (k in globalThis) return globalThis[k];
      throw new ReferenceError('sandbox: onverwachte afhankelijkheid ' + String(k));
    },
    set: (t, k, v) => { t[k] = v; return true; }
  });
  const api = new Function('__env', 'with(__env){\n' + SRC + '\n}')(proxy);
  return { st, env, api };
}

const sessionPosts = w => w.st.posts.filter(p => p.table === 'sessions');
const exercisePosts = w => w.st.posts.filter(p => p.table === 'exercises');
const draftOf = w => { const raw = w.st.store.get('tk_draft_training'); return raw ? JSON.parse(raw) : null; };

// Programma "week 1": 6 kracht + SkiErg + RDL (overgeslagen). Twee items worden tijdens de
// training via de ECHTE execReplaceExercise vervangen door catalogus Machine Pec Fly / Cable Bar Pushdown.
async function startProgram(w) {
  const items = ['bench_press', 'squat', 'shoulder_press', 'seated_cable_row', 'synthetic_fly_original',
    'synthetic_triceps_original', 'romanian_deadlift'].map((id, i) => ({ id, naam: id, type: 'strength', sets: 3, reps: '10', rpe: '7', sort_order: i }))
    .concat([{ id: 'skierg', naam: 'SkiErg', type: 'cardio', sort_order: 7 }]);
  w.env.curT = T; w.env.resolvedWorkout = { t: T, items };
  w.api.execReplaceExercise(T, 'synthetic_fly_original');
  await w.st.picker(w.api.catalogToPickerEx(PEC));
  w.api.execReplaceExercise(T, 'synthetic_triceps_original');
  await w.st.picker(w.api.catalogToPickerEx(PUSH));
  const log = {};
  ['bench_press', 'squat', 'shoulder_press', 'seated_cable_row', 'TK-000188', 'TK-000063'].forEach(id => { log[id] = { sets: SETS() }; });
  log.skierg = { cardio: { type: 'skierg', time: '10:00', dist: '2000' } };
  w.env.sessionLog = log;
  w.api.persistTrainingDraft(true); // de normale autosave vóór "Opslaan & Afsluiten"
  w.st.toasts.length = 0; // "Vervangen door ..."-meldingen horen niet bij de save-telling
}
const LEGACY_LOGGED = ['bench_press', 'squat', 'shoulder_press', 'seated_cable_row', 'skierg'];

(async () => {
  // ===== 1. Vervanging bewaart canonieke bron; geen persoonlijke shadow ======================
  const w1 = makeWorld();
  await startProgram(w1);
  const items = w1.env.resolvedWorkout.items;
  const pec = items.find(e => e.id === 'TK-000188'), push = items.find(e => e.id === 'TK-000063');
  ok(!!pec && !!push && !items.some(e => /_original$/.test(e.id)), 'vervanging: beide originele items vervangen door canonieke catalogus-ID');
  ok(pec && pec.tk504_catalog_ref && pec.tk504_catalog_ref.kind === 'movekit-catalog-v1' &&
     pec.tk504_catalog_ref.catalog_id === 'TK-000188' && pec.tk504_catalog_ref.provider_id === 'machine-pec-fly',
     'vervanging: Machine Pec Fly draagt exacte catalogusprovenance (catalog_id + provider_id)');
  ok(push && push.tk504_catalog_ref && push.tk504_catalog_ref.provider_id === 'cable-bar-pushdown',
     'vervanging: Cable Bar Pushdown draagt exacte catalogusprovenance');
  eq(exercisePosts(w1).length, 0, 'vervanging: geen exercises-write / persoonlijke FK-shadow');
  const pre = draftOf(w1);
  ok(pre && pre.owner_uid === A && pre.resolvedWorkout && pre.resolvedWorkout.items.some(e => e.tk504_catalog_ref && e.id === 'TK-000188'),
     'draft: vervangen bron overleeft een herstart (eigenaar A, provenance in resolvedWorkout)');

  // ===== 2. Opslaan & Afsluiten zonder uitgerolde serverbinding (#603) =======================
  w1.st.binding = 'missing';
  await w1.api.finishSession();
  eq(w1.st.rpcs.length, 2, 'save: precies één binding-RPC per catalogusoefening');
  ok(w1.st.rpcs.every(r => r.fn === 'tk504_resolve_catalog_fk'), 'save: alleen tk504_resolve_catalog_fk');
  ok(w1.st.rpcs.some(r => r.args.p_catalog_id === 'TK-000188' && r.args.p_provider_id === 'machine-pec-fly') &&
     w1.st.rpcs.some(r => r.args.p_catalog_id === 'TK-000063' && r.args.p_provider_id === 'cable-bar-pushdown'),
     'save: RPC gebruikt ECS catalog_id + provider_id, geen naam/alias-gok');
  eq(exercisePosts(w1).length, 0, 'save: geen automatische fallback naar persoonlijke FK-shadow');
  eq(sessionPosts(w1).length, 5, 'save: alleen de 5 legacy-oefeningen worden verstuurd');
  ok(!sessionPosts(w1).some(p => /^TK(C)?-/.test(p.body.exercise_id)), 'save: geen TK-/TKC-sessie zonder serverbinding');
  ok(LEGACY_LOGGED.every(id => sessionPosts(w1).some(p => p.body.exercise_id === id)), 'save: SkiErg/bench/squat/shoulder/row verstuurd; RDL zonder log overgeslagen');
  ok(sessionPosts(w1).every(p => UUID.test(p.body.id)), 'save: elke sessie-write heeft een client-UUID');
  eq(w1.st.queue.length, 0, 'save: niets in offline-wachtrij');
  eq(w1.st.toasts.length, 1, 'save: precies één melding');
  ok(/^5 opgeslagen, 2 mislukt/.test(w1.st.toasts[0] || ''), 'save: eerlijke gedeeltelijke melding (5 bevestigd, 2 mislukt)');
  ok(!w1.st.toasts.some(t => /oefeningen opgeslagen/.test(t)), 'save: geen volledige succesclaim');
  ok(w1.env.curT === T && !!w1.env.sessionLog['TK-000188'] && !!w1.env.sessionLog['TK-000063'],
     'save: mislukte invoer blijft lokaal behouden (geen dataverlies)');
  ok(w1.st.store.has('tk_draft_training'), 'save: draft niet gewist');
  eq(w1.st.patches.length, 0, 'save: programmablok niet als voltooid gemarkeerd');
  const post = draftOf(w1);
  ok(post && LEGACY_LOGGED.every(id => post.sessionLog[id] && typeof post.sessionLog[id]._sessionRowPersistedAt === 'number'),
     '[RED#614] duurzaamheid: bevestigde rijen zijn na gedeeltelijke fout duurzaam als bevestigd gemarkeerd');
  ok(post && post.owner_uid === A, 'duurzaamheid: draft blijft van dezelfde eigenaar');
  ok(post && !post.sessionLog['TK-000188']._sessionRowPersistedAt && !post.sessionLog['TK-000063']._sessionRowPersistedAt,
     'duurzaamheid: mislukte catalogusrijen staan NIET als bevestigd');

  // ===== 3. Procesherstart (geen flush) + binding later wel uitgerold =========================
  const d = draftOf(w1);
  w1.env.sessionLog = d.sessionLog; w1.env.resolvedWorkout = d.resolvedWorkout; w1.env.curT = d.t;
  w1.env.finishSessionBezig = false; w1.env._finishSessionContext = null; w1.st.toasts.length = 0;
  w1.st.binding = 'ok';
  const before = sessionPosts(w1).length;
  await w1.api.finishSession();
  const retryPosts = sessionPosts(w1).slice(before);
  eq(retryPosts.length, 2, '[RED#614] retry na herstart: alleen de 2 nog niet bevestigde rijen worden verstuurd');
  ok(retryPosts.some(p => p.body.exercise_id === 'TKC-000188') && retryPosts.some(p => p.body.exercise_id === 'TKC-000063'),
     'retry: canonieke getypeerde FK (TKC) na serverbevestiging');
  ok(retryPosts.filter(p => /^TKC-/.test(p.body.exercise_id)).every(p => UUID.test(p.body.id)), 'retry: getypeerde rijen met stabiele UUID');
  const keys = [...w1.st.rows.values()].map(r => r.exercise_id + '|' + r.date);
  eq(new Set(keys).size, keys.length, '[RED#614] geen dubbele sessierijen in de historie');
  eq(w1.st.rows.size, 7, '[RED#614] historie bevat exact 7 rijen (5 legacy + 2 catalogus)');
  ok(w1.st.toasts.some(t => /^7 oefeningen opgeslagen/.test(t)), 'retry: succes pas na volledige bevestiging');
  ok(!w1.st.store.has('tk_draft_training'), 'retry: draft pas na volledige bevestiging gewist');
  eq(exercisePosts(w1).length, 0, 'retry: nog steeds geen persoonlijke shadow');

  // ===== 4. Ongeldige serverbinding (verkeerde FK) faalt gesloten =============================
  const w2 = makeWorld(); await startProgram(w2); w2.st.binding = 'wrong';
  await w2.api.finishSession();
  ok(!sessionPosts(w2).some(p => /^TK(C)?-/.test(p.body.exercise_id)), 'wrong binding: geen write met andere FK');
  eq(exercisePosts(w2).length, 0, 'wrong binding: geen shadow');
  ok(/^5 opgeslagen, 2 mislukt/.test(w2.st.toasts[0] || ''), 'wrong binding: gedeeltelijk mislukt gemeld');

  // ===== 5. Accountwissel tijdens binding-RPC: geen cross-owner write ========================
  const w3 = makeWorld(); await startProgram(w3); w3.st.binding = 'owner-change';
  await w3.api.finishSession();
  eq(sessionPosts(w3).length, 0, 'owner: accountwissel tijdens verificatie -> geen enkele sessie-write');
  ok(!w3.st.posts.some(p => p.owner === B), 'owner: niets verstuurd onder account B');
  ok(draftOf(w3) && draftOf(w3).owner_uid === A, 'owner: draft van A niet overschreven door/naar B');

  // ===== 6. Gequeued (netwerkverlies) telt niet als 'opgeslagen' =============================
  const w4 = makeWorld(); await startProgram(w4); w4.st.binding = 'missing';
  w4.st.fetchRule = (table, body) => (table === 'sessions' && body.exercise_id === 'bench_press' ? 'throw' : 'ok');
  await w4.api.finishSession();
  eq(w4.st.queue.length, 1, 'queued: legacy-rij bij netwerkverlies veilig in wachtrij');
  ok(w4.st.queue[0] && w4.st.queue[0].body.exercise_id === 'bench_press' && UUID.test(w4.st.queue[0].body.id),
     'queued: wachtrij-item met client-UUID (idempotente replay)');
  ok(!w4.st.queue.some(q => /^TK(C)?-/.test(String(q.body && q.body.exercise_id))), 'queued: getypeerde catalogusrij wordt nooit gequeued');
  eq(w4.st.rows.size, 4, 'queued: 4 rijen serverbevestigd');
  const qt = w4.st.toasts[0] || '';
  ok(/^4 opgeslagen, 1 in wachtrij/.test(qt) && /2 mislukt/.test(qt),
     '[RED#614] status: melding onderscheidt bevestigd (4), wachtrij (1) en mislukt (2); kreeg: ' + qt);
  // retry in hetzelfde proces met uitgerolde binding: de gequeuede rij is nog steeds niet bevestigd
  w4.st.toasts.length = 0; w4.st.fetchRule = null; w4.st.binding = 'ok';
  w4.env.finishSessionBezig = false; w4.env._finishSessionContext = null;
  const b4 = sessionPosts(w4).length;
  await w4.api.finishSession();
  eq(sessionPosts(w4).length - b4, 2, 'queued retry: alleen de 2 catalogusrijen verstuurd, gequeuede rij niet opnieuw');
  eq(w4.st.queue.length, 1, 'queued retry: geen tweede wachtrij-item');
  ok(w4.st.toasts.some(t => /offline opgeslagen/.test(t)) && !w4.st.toasts.some(t => /^7 oefeningen opgeslagen/.test(t)),
     '[RED#614] status: retry claimt geen serverbevestiging voor de nog gequeuede rij');

  // ===== 7. Getypeerde write faalt na geldige binding: niet gequeued, zelfde UUID bij retry ===
  const w5 = makeWorld(); await startProgram(w5); w5.st.binding = 'ok';
  w5.st.fetchRule = (table, body) => (table === 'sessions' && /^TKC-/.test(body.exercise_id) ? 'throw' : 'ok');
  await w5.api.finishSession();
  const firstTyped = sessionPosts(w5).filter(p => /^TKC-/.test(p.body.exercise_id)).map(p => p.body.exercise_id + '|' + p.body.id);
  eq(firstTyped.length, 2, 'typed fail: beide getypeerde writes geprobeerd');
  eq(w5.st.queue.length, 0, 'typed fail: verlopen serverautoriteit nooit in offline-wachtrij');
  ok(/^5 opgeslagen, 2 mislukt/.test(w5.st.toasts[0] || ''), 'typed fail: eerlijk gedeeltelijk');
  w5.st.fetchRule = null; w5.env.finishSessionBezig = false; w5.env._finishSessionContext = null;
  const b5 = sessionPosts(w5).length;
  await w5.api.finishSession();
  const secondTyped = sessionPosts(w5).slice(b5).map(p => p.body.exercise_id + '|' + p.body.id);
  ok(secondTyped.length === 2 && secondTyped.every(k => firstTyped.includes(k)), 'typed retry: exact dezelfde UUID per rij (geen tweede workout)');
  eq(w5.st.rows.size, 7, 'typed retry: 7 unieke rijen');

  // ===== 8. Losse catalogusregistratie Machine Pec Fly 3x15x40 RPE5 ============================
  const w6 = makeWorld(); w6.st.binding = 'missing';
  w6.env.losSelectedExId = 'TK-000188'; w6.env.losCurEx = w6.api.catalogToPickerEx(PEC);
  const btn = { disabled: false };
  await w6.api.saveLosOefening(btn);
  eq(sessionPosts(w6).length, 0, 'los: geen sessie-write zonder serverbinding');
  eq(exercisePosts(w6).length, 0, 'los: geen persoonlijke FK-shadow');
  eq(w6.st.rpcs.length, 1, 'los: één binding-RPC');
  const pend = w6.st.store.get('tk603_los_pending_v1');
  const pd = pend ? JSON.parse(pend) : null;
  ok(pd && pd.owner_uid === A && pd.selected_id === 'TK-000188' && pd.row.exercise_id === 'TK-000188' && UUID.test(pd.row.id),
     'los: registratie duurzaam pending met canonieke ID, eigenaar en stabiele UUID');
  ok(pd && pd.row.sets === 3 && pd.row.weight === 40 && pd.row.reps === 15 && pd.row.rpe === 5,
     'los: ruwe invoer 3x15x40 RPE5 ongewijzigd (UI rekent niets nieuw)');
  ok(/wacht op bevestiging/.test(w6.st.els['los-body'] ? w6.st.els['los-body'].textContent : ''), 'los: UI toont pending, niet opgeslagen');
  ok(!w6.st.toasts.includes('Opgeslagen'), 'los: nooit "Opgeslagen" zonder serverbevestiging');
  ok(btn.disabled === false, 'los: knop vrij voor retry');
  await w6.api.saveLosOefening(btn);
  ok(w6.st.toasts[w6.st.toasts.length - 1] === 'Nog niet opgeslagen. Je registratie blijft bewaard.', 'los retry: melding uit trial gereproduceerd (binding ontbreekt)');
  eq(w6.st.store.get('tk603_los_pending_v1'), pend, 'los retry: pending byte-identiek behouden');
  eq(sessionPosts(w6).length, 0, 'los retry: nog steeds geen write');
  w6.st.binding = 'wrong';
  await w6.api.saveLosOefening(btn);
  eq(sessionPosts(w6).length, 0, 'los: ongeldige binding -> geen write');
  w6.st.binding = 'ok';
  await w6.api.saveLosOefening(btn);
  eq(sessionPosts(w6).length, 1, 'los: na uitrol precies één write');
  const lp = sessionPosts(w6)[0];
  ok(lp && lp.body.exercise_id === 'TKC-000188' && lp.body.id === pd.row.id, 'los: TKC-FK met dezelfde UUID als pending');
  eq(w6.st.toasts[w6.st.toasts.length - 1], 'Opgeslagen', 'los: "Opgeslagen" pas na serverbevestiging');
  ok(!w6.st.store.has('tk603_los_pending_v1'), 'los: pending pas na bevestiging verwijderd');
  ok(!w6.st.toasts.slice(0, -1).includes('Opgeslagen'), 'los: eerdere pogingen claimden niets');

  // ===== resultaat ==========================================================================
  const red = failures.filter(f => f.indexOf('[RED#614]') === 0);
  if (failures.length) {
    console.log('TK614 storage: ' + pass + ' PASS, ' + failures.length + ' FAIL (' + red.length + ' gemarkeerd RED#614)');
    failures.forEach(f => console.log('  FAIL: ' + f));
    process.exit(1);
  }
  console.log('TK614 storage: ' + pass + ' asserties PASS op echte index.html-functies (offline, synthetisch)');
})().catch(e => { console.error('TK614 storage: harnasfout', e); process.exit(1); });
