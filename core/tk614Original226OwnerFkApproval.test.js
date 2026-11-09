'use strict';
// TK614/#603 -- OWNER BULK FK-IDENTITY APPROVAL for the ORIGINAL 226 (2026-11-09,
// decision TK614-OWNER-REVIEW226-20261109-BULK01, issue #614 comment 6733264842).
// RED/GREEN on the real sidecar, the real release gates and the real review packet.
// Separation under test: MEDIA scope (released_batches: exactly 15 x 227..582, 1164
// entries) vs FK-identity scope (original_226_fk_identity_release). No DB, Docker,
// network, credentials, keys or private file contents.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const D=require('../tools/tk614_original226_owner_decision.cjs');
const P=require('../tools/tk614_original226_review_packet.cjs');
const R=require('../tools/tk614_original226_admin_release.cjs');
const S=require('../tools/tk614_admin_release_docker_smoke.cjs');
const L=require('./tk504BatchReleaseLedger.js');
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const GATES_FILE=path.join(ROOT,'docs','generated','MOVEKIT_V2_RELEASE_GATES.json');
const gatesText=fs.readFileSync(GATES_FILE,'utf8').replace(/\r\n/g,'\n');
const gates=JSON.parse(gatesText);
const decisionText=fs.readFileSync(D.DECISION_FILE,'utf8').replace(/\r\n/g,'\n');
const decision=JSON.parse(decisionText);
const catalogBytes=fs.readFileSync(path.join(ROOT,'exercise-catalog.json'));
const packet=P.buildReviewPacket(catalogBytes);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const pad=n=>String(n).padStart(6,'0');
const HEX64=/^[0-9a-f]{64}$/;

let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const throwsCode=(fn,code,m)=>{assert.throws(fn,e=>e.code===code||e.message===code,m||code);checks++;};
const has=(list,code,m)=>ok(Array.isArray(list)&&list.includes(code),(m||code)+' -> '+JSON.stringify(list));

// ---- 0. pinned facts (computed OUTSIDE Node: PowerShell Get-FileHash over the exact LF texts)
const PIN=Object.freeze({
  catalog:'b278938498ffd0d713a4ad23184bfdd037fab65fd2ce5c9e0f7662a6e96bf4af',
  packet:'bb7badb23244ad47659b8170e9f154aa7bbcfc7fd69c1c1c4b42b2a65bd98487',
  source:'494ed563dd063369aca56e2f8af3381b6502c23ef02b779915ff9036041243b0',
  owner:'b55041cfdbfb87356183baad6b4b3cdf0c34ac011f4491f126dfee659e424b73',
  licenseFile:'35f84f23691b4e11521decb541a7738d6ba12a8fd18eb9b4046db97dd69fb0ed',
  license:'6d92f6774cfa2e30ec7c367ae8b8e5bece9a4f7d6a17510e292f29303e468b19',
  batches:['102f8a39432ab7f5beb1f6b521064a8de6d7142a9f15e3aa77ee9d3de0cf4a48',
    '22547890b0850d3c16d731cb1ae01bb5930f6cfb9fd77fa4904cbc6741f608c9',
    'a933b9fcc99012f030d51bccf278cec8b237941be54cba75633747cdc4226c24',
    '6aebf38229cc8cf78a99ea6c1082ea919d16470ac112bce8011e8cd2baa57ae0',
    'db82e1b9473ae4a601b4d145b09cdb5d7caf2c3d5fde7f40a0202f86b2a94ebb',
    '531359930215d16972d99aa3fc2222b6433f59591e60f8ba5d13168b15a328fb',
    'f72f2b8382ce172d439d78fd18e87c164341c0bb06c3c907806393e775e5e76d',
    '42de1a07fc163c6ab8f2df637b958a4b49366ca984fd7dbce50733161692860d',
    'ac7b6aa55e74c66238fb467b5d28ccf423ae85337d343de12df9c18431445c34',
    '565d6904ed44be869f6bc22d4929b175def066348f18595f195ee38c21dce5b9']});
