'use strict';
// TK614/#603 -- ORIGINAL-226 PRIVATE MEDIA: staged-only contract + broker parity.
// RED before GREEN: before the broker hardening, a release config that merely lists
// fully-flagged TK-000001..226 entries made the broker sign originals (200). Now the
// broker refuses all 226 x (video, poster) with 404 MEDIA_NOT_APPROVED before any
// auth/grant/sign call, while the released 356 keep working with a valid grant.
// Synthetic only: no DB, network, real JWT, service key, signed URL or media bytes.
// Signed URLs produced by the stub are never printed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('../tools/tk614_original226_private_media_staging.cjs');
const P=require('../tools/tk614_original226_review_packet.cjs');
const A=require('../tools/tk614_original226_admin_release.cjs');
const L=require('./tk504BatchReleaseLedger.js');
const broker=require('../netlify/functions/exercise-media-v2-url.js')._internal;
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const pad=n=>String(n).padStart(6,'0');
const GATES_REL='docs/generated/MOVEKIT_V2_RELEASE_GATES.json';
const gatesShaBefore=sha(read(GATES_REL).replace(/\r\n/g,'\n'));
const gates=JSON.parse(read(GATES_REL));
const sources=M.repoSources();
const golden=new Map(sources.inventory.items.map(x=>[x.catalog_id,x]));
const posters=new Map(sources.posters.items.map(x=>[x.catalog_id,x]));
const catalog=new Map(JSON.parse(String(sources.catalogBytes)).catalog.map(x=>[x.catalog_id,x]));

let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const throwsCode=(fn,code,m)=>{assert.throws(fn,e=>e.code===code||e.message===code,(m||'')+' expected '+code);checks++;};
const has=(list,code,m)=>ok(Array.isArray(list)&&list.includes(code),(m||code)+' -> '+JSON.stringify(list));

// ---- 1. deterministic, source-locked 452-entry staging manifest
const built=M.buildStagingManifest(sources);
eq(M.serializeManifest(M.buildStagingManifest(M.repoSources())),M.serializeManifest(built),'deterministic build');
eq([built.schema,built.status],['tk614-original226-private-media-staging/1.0','STAGED_ONLY_NOT_RELEASED']);
eq([built.entries.length,built.totals.entries,built.scope.catalog_count],[452,452,226]);
eq(M.stagingManifestProblems(built),[],'built manifest structurally staged-only');
eq([M.INVENTORY_SHA256,M.POSTER_DIGEST_SHA256],[broker.inventorySha,broker.posterSha],'same source pins as the broker');
eq(built.generated_from.source_catalog_sha256,'b278938498ffd0d713a4ad23184bfdd037fab65fd2ce5c9e0f7662a6e96bf4af');
ok(Object.values(built.authorizes).every(v=>v===false),'authorizes nothing');
eq(built.separation.fk_identity_record_is_media_approval,false);
{let vb=0,pb=0;
 for(let n=1;n<=226;n++){
  const id='TK-'+pad(n),v=built.entries[(n-1)*2],w=built.entries[(n-1)*2+1];
  const slug=catalog.get(id).source.provider_id,g=golden.get(id),p=posters.get(id);
  assert.deepEqual([v.catalog_id,v.media_type,v.bucket,v.provider_id,v.storage_path,v.sha256,v.bytes,v.status],
    [id,'video','exercise-media',slug,g.video.path,g.video.sha256,g.video.bytes,'STAGED_ONLY_NOT_RELEASED'],id+' video');
  assert.deepEqual([w.catalog_id,w.media_type,w.bucket,w.provider_id,w.storage_path,w.sha256,w.bytes,w.status],
    [id,'poster','exercise-posters',slug,p.path,p.sha256,p.bytes,'STAGED_ONLY_NOT_RELEASED'],id+' poster');
  assert.equal(v.storage_path,'movekit/v2/video/'+slug+'.mp4');
  assert.equal(w.storage_path,'movekit/v2/poster-optimized/'+slug+'.webp');
  vb+=v.bytes;pb+=w.bytes;
 }
 checks+=226*4;
 eq([built.totals.video_bytes,built.totals.poster_bytes],[vb,pb],'byte totals');}
