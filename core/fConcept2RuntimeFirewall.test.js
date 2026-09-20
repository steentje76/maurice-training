/* Gate B fysieke-failure firewall.
 * Vangt exact de twee blockers af die de PM5-test lieten mislukken en die de
 * eerdere Node-tests MISTEN, omdat require() werkt waar de browser faalt:
 *   1. concept2Csafe.js / concept2Programming.js zonder script-tag in index.html
 *   2. een BLE-gateway zonder write(), terwijl writeControlFrame die nodig heeft
 * Deze suite draait de modules expliciet via het BROWSER-pad (global), niet via require. */
const fs = require('fs'); const path = require('path'); const vm = require('vm');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
const tag = f => html.indexOf('<script src="core/' + f + '"></script>');

// ── 1. script-tags aanwezig en in de juiste dependency-volgorde ──────────────
const iLive = tag('concept2Live.js'), iCsafe = tag('concept2Csafe.js'), iProg = tag('concept2Programming.js');
ok(iCsafe > -1, 'F1: concept2Csafe.js heeft een echte script-tag in index.html');
ok(iProg > -1, 'F2: concept2Programming.js heeft een echte script-tag in index.html');
ok(iLive > -1, 'F3: concept2Live.js blijft geladen (Gate A)');
ok(iCsafe < iProg, 'F4: Csafe wordt VOOR Programming geladen (Programming leest global.Concept2Csafe)');
ok(iProg < html.indexOf('Concept2Programming.createProgrammingController'), 'F5: beide modules geladen voor het eerste gebruik');

// ── 2. browser-pad: modules moeten zich op global registreren, zonder require ──
const sandbox = { console, setTimeout, clearTimeout, Date, JSON, Math, DataView, Uint8Array, ArrayBuffer, Promise };
sandbox.self = sandbox; sandbox.window = sandbox; sandbox.global = sandbox;
vm.createContext(sandbox);
for (const f of ['concept2Csafe.js', 'concept2Programming.js']) {
  vm.runInContext(fs.readFileSync(path.resolve('core/' + f), 'utf8'), sandbox, { filename: f });
}
ok(typeof sandbox.Concept2Csafe === 'object' && sandbox.Concept2Csafe, 'F6: Concept2Csafe beschikbaar op global via het browserpad');
ok(typeof sandbox.Concept2Programming === 'object' && sandbox.Concept2Programming, 'F7: Concept2Programming beschikbaar op global via het browserpad');
ok(typeof sandbox.Concept2Programming.createProgrammingController === 'function', 'F8: createProgrammingController aanroepbaar in de browser');
// de controller moet in de browser de CSAFE-core VINDEN (de fout die de PM5-test brak)
const built = sandbox.Concept2Csafe.buildFixedDistanceWorkout(1000, {});
ok(built && built.ok === true, 'F9: CSAFE-builder werkt in de browsercontext');
ok(Array.isArray(built.frame) && built.frame.length > 0, 'F10: builder levert een frame in de browsercontext');

