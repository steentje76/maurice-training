# GAP_ANALYSIS_V2.md — Trainingskompas (canonieke, actuele versie — vervangt de losse "v1" volledig)

**Laatst herbouwd:** 28 augustus 2026, tegen `main` @ (wordt bijgewerkt na de Execution Reliability-merge — zie git log voor de actuele HEAD).
**Regel:** dit document toont de HUIDIGE openstaande gaps. Gesloten gaps staan uitsluitend in sectie "CLOSED GAPS / HISTORICAL" onderaan en tellen niet mee in de totalen. Er bestaat geen apart "v1"-bestand meer in de repo — deze V2 is de enige bron.

---

## Actuele open-gap-telling

| Prioriteit | Aantal |
|---|---|
| P0 | **0 open** |
| P1 | 2 |
| P2 | 15 |
| P3 | 4 |
| P4 | 2 |

Geen enkel P0 is momenteel open. Zie sectie "CLOSED GAPS / HISTORICAL" voor de volledige sluitingsgeschiedenis (F1-bevindingen + de execution-defecten uit de F2 Canonical-Training-Start-sprint + de latere GAP-P1-006-closure).

---

## P1 — kernproduct / kritieke benchmark-gap

### GAP-P2-006 (verkleind) — Handbook: resterende Prioriteit-2-hoofdstukken
**Capability-ID:** DOC-HANDBOOK-001
**Current:** H6/H9/H12 (Prioriteit 1) zijn CLOSED via de Normative Documentation Sync-sprint (zie sectie "CLOSED GAPS / HISTORICAL"). H4 (UX Interaction Design), H5 (UI Design System), H8 (AI Behaviour Library) en H10 (Navigation Architecture) blijven vermoedelijk gedeeltelijk stale (nog niet inhoudelijk geverifieerd) — zie `docs/HANDBOOK_UPDATE_PLAN.md` Prioriteit 2.
**Evidence:** CODE VERIFIED voor H6/H9/H12; H4/H5/H8/H10 nog niet geverifieerd.
**Target:** gerichte vergelijkingssessie per Prioriteit-2-hoofdstuk.
**Priority:** P3 (verlaagd t.o.v. de afgeronde Prioriteit-1-hoofdstukken — geen bewezen tegenstrijdigheid, alleen vermoede onvolledigheid). **Complexity:** M. **Roadmap phase:** F1 (onderhoud, niet blokkerend).

### GAP-P2-007 — Commercial/Entitlements heeft geen UI (verplaatst van P1/F2, zie Roadmap 2.0 v1.1 §32)
**Capability-ID:** COMM-UI-001
**Current:** DB-schema volledig aanwezig (`plans`, `features`, `credit_packs`, `plan_feature_quota`, `usage_log`); geen enkel scherm onder de 38 geïnventariseerde top-level schermen gebruikt dit schema.
**Evidence:** CODE VERIFIED (index.html doorzocht op `plans`/`features`-referenties: 0 treffers client-side).
**Target:** tier/waardepropositie + entitlement domain model (MS-F12-01) → entitlement enforcement (MS-F12-02) → plan-overzichtsscherm/Commercial UX (MS-F12-03) → billing/reconciliation (MS-F12-04).
**Dependency:** GYM-RLS-SCOPING-001 — inmiddels VALIDATED (zie sectie "CLOSED GAPS / HISTORICAL"), geen resterende blocker.
**Priority:** **P2** (gedowngraded van P1 — een bestaand DB-schema of benchmark-pariteit rechtvaardigt op zichzelf geen vroege bouw). **Complexity:** M. **Roadmap phase:** **F12** (verplaatst van F2).

### GAP-P2-008 — Home toont geen proactieve "hervat je training"-banner (Home/Dashboard-sprint)
**Capability-ID:** CAP-REGISTRY-SCREENS-001
**Current:** een niet-afgeronde trainingsdraft wordt correct en veilig bewaard (inclusief de tijdens deze sprint gefixte programmatraining-resume), maar Home controleert nooit proactief op het bestaan ervan — de gebruiker ontdekt een hervatbare training pas als hij toevallig hetzelfde trainingstype opnieuw probeert te starten.
**Evidence:** CODE VERIFIED, zie het Home/Dashboard-sprintrapport in `docs/`.
**Target:** een prominente resume-banner/kaart bovenaan Home wanneer `restoreTrainingDraft()` een geldige, data-bevattende draft oplevert, die routeert naar de juiste startfunctie op basis van het trainingstype (vaste/custom/programma).
**Priority:** P2 (discoverability, geen dataverliesrisico meer). **Complexity:** M. **Roadmap phase:** F2 (vervolgwerk — de laatste F2-mastersprint is inmiddels afgerond zonder dit punt op te pakken, blijft dus staan als losstaand vervolgitem, geen eigen nieuwe mastersprint-ID).

