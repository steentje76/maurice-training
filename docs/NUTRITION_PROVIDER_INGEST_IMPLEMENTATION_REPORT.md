# Nutrition Provider Ingest — Implementation Report (Wave 3 Closure)

Voortzetting op PR #237 (geen nieuwe PR). Base main `df7d15b2...`,
onveranderd tijdens deze sprint.

## OFF User-Agent / contact

`Trainingskompas/<APP_VER> (support@trainingskompas.com)` -- exact het
door de Product Owner voorgeschreven contactadres, niet zelfstandig
verzonnen. Geen private user-data in de User-Agent.

## Server-side client (`netlify/functions/nutrition-off-lookup.js`, nieuw)

Volgt de bestaande auth-conventie uit `coach.js` (verificatie via
`auth/v1/user`, geen lokale JWT-decode) en het bestaande
`ObservabilityCore.tkLog()`-logpatroon (hergebruikt, geen nieuw
systeem). Timeout: 8s via `AbortController`, geen agressieve retry
(conform de conservatieve rate-limit-aanname uit de eerdere
assessment).

**Functioneel getest (11/11), niet alleen source-inspectie:** de
daadwerkelijke, deployable handler is aangeroepen met een gemockte
`fetch` (echte code-executie van de exacte, committende code) voor:
405/401/400-foutpaden, `INVALID_IDENTIFIER` zonder provider-aanroep
(bevestigd: provider werd niet aangeroepen), een correcte
`FOUND_PROVIDER` met de echte Nutella-fixture, `status:0` -> `NOT_FOUND`,
een leeg product-object -> `INCOMPLETE_PRODUCT`, een niet-ok HTTP-
respons -> `SOURCE_UNAVAILABLE`, een generieke netwerkfout ->
`SOURCE_UNAVAILABLE`, en een `AbortError` -> expliciet apart `TIMEOUT`.

## Canonical ingest (`core/nutritionIngestService.js`, nieuw, 17/17 tests)

`resolveIngestDecision()`: CREATE_NEW / ADD_REVISION /
KEEP_EXISTING_VERIFIED / KEEP_EXISTING_USER_PRIVATE.
`detectConflict()`: onderscheidt een normale nutrient-revisie (geen
conflict) van een echte identity-mismatch (conflict).
`buildNutrientSnapshot()`/`isSnapshotStillValid()`: historische
reproduceerbaarheid (zie hieronder).

## Persistence (live, functioneel getest tegen de echte database)

**Lookup #1 (functioneel bewezen):** een canonical `nutrition_products`-
rij + identifier + nutrient_values daadwerkelijk aangemaakt met de
echte, live-opgehaalde Nutella-data (naam, merk, alle macro's,
provenance `OPEN_FOOD_FACTS`/`105`, `data_quality: MEDIUM`,
`verification_state: COMMUNITY_UNVERIFIED` -- **nooit automatisch
VERIFIED**, conform PO-regel 7).

**Lookup #2 (local-first, functioneel bewezen):** een query op
`nutrition_product_identifiers` voor dezelfde barcode vond het zojuist
aangemaakte, lokale product direct -- **geen provider-aanroep nodig**
voor deze tweede lookup.

Alle testdata nadien volledig, verifieerbaar opgeruimd (0 rijen over).

## Historische reproduceerbaarheid (Fase 7, hard gate)

Additieve migratie: `nutrition_meal_items.nutrient_snapshot` (jsonb) +
`snapshot_source_version`. Een meal-item bevriest de exacte nutrient-
waarden + bronversie op het moment van loggen. Een latere OFF-
herimport voegt uitsluitend een NIEUWE `nutrition_nutrient_values`-rij
toe (additief); bestaande snapshots op reeds gelogde meal-items
wijzigen daardoor nooit met terugwerkende kracht.
`isSnapshotStillValid()` (puur, getest) kan achteraf detecteren of een
snapshot inmiddels afwijkt van de actuele canonical waarde -- zonder
de snapshot zelf ooit te overschrijven.

**Eerlijke beperking:** dit is de minimale, additieve mechaniek: de
koppeling van een specifiek meal-item naar de snapshot moet door de
(nog te bouwen) ingest/logging-UI daadwerkelijk gevuld worden. De
database-structuur en de pure logica zijn klaar en getest; er is nog
geen enkel echt meal-item met een gevulde snapshot (0 rijen in
`nutrition_meal_items`).

