'use strict';
/**
 * TK614 / #603 -- OWNER BULK FK-IDENTITY APPROVAL for the ORIGINAL 226 MoveKit
 * items (TK-000001..TK-000226 -> TKC-000001..TKC-000226), 2026-11-09.
 *
 * Decision TK614-OWNER-REVIEW226-20261109-BULK01, status
 * OWNER_EXPLICIT_BULK_FK_IDENTITY_APPROVAL, recorded in GitHub issue #614
 * comment 6733264842. The owner answered verbatim:
 *   "Ja bevestig ik, ik ben de eigenaar van tk en de koper van de movekit"
 *
 * Scope = FK-identity / training registration ONLY. It is NOT:
 *  - proof that every item was read individually (per_item_reading_confirmed=false),
 *  - an independently verified license/purchase (license holder match = owner attestation),
 *  - a media grant, a media release or a change of released_batches (MEDIA scope),
 *  - a signed cryptographic ACTIVATE (TRUSTED_OWNER_KEY_SHA256 stays empty),
 *  - a database write. The review packet stays PENDING_OWNER_REVIEW; this decision
 *    is a SEPARATE record (docs/generated/TK614_ORIGINAL226_OWNER_FK_APPROVAL_20261109.json).
 *
 * Canonical evidence hashing (all lower-case hex sha256 over UTF-8 bytes):
 *   text = HEADER + "\n" + join(KEY "=" VALUE, "\n") + "\n"
 *   values are single-line strings (no CR/LF), integers in decimal.
 *   source  : tk614-original226-source-evidence/1.0       decision_id, source_file,
 *             source_catalog_sha256, review_packet_schema, review_packet_all_sha256
 *   owner   : tk614-original226-owner-review-evidence/1.0 decision_id, status, binding_kind,
 *             media_grants, issue_comment_url, owner_statement, review_packet_all_sha256
 *   license : tk614-original226-license-evidence/1.0      decision_id, license_file,
 *             license_file_sha256, license_holder_match
 *   batch i : tk614-original226-batch-evidence/1.0        decision_id,
 *             owner_review_evidence_sha256, batch, from, through, count, batch_sha256
 * The values above were cross-checked outside Node (PowerShell Get-FileHash over the
 * exact LF text); core/tk614Original226OwnerFkApproval.test.js pins them literally.
 *
 * The private LICENSE.txt contains private order/license identifiers. Only its
 * sha256 may ever be recorded; its contents are never read into Git, logs or output.
 * Until that hash is bound (bindLicenseFileSha256 / CLI --bind-license) the decision
 * reports OWNER_DECISION_LICENSE_EVIDENCE_PENDING and the release record is invalid.
 *
 * Pure module: no network, no database, no environment variables, no keys.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('./tk614_original226_review_packet.cjs');

const ROOT=path.resolve(__dirname,'..');
const DECISION_FILE=path.join(ROOT,'docs','generated','TK614_ORIGINAL226_OWNER_FK_APPROVAL_20261109.json');
const RELEASE_GATES_FILE=path.join(ROOT,'docs','generated','MOVEKIT_V2_RELEASE_GATES.json');
const SCHEMA_DECISION='tk614-original226-owner-fk-approval-decision/1.0';
const DECISION_ID='TK614-OWNER-REVIEW226-20261109-BULK01';
const DECISION_STATUS='OWNER_EXPLICIT_BULK_FK_IDENTITY_APPROVAL';
const OWNER_STATEMENT='Ja bevestig ik, ik ben de eigenaar van tk en de koper van de movekit';
const ISSUE_COMMENT_ID='6733264842';
const ISSUE_COMMENT_URL='https://github.com/steentje76/maurice-training/issues/614#issuecomment-'+ISSUE_COMMENT_ID;
const APPROVED_BY='Trainingskompas owner (self-attested MoveKit buyer)';
// The chat reply carries a date, not a recorded time: midnight UTC by convention.
const APPROVED_AT='2026-11-09T00:00:00.000Z';
const LICENSE_FILE_NAME='LICENSE.txt';
const LICENSE_HOLDER_MATCH='OWNER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED';
const LICENSE_HASH_PENDING='PENDING_LOCAL_SHA256_NOT_YET_COMPUTED';
const LICENSE_HASH_BOUND='SHA256_OF_LOCAL_FILE_ONLY_CONTENTS_NOT_COPIED';
const EVIDENCE_SCHEMA=Object.freeze({
  source:'tk614-original226-source-evidence/1.0',
  owner:'tk614-original226-owner-review-evidence/1.0',
  license:'tk614-original226-license-evidence/1.0',
  batch:'tk614-original226-batch-evidence/1.0'});
const HEX64=/^[0-9a-f]{64}$/;

const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function fail(code){const e=new Error(code);e.code=code;throw e;}
function need(ok,code){if(!ok)fail(code);}
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function canonicalJson(v){
  if(Array.isArray(v))return '['+v.map(canonicalJson).join(',')+']';
  if(isObj(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(v[k])).join(',')+'}';
  return JSON.stringify(v===undefined?null:v);
}

function evidenceText(header,pairs){
  const line=v=>{const s=typeof v==='number'&&Number.isInteger(v)?String(v):v;
    need(typeof s==='string'&&s.length>0&&!/[\r\n]/.test(s),'EVIDENCE_VALUE_INVALID');return s;};
  return [line(header),...pairs.map(([k,v])=>line(k)+'='+line(v))].join('\n')+'\n';
}
const evidenceSha=(header,pairs)=>sha(Buffer.from(evidenceText(header,pairs),'utf8'));
function packetOk(packet){
  need(isObj(packet)&&packet.schema===P.SCHEMA_PACKET&&isObj(packet.totals)&&HEX64.test(packet.totals.all_sha256||'')&&
    isObj(packet.generated_from)&&HEX64.test(packet.generated_from.source_catalog_sha256||'')&&
    Array.isArray(packet.batches)&&packet.batches.length===P.BATCH_COUNT,'REVIEW_PACKET_REQUIRED');
  return packet;
}
function sourceEvidenceSha256(packet){
  packetOk(packet);
  return evidenceSha(EVIDENCE_SCHEMA.source,[['decision_id',DECISION_ID],['source_file','exercise-catalog.json'],
    ['source_catalog_sha256',packet.generated_from.source_catalog_sha256],['review_packet_schema',P.SCHEMA_PACKET],
    ['review_packet_all_sha256',packet.totals.all_sha256]]);
}
function ownerReviewEvidenceSha256(packet){
  packetOk(packet);
  return evidenceSha(EVIDENCE_SCHEMA.owner,[['decision_id',DECISION_ID],['status',DECISION_STATUS],
    ['binding_kind',P.BINDING_KIND],['media_grants',0],['issue_comment_url',ISSUE_COMMENT_URL],
    ['owner_statement',OWNER_STATEMENT],['review_packet_all_sha256',packet.totals.all_sha256]]);
}
function licenseEvidenceSha256(licenseFileSha256){
  need(HEX64.test(licenseFileSha256||''),'LICENSE_FILE_SHA256_INVALID');
  return evidenceSha(EVIDENCE_SCHEMA.license,[['decision_id',DECISION_ID],['license_file',LICENSE_FILE_NAME],
    ['license_file_sha256',licenseFileSha256],['license_holder_match',LICENSE_HOLDER_MATCH]]);
}
function batchEvidenceSha256(ownerSha,b){
  need(HEX64.test(ownerSha||'')&&isObj(b)&&HEX64.test(b.batch_sha256||''),'EVIDENCE_VALUE_INVALID');
  return evidenceSha(EVIDENCE_SCHEMA.batch,[['decision_id',DECISION_ID],['owner_review_evidence_sha256',ownerSha],
    ['batch',b.batch],['from',b.from],['through',b.through],['count',b.count],['batch_sha256',b.batch_sha256]]);
}

// Digests that are never acceptable as a LICENSE file hash: anything already used
// for another purpose, and degenerate repeated-character values.
function forbiddenLicenseShas(packet){
  const s=new Set([packet.totals.all_sha256,packet.generated_from.source_catalog_sha256,
    ...packet.batches.map(b=>b.batch_sha256),sha(Buffer.alloc(0))]);
  return s;
}
function licenseShaAcceptable(h,packet){
  return typeof h==='string'&&HEX64.test(h)&&!/^(.)\1{63}$/.test(h)&&!forbiddenLicenseShas(packet).has(h);
}

/** Deterministic sidecar. licenseFileSha256 = null => license evidence PENDING. */
function buildOwnerDecision(packet,licenseFileSha256=null){
  packetOk(packet);
  need(licenseFileSha256===null||licenseShaAcceptable(licenseFileSha256,packet),'LICENSE_FILE_SHA256_INVALID');
  const owner=ownerReviewEvidenceSha256(packet);
  const last=packet.batches[P.BATCH_COUNT-1];
  return {
    schema:SCHEMA_DECISION,
    decision_id:DECISION_ID,
    status:DECISION_STATUS,
    decided_on:'2026-11-09',
    approved_by:APPROVED_BY,
    approved_at:APPROVED_AT,
    approved_at_precision:'DATE_ONLY_TIME_OF_DAY_NOT_RECORDED',
    owner_statement_verbatim:OWNER_STATEMENT,
    owner_statement_language:'nl',
    question_summary_en:'Do you approve all 226 original MoveKit exercises in the review packet exclusively for the '+
      'secured training registration, without new media rights, and do you confirm that the MoveKit license belongs to '+
      'the same person or legal entity that operates Trainingskompas? (authoritative wording: issue #614 comment '+
      ISSUE_COMMENT_ID+')',
    issue_comment_id:ISSUE_COMMENT_ID,
    issue_comment_url:ISSUE_COMMENT_URL,
    scope:{first:'TK-000001',last:'TK-'+String(P.ORIGINAL).padStart(6,'0'),count:P.ORIGINAL,unique_catalog_ids:P.ORIGINAL,
      fk_targets:'TKC-000001..TKC-000226',batch_count:P.BATCH_COUNT,batch_size:P.BATCH_SIZE,last_batch_size:last.count,
      binding_kind:P.BINDING_KIND},
    authorizes:{fk_identity_registration_release_record:true,media_grants:false,media_access:false,new_media_rights:false,
      released_batches_change:false,binding_activation_without_signed_activate:false,database_writes:false},
    limitations:{per_item_reading_confirmed:false,license_independently_verified:false,
      license_holder_match:LICENSE_HOLDER_MATCH,signed_cryptographic_activate:false,trusted_owner_key_pinned:false,
      review_packet_status_unchanged:P.PACKET_STATUS,prior_356_owner_approval_transferable:false},
    review_packet:{file:'docs/generated/TK614_ORIGINAL226_OWNER_REVIEW_PACKET_20261109.json',schema:P.SCHEMA_PACKET,
      status:P.PACKET_STATUS,all_sha256:packet.totals.all_sha256,
      source_catalog_sha256:packet.generated_from.source_catalog_sha256},
    license:{file_name:LICENSE_FILE_NAME,location:'PRIVATE_LOCAL_OUTSIDE_GIT',contents_in_git:false,
      hash_status:licenseFileSha256===null?LICENSE_HASH_PENDING:LICENSE_HASH_BOUND,file_sha256:licenseFileSha256},
    evidence:{source_evidence_sha256:sourceEvidenceSha256(packet),
      license_evidence_sha256:licenseFileSha256===null?null:licenseEvidenceSha256(licenseFileSha256),
      owner_review_evidence_sha256:owner},
    batches:packet.batches.map(b=>({batch:b.batch,from:b.from,through:b.through,count:b.count,batch_sha256:b.batch_sha256,
      evidence_sha256:batchEvidenceSha256(owner,b)})),
    canonical_hashing:{algorithm:'sha256 over UTF-8 bytes, lower-case hex',
      text:'HEADER LF then KEY=VALUE lines joined by LF, final LF',
      implementation:'tools/tk614_original226_owner_decision.cjs',
      independent_check:'core/tk614Original226OwnerFkApproval.test.js pins digests computed outside Node'}};
}
const serializeDecision=d=>JSON.stringify(d,null,2)+'\n';

