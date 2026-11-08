'use strict';
/**
 * TK614 / #603 -- FAIL-CLOSED batch25 preflight for the ORIGINAL 226 MoveKit
 * catalog items (TK-000001..TK-000226 -> TKC-000001..TKC-000226).
 *
 * NOT a migration, NOT a seed, NOT a release. No network, no Supabase API,
 * no credentials. Output status is always DRY_RUN_NO_RELEASE_AUTHORITY.
 *  - Input: the private, already validated 582 manifest
 *    (schema tk504-private-typed-fk-preflight/1.0), absolute path OUTSIDE Git.
 *  - Verifies the pinned 582 mapping SHA, exact ID/provider/slug identity with
 *    the public 226 exercise-catalog.json, and the 10-batch schedule
 *    (9 x 25 + 1 x 1).
 *  - Emits ONLY batch 1 (TK-000001..025) with active=false, reviewed_at=null.
 *  - Optional private outputs (exclusive create, outside repo):
 *      --out          batch plan JSON (contains 25 provider slugs -> private)
 *      --sql-out      ROLLBACK-only SQL for a DISPOSABLE sandbox Postgres
 *      --sandbox-out  synthetic disposable harness (356 reviewed + 23 TK rows)
 *  - stdout: counts + digests only, never provider slugs.
 * Nothing here can mark rows reviewed/active, grant media or change ACL/RLS.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {safelyOutsideRepo}=require('./tk504_prepare_private_fk_manifest.cjs');
const {validatePrivateManifest}=require('./tk504_render_private_fk_docker_preview.cjs');

const ROOT=path.resolve(__dirname,'..');
const EXPECTED_MAPPING_SHA256='706803c1e5a9485eb190da04f11d607d4e29a5f29777da4c77d0a1f99750e0ec';
const ORIGINAL=226,TOTAL=582,BATCH_SIZE=25,BATCH_COUNT=Math.ceil(ORIGINAL/BATCH_SIZE);
const PREVIEW_BATCHES=Object.freeze([1]); // only batch 1 may be emitted now
const EXPECTED_LEGACY_TK_ROWS=23;
const SCHEMA='tk614-original226-batch25-preflight/1.0';
const STATUS='DRY_RUN_NO_RELEASE_AUTHORITY';

const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const pad=n=>String(n).padStart(6,'0');
const num=id=>Number(String(id).slice(String(id).indexOf('-')+1));
function fail(code){const e=new Error(code);e.code=code;throw e;}
function need(ok,code){if(!ok)fail(code);}

function batchRange(n){
  need(Number.isInteger(n)&&n>=1&&n<=BATCH_COUNT,'BATCH_OUT_OF_RANGE');
  const first=(n-1)*BATCH_SIZE+1,last=Math.min(n*BATCH_SIZE,ORIGINAL);
  return {first,last,size:last-first+1};
}
function batchSchedule(){
  return Object.freeze(Array.from({length:BATCH_COUNT},(_,i)=>{
    const r=batchRange(i+1);
    return Object.freeze({batch:i+1,first_catalog_id:'TK-'+pad(r.first),
      last_catalog_id:'TK-'+pad(r.last),size:r.size});
  }));
}
function batchOf(catalogId){
  need(/^TK-[0-9]{6}$/.test(catalogId||'')&&num(catalogId)>=1&&num(catalogId)<=ORIGINAL,
    'NOT_AN_ORIGINAL_226_ID');
  return Math.ceil(num(catalogId)/BATCH_SIZE);
}

// Exact identity of the 226 published originals vs. the private 582 manifest.
function verifyOriginalCatalog(catalog,entries){
  need(catalog&&catalog.count===ORIGINAL&&Array.isArray(catalog.catalog)&&
    catalog.catalog.length===ORIGINAL&&catalog.id_map&&typeof catalog.id_map==='object',
    'ORIGINAL_226_BASELINE_CHANGED');
  const byId=new Map(catalog.catalog.map(c=>[c&&c.catalog_id,c]));
  need(byId.size===ORIGINAL,'ORIGINAL_226_BASELINE_CHANGED');
  const idMap=catalog.id_map,own=k=>Object.prototype.hasOwnProperty.call(idMap,k);
  for(let i=0;i<ORIGINAL;i++){
    const e=entries[i],c=byId.get(e.catalog_id);
    need(c&&c.source&&c.source.provider==='movekit'&&
      c.source.provider_id===e.provider_id&&own(e.provider_id)&&
      idMap[e.provider_id]===e.catalog_id&&e.exercise_id!==e.catalog_id,
      'ORIGINAL_CATALOG_IDENTITY_MISMATCH');
  }
  for(let i=ORIGINAL;i<TOTAL;i++)
    need(!own(entries[i].provider_id),'PROVIDER_COLLISION_WITH_NEW_356');
  need(Object.keys(idMap).length===ORIGINAL,'ORIGINAL_226_BASELINE_CHANGED');
  for(const [slug,id] of Object.entries(idMap)){
    const c=byId.get(id);
    need(c&&c.source&&c.source.provider_id===slug,'ORIGINAL_CATALOG_IDENTITY_MISMATCH');
  }
}

function batchEntries(entries,n){
  const r=batchRange(n);
  return entries.slice(r.first-1,r.last).map((e,k)=>{
    const id=r.first+k;
    need(e.catalog_id==='TK-'+pad(id)&&e.exercise_id==='TKC-'+pad(id)&&
      e.eligibility==='existing-catalog-not-authorized-for-new-binding'&&e.active===false,
      'UNTRUSTED_ROW_IN_PRIVATE_PLAN');
    return Object.freeze({catalog_id:e.catalog_id,exercise_id:e.exercise_id,
      provider_id:e.provider_id,active:false,reviewed_at:null});
  });
}
const batchDigest=(n,entries,mapping)=>sha(Buffer.from(
  JSON.stringify({schema:SCHEMA,batch:n,source_mapping_sha256:mapping,entries}),'utf8'));

function planBatch(manifest,catalog,n,opts={}){
  const expected=opts.expectedMappingSha===undefined?EXPECTED_MAPPING_SHA256:opts.expectedMappingSha;
  need(typeof expected==='string'&&/^[0-9a-f]{64}$/.test(expected),'EXPECTED_SHA_INVALID');
  const r=batchRange(n);
  const entries=validatePrivateManifest(manifest); // throws on any drift/tamper
  need(manifest.mapping_sha256===expected,'STALE_OR_WRONG_MAPPING_SHA');
  verifyOriginalCatalog(catalog,entries);
  const rows=Object.freeze(batchEntries(entries,n));
  return Object.freeze({
    schema:SCHEMA,status:STATUS,
    batch:Object.freeze({number:n,of:BATCH_COUNT,first_catalog_id:'TK-'+pad(r.first),
      last_catalog_id:'TK-'+pad(r.last),size:r.size}),
    source_mapping_sha256:manifest.mapping_sha256,
    release:Object.freeze({active:0,reviewed:0,media_grants:0,acl_changes:0,
      eligible_for_live_seed:0,release_authority:false}),
    batch_sha256:batchDigest(n,rows,manifest.mapping_sha256),
    entries:rows
  });
}

// Re-derive a plan from the manifest; any mismatch is tampering.
function verifyBatchPlan(plan,manifest){
  need(plan&&plan.schema===SCHEMA&&plan.status===STATUS&&plan.batch&&
    plan.release&&plan.release.release_authority===false,'NOT_A_DRY_RUN_BATCH_PLAN');
  const entries=validatePrivateManifest(manifest);
  need(plan.source_mapping_sha256===manifest.mapping_sha256,'STALE_OR_WRONG_MAPPING_SHA');
  const n=plan.batch.number,rows=batchEntries(entries,n);
  need(Array.isArray(plan.entries)&&JSON.stringify(plan.entries)===JSON.stringify(rows)&&
    plan.batch_sha256===batchDigest(n,rows,manifest.mapping_sha256),'BATCH_PLAN_TAMPERED');
  return {n,rows,entries,range:batchRange(n)};
}

/**
 * Offline check of a (synthetic or privately exported read-only) target snapshot
 * {exercises:[{id,scope,created_by,user_id,gym_id,active}],
 *  bindings:[{catalog_id,exercise_id,provider_id,active,reviewed_at}]}.
 * Same guards as the generated SQL. Pure: never writes.
 */
