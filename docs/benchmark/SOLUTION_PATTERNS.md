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

| PAT-COACH-MOBILE-001 | Coach platform | Athlete and coach/team workflows reuse one training client/core | TrainHeroic 8.36.0 athlete/coach/team routes | HIGH | Matches TK one-engine sequencing | DESIGN_DIRECTION |
| PAT-COACH-ASSIGN-001 | Coach programming | Programming → assignment → calendar → athlete execution chain | TrainHeroic coach/program/calendar evidence | HIGH | TK F10 core mature; UI integration remains incomplete | VERIFIED_GAP |
| PAT-PROGRAM-CATALOG-001 | Programs | Reusable/acquirable program definition materialises to scheduled instances | TrainHeroic marketplace/program/calendar flows | HIGH | Matches TK reusable workout/program architecture | DESIGN_DIRECTION |
| PAT-CALENDAR-PROGRAM-001 | Scheduling | Calendar is schedule projection, not workout definition | TrainHeroic personal calendar/program workout routes | HIGH | Matches TK scheduling architecture | ALREADY_PRESENT |
| PAT-WORKING-MAX-001 | Strength programming | Athlete working max drives percentage prescriptions | TrainHeroic working_maxes + percentage-based copy | HIGH | TK e1RM/%1RM exists; UX comparator | CANDIDATE |
| PAT-PR-HISTORY-001 | Analytics | PR/rep-max history is a dedicated progression surface | TrainHeroic PR/actual rep max/maxes-per-day evidence | HIGH | TK progression foundation exists | ALREADY_PRESENT |
| PAT-RPE-LOAD-001 | Load | RPE and volume are exposed together as training-load context | TrainHeroic explicit Training Load copy | HIGH | TK registry-backed RPE/sRPE/load already exists | ALREADY_PRESENT |
| PAT-READINESS-TREND-001 | Recovery | Daily readiness is shown against a personal longitudinal baseline | TrainHeroic readiness + last-10-score Balance copy | HIGH | TK has stronger evidence/confidence governance; UX comparator only | CANDIDATE |
| PAT-INSESSION-MODIFY-001 | Execution | In-session substitution surfaces data-integrity consequences | TrainHeroic swap warning after values logged | HIGH | TK should preserve history or require explicit migration | CANDIDATE |
| PAT-MULTITIMER-001 | Execution | Rest/AMRAP/EMOM/Tabata/countdown modes share session model | TrainHeroic timer evidence | HIGH | Compare with TK interval/execution engine | CANDIDATE |
| PAT-COACH-LEADERBOARD-001 | Social/team | Leaderboards are scoped to coach/team/program context | TrainHeroic leaderboard/block/team evidence | HIGH | TK benchmark already prefers scoped ranking | DESIGN_DIRECTION |
| PAT-TEAM-FEED-001 | Social/team | Completed workout becomes scoped social object | TrainHeroic feed/comments/fistbumps/sharing | HIGH | TK social foundation exists | CANDIDATE |
| PAT-COACH-FEEDBACK-001 | Coach | Feedback is attached to athlete/session/program context | TrainHeroic coach/session/comment evidence | HIGH | TK current benchmark docs identify coach notes/feedback as missing | VERIFIED_GAP |
| PAT-COACH-NUTRITION-001 | Nutrition | Nutrition is a distinct coach-athlete domain | TrainHeroic daily/coach-athlete nutrition evidence | HIGH | TK Nutrition Intelligence exists; coach workflow comparator | CANDIDATE |
| PAT-COACH-PROGRESS-001 | Analytics | Coach sees multiple interpretable athlete progression surfaces | TrainHeroic load/PR/max/bodyweight/streak evidence | HIGH | TK analytics foundation exists | CANDIDATE |
| PAT-MIN-DATA-UX-001 | Evidence UX | Minimum observations are stated before trends are shown | TrainHeroic “at least two weigh-ins” trend copy | HIGH | Direct fit with TK minimum-data/confidence governance | DESIGN_DIRECTION |
| PAT-EXPERIMENT-001 | Delivery | Experiment assignment is separate from observability | TrainHeroic Eppo + Crashlytics evidence | HIGH | Never experiment on unversioned training truth | CANDIDATE |
| PAT-ROLE-ENTITLEMENT-001 | Commercial | Explicit license/entitlement state gates product capabilities | TrainHeroic license/Pro/IAP evidence | HIGH | TK entitlement architecture exists; native billing validation open | CANDIDATE |
| PAT-OFFLINE-BOUNDARY-001 | Resilience | Explicitly declare unavailable offline capabilities | TrainHeroic offline/unavailable-state copy | HIGH | TK offline queue stronger; UX comparator | CANDIDATE |

