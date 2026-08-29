# CURRENT_STATE — Trainingskompas

> Beschrijft uitsluitend wat NU waar is. Volledige releasegeschiedenis staat in `CHANGELOG.md` / `docs/RELEASE_HISTORY.md` / `docs/Sprintrapporten/`. Bijwerken na iedere afgeronde Story en iedere release — historische secties toevoegen aan de genoemde geschiedenisbronnen, niet aan dit document.

## Projectnaam
Trainingskompas — definitief (was Maurice Training Coach; appnaam vastgesteld 1 augustus 2026, zie DEC-010 en `docs/Brand/BRAND_IDENTITY.md`).

## Huidige versie
v4.69.13

## 1. Verified baseline
- **main SHA:** wordt bijgewerkt na merge (zie git log voor de actuele HEAD)
- **APP_VER:** v4.69.13 (zie "Huidige versie" hierboven — exacte kop vereist door `core/fAndroidRelease.test.js` H2, Wet 84-versiebumpcontrole; niet wijzigen zonder die test aan te passen)
- **Datum van deze stand:** 28 augustus 2026
- **Deployment:** Netlify auto-deploy vanaf `main`; GitHub Actions Quality Gate (comprehensive, discovery-based) is een vereiste check op `main` (protected branch)

## 2. Current roadmap position
- **F0 — Verified Baseline: CLOSED**
- **F1 — Foundation Closure: CLOSED** (Gate A semantische-integriteitsaudit geslaagd — 18/18 consistentiechecks, release gate groen, geen open P0/P1)
- **F2 — Athlete Core Excellence: CLOSED.** MS-F2-01 (Canonical Training Start & Preview) is herclassificeerd van PARTIAL naar **CLOSED** nadat GAP-P1-006 tijdens MS-F2-08 is gesloten: Programma-blok en Repeat Workout krijgen nu beide een canonieke `training_instances`-rij. Preview-UI blijft bewust gedifferentieerd voor deze twee bronnen — een gedocumenteerde productgrens, geen open architectuurgat. MS-F2-02 t/m MS-F2-07 blijven CLOSED. Final Contract Reconciliation bevestigde: geen resterende architectuurgap, gepreciseerde acceptance-wording vastgelegd. Zie `docs/MS-F2-01..08_*.md`.
- **F3 — Calculation/Context/Evidence Excellence: CONDITIONALLY CLOSED — non-blocking scientific/validation items open.** Alle 11 mastersprints eerlijk afgerond (MS-F3-04 blijft TESTED, geen kunstmatige CLOSED). GAP-P1-007 en GAP-P1-008 beide technisch en live gesloten. Volledig rapport: `docs/F3_MASTER_REPORT.md`.
- **F4 — Coach Intelligence: CLOSED — READY FOR F5 SELECTION.** Alle 6 F4-mastersprints eerlijk afgerond (MS-F4-01 blijft correct op TESTED, geen kunstmatige CLOSED). Volledig rapport: `docs/F4_MASTER_REPORT.md`.
- **F5 — Connected Athlete: SOFTWARE CLOSED — REAL DEVICE VALIDATION OPEN.** Alle 6 F5-mastersprints afgerond. Volledig rapport: `docs/F5_MASTER_REPORT.md`.
- **F6 — Endurance & Multisport Excellence: CURRENT (expliciet vrijgegeven door de Product Owner, 29 augustus 2026; Product Owner langere tijd niet beschikbaar — autonome uitvoering binnen de canonieke F6-scope).** MS-F6-01: **CLOSED**. MS-F6-02: **CLOSED, met een kritieke, cross-cutting AI-boundary-fix**. MS-F6-03: **CLOSED — hergebruik-sprint.** MS-F6-04: **CLOSED — rulebook-revalidatie afgerond.** MS-F6-05 (Triathlon & Brick Workflows): **CLOSED** — de centrale architectuurvraag ("kan TK één multisporttraining representeren zonder drie losstaande trainingen en zonder dubbeltelling?") is **JA, bewezen vanuit code**: triathlon/brick gebruikt letterlijk hetzelfde parent/child-segmentcontract als HYROX (`hyroxReconstructPerformance()`, vaste `segment_index`, één `training_instance_id`) — geen tweede multisportmodel gebouwd. **Geen actief load-dubbeltellingsrisico**: `sessionLoad()`/`unifiedLoad()` zijn nog niet in de runtime gewired, dus er bestaat vandaag geen aggregatiepad dat dit zou kunnen doen — eerlijk vastgelegd als een toekomstig aandachtspunt (GAP-P2-022). **Kritieke, aanvullende AI-boundary-fix**: de triathlon-coachingtekst instrueerde de AI om "automatisch" een taperschema op te stellen (geen geregistreerde Decision Rule) — gecorrigeerd, en proactief ook de milde running-variant meegecorrigeerd. **F6 open P1: 0.** Resterende F6-mastersprint (MS-F6-06) nog niet uitgevoerd.
- **Master Roadmap 2.0 v1.1 = CANONICAL** productstrategische bron. Repository blijft technische autoriteit. Zie `docs/DOCUMENTATION_GOVERNANCE.md`.
- Volledige fasering (F0-F15): zie `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md`. Volledige mastersprint-ID-migratie: zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md`.

## 3. Current product maturity (samenvatting — zie `docs/CAPABILITY_REGISTRY.md` voor detail)
Training Core, Calculation Engine, Context Engine, Decision Engine, Evidence Architecture, Recovery en Security/Platform staan op een volwassen niveau (TESTED/INTEGRATED/CLOSED, zie registry). Women's Performance, Commercial en Coach/Gym-platform zijn architecturaal voorbereid (DB-schema aanwezig) maar UI/RLS-scoping nog niet afgerond. Devices/Wearables zijn software-TESTED, real-device-validatie staat open.

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
- **Tests:** discovery-based release gate (lokaal én CI, schone checkout) — 118 testbestanden in `core/` ontdekt (+ `logic_tests.js` + 2 statische checks = 121 stappen totaal), 120 automatisch uitgevoerd, 1 zichtbaar geskipt (fAndroidRelease.test.js zonder gereproduceerde buildmap), 0 gefaald
- **Integration:** wearable-sync getest tegen de echte handler-functie; overige integraties overwegend unit-getest
- **Device:** **OPEN** — Concept2 PM5 en Google Health-sync hebben geen bevestigde real-device-validatie in productie
- **UX:** niet apart beoordeeld in de laatste consolidatiesprint (38 top-level schermen geïnventariseerd, geen flow-niveau UX-testdekking)
- **Scientific/evidence:** architectuur-niveau geverifieerd (`evidence_store.v1`, corroboratieregels); metric-voor-metric evidencelevel-audit (A-E) nog niet uitgevoerd

## 6. Current known blockers / decisions
- **5 openstaande Women's Performance-productbeslissingen** (zwangerschap, postpartum, menopauze, anticonceptie, bekkenbodem) — wachten op Maurice, zie `docs/Womens_Performance/DECISION_REQUIRED_*.md`
- ~~GYM-RLS-SCOPING-001 blokkeert Track 13 (Gym/Club/Team)~~ — **verouderd, gecorrigeerd:** GYM-RLS-SCOPING-001 is CLOSED/VALIDATED sinds MS-F1-01 (membership-scoped policies, live geverifieerd met 2 gescheiden tenants). Bovendien was het tracknummer fout: Gym/Club/Team Platform is **Track 15** (T13 is Social & Community), zie `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` §6. Track 15 (F11) mag inmiddels wél starten met echte multi-tenant-data — de RLS-dependency is gesloten.
- Overige, niet-blokkerende technische schuld: zie `docs/GAP_ANALYSIS_V2.md` P2-P4

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