function assertDisposableTargetState(state,plan,manifest,opts={}){
  const {rows,entries,range}=verifyBatchPlan(plan,manifest);
  const ex=state&&state.exercises,bi=state&&state.bindings;
  need(Array.isArray(ex)&&Array.isArray(bi),'TARGET_STATE_INVALID');
  const tkc=ex.filter(r=>/^TKC-[0-9]{6}$/.test(r.id||''));
  need(tkc.every(r=>r.scope==='global'&&r.created_by==null&&r.user_id==null&&r.gym_id==null),
    'RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE');
  const byCat=new Map();
  for(const b of bi){
    need(/^TK-[0-9]{6}$/.test(b.catalog_id||'')&&num(b.catalog_id)>=1&&num(b.catalog_id)<=TOTAL&&
      b.exercise_id==='TKC-'+pad(num(b.catalog_id))&&!byCat.has(b.catalog_id),'UNEXPECTED_BINDING');
    byCat.set(b.catalog_id,b);
  }
  const aliasById=new Map(tkc.map(r=>[r.id,r]));
  // The 356 reviewed bindings for 227..582 must be present and unchanged.
  need(bi.filter(b=>num(b.catalog_id)>ORIGINAL).length===TOTAL-ORIGINAL&&
    entries.slice(ORIGINAL).every(e=>{const b=byCat.get(e.catalog_id);
      return b&&b.exercise_id===e.exercise_id&&b.provider_id===e.provider_id&&
        b.active===true&&!!b.reviewed_at&&aliasById.has(e.exercise_id);}),
    'EXISTING_356_CHANGED_OR_MISSING');
  const lowB=bi.filter(b=>num(b.catalog_id)<=ORIGINAL),lowA=tkc.filter(r=>num(r.id)<=ORIGINAL);
  const inBatch=x=>x>=range.first&&x<=range.last;
  need(!lowB.some(b=>inBatch(num(b.catalog_id))),'BATCH_ALREADY_PRESENT');
  need(!lowA.some(r=>inBatch(num(r.id))),'ORIGINAL_ALIAS_COLLISION');
  const prior=range.first-1;
  need(!lowB.some(b=>num(b.catalog_id)>range.last)&&!lowA.some(r=>num(r.id)>range.last)&&
    lowB.length===prior&&lowA.length===prior,'BATCH_GAP_OR_OUT_OF_ORDER');
  need(lowB.every(b=>{const e=entries[num(b.catalog_id)-1],a=aliasById.get(b.exercise_id);
      return b.provider_id===e.provider_id&&b.active===false&&b.reviewed_at==null&&
        a&&a.active===false;}),'PRIOR_BATCH_NOT_INACTIVE_UNREVIEWED');
  const batchProviders=new Set(rows.map(e=>e.provider_id));
  need(!bi.some(b=>batchProviders.has(b.provider_id)),'PROVIDER_ALREADY_BOUND');
  const legacy=ex.filter(r=>/^TK-[0-9]{6}$/.test(r.id||'')).sort((a,b)=>a.id<b.id?-1:1);
  const want=opts.expectedLegacyRows===undefined?EXPECTED_LEGACY_TK_ROWS:opts.expectedLegacyRows;
  need(legacy.length===want,'LEGACY_TK_ROW_COUNT_CHANGED');
  return Object.freeze({existing_356_intact:true,prior_batches_present:prior,
    legacy_tk_rows:legacy.length,legacy_fingerprint:sha(JSON.stringify(legacy))});
}

