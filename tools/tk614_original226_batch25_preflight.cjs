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
 *  - Pins the SHA256 of the public source exercise-catalog.json (CRLF-normalised).
 *  - Emits any single batch 1..10 (--batch N) or the complete ordered
 *    all-226 plan (--batch all), always active=false, reviewed_at=null.
 *  - Optional private outputs (exclusive create, outside repo):
 *      --out          plan JSON (contains provider slugs -> private)
 *      --sql-out      ROLLBACK-only SQL for a DISPOSABLE sandbox Postgres
 *                     (--batch all: ONE transaction, 10 ordered batch blocks)
 *      --sandbox-out  synthetic disposable harness (356 reviewed + 23 TK rows
 *                     + legacy session history)
 *  - stdout: counts + digests only, never provider slugs.
 * Nothing here can mark rows reviewed/active, grant media or change ACL/RLS.
 * Staging in a sandbox is NOT activation: activation stays a separate gate.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {safelyOutsideRepo}=require('./tk504_prepare_private_fk_manifest.cjs');
const {validatePrivateManifest}=require('./tk504_render_private_fk_docker_preview.cjs');

const ROOT=path.resolve(__dirname,'..');
const EXPECTED_MAPPING_SHA256='706803c1e5a9485eb190da04f11d607d4e29a5f29777da4c77d0a1f99750e0ec';
const ORIGINAL=226,TOTAL=582,BATCH_SIZE=25,BATCH_COUNT=Math.ceil(ORIGINAL/BATCH_SIZE);
// All 10 batches (9 x 25 + 1 x 1) may now be PREPARED. Never activated.
const PREVIEW_BATCHES=Object.freeze(Array.from({length:BATCH_COUNT},(_,i)=>i+1));
const EXPECTED_LEGACY_TK_ROWS=23;
// SHA256 of exercise-catalog.json (LF line endings) at PR #615 17b01697.
const EXPECTED_SOURCE_CATALOG_SHA256='b278938498ffd0d713a4ad23184bfdd037fab65fd2ce5c9e0f7662a6e96bf4af';
const SCHEMA='tk614-original226-batch25-preflight/1.0';
const SCHEMA_ALL='tk614-original226-all-batches-preflight/1.0';
const STATUS='DRY_RUN_NO_RELEASE_AUTHORITY';
const HEX64=/^[0-9a-f]{64}$/;

const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
// Byte digest of the source catalog; CRLF-normalised so a Windows checkout
// with autocrlf cannot produce a false mismatch. Any other byte change fails.
function sourceCatalogSha(bytes){
  need(Buffer.isBuffer(bytes)||typeof bytes==='string','SOURCE_CATALOG_BYTES_REQUIRED');
  return sha(Buffer.from(String(bytes).replace(/\r\n/g,'\n'),'utf8'));
}
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

// ---------------------------------------------------------------------------
// ALL 226: the complete ordered 10-batch plan. Same guards as planBatch, plus
// pinned source-catalog bytes and a full 226/226 bijection check.
function verifySourceCatalogBytes(catalogBytes,expected){
  need(typeof expected==='string'&&HEX64.test(expected),'EXPECTED_SOURCE_SHA_INVALID');
  const got=sourceCatalogSha(catalogBytes);
  need(got===expected,'SOURCE_CATALOG_SHA_MISMATCH');
  let catalog;
  try{catalog=JSON.parse(String(catalogBytes));}catch(_){fail('SOURCE_CATALOG_NOT_JSON');}
  return {catalog,sha:got};
}
const allDigest=(mapping,source,batches,entries)=>sha(Buffer.from(JSON.stringify(
  {schema:SCHEMA_ALL,source_mapping_sha256:mapping,source_catalog_sha256:source,batches,entries}),'utf8'));

function assertComplete226(rows){
  need(Array.isArray(rows)&&rows.length===ORIGINAL,'ALL_226_COUNT_MISMATCH');
  const cat=new Set(),ex=new Set(),prov=new Set();
  rows.forEach((e,i)=>{
    need(e.catalog_id==='TK-'+pad(i+1)&&e.exercise_id==='TKC-'+pad(i+1),'ALL_226_INDEX_GAP_OR_REORDER');
    need(!cat.has(e.catalog_id)&&!ex.has(e.exercise_id)&&!prov.has(e.provider_id),'ALL_226_DUPLICATE_IDENTITY');
    need(e.active===false&&e.reviewed_at===null,'UNTRUSTED_ROW_IN_PRIVATE_PLAN');
    cat.add(e.catalog_id);ex.add(e.exercise_id);prov.add(e.provider_id);
  });
}

