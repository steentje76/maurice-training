#!/usr/bin/env node
'use strict';
// TK504/#614 -- READ-ONLY byte-level SHA-256 verifier for the 226 ORIGINAL MoveKit
// private Storage objects (226 videos + 226 posters = 452 blobs).
//
// Default (no args / --check): OFFLINE ONLY. Validates the staged metadata manifest
// and the exact request plan. No network, no credentials, no env read.
//
// --live: streams every object over HTTPS GET from the fixed Supabase project
// (mhfxhzkdmgkaplicdszg) authenticated Storage endpoint, hashes the full stream with
// node:crypto, and compares SHA-256 + byte length against the manifest. Credentials are
// read ONLY from process.env.TK504_STORAGE_VERIFY_KEY at execution time; never from files,
// never logged. Media bytes are never persisted; only aggregate counts are printed.
//
// Authorizes nothing: no signing, grants, uploads, DB writes, release toggles.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_REL = 'docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json';
const MANIFEST_FILE = path.join(ROOT, ...MANIFEST_REL.split('/'));
const REPORT_SCHEMA = 'tk504-private-storage-byte-sha-report/1.0';
const PROJECT_REF = 'mhfxhzkdmgkaplicdszg';
const ORIGIN = 'https://' + PROJECT_REF + '.supabase.co';
const OBJECT_PREFIX = '/storage/v1/object/authenticated/';
const KEY_ENV = 'TK504_STORAGE_VERIFY_KEY';
const STAGED_SCHEMA = 'tk614-original226-private-media-staging/1.0';
const STAGED_STATUS = 'STAGED_ONLY_NOT_RELEASED';

const KINDS = Object.freeze({
  video: Object.freeze({ bucket: 'exercise-media', mime: 'video/mp4',
    path: /^movekit\/v2\/video\/([a-z0-9]+(?:-[a-z0-9]+)*)\.mp4$/, maxBytes: 256 * 1024 * 1024 }),
  poster: Object.freeze({ bucket: 'exercise-posters', mime: 'image/webp',
    path: /^movekit\/v2\/poster-optimized\/([a-z0-9]+(?:-[a-z0-9]+)*)\.webp$/, maxBytes: 1048576 })
});
// Pinned expectations for the production manifest (fail closed on any drift).
const PRODUCTION_PROFILE = Object.freeze({ originals: 226, entries: 452,
  video_bytes: 780852020, poster_bytes: 3879362, first: 'TK-000001', last: 'TK-000226' });
const ENTRY_KEYS = ['bucket', 'bytes', 'catalog_id', 'media_type', 'mime', 'provider_id', 'sha256', 'status', 'storage_path'];
const CID = /^TK-[0-9]{6}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const KEY_RE = /^[A-Za-z0-9._-]{20,4096}$/;
const MAX_CONCURRENCY = 3;
const DEFAULTS = Object.freeze({ concurrency: 2, timeoutMs: 300000, idleMs: 30000 });

// Outcome taxonomy. FAIL = the bytes/metadata served do not match the manifest.
// UNABLE = we could not obtain a complete, trustworthy stream (API/CDN/network/auth).
const FAIL_CATEGORIES = new Set(['SHA256_MISMATCH', 'SIZE_MISMATCH', 'OVERSIZE_STREAM', 'MIME_MISMATCH']);
const TRANSIENT = new Set(['HTTP_TRANSIENT', 'NETWORK_ERROR', 'TIMEOUT', 'TRUNCATED_STREAM']);
const UNABLE_CATEGORIES = new Set(['AUTH_REJECTED', 'OBJECT_NOT_FOUND', 'REDIRECT_REJECTED', 'HTTP_ERROR',
  'CONTENT_ENCODING_REJECTED', 'RESPONSE_URL_MISMATCH', 'HTTP_TRANSIENT', 'NETWORK_ERROR', 'TIMEOUT',
  'TRUNCATED_STREAM', 'INTERNAL_ERROR']);

function fail(code) { const e = new Error(code); e.code = code; throw e; }
function need(ok, code) { if (!ok) fail(code); }
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

