# Clue 267.0 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.clue.android_267.0-3186_4arch_6dpi_24lang_bd650071c56906584f669f3d0c24cab2_apkmirror.com.apkm`  
**SHA-256 APKM:** `9958444133a50bef025bccc6625f2fbf528b3adf7a6f3ae66a5c647f3839558e`  
**Base APK SHA-256:** `bb9758ac0f8e56da9e63508250fd419edd3a3f26201f0ce3aec1ad1aba484d58`  
**Package:** `com.clue.android` · **version:** 267.0 · **versionCode:** 3186  
**minSdk:** 32 · **variant:** universal, 120–480 dpi, Android 12L+  
**APKM uncompressed total:** 61,557,221 bytes; **base APK:** 39,765,238 bytes.  
**Splits:** base + 4 ABI + 6 density + 24 language splits.  
**Client:** native Android/Kotlin/Jetpack Compose + Hilt/Room/DataStore/WorkManager; AndroidX Health Connect.

> Complete static audit for the supplied APKM. Clue is a sensitive-health/cycle product, not a training app. This audit mines product/technical patterns relevant to TK Women's Performance, health ingestion, privacy/consent and uncertainty UX. It does **not** import medical/cycle rules into TK. Runtime behaviour, server-side prediction algorithms, clinical validity, backend authorization and internal tests remain NOT ASSESSABLE unless separately evidenced.

## 1. TK Measurement Model v1.2 assessment

| Criterion | External result | Confidence | Static evidence boundary |
|---|---|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal product acceptance unavailable |
| B Canonical architecture | 4 | HIGH | strongly modular native domains for cycle, predictions, pregnancy, perimenopause, consent, doctor report, Health Connect and analysis |
| C Runtime integration | 3 | MEDIUM | concrete navigation/workers/repositories/Health Connect/analysis routes packaged; device call chains not fully proven |
| D Persistence/data model | 3 | HIGH | Room/DataStore/local prediction/consent state and sync infrastructure directly visible; backend canonical schema unavailable |
| E Calc/Context/Decision | 3 | MEDIUM | local/server prediction models, cycle/ovulation/symptom/temperature/HRV/RHR analyses visible; exact formulas/evidence authority unavailable |
| F Tests/evidence | NOT ASSESSABLE | — | competitor tests/clinical evidence registry unavailable from APKM |
| G Security/privacy | 3 | MEDIUM | explicit consent domains, sensitive-data privacy flows and TLS pinning visible; backend enforcement/retention not assessable |
| H UX/user-facing completion | 2 | MEDIUM | broad packaged flows; runtime discoverability/accessibility not device-proven |
| I Failure/degraded-state handling | 3 | MEDIUM | offline/sync, Health Connect resync, prediction availability and failure paths visible |
| J Audit closure | NOT APPLICABLE | — | TK-specific criterion |

**No aggregate maturity score** is emitted because key closed-source criteria remain unavailable.

## 2. Native modular architecture

Clue 267.0 is a native Android app using Jetpack Compose plus AndroidX/Hilt/Room/DataStore/WorkManager. Static package/class evidence shows distinct modules/domains for cycle view, predictions, measurements, analysis, pregnancy, perimenopause, consent, doctor reports, wearables/Health Connect, account management and onboarding.

**Pattern PAT-HEALTH-DOMAIN-MODULE-001:** sensitive life-stage/health capabilities are isolated as explicit domains rather than hidden inside a generic profile or AI prompt.

**TK relevance:** directly supports keeping Women's Performance contexts as typed modules feeding Context/Decision, with separate privacy and evidence contracts.

## 3. Cycle and bleeding model

The client contains extensive cycle/bleeding concepts: cycle view, menstruation, non-bleeding mode, bleeding/spotting, predicted ovulation, future ovulation and cycle-local prediction state. Android Health Connect record classes for MenstruationPeriod and IntermenstrualBleeding are packaged.

**Pattern PAT-CYCLE-RAW-001:** distinguish observed cycle events from predicted future events.

**TK check:** TK already has `cycle_periods`, `cycle_symptom_logs` and a deliberately estimated phase model. Clue reinforces the need to keep observed/self-reported data visibly separate from estimates.

## 4. Prediction uncertainty and provenance — major finding