| PAT-SEED-FIRST-001 | Catalogue/offline | Versioned local exercise/program seed plus delta sync | Boostcamp 264 84MB Watermelon seed + dated program assets | HIGH | Strong MoveKit metadata scaling candidate; keep media remote | CANDIDATE |
| PAT-DOMAIN-LOCAL-001 | Offline/sync | Durable local domain records carry sync metadata | Boostcamp Watermelon _status/_changed across domains | HIGH | Compare with TK IndexedDB queue/read models | CANDIDATE |
| PAT-PROGRAM-RICHMETA-001 | Programs | Structured goal/equipment/difficulty/duration/audience metadata drives discovery | Boostcamp coach_program schema | HIGH | Candidate typed TK program metadata | CANDIDATE |
| PAT-PROGRAM-INSTANCE-001 | Programs | Definition → athlete program instance → workout execution are separate | Boostcamp user_program/program_log/program_workout_log | HIGH | Directly corroborates TK canonical design | ALREADY_PRESENT |
| PAT-PROGRAM-OVERRIDE-001 | Context | Athlete schedule/exercise/variation overrides do not mutate base program | Boostcamp program_log override fields | HIGH | Fitbod independently corroborates override pattern | DESIGN_DIRECTION |
| PAT-AI-PROGRAM-STREAM-001 | AI UX | Program generation streams/progressively surfaces result | Boostcamp generateAiProgramStream route | HIGH | TK AI-PROGRAM-AUTOGEN closed; UX/resilience comparator | CANDIDATE |
| PAT-RECOMMEND-FUNNEL-001 | Onboarding | Explicit context survey → recommendation → preview → start | Boostcamp recommendation analytics/routes | HIGH | Context must remain inspectable, not analytics-driven truth | CANDIDATE |
| PAT-1RM-DUAL-001 | Strength | Measured 1RM distinct from formula-estimated 1RM | Boostcamp actual_1RM/estimated_1RM + Brzycki label | HIGH | Direct fit with TK calculation provenance | DESIGN_DIRECTION |
| PAT-MOVEMENT-SCORE-001 | Analytics | Composite strength score retains movement components/source maxes | Boostcamp strength score tables/copy | HIGH | No opaque TK composite without evidence/population scope | CANDIDATE |
| PAT-MILESTONE-001 | Progression | Milestones derive from and link to metric history | Boostcamp PR/milestone/statistics evidence | HIGH | TK progression exists; UX comparator | CANDIDATE |
| PAT-WARMUP-TEMPLATE-001 | Execution | Reusable warm-up set templates attached to exercise execution | Boostcamp warmup editor/insertion evidence | HIGH | Automatic percentages must remain deterministic | CANDIDATE |
| PAT-REST-PRESET-001 | Execution | Planned rest target persists separately from elapsed timer | Boostcamp rest timer/default settings | HIGH | Compare TK execution timer | CANDIDATE |
| PAT-MUSCLE-ENGAGE-001 | Analytics | Workout/program muscle distribution is visualized | Boostcamp muscle engagement events | HIGH | TK heatmap direction exists; formula remains TK-owned | CANDIDATE |
| PAT-EXERCISE-KNOWLEDGE-001 | Exercise library | Instruction/progression/risk metadata separate from performance history | Boostcamp master_exercise schema | HIGH | Strong MoveKit metadata candidate | CANDIDATE |
| PAT-EXERCISE-OVERRIDE-002 | Exercise library | User/custom alternatives retain origin identity beside master catalogue | Boostcamp user_exercise + alternative config | HIGH | Protect canonical MoveKit catalogue | DESIGN_DIRECTION |
| PAT-PROGRAM-OUTCOME-REVIEW-001 | Programs | Structured completion/context/outcome review beyond star rating | Boostcamp program_review schema | HIGH | Observational feedback, never scientific evidence | CANDIDATE |
| PAT-SOCIAL-PROJECTION-001 | Social | Training achievement projected into social object, canonical log separate | Boostcamp feed/comments/sharing evidence | HIGH | Aligns TK Social sprint | DESIGN_DIRECTION |
| PAT-WEEKLY-REPORT-001 | Insights | Periodic calculated summary is a shareable insight object | Boostcamp weekly report events | HIGH | AI may narrate, not calculate values | CANDIDATE |
| PAT-HEALTH-MINPERM-001 | Health | Request only Health Connect record types required by product | Boostcamp READ_WEIGHT/WRITE_WEIGHT/WRITE_EXERCISE | HIGH | Apply if TK native Health Connect is implemented | DESIGN_DIRECTION |
| PAT-SYNC-DIRECTION-001 | Observability | Sync errors identify domain and push/pull direction | Boostcamp weight push/pull failure paths | HIGH | Candidate TK error taxonomy refinement | CANDIDATE |

| PAT-HEALTH-DOMAIN-MODULE-001 | Women's health | Sensitive life-stage/health capabilities are explicit domains | Clue 267.0 cycle/predictions/pregnancy/perimenopause/consent modules | HIGH | Matches TK typed Context domains | DESIGN_DIRECTION |
| PAT-CYCLE-RAW-001 | Women's health | Observed cycle events remain separate from predicted future events | Clue cycle/prediction models | HIGH | Strengthen TK provenance UX | CANDIDATE |
| PAT-PREDICTION-PROVENANCE-001 | Evidence | Prediction type/source/context is retained | Clue LocalAvailablePredictions/manual/predicted states | HIGH | Direct fit with TK confidence/data-quality architecture | DESIGN_DIRECTION |
| PAT-SYMPTOM-OBS-PRED-001 | Women's health | Recorded symptom and predicted symptom are separate | Clue symptom prediction routes/models | HIGH | TK symptom logging exists; prediction provenance candidate | CANDIDATE |
| PAT-LIFESTAGE-MODE-001 | Context | Explicit life-stage mode without automatic training prescription | Clue perimenopause domain | HIGH | TK perimenopause UI absent; hard rules remain DEFER | CANDIDATE |
| PAT-PREGNANCY-MODE-001 | Context | Pregnancy is explicit state, never inferred from irregular cycle | Clue pregnancy domain/onboarding | HIGH | TK pregnancy training remains DEFER | REFERENCE_ONLY |
| PAT-NONBLEEDING-CONTEXT-001 | Context | Explicit non-bleeding/contraception context | Clue non-bleeding + contraception evidence | HIGH | TK contraception UI/storage gap already documented | VERIFIED_GAP |
| PAT-TEMP-SOURCE-001 | Wearables | Skin/basal/body/delta temperature retain measurement semantics | Clue measurement + Health Connect models | HIGH | Candidate Raw Data provenance rule | DESIGN_DIRECTION |
| PAT-CYCLE-BIOMETRIC-VIEW-001 | Insights | Biometrics shown descriptively across cycle context without proving causality | Clue HRV/RHR cycle analysis DTOs | HIGH | Strong fit with TK scientific guardrails | DESIGN_DIRECTION |
| PAT-HC-RESYNC-001 | Health Connect | Explicit permissions/settings/resync UX | Clue HC workers/settings/resync events | HIGH | TK native HC remains gap | CANDIDATE |
| PAT-HEALTH-SYNC-MODES-001 | Health Connect | Scheduled/background and user-triggered health sync are separate | Clue background + one-time HC workers | HIGH | Candidate Health Data Gateway behaviour | CANDIDATE |
| PAT-HEALTH-REPORT-001 | Privacy/export | Purpose-limited sensitive health report/export | Clue DoctorReport domain | HIGH | Athlete-controlled export candidate | CANDIDATE |
| PAT-CONSENT-VERSION-001 | Privacy | Consent is typed and versioned, not one boolean | Clue mandatory/optional/health/parental consent models | HIGH | Candidate TK sensitive-context consent enhancement | CANDIDATE |
| PAT-AGE-CONSENT-001 | Privacy | Age/parental consent are explicit workflow states | Clue Under13/Under16 routes | HIGH | Only if TK age scope changes | REFERENCE_ONLY |
| PAT-TLS-PIN-001 | Security | First-party TLS pinning for sensitive-health client | Clue network_security_config SHA-256 pins | HIGH | Threat-model before adoption; operational rotation cost | CANDIDATE |
| PAT-SENSITIVE-OFFLINE-001 | Resilience | Health UX exposes offline/sync freshness state | Clue offline/full-sync/last-sync evidence | HIGH | AI must not treat stale health context as current | DESIGN_DIRECTION |
| PAT-HEALTH-ANALYSIS-SEPARATION-001 | Architecture | Measurement → analysis/statistics → presentation are separate | Clue temperature/heart-rate analysis domains | HIGH | Direct fit TK Raw→Calculation→Context | DESIGN_DIRECTION |
| PAT-AI-HEALTH-CONSENT-001 | AI/privacy | Explicit consent before conversational use of sensitive health data | Clue ChatWithYourData ChatConsent | HIGH | Strong comparator for TK AI Coach scope | CANDIDATE |
| PAT-HEALTH-EDU-001 | Education | Educational content is separate from personal prediction/decision | Clue content layer | HIGH | Candidate evidence-linked TK education | CANDIDATE |
| PAT-HEALTH-WIDGET-001 | Mobile UX | Bounded daily tracking/status via home-screen widget | Clue cycle/tracking widgets | HIGH | Default to low-sensitivity output | CANDIDATE |
| PAT-ANALYTICS-CONSENT-001 | Telemetry | Analytics/engagement respects consent state | Clue consent-aware analytics identifiers | MEDIUM | Health/training payload prohibition remains absolute in TK | CANDIDATE |
| PAT-HEALTH-FLAGS-001 | Delivery | Remote content/feature flags separated from health truth | Clue Braze feature/content sync | HIGH | Never alter Calculation/Decision semantics silently | DESIGN_DIRECTION |
| PAT-SENSITIVE-LOCALISE-001 | UX | Sensitive terminology receives domain-specific localization | Clue 24 languages + localized life-stage assets | HIGH | Candidate Women's Performance localization gate | CANDIDATE |

