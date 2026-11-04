# TK504 — MoveKit shadow-row gate (2026-11-04)

Status: UNCOMMITTED, UNPUSHED, for independent review. Branch `feat/tk504-owner-review-terms-20261103`, base HEAD `1616b17`.

## Invariant

`ensureExerciseRowStatus(exId)` (index.html, ~line 17870) is the single choke point that decides whether a
catalog-only exercise gets an FK-compat "shadow" row in `exercises` and whether a session write may follow
(`ensureSessionExerciseRows` -> `tkSessieOptsVoor`, and Guided `logSet`/finish at ~38578 via `exStatus==='rejected'`).

**Before any `exercises.some()` shortcut and before any `sbPostQ` write, return `'rejected'` when:**
1. the ECS record carries `_review`, or `identity.category === 'pending_review'` (any id, TK or not); or
2. the id starts with `TK-` and the ECS record is not a complete published MoveKit record:
   `catalog_id === exId`, `identity` present, `source.provider === 'movekit'`, `source.provider_id` present.
   Unknown/malformed TK-prefixed ids are never reinterpreted as legacy/custom.

Consequence: a pre-existing shadow row for a pending/unknown TK id no longer yields `'exists'`; callers already
treat `'rejected'` as "no session write" (`tkSessieOptsVoor` throws `exercise_row_rejected`; Guided marks `_save='failed'`).

Unchanged: the 226 published ids (verified: all carry source.provider=movekit + provider_id, none pending), legacy
non-TK ids (Supabase `exercises.id` TEXT, personal/global rows), empty id -> `'exists'`, queued/confirmed/failed paths,
account history, favorites, default UI. ECS throwing still fails closed (`'failed'`, no write).

## Changes (uncommitted)
- `index.html`: +8/-2 in `ensureExerciseRowStatus` (catalog lookup moved first; two early-reject lines; CRLF preserved).
- `core/tk504ShadowRowGate.test.js` (new): extracts the REAL functions (`ensureExerciseRowStatus`, `tkSessieSchrijfOpts`,
  `tkSessieOptsVoor`, `ensureSessionExerciseRows`) from index.html; mocks ECS/exercises/sbPostQ; real 226-record catalog parsed from EX_CATALOG.
- `core/f91ShadowRow.test.js`: fixture TK-000105 gained `source{provider:'movekit',provider_id}` (mock was not a complete catalog record).

## Tests (Node, no Supabase)
- `tk504ShadowRowGate`: 52 passed, 0 failed (226 published confirmed with exactly 1 write each; queued passthrough; legacy/custom/personal/empty unchanged;
  unknown TK, malformed TK, pending `_review`, pending category, missing source/provider_id/identity, unknown provider, catalog_id mismatch — all rejected with 0 writes, also with stale shadow row; session veto contract; ECS-throws).
- Related existing: f91ShadowRow 17/0, fGuidedIntegrationAvoidSave 8/0, fOfflineExerciseSessionSync 10/0, fTk584ProgramLogging PASS, movekitV2TrainingGateContract 13 checks exit 0.
- Not runnable here: `fConcept2FinalizeLifecycle` (needs `docs/db/sessions.columns.json`, absent in this worktree checkout — environmental, not caused by this change).
- Not run: full suite, Android build/APK, staging/prod, Netlify.

## Remaining blockers
- **Server-side authorization is absent.** This is client defense-in-depth only; a modified client can still POST `exercises`/`sessions` rows with a pending id. Needs DB/RLS/RPC check against a server-side published-catalog allowlist.
- `movekitV2TrainingGateContract` still documents "no V2 gate yet" for the central route; other writers/readers (e.g. `buildResolvedExecutionItems`, `logSet` direct callers) not gated by this change; `buildResolvedExecutionItems` still falls back to legacy path for unknown TK (display only).
- Formal publication approval of the 356 candidates, grants, media activation: not done and not touched.
- Open app bugs #577/#579/#582/#584/#586 are NOT claimed fixed; no end-to-end test was run.
- Remaining line-ending note: index.html has mixed CRLF/LF; edits must be byte-preserving.

## Independent ChatGPT review (4 November 2026)

- Restored original **legacy existing-row** fast path: non-TK owned/legacy IDs already present in `exercises` return `exists` *without requiring a catalog lookup*, even if the catalog service is unavailable. Canonical TK-prefixed IDs are always validated against the source before the existing-row shortcut. Pending, missing or source-mismatched TK catalog records are rejected before any shadow-row write.
- Added two synthetic assertions covering the legacy-catalog-unavailable case. The REAL extracted functions from `index.html` now pass **54/54** shadow-row assertions, versus 52 before review. Existing `f91ShadowRow` **17/17**, `fGuidedIntegrationAvoidSave` **8/8** (Chromium-dependent segment skipped in that suite), `fOfflineExerciseSessionSync` **10/10** (Chromium-dependent segment skipped), `fTk584ProgramLogging` targeted contract PASS. These tests do NOT constitute the complete Android/account acceptance of issue #584.
- Byte-level `index.html` patch preserved all pre-existing file line endings, normalizing only inserted lines, to avoid mass changes in the 5 MB HTML file. The changed F91 test fixture line was restored to LF. Independent `git diff --check` is clean.
- The only safe protection here is client-side denial; real server/RLS authorization, formal taxonomy/metadata approval, media rights and release gates remain mandatory. No live account or production database writes occurred.
