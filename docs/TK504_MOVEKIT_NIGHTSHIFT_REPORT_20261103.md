# TK504 MoveKit night-shift report (2026-11-03)

Branch `feat/tk504-owner-review-terms-20261103`, start SHA 898d3b2. Working tree is
**uncommitted** for independent review. Nothing here is deployed, merged, released or
approved. No CI claim is made. No supplier text, owner notes, media or signed URLs are
included in this report or in the new files.

## Package A - integration gap audit: DONE
Reused, unchanged: `ExerciseCatalogService` (ECS: `search/all/byId/favorites/recent`,
sorts `relevance|name|difficulty|confidence`), `ExerciseAssetProvider`, the Preview ->
Execution -> Logging route.

Gap list (precise):
1. **Shadow-row writer.** `ensureExerciseRowStatus(exId)` (index.html ~17870) creates a
   `scope:'personal'` `exercises` row (id = catalog_id) for ANY id the live ECS knows. Today the
   only protection is that the live `EX_CATALOG` holds exactly the published 226. If a pending id
   ever entered the live ECS it would become a loggable row. Any future wiring must gate BEFORE
   this function (`canExecute`/`canLog` on the live ECS row).
2. **Two id spaces.** Canonical `catalog_id` (`TK-######`) vs Supabase TEXT `exercises.id`. A
   personal/owned row can reuse a TK id; the eligibility gate denies any row carrying
   `scope/user_id/owner_id/ownerId/userId`.
3. **Favorites/recent** live in ECS (`favoriteExIds`, `tk_lib_recent` in localStorage). Stored
   references are untrusted input; the adapter re-resolves them against the live service + gate.
4. **No server-authorized feature flag exists** in the client; the new gate is the first one.
5. Preview (`openTrainingPreview`), `logSet`, swap picker, templates were NOT modified.
   #584 (per-execution history/templates) is not addressed by anything here.

## Package B - V2-ready TK catalog adapter: DONE
Files: `core/movekitV2TkCatalogAdapter.js`, `core/movekitV2TkCatalogAdapter.test.js`.
- Composes the real ECS + exact MoveKit source facets + eligibility gate. No second index.
- Normal mode returns only trainable published rows; `includePending:true` returns pending
  rows explicitly `trainable:false, selectable:false, status PENDING_REVIEW_NOT_RELEASED`.
- Exact `movekitSourceMuscle/Equipment` filters (no Forearms->Grip, no Lower Back->Rug).
- Output is a sanitized frozen projection (no assets, `_review`, URLs); names are plain text
  (`renderAs:'text'`; future UI must use `textContent`).
- Fails closed: forged status, personal masquerade, source mismatch, crafted/proto ids,
  duplicate service rows, unknown ids, count drift, stale/other account, bad query/filter/sort/limit.
- Test: 18 checks PASS (real ECS extracted from index.html in a VM).

## Package C - dark-launch composition: PARTIAL (module DONE, index.html deliberately UNWIRED)
Files: `core/movekitV2DarkLaunchGate.js` (used by the adapter; covered by the adapter test).
- Disabled by default. Enabled only when a host-injected `verifyServerGrant(grant) === true`,
  grant issuer/scope/account match `getAccountId()` (re-read each call), TTL <= 15 min.
  Reads no localStorage/window/URL/globals (test sets such flags and confirms no effect).
- Media: the adapter exposes no media/URL member; media must go through the existing
  `ExerciseAssetProvider` + server-authorized V2 broker only.
- **Why index.html is unwired:** the only safe hook point is before `ensureExerciseRowStatus`
  and the picker; neither can be exercised in a VM end-to-end without the real DOM/Supabase
  session, and no server grant endpoint exists yet. A speculative edit to a ~30k-line file is
  not provable safe tonight. Hook instructions for the follow-up:
  1. Add `<script>` for the two core modules (UMD wrapper needed; they are CommonJS now).
  2. Build the adapter once the session account is known; `grantProvider` returns the
     server-issued grant; `verifyServerGrant` must verify the server signature.
  3. Picker: call `adapter.search(...)` instead of `ExerciseCatalogService.search` only when
     `adapter.isEnabled()`; otherwise keep the existing path untouched.
  4. Before `pushRecent/toggleFavorite/ensureExerciseRowStatus`, call `adapter.resolveReference(id)`.
- A static test asserts index.html contains no reference to the new modules.

## Package D - execution/logging safety contract: DONE (tests only, active code untouched)
File: `core/movekitV2TrainingGateContract.test.js` - 13 checks PASS. Uses the REAL embedded
`EX_CATALOG` (226) as the trusted baseline: all 226 allowed for execution/log/media; 356 pending
denied for all purposes incl. forged claims, personal/owned rows, crafted ids, variant claims in
both directions, ambiguous source metadata, missing evidence, hostile accessors/proxies. The
gate states `resolvesIssue584:false`. **#584 is NOT claimed as solved.**

## Package E - owner review/taxonomy/asset continuity: PARTIAL / BLOCKED (private)
- The private stage/browser under `C:\Movikit\.tk-private-review` is outside this session's
  permitted directories, so the real 582 stage was NOT re-read tonight. BLOCKED, not guessed.
- Existing Python tests (taxonomy preflight, private reviewed stage, library preview, upload
  plan, ledger, classification, catalog stage, poster optimizer) re-run: 106/106 OK. I did NOT
  audit whether they assert the 85 exact term proposals or the 8/12/6 owner split; they mention
  those counts/variants, but that verification against real data is still open. No new
  source-hash tests were added.

