# Nutrition Foundation 2.0 — Implementation Report

Branch: `functional/nutrition-foundation-2`. Runtime sprint. PR #234
(audit) en PR #222 niet gewijzigd.

## BEFORE (forensisch herbevestigd, niet aangenomen)

- `nutrition_entries`: bestond, RLS al volledig correct (inclusief een
  eerdere, zelf-gecorrigeerde ownership-check op gekoppelde
  `training_instance_id`/`activity_id`), **0 rijen** (bevestigd, opnieuw
  gemeten aan het begin van deze sprint).
- `core/nutritionFoundation.js` (B9-09) + `core/nutritionIntelligence.js`
  (B9-11): een **volwassen, volledige Calculation -> Context -> Decision-
  keten** voor de bestaande, handmatige macro-logging, met geversioneerde
  Decision Rules (NUTR-RULE-001/002) en Evidence-koppeling
  (NUTR-EV-001/002/003). 52 bestaande tests, allemaal individueel
  herbevestigd groen. **Dit was aanzienlijk verder ontwikkeld dan de
  eerdere reality-audit deed vermoeden voor de manual-logging-laag zelf**
  -- de audit was correct over het ONTBREKEN van een food/product-
  database, maar de bestaande logging-keten zelf is FULL STACK voor wat
  hij belooft te zijn.
- Geen food/product/barcode/hydration(apart)/supplements-model bestond.

## AFTER

**Canonical food model:** `nutrition_foods` -- generiek concept, met
provenance (`source_type`/`source_name`/`source_record_id`/
`source_version`/`fetched_at`) en `data_quality`/`verification_state`.

**Canonical product model:** `nutrition_products` -- merk-/
verpakkingsspecifiek, optionele koppeling naar een food, `allergen_metadata`
als jsonb (expliciet: metadata met provenance, geen medische garantie).

**Identifiers:** `nutrition_product_identifiers` -- meerdere per product,
`unique(identifier_type, value)` maakt barcode-conflicten onmogelijk op
databaseniveau. **Functioneel geverifieerd** (niet alleen source-
inspectie): een tweede product met dezelfde barcode werd correct
geweigerd door de database (`23505 duplicate key`), daarna volledig
opgeruimd.

**Barcode resolution:** `core/nutritionFoundation2.js` ->
`normalizeBarcode()` + `resolveBarcode()`. Drie, expliciete uitkomsten
(NOT_FOUND/AMBIGUOUS/FOUND) -- nooit een lege productkaart met nullen,
nooit automatisch gokken bij een conflict.

**Meals:** `nutrition_meals` + `nutrition_meal_items` -- totaal wordt
berekend uit items (`aggregateNutrients()`), geen opgeslagen
meal-total als tweede waarheid.

**Hydration:** `nutrition_hydration_entries` -- volledig afzonderlijk
van macro-logging, geen doelen/aanbevelingen.

**Supplements:** `nutrition_supplement_definitions` +
`nutrition_supplement_logs` -- gescheiden van food/products, geen
werkzaamheids- of doseringsclaims in het schema of de code.

**Provenance:** op elke food/product-rij, zie
`NUTRITION_CANONICAL_DATA_MODEL.md`.

**Data quality:** UNKNOWN/LOW/MEDIUM/HIGH/VERIFIED (herbruikt bestaande
Trainingskompas-taal, geen nieuw, incompatibel systeem).

## CALCULATIONS

`portionToNutrients()`: PER_100G/PER_100ML/PER_SERVING -> concrete
hoeveelheid, met `INVALID_SERVING` bij een basis/eenheid-mismatch
(geen stille misrekening). Ontbrekende brongegevens blijven `null`.

`aggregateNutrients()`: KNOWN/PARTIAL/UNKNOWN per nutrient-veld,
**functioneel getest** op het exacte scenario "sommige items missen een
veld" -- nooit een verzwegen 0-totaal.

**UNKNOWN != 0: expliciet, apart getest** (5 gerichte tests) op zowel
`portionToNutrients` als `aggregateNutrients`.

**SHADOW CALCULATIONS: 0.** `core/nutritionFoundation2.js` is de enige,
nieuwe plek waar deze berekeningen plaatsvinden; geen aanroep vanuit
`index.html`, AI-prompts, of Netlify functions gevonden of toegevoegd in
deze sprint (er is ook geen UI-integratie gebouwd, dus er was geen
gelegenheid voor een shadow calculation te ontstaan).

