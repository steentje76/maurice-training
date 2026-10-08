# Oura 7.24.0 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.ouraring.oura_7.24.0-260901041_1arch_2dpi_15lang_e3fea33ee92eab267054d88f964df18c_apkmirror.com.apkm`  
**SHA-256 APKM:** `e04c1487a1f3b0faeab2c40af88e6f93c38522f540f691558b81f4b7a25842cb`  
**Package/version:** `com.ouraring.oura` · 7.24.0 · versionCode 260901041 · min API 30.  
**APKM:** 153,709,898 bytes; base APK 131,476,141 bytes; arm64-v8a split; xxhdpi/xxxhdpi + 15 language splits.  
**Client:** native Android/Kotlin/Java; 11 DEX; Compose/classic Android indicators; Room + DataStore + WorkManager; CameraX; Braze; Sentry; Health Connect record classes.

> Complete static audit of the supplied APKM, supplemented only where explicitly labelled with current official Oura documentation. Proprietary score formulas, sensor firmware algorithms and server-side models are not reconstructed or treated as open evidence.

## 1. TK Measurement Model v1.2

| Criterion | Result | Confidence | Boundary |
|---|---:|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance unavailable |
| B Canonical architecture | 4 | HIGH | explicit sleep/readiness/activity/stress/heart-health/tags/rest-mode/device domains |
| C Runtime integration | 4 | MEDIUM | concrete Health Connect, device, background, UI/model structures; runtime not exercised |
| D Persistence/data model | 3 | MEDIUM | Room/DataStore/WorkManager present; full ownership/schema not reconstructed |
| E Calculation/Context/Decision | 4 | MEDIUM | contributor/baseline/stress/readiness/cardio-capacity/CVA concepts visible; exact proprietary formulas unavailable |
| F Tests/evidence | NOT ASSESSABLE | — | internal tests unavailable |
| G Security/privacy | NOT ASSESSABLE | — | backend enforcement/exported semantics unavailable |
| H UX completion | 3 | MEDIUM | mature feature resources; dynamic friction/accessibility not tested |
| I Failure/degraded handling | 3 | MEDIUM | device/retry/background/rest-mode paths visible; runtime not validated |
| J Audit closure | NOT APPLICABLE | — | TK-specific |

No aggregate score.

## 2. Readiness is a composite with visible contributors

Direct APK strings include `DAILY_READINESS_SCORE`, `CHART_READINESS_SCORE`, `CHART_READINESS_HEART_RATE_VARIABILITY`. Official Oura documentation states Readiness combines multiple contributors against personal averages and uses both recent and longer-term context.

**PAT-COMPOSITE-COMPONENTS-001 corroboration:** expose component signals behind a composite instead of only one opaque score.

**TK:** already a core requirement. Oura strengthens the case for showing factors, confidence and source rather than one unexplained readiness number.

## 3. Personal baseline before interpretation

Official Oura docs say contributor interpretation is based on personal averages; establishing ranges can take up to two weeks and long-term comparison uses roughly two months.

**PAT-PERSONAL-BASELINE-001:** physiological deviation is interpreted relative to the athlete's own baseline, not a population threshold alone.

**TK:** HRV baseline architecture already exists. Corroborates baseline-first recovery design.

## 4. Short-term versus long-term windows

Oura distinguishes daily/short-term signals from 14-day weighted balance contributors and longer-term averages.

**PAT-MULTIHORIZON-BASELINE-001:** retain separate temporal horizons rather than compressing all history into one rolling average.

**TK:** candidate generic Context/Calculation pattern across HRV, sleep, load and activity.

## 5. HRV is a contributor, not sole truth

APK exposes HRV readiness charting; official docs place HRV Balance among multiple contributors.

**TK:** strongly validates existing rule that HRV must not independently command a rest day or diagnose overtraining.

## 6. Resting heart rate deviation

Official Oura readiness contributor logic compares nightly RHR with personal long-term values.

**PAT-RHR-DEVIATION-001:** recovery context uses deviation from personal baseline with provenance.

**TK:** already candidate/implemented recovery metric; preserve confidence/data quality.

## 7. Temperature deviation

APK includes `BasalBodyTemperature`, `BodyTemperature`, `BodyTemperatureRecord`; official Symptom Radar docs include average body temperature among monitored biometrics.

**PAT-TEMP-DEVIATION-001:** temperature is useful as a deviation/context signal rather than an isolated absolute “recovery score”.

**TK:** wearable temperature requires provider/source/method semantics; avoid medical diagnosis.

## 8. Respiratory-rate deviation

Official Symptom Radar uses respiratory rate among multiple deviations.