## Kritieke, tijdens deze sprint zelf ontdekte en gerepareerde beveiligingsfout

Zie `NUTRITION_EXTERNAL_PROVIDER_ARCHITECTURE.md` voor het volledige
verhaal: een reeds bestaande RLS-policy (Foundation 2.0, niet door deze
sprint geïntroduceerd) liet een `VERIFIED`-canonical-product alsnog
door de oorspronkelijke maker updaten op databaseniveau, ondanks dat de
client-side logica dit al correct weigerde. **Gevonden door een echte,
live functionele test, niet door source-lezen.** Gerepareerd met een
additieve policy-vervanging, functioneel herbevestigd na de fix.

## Conflict/dedupe

`detectConflict()` getest op het kernonderscheid: een gewijzigde
nutrient-waarde is GEEN conflict (normale revisie), een gewijzigde
productnaam voor dezelfde barcode IS een conflict (identity-mismatch).
**Niet in deze sprint getest:** een daadwerkelijk, live scenario met
twee, echt conflicterende OFF-records voor dezelfde barcode (niet
waargenomen in de beperkte smoke test).

## UNKNOWN != 0 / Shadow calculations

Herbevestigd via de bestaande, uitgebreide Foundation 2- en adapter-
testsuites (geen regressie). Geen nieuwe berekeningen toegevoegd buiten
de al-bestaande, geregistreerde Calculation-laag; de nieuwe
ingest-/handler-code voert zelf geen enkele nutrient-berekening uit --
uitsluitend doorgeven van reeds genormaliseerde waarden.

## SECURITY / RLS

Herbevestigd (structureel, dezelfde eerder gedocumenteerde
tool-beperking voor black-box, non-owner-auth-validatie blijft van
toepassing): global canonical-productdata blijft leesbaar voor
iedereen, `USER_PRIVATE`/prive nutrition-logs blijven strikt
eigenaar-gebonden, geen enkele nieuwe policy verwijst naar
`coach_athlete_relationships` of `organizations` -- Coach/Gym/Team
krijgen dus nog steeds geen impliciete toegang. De VERIFIED-precedence-
fix hierboven is de enige inhoudelijke RLS-wijziging deze sprint.

## TESTS (samenvatting)

`nutritionIngestService.test.js`: 17/17 (nieuw).
`nutritionOffLookupHandler.test.js`: 11/11 (nieuw, functionele
handler-test met gemockte fetch).
`nutritionProviderOpenFoodFacts.test.js`: 22/22 (ongewijzigd).
`nutritionFoundation2.test.js`: 53/53 (ongewijzigd).
Release gate: 246/246 (was 244, +2 nieuwe testbestanden, 243
testbestanden totaal). Android: 29/29. Calculation Registry/Evidence/
security-steekproef: ongewijzigd groen. Doc consistency: schoon.

## MATURITY (exact, zoals voorgeschreven)

```
OFF NORMALIZATION ADAPTER    = IMPLEMENTED + TESTED
OFF LIVE SERVER CLIENT       = IMPLEMENTED + TESTED (functioneel, gemockte fetch -- geen live productie-deployment binnen deze sessie mogelijk)
CANONICAL INGEST             = IMPLEMENTED + TESTED (logica) + FUNCTIONEEL BEWEZEN (live persistence tegen de database)
LOCAL-FIRST LOOKUP           = FUNCTIONEEL BEWEZEN (live, tweede lookup vond het lokale record)
LIVE BARCODE LOOKUP          = PARTIAL -- de server-side client is klaar en getest, maar nog niet aangeroepen vanuit een daadwerkelijk gedeployde, productie-Netlify-omgeving binnen deze sessie
HISTORICAL REPRODUCIBILITY   = IMPLEMENTED (schema + pure logica), NOT YET USED (0 echte meal-items met snapshot)
NORMAL NUTRITION UX          = NOT INTEGRATED
REAL USER VALIDATION         = OPEN
```

**Nutrition wordt niet CLOSED of >=9 genoemd.** Belangrijke vooruitgang
deze sprint, inclusief een echte, zelf-gevonden en gerepareerde
beveiligingsfout, maar UX en end-to-end productie-validatie ontbreken
nog.

## MERGE RECOMMENDATION: YES

De code is intern consistent, functioneel getest (inclusief tegen de
live database), en de kritieke RLS-fout is al binnen deze sprint
gerepareerd en herbevestigd -- geen bekende, onopgeloste regressie.
Definitieve beslissing blijft bij de Product Owner.
