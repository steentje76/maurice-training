# MS-BETA-01 — In-App Beta Feedback: audit + deterministic contract (Slice A)

**Status:** Slice A (audit + contract) — no UI, no storage, no DDL, no provider, nothing collected.
**Baseline:** `8f412ed982bd0ee390e48cdd0feb71272728d31b`
**Roadmap source:** `PRODUCT_TELEMETRY_FEEDBACK_ROADMAP_2_0.md` §3, §7, §9, §13
**Contract:** `core/betaFeedback.js` (`user_feedback.v1`) · **Tests:** `core/betaFeedback.test.js`

## Audit findings (repository, 29-09-2026)

| Area | Finding | Consequence |
|---|---|---|
| Product feedback | No implementation exists (no module, table, function or UI). | Greenfield; contract first. |
| Coach feedback (`coach_workout_feedback`, `fCoachFeedbackMessaging`) | Coach↔athlete messaging domain. | Different stream; must not be reused as beta-feedback sink. |
| Product telemetry | `core/productTelemetry.js` + `product_telemetry_events` (MS-TELEMETRY-01). | Separate stream; feedback may *reference* a telemetry event/correlation ID only. |
| Crash diagnostics | `core/observability.js` + `netlify/functions/telemetry.js` (`client_telemetry_events`); the function states user feedback stays separate. | Separate stream; not a feedback sink. |
| Redaction | `ObservabilityCore` redacts sensitive **keys**, not free-text **values**. | Feedback needs its own free-text sanitization boundary. |

## Contract decisions

1. **Categories** (language-neutral IDs, NL labels): `problem` Probleem · `idea` Idee · `unclear` Onduidelijk · `works_well` Werkt goed.
2. **Lifecycle** exactly as roadmap §7: `SUBMITTED → TRIAGED → ACCEPTED | REJECTED | DUPLICATE`, `ACCEPTED → PRIORITIZED → PLANNED → FIXED → RELEASED → VERIFIED`. Terminal: `REJECTED`, `DUPLICATE`, `VERIFIED`. No skipped or invented transitions; `DUPLICATE` requires a `duplicate_of` reference. Who may transition is a storage/RLS concern (later slice).
3. **Submission fields** (allowlist, fail-closed): `category`, `description`, `reproduction_steps`, `technical_context_consent`, `technical_context`.
4. **Technical context** only with explicit per-submission consent (`technical_context_consent === true`); context without consent is rejected, never silently attached. Allowlist: `app_version`, `build`, `environment`, `platform`, `os_family`, `browser_family`, `route_id` (canonical screen ID, no URL), `client_timestamp`, `correlation_id`, `telemetry_event_id`. Explicitly excluded: raw user agent, URL/query, IP, device ID, free metadata bag.
5. **Free text** (`description`, `reproduction_steps`) is user-generated content classified `USER_CONTENT_POTENTIALLY_SENSITIVE`. Sanitization boundary: control/bidi characters removed, whitespace normalized, 2000-character cap, deterministic redaction of email, phone (≥ 9 digits, dates/times/weights untouched), URLs, bearer tokens and JWTs. Content is **not** interpreted or filtered for health information; protection is classification + restricted access.
6. **No automatic athlete data:** keys for HRV/sleep/body/health/heart, nutrition, AI prompt/response/coach, GPS/location, and training values (reps/load/RPE/RIR/sets/workout/exercise/session/pace/power/watt) are forbidden at top level and in technical context.
7. **Screenshots/attachments** are not part of the base contract and are rejected; a later slice may add them only behind a separate explicit user action.
8. **Stream separation:** record carries `stream: user_feedback`; the contract declares it must not use `client_telemetry_events`, `product_telemetry_events`, `sessions` or `coach_workout_feedback` as sink.

## Provisional product policy (PO, 29-09-2026)

Not legal proof and not a determined AVG/GDPR legal basis (`legal_basis: NOT_DETERMINED_PROVISIONAL_PRODUCT_POLICY_ONLY`).

- Feedback retention: 12 months (`feedback_retention_days: 365`).
- Feedback readable only by explicit product/admin triage roles (`product_triage`, `product_admin`) — to be enforced by RLS in a later slice.
- Technical context: opt-in per submission. Screenshots: separate explicit user action (later).
- Related (MS-TELEMETRY-01, not part of this slice): product telemetry stays opt-in; raw product-telemetry retention 90 days.

## Not in this slice

UI, storage/table, RLS, Netlify function, triage tooling, screenshots, notifications, provider selection.

## Next slice (Slice B — isolated storage + ingestion)

Dedicated `beta_feedback` table (RLS on, no anon grants; insert only via a server function that re-validates with `core/betaFeedback.js`; select only for triage roles), retention job for 12 months, a Netlify function mirroring the product-telemetry pattern (authenticated, payload cap, rate limit, fail-safe), and DB/RLS/grant verification against the live database. UI entry point follows in Slice C.

## Slice B status (29-09-2026)

Gebouwd: `migratie_v568.sql` (`beta_feedback`, RLS, geen client-schrijfrechten, triage-read via bestaande
`system_role` support/developer), `netlify/functions/beta-feedback.js` (authenticated server-side ingestion met
hervalidatie), `netlify/functions/cleanup-beta-feedback.js` (365 dagen, @daily). Tests: `core/betaFeedbackStorage.test.js`.
Open voor volgende slices: triage-statusovergangen (met `canTransition`), feedback-UI, screenshots (aparte expliciete actie).

## Slice C status (29-09-2026)

Gebouwd: feedback-UI (Help > Contact & feedback), per-inzending technische context (standaard uit, allowlist),
governed triage via `netlify/functions/beta-feedback-triage.js` (system_role support/developer, `canTransition`,
conditionele PATCH), `migratie_v569.sql` (`duplicate_of`, `status_updated_at/by`). Tests: `core/betaFeedbackUiTriage.test.js`.
Nog open: productievalidatie (echte inzending + triage-overgang), screenshots (aparte privacy/security-designgate),
notificaties, en een support-account (nu alleen developer).