eq(new Set(built.entries.map(e=>e.storage_path)).size,452,'452 unique private paths');
ok(built.entries.every(e=>!('reviewed' in e)&&!('upload_verified' in e)&&!('review_reference' in e)),
  'staged entries carry no release flags (inert if merged)');
{const text=M.serializeManifest(built);
 ok(!/https?:|token=|signedurl|service_role|apikey|BEGIN [A-Z ]*KEY|supabase\.co/i.test(text),'no URL, token or secret');}

// ---- 2. the single committed manifest == deterministic build (generate with --write)
{const rel='docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json';
 ok(fs.existsSync(path.join(ROOT,rel)),'STAGING_MANIFEST_FILE_MISSING: run node tools/tk614_original226_private_media_staging.cjs --write');
 const text=read(rel).replace(/\r\n/g,'\n');
 eq(text,M.serializeManifest(built),'committed manifest byte-identical (LF) to the source-locked build');
 M.verifyStagingManifest(JSON.parse(text),sources);checks++;
 let out='';const rep=M.run(['--check'],{stdout:x=>{out+=x;}});
 eq([rep.status,rep.media_release,rep.database_writes_performed,rep.network_used],
   ['STAGING_MANIFEST_VERIFIED_AUTHORISES_NOTHING',false,false,false]);
 ok(!out.includes('movekit/v2/'),'CLI prints digests and counts only');
 throwsCode(()=>M.run(['--release']),'USAGE');throwsCode(()=>M.run(['--check','x']),'USAGE');}

// ---- 3. source defects fail closed
const src=f=>{const s={catalogBytes:sources.catalogBytes,inventory:structuredClone(sources.inventory),
  posters:structuredClone(sources.posters)};f(s);return s;};
const gi=(s,id)=>s.inventory.items.find(x=>x.catalog_id===id);
const pi=(s,id)=>s.posters.items.find(x=>x.catalog_id===id);
const slugOf=id=>catalog.get(id).source.provider_id;
const bad=(f,code,m)=>throwsCode(()=>M.buildStagingManifest(src(f)),code,m);
bad(s=>{s.inventory.items=s.inventory.items.filter(x=>x.catalog_id!=='TK-000005');},'GOLDEN_INVENTORY_INVALID','missing video item');
bad(s=>{s.posters.items=s.posters.items.filter(x=>x.catalog_id!=='TK-000010');s.posters.count=581;},'POSTER_REGISTRY_INVALID','missing poster');
bad(s=>{gi(s,'TK-000005').catalog_id='TK-000999';},'POSTER_UNEXPECTED_CATALOG_ID','renamed / unexpected catalog id');
bad(s=>{const i=s.inventory.items.findIndex(x=>x.catalog_id==='TK-000300');s.inventory.items[i]=structuredClone(gi(s,'TK-000007'));},
  'GOLDEN_DUPLICATE_CATALOG_ID','duplicate video item');
bad(s=>{const i=s.posters.items.findIndex(x=>x.catalog_id==='TK-000300');s.posters.items[i]=structuredClone(pi(s,'TK-000007'));},
  'POSTER_DUPLICATE_CATALOG_ID','duplicate poster item');
bad(s=>{const g=gi(s,'TK-000003');g.provider_id='attacker-provider';g.video.path='movekit/v2/video/attacker-provider.mp4';},
  'GOLDEN_PROVIDER_MISMATCH','unexpected provider');
bad(s=>{gi(s,'TK-000400').provider_id=slugOf('TK-000002');},'GOLDEN_PROVIDER_ALIAS_DUPLICATE','malicious alias of an original slug');
bad(s=>{gi(s,'TK-000003').provider_id='../etc';},'GOLDEN_PROVIDER_ID_INVALID','traversal slug');
bad(s=>{const p=pi(s,'TK-000006');p.provider_id=slugOf('TK-000007');p.path='movekit/v2/poster-optimized/'+slugOf('TK-000007')+'.webp';},
  'POSTER_PROVIDER_MISMATCH','poster alias to another exercise');