**PAT-RESPIRATORY-DEVIATION-001:** respiratory rate can contribute to multi-signal strain context.

**TK:** candidate external health metric, not standalone illness detection.

## 9. Symptom Radar is multi-signal

Official Oura docs describe Symptom Radar as looking for significant changes across temperature, respiratory rate, RHR, HRV and inactivity.

**PAT-PHYSIO-DEVIATION-RADAR-001:** anomaly/strain detection should require a multi-signal context layer and conservative wording.

**TK:** high-value future pattern; Decision Engine must not diagnose disease.

## 10. Recovery action state / Rest Mode

APK contains explicit “rest mode event” handling. Oura product documentation uses rest/recovery guidance around strain.

**PAT-RECOVERY-MODE-001:** user can enter an explicit recovery/rest state that changes goals/presentation without deleting underlying data.

**TK:** candidate for illness/recovery/travel contexts; must remain user-visible and reversible.

## 11. Daytime stress and restorative time

APK includes `CHART_STRESS_RESTORATIVE_TIME`; official Oura Resilience docs combine daytime stress, restorative time and nighttime recovery.

**PAT-STRESS-RECOVERY-BALANCE-001:** stress and restorative periods are separate time-series signals before a longer-horizon resilience interpretation.

**TK:** candidate after evidence review and sensor-source availability.

## 12. Resilience is longitudinal

Official Oura docs define Resilience as a weeks-long estimate of balance between physiological stress and recovery.

**PAT-RESILIENCE-LONGITUDINAL-001:** long-horizon recovery/stress state is distinct from today's readiness.

**TK:** parallels Garmin Training Status / WHOOP longitudinal patterns. Candidate Inzicht layer, not necessarily a new proprietary-style score.

## 13. Readiness, Sleep and Activity are separate scores

Oura explicitly keeps three top-level domains rather than one universal wellness score.

**PAT-DOMAIN-SCORE-SEPARATION-001:** recovery/sleep/activity summaries remain separable even when they influence each other.

**TK:** good architecture lesson: do not collapse sleep quality, training load and readiness into one irreversible number.

## 14. Sleep is multidimensional

Official Oura Sleep Score uses total sleep, efficiency, latency and additional contributors; APK contains extensive sleep domain assets.

**PAT-SLEEP-DIMENSIONS-001 corroboration:** sleep must retain its component metrics/stages and not only a vendor score.

**TK:** provider score can be imported, but raw/derived components need provenance.

## 15. Background sleep processing

Current Oura docs state sleep data can sync/calculate without opening the app when ring/phone remain connected and app runs in background (rollout from 2026-09-10).

**PAT-BACKGROUND-HEALTH-SYNC-001:** wearable health processing should not require foreground app opening.

**TK:** native Health Connect/device integrations should support durable background work where platform rules allow.

## 16. Activity balance is not “more is always better”

Official Oura docs describe both overload and underload as potentially lowering Activity Balance.

**PAT-ACTIVITY-BALANCE-001:** activity context can represent underload and overload relative to personal history.

**TK:** never translate this into universal injury-safe zones.

## 17. Activity score has visible contributors

Official Oura documentation describes activity contributors including inactivity and movement behavior.

**TK:** composite explainability pattern corroborated.

## 18. Cardiovascular Age is explicitly an estimate

APK strings include VO2-related models; official Oura CVA docs describe cardiovascular age as an estimate derived from estimated PWV/PPG waveform characteristics, requiring calibration data.

**PAT-CARDIOVASCULAR-AGE-001:** long-term cardiovascular estimate must expose that it is an estimate, its calibration requirements and trend focus.

**TK:** **EVIDENCE_REVIEW_REQUIRED** before any analogous derived metric. Never infer medical age from generic wearable data without validated method.

## 19. CVA requires minimum data

Official Oura docs require at least 14 nights in the prior 30 days to establish a baseline.

**PAT-MIN-DATA-001 corroboration:** advanced health metrics should fail closed / remain unavailable until minimum data requirements are met.

**TK:** already central Calculation Registry requirement.

## 20. Slow-moving metrics should be framed as trends

Oura advises focusing on CVA trend rather than a single year-difference value.

**PAT-SLOW-METRIC-TREND-001:** slowly changing estimates should emphasize longitudinal movement, not daily noise.

**TK:** useful generic UX rule for fitness-age/body-composition-like metrics.

## 21. Cardio Capacity / VO2max estimate

APK contains `vo2MillilitersPerMinuteKilogram`; official Oura docs define Cardio Capacity as an age-adjusted VO2max estimate.

**PAT-PROVIDER-VO2MAX-001 corroboration:** provider-derived VO2max must retain provider provenance and estimation status.

