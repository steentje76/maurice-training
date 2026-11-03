/* Offline MoveKit workout projector — no writes, no network, no raw media.
 * Uses the SAME items/exercise_id structure emitted by snapshotFromVasteTraining
 * and snapshotFromCustomTraining. Only explicit verified exercise->catalog_id
 * mappings are accepted. Never infer an exercise from name or position.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OfflineMoveKitWorkoutProjector=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const CID=/^TK-\d{6}$/;
 function requireArray(value,code){if(!Array.isArray(value))throw new Error(code);return value;}
 function project(snapshot,exerciseRows,inventory){
   if(!snapshot || (snapshot.source!=='vaste_training'&&snapshot.source!=='custom_training') || !Array.isArray(snapshot.items))throw new Error('INVALID_SNAPSHOT');
   const rows=requireArray(exerciseRows,'INVALID_EXERCISE_ROWS');
   const target=requireArray(inventory?.items,'INVALID_INVENTORY');
   const allowed=new Set(target.map(x=>x.catalog_id));
   const mapping=new Map();
   rows.forEach(row=>{
     if(!row||typeof row.id!=='string'||!UUID.test(row.id))throw new Error('INVALID_EXERCISE_ROW');
     if(row.catalog_id!=null){
       if(!CID.test(row.catalog_id))throw new Error('INVALID_EXERCISE_MAPPING');
       if(mapping.has(row.id)&&mapping.get(row.id)!==row.catalog_id)throw new Error('CONFLICTING_CATALOG_MAPPING');
       mapping.set(row.id,row.catalog_id);
     }
   });
   const resolved=[],missing=[],seen=new Set();
   snapshot.items.forEach(item=>{
     if(!item||typeof item.exercise_id!=='string'||!UUID.test(item.exercise_id))throw new Error('INVALID_SNAPSHOT_EXERCISE');
     const catalogId=mapping.get(item.exercise_id);
     if(!catalogId||!allowed.has(catalogId)){
       if(!missing.includes(item.exercise_id))missing.push(item.exercise_id);
       return;
     }
     if(!seen.has(catalogId)){resolved.push(catalogId);seen.add(catalogId);}
   });
   return Object.freeze({
     source:snapshot.source,
     definitionId:snapshot.definition_id ?? null,
     catalogIds:Object.freeze(resolved),
     unresolvedExerciseIds:Object.freeze(missing),
     totalSnapshotItems:snapshot.items.length,
     coverage:missing.length===0?'COMPLETE':resolved.length===0?'NONE':'PARTIAL',
     offlineVideoStatus:'LICENCE_REVIEW_REQUIRED',
     containsRawMedia:false
   });
 }
 return Object.freeze({project:project});
});