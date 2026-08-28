# ROADMAP_V1_1_MIGRATION_MATRIX.md

**Doel:** elke van de 57 mastersprint-IDs uit PR #68 traceerbaar koppelen aan de nieuwe canonieke v1.1-structuur (75 mastersprints uit v1.1 sectie 12, + 4 supplementaire IDs voor geldige inhoud die niet expliciet in v1.1's kernlijst staat). Geen enkele ID wordt zonder reden weggegooid.

**Belangrijke opmerking over interne inconsistentie in v1.1 zelf (TECHNICAL CONFLICT, opgelost):** het v1.1-document bevat op twee plekken een andere naam voor dezelfde ID-string. Sectie 12 ("Mastersprint execution map") definieert `MS-F1-01` = "Multi-tenant RLS Security Closure" en `MS-F1-03` = "Secrets & Configuration Hygiene"; sectie 31 ("Definitieve eerste 20") gebruikt echter `MS-F1-03` voor "Gym RLS Scoping" (de oude repo-naam/ID). Hetzelfde patroon doet zich voor bij `MS-F3-04/05/06` (sectie 31 gebruikt de oude repo-IDs voor Evidence/Data Quality/Decision Rule, terwijl sectie 12 deze als `MS-F3-09/08/07` nummert). **Resolutie:** sectie 12 (de systematische, volledige execution map met phase/prio/epic/outcome per item) is aangehouden als canonieke ID-bron; sectie 31 is behandeld als prioriteitsvolgorde op inhoud, niet als ID-herdefinitie. Dit is geen productbeslissing die is teruggedraaid — het is een interne naamgevingsinconsistentie in het aangeleverde document zelf, opgelost ten gunste van de meest systematische bron.

---

## F1 — Foundation Closure

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F1-01 (Backup Table Cleanup) | MS-F1-05 (Backup & Retention Decision) | MERGE | Zelfde onderwerp, v1.1 consolideert backup-werk in één F1-sprint |
| MS-F1-02 (Observability Foundation) | MS-F1-02 (Observability Foundation) | KEEP | Identieke naam en inhoud |
| MS-F1-03 (Gym RLS Scoping) | **MS-F1-01** (Multi-tenant RLS Security Closure) | RENAME | Semantisch identiek; v1.1 hernummert naar F1-01 (zie TECHNICAL CONFLICT-opmerking hierboven) |
| MS-F1-04 (Handbook Update H6/H9/H12) | MS-F1-04 (Normative Documentation Sync) | MERGE + CHANGE_PRIORITY | Zelfde ID-nummer, inhoud verbreed naar alle normatieve documentatie; **P1 → P2** conform v1.1 §29 ("documentatie is geen vervanging voor productwaarde") |
| MS-F1-05 (Point-in-time Docs Refresh) | MS-F1-04 (Normative Documentation Sync) | MERGE | Opgenomen in dezelfde bredere documentatiesync-sprint |
| MS-F1-06 (Security Test Live Validation) | MS-F13-05 (Privacy & Security Recertification) | MOVE_PHASE (F1→F13) | v1.1 plaatst periodieke security-herverificatie in F13, niet als eenmalige F1-actie |
| — | **MS-F1-03** (Secrets & Configuration Hygiene) | NEW | Geen oud equivalent; nieuwe v1.1-sprint |

## F2 — Athlete Core Excellence (volledig herbestemd; oude F2 ging over Commercial/AI/tests)

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F2-01 (Commercial UI — Plan Overview) | MS-F12-03 (Commercial UX) | RENAME + MOVE_PHASE (F2→F12) + CHANGE_PRIORITY (P1→P2) | v1.1 §32: Commercial UI is geen vroege F2-feature |
| MS-F2-02 (Commercial UI — Entitlement Enforcement) | MS-F12-02 (Entitlement Enforcement) | RENAME + MOVE_PHASE (F2→F12) | Prioriteit blijft P1 binnen F12 (enforcement zelf is kernwaarde, UI niet) |
| MS-F2-03 (AI Output Contract Test) | MS-F4-01 (AI Output Contract & Guardrails) | RENAME + MOVE_PHASE (F2→F4) | v1.1 §31 noemt expliciet "MS-F2-03 / MS-F4-01" als dezelfde sprint; AI-governance hoort na Calculation/Context/Decision/Evidence |
| MS-F2-04 (Training Core Flow-Level Test Coverage) | MS-F2-01 + MS-F2-02 + MS-F2-03 (v1.1: Canonical Start & Preview / Execution Reliability / Workout Builder) | SPLIT | v1.1 breidt de oude, compacte testaudit uit naar drie volwaardige UX/reliability-mastersprints |
| MS-F2-05 (Guided Workout Convergence Audit) | MS-F2-01 (Canonical Training Start & Preview) | MERGE | Convergentie-audit is exact het doel van deze v1.1-sprint |
| MS-F2-06 (Exercise Intelligence Flow Tests) | MS-F2-04 (Exercise Library UX Excellence) | RENAME + CHANGE_PRIORITY (P3→P1) | v1.1 verheft dit van een testaudit naar volwaardige UX-excellentie-sprint |
| — | MS-F2-05 t/m MS-F2-08 (v1.1): History/Calendar/Scheduling, Onboarding & Goal Intake, Home/Dashboard Actionability, Athlete Core UX Benchmark Pass | NEW (4×) | Geen oud equivalent — kernuitbreiding van v1.1 |

