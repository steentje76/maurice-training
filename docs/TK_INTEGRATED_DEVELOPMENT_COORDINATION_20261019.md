# Trainingskompas — Integrated Development Coordination & Governance
**Control date:** 2026-10-19 · **Governance state:** PROPOSED / DRAFT (not approved or merged)
**Source snapshot:** main `160fefc2e1dabc424922e907f7dc360e4f84543f` (app v4.70.25); consolidated candidate PR #552 HEAD `146bb4b5469024c3539b3b67b2a1216778872c47`.
**Authority:** `TRAININGSKOMPAS_MASTER_ROADMAP.md` for strategy; GitHub code + CI + device + DB evidence for factual readiness. This document coordinates; it does not change canonical product decisions, calculation rules, or release status.

## 1. Executive control status (live GitHub read on 2026-10-19)
- Main unchanged at the snapshot above; **no integration merge**.
- PR #552: open Draft, mergeable, 35 commits ahead / 0 behind main, 38 changed files, final HEAD shown above. Actual GitHub workflow runs: Quality Gate **SUCCESS** (#39202423568); real Chromium acceptance **SUCCESS** (#39202423969; PR evidence records 646/646 twice). These prove the browser/tested candidate, **not** Android-device or server-data migration acceptance.
- Prior stacked Draft chain incorporated by ancestry into #552: #540, #541, #542, #543, #544, #545, #547, #549, #550, #551. **Do not separately merge these**; review actual integrated HEAD before any supersedure/closure.
- #532 signing foundation: open Draft, diverged from main; decisions D1-D4 unresolved, no stable release key. Its implementation is **not part of #552**.
- UX Design Engine #385: open Draft, old base. #461 Visual Workspace V2: open, not Draft, 6 ahead / 66 behind main; Design Engine Contract Gate failed (three of twelve Chromium tests failed: pointer reorder, variant isolation, selected-item after drag). Neither is a proven integrated current-main UX engine. #461 may be repaired on its own branch only after baseline reconciliation.
- Open issues identified: #504 MoveKit controlled media delivery gate; #512 HRV import bypass of canonical upsert path; #535 Android rest timer usability; #546 approved readiness decisions (approval is not a merge or release authorization).
- PCC sync: **PENDING — no authorized PCC application/API write confirmed**.

## 2. Working sprint board
Coordination IDs below are **not replacements for canonical Master Roadmap sprint IDs**. Status is at evidence level and is intentionally conservative.

| ID | Domain / owner | Priority | State | Code branch/PR | Dependency | Evidence / gap | Next gate |
|---|---|---|---|---|---|---|---|
| TK-TECH-01 | Integration + security / Technical chat | P0 | TESTED, not independently fully accepted | `review/tk-consolidated-20261019` / #552 @ `146bb4b` | freeze source before review | QG + Chromium green, TK-INT-01 negative test; final security review still required | independent end-to-end review + explicit PO merge decision |
| TK-TECH-02 | Local/server data acknowledgement / Technical chat | P0 | NOT VERIFIED | new isolated branch/PR to be assigned | #552 semantics; existing Android install retained | client empty-queue != server acknowledgment; verified export/migration missing | read-only inventory, independent server reconciliation, restore drill |
| TK-TECH-03 | Android signing / Technical chat | P0 | BUILT DRAFT / NOT RELEASED | `android/signing-foundation` / #532 @ `a8cae83` | PO D1-D4 and data safety | preflight/tests, no stable key | PO signing decision; isolated release-build proof |
| TK-TECH-04 | Physical Android/OAuth/Concept2 / Technical chat | P0 | NOT VERIFIED | no approved device-test release SHA | TK-TECH-01/02/03; separate PO install GO | checklist `ANDROID_PRAKTIJKTEST_V1_BETA.md` | controlled device evidence without uninstalling existing app |
| TK-UX-01 | Design Engine V2 / UX chat | P1 | BUILT / CI FAILED | `feature/design-engine-visual-workspace-v2` / #461 @ `14da647` | source reconciliation, #385 relation | browser 9/12; three fails | reproduce + negative tests + green full gate on current integrated baseline |
| TK-UX-02 | Target screen inventory and preservation contracts / UX chat | P1 | IN PROGRESS (planning) | NEW docs-only branch from current main; PR TBD | canonical PNGs, route/capability inventory | six approved screen reference PNGs; Trainen v0.2 already merged | screen-by-screen STEP 1–4 with explicit PO review |
| TK-UX-03 | Low-risk next mobile UX changes / UX chat | P1 | NOT STARTED | isolated PR TBD | #552 source freeze / same-function ownership | avatar, logging, responsive improvements already in #552; other UX gaps still open | avoid `index.html` overlap until coordinated integration |
| TK-UX-04 | Rest timer haptics/audio/overlay / UX chat with Technical native review | P2 for initial beta, revisit on PO evidence | NOT STARTED | issue #535, PR TBD | device audio path and native capabilities | physical bug report, no acceptance | distinct follow-on UX/native contract |
| TK-BETA-01 | Release intelligence + tester evidence / Coordination | P1 | NOT STARTED | MS-BETA-02 in roadmap index | telemetry/beta foundation, device acceptance | no final closed-beta evidence | traceable beta release scorecard |
| TK-LIB-02 | MoveKit/food/supplement content / later product | P2 | BLOCKED/DEFERRED | issue #504, library readiness in #552 | license-safe media provider, curated sources | validator built; import not authorized | explicit content/media approval |

