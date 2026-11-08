# WHOOP 5.466.0 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.whoop.android_5.466.0-570098_4arch_7dpi_73b96b6f34d21ca879d465f9f183309e_apkmirror.com.apkm`  
**SHA-256 APKM:** `4d22677172773f9c025b7c41f8ab51a9be47462a708b8ff493444b1b38fa1c84`  
**Package:** `com.whoop.android` · **version:** 5.466.0 · **versionCode:** 570098  
**Base APK:** 112,590,413 bytes · APKM: 121,774,742 bytes · 4 ABI + 7 density splits.  
**Client:** native Kotlin/Android; Jetpack Compose/Room/DataStore/WorkManager indicators; extensive modular Kotlin feature architecture; proprietary BLE/strap stack.

> Complete static audit for the supplied APKM. WHOOP is both a wearable ecosystem and a health/training interpretation product. Static evidence establishes packaged client capabilities, data boundaries and solution patterns, but does not validate WHOOP's proprietary Recovery/Strain/Healthspan formulas, sensor accuracy, backend rules, clinical claims or runtime quality.

## 1. TK Measurement Model v1.2 assessment

| Criterion | External result | Confidence | Static evidence boundary |
|---|---|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance unavailable |
| B Canonical architecture | 4 | HIGH | 150+ Kotlin modules; explicit health/recovery/sleep/strain/journal/coach/strength/device domains |
| C Runtime integration | 4 | MEDIUM | concrete repositories/services/BLE/workers/feature flows packaged; end-to-end device execution not proven |
| D Persistence/data model | 3 | MEDIUM | Room/DataStore/cache/sync repositories visible; server canonical schema unavailable |
| E Calc/Context/Decision | 3 | MEDIUM | Recovery/Strain/Sleep Need/Healthspan/Behavior Impact outputs visible; proprietary formulas/authority unavailable |
| F Tests/evidence | NOT ASSESSABLE | — | internal tests/scientific registry unavailable |
| G Security/privacy | 3 | MEDIUM | privacy-consent, member export, AI data-privacy and auth modules visible; backend enforcement unavailable |
| H UX/user-facing completion | 2 | MEDIUM | broad packaged flows; actual runtime friction/accessibility not device-proven |
| I Failure/degraded-state handling | 3 | MEDIUM | BLE/sync/firmware/offline/health-connect/error states extensive; recovery semantics not fully runtime-proven |
| J Audit closure | NOT APPLICABLE | — | TK-specific |

No aggregate maturity score is emitted.

## 2. Modular product architecture — major finding

The base APK exposes ~154 Kotlin modules, including `recovery`-related details, `last-night-sleep`, `sleep-coach`, `smart-alarm`, `stress`, `healthspan`, `health-monitor`, `heart-health-common`, `hormonal-insights`, `pregnancy`, `journal`, `behavior-impact`, `ai-insights`, `coach-everywhere`, `weekly-plan`, `weightlifting`, `training`, `realtime-activity`, `health-connect`, `strava`, `member-data-export`, BLE/connectivity and firmware-update modules.

**PAT-HEALTH-DOMAIN-MODULE-001 corroboration:** interpretation domains are explicit modules rather than one monolithic “readiness” screen.

**TK:** this strongly matches the chosen Raw Data → Calculation → Context → Decision → AI separation.

## 3. Recovery Score

Direct strings/models expose Recovery Score, Recovery Details, Recovery Factors, Recovery Impact, high/medium/low states and calibration requirements. The client states HRV is one of the primary Recovery inputs and requires multiple nights/days before full calibration or profile statistics.

The exact Recovery formula, weighting and validation are not established by the APK.

**Pattern PAT-COMPOSITE-COMPONENTS-001:** a composite recovery output should retain visible component/factor explanations and minimum-data/calibration state.

**TK:** do not copy WHOOP's opaque score. TK's registry-backed recovery output can use WHOOP as a UX benchmark while retaining formula/evidence/confidence transparency.

## 4. Minimum-data calibration

User-facing copy includes requirements such as four nights to fully calibrate Recovery, four Recovery scores for some profile statistics and four days for a Strain Target.

**PAT-MIN-DATA-UX-001 corroboration:** minimum observation requirements are surfaced to the athlete.

**TK:** direct fit with Calculation Registry minimum-data-quality requirements.

## 5. Strain and Strain Coach

Dedicated Strain models, zones, Strain/Recovery views and Strain Coach target/haptics/notification flows are packaged. The app can surface a target and notify/haptically signal progress.

The proprietary Strain calculation is not statically validated.

