'use strict';
// TK614/#603 -- ALL 226 original MoveKit bindings: 10 ordered batches, one
// ROLLBACK-only transaction. Offline synthetic only: the 582 identities come
// from the PUBLIC golden inventory via the real tk504 manifest verifier (it
// reproduces the pinned private mapping SHA). No DB, network, grants, release.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {verify}=require('../tools/tk504_prepare_private_fk_manifest.cjs');
const T=require('../tools/tk614_original226_batch25_preflight.cjs');
const P=require('../tools/tk614_all226_docker_proof.cjs');
const CAT_PATH=path.join(__dirname,'..','exercise-catalog.json');
const catalogBytes=fs.readFileSync(CAT_PATH);
const catalog=JSON.parse(catalogBytes.toString('utf8'));
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posters=require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const approval=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const release=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');

const stage={_status:'PRIVATE_REVIEW_NOT_RELEASED',_base_count:226,_new_count:356,count:582,
 _approved_for_import:0,_media_grants_created:0,_app_activated:false,_history_updates:0,
 _personal_exercise_updates:0,
 catalog:[...golden.items].sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id)).map((r,i)=>({
  catalog_id:r.catalog_id,source:{provider:'movekit',provider_id:r.provider_id},
  ...(i>=226?{_review:{status:'NOT_PUBLISHED',confirmed_by_authenticated_reviewer:false,
   media_entitlement_status:'NOT_VERIFIED',supplier_metadata_modified:false}}:{})}))};
const manifest={...verify({stage,catalog,golden,posters,approval,
  release:{...release,status:'BLOCKED_NOT_REVIEWED',entries:[]}}),
 private_stage_sha256:'a'.repeat(64)};
const SHA=manifest.mapping_sha256;
const pad=n=>String(n).padStart(6,'0');

let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const throwsCode=(fn,code,m)=>{assert.throws(fn,e=>e.code===code||e.message===code,m||code);checks++;};
const clone=()=>structuredClone(manifest);
const all=(o={})=>T.planAll(o.manifest||manifest,o.bytes||catalogBytes,
  {expectedMappingSha:o.sha===undefined?SHA:o.sha,expectedSourceSha:o.source});

// ---- 1. pinned source catalog SHA (bytes, CRLF-normalised)
eq(T.sourceCatalogSha(catalogBytes),T.EXPECTED_SOURCE_CATALOG_SHA256,'source catalog matches pinned SHA');
eq(T.sourceCatalogSha(Buffer.from(catalogBytes.toString('utf8').replace(/\n/g,'\r\n'),'utf8')),
  T.EXPECTED_SOURCE_CATALOG_SHA256,'CRLF checkout does not cause a false mismatch');
ok(T.sourceCatalogSha(Buffer.concat([catalogBytes,Buffer.from(' ')]))!==T.EXPECTED_SOURCE_CATALOG_SHA256,
  'a single extra byte changes the digest');
eq(SHA,T.EXPECTED_MAPPING_SHA256,'public golden-derived mapping reproduces the pinned private SHA');

// ---- 2. 226/226 identities, 10 batches
const A=all();
eq(A.schema,'tk614-original226-all-batches-preflight/1.0');
eq(A.status,'DRY_RUN_NO_RELEASE_AUTHORITY');
eq(A.entries.length,226);
eq(A.source_catalog_sha256,T.EXPECTED_SOURCE_CATALOG_SHA256);
eq(A.source_mapping_sha256,SHA);
eq(A.totals,{original:226,batches:10,existing_reviewed_untouched:356,canonical_after_staging:582,
  legacy_tk_rows_untouched:23});
eq(A.release,{active:0,reviewed:0,media_grants:0,acl_changes:0,eligible_for_live_seed:0,
  release_authority:false,activation_gate:'SEPARATE_EXPLICIT_TESTED_GATE_REQUIRED'});
ok(Object.isFrozen(A)&&Object.isFrozen(A.entries)&&Object.isFrozen(A.entries[100])&&Object.isFrozen(A.batches[4]),
  'immutable all-plan');
