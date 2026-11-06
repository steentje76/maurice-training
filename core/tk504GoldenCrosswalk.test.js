'use strict';
// TK504: crosswalk for the old published catalog and the staged licensed V2
// inventory. This does not grant any access or publish the 356 new exercises.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const catalog=require(path.join(ROOT,'exercise-catalog.json'));
const golden=require(path.join(ROOT,'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'));
const posters=require(path.join(ROOT,'docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json'));
const release=require(path.join(ROOT,'docs/generated/MOVEKIT_V2_RELEASE_GATES.json'));
const source=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const tag='var VIDEO_MANIFEST=';
const begin=source.indexOf(tag);
assert.notEqual(begin,-1,'Existing central VIDEO_MANIFEST must be present');
const finish=source.indexOf(';',begin+tag.length);
assert.ok(finish>begin,'VIDEO_MANIFEST terminator required');
const legacy=JSON.parse(source.slice(begin+tag.length,finish));
assert.equal(catalog.catalog.length,226);
assert.equal(Object.keys(legacy).length,226);
assert.equal(golden.items.length,582);
assert.equal(posters.items.length,582);
assert.equal(release.status,'BLOCKED_NOT_REVIEWED');
assert.deepEqual(release.entries,[]);
const byId=new Map(golden.items.map(r=>[r.catalog_id,r]));
const posterById=new Map(posters.items.map(r=>[r.catalog_id,r]));
assert.equal(byId.size,582,'no duplicate V2 catalog ids');
assert.equal(posterById.size,582,'no duplicate V2 poster ids');
const registeredIds=new Set(catalog.catalog.map(r=>r.catalog_id));
let previouslyPublished=0, newlyStaged=0, rewritten=0;
for(const row of golden.items){
  const cat=catalog.catalog.find(x=>x.catalog_id===row.catalog_id);
  assert.ok(row.provider_id && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.provider_id));
  assert.equal(row.video.path,'movekit/v2/video/'+row.provider_id+'.mp4');
  const p=posterById.get(row.catalog_id);
  assert.ok(p,'Every V2 video must have an optimized poster');
  assert.equal(p.path,'movekit/v2/poster-optimized/'+row.provider_id+'.webp');
  if(cat){
    previouslyPublished++;
    assert.equal(row.status,'existing-id',row.catalog_id);
    assert.equal(row.provider_id,cat.source.provider_id,'Existing source ID immutable');
    assert.equal(cat.source.provider,'movekit');
    assert.equal(legacy[row.catalog_id]?.slug,row.provider_id,'Legacy manifest must map exactly');
    assert.equal(legacy[row.catalog_id]?.videos?.[0]?.provider_asset_id,row.provider_id);
    assert.equal(legacy[row.catalog_id]?.videos?.[0]?.file,'videos/'+row.provider_id+'.mp4');
    if(legacy[row.catalog_id].videos[0].filesize!==row.video.bytes)rewritten++;
  }else{
    newlyStaged++;
    assert.equal(row.status,'proposed-new',row.catalog_id);
    assert.ok(!Object.hasOwn(legacy,row.catalog_id),'Unreviewed candidate must not become visible');
  }
}
assert.equal(previouslyPublished,226);
assert.equal(newlyStaged,356);
assert.equal(catalog.count,226);
assert.equal(catalog.catalog.every(row=>byId.has(row.catalog_id)),true);
assert.equal(registeredIds.size,226);
console.log('TK504 crosswalk: 582 golden videos, 582 optimized posters; 226 published identities exact, 356 NOT_PUBLISHED; V2 files changed-size vs V1='+rewritten+'; 0 crosswalk failures. No release.');