**Pattern PAT-LOAD-TARGET-LIVE-001:** a precomputed training/load target can be consumed by live execution feedback without recalculating the underlying decision in UI.

**TK:** useful for live training guidance if the target originates from Calculation/Decision Engine and retains confidence/constraints.

## 6. Recovery × load visualization

WHOOP explicitly pairs Strain and Recovery in UI concepts.

**Pattern PAT-LOAD-RECOVERY-PAIR-001:** show recent load and recovery context together, but preserve them as separate metrics rather than collapsing every signal into one unexplained recommendation.

**TK:** fits existing load/recovery architecture and “no single signal decides” rule.

## 7. Sleep Need / Sleep Coach

The APK contains Sleep Need, sleep debt, efficiency, consistency, REM/deep/light sleep, Sleep Planner, Sleep Coach, wake-time selection, optimal sleep and weekly-plan integration. Example client text converts Sleep Need into a suggested time-in-bed window.

**Pattern PAT-SLEEP-NEED-BREAKDOWN-001:** sleep recommendation surfaces distinguish need, debt, schedule/wake target and achieved sleep.

**TK:** potentially useful UX benchmark. Any TK sleep-need calculation must be independently evidence-registered; WHOOP's algorithm is not a source of truth.

## 8. Smart Alarm and wearable execution

Smart Alarm has durable local state, schedule/day/week-plan fields, polling, strap state, wake windows, out-of-sync handling and device-triggered alarm events.

**Pattern PAT-WEARABLE-ACTION-STATE-001:** phone decision/state and wearable execution state are reconciled explicitly, including out-of-sync recovery.

**TK:** important if TK ever controls watch/device actions; relevant to Concept2/watch integrations beyond passive import.

## 9. Stress Monitor

Dedicated stress module, graph, HR graph, intervention, notifications and during-sleep/non-activity concepts are packaged.

**Pattern PAT-STRESS-CONTEXT-001:** stress is treated as its own time-varying signal/context, not simply renamed Recovery.

**TK caution:** no medical diagnosis; if stress context is added, provenance and evidence boundaries remain explicit.

## 10. Journal and Behavior Impact — major finding

WHOOP has a dedicated Journal plus Behavior Impact/Recovery Impact domains. Static strings show tracked behaviors, behavior details, impact fetch/update, calendars and a requirement for sufficient logged responses before an impact is calculated.

**Pattern PAT-BEHAVIOR-OUTCOME-001:** user-reported behaviors are longitudinal exposures linked to later outcome statistics only after minimum data.

**TK opportunity:** powerful candidate for nutrition/supplement/recovery habits, but associations must be labelled observational and never presented as causal.

## 11. Behavior impact ≠ causality

The product calls these “impacts”, but the APK cannot establish the statistical method or causal validity.

**Pattern PAT-ASSOCIATION-LABEL-001:** TK should prefer “association/pattern observed” language unless causal evidence exists, even when competitor UX uses stronger wording.

This is an explicit **TK differentiation rule**, not a feature copy.

## 12. Healthspan / WHOOP Age / Pace of Aging

Dedicated Healthspan modules and client models expose WHOOP Age, Pace of Aging, healthspan onboarding and labs-related experiences.

Exact algorithms, reference population and clinical validity are unavailable.

**Pattern PAT-LONGEVITY-COMPOSITE-001:** longevity-style composites should expose underlying biomarkers/components and population scope.

**TK:** REFERENCE_ONLY unless a future scientifically defensible Calculation Registry entry exists. Do not create a “biological age” score merely for parity.

## 13. Health Monitor / Heart Health

Health Monitor, Heart Health, Health Report, HRV, respiratory rate, skin temperature and heart-health modules are packaged, alongside Advanced Labs and clinician-in-the-loop modules.

**Pattern PAT-HEALTH-SUMMARY-001:** provide a bounded health summary surface that organizes canonical measurements without turning it into diagnosis.

**TK:** candidate for Lichaam/Gezondheidsgegevens; medical interpretation remains outside scope.

## 14. Clinician-in-the-loop

The APK contains video scheduling intake/form APIs, appointment summary/time models, clinician headers/notes and visit details.

**Pattern PAT-CLINICIAN-HANDOFF-001:** medical/clinical escalation is a distinct human workflow rather than an AI escalation pretending to be medical care.

**TK:** future-reference only; reinforces the boundary that AI Coach should refer rather than diagnose.

## 15. Advanced Labs

Dedicated Advanced Labs, lab upload and biomarkers modules are visible.

**TK:** laboratory ingestion is not automatically a product requirement. If ever added, it belongs to sensitive Raw Data with explicit provenance, units, reference ranges, consent and medical boundaries.

