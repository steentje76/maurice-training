# TK504 / TK614 — Original-226 broker fail-closed integration contract (design only)

Status: **DESIGN ONLY, AUTHORIZES NOTHING.** No code, SQL, DB, flag or release change is implied.
Reviewed sources (only): `tools/tk614_original226_media_eligibility.cjs` (EG),
`tools/tk614_original226_private_media_staging.cjs` (ST), `netlify/functions/exercise-media-v2-url.js` (BR),
`supabase/migrations/20261110005605_tk614_original226_media_publication_binding_stage.sql` (MIG, staged, not applied).

## 1. Invariants that MUST survive any future integration
| # | Invariant | Anchor |
|---|---|---|
| I1 | `TK-000001..226` → unconditional `404 MEDIA_NOT_APPROVED` before poster flag, auth, grant lookup, signing | BR:267-269 |
| I2 | `CUTOVER = {version:'tk614-original226-media-gate/1', enabled:false}` literal; `ST.MEDIA_CUTOVER_ENABLED=false`; `authorized:false` literal | EG:45,152,237; ST:73 |
| I3 | 356 path unchanged: `227..582` needs `MOVEKIT_V2_NEW_CATALOG_EXECUTION_VERIFIED` + `ledger.releasedScope` prefix; MIG forces all four new publication columns NULL for 227..582 | BR:247-258; MIG §3 |
| I4 | Grant row identity stays `PK(user_id, scope)`, `scope='movekit_v2'`; broker reads `limit 2`, requires exactly one row; no second row, no new scope, no new table | BR:156-173; MIG header |
| I5 | Existing 452 original rows in `release.entries` and the FK identity record are **never** a media decision | BR:259-263; ST:13-15,201-244 |
| I6 | Trust anchor = `EG.OWNER_KEYS` (frozen snapshot of `A.TRUSTED_OWNER_KEY_SHA256`); no input/env/option may add keys | EG:57,126 |
| I7 | Any thrown error, missing field, unknown field or backend failure → DENY `404 MEDIA_NOT_APPROVED` (or existing 401/403/503 codes); logs via `EG.publicLog` only | EG:54,155,242 |

Lifting I1/I2 is out of scope here and requires a separate owner-approved, reviewed code release.

## 2. Format checks vs. authorization (never conflate)
**Format only — necessary, never sufficient:**
- MIG `tk614_media_grants_decision_format` / publication regexes (`TK614-OWNER-MEDIA226-YYYYMMDD-…`,
  `TK614-PUB226-YYYYMMDD-NNN`), pinned `manifest_all_sha256 = 8492f2c1…8b10`, status/revoked_at CHECK branches.
- EG/ST shape checks: `sameKeys`, `CID`, `UUID`, `HEX64`, `ISO_Z`, decision regex, evidence hashes distinct/non-repeating.
- A `media_decision_id` value present on a grant or publication row (MIG comments: "Not an authorization by itself").

**Authorization evidence — each verified server-side, all required, AND-ed:**
1. Ed25519 signature on owner media record (domain `TK614-ORIGINAL226-MEDIA-RELEASE/1\n`) by a key in I6.
2. Ed25519 signature on byte attestation (domain `TK504-ORIGINAL226-BYTE-INTEGRITY-ATTESTATION/1\n`) by a key in I6.
3. The attestation digest is bound to the signed media record evidence hash. The decision ID is equal only between signed media record, publication and grant; attestation has no decision-ID field.
4. Server-derived identity (`identifyUser`), never a request field.
5. I1 + I2 lifted by reviewed release. Until then steps 1–4 can at most yield `eligible:true`, never access.

## 3. Exact contract per gate (future broker, after auth, before signing)
Order: I1 hardlock (today: terminal) → body/CID → `identifyUser` → grant read → evidence reads → `EG.evaluate` →
`descriptor` → sign → **re-read grant AND publication and re-evaluate** → respond. Any non-empty blocker set other than
the cutover blocker = DENY; while I2 holds, everything = DENY.

### 3.1 Owner-signed MEDIA226 decision (C)
- Exact keys `MEDIA_RECORD_KEYS`; `schema='tk614-original226-media-release-record/1.0'`, `kind='OWNER_SIGNED_ORIGINAL226_MEDIA_RELEASE'`.
- `record_sha256 == sha256(canonicalJson(record \ {record_sha256, signature}))`; signature verified per §2.1.
- `record.manifest` canonically equals `mediaRecordManifestBinding(PINNED_MANIFEST)` (all_sha256, 452 entries, id/provider digests).
- `grant.scope='movekit_v2'`, 1..50 unique UUIDs, and **includes the server-verified uid**.
- FK identity record (`binding_kind`/`media_grants`/FK schema) → `ORIGINAL226_FK_ONLY_RECORD_IS_NOT_MEDIA_APPROVAL`.

