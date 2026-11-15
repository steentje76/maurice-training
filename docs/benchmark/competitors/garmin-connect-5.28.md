# Garmin Connect 5.28 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.garmin.android.apps.connectmobile_5.28-11459_2arch_1dpi_22lang_e6d7e4cf421a989edb93bf26bfbf7a80_apkmirror.com.apkm`  
**SHA-256 APKM:** `9c74bc1e7378627ebbf780671ebc28430e5a4d5dc710ed34aa2557c2cf6ee9a0`  
**Base APK SHA-256:** `a1b138f1d6be2c3ffcc69750e57e1a31545d0704173c2822c2bc1bd4a4550599`  
**Package:** `com.garmin.android.apps.connectmobile` · **version:** 5.28 · **versionCode:** 11459  
**minSdk:** 28 · arm64-v8a + armeabi-v7a · 480 dpi · 22 language splits.  
**APKM uncompressed total:** 210,358,141 bytes · **base APK:** 73,569,044 bytes · **14 DEX files**.  
**Client:** native Android/Kotlin/Java; Jetpack Compose + classic Android; Room/DataStore/Health Connect/Mapbox indicators.

> Complete static audit for the supplied APKM. Garmin Connect is a broad multisport/device ecosystem. Static evidence proves packaged client concepts and integration structures, not Garmin's proprietary physiological algorithms, device accuracy, backend behavior, runtime usability or scientific validation.

## 1. TK Measurement Model v1.2

| Criterion | Result | Confidence | Boundary |
|---|---:|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance unavailable |
| B Canonical architecture | 4 | HIGH | deep explicit domains across performance, training, health, devices, courses, social and integrations |
| C Runtime integration | 4 | MEDIUM | concrete device/workout/Health Connect/LiveTrack/adaptive-coach paths packaged; device runtime not proven |
| D Persistence/data model | 3 | MEDIUM | Room/DataStore/cache/domain DTOs visible; backend canonical schema unavailable |
| E Calc/Context/Decision | 3 | MEDIUM | Training Readiness/Status/loads/VO2max/FTP/threshold/race prediction etc. visible; formulas and decision authority unavailable |
| F Tests/evidence | NOT ASSESSABLE | — | internal tests/evidence registry unavailable |
| G Security/privacy | NOT ASSESSABLE | — | static SDK/component presence insufficient for backend/privacy enforcement score |
| H UX completion | 2 | MEDIUM | huge packaged surface; runtime friction/discoverability/accessibility not proven |
| I Failure/degraded handling | 3 | MEDIUM | extensive device/data/plan/metric error states visible |
| J Audit closure | NOT APPLICABLE | — | TK-specific |

No aggregate maturity score.

## 2. Multisport/device architecture — major finding

Garmin's client has very broad explicit domains for workouts, training plans, adaptive coaching, running/cycling performance, pregnancy/menstrual tracking, hydration/nutrition, courses/segments, gear, challenges, LiveTrack, incident detection, Connect IQ, Tacx, Health Connect and device configuration.

**PAT-MULTISPORT-DOMAIN-001:** sport-specific capability can share platform infrastructure while preserving sport/device-specific models.

**TK:** directly supports the existing sport-neutral interval/execution foundation with sport-specific Calculation/Context adapters.

## 3. Training Readiness

Direct client evidence includes `Training readiness`, fetch/error paths and dedicated performance/training dashboard structures.

The exact Garmin Training Readiness formula and weighting are not exposed.

**PAT-READINESS-FACTORS-001:** readiness is a downstream interpretation surface, not raw sensor data.

**TK:** ALREADY PRESENT architecturally. Garmin is a UX comparator only; TK's Calculation Registry and Decision Rules remain authoritative.

## 4. Training Status

Dedicated `Training Status`, current status, last device used and weekly summary fetch paths are visible.

**PAT-TRAINING-STATUS-LONG-001:** distinguish day-level readiness from longer-horizon training-status/trend interpretation.

**TK:** strong candidate for clearer separation of “today” readiness from longitudinal progression/load state.