Static evidence includes `LocalAvailablePredictions`, manual predictions, predicted ovulation, future ovulation, predicted symptom, cycle IDs and availability flags. The model distinguishes locally available prediction state from manually entered/observed state.

The APK does **not** expose enough evidence to validate Clue's prediction algorithm or accuracy.

**Pattern PAT-PREDICTION-PROVENANCE-001:** every health prediction should retain type, source/state and the cycle/context it belongs to; predicted values must not masquerade as observations.

**TK relevance:** strong fit with TK data-quality/confidence architecture. Cycle phase, symptom expectations or recovery associations should carry estimated/observed origin and confidence into Context Engine.

## 5. Symptom tracking

Symptom concepts are broad and include pain, bleeding, spotting, mood/energy-related assets and many measurement types. Predicted-symptom routes exist separately from recorded measurement models.

**Pattern PAT-SYMPTOM-OBS-PRED-001:** recorded symptom and predicted symptom are separate entities/surfaces.

**TK check:** TK already has symptom logging. This pattern can improve UX and provenance without creating phase-based training prescriptions.

## 6. Perimenopause as a first-class life stage

The APK contains a dedicated `perimenopause` navigation domain and a large set of localized PerimenopausePhases visual assets, including Dutch. It is therefore not merely a generic cycle tracker with a menopause article.

Static evidence does not establish medical decision logic or training recommendations.

**Pattern PAT-LIFESTAGE-MODE-001:** life-stage context can change the product's tracking/explanation mode without implying deterministic training prescriptions.

**TK status:** current TK capability registry says perimenopause/menopause is CONTEXT_ONLY/ARCHITECTURE READY but UI is not built. Clue therefore provides a concrete UX/content benchmark while TK's conservative DEFER on hard training rules remains appropriate.

## 7. Pregnancy mode

Dedicated pregnancy navigation, onboarding, pregnancy experience/superpower visualization models, pregnancy start/update/end reason flows and pregnancy assets are packaged.

**Pattern PAT-PREGNANCY-MODE-001:** pregnancy is represented as an explicit product mode/life-stage state, not inferred from cycle irregularity.

**TK status:** pregnancy/postpartum training remains deliberately DEFER in current TK governance. Clue can inform context/consent/content UX only; it is **not** evidence for automatic trimester-based load rules.

## 8. Contraception and non-bleeding context

Static evidence includes emergency contraception, fertility-awareness and non-bleeding onboarding/mode. This indicates the product explicitly accommodates contexts in which a natural-cycle assumption is inappropriate.

**Pattern PAT-NONBLEEDING-CONTEXT-001:** allow an explicit non-bleeding/contraception context rather than forcing every user through a natural-cycle model.

**TK check:** current TK audit already identified missing UI/storage for `contraceptionType` and suppresses misleading phase interpretation when hormonal contraception is known. Clue strengthens the UX case for making this context explicit, but does not justify medical inference.

## 9. Temperature analysis

Clue includes dedicated TemperatureAnalysis navigation and models for skin temperature, basal body temperature, body temperature and delta temperature. Health Connect data types for SkinTemperatureRecord and BasalBodyTemperatureRecord are packaged.

**Pattern PAT-TEMP-SOURCE-001:** temperature measurements retain measurement type/source semantics rather than collapsing all temperature into one number.

**TK relevance:** if wearable temperature is later ingested, distinguish skin/basal/body/delta, device/source, timestamp and measurement semantics before any Context use.

## 10. HRV and resting heart rate analysis

Direct client models/routes include HeartRateVariabilityMeasurement, RestingHeartRateMeasurement, cycle-scoped HRV/RHR measurement DTOs, statistics and HeartRateAnalysis.

**Important:** this proves Clue analyses HRV/RHR in cycle-related contexts; it does not prove causal hormonal effects or a training-readiness algorithm.

**Pattern PAT-CYCLE-BIOMETRIC-VIEW-001:** show biometrics across cycle/life-stage context descriptively while separating observation/statistics from causal interpretation.

**TK relevance:** particularly strong fit. TK already has canonical HRV baseline logic and Women's Performance guardrails. Cross-domain views may be useful, but Decision Engine must not infer universal cycle-phase training effects.

## 11. Sleep and additional Health Connect types

Android Health Connect classes include SleepSession, Steps, Heart Rate, HRV/RHR, skin/basal/body temperature, oxygen saturation, respiratory rate, menstruation period and intermenstrual bleeding, among other library record types.

