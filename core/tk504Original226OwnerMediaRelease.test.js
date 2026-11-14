'use strict';
// TK504 — pinned owner media release for the original 226 (356 method).
// Verifies the decision record, its binding to the 452-media staging manifest and the
// ten-batch evidence, and that the verifier fails closed on any change. Synthetic only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..');
const V = require('./tk504Original226MediaRelease.js');
const decision = require('../docs/generated/MOVEKIT_V2_OWNER_ORIGINAL226_MEDIA_RELEASE_20261114.json');
const manifest = require('../docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json');
const bulk356 = require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

// 1. Record content and pinned digest.
eq([decision.schema, decision.decision_id, decision.status],
  [V.SCHEMA, V.DECISION_ID, V.STATUS], 'record identity matches verifier constants');
eq(V.recordSha256(decision), V.RECORD_SHA256, 'canonical record digest equals the pinned digest');
ok(V.released(decision) === true, 'exact pinned record is accepted');
eq(decision.evidence_type, 'owner_chat_explicit_not_cryptographically_signed', 'no claim of a cryptographic signature');
ok(decision.decision_utterances.some(u => u.date === '2026-11-13' && u.utterance === 'Mijn akkoord voor vrijgave hierbij'),
  'owner approval of 13 Nov recorded verbatim');
ok(decision.decision_utterances.some(u => u.date === '2026-11-14' && /356-methode/.test(u.utterance)),
  'owner choice for the 356 method recorded');
ok(/TK504-20261105-OWNER-BATCHES-01-15/.test(decision.method) && bulk356.decision_id === 'TK504-20261105-OWNER-BATCHES-01-15',
  'method references the existing 356 owner decision');

// 2. Scope is exactly the original 226 (video + poster), nothing else.
eq(decision.scope.first_catalog_id + '..' + decision.scope.last_catalog_id, 'TK-000001..TK-000226', 'scope range');
eq([decision.scope.catalog_count, decision.scope.media_count, decision.scope.media_types],
  [226, 452, ['video', 'poster']], 'scope counts');
for (const x of ['catalog_publications_for_original_226', 'fk_binding_activation_for_original_226', 'account_grants',
  'legacy_v1_public_videos_removal', 'service_worker_cache_purge', 'android_release']) {
  ok(decision.excluded.includes(x), 'explicitly excluded: ' + x);
}
ok(V.inScope('TK-000001') && V.inScope('TK-000226') && !V.inScope('TK-000227') && !V.inScope('TK-000000') &&
   !V.inScope('tk-000001') && !V.inScope(null), 'inScope boundaries');

// 3. Binding to the staging manifest (452 media, exact digests/bytes).
const mf = fs.readFileSync(path.join(ROOT, decision.media_manifest.file), 'utf8').replace(/\r\n/g, '\n');
eq(sha(Buffer.from(mf, 'utf8')), decision.media_manifest.file_sha256_lf, 'manifest file (LF) digest bound');
eq([manifest.totals.all_sha256, manifest.totals.catalog_ids_sha256, manifest.totals.video_bytes, manifest.totals.poster_bytes,
  manifest.entries.length],
  [decision.media_manifest.all_sha256, decision.media_manifest.catalog_ids_sha256, decision.media_manifest.video_bytes,
    decision.media_manifest.poster_bytes, 452], 'manifest totals bound');
eq(new Set(manifest.entries.map(e => e.catalog_id)).size, 226, 'manifest covers 226 catalog ids');
ok(manifest.entries.every(e => V.inScope(e.catalog_id)), 'manifest only contains original ids');
eq(V.MANIFEST_ALL_SHA256, manifest.totals.all_sha256, 'verifier pins the manifest digest');
ok(fs.existsSync(path.join(ROOT, decision.evidence.ten_batch_report_check)), 'ten-batch evidence document present');

// 4. Fail closed on every mutation.
const clone = () => JSON.parse(JSON.stringify(decision));
const mutations = [
  ['schema', r => { r.schema += 'x'; }],
  ['decision_id', r => { r.decision_id = 'TK504-20261114-OWNER-ORIGINAL226-MEDIA2'; }],
  ['status', r => { r.status = 'STAGED_ONLY_NOT_RELEASED'; }],
  ['scope last', r => { r.scope.last_catalog_id = 'TK-000582'; }],
  ['scope first', r => { r.scope.first_catalog_id = 'TK-000000'; }],
  ['catalog_count', r => { r.scope.catalog_count = 582; }],
  ['media_count', r => { r.scope.media_count = 1164; }],
  ['media types', r => { r.scope.media_types.push('audio'); }],
  ['manifest digest', r => { r.media_manifest.all_sha256 = '0'.repeat(64); }],
  ['manifest bytes', r => { r.media_manifest.video_bytes += 1; }],
  ['evidence', r => { r.evidence.ten_batch_summary_sha256 = '1'.repeat(64); }],
  ['utterance', r => { r.decision_utterances[0].utterance = 'akkoord'; }],
  ['excluded removed', r => { r.excluded = r.excluded.filter(x => x !== 'account_grants'); }],
  ['extra field', r => { r.release_all = true; }],
  ['date', r => { r.decision_date = '2026-11-15'; }]
];
for (const [label, mutate] of mutations) {
  const r = clone(); mutate(r);
  ok(V.released(r) === false, 'mutation rejected: ' + label);
}
for (const bad of [null, undefined, 0, '', 'x', [], [decision], {}, Object.create(null)]) {
  ok(V.released(bad) === false, 'non-record rejected: ' + JSON.stringify(bad));
}
{ const r = clone(); Object.defineProperty(r, 'schema', { get() { throw new Error('boom'); }, enumerable: true });
  ok(V.released(r) === false, 'throwing getter fails closed'); }
// Key order does not matter (canonical digest), content does.
{ const r = {}; for (const k of Object.keys(decision).reverse()) r[k] = decision[k];
  ok(V.released(r) === true, 'key order independent'); }

// 5. Verifier has no env/request/option input and the broker loads exactly this record.
const vsrc = fs.readFileSync(path.join(ROOT, 'core/tk504Original226MediaRelease.js'), 'utf8');
ok(!/process\.env|NODE_ENV|require\(['"]\.\.?\/(?!.*crypto)/.test(vsrc.replace(/require\('node:crypto'\)/, '')),
  'verifier reads no env and loads no other module');
ok(Object.isFrozen(V), 'verifier export is frozen');
const bsrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/exercise-media-v2-url.js'), 'utf8');
ok(bsrc.includes("require('../../docs/generated/MOVEKIT_V2_OWNER_ORIGINAL226_MEDIA_RELEASE_20261114.json')") &&
   bsrc.includes("require('../../core/tk504Original226MediaRelease.js')"), 'broker statically bundles record + verifier');
ok(!/tk614_original226_media_eligibility/.test(bsrc.replace(/\/\/.*$/gm, '')), 'Ed25519 eligibility gate stays unloaded');

console.log('TK504 original-226 owner media release (356 method): ' + checks +
  ' assertions PASS; pinned record ' + V.RECORD_SHA256.slice(0, 12) + '…, bound to 452-media manifest, fail-closed on ' +
  mutations.length + ' mutations');