**TK:** never silently replace a lab/user/test-derived VO2max with Oura's estimate.

## 22. Walking test asset

APK includes `assets/walkingTest/end_chime.wav`, supporting a packaged walking-test flow.

**PAT-FIELD-TEST-UX-001:** standardized field-test UX can collect inputs for an estimated fitness metric.

**TK:** candidate for future explicit test protocols, only with evidence-backed formulas and test validity rules.

## 23. Native Health Connect record support

APK strings/classes include Android Health Connect records such as BasalBodyTemperatureRecord and BodyTemperatureRecord. Official Oura docs confirm Android Health Connect integration and selectable import/export permissions.

**PAT-HC-001 corroboration:** native Health Connect is now independently observed across multiple benchmark apps.

**TK:** native Android Health Connect remains a **VERIFIED_GAP** versus current cloud-only Google Health path.

## 24. Health Connect uses selective data sharing

Official Oura docs instruct users to toggle which data is shared.

**PAT-HC-DATA-SCOPE-001:** Health Connect integration should expose granular read/write scopes rather than a monolithic “connect everything”.

**TK:** important privacy/consent requirement for native implementation.

## 25. Health Connect is device-local infrastructure

Oura's official docs explicitly distinguish Health Connect as storing data on the mobile device rather than Google Fit's former cloud model.

**TK:** reinforces architectural distinction between native Health Connect and TK's existing cloud Google Health API.

## 26. Tag taxonomy is packaged

APK contains `assets/Tags.json` and `TagPopulationMetrics.json`.

**PAT-CONTEXT-TAG-TAXONOMY-001:** user-entered context can use a canonical tag taxonomy rather than uncontrolled free text only.

**TK:** useful for illness, alcohol, late meal, travel, soreness, menstrual context etc.; sensitive tags require privacy rules.

## 27. Tag population metrics

Presence of `TagPopulationMetrics.json` indicates tags have associated population-level metadata/configuration in the client artefact; exact semantics are not inferred.

**PAT-TAG-METADATA-001:** contextual tags can carry metadata separate from user observations.

**TK:** if population evidence is ever used, it must be clearly separated from personal association and causal claims.

## 28. Behavior association boundary

Oura's tag/context model plus longitudinal metrics suggests a pattern of associating behavior/context with outcomes. Static APK does not prove causal methodology.

**TK:** any “X improves your HRV” feature must be framed as association unless causal evidence exists.

## 29. Device onboarding is a substantial product domain

APK includes multiple ring/charger onboarding Lottie assets and device lifecycle code.

**PAT-DEVICE-ONBOARDING-001:** hardware integration requires guided pairing/charging/setup UX, not just an API connector.

**TK:** relevant if TK ever directly connects sensors/devices rather than only cloud providers.

## 30. Device connection retry/degraded state

APK strings include “Connection disconnected and maximum number of retries reached.”

**PAT-DEVICE-RETRY-STATE-001:** device layer needs bounded retry and explicit terminal degraded state.

**TK:** aligns with Concept2 real-device future validation.

## 31. Background jobs

WorkManager schemas are packaged, including periodic work fields.

**PAT-BG-001 corroboration:** durable background processing is a common mature wearable-client pattern.

**TK:** provider sync/reconciliation should use native durable work when moved into Android shell.

## 32. Local structured persistence

Room runtime plus DataStore are packaged.

**PAT-NATIVE-PERSISTENCE-001 corroboration:** wearable app separates structured local state from lightweight preferences.

**TK:** reference pattern; do not replace canonical server ownership without need.

## 33. Braze content/messaging

Braze in-app message/content-card infrastructure is packaged.

**TK:** vendor-specific marketing engagement is not a product requirement; avoid importing engagement complexity without clear value.

## 34. Sentry observability

Sentry debug metadata/modules are packaged.

**PAT-MOBILE-OBSERVABILITY-001 corroboration:** native wearable app has dedicated mobile observability.

**TK:** Android-native shell should preserve existing redaction/privacy rules.

## 35. CameraX

CameraX lifecycle/resources are packaged. Static evidence does not establish exact user-facing feature.

**Result:** capability observed, product use NOT ASSESSABLE.

## 36. Women's health signals

Basal body temperature support and Oura's broader cycle ecosystem make this relevant, but this pass does not reconstruct menstrual/pregnancy algorithms from the APK.

**TK:** Clue/Natural Cycles remain better primary benchmarks for female-health modeling; Oura is useful as wearable-sensor input provenance.

## 37. Current TK already has Oura connector foundations

Repository evidence shows `oura-auth-start.js`, `oura-auth-callback.js`, `oura-sync.js`, `oura-status.js`, `oura-disconnect.js`, canonical sport mapping and dedupe/provenance logic.

