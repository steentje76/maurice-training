# UX Reality Audit — Trainingskompas · 2026-10-19

**Status:** UX DEVELOPMENT DRAFT; no merge, deploy, schema, signing or PCC mutation.
**Repository:** steentje76/maurice-training
**Source of truth:** main `160fefc2e1dabc424922e907f7dc360e4f84543f`; stacked technical candidate PR #552 `review/tk-consolidated-20261019@146bb4b5469024c3539b3b67b2a1216778872c47`.
**UX ownership:** `ux/set-completion-accessibility-20261019` — only set-completion presentation in `index.html`, one additive `core/` test, this audit. Technical PR #552 remains untouched.

## Evidence hierarchy
- **Implemented**: concrete code in a named ref; not equivalent to release or production acceptance.
- **Tested**: exact test/viewport/result stated.
- **Integrated/closed**: only when the corresponding required CI + mobile/PO gates pass.
- **Planned/unknown**: specification alone is no implementation proof. `UX_CURRENT_TARGET_GAP_MATRIX.md` and `UX_BASELINE_PRESERVATION_MATRIX.md` describe an earlier design phase, not today's runtime.

## Reality matrix (source-level, not a claim of full device acceptance)

| Area | Confirmed present | Partly present or candidate-only | Outstanding / evidence gap |
|---|---|---|---|
| Training → execution → logging | `startT`, `buildWorkSetRow`, `logSet`, `toggleSetDone`, `restoreSessionLogToDom`, e1RM hint and rest surface exist | PR #552 contains UX-LOG-01 corrections to 1RM row placement, editing persistence, guided per-set weights, navigation guard, logbook 320px layout | Physical Android/OAuth and release acceptance; remaining tap/keyboard semantics and real beta journeys |
| Five-tab shell | `tkPrimaryNavHtml`, `tkPrimaryNavGo`, `tkPrimaryTabFor`; existing `fUxAppShellCanonicalNav.test.js` | Canonical navigation in pending release candidate, not necessarily the installed app | Full logged-in journey and every header/destination on real device |
| Avatar/profile | Existing `core/avatarCore.js`, `tkAvatarHtml`, header `data-tk-avatar` hooks, signed URL loading | Four header triggers are wired in source; conditional fallback/user-session presentation not yet independently validated across Vandaag, Inzicht, Samen and Coach | Verify all target destinations and mobile states; no second avatar system |
| Voeding discoverability | Real `s-nutrition` destination and nutrition flow already exist | `docs/UX_SCREEN_REVIEW_QUEUE.md` flags discoverability from Home/Lichaam as the primary gap | Visually approved route placement, no sixth bottom tab |
| Inzicht | `s-stats`, recovery/display features, narrow layout fixes in #552 | Multiple insight destinations still need cross-domain semantic audit and confidence/provenance presentation check | Signed-off data mapping and screenshots for v0.1 |
| Coach and Samen | Existing coach/social destinations, feature tracks, shared nav | AI/human separation and team/club UX only partly provable from present source-level inspection | Further product decisions, consent/privacy-specific audits |
| Design Engine | PR #385 (UX Design Engine v1) and PR #461 (Visual Design Workspace v2) exist | Both open, neither merged into main during this audit | Reconciliation of proposed designs with latest runtime; no parallel design-system fork |
| Offline/recovery feedback | Offline queue, restore and feedback mechanisms exist; PR #552 fixes fail-closed deletion-sync behaviour | UI behavior for real disconnections and late callbacks not end-to-end device-certified | Test airplane mode, offline queue, reconnect and recovery clearly; preserve determinism |

## The five highest-value UX sprints (re-ranked against current candidate)

| Rank | Sprint | Deliverable and acceptance | Estimate | Gate / dependency |
|---|---|---|---|---|
| 1 | **UX-EXEC-A11Y-01 · Workset completion** | Native completion control, explicit pressed-state, visible keyboard focus, 44px target with unchanged 34px ring; 6 viewport tests and persistent-state regression | **0.5–1 day** | Approved execution behavior exists. No navigation/design structure change. Stacked on #552 |
| 2 | **UX-NAV-NUTRITION-02 · Discover Voeding** | Trace Home/Trainen/Inzicht reachability and choose one clearly labelled food-log action without a sixth bottom tab; canonical screenshot proposal + route/return tests | **1–2 days** | PO approval for exact placement; `UX_SCREEN_REVIEW_QUEUE.md` explicitly requires a mock-up |
| 3 | **UX-SHELL-PROFILE-03 · Header & avatar uniformity** | Reuse `tkAvatarHtml` across Vandaag, Trainen, Inzicht, Coach, Samen; remove forbidden shortcuts after destination-by-destination capability preservation | **1–2 days** | Current screen visual baseline, session/permission tests, explicit route ownership with technical chat |
| 4 | **UX-EXEC-OFFLINE-04 · Recovery & honest status** | Human-readable pending/persisted/errors/retry state for execution, resume and offline queue; no fake sync success | **2–3 days** | Technical #552 offline integrity acceptance, queue-state mapping, airplane mode/Android validation |
| 5 | **UX-INSIGHT-CLARITY-05 · Recovery/analytics readability** | Consistent empty/loading/error states, accessible chart controls, confidence/provenance language without new scientific rules | **2–4 days** | Canonical data provenance and visual review of inzicht-v0.1; Decision/Calculation untouched |

