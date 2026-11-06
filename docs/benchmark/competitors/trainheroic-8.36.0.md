# TrainHeroic 8.36.0 — Complete Static External Benchmark Audit

**Audit date:** 2026-09-18  
**Artefact:** `TrainHeroic_+Workout+Tracker_8.36.0_APKPure.apk`  
**SHA-256:** `bf1e1c04fdea5e5c06670342a83e54285c717b22380db13156ad7c46b71b1391`  
**Package (embedded app config):** `com.TrainHeroic.TrainHeroic` · **version:** 8.36.0  
**APK size:** ~51 MB compressed  
**Client:** React Native + Expo SDK 53 + Hermes; arm64 native libraries; CodePush/RevoPush assets.  
**Build metadata:** Android Gradle Plugin 8.8.2.

> Complete static audit for the supplied APK. Runtime/device behaviour, private backend algorithms, server-side authorization, scientific validity and internal tests remain NOT ASSESSABLE unless separately evidenced. No competitor binary, extracted code, fonts or media is committed.

## 1. TK Measurement Model v1.2 assessment

| Criterion | External result | Confidence | Evidence boundary |
|---|---|---|---|
| A Product scope defined | NOT ASSESSABLE | — | internal acceptance/scope unavailable |
| B Canonical architecture | 3 | MEDIUM | substantial athlete/coach/team/programming domains and API routes; exhaustive shadow-path proof unavailable |
| C Runtime integration | 3 | MEDIUM | workout/program/calendar/coach/team/readiness/training-load flows are packaged; real device chains not fully proven |
| D Persistence/data model | 2 | MEDIUM | Redux/persist/local state and rich API/domain identifiers visible; canonical backend schema/lifecycle unavailable |
| E Calc/Context/Decision | 3 | MEDIUM | RPE/load, readiness, working max/1RM, PR and prescribed percentage paths observable; formulas/evidence/authority split not fully recoverable |
| F Tests/evidence | NOT ASSESSABLE | — | competitor tests/scientific registry unavailable |
| G Security/privacy | NOT ASSESSABLE | — | client auth/privacy/delete-account controls visible; backend enforcement unavailable |
| H UX/user-facing completion | 2 | MEDIUM | broad athlete + coach product flows packaged; runtime discover→use→feedback not device-proven |
| I Failure/degraded-state handling | 2 | MEDIUM | offline/error/CodePush rollback and unavailable-item states visible; lossless recovery not fully proven |
| J Audit closure | NOT APPLICABLE | — | TK project-specific closure criterion |

**No aggregate maturity score** is emitted.

## 2. Packaging and client architecture

The APK contains three DEX files, a ~12 MB React Native bundle, Hermes, Expo modules, Reanimated/Worklets, Firebase Crashlytics, OneSignal, in-app purchase native modules and CodePush/RevoPush metadata. Embedded `app.config` identifies Expo SDK 53 and package `com.TrainHeroic.TrainHeroic`.

**Pattern PAT-COACH-MOBILE-001:** a single athlete-facing mobile client exposes both athlete and coach/team workflows through role/context-specific routes rather than separate workout engines.

**TK relevance:** reinforces TK's rule that Coach/Gym must reuse the same canonical training core, not create a second product kernel.

## 3. Athlete/coach/team domain — major finding

Static identifiers show deep coach-athlete/team functionality: `coachAthlete`, team creation/invite, athlete calendar, coach athlete nutrition, coach session menus, programming routes, saved workouts, team filters and athlete/team state. Existing TK benchmark prose already describes TrainHeroic as coach/team-centric; the APK now supplies direct client evidence.

**Pattern PAT-COACH-ASSIGN-001:** coach programming, athlete assignment, calendar placement and execution are connected as one workflow.

**TK check:** current TK source proves F10 coach relationship/programming/assignment backend/core is mature but UI integration remains incomplete in benchmark documentation. TrainHeroic is therefore especially useful as the UX benchmark for the already-built TK coach domain.

## 4. Program marketplace and saved workouts

The bundle contains marketplace program code URLs, featured programs, program lists, free-trial expiration, add-program-to-calendar flows, saved workout routes and program workouts by date.

**Pattern PAT-PROGRAM-CATALOG-001:** reusable programs are catalogue objects that can be acquired/assigned and then materialised onto a personal calendar.

**TK relevance:** closely matches the chosen “Mijn trainingen”/reusable workout architecture. Keep reusable definition separate from each scheduled/executed instance.

## 5. Calendar-centric programming

Direct API/routes include personal calendar, program workouts, rescheduling, add-to-calendar and coach/athlete calendar identifiers.

