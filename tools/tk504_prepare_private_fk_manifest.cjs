'use strict';
/**
 * TK504/#603 -- read-only private MoveKit FK provisioning preflight.
 * NOT a database migration, publisher, grant creator or permission check.
 * Input: licensed private reviewed-stage JSON (never commit its contents).
 * Optional output is private identifier-only manifest, NOT SQL.
 * Usage:
 *   node tools/tk504_prepare_private_fk_manifest.cjs --stage ABSOLUTE_PATH
 *   node ... --stage ABSOLUTE_PATH --out ABSOLUTE_PRIVATE_DEST
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const canonical=id=>/^TK-[0-9]{6}$/.test(id||'')&&Number(id.slice(3))>=1&&Number(id.slice(3))<=582;
const slug=id=>typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
const exactId=n=>'TK-'+String(n).padStart(6,'0');
const exactFk=n=>'TKC-'+String(n).padStart(6,'0');
function verify({stage,catalog,golden,posters,approval,release}){
  function requireCondition(ok,code){if(!ok){const e=new Error(code);e.code=code;throw e;}}
  requireCondition(stage&&stage._status==='PRIVATE_REVIEW_NOT_RELEASED'&&
    stage._base_count===226&&stage._new_count===356&&stage.count===582&&
    stage._approved_for_import===0&&stage._media_grants_created===0&&
    stage._app_activated===false&&stage._history_updates===0&&
    stage._personal_exercise_updates===0,'PRIVATE_STAGE_MUST_REMAIN_UNRELEASED');
  requireCondition(Array.isArray(stage.catalog)&&stage.catalog.length===582,
    'PRIVATE_STAGE_NOT_582');
  requireCondition(catalog&&catalog.count===226&&Array.isArray(catalog.catalog)&&
    catalog.catalog.length===226,'CANONICAL_PUBLISHED_BASELINE_CHANGED');
  requireCondition(golden&&golden.items?.length===582&&posters&&
    posters.items?.length===582,'GOLDEN_MEDIA_INVENTORY_INCOMPLETE');
  requireCondition(approval?.decision_id==='TK504-20261105-OWNER-BATCHES-01-15'&&
    approval?.scope?.content_approved_count===356&&
    approval?.scope?.first_catalog_id==='TK-000227'&&
    approval?.scope?.last_catalog_id==='TK-000582'&&
    approval?.scope?.batch_count===15&&
    approval?.status==='OWNER_EXPLICIT_BULK_CONTENT_APPROVAL'&&
    approval?.access_release?.batch_356_release_authorized===false&&
    Object.values(approval.access_release).every(x=>x===false),
    'CONTENT_APPROVAL_IS_NOT_RELEASE_APPROVAL');
  requireCondition(release?.status==='BLOCKED_NOT_REVIEWED'&&
    Array.isArray(release.entries)&&release.entries.length===0,
    'RELEASE_GATES_MUST_STAY_BLOCKED');
  const existing=new Map(catalog.catalog.map(x=>[x.catalog_id,x]));
  requireCondition(existing.size===226,'DUPLICATE_EXISTING_CATALOG_ID');
  const videoBy=new Map(golden.items.map(x=>[x.catalog_id,x]));
  const posterBy=new Map(posters.items.map(x=>[x.catalog_id,x]));
  requireCondition(videoBy.size===582&&posterBy.size===582,'DUPLICATE_MEDIA_INVENTORY');
  const providerIds=new Set(),entries=[];
  for(let i=0;i<582;i++){
    const n=i+1,record=stage.catalog[i],id=exactId(n);
    const media=videoBy.get(id),poster=posterBy.get(id);
    requireCondition(record&&record.catalog_id===id&&canonical(id)&&
      record.source?.provider==='movekit'&&slug(record.source.provider_id),
      'CATALOG_ID_OR_PROVIDER_INVALID');
    const p=record.source.provider_id;
    requireCondition(!providerIds.has(p),'DUPLICATE_PROVIDER_ID');
    providerIds.add(p);
    requireCondition(media&&media.provider_id===p&&
      media.video?.path==='movekit/v2/video/'+p+'.mp4'&&
      poster&&poster.provider_id===p&&
      poster.path==='movekit/v2/poster-optimized/'+p+'.webp'&&
      typeof poster.sha256==='string'&&/^[0-9a-f]{64}$/.test(poster.sha256),
      'MEDIA_IDENTITY_OR_PATH_MISMATCH');
    if(n<=226){
      const old=existing.get(id);
      requireCondition(old&&old.source?.provider==='movekit'&&
        old.source.provider_id===p&&media.status==='existing-id'&&
        !Object.prototype.hasOwnProperty.call(record,'_review'),
        'PUBLISHED_SOURCE_ID_MUTATED');
    }else{
      requireCondition(!existing.has(id)&&media.status==='proposed-new'&&
        record._review?.status==='NOT_PUBLISHED'&&
        record._review?.confirmed_by_authenticated_reviewer===false&&
        record._review?.media_entitlement_status==='NOT_VERIFIED'&&
        record._review?.supplier_metadata_modified===false,
        'NEW_SOURCE_NOT_VERIFIABLY_UNPUBLISHED');
    }
    entries.push(Object.freeze({
      catalog_id:id,provider_id:p,exercise_id:exactFk(n),
      eligibility:n<=226?'existing-catalog-not-authorized-for-new-binding':
        'owner-content-approved-not-published',
      active:false
    }));
  }
  requireCondition(providerIds.size===582,'NOT_582_UNIQUE_PROVIDERS');
  const fingerprint=sha(Buffer.from(JSON.stringify(entries),'utf8'));
  // JSON-canonicalized bytes avoid platform CRLF differences while pinning
  // the three exact independent approvals/inventory registries for audit.
  const inputs=Object.freeze({
    golden_inventory_sha256:sha(Buffer.from(JSON.stringify(golden),'utf8')),
    poster_registry_sha256:sha(Buffer.from(JSON.stringify(posters),'utf8')),
    content_approval_sha256:sha(Buffer.from(JSON.stringify(approval),'utf8'))
  });
  return Object.freeze({
    schema:'tk504-private-typed-fk-preflight/1.0',
    status:'DRY_RUN_NO_RELEASE_AUTHORITY',
    counts:Object.freeze({catalog:582,existing:226,content_approved_unpublished:356,
      eligible_for_live_seed:0,active:0,media_grants_created:0}),
    owner_content_decision:approval.decision_id,
    mapping_sha256:fingerprint,source_registry_sha256:inputs,
    entries:Object.freeze(entries)
  });
}
function parseArgs(args){
  const out={};
  for(let i=0;i<args.length;i+=2){
    const k=args[i];
    if(!['--stage','--out'].includes(k)||i+1>=args.length||out[k])
      throw Error('Usage: --stage ABSOLUTE_PRIVATE_STAGE [--out ABSOLUTE_PRIVATE_OUTPUT]');
    out[k]=args[i+1];
  }
  if(!out['--stage']||!path.isAbsolute(out['--stage']))
    throw Error('Stage path must be absolute');
  if(out['--out']&&!path.isAbsolute(out['--out']))
    throw Error('Output path must be absolute');
  return out;
}
function safelyOutsideRepo(file){
  const resolved=path.resolve(file);
  const parent=path.dirname(resolved);
  const actual=fs.existsSync(resolved)?fs.realpathSync(resolved):
    fs.existsSync(parent)?path.join(fs.realpathSync(parent),path.basename(resolved)):resolved;
  const rel=path.relative(fs.realpathSync(ROOT),actual);
  return rel!==''&&(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel));
}
function load(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function run(args){
  const options=parseArgs(args),privateStage=path.resolve(options['--stage']);
  if(!safelyOutsideRepo(privateStage))throw Error('PRIVATE_STAGE_INSIDE_REPOSITORY');
  const dest=options['--out']&&path.resolve(options['--out']);
  if(dest&&!safelyOutsideRepo(dest))throw Error('PRIVATE_MANIFEST_INSIDE_REPOSITORY');
  const sourceBytes=fs.readFileSync(privateStage);
  const plan=verify({
    stage:JSON.parse(sourceBytes.toString('utf8')),
    catalog:load(path.join(ROOT,'exercise-catalog.json')),
    golden:load(path.join(ROOT,'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json')),
    posters:load(path.join(ROOT,'docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json')),
    approval:load(path.join(ROOT,'docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json')),
    release:load(path.join(ROOT,'docs/generated/MOVEKIT_V2_RELEASE_GATES.json'))
  });
  if(dest){
    // Exclusive creation, private permissions, never overwrite/retry on collision.
    const parent=path.dirname(dest);
    if(!fs.statSync(parent).isDirectory())throw Error('OUTPUT_PARENT_MUST_EXIST');
    const fd=fs.openSync(dest,'wx',0o600);
    try{fs.writeFileSync(fd,JSON.stringify({...plan,
       private_stage_sha256:sha(sourceBytes)},null,2)+'\n','utf8');}
    finally{fs.closeSync(fd);}
  }
  // stdout deliberately contains ZERO provider IDs, exercise names, license
  // content, session IDs, user IDs, media tokens or credentials.
  const report={status:plan.status,...plan.counts,
    private_stage_sha256:sha(sourceBytes),mapping_sha256:plan.mapping_sha256,
    source_registry_sha256:plan.source_registry_sha256,
    private_plan_created:!!dest};
  process.stdout.write(JSON.stringify(report)+'\n');
  return report;
}
if(require.main===module){
 try{run(process.argv.slice(2));}
 catch(e){process.stderr.write('TK504_PRIVATE_FK_PREFLIGHT_FAIL: '+(e.code||e.message)+'\n');
   process.exitCode=1;}
}
module.exports=Object.freeze({verify,run,safelyOutsideRepo});
