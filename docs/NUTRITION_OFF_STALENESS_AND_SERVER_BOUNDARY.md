# Nutrition — Staleness/Refresh Policy + Server-Side Boundary Decision

## Staleness / refresh model

Onderscheiden entiteiten (conform Fase 11):

- **Canonical product identity** (`nutrition_products.id`): onveranderlijk
  zodra aangemaakt. Een OFF-herimport wijzigt nooit dit ID.
- **Provider snapshot**: vastgelegd via
  `getSourceMetadata().fetched_at` + `source_version` (OFF's `rev`-veld,
  bevestigd aanwezig in de echte Nutella-fixture: `rev: 105`).
- **Nutrient revision**: elke `nutrition_nutrient_values`-rij heeft zijn
  eigen `created_at`; een latere OFF-herimport voegt een NIEUWE rij toe
  in plaats van de oude te overschrijven (additief, geen UPDATE-op-
  bestaande-rij in deze sprint -- zie precedence-regels hieronder).

**HARD RULE nageleefd: historical logs must remain reproducible.**
`nutrition_meal_items` verwijst naar `food_id`/`product_id`, niet direct
naar een specifieke `nutrition_nutrient_values`-rij. Dit is in deze
sprint **niet aangepast** naar een expliciete snapshot-at-log-time-
koppeling (dat zou een aparte, additieve kolom/tabel vereisen). **Dit is
een bewust, open punt:** zolang nutrient-waarden alleen additief
toegevoegd worden (nooit UPDATE van een bestaande rij), blijft het
risico beperkt (oude rijen wijzigen nooit met terugwerkende kracht),
maar een harde garantie dat een 2 jaar oude meal-log exact dezelfde
waarde toont als toen, vereist een vervolgstap die in deze sprint niet
is gebouwd.

## Precedence rules (Fase 13, existing user product protection)

Hergebruikt de bestaande, al geteste `NutritionFoundation2Core.
canModifyCanonicalRecord()` (Foundation 2, ongewijzigd): een
`VERIFIED`-rij is nooit stil overschrijfbaar. Voor OFF-ingest specifiek:

| Bestaande verification_state | OFF-ingest gedrag |
|---|---|
| `USER_PRIVATE` | OFF-data wordt NIET automatisch gekoppeld/overschreven -- een match met een bestaand, privé user-product vereist een aparte, expliciete matching-stap (niet in deze sprint gebouwd) |
| `COMMUNITY_UNVERIFIED` | een nieuwe OFF-snapshot mag een NIEUWE candidate-rij toevoegen (additief), nooit de bestaande rij overschrijven |
| `COMMUNITY_REVIEWED` | zelfde als hierboven -- nooit stil degraderen |
| `VERIFIED` | `canModifyCanonicalRecord()` retourneert `false` voor iedereen, inclusief een OFF-ingest-proces -- een nieuwe OFF-snapshot wordt uitsluitend als aparte, niet-canonical candidate bewaard, nooit toegepast |

**Geen silent merge.** Bij een reeds bestaand canonical product met
dezelfde barcode (via `resolveBarcode()` -> `FOUND`), wordt de
bestaande rij gebruikt; een OFF-herimport update deze in deze sprint
niet automatisch (additief-only, conform hierboven).

## Server-side boundary decision

**Beslissing: provider-aanroepen horen server-side (Netlify Function),
niet direct client-side.**

Onderbouwing (bewijs, geen aanname):
- **User-Agent-eis:** OFF vraagt expliciet om een consistente,
  applicatie-brede User-Agent-header. Server-side is deze eenvoudig en
  betrouwbaar te garanderen; client-side (browser `fetch()`) kan de
  User-Agent-header niet altijd vrij door de browser laten instellen.
- **Bestaand architectuurpatroon:** de app heeft al een precedent voor
  externe-API-proxying server-side (`netlify/functions/coach.js` voor
  de AI Coach-integratie) -- dit is dus consistent met de bestaande,
  gekozen architectuur, geen nieuwe aanname.
- **Rate-limit-onzekerheid:** gegeven het ontbreken van een officiële,
  harde OFF-rate-limit (zie integration assessment), is een server-side
  laag beter gepositioneerd om een gedeelde, centrale throttle toe te
  passen over alle gebruikers heen, in plaats van dat elke client
  onafhankelijk zijn eigen limiet zou moeten bewaken.
- **Observability:** server-side logging van lookup-attempts/failures
  (Fase 20) is praktisch alleen haalbaar met een server-side laag.

**Niet gebouwd in deze sprint:** de daadwerkelijke Netlify Function
zelf (`netlify/functions/nutrition-off-lookup.js` ofzoiets) is **niet
geïmplementeerd** -- dit vereist live deployment-toegang en een
productie-User-Agent-string (met een echt contact-e-mailadres van
Trainingskompas) die niet zonder Product Owner-input verzonnen mag
worden. De pure, testbare normalisatielogica
(`core/nutritionProviderOpenFoodFacts.js`) is wel volledig gebouwd en
getest, klaar om door zo'n functie aangeroepen te worden.

## Rate limit / cache (Fase 17, ontwerp-niveau)

Conform de conservatieve keuze uit de integration assessment: geen
vertrouwen op een ongedocumenteerde providerlimiet. Ontwerp (niet
geïmplementeerd als draaiende infrastructuur in deze sprint): lokale
canonical-lookup altijd eerst (Fase 10, "local first"), provider-
aanroep uitsluitend bij een bevestigde lokale `NOT_FOUND`. Geen nieuwe
retry-engine -- hergebruik van bestaande, platformbrede
retry/offline-mechanismen (`sbGet`/`sbPostQ`-patroon) wanneer de
Netlify Function daadwerkelijk gebouwd wordt.
