# CURRENT_STATE — Trainingskompas

> Beschrijft uitsluitend wat NU waar is. Volledige releasegeschiedenis staat in `CHANGELOG.md` / `docs/RELEASE_HISTORY.md` / `docs/Sprintrapporten/`. Bijwerken na iedere afgeronde Story en iedere release — historische secties toevoegen aan de genoemde geschiedenisbronnen, niet aan dit document.

## Projectnaam
Trainingskompas — definitief (was Maurice Training Coach; appnaam vastgesteld 1 augustus 2026, zie DEC-010 en `docs/Brand/BRAND_IDENTITY.md`).

## Huidige versie
v4.69.1

## 1. Verified baseline
- **main SHA:** wordt bijgewerkt na merge (zie git log voor de actuele HEAD)
- **APP_VER:** v4.69.1 (zie "Huidige versie" hierboven — exacte kop vereist door `core/fAndroidRelease.test.js` H2, Wet 84-versiebumpcontrole; niet wijzigen zonder die test aan te passen)
- **Datum van deze stand:** 28 augustus 2026
- **Deployment:** Netlify auto-deploy vanaf `main`; GitHub Actions Quality Gate (comprehensive, discovery-based) is een vereiste check op `main` (protected branch)

## 2. Current roadmap position
- **F0 — Verified Baseline: CLOSED**
- **F1 — Foundation Closure: CURRENT** — MS-F1-01 (Multi-tenant RLS Security Closure), MS-F1-02 (Observability Foundation) en MS-F1-03 (Secrets & Configuration Hygiene) zijn CLOSED; eerstvolgende stappen zijn MS-F1-04 (Normative Documentation Sync) en MS-F1-05 (Backup & Retention Decision) — zie `docs/GAP_ANALYSIS_V2.md` en `docs/ROADMAP_INDEX.json`
- **Master Roadmap 2.0 v1.1 = CANONICAL** productstrategische bron. Repository blijft technische autoriteit. Zie `docs/DOCUMENTATION_GOVERNANCE.md`.
- Volledige fasering (F0-F15): zie `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md`. Volledige mastersprint-ID-migratie: zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md`.

## 3. Current product maturity (samenvatting — zie `docs/CAPABILITY_REGISTRY.md` voor detail)
Training Core, Calculation Engine, Context Engine, Decision Engine, Evidence Architecture, Recovery en Security/Platform staan op een volwassen niveau (TESTED/INTEGRATED/CLOSED, zie registry). Women's Performance, Commercial en Coach/Gym-platform zijn architecturaal voorbereid (DB-schema aanwezig) maar UI/RLS-scoping nog niet afgerond. Devices/Wearables zijn software-TESTED, real-device-validatie staat open.

## 4. Current open priorities
Canonical bron: `docs/GAP_ANALYSIS_V2.md`.
- **Open P0: 0**
- **Open P1: 2** — AI-outputcontract ontbreekt (AI-OUTPUT-CONTRACT-001, MS-F4-01), AI-adaptive-programmering-gat t.o.v. Hevy Trainer (AI-PROGRAM-AUTOGEN-001, MS-F4-04)
- **MS-F1-01 (Multi-tenant RLS Security Closure) is CLOSED** — membership-scoped RLS op organizations/teams/training_groups/seasons/macrocycles/mesocycles/microcycles (`migratie_v498.sql`), plus een tijdens de sprint gevonden en gesloten P0 (self-privilege-escalatie via `users.gym_role`/`gym_id`/`system_role`, `migratie_v497.sql`)
- Open P2: 7 — incl. Handbook-drift en Commercial-UI, beide gedowngraded van P1 per Roadmap 2.0 v1.1
- Open P3/P4: zie `docs/GAP_ANALYSIS_V2.md` voor de volledige lijst

## 5. Current validation status
- **Code:** CODE VERIFIED tegen `main` @ bovenstaande SHA
- **DB:** VERIFIED — 69 tabellen, RLS gecontroleerd op alle tabellen, `gyms`-lek gesloten en geverifieerd via `SET LOCAL ROLE anon/authenticated/service_role`
- **Tests:** discovery-based release gate (lokaal én CI) — 78 testbestanden, 80 stappen automatisch uitgevoerd, 1 zichtbaar geskipt (Android-build-afhankelijk), 0 gefaald
- **Integration:** wearable-sync getest tegen de echte handler-functie; overige integraties overwegend unit-getest
- **Device:** **OPEN** — Concept2 PM5 en Google Health-sync hebben geen bevestigde real-device-validatie in productie
- **UX:** niet apart beoordeeld in de laatste consolidatiesprint (38 top-level schermen geïnventariseerd, geen flow-niveau UX-testdekking)
- **Scientific/evidence:** architectuur-niveau geverifieerd (`evidence_store.v1`, corroboratieregels); metric-voor-metric evidencelevel-audit (A-E) nog niet uitgevoerd

## 6. Current known blockers / decisions
- **5 openstaande Women's Performance-productbeslissingen** (zwangerschap, postpartum, menopauze, anticonceptie, bekkenbodem) — wachten op Maurice, zie `docs/Womens_Performance/DECISION_REQUIRED_*.md`
- **GYM-RLS-SCOPING-001 blokkeert Track 13 (Gym/Club/Team)** — mag niet starten met echte data vóór deze RLS-scoping-fix
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