/** [] = the sidecar is exactly the pinned owner decision for this packet. */
function decisionProblems(decision,packet){
  try{packetOk(packet);}catch(_){return ['REVIEW_PACKET_REQUIRED'];}
  if(!isObj(decision))return ['OWNER_DECISION_MISSING'];
  const p=new Set();
  const lic=isObj(decision.license)?decision.license.file_sha256:undefined;
  let bound=null;
  if(lic===null)p.add('OWNER_DECISION_LICENSE_EVIDENCE_PENDING');
  else if(licenseShaAcceptable(lic,packet))bound=lic;
  else p.add('OWNER_DECISION_LICENSE_EVIDENCE_INVALID');
  if(canonicalJson(decision)!==canonicalJson(buildOwnerDecision(packet,bound)))p.add('OWNER_DECISION_TAMPERED_OR_MISMATCHED');
  return [...p].sort();
}

/** The ONLY release record that may live at releaseGates.original_226_fk_identity_release. */
function buildReleaseRecord(decision,packet){
  packetOk(packet);need(isObj(decision)&&isObj(decision.evidence)&&Array.isArray(decision.batches),'OWNER_DECISION_MISSING');
  return {schema:P.SCHEMA_RECORD,status:P.RECORD_STATUS_APPROVED,decision_id:decision.decision_id,
    approved_by:decision.approved_by,approved_at:decision.approved_at,binding_kind:P.BINDING_KIND,media_grants:0,
    media_access:'NOT_RELEASED',
    review_packet:{schema:P.SCHEMA_PACKET,all_sha256:packet.totals.all_sha256,
      source_catalog_sha256:packet.generated_from.source_catalog_sha256},
    evidence:{source_evidence_sha256:decision.evidence.source_evidence_sha256,
      license_evidence_sha256:decision.evidence.license_evidence_sha256,
      owner_review_evidence_sha256:decision.evidence.owner_review_evidence_sha256},
    batches:packet.batches.map((b,i)=>({batch:b.batch,from:b.from,through:b.through,count:b.count,
      batch_sha256:b.batch_sha256,status:P.BATCH_STATUS_APPROVED,reviewed_by:decision.approved_by,
      reviewed_at:decision.approved_at,evidence_sha256:isObj(decision.batches[i])?decision.batches[i].evidence_sha256:null}))};
}

