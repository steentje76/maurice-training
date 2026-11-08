'use strict';
// TK614/#603 -- original 226 batch25 preflight. Offline synthetic only:
// the 582 identities come from the PUBLIC golden inventory via the real
// tk504 manifest verifier. No private manifest, DB, network, grants or release.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {verify}=require('../tools/tk504_prepare_private_fk_manifest.cjs');
const T=require('../tools/tk614_original226_batch25_preflight.cjs');
const catalog=require('../exercise-catalog.json');
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posters=require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const approval=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const release=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const migration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations',
  '20261106110000_tk504_typed_catalog_fk_stage.sql'),'utf8');

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

let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const throwsCode=(fn,code,m)=>{assert.throws(fn,e=>e.code===code||e.message===code,m||code);checks++;};
const clone=()=>structuredClone(manifest);
const plan=(n,o={})=>T.planBatch(o.manifest||manifest,o.catalog||catalog,n,
  {expectedMappingSha:o.sha||SHA});

// ---- source fingerprint: the public-derived mapping equals the pinned private SHA
eq(SHA,T.EXPECTED_MAPPING_SHA256,
 'public golden-derived 582 mapping reproduces the verified private manifest SHA');

// ---- schedule: 9 full batches of 25 + 1 batch of 1, contiguous, no gaps
const sched=T.batchSchedule();
eq(sched.length,10);
eq(sched.slice(0,9).every(b=>b.size===25),true);
eq(sched[9],{batch:10,first_catalog_id:'TK-000226',last_catalog_id:'TK-000226',size:1});
eq(sched.reduce((s,b)=>s+b.size,0),226);
ok(sched.every((b,i)=>i===0||Number(b.first_catalog_id.slice(3))===
  Number(sched[i-1].last_catalog_id.slice(3))+1),'no gaps between batches');
eq(sched[8].last_catalog_id,'TK-000225');

// ---- batch 1: exact 001..025, inactive, unreviewed, dry-run only
const b1=plan(1);
eq(b1.status,'DRY_RUN_NO_RELEASE_AUTHORITY');
eq(b1.schema,'tk614-original226-batch25-preflight/1.0');
eq([b1.batch.first_catalog_id,b1.batch.last_catalog_id,b1.batch.size],['TK-000001','TK-000025',25]);
eq(b1.entries.map(e=>e.catalog_id),Array.from({length:25},(_,i)=>'TK-'+String(i+1).padStart(6,'0')));
ok(b1.entries.every((e,i)=>e.exercise_id==='TKC-'+String(i+1).padStart(6,'0')&&
  e.active===false&&e.reviewed_at===null),'TKC alias, active=false, reviewed_at=null');
ok(b1.entries.every(e=>{const c=catalog.catalog.find(x=>x.catalog_id===e.catalog_id);
  return c.source.provider==='movekit'&&c.source.provider_id===e.provider_id&&
   catalog.id_map[e.provider_id]===e.catalog_id;}),'exact ID/provider/slug match with 226 catalog');
ok(b1.entries.every(e=>e.exercise_id!==e.catalog_id),'legacy TK-row is never the FK target');
eq(b1.release,{active:0,reviewed:0,media_grants:0,acl_changes:0,eligible_for_live_seed:0,
  release_authority:false});
eq(b1.source_mapping_sha256,SHA);
ok(Object.isFrozen(b1)&&Object.isFrozen(b1.entries[0]),'immutable plan');

// ---- idempotence: deterministic plan and SQL, byte-identical
eq(plan(1),b1);
eq(plan(1).batch_sha256,b1.batch_sha256);
const sql=T.renderRollbackSql(b1,manifest);
eq(T.renderRollbackSql(plan(1),clone()),sql,'reproducible SQL');

// ---- batch edges
eq(plan(9).batch.last_catalog_id,'TK-000225');
eq(plan(10).entries.map(e=>e.catalog_id),['TK-000226']);
eq(plan(10).entries[0].exercise_id,'TKC-000226');
for(const bad of [0,11,-1,1.5,'1',NaN,null,undefined])
  throwsCode(()=>plan(bad),'BATCH_OUT_OF_RANGE','batch '+String(bad));
