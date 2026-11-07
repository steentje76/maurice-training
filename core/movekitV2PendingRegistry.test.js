'use strict';
/** Main-safe TK504 356 identity registry; deliberately NOT active exercise data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const names=JSON.parse(fs.readFileSync(path.join(root,'docs','generated','MOVEKIT_V2_PENDING_356_IDS.json'),'utf8'));
const main=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=main.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'actual ECS catalog missing');
const pub=JSON.parse(match[1]);
assert.equal(pub.count,226,'do not change app baseline');
assert.equal(pub.catalog.length,226,'do not publish new candidates');
assert.equal(names.schema,'tk504-unreleased-candidate-identity-registry/1.0');
assert.equal(names.status,'STAGED_IN_MAIN_NOT_IN_APP_RUNTIME');
assert.equal(names.existing_published_catalog_ids_unchanged,226);
assert.equal(names.new_candidate_ids,356);
assert.equal(names.human_approved_candidates,0);
assert.equal(names.global_media_grants_created,0);
assert.equal(names.runtime_import_enabled,false);
assert.match(names.source_inventory_sha256,/^[a-f0-9]{64}$/);
assert.equal(names.records.length,356);
const ids=new Set(),providers=new Set(),pubIds=new Set(pub.catalog.map(x=>x.catalog_id));
for(let n=0;n<356;n++){
  const item=names.records[n];
  assert.equal(item.catalog_id,'TK-'+String(n+227).padStart(6,'0'));
  assert.equal(item.source_provider,'movekit');
  assert.match(item.provider_id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert(!ids.has(item.catalog_id)&&!providers.has(item.provider_id));
  assert(!pubIds.has(item.catalog_id));
  assert.equal(item.status,'NOT_PUBLISHED');
  assert.equal(item.content_review,'HUMAN_REVIEW_PENDING');
  assert.equal(item.selectable,false);
  assert.equal(item.trainable,false);
  assert.equal(item.media_access,false);
  assert.deepEqual(Object.keys(item).sort(),[
    'catalog_id','content_review','media_access','provider_id',
    'selectable','source_provider','status','trainable'
  ].sort());
  ids.add(item.catalog_id);providers.add(item.provider_id);
}
assert.equal(ids.size,356);
assert.equal(providers.size,356);
assert(main.includes("tk504PrivateEnabled('TK-000227')"),
 'new private catalog is explicitly scoped and requires the signed broker');
assert(!main.includes('movekit/v2/video/'),
 'no raw V2 Storage object path may enter the public HTML');
console.log('TK504 356 candidate IDs: exactly 356 nonpublished, no media/content or runtime execution; published 226 unchanged. PASS');