bad(s=>{gi(s,'TK-000004').video.path='movekit/v2/video/other-exercise.mp4';},'VIDEO_PATH_MISMATCH','wrong path');
bad(s=>{gi(s,'TK-000004').video.path='movekit/v2/video/../poster/'+slugOf('TK-000004')+'.mp4';},'VIDEO_PATH_MISMATCH','traversal path');
bad(s=>{gi(s,'TK-000004').video.path='movekit/v1/video/'+slugOf('TK-000004')+'.mp4';},'VIDEO_PATH_MISMATCH','v1 path');
bad(s=>{pi(s,'TK-000004').path='movekit/v2/poster/'+slugOf('TK-000004')+'.png';},'POSTER_PATH_MISMATCH','raw PNG poster');
bad(s=>{gi(s,'TK-000009').video.sha256='abc';},'VIDEO_SHA256_INVALID');
bad(s=>{const g=gi(s,'TK-000009');g.video.sha256=g.video.sha256.toUpperCase();},'VIDEO_SHA256_INVALID','uppercase alias of sha');
bad(s=>{gi(s,'TK-000009').video.sha256=sha(Buffer.alloc(0));},'VIDEO_SHA256_INVALID','empty-file sha');
bad(s=>{pi(s,'TK-000009').sha256=sha(Buffer.alloc(0));},'POSTER_SHA256_INVALID','empty-file poster sha');
bad(s=>{gi(s,'TK-000011').video.bytes=0;},'VIDEO_BYTES_INVALID','empty video');
bad(s=>{gi(s,'TK-000011').video.bytes='3592023';},'VIDEO_BYTES_INVALID','string bytes');
bad(s=>{pi(s,'TK-000011').bytes=0;},'POSTER_BYTES_INVALID','empty poster');
bad(s=>{pi(s,'TK-000011').bytes=2*1048576;},'POSTER_BYTES_INVALID','oversized poster');
bad(s=>{gi(s,'TK-000012').video.mime='video/quicktime';},'VIDEO_MIME_INVALID');
bad(s=>{gi(s,'TK-000008').status='proposed-new';},'GOLDEN_ORIGINAL_SET_MISMATCH','original reclassified');
bad(s=>{s.posters.golden_inventory_sha256='0'.repeat(64);},'POSTER_REGISTRY_INVALID','poster registry bound to other inventory');
bad(s=>{s.inventory.status='RELEASE_APPROVED';},'GOLDEN_INVENTORY_INVALID','inventory status rewritten');
throwsCode(()=>M.buildStagingManifest({...sources,catalogBytes:Buffer.from(String(sources.catalogBytes).replace('"band-curl"','"band-curl-x"'))}),
  'SOURCE_CATALOG_SHA_MISMATCH','public catalog altered');

// ---- 4. manifest tamper: verification re-derives from sources (resealing the digest does not help)
const tm=(f,m)=>{const t=structuredClone(built);f(t);throwsCode(()=>M.verifyStagingManifest(t,sources),'STAGING_MANIFEST_TAMPERED',m);return t;};
tm(t=>{[t.entries[0],t.entries[1]]=[t.entries[1],t.entries[0]];},'video/poster reordered');
tm(t=>{[t.entries[0],t.entries[1],t.entries[2],t.entries[3]]=[t.entries[2],t.entries[3],t.entries[0],t.entries[1]];},'items reordered');
tm(t=>{t.entries[2]=structuredClone(t.entries[0]);},'duplicate entry');
tm(t=>{t.entries.pop();},'missing entry');
tm(t=>{t.entries[10].sha256=t.entries[12].sha256;t.totals.all_sha256=M.manifestDigest(t);},'mismatched SHA, digest resealed');
tm(t=>{t.entries[11].storage_path='movekit/v2/poster-optimized/other.webp';t.totals.all_sha256=M.manifestDigest(t);},'wrong path, resealed');
tm(t=>{t.entries[20].provider_id='attacker-provider';t.totals.all_sha256=M.manifestDigest(t);},'wrong provider, resealed');
tm(t=>{t.entries[21].bytes=0;t.totals.all_sha256=M.manifestDigest(t);},'empty file, resealed');
has(M.stagingManifestProblems(tm(t=>{t.status='RELEASE_APPROVED';})),'STAGING_MANIFEST_STATUS_NOT_STAGED');
has(M.stagingManifestProblems(tm(t=>{t.authorizes.media_access=true;})),'STAGING_MANIFEST_AUTHORIZES_SOMETHING');
has(M.stagingManifestProblems(tm(t=>{t.entries[0].reviewed=true;})),'STAGING_ENTRY_SHAPE_INVALID');
has(M.stagingManifestProblems(tm(t=>{t.entries[0].url='https://example.invalid/x.mp4';})),'STAGING_MANIFEST_CONTAINS_URL_OR_SECRET');
has(M.stagingManifestProblems(tm(t=>{t.entries[3].catalog_id='TK-000227';})),'STAGING_MANIFEST_ORDER_OR_COVERAGE_INVALID');
tm(t=>{t.extra='x';},'extra top-level key');
eq(M.stagingManifestProblems(null),['STAGING_MANIFEST_MISSING_OR_SCHEMA_INVALID']);

