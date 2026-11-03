/* TK-504 MoveKit V2 review eligibility gate - synthetic regression suite (node, standalone).
 * Draai: node core/movekitV2ReviewEligibility.test.js
 * Uitsluitend synthetische fixtures; geen private data, geen netwerk, geen productiepad. */
const fs = require('fs');
const path = require('path');
const G = require('./movekitV2ReviewEligibility.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const throws = (fn, code) => { try { fn(); } catch (e) { eq(e.code, code, 'code'); return; } throw new Error('verwachtte ' + code); };

const row = (i) => ({ catalog_id: 'TK-' + String(i).padStart(6, '0'), source: { provider: 'movekit', provider_id: 'synthetic-move-' + i } });
const BASE = Array.from({ length: 226 }, (_, k) => row(k + 1));
const PEND = Array.from({ length: 356 }, (_, k) => row(k + 227));
const fresh = () => G.create({ baseline: JSON.parse(JSON.stringify(BASE)), pending: JSON.parse(JSON.stringify(PEND)) });
const gate = fresh();
const cand = (i, extra) => Object.assign(row(i), extra || {});
const R = G.REASON;

console.log('\n🛡️ MoveKit V2 review eligibility gate');

T('published canonical identity is eligible for all three purposes', () => {
  G.PURPOSES.forEach((p) => { const d = gate.decide(cand(5), p); eq(d.allowed, true, p); eq(d.reason, R.ALLOWED); eq(d.providerId, 'synthetic-move-5'); });
  ok(gate.canExecute(cand(226)) && gate.canLog(cand(1)) && gate.canGrantMedia(cand(100)));
});
T('all 356 pending identities are denied for every purpose', () => {
  let n = 0;
  for (let i = 227; i <= 582; i++) { G.PURPOSES.forEach((p) => { const d = gate.decide(cand(i), p); eq(d.allowed, false); eq(d.reason, R.PENDING); }); n++; }
  eq(n, 356);
  ok(!gate.canExecute(cand(300)) && !gate.canLog(cand(300)) && !gate.canGrantMedia(cand(300)));
});
T('unknown purpose fails closed', () => {
  ['', 'read', 'WORKOUT_LOG', null, undefined, 5, {}].forEach((p) => eq(gate.decide(cand(5), p).reason, R.BAD_PURPOSE));
});
T('status forging on a pending identity never grants access', () => {
  const forged = cand(300, { status: 'PUBLISHED', published: true, approved: true, _approved_for_import: 1,
    release: { released: true }, confirmed_by_authenticated_reviewer: true, review_status: 'APPROVED' });
  G.PURPOSES.forEach((p) => eq(gate.decide(forged, p).reason, R.PENDING));
});
T('_review block or pending_review category on a published id denies', () => {
  eq(gate.decide(cand(5, { _review: { status: 'NOT_PUBLISHED' } }), 'workout_log').reason, R.PENDING_REVIEW_MARKER);
  eq(gate.decide(cand(5, { identity: { category: 'pending_review' } }), 'workout_log').reason, R.PENDING_REVIEW_MARKER);
});
T('forged published status cannot rebind a pending slug onto a published id', () => {
  const c = { catalog_id: 'TK-000005', source: { provider: 'movekit', provider_id: 'synthetic-move-300' }, published: true };
  eq(gate.decide(c, 'media_grant').allowed, false);
  eq(gate.decide(c, 'media_grant').reason, R.PENDING);
});
T('source tampering: slug mismatch, provider mismatch, missing or malformed source', () => {
  eq(gate.decide({ catalog_id: 'TK-000005', source: { provider: 'movekit', provider_id: 'other' } }, 'workout_log').reason, R.SLUG_MISMATCH);
  eq(gate.decide({ catalog_id: 'TK-000005', source: { provider: 'MoveKit', provider_id: 'synthetic-move-5' } }, 'workout_log').reason, R.PROVIDER_MISMATCH);
  eq(gate.decide({ catalog_id: 'TK-000005', source: { provider: 'other', provider_id: 'synthetic-move-5' } }, 'workout_log').reason, R.PROVIDER_MISMATCH);
  eq(gate.decide({ catalog_id: 'TK-000005' }, 'workout_log').reason, R.SOURCE_MISSING);
  eq(gate.decide({ catalog_id: 'TK-000005', source: 'movekit' }, 'workout_log').reason, R.SOURCE_MISSING);
  eq(gate.decide({ catalog_id: 'TK-000005', source: { provider: 'movekit', provider_id: ['synthetic-move-5'] } }, 'workout_log').reason, R.SLUG_MISMATCH);
});
T('legacy DB row id alone never becomes eligible', () => {
  eq(gate.decide({ id: 'TK-000005' }, 'workout_log').reason, R.NO_CATALOG_ID);
  eq(gate.decide({ id: 'abc-123', source: { provider: 'movekit', provider_id: 'synthetic-move-5' } }, 'workout_log').reason, R.NO_CATALOG_ID);
  eq(gate.decide({ id: 'TK-000005', name: 'Synthetic Move 5' }, 'media_grant').allowed, false);
});
T('row id that contradicts catalog_id is denied', () => {
  eq(gate.decide(cand(5, { id: 'TK-000006' }), 'workout_log').reason, R.ID_MISMATCH);
  eq(gate.decide(cand(5, { id: 12 }), 'workout_log').reason, R.ID_MISMATCH);
  eq(gate.decide(cand(5, { id: 'TK-000005' }), 'workout_log').allowed, true);
  eq(gate.decide(cand(5, { id: 'legacy-text-id' }), 'workout_log').allowed, true); // opaque DB id is irrelevant when catalog_id is trusted
});
T('personal / owned rows reusing a published TK id are never eligible', () => {
  ['scope', 'user_id', 'owner_id', 'ownerId', 'userId'].forEach((k) => {
    G.PURPOSES.forEach((p) => eq(gate.decide(cand(5, { [k]: 'x' }), p).reason, R.PERSONAL, k));
  });
  eq(gate.decide(cand(5, { scope: 'global' }), 'workout_log').allowed, false);
  eq(gate.decide(cand(5, { owner_id: null }), 'workout_log').allowed, false);
});
T('malformed identities and candidates are denied', () => {
  [null, undefined, 5, 'TK-000005', [], [cand(5)], () => 1, new Map()].forEach((c) => eq(gate.decide(c, 'workout_log').allowed, false));
  ['tk-000005', 'TK-5', 'TK-0000050', ' TK-000005', 'TK-000005 ', 'TK-00000A', '', null, 5, {}, ['TK-000005']].forEach((id) =>
    eq(gate.decide({ catalog_id: id, source: { provider: 'movekit', provider_id: 'synthetic-move-5' } }, 'workout_log').reason, R.NO_CATALOG_ID, String(id)));
  eq(gate.decide(cand(9999), 'workout_log').reason, R.UNKNOWN);
  eq(gate.decide(Object.create({ catalog_id: 'TK-000005', source: { provider: 'movekit', provider_id: 'synthetic-move-5' } }), 'workout_log').allowed, false, 'prototype props');
});
T('accessors and hostile proxies are denied without invoking getters', () => {
  let called = 0;
  const g = { source: { provider: 'movekit', provider_id: 'synthetic-move-5' } };
  Object.defineProperty(g, 'catalog_id', { enumerable: true, get() { called++; return 'TK-000005'; } });
  eq(gate.decide(g, 'workout_log').reason, R.ACCESSOR);
  const g2 = { catalog_id: 'TK-000005' };
  Object.defineProperty(g2, 'source', { enumerable: true, get() { called++; return { provider: 'movekit', provider_id: 'synthetic-move-5' }; } });
  eq(gate.decide(g2, 'workout_log').reason, R.ACCESSOR);
  const g3 = cand(5);
  Object.defineProperty(g3.source, 'provider_id', { enumerable: true, get() { called++; return 'synthetic-move-5'; } });
  eq(gate.decide(g3, 'workout_log').reason, R.ACCESSOR);
  eq(called, 0, 'getters never invoked');
  const hostile = new Proxy({}, { getPrototypeOf() { throw new Error('boom'); }, get() { throw new Error('boom'); }, has() { throw new Error('boom'); }, ownKeys() { throw new Error('boom'); } });
  eq(gate.decide(hostile, 'workout_log').allowed, false);
});
T('a published variant/reference to a pending id does not make the pending id eligible, and vice versa', () => {
  const pendingVariant = cand(300, { variant_of: 'TK-000005', variant_pair: { peer_catalog_id: 'TK-000005' }, references: ['TK-000005'] });
  eq(gate.decide(pendingVariant, 'workout_log').reason, R.PENDING);
  const publishedWithPendingRef = cand(5, { variant_pair: { peer_catalog_id: 'TK-000300' } });
  eq(gate.decide(publishedWithPendingRef, 'workout_log').allowed, true, 'published stays published');
  eq(gate.decide(cand(300, { catalog_id: 'TK-000005' }), 'workout_log').allowed, false);
});
T('candidates are never mutated and decisions are frozen', () => {
  const c = cand(5, { extra: { a: 1 } });
  const before = JSON.stringify(c);
  const d = gate.decide(c, 'workout_log');
  eq(JSON.stringify(c), before);
  ok(Object.isFrozen(d));
  ok(Object.isFrozen(gate));
  const attempt = () => { 'use strict'; d.allowed = false; };
  let threw = false; try { attempt(); } catch (_e) { threw = true; }
  ok(threw, 'frozen decision rejects writes');
  ok(Object.isFrozen(G) && Object.isFrozen(G.REASON) && Object.isFrozen(G.PURPOSES));
});
T('mutating the input arrays after construction cannot widen the trusted sets', () => {
  const b = JSON.parse(JSON.stringify(BASE)), p = JSON.parse(JSON.stringify(PEND));
  const g = G.create({ baseline: b, pending: p });
  b.push(row(300)); p.length = 0; b[4].source.provider_id = 'tampered';
  eq(g.decide(cand(300), 'workout_log').reason, R.PENDING);
  eq(g.decide(cand(5), 'workout_log').allowed, true);
  eq(g.baselineCount, 226); eq(g.pendingCount, 356);
});
T('construction fails closed on bad, overlapping or drifting trusted sets', () => {
  const b = () => JSON.parse(JSON.stringify(BASE)), p = () => JSON.parse(JSON.stringify(PEND));
  throws(() => G.create(), 'GATE_NOT_CONFIGURED');
  throws(() => G.create({ baseline: 'x', pending: p() }), 'INVALID_BASELINE');
  throws(() => G.create({ baseline: b(), pending: p().slice(1) }), 'PENDING_COUNT_CHANGED');
  throws(() => G.create({ baseline: b().slice(1), pending: p() }), 'BASELINE_COUNT_CHANGED');
  const overlapId = p(); overlapId[0].catalog_id = 'TK-000005';
  throws(() => G.create({ baseline: b(), pending: overlapId }), 'DUPLICATE_CATALOG_ID');
  const overlapSlug = p(); overlapSlug[0].source.provider_id = 'synthetic-move-5';
  throws(() => G.create({ baseline: b(), pending: overlapSlug }), 'DUPLICATE_PROVIDER_ID');
  const badProv = b(); badProv[0].source.provider = 'other';
  throws(() => G.create({ baseline: badProv, pending: p() }), 'INVALID_BASELINE_SOURCE');
  const badId = p(); badId[0].catalog_id = 'x';
  throws(() => G.create({ baseline: b(), pending: badId }), 'INVALID_PENDING');
  const g = G.create({ baseline: b().slice(0, 2), pending: p().slice(0, 3), expectedBaseline: 2, expectedPending: 3 });
  eq(g.baselineCount, 2);
});
T('gate is review-only, inactive and does not claim to resolve #584', () => {
  eq(gate.reviewOnly, true); eq(gate.activeUi, false); eq(gate.resolvesIssue584, false);
});
T('module is pure and not wired into index.html or core runtime', () => {
  const src = fs.readFileSync(path.join(__dirname, 'movekitV2ReviewEligibility.js'), 'utf8');
  ok(!/\brequire\s*\(/.test(src), 'no requires');
  ok(!/\b(fetch|XMLHttpRequest|WebSocket|localStorage|indexedDB|document|window|process\.env|child_process)\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'no IO/DOM globals');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(!html.includes('movekitV2ReviewEligibility') && !html.includes('MoveKitV2ReviewEligibility'), 'not wired in index.html');
});

console.log('\n' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