## 3. Shared-file ownership and concurrency
1. Technical integration chat has exclusive write ownership of PR #552, `index.html` runtime sync/decision consumers, `sw.js`, `core/decision.js`, `core/coaching.js`, `.github/workflows/tk-browser-acceptance-staging.yml` until technical freeze + review.
2. UX chat may independently edit **`docs/ux/`, `docs/design-engine/`, design-engine-only tests and UX-specific documents** on a separate branch; no concurrent `index.html` or shared CSS modifications while #552 is changing.
3. Design-engine branch workflow `.github/workflows/design-engine-contract-gate.yml` belongs to UX only; release signing/workflows `.github/workflows/android-*` belong to Technical only; shared CI changes need coordination.
4. `docs/00_Project_Management/DECISION_LOG.md`, `docs/CURRENT_ROADMAP.md`, `docs/ROADMAP_INDEX.json`, Calculation/Evidence registries: **coordination-managed edit lock**. Technical/UX submit proposed entries/deltas instead of conflicting direct edits during parallel work. Do not write false CLOSED statuses.
5. For any cross-track `index.html` feature: pre-agree target base SHA, exact functions and CSS selectors, owner, and integration order. Combined HEAD must rerun full Quality Gate, Chromium/Playwright, responsive 320/360/375/390/412/430, and applicable offline/privacy/device checks. Two green PRs are not a green merge.

## 4. Release gates (all mandatory)
**G0 source freeze:** actual main + #552 HEAD + dependent commits recorded; no new silent changes.
**G1 independent code/security/integration:** review test semantics, regression against main, privacy/RLS, offline queue integrity, planned-recovery claims and negative proofs; blockers closed.
**G2 server-data preservation:** read-only server verification of all device-only records; independent reconciliation and reversible export/restore approach; do not infer safety from an empty local queue.
**G3 signing:** explicit owner answers D1–D4 from #532, protected signing material and stable identity; no use of another throwaway debug identity as an upgrade.
**G4 physical validation:** Samsung Android/OAuth/deep links, foreground/background lifecycle, offline→relaunch→reconnect, Google Health and Concept2 PM5 testing as available, release artifact pinned to SHA.
**G5 release approval:** separate explicit PO authority for code merge, device install/uninstall, production deployment and beta release; post-merge/post-release verification. A passed G1 never authorizes G2–G5.

**Hard stop:** preserve the existing Android installation. `allowBackup=false` and ephemeral debug signatures mean uninstall can destroy local data.

