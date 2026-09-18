# External Benchmark Audit Method v1

## Scope
Static analysis of lawfully obtained Android APK/APKM/XAPK artefacts and, when supplied, runtime recordings. The method can benchmark product/UX and observable client architecture, but cannot prove undisclosed backend logic.

## Standard audit record
For every app capture: app/version, package, artefact format, version code when observable, min/target SDK when observable, audit date, provenance, SHA-256 when available, and limitations.

For every finding capture:
- domain;
- observed evidence;
- evidence source/location;
- confidence;
- generic pattern;
- TK relevance;
- current-TK verification status;
- reuse candidate;
- opportunity;
- risks/constraints;
- proposed tests/gates;
- roadmap status.

## Domains
Onboarding; home/dashboard; workout start; execution/set logging; RPE/RIR; progression; exercise search/library/media; programs; analytics; coaching/AI; navigation/settings; offline/sync; Health Connect/wearables/devices; Bluetooth; notifications/background work; deep links; storage/network security; permissions/exported components; observability/analytics; social/sharing; subscriptions; accessibility/localisation.

## Solution-mining rules
Study **patterns**, not proprietary implementations. Prefer a pattern seen independently in multiple products. Never copy competitor code, assets, branding, text or hidden business logic.

When a pattern is relevant to TK, design an original implementation around TK's existing architecture. For training/recovery intelligence the governing flow remains:

RAW DATA → Calculation Engine → Context Engine → Decision/Rules Engine → AI Coach → athlete.

AI is not a source of numerical truth.

## Static-analysis limitations
Presence of a permission, SDK, class, route, string or asset reference proves presence in the client artefact, not runtime use. Client code cannot by itself prove backend architecture, server-side recommendation logic, data retention or security controls. Label such conclusions as inference.

## Gate before build
No implementation task is created until current TK main and canonical documentation are checked. Existing implementation takes precedence over a new design; partial implementation should be extended rather than duplicated.
