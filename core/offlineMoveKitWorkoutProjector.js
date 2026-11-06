/* Offline MoveKit workout projection — staging, no DB mutations.
 * Real Supabase exercises.id and training snapshot items[].exercise_id are
 * TEXT identifiers, NOT UUIDs; exercises has NO catalog_id column.
 * A direct TK ID is safe to resolve if it exists in the canonical inventory.
 * Other IDs can only resolve using a separately reviewed ID-binding registry.
 * Never infer an exercise by title, position or muscle group.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OfflineMoveKitWorkoutProjector=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const EXID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
 const CID=/^TK-\d{6}$/;
 const REVIEW=/^TK504-[0-9]{8}-[0-9]{3,6}$/;
 function validId(value){return typeof value==='string'&&EXID.test(value);}
 function requireArray(value,code){if(!Array.isArray(value))throw new Error(code);return value;}
 function project(snapshot,exerciseRows,inventory,verifiedBindings){
   if(!snapshot||(snapshot.source!=='vaste_training'&&snapshot.source!=='custom_training')
       ||!Array.isArray(snapshot.items))throw new Error('INVALID_SNAPSHOT');
   const rows=requireArray(exerciseRows,'INVALID_EXERCISE_ROWS');
   const target=requireArray(inventory&&inventory.items,'INVALID_INVENTORY');
   const bindings=verifiedBindings==null?[]:requireArray(verifiedBindings,'INVALID_BINDINGS');
   const allowed=new Set();
   target.forEach(e=>{
     if(!e||!CID.test(e.catalog_id)||allowed.has(e.catalog_id))throw new Error('INVALID_INVENTORY');
     allowed.add(e.catalog_id);
   });
   const known=new Set();
   rows.forEach(row=>{
     if(!row||!validId(row.id))throw new Error('INVALID_EXERCISE_ROW');
     if(known.has(row.id))throw new Error('DUPLICATE_EXERCISE_ROW');
     known.add(row.id);
   });
   const mapped=new Map();
   bindings.forEach(binding=>{
     if(!binding||!validId(binding.exercise_id)||!CID.test(binding.catalog_id)
         ||!REVIEW.test(binding.review_id))throw new Error('INVALID_BINDING');
     if(!known.has(binding.exercise_id)||!allowed.has(binding.catalog_id))throw new Error('UNVERIFIED_BINDING');
     if(mapped.has(binding.exercise_id))throw new Error('DUPLICATE_BINDING');
     // Reviewed mapping identities must be approved in version control.
     // Never generate them from exercise names or AI predictions.
     mapped.set(binding.exercise_id,binding.catalog_id);
   });
   const resolved=[],missing=[],seen=new Set();
   snapshot.items.forEach(item=>{
     if(!item||!validId(item.exercise_id))throw new Error('INVALID_SNAPSHOT_EXERCISE');
     const id=item.exercise_id;
     if(!known.has(id)){if(!missing.includes(id))missing.push(id);return;}
     const direct=CID.test(id)&&allowed.has(id)?id:null;
     const catalogId=direct||mapped.get(id);
     if(!catalogId){if(!missing.includes(id))missing.push(id);return;}
     if(!seen.has(catalogId)){seen.add(catalogId);resolved.push(catalogId);}
   });
   return Object.freeze({
     source:snapshot.source,
     definitionId:snapshot.definition_id??null,
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