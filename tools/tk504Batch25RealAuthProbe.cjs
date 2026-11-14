'use strict';
// Optional addition to tk603-real-auth-captured-schema.cjs --batch25 / --packages.
// Real local Auth/PostgREST, synthetic metadata and local-only release evidence.
// No cloud, licensed content, Storage, browser, media signing or production grant.
// Release configs come from the canonical package ledger (owner fingerprints).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=async function({root,rest,auth,A,B,query,sql,assert,serviceJwt,packages=[1],onPackage}){
 const broker=require(path.join(root,'netlify/functions/exercise-catalog-v2.js'))._internal;
 const media=require(path.join(root,'netlify/functions/exercise-media-v2-url.js'))._internal;
 const Runtime=require(path.join(root,'core/tk504PublishedCatalogRuntime.js'));
 const ledger=require(path.join(root,'core/tk504BatchReleaseLedger.js'));
 const golden=require(path.join(root,'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'));
 const posters=require(path.join(root,'docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json'));
 const baseline=require(path.join(root,'exercise-catalog.json'));
 const last=Math.max(...packages),full=packages.length>1;
 // Batch-25 mode keeps its 26th physically published control row; package
 // mode physically publishes all 356 and releases them package by package.
 const rows=golden.items.filter(x=>Number(x.catalog_id.slice(3))>=227)
  .sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id)).slice(0,full?356:26);
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const metadata=rows.map((row,i)=>{const b=ledger.batchOf(row.catalog_id);return {
  catalog_id:row.catalog_id,source:{provider:'movekit',provider_id:row.provider_id},
  identity:{...structuredClone(baseline.catalog[0].identity),
   name:'Synthetic batch movement '+(i+1),nl:'Synthetische batchoefening '+(i+1)},
  intelligence:structuredClone(baseline.catalog[0].intelligence),
  relations:{alternatives:[],progressions:[],regressions:[]},
  flags:structuredClone(baseline.catalog[0].flags),assets:[],
  provenance:{owner_display_approval:ledger.DECISION_ID,approved_item_fingerprint:'a'.repeat(64),
   approved_batch:b.batch,approved_batch_display_sha256:b.display_sha256}
 };});
 // Local harness stands in for the separate owner release decision.
 const releaseFor=n=>({...ledger.buildReleaseCandidate(n,{inventory:golden,posters,
  inventorySha:media.inventorySha,posterSha:media.posterSha,
  reviewReference:'TK504-20261107-001',uploadReference:'TK504-20261107-001'}),
  status:'RELEASE_APPROVED'});
 const config=releaseFor(1);
 const env={
  MOVEKIT_V2_CATALOG_METADATA_RELEASED:'true',MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED:'true',
  MOVEKIT_V2_POSTER_UPLOAD_VERIFIED:'true',MOVEKIT_V2_SIGNING_ENABLED:'true',
  MOVEKIT_V2_PERMISSION_REVIEWED:'true',MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED:'true',
  SUPABASE_URL:media.BASE,SUPABASE_ANON_KEY:'local-synthetic-anon',
  SUPABASE_SERVICE_ROLE_KEY:serviceJwt
 };
 for(const migration of ['20261107191701_tk504_movekit_v2_media_grants.sql',
  '20261107191721_tk504_published_catalog_stage.sql']){
  sql(fs.readFileSync(path.join(root,'supabase/migrations',migration),'utf8'));
 }
 sql(rows.map(row=>"update public.movekit_catalog_fk_bindings set provider_id="+
  literal(row.provider_id)+",active=true,reviewed_at=clock_timestamp() where catalog_id="+literal(row.catalog_id)+";").join('\n'));
 sql(metadata.map(meta=>"insert into public.movekit_v2_catalog_publications"+
  "(catalog_id,provider_id,metadata) values("+literal(meta.catalog_id)+","+
  literal(meta.source.provider_id)+","+literal(JSON.stringify(meta))+"::jsonb);").join('\n'));
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
 // Physically publish more rows than released: the explicit server filter
 // must exclude them rather than trusting the total number of published rows.
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
 assert(answer.release.batch===1&&answer.release.display_sha256===ledger.BATCHES[0].display_sha256,
  'batch25 server names owner-approved package 01 fingerprint');
 const catalog=structuredClone(baseline),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const begin=html.indexOf('var ExerciseCatalogService=(function(){'),end=html.indexOf('\n})();',begin);
 if(begin<0||end<begin)throw Error('Actual ECS not found');
 const context=vm.createContext({EX_CATALOG:catalog,localStorage:{getItem:()=>null,setItem(){}},
  favoriteExIds:new Set(),performance:{now:()=>0},console,window:{},Set,Date});
 vm.runInContext(html.slice(begin,end+5),context,{timeout:5000});
 const runtime=Runtime.create({catalog,service:context.ExerciseCatalogService});
 const installed=runtime.mount(answer,A.id,()=>A.id);
 assert(installed.count===251&&installed.added===25,'batch25 actual server response mounts into real ECS');
 const writers=async(list,label)=>{for(const row of list){
  assert(context.ExerciseCatalogService.byId(row.catalog_id)?.source.provider_id===row.provider_id,
   label+' exact ECS identity '+row.catalog_id);
  await require('./tk603ActualWriterProbe.cjs')({root,rest,A,B,query,sql,assert,
   sourceCatalog:catalog.catalog,catalogId:row.catalog_id,priorProvider:row.provider_id});
 }};
 await writers(rows.slice(0,25),'batch25');
 if(onPackage)onPackage(1);
 for(const n of packages.filter(x=>x>1)){
  const P=ledger.BATCHES[n-1],label='package'+String(n).padStart(2,'0');
  const res=await handle(A,releaseFor(n));
  assert(res.statusCode===200,label+' actual Auth and PostgREST serve cumulative package'+(res.statusCode===200?'':' (HTTP '+res.statusCode+' '+String(res.body).slice(0,80)+')'));
  const got=JSON.parse(res.body);
  assert(got.new_count===P.cumulative_new&&got.total===P.cumulative_total&&
   got.items.length===P.cumulative_new&&got.release.batch===n&&
   got.release.display_sha256===P.display_sha256,label+' exact count '+P.cumulative_total+' and owner fingerprint');
  assert(got.items[got.items.length-1].catalog_id===P.through&&
   !got.items.some(x=>Number(x.catalog_id.slice(3))>Number(P.through.slice(3))),
   label+' no later physically published row leaks');
  const m=runtime.mount(got,A.id,()=>A.id);
  assert(m.count===P.cumulative_total&&m.batch===n,label+' mounts into real ECS');
  await writers(rows.slice(P.cumulative_new-P.count,P.cumulative_new),label);
  if(onPackage)onPackage(n);
 }
 assert(runtime.clear()&&catalog.count===226&&context.ExerciseCatalogService.byId('TK-000227')===null&&
  context.ExerciseCatalogService.byId(ledger.BATCHES[last-1].through)===null,
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
 if(full){
  sql("update public.movekit_media_grants set active=true,revoked_at=null where user_id="+literal(A.id));
  // A package release with one row stamped for the wrong package is refused.
  sql("update public.movekit_v2_catalog_publications set metadata=jsonb_set(metadata,'{provenance,approved_batch}','1') where catalog_id='TK-000582';");
  r=await handle(A,releaseFor(15));assert(r.statusCode===503,'package15 row stamped with foreign package approval blocks release');
  sql("update public.movekit_v2_catalog_publications set metadata=jsonb_set(metadata,'{provenance,approved_batch}','15') where catalog_id='TK-000582';");
  r=await handle(A,releaseFor(15));assert(r.statusCode===200&&JSON.parse(r.body).total===582,'package15 restored stamp serves exactly 582');
  r=await handle(B,releaseFor(15));assert(r.statusCode===403,'package15 B without grant receives nothing');
 }
 console.log('BATCH25 COMPLETE: actual broker/Auth/PostgREST/ECS and actual app writers per package; synthetic content only.');
};