## 5. UX baseline and documentation drift
- Canonical approved PNGs: Vandaag v0.11, Trainen v0.2, Inzicht v0.1, Coach v0.2, Samen v0.1, Profiel v0.1, all under `docs/ux/baseline/v1/`. Approved mock-ups are not automatically implemented.
- `docs/TRAINEN_V02_IMPLEMENTATION_REPORT.md` and `docs/ux/SCREEN_IMPLEMENTATION_STANDARD_v1.md` document an actually merged Trainen v0.2. The assertion in `docs/UX_CURRENT_TARGET_GAP_MATRIX.md` that all screens are NOT STARTED is therefore stale and **must not be copied into status reports**.
- `docs/CURRENT_ROADMAP.md` uses an August 2026 state and calls itself the only current roadmap. Interpret it as historical/near-term commentary subject to the canonical Master Roadmap and newer implementation evidence; issue a separate non-destructive evidence-based status correction proposal.
- `docs/00_Project_Management/DECISION_LOG.md` includes a historic GitHub billing-lock statement while newer 19 Oct runs are successful. Preserve historic decision text, add a dated verification note rather than rewriting history.
- Mandatory screen migration: `docs/ux/SCREEN_MIGRATION_CHECKLIST_v1.md` STEP 1–4 before runtime, then implementation/static/browser/responsive/visual preview/PO review/final regression/PO GO/merge/production check.

## 6. Minimal handoff protocol — one artifact per changed PR HEAD
Each executing chat records this Markdown block in the PR body or a dated PR comment **and** in PCC through authorized application/API when available; otherwise `PCC_SYNC=PENDING`:

```text
TK_HANDOFF_V1
TRACK: TECH | UX
SPRINT_ID:
OWNER:
BASE_BRANCH:
BASE_SHA:
BRANCH:
PR:
HEAD_SHA:
CHANGED_PATHS:
MIGRATION_OR_SECRET_EFFECTS: NONE | EXPLAIN
DEPENDENCIES_AND_LOCKS:
STATUS: NOT STARTED | IN PROGRESS | BUILT | TESTED | INDEPENDENTLY REVIEWED | MERGED | DEPLOYED | VERIFIED
TESTS: job name + run URL + exact SHA + counts of PASS/FAIL/SKIP
NEGATIVE_PROOFS:
DEVICE_DB_PROOF: VERIFIED | NOT VERIFIED + source
FUNCTIONAL_PRESERVATION:
OPEN_RISKS:
PO_DECISIONS:
FIRST_NEXT_ACTION:
PCC_SYNC: CONFIRMED with ID | PENDING
```

Coordinator consumes only the actual PR HEAD and check/evidence references, verifies them independently, checks file collisions and dependencies, then updates coordination board. PR body claims are not by themselves proof. Do not assume the three ChatGPT chats share runtime context.

## 7. Next scheduling / handoffs
**Immediate concurrent window:** TECH handles #552 final independent review and a separate read-only data/server safety inventory; UX handles #461 failure reproduction/current-main reconciliation and screen preservation/mapping docs only. No shared runtime writes.
**After TECH freeze:** UX may prepare prioritized runtime changes as a distinct Draft on an explicitly declared source branch; Coordinator approves overlapping file ownership and integration sequence.
**Release acceptance window:** G0→G1→G2→G3→G4→G5. No estimated calendar deadline claimed while PO signing and device gates remain unresolved.
**Later release, not beta-critical:** future themes/dark-mode expansion, social/team redesign, extensive nutrition/supplement library, MoveKit Batch 002, enhanced human Coach UI, internationalization, rest-timer feature extensions unless device findings promote them.

## 8. Owner decisions / explicit NO-GO
- D1–D4 of #532: signing/distribution route, key role, secret custody, one-time migration / app ID debug suffix.
- Approve independent data-preservation and physical test procedure **before** any uninstall or installation that replaces existing device data.
- Explicit separate GO for merge of #552, supersedure/closure of old stacked PRs, and eventual deployment.
- Non-blocking product choice: how to handle #512 HRV import path vs canonical RPC, and issue #504 media licensing/storage before any MoveKit scale-up.
- DEC-REC-001-A/B is already approved in issue #546; do **not** reopen the decision or mistake it for merge permission.

_This is a non-runtime governance proposal. It is not a PCC write, production release, Android signing action, database change, or PO decision._
