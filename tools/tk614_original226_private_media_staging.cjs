'use strict';
/**
 * TK614 / #603 -- ORIGINAL-226 PRIVATE MEDIA *STAGING* CONTRACT (pre-release).
 *
 * What this is:
 *  - A deterministic, source-locked, PUBLIC metadata-only staging manifest for the
 *    original 226 MoveKit items (TK-000001..TK-000226): 226 x (video + poster) =
 *    452 entries with the exact expected private Storage path, byte size and SHA256.
 *    Sources: exercise-catalog.json (pinned, provider identity),
 *    docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json (video) and
 *    docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json (optimized WebP poster).
 *  - Pure, fail-closed validators that keep three scopes apart:
 *      a) original_226_fk_identity_release (FK identity only, media_grants 0) -- NEVER media approval;
 *      b) released_batches + entries (the 356 media release, 15 batches / 1164 entries) -- untouched;
 *      c) this staging manifest -- STAGED_ONLY_NOT_RELEASED, authorises nothing.
 *  - A validator for a FUTURE, separate owner-signed media-release record. Even a
 *    fully valid record does NOT release media in this version (hard false).
 *
 * What this is NOT:
 *  - no grants, no signing, no signed URLs, no public URLs, no secrets, no keys,
 *    no key generation, no network, no database, no Storage upload, no env access.
 *  - Entries deliberately carry NO reviewed / upload_verified / review_reference
 *    fields, so they are inert even if someone merged them into release gates.
 *
 * CLI (offline):
 *   node tools/tk614_original226_private_media_staging.cjs --check   (default) verify committed manifest
 *   node tools/tk614_original226_private_media_staging.cjs --write   (re)write the single staging manifest
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('./tk614_original226_review_packet.cjs');
const A=require('./tk614_original226_admin_release.cjs');

const ROOT=path.resolve(__dirname,'..');
const CATALOG_FILE=path.join(ROOT,'exercise-catalog.json');
const INVENTORY_FILE=path.join(ROOT,'docs','generated','MOVEKIT_GOLDEN_V2_INVENTORY.json');
const POSTER_FILE=path.join(ROOT,'docs','generated','MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const MANIFEST_FILE=path.join(ROOT,'docs','generated','TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json');

const SCHEMA='tk614-original226-private-media-staging/1.0';
const STATUS='STAGED_ONLY_NOT_RELEASED';
const ORIGINAL=226,TOTAL=582,ENTRY_COUNT=ORIGINAL*2;
const VIDEO_BUCKET='exercise-media',POSTER_BUCKET='exercise-posters';
// Same pins as netlify/functions/exercise-media-v2-url.js (asserted equal in the test).
const INVENTORY_SHA256='a8500ce902bbea4f1ff5ad0be6576f70b44616f8803367a27122e5449c815a66';
const POSTER_DIGEST_SHA256='07fe0762c6eb5814d03d006e060b8eec0dd4e47cd053a3d3846ff003cc8559a4';
const INVENTORY_SCHEMA='trainingskompas-movekit-golden-inventory/2.0';
const INVENTORY_STATUS='STAGING_ONLY_DO_NOT_ACTIVATE';
const POSTER_SCHEMA='trainingskompas-movekit-v2-optimized-poster-digests/1.0';
const POSTER_STATUS='STAGING_INDEX_NOT_RELEASE_APPROVAL';
const MAX_VIDEO_BYTES=256*1024*1024,MAX_POSTER_BYTES=1048576;
const EMPTY_SHA256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CID=/^TK-[0-9]{6}$/;
const HEX64=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_Z=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const ENTRY_KEYS=Object.freeze(['catalog_id','provider_id','media_type','bucket','storage_path','sha256','bytes','mime','status']);
const AUTHORIZES_KEYS=Object.freeze(['media_access','media_grants','signing','signed_urls','public_urls',
  'release_gates_change','released_batches_change','database_writes','storage_uploads']);
const FORBIDDEN_TEXT=/https?:|token=|signedurl|signed_url|service_role|apikey|BEGIN [A-Z ]*KEY|value_base64/i;

// Future owner-signed media release record (validator only; nothing creates or signs one here).
const MEDIA_RECORD_SCHEMA='tk614-original226-media-release-record/1.0';
const MEDIA_RECORD_KIND='OWNER_SIGNED_ORIGINAL226_MEDIA_RELEASE';
const MEDIA_RECORD_DECISION_RE=/^TK614-OWNER-MEDIA226-[0-9]{8}-[A-Z0-9]{2,32}$/;
const MEDIA_RECORD_KEYS=Object.freeze(['schema','kind','decision_id','approved_by','approved_at','manifest','grant',
  'evidence','record_sha256','signature']);
const MEDIA_RECORD_EVIDENCE_KEYS=Object.freeze(['byte_level_download_sha256_proof','media_rights_evidence',
  'range_206_android_webview_proof','signed_url_ttl_owner_switch_revoke_proof']);
const SIGNING_DOMAIN='TK614-ORIGINAL226-MEDIA-RELEASE/1\n';
const GRANT_SCOPE='movekit_v2',MAX_RECORD_USERS=50;
// Hard switch: this version can never release original-226 media, whatever the inputs.
const MEDIA_CUTOVER_ENABLED=false;

const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const pad=n=>String(n).padStart(6,'0');
const num=id=>Number(String(id).slice(3));
function fail(code){const e=new Error(code);e.code=code;throw e;}
function need(ok,code){if(!ok)fail(code);}
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const sameKeys=(o,keys)=>isObj(o)&&JSON.stringify(Object.keys(o).sort())===JSON.stringify([...keys].sort());
const idsSha=list=>sha(Buffer.from(list.join('\n'),'utf8'));

function indexUnique(items,dupCode,invalidCode){
  const m=new Map();
  for(const it of items){
    need(isObj(it)&&CID.test(it.catalog_id||''),invalidCode);
    need(!m.has(it.catalog_id),dupCode);
    m.set(it.catalog_id,it);
  }
  return m;
}
function checkAsset(a,kind,expectedPath,mime,maxBytes){
  need(isObj(a),kind+'_ASSET_MISSING');
  need(a.path===expectedPath,kind+'_PATH_MISMATCH');
  need(typeof a.sha256==='string'&&HEX64.test(a.sha256)&&a.sha256!==EMPTY_SHA256,kind+'_SHA256_INVALID');
  need(Number.isSafeInteger(a.bytes)&&a.bytes>0&&a.bytes<=maxBytes,kind+'_BYTES_INVALID');
  need(a.mime===mime,kind+'_MIME_INVALID');
  return {path:a.path,sha256:a.sha256,bytes:a.bytes,mime:a.mime};
}

// Deterministic: same three sources -> byte-identical manifest. No clock, no env.
function buildStagingManifest({catalogBytes,inventory,posters}={}){
  const {byId:catalog,sourceSha}=P.loadCatalog(catalogBytes); // pinned sha + exact 226 identity
  need(isObj(inventory)&&inventory.schema===INVENTORY_SCHEMA&&inventory.status===INVENTORY_STATUS&&
    Array.isArray(inventory.items)&&inventory.items.length===TOTAL,'GOLDEN_INVENTORY_INVALID');
  need(isObj(posters)&&posters.schema===POSTER_SCHEMA&&posters.status===POSTER_STATUS&&
    posters.golden_inventory_sha256===INVENTORY_SHA256&&posters.count===TOTAL&&
    Array.isArray(posters.items)&&posters.items.length===TOTAL,'POSTER_REGISTRY_INVALID');
  const golden=indexUnique(inventory.items,'GOLDEN_DUPLICATE_CATALOG_ID','GOLDEN_ITEM_INVALID');
  const poster=indexUnique(posters.items,'POSTER_DUPLICATE_CATALOG_ID','POSTER_ITEM_INVALID');
  // One provider slug per catalog item across all 582: an alias of an original slug elsewhere is rejected.
  const slugs=new Set();
  for(const it of inventory.items){
    need(typeof it.provider_id==='string'&&SLUG.test(it.provider_id),'GOLDEN_PROVIDER_ID_INVALID');
    need(!slugs.has(it.provider_id),'GOLDEN_PROVIDER_ALIAS_DUPLICATE');
    slugs.add(it.provider_id);
  }
  for(const it of posters.items)need(golden.has(it.catalog_id),'POSTER_UNEXPECTED_CATALOG_ID');
  const originals=inventory.items.filter(it=>it.status==='existing-id');
  need(originals.length===ORIGINAL&&originals.every(it=>num(it.catalog_id)>=1&&num(it.catalog_id)<=ORIGINAL),
    'GOLDEN_ORIGINAL_SET_MISMATCH');
  const entries=[],ids=[],providers=[];
  let videoBytes=0,posterBytes=0;
  for(let n=1;n<=ORIGINAL;n++){
    const id='TK-'+pad(n),c=catalog.get(id),g=golden.get(id),p=poster.get(id);
    need(g,'GOLDEN_ORIGINAL_MISSING');
    need(p,'POSTER_ORIGINAL_MISSING');
    const slug=c.source.provider_id;
    need(SLUG.test(slug),'CATALOG_PROVIDER_ID_INVALID');
    need(g.status==='existing-id','GOLDEN_ORIGINAL_STATUS_INVALID');
    need(g.provider_id===slug,'GOLDEN_PROVIDER_MISMATCH');
    need(p.provider_id===slug,'POSTER_PROVIDER_MISMATCH');
    const v=checkAsset(g.video,'VIDEO','movekit/v2/video/'+slug+'.mp4','video/mp4',MAX_VIDEO_BYTES);
    const w=checkAsset(p,'POSTER','movekit/v2/poster-optimized/'+slug+'.webp','image/webp',MAX_POSTER_BYTES);
    entries.push({catalog_id:id,provider_id:slug,media_type:'video',bucket:VIDEO_BUCKET,storage_path:v.path,
      sha256:v.sha256,bytes:v.bytes,mime:v.mime,status:STATUS});
    entries.push({catalog_id:id,provider_id:slug,media_type:'poster',bucket:POSTER_BUCKET,storage_path:w.path,
      sha256:w.sha256,bytes:w.bytes,mime:w.mime,status:STATUS});
    ids.push(id);providers.push(slug);videoBytes+=v.bytes;posterBytes+=w.bytes;
  }
  const m={
    schema:SCHEMA,status:STATUS,
    scope:{first:'TK-000001',last:'TK-'+pad(ORIGINAL),catalog_count:ORIGINAL,media_entries:ENTRY_COUNT,
      media_types:['video','poster']},
    generated_from:{generator:'tools/tk614_original226_private_media_staging.cjs',
      catalog_file:'exercise-catalog.json',source_catalog_sha256:sourceSha,
      golden_inventory_file:'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json',golden_inventory_sha256:INVENTORY_SHA256,
      poster_digest_file:'docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json',poster_digest_sha256:POSTER_DIGEST_SHA256},
    authorizes:Object.fromEntries(AUTHORIZES_KEYS.map(k=>[k,false])),
    separation:{fk_identity_record_key:P.RECORD_KEY,fk_identity_record_is_media_approval:false,
      media_release_356_entries:'UNCHANGED_NOT_APPENDED',owner_signed_media_release_record:'NONE'},
    totals:{entries:ENTRY_COUNT,video_bytes:videoBytes,poster_bytes:posterBytes,
      catalog_ids_sha256:idsSha(ids),provider_ids_sha256:idsSha(providers),all_sha256:null},
    entries};
  m.totals.all_sha256=manifestDigest(m);
  return m;
}
function manifestDigest(m){
  return sha(Buffer.from(JSON.stringify({schema:m.schema,status:m.status,scope:m.scope,
    generated_from:m.generated_from,authorizes:m.authorizes,entries:m.entries}),'utf8'));
}
const serializeManifest=m=>JSON.stringify(m,null,2)+'\n';

// Structural, source-free invariants. [] = staged-only and inert.
function stagingManifestProblems(m){
  if(!isObj(m)||m.schema!==SCHEMA)return ['STAGING_MANIFEST_MISSING_OR_SCHEMA_INVALID'];
  const p=new Set();
  if(m.status!==STATUS)p.add('STAGING_MANIFEST_STATUS_NOT_STAGED');
  if(!sameKeys(m.authorizes,AUTHORIZES_KEYS)||!AUTHORIZES_KEYS.every(k=>m.authorizes[k]===false))
    p.add('STAGING_MANIFEST_AUTHORIZES_SOMETHING');
  const e=m.entries;
  if(!Array.isArray(e)||e.length!==ENTRY_COUNT)p.add('STAGING_MANIFEST_ENTRY_COUNT_INVALID');
  if(Array.isArray(e)){
    if(!e.every(x=>sameKeys(x,ENTRY_KEYS)&&x.status===STATUS))p.add('STAGING_ENTRY_SHAPE_INVALID');
    if(!e.every((x,i)=>isObj(x)&&x.catalog_id==='TK-'+pad(Math.floor(i/2)+1)&&
        x.media_type===(i%2===0?'video':'poster')&&x.bucket===(i%2===0?VIDEO_BUCKET:POSTER_BUCKET)))
      p.add('STAGING_MANIFEST_ORDER_OR_COVERAGE_INVALID');
  }
  // Approved metadata keys such as authorizes.signed_urls=false are policy
  // declarations, not signed URLs. Validate this object's exact false values
  // separately above; scan the remaining data for leaked URLs/tokens/secrets.
  let text='';try{text=JSON.stringify({...m,authorizes:undefined});}catch(_){text='';}
  if(!text||FORBIDDEN_TEXT.test(text))p.add('STAGING_MANIFEST_CONTAINS_URL_OR_SECRET');
  if(!isObj(m.totals)||m.totals.all_sha256!==manifestDigest(m))p.add('STAGING_MANIFEST_DIGEST_MISMATCH');
  return [...p].sort();
}
// Full verification: structural invariants AND byte-identical re-derivation from the sources.
function verifyStagingManifest(m,sources){
  const fresh=buildStagingManifest(sources);
  const problems=stagingManifestProblems(m);
  if(problems.length||serializeManifest(m)!==serializeManifest(fresh)){
    const e=new Error('STAGING_MANIFEST_TAMPERED');e.code='STAGING_MANIFEST_TAMPERED';e.problems=problems;throw e;
  }
  return fresh;
}

// ---------------------------------------------------------------------------
// Scope separation
function fkRecordMediaProblems(record){
  if(!isObj(record))return ['FK_RECORD_MISSING'];
  const p=new Set();
  if(record.binding_kind!==P.BINDING_KIND)p.add('FK_RECORD_BINDING_KIND_INVALID');
  if(record.media_grants!==0)p.add('FK_RECORD_CLAIMS_MEDIA_GRANTS');
  if(record.media_access!=='NOT_RELEASED')p.add('FK_RECORD_CLAIMS_MEDIA_ACCESS');
  if(own(record,'entries')||own(record,'media_entries'))p.add('FK_RECORD_CONTAINS_MEDIA_ENTRIES');
  return [...p].sort();
}
function releaseGatesSeparationProblems(gates,manifest){
  if(!isObj(gates))return ['RELEASE_GATES_MISSING'];
  const p=new Set(A.mediaGateProblems(gates));
  // The existing 1164-entry release index has metadata for ALL 582 assets:
  // 452 original and 712 newer. Only the 15 released_batches authorize the
  // newer 356; an entry for the original 226 is NOT a release decision.
  if(!Array.isArray(gates.entries))p.add('RELEASE_GATES_MEDIA_ENTRIES_INVALID');
  else{
    const originals=[],newer=[];
    for(const x of gates.entries){
      if(!isObj(x)||!CID.test(x.catalog_id||'')||num(x.catalog_id)<1||num(x.catalog_id)>TOTAL){
        p.add('RELEASE_GATES_MEDIA_SCOPE_INVALID');continue;
      }
      (num(x.catalog_id)<=ORIGINAL?originals:newer).push(x);
    }
    if(originals.length!==ENTRY_COUNT||newer.length!==2*(TOTAL-ORIGINAL))
      p.add('RELEASE_GATES_MEDIA_SCOPE_INVALID');
    const seen=new Set();
    const expected=isObj(manifest)&&Array.isArray(manifest.entries)
      ?new Map(manifest.entries.map(x=>[x.catalog_id+':'+x.media_type,x])):null;
    for(const x of originals){
      const k=x.catalog_id+':'+x.media_type;
      if(seen.has(k)||!['video','poster'].includes(x.media_type))
        p.add('RELEASE_GATES_ORIGINAL_MEDIA_DUPLICATE_OR_TYPE_INVALID');
      seen.add(k);
      if(expected){
        const e=expected.get(k);
        if(!e||x.storage_path!==e.storage_path||x.sha256!==e.sha256||x.bytes!==e.bytes)
          p.add('RELEASE_GATES_ORIGINAL_MEDIA_SOURCE_DRIFT');
      }
    }
  }
  for(const x of fkRecordMediaProblems(gates[P.RECORD_KEY]))p.add(x);
  return [...p].sort();
}

// ---------------------------------------------------------------------------
// FUTURE owner-signed media release record: unsigned draft builder + validator.
function mediaRecordManifestBinding(m){
  return {schema:SCHEMA,all_sha256:m.totals.all_sha256,entries:m.entries.length,
    catalog_ids_sha256:m.totals.catalog_ids_sha256,provider_ids_sha256:m.totals.provider_ids_sha256};
}
function mediaRecordDigest(r){
  need(isObj(r),'MEDIA_RECORD_SHAPE_INVALID');
  const rest={};for(const k of Object.keys(r))if(k!=='record_sha256'&&k!=='signature')rest[k]=r[k];
  return sha(Buffer.from(A.canonicalJson(rest),'utf8'));
}
// Exact bytes an owner would sign offline (domain-separated from FK/ACTIVATE approvals).
function mediaRecordSigningMessage(r){
  return Buffer.concat([Buffer.from(SIGNING_DOMAIN,'utf8'),Buffer.from(mediaRecordDigest(r),'hex')]);
}
// UNSIGNED draft only. Building or holding a draft authorises nothing.
function buildMediaReleaseRecordDraft(m,{decisionId,approvedBy,approvedAt,userIds,evidence}={}){
  need(stagingManifestProblems(m).length===0,'STAGING_MANIFEST_INVALID');
  const r={schema:MEDIA_RECORD_SCHEMA,kind:MEDIA_RECORD_KIND,decision_id:decisionId,approved_by:approvedBy,
    approved_at:approvedAt,manifest:mediaRecordManifestBinding(m),
    grant:{scope:GRANT_SCOPE,user_ids:Array.isArray(userIds)?[...userIds]:userIds},
    evidence:isObj(evidence)?{...evidence}:Object.fromEntries(MEDIA_RECORD_EVIDENCE_KEYS.map(k=>[k,null])),
    record_sha256:null,signature:null};
  r.record_sha256=mediaRecordDigest(r);
  return r;
}
const personOk=v=>typeof v==='string'&&v.trim().length>=2&&v.length<=128&&!/[\u0000-\u001f'\\]/.test(v);
function mediaReleaseRecordProblems(record,manifest,opts={}){
  if(!isObj(record))return ['MEDIA_RECORD_MISSING'];
  if(record.schema===P.SCHEMA_RECORD||own(record,'binding_kind')||own(record,'media_grants'))
    return ['FK_IDENTITY_RECORD_IS_NOT_MEDIA_APPROVAL'];
  if(!sameKeys(record,MEDIA_RECORD_KEYS)||record.schema!==MEDIA_RECORD_SCHEMA||record.kind!==MEDIA_RECORD_KIND)
    return ['MEDIA_RECORD_SHAPE_INVALID'];
  const p=new Set();
  if(!MEDIA_RECORD_DECISION_RE.test(record.decision_id||''))p.add('MEDIA_RECORD_DECISION_ID_INVALID');
  if(!personOk(record.approved_by)||!ISO_Z.test(record.approved_at||''))p.add('MEDIA_RECORD_SHAPE_INVALID');
  const mp=stagingManifestProblems(manifest);
  for(const x of mp)p.add(x);
  let bound=false;
  try{bound=!mp.length&&A.canonicalJson(record.manifest)===A.canonicalJson(mediaRecordManifestBinding(manifest));}
  catch(_){bound=false;}
  if(!bound)p.add('MEDIA_RECORD_MANIFEST_MISMATCH');
  const g=record.grant,users=isObj(g)&&Array.isArray(g.user_ids)?g.user_ids:null;
  if(!sameKeys(g,['scope','user_ids'])||g.scope!==GRANT_SCOPE||!users||users.length<1||users.length>MAX_RECORD_USERS||
     !users.every(u=>typeof u==='string'&&UUID.test(u))||new Set(users).size!==users.length)
    p.add('MEDIA_RECORD_GRANT_INVALID');
  else if(!(typeof opts.accountUserId==='string'&&users.includes(opts.accountUserId)))
    p.add('MEDIA_RECORD_ACCOUNT_NOT_COVERED');
  const ev=record.evidence,vals=isObj(ev)?MEDIA_RECORD_EVIDENCE_KEYS.map(k=>ev[k]):[];
  if(!sameKeys(ev,MEDIA_RECORD_EVIDENCE_KEYS)||!vals.every(h=>typeof h==='string'&&HEX64.test(h)&&!/^(.)\1{63}$/.test(h))||
     new Set(vals).size!==vals.length)
    p.add('MEDIA_RECORD_EVIDENCE_INVALID');
  let digest=null;try{digest=mediaRecordDigest(record);}catch(_){digest=null;}
  if(!digest||record.record_sha256!==digest)p.add('MEDIA_RECORD_DIGEST_MISMATCH');
  const trusted=opts.trustedKeys===undefined?A.TRUSTED_OWNER_KEY_SHA256:opts.trustedKeys;
  const s=record.signature;
  if(!sameKeys(s,['alg','public_key_spki_der_base64','value_base64'])||s.alg!=='ed25519'||
     typeof s.public_key_spki_der_base64!=='string'||typeof s.value_base64!=='string'){
    p.add('MEDIA_RECORD_SIGNATURE_REQUIRED');
  }else if(!Array.isArray(trusted)||trusted.length===0||!trusted.every(k=>HEX64.test(k))){
    p.add('MEDIA_RECORD_NO_TRUSTED_OWNER_KEY');
  }else{
    const der=Buffer.from(s.public_key_spki_der_base64,'base64');
    if(!trusted.includes(sha(der)))p.add('MEDIA_RECORD_OWNER_KEY_NOT_TRUSTED');
    else{
      let ok=false;
      try{
        const key=crypto.createPublicKey({key:der,format:'der',type:'spki'});
        ok=!!digest&&key.asymmetricKeyType==='ed25519'&&
          crypto.verify(null,mediaRecordSigningMessage(record),key,Buffer.from(s.value_base64,'base64'));
      }catch(_){ok=false;}
      if(!ok)p.add('MEDIA_RECORD_SIGNATURE_INVALID');
    }
  }
  return [...p].sort();
}

// The single question a future broker/client may ask. In THIS version always released:false.
function original226MediaRelease(gates,manifest,record,opts={}){
  const b=new Set();
  if(!MEDIA_CUTOVER_ENABLED)b.add('ORIGINAL226_MEDIA_CUTOVER_NOT_ENABLED_IN_THIS_VERSION');
  for(const x of stagingManifestProblems(manifest))b.add(x);
  if(isObj(manifest)&&manifest.status===STATUS)b.add('ORIGINAL226_MEDIA_STAGED_ONLY_NOT_RELEASED');
  for(const x of releaseGatesSeparationProblems(gates,manifest))b.add(x);
  if(record===undefined||record===null)b.add('ORIGINAL226_OWNER_SIGNED_MEDIA_RECORD_MISSING');
  else for(const x of mediaReleaseRecordProblems(record,manifest,opts))b.add(x);
  return Object.freeze({released:false,blockers:[...b].sort()});
}

// ---------------------------------------------------------------------------
function repoSources(){
  return {catalogBytes:fs.readFileSync(CATALOG_FILE),
    inventory:JSON.parse(fs.readFileSync(INVENTORY_FILE,'utf8')),
    posters:JSON.parse(fs.readFileSync(POSTER_FILE,'utf8'))};
}
const USAGE='Usage: tk614_original226_private_media_staging.cjs [--check|--write]';
function run(argv,io={}){
  const out=io.stdout||(x=>process.stdout.write(x));
  need(argv.length<=1,'USAGE');
  const cmd=argv[0]||'--check';
  need(cmd==='--check'||cmd==='--write','USAGE');
  const sources=io.sources||repoSources();
  const file=io.manifestFile||MANIFEST_FILE;
  const m=buildStagingManifest(sources);
  let status;
  if(cmd==='--write'){
    fs.writeFileSync(file,serializeManifest(m),'utf8');
    status='STAGING_MANIFEST_WRITTEN_AUTHORISES_NOTHING';
  }else{
    need(fs.existsSync(file),'STAGING_MANIFEST_FILE_MISSING');
    let committed;try{committed=JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){fail('STAGING_MANIFEST_NOT_JSON');}
    verifyStagingManifest(committed,sources);
    status='STAGING_MANIFEST_VERIFIED_AUTHORISES_NOTHING';
  }
  // Counts and digests only: no paths, no URLs.
  const report={status,schema:SCHEMA,manifest_status:m.status,entries:m.entries.length,
    video_bytes:m.totals.video_bytes,poster_bytes:m.totals.poster_bytes,all_sha256:m.totals.all_sha256,
    media_release:false,database_writes_performed:false,network_used:false};
  out(JSON.stringify(report)+'\n');
  return report;
}
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(e){process.stderr.write('TK614_ORIGINAL226_MEDIA_STAGING_BLOCKED: '+(e.code||e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({SCHEMA,STATUS,ORIGINAL,ENTRY_COUNT,VIDEO_BUCKET,POSTER_BUCKET,INVENTORY_SHA256,
  POSTER_DIGEST_SHA256,MANIFEST_FILE,ENTRY_KEYS,AUTHORIZES_KEYS,MEDIA_RECORD_SCHEMA,MEDIA_RECORD_KIND,
  MEDIA_RECORD_EVIDENCE_KEYS,SIGNING_DOMAIN,MEDIA_CUTOVER_ENABLED,USAGE,
  buildStagingManifest,manifestDigest,serializeManifest,stagingManifestProblems,verifyStagingManifest,
  fkRecordMediaProblems,releaseGatesSeparationProblems,mediaRecordDigest,mediaRecordSigningMessage,
  buildMediaReleaseRecordDraft,mediaReleaseRecordProblems,original226MediaRelease,repoSources,run});
