'use strict';
/* Synthetic-only. Uses the REAL ExerciseCatalogService extracted from index.html in a VM.
 * No DB, network, media, Supabase, entitlements or supplier bytes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Launch = require('./movekitV2DarkLaunchGate.js');
const Adapter = require('./movekitV2TkCatalogAdapter.js');
const ROOT = path.join(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/movekit-v2-taxonomy-map.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const cid = (i) => 'TK-' + String(i).padStart(6, '0');
function entry(i) {
  const n = i > 226;
  const muscle = i === 227 ? 'Forearms' : i === 228 ? 'Lower Back' : (i % 2 ? 'Grip' : 'Quadriceps');
  const eq = i === 227 ? 'Bench' : i === 228 ? 'TRX' : 'bodyweight';
  const e = {
    catalog_id: cid(i), source: { provider: 'movekit', provider_id: 'synthetic-' + i },
    identity: { name: 'Synthetic Exercise ' + i, nl: null, category: n ? 'pending_review' : 'strength',
      family: n ? 'pending_review' : 'strength', pattern: n ? 'pending_review' : 'hinge',
      primary: [muscle], secondary: [], equipment: [eq], difficulty: 'beginner',
      type: n ? 'pending_review' : 'compound', goals: [] },
    intelligence: { fatigue: null, recovery: null, confidence: null },
    flags: { favorite: false, home_gym_ready: false, travel_ready: false, injury_flags: [] },
    relations: { alternatives: [], progressions: [], regressions: [] }, assets: []
  };
  if (n) e._review = { status: 'NOT_PUBLISHED', integration_status: 'HOLD_FOR_HUMAN_AND_RELEASE_GATES',
    confirmed_by_authenticated_reviewer: false };
  return e;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => entry(a + k));
function realEcs(rows, favorites, recent) {
  const start = html.indexOf('var ExerciseCatalogService=(function(){');
  const stop = html.indexOf('})();', start);
  assert(start > 0 && stop > start);
  const sandbox = { EX_CATALOG: JSON.parse(JSON.stringify({ catalog: rows })),
    localStorage: { getItem: (k) => (k === 'tk_lib_recent' && recent ? JSON.stringify(recent) : null), setItem() {} },
    favoriteExIds: new Set(favorites || []), performance: { now: () => 0 },
    console: { log() {} }, Date, Math, JSON, Array, Set, Map };
  vm.runInNewContext(html.slice(start, stop + 5), sandbox, { timeout: 2500 });
  return sandbox.ExerciseCatalogService;
}
const trust = (a, b) => range(a, b).map((e) => ({ catalog_id: e.catalog_id, source: { ...e.source } }));

let account = 'user-a', clock = 1000000, grantOk = true;
const launch = Launch.create({ getAccountId: () => account, now: () => clock,
  verifyServerGrant: () => grantOk });
const goodGrant = () => ({ issuer: 'tk-server', scope: Launch.SCOPE, accountId: account, expiresAtMs: clock + 60000 });
let currentGrant = goodGrant();
const mk = (ecs, extra) => Adapter.create({ catalogService: ecs, launchGate: launch,
  grantProvider: () => currentGrant, registry, baseline: trust(1, 226), pending: trust(227, 582), ...extra });

let pass = 0;
function test(name, fn) {
  try { currentGrant = goodGrant(); account = 'user-a'; grantOk = true; fn(); pass++; console.log('PASS ' + name); }
  catch (err) { console.error('FAIL ' + name + '\n' + err.stack); process.exitCode = 1; }
}
const ecs582 = realEcs(range(1, 582), ['TK-000001', 'TK-000300'], ['TK-000002', 'TK-000301', 'TK-000003']);
const ad = mk(ecs582);

test('disabled by default without verifier; no browser flag can enable it', () => {
  const g = Launch.create({});
  assert.equal(g.check(goodGrant()).enabled, false);
  assert.equal(Launch.DEFAULT_ENABLED, false);
  const sandboxFlags = { localStorage: { tk_movekit_v2: '1' }, window: { __TK_V2__: true } };
  globalThis.__TK_V2__ = true; globalThis.localStorage = { getItem: () => '1' };
  const d = Adapter.create({ catalogService: ecs582, launchGate: g, grantProvider: () => goodGrant(),
    registry, baseline: trust(1, 226), pending: trust(227, 582) });
  const r = d.search('');
  assert.equal(r.status, 'DISABLED'); assert.equal(r.rows.length, 0); assert.equal(d.isEnabled(), false);
  delete globalThis.__TK_V2__; delete globalThis.localStorage; void sandboxFlags;
});
test('server verifier must return exactly true; grant forged/expired/stale/other account denied', () => {
  for (const v of [false, 1, 'true', undefined, {}]) { grantOk = v; assert.equal(ad.search('').status, 'DISABLED'); }
  grantOk = true; assert.equal(ad.search('').status, 'ENABLED');
  currentGrant = { ...goodGrant(), expiresAtMs: clock - 1 }; assert.equal(ad.search('').reason, Launch.REASON.EXPIRED);
  currentGrant = { ...goodGrant(), expiresAtMs: clock + Launch.MAX_TTL_MS + 1 }; assert.equal(ad.search('').reason, Launch.REASON.TTL);
  currentGrant = { ...goodGrant(), issuer: 'client' }; assert.equal(ad.search('').reason, Launch.REASON.BAD_GRANT);
  currentGrant = { ...goodGrant(), scope: 'other' }; assert.equal(ad.search('').status, 'DISABLED');
  currentGrant = null; assert.equal(ad.search('').reason, Launch.REASON.NO_GRANT);
  currentGrant = goodGrant(); account = 'user-b';
  assert.equal(ad.search('').reason, Launch.REASON.ACCOUNT); assert.equal(ad.resolveReference('TK-000001').ok, false);
});
test('throwing verifier / getters / proxies in the grant fail closed', () => {
  const g = Launch.create({ getAccountId: () => 'x', verifyServerGrant: () => { throw new Error('boom'); } });
  assert.equal(g.check({ issuer: 'tk-server', scope: Launch.SCOPE, accountId: 'x', expiresAtMs: Date.now() + 1000 }).enabled, false);
  const getter = { issuer: 'tk-server', scope: Launch.SCOPE, expiresAtMs: clock + 5 };
  Object.defineProperty(getter, 'accountId', { get() { return account; }, enumerable: true });
  currentGrant = getter; assert.equal(ad.search('').status, 'DISABLED');
  currentGrant = new Proxy(goodGrant(), { getOwnPropertyDescriptor() { throw new Error('hostile'); } });
  assert.equal(ad.search('').status, 'DISABLED');
});
test('normal picker mode returns exactly the published 226, all trainable', () => {
  const r = ad.search('', {}, 'name', { limit: 200 });
  assert.equal(r.total, 226); assert.equal(r.pendingShown, 0);
  assert(r.rows.every((x) => x.trainable && x.selectable && x.status === Adapter.STATUS.PUBLISHED));
  assert(r.rows.every((x) => Number(x.catalog_id.slice(3)) <= 226));
});
test('includePending shows 356 explicitly non-trainable with pending status', () => {
  const r = ad.search('', {}, 'name', { includePending: true, limit: 200, offset: 200 });
  assert.equal(r.total, 582); assert.equal(r.pendingShown, 356);
  const p = ad.search('', { category: 'pending_review' }, 'name', { includePending: true, limit: 200 });
  assert.equal(p.total, 356);
  assert(p.rows.every((x) => !x.trainable && !x.selectable && x.status === Adapter.STATUS.PENDING &&
    x.disabledReason === Adapter.PENDING_REASON && x.mediaPolicy === 'NONE'));
  assert.equal(ad.search('', { category: 'pending_review' }, 'name').total, 0);
});
test('exact source muscle/equipment filters: no Forearms->Grip, no Lower Back->Rug', () => {
  const o = { includePending: true };
  const f = ad.search('', { [Adapter.FILTER_KEYS.muscle]: 'movekit:muscle:forearms' }, undefined, o);
  assert.deepEqual(f.rows.map((x) => x.catalog_id), ['TK-000227']);
  const lb = ad.search('', { [Adapter.FILTER_KEYS.muscle]: 'movekit:muscle:lower_back' }, undefined, o);
  assert.deepEqual(lb.rows.map((x) => x.catalog_id), ['TK-000228']);
  const both = ad.search('', { [Adapter.FILTER_KEYS.muscle]: 'movekit:muscle:forearms',
    [Adapter.FILTER_KEYS.equipment]: 'movekit:equipment:trx' }, undefined, o);
  assert.equal(both.total, 0);
  assert.equal(ad.search('', { [Adapter.FILTER_KEYS.muscle]: 'movekit:muscle:forearms' }).total, 0); // pending hidden
  assert.equal(f.rows[0].facets.muscles[0].approved, false);
  assert.throws(() => ad.search('', { [Adapter.FILTER_KEYS.muscle]: 'm:grip' }), /UNKNOWN_SOURCE_FACET_FILTER/);
});
test('legacy ECS filters/sort/query keep working through the single existing service', () => {
  assert.equal(ad.search('', { category: 'strength' }).total, 226);
  assert.equal(ad.search('Synthetic Exercise 17').rows[0].catalog_id, 'TK-000017');
  assert.equal(ad.search('', { difficulty: 'beginner' }, 'difficulty', { limit: 5 }).rows.length, 5);
});
test('hostile inputs are rejected with controlled errors', () => {
  const bad = [[() => ad.search(5), /INVALID_QUERY/], [() => ad.search('x'.repeat(101)), /INVALID_QUERY/],
    [() => ad.search('', []), /INVALID_FILTERS/], [() => ad.search('', { __proto__x: 1, evil: 1 }), /UNKNOWN_FILTER/],
    [() => ad.search('', {}, 'drop table'), /UNKNOWN_SORT/], [() => ad.search('', {}, undefined, { limit: 0 }), /INVALID_LIMIT/],
    [() => ad.search('', {}, undefined, { limit: 9999 }), /INVALID_LIMIT/], [() => ad.search('', {}, undefined, { offset: -1 }), /INVALID_OFFSET/],
    [() => ad.search('', {}, undefined, 'x'), /INVALID_OPTIONS/]];
  for (const [fn, re] of bad) assert.throws(fn, re);
  assert.throws(() => Adapter.create(), /ADAPTER_NOT_CONFIGURED/);
  assert.throws(() => Adapter.create({ catalogService: {} }), /INCOMPATIBLE_CANONICAL_SEARCH/);
});
test('output is sanitized projection: no assets/_review/urls; name stripped; frozen', () => {
  const rows = range(1, 582); rows[0].assets = [{ type: 'video', url: 'https://x/y.mp4' }];
  rows[0].identity.name = 'Evil\u0000<img src=x onerror=1>' + 'A'.repeat(300);
  rows[0].media_url = 'https://signed.example/?token=abc';
  const a = mk(realEcs(rows)); const r = a.search('', {}, undefined, { limit: 200 }).rows.find((x) => x.catalog_id === 'TK-000001');
  const s = JSON.stringify(r);
  assert(!/https?:|token|assets|_review|media_url|\.mp4/.test(s), s);
  assert(!r.name.includes('\u0000')); assert(r.name.length <= 120); assert.equal(r.renderAs, 'text');
  assert(Object.isFrozen(r));
});
test('forged release status / personal masquerade / source mismatch never become trainable', () => {
  const rows = range(1, 582);
  rows[300].identity.category = 'strength'; rows[300]._review = { status: 'PUBLISHED' }; rows[300].published = true; // pending id forged
  rows[10].scope = 'personal'; rows[10].user_id = 'u1';                         // personal row reusing published id
  rows[20].source.provider_id = 'tampered';                                     // source mismatch on published id
  rows[30]._review = { status: 'NOT_PUBLISHED' };                               // published id with pending marker
  const a = mk(realEcs(rows)); const all = a.search('', {}, 'name', { includePending: true, limit: 200 });
  const res = a.search('', {}, undefined, { limit: 200 });
  const ids = new Set(a.search('', {}, 'name', { limit: 200 }).rows.map((x) => x.catalog_id));
  assert.equal(res.total, 223); // 226 published minus the 3 tampered published ids; forged pending id stays out
  for (const i of [301, 11, 21, 31]) assert(!ids.has(cid(i)), cid(i));
  assert.equal(ids.has('TK-000301'), false);
  assert.equal(a.resolveReference(cid(301)).ok, false);
  void all;
  const forged = a.search('Synthetic Exercise 301', {}, undefined, { includePending: true }).rows.find((x) => x.catalog_id === 'TK-000301');
  assert.equal(forged.trainable, false); assert.equal(forged.status, Adapter.STATUS.PENDING);
});
test('pending records with altered supplier source provenance are hidden, even in review mode', () => {
  const rows = range(1, 582);
  rows[226].source.provider = 'not-movekit';
  rows[227].source.provider_id = 'forged-pending-slug';
  const a = mk(realEcs(rows));
  const result = a.search('', {}, undefined, { includePending: true, limit: 200 });
  assert.equal(result.total, 580);
  assert.equal(result.pendingShown, 354);
  assert.equal(a.search('', { category: 'pending_review' }, undefined, { includePending: true }).total, 354);
  assert.equal(a.resolveReference(cid(227)).ok, false);
  assert.equal(a.assetIdentity(cid(228)).ok, false);
});
test('transient grant provider failure disables every read surface instead of throwing', () => {
  const bad = Adapter.create({ catalogService: ecs582, launchGate: launch,
    grantProvider: () => { throw new Error('transient session error'); },
    registry, baseline: trust(1, 226), pending: trust(227, 582) });
  assert.equal(bad.isEnabled(), false);
  assert.equal(bad.search('').reason, 'DISABLED_GRANT_PROVIDER_ERROR');
  assert.equal(bad.favorites().status, 'DISABLED');
  assert.equal(bad.recent().status, 'DISABLED');
  assert.equal(bad.resolveReference(cid(1)).ok, false);
  assert.equal(bad.assetIdentity(cid(1)).ok, false);
});
test('published result nested source arrays and facets cannot be mutated after validation', () => {
  const row = ad.search('Synthetic Exercise 1').rows[0];
  assert(Object.isFrozen(row.primary));
  assert(Object.isFrozen(row.secondary));
  assert(Object.isFrozen(row.equipment));
  assert(Object.isFrozen(row.source));
  assert(Object.isFrozen(row.facets));
  assert(Object.isFrozen(row.facets.muscles));
  assert(Object.isFrozen(row.facets.equipment));
  assert(row.facets.muscles.every(Object.isFrozen));
  assert(row.facets.equipment.every(Object.isFrozen));
  assert.throws(() => { row.source.provider_id = 'forged'; }, TypeError);
  assert.throws(() => { row.primary.push('forged'); }, TypeError);
  assert.equal(ad.assetIdentity(cid(1)).provider_id, 'synthetic-1');
});
test('unknown catalog ids in service and duplicate service rows are hidden / rejected', () => {
  const rows = range(1, 582); rows.push(entry(900));
  const a = mk(realEcs(rows)); assert.equal(a.search('Synthetic Exercise 900', {}, undefined, { includePending: true }).total, 0);
  const dup = range(1, 226); dup.push(entry(5)); dup.push(...range(227, 582));
  assert.throws(() => mk(realEcs(dup)), /DUPLICATE_CATALOG_ID_IN_SERVICE/);
});
test('references: published ok; pending, crafted, personal, forged, non-strings denied', () => {
  assert.equal(ad.resolveReference('TK-000001').ok, true);
  assert.equal(ad.resolveReference({ catalog_id: 'TK-000002' }).ok, false); // claim w/o provenance not trusted
  assert.equal(ad.resolveReference({ catalog_id: 'TK-000002', source: { provider: 'movekit', provider_id: 'synthetic-2' } }).ok, true);
  for (const bad of ['TK-000227', 'TK-000582', 'TK-999999', 'tk-000001', 'TK-000001 ', '__proto__', 'constructor',
    '', null, undefined, 7, [], {}, { catalog_id: 'TK-000300' },
    { catalog_id: 'TK-000001', id: 'TK-000002', source: { provider: 'movekit', provider_id: 'synthetic-1' } },
    { catalog_id: 'TK-000001', scope: 'personal', source: { provider: 'movekit', provider_id: 'synthetic-1' } },
    { catalog_id: 'TK-000001', _review: { status: 'PUBLISHED' }, source: { provider: 'movekit', provider_id: 'synthetic-1' } }]) {
    assert.equal(ad.resolveReference(bad).ok, false, JSON.stringify(bad));
  }
});
test('revocation: revoked published ids vanish everywhere; bad provider fails closed; live re-read', () => {
  let revoked = ['TK-000001'];
  const a = mk(ecs582, { revocationProvider: () => revoked });
  const ids = (r) => r.rows.map((x) => x.catalog_id);
  assert(!ids(a.search('', {}, undefined, { limit: 200, includePending: true })).includes('TK-000001'));
  assert.equal(a.search('', {}, undefined, { limit: 200 }).total, 225);
  assert.equal(a.resolveReference('TK-000001').ok, false);
  assert.equal(a.favorites().rows.length, 0);
  assert.equal(a.assetIdentity('TK-000001').ok, false);
  revoked = [{ catalog_id: 'TK-000002' }]; // live re-read: 1 is restored, 2 revoked
  assert.equal(a.resolveReference('TK-000001').ok, true);
  assert.equal(a.resolveReference('TK-000002').ok, false);
  for (const bad of ['x', null, [7], ['tk-000001'], [{}], ['__proto__']]) {
    revoked = bad; // malformed answer -> everything denied
    assert.equal(a.search('', {}, undefined, { limit: 200 }).total, 0, JSON.stringify(bad));
    assert.equal(a.resolveReference('TK-000003').ok, false);
  }
  revoked = () => { throw new Error('x'); };
  assert.equal(a.resolveReference('TK-000003').ok, false);
  assert.throws(() => mk(ecs582, { revocationProvider: 'nope' }), /INVALID_REVOCATION_PROVIDER/);
  assert.equal(ad.search('', {}, undefined, { limit: 200 }).total, 226); // default unchanged
});
test('assetIdentity: exact source identity for published only; pending/crafted/personal/disabled denied', () => {
  const r = ad.assetIdentity('TK-000005');
  assert.deepEqual(Object.keys(r).sort(), ['catalog_id', 'ok', 'provider_id', 'reason', 'via']);
  assert.equal(r.ok, true); assert.equal(r.catalog_id, 'TK-000005'); assert.equal(r.provider_id, 'synthetic-5');
  assert(!/https?:|blob|data:/i.test(JSON.stringify(r)));
  for (const bad of ['TK-000227', 'TK-000582', 'TK-999999', '__proto__', '', null, 7, {},
    { catalog_id: 'TK-000005', scope: 'personal', source: { provider: 'movekit', provider_id: 'synthetic-5' } }]) {
    const x = ad.assetIdentity(bad);
    assert.equal(x.ok, false, JSON.stringify(bad)); assert.equal(x.provider_id, null);
  }
  grantOk = false; assert.equal(ad.assetIdentity('TK-000005').ok, false);
});
test('favorites/recent come from existing service; pending favorites/recents are dropped', () => {
  assert.deepEqual(ad.favorites().rows.map((x) => x.catalog_id), ['TK-000001']);
  assert.deepEqual(ad.recent().rows.map((x) => x.catalog_id), ['TK-000002', 'TK-000003']);
  grantOk = false; assert.equal(ad.favorites().status, 'DISABLED'); assert.equal(ad.recent().status, 'DISABLED');
});
test('published-only production-shaped service (226) works and stays stable', () => {
  const a = mk(realEcs(range(1, 226)), { pending: trust(227, 582) });
  assert.equal(a.search('', {}, undefined, { limit: 200 }).total, 226);
});
test('count drift of trusted sets fails closed at creation', () => {
  assert.throws(() => mk(ecs582, { baseline: trust(1, 225) }), /BASELINE_COUNT_CHANGED/);
  assert.throws(() => mk(ecs582, { pending: trust(227, 581) }), /PENDING_COUNT_CHANGED/);
  assert.throws(() => mk(ecs582, { pending: trust(226, 581) }), /DUPLICATE_CATALOG_ID/);
});
test('adapter surface has no write/media/url capability, is frozen, and cannot be enabled', () => {
  for (const k of Object.keys(ad)) assert(!/sign|media|grant|url|write|save|toggle|push|import|activate/i.test(k), k);
  assert(Object.isFrozen(ad)); assert.equal(ad.productionEnabled, false); assert.equal(ad.unwired, true);
  assert.throws(() => { ad.productionEnabled = true; }, TypeError);
  assert.equal(Launch.PENDING_EXECUTION_PERMITTED, false);
});
test('not referenced by index.html (unwired) and ECS source has no V2 hook', () => {
  for (const m of ['movekitV2TkCatalogAdapter', 'movekitV2DarkLaunchGate', 'MoveKitV2']) assert(!html.includes(m), m);
});
test('input arrays/ECS rows are not mutated by the adapter', () => {
  const rows = range(1, 582); const before = JSON.stringify(rows);
  const e = realEcs(rows); const a = mk(e); a.search('', {}, undefined, { includePending: true, limit: 200 });
  assert.equal(JSON.stringify(rows), before);
});
console.log('MoveKit V2 TK catalog adapter: ' + pass + ' checks, exit ' + (process.exitCode || 0));
