# CAPABILITY_REGISTRY.md — Trainingskompas (canonieke, actuele versie)

**Laatst herbouwd:** 28 augustus 2026, tegen `main` @ `201385d2d7c6dbc3c1dcd093411aed7619d429c1`.
**Regel:** dit document is één coherent geheel — geen "nieuwe statusupdate boven oude inhoud". Elke capability heeft precies één actuele status.
**Maturity-model:** NOT STARTED → IMPLEMENTED → TESTED → INTEGRATED → VALIDATED → CLOSED. Een capability is pas TESTED als de capability zelf (niet alleen een onderliggende module) testbewijs heeft.

---

## A. Security & Platform (module- én productniveau)

| ID | Capability | Code | DB | Tests | Integration | Device | Evidence/scientific | Maturity | Target | Gap | Priority | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SEC-GYMS-001 | `gyms`-tabel RLS-afscherming | `migratie_v496.sql` | `SET LOCAL ROLE anon/authenticated`→0 rijen, `service_role`→1 rij (28-08) | `fGymsRlsSecurity.test.js` 3/3 | N/A | N/A | N/A | **CLOSED** | CLOSED | geen | — | F0 (afgerond) |
| SEC-TEST-001 | Security-regressietests op 4 kritieke Netlify Functions | `coach.js`, `wearable-auth-*.js`, `delete-account.js`, `gym-team.js`/`gym-team-set-pin.js` | N/A | 61 assertions, 4 testbestanden, alle groen | Gemockte fetch, geen live calls | N/A | N/A | **CLOSED** | CLOSED | geen | — | F0 (afgerond) |
| SEC-GATE-001 | Discovery-based release gate | `core/release-gate.js` v2 | N/A | 78 testbestanden automatisch ontdekt, 80 uitgevoerd, 1 zichtbaar geskipt (Android) | Bewezen via sabotage-test (fCycle.test.js, teruggedraaid) | N/A | N/A | **CLOSED** | CLOSED | geen | — | F0 (afgerond) |
| PLAT-DELETE-001 | Accountverwijdering (GDPR) | `delete-account.js`, 29+ tabellen/kolomcombinaties | N/A | `fDeleteAccountSecurity.test.js` 12/12 — unauthenticated geweigerd, alleen eigen account, fail-closed bij onvaststelbare identity | Gemockt | N/A | N/A | **TESTED** | VALIDATED | live-verificatie van een daadwerkelijke verwijdering in staging | P3 | F1 |
| PLAT-BACKUP-CLEANUP-001 | 8 `bak_p_*`-backuptabellen (eerdere telling van 7 was onvolledig, gecorrigeerd) | `docs/BACKUP_RETENTION_CONTRACT.md` | DB VERIFIED (1-154 rijen, RLS enabled met 0 policies = deny-all, 0 FK-referenties in beide richtingen) | N/A | N/A | N/A | N/A | **NOT STARTED** (verwijdering) | CLOSED (audit) | verwijdering/archivering is `POLICY_DECISION_REQUIRED` — audit zelf compleet, alle 8 geclassificeerd als SAFE TO ARCHIVE | P2 | F1 (MS-F1-05, audit CLOSED, actie BLOCKED) |
| PLAT-OBSERVABILITY-001 | Structurele logging/monitoring | `core/observability.js` (event-contract, redactie, foutnormalisatie), geïntegreerd in `coach.js`, `wearable-sync.js`, globale frontend-error-capture in index.html | N/A | `core/observability.test.js` 52/52 (incl. security-sabotagetest, failure-simulatie, fail-safe-serialisatie) | Geïntegreerd in 2 Netlify Functions + browser | N/A | Geen externe provider (bewust, MS-F1-02 §22) — eigen contract + capture points | **TESTED** | INTEGRATED | uitbreiding naar overige Netlify Functions (delete-account.js, gym-team.js, wearable-auth-*.js) en persistente opslag/retentiebeleid | P1 | F1 (MS-F1-02, CLOSED) |