const STATEMENT='Ja bevestig ik, ik ben de eigenaar van tk en de koper van de movekit';
eq(packet.generated_from.source_catalog_sha256,PIN.catalog,'pinned public exercise catalog');
eq(packet.totals.all_sha256,PIN.packet,'pinned review packet total');

// ---- 1. decision sidecar: exact owner statement, issue binding, scope, boundaries
eq([decision.schema,decision.decision_id,decision.status],
  ['tk614-original226-owner-fk-approval-decision/1.0','TK614-OWNER-REVIEW226-20261109-BULK01','OWNER_EXPLICIT_BULK_FK_IDENTITY_APPROVAL']);
eq(decision.owner_statement_verbatim,STATEMENT,'owner statement verbatim, byte-exact');
eq(D.OWNER_STATEMENT,STATEMENT);
eq(decision.issue_comment_id,'6733264842');
eq(decision.issue_comment_url,'https://github.com/steentje76/maurice-training/issues/614#issuecomment-6733264842');
ok(P.RECORD_DECISION_RE.test(decision.decision_id),'decision id has the REVIEW226 shape');
eq(decision.limitations.per_item_reading_confirmed,false,'no per-item reading confirmed');
eq(decision.limitations.license_independently_verified,false,'license not independently verified');
eq(decision.limitations.license_holder_match,'OWNER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED');
eq(decision.limitations.signed_cryptographic_activate,false,'no signed ACTIVATE');
eq(decision.limitations.trusted_owner_key_pinned,false);
eq(decision.limitations.review_packet_status_unchanged,'PENDING_OWNER_REVIEW');
eq(decision.limitations.prior_356_owner_approval_transferable,false);
eq(decision.authorizes,{fk_identity_registration_release_record:true,media_grants:false,media_access:false,new_media_rights:false,
  released_batches_change:false,binding_activation_without_signed_activate:false,database_writes:false});
eq(decision.scope.binding_kind,'FK_IDENTITY_BINDING_ONLY');
// 10 batches, 9 x 25 + 1, 226 unique consecutive IDs
eq(decision.batches.length,10);
eq(decision.batches.map(b=>b.count),[25,25,25,25,25,25,25,25,25,1]);
{const ids=decision.batches.flatMap(b=>{const o=[];for(let n=Number(b.from.slice(3));n<=Number(b.through.slice(3));n++)o.push('TK-'+pad(n));return o;});
 eq(ids.length,226);eq(new Set(ids).size,226,'226 unique catalog IDs');
 eq(ids,Array.from({length:226},(_,i)=>'TK-'+pad(i+1)),'TK-000001..TK-000226, no gap, nothing from 227..582');}
eq(decision.batches.map(b=>b.batch_sha256),packet.batches.map(b=>b.batch_sha256),'bound to the 10 packet batch digests');
eq([decision.review_packet.all_sha256,decision.review_packet.source_catalog_sha256,decision.review_packet.status],
  [PIN.packet,PIN.catalog,'PENDING_OWNER_REVIEW']);

// ---- 2. real evidence digests, canonical hashing pinned independently
eq(decision.evidence.source_evidence_sha256,PIN.source,'source evidence');
eq(decision.evidence.owner_review_evidence_sha256,PIN.owner,'owner review evidence');
eq(decision.batches.map(b=>b.evidence_sha256),PIN.batches,'10 batch evidence digests');
eq(D.sourceEvidenceSha256(packet),PIN.source,'Node canonical hashing == independent computation (source)');
eq(D.ownerReviewEvidenceSha256(packet),PIN.owner,'(owner)');
eq(packet.batches.map(b=>D.batchEvidenceSha256(PIN.owner,b)),PIN.batches,'(batches)');
eq(D.licenseEvidenceSha256(PIN.licenseFile),PIN.license,'(license)');
{const t=D.evidenceText(D.EVIDENCE_SCHEMA.owner,[['decision_id',D.DECISION_ID],['status',D.DECISION_STATUS],
   ['binding_kind',P.BINDING_KIND],['media_grants',0],['issue_comment_url',D.ISSUE_COMMENT_URL],
   ['owner_statement',STATEMENT],['review_packet_all_sha256',PIN.packet]]);
 eq(Buffer.byteLength(t,'utf8'),470,'owner evidence text: 8 LF-terminated lines, 470 bytes');
 ok(t.endsWith('\n')&&!t.includes('\r')&&t.split('\n').length===9);
 eq(sha(Buffer.from(t,'utf8')),PIN.owner);}