const byId=new Map(catalog.catalog.map(c=>[c.catalog_id,c]));
let identical=0;
A.entries.forEach((e,i)=>{
  const c=byId.get(e.catalog_id);
  if(e.catalog_id==='TK-'+pad(i+1)&&e.exercise_id==='TKC-'+pad(i+1)&&
     c&&c.source.provider==='movekit'&&c.source.provider_id===e.provider_id&&
     catalog.id_map[e.provider_id]===e.catalog_id&&e.active===false&&e.reviewed_at===null&&
     manifest.entries[i].provider_id===e.provider_id)identical++;
});
eq(identical,226,'226/226 exact catalog/provider/slug identities, all inactive and unreviewed');
eq(new Set(A.entries.map(e=>e.provider_id)).size,226,'no duplicate provider slug');
const new356=new Set(manifest.entries.slice(226).map(e=>e.provider_id));
ok(A.entries.every(e=>!new356.has(e.provider_id)),'no 226 slug collides with the existing 356');
ok(A.entries.every(e=>e.exercise_id!==e.catalog_id),'legacy TK-row is never the FK target');
eq(A.batches.map(b=>b.size),[25,25,25,25,25,25,25,25,25,1]);
eq(A.batches.map(b=>b.number),[1,2,3,4,5,6,7,8,9,10]);
eq(A.batches.map(b=>[b.first_catalog_id,b.last_catalog_id]),
  T.batchSchedule().map(b=>[b.first_catalog_id,b.last_catalog_id]));
for(let n=1;n<=10;n++){
  const p=T.planBatch(manifest,catalog,n,{expectedMappingSha:SHA});
  eq(A.batches[n-1].batch_sha256,p.batch_sha256,'batch '+n+' digest equals single-batch plan');
  eq(A.entries.slice((n-1)*25,(n-1)*25+p.entries.length),p.entries,'batch '+n+' entries');
  const r=T.batchRange(n);
  eq([r.first,r.last,r.size],[(n-1)*25+1,Math.min(n*25,226),n<10?25:1],'batchRange '+n);
}
throwsCode(()=>T.batchRange(11),'BATCH_OUT_OF_RANGE');
throwsCode(()=>T.batchRange(0),'BATCH_OUT_OF_RANGE');
eq(T.batchOf('TK-000001'),1);eq(T.batchOf('TK-000025'),1);eq(T.batchOf('TK-000026'),2);
eq(T.batchOf('TK-000225'),9);eq(T.batchOf('TK-000226'),10);
throwsCode(()=>T.batchOf('TK-000227'),'NOT_AN_ORIGINAL_226_ID');
throwsCode(()=>T.batchOf('TKC-000001'),'NOT_AN_ORIGINAL_226_ID');
ok(A.entries.some(e=>e.catalog_id==='TK-000063'&&e.exercise_id==='TKC-000063'),'Cable Bar Pushdown in plan');
ok(A.entries.some(e=>e.catalog_id==='TK-000188'&&e.exercise_id==='TKC-000188'),'Machine Pec Fly in plan');

// ---- 3. idempotence / determinism
eq(all(),A,'deterministic plan');
eq(all({manifest:clone()}).all_sha256,A.all_sha256);
const sql=T.renderAllRollbackSql(A,manifest);
eq(T.renderAllRollbackSql(all({manifest:clone()}),clone()),sql,'byte-identical SQL');
eq(T.verifyAllPlan(structuredClone(A),manifest).rows.length,226,'serialised plan re-verifies');

// ---- 4. malformed / stale SHAs and source drift
for(const bad of ['nothex','A'.repeat(64),'a'.repeat(63),'a'.repeat(65),null,42,''])
  throwsCode(()=>all({sha:bad}),'EXPECTED_SHA_INVALID','mapping pin '+String(bad));
throwsCode(()=>all({sha:'b'.repeat(64)}),'STALE_OR_WRONG_MAPPING_SHA');
for(const bad of ['zz','F'.repeat(64),'0'.repeat(63)])
  throwsCode(()=>all({source:bad}),'EXPECTED_SOURCE_SHA_INVALID','source pin '+bad);
