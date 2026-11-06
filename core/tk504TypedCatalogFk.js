/* TK504 / #603. Deterministic catalog<->session FK identity contract.
 * Staged, NOT installed in index.html. No client-created grants/DB rights.
 * Only a verified publication+binding may allow an app write.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.TK504TypedCatalogFk=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const CATALOG=/^TK-([0-9]{6})$/;
 const ALIAS=/^TKC-([0-9]{6})$/;
 const KIND='movekit-catalog-v1';
 const MAX=582;
 function fail(code){const err=new Error(code);err.code=code;return err;}
 function parseCatalogId(id){
   const m=typeof id==='string'&&CATALOG.exec(id);
   const n=m?Number(m[1]):0;
   return n>=1&&n<=MAX?n:null;
 }
 function parseFkId(id){
   const m=typeof id==='string'&&ALIAS.exec(id);
   const n=m?Number(m[1]):0;
   return n>=1&&n<=MAX?n:null;
 }
 function fkForCatalog(id){
   const n=parseCatalogId(id);
   if(n===null)throw fail('INVALID_CATALOG_ID');
   return 'TKC-'+String(n).padStart(6,'0');
 }
 function catalogForFk(id){
   const n=parseFkId(id);
   return n===null?null:'TK-'+String(n).padStart(6,'0');
 }
 function create(opts){
   const ecs=opts&&opts.catalogService;
   const verifiedBinding=opts&&opts.verifiedBinding;
   if(!ecs||typeof ecs.byId!=='function')throw fail('CATALOG_NOT_CONFIGURED');
   if(typeof verifiedBinding!=='function')throw fail('BINDING_AUTHORITY_NOT_CONFIGURED');
   function catalogItem(id){
     if(parseCatalogId(id)===null)return null;
     const c=ecs.byId(id);
     if(!c||c.catalog_id!==id||!c.source||c.source.provider!=='movekit'||
         typeof c.source.provider_id!=='string'||
         !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.source.provider_id)||
         c._review&&(c._review.status==='NOT_PUBLISHED'||
                      c._review.selectable===false))return null;
     return c;
   }
   function resolveSelection(selection){
     // A personal exercises.id that happens to look like TK-###### is NOT
     // evidence of catalog identity. Require the original picker provenance.
     if(!selection||typeof selection!=='object'||Array.isArray(selection)||
         selection._catalog!==true||selection.catalog_id!==selection.id||
         Object.prototype.hasOwnProperty.call(selection,'scope')||
         Object.prototype.hasOwnProperty.call(selection,'user_id')||
         Object.prototype.hasOwnProperty.call(selection,'owner_id'))return null;
     const c=catalogItem(selection.catalog_id);
     if(!c)return null;
     if(selection.source && (selection.source.provider!=='movekit'||
          selection.source.provider_id!==c.source.provider_id))return null;
     return Object.freeze({kind:KIND,catalogId:c.catalog_id,
       providerId:c.source.provider_id,fkId:fkForCatalog(c.catalog_id)});
   }
   function requireBinding(ref){
     if(!ref||ref.kind!==KIND||!catalogItem(ref.catalogId)||
        ref.fkId!==fkForCatalog(ref.catalogId)||
        ref.providerId!==catalogItem(ref.catalogId).source.provider_id||
        // Only the explicitly provisioned/verified binding table can attest
        // that this global FK alias is present and approved for use.
        verifiedBinding(ref.catalogId,ref.fkId,ref.providerId)!==true)
       throw fail('CATALOG_FK_UNVERIFIED');
     return ref;
   }
   function prepareSessionRow(selection,row){
     const ref=resolveSelection(selection);
     if(!ref)throw fail('NOT_CANONICAL_SELECTION');
     requireBinding(ref);
     if(!row||typeof row!=='object'||Array.isArray(row)||
        row.exercise_id!==ref.catalogId)throw fail('SESSION_IDENTITY_MISMATCH');
     // Persist only the durable, globally provisioned FK alias. No second
     // writer. Keep the caller's idempotency key, sets, notes and data intact.
     return Object.freeze({...row,exercise_id:ref.fkId});
   }
   function resolveHistoryRow(row){
     if(!row||typeof row!=='object'||Array.isArray(row))return null;
     const id=catalogForFk(row.exercise_id);
     if(!id)return null; // legacy / personal rows are never inferred by name.
     const c=catalogItem(id);
     if(!c)return null;
     const ref=Object.freeze({kind:KIND,catalogId:id,
       providerId:c.source.provider_id,fkId:row.exercise_id});
     // The signed binding check protects against another user's spoofed
     // private alias and avoids rendering unknown FK IDs as MoveKit.
     try{requireBinding(ref);}catch(_){return null;}
     return Object.freeze({catalog_id:id,source:c.source,identity:c.identity,
       session:row,ref});
   }
   return Object.freeze({resolveSelection,prepareSessionRow,resolveHistoryRow,
     requireBinding,catalogItem});
 }
 function planBindings(ids,existingDbIds){
   if(!Array.isArray(ids)||!Array.isArray(existingDbIds))throw fail('INVALID_BINDING_PLAN');
   const seen=new Set(),existing=new Set(existingDbIds);
   const rows=[];
   for(const id of ids){
     if(parseCatalogId(id)===null||seen.has(id))throw fail('INVALID_OR_DUPLICATE_CATALOG_ID');
     seen.add(id);
     const fk=fkForCatalog(id);
     if(existing.has(fk))throw fail('RESERVED_FK_COLLISION');
     rows.push(Object.freeze({kind:KIND,catalogId:id,fkId:fk}));
   }
   return Object.freeze(rows);
 }
 return Object.freeze({KIND,MAX,parseCatalogId,parseFkId,
   fkForCatalog,catalogForFk,planBindings,create});
});
