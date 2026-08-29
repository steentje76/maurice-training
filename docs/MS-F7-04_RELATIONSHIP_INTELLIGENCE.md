# MS-F7-04_RELATIONSHIP_INTELLIGENCE.md — Trainingskompas

**Canonieke naam/acceptance:** "Relationship Intelligence" -- "Correlations with data sufficiency and causality warnings." P2, dependency MS-F7-01 (CLOSED).

## Kernbevinding: reeds volledig bestaande, mature implementatie (Sprint 19)
Audit onthulde dat core/relationship.js (RelationshipCore, contract relationship.v1) al een uitzonderlijk zorgvuldig ontworpen Relationship Discovery Engine is, gebouwd in een veel eerdere sprint (Sprint 19), ver vóór F6/F7. Deze module voldoet letterlijk aan de MS-F7-04 acceptance gate zonder dat er nieuwe berekeningslogica nodig was.

## Architectuur, geverifieerd
- Data-inventarisatie in plaats van een vaste lijst: inventory()/candidates() kijken eerst wat er werkelijk aan data is.
- Correlatieberekening blijft gescheiden: CalcCore.spearman() (correlation.v1) -- geen tweede implementatie.
- Taal/sterkteclassificatie blijft gescheiden: DecisionCore.releaseVerband() (verband.v1).
- Data-sufficiëntie: REL_MIN_KANDIDAAT=10, een genuanceerde 5-laags SAMPLE_TIERS-confidence-schaal.
- Spreidingstoets tegen schijnverbanden: telt het aantal verschillende waarden, voorkomt een wiskundig geldige maar inhoudelijk waardeloze correlatie over een vrijwel constante reeks.
- Causaliteits-/populatieclaim-preventie: RELATIE_VERBODEN_WOORDEN en RELATIE_POPULATIE_WOORDEN (bonus t.o.v. de letterlijke eis).
- Gewired in de runtime: RelationshipCore.discover() al actief gebruikt in de UI.

## Belangrijke, methodologisch gefundeerde bevinding: "adherence-progression" niet toegevoegd
Het progressiebesluit is expliciet, bewust NIET toegevoegd aan de VARIABLE_REGISTRY: het deelt zijn invoer met RPE, wat een circulariteit/schijnverband zou opleveren. De vooraf gesuggereerde "veiligste eerste kandidaat" is door de bestaande engine al beoordeeld en om een gefundeerde reden afgewezen voor progressie specifiek -- geen gebrek, maar de methodologische discipline die de acceptance gate vraagt. Een toekomstige "adherence-performance"-relatie zou wel kunnen, maar wordt hier niet geforceerd toegevoegd zonder verdere evidence-audit.

## Tests
core/fRelationshipIntelligenceMSF704.test.js (nieuw, 7/7): bevestigt de architectuur-garanties, het documentatiebewijs van de bewuste progressie-uitsluiting, en levert het sabotagebewijs dat in het oudere core/fRelationship.test.js (72 asserts, reeds bestaand) ontbrak. Sabotage: REL_MIN_KANDIDAAT tijdelijk verlaagd naar 2, exact gedetecteerd, teruggedraaid.

## MS-F7-04 acceptance-gate-toetsing
Letterlijke acceptance gate: "Correlations with data sufficiency and causality warnings."
Resultaat: CLOSED. Reeds bestaande, mature, geteste (nu 79 asserts totaal) en actief gewirede infrastructuur voldoet volledig. Geen nieuwe berekeningsengine gebouwd.
