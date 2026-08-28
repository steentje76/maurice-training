# DECISION_RULE_REGISTRY.md — Trainingskompas

**Doel:** canonieke registry van elke daadwerkelijke trainingsbeslissing in Trainingskompas, per Master Roadmap 2.0 v1.1 (MS-F3-07). Vult `docs/CALCULATION_REGISTRY.md` (rekent) en `docs/CONTEXT_CONTRACT.md` (contextualiseert) aan met de laag die beslist.

## Belangrijke bevinding: reeds uitzonderlijk mature Decision-infrastructuur
`core/decision.js` (849 regels) bevat al een compleet, versioned decision-systeem, inclusief een **onveranderlijk evidence-snapshot-mechanisme** (`buildDecisionEvidence`/`readDecisionEvidence`/`evidenceReproduceerbaar`) dat exact de end-to-end-traceerbaarheid biedt die MS-F3-10 vereist: raw→calculated→decision→rule→explanation, deterministisch, nooit met terugwerkende kracht gewijzigd. Elke regel bevat expliciet "geen fabricage"-commentaar en een `herkomst`-veld per component (gemeten/berekend/besloten).

## DECISION_RULE_INVENTORY

| Rule ID | Naam | Version | Input Calculation IDs | Required Context | Logic/Thresholds | Output | Evidence | Canonical? |
|---|---|---|---|---|---|---|---|---|
| DEC-PROG-001 | Progressie op basis van RPE | `progression.v1` | CALC-STR-002 (RPE) | trainingsgewicht | RPE≤7.5→+2.5kg; ≤8.5→0kg; anders→−7.5kg (deload) | `{delta, label}` / `progressionDecision` | **Product heuristic** — vaste kg-stappen, geen formule-specifieke wetenschappelijke bron voor exact déze increments | JA — enige implementatie |
| DEC-RECADJ-001 | Herstelgebaseerde set/RPE-aanpassing | `progression_adjust.v1` | dagfactor (CALC-REC-002), spierherstel-%, subjectief gevoel, pijn | dagfactor, spierherstel-rijen, gevoel, pijn | factor<0.90 of "slecht"→ −1,5 RPE/−1 set; factor<0.97 of "matig"/laag herstel→ −0,5 RPE; anders geen aanpassing | `{rpeDelta, setsDelta, redenen[]}` | **Product heuristic** — drempels zijn productkeuzes | JA — enige implementatie |
| DEC-READY-001 | Trainingsgereedheid (3 zones) | `readiness.v1` | dagfactor (CALC-REC-002) | dagfactor | f≥1.00→"Klaar om te trainen"; f≥0.93→"Train op gevoel"; anders→"Houd het licht vandaag" | `{cls, txt}` | **Product heuristic** | JA |
| DEC-DETRAIN-001 | Detraining-gewichtscorrectie | `detraining.v1` | dagen sinds laatste uitvoering | — | bandgebaseerd, per-band-factor uit configureerbare `rules.bands` | `{factor, band, applicable}` | **Technical/product heuristic** — detraining als concept heeft brede steun, de exacte bandgrenzen zijn een productkeuze | JA |
| DEC-REST-001 | Rusttijd-schaling na een set | `rest.v1` | RPE | ingestelde basisrust | RPE≤6→0,75×; ≤7→0,9×; ≤8→1,0×; ≤9→1,25×; anders→1,5×; ondergrens 30s | `{seconden}` | **Product heuristic** | JA |
| DEC-SETOUT-001 | Uitkomst van één set | `setoutcome.v1` | voorgeschreven vs. uitgevoerd, DEC-PROG-001 | voorgeschreven waarden | vergelijkt uitgevoerd met voorgeschreven; delegeert gewichtsbeslissing volledig aan DEC-PROG-001 (geen tweede RPE-regel) | `{afwijkingen[], doelGehaald, actie, rust, herkomst}` | N.v.t. (compositie) | JA |
| DEC-READYDAY-001 | Samengestelde dagreadiness | `readiness_day.v1` | CALC-REC-002/003, DEC-READY-001, DEC-RECADJ-001 | 6 signalen | rekent niets zelf — combineert bestaande regels; datakwaliteit = expliciete telling (≥5→volledig, ≥2→gedeeltelijk, anders→onvoldoende) | `{zone, aanpassing, datakwaliteit, herkomst}` | Samengesteld | JA — enige samengestelde readiness-implementatie |
| DEC-ACWR-ADV-001 | ACWR-adviestekst | `trainingLoad.v1` | CALC-LOAD-001 | — | classificatie → vaste, neutrale NL-tekst | tekst (geen getal, geen actie) | **C** (zie CALC-LOAD-001) | JA |
| DEC-LOADCORR-001 | Gecorroboreerd belastingssignaal | `trainingLoad.v1` | CALC-LOAD-001 + trend | — | uitsluitend bij TWEE onafhankelijke signalen tegelijk | `true`/`false` | **E** (product heuristic) | JA — enige plek |

