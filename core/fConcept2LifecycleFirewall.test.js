/* Gate B.5 — LIFECYCLE FIREWALL.
 * Bewijst de bewezen root cause definitief weg: _c2pair is presentatie-state die bij
 * elke pairing/scan-refresh volledig wordt vervangen; _c2rt is de owner van de
 * BLE-connection runtime. De controller moet UI-rerenders overleven en juist WEL
 * verdwijnen bij disconnect, reconnect en device-wissel. */
const fs = require('fs'); const path = require('path');
const CSAFE = require(path.resolve('core/concept2Csafe.js'));
const PROG = require(path.resolve('core/concept2Programming.js'));
const C2L = require(path.resolve('core/concept2Live.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const html = fs.readFileSync(path.resolve('index.html'), 'utf8');

// ── statische ownership-invarianten ──────────────────────────────────────────
ok(/var _c2rt=\{\};/.test(html), 'L1: aparte runtime-owner _c2rt bestaat');
ok(/function _c2rtSet\(exId, generation, deviceId, prog, agg\)/.test(html), 'L2: _c2rtSet legt generation + device vast');
ok(/function _c2rtGet\(exId, generation, deviceId\)/.test(html), 'L3: _c2rtGet valideert generation + device');
ok(/function _c2rtTeardown\(exId, reason\)/.test(html), 'L4: expliciete teardown bestaat');
ok(/if\(typeof _c2rtTeardown==='function'\) _c2rtTeardown\(exId,'disconnect'\)/.test(html), 'L5: disconnect ruimt de runtime op');
ok(/if\(typeof _c2rtTeardown==='function'\) _c2rtTeardown\(exId,'reconnect'\)/.test(html), 'L6: (re)connect ruimt oude runtime eerst op');
ok(/if\(typeof _c2rtSet==='function'\) _c2rtSet\(exId, _ctx0\.generation, d\.id, st\._prog, st\._agg\)/.test(html), 'L7: runtime wordt in de owner vastgelegd bij connect');
ok(/unavailable:true/.test(html), 'L8: fail-closed pad bestaat');
ok(/const rt=\(typeof _c2rtGet==='function'\)\?_c2rtGet\(/.test(html), 'L9: startflow leest de runtime uit _c2rt, niet uit _c2pair');
ok(!/st\._prog\.programFixedDistance/.test(html), 'L10: startflow gebruikt NIET meer de vervangbare _c2pair-referentie');

// ── de echte _c2rt-functies uit index.html uitvoeren ─────────────────────────
const rtSrc = html.slice(html.indexOf('var _c2rt={};'), html.indexOf('function _c2rtTeardown') + html.slice(html.indexOf('function _c2rtTeardown')).indexOf('\n}\r\n') + 4);
const F = new Function(rtSrc + '\nreturn { set:_c2rtSet, get:_c2rtGet, down:_c2rtTeardown, map:function(){return _c2rt;} };')();

function mkProg() { return PROG.createProgrammingController({ csafe: CSAFE, write: () => Promise.resolve(), now: () => 1, setTimeoutFn: () => 1, clearTimeoutFn: () => {} }); }
function mkAgg() { return C2L.createPm5LiveAggregator(); }

// ── A. rerender vernietigt de runtime NIET ───────────────────────────────────
const prog1 = mkProg(), agg1 = mkAgg();
F.set('EX', 3, 'DEV-A', prog1, agg1);
agg1.push({ distanceM: 2000, elapsedTimeS: 10 }, 'rowerg', {});
let _c2pair = { EX: { connected: true, deviceId: 'DEV-A' } };
// simuleer tkErgPair(): volledige vervanging van de presentatie-state (de root cause)
_c2pair['EX'] = { cardioType: 'roeien', ergLabel: 'RowErg', mt: 'rowerg', devices: [], connected: false };
_c2pair['EX'].connected = true; _c2pair['EX'].deviceId = 'DEV-A';
let rt = F.get('EX', 3, 'DEV-A');
ok(!!rt, 'A1: runtime overleeft een volledige _c2pair-vervanging (pairing/scan refresh)');
eq(rt.prog, prog1, 'A2: exact dezelfde controller-instantie');
eq(rt.agg, agg1, 'A3: exact dezelfde aggregator-instantie');
eq(rt.generation, 3, 'A4: generation behouden');
eq(rt.agg.getMergedRaw().distance_m, 2000, 'A5: aggregator-state overleeft de rerender');
// nog twee rerenders
for (let i = 0; i < 2; i++) _c2pair['EX'] = { cardioType: 'roeien', devices: [], connected: true, deviceId: 'DEV-A' };
eq(F.get('EX', 3, 'DEV-A').prog, prog1, 'A6: ook na meerdere rerenders dezelfde controller');

// ── B. disconnect vernietigt hem WEL ─────────────────────────────────────────
F.down('EX', 'disconnect');
ok(!F.get('EX', 3, 'DEV-A'), 'B1: na disconnect is de runtime weg');
eq(prog1.getState(), 'IDLE', 'B2: controller is geannuleerd/teruggezet');
eq(agg1.getMergedRaw().distance_m, undefined, 'B3: aggregator is gereset');

// ── C. reconnect = nieuwe generation en nieuwe controller ────────────────────
const prog2 = mkProg(); F.set('EX', 4, 'DEV-A', prog2, mkAgg());
ok(F.get('EX', 4, 'DEV-A').prog === prog2, 'C1: reconnect levert de nieuwe controller');
ok(!F.get('EX', 3, 'DEV-A'), 'C2: oude generation wordt geweigerd');
ok(F.get('EX', 4, 'DEV-A').prog !== prog1, 'C3: niet de oude controller-instantie');

// ── D. ander PM5 mag de runtime niet hergebruiken ───────────────────────────
ok(!F.get('EX', 4, 'DEV-B'), 'D1: ander device krijgt de runtime niet');
F.set('EX', 5, 'DEV-B', mkProg(), mkAgg());
ok(!F.get('EX', 5, 'DEV-A'), 'D2: na device-wissel is de oude device-runtime weg');

// ── E. stale response van de oude controller bevestigt de nieuwe niet ───────
async function run() {
  const t = mkProg();
  F.set('EX2', 9, 'DEV-A', t, mkAgg());
  t.programFixedDistance(1000, { connected: true, generation: 9, deviceId: 'DEV-A' });
  await Promise.resolve(); await Promise.resolve();
  const okFrame = (() => { const c = [0x01]; return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]); })();
  const r = t.handleControlResponse(okFrame, { connected: true, generation: 10, deviceId: 'DEV-A' });
  eq(r.reason, 'stale_generation', 'E1: respons uit oude generation bevestigt niet');
  ok(t.getState() !== 'CONFIRMED', 'E2: controller blijft onbevestigd');

  // ── F. fail-closed helper: PM5 verbonden, geen runtime -> unavailable ──────
  const hsrc = html.match(/async function tkErgProgramPm5IfNeeded[\s\S]*?\n\}\r?\n/)[0];
  const mkHelper = (pairSt, rtGet) => new Function('_c2pair', 'tkDeviceTransport', '_c2rtGet',
    hsrc + '\nreturn tkErgProgramPm5IfNeeded;')({ EX: pairSt }, () => ({ getControlContext: () => ({ connected: true, generation: 3, deviceId: 'DEV-A' }) }), rtGet);
  let h = mkHelper({ connected: true, deviceId: 'DEV-A' }, () => null);
  let res = await h('EX', 'distance', 1000);
  eq(res.attempted, true, 'F1: PM5 verbonden -> programmering is van toepassing');
  eq(res.unavailable, true, 'F2: ontbrekende runtime -> UNAVAILABLE, geen stille doorval');
  eq(res.confirmed, false, 'F3: niet bevestigd');
  eq(res.state, 'UNAVAILABLE', 'F4: expliciete state');
  ok(/kon niet op de PM5 worden ingesteld/.test(res.message), 'F5: expliciete gebruikersmelding');
  h = mkHelper({ connected: false }, () => null);
  eq((await h('EX', 'distance', 1000)).attempted, false, 'F6: geen PM5 -> bestaande flow, geen blokkade');
  h = mkHelper({ connected: true, deviceId: 'DEV-A' }, () => null);
  eq((await h('EX', 'time', 600)).attempted, false, 'F7: tijddoel -> bestaande flow');
  // met runtime loopt het normaal door
  const pg = mkProg();
  h = mkHelper({ connected: true, deviceId: 'DEV-A' }, () => ({ prog: pg }));
  const p = h('EX', 'distance', 1000);
  await Promise.resolve(); await Promise.resolve();
  eq(pg.getDiagnostics().requestedDistanceM, 1000, 'F8: met runtime gaat 1000 m naar de echte controller');
  pg.cancel('test'); await p;
  console.log('Concept2 lifecycle firewall: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.log('EXCEPTIE: ' + e.message); process.exit(1); });