### GAP-P2-009 — sRPE-bouwstenen (Load & Progression-sprint) nog niet UI-geïntegreerd
**Capability-ID:** CALC-LOAD-REGISTRY-001
**Current:** `sessionLoadSRPE()`/`rollingLoadSum()` (nieuw, Foster-methode) bestaan als geteste, geciteerde pure calculaties in `core/trainingLoad.js`, maar worden nergens in de UI of AI-coachcontext gebruikt. Er bestaat ook nog geen sRPE-gebaseerde rolling-load-trend naast de bestaande, volume-gebaseerde ACWR.
**Evidence:** CODE VERIFIED, zie het Load & Progression-sprintrapport in `docs/`.
**Target:** productbeslissing + ontwerp voor hoe een tweede belasting-signaal (sRPE-gebaseerd) naast de bestaande ACWR-classificatie zinvol en niet-verwarrend getoond kan worden.
**Priority:** P2. **Complexity:** M. **Roadmap phase:** F3 (vervolgwerk) of later productbeslissing.

### GAP-P2-010 — 13 `core/*.js`-bestanden ontbreken in de service-worker-precache
**Capability-ID:** PLAT-OBSERVABILITY-001 (platform/PWA-track, breder dan één capability)
**Current:** `sw.js`'s `STATIC_ASSETS` bevat 15 van de 28 daadwerkelijk in `index.html` geladen `core/*.js`-modules. 13 ontbreken (o.a. `contextEngine.js`, `scientificEvidence.js`, `cycle.js`, `intervalEngine.js`, `teamPerformance.js`) — deze modules zijn dus niet gegarandeerd offline beschikbaar, in tegenstelling tot bijvoorbeeld `calculation.js`/`progression.js`/(sinds deze sprint) `trainingLoad.js`.
**Evidence:** CODE VERIFIED, repo-brede vergelijking van `index.html`-scripttags tegen `sw.js`'s `STATIC_ASSETS`-array.
**Target:** de resterende 13 bestanden toevoegen aan `STATIC_ASSETS`, met een `CACHE_STATIC`-bump.
**Priority:** P2. **Complexity:** S (mechanische toevoeging, wel een volledige regressietest + versiebump per keer).

### GAP-P2-011 — Geen dedicated `core/`-unit-test voor de HRV-baseline-functiegroep (Recovery-sprint)
**Capability-ID:** CALC-REC-REGISTRY-001
**Current:** `lnRmssd`/`hrvBaseline`/`hrvRollingRecent`/`hrvStPersonal` leven in `index.html`, niet in een pure-core-extractie zoals `calculation.js`. `core/fRecoveryRegistry.test.js` (deze sprint) test ze via bracket-matching-extractie, maar een echte, aparte core-module (bv. `core/recovery.js`) zou robuuster en beter herbruikbaar zijn.
**Evidence:** CODE VERIFIED, zie het Recovery-sprintrapport in `docs/`.
**Target:** de HRV-baseline-functiegroep extraheren naar een pure `core/recovery.js`-module, analoog aan `core/trainingLoad.js`/`core/progression.js`.
**Priority:** P2. **Complexity:** M.

### GAP-P2-012 — RHR-delta-minimum (2 metingen) inconsistent met HRV's striktere datakwaliteitsgates (Recovery-sprint)
**Capability-ID:** CALC-REC-REGISTRY-001
**Current:** `rhrBaselineDelta` vereist slechts 2 eerdere metingen, terwijl `hrvBaseline` 14 dagen én 4 metingen vereist vóór een claim. Beide zijn Recovery-signalen met vergelijkbare datakwaliteitsrisico's, maar met sterk verschillende drempels.
**Evidence:** CODE VERIFIED, zie het Recovery-sprintrapport in `docs/`.
**Target:** heroverwegen of RHR-delta een strengere minimumdrempel verdient, consistent met de HRV-aanpak.
**Priority:** P2. **Complexity:** S.

### GAP-P2-013 — Geen provenance-onderscheid tussen device-gemeten en split-afgeleid vermogen (Endurance & Erg-sprint)
**Capability-ID:** CALC-END-REGISTRY-001
**Current:** `CARDIO_TYPES` (RowErg/BikeErg/SkiErg) laat zowel een rechtstreeks device-ingevoerd `watt`-veld toe als een split-gebaseerde afleiding (CALC-END-002), zonder een vlag die vastlegt welke van de twee een specifieke opgeslagen waarde is.
**Evidence:** CODE VERIFIED, zie het Endurance & Erg-sprintrapport in `docs/`.
**Target:** expliciete provenance-vlag (`measured`/`derived`) toevoegen aan de opslag van erg-vermogenswaarden.
**Priority:** P2. **Complexity:** S.

