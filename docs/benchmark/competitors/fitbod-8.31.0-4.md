# Fitbod 8.31.0-4 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.fitbod.fitbod_8.31.0-4-10831004_1arch_2dpi_24lang_f05669ef96f910167597cd5088a1434e_apkmirror.com.apkm`  
**SHA-256 APKM:** `063e16ff195328223ee4992b95b2ba35ce918fa2c6cd0533fe7e9c10d764e452`  
**Base APK SHA-256:** `9f31f15d923289f1209f27058f4821d61a901d5efffa65929e492e237f01cbe8`  
**Package:** `com.fitbod.fitbod` · **version:** 8.31.0-4 · **versionCode:** 10831004  
**minSdk:** 29 · **variant:** arm64-v8a, 480–640 dpi, Android 10+  
**APKM size:** ~63 MB compressed; **base APK:** 125,515,742 bytes.  
**Bundle:** base + arm64 + xxhdpi/xxxhdpi + 24 language splits.

> Complete static audit for the supplied artefact. Runtime/device behaviour, server-side logic, private backend controls and internal tests remain NOT ASSESSABLE unless separately evidenced. No competitor binary, extracted source or media is committed.

## 1. TK Measurement Model v1.2 assessment

The external audit reuses TK's canonical 0–5 ladder, A–J vocabulary, N/A discipline, confidence and evidence-first rule. Unknown closed-source evidence is never scored as zero.

| Criterion | External result | Confidence | Static evidence boundary |
|---|---|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance/scope unavailable |
| B Canonical architecture | 3 | MEDIUM | strongly structured Android client with repositories/use-cases/sync managers/Room/Hilt; exhaustive shadow-path proof unavailable |
| C Runtime integration | 3 | MEDIUM | concrete ViewModels/repositories/generators/sync managers packaged and dependency-wired; actual device call paths not fully proven |
| D Persistence/data model | 3 | MEDIUM | Room DAOs/models for workout/config/exercise/injury/recovery/offline entities are directly observable; backend ownership/lifecycle incomplete |
| E Calc/Context/Decision | 3 | MEDIUM | substantial deterministic/local optimisation and recommendation components observable, plus remote workout generator; exact scientific validity/authority split unknown |
| F Tests/evidence | NOT ASSESSABLE | — | competitor test suite/results unavailable |
| G Security/privacy | NOT ASSESSABLE | — | client controls visible; backend enforcement/data retention unavailable |
| H UX/user-facing completion | 2 | MEDIUM | broad packaged UI flows; runtime discover→use→feedback not device-proven |
| I Failure/degraded-state handling | 3 | MEDIUM | explicit offline task store/banner, fallback paths and remote-workout failure states visible; real lossless recovery unproven |
| J Audit closure | NOT APPLICABLE to competitor maturity | — | TK project-specific closure criterion |

**No aggregate maturity score** is emitted because required A/F/G evidence is unavailable.

## 2. Packaging and native architecture

Fitbod is a large native Android/Kotlin application rather than a React-Native-style JS product shell. Evidence includes nine DEX files, Jetpack Compose + classic fragments/views, Hilt/Dagger dependency injection, Room, DataStore, coroutines/Flow and AndroidX Health Connect. Native arm64 libraries are relatively limited and include Sentry native components and rendering/datastore helpers.

**Pattern PAT-NATIVE-001:** a domain-heavy fitness product can keep recommendation, persistence and workout orchestration in typed native modules/use-cases rather than a monolithic UI layer.

**TK relevance:** do not copy the technology choice. Reuse the architectural lesson: calculations/recommendations, storage/sync and presentation should remain separable modules with explicit contracts.

## 3. Local data and sync architecture

Direct class evidence shows `AppDatabase`, many Room DAOs, repositories, push/pull/sync managers and entities for past/saved/uncompleted workouts, sets/set groups, workout config/overrides, exercises, equipment, injuries, muscle groups, strength summaries and exercise coefficients.

A top-level sync dependency visibly coordinates app config, blocks, equipment, exercise coefficients/ratings/catalogue, gym/equipment, Health Connect, injuries, muscle groups, past/saved workouts, selected cardio, Strava, user profile and workout config.

An `OfflineTask` store is directly visible with scheduled ordering, plus offline-mode and current-workout offline banner indicators.

**Pattern PAT-SYNC-001:** domain-specific repositories and sync managers coordinated over a durable local model, allowing workout state to exist independently of immediate network success.

**TK check:** TK already has a mature IndexedDB offline queue with owner scoping/idempotency. Fitbod suggests a future architectural benchmark: whether TK's single generic queue should remain generic while provider/domain adapters own mapping and conflict policy. No gap is promoted from static evidence alone.

