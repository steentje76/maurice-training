# Nutrition — Open Food Facts Field Mapping

Bron: een echte, live opgehaalde product-response
(`GET https://world.openfoodfacts.org/api/v2/product/3017624010701.json`,
Nutella/Ferrero, september 2026 -- niet gesimuleerd).

| OFF field | Canonical field | Unit | Normalization | NULL/UNKNOWN behavior | Provenance | Data-quality rule |
|---|---|---|---|---|---|---|
| `product_name` | `nutrition_products.name` | -- | trim, geen vertaling | ontbreekt -> `INCOMPLETE_PRODUCT` (naam is verplicht in canonical schema) | `source_record_id = code` | ontbrekende naam verlaagt automatisch `data_quality` naar max `LOW` |
| `brands` | `nutrition_products.brand` | -- | eerste waarde bij komma-gescheiden lijst (OFF staat meerdere merken toe) | ontbreekt -> `null`, geen aanname | provenance | -- |
| `code` (barcode) | `nutrition_product_identifiers.value` | -- | via `normalizeBarcode()` (bestaande Foundation 2-functie, checksum-gevalideerd) | ontbreekt is onmogelijk (dit was de lookup-sleutel) | -- | een checksum-ongeldige `code` van OFF zelf wordt behandeld als `NORMALIZATION_FAILED`, niet stilzwijgend geaccepteerd |
| `nutriments.energy-kcal_100g` | `nutrition_nutrient_values.energy_kcal` (basis PER_100G) | kcal | direct numeriek, GEEN kJ->kcal-conversie nodig wanneer `energy-kcal_100g` al aanwezig is | ontbreekt -> `null` (nooit 0) | provenance | -- |
| `nutriments.energy_100g` (kJ) | -- (niet gebruikt als primaire bron) | kJ | **alleen als fallback** wanneer `energy-kcal_100g` ontbreekt: kJ/4.184 = kcal, via een aparte, expliciete, geregistreerde Calculation (niet in deze sprint gebouwd -- OFF leverde in de smoke test altijd al `energy-kcal_100g` direct) | -- | transformatie zelf moet provenance krijgen (`transformation: kJ_to_kcal`) | **NIET in deze sprint geïmplementeerd** -- expliciet open gelaten, geen gok |
| `nutriments.proteins_100g` | `nutrition_nutrient_values.protein_g` | g | direct | ontbreekt -> `null` | provenance | -- |
| `nutriments.carbohydrates_100g` | `nutrition_nutrient_values.carbohydrate_g` | g | direct | ontbreekt -> `null` | provenance | -- |
| `nutriments.fat_100g` | `nutrition_nutrient_values.fat_g` | g | direct | ontbreekt -> `null` | provenance | -- |
| `nutriments.fiber_100g` | `nutrition_nutrient_values.fiber_g` | g | direct | ontbreekt -> `null` (bevestigd: Nutella-record had `fiber: null` in `nutriscore_data`, dus dit gebeurt echt) | provenance | -- |
| `nutriments.sugars_100g` | `nutrition_nutrient_values.sugar_g` | g | direct | ontbreekt -> `null` | provenance | -- |
| `nutriments.saturated-fat_100g` | `nutrition_nutrient_values.saturated_fat_g` | g | direct | ontbreekt -> `null` | provenance | -- |
| `nutriments.sodium_100g` | `nutrition_nutrient_values.sodium_mg` | **mg** (OFF geeft gram) | `waarde * 1000` (g->mg) | ontbreekt -> `null` | provenance + `transformation: g_to_mg` | -- |
| `nutriments.salt_100g` | -- (canonical schema heeft geen apart `salt_g`-veld) | g | **NIET automatisch naar sodium omgerekend** -- salt (NaCl) en sodium (Na) zijn chemisch verschillend (salt ≈ sodium × 2.5), een conversie zou een berekende, afgeleide waarde zijn | OFF's eigen `sodium_100g` wordt gebruikt als primaire bron; `salt_100g` wordt in deze sprint **niet** opgeslagen om geen tweede, impliciete waarheid over hetzelfde chemische feit te creëren | -- | **Expliciet open gelaten, geen shadow calculation**: als salt->sodium-conversie ooit gewenst is, hoort dat als een geregistreerde, aparte Calculation Registry-entry, niet als stille adapter-logica |
| `allergens_tags` | `nutrition_products.allergen_metadata` (jsonb) | -- | ruwe tags bewaard als metadata | ontbreekt -> `null` | provenance | **Expliciet, uitsluitend metadata -- geen "veilig om te eten"-garantie, geen medische claim** (conform Fase 22) |
| `quantity`/`product_quantity` | (niet 1:1 gemapt) | g | OFF geeft dit als totale verpakkingsgrootte (bv. "400.0 g" voor Nutella), niet als serving-grootte | niet gebruikt als `serving_size_g` tenzij expliciet een serving-veld aanwezig is (voorkomt verwarring verpakking vs. portie) | -- | -- |
| `completeness` (OFF-eigen metric, 0-1) | invoer voor `data_quality`-heuristiek (zie Fase 8-document) | -- | zie hieronder | -- | -- | -- |