Library class presence alone does not prove every record type is actively requested or synced. Dedicated Clue measurement/domain models provide stronger evidence for temperature/HRV/RHR/cycle data than for generic record classes.

**Audit rule:** capability is only promoted when app-specific evidence corroborates library presence.

## 12. Health Connect implementation

Clue has dedicated `HealthConnectBackgroundSyncWorker`, `HealthConnectOneTimeSyncWorker`, `HealthConnectSyncRequest`, remote measurement entry models, permission dialog events, settings/resync UI and platform/version handling.

**PAT-HC-001 corroboration:** this is the fifth independently audited competitor with a first-class native Android Health Connect path.

**Pattern PAT-HC-RESYNC-001:** expose Health Connect permission state, settings navigation and explicit resync/recovery rather than treating health ingestion as invisible background magic.

**TK status:** native Android Health Connect remains a verified TK gap.

## 13. Background and on-demand health sync

Clue separates background sync from one-time/on-demand sync workers.

**Pattern PAT-HEALTH-SYNC-MODES-001:** health ingestion has explicit scheduled/background and user-triggered resync modes.

**TK relevance:** useful for future Health Data Gateway: source sync mode and last-success state should be visible and auditable.

## 14. Doctor Report

The app has a dedicated DoctorReport domain with start, edit details, cycle eligibility, past reports, viewer and a specific DoctorReportFileProvider.

**Pattern PAT-HEALTH-REPORT-001:** generate a bounded, purpose-specific health summary/export rather than exposing the entire raw data store.

**TK opportunity:** potentially useful for athlete-controlled exports/coach or clinician handoff. Sensitive report generation must be explicit, consented and purpose-limited.

## 15. Consent architecture — major finding

Clue has dedicated mandatory and optional consent routes, consent DTOs/preferences, under-13/under-16 flows, parental-consent checks, health-data consent versions, ToS/privacy consent versions and a separate consent DataStore.

**Pattern PAT-CONSENT-VERSION-001:** consent is versioned and typed (mandatory/optional/health/parental), not a single boolean checkbox.

**TK check:** TK already has strong Women's Performance privacy/RLS controls. Clue suggests a product-layer improvement: where consent is required, store what was consented to and which policy/version applied, rather than only current access state.

## 16. Age-sensitive consent

Dedicated Under13, Under13Article and Under16 routes plus parental-consent state are packaged.

**Pattern PAT-AGE-CONSENT-001:** age-related legal/consent states are explicit workflow states.

**TK relevance:** only applicable if TK's supported age scope expands. Do not import these flows without a product/legal decision.

## 17. Privacy and account controls

Privacy policy routes, account management, measurement consent, delete-account copy and consent settings are present. Static evidence also shows session-replay privacy configuration identifiers.

Backend deletion completeness and actual analytics redaction remain NOT ASSESSABLE.

**TK relevance:** sensitive cycle/health data must remain excluded from product telemetry; current TK observability contract already does this.

## 18. Network security and certificate pinning

`network_security_config.xml` contains a domain config for `helloclue.com` with subdomains, a SHA-256 pin set containing multiple pins, and debug overrides trusting user certificates.

**Pattern PAT-TLS-PIN-001:** sensitive-health clients may add certificate pinning for first-party domains, with separate debug trust behaviour.

**TK caution:** pinning has operational/rotation costs and is not automatically required. Evaluate threat model and native networking architecture before adoption.

## 19. Offline and sync

Static strings include offline mode, full/last sync timestamps, “Data sync started/stopped”, cache offline behaviour, sync retries and multiple domain sync systems. Local Room/DataStore state is present.

**Pattern PAT-SENSITIVE-OFFLINE-001:** sensitive health UX explicitly distinguishes offline local state from synchronized server state.

**TK relevance:** provenance should include sync/source freshness so the AI Coach never treats stale wearable/cycle data as current.

## 20. Analysis architecture

Dedicated analysis routes exist for temperature and heart rate, with cycle-scoped DTOs/statistics. This indicates analysis is a separate product domain from raw logging.

**Pattern PAT-HEALTH-ANALYSIS-SEPARATION-001:** raw measurements → analysis/statistics → presentation are separate layers.

