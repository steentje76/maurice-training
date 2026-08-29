# PRODUCT_TELEMETRY_FEEDBACK_ROADMAP_2_0.md — canonical extension to Roadmap 2.0

**Status:** PLANNED / PRODUCT DIRECTION — no implementation claim. No telemetry vendor selected. No new tracking activated. No new privacy-sensitive logging introduced by this document.
**Parent roadmap:** `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` (Roadmap 2.0 v1.1 canonical).
**Existing foundation (do not duplicate):** `docs/OBSERVABILITY_CONTRACT.md` (`MS-F1-02 — Observability Foundation`, capability `PLAT-OBSERVABILITY-001`, **CLOSED/IMPLEMENTED**, CODE VERIFIED against `core/observability.js`, 52/52 tests green). This document extends that foundation toward product analytics, beta feedback and release intelligence — it does not replace or re-specify it.

## 1. Relationship to the existing Observability Foundation
`MS-F1-02` already delivers: a structured event model (`observability_event.v1`), log levels, `domain.component.action` event naming, correlation IDs, error normalization, and a redaction layer (`ObservabilityCore.redact()`) that strips tokens/passwords/secrets/etc. by key name. It explicitly covers AI Coach, wearable sync and platform (`window.onerror`/`unhandledrejection`) flows, and explicitly does **not yet** cover Auth, training execution lifecycle, most Netlify Functions, or device (Concept2) events (see `docs/OBSERVABILITY_CONTRACT.md` "Gedekte flows" / "Open gaps").

**What is reused, not duplicated:** the event model, redaction layer, error normalization and correlation-ID strategy are the single technical foundation for everything below. This roadmap update does not propose a second observability system.

**What is genuinely missing for an end-to-end product feedback loop**, and is therefore in scope here: product analytics (feature usage, funnels, behavior signals) as a data stream distinct from technical error events; a canonical, governed event registry; in-app beta feedback capture; a feedback triage lifecycle; and release-level go/no-go intelligence that combines error trends, funnel completion and feedback signals.

## 2. Canonical product-improvement cycle
`ATHLETE USE → PRODUCT TELEMETRY → ERROR/PERFORMANCE/BEHAVIOR/FEEDBACK SIGNALS → TRIAGE → PRIORITIZATION → FIX/IMPROVEMENT → QUALITY GATE → RELEASE → POST-RELEASE MEASUREMENT → LEARN → NEXT ITERATION`

This is adopted as an explicit product/platform principle: a release is not "done" the moment code merges. Closure requires post-release measurement.

## 3. Hard architectural separation — three distinct data streams
| Stream | Purpose | Examples | Store |
|---|---|---|---|
| **A. Athlete/Training Data** | Serving the athlete | workouts, sets, reps, load, HRV, recovery, wearable data, performance history | Athlete Data Store (existing Supabase schema) |
| **B. Product Telemetry** | Understanding whether the *product* works | flow completion, feature usage, errors, crashes, latency, sync failures | Product telemetry stream (this roadmap; provider not yet selected) |
| **C. User Feedback** | Explicit human input | probleem / idee / onduidelijk / werkt goed, optional free text/screenshot | Feedback store, linked to telemetry via correlation/event ID, not merged into it |

**Hard rule:** Product Analytics is not the same system as the Athlete Data Store. Health/training data must never be silently forwarded as an analytics payload. Any future implementation sprint must show, per event, that no Stream-A field (HRV raw values, sleep detail, bodyweight/body composition, cycle symptoms, medical context) is present.

## 4. Stream 1 — Crash & error reporting (extends MS-F1-02)
Structured failure capture, at minimum, for: JS/runtime errors, API errors, Supabase errors, auth failures, sync failures, wearable connector failures, BLE/device failures, Concept2/ERG failures, Calculation Engine failures, Decision Engine failures, detectable AI-boundary/output failures, unexpected app states.

Allowed context (already defined by `docs/OBSERVABILITY_CONTRACT.md`): app version, build, screen, flow, operation, provider, anonymized/pseudonymous technical context, correlation/event ID, timestamp.

Never logged by default: secrets, tokens, passwords, full prompts with sensitive data, full health payloads, unnecessary personal data. Redaction remains mandatory and reuses `ObservabilityCore.redact()`.

## 5. Stream 2 — Product analytics (new)
Privacy-aware analytics around key product flows. Illustrative funnel (roadmap example, not a commitment to implement every event immediately):

`onboarding_started → onboarding_completed → program_chosen → training_opened → training_previewed → workout_started → workout_completed → history_viewed`