**Pattern PAT-CALENDAR-PROGRAM-001:** calendar is the operational projection of program assignments, not the source definition of the workout.

**TK relevance:** aligns with TK's canonical scheduling architecture and supports keeping schedule state separate from reusable workout/program content.

## 6. Working Max / percentage-based prescription

The APK exposes `working_maxes`, create/update working max calls, “This is your working max, which is used for percentage-based training”, target reps, percentage-to-weight conversion and prescribed exercise identifiers.

**Pattern PAT-WORKING-MAX-001:** percentage prescriptions reference an athlete-specific working-max state rather than hard-coding absolute weights into program templates.

**TK check:** TK already has 1RM/e1RM and %1RM Calculation Engine candidates/registry governance. TrainHeroic is a UX/programming benchmark; TK should keep formula provenance/confidence explicit and distinguish user-entered training max from calculated e1RM.

## 7. 1RM and Personal Records

Evidence includes actual rep max graphs, 1 Rep Max, maxes-per-day training-history endpoints, PR graphs, personal-record reducers and PR celebration/share surfaces.

**Pattern PAT-PR-HISTORY-001:** exercise performance history drives dedicated PR/rep-max trend surfaces and celebration/share moments.

**TK relevance:** analytics presentation benchmark; raw PR/e1RM truth remains Calculation Engine output.

## 8. RPE and Training Load

The bundle contains RPE colour/configuration elements and explicit user-facing copy: “Log both Intensity (RPE) and Volume to visualize your Training Load” and “Log your reps and weights while training to visualize your Training Load.”

This is direct evidence that subjective intensity and volume are combined in athlete-facing load analytics. Static analysis does not establish the exact formula.

**Pattern PAT-RPE-LOAD-001:** capture RPE in execution and expose training-load trends alongside volume.

**TK check:** TK already has registry-backed RPE/RIR, sRPE and load architecture. TrainHeroic is useful for UX and coach visibility, not calculation authority.

## 9. Readiness

The APK contains a Readiness score, readiness questions, previous average readiness score, readiness directional indication, score max bar and historical/balance copy. One embedded explanation states that “Balance” zooms out to longer-standing patterns and uses an average of the last 10 scores.

**Important limitation:** the exact readiness composition, weighting, validation and decision consequences are NOT ASSESSABLE from static client evidence.

**Pattern PAT-READINESS-TREND-001:** show current self-report/readiness state together with a longer-term personal baseline/trend rather than a context-free daily number.

**TK rule:** current TK roadmap explicitly rejects a black-box readiness score without components/confidence. Do not copy the opaque score; the useful pattern is the longitudinal comparison UX.

## 10. Session execution and modification

Static identifiers cover exercise logging, set rep count/weight, prescribed blocks, exercise swap/update, circuit/superset flows, session preview, resume, notes/instructions and completed-date/session summary.

The client explicitly warns that swapping an exercise after values have been logged may lose data for that exercise.

**Pattern PAT-INSESSION-MODIFY-001:** allow in-session substitution/editing but surface data-integrity consequences before destructive mutation.

**TK opportunity:** preserve logged-set history when possible; if a replacement changes semantic identity, use explicit migration/confirm rather than silently rewriting history.

## 11. Timers and conditioning

The bundle contains rest timer, Tabata timer, AMRAP, EMOM, countdown/full timer controls and conditioning examples.

**Pattern PAT-MULTITIMER-001:** execution supports protocol-specific timer modes within the same workout/session model.

**TK relevance:** compare against TK interval/execution engine; avoid separate timer-specific workout engines.

## 12. Leaderboards and team competition

TrainHeroic exposes leaderboard types, block summaries, circuit leaderboard filters, completed lift goals, podium assets and team-scoped leaderboard concepts.

**Pattern PAT-COACH-LEADERBOARD-001:** ranking is contextualised inside team/coach/program blocks rather than necessarily a global public leaderboard.

**TK check:** TK's own Social Intelligence benchmark already treats this as the safer/relevant TrainHeroic pattern. Any TK leaderboard should remain scoped, privacy-aware and optional.

## 13. Social/feed and sharing

Evidence includes post-to-feed, comments/replies, fistbumps, session summary sharing, Instagram story sharing and GIF search.

**Pattern PAT-TEAM-FEED-001:** workout completion can generate a social object inside the athlete/team community.

**TK relevance:** Social sprint benchmark. Keep canonical workout data separate from its shareable projection and respect visibility/consent.

## 14. Coach feedback and communication

Client strings/routes indicate coach decision/action flows, comments, messages/community, athlete-card views and session-level interaction.

