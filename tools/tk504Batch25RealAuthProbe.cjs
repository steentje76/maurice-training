'use strict';
// Optional addition to tk603-real-auth-captured-schema.cjs --batch25.
// Real local Auth/PostgREST, synthetic metadata and local-only release evidence.
// No cloud, licensed content, Storage, browser, media signing or production grant.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=async function({root,rest,auth,A,B,query,sql,assert,serviceJwt}){
 const broker=require(path.join(root,'netlify/functions/exercise-catalog-v2.js'))._internal;
 const media=require(path.join(root,'netlify/functions/exercise-media-v2-url.js'))._internal;
 const Runtime=require(path.join(root,'core/tk504PublishedCatalogRuntime.js'));
 const golden=require(path.join(root,'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'));
 const posters=require(path.join(root,'docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json'));
 const baseline=require(path.join(root,'exercise-catalog.json'));
 const rows=golden.items.filter(x=>Number(x.catalog_id.slice(3))>=227)
  .sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id)).slice(0,26);
 const postMap=new Map(posters.items.map(x=>[x.catalog_id,x]));
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const metadata=rows.map((row,i)=>({
  catalog_id:row.catalog_id,source:{provider:'movekit',provider_id:row.provider_id},
  identity:{...structuredClone(baseline.catalog[0].identity),
   name:'Synthetic batch movement '+(i+1),nl:'Synthetische batchoefening '+(i+1)},
  intelligence:structuredClone(baseline.catalog[0].intelligence),
  relations:{alternatives:[],progressions:[],regressions:[]},
  flags:structuredClone(baseline.catalog[0].flags),assets:[]
 }));
 const config={schema:'trainingskompas-movekit-v2-release/1.0',status:'RELEASE_APPROVED',
  inventory_sha256:media.inventorySha,poster_digest_sha256:media.posterSha,
  entries:rows.slice(0,25).flatMap(row=>['video','poster'].map(type=>{
   const asset=type==='video'?row.video:postMap.get(row.catalog_id);
   return {catalog_id:row.catalog_id,media_type:type,reviewed:true,upload_verified:true,
    review_reference:'TK504-20261107-001',upload_reference:'TK504-20261107-001',
    storage_path:asset.path,sha256:asset.sha256,bytes:asset.bytes};
  }))
 };
 const env={
  MOVEKIT_V2_CATALOG_METADATA_RELEASED:'true',MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED:'true',
  MOVEKIT_V2_POSTER_UPLOAD_VERIFIED:'true',MOVEKIT_V2_SIGNING_ENABLED:'true',
  MOVEKIT_V2_PERMISSION_REVIEWED:'true',MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED:'true',
  SUPABASE_URL:media.BASE,SUPABASE_ANON_KEY:'local-synthetic-anon',
  SUPABASE_SERVICE_ROLE_KEY:serviceJwt
 };
 for(const migration of ['20261103155325_tk504_movekit_v2_media_grants.sql',
  '20261106161000_tk504_published_catalog_stage.sql']){
  sql(fs.readFileSync(path.join(root,'supabase/migrations',migration),'utf8'));
 }
 for(const row of rows)sql("update public.movekit_catalog_fk_bindings set provider_id="+
  literal(row.provider_id)+",active=true,reviewed_at=clock_timestamp() where catalog_id="+literal(row.catalog_id));
 for(const meta of metadata)sql("insert into public.movekit_v2_catalog_publications"+
  "(catalog_id,provider_id,metadata) values("+literal(meta.catalog_id)+","+
  literal(meta.source.provider_id)+","+literal(JSON.stringify(meta))+"::jsonb)");
 sql("insert into public.movekit_media_grants(user_id,grant_reference) values("+
  literal(A.id)+",'TK504-20261107-001'); notify pgrst,'reload schema';");
 let r;
 for(let attempt=0;attempt<50;attempt++){
  r=await query('/movekit_v2_catalog_publications?select=catalog_id&limit=0',{token:serviceJwt});
  if(r.status===200)break;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert(r.status===200,'batch25 actual PostgREST schema exposes server-only publication table');
 for(const table of ['movekit_v2_catalog_publications','movekit_media_grants']){
  for(const who of [null,A,B]){
   r=await query('/'+table+'?select=*',who);
   assert([401,403].includes(r.status),'batch25 browser/anonymous cannot SELECT '+table);
  }
  r=await query('/'+table,{token:serviceJwt},'POST',{});
  assert(r.status===403,'batch25 service_role cannot INSERT '+table);
 }
 let requests=0,publicationReads=0,grantReads=0,revocationHook=null;
 async function localFetch(url,options){
  requests++;
  const target=new URL(url),base=new URL(media.BASE);
  if(target.origin!==base.origin)throw Error('Remote transport denied');
  let local;
  if(target.pathname==='/auth/v1/user')local=auth+'/user';
  else if(target.pathname.startsWith('/rest/v1/')){
   if(target.pathname.includes('/movekit_v2_catalog_publications'))publicationReads++;
   if(target.pathname.includes('/movekit_media_grants')){
    grantReads++;if(revocationHook)await revocationHook(grantReads);
   }
   local=rest+target.pathname.slice('/rest/v1'.length)+target.search;
  }else throw Error('Non-auth/REST transport denied');
  return fetch(local,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});
 }
 const event=user=>({httpMethod:'POST',headers:{origin:'https://trainingskompas.com',
  ...(user?{authorization:'Bearer '+user.token}:{})}});
 const handle=(user,release=config)=>broker.handle(event(user),{env,fetch:localFetch,release});
 r=await handle(A,require(path.join(root,'docs/generated/MOVEKIT_V2_RELEASE_GATES.json')));
 assert(r.statusCode===503&&requests===0,'batch25 real blocked release doc prevents every network request');
 r=await handle(null);assert(r.statusCode===401,'batch25 actual broker rejects missing Auth');
 r=await handle(A);assert(r.statusCode===403&&publicationReads===0,'batch25 inactive real grant blocks metadata reads');
 r=await handle(B);assert(r.statusCode===403&&publicationReads===0,'batch25 second real account has no implicit grant');
 sql("update public.movekit_media_grants set active=true where user_id="+literal(A.id));
 r=await handle(A);assert(r.statusCode===503,'batch25 real staged publications remain unavailable');
 // Include a 26th published control row: the explicit 25-item server filter
 // must exclude it rather than trusting the total number of published rows.
 sql("update public.movekit_v2_catalog_publications set status='published',"+
  "reviewed_at=clock_timestamp(),approved_at=clock_timestamp(),published_at=clock_timestamp();");
 const before=grantReads;
 r=await handle(A);assert(r.statusCode===200,'batch25 actual Auth and PostgREST serve first authorized batch');
 const answer=JSON.parse(r.body);
 assert(answer.new_count===25&&answer.total===251&&answer.items.length===25,
  'batch25 actual broker returns exactly 25 additions and total 251');
 assert(answer.items[0].catalog_id==='TK-000227'&&answer.items[24].catalog_id==='TK-000251'&&
  !answer.items.some(x=>x.catalog_id==='TK-000252'),
  'batch25 physical 26th publication never leaks outside approved manifest range');
 assert(grantReads===before+2,'batch25 real entitlement is checked before and after publication reads');
 const catalog=structuredClone(baseline),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const begin=html.indexOf('var ExerciseCatalogService=(function(){'),end=html.indexOf('\n})();',begin);
 if(begin<0||end<begin)throw Error('Actual ECS not found');
 const context=vm.createContext({EX_CATALOG:catalog,localStorage:{getItem:()=>null,setItem(){}},
  favoriteExIds:new Set(),performance:{now:()=>0},console,window:{},Set,Date});
 vm.runInContext(html.slice(begin,end+5),context,{timeout:5000});
 const runtime=Runtime.create({catalog,service:context.ExerciseCatalogService});
 const installed=runtime.mount(answer,A.id,()=>A.id);
 assert(installed.count===251&&installed.added===25,'batch25 actual server response mounts into real ECS');
 for(const row of rows.slice(0,25)){
  assert(context.ExerciseCatalogService.byId(row.catalog_id)?.source.provider_id===row.provider_id,
   'batch25 exact ECS identity '+row.catalog_id);
  await require('./tk603ActualWriterProbe.cjs')({root,rest,A,B,query,sql,assert,
   sourceCatalog:catalog.catalog,catalogId:row.catalog_id,priorProvider:row.provider_id});
 }
 assert(runtime.clear()&&catalog.count===226&&context.ExerciseCatalogService.byId('TK-000227')===null,
  'batch25 owner reset removes all new catalog identities');
 sql("update public.movekit_catalog_fk_bindings set active=false where catalog_id='TK-000251';");
 r=await handle(A);assert(r.statusCode===503,'batch25 missing active real FK blocks entire batch');
 sql("update public.movekit_catalog_fk_bindings set active=true where catalog_id='TK-000251';");
 let seen=0;revocationHook=async()=>{if(++seen===2)sql(
  "update public.movekit_media_grants set active=false,revoked_at=clock_timestamp() where user_id="+literal(A.id));};
 r=await handle(A);
 assert(r.statusCode===403&&JSON.parse(r.body).error==='ENTITLEMENT_REVOKED',
  'batch25 actual grant revocation during metadata reads prevents response');
 revocationHook=null;
 r=await handle(B);assert(r.statusCode===403,'batch25 second account remains denied after complete probe');
 console.log('BATCH25 COMPLETE: actual broker/Auth/PostgREST/ECS and 25 actual app writers; synthetic content only.');
};