throwsCode(()=>all({source:'e'.repeat(64)}),'SOURCE_CATALOG_SHA_MISMATCH');
throwsCode(()=>T.planAll(manifest,catalog,{expectedMappingSha:SHA}),'SOURCE_CATALOG_BYTES_REQUIRED',
  'a parsed object is not pinned source bytes');
{const c=structuredClone(catalog);c.catalog.find(x=>x.catalog_id==='TK-000150').source.provider_id='band-row';
 const b=Buffer.from(JSON.stringify(c,null,2)+'\n','utf8');
 throwsCode(()=>all({bytes:b}),'SOURCE_CATALOG_SHA_MISMATCH','provider drift caught by pin');
 throwsCode(()=>all({bytes:b,source:T.sourceCatalogSha(b)}),'ORIGINAL_CATALOG_IDENTITY_MISMATCH',
  'provider drift caught by identity even with a forged pin');}
{const c=structuredClone(catalog);c.id_map[manifest.entries[400].provider_id]='TK-000010';
 const b=Buffer.from(JSON.stringify(c),'utf8');
 throwsCode(()=>all({bytes:b,source:T.sourceCatalogSha(b)}),'PROVIDER_COLLISION_WITH_NEW_356');}
{const b=Buffer.from('{not json','utf8');
 throwsCode(()=>all({bytes:b,source:T.sourceCatalogSha(b)}),'SOURCE_CATALOG_NOT_JSON');}
{const m=clone();m.mapping_sha256='c'.repeat(64);throwsCode(()=>all({manifest:m}),'PROVISIONING_MAPPING_DIGEST_MISMATCH');}
{const m=clone();m.entries[140].provider_id='x-forged';throwsCode(()=>all({manifest:m}),'PROVISIONING_MAPPING_DIGEST_MISMATCH');}
{const m=clone();m.entries[200].active=true;throwsCode(()=>all({manifest:m}),'UNTRUSTED_ROW_IN_PRIVATE_PLAN');}
{const m=clone();m.counts.eligible_for_live_seed=226;throwsCode(()=>all({manifest:m}),'NOT_AN_UNRELEASED_582_PREFLIGHT');}

// ---- 5. tampered all-plan
const tamper=f=>{const p=structuredClone(A);f(p);return p;};
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.release.release_authority=true;}),manifest),'NOT_A_DRY_RUN_ALL_PLAN');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.release.active=226;}),manifest),'NOT_A_DRY_RUN_ALL_PLAN');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.status='RELEASED';}),manifest),'NOT_A_DRY_RUN_ALL_PLAN');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.entries[62].provider_id=p.entries[63].provider_id;}),manifest),'ALL_PLAN_TAMPERED');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{[p.entries[0],p.entries[1]]=[p.entries[1],p.entries[0]];}),manifest),'ALL_PLAN_TAMPERED','reorder');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.entries.push(p.entries[0]);}),manifest),'ALL_PLAN_TAMPERED','duplicate');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.entries.pop();}),manifest),'ALL_PLAN_TAMPERED','missing index');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.entries[5].active=true;}),manifest),'ALL_PLAN_TAMPERED');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.entries[5].reviewed_at='2026-11-08';}),manifest),'ALL_PLAN_TAMPERED');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.batches.reverse();}),manifest),'ALL_PLAN_TAMPERED');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.all_sha256='0'.repeat(64);}),manifest),'ALL_PLAN_TAMPERED');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.source_catalog_sha256='x';}),manifest),'ALL_PLAN_TAMPERED');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.source_catalog_sha256='1'.repeat(64);}),manifest),'ALL_PLAN_TAMPERED');
throwsCode(()=>T.verifyAllPlan(tamper(p=>{p.source_mapping_sha256='1'.repeat(64);}),manifest),'STALE_OR_WRONG_MAPPING_SHA');
throwsCode(()=>T.verifyAllPlan(T.planBatch(manifest,catalog,1,{expectedMappingSha:SHA}),manifest),'NOT_A_DRY_RUN_ALL_PLAN');
throwsCode(()=>T.renderAllRollbackSql(tamper(p=>{p.entries[3].provider_id='forged';}),manifest),'ALL_PLAN_TAMPERED');