### GAP-P2-014 — `ContextEngineCore` is dode code, nooit aangeroepen vanuit index.html (Context-sprint)
**Capability-ID:** CTX-CONTRACT-001
**Current:** `core/contextEngine.js` bevat zijn eigen, expliciete commentaar dat bevestigt: het bestand is additief naast `buildCtx()` (index.html, de daadwerkelijke, actief-aangeroepen contextbron) en wordt vanuit `index.html` nergens aangeroepen.
**Evidence:** CODE VERIFIED, zie het Context Taxonomy-sprintrapport in `docs/`.
**Target:** ofwel `ContextEngineCore` alsnog bedraden in `buildCtx()` (bewuste architectuurkeuze, geen technische blocker meer sinds F2), ofwel expliciet documenteren als "toekomstige building block, nog niet actief" i.p.v. impliciet ongebruikt te laten staan.
**Priority:** P2 (architectuurinconsistentie, geen actieve bug — beide bronnen zijn intern consistent, er is geen tegenstrijdige waarheid). **Complexity:** M.

### GAP-P2-015 — `recoveryScore()`'s confidence telt alleen componentaantal, geen componentkwaliteit (Data Quality-sprint)
**Capability-ID:** DQ-CONFIDENCE-CONTRACT-001
**Current:** `recoveryScore()`'s confidence is uitsluitend gebaseerd op `comps.length`. In tegenstelling tot `readinessDay()`, dat een `ONBETROUWBAAR`-filter (`no_data`/`sync_failed`) toepast vóórdat een signaal meetelt, telt `recoveryScore()` een verouderde of onbetrouwbare component even zwaar mee als een verse.
**Evidence:** CODE VERIFIED, zie het Data Quality & Confidence-sprintrapport in `docs/`.
**Target:** `recoveryScore()` uitbreiden met hetzelfde soort kwaliteitsfilter dat `readinessDay()` al gebruikt.
**Priority:** P2 (niet-kritiek — Recovery Score is altijd een aanvullend, informatief getal, nooit de directe bron van een Decision Rule-uitkomst zelf). **Complexity:** S.

### GAP-P1-003 — AI-outputcontract ontbreekt
**Capability-ID:** AI-OUTPUT-CONTRACT-001 (**expliciet onderscheiden van de reeds gesloten security-capability voor dezelfde proxy**, zie sectie "CLOSED GAPS / HISTORICAL" en Capability Registry — dit is een governance-gat, geen security-gat)
**Current:** `coach.js`/`buildCtx()` zijn security-getest (JWT, open-proxy-regressie — zie de historische P0-002-sluiting hierboven) maar er is geen technische controle die een AI-antwoord blokkeert als het een niet-onderbouwd cijfer noemt of diagnose-achtige taal gebruikt.
**Evidence:** CODE VERIFIED — `scientificEvidence.js` beschermt Decision Rules, niet de vrije AI-tekst zelf (zie Product Architecture §5).
**Target:** contracttest op het AI-responsschema (MS-F4-01).
**Dependency:** EVID-SCI-001.
**Priority:** P1. **Complexity:** M. **Roadmap phase:** **F4** (gecorrigeerd van F2 — de roadmap-index-bestemming is MS-F4-01, AI Output Contract & Guardrails, na de Calculation/Context/Decision/Evidence-dependencies; F2 was stale).

### GAP-P1-005 — AI-adaptive-programmering-gat t.o.v. Hevy Trainer
**Capability-ID:** AI-PROGRAM-AUTOGEN-001
**Current:** Hevy Trainer (feb 2026) genereert een volledig, zelf-aanpassend trainingsprogramma. TK heeft AI-gestuurde week-generatie-aanroepen (2 van de 6 `buildCtx()`-aanroeppunten), maar geen even volwassen, gesloten auto-aanpassingslus.
**Evidence:** Web (juni 2026, PRPath-vergelijking) + CODE VERIFIED (index.html regel ~10888, ~11253).
**Target:** bestaande week-generatie doorontwikkelen, met TK's evidence-laag als differentiator t.o.v. Hevy's black-box-aanpak.
**Dependency:** EVID-SCI-001, DEC-CORE-001.
**Priority:** P1. **Complexity:** L. **Roadmap phase:** F4.

---

## P2 — grote verbetering

