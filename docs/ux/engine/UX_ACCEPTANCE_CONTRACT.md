# UX Acceptance Contract v1

Per gewijzigd scherm zijn de volgende gates verplicht.

| Gate | Bewijs |
|---|---|
| FUNCTION | capability/requirement werkt end-to-end |
| REUSE | bestaande component/pattern inventory gecontroleerd |
| VISUAL | canonical tokens + goedgekeurde compositie/target |
| NAVIGATION | ieder interactief element heeft action + destination/effect + back semantics |
| STATES | alle toepasselijke normal/loading/empty/error/offline/degraded states |
| A11Y | labels, focus/reading order, touch target, non-color-only meaning |
| SCIENCE | athlete-facing claims respecteren Calculation/Decision/Evidence contract waar relevant |
| RESPONSIVE | relevante mobiele viewport(s), geen overflow/afgesneden kernactie |
| DEVICE | echte render/screenshot of fysieke-device proof voor risicovolle/native flows |
| REGISTRY | registry en runtime niet divergent |

Statussen: `DRAFT`, `PO_REVIEW_REQUIRED`, `UX_SPEC_READY`, `IMPLEMENTED_UNPROVEN`, `UX_PROVEN`, `DEPRECATED`.

## Fail closed
Een nieuw/gewijzigd athlete-facing scherm zonder geldig registry-record of met ontbrekende interaction destination is niet release-ready. Een wijziging aan een bestaande action zonder contract-sync is UX drift.
