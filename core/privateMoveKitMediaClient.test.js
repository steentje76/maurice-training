'use strict';
const assert=require('node:assert/strict');
const C=require('./privateMoveKitMediaClient.js');
const A='12345678-1234-4234-8234-123456789abc';
const B='12345678-1234-4234-8234-123456789def';
const URL_OK=C.STORAGE_ORIGIN+'/storage/v1/object/sign/exercise-media/movekit/v2/video/wall-sit.mp4?token=temporary';
let calls=0,owner=A,passed=0;
const response=(url,cat,status)=>({ok:!status,status:status||200,json:async()=>({ok:true,catalog_id:cat||'TK-000206',type:'video',expires_in:300,url:url||URL_OK})});
const client=C.create({
 fetch:async(path,opts)=>{
   calls++;
   assert.equal(path,'/.netlify/functions/exercise-media-url');
   assert.equal(opts.method,'POST');assert.equal(opts.cache,'no-store');
   assert.equal(opts.headers.Authorization,'Bearer temporary-user-token');
   assert.equal(JSON.parse(opts.body).type,'video');
   assert(!JSON.stringify(opts.body).includes('/video/'));
   return response();
 },
 tokenProvider:async()=> 'temporary-user-token',ownerProvider:()=>owner,now:()=>2000
});
(async()=>{
 const result=await client.get('TK-000206',A);
 assert.equal(result.url,URL_OK);passed++;
 assert.equal(result.expiresAt,301000);passed++;
 assert.equal(result.catalogId,'TK-000206');passed++;
 assert.equal(client.offlineVideoDownloadAllowed,false);passed++;
 assert.equal(calls,1);passed++;
 await assert.rejects(()=>client.get('../../file.mp4',A),/INVALID_CATALOG_ID/);passed++;
 await assert.rejects(()=>client.get('TK-000206',B),/ACCOUNT_MISMATCH/);passed++;
 assert.equal(calls,1);passed++;
 const badUrls=[
 'http://mhfxhzkdmgkaplicdszg.supabase.co/storage/v1/object/sign/exercise-media/movekit/v2/video/x.mp4?token=x',
 'https://evil.example/storage/v1/object/sign/exercise-media/movekit/v2/video/x.mp4?token=x',
 C.STORAGE_ORIGIN+'/storage/v1/object/public/exercise-media/movekit/v2/video/x.mp4?token=x',
 C.STORAGE_ORIGIN+'/storage/v1/object/sign/exercise-media/movekit/v2/video/x.mp4',
 C.STORAGE_ORIGIN+'/storage/v1/object/sign/exercise-media/movekit/v2/video/x.mp4?token=x&download=1',
 C.STORAGE_ORIGIN+'/storage/v1/object/sign/exercise-media/movekit/v2/video/x.mp4?token=x#fragment',
 C.STORAGE_ORIGIN+'/storage/v1/object/sign/exercise-media/movekit/v2/video/x.txt?token=x'
 ];
 for (const raw of badUrls){
   const bad=C.create({fetch:async()=>response(raw),tokenProvider:async()=> 'temporary-user-token',ownerProvider:()=>A});
   await assert.rejects(()=>bad.get('TK-000206',A),/INVALID_SIGNED_URL/);passed++;
 }
 for(const [status,code] of [[401,'AUTH_REQUIRED'],[403,'AUTH_REQUIRED'],[404,'MEDIA_NOT_FOUND'],[429,'RATE_LIMITED'],[502,'PRIVATE_MEDIA_UNAVAILABLE']]){
   const c=C.create({fetch:async()=>response(null,null,status),tokenProvider:async()=> 'temporary-user-token',ownerProvider:()=>A});
   await assert.rejects(()=>c.get('TK-000206',A),new RegExp(code));passed++;
 }
 const malformed=C.create({fetch:async()=>({ok:true,json:async()=>({ok:true,catalog_id:'TK-000206',type:'video',expires_in:999,url:URL_OK})}),tokenProvider:async()=> 'temporary-user-token',ownerProvider:()=>A});
 await assert.rejects(()=>malformed.get('TK-000206',A),/INVALID_BROKER_RESPONSE/);passed++;
 const noauth=C.create({fetch:async()=>{throw new Error('unreachable');},tokenProvider:async()=> '',ownerProvider:()=>A});
 await assert.rejects(()=>noauth.get('TK-000206',A),/AUTH_REQUIRED/);passed++;
 let finish;
 const paused=new Promise(resolve=>{finish=resolve;});
 const stale=C.create({fetch:()=>paused,tokenProvider:async()=> 'temporary-user-token',ownerProvider:()=>owner});
 const pending=stale.get('TK-000206',A);
 await Promise.resolve();await Promise.resolve();
 owner=B;stale.invalidate();finish(response());
 await assert.rejects(()=>pending,/STALE_ACCOUNT/);passed++;
 owner=A;
 let finish2;
 const pause2=new Promise(resolve=>{finish2=resolve;});
 const same=C.create({fetch:async()=>pause2,tokenProvider:async()=> 'temporary-user-token',ownerProvider:()=>owner});
 const p1=same.get('TK-000206',A),p2=same.get('TK-000206',A);
 finish2(response());assert.equal((await p1).catalogId,'TK-000206');assert.equal((await p2).catalogId,'TK-000206');passed++;
 console.log('Private MoveKit broker client contract: '+passed+' security checks PASS');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});