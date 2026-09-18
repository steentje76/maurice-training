# Boostcamp 264 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `Boostcamp_+Workout+Programs_264_APKPure.xapk`  
**SHA-256 XAPK:** `c0e72e6b50aac146f70c239b35428b4bc2166b6182c89016093cfbf0fc932643`  
**Base APK SHA-256:** `110c0892be902a42a56ff975a77b63c2c6dbc0678cd17a89031df7c745d64499`  
**Package:** `com.bpmhealth.boostcamp` · **version:** 264 · **versionCode:** 362  
**minSdk:** 24 · **targetSdk:** 36 · **splits:** base + arm64-v8a + en + xxxhdpi  
**XAPK uncompressed total:** 190,421,638 bytes; **base APK:** 155,323,864 bytes.  
**Client:** React Native + Expo SDK 54 + Hermes/New Architecture; WatermelonDB JSI; Skia; VisionCamera.

> Complete static audit for the supplied artefact. Runtime/device behaviour, server-side recommendation logic, private backend authorization, scientific validity and internal tests remain NOT ASSESSABLE unless separately evidenced. No competitor binary, extracted code, media or fonts is committed.

## 1. TK Measurement Model v1.2 assessment

| Criterion | External result | Confidence | Static evidence boundary |
|---|---|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal scope/acceptance unavailable |
| B Canonical architecture | 3 | HIGH | unusually strong local schema/seed evidence + typed client domains; exhaustive server/canonical-path proof unavailable |
| C Runtime integration | 3 | MEDIUM | workout/program/AI/strength/social/Health Connect routes packaged; real device call paths not fully proven |
| D Persistence/data model | 4 | HIGH | shipped WatermelonDB seed exposes rich local domain schema and sync-oriented _status/_changed model |
| E Calc/Context/Decision | 3 | MEDIUM | e1RM, strength score, program recommendation/AI generation, muscle engagement and context fields observable; exact formulas/authority/evidence partly unknown |
| F Tests/evidence | NOT ASSESSABLE | — | competitor tests/scientific registry unavailable |
| G Security/privacy | NOT ASSESSABLE | — | client controls visible; backend enforcement/retention unavailable |
| H UX/user-facing completion | 2 | MEDIUM | broad packaged flows; runtime discover→use→feedback not device-proven |
| I Failure/degraded-state handling | 3 | MEDIUM | Watermelon sync model, offline states/errors, local seed and health sync failures observable; lossless recovery not fully runtime-proven |
| J Audit closure | NOT APPLICABLE | — | TK project-specific closure criterion |

**No aggregate maturity score** is emitted.

## 2. Packaging and architecture

Boostcamp is a React Native/Expo 54 app using Hermes and the React Native New Architecture. The arm64 split includes WatermelonDB JSI, Skia, VisionCamera, Reanimated/Worklets and Sentry native libraries. The base ships eight DEX files, a ~17.3 MB JS bundle and an ~84.1 MB `watermelon-seed.db`.

**Pattern PAT-SEED-FIRST-001:** ship a substantial read-optimised local seed for catalogue/program data, then sync deltas rather than requiring first-launch network hydration.

**TK relevance:** highly relevant to the expanding MoveKit exercise/program catalogue. A versioned local catalogue snapshot can improve first-run/search resilience, provided user-generated/training truth remains separately synced and provenance/versioning is explicit.

## 3. Local data model — major finding

The shipped WatermelonDB schema directly exposes tables for `coach_program`, `instructor`, `master_exercise`, `user_exercise`, `user_program`, `user_program_favorite`, `user_workout_template`, `program_log`, `program_workout_log`, `exercise_max_value`, `strength_score_history`, `strength_score_max`, progress/compare photos, reviews, orders/subscriptions and user/config state.

Most domain tables contain Watermelon-style `_status` and `_changed` fields, strong evidence for local-first delta synchronisation.

**Pattern PAT-DOMAIN-LOCAL-001:** workout/program/catalogue domains have durable local records and sync metadata instead of living only in transient UI state.

**TK check:** TK already has mature IndexedDB/offline queue. Boostcamp provides a strong comparator for whether catalogue/program read models should be preseeded and locally queryable.

## 4. Program catalogue at scale

