# CURRENT_STATE — Trainingskompas

> Beschrijft uitsluitend wat NU waar is. Volledige releasegeschiedenis staat in `CHANGELOG.md` / `docs/RELEASE_HISTORY.md` / `docs/Sprintrapporten/`. Bijwerken na iedere afgeronde Story en iedere release — historische secties toevoegen aan de genoemde geschiedenisbronnen, niet aan dit document.

## Projectnaam
Trainingskompas — definitief (was Maurice Training Coach; appnaam vastgesteld 1 augustus 2026, zie DEC-010 en `docs/Brand/BRAND_IDENTITY.md`).

## Huidige versie
v4.69.23

## 1. Verified baseline
- **main SHA:** wordt bijgewerkt na merge (zie git log voor de actuele HEAD)
- **APP_VER:** v4.69.23 (zie "Huidige versie" hierboven — exacte kop vereist door `core/fAndroidRelease.test.js` H2, Wet 84-versiebumpcontrole; niet wijzigen zonder die test aan te passen)
- **Datum van deze stand:** 30 augustus 2026
- **Deployment:** Netlify auto-deploy vanaf `main`; GitHub Actions Quality Gate (comprehensive, discovery-based) is een vereiste check op `main` (protected branch)

## 2. Current roadmap position
- **F0 — Verified Baseline: CLOSED**
- **F1 — Foundation Closure: CLOSED** (Gate A semantische-integriteitsaudit geslaagd — 18/18 consistentiechecks, release gate groen, geen open P0/P1)
- **F2 — Athlete Core Excellence: CLOSED.** MS-F2-01 (Canonical Training Start & Preview) is herclassificeerd van PARTIAL naar **CLOSED** nadat GAP-P1-006 tijdens MS-F2-08 is gesloten: Programma-blok en Repeat Workout krijgen nu beide een canonieke `training_instances`-rij. Preview-UI blijft bewust gedifferentieerd voor deze twee bronnen — een gedocumenteerde productgrens, geen open architectuurgat. MS-F2-02 t/m MS-F2-07 blijven CLOSED. Final Contract Reconciliation bevestigde: geen resterende architectuurgap, gepreciseerde acceptance-wording vastgelegd. Zie `docs/MS-F2-01..08_*.md`.
- **F3 — Calculation/Context/Evidence Excellence: CONDITIONALLY CLOSED — non-blocking scientific/validation items open.** Alle 11 mastersprints eerlijk afgerond (MS-F3-04 blijft TESTED, geen kunstmatige CLOSED). GAP-P1-007 en GAP-P1-008 beide technisch en live gesloten. Volledig rapport: `docs/F3_MASTER_REPORT.md`.
- **F4 — Coach Intelligence: CLOSED — READY FOR F5 SELECTION.** Alle 6 F4-mastersprints eerlijk afgerond (MS-F4-01 blijft correct op TESTED, geen kunstmatige CLOSED). Volledig rapport: `docs/F4_MASTER_REPORT.md`.
- **F5 — Connected Athlete: SOFTWARE CLOSED — REAL DEVICE VALIDATION OPEN.** Alle 6 F5-mastersprints afgerond. Volledig rapport: `docs/F5_MASTER_REPORT.md`.
- **F6 — Endurance & Multisport Excellence: CLOSED — READY FOR F7 SELECTION.** Alle 6 F6-mastersprints afgerond. Volledig rapport: `docs/F6_MASTER_REPORT.md`.
- **F7 — Longitudinal Athlete Intelligence: CLOSED — READY FOR F8 SELECTION.** Alle 5 F7-mastersprints afgerond. Volledig rapport: `docs/F7_MASTER_REPORT.md`.
- **F8 — Women's Performance: CLOSED — READY FOR F9 SELECTION.** Alle 4 F8-mastersprints afgerond. Volledig rapport: `docs/F8_MASTER_REPORT.md`.
- **F9 — Social & Community: CLOSED — READY FOR F10 SELECTION.** Alle 3 F9-mastersprints afgerond. Volledig rapport: `docs/F9_MASTER_REPORT.md`.
- **F10 — Coach/PT Platform: CLOSED — READY FOR F11 SELECTION.** Alle 4 F10-mastersprints afgerond. Volledig rapport: `docs/F10_MASTER_REPORT.md`.
- **F11 — Gym/Club/Team Platform: CURRENT (dit betekent hier uitsluitend: de meest recente roadmapfase, er is nog geen nieuwere fase gestart — GEEN "nog in ontwikkeling". Finale, bewezen status: "F11 GYM/CLUB/TEAM PLATFORM SOFTWARE CLOSED — EXTERNAL DEVICE/PARTNER VALIDATION OPEN").** Alle 5 mastersprints afgerond. MS-F11-01: **CLOSED** — schrijffundament, drie kritieke security-bugs gevonden en gerepareerd. MS-F11-02: **CLOSED** — hergebruikt volledig F10 Coach Programming en de bestaande equipment-tabellen. MS-F11-03: **CLOSED** — team-events/aanwezigheid/verantwoordelijkheden, server-side privacy-safe analytics (kritieke, zelf-gevonden en zelf-gerepareerde cohort-drempel-omzeiling), vier tenant-escape-bugs gerepareerd. MS-F11-04: **CLOSED** — evidence-based feasibility-matrix voor 8 gym-device-vendors (`docs/F11_GYM_DEVICE_VENDOR_FEASIBILITY.md`), geen vendor geïmplementeerd, external validation blijft expliciet open. MS-F11-05 (Dynamic Branding & Admin): **CLOSED** — **tweede kritieke, tijdens dezelfde sessie gevonden en gerepareerde RLS-bevinding**: een brede member-SELECT-policy op `gyms` gaf toegang tot de volledige rij, inclusief `coach_pin_hash`/`plan_key`/`mollie_customer_id` (RLS is row-level, geen column-level bescherming) — gerepareerd met een `get_organization_branding()` SECURITY DEFINER-RPC die uitsluitend veilige velden projecteert. Runtime-integratie volledig afgerond (geen dead code): zichtbare tenant-skin in het profielscherm, een niet-onderhandelbare, altijd-zichtbare "Powered by Trainingskompas"-co-branding-invariant, minimale admin-beheerknop (database/RLS blijft autoriteit). **APP_VER v4.69.21.** `organizations` blijft definitief vastgelegd als enige tenant-identity-root; `gyms` is uitsluitend organization-gebonden configuratie/presentatie, geen tweede tenant root. **F11 open P1: 0.** Volledige rapporten: `docs/F11_MS_F11_01_REPORT.md`, `docs/F11_MS_F11_02_REPORT.md`, `docs/F11_MS_F11_03_REPORT.md`, `docs/F11_GYM_DEVICE_VENDOR_FEASIBILITY.md`, `docs/F11_DYNAMIC_BRANDING_EXISTING_STATE_AUDIT.md`. F11 Final Integration Audit: alle vijf mastersprints herbevestigd op de daadwerkelijk gemergde main. Row-vs-column-security-audit (nieuwe gate, geboren uit de gyms-bevinding): geen enkele andere tabel heeft hetzelfde patroon. Shadow-architectuur-audit: 0 treffers. **Finale status: "F11 GYM/CLUB/TEAM PLATFORM SOFTWARE CLOSED — EXTERNAL DEVICE/PARTNER VALIDATION OPEN"** (software/database/security volledig gesloten; uitsluitend externe vendor-partnerschappen voor MS-F11-04 blijven open, buiten Trainingskompas eigen controle). Volledig rapport: `docs/F11_MASTER_REPORT.md`. **F12 vereist een nieuwe, expliciete vrijgave van de Product Owner.**
- **F12 — Commercial & Entitlements: expliciet vrijgegeven door de Product Owner, 30 augustus 2026.** MS-F12-01 (Tier & Entitlement Design): **CLOSED** — existing-state audit (`docs/F12_EXISTING_COMMERCIAL_ARCHITECTURE_AUDIT.md`) bevestigde 0% runtime-integratie van het bestaande plan/feature/credit-schema. Drie kritieke, live gevonden en gerepareerde beveiligingsproblemen (self-service credit-inflatie, insert-value-spoofing, ontbrekende idempotentie bij credit-toekenning). Nieuwe centrale `core/entitlementCore.js`-resolver, marktonderzoek vastgelegd (`docs/F12_TIER_PRICING_DECISION.md`), geen definitieve prijs gekozen. MS-F12-02 (Entitlement Enforcement): **CLOSED** — **kritieke P0-bevinding** (zie `docs/SECURITY_FINDINGS.md` P0-005): een gewone gebruiker kon zichzelf een betaald abonnement toekennen via `users.individual_plan_key`, gerepareerd met een BEFORE UPDATE-trigger consistent met het bestaande `protect_privileged_user_columns()`-patroon. Server-side entitlement/quota-enforcement volledig geïntegreerd in `netlify/functions/coach.js` (alle 6 client-AI-aanroepen), atomaire race-safe quota via `check_and_increment_usage()`, vier sabotagebewijzen geleverd. **APP_VER v4.69.22.** F12 open P1: 0. MS-F12-03 (Commercial UX): **CLOSED** -- nieuwe centrale `core/commercialUxCore.js`-view-model-laag, planvergelijkingsscherm in het bestaande profielscherm, geen fictieve prijzen, verfijnde quotafoutmeldingen, dark-patterns-audit (17 assertions), sabotagebewijs (met een tussentijds gevonden en gerepareerde detectiezwakte in de shadow-commercial-logic-gate zelf). **APP_VER v4.69.23.** MS-F12-04 (Billing & Reconciliation) nog te doen.
- **Master Roadmap 2.0 v1.1 = CANONICAL** productstrategische bron. Repository blijft technische autoriteit. Zie `docs/DOCUMENTATION_GOVERNANCE.md`.
- Volledige fasering (F0-F15): zie `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md`. Volledige mastersprint-ID-migratie: zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md`.

## 3. Current product maturity (samenvatting — zie `docs/CAPABILITY_REGISTRY.md` voor detail)
Training Core, Calculation Engine, Context Engine, Decision Engine, Evidence Architecture, Recovery en Security/Platform staan op een volwassen niveau (TESTED/INTEGRATED/CLOSED, zie registry). ~~Women's Performance, Commercial en Coach/Gym-platform zijn architecturaal voorbereid (DB-schema aanwezig) maar UI/RLS-scoping nog niet afgerond.~~ **verouderd, gecorrigeerd:** Women's Performance is sinds F8 CLOSED (RLS/consent volledig bewezen). Coach/PT-platform is sinds F10 CLOSED — RLS/scoping is adversarial bewezen (self-elevation, cross-coach, Women's Performance-isolatie), zie `docs/F10_MASTER_REPORT.md`; UI/schermintegratie voor Coach/PT is bewust nog niet gebouwd (backend/Core-architectuur was de volledige scope van F10). ~~Gym/Club/Team-platform (F11) is nog niet gestart op het moment van deze correctie.~~ **opnieuw verouderd, gecorrigeerd:** F11 is sinds 30 augustus 2026 volledig doorlopen en afgerond — "F11 GYM/CLUB/TEAM PLATFORM SOFTWARE CLOSED — EXTERNAL DEVICE/PARTNER VALIDATION OPEN", zie `docs/F11_MASTER_REPORT.md`. Organization/team/equipment/branding-RLS is adversarial bewezen; UI/schermintegratie voor organization/team is grotendeels bewust nog niet gebouwd (uitzondering: de minimale, wel gebouwde branding-tenant-skin en admin-beheerknop uit MS-F11-05), consistent met het F10-precedent. Commercial (F12) blijft architecturaal voorbereid, niet vrijgegeven -- **F12 NOT STARTED — AWAITING EXPLICIT RELEASE.** Devices/Wearables zijn software-TESTED, real-device-validatie staat open.

## 4. Current open priorities
Canonical bron: `docs/GAP_ANALYSIS_V2.md`.
- **Open P0: 0**
- **Open P1: 0.** AI-adaptive-programmering (AI-PROGRAM-AUTOGEN-001) is na MS-F4-04 **CLOSED** — hernummerd naar GAP-P2-017 (het resterende gat t.o.v. Hevy Trainer is een productrichtingskeuze, geen veiligheids-/architectuurrisico; de audit-trail-lacune is gedicht via `migratie_v501.sql`). AI-outputcontract (AI-OUTPUT-CONTRACT-001) blijft P2/TESTED sinds MS-F4-01.
  - **F3-phase open P1 (mastersprint-acceptance-gate-blokkerend): 0.** GAP-P1-007 is CLOSED via MS-F3-10; GAP-P1-008 is CLOSED via de F3 Closure Hotfix — zie sectie "CLOSED GAPS / HISTORICAL" in `docs/GAP_ANALYSIS_V2.md`.
- **MS-F1-01 (Multi-tenant RLS Security Closure) is CLOSED** — membership-scoped RLS op organizations/teams/training_groups/seasons/macrocycles/mesocycles/microcycles (`migratie_v498.sql`), plus een tijdens de sprint gevonden en gesloten P0 (self-privilege-escalatie via `users.gym_role`/`gym_id`/`system_role`, `migratie_v497.sql`)
- Open P2: 7 — incl. Handbook-drift en Commercial-UI, beide gedowngraded van P1 per Roadmap 2.0 v1.1
- Open P3/P4: zie `docs/GAP_ANALYSIS_V2.md` voor de volledige lijst

## 5. Current validation status
- **Code:** CODE VERIFIED tegen `main` @ bovenstaande SHA
- **DB:** VERIFIED — 69 tabellen, RLS gecontroleerd op alle tabellen, `gyms`-lek gesloten en geverifieerd via `SET LOCAL ROLE anon/authenticated/service_role`
- **Tests:** discovery-based release gate (lokaal én CI, schone checkout) — 150 testbestanden in `core/` ontdekt (+ `logic_tests.js` + 2 statische checks = 153 stappen totaal), 152 automatisch uitgevoerd, 1 zichtbaar geskipt (fAndroidRelease.test.js zonder gereproduceerde buildmap), 0 gefaald
- **Integration:** wearable-sync getest tegen de echte handler-functie; overige integraties overwegend unit-getest
- **Device:** **OPEN** — Concept2 PM5 en Google Health-sync hebben geen bevestigde real-device-validatie in productie
- **UX:** niet apart beoordeeld in de laatste consolidatiesprint (38 top-level schermen geïnventariseerd, geen flow-niveau UX-testdekking)
- **Scientific/evidence:** architectuur-niveau geverifieerd (`evidence_store.v1`, corroboratieregels); metric-voor-metric evidencelevel-audit (A-E) nog niet uitgevoerd

## 6. Current known blockers / decisions
- ~~5 openstaande Women's Performance-productbeslissingen (zwangerschap, postpartum, menopauze, anticonceptie, bekkenbodem) — wachten op Maurice~~ — **verouderd, gecorrigeerd:** deze vijf beslissingen zijn genomen tijdens MS-F8-01 (Women's Performance Product Decisions), vastgelegd in `docs/MS-F8-01_WOMENS_PERFORMANCE_PRODUCT_DECISIONS.md`: Cycle en Symptoms zijn IMPLEMENT (reeds correct bestaand); Contraceptie, Zwangerschap/Postpartum, Perimenopauze/Menopauze/Bekkenbodem zijn DEFER (conservatieve, reversibele default). F8 is sindsdien volledig CLOSED, zie `docs/F8_MASTER_REPORT.md`.
- ~~GYM-RLS-SCOPING-001 blokkeert Track 13 (Gym/Club/Team)~~ — **verouderd, gecorrigeerd:** GYM-RLS-SCOPING-001 is CLOSED/VALIDATED sinds MS-F1-01 (membership-scoped policies, live geverifieerd met 2 gescheiden tenants). Bovendien was het tracknummer fout: Gym/Club/Team Platform is **Track 15** (T13 is Social & Community), zie `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` §6. Track 15 (F11) mag inmiddels wél starten met echte multi-tenant-data — de RLS-dependency is gesloten.
- Overige, niet-blokkerende technische schuld: zie `docs/GAP_ANALYSIS_V2.md` P2-P4
- **PRODUCT DECISION OPEN (F11.03):** `event_responsibilities.assigned_user_id` kan momenteel iemand zijn die geen formeel teamlid is. Geen bewezen data-access-escape (geen aanvullende leesrechten, geen bestaand notificatiepad). Mogelijk legitiem (vrijwilliger/ouder/chauffeur zonder teamlidmaatschap). Aanbeveling voor een toekomstige sprint: overweeg een expliciet "externe/non-member assignee"-concept zodra hier notificaties op gebouwd worden. Zie `docs/F11_MS_F11_03_REPORT.md` sectie 5.

## 7. Canonical source references
| Domein | Bron |
|---|---|
| Capabilities | `docs/CAPABILITY_REGISTRY.md` |
| Open gaps | `docs/GAP_ANALYSIS_V2.md` |
| Toekomstplan | `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` + `docs/ROADMAP_INDEX.json` |
| Security-status | `docs/SECURITY_FINDINGS.md` |
| Test-status | `docs/TEST_VERIFICATION.md` |
| Architectuur | `docs/TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md` |
| Benchmark | `docs/BENCHMARK_REGISTRY.md` |
| Documentatie-autoriteit | `docs/DOCUMENTATION_GOVERNANCE.md` |
| Documentatieconflicten | `docs/DOCUMENTATION_CONFLICT_REPORT.md` |
| Handbook-onderhoud | `docs/HANDBOOK_UPDATE_PLAN.md` |
| Beslissingen | `docs/00_Project_Management/DECISION_LOG.md` |
| Korte-termijn POST-V1-status | `docs/CURRENT_ROADMAP.md` |

## 8. Historical reference
Release- en sprintgeschiedenis (v3.3.x t/m v4.69.0, inclusief Fase 2-afronding/v4.47.0, Night Sprint 19-23/v4.41-4.45, Sprint 3/3.1, en alle overige releases) staat volledig in `CHANGELOG.md` (93 versie-entries) en `docs/RELEASE_HISTORY.md` (compacte index), met gedetailleerde sprintrapporten in `docs/Sprintrapporten/`. Dit document herhaalt die geschiedenis niet.