// ---------------------------------------------------------------------------
// Manifest validation (offline, deterministic). Returns a list of problem codes.
function manifestProblems(m, profile = PRODUCTION_PROFILE) {
  if (!isObj(m) || m.schema !== STAGED_SCHEMA) return ['MANIFEST_SCHEMA_INVALID'];
  const p = new Set();
  if (m.status !== STAGED_STATUS) p.add('MANIFEST_STATUS_INVALID');
  const e = m.entries;
  if (!Array.isArray(e) || e.length !== profile.entries) { p.add('MANIFEST_ENTRY_COUNT_INVALID'); return [...p].sort(); }
  const ids = { video: new Set(), poster: new Set() };
  const paths = new Set(), providerByCid = new Map(), cidByProvider = new Map();
  let vb = 0, pb = 0, vc = 0, pc = 0;
  for (const x of e) {
    if (!isObj(x) || JSON.stringify(Object.keys(x).sort()) !== JSON.stringify(ENTRY_KEYS)) { p.add('MANIFEST_ENTRY_SHAPE_INVALID'); continue; }
    const k = KINDS[x.media_type];
    if (!k) { p.add('MANIFEST_MEDIA_TYPE_INVALID'); continue; }
    if (x.status !== STAGED_STATUS) p.add('MANIFEST_ENTRY_STATUS_INVALID');
    if (typeof x.catalog_id !== 'string' || !CID.test(x.catalog_id)) p.add('MANIFEST_CATALOG_ID_INVALID');
    if (x.bucket !== k.bucket) p.add('MANIFEST_BUCKET_INVALID');
    if (x.mime !== k.mime) p.add('MANIFEST_MIME_INVALID');
    const mm = typeof x.storage_path === 'string' ? k.path.exec(x.storage_path) : null;
    if (!mm || mm[1] !== x.provider_id) p.add('MANIFEST_PATH_NOT_CANONICAL');
    if (typeof x.sha256 !== 'string' || !HEX64.test(x.sha256) || x.sha256 === EMPTY_SHA256) p.add('MANIFEST_SHA256_INVALID');
    if (!Number.isSafeInteger(x.bytes) || x.bytes <= 0 || x.bytes > k.maxBytes) p.add('MANIFEST_BYTES_INVALID');
    if (ids[x.media_type].has(x.catalog_id)) p.add('MANIFEST_DUPLICATE_ID');
    ids[x.media_type].add(x.catalog_id);
    const full = x.bucket + '/' + x.storage_path;
    if (paths.has(full)) p.add('MANIFEST_DUPLICATE_PATH');
    paths.add(full);
    if (providerByCid.has(x.catalog_id) && providerByCid.get(x.catalog_id) !== x.provider_id) p.add('MANIFEST_PROVIDER_ID_INCONSISTENT');
    providerByCid.set(x.catalog_id, x.provider_id);
    if (cidByProvider.has(x.provider_id) && cidByProvider.get(x.provider_id) !== x.catalog_id) p.add('MANIFEST_DUPLICATE_PROVIDER_ID');
    cidByProvider.set(x.provider_id, x.catalog_id);
    if (x.media_type === 'video') { vc++; vb += Number(x.bytes) || 0; } else { pc++; pb += Number(x.bytes) || 0; }
  }
  if (vc !== profile.originals || pc !== profile.originals) p.add('MANIFEST_KIND_COUNT_INVALID');
  if (ids.video.size !== profile.originals || [...ids.video].some(id => !ids.poster.has(id))) p.add('MANIFEST_COVERAGE_INVALID');
  if (profile.first && profile.last) {
    const sorted = [...ids.video].sort();
    if (sorted[0] !== profile.first || sorted[sorted.length - 1] !== profile.last) p.add('MANIFEST_SCOPE_INVALID');
  }
  if (vb !== profile.video_bytes || pb !== profile.poster_bytes) p.add('MANIFEST_BYTE_TOTALS_PIN_MISMATCH');
  if (!isObj(m.totals) || m.totals.entries !== profile.entries || m.totals.video_bytes !== vb || m.totals.poster_bytes !== pb)
    p.add('MANIFEST_DECLARED_TOTALS_MISMATCH');
  return [...p].sort();
}

// For the production manifest we additionally reuse the staging tool's own structural
// invariants (order, authorizes-nothing, no URL/secret text, all_sha256 self-digest).
function productionManifestProblems(m) {
  const own = manifestProblems(m, PRODUCTION_PROFILE);
  let staged = [];
  try { staged = require('./tk614_original226_private_media_staging.cjs').stagingManifestProblems(m); }
  catch (_) { staged = ['STAGING_TOOL_UNAVAILABLE']; }
  return [...new Set([...own, ...staged])].sort();
}