// ---- 6. offline state model of the one-transaction proof
const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function state(){
 const ex=[],bi=[];
 for(const e of manifest.entries.slice(226)){
  ex.push({id:e.exercise_id,scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
  bi.push({catalog_id:e.catalog_id,exercise_id:e.exercise_id,provider_id:e.provider_id,
   active:true,reviewed_at:'2026-11-07T00:00:00Z'});
 }
 const legacy=[1,5,38,63,100,150,188,2,3,4,10,25,26,50,60,64,70,80,90,120,189,200,226];
 legacy.forEach((n,i)=>ex.push({id:'TK-'+pad(n),scope:i<7?'global':'personal',active:true,
  created_by:i<7?null:(i%2?UB:UA),user_id:i<7?null:(i%2?UB:UA),gym_id:null}));
 ex.push({id:'own-squat',scope:'personal',active:true,created_by:UA,user_id:UA,gym_id:null});
 const sessions=[{id:'s-legacy-063',user_id:UA,exercise_id:'TK-000063',note:'legacy A'},
  {id:'s-legacy-188',user_id:UB,exercise_id:'TK-000188',note:'legacy B'},
  {id:'s-typed-300',user_id:UA,exercise_id:'TKC-000300',note:'typed A'},
  {id:'s-own-squat',user_id:UA,exercise_id:'own-squat',note:'personal'}];
 return {exercises:ex,bindings:bi,sessions};
}
const ALL10=[1,2,3,4,5,6,7,8,9,10];
const sim=(s,order,o={})=>T.simulateBatches(s,o.manifest||manifest,catalog,order,{expectedMappingSha:SHA});
const s0=state(),s0copy=structuredClone(s0);
const R=sim(s0,ALL10);
eq(s0,s0copy,'simulation never mutates the input state');
eq(T.assertAll226Staged(R.state,manifest),{staged_inactive_unreviewed:226,existing_reviewed:356,canonical:582});
eq(R.state.bindings.filter(b=>Number(b.catalog_id.slice(3))>226),s0.bindings,'356 bindings byte-identical');
eq(R.state.exercises.filter(r=>/^TK-\d{6}$/.test(r.id)),s0.exercises.filter(r=>/^TK-\d{6}$/.test(r.id)),
  '23 legacy rows byte-identical');
eq(R.state.sessions,s0.sessions,'legacy + typed history byte-identical');
eq(R.state.exercises.filter(r=>/^TKC-\d{6}$/.test(r.id)).length,582,'582 canonical aliases');
ok(R.state.bindings.filter(b=>Number(b.catalog_id.slice(3))<=226).every(b=>b.active===false&&b.reviewed_at===null),
  'every staged 226 binding inactive/unreviewed');
eq(sim(state(),ALL10).state,R.state,'retry from the same base is idempotent');
throwsCode(()=>sim(R.state,[1]),'BATCH_ALREADY_PRESENT','re-running on staged state is refused');
throwsCode(()=>sim(state(),[1,1]),'BATCH_ALREADY_PRESENT','duplicate batch');
throwsCode(()=>sim(state(),[2,1]),'BATCH_GAP_OR_OUT_OF_ORDER','reorder');
throwsCode(()=>sim(state(),[1,3]),'BATCH_GAP_OR_OUT_OF_ORDER','skip');
throwsCode(()=>sim(state(),[1,2,3,4,5,6,7,8,10,9]),'BATCH_GAP_OR_OUT_OF_ORDER','last two swapped');
throwsCode(()=>sim(state(),[11]),'BATCH_OUT_OF_RANGE');
throwsCode(()=>sim(state(),[]),'BATCH_ORDER_INVALID');
throwsCode(()=>T.assertAll226Staged(sim(state(),[1,2,3,4,5,6,7,8,9]).state,manifest),'CANONICAL_582_INCOMPLETE');
{const s=structuredClone(R.state);s.bindings.find(b=>b.catalog_id==='TK-000188').active=true;
 throwsCode(()=>T.assertAll226Staged(s,manifest),'BATCH_ROWS_NOT_INACTIVE_UNREVIEWED');}
{const s=structuredClone(R.state);s.bindings.find(b=>b.catalog_id==='TK-000063').provider_id='forged';
 throwsCode(()=>T.assertAll226Staged(s,manifest),'ALL_226_IDENTITY_MISMATCH');}
// forged owner / personal FK shadow
{const s=state();s.exercises.push({id:'TKC-000063',scope:'personal',active:true,created_by:UA,user_id:UA,gym_id:null});
 throwsCode(()=>sim(s,ALL10),'RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE','personal TKC shadow for 063');}
{const s=state();s.exercises.push({id:'TKC-000188',scope:'global',active:true,created_by:UB,user_id:null,gym_id:null});
 throwsCode(()=>sim(s,ALL10),'RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE','forged owner on global 188 alias');}
{const s=state();s.exercises.find(r=>r.id==='TKC-000400').gym_id='gym-x';
 throwsCode(()=>sim(s,ALL10),'RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE','gym-owned existing alias');}
{const s=state();s.exercises.push({id:'TKC-000188',scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
 throwsCode(()=>sim(s,ALL10),'BATCH_GAP_OR_OUT_OF_ORDER','unowned foreign alias ahead of its batch');}
{const s=state();s.exercises.push({id:'TKC-000010',scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
 throwsCode(()=>sim(s,ALL10),'ORIGINAL_ALIAS_COLLISION');}
// unrelated existing 356
{const s=state();s.bindings[33].provider_id=manifest.entries[0].provider_id;
 throwsCode(()=>sim(s,ALL10),'EXISTING_356_CHANGED_OR_MISSING','provider drift in 356');}
{const s=state();s.bindings[34].reviewed_at=null;throwsCode(()=>sim(s,ALL10),'EXISTING_356_CHANGED_OR_MISSING');}
{const s=state();s.bindings[35].active=false;throwsCode(()=>sim(s,ALL10),'EXISTING_356_CHANGED_OR_MISSING');}
{const s=state();s.bindings.splice(36,1);throwsCode(()=>sim(s,ALL10),'EXISTING_356_CHANGED_OR_MISSING');}
{const s=state();s.exercises=s.exercises.filter(r=>r.id!=='TKC-000500');
 throwsCode(()=>sim(s,ALL10),'EXISTING_356_CHANGED_OR_MISSING','alias of 356 missing');}
{const s=state();s.exercises.push({id:'own-bench',scope:'personal',active:true,created_by:UB,user_id:UB,gym_id:null});
 eq(T.assertAll226Staged(sim(s,ALL10).state,manifest).canonical,582,'unrelated personal exercises are ignored');}
// previous legacy rows / history
{const s=state();s.exercises=s.exercises.filter(r=>r.id!=='TK-000063');
 throwsCode(()=>sim(s,ALL10),'LEGACY_TK_ROW_COUNT_CHANGED','legacy row missing');}
{const s=state();s.exercises.push({id:'TK-000300',scope:'personal',active:true,created_by:UA,user_id:UA,gym_id:null});
 throwsCode(()=>sim(s,ALL10),'LEGACY_TK_ROW_COUNT_CHANGED','extra legacy row');}
eq(R.history_fingerprint,sim(state(),[1]).history_fingerprint,'history fingerprint stable');
ok(R.state.sessions.every(x=>!/^TKC-0000(0[1-9]|[1-9]\d)$|^TKC-000(1\d\d|2[01]\d|22[0-6])$/.test(x.exercise_id)),
  'no session references a staged 001..226 alias');

// ---- 7. all-226 SQL contract: one transaction, 10 ordered blocks, ROLLBACK only
ok(sql.startsWith('-- TK614 #603: PRIVATE ROLLBACK-ONLY ALL-226 proof'));
ok(sql.includes('\\set ON_ERROR_STOP on'));
eq((sql.match(/^BEGIN;$/gm)||[]).length,1,'exactly one transaction');
eq((sql.match(/^ROLLBACK;$/gm)||[]).length,1);
ok(sql.endsWith('ROLLBACK;\n'));
ok(!/\bCOMMIT\b/i.test(sql),'never COMMIT');
ok(!/\b(GRANT|REVOKE|ALTER|DROP|TRUNCATE|UPDATE|DELETE|POLICY|SECURITY\s+DEFINER|SET\s+ROLE)\b/i.test(sql),
 'no ACL/RLS/role/DDL changes and no update/delete of existing rows');
ok(sql.includes('NOT_A_DISPOSABLE_SANDBOX'));
ok(sql.indexOf("tk614_disposable_sandbox_marker")<sql.indexOf('INSERT INTO public.'),
 'marker check precedes every write to a public table');
for(const g of ['EXISTING_356_CHANGED_OR_MISSING','ORIGINAL_ALIAS_COLLISION','RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE',
 'BATCH_GAP_OR_OUT_OF_ORDER','BATCH_ALREADY_PRESENT','PROVIDER_ALREADY_BOUND','LEGACY_TK_ROW_COUNT_CHANGED',
 'LEGACY_TK_ROWS_CHANGED','LEGACY_HISTORY_CHANGED','EXISTING_356_MODIFIED_IN_TXN','BATCH_ROWS_NOT_INACTIVE_UNREVIEWED',
 'ALL_226_NOT_INACTIVE_UNREVIEWED','CANONICAL_582_INCOMPLETE','UNREVIEWED_226_RESOLVABLE',
 'EXISTING_356_RESOLVER_CHANGED','UNRELEASED_TYPED_SESSION_ACCEPTED','ALL_226_PLAN_TABLE_INVALID',
 'STAGED_ADMIN_BINDING_SCHEMA_REQUIRED'])ok(sql.includes(g),'SQL guard '+g);
const begins=[...sql.matchAll(/^-- >>> TK614 ALL226 BATCH (\d\d)\/10 BEGIN/gm)].map(m=>Number(m[1]));
const ends=[...sql.matchAll(/^-- <<< TK614 ALL226 BATCH (\d\d)\/10 END/gm)].map(m=>Number(m[1]));
eq(begins,ALL10,'10 batch blocks in order');eq(ends,ALL10);
ok(begins.every((n,i)=>sql.indexOf('BATCH '+String(n).padStart(2,'0')+'/10 END')<
  (i<9?sql.indexOf('BATCH '+String(n+1).padStart(2,'0')+'/10 BEGIN'):Infinity)),'blocks do not interleave');
for(const n of ALL10)eq((sql.match(new RegExp('WHERE batch='+n+' ORDER BY n','g'))||[]).length,2,'batch '+n+' inserts');
eq((sql.match(/SELECT catalog_id,exercise_id,provider_id,false,NULL/g)||[]).length,10,'bindings inserted false/NULL');
const sqlWithoutComments=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');
ok(!/provider_id,true|reviewed_at\s*=(?!\s*NULL\b)|now\(\)|active\s*=\s*true/i.test(sqlWithoutComments),'no activation or review stamp');
const planRows=[...sql.matchAll(/^  \((\d+),(\d+),'(TK-\d{6})','(TKC-\d{6})','([a-z0-9-]+)'\)/gm)];
eq(planRows.length,226,'226 plan rows');
ok(planRows.every((m,i)=>Number(m[1])===i+1&&Number(m[2])===Math.ceil((i+1)/25)&&m[3]==='TK-'+pad(i+1)&&
  m[4]==='TKC-'+pad(i+1)&&m[5]===byId.get(m[3]).source.provider_id),'plan rows = source catalog identity');
const exp356=[...sql.matchAll(/^  \('(TK-\d{6})','(TKC-\d{6})','([a-z0-9-]+)'\)/gm)];
eq(exp356.length,356);ok(exp356.every(m=>Number(m[1].slice(3))>226));
ok(!/movekit_media_grants/i.test(sql),'no media grants');
eq((sql.match(/INSERT INTO public\.sessions/g)||[]).length,1,'only the rejected-session probe touches sessions');
ok(/INSERT INTO public\.sessions[\s\S]{0,200}RAISE EXCEPTION 'UNRELEASED_TYPED_SESSION_ACCEPTED[\s\S]{0,80}EXCEPTION WHEN check_violation/.test(sql),
  'session probe must be rejected by the typed FK trigger');
ok(sql.includes("set_config('request.jwt.claim.sub','',true)"),'probe identity is reset');
ok(sql.includes('TK614_ALL226_ROLLBACK_PROOF_PASS_226_INACTIVE_UNREVIEWED_582_CANONICAL_10_BATCHES'));
// adversarial variants (used in the disposable Docker proof)
const dup=T.deriveAdversarialVariant(sql,'duplicate_batch');
eq([...dup.matchAll(/^-- >>> TK614 ALL226 BATCH (\d\d)/gm)].map(m=>Number(m[1])),[1,2,2,3,4,5,6,7,8,9,10]);
const ro=T.deriveAdversarialVariant(sql,'reorder_batches');
eq([...ro.matchAll(/^-- >>> TK614 ALL226 BATCH (\d\d)/gm)].map(m=>Number(m[1])),[1,3,2,4,5,6,7,8,9,10]);
const sk=T.deriveAdversarialVariant(sql,'skip_batch');
eq([...sk.matchAll(/^-- >>> TK614 ALL226 BATCH (\d\d)/gm)].map(m=>Number(m[1])),[1,3,4,5,6,7,8,9,10]);
ok([dup,ro,sk].every(v=>v.endsWith('ROLLBACK;\n')&&!/\bCOMMIT\b/i.test(v)&&v.includes('NOT_A_DISPOSABLE_SANDBOX')));
throwsCode(()=>T.deriveAdversarialVariant(sql,'activate'),'UNKNOWN_VARIANT');
throwsCode(()=>T.deriveAdversarialVariant(sql.replace(/ROLLBACK;\n$/,'COMMIT;\n'),'skip_batch'),
  'PREVIEW_MUST_NEVER_COMMIT_OR_CHANGE_ACL');
// per-batch SQL for 2..10 also correct now
for(const n of [2,3,8,9,10]){
  const p=T.planBatch(manifest,catalog,n,{expectedMappingSha:SHA}),s=T.renderRollbackSql(p,manifest);
  const ins=[...s.matchAll(/^\('(TKC?-\d{6})'/gm)].map(m=>m[1]);
  const r=T.batchRange(n);
  eq(ins.length,2*r.size,'batch '+n+' inserts '+r.size+' aliases + bindings');
  ok(ins.every(x=>{const k=Number(x.slice(x.indexOf('-')+1));return k>=r.first&&k<=r.last;}),'batch '+n+' range only');
  ok(s.endsWith('ROLLBACK;\n')&&!/\bCOMMIT\b/i.test(s));
  const h=T.renderSandboxHarness(p,manifest);
  eq((h.match(/SYNTHETIC PRIOR STAGED ALIAS/g)||[]).length,r.first-1,'harness '+n+' pre-stages prior batches');
}

// ---- 8. disposable harness scenarios
eq(Object.keys(T.ALL_SCENARIOS),['pass','retry','no_marker','prestaged_batch1','alias_collision','personal_shadow',
 'provider_drift_356','existing_356_missing','existing_356_unreviewed','legacy_drift','duplicate_batch',
 'reorder_batches','skip_batch']);
for(const name of Object.keys(T.ALL_SCENARIOS)){
  const h=T.renderAllSandboxHarness(A,manifest,name);
  ok(!/\b(COMMIT|GRANT|REVOKE|POLICY)\b/i.test(h),name+' harness never commits/grants');
  eq(h.includes('create table public.tk614_disposable_sandbox_marker'),name!=='no_marker',name+' marker');
  eq((h.match(/SYNTHETIC LEGACY GLOBAL/g)||[]).length,7);
  eq((h.match(/SYNTHETIC LEGACY PERSONAL/g)||[]).length,16);
  eq((h.match(/SYNTHETIC REVIEWED ALIAS/g)||[]).length,name==='existing_356_missing'?355:356);
  ok(h.includes('\\i /tmp/tk504-typed-fk-stage.sql'));
  ok(h.includes('HARNESS_STATE_NOT_RESTORED_AFTER_ROLLBACK')&&h.includes('HARNESS_226_LEFT_BEHIND_AFTER_ROLLBACK'));
  const sc=T.ALL_SCENARIOS[name];
  eq((h.match(/^\\i \/tmp\/tk614-all226-/gm)||[]).length,name==='retry'?2:1);
  ok(h.includes(sc.variant?'/tmp/tk614-all226-variant-'+sc.variant+'.sql':'/tmp/tk614-all226-rollback-only.sql'));
}
ok(T.renderAllSandboxHarness(A,manifest,'provider_drift_356').includes('-drift'));
ok(T.renderAllSandboxHarness(A,manifest,'personal_shadow').includes("('TKC-000063','SYNTHETIC FORGED PERSONAL SHADOW'"));
throwsCode(()=>T.renderAllSandboxHarness(A,manifest,'production'),'UNKNOWN_SCENARIO');
// Docker outcome judge (pure)
const M='TK614_SANDBOX_ALL226_ROLLBACK_VERIFIED_356_AND_23_AND_HISTORY_UNCHANGED';
eq(P.judge('pass',0,M,''),true);
eq(P.judge('pass',0,'nothing',''),false,'pass needs the marker');
eq(P.judge('pass',3,M,'ERROR: x'),false);
eq(P.judge('no_marker',3,'','psql:x:1: ERROR:  NOT_A_DISPOSABLE_SANDBOX'),true);
eq(P.judge('no_marker',0,M,''),false,'no marker must HARD fail');
eq(P.judge('duplicate_batch',3,'','ERROR:  BATCH_GAP_OR_OUT_OF_ORDER'),false,'wrong guard is not a pass');
const art=P.buildArtifacts(manifest,catalogBytes);
eq(Object.keys(art.files).length,1+13+3);
eq(art.files['tk614-all226-rollback-only.sql'],sql);
throwsCode(()=>P.parseArgs(['--manifest','rel.json','--out-dir','rel']),'PATHS_MUST_BE_ABSOLUTE');
throwsCode(()=>P.parseArgs(['--manifest',path.join(os.tmpdir(),'m.json'),'--out-dir',os.tmpdir(),'--commit','1']),'USAGE');
throwsCode(()=>P.run(['--manifest',path.join(os.tmpdir(),'m.json'),'--out-dir',path.join(__dirname,'tk614-NO-proof')]),
  'PRIVATE_OUTPUT_INSIDE_REPOSITORY');
ok(!fs.existsSync(path.join(__dirname,'tk614-NO-proof')));

// ---- 9. CLI --batch all: private-or-nothing, no slugs on stdout
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tk614-all226-synthetic-'));
try{
 const src=path.join(tmp,'synthetic-manifest.json');fs.writeFileSync(src,JSON.stringify(manifest));
 throwsCode(()=>P.run(['--manifest',src,'--out-dir',tmp]),'EEXIST_PRIVATE_OUTPUT','proof never reuses a dir');
 const out=path.join(tmp,'all.json'),sqlOut=path.join(tmp,'all.sql'),sbx=path.join(tmp,'all-harness.sql');
 const logs=[],orig=process.stdout.write;let rep,rep2,reps=[];
 try{process.stdout.write=x=>{logs.push(String(x));return true;};
  rep=T.run(['--manifest',src,'--batch','all','--expected-mapping-sha',SHA]);
  rep2=T.run(['--manifest',src,'--batch','all','--out',out,'--sql-out',sqlOut,'--sandbox-out',sbx]);
  for(const n of [2,3,4,5,6,7,8,9,10])reps.push(T.run(['--manifest',src,'--batch',String(n)]));}
 finally{process.stdout.write=orig;}
 eq([rep.status,rep.batch,rep.size,rep.active,rep.reviewed,rep.actual_database_writes],
  ['DRY_RUN_NO_RELEASE_AUTHORITY','all',226,0,0,false]);
 eq([rep.first_catalog_id,rep.last_catalog_id,rep.batches,rep.existing_reviewed_untouched,rep.canonical_after_staging],
  ['TK-000001','TK-000226',10,356,582]);
 eq(rep.all_sha256,A.all_sha256);eq(rep.batch_sha256s,A.batches.map(b=>b.batch_sha256));
 eq(rep.source_catalog_sha256,T.EXPECTED_SOURCE_CATALOG_SHA256);
 eq([rep.private_plan_created,rep.private_sql_created,rep.private_sandbox_created],[false,false,false]);
 eq([rep2.private_plan_created,rep2.private_sql_created,rep2.private_sandbox_created],[true,true,true]);
 eq(fs.readFileSync(sqlOut,'utf8'),sql);
 eq(fs.readFileSync(sbx,'utf8'),T.renderAllSandboxHarness(A,manifest,'pass'));
 {const j=JSON.parse(fs.readFileSync(out,'utf8'));eq(j.entries.length,226);eq(j.all_sha256,A.all_sha256);
  eq(j.release.release_authority,false);}
 eq(reps.map(r=>[r.batch,r.size,r.first_catalog_id,r.last_catalog_id,r.active,r.reviewed]),
  [2,3,4,5,6,7,8,9,10].map(n=>{const r=T.batchRange(n);return [n,r.size,'TK-'+pad(r.first),'TK-'+pad(r.last),0,0];}));
 ok(logs.every(l=>manifest.entries.every(e=>!l.includes(e.provider_id))),'stdout has zero provider slugs');
 assert.throws(()=>T.run(['--manifest',src,'--batch','all','--sql-out',sqlOut]),/EEXIST/);checks++;
 const late=path.join(tmp,'late.sql');
 throwsCode(()=>T.run(['--manifest',src,'--batch','all','--expected-source-sha','e'.repeat(64),'--sql-out',late]),
  'SOURCE_CATALOG_SHA_MISMATCH');
 throwsCode(()=>T.run(['--manifest',src,'--batch','all','--expected-source-sha','zz','--sql-out',late]),
  'EXPECTED_SOURCE_SHA_INVALID');
 throwsCode(()=>T.run(['--manifest',src,'--batch','3','--expected-source-sha','e'.repeat(64),'--sql-out',late]),
  'SOURCE_CATALOG_SHA_MISMATCH','single-batch mode is pinned too');
 throwsCode(()=>T.run(['--manifest',src,'--batch','all','--expected-mapping-sha','d'.repeat(64),'--sql-out',late]),
  'STALE_OR_WRONG_MAPPING_SHA');
 ok(!fs.existsSync(late),'nothing written on failure');
 throwsCode(()=>T.run(['--manifest',src,'--batch','all','--sql-out',path.join(__dirname,'NO.sql')]),
  'PRIVATE_OUTPUT_INSIDE_REPOSITORY');
 ok(!fs.existsSync(path.join(__dirname,'NO.sql')));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log('TK614 all-226 preflight: '+checks+
 ' assertions PASS; 226/226 identities, 10 ordered batches, one ROLLBACK-only txn, 356 + 23 + history untouched, nothing activated');