## 4. Adaptive workout architecture — major finding

The APK exposes both a **remote workout generation path** and a substantial local `optim` fallback/engine. Direct identifiers include:
- `RemoteWorkoutGenerator`, `RemoteWorkoutProvider`, `RemoteWorkoutRepository`;
- explicit text: “Falling back to Optim for request type”;
- `OptimExerciseSchemeCalculator`, `OptimIndividualExerciseRanker`, `OptimExerciseRankingCalculator`, `OptimExerciseMuscleGroupValidator`, `OptimSetGroupGenerator`, `OptimRestTimeDeterminer`, `OptimSchemeHistoryAdjuster`, `OptimSingleExponentialSmoothing`, `VolumeCalculator`, `WorkoutMuscleGroupsDeterminer`;
- `ExerciseCoefficientDB` plus pull/push/sync managers;
- request/refresh/replacement models and fallback states.

This is stronger evidence than a generic “AI workout generator” label. The client contains a real local optimisation/recommendation subsystem and can fall back to it for at least some remote-generation failures. Static evidence does **not** establish which system is canonical, how remote algorithms work, or scientific validity.

**Pattern PAT-ADAPT-001:** remote adaptive generation backed by a deterministic/local fallback engine with typed ranking, scheme, volume, rest and muscle-group components.

**TK relevance:** this strongly supports TK's existing principle that AI should not be the numerical source of truth. A future TK auto-programmer can use Calculation + Context + Decision to produce deterministic candidates and let AI explain/present them, with a deterministic fallback if remote AI is unavailable.

## 5. Training context model

Observable workout configuration includes experience level, fitness goal, equipment/gym profile, workout duration, training split, workouts per week, focus exercises, cardio selection, variability, supersets, warmups/cooldowns and injury/exclusion context. `WorkoutConfigOverrides` provides per-workout overrides distinct from the underlying profile/config.

**Pattern PAT-CONTEXT-001:** persistent athlete/gym configuration + explicit per-workout overrides.

**TK relevance:** close match to TK's Context Engine philosophy. Important implementation lesson: never mutate the long-term athlete profile merely because one workout needs an exception; represent temporary overrides explicitly.

## 6. Training split and frequency recommendation

Direct evidence includes `SplitRecommendationUseCase`, `RecommendedDaysPerWeekUseCase`, `FocusExerciseRecommendationUseCase`, training-split models and plan-critical-change logic.

This proves client-side recommendation components exist; it does not prove the formulas or evidence basis.

**Pattern PAT-PLAN-001:** separate recommendation use-cases for frequency, split and focus exercises instead of one opaque “generate plan” function.

**TK opportunity:** useful blueprint for decomposing future program generation into individually testable/versioned Decision Rules.

## 7. Muscle recovery model

This audit corrects older TK benchmark assumptions. Fitbod 8.31.0 contains a substantial per-muscle recovery subsystem:
- `RecoveryFragment/ViewModel`;
- `MuscleRecoveryEditFragment/ViewModel`;
- `muscleRecoveryFraction`, `muscleRecoveryPct`, `minsToRecovery`;
- `recentWorkoutsForRecovery`;
- manual muscle-group adjustments;
- “Fresh Muscles” and “Last Workout” recovery tabs;
- recovery percentage UI and muscle-group recovery editing;
- workout muscle-group determination.

**Important:** static identifiers prove a per-muscle recovery model/UI, but not its physiological validity. We must therefore correct any TK documentation claiming Fitbod only has a “basic” or absent muscle-recovery view unless that statement is explicitly historical/version-scoped.

**Pattern PAT-REC-MUSCLE-001:** per-muscle recovery state derived from workout history, with user-editable/manual correction.

**TK relevance:** compare against TK's muscle-load/recovery visualization, but retain TK evidence/confidence rules. Manual correction is particularly interesting: it separates algorithmic estimate from athlete-reported context.

## 8. RPE/RIR and 1RM

Direct evidence includes `RpeHelper`, RPE/RIR prompts/chips, `RiR` workout models, `appliedRir`, `focusExerciseRir`, Health Connect RPE targets, onboarding 1RM flows, `Get1RMDisplayDataUseCase`, `theo1rm`, max-effort flows and 1RM sync.

**Pattern PAT-EFFORT-001:** subjective effort (RPE/RIR) is captured as a first-class workout datum and connected to recommendation/display paths rather than being merely a note.

**TK check:** TK already has formal RPE/RIR calculations/evidence registry. Fitbod is therefore a UX and adaptive-programming benchmark, not a reason to change TK's calculation authority.

## 9. Strength scores and progression

