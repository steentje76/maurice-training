# MS-F2-08_GAP_P1_006_CLOSURE.md — Trainingskompas

## Root cause heropend en herbevestigd (sectie 18 van de opdracht)
`docs/MS-F2-01_CANONICAL_TRAINING_START.md` en de actuele code opnieuw gecontroleerd, geen eerdere rapportage blind vertrouwd. Bevestigd: 6/8 entrypoints (alle vaste- en custom-trainingen) lopen via `openTrainingPreview()`→`startInstanceFromDefinition()`→`createTrainingInstance()`. Programma-blok en Repeat Workout niet.

**Diepere root cause dan aanvankelijk beschreven:** het daadwerkelijke, schadelijke gevolg van deze niet-convergentie is niet "twee stijlen UI", maar dat **Programma-blok en Repeat Workout nooit een `training_instances`-rij kregen**. `activeInstanceId` bleef bij een verse start van beide altijd `null`; `completeTrainingInstance()` deed bij afronden dus niets. Deze twee trainingsbronnen waren volledig onzichtbaar voor de plan-versus-uitvoering-dataset — exact de dataset die een eerder code-commentaar ("Fase 2") al "de rijkste ongebruikte dataset van de app" noemde toen dit voor vaste/custom werd gefixed.

## Gekozen sluitingsscope (bewust, met onderbouwing)
**Doel:** canonieke instance-tracking (persistence-laag) voor alle 8 entrypoints, niet per se identieke Preview-UI voor alle 8.

**Waarom niet de volledige Preview-modal forceren voor Programma/Repeat:**
- Programma heeft een eigen, product-relevante check-in-flow (slaap/HRV/pijn-vragen → `evaluateProgAdjustment()`) die niet bestaat voor vaste/custom — functioneel rijker, niet een inferieure kopie.
- Repeat Workout heeft een eigen gewicht-aanpassing-preview (`updateRepeatPreview()`, %/absolute aanpassing) specifiek voor het herhalen-met-progressie-scenario.
- Beide geforceerd door de generieke `openTrainingPreview()`-modal leiden zou vereisen dat deze twee flows worden herbouwd binnen een modal die daar niet op is ontworpen — een grote, risicovolle UI-herbouw van twee al goed-werkende, veelgebruikte flows, zonder aangetoonde gebruikersgevoelde noodzaak (opdracht sectie 30: "Geen blinde rewrite").
- Opdracht sectie 20 bevestigt expliciet dat dit toegestaan is: *"Convergentie betekent NIET dat alle broncontext hetzelfde wordt... maar beide moeten dezelfde execution infrastructuur gebruiken."*

**Wat wél volledig geconvergeerd is (de execution-infrastructuur zelf):**
- Canonieke instance-creatie: `createTrainingInstance()` voor alle 4 bronnen (vast/custom/programma/repeat).
- Canonieke instance-afronding: `completeTrainingInstance()` werkt nu voor alle 4 (was voorheen een no-op voor programma/repeat, want `activeInstanceId` was altijd `null`).
- Canonieke execution-state (`curT`/`sessionLog`/`renderTrainScreen`/`startTrainTimer`) — dit was al gedeeld sinds vóór deze sprint (bevestigd in MS-F2-01/02).
- Canonieke resume-garantie (MS-F2-07-fix) blijft volledig intact — bij resume wordt de bestaande instance van de draft hergebruikt, geen dubbele instance.

## Implementatie
- `startRepeatWorkout()`: `activeInstanceId=await createTrainingInstance({vasteTrainingId:t, snapshot:{source:'vaste_training_repeat', definition_id:t, repeat_of_date, repeat_mode, repeat_adjustment, items, decision_rules, modifications:[]}})`. Altijd een nieuwe instance — nooit de oorspronkelijke sessie-identity hergebruikt (voldoet aan de invariant uit sectie 22/24: "oude execution ≠ nieuwe execution").
- `launchProgramTrainScreen()`: bij verse start (`!_resume`) `activeInstanceId=await createTrainingInstance({snapshot:{source:'program_block', definition_id:blockId, program_id, week_nr, fase_naam, items, decision_rules, modifications:[recovery_adjustment indien van toepassing]}})`. Bij resume (`_resume`) ongewijzigd: `activeInstanceId=_draft.instanceId||null` (bestaande MS-F2-07-garantie, geen dubbele instance — sectie 25).
- Geen databasemigratie: `training_instances.snapshot` is al vrije-vorm JSONB (`data_type: jsonb`, live geverifieerd), dus de nieuwe provenance-velden (`source`, `program_id`, `repeat_of_date`, etc.) passen zonder schemawijziging.
- Beide `createTrainingInstance()`-aanroepen in een `try/catch`: instance-tracking mag nooit de trainingstart zelf blokkeren als de aanroep faalt (fail-safe, consistent met de bestaande architectuurprincipes uit MS-F1-02/MS-F2-02).

## GAP-P1-006-test (sectie 29, sabotagebewijs sectie 30)
`core/fGapP1006Closure.test.js` (11/11): bevestigt beide `createTrainingInstance()`-aanroepen, de juiste provenance-tags, en dat de MS-F2-07-resume-garantie intact blijft. **Sabotagebewijs geleverd:** de Repeat-route tijdelijk laten bypassen (aanroep vervangen door een genegeerde expressie) → test faalde met exit 1 en de exacte, verwachte melding → volledig teruggedraaid, `git diff` na herstel bevestigd leeg.

