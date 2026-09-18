# External Solution Patterns

Living catalogue. A pattern is not a recommendation until checked against current TK main and promoted through the canonical roadmap/change process.

| ID | Domain | Pattern | Evidence | Confidence | TK current state @ 0dcb7cd | Status |
|---|---|---|---|---|---|---|
| PAT-HC-001 | Health data | Native Health Connect boundary around cross-platform product logic | Hevy 3.1.9 Health Connect library, onboarding/install and permissions | HIGH | Repo explicitly states no native Health Connect SDK; Google Health API only | VERIFIED_GAP |
| PAT-WO-001 | Workout execution | One continuous start → live execution → completion → summary chain | Hevy LiveWorkout/Detail/Summary and in-context utilities | HIGH | TK already has canonical Preview → Execution → Logging/completion chain | ALREADY_PRESENT |
| PAT-MEDIA-001 | Exercise library | Exercise media delivered separately from core binary | Hevy remote CloudFront exercise MP4/thumbnails | HIGH | TK already excludes large videos from Android build and serves remotely | ALREADY_PRESENT |
| PAT-OBS-001 | Observability | Dedicated crash/analytics instrumentation in mobile client | Hevy Sentry/Amplitude/Firebase/Branch indicators | HIGH | TK observability foundation exists; vendor-neutral strategy retained | ALREADY_PRESENT |
| PAT-SOC-001 | Social | Workout objects double as shareable/social objects with visibility controls | Hevy feed/comments/follows/privacy/sharing indicators | HIGH | TK Social/privacy model already exists; use as UX benchmark | ALREADY_PRESENT |
| PAT-BG-001 | Mobile lifecycle | Native OS services/alarms support timers, notifications and background work | Hevy exact-alarm, timer receiver/service, boot/push indicators | HIGH | Requires targeted current-TK Android lifecycle audit | TK_CHECK_REQUIRED |
| PAT-WEAR-001 | Wearables | Phone↔watch live workout state plus biometric stream inside active session | Hevy WearListenerService, Wear OS live-sync and HR history indicators | HIGH | TK has provider/device foundations; equivalent Wear OS live workout not established in this audit | CANDIDATE |
| PAT-LINK-001 | Navigation | Stable workout/routine identity exposed through deep links | Hevy Branch/app.link routine evidence | HIGH | TK route architecture exists; canonical external object-link contract not established here | CANDIDATE |
| PAT-WIDGET-001 | Android UX | Home-screen widgets expose high-frequency workout actions/status | Hevy routine/workout/rest/streak/calendar/stats widgets | HIGH | No TK widget capability established in this audit | CANDIDATE |
| PAT-MEDIA-CREATE-001 | Social media | Rich shareable media generated in isolated native media pipeline | Hevy VisionCamera/IMG.LY + shareable media indicators | MEDIUM | TK social can reuse canonical workout data; native media pipeline not established here | CANDIDATE |

| PAT-NATIVE-001 | Client architecture | Typed domain/use-case/repository architecture in large native fitness client | Fitbod 8.31.0-4 Hilt/Room/repositories/use-cases/sync managers | HIGH | Architectural comparator only; TK technology need not match | CANDIDATE |
| PAT-SYNC-001 | Offline/sync | Durable local domain model + coordinated domain sync managers | Fitbod Room DAOs + domain push/pull/sync managers + OfflineTask | HIGH | TK generic offline queue already mature; compare domain ownership/conflict policy | ALREADY_PRESENT |
| PAT-ADAPT-001 | Adaptive programming | Remote workout generation backed by deterministic/local optimisation fallback | Fitbod RemoteWorkoutGenerator + explicit fallback to Optim + ranking/scheme/volume/rest modules | HIGH | Strong fit with TK Calculation → Context → Decision → AI; auto-programming gap needs separate current-main capability check | CANDIDATE |
| PAT-CONTEXT-001 | Context | Persistent athlete/gym config plus explicit per-workout overrides | Fitbod WorkoutConfig + WorkoutConfigOverrides | HIGH | Matches TK Context Engine direction; verify temporary override model | CANDIDATE |
| PAT-PLAN-001 | Programming | Decompose frequency/split/focus recommendations into separate use-cases | Fitbod RecommendedDaysPerWeek, SplitRecommendation, FocusExerciseRecommendation | HIGH | Candidate design pattern for versioned TK Decision Rules | CANDIDATE |
| PAT-REC-MUSCLE-001 | Recovery | Per-muscle recovery estimate plus explicit manual athlete correction | Fitbod recovery %, minsToRecovery, recovery edit/manual adjustment | HIGH | Compare with TK muscle-load/recovery model; preserve evidence/confidence | CANDIDATE |
| PAT-EFFORT-001 | RPE/RIR | Subjective effort is a first-class adaptive input | Fitbod RpeHelper/RiR models/prompts + 1RM/max-effort paths | HIGH | TK already registry-backed for RPE/RIR | ALREADY_PRESENT |
| PAT-STRENGTH-SCORE-001 | Analytics | Composite strength summaries explicitly model insufficient/loading/offline states | Fitbod local/remote strength-score sources and result states | HIGH | Presentation benchmark only unless TK defines registry-backed composite | CANDIDATE |
| PAT-EXERCISE-FEEDBACK-001 | Exercise selection | Structured suitability/rating/exclusion feedback feeds recommendation context | Fitbod exercise ratings/feedback/exclude/replace modules | HIGH | Candidate Context/Decision input for TK auto-programming | CANDIDATE |
| PAT-INJURY-CONTEXT-001 | Athlete context | Self-reported limitation context constrains exercise selection | Fitbod injury DAO/sync/active injuries/exclusions | HIGH | Use only as non-diagnostic context through versioned rules | CANDIDATE |
| PAT-PROVIDER-001 | Integrations | Provider repository owns connection, OAuth, refresh and sync settings | Fitbod Strava repository/OAuth/activity refresh | HIGH | Align with TK provider-adapter architecture | CANDIDATE |
| PAT-FLAGS-001 | Delivery | Remote feature flags decouple deployment from rollout | Fitbod LaunchDarkly client evidence | HIGH | Never allow flags to silently mutate calculation/evidence truth | CANDIDATE |
| PAT-DEGRADE-001 | Resilience | Domain-specific deterministic degraded recommendation path | Fitbod remote workout failure → Optim fallback | HIGH | Strong fit: AI/network unavailable must not remove deterministic training truth | DESIGN_DIRECTION |

