'use strict';
// TK504/#614 -- read-only private Storage byte-SHA verifier: deterministic local contract.
// Synthetic bytes only, served by an in-process HTTP server on 127.0.0.1. Production is
// NEVER contacted: every fetch used here is either the loopback mock or a stub that
// asserts it is not a real network call. No credentials, signed URLs or media are used.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const V = require('../tools/tk504_private_storage_byte_sha_verify.cjs');

let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const clone = o => JSON.parse(JSON.stringify(o));
// Synthetic credentials ONLY: a fake publishable key and an unsigned-but-well-formed JWT built
// from hardcoded fake claims + a dummy signature segment. No real credential exists here.
const FAKE_PUBLISHABLE = 'sb_publishable_synthetic_only_000000000000';
const FAKE_SECRET = 'sb_secret_synthetic_only_000000000000';
const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const FAKE_CLAIMS = Object.freeze({ iss: V.AUTH_ISSUER, sub: '00000000-0000-4000-8000-000000000001', aud: 'authenticated',
  role: 'authenticated', is_anonymous: false, iat: 1700000000, exp: 4102444800 });
const fakeJwt = (patch = {}, header = { alg: 'HS256', typ: 'JWT' }) => {
  const c = { ...FAKE_CLAIMS, ...patch };
  for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  return b64u(header) + '.' + b64u(c) + '.' + Buffer.from('synthetic-signature-not-real').toString('base64url');
};
const FAKE_JWT = fakeJwt();
const CREDS = Object.freeze({ [V.API_KEY_ENV]: FAKE_PUBLISHABLE, [V.AUDITOR_JWT_ENV]: FAKE_JWT });
const noNetwork = async () => { throw new Error('TEST_FORBIDS_NETWORK'); };

// ---- synthetic manifest (3 originals -> 6 blobs) ---------------------------------
function bytesFor(seed, n) {
  const out = Buffer.alloc(n);
  let block = crypto.createHash('sha256').update(seed).digest(), off = 0;
  while (off < n) { block.copy(out, off); off += block.length; block = crypto.createHash('sha256').update(block).digest(); }
  return out;
}
const SLUGS = ['syn-alpha', 'syn-bravo', 'syn-charlie'];
const BLOBS = new Map();
const entries = [];
SLUGS.forEach((slug, i) => {
  const cid = 'TK-' + String(i + 1).padStart(6, '0');
  const vb = bytesFor('v' + slug, 70000 + i * 1111), pb = bytesFor('p' + slug, 3000 + i * 17);
  const v = { catalog_id: cid, provider_id: slug, media_type: 'video', bucket: 'exercise-media',
    storage_path: 'movekit/v2/video/' + slug + '.mp4', sha256: sha(vb), bytes: vb.length, mime: 'video/mp4', status: 'STAGED_ONLY_NOT_RELEASED' };
  const p = { catalog_id: cid, provider_id: slug, media_type: 'poster', bucket: 'exercise-posters',
    storage_path: 'movekit/v2/poster-optimized/' + slug + '.webp', sha256: sha(pb), bytes: pb.length, mime: 'image/webp', status: 'STAGED_ONLY_NOT_RELEASED' };
  entries.push(v, p);
  BLOBS.set(V.OBJECT_PREFIX + v.bucket + '/' + v.storage_path, { e: v, bytes: vb });
  BLOBS.set(V.OBJECT_PREFIX + p.bucket + '/' + p.storage_path, { e: p, bytes: pb });
});
const vTotal = entries.filter(e => e.media_type === 'video').reduce((a, e) => a + e.bytes, 0);
const pTotal = entries.filter(e => e.media_type === 'poster').reduce((a, e) => a + e.bytes, 0);
const SYN = { schema: 'tk614-original226-private-media-staging/1.0', status: 'STAGED_ONLY_NOT_RELEASED',
  totals: { entries: 6, video_bytes: vTotal, poster_bytes: pTotal }, entries };
const PROFILE = { originals: 3, entries: 6, video_bytes: vTotal, poster_bytes: pTotal, first: 'TK-000001', last: 'TK-000003' };

