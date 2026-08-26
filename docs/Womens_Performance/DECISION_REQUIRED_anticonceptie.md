# DECISION REQUIRED — Anticonceptie als context

**Status:** wacht op productbeslissing door Maurice. Niet gebouwd, geen code geschreven.
**Bron:** Trainingskompas_Womens_Performance_Blueprint_v1.0.md, sectie 15; sectie 27
noemt "contraception categories" expliciet als beslissing die niet autonoom genomen
mag worden.

## VRAAG
Moet Trainingskompas anticonceptievorm als optionele context laten vastleggen? Dit is
een gevoelig onderwerp met reëel risico op verkeerde interpretatie: het blueprint zegt
expliciet "do not judge, recommend or infer hormone levels" — dus de vraag is niet
"wat berekenen we hiermee" (het antwoord is: niets), maar "is het vastleggen van dit
gegeven, puur als notitie, de moeite en het risico waard".

## OPTIE A — Niet bouwen
Geen anticonceptieregistratie.

**Voordelen:** vermijdt volledig het risico dat dit gevoelige gegeven ooit verkeerd
geïnterpreteerd of getoond wordt; geen enkele productwaarde gaat hiermee verloren,
aangezien de blueprint zelf al zegt dat de app er toch niets mee mag berekenen.
**Nadelen:** een informatievoorkeur van sommige gebruikers (die dit wel bijhouden voor
zichzelf) wordt niet gefaciliteerd.

## OPTIE B — Vrij tekstveld, geen vaste categorieën
Als er toch behoefte aan is: een optioneel, volledig vrij notitieveld bij het
cyclusprofiel (geen vaste dropdown-categorieën als "hormonaal spiraal" etc.), zodat de
gebruiker zelf bepaalt wat en hoe specifiek zij dit vastlegt, zonder dat Trainingskompas
een gestructureerde, herkenbare "anticonceptie-categorie" als apart databaveld
introduceert.

**Voordelen:** minimale productbeslissing, geen classificatiesysteem om verkeerd te
labelen; de bestaande `note`-velden op andere cyclustabellen bieden hier al precedent.
**Nadelen:** minder bruikbaar voor toekomstige patroonanalyse (bewust — dat is ook
precies waarom dit een lager-risico keuze is).

## OPTIE C — Vaste categorieën (zoals het blueprint zelf noemt)
Vaste, selecteerbare categorieën (geen anticonceptie / hormonaal / hormoonspiraal /
koperspiraal / overig). Puur contextueel, nooit gebruikt voor enige berekening.

**Voordelen:** consistente data, eventueel bruikbaar voor toekomstige, door Maurice
goedgekeurde analyse.
**Nadelen:** het vastleggen van een gestructureerde "categorie" voelt gevoeliger aan
dan een vrij tekstveld, en vereist een zorgvuldige, expliciete beslissing over
precies welke categorieën en labels gebruikt worden.

## AANBEVELING
Optie A (niet bouwen) als standaardaanbeveling, tenzij Maurice een concrete
productreden heeft om dit toch te willen — gegeven dat de blueprint zelf al
bevestigt dat de app dit gegeven toch nergens voor mag gebruiken (geen
interpretatie, geen berekening), is de kosten/batenverhouding van dit vastleggen
laag, terwijl het gevoeligheidsrisico reëel is.

## IMPACT OP ARCHITECTUUR
Optie B/C: een enkel extra, optioneel veld — geen Engine-wijziging, geen
consequentie voor bestaande berekeningen (dit gegeven wordt per definitie nergens
in de Calculation/Decision Engine gebruikt).

## IMPACT OP PRIVACY
Zeer gevoelig. Bij bouw: zelfde RLS-patroon, expliciet nooit standaard gedeeld,
verwijderbaar.

## IMPACT OP UX
Vereist duidelijke, geruststellende taal dat dit veld puur voor de gebruiker zelf is
en nergens automatisch invloed op heeft.
