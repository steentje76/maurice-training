'use strict';
// #504/#603 — product-level bridge for the EXISTING ExerciseCatalogService.
// Nothing is released unless the backend explicitly returns an authorized
// published batch payload; in production the caller's feature flag is OFF.
// No second exercise catalog, personal exercise row, or session writer.
(function(root,factory){
  const value=factory();
  if(typeof module==='object'&&module.exports)module.exports=value;
  if(root)root.TK504PublishedCatalogRuntime=value;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  const PREFIX='TK-',NEW_START=227,MAX_NEW=356,EXISTING=226;
  const batchCount=n=>Number.isSafeInteger(n)&&n>0&&n<=MAX_NEW&&
    (n%25===0||n===MAX_NEW);
  const id=n=>PREFIX+String(n).padStart(6,'0');
  const safeText=s=>typeof s==='string'&&s.trim().length>0&&
    s.length<=400&&!/[<>\u0000-\u001f]/.test(s);
  const safeSlug=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  const arr=a=>Array.isArray(a)&&a.length<=40&&a.every(safeText);
  function validate(payload,baseline){
    if(!payload||payload.schema!=='tk504-authorized-catalog-v2/1.0'||
      payload.status!=='PUBLISHED_AND_ENTITLED'||
       !batchCount(payload.new_count)||payload.total!==EXISTING+payload.new_count||
      !Array.isArray(payload.items)||payload.items.length!==payload.new_count)throw Error('TK504_NOT_RELEASED_OR_INCOMPLETE');
    if(!baseline||baseline.length!==EXISTING)throw Error('TK504_EXISTING_BASELINE_CHANGED');
    const known=new Map(),provider=new Set();
    for(let i=0;i<EXISTING;i++){
      const c=baseline[i];if(!c||!/^TK-[0-9]{6}$/.test(c.catalog_id)||
        known.has(c.catalog_id)||c.source?.provider!=='movekit'||
        !safeSlug(c.source.provider_id))throw Error('TK504_BASELINE_INVALID');
      known.set(c.catalog_id,c);provider.add(c.source.provider_id);
    }
    const next=[];
    for(let i=0;i<payload.new_count;i++){
      const c=payload.items[i],cid=id(NEW_START+i),s=c&&c.source;
      if(!c||c.catalog_id!==cid||known.has(cid)||s?.provider!=='movekit'||
        !safeSlug(s.provider_id)||provider.has(s.provider_id)||
        c.reviewed!==true||c.published!==true)throw Error('TK504_UNREVIEWED_OR_DUPLICATE_RECORD');
      const I=c.identity;
      if(!I||!safeText(I.name)||!safeText(I.nl)||!safeText(I.category)||
        !safeText(I.family)||!safeText(I.pattern)||!safeText(I.type)||
        !safeText(I.difficulty)||!arr(I.primary)||!arr(I.secondary)||
        !arr(I.equipment)||!arr(I.goals))throw Error('TK504_INVALID_DISPLAY_METADATA');
      // No arbitrary HTML or URLs are installed as part of catalog metadata.
      // V2 videos/posters must always be requested through the separate
      // authenticated signed-media broker, never a catalog payload.
      if(c.assets&&(!Array.isArray(c.assets)||c.assets.length!==0))
        throw Error('TK504_MEDIA_MUST_BE_PRIVATE');
      if(!c.intelligence||typeof c.intelligence!=='object'||Array.isArray(c.intelligence)||
         !c.relations||typeof c.relations!=='object'||Array.isArray(c.relations)||
         !c.flags||typeof c.flags!=='object'||Array.isArray(c.flags)||
         !arr(c.relations.alternatives)||!arr(c.relations.progressions)||
         !arr(c.relations.regressions)||!arr(c.flags.injury_flags)||
         typeof c.flags.home_gym_ready!=='boolean'||typeof c.flags.travel_ready!=='boolean')
        throw Error('TK504_INVALID_DOMAIN_METADATA');
      provider.add(s.provider_id);
      const clean={
        catalog_id:cid,
        source:{provider:'movekit',provider_id:s.provider_id},
        identity:{
          name:I.name,nl:I.nl,category:I.category,family:I.family,
          pattern:I.pattern,type:I.type,difficulty:I.difficulty,
          primary:I.primary.slice(),secondary:I.secondary.slice(),
          equipment:I.equipment.slice(),goals:I.goals.slice()
        },
        // Attributes are released by the server, never inferred by the
        // catalog bridge itself. A later evidence gate controls AI claims.
        intelligence:JSON.parse(JSON.stringify(c.intelligence)),
        relations:{
          alternatives:c.relations.alternatives.slice(),
          progressions:c.relations.progressions.slice(),
          regressions:c.relations.regressions.slice()
        },
        assets:[],
        flags:{
          favorite:false,custom:false,
          home_gym_ready:c.flags.home_gym_ready,
          travel_ready:c.flags.travel_ready,
          injury_flags:c.flags.injury_flags.slice()
        }
      };
      next.push(clean);
    }
    const all=new Set(baseline.map(x=>x.catalog_id).concat(next.map(x=>x.catalog_id)));
    for(const c of next){
      for(const rel of ['alternatives','progressions','regressions'])
        if(!c.relations[rel].every(x=>all.has(x)))
          throw Error('TK504_UNKNOWN_RELATION_ID');
    }
    return next;
  }
  function create({catalog,service,invalidatePicker}){
    if(!catalog||!Array.isArray(catalog.catalog)||!service||
      typeof service.rebuildIndex!=='function'||typeof service.count!=='function')
      throw Error('TK504_ECS_NOT_READY');
    const original=catalog.catalog.slice();
    if(original.length!==EXISTING)throw Error('TK504_UNEXPECTED_INITIAL_CATALOG');
    let owner=null;
    const notify=()=>{service.rebuildIndex();if(typeof invalidatePicker==='function')invalidatePicker();};
    function clear(){
      if(owner===null)return false;
      catalog.catalog=original.slice();catalog.count=EXISTING;
      if(Array.isArray(catalog.sources)){
        catalog.sources=catalog.sources.map(s=>s&&s.provider==='movekit'
          ?{...s,count:EXISTING}:s);
      }
      owner=null;notify();
      return true;
    }
    function mount(payload,uid,ownerNow){
      if(!safeText(uid)||typeof ownerNow!=='function'||ownerNow()!==uid)
        throw Error('TK504_AUTH_OWNER_CHANGED');
      const list=validate(payload,original);
      // Install only after complete validation AND one final owner check.
      if(ownerNow()!==uid)throw Error('TK504_AUTH_OWNER_CHANGED');
      if(owner!==null)clear();
      catalog.catalog=original.concat(list);catalog.count=EXISTING+list.length;
      if(Array.isArray(catalog.sources)){
        catalog.sources=catalog.sources.map(s=>s&&s.provider==='movekit'
          ?{...s,count:catalog.count}:s);
      }
      owner=uid;notify();
      if(ownerNow()!==uid){clear();throw Error('TK504_AUTH_OWNER_CHANGED');}
      return {count:service.count(),added:list.length,owner_uid:uid};
    }
    return Object.freeze({mount,clear,owner:()=>owner,count:()=>service.count()});
  }
  return Object.freeze({create,validate});
});
