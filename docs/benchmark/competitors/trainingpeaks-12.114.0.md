# TrainingPeaks 12.114.0 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.peaksware.trainingpeaks_12.114.0-131411598_2arch_7dpi_6lang_493cece8ee9481796d3f84ec1a576107_apkmirror.com.apkm`  
**SHA-256 APKM:** `3221e7d40f97fb71a90342fad97b1bbc548b4016e6193cf4f678113bf4575300`  
**Package/version:** `com.peaksware.trainingpeaks` · 12.114.0 · versionCode 131411598 · min API 29.  
**APKM:** 121,157,311 bytes; base APK 158,390,077 bytes; arm64-v8a + armeabi-v7a; 7 density + 6 language splits.  
**Client:** native Android/Kotlin/Java with Compose + classic layouts; 14 DEX; Room/SQLite + DataStore indicators; Firebase analytics/crash tooling. Large dedicated athlete/coach/calendar/workout/PMC/health-insights domains.

> Complete static audit of the supplied APKM. Static evidence proves packaged client structures, resource flows and model names. It does not prove TrainingPeaks server algorithms, TSS/CTL/ATL formula implementation, runtime UX quality, backend authorization, coaching effectiveness or scientific validity.

## 1. TK Measurement Model v1.2

| Criterion | Result | Confidence | Boundary |
|---|---:|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance unavailable |
| B Canonical architecture | 4 | HIGH | explicit athlete/coach/calendar/workout/event/PMC/health/strength/nutrition domains |
| C Runtime integration | 4 | MEDIUM | many concrete REST/viewmodel/UI bindings; runtime not exercised |
| D Persistence/data model | 3 | MEDIUM | Room/SQLite/DataStore present; full canonical/offline ownership not reconstructed |
| E Calculation/Context/Decision | 4 | MEDIUM | fitness/fatigue/PMC, zones, thresholds, compliance and planned/completed structures visible; server/formula semantics unavailable |
| F Tests/evidence | NOT ASSESSABLE | — | internal tests unavailable |
| G Security/privacy | NOT ASSESSABLE | — | backend enforcement/exported component semantics unavailable |
| H UX completion | 3 | MEDIUM | extensive mature screens/resources; dynamic friction not tested |
| I Failure/degraded handling | 3 | MEDIUM | sync/export/device/auth/degraded states visible but not runtime validated |
| J Audit closure | NOT APPLICABLE | — | TK-specific |

No aggregate score.

## 2. Athlete ↔ coach is a first-class relationship

Direct model/API evidence includes `AthleteAttachedToCoach`, `COACHED_ATHLETE`, coach IDs, coach settings, coach deletion/connection feature flags and dedicated coach notification settings.

**PAT-COACH-RELATIONSHIP-001:** coach linkage is a durable product relationship, not a one-off share action.

**TK:** coach relationship/backend foundations already exist; TrainingPeaks is a strong comparator for completing athlete-facing and coach-facing operational UX.

## 3. Coach comments on workout execution

Resources include `summary_coach_comments.xml`, workout comments, comment rows and post-activity comment headers.

**PAT-COACH-WORKOUT-COMMENT-001:** coach feedback is attached to the same workout object the athlete executed.

**TK:** current F10 evidence says coach notes/feedback remain missing/incomplete. **VERIFIED_GAP candidate** for operational coach loop.

## 4. Planned versus completed is explicit

Resources/models include `summary_planned_completed_header`, `PROP_HAS_PLANNED_VALUES`, `ShowPlanned`, completed and unplanned states.

**PAT-PLAN-ACTUAL-PAIR-001:** planned prescription and completed result coexist on one workout rather than overwriting each other.

**TK:** strongly aligned with canonical preview→snapshot→execution architecture. This should remain an invariant across strength and endurance.

## 5. Compliance is typed

The client contains `compliancePlanned`, `complianceSuccess`, `complianceWarning`, `complianceCaution`, `complianceMissed`, `complianceUnplanned` and dedicated `week_compliance.xml`.

