# Runna 8.52.1 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `com.runbuddy.prod_8.52.1.apk`  
**SHA-256:** `18555f1d756ab588c1de3c745d6745c33bad181e52f9b1bb6616b4000d98ba59`  
**Package:** `com.runbuddy.prod` · **version:** 8.52.1  
**APK size:** ~113 MB  
**Client:** React Native + Expo SDK 55 + Hermes; arm64 native libraries.  
**Provenance:** user-supplied APK; signature container identifies `APPLOKO` as artefact signer/source metadata.

> Complete static audit for the supplied APK. Runtime/device behaviour, private backend algorithms, server-side controls and internal tests remain NOT ASSESSABLE unless separately evidenced. No competitor binary, extracted source, fonts or media is committed.

## 1. TK Measurement Model v1.2 assessment

| Criterion | External result | Confidence | Evidence boundary |
|---|---|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal scope/acceptance unavailable |
| B Canonical architecture | 3 | MEDIUM | structured React Native product with native health/location/BLE/notification modules; exhaustive canonical/shadow-path proof unavailable |
| C Runtime integration | 3 | MEDIUM | training-plan, record/replay, integrations and adaptation routes are packaged; real device call chains not fully proven |
| D Persistence/data model | 2 | MEDIUM | MMKV/DataStore/local state and cloud-sync indicators visible; canonical backend schema/lifecycle unavailable |
| E Calc/Context/Decision | 3 | MEDIUM | pace targets, plan recommendations/adaptivity, elevation/weather/context and strength/mobility flows observable; formulas/authority/evidence not fully recoverable |
| F Tests/evidence | NOT ASSESSABLE | — | competitor test suite/scientific evidence registry unavailable |
| G Security/privacy | NOT ASSESSABLE | — | secure-store backup exclusions and client auth/integration controls visible; backend enforcement unavailable |
| H UX/user-facing completion | 2 | MEDIUM | broad end-user flows packaged; runtime discover→use→feedback not device-proven |
| I Failure/degraded-state handling | 2 | MEDIUM | cloud-sync/offline/error/adaptation states visible; recovery semantics not fully runtime-proven |
| J Audit closure | NOT APPLICABLE | — | TK project-specific closure criterion |

**No aggregate score.** Unknown evidence is never converted to zero.

## 2. Packaging and framework

The APK contains six DEX files and 41 arm64 native libraries. Native modules include React Native/Hermes, Expo modules/updates, Reanimated/Worklets, Skia, VisionCamera, MMKV, Sentry, Embrace and media/image/PDF components. `assets/app.config` identifies Expo SDK 55, scheme `runna-prod`, runtime version 8.52.1 and production Expo Updates channel.

**Pattern PAT-OTA-001:** cross-platform client with a controlled OTA application-update channel separate from store binary delivery.

**TK caution:** OTA may update presentation/product code, but TK calculation/evidence semantics must remain versioned/auditable and must not silently drift outside canonical release governance.

## 3. Training-plan product model

The bundle contains extensive plan-editing, plan-recommendation and training-mode surfaces: plan duration, weekly structure, longest-run onboarding, race-event context, missed runs, vacation/break handling, workout rescheduling, suggested pace adjustments and plan-change messaging.

**Pattern PAT-RUN-PLAN-001:** running plans are treated as living schedules with explicit context changes, not static PDFs/calendars.

**TK relevance:** useful for future endurance-program scheduling. Changes should be explicit Decision outputs with provenance/reason, not opaque AI edits.

## 4. Pace adaptation — major finding

Direct client text/identifiers show suggested pace adjustments, messaging that the app may notify the athlete when a pace adjustment could help, pace insights/help, prescribed/actual pace comparison, training-mode pace targets and replay pace/cadence visualisation.

Static analysis proves the adaptive pace UX and data pathways exist; it does **not** prove the algorithm, thresholds or scientific validity.

**Pattern PAT-PACE-ADAPT-001:** separate prescribed pace, observed performance and suggested target adjustment, with athlete-facing notification/explanation.