## 16. WHOOP Coach / AI

The APK contains WHOOP Coach, AI Insights, coach memory, recommended activities, feedback, concise/long response modes and explicit WHOOP Coach data-privacy education.

A user-facing string states that de-identified WHOOP data may be shared with third-party AI technology partners for personalized coaching when enabled.

**Pattern PAT-AI-DATA-PRIVACY-001:** AI personalization gets a dedicated data-use explanation/consent surface.

**TK:** direct comparator for AI Coach governance. TK should remain stricter: canonical derived context only, explicit sensitive scopes, no silent raw-health prompt payloads.

## 17. AI memory

`WHOOP_COACH_MEMORY` is a first-class feature identifier.

**Pattern PAT-AI-MEMORY-SCOPE-001:** persistent coach memory must be an explicit product capability with inspectable scope and privacy semantics.

**TK:** if persistent AI memory is introduced, separate it from athlete canonical records and define what can/cannot be remembered.

## 18. Recommended activities

WHOOP Coach has recommended-activity concepts, but static evidence cannot prove whether these are generated by AI, deterministic services or server rules.

**Result:** recommendation surface OBSERVED; decision authority NOT ASSESSABLE.

**TK:** Decision Engine must remain authority even if AI narrates/reorders approved options.

## 19. Strength Trainer

Dedicated Strength Trainer/weightlifting modules, workout/set state, exercise library overlays and active-workout/discard warnings are packaged.

**Pattern PAT-STRENGTH-WEARABLE-001:** strength execution can be coupled to wearable sensing while retaining explicit exercise/set records.

**TK:** interesting for future sensor enrichment, but exercise/set log remains canonical; wearable-derived muscular estimates are secondary measurements.

## 20. Muscular Load

WHOOP explicitly asks users to link a recent activity to an existing or new workout to calculate Muscular Load, with exercise order required. Custom exercises can be linked to similar existing exercises to provide Muscular Load.

**Pattern PAT-ACTIVITY-WORKOUT-LINK-001:** physiological activity recording and structured strength workout can be separate records linked after the fact.

**TK:** highly relevant. Preserve device activity as Raw Data and structured workout as training truth; link with provenance rather than merging/replacing either.

## 21. Custom exercise mapping

WHOOP asks the user to map a custom exercise to a similar existing exercise for muscular-load interpretation.

**Pattern PAT-EXERCISE-EQUIVALENCE-001:** custom exercise equivalence used for derived calculations must be explicit and reversible.

**TK:** useful with user-created exercises/MoveKit; never silently inherit biomechanical assumptions.

## 22. Weekly Plan

Dedicated weekly-plan models include goals, customization, recovery items and Smart Alarm integration.

**Pattern PAT-WEEKLY-GOAL-PLAN-001:** weekly behavioral/recovery goals can orchestrate multiple features without becoming the canonical training program.

**TK:** could complement program planning, but keep wellness goals separate from workout definitions.

## 23. Personal records, streaks and achievements

Separate modules exist for personal records, streaks and achievements.

**PAT-MILESTONE-001 corroboration:** derived motivational objects remain downstream of canonical activity/performance history.

## 24. Menstrual Cycle Insights

The APK contains menstrual-cycle insight fetch paths, menstrual-cycle assets/metrics and hormonal-insights module.

Static evidence proves a cycle-insight product domain, not causal training rules.

**PAT-CYCLE-BIOMETRIC-VIEW-001 corroboration:** descriptive longitudinal health/training context can coexist with cycle data.

**TK:** no change to conservative Women's Performance evidence rules.

## 25. Pregnancy Coaching

A dedicated pregnancy module and explicit `EnablePregnancyCoachingBody(dueDate=...)` plus pregnancy-insight fetch paths are packaged.

**PAT-PREGNANCY-MODE-001 corroboration:** pregnancy is explicit context.

**TK:** pregnancy/postpartum hard training rules remain DEFER; WHOOP functionality is not scientific evidence.

## 26. Health Connect

A dedicated `health-connect` Kotlin module includes HealthConnect client/checker, body fat/body measurement, exercise-session managers, deletion, permissions and unavailable-client handling.

**PAT-HC-001 corroboration:** WHOOP adds another first-class native Health Connect benchmark.

**TK:** native Android Health Connect remains a verified gap even though TK has provider/OAuth ingestion foundations.

## 27. Strava integration

WHOOP has a dedicated Strava module with API, authorize request, settings and activities models.

