/*
 * MoveKit V2 -> existing ExerciseAssetProvider staging bridge.
 * Does NOT replace the UI's current V1 media manifest, enable production
 * playback, modify workout logs or silently bind a Supabase legacy ID.
 *
 * Existing approved catalog records are authoritative. The 356 pending
 * new exercise candidates remain unavailable until their catalog review.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.MoveKitV2ExerciseMediaBridge=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const ID=/^TK-\d{6}$/;
  const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function error(code){const e=new Error(code);e.code=code;return e;}

  function create(opts){
    opts=opts||{};
    const data=opts.catalog&&opts.catalog.catalog;
    const client=opts.mediaClient;
    if(!Array.isArray(data)||!client||typeof client.get!=='function'
       ||typeof client.invalidate!=='function'){
      throw error('BRIDGE_NOT_CONFIGURED');
    }
    const byCatalogId=new Map();
    const seenSlugs=new Set();
    for(const row of data){
      if(!row||typeof row.catalog_id!=='string'||!ID.test(row.catalog_id))
        throw error('INVALID_EXERCISE_CATALOG');
      if(byCatalogId.has(row.catalog_id))throw error('DUPLICATE_EXERCISE_CATALOG_ID');
      if(!row.source||row.source.provider!=='movekit')continue;
      const slug=row.source.provider_id;
      if(typeof slug!=='string'||!SLUG.test(slug)||seenSlugs.has(slug))
        throw error('INVALID_MOVEKIT_SOURCE_IDENTITY');
      seenSlugs.add(slug);
      byCatalogId.set(row.catalog_id,Object.freeze({
        catalogId:row.catalog_id,provider:'movekit',providerId:slug,
        version:'v2'
      }));
    }
    function resolve(exercise){
      if(!exercise||typeof exercise!=='object'||Array.isArray(exercise))return null;
      // Supabase exercises can have personal-scope rows reusing canonical TK IDs.
      // Those DB rows require an explicit, reviewed owner-bound crosswalk, and
      // must never be treated as published catalog entries merely by id/name.
      if(Object.prototype.hasOwnProperty.call(exercise,'scope') ||
         Object.prototype.hasOwnProperty.call(exercise,'user_id') ||
         Object.prototype.hasOwnProperty.call(exercise,'owner_id'))return null;
      const id=typeof exercise.catalog_id==='string' ? exercise.catalog_id
        : (typeof exercise.id==='string'&&ID.test(exercise.id) ? exercise.id : null);
      if(!id||!ID.test(id))return null;
      if(typeof exercise.id==='string'&&ID.test(exercise.id)&&exercise.id!==id)return null;
      const desc=byCatalogId.get(id);
      if(!desc)return null;
      // Supabase exercises.id is TEXT and is NOT automatically catalog_id.
      // If legacy metadata is supplied it must match the published catalog.
      if(exercise.source){
        if(exercise.source.provider!=='movekit'||
           exercise.source.provider_id!==desc.providerId)return null;
      }
      return desc;
    }
    async function requestStaged(exercise,type,ownerId){
      const desc=resolve(exercise);
      if(!desc)throw error('CANONICAL_EXERCISE_UNBOUND');
      if(type!=='video'&&type!=='poster')throw error('UNSUPPORTED_MEDIA_TYPE');
      // Never expose static private paths; only ephemeral server-signed URLs.
      return client.get(desc.catalogId,type,ownerId);
    }
    return Object.freeze({
      resolve,
      requestStaged,
      invalidate:()=>client.invalidate(),
      registeredMoveKitExercises:byCatalogId.size,
      activeUi:false,
      directStorageAccess:false,
      workoutLogWrites:false,
      unreviewedCatalogCandidatesVisible:false
    });
  }
  return Object.freeze({create});
});
