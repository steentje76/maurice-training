# TK603 frontend integration — 7 November 2026

Status: development only; draft stacked above #605 → #604 → #602. No merge or release.

The previously uncommitted implementation was copied from the inactive implementation worktree into an isolated worktree based on 07a46a8296c8689104b9a79a23f49ac41d1a5545. Original worktree retained without modification.

## Product behavior

- Explicit source references flow into owner-keyed Rep-PR/strength caches and existing progress, chart and coach views; personal TK and verified catalog TKC performances remain separate.
- Owner changes discard session-reader responses, invalidate personal and catalog performance caches and active training memory.
- Normal and Guided save continuations check the captured owner and active session before changing state after awaits.
- Drafts preserve execution provenance and owner; typed row UUIDs are persisted before POST so restart/retry can retain identity.
- Guided replacement uses the existing canonical resolver and the existing readiness adjustment.
- Personal exercise-goal PR writes are omitted for catalog-bound executions.
- Additional regression reproduced a pending personal goal INSERT populating the next account's map. Owner/map checks now fence INSERT/PATCH cache mutations; both legacy and typed charts discard stale responses before calculations and rendering.

## Verification and limits

62 focused test files passed, including original app functions evaluated with synthetic fixtures. The extra legacy owner-fence test first failed on the pending INSERT, then passed all five assertions after the fix. Web asset build passed. These are not full browser or Android acceptance.

The existing full Windows baseline ran 484 checks, 1 skipped, 17 failed. The initial integration snapshot ran 493 checks, 1 skipped, 16 failed, with no new failing core test names. Full Windows release acceptance remains RED; the comparison does not waive failures.

The captured-schema GoTrue/PostgREST/PostgreSQL runner was rerun on this worktree: 53/53 passed, cleanup confirmed. Dependency schemas and portions of schema fidelity remain synthetic as specified in #605. The runner still supplies its synthetic date, so this does not prove actual UI writer payload or complete production parity.

Independent review and exact-head GitHub Quality Gate are recorded in the PR once available. Never interpret a draft or successful subset as production approval.

## Open release gates

- Scope-trigger proposal remains local-only; reviewed complete migration/provisioning and rollback are still required.
- Complete UI-writer/schema parity, real cloud Auth/Storage and Android/WebView/media/Range/expiry acceptance.
- Further async account-fence audit (including coach request caller and other legacy loaders); program-definition source references and remaining pre-Save/legacy loose-exercise restart. Typed pending registration durability is implemented in TK603_LOOSE_DURABLE_RESTART_20261107.md.
- Full historical read behavior after entitlement revocation requires verification; no personal-history fallback is permitted.
- Licensed content/publication/entitlement approval and protected media cutover; legacy public media is intentionally retained until replacement is proven.
- Earlier #577/#582/#584/#586 findings and owner-led mobile UX review before any new APK.

No changes to production/main, real entitlements, sporter data, publication or release flags. Catalog remains 226 existing plus 356 NOT_PUBLISHED; 582 videos/582 posters are historical inventory evidence, not a new byte audit. No acceptance deployment or APK created.

## Independent review follow-up

Claude performed a read-only review of the isolated frontend diff and modified test harnesses. It found no weakened assertions and no blockers with release flags OFF. It identified an all-catalog coach fallback and a custom-resume owner check after state reset. Both are now fixed: an explicitly empty personal-ID set makes no personal-history request, and custom resume verifies ownership before reset and after asynchronous loading. A new actual-function regression covers empty/mixed/legacy coach requests and account changes during confirmation, exercise loading and equipment loading (12 assertions PASS). The personal PR persistence test now reads the whole helper rather than a truncated 1600-character window; its 39 assertions pass unchanged.

Other reviewer findings remain open: typed loose-exercise UUID/durable pending recovery has since been implemented (see TK603_LOOSE_DURABLE_RESTART_20261107.md); legacy personal UUID/pre-Save recovery remains open; legacy pre-fix normal drafts have no resolved provenance; stats discovery may create hundreds of requests; legacy stats/timeline/previous-performance readers still need owner fences. This draft does not approve enabling any flag.

## Personal-read and coach follow-up

The later development increment in TK603_ASYNC_OWNER_READS_20261107.md addresses the listed stats/timeline/previous-performance/coach owner fences and underlying source query limits, including same-user token refresh, general-history auto-entry, deletion continuations and recovery caches. This supersedes those specific earlier open items; it does not close the full browser, multi-tab or production gates.
