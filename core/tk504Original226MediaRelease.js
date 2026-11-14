'use strict';
// TK504 — owner media release for the ORIGINAL 226 MoveKit items (TK-000001..TK-000226).
//
// Same method as the 356 (TK504-20261105-OWNER-BATCHES-01-15): an explicit owner
// decision is recorded once in docs/generated/ and its exact content is pinned here.
// The V2 broker signs original-226 media only when this verifier accepts the record;
// authentication, the active movekit_v2 grant, the per-file descriptor check and the
// 60-second signed URL stay exactly the same as for the 356.
//
// It never grants anything by itself: no env variable, request field or option can
// change the outcome. A different decision requires a reviewed code change of the
// pinned digest below.
const crypto = require('node:crypto');

const DECISION_ID = 'TK504-20261114-OWNER-ORIGINAL226-MEDIA';
const SCHEMA = 'trainingskompas-movekit-v2-owner-original226-media-release/1.0';
const STATUS = 'OWNER_EXPLICIT_MEDIA_RELEASE';
const MANIFEST_ALL_SHA256 = '8492f2c14521b9443db3f1c875b936cd8bddc96fbacc0837c9558c5a95738b10';
// SHA-256 of the canonical (key-sorted) JSON of the decision record.
const RECORD_SHA256 = 'f1558675f46b3609f9d252477e22a81583fe72d4aa296c836c7ef2116e0f41a9';
const FIRST = 1, LAST = 226;

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function recordSha256(record) {
  return crypto.createHash('sha256').update(canonical(record), 'utf8').digest('hex');
}
// True only for the exact pinned owner decision record.
function released(record) {
  try {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
    const s = record.scope, m = record.media_manifest;
    if (record.schema !== SCHEMA || record.decision_id !== DECISION_ID || record.status !== STATUS) return false;
    if (!s || s.first_catalog_id !== 'TK-000001' || s.last_catalog_id !== 'TK-000226' ||
        s.catalog_count !== 226 || s.media_count !== 452) return false;
    if (!m || m.all_sha256 !== MANIFEST_ALL_SHA256) return false;
    return recordSha256(record) === RECORD_SHA256;
  } catch (_) { return false; }
}
function inScope(catalogId) {
  if (typeof catalogId !== 'string' || !/^TK-[0-9]{6}$/.test(catalogId)) return false;
  const n = Number(catalogId.slice(3));
  return n >= FIRST && n <= LAST;
}

module.exports = Object.freeze({
  DECISION_ID, SCHEMA, STATUS, MANIFEST_ALL_SHA256, RECORD_SHA256,
  canonical, recordSha256, released, inScope
});