The APK ships 35 dated coach-program JSON assets plus instructor/master-exercise data. The local `coach_program` model contains title, description, workout duration, audience, value proposition, weeks, difficulty, equipment, weekdays, variations, goals, pricing, reviews and coach/instructor links.

**Pattern PAT-PROGRAM-RICHMETA-001:** program discovery is driven by structured metadata (goal, equipment, difficulty, duration, schedule, audience) rather than text search alone.

**TK opportunity:** when TK's program library grows, make these attributes typed/filterable Context inputs; do not bury them in prose or AI embeddings only.

## 5. Program lifecycle and immutable execution history

`user_program` is distinct from `program_log`, and individual `program_workout_log` records contain week/day/workout/records/notes/duration/variation/share data. Reusable `user_workout_template` is separate again.

**Pattern PAT-PROGRAM-INSTANCE-001:** definition → athlete program instance/log → workout execution log are distinct persistence concepts.

**TK check:** this strongly corroborates TK's existing decision that reusable “Mijn training” definitions and every execution must remain separate. Status: ALREADY_PRESENT/DESIGN_CORROBORATION.

## 6. Program customisation and context

The schema exposes custom weekdays, variation index, exercise alternatives, exercise order, custom exercises, session records, start date, next week/day and program-level fields for goals, equipment, difficulty, time per workout, `volume_or_intensity`, `injuries_or_limitations`, emphasis and program mode.

**Pattern PAT-PROGRAM-OVERRIDE-001:** preserve the base program while storing athlete-specific schedule/exercise/variation overrides separately.

**TK relevance:** similar to Fitbod's WorkoutConfigOverrides. Temporary/personal variation should not mutate canonical program definitions.

## 7. AI program generation

The JS bundle contains a dedicated route/hook `/(authed)/app-ai-onboarding/hooks/generateAiProgramStream.ts`, AI paywall routes and generated-program state identifiers. This is direct evidence of an AI-assisted program-generation flow and streamed generation UX.

Static evidence does **not** prove the model, server prompt, training rules, scientific validity or whether generated numerical decisions are deterministic.

**Pattern PAT-AI-PROGRAM-STREAM-001:** long-running program generation is streamed/progressively surfaced to the athlete rather than blocking on one opaque request.

**TK check:** current TK capability registry already reports `AI-PROGRAM-AUTOGEN-001` CLOSED. Boostcamp is therefore primarily a UX/resilience comparator. TK's AI must remain downstream of Calculation/Context/Decision.

## 8. Program recommendation onboarding

Direct analytics/route strings include program recommendation survey initiated/submitted, onboarding completion, searched program, workout preview, program variation viewed and “get free program recommendations.”

**Pattern PAT-RECOMMEND-FUNNEL-001:** collect explicit training context before recommending a program and measure the funnel from survey → recommendation → preview → start.

**TK opportunity:** Context Engine inputs should be captured explicitly and remain inspectable; analytics may measure funnel behaviour but never become hidden training logic.

## 9. 1RM and e1RM — unusually explicit

The local `exercise_max_value` table stores `actual_1RM`, `estimated_1RM`, max volume, top weight, max reps/time/distance and best pace. Client copy explicitly distinguishes actual 1RM from estimated 1RM and identifies a **Brzycki Method** e1RM path. A separate RPE-range e1RM path is also visible.

**Pattern PAT-1RM-DUAL-001:** keep measured/actual 1RM distinct from estimated 1RM and label the estimation method.

**TK check:** direct fit with TK Calculation Registry governance. TK is architecturally stronger if it stores calculation ID/version/formula/confidence alongside e1RM; Boostcamp reinforces the UX need to show measured vs estimated clearly.

## 10. Strength Score

Boostcamp ships dedicated `strength_score_history` and `strength_score_max` tables. User-facing copy says Strength Score measures strength relative to body size across major movement patterns and adjusts for bodyweight, gender and age. History stores overall plus squat, floor-pull, horizontal-press, vertical-press and pull-up scores.

**Important limitation:** exact scoring formula, normative population and validation are not statically established.

**Pattern PAT-MOVEMENT-SCORE-001:** aggregate strength by interpretable movement patterns while retaining component scores and source maxes.

**TK caution:** do not copy an opaque composite. Any TK equivalent must be registry-backed, population-scoped and expose components/confidence.

## 11. Personal records and progression

