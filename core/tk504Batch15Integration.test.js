'use strict';
// #504/#603 — all 15 owner-approved MoveKit packages through the EXISTING
// integration path: canonical ledger -> real catalog function -> real V2
// media broker (signing contract) -> real ExerciseCatalogService / Dutch
// search / picker provenance extracted from index.html.
// Synthetic backend responses and synthetic display text only. No licensed
// metadata, media bytes, Supabase, Storage, Range or production release.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const ledger=require('./tk504BatchReleaseLedger.js');
const Runtime=require('./tk504PublishedCatalogRuntime.js');
const catalogFn=require('../netlify/functions/exercise-catalog-v2.js')._internal;
const media=require('../netlify/functions/exercise-media-v2-url.js')._internal;
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posters=require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const approval=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const releaseDoc=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const baseline=require('../exercise-catalog.json');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let n=0;const ok=(v,m)=>{assert.ok(v,m);n++;},eq=(a,b,m)=>{assert.equal(a,b,m);n++;};
const perBatch=[];

// 1. Ledger == owner approval record (boundaries, counts, fingerprints).
eq(approval.decision_id,ledger.DECISION_ID);
eq(approval.status,'OWNER_EXPLICIT_BULK_CONTENT_APPROVAL');
eq(approval.content_fingerprint.display_sha256,ledger.DISPLAY_SHA256);
eq(approval.content_fingerprint.batches.length,15);
approval.content_fingerprint.batches.forEach((b,i)=>{
  const L=ledger.BATCHES[i];
  ok(L.batch===b.batch&&L.from===b.from&&L.through===b.through&&L.count===b.count&&
    L.display_sha256===b.display_sha256,'ledger package '+b.batch+' equals owner approval');
});
ok(Object.values(approval.access_release).every(v=>v===false),
  'content approval is not a release/licence/security approval');
eq(ledger.BATCHES[14].cumulative_new,356);eq(ledger.BATCHES[14].cumulative_total,582);
eq(ledger.batchOf('TK-000226'),null);eq(ledger.batchOf('TK-000583'),null);
eq(ledger.batchOf('TK-000251').batch,1);eq(ledger.batchOf('TK-000252').batch,2);
eq(ledger.batchOf('TK-000577').batch,15);
// Production release is now explicitly pinned to ALL 15 owner-approved packages.
eq(releaseDoc.status,'RELEASE_APPROVED');eq(releaseDoc.entries.length,1164);
eq(ledger.releasedScope(releaseDoc).total,582,'approved scope is exactly 582');

// 2. Real ECS + picker provenance from the actual app.
const ecsStart=html.indexOf('var ExerciseCatalogService=(function(){');
const ecsEnd=html.indexOf('\n})();',ecsStart);
ok(ecsStart>=0&&ecsEnd>ecsStart,'actual ECS extracted');
const catalog=structuredClone(baseline);
const ctx=vm.createContext({EX_CATALOG:catalog,localStorage:{getItem:()=>null,setItem(){}},
  favoriteExIds:new Set(),performance:{now:()=>0},console,window:{},Set,Date});
vm.runInContext(html.slice(ecsStart,ecsEnd+5),ctx,{timeout:5000});
const provStart=html.indexOf('function tk504CatalogSourceRefFromCatalog(c){');
const provEnd=html.indexOf('\n}',provStart);
ok(provStart>=0&&provEnd>provStart,'actual picker provenance function extracted');
vm.runInContext(html.slice(provStart,provEnd+2),ctx,{timeout:1000});
const ECS=ctx.ExerciseCatalogService;
eq(ECS.count(),226);
const original226=catalog.catalog.map(c=>JSON.stringify(c));
let pickerInvalidations=0;
const runtime=Runtime.create({catalog,service:ECS,invalidatePicker:()=>pickerInvalidations++});

// 3. Synthetic backend (stub of Supabase REST/Auth/Storage signing).
const newRows=golden.items.filter(x=>Number(x.catalog_id.slice(3))>=227)
  .sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id));
const postMap=new Map(posters.items.map(x=>[x.catalog_id,x]));
eq(newRows.length,356);
const S=baseline.catalog[0];
const word=i=>'pakket'+String.fromCharCode(97+Math.floor(i/26)%26)+String.fromCharCode(97+i%26);
const pubRows=newRows.map((x,i)=>{const b=ledger.batchOf(x.catalog_id);return {
  catalog_id:x.catalog_id,provider_id:x.provider_id,status:'published',
  approved_at:'2026-11-07T00:00:00Z',published_at:'2026-11-07T00:00:00Z',
  metadata:{catalog_id:x.catalog_id,source:{provider:'movekit',provider_id:x.provider_id},
    identity:{...structuredClone(S.identity),name:'Synthetic package movement '+(i+1),
      nl:'Synthetische '+word(i)+' oefening'},
    intelligence:structuredClone(S.intelligence),
    relations:{alternatives:[],progressions:[],regressions:[]},
    flags:structuredClone(S.flags),assets:[],
    provenance:{owner_display_approval:ledger.DECISION_ID,approved_item_fingerprint:'a'.repeat(64),
      approved_batch:b.batch,approved_batch_display_sha256:b.display_sha256}}};});