## Harde guardrails — heraudit alle consumers

### ACWR-guardrail: BEVESTIGD INTACT
Alle 5 vindplaatsen van `TrainingLoadCore.classifyAcwr()` in `index.html` gecontroleerd. Alle gebruiken uitsluitend `acwrAdvisoryText()` (vaste, neutrale tekst) of `corroboratedLoadSignal()` (nooit alleenstaand, altijd tweede signaal vereist). Geen enkele consumer presenteert ACWR als blessurevoorspeller, gevaarlijke zone, automatisch trainingsverbod, of medische risicoscore.

### HRV-guardrail: BEVESTIGD INTACT
Alle vindplaatsen van `hrvDagFactorPersonal()`/`hrvStPersonal()` gecontroleerd. Alle output is puur beschrijvend of voedt uitsluitend de bestaande, geteste dagfactor-/adjustment-keten. Geen enkele consumer diagnosticeert overtraining, stelt een medische toestand vast, of dwingt een verplichte rustdag af. `readinessDay()`'s eigen commentaar bevestigt expliciet: "Een REST/STOP-zone bestaat bewust NIET... een zone zonder regel zou een verzonnen oordeel zijn."

### AI als tweede Decision Engine: GEEN VIOLATIE GEVONDEN
Repo-brede zoekactie naar prompt-ingebedde numerieke instructies leverde geen treffers op buiten reeds-canonieke, puur-beschrijvende statustekst. Het Live Coach-contextblok (MS-F3-06 bevestigd) instrueert de AI expliciet het advies/getal niet te wijzigen.

## Calculation ≠ Decision — bevestigd strikt gescheiden
Elke Decision Rule consumeert een reeds-berekende waarde en voegt uitsluitend beslislogica toe. `readinessDay()`'s eigen commentaar bevestigt: "Deze functie REKENT NIETS en verzint GEEN nieuwe regel."

## Rule Precedence
`readinessDay()` is de enige plek waar meerdere signalen tegelijk een uitkomst bepalen. `computeProgAdjustment()` neemt het strengste van de van toepassing zijnde condities. Geen tegenstrijdige regels aangetroffen — progressie (volgende-set-gewicht) en herstel (huidige-sessie-sets/RPE) zijn orthogonale assen, schrijven niet naar hetzelfde veld.

## Magic Number Audit (Decision-domein)

| Waarde | Locatie | Classificatie |
|---|---|---|
| RPE-drempels progressie (≤7.5/≤8.5) | `decision.js` | Product heuristic |
| Herstel-drempels (factor<0.90/<0.97) | `decision.js` | Product heuristic |
| Readiness-drempels (f≥1.00/≥0.93) | `decision.js` | Product heuristic |
| Rust-schalingsfactoren (0.75-1.5×) | `decision.js` | Product heuristic |
| Datakwaliteit-drempels readinessDay (≥5/≥2) | `decision.js` | Technical threshold |
| Corroboratiedrempel "≥2 dalende oefeningen" | `trainingLoad.js` (reeds MS-F3-02) | Product heuristic (reeds geclassificeerd) |

Geen onverklaarde critical threshold gevonden.

## Duplicate Decision Audit
Geen duplicaat gevonden. Elke regel heeft precies één canonieke implementatie in `core/decision.js`; `index.html` roept deze uitsluitend aan.

## MS-F3-07 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Rule IDs, versions, inputs, outputs, thresholds, forbidden use."*
**Resultaat: CLOSED.** Alle 9 daadwerkelijke Decision Rules geregistreerd. ACWR/HRV-guardrails opnieuw gecontroleerd op alle consumers — intact. Geen AI-als-decision-engine-violatie. Geen calculation/decision-vermenging. Geen onverklaarde critical threshold.