The app has all-personal-record routes, workout milestones, exercise statistics, strength-score history, actual/e1RM history and max-volume/top-weight fields.

**Pattern PAT-MILESTONE-001:** derive athlete-visible milestones from canonical performance history and keep the underlying metric accessible.

**TK:** useful UX benchmark for Inzicht/social sharing; milestone copy must never replace the underlying Calculation result.

## 12. RPE/RIR

RPE is a first-class concept with educational copy (“Rating of perceived Exertion”), RPE UI/routes and an estimated-1RM-via-RPE-range path. RIR identifiers exist but the static evidence is weaker than for RPE and does not establish a full RIR workflow.

**Result:** RPE strongly OBSERVED; RIR capability PARTIAL/NOT FULLY ASSESSABLE.

**TK check:** TK already has formal RPE/RIR calculations. Boostcamp contributes UX/e1RM integration ideas, not calculation authority.

## 13. Plate calculator

The bundle contains plate-calculator routes/results and product copy positioning plate calculator as a workout tool.

**PAT-PLATE-001 corroboration:** deterministic plate-loading utility is independently present in another strength competitor.

**TK relevance:** if not already user-facing, implement only from canonical bar/plate inputs in Calculation Engine; no AI involvement.

## 14. Warm-up templates

Warm-up set insertion, base-weight input, warm-up template editor, delete/insert controls and warmup rows are directly observable.

**Pattern PAT-WARMUP-TEMPLATE-001:** warm-up prescriptions are reusable templates attached to exercise execution, editable independently from work sets.

**TK opportunity:** potentially useful for fast logging. Any automatic warm-up percentages should be deterministic Calculation/Decision output.

## 15. Rest timer and workout nudges

The app includes a Boostcamp Rest Timer, countdown initiation and default-rest-timer settings. Workout nudges are also configurable.

**Pattern PAT-REST-PRESET-001:** rest targets are persistent exercise/workout preferences and execution timers consume those targets.

**TK relevance:** compare with current execution timer behaviour; keep planned rest target separate from actual elapsed rest.

## 16. Supersets and set model

The bundle includes explicit normal-set/superset writing paths and extensive superset/warmup identifiers. This supports complex workout structure without a separate product.

**TK:** corroborates canonical execution model with set-group semantics rather than separate engines.

## 17. Muscle Engagement Tracker

Direct client events include `workout muscle engagement viewed`, `user program muscle engagement viewed` and `MUSCLE_TRACKER`. Exercise records include muscles/muscles_list.

Static evidence proves a muscle-engagement visualization/domain but not the load formula.

**Pattern PAT-MUSCLE-ENGAGE-001:** expose program/workout muscle distribution as a visual planning/analysis layer.

**TK check:** TK already has muscle-load/heatmap direction. Boostcamp is a presentation benchmark; TK must preserve calculation provenance rather than infer “recovery” from visualization alone.

## 18. Exercise knowledge layer

`master_exercise` contains equipment, muscles, video/thumbnail, category, overview, “why do exercise”, fact, guide, tips, progression guidance, risks and additional risk disclosure.

**Pattern PAT-EXERCISE-KNOWLEDGE-001:** exercise catalogue separates instructional/safety/progression metadata from athlete performance records.

**TK opportunity:** highly relevant to MoveKit expansion. Enrich exercise metadata without putting coaching claims inside media assets; scientific/safety claims need evidence provenance.

## 19. Custom exercises and alternative swaps

Dedicated `user_exercise`, custom exercise flows, exercise alternatives and “alternative exercise swapped” events are present.

**Pattern PAT-EXERCISE-OVERRIDE-002:** user-defined and alternative exercises coexist with the master catalogue but retain origin/source identity.

**TK relevance:** strong pattern for preserving canonical MoveKit IDs while allowing user/coach extensions without contaminating the master catalogue.

## 20. Reviews and real-world program outcomes

`program_review` includes rating plus years, strength gains, muscle gains, modifications, comments, weeks completed, notes and helpful/not-helpful feedback.

**Pattern PAT-PROGRAM-OUTCOME-REVIEW-001:** program reviews can collect structured completion/context/outcome fields rather than only star ratings.

**TK caution:** user-reported gains are observational feedback, not scientific efficacy evidence. Keep them out of Calculation/Evidence truth.

## 21. Social graph and feed

