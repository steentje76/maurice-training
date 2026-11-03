'use strict';
const assert=require('node:assert/strict');
const bridgeApi=require('./movekitV2ExerciseMediaBridge.js');
const published=require('../exercise-catalog.json');
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const calls=[];
const client={
  get:async(id,type,owner)=>{calls.push({id,type,owner});return Object.freeze({catalogId:id,type,version:'v2',expiresAt:123456});},
  invalidate:()=>calls.push({invalidate:true})
};
const bridge=bridgeApi.create({catalog:published,mediaClient:client});
const valid=published.catalog[0];
const pending=golden.items.find(x=>x.status==='proposed-new');
const owner='12345678-1234-4234-8234-123456789abc';
let passes=0;
function ok(condition,desc){assert.ok(condition,desc);passes++;}
(async()=>{
  ok(bridge.registeredMoveKitExercises===226,'exact published 226 only');
  ok(bridge.activeUi===false,'UI stays unchanged');
  ok(bridge.directStorageAccess===false,'no direct storage');
  ok(bridge.workoutLogWrites===false,'no database writes');
  ok(bridge.unreviewedCatalogCandidatesVisible===false,'no unreviewed 356');
  ok(bridge.resolve(valid).catalogId===valid.catalog_id,'canonical id by full object');
  ok(bridge.resolve({id:valid.catalog_id}).catalogId===valid.catalog_id,'canonical fallback when id really TK');
  ok(bridge.resolve({catalog_id:valid.catalog_id,id:'legacy_squat'}).catalogId===valid.catalog_id,
     'legacy TEXT row allowed only with explicit catalog id');
  ok(bridge.resolve({id:'legacy_squat'})===null,'no inference from legacy database id');
  ok(bridge.resolve({id:'abcd-uuid'})===null,'uuid not guessed to catalog id');
  ok(bridge.resolve({id:valid.catalog_id,scope:'personal',user_id:'another-user'})===null,
     'personal Supabase row with same canonical ID never auto-bound');
  ok(bridge.resolve({id:valid.catalog_id,scope:'global'})===null,
     'global Supabase row also needs reviewed explicit mapping rather than id-only trust');
  ok(bridge.resolve({id:valid.catalog_id,user_id:null})===null,
     'any DB owner marker blocks direct catalog binding');
  ok(bridge.resolve({catalog_id:pending.catalog_id})===null,'unreviewed proposed 356 blocked');
  ok(bridge.resolve({catalog_id:valid.catalog_id,
    source:{provider:'movekit',provider_id:'wrong-exercise'}})===null,'source slug must match');
  ok(bridge.resolve({catalog_id:valid.catalog_id,
    source:{provider:'non-movekit',provider_id:valid.source.provider_id}})===null,'provider mismatch blocked');
  ok(bridge.resolve({id:'TK-000002',catalog_id:valid.catalog_id})===null,'conflicting canonical ids blocked');
  ok(bridge.resolve([])===null,'arrays cannot masquerade as exercise');
  const a=await bridge.requestStaged(valid,'video',owner);
  ok(a.catalogId===valid.catalog_id&&a.type==='video','video staged route');
  const b=await bridge.requestStaged(valid,'poster',owner);
  ok(b.catalogId===valid.catalog_id&&b.type==='poster','poster staged route');
  ok(calls.length===2&&calls[0].owner===owner&&calls[1].owner===owner,'owner forwarded exactly');
  await assert.rejects(()=>bridge.requestStaged({id:'unknown'},'video',owner),/CANONICAL_EXERCISE_UNBOUND/);passes++;
  await assert.rejects(()=>bridge.requestStaged(valid,'url',owner),/UNSUPPORTED_MEDIA_TYPE/);passes++;
  ok(calls.length===2,'rejected cases never invoke media');
  bridge.invalidate();
  ok(calls.length===3&&calls[2].invalidate===true,'account switch reaches lower layer');
  assert.throws(()=>bridgeApi.create({catalog:{catalog:[valid,valid]},mediaClient:client}),/DUPLICATE_EXERCISE_CATALOG_ID/);passes++;
  assert.throws(()=>bridgeApi.create({catalog:{catalog:[{...valid,source:{provider:'movekit',provider_id:'BAD/SLUG'}}]},mediaClient:client}),/INVALID_MOVEKIT_SOURCE_IDENTITY/);passes++;
  assert.throws(()=>bridgeApi.create({catalog:{catalog:[valid,{...valid,catalog_id:'TK-999999'}]},mediaClient:client}),/INVALID_MOVEKIT_SOURCE_IDENTITY/);passes++;
  console.log('MoveKit V2 canonical ExerciseAssetProvider bridge: '+passes+' identity/security assertions PASS; 356 unreviewed not visible, UI still unwired');
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