**TK check:** TK already has typed pace targets, threshold pace profile and deterministic Running Intelligence/Critical Speed infrastructure. The likely opportunity is not another pace engine, but a versioned Decision Rule that converts canonical trend/performance evidence into a proposed target change with confidence and explanation.

## 5. Race/event and goal context

Race-event overview, goal-distance flows, plan completion probabilities/copy, longest-run progression and race-oriented training modes are present. Common distance/race strings include 5K/10K/half-marathon/marathon contexts.

**Pattern PAT-RACE-GOAL-001:** race goal, date and distance are first-class plan context that drive schedule and progression surfaces.

**TK relevance:** aligns with Context Engine. Race goals should be typed entities feeding Decision Rules rather than prompt-only AI context.

## 6. Missed workouts, vacation and schedule adaptation

The client contains explicit missed-run and vacation/break concepts, plan-adjustment overlap handling and rescheduling/calendar flows.

**Pattern PAT-SCHEDULE-ADAPT-001:** distinguish planned schedule from athlete availability exceptions, then recalculate/propose changes rather than mutating history.

**TK opportunity:** highly relevant to the canonical “Mijn trainingen” scheduling architecture. Temporary absence/missed-session context should alter future scheduling while completed history remains immutable.

## 7. Elevation, terrain and weather context

Runna contains elevation/hilliness configuration and recommendation copy, geoid/elevation support, weather references and route/location infrastructure. User-facing copy explicitly distinguishes how hilly training should be.

**Pattern PAT-TERRAIN-001:** route/elevation characteristics are training-context inputs, not merely post-run analytics.

**TK check:** TK already stores canonical session weather and has running intelligence. Elevation/terrain as prescriptive context appears a stronger candidate gap than weather ingestion itself.

## 8. Run recording, GPS and replay

The APK contains location/GPS infrastructure, manual activity, run recording feedback, workout replay, pace/cadence/splits concepts, map markers and route assets. Foreground-service/WorkManager infrastructure is packaged.

**Pattern PAT-RUN-REPLAY-001:** preserve high-resolution execution data and transform it into a post-workout replay/feedback surface.

**TK opportunity:** future Running Execution can separate raw route/lap samples from derived pace/trend insights; calculations remain deterministic and reproducible.

## 9. Audio coaching

Audio cue catalogue/phrase infrastructure, media playback foreground-service permission and workout audio concepts are directly observable.

**Pattern PAT-AUDIO-COACH-001:** execution guidance is delivered hands-free at workout-relevant events rather than requiring screen interaction.

**TK opportunity:** strong candidate for running/rowing/cycling execution. Audio must speak already-decided targets; it must not create new training calculations.

## 10. Heart-rate/Bluetooth devices

Bundle evidence includes Bluetooth state/characteristic handling, `HeartRateDeviceInfoChanged`, connected-heart-rate-device detail/forget flows and missing biometric handling.

**Pattern PAT-SENSOR-SESSION-001:** external HR sensor is a session-bound device source with explicit connection identity/state.

**TK relevance:** fits Raw Data Adapter + provenance architecture. Sensor identity and measured-vs-derived origin should travel with each sample/session.

## 11. Health Connect

AndroidX Health Connect client is packaged and the bundle contains native Health Connect SDK status/permission-related flows.

**PAT-HC-001 corroboration:** Runna is now a third independent competitor after Hevy and Fitbod showing native Health Connect as a first-class Android integration.

**TK status:** VERIFIED_GAP remains unchanged: current TK documentation confirms Google Health API but no native Android Health Connect SDK.

## 12. Garmin, COROS and Strava

The client contains substantial Garmin, COROS and Strava integration surfaces, including Garmin auth/connected-app instructions, COROS references, Strava connection callbacks and extensive Strava identity/integration strings. Runna also exposes calendar sync and connected-app UX.

**Pattern PAT-ENDURANCE-PROVIDER-001:** endurance plan distribution/activity ingestion is multi-provider, with provider-specific connection UX behind a common “connected apps” product surface.