// ---- loopback mock server -----------------------------------------------------------
let behavior = null, hits = new Map(), seenHeaders = [], inFlight = 0, maxInFlight = 0, hitOther = 0;
const server = http.createServer((req, res) => {
  const blob = BLOBS.get(req.url);
  if (!blob) { hitOther++; res.writeHead(599); res.end(); return; }
  const n = (hits.get(req.url) || 0) + 1; hits.set(req.url, n);
  seenHeaders.push({ method: req.method, ...req.headers });
  inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
  res.on('close', () => { inFlight--; });
  behavior(req, res, blob, n);
});
const serveOk = (res, blob, extra = {}) => {
  res.writeHead(200, { 'content-type': blob.e.mime, 'content-length': blob.bytes.length, ...extra });
  // Stream in several chunks so hashing really is incremental.
  const b = blob.bytes, step = 8192;
  for (let o = 0; o < b.length; o += step) res.write(b.subarray(o, Math.min(b.length, o + step)));
  res.end();
};
const reset = fn => { behavior = fn; hits = new Map(); seenHeaders = []; maxInFlight = 0; hitOther = 0; };
const hitsFor = e => hits.get(V.OBJECT_PREFIX + e.bucket + '/' + e.storage_path) || 0;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const ORIGIN = 'http://127.0.0.1:' + server.address().port;
  const live = (opts = {}) => V.verifyAll(SYN, { publishableKey: FAKE_PUBLISHABLE, auditorJwt: FAKE_JWT, origin: ORIGIN, allowLoopbackForTests: true,
    concurrency: 2, timeoutMs: 5000, idleMs: 1000, ...opts });
  const one = (cid, type) => r => r.failures.find(f => f.catalog_id === cid && f.media_type === type);

  // ---- 1. production manifest: offline validation, pinned totals -----------------
  const prod = V.loadManifestFile();
  eq(V.productionManifestProblems(prod.manifest), [], 'repo manifest is valid');
  eq([prod.manifest.entries.length, prod.manifest.totals.video_bytes, prod.manifest.totals.poster_bytes], [452, 780852020, 3879362]);
  eq([V.PRODUCTION_PROFILE.video_bytes, V.PRODUCTION_PROFILE.poster_bytes, V.PRODUCTION_PROFILE.entries], [780852020, 3879362, 452]);
  {
    const urls = prod.manifest.entries.map(e => V.objectUrl(e));
    eq(new Set(urls).size, 452, '452 unique request targets');
    ok(urls.every(u => u.startsWith('https://mhfxhzkdmgkaplicdszg.supabase.co/storage/v1/object/authenticated/exercise-')), 'fixed HTTPS project origin');
    ok(urls.every(u => !u.includes('?') && !u.includes('#') && !/token|sign\//.test(u)), 'no signed URLs or query');
  }
  // Tampered copies of the REAL manifest fail closed.
  const tamper = (fn, code, m) => { const t = clone(prod.manifest); fn(t); const p = V.productionManifestProblems(t); ok(p.includes(code), m + ' -> ' + JSON.stringify(p)); };
  tamper(t => { t.entries[2].catalog_id = 'TK-000001'; }, 'MANIFEST_DUPLICATE_ID', 'duplicate catalog id');
  tamper(t => { t.entries[3].storage_path = t.entries[1].storage_path; t.entries[3].provider_id = t.entries[1].provider_id; }, 'MANIFEST_DUPLICATE_PATH', 'duplicate path');
  tamper(t => { t.entries[0].sha256 = 'A'.repeat(64); }, 'MANIFEST_SHA256_INVALID', 'uppercase/invalid sha');
  tamper(t => { t.entries[0].bytes += 1; t.totals.video_bytes += 1; }, 'MANIFEST_BYTE_TOTALS_PIN_MISMATCH', 'byte total pin drift');
  tamper(t => { t.entries[0].storage_path = 'movekit/v2/video/../../secret.mp4'; }, 'MANIFEST_PATH_NOT_CANONICAL', 'path traversal');
  tamper(t => { t.entries[0].bucket = 'public-media'; }, 'MANIFEST_BUCKET_INVALID', 'foreign bucket');
  tamper(t => { t.entries.pop(); }, 'MANIFEST_ENTRY_COUNT_INVALID', 'missing entry');
  tamper(t => { t.entries[0].extra = 'https://evil.example/x'; }, 'MANIFEST_ENTRY_SHAPE_INVALID', 'extra key');
  tamper(t => { t.entries[0].sha256 = '0'.repeat(64); }, 'STAGING_MANIFEST_DIGEST_MISMATCH', 'self-digest');
  tamper(t => { t.entries[1].provider_id = 'other-slug'; t.entries[1].storage_path = 'movekit/v2/poster-optimized/other-slug.webp'; }, 'MANIFEST_PROVIDER_ID_INCONSISTENT', 'provider id mismatch');

  // ---- 2. CLI: offline default never touches network or env ----------------------
  {
    const outs = [], errs = [];
    const io = { env: { ...CREDS }, out: s => outs.push(s), err: s => errs.push(s), fetchImpl: noNetwork };
    eq(await V.run([], io), 0, 'no args = offline OK');
    eq(await V.run(['--check'], io), 0, '--check = offline OK');
    const r = JSON.parse(outs[0]);
    eq([r.status, r.network_requests, r.planned_get_requests, r.live_verdict], ['OFFLINE_CHECK_OK_NO_NETWORK', 0, 452, 'NOT_RUN']);
    ok(!outs.join('').includes(FAKE_JWT) && !outs.join('').includes(FAKE_PUBLISHABLE), 'credentials never printed in offline mode');
  }
  // Env names: two separate values; KEY_ENV aliases the auditor JWT; legacy single key never used.
  eq([V.API_KEY_ENV, V.AUDITOR_JWT_ENV, V.KEY_ENV], ['TK504_STORAGE_PUBLISHABLE_KEY', 'TK504_STORAGE_AUDITOR_JWT', 'TK504_STORAGE_AUDITOR_JWT']);
  eq(V.AUTH_ISSUER, 'https://mhfxhzkdmgkaplicdszg.supabase.co/auth/v1');
  // --live with missing / malformed / privileged / non-auditor credentials: fail closed, generic reason, ZERO network.
  const LEGACY = 'TK504_STORAGE_VERIFY_KEY';
  const badEnvs = [
    ['empty env', {}],
    ['legacy single key only (JWT)', { [LEGACY]: FAKE_JWT }],
    ['legacy key + publishable, no JWT', { [LEGACY]: FAKE_JWT, [V.API_KEY_ENV]: FAKE_PUBLISHABLE }],
    ['publishable only', { [V.API_KEY_ENV]: FAKE_PUBLISHABLE }],
    ['JWT only', { [V.AUDITOR_JWT_ENV]: FAKE_JWT }],
    ['empty strings', { [V.API_KEY_ENV]: '', [V.AUDITOR_JWT_ENV]: '' }],
    ['sb_secret as api key', { ...CREDS, [V.API_KEY_ENV]: FAKE_SECRET }],
    ['JWT as api key', { ...CREDS, [V.API_KEY_ENV]: FAKE_JWT }],
    ['service_role JWT', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ role: 'service_role' }) }],
    ['anon JWT', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ role: 'anon' }) }],
    ['missing is_anonymous', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ is_anonymous: undefined }) }],
    ['wrong issuer', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ iss: 'https://otherproject.supabase.co/auth/v1' }) }],
    ['expired', { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ exp: 1700000600 }) }],
    ['malformed JWT', { ...CREDS, [V.AUDITOR_JWT_ENV]: 'short' }]
  ];
  for (const [label, env] of badEnvs) {
    const errs = [], calls = [];
    const spyFetch = async () => { calls.push(1); throw new Error('TEST_FORBIDS_NETWORK'); };
    eq(await V.run(['--live'], { env, out: () => { throw new Error('no stdout'); }, err: s => errs.push(s), fetchImpl: spyFetch }), 2, label + ' -> exit 2');
    const s = JSON.parse(errs[0]);
    eq([s.status, s.mode, s.network_requests, calls.length], ['BLOCKED_NO_CREDENTIAL', 'live', 0, 0], label + ': blocked, zero network');
    ok(!/AUDITOR_JWT_|API_KEY_/.test(s.reason) && !errs.join('').includes(FAKE_JWT) && !errs.join('').includes(FAKE_PUBLISHABLE) &&
      !errs.join('').includes(FAKE_SECRET), label + ': generic reason, no credential echoed');
  }
  // JWT that expires within one fetch timeout is refused; one that outlives it is accepted (per-fetch, not whole run).
  {
    const NOW = 1800000000000;
    eq(V.auditorJwtProblem(fakeJwt({ exp: 1800000000 + 300 }), { nowMs: NOW, minValidityMs: 300000 }), 'AUDITOR_JWT_EXPIRED_OR_TOO_SHORT');
    eq(V.auditorJwtProblem(fakeJwt({ exp: 1800000000 + 301 }), { nowMs: NOW, minValidityMs: 300000 }), null);
    const errs = [];
    eq(await V.run(['--live', '--timeout-ms', '600000'], { env: { ...CREDS, [V.AUDITOR_JWT_ENV]: fakeJwt({ exp: 1800000000 + 400 }) },
      now: () => NOW, out: () => {}, err: s => errs.push(s), fetchImpl: noNetwork }), 2, 'exp shorter than --timeout-ms -> blocked');
    eq(JSON.parse(errs[0]).status, 'BLOCKED_NO_CREDENTIAL');
  }
  for (const argv of [['--live', '--check'], ['--bogus'], ['--live', '--concurrency', '4'], ['--live', '--concurrency', '0'],
    ['--live', '--report-out', path.join(__dirname, 'leak.json')], ['--live', '--report-out', 'relative.json'],
    ['--report-out', path.join(os.tmpdir(), 'x.json')], ['--live', '--url', 'https://evil.example'],
    ['--live', 'constructor', '5'], ['--live', '__proto__', '5']]) {
    eq(await V.run(argv, { env: { ...CREDS }, out: () => {}, err: () => {}, fetchImpl: noNetwork }), 2, 'usage fail-closed: ' + argv.join(' '));
  }
  // Prefix .. in a folder name is NOT outside the repository; guard against a false outside verdict.
  {
    const root = path.resolve(__dirname, '..');
    const insideDotDotPrefix = fs.mkdtempSync(path.join(root, '..tk504-report-test-'));
    try {
      assert.throws(() => V.parseArgs(['--live', '--report-out', path.join(insideDotDotPrefix, 'private.json')]),
        e => e.code === 'REPORT_OUT_INSIDE_REPO'); checks++;
    } finally { fs.rmSync(insideDotDotPrefix, { recursive: true, force: true }); }
  }
  // Malformed / tampered manifest file -> exit 2 before any network use.
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk504-bytesha-'));
    try {
      const bad = path.join(dir, 'bad.json'); fs.writeFileSync(bad, '{"schema":');
      eq(await V.run(['--live'], { env: { ...CREDS }, out: () => {}, err: () => {}, fetchImpl: noNetwork, manifestFile: bad }), 2, 'malformed JSON');
      const dup = path.join(dir, 'dup.json'); const t = clone(prod.manifest); t.entries[2].catalog_id = 'TK-000001';
      fs.writeFileSync(dup, JSON.stringify(t));
      eq(await V.run(['--live'], { env: { ...CREDS }, out: () => {}, err: () => {}, fetchImpl: noNetwork, manifestFile: dup }), 2, 'tampered manifest');
      eq(await V.run([], { env: {}, out: () => {}, err: () => {}, fetchImpl: noNetwork, manifestFile: path.join(dir, 'missing.json') }), 2, 'missing manifest');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  // CLI --live wiring with a STUB fetch (no socket): fixed origin, read-only GET, headers,
  // all 404 -> INCOMPLETE exit 1, key never printed. This proves wiring, not production.
  {
    const outs = [], seen = [];
    const stub = async (url, init) => { seen.push({ url, init }); return new Response(null, { status: 404 }); };
    eq(await V.run(['--live', '--concurrency', '3'], { env: { ...CREDS }, out: s => outs.push(s), err: s => outs.push(s), fetchImpl: stub }), 1, 'all 404 -> exit 1');
    eq(seen.length, 452, 'exactly one GET per object (404 is not retried)');
    ok(seen.every(s => s.url.startsWith(V.ORIGIN + V.OBJECT_PREFIX) && s.init.method === 'GET' && s.init.redirect === 'manual' &&
      s.init.headers.apikey === FAKE_PUBLISHABLE && s.init.headers.Authorization === 'Bearer ' + FAKE_JWT && s.init.headers['Accept-Encoding'] === 'identity' && s.init.signal), 'fixed origin, GET, manual redirect, identity encoding, abortable');
    const r = JSON.parse(outs[0]);
    eq([r.status, r.checked, r.pass, r.fail, r.unable, r.categories.OBJECT_NOT_FOUND], ['INCOMPLETE_UNABLE', 452, 0, 0, 452, 452]);
    ok(!('failures' in r), 'stdout has aggregate only');
    ok(!outs.join('').includes(FAKE_JWT) && !outs.join('').includes(FAKE_PUBLISHABLE) && !outs.join('').includes('supabase.co/storage'), 'no key or URL in output');
  }

  // ---- 3. request target validation ---------------------------------------------------
  {
    const e = entries[0];
    for (const o of ['http://mhfxhzkdmgkaplicdszg.supabase.co', 'https://otherproject.supabase.co', 'https://evil.example', ORIGIN])
      assert.throws(() => V.objectUrl(e, o), x => x.code === 'ORIGIN_NOT_ALLOWED'), checks++;
    eq(V.objectUrl(e, ORIGIN, true), ORIGIN + '/storage/v1/object/authenticated/exercise-media/movekit/v2/video/syn-alpha.mp4');
    assert.throws(() => V.objectUrl(e, 'http://10.0.0.1:80', true), x => x.code === 'ORIGIN_NOT_ALLOWED'); checks++;
    assert.throws(() => V.objectUrl({ ...e, bucket: 'exercise-posters' }), x => x.code === 'BUCKET_NOT_ALLOWED'); checks++;
    assert.throws(() => V.objectUrl({ ...e, storage_path: 'movekit/v2/video/%2e%2e.mp4' }), x => x.code === 'PATH_NOT_CANONICAL'); checks++;
    // Header separation: publishable key ONLY in apikey, auditor JWT ONLY in Authorization.
    eq(V.authHeaders(FAKE_PUBLISHABLE, FAKE_JWT), { apikey: FAKE_PUBLISHABLE, Authorization: 'Bearer ' + FAKE_JWT,
      'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' }, 'two credentials -> two separate headers');
    const authCode = (k, j, o) => { try { V.authHeaders(k, j, o); return null; } catch (x) { return x.code; } };
    eq(authCode(FAKE_SECRET, FAKE_JWT), 'API_KEY_PRIVILEGED_OR_JWT', 'sb_secret refused as apikey');
    eq(authCode('sb_publishable_service_role_x', FAKE_JWT), 'API_KEY_PRIVILEGED_OR_JWT', 'service_role-looking key refused');
    eq(authCode(FAKE_JWT, FAKE_JWT), 'API_KEY_PRIVILEGED_OR_JWT', 'JWT alone in apikey refused');
    eq(authCode('legacy-opaque-key-0000000000000000', FAKE_JWT), 'API_KEY_NOT_PUBLISHABLE', 'non-publishable key refused');
    eq(authCode(undefined, FAKE_JWT), 'API_KEY_MISSING');
    eq(authCode(FAKE_PUBLISHABLE, undefined), 'AUDITOR_JWT_MISSING');
    eq(authCode(FAKE_PUBLISHABLE, FAKE_PUBLISHABLE), 'AUDITOR_JWT_MALFORMED', 'publishable key is not a JWT');
    // Untrusted local JWT sanity check (NOT authorization): each rejection is explicit and fail-closed.
    const P = (patch, header) => V.auditorJwtProblem(fakeJwt(patch, header));
    eq(P({}), null, 'synthetic auditor JWT passes local sanity check');
    for (const [patch, code, label] of [
      [{ role: 'service_role' }, 'AUDITOR_JWT_ROLE_INVALID', 'service_role JWT'],
      [{ role: 'anon' }, 'AUDITOR_JWT_ROLE_INVALID', 'anon JWT'],
      [{ role: undefined }, 'AUDITOR_JWT_ROLE_INVALID', 'missing role'],
      [{ aud: 'anon' }, 'AUDITOR_JWT_AUD_INVALID', 'wrong aud'],
      [{ aud: ['authenticated'] }, 'AUDITOR_JWT_AUD_INVALID', 'array aud not accepted'],
      [{ is_anonymous: undefined }, 'AUDITOR_JWT_ANONYMOUS_OR_UNSPECIFIED', 'missing is_anonymous'],
      [{ is_anonymous: true }, 'AUDITOR_JWT_ANONYMOUS_OR_UNSPECIFIED', 'anonymous user'],
      [{ is_anonymous: 'false' }, 'AUDITOR_JWT_ANONYMOUS_OR_UNSPECIFIED', 'string is_anonymous'],
      [{ iss: 'https://otherproject.supabase.co/auth/v1' }, 'AUDITOR_JWT_ISSUER_INVALID', 'wrong issuer'],
      [{ iss: V.AUTH_ISSUER + '/' }, 'AUDITOR_JWT_ISSUER_INVALID', 'issuer trailing slash'],
      [{ iss: undefined }, 'AUDITOR_JWT_ISSUER_INVALID', 'missing issuer'],
      [{ sub: '00000000-0000-4000-8000-00000000000A' }, 'AUDITOR_JWT_SUB_INVALID', 'uppercase sub'],
      [{ sub: 'auditor' }, 'AUDITOR_JWT_SUB_INVALID', 'non-uuid sub'],
      [{ sub: undefined }, 'AUDITOR_JWT_SUB_INVALID', 'missing sub'],
      [{ exp: 1700000600 }, 'AUDITOR_JWT_EXPIRED_OR_TOO_SHORT', 'expired'],
      [{ exp: undefined }, 'AUDITOR_JWT_EXP_INVALID', 'missing exp'],
      [{ exp: 4102444800.5 }, 'AUDITOR_JWT_EXP_INVALID', 'non-integer exp'],
      [{ exp: '4102444800' }, 'AUDITOR_JWT_EXP_INVALID', 'string exp'],
      [{ iat: 4102444700 }, 'AUDITOR_JWT_IAT_INVALID', 'iat in the future'],
      [{ iat: 'x' }, 'AUDITOR_JWT_IAT_INVALID', 'non-numeric iat']
    ]) eq(P(patch), code, label);
    eq(P({ iat: undefined }), null, 'iat optional');
    eq(P({}, { alg: 'none', typ: 'JWT' }), 'AUDITOR_JWT_ALG_INVALID', 'alg none refused');
    eq(P({}, { typ: 'JWT' }), 'AUDITOR_JWT_ALG_INVALID', 'missing alg refused');
    eq(V.auditorJwtProblem(FAKE_JWT.split('.').slice(0, 2).join('.') + '.'), 'AUDITOR_JWT_MALFORMED', 'empty signature segment');
    eq(V.auditorJwtProblem('a.b.c'), 'AUDITOR_JWT_MALFORMED', 'non-JSON segments');
    eq(V.auditorJwtProblem(FAKE_JWT + '.x'), 'AUDITOR_JWT_MALFORMED', 'four segments');
    eq(V.manifestProblems(SYN, PROFILE), [], 'synthetic manifest valid under its own profile');
    await assert.rejects(V.verifyAll(SYN, { publishableKey: FAKE_PUBLISHABLE, auditorJwt: FAKE_JWT, origin: ORIGIN, allowLoopbackForTests: true, concurrency: 4 }), x => x.code === 'CONCURRENCY_INVALID'); checks++;
    await assert.rejects(V.verifyAll(SYN, { origin: ORIGIN, allowLoopbackForTests: true }), x => x.code === 'API_KEY_MISSING'); checks++;
    await assert.rejects(V.verifyAll(SYN, { publishableKey: FAKE_SECRET, auditorJwt: FAKE_JWT, origin: ORIGIN, allowLoopbackForTests: true }), x => x.code === 'API_KEY_PRIVILEGED_OR_JWT'); checks++;
    await assert.rejects(V.verifyAll(SYN, { publishableKey: FAKE_PUBLISHABLE, auditorJwt: fakeJwt({ role: 'service_role' }), origin: ORIGIN, allowLoopbackForTests: true }), x => x.code === 'AUDITOR_JWT_ROLE_INVALID'); checks++;
  }

  // ---- 4. loopback HTTP scenarios ---------------------------------------------------
  // 4a all success
  reset((req, res, blob) => serveOk(res, blob));
  {
    const r = await live({ concurrency: 3 });
    eq([r.verdict, r.checked, r.pass, r.fail, r.unable, r.retries], ['PASS', 6, 6, 0, 0, 0]);
    eq([r.video.verified_bytes, r.poster.verified_bytes], [vTotal, pTotal]);
    ok(entries.every(e => hitsFor(e) === 1), 'one GET each');
    ok(seenHeaders.every(h => h.method === 'GET' && h.apikey === FAKE_PUBLISHABLE && h.authorization === 'Bearer ' + FAKE_JWT && h.apikey !== FAKE_JWT && h['accept-encoding'] === 'identity'), 'read-only GET + identity');
    ok(maxInFlight <= 3, 'bounded concurrency <=3 (saw ' + maxInFlight + ')');
  }
  reset((req, res, blob) => serveOk(res, blob));
  { await live({ concurrency: 1 }); eq(maxInFlight, 1, 'concurrency 1 is serial'); }

  const target = entries[2]; // TK-000002 video
  const isT = blob => blob.e === target;
  // 4b wrong digest, same length: FAIL, never retried
  reset((req, res, blob) => { if (!isT(blob)) return serveOk(res, blob); const b = Buffer.from(blob.bytes); b[100] ^= 0xff; serveOk(res, { e: blob.e, bytes: b }); });
  {
    const r = await live();
    eq([r.verdict, r.pass, r.fail, r.unable, r.categories], ['FAIL_MISMATCH', 5, 1, 0, { SHA256_MISMATCH: 1 }]);
    eq(one('TK-000002', 'video')(r), { catalog_id: 'TK-000002', media_type: 'video', outcome: 'fail', category: 'SHA256_MISMATCH' });
    eq(hitsFor(target), 1, 'SHA mismatch is never retried');
  }
  // 4c Content-Length differs from manifest -> SIZE_MISMATCH (fail)
  reset((req, res, blob) => isT(blob) ? serveOk(res, { e: blob.e, bytes: blob.bytes.subarray(0, blob.bytes.length - 10) }) : serveOk(res, blob));
  { const r = await live(); eq([r.verdict, r.categories], ['FAIL_MISMATCH', { SIZE_MISMATCH: 1 }]); eq(hitsFor(target), 1); }
  // 4d truncation: correct Content-Length, connection dropped mid-body -> UNABLE, retried once
  reset((req, res, blob) => {
    if (!isT(blob)) return serveOk(res, blob);
    res.writeHead(200, { 'content-type': blob.e.mime, 'content-length': blob.bytes.length });
    res.write(blob.bytes.subarray(0, 1000), () => res.socket.destroy());
  });
  { const r = await live(); eq([r.verdict, r.fail, r.unable, r.categories, r.retries], ['INCOMPLETE_UNABLE', 0, 1, { TRUNCATED_STREAM: 1 }, 1]); eq(hitsFor(target), 2, 'transient retried exactly once'); }
  // 4e chunked (no Content-Length) short body -> UNABLE truncated
  reset((req, res, blob) => { if (!isT(blob)) return serveOk(res, blob); res.writeHead(200, { 'content-type': blob.e.mime }); res.end(blob.bytes.subarray(0, 500)); });
  { const r = await live(); eq([r.verdict, r.categories], ['INCOMPLETE_UNABLE', { TRUNCATED_STREAM: 1 }]); }
  // 4f chunked oversized stream -> FAIL OVERSIZE_STREAM, aborted early
  reset((req, res, blob) => {
    if (!isT(blob)) return serveOk(res, blob);
    res.writeHead(200, { 'content-type': blob.e.mime });
    res.write(blob.bytes); res.write(Buffer.alloc(4096)); res.end();
  });
  { const r = await live(); eq([r.verdict, r.categories], ['FAIL_MISMATCH', { OVERSIZE_STREAM: 1 }]); eq(hitsFor(target), 1); }
  // 4g HTTP 500 twice -> UNABLE after one retry; 500 then 200 -> PASS
  reset((req, res, blob) => { if (!isT(blob)) return serveOk(res, blob); res.writeHead(500); res.end('internal detail must not leak'); });
  { const r = await live(); eq([r.verdict, r.categories, r.retries], ['INCOMPLETE_UNABLE', { HTTP_TRANSIENT: 1 }, 1]); eq(hitsFor(target), 2); ok(!JSON.stringify(r).includes('internal detail'), 'body not reported'); }
  reset((req, res, blob, n) => { if (isT(blob) && n === 1) { res.writeHead(503); res.end(); return; } serveOk(res, blob); });
  { const r = await live(); eq([r.verdict, r.pass, r.retries], ['PASS', 6, 1], 'transient recovered by single retry'); }
  // 4h 403 / 404 / 418 -> UNABLE, no retry
  for (const [status, cat] of [[403, 'AUTH_REJECTED'], [401, 'AUTH_REJECTED'], [404, 'OBJECT_NOT_FOUND'], [400, 'OBJECT_NOT_FOUND'], [418, 'HTTP_ERROR']]) {
    reset((req, res, blob) => { if (!isT(blob)) return serveOk(res, blob); res.writeHead(status); res.end(); });
    const r = await live();
    eq([r.verdict, r.categories], ['INCOMPLETE_UNABLE', { [cat]: 1 }], 'status ' + status);
    eq(hitsFor(target), 1, 'no retry for ' + status);
  }
  // 4i redirect -> REJECTED, target never followed
  reset((req, res, blob) => { if (!isT(blob)) return serveOk(res, blob); res.writeHead(302, { location: '/elsewhere/leak.mp4' }); res.end(); });
  { const r = await live(); eq([r.verdict, r.categories], ['INCOMPLETE_UNABLE', { REDIRECT_REJECTED: 1 }]); eq(hitOther, 0, 'redirect not followed'); eq(hitsFor(target), 1); }
  // 4j compressed body -> REJECTED (no transparent decompression trusted)
  reset((req, res, blob) => isT(blob) ? serveOk(res, blob, { 'content-encoding': 'gzip' }) : serveOk(res, blob));
  { const r = await live(); eq([r.verdict, r.categories], ['INCOMPLETE_UNABLE', { CONTENT_ENCODING_REJECTED: 1 }]); }
  // 4k wrong content-type, correct bytes -> FAIL MIME_MISMATCH
  reset((req, res, blob) => isT(blob) ? serveOk(res, blob, { 'content-type': 'application/octet-stream' }) : serveOk(res, blob));
  { const r = await live(); eq([r.verdict, r.categories], ['FAIL_MISMATCH', { MIME_MISMATCH: 1 }]); }
  // 4l stalled body -> TIMEOUT via AbortController, retried once
  reset((req, res, blob) => { if (!isT(blob)) return serveOk(res, blob); res.writeHead(200, { 'content-type': blob.e.mime, 'content-length': blob.bytes.length }); res.write(blob.bytes.subarray(0, 100)); });
  { const r = await live({ idleMs: 150 }); eq([r.verdict, r.categories, r.retries], ['INCOMPLETE_UNABLE', { TIMEOUT: 1 }, 1]); eq(hitsFor(target), 2); }
  // 4m stalled headers -> TIMEOUT
  reset((req, res, blob) => { if (!isT(blob)) return serveOk(res, blob); });
  { const r = await live({ idleMs: 150 }); eq([r.verdict, r.categories], ['INCOMPLETE_UNABLE', { TIMEOUT: 1 }]); }
  server.closeAllConnections();
  // 4n connection refused -> NETWORK_ERROR (UNABLE), never PASS
  {
    const dead = http.createServer(); await new Promise(r => dead.listen(0, '127.0.0.1', r));
    const port = dead.address().port; await new Promise(r => dead.close(r));
    const r = await V.verifyAll(SYN, { publishableKey: FAKE_PUBLISHABLE, auditorJwt: FAKE_JWT, origin: 'http://127.0.0.1:' + port, allowLoopbackForTests: true, timeoutMs: 2000, idleMs: 1000 });
    eq([r.verdict, r.pass, r.unable, r.categories], ['INCOMPLETE_UNABLE', 0, 6, { NETWORK_ERROR: 6 }]);
  }
  ok([...V.FAIL_CATEGORIES].every(c => !V.UNABLE_CATEGORIES.has(c)), 'FAIL and UNABLE taxonomies are disjoint');

  server.closeAllConnections();
  await new Promise(r => server.close(r));
  console.log('TK504 private Storage byte-SHA verifier: ' + checks + ' synthetic assertions PASS; production never contacted');
  console.log('Resultaat: ' + checks + ' geslaagd, 0 mislukt');
})().catch(err => { console.error(err); server.closeAllConnections(); server.close(); process.exitCode = 1; });