/** Record vs decision vs packet. Structure (P.releaseRecordProblems) + exact binding. */
function recordBindingProblems(record,decision,packet){
  try{packetOk(packet);}catch(_){return ['REVIEW_PACKET_REQUIRED'];}
  const p=new Set(P.releaseRecordProblems(record,packet));
  for(const c of decisionProblems(decision,packet))p.add(c);
  if(isObj(record)&&isObj(decision)){
    let expected=null;try{expected=buildReleaseRecord(decision,packet);}catch(_){expected=null;}
    if(!expected||canonicalJson(record)!==canonicalJson(expected))p.add('RELEASE_RECORD_NOT_BOUND_TO_OWNER_DECISION');
  }
  return [...p].sort();
}

let cachedDecision;
function repoOwnerDecision(){
  if(cachedDecision===undefined){
    cachedDecision=fs.existsSync(DECISION_FILE)?Object.freeze(JSON.parse(fs.readFileSync(DECISION_FILE,'utf8'))):null;
  }
  return cachedDecision;
}

/**
 * Bind the sha256 of the private LICENSE.txt. Pure: returns the new sidecar text
 * and the new release-gates text. The gates edit is a targeted replacement of the
 * single "license_evidence_sha256": null line inside the FK-only record, so every
 * other byte (status, 15 media released_batches, 1164 media entries) stays identical.
 */