## B. Gym/Coach/Team

| ID | Capability | Code | DB | Tests | Integration | Device | Evidence/scientific | Maturity | Target | Gap | Priority | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SOC-GYMTEAM-001 | Gym-team-beheer (RBAC: lid/coach/manager/owner) | `gym-team.js`, `gym-team-set-pin.js` | `users.gym_role/gym_role_level`, `gym_audit_log` | `fGymTeamSecurity.test.js` 17/17 — incl. de gefixte owner-demotie-bug | Gemockt | N/A | N/A | **TESTED** | VALIDATED | live-verificatie in productie | P3 | F1 |
| GYM-RLS-SCOPING-001 | Multi-tenant RLS-scoping (organizations/teams/training_groups/seasons/macrocycles/mesocycles/microcycles) | `migratie_v498.sql` | DB VERIFIED: membership-gescoopte policies live geverifieerd (2 tenants, cross-tenant DENY, owner-bootstrap ALLOW) | `fGymRlsMultiTenant.test.js` 22/22 (statische contractcheck) | N/A | OPEN (geen live PostgREST-JWT-test, wel live SQL-transactiebewijs) | N/A | **VALIDATED** | VALIDATED | live PostgREST-end-to-end-test met echte JWT's (optioneel, SQL-niveau al bewezen) | **P1** | F1 (MS-F1-01, CLOSED) |
| SEC-USERROLE-001 | Bescherming tegen self-service privilege-escalatie op `users.gym_role`/`gym_id`/`system_role` | `migratie_v497.sql` (BEFORE UPDATE-trigger) | DB VERIFIED: self-update van deze 3 kolommen wordt teruggezet, service_role-update (gym-team.js) blijft werken | `fGymRlsMultiTenant.test.js` (onderdeel van dezelfde 22/22) | N/A | N/A | N/A | **CLOSED** | CLOSED | geen | **P0 (gevonden tijdens MS-F1-01, niet in de oorspronkelijke audit)** | F1 (MS-F1-01, CLOSED) |
| SEC-CONFIG-001 | Secrets- en configuratiehygiëne (client/server-classificatie, redactie, fail-closed-gedrag) | 9 Netlify Functions gecontroleerd op fail-closed-gedrag, `.gitignore` voor keystore/`.env` bevestigd | DB VERIFIED: `config.anthropic_key`/`config.pin_hash` aanwezig maar orphaned (0 code-referenties) | `observability.test.js` sectie K (6 nieuwe assertions, config-redactie) | N/A | N/A | Gerichte git-geschiedenisscan: geen rotation-required items gevonden | **VALIDATED** | VALIDATED | F-01/F-02 (orphaned DB-kolommen) vereisen `MANUAL_USER_VALIDATION_REQUIRED` vóór verwijdering; F-03 (client-lock-hardening) is `PRODUCT_DECISION_REQUIRED` | P1 | F1 (MS-F1-03, CLOSED) |
| CALC-STR-REGISTRY-001 | Formele Calculation Registry, Strength-domein (e1RM/werkgewicht/volume/warmup/RPE-herstelfactor) | `docs/CALCULATION_REGISTRY.md` — 5 CALC-STR-items, elk met ID/formule/evidence/bronnen/beperkingen/verboden-interpretaties | N/A | `core/fCalculationRegistryStrength.test.js` 56/56 (structurele volledigheid + evidence-inflatie-detectie), sabotagebewijs geleverd | N/A | N/A | Wetenschappelijk geverifieerd: ACSM 2026 Position Stand (Currier et al., MSSE, april 2026, 137 systematic reviews) opnieuw opgezocht en geciteerd voor RPE/RIR-belastingsturing en volume-drempel | **VALIDATED** | VALIDATED | zelfde registry-diepte voor de overige F3-domeinen (Load & Progression, Recovery, Endurance) | P1 | F3 (MS-F3-01, CLOSED) |
| CALC-LOAD-REGISTRY-001 | Formele Calculation Registry, Load & Progression-domein (ACWR-classificatie/corroboratie/sRPE/rolling-load/trend) | `docs/CALCULATION_REGISTRY.md` — 5 CALC-LOAD-items | N/A | `core/fLoadProgressionRegistry.test.js` 64/64 (functioneel + structureel + evidence-inflatie-detectie), sabotagebewijs geleverd | N/A | N/A | ACWR-classificatie herbeoordeeld: B→C na het opnieuw opzoeken van methodologische kritiek (Windt & Gabbett 2018, mathematical coupling) — geen evidence-inflatie. Foster sRPE-methode (2001) formule-specifiek geciteerd en als nieuwe, minimale calculatie toegevoegd (echte roadmap-lacune). | **VALIDATED** | VALIDATED | UI-integratie van sRPE (GAP-P2-009), zelfde registry-diepte voor Recovery/Endurance | P1 | F3 (MS-F3-02, CLOSED) |
| CALC-REC-REGISTRY-001 | Formele Calculation Registry, Recovery-domein (HRV-baseline/dagfactor/Recovery Score/RHR-delta) | `docs/CALCULATION_REGISTRY.md` — 4 CALC-REC-items | DB VERIFIED: `hrv_log`-schema gecontroleerd, geen provenance-kolom aanwezig | `core/fRecoveryRegistry.test.js` 48/48 (functioneel via bracket-matching-extractie + registry-structuur + evidence-inflatie-detectie), sabotagebewijs geleverd | N/A | N/A | Wetenschappelijk geverifieerd: Plews et al. (Sports Medicine, 2013) opnieuw opgezocht en bevestigd voor de Ln-RMSSD/SWC-methodologie; claim-specifieke evidence toegepast (SWC sterk onderbouwd, "ernstige daling"-drempel expliciet zwakker gebronnd, apart geclassificeerd) | **VALIDATED** — dimensies: software_validation=PASS, evidence_status=VERIFIED, **provenance_validation=OPEN** (zie GAP-P1-007). VALIDATED slaat op de wetenschappelijke/functionele juistheid van de calculaties zelf (zoals ook bij SEC-CONFIG-001: VALIDATED + expliciet genoteerde openstaande subitems is de bestaande conventie in dit registry, geen status-inflatie) — niet op volledige provenance-integratie, die apart bij MS-F3-10 wordt gesloten. | VALIDATED | **GAP-P1-007 is een F3-fase-blokkerende P1** (target MS-F3-10, Explainability & Provenance Contract) — géén MS-F3-03- of MS-F3-04-blokkerende P1. GAP-P2-011 (geen dedicated core/-unit-test voor HRV-baseline), GAP-P2-012 (RHR-delta-minimum inconsistent met HRV-gates). | P1 | F3 (MS-F3-03, CLOSED; GAP-P1-007 target MS-F3-10) |
| CALC-END-REGISTRY-001 | Formele Calculation Registry, Endurance & Erg-domein (pace/split/Concept2-vermogen; CS/CP/TRIMP/HR-zones bewust NOT_IMPLEMENTED) | `docs/CALCULATION_REGISTRY.md` — 5 CALC-END-items | N/A | `core/fEnduranceErgRegistry.test.js` 24/24 (functioneel + structureel + NOT_IMPLEMENTED-bewaking), sabotagebewijs geleverd | N/A | N/A | Bevestigd bestaand architectuurcommentaar (intervalEngine.js: "Geen FTP/critical power/critical speed") geciteerd, niet zelf verzonnen. Geen evidence-claim gemaakt voor niet-bestaande metrics. | **TESTED** (niet VALIDATED — bewust, zie next_action) | TESTED | Pace/power/erg metrics volledig VALIDATED; CS/CP/TRIMP/HR-zones NOT_IMPLEMENTED (vereist productbeslissing over methode-keuze, geen technische lacune); GAP-P2-013 (watt-provenance-onderscheid device-gemeten vs. afgeleid) | P1 | F3 (MS-F3-04, status TESTED — sprintuitkomst inhoudelijk gedeeltelijk, geen vals CLOSED; zie `docs/MS-F3-04_ENDURANCE_ERG.md`) |
| CALC-ENE-REGISTRY-001 | Formele Calculation Registry, Energy & Estimate-domein (calPerMin-ratio; BMR/RMR/TDEE bewust NOT_IMPLEMENTED) | `docs/CALCULATION_REGISTRY.md` — 4 CALC-ENE-items | N/A | `core/fEnergyEstimateRegistry.test.js` 10/10 (bewaakt dat geen stille energieberekening wordt geïntroduceerd), sabotagebewijs geleverd | N/A | N/A | Kernbevinding: TK berekent zelf geen energieverbruik — alle calorie-/BMR-waarden zijn USER_REPORTED of WEARABLE_ESTIMATE, al vóór deze sprint correct gelabeld. Geen evidence-claim nodig voor niet-bestaande berekeningen. | **VALIDATED** | VALIDATED | BMR/RMR/TDEE blijft NOT_IMPLEMENTED (PRODUCT_DECISION_REQUIRED indien ooit gewenst — meerdere wetenschappelijk verschillende vergelijkingen bestaan, roadmap schrijft geen keuze voor) | P2 | F3 (MS-F3-05, CLOSED) |
| COACH-RELATIONSHIP-001 | Coach-athlete-relaties | `coach_athlete_relationships` | DB VERIFIED — correcte consent-flow (pending→active, wederzijdse revocatie) | Geen dedicated test gevonden | N/A | N/A | N/A | IMPLEMENTED | TESTED | testdekking | P3 | F10 |