## Belangrijke, tijdens de smoke test bevestigde risico's

**Salt vs. sodium zijn daadwerkelijk beide, apart aanwezig** in de
echte respons (`salt_100g: 0.1075`, `sodium_100g: 0.043` voor Nutella
-- ratio ≈2.5, consistent met de chemische NaCl/Na-verhouding). Dit
bevestigt dat de twee velden inderdaad apart behandeld moeten worden,
niet als synoniemen.

**Lege `product`-object bij een te specifieke `fields`-query** is een
gedocumenteerd, extern bevestigd risico: `status:1` (gevonden) kan
samengaan met een leeg `product`-object als de gevraagde velden niet
matchen. De adapter moet dit expliciet controleren (`validateResponse()`
mag nooit alleen op `status` vertrouwen).

**Leading-zero-ambiguïteit** (extern, GitHub-issue bevestigd): een
barcode zonder leading zeros kan door het `product`-endpoint soms
automatisch worden aangevuld, maar niet consistent door andere
endpoints. De adapter vertrouwt uitsluitend op de al-gevalideerde,
canonical, checksum-correcte vorm (via de bestaande
`normalizeBarcode()`) en stuurt die exacte string door -- geen eigen,
aanvullende leading-zero-heuristiek.

**`nutrition_data_per` bevestigt de basis** (`"100g"` voor Nutella) --
de adapter moet dit veld lezen om te bevestigen dat de nutrient-waarden
daadwerkelijk PER_100G zijn en niet PER_SERVING, in plaats van dit aan
te nemen.

## Kritieke, adversarieel bevestigde bevinding: `energy` != `energy-kcal`

**Extern, onafhankelijk bevestigd** (Coca-Cola-voorbeeld, barcode
5449000000996): het OFF-veld `nutriments.energy` (zonder suffix) is
**soms in kilojoule**, terwijl `nutriments.energy-kcal` het echte
kcal-veld is. Een implementatie die naïef `energy` als "calorieën"
interpreteert, zit een factor ~4,2 fout (bv. `energy: 180` (kJ) vs.
`energy-kcal: 42` (kcal) voor hetzelfde product). **De adapter leest
uitsluitend expliciet gesuffixte velden (`energy-kcal_100g`), nooit het
kale `energy`-veld, en valideert dat het gekozen veld numeriek en
aanwezig is voordat het als canonical `energy_kcal` wordt opgeslagen.**

Ook bevestigd: hetzelfde nutrient bestaat in de praktijk in tot vier
varianten tegelijk (`_100g`, `_serving`, kJ, kcal) -- de adapter
gebruikt uitsluitend de `_100g`-gesuffixte, kcal-varianten als canonical
bron voor de PER_100G-basis, en negeert `_serving`-varianten.

## Bevestigd, extern: onvolledige productpagina's komen echt voor

Het Coca-Cola-voorbeeld zelf is door Open Food Facts als "deze
productpagina is niet compleet" gemarkeerd -- dit bevestigt dat
`INCOMPLETE_PRODUCT` een realistisch, te verwachten resultaat is, geen
theoretisch randgeval.
