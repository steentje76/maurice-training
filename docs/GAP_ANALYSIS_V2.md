# GAP_ANALYSIS_V2.md — Trainingskompas (canonieke, actuele versie — vervangt de losse "v1" volledig)

**Laatst herbouwd:** 28 augustus 2026, tegen `main` @ (wordt bijgewerkt na de Execution Reliability-merge — zie git log voor de actuele HEAD).
**Regel:** dit document toont de HUIDIGE openstaande gaps. Gesloten gaps staan uitsluitend in sectie "CLOSED GAPS / HISTORICAL" onderaan en tellen niet mee in de totalen. Er bestaat geen apart "v1"-bestand meer in de repo — deze V2 is de enige bron.

---

## Actuele open-gap-telling

| Prioriteit | Aantal |
|---|---|
| P0 | **0 open** |
| P1 | 0 |
| P2 | 23 |
| P3 | 6 |
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

### GAP-P2-016 (voorheen GAP-P1-003) — AI-outputcontract, resterend structured-JSON-gat — **STATUS: DEELS GESLOTEN (TESTED, niet CLOSED)**
**Capability-ID:** AI-OUTPUT-CONTRACT-001
**Current (bijgewerkt na MS-F4-01):** `core/aiOutputContract.js` (nieuw) is een patroon-gebaseerde semantische validator die coach-proza weigert bij diagnose-taal, HRV-als-diagnose, ACWR-als-blessurevoorspeller, of prompt-injectie-signalen — gekoppeld aan alle 3 vrije-tekst-AI-paden, met sabotagebewijs. De opdracht-geschetste, volledige structured-JSON-outputcontract met referentie-validatie tegen canonieke Calculation/Decision-ID's is NIET gebouwd (zou een architectuurverandering van vrije coachtaal naar gestructureerde JSON vereisen — momenteel niet gerechtvaardigd door de risico-omvang, zie `docs/MS-F4-01_AI_OUTPUT_CONTRACT.md`).
**Evidence:** CODE VERIFIED + `core/fAiOutputContract.test.js` 17/17, sabotagebewijs geleverd.
**Target:** eventueel toekomstig structured-JSON-outputcontract, alleen indien de productrisico-omvang dat ooit rechtvaardigt (`PRODUCT_DECISION_REQUIRED` indien gewenst).
**Dependency:** EVID-SCI-001 (voldaan).
**Priority:** P2 — **hernummerd van GAP-P1-003** (het belangrijkste, aantoonbare risico — diagnose-/medische taal — is nu technisch afgedwongen; het resterende gat is architecturaal, geen actief veiligheidsrisico, dus terecht P2, niet langer P1). **Complexity:** L (indien ooit volledig gebouwd). **Roadmap phase:** F4 (MS-F4-01, status TESTED).

### GAP-P2-018 (voorheen GAP-F5-001) — Geen granulair per-waarde quality-veld voor wearable-gezondheidsdata
**Capability-ID:** PROVIDER-INTEGRATION-CONTRACT-001
**Current:** wearable-gezondheidsdata (HRV/RHR/slaap) heeft per-veld provenance (`manual`/`wearable`/`unknown`, uit een eerdere Explainability & Provenance-sprint), maar geen aparte, granulaire "quality"-classificatie per individuele meting (bv. "vers"/"verouderd"/"onbetrouwbaar" los van de bron zelf).
**Evidence:** CODE VERIFIED, zie het Provider Integration Contract-sprintrapport in `docs/`.
**Target:** eventueel een expliciet quality-veld toevoegen, alleen indien een concrete productbehoefte dit vereist.
**Priority:** P2 (niet-kritiek — geen dataverlies, geen silent-corruption-risico, puur een verfijningsmogelijkheid). **Complexity:** M.

### GAP-P2-019 (voorheen GAP-F5-002) — Geen geautomatiseerde retry-met-backoff in wearable-sync
**Capability-ID:** PROVIDER-INTEGRATION-CONTRACT-001
**Current:** `wearable-sync.js` heeft geen expliciete, automatische retry-met-backoff bij een gefaalde sync — een nieuwe poging vereist een door de gebruiker/client getriggerde herhaling.
**Evidence:** CODE VERIFIED, zie het Provider Integration Contract-sprintrapport in `docs/`.
**Target:** eventueel automatische retry-logica toevoegen, alleen indien gebruikersfeedback dit rechtvaardigt.
**Priority:** P2 (niet-kritiek). **Complexity:** S.