const FORBIDDEN_SQL=/\b(COMMIT|GRANT|REVOKE|ALTER|DROP|TRUNCATE|UPDATE|DELETE|POLICY|SECURITY\s+DEFINER|SET\s+ROLE)\b/i;
function guardSql(sql){
  if(FORBIDDEN_SQL.test(sql)||!sql.endsWith('ROLLBACK;\n'))fail('PREVIEW_MUST_NEVER_COMMIT_OR_CHANGE_ACL');
  return sql;
}
const series=(a,b,prefix)=>`(SELECT '${prefix}'||lpad(g::text,6,'0') FROM generate_series(${a},${b}) g)`;

function renderRollbackSql(plan,manifest){
  const {n,rows,entries,range}=verifyBatchPlan(plan,manifest);
  const B=String(n).padStart(2,'0'),{first,last,size}=range;
  const reviewed=entries.slice(ORIGINAL).map(e=>
    `  ('${e.catalog_id}','${e.exercise_id}','${e.provider_id}')`).join(',\n');
  const providers=rows.map(e=>`'${e.provider_id}'`).join(',');
  const aliases=rows.map(e=>
    `('${e.exercise_id}','TK614 catalog FK reference ${e.exercise_id.slice(4)}','system','strength','global',false,NULL,NULL,NULL)`).join(',\n');
  const bindings=rows.map(e=>
    `('${e.catalog_id}','${e.exercise_id}','${e.provider_id}',false,NULL)`).join(',\n');
  const sql=`-- TK614 #603: PRIVATE ROLLBACK-ONLY batch ${B}/${BATCH_COUNT} proof (${'TK-'+pad(first)}..${'TK-'+pad(last)}).
-- ONLY for a disposable, offline sandbox PostgreSQL that carries the marker table.
-- NEVER run on Supabase production/staging. Not a migration. No release authority.
-- Source mapping digest: ${plan.source_mapping_sha256}
-- Batch digest: ${plan.batch_sha256}
-- Rows stay active=false, reviewed_at=NULL. No media, no ACL/RLS, no sessions.
\\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE tk614_expected_356(catalog_id text, exercise_id text, provider_id text);
INSERT INTO tk614_expected_356 VALUES
${reviewed};
DO $tk614$
BEGIN
 IF to_regclass('public.tk614_disposable_sandbox_marker') IS NULL
 THEN RAISE EXCEPTION 'NOT_A_DISPOSABLE_SANDBOX'; END IF;
 IF to_regclass('public.movekit_catalog_fk_bindings') IS NULL
 THEN RAISE EXCEPTION 'STAGED_ADMIN_BINDING_SCHEMA_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$' AND
   (scope IS DISTINCT FROM 'global' OR created_by IS NOT NULL OR user_id IS NOT NULL OR gym_id IS NOT NULL))
 THEN RAISE EXCEPTION 'RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE'; END IF;
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings b
       JOIN tk614_expected_356 x ON x.catalog_id=b.catalog_id AND x.exercise_id=b.exercise_id
        AND x.provider_id=b.provider_id
       JOIN public.exercises e ON e.id=b.exercise_id AND e.scope='global'
        AND e.created_by IS NULL AND e.user_id IS NULL AND e.gym_id IS NULL
      WHERE b.active AND b.reviewed_at IS NOT NULL AND b.source_provider='movekit')<>356
   OR (SELECT count(*) FROM public.movekit_catalog_fk_bindings
      WHERE catalog_id IN ${series(ORIGINAL+1,TOTAL,'TK-')})<>356
 THEN RAISE EXCEPTION 'EXISTING_356_CHANGED_OR_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(first,last,'TK-')})
 THEN RAISE EXCEPTION 'BATCH_ALREADY_PRESENT'; END IF;
 IF EXISTS(SELECT 1 FROM public.exercises WHERE id IN ${series(first,last,'TKC-')})
 THEN RAISE EXCEPTION 'ORIGINAL_ALIAS_COLLISION'; END IF;
 IF ${last<ORIGINAL?`EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(last+1,ORIGINAL,'TK-')})
   OR EXISTS(SELECT 1 FROM public.exercises WHERE id IN ${series(last+1,ORIGINAL,'TKC-')}) OR`:''}
    (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')})<>${first-1}
   OR (SELECT count(*) FROM public.exercises WHERE id IN ${series(1,ORIGINAL,'TKC-')})<>${first-1}
 THEN RAISE EXCEPTION 'BATCH_GAP_OR_OUT_OF_ORDER'; END IF;
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')}
   AND (active OR reviewed_at IS NOT NULL))
 THEN RAISE EXCEPTION 'PRIOR_BATCH_NOT_INACTIVE_UNREVIEWED'; END IF;
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE provider_id IN (${providers}))
 THEN RAISE EXCEPTION 'PROVIDER_ALREADY_BOUND'; END IF;
 IF (SELECT count(*) FROM public.exercises WHERE id ~ '^TK-[0-9]{6}$')<>${EXPECTED_LEGACY_TK_ROWS}
 THEN RAISE EXCEPTION 'LEGACY_TK_ROW_COUNT_CHANGED'; END IF;
END
$tk614$;
CREATE TEMP TABLE tk614_before AS SELECT
 (SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
   WHERE e.id ~ '^TK-[0-9]{6}$') AS legacy_fp,
 (SELECT md5(coalesce(string_agg(b::text,'|' ORDER BY b.catalog_id),'')) FROM public.movekit_catalog_fk_bindings b
   WHERE b.catalog_id IN ${series(ORIGINAL+1,TOTAL,'TK-')}) AS bindings_356_fp,
 (SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
   WHERE e.id IN ${series(ORIGINAL+1,TOTAL,'TKC-')}) AS aliases_356_fp;
INSERT INTO public.exercises
(id,name,category,type,scope,active,created_by,user_id,gym_id)
VALUES
${aliases};
INSERT INTO public.movekit_catalog_fk_bindings
(catalog_id,exercise_id,provider_id,active,reviewed_at)
VALUES
${bindings};
DO $tk614$
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings b
       JOIN public.exercises e ON e.id=b.exercise_id AND e.scope='global' AND e.active=false
        AND e.created_by IS NULL AND e.user_id IS NULL AND e.gym_id IS NULL
      WHERE b.catalog_id IN ${series(first,last,'TK-')} AND b.active=false AND b.reviewed_at IS NULL)<>${size}
   OR EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')}
      AND (active OR reviewed_at IS NOT NULL))
 THEN RAISE EXCEPTION 'BATCH_ROWS_NOT_INACTIVE_UNREVIEWED'; END IF;
 IF (SELECT bindings_356_fp FROM tk614_before) IS DISTINCT FROM
    (SELECT md5(coalesce(string_agg(b::text,'|' ORDER BY b.catalog_id),'')) FROM public.movekit_catalog_fk_bindings b
      WHERE b.catalog_id IN ${series(ORIGINAL+1,TOTAL,'TK-')})
   OR (SELECT aliases_356_fp FROM tk614_before) IS DISTINCT FROM
    (SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
      WHERE e.id IN ${series(ORIGINAL+1,TOTAL,'TKC-')})
 THEN RAISE EXCEPTION 'EXISTING_356_MODIFIED_IN_TXN'; END IF;
 IF (SELECT legacy_fp FROM tk614_before) IS DISTINCT FROM
    (SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
      WHERE e.id ~ '^TK-[0-9]{6}$')
 THEN RAISE EXCEPTION 'LEGACY_TK_ROWS_CHANGED'; END IF;
END
$tk614$;
SELECT 'TK614_BATCH${B}_ROLLBACK_PROOF_PASS_${size}_INACTIVE_UNREVIEWED' AS result;
ROLLBACK;
`;
  return guardSql(sql);
}

