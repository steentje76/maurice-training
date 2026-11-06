'use strict';
// Isolated PostgreSQL proof generated from schema-only production evidence.
// NO production connection, host port, real user, token or persistent DB.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'docs/generated/TK603_SCHEMA_CONTRACT_20261107.json'),'utf8'));
const expected='aec91b07589aa1c6b4451067d0db3380e416e44548207a93334a81399954034b';
const scope=evidence.dependent_functions.find(x=>x.name==='set_exercise_scope_context');
if(!scope||crypto.createHash('sha256').update(scope.definition).digest('hex')!==expected)throw Error('Captured scope function changed: review evidence before replay');
const quote=x=>'"'+String(x).replaceAll('"','""')+'"';
const type={text:'text',numeric:'numeric',int4:'integer',bool:'boolean',timestamptz:'timestamptz',uuid:'uuid',_text:'text[]',date:'date',jsonb:'jsonb'};
let fixture=`create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create table public.users(id text primary key,gym_id text,gym_role_level integer,system_role text);
create table public.content_shares(content_type text,content_id text,shared_with uuid);
create table public.training_instances(id uuid primary key);
create table public.coach_athlete_relationships(id uuid primary key,coach_user_id uuid,athlete_user_id uuid,status text);
create table public.coach_access_scopes(relationship_id uuid,scope text,enabled boolean);
insert into auth.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.users values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','synthetic-gym',0,'athlete'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','synthetic-gym',3,'developer');
grant select on public.users,public.content_shares to authenticated;
`;
for(const table of ['exercises','sessions']){
 const cols=evidence.columns.filter(x=>x.table_name===table).map(c=>{
  if(!type[c.udt_name])throw Error('Unhandled captured type '+c.udt_name);
  return quote(c.column_name)+' '+type[c.udt_name]+(c.is_nullable==='NO'?' not null':'')+(c.column_default?' default '+c.column_default:'');
 });
 fixture+='create table public.'+quote(table)+' ('+cols.join(',\n')+');\n';
 for(const c of evidence.constraints.filter(x=>x.table===table))fixture+='alter table public.'+quote(table)+' add constraint '+quote(c.name)+' '+c.definition+';\n';
 fixture+='alter table public.'+quote(table)+' enable row level security;\n';
}
for(const f of evidence.dependent_functions)fixture+=f.definition+';\n';
for(const t of evidence.triggers.filter(x=>!x.internal))fixture+=t.definition+';\n';
for(const p of evidence.policies){
 fixture+='create policy '+quote(p.policyname)+' on public.'+quote(p.tablename)+' as '+p.permissive+' for '+p.cmd+' to '+p.roles.map(quote).join(',')+(p.qual?' using ('+p.qual+')':'')+(p.with_check?' with check ('+p.with_check+')':'')+';\n';
}
for(const g of evidence.role_grants)fixture+='grant '+g.privilege_type+' on public.'+quote(g.table_name)+' to '+quote(g.grantee)+';\n';
const guard=`
  -- PROPOSAL ONLY: narrowly allow trusted, unowned, manifest-range aliases.
  IF NEW.id ~ '^TKC-[0-9]{6}$'
     AND substring(NEW.id from 5)::integer BETWEEN 1 AND 582
     AND current_user = 'postgres' AND auth.uid() IS NULL
     AND coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
       nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','') IN ('','postgres')
     AND NEW.scope = 'global' AND NEW.created_by IS NULL
     AND NEW.user_id IS NULL AND NEW.gym_id IS NULL THEN
    RETURN NEW;
  END IF;
`;
const proposal=scope.definition.replace(/BEGIN\r?\n/,s=>s+guard);
if(proposal===scope.definition)throw Error('Exact function insertion point missing');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'tk603-scope-parity-'));
const name='tk603-scope-parity-'+Date.now();let started=false;
function docker(args){return execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000});}
try{
 fs.writeFileSync(path.join(folder,'fixture.sql'),fixture);
 fs.writeFileSync(path.join(folder,'proposal.sql'),proposal+';\n');
 docker(['run','--rm','--detach','--name',name,'--network','none','-e','POSTGRES_PASSWORD=synthetic_scope_only','postgres:17']);started=true;
 let ready=false;for(let n=0;n<45;n++){try{docker(['exec',name,'pg_isready','-U','postgres']);ready=true;break;}catch{Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,300);}}
 if(!ready)throw Error('PostgreSQL not ready');
 for(const [src,dest] of [[path.join(folder,'fixture.sql'),'tk603-parity-fixture.sql'],[path.join(folder,'proposal.sql'),'tk603-scope-proposal.sql'],[path.join(root,'supabase/migrations/20261106110000_tk504_typed_catalog_fk_stage.sql'),'tk504-typed-fk-stage.sql'],[path.join(__dirname,'tk603-scope-trigger-parity-smoke.sql'),'tk603-scope-smoke.sql']])docker(['cp',src,name+':/tmp/'+dest]);
 const out=execFileSync('docker',['exec',name,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-f','/tmp/tk603-scope-smoke.sql'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000});
 if(!out.includes('ROLLBACK'))throw Error('Missing rollback');
 const left=docker(['exec',name,'psql','-X','-Atqc',"select count(*) from information_schema.tables where table_schema='auth'",'-U','postgres','-d','postgres']).trim();
 if(left!=='0')throw Error('Rollback incomplete');
 console.log('PASS: captured scope trigger RED; guarded proposal GREEN for 582 unowned aliases; original personal/gym/global rules; client reserved write denial; session owner rewrite; coach RLS versus own-user filter; full transaction ROLLBACK.');
 console.log('Scope definition SHA256 '+expected+'; synthetic dependency tables only; no production changes.');
}catch(e){console.error(e.stderr?.toString()||e.stack);process.exitCode=1;}
finally{if(started){try{docker(['stop',name]);console.log('PASS: isolated no-network container removed');}catch(e){console.error('CLEANUP FAILED '+name);process.exitCode=1;}}fs.rmSync(folder,{recursive:true,force:true});}