### GAP-P2-001 — Vijf openstaande Women's Performance-productbeslissingen
**Capability-ID:** WOMENS-PERF-DECISIONS-001
**Current:** `docs/Womens_Performance/DECISION_REQUIRED_{zwangerschap,postpartum,menopauze,anticonceptie,bekkenbodem}.md`, open sinds 26 augustus.
**Target:** vijf expliciete besluiten van Maurice, daarna implementatie.
**Dependency:** blokkeert Track 8 (F8) volledig.
**Priority:** P2. **Complexity:** M-L per besluit. **Roadmap phase:** F8.

### GAP-P2-002 (uitgebreid via de Backup & Retention Decision-sprint) — 8 `bak_p_*`-backuptabellen, audit compleet, verwijdering blijft open
**Capability-ID:** PLAT-BACKUP-CLEANUP-001
**Current:** 8 losse backup-kopieën (1-154 rijen elk, eerdere telling van 7 was onvolledig) — elk heeft een corresponderende, actief gebruikte canonieke tabel zonder `bak_`-prefix. Volledige audit uitgevoerd: 0 FK-referenties in beide richtingen, 0 code-referenties repo-breed, RLS enabled met 0 policies (deny-all, geen actieve exposure). Alle 8 geclassificeerd als **SAFE TO ARCHIVE** (niet "safe to remove" — data verwijderen is onomkeerbaar, geen enkele tabel is met zekerheid overbodig zonder Product Owner-bevestiging).
**Evidence:** DB VERIFIED (rijaantal, RLS, FK-graaf) + CODE VERIFIED (0 referenties). Zie `docs/BACKUP_RETENTION_CONTRACT.md` voor de volledige classificatietabel.
**Target:** exporteren en/of verwijderen via een kleine, expliciet goedgekeurde migratie — zodra de Product Owner een retentiebeslissing neemt.
**Blocker classificatie:** `POLICY_DECISION_REQUIRED` voor de daadwerkelijke actie. De audit zelf is compleet en blokkeert niets.
**Priority:** P2. **Complexity:** S. **Roadmap phase:** F1.

### GAP-P2-003 (verkleind) — Observability: resterende instrumentatie
**Capability-ID:** PLAT-OBSERVABILITY-001
**Current:** kernevent-contract (`core/observability.js`) bestaat en is geïntegreerd in AI-coach, wearable-sync en frontend-error-capture (zie sectie "CLOSED GAPS / HISTORICAL" voor het volledige bewijs van die kern-closure). Nog niet geïnstrumenteerd: `delete-account.js`, `gym-team.js`, `wearable-auth-*.js`, training-execution-lifecycle, auth-flow, device-integratie (Concept2). Geen persistente/doorzoekbare operational-log-opslag, geen formeel retentiebeleid.
**Evidence:** CODE VERIFIED — zie `docs/OBSERVABILITY_CONTRACT.md` §"Gedekte flows" en §"Open gaps".
**Target:** resterende functies/flows instrumenteren met het bestaande contract; retentiebeleid formaliseren.
**Priority:** P2. **Complexity:** M. **Roadmap phase:** F1/F13.

### GAP-P2-004 (uitgebreid via de Secrets & Configuration Hygiene-sprint) — Orphaned secret-achtige DB-kolommen + client-side lock-hardening
**Capability-ID:** SEC-CONFIG-001
**Current:** `config.anthropic_key` en `config.pin_hash` bevatten beide een waarde maar hebben 0 code-referenties (repo-breed geverifieerd) — vermoedelijk historische duplicaten van vóór de server-side proxy-architectuur. RLS blokkeert client-toegang correct (alleen `service_role`); risico is onnodige attack surface, niet actieve exposure. Daarnaast: de client-side app-lock (`PIN_HASH` in index.html) is een ongesalte, hardcoded SHA-256-hash zichtbaar in verzonden JS — geen echte autorisatiegrens (die loopt via Supabase Auth + RLS), wel een low-severity design-punt.
**Evidence:** DB VERIFIED (aanwezigheid, nooit waarden) + CODE VERIFIED (0 referenties). Zie `docs/CONFIGURATION_SECURITY_CONTRACT.md` F-01/F-02/F-03.
**Target:** F-01/F-02 — bevestig met Product Owner dat niets buiten deze repo deze kolommen leest, verwijder daarna in een aparte, expliciet goedgekeurde migratie. F-03 — productbeslissing of een sterkere client-lock gewenst is.
**Blocker classificatie:** F-01/F-02 = `MANUAL_USER_VALIDATION_REQUIRED`. F-03 = `PRODUCT_DECISION_REQUIRED`. Geen van beide blokkeert de closure van de Secrets & Configuration Hygiene-sprint zelf (geen actieve exposure).
**Priority:** P2 (F-01/F-02), P3 (F-03). **Complexity:** S. **Roadmap phase:** F1.

