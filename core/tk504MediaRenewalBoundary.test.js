'use strict';
// Actual broker/client/bridge functions; only backend responses and time mocked.
const assert=require('node:assert/strict');
const broker=require('../netlify/functions/exercise-media-v2-url')._internal;
const clientApi=require('./privateMoveKitV2MediaClient');
const bridgeApi=require('./movekitV2ExerciseMediaBridge');
const inventory=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const catalog=require('../exercise-catalog.json');
const item=inventory.items.find(x=>x.catalog_id==='TK-000001');
const uid='12345678-1234-4234-8234-123456789abc';
const origin='https://localhost';
const epoch=Date.parse('2026-11-07T00:00:00Z');
const release={schema:broker.SCHEMA,status:'RELEASE_APPROVED',
 inventory_sha256:broker.inventorySha,poster_digest_sha256:broker.posterSha,
 entries:[{catalog_id:item.catalog_id,media_type:'video',storage_path:item.video.path,
 sha256:item.video.sha256,bytes:item.video.bytes,reviewed:true,upload_verified:true,
 review_reference:'TK504-20261107-001',upload_reference:'TK504-20261107-002'}]};
const env={SUPABASE_URL:broker.BASE,SUPABASE_ANON_KEY:'synthetic-public',
 SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',MOVEKIT_V2_SIGNING_ENABLED:'true',
 MOVEKIT_V2_PERMISSION_REVIEWED:'true',MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED:'true'};
const event={httpMethod:'POST',headers:{origin,authorization:'Bearer synthetic.jwt.token'},
 body:JSON.stringify({catalog_id:item.catalog_id,type:'video',version:'v2'})};
async function run(opts={}){
 let clock=epoch,grantCalls=0;const calls=[];
 const fetch=async(url,request)=>{
  calls.push({url,request});
  if(url===broker.BASE+'/auth/v1/user')return {ok:true,json:async()=>({id:uid})};
  if(url.includes('/rest/v1/movekit_media_grants?')){
   grantCalls++;
   if(opts.recheckDown&&grantCalls===2)return {ok:false};
   const expires=opts.expiresIn===null?null:new Date(epoch+(opts.expiresIn??3600)*1000).toISOString();
   return {ok:true,json:async()=>[{user_id:uid,scope:broker.SCOPE,active:!(opts.revoked&&grantCalls===2),
    revoked_at:opts.revoked&&grantCalls===2?new Date(clock).toISOString():null,
    expires_at:opts.shortened&&grantCalls===2?new Date(epoch+40000).toISOString():expires}]};
  }
  if(url.includes('/storage/v1/object/sign/')){
   clock+=(opts.signDelay??0)*1000;
   return {ok:true,json:async()=>({signedURL:url.slice(broker.BASE.length)+'?token=synthetic-signed-token'})};
  }
  throw Error('Unexpected endpoint');
 };
 const response=await broker.handle(event,{env,release,fetch,now:()=>clock});
 return {response,data:JSON.parse(response.body),calls,grantCalls};
}
let passes=0;function ok(value,message){assert(value,message);passes++;}
(async()=>{
 let r=await run();ok(r.response.statusCode===200&&r.grantCalls===2,'normal issuance checks grant again after signing');
 r=await run({revoked:true});ok(r.response.statusCode===403&&!r.data.url,'revocation during signing never releases URL');
 r=await run({expiresIn:35,signDelay:36});ok(r.response.statusCode===403&&!r.data.url,'expiry during signing denied with actual post-sign time');
 r=await run({recheckDown:true});ok(r.response.statusCode===503&&!r.data.url,'failed final grant check fails closed');
 r=await run({expiresIn:45});ok(r.response.statusCode===200&&r.data.expires_in===45,'short grant caps advertised validity');
 const sign=r.calls.find(x=>x.url.includes('/storage/v1/object/sign/'));
 ok(JSON.parse(sign.request.body).expiresIn===45,'Storage requested TTL also capped by grant');
 r=await run({expiresIn:30});ok(r.response.statusCode===403&&!r.calls.some(x=>x.url.includes('/object/sign/')),'expiring grant fails before signing');
 r=await run({shortened:true});ok(r.response.statusCode===403&&!r.data.url,'grant shortened during signing refuses overlong issued ticket');
 r=await run({signDelay:31});ok(r.response.statusCode===403&&!r.data.url,'long signing consumes conservative validity and is denied');
 r=await run({expiresIn:null});ok(r.response.statusCode===200&&r.data.expires_in===60,'unbounded grant still has maximum 60-second ticket');
 const valid=broker.BASE+'/storage/v1/object/sign/exercise-media/'+item.video.path+'?token=synthetic-signed-token';
 ok(clientApi.validUrl(valid,'video',item.provider_id)===valid,'exact registered asset accepted');
 assert.throws(()=>clientApi.validUrl(valid.replace(item.provider_id,'different-valid-slug'),'video',item.provider_id),/SIGNED_ASSET_MISMATCH/);passes++;
 assert.throws(()=>clientApi.validUrl(valid,'video','../bad'),/INVALID_PROVIDER_ID/);passes++;
 let expected;
 const bridge=bridgeApi.create({catalog,mediaClient:{get:async(...args)=>{expected=args;return {};},invalidate(){}}});
 await bridge.requestStaged(catalog.catalog[0],'video',uid);
 ok(expected[3]===catalog.catalog[0].source.provider_id,'existing canonical bridge forwards registered exact provider identity');
 const client=clientApi.create({origin,ownerProvider:()=>uid,tokenProvider:async()=>'synthetic.jwt.token',now:()=>epoch,
 fetch:async()=>({ok:true,status:200,json:async()=>({ok:true,catalog_id:item.catalog_id,type:'video',version:'v2',expires_in:60,
 url:valid.replace(item.provider_id,'different-valid-slug')})})});
 await assert.rejects(()=>client.get(item.catalog_id,'video',uid,item.provider_id),/SIGNED_ASSET_MISMATCH/);passes++;
 console.log('TK504 media renewal/asset boundaries: '+passes+' actual-function synthetic assertions PASS; no real account/media/release');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
