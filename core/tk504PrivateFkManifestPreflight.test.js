'use strict';
// #603: offline synthetic stage only. No real licensed 582-item stage, accounts,
// DB access, SQL execution, media grants, or production activation.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {verify,run,safelyOutsideRepo}=require('../tools/tk504_prepare_private_fk_manifest.cjs');
const root=path.join(__dirname,'..');
const catalog=require('../exercise-catalog.json');
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posters=require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const approval=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const release=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const stage={
 _status:'PRIVATE_REVIEW_NOT_RELEASED',_base_count:226,_new_count:356,count:582,
 _approved_for_import:0,_media_grants_created:0,_app_activated:false,
 _history_updates:0,_personal_exercise_updates:0,
 catalog:[...golden.items].sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id)).map((r,i)=>({
  catalog_id:r.catalog_id,
  source:{provider:'movekit',provider_id:r.provider_id},
  ...(i>=226?{_review:{status:'NOT_PUBLISHED',
    confirmed_by_authenticated_reviewer:false,
    media_entitlement_status:'NOT_VERIFIED',
    supplier_metadata_modified:false}}:{})
 }))
};
const opts=()=>({stage:structuredClone(stage),catalog:structuredClone(catalog),
 golden:structuredClone(golden),posters:structuredClone(posters),
 approval:structuredClone(approval),release:structuredClone(release)});
let checks=0;
function eq(a,b,m){assert.deepEqual(a,b,m);checks++;}
function ok(x,m){assert.ok(x,m);checks++;}
function rejected(change,code){
 const x=opts();change(x);
 assert.throws(()=>verify(x),err=>err.code===code,'Rejected '+code);
 checks++;
}
const plan=verify(opts());
eq(plan.schema,'tk504-private-typed-fk-preflight/1.0');
eq(plan.status,'DRY_RUN_NO_RELEASE_AUTHORITY');
eq(plan.entries.length,582);
eq(plan.counts.eligible_for_live_seed,0);
eq(plan.counts.existing,226);
eq(plan.counts.content_approved_unpublished,356);
eq(plan.counts.active,0);
eq(plan.counts.media_grants_created,0);
eq(new Set(plan.entries.map(e=>e.exercise_id)).size,582);
eq(new Set(plan.entries.map(e=>e.provider_id)).size,582);
ok(plan.entries.every((e,i)=>
 e.catalog_id==='TK-'+String(i+1).padStart(6,'0')&&
 e.exercise_id==='TKC-'+String(i+1).padStart(6,'0')&&
 e.active===false),'exact unique typed aliases and no activation');
eq(plan.entries[225].eligibility,'existing-catalog-not-authorized-for-new-binding');
eq(plan.entries[226].eligibility,'owner-content-approved-not-published');
ok(/^[0-9a-f]{64}$/.test(plan.mapping_sha256),'strong deterministic private digest');
ok(Object.values(plan.source_registry_sha256).length===3&&
 Object.values(plan.source_registry_sha256).every(x=>/^[0-9a-f]{64}$/.test(x)),
 'Three independent input registry digests');
