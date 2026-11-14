'use strict';
// Real local GoTrue + PostgREST + PostgreSQL; never targets a remote service.
// Ephemeral containers, generated credentials, synthetic accounts, no licensed media.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const unified582=process.argv.includes('--tk614-unified-582');
const id=(unified582?'tk614-auth582-':'tk603-auth-')+Date.now(),network=id+'-net',names=[];
const password=crypto.randomBytes(32).toString('hex'),secret=crypto.randomBytes(48).toString('hex');
let net=false,checks=0;const events=[];
function assert(v,msg){if(!v)throw Error(msg);checks++;events.push(msg);console.log('PASS '+msg);}
function docker(args,input){try{return execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:180000});}catch(e){throw Error('Docker operation failed: '+args.slice(0,3).join(' ')+'; '+String(e.stderr||'').replaceAll(password,'[redacted]').replaceAll(secret,'[redacted]').slice(0,1800));}}
function sql(text,user='postgres'){return docker(['exec','-i',id+'-db','psql','-X','-v','ON_ERROR_STOP=1','-U',user,'-d','postgres'],text);}
function run(suffix,image,env,ports){const n=id+'-'+suffix;const args=['create','--name',n,'--network',network,'--network-alias',suffix];for(const [k,v]of Object.entries(env))args.push('-e',k+'='+v);for(const p of ports||[])args.push('-p','127.0.0.1::'+p);args.push(image);docker(args);names.push(n);if(ports?.length)docker(['network','connect',id+'-front',n]);docker(['start',n]);return n;}
function port(name,p){const o=JSON.parse(docker(['inspect',name]))[0];return Number(o.NetworkSettings.Ports[p+'/tcp'][0].HostPort);}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(url,headers={}){for(let n=0;n<80;n++){try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(2000)});if(r.status<500)return;}catch{}await delay(500);}throw Error('Local service did not become ready');}
let rest,auth,A,B;
async function req(base,route,token,method='GET',body,prefer){const headers={};if(token)headers.Authorization='Bearer '+token;if(body!==undefined)headers['Content-Type']='application/json';if(prefer)headers.Prefer=prefer;const r=await fetch(base+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}return{status:r.status,data};}
async function query(route,user=A,method='GET',body,prefer){return req(rest,route,user&&user.token,method,body,prefer);}
async function account(label){const email='tk603-'+label+'-'+Date.now()+'@example.invalid',pw='Synthetic-'+crypto.randomBytes(24).toString('hex');let r=await req(auth,'/signup',null,'POST',{email,password:pw});if(r.status>=300)throw Error('Synthetic signup failed '+r.status);r=await req(auth,'/token?grant_type=password',null,'POST',{email,password:pw});if(r.status!==200||!r.data.access_token||!r.data.user?.id)throw Error('Real password login failed '+r.status);const u={id:r.data.user.id,token:r.data.access_token};r=await req(auth,'/user',u.token);assert(r.status===200&&r.data.id===u.id,'GoTrue independently verifies '+label+' password-login JWT');return u;}
(async()=>{
 try{
  docker(['network','create','--internal',network]);net=true;docker(['network','create',id+'-front']);
  run('db','public.ecr.aws/supabase/postgres:17.11.0.006',{POSTGRES_PASSWORD:password});
  let readyDb=false;for(let n=0;n<100;n++){try{docker(['exec',id+'-db','pg_isready','-U','supabase_admin','-h','127.0.0.1','-d','postgres']);readyDb=true;break;}catch{}await delay(500);}if(!readyDb)throw Error('Database not ready');
  sql("alter role supabase_auth_admin password '"+password+"'; alter role authenticator password '"+password+"';",'supabase_admin');
  const an=run('auth','public.ecr.aws/supabase/gotrue:v2.197.0',{
   GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://127.0.0.1',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:'postgres://supabase_auth_admin:'+password+'@db:5432/postgres',GOTRUE_SITE_URL:'http://127.0.0.1',GOTRUE_DISABLE_SIGNUP:'false',GOTRUE_JWT_ADMIN_ROLES:'service_role',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_EXP:'3600',GOTRUE_JWT_SECRET:secret,GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED:'false',GOTRUE_MAILER_AUTOCONFIRM:'true',GOTRUE_EXTERNAL_PHONE_ENABLED:'false'},[9999]);
  auth='http://127.0.0.1:'+port(an,9999);await ready(auth+'/health');
  A=await account('owner-a');B=await account('owner-b');assert(A.id!==B.id&&A.token!==B.token,'two real independently issued local Auth identities');
  const fixture=`create table public.exercises(id text primary key,name text not null,category text not null,type text not null,scope text not null default 'personal' check(scope in ('personal','global','gym')),created_by uuid,user_id uuid,gym_id text,active boolean default true);
alter table public.exercises enable row level security;
grant select,insert,update,delete on public.exercises to authenticated,service_role;
create policy exercise_select on public.exercises for select to authenticated using(scope='global' or (scope='personal' and created_by=auth.uid()));
create policy exercise_insert on public.exercises for insert to authenticated with check(scope='personal' or scope='global');
create policy exercise_change on public.exercises for update to authenticated using(true) with check(true);
create policy exercise_delete on public.exercises for delete to authenticated using(true);
create table public.sessions(id uuid primary key,user_id uuid not null,exercise_id text references public.exercises(id),note text);
alter table public.sessions enable row level security;
grant select,insert,update,delete on public.sessions to authenticated;
create policy session_owner on public.sessions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
`;
  sql(fixture);sql(fs.readFileSync(path.join(root,'supabase/migrations/20261107191714_tk504_typed_catalog_fk_stage.sql'),'utf8'));
  sql(`insert into public.exercises(id,name,category,type,scope,created_by,user_id) values('TK-000038','synthetic personal','Strength','strength','personal','${A.id}','${A.id}');
insert into public.exercises(id,name,category,type,scope,active) select 'TKC-'||lpad(n::text,6,'0'),'Technical FK placeholder','system','strength','global',false from generate_series(1,582)n;
insert into public.movekit_catalog_fk_bindings(catalog_id,exercise_id,provider_id) select 'TK-'||lpad(n::text,6,'0'),'TKC-'||lpad(n::text,6,'0'),'synthetic-vendor-'||lpad(n::text,6,'0') from generate_series(1,582)n;
update public.movekit_catalog_fk_bindings set active=true,reviewed_at=clock_timestamp() where catalog_id='TK-000038';`);
  const rn=run('rest','public.ecr.aws/supabase/postgrest:v16.5',{PGRST_DB_URI:'postgres://authenticator:'+password+'@db:5432/postgres',PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:secret,PGRST_DB_MAX_ROWS:'1000',PGRST_DB_EXTRA_SEARCH_PATH:'public,extensions',PGRST_DB_USE_LEGACY_GUCS:'false'},[3000]);
  rest='http://127.0.0.1:'+port(rn,3000);await ready(rest+'/');
  let r=await query('/exercises?scope=eq.global&select=id');assert(r.status===200&&r.data.length===582,'PostgREST exposes 582 synthetic reserved aliases to authenticated owner');
  r=await query('/sessions',null);assert([401,403].includes(r.status)||(r.status===200&&Array.isArray(r.data)&&r.data.length===0),'anonymous session read returns no rows');
  r=await query('/sessions',null,'POST',{id:crypto.randomUUID(),user_id:A.id,exercise_id:'TKC-000038'});assert([401,403].includes(r.status),'anonymous session INSERT denied');
  r=await query('/sessions',{token:A.token.slice(0,-10)+'invalid'});assert(r.status===401,'tampered JWT denied by real PostgREST');
  r=await query('/exercises?id=eq.TK-000038',B);assert(r.status===200&&r.data.length===0,'owner B cannot read A personal same-number TK exercise');
  r=await query('/movekit_catalog_fk_bindings');assert([401,403].includes(r.status),'authenticated binding registry access denied');
  r=await query('/rpc/tk504_resolve_catalog_fk',A,'POST',{p_catalog_id:'TK-000038',p_provider_id:'synthetic-vendor-000038'});assert(r.status===200&&r.data==='TKC-000038','real authenticated RPC resolves exact reviewed provider identity');
  r=await query('/rpc/tk504_resolve_catalog_fk',A,'POST',{p_catalog_id:'TK-000038',p_provider_id:'wrong'});assert(r.status===200&&r.data===null,'provider spoof cannot resolve catalog binding');
  r=await query('/rpc/tk504_resolve_catalog_fk',B,'POST',{p_catalog_id:'TK-000227',p_provider_id:'synthetic-vendor-000227'});assert(r.status===200&&r.data===null,'unreviewed exercise remains unbound');
  const sa=crypto.randomUUID(),sp=crypto.randomUUID(),sb=crypto.randomUUID();
  for(const [u,s,ex]of[[A,sa,'TKC-000038'],[A,sp,'TK-000038'],[B,sb,'TKC-000038']]){r=await query('/sessions',u,'POST',{id:s,user_id:u.id,exercise_id:ex,note:'synthetic' },'return=representation');assert(r.status===201&&r.data[0].user_id===u.id,'owner writes own '+ex+' session via real FK');}
  r=await query('/sessions',null);assert([401,403].includes(r.status)||(r.status===200&&Array.isArray(r.data)&&r.data.length===0),'anonymous SELECT exposes no populated sessions');
  r=await query('/sessions?select=id,user_id,exercise_id',A);assert(r.status===200&&r.data.length===2&&r.data.every(x=>x.user_id===A.id),'owner A SELECT isolates personal and typed sessions');
  r=await query('/sessions?id=eq.'+sa,A,'PATCH',{user_id:B.id},'return=representation');assert(r.status===403,'own row cannot be reassigned to another owner');
  r=await query('/sessions?select=id,user_id,exercise_id',B);assert(r.status===200&&r.data.length===1&&r.data[0].id===sb,'owner B SELECT hides A sessions');
  r=await query('/sessions',B,'POST',{id:crypto.randomUUID(),user_id:A.id,exercise_id:'TKC-000038'});assert(r.status===403,'cross-owner INSERT denied');
  r=await query('/sessions?id=eq.'+sa,B,'PATCH',{note:'forged'},'return=representation');assert(r.status===200&&r.data.length===0,'cross-owner UPDATE touches zero rows');
  r=await query('/sessions?id=eq.'+sa,B,'DELETE',undefined,'return=representation');assert(r.status===200&&r.data.length===0,'cross-owner DELETE touches zero rows');
  r=await query('/sessions?on_conflict=id',A,'POST',{id:sa,user_id:A.id,exercise_id:'TKC-000038',note:'idempotent retry'},'resolution=merge-duplicates,return=representation');assert(r.status<300,'same UUID own-session retry succeeds');
  r=await query('/sessions?id=eq.'+sa,A);assert(r.status===200&&r.data.length===1&&r.data[0].note==='idempotent retry','same UUID retry leaves exactly one own row');
  r=await query('/sessions?on_conflict=id',B,'POST',{id:sa,user_id:B.id,exercise_id:'TKC-000038',note:'replay'},'resolution=merge-duplicates,return=representation');assert(r.status===403,'cross-owner UUID replay denied');
  r=await query('/sessions?id=eq.'+sa,A);assert(r.status===200&&r.data.length===1&&r.data[0].user_id===A.id&&r.data[0].exercise_id==='TKC-000038'&&r.data[0].note==='idempotent retry','cross-owner replay leaves original owner identity and content intact');
  r=await query('/sessions',A,'POST',{id:crypto.randomUUID(),user_id:A.id,exercise_id:'missing-synthetic-exercise'});assert(r.status===409&&r.data.code==='23503','real database FK rejects nonexistent exercise');
  r=await query('/exercises',A,'POST',{id:'TKC-000583',name:'spoof',category:'system',type:'strength',scope:'personal',created_by:A.id});assert(r.status===403,'direct client reserved-alias INSERT denied');
  r=await query('/sessions?id=eq.'+sb,B,'PATCH',{note:'owner edited'},'return=representation');assert(r.status===200&&r.data[0].note==='owner edited','owner UPDATE allowed');
  r=await query('/sessions?id=eq.'+sb,B,'DELETE',undefined,'return=representation');assert(r.status===200&&r.data.length===1,'owner DELETE allowed');
  sql("update public.movekit_catalog_fk_bindings set active=false where catalog_id='TK-000038';");
  r=await query('/rpc/tk504_resolve_catalog_fk',A,'POST',{p_catalog_id:'TK-000038',p_provider_id:'synthetic-vendor-000038'});assert(r.status===200&&r.data===null,'revoked binding no longer resolves');
  r=await query('/sessions',A,'POST',{id:crypto.randomUUID(),user_id:A.id,exercise_id:'TKC-000038'});assert([400,409].includes(r.status)&&r.data.code==='23514','revocation blocks new catalog session at database boundary (SQLSTATE 23514)');
  r=await query('/rpc/tk504_historical_catalog_id',A,'POST',{p_exercise_id:'TKC-000038'});assert(r.status===200&&r.data==='TK-000038','revocation preserves own historical catalog identity');
  r=await query('/rpc/tk504_historical_catalog_id',B,'POST',{p_exercise_id:'TKC-000038'});assert(r.status===200&&r.data===null,'history identity RPC denies account without own saved session');
  r=await query('/sessions?id=eq.'+sa,A,'PATCH',{note:'history retained'},'return=representation');assert(r.status===200&&r.data[0].exercise_id==='TKC-000038','existing history editable after revocation');
  r=await query('/sessions?id=eq.'+sp,A);assert(r.status===200&&r.data.length===1&&r.data[0].exercise_id==='TK-000038','personal TK collision session preserved separately');
  if(unified582){
    // Extension #614: exact SAME PostgREST/GoTrue session writer and source-qualified
    // server resolver for BOTH cohorts after a hypothetical release. This test DB
    // is EPHEMERAL, has synthetic provider slugs, and is NEVER a production server.
    sql("update public.movekit_catalog_fk_bindings set active=true,reviewed_at=clock_timestamp() where active=false;");
    const format=n=>String(n).padStart(6,'0');
    const actors=[['A',A],['B',B]];
    for(const [label,actor] of actors){
      let valid=0;
      for(let n=1;n<=582;n++){
        const num=format(n);
        const reply=await query('/rpc/tk504_resolve_catalog_fk',actor,'POST',{
          p_catalog_id:'TK-'+num,p_provider_id:'synthetic-vendor-'+num});
        if(reply.status!==200||reply.data!=='TKC-'+num)
          throw Error('ACTUAL_POSTGREST_582_IDENTITY_FAILURE_'+label+'_'+num+'_HTTP_'+reply.status);
        valid++;
      }
      assert(valid===582,'real signed JWT account '+label+': all 582 post-approval canonical catalog FKs resolve');
    }
    for(const n of [1,63,188,226,227,300,582]){
      const slug='synthetic-vendor-'+format(n);
      let reply=await query('/rpc/tk504_resolve_catalog_fk',A,'POST',{
        p_catalog_id:'TK-'+format(n),p_provider_id:slug+'-forged'});
      assert(reply.status===200&&reply.data===null,'provider spoof denied for both-cohort representative TK-'+format(n));
    }
    const ids=[1,63,188,226,227,300,582],created={A:new Map(),B:new Map()};
    for(const [label,actor] of actors){
      for(const n of ids){
        const uuid=crypto.randomUUID(),num=format(n);
        const reply=await query('/sessions',actor,'POST',{
          id:uuid,user_id:actor.id,exercise_id:'TKC-'+num,
          note:'TK614 local synthetic signed JWT session '+label
        },'return=representation');
        if(reply.status!==201||reply.data?.[0]?.user_id!==actor.id||
          reply.data?.[0]?.exercise_id!=='TKC-'+num)throw Error('REAL_AUTH_WRITE_FAILED_'+label+'_'+num);
        created[label].set(n,uuid);
      }
      assert(created[label].size===7,'real GoTrue JWT '+label+' can write same 7 cross-cohort catalog sessions');
    }
    for(const [label,actor,otherLabel,other] of [['A',A,'B',B],['B',B,'A',A]]){
      const own=created[label].get(63),foreign=created[otherLabel].get(188);
      let reply=await query('/sessions?id=eq.'+own,actor);
      assert(reply.status===200&&reply.data?.length===1&&reply.data[0].user_id===actor.id,
        'JWT '+label+' can read own original-226 session');
      reply=await query('/sessions?id=eq.'+foreign,actor);
      assert(reply.status===200&&reply.data?.length===0,
        'JWT '+label+' cannot read '+otherLabel+' original-226 history');
      reply=await query('/sessions',actor,'POST',{
        id:crypto.randomUUID(),user_id:other.id,exercise_id:'TKC-000188',note:'cross-owner-forged'});
      assert(reply.status===403,'JWT '+label+' cannot forge other owner original-226 write');
      reply=await query('/sessions?on_conflict=id',actor,'POST',{
        id:own,user_id:actor.id,exercise_id:'TKC-000063',note:'TK614 idempotent retry '+label
      },'resolution=merge-duplicates,return=representation');
      assert(reply.status<300,'JWT '+label+' original-226 retry does not create duplicate');
      reply=await query('/sessions?id=eq.'+own,actor);
      assert(reply.status===200&&reply.data?.length===1&&reply.data[0].note==='TK614 idempotent retry '+label,
        'JWT '+label+' single UUID remains unique after retry');
      reply=await query('/sessions?on_conflict=id',actor,'POST',{
        id:foreign,user_id:actor.id,exercise_id:'TKC-000188',note:'cross-owner-replay'
      },'resolution=merge-duplicates,return=representation');
      assert(reply.status===403,'JWT '+label+' cross-owner UUID replay forbidden');
    }
    sql("update public.movekit_catalog_fk_bindings set active=false where catalog_id='TK-000188';");
    for(const [label,actor] of actors){
      let reply=await query('/rpc/tk504_resolve_catalog_fk',actor,'POST',{
        p_catalog_id:'TK-000188',p_provider_id:'synthetic-vendor-000188'});
      assert(reply.status===200&&reply.data===null,'JWT '+label+' sees revoked original-226 binding denied');
      reply=await query('/sessions',actor,'POST',{
        id:crypto.randomUUID(),user_id:actor.id,exercise_id:'TKC-000188'});
      assert([400,409].includes(reply.status)&&reply.data?.code==='23514',
        'JWT '+label+' cannot insert after original-226 revocation');
      reply=await query('/sessions?id=eq.'+created[label].get(188),actor);
      assert(reply.status===200&&reply.data?.length===1,
        'JWT '+label+' retains own historical original-226 session after revocation');
    }
    console.log('TK614 UNIFIED_582_SIGNED_JWT_POSTGREST PASS: 2 GoTrue accounts, 1164 real RPC calls, 14 real local session writes, separate-owner RLS, retries and revocation');
  }
  console.log('RESULT '+checks+' real local Auth/PostgREST/PostgreSQL assertions PASS');
 }catch(e){console.error('FAIL '+String(e.message).replaceAll(password,'[redacted]').replaceAll(secret,'[redacted]'));process.exitCode=1;}
 finally{
  let clean=true;for(const n of names.reverse()){try{docker(['rm','--force','--volumes',n]);}catch{clean=false;}}
  if(net)for(const n of [network,id+'-front'])try{docker(['network','rm',n]);}catch{clean=false;}
  if(!clean){console.error('FAIL temporary resource cleanup; inspect '+id);process.exitCode=1;}else console.log('CLEANUP PASS: all dedicated containers/anonymous volumes/network removed');
  const report=['# '+(unified582?'TK614 unified 582 real local Auth acceptance — 9 November 2026':'TK603 real local Auth acceptance — 7 November 2026'),'','Status: '+(process.exitCode?'FAILED / incomplete':'PASS')+'. '+checks+' checks. Run completed '+new Date().toISOString(),'','Actual services: cached Supabase PostgreSQL 17.11.0.006, GoTrue v2.197.0, PostgREST v16.5, dedicated internal backend plus dedicated frontend Docker network; only ephemeral loopback Auth/REST ports. Two synthetic email/password accounts received independent JWTs; tokens verified by GoTrue and PostgREST. No cloud project, production data, media or credentials used.','','Schema: synthetic minimal exercises/sessions fixture based on the committed SQL security smoke; actual staged typed-FK migration executed unchanged. This is not a full production-schema restore or cloud-hosted Supabase acceptance. No Android, Storage playback, real entitlements or browser restart test.','','Checks:',...events.map(x=>'- '+x),'','Cleanup: '+(clean?'dedicated containers, anonymous volumes and network removed':'FAILED; inspect temporary resources'),'','Reproduce: `node tools/tk603-real-auth-acceptance.cjs` with Docker running and listed cached images. Generated local secrets remain in memory only and are never printed or committed.'].join('\n');
  fs.writeFileSync(path.join(root,unified582?'docs/TK614_UNIFIED_582_REAL_AUTH_ACCEPTANCE_20261109.md':'docs/TK603_REAL_AUTH_ACCEPTANCE_20261107.md'),report+'\n');
 }
})();
