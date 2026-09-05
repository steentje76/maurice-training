# Nutrition Multi-Source Verification

## Bronnen (maximaal drie tegelijk)

`LOCAL_CANONICAL` (bestaande `nutrition_products`/`nutrition_nutrient_values`),
`OPEN_FOOD_FACTS` (Wave 3), `USER_LABEL_SCAN` (Wave 4, nieuw).

## Vergelijkingsstatussen (`core/nutritionMultiSourceVerification.js`)

`MATCH` / `CLOSE_MATCH` (tolerantie exact 0.05, gedocumenteerd en
getest -- uitsluitend voor afrondingsverschillen) / `CONFLICT` /
`SOURCE_ONLY` / `UNKNOWN` / `INVALID`.

## Source precedence (geen enkele bron wint automatisch)

Conform Fase 18: de daadwerkelijke precedence-beslissing (welke waarde
canonical wordt) blijft bij de bestaande
`NutritionIngestService.resolveIngestDecision()` (Wave 3, ongewijzigd
hergebruikt in deze sprint). Die functie neemt al rekening met:

- `verification_state` (VERIFIED wint altijd, ongeacht bron)
- eigenaarschap (`USER_PRIVATE` wordt niet automatisch overschreven)
- of het om een nieuwe rij (CREATE_NEW) of een revisie
  (ADD_REVISION) gaat

**Wave 4 voegt hier geen nieuwe precedence-logica aan toe** -- een
`USER_LABEL_SCAN`-observatie doorloopt dezelfde beslisboom als een
OFF-candidate. Functioneel herbevestigd (live, tegen de database): een
gesimuleerde `USER_LABEL_SCAN`-correctiepoging op een `VERIFIED`-product
wordt door dezelfde, in Wave 3 gerepareerde RLS-policy geweigerd.

## Scenario's (letterlijk uit de opdracht, nagebouwd en getest)

| Scenario | Resultaat | Bewijs |
|---|---|---|
| OFF kcal 42, LABEL kcal 42 | MATCH | test `compareField(42,42)` |
| OFF protein 3.2, LABEL protein 3.5 | CONFLICT | test `compareField(3.2,3.5)` |
| OFF protein null, LABEL protein 3.5 | SOURCE_ONLY | test, letterlijk het opdracht-voorbeeld nagebouwd |
| Barcode lokaal NOT_FOUND, OFF NOT_FOUND, label gefotografeerd | mogelijk een USER-SOURCED PRODUCT CANDIDATE (Fase 19) | architectuur ondersteunt dit: `NutritionIngestService.resolveIngestDecision()` met `existingProduct=null` geeft `CREATE_NEW`, ongeacht bron |
| VERIFIED canonical + USER_LABEL_SCAN-conflict | candidate/conflict, GEEN overschrijving | functioneel bevestigd tegen de live database |

## Wat nog niet is gebouwd

Een concrete `NutritionLabelIngestOrchestrator` die de drie bronnen
daadwerkelijk in één, end-to-end-flow samenbrengt (barcode -> lokaal ->
OFF -> label -> vergelijking -> ingest) is **niet als geheel
samengevoegd** in deze sprint -- de losse bouwstenen
(`NutritionCameraCapture`, `NutritionLabelParser`,
`NutritionMultiSourceVerification`, en het bestaande
`NutritionIngestService`) zijn elk apart gebouwd en getest, klaar om
door een toekomstige UX-laag samengebracht te worden.
