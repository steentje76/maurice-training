# TK504 MoveKit V2 multi-phase build report (2026-11-03)

Non-private facts only. No supplier text, notes, URLs or media are recorded here.

## Session constraint

This session had file read/search/edit tools only: no shell. Therefore:
- `git status/HEAD/diff`, Node tests, Python tests, the private 582 smoke, headless Chrome,
  commits and push were NOT executed.
- Branch/HEAD (`feat/tk504-owner-review-terms-20261103`, `6245708`) come from the session-start
  git snapshot; the worktree git dir could not be read directly.
- Any test listed below as "written" is UNEXECUTED.

## Phase 0 - inventory (read-only)

- `core/movekitV2EcsReviewAdapter.js` delegates all search to the canonical
  `ExerciseCatalogService.search()`; no competing index. Existing tests load the real service from index.html in a VM.
- `core/movekitV2ExerciseMediaBridge.js` already skips every private-stage/pending identity and has a
  test for zero signing identities (`...BridgePending.test.js`).
- Gap found: adapter `sourceFacets()`, `total` read the caller's stage/registry live after validation
  (post-validation mutation could alter the view).
- Gaps not addressed (need a shell): Phases 2-6.

## Phase 1 - review-only catalog integration: CODE DONE, TESTS UNEXECUTED

Changed:
- `core/movekitV2EcsReviewAdapter.js`: facets, total snapshotted at creation (frozen); `sourceFacets` ignores non-string ids.
- `core/movekitV2EcsReviewAdapter.test.js`: added synthetic tests for duplicate ids, malformed stage/entries,
  altered provider, stale/tampered review status, changed route counts, mutation after creation,
  activation/media attempts on the view, zero media-signing identities for the private stage.

Not wired into index.html. No release flags touched.

## Phases 2-6: NOT DONE

- Phase 2 (V3 private HTML), Phase 3 (owner-review/85-term presentation), Phase 4 (execution/logging
  contract tests), Phase 5 (regression + private smoke), Phase 6 (commits/push): need shell access.
- Issues #577/#582/#584/#579 are NOT claimed resolved.
- Blocked regardless: physical Android/PM5 and authentic athlete account verification; formal release approval.

## Next handoff

Rerun with shell: `node core/movekitV2EcsReviewAdapter.test.js`, then continue at Phase 2.

---

## Continuation run (shell available) - status

All changes below are UNCOMMITTED by instruction (the invocation said not to git add/commit/push).
No private source text, owner notes or media were read, logged or copied in this run.

### WP1 - Phase 1 reverified
- real-ECS adapter 22 checks PASS, source facets 41/41 PASS, pending media guard 14 PASS.
- Not committed (see above).

### WP2 - private library browser (tools/movekit-v2-private-library-preview.py)
- Detail panel is now a modal dialog (role=dialog, aria-modal, labelled heading): focus moves into it,
  Tab/Shift+Tab are trapped, Escape and backdrop click close, focus is restored to the opening card,
  background is inert/aria-hidden while open. `/` focuses search. Deep link `#TK-nnnnnn` (validated).
- Performance: 96 cards rendered per step with a "Toon meer" button, debounced search (120 ms),
  content-visibility on cards, lazy posters, videos load only on demand.
- Navigation: owner-choice filter with counts; chips for owner choice, metadata proposal
  ("niet goedgekeurd"), and paired identity; peer links work in both directions and show the peer's
  unchanged/pending status. Mobile: full-width sheet, 44px touch targets, scrolling tiles.
- CSP unchanged (default-src 'none', no network); output still only a NEW .html directly in
  .tk-private-review; never overwrites.
- Tests: tools/test_movekit_v2_private_library_preview.py 29/29 PASS (was 20).
- NOT DONE: generating the new real HTML (TK504-MOVEKIT-BIBLIOTHEEK-582-MULTIPHASE-20261103.html)
  and the 582/582 media-reference count. This session may not access C:\Movikit (tool-level block),
  and that was not worked around. Run from a session with access:
  `python tools/movekit-v2-private-library-preview.py --source-directory C:\Movikit --staged-catalog C:\Movikit\.tk-private-review\TK504-V2-PRIVATE-REVIEWED-STAGE-582-FINAL-20261103.json --output C:\Movikit\.tk-private-review\TK504-MOVEKIT-BIBLIOTHEEK-582-MULTIPHASE-20261103.html --baseline-catalog <exercise-catalog.json>`