**TK opportunity:** particularly relevant because current TK benchmark documentation identifies coach notes/feedback and coach-event notification integration as real gaps despite mature F10 backend/core.

**Pattern PAT-COACH-FEEDBACK-001:** attach coach feedback to athlete/session/program context instead of unstructured external chat.

**Status for TK:** **VERIFIED_GAP** for coach notes/feedback UI/domain integration based on current TK benchmark/gap documentation.

## 15. Nutrition

The APK includes daily nutrition, coach-athlete nutrition views, nutrition creation/update flows and Apple Health nutrition messaging. Static evidence supports nutrition tracking/coaching surfaces but not nutrient model depth or recommendation science.

**Pattern PAT-COACH-NUTRITION-001:** nutrition observations can be shared into a coach-athlete context while remaining a distinct domain from workout calculations.

**TK check:** TK has Nutrition Intelligence capability; use TrainHeroic primarily to benchmark coach-facing presentation/workflow.

## 16. Apple Health / health integration

User-facing strings include “Synced from Apple Health” and “Fuel smarter with Nutrition data from Apple Health.” The iOS app config is embedded alongside the Android build, but this Android APK cannot prove current iOS HealthKit runtime behaviour.

A string “Fuel smarter with Apple Health Connect” exists, but is ambiguous and must **not** be interpreted as Android Health Connect implementation. No reliable Android Health Connect conclusion is drawn from this artefact.

## 17. Bluetooth/device capability

Android Bluetooth permissions/strings and device/headphone connectivity modules are packaged, but no direct evidence was found in this static pass for a dedicated workout HR-sensor integration comparable to Runna.

**Result:** generic Bluetooth capability OBSERVED; training sensor semantics NOT ASSESSABLE.

## 18. Exercise library and video

Exercise video state, video URLs, exercise instructions, exercise search, custom/create exercise flows and exercise history are present.

**Pattern:** media/instruction belongs to the exercise definition while athlete performance belongs to separate history.

**TK:** already consistent with MoveKit/media + canonical logging direction.

## 19. Athlete progression analytics

Training Load, PR history, actual rep max, working max, bodyweight trend, streaks and session history provide multiple longitudinal surfaces.

**Pattern PAT-COACH-PROGRESS-001:** athlete progression is represented through multiple interpretable domain views rather than one universal score.

**TK relevance:** fits TK evidence architecture better than opaque composite scoring.

## 20. Bodyweight and trends

Bodyweight logging/history and trend copy are present; one user-facing string requires at least two weigh-ins before showing a trend.

**Pattern PAT-MIN-DATA-UX-001:** explicitly communicate minimum data requirements before a trend is shown.

**TK relevance:** strong fit with Calculation Registry minimum-data-quality/confidence rules; expose insufficiency rather than fabricate a trend.

## 21. Notifications and background lifecycle

OneSignal, Firebase messaging, Expo notifications, push settings/tags and iOS background modes for audio/remote notification are packaged. Android WAKE_LOCK is explicitly requested in app config.

**Pattern:** coach/team/program events are supported by a dedicated push infrastructure.

**TK check:** coach-event notifications are identified in current TK benchmark documentation as not yet integrated; this is a concrete UX/integration benchmark.

## 22. OTA updates / rollback

CodePush/RevoPush metadata and strings for update download, rollback and binary update reporting are present.

**PAT-OTA-001 corroboration:** TrainHeroic independently demonstrates an OTA client-code delivery channel.

**TK governance:** never allow OTA delivery to bypass versioned Calculation/Evidence/Decision semantics.

## 23. Observability and experimentation

Firebase Crashlytics native libraries, App Center config, Eppo feature/experiment infrastructure and telemetry routes are present.

**Pattern PAT-EXPERIMENT-001:** product experimentation/feature assignment is separated from crash telemetry.

**TK caution:** experimentation may alter UX/exposure, never scientific truth or unversioned training rules.

## 24. Billing and entitlements

Native in-app purchase modules, purchase verification/error states, athlete Pro settings, free-trial/upsell/subscription flows and license/user-license concepts are observable.

**Pattern PAT-ROLE-ENTITLEMENT-001:** athlete/coach/product capabilities are gated through explicit license/entitlement state.

**TK check:** TK has commercial/entitlement architecture but native billing validation remains provider/native-client dependent in current documentation.

## 25. Privacy/account controls

Privacy preferences/policy, logout and explicit account-deletion messaging are present. Static evidence does not prove backend deletion completeness, retention policy or authorization.

**Result:** client privacy/account UX OBSERVED; G remains NOT ASSESSABLE.

## 26. Offline/degraded states

