# NIGHT PREPARATION REPORT — Target UX/Product Architecture

**Actuele main SHA:** e3b8518a187b54d82456e47bfa19b58c64b29bce, APP_VER v4.69.52
**Target-architectuurbranch SHA:** origin/docs/target-product-architecture @ 1fade944a8194ff7fe930d10520aaa314a9e29b6
**Gelezen architectuurdocumenten:** TRAININGSKOMPAS_TARGET_PRODUCT_ARCHITECTURE.md (volledig), PRODUCT_ARCHITECTURE_FINAL_COMPLETENESS_AUDIT.md (volledig), PRODUCT_ARCHITECTURE_COACH_DETAIL.md (gedeeltelijk), PRODUCT_ARCHITECTURE_TOGETHER_DETAIL.md (gedeeltelijk). De overige 22 detail-documenten zijn NIET individueel, volledig gelezen binnen deze sessie se tijdsbudget -- gemarkeerd als UNKNOWN waar relevant.

**Aantal gevonden CURRENT screens/routes:** 44 scherm-containers, 37 direct navigeerbaar (zie vorige inventaris, `SCREEN_INVENTORY.md`).
**Aantal gevonden CURRENT capabilities:** 25 (zie `PRODUCT_ARCHITECTURE_INVENTORY.md` uit de vorige sessie).

---

## OPDRACHT 1 — CURRENT → TARGET Capability Mapping (samenvatting; volledige matrix in Opdracht 2)

| CURRENT | TARGET domein | Status |
|---|---|---|
| s-home | Vandaag | CURRENT bestaat, TARGET vereist Quick Action Registry (nieuw) — GAP |
| s-train-mgr/s-running/s-cycling/s-hyrox/s-builder/s-guided | Trainen | CURRENT bestaat grotendeels, TARGET voegt "Vrij trainen"/"Routes"/generiek sportmodel toe — GAP (uitbreiding) |
| s-kalender | Trainen → Planning & Kalender | CURRENT bestaat maar TARGET vereist een sportoverstijgende, single-source kalender met een expliciet statusmodel (PLANNED/READY/STARTED/...) — CONFLICT (huidige kalender waarschijnlijk niet dit statusmodel, UNKNOWN zonder diepere code-audit) |
| s-programma/s-programma-detail | Trainen → Programma's | CURRENT bestaat, TARGET voegt Coach/Team-programmatypen expliciet toe — GAP |
| s-hist | Inzicht → Historie | CURRENT bestaat, TARGET vereist Planned-vs-Actual als aparte, bewaarde feiten — UNKNOWN of dit al zo werkt |
| s-lich-health, Decision Engine readiness | Inzicht → Recovery | CURRENT bestaat en is grondig getest (B9-H4) — GEEN GAP qua architectuur |
| s-lich-cyclus | Inzicht → Women's Performance | CURRENT bestaat (B9-H5), TARGET bevestigt pregnancy/postpartum/menopause blijft Product Owner-beslissing — GEEN NIEUWE GAP |
| s-nutrition | Inzicht → nutrition insights + Trainen/dagelijks → nutrition logging | CURRENT bestaat, TARGET voegt library/supplements/evidence-governance toe — GAP (uitbreiding, apart detail-document) |
| s-coach (AI-chat) | Coach → AI Coach | CURRENT bestaat, TARGET-contract (afzender altijd zichtbaar: AI vs mens vs regel) is NIET aantoonbaar geïmplementeerd — GAP |
| Coach/PT-backend (F10, B9-H2D) | Coach → Mijn coach/coaches, Programma's & opdrachten, Feedback, Berichten | CURRENT: 0 UI. TARGET vereist dit volledig zichtbaar binnen Coach-tab — **GROOTSTE GAP: UI REQUIREMENT OPEN, backend grotendeels al aanwezig** |
| Coach notes/feedback | Coach → Feedback | CURRENT: niet gebouwd (bevestigd B9-H2D-audit) — GAP (backend + UI) |
| s-social | Samen → Social/feed/connections/groepen/challenges | CURRENT bestaat, TARGET voegt expliciet berichtenplatform (1e-klas, niet alleen comments) toe — GAP |
| Team Operations-backend (B9-H2C) | Samen → Teams | CURRENT: 0 UI. TARGET vereist dit binnen Samen — **GROOTSTE GAP: UI REQUIREMENT OPEN, backend al aanwezig** |
| s-admin (legacy gym) + organizations/teams/memberships (canoniek, B9-H2A/B) | Samen → Gym/Club-context + apart Gym/Club-webportaal (TARGET) | CURRENT: dubbel model (legacy actief, canoniek ongebruikt). TARGET vereist canoniek model + webportaal — **CONFLICT: legacy model moet worden uitgefaseerd, canoniek model heeft nog geen UI** |
| s-profiel/s-settings/s-privacy | Profiel & Instellingen (buiten de 5 tabs) | CURRENT bestaat, TARGET voegt centrale avatar-architectuur (PROFILE-AVATAR-001) toe, hergebruikt in Social/Team/Coach/Gym — GAP (nieuw, cross-domein concept) |
| Devices-koppelkaart (binnen Lichaam/Settings) | Profiel & Instellingen → Apparaten & koppelingen | CURRENT bestaat als kaart, geen eigen scherm. TARGET plaatst dit expliciet in Profiel/Instellingen — kleine verplaatsing, geen functionele GAP |
| Entitlement-gating | Profiel & Instellingen → Abonnement | CURRENT: 0 checks (bevestigd B9-H2D). TARGET vereist een expliciet entitlement-model gescheiden van authorization — **GAP, en expliciet genoemd als "known open Product Owner decision, not architecture blocker"** |
| Account deletion/export (delete-account.js) | Profiel & Instellingen → Data/export | CURRENT bestaat, grondig getest — GEEN GAP |