// ---- 5. FK-only owner approval is never media approval; 356 media scope untouched
const fk=gates[P.RECORD_KEY];
eq([fk.binding_kind,fk.media_grants,fk.media_access],['FK_IDENTITY_BINDING_ONLY',0,'NOT_RELEASED']);
eq(M.fkRecordMediaProblems(fk),[],'FK record claims no media');
has(M.fkRecordMediaProblems({...fk,media_access:'RELEASED'}),'FK_RECORD_CLAIMS_MEDIA_ACCESS');
has(M.fkRecordMediaProblems({...fk,media_grants:1}),'FK_RECORD_CLAIMS_MEDIA_GRANTS');
has(M.fkRecordMediaProblems({...fk,media_entries:[]}),'FK_RECORD_CONTAINS_MEDIA_ENTRIES');
eq(M.mediaReleaseRecordProblems(fk,built),['FK_IDENTITY_RECORD_IS_NOT_MEDIA_APPROVAL'],'FK record presented as media record');
{const r=M.original226MediaRelease(gates,built,fk);
 eq(r.released,false);has(r.blockers,'FK_IDENTITY_RECORD_IS_NOT_MEDIA_APPROVAL');has(r.blockers,'ORIGINAL226_MEDIA_STAGED_ONLY_NOT_RELEASED');}
{const r=M.original226MediaRelease(gates,built,undefined);
 eq(r.released,false);has(r.blockers,'ORIGINAL226_OWNER_SIGNED_MEDIA_RECORD_MISSING');}
eq(M.releaseGatesSeparationProblems(gates,built),[],'real gates: 452 original metadata entries + 712 newer entries; original not authorized');
eq(gates.entries.length,1164);
eq(gates.entries.filter(e=>Number(e.catalog_id.slice(3))<=226).length,452,
  '452 original media metadata records exist in the source ledger; NOT a standalone release');
eq(gates.entries.filter(e=>Number(e.catalog_id.slice(3))>=227).length,712,
  '712 released 356 media entries remain unchanged');
{const sc=L.releasedScope(gates);eq([sc.batch,sc.new_count,sc.total],[15,356,582]);}
eq(Object.keys(gates),['schema','status','inventory_sha256','poster_digest_sha256','content_approval','released_batches','entries',
  P.RECORD_KEY],'release gates top-level unchanged (no media226 grant key added)');
{const g={...gates,entries:[...gates.entries,{catalog_id:'TK-000001',media_type:'video'}]};
 const p=M.releaseGatesSeparationProblems(g,built);
 has(p,'RELEASE_GATES_MEDIA_SCOPE_INVALID');has(p,'MEDIA_ENTRIES_NOT_1164');}
{const g={...gates,entries:gates.entries.map((e,i)=>i===0?{...e,sha256:'0'.repeat(64)}:e)};
 has(M.releaseGatesSeparationProblems(g,built),'RELEASE_GATES_ORIGINAL_MEDIA_SOURCE_DRIFT',
   'original media ledger metadata cannot be quietly changed');}
{const actual=new Map(gates.entries.map(e=>[e.catalog_id+':'+e.media_type,e]));
 ok(built.entries.every(e=>{const x=actual.get(e.catalog_id+':'+e.media_type);
   return x&&x.storage_path===e.storage_path&&x.sha256===e.sha256&&x.bytes===e.bytes;}),
   '452 original media entries already have exact source metadata, but no separate media approval');}

