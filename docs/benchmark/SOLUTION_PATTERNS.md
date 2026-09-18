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