## RLS / PRIVACY

Canonical foods/products/identifiers/nutrient-values: **leesbaar voor
iedereen** (gedeelde catalogus-governance, consistent met
`verification_state`), **uitsluitend wijzigbaar door de eigen creator**
(`created_by = auth.uid()`), nooit door een ander -- en nooit door
niemand zodra een rij `VERIFIED` is (`canModifyCanonicalRecord()`,
getest).

Meals/hydration/supplement-logs: strikt privé, `user_id = auth.uid()`
op alle CRUD-policies.

**Coach/org-toegang:** geen enkele nieuwe policy verwijst naar
`coach_athlete_relationships` of `organizations`/`memberships` --
Human Coach en Gym/Team krijgen dus **geen impliciete nutrition-
toegang**, exact zoals vereist. (Coach-gedeelde nutrition-context zou,
indien ooit gewenst, een aparte, expliciete scope-uitbreiding van
`CoachAccessCore` vereisen -- niet in deze sprint gebouwd.)

**Black-box, non-owner auth-validatie:** zelfde, eerder al
gedocumenteerde tool-beperking als bij de Messaging Foundation (de
SQL-verbinding draait als tabel-eigenaar) -- de policies zijn
structureel correct en logisch nagerekend, maar niet end-to-end via een
echte, niet-eigenaar JWT gevalideerd binnen deze sessie.

## EXTERNAL DATA

Zie `NUTRITION_EXTERNAL_DATA_SOURCE_ASSESSMENT.md`. **PRIMARY: Open
Food Facts** (beste EU/NL-coverage en barcode-dekking, ODbL-licentie
met attributieverplichting). **SECONDARY: USDA FoodData Central** (CC0,
geen attributielast, zwakkere EU-coverage). **Geen provider
geïntegreerd** in deze sprint -- uitsluitend het generieke
adaptercontract is gebouwd, provider-agnostisch.

## EXISTING NUTRITION UI PRESERVED

Bevestigd via een echte browser-runtime-test: `s-nutrition` bestaat nog,
wordt correct actief, en de bestaande invoerknop is aanwezig. Geen
enkele wijziging aan `index.html` in deze sprint.

## TESTS

`core/nutritionFoundation2.test.js`: 24/24 (nieuw). Bestaande
nutrition-tests (fNutritionFoundationCore, fNutritionIntelligenceCore,
fB9_10NutritionProduct, fB9_11NutritionIntelligence): 52/52,
onveranderd. Release gate: 243/243 (was 242). Android: 29/29. Security-
steekproef en Calculation Registry-coverage: onveranderd groen.
Doc consistency: schoon.

## DATA MIGRATION

Volledig additief: 9 nieuwe tabellen, 0 bestaande tabellen gewijzigd, 0
bestaande rijen aangeraakt (er waren 0 rijen in `nutrition_entries` om
te migreren). **Rows before: 0 (alle nieuwe tabellen). Rows after: 0**
(alle test-rijen tijdens deze sprint zijn expliciet, verifieerbaar
opgeruimd). **Data loss: 0.**

## CLOSURE-FIXES (deze sprint, na PO-review)

**1. PER_100G/piece-bug gerepareerd (KERN).** `1 piece != 1 gram` werd
voorheen genegeerd: `portionToNutrients()` liet `quantityUnit==='piece'`
toe op een PER_100G-basis en rekende `quantity/100` alsof 1 stuk 1 gram
was. Gecorrigeerd: `piece` op een PER_100G-basis vereist nu een
expliciete, betrouwbare `pieceWeightG`-parameter; ontbreekt die, dan is
de uitkomst `UNKNOWN_CONVERSION` (nooit een gok, nooit 0). Nieuwe
database-kolom `nutrition_nutrient_values.piece_weight_g` (additief,
apart van het bestaande `serving_size_g`-concept om geen dubbelzinnige
betekenis te introduceren). 6 nieuwe, gerichte tests.

**2. Serving model consistency: bevestigd, geen tweede truth.** Eén
canonical plek (`nutrition_nutrient_values`) draagt `serving_size_g`/
`serving_size_ml` (voor de PER_SERVING-basis) en nu ook `piece_weight_g`
(voor piece-conversie op een PER_100G-basis). Geen los, concurrerend
serving-systeem gebouwd op `nutrition_products` of `nutrition_meal_items`.

