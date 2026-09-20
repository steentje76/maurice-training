/* Gate A.4 — production wiring closure.
 * Begint bij een synthetische CE060080 BLE-notificatie en loopt de volledige
 * productie-equivalente keten door:
 *   CE060080 -> nativeConcept2BleTransport -> multiplex router -> 0x31/0x32 decoder
 *   -> subscribeMetrics -> Concept2Live aggregator (zelfde API als index.html)
 *   -> normalizeLiveMetric -> st.lastCm-equivalent
 * Geen mock van decoder-output. */
const path = require('path');
const C = require(path.resolve('core/concept2Live.js'));
let p = 0, f = 0;
function ok(c, m) { if (c) { p++; } else { f++; console.log('MISLUKT: ' + m); } }
function eq(a, b, m) { ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')'); }

const P31 = [0x31, 0x39,0x30,0x00, 0x20,0x4E,0x00, 2, 1, 0, 1, 2, 0xE8,0x03,0x00, 0x00,0x00,0x00, 0x80, 120];
const P32 = [0x32, 0x39,0x30,0x00, 0x94,0x11, 28, 255, 0xF8,0x2A, 0xF8,0x2A, 0x00,0x00, 0x00,0x00,0x00, 0xFA,0x00, 0];
function p32For(code) { const a = P32.slice(); a[19] = code; return a; }

// ── echte transportlaag via de canonieke factory, met een gateway-dubbel ─────
const NT = require(path.resolve('native/src/nativeConcept2BleTransport.js'));
const U = s => 'CE0600' + s + '-43E5-11E4-916C-0800200C9A66';
function makeChain(machineHint) {
  const subs = {};
  const gateway = {
    isAvailable: () => Promise.resolve({ available: true }),
    getPermissionState: () => Promise.resolve({ state: 'granted' }),
    requestPermissions: () => Promise.resolve({ state: 'granted' }),
    connect: () => Promise.resolve({ connected: true }),
    disconnect: () => Promise.resolve({}),
    getServices: () => Promise.resolve({ services: [
      { uuid: U('20').toLowerCase(), characteristics: [{ uuid: U('22').toLowerCase(), properties: { notify: true } }] },
      { uuid: U('30').toLowerCase(), characteristics: [{ uuid: U('80').toLowerCase(), properties: { notify: true } }] }
    ] }),
    startNotifications: (id, s, c, cb) => { subs[String(c).toLowerCase()] = cb; return Promise.resolve({}); },
    stopNotifications: () => Promise.resolve({}),
    startScan: () => Promise.resolve({}), stopScan: () => Promise.resolve({})
  };
  const T = NT.makeNativeConcept2BleTransport({
    gateway: gateway, concept2Live: C,
    now: () => 1000, setTimeoutFn: (fn) => { fn(); return 0; }, clearTimeoutFn: () => {}
  });
  // productie-equivalente sessiestaat (spiegelt index.html rond regel 6934-6952)
  const st = { mt: machineHint, lastCm: null, _agg: C.createPm5LiveAggregator() };
  return {
    T, st,
    connect: () => Promise.resolve(T.connect(machineHint || 'rowerg', 'AA:BB:CC:11:22:33')).then(() => {
      T.subscribeMetrics(function (evt) {
        const cm = (evt && evt.metrics && evt.metrics.schema) ? evt.metrics
                 : (st._agg ? st._agg.push((evt && evt.metrics) || evt || {}, st.mt, {}) : null);
        if (!cm) return; st.lastCm = cm;
      });
    }),
    emit: (bytes) => { const cb = subs[U('80').toLowerCase()]; if (cb) cb(new DataView(new Uint8Array(bytes).buffer)); },
    disconnect: () => { st.lastCm = null; if (st._agg) st._agg.reset(); }
  };
}

