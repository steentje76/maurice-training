# TRAININGSKOMPAS_MASTER_ROADMAP.md — 2.0 v1.1 (CANONICAL)

**Bron:** `TRAININGSKOMPAS_MASTER_ROADMAP_2.0_v1.1_FINAL.docx` (Product Owner + ChatGPT-productarchitectuur, geconsolideerd met Claude's technische PR #68).
**Autoriteitsmodel:** dit document is vanaf nu de **productstrategische autoriteit** voor Roadmap 2.0 (tracks, fasering, prioriteiten, epics, mastersprint-sequencing). De repository (code/DB/tests) blijft de **technische autoriteit** voor wat daadwerkelijk bestaat/getest/geïntegreerd/gevalideerd is. Zie `docs/DOCUMENTATION_GOVERNANCE.md`.
**Canonicalisatiedatum:** 28 augustus 2026, tegen `main` @ `59b99c428577abc5cfbf9fe61a9f85dfe5e8fbd8`.
**Migratie:** alle 57 mastersprint-IDs uit PR #68 zijn getraceerd naar deze v1.1-structuur — zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md` (0 zoekgeraakt).

---

## 1. Executive Summary
Trainingskompas wordt niet ontwikkeld als een verzameling losse features, maar als één traceerbaar trainingsplatform waarin ruwe data, deterministische berekeningen, context, expliciete beslisregels, wetenschappelijke evidence en AI-uitleg in een vaste keten samenwerken. De huidige softwarebasis is relatief volwassen in Training Core, Calculation, Context, Decision, Recovery en security/release-governance (bevestigd door PR #64-68). De grootste strategische kans ligt niet in zo snel mogelijk meer schermen bouwen, maar in het verdiepen van de kern: betrouwbare berekeningen, evidence, explainability, athlete intelligence en uitzonderlijk goede trainingsuitvoering. Coach, Gym, Commercial, Social en Scientific worden daarna bovenop dezelfde kern gebouwd.

## 2. Bron- en bewijsmodel
| Bron | Rol | Autoriteit |
|---|---|---|
| GitHub current state / code | Wat aantoonbaar bestaat | Hoog voor softwarestatus |
| Live DB / RLS-verificatie | Wat aantoonbaar in schema/policies bestaat | Hoog voor datalaag |
| Automatische tests / CI | Wat reproduceerbaar getest is | Hoog voor teststatus |
| Capability Registry | Samenvatting van geverifieerde capabilities | Afgeleid; moet met code synchroon blijven |
| Gap Analysis V2 | Actuele bekende gaps | Afgeleid; prioriteit mag door deze roadmap worden herijkt |
| Benchmark Registry | Concurrentie-/UX-referentie | Ondersteunend, periodiek herverifiëren |
| Calculation & Evidence Specification | Normatief voor berekening/evidence | Hoog zodra metric-level gevuld |
| Productbesluiten | Gewenste richting | Hoog voor scope/UX |
| AI | Interpretatie en communicatie | Nooit bron van numerieke waarheid |

## 3. Niet-onderhandelbare architectuur
**RAW DATA → NORMALIZATION/DATA QUALITY → CALCULATION → CONTEXT → DECISION/RULES → EVIDENCE/PROVENANCE → AI COACH → ATHLETE UX**
Calculation Engine is deterministisch, reproduceerbaar, versioneerbaar en rekent — AI niet. Decision Engine bevat expliciete sportlogica, geen verborgen AI-regelvorming. Evidence/Provenance legt vast waar metric, regel, bron, versie, confidence en beperkingen vandaan komen. AI Coach mag samenvatten, combineren, contextualiseren, uitleggen en aanbevelingen formuleren binnen regels; niet herberekenen, ontbrekende data verzinnen of diagnoses stellen. CODE VERIFIED tegen `main`: zie `docs/TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md` §5 (AI Coach Governance-matrix).

## 4. Productprincipes
Elke uitbreiding naar Coach/Gym/Research hergebruikt dezelfde engine; geen tweede productkern. Exercise-specific stagnation/progression krijgt voorkeur boven een botte globale load/deload-trigger. Geen paywall/billing alleen omdat tabellen al bestaan. Geen black-box readinessscore zonder componenten/confidence.

## 5. Maturity & closure model
NOT STARTED → IMPLEMENTED → TESTED → INTEGRATED → VALIDATED → CLOSED. Geen maturity-upgrade zonder passend bewijs (code/DB/test/device/scientific, per capability).

## 6. Strategische producttracks (T1-T18)
| Track | Naam |
|---|---|
| T1 | Training Core |
| T2 | Exercise Intelligence |
| T3 | Endurance & Multisport |
| T4 | Calculation Engine |
| T5 | Context Engine |
| T6 | Decision & Rules Engine |
| T7 | Evidence & Provenance |
| T8 | AI Coach |
| T9 | Recovery & Health Context |
| T10 | Women's Performance |
| T11 | Wearables & Devices |
| T12 | Analytics & Athlete Intelligence |
| T13 | Social & Community |
| T14 | Coach/PT Platform |
| T15 | Gym/Club/Team Platform |
| T16 | Commercial & Entitlements |
| T17 | Platform / Production / Security |
| T18 | Scientific Platform |

## 7. Doelarchitectuur per productlaag
**Athlete Layer:** Home/Dashboard, Training, Progress, Body/Recovery, Coach, Profile — één persoonlijke trainingscockpit. **Intelligence Layer:** Calculation+Context+Decision+Evidence+AI = explainable athlete intelligence, geen losstaande 'AI-feature'. **Connected Layer:** wearables/health platforms/machines/weather met provenance en duplicate-safe sync. **Professional Layer:** Coach/PT en Gym/Club/Team gebruiken dezelfde athlete engine met expliciete consent/RBAC/tenant-isolatie. **Commercial Layer:** entitlements centraal afgedwongen; UI volgt pas na tiers/waardepropositie. **Scientific Layer:** research is een expliciete consent-/governancelaag bovenop reproduceerbare calculations/evidence, nooit een neveneffect.

## 8. Prioriteringsmodel
Elke epic beoordeeld op: safety/security, dependency criticality, athlete value, benchmark gap, strategic differentiation, evidence importance, architecture leverage, effort, risk, validation burden. P0=veiligheid/privacy/dataverlies/release-integriteit. P1=kernwaarde of harde dependency met hoge impact. P2=grote verbetering/schaalbaarheid. P3=optimalisatie/verbreding. P4=lange termijn/research/deferred.

**Definitieve prioriteitscorrecties (§30 van v1.1, overgenomen als productbeslissing, niet zelfstandig teruggedraaid):**
- GYM-RLS-SCOPING blijft P1, eerste F1-uitvoering (veiligheid + harde dependency).
- Observability vóór grootschalige nieuwe productlagen.
- **Commercial UI is geen vroege P1** — schema/benchmark-pariteit is onvoldoende reden vóór athlete core/intelligence. COMM-UI-001: P1→**P2**, F2→**F12**.
- AI Output Contract blijft P1 (AI is al actief), maar ná Calculation/Context/Decision/Evidence-contracten.
- Calculation/Evidence breder dan de oorspronkelijke 3 domeinen: training load/progression, energy estimates, context taxonomy en provenance zijn first-class.
- Training Core Excellence vóór diepe AI/commercial-expansie, op echte athlete-flowkwaliteit.
- Exercise-specific stagnation/progression eerder dan globale strain/deload-signalen.
- Social blijft deferred tot koersbesluit; Scientific blijft lange termijn, reproducibility wel al voorbereid in de kern.

## 9. Fasering F0-F15
| Phase | Naam | Status |
|---|---|---|
| F0 | Verified Baseline | **CLOSED** |
| F1 | Foundation Closure | **NEXT/CURRENT** |
| F2 | Athlete Core Excellence | PLANNED |
| F3 | Calculation/Context/Evidence Excellence | PLANNED |
| F4 | Coach Intelligence | PLANNED |
| F5 | Connected Athlete | PLANNED |
| F6 | Endurance & Multisport Excellence | PLANNED |
| F7 | Longitudinal Athlete Intelligence | PLANNED |
| F8 | Women's Performance | DECISION-GATED |
| F9 | Social & Community | DEFERRED |
| F10 | Coach/PT Platform | PLANNED |
| F11 | Gym/Club/Team Platform | DEPENDENCY-GATED (vereist F1 RLS-closure) |
| F12 | Commercial | PLANNED (na tier/waarde-besluiten) |
| F13 | Production & Scale | CONTINUOUS |
| F14 | Scientific Platform | LONG TERM |
| F15 | Beyond Benchmark | CONTINUOUS |

## 10. Critical dependency graph
```
Identity → Athlete Profile → Training Definition → Preview → Execution → Logging → History → Analytics → Coaching
Raw Data → Normalization → Calculation → Context → Decision → Evidence/Provenance → AI → UX
Calculation Registry → Data Quality/Confidence → Decision Rule Registry → Explainability → Adaptive Coaching
Identity → Privacy/Consent → Connections → Social/Community
Identity → RBAC → Organization Membership/RLS → Coach/Gym workflows → Licenses
Entitlement model → Feature gates → Commercial UI → Billing → Reconciliation
Provider feasibility → Connector → Canonical mapping → Sync/idempotency → Validation → Athlete-facing use
Evidence/Provenance → Research consent → Scientific export → Reproducibility
```
**Harde regel:** Track 15 (Gym/Club/Team) mag niet starten met echte multi-tenant-data vóór GYM-RLS-SCOPING-001 (MS-F1-01) gesloten is.

## 11. Epic portfolio
51 epics (E1.1–E18.3), elk gekoppeld aan een track/phase/priority/mastersprint. Volledige lijst: zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md` en `docs/ROADMAP_INDEX.json` (elk mastersprint-item draagt zijn epic-ID('s) in het `epics`-veld).

## 12. Mastersprint execution map
**75 canonieke v1.1-mastersprints + 4 supplementaire IDs** (geldige inhoud uit PR #68 zonder v1.1-equivalent: MS-F3-11, MS-F4-06, MS-F6-06, MS-F13-06) = **79 mastersprints totaal**, volledig machine-leesbaar in `docs/ROADMAP_INDEX.json`. Zie dat bestand voor phase/priority/tracks/capabilities/dependencies/acceptance_gate/validation per sprint.

## 13. Definitieve eerste 20 mastersprints (dependency-gevalideerd)
| # | Sprint | Naam | Prio | Waarom |
|---|---|---|---|---|
| 1 | MS-F1-01 | Multi-tenant RLS Security Closure | P1 | Security/dependency; blokkeert echte Coach/Gym-data (was: oude repo-ID MS-F1-03) |
| 2 | MS-F1-02 | Observability Foundation | P1 | Operational visibility vóór verdere productgroei |
| 3 | MS-F1-03 | Secrets & Configuration Hygiene | P1 | Security hygiëne vóór verdere externe/AI-integraties |
| 4 | MS-F1-04 | Normative Documentation Sync | P2 | Normatieve instructies synchroon; geen productfeature |
| 5 | MS-F2-01 | Canonical Training Start & Preview | P1 | Dagelijkse kernflow; hoge architectuurleverage |
| 6 | MS-F2-02 | Execution Reliability & Persistence | P1 | Logging is de primaire producttransactie |
| 7 | MS-F2-03 | Workout Builder & My Trainings | P1 | Voltooit Training maken → Builder → reuse-keten |
| 8 | MS-F2-04 | Exercise Library UX Excellence | P1 | Verlaagt frictie in vrijwel elke krachttraining |
| 9 | MS-F2-06 | Onboarding & Athlete Goal Intake | P1 | Betere context/personalisatie vanaf dag één |
| 10 | MS-F2-07 | Home/Dashboard Actionability | P1 | Maakt bestaande intelligence dagelijks bruikbaar |
| 11 | MS-F2-08 | Athlete Core UX Benchmark Pass | P1 | Meet flowkwaliteit vóór intelligentielaag verdiept |
| 12 | MS-F3-01 | Strength Calculation Registry | P1 | Start metric-level source of truth |
| 13 | MS-F3-02 | Load & Progression Calculation Registry | P1 | Basis voor stagnatie/adaptatie |
| 14 | MS-F3-03 | Recovery Calculation Registry | P1 | Basis voor traceerbare readiness |
| 15 | MS-F3-06 | Context Taxonomy & Contract | P1 | Voorkomt contextwildgroei |
| 16 | MS-F3-08 | Data Quality & Confidence Layer | P1 | Vereist vóór geavanceerde decision/AI-claims |
| 17 | MS-F3-07 | Decision Rule Registry | P1 | Versioneerbare regels, insufficient-data-gedrag |
| 18 | MS-F3-09 | Evidence Registry Metric Audit | P1 | A-E per metric/rule; bronnen/limitaties |
| 19 | MS-F3-10 | Explainability & Provenance Contract | P1 | End-to-end trace van bron tot advies |
| 20 | MS-F4-01 | AI Output Contract & Guardrails | P1 | Nu pas verdere AI-adaptatie; geen invented numerics/diagnose |

**ORDER CONFLICT-check:** 0 gevonden. De volgorde is dependency-consistent (RLS/observability/secrets/docs eerst, dan Athlete Core, dan Calculation→Context→Decision→Evidence, AI Output Contract pas na Evidence/Provenance). Zie `docs/ROADMAP_INDEX.json` voor de expliciete `dependencies`-array per item.

**Interne inconsistentie in het brondocument, opgelost:** v1.1 §31 gebruikte op meerdere plekken oude PR#68-repo-IDs (MS-F1-03, MS-F3-04/05/06) als shorthand voor sprints die in v1.1 §12 een ander ID-nummer kregen (MS-F1-01, MS-F3-09/08/07). Bovenstaande tabel gebruikt overal de v1.1 §12-nummering (de systematische, complete execution map) als canoniek. Zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md` voor de volledige toelichting.

## 14. Calculation & Evidence Specification-roadmap
Verplicht eindresultaat per calculation: unique ID, domain, name, formula/algorithm, algorithm version, inputs, outputs, units, supported sports, minimum data, data quality, confidence, evidence level A-E, scientific sources, limitations, applicability, forbidden interpretations, allowed Decision Rules, AI permissions, athlete-visible values. Gedekt door MS-F3-01 t/m MS-F3-05 (per domein) + MS-F3-09 (metric-audit) + MS-F3-11 (formeel specificatiedocument). Geen globale "Evidence complete"-status toegestaan zolang metric-voor-metric coverage ontbreekt.

## 15. Decision Engine-roadmap
Decision Rule Registry (MS-F3-07): rule IDs, versions, inputs, outputs, thresholds, forbidden use. Harde grenzen: HRV mag nooit zelfstandig een rustdag bepalen of overtraining vaststellen; ACWR mag nooit een harde blessurevoorspeller of universele veilige zone zijn. Multi-signal corroboration (DEC-036-patroon) blijft de norm.

## 16. AI Coach-roadmap
AI blijft interpreter/communicator, nooit calculator/source of truth. MS-F4-01 (Output Contract & Guardrails) → MS-F4-02 (Explainable Daily Coach) → MS-F4-03 (Exercise-specific Progression Coach) → MS-F4-04 (Adaptive Weekly Program Loop) → MS-F4-05 (Schedule & Missed-workout Adaptation). AI-programgeneratie mag niet vóór de Calculation→Context→Decision→Evidence-dependencies (zie `docs/ROADMAP_INDEX.json` dependencies van MS-F4-04).

## 17. Connected Athlete-roadmap
Provider feasibility → Connector/Adapter → Auth/Consent → Raw+Provenance → Canonical Mapping → Units/Time Normalization → Duplicate Prevention → Sync/Idempotency → Calculation Integration → Decision/Context Integration → Athlete UX → Real Device Validation. Providertracks: Android Health Connect, Apple HealthKit, Garmin, Polar, WHOOP, Suunto, COROS, Strava, TrainingPeaks, Concept2, Technogym, EGYM. Niet elke provider is technisch even toegankelijk — feasibility eerst (MS-F5-01, MS-F5-04, MS-F5-05, MS-F11-04).

## 18. UX-roadmap & benchmarkbeleid
MS-F2-08 (Athlete Core UX Benchmark Pass): flow/taps/errors/empty/loading gebenchmarkt tegen leidende apps (zie `docs/BENCHMARK_REGISTRY.md`). Geen redesign in deze sprint uitgevoerd — alleen gepland.

## 19. Women's Performance decision gate
F8 blijft decision-gated. 5 open besluiten (zwangerschap, postpartum, menopauze/perimenopauze, anticonceptie, bekkenbodem) blokkeren MS-F8-03/04. Geen implementatie vóór besluit. Optionele performance-context, geen medische diagnose-/period-trackerfunctie. Privacy/consent (MS-F8-02) is harde dependency vóór MS-F8-03/04.

## 20. Coach, Gym en Commercial sequencing
`Identity → Consent → RBAC → Membership-scoped RLS → Coach Relationship → Coach Dashboard → Programming → Organization → Locations → Staff → Members → Teams/Groups → Gym Programming → Equipment → Analytics → Licensing`. Geen echte multi-tenant Gym-data vóór RLS-scoping (MS-F1-01) gesloten is. Commercial: `Tier/value proposition → Entitlement Domain Model → Entitlement Enforcement → Commercial UX → Billing/Reconciliation` (MS-F12-01→02→03→04).

## 21. Scientific Platform
Lange termijn: research consent/withdrawal, pseudonymization, data minimization, dataset definitions, calculation/evidence versions, reproducible export, cohorts, governance, researcher access. Gewone productconsent is niet automatisch researchconsent (MS-F14-01 is een aparte, expliciete consent-laag).

## 22. Validation gates per mastersprint
8 dimensies (zie `docs/ROADMAP_INDEX.json` `validation`-object per item): software (altijd bij codewijziging), database (schema/RLS/data-impact), integration (cross-module/provider), device (hardware/wearable), UX (athlete-facing flow), scientific (calculation/rule/claim), privacy/security (sensitive/multi-user), documentation (iedere closure).

## 23. Definition of Done voor een mastersprint
Scope/out-of-scope vooraf expliciet · geen maturity-upgrade zonder bewijs · acceptance criteria aantoonbaar behaald · tests toegevoegd of gemotiveerd waarom niet · DB/integration/device/UX/scientific gates uitgevoerd waar van toepassing · Capability Registry en relevante specs bijgewerkt · Decision/Evidence IDs gekoppeld bij sportlogica-wijziging · geen open P0 veroorzaakt · release/CI groen · post-merge verificatie op actuele main.

## 24. Open product decisions
| Decision | Wanneer nodig | Blokkeert |
|---|---|---|
| Women's Performance: zwangerschap/postpartum/menopauze | Vóór F8 life-stage build | MS-F8-04 |
| Women's Performance: anticonceptie | Vóór F8 contextmodel | MS-F8-03/04 |
| Women's Performance: bekkenbodem | Vóór F8-scope | MS-F8-04 |
| Commercial tiers & concrete pricing | Vóór F12 UX/billing | MS-F12-01+ |
| Social koers/prioriteit | Vóór F9 | F9 |
| iOS timing | Vóór Apple HealthKit-implementatie | MS-F5-04-vervolg (MS-F13-06) |
| Research operating model | Vóór F14 access/export | MS-F14-01+ |

## 25. Wat bewust NIET vroeg wordt gebouwd
Paywall/billing alleen omdat tabellen al bestaan · social feed vóór identity/privacy/moderation · Gym real-data-workflows vóór membership-scoped RLS · AI-adaptatie vóór Calculation/Context/Decision/Evidence-contracten sterk genoeg zijn · nieuwe deviceconnector zonder officiële feasibility en concrete athlete value · black-box readinessscore zonder componenten/confidence · research-export zonder research-consent en reproducibility.

## 26. Roadmap governance
Deze roadmap is het productplan; de repository is de waarheid over de huidige implementatie. Technische cross-audit mag status/effort/dependency/risico betwisten met bewijs, maar productprioriteit of -richting niet stilzwijgend herschrijven — zie `docs/DOCUMENTATION_GOVERNANCE.md`. Na iedere mastersprint: CURRENT_STATE, Capability Registry, Roadmap Index en relevante Calculation/Evidence/Decision-documenten bijwerken.

## 27-29. Technical cross-audit — samenvatting
Technische bron: PR #68 / `main` @ `59b99c428577abc5cfbf9fe61a9f85dfe5e8fbd8`, v4.69.0. Resultaat destijds: 24/24 capabilities gemapt, 57 mastersprints, 73 index-entries, 0 orphans, 11/11 checks groen — sterke technische traceability, maar "100% completeness" betekende uitsluitend 100% dekking van de tóén bestaande Capability Registry, niet van de gewenste producttoekomst (zie de vier-dimensionale correctie in `docs/ROADMAP_COVERAGE_AUDIT.md` §"Belangrijke correctie").

## 30. Definitieve prioriteitscorrecties
Zie sectie 8 hierboven — letterlijk overgenomen uit v1.1, niet zelfstandig gewijzigd.

## 31. Definitieve eerste 20 mastersprints
Zie sectie 13 hierboven (met technische dependency-validatie toegevoegd).

## 32. Herfasering van Commercial
**Besluit (overgenomen, niet technisch tegengesproken):** COMM-UI-001 is P2/F12, niet P1/F2. Volgorde: tier/waardepropositie + entitlement domain model (MS-F12-01) → entitlement enforcement (MS-F12-02) → plan/upgrade-UX (MS-F12-03) → billing/reconciliation (MS-F12-04). Gym/Coach-licenties bouwen voort op dezelfde entitlementlaag.

## 33. Uitgebreide Calculation/Context/Decision/Evidence closure
Zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md` F3-sectie en `docs/ROADMAP_INDEX.json` MS-F3-*-items voor de volledige, verplichte resultaten per werkstroom (Strength/Load & Progression/Recovery/Endurance & Erg/Energy/Context/Decision/Evidence/Confidence/Provenance).

## 34. Canonicalization plan naar GitHub — UITGEVOERD
Deze sprint (zie PR-nummer in `docs/00_Project_Management/CURRENT_STATE.md`) heeft: (1) current main als baseline gebruikt en heraudit gedaan sinds SHA 59b99c, (2) bestaande MS-ID's behouden waar semantisch gelijk, nieuwe IDs gemaakt voor v1.1-toevoegingen (zie migratiematrix), (3) COMM-UI uit vroege F2-prioriteit verplaatst naar Commercial F12, (4) ontbrekende Athlete Core/Context/Load-Progression/Provenance/Offline-Sync/Accessibility/dashboard-sprints toegevoegd, (5) ROADMAP_INDEX.json en consistency checks aangepast, geen productcodewijzigingen, (6) geen technische conflicts gevonden die productprioriteit zouden dwingen terug te draaien (alleen het interne v1.1-ID-naamgevingsconflict, opgelost ten gunste van de systematische sectie-12-nummering).

## 35. Final Roadmap Decision
**MASTER ROADMAP 2.0 v1.1 = CANONICAL SOURCE OF TRUTH.** Zie het finale canonicalisatierapport voor volledige validatiestatus.