**PAT-COMPLIANCE-STATE-001:** schedule adherence is represented by typed states, not inferred ad hoc in UI.

**TK:** ScheduleAdherenceCore already exists. TrainingPeaks provides a useful athlete-facing state vocabulary benchmark; TK should retain neutral/non-judgmental wording.

## 6. Week-level compliance

Dedicated week-compliance layout indicates aggregation above individual workout state.

**PAT-COMPLIANCE-HORIZON-001:** adherence can be summarized over a planning horizon while preserving workout-level evidence.

**TK:** candidate Inzicht/calendar presentation; aggregation must not hide why sessions were missed/rescheduled.

## 7. Performance Management Chart (PMC) is a dedicated domain

Concrete client structures include `PmcViewModel`, `PmcNavigator`, `ChartPMCFragment`, `PMCReportPreferenceFragment`, PMC tiles/settings/feed layouts and CTL-area resources.

**PAT-LOAD-LONGITUDINAL-VIEW-001:** long-horizon training-load state is a dedicated analytical view, not only a daily readiness card.

**TK:** current readiness/load architecture is strong but Garmin/WHOOP/TrainingPeaks repeatedly corroborate value of separating **today-state** from **longitudinal training state**.

## 8. Fitness and fatigue are distinct performance metrics

The APK has explicit `performance_metric_fatigue`, `Fatigue` model and fitness/fatigue/form styling/resources. Exact calculation semantics are not claimed from strings alone.

**PAT-LOAD-COMPONENTS-001:** long-term and short-term load constructs are presented as separate components before deriving an overall form/status view.

**TK:** calculation candidates must remain evidence-governed. Do not import TrainingPeaks proprietary/implementation-specific formula semantics blindly.

## 9. CTL-area evidence

PMC resources explicitly include `tp_pmc_ctl_area`. This confirms CTL is represented in the packaged client, but does not establish its exact implementation formula.

**TK:** ACWR and other load models retain existing guardrails. TrainingPeaks presence is market evidence, not injury-prediction validation.

## 10. Planned workout retrieval

REST/model evidence includes `/fitness/v1/search/workouts/lastplannedworkout` and `LastPlannedWorkoutRequest`.

**PAT-LAST-PLANNED-REFERENCE-001:** execution/search can explicitly retrieve the last planned workout as a reference object.

**TK:** useful for explainable comparisons and repeat/adaptation flows.

## 11. Structured workouts

Resources include `summary_structured_workout.xml`, workout structure tiles and direct string `Export Structured Workout File`.

**PAT-STRUCTURED-WORKOUT-ASSET-001:** structured prescription is a portable asset separate from free-text workout notes.

**TK:** canonical Workout Builder/program snapshot architecture aligns.

## 12. Structured workout export

The explicit export action indicates workout prescription can leave the app as a structured file.

**PAT-WORKOUT-PORTABILITY-001 corroboration:** TrainingPeaks adds strong endurance-domain evidence for portable workout definitions.

**TK:** especially relevant for future device delivery to Garmin/COROS/etc.; use a canonical internal workout contract plus provider adapters.

## 13. Workout file handling

Resources include `workout_file_button.xml`, `workout_files_layout.xml`, `select_file_to_export_layout.xml` and `export_file_row.xml`.

**PAT-WORKOUT-FILE-001:** raw/structured workout files are visible user-facing assets, not invisible backend blobs.

**TK:** candidate for GPX/FIT/TCX/structured export/import architecture, with provenance and format adapters.

## 14. Workout data graphing

Dedicated workout graph/map/lap/peaks/min-avg-max layouts exist.

**PAT-WORKOUT-DEEP-DIVE-001:** post-workout analysis supports summary → graph/map → laps → peaks → zones rather than one flat metrics page.

**TK:** strong endurance Inzicht benchmark.

## 15. Time in zones

Resources include `workout_time_in_zones_layout`, zone rows, zone charts and settings.

**PAT-ZONE-DISTRIBUTION-001:** zone distribution is a first-class post-workout analytical object.

**TK:** candidate/partly existing across endurance; should use canonical zone definitions with source/version provenance.

