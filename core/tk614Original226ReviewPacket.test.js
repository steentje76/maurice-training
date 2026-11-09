'use strict';
// TK614/#603 -- PHASE B OWNER REVIEW PACKET for the ORIGINAL 226 (2026-11-09).
// RED/GREEN on the real generator (tools/tk614_original226_review_packet.cjs),
// the real public exercise-catalog.json and the real release gates. Synthetic
// release records only. No DB, Docker, network, credentials, keys or private data.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const P=require('../tools/tk614_original226_review_packet.cjs');
const T=require('../tools/tk614_original226_batch25_preflight.cjs');
const R=require('../tools/tk614_original226_admin_release.cjs');
const S=require('../tools/tk614_admin_release_docker_smoke.cjs');
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const GATES_FILE=path.join(ROOT,'docs','generated','MOVEKIT_V2_RELEASE_GATES.json');
const gatesBytesBefore=fs.readFileSync(GATES_FILE);
const repoGates=JSON.parse(gatesBytesBefore.toString('utf8'));
const catalogBytes=fs.readFileSync(path.join(ROOT,'exercise-catalog.json'));
const catalog=JSON.parse(catalogBytes.toString('utf8'));
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const contentApproval=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const pad=n=>String(n).padStart(6,'0');
const HEX64=/^[0-9a-f]{64}$/;

let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const throwsCode=(fn,code,m)=>{assert.throws(fn,e=>e.code===code||e.message===code,m||code);checks++;};
const has=(list,code,m)=>{ok(Array.isArray(list)&&list.includes(code),(m||code)+' -> '+JSON.stringify(list));};

const packet=P.buildReviewPacket(catalogBytes);
const json=P.serializePacket(packet);
const rows=packet.batches.flatMap(b=>b.rows);

// ---- 1. complete 226, unique, consecutive, bound to the real public catalog
eq([packet.schema,packet.status],[P.SCHEMA_PACKET,'PENDING_OWNER_REVIEW']);
eq(packet.generated_from.source_catalog_sha256,T.EXPECTED_SOURCE_CATALOG_SHA256,'pinned source catalog');
eq(rows.length,226,'226 rows');
eq(rows.map(r=>r.catalog_id),Array.from({length:226},(_,i)=>'TK-'+pad(i+1)),'TK-000001..226 consecutive, ordered');
eq(rows.map(r=>r.fk_target_exercise_id),Array.from({length:226},(_,i)=>'TKC-'+pad(i+1)),'FK targets TKC-000001..226');
eq(new Set(rows.map(r=>r.catalog_id)).size,226,'catalog_id unique');
eq(new Set(rows.map(r=>r.provider_id)).size,226,'provider_id unique');
eq(new Set(rows.map(r=>r.fk_target_exercise_id)).size,226,'fk target unique');
ok(rows.every(r=>r.fk_target_exercise_id!==r.catalog_id),'FK target is never the TK id itself');
eq(new Set(rows.map(r=>r.provider_id)),new Set(Object.keys(catalog.id_map)),'provider_ids == public id_map keys');
{const byId=new Map(catalog.catalog.map(c=>[c.catalog_id,c]));
 ok(rows.every(r=>{const c=byId.get(r.catalog_id);return c.source.provider==='movekit'&&r.provider==='movekit'&&
   c.source.provider_id===r.provider_id&&catalog.id_map[r.provider_id]===r.catalog_id&&r.name===c.identity.name&&
   r.category===(c.identity.category||null)&&r.difficulty===(c.identity.difficulty||null);}),
   'every row is the real ECS identity (name/category/difficulty/provider), no own ID truth');}
ok(rows.every(r=>typeof r.name==='string'&&r.name.length>0),'every row has a public ECS name');
ok(rows.every(r=>r.review_status==='PENDING_OWNER_REVIEW'),'226/226 PENDING_OWNER_REVIEW');
eq(packet.review_counts,{pending_owner_review:226,owner_approved:0,rejected:0});
eq(Object.values(packet.authorizes),[false,false,false,false,false,false],'packet authorises nothing');
ok(rows.every(r=>Number(r.catalog_id.slice(3))<=226),'no 227..582 row in the packet');
{const new356=golden.items.filter(i=>Number(String(i.catalog_id).slice(3))>226).map(i=>i.provider_id);
 eq(new356.length,356);
 ok(new356.every(s=>!rows.some(r=>r.provider_id===s)),'no 356 slug in the packet');}
