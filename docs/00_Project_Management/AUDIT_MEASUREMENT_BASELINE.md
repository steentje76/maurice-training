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

| Metriek | Teller / Noemer | Waarde | Status |
|---|---|---|---|
| **Audit Coverage** | 78 / 81 | **96,30%** | **CANONICAL** |
| **Audit Closure** (V1_SCOPE=TRUE, excl. SUPERSEDED) | 16 / 55 | **29,09%** | **CANONICAL** |
| Roadmap Product Maturity | 4,04 / 5 | 80,8% | **PROVISIONAL — NIET CANONICAL** |

### Waarom Maturity nog niet canonical is

Het model schrijft voor dat maturity uit de tien gewogen subcriteria A–J wordt
berekend, en dat decimalen uitsluitend uit expliciete subcriteria volgen. Dat kan
vandaag niet worden waargemaakt. De capability-items in `ROADMAP_INDEX.json` dragen
uitsluitend de velden `status`, `priority`, `phase`, `target`, `software_validation`,
`device_validation`, `evidence_status`, `dependencies` en `next_action`. Daaruit is
afleidbaar:

| Criterium | Gewicht | Afleidbaar uit de index? |
|---|---|---|
| A Product scope defined | 5% | ja |
| B Canonical architecture | 15% | **nee** |
| C Runtime integration | 15% | **nee** |
| D Persistence/data model | 10% | **nee** |
| E Calc/Context/Decision integratie | 10% | **nee** |
| F Tests/evidence | 15% | ja |
| G Security/privacy | 5% | deels |
| H UX/user-facing completion | 10% | **nee** |
| I Failure/degraded-state handling | 5% | **nee** |
| J V1 audit closure | 10% | ja |

**30% van het gewicht is afleidbaar, 5% deels, 65% niet.** Die 65% zou per capability
handmatig in de codebase moeten worden vastgesteld: 81 capabilities × 6 criteria =
486 afzonderlijke beoordelingen.

De getoonde 80,8% is daarom **provisioneel** en berust op de statusafbeelding
(`NOT STARTED`=1 · `IMPLEMENTED`=2 · `INTEGRATED`/`TESTED`=3 · `VALIDATED`=4 ·
`CLOSED`=5). Die afbeelding is **geen alternatieve scorebron** en wordt niet als
canonical verklaard. Zodra A–J per capability is ingevuld, vervangt die berekening
de provisionele waarde via change_type **D BASELINE_MODEL_REVISION**.

**Canonieke methode, vastgelegd (BASELINE-1.1, change_type D):**

**OFFICIËLE METRIEK = V1 PRODUCT MATURITY.**

| Element | Definitie |
|---|---|
| Populatie | alle capabilities met `v1_scope = true` |
| Capabilityscore | gewogen A–J |
| Trackscore | gemiddelde van de **V1-capabilities** binnen die track |
| Totaal | equal-weight gemiddelde over **alle tracks die ten minste één V1-capability bevatten** |
| Tracks zonder V1-capability | **niet** in de V1-noemer |
| Post-V1-capabilities | **niet** in de V1-maturity, wel behouden in `ROADMAP_INDEX.json` |
| J bij `v1_scope = false` | **N/A** — geen fictieve 0 of 5 |

`status` is een afgeleid label van de evidence, nooit de scorebron.

De tracknoemer is **capability-based bewezen**, niet aangenomen: een track telt mee
zodra hij één V1-capability bevat. Op BASELINE-1.1 levert dat **16 V1-tracks** op
(T1–T15 en T17); T16 en T18 vallen af omdat al hun capabilities `v1_scope = false`
dragen. Die uitkomst is afgeleid, geen regel — verschuift een capability van scope,
dan verschuift de noemer mee.

**ALL-ROADMAP PRODUCT MATURITY** over alle 18 tracks is een mogelijke aparte
toekomstige metriek. Die is op dit moment **niet canonical en niet berekend**. De
≈80,8% blijft uitsluitend een legacy/provisionele statusmapping-indicator tot A–J
hem vervangt.

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

## Canonical Audit Measurement Model v1.0

**Canonieke bron:** `docs/audit/AJ_MEASUREMENT_MODEL_v1.json` — machineleesbaar, met
deterministische fingerprint over de frozen velden. Dit document verwijst ernaar; het
dupliceert de 60 ankers niet.

| | |
|---|---|
| `audit_model_id` | `trainingskompas-aj/v1.0` |
| `audit_model_version` | `1.0` |
| `model_fingerprint` | `sha256:cab0ca8b662e30c2e6ee6a22097c41466d132f8e3b0417bc5a42d421f0ee436e` |
| change_type | **D BASELINE_MODEL_REVISION** |

### Provenance — expliciet

**Historisch repository-proven:** criterium-identiteiten A–J, gewichten, de algemene
0–5 ladder en de bestaande N/A-semantiek (`e8fcbe9`, `66e36f9`).

**Nieuw, PO-goedgekeurd:** de 60 criterium-specifieke 0–5 ankers, de volledige
confidence-semantiek, de deterministische afrondingsspecificatie en de aanvullende
evidence-vereisten.

De criterium-specifieke ankers zijn **niet retrospectief repository-proven**. Zij worden
hier voor het eerst formeel vastgesteld. Er wordt geen historische provenance geclaimd.

### Afrondingsregel — één deterministische regel