**3. GTIN/EAN/UPC-checksumvalidatie toegevoegd.** `computeCheckDigit()`
implementeert het standaard GS1-mod-10-algoritme, `validateChecksum()`
past dit toe per standaard (EAN-8/EAN-13/UPC-A/GTIN-14). Vóór
implementatie handmatig geverifieerd tegen bekende, geldige
referentiebarcodes (EAN-13 4006381333931, UPC-A 036000291452, EAN-8
96385074, GTIN-14 00036000291452). `normalizeBarcode()` geeft nu
`INVALID_IDENTIFIER` (nooit stilzwijgend `OTHER`) wanneer een lengte een
bekende standaard claimt maar de checksum niet klopt. `resolveBarcode()`
voert **nooit** een lookup uit bij `INVALID_IDENTIFIER`, zelfs niet als
er toevallig kandidaat-rijen zouden bestaan (adversarieel getest). 12
nieuwe, gerichte tests (geldig/ongeldig per standaard + whitespace +
garbage + niet-standaard-lengte blijft legitiem OTHER).

**4. Identifier canonicalization voor cross-standaard-duplicaten.**
Onderzocht en bevestigd: een UPC-A en zijn GTIN-14-representatie (met
leading zeros) zijn dezelfde fysieke barcode, maar de oorspronkelijke
`unique(identifier_type, value)`-constraint zou dit niet hebben
gedetecteerd. Toegevoegd: een additieve, gegenereerde
`canonical_gtin14`-kolom (GS1-conventie, links aangevuld met nullen) met
een partial unique index (uitsluitend voor de 4 bekende standaarden).
**Functioneel geverifieerd** (niet alleen source-inspectie): een UPC-A
en de overeenkomstige GTIN-14-vorm van dezelfde barcode werden na deze
fix correct als conflict geweigerd door de database (`23505 duplicate
key ... canonical_gtin14`), daarna volledig opgeruimd. Geen destructieve
migratie (0 bestaande rijen, dus geen data om te verzoenen).

**5. Extra UNKNOWN != 0-sabotagetests toegevoegd (6 nieuwe):** unknown
serving/nutrient/quantity/unit/barcode/provider-not-found -- geen van
allen genereert 0-nutrition, lege productdata als geldig, of een
gegokte serving.

**Totaal nieuwe tests deze closure: 29 (was 24, nu 53).**

## FINAL MATURITY (exact, zoals voorgeschreven)

```
MANUAL NUTRITION LOGGING             = existing integrated capability
CANONICAL FOOD/PRODUCT FOUNDATION    = IMPLEMENTED + TESTED
CANONICAL PRODUCT DATA POPULATION    = EMPTY / NOT POPULATED
EXTERNAL PRODUCT SOURCE              = NOT INTEGRATED
BARCODE CORE                         = IMPLEMENTED + TESTED
BARCODE REAL PRODUCT LOOKUP          = NOT YET INTEGRATED
MEALS FOUNDATION                     = IMPLEMENTED + TESTED
HYDRATION FOUNDATION                 = IMPLEMENTED + TESTED
SUPPLEMENTS FOUNDATION               = IMPLEMENTED + TESTED
NEW NUTRITION NORMAL UX              = NOT INTEGRATED
REAL USER VALIDATION                 = OPEN
```

**Niet geclaimd:** "food database volledig opgelost", "nutrition >=9",
"barcode product scanning werkt voor gebruikers" -- provider/data/UI
ontbreken nog steeds.

## BLOCKERS REMOVED

- "Geen canonical food/product-model" (uit de eerdere Nutrition-audit)
  is niet langer waar op databaseniveau.

## BLOCKERS REMAINING

- Geen UX om deze laag daadwerkelijk te gebruiken.
- Geen externe provider aangesloten (PO-beslissing nodig over
  attributie-implementatie en eventueel het productie-gebruiksformulier
  van Open Food Facts).
- Black-box auth-RLS-validatie blijft open (zelfde, bekende beperking).
- Geen NL/EU-specifieke secundaire bron (bv. NEVO) onderzocht.

## MERGE RECOMMENDATION: YES

Foundation-code is intern consistent, getest, en additief -- geen
bestaande functionaliteit geraakt, geen data-risico. Niet gemergd door
mij; dit is een Product Owner-beslissing conform de opdracht ("NIET
AUTOMERGEN").
