# ROADMAP_COVERAGE_AUDIT.md

**Belangrijke correctie t.o.v. de vorige versie (v1.1 §27):** "100% completeness" mag nooit als één enkel getal worden gerapporteerd. Er zijn vier afzonderlijke, niet-uitwisselbare dekkingsdimensies:

## 1. Registry Coverage

**Canonieke definitie:** het aantal actuele, unieke capability-ID's dat als eigen rij voorkomt in `docs/CAPABILITY_REGISTRY.md` (niet: tabelkoppen, historische IDs, aliases, dubbele verwijzingen, of samenvattingsregels). Dit is de canonieke bron voor "hoeveel capabilities bestaan er" — `docs/ROADMAP_INDEX.json` is een afgeleide, machine-leesbare weergave die met deze registry synchroon moet blijven, niet een tweede, onafhankelijke telling.

**Canonical capability count: 43 (was 42 vóór MS-F4-06 — BENCHMARK-TRACKING-001 toegevoegd).**

**Resultaat: 43/43 = 100%.** Alle 43 capabilities in `docs/CAPABILITY_REGISTRY.md` hebben een mastersprint-verwijzing in `docs/ROADMAP_INDEX.json` (zie `next_action`-veld per capability) én een eigen `capability`-type entry in `docs/ROADMAP_INDEX.json` (zie sectie "Capability-classificatie" hieronder voor de volledige lijst).

