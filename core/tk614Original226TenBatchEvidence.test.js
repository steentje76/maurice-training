'use strict';
// TK504/#614 -- ten-batch audit evidence tests. Synthetic reports + committed
// public SHA manifest only. No real private media, credentials, HTTP or DB.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const E=require('../tools/tk614_original226_ten_batch_evidence.cjs');
const root=path.join(__dirname,'..');
const manifestRaw=fs.readFileSync(path.join(root,'docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json'));
const manifest=JSON.parse(manifestRaw);
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const bad=(fn,code)=>{assert.throws(fn,x=>x.code===code,'MUST_FAIL_'+code);checks++;};
const id=n=>'TK-'+String(n).padStart(6,'0');
const mkReports=()=>Array.from({length:10},(_,i)=>{
  const first=i*25+1,last=Math.min(first+24,226),count=last-first+1;
  const kind=t=>{
    const selected=manifest.entries.filter(x=>x.media_type===t&&x.catalog_id>=id(first)&&x.catalog_id<=id(last));
    const bytes=selected.reduce((sum,x)=>sum+x.bytes,0);
    eq(selected.length,count);
    return {expected:count,checked:count,pass:count,fail:0,unable:0,expected_bytes:bytes,verified_bytes:bytes};
  };
  return Buffer.from(JSON.stringify({schema:'tk504-private-storage-byte-sha-report/1.0',
    mode:'live-batch',project_ref:'mhfxhzkdmgkaplicdszg',
    manifest_file:'C:/TEST/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json',
    manifest_file_sha256:E.MANIFEST_FILE_SHA256,manifest_all_sha256:E.MANIFEST_ALL_SHA256,
    app_commit:'bf94b43a9f517f9f0136a588d55571879814c87e',
    authorizes_nothing:true,media_persisted:false,credentials_logged:false,
    checked:count*2,pass:count*2,fail:0,unable:0,retries:0,
    video:kind('video'),poster:kind('poster'),categories:{},duration_ms:900,
    batch:{start_id:id(first),end_id:id(last),size:count,expected_objects:count*2},
    batch_outcome:'PASS',status:'BATCH_PASS_NOT_RELEASE_EVIDENCE',
    verdict:'PARTIAL_NOT_ATTESTABLE',attestation_eligible:false,complete_452:false,
    full_expected:452,failures:[]}));
});
const reports=mkReports();
const agg=E.aggregateEvidence({manifestBuffer:manifestRaw,reportBuffers:reports});
eq([agg.coverage.exercises,agg.coverage.total_objects,agg.coverage.videos,agg.coverage.posters],
  [226,452,226,226]);
eq([agg.coverage.video_bytes,agg.coverage.poster_bytes,agg.coverage.total_bytes],
  [780852020,3879362,784731382]);
eq([agg.status,agg.release.attestation_signed,agg.release.release_authorized,
  agg.release.cutover_authorized],['TEN_BATCH_REPORTS_PASS_NOT_RELEASE_EVIDENCE',false,false,false]);
eq([agg.batches.length,agg.batches[9].first_id,agg.batches[9].last_id,
  agg.batches[9].objects_verified],[10,'TK-000226','TK-000226',2]);
eq(agg.batches[0].report_sha256,crypto.createHash('sha256').update(reports[0]).digest('hex'));
eq([agg.report_selection.source_reports_self_asserted,
  agg.report_selection.independent_cloud_authentication,
  agg.report_selection.original_batch01_attempt_excluded,
  agg.batches[0].selected_report_name],
  [true,false,'TK504-Audit-B01-20261113.json','TK504-Audit-B01-20261113-RETRY1.json']);
eq([agg.coverage.failed_in_selected_reports,agg.coverage.unable_in_selected_reports,
  agg.coverage.retries_inside_selected_reports],[0,0,0]);
