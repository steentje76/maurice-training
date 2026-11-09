'use strict';
// Execute the actual staged migration and rollback against the isolated DB.
// A schema contract with synthetic dependencies is not production parity.
const fs=require('node:fs'),path=require('node:path');
module.exports=function({root,sql,assert,scope}){
 const migration=fs.readFileSync(path.join(root,
  'supabase/migrations/20261107191728_tk603_reserved_scope_provisioning_stage.sql'),'utf8');
 const rollback=fs.readFileSync(path.join(root,'tools/tk603-scope-transition-rollback.sql'),'utf8');
 const fingerprint=()=>sql("select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to("+
  "pg_catalog.replace(pg_catalog.pg_get_functiondef('public.set_exercise_scope_context()'::regprocedure),"+
  "E'\\r\\n',E'\\n'),'UTF8')),'hex');");
 const privileges=()=>sql("select proowner::regrole,proacl,prosecdef,proconfig from pg_catalog.pg_proc "+
  "where oid='public.set_exercise_scope_context()'::regprocedure;");
 const original=fingerprint(),originalPrivileges=privileges();
 function rejected(text,code,label){
  let denied=false;try{sql(text);}catch(e){denied=e.message.includes(code);}
  assert(denied,label);
 }
 sql('alter table public.exercises disable trigger tk504_reserved_catalog_fk_guard;');
 try{
  rejected(migration,'TK603_RESERVED_GUARD_REQUIRED','staged scope refuses disabled reserved-alias protection');
  assert(fingerprint()===original,'failed guard precondition leaves scope definition unchanged');
 }finally{sql('alter table public.exercises enable trigger tk504_reserved_catalog_fk_guard;');}
 const guardSql=fs.readFileSync(path.join(root,'supabase/migrations/20261107191714_tk504_typed_catalog_fk_stage.sql'),'utf8');
 const guardDefinition=guardSql.match(/create or replace function public\.tk504_protect_reserved_catalog_fk\(\)[\s\S]*?\$tk504\$;/i)[0];
 sql(guardDefinition.replace('Reserved catalog FK rows are admin-managed','Synthetic unrelated guard drift'));
 try{
  rejected(migration,'TK603_RESERVED_GUARD_REQUIRED','staged scope refuses reserved-guard function-body drift');
  assert(fingerprint()===original,'changed guard cannot authorize a scope transition');
 }finally{sql(guardDefinition);}
 sql(scope.definition.replace(/BEGIN\r?\n/,m=>m+'  -- synthetic unrelated schema drift\n')+';');
 try{
  const drift=fingerprint();
  rejected(migration,'TK603_SCOPE_DEFINITION_DRIFT','staged scope refuses unknown function-definition drift');
  assert(fingerprint()===drift,'failed source precondition does not overwrite unrelated schema drift');
 }finally{sql(scope.definition+';');}
 sql(migration);
 const staged=fingerprint();
 assert(staged!==original,'actual staged scope migration installs trusted provision branch');
 assert(privileges()===originalPrivileges,'staged transition preserves function owner ACL definer and search path');
 rejected(migration,'TK603_SCOPE_DEFINITION_DRIFT','staged transition refuses duplicate or stale application');
 // A direct admin INSERT still cannot create an active alias; only the
 // separate reviewed binding can later enable logging.
 rejected("insert into public.exercises(id,name,category,type,scope,active) "+
  "values('TKC-000582','Synthetic active alias denial','system','strength','global',true);",
  'Alleen een gym-owner','staged scope refuses active reserved alias provisioning');
 assert(fingerprint()===staged,'rejected active-alias insert preserves staged function');
 return function finish(){
  const tables=[['exercises','id'],['sessions','id'],['movekit_catalog_fk_bindings','catalog_id'],['movekit_v2_catalog_publications','catalog_id']];
  const data=()=>sql('select '+tables.map(([table,key])=>
   "(select encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,',' order by "+key+"),''),'UTF8')),'hex') from public."+table+' t) as '+table).join(',')+';');
  const before=data();
  sql(rollback);
  assert(fingerprint()===original,'explicit rollback restores exact captured scope function');
  assert(privileges()===originalPrivileges,'scope rollback preserves owner ACL and legacy function properties');
  assert(data()===before,'scope rollback preserves exercises sessions bindings and publications');
  rejected(rollback,'TK603_SCOPE_DEFINITION_DRIFT','rollback refuses stale or repeated scope reversal');
  // The complete roundtrip must remain replayable after rollback.
  sql(migration);
  assert(fingerprint()===staged&&data()===before,'staged migration reapplies without data changes after rollback');
 };
};