function planAll(manifest,catalogBytes,opts={}){
  const expected=opts.expectedMappingSha===undefined?EXPECTED_MAPPING_SHA256:opts.expectedMappingSha;
  const expectedSource=opts.expectedSourceSha===undefined?EXPECTED_SOURCE_CATALOG_SHA256:opts.expectedSourceSha;
  need(typeof expected==='string'&&HEX64.test(expected),'EXPECTED_SHA_INVALID');
  const {catalog,sha:sourceSha}=verifySourceCatalogBytes(catalogBytes,expectedSource);
  const plans=batchSchedule().map(b=>planBatch(manifest,catalog,b.batch,{expectedMappingSha:expected}));
  const entries=Object.freeze(plans.flatMap(p=>p.entries));
  assertComplete226(entries);
  const batches=Object.freeze(plans.map(p=>Object.freeze({...p.batch,batch_sha256:p.batch_sha256})));
  return Object.freeze({
    schema:SCHEMA_ALL,status:STATUS,
    totals:Object.freeze({original:ORIGINAL,batches:BATCH_COUNT,existing_reviewed_untouched:TOTAL-ORIGINAL,
      canonical_after_staging:TOTAL,legacy_tk_rows_untouched:EXPECTED_LEGACY_TK_ROWS}),
    source_mapping_sha256:manifest.mapping_sha256,
    source_catalog_sha256:sourceSha,
    release:Object.freeze({active:0,reviewed:0,media_grants:0,acl_changes:0,
      eligible_for_live_seed:0,release_authority:false,activation_gate:'SEPARATE_EXPLICIT_TESTED_GATE_REQUIRED'}),
    batches,
    all_sha256:allDigest(manifest.mapping_sha256,sourceSha,batches,entries),
    entries
  });
}

// Re-derive the all-plan from the manifest; any drift is tampering.
function verifyAllPlan(plan,manifest){
  need(plan&&plan.schema===SCHEMA_ALL&&plan.status===STATUS&&plan.release&&
    plan.release.release_authority===false&&plan.release.active===0&&plan.release.reviewed===0&&
    Array.isArray(plan.batches)&&Array.isArray(plan.entries),'NOT_A_DRY_RUN_ALL_PLAN');
  const entries=validatePrivateManifest(manifest);
  need(plan.source_mapping_sha256===manifest.mapping_sha256,'STALE_OR_WRONG_MAPPING_SHA');
  need(typeof plan.source_catalog_sha256==='string'&&HEX64.test(plan.source_catalog_sha256),
    'ALL_PLAN_TAMPERED');
  const rows=batchSchedule().flatMap(b=>batchEntries(entries,b.batch));
  assertComplete226(rows);
  const batches=batchSchedule().map(b=>{const r=batchEntries(entries,b.batch);
    return {number:b.batch,of:BATCH_COUNT,first_catalog_id:b.first_catalog_id,last_catalog_id:b.last_catalog_id,
      size:b.size,batch_sha256:batchDigest(b.batch,r,manifest.mapping_sha256)};});
  need(JSON.stringify(plan.entries)===JSON.stringify(rows)&&
    JSON.stringify(plan.batches)===JSON.stringify(batches)&&
    plan.all_sha256===allDigest(manifest.mapping_sha256,plan.source_catalog_sha256,batches,rows),
    'ALL_PLAN_TAMPERED');
  return {rows,entries,batches};
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

const historyFingerprint=state=>sha(JSON.stringify((state.sessions||[]).map(s=>[s.id,s.user_id,s.exercise_id,s.note])
  .sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)));
const fp356=(state)=>sha(JSON.stringify([
  state.bindings.filter(b=>num(b.catalog_id)>ORIGINAL).sort((a,b)=>a.catalog_id<b.catalog_id?-1:1),
  state.exercises.filter(r=>/^TKC-[0-9]{6}$/.test(r.id||'')&&num(r.id)>ORIGINAL).sort((a,b)=>a.id<b.id?-1:1)]));

/**
 * Pure, offline model of the one-transaction all-226 proof: applies batches
 * in the given order to a CLONE of a synthetic state, running the full
 * per-batch preflight before each. Duplicate, reordered, skipped or drifted
 * batches throw. Never writes anywhere; returns the hypothetical state.
 */
