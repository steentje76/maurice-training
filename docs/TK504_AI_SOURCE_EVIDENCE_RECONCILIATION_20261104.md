# TK504 — onafhankelijke broncontrole van 245 AI-classificaties

Datum: 4 november 2026. Scope: uitsluitend een **read-only, privé** evidencecontrole. Geen geauthenticeerde inhoudelijke goedkeuring, geen exercisepublicatie, geen media-/Supabase-grant, geen trainingsregels en geen wijzigingen aan de bestaande app.

## Doel en implementatie

`tools/movekit-v2-ai-evidence-review.py` toetst de bestaande 245 AI-ACCEPT-voorstellen reproduceerbaar tegen de al eerder vastgelegde 226 gepubliceerd-catalogusrecords en **de oorspronkelijke 582 leverancierrecords**. Het hulpmiddel accepteert alleen de bestaande source-bound reviewledger en exact gepinde supplier-, catalogus- en inventory-SHA's. Het roept de bestaande `movekit-review-ledger.py`-validatie en opnieuw gegenereerde `movekit-classification-review.py`-suggesties aan, zodat inhoudelijk gewijzigde bronrecordidentiteiten weigeren.

Het bepaalt twee **niet-normatieve signalen**:

1. Een categorie/type uit de AI-classificatie komt overeen met het unanieme catalogusvoorstel, wijkt af, heeft geen vergelijkingsbasis of treft conflicterende voorbeelden. Geen van deze statussen is goedkeuring; vergelijkingsvoorstellen blijven suggesties.
2. Een voorgestelde apparatuur-tag heeft een zeer conservatieve historische bronverwijzing: exact één leveranciers-equipmentterm naar exact één app-equipmentterm, **minimaal drie bestaande gepubliceerde oefeningen, alle eensluidend**. Bij andere/meervoudige apparatuur blijft het oordeel `NO_STRONG_EXACT_SINGLE_EQUIPMENT_BASIS`. Overeenstemming is geen bewijs dat apparatuur vereist is, geen wetenschappelijke conclusie en geen autonome vertaling van andere supplier-termen.

De uitzonderingsgroepen worden uit gevalideerde bronpatronen en primaire brontags opgebouwd, **gesorteerd/genormaliseerd** op dezelfde manier als de bestaande classificatie-engine. In oudere handmatige bruto-groepering waren dit 64 broncombinaties; na identieke casefold/duplicate-normalisatie zijn dit 62. Het aantal betrokken oefeningen blijft 128.

## Reële privébroncontrole (4 november 2026)

| Inspectie | Resultaat |
|---|---:|
| AI-voorstellen in source-bound ledger | 245 |
| AI-deferred inhoudelijke/term- en eigenaargevallen | 111 |
| Categorie/type komt exact overeen met catalogussuggestie | 117 |
| Categorie/type wijkt af van catalogussuggestie | 39 |
| Geen vergelijkbare bestaande categorie/type-suggestie | 83 |
| Conflicterende vergelijkingsrecords | 6 |
| AI-uitzonderingen in brongetrouwe groepen | 128 in 62 groepen |
| Apparatuur-tag overeenkomend met sterke historische unieke mapping | 218 |
| Apparatuur zonder voldoende unanieme enkelvoudige basis | 27 |
| Apparatuur strijdig met een sterke historische enkelvoudige mapping | 0 |

**Interpretatie:** de nul bij de laatste rij betekent *geen tegenstelling vastgesteld volgens deze strikte, beperkte apparatuurtest*. Het is geen bewijs dat alle 245 oefeningen de juiste apparatuurvelden hebben. De 27 zonder duidelijke basis blijven voor inhoudelijke controle; alle 128 classificatie-uitzonderingen blijven voor beoordeling.

Het echte invoerbestand, bron-SHA's en de gedetailleerde 245-recorduitvoer worden alleen op de aangesloten ontwikkel-pc opgeslagen, buiten Git:

`C:\Movikit\.tk-private-review\TK504-245-AI-INDEPENDENT-SOURCE-CHECK-20261104.json`

Het outputbestand heeft status `PRIVATE_REVIEW_HINT_NOT_APPROVED`; `classification_approved`, `entitlement_granted`, `runtime_activation` en `db_writes` staan alle op `false`. Uitvoer is uitsluitend een **nieuw** JSON-bestand in de privémap; bestaande bestanden en andere doelmappen worden geweigerd. Er worden geen leveranciersteksten, instructies, media, privé-feedback of tokens in het Git-artefact geschreven.

## Regressietests

`python -B -I -m unittest discover -s tools -p test_movekit_v2_ai_evidence_review.py -v`: **8 tests geslaagd**. Synthetic 226/356/582-corpus, in-memory bronmutatie, geforceerde AI-apparatuurtegenstrijdigheid, categorietegenstrijdigheid, exact-evidencegebondenheid, niet-mutatie, foutieve outputmap en weigerend overschrijven. Verdere integratie: volledige `test_movekit*.py`-suite en GitHub Quality Gate.

## Wat niet automatisch besloten mag worden

- AI-ACCEPT betekent **niet** HUMAN_ATTESTED. Het algoritme mag geen definitieve categorie, spierbelasting, apparatuur of trainingsvariant publiceren.
- De bestaande 226 oefeningen zijn niet automatisch wetenschappelijk bewijs; hun historische metadata kan onvolledig of intern inconsistent zijn.
- MoveKit-suppliertermen, bijvoorbeeld Forearms/Lower Back, worden niet zonder beoordeling vereenzelvigd met app-tags zoals Grip/Rug.
- De 8 eigen feedback-apparatuurfacets zijn afzonderlijke **niet-goedgekeurde** eigenaarvoorstellen, geen leverancierstermen.
- Exacte release/entitlement, serverautorisatie, gebruikershistorie, werkende Android logging en verdere issueherstelpunten blijven afzonderlijke gates.
