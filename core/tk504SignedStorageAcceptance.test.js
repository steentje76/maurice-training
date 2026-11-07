// TK504: release-blocking signed Storage Range QA, all fixtures synthetic.
'use strict';
const assert=require('node:assert/strict');
const {assetDescriptor,validatedUrl,checkRange}=require('../tools/tk504-signed-storage-acceptance.cjs');
(async()=>{
  let checks=0;
  const pass=(x,m)=>{assert.ok(x,m);checks++};
  const fail=(f,code)=>{
    assert.throws(f,e=>e.message==='TK504_SIGNED_STORAGE_QA_'+code);checks++;
  };
  const v=assetDescriptor('TK-000227','video');
  const p=assetDescriptor('TK-000227','poster');
  pass(v.bucket==='exercise-media'&&v.mime==='video/mp4'&&v.path.endsWith('.mp4'),'video identity');
  pass(p.bucket==='exercise-posters'&&p.mime==='image/webp'&&p.path.endsWith('.webp'),'poster identity');
  fail(()=>assetDescriptor('TK-ABC227','video'),'BAD_INPUT');
  fail(()=>assetDescriptor('TK-000227','unknown'),'BAD_INPUT');
  fail(()=>assetDescriptor('TK-999999','video'),'NO_CANONICAL_ASSET');
  const url='https://mhfxhzkdmgkaplicdszg.supabase.co/storage/v1/object/sign/'+v.bucket+'/'+v.path+'?token=abcdefgh12345678';
  pass(validatedUrl(url,v)===url,'valid token for canonical asset');
  for (const variant of [
    url.replace('supabase.co','supabase.com'),url.replace('.mp4?','.webp?'),
    url.replace('exercise-media','exercise-posters'),url+'&token=anotherkey',
    url+'&download=1',url+'#fragment',url.replace('abcdefgh12345678','abc'),
    url.replace('/storage/v1/object/sign/','/storage/v1/object/public/')
  ])fail(()=>validatedUrl(variant,v),'BAD_SIGNED_URL');
  const bytes=Buffer.alloc(4096);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
  const asset={size:bytes.length,mime:'video/mp4'};
  const good=async(_url,request)=>{
    pass(request.redirect==='error'&&request.cache==='no-store'&&request.headers.Range==='bytes=1024-2047','no-store bounded request');
    return new Response(bytes.subarray(1024,2048),{status:206,
      headers:{'content-range':'bytes 1024-2047/4096','content-type':'video/mp4','cache-control':'max-age=60'}});
  };
  const x=await checkRange(url,asset,bytes,1024,2047,good);
  pass(x.pass&&x.byte_match&&x.cache_policy==='max-age-at-most-60','binary and cache evidence');
  const bad=async(status,range,mime,data)=>new Response(data,{status,headers:{
    'content-range':range,'content-type':mime,'cache-control':'max-age=60'}});
  for (const [why,fn] of [
    ['RANGE_HTTP_NOT_206',()=>bad(200,'bytes 1024-2047/4096','video/mp4',bytes.subarray(1024,2048))],
    ['CONTENT_RANGE_MISMATCH',()=>bad(206,'bytes 0-1023/4096','video/mp4',bytes.subarray(1024,2048))],
    ['MIME_MISMATCH',()=>bad(206,'bytes 1024-2047/4096','text/plain',bytes.subarray(1024,2048))],
    ['REMOTE_BYTES_DIFFER',()=>bad(206,'bytes 1024-2047/4096','video/mp4',bytes.subarray(1025,2049))]
  ]){await assert.rejects(checkRange(url,asset,bytes,1024,2047,fn),
    e=>e.message==='TK504_SIGNED_STORAGE_QA_'+why);checks++;}
  await assert.rejects(checkRange(url,asset,bytes,1024,2047,async()=>new Response(bytes.subarray(1024,2048),{status:206,headers:{
    'content-range':'bytes 1024-2047/4096','content-type':'video/mp4','cache-control':'public, max-age=3600'}})),
    e=>e.message==='TK504_SIGNED_STORAGE_QA_CACHE_CONTROL_UNSAFE');checks++;
  console.log('TK504 signed Storage acceptance contract: '+checks+' synthetic assertions PASS; no release');
})().catch(err=>{console.error(err);process.exitCode=1});