// ---- 6. FUTURE owner-signed media record: validator only, still never releases in this version
const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const {privateKey:k1}=crypto.generateKeyPairSync('ed25519');   // ephemeral, test-only, never stored
const {privateKey:k2}=crypto.generateKeyPairSync('ed25519');
const spki=k=>crypto.createPublicKey(k).export({format:'der',type:'spki'});
const fp1=sha(spki(k1)),fp2=sha(spki(k2));
const signRec=(r,k)=>({...r,signature:{alg:'ed25519',public_key_spki_der_base64:spki(k).toString('base64'),
  value_base64:crypto.sign(null,M.mediaRecordSigningMessage(r),k).toString('base64')}});
const reseal=r=>{const o={...r};o.record_sha256=M.mediaRecordDigest(o);return o;};
const evidence={byte_level_download_sha256_proof:sha('synthetic-1'),media_rights_evidence:sha('synthetic-2'),
  range_206_android_webview_proof:sha('synthetic-3'),signed_url_ttl_owner_switch_revoke_proof:sha('synthetic-4')};
const draft=M.buildMediaReleaseRecordDraft(built,{decisionId:'TK614-OWNER-MEDIA226-20261109-SYNTH1',
  approvedBy:'Synthetic Test Owner',approvedAt:'2026-11-09T12:00:00Z',userIds:[UA],evidence});
const trust={trustedKeys:[fp1],accountUserId:UA};
const signed=signRec(draft,k1);
eq(M.mediaReleaseRecordProblems(draft,built,trust),['MEDIA_RECORD_SIGNATURE_REQUIRED'],'no signature');
eq(M.mediaReleaseRecordProblems(signed,built,trust),[],'synthetic-trusted signed record validates');
eq(M.mediaReleaseRecordProblems(signed,built,{accountUserId:UA}),['MEDIA_RECORD_OWNER_KEY_NOT_TRUSTED'],'synthetic key is not the pinned owner key');
eq(M.mediaReleaseRecordProblems(signed,built,{...trust,accountUserId:UB}),['MEDIA_RECORD_ACCOUNT_NOT_COVERED'],'account B');
eq(M.mediaReleaseRecordProblems(signed,built,{trustedKeys:[fp1]}),['MEDIA_RECORD_ACCOUNT_NOT_COVERED'],'no account');
eq(M.mediaReleaseRecordProblems(signRec(draft,k2),built,trust),['MEDIA_RECORD_OWNER_KEY_NOT_TRUSTED'],'other key');
eq(M.mediaReleaseRecordProblems(signed,built,{...trust,trustedKeys:[]}),['MEDIA_RECORD_NO_TRUSTED_OWNER_KEY']);
{const r=M.mediaReleaseRecordProblems({...signed,approved_by:'Someone Else'},built,trust);
 has(r,'MEDIA_RECORD_DIGEST_MISMATCH','modified record');has(r,'MEDIA_RECORD_SIGNATURE_INVALID','modified record');}
eq(M.mediaReleaseRecordProblems({...reseal({...draft,grant:{scope:'movekit_v2',user_ids:[UA,UB]}}),signature:signed.signature},
  built,{...trust,accountUserId:UB}),['MEDIA_RECORD_SIGNATURE_INVALID'],'account B smuggled in and digest resealed');
{const forgedSig={...signed.signature,public_key_spki_der_base64:spki(k2).toString('base64')};
 eq(M.mediaReleaseRecordProblems({...signed,signature:forgedSig},built,{...trust,trustedKeys:[fp1,fp2]}),
   ['MEDIA_RECORD_SIGNATURE_INVALID'],'signature of key 1 presented under key 2');}
{const t=structuredClone(built);t.entries[0].provider_id='attacker-provider';t.totals.all_sha256=M.manifestDigest(t);
 has(M.mediaReleaseRecordProblems(signed,t,trust),'MEDIA_RECORD_MANIFEST_MISMATCH','wrong provider in manifest');
 const r=signRec(reseal({...draft,manifest:{...draft.manifest,provider_ids_sha256:sha('attacker-provider')}}),k1);
 eq(M.mediaReleaseRecordProblems(r,built,trust),['MEDIA_RECORD_MANIFEST_MISMATCH'],'record bound to wrong providers');}