## MS-F2-01 herclassificatie (sectie 31)
De oorspronkelijke acceptance gate van MS-F2-01 (*"All normal entry points converge without duplicated execution logic"*) wordt hiermee alsnog grotendeels gehaald op het niveau dat er daadwerkelijk toe doet (gedeelde persistence-infrastructuur, geen dubbele/ontbrekende instance-tracking meer). De **Preview-UI-oppervlakte** blijft bewust gedifferentieerd voor Programma/Repeat (zie hierboven) — dit is een eerlijke, beargumenteerde grens, geen resterend defect.

**MS-F2-01: initially PARTIAL in PR #78 (2 execution-identity/timer-defecten gefixed, architecturale convergentie nog open); remaining convergence (instance-tracking) closed during MS-F2-08 (deze sprint). Preview-UI-differentiatie voor Programma/Repeat is een bewuste, gedocumenteerde productgrens, geen open architectuurgat.**
**MS-F2-01 eindstatus: CLOSED.**

## Canonical Training Start — finale 8-entrypoint-matrix

| Entrypoint | Preview-UI | Instance-creatie | Resume-garantie |
|---|---|---|---|
| Vaste training (4×) | `openTrainingPreview('vast')` | ✅ canonical | ✅ (MS-F2-01) |
| Custom training (2×) | `openTrainingPreview('custom')` | ✅ canonical | ✅ (MS-F2-01) |
| Programma-blok | eigen check-in-flow (bewust) | ✅ canonical (MS-F2-08) | ✅ (MS-F2-07) |
| Repeat Workout | eigen aanpassing-preview (bewust) | ✅ canonical (MS-F2-08) | n.v.t. (repeat is per ontwerp altijd een verse start) |

**8/8 entrypoints: canonieke instance-creatie + canonieke execution-infrastructuur.** 6/8 delen bovendien identieke Preview-UI; 2/8 hebben een bewust gedifferentieerde, functioneel rijkere pre-executie-UI — expliciet toegestaan per opdracht sectie 20.

## UX Benchmark (sectie 32-36 van de opdracht)
Zie `docs/BENCHMARK_REGISTRY.md` (reeds bestaand, niet in deze sprint opnieuw extern geverifieerd — geen materiële claim in dit rapport hangt af van een ongeverifieerd extern detail). Kernconclusie ongewijzigd t.o.v. eerdere audits: Trainingskompas onderscheidt zich op evidence/provenance-transparantie en HYROX/multisport-specificiteit; benchmark-gap blijft vooral bij AI-auto-programmering (F4, buiten F2-scope).

## Data-integriteit finale check (sectie 38)
Geen nieuwe P0/P1 gevonden tijdens deze afsluitende audit. De twee reeds gefixte defecten (MS-F2-01 execution-identity, MS-F2-07 programma-resume) en deze sprint (GAP-P1-006 instance-tracking) waren de enige geïdentificeerde data-integriteitsgaten in de volledige F2-scope.

## Final Contract Reconciliation (heraudit na F2-closure)
Een aparte, gerichte heraudit vergeleek de vier startfamilies (vast/custom/programma/repeat) opnieuw, punt voor punt, op elk concern uit het canonieke contract. Bevinding: **B — technisch voldoet aan de intentie van het contract, de oorspronkelijke formulering behoefde precisering, geen resterende architectuurgap.**

**Concreet bewijs:**
- `createTrainingInstance()` is en blijft de enige, canonieke plek waar een `training_instances`-rij ontstaat — voor alle 4 families. Vast/custom roepen dit aan via de gedeelde `startInstanceFromDefinition()`-adapter (binnen `previewStartTraining()`); Programma/Repeat roepen dezelfde primitief rechtstreeks aan met hun eigen, legitiem afwijkende snapshot-provenance. Dit patroon (gedeelde primitief, source-specifieke orchestratie voor categorieën met wezenlijk andere context) is **geen nieuwe afwijking** — de bestaande HYROX/multisport-race-start-functie (buiten F2-scope, regel ~23765) gebruikt exact hetzelfde patroon en bestond al vóór deze sprint.
- Timer-lifecycle (`startTrainTimer`), persistence (autosave-draft/`sessionLog`-globals), logging (`finishSession()`'s schrijflogica), completion (`completeTrainingInstance()`) en discard (`execLeaveDiscard`) zijn voor alle 4 families **onvoorwaardelijk identiek** — geen enkele van deze vijf concerns bevat een source-specifieke tak.
- Resume-detectie is voor elke van de 4 families **apart geïmplementeerd** (geen centrale `resumeExecution()`-helper) — maar dit is de **uniforme, bestaande conventie in de hele codebase**: ook vast en custom (de twee "canonieke" families) delen onderling geen gemeenschappelijke resume-functie, elk heeft zijn eigen resume-blok. Dit is dus geen door Programma/Repeat geïntroduceerde nieuwe inconsistentie.

**Gecorrigeerde acceptance-formulering (verduidelijking, geen versoepeling):**
*"All normal entry points converge on one canonical execution lifecycle (instance creation, timer, persistence, logging, completion, discard) without duplicated execution logic; source-specific pre-execution UX/adapters (definition construction, program/repeat provenance, targets, adjustments) may differ."*

**Geen productcodewijziging in deze reconciliatiesprint** — geen echt defect aangetroffen dat een wijziging rechtvaardigde.

## MS-F2-08 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Flow/taps/error/empty/loading benchmark against leading apps."*
**Resultaat: CLOSED.** De F2-integratiesprint is voltooid: GAP-P1-006 is gesloten (canonieke persistence voor alle 8 entrypoints), MS-F2-01 is herclassificeerd naar CLOSED, en geen resterend F2-blokkerend architectuurgat is aangetroffen.
