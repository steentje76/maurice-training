'use strict';
// Pure dry-run planner. No database, history, media or entitlement writes.
const {audit}=require('./movekitV2BindingAudit.js');
function plan(published,rows,bindings=[],staged=null){
  const baseline=audit(published,rows);
  if(!Array.isArray(bindings))throw new Error('INVALID_BINDINGS');
  const byId=new Map(rows.map(r=>[r.id,r]));
  if(byId.size!==rows.length)throw new Error('DUPLICATE_DATABASE_ID');
  const canon=new Map(published.catalog.map(r=>[r.catalog_id,r]));
  const bound=new Map(),used=new Set();
  for(const b of bindings){
    const entry=b&&canon.get(b.catalog_id),row=b&&byId.get(b.exercise_id);
    if(!entry||!row||row.scope!=='global'||row.user_id!=null||row.owner_id!=null||
      row.created_by!=null||b.provider_id!==entry.source.provider_id||
      b.status!=='approved'||typeof b.review_ref!=='string'||!b.review_ref.trim()||
      bound.has(b.catalog_id)||used.has(b.exercise_id))throw new Error('UNSAFE_APPROVED_BINDING');
    bound.set(b.catalog_id,b);used.add(b.exercise_id);
  }
  let entries=published.catalog;
  if(staged!==null){
    if(!staged||!Array.isArray(staged.catalog)||staged.catalog.length!==582)
      throw new Error('INVALID_STAGED_CATALOG');
    const ids=new Set(),slugs=new Set();
    for(let i=0;i<582;i++){
      const e=staged.catalog[i],id='TK-'+String(i+1).padStart(6,'0');
      if(!e||e.catalog_id!==id||!e.source||e.source.provider!=='movekit'||
        typeof e.source.provider_id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.source.provider_id)||
        ids.has(id)||slugs.has(e.source.provider_id))throw new Error('INVALID_STAGED_IDENTITY');
      ids.add(id);slugs.add(e.source.provider_id);
      if(i<226&&JSON.stringify(e)!==JSON.stringify(published.catalog[i]))
        throw new Error('PUBLISHED_CATALOG_CHANGED');
    }
    entries=staged.catalog;
  }
  const operations=entries.map(entry=>{
    if(!canon.has(entry.catalog_id))return {catalog_id:entry.catalog_id,
      exercise_id:'movekit-v2-'+entry.catalog_id,action:'HOLD_CLASSIFICATION_REVIEW',
      requires_review:true};
    const cid=entry.catalog_id,b=bound.get(cid);
    if(b)return {catalog_id:cid,exercise_id:b.exercise_id,action:'KEEP_REVIEWED_BINDING'};
    // Never adopt even a matching global name or TK id without explicit review.
    const proposed='movekit-v2-'+cid;
    return {catalog_id:cid,exercise_id:proposed,
      action:byId.has(proposed)?'HOLD_DATABASE_ID_COLLISION':'PROPOSE_NEW_GLOBAL',
      provider_id:entry.source.provider_id,requires_review:true};
  });
  return {schema:'trainingskompas-movekit-import-plan/1.0',
    status:'DRY_RUN_REVIEW_REQUIRED',baseline,operations,
    historical_updates:0,personal_updates:0,grant_writes:0,
    executable:false};
}
module.exports=Object.freeze({plan});
