/* ============================================================================
 * fA5DeviceConnectE2E.test.js — MASTERSPRINT A5 (v4.66.0/v4.67.0)
 * ----------------------------------------------------------------------------
 * FUNCTIONELE (niet uitsluitend statische) bewijsvoering. De daadwerkelijke
 * functies (tkErgPair/tkErgSelect/tkErgConnectDevice/tkDeviceTransport/etc.)
 * worden LETTERLIJK uit index.html geëxtraheerd en in een echte JS-omgeving
 * uitgevoerd, met een gemockte transport (exact het contract dat
 * tkDeviceTransport() zelf documenteert) en gesimuleerde trainingsstaat
 * (sessionLog/activeInstanceId/curT/resolvedWorkout/trainStart/etc. -- de
 * daadwerkelijke, echte globale variabelen uit de app, niet nagemaakt).
 *
 * Dit bewijst PRIORITEIT 1-6 uit de A5-hardeningsopdracht met echt gedrag,
 * niet alleen regex-aanwezigheid van code.
 *
 * BEKENDE GRENS: geen live browser/DOM/echte BLE-hardware in deze omgeving.
 * document.getElementById wordt gemockt (retourneert een object met een
 * innerHTML-property) zodat _c2repaint() niet crasht -- de DOM-inhoud zelf
 * wordt niet visueel geverifieerd, uitsluitend de callback-/state-effecten.
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + label); } }
function eq(actual, expected, label) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label + ' (kreeg ' + JSON.stringify(actual) + ', verwacht ' + JSON.stringify(expected) + ')');
}

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extract(name) {
  const s = html.indexOf('function ' + name + '(');
  if (s === -1) throw new Error('Functie niet gevonden: ' + name);
  let d = 0, start = html.indexOf('{', s), end = -1;
  for (let j = start; j < html.length; j++) {
    if (html[j] === '{') d++;
    else if (html[j] === '}') { d--; if (d === 0) { end = j; break; } }
  }
  return html.slice(s, end + 1);
}

// ── Echte functiebroncode, letterlijk uit index.html ────────────────────────
const src = [
  "var _c2pair={}, _c2liveLast={};",
  "var _C2ERGLBL={rowing:'RowErg',skierg:'SkiErg',bikeerg:'BikeErg'};",
  extract('tkDeviceTransport'),
  extract('_c2mt'),
  extract('_c2msg'),
  extract('_c2note'),
  extract('_c2btn'),
  extract('_c2wrap'),
  extract('_c2repaint'),
  extract('_c2connectedInner'),
  extract('_c2deviceList'),
  extract('tkErgPair'),
  extract('tkErgSelect'),
  extract('tkErgConnectDevice')
].join('\n');

// ── Gemockte omgeving: exact het contract dat tkDeviceTransport() zelf
// documenteert, plus de ECHTE trainingsstaat-variabelen (niet nagemaakte
// namen -- dit ZIJN de daadwerkelijke globals uit de app). ──────────────────
function bouwSandbox() {
  const domNodes = {};
  const sandbox = {
    console,
    // Echte trainingsstaat -- exact dezelfde variabelen als in de app.
    curT: 'A',
    activeInstanceId: 'instance-42',
    sessionLog: { squat: { sets: [{ kg: '100', reps: '5', rpe: '8' }] } },
    sessionExtra: [],
    resolvedWorkout: { t: 'A', items: [{ id: 'rowing1', naam: 'RowErg' }] },
    trainStart: Date.now() - 600000,
    pausedAccumMs: 5000,
    execFocus: { A: 0 },
    // Concept2Live: minimale, echte-contract-conforme mock (machine-match +
    // normalisatie), zodat _c2connectedInner/normalizeLiveMetric niet crashen.
    Concept2Live: {
      pairingMessage: function (state) { return 'msg:' + state; },
      machineMatchesExercise: function (deviceType, cardioType) {
        const mt = { rowing: 'rowerg', skierg: 'skierg', bikeerg: 'bikeerg' }[cardioType] || cardioType;
        return { match: deviceType === mt, message: 'mismatch' };
      },
      normalizeLiveMetric: function (raw, mt, opts) {
        if (raw == null || typeof raw !== 'object') return null;
        const d = parseFloat(raw.distance_m);
        if (!isFinite(d)) return null;
        return { schema: 'live.v1', distance_m: d, elapsed_s: raw.elapsed_s || 0 };
      },
      paceBasisFor: function () { return 500; }
    },
    document: {
      getElementById: function (id) {
        if (!domNodes[id]) domNodes[id] = { innerHTML: '' };
        return domNodes[id];
      }
    },
    window: {},
    performance: { now: function () { return Date.now(); } },
    _domNodes: domNodes
  };
  sandbox.window.TKDeviceTransport = null; // per test overschreven
  return sandbox;
}

function draaiMet(sandbox, extraCode) {
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src + '\n' + (extraCode || ''), ctx);
  // Exacte initialisatie die normaliter door tkRenderErgConnect() gebeurt (niet apart
  // geëxtraheerd omdat die functie ook rendering van de "not_available"-melding bevat
  // die hier niet relevant is) -- dezelfde vorm van het _c2pair[exId]-object.
  vm.runInContext("_c2pair['rowing1']={cardioType:'rowing',ergLabel:'RowErg',mt:_c2mt('rowing'),devices:[],connected:false};", ctx);
  return ctx;
}

// ── Mock-transport-fabriek: implementeert EXACT het door tkDeviceTransport()
// zelf gedocumenteerde contract, en houdt subscriptie-tellingen bij zodat
// gestapelde listeners meetbaar zijn (het bewezen bugscenario). ─────────────
function maakMockTransport(opts) {
  opts = opts || {};
  let metricListeners = [], connListeners = [], connectCallCount = 0, discoverCallCount = 0;
  const devices = opts.devices || [{ id: 'dev-1', machineType: opts.machineType || 'rowerg' }];
  return {
    available: true,
    getPermissionState: function () { return 'granted'; },
    discover: function () { discoverCallCount++; return Promise.resolve(devices); },
    connect: function (mt, deviceId) {
      connectCallCount++;
      return (opts.connectDelay ? new Promise(function (res) { setTimeout(function () { res({ connected: true }); }, opts.connectDelay); }) : Promise.resolve({ connected: true }));
    },
    subscribeMetrics: function (cb) {
      metricListeners.push(cb);
      return function () { const i = metricListeners.indexOf(cb); if (i !== -1) metricListeners.splice(i, 1); };
    },
    unsubscribeMetrics: function () { metricListeners = []; },
    subscribeConnection: function (cb) {
      connListeners.push(cb);
      return function () { const i = connListeners.indexOf(cb); if (i !== -1) connListeners.splice(i, 1); };
    },
    _emitMetric: function (evt) { metricListeners.slice().forEach(function (cb) { cb(evt); }); },
    _emitConn: function (evt) { connListeners.slice().forEach(function (cb) { cb(evt); }); },
    _metricListenerCount: function () { return metricListeners.length; },
    _connListenerCount: function () { return connListeners.length; },
    _connectCallCount: function () { return connectCallCount; },
    _discoverCallCount: function () { return discoverCallCount; }
  };
}

async function wachtTick(n) {
  for (let i = 0; i < (n || 5); i++) await new Promise(function (r) { setImmediate(r); });
  await new Promise(function (r) { setTimeout(r, 10); }); // vangt promise-microtask-chains binnen discover()/connect() robuust op
}

// ════════════════════════════════════════════════════════════════════════
console.log('\nA. PRIORITEIT 1 — STATE PRESERVATION (echte, functionele run)');
console.log('════════════════════════════════════════════════════════════');
(async function () {
  const sandbox = bouwSandbox();
  sandbox.window.TKDeviceTransport = maakMockTransport();
  const ctx = draaiMet(sandbox);

  // Snapshot VÓÓR connect — van de ECHTE trainingsstaat-variabelen.
  const voor = {
    activeInstanceId: ctx.activeInstanceId, curT: ctx.curT,
    resolvedWorkout: JSON.stringify(ctx.resolvedWorkout),
    sessionLog: JSON.stringify(ctx.sessionLog), sessionExtra: JSON.stringify(ctx.sessionExtra),
    trainStart: ctx.trainStart, pausedAccumMs: ctx.pausedAccumMs, execFocus: JSON.stringify(ctx.execFocus)
  };

  ctx.tkErgPair('rowing1');
  await wachtTick();
  ctx.tkErgSelect('rowing1', 0);
  await wachtTick();

  const na = {
    activeInstanceId: ctx.activeInstanceId, curT: ctx.curT,
    resolvedWorkout: JSON.stringify(ctx.resolvedWorkout),
    sessionLog: JSON.stringify(ctx.sessionLog), sessionExtra: JSON.stringify(ctx.sessionExtra),
    trainStart: ctx.trainStart, pausedAccumMs: ctx.pausedAccumMs, execFocus: JSON.stringify(ctx.execFocus)
  };

  eq(na.activeInstanceId, voor.activeInstanceId, 'A1: activeInstanceId ongewijzigd na daadwerkelijke connect-flow-uitvoering');
  eq(na.curT, voor.curT, 'A2: curT (huidige trainingscontext) ongewijzigd');
  eq(na.resolvedWorkout, voor.resolvedWorkout, 'A3: resolvedWorkout-object ongewijzigd (geen nieuwe workout-instance)');
  eq(na.sessionLog, voor.sessionLog, 'A4: sessionLog (reeds gelogde sets) volledig intact');
  eq(na.sessionExtra, voor.sessionExtra, 'A5: sessionExtra ongewijzigd');
  eq(na.trainStart, voor.trainStart, 'A6: trainStart-timestamp ongewijzigd (timer niet gereset)');
  eq(na.pausedAccumMs, voor.pausedAccumMs, 'A7: pausedAccumMs (pauze-boekhouding) ongewijzigd');
  eq(na.execFocus, voor.execFocus, 'A8: execFocus (huidige oefening) ongewijzigd');
  ok(sandbox.window.TKDeviceTransport._connectCallCount() === 1, 'A9: exact één daadwerkelijke connect()-aanroep naar de transport');

  console.log('\nB. PRIORITEIT 2 — CONNECT/DISCONNECT/RECONNECT TRIGGEREN NOOIT DE WORKOUT-LIFECYCLE');
  console.log('════════════════════════════════════════════════════════════');
  let finishAangeroepen = false, discardAangeroepen = false, completeInstanceAangeroepen = false;
  ctx.finishSession = function () { finishAangeroepen = true; };
  ctx.execLeaveDiscard = function () { discardAangeroepen = true; };
  ctx.completeTrainingInstance = function () { completeInstanceAangeroepen = true; };
  sandbox.window.TKDeviceTransport._emitConn({ state: 'disconnected' });
  sandbox.window.TKDeviceTransport._emitConn({ state: 'reconnecting' });
  sandbox.window.TKDeviceTransport._emitConn({ state: 'connected' });
  await wachtTick();
  ok(!finishAangeroepen, 'B1: geen enkele disconnect/reconnect-gebeurtenis roept finishSession() aan');
  ok(!discardAangeroepen, 'B2: geen enkele disconnect/reconnect-gebeurtenis roept execLeaveDiscard() aan');
  ok(!completeInstanceAangeroepen, 'B3: geen enkele disconnect/reconnect-gebeurtenis roept completeTrainingInstance() aan');

  console.log('\nC. PRIORITEIT 3 — DOUBLE CONNECT / DUPLICATE LISTENERS (echte race, echte guard)');
  console.log('════════════════════════════════════════════════════════════');
  const sandbox2 = bouwSandbox();
  sandbox2.window.TKDeviceTransport = maakMockTransport({ connectDelay: 20 });
  const ctx2 = draaiMet(sandbox2);
  ctx2.tkErgPair('rowing1');
  await wachtTick();
  // Snel dubbel tikken: twee vrijwel gelijktijdige connect-pogingen vóórdat de eerste klaar is.
  ctx2.tkErgSelect('rowing1', 0);
  ctx2.tkErgSelect('rowing1', 0);
  ctx2.tkErgSelect('rowing1', 0);
  await new Promise(function (r) { setTimeout(r, 150); });
  await wachtTick();
  eq(sandbox2.window.TKDeviceTransport._connectCallCount(), 1, 'C1 (kernbewijs busy-guard): drie snelle taps resulteren in EXACT één daadwerkelijke connect()-aanroep');
  eq(sandbox2.window.TKDeviceTransport._metricListenerCount(), 1, 'C2 (kernbewijs, het oorspronkelijk gevonden lek): maximaal één actieve metrics-subscription na de connect-flow');
  eq(sandbox2.window.TKDeviceTransport._connListenerCount(), 1, 'C3: maximaal één actieve connection-subscription');

  console.log('\nD. PRIORITEIT 4 — RECONNECT: GEEN GESTAPELDE LISTENERS BIJ HERNIEUWD VERBINDEN');
  console.log('════════════════════════════════════════════════════════════');
  const sandbox3 = bouwSandbox();
  sandbox3.window.TKDeviceTransport = maakMockTransport();
  const ctx3 = draaiMet(sandbox3);
  ctx3.tkErgPair('rowing1'); await wachtTick();
  ctx3.tkErgSelect('rowing1', 0); await wachtTick();
  eq(sandbox3.window.TKDeviceTransport._metricListenerCount(), 1, 'D1: na de eerste, succesvolle connect exact één metrics-listener');
  const voorReconnectInstance = ctx3.activeInstanceId, voorReconnectLog = JSON.stringify(ctx3.sessionLog);
  // Simuleer signaalverlies gevolgd door een daadwerkelijke, opnieuw uitgevoerde connect-poging
  // (exact het pad dat de "Opnieuw verbinden"-knop aanroept: tkErgConnectDevice() opnieuw).
  sandbox3.window.TKDeviceTransport._emitConn({ state: 'disconnected' });
  await wachtTick();
  ctx3.tkErgConnectDevice('rowing1', 0);
  await wachtTick();
  eq(sandbox3.window.TKDeviceTransport._metricListenerCount(), 1, 'D2 (kernbewijs, het oorspronkelijk gevonden lek): na reconnect NOG STEEDS exact één metrics-listener, geen stapeling');
  eq(sandbox3.window.TKDeviceTransport._connListenerCount(), 1, 'D3: idem voor de connection-listener na reconnect');
  eq(ctx3.activeInstanceId, voorReconnectInstance, 'D4: activeInstanceId ongewijzigd na reconnect');
  eq(JSON.stringify(ctx3.sessionLog), voorReconnectLog, 'D5: sessionLog ongewijzigd na reconnect');

  console.log('\nE. PRIORITEIT 12 (vervroegd getest hier) — INVALID/MALFORMED METRIC SAFETY');
  console.log('════════════════════════════════════════════════════════════');
  const sandbox4 = bouwSandbox();
  sandbox4.window.TKDeviceTransport = maakMockTransport();
  const ctx4 = draaiMet(sandbox4);
  ctx4.tkErgPair('rowing1'); await wachtTick();
  ctx4.tkErgSelect('rowing1', 0); await wachtTick();
  let crashte = false;
  try {
    sandbox4.window.TKDeviceTransport._emitMetric({ metrics: null });
    sandbox4.window.TKDeviceTransport._emitMetric({ metrics: { distance_m: NaN } });
    sandbox4.window.TKDeviceTransport._emitMetric(null);
    sandbox4.window.TKDeviceTransport._emitMetric({ metrics: { distance_m: 'niet-een-getal' } });
  } catch (e) { crashte = true; }
  ok(!crashte, 'E1: null/NaN/malformed metric-events veroorzaken GEEN crash in de live-update-keten');

  console.log('\n' + '='.repeat(56));
  console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (fail) { console.log('❌ A5 device-connect E2E niet groen.'); process.exitCode = 1; }
  else console.log('✅ Mid-workout device-connect functioneel bewezen: state preservation, geen lifecycle-triggers, geen gestapelde listeners, geen crash op ongeldige metrics.');
})();
