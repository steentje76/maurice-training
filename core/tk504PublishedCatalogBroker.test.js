'use strict';
// Authenticated V2 catalog function integration: synthetic reviewed+entitled
// 356 records. No real user access, storage reads, release or DB writes.
const assert=require('node:assert/strict'),path=require('node:path');
const broker=require('../netlify/functions/exercise-catalog-v2.js')._internal;
const media=require('../netlify/functions/exercise-media-v2-url.js')._internal;
const old=require('../exercise-catalog.json');
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const poster=require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const newRows=golden.items.filter(x=>Number(x.catalog_id.slice(3))>=227)
 .sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id));
const postMap=new Map(poster.items.map(x=>[x.catalog_id,x]));
assert.equal(newRows.length,356);
const SAMPLE=old.catalog[0];
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const goodRows=newRows.map((x,i)=>({
 catalog_id:x.catalog_id,provider_id:x.provider_id,
 metadata:{catalog_id:x.catalog_id,
  source:{provider:'movekit',provider_id:x.provider_id},
  identity:{...SAMPLE.identity,name:'Synthetic movement '+(i+1),nl:'Nieuwe oefening '+(i+1)},
  intelligence:SAMPLE.intelligence,
  relations:{alternatives:[],progressions:[],regressions:[]},
  flags:SAMPLE.flags,assets:[]},
 status:'published',approved_at:'2026-11-06T00:00:00Z',
 published_at:'2026-11-06T00:00:00Z'
}));
const goodBindings=newRows.map(x=>({
 catalog_id:x.catalog_id,provider_id:x.provider_id,
 exercise_id:'TKC-'+x.catalog_id.slice(3),
 active:true,reviewed_at:'2026-11-06T00:00:00Z'
}));
const cfg={
 schema:'trainingskompas-movekit-v2-release/1.0',status:'RELEASE_APPROVED',
 inventory_sha256:media.inventorySha,poster_digest_sha256:media.posterSha,
 entries:newRows.flatMap(x=>[
  {catalog_id:x.catalog_id,media_type:'video',reviewed:true,
   upload_verified:true,review_reference:'TK504-20261106-001',
   upload_reference:'TK504-20261106-001',storage_path:x.video.path,
   sha256:x.video.sha256,bytes:x.video.bytes},
  {catalog_id:x.catalog_id,media_type:'poster',reviewed:true,
   upload_verified:true,review_reference:'TK504-20261106-001',
   upload_reference:'TK504-20261106-001',storage_path:postMap.get(x.catalog_id).path,
   sha256:postMap.get(x.catalog_id).sha256,bytes:postMap.get(x.catalog_id).bytes}
 ])
};
const goodEnv={
 MOVEKIT_V2_CATALOG_METADATA_RELEASED:'true',
 MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED:'true',
 MOVEKIT_V2_POSTER_UPLOAD_VERIFIED:'true',
 MOVEKIT_V2_SIGNING_ENABLED:'true',
 MOVEKIT_V2_PERMISSION_REVIEWED:'true',
 MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED:'true',
 SUPABASE_URL:media.BASE,SUPABASE_ANON_KEY:'synthetic_anon',
 SUPABASE_SERVICE_ROLE_KEY:'synthetic_service'
};
function response(body,ok=true,status=200){
 return {ok,status,json:async()=>body,text:async()=>JSON.stringify(body)};
}
const auth={uid,valid:true,grant:true,grantChecks:0,
 rows:goodRows,bindings:goodBindings,calls:[]};
async function fetchStub(url,opts){
 auth.calls.push({url,method:opts.method});
 if(url.includes('/auth/v1/user'))return response({id:auth.uid},auth.valid);
 if(url.includes('/movekit_media_grants?')){
  auth.grantChecks++;
  return response(auth.grant?[{user_id:auth.uid,scope:'movekit_v2',
    active:true,revoked_at:null,expires_at:null}]:[]);
 }
 if(url.includes('/movekit_v2_catalog_publications?'))return response(auth.rows);
 if(url.includes('/movekit_catalog_fk_bindings?'))return response(auth.bindings);
 throw Error('Unexpected URL in test');
}
function event({method='POST',token=true,origin='https://trainingskompas.com'}={}){
 return {httpMethod:method,headers:{origin,
  ...(token?{authorization:'Bearer synthetic.valid.jwt'}:{})}};
}
function reset(){auth.uid=uid;auth.valid=true;auth.grant=true;
 auth.rows=goodRows;auth.bindings=goodBindings;auth.grantChecks=0;auth.calls=[];}
