# Functional >=9 Reality Matrix v2 — drie assen

Vervangt de v1-matrix (blijft bestaan als historisch document, zie
PR-completeness-check). Elke score expliciet gesplitst in:

**A. SOFTWARE MATURITY** (bestaat de code/schema/logica, getest?)
**B. DATA POPULATION / USAGE** (wordt het echt gebruikt?)
**C. EXTERNAL / REAL-WORLD VALIDATION** (buiten software bevestigd?)

Harde regel: 0 database-rijen betekent NIET automatisch B=0 als er
uberhaupt geen schrijf-pad is uitgeprobeerd; maar een tabel met een
bevestigd, werkend schrijf-pad en 0 rijen betekent wel degelijk B=0
(nooit daadwerkelijk gebruikt).

| Domein | A. Software maturity | B. Data population | C. External validation | Notes |
|---|---|---|---|---|
| Training Core | 9 (code+tests+RLS bevestigd) | 9 (103-161 rijen per tabel, actief) | 8 (dagelijks zelf-gebruikt door PO als atleet) | sterkste domein in de app |
| Recovery/Health/Body | 9 | 8 (73 hrv-rijen, 44 weight-rijen) | 7 (eigen wearable-koppeling) | volledige functionele keten eerder bevestigd |
| AI Coach (chat/programming) | 9 (coaching.js: 80/80 tests, coachProgramming.js: 13/13 tests) | 8 (chat_history: 77 rijen) | onbekend (niet extern gevalideerd deze sessie) | duidelijk onderscheiden van Human Coach hieronder |
| Human Coach (relaties/roster/access) | 3 -- code bestaat (coachAccess.js, coachRoster.js, coachProgram.js) maar GEEN test-bestand gevonden, en GEEN enkele aanroep vanuit index.html (0 treffers, bevestigd) | 0 (coach_athlete_relationships: 0 rijen) | 0 | **IMPLEMENTED, NOT TESTED, NOT INTEGRATED** -- dit is de meest precieze classificatie, niet simpelweg "architecture only" |
| Nutrition (macro-logger) | 6 (werkend CRUD-scherm, geen tests gevonden) | 0 (0 rijen) | 0 | zie eerdere audit, ongewijzigd |
| Nutrition (productdatabase/barcode/supplementen) | 0 (geen schema) | 0 | 0 | volledig ontbrekend |
| Samen (connections/groups/challenges backend) | 6 (CRUD-code bevestigd, RLS aan, geen tests gevonden in deze sessie) | 0-1 (vrijwel alle tabellen 0, groups:1) | 0 | geen centraal scherm |
| Samen (messaging) | 0 | 0 | 0 | geen tabel gevonden |
| Periodisering (seasons/macro/meso/microcycles) | 2 -- schema bestaat (RLS aan), maar 0 treffers voor deze tabelnamen in index.html: **geen enkele CRUD/UI-code gevonden**, ook geen apart core-bestand zoals bij Coach | 0 | 0 | zuiverder "ARCHITECTURE ONLY" dan Human Coach -- hier is zelfs geen losse module geschreven |
| Devices/Wearables | 5 (1 echte koppeling, generieke external_connections-laag leeg) | 2 | 2 (1 eigen account) | Concept2 niet apart in deze sessie geverifieerd |
| Commercial/Entitlements | 6 (plan/feature/quota-architectuur compleet) | 0 (transacties: 0 rijen) | 0 | betaalstroom-realiteit onbevestigd |
| Team/Gym/Club (legacy) | 6 (1 organization, 1 gym, 4 memberships -- vermoedelijk PO's eigen testomgeving) | 2 | 2 | canonieke MS-F11-laag (locations/team_events) apart: 0/0/0 |

**Belangrijke correctie t.o.v. v1:** Human Coach kreeg eerder impliciet
een "architecture only"-classificatie die te dicht aanleunde tegen
Periodisering. Nu expliciet onderscheiden: Human Coach heeft wel
degelijk meerdere, doordachte code-modules (~4 bestanden), Periodisering
heeft geen enkele. Beide zijn A<5, maar om verschillende redenen.

---

## AANVULLING (Audit Closure Sprint) — voorheen NOT YET DEEPLY AUDITED

### Exercise Intelligence / Sport-specifiek — FULL STACK, sterk getest

Bewijs: 24+ toegewijde testbestanden (fB9_02RunningCore t/m
fB9_06MultisportIntegration, fRowingErgIntelligence, fHyroxTriathlon,
fHyroxRulebookRevalidation, fB9_H2CTeamOperations, teamPerformance,
fGlobalExerciseAuthority, fExerciseLibrary, fExerciseProgressionCoach),
allemaal individueel gedraaid en groen bevestigd in deze sessie (niet
alleen aangenomen via de release gate).

| Sport/domein | Software maturity | Data population | External validation |
|---|---|---|---|
| Running | 9 (21+17 tests groen) | bevestigd via activities (3 rijen) | UNKNOWN — EXTERNAL VALIDATION REQUIRED (echt device/GPS-track niet in deze sessie getest) |
| Cycling | 9 (22+14 tests groen) | idem | UNKNOWN — EXTERNAL VALIDATION REQUIRED |
| Rowing/Concept2 | 8 (6 tests groen, kleinere suite) | idem | UNKNOWN — EXTERNAL VALIDATION REQUIRED (Concept2 PM5-koppeling niet hardware-getest deze sessie) |
| HYROX/Triathlon | 9 (rulebook-revalidatie + volledige keten getest) | activities/race_segments (3 rijen) | software closed, external device n.v.t. voor dit format |
| Multisport | 8 (11 tests groen) | idem | n.v.t. |
| Team | 9 (21+teamPerformance groen) | organizations:1, memberships:4 | echte-gebruik-validatie: laag (weinig teams-rijen) |
| Exercise library/authority | 9 (10+10+8 tests groen) | exercises:103, echt gebruikt | n.v.t. (geen externe hardware) |

**Correctie op eerdere impliciete aanname:** dit domein is NIET
"onderbelicht" -- het is, naast Training Core, het best-geteste domein
in de hele applicatie.

### Calculation/Evidence/Decision Registries — FULL STACK, reeds gesloten sprint

Bewijs: `docs/CALCULATION_REGISTRY.md` (704 regels), `docs/
MS-F3-09_EVIDENCE_REGISTRY_AUDIT.md`, `docs/DECISION_RULE_REGISTRY.md`,
met bijbehorende, individueel bevestigde tests:
- fCalculationRegistryCoverage: 5/5
- fCalculationRegistryStrength: 56/56
- fEvidenceClaimAudit: 21/21 (reproduceerbare, machine-getelde evidence-
  classificatie: 23 calculations met evidence A-E, 9 Decision Rules,
  0 rules die ten onrechte A/B claimen)
- fDecisionRuleRegistry: 20/20

**Classificatie: FULL STACK.** Dit is een eerder al formeel afgesloten
sprint (MS-F3-09, status CLOSED in het eigen document) met een
reproduceerbare, adversarieel-geteste governance-laag. Twee eerdere
overclaims zijn daarin zelf al gecorrigeerd (geen "crash-bescherming"
als ontworpen mechanisme, AI-fabricatie-preventie is prompt-niveau, geen
technische afdwinging -- expliciet als open F4-item genoteerd, niet
verzwegen).

### Platform / Security -- FULL STACK, zeer breed getest

Bewijs: 27 toegewijde RLS/security-testbestanden gevonden; steekproef
van 8 kern-bestanden individueel gedraaid in deze sessie, allemaal
groen (fCoachAccessRls 16/16, fDeleteAccountSecurity 27/27,
fEntitlementRls 18/18, fGymRlsMultiTenant 22/22, fSocialRlsMultiTenant
14/14, fWearableAuthSecurity 20/20, fWomensPrivacyConsent 9/9,
fUsersCommercialAuthority 16/16).

**Classificatie: FULL STACK voor de geteste RLS/multi-tenant/privacy-
laag.** Niet apart in deze sessie geverifieerd: productie-observability/
telemetrie-activatie (eerder al als PARTIAL/ARCHITECTURE ONLY
vastgesteld via `client_telemetry_events`: 3 rijen) en support/admin-
tooling (niet onderzocht) -- deze blijven UNKNOWN, niet aangenomen als
FULL STACK.

### Nog steeds UNKNOWN — EXTERNAL VALIDATION REQUIRED (niet "not investigated")

- Running/Cycling/Rowing: echte GPS-track/hardware-validatie
- Concept2 PM5: echte, live hardware-koppeling
- Devices/Wearables buiten de ene bevestigde koppeling: echte provider-
  accounts
- Commercial: echte betaaltransactie via een live payment-provider

### Nog steeds NOT INVESTIGATED deze sessie (expliciet, geen aanname gedaan)

- Notifications (creation/delivery/preferences) -- geen code-inspectie
  uitgevoerd in deze sessie
- Profile/Account avatar-upload-flow (technisch) -- niet apart
  geinspecteerd
- Research/Scientific cohort-export-mechanisme in detail
- Error/empty/degraded-states app-brede steekproef (Fase 15) -- niet
  systematisch doorlopen