### GAP-P2-020 (voorheen GAP-F5-003) — Geen canonieke resolutieregel bij meerdere gelijktijdige hartslagbronnen
**Capability-ID:** CONCEPT2-LIVE-001
**Current:** wanneer zowel een Concept2 PM5 als een los polshorloge tegelijk hartslag leveren tijdens dezelfde sessie, bestaat er geen expliciete, canonieke "welke bron wint"-regel. Bevestigd: geen stille averaging-code gevonden (dus geen incompatibele-stromen-vermenging), maar ook geen expliciete resolutie.
**Evidence:** CODE VERIFIED, zie het Concept2 PM5 Real-device Validation-sprintrapport in `docs/`.
**Target:** eventueel een expliciete precedentieregel vastleggen (bv. PM5-hartslag heeft voorrang tijdens een erg-sessie), alleen indien een concrete productbehoefte dit vereist — geen productbeslissing hier gefabriceerd.
**Priority:** P2 (niet-kritiek — geen incorrecte datavermenging, alleen een onbesliste keuze bij een zeldzaam gelijktijdig-bronnen-scenario). **Complexity:** S.

### GAP-P2-021 (nieuw, Running/Cycling Intelligence-sprints) — Critical Speed/Power niet gewired op trainingsgeschiedenis
**Capability-ID:** RUNNING-INTELLIGENCE-001, CYCLING-INTELLIGENCE-001
**Current:** `CardioCore.criticalSpeed()` (running) en `CardioCore.criticalPower()` (cycling) zijn beide geïmplementeerd en getest, maar worden bewust niet automatisch gevoed met trainingsgeschiedenis. Het TK-datamodel heeft geen mechanisme om een gelogde sessie te markeren als een genuine maximale-inspanning-tijdrit versus een rustige duurloop/duurrit — automatische wiring op willekeurige sessiedata zou een wetenschappelijk ongeldig model opleveren.
**Evidence:** CODE VERIFIED, zie de Running Intelligence- en Cycling Intelligence-sprintrapporten in `docs/`.
**Target:** een expliciet "tijdrit"-markeringsmechanisme (bv. een sessievlag of los invoerscherm voor time-trial-resultaten), alleen indien een concrete productbehoefte dit rechtvaardigt — geen productbeslissing hier gefabriceerd over hoe dit eruit zou moeten zien. Eén oplossing zou beide sporten tegelijk bedienen.
**Priority:** P2 (niet-kritiek — beide calculations zijn correct en veilig; het ontbreekt uitsluitend aan een user-facing invoerpad). **Complexity:** M.

### GAP-P2-022 (nieuw, Triathlon & Brick Workflows-sprint) — sessionLoad()/unifiedLoad() nog niet in de runtime gewired
**Capability-ID:** END-HYROX-001
**Current:** `AthleteCore.sessionLoad()`/`unifiedLoad()` (`core/athlete.js`) bestaan als pure, geteste functies, maar worden nergens in `index.html` aangeroepen — er is vandaag geen live dashboard/UI-feature die trainingsbelasting sommeert. Voor multisport (triathlon/brick) betekent dit: geen actief dubbeltellingsrisico vandaag, maar wél een aandachtspunt zodra deze functies ooit gewired worden — de parent (`training_instance_id`) draagt zelf geen apart gewicht/RPE-record, dus een toekomstige wiring moet uitsluitend de kindsegment-rijen sommeren, nooit een parent-rij + kindrijen samen.
**Evidence:** CODE VERIFIED, zie het Triathlon & Brick Workflows-sprintrapport in `docs/`.
**Target:** bij een toekomstige wiring van `unifiedLoad()` naar een live dashboard: expliciet testen dat multisport-parent-sessies niet dubbel meetellen. Geen productbeslissing hier gefabriceerd over wanneer/of dit gebouwd wordt.
**Priority:** P2 (niet-kritiek — geen huidig, actief probleem; een architectuurwaarschuwing voor toekomstig werk). **Complexity:** S.