- No headless-browser smoke was run (no behavioural DOM test; UX checks are static contract + node --check).

### WP3 - review-only eligibility gate (core/movekitV2ReviewEligibility.js)
- Pure, unwired, fail-closed. Eligible only by membership of a trusted baseline (226) by canonical
  catalog_id AND matching provider/provider_id; 356 pending always denied; legacy row id alone,
  personal/owned rows (scope/user_id/owner_id), forged status fields, source tampering, accessors and
  hostile proxies are denied; inputs snapshotted; outputs frozen.
- core/movekitV2ReviewEligibility.test.js: 18/18 PASS (synthetic). index.html untouched.
- Does NOT resolve #584 and is not inserted into execution or logging.

### WP4 - annotation status
- Preview already differentiated owner choices; added filter/chips above. New synthetic tests prove
  8/12/6 split, unapproved flags preserved, bidirectional pair links, no dedup (582 ids/slugs kept),
  and 85 source-term proposals embedded verbatim (no synonyms).
- Not verified: source-hash checks against the real stage (needs private access).

### WP5 - QA
- Also run: movekitV2ExerciseMediaBridge.test.js 29 assertions PASS. `git diff --check` clean
  (only LF/CRLF warnings). tools/movekit-v2-private-ecs-smoke.js was NOT run (private access).
- #577/#582/#584/#579 not claimed resolved. CI not checked.

---

## Independent ChatGPT verification after Claude implementation — 3 November 2026

The above Claude-only NOT DONE statements are historical for that restricted session.
The following checks were subsequently performed from the authorized Windows desktop
using a separate execution path. These results supersede the 'not generated/not run'
claims for the explicitly named checks below.

- **Node tests independently executed:** 22/22 review/ECS, 41/41 exact-source facets,
  18/18 review-only eligibility, 29 prior media-bridge identity/security assertions,
  14/14 private media-stage guard checks — all PASS.
- **Python tests:** 106/106 MoveKit-specific regressions PASS; the expected
  negative-path CLI stderr 'PRIVATE_OUTPUT_PATH_REQUIRED' comes from a successful
  test and is not an overall failure.
- **Actual private 582-stage:** read-only ECS search/index smoke PASS: all 582 available to
  review search, 356 remain pending, exact Forearms 35 / Lower Back 21 / Bench 7,
  with zero media signing client calls for the private stage.
- **Private HTML generated:** TK504-MOVEKIT-BIBLIOTHEEK-582-MULTIPHASE-20261103.html
  in C:\Movikit\.tk-private-review. Verified 582 exercises, category counts
  226/245/85/26, 582 existing poster references, 582 existing video references,
  exact 226-record baseline comparison PASS. No media files copied into Git.
- **Chrome functional UI smoke:** 27/27 checks PASS, testing first page 96, pagination
  to 288, all status/owner filters, precise muscle/equipment filters, search by
  canonical ID, modal, original owner annotation, manual video element creation,
  focus return after keyboard-initiated card activation, keyboard shortcut,
  Escape close, no-match state and reset. This does not verify complete MP4
  decoding, Android device interaction, media rights, or real account logging.
- **Diff:** git diff --check PASS before commit; only LF/CRLF notices, not errors.
- **Release:** staged only. No production app, import approval, data/history changes,
  public video publication, Android APK, Netlify deploy, main merge, or grants.
- **Remaining:** formal authenticated taxonomy decisions, secure approved publishing and
  entitlement path, real user/workout integration and execution logging, open issues
  #577/#582/#584/#579, jointly reviewed UX and physical Android/PM5 testing.
- **Additional 582-record real-eligibility verification:** separate local read-only
  smoke checked all 226 existing catalog identities remain eligible only when
  exact canonical provider/catalog identity matches, while all 356 new identities
  are denied for execution, logging and media-grant purposes. Private/personal
  row with the same TK ID was also denied; no DB writes or activation. PASS.