**TK:** directly aligns with Raw Data → Calculation → Context architecture; do not allow UI/AI to calculate from raw health data ad hoc.

## 21. “Chat with your data”

A `ChatWithYourData` navigation domain and explicit `ChatConsent` route are packaged.

Static evidence does not establish the model/provider, data sent, safety controls or answer quality.

**Pattern PAT-AI-HEALTH-CONSENT-001:** conversational access to sensitive health data requires an explicit consent boundary distinct from ordinary app use.

**TK relevance:** strong comparator for AI Coach governance. Sensitive Women's Performance/health context should only enter AI context under explicit scope/consent and should remain derived from canonical engines.

## 22. Content/education layer

The APK contains extensive educational assets and remote Contentful image URLs, including cycle, cramps, birth control, life stages and perimenopause content.

**Pattern PAT-HEALTH-EDU-001:** educational content is a distinct layer from personal prediction/analysis.

**TK relevance:** Women's Performance education can be evidence-linked and separated from personal Decision Rules.

## 23. Wearable ecosystem signals

The app includes links/references to Garmin Connect, Oura, WHOOP, Withings, Polar, Ultrahuman and Google watches/trackers. These may represent partnerships/content/integration entry points; static URL presence alone does not prove direct API integrations for each provider.

**Result:** ecosystem/partner references OBSERVED; provider-by-provider integration NOT ASSESSABLE without stronger code/runtime evidence.

## 24. Widgets

Android resources include cycle-view and tracking app-widget definitions.

**Pattern PAT-HEALTH-WIDGET-001:** low-friction daily tracking and cycle status can be exposed through bounded home-screen widgets.

**TK opportunity:** complements the Android training-widget pattern found in Hevy; future TK widgets should expose low-sensitivity summaries by default and avoid sensitive cycle details on lock/home screens unless explicitly enabled.

## 25. Notifications and engagement

Firebase/Braze infrastructure is extensive, including content-card/feature-flag/banner sync and push-related components. This indicates mature engagement infrastructure but not which sensitive events are used for targeting.

**TK caution:** health/cycle values must not become generic marketing analytics attributes. Current TK telemetry separation should remain stricter than engagement convenience.

## 26. Observability and analytics

Firebase, Braze, Adjust and Datadog indicators are present. Static identifiers include consent-aware measurement/analytics settings and session-replay privacy controls.

**Pattern PAT-ANALYTICS-CONSENT-001:** analytics/engagement systems should react to consent state rather than assuming collection is always permitted.

**TK relevance:** useful for future Product Telemetry implementation; health/training payloads remain prohibited regardless of analytics consent.

## 27. Feature flags/content sync

Braze feature flags, content cards and banners have explicit sync/retry infrastructure.

**Pattern PAT-HEALTH-FLAGS-001:** remote product/content flags are acceptable for UX/content rollout, but health calculation/prediction semantics require separate versioned governance.

**TK:** same hard rule as earlier competitor flag findings.

## 28. Deep links/external care pathways

Static URLs include privacy/support and several external health-service/partner pathways. Runtime intent-filter semantics were not fully decoded in this pass, so no claim is made that every URL is a deep link.

**TK relevance:** if external clinical referral/content is ever added, distinguish education/referral from medical advice generated by TK.

## 29. Localisation

The APKM includes 24 language splits, including Dutch. Perimenopause visual assets are also localized for many languages.

**Pattern PAT-SENSITIVE-LOCALISE-001:** sensitive health concepts require domain-specific localization, not merely translating generic UI chrome.

**TK opportunity:** Women's Performance terminology should be reviewed as domain content per language.

## 30. Accessibility

Jetpack Compose accessibility semantics are packaged. Actual TalkBack order, content descriptions, charts, touch targets, dynamic text and color contrast require runtime audit.

## 31. Security review boundaries

No exploit, auth bypass or exposed credential is claimed. Certificate pinning is direct positive evidence. Doctor-report FileProvider paths and other components require decoded manifest/exported/grant semantics before exposure claims.

Mobile Firebase/Braze/Adjust configuration values are not automatically secrets.

## 32. Medical/scientific boundary

Clue's presence of fertility, ovulation, pregnancy, perimenopause, temperature and biometric analysis is **product evidence, not scientific evidence for training adaptation**.

