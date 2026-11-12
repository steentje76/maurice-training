'use strict';
// TK504/#614 -- PARTIAL batch-of-25 mode for the read-only byte-SHA verifier.
// Offline only: uses the real pinned 452-entry manifest for SELECTION, and in-process
// stub fetches (404 / forbidden) for the run path. No real network, no media bytes,
// no credentials (only an obviously synthetic key), no full 452-object run.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const V = require('../tools/tk504_private_storage_byte_sha_verify.cjs');

let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const throwsCode = (fn, code, m) => { assert.throws(fn, e => e.code === code, m || code); checks++; };
// Synthetic credentials ONLY: fake publishable key + unsigned well-formed JWT from hardcoded fake claims.
const FAKE_PUBLISHABLE = 'sb_publishable_synthetic_only_000000000000';
const FAKE_SECRET = 'sb_secret_synthetic_only_000000000000';
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeJwt = (patch = {}) => {
  const c = { iss: V.AUTH_ISSUER, sub: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
    is_anonymous: false, iat: 1700000000, exp: 4102444800, ...patch };
  for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  return b64u({ alg: 'HS256', typ: 'JWT' }) + '.' + b64u(c) + '.' + Buffer.from('synthetic-signature-not-real').toString('base64url');
};
const FAKE_JWT = fakeJwt();
const CREDS = Object.freeze({ [V.API_KEY_ENV]: FAKE_PUBLISHABLE, [V.AUDITOR_JWT_ENV]: FAKE_JWT });
const leaks = s => s.includes(FAKE_JWT) || s.includes(FAKE_PUBLISHABLE) || s.includes(FAKE_SECRET);
const cid = n => 'TK-' + String(n).padStart(6, '0');
const clone = o => JSON.parse(JSON.stringify(o));

const { manifest } = V.loadManifestFile();
eq(V.productionManifestProblems(manifest), [], 'real manifest valid');

function forbidFetch() { const f = async () => { f.calls++; throw new Error('TEST_FORBIDS_NETWORK'); }; f.calls = 0; return f; }
function stub404() {
  const f = async (url, init) => {
    f.calls++; f.urls.push(url);
    assert.equal(init.method, 'GET');
    assert.ok(url.startsWith(V.ORIGIN + V.OBJECT_PREFIX), 'only canonical target');
    // Header separation: publishable key in apikey only, auditor JWT in Authorization only.
    assert.equal(init.headers.apikey, FAKE_PUBLISHABLE);
    assert.equal(init.headers.Authorization, 'Bearer ' + FAKE_JWT);
    assert.notEqual(init.headers.apikey, FAKE_JWT);
    f.headerChecks++;
    return { status: 404, type: 'basic', url, redirected: false, body: null, bodyUsed: false, headers: new Headers() };
  };
  f.calls = 0; f.urls = []; f.headerChecks = 0; return f;
}
function envSpy(values = {}) {
  const spy = { reads: 0 };
  spy.env = new Proxy(values, { get(t, k) { spy.reads++; return t[k]; } });
  return spy;
}
async function runCli(argv, { env = {}, fetchImpl = forbidFetch() } = {}) {
  const o = [], e = [];
  const code = await V.run(argv, { env, fetchImpl, out: s => o.push(s), err: s => e.push(s) });
  return { code, out: o.join('\n'), err: e.join('\n'), fetchImpl };
}
const SIGNED_GATE = s => s.mode === 'live' && s.checked === 452 && s.pass === 452; // unchanged attestation gate shape

