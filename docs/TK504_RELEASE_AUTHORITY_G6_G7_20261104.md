# TK-504 / PR #598 — G6/G7 release-authority gate (2026-11-04)

Status: **report-only, fail-closed. Nothing is authorized, activated or released.**
226 published stays unchanged, 356 stay pending, no APK (#577/#582/#584 and joint UX
review still open). Uncommitted, for audit.

## What was built

| File | Purpose |
| --- | --- |
| `tools/movekit-release-authority-gate.py` | New pure module. `evaluate_release_readiness(...)`, `prepare_report(...)`, `plan_release_manifest(...)`. |
| `tools/test_movekit_release_authority_gate.py` | 44 synthetic tests (226+356 generated from the existing fixtures). |

The existing private ledger validator (`movekit-review-ledger.py`) is **unchanged**; the gate
calls it as a prerequisite and adds the stricter evidence checks on top. The two
`expectedFailure` tests in `test_movekit_independent_review_gaps.py` are **kept**: they
document that the old validator still accepts those cases.

## Fail-closed contract

* `release_authorized`, `server_grant_verified`, `production_auth_implemented`,
  `human_identity_verified`, `app_activated`, `db_writes`, `media_grants`, `catalog_mutated`
  are always `False`. Status is always `BLOCKED_NO_PRODUCTION_AUTHORITY`;
  `PRODUCTION_AUTH_CONTRACT_NOT_IMPLEMENTED` is always in the blocking flags.
* `local_checks_passed` is `True` only if every local check passes **and** an injected
  verifier accepted a structurally valid approval. That is a test seam, not a grant.
* Required inputs: full 356-entry ledger, 582 supplier rows, 226-entry catalog, 582-item
  inventory, glossary (must still be `PROPOSED_NOT_APPROVED`, `runtime_activation: false`),
  and four caller-supplied pinned hashes (`supplier`, `catalog`, `inventory`, `glossary`).
  Anything missing/malformed becomes a blocking flag; unexpected errors produce flags, never a pass.
* Ledger labels (`AI`, `HUMAN_ATTESTED`), extra keys such as `reviewed`/`localStorage`,
  an `approved: true` object, or an OWNER-DRAFT import have no effect on readiness.
  `HUMAN_ATTESTED` is counted as an unverified label only.

## Per-candidate evidence (ACCEPT entries = AI proposals for future release)

Identity: provider id must exist exactly once in the supplier rows, its record SHA must equal
the ledger SHA and the review `source_refs`, and the inventory must map it to the same
catalog id. Then the 7 classification fields:

| Field | Compared with | Blocking flag |
| --- | --- | --- |
| category, type | catalog baseline suggestion | `*_DIVERGES_FROM_UNANIMOUS_BASELINE`, `*_BASELINE_CONFLICT_NEEDS_AUTHORITY`, `*_NO_BASELINE_NEEDS_AUTHORITY` |
| primary, secondary, equipment, pattern | supplier term lists (+ glossary code / Dutch label aliases) | `*_NOT_SOURCE_BACKED_VOCAB_ONLY`, `*_SOURCE_TERM_OMITTED`, `SOURCE_FIELD_MISSING_*` |
| goals | nothing (supplier has no goals) | `GOALS_NOT_SOURCE_DERIVED` for any accepted goal |

Vocabulary membership is never counted as evidence. Training metrics are never computed or
read. Agreement with the baseline or a supplier term is a comparison, **not proof of
exercise truth**.

Flags can be cleared only by a versioned exception (`trainingskompas-classification-exception/1`)
bound to catalog id, field, SHA of the accepted value and SHA of the supplier record, with
`authority_kind: QUALIFIED_REVIEWER_DECISION_REF`, an authority ref different from the proposer,
and a rationale. This is a **structural** check; the field becomes
`EXCEPTION_STRUCTURALLY_VALID_UNVERIFIED` and a server-verified exception ref is still required.
Duplicate exceptions for one field are ambiguous and ignored.

## Approval object and verifier

Planned schema `trainingskompas-content-approval/0-planned` (exact key set; unknown keys reject):
issuer `{id, kind: SEPARATE_AUTH_SERVER}`, account `{id, role: QUALIFIED_CONTENT_REVIEWER}`,
`issued_at`/`expires_at` (max 72 h, caller-supplied `now` required), `binding`
(ledger SHA, canonical object hashes, pinned hashes) and typed `decision_refs`
(`CONTENT_DECISION` per ACCEPT, `CLASSIFICATION_EXCEPTION` per used exception, exact match).
The approver must differ from the issuer and from every ledger reviewer.

Authenticity is delegated to an optional `verifier(approval, binding_sha)` callable. It gets a
deep copy, must return exactly `{verified: True, approval_sha256, issuer_id}`, and any error
or deviation rejects. It is **an explicit server-only dependency**; no verifier is bundled
and none is invented here.

## Zero-approval report