### GAP-P2-005 — Verouderde point-in-time-documenten
**Current:** `docs/DATABASE_STATUS.md` (19 aug, claimt 10 migraties; live schema loopt tot v4.95.0), `docs/PLAY_STORE_READINESS.md`/`RELEASE_READINESS.md` (19 aug, v4.48.0).
**Target:** zie `docs/DOCUMENTATION_GOVERNANCE.md` — bij een volgende relevante gebeurtenis een nieuw gedateerd document toevoegen i.p.v. overschrijven.
**Priority:** P2. **Complexity:** S per document. **Roadmap phase:** F1.

---

## P3 — latere optimalisatie

### GAP-P3-001 — Redundante ownership-check ontbreekt in `WITH CHECK` (defense-in-depth)
`exercises`/`custom_trainings`/`equipment_catalog` leunen voor ownership-afdwinging volledig op `BEFORE INSERT`-triggers, niet op de RLS `WITH CHECK` zelf. **Complexity:** S.

### GAP-P3-002 — Handbook H7 (Component Library)/H11 (Motion Design) niet inhoudelijk geverifieerd op drift
Geen concreet bewijs van veroudering gevonden, maar ook niet actief uitgesloten. **Complexity:** M.

### GAP-P3-003 — `fAndroidRelease.test.js` blijft CI-only valideerbaar
Sinds de P0-003-fix skipt deze test zichtbaar i.p.v. hard te falen buiten een Android-buildomgeving — acceptabel, geen verdere actie vereist tenzij de lokale dev-flow dit vaker nodig heeft. **Complexity:** S.

### GAP-P3-004 — 18 plekken gebruiken nog `toISOString()` voor datumbereikgrenzen (History/Calendar-sprint)
**Capability-ID:** CAP-REGISTRY-SCREENS-001
**Current:** de kritieke schrijf-datum van een training (`finishSession()`) gebruikt correct de lokale `td()`. 18 andere plekken (dashboard-/AI-context-bereikgrenzen zoals "laatste 7/14/28 dagen") gebruiken nog `toISOString().split('T')[0]`/`.slice(0,10)`, wat rond middernacht een sessie een paar uur te vroeg/laat in of uit het venster kan laten vallen. Geen "training op verkeerde dag"-defect.
**Evidence:** CODE VERIFIED, zie het History/Calendar-sprintrapport in `docs/`.
**Target:** de 18 call sites gericht vervangen door `td()`-equivalenten, per geval beoordeeld (sommige betreffen een datum in het verleden, niet "vandaag", en hebben een eigen helper nodig).
**Priority:** P3. **Complexity:** M (18 verspreide call sites, elk individueel te beoordelen).

---

## P4 — lange termijn / research / beyond benchmark

### GAP-P4-001 — Publieke social/community-laag
Bewust laag geprioriteerd — geen productbeslissing om dit te bouwen. **Roadmap phase:** F9 (alleen bij expliciete koerswijziging).

### GAP-P4-002 — Scientific Platform (research-ready export, consent-governance)
Vereist eerst een consent-flow (nog niet gebouwd) bovenop de al aanwezige Evidence-laag. **Roadmap phase:** F14.

---

## CLOSED GAPS / HISTORICAL

### (voorheen GAP-P1-007) — `hrv_log` had geen provenance-kolom — **STATUS: CLOSED**
- **Original finding:** `hrv_log` bevatte `sleep`/`hrv`/`rhr`, maar geen kolom die vastlegde of een waarde afkomstig was van een handmatige check-in of wearable-sync.
- **Diepere root cause bij heropening (MS-F3-10):** `hrv_log` heeft geen `UNIQUE(user_id,date)`-constraint; beide schrijfpaden mergen per veld naar dezelfde rij, waardoor één rij aantoonbaar gemengde herkomst kan hebben (bv. wearable-HRV + later handmatig gecorrigeerde RHR). Een enkele rij-niveau `source`-kolom zou dit foutief hebben voorgesteld. Een reeds bestaand, maar ontoereikend signaal werd gevonden: een `[src:fitbit]`-tekst-tag verstopt in het vrije-tekst `note`-veld.
- **Resolution:** per-veld provenance (`hrv_source`/`rhr_source`/`sleep_source`, `manual`/`wearable`/`unknown`) via `migratie_v499.sql`, forward-only, live uitgevoerd. Beide schrijfpaden (`tkMergeHealthRow`/`upsertHrvLog` client, `buildRow` server) bijgewerkt en functioneel getest tegen het mixed-source-scenario.
- **Mastersprint:** MS-F3-10 (Explainability & Provenance).
- **Evidence:** live schema-verificatie (3 kolommen toegevoegd, 70 bestaande rijen ongewijzigd/NULL), RLS live herbevestigd, `core/fProvenanceClosure.test.js` 17/17 met sabotagebewijs.
- **Closed date:** 28 augustus 2026.