## 16. HR, pace and power are parallel workout domains

Separate section headers exist for heart rate, pace and power.

**PAT-ENDURANCE-METRIC-PARALLEL-001:** endurance analysis uses parallel typed metric domains instead of one generic chart pipeline with ambiguous units.

**TK:** matches sport-specific calculation architecture.

## 17. Thresholds are coach-relevant

Client strings include `thresholdsNotifyCoach`.

**PAT-THRESHOLD-COACH-VISIBILITY-001:** athlete threshold changes can become coach-visible events.

**TK:** candidate only with explicit athlete consent and provenance; thresholds may be user/provider/calculated and must not be conflated.

## 18. Zones/preferences

Dedicated zone activity/fragment/settings resources show zones are configurable product entities.

**PAT-ZONE-CONFIG-001:** zones are settings/domain objects, not hardcoded display bands.

**TK:** already directionally aligned; ensure zone source, sport and version are explicit.

## 19. Events/races are first-class

The APK contains athlete-event editing, event legs, goals, results, focus-event and upcoming-event resources.

**PAT-EVENT-GOAL-001:** race/event is a durable planning object linking date, type, goals and results.

**TK:** race goals/HYROX/triathlon context already exists; TrainingPeaks corroborates keeping event context separate from ordinary workout goals.

## 20. Multi-leg events

`athlete_events_leg_edit` and leg result/view resources indicate event legs are structured.

**PAT-EVENT-LEG-001:** multisport event is composed of typed legs rather than encoded as one generic activity.

**TK:** highly relevant to triathlon-brick/race architecture.

## 21. Event results versus goals

Separate event goals and result resources exist.

**PAT-EVENT-GOAL-ACTUAL-001:** pre-event goal and post-event result remain separate comparable objects.

**TK:** fits provenance and longitudinal benchmark philosophy.

## 22. Calendar notes

Dedicated calendar note tiles, attachment items and note layouts are packaged.

**PAT-CALENDAR-NOTE-001:** planning calendar supports contextual notes independent of workouts/events.

**TK:** candidate for illness/travel/context annotations without falsifying training data.

## 23. Calendar note attachments

`calendar_note_attachment_item.xml` indicates notes may carry attachments.

**PAT-CALENDAR-CONTEXT-ASSET-001:** non-workout planning context can include supporting assets.

**TK:** lower priority; privacy/storage implications required.

## 24. Coach notification preferences

Dedicated `notification_settings_coach_view.xml` and coach notification API path are present.

**PAT-COACH-NOTIFICATION-001:** coach relationship has its own notification policy surface.

**TK:** current evidence says coach-event notifications are not fully integrated. **VERIFIED_GAP candidate.**

## 25. Coach deletion/relationship lifecycle

Feature flags include coach connection and full coach deletion behavior.

**PAT-COACH-LIFECYCLE-001:** coach relationship requires connect, active, notification and disconnect/delete lifecycle semantics.

**TK:** important privacy/data-access boundary for F10/F11.

## 26. Workout search/library

Search-workout layouts, library navigation and last-planned retrieval are explicit.

**PAT-WORKOUT-LIBRARY-SEARCH-001:** reusable/planned workouts are searchable assets distinct from historical execution.

**TK:** directly relevant to “Mijn trainingen” as its library grows.

## 27. Strength workout is now a dedicated surface

Resources include `activity_react_strength_workout.xml`, private strength notes, strength workout tiles and exercise-library rows.

**PAT-ENDURANCE-STRENGTH-CONVERGENCE-001:** mature endurance platform can add strength while retaining one calendar/coach/planned-completed framework.

**TK:** TK starts from multisport and already has this advantage; preserve one canonical execution/history model.

## 28. RPE is explicit

Dedicated `rpe_layout.xml` and `rpe_row_layout.xml` exist.

**PAT-RPE-ENTRY-001 corroboration:** RPE is a cross-platform training data primitive, not strength-only.

**TK:** already canonical.

## 29. Nutrition is workout/calendar-adjacent

Resources include nutrition activity, settings, details and tiles plus calorie consumed/expended and macro carb/fat/protein model strings.

