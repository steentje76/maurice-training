#!/usr/bin/env node
/* Deterministic Android-only media digest registry. No licensed binaries. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const v1=JSON.parse(fs.readFileSync(path.join(root,'docs/generated/MOVEKIT_MEDIA_MANIFEST_V1.json')));
const v2=JSON.parse(fs.readFileSync(path.join(root,'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json')));
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const id=/^TK-\d{6}$/;
const hash=/^[a-f0-9]{64}$/;
const map=new Map();
function add(e,version){
 const key=e.catalogId+':'+version;
 if(!id.test(e.catalogId)||!slug.test(e.slug)||!hash.test(e.sha256)
    ||!Number.isSafeInteger(e.bytes)||e.bytes<=0||e.bytes>33554432||map.has(key))
   throw new Error('INVALID_MANIFEST_ENTRY: '+key);
 map.set(key,{catalogId:e.catalogId,version,slug:e.slug,sha256:e.sha256,bytes:e.bytes});
}
v1.items.forEach(x=>add({catalogId:x.catalog_id,slug:x.provider_id,sha256:x.sha256,bytes:x.bytes},'v1'));
v2.items.forEach(x=>add({catalogId:x.catalog_id,slug:x.provider_id,sha256:x.video.sha256,bytes:x.video.bytes},'v2'));
for(const x of v1.items){
 const current=map.get(x.catalog_id+':v2');
 if(!current||current.slug!==x.provider_id)throw new Error('BROKEN_CANONICAL_ID: '+x.catalog_id);
}
if(v1.items.length!==226||v2.items.length!==582||map.size!==808)throw new Error('UNEXPECTED_ASSET_COUNTS');
const value={schema:'tk-secure-media-integrity/1',status:'OFFLINE_MEDIA_STAGED',items:Array.from(map.values()).sort((a,b)=>a.catalogId.localeCompare(b.catalogId)||a.version.localeCompare(b.version))};
const dst=path.join(root,'android/app/src/main/assets/tk-movekit-integrity.json');
const json=JSON.stringify(value,null,2)+'\n';
if(process.argv.includes('--check')){
 if(!fs.existsSync(dst)||fs.readFileSync(dst,'utf8')!==json)throw new Error('ANDROID_MEDIA_REGISTRY_STALE');
}else{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,json)}
console.log('Android media integrity registry:',map.size,'entries (v1=',v1.items.length,', v2=',v2.items.length,')',process.argv.includes('--check')?'MATCH':'WRITTEN');
