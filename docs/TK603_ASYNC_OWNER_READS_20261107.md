# TK603 personal reads and coach continuations — 7 November 2026

Development only, stacked Draft #606 above #605 → #604 → #602. All release flags remain OFF. No merge or deployment approval.

## Behavior

Personal stats, PR timeline, training previous-performance reads and coach history now explicitly restrict the authenticated owner in the server query before result limits. Authorized coach visibility is not a personal-history source. Defense-in-depth filtering removes explicit foreign/null user IDs while retaining narrow projections that omit user_id. Legacy personal exercise IDs and verified typed catalog FKs remain separate.

Read continuations capture UID plus a login/logout/cache-reset generation. Same-user token refresh preserves work in progress; logout and A → B → A invalidate previous work. The generation is bumped by the actual auth lifecycle and the personal-cache wipe, with early script initialization preserving any prior bump.

Coach requests capture owner, conversation and history. Every asynchronous phase checks that context before rendering, changing history or sending another request; old requests cannot unlock a newer request. Consent is checked against its original owner. General history loading is shared with an immediate send, so auto-entry questions wait for and retain history instead of losing their replies. General and session clearing both check after confirmation, reads and each delete. The original AI output validation and sanitized storage remain in use.

Strength-basis, exercise-session, catalog-discovery, relationship and recovery source queries also restrict owner before limits. Relationship continuations stop after account changes. Recovery cache writes are fenced and the cache is cleared with personal account state. Calculation and Decision Engine formulas are unchanged.

## Verification

- `node core/tk603AsyncReadAndCoachOwner.test.js`: 57 actual-function assertions PASS, with synthetic storage/DOM/HTTP adapters and the real strength selector. Includes actual auth lifecycle, same-user refresh, A → B → A, delayed reads, progress caches, normal prefetch, legacy and typed-FK source queries, recovery source/cache, consent, seven send phases, overlapping account requests, pending general-history plus immediate send, clearing and output sanitization. Both legacy and typed Rep-PR cache writes also reject a prior login generation before replacing or deleting a fresh cache.
- Existing source-reader, AI-output, multisport, HRV single-writer, week ownership and private-media tests retain their contracts. Static harness adjustments account for the bounded read adapter and complete function bodies; the HRV suite still rejects arbitrary/writer adapters.
- Real isolated GoTrue/PostgREST/PostgreSQL captured-schema runner: 66/66 PASS and dedicated Docker cleanup PASS. Under a real B coach JWT authorized to view A, the actual personal-reader adapter performs a successful date-only SELECT with an explicit B predicate and returns no A rows. The actual writer lost-ACK/idempotent replay probe still passes. Final run completed 2026-11-07T11:25:10.966Z with index.html SHA256 26cca2def281a01dcab7cf600e741c5d3a5c0411bbba120f14773f1d82112db7, unchanged during the probe. See TK603_REAL_AUTH_CAPTURED_SCHEMA_20261107.md for schema fidelity and harness limits.
- Full Windows gate after the account/read fixes: 497 executed, 1 skipped, 16 failed; exactly the same failing test names as baseline 496/1/16. The final rerun after the Rep-PR generation refinement is recorded in the PR. Build and diff-check PASS.
- Independent read-only review confirmed all earlier P1/P2 findings fixed and no engine rule changes. Its small Rep-PR cache generation finding was fixed with two extra tests; the final narrow read-only review confirmed commit readiness and no weakened pre-existing assertions. Superseded pending-send UX, multi-tab lifecycle and program-progress scoping remain explicitly deferred below. The known 16 baseline failures remain release blockers; passing focused tests is not a waiver.

## Remaining acceptance

This is extracted-function and isolated local database evidence. Full browser/WebView navigation, multi-tab coordination, real Android process kills, actual cloud Auth/Storage, protected-media Range/expiry behavior, complete production schema/provisioning/rollback parity and licensed publication acceptance remain open. Request budgets, autosave before Save and durable legacy-personal UUID recovery remain open. No APK created. Catalog remains 226 existing plus 356 NOT_PUBLISHED; no new media-byte audit.

Explicitly deferred review items: a superseded pending-history send can lose its queued input without feedback; multi-tab auth replacement still needs a unified cache lifecycle; computeProgramProgress still relies on owner-scoped program blocks rather than adding its own user predicate. Untested nested renderer paths and real navigation remain acceptance work.
