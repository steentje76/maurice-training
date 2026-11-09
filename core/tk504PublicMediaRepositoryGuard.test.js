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
  if(trackedMedia.some(p=>!expected.has(p)))return 'UNAPPROVED_PUBLIC_MEDIA_ADDED';
  // This phase keeps the known legacy files until the separate private cutover.
  if(expected.size!==trackedMedia.length||[...expected].some(p=>!trackedMedia.includes(p)))
    return 'LEGACY_VIDEO_REMOVED_BEFORE_CUTOVER';
  return null;
}
let checks=0;
function eq(a,b,m){assert.equal(a,b,m);checks++;}
const original=manifest.entries.filter(x=>x.media_type==='video');
const expected=original.map(e=>'videos/'+e.provider_id+'.mp4');
eq(checkTracked(expected,manifest.entries),null,'exact 226 are grandfathered only');
eq(checkTracked([...expected,'videos/new-media.mp4'],manifest.entries),'UNAPPROVED_PUBLIC_MEDIA_ADDED','new video blocked');
eq(checkTracked([...expected,'assets/outside-video.mov'],manifest.entries),'UNAPPROVED_PUBLIC_MEDIA_ADDED','new MOV blocked');
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
const ignore=fs.readFileSync(path.join(ROOT,'.gitignore'),'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
for(const rule of ['videos/','*.mp4','*.m4v','*.mov','*.webm','*.avi','*.mkv']){
  eq(ignore.includes(rule),true,'gitignore rule '+rule);
}
console.log('TK504 Git public-media containment: '+checks+' checks PASS; exactly 226 grandfathered legacy paths; no additional binary media; no premature deletion; legacy exposure NOT fixed');
module.exports={checkTracked};