**Important correction to older benchmark framing:** Oura is no longer simply “not implemented” in code. The software foundation exists; activation/real round-trip remains externally blocked by developer credentials and real-device validation.

## 38. Oura token revocation

TK's Oura disconnect path explicitly removes stored Vault tokens and revokes with Oura.

**TK:** provider lifecycle architecture is already strong and should remain canonical.

## 39. Oura workout dedupe

Current TK provider tracker uses an Oura workout dedupe key and strict sport mapping.

**TK:** no new gap; good evidence that external provider data already flows through canonical mapping rather than directly into AI.

## 40. Real round-trip remains open

Current TK docs state Oura/WHOOP/Polar software can await external credential setup and real round-trip validation.

**TK status:** Oura cloud connector = **FOUNDATION/SOFTWARE PRESENT; DEVICE/PRODUCTION PROOF OPEN**, not greenfield.

## 41. Native Health Connect remains distinct

Even with Oura cloud connector code, TK still has no native Android Health Connect SDK path.

**VERIFIED_GAP:** this benchmark independently strengthens the native Health Connect priority.

## 42. HRV methodology provenance remains critical

Current TK docs already identify that HRV semantics can differ by provider/API and must not be assumed identical.

**PAT-HRV-METHOD-PROVENANCE-001:** store metric method/semantic provenance where providers differ, not only provider name.

Oura benchmark reinforces, but does not itself prove every exported HRV field's methodology.

## 43. Readiness-score import boundary

If Oura Readiness is ever imported into TK, it should be stored as `provider_metric: oura_readiness`, not treated as TK's own deterministic readiness output.

**PAT-PROVIDER-COMPOSITE-ISOLATION-001:** proprietary provider composites stay isolated from canonical TK calculations.

## 44. Sleep-score import boundary

Same rule for Oura Sleep Score: provider score can be displayed/contextualized but raw sleep components should not be reverse-engineered from the score.

## 45. Activity-score import boundary

Same for Activity Score. Provider composite is an input/source-labelled observation, not a canonical TK calculation.

## 46. Symptom Radar safety boundary

Oura describes physiological strain signals, not a definitive diagnosis. TK must use even more conservative language if creating any analogous deviation radar.

**Forbidden interpretation:** “you are ill”, “you are overtrained”, or “you must rest” based solely on wearable deviations.

## 47. Highest-value TK opportunities

1. **Native Android Health Connect** — independently corroborated **VERIFIED_GAP**.
2. **Explicit multihorizon baselines** for recovery metrics (daily / ~14d / long-term) where evidence supports them.
3. **Provider composite isolation** for Oura Readiness/Sleep/Activity.
4. **HRV method provenance** beyond provider name.
5. **Multi-signal physiological deviation radar** with conservative non-diagnostic wording.
6. **Stress/restorative longitudinal view** distinct from daily readiness, after evidence review.
7. **Context-tag taxonomy + provenance**, with association-not-causation rules.
8. **Minimum-data gates** and slow-metric trend framing for advanced health estimates.
9. **Device retry/degraded state** and durable background work for native integrations.
10. **Oura real credential + round-trip validation** to graduate existing connector from software-present to production-proven.

## 48. Dynamic audit gates

Runtime follow-up should test: ring onboarding/pairing; charger/battery states; BLE disconnect/retry; background sync; readiness factor drill-down; baseline warm-up period; HRV/RHR/temp deviations; sleep stages/latency/efficiency; daytime stress/restorative periods; resilience; Symptom Radar; Rest Mode; tags and tag editing; Cardio Capacity/walking test; Cardiovascular Age/minimum-data state; workout detection/editing; Health Connect permission scopes/read/write/reconciliation; cycle/temperature UX; subscription gating; offline behavior; account export/deletion; accessibility; notifications; multi-device/ring replacement; stale-data handling.

## Final status

**OURA 7.24.0 COMPLETE STATIC AUDIT: CLOSED for supplied APKM.**  
**Official-current documentation verification: COMPLETED for Readiness, Health Connect, Symptom Radar, Resilience, Cardiovascular Age, Cardio Capacity, Activity and Sleep claims used here.**  
**Dynamic/runtime audit: OPEN.**  
**Proprietary scoring algorithms/server models: NOT ASSESSABLE and not reconstructed.**

Most important TK lesson: Oura's transferable strength is **personal-baseline physiology translated into explainable multi-horizon context**. TK already has stronger separation of Calculation/Context/Decision/AI. The opportunity is not to copy Oura's Readiness score, but to combine source-provenanced raw signals, minimum-data gates and personal baselines into transparent context while keeping proprietary provider scores isolated and uncertainty visible.