# Alpha Progression 7.5 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.alphaprogression.alphaprogression_7.5-675_4arch_7dpi_24lang_7900cf9b33e8a07b4ea25aaf62abdb56_apkmirror.com.apkm`  
**SHA-256 APKM:** `dfce8a237aba33e7d63e71d9c418a8da081133bb680dac6f79511d6da9fd0789`  
**Base APK SHA-256:** `2cea0c8df582e22d0824a00f410462ee7daca312899fa6ff8ee4749e8b793839`  
**Package/version:** `com.alphaprogression.alphaprogression` · 7.5 · versionCode 675 · min API 26.  
**APKM:** 104,308,229 bytes compressed; base APK 110,236,060 bytes; 4 ABI splits, 7 density splits, 24 language splits.  
**Architecture:** Capacitor hybrid app, large bundled web client; 2 DEX; Firebase auth/functions/storage/analytics/remote-config; RevenueCat; PouchDB local store + Cloudant remote sync; native AndroidX Health Connect library; 795 exercise asset modules plus language dictionaries/help/legal content.

> Complete static audit for the supplied APKM. It proves packaged client logic, help/documentation claims and integration structures. It does not prove server-side generator implementation, scientific validity, runtime recommendation quality, backend authorization or production reliability.

## 1. TK Measurement Model v1.2

| Criterion | Result | Confidence | Boundary |
|---|---:|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance unavailable |
| B Canonical architecture | 3 | HIGH | plan/workout/logger/exercise/gym/RIR/deload/analytics domains are explicit |
| C Runtime integration | 3 | MEDIUM | concrete Capacitor/native/cloud/local paths visible; runtime not exercised |
| D Persistence/data model | 3 | HIGH | PouchDB local + user-specific Cloudant remote sync and explicit recovery paths |
| E Calculation/Context/Decision | 4 | MEDIUM | generator factors, progression recommendations, RIR/set periodisation, deload, 1RM/10RM and warmup rules are explicit; scientific validity not independently established |
| F Tests/evidence | NOT ASSESSABLE | — | internal tests unavailable |
| G Security/privacy | NOT ASSESSABLE | — | client reveals architecture/endpoints but not backend enforcement |
| H UX completion | 3 | MEDIUM | rich help/UI flows and exercise library; dynamic friction not tested |
| I Failure/degraded handling | 3 | MEDIUM | offline/database/permission/subscription/error paths explicit |
| J Audit closure | NOT APPLICABLE | — | TK-specific |

No aggregate score.

## 2. Hybrid architecture

`capacitor.config.json` and plugin registry prove a Capacitor shell around a substantial bundled web client. Native plugins cover camera, notifications, network, share, keep-awake, Firebase and RevenueCat.

**PAT-HYBRID-DOMAIN-001:** a web-first training domain can use native capability adapters without moving calculation truth into the bridge.

**TK:** architecturally relevant because TK also uses a web/native boundary. Keep native plugins as transports/capabilities, not Calculation/Decision authorities.

## 3. Plan generator — major benchmark

Direct client endpoint evidence includes:
- `/api/tpg/v6/plan-generator`
- `/api/tpg/v7/plan-generator`

Help content states the generator takes into account equipment, gender, training experience, goals, muscle focus, training frequency/duration, split preference and applicable periodisation methods.

**PAT-STRENGTH-GENERATOR-CONTEXT-001:** generated strength programming consumes an explicit context object rather than a single goal.

**TK:** conceptually aligned with Context Engine + Program Autogen. Alpha provides a strong strength-specific input checklist, not a formula to copy.

## 4. Generated plan remains editable

The client exposes plan editor, create-from-scratch, generated plan, duplicate/repeat plan and activation flows.

**PAT-GENERATE-THEN-EDIT-001:** generated program is an editable artifact before/after activation, not an opaque immutable recommendation.

**TK:** strong fit with Workout Builder/Training maken and canonical program snapshots.

## 5. Muscle focus is multidimensional

Alpha's help states focused muscles can be trained more often, earlier in a workout and/or with more sets.

**PAT-MUSCLE-FOCUS-001:** “focus” may affect frequency, exercise order and volume independently.

**TK:** candidate Context→Decision decomposition. Do not collapse “muscle focus” into one hidden multiplier.

## 6. Equipment-aware generation