### (voorheen GAP-P1-006) — Programma-blok en Repeat Workout niet geconvergeerd naar de Preview-adapter — **STATUS: CLOSED**
- **Original finding:** 6 van de 8 trainingsstart-entrypoints liepen via de canonieke `openTrainingPreview()`→`startInstanceFromDefinition()`-keten. Programma-blok en Repeat Workout hadden een eigen, deels gedupliceerde opzetlogica. Diepere root cause bij heropening: beide bronnen kregen daardoor NOOIT een eigen `training_instances`-rij — `activeInstanceId` bleef bij een verse start altijd `null`, dus `completeTrainingInstance()` deed bij afronden niets. Volledig onzichtbaar voor de plan-versus-uitvoering-dataset.
- **Resolution:** canonieke instance-creatie (`createTrainingInstance()`) toegevoegd aan beide paden, met source-specifieke provenance in de vrije-vorm `snapshot`-JSONB (geen migratie nodig). Preview-UI zelf bewust niet geforceerd gelijk te maken — beide bronnen behouden hun eigen, functioneel rijkere pre-executieflow (recovery-check-in resp. gewicht-aanpassing-preview) als legitieme source-specific Definition-constructie.
- **Mastersprint:** MS-F2-08 (GAP-P1-006-closure).
- **Evidence:** `core/fGapP1006Closure.test.js` 11/11, sabotagebewijs geleverd en teruggedraaid. Live DB geverifieerd: `training_instances.snapshot` (jsonb) accepteert de nieuwe velden zonder schemawijziging.
- **Closed date:** 28 augustus 2026.
- **Gerelateerd:** MS-F2-01 herclassificeerd van PARTIAL naar CLOSED (zie `docs/MS-F2-08_GAP_P1_006_CLOSURE.md`).


### (nieuw, Home/Dashboard-sprint) — Data-verlies bij hervatten van een programmatraining — **STATUS: CLOSED**
- **Original finding:** `launchProgramTrainScreen()` reset `sessionLog`/`sessionExtra` altijd onvoorwaardelijk, zonder ooit een bestaande, geldige draft voor dezelfde programmatraining te herstellen. `guardExistingDraft()` beschermt hier niet tegen (vraagt alleen bevestiging bij een ándere training). Gevolg: een sporter die een programmatraining start, sets logt, de app sluit zonder af te ronden, en later dezelfde training opnieuw opent, verloor stilzwijgend alle al gelogde sets.
- **Resolution:** dezelfde resume-branch toegevoegd die `startT`/`startCustomTraining` al gebruiken (sessionLog/sessionExtra/activeInstanceId/klok hersteld uit de draft bij een geldige match).
- **Mastersprint:** Home/Dashboard Actionability-sprint (gevonden tijdens de resume-audit).
- **Evidence:** `core/fProgramResume.test.js` 7/7, sabotagebewijs geleverd en teruggedraaid. Bestaand `core/fExecutionIdentity.test.js` bijgewerkt (legitieme contractverbreding, geen regressie).
- **Closed date:** 28 augustus 2026.


### (nieuw, MS-F2-01) — Execution-identity-lek bij Repeat Workout / Programma-training — **STATUS: CLOSED**
- **Original finding:** `startRepeatWorkout()` en `launchProgramTrainScreen()` resetten `activeInstanceId` niet vóór een nieuwe sessie. Een afgebroken training kon zijn instance-ID laten lekken naar een latere, ongerelateerde sessie, die bij afronden dan de verkeerde `training_instances`-rij als voltooid markeerde.
- **Resolution:** `activeInstanceId=null;` toegevoegd aan beide functies, zelfde patroon als `startT`/`startCustomTraining`.
- **Mastersprint:** MS-F2-01.
- **Evidence:** `core/fExecutionIdentity.test.js`, sabotagebewijs geleverd en teruggedraaid.
- **Closed date:** 28 augustus 2026.

### (nieuw, MS-F2-01) — Bevroren live-timer bij custom trainingen — **STATUS: CLOSED**
- **Original finding:** `startCustomTraining()` riep de timer aan met een hardcoded `'A'` i.p.v. de daadwerkelijke trainingscontext; het DOM-element gebruikte bovendien een afwijkende naamgevingsconventie. De verstreken-tijd-klok bleef bij élke custom training op "00:00" staan.
- **Resolution:** timer-aanroep naar `curT`; element-ID hernoemd naar de `ctxT`-conventie die vaste/programma-trainingen al gebruiken.
- **Mastersprint:** MS-F2-01.
- **Evidence:** `core/fExecutionIdentity.test.js`, sabotagebewijs geleverd en teruggedraaid.
- **Closed date:** 28 augustus 2026.


