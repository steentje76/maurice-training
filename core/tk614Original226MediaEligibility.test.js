'use strict';
// TK504/#614 -- original-226 private media ELIGIBILITY GATE: exhaustive synthetic tests.
// Synthetic only: ephemeral Ed25519 test keys (never stored), fake UUIDs, stub fetch that
// throws on any network use. No real credential, device, media, DB or network.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const vm=require('node:vm'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
// PRODUCTION gate: real module, real pinned owner key. Synthetic keys must never pass here.
const G=require('../tools/tk614_original226_media_eligibility.cjs');
const M=require('../tools/tk614_original226_private_media_staging.cjs');
const P=require('../tools/tk614_original226_review_packet.cjs');
const broker=require('../netlify/functions/exercise-media-v2-url.js')._internal;
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const GATES_REL='docs/generated/MOVEKIT_V2_RELEASE_GATES.json';
const gates=JSON.parse(read(GATES_REL));
const gatesShaBefore=sha(read(GATES_REL).replace(/\r\n/g,'\n'));
const manifest=JSON.parse(read('docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json'));

let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const LOCK='ORIGINAL226_CUTOVER_LOCKED_IN_THIS_VERSION';

// ---- synthetic fully-green world (still must be DENY / 404)
const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const {privateKey:k1}=crypto.generateKeyPairSync('ed25519');
const {privateKey:k2}=crypto.generateKeyPairSync('ed25519');
const spki=k=>crypto.createPublicKey(k).export({format:'der',type:'spki'});
const fp1=sha(spki(k1));
// STRICTLY TEST-ONLY gate instance: the unmodified production source, compiled in THIS realm
// (vm.runInThisContext -> no cross-realm deepEqual issues) with a custom require that swaps
// only './tk614_original226_admin_release.cjs' for a fake carrying the ephemeral test key.
// The production module has no test mode, toggle, factory or key override; this lives here only.
const GATE_FILE=path.join(ROOT,'tools','tk614_original226_media_eligibility.cjs');
const ADMIN_FILE=path.join(ROOT,'tools','tk614_original226_admin_release.cjs');
function loadTestGate(ownerKeys){
  const realRequire=createRequire(GATE_FILE),realA=realRequire(ADMIN_FILE);
  const fakeA=Object.freeze({...realA,TRUSTED_OWNER_KEY_SHA256:Object.freeze([...ownerKeys])});
  const req=id=>realRequire.resolve(id)===ADMIN_FILE?fakeA:realRequire(id);
  const wrapper=vm.runInThisContext('(function(exports,require,module,__filename,__dirname){'+
    fs.readFileSync(GATE_FILE,'utf8')+'\n})',{filename:GATE_FILE+'#test-only-vm'});
  const mod={exports:{}};wrapper(mod.exports,req,mod,GATE_FILE,path.dirname(GATE_FILE));
  return mod.exports;
}
const TG=loadTestGate([fp1]);
const sig=(msg,k)=>({alg:'ed25519',public_key_spki_der_base64:spki(k).toString('base64'),
  value_base64:crypto.sign(null,msg,k).toString('base64')});
const kind=t=>{const e=manifest.entries.filter(x=>x.media_type===t),b=e.reduce((s,x)=>s+x.bytes,0);
  return {expected:226,checked:226,pass:226,fail:0,unable:0,expected_bytes:b,verified_bytes:b};};
const verifierReport={schema:G.VERIFIER_REPORT_SCHEMA,mode:'live',project_ref:'mhfxhzkdmgkaplicdszg',
  manifest_all_sha256:manifest.totals.all_sha256,verdict:'PASS',checked:452,pass:452,fail:0,unable:0,
  video:kind('video'),poster:kind('poster')};