The generator checks enabled exercises/equipment and can report insufficient equipment/exercise coverage.

**PAT-GENERATOR-FEASIBILITY-001:** generation has a feasibility gate before producing a plan.

**TK:** highly relevant with the growing MoveKit exercise library: Decision Engine should fail/degrade explicitly when available equipment/exercise coverage cannot satisfy the program constraints.

## 7. Experience affects prescription

Help content says experience influences number/selection of exercises and sets/reps; workout duration/frequency guidance also varies with experience.

**PAT-EXPERIENCE-PRESCRIPTION-001:** experience is Context Engine input affecting multiple prescription dimensions.

**TK:** already conceptually supported; Alpha corroborates strength-specific usage.

## 8. RIR is first-class

Direct client evidence includes `rir`, `rirTarget`, `rirSum`, `trackRir`, RIR table cells and help content explaining lower RIR = more strenuous.

**PAT-RIR-ENTRY-001:** RIR is logged and targeted as structured workout data.

**TK:** already canonical/evidence-registered. Alpha is an execution/periodisation comparator.

## 9. RIR periodisation

Direct code strings include `rirPeriodisation`, `track-rir`, `set-periodisation`; help explicitly says set and/or RIR periodisation can be activated in expert plan settings.

**PAT-RIR-PERIODISATION-001:** planned effort target can change by cycle/week independently of load/reps.

**TK:** important candidate comparison for Decision Engine; any TK RIR progression rule must be explicit/versioned/evidence-rated.

## 10. Set periodisation

Alpha explicitly adjusts number of sets weekly as part of periodisation.

**PAT-SET-PERIODISATION-001:** weekly set-count progression is a distinct decision dimension.

**TK:** candidate for program-level deterministic rules, separate from AI narrative.

## 11. Planned deload

The client has `DeloadSettings`, `toggleDeload`, `deloadSets`, `deloadReps`, deload-week UI and configurable percentages.

**PAT-PLANNED-DELOAD-001:** deload is an explicit program/workout state with modified prescription, not merely a coach message.

**TK:** strongly aligned with Decision Engine philosophy; useful benchmark for user-facing deload preview/editing.

## 12. Deload can be applied to a workout/day

Help content states standalone workouts or plan days can be converted to deloads and that status matters before execution.

**PAT-DELOAD-SNAPSHOT-001:** deload state is materialised into the scheduled/executed workout, preserving what was actually prescribed.

**TK:** direct fit with preview→execution snapshot architecture.

## 13. Progression recommendations — major benchmark

Client strings and help explicitly expose “Progression recommendations”, user acceptance of a progression recommendation, and explanations for recommendations without target reps.

Help states the algorithm considers variables including weights, reps, 10RM of past sets, target reps and available weights.

**PAT-PROGRESSION-INPUTS-001:** exercise-level progression recommendation combines performance history, target range and achievable equipment increments.

**TK:** current lift-by-lift Progression Coach is already VALIDATED and deterministic. Alpha adds a concrete **available-weight constraint** benchmark worth checking in the recommendation path.

## 14. Available weights constrain recommendation

Gym configuration includes weight ranges/bar+plates and help explains impossible target weights are replaced by achievable alternatives.

**PAT-LOAD-FEASIBILITY-001:** a progression recommendation must be projected onto physically available load increments.

**TK:** plate calculator/rounding exists, but current exercise-progression recommendation should be checked for end-to-end equipment feasibility before claiming parity. **TK_CHECK_REQUIRED.**

## 15. Reference workout

A `reference-workout` concept is present in client/help content.

**PAT-REFERENCE-WORKOUT-001:** current execution/progression can retain an explicit prior-workout comparator rather than silently using “last data”.

**TK:** candidate UX/provenance pattern for explaining why a set target changed.

## 16. 1RM formula transparency — important

Alpha help explicitly states its estimated 1RM is based on a combination of the popular Brzycki and Epley formulas.

**PAT-E1RM-ENSEMBLE-001:** multiple e1RM formulas can be combined into one displayed estimate.

**TK:** this directly corroborates TK's existing Calculation Registry principle that multiple e1RM formulas may coexist with chosen/weighted output and confidence. Alpha's exact combination is not evidence for TK.

## 17. 10RM as separate performance metric