Strings include “This feature is unavailable when offline”, network connectivity handling, saved-data reassurance, unavailable/deleted item states and CodePush rollback. This shows explicit degraded-state UX, but not a full lossless offline workout queue.

**Pattern PAT-OFFLINE-BOUNDARY-001:** declare which capabilities degrade offline instead of pretending all network-backed actions are available.

**TK check:** TK's own offline queue is more directly source/test evidenced; competitor is UX benchmark.

## 27. Localisation/accessibility

React Native accessibility infrastructure and font-scaling controls are packaged. The bundle includes broad locale/timezone infrastructure, but actual supported product-language completeness and TalkBack/touch-target quality require runtime audit.

## 28. Security static review

No exploit claim is made. The static pass found no evidence sufficient to assert an auth bypass or exposed production credential. AppCenter/Firebase/OneSignal configuration identifiers in mobile clients are not automatically secrets. Backend authorization and token lifecycle remain NOT ASSESSABLE.

## 29. Technical solution patterns added

- **PAT-COACH-MOBILE-001** — athlete and coach/team workflows reuse one training client/core.
- **PAT-COACH-ASSIGN-001** — programming → assignment → calendar → athlete execution chain.
- **PAT-PROGRAM-CATALOG-001** — reusable/acquirable program definitions materialise to calendar instances.
- **PAT-CALENDAR-PROGRAM-001** — calendar is schedule projection, not workout definition.
- **PAT-WORKING-MAX-001** — athlete-specific working max powers percentage prescription.
- **PAT-PR-HISTORY-001** — PR/rep-max history as dedicated progression surface.
- **PAT-RPE-LOAD-001** — RPE + volume presented as training-load context.
- **PAT-READINESS-TREND-001** — daily readiness shown against personal longitudinal baseline.
- **PAT-INSESSION-MODIFY-001** — explicit integrity warning around in-session substitution.
- **PAT-MULTITIMER-001** — protocol-specific timers within one execution model.
- **PAT-COACH-LEADERBOARD-001** — team/coach-contextual ranking.
- **PAT-TEAM-FEED-001** — completed workout as scoped social object.
- **PAT-COACH-FEEDBACK-001** — session/program-bound coach feedback.
- **PAT-COACH-NUTRITION-001** — nutrition as separate coach-athlete domain.
- **PAT-COACH-PROGRESS-001** — multi-surface athlete progression analytics.
- **PAT-MIN-DATA-UX-001** — communicate minimum observations before showing trends.
- **PAT-EXPERIMENT-001** — experimentation separated from observability/training truth.
- **PAT-ROLE-ENTITLEMENT-001** — explicit product/license entitlement domain.
- **PAT-OFFLINE-BOUNDARY-001** — explicit offline capability boundaries.
- PAT-OTA-001 receives independent corroboration.

## 30. TK current-state implications

The largest TrainHeroic-derived value is **not** basic workout logging. TK already has a mature canonical execution chain, RPE/load calculations, progression and coach-programming backend/core.

The stronger opportunities are:
1. finish coach/programming/assignment **UI integration** on top of existing F10 core;
2. session/program-bound coach notes/feedback;
3. coach-event notifications;
4. team-scoped leaderboards/social projections with privacy controls;
5. calendar-first visibility of assigned programming;
6. working-max/% prescription UX while preserving TK e1RM provenance;
7. readiness trend UX without copying a black-box readiness score;
8. minimum-data/confidence UX;
9. athlete/coach nutrition workflow;
10. multi-protocol timer polish.

## 31. Dynamic audit gates

Runtime follow-up should test athlete onboarding, join team/access code, coach invitation/assignment, marketplace program acquisition, program→calendar materialisation, rescheduling, set logging and exercise swap after logged values, working-max changes and percentage prescription, RPE entry/training-load feedback, readiness questionnaire/history, PR graphs, rest/AMRAP/EMOM/Tabata timers, leaderboards, feed/privacy, coach comments/notifications, nutrition/Apple Health on iOS, offline/reconnect, subscription restore, accessibility, network/TLS and logout/account deletion.

## Final status

**TRAINHEROIC 8.36.0 COMPLETE STATIC AUDIT: CLOSED for supplied-APK static scope.**  
**Dynamic/runtime audit: OPEN.**  
**Server/backend/internal test/scientific-evidence audit: NOT AVAILABLE from supplied artefact.**

Most important TK lesson: TrainHeroic's strongest benchmark value is the **operational bridge from coach programming to assigned athlete calendar, execution, feedback and team context**. TK already has much of the underlying F10/F11 architecture, so the competitor evidence points primarily to completing and polishing the user-facing coach/team workflow rather than inventing another training engine.