The APK exposes local/remote strength-score data sources, aggregate and per-muscle strength summaries, trends/graphs, first-week/locked/loading/offline states and workout-count gating. Exercise performance/history and achievements are also structured domains.

**Pattern PAT-STRENGTH-SCORE-001:** transform raw exercise history into progressive summary surfaces while explicitly representing insufficient-data/locked/loading/offline states.

**TK opportunity:** useful for Inzicht presentation, but any composite TK score must remain explainable and registry-backed rather than copying an opaque score.

## 10. Workout execution

Current-workout modules include record/in-progress flows, uncompleted workout persistence, next-set finding, exercise replacement/removal/feedback, manual circuits/supersets, warmup/cooldown headers, set UI state, RPE, max-effort and plate calculator.

**Pattern:** active workout is a durable domain object, not just screen state.

**TK check:** TK's canonical Training Preview → Execution → Logging/completion chain already exists. Fitbod provides a strong benchmark for persistence during an unfinished workout and in-context modification.

## 11. Circuits, supersets, warmups and exercise variability

Explicit support exists for manual circuits, superset enablement, circuit options, warm-up sets, dynamic/static stretching, soft tissue warmups/cooldowns, and exercise variability configuration.

**TK opportunity:** compare builder/execution flexibility after the MoveKit expansion. Do not introduce separate execution engines; variants should compile into the canonical TK execution model.

## 12. Exercise library, ratings, exclusions and custom exercises

Direct modules cover exercise list/picker/filtering, exercise aliases, equipment, exercise ratings, exercise feedback/removal, exclude exercise, custom exercise wizard, primary/secondary muscle groups and replacement flows.

**Pattern PAT-EXERCISE-FEEDBACK-001:** exercise suitability feedback feeds a persistent preference/exclusion layer that recommendation components can consume.

**TK opportunity:** particularly relevant to future auto-programming: “exercise unavailable/unsuitable” should become structured Context/Decision input, not free-text AI memory.

## 13. Injury context

Fitbod includes injury DAO/sync, active injuries UI, injury coachmarks, excluded exercises and an `InjuriesChat` repository/ViewModel.

**Inference limit:** this does not establish medical diagnosis or safety validity.

**Pattern PAT-INJURY-CONTEXT-001:** injury/limitation data is represented as explicit athlete context and can constrain exercise selection.

**TK rule:** if adopted/extended, treat as self-reported limitation/context, not diagnosis; route restrictions through versioned Decision Rules.

## 14. Health Connect

Fitbod includes AndroidX Health Connect, explicit onboarding/settings UI, permissions manager, data manager, sync manager, body-composition importer and a bundled `health_connect_exercises_map.json`.

This is a deeper native Health Connect implementation signal than Hevy's client indicators alone: Fitbod exposes dedicated manager/sync/importer classes and exercise mapping.

**PAT-HC-001 corroboration:** second competitor independently demonstrates native Health Connect as a first-class integration boundary.

**TK status remains VERIFIED_GAP:** current TK main explicitly documents Google Health API only and no native Android Health Connect SDK.

## 15. Strava and partner integrations

Fitbod has dedicated Strava connection repository/ViewModel, OAuth athlete models, refresh activities/settings and partner I/O endpoints.

**Pattern PAT-PROVIDER-001:** provider integration owns connection state, OAuth, refresh, settings and activity refresh behind a repository boundary.

**TK relevance:** aligns with provider-adapter direction for wearables/devices.

## 16. Deep links and sharing

Branch SDK evidence, PushDeepLinkHolder, Fitbod link generation, LinkVault repository and gym-profile sharing are packaged. AppsFlyer attribution is also integrated.

**Pattern:** separate durable link creation/resolution from screen navigation.

**TK opportunity:** reinforces PAT-LINK-001 from Hevy; use canonical object IDs and a resolver layer rather than hard-coding UI routes into shared links.

## 17. Observability and product analytics

Sentry native, Firebase Crashlytics/Analytics, Mixpanel, AppsFlyer, Branch and Iterable indicators are present. LaunchDarkly is present for remote feature flags.

**Pattern PAT-FLAGS-001:** remotely controlled feature exposure can decouple deployment from rollout.

**TK caution:** remote flags must never silently change calculation/evidence semantics. Any Decision Rule affecting training truth must remain versioned/auditable.

## 18. Billing/subscription

Dedicated Fitbod billing service/API models, Google Play subscription loader, local subscription manager, trial/paused subscription flows and billing endpoints are observable.

**Pattern:** commercial entitlement is a dedicated service/domain rather than scattered UI checks.

No commercial change is promoted to TK from this audit alone.

## 19. Notifications and scheduling

