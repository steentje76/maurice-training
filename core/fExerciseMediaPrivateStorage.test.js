/* fExerciseMediaPrivateStorage.test.js
 * MOVEKIT PRIVATE MEDIA FOUNDATION — structural + behavioural guard.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const mig = fs.readFileSync(path.join(ROOT, 'migratie_v578.sql'), 'utf8');
const fnPath = path.join(ROOT, 'netlify/functions/exercise-media-url.js');
const src = fs.readFileSync(fnPath, 'utf8');
const api = require(fnPath)._internal;
const catalog = require(path.join(ROOT, 'exercise-catalog.json'));

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m) { ok(a === b, m + ' (got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b) + ')'); }

console.log('1. Private bucket + default deny');
ok(/'exercise-media'[\s\S]{0,100}'exercise-media'[\s\S]{0,100}false/i.test(mig), '1a bucket is private');
ok(/33554432/.test(mig), '1b 32 MiB hard object limit');
ok(/array\['video\/mp4'\]/i.test(mig), '1c only MP4 allowed in Phase 1');
ok(!/create\s+policy[\s\S]*exercise[_ ]media/i.test(mig), '1d migration creates no client access policy');
['select_authenticated','insert_authenticated','update_authenticated','delete_authenticated','public_read'].forEach(function (n) {
  ok(mig.indexOf('exercise_media_' + n) >= 0, '1e reserved policy ' + n + ' explicitly dropped');
});

console.log('2. Canonical server-side mapping');
eq(api.BUCKET, 'exercise-media', '2a fixed bucket');
eq(api.SIGN_TTL_SECONDS, 300, '2b short TTL');
const wall = api.descriptorFor('TK-000206', 'video');
ok(!!wall, '2c known catalog id resolves');
eq(wall.path, 'movekit/v1/video/wall-sit.mp4', '2d path derived from canonical provider slug');
const dead = api.descriptorFor('TK-000226', 'video');
eq(dead.path, 'movekit/v1/video/dead-bug.mp4', '2e Batch 001 identity maps exactly');
eq(api.descriptorFor('TK-999999', 'video'), null, '2f unknown id fails closed');
eq(api.descriptorFor('../../etc/passwd', 'video'), null, '2g path injection id rejected');
eq(api.descriptorFor('TK-000206', 'poster'), null, '2h Phase 1 signs video only');
ok(!/body\.path|body\.slug|body\[['"]path|body\[['"]slug/.test(src), '2i client path/slug is never consumed');

console.log('3. Catalog coverage');
const movekit = (catalog.catalog || []).filter(e => e.source && e.source.provider === 'movekit');
eq(movekit.length, 226, '3a current catalog has 226 MoveKit entries');
const bad = movekit.filter(e => !api.descriptorFor(e.catalog_id, 'video'));
eq(bad.length, 0, '3b every current MoveKit catalog id has safe descriptor');

function event(body, token, method) {
  return {
    httpMethod: method || 'POST',
    headers: { authorization: token || 'Bearer user-token', origin: 'https://trainingskompas.com' },
    body: body == null ? '{}' : JSON.stringify(body)
  };
}
const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service-secret'
};
const uid = '12345678-1234-1234-1234-123456789abc';

function fetchSuccess(url, opts) {
  if (url.endsWith('/auth/v1/user')) return Promise.resolve({ ok: true, json: async () => ({ id: uid }) });
  if (url.indexOf('/storage/v1/object/sign/exercise-media/movekit/v1/video/wall-sit.mp4') >= 0) {
    ok(opts.headers.Authorization === 'Bearer service-secret', '4a signing uses service role server-side');
    ok(JSON.parse(opts.body).expiresIn === 300, '4b sign request uses 300s TTL');
    return Promise.resolve({ ok: true, json: async () => ({ signedURL: '/object/sign/exercise-media/movekit/v1/video/wall-sit.mp4?token=abc' }) });
  }
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
}

(async function () {
  console.log('4. Behavioural access boundary');
  api._resetRate();
  let r = await api.handle(event({ catalog_id: 'TK-000206', type: 'video' }), { env, fetch: fetchSuccess, now: () => 1 });
  eq(r.statusCode, 200, '4c authenticated known media signs');
  const body = JSON.parse(r.body);
  ok(body.url === 'https://example.supabase.co/storage/v1/object/sign/exercise-media/movekit/v1/video/wall-sit.mp4?token=abc', '4d URL normalized to absolute private signed URL');
  ok(body.expires_in === 300, '4e expiry disclosed');
  ok(!('path' in body) && !('slug' in body), '4f canonical storage path not returned separately');
  ok(r.headers['Cache-Control'].indexOf('no-store') >= 0, '4g signed-url response is no-store');

  r = await api.handle(event({ catalog_id: 'TK-000206' }, ''), { env, fetch: async () => ({ ok: false }), now: () => 2 });
  eq(r.statusCode, 401, '4h no valid user token -> unauthorized');

  r = await api.handle(event({ catalog_id: 'TK-999999' }), { env, fetch: async (u) => {
    if (u.endsWith('/auth/v1/user')) return { ok: true, json: async () => ({ id: uid }) };
    throw new Error('signing must not be reached');
  }, now: () => 3 });
  eq(r.statusCode, 404, '4i unknown catalog id never reaches signing');

  r = await api.handle(event({ catalog_id: 'TK-000206', path: 'movekit/v1/video/evil.mp4', slug: 'evil' }), { env, fetch: fetchSuccess, now: () => 4 });
  eq(r.statusCode, 200, '4j extra client path/slug cannot override canonical mapping');
  ok(JSON.parse(r.body).url.indexOf('wall-sit.mp4') >= 0, '4k canonical wall-sit path wins');

  r = await api.handle({ httpMethod: 'OPTIONS', headers: { origin: 'https://localhost' }, body: '' }, { env, fetch: fetchSuccess, now: () => 5 });
  eq(r.statusCode, 204, '4l Android/WebView preflight supported');
  eq(r.headers['Access-Control-Allow-Origin'], 'https://localhost', '4m only allowlisted Android origin reflected');

  const badOrigin = await api.handle({ httpMethod: 'OPTIONS', headers: { origin: 'https://evil.example' }, body: '' }, { env, fetch: fetchSuccess, now: () => 6 });
  ok(!badOrigin.headers['Access-Control-Allow-Origin'], '4n unknown origin is not CORS-enabled');

  console.log('5. Secret / public-route guards');
  ok(!/object\/public\/exercise-media/.test(src), '5a function never builds public storage URL');
  ok(!/console\.(log|error)[^\n]*signed|console\.(log|error)[^\n]*url/i.test(src), '5b no signed URL logging');
  ok(!/SUPABASE_SERVICE_ROLE_KEY\s*\|\|\s*['"]/.test(src), '5c service role has no hard-coded fallback');
  ok(/auth\/v1\/user/.test(src), '5d JWT is verified by Supabase Auth');

  console.log('\n========================================================');
  console.log('fExerciseMediaPrivateStorage.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (fail > 0) process.exit(1);
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