### GAP-P3-023 (nieuw, Athlete Dashboard 2.0-sprint) — verwarrende naamgeving: computeProgramProgress()'s "adherencePct" is een ander concept dan AdherenceIntelligenceCore
**Capability-ID:** ADHERENCE-INTELLIGENCE-001
**Current:** `computeProgramProgress()`/`computeProgramProgressPure()` (F4-erfenis, gebruikt bij programma-regeneratie en het weekoverzicht) berekenen `adherencePct` als `completed.length/blocks.length*100`, waarbij `blocks` het volledige programma kan omvatten inclusief toekomstige, nog-niet-uitgevoerde blokken. Dit is een ander concept ("programma-doorloop-percentage tijdens regeneratie-beslissingen") dan de nieuwe, canonieke `AdherenceIntelligenceCore` (die FUTURE-items expliciet uitsluit van de noemer) — maar de identieke veldnaam is verwarrend en kan tot onterechte aannames leiden dat beide hetzelfde meten.
**Evidence:** CODE VERIFIED, vastgesteld tijdens de (inmiddels afgeronde) Athlete Dashboard 2.0-sprint, zie het bijbehorende sprintrapport in `docs/` (Dashboard 2.0, F7 Analytics & Athlete Intelligence).
**Target:** een toekomstige naamsverduidelijking (bv. hernoemen naar `programCompletionPct`) om conceptuele verwarring te voorkomen. Geen berekeningswijziging nodig — de bestaande functie is voor haar eigen doel (regeneratie-context) correct, dit is uitsluitend een naamgevingsprobleem. Geen productbeslissing hier gefabriceerd over wanneer dit uitgevoerd wordt.
**Priority:** P3 (niet-kritiek — geen functionele fout, uitsluitend naamgevingsverwarring). **Complexity:** S.

### GAP-P3-024 (nieuw, Life-stage Performance Context-sprint) — geen suggestie-koppeling tussen de dagelijkse cyclus-self-report en de bestaande CycleCore-schatting
**Capability-ID:** CTX-CYCLE-001
**Current:** `hrv_log.cyclus_fase` (dagelijkse, handmatige self-report in de HRV-check-in, voedt `cyclusDagFactor()`) en `cycle_periods`/`cycle_symptom_logs` (voedt `CycleCore.cycleContext()`, een berekende fase-schatting) zijn bewust, veilig gescheiden systemen (geen automatische overschrijving). De atleet moet echter volledig handmatig haar fase invullen in de dagelijkse check-in, ook als er al een `CycleCore`-schatting beschikbaar is -- geen suggestie-koppeling tussen beide.
**Evidence:** CODE VERIFIED, vastgesteld tijdens de (inmiddels afgeronde) Life-stage Performance Context-sprint, F8 Women's Performance.
**Target:** de dagelijkse HRV-check-in-UI zou de bestaande `CycleCore`-schatting als voorinvulling/suggestie kunnen tonen (nooit als automatische, ongeziene overschrijving) om de gebruikerslast te verlagen. Vereist zorgvuldig UI-werk in de dagelijkse check-in-flow.
**Priority:** P3 (niet-kritiek — geen veiligheidsprobleem, uitsluitend een gebruikerslast-verbeterpunt). **Complexity:** M.

**Gerelateerde capability:** de AI-programmagenererings-/adaptieve-weekregeneratie-capability (de veiligheidskritieke kerncapability is inmiddels gesloten — zie het sprintrapport voor de Adaptive Weekly Program Loop: canonieke exercise-ID-whitelist, preview+bevestiging, unified execution, en een nieuwe audit trail zijn allemaal technisch bevestigd)
**Current:** Hevy Trainer (feb 2026) genereert een volledig, zelf-aanpassend trainingsprogramma. TK's rule/evidence-gestuurde weekregeneratie (`heergenereerResterendeWeken()`) is nu volledig veilig en auditeerbaar, maar vereist nog altijd expliciete gebruikersbevestiging per regeneratie — geen volautomatische, ongevraagde doorlopende aanpassing zoals Hevy.
**Evidence:** Web (juni 2026, PRPath-vergelijking) + CODE VERIFIED.
**Target:** een eventuele verdere productrichting (volautomatische aanpassing) is een bewuste productbeslissing, geen technische blokkade — TK's evidence-laag (adherence%/RPE-delta-gestuurde regeneratie met audit trail) is al een differentiator t.o.v. Hevy's black-box-aanpak.
**Dependency:** EVID-SCI-001, DEC-CORE-001 (beide voldaan).
**Priority:** P2 — hernummerd van P1 (de veiligheidskritieke capability zelf is afgerond; het resterende gat is een productrichtingskeuze, geen architectuur- of veiligheidsrisico). **Complexity:** L. **Roadmap phase:** F4 (afgerond in de sprint die de Adaptive Weekly Program Loop bouwde).



---

## P2 — grote verbetering

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