// Synthetic disposable harness: base schema + staged migration + 356 reviewed
// synthetic aliases/bindings + 23 TK-shaped legacy rows (7 global, 16 personal),
// then the batch proof, then post-ROLLBACK verification. Disposable Docker only.
function renderSandboxHarness(plan,manifest){
  const {n,entries}=verifyBatchPlan(plan,manifest),B=String(n).padStart(2,'0');
  const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const legacyGlobal=[1,5,38,100,150,201,226],
    legacyPersonal=[2,3,4,10,25,26,50,60,63,70,80,90,120,188,200,225];
  const legacy=[...legacyGlobal.map(x=>`('TK-${pad(x)}','SYNTHETIC LEGACY GLOBAL','strength','strength','global',true,NULL,NULL)`),
    ...legacyPersonal.map((x,i)=>{const u=i%2?UB:UA;
      return `('TK-${pad(x)}','SYNTHETIC LEGACY PERSONAL','strength','strength','personal',true,'${u}','${u}')`;})].join(',\n');
  const al=entries.slice(ORIGINAL).map(e=>
    `('${e.exercise_id}','SYNTHETIC REVIEWED ALIAS','system','strength','global',false,NULL,NULL)`).join(',\n');
  const bd=entries.slice(ORIGINAL).map(e=>
    `('${e.catalog_id}','${e.exercise_id}','${e.provider_id}',true,'2026-11-07 00:00:00+00')`).join(',\n');
  const sql=`-- TK614 #603: PRIVATE SYNTHETIC SANDBOX HARNESS, batch ${B}. Disposable --network none Docker only.
-- Requires /tmp/tk504-typed-fk-stage.sql and /tmp/tk614-batch${B}-rollback-only.sql.
\\set ON_ERROR_STOP on
create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create function auth.uid() returns uuid language sql stable as
  'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
create table public.exercises(id text primary key,name text not null,category text not null,
  type text not null,scope text not null default 'personal' check (scope in ('personal','gym','global')),
  active boolean default true,created_by uuid,user_id uuid,gym_id text);
create table public.sessions(id uuid primary key,user_id uuid not null,
  exercise_id text references public.exercises(id),note text);
create table public.tk614_disposable_sandbox_marker(created_at timestamptz default now());
insert into public.tk614_disposable_sandbox_marker default values;
insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
${legacy};
insert into public.sessions(id,user_id,exercise_id,note) values
('aaaaaaaa-0000-4000-8000-000000000063','${UA}','TK-000063','synthetic legacy history');
\\i /tmp/tk504-typed-fk-stage.sql
insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
${al};
insert into public.movekit_catalog_fk_bindings(catalog_id,exercise_id,provider_id,active,reviewed_at) values
${bd};
create temp table tk614_harness_before as select
 (select md5(string_agg(e::text,'|' order by e.id)) from public.exercises e) ex_fp,
 (select md5(string_agg(b::text,'|' order by b.catalog_id)) from public.movekit_catalog_fk_bindings b) b_fp;
\\i /tmp/tk614-batch${B}-rollback-only.sql
DO $qa$
BEGIN
 IF (SELECT ex_fp FROM tk614_harness_before) IS DISTINCT FROM
    (SELECT md5(string_agg(e::text,'|' order by e.id)) FROM public.exercises e)
   OR (SELECT b_fp FROM tk614_harness_before) IS DISTINCT FROM
    (SELECT md5(string_agg(b::text,'|' order by b.catalog_id)) FROM public.movekit_catalog_fk_bindings b)
 THEN RAISE EXCEPTION 'HARNESS_STATE_NOT_RESTORED_AFTER_ROLLBACK'; END IF;
 IF (SELECT count(*) FROM public.sessions WHERE exercise_id='TK-000063')<>1
 THEN RAISE EXCEPTION 'HARNESS_LEGACY_SESSION_CHANGED'; END IF;
END $qa$;
select 'TK614_SANDBOX_BATCH${B}_ROLLBACK_VERIFIED_356_AND_23_UNCHANGED' as result;
`;
  // Harness creates its own throwaway schema; it must still never COMMIT/grant.
  if(/\b(COMMIT|GRANT|REVOKE|POLICY)\b/i.test(sql))fail('HARNESS_MUST_NOT_COMMIT_OR_GRANT');
  return sql;
}