Alpha also calculates 10RM and says it combines Brzycki and Epley 10RM formulas.

**PAT-10RM-METRIC-001:** rep-max estimates can be expressed at task-relevant rep counts rather than only e1RM.

**TK:** candidate calculation only after formal evidence review/registry entry. It may improve hypertrophy-oriented progress views, but must not be imported as truth from competitor copy.

## 18. Performance metric selection

Charts can use 1RM, 10RM or volume; help recommends different metrics by goal/context.

**PAT-PERFORMANCE-METRIC-VIEW-001:** analytics allows goal-relevant metric selection instead of one universal “strength score”.

**TK:** good UX direction; underlying metrics remain separately governed calculations.

## 19. Volume caveat — unusually useful evidence philosophy

Alpha help explicitly warns that volume is not a great progression indicator because it overvalues higher reps.

**PAT-METRIC-LIMITATION-UX-001:** athlete-facing analytics can disclose what a metric should not be used to conclude.

**TK:** strongly aligned with Calculation & Evidence Specification and forbidden interpretations. This is a design-direction confirmation.

## 20. Warm-up engine

Alpha has a dedicated Warmup domain/settings and help explaining warmup set count depends on exercise type, experience and available weights; weight/intensity scales toward first working set.

**PAT-WARMUP-CONTEXT-001:** warmup prescription uses work-set target plus exercise category, athlete experience and equipment feasibility.

**TK:** current `CALC-STR-004` warmup heuristic mainly uses work weight. Alpha exposes a richer **candidate context model**, but no scientific validation. Any extension requires evidence review and versioned calculation.

## 21. Warmup feasibility

If no valid lower load exists, Alpha can omit/reject warmup sets and explains why.

**PAT-WARMUP-FEASIBILITY-001:** warmup generation fails/degrades honestly when equipment increments make a proposed set impossible.

**TK:** strong candidate for current warmup calculation/plate-rounding integration.

## 22. Plate calculator / gym-specific weights

Gym settings support ranges or explicit bar-and-plate setups and can enable plate calculation.

**PAT-GYM-LOAD-MODEL-001:** available loads belong to gym/equipment context and can differ per exercise/equipment.

**TK:** plate calculator exists; Alpha suggests deeper gym-context persistence for achievable recommendations.

## 23. Supersets

Superset creation/dissolve/combine and rest-timer behavior are explicit.

**TK:** supersets already exist; comparator for execution polish.

## 24. Dropsets

Dropset settings and configurable percentage weight drops are explicit.

**PAT-DROPSET-PRESCRIPTION-001:** dropset is a typed prescription with configurable load-reduction rule.

**TK:** candidate typed set-mode extension; rule/evidence must be explicit.

## 25. Rest timer

Alpha has per-session timer settings, presets, between-exercise behavior and Android delayed-alarm handling.

**PAT-TIMER-DEGRADED-001:** rest timer UX accounts for OS-delayed alarms/notification behavior.

**TK:** candidate Android runtime hardening for long/background rest periods.

## 26. Exercise library scale

The APK contains **795 exercise-specific asset modules** plus localized exercise dictionaries and extensive exercise instructions/evaluations.

**PAT-EXERCISE-MODULE-001:** large exercise libraries can isolate exercise metadata/content into independently loadable modules.

**TK:** relevant as MoveKit expands toward 401 purchased exercises. The exact Alpha content must not be copied; the modular loading pattern is generic.

## 27. Exercise evaluation

Pro-version help exposes exercise evaluations for muscle-building quality and exercise metadata includes target/auxiliary muscle and equipment concepts.

**PAT-EXERCISE-EVALUATION-001:** exercise suitability can be a separate evidence/content layer from exercise identity.

**TK:** candidate only if TK can support transparent criteria/evidence. Do not create opaque “good/bad exercise” ratings.

## 28. Custom exercises

Alpha supports custom exercise creation and images, with metric/equipment configuration.

**TK:** exercise-library expansion/custom exercise support should preserve canonical IDs and user-defined provenance.

## 29. Multiple exercise metrics

Help/client structures cover weight+reps, counterweight+reps, bodyweight, distance, duration, cardio-like speed/RPM and other metrics.

**PAT-EXERCISE-METRIC-TYPE-001:** exercise definition declares its logging metric schema.

