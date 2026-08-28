# ROADMAP_COVERAGE_AUDIT.md

**Doel:** garanderen dat geen enkele capability uit `docs/CAPABILITY_REGISTRY.md` ongemerkt verdwijnt bij de uitbreiding naar Master Roadmap 2.0. Elke capability krijgt een classificatie en een roadmapbestemming.

**Classificaties:** NO ACTION · VALIDATION ONLY · IMPROVEMENT · MAJOR DEVELOPMENT · NEW CAPABILITY · DEFERRED.

| Capability-ID | Huidige maturity | Classificatie | Roadmapbestemming |
|---|---|---|---|
| SEC-GYMS-001 | CLOSED | NO ACTION | — (F0, afgerond) |
| SEC-TEST-001 | CLOSED | NO ACTION | — (F0, afgerond) |
| SEC-GATE-001 | CLOSED | NO ACTION | — (F0, afgerond) |
| PLAT-DELETE-001 | TESTED | VALIDATION ONLY | MS-F1-06 (live-verificatie in staging) |
| PLAT-BACKUP-CLEANUP-001 | NOT STARTED | IMPROVEMENT | MS-F1-01 |
| PLAT-OBSERVABILITY-001 | NOT STARTED | NEW CAPABILITY | MS-F1-02 |
| SOC-GYMTEAM-001 | TESTED | VALIDATION ONLY | MS-F1-06 (samen met PLAT-DELETE-001) |
| GYM-RLS-SCOPING-001 | NOT STARTED | MAJOR DEVELOPMENT | MS-F1-03 |
| COACH-RELATIONSHIP-001 | IMPLEMENTED | IMPROVEMENT | MS-F10-01 (testdekking) |
| AI-COACH-001 | CLOSED (security-deel) | NO ACTION | — (F0, afgerond) |
| AI-OUTPUT-CONTRACT-001 | NOT STARTED | NEW CAPABILITY | MS-F2-03 |
| AI-PROGRAM-AUTOGEN-001 | IMPLEMENTED | MAJOR DEVELOPMENT | MS-F4-04 t/m 06 |
| EVID-SCI-001 | TESTED | IMPROVEMENT | MS-F3-04, MS-F3-05 |
| DEC-CORE-001 | TESTED | NO ACTION (basis staat) | MS-F3-06 (uitbreiding naar meer domeinen) |
| DEV-WEARAUTH-001 | TESTED | VALIDATION ONLY | MS-F5-01 |
| DEV-WEARSYNC-001 | INTEGRATED | VALIDATION ONLY | MS-F5-01 |
| DEV-CONCEPT2-001 | TESTED | VALIDATION ONLY | MS-F5-02 |
| DEV-VALIDATION-001 | TESTED (software) | VALIDATION ONLY | MS-F5-01, MS-F5-02 |
| END-INTERVAL-001 | INTEGRATED | IMPROVEMENT | MS-F6-03 (flow-niveau UX-test) |
| END-HYROX-001 | CLOSED (kern) | IMPROVEMENT | MS-F6-04 (jaarlijkse rulebook-herverificatie) |
| CTX-CYCLE-001 | INTEGRATED | DEFERRED | MS-F8-01 t/m 05 (wacht op productbesluiten) |
| WOMENS-PERF-DECISIONS-001 | NOT STARTED | DEFERRED | Product decision gate, blokkeert F8 |
| COMM-UI-001 | NOT STARTED (UI) | MAJOR DEVELOPMENT | MS-F2-01, MS-F2-02 |
| CAP-REGISTRY-SCREENS-001 | IMPLEMENTED (inventaris) | IMPROVEMENT | Verspreid over T1/T2 (flow-niveau tests per scherm) |
| SCI-CONSENT-001 | NOT STARTED | DEFERRED | MS-F14-01 (lange termijn) |

**Dekking: 24/24 capabilities geclassificeerd, 0 orphan.**

## Nieuw geïdentificeerde first-class domeinen (niet eerder als aparte track erkend)
Bij deze audit is **Exercise Intelligence (T2)** expliciet losgetrokken van Training Core (T1) — de bestaande `s-library`/`s-lich-oefeningen`-schermen en MoveKit-catalogus rechtvaardigen een eigen track, analoog aan hoe Context Engine bij de vorige consolidatie al is erkend. Bewijs: 206 MoveKit-oefeningen, aparte exercise-catalog.json (302 KB), eigen zoek/filter/favorieten-functionaliteit in index.html, los van de trainingsuitvoering zelf.

Overige gesuggereerde tracks (T13 Social, T18 Scientific Platform) bestaan al impliciet in de vorige roadmap (F9, F14) en worden hier alleen formeler benoemd — geen nieuw bewijs van een ontbrekend domein buiten wat al bekend was.