The bundle contains follow/follow-request state, post comments/reactions, profile/user routes, post/workout sharing, Instagram sharing, referral flows and cached feed users.

**Pattern PAT-SOCIAL-PROJECTION-001:** workout/program achievements are projected into social objects while canonical training records remain separate.

**TK:** aligns with planned Social sprint and Hevy/TrainHeroic findings.

## 22. Weekly report and sharing

Direct events include weekly report share/opened, workout complete sharing and milestone sharing.

**Pattern PAT-WEEKLY-REPORT-001:** periodic training summaries are first-class shareable insight objects.

**TK opportunity:** AI Coach may narrate already-calculated weekly trends, but numerical weekly report values must come from Calculation Engine.

## 23. Health Connect

The Android app explicitly requests `health.READ_WEIGHT`, `health.WRITE_EXERCISE` and `health.WRITE_WEIGHT`; the JS bundle contains Health Connect state and bodyweight push/pull failure paths.

**PAT-HC-001 corroboration:** Boostcamp becomes a fourth independent benchmark (after Hevy, Fitbod and Runna) with direct native Android Health Connect evidence.

**TK status:** VERIFIED_GAP remains: current TK main documentation states native Android Health Connect SDK is NOT STARTED and Google Health API is the current path.

## 24. Health sync scope

The static Android permission set is notably narrow: read weight, write weight and write exercise. This is evidence of scoped permission selection rather than requesting a broad health-data surface.

**Pattern PAT-HEALTH-MINPERM-001:** request only health record types needed by the current product integration.

**TK relevance:** when Health Connect is implemented, map every requested record type to a declared product use and provenance contract.

## 25. Offline/sync

WatermelonDB's `_status`/`_changed` fields, local seed, sync-heavy client identifiers and explicit offline/network errors show a serious local-first architecture. Health weight sync has separate push/pull failure states.

**Pattern PAT-SYNC-DIRECTION-001:** sync failures identify direction/domain (push vs pull) instead of collapsing everything into “sync failed.”

**TK opportunity:** extend observability/error taxonomy so provider/domain/direction are explicit while preserving privacy.

## 26. OTA updates

Expo Updates is enabled with a production manifest URL and runtimeVersion 264.

**PAT-OTA-001 corroboration:** Boostcamp joins Runna/TrainHeroic as another mobile product using controlled OTA delivery.

**TK governance:** presentation/runtime patches must never bypass Calculation/Evidence/Decision versioning.

## 27. Observability, analytics and lifecycle

Sentry native, Firebase, Customer.io and analytics identifiers are packaged. Baseline profiles are shipped. Foreground-service/media playback, notifications, wake lock, boot-completed and screen-capture detection permissions are present in the XAPK metadata.

**TK:** benchmark native lifecycle/telemetry as the Android shell matures; no competitor telemetry SDK should dictate TK privacy design.

## 28. Deep links

Verified Android intent filters exist for Boostcamp share, customer.io, coaches and users paths across `boostcamp.link` and the product domain.

**PAT-LINK-001 corroboration:** canonical shareable coach/user/content objects benefit from durable app-link resolution.

## 29. Billing/entitlements

RevenueCat, Google Billing and subscription/paywall identifiers are present; local seed also includes historical Apple Store subscription/notification and Stripe payment-intent tables.

**Important:** shipped seed schema does not prove current backend payment authority. No security/commercial conclusion is inferred from table presence.

## 30. Security/privacy static review

Positive indicators include SecureStore backup/data-extraction exclusions, screen-capture detection permission and scoped Health Connect permissions. File-provider configurations are present and require semantic manifest/runtime analysis before any exposure claim.

The embedded app config contains mobile SDK identifiers/client tokens for analytics/marketing services. Such client-side identifiers are not automatically secrets; no credential-exposure vulnerability is claimed.

Backend authorization, deletion completeness and retention remain NOT ASSESSABLE.

## 31. Package/performance observations

The package is large because it deliberately ships a large local database plus program JSON catalogue. ABI/density/language splits limit irrelevant install payload. Baseline profile assets and JSI database access indicate attention to startup/query performance.

**Trade-off:** local catalogue resilience/search speed versus APK/download/storage size. TK should benchmark this explicitly before embedding hundreds of MoveKit media assets; metadata seed and remote media is likely a better separation than bundling all video.

## 32. Localisation/accessibility