let checks=0;
async function status(res,wanted,code){
 assert.equal(res.statusCode,wanted);
 if(code)assert.equal(JSON.parse(res.body).error,code);
 checks++;
}
(async()=>{
 const installed=require('../netlify/functions/exercise-catalog-v2.js').handler;
 const preflight=await installed({httpMethod:'OPTIONS',headers:{
  origin:'https://localhost','access-control-request-headers':'authorization'}});
 assert.equal(preflight.statusCode,204);checks++;
 assert.equal(preflight.headers['Access-Control-Allow-Origin'],'https://localhost');checks++;
 assert.match(preflight.headers['Access-Control-Allow-Methods'],/POST/);checks++;
 const blocked=await broker.handle(event(),{env:{},fetch:fetchStub,release:cfg});
 await status(blocked,503,'MOVEKIT_CATALOG_NOT_RELEASED');
 assert.equal(auth.calls.length,0);checks++;
 for(const flag of ['MOVEKIT_V2_CATALOG_METADATA_RELEASED',
  'MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED',
  'MOVEKIT_V2_POSTER_UPLOAD_VERIFIED','MOVEKIT_V2_SIGNING_ENABLED']){
  await status(await broker.handle(event(),{env:{...goodEnv,[flag]:'false'},
   fetch:fetchStub,release:cfg}),503,'MOVEKIT_CATALOG_NOT_RELEASED');
 }
 await status(await broker.handle(event(),{env:goodEnv,fetch:fetchStub}),
  503,'MOVEKIT_CATALOG_NOT_RELEASED'); // real central release doc remains blocked
 await status(await broker.handle(event({method:'GET'}),{env:goodEnv,
  fetch:fetchStub,release:cfg}),405,'METHOD_NOT_ALLOWED');
 await status(await broker.handle(event({origin:'https://attacker.example'}),{env:goodEnv,
  fetch:fetchStub,release:cfg}),403,'ORIGIN_REJECTED');
 await status(await broker.handle(event({token:false}),{env:goodEnv,
  fetch:fetchStub,release:cfg}),401,'AUTH_REQUIRED');
 reset();
 const good=await broker.handle(event(),{env:goodEnv,fetch:fetchStub,release:cfg});
 await status(good,200);
 const obj=JSON.parse(good.body);
 assert.equal(obj.schema,'tk504-authorized-catalog-v2/1.0');checks++;
 assert.equal(obj.status,'PUBLISHED_AND_ENTITLED');checks++;
 assert.equal(obj.items.length,356);checks++;
 assert.equal(obj.items[0].catalog_id,'TK-000227');checks++;
 assert.equal(obj.items[355].catalog_id,'TK-000582');checks++;
 assert(obj.items.every(x=>x.assets.length===0));checks++;
 assert.equal(good.headers['Cache-Control'],'private,no-store,max-age=0');checks++;
 assert.equal(auth.grantChecks,2,'entitlement validated before and after reads');checks++;
 reset();auth.grant=false;
 await status(await broker.handle(event(),{env:goodEnv,fetch:fetchStub,release:cfg}),
  403,'NO_ENTITLEMENT');
 reset();auth.rows=goodRows.slice(0,355);
 await status(await broker.handle(event(),{env:goodEnv,fetch:fetchStub,release:cfg}),
  503,'CATALOG_DATA_NOT_APPROVED');
 reset();auth.rows=goodRows.map((x,i)=>i===0?{...x,status:'staged'}:x);
 await status(await broker.handle(event(),{env:goodEnv,fetch:fetchStub,release:cfg}),
  503,'CATALOG_DATA_NOT_APPROVED');
 reset();auth.rows=goodRows.map((x,i)=>i===0?{...x,
  provider_id:'forged-provider'}:x);
 await status(await broker.handle(event(),{env:goodEnv,fetch:fetchStub,release:cfg}),
  503,'CATALOG_DATA_NOT_APPROVED');
 reset();auth.bindings=goodBindings.slice(1);
 await status(await broker.handle(event(),{env:goodEnv,fetch:fetchStub,release:cfg}),
  503,'CATALOG_DATA_NOT_APPROVED');
 reset();auth.bindings=goodBindings.map((x,i)=>i===0?{...x,active:false}:x);
 await status(await broker.handle(event(),{env:goodEnv,fetch:fetchStub,release:cfg}),
  503,'CATALOG_DATA_NOT_APPROVED');
 reset();const config={...cfg,entries:cfg.entries.slice(2)};
 await status(await broker.handle(event(),{env:goodEnv,fetch:fetchStub,release:config}),
  503,'CATALOG_DATA_NOT_APPROVED');
 reset();
 let n=0;const revokedFetch=async(url,opts)=>{
  if(url.includes('/movekit_media_grants?')){
   n++;return response(n===1?[{user_id:uid,scope:'movekit_v2',
    active:true,revoked_at:null,expires_at:null}]:[]);
  }
  return fetchStub(url,opts);
 };
 await status(await broker.handle(event(),{env:goodEnv,fetch:revokedFetch,release:cfg}),
  403,'ENTITLEMENT_REVOKED');
 const direct=broker.validatePublished(goodRows,goodBindings,cfg);
 assert.equal(direct.length,356);checks++;
 console.log('TK504 authenticated 356-catalog broker: '+checks+
  ' security/functional asserts PASS; no rights => 0 private content, release OFF');
})().catch(err=>{console.error(err);process.exitCode=1;});
