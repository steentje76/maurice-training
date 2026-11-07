# TK603 — owner/source-bound draft restart and durable retry IDs

Status: implemented on isolated QA worktree based on 8aca60a; not merged/deployed or activated. All release flags remain false. No production writes, credentials, real athlete data, licensed raw media or APK.

## Concrete failures reproduced and fixed

The first eight actual-function VM scenarios had 1 PASS / 7 FAIL on the original code. The failures were Preview source/swap loss after a serialized restart, UUID only in memory when POST could commit, ownerless draft restore, pre-fix draft accepted with another device owner, same-ID personal Guided weight inheritance, cross-owner Guided resume, and replacement retaining the original provider claim. The final expanded suite has 12/12 scenarios PASS.

- `persistTrainingDraft` includes `owner_uid` and the actual matching `resolvedWorkout` (Preview list/source refs/substitutions) alongside the existing `sessionLog`, `sessionExtra`, elapsed time, focus and instance ID. It reports whether local persistence succeeded.
- `tk603DraftOwnerMatches` rejects mismatched owner snapshots. Pre-fix untagged drafts remain recoverable only when the existing `tk_cache_owner_uid` matches the current owner. It does not rewrite or infer exercise identity.
- `restoreTrainingDraft` returns no other-owner data. `startT` restores its saved resolved list before rendering; the normal, custom and program resume branches recheck snapshot ownership before assigning its data.
- `tk504StableSessionId` stores the existing normal session draft synchronously before the subsequent POST. If that local save fails, it throws before a possible server commit. Existing UUIDs are replayed unchanged. The existing central `writeSessionRow` is retained.
- Guided snapshots now carry owner identity and guard active/cur/phase, persist/resume/hasActive/hasUnsaved, replacement, finish and persistence. Account change cannot write an old training into the next account's Guided log or session path.
- Guided local performance keys distinguish explicit catalog owner/provider/ID from legacy personal ID. A catalog item cannot inherit or overwrite a same-number personal history entry. Missing/invalid explicit refs remain present on the resumable draft for fail-closed server verification; they are never stripped into personal fallback.
- Guided alternatives carry the actually offered ECS object's source ref from GWUI. Async replacement verifies the active owner/training still matches after awaiting the existing canonical resolver. The replacement gets the new provider ref and no old row ID or old source claim.
- Guided stores the row UUID before write and refuses a typed write when that snapshot cannot be persisted. This retains the existing partial-save/retry and single sessions writer.

## Changed functions

`tk603DraftOwnerMatches` (new), `persistTrainingDraft`, `restoreTrainingDraft`, `startT`, `startCustomTraining` (resume owner recheck), `launchProgramTrainScreen` (resume owner recheck), `tk504StableSessionId`; Guided-local `lsSet`, `histKey` (new), `prevOf`, `start`, `active`, `cur`, `phase`, `ownsActive` (new), `persist`, `resume`, `hasActive`, `hasUnsaved`, `rateSet`, `replaceEx`, `replaceExAsync`, `doPersist`, `finish`; GWUI `alt` passes the real alternative ref.

No changes to `tk603ReadExerciseSessions` / `tk603RecentPickerSourceKeys` belong to this patch; the QA worktree contains the main agent's independent reader changes, which are excluded from `C:/Steensoft/tk603-offline-only-20261107.patch`. No analytics graph, Calculation Engine formula, database schema or new writer changed here.

## Verification