**TK check:** current TK provider documentation lists Garmin/COROS/Strava as not implemented or access-dependent. This is a real competitive integration gap, although provider API access constraints remain external dependencies.

## 13. Calendar integration

Google Calendar and Outlook calendar-sync flows are explicitly present, with messaging that workouts are synchronised directly to the athlete's calendar.

**Pattern PAT-CALENDAR-001:** planned workouts are exportable/synchronised calendar objects, reducing dependence on opening the training app to know the schedule.

**TK opportunity:** relevant to “Mijn trainingen” scheduling. Canonical workout instance IDs should map to calendar-event IDs so edits/cancellations remain idempotent and do not create duplicates.

## 14. Strength, mobility, Pilates and yoga support

The bundle includes a `StrengthStore`, strength workout/session routes, mobility workout completion, Pilates and extensive yoga/exercise assets.

**Important:** this demonstrates that Runna is not purely a run-plan calendar; complementary strength/mobility content is integrated into the training product. Static evidence does not prove sophisticated strength progression.

**Pattern PAT-CROSS-TRAIN-001:** endurance plan can schedule complementary strength/mobility as first-class plan sessions.

**TK relevance:** TK is structurally stronger positioned for this because strength/endurance already share the canonical architecture. Avoid separate “running strength” execution engines.

## 15. Menstrual-cycle context

Menstrual-related UI/strings are present, including reminder/settings concepts. Static evidence is insufficient to establish whether or how cycle data changes training prescriptions.

**Result:** female-health context OBSERVED; training-decision effect NOT ASSESSABLE.

**TK relevance:** do not infer parity or superiority. TK's cycle-related calculations/Decision Rules must remain evidence-scoped and explicitly versioned.

## 16. Adaptivity and recommendation UX

Identifiers such as `adaptivitySource`, PlanRecommendations, suggested changes and “we'll let you know if we think you'd benefit” copy indicate adaptation is presented as a proposal/notification rather than necessarily an invisible mutation.

**Pattern PAT-PROPOSE-CHANGE-001:** adaptive systems surface proposed changes and reasons as user-visible events.

**TK opportunity:** excellent fit for explainable Decision Engine design: old target → evidence → proposed target → confidence → accept/decline → versioned outcome.

## 17. Offline/cloud sync

Cloud-sync animation/assets, offline references, MMKV and Expo/DataStore infrastructure are present. Static evidence does not prove durable workout queue ordering/conflict resolution.

**Result:** offline/sync capability indicators OBSERVED; lossless offline execution NOT ASSESSABLE.

**TK check:** TK's idempotent offline queue remains more directly evidenced from source/tests than Runna can be from APK.

## 18. Notifications and background lifecycle

Notifee foreground service, alarm/block-state receivers, Firebase messaging, WorkManager foreground infrastructure and media-playback foreground permission are packaged.

**Pattern PAT-ENDURANCE-BG-001:** active run/audio/reminders depend on explicit Android lifecycle infrastructure rather than browser/JS foreground assumptions.

**TK opportunity:** corroborates Hevy's PAT-BG-001 and strengthens the case for a native lifecycle audit before TK relies on long-running Android execution.

## 19. Observability

Sentry native + React Native integration and Embrace native instrumentation are packaged. AppsFlyer/Firebase are also present for attribution/messaging/analytics classes.

**Pattern:** mature mobile observability is layered across JS and native runtime.

**TK:** observability capability already exists; use Runna to benchmark native execution tracing when TK's native shell becomes more complex.

## 20. Authentication and secure storage

OAuth/Cognito-related identifiers are present. Expo SecureStore backup/data-extraction rules explicitly exclude `SecureStore` shared preferences from cloud backup/device transfer. This is positive static evidence of secret-storage backup hygiene.

No claim is made about server auth strength, token expiry correctness or account takeover resistance.

## 21. File providers/security review

Multiple FileProvider path configurations exist for image sharing/download/cropping/Expo files. At least one binary XML contains an `external-path` named `shared`; another provider configuration contains external-path entries.