## Package F - regression: DONE with PRE-EXISTING blockers
PASS: adapter 18, training-gate contract 13, ECS review 22, facets 41, eligibility 18, media bridge
29, pending bridge (media guard) 14, asset-provider contract 16, import plan, binding audit 17,
offline pack 56, private media client 31, fExerciseLibrary 10; Python 106 OK.
Not runnable here (NOT caused by tonight's changes; no file was touched): `movekitV2Broker`,
`movekitV2ClientServerContract`, `movekitV2BundleIntegrity` require
`netlify/functions/exercise-media-v2-url.js` which does not exist on this branch;
`movekitV2BindingSql` needs `@electric-sql/pglite` (not installed; no installs allowed).
Chrome 27/27 UI smoke and CI #1631 were not re-run/checked by me. Full product tests and APK builds skipped by design.

Security review notes: no secrets/URLs in new code or output; no writers; frozen outputs; no
global/flag reads; XSS handled by text-only contract (renderer must honour `renderAs:'text'`).

## Continuation pass (phase G) - revoked guard + asset identity handoff: DONE (still unwired, default-disabled)
Diagnosis: all prior tests green; the adapter had no revoked-id concept (a published id withdrawn later
stayed trainable), and no safe way to feed an exact source identity to the EXISTING `ExerciseAssetProvider`
(which falls back to name-matching for ids missing from the catalog, so it must not be called with unvetted ids).
Changed files (uncommitted): `core/movekitV2TkCatalogAdapter.js`, `core/movekitV2TkCatalogAdapter.test.js`.
- `revocationProvider` option (host/server-delivered list), re-read on every call; revoked ids are hidden from
  search/favorites/recent/resolveReference/assetIdentity (also with `includePending`). Malformed/throwing
  provider => everything denied (fail closed). Not supplied => behaviour unchanged (226 still trainable).
- `assetIdentity(ref)`: returns only `{ok, reason, catalog_id, provider_id, via}` for trainable, non-revoked,
  server-authorized published rows; the host then calls `ExerciseAssetProvider.resolve(catalog_id)`. No media,
  URL or path is ever returned; pending/crafted/personal/disabled => `ok:false`.
- index.html, picker, ECS, execution and logging untouched; no writers added. 356 remain pending/unpublished.
- Tests run: adapter 20/20 PASS (was 18; +revocation, +assetIdentity). Contract/eligibility/facets suites re-run
  (results in the session summary). #577/#582/#584 are NOT claimed fixed.
- Private log `C:\Movikit\.tk-private-review\TK504-NIGHTSHIFT-AUTOQA-20261103.log`: read permission DENIED in this
  session; not bypassed. Results taken from the tests above instead.

## Remaining blockers
Authenticated content approval of the 356; entitlement + private media rights; server grant
endpoint + real index.html wiring; #577/#582/#584/#579/#586 fixes; joint UX review; then new APK;
Android/PM5 device testing; restore of the missing broker function file / pglite for 4 suites.

## Independent morning validation — 2026-11-04 (ChatGPT)

- The two overnight Claude invocations completed and left all new code **uncommitted** for independent review. New code lives in the existing draft PR #598 feature worktree; `index.html`, `main`, production DB, licenses, media storage, workout history and APK remain unchanged.
- A concrete pre-existing CI/test-blocker was diagnosed: `netlify/functions/exercise-media-v2-url.js` was **present in Git HEAD but absent in the restricted sparse working tree** (index flag `S`). It was restored from the current commit with `git restore --worktree --ignore-skip-worktree-bits -- netlify/functions/exercise-media-v2-url.js`, without modifying its tracked content. Tests now PASS: broker 28, client/server grant 14; bundle hash verification PASS across 582 source identities. No deployment.
- The new normal-picker adapter's display review path also now checks exact trusted supplier provider/slug on **pending** rows, to prevent a forged pending source from being shown as an authentic Movekit record. A transient grant-provider exception now disables the picker cleanly. The returned presentation's nested muscle/equipment/source/facet objects are immutable. Added three synthetic regression cases; **23/23 adapter tests PASS**.
- Local independent real-582 PRIVATE stage smoke passed: 582 review records, 226 selectively allowed from trusted source identities, 356 non-selectable; Forearms 35, Lower Back 21, Bench 7; current account/revocation checks; no DB/media network writes. The synthetic grant verifier in this test is NOT a production authorization result.
- Additional focused checks passed: training/log contract 13, ECS review 22, eligibility 18, existing media bridge 29, private media guard 14, source facet 41. Previously, Python MoveKit suites 106 PASS; recheck if these code-only additions need any change.
- **Blocker remains:** the new client-side dark-launch verifier is only a host-injected *contract* and cannot substitute for independent server-side entitlement, signer, versioned approval and revocation controls. No active TK picker/logging route is wired yet. Activation must remain off until a fully approved server+client integration and actual Android acceptance exists.
- `core/movekitV2BindingSql.test.js` remains unavailable locally because `@electric-sql/pglite` is not installed; no dependencies were installed.
- Formal review required for 245 AI proposals, 85 supplier terminology proposals, 26 owner feedback items. Existing issue fixes #577/#579/#582/#584/#586 and joint UX review are still prerequisites before any APK.
