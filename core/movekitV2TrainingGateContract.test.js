'use strict';
/* Phase D contract: pending 356 cannot reach workout execution / logging / media; the
 * published 226 (taken from the REAL embedded EX_CATALOG in index.html) stay valid.
 * Pure: no DB, no network, no history writes, no media. Does NOT claim to fix #584. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Eligibility = require('./movekitV2ReviewEligibility.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function embeddedCatalog() {
  const m = html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
  assert(m, 'EX_CATALOG line present');
  return JSON.parse(m[1]);
}
const cat = embeddedCatalog();
const published = cat.catalog;
const cid = (i) => 'TK-' + String(i).padStart(6, '0');
const pendingRows = Array.from({ length: 356 }, (_, k) => ({
  catalog_id: cid(227 + k), source: { provider: 'movekit', provider_id: 'pending-synthetic-' + (227 + k) } }));
const gate = Eligibility.create({
  baseline: published.map((c) => ({ catalog_id: c.catalog_id, source: { provider: c.source.provider, provider_id: c.source.provider_id } })),
  pending: pendingRows });
const pub = (i) => { const c = published[i]; return { catalog_id: c.catalog_id, source: { provider: 'movekit', provider_id: c.source.provider_id } }; };

let pass = 0;
function test(name, fn) { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { console.error('FAIL ' + name + '\n' + e.stack); process.exitCode = 1; } }
const PURPOSES = Eligibility.PURPOSES;

test('live embedded catalog is exactly the published 226, nothing pending/unreleased', () => {
  assert.equal(published.length, 226); assert.equal(cat.count, 226);
  const ids = new Set(published.map((c) => c.catalog_id));
  assert.equal(ids.size, 226);
  for (const c of published) {
    assert(/^TK-\d{6}$/.test(c.catalog_id)); assert.equal(c.source.provider, 'movekit');
    assert.notEqual(c.identity.category, 'pending_review'); assert(!c._review);
  }
  for (const p of pendingRows) assert(!ids.has(p.catalog_id));
});
test('all 226 published identities remain valid for execution, logging and media', () => {
  for (let i = 0; i < 226; i++) for (const p of PURPOSES) assert.equal(gate.decide(pub(i), p).allowed, true, i + p);
  assert.equal(gate.baselineCount, 226);
});
test('all 356 pending identities are denied for every purpose, even with forged claims', () => {
  for (const p of pendingRows) {
    for (const purpose of PURPOSES) {
      assert.equal(gate.decide(p, purpose).allowed, false);
      const forged = { ...p, status: 'PUBLISHED', published: true, approved: true, released: true,
        _review: null, identity: { category: 'strength' } };
      assert.equal(gate.decide(forged, purpose).allowed, false);
    }
  }
  assert.equal(gate.pendingCount, 356);
});
test('personal/owned rows reusing pending OR published ids are never auto-eligible', () => {
  for (const k of ['scope', 'user_id', 'owner_id', 'ownerId', 'userId']) {
    assert.equal(gate.canExecute({ ...pendingRows[0], [k]: 'x' }), false);
    assert.equal(gate.canLog({ ...pub(0), [k]: 'x' }), false);
  }
  assert.equal(gate.canExecute({ id: 'f3a1c0de-0000-4000-8000-000000000001', name: 'Mijn oefening', scope: 'personal' }), false);
});
test('forged catalog_id / legacy DB id / crafted strings are denied', () => {
  for (const bad of [{ id: 'TK-000001' }, { id: 'abc' }, { catalog_id: 'TK-1' }, { catalog_id: 'tk-000001' },
    { catalog_id: 'TK-000001\n' }, { catalog_id: '__proto__' }, { catalog_id: pub(0).catalog_id, id: pendingRows[0].catalog_id },
    { catalog_id: cid(999999) }, null, undefined, 5, 'TK-000001', [], () => 1]) {
    for (const p of PURPOSES) assert.equal(gate.decide(bad, p).allowed, false, JSON.stringify(bad));
  }
  assert.equal(gate.decide(pub(0), 'drop').reason, Eligibility.REASON.BAD_PURPOSE);
});
test('variant relationships do not transfer eligibility in either direction', () => {
  const pendingVariantOfPublished = { ...pendingRows[0], variant_of: pub(0).catalog_id, relations: { alternatives: [pub(0).catalog_id] } };
  assert.equal(gate.canExecute(pendingVariantOfPublished), false);
  const publishedClaimingPendingVariant = { ...pub(1), variant_of: pendingRows[1].catalog_id };
  assert.equal(gate.canExecute(publishedClaimingPendingVariant), true);   // own identity decides, not the claim
  const pendingPair = [pendingRows[2], { ...pendingRows[3], variant_of: pendingRows[2].catalog_id }];
  for (const r of pendingPair) assert.equal(gate.canExecute(r), false);
});
test('ambiguous / mismatching source metadata is denied', () => {
  const p0 = pub(0);
  assert.equal(gate.decide({ catalog_id: p0.catalog_id, source: { provider: 'movekit', provider_id: pendingRows[0].source.provider_id } }, 'workout_log').reason, Eligibility.REASON.PENDING);
  assert.equal(gate.canLog({ catalog_id: p0.catalog_id, source: { provider: 'MoveKit', provider_id: p0.source.provider_id } }), false);
  assert.equal(gate.canLog({ catalog_id: p0.catalog_id, source: { provider: 'movekit', provider_id: p0.source.provider_id + 'x' } }), false);
  assert.equal(gate.canLog({ catalog_id: p0.catalog_id, source: { provider: 'movekit', provider_id: ['a'] } }), false);
});
test('missing evidence is denied: no source, no catalog_id, empty object', () => {
  assert.equal(gate.canExecute({ catalog_id: pub(0).catalog_id }), false);
  assert.equal(gate.canExecute({}), false);
  assert.equal(gate.canExecute({ source: pub(0).source }), false);
});
test('hostile accessors / proxies fail closed and are never invoked as getters', () => {
  let called = 0;
  const g = { source: pub(0).source }; Object.defineProperty(g, 'catalog_id', { get() { called++; return pub(0).catalog_id; }, enumerable: true });
  assert.equal(gate.canExecute(g), false); assert.equal(called, 0);
  assert.equal(gate.canExecute(new Proxy(pub(0), { getOwnPropertyDescriptor() { throw new Error('x'); } })), false);
});
test('candidates are never mutated and decisions are frozen', () => {
  const c = pub(0), before = JSON.stringify(c); const d = gate.decide(c, 'workout_log');
  assert.equal(JSON.stringify(c), before); assert(Object.isFrozen(d));
});
test('trusted-set drift fails closed (e.g. a pending id leaking into baseline)', () => {
  const base = published.map((c) => ({ catalog_id: c.catalog_id, source: { provider: 'movekit', provider_id: c.source.provider_id } }));
  assert.throws(() => Eligibility.create({ baseline: base.concat([pendingRows[0]]), pending: pendingRows }), /DUPLICATE_CATALOG_ID|BASELINE_COUNT_CHANGED/);
  assert.throws(() => Eligibility.create({ baseline: base, pending: pendingRows.slice(1) }), /PENDING_COUNT_CHANGED/);
});
test('gate states it does NOT resolve #584 and is inactive in the UI', () => {
  assert.equal(gate.resolvesIssue584, false); assert.equal(gate.activeUi, false); assert.equal(gate.reviewOnly, true);
});
test('central route facts: shadow-row writer and logger exist and have no V2 gate yet (documented gap)', () => {
  assert(html.includes('async function ensureExerciseRowStatus(exId)'));
  assert(html.includes('function logSet(exId,type,setNum,isWork)'));
  assert(html.includes('async function openTrainingPreview(source,id)'));
  const i = html.indexOf('async function ensureExerciseRowStatus(exId)');
  const body = html.slice(i, i + 3500);
  assert(body.includes('ExerciseCatalogService.byId(exId)'), 'shadow row derives only from live ECS');
  assert(!/MoveKitV2|movekitV2/i.test(html), 'index.html has no V2 wiring');
});
console.log('MoveKit V2 training/logging gate contract: ' + pass + ' checks, exit ' + (process.exitCode || 0));
