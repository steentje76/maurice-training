'use strict';
// TK504/TK614 original-226: PURE server-side row projection (data-shape adapter ONLY).
// Maps ONE already server-fetched publication row / grant row into the exact shape the pure
// eligibility gate (tools/tk614_original226_media_eligibility.cjs) expects. It authorizes
// nothing: no signing, network, env, secrets, DB, writes or flags. Any doubt -> null.

const PUBLICATION_SCHEMA = 'tk614-original226-media-publication/1.0';
const PINNED_MANIFEST_SHA256 = '8492f2c14521b9443db3f1c875b936cd8bddc96fbacc0837c9558c5a95738b10';
const GRANT_SCOPE = 'movekit_v2';
const CID = /^TK-([0-9]{6})$/;
const PROVIDER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUB_REF = /^TK614-PUB226-[0-9]{8}-[0-9]{3,6}$/;
const DECISION = /^TK614-OWNER-MEDIA226-[0-9]{8}-[A-Z0-9]{2,32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(?:(Z)|([+-])(\d{2}):(\d{2}))$/;
const ISO_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const isRow = v => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;
const get = (o, k) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const str = v => typeof v === 'string' && v.length > 0;

// Strict RFC3339 -> canonical UTC 'Z'. Fraction is floored to ms (gate accepts <=3 digits;
// flooring an expiry is fail-closed). Validates calendar/time/offset before any Date math.
function canonicalUtc(v) {
  if (typeof v !== 'string') return null;
  const m = RFC3339.exec(v);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  if (y < 1 || mo < 1 || mo > 12 || h > 23 || mi > 59 || s > 59) return null;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (d < 1 || d > dim) return null;
  let off = 0;
  if (!m[8]) {
    const oh = Number(m[10]), om = Number(m[11]);
    if (oh > 23 || om > 59) return null;
    if (m[9] === '-' && oh === 0 && om === 0) return null; // RFC3339 "unknown local offset"
    off = (m[9] === '+' ? 1 : -1) * (oh * 60 + om);
  }
  const ms = m[7] ? Number((m[7] + '00').slice(0, 3)) : 0;
  const t = new Date(0);
  t.setUTCFullYear(y, mo - 1, d);
  t.setUTCHours(h, mi, s, ms);
  const utc = t.getTime() - off * 60000;
  if (!Number.isFinite(utc)) return null;
  let out = new Date(utc).toISOString();
  if (!m[7]) out = out.replace(/\.\d{3}Z$/, 'Z');
  return ISO_Z.test(out) ? out : null;
}

function publicationFromServerRow(row) {
  try {
    if (!isRow(row)) return null;
    const catalogId = get(row, 'catalog_id'), providerId = get(row, 'provider_id');
    const ref = get(row, 'publication_reference'), decision = get(row, 'media_decision_id');
    const manifest = get(row, 'manifest_all_sha256');
    const c = typeof catalogId === 'string' ? CID.exec(catalogId) : null;
    if (!c || Number(c[1]) < 1 || Number(c[1]) > 226) return null;
    if (!str(providerId) || !PROVIDER.test(providerId)) return null;
    if (get(row, 'status') !== 'published' || get(row, 'revoked_at') !== null) return null;
    if (!str(ref) || !PUB_REF.test(ref)) return null;
    if (!str(decision) || !DECISION.test(decision)) return null;
    if (manifest !== PINNED_MANIFEST_SHA256) return null;
    const publishedAt = canonicalUtc(get(row, 'published_at'));
    if (!publishedAt) return null;
    return Object.freeze({
      schema: PUBLICATION_SCHEMA, catalog_id: catalogId, provider_id: providerId, status: 'PUBLISHED',
      publication_reference: ref, media_decision_id: decision, manifest_all_sha256: manifest,
      published_at: publishedAt, revoked_at: null,
    });
  } catch (_) { return null; }
}

function grantFromServerRow(row) {
  try {
    if (!isRow(row)) return null;
    const userId = get(row, 'user_id'), decision = get(row, 'media_decision_id');
    const rawExpiry = get(row, 'expires_at');
    if (!str(userId) || !UUID.test(userId)) return null;
    if (get(row, 'scope') !== GRANT_SCOPE || get(row, 'active') !== true || get(row, 'revoked_at') !== null) return null;
    if (!str(decision) || !DECISION.test(decision)) return null;
    let expiresAt = null;
    if (rawExpiry !== null) { expiresAt = canonicalUtc(rawExpiry); if (!expiresAt) return null; }
    return Object.freeze({
      user_id: userId, scope: GRANT_SCOPE, active: true, expires_at: expiresAt, revoked_at: null,
      media_decision_id: decision,
    });
  } catch (_) { return null; }
}

module.exports = Object.freeze({ publicationFromServerRow, grantFromServerRow });