throwsCode(()=>D.evidenceText('h',[['k','a\nb']]),'EVIDENCE_VALUE_INVALID','no multi-line values');
const all=[PIN.source,PIN.owner,PIN.license,...PIN.batches];
eq(new Set(all).size,13,'13 distinct evidence digests');
ok(all.every(h=>HEX64.test(h)&&!/^(.)\1{63}$/.test(h)),'no placeholder digests');
ok(all.every(h=>h!==PIN.packet&&h!==PIN.catalog&&!packet.batches.some(b=>b.batch_sha256===h)),'evidence != packet/source digests');
const LICENSE_BOUND=decision.license.file_sha256!==null;
if(LICENSE_BOUND){
  eq(decision.license.file_sha256,PIN.licenseFile,'license file sha256 pinned (hash only, contents never copied)');
  eq(decision.evidence.license_evidence_sha256,PIN.license);
  eq(decision.license.hash_status,D.LICENSE_HASH_BOUND);
}else{
  eq([decision.license.hash_status,decision.evidence.license_evidence_sha256],[D.LICENSE_HASH_PENDING,null]);
}
eq([decision.license.location,decision.license.contents_in_git],['PRIVATE_LOCAL_OUTSIDE_GIT',false]);

// ---- 3. sidecar verification GREEN + tamper/forgery RED
eq(D.decisionProblems(decision,packet),LICENSE_BOUND?[]:['OWNER_DECISION_LICENSE_EVIDENCE_PENDING'],'committed sidecar verifies');
eq(D.canonicalJson(decision),D.canonicalJson(D.buildOwnerDecision(packet,decision.license.file_sha256)),'sidecar == deterministic builder');
const tamper=(f,code,m)=>{const d=structuredClone(decision);f(d);has(D.decisionProblems(d,packet),code,m);};
const T='OWNER_DECISION_TAMPERED_OR_MISMATCHED';
tamper(d=>{d.owner_statement_verbatim='Ja, ik keur het goed';},T,'statement altered');
tamper(d=>{d.owner_statement_verbatim=STATEMENT+'.';},T,'statement punctuation');
tamper(d=>{d.issue_comment_url=d.issue_comment_url.replace('6733264842','6733264843');},T,'other comment');
tamper(d=>{d.decision_id='TK614-OWNER-REVIEW226-20261109-BULK02';},T,'decision id');
tamper(d=>{d.status='RELEASE_APPROVED';},T,'generic status');
tamper(d=>{d.limitations.per_item_reading_confirmed=true;},T,'per-item reading claimed');
tamper(d=>{d.limitations.license_independently_verified=true;},T,'license verification claimed');
tamper(d=>{d.limitations.signed_cryptographic_activate=true;},T,'signed activate claimed');
tamper(d=>{d.authorizes.media_grants=true;},T,'media grant smuggled in');
tamper(d=>{d.evidence.source_evidence_sha256='a'.repeat(64);},T,'generic placeholder evidence');
tamper(d=>{d.evidence.owner_review_evidence_sha256=crypto.randomBytes(32).toString('hex');},T,'random 64-hex evidence');
tamper(d=>{d.batches[4].evidence_sha256=d.batches[5].evidence_sha256;},T,'batch evidence swapped');
tamper(d=>{d.batches.pop();},T,'9 batches');
tamper(d=>{d.batches[9].through='TK-000227';},T,'range creeps into 356');
tamper(d=>{d.review_packet.status='OWNER_APPROVED';},T,'packet status rewritten');
tamper(d=>{d.extra='x';},T,'extra key');
tamper(d=>{d.license.file_sha256=PIN.packet;},'OWNER_DECISION_LICENSE_EVIDENCE_INVALID','packet digest is not a license hash');
tamper(d=>{d.license.file_sha256='f'.repeat(64);},'OWNER_DECISION_LICENSE_EVIDENCE_INVALID','placeholder license hash');
tamper(d=>{d.license.file_sha256=sha(Buffer.alloc(0));},'OWNER_DECISION_LICENSE_EVIDENCE_INVALID','empty-file hash');
tamper(d=>{d.license.file_sha256='nope';},'OWNER_DECISION_LICENSE_EVIDENCE_INVALID');
tamper(d=>{d.license.file_sha256=crypto.randomBytes(32).toString('hex');},T,'other license hash without matching evidence');
if(LICENSE_BOUND)tamper(d=>{d.evidence.license_evidence_sha256=PIN.source;},T,'one digest for two evidence kinds');
eq(D.decisionProblems(null,packet),['OWNER_DECISION_MISSING']);
eq(D.decisionProblems(decision,null),['REVIEW_PACKET_REQUIRED']);
throwsCode(()=>D.buildOwnerDecision(packet,'0'.repeat(64)),'LICENSE_FILE_SHA256_INVALID');

