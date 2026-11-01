# TK584 — program execution, logging and historical evidence

Date: 1 November 2026. Primary #584; related #582/#583. Base main: 160fefc2e1dabc424922e907f7dc360e4f84543f.

## Verified findings

- The original exercise-completion button only navigated. It did not register the displayed prefilled values.
- Confirming an individual prefilled set only recorded `done`, without kg/reps. The downstream writer requires actual kg/reps.
- `logSet` replaced the whole set object, discarding completion/AMRAP/rest flags on subsequent edits.
- Preview's resolved execution definition was absent from persistent drafts. Program resume also did not restore focus/skips. Re-rendered fields could replace visible actuals with prescriptions, and extra logged set rows were not necessarily rendered.
- Replacement explicitly deleted old exercise actuals; this conflicts with #584's preservation requirement.
- Completed program detail rendered the mutable current definition as editable planning, with no separate actuals view.

## Read-only production investigation

Only SELECT queries were used. No historical user records, snapshots, mappings or schema were changed.

The reported completed program instance retains the eight-exercise original plan. Its two linked session rows contain 6 worksets and 2610 kg (row and lateral raise). Three records matching the reported squat, bench and overhead press exist on the same date, but have no program/instance linkage and were created approximately 33–35 minutes after the program finished. An additional later leg-extension record exists. These later records are not proof that the original program registrations survived. No automatic linking, reconstruction or deduplication is justified.

The actual program IDs have existing mappings: backsquat → Quadriceps/Billen plus Hamstrings/Core/Rug; TK-000019 → Borst plus Triceps/Schouders; TK-000030 → Schouders plus Triceps/Core. Local drafts and the original device's IndexedDB queue were not available for forensic inspection. Definitive original data loss is not established.

## Implementation

A/B: confirming a set captures visible values; exercise completion asks explicit confirmation before registering populated remaining worksets. Merely viewing a prescription, skipping or opening the summary creates no actuals. Edits preserve set metadata. Drafts include resolved execution, skips/focus and original program snapshot; rendering restores actual input and extra logged set rows. Replacement retains old actuals under the original ID, never transfers them to another exercise. Removing an exercise with recorded actuals is blocked. Stable row IDs are persisted before the first request and acknowledgements after writes; retries keep IDs and prior successes. Failed completion retains the draft.

C: existing formulas and mappings are unchanged. Existing muscle-load/recovery query boundaries expose timestamped source-record/exercise/mapping provenance with the existing window/rule description. Access to retained provenance is owner-bound. No fabricated recovery percentage, AI calculation or new training rule.

D: completed block detail is read-only and separates immutable original snapshot, captured execution/modifications and stored actual session rows. Original snapshots are retained when capturing execution. Missing legacy snapshots/modifications are explicitly unknown. No date/name-based inference of program linkage.

## Validation / release boundary

The new behavioral regression is RED on original main at the prefilled-set assertion, GREEN after repair. It executes the real app functions with synthetic data: original/mixed eight-exercise plans, 15 worksets / 8442 kg, cancellation, repeated completion, resume, original-ID retention, history and failed history reads, account-bound calculation provenance. The real finish handler is exercised with a partial write failure and restored draft, stable IDs and exact 5-row convergence.

Local standard CI environment (without runtime-injected Playwright): 449/449 discovered gates passed before the final version/build-variant changes; coaching 35/35; native Concept2 176/176. Final exact-commit CI and new Chromium/Android WebView workflow are required. Browser checks installed by the host runtime could not run locally because the browser binary was absent and browser download failed; this is not browser acceptance.

The Android variant uses package `com.trainingskompas.app.tk584test20261101`, version 4.70.27 / 47027 and label TK P1 Test 1 november. It does not update another installed package and does not register its OAuth scheme. Debug signing only. Chromium/Android probes are synthetic actual-handler acceptance, not a live two-user backend or full app user journey. Physical Samsung acceptance is not performed.

No production merge/deploy or personal-account release is claimed. Stacked security/signing/backup/server-readback gates remain open; #570/#575/#578 and their branches are untouched. A second independent reviewer is unavailable; a separate self-review pass is not an independent second-person review. PCC registration requires the authenticated application route; no direct SQL import. #584 remains open pending acceptance and outstanding device/forensic/security gates.
