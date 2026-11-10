'use strict';
const assert = require('node:assert/strict');
const P = require('./tk614Original226GateRowProjection.js');

// Field lists copied verbatim from tools/tk614_original226_media_eligibility.cjs (PUBLICATION_KEYS/GRANT_KEYS).
const PUBLICATION_KEYS = ['schema', 'catalog_id', 'provider_id', 'status', 'publication_reference',
  'media_decision_id', 'manifest_all_sha256', 'published_at', 'revoked_at'];
const GRANT_KEYS = ['user_id', 'scope', 'active', 'expires_at', 'revoked_at', 'media_decision_id'];
const DEC = 'TK614-OWNER-MEDIA226-20261110-A1';
const pub = o => Object.assign({ catalog_id: 'TK-000042', provider_id: 'movekit-squat', status: 'published',
  publication_reference: 'TK614-PUB226-20261110-001', media_decision_id: DEC,
  manifest_all_sha256: '8492f2c14521b9443db3f1c875b936cd8bddc96fbacc0837c9558c5a95738b10',
  published_at: '2026-11-10T12:00:00.123456+00:00', revoked_at: null, approved: true }, o);
const grant = o => Object.assign({ user_id: '3f1c2a4b-1111-4abc-8def-0123456789ab', scope: 'movekit_v2',
  active: true, expires_at: null, revoked_at: null, media_decision_id: DEC, authorized: true }, o);

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', n, name); };

t('valid original row: +00:00 -> Z, exact gate shape, frozen', () => {
  const r = P.publicationFromServerRow(pub());
  assert.deepEqual(Object.keys(r), PUBLICATION_KEYS);
  assert.equal(r.published_at, '2026-11-10T12:00:00.123Z');
  assert.equal(r.status, 'PUBLISHED');
  assert.equal(r.schema, 'tk614-original226-media-publication/1.0');
  assert.ok(Object.isFrozen(r));
});
t('356 row (TK-000227) rejected', () => assert.equal(P.publicationFromServerRow(pub({ catalog_id: 'TK-000227' })), null));
t('null decision rejected (publication + grant)', () => {
  assert.equal(P.publicationFromServerRow(pub({ media_decision_id: null })), null);
  assert.equal(P.grantFromServerRow(grant({ media_decision_id: null })), null);
});
t('invalid manifest rejected', () => assert.equal(P.publicationFromServerRow(pub({ manifest_all_sha256: '0'.repeat(64) })), null));
t('malformed / offset-less / Feb30 timestamps rejected', () => {
  for (const ts of ['2026-11-10 12:00:00Z', '2026-11-10T12:00:00', '2026-02-30T00:00:00Z', '2026-11-10T24:00:00Z',
    '2026-11-10T12:00:00+24:00', '2026-11-10T12:00:00-00:00', '', null])
    assert.equal(P.publicationFromServerRow(pub({ published_at: ts })), null, String(ts));
});
t('non-lowercase status / revoked publication rejected', () => {
  assert.equal(P.publicationFromServerRow(pub({ status: 'PUBLISHED' })), null);
  assert.equal(P.publicationFromServerRow(pub({ status: 'revoked', revoked_at: '2026-11-10T12:00:00Z' })), null);
});
t('valid grant with null expiry: exact gate shape, frozen', () => {
  const g = P.grantFromServerRow(grant());
  assert.deepEqual(Object.keys(g), GRANT_KEYS);
  assert.equal(g.expires_at, null);
  assert.ok(Object.isFrozen(g));
});
t('grant expiry offset -> canonical Z', () =>
  assert.equal(P.grantFromServerRow(grant({ expires_at: '2026-12-31T23:30:00-02:00' })).expires_at, '2027-01-01T01:30:00Z'));
t('revoked / inactive / non-lowercase uid grant rejected', () => {
  assert.equal(P.grantFromServerRow(grant({ revoked_at: '2026-11-10T00:00:00Z' })), null);
  assert.equal(P.grantFromServerRow(grant({ active: false })), null);
  assert.equal(P.grantFromServerRow(grant({ user_id: '3F1C2A4B-1111-4ABC-8DEF-0123456789AB' })), null);
});
t('no authorization fields leak; arrays/null rejected', () => {
  assert.equal('approved' in P.publicationFromServerRow(pub()), false);
  assert.equal('authorized' in P.grantFromServerRow(grant()), false);
  assert.equal(P.publicationFromServerRow([pub()]), null);
  assert.equal(P.grantFromServerRow(null), null);
});
console.log(`PASS ${n}/${n}`);