**Pattern PAT-PROVIDER-ADAPTER-001:** third-party integrations are isolated behind provider-specific adapters/models.

**TK:** already aligned through wearable provider adapters; corroboration only.

## 28. BLE and proprietary sensor pipeline — major technical finding

WHOOP ships dedicated `whoop-ble`, connectivity core/data-packets, strap metadata/history sync and firmware update modules. Static evidence includes protocol/firmware/pipeline versions, device classes, battery/charging, HR broadcast state, wrist status, packet/event parsing and an embedded firmware DFU package.

**Pattern PAT-DEVICE-PIPELINE-001:** device transport/protocol/firmware is a separate adapter layer upstream of health calculations.

**TK:** directly matches Raw Data Adapter architecture; crucial for Concept2/PM5 and any future BLE device support.

## 29. Firmware lifecycle

Firmware update service and an embedded DFU asset are present.

**Pattern PAT-FIRMWARE-GATE-001:** device capability/version compatibility must be modeled independently from app version.

**TK:** relevant only for devices TK directly manages; external provider firmware should remain provider-owned metadata.

## 30. Strap history sync

Dedicated strap-history-sync and data-sync-service modules indicate reconciliation of device-resident historical data with phone/backend state.

**Pattern PAT-DEVICE-BACKFILL-001:** wearable ingestion supports bounded historical backfill/reconciliation, not only live samples.

**TK:** strong comparator for Concept2/wearable sync; require dedupe/idempotency/provenance.

## 31. Real-time activity and GPS

Realtime-activity and GPS-tracking modules are packaged, with activity start/track/select flows.

**Pattern PAT-LIVE-ACTIVITY-001:** live sensor stream is a temporary execution stream that later materializes into durable activity history.

**TK:** live UI must not become the sole persistence path.

## 32. Heart-rate zones

A dedicated HR zones service and zone UI/data structures are present.

**TK:** already has zone concepts; WHOOP is UX/device comparator, not calculation authority.

## 33. Member data export

Dedicated `member-data-export` module, request/status DTOs and explicit export errors are packaged.

**Pattern PAT-ACCOUNT-EXPORT-001:** user data export is a first-class asynchronous workflow with request/status/error states.

**TK current-state check:** benchmark docs identify generic account export as an open platform gap. This is therefore a **VERIFIED_GAP** candidate, separate from deletion.

## 34. Privacy consent

Dedicated `privacy-consent` and AI data-privacy modules are visible.

**TK:** aligns with sensitive-data scope architecture. Consent must be purpose-specific and auditable.

## 35. Offline/cache/sync

Room/DataStore/cache modules, data-sync-service, strap-history sync and numerous sync/error states are present.

**Pattern PAT-MULTISOURCE-SYNC-001:** phone local state, wearable history and server state are reconciled as distinct sources.

**TK:** particularly useful as Health Data Gateway grows; never collapse source timestamps/provenance.

## 36. Failure/degraded-state handling

The client contains extensive errors for Bluetooth, strap mismatch, firmware, network, health-connect unavailability, sync, sleep coach, weekly plan, behavior impacts and wearable state.

**Pattern PAT-DEVICE-DEGRADED-001:** device-heavy UX needs explicit disconnected/out-of-sync/incompatible/low-battery/unavailable states rather than generic failure.

**TK:** candidate for Concept2/wearable UX and observability taxonomy.

## 37. Widgets

A dedicated Android widget module and widget onboarding are packaged.

**PAT-WIDGET-001 corroboration:** high-frequency health/training status is suitable for bounded widgets.

## 38. Community/chat/video

Community, follower/highlights, challenges, Stream Chat and video-call modules are present.

**TK:** social/team patterns already catalogued from Hevy/TrainHeroic; WHOOP adds corroboration but no need for a second social architecture.

## 39. Entitlements/membership/payments

Membership, entitlements UI/core, payments, gifting, checkout and offer modules are explicit.

**PAT-ROLE-ENTITLEMENT-001 corroboration:** capability availability is modeled separately from training data.

## 40. Observability

Sentry, Firebase and analytics modules are packaged; baseline profiles are present.

**TK:** retain vendor-neutral observability and strict health-data redaction.

## 41. Package/performance

The base is large (~112.6 MB) and split by ABI/density. The feature surface is unusually broad and includes device protocol, media, labs, community and AI. Baseline profile assets indicate startup/runtime optimization work.

TK should not copy WHOOP's breadth into the athlete core; modularity is the transferable lesson.

## 42. Security/privacy static boundary

No exploit or credential leak is claimed. Mobile SDK identifiers are not automatically secrets. BLE/device and health surfaces enlarge the attack/privacy surface, but exported-component/backend authorization require deeper manifest/runtime verification.