| PAT-COMPOSITE-COMPONENTS-001 | Recovery | Composite output retains factors/components and calibration state | WHOOP Recovery details/factors/calibration | HIGH | TK recovery should remain registry-backed and explainable | DESIGN_DIRECTION |
| PAT-LOAD-TARGET-LIVE-001 | Training load | Precomputed load target feeds live execution/haptics | WHOOP Strain Coach | HIGH | Target must originate in TK Calculation/Decision | CANDIDATE |
| PAT-LOAD-RECOVERY-PAIR-001 | Insights | Load and recovery shown together but remain separate metrics | WHOOP Strain + Recovery | HIGH | Fits TK corroboration architecture | DESIGN_DIRECTION |
| PAT-SLEEP-NEED-BREAKDOWN-001 | Sleep | Need/debt/schedule/achievement are separate sleep concepts | WHOOP Sleep Need/Coach | HIGH | Formula must be TK evidence-registered | CANDIDATE |
| PAT-WEARABLE-ACTION-STATE-001 | Devices | Phone state and wearable action state explicitly reconciled | WHOOP Smart Alarm | HIGH | Future device-control pattern | CANDIDATE |
| PAT-STRESS-CONTEXT-001 | Recovery | Stress is its own time-varying context, not renamed recovery | WHOOP Stress Monitor | HIGH | No diagnostic interpretation | CANDIDATE |
| PAT-BEHAVIOR-OUTCOME-001 | Longitudinal | User behaviors linked to later outcome statistics after minimum data | WHOOP Journal/Behavior Impact | HIGH | Strong nutrition/supplement/recovery candidate | CANDIDATE |
| PAT-ASSOCIATION-LABEL-001 | Evidence UX | Observational behavior/outcome relationships use non-causal language | WHOOP Behavior Impact audit boundary | HIGH | Explicit TK differentiation guardrail | DESIGN_DIRECTION |
| PAT-LONGEVITY-COMPOSITE-001 | Health | Longevity composite should expose components/population scope | WHOOP Age/Pace of Aging | HIGH | No TK score without evidence registry | REFERENCE_ONLY |
| PAT-HEALTH-SUMMARY-001 | Health UX | Bounded summary organizes canonical health measurements | WHOOP Health Monitor | HIGH | Candidate Lichaam surface, no diagnosis | CANDIDATE |
| PAT-CLINICIAN-HANDOFF-001 | Health | Clinical escalation is a distinct human workflow | WHOOP clinician-in-the-loop | HIGH | Future reference; AI must not diagnose | REFERENCE_ONLY |
| PAT-AI-DATA-PRIVACY-001 | AI/privacy | AI personalization has explicit data-use explanation/consent | WHOOP Coach privacy education | HIGH | Strong TK AI Coach comparator | CANDIDATE |
| PAT-AI-MEMORY-SCOPE-001 | AI/privacy | Persistent coach memory is explicit and scoped | WHOOP Coach Memory | HIGH | Separate memory from canonical athlete truth | CANDIDATE |
| PAT-STRENGTH-WEARABLE-001 | Strength/devices | Structured strength log can be enriched by wearable sensing | WHOOP Strength Trainer | HIGH | Exercise/set log remains canonical | CANDIDATE |
| PAT-ACTIVITY-WORKOUT-LINK-001 | Data model | Physiological activity and structured workout can be linked after the fact | WHOOP Muscular Load linking | HIGH | Strong TK Raw Data ↔ Training truth pattern | DESIGN_DIRECTION |
| PAT-EXERCISE-EQUIVALENCE-001 | Exercise library | Custom exercise equivalence for calculations is explicit/reversible | WHOOP custom exercise mapping | HIGH | Useful for MoveKit/user exercises | CANDIDATE |
| PAT-WEEKLY-GOAL-PLAN-001 | Planning | Weekly wellness goals orchestrate features without becoming workout definition | WHOOP Weekly Plan | HIGH | Keep separate from canonical training program | CANDIDATE |
| PAT-PROVIDER-ADAPTER-001 | Integrations | Provider-specific API/models isolated behind adapter | WHOOP Strava module | HIGH | TK already aligned | ALREADY_PRESENT |
| PAT-DEVICE-PIPELINE-001 | Devices | Transport/protocol/firmware is separate upstream adapter layer | WHOOP BLE/connectivity/packet stack | HIGH | Direct fit TK Raw Data Adapter | DESIGN_DIRECTION |
| PAT-FIRMWARE-GATE-001 | Devices | Device firmware compatibility modeled separately from app version | WHOOP firmware update stack | HIGH | Relevant to directly managed devices | CANDIDATE |
| PAT-DEVICE-BACKFILL-001 | Sync | Wearable-resident history supports backfill/reconciliation | WHOOP strap-history-sync | HIGH | Require dedupe/idempotency/provenance | CANDIDATE |
| PAT-LIVE-ACTIVITY-001 | Execution | Live sensor stream later materializes into durable activity history | WHOOP realtime activity/GPS | HIGH | Live UI never sole persistence path | DESIGN_DIRECTION |
| PAT-ACCOUNT-EXPORT-001 | Privacy/platform | Data export is async request/status/error workflow | WHOOP member-data-export | HIGH | Current TK generic account export gap | VERIFIED_GAP |
| PAT-MULTISOURCE-SYNC-001 | Sync | Phone, wearable and server state remain distinct reconciliation sources | WHOOP sync architecture | HIGH | Strong Health Data Gateway pattern | DESIGN_DIRECTION |
| PAT-DEVICE-DEGRADED-001 | Resilience | Device UX distinguishes disconnected/out-of-sync/incompatible/low-battery states | WHOOP BLE/firmware/error evidence | HIGH | Candidate TK Concept2/wearable taxonomy | CANDIDATE |

