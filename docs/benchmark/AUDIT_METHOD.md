# External Benchmark Audit Method v1.1

## Scope
Static analysis of lawfully obtained Android APK/APKM/XAPK artefacts and, when supplied, runtime recordings. The method benchmarks product/UX and observable client architecture, but cannot prove undisclosed backend logic, runtime behaviour, server-side controls or competitor test quality.

## Standard audit record
For every app capture: app/version, package, artefact format, version code, min/target SDK, audit date, provenance, SHA-256, split/ABI structure and limitations when observable.

For every finding capture: domain; observed evidence; evidence source/location; confidence; inference (if any); generic solution pattern; TK relevance; current-TK verification status; reuse candidate; opportunity; risks/constraints; proposed tests/gates; roadmap status.

## Domains
Packaging/signing; framework/native boundary; permissions; components/attack surface; storage/file providers; network/deep links; authentication/identity; Health Connect; Bluetooth/wearables; workout execution; timers/background work; offline/sync; exercise library/media; programs/progression; analytics; coaching/AI; social/sharing; widgets; notifications; subscriptions; observability; accessibility/localisation; performance/size.

## TK score-map reuse
The canonical TK Measurement Model v1.2 remains defined in `docs/audit/AJ_MEASUREMENT_MODEL_v1_2.json`. External audits reuse its **0–5 ladder, A–J criterion vocabulary, N/A discipline, confidence semantics and evidence-first rule**, but do not pretend a third-party APK supplies evidence that only a source repository, backend, tests or real device can prove.

External status per criterion is one of:
- `OBSERVED_SCORE 0..5` only when the external evidence actually supports the anchor;
- `N/A` only where the canonical model permits it and positive evidence proves non-applicability;
- `NOT ASSESSABLE FROM ARTEFACT` where the APK cannot prove the criterion.

No aggregate A–J maturity score is emitted when required criteria are not assessable. Unknown is never converted to zero. This prevents a closed-source competitor being penalised merely because its source/tests/backend are unavailable, and prevents false precision.

A separate **audit coverage** field records which external domains were statically inspected. It is not a product maturity score.

## Solution-mining rules
Study patterns, not proprietary implementations. Prefer a pattern seen independently in multiple products. Never copy competitor code, assets, branding, text or hidden business logic.

When a pattern is relevant to TK, design an original implementation around TK's existing architecture. For training/recovery intelligence the governing flow remains:

RAW DATA → Calculation Engine → Context Engine → Decision/Rules Engine → AI Coach → athlete.

AI is not a source of numerical truth.

## Static-analysis limitations
Presence of a permission, SDK, class, route, string or asset reference proves presence in the client artefact, not runtime use. Client code cannot by itself prove backend architecture, server-side recommendation logic, data retention, actual permission timing, network enforcement, accessibility behaviour, offline semantics or security controls. Label such conclusions as inference or NOT ASSESSABLE.

## Gate before build
No implementation task is created until current TK main and canonical documentation are checked. Existing implementation takes precedence over a new design; partial implementation should be extended rather than duplicated. A competitor pattern may be marked VERIFIED_GAP only after current-main evidence proves the gap.