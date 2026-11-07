'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {verify}=require('../tools/tk504_prepare_private_fk_manifest.cjs');
const {render,validatePrivateManifest,run}=require('../tools/tk504_render_private_fk_docker_preview.cjs');
const catalog=require('../exercise-catalog.json'),
 golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'),
 posters=require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json'),
 approval=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json'),
 release=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const stage={_status:'PRIVATE_REVIEW_NOT_RELEASED',
 _base_count:226,_new_count:356,count:582,_approved_for_import:0,
 _media_grants_created:0,_app_activated:false,_history_updates:0,
 _personal_exercise_updates:0,
 catalog:[...golden.items].sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id)).map((r,i)=>({
  catalog_id:r.catalog_id,source:{provider:'movekit',provider_id:r.provider_id},
  ...(i>=226?{_review:{status:'NOT_PUBLISHED',
   confirmed_by_authenticated_reviewer:false,media_entitlement_status:'NOT_VERIFIED',
   supplier_metadata_modified:false}}:{})
 }))};
const manifest={...verify({stage,catalog,golden,posters,approval,
  release:{...release,status:'BLOCKED_NOT_REVIEWED',entries:[]}}),
 private_stage_sha256:'a'.repeat(64)};
let checks=0;
function ok(v,m){assert.ok(v,m);checks++;}
function eq(a,b,m){assert.deepEqual(a,b,m);checks++;}
function reject(mutate,match){
 const clone=structuredClone(manifest);mutate(clone);
 assert.throws(()=>render(clone),match);checks++;
}
eq(validatePrivateManifest(manifest).length,582);
const sql=render(manifest);
ok(sql.startsWith('-- TK504 #603: PRIVATE ROLLBACK-ONLY PROOF'));
ok(sql.includes('\\set ON_ERROR_STOP on'));
ok(sql.includes('BEGIN;'));
ok(sql.endsWith('ROLLBACK;\n'));
ok(!/\bCOMMIT\b/i.test(sql),'SQL must contain no COMMIT anywhere');
ok(sql.includes('STAGED_ADMIN_BINDING_SCHEMA_REQUIRED'),'requires reviewed schema');
ok(sql.includes('EXISTING_RESERVED_FK_COLLISION'),'cannot overwrite old typed FK');
ok(sql.includes('EXISTING_TYPED_BINDINGS_PRESENT'),'one-time seed only');
eq((sql.match(/^\('TKC-[0-9]{6}'/gm)||[]).length,582);
eq((sql.match(/^\('TK-[0-9]{6}'/gm)||[]).length,582);
ok(!sql.includes('TK504_PRIVATE_MEDIA_RELEASE=true'),'no client release flag');
ok(!/insert into public\.sessions/i.test(sql),'never updates historical sessions');
ok(!/movekit_media_grants/i.test(sql),'no media grants');
ok(!/create policy/i.test(sql),'no RLS policy changes');
ok(!/update public\.exercises/i.test(sql),'never updates user exercises');
eq(render(manifest),sql,'reproducible exact SQL proof');
reject(x=>{x.entries[226].provider_id='wrong-slug';},/PROVISIONING_MAPPING_DIGEST_MISMATCH/);
reject(x=>{x.entries[226].exercise_id='TK-000227';},/UNTRUSTED_ROW_IN_PRIVATE_PLAN/);
reject(x=>{x.entries[226].active=true;},/UNTRUSTED_ROW_IN_PRIVATE_PLAN/);
reject(x=>{x.entries[226].eligibility='released';},/UNTRUSTED_ROW_IN_PRIVATE_PLAN/);
reject(x=>{x.entries.pop();},/WRONG_MANIFEST_ENTRY_COUNT/);
reject(x=>{x.counts.eligible_for_live_seed=582;},/NOT_AN_UNRELEASED_582_PREFLIGHT/);
reject(x=>{x.source_registry_sha256.golden_inventory_sha256='wrong';},/UNVERIFIED_PRIVATE_SOURCE_DIGESTS/);
reject(x=>{x.mapping_sha256='b'.repeat(64);},/PROVISIONING_MAPPING_DIGEST_MISMATCH/);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tk504-private-sql-synthetic-'));
try{
 const source=path.join(temp,'synthetic-private-plan.json');
 const dest=path.join(temp,'PRIVATE-ROLLBACK-ONLY.sql');
 fs.writeFileSync(source,JSON.stringify(manifest));
 const orig=process.stdout.write;const logs=[];
 let report;
 try{process.stdout.write=x=>{logs.push(String(x));return true;};
   report=run(['--manifest',source,'--out',dest]);}
 finally{process.stdout.write=orig;}
 eq(report.status,'DRY_RUN_ROLLBACK_ONLY');
 eq(report.rows,582);
 ok(fs.readFileSync(dest,'utf8').endsWith('ROLLBACK;\n'));
 ok(logs.every(s=>!s.includes(stage.catalog[10].source.provider_id)),
   'no private supplier slugs in stdout');
 assert.throws(()=>run(['--manifest',source,'--out',dest]),/EEXIST/);checks++;
 assert.throws(()=>run(['--manifest',source,'--out',path.join(__dirname,'DO_NOT_WRITE.sql')]),
  /PRIVATE_PLAN_OR_SQL_INSIDE_REPOSITORY/);checks++;
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('TK504 private 582 PostgreSQL preview: '+checks+
 ' assertions PASS; fixed 582 aliases and bindings, collision proof, mandatory rollback, no live DB/personal/media changes');
