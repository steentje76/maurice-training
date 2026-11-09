'use strict';
/**
 * TK504/#614 -- ORIGINAL-226 PRIVATE MEDIA ELIGIBILITY GATE (server-side, pure, fail-closed).
 *
 * The single reusable question a future broker for TK-000001..TK-000226 must ask:
 *   evaluate(input) -> { authorized:false, eligible, decision:'DENY', status:404, error, blockers }
 *
 * Requirements evaluated (ALL must hold for `eligible`; `authorized` is still false):
 *  A  source-qualified original catalog selection 001..226 (no personal/custom TK-lookalike);
 *  B  the immutable 452-entry staging manifest bundled server-side, pinned by digest, plus
 *     exact path/SHA-256/bytes parity with the broker's own canonical asset;
 *     the existing 356 release gates must still be untouched (no original in released_batches);
 *  C  an owner-signed separate MEDIA release record, Ed25519-verified by the existing
 *     mediaReleaseRecordProblems (FK-only identity record is rejected there);
 *  D  an owner-signed cloud byte-integrity ATTESTATION of the live verifier report:
 *     same manifest digest, exactly 452 checks, 452 pass, 0 fail, 0 unable, exact bytes,
 *     and bound to the media record's evidence.byte_level_download_sha256_proof.
 *     The verifier's unsigned JSON is never accepted;
 *  E  a catalog publication for this item bound to the media decision + manifest, and an
 *     account-specific, active, unexpired, unrevoked grant bound to the same decision and
 *     the server-verified (non-anonymous) account id. A plain 356 grant does not qualify;
 *  F  a versioned hard cutover lock. In this shipped version it is a literal `false` and is
 *     not read from env, input or options. Enabling needs a separate reviewed code release.
 *
 * Pure: no env, no network, no clock (caller passes `now`), no DB, no signing, no keys.
 * Output contains fixed codes only: never user ids, paths, URLs or tokens.
 */
const M = require('./tk614_original226_private_media_staging.cjs');
const A = require('./tk614_original226_admin_release.cjs');
const PINNED_MANIFEST = require('../docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json');
const crypto = require('node:crypto');

const GATE_VERSION = 'tk614-original226-media-gate/1';
// (F) Hard cutover lock. Literal constant; deliberately NOT derived from any input.
const CUTOVER = Object.freeze({ version: GATE_VERSION, enabled: false });
const PINNED_MANIFEST_SHA256 = '8492f2c14521b9443db3f1c875b936cd8bddc96fbacc0837c9558c5a95738b10';
const PROJECT_REF = 'mhfxhzkdmgkaplicdszg';
const VERIFIER_REPORT_SCHEMA = 'tk504-private-storage-byte-sha-report/1.0';
const ATTESTATION_SCHEMA = 'tk504-original226-byte-integrity-attestation/1.0';
const ATTESTATION_KIND = 'OWNER_SIGNED_STORAGE_BYTE_SHA_ATTESTATION';
const ATTESTATION_DOMAIN = 'TK504-ORIGINAL226-BYTE-INTEGRITY-ATTESTATION/1\n';
const PUBLICATION_SCHEMA = 'tk614-original226-media-publication/1.0';
const GRANT_SCOPE = 'movekit_v2';
const DENY = Object.freeze({ status: 404, error: 'MEDIA_NOT_APPROVED' });