const bindings=newRows.map(x=>({catalog_id:x.catalog_id,provider_id:x.provider_id,
  exercise_id:'TKC-'+x.catalog_id.slice(3),active:true,reviewed_at:'2026-11-07T00:00:00Z'}));
const uid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={MOVEKIT_V2_CATALOG_METADATA_RELEASED:'true',MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED:'true',
  MOVEKIT_V2_POSTER_UPLOAD_VERIFIED:'true',MOVEKIT_V2_SIGNING_ENABLED:'true',
  MOVEKIT_V2_PERMISSION_REVIEWED:'true',MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED:'true',
  SUPABASE_URL:media.BASE,SUPABASE_ANON_KEY:'synthetic_anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic_service'};
const state={grant:true,rows:pubRows,signs:[]};
const res=(body,okk=true)=>({ok:okk,status:okk?200:500,json:async()=>body});
async function backend(url,opts){
  const u=new URL(url);
  if(u.pathname==='/auth/v1/user')return res({id:uid});
  if(u.pathname==='/rest/v1/movekit_media_grants')return res(state.grant?[{user_id:uid,
    scope:'movekit_v2',active:true,revoked_at:null,expires_at:null}]:[]);
  const inList=()=>u.searchParams.get('catalog_id').slice(4,-1).split(',');
  if(u.pathname==='/rest/v1/movekit_v2_catalog_publications'){
    const want=new Set(inList());return res(state.rows.filter(r=>want.has(r.catalog_id)));}
  if(u.pathname==='/rest/v1/movekit_catalog_fk_bindings'){
    const want=new Set(inList());return res(bindings.filter(r=>want.has(r.catalog_id)));}
  if(u.pathname.startsWith('/storage/v1/object/sign/')){
    state.signs.push({path:u.pathname,ttl:JSON.parse(opts.body).expiresIn});
    return res({signedURL:u.pathname.slice('/storage/v1'.length)+'?token=synthetic-token-'+state.signs.length});}
  throw Error('unexpected backend route '+u.pathname);
}
const ev=body=>({httpMethod:'POST',headers:{origin:'https://trainingskompas.com',
  authorization:'Bearer synthetic.jwt.value'},body:body===undefined?undefined:JSON.stringify(body)});
const sign=(release,catalog_id,type)=>media.handle(ev({catalog_id,type,version:'v2'}),
  {env,fetch:backend,release,now:()=>Date.parse('2026-11-07T12:00:00Z')});
const refs={inventory:golden,posters,inventorySha:media.inventorySha,posterSha:media.posterSha,
  reviewReference:'TK504-20261107-101',uploadReference:'TK504-20261107-102'};