function loadManifestFile(file = MANIFEST_FILE) {
  let raw;
  try { raw = fs.readFileSync(file); } catch (_) { fail('MANIFEST_UNREADABLE'); }
  let m;
  try { m = JSON.parse(raw.toString('utf8')); } catch (_) { fail('MANIFEST_MALFORMED_JSON'); }
  return { manifest: m, fileSha256: sha256(raw) };
}

// ---------------------------------------------------------------------------
// Request target: fixed origin + authenticated object endpoint + validated bucket/path.
function assertOrigin(origin, allowLoopbackForTests) {
  if (origin === ORIGIN) return origin;
  // Test-only escape hatch: a plain-HTTP loopback mock. The CLI never passes this.
  need(allowLoopbackForTests === true && /^http:\/\/127\.0\.0\.1:[0-9]{1,5}$/.test(String(origin)), 'ORIGIN_NOT_ALLOWED');
  return origin;
}
function objectUrl(entry, origin = ORIGIN, allowLoopbackForTests = false) {
  assertOrigin(origin, allowLoopbackForTests);
  const k = KINDS[entry && entry.media_type];
  need(k && entry.bucket === k.bucket, 'BUCKET_NOT_ALLOWED');
  const mm = typeof entry.storage_path === 'string' ? k.path.exec(entry.storage_path) : null;
  need(mm && mm[1] === entry.provider_id, 'PATH_NOT_CANONICAL');
  const u = new URL(origin + OBJECT_PREFIX + k.bucket + '/' + entry.storage_path.split('/').map(encodeURIComponent).join('/'));
  need(u.origin === origin && u.search === '' && u.hash === '' && u.username === '' && u.password === '' &&
    u.pathname === OBJECT_PREFIX + k.bucket + '/' + entry.storage_path, 'URL_NOT_CANONICAL');
  return u.href;
}
function authHeaders(key) {
  need(typeof key === 'string' && KEY_RE.test(key), 'CREDENTIAL_MISSING_OR_MALFORMED');
  const h = { apikey: key, 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' };
  // Legacy JWT-style keys go in Authorization; opaque sb_secret_ keys are apikey-only.
  if (key.split('.').length === 3) h.Authorization = 'Bearer ' + key;
  return h;
}

// ---------------------------------------------------------------------------
// One streamed GET -> { outcome: 'pass'|'fail'|'unable', category, bytes }.
// Never returns or logs body content, headers, URL or credentials.
async function fetchAndHash(url, entry, headers, { fetchImpl = fetch, timeoutMs = DEFAULTS.timeoutMs, idleMs = DEFAULTS.idleMs } = {}) {
  const ac = new AbortController();
  let why = null;
  const abort = w => { if (!why) why = w; ac.abort(); };
  const total = setTimeout(() => abort('TIMEOUT'), timeoutMs);
  let idle = setTimeout(() => abort('TIMEOUT'), idleMs);
  const bumpIdle = () => { clearTimeout(idle); idle = setTimeout(() => abort('TIMEOUT'), idleMs); };
  const k = KINDS[entry.media_type];
  let resp = null;
  const r = (outcome, category, bytes = 0) => ({ outcome, category, bytes });
  try {
    try {
      resp = await fetchImpl(url, { method: 'GET', redirect: 'manual', cache: 'no-store', headers, signal: ac.signal });
    } catch (_) { return r('unable', why || 'NETWORK_ERROR'); }
    const s = resp.status;
    if (resp.type === 'opaqueredirect' || (s >= 300 && s < 400) || resp.redirected) return r('unable', 'REDIRECT_REJECTED');
    if (resp.url && resp.url !== url) return r('unable', 'RESPONSE_URL_MISMATCH');
    if (s === 401 || s === 403) return r('unable', 'AUTH_REJECTED');
    if (s === 404 || s === 400) return r('unable', 'OBJECT_NOT_FOUND');
    if (s === 408 || s === 429 || (s >= 500 && s <= 599)) return r('unable', 'HTTP_TRANSIENT');
    if (s !== 200) return r('unable', 'HTTP_ERROR');
    const enc = (resp.headers.get('content-encoding') || '').trim().toLowerCase();
    if (enc !== '' && enc !== 'identity') return r('unable', 'CONTENT_ENCODING_REJECTED');
    const cl = resp.headers.get('content-length');
    if (cl !== null && (!/^[0-9]{1,12}$/.test(cl.trim()) || Number(cl) !== entry.bytes)) return r('fail', 'SIZE_MISMATCH');
    if (!resp.body) return r('unable', 'TRUNCATED_STREAM');
    const h = crypto.createHash('sha256');
    let n = 0, oversize = false;
    try {
      for await (const chunk of resp.body) {
        bumpIdle();
        n += chunk.byteLength;
        if (n > entry.bytes || n > k.maxBytes) { oversize = true; break; }
        h.update(chunk);
      }
    } catch (_) {
      if (!oversize) return r('unable', why === 'TIMEOUT' ? 'TIMEOUT' : 'TRUNCATED_STREAM', n);
    }
    if (oversize) { abort('OVERSIZE_STREAM'); return r('fail', 'OVERSIZE_STREAM', n); }
    if (n !== entry.bytes) return r(cl === null ? 'unable' : 'fail', cl === null ? 'TRUNCATED_STREAM' : 'SIZE_MISMATCH', n);
    const digest = h.digest('hex');
    // Constant-time compare of fixed-length hex digests.
    if (!crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(entry.sha256, 'utf8'))) return r('fail', 'SHA256_MISMATCH', n);
    const ct = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (ct !== entry.mime) return r('fail', 'MIME_MISMATCH', n);
    return r('pass', 'OK', n);
  } catch (_) {
    return r('unable', 'INTERNAL_ERROR');
  } finally {
    clearTimeout(total); clearTimeout(idle);
    if (resp && resp.body && !resp.bodyUsed) { try { await resp.body.cancel(); } catch (_) { /* ignore */ } }
  }
}