Positive client evidence: explicit privacy consent, AI data-privacy education and asynchronous member export.

## 43. Scientific/evidence boundary — critical

WHOOP's Recovery, Strain, Muscular Load, Behavior Impact, Healthspan, WHOOP Age and Pace of Aging are **competitor product outputs**. Their presence in the APK does not establish formula validity, clinical validation or suitability for TK.

TK should benchmark:
- presentation;
- calibration/minimum-data UX;
- component explainability;
- longitudinal comparison;
- device-state handling.

TK should **not** copy proprietary formulas or treat them as evidence.

## 44. New/corroborated solution patterns

New:
- PAT-COMPOSITE-COMPONENTS-001
- PAT-LOAD-TARGET-LIVE-001
- PAT-LOAD-RECOVERY-PAIR-001
- PAT-SLEEP-NEED-BREAKDOWN-001
- PAT-WEARABLE-ACTION-STATE-001
- PAT-STRESS-CONTEXT-001
- PAT-BEHAVIOR-OUTCOME-001
- PAT-ASSOCIATION-LABEL-001
- PAT-LONGEVITY-COMPOSITE-001
- PAT-HEALTH-SUMMARY-001
- PAT-CLINICIAN-HANDOFF-001
- PAT-AI-DATA-PRIVACY-001
- PAT-AI-MEMORY-SCOPE-001
- PAT-STRENGTH-WEARABLE-001
- PAT-ACTIVITY-WORKOUT-LINK-001
- PAT-EXERCISE-EQUIVALENCE-001
- PAT-WEEKLY-GOAL-PLAN-001
- PAT-PROVIDER-ADAPTER-001
- PAT-DEVICE-PIPELINE-001
- PAT-FIRMWARE-GATE-001
- PAT-DEVICE-BACKFILL-001
- PAT-LIVE-ACTIVITY-001
- PAT-ACCOUNT-EXPORT-001
- PAT-MULTISOURCE-SYNC-001
- PAT-DEVICE-DEGRADED-001

Corroborated:
- PAT-MIN-DATA-UX-001
- PAT-HEALTH-DOMAIN-MODULE-001
- PAT-MILESTONE-001
- PAT-CYCLE-BIOMETRIC-VIEW-001
- PAT-PREGNANCY-MODE-001
- PAT-HC-001
- PAT-WIDGET-001
- PAT-ROLE-ENTITLEMENT-001

## 45. TK current-state implications

Highest-value WHOOP-derived work for TK:
1. **Generic account data export** — current benchmark docs already identify this as open; WHOOP provides a concrete async request/status/error pattern.
2. **Device degraded-state taxonomy** for Concept2/wearables.
3. **Device historical backfill/reconciliation** with idempotency/provenance.
4. **Activity ↔ structured workout linking** instead of merging wearable and training truth.
5. **Minimum-data/calibration UX** for recovery/readiness/trends.
6. **Behavior ↔ outcome longitudinal associations** for recovery/nutrition/supplement habits, with non-causal language.
7. **Component-first recovery UX** rather than a black-box score.
8. **Explicit AI data-use/privacy surface** and scoped AI memory.
9. **Health summary** that organizes canonical metrics without diagnosis.
10. **Native Health Connect** remains a verified platform gap.

WHOOP-specific proprietary scores are not roadmap requirements.

## 46. Dynamic audit gates

Runtime follow-up should test onboarding/device pairing, BLE reconnect, firmware update/interruption, strap backfill, live activity/GPS, Recovery calibration and factor explanation, Strain target/haptics, Sleep Need/Sleep Coach/Smart Alarm, Journal/Behavior Impact minimum-data and wording, Strength Trainer/Muscular Load linking, custom-exercise mapping, Health Connect permission/revocation/delete, WHOOP Coach privacy consent/memory, pregnancy/hormonal insights, member export, offline/account switching, Strava, widgets, notifications, accessibility, subscription/entitlement restore and actual network/privacy behaviour.

## Final status

**WHOOP 5.466.0 COMPLETE STATIC AUDIT: CLOSED for supplied-APKM static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server/backend/internal test/scientific-validation audit: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: WHOOP's strongest transferable advantage is not its proprietary Recovery number. It is the mature chain from **sensor/device state → durable synchronized data → calibrated longitudinal metrics → contextual explanation → live guidance**, with explicit degraded states. TK can reproduce that product maturity while remaining more transparent by keeping formulas, evidence, confidence and Decision authority inside its own Calculation & Evidence Architecture.