(async()=>{
  for(const B of ledger.BATCHES){
    const before=n;
    const candidate=ledger.buildReleaseCandidate(B.batch,refs);
    // Candidate is prepared, never self-approving.
    eq(candidate.status,'RELEASE_CANDIDATE_NOT_APPROVED');
    ok(!media.releaseConfigured(candidate,env),'candidate '+B.batch+' cannot sign media');
    let r=await catalogFn.handle(ev(),{env,fetch:backend,release:candidate});
    eq(r.statusCode,503,'unapproved candidate '+B.batch+' serves no catalog');
    // Exact checksum/provider identity for every video+poster entry.
    eq(candidate.entries.length,B.cumulative_new*2);
    ok(candidate.entries.every(e=>{const g=golden.items.find(x=>x.catalog_id===e.catalog_id);
      const a=e.media_type==='video'?g.video:postMap.get(e.catalog_id);
      return a.path===e.storage_path&&a.sha256===e.sha256&&a.bytes===e.bytes&&
        (e.media_type==='video'?/\.mp4$/.test(e.storage_path):/\.webp$/.test(e.storage_path));}),
      'package '+B.batch+' video/poster checksums equal golden inventory');
    // Test harness stands in for the separate owner release decision.
    const approved={...candidate,status:'RELEASE_APPROVED'};
    const scope=catalogFn.releasedScope(approved);
    ok(scope&&scope.batch===B.batch&&scope.new_count===B.cumulative_new,'server scope = package '+B.batch);
    r=await catalogFn.handle(ev(),{env,fetch:backend,release:approved});
    eq(r.statusCode,200,'package '+B.batch+' catalog served');
    const answer=JSON.parse(r.body);
    eq(answer.new_count,B.cumulative_new);eq(answer.total,B.cumulative_total);
    eq(answer.release.batch,B.batch);eq(answer.release.display_sha256,B.display_sha256);
    eq(r.headers['Cache-Control'],'private,no-store,max-age=0');
    // Mount into the actual ECS.
    const m=runtime.mount(answer,uid,()=>uid);
    eq(m.count,B.cumulative_total);eq(m.batch,B.batch);
    ok(catalog.catalog.slice(0,226).every((c,i)=>JSON.stringify(c)===original226[i]),
      'all 226 existing records byte-identical after package '+B.batch);
    const ids=ledger.idsThrough(B.batch).slice(-B.count);
    for(const id of ids){
      const i=Number(id.slice(3))-227,c=ECS.byId(id);
      ok(c&&c.source.provider_id===newRows[i].provider_id,'ECS identity '+id);
      ok(ECS.search(word(i)).some(x=>x.catalog_id===id),'Dutch search '+id);
      const ref=ctx.tk504CatalogSourceRefFromCatalog(c);
      ok(ref&&ref.kind==='movekit-catalog-v1'&&ref.catalog_id===id&&ref.provider_id===newRows[i].provider_id,
        'picker provenance '+id);
    }
    const next=ledger.BATCHES[B.batch];
    if(next)eq(ECS.byId(next.from),null,'package '+(B.batch+1)+' not yet visible');
    // Signed media for first and last item of this package.
    for(const id of [B.from,B.through])for(const type of ['video','poster']){
      state.signs=[];
      r=await sign(approved,id,type);
      eq(r.statusCode,200,'signed '+type+' '+id);
      const body=JSON.parse(r.body);
      const want=type==='video'?golden.items.find(x=>x.catalog_id===id).video.path:postMap.get(id).path;
      ok(new URL(body.url).pathname.endsWith('/'+want)&&body.expires_in<=60&&body.expires_in>=31,
        'short-lived URL bound to exact asset '+id+' '+type);
      ok(state.signs.length===1&&state.signs[0].ttl<=60,'TTL capped');
      eq(r.headers['Cache-Control'],'no-store, private, max-age=0');
    }
    if(next){
      r=await sign(approved,next.from,'video');
      eq(r.statusCode,404,'next package media refused before release');
    }
    // Forbidden variants of this package fail closed.
    const lonely={...approved,entries:approved.entries.slice(0,-2)};
    eq(catalogFn.releasedScope(lonely),null,'incomplete package '+B.batch+' rejected');
    r=await sign(lonely,B.from,'video');eq(r.statusCode,404,'incomplete package cannot sign');
    const dup={...approved,entries:[...approved.entries,approved.entries[approved.entries.length-1]]};
    eq(catalogFn.releasedScope(dup),null,'duplicate entry rejected');
    const forged={...approved,released_batches:approved.released_batches.map((x,i)=>
      i===B.batch-1?{...x,display_sha256:'0'.repeat(64)}:x)};
    eq(catalogFn.releasedScope(forged),null,'foreign fingerprint rejected');
    const tampered={...approved,entries:approved.entries.map((e,i)=>i===approved.entries.length-2?
      {...e,sha256:'1'.repeat(64)}:e)};
    eq(catalogFn.releasedScope(tampered),null,'tampered checksum rejected');
    if(B.batch>1){
      const gap={...approved,released_batches:approved.released_batches.slice(1)};
      eq(catalogFn.releasedScope(gap),null,'gap (missing package 1) rejected');
    }
    state.rows=pubRows.map(x=>x.catalog_id===B.through?{...x,metadata:{...x.metadata,
      provenance:{...x.metadata.provenance,approved_batch:B.batch===1?2:1}}}:x);
    r=await catalogFn.handle(ev(),{env,fetch:backend,release:approved});
    eq(r.statusCode,503,'row stamped with other package approval blocks package '+B.batch);
    state.rows=pubRows;
    // Revoke: entitlement off => no media, no catalog; account switch clears.
    state.grant=false;
    eq((await sign(approved,B.from,'video')).statusCode,403,'revoked grant refuses signing');
    eq((await catalogFn.handle(ev(),{env,fetch:backend,release:approved})).statusCode,403);
    state.grant=true;
    ok(runtime.clear()&&ECS.count()===226&&ECS.byId(B.from)===null,'account switch clears package '+B.batch);
    // Re-mount for cumulative continuation.
    runtime.mount(answer,uid,()=>uid);
    perBatch.push({batch:B.batch,from:B.from,through:B.through,count:B.count,
      total:B.cumulative_total,assertions:n-before});
  }
  ok(runtime.clear()&&ECS.count()===226,'final reset back to 226');
  ok(pickerInvalidations>=45,'existing single picker cache invalidated on every change');
  for(const p of perBatch)console.log('PACKAGE '+String(p.batch).padStart(2,'0')+' '+p.from+'..'+p.through+
    ' (+'+p.count+' => '+p.total+'): '+p.assertions+' PASS');
  console.log('TK504 15-package integration: '+n+' assertions PASS (synthetic backend; release OFF)');
})().catch(e=>{console.error(e);process.exitCode=1;});
