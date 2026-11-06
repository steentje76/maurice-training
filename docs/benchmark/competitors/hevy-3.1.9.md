# Hevy 3.1.9 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `Hevy - Gym Log Workout Tracker 3.1.9 APKPure.xapk`  
**SHA-256 XAPK:** `3f59dc3c3b220e958a70c8ffd57f6ef3f35b0894900bbb765805eab45c0732bc`  
**Package:** `com.hevy` · **version:** 3.1.9 · **versionCode:** 3237168  
**minSdk:** 24 · **targetSdk:** 36 · **XAPK size:** 178,253,138 bytes  
**Splits:** base `com.hevy.apk` (116,517,815 B), `config.arm64_v8a.apk` (29,661,950 B), `config.xxhdpi.apk` (31,950,084 B), `config.en.apk` (123,289 B).

> This is the complete **static** audit achievable from the supplied artefact in this pass. It is not a dynamic/runtime audit. Runtime permission prompts, real network traffic, offline conflict behaviour, accessibility interaction, backend controls and server-side recommendation logic remain NOT ASSESSABLE from this XAPK alone. No competitor binary, extracted source or media is committed.

## 1. Audit method and TK score map

The audit reuses the canonical TK Measurement Model v1.2 vocabulary and discipline from `docs/audit/AJ_MEASUREMENT_MODEL_v1_2.json`: 0–5 ladder, A–J criteria, N/A rules, confidence and evidence-first scoring. It does **not** emit a fake aggregate Hevy A–J score: several canonical criteria require source-repository, backend, tests or device evidence unavailable in a closed APK.

| Criterion | External result | Confidence | Reason |
|---|---|---|---|
| A Product scope defined | NOT ASSESSABLE | — | canonical product scope/acceptance docs unavailable |
| B Canonical architecture | 3 (observable client boundary only) | MEDIUM | React Native/Expo product layer plus native Android modules identifiable; shadow/legacy paths cannot be exhausted without source |
| C Runtime integration | 2 | MEDIUM | client modules/components are packaged, but actual production call-chain cannot be proven statically |
| D Persistence/data model | NOT ASSESSABLE | — | SQLite/AsyncStorage indicators do not prove canonical schema/ownership/lifecycle |
| E Calc/Context/Decision | NOT ASSESSABLE | — | recommendation/calculation chain cannot be established from client strings |
| F Tests/evidence | NOT ASSESSABLE | — | competitor test suite/results unavailable |
| G Security/privacy | NOT ASSESSABLE | — | permissions/providers visible; backend/data-layer enforcement unavailable |
| H UX/user-facing completion | 2 | MEDIUM | many screens/routes/assets are packaged; real discover→use→feedback flow not device-proven |
| I Failure/degraded-state handling | 2 | MEDIUM | error/retry/offline strings exist; failure semantics not runtime-proven |
| J Audit closure | NOT APPLICABLE to competitor maturity | — | TK V1 closure criterion is project-specific |

**No aggregate score.** Unknown evidence is not converted to zero. Audit-domain coverage for the static pass is complete across the domains in `AUDIT_METHOD.md`; runtime-only domains remain explicitly open.

## 2. Packaging and platform

The XAPK is a split package: one base APK plus arm64-v8a, xxhdpi and English splits. The native split contains Hermes/React Native and native modules including `libhermes.so`, `libreactnative.so`, `libreanimated.so`, `libVisionCamera.so`, `libsentry.so`, `libexpo-modules-core.so` and related JSI/worklet libraries.

`assets/app.config` identifies Expo SDK 54, Android package `com.hevy`, iOS bundle `com.hevyapp.hevy`, owner `hevy-organization`, and an EAS project ID. The base APK contains a ~15.3 MB `assets/index.android.bundle`.

**Pattern:** cross-platform application logic with a substantial native mobile capability layer.

## 3. Permissions

