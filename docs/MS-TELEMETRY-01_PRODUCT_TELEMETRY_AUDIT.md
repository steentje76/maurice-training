# MS-TELEMETRY-01 — Product Telemetry & Observability Architecture Audit

**Status:** AUDITED / IMPLEMENTATION PLAN — no new tracking activated  
**Baseline:** `2c1a01fec2b021c141b65846f32e29d2ec9123bf`  
**Roadmap source:** `PRODUCT_TELEMETRY_FEEDBACK_ROADMAP_2_0.md`

## Executive finding

MS-TELEMETRY-01 is not greenfield observability. Trainingskompas already has a reusable operational observability foundation and a persistent crash/error sink. What is missing is the governed **product telemetry** layer: a canonical event registry, explicit privacy classification per event, product/athlete-data separation, retention/consent boundaries, and minimal instrumentation of key product flows.

The existing crash/error sink must **not** silently be widened into behavior analytics. `netlify/functions/telemetry.js` explicitly states that it is not an analytics warehouse or user-behavior tracker and that user feedback remains separate.

## Proven existing foundation

| Capability | Current evidence | Reuse decision |
|---|---|---|
| Event contract | `core/observability.js` — `observability_event.v1` | REUSE |
| Naming | `domain.component.action` | REUSE |
| Correlation IDs | per-operation, no user identity embedded | REUSE |
| Error normalization | provider/network/timeout/generic safe errors | REUSE |
| Redaction | recursive key-based redaction + caller DO-NOT-LOG contract | REUSE, but not sufficient by itself for analytics |
| AI Coach observability | request lifecycle covered | REUSE |
| Wearable sync observability | sync lifecycle covered | REUSE |
| Platform crashes | error/unhandledrejection covered | REUSE |
| Persistent client crash sink | `client_telemetry_events` + `netlify/functions/telemetry.js` | KEEP SEPARATE |
| Crash sink security | server whitelist/redaction, payload cap, rate limit, fail-safe | REUSE PATTERN, not table/endpoint semantics |

## Confirmed gaps

1. No canonical product-event registry exists.
2. Roadmap events such as `training_opened`, `workout_completed`, `feedback_opened` and `feedback_submitted` are examples only; repository search finds no production instrumentation.
3. Existing `client_telemetry_events` is crash/error diagnostics, not product analytics.
4. Auth and training execution are still explicitly NOT YET COVERED in the observability contract.
5. Concept2/device observability is not covered by the generic observability contract, although device-specific diagnostics exist elsewhere.
6. Formal analytics retention, consent classification and environment-separation policy are not yet defined per event.
7. User feedback requires a separate data stream and belongs to MS-BETA-01, not this sprint.

## Hard architecture boundary

Three streams remain distinct:

- **A Athlete/Training Data** — canonical athlete data used to serve the athlete.
- **B Product Telemetry** — low-cardinality product-flow/reliability signals.
- **C User Feedback** — explicit human feedback with its own lifecycle.

Stream B MUST NOT contain raw HRV, sleep details, bodyweight/body composition, cycle symptoms, medical context, exercise loads/reps, free-text coach notes, full prompts/responses, arbitrary URLs/query strings, email/name, tokens or database-row dumps.

Product telemetry may use pseudonymous/authenticated ownership only when a registered event has a documented purpose that requires it. The event registry is authoritative for allowed properties; unknown properties fail closed at ingestion.

## Proposed product-event contract

A future product event extends, but does not replace, the observability conventions:

`product_event.v1`

Required envelope:
- `timestamp`
- `event` — stable language-neutral ID
- `event_version`
- `app_version`
- `environment`
- `platform`

Optional only when registered:
- `correlation_id`
- `route_id` — canonical internal screen ID, never raw URL
- whitelisted event-specific properties

No arbitrary `metadata` bag is allowed at the product-analytics ingestion boundary.

## Registry schema

Every product event must register:
- event ID;
- version;
- purpose;
- exact trigger;
- owner/domain;
- allowed properties and type;
- forbidden properties;
- privacy classification;
- consent requirement;
- retention class;
- identity requirement (anonymous/pseudonymous/authenticated);
- environments;
- expected cardinality;
- deprecation/replacement rule.