## 5. Acute and chronic load

The APK contains `AcuteTrainingLoadDTO(acwrPercent=...)`, Acute Load UI/state, `acuteTolerance`, and Chronic Load concepts.

**Critical TK boundary:** Garmin's presence of ACWR-like fields is not evidence that ACWR predicts injury or defines a universal safe zone.

**PAT-LOAD-HORIZON-001:** expose acute and longer-horizon load separately, with provenance and descriptive status.

**TK:** calculation may exist, but existing rule remains: ACWR must never become a hard injury predictor or universal safe range.

## 6. Body Battery

Body Battery models include min/max/recent values and dynamic feedback events.

Formula is proprietary/not statically validated.

**PAT-ENERGY-COMPOSITE-001:** a consumer energy composite is useful as a presentation benchmark but should not replace component metrics.

**TK:** REFERENCE_ONLY. Do not create a Body-Battery clone without independent evidence.

## 7. HRV

Daily HRV fetch paths and HRV data structures are packaged.

**TK:** Garmin HRV should enter TK as provider data/provenance, not replace canonical TK LnRMSSD/baseline calculations where comparable. Provider-derived outputs remain labelled external.

## 8. Sleep

Extensive sleep models and Sleep Score concepts are present.

**PAT-SLEEP-PROVIDER-RAW-001:** separate provider-recorded sleep stages/duration from provider proprietary sleep score.

**TK:** ingest raw/standardized sleep fields when possible; never equate Garmin Sleep Score with TK recovery truth.

## 9. VO2max

Current/daily VO2max fetch paths and onboarding/metric structures are packaged.

**PAT-PROVIDER-FITNESS-METRIC-001:** provider-estimated fitness metrics retain provider provenance and should not silently become locally calculated equivalents.

**TK:** important for future Garmin ingestion. A Garmin VO2max and a TK-derived estimate are distinct measurements.

## 10. FTP and running thresholds

Direct evidence includes current FTP, functional threshold power, running FTP, lactate-threshold heart rate and lactate-threshold speed.

**PAT-THRESHOLD-PROVENANCE-001:** measured/device-estimated/user-entered thresholds remain separate sources even if they share units.

**TK:** strong fit with cycling/running Calculation Registry and future threshold overrides.

## 11. Race prediction

A current Race Predictor data path is present.

**PAT-PREDICT-PERFORMANCE-001:** performance predictions should retain model/source/date and never masquerade as measured performance.

**TK:** candidate for future race projections only with independently validated formulas/confidence.

## 12. Fitness Age

Current/daily Fitness Age paths are packaged.

**TK:** REFERENCE_ONLY. Like WHOOP Age, competitor presence is not enough evidence to build a biological/fitness-age score.

## 13. Heat and altitude acclimation

Dedicated HeatAltitudeAcclimation DTO/UI, heat-acclimation percentage and altitude-acclimation views are visible.

**PAT-ENV-ACCLIMATION-001:** environmental adaptation is a time-varying context derived from exposure history, distinct from weather at one workout.

**TK:** strong future Context Engine candidate because TK already attaches environmental context to outdoor sessions; formula/evidence would need its own registry.

## 14. Performance Condition

Performance Condition chart/data validation paths are packaged.

**PAT-INTRA-ACTIVITY-CONDITION-001:** transient within-session condition can be modeled separately from daily readiness and long-term status.

**TK:** candidate for endurance live/trend UX, but not a reason to invent a proprietary composite.

## 15. Training Effect

Aerobic Training Effect structures are visible.

**PAT-WORKOUT-EFFECT-001:** post-workout training effect is a derived interpretation downstream of actual workout load.

**TK:** could map to evidence-backed load/adaptation summaries, never substitute a provider score as canonical.

## 16. Adaptive Garmin Coach

The APK contains `AdaptiveCoachingWorkoutDTO`, Garmin Coach Plan, device-loading success/failure and adaptive-coach workout state.

**PAT-ADAPT-DEVICE-DELIVERY-001:** adaptive plan decision and device workout delivery are separate stages with explicit success/failure.