The supplied XAPK manifest metadata declares INTERNET, network/Wi-Fi state, boot completed, vibration, camera, coarse/fine location, notifications, exact alarms, legacy external-storage read/write, billing, activity recognition, contacts, Health Connect read/write categories, foreground service/special-use, advertising/attribution permissions, biometrics/fingerprint, wake lock, Firebase receive and install-referrer-related permissions.

Health categories observed: WRITE_BODY_FAT, WRITE_EXERCISE, WRITE_WEIGHT, WRITE_TOTAL_CALORIES_BURNED, WRITE_HEART_RATE, READ_WEIGHT and READ_BODY_FAT.

**Assessment:** broad mobile capability surface. Static presence does not prove that every permission is requested at runtime or that every permission is necessary. For TK the useful pattern is capability-driven permission design with least privilege and just-in-time consent.

## 4. Android components and exposed surface

Binary-manifest strings identify `MainActivity`, notification receivers/services, timer receiver/service, Wear listener service, Health Connect permission-rationale activity, Firebase messaging service/receiver, multiple FileProviders, Sentry/Firebase init providers, media-editor activities and a substantial widget surface.

Widgets include calendar, calendar stats, chart, day routine, last routines, last workouts, quick access, rest, streak and weekly stats; several have configuration activities.

**Security note:** provider path XMLs include cache/files/external locations and one path set includes a root-path/external-path. This is **not by itself a vulnerability**: exported state, URI-grant configuration and actual provider wiring must be verified before any security conclusion. Marked REVIEW_REQUIRED, not a defect.

## 5. Framework/native architecture

Direct client evidence supports React Native + Expo with Hermes, Reanimated/Worklets, native camera/media editing, AndroidX Health Connect, Glance/app widgets, Firebase messaging, Sentry native components and native wearable support.

**Pattern:** keep high-frequency product logic cross-platform while platform-bound capabilities live behind native modules/services.

**TK relevance:** compatible with TK's existing web/cross-platform core direction, but should be implemented through TK-owned adapters rather than reproducing Hevy structure.

## 6. Health Connect and health data

Health Connect library metadata, health permissions and explicit `HealthConnectInstall` / `HealthConnectOnboarding` client assets are present. User-facing bundle text indicates workout/measurement sharing with Health Connect.

**Pattern:** native on-device health platform as an ingestion/export boundary.

**Current TK check @ main `0dcb7cd...`: VERIFIED GAP / existing decision point.** TK documentation explicitly states it currently uses Google Health API and has **no native Android Health Connect SDK integration**. Therefore PAT-HC-001 is no longer merely a candidate: the implementation gap is repository-proven. This does not mean it must automatically be built; it enters the normal TK roadmap/product-decision process.

## 7. Wear OS, heart rate and wearable live sync

The APK contains `WearListenerService`; bundle evidence includes Wear OS connection/live-sync language, a `watchLiveSync` path and `WorkoutHeartRateHistory`. It also contains user-facing handling for missing recent biometrics/heart-rate-monitor data.

**Pattern:** live workout state can be mirrored between phone and watch while biometric streams are contextualised inside the active workout.

**TK opportunity:** future wearable UI should use a device-session adapter feeding canonical raw data/session identity; watch state must not become a second training truth.

## 8. Workout execution

Packaged components/identifiers include `LiveWorkout`, `WorkoutDetail`, `WorkoutSummary`, exercise replacement, timers, notes, plate calculator, workout statistics, heart-rate history and watch live sync.

A progression message is packaged around adjusting a best-set weight after falling below target reps. This proves a user-facing adaptive-progression concept exists; it does **not** prove the server-side algorithm or its scientific basis.

**Pattern:** one continuous workout lifecycle with utilities embedded in context rather than separate tools.

**TK check:** TK already has a canonical Preview → Execution → Logging/completion chain. Reuse/optimise that chain; do not create a Hevy-inspired parallel path.

## 9. Timers, background work and notifications

Manifest/client evidence includes exact-alarm permission, boot receiver capability, timer expiration receiver, foreground timer notification service, Firebase messaging and background-related code.

