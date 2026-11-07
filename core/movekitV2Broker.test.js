'use strict';
// Synthetic server/entitlement checks only. No real JWT, service key, DB writes,
// purchased videos, posters or pre-signed URLs are used in these tests.
const assert = require('node:assert/strict');
const broker = require('../netlify/functions/exercise-media-v2-url.js')._internal;
const inventory = require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posters = require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const defaultRelease = require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');

const ownerA = '12345678-1234-4234-8234-123456789abc';
const ownerB = '12345678-1234-4234-8234-123456789def';
const origin = 'https://localhost';
const video = inventory.items.find(x => x.catalog_id === 'TK-000001');
assert.ok(video);

const approved = Object.freeze({
  catalog_id: video.catalog_id, media_type: 'video',
  storage_path: video.video.path, sha256: video.video.sha256,
  bytes: video.video.bytes, reviewed: true, upload_verified: true,
  review_reference: 'TK504-20261103-001',
  upload_reference: 'TK504-20261103-002'
});
const approvedPoster = Object.freeze({
  catalog_id: video.catalog_id, media_type: 'poster',
  storage_path: posters.items.find(x => x.catalog_id === video.catalog_id).path,
  sha256: posters.items.find(x => x.catalog_id === video.catalog_id).sha256,
  bytes: posters.items.find(x => x.catalog_id === video.catalog_id).bytes,
  reviewed: true, upload_verified: true,
  review_reference: 'TK504-20261103-003',
  upload_reference: 'TK504-20261103-004'
});
const release = Object.freeze({
  schema: broker.SCHEMA, status: 'RELEASE_APPROVED',
  inventory_sha256: broker.inventorySha,
  poster_digest_sha256: broker.posterSha, entries: [approved, approvedPoster]
});
const env = Object.freeze({
  SUPABASE_URL: broker.BASE,
  SUPABASE_ANON_KEY: 'fake-public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'fake-service-only',
  MOVEKIT_V2_SIGNING_ENABLED: 'true',
  MOVEKIT_V2_PERMISSION_REVIEWED: 'true',
  MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED: 'true',
  MOVEKIT_V2_POSTER_UPLOAD_VERIFIED: 'true'
});
const validGrant = Object.freeze({
  user_id: ownerA, scope: broker.SCOPE, active: true,
  expires_at: '2027-01-01T00:00:00.000Z', revoked_at: null
});
const body = JSON.stringify({ catalog_id: video.catalog_id, type: 'video', version: 'v2' });
function event(auth = 'Bearer fake.jwt.token') {
  return { httpMethod: 'POST', headers: { origin, authorization: auth }, body };
}
const signed = broker.BASE + '/storage/v1/object/sign/' + broker.BUCKET + '/' +
  video.video.path + '?token=fake-signed-token';