## F3 — Calculation / Context / Evidence Excellence

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F3-01 (Calc Registry — Strength) | MS-F3-01 (Strength Calculation Registry) | KEEP | Identiek |
| MS-F3-02 (Calc Registry — Recovery) | MS-F3-03 (Recovery Calculation Registry) | RENAME | v1.1 nummert Recovery als F3-03 |
| MS-F3-03 (Calc Registry — Endurance/Erg) | MS-F3-04 (Endurance & Erg Calculation Registry) | RENAME | v1.1 nummert dit als F3-04 |
| MS-F3-04 (Evidence Registry Completion) | MS-F3-09 (Evidence Registry Metric Audit) | RENAME | Zie TECHNICAL CONFLICT-opmerking — sectie 12 nummert dit F3-09 |
| MS-F3-05 (Data Quality & Confidence-laag) | MS-F3-08 (Data Quality & Confidence Layer) | RENAME | Zie TECHNICAL CONFLICT-opmerking |
| MS-F3-06 (Decision Rule Registry-uitbreiding) | MS-F3-07 (Decision Rule Registry) | RENAME | Zie TECHNICAL CONFLICT-opmerking |
| MS-F3-07 (Formele Calculation & Evidence Specification) | **MS-F3-11** | RENAME (supplementair) | Blijft geldig als documentdeliverable, maar het ID-nummer F3-07 is nu bezet door Decision Rule Registry; nieuw, niet-botsend ID toegekend |
| — | MS-F3-02 (v1.1: Load & Progression), MS-F3-05 (Energy & Estimate), MS-F3-06 (Context Taxonomy), MS-F3-10 (Explainability & Provenance) | NEW (4×) | Geen oud equivalent |

## F4 — Coach Intelligence

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F4-01 (AI Governance — guardrails) | MS-F4-01 (AI Output Contract & Guardrails) | MERGE | Zelfde ID, inhoud samengevoegd met oude MS-F2-03 |
| MS-F4-02 (AI Explainability-laag) | MS-F4-02 (Explainable Daily Coach) | RENAME | Zelfde ID-nummer, content verbreed |
| MS-F4-03 (Coaching-modi) | MS-F4-02 (Explainable Daily Coach) + MS-F4-03 (v1.1: Exercise-specific Progression Coach) | SPLIT | Dagelijkse/workout-modi → F4-02; oefening-specifieke progressie → nieuw F4-03 |
| MS-F4-04 (Program-generatie gesloten lus v1) | MS-F4-04 (Adaptive Weekly Program Loop) | RENAME | Zelfde ID, content bevestigd |
| MS-F4-05 (Program-adaptatie — wekelijks) | MS-F4-04 (Adaptive Weekly Program Loop) | MERGE | Duplicaat van bovenstaande |
| MS-F4-06 (Program-adaptatie — longitudinaal, Hevy-benchmark) | **MS-F4-06** (Longitudinal Program Adaptation & Benchmark Tracking) | RENAME (supplementair) | v1.1's F4 stopt bij F4-05 (Schedule/Missed-workout); longitudinale benchmark-tracking blijft geldig als aanvullende, niet-botsende sprint |
| — | MS-F4-05 (v1.1: Schedule & Missed-workout Adaptation) | NEW | Geen oud equivalent |

## F5 — Connected Athlete

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F5-01 (Wearable Real-Device — Google Health) | MS-F5-03 (Android Health Connect Production Path) | RENAME | Google Health/Android Health Connect is hetzelfde ecosysteem |
| MS-F5-02 (Concept2 PM5 Real-Device) | MS-F5-02 (Concept2 PM5 Real-device Validation) | KEEP | Identiek |
| MS-F5-03 (Health-platformfeasibility Apple/Health Connect) | MS-F5-04 (Apple HealthKit Architecture) | RENAME | Health Connect-deel al gedekt door F5-03 hierboven |
| MS-F5-04 (Wearable-providerfeasibility) | MS-F5-05 (Wearable Provider Feasibility Matrix) | RENAME | Identieke scope |
| MS-F5-05 (Weather/Environment formaliseren) | MS-F5-06 (Weather & Environment Context) | RENAME | Identieke scope |
| — | MS-F5-01 (v1.1: Provider Integration Contract) | NEW | Nieuw, generiek adapter-raamwerk dat aan alle providersprints voorafgaat |