Other illustrative canonical events: `workout_abandoned`, `set_logged`, `exercise_added`, `exercise_replaced`, `program_created`, `wearable_connected`, `wearable_disconnected`, `sync_started`, `sync_completed`, `sync_failed`, `coach_advice_viewed`, `coach_advice_accepted`, `coach_advice_dismissed`, `feature_used`, `feedback_opened`, `feedback_submitted`.

These are roadmap examples only. No event has been technically instrumented by this document.

### Event governance (mandatory for any future implementation)
Every analytics event must be registered with, at minimum: event ID/name (language-neutral, see `docs/I18N_ROADMAP_2_0.md` §3), purpose, trigger, allowed properties, forbidden properties, privacy classification, retention, version, owner, and consent requirement where applicable. This prevents ad-hoc event names scattered through the codebase. A canonical event registry document/table is the deliverable of `MS-TELEMETRY-01` (§9) — not created by this roadmap update itself.

## 6. Stream 3 — Performance & reliability
Roadmap scope for future measurement: app startup, key screen load times, API latency, sync latency, workout-persistence reliability, error rate, crash-free sessions where technically feasible, wearable sync reliability, device connection reliability, Calculation/Decision execution failures, release regression indicators. Goal: not just knowing *that* something broke, but being able to reconstruct technically *where* it broke.

## 7. Stream 4 — In-app beta feedback
For closed beta, the athlete must be able to submit feedback from inside the app. Minimum categories: **Probleem, Idee, Onduidelijk, Werkt goed.** Optional: free text, screenshot, reproduction steps. With explicit consent, technical context may be attached: app version, build, device/browser, current screen, timestamp, correlation/event ID. No sensitive context is attached silently.

### Feedback lifecycle (must be traceable)
`SUBMITTED → TRIAGED → ACCEPTED/REJECTED/DUPLICATE → PRIORITIZED → PLANNED → FIXED → RELEASED → VERIFIED`

Not every status needs a UI or full automation on day one, but the lifecycle itself is fixed as the target model so no implementation sprint invents a shorter, non-traceable path.

## 8. Stream 5 — Release feedback loop
`Issue/feedback → fix → tests → Quality Gate → merge → deploy → production telemetry → verification → closure.` For significant regressions, closure should be demonstrable via: error resolved, completion rate improved, latency improved, feedback signal decreased, no new regression introduced. This directly extends `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` §23 (Definition of Done) with an explicit post-release measurement expectation — a mastersprint is not closed purely because CI is green.

## 9. Stream 6 — Privacy, consent & data governance
Minimum principles: data minimization; purpose limitation; consent where required; pseudonymization where possible; retention policy; deletion strategy; export/account-deletion compatibility; access control; redaction; secrets filtering; health-data separation (§3); environment separation (test/dev/prod). Applicable GDPR/AVG implications must be reviewed as part of the later implementation sprint — this document makes no legal-compliance claim.

## 10. AI Coach feedback (without making AI a source of truth)
Future measurement candidates: advice viewed, advice accepted, advice dismissed, explanation opened, user asks "why", user gives feedback. **User acceptance of AI advice is not scientific evidence that a Decision Rule is correct** — product feedback and scientific evidence remain separate concepts, consistent with `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` §3/§16 (AI is never the source of numerical truth).

## 11. Feedback on AI-generated programs
Future feedback candidates on AI-generated programs: programma bruikbaar; oefening ongeschikt; oefening niet beschikbaar; te zwaar; te licht; planning onpraktisch; vervanging gewenst; programma afgerond/afgebroken. This feedback may inform future product/coach improvement, but the AI may not learn and deploy new Decision Rules directly from it — every new rule stays versioned → tested → evidence/governance reviewed → released (unchanged from `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` §15).

## 12. No vendor lock-in decision in this update
This roadmap update deliberately does **not** select Sentry, PostHog, Firebase, Mixpanel, Amplitude, Datadog or any other external service. The roadmap is kept capability-based; a later implementation sprint may compare providers on privacy, GDPR/EU hosting, cost, SDK footprint, PWA/browser support, mobile support, self-hosting, redaction, retention, dashboards, export and lock-in risk.

## 13. Closed Beta gate
Serious external Closed Beta requires, at minimum: core workout flow stable; error/crash observability operational (already true via `MS-F1-02`); privacy/redaction operational; minimal product analytics operational; feedback submission operational; version/build traceable; triage process defined; release Quality Gate operational; rollback/recovery process sufficiently clear. Not every future analytics event needs to exist for this gate to open.