**TK:** highly relevant if generated/adjusted TK sessions are later pushed to wearables. Decision Engine remains authority; delivery adapter cannot alter prescription.

## 17. Workout ecosystem

Thousands of workout-related symbols plus structured workouts, plans, exercise concepts and device-loading paths are packaged.

**PAT-WORKOUT-PORTABILITY-001:** structured workout definitions are portable artifacts that can be rendered/executed on multiple endpoints.

**TK:** strong future direction for phone/watch/Concept2 exports while retaining one canonical workout definition.

## 18. PacePro

Dedicated PacePro domain/routes/models are visible.

**PAT-PACING-PLAN-001:** race pacing strategy is a precomputed plan separate from live actual pace.

**TK:** relevant to running/endurance intelligence; Calculation Engine must produce targets, execution compares actual vs planned.

## 19. Power Guide

Dedicated Power Guide activities/domain evidence is packaged.

**PAT-POWER-PACING-001:** cycling/running power guidance can be represented as a route/event-specific planned target layer.

**TK:** candidate after power zones/FTP product experience matures; not before canonical inputs/evidence.

## 20. Heart-rate zones

The base includes localized HR-zone tutorials and HeartRateZones feature handlers.

**PAT-ZONE-EDUCATION-001:** calculation/zone setup is paired with athlete-facing explanation of training methods and limitations.

**TK:** current audit docs note HR-zone gaps in some endurance intelligence. Before building, establish evidence-backed zone calculation/source semantics.

## 21. Strength statistics

`StrengthStatsDto`, strength workout/exercise concepts and extensive exercise/workout structures are present.

Static evidence does not prove Garmin's strength programming depth equals Fitbod/Hevy.

**Result:** strength tracking/statistics OBSERVED; adaptive strength intelligence NOT ASSESSABLE.

## 22. Personal records

Dedicated Personal Records state/types/fetch paths exist.

**PAT-MILESTONE-001 corroboration:** PRs remain derived downstream objects from canonical activity history.

## 23. Courses and segments

Very large Course/Segment domains plus Mapbox integration are packaged.

**PAT-ROUTE-ASSET-001:** route/course is a reusable training asset distinct from the completed activity.

**TK:** useful if route-based endurance planning is added; course definition ≠ activity execution.

## 24. LiveTrack

A dedicated LiveTrack service and extensive LiveTrack/group ride/Strava Beacon concepts are packaged.

**PAT-LIVE-SHARE-001:** live location/activity sharing is a temporary consented projection, separate from durable training history.

**TK:** future social/safety reference; explicit privacy/expiry required.

## 25. Incident detection

Incident-detection concepts are packaged.

**TK:** REFERENCE_ONLY. Safety-critical functionality requires native/device proof and operational response design; do not copy casually.

## 26. Gear tracking

Large Gear domain and activity-gear linking are visible.

**PAT-GEAR-LIFECYCLE-001:** equipment can be linked to activities and accumulate usage history.

**TK:** candidate for shoes/bikes/erg equipment if athlete value justifies it; useful for maintenance context, not training truth.

## 27. Health Connect — major finding

Garmin Connect contains a dedicated `googlehealthconnect` implementation, repository/delegate classes, support/permission checks and explicit write paths. Android Health Connect permission constants for many record classes are packaged, including exercise, sleep, HR/HRV, weight, hydration, menstruation, nutrition, oxygen saturation, respiratory rate, skin temperature and more.

**Important static boundary:** library permission constants do not prove Garmin requests every one at runtime. App-specific `writeDataToHealthConnect` and repository evidence proves a real Health Connect integration, not the full active record set.

**PAT-HC-001 corroboration:** native Health Connect is now independently visible across multiple benchmark apps.

**TK:** verified platform gap remains.

## 28. Health Connect degraded states

Explicit strings state Health Connect may be unsupported or have no permissions and suppress writes accordingly.

**PAT-HC-GUARD-001:** provider export/import fails closed when platform support or permission is absent.