// ── 3. productie-gateway MOET write() exporteren ─────────────────────────────
const gwSrc = fs.readFileSync(path.resolve('native/src/capacitorBleGateway.js'), 'utf8');
ok(/async write\(deviceId, service, characteristic, bytes\)/.test(gwSrc), 'F11: productie-gateway exporteert write()');
ok(/BleClient\.write\(deviceId, lc\(service\), lc\(characteristic\), dv\)/.test(gwSrc), 'F12: write gaat naar BleClient.write met een DataView');
ok(/new DataView\(arr\.buffer/.test(gwSrc), 'F13: byte-array wordt naar DataView geconverteerd zoals de plugin eist');
ok(!/writeWithoutResponse/.test(gwSrc), 'F14: geen writeWithoutResponse (write met response, zodat falen zichtbaar is)');

// ── 4. transport weigert wanneer de gateway GEEN write heeft ────────────────
const NT = require(path.resolve('native/src/nativeConcept2BleTransport.js'));
const C2L = require(path.resolve('core/concept2Live.js'));
const U = s => 'CE0600' + s + '-43E5-11E4-916C-0800200C9A66';
function gw(withWrite) {
  const g = {
    isAvailable: () => Promise.resolve({ available: true }),
    getPermissionState: () => Promise.resolve({ state: 'granted' }),
    requestPermissions: () => Promise.resolve({ state: 'granted' }),
    connect: () => Promise.resolve({ connected: true }), disconnect: () => Promise.resolve({}),
    getServices: () => Promise.resolve({ services: [
      { uuid: U('20').toLowerCase(), characteristics: [
        { uuid: U('22').toLowerCase(), properties: { notify: true } },
        { uuid: U('21').toLowerCase(), properties: { write: true } }] },
      { uuid: U('30').toLowerCase(), characteristics: [{ uuid: U('80').toLowerCase(), properties: { notify: true } }] }] }),
    startNotifications: () => Promise.resolve({}), stopNotifications: () => Promise.resolve({}),
    startScan: () => Promise.resolve({}), stopScan: () => Promise.resolve({})
  };
  if (withWrite) g.write = () => Promise.resolve({});
  return g;
}
async function run() {
  { const T = NT.makeNativeConcept2BleTransport({ gateway: gw(false), concept2Live: C2L, now: () => 1, setTimeoutFn: f => { f(); return 0; }, clearTimeoutFn: () => {} });
    await T.connect('rowerg', 'D1');
    let err = null; await T.writeControlFrame([0xF1, 0xF2]).catch(e => { err = e.message; });
    eq(err, 'no_write_capability', 'F15: gateway zonder write -> writeControlFrame weigert expliciet'); }
  { const T = NT.makeNativeConcept2BleTransport({ gateway: gw(true), concept2Live: C2L, now: () => 1, setTimeoutFn: f => { f(); return 0; }, clearTimeoutFn: () => {} });
    await T.connect('rowerg', 'D1');
    const r = await T.writeControlFrame([0xF1, 0x00, 0xF2]);
    eq(r.ok, true, 'F16: gateway met write -> writeControlFrame slaagt'); }
  // ── 5. echte builder + echte gateway-adapter, end-to-end door het browserpad ──
  { const writes = [];
    const g = gw(true); g.write = (id, svc, chr, bytes) => { writes.push({ svc: String(svc).toLowerCase(), chr: String(chr).toLowerCase(), bytes: Array.prototype.slice.call(bytes) }); return Promise.resolve({}); };
    const T = NT.makeNativeConcept2BleTransport({ gateway: g, concept2Live: C2L, now: () => 1, setTimeoutFn: f => { f(); return 0; }, clearTimeoutFn: () => {} });
    await T.connect('rowerg', 'D1');
    const ctrl = sandbox.Concept2Programming.createProgrammingController({ write: b => T.writeControlFrame(b), now: () => 1, setTimeoutFn: () => 1, clearTimeoutFn: () => {} });
    ctrl.programFixedDistance(1000, T.getControlContext());
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    eq(writes.length, 1, 'F17: exact één write via de echte keten');
    eq(writes[0].chr, U('21').toLowerCase(), 'F18: write naar CE060021');
    eq(writes[0].svc, U('20').toLowerCase(), 'F19: op service CE060020');
    const f = writes[0].bytes; let be = false, le = false;
    for (let i = 0; i + 3 < f.length; i++) {
      if (f[i] === 0xE8 && f[i+1] === 0x03) be = true;
      if (f[i] === 0x00 && f[i+1] === 0x00 && f[i+2] === 0x03 && f[i+3] === 0xE8) le = true; }
    ok(be, 'F20: 1000 m LITTLE-endian uit de ECHTE browser-CSAFE-builder'); ok(!le, 'F21: geen oude big-endian volgorde');
    eq(ctrl.getState(), 'WAITING_RESPONSE', 'F22: WRITE_COMPLETED != CONFIRMED'); }
  console.log('Concept2 runtime firewall: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.log('EXCEPTIE: ' + e.message); process.exit(1); });