Criteriumscore geheel 0–5 · N/A-gewicht uit de noemer · capabilityscore =
Σ(gewicht × score) / Σ(applicable gewicht), **half-up op 3 decimalen opgeslagen** ·
trackscore = **gemiddelde van de opgeslagen 3-decimale capabilityscores**, half-up op
3 decimalen · percentage = stored trackscore / 5 × 100, half-up op 2 decimalen.

Canoniek gevolg: **T6 3,623 = 72,46%**. Rapportage op verborgen onafgeronde
trackwaarden is niet toegestaan.

### Auditvoortgang — twee gescheiden tellingen

| Telling | Betekenis | Stand |
|---|---|---|
| `historical_audited` | beoordeeld onder een pre-v1.0 model; scores behouden, **niet v1.0-verifieerbaar** | **22 / 86** |
| `model_v1_verified` | beoordeeld onder `audit_model_version 1.0` met criterium-specifieke evidence | **0 / 86** |

`historical_audited` mag **niet** zonder qualifier als "canonical audited" worden
gepresenteerd. Batch A en B dragen `audit_model_status: HISTORICAL_PRE_V1_MODEL`,
`anchors_frozen: false` en `historical_weights_frozen: true` — hun gewichten waren wél
historisch bewezen, hun ankers niet. Her-audit onder v1.0 is voorzien als Batch A′/B′.

## Audit Measurement Model v1.2 — scope-bewuste gap traceability

**Canonieke bron:** `docs/audit/AJ_MEASUREMENT_MODEL_v1_2.json`. Model v1.0 blijft
integraal bewaard in `AJ_MEASUREMENT_MODEL_v1.json` en is niet gewijzigd. Een eerder
v1.1-voorstel heeft canonical main nooit bereikt en wordt niet bewaard.

| | |
|---|---|
| `audit_model_id` | `trainingskompas-aj/v1.2` |
| `audit_model_version` | `1.2` |
| `model_fingerprint` | `sha256:82891683aad13cccf779a13783d90bb77279cbab5dfd035989607226fa0a9264` |
| change_type | **D BASELINE_MODEL_REVISION** |
| supersedes | `trainingskompas-aj/v1.0` |

### Delta v1.0 → v1.2

**Gewijzigd:** `criteria.J.caps`, `evidence_contract.gap_traceability` en
`evidence_contract.register_traceability_completeness`.
**Ongewijzigd:** criteria A–I inclusief alle ankers, de J-ankers 0–5, alle gewichten,
de ladder, het N/A-model, het confidence-model en het rounding-model.

### Gap-traceability-contract

```
primary_capability_id   : string | null   — max. één, canoniek indien niet-null
affected_capability_ids : string[]        — uniek, 0..N, canoniek, primary niet erin
traceability_status     : COMPLETE | INCOMPLETE | AMBIGUOUS | NO_CAPABILITY_RELATION_PROVEN
traceability_scope      : CAPABILITY_SCOPED | TRACK_SCOPED | UNSCOPED | NOT_APPLICABLE
traceability_evidence   : verplicht; positief bewijs bij NO_CAPABILITY_RELATION_PROVEN
capability_id           : deprecated alias — gelijk aan primary; null bij null primary
```

| `status` | `scope` | primary | affected |
|---|---|---|---|
| COMPLETE | CAPABILITY_SCOPED | verplicht | 0..N |
| INCOMPLETE | TRACK_SCOPED | null | leeg (+ bewezen `scope_tracks`) |
| INCOMPLETE | UNSCOPED | null | leeg |
| AMBIGUOUS | TRACK_SCOPED of UNSCOPED | null | leeg |
| NO_CAPABILITY_RELATION_PROVEN | NOT_APPLICABLE | null | leeg (+ positief bewijs) |

Elke andere combinatie is ongeldig.

### J-relevantie per scope

**CAPABILITY_SCOPED** — uitsluitend primary ∪ affected. **TRACK_SCOPED** — uitsluitend
capabilities binnen de onafhankelijk bewezen `scope_tracks`. **UNSCOPED** — er mag
**geen enkele** individuele capability-relatie worden afgeleid; de gap maakt geen
capability J_UNPROVEN en blijft register-level audit debt. **NOT_APPLICABLE** — geen
capability-J-relatie.

Geen fallback op een historische `capability_id`, op onbewezen `primary_track` of
`secondary_tracks`, en nooit globale blokkade van alle capabilities.

### Register-level traceability completeness

Traceability is **RESOLVED** bij COMPLETE + CAPABILITY_SCOPED met geldige relaties en
evidence, **of** bij NO_CAPABILITY_RELATION_PROVEN + NOT_APPLICABLE met positief bewijs.
Traceability is **UNRESOLVED** bij INCOMPLETE of AMBIGUOUS.

`traceability_complete` = geen enkele relevante V1-gap heeft unresolved traceability.
Een geldig NO_CAPABILITY_RELATION_PROVEN-record maakt dit **op zichzelf niet false**.

| | |
|---|---|
| **`traceability_complete`** | **false** |
| Reden | **`GAP-P2-010` = INCOMPLETE / UNSCOPED** |

`traceability_complete` staat op registerniveau en is losgekoppeld van
`model_v1_verified`, dat uitsluitend capability-niveau verificatie telt en deze
register-debt niet mag verbergen.

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
| 1 | 2026-09-17 | alle | v1.0 | v1.2 | — | D | gap-traceability gate, PO-goedgekeurd | J telt primary én affected capability en is scope-bewust; een UNSCOPED gap blokkeert geen capability maar blijft register-debt. Gap-register gemigreerd. Geen score gewijzigd. |