Notification permission manager, weekly-goal update use-case and first-workout scheduling are observable. Runtime exact timing/OS background semantics require device testing.

## 20. Security/privacy static review

Positive observable elements include modern AndroidX credentials/auth components, Firebase App Check/Play Integrity code, dedicated backup/data-extraction exclusions for AppsFlyer data, narrow FileProvider paths (`cache-path images/`; `files-path image_provider/`) and Health Connect permission management.

No auth bypass, exposed credential, exploitable provider or cleartext defect is claimed. Backend authorization, token lifecycle and retention remain NOT ASSESSABLE.

## 21. Failure/degraded-state handling

Evidence includes `DisplayableWorkoutOfflineBanner`, `OfflineTask` durable scheduling, remote-workout failure dialog, explicit fallback from remote workout generation to Optim, offline strength-score state, low/network error handling and sync-state components.

**Major pattern PAT-DEGRADE-001:** recommendation generation has a domain-specific degraded mode rather than simply failing when the preferred remote path fails.

**TK opportunity:** this is highly compatible with TK architecture: Calculation/Decision should remain capable of safe deterministic output when AI/network services are unavailable; AI is enhancement/explanation, not availability-critical truth.

## 22. Localisation/accessibility

24 language splits are supplied (ar, de, en, es, et, fi, fr, hi, hu, in, it, ja, ko, ms, nl, pl, pt, ru, sv, th, tr, uk, vi, zh). Compose/Android accessibility infrastructure is packaged, but actual TalkBack order, labels, contrast and touch targets require runtime inspection.

## 23. Performance/package observations

The base APK is ~125.5 MB and uses nine DEX files; device-specific ABI/density/language splits reduce installed irrelevant resources. Baseline profile assets are packaged for runtime optimisation. The native library footprint is modest relative to the Java/Kotlin domain layer.

## 24. Technical solution patterns added

- **PAT-NATIVE-001** — typed domain/use-case architecture in a large native fitness client.
- **PAT-SYNC-001** — durable local domain model + coordinated domain sync managers.
- **PAT-ADAPT-001** — remote workout generation + deterministic/local optimisation fallback.
- **PAT-CONTEXT-001** — persistent athlete/gym config + explicit workout overrides.
- **PAT-PLAN-001** — frequency/split/focus recommendations as separate use-cases.
- **PAT-REC-MUSCLE-001** — per-muscle recovery estimate + manual athlete correction.
- **PAT-EFFORT-001** — RPE/RIR as first-class adaptive input.
- **PAT-STRENGTH-SCORE-001** — strength summaries with explicit insufficient/offline states.
- **PAT-EXERCISE-FEEDBACK-001** — structured exercise suitability/exclusion feedback.
- **PAT-INJURY-CONTEXT-001** — self-reported limitation context constrains selection.
- **PAT-PROVIDER-001** — provider-specific repository boundary.
- **PAT-FLAGS-001** — remote rollout flags, with TK governance caveat.
- **PAT-DEGRADE-001** — deterministic degraded recommendation path.
- PAT-HC-001 and PAT-LINK-001 receive independent corroboration.

## 25. TK documentation correction candidate

Current TK historical/handbook benchmark prose includes statements implying Fitbod's muscle-recovery visualization is only basic or that TK's per-muscle heatmap is absent from the compared apps. Fitbod 8.31.0 static evidence clearly contains per-muscle recovery percentages, fresh-muscle/last-workout views and edit/manual-adjustment flows. Those old statements should be treated as **historical/version-scoped**, not current benchmark truth. This audit does not modify canonical product claims automatically; it records the correction requirement.

## 26. Dynamic audit gates

Runtime follow-up should test: onboarding and plan generation; generated-workout explanation; remote→Optim fallback; manual recovery adjustment; workout config overrides; set logging/RPE/RIR friction; unfinished workout restore; offline/reconnect; exercise exclusion impact on next recommendation; injury-context behaviour; Health Connect permissions/import/export; Strava OAuth/sync; deep links; notification scheduling; subscription restore; accessibility; actual network/TLS; logout/account switch and local-data cleanup.

## Final status

**FITBOD 8.31.0-4 COMPLETE STATIC AUDIT: CLOSED for supplied-APKM static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server/backend/internal test/evidence audit: NOT AVAILABLE from supplied artefact.**

Most important architectural finding: Fitbod is not merely an opaque remote “AI generator”. The supplied Android client contains a substantial local deterministic optimisation subsystem (`Optim`) and explicit fallback from remote workout generation. That is directly relevant to TK's Calculation → Context → Decision → AI architecture and strengthens the case for keeping deterministic training logic available independently of AI/network availability.