## F6 — Endurance & Multisport Excellence

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F6-01 (Swimming-feasibility) | **MS-F6-06** | RENAME (supplementair) | Niet in v1.1's kern-5 (Running/Cycling/Rowing/HYROX/Triathlon); blijft geldig als apart onderzoek, laagste prioriteit (P4) |
| MS-F6-02 (Critical speed/power + decoupling) | MS-F6-01/02/03 (v1.1: Running/Cycling/Rowing Intelligence) | SPLIT | v1.1 verdeelt CS/CP/decoupling per sport i.p.v. één generieke sprint |
| MS-F6-03 (Interval-executie flow-test) | MS-F6-01/02/03 (v1.1) | MERGE | Executie-UX zit in elke sportspecifieke sprint |
| MS-F6-04 (HYROX/Triathlon rulebook-herverificatie) | MS-F6-04 (HYROX Excellence) | RENAME | Zelfde ID-nummer, rulebook-revalidatie expliciet in closure outcome |
| MS-F6-05 (Race preparation & analysis) | MS-F6-04 (HYROX Excellence) + MS-F6-05 (v1.1: Triathlon & Brick Workflows) | SPLIT | Race prep/executie/analyse geldt voor beide sporten |

## F7 — Longitudinal Athlete Intelligence

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F7-01 (Relationship Engine UX-audit) | MS-F7-04 (Relationship Intelligence) | RENAME | v1.1 nummert dit als F7-04 |
| MS-F7-02 (Performance Index-uitbreiding) | MS-F7-01 (Athlete Trend Model) | MERGE | Onderdeel van de bredere trendmodel-sprint |
| MS-F7-03 (Correlatie-vs-causatie-audit) | MS-F7-04 (Relationship Intelligence) | MERGE | "Causality warnings" expliciet in v1.1's closure outcome |
| — | MS-F7-02 (Exercise Stagnation & Plateau), MS-F7-03 (Adherence & Consistency), MS-F7-05 (Athlete Dashboard 2.0) | NEW (3×) | Geen oud equivalent |

## F8 — Women's Performance (geherstructureerd van 5 losse besluit-sprints naar 4 gate-sprints)

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F8-01 (Zwangerschap) | MS-F8-04 (Life-stage Performance Context) | MERGE | v1.1 groepeert zwangerschap/postpartum/menopauze als "life-stage" |
| MS-F8-02 (Postpartum) | MS-F8-04 (Life-stage Performance Context) | MERGE | Idem |
| MS-F8-03 (Menopauze/perimenopauze) | MS-F8-04 (Life-stage Performance Context) | MERGE | Idem |
| MS-F8-04 (Anticonceptie) | MS-F8-03 (Cycle & Symptom Performance Context) | MERGE | Anticonceptie beïnvloedt direct de cyclus, past bij cyclus-context |
| MS-F8-05 (Bekkenbodem) | MS-F8-04 (Life-stage Performance Context) | MERGE | Vaak gekoppeld aan postpartum/life-stage |
| — | MS-F8-01 (Women's Performance Product Decisions, overkoepelende gate voor alle 5 besluiten), MS-F8-02 (Women's Privacy & Consent Model) | NEW (2×) | v1.1 voegt een expliciete besluit-gate én een aparte privacy/consent-sprint toe vóór enige implementatie |

## F9 — Social & Community

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F9-01 (Social-architectuuronderzoek) | MS-F9-01 (Social Identity & Privacy Foundation) | RENAME | Zelfde ID, van zuiver onderzoek naar architectuur-fundament (nog steeds DEFERRED-gated) |
| — | MS-F9-02 (Clubs/Groups/Challenges), MS-F9-03 (Sharing/Moderation/Notifications) | NEW (2×) | Geen oud equivalent |

## F10 — Coach/PT Platform

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F10-01 (Coach-Relationship testdekking) | MS-F10-01 (Coach Consent & Permissions) | RENAME | Zelfde ID, verbreed van "alleen tests" naar consent+permissies+tests |
| MS-F10-02 (Coach-dashboard MVP) | MS-F10-02 (Coach Roster & Athlete Overview) | RENAME | Zelfde ID-nummer |
| MS-F10-03 (Coach-programmering/toewijzing) | MS-F10-03 (Coach Programming & Assignment) | RENAME | Zelfde ID-nummer, identieke inhoud |
| — | MS-F10-04 (Coach Intelligence) | NEW | Geen oud equivalent |

