# MoveKit integration execution — 3 November 2026

Baseline: main 160fefc2e1dabc424922e907f7dc360e4f84543f.
PR #595 remains based on recovery PR #587. No merge, app activation or APK.

## Implemented
- Collision-safe planner (a577162); Quality Gate #1624 SUCCESS.
- Staged canonical DB crosswalk, distinct movekit-v2-TK-* DB identities.
- Admin-only mapping writes; RLS; no user or server-role insert/update/delete grants.
- Ownerless-global checks, immutable DB ID, FK delete/update restrictions.
- Controlled taxonomy correction atomically invalidates mapping approval.
- Source-hash-bound classification ledger reusing staging and classification code.
  All 356 decisions need explicit item provenance; AI and HUMAN_ATTESTED are distinct.
  Neither review kind is a license authorization.
- Dedicated rollback SQL drops only crosswalk infrastructure and preserves exercises.
  Export mapping/review rows before rollback; rollback does not restore discarded mapping metadata.
- Python review regressions wired into discovery-based JS Quality Gate.

## Verification
- Live read-only: 109 exercise rows, 90 personal and 19 global; seven global TK IDs also owner-referenced.
- 582 private MP4 +582 private WebP, exact prior byte totals; no repeated uploads.
- Actual PostgreSQL 17 Docker container, network none, no published port:
  migration twice, owner and ID guards, rights, approval invalidation, unrelated personal update,
  transaction rollback and infrastructure rollback PASS (final psql exit 0); container removed.
- PGlite executes migration and rollback file: PASS.
- 17 review-ledger regressions PASS; import planner regressions PASS.
- No claim of physical Android, PM5, real-user playback or concurrency acceptance.

## Remaining before a production import/writer
- Crosswalk schema is not a complete import or runtime integration.
- Source provider_id and inventory digest must be reconciled against the pinned Golden registry.
- Admin approval writer must compare exact reviewed taxonomy revision/hash to current exercise,
  so an old review cannot reapprove a corrected taxonomy.
- Admin transactions must use consistent exercise-before-binding locking, and retry deadlocks.
- Back up actual crosswalk/review rows before rollback; exercise retention alone is not full restoration.
- Validate full existing production exercise policies and existing prefixed IDs before migration.
- Complete 356 content decisions, expand explicit vocabulary where supplier facts need it,
  preserve pending/uncertain status, and obtain necessary license/acceptance gates.
- Media grants, deployment flags, server/client integration, execution regression, joint UX and
  physical Android acceptance remain separate gates. No production migration performed.


## Additional staged approval integrity — 3 November 2026

The staged crosswalk migration now requires HUMAN (not AI) reviewer provenance,
a SHA-256 of the *current* canonical exercise taxonomy, and a fresh review
reference/timestamp for any reapproval after correction or withdrawal.
Canonical taxonomy corrections and deactivation revoke approval, and legacy IDs
cannot be renamed into the reserved movekit-v2 namespace. The fingerprint SQL
helper is SECURITY INVOKER and has no anon/authenticated/service_role EXECUTE grant.
An asserted HUMAN review is **not** proof of actual reviewer identity or a MoveKit
license/media entitlement. The private review ledger and release approvals remain
separate; this change does not make any exercise live.

Synthetic real PostgreSQL 17 tests ran in a network-isolated Docker container
with repeated migration, stale/AI review rejection, reapproval freshness,
personal/legacy guards, role privilege checks, rollback, and two original
exercise rows retained. PGlite binding regression also passed. Both tests
were local and synthetic; no hosted database migration, exercise import,
grant, deployment or APK resulted.

Still required: a privileged transactional import/approval writer with consistent
exercise-before-binding lock ordering and deadlock retry; pinned inventory
provider reconciliation; verified human approval authority; live policy
compatibility check; classification decisions; and device acceptance.