ok(!plan(10).entries.some(e=>Number(e.catalog_id.slice(3))>226),'never crosses into 227..582');

// ---- stale / wrong SHA and tampered manifest
throwsCode(()=>plan(1,{sha:'b'.repeat(64)}),'STALE_OR_WRONG_MAPPING_SHA');
throwsCode(()=>T.planBatch(manifest,catalog,1,{expectedMappingSha:'nothex'}),'EXPECTED_SHA_INVALID');
{const m=clone();m.mapping_sha256='c'.repeat(64);
 throwsCode(()=>plan(1,{manifest:m}),'PROVISIONING_MAPPING_DIGEST_MISMATCH');}
{const m=clone();m.entries[3].provider_id='band-curl-x';
 throwsCode(()=>plan(1,{manifest:m}),'PROVISIONING_MAPPING_DIGEST_MISMATCH');}
{const m=clone();m.entries.pop();throwsCode(()=>plan(1,{manifest:m}),'WRONG_MANIFEST_ENTRY_COUNT');}
{const m=clone();m.status='RELEASED';throwsCode(()=>plan(1,{manifest:m}),'NOT_AN_UNRELEASED_582_PREFLIGHT');}

// ---- unreviewed release block: activation can never be smuggled in
{const m=clone();m.entries[0].active=true;throwsCode(()=>plan(1,{manifest:m}),'UNTRUSTED_ROW_IN_PRIVATE_PLAN');}
{const m=clone();m.counts.eligible_for_live_seed=25;
 throwsCode(()=>plan(1,{manifest:m}),'NOT_AN_UNRELEASED_582_PREFLIGHT');}
{const m=clone();m.entries[0].eligibility='owner-content-approved-not-published';
 throwsCode(()=>plan(1,{manifest:m}),'UNTRUSTED_ROW_IN_PRIVATE_PLAN');}