**TK:** direct future Health Data Gateway requirement.

## 29. Menstrual cycle and pregnancy

Large menstrual-cycle and pregnancy domains are packaged, including explicit pregnant/not-pregnant routing and pregnancy glucose/snapshot concepts.

**PAT-PREGNANCY-MODE-001 and cycle-context patterns corroborated.**

**TK:** no change to evidence-based DEFER for pregnancy/postpartum hard training rules.

## 30. Hydration

Dedicated Hydration settings/goals plus Health Connect hydration record support are visible.

**PAT-HYDRATION-GOAL-001:** hydration logging/goal is its own behavior domain, optionally interoperable with health platform records.

**TK:** nutrition/hydration foundation already exists; Garmin is an interoperability/UX comparator.

## 31. Nutrition + MyFitnessPal

Nutrition models and a dedicated MyFitnessPal integration surface are packaged.

**PAT-NUTRITION-PROVIDER-001:** nutrition can be imported from a specialist provider rather than forcing duplicate logging.

**TK:** candidate integration strategy; imported nutrition must preserve source and completeness.

## 32. Strava

Dedicated Strava models/settings/status paths are present.

**PAT-PROVIDER-ADAPTER-001 corroboration.**

## 33. Tacx

Tacx-specific user/device/workout indicators are packaged.

**PAT-ECOSYSTEM-DEVICE-BRIDGE-001:** first-party hardware sub-ecosystems can share account/training infrastructure while retaining device-specific adapters.

**TK:** Concept2 is analogous at architecture level, though not first-party.

## 34. Connect IQ

Extensive Connect IQ device/app integration structures and `iq_devices.xml` are packaged.

**PAT-DEVICE-APP-EXTENSION-001:** wearable/device extensions can consume platform data without becoming the canonical calculation source.

**TK:** future watch/companion architecture reference.

## 35. Audio prompts

Many localized audio-prompt assets are included.

**PAT-AUDIO-GUIDANCE-001:** execution guidance can be delivered hands-free while visual UI remains secondary.

**TK:** valuable for running/cycling/erg intervals; targets originate from canonical execution state.

## 36. Map/navigation infrastructure

Mapbox SDK assets and route/course structures are packaged.

**TK:** live GPS/maps remain an identified endurance gap in current benchmark docs. Garmin supplies a mature comparator, but implementing navigation is much larger than merely recording GPS.

## 37. Challenges, badges and social

Large Challenge, Badge, Connection and Group domains are visible.

**TK:** social/gamification already has its own roadmap/architecture. Garmin mainly corroborates downstream achievement/challenge projections.

## 38. Device capability gating

Many client states reference device-specific capabilities (e.g. acute training load capable, rowing capable, respiration capable, feature handlers).

**PAT-DEVICE-CAPABILITY-GATE-001:** feature availability is determined by explicit device capability metadata, not guessed from device name alone.

**TK:** strong pattern for Concept2/PM5, Garmin, watch and future gym-equipment integrations.

## 39. Preferred device / multi-device state

Static evidence includes preferred activity tracker/device selection and “last device used” for training status.

**PAT-MULTIDEVICE-SOURCE-001:** when multiple devices can supply the same domain, preferred/source device identity remains explicit.

**TK:** important for deduplication and provenance in Health Data Gateway.

## 40. Sync/error handling

The client has explicit failures for Training Readiness, Training Status, VO2max, FTP, lactate thresholds, Race Predictor, Fitness Age, adaptive workout device loading, Body Battery, HRV, sleep and device settings.

**PAT-DOMAIN-ERROR-001:** sync/fetch errors identify the metric/domain rather than collapsing into a generic “sync failed”.

**TK:** candidate observability and user-facing degraded-state refinement.

## 41. Offline/local persistence

Room/DataStore dependencies and cache/error paths are present. Static evidence is insufficient to reconstruct Garmin's conflict/idempotency semantics.

**Result:** local persistence OBSERVED; lossless offline reconciliation NOT ASSESSABLE.

## 42. Observability/product analytics

