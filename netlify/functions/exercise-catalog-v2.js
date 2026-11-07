'use strict';
// TK504 #603: authenticated publication of licensed MoveKit batches
// into the EXISTING ExerciseCatalogService. Hard-blocked until owner/content,
// media/upload, typed-FK and customer-entitlement gates are explicitly green.
// NEVER include the private supplier stage/overlays in this GitHub function.
const { _internal:media }=require('./exercise-media-v2-url');
const {createHash}=require('node:crypto');
const BASE=media.BASE;
const release=require('../../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const inventory=require('../../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const HASH=/^[0-9a-f]{64}$/;
const providerById=new Map(inventory.items.map(x=>[x.catalog_id,x.provider_id]));
const SCHEMA='tk504-authorized-catalog-v2/1.0';
const ledger=require('../../core/tk504BatchReleaseLedger.js');
// Release scope comes only from validated media approvals bound to the exact
// owner-approved package prefix 1..N (canonical ledger). Never gaps, partial
// packages, foreign fingerprints or arbitrary row counts.
function releasedScope(config){
 const scope=ledger.releasedScope(config);
 if(!scope)return null;
 for(const entry of config.entries)if(!providerById.has(entry.catalog_id))return null;
 for(const cid of scope.ids){
  if(!media.descriptor(cid,'video',config)||!media.descriptor(cid,'poster',config))return null;
 }
 return scope;
}
function releasedCatalogIds(config){
 const scope=releasedScope(config);
 return scope?scope.ids.slice():null;
}
function headers(event){
 const origin=(event?.headers||{}).origin||(event?.headers||{}).Origin||'';
 // Only emit CORS for the exact already-approved TK origins.
 const h={'Content-Type':'application/json;charset=utf-8',
   'Cache-Control':'private,no-store,max-age=0','Pragma':'no-cache',
   'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
   'Vary':'Origin','Access-Control-Allow-Headers':'Authorization, Content-Type',
   'Access-Control-Allow-Methods':'POST, OPTIONS'};
 const origins=new Set(['https://maurice-art.netlify.app',
  'https://trainingskompas.com','https://www.trainingskompas.com',
  'https://localhost','capacitor://localhost']);
 if(origins.has(origin))h['Access-Control-Allow-Origin']=origin;
 return h;
}
function result(event,status,value){
 return {statusCode:status,headers:headers(event),
  body:status===204?'':JSON.stringify(value)};
}
function deny(event,status,code){return result(event,status,{ok:false,error:code});}
function enabled(env,config){
 return env?.MOVEKIT_V2_CATALOG_METADATA_RELEASED==='true'&&
   env?.MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED==='true'&&
   env?.MOVEKIT_V2_POSTER_UPLOAD_VERIFIED==='true'&&
   media.releaseConfigured(config,env,media.inventorySha);
}
async function getRows(table,query,key,fetchFn){
 const u=BASE+'/rest/v1/'+table+'?'+new URLSearchParams(query);
 const r=await fetchFn(u,{method:'GET',redirect:'error',cache:'no-store',
  headers:{Authorization:'Bearer '+key,apikey:key,Accept:'application/json'}});
 if(!r||!r.ok)return null;
 const rows=await r.json();
 return Array.isArray(rows)?rows:null;
}
function validatePublished(rows,bindings,config){
 const ids=releasedCatalogIds(config);
 if(!ids||!Array.isArray(rows)||rows.length!==ids.length||
   !Array.isArray(bindings)||bindings.length!==ids.length)return null;
 const bMap=new Map();
 for(const b of bindings){
  if(!b||bMap.has(b.catalog_id)||b.active!==true||
    !b.reviewed_at||b.exercise_id!=='TKC-'+String(b.catalog_id||'').slice(3)||
    b.provider_id!==providerById.get(b.catalog_id))return null;
  bMap.set(b.catalog_id,b);
 }
 const out=[];
 for(let i=0;i<ids.length;i++){
  const cid=ids[i],r=rows[i],meta=r?.metadata;
  if(!r||r.catalog_id!==cid||r.provider_id!==providerById.get(cid)||
    r.status!=='published'||!r.approved_at||!r.published_at||
    !bMap.has(cid)||!meta||typeof meta!=='object'||Array.isArray(meta)||
    !media.descriptor(cid,'video',config)||!media.descriptor(cid,'poster',config))
    return null;
  // The backend must serve approved domain metadata, not the private review
  // ledger itself; URLs and cryptographic hashes stay server/private.
  if(meta.catalog_id!==cid||meta.source?.provider!=='movekit'||
    meta.source?.provider_id!==r.provider_id||
    !meta.identity||!meta.intelligence||!meta.relations||!meta.flags||
    meta.assets&&(!Array.isArray(meta.assets)||meta.assets.length!==0))
    return null;
  // Each row must be stamped with the exact owner approval of ITS package.
  if(!ledger.rowApprovalValid(cid,meta))return null;
  out.push({
    catalog_id:cid,source:meta.source,
    identity:meta.identity,intelligence:meta.intelligence,
    relations:meta.relations,flags:meta.flags,
    assets:[],reviewed:true,published:true
  });
 }
 return out;
}
async function handle(event,deps={}){
 const env=deps.env||{},fn=deps.fetch,now=deps.now||Date.now;
 const active=deps.release||release;
 const origin=event?.headers?.origin||event?.headers?.Origin||null;
 if(origin&&!['https://maurice-art.netlify.app','https://trainingskompas.com',
  'https://www.trainingskompas.com','https://localhost','capacitor://localhost'].includes(origin))
  return deny(event,403,'ORIGIN_REJECTED');
 if(event?.httpMethod==='OPTIONS')return result(event,204,{});
 if(event?.httpMethod!=='POST')return deny(event,405,'METHOD_NOT_ALLOWED');
 if(!enabled(env,active))return deny(event,503,'MOVEKIT_CATALOG_NOT_RELEASED');
 const scope=releasedScope(active);
 if(!scope)return deny(event,503,'CATALOG_DATA_NOT_APPROVED');
 const ids=scope.ids;
 const batch=ledger.BATCHES[scope.batch-1];
 if(env.SUPABASE_URL!==BASE||typeof env.SUPABASE_ANON_KEY!=='string'||
   !env.SUPABASE_ANON_KEY||!env.SUPABASE_SERVICE_ROLE_KEY||
   typeof fn!=='function')return deny(event,503,'BACKEND_NOT_READY');
 const uid=await media.identifyUser(
    event?.headers?.authorization||event?.headers?.Authorization,
    env.SUPABASE_ANON_KEY,fn);
 if(!uid)return deny(event,401,'AUTH_REQUIRED');
 const access=await media.verifyEntitlement(uid,env.SUPABASE_SERVICE_ROLE_KEY,fn,now);
 if(!access.ok)return deny(event,access.error==='GRANT_BACKEND_UNAVAILABLE'?503:403,
    access.error);
 try{
  const rows=await getRows('movekit_v2_catalog_publications',{
    select:'catalog_id,provider_id,metadata,status,approved_at,published_at',
    status:'eq.published',catalog_id:'in.('+ids.join(',')+')',
    order:'catalog_id.asc',limit:String(ids.length+1)
  },env.SUPABASE_SERVICE_ROLE_KEY,fn);
  const bindings=await getRows('movekit_catalog_fk_bindings',{
    select:'catalog_id,provider_id,exercise_id,active,reviewed_at',
    active:'eq.true',catalog_id:'in.('+ids.join(',')+')',
    order:'catalog_id.asc',limit:String(ids.length+1)
  },env.SUPABASE_SERVICE_ROLE_KEY,fn);
  const approved=validatePublished(rows,bindings,active);
  if(!approved)return deny(event,503,'CATALOG_DATA_NOT_APPROVED');
  // Check entitlement again before release if data lookups took time.
  const again=await media.verifyEntitlement(uid,env.SUPABASE_SERVICE_ROLE_KEY,fn,now);
  if(!again.ok)return deny(event,403,'ENTITLEMENT_REVOKED');
  return result(event,200,{
    schema:SCHEMA,status:'PUBLISHED_AND_ENTITLED',total:226+approved.length,
    new_count:approved.length,
    release:{batch:batch.batch,through:batch.through,
      display_sha256:batch.display_sha256,decision_id:ledger.DECISION_ID},
    items:approved
  });
 }catch(_){return deny(event,503,'CATALOG_BACKEND_UNAVAILABLE');}
}
exports.handler=event=>handle(event,{env:process.env,fetch:globalThis.fetch,now:Date.now});
exports._internal=Object.freeze({enabled,handle,validatePublished,releasedCatalogIds,releasedScope,headers,SCHEMA});
// Match the canonical Android API preflight contract (I22), not a parallel CORS stack.
exports.handler = require('./_cors.js').withCors(exports.handler);
