'use strict';
/**
 * TK504/#603: produce ONLY a PRIVATE, ROLLBACK-ONLY PostgreSQL proof.
 * Run exclusively in a disposable offline Docker/Postgres container.
 * NOT a migration, not a production seed, no media grants / release.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {safelyOutsideRepo}=require('./tk504_prepare_private_fk_manifest.cjs');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
function validatePrivateManifest(plan){
  function reject(ok,code){if(!ok)throw Error(code);}
  reject(plan?.schema==='tk504-private-typed-fk-preflight/1.0'&&
    plan.status==='DRY_RUN_NO_RELEASE_AUTHORITY'&&
    plan.counts?.catalog===582&&plan.counts.existing===226&&
    plan.counts.content_approved_unpublished===356&&
    plan.counts.eligible_for_live_seed===0&&
    plan.counts.active===0&&plan.counts.media_grants_created===0&&
    plan.owner_content_decision==='TK504-20261105-OWNER-BATCHES-01-15',
    'NOT_AN_UNRELEASED_582_PREFLIGHT');
  reject(Array.isArray(plan.entries)&&plan.entries.length===582,
    'WRONG_MANIFEST_ENTRY_COUNT');
  reject(/^[a-f0-9]{64}$/.test(plan.private_stage_sha256||'')&&
    plan.source_registry_sha256&&
    Object.values(plan.source_registry_sha256).length===3&&
    Object.values(plan.source_registry_sha256).every(x=>/^[a-f0-9]{64}$/.test(x)),
    'UNVERIFIED_PRIVATE_SOURCE_DIGESTS');
  const seen=new Set();
  for(let i=0;i<plan.entries.length;i++){
    const n=i+1,e=plan.entries[i],suffix=String(n).padStart(6,'0');
    reject(e&&e.catalog_id==='TK-'+suffix&&
      e.exercise_id==='TKC-'+suffix&&
      typeof e.provider_id==='string'&&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.provider_id)&&
      !seen.has(e.provider_id)&&e.active===false&&
      e.eligibility===(n<=226
        ?'existing-catalog-not-authorized-for-new-binding'
        :'owner-content-approved-not-published'),
      'UNTRUSTED_ROW_IN_PRIVATE_PLAN');
    seen.add(e.provider_id);
  }
  reject(sha(Buffer.from(JSON.stringify(plan.entries),'utf8'))===plan.mapping_sha256,
    'PROVISIONING_MAPPING_DIGEST_MISMATCH');
  return plan.entries;
}
function render(plan){
  const items=validatePrivateManifest(plan);
  const aliases=items.map((e,i)=>
    `('${e.exercise_id}','TK504 catalog FK reference ${String(i+1).padStart(6,'0')}','system','strength','global',false,NULL,NULL,NULL)`).join(',\n');
  const bindings=items.map(e=>
    `('${e.catalog_id}','${e.exercise_id}','${e.provider_id}',false)`).join(',\n');
  const sql=`-- TK504 #603: PRIVATE ROLLBACK-ONLY PROOF in disposable, offline PostgreSQL.
-- NEVER run on real Supabase or any shared environment.
-- THIS FILE IS NOT THE APPROVED 582 CATALOG PUBLISHER.
-- Source mapping digest: ${plan.mapping_sha256}
-- All 582 source IDs are technical identities. No media licensing grants.
\\set ON_ERROR_STOP on
BEGIN;
DO $tk504$
BEGIN
 IF to_regclass('public.movekit_catalog_fk_bindings') IS NULL
 THEN RAISE EXCEPTION 'STAGED_ADMIN_BINDING_SCHEMA_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$')
 THEN RAISE EXCEPTION 'EXISTING_RESERVED_FK_COLLISION'; END IF;
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings)
 THEN RAISE EXCEPTION 'EXISTING_TYPED_BINDINGS_PRESENT'; END IF;
END
$tk504$;
INSERT INTO public.exercises
(id,name,category,type,scope,active,created_by,user_id,gym_id)
VALUES
${aliases};
INSERT INTO public.movekit_catalog_fk_bindings
(catalog_id,exercise_id,provider_id,active)
VALUES
${bindings};
DO $tk504$
BEGIN
 IF (SELECT count(*) FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$'
     AND scope='global' AND created_by IS NULL AND user_id IS NULL AND gym_id IS NULL AND active=false)<>582
 THEN RAISE EXCEPTION 'ALL_ALIASES_MUST_REMAIN_INACTIVE_GLOBAL'; END IF;
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE active=false)<>582
 THEN RAISE EXCEPTION 'BINDINGS_MUST_BE_582_AND_INACTIVE'; END IF;
END
$tk504$;
SELECT 'TK504_PRIVATE_DOCKER_PROOF_PASS_582_INACTIVE' AS result;
ROLLBACK;
`;
  if(/\bCOMMIT\b/i.test(sql)||!sql.endsWith('ROLLBACK;\n'))
    throw Error('PREVIEW_MUST_NEVER_COMMIT');
  return sql;
}
function run(argv){
  if(argv.length!==4||argv[0]!=='--manifest'||argv[2]!=='--out'||
     !path.isAbsolute(argv[1])||!path.isAbsolute(argv[3]))
    throw Error('Usage: --manifest ABSOLUTE_PRIVATE_PLAN --out ABSOLUTE_PRIVATE_SQL_PATH');
  const [input,dest]=[path.resolve(argv[1]),path.resolve(argv[3])];
  if(!safelyOutsideRepo(input)||!safelyOutsideRepo(dest))
    throw Error('PRIVATE_PLAN_OR_SQL_INSIDE_REPOSITORY');
  const plan=JSON.parse(fs.readFileSync(input,'utf8'));
  const sql=render(plan);
  const fd=fs.openSync(dest,'wx',0o600);
  try{fs.writeFileSync(fd,sql,'utf8');}finally{fs.closeSync(fd);}
  const report={status:'DRY_RUN_ROLLBACK_ONLY',rows:582,source_mapping_sha256:plan.mapping_sha256,
    sql_sha256:sha(Buffer.from(sql,'utf8')),actual_database_writes:false,private_sql_created:true};
  process.stdout.write(JSON.stringify(report)+'\n');
  return report;
}
if(require.main===module){
 try{run(process.argv.slice(2));}
 catch(e){process.stderr.write('TK504_PRIVATE_SQL_PREVIEW_BLOCKED: '+e.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({render,validatePrivateManifest,run});
