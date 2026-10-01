# Trainingskompas APK Masterbenchmark — current-main reconciliation

**Date:** 2026-10-01  
**Canonical TK baseline:** `22b80fe6e395c769008204c53aa0c4621eef9001`  
**Purpose:** reconcile the external APK benchmark with the current Trainingskompas codebase before any new implementation work.

## 1. Evidence used

External benchmark evidence:
- existing external benchmark PR #383 / head `00f56f0e4e9437c864c6c12b082b21257dd41ae5`;
- supplied APK/XAPK/APKM packages: Strong 6.3-beta.19, Hevy 3.1.9, Fitbod 8.31.0-4, Boostcamp 264, TrainHeroic 8.36.0, Concept2 ErgData 2.2.29, Garmin Connect 5.28 and Clue 267.0;
- supplied MoveKit metadata package with 412 exercises.

Current-TK evidence:
- current main and canonical registries/reports;
- `docs/AUDIT_GAP_REGISTER.json`;
- `docs/CAPABILITY_REGISTRY.md`;
- `docs/ROADMAP_COVERAGE_AUDIT.md`;
- current implementation reports and recent merges through PR #502.

Static APK analysis can establish packaged capabilities, domain models, strings, routes, native integrations and architectural patterns. It cannot prove server-side algorithms, real-world usability, exact tap counts or runtime reliability. Those remain dynamic/device validation work.

## 2. Important corrections to the old benchmark

### 2.1 AI auto-programming is no longer a gap
The old `BENCHMARK_REGISTRY.md` still describes TK as lacking a fully automatic adaptive program flow. Current main contradicts that historical statement: `AI-PROGRAM-AUTOGEN-001` is CLOSED through F4/MS-F4-04.

**Reclassification:** competitor auto-programming is now primarily a UX/resilience comparator, not a missing core capability.

### 2.2 Concept2 is materially further than the old benchmark states
The old benchmark described Concept2 mainly as architectural parity with device validation open. Current main has since closed the measured-vs-derived watt provenance gap (GAP-P2-013) and persists `watt_source` on canonical sessions.

**Remaining gap:** real-device validation and richer PM5-specific detail such as force/drive metrics, not basic Concept2 architecture.

### 2.3 Context Engine dead-code gap is technically fixed
PR #502 wired `ContextEngineCore` into `buildCtx()` on current main.

**Remaining action:** formal governance closure/evidence reconciliation for GAP-P2-014, not another implementation.

### 2.4 Exercise-library scale is now precisely known
Current canonical catalogue contains **226** MoveKit exercises. The purchased metadata package contains **412**.

Comparison by MoveKit provider slug proves:
- existing TK exercises matching supplied library: **226/226 exact**;
- unmatched existing TK MoveKit exercises: **0**;
- additional supplied MoveKit exercises not yet in TK: **186**.

The 186 additions include:
- 51 Isolation, 32 Cardio, 30 Hinge, 30 Pull, 27 Push, 21 Squat patterns;
- substantial machine coverage (44), bodyweight (43), barbell (33), dumbbell (29), cable (19);
- new running, swimming, cycling, rowing/cardio and gym-specific movements.

**Conclusion:** the 226 → 412 migration can be executed as an additive, stable-ID-preserving expansion. No destructive catalogue replacement is justified.

## 3. Competitor findings that remain strategically useful

### Strong 6.3-beta.19
Static evidence confirms rest timers, warm-up-set tooling, advanced plate calculator, supersets, workout/exercise notes, Personal Records and Health Connect sync.

**TK lesson:** use Strong as the low-friction execution benchmark. Do not copy its architecture; benchmark the number of interactions needed to log sets, add warm-ups, edit load and recover from interrupted sessions.

### Hevy 3.1.9
Static evidence confirms routines, rest timers, statistics, social/workout sharing and wearable-oriented execution infrastructure.

**TK lesson:** Hevy remains the strongest benchmark for fast logging + social projection. TK should keep canonical workout truth separate from social presentation.

### Fitbod 8.31.0-4
Static evidence confirms muscle-recovery state, available-equipment context, fitness-goal context, training splits, workout recommendations and AI-assisted sensitivity/injury-context suggestions.

**TK lesson:** the reusable pattern is explicit athlete/equipment context feeding recommendation logic. TK must keep this inside Context → Decision boundaries and must not infer medical diagnoses.

### Boostcamp 264
Static evidence confirms RPE/RIR-driven progression, multiple progression models, rich program metadata, coach/program catalogue structures, Health Connect integration and structured athlete program instances.

**TK lesson:** Boostcamp strongly corroborates TK's definition → program instance → execution separation. Its program-discovery metadata is a useful benchmark for future TK program library UX.

### TrainHeroic 8.36.0
Static evidence confirms coach/team routes, program-to-calendar workflows, working maxes, readiness surfaces, leaderboards and coach-context functionality.

**TK lesson:** the biggest remaining value is the operational bridge from coach programming to athlete calendar/execution/feedback. TK already has much of the F10/F11 backend/core, so the remaining work is predominantly runtime/UI integration.

### Concept2 ErgData 2.2.29
Static evidence confirms PM5, RowErg/BikeErg/SkiErg, drag factor, interval workouts, Logbook, stroke rate, pace and heart-rate-zone surfaces.