**Root cause van de eerdere 16/16-vermelding (opgelost):** dat cijfer was het aantal `type: "capability"`-entries dat destijds daadwerkelijk in `docs/ROADMAP_INDEX.json` stond (16), niet het aantal rijen in de Capability Registry zelf (25) — een onvolledige JSON-export die nooit 1-op-1 was gesynchroniseerd met de registry. Daarnaast bevatte de Capability Registry zelf een ambigu label (`DEV-WEARSYNC-001/002`, één rij die twee sub-ID's in de naam droeg) dat door eenvoudige ID-detectie werd overgeslagen — vandaar dat een eerdere handmatige telling op 24 in plaats van 25 uitkwam. Beide problemen zijn hier opgelost: het label is genormaliseerd naar `DEV-WEARSYNC-001` (aansluitend bij hoe het overal elders al werd genoemd), en `docs/ROADMAP_INDEX.json` bevat nu alle 25 registry-capabilities als eigen entry (plus `DOC-HANDBOOK-001`, dat bewust een *roadmap-governance-item* is, geen Capability Registry-capability — zie kanttekening hieronder, expliciet buiten de 25 gehouden).

**Kanttekening — DOC-HANDBOOK-001:** dit ID bestaat in `docs/ROADMAP_INDEX.json` en `docs/GAP_ANALYSIS_V2.md` (Handbook-actualiteit als roadmap-onderwerp), maar heeft bewust geen eigen rij in `docs/CAPABILITY_REGISTRY.md` — een Handbook-hoofdstuk is geen technische capability met code/DB/testbewijs, het is een documentatiegovernance-item. Het telt daarom niet mee in de 25 en wordt niet kunstmatig aan de registry toegevoegd.

## 2. Roadmap Structural Completeness
**Definitie:** machine-leesbare/traceability-volledigheid van de roadmap zelf.
**Resultaat:** 16/16 geautomatiseerde consistentiechecks groen (`tools/check-doc-consistency.js`, geverifieerd door de checker daadwerkelijk te draaien): 0 dubbele IDs, 0 orphan capabilities, 0 orphan roadmap-IDs, 0 ongeldige dependencies, 0 circulaire dependencies, 0 P0/P1 zonder mastersprint, 0 mastersprints zonder acceptance-gate/phase/track/target-maturity, 0 ongeldige priority/status-waarden, 0 onvolledige validation-schema's, 0 dependency-referenties naar obsolete/superseded oude MS-IDs, 0 capability-count-mismatches (registry/roadmap-index/coverage-audit synchroon).

## 3. Product Domain Coverage
**Definitie:** dekking van de 18 gewenste producttracks (T1-T18) door concrete mastersprints.
**Resultaat: 18/18 tracks hebben minimaal 1 mastersprint.** Diepte verschilt sterk en is een bewuste productkeuze, geen tekortkoming:
- **Diep uitgewerkt (10+ mastersprints of expliciete metric-registry-dekking):** T1 (Training Core, 8 sprints via F2), T4 (Calculation Engine, 5 sprints via F3), T7 (Evidence & Provenance, 3 sprints via F3)
- **Middel uitgewerkt (3-6 mastersprints):** T2, T3, T5, T6, T8, T9, T11, T12, T14, T15, T16, T17
- **Bewust dun (1-3 mastersprints, decision- of koers-gated):** T10 (Women's Performance, wacht op 5 besluiten), T13 (Social, wacht op koersbesluit), T18 (Scientific Platform, lange termijn)

## 4. Execution Readiness
**Definitie:** percentage mastersprints met voldoende objective, dependency, acceptance-gate, validation en maturity-target om daadwerkelijk gestart te kunnen worden.
**Resultaat: 79/79 = 100%** op het niveau van "heeft de vereiste velden" (elk mastersprint-item in `docs/ROADMAP_INDEX.json` heeft objective/acceptance_gate/dependencies/validation/target_maturity — geverifieerd via consistentiechecks 8-12).
**Belangrijke kanttekening:** dit is **structurele** volledigheid, geen inhoudelijke garantie dat elke acceptance-gate al scherp genoeg geformuleerd is voor een uitvoerende sprint — met name de "NEW"-gemarkeerde v1.1-toevoegingen (34 van de 79) hebben nog geen technische diepte-audit ondergaan zoals de oorspronkelijke 24 Capability Registry-items die wel hadden.

---

## Capability-classificatie (ongewijzigd qua methode, bijgewerkte bestemmingen)

| Capability-ID | Maturity | Classificatie | Nieuwe roadmapbestemming (v1.1) |
|---|---|---|---|
| SEC-GYMS-001 | CLOSED | NO ACTION | — (F0) |
| SEC-TEST-001 | CLOSED | NO ACTION | — (F0) |
| SEC-GATE-001 | CLOSED | NO ACTION | — (F0) |
| PLAT-DELETE-001 | TESTED | VALIDATION ONLY | MS-F13-05 |
| PLAT-BACKUP-CLEANUP-001 | NOT STARTED | IMPROVEMENT | MS-F1-05 |
| PLAT-OBSERVABILITY-001 | **INTEGRATED** (voorheen ongestart) | NO ACTION | — (F1, MS-F1-02 SOFTWARE CLOSED; operationele validatie blijft open, niet blokkerend) |
| SOC-GYMTEAM-001 | TESTED | VALIDATION ONLY | MS-F13-05 |
| GYM-RLS-SCOPING-001 | **VALIDATED** | NO ACTION (was MAJOR DEVELOPMENT) | — (F1, MS-F1-01 CLOSED) |
| SEC-USERROLE-001 | CLOSED | NO ACTION | — (F1, MS-F1-01 CLOSED, gevonden tijdens de sprint) |
| SEC-CONFIG-001 | VALIDATED | NO ACTION | — (F1, MS-F1-03 CLOSED) |
| CALC-STR-REGISTRY-001 | VALIDATED | NO ACTION | — (F3, MS-F3-01 CLOSED) |
| CALC-LOAD-REGISTRY-001 | VALIDATED | NO ACTION | — (F3, MS-F3-02 CLOSED) |
| CALC-REC-REGISTRY-001 | VALIDATED | NO ACTION | — (F3, MS-F3-03 CLOSED) |
| CALC-END-REGISTRY-001 | TESTED | NO ACTION (bewust niet VALIDATED, zie MS-F3-04-rapport) | — (F3, MS-F3-04 PARTIAL) |
| CALC-ENE-REGISTRY-001 | VALIDATED | NO ACTION | — (F3, MS-F3-05 CLOSED) |
| CTX-CONTRACT-001 | VALIDATED | NO ACTION | — (F3, MS-F3-06 CLOSED) |
| DEC-RULE-REGISTRY-001 | VALIDATED | NO ACTION | — (F3, MS-F3-07 CLOSED) |
| DQ-CONFIDENCE-CONTRACT-001 | VALIDATED | NO ACTION | — (F3, MS-F3-08 CLOSED) |
| EVIDENCE-CLAIM-AUDIT-001 | VALIDATED | NO ACTION | — (F3, MS-F3-09 CLOSED) |
| PROVENANCE-EXPLAINABILITY-001 | VALIDATED | NO ACTION | — (F3, MS-F3-10 CLOSED) |
| CALC-EVIDENCE-SPEC-001 | VALIDATED | NO ACTION | — (F3, MS-F3-11 CLOSED) |
| HRV-LOG-ATOMICITY-001 | VALIDATED | NO ACTION | — (F3, Closure Hotfix CLOSED) |
| DAILY-COACH-EXPLAINABILITY-001 | VALIDATED | NO ACTION | — (F4, MS-F4-02 CLOSED) |
| EXERCISE-PROGRESSION-COACH-001 | VALIDATED | NO ACTION | — (F4, MS-F4-03 CLOSED) |
| SCHEDULE-ADHERENCE-001 | VALIDATED | NO ACTION | — (F4, MS-F4-05 CLOSED) |
| BENCHMARK-TRACKING-001 | VALIDATED | NO ACTION | — (F4, MS-F4-06 CLOSED) |
| COACH-RELATIONSHIP-001 | IMPLEMENTED | IMPROVEMENT | MS-F10-01, MS-F10-02 |
| AI-COACH-001 | CLOSED (security) | NO ACTION | — (F0) |
| AI-OUTPUT-CONTRACT-001 | TESTED | NO ACTION (status TESTED, niet CLOSED -- zie MS-F4-01-rapport) | — (F4, MS-F4-01 status TESTED) |
| AI-PROGRAM-AUTOGEN-001 | CLOSED | NO ACTION | — (F4, MS-F4-04 CLOSED) |
| EVID-SCI-001 | TESTED | IMPROVEMENT | MS-F3-01/03/04/05/09/11 |
| DEC-CORE-001 | TESTED | IMPROVEMENT | MS-F3-07 |
| DEV-WEARAUTH-001 | TESTED | VALIDATION ONLY | MS-F5-03 |
| DEV-WEARSYNC-001 | INTEGRATED | VALIDATION ONLY | MS-F5-03 |
| DEV-CONCEPT2-001 | TESTED | VALIDATION ONLY | MS-F5-02 |
| DEV-VALIDATION-001 | TESTED (software) | VALIDATION ONLY | MS-F5-01/02/03 |
| END-INTERVAL-001 | INTEGRATED | IMPROVEMENT | MS-F6-01/02/03 |
| END-HYROX-001 | CLOSED (kern) | IMPROVEMENT | MS-F6-04 |
| CTX-CYCLE-001 | INTEGRATED | DEFERRED | MS-F8-03/04 |
| WOMENS-PERF-DECISIONS-001 | NOT STARTED | DEFERRED | MS-F8-01 (gate), MS-F8-02 |
| COMM-UI-001 | NOT STARTED | MAJOR DEVELOPMENT | **MS-F12-01/02/03/04** (verplaatst F2→F12, P1→P2) |
| CAP-REGISTRY-SCREENS-001 | IMPLEMENTED | IMPROVEMENT | MS-F2-01 t/m MS-F2-08 |
| SCI-CONSENT-001 | NOT STARTED | DEFERRED | MS-F14-01/02/03 |

**Dekking: 43/43 capabilities geclassificeerd, 0 orphan** (Registry Coverage = 100%, zie hierboven).

## Track-erkenning
Exercise Intelligence (T2) blijft expliciet erkend als eigen track (bevestigd in v1.1 §6, ongewijzigd t.o.v. de vorige consolidatie).
