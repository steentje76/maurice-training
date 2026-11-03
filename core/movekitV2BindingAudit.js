'use strict';
// TK504 — READ-ONLY binding audit of the published MoveKit catalog against
// Supabase exercises. This produces classifications, not DB writes or media
// permissions. Personal-scope rows are never assumed to be global catalog rows.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root)root.MoveKitV2BindingAudit=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const ID=/^TK-\d{6}$/;
  const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const normalizeName=x=>x.trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
  function audit(published, rawRows){
    const source=published && published.catalog;
    if(!Array.isArray(source) || source.length!==226 || !Array.isArray(rawRows)){
      throw new Error('BINDING_AUDIT_INVALID_INPUT');
    }
    const canon=new Map(), slugs=new Set();
    for(const item of source){
      const id=item && item.catalog_id;
      const name=item && item.identity && item.identity.name;
      const provider=item && item.source;
      if(typeof id!=='string'||!ID.test(id)||canon.has(id)||
        typeof name!=='string'||!name.trim()||
        !provider||provider.provider!=='movekit'||
        typeof provider.provider_id!=='string'||!SLUG.test(provider.provider_id)||
        slugs.has(provider.provider_id))throw new Error('BINDING_AUDIT_CATALOG_INVALID');
      canon.set(id,item);
      slugs.add(provider.provider_id);
    }
    const rowsById=new Map();
    let legacyCount=0;
    for(const row of rawRows){
      if(!row || typeof row.id!=='string' || row.id.length>256 ||
          typeof row.name!=='string' || !row.name.trim() || row.name.length>512 ||
          typeof row.scope!=='string' || row.scope.length>64)
        throw new Error('BINDING_AUDIT_DB_ROW_INVALID');
      if(!ID.test(row.id)){
        legacyCount++;
        continue;
      }
      if(!rowsById.has(row.id))rowsById.set(row.id,[]);
      rowsById.get(row.id).push(row);
    }
    const report=[];
    const counts={catalog_only:0,global_name_match_unverified:0,
      global_name_conflict:0,personal_scope_hold:0,
      unknown_scope_hold:0,duplicate_id_hold:0,foreign_tk_hold:0};
    for(const [id,item] of canon){
      const matches=rowsById.get(id)||[];
      let verdict;
      if(matches.length===0)verdict='CATALOG_ONLY';
      else if(matches.length!==1)verdict='DUPLICATE_ID_HOLD';
      else if(matches[0].scope==='personal')verdict='PERSONAL_SCOPE_HOLD';
      else if(matches[0].scope!=='global')verdict='UNKNOWN_SCOPE_HOLD';
      else if(normalizeName(matches[0].name)!==normalizeName(item.identity.name))
        verdict='GLOBAL_NAME_CONFLICT';
      else verdict='GLOBAL_NAME_MATCH_UNVERIFIED';
      const counter={CATALOG_ONLY:'catalog_only',DUPLICATE_ID_HOLD:'duplicate_id_hold',
        PERSONAL_SCOPE_HOLD:'personal_scope_hold',UNKNOWN_SCOPE_HOLD:'unknown_scope_hold',
        GLOBAL_NAME_CONFLICT:'global_name_conflict',
        GLOBAL_NAME_MATCH_UNVERIFIED:'global_name_match_unverified'}[verdict];
      counts[counter]++;
      // No personal name, user_id or other private row values in the report.
      report.push(Object.freeze({catalog_id:id, status:verdict,
        candidateForApprovedBinding: false}));
    }
    for(const [id,rows] of rowsById){
      if(canon.has(id))continue;
      counts.foreign_tk_hold+=rows.length;
    }
    if(report.length!==226)throw new Error('BINDING_AUDIT_UNEXPECTED_CATALOG_SIZE');
    return Object.freeze({
      schema:'trainingskompas-movekit-v2-binding-audit/1.0',
      status:'READ_ONLY_UNVERIFIED_NO_BINDING_ACTIVATION',
      existing_catalog_count:report.length, db_record_count:rawRows.length,
      db_legacy_ids:legacyCount,
      ...counts,
      rows:report
    });
  }
  return Object.freeze({audit});
});