### GAP-P2-006 (voorheen) — Handbook-drift H6/H9/H12 — **STATUS: CLOSED (Prioriteit 1) via de Normative Documentation Sync-sprint**
- **Original finding:** H6 (Screen Library) en H9 (AI Governance) bevestigd feitelijk stale — geen "Cyclus"/`s-lich-cyclus`-referentie in H6; geen `evidence_store.v1`/DEC-036-referentie in H9. H12 (Quality Assurance) beschreef `logic_tests.js` als hét bindende regressiemechanisme terwijl `core/release-gate.js` al langer de daadwerkelijke gate is.
- **Resolution:** H6 — prominente COVERAGE GAP-notitie bovenaan het hoofdstuk. H9 — nieuwe bindende subsectie 6.5 "Evidence & Corroboratie-governance". H12 — 4 gerichte correcties (Deel 4/5/16/18) naar `core/release-gate.js`.
- **Mastersprint:** Normative Documentation Sync (F1).
- **Evidence:** directe grep-bevestiging van de toegevoegde tekst in alle drie de bestanden; geen testsuite van toepassing (documentatiewijziging).
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED voor Prioriteit 1. H4/H5/H8/H10 (Prioriteit 2) blijven open als verkleind vervolg-item GAP-P2-006 (zie boven, nu P3).


### GAP-P2-003 (voorheen) — Observability ontbreekt volledig — **STATUS: CLOSED (kern) via MS-F1-02**
- **Original finding:** geen bewijs van gestructureerde client- of server-side monitoring buiten Netlify's eigen functielogs.
- **Resolution:** `core/observability.js` (`observability_event.v1`) — event-contract, 5 loglevels, correlation-ID's, redactielaag, foutnormalisatie, fail-safe serialisatie. Geïntegreerd in `coach.js`, `wearable-sync.js`, en als globale frontend-error-capture.
- **Mastersprint:** MS-F1-02.
- **Evidence:** `core/observability.test.js` 52/52, incl. verplichte security-sabotagetest (geen enkele secretwaarde lekt door) en failure-simulaties. Zie `docs/OBSERVABILITY_CONTRACT.md`.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED voor het kernraamwerk. Resterende instrumentatie-uitbreiding blijft open als GAP-P2-003 (verkleind, zie boven) — geen volledige closure geclaimd voor wat nog niet is geïnstrumenteerd.


### GAP-P1-004 (voorheen) — Multi-tenant RLS-scoping ontbreekt — **STATUS: CLOSED (MS-F1-01)**
- **Original finding:** `organizations`/`teams`/`training_groups`/`seasons`/`macrocycles`/`mesocycles`/`microcycles` leesbaar voor elke ingelogde gebruiker (`auth.role()='authenticated'`, geen ownership-scoping). 0 rijen op dat moment.
- **Resolution:** `migratie_v498.sql` — 7 brede policies vervangen door membership-gescoopte policies (met owner-bootstrap-uitzondering).
- **Mastersprint:** MS-F1-01.
- **Evidence:** live SQL-transactietest met 2 volledig gescheiden tenants — lid van tenant A ziet tenant A (ALLOW), ziet tenant B niet (DENY), onbetrokken gebruiker ziet geen van beide (DENY), owner zonder eigen membership-rij ziet zijn eigen organisatie (ALLOW). Regressietest: `core/fGymRlsMultiTenant.test.js`.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — GYM-RLS-SCOPING-001 nu VALIDATED.

### GAP-P0-004 (nieuw gevonden tijdens MS-F1-01) — Self-privilege-escalatie via `users`-tabel — **STATUS: CLOSED**
- **Original finding:** policy `users_update_own` (`USING id=auth.uid()`) had geen kolomrestrictie, en `authenticated` had UPDATE-GRANT op `gym_role`/`gym_id`/`system_role`. Een gewone gebruiker kon zichzelf via een directe PostgREST-PATCH naar `gym_role='owner'` én `system_role='developer'` promoveren, volledig buiten de hiërarchie-checks van `gym-team.js` om.
- **Resolution:** `migratie_v497.sql` — `BEFORE UPDATE`-trigger die deze drie kolommen terugzet naar hun oude waarde tenzij de aanroep van `service_role` komt.
- **Mastersprint:** MS-F1-01 (niet in de oorspronkelijke audit gevonden — ontdekt tijdens de threat-model-tests van deze sprint).
- **Evidence:** live SQL-transactietest — self-update van de drie kolommen wordt geblokkeerd (waarden blijven ongewijzigd); service-role-update (simuleert `gym-team.js`) slaagt zoals bedoeld. Regressietest: `core/fGymRlsMultiTenant.test.js`.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — nieuwe capability SEC-USERROLE-001, CLOSED.