### 3.2 452 verified cloud body SHA attestation (D)
- Exact `ATTESTATION_KEYS`; schema `tk504-original226-byte-integrity-attestation/1.0`, kind `OWNER_SIGNED_STORAGE_BYTE_SHA_ATTESTATION`.
- Embedded report: `mode='live'`, `project_ref='mhfxhzkdmgkaplicdszg'`, pinned manifest digest, `verdict='PASS'`,
  `checked=pass=452`, `fail=unable=0`, per-kind counts and bytes equal to `expectedKind(video|poster)`.
- Unsigned verifier report (`tk504-private-storage-byte-sha-report/1.0` or `authorizes_nothing`) is rejected.
- Binding: `attestation.attestation_sha256 == mediaRecord.evidence.byte_level_download_sha256_proof`.

### 3.3 Exercise FK + publication status (E)
- Exactly one publication row for `catalog_id` (1..226), `provider_id` == manifest entry, `status` published,
  `revoked_at IS NULL`, `publication_reference` matches, `manifest_all_sha256` == pin,
  `media_decision_id == mediaRecord.decision_id`.
- Requested `catalog_id/media_type` must resolve to exactly one pinned manifest entry whose path/sha256/bytes equal
  BR's canonical `byId`/`postersById` asset (`expectedAsset`), and selection must be `_catalog:true`, provider `movekit`.
- `releaseGatesSeparationProblems(release)` must be `[]` (452 originals + 712 newer, no source drift; 356 untouched).

### 3.4 Single existing user grant decision binding (E)
- The one row from I4: `user_id == uid`, `scope='movekit_v2'`, `active=true`, `revoked_at IS NULL`,
  `expires_at` NULL or > `now`, **`media_decision_id == mediaRecord.decision_id`**.
- A plain 356 grant (`media_decision_id IS NULL`) yields `ORIGINAL226_GRANT_NOT_BOUND_TO_MEDIA_DECISION`.
- Consequence of PK(user_id,scope): one user ⇒ at most one active media226 decision at a time. Accepted, not widened.
- Post-sign re-check MUST compare `media_decision_id` too (today's recheck reads only active/expiry/revoked).

### 3.5 Identity
- `account = {verified:'server_auth_v1_user', is_anonymous:false, user_id:uid}` built only by the broker from `/auth/v1/user`.

## 4. Blockers (unresolved; no evidence invented)
| ID | Blocker | Effect |
|---|---|---|
| B1 | No owner-signed media record and no signed 452 attestation exist in reviewed sources (`owner_signed_media_release_record:'NONE'`). | Cannot be eligible. |
| B2 | Storage location/provenance of record + attestation for the broker is unspecified ("server-only, trusted provenance" only). BR bundles JSON via static `require`. | Must be decided before integration. |
| B3 | Status vocabulary mismatch: SQL stores lowercase `published` whereas EG requires uppercase `PUBLISHED`. EG also needs a server-derived `schema` literal; the original publication table already contains `provider_id` and `published_at`. | Define exact server-only projection and verified timestamp normalization before broker integration. |
| B4 | Timestamp format: EG requires `ISO_Z` (`…Z`) for `expires_at`/`published_at`; PostgREST timestamptz typically serializes `+00:00`. Unverified. | Fails closed (deny) unless normalized by reviewed code. |
| B5 | `identifyUser` returns only `id`; no `is_anonymous` check exists in BR. | Must be added before EG's account object can be honestly built. |
| B6 | BR grant `select` omits `media_decision_id`; MIG column not applied (staged only). | Binding cannot be read today. |
| B7 | Exercise FK binding: MIG references `tk504_catalog_publication_guard` / `tk504_publication_review_gate` (not reviewed here); EG does not check exercise FK directly. Uniqueness of publication per `catalog_id` not verified. | FK linkage + one-row rule must be confirmed from schema before integration. |
| B8 | Two independent hard switches (EG `CUTOVER`, ST `MEDIA_CUTOVER_ENABLED`) plus BR I1. | All three must be addressed together in one reviewed release; none via env. |

## 5. Explicit non-goals
No change to I1, I2, I3, I4. No grants/rows/policies. No env-flag path to originals. No reuse of `release.entries`
(452 original metadata rows) or FK approval as media authorization. This document is not a release decision.
