# TRAININGSKOMPAS_MASTER_ROADMAP.md — 2.0 (Full Execution Blueprint)

**Vastgesteld:** 28 augustus 2026, tegen `main` @ `7fe0c12572094e8f9035e58d1330260fc945d04b`.
**Karakter:** dit is een analyse/architectuur/planningsdocument — geen enkele mastersprint hierin is uitgevoerd. Zie `docs/ROADMAP_COVERAGE_AUDIT.md` voor de volledige capability-dekkingscontrole (24/24 capabilities geclassificeerd, 0 orphan).
**Compressieniveau, expliciet:** voor P0/P1-tracks (Calculation Engine, AI Coach, Training Core, Gym-RLS) zijn epics tot op mastersprint-niveau uitgewerkt. Voor P3/P4-tracks (Social, Scientific Platform) is de eerste onderzoeks-mastersprint uitgewerkt en de rest bewust als "later, na die uitkomst" benoemd — een volledige epic-boom voor een track die nog niet eens een productbeslissing heeft, zou giswerk zijn, geen planning.

---

## 1. Executive Summary
Trainingskompas heeft een architecturaal solide, breed geverifieerd fundament (F0 CLOSED: 0 open P0's, 69/69 DB-tabellen RLS-geverifieerd, 78 testbestanden comprehensive in zowel lokale als CI-gate). De komende fasen (F1-F15) brengen dit fundament naar productvolwassenheid langs 18 tracks, met een expliciete, bewezen differentiator (evidence-transparantie t.o.v. "unvalidated black box"-concurrenten) als rode draad.

## 2. Product Vision
Ongewijzigd t.o.v. `docs/01_Product/Product_Book.md`: eerst de beste AI-gestuurde personal training-app, met AI als interpreteerder/communicator — nooit als rekenende bron van waarheid. Deze roadmap versterkt dat principe (zie Track 8/T8, AI Coach).

## 3. Architecture Principles
Bevestigd in `docs/TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md`: RAW → NORMALIZATION → CALCULATION → CONTEXT → DECISION → EVIDENCE → AI → UX. Elke mastersprint hieronder die de Calculation/Decision/Evidence-laag raakt, moet deze keten respecteren en mag de bestaande "Calculation/Decision Core purity"-gate (`core/release-gate.js`) niet doorbreken.

## 4. Current Baseline
- `main` @ `7fe0c12572094e8f9035e58d1330260fc945d04b`, v4.69.0
- F0 Verified Baseline: CLOSED · Open P0: 0 · Documentation Source of Truth: CONSISTENT
- 78 testbestanden (discovery-based, lokaal + CI), 69 DB-tabellen (RLS geverifieerd), 24 capabilities geregistreerd

## 5. Product Tracks (T1-T18)
| Track | Naam | Status vandaag |
|---|---|---|
| T1 | Training Core | Volwassen (TESTED/INTEGRATED), flow-niveau UX-tests ontbreken |
| T2 | Exercise Intelligence | **Nieuw expliciet erkend als eigen track deze sprint** (was impliciet onder T1) — MoveKit (206 oefeningen), eigen catalogus/zoek/filter |
| T3 | Endurance & Multisport | DIFFERENTIATED (HYROX/Adaptive), zie Benchmark |
| T4 | Calculation Engine | Fundament sterk, registry-volledigheid per metric nog niet A-E gelabeld |
| T5 | Context Engine | First-class (bevestigd vorige sprint), 6 eigen modules |
| T6 | Decision & Rules Engine | Corroboratiepatroon (DEC-036) aanwezig, uitbreiding naar meer domeinen mogelijk |
| T7 | Evidence & Provenance | `evidence_store.v1` hard afgedwongen voor regels, niet voor AI-vrije-tekst |
| T8 | AI Coach | Security CLOSED, governance/outputcontract open, benchmark-gap t.o.v. Hevy Trainer |
| T9 | Recovery & Health Context | Volwassen, cyclus-context geïntegreerd |
| T10 | Women's Performance | Geblokkeerd door 5 productbeslissingen |
| T11 | Wearables & Devices | Software TESTED, real-device-validatie OPEN |
| T12 | Analytics & Athlete Intelligence | Relationship Discovery Engine bestaat, UX-audit niet gedaan |
| T13 | Social & Community | Bewust laag (P4), geen productbeslissing om te bouwen |
| T14 | Coach/PT Platform | Schema aanwezig, UI ontbreekt |
| T15 | Gym/Club/Team Platform | Schema aanwezig, **RLS-scoping-gat is harde blocker** |
| T16 | Commercial & Entitlements | DB-schema compleet, UI ontbreekt volledig |
| T17 | Platform/Production/Security | Sterk na P0-closure; observability ontbreekt |
| T18 | Scientific Platform | Evidence-laag is een goede basis, consent-flow ontbreekt |

## 6. Capability Coverage
Zie `docs/ROADMAP_COVERAGE_AUDIT.md` — 24/24 capabilities geclassificeerd (NO ACTION/VALIDATION ONLY/IMPROVEMENT/MAJOR DEVELOPMENT/NEW CAPABILITY/DEFERRED), elk met een mastersprint-bestemming.

## 7. Benchmark Position
Uit `docs/BENCHMARK_REGISTRY.md`: BEHIND 4 (AI-auto-programmering specifiek, exercise library schaal, social, commercial-UI) · PARITY 2 · AHEAD 2 (evidence-transparantie, HRV-voorzichtigheid) · DIFFERENTIATED 3 (HYROX-specificiteit, cyclus-trainingskoppeling, evidence-eis). Sterkste bewijs: onafhankelijk onderzoek (Doherty et al., Altini) noemt concurrerende recovery-scores "unvalidated black boxes" — TK's evidence-architectuur is een aantoonbaar, niet slechts marketing-, verschil.

## 8. Dependency Architecture
```
Raw Data → Normalization → Calculation → Context → Decision → Evidence → AI → UX
Training Definition → Preview → Execution → Logging → History → Analytics → Coaching
Identity → Privacy → Social                              (T13, laag geprioriteerd)
Identity → RBAC → Organization → Coach/Gym                (T14/T15, geblokkeerd door GYM-RLS-SCOPING-001)
Entitlements → Commercial UI → Billing                     (T16, geen blocker behalve bouwwerk zelf)
Evidence → Scientific Platform                              (T18, lange termijn)
```
**Harde regel, ongewijzigd:** Track 15 (Gym/Club/Team) mag niet starten met echte multi-tenant-data vóór GYM-RLS-SCOPING-001 gesloten is.

## 9. Prioritization Model
Score per epic/mastersprint op: Safety/security · Dependency criticality · Athlete value · Benchmark gap · Strategic differentiation · Evidence importance · Architecture leverage · Development effort · Risk · Validation burden. Toegepast kwalitatief (geen numerieke weegformule opgesteld — dat zou schijnprecisie suggereren voor een eenmansteam met wisselende beschikbaarheid). Resultaat per mastersprint: zie sectie 12 en `docs/ROADMAP_INDEX.json`.

**Herbeoordeling van eerdere prioriteiten:** `COMM-UI-001` (Commercial-UI) blijft P1 — bevestigd, want blokkeert Track 16 volledig en heeft een reële benchmark-parity-eis (elke onderzochte concurrent heeft een zichtbare upgrade-flow). Geen eerdere P1 is bij herbeoordeling gedegradeerd; wel zijn `GYM-RLS-SCOPING-001` en `DOC-HANDBOOK-001` bevestigd als de twee met de hoogste dependency-criticaliteit (ze blokkeren respectievelijk een hele track en de betrouwbaarheid van alle toekomstige Handbook-toetsing).

## 10. F0-F15 Fasering
Ongewijzigd qua namen t.o.v. de vorige versie; hieronder met mastersprint-toewijzing (sectie 12).

## 11. Epics (per track, samengevat — volledige mastersprints in sectie 12)
- **T1 Training Core:** Guided-Workout-convergentie-audit · flow-niveau testdekking Builder/Preview/Execution/History
- **T2 Exercise Intelligence:** flow-niveau testdekking catalogus/zoek/filter/detail
- **T4 Calculation Engine:** Strength-registry · Recovery-registry · Endurance/Ergometer-registry · formele Calculation & Evidence Specification
- **T7 Evidence & Provenance:** Evidence Registry-voltooiing · Data Quality & Confidence-laag
- **T8 AI Coach:** Output-contract · Explainability-laag · Coaching-modi · Program-generatie-sluitlus
- **T11 Wearables & Devices:** real-device-validatie (2×) · providerfeasibility-onderzoek
- **T15 Gym/Club/Team:** RLS-scoping (blocker) · tenant/locaties/staff-model
- **T16 Commercial:** plan-overzichtsscherm · entitlement-afdwinging · billing-lifecycle

## 12. Mastersprints (concreet, uitvoerbaar — NIET uitgevoerd)

### F1 — Foundation Closure
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F1-01 | Backup Table Cleanup | PLAT-BACKUP-CLEANUP-001 | P2 | S |
| MS-F1-02 | Observability Foundation | PLAT-OBSERVABILITY-001 | P2 | M |
| MS-F1-03 | Gym RLS Scoping | GYM-RLS-SCOPING-001 | **P1** | M |
| MS-F1-04 | Handbook Update H6/H9/H12 | DOC-HANDBOOK-001 | **P1** | L |
| MS-F1-05 | Point-in-time Docs Refresh | (DATABASE_STATUS/PLAY_STORE_READINESS/RELEASE_READINESS) | P2 | S |
| MS-F1-06 | Security Test Live Validation | PLAT-DELETE-001, SOC-GYMTEAM-001 | P3 | S |

### F2 — Athlete Core Excellence
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F2-01 | Commercial UI — Plan Overview Screen | COMM-UI-001 | **P1** | M |
| MS-F2-02 | Commercial UI — Entitlement Enforcement | COMM-UI-001 | P2 | M |
| MS-F2-03 | AI Output Contract Test | AI-OUTPUT-CONTRACT-001 | **P1** | M |
| MS-F2-04 | Training Core Flow-Level Test Coverage (Builder/Preview/Execution) | CAP-REGISTRY-SCREENS-001 | P2 | L |
| MS-F2-05 | Guided Workout Convergence Audit | T1 (geen aparte capability-ID, architectuuraudit) | P2 | M |
| MS-F2-06 | Exercise Intelligence Flow Tests | T2 | P3 | M |

### F3 — Calculation / Context / Evidence Excellence
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F3-01 | Calculation Registry — Strength (e1RM, volume, tonnage, relative load, RPE/RIR) | EVID-SCI-001 | **P1** | L |
| MS-F3-02 | Calculation Registry — Recovery (HRV, RHR, slaap, readiness) | EVID-SCI-001 | **P1** | L |
| MS-F3-03 | Calculation Registry — Endurance/Ergometer | EVID-SCI-001 | P2 | L |
| MS-F3-04 | Evidence Registry Completion (metric-voor-metric A-E) | EVID-SCI-001 | **P1** | L |
| MS-F3-05 | Data Quality & Confidence-laag | EVID-SCI-001 | P2 | M |
| MS-F3-06 | Decision Rule Registry-uitbreiding (corroboratiepatroon naar meer domeinen) | DEC-CORE-001 | P2 | M |
| MS-F3-07 | Formele Calculation & Evidence Specification (los document) | EVID-SCI-001 | P2 | M |

### F4 — Coach Intelligence
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F4-01 | AI Governance — Numerieke/diagnose-guardrails | AI-OUTPUT-CONTRACT-001 | **P1** | M |
| MS-F4-02 | AI Explainability-laag (waarom/welke metric/welke regel/confidence) | AI-OUTPUT-CONTRACT-001 | P2 | M |
| MS-F4-03 | Coaching-modi (dagelijks/workout/herstel/progressie/stagnatie/adherentie/event-prep) | AI-PROGRAM-AUTOGEN-001 | P2 | L |
| MS-F4-04 | Program-generatie gesloten lus v1 | AI-PROGRAM-AUTOGEN-001 | **P1** | L |
| MS-F4-05 | Program-adaptatie — wekelijks | AI-PROGRAM-AUTOGEN-001 | P2 | M |
| MS-F4-06 | Program-adaptatie — longitudinaal (benchmark t.o.v. Hevy Trainer) | AI-PROGRAM-AUTOGEN-001 | P2 | L |

### F5 — Connected Athlete
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F5-01 | Wearable Real-Device-validatie (Google Health) | DEV-WEARAUTH-001, DEV-WEARSYNC-001 | P2 | M |
| MS-F5-02 | Concept2 PM5 Real-Device-validatie | DEV-CONCEPT2-001 | P2 | M |
| MS-F5-03 | Health-platformfeasibility-onderzoek (Apple HealthKit, Health Connect) | NEW CAPABILITY | P3 | M (onderzoek, geen bouw) |
| MS-F5-04 | Wearable-providerfeasibility-onderzoek (Garmin/Polar/WHOOP/Suunto/COROS) | NEW CAPABILITY | P3 | M (onderzoek) |
| MS-F5-05 | Weather/Environment-roadmap formaliseren | bestaand `core/weather.js` | P3 | S |

### F6 — Endurance & Multisport Excellence
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F6-01 | Swimming-feasibility-assessment | NEW CAPABILITY | P4 | S (onderzoek) |
| MS-F6-02 | Critical speed/power + aerobic decoupling | NEW CAPABILITY | P3 | L |
| MS-F6-03 | Interval-executie flow-niveau UX-test | END-INTERVAL-001 | P3 | M |
| MS-F6-04 | HYROX/Triathlon rulebook jaarlijkse herverificatie | END-HYROX-001 | P2 | S (terugkerend) |
| MS-F6-05 | Race preparation & analysis-epic | END-HYROX-001 | P3 | L |

### F7 — Longitudinal Athlete Intelligence
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F7-01 | Relationship Engine flow-niveau UX-audit | T12 | P3 | M |
| MS-F7-02 | Performance Index-uitbreiding | T12 | P3 | M |
| MS-F7-03 | Correlatie-vs-causatie-boodschap-audit (UI-teksten) | T12 | P2 | S |

### F8 — Women's Performance (GEBLOKKEERD — elk item wacht op zijn eigen productbeslissing)
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F8-01 | Zwangerschap — implementatie na besluit | CTX-CYCLE-001 | P2 (na besluit) | M-L |
| MS-F8-02 | Postpartum — implementatie na besluit | CTX-CYCLE-001 | P2 (na besluit) | M-L |
| MS-F8-03 | Menopauze/perimenopauze — implementatie na besluit | CTX-CYCLE-001 | P2 (na besluit) | M-L |
| MS-F8-04 | Anticonceptie — implementatie na besluit | CTX-CYCLE-001 | P2 (na besluit) | M |
| MS-F8-05 | Bekkenbodem — implementatie na besluit | CTX-CYCLE-001 | P2 (na besluit) | M |

### F9 — Social & Community (bewust laag, P4)
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F9-01 | Social-architectuuronderzoek (privacy-model, geen bouw) | NEW CAPABILITY | P4 | S (onderzoek) |

*Verdere Social-mastersprints worden pas gedefinieerd ná een expliciete productbeslissing om deze track te bouwen — vooraf verder detailleren zou giswerk zijn.*

### F10 — Coach/PT Platform
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F10-01 | Coach-Relationship testdekking | COACH-RELATIONSHIP-001 | P3 | S |
| MS-F10-02 | Coach-dashboard MVP | NEW CAPABILITY | P2 | L |
| MS-F10-03 | Coach-programmering/toewijzing | NEW CAPABILITY | P3 | L |

### F11 — Gym/Club/Team Platform
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F11-01 | Tenant/locaties/staff-model (vereist MS-F1-03 eerst) | GYM-RLS-SCOPING-001 | P2 | L |
| MS-F11-02 | Team/groep-beheer-UI | NEW CAPABILITY | P3 | M |

### F12 — Commercial
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F12-01 | Entitlement-reconciliatie & billing-providerintegratie | COMM-UI-001 | P2 | L |
| MS-F12-02 | Subscription-lifecycle (upgrade/downgrade/cancel/restore) | COMM-UI-001 | P2 | L |

### F13 — Production & Scale
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F13-01 | Observability & error-tracking (uitbouw MS-F1-02) | PLAT-OBSERVABILITY-001 | P2 | M |
| MS-F13-02 | iOS-feasibility-onderzoek | NEW CAPABILITY | P4 | S (onderzoek) |
| MS-F13-03 | Backup/retentiebeleid formaliseren | NEW CAPABILITY | P3 | S |

### F14 — Scientific Platform
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F14-01 | Consent- & governancemodel | SCI-CONSENT-001 | P4 | M |
| MS-F14-02 | Research-exportpijplijn | SCI-CONSENT-001 | P4 | L |

### F15 — Beyond Benchmark
| ID | Naam | Capability | Priority | Complexity |
|---|---|---|---|---|
| MS-F15-01 | Evidence-transparantie als positionering (benutten, niet herbouwen) | EVID-SCI-001 | P3 | S |

**Totaal: 57 mastersprints**, gedekt in `docs/ROADMAP_INDEX.json` met volledige velden (dependencies, validation-vereisten, acceptance-gates).

## 13. Validation Gates
Per mastersprint in `docs/ROADMAP_INDEX.json`: `validation.software` (altijd REQUIRED), `validation.database`/`integration`/`device`/`scientific` (AS_APPLICABLE, per mastersprint bepaald).

## 14. Scientific/Evidence Gates
MS-F3-01 t/m MS-F3-07 mogen niet CLOSED worden zonder dat elke behandelde metric een evidence-level (A-E) én bronvermelding heeft — dit is de kern van T7 en mag niet informeel worden afgevinkt.

## 15. Device Gates
MS-F5-01/02 vereisen een daadwerkelijke, niet-gesimuleerde device-sessie (Concept2 PM5 fysiek aanwezig, Google Health-account met echte historische data) vóór VALIDATED.

## 16. Security/Privacy Gates
Elke mastersprint die RLS, Netlify Functions, of persoonsgegevens raakt (met name MS-F1-03, MS-F11-01, MS-F14-01) doorloopt dezelfde P0-closure-discipline: read-only audit eerst, kleinste-veilige-fix-principe, regressietest verplicht vóór CLOSED.

## 17. Product Decision Gates
- **F8 volledig geblokkeerd** tot de 5 Women's Performance-besluiten er zijn.
- **F9 (Social)** geblokkeerd tot een expliciete productbeslissing om deze track te bouwen (nu bewust P4/laag).
- **T14/T16 UI-omvang** (hoeveel Coach/PT- en Commercial-functionaliteit) is uiteindelijk een productbeslissing van Maurice, niet alleen een technische — deze roadmap plant de technische stappen, niet de commerciële scope-keuze zelf.

## 18. Deferred Work
MS-F5-03/04 (providerfeasibility), MS-F6-01 (swimming), MS-F9-01-en-verder (social), MS-F13-02 (iOS) — bewust onderzoeks-eerst, bouw-later.

## 19. Beyond Benchmark
MS-F15-01: de wetenschappelijk onderbouwde "evidence-transparantie t.o.v. black-box-concurrenten"-positionering (zie Benchmark Registry) is al een reëel differentiatiepunt zonder dat er nieuwe code voor nodig is — vooral een communicatie-/positioneringsvraagstuk.

## 20. Definition of Roadmap Completion
Deze roadmap is "compleet" (niet: "uitgevoerd") wanneer, zoals nu het geval is: (1) elke capability uit de registry een classificatie en mastersprint-bestemming heeft (bevestigd, `docs/ROADMAP_COVERAGE_AUDIT.md`), (2) elke P0/P1 een mastersprint heeft (bevestigd, zie sectie 12 — 9 P1-mastersprints, allemaal met mastersprint), (3) `docs/ROADMAP_INDEX.json` valide is en 0 orphan-IDs/dependencies heeft (geverifieerd via `tools/check-doc-consistency.js`).
