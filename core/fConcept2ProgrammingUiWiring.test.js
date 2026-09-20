/* Gate B.4 — de ECHTE UI-productiecode: helper tkErgProgramPm5IfNeeded en de
 * controller-lifecycle uit index.html worden letterlijk uit het bestand gehaald en
 * uitgevoerd. Geen nagemaakte handler. */
const fs = require('fs'); const path = require('path');
const CSAFE = require(path.resolve('core/concept2Csafe.js'));
const PROG = require(path.resolve('core/concept2Programming.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const html = fs.readFileSync(path.resolve('index.html'), 'utf8');

// ── de echte helper uit index.html laden ─────────────────────────────────────
const src = html.match(/async function tkErgProgramPm5IfNeeded[\s\S]*?\n\}\r?\n/);
ok(!!src, 'W0: helper tkErgProgramPm5IfNeeded staat in index.html');
function loadHelper(env) {
  const names = Object.keys(env);
  return new Function(...names, src[0] + '\nreturn tkErgProgramPm5IfNeeded;')(...names.map(n => env[n]));
}
// ── statische invarianten op de productiecode ────────────────────────────────
ok(/st\._prog=Concept2Programming\.createProgrammingController\(/.test(html), 'W1: controller per verbinding aangemaakt');
ok(/write:function\(b\)\{ return t\.writeControlFrame\(b\); \}/.test(html), 'W2: write gaat via transport.writeControlFrame');
ok(/t\.setControlResponseHandler\(function\(bytes,ctx\)\{ if\(st\._prog\) st\._prog\.handleControlResponse\(bytes,ctx\); \}\)/.test(html), 'W3: CE060022 routing naar de controller');
ok(/st\._prog\.cancel\('disconnect'\)/.test(html), 'W4: disconnect annuleert de pending operatie');
ok(/t\.setControlResponseHandler\(null\)/.test(html), 'W5: response-handler geneutraliseerd bij disconnect');
ok(/if\(progRes&&progRes\.attempted&&!progRes\.confirmed\)\{/.test(html), 'W6: vastleggen stopt wanneer programmering niet bevestigd is');
ok(/const progRes=\(typeof tkErgProgramPm5IfNeeded==='function'\)\?await tkErgProgramPm5IfNeeded\(exId,st\.type,Math\.round\(waarde\)\):null;/.test(html), 'W7: start-handler roept de helper aan (defensief: zonder helper blijft de bestaande flow werken)');
const startFn = html.slice(html.indexOf('async function tkErgStartProtocol('), html.indexOf('async function tkErgStartProtocol(') + 2600);
ok(startFn.indexOf('progRes') < startFn.indexOf('_ergProtocol[exId]={type:st.type'), 'W8: programmering gebeurt VOOR het vastleggen');
ok(!/parseResponseFrame|checksum\(|0xF1|stuff\(/.test(startFn), 'W9: geen CSAFE-logica of bytes in de UI-handler');

function env(opts) {
  opts = opts || {};
  const writes = []; let timerFn = null;
  const controller = PROG.createProgrammingController({
    csafe: CSAFE,
    write: (b) => { writes.push(b.slice()); return opts.writeRejects ? Promise.reject(new Error('gatt')) : Promise.resolve(); },
    now: () => 1000, setTimeoutFn: (fn) => { timerFn = fn; return 1; }, clearTimeoutFn: () => { timerFn = null; },
    timeoutMs: 5000
  });
  const st = { connected: opts.connected !== false, _prog: opts.noProg ? null : controller };
  return {
    writes, controller, st,
    fireTimeout: () => { if (timerFn) timerFn(); },
    helper: loadHelper({
      _c2pair: { EX: st },
      tkDeviceTransport: () => ({ getControlContext: () => ({ connected: true, deviceId: 'D1', generation: 3 }) })
    })
  };
}
function resp(status) { const c = [status]; return [CSAFE.FLAG.STANDARD_START].concat(CSAFE.stuff(c.concat([CSAFE.checksum(c)]))).concat([CSAFE.FLAG.STOP]); }
const OK_F = resp(0x01), REJECT_F = resp(0x11), BAD_F = resp(0x21);
const CTX = { connected: true, deviceId: 'D1', generation: 3 };

async function run() {
  { // 1000 m via de ECHTE helper
    const e = env(); const p = e.helper('EX', 'distance', 1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    eq(e.writes.length, 1, 'E2E: exact één write via de echte helper');
    eq(e.controller.getState(), PROG.STATE.WAITING_RESPONSE, 'E2E: wacht op CE060022');
    const f = e.writes[0];
    let be = false, le = false;
    for (let i = 0; i + 3 < f.length; i++) {
      if (f[i] === 0 && f[i+1] === 0 && f[i+2] === 0x03 && f[i+3] === 0xE8) be = true;
      if (f[i] === 0xE8 && f[i+1] === 0x03 && f[i+2] === 0 && f[i+3] === 0) le = true;
    }
    ok(be, 'E2E: 1000 m BIG-ENDIAN (00 00 03 E8)'); ok(!le, 'E2E: geen little-endian');
    e.controller.handleControlResponse(OK_F, CTX);
    const r = await p;
    eq(r.attempted, true, 'E2E: attempted'); eq(r.confirmed, true, 'E2E: CONFIRMED -> vastleggen mag door');
  }
  for (const [fr, lbl] of [[REJECT_F, 'REJECT'], [BAD_F, 'BAD']]) {
    const e = env(); const p = e.helper('EX', 'distance', 1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    e.controller.handleControlResponse(fr, CTX);
    const r = await p;
    eq(r.confirmed, false, 'NEG: ' + lbl + ' -> niet bevestigd');
    ok(String(r.message).indexOf('kon niet op de PM5') > 0, 'NEG: ' + lbl + ' levert gebruikersmelding');
  }
  { const e = env(); const p = e.helper('EX', 'distance', 1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    e.fireTimeout(); const r = await p;
    eq(r.state, 'TIMEOUT', 'NEG: geen response -> TIMEOUT'); eq(r.confirmed, false, 'NEG: timeout niet bevestigd'); }
  { const e = env(); const p = e.helper('EX', 'distance', 1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    e.controller.cancel('disconnect'); const r = await p;
    eq(r.state, 'CANCELLED', 'NEG: disconnect -> CANCELLED'); eq(r.confirmed, false, 'NEG: disconnect niet bevestigd');
    ok(e.controller.handleControlResponse(OK_F, CTX).handled === false, 'NEG: late OK bevestigt niet'); }
  { const e = env(); const p = e.helper('EX', 'distance', 1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    const r1 = e.controller.handleControlResponse(OK_F, { connected: true, deviceId: 'D1', generation: 99 });
    eq(r1.reason, 'stale_generation', 'ISO: oude generation genegeerd');
    e.fireTimeout(); const r = await p; eq(r.confirmed, false, 'ISO: stale response bevestigt niet'); }
  { const e = env({ writeRejects: true }); const r = await e.helper('EX', 'distance', 1000);
    eq(r.confirmed, false, 'NEG: gefaalde write niet bevestigd'); }
  { const e = env(); const a = e.helper('EX', 'distance', 1000), b = e.helper('EX', 'distance', 1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    eq(e.writes.length, 1, 'DUBBELTAP: exact één write');
    const rb = await b; eq(rb.confirmed, false, 'DUBBELTAP: tweede tik niet bevestigd');
    e.controller.handleControlResponse(OK_F, CTX);
    const ra = await a; eq(ra.confirmed, true, 'DUBBELTAP: eerste bevestigt'); eq(e.writes.length, 1, 'DUBBELTAP: nog één write'); }
  { // manual / non-PM5 regressie
    const e1 = env(); eq((await e1.helper('EX', 'time', 600)).attempted, false, 'MANUAL: tijddoel wordt niet geprogrammeerd');
    eq(e1.writes.length, 0, 'MANUAL: nul writes bij tijddoel');
    const e2 = env({ connected: false }); eq((await e2.helper('EX', 'distance', 1000)).attempted, false, 'MANUAL: geen PM5 verbonden -> geen poging');
    eq(e2.writes.length, 0, 'MANUAL: nul writes zonder PM5');
    const e3 = env({ noProg: true }); eq((await e3.helper('EX', 'distance', 1000)).attempted, false, 'MANUAL: geen controller -> bestaande flow'); }
  { // Developer Mode leest uit de ECHTE controller
    const e = env(); const p = e.helper('EX', 'distance', 1000);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    let d = e.controller.getDiagnostics();
    eq(d.requestedDistanceM, 1000, 'DEV: aangevraagde afstand'); eq(d.state, 'WAITING_RESPONSE', 'DEV: state');
    eq(d.writeAttempted, 1, 'DEV: write attempted'); eq(d.writeCompleted, 1, 'DEV: write completed');
    e.controller.handleControlResponse(OK_F, CTX); await p;
    d = e.controller.getDiagnostics();
    eq(d.state, 'CONFIRMED', 'DEV: eindstate'); eq(d.previousFrameStatus, 'ok', 'DEV: Previous Frame Status');
    ok(d.responsesSeen >= 1, 'DEV: responses seen geteld'); }
  console.log('Concept2 programming UI wiring: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
}
run().catch(e => { console.log('EXCEPTIE: ' + e.message); process.exit(1); });