### GAP-P2-024 (nieuw, F11.03) — team_events.created_by CASCADE kan andermans aanwezigheidshistorie meeslepen
**Current:** als de aanmaker van een `team_events`-rij (`created_by`) het account verwijdert, verdwijnt het event via CASCADE, inclusief `event_attendance`/`event_responsibilities` van ANDERE, actieve teamleden (die op hun beurt cascaden via `event_id`). Geen security-lek (geen ongeautoriseerde toegang), wel een data-retentie-vraagstuk: een teamlid kan zijn eigen historische aanwezigheidsregistratie kwijtraken doordat een andere gebruiker (de organisator) het account verwijdert.
**Target:** `created_by` op `ON DELETE SET NULL` in plaats van CASCADE, zodat het event (en de aanwezigheidshistorie van anderen) blijft bestaan met een "verwijderde organisator"-weergave.
**Priority:** P2, niet-blokkerend voor MS-F11-03 CLOSED. **Complexity:** S. **Roadmap phase:** F11 (toekomstige vervolgsprint of technical-debt-cyclus).

### GAP-P2-025 (nieuw, F13 Post-Audit P1-10) — Endurance datamodel (running/cycling/rowing) blijft minimaal
**Current:** `sessions.distance` is `integer` zonder expliciete unit, `time_str` is vrije tekst, geen laps/intervals/streams-model, geen athlete endurance-profiel (FTP/threshold-pace/max-HR/zones). `CardioCore.criticalSpeed()`/`criticalPower()` (CALC-END-004/004B) zijn al geïmplementeerd maar niet geïntegreerd op echte lap/stream-data. Running/Cycling-capability-scores blijven 3/10 (ongewijzigd t.o.v. de oorspronkelijke audit).
**Target:** een volledig, migratie-klaar schemacontract (`activities`/`activity_laps`/`athlete_endurance_profile`, SI-canonical units, provenance, RLS, indexering) is uitgewerkt in `docs/F13_POST_AUDIT_P1_10_ENDURANCE_ARCHITECTURE_CONTRACT.md`. Bewust NIET live uitgevoerd in F13 Post-Audit -- er bestaat nog geen enkele UI/logica-consumer die deze tabellen zou gebruiken; een toekomstige, aparte sprint kan het contract direct als migratie uitvoeren.
**Priority:** P2 (architectuurschuld, geen actief security-/data-integriteitsrisico). **Complexity:** L. **Roadmap phase:** toekomstige, nog niet ingeplande sprint (ARCHITECTURE READY — IMPLEMENTATION OPEN).

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

### (nieuw, F11.03 zelf-gevonden en zelf-gerepareerd) — team-analytics cohort-drempel was client-omzeilbaar — **STATUS: CLOSED (live gerepareerd)**
- **Original finding:** `get_team_attendance_summary()` (migratie_v517.sql, deze sessie, nooit gemergd naar main) stond toe dat de aanroeper zelf `p_min_cohort_size` verlaagde tot onder het canonieke minimum van 5. Live bevestigd: met `p_min_cohort_size=1` kon staff het exacte percentage van een cohort van 1 persoon zien -- een volledige omzeiling van de minimum-cohort-privacygarantie.
- **Resolution:** `migratie_v519.sql` -- het canonieke minimum (5) is nu een server-side ondergrens via `GREATEST(coalesce(p_min_cohort_size, 5), 5)`, nooit door de client te verlagen, uitsluitend te verhogen.
- **Verified:** live adversarial herbevestigd (aanval geeft nu insufficient_data), `core/fTeamAnalyticsCohortFloor.test.js` (4/4, sabotagebewijs).

### (nieuw, F11.03 adversarial matrix) — vier tenant-escape/data-integriteitsbugs in team_events/attendance/responsibilities — **STATUS: CLOSED (live gerepareerd)**
- **Findings:** (1) cross-tenant location-koppeling op team_events (P1); (2) team_id-mutatie op team_events (lagere impact); (3) linked_training_instance_id kon verwijzen naar een niet-teamlid (data-integriteit, geen data-lek); (4) event_id/user_id-mutatie op event_attendance/event_responsibilities (P2, tenant-identifier-immutabiliteit).
- **Resolution:** `migratie_v518.sql` -- vier BEFORE INSERT/UPDATE-triggers die de betrokken identiteitsvelden valideren/onveranderlijk maken.
- **Verified:** live adversarial bevestigd vóór en na elke fix, `core/fTeamEventsAdversarialFixes.test.js` (6/6, met een zelf-gecorrigeerde testzwakte: de eerste versie testte alleen een foutmelding-string, niet de daadwerkelijke conditie).

