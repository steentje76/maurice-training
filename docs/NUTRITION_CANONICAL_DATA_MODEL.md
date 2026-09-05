# Nutrition Canonical Data Model — Foundation 2.0

## Doelketen

```
EXTERNAL / COMMUNITY / USER DATA SOURCES
  -> adapter / normalization (generiek contract, geen provider hard-coded)
  -> canonical Trainingskompas food/product model (deze migratie)
  -> provenance + data quality (op elke food/product/nutrient-rij)
  -> meal / hydration / supplement logging (nieuw, naast nutrition_entries)
  -> deterministic calculations (core/nutritionFoundation2.js)
  -> Context Engine (bestaand, NutritionIntelligenceCore, ONGEWIJZIGD)
  -> Decision Engine waar expliciet toegestaan (bestaand, ONGEWIJZIGD)
  -> AI Coach (bestaand governance-contract, ONGEWIJZIGD)
  -> toekomstige UX (niet in deze sprint)
```

## Verhouding tot bestaande infrastructuur (BELANGRIJK)

Deze sprint bouwt **naast**, niet **in plaats van**, de bestaande,
volwassen manual-logging-laag:

- `nutrition_entries` (tabel) + `NutritionFoundationCore`
  (`core/nutritionFoundation.js`, B9-09): blijft de canonical bron voor
  **handmatige macro/calorie-invoer**. Ongewijzigd.
- `NutritionIntelligenceCore` (`core/nutritionIntelligence.js`, B9-11):
  blijft de canonical Context/Decision-laag voor
  trainings-timing-context. Ongewijzigd.
- Deze sprint (Foundation 2.0) voegt het **food/product/barcode/meal/
  hydration/supplement-model** toe dat voorheen niet bestond.

Een toekomstige UX-beslissing (niet in deze sprint) bepaalt hoe/of
`nutrition_entries` en `nutrition_meals` in de gebruikerservaring
samenkomen -- dit document neemt die beslissing niet vooruit.

## Entiteiten

| Entiteit | Tabel | Kern |
|---|---|---|
| Food item | `nutrition_foods` | generiek concept (banaan, kipfilet) |
| Product | `nutrition_products` | merk-/verpakkingsspecifiek, optioneel gekoppeld aan een food |
| Product identifier | `nutrition_product_identifiers` | 0..N barcodes per product, uniek per (type, waarde) |
| Nutrient value | `nutrition_nutrient_values` | polymorf (food OF product), PER_100G/PER_100ML/PER_SERVING |
| Meal | `nutrition_meals` | gebruiker + tijdstip |
| Meal item | `nutrition_meal_items` | food/product + hoeveelheid + eenheid |
| Hydration entry | `nutrition_hydration_entries` | afzonderlijk van meals/macro's |
| Supplement definition | `nutrition_supplement_definitions` | naam/merk/vorm, geen claims |
| Supplement log | `nutrition_supplement_logs` | gebruiker + tijdstip + dosis |

## Provenance (op elke `nutrition_foods`/`nutrition_products`-rij)

`source_type` (EXTERNAL_DATABASE/MANUFACTURER/COMMUNITY/USER/
TRAININGSKOMPAS_CURATED/UNKNOWN), `source_name`, `source_record_id`,
`source_version`, `fetched_at`. Geen enkele rij mag als "verified"
gepresenteerd worden zonder expliciete provenance.

## Data quality en verification

`data_quality`: UNKNOWN/LOW/MEDIUM/HIGH/VERIFIED (herbruikt dezelfde
taal als elders in Trainingskompas, geen nieuw, incompatibel systeem).
`verification_state`: USER_PRIVATE/COMMUNITY_UNVERIFIED/
COMMUNITY_REVIEWED/VERIFIED. `canModifyCanonicalRecord()` (core)
garandeert: een VERIFIED-rij is nooit stil overschrijfbaar, ook niet
door de oorspronkelijke maker.

## Barcode resolution (service/core, `core/nutritionFoundation2.js`)

```
barcode -> normalizeBarcode() -> {value, identifier_type}
  -> (database-lookup, buiten deze pure module)
  -> resolveBarcode(genormaliseerd, kandidaat-rijen)
       -> NOT_FOUND   | AMBIGUOUS (meerdere producten) | FOUND (1 product)
```

Barcode is uitdrukkelijk **geen primary key** van een product -- de
`nutrition_products.id` (UUID) is dat. Eén product kan meerdere
identifiers hebben; een unique-constraint op (identifier_type, value)
maakt conflicten (dezelfde barcode aan twee producten) onmogelijk op
databaseniveau (functioneel geverifieerd tijdens deze sprint).

## Calculation (deterministisch, geen AI-herberekening)

`portionToNutrients(nutrientRow, quantity, quantityUnit)`: schaalt een
opgeslagen PER_100G/PER_100ML/PER_SERVING-waarde naar een concrete
hoeveelheid. Ontbrekende brongegevens blijven `null` (nooit 0).

`aggregateNutrients(items)`: som over meerdere items (bv. een meal),
met een expliciete `data_quality`-classificatie per veld: KNOWN (alle
items hadden een waarde), PARTIAL (sommige), UNKNOWN (geen enkele) --
nooit een verzwegen 0-totaal.

## External provider adapter contract (generiek, geen implementatie)

```
lookupBarcode(barcode) -> candidate | NOT_FOUND
searchProducts(query) -> candidate[]
getProduct(providerProductId) -> rawProduct
normalizeProduct(rawProduct) -> canonical product-shape
normalizeNutrients(rawProduct) -> canonical nutrient-shape
sourceMetadata(rawProduct) -> {source_type, source_name, source_record_id, ...}
```

Geen enkele providernaam komt voor in het canonical schema of in
`core/nutritionFoundation2.js`. Zie
`docs/NUTRITION_EXTERNAL_DATA_SOURCE_ASSESSMENT.md` voor de kandidaat-
beoordeling; geen provider is deze sprint daadwerkelijk aangesloten.

## Wat NIET is gebouwd (bewust, conform de opdracht)

- Geen nieuwe Decision Rules voor voeding.
- Geen calorie-/macrodoelen, geen hydratatieadvies.
- Geen supplement-werkzaamheids- of doseringsclaims.
- Geen moderation-dashboard voor community-content.
- Geen daadwerkelijke externe-provider-integratie.
- Geen nieuwe UX/scherm.