## C. AI Coach (security vs. governance expliciet gescheiden)

| ID | Capability | Code | DB | Tests | Integration | Device | Evidence/scientific | Maturity | Target | Gap | Priority | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI-COACH-001 | AI-coachproxy — **security/toegang** (JWT-verificatie, open-proxy-bescherming) | `coach.js`, `buildCtx()` (6 aanroeppunten in index.html) | N/A | `fCoachProxySecurity.test.js` 12/12 | Gemockt | N/A | N/A | **CLOSED** (voor het security-deel) | CLOSED | geen | — | F0 (afgerond) |
| AI-OUTPUT-CONTRACT-001 | AI-coach — **outputgovernance** (geen ongefundeerd cijfer, geen diagnose-taal, expliciete onzekerheid) | geen technische blokkade gevonden | N/A | geen contracttest | N/A | N/A | `scientificEvidence.js` beschermt regels, niet vrije AI-tekst | **NOT STARTED** | TESTED | contracttest op AI-responsschema | **P1** | **F4** (verplaatst uit F2 per Roadmap 2.0 v1.1 §29/32 — na Calculation/Context/Decision/Evidence-dependencies; zie MS-F4-01) |
| AI-PROGRAM-AUTOGEN-001 | AI-gestuurde programma-generatie (week-generatie) | 2 van 6 `buildCtx()`-aanroeppunten (index.html ~10888, ~11253) | N/A | Geen dedicated flow-test | N/A | N/A | Gekoppeld aan Decision/Evidence-laag | IMPLEMENTED | VALIDATED | benchmark-gap t.o.v. Hevy Trainer (feb 2026, volledig auto-adaptief) | P1 | F4 |
| EVID-SCI-001 | Scientific evidence-registry | `core/scientificEvidence.js` (evidence_store.v1) | N/A | Indirect via `fEvidence.test.js` | N/A | N/A | Hard afgedwongen: UNVALIDATED evidence voedt geen regel, AI verzint nooit een entry | TESTED | CLOSED | volledige metric-voor-metric evidencelevel-audit (A-E) nog niet gedaan | P3 | F3 |
| DEC-CORE-001 | Decision + evidence-koppeling, incl. corroboratieregels (DEC-036) | `core/decision.js` | N/A | `decision.test.js` 31/31 | N/A | N/A | Corroboratie-eis: nooit één los signaal (DEC-036, 27-08) | TESTED | CLOSED | geen | — | F3 |

