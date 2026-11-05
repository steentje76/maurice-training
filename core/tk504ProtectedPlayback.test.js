'use strict';
const assert = require('node:assert/strict');
const { create } = require('./tk504ProtectedPlayback.js');
const catalog = require('../exercise-catalog.json');
const ids = new Map(catalog.catalog.map(x => [x.catalog_id, x]));
const ecs = { byId: id => ids.get(id) || null };
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';
let owner = userA, calls = [], invalidateCount = 0, deferred;
const bridge = {
  async requestStaged(ex, type, uid) {
    calls.push({ ex, type, uid });
    if (deferred) return deferred;
    return { catalogId: ex.catalog_id, type, version: 'v2',
      url: 'https://example.invalid/secure-video', expiresAt: Date.now() + 20000 };
  },
  invalidate() { invalidateCount++; }
};
const playback = create({ catalogService: ecs, bridge, getOwner: () => owner });
async function run() {
  assert.equal(catalog.catalog.length, 226);
  assert.equal(playback.canonical('TK-000001')?.source?.provider, 'movekit');
  assert.equal(playback.canonical('TK-000226')?.catalog_id, 'TK-000226');
  assert.equal(playback.canonical('TK-000227'), null);
  assert.equal(playback.canonical({ id: 'TK-000001' }), null);
  assert.equal(playback.canonical({ catalog_id: 'TK-000001', scope: 'personal' }), null);
  assert.equal(playback.canonical({ catalog_id: 'TK-000001', user_id: userA }), null);
  assert.equal(playback.canonical({ catalog_id: 'TK-000001', source: {
    provider: 'movekit', provider_id: 'wrong-slug' } }), null);
  assert.equal((await playback.signed('TK-000001', 'video')).catalogId, 'TK-000001');
  assert.equal(calls[0].ex.source.provider_id, ids.get('TK-000001').source.provider_id);
  assert.equal(calls[0].uid, userA);
  await assert.rejects(playback.signed('TK-000227', 'video'), /CANONICAL_EXERCISE_UNBOUND/);
  await assert.rejects(playback.signed('TK-000001', 'audio'), /UNSUPPORTED_MEDIA_TYPE/);
  owner = null;
  await assert.rejects(playback.signed('TK-000001', 'video'), /AUTH_REQUIRED/);
  owner = userA;
  deferred = new Promise(resolve => setTimeout(() => resolve({
    catalogId:'TK-000001',type:'video',version:'v2',url:'https://example.invalid/signed'
  }), 0));
  const p = playback.signed('TK-000001', 'video');
  owner = userB;
  await assert.rejects(p, /STALE_ACCOUNT/);
  deferred = null;
  owner = userA;
  playback.invalidate();
  assert.equal(invalidateCount, 1);
  assert.equal((await playback.signed('TK-000226','poster')).type, 'poster');
  console.log('TK504 protected playback: 17 canonical/auth/identity assertions PASS; pending 356 denied');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