- `node core/tk603OfflineRestartProvenance.test.js`: 12/12 actual normal functions and full Guided module, using JSON storage shared between fresh VM contexts. Includes sets/notes/instance preservation, same UUID replay, cross-owner deny, pre-fix same-owner compatibility, personal/catalog history isolation, changed provider identity, invalid source denial and storage quota/error prevention before write.
- `tk603StableSessionUuid.test.js`: 11 PASS.
- `tk504TypedFkSessionWriteGate.test.js`: 27 PASS; `tk603ConfirmedOnlySessionWrite.test.js`: 14 PASS.
- `tk504CatalogProvenanceFlow.test.js`: PASS. Its original serialization guard initially failed after preserving invalid source claims; the implementation now keeps validated refs when valid and retains the original explicit claim only when unverified, satisfying the unchanged existing assertion plus stronger new denial test.
- `tk603ExecutionMediaProvenance.test.js`: 10 PASS; `fExerciseSwapPrescriptionWeight.test.js`: 34 PASS.
- `fGuidedSaveReliability.test.js`: 18 PASS, Chromium portion SKIP. `fGuidedIntegrationAvoidSave.test.js`: 8 PASS, Chromium portion SKIP. `fGuidedPreviewAthleteConstraints.test.js`: 19 PASS, Chromium portion SKIP.
- `fProgramResume.test.js`: 7 PASS; `fHomeResume.test.js`: 61 PASS (its expected simulated error-path diagnostic is printed).
- `git diff --check -- index.html`: PASS after preserving the original mixed line endings in unchanged source. Scoped patch uses `git diff --ignore-space-at-eol`, excluding the main agent's two reader hunks.
- `npm run build:www` in this newly created QA worktree: BLOCKED by absent `esbuild` / node_modules; run after patch integration in the dependency-equipped implementation worktree. No claim that this build or the full release gate passed here. A mistyped/nonexistent test filename `tk504ExecutionProvenance.test.js` was not a product test; the actual `tk504CatalogProvenanceFlow` and `tk603ExecutionMediaProvenance` suites were then run.

## Open gates and limits

This is serialized VM restart proof, not a real browser process kill, Android restart, localStorage durability guarantee against OS/power failure, or offline JWT/service acceptance. Typed writes remain online-only with fresh server binding; offline attempts preserve local retry data and do not queue a stale entitlement.

The loose-exercise route has no complete restart snapshot and remains an explicit gap. Older bare-ID Program/custom definitions still cannot be promoted to catalog by a prefix. Program creation/editor needs a durable definition-level source contract; this patch adds only a resume owner recheck, not that missing contract. Stored invalid/unpublished source refs stay blocked until the actual authorized catalog and binding are available.

The main agent owns clearing in-memory execution state on account reset. Relevant state is `curT`, `sessionLog`, `sessionExtra`, `resolvedWorkout`, `activeInstanceId`, `activePlannedAssignmentId`, `sessionRxAdj`, `sessionPrBase`, `execNotes`, `execFocus`, `execSkipped`, timers/paused state and `GW.st.active`. Also clear owner-bound analytics caches and stop runtime activity as appropriate. Do not erase another account's isolated offline queue.

The main analytics implementation must guard `prFor`/`upsertExerciseGoalField` after typed normal/Guided saves, and audit Dashboard lastPerf's assumption that every Guided history object key is a bare exercise ID. These are reported integration follow-ups; no new scientific rule is introduced.

## Independent combined-code review — asynchronous completion races

Actual-function regression suites subsequently reproduced six Guided and six normal finish-session account/active-object races (both initially 0/6). An old successful request/completion could otherwise clear the next account's draft, update its personal goal after an old acknowledgement, or reuse/release the wrong global save lock.

`tk603GuidedAsyncOwnerRace.test.js` now passes 6/6: owner switch during binding/legacy-FK/write/completion awaits, same-owner replacement of the active object, and independently scoped pending-save locks. Guided clears only its expected active snapshot and rechecks the owner AND exact active object after async boundaries. Pre-fix snapshots receive an owner tag upon a proven same-owner resume.

`tk603NormalAsyncOwnerRace.test.js` now passes 6/6: the actual `finishSession` captures owner, training key, sessionLog object and instance/assignment IDs. Continuations recheck that context before further writers, personal-goal updates, global session cleanup or summary rendering. Save locks belong to the context; an old finally cannot unlock another account/session's newer operation. This retains the original single writer and existing calculations.

The typed Guided replacement readiness overwrite was also fixed: choose the canonical unadjusted replacement basis first, then apply the existing readiness adjustment exactly once. The independent `fReplacementPrescription.test.js` behavioral invariant went from 56 PASS / 1 FAIL to 57 PASS / 0 FAIL. No new training rule was added.

Combined targeted checks after these fixes: normal async 6, Guided async 6, serialized restart 12, personal record/trend ownership 12, account reset 9 PASS. These are synthetic async VM executions of the actual functions, not a real Android process-kill proof. Full project CI/build are verified separately by the main integrator. The integration also rejects explicit `user_id:null` responses in tk603OwnRows while retaining deliberately omitted user_id fields under the existing RLS boundary.