**PAT-NUTRITION-TRAINING-CONTEXT-001:** nutrition can live alongside training/calendar objects rather than as a disconnected diet app.

**TK:** existing nutrition roadmap already references pre/during/post context; this APK independently corroborates TrainingPeaks as a relevant integration benchmark.

## 30. Macro data

Explicit nutrition macro models exist for carbohydrate, fat and protein.

**TK:** existing kcal/protein/carbs/fat foundation aligned. TrainingPeaks is not sufficient evidence for micronutrient/supplement depth; Cronometer remains needed.

## 31. HRV Health Insights

The APK has a dedicated HRV format/style/chart domain and strings including `feature_healthinsights_hrv`, plus HRV4Training source option.

**PAT-HEALTH-METRIC-SOURCE-001:** longitudinal health metric UI can expose/select a source rather than silently merge providers.

**TK:** extremely aligned with provider provenance requirements.

## 32. HRV4Training source

`HRV4TRAINING_OPTION_VIEW_STATE` and `selectedHRVSource` show a source-selection concept.

**PAT-HRV-SOURCE-SELECT-001:** athlete can have multiple HRV sources with explicit selected source.

**TK:** strong future Connected Athlete requirement: never silently mix Garmin/WHOOP/Health Connect/manual HRV baselines.

## 33. Sleep

Explicit sleep hours, quality and deep/light/REM metrics/models are packaged.

**PAT-SLEEP-DIMENSIONS-001 corroboration:** sleep is multidimensional, not only duration.

**TK:** external data model already allows stages; provider provenance and data quality remain essential.

## 34. Apps & devices surface

Dedicated `apps_devices_activity.xml` and navigation graph exist.

**PAT-CONNECTION-HUB-001:** external providers/devices get one discoverable management surface.

**TK:** relevant as provider count grows beyond Google Health/Concept2.

## 35. TrainingPeaks as provider gap in TK

Current TK repository explicitly lists TrainingPeaks among NOT IMPLEMENTED sport platforms/providers.

**PAT-TRAININGPEAKS-CONNECTOR-001:** potential future connector should map planned/completed structured workouts, events and relevant metrics through the existing Provider Integration Contract.

**TK status:** **VERIFIED_GAP**, but implementation priority depends on API/developer access and product value; APK evidence alone does not prove public API availability.

## 36. Workout sharing

`fragment_react_workout_share.xml` exists.

**PAT-WORKOUT-SHARE-ASSET-001 corroboration:** workout/prescription sharing is a distinct surface.

**TK:** candidate social/program library capability with privacy boundaries.

## 37. Private workout notes

Dedicated private workout and private strength workout note layouts exist.

**PAT-NOTE-VISIBILITY-001:** notes require explicit visibility scope, especially in coach relationships.

**TK:** critical for future coach feedback/social convergence: private athlete notes must not become coach-visible by default.

## 38. Post-activity comments

Resources distinguish post-activity comments and coach comments.

**PAT-FEEDBACK-SCOPE-001:** social/comment feedback and coach feedback can be separate scopes on the same activity.

**TK:** valuable for future social architecture.

## 39. Athlete type

Packaged athlete types include cyclist, runner, swimmer, triathlete, duathlete, mountain biker, adventure racer and others.

**PAT-ATHLETE-SPORT-PROFILE-001:** athlete profile can carry primary sport identity without restricting workout types.

**TK:** Context Engine already supports sport context; preserve multi-sport flexibility.

## 40. Health insight + training load separation

HRV/sleep health-insight domains coexist with PMC/load domains rather than being collapsed into one composite score.

**PAT-RECOVERY-LOAD-SEPARATION-001:** recovery signals and training-load state remain analytically distinct.

**TK:** strongly supports current architecture and guardrails.

## 41. Premium/coach segmentation

Premium-account error codes, coach upgrade resources and subscription benefits are packaged. Exact entitlements/backend enforcement are not statically proven.

**TK:** pricing benchmark only.

## 42. TrainingPeaks Virtual linkage