## D. Wearables & Devices

| ID | Capability | Code | DB | Tests | Integration | Device | Evidence/scientific | Maturity | Target | Gap | Priority | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DEV-WEARAUTH-001 | Wearable OAuth-flow (start/callback/disconnect/status) | `wearable-auth-start.js`, `wearable-auth-callback.js`, `wearable-disconnect.js`, `wearable-status.js` | `wearable_connections`, `wearable_oauth_state` | `fWearableAuthSecurity.test.js` 20/20 — state altijd server-gebonden, eenmalig, verloopt na 10 min | Gemockt | N/A | N/A | **TESTED** | VALIDATED | real-device/live Google Health-sync-validatie | P2 | F5 |
| DEV-WEARSYNC-001 | Wearable-sync (library + handler) | `_wearableSyncLib.js`, `wearable-sync.js` | `hrv_log` | `fWearableSync.test.js` 79/79, `fWearableSyncHandler.test.js` 43/43 (draait tegen echte handler) | **INTEGRATED** — test draait tegen echte handler-functie | Open | N/A | INTEGRATED | VALIDATED | real-device-validatie | P2 | F5 |
| DEV-CONCEPT2-001 | Concept2 PM5 live (BLE) | `core/concept2Live.js` | N/A | `fConcept2Live.test.js` 95/95, `fA5DeviceConnectE2E.test.js` 21/21 | Unit + E2E-simulatie | **OPEN** (geen real-device-bevestiging in deze audit) | N/A | TESTED | VALIDATED | real-device-validatie PM5 | P2 | F5 |