---

## OPDRACHT 2 — Navigatiemigratiematrix

| CURRENT LOCATION | CURRENT FUNCTIE | TARGET DOMEIN | TARGET LOCATION | BACKEND DEPENDENCIES | MIGRATION RISK | UX DECISION REQUIRED |
|---|---|---|---|---|---|---|
| s-home | Dagoverzicht | Vandaag | Vandaag (ongewijzigd concept) | Calculation/Context/Decision (bestaand) | LAAG | Quick Action Registry-ontwerp |
| s-train-mgr | Training-hub | Trainen | Trainen-overzicht | bestaand | LAAG | sportkeuze-UX |
| s-kalender | Kalender | Trainen | Planning & Kalender | mogelijk backend-uitbreiding nodig (statusmodel) | MEDIUM | kalender-sync-scope (fase 1 vs 2) |
| s-programma/-detail | Programma's | Trainen | Programma's | bestaand + Coach/Team-programmatypen | MEDIUM | onderscheid Training-maken vs Programma-maken |
| s-hist | Historie | Inzicht | Historie | bestaand, mogelijk Planned-vs-Actual-uitbreiding | MEDIUM | activiteitdetail-generieke-structuur |
| s-stats/s-doelen | Voortgang/Doelen | Inzicht | Inzicht (trends/doelen) | bestaand | LAAG | — |
| s-lich-health | Recovery | Inzicht | Recovery | bestaand, grondig getest | LAAG | — |
| s-lich-cyclus | Women's Performance | Inzicht | Women's Performance | bestaand | LAAG | — |
| s-nutrition | Nutrition | Inzicht + Trainen | Nutrition insights + logging | bestaand, library/evidence-governance-uitbreiding extern | MEDIUM | licensing (extern, niet UX) |
| s-coach | AI Coach | Coach | AI Coach | bestaand | LAAG | afzender-transparantie-contract implementeren |
| **(geen huidig scherm)** | Coach/PT-relatiebeheer | Coach | Mijn coach/coaches, Programma's & opdrachten | **volledig aanwezig, F10/B9-H2D** | **HOOG (nieuw scherm, 0 precedent)** | **JA — volledig nieuw scherm** |
| **(geen huidig scherm)** | Coach notes/feedback | Coach | Feedback | **niet gebouwd** | HOOG | JA — backend-ontwerp + scherm |
| s-social | Social | Samen | Samen (feed/connections/groepen/challenges) | bestaand | MEDIUM | berichtenplatform-uitbreiding |
| **(geen huidig scherm)** | Team-events/attendance/taken | Samen | Teams | **volledig aanwezig, B9-H2C** | **HOOG (nieuw scherm, 0 precedent)** | **JA — volledig nieuw scherm** |
| s-admin | Gym-beheer (legacy) | Samen | Gym/Club-context + apart webportaal | canoniek model aanwezig, legacy actief | **HOOG (dual-model-uitfasering)** | **JA — migratiestrategie legacy→canoniek** |
| s-profiel/s-settings/s-privacy | Profiel/instellingen | Profiel (buiten 5 tabs) | Profiel & Instellingen | bestaand + avatar-architectuur nieuw | MEDIUM | avatar-hergebruik-ontwerp |
| Devices-kaart (binnen Lichaam) | Wearable-status | Profiel & Instellingen | Apparaten & koppelingen | bestaand | LAAG | verplaatsing van Lichaam naar Profiel |
| **(geen huidig scherm)** | Entitlement/abonnement | Profiel & Instellingen | Abonnement | 0 backend | HOOG | Product Owner-beslissing eerst (prijzen/tiers) |

