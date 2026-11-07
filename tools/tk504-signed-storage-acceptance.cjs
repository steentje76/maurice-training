#!/usr/bin/env node
'use strict';
// QA-only probe for a short-lived, pre-authorized Storage signed URL.
// No grants, signing, uploads, production changes, source metadata or tokens are logged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const inventory = require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posters = require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const ORIGIN = 'https://mhfxhzkdmgkaplicdszg.supabase.co';
const CID = /^TK-\d{6}$/;
function demand(ok, code) {
  if (!ok) throw new Error('TK504_SIGNED_STORAGE_QA_'+code);
}
function assetDescriptor(cid,type) {
  demand(typeof cid==='string' && CID.test(cid) && (type==='video'||type==='poster'),'BAD_INPUT');
  const row = inventory.items.find(x=>x.catalog_id===cid);
  const poster = posters.items.find(x=>x.catalog_id===cid);
  demand(row && poster && row.provider_id===poster.provider_id,'NO_CANONICAL_ASSET');
  const asset = type==='video'?row.video:poster;
  return {bucket:type==='video'?'exercise-media':'exercise-posters',path:asset.path,
    size:asset.bytes,sha256:asset.sha256,mime:type==='video'?'video/mp4':'image/webp',
    slug:row.provider_id,ext:type==='video'?'mp4':'webp'};
}
function validatedUrl(raw,asset) {
  demand(typeof raw==='string' && raw.length<8192,'NO_SIGNED_URL');
  let parsed;
  try{parsed=new URL(raw)}catch{demand(false,'BAD_SIGNED_URL')}
  demand(parsed.origin===ORIGIN && parsed.username==='' && parsed.password==='' &&
    parsed.hash==='' && parsed.pathname==='/storage/v1/object/sign/'+asset.bucket+'/'+asset.path &&
    [...parsed.searchParams.keys()].length===1 &&
    /^[A-Za-z0-9._~-]{8,4096}$/.test(parsed.searchParams.get('token')||''),'BAD_SIGNED_URL');
  return parsed.href;
}
function getPrivateBytes(dir,asset) {
  demand(typeof dir==='string' && path.isAbsolute(dir),'NO_PRIVATE_SOURCE_DIR');
  const file=path.join(dir,asset.slug+'.'+asset.ext);
  const stat=fs.lstatSync(file);
  demand(stat.isFile() && !stat.isSymbolicLink() && stat.size===asset.size,'SOURCE_FILE_MISMATCH');
  const bytes=fs.readFileSync(file);
  demand(crypto.createHash('sha256').update(bytes).digest('hex')===asset.sha256,'SOURCE_DIGEST_MISMATCH');
  return bytes;
}
async function checkRange(url, asset, bytes, start, end, fetchFn=fetch) {
  const resp=await fetchFn(url,{
    method:'GET',redirect:'error',cache:'no-store',
    headers:{Range:'bytes='+start+'-'+end,'Cache-Control':'no-store'}
  });
  demand(resp.status===206,'RANGE_HTTP_NOT_206');
  const contentRange=resp.headers.get('content-range');
  demand(contentRange==='bytes '+start+'-'+end+'/'+asset.size,'CONTENT_RANGE_MISMATCH');
  const contentType=(resp.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  demand(contentType===asset.mime,'MIME_MISMATCH');
  const responseBytes=Buffer.from(await resp.arrayBuffer());
  const expected=bytes.subarray(start,end+1);
  demand(responseBytes.length===expected.length && crypto.timingSafeEqual(responseBytes,expected),
    'REMOTE_BYTES_DIFFER');
  const cache=resp.headers.get('cache-control')||'';
  const age=/max-age=(\d+)/i.exec(cache);
  const cachePolicy=cache.includes('no-store')?'no-store':
    (age&&Number(age[1])<=60&&!/\bpublic\b/i.test(cache))?'max-age-at-most-60':'REVIEW_CACHE_POLICY';
  demand(cachePolicy!=='REVIEW_CACHE_POLICY','CACHE_CONTROL_UNSAFE');
  return {pass:true,range:[start,end],status:resp.status,byte_match:true,
    cache_policy:cachePolicy};
}
async function probe({cid,urlVideo,urlPoster,videoDir,posterDir,fetchFn=fetch}) {
  const out=[];
  for(const [type,raw,dir] of [['video',urlVideo,videoDir],['poster',urlPoster,posterDir]]){
    const asset=assetDescriptor(cid,type);
    const url=validatedUrl(raw,asset);
    const bytes=getPrivateBytes(dir,asset);
    const points=[0,Math.max(0,Math.floor(asset.size/2)-512),Math.max(0,asset.size-1024)];
    const seen=new Set();
    for(const start of points){
      if(seen.has(start))continue;seen.add(start);
      out.push({type,...await checkRange(url,asset,bytes,start,Math.min(start+1023,asset.size-1),fetchFn)});
    }
  }
  return {status:'SIGNED_STORAGE_RANGE_BYTES_VERIFIED_RELEASE_STILL_BLOCKED',
    catalog_id:cid,checks:out,security_release_approved:false,
    token_logged:false,production_changes:0,
    caveat:'Signed URLs may remain usable until expiration; CDN and browser caching need separate review.'};
}
async function main(){
  const cid=process.env.TK504_PROBE_CATALOG_ID||'TK-000227';
  if(!process.env.TK504_SIGNED_VIDEO_URL||!process.env.TK504_SIGNED_POSTER_URL){
    console.log(JSON.stringify({status:'BLOCKED_SIGNED_URL_NOT_SUPPLIED',
      reason:'Authorized reviewer must supply two short-lived signed URLs only in protected process environment',
      no_credentials_printed:true,production_changes:0}));
    process.exitCode=2;return;
  }
  try {
    const result=await probe({cid,urlVideo:process.env.TK504_SIGNED_VIDEO_URL,
      urlPoster:process.env.TK504_SIGNED_POSTER_URL,
      videoDir:process.env.TK504_PRIVATE_VIDEO_DIR,
      posterDir:process.env.TK504_PRIVATE_POSTER_DIR});
    console.log(JSON.stringify(result));
  } catch(err) {
    // Never include fetch/URL/raw error messages; those can contain signing tokens.
    const reason=/^TK504_SIGNED_STORAGE_QA_[A-Z_]+$/.test(err.message)?err.message:'TK504_SIGNED_STORAGE_QA_REQUEST_FAILED';
    console.error(JSON.stringify({status:'BLOCKED',reason,production_changes:0}));
    process.exitCode=1;
  }
}
if(require.main===module) main();
module.exports={assetDescriptor,validatedUrl,getPrivateBytes,checkRange,probe};