function bindLicenseFileSha256({licenseFileSha256,packet,gatesText}){
  packetOk(packet);
  need(licenseShaAcceptable(licenseFileSha256,packet),'LICENSE_FILE_SHA256_INVALID');
  const decision=buildOwnerDecision(packet,licenseFileSha256);
  const needle='"license_evidence_sha256": null';
  need(typeof gatesText==='string'&&gatesText.split(needle).length===2,'RELEASE_GATES_LICENSE_SLOT_NOT_FOUND');
  const out=gatesText.replace(needle,'"license_evidence_sha256": "'+decision.evidence.license_evidence_sha256+'"');
  const gates=JSON.parse(out);
  need(recordBindingProblems(gates[P.RECORD_KEY],decision,packet).length===0,'RELEASE_RECORD_NOT_BOUND_TO_OWNER_DECISION');
  return {decisionText:serializeDecision(decision),gatesText:out,
    license_evidence_sha256:decision.evidence.license_evidence_sha256};
}

// ---------------------------------------------------------------------------
// CLI (offline):
//   --check                       verify the committed sidecar + FK-only record
//   --bind-license ABS_PATH       hash ONLY the private LICENSE.txt and bind it
const USAGE='Usage: tk614_original226_owner_decision.cjs [--check | --bind-license ABSOLUTE_LICENSE_TXT_PATH]';
function run(argv,io={}){
  const out=io.stdout||(x=>process.stdout.write(x));
  const decisionFile=io.decisionFile||DECISION_FILE,gatesFile=io.gatesFile||RELEASE_GATES_FILE;
  const packet=P.repoReviewPacket();
  const cmd=argv[0]||'--check';
  if(cmd==='--check'){
    need(argv.length<=1,'USAGE');
    need(fs.existsSync(decisionFile),'OWNER_DECISION_FILE_MISSING');
    const decision=JSON.parse(fs.readFileSync(decisionFile,'utf8'));
    const gates=JSON.parse(fs.readFileSync(gatesFile,'utf8'));
    const problems=recordBindingProblems(gates[P.RECORD_KEY],decision,packet);
    const report={status:problems.length?'OWNER_FK_RECORD_INCOMPLETE':'OWNER_FK_RECORD_BOUND',problems,
      decision_id:decision.decision_id,license_hash_status:isObj(decision.license)?decision.license.hash_status:null,
      database_writes_performed:false,activation_executed:false};
    out(JSON.stringify(report)+'\n');
    return report;
  }
  need(cmd==='--bind-license'&&argv.length===2&&path.isAbsolute(argv[1]||''),'USAGE');
  const licensePath=path.resolve(argv[1]);
  need(path.basename(licensePath)===LICENSE_FILE_NAME,'LICENSE_FILE_NAME_MISMATCH');
  const rel=path.relative(ROOT,licensePath);
  need(rel.startsWith('..')||path.isAbsolute(rel),'PRIVATE_LICENSE_INSIDE_REPOSITORY');
  // Hash only. The bytes are never decoded, logged or copied.
  const licenseFileSha256=sha(fs.readFileSync(licensePath));
  const r=bindLicenseFileSha256({licenseFileSha256,packet,gatesText:fs.readFileSync(gatesFile,'utf8')});
  fs.writeFileSync(decisionFile,r.decisionText,'utf8');
  fs.writeFileSync(gatesFile,r.gatesText,'utf8');
  const report={status:'LICENSE_SHA256_BOUND_CONTENTS_NOT_COPIED',license_file_sha256:licenseFileSha256,
    license_evidence_sha256:r.license_evidence_sha256,database_writes_performed:false,activation_executed:false};
  out(JSON.stringify(report)+'\n');
  return report;
}
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(e){process.stderr.write('TK614_OWNER_DECISION_BLOCKED: '+(e.code||e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({SCHEMA_DECISION,DECISION_ID,DECISION_STATUS,OWNER_STATEMENT,ISSUE_COMMENT_ID,ISSUE_COMMENT_URL,
  APPROVED_BY,APPROVED_AT,LICENSE_FILE_NAME,LICENSE_HOLDER_MATCH,LICENSE_HASH_PENDING,LICENSE_HASH_BOUND,EVIDENCE_SCHEMA,
  DECISION_FILE,USAGE,canonicalJson,evidenceText,sourceEvidenceSha256,ownerReviewEvidenceSha256,licenseEvidenceSha256,
  batchEvidenceSha256,buildOwnerDecision,serializeDecision,decisionProblems,buildReleaseRecord,recordBindingProblems,
  repoOwnerDecision,bindLicenseFileSha256,run});