### (nieuw, F11 Baseline & Gap Audit) — `memberships` stond self-role-elevation toe naar `owner` voor elke organisatie — **STATUS: CLOSED (live gerepareerd)**
- **Original finding:** vóór enige MS-F11-01-implementatie, tijdens de verplichte baseline-audit van de bestaande, als VALIDATED gemarkeerde `GYM-RLS-SCOPING-001`-capability, bleek `public.memberships` een kritieke, cross-tenant privilege-escalatie-kwetsbaarheid te bevatten: de bestaande INSERT- en UPDATE-policies controleerden uitsluitend `auth.uid() = user_id` (voorkomt dat je een rij voor iemand anders aanmaakt), maar controleerden GEEN ENKELE keer de `role`-kolom. Live adversarial bevestigd (transacties zonder commit, geen permanente wijziging): (1) een willekeurige, niet-gerelateerde gebruiker kon een `memberships`-rij insereren met `role='owner'` voor een organisatie van iemand anders, zonder enige uitnodiging; (2) een gewoon, legitiem lid ('member') kon zichzelf via een UPDATE promoveren naar `role='owner'`. Impact: elke ingelogde gebruiker kon zichzelf volledige eigenaarsrechten geven over elke organisatie in het systeem.
- **Root cause voor het niet eerder ontdekt zijn:** de bestaande `fGymRlsMultiTenant.test.js` (22/22, statische contractcheck) testte grondig op cross-tenant-zichtbaarheid (tenant A ziet tenant B niet), maar bevatte geen enkele test die specifiek zelf-role-elevation binnen `memberships` controleerde. Dit is een lacune in de oorspronkelijke testmatrix, geen fout in de bestaande, geslaagde tests zelf.
- **Resolution:** `memberships_insert_own` herschreven -- zelf-insert is uitsluitend toegestaan met de laagste, neutrale rol (`role='member'`), tenzij de aanvrager daadwerkelijk `organizations.owner_user_id` is (het legitieme bootstrap-scenario: een eigenaar registreert de eigen membership-rij). `memberships_update_own` herschreven -- zelf-update is uitsluitend toegestaan voor de organization-owner; gewone leden kunnen momenteel geen enkel veld van de eigen membership-rij wijzigen via deze policy, inclusief `role`.
- **Live herbevestigd na de fix:** dezelfde INSERT-aanval geeft nu een expliciete RLS-policy-schending; dezelfde UPDATE-aanval raakt 0 rijen (role blijft `member`); het legitieme zelf-insert-als-member-scenario slaagt correct; het legitieme owner-bootstrap-scenario slaagt correct.
- **Mastersprint:** F11 Baseline & Gap Audit (vóór MS-F11-01).
- **Verified:** `migratie_v511.sql`, `core/fMembershipsSelfElevationFix.test.js` (4/4, sabotagebewijs geleverd).

### (voorheen GAP-P2-023) — de bestaande `trg_set_user_id`-trigger op `programs` blokkeerde legitieme coach-toewijzing — **STATUS: CLOSED**
- **Original finding:** een eerste MS-F10-03-implementatiepoging (coach schrijft direct in `public.programs` met `user_id=athlete_id`) bleek niet te werken: de bestaande `trg_set_user_id`/`set_user_id_from_auth()`-trigger dwingt onvoorwaardelijk `NEW.user_id := auth.uid()` af, ongeacht welke `user_id` de coach opgaf. Live adversarial bevestigd (transactie zonder commit): een coach-INSERT-poging met `user_id=athlete_id` resulteerde in een rij met `user_id=coach_id`. Geen lek naar andermans data, maar de bedoelde functionaliteit werkte niet. De niet-functionerende, ongeteste eerste policy-poging (`coach_creates_program_for_athlete`) werd direct verwijderd.
- **Resolution:** Product Owner koos expliciet voor een volledig gescheiden coach-authored/assignment/materialisatie-architectuur, met behoud van de `trg_set_user_id`-invariant. `coach_program_templates` (coach-owned) → `coach_program_assignments` (koppeling) → athlete-geïnitieerde `materialize_coach_assignment()`-RPC (SECURITY DEFINER, uitsluitend aanroepbaar door de athlete zelf) die de volledige inhoud (dagen/oefeningen) materialiseert in de bestaande, canonieke keten (`programs`/`program_blocks`/`custom_trainings`/`training_exercises`) — alle vier tabellen behouden hun eigen, bestaande `trg_set_user_id`-trigger, geen enkele bypass. Server-side exercise-ID-validatie tegen de canonieke Exercise Library. Acht kritieke scenario's live adversarial bewezen: volledige flow (alle vier eigenaarschapskolommen correct op de athlete), coach kan niet zelf materialiseren, onbekend exercise_id geweigerd, atomiciteit (midden-in-het-proces-fout laat 0 sporen achter), idempotentie op de volledige content, revoke laat een reeds gematerialiseerd programma intact, delete-completeness bevestigd. Calendar/adherence bewezen zonder enige codewijziging via de bestaande `AdherenceIntelligenceCore`.
- **Mastersprint:** MS-F10-03 (Coach Programming & Assignment).
- **Verified:** `docs/MS-F10-03_COACH_PROGRAMMING_ASSIGNMENT.md`, `core/fCoachProgramCore.test.js` (21/21), `core/fCoachProgramRls.test.js` (13/13), `core/fDeleteAccountSecurity.test.js` (25/25), alle met sabotagebewijs.

