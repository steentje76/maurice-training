# CONTEXT_CONTRACT.md — Trainingskompas

**Doel:** canonieke context-taxonomie, herkomst- en versheidscontract, per Master Roadmap 2.0 v1.1 (MS-F3-06). Vult `docs/CALCULATION_REGISTRY.md` aan met de laag die context — niet berekening — beschrijft.

## Belangrijke bevinding: twee context-systemen, één daadwerkelijk actief
`core/contextEngine.js` bevat het expliciete, eigen commentaar: *"dit bestand is additief naast de bestaande buildCtx() in index.html — het VERVANGT buildCtx() niet en wordt in deze sprint nog NERGENS aangeroepen vanuit index.html."* `ContextEngineCore` is dus **dode code vanuit runtime-perspectief** — een pure, geteste module die nooit door de live app wordt aangeroepen. De **daadwerkelijke, canonieke contextbron is `buildCtx()`** (index.html, regel ~18769), die alle context voor de AI-coach verzamelt en tot een promptstring samenstelt.

Dit is geen kritiek defect (geen dubbele, tegenstrijdige waarheid — er is maar één daadwerkelijk actieve bron), maar wel een reële architectuurinconsistentie: een module bestaat die zich als "de" Context Engine presenteert, maar niet de rol vervult. Geregistreerd als GAP-P2-014.

## Context Field Inventory (uit `buildCtx()`, de daadwerkelijk actieve bron)

| Field | Locatie | Origin | Freshness | Consumer | Risico |
|---|---|---|---|---|---|
| HRV/RHR/slaap (`hd[0]`) | `hrv_log` via `sbGet` | **RAW_SOURCE** (handmatig of wearable — zie GAP-P1-007, provenance nog niet onderscheiden) | **daily** | AI-promptcontext | Laag risico voor de context zelf; het onderliggende provenance-gat (GAP-P1-007) is al elders geregistreerd |
| HRV-baseline-status (`hrvComponent`) | `hrvDagFactorPersonal()` (canonieke calculatie) | **CALCULATED** | **daily** (herberekend per contextopbouw, niet gecachet) | AI-promptcontext (`hrvGuide`-tekst) | Geen — correct gedelegeerd aan de canonieke calculatie, geen herberekening in `buildCtx()` zelf |
| Lichaamsgewicht (`wd`) | `weight_log` | **USER_REPORTED** | **slow-changing** (laatste 3 metingen) | AI-promptcontext | Geen |
| Lichaamscompositie (`bc`) | `body_comp` (Tanita-sync) | **DEVICE** (extern apparaat, geen TK-berekening — consistent met MS-F3-05's bevinding dat BMR extern blijft) | **slow-changing** | AI-promptcontext | Geen |
| Recente sessies per oefening (`recentSessions`/`exCtx`) | `sessions` | **RAW_SOURCE** (gelogde trainingsdata) | **session** (elke voltooide training) | AI-promptcontext | Geen |
| Trainingscontext (frequentie/dagen/materiaal) | `training_context` (onboarding-intake) | **USER_REPORTED** (via `OnboardingCore`, F2-bevestigd deterministisch gevalideerd) | **persistent/slow-changing** | AI-promptcontext (`tcSummary`) | Geen — F2-audit bevestigde al de deterministische validatiegrens |
| Volgende/laatste vaste training (`nextT`/`lastT`) | `computeNextVasteTraining`/`sessions` | **CALCULATED** | **daily** | AI-promptcontext | Geen |
| Actieve sport (`sportBlock`) | `getActiveSport()` | **USER_REPORTED** (sportkeuze) | **slow-changing** | AI-promptcontext | Geen |
| Huidige oefening/sessie (`sessionCtx`, alleen indien `ctx.exId`) | in-memory `sessionLog`/`TRAIN_CFG` | **SYSTEM** (live app-state) | **realtime/session** | AI-promptcontext | Geen |
| Live coach-context (`window._tkLiveAi`) | Decision Engine (reeds besloten getallen) | **DERIVED_CONTEXT** (expliciet: "reeds besloten door de Decision Engine — niet herberekenen") | **realtime** | AI-promptcontext | **Cruciaal correct**: de bijbehorende prompttekst instrueert de AI expliciet "wijzig het advies of het getal niet, vul ontbrekende gegevens niet in, beschrijf geen oorzaak-gevolg" — dit is precies de AI-grens die de opdracht vereist, al vóór deze sprint aanwezig |
| Gecorroboreerd belastingssignaal (`deloadSignaalTekst`) | `TrainingLoadCore.corroboratedLoadSignal()` (canoniek, MS-F3-02) | **CALCULATED** (via twee onafhankelijke, canonieke signalen) | **daily/weekly** | AI-promptcontext | Geen — expliciete tekst bevat al "geen automatische aanpassing, geen advies zonder overleg" |

## Context Engine berekent niets (bevestigd, sectie 6/19 van de opdracht)
Repo-breed gecontroleerd: `buildCtx()` roept uitsluitend canonieke calculatiefuncties aan (`hrvDagFactorPersonal`, `TrainingLoadCore.classifyAcwr`/`corroboratedLoadSignal`, `computeNextVasteTraining`) — geen enkele metric wordt opnieuw, lokaal binnen `buildCtx()` berekend. `ContextEngineCore` (het ongebruikte bestand) berekent evenmin iets — `buildStructuredContext`/`mergeAthleteContexts` combineren uitsluitend, tellen/sommeren niets (expliciet in het eigen bestandscommentaar bevestigd). **Geen duplicate-calculation-gap gevonden in dit domein.**

## No fabricated context (bevestigd, sectie 5/20)
Geen enkel veld in `buildCtx()` vult een ontbrekende waarde met een verzonnen default: HRV-referentiefase toont expliciet "nog onvoldoende eigen data" i.p.v. een geraden status; sportcontext, trainingscontext en lichaamsgegevens tonen hun eigen "geen data"-teksten (`'Geen recente HRV'`, `cfgEx?...`:'onbekend'`) in plaats van AI te laten gokken.

## Privacy (sectie 8)
HRV/RHR/slaap/lichaamscompositie zijn gevoelige gezondheidscontext. `buildCtx()` wordt uitsluitend voor de AI-coachprompt van de eigen atleet gebruikt (geen coach/team/social-toegang binnen deze functie aangetroffen) — consistent met de bestaande RLS/ownership-architectuur (F1-bevestigd). Geen aparte privacy-regressie nodig binnen dit domein, buiten de reeds bestaande, geteste RLS-laag.

## Context Contract (schema, sectie 7)
Voor elk bovenstaand veld geldt impliciet, en is hierbij geëxpliciteerd: `name` (kolomnaam), `source` (zie Origin-kolom), `freshness` (zie kolom), `nullable` (elk veld toont expliciet een "geen data"-variant, dus effectief overal `true`), `allowed consumers` (uitsluitend de AI-coachprompt binnen deze functie), `privacy sensitivity` (hoog voor HRV/RHR/slaap/lichaamscompositie, laag voor trainingsdata/sportkeuze).

## Open Gaps (Context-domein)
- **GAP-P2-014** (nieuw, deze sprint): `core/contextEngine.js` (`ContextEngineCore`) is dode code — nooit aangeroepen vanuit `index.html`. Ofwel alsnog bedraden (bewuste architectuurkeuze, geen technische blocker meer sinds F2), ofwel expliciet als "toekomstige building block, nog niet actief" documenteren i.p.v. impliciet te laten staan.