| PAT-OTA-001 | Delivery | Controlled OTA product-code channel separate from store binary | Runna 8.52.1 Expo Updates prod channel | HIGH | Governance pattern only; calculation/evidence semantics must remain versioned | CANDIDATE |
| PAT-RUN-PLAN-001 | Running plans | Living plan with explicit schedule/context changes | Runna plan edit/recommendations/training mode/missed/vacation flows | HIGH | TK has running intelligence + scheduling foundations | CANDIDATE |
| PAT-PACE-ADAPT-001 | Running decisions | Prescribed vs observed pace produces athlete-visible proposed target adjustment | Runna pace adjustment/insights/adaptivity UX | HIGH | TK has typed pace/CS/trends; proposal Decision Rule not established | CANDIDATE |
| PAT-RACE-GOAL-001 | Context | Race date/distance/goal is typed plan context | Runna race-event/goal-distance/longest-run flows | HIGH | TK race contexts exist in parts; dedicated running-plan orchestration needs gate | CANDIDATE |
| PAT-SCHEDULE-ADAPT-001 | Scheduling | Missed sessions/vacation alter future schedule without rewriting history | Runna missed-runs/vacation/plan-adjustment flows | HIGH | Strong fit with TK Mijn trainingen scheduling architecture | CANDIDATE |
| PAT-TERRAIN-001 | Running context | Elevation/hilliness influences prescription context | Runna hilliness/elevation recommendation UX | HIGH | TK weather exists; terrain-prescription equivalent not established | CANDIDATE |
| PAT-RUN-REPLAY-001 | Analytics | Raw execution telemetry becomes post-workout replay | Runna record/replay/pace/cadence/map evidence | HIGH | TK running execution/intelligence exists; rich replay not established | CANDIDATE |
| PAT-AUDIO-COACH-001 | Execution | Hands-free cues deliver already-decided workout targets | Runna audio cue + media foreground-service evidence | HIGH | No equivalent established in TK audit | CANDIDATE |
| PAT-SENSOR-SESSION-001 | Devices | External HR sensor identity/state is session-bound provenance | Runna Bluetooth/HeartRateDevice flows | HIGH | Fits TK Raw Data Adapter/provenance design | DESIGN_DIRECTION |
| PAT-ENDURANCE-PROVIDER-001 | Integrations | Common connected-app UX over provider-specific endurance adapters | Runna Garmin/COROS/Strava/Health Connect surfaces | HIGH | TK Garmin/COROS/Strava currently not implemented/access-dependent | VERIFIED_GAP |
| PAT-CALENDAR-001 | Scheduling | Canonical workout maps idempotently to external calendar event | Runna Google/Outlook calendar sync | HIGH | TK scheduling exists; external calendar sync not established | CANDIDATE |
| PAT-CROSS-TRAIN-001 | Programming | Strength/mobility sessions live inside endurance plan | Runna StrengthStore + mobility/Pilates/yoga flows | HIGH | TK structurally supports strength + endurance already | DESIGN_DIRECTION |
| PAT-PROPOSE-CHANGE-001 | Explainability | Adaptive change is a visible proposal with reason/acceptance | Runna adaptivity/pace-change messaging | HIGH | Strong fit with versioned TK Decision outputs | DESIGN_DIRECTION |
| PAT-ENDURANCE-BG-001 | Mobile lifecycle | Native background/foreground infrastructure supports long-running run/audio execution | Runna Notifee/WorkManager/media foreground service | HIGH | Native Android lifecycle audit still needed | TK_CHECK_REQUIRED |

## Pattern maturity
CANDIDATE = observed externally, not yet verified as a TK gap.  
TK_CHECK_REQUIRED = current-main check still required.  
VERIFIED_GAP = current TK main proves missing/insufficient capability.  
ALREADY_PRESENT = core pattern already exists in TK; competitor remains benchmark input.  
DESIGN_READY = original TK solution and tests defined.  
ROADMAP = accepted into canonical roadmap.  
IMPLEMENTED = landed and verified in TK.  
REJECTED = not appropriate for TK.

## Promotion rule
VERIFIED_GAP is not automatic permission to build. Product intent, dependencies, privacy/security, Calculation/Context/Decision/AI boundaries, UX gate and canonical roadmap process still apply.