# Nutrition — Open Food Facts Integration Assessment

**Methode:** gericht, actueel webonderzoek (september 2026) van officiële
Open Food Facts-documentatie (`openfoodfacts.github.io`,
`world.openfoodfacts.org`) + eerdere licentie-audit (zie
`NUTRITION_EXTERNAL_DATA_SOURCE_ASSESSMENT.md`). Geen aanname zonder
bronvermelding.

## API endpoint(s)

- **Product-by-barcode (v2):** `GET https://world.openfoodfacts.org/api/v2/product/{barcode}`
  (staging/write-omgeving is `world.openfoodfacts.net`, productie-reads
  gaan naar `.org`).
- **Search (v2):** `GET /api/v2/search` -- **uitsluitend
  structured/filter-based** (categorieën, merken, nutriënten, e.d.).
  **Geen volledige tekst-zoekfunctie in v2** -- die komt via een
  aparte, nieuwere dienst (Search-a-licious,
  `search.openfoodfacts.org`), die in deze sprint niet is onderzocht.
- API v2 wordt door de officiële documentatie omschreven als de
  "stable, production-ready" versie; een v3 bestaat ook maar is niet
  vergeleken in deze sprint.

## Authenticatie

**READ-operaties (barcode-lookup, search) vereisen GEEN authenticatie
of API-key.** Alleen schrijf-operaties (product toevoegen/wijzigen)
vereisen `user_id`/`password` -- niet relevant voor deze sprint (wij
lezen alleen).

## User-Agent (verplicht, expliciet gedocumenteerd)

Open Food Facts vraagt **expliciet en met nadruk** om een unieke,
beschrijvende User-Agent-header in het formaat `AppName/Version
(ContactEmail)`, om niet als bot geïdentificeerd (en geblokkeerd) te
worden. **Dit is een harde implementatie-eis**, geen suggestie.

## Kritiek gedrag: succes zit niet in de HTTP-status

**Belangrijke, herhaaldelijk bevestigde bevinding uit meerdere,
onafhankelijke technische bronnen:** een onbekende/ongeldige barcode
geeft **HTTP 200** terug met `{"status": 0, ...}` in de response-body
-- **geen HTTP 404**. Een implementatie die alleen op de HTTP-status
vertrouwt, zou een NOT_FOUND-geval ten onrechte als succesvolle lookup
interpreteren. Dit is verwerkt in de adapter (zie
`validateResponse()`).

## Rate limits / fair use

**Geen officiële, harde, door Open Food Facts zelf gepubliceerde
rate-limit is in deze sprint gevonden.** Community-bronnen noemen
informeel "onder 100 requests/seconde sustained, met een correcte
User-Agent" als vuistregel; dit is **geen officiële garantie**. Enkele
derde-partij MCP-wrappers hanteren eigen, striktere limieten (bv.
100/minuut voor product-lookups), maar dat zijn hun eigen, opgelegde
limieten, niet die van Open Food Facts zelf.

**Conservatieve implementatiekeuze (deze sprint):** de adapter
implementeert een eigen, voorzichtige client-side throttle (zie
Fase 17-code) in plaats van te vertrouwen op een ongedocumenteerde
provider-limiet. Voor zware, bulk-achtige toegang biedt Open Food
Facts een dagelijks ververste, downloadbare databasedump (JSONL, tot
tientallen GB uitgepakt) als alternatief voor herhaalde API-calls --
niet gebruikt in deze sprint (buiten scope: dit is een losstaande
bulk-import-architectuur).

## Licentie (herbevestiging, zie eerdere audit)

- Database: **Open Database License (ODbL)** + Database Contents
  License.
- Productfoto's: **CC BY-SA**.
- **Commercieel gebruik toegestaan.**
- **Attributie verplicht** bij hergebruik van data of foto's, inclusief
  commercieel: naam + link naar Open Food Facts.
- **Share-alike-clausule:** raakt uitsluitend het delen van een
  *afgeleide database* die Open Food Facts-data combineert met andere
  bronnen -- niet de rest van de Trainingskompas-applicatie of de
  gebruikersdata daarin.

## Velden (globale beschikbaarheid, per-product wisselend)

Bevestigd beschikbaar in de product-payload (voorbeeldvelden uit
meerdere, onafhankelijke technische bronnen): `product_name`, `brands`,
`nutriments.energy-kcal_100g`, `nutriments.proteins_100g`,
`nutriments.carbohydrates_100g`, `nutriments.fat_100g`, `serving_size`,
`completeness` (een OFF-eigen datakwaliteitsindicator, 0-1). Overige
velden (allergenen, categorieën, landen) zijn conceptueel bevestigd
aanwezig in eerdere, algemene bronnen, maar per-veld-beschikbaarheid is
niet exhaustief getest in deze sprint -- de smoke test (Fase 26) toont
de daadwerkelijk teruggekomen velden voor de geteste barcodes.

## Data quality caveats (expliciet, belangrijk)

Open Food Facts is **community-driven/crowdsourced**. Het bestaan van
een record is **geen garantie voor correcte of complete voeding
sinformatie**. De `completeness`-indicator van OFF geeft een signaal,
maar is zelf geen Trainingskompas-datakwaliteitsoordeel -- zie de
mapping naar `data_quality`/`verification_state` in
`NUTRITION_OFF_FIELD_MAPPING.md`.

## Conclusie: GEEN hard stop

Geen van de vier hard-stop-criteria doet zich voor:
- licentie is duidelijk (ODbL/CC-BY-SA, helder gedocumenteerd);
- commercieel gebruik is expliciet toegestaan;
- attributie is een concrete, bekende eis (implementatie-detail, geen
  onduidelijkheid);
- caching/redistributie is duidelijk: lokale opslag van genormaliseerde
  productdata is standaardgebruik binnen de ODbL, mits attributie
  behouden blijft.

**Wel expliciet als open punt genoteerd:** het ontbreken van een
officiële, harde rate-limit-garantie leidt tot een conservatieve, eigen
throttle-keuze in de adapter (zie hieronder), niet tot een hard stop.
