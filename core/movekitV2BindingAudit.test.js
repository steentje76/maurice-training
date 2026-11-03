'use strict';
// Synthetic, no real account IDs or confidential exercise data.
const assert=require('node:assert/strict');
const {audit}=require('./movekitV2BindingAudit.js');
const catalog=require('../exercise-catalog.json');
const id=n=>'TK-'+String(n).padStart(6,'0');
const name=n=>catalog.catalog[n-1].identity.name;
let passed=0;
function check(label,fn){try{fn();passed++;}catch(e){e.message=label+': '+e.message;throw e}}
check('clean empty server registry never creates bindings',()=>{
  const r=audit(catalog,[]);
  assert.equal(r.catalog_only,226);
  assert.equal(r.global_name_match_unverified,0);
  assert.equal(r.rows.filter(x=>x.candidateForApprovedBinding).length,0);
});
const rows=[
  {id:id(1),name:name(1),scope:'global'},
  {id:id(2),name:name(2),scope:'personal',user_id:'private-uuid-should-never-appear'},
  {id:id(3),name:name(3),scope:'something_new'},
  {id:id(4),name:'Unrelated User Defined Exercise',scope:'global'},
  {id:id(5),name:name(5),scope:'global'},
  {id:id(5),name:name(5),scope:'personal'},
  {id:'TK-999999',name:'Not Published',scope:'global'},
  {id:'custom-1',name:'Another Exercise',scope:'personal',user_id:'private-uuid-should-never-appear'}
];
const result=audit(catalog,rows);
check('no false global activation',()=>assert.equal(result.rows.every(x=>x.candidateForApprovedBinding===false),true));
check('global match remains review-only',()=>assert.equal(result.global_name_match_unverified,1));
check('personal scope is held even with matching immutable id',()=>assert.equal(result.personal_scope_hold,1));
check('unknown scope held',()=>assert.equal(result.unknown_scope_hold,1));
check('name mismatch held',()=>assert.equal(result.global_name_conflict,1));
check('duplicate id held',()=>assert.equal(result.duplicate_id_hold,1));
check('foreign canonical ids held',()=>assert.equal(result.foreign_tk_hold,1));
check('unlinked legacy text id never matched by name',()=>assert.equal(result.db_legacy_ids,1));
check('remaining canonical rows are catalog-only',()=>assert.equal(result.catalog_only,221));
check('no personal/user data leaked to summary',()=>{
  const serialized=JSON.stringify(result);
  assert.equal(serialized.includes('private-uuid-should-never-appear'),false);
  assert.equal(serialized.includes('Unrelated User Defined Exercise'),false);
  assert.equal(serialized.includes('Another Exercise'),false);
});
check('counts have stable audit schema',()=>{
  assert.equal(result.existing_catalog_count,226);
  assert.equal(result.db_record_count,8);
  assert.equal(result.status,'READ_ONLY_UNVERIFIED_NO_BINDING_ACTIVATION');
});
check('case and whitespace normalize for global name only',()=>{
  const normalized=audit(catalog,[{id:id(1),name:'  '+name(1).toUpperCase().replaceAll(' ','  ')+'  ',scope:'global'}]);
  assert.equal(normalized.global_name_match_unverified,1);
});
check('invalid DB row rejected',()=>assert.throws(()=>audit(catalog,[{id:1,name:'Example',scope:'global'}]),/BINDING_AUDIT_DB_ROW_INVALID/));
check('duplicate published catalog IDs rejected',()=>assert.throws(()=>audit({...catalog,catalog:[catalog.catalog[0],...catalog.catalog.slice(0,225)]},[]),/BINDING_AUDIT_CATALOG_INVALID/));
check('unexpected shortened published catalog refused',()=>assert.throws(()=>audit({catalog:catalog.catalog.slice(0,225)},[]),/BINDING_AUDIT_INVALID_INPUT/));
check('legacy ID never inferred to matching name',()=>{
 const r=audit(catalog,[{id:'legacy-custom',name:name(1),scope:'personal'}]);
 assert.equal(r.catalog_only,226);
 assert.equal(r.db_legacy_ids,1);
});
console.log('MoveKit V2 Supabase catalog binding audit: '+passed+' synthetic assertions PASS; personal/global collisions held; no data writes');
