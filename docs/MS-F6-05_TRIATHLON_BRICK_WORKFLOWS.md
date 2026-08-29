# MS-F6-05_TRIATHLON_BRICK_WORKFLOWS.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json):** "Triathlon & Brick Workflows" -- "Multi-sport scheduling/execution/analysis." P2, dependencies MS-F6-01/02/03 (alle CLOSED), gekoppelde capability END-HYROX-001 (dezelfde als MS-F6-04).

## Centrale architectuurvraag: bewezen vanuit code, niet documentatie
Kan TK een multisporttraining representeren zonder drie losstaande trainingen te maken en zonder trainingsbelasting dubbel te tellen? JA.

Bewijs:
1. Eén parent-identiteit: hyroxStart('brick', ...) roept dezelfde createTrainingInstance() aan als HYROX, met raceType:'brick'. Eén training_instance_id voor de hele triathlon.
2. Vaste, hardcoded kindsegmenten: tkHyroxSegmentenVoorType('brick') retourneert drie vaste segmenten (zwemmen@segment_index:1, fietsen@3, hardlopen@5) -- geen door de gebruiker aanpasbare volgorde, dus geen "ongeldige volgorde"-aanvalsoppervlak (bevestigd in het bestaande testbestand: "isValidBrickVolgorde bewust niet meegenomen -- triathlon gebruikt vaste segment_index").
3. Hetzelfde reconstructiecontract als HYROX: hyroxReconstructPerformance() behandelt race_type==='brick' door sport='triathlon' te zetten -- letterlijk hetzelfde codepad, bevestigd door het bestaande testcommentaar "Triathlon gebruikt HETZELFDE contract, geen apart hyrox/triathlon-tje". Geen tweede multisportmodel gebouwd.

## Load-dubbeltellingsaudit (closure-critical)
Bevinding: geen actief dubbeltellingsrisico, want er bestaat vandaag geen live load-aggregatiepad dat dit zou kunnen doen. AthleteCore.sessionLoad()/unifiedLoad() (core/athlete.js) bestaan als pure, geteste functies, maar worden nergens in de runtime (index.html) aangeroepen. Aangezien de parent uitsluitend een identiteits-/groeperingsconcept is (geen apart gewicht/RPE-dragend record), zou een toekomstige wiring van nature alleen de kindsegment-belastingen sommeren -- het correcte totaal, geen dubbeltelling. Eerlijk vastgelegd als aandachtspunt voor toekomstige wiring, geen huidig probleem.

## Sessie-identiteit / hervatting
hyroxActive (gepersisteerd in localStorage als tk_hyrox_active, hetzelfde patroon als Guided Workout) bevat de enige, hervatbare state van een lopende triathlon/brick -- bevestigd via bestaande, uitgebreide tests. Geen aparte child-sessie-identiteit die zou kunnen wees raken.

## Kritieke, aanvullende AI-boundary-bevinding en fix
Tijdens deze sprint ontdekt: de triathlon-coachingtekst instrueerde de AI om "automatisch" een taperschema op te stellen -- geen enkele Taper Decision Rule of Calculation bestaat in de registry. Dezelfde categorie schending als de FTP/CSS/CP-bevindingen uit MS-F6-02. Gecorrigeerd naar "bespreek taper-opties op basis van de resterende voorbereidingstijd, AI stelt zelf geen tapering-schema op". Proactief ook de running-coachingtekst gecorrigeerd, zelfde onderliggende reden.

## Sport-isolatie
Bevestigd via de bestaande, gedeelde CardioEngine/CARDIO_TYPES-architectuur: elk segment gebruikt uitsluitend zijn eigen, config-gebonden berekeningen. Geen cross-sport-lek gevonden.

## Tests
core/fTriathlonBrickWorkflows.test.js (nieuw, 7/7): bewijst vanuit code het gedeelde parent/child-contract, bevestigt de afwezigheid van een actief dubbeltellingspad, en regressie-lockt beide taper-AI-boundary-fixes. Sabotagebewijs geleverd.

## MS-F6-05 acceptance-gate-toetsing
Letterlijke acceptance gate: "Multi-sport scheduling/execution/analysis."
Resultaat: CLOSED. Scheduling/execution/analysis bevestigd volledig aanwezig via hergebruik van de bestaande HYROX-infrastructuur -- geen nieuw multisportmodel gebouwd, geen dubbeltelling, geen sport-cross-contaminatie, en een kritieke AI-boundary-bevinding proactief gecorrigeerd.
