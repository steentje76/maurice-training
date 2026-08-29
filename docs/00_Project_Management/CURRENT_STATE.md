# CURRENT_STATE — Trainingskompas

> Beschrijft uitsluitend wat NU waar is. Volledige releasegeschiedenis staat in `CHANGELOG.md` / `docs/RELEASE_HISTORY.md` / `docs/Sprintrapporten/`. Bijwerken na iedere afgeronde Story en iedere release — historische secties toevoegen aan de genoemde geschiedenisbronnen, niet aan dit document.

## Projectnaam
Trainingskompas — definitief (was Maurice Training Coach; appnaam vastgesteld 1 augustus 2026, zie DEC-010 en `docs/Brand/BRAND_IDENTITY.md`).

## Huidige versie
v4.69.6

## 1. Verified baseline
- **main SHA:** wordt bijgewerkt na merge (zie git log voor de actuele HEAD)
- **APP_VER:** v4.69.6 (zie "Huidige versie" hierboven — exacte kop vereist door `core/fAndroidRelease.test.js` H2, Wet 84-versiebumpcontrole; niet wijzigen zonder die test aan te passen)
- **Datum van deze stand:** 28 augustus 2026
- **Deployment:** Netlify auto-deploy vanaf `main`; GitHub Actions Quality Gate (comprehensive, discovery-based) is een vereiste check op `main` (protected branch)

## 2. Current roadmap position
- **F0 — Verified Baseline: CLOSED**
- **F1 — Foundation Closure: CLOSED** (Gate A semantische-integriteitsaudit geslaagd — 18/18 consistentiechecks, release gate groen, geen open P0/P1)
- **F2 — Athlete Core Excellence: CLOSED.** MS-F2-01 (Canonical Training Start & Preview) is herclassificeerd van PARTIAL naar **CLOSED** nadat GAP-P1-006 tijdens MS-F2-08 is gesloten: Programma-blok en Repeat Workout krijgen nu beide een canonieke `training_instances`-rij. Preview-UI blijft bewust gedifferentieerd voor deze twee bronnen — een gedocumenteerde productgrens, geen open architectuurgat. MS-F2-02 t/m MS-F2-07 blijven CLOSED. Final Contract Reconciliation bevestigde: geen resterende architectuurgap, gepreciseerde acceptance-wording vastgelegd. Zie `docs/MS-F2-01..08_*.md`.
- **F3 — Calculation/Context/Evidence Excellence: CURRENT (CONDITIONALLY CLOSED — non-blocking scientific/validation items open, F4 nog niet vrijgegeven).** Alle 11 mastersprints eerlijk afgerond (MS-F3-04 blijft TESTED, geen kunstmatige CLOSED). GAP-P1-007 (de enige mastersprint-acceptance-gate-blokkerende P1) technisch en live gesloten. Tijdens de F3 Final Integration Audit een apart, nieuw datakwaliteitsrisico ontdekt (GAP-P1-008, hrv_log-race-condition, bewezen niet theoretisch) dat niet door een mastersprint-acceptance-gate werd vereist maar wel materieel relevant is — reden voor CONDITIONALLY CLOSED i.p.v. een volmondige CLOSED. Volledig rapport: `docs/F3_MASTER_REPORT.md`. **F4 vereist een nieuwe, expliciete vrijgave.**
- **Master Roadmap 2.0 v1.1 = CANONICAL** productstrategische bron. Repository blijft technische autoriteit. Zie `docs/DOCUMENTATION_GOVERNANCE.md`.
- Volledige fasering (F0-F15): zie `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md`. Volledige mastersprint-ID-migratie: zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md`.

## 3. Current product maturity (samenvatting — zie `docs/CAPABILITY_REGISTRY.md` voor detail)
Training Core, Calculation Engine, Context Engine, Decision Engine, Evidence Architecture, Recovery en Security/Platform staan op een volwassen niveau (TESTED/INTEGRATED/CLOSED, zie registry). Women's Performance, Commercial en Coach/Gym-platform zijn architecturaal voorbereid (DB-schema aanwezig) maar UI/RLS-scoping nog niet afgerond. Devices/Wearables zijn software-TESTED, real-device-validatie staat open.

## 4. Current open priorities
Canonical bron: `docs/GAP_ANALYSIS_V2.md`.
- **Open P0: 0**
- **Open P1: 3, met expliciet onderscheid in scope** (nooit een ongescopeerde "P1 bestaat" zonder aan te geven wát hij blokkeert):
  - AI-outputcontract ontbreekt (AI-OUTPUT-CONTRACT-001) — **F4-fase-item**, target MS-F4-01, blokkeert F2/F3 niet.
  - AI-adaptive-programmering-gat t.o.v. Hevy Trainer (AI-PROGRAM-AUTOGEN-001) — **F4-fase-item**, target MS-F4-04, blokkeert F2/F3 niet.
  - **GAP-P1-008 (nieuw, F3 Final Integration Audit):** bewezen — niet theoretisch — race-condition-risico op `hrv_log`: 4 bestaande paren duplicate `(user_id,date)`-rijen live gevonden, waarvan één paar (18 augustus) échte datadivergentie toont (`rhr=null` vs. `rhr=57`). Geen `UNIQUE`-constraint, geen atomaire upsert. **Geen F3-mastersprint-acceptance-gate vereiste dit expliciet op te lossen** (dus geen F3-fase-blokkerende P1 in dezelfde zin als GAP-P1-007 was), maar wel een reëel, onopgelost datakwaliteitsrisico in dezelfde Recovery-keten. Vereist een cleanup-plan vóórdat een constraint veilig kan worden toegevoegd — bewust niet binnen deze audit-sprint geforceerd.
  - **F3-phase open P1 (mastersprint-acceptance-gate-blokkerend): 0.** GAP-P1-007 is CLOSED via MS-F3-10.
- **MS-F1-01 (Multi-tenant RLS Security Closure) is CLOSED** — membership-scoped RLS op organizations/teams/training_groups/seasons/macrocycles/mesocycles/microcycles (`migratie_v498.sql`), plus een tijdens de sprint gevonden en gesloten P0 (self-privilege-escalatie via `users.gym_role`/`gym_id`/`system_role`, `migratie_v497.sql`)
- Open P2: 7 — incl. Handbook-drift en Commercial-UI, beide gedowngraded van P1 per Roadmap 2.0 v1.1
- Open P3/P4: zie `docs/GAP_ANALYSIS_V2.md` voor de volledige lijst

## 5. Current validation status
- **Code:** CODE VERIFIED tegen `main` @ bovenstaande SHA
- **DB:** VERIFIED — 69 tabellen, RLS gecontroleerd op alle tabellen, `gyms`-lek gesloten en geverifieerd via `SET LOCAL ROLE anon/authenticated/service_role`
- **Tests:** discovery-based release gate (lokaal én CI, schone checkout) — 100 testbestanden in `core/` ontdekt (+ `logic_tests.js` + 2 statische checks = 103 stappen totaal), 102 automatisch uitgevoerd, 1 zichtbaar geskipt (`fAndroidRelease.test.js`, ontbrekende Android-buildmap in deze schone checkout — draait wél in echte CI via `npm run cap:copy`, en lokaal na een expliciete reproductie: dan 102/102, 0 geskipt), 0 gefaald
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