function attest(over={},key=k1){
  const a={schema:G.ATTESTATION_SCHEMA,kind:G.ATTESTATION_KIND,attested_by:'Synthetic Test Owner',
    attested_at:'2026-11-09T12:00:00Z',app_commit:'0'.repeat(39)+'1',report:structuredClone(verifierReport),
    private_report_sha256:sha('synthetic-private-report'),attestation_sha256:null,signature:null,...over};
  a.attestation_sha256=G.attestationDigest(a);
  a.signature=sig(G.attestationSigningMessage(a),key);
  return a;
}
const attestation=attest();
const evidence={byte_level_download_sha256_proof:attestation.attestation_sha256,media_rights_evidence:sha('s-2'),
  range_206_android_webview_proof:sha('s-3'),signed_url_ttl_owner_switch_revoke_proof:sha('s-4')};
const DECISION='TK614-OWNER-MEDIA226-20261109-SYNTH1';
function record(over={},key=k1){
  const r=M.buildMediaReleaseRecordDraft(manifest,{decisionId:DECISION,approvedBy:'Synthetic Test Owner',
    approvedAt:'2026-11-09T12:00:00Z',userIds:[UA],evidence,...over});
  return {...r,signature:sig(M.mediaRecordSigningMessage(r),key)};
}
const mediaRecord=record();
const ID='TK-000001',entry=manifest.entries.find(e=>e.catalog_id===ID&&e.media_type==='video');
const golden=broker.byId.get(ID).video;
const NOW=Date.parse('2026-11-09T12:00:00Z');
const base=()=>({
  request:{catalog_id:ID,media_type:'video',selection:{_catalog:true,id:ID,catalog_id:ID,
    source:{provider:'movekit',provider_id:entry.provider_id}}},
  account:{user_id:UA,verified:'server_auth_v1_user',is_anonymous:false},
  releaseGates:gates,mediaRecord,attestation,
  publication:{schema:G.PUBLICATION_SCHEMA,catalog_id:ID,provider_id:entry.provider_id,status:'PUBLISHED',
    publication_reference:'TK614-PUB226-20261109-001',media_decision_id:DECISION,
    manifest_all_sha256:manifest.totals.all_sha256,published_at:'2026-11-09T12:00:00Z',revoked_at:null},
  grant:{user_id:UA,scope:'movekit_v2',active:true,expires_at:null,revoked_at:null,media_decision_id:DECISION},
  expectedAsset:{path:golden.path,sha256:golden.sha256,bytes:golden.bytes},
  now:NOW});
// All behavioural cases run against the test-only gate (trusts fp1 via pinned fake constant).
const run=f=>{const i=base();if(f)f(i);return TG.evaluate(i);};
const runProd=f=>{const i=base();if(f)f(i);return G.evaluate(i);};
const denied=(r,m)=>{eq([r.authorized,r.decision,r.status,r.error],[false,'DENY',404,'MEDIA_NOT_APPROVED'],m);
  ok(Object.isFrozen(r)&&Object.isFrozen(r.blockers),m+' frozen');};
const blocked=(f,code,m)=>{const r=run(f);denied(r,m);eq(r.eligible,false,m+' not eligible');
  ok(r.blockers.includes(code)&&r.blockers.includes(LOCK),m+' -> '+code+' '+JSON.stringify(r.blockers));return r;};

// ---- 1. positive introspection: every signed requirement met, yet authorization is false (F)
{const r=run();denied(r,'all-green synthetic');
 eq([r.eligible,r.blockers],[true,[LOCK]],'eligible only for introspection; cutover lock is the sole blocker');
 eq(G.CUTOVER,{version:'tk614-original226-media-gate/1',enabled:false});ok(Object.isFrozen(G.CUTOVER));
 eq(G.PINNED_MANIFEST_SHA256,manifest.totals.all_sha256,'pinned digest == committed manifest');
 const p=run(i=>{i.request.media_type='poster';const e=manifest.entries.find(x=>x.catalog_id===ID&&x.media_type==='poster');
   const pp=broker.postersById.get(ID);i.expectedAsset={path:pp.path,sha256:pp.sha256,bytes:pp.bytes};
   ok(e.sha256===pp.sha256,'poster parity');});
 eq([p.eligible,p.authorized],[true,false],'poster eligible, unauthorized');}
