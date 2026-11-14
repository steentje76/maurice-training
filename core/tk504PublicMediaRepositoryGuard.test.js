'use strict';
/*
 * TK504 — repository-level public media containment, PRE-CUTOVER.
 * The canonical repository currently still tracks 226 old MP4s needed for V1 playback.
 * This test does not authorize them or make the repository private; it stops future
 * accidental additions, replacements-by-name, and early removals pending reviewed cutover.
 * It is offline/read-only and never downloads or displays licensed media.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const mediaExt=/\.(?:mp4|m4v|mov|webm|avi|mkv)$/i;
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json'),'utf8'));
const freeze=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/generated/TK504_LEGACY226_GIT_BLOBS_20261109.json'),'utf8'));
function checkTracked(paths,entries){
  const videos=entries.filter(x=>x.media_type==='video');
  if(videos.length!==226)return 'MANIFEST_VIDEO_COUNT_INVALID';
  const expected=new Set();
  for(const e of videos){
    if(!/^TK-\d{6}$/.test(e.catalog_id)||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(e.provider_id))
      return 'MANIFEST_IDENTITY_INVALID';
    const f='videos/'+e.provider_id+'.mp4';
    if(expected.has(f))return 'MANIFEST_DUPLICATE_VIDEO';
    expected.add(f);
  }
  const trackedMedia=paths.filter(p=>mediaExt.test(p));
  // Even a renamed .bin or extensionless asset is forbidden inside the legacy video folder.
  if(paths.some(p=>p.startsWith('videos/')&&!expected.has(p))||trackedMedia.some(p=>!expected.has(p)))
    return 'UNAPPROVED_PUBLIC_MEDIA_ADDED';
  // This phase keeps the known legacy files until the separate private cutover.
  if(expected.size!==trackedMedia.length||[...expected].some(p=>!trackedMedia.includes(p)))
    return 'LEGACY_VIDEO_REMOVED_BEFORE_CUTOVER';
  return null;
}
function checkFrozenBlobs(records,reference) {
  if(!reference||reference.schema!=='tk504-legacy226-git-blobs/1.0'||
     reference.status!=='FREEZE_LEGACY_226_DO_NOT_AUTHORIZE_RELEASE'||
     reference.private_manifest_all_sha256!==manifest.totals.all_sha256||
     !Array.isArray(reference.entries)||reference.entries.length!==226)return 'FROZEN_BASELINE_INVALID';
  const expected=new Map();
  for(const e of reference.entries){
    if(!e||!/^TK-\d{6}$/.test(e.catalog_id)||!/^videos\/[a-z0-9-]+\.mp4$/.test(e.path)||
       !/^[a-f0-9]{40}$/.test(e.blob_oid)||expected.has(e.path))return 'FROZEN_BASELINE_INVALID';
    expected.set(e.path,e.blob_oid);
  }
  const observed=new Map();
  for(const rec of records){
    const m=/^(\d{6}) ([0-9a-f]{40}) 0\t(.+)$/.exec(rec);
    if(!m||observed.has(m[3])||m[1]!=='100644')return 'LEGACY_BLOB_MODE_OR_INDEX_INVALID';
    observed.set(m[3],m[2]);
  }
  if(expected.size!==observed.size||[...expected.keys()].some(k=>!observed.has(k)))return 'LEGACY_BLOB_PATH_CHANGED';
  if([...expected].some(([p,oid])=>observed.get(p)!==oid))return 'LEGACY_BLOB_REPLACED_BEFORE_CUTOVER';
  return null;
}
let checks=0;
function eq(a,b,m){assert.equal(a,b,m);checks++;}
const original=manifest.entries.filter(x=>x.media_type==='video');
const expected=original.map(e=>'videos/'+e.provider_id+'.mp4');
eq(checkTracked(expected,manifest.entries),null,'exact 226 are grandfathered only');
eq(checkTracked([...expected,'videos/new-media.mp4'],manifest.entries),'UNAPPROVED_PUBLIC_MEDIA_ADDED','new video blocked');
eq(checkTracked([...expected,'assets/outside-video.mov'],manifest.entries),'UNAPPROVED_PUBLIC_MEDIA_ADDED','new MOV blocked');
eq(checkTracked([...expected,'videos/renamed-video.bin'],manifest.entries),'UNAPPROVED_PUBLIC_MEDIA_ADDED','disguised binary within videos folder blocked');
eq(checkTracked([...expected,'static/clip.WEBM'],manifest.entries),'UNAPPROVED_PUBLIC_MEDIA_ADDED','uppercase WEBM blocked');
eq(checkTracked([...expected,'videos/clip.mkv'],manifest.entries),'UNAPPROVED_PUBLIC_MEDIA_ADDED','mkv blocked');
eq(checkTracked(expected.slice(1),manifest.entries),'LEGACY_VIDEO_REMOVED_BEFORE_CUTOVER','early deletion blocked');
eq(checkTracked([...expected.slice(1),'somewhere/new.mp4'],manifest.entries),'UNAPPROVED_PUBLIC_MEDIA_ADDED','replace+relocate blocked');
const duplicate=structuredClone(manifest.entries);
const a=duplicate.find(e=>e.catalog_id==='TK-000002'&&e.media_type==='video');
a.provider_id=original[0].provider_id;
eq(checkTracked(expected,duplicate),'MANIFEST_DUPLICATE_VIDEO','duplicate slug blocked');
eq(checkTracked(expected,[]),'MANIFEST_VIDEO_COUNT_INVALID','empty manifest blocked');
const raw=cp.execFileSync('git',['ls-files','--cached','-z'],{cwd:ROOT,encoding:'buffer',maxBuffer:16*1024*1024});
const indexed=raw.toString('utf8').split('\0').filter(Boolean);
eq(checkTracked(indexed,manifest.entries),null,'real Git index contains exactly legacy 226');
// Source-locked object IDs: a replacement under the SAME existing filename must also fail.
const frozenRecords=freeze.entries.map(e=>'100644 '+e.blob_oid+' 0\t'+e.path);
eq(freeze.entries.map(e=>e.path).join('\n'),expected.join('\n'),'frozen 226 paths match canonical manifest order');
eq(checkFrozenBlobs(frozenRecords,freeze),null,'frozen blob baseline self-check');
const changedOid=[...frozenRecords];
changedOid[0]=changedOid[0].replace(freeze.entries[0].blob_oid,'0'.repeat(40));
eq(checkFrozenBlobs(changedOid,freeze),'LEGACY_BLOB_REPLACED_BEFORE_CUTOVER','byte-replacement under same slug blocked');
eq(checkFrozenBlobs(frozenRecords.slice(1),freeze),'LEGACY_BLOB_PATH_CHANGED','frozen source deletion blocked');
eq(checkFrozenBlobs([...frozenRecords,'100644 '+'0'.repeat(40)+' 0\tvideos/unapproved.mp4'],freeze),
 'LEGACY_BLOB_PATH_CHANGED','frozen source extra file blocked');
eq(checkFrozenBlobs(frozenRecords,{...freeze,private_manifest_all_sha256:'0'.repeat(64)}),
 'FROZEN_BASELINE_INVALID','manifest mismatch blocked');
const rawOids=cp.execFileSync('git',['ls-files','--stage','-z','--','videos'],{cwd:ROOT,encoding:'buffer',maxBuffer:8*1024*1024});
eq(checkFrozenBlobs(rawOids.toString('utf8').split('\0').filter(Boolean),freeze),null,
 'real Git index original 226 blob OIDs have not changed');
// .gitignore is defense in depth; only the index checks above are authoritative.
const ignore=fs.readFileSync(path.join(ROOT,'.gitignore'),'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
for(const rule of ['videos/','*.mp4','*.m4v','*.mov','*.webm','*.avi','*.mkv']){
  eq(ignore.includes(rule),true,'gitignore rule '+rule);
}
console.log('TK504 Git public-media containment: '+checks+' checks PASS; 226 legacy paths AND Git blob IDs frozen; no new, replaced or prematurely deleted media; existing public exposure NOT fixed');
module.exports={checkTracked};
