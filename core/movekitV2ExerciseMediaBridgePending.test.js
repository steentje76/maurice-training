'use strict';
/* Staging-only security regression: MoveKit PRIVATE 582 catalog must never
 * provide signed-media identities, even if all original 226 are present.
 * Synthetic fixtures only. No network, DB, media or customer tokens.
 */
const assert=require('node:assert/strict');
const api=require('./movekitV2ExerciseMediaBridge.js');
const published=require('../exercise-catalog.json');
const calls=[];
const client={get:async(...args)=>{calls.push(args);return {ok:true};},
 invalidate:()=>{calls.push(['invalidate']);}};
let checks=0;
function ok(v,msg){assert(v,msg);checks++;}
const privateStage={_status:'PRIVATE_REVIEW_NOT_RELEASED',
 catalog:[...published.catalog.map(e=>JSON.parse(JSON.stringify(e)))]};
for(let i=227;i<=582;i++)privateStage.catalog.push({
 catalog_id:'TK-'+String(i).padStart(6,'0'),
 source:{provider:'movekit',provider_id:'synthetic-review-'+i},
 identity:{name:'Synthetic '+i,category:'pending_review'},
 _review:{status:'NOT_PUBLISHED'},
 assets:[]
});
const bridge=api.create({catalog:privateStage,mediaClient:client});
ok(bridge.registeredMoveKitExercises===0,'private review: zero eligible identities');
ok(bridge.resolve(privateStage.catalog[0])===null,'even existing 226 blocked when supplied by private stage');
ok(bridge.resolve({catalog_id:'TK-000227'})===null,'new 356 denied');
ok(bridge.activeUi===false,'no UI activation');
ok(bridge.directStorageAccess===false,'no direct storage');
const active=api.create({catalog:published,mediaClient:client});
ok(active.registeredMoveKitExercises===226,'existing published catalogue path unchanged');
ok(active.resolve(published.catalog[0])!==null,'existing published record still eligible for server authorization');
const marked=JSON.parse(JSON.stringify(published.catalog[0]));
marked._review={status:'NOT_PUBLISHED'};
const markedBridge=api.create({catalog:{catalog:[marked]},mediaClient:client});
ok(markedBridge.registeredMoveKitExercises===0,'not-published marker blocks even if normal category');
const unknownRelease={catalog:[published.catalog[0]],_status:'RELEASE_APPROVED'};
assert.throws(()=>api.create({catalog:unknownRelease,mediaClient:client}),/UNTRUSTED_CATALOG_RELEASE_STATUS/);checks++;
const pendingNoMarker={...published.catalog[0],
 identity:{...published.catalog[0].identity,category:'pending_review'}};
ok(api.create({catalog:{catalog:[pendingNoMarker]},mediaClient:client})
 .registeredMoveKitExercises===0,'pending category blocks despite no review metadata');
const duplicate=JSON.parse(JSON.stringify(privateStage));
duplicate.catalog[300].catalog_id=duplicate.catalog[299].catalog_id;
assert.throws(()=>api.create({catalog:duplicate,mediaClient:client}),/DUPLICATE_EXERCISE_CATALOG_ID/);checks++;
const duplicateSlug=JSON.parse(JSON.stringify(privateStage));
duplicateSlug.catalog[300].source.provider_id=duplicateSlug.catalog[299].source.provider_id;
assert.throws(()=>api.create({catalog:duplicateSlug,mediaClient:client}),/INVALID_MOVEKIT_SOURCE_IDENTITY/);checks++;
(async()=>{
 await assert.rejects(()=>bridge.requestStaged(
  {catalog_id:privateStage.catalog[226].catalog_id},'video','synthetic-owner'
 ),/CANONICAL_EXERCISE_UNBOUND/);checks++;
 ok(calls.length===0,'no client network calls for private review');
 console.log('MoveKit V2 private media staging guard: '+checks+' PASS; no activation or signing calls');
})().catch(err=>{console.error(err.stack);process.exitCode=1;});
