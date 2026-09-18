# External Solution Patterns

Living catalogue. A pattern is not a recommendation until checked against current TK main and promoted through the canonical roadmap/change process.

| ID | Domain | Pattern | Evidence | Confidence | TK design direction | Status |
|---|---|---|---|---|---|---|
| PAT-HC-001 | Health data | Native Health Connect boundary around cross-platform product logic | Hevy 3.1.9 client artefact exposes Health Connect onboarding/install flows and health permissions | HIGH | Evaluate a TK Health Data Gateway: provider adapter → raw data/provenance/quality → Calculation → Context/Decision | CANDIDATE |
| PAT-WO-001 | Workout execution | One continuous start → live execution → completion → summary chain | Hevy 3.1.9 exposes LiveWorkout, WorkoutDetail and WorkoutSummary client components | HIGH | Preserve/optimise TK central Preview → Execution → Logging chain; measure taps/friction against competitors | CANDIDATE |
| PAT-MEDIA-001 | Exercise library | Exercise media delivered separately from core app data via remote asset delivery | Hevy 3.1.9 contains remote exercise-media references | HIGH | Evaluate scalable MoveKit media delivery/caching without embedding competitor assets | CANDIDATE |
| PAT-OBS-001 | Observability | Dedicated crash/analytics instrumentation in mobile client | Hevy 3.1.9 contains Sentry/Amplitude/Firebase/Branch indicators | HIGH | Compare against existing TK observability; only close verified gaps | CANDIDATE |
| PAT-SOC-001 | Social | Workout objects double as shareable/social objects | Hevy 3.1.9 exposes feed/comments/sharing-related client components | HIGH | Feed planned TK Social sprint; privacy-first sharing and canonical workout identity | CANDIDATE |
| PAT-BG-001 | Mobile lifecycle | Native background/notification capabilities support a cross-platform app | Hevy 3.1.9 manifest/client contains push/background/foreground-service indicators | HIGH | Audit TK lifecycle needs: timers, sync, device sessions, reminders; minimise permissions | CANDIDATE |

## Pattern maturity
CANDIDATE = observed externally, not yet verified as a TK gap.
VERIFIED_GAP = current TK main proves missing/insufficient capability.
DESIGN_READY = original TK solution and tests defined.
ROADMAP = accepted into canonical roadmap.
IMPLEMENTED = landed and verified in TK.
REJECTED = not appropriate for TK.