---

## OPDRACHT 3 — Home/Vandaag Forensic Audit

| Component (huidig, `renderHomeContextCard`/`renderCoachAdvies`/`renderTodayCta`/`renderWeekStats`/`renderMotivatie`/`renderQuickActions`/`renderHomeProgramCard`) | Behouden/verplaatsen/combineren/conditioneel/vervangen/verwijderen | Canonical data/engine erachter |
|---|---|---|
| Coach-advieskaart | BEHOUDEN, concept matcht TARGET "Coachadvies" | Decision Engine + AI Coach-uitleg-laag |
| Vandaag-CTA (geplande training) | BEHOUDEN, matcht TARGET "Training(en) van vandaag" | Planning/Kalender (canoniek) |
| Weekstats | BEHOUDEN of COMBINEREN met "Recente voortgang" | Calculation Engine (volume/trends) |
| Motivatieboodschap | CONDITIONEEL TONEN (TARGET noemt dit niet expliciet als kernonderdeel) | onbekend, mogelijk statisch/tekstueel, geen canonical engine gevonden binnen deze sessie |
| Quick Actions | VERVANGEN door de nieuwe, personaliseerbare Quick Action Registry (TARGET-vereiste, nieuw concept, nog niet gebouwd) | nieuw te bouwen registry |
| Programma-kaart | BEHOUDEN, matcht TARGET "Planning vandaag" | Programma's (canoniek) |
| Herstel/readiness | **ONTBREEKT EXPLICIET IN DE HUIDIGE HOME-RENDER-LIJST** (zit in s-lich-health, niet zichtbaar op s-home zelf) — TARGET vereist dit WEL op Vandaag: TOEVOEGEN | Decision Engine readiness-signalen (bestaand, alleen niet op Home getoond) |
| Weer | Niet teruggevonden als bestaande Home-component binnen deze sessie se scope — UNKNOWN of dit al bestaat elders | onbekend |
| Team-knoppen | Niet gevonden op s-home (want Team heeft geen UI) — TOEVOEGEN zodra Team-UI bestaat | Team Operations-backend (bestaand) |

**Geen redesign uitgevoerd, conform de opdracht.**

---

## OPDRACHT 4 — FUNCTIONAL_PRESERVATION_REGISTER

Capabilities zonder eigen scherm die tijdens UX-herstructurering makkelijk verloren kunnen gaan:

1. **Team Operations volledige backend** (event-lifecycle, availability/attendance-splitsing met staff-RLS-fix, responsibilities, notificaties) — 0 UI vandaag, moet in Samen landen.
2. **Coach/PT volledige backend** (relationship-consent-lifecycle, access-scopes, roster, program-templates, assignment, content-materialisatie, AI-intelligence-whitelist) — 0 UI vandaag, moet in Coach landen.
3. **Canonieke organizations/memberships/teams** — bestaat parallel aan de actieve, legacy `users.gym_id`-laag; bij UX-migratie mag de legacy-laag niet zomaar verdwijnen zonder dat de canonieke laag eerst een UI heeft.
4. **HRV-metric-type-provenance** (`hrv_log.hrv_metric_type`, net toegevoegd) — subtiel databaseveld, geen UI-representatie, kan makkelijk vergeten worden bij een Recovery-scherm-redesign.
5. **Manual data protection** (`data_quality='user_corrected'`-bescherming in `upsert_provider_activity()`) — onzichtbare RPC-logica, moet blijven werken ongeacht welk scherm straks activiteiten toont.
6. **Cyclus-fase-confidence** (`estimatedPhaseConfidence()`) — moet zichtbaar/gerespecteerd blijven in elk toekomstig Women's Performance-scherm, anders herintroduceert een redesign het "forced 28-day model"-risico.
7. **AI Coach-boundary-contract** (afzender altijd traceerbaar) — geen huidige, aantoonbare UI-implementatie van dit TARGET-principe; risico dat een redesign dit niet expliciet meeneemt.
8. **Account deletion-dekking** (>30 tabellen in `delete-account.js`) — bij elk nieuw scherm/elke nieuwe tabel moet deze lijst worden bijgewerkt, makkelijk te vergeten.
9. **Coach-scope-isolatie** (`RECOVERY_HEALTH` vs `WOMENS_PERFORMANCE` als aparte scopes) — bij een Coach-scherm-implementatie moet dit onderscheid behouden blijven, niet samengevoegd tot één "gezondheidsscope".
10. **Idempotency-registratie** (`IDEMPOTENT_TABELLEN_MET_CLIENT_ID`) — elke nieuwe, client-gegenereerde-ID-tabel moet hierin worden opgenomen; makkelijk te missen bij nieuwe schermen die nieuwe tabellen introduceren.

---

## OPDRACHT 5 — Nieuwe architectuur versus huidige database