**Ranking rationale:** the most damaging *daily* risk is losing or misreading a recorded set, closely followed by interruption/offline trust. Most high-priority data-integrity fixes are already in PR #552, so the first UX branch addresses a proven, still-open accessibility issue rather than duplicating them. The top unresolved information-architecture question is Voeding discoverability.

## UX-EXEC-A11Y-01 — preservation, mapping and approval status

1. **Canonical baseline:** `docs/ux/baseline/v1/trainen-v0.2.png` is the approved Trainen *landing-screen* visual. This sprint does **not** migrate a canonical main screen or change screen composition. The existing F0.8E execution row remains the visual reference; no new screen mock-up needed for a semantic/input-only delta. Full migration checklist remains mandatory for later main-screen migrations.
2. **Functions preserved:** `buildWorkSetRow` → `toggleSetDone` → `sessionLog[exId].sets[setNum-1].done` → `updateProgress`, `updateSummary`, `scheduleAutosave`, `refreshActiveSetBanner`, `autoRestAfterSet`; `restoreSessionLogToDom` → `restoreCompletedSetVisualState`. All are unmodified in calculation and data meaning.
3. **Component reuse:** retains the existing `.set-circle.setr-ring` and `--accent` token. Native `button type=button` instead of a div simulating a button; CSS pseudo-element keeps the approved 34px visual circle but expands the target to 44px without extra row layout width (negative margin).
4. **Data mapping:** `aria-pressed` is a *projection* of the existing Boolean `sessionLog...done` / DOM `.done` source; never a second set-state or DB field. Initial render, user toggle and resume must remain synchronized.
5. **Risks/non-goals:** no rest-time formula edits; no e1RM edits; no changes to RPE, AMRAP, training saves, nutrition, schema, signing, themes or other routes. Carry-body set controls are distinct and not implicitly claimed covered. Extra browser test uses test-only synthetic fixtures, never user data.
6. **Manual/mobile gate:** Product Owner must inspect the real Android runtime and focus/press behavior before merge, despite static and headless passes. Stacked PR must wait for #552's accepted basis or controlled restack.

## Competitor reference (patterns, not copied algorithms/design)
- **Hevy**, official feature descriptions: weight/reps/RPE logging, set completion, automatic rest, workout adjustment. https://www.hevyapp.com/features/track-workouts/
- **Strong**, official Help Center: weight/reps then complete a set, rest timer, saved history. https://help.strongapp.io/article/229-my-first-workout
- Neither source independently proves that their completion controls meet a 44px accessibility target. That target is our own verified UX requirement, not a copied competitor feature.

## Required release and governance actions
- PR branch must be **Draft**, **base `review/tk-consolidated-20261019`**; no writes to main or technical branch.
- Checks: `git diff --check`, targeted set/nav tests, exact Chromium test at 320/360/375/390/412/430, full release gate where feasible, independent read-only PR diff review.
- UX acceptance is separate from technical #552 release/signing/device gates; no false green on a skipped browser suite.
- PCC: register through owner-authorized UI/workflow only. Do not bypass governance through administrative Supabase SQL. No PCC mutation is made by this sprint.

## Evidence log — local Windows branch
- `node core/fUxSetCompletionAccessibility.test.js` with `TK_REQUIRE_CHROMIUM=1`: 7/7 static assertions and real Chromium 320/360/375/390/412/430px **PASS**, including Space/Enter, 44px touch rectangle, original 34px visible ring, initial/updated/restored pressed-state and input widths.
- `node core/fSetLoggingUx.test.js`: **131/131 PASS**, real Chromium included.
- `node core/fExecutionIntegrity.test.js`: **34/34 PASS**.
- `node core/fUxAppShellCanonicalNav.test.js`: **47/47 PASS**.
- `git -c core.whitespace=cr-at-eol diff --check`: **PASS**; source change limited to 12 added, 5 removed lines in `index.html`.
- Local full `node core/release-gate.js`: **NOT GREEN / NOT CLAIMED**. On the Windows device, the existing `core/fConcept2ArtifactFirewall.test.js` failed with `spawnSync npm ENOENT` and another Node process emitted a native stack trace. These failures are not attributed to the UX delta without reproduction in Linux CI. A clean Linux Quality Gate and independent review are still mandatory prior to any merge.

## Independent PR review / CI regression follow-up
- PR #554 first GitHub Quality Gate run [39208102261](https://github.com/steentje76/maurice-training/actions/runs/39208102261) **FAILED** on new `c.hasAttribute()` in the older `fHardening.test.js` simulated DOM object. Independent inspection of the GitHub CI log (not inferred from local browser pass) identified this as a genuine regression introduced by UX-EXEC-A11Y-01.
- Corrective commit guards the optional DOM method before reading the existing `aria-pressed` attribute. `fHardening.test.js` now **349/349 PASS**, `fUxAppShellCanonicalNav.test.js` **47/47 PASS** on the corrected code. No training or calculation behavior changed.
- A repeated headless Chromium launch on the Windows machine encountered a transient navigation timeout / closed browser, so the earlier 6-width PASS from before the guard correction is not misrepresented as a fresh final-HEAD PASS. Linux CI, a fresh exact-HEAD Chromium rerun and PO Android review remain separate acceptance gates.