ok(/constraint tk504_active_requires_review check \(\s*not active or reviewed_at is not null/.test(migration),
 'DB constraint: active requires review');
ok(/b\.active=true\s+and b\.reviewed_at is not null/.test(migration),
 'resolver only returns active+reviewed bindings, so batch1 stays unresolvable');
for(const flag of ['--activate','--reviewed','--grant','--commit','--live'])
  throwsCode(()=>T.parseArgs(['--manifest',path.join(os.tmpdir(),'x.json'),flag,'1']),'USAGE');
throwsCode(()=>T.parseArgs(['--manifest',path.join(os.tmpdir(),'x.json'),'--batch','2']),
 'BATCH_NOT_IN_PREVIEW_SCOPE');
throwsCode(()=>T.parseArgs(['--manifest','relative.json']),'MANIFEST_PATH_MUST_BE_ABSOLUTE');

// ---- origin catalog drift / ID-shadow / slug collision
{const c=structuredClone(catalog);c.catalog.find(x=>x.catalog_id==='TK-000010').source.provider_id='band-row';
 throwsCode(()=>plan(1,{catalog:c}),'ORIGINAL_CATALOG_IDENTITY_MISMATCH');}
{const c=structuredClone(catalog);c.id_map['band-curl']='TK-000006';
 throwsCode(()=>plan(1,{catalog:c}),'ORIGINAL_CATALOG_IDENTITY_MISMATCH');}
{const c=structuredClone(catalog);c.catalog.pop();c.count=225;
 throwsCode(()=>plan(1,{catalog:c}),'ORIGINAL_226_BASELINE_CHANGED');}
{const c=structuredClone(catalog);c.catalog.find(x=>x.catalog_id==='TK-000188').source.provider='custom';
 throwsCode(()=>plan(1,{catalog:c}),'ORIGINAL_CATALOG_IDENTITY_MISMATCH');}
{const c=structuredClone(catalog);c.id_map[manifest.entries[300].provider_id]='TK-000001';
 throwsCode(()=>plan(1,{catalog:c}),'PROVIDER_COLLISION_WITH_NEW_356');}
// Pec Fly / Cable Bar Pushdown land in the expected batches (no reordering).
eq(T.batchOf('TK-000063'),3);eq(T.batchOf('TK-000188'),8);
ok(plan(3).entries.some(e=>e.catalog_id==='TK-000063'&&e.exercise_id==='TKC-000063'));
ok(plan(8).entries.some(e=>e.catalog_id==='TK-000188'&&e.exercise_id==='TKC-000188'));

// ---- disposable target-state preflight (same guards the SQL enforces)
const UID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function state(){
 const ex=[],bi=[];
 for(const e of manifest.entries.slice(226)){
  ex.push({id:e.exercise_id,scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
  bi.push({catalog_id:e.catalog_id,exercise_id:e.exercise_id,provider_id:e.provider_id,
   active:true,reviewed_at:'2026-11-07T00:00:00Z'});
 }
 // 23 old TK-shaped rows: 7 global + 16 personal; shape matches only.
 const legacy=[1,5,38,63,100,150,188,2,3,4,10,25,26,50,60,64,70,80,90,120,189,200,226];
 legacy.forEach((n,i)=>ex.push({id:'TK-'+String(n).padStart(6,'0'),
  scope:i<7?'global':'personal',active:true,created_by:i<7?null:UID,user_id:i<7?null:UID,gym_id:null}));
 return {exercises:ex,bindings:bi};
}
const s0=state();
eq(s0.exercises.filter(r=>/^TK-\d{6}$/.test(r.id)).length,23);
const r0=T.assertDisposableTargetState(s0,b1,manifest);
eq(r0.existing_356_intact,true);eq(r0.legacy_tk_rows,23);eq(r0.prior_batches_present,0);
eq(T.assertDisposableTargetState(state(),b1,manifest).legacy_fingerprint,r0.legacy_fingerprint);
{const s=state();s.bindings[10].active=false;throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'EXISTING_356_CHANGED_OR_MISSING');}
{const s=state();s.bindings[11].reviewed_at=null;throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'EXISTING_356_CHANGED_OR_MISSING');}
{const s=state();s.bindings.pop();throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'EXISTING_356_CHANGED_OR_MISSING');}
{const s=state();s.bindings[12].provider_id='wrong-provider';throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'EXISTING_356_CHANGED_OR_MISSING');}
{const s=state();const a=s.exercises.find(r=>r.id==='TKC-000300');a.scope='personal';a.user_id=UID;
 throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE');}
{const s=state();s.exercises.push({id:'TKC-000005',scope:'personal',active:true,created_by:UID,user_id:UID,gym_id:null});
 throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE','personal ID-shadow');}
{const s=state();s.exercises.push({id:'TKC-000005',scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
 throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'ORIGINAL_ALIAS_COLLISION');}
{const s=state();s.bindings.push({catalog_id:'TK-000030',exercise_id:'TKC-000030',provider_id:manifest.entries[29].provider_id,active:false,reviewed_at:null});
 s.exercises.push({id:'TKC-000030',scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
 throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'BATCH_GAP_OR_OUT_OF_ORDER');}
// idempotence: batch1 already staged -> refuse (never double insert)
function withBatch(s,b){for(const e of b.entries){
 s.exercises.push({id:e.exercise_id,scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
 s.bindings.push({catalog_id:e.catalog_id,exercise_id:e.exercise_id,provider_id:e.provider_id,active:false,reviewed_at:null});}return s;}
throwsCode(()=>T.assertDisposableTargetState(withBatch(state(),b1),b1,manifest),'BATCH_ALREADY_PRESENT');
// batch2 requires exactly batch1 inactive+unreviewed present; skipping is a gap
const b2=plan(2);
eq(T.assertDisposableTargetState(withBatch(state(),b1),b2,manifest).prior_batches_present,25);
throwsCode(()=>T.assertDisposableTargetState(state(),b2,manifest),'BATCH_GAP_OR_OUT_OF_ORDER');
{const s=withBatch(state(),b1);s.bindings.find(r=>r.catalog_id==='TK-000001').active=true;
 throwsCode(()=>T.assertDisposableTargetState(s,b2,manifest),'PRIOR_BATCH_NOT_INACTIVE_UNREVIEWED');}
{const s=state();s.bindings.push({catalog_id:'TK-000999',exercise_id:'TKC-000999',provider_id:'x',active:false,reviewed_at:null});
 throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'UNEXPECTED_BINDING');}
{const s=state();s.bindings[0].provider_id=manifest.entries[0].provider_id;
 throwsCode(()=>T.assertDisposableTargetState(s,b1,manifest),'EXISTING_356_CHANGED_OR_MISSING');}
// a state that mixes in the 356 as part of the 001..226 plan is impossible
throwsCode(()=>T.assertDisposableTargetState(state(),{...b1,entries:[...b1.entries,
  {catalog_id:'TK-000300',exercise_id:'TKC-000300',provider_id:manifest.entries[299].provider_id,active:false,reviewed_at:null}]},manifest),
 'BATCH_PLAN_TAMPERED');

// ---- SQL: ROLLBACK-only, sandbox-marker, no ACL/RLS/grants/activation
ok(sql.startsWith('-- TK614 #603: PRIVATE ROLLBACK-ONLY'));
ok(sql.includes('\\set ON_ERROR_STOP on'));
ok(sql.endsWith('ROLLBACK;\n'));
ok(!/\bCOMMIT\b/i.test(sql),'never COMMIT');
ok(!/\b(GRANT|REVOKE|ALTER|DROP|TRUNCATE|UPDATE|DELETE|POLICY|SECURITY\s+DEFINER|SET\s+ROLE)\b/i.test(sql),
 'no ACL/RLS/role/DDL changes and no update/delete of existing rows');
ok(sql.includes('NOT_A_DISPOSABLE_SANDBOX'),'refuses real databases without sandbox marker');
for(const g of ['EXISTING_356_CHANGED_OR_MISSING','ORIGINAL_ALIAS_COLLISION','RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE',
 'BATCH_GAP_OR_OUT_OF_ORDER','BATCH_ALREADY_PRESENT','PROVIDER_ALREADY_BOUND','LEGACY_TK_ROWS_CHANGED',
 'EXISTING_356_MODIFIED_IN_TXN','BATCH_ROWS_NOT_INACTIVE_UNREVIEWED'])ok(sql.includes(g),'SQL guard '+g);
const inserted=[...sql.matchAll(/^\('(TKC?-\d{6})'/gm)].map(m=>m[1]);
eq(inserted.length,50,'exactly 25 aliases + 25 bindings inserted');
eq(inserted.filter(x=>x.startsWith('TKC-')).length,25,'25 TKC aliases');
ok(inserted.every(x=>Number(x.slice(x.indexOf('-')+1))<=25),'inserts only touch batch 1 ids');
ok(/reviewed_at\)\s*VALUES/i.test(sql)&&(sql.match(/,false,NULL\)/g)||[]).length===25,
 'bindings explicitly active=false, reviewed_at=NULL');
ok(!/movekit_media_grants|insert into public\.sessions/i.test(sql),'no media grants, no sessions');
// synthetic sandbox harness: marker, 356 reviewed + 23 legacy (7 global/16 personal)
const h=T.renderSandboxHarness(b1,manifest);
ok(h.includes('create table public.tk614_disposable_sandbox_marker'),'harness creates sandbox marker');
eq((h.match(/SYNTHETIC LEGACY GLOBAL/g)||[]).length,7);
eq((h.match(/SYNTHETIC LEGACY PERSONAL/g)||[]).length,16);
eq((h.match(/SYNTHETIC REVIEWED ALIAS/g)||[]).length,356);
eq((h.match(/^\('TK-\d{6}','TKC-\d{6}','[a-z0-9-]+',true,'2026-11-07/gm)||[]).length,356);
ok(!/\b(COMMIT|GRANT|REVOKE|POLICY)\b/i.test(h),'harness never commits/grants');
ok(h.includes('\\i /tmp/tk504-typed-fk-stage.sql')&&h.includes('\\i /tmp/tk614-batch01-rollback-only.sql'));
ok(h.includes('HARNESS_STATE_NOT_RESTORED_AFTER_ROLLBACK'));
throwsCode(()=>T.renderRollbackSql({...b1,status:'RELEASED'},manifest),'NOT_A_DRY_RUN_BATCH_PLAN');
throwsCode(()=>T.renderRollbackSql({...b1,batch_sha256:'0'.repeat(64)},manifest),'BATCH_PLAN_TAMPERED');

// ---- CLI: private-or-nothing output, no provider slugs on stdout
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tk614-b25-synthetic-'));
try{
 const src=path.join(tmp,'synthetic-manifest.json');fs.writeFileSync(src,JSON.stringify(manifest));
 const out=path.join(tmp,'batch01.json'),sqlOut=path.join(tmp,'batch01.sql');
 const logs=[],orig=process.stdout.write;let rep,rep2;
 try{process.stdout.write=x=>{logs.push(String(x));return true;};
  rep=T.run(['--manifest',src,'--expected-mapping-sha',SHA]);
  rep2=T.run(['--manifest',src,'--expected-mapping-sha',SHA,'--out',out,'--sql-out',sqlOut]);}
 finally{process.stdout.write=orig;}
 eq(rep.status,'DRY_RUN_NO_RELEASE_AUTHORITY');eq(rep.private_plan_created,false);eq(rep.private_sql_created,false);
 eq(rep.batch,1);eq(rep.first_catalog_id,'TK-000001');eq(rep.last_catalog_id,'TK-000025');
 eq(rep.actual_database_writes,false);
 eq(rep2.private_plan_created,true);eq(rep2.private_sql_created,true);
 eq(fs.readFileSync(sqlOut,'utf8'),sql);
 eq(JSON.parse(fs.readFileSync(out,'utf8')).batch_sha256,b1.batch_sha256);
 ok(logs.every(l=>manifest.entries.every(e=>!l.includes(e.provider_id))),'stdout has zero provider slugs');
 assert.throws(()=>T.run(['--manifest',src,'--expected-mapping-sha',SHA,'--out',out]),/EEXIST/);checks++;
 throwsCode(()=>T.run(['--manifest',src,'--expected-mapping-sha',SHA,'--out',path.join(__dirname,'NO.json')]),
  'PRIVATE_OUTPUT_INSIDE_REPOSITORY');
 ok(!fs.existsSync(path.join(__dirname,'NO.json')));
 const inRepo=path.join(__dirname,'..','tools','tk614-NO-manifest.json');
 throwsCode(()=>T.run(['--manifest',inRepo]),'PRIVATE_MANIFEST_INSIDE_REPOSITORY');
 // default pin = verified private SHA; a stale pin is refused before any output
 try{process.stdout.write=()=>true;eq(T.run(['--manifest',src]).mapping_sha256,T.EXPECTED_MAPPING_SHA256);}
 finally{process.stdout.write=orig;}
 const late=path.join(tmp,'stale.json');
 throwsCode(()=>T.run(['--manifest',src,'--expected-mapping-sha','d'.repeat(64),'--out',late]),
  'STALE_OR_WRONG_MAPPING_SHA');
 ok(!fs.existsSync(late),'nothing written on failure');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
console.log('TK614 original226 batch25 preflight: '+checks+
 ' assertions PASS; batch1 TK-000001..025 inactive/unreviewed, 10-batch schedule, 356 untouched, rollback-only');
