'use strict';
// Captured schema replay for isolated Auth acceptance. No remote connection.
// Dependency tables contain synthetic rows only; this is not a full DB restore.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function fixture(root,a,b){
 const raw=fs.readFileSync(path.join(root,'docs/generated/TK603_SCHEMA_CONTRACT_20261107.json'),'utf8').replace(/\r\n/g,'\n');
 const expected='86c3347b26d1d8ece77e2b84af540ba60fc31e8dfc77187e2befb08daac355d7';
 if(crypto.createHash('sha256').update(raw).digest('hex')!==expected)throw Error('Captured schema evidence changed; independent review required');
 const e=JSON.parse(raw);
 const scope=e.dependent_functions.find(f=>f.name==='set_exercise_scope_context');
 if(crypto.createHash('sha256').update(scope.definition).digest('hex')!=='aec91b07589aa1c6b4451067d0db3380e416e44548207a93334a81399954034b')throw Error('Scope evidence digest changed');
 for(const f of e.dependent_functions)if(crypto.createHash('sha256').update(f.definition).digest('hex')!==f.definition_sha256)throw Error('Function evidence changed: '+f.name);
 const quote=x=>'"'+String(x).replaceAll('"','""')+'"';
 const types={text:'text',numeric:'numeric',int4:'integer',bool:'boolean',timestamptz:'timestamptz',uuid:'uuid',_text:'text[]',date:'date',jsonb:'jsonb'};
 let ddl="create table public.users(id text primary key,gym_id text,gym_role_level integer,system_role text);\n"+
 "create table public.content_shares(content_type text,content_id text,shared_with uuid);\n"+
 "create table public.training_instances(id uuid primary key);\n"+
 "create table public.coach_athlete_relationships(id uuid primary key,coach_user_id uuid,athlete_user_id uuid,status text);\n"+
 "create table public.coach_access_scopes(relationship_id uuid,scope text,enabled boolean);\n";
 for(const u of [a,b]){
  if(!/^[a-f0-9-]{36}$/.test(u.id))throw Error('Unexpected local identity');
  ddl+="insert into public.users values ('"+u.id+"','synthetic-gym',0,'athlete');\n";
 }
 // Lock synthetic dependencies; do not inherit image defaults as authorization.
 for(const table of ['users','content_shares','training_instances','coach_athlete_relationships','coach_access_scopes'])ddl+='revoke all on public.'+table+' from public,anon,authenticated,service_role; alter table public.'+table+' enable row level security;\n';
 ddl+='grant select on public.users,public.content_shares to authenticated;\n';
 ddl+="create policy synthetic_own_profile on public.users for select to authenticated using(id=auth.uid()::text);\ncreate policy synthetic_own_share on public.content_shares for select to authenticated using(shared_with=auth.uid());\n";
 for(const table of ['exercises','sessions']){
  const cols=e.columns.filter(c=>c.table_name===table).map(c=>{
   if(!types[c.udt_name])throw Error('Unhandled captured type '+c.udt_name);
   return quote(c.column_name)+' '+types[c.udt_name]+(c.is_nullable==='NO'?' not null':'')+(c.column_default?' default '+c.column_default:'');
  });
  ddl+='create table public.'+quote(table)+' ('+cols.join(',\n')+');\n';
  for(const c of e.constraints.filter(c=>c.table===table))ddl+='alter table public.'+quote(table)+' add constraint '+quote(c.name)+' '+c.definition+';\n';
  ddl+='alter table public.'+quote(table)+' enable row level security;\n';
 }
 for(const f of e.dependent_functions)ddl+=f.definition+';\n';
 for(const t of e.triggers.filter(t=>!t.internal))ddl+=t.definition+';\n';
 for(const p of e.policies)ddl+='create policy '+quote(p.policyname)+' on public.'+quote(p.tablename)+' as '+p.permissive+' for '+p.cmd+' to '+p.roles.map(quote).join(',')+(p.qual?' using ('+p.qual+')':'')+(p.with_check?' with check ('+p.with_check+')':'')+';\n';
 for(const table of ['exercises','sessions'])ddl+='revoke all on public.'+table+' from public,anon,authenticated,service_role;\n';
 for(const g of e.role_grants)ddl+='grant '+g.privilege_type+' on public.'+quote(g.table_name)+' to '+quote(g.grantee)+';\n';
 return {ddl,scope};
}
function proposal(scope){
 const guard="\n IF NEW.id ~ '^TKC-[0-9]{6}$' AND substring(NEW.id from 5)::integer BETWEEN 1 AND 582"+
 " AND session_user='postgres' AND current_user='postgres' AND auth.uid() IS NULL"+
 " AND coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','') IN ('','postgres')"+
 " AND NEW.scope='global' AND NEW.created_by IS NULL AND NEW.user_id IS NULL AND NEW.gym_id IS NULL THEN RETURN NEW; END IF;\n";
 const result=scope.definition.replace(/BEGIN\r?\n/,s=>s+guard);
 if(result===scope.definition)throw Error('Scope insertion anchor missing');
 return result;
}
module.exports={fixture,proposal};