Deze gaps zijn gesloten. Ze tellen niet mee in de totalen hierboven. Bewaard voor auditeerbaarheid.

### GAP-P0-001 — Publieke blootstelling `gyms`-tabel — **STATUS: CLOSED**
- **Original finding:** RLS-policy `gyms_read` (`USING true`, rol `public`) liet de `anon`-rol alle kolommen van `gyms` lezen, incl. `owner_email`, `coach_pin_hash`, `mollie_customer_id`.
- **Resolution:** `migratie_v496.sql` — policy verwijderd, geen vervanging (deny-all voor anon/authenticated, service_role blijft werken).
- **PR:** #64.
- **Evidence:** `SET LOCAL ROLE anon/authenticated` → 0 rijen; `service_role` → 1 rij. Regressietest `core/fGymsRlsSecurity.test.js`.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — geen open actie. Volledige details in `SECURITY_FINDINGS.md`.

### GAP-P0-002 — Ontbrekende regressietests op security-kritieke Netlify Functions — **STATUS: CLOSED**
- **Original finding:** `coach.js`, wearable-auth-flow, `delete-account.js`, `gym-team.js` hadden geen dedicated geautomatiseerde test.
- **Resolution:** 61 nieuwe assertions over 4 nieuwe testbestanden. Tijdens testontwerp een echte bug gevonden en gefixed: een manager kon een owner degraderen naar `lid` (`target.gym_role_level >= caller.gym_role_level`-check toegevoegd aan `gym-team.js`).
- **PR:** #64.
- **Evidence:** `core/fCoachProxySecurity.test.js` (12/12), `core/fGymTeamSecurity.test.js` (17/17), `core/fWearableAuthSecurity.test.js` (20/20), `core/fDeleteAccountSecurity.test.js` (12/12).
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — geen open actie. (Zie GAP-P1-003 voor het aparte, nog wél open AI-**outputcontract**-governance-gat — dat is een andere capability dan deze security-testdekking.)

### GAP-P0-003 — Lokale release gate dekte 10 van ~75 testbestanden — **STATUS: CLOSED**
- **Original finding:** `core/release-gate.js` (lokaal `npm test`-commando) had een hardcoded lijst van 10 testbestanden.
- **Correctie tijdens closure:** GitHub's `quality-gate.yml` draaide al sinds 18 augustus (vóór de audit) alle `core/*.test.js` via een eigen bash-lus — de daadwerkelijke, door GitHub afgedwongen merge-bescherming was dus minder lek dan aanvankelijk gerapporteerd. Alleen het lokale gemakscommando was incompleet.
- **Resolution:** `core/release-gate.js` herbouwd naar discovery-based (v2), ontdekt nu automatisch alle 78 testbestanden. Bewezen via een tijdelijke, volledig teruggedraaide sabotage-test in `fCycle.test.js`.
- **PR:** #64.
- **Evidence:** `node core/release-gate.js` → 80 uitgevoerd, 1 zichtbaar geskipt (Android), 0 gefaald.
- **Closed date:** 28 augustus 2026.
- **Current status:** CLOSED — geen open actie.

---

## Legacy → canonical capability-ID-mapping

| Legacy GAP-ID (v1) | Canonical capability-ID (Roadmap 2.0 v1.1) |
|---|---|
| GAP-P0-001 | SEC-GYMS-001 (CLOSED) |
| GAP-P0-002 | SEC-TEST-001 (CLOSED) |
| GAP-P0-003 | SEC-GATE-001 (CLOSED) |
| GAP-P1-001 (Handbook, v1) | DOC-HANDBOOK-001 → hernummerd **GAP-P2-006** (P1→P2 per v1.1 §29) |
| GAP-P1-002 (Commercial UI, v1) | COMM-UI-001 → hernummerd **GAP-P2-007** (P1→P2, F2→F12 per v1.1 §32) |
| GAP-P1-003 (Phase 3-RLS, v1) | GYM-RLS-SCOPING-001 (blijft P1, mastersprint nu MS-F1-01) |
| GAP-P2-001 (Women's Performance, v1) | WOMENS-PERF-DECISIONS-001 |
| GAP-P2-002 (backup-tabellen, v1) | PLAT-BACKUP-CLEANUP-001 |

**Volledige mastersprint-ID-migratie (57 oude PR#68-IDs → 79 canonieke v1.1-IDs):** zie `docs/ROADMAP_V1_1_MIGRATION_MATRIX.md`.
