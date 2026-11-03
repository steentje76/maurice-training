'use strict';
// Guards immutable JSON SHA pins against accidental mismatch in Netlify bundles.
// The deployed function uses static require() rather than runtime readFileSync.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const broker = require('../netlify/functions/exercise-media-v2-url.js')._internal;
const paths = {
  inventory: path.resolve(__dirname, '../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'),
  posters: path.resolve(__dirname, '../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json')
};
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const actualInventory = sha(paths.inventory);
const actualPosters = sha(paths.posters);
assert.equal(actualInventory, broker.inventorySha, 'public Golden source changed without server source SHA pin');
assert.equal(actualPosters, broker.posterSha, 'optimized poster digests changed without server SHA pin');
const golden = JSON.parse(fs.readFileSync(paths.inventory,'utf8'));
const posters = JSON.parse(fs.readFileSync(paths.posters,'utf8'));
const keys = new Map(golden.items.map(x=>[x.catalog_id,x]));
assert.equal(keys.size,582);
assert.equal(broker.byId.size,582);
assert.equal(broker.postersById.size,582);
assert.equal(posters.items.length,582);
assert.equal(posters.golden_inventory_sha256,actualInventory);
assert.equal(posters.status,'STAGING_INDEX_NOT_RELEASE_APPROVAL');
const seen = new Set();
let total=0;
for (const p of posters.items) {
  assert.equal(seen.has(p.catalog_id),false);
  seen.add(p.catalog_id);
  const g = keys.get(p.catalog_id);
  assert.ok(g,'poster without matching Golden video');
  assert.equal(p.provider_id,g.provider_id);
  assert.equal(p.path,'movekit/v2/poster-optimized/'+g.provider_id+'.webp');
  assert.equal(broker.postersById.get(p.catalog_id).sha256,p.sha256);
  assert.match(p.sha256,/^[a-f0-9]{64}$/);
  assert.ok(p.bytes>0 && p.bytes<=1048576);
  total+=p.bytes;
}
assert.equal(total,9634714);
const release=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
assert.equal(release.status,'BLOCKED_NOT_REVIEWED');
assert.deepEqual(release.entries,[]);
assert.equal(release.inventory_sha256,null);
assert.equal(release.poster_digest_sha256,null);
assert.equal(broker.releaseConfigured(release,{}),false);
console.log('MoveKit V2 source/bundle digest pinning PASS: 582 unique video+poster canonical IDs, both SHA256 pins match exact public JSON, release blocked');