**TK:** strong generic direction for a 401+ exercise library; execution should render by metric capability rather than exercise-name conditionals.

## 30. Bodyweight-aware performance calculation

Help explicitly says bodyweight is taken into account when calculating 10RM for bodyweight exercises.

**PAT-BODYWEIGHT-LOAD-001:** external load and body mass contribution must be modeled separately for bodyweight movements.

**TK:** candidate calculation review; movement-specific effective body-mass assumptions require evidence and must not be guessed.

## 31. Measurements

Alpha includes bodyweight, body fat, neck, shoulders, chest and other measurement types plus charts.

**TK:** body-data domain already exists; Alpha is a strength-app UX comparator.

## 32. Analytics

Charts support exercise, muscle, training and measurement domains with configurable date ranges/trends.

**PAT-STRENGTH-ANALYTICS-SCOPE-001:** analytics can pivot across exercise-level, muscle-level, workout-level and body-measurement views.

**TK:** broad Inzicht architecture is already richer; Alpha offers a compact strength-specific information architecture benchmark.

## 33. Trend calculation

Help states trend is a moving average over a selected period.

**PAT-TREND-PERIOD-UX-001:** trend window is visible/selectable rather than hidden.

**TK:** excellent explainability pattern; Calculation Registry should surface window/sample sufficiency alongside trend.

## 34. Training volume by muscle

Help exposes reps, RIR, sets and volume at muscle level.

**PAT-MUSCLE-LOAD-VIEW-001:** muscle-level analytics aggregates multiple observables, not only “sets”.

**TK:** hypertrophy/muscle-load domain already planned/partly implemented; use only evidence-governed aggregations.

## 35. Health Connect

AndroidX Health Connect libraries and platform record types are packaged; help content explicitly references exporting workouts to Health Connect.

**PAT-HC-001 corroboration:** Alpha Progression adds another independent native Health Connect benchmark.

**TK:** native Android Health Connect remains NOT STARTED / verified platform gap.

## 36. Health Connect scope boundary

The packaged library contains many Android health record/permission strings. Library presence alone does **not** prove Alpha requests or uses every record type.

Only workout export/help and Health Connect integration presence are claimed here.

## 37. Local-first PouchDB

The main client creates a local PouchDB with auto-compaction and contains explicit recovery/recreate paths.

**PAT-POUCH-LOCAL-001:** hybrid app workout state can be locally durable independent of remote sync.

**TK:** equivalent goal already served by IndexedDB/offline queue; no reason to copy PouchDB.

## 38. Cloudant sync

Client code contains a user-specific Cloudant remote PouchDB endpoint and authentication-backed remote DB construction.

**PAT-DOC-SYNC-001:** local document database and per-user remote document store can use replication semantics.

**TK:** REFERENCE_ONLY. TK's canonical relational/Supabase model and idempotent queue should not be replaced merely because Alpha uses document replication.

## 39. Database recovery states

Explicit strings include `ALLDOCS MISSING_DOCS NO_REMOTEDB`, destroyed/recreated local DB paths, offline errors and permission-fix endpoints.

**PAT-LOCAL-DB-RECOVERY-001:** local persistence has explicit corruption/missing-doc recovery rather than silent failure.

**TK:** candidate resilience test dimension for IndexedDB/offline queue.

## 40. Export

Alpha has an `export-data` endpoint and export screens/options, including automatic workout export and delimiter/date formatting concepts.

**PAT-DATA-EXPORT-SCHEMA-001:** athlete export is a product surface with selectable formatting, not only an admin dump.

**TK:** export already exists; compare completeness/roundtrip separately.

## 41. Import exercises

`ImportExercises` and `importExercisesSource` are present, but this static evidence does not establish generic workout-history CSV import equivalent to Strong.

**Result:** exercise import OBSERVED; athlete history import NOT ASSESSABLE.

## 42. Sharing plans/workouts

The client has `sharing-share`, `sharing-open`, plan/workout sharing help and explicit statement that past workout data is not shared.

**PAT-PLAN-SHARE-PRIVACY-001:** reusable prescription can be shared while historical execution remains private by default.

**TK:** strong social/My Training candidate and aligned with privacy architecture.

## 43. Subscription architecture

RevenueCat is packaged and Pro gates include progression recommendations, charts, exercise evaluations, warmup, RIR tracking/periodisation and plan features. Exact production entitlement enforcement is not statically proven.