Firebase/Crashlytics and Adobe indicators are packaged; Mapbox and other SDKs are present.

**TK:** vendor-neutral telemetry architecture remains preferable; health values remain prohibited in logs.

## 43. Package/performance

The APKM uncompressed content is ~210 MB across base, ABI, density and language splits. Base has 14 DEX files. Baseline profile assets are present.

The transferable lesson is modular capability gating and split delivery, not copying Garmin's product breadth.

## 44. Security/privacy boundary

No exploit, credential exposure or insecure exported component is claimed. A full binary-manifest semantic/exported-component/network-security audit is not established by the available static tooling, so G remains NOT ASSESSABLE rather than converting unknown to zero.

## 45. Scientific/evidence boundary — critical

Garmin's Training Readiness, Training Status, Body Battery, Sleep Score, Fitness Age, Race Predictor, Training Effect and acclimation outputs are product evidence, not independent scientific evidence for TK.

Provider metrics may be ingested as **external labelled inputs**. They may never silently replace TK Calculation Registry outputs or create Decision Rules.

ACWR deserves special protection: the client contains an `acwrPercent` field, but TK's existing rule remains unchanged — ACWR is descriptive load context, not a hard injury predictor or universal “safe zone”.

## 46. Current TK comparison

Current repository evidence confirms:
- TK already has extensive readiness/recovery infrastructure and canonical Decision Rules.
- Garmin OAuth2/PKCE and sync foundations exist, but live Garmin activation remains externally blocked by developer-program access/credentials.
- Current benchmark docs identify Garmin-style full activity-cloud-sync/multi-sensor depth as not yet fully available.
- live GPS remains an endurance gap.
- generic account export remains open (already verified in WHOOP audit).
- native Android Health Connect remains a gap.
- TK already has sport-neutral structured intervals and running/cycling/swimming foundations.
- TK has explicit external-data provenance rules: provider scores such as WHOOP Recovery are not equated with TK readiness; the same must apply to Garmin composites.

## 47. Highest-value TK opportunities

1. **Native Health Connect** with permission/support fail-closed behavior.
2. **Provider provenance for VO2max/FTP/lactate threshold/HRV/sleep** so Garmin estimates never overwrite TK-derived values.
3. **Device capability registry** rather than device-name branching.
4. **Multi-device source/preferred-device resolution** for duplicate health/activity streams.
5. **Training Status vs daily Readiness separation** in longitudinal UX.
6. **Heat/altitude acclimation context** as a future evidence-registered Context Engine domain.
7. **Workout portability/device delivery** with delivery success/failure distinct from Decision generation.
8. **Live GPS/routes/courses** as a substantial endurance roadmap candidate, not a quick feature.
9. **Audio guidance** for hands-free endurance/erg execution.
10. **Domain-specific sync/degraded errors** across wearable metrics.

## 48. Dynamic audit gates

Runtime follow-up should test device pairing/switching/preferred tracker, dashboard customization, Training Readiness factors/calibration, Training Status and acute/chronic load wording, Body Battery explanation, HRV/sleep/VO2max/FTP/lactate-threshold provenance, adaptive Garmin Coach generation and device delivery, workout start/execution, PacePro/Power Guide, courses/maps/GPS, LiveTrack/privacy expiry, Health Connect permission selection/revocation/write/delete, menstrual/pregnancy context, hydration/nutrition/MyFitnessPal, Strava/Tacx/Connect IQ, offline/reconnect, multi-device dedupe, accessibility, notifications and account/privacy/export behavior.

## Final status

**GARMIN CONNECT 5.28 COMPLETE STATIC AUDIT: CLOSED for supplied-APKM static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server/backend/internal tests/proprietary algorithm validation: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: Garmin's advantage is the breadth and explicit capability modeling of a mature multisport/device ecosystem. TK should not imitate every Garmin score. The transferable architecture is **device capability + source provenance + sport-specific calculations + longitudinal status + portable workout delivery**, while TK can differentiate by keeping formulas, evidence, confidence and Decision authority explicit.