function backend(options = {}) {
  const calls = [];
  const result = async (url, opts) => {
    calls.push({ url, opts });
    if (url === broker.BASE + '/auth/v1/user') {
      if (options.authDown) return { ok: false, status: 401 };
      return { ok: true, json: async () => ({ id: options.user || ownerA,
        user_metadata: { premium: true } }) };
    }
    if (url.startsWith(broker.BASE + '/rest/v1/movekit_media_grants?')) {
      if (options.grantDown) return { ok: false, status: 404 };
      return { ok: true, json: async () => options.grants === undefined
        ? [validGrant] : options.grants };
    }
    if (url === broker.BASE + '/storage/v1/object/sign/' + broker.BUCKET + '/' + video.video.path ||
        url === broker.BASE + '/storage/v1/object/sign/' + broker.POSTER_BUCKET + '/' + approvedPoster.storage_path) {
      if (options.signDown) return { ok: false, status: 404 };
      return { ok: true, json: async () => ({ signedURL:
        options.signUrl === undefined ? url.slice(broker.BASE.length) + '?token=fake-signed-token' : options.signUrl }) };
    }
    throw new Error('UNEXPECTED_NETWORK_REQUEST:' + url);
  };
  return { result, calls };
}
async function invoke(ev, opts = {}) {
  const b = backend(opts);
  const resp = await broker.handle(ev, {
    env: opts.env || env,
    release: opts.release || release,
    fetch: b.result,
    now: () => Date.parse('2026-11-03T16:00:00Z')
  });
  return { resp, calls: b.calls, data: resp.body ? JSON.parse(resp.body) : null };
}
let passed = 0;
function check(label, func) {
  return Promise.resolve().then(func).then(() => { passed++; },
    e => { e.message = label + ': ' + e.message; throw e; });
}
(async () => {
  await check('an explicitly disabled release is fully denied', async () => {
    const r = await invoke(event(), { release: {...defaultRelease,status:'BLOCKED_NOT_REVIEWED'} });
    assert.equal(r.resp.statusCode, 503);
    assert.equal(r.data.error, 'V2_NOT_RELEASED');
    assert.equal(r.calls.length, 0);
  });
  await check('all three env release gates required', async () => {
    for (const key of ['MOVEKIT_V2_SIGNING_ENABLED',
                       'MOVEKIT_V2_PERMISSION_REVIEWED',
                       'MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED']) {
      const r = await invoke(event(), { env: { ...env, [key]: 'false' } });
      assert.equal(r.resp.statusCode, 503);
      assert.equal(r.calls.length, 0);
    }
  });
  await check('inventory digest gate cannot be forged by client', async () => {
    const r = await invoke(event(), { release: { ...release, inventory_sha256: '0'.repeat(64) } });
    assert.equal(r.resp.statusCode, 503);
  });
  await check('optimized poster source digest is also release-bound', async () => {
    const r = await invoke(event(), { release: { ...release, poster_digest_sha256: '0'.repeat(64) } });
    assert.equal(r.resp.statusCode, 503);
    assert.equal(r.calls.length, 0);
  });
  await check('poster media requires explicit independent server gate', async () => {
    const e = event(); e.body = JSON.stringify({catalog_id:video.catalog_id,type:'poster',version:'v2'});
    const r = await invoke(e, {env:{...env,MOVEKIT_V2_POSTER_UPLOAD_VERIFIED:'false'}});
    assert.equal(r.resp.statusCode, 503);
    assert.equal(r.calls.length,0);
  });
  await check('poster matching canonical hash is authorized with independent DB grant', async () => {
    const e = event(); e.body = JSON.stringify({catalog_id:video.catalog_id,type:'poster',version:'v2'});
    const r = await invoke(e);
    assert.equal(r.resp.statusCode,200);
    assert.equal(r.data.type,'poster');
    assert.equal(r.data.url,broker.BASE+'/storage/v1/object/sign/'+broker.POSTER_BUCKET+'/'+approvedPoster.storage_path+'?token=fake-signed-token');
    assert.equal(r.calls.length,4);
  });
  await check('optimized poster hash mismatch blocks signing', async () => {
    const e = event(); e.body = JSON.stringify({catalog_id:video.catalog_id,type:'poster',version:'v2'});
    const r = await invoke(e,{release:{...release,entries:[approved,{...approvedPoster,sha256:'0'.repeat(64)}]}});
    assert.equal(r.resp.statusCode,404);
    assert.equal(r.calls.length,0);
  });
  await check('empty or too-large approval lists are blocked', async () => {
    assert.equal(broker.releaseConfigured({ ...release, entries: [] }, env), false);
    assert.equal(broker.releaseConfigured({ ...release, entries: new Array(1165).fill(approved) }, env), false);
  });
  await check('untrusted browser origin blocked', async () => {
    const ev = event(); ev.headers.origin = 'https://evil.example';
    const r = await invoke(ev); assert.equal(r.resp.statusCode, 403); assert.equal(r.calls.length, 0);
  });
  await check('OPTIONS works without signing', async () => {
    const r = await invoke({ httpMethod: 'OPTIONS', headers: { origin }, body: '' });
    assert.equal(r.resp.statusCode, 204);
    assert.equal(r.resp.headers['Access-Control-Allow-Origin'], origin);
    assert.equal(r.calls.length, 0);
  });
  await check('GET rejected', async () => {
    const ev = event(); ev.httpMethod = 'GET';
    const r = await invoke(ev); assert.equal(r.resp.statusCode, 405);
    assert.equal(r.calls.length, 0);
  });
  await check('unknown fields including path override rejected', async () => {
    const ev = event(); ev.body = JSON.stringify({ catalog_id: video.catalog_id,
      type: 'video', version: 'v2', path: '../../private' });
    const r = await invoke(ev); assert.equal(r.resp.statusCode, 400);
    assert.equal(r.calls.length, 0);
  });
  await check('unapproved or invalid media type rejected', async () => {
    const ev = event(); ev.body = JSON.stringify({ catalog_id: video.catalog_id, type: 'raw', version: 'v2' });
    const r = await invoke(ev); assert.equal(r.resp.statusCode, 400);
  });
  await check('unknown exercise not approved', async () => {
    const ev = event(); ev.body = JSON.stringify({ catalog_id: 'TK-999999', type: 'video', version: 'v2' });
    const r = await invoke(ev); assert.equal(r.resp.statusCode, 404);
    assert.equal(r.calls.length, 0);
  });
  await check('unreviewed content fails closed', async () => {
    for (const patch of [{ reviewed: false }, { upload_verified: false },
      { storage_path: 'movekit/v1/video/unapproved.mp4' },
      { sha256: '0'.repeat(64) }, { bytes: 1 }, { review_reference: '' }]) {
      const r = await invoke(event(), { release: { ...release, entries: [{ ...approved, ...patch }] } });
      assert.equal(r.resp.statusCode, 404);
      assert.equal(r.calls.length, 0);
    }
  });
  await check('duplicate approvals rejected', async () => {
    const r = await invoke(event(), { release: { ...release, entries: [approved, approved] } });
    assert.equal(r.resp.statusCode, 404);
  });
  await check('missing bearer token denied without grant or signer access', async () => {
    const r = await invoke(event(''));
    assert.equal(r.resp.statusCode, 401);
    assert.equal(r.calls.filter(c => c.url.includes('/rest/v1/')).length, 0);
  });
  await check('untrusted auth service response denied', async () => {
    const r = await invoke(event(), { authDown: true });
    assert.equal(r.resp.statusCode, 401);
  });
  await check('metadata subscription flag is not an entitlement', async () => {
    const r = await invoke(event(), { grants: [] });
    assert.equal(r.resp.statusCode, 403);
    assert.equal(r.calls.filter(c => c.url.includes('/storage/v1/object/sign/')).length, 0);
  });
  await check('cross-account grant denied', async () => {
    const r = await invoke(event(), { user: ownerB });
    assert.equal(r.resp.statusCode, 403);
  });
  await check('inactive, revoked, malformed and expired grants denied', async () => {
    for (const patch of [{ active: false }, { revoked_at: '2026-11-01T00:00:00Z' },
      { expires_at: '2026-11-02T00:00:00Z' }, { expires_at: 'bad-date' },
      { expires_at: undefined }, { scope: 'other' }]) {
      const r = await invoke(event(), { grants: [{ ...validGrant, ...patch }] });
      assert.equal(r.resp.statusCode, 403);
      assert.equal(r.calls.filter(c => c.url.includes('/storage/v1/object/sign/')).length, 0);
    }
  });
  await check('grant service missing fails unavailable closed', async () => {
    const r = await invoke(event(), { grantDown: true });
    assert.equal(r.resp.statusCode, 503);
    assert.equal(r.calls.filter(c => c.url.includes('/storage/v1/object/sign/')).length, 0);
  });
  await check('no arbitrary Supabase host', async () => {
    const r = await invoke(event(), { env: { ...env, SUPABASE_URL: 'https://attacker.invalid' } });
    assert.equal(r.resp.statusCode, 503);
    assert.equal(r.calls.length, 0);
  });
  await check('valid current user plus active grant gives 60s URL', async () => {
    const r = await invoke(event());
    assert.equal(r.resp.statusCode, 200);
    assert.equal(r.data.url, signed);
    assert.equal(r.data.expires_in, 60);
    assert.equal(r.data.version, 'v2');
    assert.equal(r.calls.length, 4);
    assert.match(r.resp.headers['Cache-Control'], /no-store/);
    const grantCall = r.calls[1];
    const parsed = new URL(grantCall.url);
    assert.equal(parsed.searchParams.get('user_id'), 'eq.' + ownerA);
    assert.equal(parsed.searchParams.get('scope'), 'eq.movekit_v2');
    assert.equal(r.calls[2].opts.method, 'POST');
    assert.equal(JSON.parse(r.calls[2].opts.body).expiresIn, 60);
    assert.equal(r.data.url.includes('fake-service-only'), false);
  });
  await check('sign backend failure does not expose details', async () => {
    const r = await invoke(event(), { signDown: true });
    assert.equal(r.resp.statusCode, 502);
    assert.equal(r.data.error, 'SIGNED_MEDIA_UNAVAILABLE');
  });
  await check('foreign host, wrong path, download or extra token query denied', async () => {
    for (const url of [
      signed.replace(broker.BASE, 'https://attacker.invalid'),
      signed.replace('/v2/', '/v1/'),
      signed + '&download=true',
      signed.replace('token=fake-signed-token', 'token=bad'),
      signed + '#fragment'
    ]) {
      const r = await invoke(event(), { signUrl: url });
      assert.equal(r.resp.statusCode, 502, url);
    }
  });
  await check('headers and response never authorize via client user id', async () => {
    const ev = event();
    ev.body = JSON.stringify({ catalog_id: video.catalog_id, type: 'video', version: 'v2', user_id: ownerA });
    const r = await invoke(ev);
    assert.equal(r.resp.statusCode, 400);
    assert.equal(r.calls.length, 0);
  });
  await check('malformed body and too-large payload are rejected', async () => {
    const ev = event(); ev.body = '{';
    assert.equal((await invoke(ev)).resp.statusCode, 400);
    ev.body = 'x'.repeat(2000);
    assert.equal((await invoke(ev)).resp.statusCode, 413);
  });
  console.log('MoveKit V2 private signing broker: ' + passed +
    ' deterministic security/authorization checks PASS; release defaults BLOCKED');
})().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
