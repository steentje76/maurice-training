'use strict';
// Static safety contract for the separately Docker-executed scope transition.
// The actual migration/rollback and adversarial DB cases run via --staged-scope.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');
const migration=read('supabase/migrations/20261107154937_tk603_reserved_scope_provisioning_stage.sql');
const rollback=read('tools/tk603-scope-transition-rollback.sql');
const evidence=JSON.parse(read('docs/generated/TK603_SCHEMA_CONTRACT_20261107.json'));
const source=evidence.dependent_functions.find(x=>x.name==='set_exercise_scope_context').definition.replace(/\r\n/g,'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const definition=sql=>sql.split('$tk603_definition$')[1].trim()+'\n';
const updated=definition(migration);
let n=0;function check(v,label){assert.ok(v,label);n++;}
check(updated.replace(/\n  -- TK603:[\s\S]*?\n  END IF;\n/,'')===source,
 'every existing personal gym and global branch is preserved byte-for-byte after LF normalization');
check(definition(rollback)===source,'rollback contains exact original function');
check(migration.includes(sha(source)),'transition pins complete captured function');
check(rollback.includes(sha(updated)),'rollback pins complete staged function');
const typed=read('supabase/migrations/20261106110000_tk504_typed_catalog_fk_stage.sql');
const guardBody=typed.split('create or replace function public.tk504_protect_reserved_catalog_fk()')[1]
 .split('$tk504$;')[0].split('as $tk504$')[1];
for(const sql of [migration,rollback]){
 check(sql.includes(sha(guardBody)),'reserved protection source body is independently pinned');
 check(sql.includes("t.tgenabled='O'")&&sql.includes('AND NOT p.prosecdef')&&
  sql.includes("p.proconfig=ARRAY['search_path=pg_catalog']::text[]"),'enabled invoker guard and safe search path required');
 check(sql.includes('TK603_SCOPE_DEFINITION_DRIFT')&&sql.includes('TK603_RESERVED_GUARD_REQUIRED'),
  'precondition errors are explicit');
 check(sql.includes('LOCK TABLE public.exercises IN SHARE ROW EXCLUSIVE MODE'),
  'concurrent exercise writes excluded during transition');
 check(!/\b(?:INSERT INTO|UPDATE public\.|DELETE FROM|GRANT|REVOKE|CREATE POLICY|DISABLE TRIGGER|ALTER ROLE|OWNER TO)\b/i.test(sql.replace(/--[^\n]*/g,'')),
  'transition contains no seed data grants ACL changes policy edits or guard disabling');
 check((sql.match(/EXECUTE \$tk603_definition\$/g)||[]).length===1,'single exact function replacement');
}
for(const condition of ["TG_OP = 'INSERT'","session_user = 'postgres' AND current_user = 'postgres'",
 "auth.uid() IS NULL","NEW.scope = 'global' AND NEW.active IS FALSE",
 'NEW.created_by IS NULL AND NEW.user_id IS NULL','NEW.gym_id IS NULL',
 "NEW.id ~ '^TKC-[0-9]{6}$'","BETWEEN 1 AND 582"]){
 check(updated.includes(condition),'trusted inactive unowned alias condition: '+condition);
}
check(!/CREATE OR REPLACE FUNCTION public\.(?!set_exercise_scope_context)/i.test(migration),
 'no additional public API function is introduced');
console.log('TK603 staged scope transition: '+n+' source/privilege/data invariants PASS; Docker acceptance remains separate');