// ---- 4. FK-only release record in the gates: exactly the record derived from the decision
const record=gates[P.RECORD_KEY];
ok(record&&typeof record==='object','original_226_fk_identity_release present');
eq([record.schema,record.status,record.binding_kind,record.media_grants,record.media_access],
  ['tk614-original226-fk-identity-release/1.0','OWNER_APPROVED_FK_IDENTITY_ONLY','FK_IDENTITY_BINDING_ONLY',0,'NOT_RELEASED']);
eq(D.canonicalJson(record),D.canonicalJson(D.buildReleaseRecord(decision,packet)),'record == buildReleaseRecord(decision)');
eq(record.batches.map(b=>b.evidence_sha256),PIN.batches);
ok(record.batches.every(b=>b.status==='OWNER_APPROVED'),'all 10 batches OWNER_APPROVED (collective owner decision)');
eq(Object.keys(record),['schema','status','decision_id','approved_by','approved_at','binding_kind','media_grants','media_access',
  'review_packet','evidence','batches'],'releaseRecordProblems() structure');
eq(P.releaseRecordProblems(record,packet),LICENSE_BOUND?[]:['RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID']);
eq(D.recordBindingProblems(record,decision,packet),LICENSE_BOUND?[]:
  ['OWNER_DECISION_LICENSE_EVIDENCE_PENDING','RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID']);
const rtamper=(f,code,m)=>{const r=structuredClone(record);f(r);has(D.recordBindingProblems(r,decision,packet),code,m);};
const NB='RELEASE_RECORD_NOT_BOUND_TO_OWNER_DECISION';
rtamper(r=>{r.evidence.source_evidence_sha256=crypto.randomBytes(32).toString('hex');},NB,'forged source evidence');
rtamper(r=>{r.evidence.owner_review_evidence_sha256=sha('tk614-synthetic-smoke-evidence-owner-review');},NB,'synthetic evidence');
rtamper(r=>{r.batches[2].evidence_sha256=crypto.randomBytes(32).toString('hex');},NB,'forged batch evidence');
rtamper(r=>{[r.batches[0].evidence_sha256,r.batches[1].evidence_sha256]=[r.batches[1].evidence_sha256,r.batches[0].evidence_sha256];},
  NB,'batch evidence swapped');