**Pattern:** workout timers and notifications are treated as OS lifecycle concerns rather than relying only on a foreground JavaScript timer.

**TK opportunity:** audit whether active workout timers, reconnect/sync and reminders survive Android background/sleep reliably; implement only the minimum native lifecycle pieces required.

## 10. Offline, local storage and sync

The bundle contains AsyncStorage, SQLite-related indicators, extensive sync-related identifiers, offline-related text and low-storage error handling. Static analysis cannot prove queue ordering, conflict resolution, idempotency or lossless recovery.

**TK check:** TK already has a mature IndexedDB offline queue with re-entry locking, owner scoping and idempotent session writes. Therefore Hevy does not currently establish a new TK gap here; it supplies comparison cases for future runtime testing.

## 11. Exercise library and media

The bundle contains large exercise metadata/media references delivered remotely from a CloudFront host, including MP4 exercise assets and thumbnails across equipment/body regions. Media is not embedded as a full exercise-video library in the base APK.

**Pattern:** separate media delivery from application binary; cache/stream media as needed.

**TK check:** TK already excludes the large `videos/` tree from the Android bundle and serves videos through its production web/media path. Pattern is substantially already present. MoveKit expansion should extend the existing mechanism rather than invent another store.

## 12. Programs, progression and coaching

Client evidence includes program detail, HevyTrainer stack/navigation, program modification, coach relationships, exercise-template customisation, injury-context warnings and adaptive-weight messaging.

**Inference limit:** no claim is made about Hevy's recommendation engine, periodisation logic, evidence model or backend decision rules.

**TK design rule:** competitor coaching UX may inform interaction design; TK calculations and decisions remain Calculation → Context → Decision → AI.

## 13. AI / HevyGPT

HevyGPT-related strings/components and generative-AI message limits are packaged. That proves client-facing AI integration, not its model, prompts, safety controls or computation architecture.

**TK opportunity:** compare conversational placement, explanation and hand-off into workouts, while preserving TK's prohibition on AI as numerical source of truth.

## 14. Social, privacy and sharing

Evidence includes feed, comments/replies, likes/mentions, suggested users/friend-of-friend, follow requests, private-profile controls, workout visibility options, workout sharing and shareable media.

**Pattern:** workout identity is reused as a social object with explicit visibility/privacy concepts.

**TK check:** TK already has Social/privacy capabilities and RLS-backed controls. Hevy remains useful as UX/runtime benchmark, not evidence that TK needs a second social data model.

## 15. Deep links and integrations

The bundle contains Branch integration and an `hevyapp.app.link` routine deep-link example, plus Strava integration strings and external-app handoff language.

**Pattern:** stable object identity + deep link lets shared routines/workouts open directly into the relevant app context.

**TK opportunity:** use canonical TK training/workout IDs for future notification/share links; avoid route-specific duplicate identities.

## 16. Observability and analytics

Sentry, Amplitude, Firebase and Branch indicators are present. Sentry native libraries/providers and replay-related client indicators are packaged; Amplitude endpoints/identifiers are visible.

**TK check:** TK already has an observability foundation and deliberately remains vendor-neutral. Hevy validates the capability class, not a need to copy its SDK stack.

## 17. Billing and commercial surface

Google Play Billing metadata and subscription-management/purchase-restore strings are present. RevenueCat text indicators alone are insufficient to prove it is the active billing authority.

**Pattern:** billing is platform-integrated and restore/manage flows are first-class. No TK commercial decision follows automatically.

## 18. Widgets

Hevy has an unusually broad Android widget surface: routines, recent workouts, rest, streak, calendar/stats, chart, quick access and weekly stats.

**New pattern PAT-WIDGET-001:** lightweight home-screen surfaces expose high-frequency actions/status without opening the full app.

**TK opportunity:** potentially useful later for “start planned workout”, rest timer/readiness summary or quick logging, but only after core Android app maturity and privacy review. Not a current automatic roadmap item.

## 19. Camera/media creation

