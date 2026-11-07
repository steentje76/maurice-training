# TK603 — production schema contract preflight

Status: **PRODUCTION RELEASE BLOCKED — exact full-stack parity remains open.** Evidence captured read-only from project `mhfxhzkdmgkaplicdszg` at the timestamp in `docs/generated/TK603_SCHEMA_CONTRACT_20261107.json` (2026-11-06 22:53 UTC / 23:53 Netherlands). No application rows, personal identities, account credentials or tokens were queried. No production function, trigger, policy, table, data or flag was changed.

## Exact evidence

The JSON records 21 `exercises` columns, 39 `sessions` columns, defaults/nullability, 10 constraints, 6 RLS policies, indexes, role grants, incoming FKs and trigger metadata. It includes exact `pg_get_functiondef` output for `set_exercise_scope_context`, `set_user_id_from_auth` and `coach_has_scope`, with SHA-256 per function.

- Original `set_exercise_scope_context` definition SHA-256: `aec91b07589aa1c6b4451067d0db3380e416e44548207a93334a81399954034b`.
- Original `set_user_id_from_auth`: `22d0c3dd2070ea2037d02ba9690b5f02c3462306303e1d86093768b3cdcd8b8d`.
- Original `coach_has_scope`: `722614b3e243b7df0b5a3a4e4023ffe6d772704842281f948db0974e896db756`.
- JSON bytes SHA-256 at capture: `86c3347b26d1d8ece77e2b84af540ba60fc31e8dfc77187e2befb08daac355d7`.

## Proven incompatibility and test-fixture gaps

| Area | Captured production behavior | Existing minimal acceptance fixture | Consequence |
|---|---|---|---|
| Global exercise INSERT | `trg_set_exercise_scope_context` requires a user gym role >=3, and writes `created_by=auth.uid()` | Trigger absent | Trusted postgres/no-auth cannot provision unowned global TKC aliases. Authenticated owner also conflicts with staged reserved-alias guard. |
| Session SELECT | Own-data policy OR `coach_reads_training_core_sessions`, using active relationship/scope | Own-data policy only | Valid RLS responses can contain another athlete's sessions. Own-athlete analytics require explicit query/response owner filtering; this is intentional coach authorization, not a policy failure. |
| Session INSERT ownership | `trg_set_user_id` overwrites submitted user_id with current auth.uid() when authenticated | Trigger absent | A forged foreign user_id POST may succeed as the caller's own row. Test persisted ownership, not only HTTP rejection. |
| Session schema | date NOT NULL; edit_revision NOT NULL default0; user_id nullable; many activity/erg fields | id/user_id/exercise_id/note only, user_id NOT NULL | The minimal fixture cannot prove writer payload/schema compatibility. Missing date fails real schema before intended assertions. |
| Constraints | exercises creator FK to auth.users; sessions duration/protocol/watt-source checks; training-instance FK | Mostly absent | More realistic INSERT/UPDATE payload, cross-FK and rollback tests required. |
| Exercise SELECT | Global, gym, own and content-share rules | Global/own only | Fixture omits legitimate shared visibility and role paths. |
| Reference graph | exercises referenced by sessions/training_exercises/program_block_exercises/favorites/goals/exercise_goals/race_segments; sessions by activities | Mostly absent | Rename/delete rollback cannot be inferred from minimal tables. Existing IDs/history must remain unchanged. |

## Actual isolated RED → GREEN proof

Command: `node tools/tk603-scope-trigger-parity-proof.cjs`.

The runner verifies the captured scope function digest, builds both target tables with their exact captured columns/defaults/constraints, installs the two original trigger functions/triggers and six original RLS policies plus the original coach-scope function, and applies the unchanged staged migration `20261106110000_tk504_typed_catalog_fk_stage.sql` in **real PostgreSQL 17**, Docker `--network none`, no exposed port. Supporting tables contain synthetic minimal dependency columns, not a full production schema clone. No real Supabase JWT/PostgREST path is claimed for this proof.

- **RED reproduced:** the unchanged production scope trigger rejects trusted admin INSERT of an otherwise valid unowned `TKC-000038` global alias. The expected rejection is caught; no row persists.
- **GREEN proposal only:** prepend one narrow branch to the captured scope function: reserved `TKC-000001..582`, current_user postgres, no auth.uid, no authenticated/anon/service role claim, scope global, all owner/gym fields NULL. Only that branch returns before existing user-specific scope logic. Existing staged guard remains enabled. No trigger is disabled.
- 582 synthetic unowned aliases then provision successfully. Non-reserved legacy admin global and `TKC-000583` remain rejected. Authenticated reserved writes and a definer-like client role claim remain denied.
- Original personal ownership/gym clearing, gym-owner gym/global behavior, and session INSERT owner rewriting remain intact.
- Original coach SELECT policy is reproduced: the synthetic coach can read the coached athlete's session, while `user_id=auth.uid()` returns only own rows and excludes it.
- **PASS:** full transaction ROLLBACK, zero remaining auth schema, temporary no-network container removed. Scope-specific whitespace validation passes. A whole-worktree `git diff --check` reported unrelated concurrent WIP `index.html` whitespace; this proof did not edit that file.

The SQL is `tools/tk603-scope-trigger-parity-smoke.sql`; the proposal exists only as generated temporary SQL inside this isolated runner. The production function and staged migration are unchanged. This is a reviewed-direction candidate, not a production migration or approval.

## Next controlled step

1. Independently review the narrowly scoped proposal and captured function fingerprint. Prepare a separate staged migration only after that review; never disable the broad original trigger for bulk seeding.
2. Upgrade isolated Auth/PostgREST acceptance to the captured columns/constraints/triggers/policies, with real local JWTs, synthetic user/gym/content-share/coach relationships, and the unchanged central session writer payload including date. Assert owner rewriting and no cross-owner persisted rows, idempotent retries, revoke/edit/history and server errors.
3. Add a coach-authorized cross-owner response case to actual own-analytics helpers. Test user_id filtering even when RLS legitimately permits the rows, plus account-switch generations/caches.
4. Before production, re-read schema fingerprints, review complete dependency parity and rollback, verify manifest/entitlements/media/Android gates, and obtain explicit activation approval. Existing synthetic 36-case Auth acceptance remains useful narrow evidence; it is not full production-schema parity.
