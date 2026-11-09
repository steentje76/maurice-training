'use strict';
/**
 * TK614 / #603 -- disposable PostgreSQL 17 proof for the ALL-226 one-transaction
 * ROLLBACK-only SQL. NOT a migration, NOT a release, never production.
 *  - Reads the private 582 manifest (absolute, outside Git) READ-ONLY.
 *  - Writes private SQL/harness/report ONLY into a NEW --out-dir outside Git.
 *  - Starts `postgres:17` with --network none, --pull never (no image download),
 *    a synthetic password and a tk614.disposable label; removes it afterwards.
 *  - Runs one fresh database per scenario (pass, retry, no marker, duplicate,
 *    reorder, skip, prestaged, alias collision, personal shadow, 356 provider
 *    drift / missing / unreviewed, legacy drift) and checks the exact outcome.
 * stdout: scenario names + PASS/FAIL + digests only, never provider slugs.
 *
 * node tools/tk614_all226_docker_proof.cjs --manifest ABS_PRIVATE_MANIFEST --out-dir ABS_NEW_PRIVATE_DIR
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {safelyOutsideRepo}=require('./tk504_prepare_private_fk_manifest.cjs');
const T=require('./tk614_original226_batch25_preflight.cjs');

const ROOT=path.resolve(__dirname,'..');
const IMAGE='postgres:17';
const STAGE=path.join(ROOT,'supabase','migrations','20261107191714_tk504_typed_catalog_fk_stage.sql');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function fail(code){const e=new Error(code);e.code=code;throw e;}
function need(ok,code){if(!ok)fail(code);}

function parseArgs(argv){
  const o={},flags=['--manifest','--out-dir'];
  for(let i=0;i<argv.length;i+=2){
    const k=argv[i];
    need(flags.includes(k)&&i+1<argv.length&&o[k]===undefined,'USAGE');
    o[k]=argv[i+1];
  }
  need(o['--manifest']&&o['--out-dir'],'USAGE');
  need(path.isAbsolute(o['--manifest'])&&path.isAbsolute(o['--out-dir']),'PATHS_MUST_BE_ABSOLUTE');
  return {manifest:path.resolve(o['--manifest']),outDir:path.resolve(o['--out-dir'])};
}

// Everything that goes into the container, computed before Docker is touched.
function buildArtifacts(manifest,catalogBytes){
  const plan=T.planAll(manifest,catalogBytes);
  const sql=T.renderAllRollbackSql(plan,manifest);
  const files={'tk614-all226-rollback-only.sql':sql};
  const variants=new Set();
  for(const [name,sc] of Object.entries(T.ALL_SCENARIOS)){
    files['tk614-all226-harness-'+name+'.sql']=T.renderAllSandboxHarness(plan,manifest,name);
    if(sc.variant)variants.add(sc.variant);
  }
  for(const v of variants)files['tk614-all226-variant-'+v+'.sql']=T.deriveAdversarialVariant(sql,v);
  return {plan,sql,files};
}

// Outcome classifier; pure so it is unit-testable without Docker.
function judge(scenario,status,stdout,stderr){
  const sc=T.ALL_SCENARIOS[scenario];need(sc,'UNKNOWN_SCENARIO');
  if(sc.expect)return status===0&&stdout.includes(sc.expect)&&!/ERROR:/.test(stderr);
  return status!==0&&stderr.includes(sc.error)&&
    !stdout.includes('TK614_SANDBOX_ALL226_ROLLBACK_VERIFIED');
}

function docker(args,opts={}){
  const r=spawnSync('docker',args,{encoding:'utf8',timeout:opts.timeout||300000,maxBuffer:64*1024*1024});
  if(opts.allowFail)return r;
  if(r.error||r.status!==0)throw Error('DOCKER_FAILED '+args.slice(0,2).join(' ')+': '+String(r.stderr||r.error).slice(0,1200));
  return r;
}
const sleep=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);

function run(argv){
  const o=parseArgs(argv);
  need(safelyOutsideRepo(o.manifest),'PRIVATE_MANIFEST_INSIDE_REPOSITORY');
  need(safelyOutsideRepo(o.outDir),'PRIVATE_OUTPUT_INSIDE_REPOSITORY');
  need(!fs.existsSync(o.outDir),'EEXIST_PRIVATE_OUTPUT');
  const manifest=JSON.parse(fs.readFileSync(o.manifest,'utf8'));
  const catalogBytes=fs.readFileSync(path.join(ROOT,'exercise-catalog.json'));
  const {plan,sql,files}=buildArtifacts(manifest,catalogBytes);
  fs.mkdirSync(o.outDir,{mode:0o700}); // non-recursive: parent must exist, dir must be new
  for(const [f,text] of Object.entries(files)){
    const fd=fs.openSync(path.join(o.outDir,f),'wx',0o600);
    try{fs.writeFileSync(fd,text,'utf8');}finally{fs.closeSync(fd);}
  }
  const name='tk614-all226-proof-'+Date.now()+'-'+crypto.randomBytes(3).toString('hex');
  const results=[];let started=false,netCheck=null;
  try{
    docker(['run','--rm','--detach','--pull','never','--network','none','--label','tk614.disposable=true',
      '--name',name,'-e','POSTGRES_PASSWORD=synthetic_only_tk614_'+crypto.randomBytes(6).toString('hex'),IMAGE]);
    started=true;
    netCheck=docker(['inspect','-f','{{json .HostConfig.NetworkMode}}',name]).stdout.trim();
    need(netCheck==='"none"','CONTAINER_NOT_NETWORK_NONE');
    let ready=false;
    for(let i=0;i<60&&!ready;i++){
      ready=docker(['exec',name,'pg_isready','-U','postgres'],{allowFail:true}).status===0;
      if(!ready)sleep(500);
    }
    need(ready,'POSTGRES_NOT_READY');
    sleep(1500); // initdb restarts the server once; re-check readiness
    for(let i=0;i<60;i++){if(docker(['exec',name,'pg_isready','-U','postgres'],{allowFail:true}).status===0)break;sleep(500);}
    docker(['cp',STAGE,name+':/tmp/tk504-typed-fk-stage.sql']);
    for(const f of Object.keys(files))docker(['cp',path.join(o.outDir,f),name+':/tmp/'+f]);
    for(const scenario of Object.keys(T.ALL_SCENARIOS)){
      const db='tk614_'+scenario;
      docker(['exec',name,'psql','-X','-q','-U','postgres','-d','postgres','-c','create database '+db]);
      const r=docker(['exec',name,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d',db,
        '-f','/tmp/tk614-all226-harness-'+scenario+'.sql'],{allowFail:true});
      const pass=judge(scenario,r.status,r.stdout||'',r.stderr||'');
      const errLine=(String(r.stderr||'').match(/ERROR:[^\n]*/)||[''])[0].slice(0,200);
      results.push({scenario,pass,exit:r.status,expected:T.ALL_SCENARIOS[scenario].expect||T.ALL_SCENARIOS[scenario].error,
        observed:r.status===0?'ok':errLine,
        proof_marker:/TK614_ALL226_ROLLBACK_PROOF_PASS_226_INACTIVE_UNREVIEWED_582_CANONICAL_10_BATCHES/.test(r.stdout||'')});
    }
  }finally{
    if(started){const s=docker(['rm','-f',name],{allowFail:true});
      results.push({scenario:'container_removed',pass:s.status===0});}
  }
  const allPass=results.length===Object.keys(T.ALL_SCENARIOS).length+1&&results.every(r=>r.pass);
  const report={schema:'tk614-all226-docker-proof/1.0',status:'DRY_RUN_NO_RELEASE_AUTHORITY',
    image:IMAGE,network:'none',production_touched:false,all_pass:allPass,
    mapping_sha256:plan.source_mapping_sha256,source_catalog_sha256:plan.source_catalog_sha256,
    all_sha256:plan.all_sha256,sql_sha256:sha(Buffer.from(sql,'utf8')),results};
  const fd=fs.openSync(path.join(o.outDir,'tk614-all226-docker-proof-report.json'),'wx',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(report,null,2)+'\n','utf8');}finally{fs.closeSync(fd);}
  for(const r of results)process.stdout.write((r.pass?'PASS ':'FAIL ')+r.scenario+(r.observed&&r.observed!=='ok'?' :: '+r.observed:'')+'\n');
  process.stdout.write(JSON.stringify({all_pass:allPass,all_sha256:report.all_sha256,sql_sha256:report.sql_sha256})+'\n');
  if(!allPass)process.exitCode=1;
  return report;
}
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(e){process.stderr.write('TK614_ALL226_DOCKER_PROOF_BLOCKED: '+(e.code||e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({parseArgs,buildArtifacts,judge,run});
