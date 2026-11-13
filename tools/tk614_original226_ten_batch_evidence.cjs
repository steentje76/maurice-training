'use strict';
/**
 * TK504/#614 -- offline audit evidence for 10 distinct authenticated 25-object batches
 * (nine 25-exercise runs, one 1-exercise run).
 *
 * Reads the ten PRIVATE reports from outside this repository and checks each against
 * the pinned original-226 staging manifest, including the manifest's own per-batch
 * byte sums. Writes a sanitized, hash-pinned consistency report, NOT a release.
 *
 * Never reads environment credentials, uses network/DB, grants access or signs an
 * attestation. The production media gate still requires a separately signed full
 * attestation and its CUTOVER remains hardcoded false.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./tk614_original226_private_media_staging.cjs');
const ROOT=path.resolve(__dirname,'..');
const MANIFEST_FILE=path.join(ROOT,'docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json');
const MANIFEST_FILE_SHA256='67dd9c9f51ace53d97dfafc047f27603c72013ada1f5fd967273806c1da7050e';
const MANIFEST_ALL_SHA256='8492f2c14521b9443db3f1c875b936cd8bddc96fbacc0837c9558c5a95738b10';
const PROJECT_REF='mhfxhzkdmgkaplicdszg';
const REPORT_SCHEMA='tk504-private-storage-byte-sha-report/1.0';
const SOURCE_COMMIT='bf94b43a9f517f9f0136a588d55571879814c87e';
const OUTPUT_SCHEMA='tk504-original226-ten-batch-consistency/1.0';
const HEX64=/^[a-f0-9]{64}$/;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const id=n=>'TK-'+String(n).padStart(6,'0');
function check(condition,code){if(!condition){const e=new Error(code);e.code=code;throw e;}}
function reportName(i){return 'TK504-Audit-B'+String(i).padStart(2,'0')+'-20261113'+(i===1?'-RETRY1':'')+'.json';}
function parseManifest(buffer){
  check(Buffer.isBuffer(buffer)&&hash(buffer)===MANIFEST_FILE_SHA256,'ORIGINAL226_MANIFEST_FILE_SHA_MISMATCH');
  let m;try{m=JSON.parse(buffer);}catch(_){check(false,'ORIGINAL226_MANIFEST_INVALID_JSON');}
  check(m?.schema==='tk614-original226-private-media-staging/1.0'&&
    m.status==='STAGED_ONLY_NOT_RELEASED'&&m.scope?.first===id(1)&&m.scope?.last===id(226)&&
    m.scope?.catalog_count===226&&m.scope?.media_entries===452&&m.totals?.entries===452&&
    m.totals?.all_sha256===MANIFEST_ALL_SHA256&&Array.isArray(m.entries)&&m.entries.length===452,
    'ORIGINAL226_MANIFEST_SCOPE_CHANGED');
  check(M.stagingManifestProblems(m).length===0,'ORIGINAL226_MANIFEST_IDENTITY_INVALID');
  const expected=new Map();
  for(let i=1;i<=226;i++)expected.set(id(i),{video:0,poster:0});
  for(const e of m.entries){
    const x=expected.get(e.catalog_id);
    check(!!x&&['video','poster'].includes(e.media_type)&&Number.isSafeInteger(e.bytes)&&
      e.bytes>0&&HEX64.test(e.sha256)&&e.status==='STAGED_ONLY_NOT_RELEASED',
      'ORIGINAL226_MANIFEST_ENTRY_INVALID');
    check(x[e.media_type]===0,'ORIGINAL226_MANIFEST_DUPLICATE_MEDIA_TYPE');
    x[e.media_type]=e.bytes;
  }
  check([...expected.values()].every(x=>x.video>0&&x.poster>0),'ORIGINAL226_MANIFEST_PAIR_MISSING');
  const totals=[...expected.values()].reduce((a,x)=>({video:a.video+x.video,poster:a.poster+x.poster}),{video:0,poster:0});
  check(totals.video===m.totals.video_bytes&&totals.poster===m.totals.poster_bytes,
    'ORIGINAL226_MANIFEST_BYTE_SUM_MISMATCH');
  return {m,expected,totals};
}
function verifyBatch(raw,index,manifest){
  check(Buffer.isBuffer(raw),'BATCH_REPORT_NOT_BUFFER');
  let r;try{r=JSON.parse(raw);}catch(_){check(false,'BATCH_REPORT_INVALID_JSON');}
  const first=1+25*(index-1),last=Math.min(226,first+24),count=last-first+1,objects=count*2;
  check(r?.schema===REPORT_SCHEMA&&r.mode==='live-batch'&&r.project_ref===PROJECT_REF&&
    r.manifest_file_sha256===MANIFEST_FILE_SHA256&&r.manifest_all_sha256===MANIFEST_ALL_SHA256&&
    r.app_commit===SOURCE_COMMIT,'BATCH_PROVENANCE_MISMATCH');
  check(r.batch?.start_id===id(first)&&r.batch?.end_id===id(last)&&r.batch?.size===count&&
    r.batch?.expected_objects===objects,'BATCH_RANGE_MISMATCH');
  check(r.checked===objects&&r.pass===objects&&r.fail===0&&r.unable===0&&r.retries===0&&
    r.batch_outcome==='PASS'&&Array.isArray(r.failures)&&r.failures.length===0&&
    r.categories!==null&&typeof r.categories==='object'&&!Array.isArray(r.categories)&&
    Object.keys(r.categories).length===0,'BATCH_NOT_ALL_PASS');
  check(r.authorizes_nothing===true&&r.media_persisted===false&&r.credentials_logged===false&&
    r.status==='BATCH_PASS_NOT_RELEASE_EVIDENCE'&&r.verdict==='PARTIAL_NOT_ATTESTABLE'&&
    r.attestation_eligible===false&&r.complete_452===false&&r.full_expected===452,
    'BATCH_RELEASE_SEMANTICS_INVALID');
  const bytes={video:0,poster:0};
  for(let n=first;n<=last;n++){
    const e=manifest.expected.get(id(n));
    check(!!e,'BATCH_ID_MISSING_FROM_MANIFEST');
    bytes.video+=e.video;bytes.poster+=e.poster;
  }
  for(const kind of ['video','poster']){
    const v=r[kind];
    check(v?.expected===count&&v.checked===count&&v.pass===count&&v.fail===0&&v.unable===0&&
      v.expected_bytes===bytes[kind]&&v.verified_bytes===bytes[kind],
      'BATCH_BYTE_SUM_OR_TYPE_MISMATCH');
  }
  return {batch:index,first_id:id(first),last_id:id(last),exercises:count,objects_verified:objects,
    video_bytes:bytes.video,poster_bytes:bytes.poster,report_sha256:hash(raw)};
}
function aggregateEvidence({manifestBuffer,reportBuffers}){
  const manifest=parseManifest(manifestBuffer);
  check(Array.isArray(reportBuffers)&&reportBuffers.length===10,'TEN_REPORTS_REQUIRED');
  const batches=reportBuffers.map((raw,i)=>verifyBatch(raw,i+1,manifest));
  const total=batches.reduce((a,b)=>{a.exercises+=b.exercises;a.objects+=b.objects_verified;
    a.video_bytes+=b.video_bytes;a.poster_bytes+=b.poster_bytes;return a;},
    {exercises:0,objects:0,video_bytes:0,poster_bytes:0});
  check(total.exercises===226&&total.objects===452&&total.video_bytes===manifest.totals.video&&
    total.poster_bytes===manifest.totals.poster,'TEN_BATCH_TOTAL_MISMATCH');
  return {schema:OUTPUT_SCHEMA,status:'TEN_BATCH_REPORTS_PASS_NOT_RELEASE_EVIDENCE',
    source:{project_ref:PROJECT_REF,app_commit:SOURCE_COMMIT,
      manifest_file_sha256:MANIFEST_FILE_SHA256,manifest_all_sha256:MANIFEST_ALL_SHA256},
    coverage:{first_id:id(1),last_id:id(226),no_gaps:true,no_overlap:true,exercises:226,
      total_objects:452,videos:226,posters:226,video_bytes:total.video_bytes,
      poster_bytes:total.poster_bytes,total_bytes:total.video_bytes+total.poster_bytes,
      failed:0,unable:0,retries:0},
    batches,release:{attestation_signed:false,release_authorized:false,cutover_authorized:false,
      notes:'Ten distinct unsigned live-batch reports checked against a pinned manifest. Not a single continuous live verifier report, owner signature, grant or playback authorization.'}};
}
function outsideRepo(abs){
  const dir=fs.realpathSync(abs),root=fs.realpathSync(ROOT);
  const rel=path.relative(root,dir);
  check(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel),
    'PRIVATE_REPORTS_MUST_BE_OUTSIDE_REPO');
  return dir;
}
function cli(argv){
  const opts={};for(let i=0;i<argv.length;i+=2){
    const k=argv[i];check(['--reports-dir','--out'].includes(k)&&
      opts[k]===undefined&&typeof argv[i+1]==='string','USAGE');
    opts[k]=argv[i+1];
  }
  check(argv.length===4&&path.isAbsolute(opts['--reports-dir'])&&path.isAbsolute(opts['--out']),'USAGE');
  const from=outsideRepo(opts['--reports-dir']);
  const to=path.resolve(opts['--out']);
  outsideRepo(path.dirname(to));
  check(!fs.existsSync(to),'PRIVATE_OUTPUT_ALREADY_EXISTS');
  const reportBuffers=Array.from({length:10},(_,i)=>fs.readFileSync(path.join(from,reportName(i+1))));
  const result=aggregateEvidence({manifestBuffer:fs.readFileSync(MANIFEST_FILE),reportBuffers});
  fs.writeFileSync(to,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  const raw=fs.readFileSync(to);
  process.stdout.write(JSON.stringify({status:result.status,coverage:result.coverage,
    private_output_path:to,private_output_sha256:hash(raw),
    release_authorized:false})+'\n');
}
if(require.main===module){try{cli(process.argv.slice(2));}catch(e){
  process.stderr.write('TK504_EVIDENCE_BLOCKED '+(e.code||e.message)+'\n');process.exitCode=1;}}
module.exports=Object.freeze({MANIFEST_FILE_SHA256,MANIFEST_ALL_SHA256,OUTPUT_SCHEMA,
  aggregateEvidence,parseManifest,verifyBatch,reportName,cli});
