/* MS-TELEMETRY-01 Slice C — lifecycle wiring gate (vervangt de eerdere string-aanwezigheidscheck).
 * Bewijst GEDRAG en POSITIE, niet alleen aanwezigheid:
 *  E  emitter: consent-gated (privacy-by-default uit), fail-closed op inhoud (registry), fail-open
 *     (nooit throw), authenticated-only, exacte payloadvorm zonder athlete/training-data;
 *  S  call-sites: alleen geregistreerde events, alleen geregistreerde properties met literal/enum-waarden,
 *     elke aanroep in try/catch, op de canonieke boundaries (go, Preview, 4 verse-startpaden, finishSession);
 *  F  finishSession (echte functie uit index.html): training.workout.completed exact 1x na volledig geslaagde
 *     opslag; 0x bij mislukte write, saved===0, exception; een crashende emitter blokkeert completion niet;
 *  X  sabotage: elke guard terugdraaien laat een assertie falen. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PTC = require(path.join(ROOT, 'core/productTelemetry.js'));
const C2L = require(path.join(ROOT, 'core/concept2Live.js'));
const DC = require(path.join(ROOT, 'core/deviceIntegration.js'));
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));
const EPI = require(path.join(ROOT, 'core/ergProtocolIdentity.js'));
const IEC = require(path.join(ROOT, 'core/intervalEngine.js'));
const DecisionCore = require(path.join(ROOT, 'core/decision.js'));
let pass = 0, fail = 0, finished = false, mute = false;
process.on('exit', c => { if (!finished && c === 0) { console.log('MISLUKT: test eindigde zonder samenvatting'); process.exitCode = 1; } });
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');

function fnSrc(html, name) {
  let s = html.indexOf('async function ' + name + '('); if (s < 0) s = html.indexOf('function ' + name + '(');
  if (s < 0) return null;
  let d = 0; const b = html.indexOf('{', html.indexOf(')', s));
  for (let k = b; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (d === 0) return html.slice(s, k + 1); } }
  return null;
}
function constSrc(html, decl) { const s = html.indexOf(decl); let d = 0; const b = html.indexOf('{', s);
  for (let k = b; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (d === 0) return html.slice(s, k + 1) + ';'; } } }
function emitterSrc(html) {
  const a = html.indexOf("var TK_PRODUCT_TELEMETRY_CONSENT_KEY="); const e = html.indexOf('</script>', a);
  return a > 0 && e > a ? html.slice(a, e) : null;
}

// ── E. emitter in sandbox met echte ProductTelemetryCore ──
function emitter(html, o) {
  o = o || {};
  const calls = [];
  const store = { tk_product_telemetry_consent: o.consent };
  const env = {
    window: { ProductTelemetryCore: PTC, Capacitor: o.capacitor || undefined },
    localStorage: { getItem: k => (k in store ? store[k] : null) },
    location: { hostname: o.host || 'maurice-art.netlify.app' },
    APP_VER: 'v4.70.5',
    SB_H: o.noAuth ? undefined : { Authorization: 'Bearer user-jwt' },
    fetch: o.fetchThrows ? () => { throw new Error('boom'); } : (u, init) => { calls.push({ u, init }); return o.reject ? Promise.reject(new Error('net')) : Promise.resolve({ ok: true }); }
  };
  const src = emitterSrc(html);
  const f = new Function(...Object.keys(env), src + '\nreturn {tkProductTelemetry, tkProductTelemetryEnvironment, tkProductTelemetryPlatform};');
  const api = f(...Object.values(env));
  return { api, calls };
}
function sendOk(o, ev, props) { const w = emitter(HTML, o); let threw = false, r; try { r = w.api.tkProductTelemetry(ev, props); } catch (_) { threw = true; } return { r, threw, calls: w.calls }; }

async function suiteEmitter(html) {
  const R = {};
  const E = (o, ev, props) => { const w = emitter(html, o); let threw = false, r; try { r = w.api.tkProductTelemetry(ev, props); } catch (_) { threw = true; } return { r, threw, calls: w.calls }; };
  R.noConsent = E({}, 'training.opened', { route_id: 's-train-mgr' });
  R.consent0 = E({ consent: '0' }, 'training.opened', {});
  R.ok = E({ consent: '1' }, 'training.workout.completed', { source_type: 'program' });
  R.unreg = E({ consent: '1' }, 'training.set.logged', {});
  R.hrv = E({ consent: '1' }, 'training.opened', { hrv: 55 });
  R.weight = E({ consent: '1' }, 'training.workout.completed', { source_type: 'program', weight: 100 });
  R.unknown = E({ consent: '1' }, 'training.opened', { foo: 'x' });
  R.badEnum = E({ consent: '1' }, 'training.previewed', { source_type: 'hack' });
  R.noAuth = E({ consent: '1', noAuth: true }, 'training.opened', {});
  R.fetchThrows = E({ consent: '1', fetchThrows: true }, 'training.opened', {});
  R.reject = E({ consent: '1', reject: true }, 'training.opened', {});
  R.env = ['maurice-art.netlify.app', 'deploy-preview-12--maurice-art.netlify.app', 'feat--maurice-art.netlify.app', 'localhost', 'evil.example.com']
    .map(h => emitter(html, { host: h }).api.tkProductTelemetryEnvironment());
  const nat = emitter(html, { capacitor: { getPlatform: () => 'android' }, host: 'localhost' });
  R.native = [nat.api.tkProductTelemetryPlatform(), nat.api.tkProductTelemetryEnvironment()];
  await Promise.resolve();
  return R;
}

// ── S. call-site-analyse ──
function callSites(html) {
  const def = html.indexOf('function tkProductTelemetry(eventId, properties)');
  const out = []; const re = /tkProductTelemetry\('([^']+)'\s*,\s*(\{[^}]*\})\s*\)/g; let m;
  while ((m = re.exec(html))) {
    if (m.index > def && m.index < def + 200) continue;
    const before = html.slice(Math.max(0, m.index - 4), m.index);
    const after = html.slice(m.index + m[0].length, m.index + m[0].length + 20);
    out.push({ idx: m.index, event: m[1], obj: m[2], tryWrapped: before === 'try{' && /^;\}catch\(/.test(after) });
  }
  return out;
}
function propsOf(obj) {
  const res = {}; const inner = obj.slice(1, -1).trim(); if (!inner) return res;
  // key:value; waarden zijn string-literals of één toegestane ternary met twee literals
  inner.split(/,(?=\s*[a-z_]+\s*:)/).forEach(part => {
    const i = part.indexOf(':'); const k = part.slice(0, i).trim(); const v = part.slice(i + 1).trim();
    const tern = v.match(/^\(String\(t\|\|''\)\.indexOf\('prog_'\)===0\)\?'([^']*)':'([^']*)'$/);
    const single = v.match(/^'([^']*)'$/);
    res[k] = { values: tern ? [tern[1], tern[2]] : (single ? [single[1]] : []), literal: !!(tern || single) };
  });
  return res;
}
function fnOf(html, idx) {
  const re = /(?:async )?function ([A-Za-z0-9_$]+)\(/g; let m, last = null;
  while ((m = re.exec(html)) && m.index < idx) last = m[1];
  return last;
}

// ── F. finishSession in sandbox (echte functie) ──
const UNDEF = Symbol('undef');
function deepNoop() { const f = function () { return deepNoop(); }; return new Proxy(f, { get: (t, k) => (k === 'then' || k === Symbol.toPrimitive) ? undefined : deepNoop(), apply: () => deepNoop() }); }
function element() { return { value: '', style: {}, textContent: '', className: '', innerHTML: '', disabled: false, classList: { toggle() {}, add() {}, remove() {}, contains: () => false }, querySelectorAll: () => [], querySelector: () => null, setAttribute() {} }; }
const FNS = ['finishSession', 'cardioDataToRow', 'resolveCardioType', 'tkC2IsLoggableSummary', 'tkC2Converter', 'tkC2SessionRowFromLog', 'tkC2ExecutionCleanup',
  'tkErgProtocolProjectionFor', 'tkErgProtocolInstanceId', 'tkIsErgCardioType', '_c2rtTeardown', 'tkErgDisconnect', 'tkErgDisconnectAll', 'buildStrengthSessionRow', 'tkC2TrainingExecIds'];
function world(html, o) {
  o = o || {};
  const tele = [], writes = [], toasts = [];
  const env = {
    Concept2Live: C2L, DeviceCore: DC, DecisionCore, CardioCore, ErgProtocolIdentity: EPI, IntervalEngineCore: IEC,
    sessionPrBase: {}, prFor: () => null, upsertExerciseGoalField: async () => {}, tkSetEvidence: UNDEF, liveWorkoutToActual: UNDEF, TKWeather: UNDEF,
    tkC2DiagFinishPath: UNDEF, tkC2DiagFinishEx: UNDEF, tkC2DiagFinishCalled: UNDEF,
    curT: o.curT || 'A', trainStart: Date.now() - 60000, pausedAccumMs: 0, activeInstanceId: null, activePlannedAssignmentId: null,
    sessionLog: {}, sessionExtra: [], finishSessionBezig: false, _tkErgPending: null, _ergProtocol: {}, _c2pair: {}, _c2rt: {}, _c2liveLast: {}, LOS_DOMID: 'los',
    exercisesList: [], getSessionExs: () => env.exercisesList, getExerciseMuscles: () => [], ensureSessionExerciseRows: async () => {},
    writeSessionRow: async row => { if (o.writeThrows) throw new Error('net'); if (o.writeFalse) return false; writes.push(row); return true; },
    completeTrainingInstance: async () => {}, sbPatchQ: async () => true,
    tkProductTelemetry: o.teleThrows ? (() => { throw new Error('tele boom'); }) : ((ev, p) => { tele.push({ ev, p: JSON.parse(JSON.stringify(p || {})) }); return true; }),
    localStorage: { getItem: () => '', setItem() {}, removeItem() {} },
    document: { getElementById: () => element(), querySelectorAll: () => [], querySelector: () => null },
    window: { toast: m => toasts.push(m) }, toast: m => toasts.push(m), td: () => '2026-09-29',
    console: { log() {}, warn() {}, error() {}, info() {} }, CARDIO_TYPES: null, CARDIO_TYPE_BY_ID: null
  };
  const proxy = new Proxy(env, { has: () => true,
    get: (t, k) => { if (k === Symbol.unscopables) return undefined; if (k in t) return t[k] === UNDEF ? undefined : t[k]; if (k in globalThis) return globalThis[k]; return deepNoop(); },
    set: (t, k, v) => { t[k] = v; return true; } });
  const src = constSrc(html, 'const CARDIO_TYPES = {').replace('const CARDIO_TYPES', 'CARDIO_TYPES') + '\n' +
    constSrc(html, 'const CARDIO_TYPE_BY_ID').replace('const CARDIO_TYPE_BY_ID', 'CARDIO_TYPE_BY_ID') + '\n' +
    FNS.map(n => fnSrc(html, n)).join('\n') + '\nreturn {' + FNS.join(',') + '};';
  const api = new Function('__env', 'with(__env){\n' + src + '\n}')(proxy);
  return { env, api, tele, writes, toasts };
}
const ASSAULT = { id: 'assault', naam: 'Assault', type: 'cardio', cardioType: 'assaultbike' };
async function finishRun(html, o) {
  const w = world(html, o); w.env.exercisesList = [ASSAULT];
  if (!o.empty) w.env.sessionLog.assault = { cardio: { type: 'assaultbike', time: '10:00', cals: '120' } };
  let threw = false; try { await w.api.finishSession(); } catch (_) { threw = true; }
  return { tele: w.tele.filter(x => x.ev === 'training.workout.completed'), writes: w.writes.length, threw, toasts: w.toasts, curTAfter: w.env.curT };
}
async function suiteFinish(html) {
  const R = {};
  R.ok = await finishRun(html, {});
  R.prog = await finishRun(html, { curT: 'prog_123' });
  R.writeFalse = await finishRun(html, { writeFalse: true });
  R.writeThrows = await finishRun(html, { writeThrows: true });
  R.empty = await finishRun(html, { empty: true });
  R.teleThrows = await finishRun(html, { teleThrows: true });
  return R;
}

async function suiteAll(html) { return { E: await suiteEmitter(html), C: callSites(html), F: await suiteFinish(html) }; }

function assertAll(html, A, label) {
  const L = s => (label || '') + s;
  const E = A.E, C = A.C, F = A.F;
  // E
  ok(E.noConsent.calls.length === 0 && E.noConsent.r === false, L('E1: zonder consent geen verzending (privacy-by-default)'));
  ok(E.consent0.calls.length === 0, L('E2: consent "0" -> geen verzending'));
  ok(E.ok.calls.length === 1 && E.ok.r === true, L('E3: met consent exact één POST'));
  const c = E.ok.calls[0] || { init: { headers: {} } };
  eq(c.u, '/.netlify/functions/product-telemetry', L('E4: dedicated product-endpoint (niet de crash-telemetry)'));
  eq(c.init.method, 'POST', L('E5: POST'));
  eq(c.init.headers && c.init.headers.Authorization, 'Bearer user-jwt', L('E6: authenticated (JWT van de gebruiker)'));
  let body = {}; try { body = JSON.parse(c.init.body || '{}'); } catch (_) {}
  eq(Object.keys(body).sort().join(','), 'app_version,environment,event,platform,properties', L('E7: exacte payloadvorm, geen extra velden'));
  eq(JSON.stringify(body.properties), JSON.stringify({ source_type: 'program' }), L('E8: alleen geregistreerde properties'));
  eq(body.event, 'training.workout.completed', L('E9: event-id stabiel'));
  ok(E.unreg.calls.length === 0, L('E10: ongeregistreerd event -> niets'));
  ok(E.hrv.calls.length === 0 && E.weight.calls.length === 0, L('E11: athlete-metrics (hrv/weight) -> niets verstuurd'));
  ok(E.unknown.calls.length === 0 && E.badEnum.calls.length === 0, L('E12: onbekende property / ongeldige enum -> niets'));
  ok(E.noAuth.calls.length === 0, L('E13: zonder sessie-auth -> niets'));
  ok(!E.fetchThrows.threw && E.fetchThrows.r === false, L('E14: fetch die throwt -> geen exception naar de aanroeper (fail-open)'));
  ok(!E.reject.threw, L('E15: afgewezen fetch -> geen exception'));
  eq(E.env.join(','), 'production,deploy-preview,branch-deploy,development,unknown', L('E16: omgeving uitsluitend uit bekende hosts'));
  eq(E.native.join(','), 'android,unknown', L('E17: native platform herkend, omgeving eerlijk onbekend'));
  // S
  const reg = PTC.REGISTRY, COMMON = ['route_id', 'correlation_id'];
  ok(C.length === 8, L('S1: exact 8 instrumentatiepunten (was ' + C.length + ')'));
  C.forEach(x => {
    ok(!!reg[x.event], L('S2: geregistreerd event ' + x.event));
    ok(x.tryWrapped, L('S3: aanroep fail-open in try/catch (' + x.event + ')'));
    const p = propsOf(x.obj);
    Object.keys(p).forEach(k => {
      ok(COMMON.indexOf(k) !== -1 || (reg[x.event] && Object.prototype.hasOwnProperty.call(reg[x.event].properties, k)), L('S4: property ' + k + ' toegestaan voor ' + x.event));
      ok(p[k].literal, L('S5: property ' + k + ' is een literal (geen variabele/athlete-data) bij ' + x.event));
      if (reg[x.event] && reg[x.event].properties[k]) p[k].values.forEach(v => ok(reg[x.event].properties[k].indexOf(v) !== -1, L('S6: waarde ' + v + ' in enum ' + k)));
    });
  });
  const byEv = ev => C.filter(x => x.event === ev);
  const at = (ev, i) => byEv(ev)[i || 0];
  ok(byEv('training.opened').length === 1 && fnOf(html, at('training.opened').idx) === 'go' && /if\(id==='s-train-mgr'\)\{[^\n]*$/.test(html.slice(html.lastIndexOf('\n', at('training.opened').idx), at('training.opened').idx)), L('S7: training.opened in go() binnen de s-train-mgr-activatie'));
  ok(byEv('training.history.viewed').length === 1 && fnOf(html, at('training.history.viewed').idx) === 'go' && /if\(id==='s-hist'\)\{[^\n]*$/.test(html.slice(html.lastIndexOf('\n', at('training.history.viewed').idx), at('training.history.viewed').idx)), L('S8: training.history.viewed in go() binnen de s-hist-activatie'));
  const pv = at('training.previewed'); const opf = fnSrc(html, 'openTrainingPreview') || '';
  ok(byEv('training.previewed').length === 1 && fnOf(html, pv.idx) === 'openTrainingPreview' && opf.indexOf("tkProductTelemetry('training.previewed'") > opf.indexOf("if(!def){toast('Training niet gevonden');return;}") && opf.indexOf("tkProductTelemetry('training.previewed'") > opf.indexOf("openModal('m-training-preview')"), L('S9: previewed pas na opgeloste definitie en geopende Preview'));
  const st = byEv('training.workout.started').map(x => fnOf(html, x.idx)).sort().join(',');
  eq(st, 'launchProgramTrainScreen,startCustomTraining,startRepeatWorkout,startT', L('S10: started exact in de vier canonieke startpaden'));
  const sT = fnSrc(html, 'startT') || ''; ok(/if\(!resumeDraft\)\{try\{tkProductTelemetry\('training\.workout\.started'/.test(sT), L('S11: startT: alleen bij verse start (niet bij hervatten)'));
  ['startCustomTraining', 'launchProgramTrainScreen'].forEach(fn => { const s = fnSrc(html, fn) || ''; const r0 = s.indexOf('if(_resume){'), r1 = s.indexOf('else', r0), tp = s.indexOf("tkProductTelemetry('training.workout.started'");
    ok(r0 > 0 && tp > r1 && s.slice(r0, r1).indexOf('tkProductTelemetry') === -1, L('S12: ' + fn + ': started alleen in de verse-starttak, nooit bij resume')); });
  const fs_ = fnSrc(html, 'finishSession') || ''; const cp = fs_.indexOf("tkProductTelemetry('training.workout.completed'");
  ok(byEv('training.workout.completed').length === 1 && fnOf(html, at('training.workout.completed').idx) === 'finishSession', L('S13: completed exact één keer, in finishSession'));
  ok(cp > fs_.indexOf('if(failed>0){') && cp > fs_.indexOf("if(saved===0){toast('Niets om op te slaan')") && cp < fs_.indexOf('}catch(err){'), L('S14: completed na failed>0- en saved===0-guard, binnen het success-pad'));
  ok(!/<script[^>]+(posthog|mixpanel|amplitude|segment|google-analytics|gtag|sentry)/i.test(html), L('S15: geen externe analyticsprovider geladen'));
  ok(html.indexOf('<script src="core/productTelemetry.js"></script>') > 0 && html.indexOf('<script src="core/productTelemetry.js"></script>') < html.indexOf('function tkProductTelemetry('), L('S16: contract geladen vóór de emitter'));
  // F
  eq(F.ok.tele.length, 1, L('F1: geslaagde finishSession -> exact één completed-event'));
  eq(F.ok.tele[0] && F.ok.tele[0].p.source_type, 'my_training', L('F2: source_type my_training'));
  ok(F.ok.writes === 1, L('F3: sessie daadwerkelijk geschreven vóór het event'));
  eq(F.prog.tele[0] && F.prog.tele[0].p.source_type, 'program', L('F4: programmablok -> source_type program'));
  eq(F.writeFalse.tele.length, 0, L('F5: write === false -> geen completed'));
  eq(F.writeThrows.tele.length, 0, L('F6: write-exception -> geen completed'));
  eq(F.empty.tele.length, 0, L('F7: lege sessie (saved===0) -> geen completed'));
  ok(F.teleThrows.writes === 1 && !F.teleThrows.threw && F.teleThrows.toasts.some(t => /oefeningen opgeslagen/.test(t)) && F.teleThrows.curTAfter === null, L('F8: crashende telemetry blokkeert completion niet (fail-open)'));
  ok(F.ok.tele.every(x => Object.keys(x.p).every(k => ['source_type', 'route_id', 'correlation_id'].indexOf(k) !== -1)), L('F9: completed-event bevat geen athlete/training-velden'));
}

(async function run() {
  const A = await suiteAll(HTML);
  assertAll(HTML, A, '');
  // ── X. sabotage: elke guard terugdraaien moet een assertie laten falen ──
  const sab = [
    ['consent-gate weg', h => h.replace("if(!tkProductTelemetryConsent())return false;", ''), A2 => A2.E.noConsent.calls.length > 0],
    ['registry-validatie omzeild', h => h.replace("if(!built||!built.ok)return false;", "if(!built||!built.ok)built={ok:true,event:{event:eventId,app_version:'x',environment:'unknown',platform:'unknown'}};"), A2 => A2.E.hrv.calls.length > 0 || A2.E.unreg.calls.length > 0],
    ['completed vóór de saved===0-guard', h => h.replace("  try{tkProductTelemetry('training.workout.completed',{source_type:(String(t||'').indexOf('prog_')===0)?'program':'my_training'});}catch(_pt){}\r\n", '')
        .replace("  if(failed>0){\r\n", "  try{tkProductTelemetry('training.workout.completed',{source_type:(String(t||'').indexOf('prog_')===0)?'program':'my_training'});}catch(_pt){}\r\n  if(failed>0){\r\n"), A2 => A2.F.writeFalse.tele.length > 0 || A2.F.empty.tele.length > 0],
    ['try/catch rond completed weg', h => h.replace("try{tkProductTelemetry('training.workout.completed',{source_type:(String(t||'').indexOf('prog_')===0)?'program':'my_training'});}catch(_pt){}", "tkProductTelemetry('training.workout.completed',{source_type:(String(t||'').indexOf('prog_')===0)?'program':'my_training'});"), A2 => !A2.F.teleThrows.toasts.some(t => /oefeningen opgeslagen/.test(t))],
    ['resume-guard startT weg', h => h.replace("if(!resumeDraft){try{tkProductTelemetry('training.workout.started'", "if(true){try{tkProductTelemetry('training.workout.started'"), null],
    ['athlete-waarde in call', h => h.replace("tkProductTelemetry('training.opened',{route_id:'s-train-mgr'})", "tkProductTelemetry('training.opened',{route_id:'s-train-mgr',hrv:x.hrv})"), null],
    ['fetch-exception niet afgevangen', h => h.replace("  }catch(_){ return false; }\r\n}\r\n</script>", "  }finally{}\r\n}\r\n</script>"), A2 => A2.E.fetchThrows.threw]
  ];
  for (const [name, mut, detect] of sab) {
    const h2 = mut(HTML);
    if (h2 === HTML) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
    let A2 = null; try { A2 = await suiteAll(h2); } catch (e) { A2 = null; }
    let caught;
    if (detect) caught = A2 !== null && detect(A2);
    else { const pp = pass, ff = fail; mute = true; assertAll(h2, A2 || { E: A.E, C: [], F: A.F }, '[sab] '); mute = false; caught = fail > ff; pass = pp; fail = ff; }
    if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
    ok(caught === true, 'SABOTAGE gedetecteerd via assertie: ' + name);
  }
  finished = true;
  console.log('\n[ProductTelemetryLifecycle] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('MISLUKT: exception ' + (e && e.stack)); process.exit(1); });