| Onderwerp | CURRENT | TARGET | GAP/CONFLICT |
|---|---|---|---|
| Gym/organization | `users.gym_id` (legacy, actief) + `organizations`/`memberships`/`teams` (canoniek, B9-H2A/B, ongebruikt door UI) | Eén canoniek model, legacy uitgefaseerd | **CONFLICT — expliciet genoemd in de TARGET-audit zelf als "remaining architectural risk area #1"** |
| Team-UI | 0% | Team volledig zichtbaar in Samen | GAP (UI, backend bestaat) |
| Coach/PT-UI | 0% | Coach volledig zichtbaar in Coach-tab | GAP (UI, backend bestaat grotendeels) |
| Entitlements | 0 checks gevonden | Expliciet gescheiden van authorization (TARGET-principe #5 in risk areas) | GAP |
| Events/competition | HYROX/segments bestaan (canoniek), generiek "Event"-object voor alle sporten NIET bevestigd | Events als eersteklas object, los van Participation/Planned Item/Execution/Result | UNKNOWN of dit generieke onderscheid al bestaat, waarschijnlijk GAP |
| Nutrition | `nutrition_entries` bestaat, timing-context | Library/supplements/evidence-governance, externe data-licensing | GAP (extern + backend-uitbreiding) |
| Devices | Google Health + Concept2 volledig | Generiek, sport-onafhankelijk devicemodel; contextual device connection | Grotendeels aanwezig (B9-H3B-architectuur is al provider-onafhankelijk), UNKNOWN voor de "contextual" laag specifiek |
| Research | niet gevonden | Aparte, expliciete research-consent-laag (TARGET, apart van feature-consent) | GAP, mogelijk product-owner-decision |
| Profile/avatar | basis-profiel bestaat (s-profiel) | Centrale avatar-bron, hergebruikt cross-domein | GAP (nieuw, cross-domein concept) |
| Notifications | `social_notifications` bestaat, hergebruikt voor team | TARGET vereist een aparte "Notifications/Reminders Policy"-laag (apart detail-document, niet volledig gelezen) | UNKNOWN, waarschijnlijk uitbreiding |
| Consent scopes | RECOVERY_HEALTH/WOMENS_PERFORMANCE apart | TARGET bevestigt dit patroon (feature/storage/coach-sharing/AI/research apart) | Grotendeels al conform, research-consent apart is UNKNOWN of al zo werkt |

**Geen migraties uitgevoerd, conform de opdracht.**

---

## OPDRACHT 6 — Routing/Navigation Technical Preparation

**Huidig mechaniek:** `go('s-<id>')` toont het bijbehorende `<div class="scr" id="s-<id>">`-element (client-side, geen URL-routing/geen deep-linking-infrastructuur teruggevonden binnen deze sessie se scope — UNKNOWN of deep links elders bestaan). Bottom-navigatie: 5 vaste knoppen (Home/Training/Lichaam/Coach/Voortgang), elk met een eigen `go()`-aanroep. Modals/sheets: niet apart geïnventariseerd binnen deze sessie (tijdsbudget).

**Papieren migratiestrategie (NIET geïmplementeerd) naar de 5 nieuwe hoofddomeinen:**
1. Nieuwe top-level `go()`-doelen definiëren: `s-vandaag`, `s-trainen`, `s-inzicht`, `s-coach-hub`, `s-samen` (namen indicatief).
2. Bestaande schermen worden NIET verwijderd maar HERGROEPEERD onder de nieuwe hoofddomeinen (bijv. `s-running`/`s-cycling`/`s-hyrox` blijven bestaan, worden bereikbaar via `s-trainen` in plaats van rechtstreeks vanaf de bottom-nav).
3. De bottom-navigatie zelf wijzigt van 5 huidige naar 5 nieuwe knoppen — dit is een MATERIËLE navigatiewijziging en valt onder de expliciete stopregel; NIET uitgevoerd.
4. Coach/Team/Gym-nieuwe-schermen worden pas als losse routes toegevoegd NA Product Owner-goedkeuring van het concrete scherm.

---

## OPDRACHT 7 — Regression Protection (testontwerp, niet gebouwd)

| Testgebied | Voorgestelde aanpak |
|---|---|
| Route reachability | Voor elk van de 44 scherm-ID's: automatisch bevestigen dat `go('s-<id>')` het scherm toont zonder crash (huidige `fA5DeviceConnectE2E`-achtige patroon herbruikbaar) |
| Workout start/execution/logging | Bestaande `fConcept2*`/`cardio.test.js`-patronen uitbreiden naar alle sporten |
| Planning | Nieuwe test: elk statusmodel-overgang (PLANNED→READY→STARTED→...) expliciet testen zodra gebouwd |
| Programs | Bestaande programma-tests (niet deze sessie geaudit) hergebruiken |
| History | Activiteitdetail-generieke-structuur-test (nieuw, zodra Planned-vs-Actual gebouwd is) |
| Calculations | Bestaande, uitgebreide suite (Running/Cycling/Recovery/Women's Performance) blijft de basis |
| Recovery | `fB9_H4RecoveryHealthContext`-suite als basis |
| AI Coach | Nieuw: afzender-transparantie-contract-test (AI vs mens vs regel altijd onderscheidbaar) |
| Social | Bestaande B9-07/08-suites |
| Team | `fB9_H2CTeamOperations`-suite als basis, uit te breiden zodra UI bestaat |
| Coach/PT | F10 + B9-H2D-suites als basis |
| Gym/Club | Nieuw: expliciete "legacy vs canoniek"-consistentietest tijdens de uitfasering |
| Devices | `fWearable*`/`fB9_H3B/C`-suites als basis |
| Offline | Bestaande `sbPostQ`/`IDEMPOTENT_TABELLEN`-patronen |
| Privacy/RLS | Het herhaaldelijk bewezen patroon (anon/cross-user/coach-scope) op elke nieuwe tabel toepassen |
| Consent | `fWomensPrivacyConsent`-patroon als basis voor een generiek consent-test-sjabloon |
| Export/delete | Bestaande, groeiende `delete-account.js`-dekkingstest |

---

## OPDRACHT 8 — UX Dependency Map (aanbevolen ontwerpvolgorde)

Conform de TARGET-audit se eigen, expliciete "Screen architecture work order" (sectie 15 van `PRODUCT_ARCHITECTURE_FINAL_COMPLETENESS_AUDIT.md`), herbevestigd als logisch en consistent met de opdracht se eigen gewenste volgorde:

1. Globale navigatie/shell + rolwisseling
2. Vandaag
3. Trainen-overzicht
4. Planning/Kalender
5. Programma's
6. Workout Builder/Training maken
7. Execution — Strength
8. Execution — Running/Cycling
9. Execution — Ergometer/Hybrid/Multisport
10. Historie/Activiteitdetail/Vergelijken
11. Inzicht
12. Coach AI/Human
13. Samen/Social/Groepen/Team
14. Nutrition
15. Events
16. Profiel/Privacy/Devices/Instellingen
17. Abonnement/paywall
18. Gym/Club-webportaal
19. Onboarding/conversationele activatie
20. Admin/support/research

**Rationale voor Coach (12) vóór Samen (13):** Coach/PT-backend is verder gevorderd en grondiger getest (F10: 79+ tests) dan de generieke Samen-uitbreidingen (berichtenplatform is nieuw, niet bestaand); Team-UI (onderdeel van Samen) is afhankelijk van dezelfde canonieke organization-laag als Gym/Club (18), dus vroege duidelijkheid over Coach-scopes helpt de latere Team/Gym-ontwerpen.

---

## OPDRACHT 9 — Blockers, geclassificeerd

| Blocker | Classificatie |
|---|---|
| Team/Coach/PT/Gym-canoniek: geen scherm | UX DECISION (Product Owner moet scherm goedkeuren) |
| Legacy gym_id vs canoniek organizations | SOFTWARE (uitfaseringsstrategie, technisch uitvoerbaar zonder externe partij) |
| Entitlement-gating | PRODUCT OWNER DECISION (prijzen/tiers) |
| Coach notes/feedback | SOFTWARE + UX DECISION (klein schema-ontwerp + scherm) |
| Google Health real-account-validatie | EXTERNAL PROVIDER |
| Garmin | EXTERNAL PROVIDER (developer-toegang) |
| Concept2 real-device | REAL DEVICE |
| HRV RMSSD/SDNN daadwerkelijke waarde | EXTERNAL PROVIDER (real-API nodig) |
| Nutrition-database-licensing (GS1/food-data) | LEGAL/LICENSING |
| Pregnancy/postpartum/menopause-scope | PRODUCT OWNER DECISION |
| PSP/store-keuze | PRODUCT OWNER DECISION + LEGAL/LICENSING |
| Research-ethiek/partners | LEGAL/LICENSING + PRODUCT OWNER DECISION |
| Avatar-architectuur (opslag/validatie) | SOFTWARE (uitvoerbaar zonder externe partij) |
| Generiek Event-object (los van HYROX-specifiek) | DATABASE (mogelijk schema-uitbreiding nodig, UNKNOWN zonder diepere audit) — EVIDENCE nodig om te bevestigen of dit al generiek genoeg is |

---

## P0/P1/P2 Findings

**P0:** geen (geen security-/data-integriteitsprobleem gevonden tijdens deze analyse-sprint).
**P1:** het legacy-gym_id-vs-canoniek-organizations-dubbelmodel blijft de grootste, structurele CONFLICT die vóór of tijdens de Gym/Club-UI-ontwerpfase moet worden opgelost (technisch, geen productbeslissing).
**P2:** de overige 22, niet volledig gelezen TARGET-detail-documenten kunnen aanvullende GAP's bevatten die deze sessie niet heeft gevonden (Nutrition-library, Search/Discovery, Events, Accessibility, Research, Internal Ops) — gemarkeerd als UNKNOWN, niet als afwezig.

---

## Exacte eerstvolgende taak voor de volgende sessie

**Lees de resterende 22 TARGET-detail-documenten (met name: EVENTS/COMPETITION_LIFECYCLE, DEVICES_CONNECTIONS, CONTEXTUAL_DEVICE_CONNECTION, GYM_CLUB_COMMERCIAL_WEB_PORTAL, NOTIFICATIONS_REMINDERS_POLICY) en vul de CURRENT→TARGET-mapping en Database-Gap-analyse (Opdracht 5) aan met de daar beschreven details, specifiek gericht op het bevestigen of het generieke Event-object al dan niet als GAP moet worden geclassificeerd.**

STOP. Geen UX-implementatie, geen navigatiewijziging, geen merge uitgevoerd.

**EINDSTATUS: NIGHT PREPARATION COMPLETE — PARTIAL (22/26 target-documenten niet volledig gelezen binnen dit tijdsbudget) — AWAITING PRODUCT OWNER REVIEW + VERVOLGSESSIE VOOR VOLLEDIGE DOCUMENTDEKKING**