### (voorheen GAP-P2-001) — Vijf openstaande Women's Performance-productbeslissingen — **STATUS: CLOSED**
- **Original finding:** vijf productbeslissingen (cycle/symptomen/contraceptie/zwangerschap-postpartum/perimenopauze-menopauze-bekkenbodem) stonden open sinds 26 augustus, blokkeerden F8 volledig.
- **Resolution (MS-F8-01):** F8 Entry Audit bevestigde een reeds bestaande, zorgvuldig gebouwde Cycle & Symptom-infrastructuur (`core/cycle.js`/`core/cycleTraining.js`, `cycle_periods`/`cycle_symptom_logs`, beide live geverifieerd met correcte RLS). Actueel onderzoek (2023-2026) geraadpleegd. Vijf besluiten expliciet vastgelegd (`docs/MS-F8-01_WOMENS_PERFORMANCE_PRODUCT_DECISIONS.md`): Cycle en Symptoms IMPLEMENT (reeds correct bestaand); Contraceptie, Zwangerschap/Postpartum, Perimenopauze/Menopauze/Bekkenbodem DEFER (conservatieve, reversibele default, Product Owner niet beschikbaar tijdens uitvoering, vastgelegd in `docs/F8_PRODUCT_OWNER_DECISIONS.md`).
- **Mastersprint:** MS-F8-01 (Women's Performance Product Decisions).
- **Evidence:** `docs/F8_EXISTING_WOMENS_PERFORMANCE_AUDIT.md`, `core/fWomensPerformanceDecisions.test.js` 13/13 met sabotagebewijs.
- **Closed date:** 29 augustus 2026.

### (voorheen GAP-P1-008) — hrv_log race-condition / duplicate daily records — **STATUS: CLOSED**
- **Original finding (F3 Final Integration Audit):** live data-audit bevestigde 4 bestaande paren duplicate `(user_id,date)`-rijen. 3 identieke race-condities, 1 met echte datadivergentie (`rhr=null` vs. `rhr=57`). Root cause: geen `UNIQUE(user_id,date)`, niet-atomair lees-dan-PATCH/POST-schrijfpatroon.
- **Resolution (F3 Closure Hotfix):** `migratie_v500.sql`, live uitgevoerd. Archivering (`hrv_log_archive_v500`, 8 rijen, permanent) → reconciliatie per de vooraf vastgelegde `docs/DAILY_HEALTH_FIELD_RECONCILIATION_CONTRACT.md` (union-merge, geen conflicterende gevallen, geen productbeslissing nodig) → live zero-duplicates-verificatie → `UNIQUE(user_id,date)`-constraint → nieuwe atomaire `upsert_daily_health`-RPC (`SECURITY DEFINER`, `INSERT..ON CONFLICT..DO UPDATE`). Beide schrijfpaden (client + server) omgebouwd. Aanvullend: `pickLatestMetric()` bijgewerkt naar de per-veld-provenance-kolommen.
- **Mastersprint:** F3 Closure Hotfix (post-F3-11, vóór finale F3-herclassificatie).
- **Evidence:** live migratie-uitvoering + verificatie (0 resterende duplicaten, constraint actief, RPC functioneel getest met het mixed-source-scenario), `core/fHrvConcurrencyClosure.test.js` 15/15 met sabotagebewijs, volledige regressie 104/104.
- **Closed date:** 29 augustus 2026.


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