**TK:** pricing/product benchmark only; do not infer backend enforcement.

## 44. Remote Config

Firebase Remote Config is a registered Capacitor plugin.

**PAT-FEATURE-CONFIG-001:** remote product configuration can alter non-truth UX/feature availability.

**TK:** any future feature flags must never change calculation semantics invisibly; calculation/rule versioning remains canonical.

## 45. Notifications

Local notifications include rest timer and session reminders.

**TK:** already has notification roadmap/architecture; Alpha is a strength-adherence comparator.

## 46. Keep-awake

Capacitor keep-awake is packaged.

**PAT-EXEC-KEEP-AWAKE-001:** active workout can request screen-awake behavior without owning workout truth.

**TK:** candidate execution polish, especially erg/cardio/live sessions.

## 47. Camera/custom exercise media

Camera plugin and Firebase Storage are packaged; help states custom exercise images can be added.

**TK:** exercise media pipeline already exists; user-generated media requires separate privacy/storage policy.

## 48. Security/privacy boundary

No vulnerability is claimed. Client endpoints, Firebase/Cloudant architecture and packaged identifiers are not automatically secrets. Backend authorization, Cloudant credential lifecycle, exported Android components and data-retention enforcement remain NOT ASSESSABLE.

## 49. Scientific-claim boundary

Alpha help contains training recommendations/claims (e.g. rep ranges, warmup, volume, overtraining, dropset effects). Their presence in the APK is **not evidence of scientific validity**. TK must continue to re-evaluate each comparable calculation/rule through its Evidence Registry.

## 50. Current TK comparison

Current repository evidence confirms:
- exercise-specific Progression Coach is VALIDATED and deterministic;
- AI cannot recalculate recommendation values;
- RPE/RIR are canonical;
- warmup calculation is registry-governed and deliberately not evidence-inflated;
- program autogeneration exists in current capability registry;
- native Health Connect SDK is not implemented;
- plate calculator, supersets, exercise library, analytics and offline architecture already exist.

Therefore Alpha 7.5 is most valuable not as a source of missing fundamentals, but as a **strength-specific decision/UX depth benchmark**.

## 51. Highest-value TK opportunities

1. **Progression feasibility with actual gym weight increments — TK_CHECK_REQUIRED.**
2. **Warmup context/feasibility:** exercise category + experience + available weights, only after evidence review.
3. **Explicit RIR/set periodisation UX** mapped to versioned Decision rules.
4. **Deload as visible scheduled/execution snapshot state.**
5. **10RM as optional formal Calculation Registry candidate**, only after evidence review.
6. **Selectable/visible trend window + sufficiency.**
7. **Metric limitation text** directly in analytics.
8. **Exercise metric schemas** for the expanding MoveKit library.
9. **Plan/workout sharing with historical execution private by default.**
10. **Local DB corruption/recovery testing.**
11. **Keep-awake execution polish.**
12. **Dynamic benchmark of plan generation, recommendation acceptance and logging friction.**

## 52. Dynamic audit gates

Runtime follow-up should test: onboarding context; gym/equipment setup; generator input→plan output; insufficient-equipment behavior; plan edit/activate/repeat; progression recommendation rationale/accept/reject; available-weight rounding; RIR logging and RIR periodisation; set periodisation; deload preview/execution/history; warmup generation across exercise types/experience/weight increments; plate calculator; supersets/dropsets/timers; 1RM/10RM/volume charts; trend-window behavior; bodyweight exercises; custom exercises/media; plan/workout sharing privacy; offline workout completion and replication recovery; Health Connect permissions/export; data export; subscription gates; accessibility; background timer/keep-awake.

## Final status

**ALPHA PROGRESSION 7.5 COMPLETE STATIC AUDIT: CLOSED for supplied-APKM static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server-side plan-generator/progression implementation, backend security and internal tests: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: Alpha Progression's strength is the depth with which it turns explicit strength-training context—equipment, experience, goal, focus, frequency, duration, RIR, sets and deloads—into editable prescriptions. TK already has the stronger governance architecture. The opportunity is to make its deterministic strength decisions equally concrete and visible, especially around **load feasibility, RIR/set periodisation, deload materialisation and warmup feasibility**, without importing Alpha's opaque or unverified training claims.