| PAT-MULTISPORT-DOMAIN-001 | Architecture | Shared platform with sport/device-specific domain models | Garmin Connect 5.28 | HIGH | Matches TK sport-neutral execution + sport adapters | DESIGN_DIRECTION |
| PAT-READINESS-FACTORS-001 | Recovery | Readiness is downstream interpretation, not raw sensor truth | Garmin Training Readiness | HIGH | TK already aligned | ALREADY_PRESENT |
| PAT-TRAINING-STATUS-LONG-001 | Longitudinal | Daily readiness separated from longer-horizon training status | Garmin Training Status | HIGH | Candidate TK longitudinal UX refinement | CANDIDATE |
| PAT-LOAD-HORIZON-001 | Load | Acute and chronic load shown separately with descriptive status | Garmin acute/chronic load | HIGH | ACWR never injury predictor/safe zone | DESIGN_DIRECTION |
| PAT-ENERGY-COMPOSITE-001 | Recovery | Consumer energy composite retains component context | Garmin Body Battery | HIGH | No TK clone without evidence | REFERENCE_ONLY |
| PAT-SLEEP-PROVIDER-RAW-001 | Sleep | Raw/provider sleep data separate from proprietary sleep score | Garmin Sleep Score | HIGH | Preserve source provenance | DESIGN_DIRECTION |
| PAT-PROVIDER-FITNESS-METRIC-001 | Endurance | Provider-estimated fitness metric remains provider-labelled | Garmin VO2max | HIGH | Do not overwrite TK estimate | DESIGN_DIRECTION |
| PAT-THRESHOLD-PROVENANCE-001 | Endurance | Measured/device-estimated/user thresholds are distinct sources | Garmin FTP/lactate threshold | HIGH | Direct fit TK Calculation Registry | DESIGN_DIRECTION |
| PAT-PREDICT-PERFORMANCE-001 | Endurance | Prediction retains model/source/date vs measured performance | Garmin Race Predictor | HIGH | Future only with evidence/confidence | CANDIDATE |
| PAT-ENV-ACCLIMATION-001 | Context | Heat/altitude adaptation is longitudinal exposure context | Garmin acclimation | HIGH | Candidate TK Context Engine | CANDIDATE |
| PAT-INTRA-ACTIVITY-CONDITION-001 | Endurance | Within-session condition separate from daily readiness/status | Garmin Performance Condition | MEDIUM | Candidate, no opaque composite | CANDIDATE |
| PAT-WORKOUT-EFFECT-001 | Analytics | Training effect is downstream interpretation of actual workout | Garmin Training Effect | HIGH | Evidence-backed only | CANDIDATE |
| PAT-ADAPT-DEVICE-DELIVERY-001 | Devices | Adaptive decision and device workout delivery are separate stages | Garmin Adaptive Coach | HIGH | Delivery adapter cannot alter Decision output | DESIGN_DIRECTION |
| PAT-WORKOUT-PORTABILITY-001 | Execution | Structured workout definition portable across endpoints | Garmin workouts/device delivery | HIGH | Strong phone/watch/device candidate | CANDIDATE |
| PAT-PACING-PLAN-001 | Running | Planned race pacing separate from live actual pace | Garmin PacePro | HIGH | Calculation → execution comparison | CANDIDATE |
| PAT-POWER-PACING-001 | Cycling | Route/event-specific planned power target layer | Garmin Power Guide | HIGH | After canonical FTP/power UX | CANDIDATE |
| PAT-ZONE-EDUCATION-001 | Education | Zone setup paired with athlete-facing training explanation | Garmin HR-zone tutorials | HIGH | Candidate after evidence/source semantics | CANDIDATE |
| PAT-ROUTE-ASSET-001 | Endurance | Reusable course/route separate from completed activity | Garmin Courses | HIGH | Future endurance planning | CANDIDATE |
| PAT-LIVE-SHARE-001 | Social/safety | Live location/activity share is temporary consented projection | Garmin LiveTrack | HIGH | Privacy/expiry required | REFERENCE_ONLY |
| PAT-GEAR-LIFECYCLE-001 | Equipment | Equipment linked to activities accumulates usage history | Garmin Gear | HIGH | Candidate shoes/bikes/equipment | CANDIDATE |
| PAT-HC-GUARD-001 | Health Connect | Health-platform sync fails closed on unsupported/no-permission state | Garmin Health Connect | HIGH | Future TK gateway requirement | DESIGN_DIRECTION |
| PAT-HYDRATION-GOAL-001 | Nutrition | Hydration goal/log is independent interoperable behavior domain | Garmin Hydration | HIGH | TK foundation exists | ALREADY_PRESENT |
| PAT-NUTRITION-PROVIDER-001 | Nutrition | Specialist nutrition provider can supply source-labelled logs | Garmin MyFitnessPal | HIGH | Candidate integration | CANDIDATE |
| PAT-ECOSYSTEM-DEVICE-BRIDGE-001 | Devices | Hardware sub-ecosystem shares account/training platform via adapter | Garmin Tacx | HIGH | Concept2 architectural analogue | DESIGN_DIRECTION |
| PAT-DEVICE-APP-EXTENSION-001 | Devices | Device extension consumes platform data without becoming truth source | Garmin Connect IQ | HIGH | Future companion/watch reference | CANDIDATE |
| PAT-AUDIO-GUIDANCE-001 | Execution | Hands-free audio guidance consumes canonical execution state | Garmin audio prompts | HIGH | Strong running/cycling/erg candidate | CANDIDATE |
| PAT-DEVICE-CAPABILITY-GATE-001 | Devices | Feature availability driven by explicit capability metadata | Garmin device capability handlers | HIGH | Strong Concept2/wearable pattern | CANDIDATE |
| PAT-MULTIDEVICE-SOURCE-001 | Data provenance | Preferred/source device remains explicit with multiple suppliers | Garmin preferred tracker/last device | HIGH | Health Data Gateway requirement | CANDIDATE |
| PAT-DOMAIN-ERROR-001 | Resilience | Sync/fetch failure identifies affected metric/domain | Garmin metric-specific errors | HIGH | Observability/UX refinement | CANDIDATE |