// ---- 1b. TRUST ANCHOR: production rejects synthetic keys; keys never come from input/args/env
{eq(TG.OWNER_KEYS,[fp1],'test-only gate pinned to ephemeral key');ok(Object.isFrozen(TG.OWNER_KEYS)&&Object.isFrozen(G.OWNER_KEYS));
 eq(G.OWNER_KEYS,['9a4e3f7ee3cab1792fcc00efca3992c10bb251c0840f47c0a0a224106f280c63'],'production pin = reviewed owner key');
 ok(!G.OWNER_KEYS.includes(fp1),'synthetic key is not production-trusted');
 ok(!G.INPUT_KEYS.includes('trustedKeys')&&Object.isFrozen(G.INPUT_KEYS),'no trust-anchor input field');
 const r=runProd();denied(r,'production gate, synthetic world');eq(r.eligible,false,'production rejects synthetic signatures');
 ok(r.blockers.includes('ORIGINAL226_MEDIA_RECORD_INVALID')&&r.blockers.includes('ORIGINAL226_BYTE_ATTESTATION_KEY_NOT_TRUSTED'),
   'production: media record + attestation untrusted '+JSON.stringify(r.blockers));
 for(const [gate,label] of [[G,'production'],[TG,'test-only']]){
   for(const v of [[fp1],[],['0'.repeat(64)],null]){
     const x=gate.evaluate({...base(),trustedKeys:v});denied(x,label+' input.trustedKeys');
     ok(!x.eligible&&x.blockers.includes('ORIGINAL226_INPUT_UNEXPECTED_FIELD'),label+' input.trustedKeys rejected '+JSON.stringify(v));}
   for(const extra of [{trustAnchor:[fp1]},{ownerKeys:[fp1]},{trusted_owner_key_sha256:[fp1]}]){
     const x=gate.evaluate({...base(),...extra});ok(!x.eligible&&x.blockers.includes('ORIGINAL226_INPUT_UNEXPECTED_FIELD'),label+' '+Object.keys(extra)[0]);}}
 eq(G.attestationProblems(attestation,[fp1]),['ORIGINAL226_BYTE_ATTESTATION_KEY_NOT_TRUSTED'],'prod attestation ignores caller keys');
 eq(G.attestationProblems(attestation),['ORIGINAL226_BYTE_ATTESTATION_KEY_NOT_TRUSTED'],'prod attestation pinned');
 eq(TG.attestationProblems(attestation),[],'test-only gate: synthetic attestation verifies');
 eq(TG.attestationProblems(attest({},k2),[sha(spki(k2))]),['ORIGINAL226_BYTE_ATTESTATION_KEY_NOT_TRUSTED'],'test gate ignores caller keys too');
 // a client cannot self-assert a verified identity via a different claim shape
 for(const acc of [{user_id:UA,verified:true,is_anonymous:false},{user_id:UA,verified:'server_auth_v1_user'},
   {user_id:UA,verified:'server_auth_v1_user',is_anonymous:'false'}])
   ok(run(i=>{i.account=acc;}).blockers.includes('ORIGINAL226_ACCOUNT_NOT_AUTHENTICATED'),'account claim shape '+JSON.stringify(acc));
 const ENVK=['NODE_ENV','TK614_TEST_MODE','ORIGINAL226_TRUSTED_KEYS','ORIGINAL226_MEDIA_CUTOVER_ENABLED'];
 const saved=ENVK.map(k=>[k,process.env[k]]);
 for(const k of ENVK)process.env[k]=k==='ORIGINAL226_TRUSTED_KEYS'?fp1:'test';
 const e=runProd();eq([e.eligible,e.authorized],[false,false],'no env toggle trusts synthetic key in production gate');
 for(const [k,v] of saved){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
// 226/226 video+poster checksum parity of the pinned manifest with the broker's canonical assets
{let n=0;for(const e of manifest.entries){const c=e.media_type==='video'?broker.byId.get(e.catalog_id).video:broker.postersById.get(e.catalog_id);
  assert.deepEqual([c.path,c.sha256,c.bytes],[e.storage_path,e.sha256,e.bytes]);n++;}
 eq(n,452,'452/452 manifest assets == broker canonical assets');}

// ---- 2. A: source qualification / collisions
blocked(i=>{delete i.request.selection._catalog;},'ORIGINAL226_SOURCE_NOT_CATALOG_QUALIFIED','personal TK-lookalike (no _catalog)');
blocked(i=>{i.request.selection.user_id=UA;},'ORIGINAL226_SOURCE_NOT_CATALOG_QUALIFIED','personal/custom row with owner');
blocked(i=>{i.request.selection.scope='personal';},'ORIGINAL226_SOURCE_NOT_CATALOG_QUALIFIED','personal scope');
blocked(i=>{i.request.selection.source.provider_id='attacker-provider';},'ORIGINAL226_SOURCE_NOT_CATALOG_QUALIFIED','provider collision');
blocked(i=>{i.request.selection.source.provider='custom';},'ORIGINAL226_SOURCE_NOT_CATALOG_QUALIFIED','non-movekit provider');
blocked(i=>{i.request.selection.id='TK-000002';},'ORIGINAL226_SOURCE_NOT_CATALOG_QUALIFIED','id/catalog_id mismatch');
blocked(i=>{i.request.selection=null;},'ORIGINAL226_SOURCE_NOT_CATALOG_QUALIFIED','no selection');
blocked(i=>{i.request.catalog_id='TK-000227';},'ORIGINAL226_NOT_IN_ORIGINAL_SCOPE','356 item never via this gate');
blocked(i=>{i.request.catalog_id='TK-000000';},'ORIGINAL226_NOT_IN_ORIGINAL_SCOPE','zero id');
blocked(i=>{i.request.catalog_id='tk-000001';},'ORIGINAL226_REQUEST_INVALID','lowercase id');
blocked(i=>{i.request.media_type='audio';},'ORIGINAL226_REQUEST_INVALID','bad media type');

// ---- 3. B: manifest / asset parity / 356 separation
blocked(i=>{i.expectedAsset.sha256='0'.repeat(64);},'ORIGINAL226_MANIFEST_ASSET_MISMATCH','checksum mismatch');
blocked(i=>{i.expectedAsset.bytes+=1;},'ORIGINAL226_MANIFEST_ASSET_MISMATCH','byte mismatch');
blocked(i=>{i.expectedAsset.path='movekit/v2/video/other.mp4';},'ORIGINAL226_MANIFEST_ASSET_MISMATCH','path mismatch');
blocked(i=>{i.expectedAsset=null;},'ORIGINAL226_MANIFEST_ASSET_MISMATCH','no canonical asset');
blocked(i=>{i.releaseGates={...gates,released_batches:[...gates.released_batches,{from:'TK-000001',through:'TK-000226'}]};},
  'ORIGINAL226_RELEASE_GATES_SEPARATION_FAILED','faked released_batches covering originals');
blocked(i=>{i.releaseGates={...gates,entries:gates.entries.map((e,n)=>n===0?{...e,sha256:'0'.repeat(64)}:e)};},
  'ORIGINAL226_RELEASE_GATES_SEPARATION_FAILED','original metadata drift');
blocked(i=>{i.releaseGates={...gates,[P.RECORD_KEY]:{...gates[P.RECORD_KEY],media_access:'RELEASED'}};},
  'ORIGINAL226_RELEASE_GATES_SEPARATION_FAILED','FK record claims media access');
blocked(i=>{i.releaseGates=null;},'ORIGINAL226_RELEASE_GATES_SEPARATION_FAILED','no gates');

// ---- 4. C: owner media record
blocked(i=>{i.mediaRecord=null;},'ORIGINAL226_MEDIA_RECORD_MISSING','null record');
blocked(i=>{i.mediaRecord='{"schema":"x"}';},'ORIGINAL226_MEDIA_RECORD_MISSING','string record');
blocked(i=>{i.mediaRecord={schema:M.MEDIA_RECORD_SCHEMA};},'ORIGINAL226_MEDIA_RECORD_INVALID','malformed record');
blocked(i=>{i.mediaRecord=gates[P.RECORD_KEY];},'ORIGINAL226_FK_ONLY_RECORD_IS_NOT_MEDIA_APPROVAL','FK-only owner decision');
blocked(i=>{i.mediaRecord={...mediaRecord,signature:null};},'ORIGINAL226_MEDIA_RECORD_INVALID','unsigned owner record');
blocked(i=>{i.mediaRecord=record({},k2);},'ORIGINAL226_MEDIA_RECORD_INVALID','wrong Ed25519 owner key');
blocked(i=>{i.mediaRecord={...mediaRecord,approved_by:'Someone Else'};},'ORIGINAL226_MEDIA_RECORD_INVALID','tampered after signing');
blocked(i=>{i.account.user_id=UB;i.grant.user_id=UB;},'ORIGINAL226_ACCOUNT_NOT_IN_MEDIA_RECORD','wrong user (not in record)');

// ---- 5. D: byte-integrity attestation
blocked(i=>{i.attestation=null;},'ORIGINAL226_BYTE_ATTESTATION_MISSING','no attestation');
blocked(i=>{i.attestation={...verifierReport,authorizes_nothing:true};},'ORIGINAL226_BYTE_ATTESTATION_UNSIGNED_VERIFIER_REPORT',
  'unsigned client-supplied verifier JSON');
blocked(i=>{i.attestation={...attestation,signature:null};},'ORIGINAL226_BYTE_ATTESTATION_SIGNATURE_REQUIRED','unsigned attestation');
blocked(i=>{i.attestation=attest({},k2);},'ORIGINAL226_BYTE_ATTESTATION_KEY_NOT_TRUSTED','attestation wrong key');
{const a=attest();a.signature={...a.signature,public_key_spki_der_base64:spki(k1).toString('base64'),
   value_base64:crypto.sign(null,Buffer.from('other'),k1).toString('base64')};
 blocked(i=>{i.attestation=a;},'ORIGINAL226_BYTE_ATTESTATION_SIGNATURE_INVALID','bad attestation signature');}
const rep=f=>{const r=structuredClone(verifierReport);f(r);return r;};
const attBlocked=(f,code,m)=>{const a=attest({report:rep(f)});
  // bind the record to this attestation so only the report defect remains
  blocked(i=>{i.attestation=a;i.mediaRecord=record({evidence:{...evidence,byte_level_download_sha256_proof:a.attestation_sha256}});},code,m);};
attBlocked(r=>{r.manifest_all_sha256=sha('other-manifest');},'ORIGINAL226_BYTE_ATTESTATION_MANIFEST_MISMATCH','evidence manifest mismatch');
attBlocked(r=>{r.checked=451;r.pass=451;r.video.checked=225;r.video.pass=225;},'ORIGINAL226_BYTE_ATTESTATION_NOT_EXACT_452_PASS','451/452 checked');
attBlocked(r=>{r.pass=451;r.unable=1;r.verdict='INCOMPLETE_UNABLE';},'ORIGINAL226_BYTE_ATTESTATION_NOT_EXACT_452_PASS','451 pass + 1 unable');
attBlocked(r=>{r.pass=451;r.fail=1;},'ORIGINAL226_BYTE_ATTESTATION_NOT_EXACT_452_PASS','451 pass + 1 mismatch, verdict faked PASS');
attBlocked(r=>{r.poster.verified_bytes-=1;},'ORIGINAL226_BYTE_ATTESTATION_NOT_EXACT_452_PASS','byte total short');
attBlocked(r=>{r.mode='offline-check';},'ORIGINAL226_BYTE_ATTESTATION_REPORT_INVALID','offline check is not a live verification');
attBlocked(r=>{r.project_ref='otherproject000000000';},'ORIGINAL226_BYTE_ATTESTATION_REPORT_INVALID','other project');
blocked(i=>{i.attestation={...attestation,private_report_sha256:sha('x')};},'ORIGINAL226_BYTE_ATTESTATION_DIGEST_MISMATCH','tampered attestation');
blocked(i=>{i.mediaRecord=record({evidence:{...evidence,byte_level_download_sha256_proof:sha('unrelated')}});},
  'ORIGINAL226_BYTE_ATTESTATION_NOT_BOUND_TO_MEDIA_RECORD','valid attestation not bound to owner media record');

// ---- 6. E: account, publication, grant
blocked(i=>{i.account=null;},'ORIGINAL226_ACCOUNT_NOT_AUTHENTICATED','anonymous / no account');
blocked(i=>{i.account.is_anonymous=true;},'ORIGINAL226_ACCOUNT_NOT_AUTHENTICATED','anonymous supabase user');
blocked(i=>{i.account.verified='client_claim';},'ORIGINAL226_ACCOUNT_NOT_AUTHENTICATED','client-claimed identity');
blocked(i=>{i.account.user_id='not-a-uuid';},'ORIGINAL226_ACCOUNT_NOT_AUTHENTICATED','malformed identity');
blocked(i=>{i.publication=null;},'ORIGINAL226_PUBLICATION_MISSING_OR_UNBOUND','missing publication');
blocked(i=>{i.publication.status='DRAFT';},'ORIGINAL226_PUBLICATION_MISSING_OR_UNBOUND','unpublished');
blocked(i=>{i.publication.revoked_at='2026-11-09T12:00:00Z';},'ORIGINAL226_PUBLICATION_MISSING_OR_UNBOUND','revoked publication');
blocked(i=>{i.publication.catalog_id='TK-000002';},'ORIGINAL226_PUBLICATION_MISSING_OR_UNBOUND','publication for other item');
blocked(i=>{i.publication.media_decision_id='TK614-OWNER-REVIEW226-20261109-BULK01';},'ORIGINAL226_PUBLICATION_MISSING_OR_UNBOUND','publication via bulk FK decision');
blocked(i=>{i.publication.approved=true;},'ORIGINAL226_PUBLICATION_MISSING_OR_UNBOUND','faked approved boolean on publication');
blocked(i=>{i.grant=null;},'ORIGINAL226_GRANT_MISSING','no grant');
blocked(i=>{i.grant.user_id=UB;},'ORIGINAL226_GRANT_ACCOUNT_MISMATCH','grant of another user');
blocked(i=>{i.grant.active=false;},'ORIGINAL226_GRANT_INACTIVE_OR_REVOKED','inactive grant');
blocked(i=>{i.grant.revoked_at='2026-11-09T11:00:00Z';},'ORIGINAL226_GRANT_INACTIVE_OR_REVOKED','revoked grant');
blocked(i=>{i.grant.expires_at='2026-11-09T11:59:59Z';},'ORIGINAL226_GRANT_EXPIRED','expired grant');
blocked(i=>{i.grant.expires_at='tomorrow';},'ORIGINAL226_GRANT_EXPIRED','malformed expiry');
blocked(i=>{const {media_decision_id,...g}=i.grant;i.grant=g;},'ORIGINAL226_GRANT_MISSING','plain 356 grant row (no decision binding)');
blocked(i=>{i.grant.media_decision_id='TK614-OWNER-REVIEW226-20261109-BULK01';},'ORIGINAL226_GRANT_NOT_BOUND_TO_MEDIA_DECISION','grant by bulk FK approval');
blocked(i=>{i.now=undefined;},'ORIGINAL226_CLOCK_MISSING','no clock');
{const r=run(i=>{i.now=undefined;i.grant.expires_at='2027-01-01T00:00:00Z';});ok(r.blockers.includes('ORIGINAL226_GRANT_EXPIRED'),'expiry unverifiable without clock');}

// ---- 7. F: faked switches never authorize; unknown inputs are hard errors
for(const extra of [{approved:true},{released:true},{authorized:true},{cutover:{enabled:true}},
  {MEDIA_CUTOVER_ENABLED:true},{released_batches:[{from:'TK-000001',through:'TK-000226'}]},{env:{ORIGINAL226_MEDIA_ENABLED:'true'}}]){
  blocked(i=>{Object.assign(i,extra);},'ORIGINAL226_INPUT_UNEXPECTED_FIELD','faked '+Object.keys(extra)[0]);
}
{const prev=process.env.ORIGINAL226_MEDIA_CUTOVER_ENABLED;process.env.ORIGINAL226_MEDIA_CUTOVER_ENABLED='true';
 const r=run();eq([r.authorized,r.blockers],[false,[LOCK]],'runtime env flag cannot enable cutover');
 if(prev===undefined)delete process.env.ORIGINAL226_MEDIA_CUTOVER_ENABLED;else process.env.ORIGINAL226_MEDIA_CUTOVER_ENABLED=prev;}
{let threw=false;try{G.CUTOVER.enabled=true;}catch(_){threw=true;}
 ok(threw||G.CUTOVER.enabled===false,'frozen lock');eq(run().authorized,false,'still locked after mutation attempt');}
for(const v of [undefined,null,0,'',[],'x',{}]){const r=G.evaluate(v);denied(r,'malformed input '+JSON.stringify(v));ok(!r.eligible);}

// ---- 8. sanitized output: fixed codes only, no user ids / paths / urls
{const all=[run(),runProd(),run(i=>{i.account.user_id=UB;i.grant.user_id=UB;})];
 for(const r of all){const t=JSON.stringify(r)+JSON.stringify(G.publicLog(r));
   ok(!t.includes(UA)&&!t.includes(UB)&&!/movekit\/v2|https?:|token|supabase/i.test(t),'sanitized output');
   ok(r.blockers.every(x=>/^ORIGINAL226_[A-Z0-9_]+$/.test(x)),'fixed codes');}
 eq(Object.keys(G.publicLog(run())),['gate','decision','error','blockers']);
 ok(!('brokerShadow' in G)&&!('brokerShadow' in TG),'no broker shadow hook exported');}

// ---- 9. module hygiene: pure, keyless, offline, literal lock
{const code=read('tools/tk614_original226_media_eligibility.cjs').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 eq([...code.matchAll(/require\('([^']+)'\)/g)].map(m=>m[1]),['./tk614_original226_private_media_staging.cjs',
   './tk614_original226_admin_release.cjs','../docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json','node:crypto']);
 ok(!/process\.env|NODE_ENV|\bvm\b|runInThisContext|createRequire|input\.trustedKeys|trustedKeys\s*[,}]|trustedKeys\s*===|fetch\(|generateKeyPair|createPrivateKey|crypto\.sign\(|Date\.now|movekit_media_grants|supabase\.co|writeFile/.test(code),
   'no env/test-mode/VM shim/caller key override, network, clock, key generation, signing, grants or writes');
 ok(/trustedKeys: OWNER_KEYS \}/.test(code)&&/const trusted = OWNER_KEYS;/.test(code),'only the pinned constant reaches signature checks');
 ok(/const OWNER_KEYS = Object\.freeze\(Array\.isArray\(A\.TRUSTED_OWNER_KEY_SHA256\)/.test(code),'pin derived from reviewed admin_release constant');
 ok(/const CUTOVER = Object\.freeze\(\{ version: GATE_VERSION, enabled: false \}\);/.test(code),'lock is a literal false');
 ok(/authorized: false, eligible/.test(code)&&!/authorized:(?!\s*false\b)/.test(code),'authorized is only ever literal false');}

// ---- 10. broker: gate NOT loaded; unconditional 404 before auth/grant/sign; 356 unchanged
const env=Object.freeze({SUPABASE_URL:broker.BASE,SUPABASE_ANON_KEY:'synthetic-anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',
  MOVEKIT_V2_SIGNING_ENABLED:'true',MOVEKIT_V2_PERMISSION_REVIEWED:'true',MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED:'true',
  MOVEKIT_V2_POSTER_UPLOAD_VERIFIED:'true',MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED:'true',
  ORIGINAL226_MEDIA_CUTOVER_ENABLED:'true'});
let calls=[];
async function backend(url,opts){
  calls.push(url);
  if(url===broker.BASE+'/auth/v1/user')return opts.headers.Authorization==='Bearer synthetic.a.jwt'?{ok:true,json:async()=>({id:UA})}:{ok:false,status:401};
  if(url.startsWith(broker.BASE+'/rest/v1/movekit_media_grants?'))
    return {ok:true,json:async()=>[{user_id:UA,scope:broker.SCOPE,active:true,revoked_at:null,expires_at:null}]};
  if(url.startsWith(broker.BASE+'/storage/v1/object/sign/'))
    return {ok:true,json:async()=>({signedURL:url.slice(broker.BASE.length)+'?token=synthetic-signed-token-0001'})};
  throw Error('UNEXPECTED_NETWORK_REQUEST');
}
async function call(id,type,release=gates,extra={}){
  calls=[];
  const r=await broker.handle({httpMethod:'POST',headers:{origin:'https://trainingskompas.com',authorization:'Bearer synthetic.a.jwt'},
    body:JSON.stringify({catalog_id:id,type,version:'v2'})},{env,fetch:backend,release,now:()=>NOW,...extra});
  return {status:r.statusCode,body:JSON.parse(r.body||'{}'),calls:[...calls]};
}
(async()=>{
  const src=read('netlify/functions/exercise-media-v2-url.js').replace(/\r\n/g,'\n');
  const srcCode=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  ok(!/tk614_original226_media_eligibility|original226Gate|brokerShadow|tk614_original226_private_media_staging|tk614_original226_admin_release/.test(srcCode),
    'production media function does not reference the staged gate or its toolchain');
  ok(/if \(catalogNumber >= 1 && catalogNumber <= 226\) \{\n    return failure\(event, 404, 'MEDIA_NOT_APPROVED'\);\n  \}/.test(src),
    'original-226 block is a bare unconditional 404');
  {const at=src.indexOf('catalogNumber <= 226) {');
   ok(at>0&&at<src.indexOf('await identifyUser(')&&at<src.indexOf('await verifyEntitlement(')&&at<src.indexOf('await sign('),
     '226 block precedes auth, grant and signing');}
  {const loaded=JSON.parse(execFileSync(process.execPath,['-e',
     "require('./netlify/functions/exercise-media-v2-url.js');process.stdout.write(JSON.stringify(Object.keys(require.cache)))"],
     {cwd:ROOT,encoding:'utf8'}));
   ok(loaded.length>0&&!loaded.some(f=>/tk614_original226_|TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST/.test(f)),
     'fresh process: media function loads no gate/staging/admin module or 452-manifest');}
  {const r=await call('TK-000001','video');
   eq([r.status,r.body.error,r.calls.length],[404,'MEDIA_NOT_APPROVED',0],'404, zero outgoing requests');}
  let n=0;
  for(const e of manifest.entries){const r=await call(e.catalog_id,e.media_type);
    assert.deepEqual([r.status,r.body.error,r.calls.length,r.body.url],[404,'MEDIA_NOT_APPROVED',0,undefined]);n++;}
  eq(n,452,'452/452 originals 404 with zero outgoing requests (env flag ORIGINAL226_MEDIA_CUTOVER_ENABLED=true ignored)');
  for(const [id,type] of [['TK-000227','video'],['TK-000227','poster'],['TK-000400','video'],['TK-000582','poster']]){
    const r=await call(id,type);
    eq(r.status,200,'356 noninterference '+id+' '+type);
    ok(r.calls.length===4&&typeof r.body.url==='string'&&r.body.expires_in<=60,'356 normal auth+grant+sign+recheck '+id);
  }
  eq(sha(read(GATES_REL).replace(/\r\n/g,'\n')),gatesShaBefore,'release gates file unchanged');
  console.log('TK614 original-226 media eligibility gate: '+checks+' assertions PASS; production gate rejects synthetic keys; '+
    'test-only VM gate all-green = eligible but authorized=false (cutover locked); input.trustedKeys rejected; '+
    'media function does not load gate; 452/452 originals 404 with 0 requests; 356 unchanged');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