eq(Object.keys(rows[0]),['n','catalog_id','fk_target_exercise_id','provider','provider_id','name','name_nl','category',
  'pattern','type','difficulty','equipment','review_status'],'compact public row shape only');

// ---- 2. ten batches 9x25+1, consistent with the stage plan schedule
eq(packet.batches.length,10,'10 batches');eq(P.BATCH_COUNT,T.BATCH_COUNT);
eq(packet.batches.map(b=>b.count),[25,25,25,25,25,25,25,25,25,1],'9 x 25 + 1');
eq(packet.batches.map(b=>[b.batch,b.from,b.through,b.count]),
  T.batchSchedule().map(b=>[b.batch,b.first_catalog_id,b.last_catalog_id,b.size]),'same schedule as the staged plan');
ok(packet.batches.every(b=>b.status==='PENDING_OWNER_REVIEW'&&b.rows.length===b.count),'every batch PENDING');
eq(packet.batches.find(b=>b.rows.some(r=>r.catalog_id==='TK-000063')).batch,3,'Cable Bar Pushdown TK-000063 in batch 3');
eq(packet.batches.find(b=>b.rows.some(r=>r.catalog_id==='TK-000188')).batch,8,'Machine Pec Fly TK-000188 in batch 8');

// ---- 3. sha256 per batch and total, independently recomputed (formula pinned)
ok(packet.batches.every(b=>HEX64.test(b.batch_sha256)),'batch sha256 hex');
eq(new Set(packet.batches.map(b=>b.batch_sha256)).size,10,'10 distinct batch digests');
for(const b of packet.batches)eq(b.batch_sha256,sha(JSON.stringify({schema:P.SCHEMA_PACKET,batch:b.batch,from:b.from,
  through:b.through,count:b.count,rows:b.rows})),'batch '+b.batch+' digest formula');
eq(packet.totals.all_sha256,sha(JSON.stringify({schema:P.SCHEMA_PACKET,source_catalog_sha256:T.EXPECTED_SOURCE_CATALOG_SHA256,
  scope:{first:'TK-000001',last:'TK-000226',count:226},batches:packet.batches.map(b=>({batch:b.batch,from:b.from,
  through:b.through,count:b.count,batch_sha256:b.batch_sha256}))})),'total digest formula');
eq([packet.totals.rows,packet.totals.batches],[226,10]);

// ---- 4. deterministic + verification + tamper RED
eq(P.serializePacket(P.buildReviewPacket(catalogBytes)),json,'byte-identical on rebuild');
eq(P.serializePacket(P.buildReviewPacket(Buffer.from(catalogBytes.toString('utf8').replace(/\n/g,'\r\n'),'utf8'))),json,
  'CRLF checkout gives the same packet');
ok(P.verifyReviewPacket(JSON.parse(json),catalogBytes),'GREEN verify');
const tamper=(f,m)=>{const t=JSON.parse(json);f(t);throwsCode(()=>P.verifyReviewPacket(t,catalogBytes),'REVIEW_PACKET_TAMPERED',m);};
tamper(t=>{t.batches[4].rows[3].name='Forged';},'row name');
tamper(t=>{t.batches[0].rows[0].provider_id='band-curl';},'provider swap');
tamper(t=>{t.batches[2].batch_sha256='0'.repeat(64);},'batch sha');
tamper(t=>{t.totals.all_sha256='f'.repeat(64);},'total sha');
tamper(t=>{t.batches[7].rows[12].review_status='OWNER_APPROVED';},'row self-approved');
tamper(t=>{t.batches[9].status='OWNER_APPROVED';},'batch self-approved');
tamper(t=>{t.status='RELEASE_APPROVED';},'packet self-released');
tamper(t=>{t.authorizes.fk_activation=true;},'authorizes flipped');
tamper(t=>{t.review_counts.owner_approved=226;},'counts flipped');
tamper(t=>{t.batches[1].rows.pop();},'row dropped');
tamper(t=>{t.batches[0].rows[0].storage_path='movekit/v2/video/x.mp4';},'media field injected');
tamper(t=>{t.staged_contract.original_226_resolvable=226;},'staged contract altered');
throwsCode(()=>P.verifyReviewPacket({...JSON.parse(json),schema:'x'},catalogBytes),'REVIEW_PACKET_SCHEMA_INVALID');
throwsCode(()=>P.buildReviewPacket(Buffer.concat([catalogBytes,Buffer.from(' ')])),'SOURCE_CATALOG_SHA_MISMATCH','catalog drift');
throwsCode(()=>P.buildReviewPacket(null),'SOURCE_CATALOG_BYTES_REQUIRED');