| PAT-ERG-TYPE-001 | Connected equipment | RowErg/BikeErg/SkiErg identity is canonical metadata | ErgData 2.2.29 | HIGH | TK typed semantics already present | ALREADY_PRESENT |
| PAT-PM-CAPABILITY-001 | Devices | PM generation/machine/firmware gates supported behavior | ErgData 2.2.29 | HIGH | Refine generic capability registry | CANDIDATE |
| PAT-HR-SOURCE-001 | Sensors | HR source identity remains separate from erg identity | ErgData HRM/PM evidence | HIGH | TK Concept2 provenance aligned | ALREADY_PRESENT |
| PAT-ERG-WORKOUT-ASSET-001 | Training | Erg workout configuration is reusable/syncable separately from result | ErgData custom/favorite/WOD | HIGH | TK My Training architecture aligned | ALREADY_PRESENT |
| PAT-ERG-INTERVAL-001 | Execution | Erg interval definition and interval result are distinct | ErgData variable interval schema | HIGH | TK IntervalEngine aligned | ALREADY_PRESENT |
| PAT-ERG-TARGET-001 | Execution | Erg target dimension typed as stroke/HR/pace/watts/calories | ErgData variable interval targets | HIGH | Candidate richer structured targets | CANDIDATE |
| PAT-PACER-001 | Execution | Pacer visualizes prescribed target without becoming calculation source | ErgData pacer | HIGH | Candidate erg execution UX | CANDIDATE |
| PAT-FORCE-CURVE-001 | Erg intelligence | Force visualization is machine-capability gated | ErgData Row/Ski force curve, not Bike | HIGH | Current TK advanced PM5 gap | VERIFIED_GAP |
| PAT-ERG-STROKE-METRICS-001 | Erg intelligence | Stroke/drive/force detail retained outside generic cardio summary | ErgData split/interval schema | HIGH | Current TK contract lacks full force/drive set | VERIFIED_GAP |
| PAT-ERG-RESULT-001 | Data model | Durable result combines summary/targets/device provenance; detail in children | ErgData workout_results | HIGH | Strong TK canonical activity pattern | DESIGN_DIRECTION |
| PAT-SPLIT-DETAIL-001 | Data model | Split detail is child collection under stable workout identity | ErgData split_data | HIGH | TK structured history aligned | ALREADY_PRESENT |
| PAT-STROKE-STREAM-001 | Data model | High-frequency stroke stream stored separately from summary | ErgData workout_stroke_data | HIGH | Optional advanced rowing candidate | CANDIDATE |
| PAT-ERG-OFFLINE-001 | Resilience | Completed erg result locally durable before cloud sync | ErgData isOffline/sync schema | HIGH | TK offline queue aligned | ALREADY_PRESENT |
| PAT-ERG-CLOUD-LINK-001 | Sync | Local PM workout and Logbook result are separate lifecycle states | ErgData Logbook sync | HIGH | TK Logbook dedup aligned | ALREADY_PRESENT |
| PAT-RESULT-VERIFICATION-001 | Integrity | Verification/ranking metadata separate from performance | ErgData verified/ranked | HIGH | Future competition-only candidate | CANDIDATE |
| PAT-WORKOUT-PRIVACY-001 | Privacy | Result visibility metadata does not alter performance truth | ErgData privacySetting | HIGH | TK social privacy aligned | ALREADY_PRESENT |
| PAT-WORKOUT-SHARE-ASSET-001 | Social | Share workout definition separately from completed workout | ErgData shared workout config | HIGH | Candidate My Training sharing | CANDIDATE |
| PAT-WOD-001 | Content | Curated daily workout can become reusable personal workout | ErgData WOD/favorites | HIGH | Optional content layer | CANDIDATE |
| PAT-SYNCABLE-TEMPLATE-001 | Sync | Reusable templates have independent sync state | ErgData favorites sync | HIGH | TK My Training sync comparator | CANDIDATE |
| PAT-HR-TARGET-ERG-001 | Erg intelligence | HR zone is typed erg target alongside pace/power/stroke | ErgData targets | HIGH | Pending TK HR-zone evidence semantics | CANDIDATE |
| PAT-DRAG-FACTOR-001 | Erg intelligence | Drag factor is device metric/context, not resistance equivalence | ErgData result/split schema | HIGH | TK already records conservatively | ALREADY_PRESENT |
| PAT-DEVICE-PROVENANCE-001 | Devices | PM/firmware/serial/model provenance retained with result | ErgData workout_results | HIGH | Candidate TK provenance enrichment | CANDIDATE |
| PAT-SAVED-DEVICE-SCOPE-001 | Devices | Remembered-device policy explicit and bounded | ErgData one PM5 per erg type | HIGH | Product-rule candidate, not copy requirement | CANDIDATE |
| PAT-BLE-SIGNAL-UX-001 | Devices | Pairing UI exposes signal quality | ErgData signal assets | MEDIUM | Candidate PM5 pairing UX | CANDIDATE |
| PAT-ERG-LIVE-SCREEN-001 | Execution | Configurable machine-specific live screens consume one canonical state | ErgData workout screen config | HIGH | Candidate UI refinement | CANDIDATE |
| PAT-TARGET-ACHIEVEMENT-001 | Execution | Actual-vs-prescribed comparison renders target achievement | ErgData target achieved UI | MEDIUM | TK planned-vs-actual foundation exists | CANDIDATE |
| PAT-ERG-GAMIFIED-001 | Engagement | Gamified erg visualization consumes telemetry without changing truth | ErgData Loop assets | MEDIUM | Low-priority UX candidate | CANDIDATE |
| PAT-DUAL-LOCAL-STORE-001 | Persistence | Device app may isolate local stores by purpose | ErgData Room + LiteCoreJNI | MEDIUM | No second TK store without demonstrated need | REFERENCE_ONLY |