const USAGE='Usage: --manifest ABSOLUTE_PRIVATE_582_MANIFEST [--batch 1] '+
  '[--expected-mapping-sha HEX64] [--out ABS] [--sql-out ABS] [--sandbox-out ABS]';
const FLAGS=['--manifest','--batch','--expected-mapping-sha','--out','--sql-out','--sandbox-out'];
function parseArgs(argv){
  const o={};
  for(let i=0;i<argv.length;i+=2){
    const k=argv[i];
    if(!FLAGS.includes(k)||i+1>=argv.length||o[k]!==undefined){const e=Error(USAGE);e.code='USAGE';throw e;}
    o[k]=argv[i+1];
  }
  need(o['--manifest']!==undefined,'USAGE');
  need(path.isAbsolute(o['--manifest']),'MANIFEST_PATH_MUST_BE_ABSOLUTE');
  for(const k of ['--out','--sql-out','--sandbox-out'])
    need(o[k]===undefined||path.isAbsolute(o[k]),'OUTPUT_PATH_MUST_BE_ABSOLUTE');
  const batch=o['--batch']===undefined?1:Number(o['--batch']);
  need(PREVIEW_BATCHES.includes(batch),'BATCH_NOT_IN_PREVIEW_SCOPE');
  return {manifest:path.resolve(o['--manifest']),batch,
    expectedMappingSha:o['--expected-mapping-sha'],
    out:o['--out']&&path.resolve(o['--out']),sqlOut:o['--sql-out']&&path.resolve(o['--sql-out']),
    sandboxOut:o['--sandbox-out']&&path.resolve(o['--sandbox-out'])};
}
function writeExclusive(dest,text){
  const fd=fs.openSync(dest,'wx',0o600);
  try{fs.writeFileSync(fd,text,'utf8');}finally{fs.closeSync(fd);}
}
function run(argv){
  const o=parseArgs(argv);
  need(safelyOutsideRepo(o.manifest),'PRIVATE_MANIFEST_INSIDE_REPOSITORY');
  const outs=[o.out,o.sqlOut,o.sandboxOut].filter(Boolean);
  need(outs.every(safelyOutsideRepo),'PRIVATE_OUTPUT_INSIDE_REPOSITORY');
  need(new Set(outs).size===outs.length,'OUTPUT_PATHS_MUST_DIFFER');
  for(const d of outs)need(!fs.existsSync(d),'EEXIST_PRIVATE_OUTPUT');
  const bytes=fs.readFileSync(o.manifest);
  const manifest=JSON.parse(bytes.toString('utf8'));
  const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'exercise-catalog.json'),'utf8'));
  // Everything is computed and verified BEFORE any byte is written.
  const plan=planBatch(manifest,catalog,o.batch,{expectedMappingSha:o.expectedMappingSha});
  const sql=o.sqlOut||o.sandboxOut?renderRollbackSql(plan,manifest):null;
  const harness=o.sandboxOut?renderSandboxHarness(plan,manifest):null;
  if(o.out)writeExclusive(o.out,JSON.stringify({...plan,
    private_manifest_sha256:sha(bytes),schedule:batchSchedule()},null,2)+'\n');
  if(o.sqlOut)writeExclusive(o.sqlOut,sql);
  if(o.sandboxOut)writeExclusive(o.sandboxOut,harness);
  const report=Object.freeze({status:plan.status,batch:plan.batch.number,of:BATCH_COUNT,
    first_catalog_id:plan.batch.first_catalog_id,last_catalog_id:plan.batch.last_catalog_id,
    size:plan.batch.size,active:0,reviewed:0,mapping_sha256:plan.source_mapping_sha256,
    batch_sha256:plan.batch_sha256,private_manifest_sha256:sha(bytes),
    sql_sha256:sql?sha(Buffer.from(sql,'utf8')):null,
    actual_database_writes:false,private_plan_created:!!o.out,
    private_sql_created:!!o.sqlOut,private_sandbox_created:!!o.sandboxOut});
  process.stdout.write(JSON.stringify(report)+'\n');
  return report;
}
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(e){process.stderr.write('TK614_BATCH25_PREFLIGHT_BLOCKED: '+(e.code||e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({EXPECTED_MAPPING_SHA256,BATCH_SIZE,BATCH_COUNT,PREVIEW_BATCHES,
  batchRange,batchSchedule,batchOf,planBatch,verifyBatchPlan,assertDisposableTargetState,
  renderRollbackSql,renderSandboxHarness,parseArgs,run});