rtamper(r=>{r.decision_id='TK614-OWNER-REVIEW226-20261109-OTHER1';},NB,'other decision id');
rtamper(r=>{r.approved_by='Someone Else';},NB,'other approver');
rtamper(r=>{r.batches[7].status='PENDING_OWNER_REVIEW';},'RELEASE_RECORD_PARTIAL_APPROVAL_BLOCKED','partial approval');
rtamper(r=>{r.media_grants=1;},'RELEASE_RECORD_MEDIA_GRANT_FORBIDDEN');
rtamper(r=>{r.media_access='RELEASED';},'RELEASE_RECORD_MEDIA_GRANT_FORBIDDEN');
rtamper(r=>{r.status='RELEASE_APPROVED';},'RELEASE_RECORD_NOT_OWNER_APPROVED');
rtamper(r=>{r.batches.pop();},'RELEASE_RECORD_BATCHES_INCOMPLETE');
rtamper(r=>{r.media_entries=[];},'RELEASE_RECORD_SHAPE_INVALID');
has(D.recordBindingProblems(S.syntheticRelease226Record(packet),decision,packet),NB,'shape-valid synthetic record is no proof');
has(D.recordBindingProblems(undefined,decision,packet),'RELEASE_RECORD_MISSING');

// ---- 5. MEDIA scope unchanged: 15 batches 227..582, 1164 entries, ledger-exact
eq(gates.status,'RELEASE_APPROVED');
eq(Object.keys(gates),['schema','status','inventory_sha256','poster_digest_sha256','content_approval','released_batches','entries',
  P.RECORD_KEY],'only ONE new top-level field');
eq(gates.released_batches.length,15,'exactly 15 media batches');
eq(gates.released_batches,L.releasedHeader(15).released_batches,'media batches == canonical 356 ledger');
eq(gates.content_approval,L.releasedHeader(15).content_approval);
ok(gates.released_batches.every(b=>Number(b.from.slice(3))>=227),'no media batch for 001..226');
eq(gates.released_batches.reduce((s,b)=>s+b.count,0),356);
eq(gates.entries.length,1164,'1164 media entries');
{const sc=L.releasedScope(gates);eq([sc.batch,sc.new_count,sc.total,sc.through],[15,356,582,'TK-000582'],'ledger releasedScope');}
eq(R.mediaGateProblems(gates),[]);
// The FK record is never read as media scope: removing it leaves the media scope identical.
{const g={...gates};delete g[P.RECORD_KEY];eq(L.releasedScope(g),L.releasedScope(gates),'FK record has no media effect');}

// ---- 6. admin release gate: approved owner content, still NO_PINNED_OWNER_KEY
eq(R.original226Released(gates),LICENSE_BOUND,'FK-only owner release recognised once license evidence is bound');
eq(R.activationBlockers(gates),LICENSE_BOUND?[]:['ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES']);
ok(Object.isFrozen(R.TRUSTED_OWNER_KEY_SHA256)&&R.TRUSTED_OWNER_KEY_SHA256.length===1&&
  R.TRUSTED_OWNER_KEY_SHA256[0]==='9a4e3f7ee3cab1792fcc00efca3992c10bb251c0840f47c0a0a224106f280c63','only owner PUBLIC pin configured');
ok(read('tools/tk614_original226_admin_release.cjs').includes("const TRUSTED_OWNER_KEY_SHA256=Object.freeze(['9a4e3f7ee3cab1792fcc00efca3992c10bb251c0840f47c0a0a224106f280c63']);"));
// RED: the old unsafe model (append 001..226 to MEDIA released_batches) is now itself a rejection.
{const g={...gates,released_batches:[...gates.released_batches,{batch:16,from:'TK-000001',through:'TK-000226',count:226,
   display_sha256:'c'.repeat(64)}]};
 eq(R.original226Released(g),false,'RED: media mixing rejected');
 has(R.mediaGateProblems(g),'MEDIA_RELEASED_BATCHES_NOT_EXACTLY_15');
 has(R.mediaGateProblems(g),'MEDIA_RELEASE_SCOPE_INCLUDES_ORIGINAL_226_OR_INVALID');
 has(R.mediaGateProblems(g),'MEDIA_LEDGER_356_INTEGRITY_FAILED');}
{const g=structuredClone(gates);g[P.RECORD_KEY].evidence.source_evidence_sha256='a'.repeat(64);
 eq(R.original226Released(g),false,'RED: placeholder evidence in the gates');}
{const g=structuredClone(gates);g.status='BLOCKED_NOT_REVIEWED';eq(R.original226Released(g),false,'root status must stay RELEASE_APPROVED');}
{const g=structuredClone(gates);g.entries=g.entries.slice(0,1163);eq(R.original226Released(g),false,'356 media ledger integrity');}
{const g=structuredClone(gates);delete g[P.RECORD_KEY];has(R.original226ReleaseProblems(g),'RELEASE_RECORD_MISSING');}
eq(R.original226Released(gates,{ownerDecision:null}),false,'no decision -> fail closed');
eq(R.original226Released(gates,{ownerDecision:S.SYNTHETIC_OWNER_DECISION}),false,'record bound to the real, not a synthetic, decision');