eq(verify(opts()).source_registry_sha256,plan.source_registry_sha256);
eq(verify(opts()).mapping_sha256,plan.mapping_sha256);
rejected(x=>{x.stage._approved_for_import=356;},'PRIVATE_STAGE_MUST_REMAIN_UNRELEASED');
rejected(x=>{x.stage._media_grants_created=356;},'PRIVATE_STAGE_MUST_REMAIN_UNRELEASED');
rejected(x=>{x.stage._app_activated=true;},'PRIVATE_STAGE_MUST_REMAIN_UNRELEASED');
rejected(x=>{x.stage.count=581;},'PRIVATE_STAGE_MUST_REMAIN_UNRELEASED');
rejected(x=>{x.stage.catalog.pop();},'PRIVATE_STAGE_NOT_582');
rejected(x=>{x.catalog.count=582;},'CANONICAL_PUBLISHED_BASELINE_CHANGED');
rejected(x=>{x.catalog.catalog[0].source.provider_id='invalid-change';},'PUBLISHED_SOURCE_ID_MUTATED');
rejected(x=>{x.stage.catalog[0].source.provider_id='invalid-change';},'MEDIA_IDENTITY_OR_PATH_MISMATCH');
rejected(x=>{x.stage.catalog[227].catalog_id='TK-000581';},'CATALOG_ID_OR_PROVIDER_INVALID');
rejected(x=>{x.stage.catalog[227].source.provider_id=x.stage.catalog[226].source.provider_id;},'DUPLICATE_PROVIDER_ID');
rejected(x=>{x.stage.catalog[227].source.provider_id='UPPERCASE';},'CATALOG_ID_OR_PROVIDER_INVALID');
rejected(x=>{x.stage.catalog[226]._review.status='PUBLISHED';},'NEW_SOURCE_NOT_VERIFIABLY_UNPUBLISHED');
rejected(x=>{x.stage.catalog[226]._review.media_entitlement_status='VERIFIED';},'NEW_SOURCE_NOT_VERIFIABLY_UNPUBLISHED');
rejected(x=>{x.stage.catalog[226]._review.confirmed_by_authenticated_reviewer=true;},'NEW_SOURCE_NOT_VERIFIABLY_UNPUBLISHED');
rejected(x=>{x.golden.items[226].video.path='public/unlicensed.mp4';},'MEDIA_IDENTITY_OR_PATH_MISMATCH');
rejected(x=>{x.posters.items[226].path='public/unlicensed.webp';},'MEDIA_IDENTITY_OR_PATH_MISMATCH');
rejected(x=>{x.approval.scope.content_approved_count=355;},'CONTENT_APPROVAL_IS_NOT_RELEASE_APPROVAL');
rejected(x=>{x.approval.access_release.batch_356_release_authorized=true;},'CONTENT_APPROVAL_IS_NOT_RELEASE_APPROVAL');
rejected(x=>{x.release.status='RELEASED';},'RELEASE_GATES_MUST_STAY_BLOCKED');
rejected(x=>{x.release.entries=[{id:'fake'}];},'RELEASE_GATES_MUST_STAY_BLOCKED');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tk504-fk-preflight-synthetic-'));
const src=path.join(temp,'private-staged-synthetic.json'),dst=path.join(temp,'PRIVATE-FK-DRY-RUN.json');
try{
 fs.writeFileSync(src,JSON.stringify(stage));
 ok(safelyOutsideRepo(src),'private source outside Git');
 ok(!safelyOutsideRepo(path.join(root,'core','tk504PrivateFkManifestPreflight.test.js')),
   'cannot write private manifest within repo');
 const oldOut=process.stdout.write;
 const logs=[];process.stdout.write=function(x){logs.push(String(x));return true;};
 let result;
 try{result=run(['--stage',src,'--out',dst]);}
 finally{process.stdout.write=oldOut;}
 eq(result.status,'DRY_RUN_NO_RELEASE_AUTHORITY');
 ok(fs.existsSync(dst),'private plan created only at explicit location');
 const saved=JSON.parse(fs.readFileSync(dst,'utf8'));
 eq(saved.entries.length,582);
 eq(saved.mapping_sha256,plan.mapping_sha256);
 eq(saved.private_stage_sha256,result.private_stage_sha256);
 ok(!logs.some(t=>t.includes(stage.catalog[10].source.provider_id)),
   'stdout never includes private provider identifiers');
 assert.throws(()=>run(['--stage',src,'--out',dst]),/EEXIST/);checks++;
 assert.throws(()=>run(['--stage',path.join(root,'exercise-catalog.json')]),
  /PRIVATE_STAGE_INSIDE_REPOSITORY/);checks++;
 assert.throws(()=>run(['--stage',src,'--out',path.join(root,'SHOULD_NEVER_EXIST.json')]),
  /PRIVATE_MANIFEST_INSIDE_REPOSITORY/);checks++;
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('TK504 private 582 typed-FK source preflight: '+checks+
 ' assertions PASS; 226+356 inventory, source/media/provider identity, content-only gate, private file containment, no DB/rights mutation');
