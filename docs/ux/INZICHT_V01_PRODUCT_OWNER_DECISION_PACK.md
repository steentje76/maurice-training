# INZICHT_V01_PRODUCT_OWNER_DECISION_PACK.md

## Overzicht: alle 12 decisions herclassificeerd

| ID | Question | Classification | Blocking | Can resolve without PO? |
|---|---|---|---|---|
| D1 | Verbeterd-definitie | **A. ALREADY DEFINED** | NEE (opgelost) | JA |
| D2 | Stijgende trends-richting | **A. ALREADY DEFINED** | NEE (opgelost) | JA |
| D3 | Adherence-noemer | **B. TECHNICAL FACT**, met 1 gerapporteerd conflict (SKIPPED-behandeling) | GEDEELTELIJK — zie PO1 hieronder | GEDEELTELIJK |
| D4 | Insight-ranking | **C. PRODUCT OWNER DECISION** | JA | NEE — zie PO2 |
| D5 | Herstel/HRV-scherm-consolidatie | **C. PRODUCT OWNER DECISION** (laag risico) | NEE | NEE, maar niet blokkerend |
| D6 | Doelen-scherm-consolidatie | **C. PRODUCT OWNER DECISION** (laag risico) | NEE | NEE, maar niet blokkerend |
| D7 | Gezondheidsgegevens & koppelingen: Inzicht of toekomstig Profiel? | **E. DEFERRED** — hangt af van een scherm dat nog niet bestaat | NEE | JA (voorlopig onder Inzicht houden) |
| D8 | Periode-parameter-ondersteuning per metric | **B. TECHNICAL FACT**, per metric te bevestigen tijdens implementatie (geen productbeslissing, puur verificatiewerk) | JA, per metric | JA (technisch onderzoek, geen PO-keuze) |
| D9 | Confidence/Data Quality-UI-component | **C. PRODUCT OWNER DECISION** (welk presentatiecontract) + **B. TECHNICAL FACT** (data bestaat al gedeeltelijk) | NEE | NEE — zie PO3 |
| D10 | Cyclus-zichtbaarheid op overzicht | **A. ALREADY DEFINED** (conservatieve keuze reeds vastgelegd, consistent met bestaande Women's Performance-governance) | NEE (opgelost) | JA |
| D11 | Sessions/activities-dubbeltelling bij "Trainingen" | **B. TECHNICAL FACT** | NEE (opgelost) | JA |
| D12 | Adherence-edge-cases (moved/missed/extra/meerdere per dag) | **B. TECHNICAL FACT** | NEE (opgelost, zie forensische resolutie) | JA |

**Samenvatting: van de 12, zijn er nu 3 ALREADY DEFINED, 4 TECHNICAL FACT (3 volledig opgelost, 1 met een gerapporteerd conflict), 1 DEFERRED, en 4 echte PRODUCT OWNER DECISIONS resterend** (D4, D5, D6, D9 — waarvan D5/D6 laag risico/niet-blokkerend zijn). Dat brengt het aantal daadwerkelijk *blokkerende* PO-keuzes terug tot **PO1 (Adherence-SKIPPED-conflict), PO2 (Insight Ranking), PO3 (Confidence-presentatie)**.

---

## PO1 — Adherence: SKIPPED-behandeling

**WHY USER WILL NOTICE:** een gebruiker die een training bewust annuleert (bv. wegens ziekte) ziet zijn Adherence-percentage dalen, ook al voelt dat voor hem/haar niet als "gemist".

**OPTION A (aanbevolen):** behoud de bestaande, conservatieve regel — SKIPPED telt mee als niet-voltooid in de noemer. Reden: er bestaat geen canonieke "geldige annulering"-status naast SKIPPED; die introduceren zou een nieuwe Decision Rule zijn, wat deze audit niet mag doen.

**OPTION B:** introduceer een nieuwe, aparte "geldig geannuleerd"-status die uit de noemer verdwijnt. Vereist een nieuwe database-status en een nieuwe Decision Rule — buiten de scope van een presentatie-migratie.

**TECHNICAL CONSEQUENCE:** Optie A = 0 codewijziging nodig aan `AdherenceIntelligenceCore`. Optie B = nieuwe schema-/logica-wijziging, aparte sprint.

**SCIENTIFIC CONSEQUENCE:** geen — dit is een productdefinitie, geen wetenschappelijke kwestie.

**UX CONSEQUENCE:** Optie A kan als "streng" aanvoelen; Optie B is genuanceerder maar duurder om te bouwen.

**CLAUDE RECOMMENDATION:** Optie A — de bestaande, al geïmplementeerde en gedocumenteerde regel gebruiken. Geen nieuwe complexiteit toevoegen aan een reeds werkende, deterministische module voor een presentatie-migratie.

**BLOCKING BUILD?** NEE bij keuze A (0 wijziging nodig). JA bij keuze B (vereist een aparte sprint eerst).

**MY DECISION: [OPEN]**

---

## PO2 — Insight Ranking

**WHY USER WILL NOTICE:** welke 3 kaarten onder "Belangrijkste inzichten" staan, en in welke volgorde.

**CANDIDATE SIGNAL INVENTORY (onderzocht):**
| Source | Canonical? | Evidence | Priority available? | Safe for overview? |
|---|---|---|---|---|
| `buildImprovementItems()`-output (newBest/improved/trendUp) | JA | deterministisch, versioned | NEE (geen expliciete prioriteits-score tussen items) | JA (data zelf is betrouwbaar) |
| Recovery Decision Engine-alerts | JA | deterministisch | onbevestigd binnen dit tijdsbudget | JA |
| Goal/programma-relevantie | bestaat (goals-tabel), geen expliciete "relevantie-score" gevonden | — | NEE | onbevestigd |
| AI Coach-signalen | NIET canoniek voor ranking (AI mag uitleggen, niet bepalen) | n.v.t. | n.v.t. | NEE, expliciet uitgesloten door architectuurprincipe |

**Geen canonieke, geversioneerde ranking-functie gevonden die meerdere signaaltypes combineert en prioriteert.**

**OPTION A:** canonical ranking bouwen (vereist een nieuwe Decision Engine-uitbreiding — buiten scope van deze migratie-sprint).
**OPTION B (aanbevolen voor v0.1):** toon uitsluitend de meest recente, gevalideerde items uit de al-bestaande `buildImprovementItems()`-output (chronologisch, geen prioritering) — geen nieuwe rankingregel, puur de bestaande, betrouwbare data zonder verzonnen volgorde.
**OPTION C:** vaste categorie-slots (bv. altijd 1 kracht-, 1 cardio-, 1 herstel-inzicht indien beschikbaar) — vereist eveneens een nieuwe, kleine regel, maar simpeler dan volledige ranking.

**TECHNICAL CONSEQUENCE:** B = 0 nieuwe calculation-code. C = kleine, nieuwe presentatie-regel (geen Decision Engine-wijziging). A = aparte, grotere sprint.

**SCIENTIFIC CONSEQUENCE:** B is het meest terughoudend — geen impliciete claim dat "dit de belangrijkste inzichten zijn", puur "dit zijn recente, bevestigde ontwikkelingen".

**UX CONSEQUENCE:** B kan minder "curated" aanvoelen dan de mockup suggereert; C balanceert dit met minimale extra complexiteit.

**CLAUDE RECOMMENDATION:** Optie B voor de eerste implementatie, met Optie C als expliciete, latere verbetering — nooit Optie A binnen deze migratie-sprint (dat is een Decision Engine-uitbreiding, geen UI-migratie).

**BLOCKING BUILD?** JA totdat gekozen — deze sectie kan niet zonder een expliciete keuze gebouwd worden.

**MY DECISION: [OPEN]**

---

## PO3 — Confidence/Data Quality-presentatie

**WHY USER WILL NOTICE:** hoe onzekerheid/ontbrekende data getoond wordt (of helemaal niet).

**A. DATA/CALCULATION SUPPORT (onderzocht):** provenance/manual-vs-device-onderscheid bestaat al (bv. `hrv_metric_type` met 'unknown'-default, zoals eerder vastgesteld in een andere sprint). Staleness-gate-concept bestaat al (`fix/home-coach-freshness-gate`). Sufficiency/confidence op progressie-niveau bestaat al (`ProgressionCore.sufficiency()`, statussen first/one_previous/comparison/trend). **Adherence heeft al een expliciete NOT_AVAILABLE/INSUFFICIENT_DATA-status.**

**B. UI COMPONENT SUPPORT:** geen apart, herbruikbaar "badge"-component gevonden dat deze statussen visueel samenvat.

**OPTION A (aanbevolen):** minimaal contract — overview toont uitsluitend tekstuele status waar nodig (bv. "Onvoldoende data" in plaats van een cijfer), geen apart badge-icoon-systeem. Detail-schermen (bestaande sub-routes) tonen desgewenst meer.
**OPTION B:** een klein, nieuw "status-label"-component (tekst + kleur, geen apart icoon) — iets meer visuele consistentie dan A, iets meer bouwwerk.
**OPTION C:** volledig, visueel badge-systeem met 5+ statussen zichtbaar per kaart — expliciet afgeraden (opdracht zelf waarschuwt: "voorkom vijf badges op iedere kaart").

**TECHNICAL CONSEQUENCE:** A = geen nieuw component. B = één klein, nieuw component. C = grotere componentbouw, afgeraden.

**SCIENTIFIC CONSEQUENCE:** zowel A als B respecteren UNKNOWN != 0 volledig; C loopt het risico visuele overload die de eigenlijke boodschap (onzekerheid) juist verdringt.

**UX CONSEQUENCE:** A is het meest rustig (consistent met de "geen wetenschappelijk dashboard"-eis), B iets consistenter qua vormgeving.

**CLAUDE RECOMMENDATION:** Optie A voor v0.1 — tekstuele status, geen nieuw visueel component, conform de expliciete eis om het overzicht niet vol te stoppen.

**BLOCKING BUILD?** NEE — kan met de eenvoudigste optie (A) zonder verder oponthoud starten; B/C zijn latere verbeteringen.

**MY DECISION: [OPEN]**