## 14. V1 release gate (extends existing DoD)
V1 must not be judged on "all tests green" alone. It must also weigh: real-device validation, closed-beta feedback, crash/error trends, workout completion reliability, sync reliability, unresolved P0/P1 issues, privacy/security, performance, and known limitations. This does not replace `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` §23 Definition of Done; it adds a release-level (not mastersprint-level) evaluation layer on top of it.

## 15. Roadmap positioning
Preferred sequencing (may be adjusted if actual roadmap dependencies show a better order):

`F2 Athlete Core → Product Telemetry Foundation → F3/F4 Intelligence (where relevant) → Connected Athlete/Endurance essentials → Internal Alpha → Telemetry operational → Closed Beta → Feedback/measurement → fixes/UX improvements → larger beta → Production hardening → V1`

**Explicit rule:** Telemetry/Feedback must not be deferred until after the beta — doing so would forfeit exactly the data the beta exists to collect.

## 16. Proposed mastersprints
These are new, PLANNED product-plan IDs, deliberately **not yet added to the machine-readable `docs/ROADMAP_INDEX.json`** — same precedent as the Teamsport supplemental mastersprints (`docs/TEAMSPORT_ROADMAP_2_0.md` §7) and the i18n mastersprints (`docs/I18N_ROADMAP_2_0.md` §7). They must not be reported as implemented until repository/DB/test evidence supports a maturity change; index-integration is deferred to the next formal roadmap-index canonicalization sprint.

### MS-TELEMETRY-01 — Product Telemetry & Observability Architecture
**Priority:** P1. **Phase:** F13 (Production & Scale), positioned to start once F2 Athlete Core is stable and before Closed Beta opens (see §15). **Dependencies:** `MS-F1-02` (Observability Foundation, CLOSED — reused, not duplicated).

Scope: telemetry architecture; canonical event model; error model; correlation IDs; redaction; privacy classification; product/athlete-data separation (§3); performance signals; release/version context; retention concept; environment separation; consent boundaries; event registry (§5); test strategy.

Status: **PLANNED**, unless a future audit finds existing implementation work already at a higher maturity level — in which case that evidence supersedes this PLANNED status, not the reverse.

### MS-BETA-01 — In-App Beta Feedback & Triage Loop
**Priority:** P1. **Phase:** F13, after `MS-TELEMETRY-01`. **Dependencies:** `MS-TELEMETRY-01`.

Scope: feedback entry point; categories (§7); optional screenshot; user description; consented technical context; feedback ID; triage lifecycle (§7); link to version/build; link to release; privacy/redaction; feedback dashboard/triage concept; post-release verification.

Status: **PLANNED**

### MS-BETA-02 — Release Intelligence & Closed-Beta Readiness
**Priority:** P1. **Phase:** F13, after `MS-BETA-01`. **Dependencies:** `MS-TELEMETRY-01`, `MS-BETA-01`.

Scope: crash/error trend; core funnel completion; sync reliability; workout persistence reliability; device reliability where relevant; performance thresholds; regression signals; beta issue trends; release comparison; go/no-go criteria (§14).

**Combination note:** this may logically be combined with existing F13 Production & Scale work rather than staying a fully separate mastersprint — that determination is deferred to the roadmap-index canonicalization sprint that formally schedules F13, to avoid duplicating F13 scope here.

Status: **PLANNED**

## 17. Dependency rules
- `MS-TELEMETRY-01` reuses `PLAT-OBSERVABILITY-001` (`MS-F1-02`) — it does not re-implement redaction, correlation IDs or error normalization.
- `MS-BETA-01` depends on `MS-TELEMETRY-01` (feedback needs a version/build/correlation context to link to).
- `MS-BETA-02` depends on both `MS-TELEMETRY-01` and `MS-BETA-01` (release intelligence needs both telemetry signals and feedback signals).
- None of these three sprints may be scheduled after Closed Beta opens (§15, §13) — they are a precondition, not a parallel track.
- Product Telemetry event IDs are canonical/language-neutral (`docs/I18N_ROADMAP_2_0.md` §8).

## 18. Explicit out of scope for this roadmap update
This document adds product direction only. It does not install a telemetry SDK, does not activate tracking to any external party, does not add a new database table, does not add new privacy-sensitive logging, and does not select a vendor (§12).

**PRODUCT TELEMETRY & BETA FEEDBACK ROADMAP DECISION: INTEGRATED AS PLANNED PRODUCT DIRECTION**