function run() {
  // A) echte keten 0x31 -> 0x32
  const a = makeChain('rowerg');
  return a.connect().then(() => {
    a.emit(P31); a.emit(P32);
    const cm = a.st.lastCm;
    ok(!!cm, 'A0: st.lastCm gevuld via de echte keten');
    eq(cm.distanceM, 2000, 'A1: distanceM = 2000.0');
    eq(cm.elapsedTimeS, 123.45, 'A2: elapsedTimeS = 123.45');
    eq(cm.strokeRateSPM, 28, 'A3: strokeRateSPM = 28');
    eq(cm.pace500M, 110, 'A4: pace500M = 110.00');
    eq(cm.watts, 250, 'A5: watts = 250');
    eq(cm.wattsSource, 'concept2_measured', 'A6: wattsSource = concept2_measured');
    eq(cm.workoutState, 0, 'A7: workoutState = 0 (geen truthiness-regressie)');
    eq(cm.machineType, 'rowerg', 'A8: machineType rowerg');
    // B) omgekeerde volgorde
    const b = makeChain('rowerg');
    return b.connect().then(() => {
      b.emit(P32); b.emit(P31);
      const c2 = b.st.lastCm;
      eq(c2.distanceM, 2000, 'B1: 0x32->0x31 distance behouden');
      eq(c2.watts, 250, 'B2: 0x32->0x31 watts behouden');
      eq(c2.strokeRateSPM, 28, 'B3: 0x32->0x31 SPM behouden');
      eq(c2.pace500M, 110, 'B4: 0x32->0x31 pace behouden');
      eq(c2.elapsedTimeS, 123.45, 'B5: 0x32->0x31 elapsed behouden');
      // C) malformed / unknown wissen niets
      b.emit([0x31, 1, 2]);
      eq(b.st.lastCm.distanceM, 2000, 'C1: truncated packet wist state niet');
      eq(b.st.lastCm.watts, 250, 'C2: truncated packet wist watts niet');
      b.emit([0x99, 1, 2, 3]);
      eq(b.st.lastCm.distanceM, 2000, 'C3: unknown identifier wist state niet');
      b.emit([]);
      eq(b.st.lastCm.watts, 250, 'C4: leeg packet wist state niet');
      // D) sessie-isolatie via de productie-lifecycle
      const s = makeChain('rowerg');
      return s.connect().then(() => {
        s.emit(P31);
        eq(s.st.lastCm.distanceM, 2000, 'D1: sessie A distance 2000');
        s.disconnect();
        eq(s.st.lastCm, null, 'D2: disconnect wist lastCm');
        s.emit(P32);
        eq(s.st.lastCm.watts, 250, 'D3: sessie B ziet eigen watts');
        eq(s.st.lastCm.distanceM, null, 'D4: sessie B ziet GEEN distance uit sessie A');
        // E) drie machinetypes door dezelfde keten
        const specs = [['rowerg', 0, 500], ['skierg', 128, 500], ['bikeerg', 192, 1000]];
        return specs.reduce((chain, sp) => chain.then(() => {
          const m = makeChain(null);
          return m.connect().then(() => {
            m.emit(P31); m.emit(p32For(sp[1]));
            const r = m.st.lastCm;
            eq(r.machineType, sp[0], 'E: ' + sp[0] + ' uit ergMachineType ' + sp[1]);
            eq(r.paceBasisM, sp[2], 'E: ' + sp[0] + ' paceBasis ' + sp[2]);
            eq(r.pace500M, 110, 'E: ' + sp[0] + ' pace500 blijft protocolwaarde');
            eq(r.distanceM, 2000, 'E: ' + sp[0] + ' distance coherent');
            eq(r.watts, 250, 'E: ' + sp[0] + ' watts coherent');
          });
        }), Promise.resolve());
      });
    });
  });
}
run().then(() => {
  console.log('Concept2 PM5 production wiring: ' + p + ' geslaagd, ' + f + ' mislukt');
  process.exit(f ? 1 : 0);
}).catch(e => { console.log('EXCEPTIE: ' + e.message); process.exit(1); });
