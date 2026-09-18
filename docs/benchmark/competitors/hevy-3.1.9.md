# Hevy 3.1.9 — External Benchmark Audit

Audit date: 2026-09-18  
Artefact supplied: `Hevy - Gym Log Workout Tracker 3.1.9 APKPure.xapk`  
Package observed: `com.hevy`  
Version code observed: `3237168`  
Minimum Android observed: API 24  
Target Android observed: API 36  
Artefact size observed: approximately 178 MB.

> Provenance note: this record captures observations made from the supplied audit artefact. The competitor binary itself is intentionally not committed.

## Architecture
**Observed:** the client contains a large JavaScript bundle and React Native/Expo indicators; configuration identifies package `com.hevy`.  
**Confidence:** HIGH for client technology indicators.  
**Do not infer:** this does not establish Hevy's backend architecture.

**Pattern:** cross-platform product layer combined with native Android capabilities.

**TK relevance:** useful comparator for TK's cross-platform/native boundary. Any TK implementation must reuse/fit current TK architecture rather than reproduce Hevy implementation details.

## Health Connect / health data
**Observed:** Android Health Connect indicators, onboarding/install flows and health-related permissions are present. Observed categories include body weight/body fat read/write and workout/calorie/heart-rate write capabilities, plus Activity Recognition indicators.  
**Confidence:** HIGH for presence in the client; runtime behaviour/consent timing requires dynamic verification.

**Pattern:** native health-data integration as a boundary service.

**TK opportunity candidate:** evaluate a provider-neutral Health Data Gateway:
provider/Health Connect → raw import → provenance + data-quality normalization → Calculation Engine → Context Engine → Decision Engine → AI Coach.

This is a design candidate only until current TK main is checked.

## Workout execution
**Observed:** client identifiers/components include `LiveWorkout`, `WorkoutDetail`, `WorkoutSummary`, calendar/program/exercise-change/plate-calculator and workout heart-rate-history concepts. Set-weight update, timers, routine notes and workout-statistics indicators were also observed.  
**Confidence:** HIGH for client presence.

**Pattern:** continuous workout lifecycle with small in-context utilities.

**TK relevance:** benchmark friction/taps against TK's canonical Training Preview → Execution → Logging chain; do not create a parallel execution path.

## Exercise library and media
**Observed:** exercise media references include remotely delivered exercise video assets across multiple exercises/equipment categories.  
**Confidence:** HIGH.

**Pattern:** separate scalable media delivery for a large exercise library.

**TK relevance:** evaluate MoveKit asset delivery, caching, taxonomy and search at scale using TK-owned/licensed content only.

## Coaching / AI
**Observed:** client identifiers include trainer/coaching/program-modification/injury-context concepts and HevyGPT-related strings/components.  
**Confidence:** HIGH for client indicators; LOW/UNKNOWN for server-side decision logic.

**Constraint:** no claim is made about how Hevy computes recommendations.

**TK relevance:** TK's Calculation → Context → Decision → AI separation remains authoritative. Competitor AI UX can inform presentation, never calculation truth or hidden rule copying.

## Observability
**Observed:** client artefact contains indicators for Sentry, Amplitude, Firebase and Branch; Sentry-related mobile/replay components are present.  
**Confidence:** HIGH for embedded client instrumentation.

**Pattern:** production mobile apps instrument crash/error/analytics and attribution flows.

**TK relevance:** compare against TK's existing observability and privacy controls; do not add SDKs merely to match a competitor.

## Social and sharing
**Observed:** client indicators for feed, comments/replies, suggested users, connection/friend concepts, workout sharing, shareable workout media and comparison concepts.  
**Confidence:** HIGH for presence.

**Pattern:** canonical workout data can feed both history and shareable/social representations.

**TK relevance:** input for the planned TK Social work; default to privacy-aware sharing and reuse canonical workout identity/logging.

## Native mobile capabilities
**Observed:** indicators for Strava integration, push notifications, Google Play Billing, biometrics, camera, contacts, background/foreground services and deep-link/social capabilities.  
**Confidence:** HIGH for presence; runtime necessity and permission timing are not established by static analysis.

**TK relevance:** use as a checklist for lifecycle, permissions and integration audits. Principle of least privilege remains mandatory.

## Open follow-up
Before any Hevy-derived candidate becomes a TK build item:
1. verify current TK main;
2. search canonical roadmap/gap/capability registries;
3. identify existing implementation/reuse;
4. specify original TK architecture;
5. assess privacy/security and Calculation/Context/Decision/AI boundaries;
6. define tests and quality gates;
7. only then promote to roadmap.

## Current audit status
STATIC v1. Dynamic behaviour, offline semantics, actual permission prompts, runtime network flows, accessibility behaviour and server-side logic are not established by this record.
