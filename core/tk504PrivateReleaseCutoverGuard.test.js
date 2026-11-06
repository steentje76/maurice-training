'use strict';
// TK504 secure cutover guard: do not ship a "private" media flag while the
// same licensed bytes remain directly addressable in the published bundle.
// One provider-neutral exercise catalog, no network access or credentials.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const manifest=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const videoDir=path.join(root,'videos');
const videos=fs.existsSync(videoDir)?fs.readdirSync(videoDir).filter(f=>/\.(?:mp4|webm|mov)$/i.test(f)):[];
const embeds=(html.match(/data:image\/(?:webp|png|jpe?g);base64,/gi)||[]).length;
const gate1=/const TK504_PRIVATE_MEDIA_RELEASE\s*=\s*(true|false)\s*;/.exec(html);
const gate2=/const TK504_PRIVATE_MEDIA_CUTOVER\s*=\s*(true|false)\s*;/.exec(sw);
let passed=0;
function check(v,msg){assert.ok(v,msg);passed++;}
function evaluate(input){
  const errors=[];
  if(typeof input.client!=='boolean'||typeof input.worker!=='boolean')
    errors.push('MISSING_RELEASE_CODE_GATES');
  else if(input.client!==input.worker)errors.push('CLIENT_SW_RELEASE_MISMATCH');
  if(input.client===true){
    if(input.publicVideos>0)errors.push('RAW_PUBLIC_VIDEOS_STILL_DISTRIBUTED');
    if(input.embeddedPosters>0)errors.push('EMBEDDED_PUBLIC_POSTERS_STILL_DISTRIBUTED');
    if(input.releaseStatus!=='RELEASE_APPROVED'||input.releaseEntries<1)
      errors.push('SERVER_MEDIA_RELEASE_NOT_APPROVED');
    if(input.brokerVerified!==true)errors.push('NO_SECURE_PLAYBACK_PROOF');
    if(input.oldRoutesVerifiedGone!==true)errors.push('DIRECT_CDN_PATH_NOT_VERIFIED_GONE');
  }
  return errors;
}
check(!!gate1&&!!gate2,'Both immutable app and worker flags present');
const current={client:gate1[1]==='true',worker:gate2[1]==='true',
  publicVideos:videos.length,embeddedPosters:embeds,
  releaseStatus:manifest.status,releaseEntries:manifest.entries.length,
  brokerVerified:false,oldRoutesVerifiedGone:false};
check(typeof current.client==='boolean','Client code gate parsed');
check(current.client===current.worker,'Client and worker mode must match');
check(Number.isInteger(current.publicVideos)&&current.publicVideos>=0,'Public video asset count measured');
check(Number.isInteger(current.embeddedPosters)&&current.embeddedPosters>=0,'Embedded poster payload count measured');
check(Array.isArray(manifest.entries),'Server registry entries must be explicit');
check(evaluate(current).length===0,'Current branch passes only if mode-specific gates hold');
const bad={...current,client:true,worker:true};
check(evaluate({...bad,publicVideos:1}).includes('RAW_PUBLIC_VIDEOS_STILL_DISTRIBUTED'),'No fake secure release while any old MP4 exists');
check(evaluate({...bad,embeddedPosters:1}).includes('EMBEDDED_PUBLIC_POSTERS_STILL_DISTRIBUTED'),'No fake secure release while any embedded poster exists');
check(evaluate({...bad,worker:false}).includes('CLIENT_SW_RELEASE_MISMATCH'),'Mismatch always blocked');
check(evaluate({...bad,publicVideos:0,embeddedPosters:0}).includes('NO_SECURE_PLAYBACK_PROOF'),'Missing real playback proof blocks');
check(evaluate({...bad,publicVideos:0,embeddedPosters:0}).includes('DIRECT_CDN_PATH_NOT_VERIFIED_GONE'),'Network-level verification required');
check(evaluate({...bad,publicVideos:0,embeddedPosters:0}).includes('SERVER_MEDIA_RELEASE_NOT_APPROVED'),'Release registry must be approved separately');
const approved={client:true,worker:true,publicVideos:0,embeddedPosters:0,
  releaseStatus:'RELEASE_APPROVED',releaseEntries:2,brokerVerified:true,oldRoutesVerifiedGone:true};
check(evaluate(approved).length===0,'An independently proven private release passes gate');
const errors=evaluate(current);
check(errors.length===0,'Current draft remains buildable');
console.log('TK504 private-media cutover leak guard: '+passed+' checks PASS; '+videos.length+
  ' legacy public videos and '+embeds+' embedded poster payloads keep private activation BLOCKED');
