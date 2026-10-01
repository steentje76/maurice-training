#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'exercise-catalog.json');
const VIDEOS_DIR = path.join(ROOT, 'videos');
const DEFAULT_MANIFEST = path.join(ROOT, 'docs', 'generated', 'MOVEKIT_MEDIA_MANIFEST_V1.json');
const BUCKET = 'exercise-media';
const PREFIX = 'movekit/v1/video/';
const MIME = 'video/mp4';
const PROJECT_REF = 'mhfxhzkdmgkaplicdszg';

function argsOf(argv) {
  const out = { writeManifest:false, uploadPilot:false, pilotCount:3, manifest:DEFAULT_MANIFEST, projectRef:PROJECT_REF };
  for (let i=2;i<argv.length;i++) {
    const a=argv[i];
    if (a==='--write-manifest') out.writeManifest=true;
    else if (a==='--upload-pilot') out.uploadPilot=true;
    else if (a==='--pilot-count') out.pilotCount=Number(argv[++i]);
    else if (a==='--manifest') out.manifest=path.resolve(argv[++i]);
    else if (a==='--project-ref') out.projectRef=argv[++i];
    else if (a==='--help') out.help=true;
    else throw new Error('Unknown argument: '+a);
  }
  if (!Number.isInteger(out.pilotCount) || out.pilotCount<1 || out.pilotCount>20) throw new Error('pilot-count must be 1..20');
  if (!/^[a-z0-9]{20}$/.test(out.projectRef)) throw new Error('invalid project ref');
  return out;
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function buildManifest() {
  const raw=JSON.parse(fs.readFileSync(CATALOG_PATH,'utf8'));
  const rows=[];
  for (const e of raw.catalog || []) {
    if (!e || !e.source || e.source.provider!=='movekit') continue;
    const slug=e.source.provider_id;
    if (typeof e.catalog_id!=='string' || !/^TK-\d{6}$/.test(e.catalog_id)) throw new Error('invalid catalog id');
    if (typeof slug!=='string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('invalid MoveKit slug for '+e.catalog_id);
    const file=path.join(VIDEOS_DIR, slug+'.mp4');
    if (!fs.existsSync(file)) throw new Error('missing video for '+e.catalog_id+' '+slug);
    const st=fs.statSync(file);
    rows.push({
      catalog_id:e.catalog_id,
      provider:'movekit',
      provider_id:slug,
      object_path:PREFIX+slug+'.mp4',
      sha256:sha256File(file),
      bytes:st.size,
      mime:MIME
    });
  }
  rows.sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id));
  const ids=new Set(rows.map(x=>x.catalog_id));
  const slugs=new Set(rows.map(x=>x.provider_id));
  if (ids.size!==rows.length || slugs.size!==rows.length) throw new Error('duplicate catalog_id or provider slug');
  return {
    schema:'trainingskompas-movekit-media-manifest/1.0',
    media_version:'v1',
    bucket:BUCKET,
    prefix:PREFIX,
    source:'canonical exercise-catalog.json + videos/*.mp4',
    generated_from_catalog_entries:rows.length,
    total_bytes:rows.reduce((n,x)=>n+x.bytes,0),
    items:rows
  };
}

function stableJson(x){ return JSON.stringify(x,null,2)+'\n'; }

function verifyCommitted(current, manifestPath) {
  if (!fs.existsSync(manifestPath)) return {exists:false,match:false};
  const committed=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  return {exists:true,match:stableJson(committed)===stableJson(current)};
}

function runCli(parts, opts={}) {
  const exe=process.platform==='win32' ? 'npx.cmd' : 'npx';
  const r=cp.spawnSync(exe,['--yes','supabase@latest',...parts],{
    cwd:ROOT,encoding:'utf8',stdio:opts.capture ? ['ignore','pipe','pipe'] : 'inherit',
    env:process.env
  });
  if (r.status!==0) {
    const err=opts.capture ? ((r.stderr||r.stdout||'').trim()) : 'Supabase CLI failed';
    throw new Error(err || 'Supabase CLI failed');
  }
  return opts.capture ? (r.stdout||'') : '';
}

function remoteNames(projectRef) {
  const raw=runCli(['storage','ls','ss:///'+BUCKET+'/'+PREFIX,'--project-ref',projectRef,'--output-format','json'],{capture:true});
  let data;
  try { data=JSON.parse(raw); } catch { throw new Error('could not parse Supabase storage ls JSON'); }
  const arr=Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);
  return new Set(arr.map(x=>String(x.name || x.path || '').split('/').pop()).filter(Boolean));
}

function uploadPilot(manifest, projectRef, count) {
  if (manifest.items.length< count) throw new Error('pilot larger than manifest');
  const existing=remoteNames(projectRef);
  const pilot=manifest.items.slice(0,count);
  for (const item of pilot) {
    const name=item.provider_id+'.mp4';
    if (existing.has(name)) throw new Error('refusing overwrite; remote object already exists: '+name);
  }
  for (const item of pilot) {
    const src=path.join(VIDEOS_DIR,item.provider_id+'.mp4');
    const dst='ss:///'+BUCKET+'/'+item.object_path;
    runCli(['storage','cp',src,dst,'--project-ref',projectRef,'--content-type',MIME,'--cache-control','31536000']);
  }
  return pilot.map(x=>({catalog_id:x.catalog_id,object_path:x.object_path,sha256:x.sha256,bytes:x.bytes}));
}

function main(){
  const a=argsOf(process.argv);
  if (a.help) {
    console.log('Usage: node tools/movekit-media-pilot.js [--write-manifest] [--upload-pilot --pilot-count 3] [--project-ref REF]');
    return;
  }
  const manifest=buildManifest();
  const committed=verifyCommitted(manifest,a.manifest);
  if (a.writeManifest) {
    fs.mkdirSync(path.dirname(a.manifest),{recursive:true});
    fs.writeFileSync(a.manifest,stableJson(manifest));
  } else if (!committed.exists || !committed.match) {
    throw new Error('committed media manifest missing or stale; run with --write-manifest and review the diff');
  }
  const result={
    count:manifest.items.length,
    total_bytes:manifest.total_bytes,
    committed_manifest:a.writeManifest ? 'WRITTEN' : 'MATCH',
    pilot:manifest.items.slice(0,a.pilotCount).map(x=>({catalog_id:x.catalog_id,provider_id:x.provider_id,object_path:x.object_path,sha256:x.sha256,bytes:x.bytes}))
  };
  if (a.uploadPilot) result.uploaded=uploadPilot(manifest,a.projectRef,a.pilotCount);
  console.log(JSON.stringify(result,null,2));
}

if (require.main===module) {
  try { main(); } catch(e) { console.error('MOVEKIT_MEDIA_PILOT_ERROR: '+e.message); process.exit(1); }
}

module.exports={buildManifest,verifyCommitted,uploadPilot,argsOf,BUCKET,PREFIX,PROJECT_REF};