## E. Endurance & Multisport

| ID | Capability | Code | DB | Tests | Integration | Device | Evidence/scientific | Maturity | Target | Gap | Priority | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| END-INTERVAL-001 | Generieke multi-sport interval-executie (v4.69.0) | `core/intervalEngine.js` | N/A | `intervalEngine.test.js` 28/28 | Geïntegreerd in cardio-executie-UI (index.html) | N/A | N/A | INTEGRATED | VALIDATED | flow-niveau UX-test | P3 | F6 |
| END-HYROX-001 | HYROX/Triathlon race-classificaties (Adaptive/Relay/Doubles) | schema + `race_segments` | DB VERIFIED (race_type, race_relay_*, bronbevestigd tegen hyrox.com-rulebooks, niet dit jaar herverifieerd) | `fHyroxTriathlon.test.js` 386/386 (grootste testbestand) | Ja | N/A | Bronbevestigd (eerdere sprintdocumentatie) | TESTED | CLOSED | herverificatie van rulebook-bronnen (jaarlijks kunnen wijzigen) | P3 | F6 |

## F. Recovery & Context

| ID | Capability | Code | DB | Tests | Integration | Device | Evidence/scientific | Maturity | Target | Gap | Priority | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CTX-CYCLE-001 | Cyclus-context (Women's Performance) | `core/cycle.js`, `s-lich-cyclus` | `cycle_periods`, `cycle_symptom_logs` | `fCycle.test.js` 56/56 | Geïntegreerd (scherm bestaat) | N/A | RAW DATA, geen medisch hulpmiddel (DB-commentaar bevestigd) | INTEGRATED | CLOSED | 5 open productbeslissingen blokkeren verdere uitbouw | P2 | F8 |
| WOMENS-PERF-DECISIONS-001 | 5 openstaande Women's Performance-besluiten | N/A | N/A | N/A | N/A | N/A | N/A | NOT STARTED | CLOSED | wacht op Maurice | P2 | F8 |

## G. Commercial & Platform-schermen

| ID | Capability | Code | DB | Tests | Integration | Device | Evidence/scientific | Maturity | Target | Gap | Priority | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| COMM-UI-001 | Commercial/entitlements-UI | **geen gevonden** — 0 treffers voor `plans`/`features` in index.html | `plans`, `features`, `credit_packs`, `plan_feature_quota`, `usage_log` volledig aanwezig | N/A | N/A | N/A | N/A | **NOT STARTED** | IMPLEMENTED | geen enkel UI-scherm | **P2** (gedowngraded van P1 per Roadmap 2.0 v1.1 §29/32 — schema/benchmark-pariteit rechtvaardigt geen vroege bouw) | **F12** (verplaatst uit F2; zie MS-F12-01 t/m 04) |
| CAP-REGISTRY-SCREENS-001 | 38 top-level schermen + volledige F2 Athlete Core-audit (MS-F2-01 t/m MS-F2-08) | `docs/MS-F2-01..08_*.md` — 8/8 entrypoints canonieke instance-creatie + execution-infrastructuur (GAP-P1-006 gesloten); 6/8 delen bovendien identieke Preview-UI, 2/8 (Programma/Repeat) bewust gedifferentieerde, functioneel rijkere pre-executie-flows | N/A | `core/fExecutionIdentity.test.js` 14/14, `core/fGapP1006Closure.test.js` 11/11, + 6 andere F2-testbestanden (Reliability/Builder/Library/History/Onboarding/ProgramResume) — allemaal met sabotagebewijs | N/A | N/A | Live DB geverifieerd: `training_instances.snapshot` (jsonb) accepteert de nieuwe provenance-velden zonder migratie | **INTEGRATED** (was TESTED) | INTEGRATED | live/productie-validatie van de nieuwe programma-/repeat-instance-creatie (geen unit-test-niveau bewijs meer nodig, wel praktijkbevestiging) | **P1** | **F2** (MS-F2-01 t/m 08, alle CLOSED) |

| DEV-VALIDATION-001 | Real-device-validatie (samenvattend, dekt Concept2 + Google Health) | zie DEV-CONCEPT2-001, DEV-WEARAUTH-001, DEV-WEARSYNC-001 | N/A | Software-niveau TESTED op alle onderliggende capabilities | Deels (wearable-sync draait tegen echte handler) | **OPEN** op alle drie | N/A | TESTED (software) | VALIDATED | real-device-bevestiging in productie voor Concept2 PM5 en Google Health-sync | P2 | F5 |

## H. Scientific Platform (lange termijn)

| ID | Capability | Code | DB | Tests | Integration | Device | Evidence/scientific | Maturity | Target | Gap | Priority | Phase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SCI-CONSENT-001 | Consent-governance voor research-export | geen gevonden | N/A | N/A | N/A | N/A | Bouwt voort op EVID-SCI-001 (evidence_store.v1) | NOT STARTED | IMPLEMENTED | consent-flow ontbreekt volledig, vereist vóór enige research-export | P4 | F14 |

---

## Samenvatting per maturity-status

**Canonieke capability count: 27** (was 26 vóór MS-F1-03 — SEC-CONFIG-001 toegevoegd. De vorige "TESTED"-telling was bovendien nog niet bijgewerkt met de MS-F1-02-closure van PLAT-OBSERVABILITY-001, hier gecorrigeerd).

| Status | Aantal | IDs |
|---|---|---|
| CLOSED | 5 | SEC-GYMS-001, SEC-TEST-001, SEC-GATE-001, AI-COACH-001, SEC-USERROLE-001 |
| TESTED | 10 | PLAT-DELETE-001, SOC-GYMTEAM-001, EVID-SCI-001, DEC-CORE-001, DEV-WEARAUTH-001, DEV-CONCEPT2-001, END-HYROX-001, DEV-VALIDATION-001, PLAT-OBSERVABILITY-001, CALC-END-REGISTRY-001 |
| NOT STARTED | 5 | PLAT-BACKUP-CLEANUP-001, AI-OUTPUT-CONTRACT-001, WOMENS-PERF-DECISIONS-001, COMM-UI-001, SCI-CONSENT-001 |
| IMPLEMENTED | 2 | COACH-RELATIONSHIP-001, AI-PROGRAM-AUTOGEN-001 |
| INTEGRATED | 4 | DEV-WEARSYNC-001, END-INTERVAL-001, CTX-CYCLE-001, CAP-REGISTRY-SCREENS-001 |
| VALIDATED | 6 | GYM-RLS-SCOPING-001, SEC-CONFIG-001, CALC-STR-REGISTRY-001, CALC-LOAD-REGISTRY-001, CALC-REC-REGISTRY-001, CALC-ENE-REGISTRY-001 |
| **Totaal** | **32** | 5+10+5+2+4+6 = 32 ✓ |

**Wijziging deze sprint (MS-F3-05):** nieuwe capability CALC-ENE-REGISTRY-001 toegevoegd als VALIDATED.

**Wijziging deze sprint (MS-F3-04):** nieuwe capability CALC-END-REGISTRY-001 toegevoegd als TESTED (bewust niet VALIDATED — CS/CP/TRIMP/HR-zones ontbreken, geen evidence-inflatie, zie `docs/MS-F3-04_ENDURANCE_ERG.md`).

**Wijziging deze sprint (MS-F3-03):** nieuwe capability CALC-REC-REGISTRY-001 toegevoegd als VALIDATED.

**Wijziging deze sprint (MS-F3-02):** nieuwe capability CALC-LOAD-REGISTRY-001 toegevoegd als VALIDATED.

**Wijziging deze sprint (MS-F3-01):** nieuwe capability CALC-STR-REGISTRY-001 toegevoegd als VALIDATED (eerste F3-mastersprint — formele Calculation Registry voor het Strength-domein, met opnieuw geverifieerde wetenschappelijke bronnen).

**Wijziging deze sprint (MS-F2-08):** CAP-REGISTRY-SCREENS-001 van TESTED → INTEGRATED (GAP-P1-006 gesloten, alle 8 F2-mastersprints CLOSED, MS-F2-01 heropend en herclassificeerd naar CLOSED — zie `docs/MS-F2-08_GAP_P1_006_CLOSURE.md`).

**Wijziging deze sprint (MS-F2-01):** CAP-REGISTRY-SCREENS-001 van IMPLEMENTED → TESTED (eerste F2-mastersprint, PARTIAL — zie `docs/MS-F2-01_CANONICAL_TRAINING_START.md`).

**Wijziging deze sprint (MS-F1-03):** nieuwe capability SEC-CONFIG-001 toegevoegd als VALIDATED (secret-inventory, client/server-classificatie, redactie-uitbreiding met de generieke term "key", live geverifieerd tegen de `config`-tabel). Twee orphaned DB-kolommen gevonden (`config.anthropic_key`, `config.pin_hash`) — niet verwijderd, `MANUAL_USER_VALIDATION_REQUIRED` (zie `docs/CONFIGURATION_SECURITY_CONTRACT.md`).

**Wijziging deze sprint (MS-F1-01):** GYM-RLS-SCOPING-001 van NOT STARTED → VALIDATED; nieuwe capability SEC-USERROLE-001 toegevoegd als CLOSED (privilege-escalatie-fix, gevonden tijdens deze sprint, niet in de oorspronkelijke audit).

**Expliciete status:** DB-verificatie is **VOLLEDIG UITGEVOERD** voor alle capabilities hierboven waar "DB" een kolom heeft — er is geen enkele capability meer waarvoor "DB VERIFIED ontbreekt" een geldige status is. De `index.html`-scherminventaris is **COMPLETED** (38 schermen, zie `docs/TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md` §3); wat nog open is, is uitsluitend **flow-niveau geautomatiseerde testdekking per scherm**, niet de inventarisatie zelf.