(async () => {
  // 1. parseArgs: valid batches; full --live opts unchanged (no batch key).
  eq(V.parseArgs(['--live', '--batch-start-id', 'TK-000001', '--batch-size', '25']).batch, { startId: 'TK-000001', size: 25 });
  eq(V.parseArgs(['--live', '--batch-size', '1', '--batch-start-id', 'TK-000226']).batch, { startId: 'TK-000226', size: 1 });
  eq(V.parseArgs(['--live']), { mode: 'live', concurrency: 2, timeoutMs: 300000, idleMs: 30000, reportOut: null }, 'full opts unchanged');
  eq(V.parseArgs([]), { mode: 'check', concurrency: 2, timeoutMs: 300000, idleMs: 30000, reportOut: null }, 'check opts unchanged');

  // 2. Invalid batch flags -> specific codes.
  const B = ['--batch-start-id', 'TK-000001', '--batch-size', '25'];
  throwsCode(() => V.parseArgs(['--live', '--batch-start-id', 'TK-000001']), 'BATCH_FLAGS_INCOMPLETE');
  throwsCode(() => V.parseArgs(['--live', '--batch-size', '25']), 'BATCH_FLAGS_INCOMPLETE');
  throwsCode(() => V.parseArgs(B), 'BATCH_LIVE_ONLY');
  throwsCode(() => V.parseArgs(['--check', ...B]), 'BATCH_LIVE_ONLY');
  for (const s of ['0', '26', '100', '-1', 'abc', '2.5', '']) {
    throwsCode(() => V.parseArgs(['--live', '--batch-start-id', 'TK-000001', '--batch-size', s]), s === '' ? 'ARGS_INVALID' : 'BATCH_SIZE_INVALID', 'size ' + s);
  }
  for (const id of ['TK-000000', 'TK-000227', 'TK-1', 'tk-000001', 'TK-0000001']) {
    throwsCode(() => V.parseArgs(['--live', '--batch-start-id', id, '--batch-size', '1']), 'BATCH_START_ID_INVALID', 'id ' + id);
  }
  throwsCode(() => V.parseArgs(['--live', '--batch-start-id', 'TK-000210', '--batch-size', '25']), 'BATCH_RANGE_OVERFLOW');
  throwsCode(() => V.parseArgs(['--live', '--batch-start-id', 'TK-000226', '--batch-size', '2']), 'BATCH_RANGE_OVERFLOW');
  throwsCode(() => V.parseArgs(['--live', ...B, '--batch-size', '25']), 'ARGS_INVALID', 'repeated flag');

  // 3. Invalid flags via CLI: usage exit 2, zero network, zero env reads.
  for (const argv of [['--live', '--batch-start-id', 'TK-000001', '--batch-size', '26'],
    ['--live', '--batch-start-id', 'TK-000220', '--batch-size', '25'], ['--live', '--batch-size', '5'], B]) {
    const spy = envSpy({ ...CREDS });
    const r = await runCli(argv, { env: spy.env });
    eq([r.code, r.fetchImpl.calls, spy.reads, r.out], [2, 0, 0, ''], 'usage fail-closed ' + argv.join(' '));
    ok(/"status":"USAGE_ERROR"/.test(r.err) && !leaks(r.err));
  }

  // 4. Selection from the REAL full manifest: batch 1 = 25 video + 25 poster, original row objects.
  const b1 = V.selectBatchEntries(manifest, 'TK-000001', 25);
  eq(b1.range, { start_id: 'TK-000001', end_id: 'TK-000025', size: 25, expected_objects: 50 });
  eq([b1.entries.filter(e => e.media_type === 'video').length, b1.entries.filter(e => e.media_type === 'poster').length], [25, 25]);
  ok(b1.entries.every(e => manifest.entries.includes(e)), 'rows are unmodified full-manifest objects');
  eq([...new Set(b1.entries.map(e => e.catalog_id))].sort(), Array.from({ length: 25 }, (_, i) => cid(i + 1)));
  const last = V.selectBatchEntries(manifest, 'TK-000226', 1);
  eq([last.range, last.entries.map(e => e.media_type).sort()],
    [{ start_id: 'TK-000226', end_id: 'TK-000226', size: 1, expected_objects: 2 }, ['poster', 'video']]);
  // 9 x 25 + final 1 covers all 452 rows exactly once.
  const seen = new Set();
  for (let s = 1; s <= 226; s += 25) for (const e of V.selectBatchEntries(manifest, cid(s), Math.min(25, 227 - s)).entries) seen.add(e);
  eq(seen.size, 452, 'all batches partition the 452 rows');

  // 5. Fail-closed selection on tampered manifests (duplicate/missing kind, non-full source).
  const t = clone(manifest);
  t.entries.find(e => e.catalog_id === 'TK-000003' && e.media_type === 'poster').catalog_id = 'TK-000100';
  throwsCode(() => V.selectBatchEntries(t, 'TK-000001', 25), 'BATCH_MISSING_KIND');
  throwsCode(() => V.selectBatchEntries(t, 'TK-000100', 1), 'BATCH_DUPLICATE_KIND');
  throwsCode(() => V.selectBatchEntries({ ...manifest, entries: manifest.entries.slice(0, 50) }, 'TK-000001', 25), 'BATCH_SOURCE_NOT_FULL_MANIFEST');

  // 6. --check stays offline with no env read; no batch markers.
  {
    const spy = envSpy({ ...CREDS });
    const r = await runCli(['--check'], { env: spy.env });
    const s = JSON.parse(r.out);
    eq([r.code, r.fetchImpl.calls, spy.reads, s.status, s.network_requests, 'batch' in s], [0, 0, 0, 'OFFLINE_CHECK_OK_NO_NETWORK', 0, false]);
  }

  // 7. Batch without key: exit 2, zero GET, explicitly partial.
  {
    const r = await runCli(['--live', ...B], { env: {} });
    const s = JSON.parse(r.err);
    eq([r.code, r.fetchImpl.calls, s.mode, s.status, s.verdict, s.attestation_eligible, s.complete_452, s.network_requests],
      [2, 0, 'live-batch', 'BLOCKED_NO_CREDENTIAL', 'PARTIAL_NOT_ATTESTABLE', false, false, 0]);
  }
  // Full --live without key: unchanged shape, no batch markers.
  {
    const r = await runCli(['--live'], { env: {} });
    const s = JSON.parse(r.err);
    eq([r.code, r.fetchImpl.calls, s.mode, s.status, 'verdict' in s, 'batch' in s, 'attestation_eligible' in s],
      [2, 0, 'live', 'BLOCKED_NO_CREDENTIAL', false, false, false]);
  }
  // Batch with unacceptable credentials: BLOCKED_NO_CREDENTIAL, zero GET, still partial, nothing echoed.
  for (const [label, env] of [
    ['legacy single key only', { TK504_STORAGE_VERIFY_KEY: FAKE_JWT }],
    ['publishable only', { [V.API_KEY_ENV]: FAKE_PUBLISHABLE }],
    ['JWT only', { [V.AUDITOR_JWT_ENV]: FAKE_JWT }],
    ['sb_secret apikey', { ...CREDS, [V.API_KEY_ENV]: FAKE_SECRET }],
    ['JWT in apikey', { ...CREDS, [V.API_KEY_ENV]: FAKE_JWT }],
    ['service_role JWT', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ role: 'service_role' }) }],
    ['anon JWT', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ role: 'anon' }) }],
    ['missing is_anonymous', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ is_anonymous: undefined }) }],
    ['wrong issuer', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ iss: 'https://otherproject.supabase.co/auth/v1' }) }],
    ['expired', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ exp: 1700000600 }) }]
  ]) {
    const r = await runCli(['--live', ...B], { env });
    const s = JSON.parse(r.err);
    eq([r.code, r.fetchImpl.calls, r.out, s.mode, s.status, s.verdict, s.attestation_eligible, s.network_requests],
      [2, 0, '', 'live-batch', 'BLOCKED_NO_CREDENTIAL', 'PARTIAL_NOT_ATTESTABLE', false, 0], 'batch ' + label);
    ok(!leaks(r.err) && !/AUDITOR_JWT_|API_KEY_/.test(s.reason), 'batch ' + label + ': generic, nothing echoed');
  }

  // 8. Batch with synthetic key + stub 404: exactly 50 GETs, non-attestable summary + report file.
  {
    const reportOut = path.join(os.tmpdir(), 'tk504-batch25-test-' + crypto.randomBytes(6).toString('hex') + '.json');
    const f = stub404();
    try {
      const r = await runCli(['--live', ...B, '--concurrency', '3', '--report-out', reportOut], { env: { ...CREDS }, fetchImpl: f });
      const s = JSON.parse(r.out);
      eq([r.code, f.calls, new Set(f.urls).size], [1, 50, 50], '50 GET max, each target once');
      eq(f.headerChecks, 50, 'every GET carried apikey=publishable + Authorization=Bearer auditor JWT');
      eq({ mode: s.mode, status: s.status, verdict: s.verdict, batch_outcome: s.batch_outcome,
        attestation_eligible: s.attestation_eligible, complete_452: s.complete_452, full_expected: s.full_expected,
        checked: s.checked, pass: s.pass, unable: s.unable, batch: s.batch },
      { mode: 'live-batch', status: 'BATCH_INCOMPLETE_UNABLE', verdict: 'PARTIAL_NOT_ATTESTABLE', batch_outcome: 'INCOMPLETE_UNABLE',
        attestation_eligible: false, complete_452: false, full_expected: 452, checked: 50, pass: 0, unable: 50,
        batch: { start_id: 'TK-000001', end_id: 'TK-000025', size: 25, expected_objects: 50 } });
      ok(!SIGNED_GATE(s) && s.status !== 'PASS' && s.verdict !== 'PASS', 'cannot pass signed gate');
      const file = fs.readFileSync(reportOut, 'utf8');
      const rep = JSON.parse(file);
      eq([rep.mode, rep.status, rep.verdict, rep.attestation_eligible, rep.complete_452, rep.failures.length],
        ['live-batch', 'BATCH_INCOMPLETE_UNABLE', 'PARTIAL_NOT_ATTESTABLE', false, false, 50]);
      ok(!leaks(r.out) && !leaks(r.err) && !leaks(file) && !file.includes('http'), 'no secrets/URLs');
    } finally { try { fs.unlinkSync(reportOut); } catch (_) { /* ignore */ } }
  }
  // Final batch TK-000226: exactly 2 GETs.
  {
    const f = stub404();
    const r = await runCli(['--live', '--batch-start-id', 'TK-000226', '--batch-size', '1'], { env: { ...CREDS }, fetchImpl: f });
    const s = JSON.parse(r.out);
    eq([r.code, f.calls, s.checked, s.batch.end_id, s.verdict, s.attestation_eligible], [1, 2, 2, 'TK-000226', 'PARTIAL_NOT_ATTESTABLE', false]);
  }

  console.log('tk504PrivateStorageBatch25: ' + checks + ' checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