**TK lesson:** retain machine-specific provenance and capability gating instead of flattening every erg into generic cardio.

### Garmin Connect 5.28
Static evidence confirms Training Readiness, Body Battery, Training Status, Acute Load, HRV Status, Sleep Score, Training Effect, Health Connect and the wider Garmin device ecosystem.

**TK lesson:** do not imitate opaque Garmin composite scores. Reuse the product pattern of multiple time horizons and clearly separated domains while retaining TK's evidence/confidence architecture.

### Clue 267.0
Static evidence confirms explicit cycle, ovulation, symptom prediction, perimenopause, pregnancy, contraception, temperature and Health Connect domains.

**TK lesson:** the transferable pattern is separation of observation, prediction, life-stage context, consent and sensitive-data UX. Nothing in this APK justifies universal cycle-phase training rules.

## 4. Verified gaps that still matter after reconciliation

The old #383 knowledge base contained 12 VERIFIED_GAP patterns. Current-main reconciliation produces the following practical status:

1. **Native Android Health Connect boundary — still open.** Current TK explicitly uses Google Health API/cloud rather than the native Health Connect SDK. This is the clearest wearable-platform gap.
2. **Endurance provider hub/connectors — still open or access-dependent.** Garmin/COROS/Strava/TrainingPeaks style provider UX remains incomplete.
3. **Coach programming → athlete UI bridge — still open.** Backend/core maturity is much higher than the visible product workflow.
4. **Coach notes/feedback — still a real gap.** Existing TK benchmark documents explicitly identify this as missing.
5. **Coach event notifications — still incomplete.**
6. **Explicit contraception/non-bleeding context — still a Women's Performance UI/storage gap.**
7. **Generic account data export/import portability — incomplete.**
8. **Workout-history CSV import — no equivalent athlete workflow established.**
9. **Advanced Concept2 force/drive metrics — still beyond the current canonical contract.**
10. **TrainingPeaks connector — not implemented.**

The previous “AI auto-programming missing” conclusion is removed from the gap list because the capability is now closed.

## 5. Internal V1 maturity must take precedence over adding benchmark features

The current audit register still contains V1 modules/capabilities with missing production callers, including longitudinal trend, nutrition intelligence, coach intelligence/programming layers, team analytics, equipment and organization runtime integration.

This matters more than adding decorative competitor features. Before adding widgets, watch experiences, deep links or new composite scores, TK should close or explicitly de-scope the V1 dormant-runtime findings.

The correct order remains:

RAW DATA → Calculation Engine → Context Engine → Decision/Rules Engine → AI Coach → athlete.

Competitor behavior can inspire UX, but cannot become a calculation or decision source of truth.

## 6. Recommended next build sequence

### Wave A — close current V1 wiring/governance gaps
- finish formal closure for GAP-P2-014 after the current-main Context Engine merge;
- wire or explicitly de-scope dormant V1 intelligence/runtime modules;
- close the remaining READY_FOR_ACCEPTANCE device/practice validations where evidence can be obtained.

### Wave B — MoveKit 226 → 412
- import the 186 proven-new exercises additively;
- preserve all existing `TK-000001..TK-000226` IDs;
- assign new stable IDs only to the 186 additions;
- run duplicate/semantic checks, category/equipment normalization and asset validation;
- keep exercise goals disposable as previously decided;
- re-run Workout Builder, substitution, AthleteConstraints and execution regressions.

### Wave C — connected-athlete platform
- native Health Connect adapter/gateway;
- common provider status/permissions/resync surface;
- preserve source provenance and minimum-permission access;
- real-device Concept2 validation and capability-specific PM5 enrichment.

### Wave D — coach product completion
- coach assignment/calendar UI using the existing training/execution chain;
- session-attached coach notes/feedback;
- coach notifications;
- expose existing coach intelligence only after canonical production wiring is proven.

### Wave E — UX benchmark polish
- instrument and test logging friction against Strong/Hevy;
- warm-up templates, rest-target/timer behavior and plate feasibility only where not already covered;
- richer longitudinal analytics and minimum-data messaging;
- program discovery metadata inspired by Boostcamp;
- Women's Performance context UX inspired by Clue without importing medical rules.

## 7. What not to build yet

Do not prioritize:
- opaque Garmin/WHOOP-style universal readiness scores;
- a second workout/execution engine;
- competitor-specific proprietary algorithms;
- global public social ranking as a core product;
- widgets/watch/deep-link polish while V1 canonical modules remain dormant;
- medical or cycle-phase prescriptions derived from competitor behavior.

## 8. Immediate next task

The highest-confidence, low-ambiguity implementation task is **MoveKit Batch Expansion 002+**: migrate the 186 exact-new MoveKit exercises in controlled batches while preserving the 226 existing canonical IDs.

In parallel, the highest-impact platform task is the **native Health Connect boundary**, but that should follow the current V1 wiring/governance cleanup so the health data enters an already-proven canonical runtime.

This document supersedes stale benchmark conclusions only where current-main evidence explicitly contradicts them. The raw competitor audits in PR #383 remain external evidence and should not be treated as implementation authority.