// ---- 7. review packet stays PENDING_OWNER_REVIEW (owner approval is a separate record)
{const committed=JSON.parse(fs.readFileSync(P.PACKET_FILE,'utf8'));
 ok(P.verifyReviewPacket(committed,catalogBytes),'committed packet unchanged');
 eq([committed.status,committed.review_counts.owner_approved],['PENDING_OWNER_REVIEW',0]);
 ok(committed.batches.every(b=>b.status==='PENDING_OWNER_REVIEW'));}

// ---- 8. license binding (pure + CLI): hash only, targeted single-line change, no contents
{const pendingText=LICENSE_BOUND?gatesText.replace('"license_evidence_sha256": "'+PIN.license+'"','"license_evidence_sha256": null'):gatesText;
 ok(pendingText.split('"license_evidence_sha256": null').length===2,'pending gates text has exactly one license slot');
 const synth=sha('tk614-test-only-synthetic-license-bytes');
 const r=D.bindLicenseFileSha256({licenseFileSha256:synth,packet,gatesText:pendingText});
 eq(r.license_evidence_sha256,D.licenseEvidenceSha256(synth));
 const a=pendingText.split('\n'),b=r.gatesText.split('\n');
 eq(a.length,b.length);eq(a.filter((l,i)=>l!==b[i]).length,1,'bind changes exactly one line of the gates file');
 const g2=JSON.parse(r.gatesText);
 eq([g2.released_batches,g2.entries.length,g2.status],[gates.released_batches,1164,'RELEASE_APPROVED'],'media untouched by bind');
 eq(D.decisionProblems(JSON.parse(r.decisionText),packet),[]);
 const real=D.bindLicenseFileSha256({licenseFileSha256:PIN.licenseFile,packet,gatesText:pendingText});
 if(LICENSE_BOUND){eq(real.gatesText,gatesText,'repo gates == bind(real license hash)');
   eq(D.canonicalJson(JSON.parse(real.decisionText)),D.canonicalJson(decision),'repo sidecar == bind(real license hash)');}
 throwsCode(()=>D.bindLicenseFileSha256({licenseFileSha256:PIN.packet,packet,gatesText:pendingText}),'LICENSE_FILE_SHA256_INVALID');
 throwsCode(()=>D.bindLicenseFileSha256({licenseFileSha256:'1'.repeat(64),packet,gatesText:pendingText}),'LICENSE_FILE_SHA256_INVALID');
 throwsCode(()=>D.bindLicenseFileSha256({licenseFileSha256:synth,packet,gatesText:r.gatesText}),'RELEASE_GATES_LICENSE_SLOT_NOT_FOUND',
   'cannot bind twice');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tk614-owner-fk-'));
 try{
  const df=path.join(tmp,'decision.json'),gf=path.join(tmp,'gates.json'),lf=path.join(tmp,'LICENSE.txt');
  const BODY='SYNTHETIC-TEST-LICENSE-BODY order 0000-TEST';
  fs.writeFileSync(df,D.serializeDecision(D.buildOwnerDecision(packet,null)));fs.writeFileSync(gf,pendingText);fs.writeFileSync(lf,BODY);
  let out='';const io={stdout:x=>{out+=x;},decisionFile:df,gatesFile:gf};
  eq(D.run(['--check'],io).problems,['OWNER_DECISION_LICENSE_EVIDENCE_PENDING','RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID']);
  const rep=D.run(['--bind-license',lf],io);
  eq([rep.status,rep.license_file_sha256,rep.database_writes_performed,rep.activation_executed],
    ['LICENSE_SHA256_BOUND_CONTENTS_NOT_COPIED',sha(Buffer.from(BODY)),false,false]);
  ok(!out.includes('SYNTHETIC-TEST-LICENSE-BODY')&&!out.includes('0000-TEST'),'license contents never printed');
  ok(!fs.readFileSync(df,'utf8').includes('0000-TEST')&&!fs.readFileSync(gf,'utf8').includes('0000-TEST'),'contents never copied');
  eq(D.run(['--check'],io).status,'OWNER_FK_RECORD_BOUND');
  throwsCode(()=>D.run(['--bind-license','LICENSE.txt'],io),'USAGE','relative path');
  throwsCode(()=>D.run(['--bind-license',path.join(tmp,'license.pdf')],io),'LICENSE_FILE_NAME_MISMATCH');
  throwsCode(()=>D.run(['--bind-license',path.join(ROOT,'LICENSE.txt')],io),'PRIVATE_LICENSE_INSIDE_REPOSITORY');
  throwsCode(()=>D.run(['--activate'],io),'USAGE');throwsCode(()=>D.run(['--check','x'],io),'USAGE');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}}
{let o='';const rep=D.run(['--check'],{stdout:x=>{o+=x;}});
 eq(rep.status,LICENSE_BOUND?'OWNER_FK_RECORD_BOUND':'OWNER_FK_RECORD_INCOMPLETE','repo --check');
 eq([rep.database_writes_performed,rep.activation_executed],[false,false]);}