async function verifyEntry(entry, ctx) {
  const url = objectUrl(entry, ctx.origin, ctx.allowLoopbackForTests);
  let res = await fetchAndHash(url, entry, ctx.headers, ctx);
  let attempts = 1;
  // At most ONE retry, only for transient transport failures. Never for content mismatches.
  if (res.outcome === 'unable' && TRANSIENT.has(res.category)) { res = await fetchAndHash(url, entry, ctx.headers, ctx); attempts = 2; }
  return { ...res, attempts };
}

function emptyKind(expectedCount, expectedBytes) {
  return { expected: expectedCount, checked: 0, pass: 0, fail: 0, unable: 0, expected_bytes: expectedBytes, verified_bytes: 0 };
}

// Verify all entries with bounded concurrency. `manifest` must already be validated.
async function verifyAll(manifest, { key, origin = ORIGIN, allowLoopbackForTests = false, fetchImpl = fetch,
  concurrency = DEFAULTS.concurrency, timeoutMs = DEFAULTS.timeoutMs, idleMs = DEFAULTS.idleMs, now = Date.now } = {}) {
  need(Number.isSafeInteger(concurrency) && concurrency >= 1 && concurrency <= MAX_CONCURRENCY, 'CONCURRENCY_INVALID');
  need(Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && Number.isSafeInteger(idleMs) && idleMs >= 1, 'TIMEOUT_INVALID');
  assertOrigin(origin, allowLoopbackForTests);
  const headers = authHeaders(key);
  const entries = manifest.entries;
  const ctx = { origin, allowLoopbackForTests, headers, fetchImpl, timeoutMs, idleMs };
  const t0 = now();
  const results = new Array(entries.length);
  let next = 0;
  const worker = async () => {
    while (next < entries.length) {
      const i = next++;
      try { results[i] = await verifyEntry(entries[i], ctx); }
      catch (_) { results[i] = { outcome: 'unable', category: 'INTERNAL_ERROR', bytes: 0, attempts: 0 }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
  const exp = t => entries.filter(e => e.media_type === t);
  const sum = t => exp(t).reduce((a, e) => a + e.bytes, 0);
  const report = { checked: 0, pass: 0, fail: 0, unable: 0, retries: 0,
    video: emptyKind(exp('video').length, sum('video')), poster: emptyKind(exp('poster').length, sum('poster')),
    categories: {}, failures: [] };
  entries.forEach((e, i) => {
    const res = results[i];
    const kind = report[e.media_type];
    report.checked++; kind.checked++;
    report[res.outcome]++; kind[res.outcome]++;
    if (res.attempts > 1) report.retries++;
    if (res.outcome === 'pass') kind.verified_bytes += e.bytes;
    else {
      report.categories[res.category] = (report.categories[res.category] || 0) + 1;
      // catalog id + media type + category only: identifiers, never content/URLs.
      report.failures.push({ catalog_id: e.catalog_id, media_type: e.media_type, outcome: res.outcome, category: res.category });
    }
  });
  report.duration_ms = Math.max(0, now() - t0);
  const complete = report.checked === entries.length && report.pass + report.fail + report.unable === entries.length;
  const allPass = complete && report.fail === 0 && report.unable === 0 && report.pass === entries.length &&
    report.video.verified_bytes === report.video.expected_bytes && report.poster.verified_bytes === report.poster.expected_bytes;
  report.verdict = allPass ? 'PASS' : report.fail > 0 ? 'FAIL_MISMATCH' : 'INCOMPLETE_UNABLE';
  return report;
}

// ---------------------------------------------------------------------------
// CLI
const USAGE = [
  'Usage:',
  '  node tools/tk504_private_storage_byte_sha_verify.cjs [--check]      offline manifest + plan check (default)',
  '  ' + KEY_ENV + '=<key from secret store> \\',
  '    node tools/tk504_private_storage_byte_sha_verify.cjs --live [--concurrency 1..3]',
  '      [--timeout-ms N] [--idle-ms N] [--report-out <absolute path OUTSIDE the repo>]',
  'Exit: 0 PASS/offline OK, 1 mismatch or incomplete, 2 usage/precondition (fail closed).'
].join('\n');

function parseArgs(argv) {
  const o = { mode: 'check', concurrency: DEFAULTS.concurrency, timeoutMs: DEFAULTS.timeoutMs, idleMs: DEFAULTS.idleMs, reportOut: null };
  const seen = { check: false, live: false };
  const ints = { '--concurrency': 'concurrency', '--timeout-ms': 'timeoutMs', '--idle-ms': 'idleMs' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') seen.check = true;
    else if (a === '--live') seen.live = true;
    else if (Object.hasOwn(ints, a)) {
      const v = argv[++i];
      need(typeof v === 'string' && /^[0-9]{1,9}$/.test(v), 'ARGS_INVALID');
      o[ints[a]] = Number(v);
    } else if (a === '--report-out') {
      const v = argv[++i];
      need(typeof v === 'string' && v.length > 0, 'ARGS_INVALID');
      o.reportOut = v;
    } else fail('ARGS_UNKNOWN');
  }
  need(!(seen.check && seen.live), 'ARGS_CONFLICT');
  if (seen.live) o.mode = 'live';
  need(o.concurrency >= 1 && o.concurrency <= MAX_CONCURRENCY, 'CONCURRENCY_INVALID');
  need(o.timeoutMs >= 1000 && o.idleMs >= 1000, 'TIMEOUT_INVALID');
  if (o.reportOut !== null) {
    need(o.mode === 'live', 'REPORT_OUT_LIVE_ONLY');
    need(path.isAbsolute(o.reportOut), 'REPORT_OUT_NOT_ABSOLUTE');
    const reportFile = path.resolve(o.reportOut);
    const rootReal = fs.realpathSync(ROOT);
    let parentReal;
    try { parentReal = fs.realpathSync(path.dirname(reportFile)); }
    catch (_) { fail('REPORT_OUT_PARENT_UNREADABLE'); }
    const rel = path.relative(rootReal, parentReal);
    need(rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel), 'REPORT_OUT_INSIDE_REPO');
  }
  return o;
}

function appCommit() {
  try {
    const s = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^[0-9a-f]{40}$/.test(s) ? s : 'UNKNOWN';
  } catch (_) { return 'UNKNOWN'; }
}

function baseReport(mode, loaded) {
  return { schema: REPORT_SCHEMA, mode, project_ref: PROJECT_REF, manifest_file: MANIFEST_REL,
    manifest_file_sha256: loaded ? loaded.fileSha256 : null,
    manifest_all_sha256: loaded && isObj(loaded.manifest) && isObj(loaded.manifest.totals) ? loaded.manifest.totals.all_sha256 : null,
    app_commit: appCommit(), authorizes_nothing: true, media_persisted: false, credentials_logged: false };
}

async function run(argv = process.argv.slice(2), { env = process.env, out = s => console.log(s), err = s => console.error(s),
  manifestFile = MANIFEST_FILE, fetchImpl = fetch } = {}) {
  let opts;
  try { opts = parseArgs(argv); }
  catch (e) { err(JSON.stringify({ status: 'USAGE_ERROR', reason: e.code || 'ARGS_INVALID' })); err(USAGE); return 2; }
  let loaded;
  try { loaded = loadManifestFile(manifestFile); }
  catch (e) { err(JSON.stringify({ ...baseReport(opts.mode, null), status: 'BLOCKED', reason: e.code || 'MANIFEST_UNREADABLE' })); return 2; }
  const problems = productionManifestProblems(loaded.manifest);
  if (problems.length) {
    err(JSON.stringify({ ...baseReport(opts.mode, loaded), status: 'BLOCKED_MANIFEST_INVALID', problems }));
    return 2;
  }
  // Build every request target offline so plan errors surface before any network use.
  let plan;
  try { plan = loaded.manifest.entries.map(e => objectUrl(e)); }
  catch (e) { err(JSON.stringify({ ...baseReport(opts.mode, loaded), status: 'BLOCKED_PLAN_INVALID', reason: e.code })); return 2; }
  const m = loaded.manifest;
  if (opts.mode === 'check') {
    out(JSON.stringify({ ...baseReport('offline-check', loaded), status: 'OFFLINE_CHECK_OK_NO_NETWORK',
      network_requests: 0, planned_get_requests: plan.length, unique_targets: new Set(plan).size,
      video: { expected: m.entries.filter(e => e.media_type === 'video').length, expected_bytes: m.totals.video_bytes },
      poster: { expected: m.entries.filter(e => e.media_type === 'poster').length, expected_bytes: m.totals.poster_bytes },
      live_verdict: 'NOT_RUN' }));
    return 0;
  }
  // --live: credentials only from the execution-time environment. Fail closed.
  const key = env[KEY_ENV];
  if (typeof key !== 'string' || !KEY_RE.test(key)) {
    err(JSON.stringify({ ...baseReport('live', loaded), status: 'BLOCKED_NO_CREDENTIAL',
      reason: KEY_ENV + ' missing or malformed in process environment', network_requests: 0 }));
    return 2;
  }
  let report;
  try {
    report = await verifyAll(m, { key, fetchImpl, concurrency: opts.concurrency, timeoutMs: opts.timeoutMs, idleMs: opts.idleMs });
  } catch (e) {
    err(JSON.stringify({ ...baseReport('live', loaded), status: 'BLOCKED', reason: /^[A-Z_]+$/.test(e.code || '') ? e.code : 'INTERNAL_ERROR' }));
    return 1;
  }
  const { failures, ...aggregate } = report;
  const summary = { ...baseReport('live', loaded), status: report.verdict, ...aggregate };
  out(JSON.stringify(summary));
  if (opts.reportOut) {
    try { fs.writeFileSync(path.resolve(opts.reportOut), JSON.stringify({ ...summary, failures }, null, 2) + '\n', { flag: 'wx' }); }
    catch (_) { err(JSON.stringify({ status: 'PRIVATE_REPORT_WRITE_FAILED' })); return 1; }
  }
  return report.verdict === 'PASS' ? 0 : 1;
}

if (require.main === module) {
  run().then(code => { process.exitCode = code; }, () => { console.error(JSON.stringify({ status: 'BLOCKED', reason: 'INTERNAL_ERROR' })); process.exitCode = 1; });
}

module.exports = Object.freeze({ ORIGIN, PROJECT_REF, OBJECT_PREFIX, KEY_ENV, MANIFEST_FILE, MANIFEST_REL, PRODUCTION_PROFILE,
  KINDS, MAX_CONCURRENCY, FAIL_CATEGORIES, UNABLE_CATEGORIES, USAGE,
  manifestProblems, productionManifestProblems, loadManifestFile, objectUrl, authHeaders, fetchAndHash, verifyAll, parseArgs, run });