This is **REVIEW_REQUIRED, not a vulnerability finding**. Exported state, authorities, grantUriPermissions and actual provider wiring must be semantically decoded/runtime-tested before security conclusions.

## 22. Payments/subscriptions

Google Billing-related classes and subscription/paywall content are packaged. Static evidence also contains purchase/offer error handling. Commercial architecture is not a TK build recommendation by itself.

## 23. Social/community and achievements

Athlete/community routes, achievements, Runna levels and referral flows are visible. Static evidence suggests motivational/social surfaces but not a Hevy-like public social architecture.

**TK relevance:** benchmark motivation UX separately from canonical training truth; avoid turning engagement metrics into training decisions.

## 24. Localisation and accessibility

The bundle contains extensive multilingual strings including Dutch and many other languages. React Native accessibility infrastructure is present. Actual TalkBack order, touch targets, contrast and reduced-motion behaviour require runtime testing.

## 25. Technical solution patterns added

- **PAT-OTA-001** — controlled OTA product-code delivery with governance caveat.
- **PAT-RUN-PLAN-001** — living running plan with explicit schedule/context changes.
- **PAT-PACE-ADAPT-001** — prescribed vs observed pace → proposed target adjustment.
- **PAT-RACE-GOAL-001** — typed race/date/distance plan context.
- **PAT-SCHEDULE-ADAPT-001** — missed/vacation context changes future schedule, not history.
- **PAT-TERRAIN-001** — hilliness/elevation as prescriptive training context.
- **PAT-RUN-REPLAY-001** — execution telemetry → post-workout replay.
- **PAT-AUDIO-COACH-001** — hands-free execution cues based on decided targets.
- **PAT-SENSOR-SESSION-001** — HR sensor identity/state bound to session provenance.
- **PAT-ENDURANCE-PROVIDER-001** — common connected-app UX over provider-specific integrations.
- **PAT-CALENDAR-001** — canonical workout ↔ external calendar event mapping.
- **PAT-CROSS-TRAIN-001** — complementary strength/mobility sessions inside endurance plan.
- **PAT-PROPOSE-CHANGE-001** — adaptive changes surfaced as explicit proposals.
- **PAT-ENDURANCE-BG-001** — native lifecycle support for long-running execution/audio.
- PAT-HC-001 and PAT-BG-001 receive additional independent corroboration.

## 26. TK current-state implications

Current TK source already has deterministic Running Intelligence, typed pace targets, threshold pace, Critical Speed/trends, generic interval execution and canonical weather. Therefore the largest Runna-derived opportunities are **not** “add running metrics”.

More distinctive candidate gaps are:
1. athlete-visible adaptive pace-change proposals built on existing canonical calculations;
2. schedule adaptation for missed runs/vacation;
3. terrain/elevation as prescriptive context;
4. audio execution coaching;
5. rich run replay;
6. calendar synchronisation;
7. provider breadth (Garmin/COROS/Strava);
8. native long-running Android lifecycle;
9. explicit race-goal-driven plan orchestration.

Each requires a dedicated current-main gate before roadmap promotion.

## 27. Dynamic audit gates

Runtime follow-up should test onboarding/plan generation, plan edit and vacation/missed-run changes, pace-adjustment explanation/acceptance, race goal flow, GPS accuracy and background recording, screen-off execution, audio cue timing, HR Bluetooth disconnect/reconnect, Health Connect permission/revocation, Garmin/COROS/Strava connection, calendar update/delete/idempotency, treadmill/manual activities, strength/mobility scheduling, offline/reconnect, subscription restore, accessibility, actual network/TLS and logout/local-data cleanup.

## Final status

**RUNNA 8.52.1 COMPLETE STATIC AUDIT: CLOSED for supplied-APK static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server/backend/internal test/evidence audit: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: Runna's differentiation is less about calculating pace itself and more about turning plan context, execution evidence and life interruptions into **visible proposed changes to the future schedule and targets**. TK already owns much of the deterministic running foundation needed to implement that pattern in a more explicitly evidence/versioned way.