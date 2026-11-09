'use strict';
// TK504 #504 -- ONE EXISTING BROKER FOR 582: original-226 bridge proof (TEST-ONLY).
//
// Proves, against the REAL shipped broker source, that the original TK-000001..226
// media already reuse the exact 356 pipeline
//   descriptor -> identifyUser -> verifyEntitlement -> sign -> verifyEntitlement
// once (and only once) the single unconditional original-226 guard is removed.
//
// The guard is removed ONLY inside an in-memory VM copy of the broker built by this
// test (exact one-block replacement, verified). Nothing is written to disk, no env /
// NODE_ENV / test override exists in production, and the shipped handler is re-checked
// to return 404 for all 452 original media with ZERO network calls.
//
// SYNTHETIC ONLY: no real JWT, service key, DB, Storage, grant row or signed URL. The
// unlocked VM fixture does NOT mean the original media is authorized in production:
// the 452-entry staging manifest stays STAGED_ONLY_NOT_RELEASED / authorizes nothing.
// Expected paths come from the independent staging manifest + inventory/poster JSON,
// never from broker._internal, and mutation probes prove the assertions catch a wrong
// broker (wrong path/bucket/TTL/recheck/auth/scope/digest).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

const ROOT = path.join(__dirname, '..');
const BROKER_FILE = path.join(ROOT, 'netlify', 'functions', 'exercise-media-v2-url.js');
const GATES_FILE = path.join(ROOT, 'docs', 'generated', 'MOVEKIT_V2_RELEASE_GATES.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const brokerBytesBefore = sha(fs.readFileSync(BROKER_FILE));
const gatesBytesBefore = sha(fs.readFileSync(GATES_FILE));

const prod = require(BROKER_FILE)._internal; // the real shipped module
const gates = require(GATES_FILE);
const manifest = require('../docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json');
const inventory = require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posterReg = require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');

// Independent constants (deliberately NOT read from the broker).
const BASE = 'https://mhfxhzkdmgkaplicdszg.supabase.co';
const SCOPE = 'movekit_v2';
const VIDEO_BUCKET = 'exercise-media';
const POSTER_BUCKET = 'exercise-posters';
const NOW = Date.parse('2026-11-09T12:00:00Z');
const UA = '0a0a0a0a-1111-4111-8111-aaaaaaaaaaaa';
const UB = '0b0b0b0b-2222-4222-8222-bbbbbbbbbbbb';
const TOKEN_A = 'Bearer synthetic.account-a.jwt';
const TOKEN_B = 'Bearer synthetic.account-b.jwt';
const ANON = 'synthetic-anon-key';
const SERVICE = 'synthetic-service-key';
const ENV = Object.freeze({
  SUPABASE_URL: BASE, SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE,
  MOVEKIT_V2_SIGNING_ENABLED: 'true', MOVEKIT_V2_PERMISSION_REVIEWED: 'true',
  MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED: 'true', MOVEKIT_V2_POSTER_UPLOAD_VERIFIED: 'true',
  MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED: 'true'
});

let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

// ---------------------------------------------------------------------------
// 1. Independent expectation source + "this is not a production authorization"
const goldenById = new Map(inventory.items.map(x => [x.catalog_id, x]));
const posterById = new Map(posterReg.items.map(x => [x.catalog_id, x]));
eq([manifest.status, manifest.entries.length], ['STAGED_ONLY_NOT_RELEASED', 452], 'staging manifest is staged-only');
ok(Object.values(manifest.authorizes).every(v => v === false), 'staging manifest authorizes nothing');
ok(manifest.entries.every(e => e.status === 'STAGED_ONLY_NOT_RELEASED'), 'every original entry staged-only');
for (const e of manifest.entries) {
  const g = goldenById.get(e.catalog_id), p = posterById.get(e.catalog_id);
  const want = e.media_type === 'video'
    ? [VIDEO_BUCKET, g.video.path, g.video.sha256, g.video.bytes]
    : [POSTER_BUCKET, p.path, p.sha256, p.bytes];
  assert.deepEqual([e.bucket, e.storage_path, e.sha256, e.bytes], want, e.catalog_id + ' ' + e.media_type);
}
checks += 452;
const originals = manifest.entries.map(e => ({ id: e.catalog_id, type: e.media_type, bucket: e.bucket, path: e.storage_path }));
eq(new Set(originals.map(o => o.id)).size, 226, '226 original catalog ids');
function expectedFor(id, type) {
  const m = manifest.entries.find(e => e.catalog_id === id && e.media_type === type);
  if (m) return { bucket: m.bucket, path: m.storage_path };
  return type === 'video'
    ? { bucket: VIDEO_BUCKET, path: goldenById.get(id).video.path }
    : { bucket: POSTER_BUCKET, path: posterById.get(id).path };
}
const signTarget = x => BASE + '/storage/v1/object/sign/' + x.bucket + '/' + x.path;

// ---------------------------------------------------------------------------
// 2. Build the TEST-ONLY unlocked broker: exactly one guard block removed, in memory.
const SRC = fs.readFileSync(BROKER_FILE, 'utf8').replace(/\r\n/g, '\n');
const GUARD = "  if (catalogNumber >= 1 && catalogNumber <= 226) {\n" +
              "    return failure(event, 404, 'MEDIA_NOT_APPROVED');\n" +
              "  }\n";
const UNLOCK = '  /* SYNTHETIC_TEST_ONLY: original-226 guard removed in VM copy */\n';
function replaceOnce(src, from, to, label) {
  const at = src.indexOf(from);
  assert.ok(at >= 0 && src.indexOf(from, at + 1) === -1, label + ': exactly one occurrence required');
  const out = src.slice(0, at) + to + src.slice(at + from.length);
  assert.equal(out, src.slice(0, at) + to + src.slice(at + from.length));
  assert.equal(out.length, src.length - from.length + to.length, label + ': no other modification');
  return out;
}
function loadVariant(source, tag) {
  const req = createRequire(BROKER_FILE);
  const mod = { exports: {} };
  const fn = vm.runInThisContext('(function (exports, require, module, __filename, __dirname) {' + source + '\n})',
    { filename: BROKER_FILE + '#' + tag });
  fn(mod.exports, req, mod, BROKER_FILE, path.dirname(BROKER_FILE));
  return mod.exports._internal;
}
const UNLOCKED_SRC = replaceOnce(SRC, GUARD, UNLOCK, 'guard');
{
  const a = SRC.split('\n'), b = UNLOCKED_SRC.split('\n'), at = a.indexOf(GUARD.split('\n')[0]);
  eq(b.length, a.length - 2, 'exactly the 3 guard lines collapse to 1 marker line');
  eq(b.slice(0, at), a.slice(0, at), 'every line before the guard identical');
  eq(b.slice(at + 1), a.slice(at + 3), 'every line after the guard identical');
  ok(!/catalogNumber <= 226/.test(UNLOCKED_SRC), 'no other original-226 branch remains in the VM copy');
  ok(!/SYNTHETIC_TEST_ONLY|process\.env\.NODE_ENV|ORIGINAL226_MEDIA_CUTOVER/.test(SRC), 'production source has no test hook / env toggle');
  ok(SRC.includes("exports.handler = event => handle(event, { env: process.env, fetch: globalThis.fetch, now: Date.now });"),
    'production handler passes no override');
}
const unlocked = loadVariant(UNLOCKED_SRC, 'synthetic-unlocked-test-only');
ok(unlocked !== prod && unlocked.handle !== prod.handle, 'VM copy is a separate in-memory module');
ok(!Object.values(require.cache).some(m => m.exports && m.exports._internal === unlocked), 'VM copy is not in require.cache');

// ---------------------------------------------------------------------------
// 3. Strict synthetic backend: validates every outgoing request the 356 path makes.
const TOKENS = { [TOKEN_A]: UA, [TOKEN_B]: UB };
const grantRow = (uid, patch = {}) => ({ user_id: uid, scope: SCOPE, active: true,
  expires_at: '2027-01-01T00:00:00.000Z', revoked_at: null, ...patch });
function backend(o = {}) {
  const calls = [], problems = [];
  let grantN = 0, seq = o.tokenStart || 0;
  const fetch = async (url, opts) => {
    calls.push({ kind: null, url, opts });
    const c = calls[calls.length - 1];
    if (opts.redirect !== 'error' || opts.cache !== 'no-store') problems.push('FETCH_OPTS');
    if (url === BASE + '/auth/v1/user') {
      c.kind = 'auth';
      if (opts.method !== 'GET' || opts.headers.apikey !== ANON) problems.push('AUTH_REQ');
      if (o.authDown) return { ok: false, status: 500 };
      const uid = TOKENS[opts.headers.Authorization];
      return uid ? { ok: true, json: async () => ({ id: uid }) } : { ok: false, status: 401 };
    }
    if (url.startsWith(BASE + '/rest/v1/movekit_media_grants?')) {
      c.kind = 'grant'; grantN++;
      const q = new URL(url).searchParams;
      c.uid = (q.get('user_id') || '').slice(3);
      if (q.get('select') !== 'user_id,scope,active,expires_at,revoked_at' || q.get('scope') !== 'eq.' + SCOPE ||
          q.get('limit') !== '2' || !/^eq\.[0-9a-f-]{36}$/.test(q.get('user_id') || '') ||
          opts.headers.Authorization !== 'Bearer ' + SERVICE || opts.headers.apikey !== SERVICE) problems.push('GRANT_REQ');
      if (o.grantDown) return { ok: false, status: 503 };
      const rows = typeof o.grants === 'function' ? o.grants(grantN, c.uid)
        : o.grants !== undefined ? o.grants : (c.uid === UA ? [grantRow(UA)] : []);
      return { ok: true, json: async () => rows };
    }
    if (url.startsWith(BASE + '/storage/v1/object/sign/')) {
      c.kind = 'sign';
      if (url !== o.expectSign) { problems.push('SIGN_TARGET'); throw new Error('UNEXPECTED_SIGN_TARGET'); }
      let body = null; try { body = JSON.parse(opts.body); } catch (_) { /* recorded below */ }
      c.expiresIn = body && body.expiresIn;
      if (opts.method !== 'POST' || opts.headers.Authorization !== 'Bearer ' + SERVICE ||
          opts.headers.apikey !== SERVICE || !body || Object.keys(body).length !== 1) problems.push('SIGN_REQ');
      if (o.signDown) return { ok: false, status: 500 };
      const raw = o.signUrl ? o.signUrl(url) : url.slice(BASE.length) + '?token=synthetic-' + String(++seq).padStart(6, '0');
      return { ok: true, json: async () => ({ signedURL: raw }) };
    }
    c.kind = 'unexpected'; problems.push('UNEXPECTED_NETWORK');
    throw new Error('UNEXPECTED_NETWORK_REQUEST');
  };
  return { fetch, calls, problems };
}
async function invoke(mod, id, type, o = {}) {
  const b = backend({ expectSign: signTarget(expectedFor(id, type)), ...o.backend });
  const body = o.rawBody !== undefined ? o.rawBody : JSON.stringify({ catalog_id: id, type, version: 'v2', ...(o.extraBody || {}) });
  const r = await mod.handle({ httpMethod: 'POST', headers: { origin: 'https://trainingskompas.com',
    authorization: o.token === undefined ? TOKEN_A : o.token }, body },
    { env: o.env || ENV, fetch: b.fetch, release: o.release || gates, now: o.now || (() => NOW) });
  return { status: r.statusCode, data: r.body ? JSON.parse(r.body) : null, headers: r.headers,
    calls: b.calls, kinds: b.calls.map(c => c.kind), problems: b.problems };
}

// ---------------------------------------------------------------------------
// 4. Reusable probe set (used for the full run AND to prove mutations are caught).
const tamper = (id, type, patch) => ({ ...gates, entries: gates.entries.map(e =>
  e.catalog_id === id && e.media_type === type ? { ...e, ...patch } : e) });
async function probes(mod, id, type) {
  const want = expectedFor(id, type), target = signTarget(want);
  const fails = [];
  const r = await invoke(mod, id, type);
  const url = r.data && r.data.url;
  let parsed = null; try { parsed = new URL(url); } catch (_) { parsed = null; }
  if (!(r.status === 200 && r.data.ok === true && r.data.catalog_id === id && r.data.type === type &&
        r.data.version === 'v2' && r.data.expires_in === 60 && parsed && parsed.origin === BASE &&
        parsed.pathname === new URL(target).pathname && /^synthetic-\d{6}$/.test(parsed.searchParams.get('token') || '') &&
        [...parsed.searchParams.keys()].join() === 'token' && !url.includes(SERVICE) &&
        /no-store/.test(r.headers['Cache-Control'])))
    fails.push('POSITIVE_200_EXACT_URL');
  if (JSON.stringify(r.kinds) !== '["auth","grant","sign","grant"]' || r.problems.length ||
      r.calls[2].url !== target || r.calls[2].expiresIn !== 60 || r.calls[1].uid !== UA || r.calls[3].uid !== UA)
    fails.push('PIPELINE_AUTH_GRANT_SIGN_RECHECK');
  const anon = await invoke(mod, id, type, { token: '' });
  if (anon.status !== 401 || anon.kinds.some(k => k !== 'auth')) fails.push('NO_TOKEN_401_NO_GRANT_NO_SIGN');
  const other = await invoke(mod, id, type, { token: TOKEN_B });
  if (other.status !== 403 || other.data.error !== 'NO_ENTITLEMENT' || other.kinds.includes('sign')) fails.push('ACCOUNT_B_NO_GRANT_403');
  const exp = await invoke(mod, id, type, { backend: { grants: [grantRow(UA, { expires_at: new Date(NOW + 45000).toISOString() })] } });
  if (exp.status !== 200 || exp.data.expires_in !== 45 || (exp.calls.find(c => c.kind === 'sign') || {}).expiresIn !== 45)
    fails.push('TTL_CAPPED_BY_GRANT');
  const revoked = await invoke(mod, id, type, { backend: { grants: n => n === 1 ? [grantRow(UA)] : [] } });
  if (revoked.status !== 403 || revoked.data.url !== undefined || revoked.data.error !== 'NO_ENTITLEMENT') fails.push('REVOKED_DURING_SIGN');
  const digest = await invoke(mod, id, type, { release: tamper(id, type, { sha256: '0'.repeat(64) }) });
  if (digest.status !== 404 || digest.calls.length !== 0) fails.push('DESCRIPTOR_DIGEST_FAIL_CLOSED');
  const foreign = await invoke(mod, id, type, { backend: { signUrl: u => u.replace(BASE, 'https://attacker.invalid') + '?token=synthetic-999999' } });
  if (foreign.status !== 502) fails.push('SIGNED_URL_VALIDATION');
  return fails;
}

// ---------------------------------------------------------------------------
(async () => {
  // 5. PRODUCTION: all 452 originals 404 with zero network, even under the most permissive env/config.
  {
    const permissive = { ...ENV, ORIGINAL226_MEDIA_CUTOVER_ENABLED: 'true', MOVEKIT_V2_ORIGINAL_226_RELEASED: 'true' };
    let n = 0;
    for (const o of originals) {
      for (const extra of [{}, { env: permissive }, { token: TOKEN_A, now: () => NOW + 1 }]) {
        const r = await invoke(prod, o.id, o.type, extra);
        assert.deepEqual([r.status, r.data.error, r.calls.length, r.data.url], [404, 'MEDIA_NOT_APPROVED', 0, undefined],
          'production ' + o.id + ' ' + o.type);
      }
      n++;
    }
    eq(n, 452, 'production: 452/452 original media 404 MEDIA_NOT_APPROVED, 0 outgoing requests');
    const pf = await probes(prod, 'TK-000001', 'video');
    ok(pf.includes('POSITIVE_200_EXACT_URL') && pf.includes('PIPELINE_AUTH_GRANT_SIGN_RECHECK'),
      'probe set rejects the shipped (locked) broker for originals -> probes are not constant assertions');
  }

  // 6. UNLOCKED VM copy: every original pair through the existing 356 pipeline.
  {
    let n = 0;
    for (const o of originals) {
      const r = await invoke(unlocked, o.id, o.type);
      const target = signTarget(o);
      assert.equal(r.status, 200, o.id + ' ' + o.type + ' ' + JSON.stringify(r.data));
      assert.deepEqual(r.kinds, ['auth', 'grant', 'sign', 'grant'], o.id);
      assert.deepEqual(r.problems, [], o.id);
      assert.equal(r.calls[2].url, target, o.id + ' sign target = staged path');
      assert.equal(r.calls[2].expiresIn, 60);
      assert.equal(new URL(r.data.url).pathname, '/storage/v1/object/sign/' + o.bucket + '/' + o.path);
      assert.deepEqual([r.data.catalog_id, r.data.type, r.data.version, r.data.expires_in], [o.id, o.type, 'v2', 60]);
      n++;
    }
    eq(n, 452, 'unlocked VM: 452/452 original media signed via descriptor->identifyUser->verifyEntitlement->sign->recheck');
  }

  // 7. Full probe set on representative originals (incl. 001 and 226, video + poster).
  for (const [id, type] of [['TK-000001', 'video'], ['TK-000001', 'poster'], ['TK-000113', 'video'],
                            ['TK-000226', 'video'], ['TK-000226', 'poster']]) {
    eq(await probes(unlocked, id, type), [], 'unlocked probes ' + id + ' ' + type);
  }

  // 8. 356 unchanged: real handler == VM copy (same status, body, outgoing request sequence).
  for (const [id, type] of [['TK-000227', 'video'], ['TK-000227', 'poster'], ['TK-000400', 'video'], ['TK-000582', 'poster']]) {
    const a = await invoke(prod, id, type), b = await invoke(unlocked, id, type);
    eq(a.status, 200, '356 production 200 ' + id + ' ' + type);
    eq([b.status, b.data, b.kinds], [a.status, a.data, a.kinds], '356 identical in VM copy ' + id + ' ' + type);
    eq(b.calls.map(c => [c.url, c.opts.method, c.opts.body]), a.calls.map(c => [c.url, c.opts.method, c.opts.body]),
      '356 identical outgoing requests ' + id + ' ' + type);
    eq(await probes(prod, id, type), [], '356 production passes the same probe set ' + id + ' ' + type);
    // Original and 356 share the request shape: only the path differs.
    const orig = await invoke(unlocked, 'TK-000001', type);
    const norm = calls => calls.map(c => [c.kind, c.opts.method, c.opts.body, c.kind === 'sign' ? 'SIGN' : c.url]);
    eq(norm(orig.calls), norm(a.calls), 'original-226 request shape == 356 request shape (' + type + ')');
  }

  // 9. Account grants, TTL, renewal, slow signing, posters, global gates -- on an original.
  const ID = 'TK-000226';
  {
    for (const patch of [{ active: false }, { revoked_at: '2026-11-01T00:00:00Z' }, { scope: 'other' },
      { expires_at: '2026-11-01T00:00:00Z' }, { expires_at: 'bad-date' }, { user_id: UB }]) {
      const r = await invoke(unlocked, ID, 'video', { backend: { grants: [grantRow(UA, patch)] } });
      eq([r.status, r.kinds.includes('sign')], [403, false], 'bad grant ' + JSON.stringify(patch));
    }
    {const r = await invoke(unlocked, ID, 'video', { backend: { grants: [grantRow(UA), grantRow(UA)] } });
     eq([r.status, r.kinds.includes('sign')], [403, false], 'ambiguous duplicate grant rows');}
    {const r = await invoke(unlocked, ID, 'video', { backend: { grantDown: true } });
     eq([r.status, r.data.error, r.kinds.includes('sign')], [503, 'GRANT_BACKEND_UNAVAILABLE', false], 'grant backend down');}
    {const r = await invoke(unlocked, ID, 'video', { backend: { authDown: true } });
     eq([r.status, r.kinds], [401, ['auth']], 'auth backend down');}
    {const r = await invoke(unlocked, ID, 'video', { token: 'Bearer synthetic.unknown.jwt' });
     eq([r.status, r.kinds], [401, ['auth']], 'unknown token');}
    {const r = await invoke(unlocked, ID, 'video', { backend: { grants: [grantRow(UA, { expires_at: new Date(NOW + 20000).toISOString() })] } });
     eq([r.status, r.data.error, r.kinds.includes('sign')], [403, 'ENTITLEMENT_EXPIRING', false], 'grant <31s left: no URL');}
    {const r = await invoke(unlocked, ID, 'video', { backend: { grants: n => n === 1 ? [grantRow(UA)]
       : [grantRow(UA, { expires_at: new Date(NOW + 40000).toISOString() })] } });
     eq([r.status, r.data.error], [403, 'ENTITLEMENT_CHANGED'], 'grant shortened during signing');}
    {const r = await invoke(unlocked, ID, 'video', { backend: { grants: [grantRow(UA, { expires_at: null })] } });
     eq([r.status, r.data.expires_in], [200, 60], 'non-expiring grant -> 60s cap');}
    {let signed = false; const r = await invoke(unlocked, ID, 'video', { now: () => (signed ? NOW + 40000 : NOW),
       backend: { signUrl: u => { signed = true; return u.slice(BASE.length) + '?token=synthetic-000001'; } } });
     eq([r.status, r.data.error], [403, 'SIGNED_MEDIA_EXPIRED'], 'slow signing leaves <31s: URL withheld');}
    // Renewal: each request signs afresh (no cached bearer URL); TTL tracks grant expiry.
    {const grants = [grantRow(UA, { expires_at: new Date(NOW + 100000).toISOString() })];
     const first = await invoke(unlocked, ID, 'video', { backend: { grants, tokenStart: 0 } });
     const renew = await invoke(unlocked, ID, 'video', { backend: { grants, tokenStart: 1 }, now: () => NOW + 50000 });
     const late = await invoke(unlocked, ID, 'video', { backend: { grants, tokenStart: 2 }, now: () => NOW + 75000 });
     eq([first.status, first.data.expires_in, renew.status, renew.data.expires_in], [200, 60, 200, 50], 'renewal TTL');
     ok(first.data.url !== renew.data.url && renew.kinds.join() === 'auth,grant,sign,grant', 'renewal re-signs with a fresh token');
     eq([late.status, late.data.error, late.kinds.includes('sign')], [403, 'ENTITLEMENT_EXPIRING', false], 'renewal stops near grant expiry');}
    // Posters: same pipeline, still behind the independent poster gate.
    {const r = await invoke(unlocked, ID, 'poster', { env: { ...ENV, MOVEKIT_V2_POSTER_UPLOAD_VERIFIED: 'false' } });
     eq([r.status, r.data.error, r.calls.length], [503, 'POSTERS_NOT_RELEASED', 0], 'original poster still needs poster gate');}
    {const r = await invoke(unlocked, ID, 'poster');
     eq([r.status, new URL(r.data.url).pathname], [200, '/storage/v1/object/sign/' + POSTER_BUCKET + '/movekit/v2/poster-optimized/dead-bug.webp'],
       'original poster signs the optimized private WebP');}
    // Same global release checks, before any network.
    for (const [label, o] of [
      ['release blocked', { release: { ...gates, status: 'BLOCKED_NOT_REVIEWED' } }],
      ['inventory digest forged', { release: { ...gates, inventory_sha256: '0'.repeat(64) } }],
      ['poster digest forged', { release: { ...gates, poster_digest_sha256: '0'.repeat(64) } }],
      ['signing env off', { env: { ...ENV, MOVEKIT_V2_SIGNING_ENABLED: 'false' } }],
      ['permission env off', { env: { ...ENV, MOVEKIT_V2_PERMISSION_REVIEWED: 'false' } }],
      ['upload env off', { env: { ...ENV, MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED: 'false' } }],
      ['foreign Supabase host', { env: { ...ENV, SUPABASE_URL: 'https://attacker.invalid' } }]]) {
      const r = await invoke(unlocked, ID, 'video', o);
      eq([r.status, r.calls.length], [503, 0], 'global gate: ' + label);
    }
    // Descriptor fail-closed on the release entry for this exact original asset.
    const vid = expectedFor(ID, 'video');
    for (const patch of [{ storage_path: vid.path.replace('/v2/', '/v1/') }, { bytes: 1 }, { reviewed: false },
      { upload_verified: false }, { review_reference: 'x' }, { catalog_id: 'TK-000225' }]) {
      const r = await invoke(unlocked, ID, 'video', { release: tamper(ID, 'video', patch) });
      eq([r.status, r.calls.length], [404, 0], 'descriptor rejects ' + JSON.stringify(patch));
    }
    {const row = gates.entries.find(e => e.catalog_id === ID && e.media_type === 'video');
     const dup = { ...gates, entries: [...gates.entries.filter(e => e !== row).slice(0, 1162), row, row] };
     eq((await invoke(unlocked, ID, 'video', { release: dup })).status, 404, 'duplicate approval row');}
    // Client can never supply identity, owner approval, path, keys or toggles.
    for (const extraBody of [{ user_id: UA }, { approved: true }, { path: vid.path }, { service_key: SERVICE },
      { original_226_released: true }]) {
      const r = await invoke(unlocked, ID, 'video', { extraBody });
      eq([r.status, r.data.error, r.calls.length], [400, 'INVALID_REQUEST', 0], 'client field rejected ' + Object.keys(extraBody)[0]);
    }
    for (const signUrl of [u => u.slice(BASE.length) + '?token=synthetic-000001&download=1',
      u => u.slice(BASE.length).replace('/dead-bug', '/wall-sit') + '?token=synthetic-000001',
      u => u.slice(BASE.length) + '?token=synthetic-000001#x', () => '/storage/v1/object/public/x']) {
      eq((await invoke(unlocked, ID, 'video', { backend: { signUrl } })).status, 502, 'storage-returned URL validated');
    }
  }

  // 10. Mutation probes: a wrong broker (each one exact edit on top of the VM copy) MUST be caught.
  const MUTANTS = [
    ['descriptor path', "bucket: mediaType === 'video' ? BUCKET : POSTER_BUCKET, path: expected.path",
      "bucket: mediaType === 'video' ? BUCKET : POSTER_BUCKET, path: expected.path.replace('/v2/', '/v1/')"],
    ['bucket swap', "bucket: mediaType === 'video' ? BUCKET : POSTER_BUCKET",
      "bucket: mediaType === 'video' ? POSTER_BUCKET : BUCKET"],
    ['TTL', 'const TTL_SECONDS = 60;', 'const TTL_SECONDS = 600;'],
    ['skip recheck', 'const confirmed = await verifyEntitlement(uid, env.SUPABASE_SERVICE_ROLE_KEY, fetchFn, now);',
      'const confirmed = { ok: true, expiresAt: null };'],
    ['skip auth', "if (!uid) return failure(event, 401, 'AUTH_REQUIRED');", "if (!uid) { /* mutated */ }"],
    ['grant scope', "scope: 'eq.' + SCOPE,", "scope: 'eq.movekit_v1',"],
    ['digest check', 'approved.sha256 !== expected.sha256 ||', ''],
    ['grant TTL cap', 'Math.min(TTL_SECONDS, Math.floor((entitlement.expiresAt - issuedAt) / 1000))', 'TTL_SECONDS'],
    ['URL validation', 'if (parsed.origin !== BASE || parsed.pathname !== expected ||', 'if (parsed.pathname !== expected ||']
  ];
  for (const [label, from, to] of MUTANTS) {
    const mutant = loadVariant(replaceOnce(UNLOCKED_SRC, from, to, 'mutant ' + label), 'mutant-' + label.replace(/\W+/g, '-'));
    const caught = [...await probes(mutant, 'TK-000001', 'video'), ...await probes(mutant, 'TK-000226', 'poster')];
    ok(caught.length > 0, 'mutant "' + label + '" is detected: ' + JSON.stringify([...new Set(caught)]));
  }

  // 11. Nothing on disk changed.
  eq(sha(fs.readFileSync(BROKER_FILE)), brokerBytesBefore, 'broker source bytes unchanged');
  eq(sha(fs.readFileSync(GATES_FILE)), gatesBytesBefore, 'release gates bytes unchanged');

  console.log('TK504 original-226 unified broker bridge: ' + checks + ' assertions PASS; production 452/452 original 404 with 0 requests; ' +
    'test-only VM copy (exact 1 guard removed) signs 452/452 via the existing 356 pipeline; 356 identical; ' +
    MUTANTS.length + '/' + MUTANTS.length + ' wrong-broker mutants caught');
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