VisionCamera/native image processing and IMG.LY photo/video editor assets/activities are packaged. This aligns with shareable workout media and profile/social content.

**Pattern:** rich shareables are generated through a dedicated native media pipeline rather than burdening core workout logging.

**TK opportunity:** if social share cards/video become important, keep generation isolated from canonical training data; generated media is a representation, never the record of truth.

## 20. Accessibility/localisation

The XAPK includes an English split and the base bundle contains many translated strings/language paths. Android/React Native accessibility identifiers are present. Static resources do **not** prove screen-reader order, contrast, touch targets or keyboard/switch access.

**Result:** localisation infrastructure OBSERVED; accessibility quality NOT ASSESSABLE without runtime inspection.

## 21. Performance and package size

The package is large (~178 MB XAPK; ~116.5 MB base plus native/resource splits), with Hermes, media editing, camera, Sentry, widgets and other native libraries contributing. Split packaging prevents all resources/ABIs being installed universally.

**Pattern:** use Android splits/app-bundle delivery to contain device-specific install cost. TK should continue keeping large exercise video libraries out of the native binary.

## 22. Security/privacy static review

Positive observable controls/capabilities include biometric APIs, Health Connect permission rationale, private-profile/visibility concepts and provider-specific URI mechanisms. Review items include broad permissions and broad-looking FileProvider path XML.

No credential theft, auth bypass, exploitable exported component or cleartext vulnerability is claimed. Binary manifest values could not be fully semantically reconstructed with the available static toolchain, so exported/provider/network-security conclusions remain NOT ASSESSABLE rather than guessed.

## 23. Failure/degraded-state evidence

Packaged strings show handling for low storage, failed media, Health Connect install/permissions, wearable connection/biometric absence, import/export errors and retry-related states. This supports existence of degraded-state UX, but not completeness or fail-closed behaviour.

## 24. Solution patterns promoted from this audit

- **PAT-HC-001 — VERIFIED_GAP:** native Health Connect boundary; TK currently lacks native SDK integration.
- **PAT-WO-001 — ALREADY_PRESENT / BENCHMARK:** continuous workout lifecycle; optimise existing TK canonical chain.
- **PAT-MEDIA-001 — ALREADY_PRESENT / EXTEND:** remote exercise media; extend current TK video delivery for MoveKit.
- **PAT-OBS-001 — ALREADY_PRESENT / COMPARE:** observability capability exists in TK; vendor stack need not match.
- **PAT-SOC-001 — ALREADY_PRESENT / BENCHMARK:** social workout representation/privacy; compare UX.
- **PAT-BG-001 — NEEDS TARGETED TK CHECK:** native lifecycle for timers/sync/reminders.
- **PAT-WEAR-001 — CANDIDATE:** phone↔watch live workout state and biometric stream adapter.
- **PAT-LINK-001 — CANDIDATE:** stable workout/routine identity used by deep links.
- **PAT-WIDGET-001 — CANDIDATE:** Android widgets for high-frequency training actions/status.
- **PAT-MEDIA-CREATE-001 — CANDIDATE:** isolated native shareable-media pipeline.

## 25. Remaining dynamic audit gates

A future runtime audit should test: onboarding/tap counts; workout start/set/finish friction; offline workout and reconnect; timer through screen-off/background/reboot; Health Connect permission timing and revocation; Wear OS live sync/reconnect; heart-rate-monitor loss; deep links; notification routes; privacy defaults; account deletion/export; accessibility; actual network hosts/TLS; storage after logout/account switch; subscription restore; low-storage/network-error behaviour.

Until those tests exist, those dimensions remain OPEN/NOT ASSESSABLE. They are not scored by inference.

## Final status

**HEVY 3.1.9 COMPLETE STATIC AUDIT: CLOSED for supplied-XAPK static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server/backend/internal test audit: NOT AVAILABLE from supplied artefact.**

This distinction is deliberate and follows the same TK rule: BUILT ≠ WIRED, WIRED ≠ CANONICAL, TESTED ≠ DEVICE_PROVEN.