const mutate=(index,fn)=>{
  const out=reports.slice(),obj=JSON.parse(out[index]);
  fn(obj);out[index]=Buffer.from(JSON.stringify(obj));return out;
};
bad(()=>E.aggregateEvidence({manifestBuffer:Buffer.concat([manifestRaw,Buffer.from(' ')]),
  reportBuffers:reports}),'ORIGINAL226_MANIFEST_FILE_SHA_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,reportBuffers:reports.slice(0,9)}),'TEN_REPORTS_REQUIRED');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,reportBuffers:reports.slice().reverse()}),'BATCH_RANGE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(6,r=>{r.batch.start_id='TK-000001';})}),'BATCH_RANGE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(2,r=>{r.video.verified_bytes-=1;})}),'BATCH_BYTE_SUM_OR_TYPE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(3,r=>{r.poster.expected_bytes+=1;r.poster.verified_bytes+=1;})}),'BATCH_BYTE_SUM_OR_TYPE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(9,r=>{r.batch.size=25;r.checked=50;r.pass=50;})}),'BATCH_RANGE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(4,r=>{r.fail=1;r.pass=49;})}),'BATCH_NOT_ALL_PASS');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(4,r=>{r.retries=1;})}),'BATCH_NOT_ALL_PASS');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(5,r=>{r.authorizes_nothing=false;})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(7,r=>{r.attestation_eligible=true;})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(2,r=>{r.mode='live';})}),'BATCH_PROVENANCE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(2,r=>{r.credentials_logged=true;})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(2,r=>{r.manifest_file_sha256='0'.repeat(64);})}),'BATCH_PROVENANCE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(9,r=>{r.categories={authentication_failed:1};})}),'BATCH_NOT_ALL_PASS');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(0,r=>{r.release_authorized=true;})}),'BATCH_REPORT_SHAPE_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(0,r=>{r.authorization='Bearer fake';})}),'BATCH_REPORT_SHAPE_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(0,r=>{r.batch.released=true;})}),'BATCH_REPORT_SHAPE_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(0,r=>{r.video.token='SYNTHETIC';})}),'BATCH_REPORT_SHAPE_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(0,r=>{r.duration_ms=-1;})}),'BATCH_REPORT_SHAPE_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(0,r=>{r.manifest_file='C:/fake/wrong.json';})}),'BATCH_REPORT_SHAPE_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(1,r=>{r.project_ref='wrong';})}),'BATCH_PROVENANCE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(1,r=>{r.app_commit='0'.repeat(40);})}),'BATCH_PROVENANCE_MISMATCH');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(2,r=>{r.status='RELEASED';})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(2,r=>{r.verdict='PASS';})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(3,r=>{r.complete_452=true;})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(3,r=>{r.full_expected=2;})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(3,r=>{r.media_persisted=true;})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(4,r=>{r.unable=1;})}),'BATCH_NOT_ALL_PASS');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(4,r=>{r.failures=['SYNTHETIC'];})}),'BATCH_NOT_ALL_PASS');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(0,r=>{r.video=null;})}),'BATCH_REPORT_SHAPE_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:mutate(0,r=>{r.credentials_logged='false';})}),'BATCH_RELEASE_SEMANTICS_INVALID');
bad(()=>E.aggregateEvidence({manifestBuffer:manifestRaw,
  reportBuffers:[Buffer.from('\ufeff'+reports[0].toString('utf8')),...reports.slice(1)]}),
  'BATCH_REPORT_INVALID_JSON');
// The CLI always outputs a private, exclusive file only after successful validation.
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tk614-original226-consistency-'));
try{
  for(let i=0;i<10;i++)fs.writeFileSync(path.join(temp,E.reportName(i+1)),reports[i]);
  const out=path.join(temp,'evidence.json');
  const cli=path.join(root,'tools','tk614_original226_ten_batch_evidence.cjs');
  const stdout=execFileSync(process.execPath,[cli,'--reports-dir',temp,'--out',out],{encoding:'utf8'});
  const status=JSON.parse(stdout),written=JSON.parse(fs.readFileSync(out,'utf8'));
  eq([status.release_authorized,status.coverage.total_objects],[false,452]);
  eq([written.release.release_authorized,written.release.attestation_signed],[false,false]);
  eq(written.coverage,agg.coverage);
  const blockedCli=(argv,code,outPath)=>{
    const p=spawnSync(process.execPath,[cli,...argv],{encoding:'utf8'});
    eq(p.status,1);assert.match(p.stderr,new RegExp(code));checks++;
    if(outPath)eq(fs.existsSync(outPath),false);
  };
  blockedCli(['--reports-dir',root,'--out',path.join(temp,'from-repo.json')],
    'PRIVATE_REPORTS_MUST_BE_OUTSIDE_REPO',path.join(temp,'from-repo.json'));
  blockedCli(['--reports-dir',temp,'--out',path.join(root,'must-never-write.json')],
    'PRIVATE_REPORTS_MUST_BE_OUTSIDE_REPO',path.join(root,'must-never-write.json'));
  blockedCli(['--reports-dir',temp,'--out','relative.json'],'USAGE');
  blockedCli(['--reports-dir',temp,'--out',path.join(temp,'stray.json'),'--out',path.join(temp,'stray2.json')],
    'USAGE',path.join(temp,'stray.json'));
  blockedCli(['--reports-dir',temp,'--out'],'USAGE');
  const again=spawnSync(process.execPath,[cli,'--reports-dir',temp,'--out',out],{encoding:'utf8'});
  eq(again.status,1);assert.match(again.stderr,/PRIVATE_OUTPUT_ALREADY_EXISTS/);checks++;
  fs.unlinkSync(path.join(temp,E.reportName(1)));
  const other=spawnSync(process.execPath,[cli,'--reports-dir',temp,'--out',path.join(temp,'do-not-create.json')],
    {encoding:'utf8'});
  eq(other.status,1);eq(fs.existsSync(path.join(temp,'do-not-create.json')),false);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('TK614 TEN-BATCH PRIVATE EVIDENCE: '+checks+' assertions PASS; 0 bypass, 0 production writes.');
