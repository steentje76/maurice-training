/* MS-TELEMETRY-01 closure — consent + retentie.
 *  C  consent via het BESTAANDE TK-mechanisme (Privacy-scherm, initSwitch, localStorage, PERSONAL_CACHE_KEYS):
 *     default UIT, opt-in -> verzonden, intrekken -> volgende event direct niet meer verzonden,
 *     nieuwe gebruiker op gedeeld toestel erft geen toestemming;
 *  R  90 dagen retentie: scheduled cleanup (netlify.toml @daily), één gefilterde DELETE op exact
 *     product_telemetry_events, strikte expiry-boundary (created_at < nu-90d), fail-safe;
 *  X  sabotage. Echte functies uit index.html / netlify/functions, geen spiegelimplementaties. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TOML = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
const CLEAN_PATH = path.join(ROOT, 'netlify/functions/cleanup-product-telemetry.js');
const CLEAN_SRC = fs.readFileSync(CLEAN_PATH, 'utf8');
const PTC = require(path.join(ROOT, 'core/productTelemetry.js'));
let pass = 0, fail = 0, finished = false, mute = false;
process.on('exit', c => { if (!finished && c === 0) { console.log('MISLUKT: test eindigde zonder samenvatting'); process.exitCode = 1; } });
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');

function fnSrc(html, name) { let s = html.indexOf('function ' + name + '('); if (s < 0) return null; let d = 0; const b = html.indexOf('{', html.indexOf(')', s));
  for (let k = b; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (d === 0) return html.slice(s, k + 1); } } return null; }
function arraySrc(html, decl) { const s = html.indexOf(decl); if (s < 0) return null; const e = html.indexOf('];', s); return html.slice(s, e + 2); }
function emitterSrc(html) { const a = html.indexOf('var TK_PRODUCT_TELEMETRY_CONSENT_KEY='); const e = html.indexOf('</script>', a); return a > 0 && e > a ? html.slice(a, e) : null; }

// ── C. device-sandbox: echte emitter + initSwitch + refreshPrivacyScreen + PERSONAL_CACHE_KEYS/wipePersonalCache ──
function device(html) {
  const store = {}; const calls = []; const els = {};
  const ls = { getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const lsProxy = new Proxy(ls, { ownKeys: () => Object.keys(store), getOwnPropertyDescriptor: (t, k) => (k in ls ? { value: ls[k], enumerable: false, configurable: true } : (Object.prototype.hasOwnProperty.call(store, k) ? { value: store[k], enumerable: true, configurable: true } : undefined)) });
  function el(id) { if (!els[id]) { const attrs = {}; els[id] = { id, setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: k => (k in attrs ? attrs[k] : null), onclick: null }; } return els[id]; }
  const env = {
    window: { ProductTelemetryCore: PTC }, localStorage: lsProxy, location: { hostname: 'maurice-art.netlify.app' }, APP_VER: 'v4.70.6',
    SB_H: { Authorization: 'Bearer user-jwt' }, document: { getElementById: id => el(id) },
    fetch: (u, init) => { calls.push({ u, init }); return Promise.resolve({ ok: true }); }
  };
  const src = emitterSrc(html) + '\n' + fnSrc(html, 'initSwitch') + '\n' + fnSrc(html, 'refreshPrivacyScreen') + '\n' +
    'const CACHE_OWNER_KEY=\'tk_cache_owner_uid\';\n' + arraySrc(html, 'const PERSONAL_CACHE_KEYS=[') + '\n' + fnSrc(html, 'wipePersonalCache') +
    '\nreturn {tkProductTelemetry, refreshPrivacyScreen, wipePersonalCache, PERSONAL_CACHE_KEYS};';
  const api = new Function(...Object.keys(env), src)(...Object.values(env));
  return { api, store, calls, el, send: () => api.tkProductTelemetry('training.opened', { route_id: 's-train-mgr' }) };
}
function suiteConsent(html) {
  const R = {};
  const d = device(html);
  d.api.refreshPrivacyScreen();
  const sw = d.el('sw-product-telemetry');
  R.defaultAria = sw.getAttribute('aria-checked');
  R.defaultSent = (d.send(), d.calls.length);
  R.defaultStored = d.store.tk_product_telemetry_consent === undefined ? null : d.store.tk_product_telemetry_consent;
  sw.onclick();                                   // opt-in
  R.optAria = sw.getAttribute('aria-checked'); R.optStored = d.store.tk_product_telemetry_consent;
  d.send(); R.optSent = d.calls.length;
  sw.onclick();                                   // intrekken
  R.wdAria = sw.getAttribute('aria-checked'); R.wdStored = d.store.tk_product_telemetry_consent;
  d.send(); d.send(); R.wdSent = d.calls.length;  // direct gestopt
  const ai = d.el('sw-ai-consent'); R.aiUntouched = ai.getAttribute('aria-checked') === 'false' && d.store.tk_ai_consent === undefined;
  // gedeeld toestel: nieuwe eigenaar erft geen toestemming
  const d2 = device(html); d2.store.tk_product_telemetry_consent = '1';
  d2.api.wipePersonalCache(); R.afterWipe = d2.store.tk_product_telemetry_consent === undefined ? null : d2.store.tk_product_telemetry_consent;
  d2.send(); R.afterWipeSent = d2.calls.length;
  R.inKeys = d2.api.PERSONAL_CACHE_KEYS.indexOf('tk_product_telemetry_consent') !== -1;
  const d3 = device(html); d3.store.tk_product_telemetry_consent = 'true'; d3.send(); R.nonCanonical = d3.calls.length; // alleen exact '1' telt
  return R;
}

// ── R. cleanup in-process met gestubde fetch ──
function loadCleanup(src) { const m = { exports: {} }; new Function('module', 'exports', 'require', 'process', src)(m, m.exports, require, { env: {} }); return m.exports; }
async function suiteRetention(src) {
  const C = loadCleanup(src)._internal; const R = {};
  const NOW = Date.UTC(2026, 8, 29, 3, 0, 0, 0), DAY = 86400000;
  R.days = C.RETENTION_DAYS; R.table = C.TABLE;
  R.cutoff = C.retentionCutoffIso(NOW);
  const calls = []; const f = (u, i) => { calls.push({ u, i }); return Promise.resolve({ ok: true, status: 204 }); };
  R.ok = await C.runCleanup({ env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' }, fetch: f, now: () => NOW });
  R.calls = calls;
  // boundary: pas het echte filter (PostgREST lt) toe op rijen rond de grens
  const q = calls[0] ? decodeURIComponent(calls[0].u.split('?')[1]) : '';
  const m = q.match(/^created_at=(lt|lte|gt|gte|eq)\.(.+)$/); R.op = m ? m[1] : null; R.filterTs = m ? m[2] : null;
  const rows = { olderBy1ms: NOW - 90 * DAY - 1, exact90d: NOW - 90 * DAY, youngerBy1ms: NOW - 90 * DAY + 1, day89: NOW - 89 * DAY, day91: NOW - 91 * DAY };
  const cmp = { lt: (a, b) => a < b, lte: (a, b) => a <= b, gt: (a, b) => a > b, gte: (a, b) => a >= b, eq: (a, b) => a === b };
  R.deleted = {}; Object.keys(rows).forEach(k => { R.deleted[k] = !!(m && cmp[m[1]](new Date(rows[k]).toISOString(), m[2])); });
  const c2 = []; R.noKey = await C.runCleanup({ env: { SUPABASE_URL: 'https://x.supabase.co' }, fetch: (u, i) => { c2.push(u); return Promise.resolve({ ok: true }); }, now: () => NOW }); R.noKeyCalls = c2.length;
  let threw = false; try { R.throws = await C.runCleanup({ env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' }, fetch: () => { throw new Error('net'); }, now: () => NOW }); } catch (_) { threw = true; } R.threw = threw;
  R.notOk = await C.runCleanup({ env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' }, fetch: () => Promise.resolve({ ok: false, status: 401 }), now: () => NOW });
  let badUrl = false; try { C.buildDeleteUrl('http://evil', R.cutoff); } catch (_) { badUrl = true; } R.badUrl = badUrl;
  let badCut = false; try { C.buildDeleteUrl('https://x.supabase.co', 'x'); } catch (_) { badCut = true; } R.badCut = badCut;
  return R;
}

function assertAll(html, src, toml, C, R, L) {
  L = L || '';
  eq(C.defaultAria, 'false', L + 'C1: switch staat standaard UIT');
  eq(C.defaultSent, 0, L + 'C2: zonder keuze niets verstuurd (default-off)');
  eq(C.defaultStored, null, L + 'C3: openen van Privacy schrijft geen toestemming');
  ok(C.optAria === 'true' && C.optStored === '1', L + 'C4: opt-in via de switch persisteert "1"');
  eq(C.optSent, 1, L + 'C5: na opt-in exact één event verstuurd');
  ok(C.wdAria === 'false' && C.wdStored === '0', L + 'C6: intrekken persisteert "0"');
  eq(C.wdSent, 1, L + 'C7: na intrekken worden nieuwe events direct niet meer verstuurd');
  ok(C.aiUntouched, L + 'C8: AI-consent blijft los (geen gedeelde vlag)');
  ok(C.inKeys && C.afterWipe === null && C.afterWipeSent === 0, L + 'C9: nieuwe gebruiker op gedeeld toestel erft geen toestemming (PERSONAL_CACHE_KEYS)');
  eq(C.nonCanonical, 0, L + 'C10: alleen exact "1" geldt als toestemming');
  ok(/id="s-privacy"[\s\S]*id="sw-product-telemetry" aria-checked="false"[\s\S]*Derde partijen/.test(html), L + 'C11: switch staat in het bestaande Privacy-scherm, markup default false');
  ok(/90 dagen automatisch verwijderd/.test(html) && /geen externe analysedienst/.test(html), L + 'C12: privacytekst noemt retentie en first-party verwerking');
  ok((html.match(/tk_product_telemetry_consent/g) || []).length >= 2 && !/research_consents[^\n]*product/i.test(html), L + 'C13: geen tweede consent-systeem (niet via research_consents)');
  eq(R.days, 90, L + 'R1: retentie 90 dagen');
  eq(R.table, 'product_telemetry_events', L + 'R2: uitsluitend product_telemetry_events');
  eq(R.cutoff, '2026-07-01T03:00:00.000Z', L + 'R3: cutoff = nu - 90 dagen (UTC)');
  eq(R.ok.statusCode, 200, L + 'R4: succesvolle cleanup');
  eq(R.calls.length, 1, L + 'R5: precies één request');
  ok(R.calls[0] && R.calls[0].i.method === 'DELETE' && /\/rest\/v1\/product_telemetry_events\?created_at=lt\./.test(R.calls[0].u), L + 'R6: één gefilterde DELETE op exact deze tabel');
  ok(R.calls[0] && R.calls[0].i.headers.Prefer === 'return=minimal', L + 'R7: geen rijen teruggelezen (return=minimal)');
  eq(R.op, 'lt', L + 'R8: strikt ouder dan (lt), niet lte');
  ok(R.deleted.olderBy1ms && R.deleted.day91, L + 'R9: ouder dan 90 dagen wordt verwijderd');
  ok(!R.deleted.exact90d && !R.deleted.youngerBy1ms && !R.deleted.day89, L + 'R10: exact 90 dagen en jonger blijft bewaard (expiry-boundary)');
  ok(R.noKey.statusCode === 500 && R.noKeyCalls === 0, L + 'R11: zonder service key niets uitgevoerd');
  ok(!R.threw && R.throws.statusCode === 500, L + 'R12: netwerkfout -> foutstatus, geen throw');
  eq(R.notOk.statusCode, 500, L + 'R13: afgewezen DELETE -> foutstatus');
  ok(R.badUrl && R.badCut, L + 'R14: ongeldige URL/cutoff -> geen request');
  ok(/\[functions\."cleanup-product-telemetry"\]\s*\n\s*schedule = "@daily"/.test(toml), L + 'R15: dagelijks gepland (netlify.toml)');
  ok(!/client_telemetry_events|sessions|research_consents/.test(src.replace(/\/\/[^\n]*/g, '')), L + 'R16: cleanup raakt geen andere tabellen');
}