const CID = /^TK-[0-9]{6}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const HEX40 = /^[0-9a-f]{40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const PUB_REF = /^TK614-PUB226-[0-9]{8}-[0-9]{3,6}$/;
const INPUT_KEYS = ['request', 'account', 'releaseGates', 'mediaRecord', 'attestation', 'publication',
  'grant', 'expectedAsset', 'now', 'trustedKeys'];
const KIND_KEYS = ['expected', 'checked', 'pass', 'fail', 'unable', 'expected_bytes', 'verified_bytes'];
const REPORT_KEYS = ['schema', 'mode', 'project_ref', 'manifest_all_sha256', 'verdict', 'checked', 'pass',
  'fail', 'unable', 'video', 'poster'];
const ATTESTATION_KEYS = ['schema', 'kind', 'attested_by', 'attested_at', 'app_commit', 'report',
  'private_report_sha256', 'attestation_sha256', 'signature'];
const PUBLICATION_KEYS = ['schema', 'catalog_id', 'provider_id', 'status', 'publication_reference',
  'media_decision_id', 'manifest_all_sha256', 'published_at', 'revoked_at'];
const GRANT_KEYS = ['user_id', 'scope', 'active', 'expires_at', 'revoked_at', 'media_decision_id'];

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const sameKeys = (o, keys) => isObj(o) && Object.keys(o).length === keys.length && keys.every(k => own(o, k));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const num = id => Number(String(id).slice(3));

// ---------------------------------------------------------------------------
// D: owner-signed attestation over the live verifier aggregate (no failures list, no paths).
function attestationDigest(a) {
  if (!isObj(a)) throw Object.assign(new Error('ATTESTATION_SHAPE_INVALID'), { code: 'ATTESTATION_SHAPE_INVALID' });
  const rest = {};
  for (const k of Object.keys(a)) if (k !== 'attestation_sha256' && k !== 'signature') rest[k] = a[k];
  return sha(Buffer.from(A.canonicalJson(rest), 'utf8'));
}
function attestationSigningMessage(a) {
  return Buffer.concat([Buffer.from(ATTESTATION_DOMAIN, 'utf8'), Buffer.from(attestationDigest(a), 'hex')]);
}
function expectedKind(type) {
  const e = PINNED_MANIFEST.entries.filter(x => x.media_type === type);
  const bytes = e.reduce((s, x) => s + x.bytes, 0);
  return { expected: e.length, checked: e.length, pass: e.length, fail: 0, unable: 0,
    expected_bytes: bytes, verified_bytes: bytes };
}
function attestationProblems(a, trustedKeys) {
  if (!isObj(a)) return ['ORIGINAL226_BYTE_ATTESTATION_MISSING'];
  // The verifier's own unsigned report (schema tk504-private-storage-byte-sha-report) is NOT an attestation.
  if (a.schema === VERIFIER_REPORT_SCHEMA || own(a, 'authorizes_nothing'))
    return ['ORIGINAL226_BYTE_ATTESTATION_UNSIGNED_VERIFIER_REPORT'];
  if (!sameKeys(a, ATTESTATION_KEYS) || a.schema !== ATTESTATION_SCHEMA || a.kind !== ATTESTATION_KIND)
    return ['ORIGINAL226_BYTE_ATTESTATION_SHAPE_INVALID'];
  const p = new Set();
  if (typeof a.attested_by !== 'string' || a.attested_by.trim().length < 2 || a.attested_by.length > 128 ||
      !ISO_Z.test(a.attested_at || '') || !HEX40.test(a.app_commit || '') ||
      !HEX64.test(a.private_report_sha256 || '')) p.add('ORIGINAL226_BYTE_ATTESTATION_SHAPE_INVALID');
  const r = a.report, total = PINNED_MANIFEST.entries.length;
  if (!sameKeys(r, REPORT_KEYS) || r.schema !== VERIFIER_REPORT_SCHEMA || r.mode !== 'live' ||
      r.project_ref !== PROJECT_REF) p.add('ORIGINAL226_BYTE_ATTESTATION_REPORT_INVALID');
  else {
    if (r.manifest_all_sha256 !== PINNED_MANIFEST_SHA256) p.add('ORIGINAL226_BYTE_ATTESTATION_MANIFEST_MISMATCH');
    const kindsOk = ['video', 'poster'].every(t => sameKeys(r[t], KIND_KEYS) &&
      KIND_KEYS.every(k => r[t][k] === expectedKind(t)[k]));
    if (r.verdict !== 'PASS' || r.checked !== total || r.pass !== total || r.fail !== 0 || r.unable !== 0 || !kindsOk)
      p.add('ORIGINAL226_BYTE_ATTESTATION_NOT_EXACT_452_PASS');
  }
  let digest = null;
  try { digest = attestationDigest(a); } catch (_) { digest = null; }
  if (!digest || a.attestation_sha256 !== digest) p.add('ORIGINAL226_BYTE_ATTESTATION_DIGEST_MISMATCH');
  const s = a.signature;
  const trusted = trustedKeys === undefined ? A.TRUSTED_OWNER_KEY_SHA256 : trustedKeys;
  if (!sameKeys(s, ['alg', 'public_key_spki_der_base64', 'value_base64']) || s.alg !== 'ed25519' ||
      typeof s.public_key_spki_der_base64 !== 'string' || typeof s.value_base64 !== 'string') {
    p.add('ORIGINAL226_BYTE_ATTESTATION_SIGNATURE_REQUIRED');
  } else if (!Array.isArray(trusted) || !trusted.length || !trusted.every(k => HEX64.test(k))) {
    p.add('ORIGINAL226_BYTE_ATTESTATION_NO_TRUSTED_KEY');
  } else {
    const der = Buffer.from(s.public_key_spki_der_base64, 'base64');
    if (!trusted.includes(sha(der))) p.add('ORIGINAL226_BYTE_ATTESTATION_KEY_NOT_TRUSTED');
    else {
      let ok = false;
      try {
        const key = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
        ok = !!digest && key.asymmetricKeyType === 'ed25519' &&
          crypto.verify(null, attestationSigningMessage(a), key, Buffer.from(s.value_base64, 'base64'));
      } catch (_) { ok = false; }
      if (!ok) p.add('ORIGINAL226_BYTE_ATTESTATION_SIGNATURE_INVALID');
    }
  }
  return [...p];
}

// ---------------------------------------------------------------------------
function evaluate(input) {
  const b = new Set();
  // F first: this version can never authorize, whatever follows.
  if (CUTOVER.enabled !== true) b.add('ORIGINAL226_CUTOVER_LOCKED_IN_THIS_VERSION');
  if (!isObj(input)) { b.add('ORIGINAL226_INPUT_MISSING'); return result(b); }
  // Unknown fields (e.g. approved:true, released:true, an env flag) are a hard error, never a hint.
  if (Object.keys(input).some(k => !INPUT_KEYS.includes(k))) b.add('ORIGINAL226_INPUT_UNEXPECTED_FIELD');
  const { request, account, mediaRecord, attestation, publication, grant, expectedAsset } = input;
  const trustedKeys = input.trustedKeys;

  // A: source-qualified original catalog item, never a personal/custom TK-lookalike.
  let entry = null;
  const sel = isObj(request) ? request.selection : null;
  if (!sameKeys(request, ['catalog_id', 'media_type', 'selection']) || !CID.test(request.catalog_id || '') ||
      (request.media_type !== 'video' && request.media_type !== 'poster')) {
    b.add('ORIGINAL226_REQUEST_INVALID');
  } else if (num(request.catalog_id) < 1 || num(request.catalog_id) > M.ORIGINAL) {
    b.add('ORIGINAL226_NOT_IN_ORIGINAL_SCOPE');
  } else {
    entry = PINNED_MANIFEST.entries.find(x => x.catalog_id === request.catalog_id && x.media_type === request.media_type) || null;
    if (!isObj(sel) || sel._catalog !== true || sel.catalog_id !== request.catalog_id || sel.id !== request.catalog_id ||
        own(sel, 'scope') || own(sel, 'user_id') || own(sel, 'owner_id') || !isObj(sel.source) ||
        sel.source.provider !== 'movekit' || !entry || sel.source.provider_id !== entry.provider_id)
      b.add('ORIGINAL226_SOURCE_NOT_CATALOG_QUALIFIED');
  }

  // B: pinned manifest (structural + digest) and exact asset parity with the broker's canonical asset.
  const mp = M.stagingManifestProblems(PINNED_MANIFEST);
  if (mp.length || PINNED_MANIFEST.totals.all_sha256 !== PINNED_MANIFEST_SHA256 ||
      PINNED_MANIFEST.entries.length !== M.ENTRY_COUNT) b.add('ORIGINAL226_MANIFEST_PIN_INVALID');
  if (!entry || !isObj(expectedAsset) || expectedAsset.path !== entry.storage_path ||
      expectedAsset.sha256 !== entry.sha256 || expectedAsset.bytes !== entry.bytes)
    b.add('ORIGINAL226_MANIFEST_ASSET_MISMATCH');
  // The 356 media release must stay exactly as is; originals in released_batches / altered entries fail.
  let gp;
  try { gp = M.releaseGatesSeparationProblems(input.releaseGates, PINNED_MANIFEST); } catch (_) { gp = ['X']; }
  if (gp.length) b.add('ORIGINAL226_RELEASE_GATES_SEPARATION_FAILED');

  // E (identity part): server-verified, non-anonymous account.
  const uid = isObj(account) && account.verified === 'server_auth_v1_user' && account.is_anonymous === false &&
    typeof account.user_id === 'string' && UUID.test(account.user_id) ? account.user_id : null;
  if (!uid) b.add('ORIGINAL226_ACCOUNT_NOT_AUTHENTICATED');

  // C: owner-signed media release record (reuses existing validator; FK-only record rejected there).
  let rp;
  try { rp = M.mediaReleaseRecordProblems(mediaRecord, PINNED_MANIFEST, { accountUserId: uid || undefined, trustedKeys }); }
  catch (_) { rp = ['MEDIA_RECORD_SHAPE_INVALID']; }
  if (rp.includes('FK_IDENTITY_RECORD_IS_NOT_MEDIA_APPROVAL')) b.add('ORIGINAL226_FK_ONLY_RECORD_IS_NOT_MEDIA_APPROVAL');
  else if (rp.includes('MEDIA_RECORD_MISSING')) b.add('ORIGINAL226_MEDIA_RECORD_MISSING');
  else if (rp.length === 1 && rp[0] === 'MEDIA_RECORD_ACCOUNT_NOT_COVERED') b.add('ORIGINAL226_ACCOUNT_NOT_IN_MEDIA_RECORD');
  else if (rp.length) b.add('ORIGINAL226_MEDIA_RECORD_INVALID');
  const recordOk = rp.length === 0;
  const decisionId = recordOk ? mediaRecord.decision_id : null;

  // D: signed byte attestation, bound to the signed media record's evidence hash.
  const ap = attestationProblems(attestation, trustedKeys);
  for (const x of ap) b.add(x);
  if (!ap.length && !(recordOk && isObj(mediaRecord.evidence) &&
      mediaRecord.evidence.byte_level_download_sha256_proof === attestation.attestation_sha256))
    b.add('ORIGINAL226_BYTE_ATTESTATION_NOT_BOUND_TO_MEDIA_RECORD');

  // E: publication for exactly this item, bound to the same media decision and manifest.
  if (!sameKeys(publication, PUBLICATION_KEYS) || publication.schema !== PUBLICATION_SCHEMA ||
      publication.status !== 'PUBLISHED' || publication.revoked_at !== null ||
      !PUB_REF.test(publication.publication_reference || '') || !ISO_Z.test(publication.published_at || '') ||
      !request || publication.catalog_id !== request.catalog_id || !entry ||
      publication.provider_id !== entry.provider_id || publication.manifest_all_sha256 !== PINNED_MANIFEST_SHA256 ||
      !decisionId || publication.media_decision_id !== decisionId)
    b.add('ORIGINAL226_PUBLICATION_MISSING_OR_UNBOUND');

  // E: account-specific active grant bound to the media decision (a plain 356 / bulk-FK grant fails).
  const now = input.now;
  if (!sameKeys(grant, GRANT_KEYS)) b.add('ORIGINAL226_GRANT_MISSING');
  else if (!uid || grant.user_id !== uid) b.add('ORIGINAL226_GRANT_ACCOUNT_MISMATCH');
  else if (grant.scope !== GRANT_SCOPE || grant.active !== true || grant.revoked_at !== null)
    b.add('ORIGINAL226_GRANT_INACTIVE_OR_REVOKED');
  else if (grant.expires_at !== null && !(typeof grant.expires_at === 'string' && ISO_Z.test(grant.expires_at) &&
      Number.isFinite(now) && Date.parse(grant.expires_at) > now))
    b.add('ORIGINAL226_GRANT_EXPIRED');
  else if (!decisionId || grant.media_decision_id !== decisionId) b.add('ORIGINAL226_GRANT_NOT_BOUND_TO_MEDIA_DECISION');
  if (!Number.isFinite(now)) b.add('ORIGINAL226_CLOCK_MISSING');

  return result(b);
}
function result(set) {
  const blockers = [...set].sort();
  const eligible = blockers.length === 1 && blockers[0] === 'ORIGINAL226_CUTOVER_LOCKED_IN_THIS_VERSION';
  // Authorization is a literal false in this version. No branch above can change it.
  return Object.freeze({ gate: GATE_VERSION, authorized: false, eligible, decision: 'DENY',
    status: DENY.status, error: DENY.error, blockers: Object.freeze(blockers) });
}

// Broker shadow: what the live broker can supply today (no server-side record,
// attestation, publication or decision-bound grant exist). Pure, zero I/O.
function brokerShadow(catalogId, mediaType) {
  return evaluate({ request: { catalog_id: catalogId, media_type: mediaType, selection: null } });
}
// Sanitized log line: fixed codes and counts only.
function publicLog(r) {
  return { gate: GATE_VERSION, decision: 'DENY', error: DENY.error,
    blockers: isObj(r) && Array.isArray(r.blockers) ? r.blockers.filter(x => /^[A-Z0-9_]+$/.test(x)) : [] };
}

module.exports = Object.freeze({ GATE_VERSION, CUTOVER, PINNED_MANIFEST_SHA256, ATTESTATION_SCHEMA, ATTESTATION_KIND,
  ATTESTATION_DOMAIN, PUBLICATION_SCHEMA, VERIFIER_REPORT_SCHEMA, INPUT_KEYS,
  attestationDigest, attestationSigningMessage, attestationProblems, evaluate, brokerShadow, publicLog });