eq(M.mediaReleaseRecordProblems(signRec(reseal({...draft,evidence:{...evidence,media_rights_evidence:'a'.repeat(64)}}),k1),built,trust),
  ['MEDIA_RECORD_EVIDENCE_INVALID'],'placeholder evidence');
eq(M.mediaReleaseRecordProblems(signRec(reseal({...draft,decision_id:'TK614-OWNER-REVIEW226-20261109-BULK01'}),k1),built,trust),
  ['MEDIA_RECORD_DECISION_ID_INVALID'],'FK decision id reused for media');
{const r=M.original226MediaRelease(gates,built,signed,trust);
 eq(r,{released:false,blockers:['ORIGINAL226_MEDIA_CUTOVER_NOT_ENABLED_IN_THIS_VERSION','ORIGINAL226_MEDIA_STAGED_ONLY_NOT_RELEASED']},
   'even a valid signed record releases nothing in this version');}
eq(M.MEDIA_CUTOVER_ENABLED,false);

// ---- 7. tool hygiene: pure, keyless, offline
{const code=read('tools/tk614_original226_private_media_staging.cjs').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 eq([...code.matchAll(/require\('([^']+)'\)/g)].map(m=>m[1]),
   ['node:fs','node:path','node:crypto','./tk614_original226_review_packet.cjs','./tk614_original226_admin_release.cjs']);
 ok(!/process\.env|fetch\(|generateKeyPair|createPrivateKey|crypto\.sign\(|INSERT\s+INTO|movekit_media_grants|supabase\.co/i.test(code),
   'no env, network, key generation, signing, SQL or grants');}

// ---- 8. broker parity (RED before GREEN)
const env=Object.freeze({SUPABASE_URL:broker.BASE,SUPABASE_ANON_KEY:'synthetic-anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',
  MOVEKIT_V2_SIGNING_ENABLED:'true',MOVEKIT_V2_PERMISSION_REVIEWED:'true',MOVEKIT_V2_PRIVATE_UPLOAD_VERIFIED:'true',
  MOVEKIT_V2_POSTER_UPLOAD_VERIFIED:'true',MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED:'true'});
const TOKENS={'Bearer synthetic.account-a.jwt':UA,'Bearer synthetic.account-b.jwt':UB};
const granted=new Set([UA]);
let calls=[];
async function backend(url,opts){
  calls.push(url);
  if(url===broker.BASE+'/auth/v1/user'){const id=TOKENS[opts.headers.Authorization];
    return id?{ok:true,json:async()=>({id})}:{ok:false,status:401};}
  if(url.startsWith(broker.BASE+'/rest/v1/movekit_media_grants?')){
    const uid=new URL(url).searchParams.get('user_id').slice(3);
    return {ok:true,json:async()=>granted.has(uid)?[{user_id:uid,scope:broker.SCOPE,active:true,revoked_at:null,expires_at:null}]:[]};}
  if(url.startsWith(broker.BASE+'/storage/v1/object/sign/'))
    return {ok:true,json:async()=>({signedURL:url.slice(broker.BASE.length)+'?token=synthetic-signed-token-0001'})};
  throw Error('UNEXPECTED_NETWORK_REQUEST');
}
const ev=(catalog_id,type,token='Bearer synthetic.account-a.jwt')=>({httpMethod:'POST',
  headers:{origin:'https://trainingskompas.com',authorization:token},body:JSON.stringify({catalog_id,type,version:'v2'})});
async function call(id,type,release,extra={},token){
  calls=[];
  const r=await broker.handle(ev(id,type,token),{env,fetch:backend,release,now:()=>Date.parse('2026-11-09T12:00:00Z'),...extra});
  return {status:r.statusCode,body:JSON.parse(r.body||'{}'),calls:[...calls]};
}
const flagged=built.entries.map(e=>({catalog_id:e.catalog_id,media_type:e.media_type,storage_path:e.storage_path,
  sha256:e.sha256,bytes:e.bytes,reviewed:true,upload_verified:true,
  review_reference:'TK504-20261109-901',upload_reference:'TK504-20261109-902'}));
const forged=Object.freeze({schema:broker.SCHEMA,status:'RELEASE_APPROVED',inventory_sha256:broker.inventorySha,
  poster_digest_sha256:broker.posterSha,entries:flagged});
(async()=>{
  eq(broker.ORIGINAL_226_MEDIA_STATE,M.STATUS,'broker state constant == staging status');
  ok(read('netlify/functions/exercise-media-v2-url.js').replace(/\r\n/g,'\n').includes(
    'exports.handler = event => handle(event, { env: process.env, fetch: globalThis.fetch, now: Date.now });'),
    'production handler passes no original-226 override');
  // existing 356 still work with a valid synthetic grant
  for(const [id,type] of [['TK-000227','video'],['TK-000227','poster'],['TK-000582','video']]){
    const r=await call(id,type,gates);
    eq(r.status,200,'356 '+id+' '+type);
    const want=type==='video'?golden.get(id).video.path:posters.get(id).path;
    ok(new URL(r.body.url).pathname.endsWith('/'+want)&&r.body.expires_in<=60,'exact asset '+id);
  }
  eq((await call('TK-000227','video',gates,{},'Bearer synthetic.account-b.jwt')).status,403,'account B without grant');
  // all 226 x 2 refused with the real gates, before any auth/grant/sign call
  let refused=0;
  for(const e of built.entries){
    const r=await call(e.catalog_id,e.media_type,gates);
    assert.equal(r.status,404,e.catalog_id+' '+e.media_type);assert.equal(r.body.error,'MEDIA_NOT_APPROVED');
    assert.equal(r.calls.length,0);assert.equal(r.body.url,undefined);refused++;
  }
  eq(refused,452,'452/452 original media refused (real gates)');
  // RED->GREEN: fully-flagged original entries in a release config (old unsafe model) no longer sign
  for(const [id,type] of [['TK-000001','video'],['TK-000001','poster'],['TK-000226','video'],['TK-000113','poster']]){
    const r=await call(id,type,forged);
    eq([r.status,r.body.error,r.calls.length],[404,'MEDIA_NOT_APPROVED',0],'forged release '+id+' '+type);
  }
  {const mixed={...gates,entries:[...gates.entries.slice(0,1162),flagged[0],flagged[1]]};
   const r=await call('TK-000001','video',mixed);
   eq([r.status,r.calls.length],[404,0],'original smuggled into the 356 entries');}
  // No dependency injection, environment value, FK-only owner decision, signed
  // looking string, or already reviewed release.entry may bypass the cutover.
  for(const config of [gates,forged]){
    for(const v of [undefined,null,true,'true',M.STATUS,'OWNER_APPROVED_FK_IDENTITY_ONLY',
      'OWNER_SIGNED_MEDIA_RELEASE_VERIFIED','owner_signed_media_release_verified']){
      const r=await call('TK-000001','video',config,{original226MediaState:v});
      eq([r.status,r.body.error,r.calls.length],[404,'MEDIA_NOT_APPROVED',0],
        'original media always blocked; override '+String(v));
    }
  }
  {const r=await call('TK-000001','video',forged,{original226MediaState:'OWNER_SIGNED_MEDIA_RELEASE_VERIFIED'},
      'Bearer synthetic.account-b.jwt');
   eq([r.status,r.body.error,r.calls.length],[404,'MEDIA_NOT_APPROVED',0],
     'unentitled account cannot reach original media regardless of any override');}
  // release gates file untouched by everything above
  eq(sha(read(GATES_REL).replace(/\r\n/g,'\n')),gatesShaBefore,'MOVEKIT_V2_RELEASE_GATES.json unchanged');
  ok(read('docs/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_CUTOVER_CHECKLIST_20261109.md').includes('STAGED_ONLY_NOT_RELEASED'),
    'cutover checklist present');
  console.log('TK614 original-226 private media parity: '+checks+' assertions PASS; 452 staged entries, '+
    '452/452 originals refused by broker, 356 unchanged, FK-only != media; no release, grant, URL or DB write');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