`prepare_report(...)` takes no approval, verifier or clock. Output contains only catalog ids,
hashes, schema names, statuses and flag codes; `_assert_sanitized` raises on any string that
could be free text (names, slugs, terms, reviewer text, rationales). `plan_release_manifest(report)`
returns a planned, unsigned, `issuable: false` manifest with every candidate `BLOCKED`.

## Findings worth knowing

* `test_gap_accept_must_state_relation_to_baseline_suggestion` passes as an expected failure
  **for the wrong reason**: its fixture produces `CONFLICT_REVIEW_REQUIRED` (category `None`),
  so its own `assertEqual(suggested, "mobility")` fails before the ACCEPT path is exercised.
  The G7 test here uses a genuinely unanimous baseline and asserts the suggestion first.
  The old test was left untouched.
* Equipment/muscle comparison is limited: there is still no tracked English-supplier ->
  Dutch-app term table. Real Dutch app tags will flag as not source-backed unless they match
  the 18 glossary entries, so most real ACCEPTs need exceptions. That is intended, not a bug.

## NOT built (explicit gaps)

* No authenticated verifier, auth server, identity/role store, key management, signature or
  token format, revocation, audit log or replay protection. Approval authenticity is unproven.
* No qualified-reviewer workflow or service to author/verify exceptions.
* The pinned file hashes are caller-asserted; the pure function cannot hash files. A loader/CLI
  that reads the private stage was deliberately not added or run (no `C:\Movikit` access).
* The real 356 ledger and real 226+356 data were not evaluated; only synthetic data.
* No browser dark-launch code or UI. Tests only assert the gate has no I/O/network/DB
  capability and that `index.html` does not reference it.
* No release manifest issuance, DB/media/catalog writes, merge, APK or production activation.

## Independent actual-source verification and gate-guard correction — 4 November 2026

The preceding descriptions refer to Claude's initial synthetic-only round. ChatGPT subsequently executed the same fail-closed code read-only against the **real private 582 supplier metadata, the 226 unchanged catalog records, the 356-entry AI review ledger, and the pinned inventory/glossary**. No private data was copied into the Git repository.

Actual private report (not checked into Git):

`C:\Movikit\.tk-private-review\TK504-G6G7-PRIVATE-RELEASE-READINESS-NO-APPROVAL-20261104.json`

External loader independently compared supplier/catalog/inventory file-byte SHA256 against the ledger's pinned hashes, and evaluated the proposed glossary without relaxing its `PROPOSED_NOT_APPROVED` status. Redaction/private-output check: PASS.

**Actual result:** `BLOCKED_NO_PRODUCTION_AUTHORITY`, 245 AI-ACCEPT proposals still blocked, 111 deferred, no server auth, no release, zero data changes. The current source-tracing report shows these *flags*, not proven classification errors:

| Flag | Count |
| --- | ---: |
| `GOALS_NOT_SOURCE_DERIVED` | 245 |
| `PRIMARY_NOT_SOURCE_BACKED_VOCAB_ONLY` | 173 |
| `SECONDARY_NOT_SOURCE_BACKED_VOCAB_ONLY` | 166 |
| `PATTERN_NOT_SOURCE_BACKED_VOCAB_ONLY` | 132 |
| `CATEGORY_NO_BASELINE_NEEDS_AUTHORITY` | 83 |
| `TYPE_NO_BASELINE_NEEDS_AUTHORITY` | 83 |
| `TYPE_DIVERGES_FROM_UNANIMOUS_BASELINE` | 30 |
| `CATEGORY_DIVERGES_FROM_UNANIMOUS_BASELINE` | 10 |
| `CATEGORY_BASELINE_CONFLICT_NEEDS_AUTHORITY` | 6 |
| `TYPE_BASELINE_CONFLICT_NEEDS_AUTHORITY` | 6 |

The 173/166/132 may include false-positive traceability gaps because a reviewed English→Dutch canonical crosswalk does not yet exist. Do **not** copy them to a list of proven erroneous exercises or assume the baseline is a scientifically validated source. The count of 245 unsupported goals is likewise *supplier provenance*, not a conclusion about whether the goals are reasonable. Different flags may coexist on the same exercise. No automatic reclassification, supplier-data modification or goal creation was performed.

**G6/G7 test correction:** the original two `expectedFailure` assertions mistakenly demanded rejection by the *private proposal ledger*, whose purpose is to preserve unapproved draft AI suggestions. The G7 fixture also did not produce a unanimous baseline. They have been replaced with actual source-bound regression guards that permit a draft AI proposal to be stored but assert the **separate release-readiness gate** blocks unsupported equipment and category/type divergence. The G7 fixture now deliberately constructs a unanimously matching source baseline before checking the deviation. The existing 44 synthetic release-gate tests remain, with eight related actual input/sanitization checks.

**Still mandatory before release:** real server authorization and verified role/reviewer identity; signed, independently checked content decisions and exception provenance; controlled English→app taxonomy; semantic sport review; privacy/entitlement and media-gate checks; the P1 program logging and other reported defects; joint UX acceptance; and finally controlled APK creation. The new Python module does **not** implement any of those live services, does not activate `index.html`, and cannot approve a release.
