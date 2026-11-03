'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {project}=require('./offlineMoveKitWorkoutProjector.js');
const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'),'utf8'));
// These are synthetic TEXT exercise IDs, matching the actual Supabase column types.
// Exercise rows have no catalog_id field. No invented live mappings are committed.
const A='TK-000206';
const B='legacy_squat';
const C='custom_exercise';
const rows=[{id:A},{id:B},{id:C}];
const bindings=[{exercise_id:B,catalog_id:'TK-000227',review_id:'TK504-20261103-001'}];
const snap={source:'vaste_training',definition_id:'A',items:[
  {exercise_id:A,sets:3,reps:10,sort_order:0,wu:1},
  {exercise_id:B,sets:4,reps:8,sort_order:1,wu:0}
],decision_rules:{some:'deterministic-evidence-is-not-copied'}};
let passed=0;
const t=(name,fn)=>{fn();passed++;};
const fails=(fn,code)=>assert.throws(fn,e=>e.message===code);
const result=project(snap,rows,inventory,bindings);
t('canonical snapshot source retained',()=>assert.equal(result.source,'vaste_training'));
t('snapshot definition retained',()=>assert.equal(result.definitionId,'A'));
t('direct TK and verified binding work',()=>assert.deepEqual(result.catalogIds,['TK-000206','TK-000227']));
t('complete only after explicit binding',()=>assert.equal(result.coverage,'COMPLETE'));
t('unresolved list empty after verified binding',()=>assert.deepEqual(result.unresolvedExerciseIds,[]));
t('total snapshot items retained',()=>assert.equal(result.totalSnapshotItems,2));
t('raw media never exposed',()=>assert.equal(result.containsRawMedia,false));
t('licence marker retained',()=>assert.equal(result.offlineVideoStatus,'LICENCE_REVIEW_REQUIRED'));
t('decision evidence never recomputed',()=>assert(!('decision_rules' in result)));
t('no media link from projector',()=>assert(!JSON.stringify(result).includes('.mp4')));
t('source snapshot unchanged',()=>assert.deepEqual(snap.items.map(x=>x.reps),[10,8]));
t('immutable result',()=>assert(Object.isFrozen(result)&&Object.isFrozen(result.catalogIds)));
const mixed=project({...snap,source:'custom_training',items:[...snap.items,{exercise_id:C}]},rows,inventory,bindings);
t('custom training snapshot supported',()=>assert.equal(mixed.source,'custom_training'));
t('unmapped text IDs become PARTIAL',()=>assert.equal(mixed.coverage,'PARTIAL'));
t('unresolved text ID reported',()=>assert.deepEqual(mixed.unresolvedExerciseIds,[C]));
t('no false completeness with unbound exercise',()=>assert.notEqual(mixed.coverage,'COMPLETE'));
const none=project({...snap,items:[{exercise_id:C}]},rows,inventory);
t('unresolved-only snapshot is NONE',()=>assert.equal(none.coverage,'NONE'));
t('unmapped exercise never mapped by title',()=>assert.deepEqual(none.catalogIds,[]));
t('deduplicate duplicate snapshot exercise',()=>assert.deepEqual(project({...snap,items:[snap.items[0],snap.items[0]]},rows,inventory).catalogIds,[A]));
t('no magic catalog_id column in exercise rows',()=>{
 const x=project(snap,[rows[0],{...rows[1],catalog_id:'TK-000227'},rows[2]],inventory);
 assert.equal(x.coverage,'PARTIAL');assert.deepEqual(x.unresolvedExerciseIds,[B]);
});
t('invalid snapshot source rejected',()=>fails(()=>project({...snap,source:'other'},rows,inventory),'INVALID_SNAPSHOT'));
t('invalid snapshot items rejected',()=>fails(()=>project({...snap,items:null},rows,inventory),'INVALID_SNAPSHOT'));
t('invalid exercise rows rejected',()=>fails(()=>project(snap,null,inventory),'INVALID_EXERCISE_ROWS'));
t('missing inventory rejected',()=>fails(()=>project(snap,rows,null),'INVALID_INVENTORY'));
t('traversal-like snapshot ID rejected',()=>fails(()=>project({...snap,items:[{exercise_id:'../../secret'}]},rows,inventory),'INVALID_SNAPSHOT_EXERCISE'));
t('invalid binding identifier rejected',()=>fails(()=>project(snap,rows,inventory,[{...bindings[0],review_id:'fake'}]),'INVALID_BINDING'));
t('binding with unknown DB ID rejected',()=>fails(()=>project(snap,rows,inventory,[{...bindings[0],exercise_id:'unknown_row'}]),'UNVERIFIED_BINDING'));
t('binding to unknown catalog ID rejected',()=>fails(()=>project(snap,rows,inventory,[{...bindings[0],catalog_id:'TK-999999'}]),'UNVERIFIED_BINDING'));
t('duplicate binding rejected',()=>fails(()=>project(snap,rows,inventory,[bindings[0],bindings[0]]),'DUPLICATE_BINDING'));
t('duplicate exercise row rejected',()=>fails(()=>project(snap,[rows[0],rows[0]],inventory),'DUPLICATE_EXERCISE_ROW'));
t('invalid arbitrary catalog key rejected',()=>fails(()=>project(snap,rows,inventory,[{...bindings[0],catalog_id:'evil'}]),'INVALID_BINDING'));
t('valid but absent source exercise reported unknown',()=>{
 const v=project({...snap,items:[{exercise_id:'absent_exercise'}]},rows,inventory);
 assert.equal(v.coverage,'NONE');assert.deepEqual(v.unresolvedExerciseIds,['absent_exercise']);
});
console.log('Offline MoveKit real-schema workout projector: '+passed+' PASS');
