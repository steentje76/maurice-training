'use strict';
/**
 * TK614 / #603 -- disposable PostgreSQL 17 SMOKE for the original-226 ADMIN
 * RELEASE CANDIDATE: real COMMITs of phase A (stage), phase B (activate) and
 * phase C (reverse) inside ONE throwaway container. NEVER production.
 *
 *  - Schema: captured production schema contract (tools/tk603CapturedSchemaFixture.cjs:
 *    real exercises/sessions columns, constraints, triggers, RLS policies, grants)
 *    + the staged migrations TK504 typed FK, TK603 scope transition and the TK614
 *    audit ledger. Synthetic users/rows only.
 *  - Seed: 356 reviewed active bindings (227..582), 23 legacy TK rows (7 global,
 *    16 personal), 5 historical sessions.
 *  - `postgres:17`, --network none, --pull never, synthetic password, label
 *    tk614.disposable=true; the container is ALWAYS removed.
 *  - The ACTIVATION approval in this smoke is signed with a throw-away Ed25519 key
 *    and a synthetic release gate injected through the library `trust` argument.
 *    That path is unreachable from the CLI, which stays BLOCKED.
 *  - Private files (SQL with provider slugs, report) only in a NEW --out-dir
 *    outside Git. stdout: step names + PASS/FAIL only.
 *
 * node tools/tk614_admin_release_docker_smoke.cjs --manifest ABS_PRIVATE_582 --out-dir ABS_NEW_PRIVATE_DIR
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {safelyOutsideRepo}=require('./tk504_prepare_private_fk_manifest.cjs');
const T=require('./tk614_original226_batch25_preflight.cjs');
const R=require('./tk614_original226_admin_release.cjs');
const {fixture}=require('./tk603CapturedSchemaFixture.cjs');

const ROOT=path.resolve(__dirname,'..');
const IMAGE='postgres:17',DB='tk614_admin';
const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MIGRATIONS=Object.freeze([
  ['tk504-typed-fk-stage.sql','supabase/migrations/20261106110000_tk504_typed_catalog_fk_stage.sql'],
  ['tk603-scope-stage.sql','supabase/migrations/20261107154937_tk603_reserved_scope_provisioning_stage.sql'],
  ['tk614-audit-stage.sql','supabase/migrations/20261108120000_tk614_admin_release_audit_stage.sql']]);
const SYNTHETIC_RELEASE_GATES=Object.freeze({status:'RELEASE_APPROVED',
  released_batches:[{from:'TK-000001',through:'TK-000226'}],_synthetic_smoke_only:true});
const LEGACY_GLOBAL=[1,5,38,100,150,201,226],LEGACY_PERSONAL=[2,3,4,10,25,26,50,60,63,70,80,90,120,188,200,225];
const pad=n=>String(n).padStart(6,'0');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function fail(code){const e=new Error(code);e.code=code;throw e;}
function need(ok,code){if(!ok)fail(code);}

function parseArgs(argv){
  const o={},flags=['--manifest','--out-dir'];
  for(let i=0;i<argv.length;i+=2){
    const k=argv[i];
    need(flags.includes(k)&&i+1<argv.length&&o[k]===undefined,'USAGE');
    o[k]=argv[i+1];
  }
  need(o['--manifest']&&o['--out-dir'],'USAGE');
  need(path.isAbsolute(o['--manifest'])&&path.isAbsolute(o['--out-dir']),'PATHS_MUST_BE_ABSOLUTE');
  return {manifest:path.resolve(o['--manifest']),outDir:path.resolve(o['--out-dir'])};
}

// Disposable schema + synthetic seed. Seeding runs with session_replication_role
// = replica ONLY inside this throwaway DB (legacy rows need their owners kept).
function buildSetupSql(entries){
  need(Array.isArray(entries)&&entries.length===582,'MANIFEST_ENTRIES_REQUIRED');
  const {ddl}=fixture(ROOT,{id:UA},{id:UB});
  const legacy=[...LEGACY_GLOBAL.map(x=>`('TK-${pad(x)}','SYNTHETIC LEGACY GLOBAL','strength','strength','global',true,NULL,NULL)`),
    ...LEGACY_PERSONAL.map((x,i)=>{const u=i%2?UB:UA;
      return `('TK-${pad(x)}','SYNTHETIC LEGACY PERSONAL','strength','strength','personal',true,'${u}','${u}')`;})];
  const rev=entries.slice(226);
  return `-- TK614 PRIVATE DISPOSABLE SMOKE SETUP. --network none container only.
\\set ON_ERROR_STOP on
create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
grant usage on schema public,auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
insert into auth.users values ('${UA}'),('${UB}');
${ddl}
\\i /tmp/${MIGRATIONS[0][0]}
\\i /tmp/${MIGRATIONS[1][0]}
\\i /tmp/${MIGRATIONS[2][0]}
set session_replication_role = replica;
insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
${legacy.join(',\n')};
insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
${rev.map(e=>`('${e.exercise_id}','SYNTHETIC REVIEWED ALIAS','system','strength','global',false,NULL,NULL)`).join(',\n')};
insert into public.movekit_catalog_fk_bindings(catalog_id,exercise_id,provider_id,active,reviewed_at) values
${rev.map(e=>`('${e.catalog_id}','${e.exercise_id}','${e.provider_id}',true,'2026-11-07 00:00:00+00')`).join(',\n')};
insert into public.sessions(id,date,user_id,exercise_id,note) values
('aaaaaaaa-0000-4000-8000-000000000063','2026-11-01','${UA}','TK-000063','synthetic legacy history A'),
('bbbbbbbb-0000-4000-8000-000000000188','2026-11-01','${UB}','TK-000188','synthetic legacy history B'),
('aaaaaaaa-0000-4000-8000-000000000001','2026-11-01','${UA}','TK-000001','synthetic legacy global history A'),
('bbbbbbbb-0000-4000-8000-000000000000','2026-11-01','${UB}',NULL,'synthetic unrelated session B'),
('aaaaaaaa-0000-4000-8000-000000000300','2026-11-01','${UA}','TKC-000300','synthetic typed history A');
set session_replication_role = origin;
create schema tk614_smoke;
create table tk614_smoke.baseline as select
 (select md5(string_agg(e::text,'|' order by e.id)) from public.exercises e where e.id ~ '^TK-[0-9]{6}$') legacy_fp,
 (select md5(string_agg(b::text,'|' order by b.catalog_id)) from public.movekit_catalog_fk_bindings b) b356_fp,
 (select md5(string_agg(e::text,'|' order by e.id)) from public.exercises e where e.id ~ '^TKC-[0-9]{6}$') a356_fp,
 (select md5(string_agg(s::text,'|' order by s.id)) from public.sessions s) sessions_fp;
select 'TK614_SMOKE_SETUP_READY';
`;
}

const planValues=(rows)=>rows.map((e,i)=>`(${i+1},'${e.catalog_id}','${e.exercise_id}','${e.provider_id}')`).join(',\n');
function probePreamble(uid,entries,commit){
  return `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','${uid}',true) IS NOT NULL AS identity_set;
CREATE TEMP TABLE tk_p(n int, catalog_id text, exercise_id text, provider_id text)${commit?' ON COMMIT DROP':''};
INSERT INTO tk_p VALUES
${planValues(entries.slice(0,226))};
CREATE TEMP TABLE tk_x(n int, catalog_id text, exercise_id text, provider_id text)${commit?' ON COMMIT DROP':''};
INSERT INTO tk_x VALUES
${planValues(entries.slice(226))};
`;
}
const TYPED_INSERT_REJECTED=`
 BEGIN
  INSERT INTO public.sessions(date,exercise_id,note) VALUES ('2026-11-08','TKC-000063','probe must be rejected');
  RAISE EXCEPTION 'PROBE_TYPED_SESSION_ACCEPTED_WITHOUT_ACTIVE_BINDING';
 EXCEPTION WHEN check_violation THEN NULL;
 END;`;
const RESOLVE_226=`(SELECT count(*) FROM tk_p p WHERE public.tk504_resolve_catalog_fk(p.catalog_id,p.provider_id) IS NOT DISTINCT FROM p.exercise_id)`;
const RESOLVE_ANY_226=`(SELECT count(*) FROM tk_p p WHERE public.tk504_resolve_catalog_fk(p.catalog_id,p.provider_id) IS NOT NULL)`;
const RESOLVE_356=`(SELECT count(*) FROM tk_x x WHERE public.tk504_resolve_catalog_fk(x.catalog_id,x.provider_id)=x.exercise_id)`;

// Probe files run as a simulated authenticated owner (auth.uid() = uid).
function buildProbeSql(kind,uid,entries){
  const tag=uid===UA?'A':'B';
  if(kind==='after_stage')return probePreamble(uid,entries)+`DO $p$
BEGIN
 IF ${RESOLVE_ANY_226}<>0 THEN RAISE EXCEPTION 'PROBE_226_RESOLVABLE_BEFORE_ACTIVATION'; END IF;
 IF ${RESOLVE_356}<>356 THEN RAISE EXCEPTION 'PROBE_356_NOT_RESOLVABLE'; END IF;
 IF (SELECT count(*) FROM public.exercises e JOIN tk_p p ON p.exercise_id=e.id WHERE e.scope='global' AND e.active=false)<>226
 THEN RAISE EXCEPTION 'PROBE_STAGED_ALIASES_NOT_INACTIVE_GLOBAL'; END IF;${TYPED_INSERT_REJECTED}
END $p$;
SELECT 'TK614_PROBE_AFTER_STAGE_RUNTIME_NOT_FIXED_${tag}' AS result;
ROLLBACK;
`;
  if(kind==='after_activate')return probePreamble(uid,entries)+`DO $p$
BEGIN
 IF ${RESOLVE_226}<>226 OR ${RESOLVE_ANY_226}<>226 THEN RAISE EXCEPTION 'PROBE_226_NOT_RESOLVABLE_AFTER_ACTIVATION'; END IF;
 IF (SELECT count(*) FROM tk_p p JOIN tk_p w ON w.n=(p.n % 226)+1
      WHERE public.tk504_resolve_catalog_fk(p.catalog_id,w.provider_id) IS NOT NULL)<>0
 THEN RAISE EXCEPTION 'PROBE_WRONG_SLUG_RESOLVED'; END IF;
 IF public.tk504_resolve_catalog_fk('TK-000063','tk614-forged-slug') IS NOT NULL
 THEN RAISE EXCEPTION 'PROBE_FORGED_SLUG_RESOLVED'; END IF;
 IF ${RESOLVE_356}<>356 THEN RAISE EXCEPTION 'PROBE_356_NOT_RESOLVABLE'; END IF;
 IF (SELECT count(*) FROM public.exercises e JOIN tk_p p ON p.exercise_id=e.id WHERE e.scope='global' AND e.active=false)<>226
 THEN RAISE EXCEPTION 'PROBE_TECHNICAL_ALIAS_ACTIVATED'; END IF;
 BEGIN
  INSERT INTO public.exercises(id,name,category,type,scope) VALUES ('TKC-000063','SYNTHETIC PERSONAL SHADOW','strength','strength','personal');
  RAISE EXCEPTION 'PROBE_PERSONAL_SHADOW_ACCEPTED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$' AND scope<>'global')
 THEN RAISE EXCEPTION 'PROBE_PERSONAL_SHADOW_PRESENT'; END IF;
END $p$;
SELECT 'TK614_PROBE_AFTER_ACTIVATE_226_RESOLVABLE_${tag}' AS result;
ROLLBACK;
`;
  if(kind==='write_typed_A'){
    need(uid===UA,'PROBE_KIND_INVALID');
    return `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','${UA}',true) IS NOT NULL AS identity_set;
INSERT INTO public.sessions(id,date,exercise_id,note)
VALUES ('aaaaaaaa-0000-4000-8000-0000000c0063','2026-11-08','TKC-000063','synthetic typed session after activation A');
COMMIT;
SELECT 'TK614_PROBE_TYPED_SESSION_WRITTEN_A' AS result;
`;
  }
  if(kind==='cross_owner')return probePreamble(uid,entries)+`DO $p$
BEGIN
 IF (SELECT count(*) FROM public.sessions WHERE exercise_id='TKC-000063')<>${uid===UA?1:0}
 THEN RAISE EXCEPTION 'PROBE_SESSION_VISIBILITY_WRONG'; END IF;
 IF public.tk504_historical_catalog_id('TKC-000063') IS DISTINCT FROM ${uid===UA?"'TK-000063'":'NULL'}
 THEN RAISE EXCEPTION 'PROBE_HISTORICAL_RESOLUTION_WRONG'; END IF;
END $p$;
SELECT 'TK614_PROBE_CROSS_OWNER_ISOLATED_${tag}' AS result;
ROLLBACK;
`;
  if(kind==='after_reverse')return probePreamble(uid,entries)+`DO $p$
BEGIN
 IF ${RESOLVE_ANY_226}<>0 THEN RAISE EXCEPTION 'PROBE_226_RESOLVABLE_AFTER_REVERSE'; END IF;
 IF ${RESOLVE_356}<>356 THEN RAISE EXCEPTION 'PROBE_356_NOT_RESOLVABLE'; END IF;${TYPED_INSERT_REJECTED}
 IF (SELECT count(*) FROM public.sessions WHERE exercise_id='TKC-000063')<>${uid===UA?1:0}
 THEN RAISE EXCEPTION 'PROBE_HISTORY_LOST_AFTER_REVERSE'; END IF;
 IF public.tk504_historical_catalog_id('TKC-000063') IS DISTINCT FROM ${uid===UA?"'TK-000063'":'NULL'}
 THEN RAISE EXCEPTION 'PROBE_HISTORICAL_RESOLUTION_WRONG'; END IF;
END $p$;
SELECT 'TK614_PROBE_AFTER_REVERSE_HISTORY_INTACT_${tag}' AS result;
ROLLBACK;
`;
  fail('PROBE_KIND_INVALID');
}

// Final postgres-side verification of the committed end state.
function buildFinalSql(entries){
  return `\\set ON_ERROR_STOP on
DO $f$
BEGIN
 IF (SELECT count(*) FROM public.sessions)<>6 THEN RAISE EXCEPTION 'FINAL_SESSION_COUNT'; END IF;
 IF (SELECT sessions_fp FROM tk614_smoke.baseline) IS DISTINCT FROM
    (SELECT md5(string_agg(s::text,'|' order by s.id)) FROM public.sessions s WHERE s.note NOT LIKE 'synthetic typed session after activation%')
 THEN RAISE EXCEPTION 'FINAL_HISTORICAL_SESSIONS_CHANGED'; END IF;
 IF (SELECT legacy_fp FROM tk614_smoke.baseline) IS DISTINCT FROM
    (SELECT md5(string_agg(e::text,'|' order by e.id)) FROM public.exercises e WHERE e.id ~ '^TK-[0-9]{6}$')
 THEN RAISE EXCEPTION 'FINAL_LEGACY_ROWS_CHANGED'; END IF;
 IF (SELECT b356_fp FROM tk614_smoke.baseline) IS DISTINCT FROM
    (SELECT md5(string_agg(b::text,'|' order by b.catalog_id)) FROM public.movekit_catalog_fk_bindings b
      WHERE substring(b.catalog_id from 4)::int>226)
   OR (SELECT a356_fp FROM tk614_smoke.baseline) IS DISTINCT FROM
    (SELECT md5(string_agg(e::text,'|' order by e.id)) FROM public.exercises e
      WHERE e.id ~ '^TKC-[0-9]{6}$' AND substring(e.id from 5)::int>226)
 THEN RAISE EXCEPTION 'FINAL_EXISTING_356_CHANGED'; END IF;
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE substring(catalog_id from 4)::int<=226
      AND active=false AND reviewed_at IS NULL)<>226
   OR (SELECT count(*) FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$' AND substring(id from 5)::int<=226
      AND active=false AND scope='global' AND created_by IS NULL AND user_id IS NULL AND gym_id IS NULL)<>226
 THEN RAISE EXCEPTION 'FINAL_226_NOT_SAFE_INACTIVE'; END IF;
 IF (SELECT string_agg(phase||':'||rows_changed,',' ORDER BY id) FROM public.tk614_admin_release_audit)
      IS DISTINCT FROM 'stage:226,activate:226,reverse:226,reverse:0'
 THEN RAISE EXCEPTION 'FINAL_AUDIT_CHAIN_WRONG'; END IF;
 BEGIN
  UPDATE public.tk614_admin_release_audit SET rows_changed=0;
  RAISE EXCEPTION 'FINAL_AUDIT_UPDATE_ACCEPTED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  DELETE FROM public.tk614_admin_release_audit;
  RAISE EXCEPTION 'FINAL_AUDIT_DELETE_ACCEPTED';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $f$;
BEGIN;
SET LOCAL ROLE authenticated;
DO $f$
BEGIN
 BEGIN
  PERFORM count(*) FROM public.tk614_admin_release_audit;
  RAISE EXCEPTION 'FINAL_AUDIT_READABLE_BY_CLIENT';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM count(*) FROM public.movekit_catalog_fk_bindings;
  RAISE EXCEPTION 'FINAL_REGISTRY_READABLE_BY_CLIENT';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $f$;
ROLLBACK;
SELECT 'TK614_SMOKE_FINAL_STATE_VERIFIED_${entries.length}' AS result;
`;
}

// Outcome classifier (pure).
function judge(expect,status,stdout,stderr){
  need(expect&&(expect.marker||expect.error),'EXPECTATION_INVALID');
  if(expect.marker)return status===0&&String(stdout).includes(expect.marker)&&!/ERROR:/.test(String(stderr));
  return status!==0&&String(stderr).includes(expect.error)&&!/TK614_PHASE_[ABC]_/.test(String(stdout));
}

function docker(args,opts={}){
  const r=spawnSync('docker',args,{encoding:'utf8',timeout:opts.timeout||300000,maxBuffer:64*1024*1024});
  if(opts.allowFail)return r;
  if(r.error||r.status!==0)throw Error('DOCKER_FAILED '+args.slice(0,2).join(' ')+': '+String(r.stderr||r.error).slice(0,1200));
  return r;
}
const sleep=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);

function run(argv){
  const o=parseArgs(argv);
  need(safelyOutsideRepo(o.manifest),'PRIVATE_MANIFEST_INSIDE_REPOSITORY');
  need(safelyOutsideRepo(o.outDir),'PRIVATE_OUTPUT_INSIDE_REPOSITORY');
  need(!fs.existsSync(o.outDir),'EEXIST_PRIVATE_OUTPUT');
  const manifestBytes=fs.readFileSync(o.manifest);
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  const catalogBytes=fs.readFileSync(path.join(ROOT,'exercise-catalog.json'));
  const plan=T.planAll(manifest,catalogBytes);
  const {entries}=T.verifyAllPlan(plan,manifest);
  const repo={catalogBytes,manifestBytes,
    tk504Sql:fs.readFileSync(path.join(ROOT,MIGRATIONS[0][1]),'utf8'),
    auditSql:fs.readFileSync(path.join(ROOT,MIGRATIONS[2][1]),'utf8'),
    releaseGates:JSON.parse(fs.readFileSync(path.join(ROOT,'docs','generated','MOVEKIT_V2_RELEASE_GATES.json'),'utf8'))};
  const manifestSha256=sha(manifestBytes);
  const keys=crypto.generateKeyPairSync('ed25519');
  const trust={trustedOwnerKeySha256:[sha(keys.publicKey.export({format:'der',type:'spki'}))]};
  const day=new Date().toISOString().slice(0,10).replace(/-/g,'');
  const id=(phase,s)=>`TK614-OWNER-${phase.toUpperCase()}-${day}-${s}`;
  const gates=()=>{const g={},at=new Date(Date.now()-120000).toISOString();
    for(const k of R.ACTIVATION_GATES)g[k]={status:'ACCEPTED',accepted_by:'Synthetic smoke reviewer',
      evidence_sha256:sha('tk614-smoke-'+k),...(k==='review'?{completed_at:at}:{})};return g;};
  const approval=(phase,decisionId,priorDecisionId,fingerprint,over)=>{
    let a=R.buildApproval({phase,decisionId,priorDecisionId,approvedBy:'Synthetic smoke owner',
      approvedAt:new Date(Date.now()-60000).toISOString(),plan,manifestSha256,fingerprint,
      gates:phase==='activate'?gates():undefined});
    if(over){a={...a,...over(a)};a=R.sealApproval(a);}
    return phase==='activate'?R.signApproval(a,keys.privateKey):a;
  };
  const render=(phase,a)=>R.prepareRelease(phase,{...repo,approval:a,confirmDecisionId:a.decision_id,
    confirmApprovalSha256:a.approval_sha256,releaseGates:phase==='activate'?SYNTHETIC_RELEASE_GATES:repo.releaseGates},
    phase==='activate'?trust:{}).sql;

  fs.mkdirSync(o.outDir,{mode:0o700});
  const write=(f,text)=>{const p=path.join(o.outDir,f);const fd=fs.openSync(p,'wx',0o600);
    try{fs.writeFileSync(fd,text,'utf8');}finally{fs.closeSync(fd);}return p;};
  const name='tk614-admin-smoke-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex');
  const results=[];let started=false,seq=0;
  const psql=(file,extra=[])=>docker(['exec',name,'psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres',
    '-d',DB,...extra,'-f','/tmp/'+file],{allowFail:true});
  const put=(base,text)=>{const f=String(++seq).padStart(3,'0')+'-'+base+'.sql';
    docker(['cp',write(f,text),name+':/tmp/'+f]);return f;};
  const step=(label,text,expect)=>{
    const f=put(label,text),r=psql(f),pass=judge(expect,r.status,r.stdout||'',r.stderr||'');
    results.push({step:label,pass,exit:r.status,expected:expect.marker||expect.error,
      observed:r.status===0?'ok':(String(r.stderr||'').match(/ERROR:[^\n]*/)||[''])[0].slice(0,200)});
    return pass;
  };
  const sh=(label,sqlText)=>step(label,`\\set ON_ERROR_STOP on\n${sqlText}\nSELECT 'TK614_SMOKE_STEP_OK' AS result;\n`,
    {marker:'TK614_SMOKE_STEP_OK'});
  const fingerprint=label=>{
    const f=put(label,R.renderFingerprintSql()),r=psql(f);
    let fp=null;try{fp=R.parseFingerprintOutput(r.stdout||'');}catch(_){fp=null;}
    results.push({step:label,pass:r.status===0&&!!fp,exit:r.status,expected:'fingerprint',observed:fp?'ok':'invalid'});
    need(fp,'SMOKE_FINGERPRINT_FAILED_'+label);
    return fp;
  };
  const same=(label,a,b)=>results.push({step:label,pass:!!a&&!!b&&a.precondition_sha256===b.precondition_sha256&&
    a.registry_snapshot_sha256===b.registry_snapshot_sha256,expected:'identical fingerprint',observed:'compared'});
  const wrap=(label,phaseFile,prefix,expect)=>step(label,`\\set ON_ERROR_STOP on\n${prefix}\n\\i /tmp/${phaseFile}\n`,expect);
  const guardFn=repo.tk504Sql.replace(/\r\n/g,'\n')
    .match(/create or replace function public\.tk504_protect_catalog_fk_bindings\(\)[\s\S]*?\$tk504\$;/i)[0];
  const advisoryHolder=()=>{
    docker(['exec','-d',name,'psql','-X','-U','postgres','-d',DB,'-c','select pg_advisory_lock(614226,603), pg_sleep(90)']);
    for(let i=0;i<40;i++){
      const r=docker(['exec',name,'psql','-X','-A','-t','-U','postgres','-d',DB,'-c',
        "select count(*) from pg_locks where locktype='advisory' and classid=614226 and objid=603 and granted"],{allowFail:true});
      if(String(r.stdout||'').trim()==='1')return true;
      sleep(250);
    }
    return false;
  };
  const advisoryRelease=()=>docker(['exec',name,'psql','-X','-q','-U','postgres','-d',DB,'-c',
    "select pg_terminate_backend(pid) from pg_locks where locktype='advisory' and classid=614226 and objid=603 and pid<>pg_backend_pid()"],
    {allowFail:true});
  const POLICY_DRIFT=`CREATE POLICY tk614_synthetic_drift ON public.sessions AS RESTRICTIVE FOR SELECT TO authenticated USING (true);`;
  const POLICY_RESTORE=`DROP POLICY tk614_synthetic_drift ON public.sessions;`;
  try{
    docker(['run','--rm','--detach','--pull','never','--network','none','--label','tk614.disposable=true',
      '--name',name,'-e','POSTGRES_PASSWORD=synthetic_only_tk614_'+crypto.randomBytes(6).toString('hex'),IMAGE]);
    started=true;
    need(docker(['inspect','-f','{{json .HostConfig.NetworkMode}}',name]).stdout.trim()==='"none"','CONTAINER_NOT_NETWORK_NONE');
    let ready=false;
    for(let i=0;i<60&&!ready;i++){ready=docker(['exec',name,'pg_isready','-U','postgres'],{allowFail:true}).status===0;if(!ready)sleep(500);}
    need(ready,'POSTGRES_NOT_READY');
    sleep(1500);
    for(let i=0;i<60;i++){if(docker(['exec',name,'pg_isready','-U','postgres'],{allowFail:true}).status===0)break;sleep(500);}
    for(const [f,src] of MIGRATIONS)docker(['cp',path.join(ROOT,src),name+':/tmp/'+f]);
    docker(['exec',name,'psql','-X','-q','-U','postgres','-d','postgres','-c','create database '+DB]);
    need(step('setup',buildSetupSql(entries),{marker:'TK614_SMOKE_SETUP_READY'}),'SMOKE_SETUP_FAILED');

    // ---------------- Phase A: negatives first, then real COMMIT
    const fp0=fingerprint('fingerprint_before_stage');
    const aStage=approval('stage',id('stage','SMOKE1'),null,fp0);
    const stageFile=put('phase-a-stage',render('stage',aStage));
    const badSnap=approval('stage',id('stage','BADSNAP'),null,fp0,()=>({live:{...fp0Live(fp0),registry_snapshot_sha256:'f'.repeat(64)}}));
    step('stage_registry_snapshot_mismatch',render('stage',badSnap),{error:'TK614_REGISTRY_SNAPSHOT_DRIFT'});
    wrap('stage_jwt_context',stageFile,`SET request.jwt.claim.sub TO '${UA}';`,{error:'TK614_JWT_CONTEXT_FORBIDDEN'});
    wrap('stage_service_role',stageFile,'SET ROLE service_role;',{error:'permission denied'});
    wrap('stage_authenticated_jwt',stageFile,`SET ROLE authenticated;\nSET request.jwt.claim.sub TO '${UA}';`,{error:'permission denied'});
    sh('policy_drift_on',POLICY_DRIFT);
    wrap('stage_rls_policy_drift',stageFile,'',{error:'TK614_PRECONDITION_FINGERPRINT_DRIFT'});
    sh('policy_drift_off',POLICY_RESTORE);
    sh('guard_disable',`ALTER TABLE public.movekit_catalog_fk_bindings DISABLE TRIGGER tk504_catalog_fk_bindings_guard;`);
    wrap('stage_guard_trigger_disabled',stageFile,'',{error:'TK614_GUARD_TRIGGER_MISSING_OR_DISABLED'});
    sh('guard_enable',`ALTER TABLE public.movekit_catalog_fk_bindings ENABLE TRIGGER tk504_catalog_fk_bindings_guard;`);
    sh('guard_body_drift',guardFn.replace('Catalog FK binding changes require trusted database admin','Synthetic guard drift'));
    wrap('stage_guard_definition_drift',stageFile,'',{error:'TK614_GUARD_DEFINITION_DRIFT'});
    sh('guard_body_restore',guardFn);
    const held=advisoryHolder();
    results.push({step:'second_writer_lock_held',pass:held,expected:'advisory lock held',observed:held?'ok':'not held'});
    wrap('stage_second_writer',stageFile,'',{error:'TK614_SECOND_WRITER_ACTIVE'});
    advisoryRelease();
    same('fingerprint_unchanged_after_stage_negatives',fp0,fingerprint('fingerprint_after_stage_negatives'));
    step('stage_commit',`\\i /tmp/${stageFile}\n`,{marker:R.MARKERS.stage});
    wrap('stage_replay_refused',stageFile,'',{error:'TK614_DECISION_ALREADY_USED'});
    for(const u of [UA,UB])step('probe_after_stage_'+(u===UA?'A':'B'),buildProbeSql('after_stage',u,entries),
      {marker:'TK614_PROBE_AFTER_STAGE_RUNTIME_NOT_FIXED_'+(u===UA?'A':'B')});

    // ---------------- Phase B: negatives first, then real COMMIT
    const fp1=fingerprint('fingerprint_after_stage');
    results.push({step:'stage_left_schema_unchanged',pass:fp1.precondition_sha256===fp0.precondition_sha256&&
      fp1.registry_snapshot_sha256!==fp0.registry_snapshot_sha256&&fp1.original_226_bindings===226&&
      fp1.original_226_released===0&&fp1.latest_audit_decision_id===aStage.decision_id,expected:'fp1 vs fp0',observed:'compared'});
    const aAct=approval('activate',id('activate','SMOKE1'),aStage.decision_id,fp1);
    const actFile=put('phase-b-activate',render('activate',aAct));
    step('activate_prepared_before_stage',render('activate',approval('activate',id('activate','EARLY'),aStage.decision_id,fp0)),
      {error:'TK614_REGISTRY_SNAPSHOT_DRIFT'});
    step('activate_wrong_prior_decision',render('activate',approval('activate',id('activate','NOPRIOR'),
      id('stage','NOPE'),fp1)),{error:'TK614_PRIOR_DECISION_NOT_FOUND'});
    sh('partial_drift_on',`UPDATE public.movekit_catalog_fk_bindings SET active=true, reviewed_at='2026-11-08 00:00:00+00' WHERE catalog_id='TK-000100';`);
    wrap('activate_partial_batch_drift',actFile,'',{error:'TK614_REGISTRY_SNAPSHOT_DRIFT'});
    sh('partial_drift_off',`UPDATE public.movekit_catalog_fk_bindings SET active=false, reviewed_at=NULL WHERE catalog_id='TK-000100';`);
    sh('provider_drift_on',`UPDATE public.movekit_catalog_fk_bindings SET provider_id='tk614-synthetic-cross-provider-drift' WHERE catalog_id='TK-000150';`);
    wrap('activate_cross_provider_drift',actFile,'',{error:'TK614_REGISTRY_SNAPSHOT_DRIFT'});
    sh('provider_drift_off',`UPDATE public.movekit_catalog_fk_bindings SET provider_id='${entries[149].provider_id}' WHERE catalog_id='TK-000150';`);
    wrap('activate_jwt_context',actFile,`SET request.jwt.claim.sub TO '${UB}';`,{error:'TK614_JWT_CONTEXT_FORBIDDEN'});
    wrap('activate_service_role',actFile,'SET ROLE service_role;',{error:'permission denied'});
    sh('policy_drift_on_b',POLICY_DRIFT);
    wrap('activate_rls_policy_drift',actFile,'',{error:'TK614_PRECONDITION_FINGERPRINT_DRIFT'});
    sh('policy_drift_off_b',POLICY_RESTORE);
    same('fingerprint_unchanged_after_activate_negatives',fp1,fingerprint('fingerprint_after_activate_negatives'));
    step('activate_commit',`\\i /tmp/${actFile}\n`,{marker:R.MARKERS.activate});
    wrap('activate_replay_refused',actFile,'',{error:'TK614_DECISION_ALREADY_USED'});
    const fp2=fingerprint('fingerprint_after_activate');
    step('activate_twice_refused',render('activate',approval('activate',id('activate','TWICE'),aStage.decision_id,fp2)),
      {error:'TK614_PRIOR_DECISION_NOT_LATEST'});
    for(const u of [UA,UB])step('probe_after_activate_'+(u===UA?'A':'B'),buildProbeSql('after_activate',u,entries),
      {marker:'TK614_PROBE_AFTER_ACTIVATE_226_RESOLVABLE_'+(u===UA?'A':'B')});
    step('typed_session_write_A',buildProbeSql('write_typed_A',UA,entries),{marker:'TK614_PROBE_TYPED_SESSION_WRITTEN_A'});
    for(const u of [UA,UB])step('probe_cross_owner_'+(u===UA?'A':'B'),buildProbeSql('cross_owner',u,entries),
      {marker:'TK614_PROBE_CROSS_OWNER_ISOLATED_'+(u===UA?'A':'B')});

    // ---------------- Phase C: reverse (after new history), idempotent
    const aRev=approval('reverse',id('reverse','SMOKE1'),aAct.decision_id,undefined);
    const revFile=put('phase-c-reverse',render('reverse',aRev));
    wrap('reverse_jwt_context',revFile,`SET request.jwt.claim.sub TO '${UA}';`,{error:'TK614_JWT_CONTEXT_FORBIDDEN'});
    step('reverse_commit',`\\i /tmp/${revFile}\n`,{marker:R.MARKERS.reverse});
    for(const u of [UA,UB])step('probe_after_reverse_'+(u===UA?'A':'B'),buildProbeSql('after_reverse',u,entries),
      {marker:'TK614_PROBE_AFTER_REVERSE_HISTORY_INTACT_'+(u===UA?'A':'B')});
    const aRev2=approval('reverse',id('reverse','SMOKE2'),aRev.decision_id,undefined);
    step('reverse_again_idempotent',render('reverse',aRev2),{marker:R.MARKERS.reverse});
    wrap('reverse_replay_refused',revFile,'',{error:'TK614_DECISION_ALREADY_USED'});
    step('final_state',buildFinalSql(entries),{marker:'TK614_SMOKE_FINAL_STATE_VERIFIED_582'});
  }catch(e){
    results.push({step:'runner_exception',pass:false,observed:String(e.code||e.message).slice(0,300)});
  }finally{
    if(started){const s=docker(['rm','-f',name],{allowFail:true});results.push({step:'container_removed',pass:s.status===0});}
  }
  const allPass=results.length>0&&results.every(r=>r.pass)&&results.some(r=>r.step==='final_state'&&r.pass);
  const report={schema:'tk614-admin-release-docker-smoke/1.0',status:'DISPOSABLE_SMOKE_NO_RELEASE_AUTHORITY',
    image:IMAGE,network:'none',production_touched:false,all_pass:allPass,all_sha256:plan.all_sha256,
    mapping_sha256:plan.source_mapping_sha256,source_catalog_sha256:plan.source_catalog_sha256,results};
  write('tk614-admin-release-docker-smoke-report.json',JSON.stringify(report,null,2)+'\n');
  for(const r of results)process.stdout.write((r.pass?'PASS ':'FAIL ')+r.step+(r.observed&&r.observed!=='ok'&&!r.pass?' :: '+r.observed:'')+'\n');
  process.stdout.write(JSON.stringify({all_pass:allPass,steps:results.length,all_sha256:plan.all_sha256})+'\n');
  if(!allPass)process.exitCode=1;
  return report;
}
const fp0Live=fp=>({precondition_sha256:fp.precondition_sha256,registry_snapshot_sha256:fp.registry_snapshot_sha256,
  server_version_num:fp.server_version_num});
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(e){process.stderr.write('TK614_ADMIN_RELEASE_SMOKE_BLOCKED: '+(e.code||e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({UA,UB,SYNTHETIC_RELEASE_GATES,parseArgs,buildSetupSql,buildProbeSql,buildFinalSql,judge,run});
