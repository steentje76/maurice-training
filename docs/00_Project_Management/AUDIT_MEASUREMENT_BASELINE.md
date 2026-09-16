# AUDIT_MEASUREMENT_BASELINE.md — Trainingskompas
Canoniek **meetmodel** voor audit en roadmap. Dit bestand bevat het model, de
officiële metrieken en het score-drift-changelog. Het bevat **geen** duplicaat van
de roadmapdata: die staat in `docs/ROADMAP_INDEX.json`, de gaps in
`docs/AUDIT_GAP_REGISTER.json`.

**Baseline:** 1.0 · **main:** `3415744992008607181e7a078483de372d989efd` · **APP_VER:** v4.69.98 · **datum:** 16 september 2026

## Bronhiërarchie

1. **PRODUCT INTENT** — `docs/TRAININGSKOMPAS_V1_SCOPE_MATRIX.md`, formele PO-besluiten, `CURRENT_STATE.md`
2. **IMPLEMENTATION REALITY** — actuele `main`, database/schema, runtime wiring, tests
3. **EVIDENCE OF CLOSURE** — merged canonical implementatie + passende test/runtime/device/security-evidence

Historische documenten wegen nooit zwaarder dan actuele implementatie.

## Maturity-model (0–5)

| Niveau | Betekenis |
|---|---|
| 0 | NOT ASSESSED |
| 1 | DISCOVERED |
| 2 | FOUNDATION |
| 3 | FUNCTIONAL |
| 4 | CANONICAL |
| 5 | AUDIT CLOSED |

5 betekent: afgesproken V1-scope volledig beoordeeld en alle blocking auditgaps gesloten of formeel deferred. Niet: "kan nooit meer beter".

### Subcriteria en gewichten (eenmalig vastgelegd)

| Criterium | Gewicht |
|---|---|
| A Product scope defined | 5% |
| B Canonical architecture | 15% |
| C Runtime integration | 15% |
| D Persistence/data model | 10% |
| E Calc/Context/Decision integratie | 10% |
| F Tests/evidence | 15% |
| G Security/privacy | 5% |
| H UX/user-facing completion | 10% |
| I Failure/degraded-state handling | 5% |
| J V1 audit closure | 10% |

B+C+F = 45%, omdat daar de drie harde regels van dit project worden getoetst: `BUILT ≠ WIRED`, `WIRED ≠ CANONICAL`, `TESTED ≠ DEVICE_PROVEN`. N/A-criteria worden proportioneel herverdeeld, nooit als 0 geteld.

### Statusafbeelding (index → maturityniveau)

`NOT STARTED`=1 · `IMPLEMENTED`=2 · `INTEGRATED`=3 · `TESTED`=3 · `VALIDATED`=4 · `CLOSED`=5

## Officiële metrieken — Baseline 1.0

| Metriek | Teller / Noemer | Waarde |
|---|---|---|
| **Audit Coverage** | 78 / 81 | **96.30%** |
| **Audit Closure** (V1_SCOPE=TRUE, excl. SUPERSEDED) | 16 / 56 | **28.57%** |
| **Roadmap Product Maturity** | 4.041 / 5 | **80.82%** |

### Noemers

- **Coverage**: alle auditeerbare capability-items (`type=capability` in ROADMAP_INDEX) plus de 7 canonieke T9-capabilities. COVERED = `evidence_status` ∈ {VERIFIED, N/A, PARTIAL}.
- **Closure**: alle canonical gaps met `v1_scope=true`, exclusief SUPERSEDED. Teller = CLOSED_PROVEN + DEFERRED_ACCEPTED.
- **Maturity**: equal weight over de 18 tracks; per track het gemiddelde maturityniveau van de eraan gekoppelde index-items.

## T1–T18 matrix

| Track | Naam | n | Score | % | Open gaps | V1 | Conf. |
|---|---|---|---|---|---|---|---|
| T1 | Training Core | 7 | 5.00 | 100.0% | 1 | TRUE | MEDIUM |
| T2 | Exercise Intelligence | 2 | 3.00 | 60.0% | 1 | TRUE | MEDIUM |
| T3 | Endurance & Multisport | 16 | 3.75 | 75.0% | 9 | TRUE | MEDIUM |
| T4 | Calculation Engine | 13 | 4.15 | 83.1% | 1 | TRUE | MEDIUM |
| T5 | Context Engine | 4 | 4.50 | 90.0% | 1 | TRUE | MEDIUM |
| T6 | Decision & Rules Engine | 5 | 4.20 | 84.0% | 2 | TRUE | HIGH |
| T7 | Evidence & Provenance | 8 | 4.00 | 80.0% | 5 | TRUE | HIGH |
| T8 | AI Coach | 11 | 4.36 | 87.3% | 0 | TRUE | HIGH |
| T9 | Recovery, Health & Nutrition | 7 | 3.57 | 71.4% | 12 | TRUE | MEDIUM |
| T10 | Women's Performance | 7 | 4.29 | 85.7% | 1 | TRUE | HIGH |
| T11 | Wearables & Devices | 12 | 3.92 | 78.3% | 4 | TRUE | MEDIUM |
| T12 | Analytics & Athlete Intelligence | 10 | 3.60 | 72.0% | 2 | TRUE | MEDIUM |
| T13 | Social | 6 | 3.67 | 73.3% | 1 | TRUE | MEDIUM |
| T14 | Coach/PT | 7 | 4.00 | 80.0% | 0 | TRUE | MEDIUM |
| T15 | Gym/Club/Team | 13 | 4.00 | 80.0% | 0 | TRUE | MEDIUM |
| T16 | Commercial | 8 | 4.25 | 85.0% | 0 | FALSE | HIGH |
| T17 | Platform/Security | 22 | 4.23 | 84.5% | 0 | TRUE | MEDIUM |
| T18 | Scientific Platform | 4 | 4.25 | 85.0% | 0 | FALSE | HIGH |

## Score-drift-regels

Na Baseline 1.0 mag een score uitsluitend wijzigen via:

| Type | Betekenis |
|---|---|
| **A MERGED_CLOSURE** | nieuwe bewezen canonical capability of gap-closure |
| **B NEW_EVIDENCE_CORRECTION** | nieuwe evidence bewijst dat een eerdere classificatie onjuist was |
| **C SCOPE_CHANGE** | PO wijzigt formeel de V1-scope |
| **D BASELINE_MODEL_REVISION** | het meetmodel zelf wordt expliciet herzien |

Elke wijziging registreert: datum, track, old_score, new_score, delta, change_type, PR/gap/evidence, rationale.

**Een scoreverlaging zonder B, C of D is INVALID.** "Na heroverweging lijkt het lager" is geen geldige grond.

## Score-drift changelog

| # | Datum | Track | Oud | Nieuw | Δ | Type | Evidence | Rationale |
|---|---|---|---|---|---|---|---|---|
| 0 | 2026-09-16 | alle | — | Baseline 1.0 | — | D | BASELINE-0 completion run | Eerste reproduceerbare meting; vervangt de hypotheses 82,7% / ~93% / ~91%. |
