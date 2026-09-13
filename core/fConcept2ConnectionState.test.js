/* fConcept2ConnectionState.test.js — CONCEPT2 PM5 FASE B: connection state preservation,
 * no-rescan guard, echte disconnect-state, reconnect-flow, wrong-machine naam-hint en
 * productie-UX-teksten. Draait de ECHTE UI-functies uit index.html in een sandbox met
 * een stub-transport (geen fake BLE, geen echte DOM-app).
 *
 * Draai: node core/fConcept2ConnectionState.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const Concept2Live = require(path.join(ROOT, 'core/concept2Live.js'));
let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(a === b, l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// ---- exact de UI-functies uit index.html (pairing-blok) isoleren ----
const start = html.indexOf('function tkDeviceTransport(){');
const end = html.indexOf('var _tkHealthPeriod = 14');
ok(start > 0 && end > start, 'pairing-blok gevonden in index.html');
const block = html.slice(start, end);

function makeStubTransport() {
  const st = { state: 'idle', deviceId: null, connListeners: [], metricListeners: [], calls: { discover: 0, connect: 0, disconnect: 0, reasons: [] } };
  const t = {
    available: true,
    getStatus() { return { state: st.state, deviceId: st.deviceId, machineType: 'unknown', available: true }; },
    getPermissionState() { return 'granted'; },
    discover() { st.calls.discover++; return Promise.resolve([{ id: 'dev-1', name: 'PM5 430716776 Row', machineType: 'unknown', rssi: -40 }]); },
    connect(mt, id) { st.calls.connect++; st.state = 'connected'; st.deviceId = id; return Promise.resolve({ connected: true, machineType: mt, deviceId: id }); },
    disconnect(reason) { st.calls.disconnect++; st.calls.reasons.push(reason); st.state = 'disconnected'; st.deviceId = null; return Promise.resolve(); },
    subscribeConnection(cb) { st.connListeners.push(cb); return () => { const i = st.connListeners.indexOf(cb); if (i !== -1) st.connListeners.splice(i, 1); }; },
    subscribeMetrics(cb) { st.metricListeners.push(cb); return () => { const i = st.metricListeners.indexOf(cb); if (i !== -1) st.metricListeners.splice(i, 1); }; },
    unsubscribeMetrics() { st.metricListeners = []; },
    _st: st,
    _pluginDisconnect() { st.state = 'disconnected'; st.deviceId = null; st.connListeners.slice().forEach((cb) => cb({ state: 'disconnected', deviceId: null })); }
  };
  return t;
}

function makeSandbox(transport) {
  const dom = {}; // id -> innerHTML
  const ctx = {
    window: { TKDeviceTransport: transport },
    document: { getElementById(id) { if (!(id in dom)) return null; return { set innerHTML(v) { dom[id] = v; }, get innerHTML() { return dom[id]; } }; } },
    Concept2Live, DeviceCore: { formatDurationStr: (s) => String(s) },
    console, Promise, setTimeout, performance: { now: () => Date.now() },
    _dom: dom
  };
  ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(block, ctx);
  // mount-helper: rendert de widget en registreert de body in de stub-DOM
  ctx.mount = function (exId, cardioType) {
    const h = ctx.tkRenderErgConnect(exId, cardioType, 'RowErg');
    const m = /id="c2body-([^"]+)">([\s\S]*)<\/div><\/div>$/.exec(h);
    dom['c2body-' + exId] = m ? m[2] : '';
    return h;
  };
  return ctx;
}
const tick = () => new Promise((r) => setTimeout(r, 5));

(async () => {
  // ═══ A/B/C: rerender tijdens actieve verbinding behoudt state + listeners, geen duplicaten ═══
  {
    const t = makeStubTransport(); const c = makeSandbox(t);
    c.mount('ex1', 'rowing');
    ok(c._dom['c2body-ex1'].includes('Apparaat koppelen'), 'init: idle toont "Apparaat koppelen"');
    await c.tkErgPair('ex1'); await tick();
    eq(t._st.calls.discover, 1, 'pair: discover 1x');
    c.tkErgSelect('ex1', 0); // naam "…Row" + rowing -> geen hint-mismatch -> connect
    await tick(); await tick();
    eq(t._st.calls.connect, 1, 'connect 1x');
    eq(c._c2pair.ex1.connected, true, 'UI-state connected');
    ok(c._dom['c2body-ex1'].includes('verbonden'), 'CONNECTED-UI zichtbaar');
    ok(c._dom['c2body-ex1'].includes('PM5 verbonden — wachten op trainingsdata'), 'WAITING_FOR_DATA-tekst zichtbaar zolang geen metrics');
    const unsubM = c._c2pair.ex1._unsubMetrics, unsubC = c._c2pair.ex1._unsubConn;
    eq(t._st.connListeners.length, 1, 'exact 1 connection-listener');
    eq(t._st.metricListeners.length, 1, 'exact 1 metrics-listener');
    // RERENDER (buildCardioBody -> tkRenderErgConnect)
    const h2 = c.mount('ex1', 'rowing');
    eq(c._c2pair.ex1.connected, true, 'A: rerender behoudt connected-state');
    ok(h2.includes('verbonden') && !h2.includes('Apparaat koppelen'), 'A: rerender toont verbonden-UI, niet "Apparaat koppelen"');
    ok(c._c2pair.ex1._unsubMetrics === unsubM && c._c2pair.ex1._unsubConn === unsubC, 'B: listener-referenties blijven behouden');
    eq(t._st.connListeners.length, 1, 'C: geen duplicate connection-listener na rerender');
    eq(t._st.metricListeners.length, 1, 'C: geen duplicate metrics-listener na rerender');
    eq(t._st.calls.connect, 1, 'C: rerender start geen nieuwe connect');
    eq(t._st.calls.discover, 1, 'C: rerender start geen nieuwe discovery');
    // D: "Apparaat koppelen" (tkErgPair) tijdens actieve verbinding -> geen nieuwe discovery
    await c.tkErgPair('ex1'); await tick();
    eq(t._st.calls.discover, 1, 'D: tkErgPair bij actieve verbinding start GEEN nieuwe discovery');
    eq(t._st.calls.connect, 1, 'D: … en geen nieuwe connect');
    ok(c._dom['c2body-ex1'].includes('verbonden'), 'D: bestaande verbonden-state getoond');
    // L: geen notificaties -> blijft connected
    eq(c._c2pair.ex1.connected, true, 'L: zonder data blijft UI connected (no-data ≠ disconnected)');
    // E/F/G: plugin-disconnect -> UI disconnected met acties
    t._pluginDisconnect(); await tick();
    eq(c._c2pair.ex1.connected, false, 'F: st.connected=false na plugin-disconnect');
    ok(c._dom['c2body-ex1'].includes('De verbinding met de PM5 is verbroken.'), 'DISCONNECTED-tekst zichtbaar');
    ok(c._dom['c2body-ex1'].includes('Opnieuw verbinden') && c._dom['c2body-ex1'].includes('Ander apparaat kiezen'), 'acties Opnieuw verbinden / Ander apparaat kiezen');
    ok(!c._dom['c2body-ex1'].includes('opnieuw verbinden…'), 'G: geen fake "opnieuw verbinden…"-belofte');
    // rerender na disconnect blijft disconnected-UI (niet stil terug naar idle)
    const h3 = c.mount('ex1', 'rowing');
    ok(h3.includes('De verbinding met de PM5 is verbroken.'), 'rerender na disconnect toont verbroken-staat (geen stille reset)');
    // H: reconnect-knop -> nieuwe expliciete connect-flow
    c.tkErgReconnect('ex1'); await tick(); await tick();
    eq(t._st.calls.connect, 2, 'H: Opnieuw verbinden start een nieuwe, expliciete connect');
    eq(c._c2pair.ex1.connected, true, 'H: opnieuw connected');
    eq(t._st.connListeners.length, 1, 'H: na reconnect nog steeds exact 1 connection-listener (oude opgeruimd)');
    eq(t._st.metricListeners.length, 1, 'H: exact 1 metrics-listener na reconnect');
    // user disconnect -> bekende reden + idle
    c.tkErgDisconnect('ex1'); await tick();
    eq(t._st.calls.reasons[t._st.calls.reasons.length - 1], 'user_disconnect', 'user-disconnect geeft KNOWN reden user_disconnect door');
    eq(t._st.connListeners.length, 0, 'user-disconnect ruimt de exercise-listeners op (geen wezen-listeners)');
    ok(c._dom['c2body-ex1'].includes('Apparaat koppelen'), 'na user-disconnect terug naar idle');
    // disconnectAll met reden
    c._c2pair.ex1.connected = true; c.tkErgDisconnectAll('session_finish'); await tick();
    eq(t._st.calls.reasons[t._st.calls.reasons.length - 1], 'session_finish', 'finishSession geeft reden session_finish door');
  }
  // ═══ UI/transport-mismatch: UI zegt connected, transport niet -> herstel vanuit transport ═══
  {
    const t = makeStubTransport(); const c = makeSandbox(t);
    c.mount('ex1', 'rowing'); c._c2pair.ex1.connected = true; c._c2pair.ex1.wasConnected = true; // transport is idle
    const h = c.mount('ex1', 'rowing');
    eq(c._c2pair.ex1.connected, false, 'transport-truth: UI-connected zonder transport-connected wordt hersteld');
    ok(h.includes('De verbinding met de PM5 is verbroken.'), '… en toont de verbroken-staat i.p.v. een fake verbonden-UI');
    eq(t._st.calls.connect, 0, 'geen verborgen reconnect');
  }
  // ═══ M: wrong-machine naam-hint ═══
  {
    const t = makeStubTransport(); const c = makeSandbox(t);
    c.mount('exB', 'bikeerg');
    c._c2pair.exB.devices = [{ id: 'dev-1', name: 'PM5 430716776 Row', machineType: 'unknown', rssi: -40 }];
    c.tkErgSelect('exB', 0); await tick();
    ok(c._dom['c2body-exB'].includes('Dit apparaat meldt zich als RowErg, maar je hebt BikeErg geselecteerd.'), 'M: naam-hint mismatch-melding');
    ok(c._dom['c2body-exB'].includes('Ander apparaat kiezen') && c._dom['c2body-exB'].includes('Toch verbinden'), 'M: acties Ander apparaat kiezen / Toch verbinden');
    eq(t._st.calls.connect, 0, 'M: geen automatische connect bij hint-mismatch (maar ook geen hard block)');
    c.tkErgConnectDevice('exB', 0); await tick(); await tick();
    eq(t._st.calls.connect, 1, 'M: "Toch verbinden" verbindt alsnog (geen hard block op naam)');
    // geen hint bij passende naam, geen hint zonder naam
    const t2 = makeStubTransport(); const c2 = makeSandbox(t2);
    c2.mount('exR', 'rowing'); c2._c2pair.exR.devices = [{ id: 'x', name: 'PM5', machineType: 'unknown' }];
    c2.tkErgSelect('exR', 0); await tick(); await tick();
    eq(t2._st.calls.connect, 1, 'M: naam zonder Row/Bike/Ski geeft geen hint en verbindt direct');
    eq(Concept2Live.machineHintFromName('PM5 430716776 Row'), 'rowerg', 'hint Row');
    eq(Concept2Live.machineHintFromName('PM5 12 Bike'), 'bikeerg', 'hint Bike');
    eq(Concept2Live.machineHintFromName('PM5 12 Ski'), 'skierg', 'hint Ski');
    eq(Concept2Live.machineHintFromName(null), null, 'hint null');
    eq(Concept2Live.machineHintMismatchMessage('rowerg', 'rowing'), null, 'geen melding bij match');
    ok(!/430716776/.test(block), 'geen hardcoded PM5-ID in de UI-code');
  }
  // ═══ Statisch: UX-teksten zonder technische termen; geen reconnecting-tekst ═══
  {
    ok(block.includes("'Verbinden met PM5…'") || block.includes('Verbinden met PM5…'), 'CONNECTING-tekst aanwezig');
    ok(block.includes('Verbinding mislukt. Probeer opnieuw.'), 'ERROR-tekst aanwezig');
    ok(!/state==='reconnecting'|'Verbinding verbroken — opnieuw verbinden'/.test(block), "geen 'reconnecting'-afhandeling of fake reconnect-belofte meer in de UI-code");
    const uiTexts = block.match(/'[^']*(?:UUID|GATT|FTMS|decoder)[^']*'/gi) || [];
    ok(uiTexts.length === 0, 'geen UUID/GATT/FTMS/decoder-termen in UI-strings (' + uiTexts.length + ')');
  }
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fConcept2ConnectionState: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