Current TK evidence audit concludes there is insufficient evidence for universal cycle-phase-based training prescriptions and keeps pregnancy/postpartum hard rules deferred. Nothing in this APK audit changes that decision.

## 33. Technical solution patterns added

- **PAT-HEALTH-DOMAIN-MODULE-001** — isolate sensitive life-stage/health domains.
- **PAT-CYCLE-RAW-001** — observed cycle events separate from predicted events.
- **PAT-PREDICTION-PROVENANCE-001** — prediction type/source/context retained.
- **PAT-SYMPTOM-OBS-PRED-001** — recorded and predicted symptoms separated.
- **PAT-LIFESTAGE-MODE-001** — explicit life-stage product mode without automatic training rule.
- **PAT-PREGNANCY-MODE-001** — pregnancy as explicit state, never inferred.
- **PAT-NONBLEEDING-CONTEXT-001** — explicit non-bleeding/contraception context.
- **PAT-TEMP-SOURCE-001** — skin/basal/body/delta temperature semantics retained.
- **PAT-CYCLE-BIOMETRIC-VIEW-001** — descriptive biometrics across cycle context without causal overclaim.
- **PAT-HC-RESYNC-001** — permissions/settings/resync health integration UX.
- **PAT-HEALTH-SYNC-MODES-001** — background and user-triggered health sync.
- **PAT-HEALTH-REPORT-001** — purpose-limited sensitive health report/export.
- **PAT-CONSENT-VERSION-001** — typed/versioned consent.
- **PAT-AGE-CONSENT-001** — explicit age/parental consent states.
- **PAT-TLS-PIN-001** — first-party TLS pinning with operational caveat.
- **PAT-SENSITIVE-OFFLINE-001** — offline/sync freshness visible for health data.
- **PAT-HEALTH-ANALYSIS-SEPARATION-001** — measurement → analysis → presentation separation.
- **PAT-AI-HEALTH-CONSENT-001** — explicit consent before conversational sensitive-data use.
- **PAT-HEALTH-EDU-001** — education separated from personal prediction.
- **PAT-HEALTH-WIDGET-001** — bounded low-friction health tracking widget.
- **PAT-ANALYTICS-CONSENT-001** — analytics reacts to consent state.
- **PAT-HEALTH-FLAGS-001** — flags/content rollout separated from health truth.
- **PAT-SENSITIVE-LOCALISE-001** — domain-reviewed localization for sensitive concepts.
- PAT-HC-001 receives fifth independent corroboration.

## 34. TK current-state implications

The strongest Clue-derived opportunities are:
1. explicit **observed vs predicted** provenance throughout Women's Performance;
2. perimenopause/menopause **context UI** without hard phase-based training rules;
3. explicit non-bleeding/contraception context UI;
4. temperature source semantics if wearable temperature is ingested;
5. descriptive cycle × HRV/RHR views while preserving non-causal language;
6. Health Connect resync/settings/background sync UX;
7. typed/versioned consent, especially for sensitive AI context;
8. purpose-limited athlete-controlled health reports/exports;
9. sensitive-data freshness/offline signalling;
10. domain-reviewed localization and privacy-aware widgets.

These are candidates only. Existing TK DEFER decisions for pregnancy/postpartum/perimenopause training prescriptions are **not** reopened by competitor functionality.

## 35. Dynamic audit gates

Runtime follow-up should test onboarding and consent sequence, cycle/non-bleeding/perimenopause/pregnancy mode transitions, symptom logging, observed-vs-predicted labeling, prediction uncertainty/corrections, Health Connect permission selection/revocation/resync/background sync, temperature/HRV/RHR analysis explanations, doctor-report generation/share/delete, Chat-with-your-data consent and data boundary, offline/reconnect/freshness, notification privacy, home-screen widgets, account deletion/data export, accessibility, actual network/TLS pin rotation/failure behaviour and analytics consent.

## Final status

**CLUE 267.0 COMPLETE STATIC AUDIT: CLOSED for supplied-APKM static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server/backend/internal test/clinical-evidence audit: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: Clue's value is not a cycle-based training algorithm. It is the disciplined product separation of **observations, predictions, life-stage context, analysis, consent and sensitive-data UX**. That separation maps directly onto TK's Calculation & Evidence Architecture and can improve Women's Performance without weakening TK's scientifically conservative rule against universal cycle-phase training prescriptions.