| PAT-FAST-LOG-DATA-001 | Strength logging | Compact structured set rows support repeated low-friction entry | Strong 6.3-beta.19 | HIGH | TK execution data model aligned; dynamic UX benchmark needed | DESIGN_DIRECTION |
| PAT-RPE-ENTRY-001 | Strength logging | RPE is constrained typed field with dedicated fast-entry UI | Strong 6.3-beta.19 | HIGH | TK RPE canonical; UX comparator | ALREADY_PRESENT |
| PAT-BEST-SET-DIMENSION-001 | Progress | Best/PR object typed by 1RM/weight/reps/distance/duration/pace | Strong 6.3-beta.19 | HIGH | Candidate richer PR taxonomy | CANDIDATE |
| PAT-SET-PREFILL-001 | Strength logging | Planned/prior values provide editable set prefill | Strong expected/predicted fields | HIGH | Preserve planned-vs-actual provenance | CANDIDATE |
| PAT-WARMUP-FORMULA-001 | Strength | Warmup formula is persistent/configurable domain | Strong WarmUpFormulaRealm | HIGH | TK calc exists; configurable UX candidate | CANDIDATE |
| PAT-GROUPED-SET-001 | Strength | Superset group has stable index/order and group rest behavior | Strong superset model | HIGH | TK supersets already present | ALREADY_PRESENT |
| PAT-SET-TYPE-001 | Strength | Special set type is structured metadata with type-specific behavior | Strong dropset/warmup evidence | HIGH | Candidate typed set taxonomy | CANDIDATE |
| PAT-REST-SCOPE-001 | Execution | Rest policy scoped to normal/warmup/superset/dropset | Strong rest timer fields | HIGH | Recheck current TK before gap promotion | CANDIDATE |
| PAT-NOTE-SCOPE-001 | Logging | Workout and exercise notes are distinct scopes | Strong CSV schema | HIGH | Verify TK UI persistence | CANDIDATE |
| PAT-WORKOUT-CSV-IMPORT-001 | Portability | Athlete workout history has structured CSV import workflow | Strong ImportCsvUseCase | HIGH | No equivalent TK athlete import surfaced | VERIFIED_GAP |
| PAT-WORKOUT-CSV-EXPORT-001 | Portability | Training history exports stable human-readable set schema | Strong ExportCSV | HIGH | TK export exists | ALREADY_PRESENT |
| PAT-WORKOUT-BACKUP-001 | Resilience | Workout backup/recovery distinct from sync | Strong WorkoutBackupUseCase | HIGH | Product-driven candidate | CANDIDATE |
| PAT-STRENGTH-LOCAL-MODEL-001 | Persistence | Rich local workout/set/exercise model minimizes network dependence | Strong Realm models | HIGH | TK offline architecture equivalent | ALREADY_PRESENT |
| PAT-HC-RECONCILE-001 | Health Connect | Local-change and HC-sync timestamps tracked separately | Strong lastChangedOnHealthConnect | HIGH | Future TK HC gateway pattern | DESIGN_DIRECTION |
| PAT-HC-RETRY-001 | Health Connect | HC writes/deletes run as retryable sync jobs | Strong HC attempt/sync strings | HIGH | Future native HC requirement | DESIGN_DIRECTION |
| PAT-MEASUREMENT-LOCAL-001 | Body data | Body measurements are first-class records separate from workouts | Strong MeasurementRealm | HIGH | TK body-data domain exists | ALREADY_PRESENT |
| PAT-WIDGET-STATE-001 | Widgets | Widget config/state is projection/cache, not training truth | Strong WidgetRealm | HIGH | Future widget architecture | DESIGN_DIRECTION |
| PAT-WORKOUT-FOLDER-001 | Training library | Reusable routines can be organized independently of history | Strong FolderRealm | HIGH | Candidate at My Training scale | CANDIDATE |
| PAT-PORTABILITY-ROUNDTRIP-001 | Portability | Import/export designed toward migration/roundtrip rather than display dump | Strong CSV import + export | HIGH | Strong athlete-ownership direction | DESIGN_DIRECTION |