The client contains “Experience TrainingPeaks Virtual + Premium.” Exact integration depth was not reconstructed.

**Result:** ecosystem linkage OBSERVED; capability semantics NOT ASSESSABLE.

## 43. Room/SQLite/DataStore

AndroidX Room, SQLite and DataStore libraries are packaged.

**PAT-NATIVE-PERSISTENCE-001:** mature native client uses structured local persistence/preferences. Exact offline workout queue semantics are not established from library presence.

## 44. Offline boundary

Material icons/strings alone are insufficient to claim complete offline-first behavior. Existing TK benchmark prose previously called TrainingPeaks “offline-first”; this APK pass does **not** independently prove that full claim.

**CORRECTION CANDIDATE:** downgrade old unsourced “TrainingPeaks offline-first logging with background-sync” wording unless separately runtime/documentation-verified.

## 45. Security/privacy boundary

No vulnerability or credential leak is claimed. Backend authorization, coach access controls, API token handling, data retention and exported Android component semantics remain NOT ASSESSABLE from this pass.

## 46. Formula/evidence boundary

The client clearly packages PMC/fitness/fatigue/CTL-related concepts, but exact formulas and scientific interpretation are not established here. TK must not copy TSS/CTL/ATL/TSB semantics as injury/readiness truth without separate evidence review and licensing/IP review where relevant.

## 47. Current TK comparison

Current repository evidence confirms:
- TrainingPeaks provider/platform is NOT IMPLEMENTED.
- ScheduleAdherenceCore exists and is VALIDATED.
- coach relationship/program assignment core is mature, while coach notes/feedback and coach-event notifications remain incomplete.
- event/race context, structured workouts, zones, HRV/sleep, nutrition context and provider provenance already have foundations.
- workout execution remains one canonical preview→snapshot→execution→history chain.
- nutrition benchmark docs already cite TrainingPeaks for workout-adjacent context but some claims predate this artifact audit.

## 48. Highest-value TK opportunities

1. **Coach feedback attached to executed workout — VERIFIED_GAP candidate.**
2. **Coach-specific notification policy/events — VERIFIED_GAP candidate.**
3. **TrainingPeaks connector — VERIFIED_GAP, priority/API access to assess separately.**
4. **Longitudinal training-state view distinct from daily readiness.**
5. **Typed compliance/adherence states in calendar/weekly UX.**
6. **Planned vs completed side-by-side as a universal execution invariant.**
7. **Structured workout portability/provider delivery.**
8. **Explicit HRV/source selection and no silent source mixing.**
9. **Note visibility scopes: private athlete vs coach vs social.**
10. **Multi-leg event model for triathlon/complex races.**
11. **Workout deep-dive hierarchy: summary → laps/peaks/zones/map/graphs.**
12. **Revalidate old “offline-first TrainingPeaks” benchmark claim before retaining it.**

## 49. Dynamic audit gates

Runtime follow-up should test: athlete onboarding/sport profile; coach connect/disconnect; coach workout assignment; planned→completed comparison; coach comments and private notes; coach notifications; calendar drag/reschedule; missed/unplanned/compliance states; event goals/legs/results; structured workout creation/export; device delivery; workout files; maps/laps/peaks/zones; PMC/fitness/fatigue/form explanations and data sufficiency; threshold/zone edits; HRV source selection; sleep/health insights; nutrition entries around workouts; strength workout flow; RPE; workout search/library/share; offline start/complete/reconnect; apps/devices; export; accessibility; subscription boundaries.

## Final status

**TRAININGPEAKS 12.114.0 COMPLETE STATIC AUDIT: CLOSED for supplied-APKM static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server-side formulas, coach authorization, public API availability and internal tests: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: TrainingPeaks' transferable advantage is the **operational continuity between plan, calendar, athlete, coach, execution and longitudinal analysis**. TK already has many individual building blocks. The strongest remaining opportunity is to make them feel like one traceable chain: **event/context → planned workout → executed actual → adherence/load interpretation → coach feedback → next plan**, while keeping TK's stronger evidence/provenance guardrails.