// ---- 9. no secret text in Git; module stays pure and keyless
for(const [name,text] of [['sidecar',decisionText],['gates record',JSON.stringify(record)],
  ['doc',read('docs/TK614_ORIGINAL226_BULK_OWNER_FK_APPROVAL_20261109.md')]]){
  ok(!/order[_ -]?(id|number|nr)|ordernummer|license[_ -]?(key|id|number)|licentie(sleutel|nummer)|invoice|factuur/i.test(text),
    name+': no order/license identifiers');
  ok(!/C:\\\\?Movikit|complete-exercise-library-metadata/i.test(text),name+': no private path');
  ok(!/PRIVATE KEY|BEGIN [A-Z ]*KEY|public_key_spki|value_base64/.test(text),name+': no keys or signatures');
}
{const src=read('tools/tk614_original226_owner_decision.cjs');
 const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 ok(!/process\.env/.test(src),'no environment variables');
 eq([...code.matchAll(/require\('([^']+)'\)/g)].map(m=>m[1]),['node:fs','node:path','node:crypto','./tk614_original226_review_packet.cjs'],
   'no network/db/child_process modules');
 ok(!/generateKeyPair|createPrivateKey|crypto\.sign\(|signApproval/.test(code),'no key generation or signing');
 ok(!/INSERT\s+INTO|UPDATE\s+public|movekit_media_grants|released_batches\s*[.=]/.test(code),'no SQL, no media grants, never writes released_batches');
 ok(/sha\(fs\.readFileSync\(licensePath\)\)/.test(code)&&(code.match(/readFileSync\(licensePath/g)||[]).length===1&&
   !/licenseBytes|toString\([^)]*\)[^;\n]*licensePath/.test(code),'license bytes are only hashed');}
ok(read('docs/TK614_ORIGINAL226_BULK_OWNER_FK_APPROVAL_20261109.md').includes(D.DECISION_ID));

console.log('TK614 original-226 owner FK-only approval: '+checks+' assertions PASS; decision '+D.DECISION_ID+
  ', 10 batches/226 IDs, media scope 15/1164 unchanged, '+(LICENSE_BOUND?'record bound':'license hash PENDING')+
  ', public key fingerprint pinned; no real owner-signed B decision or DB activation');