| PAT-HYBRID-DOMAIN-001 | Architecture | Hybrid training domain uses native adapters without moving truth into bridge | Alpha Progression 7.5 | HIGH | Directly relevant to TK native/web boundary | DESIGN_DIRECTION |
| PAT-STRENGTH-GENERATOR-CONTEXT-001 | Programming | Strength generator consumes explicit equipment/experience/goal/focus/frequency/duration/split context | Alpha Progression 7.5 | HIGH | Compare with TK Context Engine/autogen | DESIGN_DIRECTION |
| PAT-GENERATE-THEN-EDIT-001 | Programming | Generated plan remains editable/duplicable before execution | Alpha Progression 7.5 | HIGH | TK Builder/snapshot architecture aligned | ALREADY_PRESENT |
| PAT-MUSCLE-FOCUS-001 | Programming | Muscle focus can affect frequency, order and set volume separately | Alpha Progression 7.5 | HIGH | Candidate explicit Decision dimensions | CANDIDATE |
| PAT-GENERATOR-FEASIBILITY-001 | Programming | Generator fails/degrades when equipment/exercise coverage is insufficient | Alpha Progression 7.5 | HIGH | Strong MoveKit/program-autogen gate | CANDIDATE |
| PAT-EXPERIENCE-PRESCRIPTION-001 | Context | Experience influences exercise selection, sets/reps and scheduling | Alpha Progression 7.5 | HIGH | TK Context Engine aligned | ALREADY_PRESENT |
| PAT-RIR-ENTRY-001 | Strength | RIR is structured actual/target data | Alpha Progression 7.5 | HIGH | TK canonical RIR aligned | ALREADY_PRESENT |
| PAT-RIR-PERIODISATION-001 | Programming | Planned RIR changes across cycle/week | Alpha Progression 7.5 | HIGH | Versioned Decision-rule candidate | CANDIDATE |
| PAT-SET-PERIODISATION-001 | Programming | Set count changes across cycle/week as separate prescription dimension | Alpha Progression 7.5 | HIGH | Versioned Decision-rule candidate | CANDIDATE |
| PAT-PLANNED-DELOAD-001 | Programming | Deload is explicit program/workout state with modified prescription | Alpha Progression 7.5 | HIGH | Strong TK Decision UX pattern | CANDIDATE |
| PAT-DELOAD-SNAPSHOT-001 | Execution | Deload state materialises into scheduled/executed workout | Alpha Progression 7.5 | HIGH | Fits TK snapshot architecture | DESIGN_DIRECTION |
| PAT-PROGRESSION-INPUTS-001 | Progression | Recommendation combines history, target range and achievable load | Alpha Progression 7.5 | HIGH | TK progression exists; equipment feasibility check | TK_CHECK_REQUIRED |
| PAT-LOAD-FEASIBILITY-001 | Progression | Recommendation projected onto physically available load increments | Alpha Progression 7.5 | HIGH | Check end-to-end TK progression path | TK_CHECK_REQUIRED |
| PAT-REFERENCE-WORKOUT-001 | Progression | Explicit prior workout retained as comparator | Alpha Progression 7.5 | MEDIUM | Explainability/provenance candidate | CANDIDATE |
| PAT-E1RM-ENSEMBLE-001 | Calculation | Multiple e1RM formulas combined into estimate | Alpha Progression 7.5 | HIGH | TK registry already permits this | ALREADY_PRESENT |
| PAT-10RM-METRIC-001 | Calculation | Rep-max estimate available at 10 reps | Alpha Progression 7.5 | HIGH | Evidence review required before TK registry | CANDIDATE |
| PAT-PERFORMANCE-METRIC-VIEW-001 | Analytics | User selects 1RM/10RM/volume view by context | Alpha Progression 7.5 | HIGH | Candidate Inzicht UX | CANDIDATE |
| PAT-METRIC-LIMITATION-UX-001 | Evidence UX | Analytics explicitly states metric limitations | Alpha Progression 7.5 | HIGH | Strong fit TK forbidden interpretations | DESIGN_DIRECTION |
| PAT-WARMUP-CONTEXT-001 | Strength | Warmup uses work target + exercise type + experience + equipment context | Alpha Progression 7.5 | HIGH | Extend only after evidence review | CANDIDATE |
| PAT-WARMUP-FEASIBILITY-001 | Strength | Impossible warmup loads are omitted/explained | Alpha Progression 7.5 | HIGH | Candidate plate/warmup integration | CANDIDATE |
| PAT-GYM-LOAD-MODEL-001 | Equipment | Available weight increments belong to gym/equipment context | Alpha Progression 7.5 | HIGH | Candidate richer gym context | CANDIDATE |
| PAT-DROPSET-PRESCRIPTION-001 | Strength | Dropset is typed prescription with configurable reduction | Alpha Progression 7.5 | HIGH | Candidate typed set mode | CANDIDATE |
| PAT-TIMER-DEGRADED-001 | Execution | Timer handles OS-delayed alarm/background behavior explicitly | Alpha Progression 7.5 | MEDIUM | Android execution hardening candidate | CANDIDATE |
| PAT-EXERCISE-MODULE-001 | Exercise library | Large exercise library split into independently loadable metadata/content modules | Alpha Progression 7.5 | HIGH | Useful with MoveKit expansion | DESIGN_DIRECTION |
| PAT-EXERCISE-EVALUATION-001 | Exercise library | Exercise suitability/evaluation separated from identity | Alpha Progression 7.5 | MEDIUM | Only with transparent TK criteria/evidence | CANDIDATE |
| PAT-EXERCISE-METRIC-TYPE-001 | Exercise library | Exercise definition declares logging metric schema | Alpha Progression 7.5 | HIGH | Strong scalable library pattern | DESIGN_DIRECTION |
| PAT-BODYWEIGHT-LOAD-001 | Calculation | Body mass contribution treated separately in bodyweight performance estimate | Alpha Progression 7.5 | MEDIUM | Requires movement-specific evidence | CANDIDATE |
| PAT-STRENGTH-ANALYTICS-SCOPE-001 | Analytics | Exercise/muscle/training/measurement views share one analytics surface | Alpha Progression 7.5 | HIGH | TK Inzicht broadly aligned | ALREADY_PRESENT |
| PAT-TREND-PERIOD-UX-001 | Analytics | Trend window is visible/selectable | Alpha Progression 7.5 | HIGH | Candidate with sufficiency/confidence | CANDIDATE |
| PAT-MUSCLE-LOAD-VIEW-001 | Analytics | Muscle view combines reps/RIR/sets/volume | Alpha Progression 7.5 | HIGH | Evidence-governed candidate | CANDIDATE |
| PAT-POUCH-LOCAL-001 | Persistence | Hybrid app uses local document DB for durable workout state | Alpha Progression 7.5 | HIGH | TK equivalent goal already present | ALREADY_PRESENT |
| PAT-DOC-SYNC-001 | Persistence | Local document store replicates to per-user remote store | Alpha Progression 7.5 | HIGH | TK relational model remains preferred | REFERENCE_ONLY |
| PAT-LOCAL-DB-RECOVERY-001 | Resilience | Missing/corrupt local DB has explicit recovery/recreate paths | Alpha Progression 7.5 | HIGH | Candidate TK IndexedDB chaos test | CANDIDATE |
| PAT-DATA-EXPORT-SCHEMA-001 | Portability | Athlete export is explicit formatted product surface | Alpha Progression 7.5 | HIGH | TK export exists | ALREADY_PRESENT |
| PAT-PLAN-SHARE-PRIVACY-001 | Social | Prescription can be shared while past execution stays private | Alpha Progression 7.5 | HIGH | Strong My Training/social pattern | CANDIDATE |
| PAT-FEATURE-CONFIG-001 | Platform | Remote config may control non-truth UX/features | Alpha Progression 7.5 | HIGH | Never silently alter calc/rule semantics | DESIGN_DIRECTION |
| PAT-EXEC-KEEP-AWAKE-001 | Execution | Active workout may request screen-awake as presentation capability | Alpha Progression 7.5 | HIGH | Candidate live execution polish | CANDIDATE |

