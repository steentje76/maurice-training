# Nutrition OFF Runtime Integration — Wave 3 Closure

Vervolg op `NUTRITION_OFF_INTEGRATION_IMPLEMENTATION_REPORT.md`. Deze
sessie trof al een eerdere, forensisch gecontroleerde commit aan
(`d8dca9f`, "OFF live server client + canonical ingest + historical
reproducibility") met `netlify/functions/nutrition-off-lookup.js`,
`core/nutritionIngestService.js`, en bijbehorende tests -- allemaal
individueel herbevestigd groen in deze sessie, niet blind aangenomen.

## Wat ik in deze closure-pass zelf, aanvullend heb bewezen

**Volledige, functionele end-to-end-keten met echte, live-opgehaalde
productdata** (Nutella, dezelfde smoke-test-fixture als Wave 3):

1. `OpenFoodFactsAdapter.normalizeProduct/getSourceMetadata/
   evaluateDataQuality()` uitgevoerd op de echte OFF-respons ->
   correcte, genormaliseerde candidate + provenance + `MEDIUM`
   data-quality.
2. **Deze exacte output daadwerkelijk in de live database gepersisteerd**
   (`nutrition_products`, `nutrition_product_identifiers`,
   `nutrition_nutrient_values`) -- niet gesimuleerd.
3. **Tweede lookup bewezen lokaal**: een eenvoudige database-query op de
   barcode geeft de volledige, correcte productdata terug zonder enige
   provider-aanroep. `NutritionFoundation2Core.resolveBarcode()` bevestigt
   dit met een echte `FOUND`-uitkomst op de zojuist gepersisteerde rij.
4. **Ingest-precedence bevestigd** met de echte product-ID:
   `NutritionIngestService.resolveIngestDecision()` geeft `ADD_REVISION`
   voor een `COMMUNITY_UNVERIFIED`-product, en **`KEEP_EXISTING_VERIFIED`**
   wanneer diezelfde rij hypothetisch `VERIFIED` zou zijn -- de
   VERIFIED-precedentie-regel werkt zoals bedoeld.
5. Alle testdata na afloop volledig, verifieerbaar opgeruimd (0 rijen
   achtergebleven).

## Wat ik NIET heb kunnen bewijzen (eerlijke, expliciete grens)

**De Netlify Function zelf is niet live gedeployed of aangeroepen** in
deze sessie. Ik heb geen toegang om `netlify/functions/nutrition-off-
lookup.js` daadwerkelijk als draaiende, publieke HTTP-endpoint te
starten en te testen. Wat wel bewezen is: de code is correct geschreven
(juiste User-Agent, juiste auth-conventie, juiste status:0-afhandeling,
juiste timeout-afhandeling -- allemaal via code-inspectie bevestigd),
en alle onderliggende bouwstenen (adapter-normalisatie, database-
persistentie, local-first-lookup, ingest-precedence) werken individueel,
functioneel, tegen echte data. De keten "HTTP-request naar de Netlify
Function -> live OFF-aanroep vanuit die Function -> response terug naar
een client" is dus **structureel compleet maar niet end-to-end
live-gevalideerd binnen deze sessie**.

Ook niet in deze sessie herhaald: extra live smoke-test-barcodes buiten
Nutella/Coca-Cola (een tool-beperking beperkte verdere, willekeurige
live `web_fetch`-aanroepen tot URL's die al letterlijk in een
zoekresultaat voorkwamen) -- de twee eerder geteste, echte producten
blijven de basis van het bewijs.

## Historical reproducibility (bevestigd, structureel)

`nutrition_meal_items.nutrient_snapshot` (jsonb) +
`snapshot_source_version` bestaan al (bevestigd via
`information_schema.columns`), en `NutritionIngestService.
buildNutrientSnapshot()`/`isSnapshotStillValid()` (17/17 tests)
implementeren de bevriezings-/vergelijkingslogica. Dit is een additieve
migratie (geen bestaande rij gewijzigd, 0 rijen in de tabel op moment
van controle).

## Security/RLS

Zelfde, eerder gedocumenteerde grens: black-box, non-owner
authenticated-validatie blijft niet mogelijk binnen deze sessie
(tabel-eigenaar-bypass in de beschikbare SQL-tool-verbinding). De
policies zelf zijn structureel ongewijzigd t.o.v. de al eerder,
structureel gereviewde Foundation 2-RLS. Geen enkele nieuwe policy
verwijst naar coach-/org-tabellen -- Human Coach en Gym/Team blijven
zonder impliciete toegang.

## FINAL MATURITY (exact, zoals voorgeschreven)

```
OFF NORMALIZATION ADAPTER      = IMPLEMENTED + TESTED (22/22, echte fixtures)
OFF LIVE SERVER CLIENT         = IMPLEMENTED (code compleet, correcte User-Agent/auth/status:0/timeout-afhandeling), NOT LIVE-DEPLOYED/TESTED THIS SESSION
CANONICAL INGEST               = IMPLEMENTED + TESTED (17/17), FUNCTIONEEL BEWEZEN tegen echte, live database-persistentie
LOCAL-FIRST LOOKUP             = BEWEZEN (functionele test: 2e lookup lokaal, geen provider-aanroep nodig)
LIVE BARCODE LOOKUP (end-to-end via de Netlify Function zelf) = NOT LIVE-VALIDATED THIS SESSION
HISTORICAL REPRODUCIBILITY     = IMPLEMENTED (additieve snapshot-kolommen + logica, 17/17 tests)
NORMAL NUTRITION UX            = NOT BUILT
REAL USER VALIDATION           = OPEN
```

**Niet geclaimd:** "barcode scanning werkt end-to-end voor gebruikers",
"Nutrition is >=9". De onderliggende bouwstenen zijn bewezen correct;
de laatste schakel (een daadwerkelijk gedeployde, live aangeroepen
Netlify Function) is geschreven maar niet binnen deze sessie
live-gevalideerd.
