'use strict';
// End-to-end staging contract, entirely synthetic: no real token, private
// storage access, Supabase mutation, license release, or app activation.
const assert = require('node:assert/strict');
const service = require('../netlify/functions/exercise-media-v2-url.js')._internal;
const api = require('./privateMoveKitV2MediaClient.js');
const golden = require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posterIndex = require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const owner = '12345678-1234-4234-8234-123456789abc';
const other = '12345678-1234-4234-8234-123456789def';
const source = golden.items.find(x => x.catalog_id === 'TK-000227');
const optimized = posterIndex.items.find(x => x.catalog_id === source.catalog_id);
const registry = {
  schema: service.SCHEMA,
  status: 'RELEASE_APPROVED',
  inventory_sha256: service.inventorySha,
  poster_digest_sha256: service.posterSha,
  entries: [
    { catalog_id: source.catalog_id, media_type: 'video',
      storage_path: source.video.path, sha256: source.video.sha256,
      bytes: source.video.bytes, reviewed: true, upload_verified: true,
      review_reference: 'TK504-20261103-101', upload_reference: 'TK504-20261103-102' },
    { catalog_id: source.catalog_id, media_type: 'poster',
      storage_path: optimized.path, sha256: optimized.sha256,
      bytes: optimized.bytes, reviewed: true, upload_verified: true,
      review_reference: 'TK504-20261103-103', upload_reference: 'TK504-20261103-104' }
  ]
};
const env = {
  SUPABASE_URL: service.BASE,
  SUPABASE_SERVICE_ROLE_KEY: 'fake-server-credential',
  SUPABASE_ANON_KEY: 'fake-publishable',
  MOVEKIT_V2_SIGNING_ENABLED: 'true',
  MOVEKIT_V2_PERMISSION_REVIEWED: 'true',
  MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED: 'true',
  MOVEKIT_V2_POSTER_UPLOAD_VERIFIED: 'true'
};
const grant = Object.freeze({
  user_id: owner, scope: service.SCOPE, active: true,
  expires_at: '2027-01-01T00:00:00.000Z', revoked_at: null
});
const validToken = 'synthetic.valid.token.1234';
const now = () => Date.parse('2026-11-03T16:00:00.000Z');
let tests = 0;
async function check(label, fn) {
  try { await fn(); tests++; } catch(e) { e.message = label + ': ' + e.message; throw e; }
}
function mockServer(opts = {}) {
  const calls = [];
  const fetchFn = async(url, req) => {
    calls.push({ url, req });
    if (url === service.BASE+'/auth/v1/user') {
      if (opts.authFail) return {ok:false};
      return {ok:true,json:async()=>({
        id:opts.identity || owner,
        user_metadata:{movekit_v2_access:true},
        app_metadata:{movekit_v2_media_access:true}
      })};
    }
    if (url.startsWith(service.BASE+'/rest/v1/movekit_media_grants?')) {
      if (opts.dbFail) return {ok:false};
      return {ok:true,json:async()=> opts.grants===undefined?[grant]:opts.grants};
    }
    if (url.startsWith(service.BASE+'/storage/v1/object/sign/')) {
      return {ok:true,json:async()=>({signedURL:url.slice(service.BASE.length)+'?token=mock-signed-token-12345'})};
    }
    throw Error('UNEXPECTED_URL');
  };
  return {calls,fetchFn};
}
function build(opts = {}) {
  const mock = mockServer(opts);
  const identity = {user: owner};
  const browserFetch = async(url,req) => {
    assert.equal(url,api.REMOTE);
    assert.equal(req.method,'POST');
    assert.equal(req.credentials,'omit');
    assert.equal(req.redirect,'error');
    assert.equal(req.cache,'no-store');
    assert.deepEqual(Object.keys(req.headers).sort(),['Authorization','Content-Type']);
    assert.equal(req.headers.Authorization,'Bearer '+validToken);
    const ev={httpMethod:'POST',headers:{origin:'https://localhost',authorization:req.headers.Authorization},body:req.body};
    const resp=await service.handle(ev,{env:opts.env||env,release:opts.release||registry,fetch:mock.fetchFn,now});
    return {status:resp.statusCode,ok:resp.statusCode>=200&&resp.statusCode<300,
      json:async()=>JSON.parse(resp.body)};
  };
  const client=api.create({
    origin:'https://localhost',fetch:browserFetch,
    tokenProvider:async()=>validToken,
    ownerProvider:()=>identity.user,now
  });
  return {client,mock,identity};
}
(async()=>{
  await check('video success via 3 server-side authorization calls', async()=>{
    const v=build();
    const result=await v.client.get(source.catalog_id,'video',owner);
    assert.equal(result.type,'video');
    assert.equal(result.expiresAt,now()+30000);
    assert.equal(result.version,'v2');
    assert.equal(v.mock.calls.length,3);
    assert.match(result.url,/\/exercise-media\/movekit\/v2\/video\//);
    assert.equal(v.client.activeUi,false);
    assert.equal(v.client.offlineDownloadReleased,false);
  });
  await check('optimized poster success requires same database grant and own bucket', async()=>{
    const v=build();
    const result=await v.client.get(source.catalog_id,'poster',owner);
    assert.equal(result.type,'poster');
    assert.equal(result.expiresAt,now()+30000);
    assert.equal(v.mock.calls.length,3);
    assert.match(result.url,/\/exercise-posters\/movekit\/v2\/poster-optimized\//);
  });
  await check('default checked-in release registry blocks without network', async()=>{
    const defaults=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
    const v=build({release:defaults});
    await assert.rejects(()=>v.client.get(source.catalog_id,'video',owner),/MEDIA_NOT_RELEASED/);
    assert.equal(v.mock.calls.length,0);
  });
  await check('server cannot release poster without independent approval flag', async()=>{
    const v=build({env:{...env,MOVEKIT_V2_POSTER_UPLOAD_VERIFIED:'false'}});
    await assert.rejects(()=>v.client.get(source.catalog_id,'poster',owner),/MEDIA_NOT_RELEASED/);
    assert.equal(v.mock.calls.length,0);
  });
  await check('client never treats editable user_metadata as entitlement', async()=>{
    const v=build({grants:[]});
    await assert.rejects(()=>v.client.get(source.catalog_id,'video',owner),/ENTITLEMENT_REQUIRED/);
    assert.equal(v.mock.calls.filter(c=>c.url.includes('/object/sign/')).length,0);
  });
  await check('valid JWT for other account cannot get current user grant', async()=>{
    const v=build({identity:other});
    await assert.rejects(()=>v.client.get(source.catalog_id,'video',owner),/ENTITLEMENT_REQUIRED/);
    assert.equal(v.mock.calls.filter(c=>c.url.includes('/object/sign/')).length,0);
  });
  await check('revoked entitlement blocks poster too', async()=>{
    const v=build({grants:[{...grant,active:false,revoked_at:'2026-11-01T00:00:00Z'}]});
    await assert.rejects(()=>v.client.get(source.catalog_id,'poster',owner),/ENTITLEMENT_REQUIRED/);
    assert.equal(v.mock.calls.filter(c=>c.url.includes('/object/sign/')).length,0);
  });
  await check('grant backend down yields release unavailable without signing', async()=>{
    const v=build({dbFail:true});
    await assert.rejects(()=>v.client.get(source.catalog_id,'video',owner),/MEDIA_NOT_RELEASED/);
    assert.equal(v.mock.calls.filter(c=>c.url.includes('/object/sign/')).length,0);
  });
  await check('wrong client-side account id cannot fetch', async()=>{
    const v=build();
    await assert.rejects(()=>v.client.get(source.catalog_id,'video',other),/ACCOUNT_MISMATCH/);
    assert.equal(v.mock.calls.length,0);
  });
  await check('wrong catalog id cannot get arbitrary bucket access', async()=>{
    const v=build();
    await assert.rejects(()=>v.client.get('TK-999999','poster',owner),/MEDIA_NOT_FOUND/);
    assert.equal(v.mock.calls.length,0);
  });
  await check('origin restrictions match Netlify and Capacitor',async()=>{
    assert.equal(api.endpoint('https://localhost'),api.REMOTE);
    assert.equal(api.endpoint('capacitor://localhost'),api.REMOTE);
    assert.equal(api.endpoint('https://maurice-art.netlify.app'),api.URI);
    assert.throws(()=>api.endpoint('https://untrusted.invalid'),/UNTRUSTED_APP_ORIGIN/);
  });
  await check('client rejects signed URLs for wrong bucket, host and query',async()=>{
    const endpoint=service.BASE+'/storage/v1/object/sign/exercise-media/movekit/v2/video/'+source.provider_id+'.mp4';
    for (const signed of [endpoint+'?token=a12345678&download=true',
      endpoint.replace(service.BASE,'https://bad.invalid')+'?token=a12345678',
      endpoint.replace('exercise-media','avatars')+'?token=a12345678',
      endpoint+'?token=a12345678#fragment']) {
      assert.throws(()=>api.validUrl(signed,'video'),/INVALID_SIGNED_URL/);
    }
  });
  await check('only approved exact version signed',async()=>{
    const v=build({release:{...registry,poster_digest_sha256:'0'.repeat(64)}});
    await assert.rejects(()=>v.client.get(source.catalog_id,'poster',owner),/MEDIA_NOT_RELEASED/);
    assert.equal(v.mock.calls.length,0);
  });
  await check('inflight response invalidated after user switches',async()=>{
    let releaseReply;
    const slow=api.create({origin:'https://localhost',fetch:()=>new Promise(resolve=>{releaseReply=resolve}),
      tokenProvider:async()=>validToken,ownerProvider:()=>owner,now});
    const pending=slow.get(source.catalog_id,'video',owner);
    await Promise.resolve();
    slow.invalidate();
    releaseReply({status:200,ok:true,json:async()=>({ok:true,catalog_id:source.catalog_id,
      type:'video',version:'v2',expires_in:60,
      url:service.BASE+'/storage/v1/object/sign/exercise-media/'+source.video.path+'?token=mock-signed-token-12345'})});
    await assert.rejects(()=>pending,/STALE_ACCOUNT/);
  });
  console.log('MoveKit V2 client / broker / DB grants: '+tests+' integrated synthetic scenarios PASS, release BLOCKED in checked-in configuration');
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