function simulateBatches(state,manifest,catalog,order,opts={}){
  need(Array.isArray(order)&&order.length>=1,'BATCH_ORDER_INVALID');
  const s=structuredClone(state);
  const before={legacy:null,history:historyFingerprint(s),existing:fp356(s)};
  for(const n of order){
    const plan=planBatch(manifest,catalog,n,opts);
    const r=assertDisposableTargetState(s,plan,manifest,opts);
    if(before.legacy===null)before.legacy=r.legacy_fingerprint;
    need(r.legacy_fingerprint===before.legacy,'LEGACY_TK_ROWS_CHANGED');
    for(const e of plan.entries){
      s.exercises.push({id:e.exercise_id,scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
      s.bindings.push({catalog_id:e.catalog_id,exercise_id:e.exercise_id,provider_id:e.provider_id,
        active:false,reviewed_at:null});
    }
  }
  need(fp356(s)===before.existing,'EXISTING_356_MODIFIED_IN_TXN');
  need(historyFingerprint(s)===before.history,'LEGACY_HISTORY_CHANGED');
  return {state:s,applied:order.slice(),legacy_fingerprint:before.legacy,history_fingerprint:before.history};
}

// Post-condition after ALL 10 batches (hypothetical staged state).
function assertAll226Staged(state,manifest){
  const entries=validatePrivateManifest(manifest);
  const tkc=state.exercises.filter(r=>/^TKC-[0-9]{6}$/.test(r.id||''));
  need(tkc.length===TOTAL&&new Set(tkc.map(r=>r.id)).size===TOTAL&&
    tkc.every(r=>r.scope==='global'&&r.created_by==null&&r.user_id==null&&r.gym_id==null),
    'CANONICAL_582_INCOMPLETE');
  need(state.bindings.length===TOTAL,'CANONICAL_582_INCOMPLETE');
  const byCat=new Map(state.bindings.map(b=>[b.catalog_id,b])),aliasById=new Map(tkc.map(r=>[r.id,r]));
  let staged=0,reviewed=0;
  entries.forEach((e,i)=>{
    const b=byCat.get(e.catalog_id),a=aliasById.get(e.exercise_id);
    need(b&&a&&b.exercise_id===e.exercise_id&&b.provider_id===e.provider_id,'ALL_226_IDENTITY_MISMATCH');
    if(i<ORIGINAL){need(b.active===false&&b.reviewed_at==null&&a.active===false,'BATCH_ROWS_NOT_INACTIVE_UNREVIEWED');staged++;}
    else{need(b.active===true&&!!b.reviewed_at,'EXISTING_356_CHANGED_OR_MISSING');reviewed++;}
  });
  return Object.freeze({staged_inactive_unreviewed:staged,existing_reviewed:reviewed,canonical:staged+reviewed});
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
  // Batch N>1 requires batches 1..N-1 already staged inactive/unreviewed.
  const prior=entries.slice(0,(n-1)*BATCH_SIZE);
  const priorSql=prior.length?`insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
${prior.map(e=>`('${e.exercise_id}','SYNTHETIC PRIOR STAGED ALIAS','system','strength','global',false,NULL,NULL)`).join(',\n')};
insert into public.movekit_catalog_fk_bindings(catalog_id,exercise_id,provider_id,active,reviewed_at) values
${prior.map(e=>`('${e.catalog_id}','${e.exercise_id}','${e.provider_id}',false,NULL)`).join(',\n')};
`:'';
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
${priorSql}create temp table tk614_harness_before as select
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

// ---------------------------------------------------------------------------
// ALL 226 in ONE transaction: 10 ordered batch blocks, ROLLBACK-only.
const FP_LEGACY=`(SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
   WHERE e.id ~ '^TK-[0-9]{6}$')`;
const FP_B356=`(SELECT md5(coalesce(string_agg(b::text,'|' ORDER BY b.catalog_id),'')) FROM public.movekit_catalog_fk_bindings b
   WHERE b.catalog_id IN ${series(ORIGINAL+1,TOTAL,'TK-')})`;
const FP_A356=`(SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
   WHERE e.id IN ${series(ORIGINAL+1,TOTAL,'TKC-')})`;
const FP_SESSIONS=`(SELECT md5(coalesce(string_agg(s::text,'|' ORDER BY s.id),'')) FROM public.sessions s)`;
const PROBE_UID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BLOCK_BEGIN=n=>`-- >>> TK614 ALL226 BATCH ${String(n).padStart(2,'0')}/${BATCH_COUNT} BEGIN`;
const BLOCK_END=n=>`-- <<< TK614 ALL226 BATCH ${String(n).padStart(2,'0')}/${BATCH_COUNT} END`;

function guardAllSql(sql){
  guardSql(sql);
  if((sql.match(/^BEGIN;$/gm)||[]).length!==1||(sql.match(/^ROLLBACK;$/gm)||[]).length!==1)
    fail('PREVIEW_MUST_NEVER_COMMIT_OR_CHANGE_ACL');
  return sql;
}

function renderBatchBlock(b){
  const {number:n,size}=b,first=num(b.first_catalog_id),last=num(b.last_catalog_id);
  return `${BLOCK_BEGIN(n)} ${b.first_catalog_id}..${b.last_catalog_id} (${size})
DO $tk614$
BEGIN
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(first,last,'TK-')})
   OR EXISTS(SELECT 1 FROM public.exercises WHERE id IN ${series(first,last,'TKC-')})
 THEN RAISE EXCEPTION 'BATCH_ALREADY_PRESENT'; END IF;
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')})<>${first-1}
   OR (SELECT count(*) FROM public.exercises WHERE id IN ${series(1,ORIGINAL,'TKC-')})<>${first-1}
 THEN RAISE EXCEPTION 'BATCH_GAP_OR_OUT_OF_ORDER'; END IF;
END
$tk614$;
INSERT INTO public.exercises
(id,name,category,type,scope,active,created_by,user_id,gym_id)
SELECT exercise_id,'TK614 catalog FK reference '||substring(exercise_id from 5),'system','strength','global',false,NULL,NULL,NULL
FROM tk614_plan_226 WHERE batch=${n} ORDER BY n;
INSERT INTO public.movekit_catalog_fk_bindings
(catalog_id,exercise_id,provider_id,active,reviewed_at)
SELECT catalog_id,exercise_id,provider_id,false,NULL
FROM tk614_plan_226 WHERE batch=${n} ORDER BY n;
DO $tk614$
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings b
       JOIN tk614_plan_226 p ON p.catalog_id=b.catalog_id AND p.exercise_id=b.exercise_id
        AND p.provider_id=b.provider_id AND p.batch=${n}
       JOIN public.exercises e ON e.id=b.exercise_id AND e.scope='global' AND e.active=false
        AND e.created_by IS NULL AND e.user_id IS NULL AND e.gym_id IS NULL
      WHERE b.active=false AND b.reviewed_at IS NULL AND b.source_provider='movekit')<>${size}
   OR (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')})<>${last}
 THEN RAISE EXCEPTION 'BATCH_ROWS_NOT_INACTIVE_UNREVIEWED'; END IF;
END
$tk614$;
${BLOCK_END(n)}
`;
}

function renderAllRollbackSql(plan,manifest){
  const {rows,entries,batches}=verifyAllPlan(plan,manifest);
  const reviewed=entries.slice(ORIGINAL).map(e=>
    `  ('${e.catalog_id}','${e.exercise_id}','${e.provider_id}')`).join(',\n');
  const planRows=rows.map((e,i)=>
    `  (${i+1},${batchOf(e.catalog_id)},'${e.catalog_id}','${e.exercise_id}','${e.provider_id}')`).join(',\n');
  const sql=`-- TK614 #603: PRIVATE ROLLBACK-ONLY ALL-226 proof: ${BATCH_COUNT} ordered batches in ONE transaction.
-- ONLY for a disposable, offline sandbox PostgreSQL that carries the marker table.
-- NEVER run on Supabase production/staging. Not a migration. No release authority.
-- Source mapping digest: ${plan.source_mapping_sha256}
-- Source catalog digest: ${plan.source_catalog_sha256}
-- All-226 plan digest: ${plan.all_sha256}
-- Rows stay active=false, reviewed_at=NULL. No media, no ACL/RLS. Staging is NOT activation.
\\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE tk614_expected_356(catalog_id text, exercise_id text, provider_id text);
INSERT INTO tk614_expected_356 VALUES
${reviewed};
CREATE TEMP TABLE tk614_plan_226(n int primary key, batch int not null,
  catalog_id text not null unique, exercise_id text not null unique, provider_id text not null unique);
INSERT INTO tk614_plan_226 VALUES
${planRows};
DO $tk614$
BEGIN
 IF to_regclass('public.tk614_disposable_sandbox_marker') IS NULL
 THEN RAISE EXCEPTION 'NOT_A_DISPOSABLE_SANDBOX'; END IF;
 IF to_regclass('public.movekit_catalog_fk_bindings') IS NULL OR to_regclass('public.sessions') IS NULL
   OR to_regprocedure('public.tk504_resolve_catalog_fk(text,text)') IS NULL
 THEN RAISE EXCEPTION 'STAGED_ADMIN_BINDING_SCHEMA_REQUIRED'; END IF;
 IF (SELECT count(*) FROM tk614_plan_226)<>${ORIGINAL}
   OR (SELECT count(DISTINCT batch) FROM tk614_plan_226)<>${BATCH_COUNT}
   OR EXISTS(SELECT 1 FROM tk614_plan_226 WHERE catalog_id<>'TK-'||lpad(n::text,6,'0')
      OR exercise_id<>'TKC-'||lpad(n::text,6,'0') OR batch<>((n-1)/${BATCH_SIZE})+1)
   OR EXISTS(SELECT 1 FROM tk614_plan_226 p JOIN tk614_expected_356 x ON x.provider_id=p.provider_id)
 THEN RAISE EXCEPTION 'ALL_226_PLAN_TABLE_INVALID'; END IF;
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
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')})
 THEN RAISE EXCEPTION 'BATCH_ALREADY_PRESENT'; END IF;
 IF EXISTS(SELECT 1 FROM public.exercises WHERE id IN ${series(1,ORIGINAL,'TKC-')})
 THEN RAISE EXCEPTION 'ORIGINAL_ALIAS_COLLISION'; END IF;
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings b JOIN tk614_plan_226 p ON p.provider_id=b.provider_id)
 THEN RAISE EXCEPTION 'PROVIDER_ALREADY_BOUND'; END IF;
 IF (SELECT count(*) FROM public.exercises WHERE id ~ '^TK-[0-9]{6}$')<>${EXPECTED_LEGACY_TK_ROWS}
 THEN RAISE EXCEPTION 'LEGACY_TK_ROW_COUNT_CHANGED'; END IF;
END
$tk614$;
CREATE TEMP TABLE tk614_before AS SELECT
 ${FP_LEGACY} AS legacy_fp,
 ${FP_SESSIONS} AS sessions_fp,
 ${FP_B356} AS bindings_356_fp,
 ${FP_A356} AS aliases_356_fp;
${batches.map(renderBatchBlock).join('')}DO $tk614$
DECLARE r record;
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings b
       JOIN tk614_plan_226 p ON p.catalog_id=b.catalog_id AND p.exercise_id=b.exercise_id AND p.provider_id=b.provider_id
       JOIN public.exercises e ON e.id=b.exercise_id AND e.scope='global' AND e.active=false
        AND e.created_by IS NULL AND e.user_id IS NULL AND e.gym_id IS NULL
      WHERE b.active=false AND b.reviewed_at IS NULL)<>${ORIGINAL}
   OR EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')}
      AND (active OR reviewed_at IS NOT NULL))
 THEN RAISE EXCEPTION 'ALL_226_NOT_INACTIVE_UNREVIEWED'; END IF;
 IF (SELECT count(*) FROM public.exercises WHERE id IN ${series(1,TOTAL,'TKC-')})<>${TOTAL}
   OR (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,TOTAL,'TK-')})<>${TOTAL}
   OR (SELECT count(*) FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$')<>${TOTAL}
 THEN RAISE EXCEPTION 'CANONICAL_582_INCOMPLETE'; END IF;
 IF (SELECT bindings_356_fp FROM tk614_before) IS DISTINCT FROM ${FP_B356}
   OR (SELECT aliases_356_fp FROM tk614_before) IS DISTINCT FROM ${FP_A356}
 THEN RAISE EXCEPTION 'EXISTING_356_MODIFIED_IN_TXN'; END IF;
 IF (SELECT legacy_fp FROM tk614_before) IS DISTINCT FROM ${FP_LEGACY}
 THEN RAISE EXCEPTION 'LEGACY_TK_ROWS_CHANGED'; END IF;
 IF (SELECT sessions_fp FROM tk614_before) IS DISTINCT FROM ${FP_SESSIONS}
 THEN RAISE EXCEPTION 'LEGACY_HISTORY_CHANGED'; END IF;
 -- Resolver: an authenticated synthetic caller gets NOTHING for the 226
 -- staged rows and still exactly the 356 reviewed ones.
 PERFORM set_config('request.jwt.claim.sub','${PROBE_UID}',true);
 IF (SELECT count(*) FROM tk614_plan_226 p
      WHERE public.tk504_resolve_catalog_fk(p.catalog_id,p.provider_id) IS NOT NULL)<>0
 THEN RAISE EXCEPTION 'UNREVIEWED_226_RESOLVABLE'; END IF;
 IF (SELECT count(*) FROM tk614_expected_356 x
      WHERE public.tk504_resolve_catalog_fk(x.catalog_id,x.provider_id)=x.exercise_id)<>356
 THEN RAISE EXCEPTION 'EXISTING_356_RESOLVER_CHANGED'; END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 -- Session FK guard: no typed session may reference a staged (inactive) alias.
 -- Each probe is its own subtransaction; acceptance raises P0001 and aborts.
 FOR r IN SELECT exercise_id FROM tk614_plan_226 ORDER BY n LOOP
  BEGIN
   INSERT INTO public.sessions(id,user_id,exercise_id)
   VALUES (md5('tk614-probe-'||r.exercise_id)::uuid,'${PROBE_UID}'::uuid,r.exercise_id);
   RAISE EXCEPTION 'UNRELEASED_TYPED_SESSION_ACCEPTED %',r.exercise_id;
  EXCEPTION WHEN check_violation THEN NULL;
  END;
 END LOOP;
 IF (SELECT sessions_fp FROM tk614_before) IS DISTINCT FROM ${FP_SESSIONS}
 THEN RAISE EXCEPTION 'LEGACY_HISTORY_CHANGED'; END IF;
END
$tk614$;
SELECT 'TK614_ALL226_ROLLBACK_PROOF_PASS_${ORIGINAL}_INACTIVE_UNREVIEWED_${TOTAL}_CANONICAL_${BATCH_COUNT}_BATCHES' AS result;
ROLLBACK;
`;
  return guardAllSql(sql);
}

/**
 * TEST-ONLY adversarial variants of the generated all-226 SQL, used to prove
 * the in-database batch guards (duplicate block / swapped order). The output
 * still ends in ROLLBACK and still requires the sandbox marker.
 */
function deriveAdversarialVariant(sql,kind){
  const block=n=>{const a=sql.indexOf(BLOCK_BEGIN(n)),z=sql.indexOf(BLOCK_END(n));
    need(a>=0&&z>a,'VARIANT_BLOCK_MISSING');return {a,z:z+BLOCK_END(n).length+1,text:sql.slice(a,z+BLOCK_END(n).length+1)};};
  const b2=block(2),b3=block(3);
  let out;
  if(kind==='duplicate_batch')out=sql.slice(0,b2.z)+b2.text+sql.slice(b2.z);
  else if(kind==='reorder_batches')out=sql.slice(0,b2.a)+b3.text+b2.text+sql.slice(b3.z);
  else if(kind==='skip_batch')out=sql.slice(0,b2.a)+sql.slice(b2.z);
  else fail('UNKNOWN_VARIANT');
  return guardAllSql(out);
}

// Expected outcome per disposable-DB scenario (stdout marker or error text).
const ALL_SCENARIOS=Object.freeze({
  pass:{expect:'TK614_SANDBOX_ALL226_ROLLBACK_VERIFIED_356_AND_23_AND_HISTORY_UNCHANGED'},
  retry:{expect:'TK614_SANDBOX_ALL226_ROLLBACK_VERIFIED_356_AND_23_AND_HISTORY_UNCHANGED'},
  no_marker:{error:'NOT_A_DISPOSABLE_SANDBOX'},
  prestaged_batch1:{error:'BATCH_ALREADY_PRESENT'},
  alias_collision:{error:'ORIGINAL_ALIAS_COLLISION'},
  personal_shadow:{error:'Catalog FK aliases must be unowned global references'},
  provider_drift_356:{error:'EXISTING_356_CHANGED_OR_MISSING'},
  existing_356_missing:{error:'EXISTING_356_CHANGED_OR_MISSING'},
  existing_356_unreviewed:{error:'EXISTING_356_CHANGED_OR_MISSING'},
  legacy_drift:{error:'LEGACY_TK_ROW_COUNT_CHANGED'},
  duplicate_batch:{error:'BATCH_ALREADY_PRESENT',variant:'duplicate_batch'},
  reorder_batches:{error:'BATCH_GAP_OR_OUT_OF_ORDER',variant:'reorder_batches'},
  skip_batch:{error:'BATCH_GAP_OR_OUT_OF_ORDER',variant:'skip_batch'}
});

// Synthetic disposable harness for the all-226 proof. One harness per scenario.
function renderAllSandboxHarness(plan,manifest,scenario='pass'){
  const {entries}=verifyAllPlan(plan,manifest);
  const sc=ALL_SCENARIOS[scenario];need(sc,'UNKNOWN_SCENARIO');
  const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const legacyGlobal=[1,5,38,100,150,201,226],
    legacyPersonal=[2,3,4,10,25,26,50,60,63,70,80,90,120,188,200,225];
  const legacy=[...legacyGlobal.map(x=>`('TK-${pad(x)}','SYNTHETIC LEGACY GLOBAL','strength','strength','global',true,NULL,NULL)`),
    ...legacyPersonal.map((x,i)=>{const u=i%2?UB:UA;
      return `('TK-${pad(x)}','SYNTHETIC LEGACY PERSONAL','strength','strength','personal',true,'${u}','${u}')`;})];
  if(scenario==='legacy_drift')legacy.push(`('TK-000227','SYNTHETIC EXTRA LEGACY','strength','strength','personal',true,'${UA}','${UA}')`);
  let reviewed=entries.slice(ORIGINAL);
  if(scenario==='existing_356_missing')reviewed=reviewed.slice(0,-1);
  const al=reviewed.map(e=>
    `('${e.exercise_id}','SYNTHETIC REVIEWED ALIAS','system','strength','global',false,NULL,NULL)`).join(',\n');
  const bd=reviewed.map((e,i)=>{
    const prov=scenario==='provider_drift_356'&&i===10?e.provider_id+'-drift':e.provider_id;
    const rev=scenario==='existing_356_unreviewed'&&i===20?'false,NULL':`true,'2026-11-07 00:00:00+00'`;
    return `('${e.catalog_id}','${e.exercise_id}','${prov}',${rev})`;}).join(',\n');
  const extra=[];
  if(scenario==='prestaged_batch1'){
    const b1=entries.slice(0,BATCH_SIZE);
    extra.push(`insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
${b1.map(e=>`('${e.exercise_id}','SYNTHETIC PRESTAGED','system','strength','global',false,NULL,NULL)`).join(',\n')};
insert into public.movekit_catalog_fk_bindings(catalog_id,exercise_id,provider_id,active,reviewed_at) values
${b1.map(e=>`('${e.catalog_id}','${e.exercise_id}','${e.provider_id}',false,NULL)`).join(',\n')};`);
  }
  if(scenario==='alias_collision')extra.push(`insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
('TKC-000100','SYNTHETIC FOREIGN GLOBAL ALIAS','system','strength','global',false,NULL,NULL);`);
  if(scenario==='personal_shadow')extra.push(`insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
('TKC-000063','SYNTHETIC FORGED PERSONAL SHADOW','strength','strength','personal',true,'${UA}','${UA}');`);
  const proof=sc.variant?'/tmp/tk614-all226-variant-'+sc.variant+'.sql':'/tmp/tk614-all226-rollback-only.sql';
  const runs=scenario==='retry'?2:1;
  const sql=`-- TK614 #603: PRIVATE SYNTHETIC SANDBOX HARNESS, ALL-226 scenario ${scenario}. Disposable --network none Docker only.
-- Requires /tmp/tk504-typed-fk-stage.sql and ${proof}.
\\set ON_ERROR_STOP on
create schema auth;
-- Roles are cluster-wide; every scenario runs in its own fresh database.
DO $roles$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $roles$;
create function auth.uid() returns uuid language sql stable as
  'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
create table public.exercises(id text primary key,name text not null,category text not null,
  type text not null,scope text not null default 'personal' check (scope in ('personal','gym','global')),
  active boolean default true,created_by uuid,user_id uuid,gym_id text);
create table public.sessions(id uuid primary key,user_id uuid not null,
  exercise_id text references public.exercises(id),note text);
${scenario==='no_marker'?'-- scenario no_marker: the disposable marker is deliberately absent\n':
`create table public.tk614_disposable_sandbox_marker(created_at timestamptz default now());
insert into public.tk614_disposable_sandbox_marker default values;
`}insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
${legacy.join(',\n')};
-- Legacy history on TK-shaped rows for both synthetic owners (never MoveKit evidence).
insert into public.sessions(id,user_id,exercise_id,note) values
('aaaaaaaa-0000-4000-8000-000000000063','${UA}','TK-000063','synthetic legacy history A'),
('bbbbbbbb-0000-4000-8000-000000000188','${UB}','TK-000188','synthetic legacy history B'),
('aaaaaaaa-0000-4000-8000-000000000001','${UA}','TK-000001','synthetic legacy global history A'),
('bbbbbbbb-0000-4000-8000-000000000000','${UB}',NULL,'synthetic unrelated session B');
\\i /tmp/tk504-typed-fk-stage.sql
insert into public.exercises(id,name,category,type,scope,active,created_by,user_id) values
${al};
insert into public.movekit_catalog_fk_bindings(catalog_id,exercise_id,provider_id,active,reviewed_at) values
${bd};
-- Typed history on one of the existing reviewed 356 (allowed: binding active).
insert into public.sessions(id,user_id,exercise_id,note) values
('aaaaaaaa-0000-4000-8000-000000000300','${UA}','TKC-000300','synthetic typed history A');
${extra.join('\n')}${extra.length?'\n':''}create temp table tk614_harness_before as select
 (select md5(string_agg(e::text,'|' order by e.id)) from public.exercises e) ex_fp,
 (select md5(string_agg(b::text,'|' order by b.catalog_id)) from public.movekit_catalog_fk_bindings b) b_fp,
 (select md5(string_agg(s::text,'|' order by s.id)) from public.sessions s) s_fp;
${Array.from({length:runs},()=>`\\i ${proof}`).join('\n')}
DO $qa$
BEGIN
 IF (SELECT ex_fp FROM tk614_harness_before) IS DISTINCT FROM
    (SELECT md5(string_agg(e::text,'|' order by e.id)) FROM public.exercises e)
   OR (SELECT b_fp FROM tk614_harness_before) IS DISTINCT FROM
    (SELECT md5(string_agg(b::text,'|' order by b.catalog_id)) FROM public.movekit_catalog_fk_bindings b)
   OR (SELECT s_fp FROM tk614_harness_before) IS DISTINCT FROM
    (SELECT md5(string_agg(s::text,'|' order by s.id)) FROM public.sessions s)
 THEN RAISE EXCEPTION 'HARNESS_STATE_NOT_RESTORED_AFTER_ROLLBACK'; END IF;
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE substring(catalog_id from 4)::int<=${ORIGINAL})
   OR EXISTS(SELECT 1 FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$' AND substring(id from 5)::int<=${ORIGINAL})
 THEN RAISE EXCEPTION 'HARNESS_226_LEFT_BEHIND_AFTER_ROLLBACK'; END IF;
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE active AND reviewed_at IS NOT NULL)<>356
   OR (SELECT count(*) FROM public.exercises WHERE id ~ '^TK-[0-9]{6}$')<>${EXPECTED_LEGACY_TK_ROWS}
   OR (SELECT count(*) FROM public.sessions)<>5
 THEN RAISE EXCEPTION 'HARNESS_BASELINE_CHANGED'; END IF;
END $qa$;
select 'TK614_SANDBOX_ALL226_ROLLBACK_VERIFIED_356_AND_23_AND_HISTORY_UNCHANGED' as result;
`;
  if(/\b(COMMIT|GRANT|REVOKE|POLICY)\b/i.test(sql))fail('HARNESS_MUST_NOT_COMMIT_OR_GRANT');
  return sql;
}

const USAGE='Usage: --manifest ABSOLUTE_PRIVATE_582_MANIFEST [--batch 1..10|all] '+
  '[--expected-mapping-sha HEX64] [--expected-source-sha HEX64] [--out ABS] [--sql-out ABS] [--sandbox-out ABS]';
const FLAGS=['--manifest','--batch','--expected-mapping-sha','--expected-source-sha','--out','--sql-out','--sandbox-out'];
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
  const rawBatch=o['--batch']===undefined?'1':o['--batch'];
  need(rawBatch==='all'||/^(?:[1-9]|10)$/.test(rawBatch),'BATCH_NOT_IN_PREVIEW_SCOPE');
  const batch=rawBatch==='all'?'all':Number(rawBatch);
  need(batch==='all'||PREVIEW_BATCHES.includes(batch),'BATCH_NOT_IN_PREVIEW_SCOPE');
  return {manifest:path.resolve(o['--manifest']),batch,
    expectedMappingSha:o['--expected-mapping-sha'],expectedSourceSha:o['--expected-source-sha'],
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
  const catalogBytes=fs.readFileSync(path.join(ROOT,'exercise-catalog.json'));
  const expectedSource=o.expectedSourceSha===undefined?EXPECTED_SOURCE_CATALOG_SHA256:o.expectedSourceSha;
  // Source catalog bytes are pinned for EVERY mode, before planning.
  const {catalog,sha:sourceSha}=verifySourceCatalogBytes(catalogBytes,expectedSource);
  if(o.batch==='all')return runAll(o,manifest,bytes,catalogBytes,expectedSource,outs);
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
    source_catalog_sha256:sourceSha,
    sql_sha256:sql?sha(Buffer.from(sql,'utf8')):null,
    actual_database_writes:false,private_plan_created:!!o.out,
    private_sql_created:!!o.sqlOut,private_sandbox_created:!!o.sandboxOut});
  process.stdout.write(JSON.stringify(report)+'\n');
  return report;
}
function runAll(o,manifest,bytes,catalogBytes,expectedSource,outs){
  const plan=planAll(manifest,catalogBytes,{expectedMappingSha:o.expectedMappingSha,expectedSourceSha:expectedSource});
  const sql=o.sqlOut||o.sandboxOut?renderAllRollbackSql(plan,manifest):null;
  const harness=o.sandboxOut?renderAllSandboxHarness(plan,manifest,'pass'):null;
  if(o.out)writeExclusive(o.out,JSON.stringify({...plan,
    private_manifest_sha256:sha(bytes),schedule:batchSchedule()},null,2)+'\n');
  if(o.sqlOut)writeExclusive(o.sqlOut,sql);
  if(o.sandboxOut)writeExclusive(o.sandboxOut,harness);
  const report=Object.freeze({status:plan.status,batch:'all',of:BATCH_COUNT,batches:BATCH_COUNT,
    first_catalog_id:'TK-000001',last_catalog_id:'TK-'+pad(ORIGINAL),size:ORIGINAL,
    active:0,reviewed:0,existing_reviewed_untouched:TOTAL-ORIGINAL,canonical_after_staging:TOTAL,
    mapping_sha256:plan.source_mapping_sha256,source_catalog_sha256:plan.source_catalog_sha256,
    all_sha256:plan.all_sha256,batch_sha256s:plan.batches.map(b=>b.batch_sha256),
    private_manifest_sha256:sha(bytes),sql_sha256:sql?sha(Buffer.from(sql,'utf8')):null,
    actual_database_writes:false,private_plan_created:!!o.out,
    private_sql_created:!!o.sqlOut,private_sandbox_created:!!o.sandboxOut,outputs:outs.length});
  process.stdout.write(JSON.stringify(report)+'\n');
  return report;
}
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(e){process.stderr.write('TK614_BATCH25_PREFLIGHT_BLOCKED: '+(e.code||e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({EXPECTED_MAPPING_SHA256,EXPECTED_SOURCE_CATALOG_SHA256,BATCH_SIZE,BATCH_COUNT,
  PREVIEW_BATCHES,ALL_SCENARIOS,
  sourceCatalogSha,batchRange,batchSchedule,batchOf,planBatch,verifyBatchPlan,assertDisposableTargetState,
  planAll,verifyAllPlan,simulateBatches,assertAll226Staged,
  renderRollbackSql,renderSandboxHarness,renderAllRollbackSql,renderAllSandboxHarness,deriveAdversarialVariant,
  parseArgs,run});
