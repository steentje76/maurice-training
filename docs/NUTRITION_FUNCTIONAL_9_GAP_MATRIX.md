# Nutrition Functional >=9 Gap Matrix

Bron: code/database-inspectie + deze sprint. Geen documentatie-aanname.

| Capability | Status | Maturity 0-10 | Waarom het telt | Test evidence |
|---|---|---|---|---|
| Barcode lookup/canonical ingest (Wave 3/4) | FUNCTIONALLY PROVEN | 8 | kernfunctie voor snel loggen | echte, live database-tests (Wave 3/4) |
| Camera/OCR-runtime (Wave 4) | FUNCTIONALLY PROVEN (software) | 7 | alternatief loggen zonder database-match | echte pixel-tests (Wave 4) |
| Meal CRUD-regels (mealType/ownership/quantity-validatie) | IMPLEMENTED + TESTED | 6 | basisvoorwaarde voor elk logboek | 13/13 nieuwe tests |
| Daily aggregation + coverage-metadata | IMPLEMENTED + TESTED, FUNCTIONALLY PROVEN | 7 | UNKNOWN != 0 is een hard, product-breed principe | 8 pure tests + 1 live database-scenario (185 kcal, ongewijzigd na latere revisie) |
| Historische reproduceerbaarheid | FUNCTIONALLY PROVEN | 8 | voorkomt dat gisteren met terugwerkende kracht verandert | live database-test deze sprint (energy_kcal bleef 185 na een nieuwe 400-kcal-revisie) |
| Discovery (search/recent/frequent) | IMPLEMENTED + TESTED | 5 | voorkomt "altijd barcode scannen" | 10/10 pure tests, geen live database-query getest |
| Cross-domain read-contract | IMPLEMENTED + TESTED | 5 | veilige basis voor toekomstige Today/Inzicht/Coach-context | 7/7 pure tests |
| Correction-workflow (VERIFIED-precedence) | IMPLEMENTED + TESTED (hergebruikt Wave 3/4) | 7 | voorkomt datavervuiling | hergebruikt eerder, live geverifieerde RLS-fix |
| Hydratie CRUD | FUNCTIONALLY PROVEN | 7 | canonical tabel bestaat (Wave 3), nu een echte service-laag + live CRUD-bewijs | 10/10 pure tests + live database-scenario (create/aggregate/edit/re-aggregate/delete, 750ml->900ml na edit) |
| Supplementen CRUD | FUNCTIONALLY PROVEN | 7 | canonical tabel bestaat (Wave 3), nu een echte, veilige logging-service | 8/8 pure tests + live database-scenario (definitie/log/edit-dosis/delete) |
| Portion engine (11 vereiste scenario's) | FUNCTIONALLY PROVEN | 8 | fundament voor elke nauwkeurige logging | alle 11 scenario's (100g/250g/100ml/330ml/0.5-2 servings/piece bekend+onbekend/negatief/0) expliciet getest, hergebruikt bestaande, ongewijzigde logica |
| Meal CRUD (create/add/edit-quantity/remove/delete) | FUNCTIONALLY PROVEN | 8 | kern van het hele logboek | live database-scenario: create->add item->edit quantity (100g/165kcal -> 200g/330kcal)->remove item->delete meal, alle stappen bevestigd |
| Voedingsdoelen/targets | MISSING (bewust) | 0 | vereist een productbeslissing (athlete-entered/coach-set/Decision-Engine) | geen architectuur gebouwd, PRODUCT OWNER DECISION REQUIRED |
| Micronutriënten buiten de huidige 8 velden | ARCHITECTURE ONLY | 2 | concurrenten (Cronometer) trekken hier een streep | schema is uitbreidbaar, geen extra velden toegevoegd |
| Security/RLS (privé data, geen coach/gym-toegang) | FUNCTIONALLY PROVEN (structureel) | 7 | fundamenteel privacyvereiste | hergebruikt eerder bewezen policies, geen nieuwe policy nodig voor de service-laag zelf (pure functies) |
| Real device/browser camera-validatie | REAL DEVICE VALIDATION OPEN | -- | vereist fysieke hardware | expliciet buiten scope van software-werk |
| Finale Nutrition-UX | UX OPEN | -- | PO-beslissing, bewust nog niet gebouwd | n.v.t. |
| Real-user-validatie | REAL USER VALIDATION OPEN | -- | vereist echte gebruikers | n.v.t. |

**Geen opgeblazen scores.** De laagste scores (voedingsdoelen,
micronutriënten, hydratie/supplementen-service-laag) zijn eerlijk laag
gehouden -- ze vereisen ofwel een PO-beslissing, ofwel simpelweg nog
niet-gedaan werk, niet een architecturale blokkade.