## F11 — Gym/Club/Team Platform

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F11-01 (Tenant/locaties/staff-model) | MS-F11-01 (Organization & Location Core) | RENAME | Zelfde ID, identieke inhoud |
| MS-F11-02 (Team/groep-beheer-UI) | MS-F11-03 (Teams, Groups & Analytics) | RENAME | v1.1 nummert dit als F11-03 |
| — | MS-F11-02 (Gym Programming & Equipment), MS-F11-04 (Gym Device Vendor Feasibility), MS-F11-05 (Dynamic Branding & Admin) | NEW (3×) | Geen oud equivalent |

## F12 — Commercial & Entitlements

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F12-01 (Entitlement-reconciliatie & billing) | MS-F12-04 (Billing & Reconciliation) | RENAME | v1.1 nummert dit als laatste F12-stap |
| MS-F12-02 (Subscription-lifecycle) | MS-F12-03 (Commercial UX) | MERGE | Upgrade/downgrade/cancel/restore is exact de v1.1-omschrijving van Commercial UX |
| (zie ook MS-F2-01/02 hierboven, verplaatst naar F12-02/03) | | | |
| — | MS-F12-01 (Tier & Entitlement Design) | NEW | **Cruciale toevoeging**: v1.1 eist een expliciet tier/waardepropositie-ontwerp vóórdat enige entitlement- of UI-bouw begint |

## F13 — Production & Scale

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F13-01 (Observability-uitbouw) | MS-F1-02 (Observability Foundation) | MERGE + MOVE_PHASE (F13→F1) | v1.1 plaatst alle observability-werk in F1, niet gesplitst over F1/F13 |
| MS-F13-02 (iOS-feasibility) | **MS-F13-06** | RENAME (supplementair) + koppeling aan MS-F5-04 | v1.1 §24 noemt iOS-timing als open productbeslissing die MS-F5-04 (Apple HealthKit) vervolgt |
| MS-F13-03 (Backup/retentiebeleid) | MS-F1-05 (Backup & Retention Decision) | MERGE + MOVE_PHASE (F13→F1) | Zelfde onderwerp als oude MS-F1-01, nu samengevoegd in één F1-sprint |
| — | MS-F13-01 t/m 04 (v1.1: Offline Sync, Release/Migration/Rollback, Performance, Accessibility), MS-F13-05 (Privacy & Security Recertification) | NEW (5×, incl. F13-05 die oude MS-F1-06 absorbeert) | Geen oud equivalent voor de eerste 4; F13-05 zie F1-sectie hierboven |

## F14 — Scientific Platform

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F14-01 (Consent- & governancemodel) | MS-F14-01 (Research Consent & Withdrawal) | RENAME | Zelfde ID, identieke inhoud |
| MS-F14-02 (Research-exportpijplijn) | MS-F14-02 (Reproducible Dataset Export) | RENAME | Zelfde ID, identieke inhoud |
| — | MS-F14-03 (Cohort & Research Governance) | NEW | Geen oud equivalent |

## F15 — Beyond Benchmark

| Oud ID (PR #68) | Nieuw/canoniek ID | Actie | Reden |
|---|---|---|---|
| MS-F15-01 (Evidence-transparantie als positionering) | MS-F15-02 (Explainability as Product Surface) | RENAME | v1.1 nummert dit als F15-02 |
| — | MS-F15-01 (Cross-domain Athlete Model), MS-F15-03 (Sensor-assisted Movement Intelligence) | NEW (2×) | Geen oud equivalent |

---

## Samenvatting

| Actietype | Aantal |
|---|---|
| KEEP (ongewijzigd ID + inhoud) | 3 |
| RENAME (nieuw ID, zelfde/verbrede inhoud) | 27 |
| MERGE (meerdere oude IDs samengevoegd in één nieuwe) | 16 |
| SPLIT (één oude ID verdeeld over meerdere nieuwe) | 4 (bronsprints) |
| MOVE_PHASE (fase gewijzigd) | 4 |
| CHANGE_PRIORITY | 3 (MS-F1-04/DOC-HANDBOOK-001, MS-F2-01→MS-F12-03, MS-F2-06→MS-F2-04) |
| NEW (geen oud equivalent) | 34 |
| **Totaal oude IDs verwerkt** | **57 van 57 — 0 zoekgeraakt** |
| **Totaal canonieke entries (mastersprints + capabilities)** | **95** (79 mastersprints [75 v1.1-kern + 4 supplementair] + 16 capabilities) |