| PAT-COACH-RELATIONSHIP-001 | Coach | Coach linkage is durable relationship, not one-off share | TrainingPeaks 12.114.0 | HIGH | TK relationship core exists | ALREADY_PRESENT |
| PAT-COACH-WORKOUT-COMMENT-001 | Coach | Coach feedback attaches to executed workout | TrainingPeaks 12.114.0 | HIGH | TK coach notes/feedback incomplete | VERIFIED_GAP |
| PAT-PLAN-ACTUAL-PAIR-001 | Execution | Planned prescription and completed actual coexist | TrainingPeaks 12.114.0 | HIGH | TK snapshot architecture aligned | DESIGN_DIRECTION |
| PAT-COMPLIANCE-STATE-001 | Adherence | Planned/success/warning/caution/missed/unplanned are typed states | TrainingPeaks 12.114.0 | HIGH | TK adherence core exists; UX comparator | ALREADY_PRESENT |
| PAT-COMPLIANCE-HORIZON-001 | Adherence | Workout compliance aggregates to weekly horizon | TrainingPeaks 12.114.0 | HIGH | Candidate calendar/Inzicht UX | CANDIDATE |
| PAT-LOAD-LONGITUDINAL-VIEW-001 | Load | Long-horizon training state has dedicated analytical view | TrainingPeaks 12.114.0 | HIGH | Separate from daily readiness | CANDIDATE |
| PAT-LOAD-COMPONENTS-001 | Load | Long/short load constructs shown separately before form/status | TrainingPeaks 12.114.0 | MEDIUM | Evidence review required | CANDIDATE |
| PAT-LAST-PLANNED-REFERENCE-001 | Planning | Last planned workout is explicit reference object | TrainingPeaks 12.114.0 | HIGH | Useful explainability/comparison pattern | CANDIDATE |
| PAT-STRUCTURED-WORKOUT-ASSET-001 | Workout | Structured prescription is portable asset | TrainingPeaks 12.114.0 | HIGH | TK Builder architecture aligned | ALREADY_PRESENT |
| PAT-WORKOUT-FILE-001 | Portability | Structured/raw workout files are user-facing assets | TrainingPeaks 12.114.0 | HIGH | Future FIT/TCX/GPX/provider adapters | CANDIDATE |
| PAT-WORKOUT-DEEP-DIVE-001 | Analytics | Summary→graphs/maps→laps→peaks→zones hierarchy | TrainingPeaks 12.114.0 | HIGH | Endurance Inzicht benchmark | CANDIDATE |
| PAT-ZONE-DISTRIBUTION-001 | Endurance | Time-in-zone distribution is first-class analysis | TrainingPeaks 12.114.0 | HIGH | Canonical zone provenance required | CANDIDATE |
| PAT-ENDURANCE-METRIC-PARALLEL-001 | Endurance | HR/pace/power remain parallel typed domains | TrainingPeaks 12.114.0 | HIGH | TK sport-specific architecture aligned | DESIGN_DIRECTION |
| PAT-THRESHOLD-COACH-VISIBILITY-001 | Coach | Threshold changes can become coach-visible events | TrainingPeaks 12.114.0 | MEDIUM | Consent/provenance required | CANDIDATE |
| PAT-ZONE-CONFIG-001 | Endurance | Zones are configurable domain objects | TrainingPeaks 12.114.0 | HIGH | TK direction aligned | ALREADY_PRESENT |
| PAT-EVENT-GOAL-001 | Events | Race/event links date/type/goals/results | TrainingPeaks 12.114.0 | HIGH | TK race context aligned | ALREADY_PRESENT |
| PAT-EVENT-LEG-001 | Events | Multisport event consists of typed legs | TrainingPeaks 12.114.0 | HIGH | Triathlon/complex-race candidate | CANDIDATE |
| PAT-EVENT-GOAL-ACTUAL-001 | Events | Event goal and actual result remain separate | TrainingPeaks 12.114.0 | HIGH | TK provenance pattern | DESIGN_DIRECTION |
| PAT-CALENDAR-NOTE-001 | Planning | Calendar context note exists independently of workout | TrainingPeaks 12.114.0 | HIGH | Illness/travel/context candidate | CANDIDATE |
| PAT-CALENDAR-CONTEXT-ASSET-001 | Planning | Calendar notes may carry attachments | TrainingPeaks 12.114.0 | MEDIUM | Lower-priority context feature | CANDIDATE |
| PAT-COACH-NOTIFICATION-001 | Coach | Coach relationship has dedicated notification policy | TrainingPeaks 12.114.0 | HIGH | TK coach-event notification incomplete | VERIFIED_GAP |
| PAT-COACH-LIFECYCLE-001 | Coach | Connect/active/notify/disconnect lifecycle explicit | TrainingPeaks 12.114.0 | HIGH | Privacy/access boundary | DESIGN_DIRECTION |
| PAT-WORKOUT-LIBRARY-SEARCH-001 | Training library | Planned/reusable workouts searchable apart from history | TrainingPeaks 12.114.0 | HIGH | My Training scale candidate | CANDIDATE |
| PAT-ENDURANCE-STRENGTH-CONVERGENCE-001 | Multisport | Strength uses same calendar/coach/planned-completed framework | TrainingPeaks 12.114.0 | HIGH | TK already one canonical chain | ALREADY_PRESENT |
| PAT-NUTRITION-TRAINING-CONTEXT-001 | Nutrition | Nutrition lives adjacent to training/calendar | TrainingPeaks 12.114.0 | HIGH | TK nutrition timing context aligned | ALREADY_PRESENT |
| PAT-HEALTH-METRIC-SOURCE-001 | Health | Health metric UI exposes source rather than silent merge | TrainingPeaks 12.114.0 | HIGH | Core TK provenance requirement | DESIGN_DIRECTION |
| PAT-HRV-SOURCE-SELECT-001 | Recovery | Multiple HRV sources have explicit selected source | TrainingPeaks 12.114.0 | HIGH | Future Connected Athlete requirement | CANDIDATE |
| PAT-SLEEP-DIMENSIONS-001 | Recovery | Sleep includes duration/quality/stages | TrainingPeaks 12.114.0 | HIGH | TK external model supports stages | ALREADY_PRESENT |
| PAT-CONNECTION-HUB-001 | Providers | Apps/devices managed from one discoverable surface | TrainingPeaks 12.114.0 | HIGH | Candidate as provider count grows | CANDIDATE |
| PAT-TRAININGPEAKS-CONNECTOR-001 | Providers | TrainingPeaks connector maps plans/actuals/events through provider contract | TrainingPeaks 12.114.0 | HIGH | Provider currently not implemented | VERIFIED_GAP |
| PAT-NOTE-VISIBILITY-001 | Privacy | Workout notes carry explicit visibility scope | TrainingPeaks 12.114.0 | HIGH | Critical coach/social convergence rule | DESIGN_DIRECTION |
| PAT-FEEDBACK-SCOPE-001 | Social/Coach | Coach feedback and general comments are separate scopes | TrainingPeaks 12.114.0 | HIGH | Future social architecture | DESIGN_DIRECTION |
| PAT-ATHLETE-SPORT-PROFILE-001 | Context | Primary athlete sport does not restrict workout types | TrainingPeaks 12.114.0 | HIGH | TK Context Engine aligned | ALREADY_PRESENT |
| PAT-RECOVERY-LOAD-SEPARATION-001 | Recovery/Load | Health/recovery signals stay separate from training-load state | TrainingPeaks 12.114.0 | HIGH | TK architecture aligned | ALREADY_PRESENT |
| PAT-NATIVE-PERSISTENCE-001 | Persistence | Native client uses structured local DB/preferences | TrainingPeaks 12.114.0 | MEDIUM | Offline semantics not proven | REFERENCE_ONLY |

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