(async function run() {
  const C = suiteConsent(HTML), R = await suiteRetention(CLEAN_SRC);
  assertAll(HTML, CLEAN_SRC, TOML, C, R, '');
  const sab = [
    ['switch default aan', { html: h => h.replace("initSwitch('sw-product-telemetry',TK_PRODUCT_TELEMETRY_CONSENT_KEY,false);", "initSwitch('sw-product-telemetry',TK_PRODUCT_TELEMETRY_CONSENT_KEY,true);") }],
    ['consent-check in emitter weg', { html: h => h.replace('if(!tkProductTelemetryConsent())return false;', '') }],
    ['niet meer per gebruiker gewist', { html: h => h.replace("  'tk_product_telemetry_consent', // MS-TELEMETRY-01", '  // MS-TELEMETRY-01') }],
    ['retentie 30 dagen', { src: s => s.replace('const RETENTION_DAYS = 90;', 'const RETENTION_DAYS = 30;') }],
    ['boundary lte', { src: s => s.replace("'?created_at=lt.'", "'?created_at=lte.'") }],
    ['ongefilterde DELETE', { src: s => s.replace("'?created_at=lt.' + encodeURIComponent(cutoffIso)", "''") }],
    ['schedule weg', { toml: t => t.replace('[functions."cleanup-product-telemetry"]\n  schedule = "@daily"\n', '') }]
  ];
  for (const [name, m] of sab) {
    const h2 = m.html ? m.html(HTML) : HTML, s2 = m.src ? m.src(CLEAN_SRC) : CLEAN_SRC, t2 = m.toml ? m.toml(TOML) : TOML;
    if (h2 === HTML && s2 === CLEAN_SRC && t2 === TOML) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
    const pp = pass, ff = fail; let caught = false;
    try { mute = true; assertAll(h2, s2, t2, suiteConsent(h2), await suiteRetention(s2), '[sab] '); caught = fail > ff; }
    catch (e) { caught = false; } finally { mute = false; pass = pp; fail = ff; }
    if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
    ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
  }
  finished = true;
  console.log('\n[ProductTelemetryConsentRetention] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('MISLUKT: exception ' + (e && e.stack)); process.exit(1); });