This XAPK contains only the English language split. Framework accessibility infrastructure exists, but actual TalkBack order, labels, contrast, touch targets and full product localisation are runtime/build-variant questions.

## 33. Technical solution patterns added

- **PAT-SEED-FIRST-001** — versioned local catalogue/program seed + delta sync.
- **PAT-DOMAIN-LOCAL-001** — durable local domain records with sync metadata.
- **PAT-PROGRAM-RICHMETA-001** — structured program discovery metadata.
- **PAT-PROGRAM-INSTANCE-001** — program definition, athlete instance and workout execution are separate.
- **PAT-PROGRAM-OVERRIDE-001** — athlete overrides do not mutate canonical program.
- **PAT-AI-PROGRAM-STREAM-001** — streamed/progressive AI program-generation UX.
- **PAT-RECOMMEND-FUNNEL-001** — explicit context survey → recommendation → preview → start.
- **PAT-1RM-DUAL-001** — measured 1RM distinct from formula-estimated 1RM.
- **PAT-MOVEMENT-SCORE-001** — composite strength score retains movement components/source maxes.
- **PAT-MILESTONE-001** — derived milestone links back to canonical metric history.
- **PAT-WARMUP-TEMPLATE-001** — reusable warm-up set templates.
- **PAT-REST-PRESET-001** — planned rest target separate from execution timer.
- **PAT-MUSCLE-ENGAGE-001** — workout/program muscle distribution visualisation.
- **PAT-EXERCISE-KNOWLEDGE-001** — rich instruction/progression/risk metadata separated from performance.
- **PAT-EXERCISE-OVERRIDE-002** — user/custom alternatives retain source identity.
- **PAT-PROGRAM-OUTCOME-REVIEW-001** — structured user-reported program outcome review.
- **PAT-SOCIAL-PROJECTION-001** — social projection separate from canonical training record.
- **PAT-WEEKLY-REPORT-001** — periodic shareable insight object.
- **PAT-HEALTH-MINPERM-001** — minimum necessary Health Connect record permissions.
- **PAT-SYNC-DIRECTION-001** — domain/direction-specific sync failure taxonomy.
- PAT-HC-001, PAT-OTA-001, PAT-LINK-001 and PAT-PLATE-001 receive additional corroboration.

## 34. TK current-state implications

The largest Boostcamp-derived opportunities are not basic logging or program definitions; TK already has those foundations.

Higher-value candidates are:
1. a **preseeded, versioned exercise/program metadata catalogue** while keeping MoveKit video remote;
2. richer typed program-discovery metadata;
3. explicit user-program override objects;
4. clearer measured-1RM vs e1RM UX with calculation method/provenance;
5. reusable warm-up templates;
6. structured exercise knowledge/risk/progression metadata;
7. direction-aware sync diagnostics;
8. streamed UX for the already-closed TK AI program-autogen capability;
9. Health Connect minimum-permission production path;
10. structured program outcome feedback without treating reviews as evidence.

The existing TK event/race-date gap previously benchmarked against Boostcamp is not promoted again; duplicate prevention applies.

## 35. Dynamic audit gates

Runtime follow-up should test onboarding/program recommendation, AI program-generation streaming/failure/cancel, program discovery/filtering, start/resume/variation/override lifecycle, offline first launch and catalogue search, sync conflict/reconnect, set logging/RPE, measured/e1RM explanation, Strength Score components, warm-up template editing, rest timer screen-off/background behaviour, supersets, plate calculator, muscle engagement, exercise swap/custom exercise provenance, Health Connect permission/revocation/push-pull, social/privacy/follow requests, program reviews, deep links, subscription restore, accessibility, actual network/TLS and logout/account/local-data cleanup.

## Final status

**BOOSTCAMP 264 COMPLETE STATIC AUDIT: CLOSED for supplied-XAPK static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server/backend/internal test/scientific-evidence audit: NOT AVAILABLE from supplied artefact.**

Most important architectural finding: Boostcamp ships an unusually rich **local-first programme/exercise data layer** and clearly separates program definitions, athlete-specific program state and individual workout execution logs. That independently validates TK's chosen reusable-definition → scheduled/executed-instance architecture, while suggesting a concrete scalability improvement for the MoveKit expansion: versioned local metadata/catalogue seeding with media remaining remote.