'use strict';
/**
 * TK614 / #603 -- READ-ONLY OWNER REVIEW PACKET for the ORIGINAL 226 MoveKit
 * catalog items (TK-000001..TK-000226 -> FK target TKC-000001..TKC-000226).
 *
 * What this is:
 *  - A deterministic, compact review index built ONLY from the public, pinned
 *    exercise-catalog.json (ECS). 10 batches (9 x 25 + 1 x 1), sha256 per batch
 *    and over the whole packet. Every row is PENDING_OWNER_REVIEW.
 *  - A pure, fail-closed validator for a FUTURE owner release record
 *    (FK-identity binding only, no media grants). The validator is used by
 *    tools/tk614_original226_admin_release.cjs original226Released().
 *
 * What this is NOT:
 *  - no approval, no RELEASE_APPROVED, no reviewed=true, no activation, no SQL,
 *    no database, no network, no private manifest, no media, no secrets, no keys.
 *  - Building or committing this packet authorises nothing.
 *
 * CLI (offline):
 *   node tools/tk614_original226_review_packet.cjs --check            (default) verify committed packet
 *   node tools/tk614_original226_review_packet.cjs --write            (re)write docs/generated packet
 *   node tools/tk614_original226_review_packet.cjs --record-template  print a PENDING release-record draft
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const T=require('./tk614_original226_batch25_preflight.cjs');

const ROOT=path.resolve(__dirname,'..');
const CATALOG_FILE=path.join(ROOT,'exercise-catalog.json');
const PACKET_FILE=path.join(ROOT,'docs','generated','TK614_ORIGINAL226_OWNER_REVIEW_PACKET_20261109.json');
const ORIGINAL=226,BATCH_SIZE=25,BATCH_COUNT=10;
const SCHEMA_PACKET='tk614-original226-owner-review-packet/1.0';
const SCHEMA_RECORD='tk614-original226-fk-identity-release/1.0';
const PACKET_STATUS='PENDING_OWNER_REVIEW';
const ROW_STATUS='PENDING_OWNER_REVIEW';
const BINDING_KIND='FK_IDENTITY_BINDING_ONLY';
const RECORD_KEY='original_226_fk_identity_release';
const RECORD_STATUS_APPROVED='OWNER_APPROVED_FK_IDENTITY_ONLY';
const BATCH_STATUS_APPROVED='OWNER_APPROVED';
const RECORD_DECISION_RE=/^TK614-OWNER-REVIEW226-[0-9]{8}-[A-Z0-9]{2,32}$/;
const HEX64=/^[0-9a-f]{64}$/;
const ISO_Z=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
// Facts reported by the owner session for 2026-11-08 (phase A COMMITTED in
// production). Recorded verbatim; NOT re-verified by this offline tool.
const STAGED_CONTRACT=Object.freeze({
  phase_a_decision_id:'TK614-OWNER-STAGE-20261108-CHAT02',
  phase_a_status:'COMMITTED_IN_PRODUCTION',
  original_226_bindings_present:226,
  original_226_binding_active:false,
  original_226_reviewed_at:null,
  original_226_resolvable:0,
  existing_356_active_reviewed:356,
  post_stage_registry_sha256:'bb0b9ee423fcf322fa0e9c854c9013ece34fb3068193b1febb12bdb89de1c927',
  phase_b_activate:'NOT_APPROVED_BLOCKED',
  provenance:'reported_by_owner_session_20261108_not_reverified_offline'});
const EXPECTED_ACTIVATION_BLOCKERS=Object.freeze(['ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES',
  'ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY']);

const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const pad=n=>String(n).padStart(6,'0');
function fail(code){const e=new Error(code);e.code=code;throw e;}
function need(ok,code){if(!ok)fail(code);}
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sameKeys=(o,keys)=>isObj(o)&&JSON.stringify(Object.keys(o).sort())===JSON.stringify([...keys].sort());
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

// Public display fields only; anything absent/odd becomes null (never invented).
const str=v=>typeof v==='string'&&v.length>0&&v.length<=160&&!/[\u0000-\u001f]/.test(v)?v:null;
const strList=v=>Array.isArray(v)&&v.every(x=>str(x)!==null)?[...v]:null;

function batchRange(n){
  const first=(n-1)*BATCH_SIZE+1,last=Math.min(n*BATCH_SIZE,ORIGINAL);
  return {first,last,count:last-first+1};
}

// Verify the pinned public catalog bytes and the exact 226 identity.
function loadCatalog(catalogBytes){
  need(Buffer.isBuffer(catalogBytes)||typeof catalogBytes==='string','SOURCE_CATALOG_BYTES_REQUIRED');
  const sourceSha=T.sourceCatalogSha(catalogBytes);
  need(sourceSha===T.EXPECTED_SOURCE_CATALOG_SHA256,'SOURCE_CATALOG_SHA_MISMATCH');
  let c;try{c=JSON.parse(String(catalogBytes));}catch(_){fail('SOURCE_CATALOG_NOT_JSON');}
  need(isObj(c)&&c.count===ORIGINAL&&Array.isArray(c.catalog)&&c.catalog.length===ORIGINAL&&isObj(c.id_map)&&
    Object.keys(c.id_map).length===ORIGINAL,'ORIGINAL_226_BASELINE_CHANGED');
  const byId=new Map(),slugs=new Set();
  for(const e of c.catalog){
    need(isObj(e)&&/^TK-[0-9]{6}$/.test(e.catalog_id||'')&&!byId.has(e.catalog_id),'ORIGINAL_226_DUPLICATE_OR_INVALID_ID');
    need(isObj(e.source)&&e.source.provider==='movekit'&&str(e.source.provider_id)!==null&&!slugs.has(e.source.provider_id),
      'ORIGINAL_226_DUPLICATE_OR_INVALID_PROVIDER');
    need(own(c.id_map,e.source.provider_id)&&c.id_map[e.source.provider_id]===e.catalog_id,'ORIGINAL_CATALOG_IDENTITY_MISMATCH');
    byId.set(e.catalog_id,e);slugs.add(e.source.provider_id);
  }
  for(let n=1;n<=ORIGINAL;n++)need(byId.has('TK-'+pad(n)),'ORIGINAL_226_INDEX_GAP');
  return {byId,sourceSha};
}

function rowOf(n,e){
  const id=isObj(e.identity)?e.identity:{};
  return {n,catalog_id:'TK-'+pad(n),fk_target_exercise_id:'TKC-'+pad(n),provider:'movekit',
    provider_id:e.source.provider_id,name:str(id.name),name_nl:str(id.nl),category:str(id.category),
    pattern:str(id.pattern),type:str(id.type),difficulty:str(id.difficulty),equipment:strList(id.equipment),
    review_status:ROW_STATUS};
}
const batchDigest=b=>sha(Buffer.from(JSON.stringify({schema:SCHEMA_PACKET,batch:b.batch,from:b.from,through:b.through,
  count:b.count,rows:b.rows}),'utf8'));
const batchIndex=batches=>batches.map(b=>({batch:b.batch,from:b.from,through:b.through,count:b.count,
  batch_sha256:b.batch_sha256}));
const packetDigest=(sourceSha,batches)=>sha(Buffer.from(JSON.stringify({schema:SCHEMA_PACKET,source_catalog_sha256:sourceSha,
  scope:{first:'TK-000001',last:'TK-'+pad(ORIGINAL),count:ORIGINAL},batches:batchIndex(batches)}),'utf8'));

// Deterministic: same catalog bytes -> byte-identical packet. No clock, no env.
function buildReviewPacket(catalogBytes){
  const {byId,sourceSha}=loadCatalog(catalogBytes);
  const batches=[];
  for(let b=1;b<=BATCH_COUNT;b++){
    const r=batchRange(b),rows=[];
    for(let n=r.first;n<=r.last;n++)rows.push(rowOf(n,byId.get('TK-'+pad(n))));
    const batch={batch:b,from:'TK-'+pad(r.first),through:'TK-'+pad(r.last),count:r.count,
      status:PACKET_STATUS,batch_sha256:null,rows};
    batch.batch_sha256=batchDigest(batch);
    batches.push(batch);
  }
  return {
    schema:SCHEMA_PACKET,status:PACKET_STATUS,
    generated_from:{file:'exercise-catalog.json',source_catalog_sha256:sourceSha,
      generator:'tools/tk614_original226_review_packet.cjs'},
    scope:{first:'TK-000001',last:'TK-'+pad(ORIGINAL),count:ORIGINAL,batch_count:BATCH_COUNT,batch_size:BATCH_SIZE,
      last_batch_size:batchRange(BATCH_COUNT).count,binding_kind:BINDING_KIND,
      excluded:['TK-000227..TK-000582 (356, separately reviewed)','23 legacy TK-###### exercise rows','sessions',
        'media files, storage paths, media sha256','private manifest content','license documents']},
    authorizes:{fk_activation:false,reviewed_at:false,binding_active:false,media_grants:false,
      release_gates_change:false,release_approved:false},
    review_counts:{pending_owner_review:ORIGINAL,owner_approved:0,rejected:0},
    evidence:{
      a_existing_claims_and_technical_basis:'SEE_DOCS_TK614_PHASE_B_OWNER_REVIEW_20261109_SECTION_2',
      b_new_fk_binding_approval_for_226:'PENDING',
      c_media_access:'NOT_RELEASED',
      prior_356_owner_approval_transferable:false},
    staged_contract:{...STAGED_CONTRACT},
    totals:{rows:ORIGINAL,batches:BATCH_COUNT,all_sha256:packetDigest(sourceSha,batches)},
    batches};
}
const serializePacket=p=>JSON.stringify(p,null,2)+'\n';

// Re-derive from the catalog; any difference (row, status, sha, extra key) = tamper.
function verifyReviewPacket(packet,catalogBytes){
  need(isObj(packet)&&packet.schema===SCHEMA_PACKET,'REVIEW_PACKET_SCHEMA_INVALID');
  const fresh=buildReviewPacket(catalogBytes);
  need(serializePacket(packet)===serializePacket(fresh),'REVIEW_PACKET_TAMPERED');
  return fresh;
}

// ---------------------------------------------------------------------------
// FUTURE owner release record (lives at releaseGates[RECORD_KEY] only after a
// separately reviewed commit). Returns a sorted list of problem codes; [] = valid.
const RECORD_KEYS=['schema','status','decision_id','approved_by','approved_at','binding_kind','media_grants','media_access',
  'review_packet','evidence','batches'];
const RECORD_BATCH_KEYS=['batch','from','through','count','batch_sha256','status','reviewed_by','reviewed_at','evidence_sha256'];
const EVIDENCE_KEYS=['source_evidence_sha256','license_evidence_sha256','owner_review_evidence_sha256'];
const personOk=v=>typeof v==='string'&&v.trim().length>=2&&v.length<=128&&!/[\u0000-\u001f'\\]/.test(v);
function releaseRecordProblems(record,packet){
  const p=new Set(),add=c=>p.add(c);
  if(!isObj(packet)||packet.schema!==SCHEMA_PACKET||!isObj(packet.totals)||!isObj(packet.generated_from)||
     !HEX64.test(packet.totals.all_sha256||'')||!Array.isArray(packet.batches)||packet.batches.length!==BATCH_COUNT||
     !packet.batches.every(isObj))return ['REVIEW_PACKET_REQUIRED'];
  if(!isObj(record))return ['RELEASE_RECORD_MISSING'];
  if(!sameKeys(record,RECORD_KEYS))add('RELEASE_RECORD_SHAPE_INVALID');
  if(record.schema!==SCHEMA_RECORD)add('RELEASE_RECORD_SCHEMA_INVALID');
  if(record.status!==RECORD_STATUS_APPROVED)add('RELEASE_RECORD_NOT_OWNER_APPROVED');
  if(!RECORD_DECISION_RE.test(typeof record.decision_id==='string'?record.decision_id:''))add('RELEASE_RECORD_DECISION_ID_INVALID');
  if(!personOk(record.approved_by))add('RELEASE_RECORD_APPROVED_BY_INVALID');
  const at=typeof record.approved_at==='string'&&ISO_Z.test(record.approved_at)?Date.parse(record.approved_at):NaN;
  if(!Number.isFinite(at))add('RELEASE_RECORD_APPROVED_AT_INVALID');
  if(record.binding_kind!==BINDING_KIND)add('RELEASE_RECORD_SCOPE_NOT_FK_IDENTITY_ONLY');
  if(record.media_grants!==0||record.media_access!=='NOT_RELEASED')add('RELEASE_RECORD_MEDIA_GRANT_FORBIDDEN');
  const rp=record.review_packet;
  if(!sameKeys(rp,['schema','all_sha256','source_catalog_sha256'])||rp.schema!==SCHEMA_PACKET||
     rp.all_sha256!==packet.totals.all_sha256||rp.source_catalog_sha256!==packet.generated_from.source_catalog_sha256)
    add('RELEASE_RECORD_PACKET_DIGEST_MISMATCH');
  const packetShas=new Set([packet.totals.all_sha256,...packet.batches.map(b=>b.batch_sha256)]);
  const evidenceOk=h=>typeof h==='string'&&HEX64.test(h)&&!/^(.)\1{63}$/.test(h)&&!packetShas.has(h);
  const ev=record.evidence;
  if(!sameKeys(ev,EVIDENCE_KEYS)||!EVIDENCE_KEYS.every(k=>evidenceOk(ev[k]))||
     new Set(EVIDENCE_KEYS.map(k=>ev[k])).size!==EVIDENCE_KEYS.length)add('RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID');
  const bs=record.batches;
  if(!Array.isArray(bs)||bs.length!==BATCH_COUNT)add('RELEASE_RECORD_BATCHES_INCOMPLETE');
  else bs.forEach((b,i)=>{
    const ref=packet.batches[i];
    if(!sameKeys(b,RECORD_BATCH_KEYS)){add('RELEASE_RECORD_SHAPE_INVALID');return;}
    if(b.batch!==ref.batch||b.from!==ref.from||b.through!==ref.through||b.count!==ref.count||
       b.batch_sha256!==ref.batch_sha256)add('RELEASE_RECORD_BATCH_DIGEST_MISMATCH');
    if(b.status!==BATCH_STATUS_APPROVED)add('RELEASE_RECORD_PARTIAL_APPROVAL_BLOCKED');
    if(!personOk(b.reviewed_by))add('RELEASE_RECORD_REVIEWER_INVALID');
    const rt=typeof b.reviewed_at==='string'&&ISO_Z.test(b.reviewed_at)?Date.parse(b.reviewed_at):NaN;
    if(!Number.isFinite(rt)||!(rt<=at))add('RELEASE_RECORD_REVIEW_TIMESTAMP_INVALID');
    if(!evidenceOk(b.evidence_sha256))add('RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID');
  });
  return [...p].sort();
}

// A PENDING draft for the owner to fill in OUTSIDE this tool. It never validates.
function buildReleaseRecordTemplate(packet){
  need(isObj(packet)&&packet.schema===SCHEMA_PACKET,'REVIEW_PACKET_REQUIRED');
  return {schema:SCHEMA_RECORD,status:PACKET_STATUS,decision_id:null,approved_by:null,approved_at:null,
    binding_kind:BINDING_KIND,media_grants:0,media_access:'NOT_RELEASED',
    review_packet:{schema:SCHEMA_PACKET,all_sha256:packet.totals.all_sha256,
      source_catalog_sha256:packet.generated_from.source_catalog_sha256},
    evidence:{source_evidence_sha256:null,license_evidence_sha256:null,owner_review_evidence_sha256:null},
    batches:packet.batches.map(b=>({batch:b.batch,from:b.from,through:b.through,count:b.count,
      batch_sha256:b.batch_sha256,status:PACKET_STATUS,reviewed_by:null,reviewed_at:null,evidence_sha256:null}))};
}

let cachedRepoPacket=null;
function repoReviewPacket(){
  if(!cachedRepoPacket)cachedRepoPacket=Object.freeze(buildReviewPacket(fs.readFileSync(CATALOG_FILE)));
  return cachedRepoPacket;
}

// ---------------------------------------------------------------------------
const USAGE='Usage: tk614_original226_review_packet.cjs [--check|--write|--record-template]';
function run(argv,io={}){
  const out=io.stdout||(x=>process.stdout.write(x));
  need(argv.length<=1,'USAGE');
  const cmd=argv[0]||'--check';
  need(['--check','--write','--record-template'].includes(cmd),'USAGE');
  const catalogBytes=fs.readFileSync(CATALOG_FILE);
  const packet=buildReviewPacket(catalogBytes);
  let report;
  if(cmd==='--write'){
    fs.writeFileSync(io.packetFile||PACKET_FILE,serializePacket(packet),'utf8');
    report={status:'REVIEW_PACKET_WRITTEN_AUTHORISES_NOTHING'};
  }else if(cmd==='--check'){
    const f=io.packetFile||PACKET_FILE;
    need(fs.existsSync(f),'REVIEW_PACKET_FILE_MISSING');
    let committed;try{committed=JSON.parse(fs.readFileSync(f,'utf8'));}catch(_){fail('REVIEW_PACKET_NOT_JSON');}
    verifyReviewPacket(committed,catalogBytes);
    report={status:'REVIEW_PACKET_VERIFIED_AUTHORISES_NOTHING'};
  }else{
    out(JSON.stringify(buildReleaseRecordTemplate(packet),null,2)+'\n');
    return {status:'PENDING_RECORD_TEMPLATE_PRINTED_AUTHORISES_NOTHING'};
  }
  report={...report,schema:SCHEMA_PACKET,packet_status:packet.status,rows:ORIGINAL,batches:BATCH_COUNT,
    all_sha256:packet.totals.all_sha256,batch_sha256:packet.batches.map(b=>b.batch_sha256),
    source_catalog_sha256:packet.generated_from.source_catalog_sha256,database_writes_performed:false};
  out(JSON.stringify(report)+'\n');
  return report;
}
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(e){process.stderr.write('TK614_REVIEW_PACKET_BLOCKED: '+(e.code||e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({SCHEMA_PACKET,SCHEMA_RECORD,PACKET_STATUS,ROW_STATUS,BINDING_KIND,RECORD_KEY,
  RECORD_STATUS_APPROVED,BATCH_STATUS_APPROVED,RECORD_DECISION_RE,STAGED_CONTRACT,EXPECTED_ACTIVATION_BLOCKERS,
  PACKET_FILE,ORIGINAL,BATCH_SIZE,BATCH_COUNT,USAGE,
  loadCatalog,buildReviewPacket,serializePacket,verifyReviewPacket,releaseRecordProblems,buildReleaseRecordTemplate,
  repoReviewPacket,run});