// ---- 5. public-only content: no media, secrets, private paths or approvals
ok(!/storage_path|\.mp4|\.webp|movekit\/v2|sha256":\s*"[0-9a-f]{64}",\s*"bytes"/.test(json),'no media paths/digests');
ok(!/PRIVATE KEY|BEGIN [A-Z ]*KEY|public_key_spki|value_base64|tk-private-review|C:\\\\|eligibility/.test(json),
  'no keys, signatures, private paths or private manifest fields');
ok(!/RELEASE_APPROVED|OWNER_APPROVED|"reviewed":\s*true|"active":\s*true|"reviewed_at":\s*"/.test(json),'no approval marker');
ok(Buffer.byteLength(json)<200000,'compact');

// ---- 6. committed packet == regenerated packet (fail closed when missing)
ok(fs.existsSync(P.PACKET_FILE),'docs/generated packet committed (run: node tools/tk614_original226_review_packet.cjs --write)');
ok(P.verifyReviewPacket(JSON.parse(fs.readFileSync(P.PACKET_FILE,'utf8')),catalogBytes),'committed packet verifies');

// ---- 7. future owner release record: fail closed
const valid=S.syntheticRelease226Record(packet);
eq(P.releaseRecordProblems(valid,packet),[],'GREEN: complete synthetic owner record');
const tpl=P.buildReleaseRecordTemplate(packet);
{const pr=P.releaseRecordProblems(tpl,packet);
 for(const c of ['RELEASE_RECORD_NOT_OWNER_APPROVED','RELEASE_RECORD_PARTIAL_APPROVAL_BLOCKED',
   'RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID','RELEASE_RECORD_DECISION_ID_INVALID','RELEASE_RECORD_APPROVED_BY_INVALID'])
   has(pr,c,'PENDING template '+c);}
ok(tpl.batches.every(b=>b.status==='PENDING_OWNER_REVIEW')&&tpl.status==='PENDING_OWNER_REVIEW','template is PENDING');
const rec=(f)=>{const r=structuredClone(valid);f(r);return P.releaseRecordProblems(r,packet);};
for(let i=0;i<10;i++)has(rec(r=>{r.batches[i].status='PENDING_OWNER_REVIEW';}),'RELEASE_RECORD_PARTIAL_APPROVAL_BLOCKED',
  'partial approval: batch '+(i+1)+' pending');
has(rec(r=>{r.batches[3].status='REJECTED';}),'RELEASE_RECORD_PARTIAL_APPROVAL_BLOCKED','one rejected batch');
has(rec(r=>{r.batches.pop();}),'RELEASE_RECORD_BATCHES_INCOMPLETE','9 batches');
has(rec(r=>{r.batches=r.batches.slice(0,9).concat(r.batches.slice(0,1));}),'RELEASE_RECORD_BATCH_DIGEST_MISMATCH','duplicated batch');
has(rec(r=>{r.batches[5].batch_sha256=packet.batches[4].batch_sha256;}),'RELEASE_RECORD_BATCH_DIGEST_MISMATCH','wrong batch sha');
has(rec(r=>{r.batches[9].through='TK-000227';}),'RELEASE_RECORD_BATCH_DIGEST_MISMATCH','range creeps into 356');
has(rec(r=>{r.review_packet.all_sha256='e'.repeat(64);}),'RELEASE_RECORD_PACKET_DIGEST_MISMATCH','packet sha');
has(rec(r=>{r.review_packet.source_catalog_sha256='d'.repeat(64);}),'RELEASE_RECORD_PACKET_DIGEST_MISMATCH','catalog sha');
has(rec(r=>{r.media_grants=1;}),'RELEASE_RECORD_MEDIA_GRANT_FORBIDDEN');
has(rec(r=>{r.media_access='RELEASED';}),'RELEASE_RECORD_MEDIA_GRANT_FORBIDDEN');
has(rec(r=>{r.binding_kind='FK_AND_MEDIA';}),'RELEASE_RECORD_SCOPE_NOT_FK_IDENTITY_ONLY');
has(rec(r=>{r.status='RELEASE_APPROVED';}),'RELEASE_RECORD_NOT_OWNER_APPROVED','generic RELEASE_APPROVED is not an owner record');
has(rec(r=>{r.schema='trainingskompas-movekit-v2-release/1.0';}),'RELEASE_RECORD_SCHEMA_INVALID');
has(rec(r=>{r.decision_id=contentApproval.decision_id;}),'RELEASE_RECORD_DECISION_ID_INVALID','356 approval is not transferable');
has(rec(r=>{r.decision_id='TK614-OWNER-STAGE-20261108-CHAT02';}),'RELEASE_RECORD_DECISION_ID_INVALID','stage decision is not a review');
has(rec(r=>{r.evidence.license_evidence_sha256=null;}),'RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID','no license evidence');
has(rec(r=>{r.evidence.source_evidence_sha256='a'.repeat(64);}),'RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID','placeholder evidence');
has(rec(r=>{r.evidence.owner_review_evidence_sha256=packet.totals.all_sha256;}),'RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID',
  'the packet itself is not evidence');
has(rec(r=>{r.evidence.license_evidence_sha256=r.evidence.source_evidence_sha256;}),'RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID',
  'one digest cannot stand for two evidence kinds');
has(rec(r=>{r.batches[2].evidence_sha256=null;}),'RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID','batch evidence missing');
has(rec(r=>{r.batches[2].evidence_sha256=packet.batches[2].batch_sha256;}),'RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID',
  'batch digest is not evidence');
has(rec(r=>{r.batches[6].reviewed_by='';}),'RELEASE_RECORD_REVIEWER_INVALID');
has(rec(r=>{r.batches[6].reviewed_at='2026-11-10T00:00:00.000Z';}),'RELEASE_RECORD_REVIEW_TIMESTAMP_INVALID','review after approval');
has(rec(r=>{r.approved_at='yesterday';}),'RELEASE_RECORD_APPROVED_AT_INVALID');
has(rec(r=>{r.media_grant_ids=['x'];}),'RELEASE_RECORD_SHAPE_INVALID','extra key');
has(rec(r=>{r.batches[0].media='video';}),'RELEASE_RECORD_SHAPE_INVALID','extra batch key');
eq(P.releaseRecordProblems(undefined,packet),['RELEASE_RECORD_MISSING']);
eq(P.releaseRecordProblems(valid,null),['REVIEW_PACKET_REQUIRED']);
eq(P.releaseRecordProblems(valid,{...packet,batches:packet.batches.slice(0,9)}),['REVIEW_PACKET_REQUIRED']);

// ---- 8. integration with the admin release gate (product code)
// MEDIA scope (released_batches, 15 x 227..582) and FK-identity scope
// (original_226_fk_identity_release) are separate since the 2026-11-09 owner decision.
const D=require('../tools/tk614_original226_owner_decision.cjs');
const LICENSE_BOUND=D.repoOwnerDecision().license.file_sha256!==null;
const SD={ownerDecision:S.SYNTHETIC_OWNER_DECISION};
const addMedia226=g=>({...g,released_batches:[...g.released_batches,{batch:16,from:'TK-000001',through:'TK-000226',count:226}]});
const withRecord=(g,record)=>({...g,[P.RECORD_KEY]:record});
ok(P.RECORD_KEY in repoGates,'real repo gates carry the separate FK-only owner record');
eq(repoGates[P.RECORD_KEY].decision_id,D.DECISION_ID);
eq(R.original226Released(repoGates),LICENSE_BOUND,'repo FK-only record valid only once the license sha256 is bound');
eq(R.activationBlockers(repoGates),LICENSE_BOUND?[]:['ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES'],
  'owner fingerprint pinned: metadata readiness is not a signed B activation');
eq(R.original226Released(addMedia226(repoGates)),false,'RED: appending 001..226 to MEDIA released_batches is rejected');
eq(R.original226Released(addMedia226(S.SYNTHETIC_RELEASE_GATES),SD),false,'RED: media mixing rejected even with a bound record');
eq(R.original226Released(withRecord(S.SYNTHETIC_RELEASE_GATES,tpl),SD),false,'PENDING template is not a release');
eq(R.original226Released(withRecord(S.SYNTHETIC_RELEASE_GATES,valid),SD),false,
  'RED: structurally valid record with synthetic evidence is not bound to the owner decision');
{const r=structuredClone(S.SYNTHETIC_RELEASE_GATES[P.RECORD_KEY]);r.batches[0].status='PENDING_OWNER_REVIEW';
 eq(R.original226Released(withRecord(S.SYNTHETIC_RELEASE_GATES,r),SD),false,'partial approval is not a release');}
eq(R.original226Released(S.SYNTHETIC_RELEASE_GATES,SD),true,'GREEN: 15/1164 media scope + decision-bound FK-only record');
eq(R.activationBlockers(S.SYNTHETIC_RELEASE_GATES,undefined,SD),[],
  'public key pin alone does not sign synthetic approval');
eq(R.original226Released(S.SYNTHETIC_RELEASE_GATES,{...SD,reviewPacket:null}),false,'no packet -> fail closed');
ok(Object.isFrozen(R.TRUSTED_OWNER_KEY_SHA256)&&R.TRUSTED_OWNER_KEY_SHA256.length===1&&
  R.TRUSTED_OWNER_KEY_SHA256[0]==='9a4e3f7ee3cab1792fcc00efca3992c10bb251c0840f47c0a0a224106f280c63','one public owner key fingerprint pinned');

// ---- 9. the 356 stay unaffected
eq(repoGates.status,'RELEASE_APPROVED');
eq(repoGates.released_batches.length,15);
eq([repoGates.released_batches[0].from,repoGates.released_batches[14].through],['TK-000227','TK-000582']);
eq(repoGates.released_batches.reduce((s,b)=>s+b.count,0),356,'released_batches cover exactly the 356');
ok(repoGates.released_batches.every(b=>Number(b.from.slice(3))>=227),'no released batch below 227');
eq(repoGates.content_approval.decision_id,'TK504-20261105-OWNER-BATCHES-01-15');
eq([contentApproval.scope.first_catalog_id,contentApproval.scope.last_catalog_id,contentApproval.scope.content_approved_count],
  ['TK-000227','TK-000582',356],'prior owner content approval scope is 227..582 only');
ok(['supplier_media_license','release_authorization','live_account_entitlements'].every(x=>
  contentApproval.scope.excluded_sections.includes(x)),'prior 356 approval excluded license/release/entitlements');
eq(packet.evidence.prior_356_owner_approval_transferable,false);

// ---- 10. evidence claims in the review doc are true in the repo
{const orig=repoGates.entries.filter(e=>Number(String(e.catalog_id).slice(3))<=226);
 eq(orig.length,452,'452 media entries (video+poster) for 001..226 in the release gates file');
 eq(new Set(orig.map(e=>e.catalog_id)).size,226);
 ok(orig.every(e=>e.reviewed===true&&e.upload_verified===true),'media entries marked reviewed/upload_verified');
 eq([...new Set(orig.map(e=>e.review_reference))],['TK504-20261107-356'],'review reference is the "-356" label');
 eq([...new Set(orig.map(e=>e.media_type))].sort(),['poster','video']);
 eq(repoGates.entries.length,1164);}
ok(!/licen[cs]e|rights|copyright/i.test(catalogBytes.toString('utf8')),'public catalog carries no license/rights field');
ok(read('docs/MOVEKIT_MEDIA_SCALE_GATE_2026-10-01.md').includes('MoveKit License Agreement v1.0'),'license reference documented');
ok(read('docs/TK504_MEDIA_TRANSFER_EVIDENCE_20261105.md').includes('Controleer afzonderlijk of de aankoop/licentiehouder'),
  'license-holder check is still open in the evidence doc');
ok(/eligibility==='existing-catalog-not-authorized-for-new-binding'/.test(read('tools/tk614_original226_batch25_preflight.cjs')),
  'stage plan requires the 226 to be marked not-authorized-for-new-binding');
{const doc=read('docs/TK614_PHASE_B_OWNER_REVIEW_20261109.md');
 for(const s of ['PENDING_OWNER_REVIEW','NOT_RELEASED','FK_IDENTITY_BINDING_ONLY','TK614-OWNER-STAGE-20261108-CHAT02',
   P.STAGED_CONTRACT.post_stage_registry_sha256,'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES',
   'ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY','TK504-20261107-356'])ok(doc.includes(s),'review doc mentions '+s);
 ok(!/RELEASE_APPROVED voor (de )?(originele )?226|fase B (is )?goedgekeurd/i.test(doc),'doc claims no approval');}

// ---- 11. staged production contract (phase A committed, B blocked)
eq(packet.staged_contract,{...P.STAGED_CONTRACT});
{const m=R.DECISION_RE.exec(P.STAGED_CONTRACT.phase_a_decision_id);ok(m&&m[1]==='STAGE','phase A id is a valid prior STAGE decision');}
ok(HEX64.test(P.STAGED_CONTRACT.post_stage_registry_sha256));
eq([P.STAGED_CONTRACT.original_226_bindings_present,P.STAGED_CONTRACT.original_226_binding_active,
  P.STAGED_CONTRACT.original_226_reviewed_at,P.STAGED_CONTRACT.original_226_resolvable,
  P.STAGED_CONTRACT.existing_356_active_reviewed,P.STAGED_CONTRACT.phase_b_activate],[226,false,null,0,356,'NOT_APPROVED_BLOCKED']);
ok(/not_reverified_offline/.test(P.STAGED_CONTRACT.provenance),'production facts are labelled as reported, not re-verified');

// ---- 12. no unintended ACTIVATE: generator is read-only, offline and keyless
{const src=read('tools/tk614_original226_review_packet.cjs');
 const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 ok(!/process\.env/.test(src),'no environment variables');
 eq([...code.matchAll(/require\('([^']+)'\)/g)].map(m=>m[1]),['node:fs','node:path','node:crypto',
   './tk614_original226_batch25_preflight.cjs'],'no network/db/child_process modules');
 ok(!/\b(INSERT\s+INTO|UPDATE\s+public|DELETE\s+FROM|GRANT|REVOKE|ALTER\s+TABLE|COMMIT;)|active\s*=(?!=)\s*true|reviewed_at\s*=(?!=)/.test(code),
   'no SQL writes, no activation');
 ok(!/generateKeyPair|createPrivateKey|crypto\.sign\(|signApproval|TRUSTED_OWNER_KEY_SHA256/.test(code),'no key generation or signing');
 eq((code.match(/writeFileSync/g)||[]).length,1,'single write path (--write)');
 ok(!/openSync|appendFileSync|unlinkSync|rmSync|renameSync/.test(code));
 ok(!/MOVEKIT_V2_RELEASE_GATES\.json/.test(code),'generator never touches MOVEKIT_V2_RELEASE_GATES.json');}
for(const bad of [['--activate'],['--approve'],['--release'],['--reviewed'],['--grant-media'],['--check','--write'],['x']])
  throwsCode(()=>P.run(bad,{stdout:()=>{}}),'USAGE','CLI rejects '+bad.join(' '));
{let o='';const r=P.run(['--record-template'],{stdout:x=>{o+=x;}});
 eq(r.status,'PENDING_RECORD_TEMPLATE_PRINTED_AUTHORISES_NOTHING');
 const t=JSON.parse(o);ok(t.status==='PENDING_OWNER_REVIEW'&&P.releaseRecordProblems(t,packet).length>0,'printed template never validates');}
{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tk614-review-packet-')),f=path.join(dir,'packet.json');
 try{
  const w=P.run(['--write'],{stdout:()=>{},packetFile:f});
  eq([w.status,w.rows,w.batches,w.all_sha256,w.database_writes_performed],
    ['REVIEW_PACKET_WRITTEN_AUTHORISES_NOTHING',226,10,packet.totals.all_sha256,false]);
  eq(fs.readFileSync(f,'utf8'),json,'written bytes == serialized packet');
  eq(P.run(['--check'],{stdout:()=>{},packetFile:f}).status,'REVIEW_PACKET_VERIFIED_AUTHORISES_NOTHING');
  const t=JSON.parse(json);t.batches[0].rows[0].review_status='OWNER_APPROVED';fs.writeFileSync(f,JSON.stringify(t));
  throwsCode(()=>P.run(['--check'],{stdout:()=>{},packetFile:f}),'REVIEW_PACKET_TAMPERED','CLI check catches tamper');
  throwsCode(()=>P.run(['--check'],{stdout:()=>{},packetFile:path.join(dir,'missing.json')}),'REVIEW_PACKET_FILE_MISSING');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}}
ok(fs.readFileSync(GATES_FILE).equals(gatesBytesBefore),'MOVEKIT_V2_RELEASE_GATES.json byte-identical after all runs');

console.log('TK614 original-226 owner review packet: '+checks+
  ' assertions PASS; review packet stays PENDING; bulk owner decision separate; no real B activation');