## Minimal first funnel — candidate, not yet instrumented

For the first implementation slice, keep the event set deliberately small:

`training.opened → training.previewed → training.workout.started → training.workout.completed → training.history.viewed`

Reliability complements may include `training.workout.persistence_failed` through operational observability rather than duplicating sensitive error detail into analytics.

Do **not** instrument set weights/reps, exercise-level behavior, HRV/recovery values, GPS streams, nutrition details or AI prompt content in this foundation slice.

## Storage/provider decision

No external vendor is selected by this audit. The roadmap explicitly leaves Sentry/PostHog/Firebase/Mixpanel/Amplitude/Datadog undecided. Provider selection is not required to define the contract.

A production implementation must keep the emitter/provider boundary replaceable and must not make canonical event IDs vendor-specific.

## Maturity conclusion

- MS-F1-02 Observability Foundation: remains CLOSED.
- F13 crash/error persistence: remains implemented.
- MS-TELEMETRY-01: **AUDITED, not IMPLEMENTED/CLOSED**.
- MS-BETA-01: remains NOT STARTED.
- MS-BETA-02: remains NOT STARTED.

## Implementation slices

### Slice A — deterministic contract
Create a pure `core/productTelemetry.js` containing registry validation, envelope construction, property allowlisting and fail-closed rejection. No network and no tracking side effects. Add sabotage/security tests.

### Slice B — provider-neutral ingestion
Only after Slice A is green: add a dedicated product-telemetry sink/store or provider adapter. Do not reuse `client_telemetry_events` in a way that changes its crash-only semantics. Establish RLS/service boundary, retention and environment separation before production writes.

### Slice C — minimal funnel instrumentation
Instrument only registered first-funnel events at canonical lifecycle boundaries. Telemetry remains non-blocking and may never determine product behavior.

### Slice D — beta handoff
MS-BETA-01 can then build feedback submission separately and link consented technical context through version/build/correlation IDs.

## Gate to IMPLEMENTED

MS-TELEMETRY-01 may move beyond AUDITED only when:
1. canonical event registry exists in code/docs;
2. contract tests prove allowlist + forbidden-data behavior;
3. product analytics and athlete data remain separate;
4. ingestion is fail-closed for unknown properties and fail-open/non-blocking for the product flow;
5. retention/environment/consent semantics are explicit;
6. minimal registered funnel is instrumented;
7. no external tracking/provider is activated without an explicit, reviewed implementation decision.

## Implementation status (29 september 2026, v4.70.5)

| Gate-punt | Status | Bewijs |
|---|---|---|
| 1 registry | DONE | `core/productTelemetry.js` (#477) |
| 2 allowlist/forbidden-tests | DONE | `core/productTelemetry.test.js` |
| 3 scheiding van athlete data | DONE | aparte tabel `product_telemetry_events` (live: RLS aan, geen anon/authenticated-grants); call-site-test S4–S6 |
| 4 fail-closed/fail-open | DONE | ingestion-test + `core/productTelemetryLifecycle.test.js` (E, F8) |
| 5 retention/environment/consent | DONE (v4.70.6) | opt-in-UI in Privacy (standaard uit, intrekken stopt direct, per gebruiker); 90 dagen retentie via `cleanup-product-telemetry` (@daily); environment expliciet. Grondslag = voorlopig productbeleid, geen vastgestelde AVG-rechtsgrond |
| 6 minimale funnel | DONE | 8 instrumentatiepunten op bewezen boundaries; verstuurt na opt-in in Privacy |
| 7 geen externe provider | DONE | geen provider geladen (test S15) |

Alle zeven gate-punten zijn per v4.70.6 in code en tests aangetoond: MS-TELEMETRY-01 = **IMPLEMENTED**. Nog niet aangetoond (volgende maturity): productieverificatie van een echte opt-in-event-keten en van een uitgevoerde cleanup-run; AVG-rechtsgrond formeel vastgesteld.

