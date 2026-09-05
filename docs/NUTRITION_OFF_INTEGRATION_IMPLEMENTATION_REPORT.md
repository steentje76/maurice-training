# Nutrition External Data Integration (Wave 3) — Implementation Report

Branch: `functional/nutrition-off-integration`. PR #234/#222 niet
gewijzigd. Voortbouwend op de gemergde Nutrition Foundation 2.0
(main SHA `df7d15b2...`).

## Wat is gebouwd

1. **Licentie/contract-audit** (`NUTRITION_OPEN_FOOD_FACTS_INTEGRATION_
   ASSESSMENT.md`): actueel, gericht webonderzoek van officiële OFF-
   documentatie. Geen hard-stop-criterium van toepassing. Belangrijkste,
   kritieke bevinding: **OFF geeft HTTP 200 terug met `status:0` in de
   body bij een onbekende barcode** -- geen 404. Elke implementatie die
   alleen op HTTP-status vertrouwt, faalt stil.

2. **Real data smoke test** (Fase 26, echt uitgevoerd, niet gesimuleerd):
   twee echte, live API-aanroepen via `web_fetch`/`web_search` naar de
   daadwerkelijke Open Food Facts-API (Nutella 3017624010701, Coca-Cola
   5449000000996). **Kritieke, adversarieel bevestigde bevinding:** het
   OFF-veld `nutriments.energy` (zonder suffix) staat soms in **kilojoule**,
   terwijl `energy-kcal` het echte kcal-veld is (bevestigd: Coca-Cola
   `energy:180` (kJ) vs. `energy-kcal:42` (kcal) -- een factor ~4,2
   verschil). De adapter leest uitsluitend het expliciet gesuffixte
   `energy-kcal_100g`-veld.

3. **Field mapping** (`NUTRITION_OFF_FIELD_MAPPING.md`), gebaseerd op de
   echte fixtures: elk OFF-veld expliciet gekoppeld aan een canonical
   veld, eenheid, normalisatie, en NULL-gedrag. **Salt en sodium blijven
   bewust gescheiden velden** (bevestigd in de echte data: Nutella
   `salt_100g:0.1075` vs. `sodium_100g:0.043`, ratio ≈2,5 -- consistent
   met de chemische NaCl/Na-verhouding) -- geen automatische conversie,
   geen shadow calculation.

4. **Provider adapter** (`core/nutritionProviderOpenFoodFacts.js`, 22/22
   tests, met de echte fixtures als testdata): `validateResponse()`,
   `extractEnergyKcal()`, `normalizeNutrients()`, `normalizeProduct()`,
   `getSourceMetadata()`, `evaluateDataQuality()`. **Pure, geen
   netwerk-code.** Output is uitsluitend het generieke, provider-
   agnostische candidate-formaat -- geverifieerd dat geen enkele
   OFF-specifieke veldnaam (`brands`, `nutrition_data_per`) in de output
   lekt.

5. **Data quality-heuristiek**: nooit automatisch `VERIFIED`/`HIGH`
   puur omdat een OFF-record bestaat (expliciet, adversarieel getest) --
   maximaal `MEDIUM` bij volledige kernvelden + hoge OFF-`completeness`.

6. **Staleness/precedence + server-side boundary**
   (`NUTRITION_OFF_STALENESS_AND_SERVER_BOUNDARY.md`): hergebruikt de
   bestaande `canModifyCanonicalRecord()` uit Foundation 2 -- een
   `VERIFIED`-product is nooit overschrijfbaar door een nieuwe
   OFF-snapshot. Server-side-aanroep-beslissing onderbouwd met bewijs
   (User-Agent-eis, bestaand precedent `netlify/functions/coach.js`,
   rate-limit-onzekerheid).

## Wat NIET is gebouwd (bewust, eerlijk)

- **Geen daadwerkelijke Netlify Function/live HTTP-integratie.** De
  smoke test gebruikte `web_fetch` binnen deze sessie, niet een
  productie-server-side-aanroep vanuit de app zelf. Een echte
  productie-integratie vereist een definitieve, contactgegevens-
  bevattende User-Agent-string die niet zonder Product Owner-input
  verzonnen mag worden.
- **Geen ingest-service (`NutritionProductIngestService`)** die de
  adapter-output daadwerkelijk naar de database schrijft (upsert/dedupe/
  conflict-resolutie). De adapter levert het genormaliseerde candidate-
  object; het daadwerkelijk persisteren is niet gebouwd.
- **Geen search-integratie** (Fase 14) -- alleen barcode-lookup is
  onderzocht en geadapteerd.
- **Geen image-integratie** (Fase 23) -- expliciet DEFERRED, geen
  scherm-wijziging voor afbeeldingen.
- **Geen kJ->kcal-fallback-conversie** wanneer `energy-kcal_100g`
  ontbreekt -- in beide smoke-test-fixtures was dit veld al aanwezig,
  dus er was geen aanleiding een nieuwe, geregistreerde Calculation te
  bouwen zonder een echt waargenomen noodzaak.
- **Geen dedupe/conflict-tests met echte, meerdere OFF-records voor
  hetzelfde product** (Fase 12) -- niet binnen deze sessie
  waargenomen/getest.
- **Geen echte database-persistentie van OFF-data getest** (in
  tegenstelling tot Foundation 2, waar ik wel functioneel tegen de
  live database testte) -- deze sprint bleef op het niveau van
  normalisatielogica; de daadwerkelijke ingest-service ontbreekt nog.

## AI Boundary (regressie, ongewijzigd)

Geen wijziging aan de bestaande AI Coach-keten. De adapter levert
uitsluitend genormaliseerde, canonical-vormige data; er is geen pad
waarlangs een raw OFF-response ooit bij de AI terecht zou kunnen komen
(er is geen enkele nieuwe AI-aanroep in deze sprint toegevoegd).

## TESTS

`core/nutritionProviderOpenFoodFacts.test.js`: 22/22 (nieuw, met echte
fixtures). Release gate: 244/244 (was 243, +1 nieuw testbestand
ontdekt -- 241 testbestanden totaal, was 240). Bestaande Nutrition
Foundation 2/B9-tests: ongewijzigd groen. Android: 29/29. Doc
consistency: schoon.

## MATURITY

```
OFF LICENSE/CONTRACT AUDIT        = COMPLETE
OFF FIELD MAPPING                 = COMPLETE (barcode-lookup only)
OFF PROVIDER ADAPTER (normalisatie) = IMPLEMENTED + TESTED
OFF LIVE HTTP INTEGRATION          = NOT BUILT (server-side, PO-afhankelijke User-Agent nodig)
INGEST SERVICE (persist/dedupe)   = NOT BUILT
SEARCH INTEGRATION                 = NOT INVESTIGATED THIS SPRINT
IMAGE INTEGRATION                  = DEFERRED
STALENESS/PRECEDENCE RULES         = DESIGNED, hergebruikt bestaande Foundation 2-logica
REAL USER VALIDATION               = OPEN
```

**Niet geclaimd:** "barcode scanning werkt voor gebruikers", "Open Food
Facts is aangesloten", "product-database is gevuld". Deze sprint
bewijst dat de normalisatie- en veiligheidslogica correct is tegen
echte, live data -- niet dat de integratie end-to-end draait.

## MERGE RECOMMENDATION: YES (voor de foundation-code)

De geleverde adapter-logica is intern consistent, getest tegen echte
data, en volledig additief (geen bestaande code gewijzigd). Geen
productiedeployment-risico, want er is geen live HTTP-aanroep vanuit de
app zelf. Definitieve beslissing blijft bij de Product Owner, conform
"NIET AUTOMERGEN".
