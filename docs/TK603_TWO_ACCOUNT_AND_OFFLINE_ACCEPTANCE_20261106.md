# TK #602/#603 — two-owner security + offline/idempotency acceptance (6 November 2026)

**Status: VERIFIED IN ISOLATED LAB; PRODUCTION RELEASE STILL BLOCKED.**

## Baseline
- Canonical code: `steentje76/maurice-training`; Draft PR #604 stacked onto Draft PR #602.
- No merge to `main`, no production Supabase migration/activation, no signed-media release, no APK.
- Real app `TK504_TYPED_FK_SESSION_RELEASE=false`; 356 newly reviewed exercises are **not published**.
- Docker experiments use only synthetic UUIDs and vendor IDs and an ephemeral PostgreSQL 17 container with `--network none`, no exposed ports. Final SQL line is `ROLLBACK;`; container is deleted.

## What was actually executed
Run on developer Windows desktop:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\tk603-local-two-account-db-proof.ps1
```

Observed: **PASS** — 582 reserved aliases/bindings, default inactive, RLS permission denial for anon/authenticated, service role SELECT-only, exact provider ID validation, deliberately permissive legacy exercises INSERT policies defeated by reserved-alias guard, privileged definer bypass attempts refused, A and B owning separate sessions, cross-user session write denied, historical catalog IDs preserved after revoke, unreviewed/revoked catalog writes rejected, complete `ROLLBACK` followed by zero remaining `auth` tables.

**Evidence limitations:** The two users are synthetic simulated JWT claim contexts using PostgreSQL role switching and `auth.uid()` in a temporary database; this is a real PostgreSQL/RLS test, **not** a test with two independently signed Supabase Auth JWTs against the actual deployed PostgREST/session schema. This cannot substitute for the latter.

## Client real-code failure + repair
1. Actual `sbPostQ()` formerly converted a transient network error **after** a successful `tk504VerifySessionBinding()` into a queued `TKC-` session and a false success. New code sets `confirmedOnly` when `opts.tk504_binding` exists: such rows can be **confirmed online or rejected as failed**, never queued for later replay. Owner is rechecked after asynchronous dependency checks and when a response arrives. Personal/legacy session queue behavior is unchanged.
2. Actual `saveLosOefening()` and both branches of `finishSession()` now reuse one UUID stored on the existing `sessionLog` entry **only** for explicit typed binding sessions. Retrying a lost-acknowledgement request uses the same UUID instead of producing a second session ID. If a valid UUID generator is unavailable, the typed path fails closed. The existing canonical sessions writer remains the only writer.
3. No new calculation, AI rule, exercise library, offline queue or exercise FK-shadow writer was introduced.

## Repeatable regression evidence
- `node core/tk603ConfirmedOnlySessionWrite.test.js`: 14 actual-code checks including offline, dependency FIFO, lost response, 500, 403, owner switch and unmodified legacy queue.
- `node core/tk603LooseExerciseTypedSession.test.js`: 34 actual-code checks, source spoof denial, online typed writing, offline denial, account switch, legacy preservation, retry stable UUID.
- `node core/tk603StableSessionUuid.test.js`: 11 actual-code checks, one UUID per workout across retries, malformed/generator-unavailable refusal, wiring in normal strength/cardio/loose routes.
- Existing typed-FK session writer, original picker, Catalog/History, Concept2, builder and full GitHub Quality Gate must remain green for any merge.

## Gates still REQUIRED before production
1. End-to-end **real Supabase Auth / PostgREST** test with 2 isolated test users: two signed JWTs, actual RLS/ownership/role restrictions, unauthorized insert/update/delete, RPC replay/expiry/revocation, migration backup/rollback.
2. Confirm the live production session schema supports idempotent `resolution=merge-duplicates` on a repeated, same-ID session POST **under RLS**, including an HTTP acknowledgement lost after COMMIT (without exposing existing athlete data).
3. Real Android/WebView offline/online transitions, application restart, local draft restoration and account switching with a pending typed session. Strong evidence needed that no stale catalog FK or provider/media entitlement survives a switch.
4. End-to-end signed video+poster, content entitlement, token expiry, media Range and controlled legacy public-content cutover from PR #602.
5. Independent code/security review, owner product decision, UX acceptance and only then a new APK.

**Decision:** PR #604 stays Draft, #603 open. Do not apply staged schema or enable release flags without separate explicit production authorization.
