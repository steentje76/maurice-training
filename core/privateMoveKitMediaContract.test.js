/* Real server/client contract for MoveKit private streaming: no network, no licensed bytes.
 * Exercises the current deployed broker source and the staged Android/WebView client
 * together. The signed private V1 URL is consumed in memory, never persisted.
 */
'use strict';
const assert=require('node:assert/strict');
const { _internal:broker }=require('../netlify/functions/exercise-media-url.js');
const clientApi=require('./privateMoveKitMediaClient.js');
const OWNER='12345678-1234-4234-8234-123456789abc';
const BASE='https://mhfxhzkdmgkaplicdszg.supabase.co';
let authCalls=0,signCalls=0,passed=0;
const env={
 SUPABASE_URL:BASE,
 SUPABASE_ANON_KEY:'test-publishable',
 SUPABASE_SERVICE_ROLE_KEY:'test-private-role'
};
const fakeBackend=async(url,opts)=>{
 if(url===BASE+'/auth/v1/user'){
   authCalls++;
   assert.equal(opts.headers.Authorization,'Bearer test-valid-user-token');
   return {ok:true,json:async()=>({id:OWNER})};
 }
 if(url===BASE+'/storage/v1/object/sign/exercise-media/movekit/v1/video/wall-sit.mp4'){
   signCalls++;
   assert.equal(opts.method,'POST');
   assert.equal(opts.headers.Authorization,'Bearer test-private-role');
   assert.equal(JSON.parse(opts.body).expiresIn,300);
   return {ok:true,json:async()=>({signedURL:'/object/sign/exercise-media/movekit/v1/video/wall-sit.mp4?token=from-server-signature'})};
 }
 return {ok:false,status:404,json:async()=>({})};
};
const transport=async(path,opts)=>{
 assert.equal(path,clientApi.REMOTE_BROKER,'Android never sends to localhost');
 assert.equal(opts.credentials,'omit');
 assert.equal(opts.redirect,'error');
 assert.equal(opts.cache,'no-store');
 assert.equal(opts.headers.Authorization,'Bearer test-valid-user-token');
 const r=await broker.handle({
   httpMethod:'POST',
   headers:{origin:'https://localhost',authorization:opts.headers.Authorization},
   body:opts.body
 },{env,fetch:fakeBackend,now:()=>10000});
 assert.equal(r.headers['Access-Control-Allow-Origin'],'https://localhost');
 assert.match(r.headers['Cache-Control'],/no-store/);
 return {ok:r.statusCode>=200&&r.statusCode<300,status:r.statusCode,json:async()=>JSON.parse(r.body)};
};
(async()=>{
 broker._resetRate();
 const client=clientApi.create({origin:'https://localhost',ownerProvider:()=>OWNER,
 tokenProvider:async()=> 'test-valid-user-token',fetch:transport,now:()=>10000});
 const signed=await client.get('TK-000206',OWNER);
 assert.equal(signed.catalogId,'TK-000206');passed++;
 assert.equal(signed.url,BASE+'/storage/v1/object/sign/exercise-media/movekit/v1/video/wall-sit.mp4?token=from-server-signature');passed++;
 assert.equal(signed.expiresAt,280000);passed++;
 assert.equal(authCalls,1);passed++;
 assert.equal(signCalls,1);passed++;
 assert.equal(client.offlineVideoDownloadAllowed,false);passed++;
 await assert.rejects(()=>client.get('TK-000227',OWNER),/MEDIA_NOT_FOUND/);passed++;
 assert.equal(signCalls,1);passed++;
 // Client cannot cause traversal/slug or bucket/URL override, even with extra fields.
 const bad=broker.descriptorFor('../../etc/passwd','video');
 assert.equal(bad,null);passed++;
 assert.equal(broker.descriptorFor('TK-000206','poster'),null);passed++;
 assert.equal(broker.MEDIA_VERSION,'v1');passed++;
 const malformed=clientApi.create({origin:'https://localhost',fetch:async()=>({ok:true,json:async()=>({
 ok:true,catalog_id:'TK-000206',type:'video',expires_in:300,
 url:BASE+'/storage/v1/object/sign/exercise-media/movekit/v2/video/wall-sit.mp4?token=x'
 })}),ownerProvider:()=>OWNER,tokenProvider:async()=> 'test-valid-user-token'});
 await assert.rejects(()=>malformed.get('TK-000206',OWNER),/INVALID_SIGNED_URL/);passed++;
 console.log('MoveKit actual broker/client native contract: '+passed+' PASS; v1 only; no raw downloads');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});