# Nutrition UX v1 — Set B Implementation Report

Voortzetting op PR #240, branch `ux/nutrition-approved-v1`.

## Wat is gebouwd

**8 nieuwe schermen**, allemaal additief (`+414/-6` regels index.html,
gecontroleerd met `git diff --numstat`):

- `s-voeding-custom`: echt, werkend custom-productformulier (was een
  placeholder-melding)
- `s-voeding-correctie`: echte correctie-/aanvulformulier, met
  zichtbare VERIFIED-bescherming
- `s-voeding-foto-etiket` (Screen 9): echte camera-integratie
  (`getUserMedia`), twee foto's (voorkant + etiket)
- `s-voeding-foto-controleren` (Screen 10): preview + "opnieuw maken"
- `s-voeding-herkende-gegevens` (Screen 11): **echte OCR-uitvoer**
- `s-voeding-product-match` (Screen 12): vergelijkingslogica
- `s-voeding-verschil` (Screen 13): conflict-scherm (structuur staat,
  zie beperkingen)
- `s-voeding-nieuw-product` (Screen 14) + `s-voeding-bevestiging`
  (Screen 15)

## Twee keer dezelfde, kritieke fout zelf gevonden en hersteld

**Beide keren tijdens deze sessie** liet een Python-tekstverwerkings-
script (gebruikt om `box-sizing:border-box` defensief toe te voegen)
per ongeluk het hele bestand van CRLF naar LF converteren -- exact het
probleem uit de vorige PR-ronde. **Beide keren zelf ontdekt** via
`git diff --numstat` (sprong van ~420 naar ~29.000 regels) en
**hersteld** met een precieze, `difflib`-gebaseerde reconstructie
tegen de laatst gecommitte HEAD, zodat alleen echte, bedoelde
wijzigingen in de diff overblijven. Eindresultaat geverifieerd:
`414 insertions(+), 6 deletions(-)`.

## Echte, functionele verificatie (niet alleen aangenomen)

**OCR, via de daadwerkelijke, gebouwde productie-app** (`www/`,
geserveerd via een lokale HTTP-server, niet `file://`): een echte
foto van een voedingsetiket werd door de app zelf, met de eigen
gevendorde Tesseract.js + taaldata (`core/vendor/`, geen CDN, geen
`node_modules`-referentie in `index.html`), correct herkend:
**539 kcal, 6.3 g eiwit, 57.5 g koolhydraten** -- exact overeenkomend
met eerdere, Wave 4-metingen.

**Visueel geverifieerd** (screenshots): custom-productformulier
(inclusief de gevonden en gerepareerde horizontale-overflow-fout),
foto-etiket-scherm, foto's controleren (met echte, herkende preview-
tekst), herkende gegevens (met de echte OCR-uitkomst), nieuw product.

**Build-integriteit bevestigd**: `npm run build:www` kopieert
`core/vendor/*` correct naar `www/core/vendor/`; `grep` op
`www/index.html` bevestigt 0 `node_modules`-verwijzingen. Browser-
console tijdens alle geteste schermen: 0 fouten op eigen assets
(uitsluitend een verwacht, extern Google Fonts-netwerkprobleem,
ongerelateerd).

## Geen duplicate runtime (structureel getest, 11/11 nieuwe tests)

Elke nieuwe Set B-functie roept uitsluitend bestaande, ongewijzigde
Wave 3/4-modules aan: `NutritionBarcodeRuntime`, `NutritionOcrRuntime`
+ `NutritionLabelParser`, `NutritionLabelIngestBridge` +
`NutritionMultiSourceVerification`, `NutritionCustomProductService`,
`NutritionCrossDomainContract.evaluateCorrectionRequest` +
`canModifyCanonicalRecord`. Geen tweede implementatie van barcode-
decodering, OCR, vergelijking, of VERIFIED-precedence.

## Geen shadow calculation

Nieuw-product-persistence kopieert OCR-observaties 1-op-1 (structureel
getest: geen vermenigvuldiging/eigen berekening in de persistence-
functie). Correctie voegt uitsluitend een NIEUWE `nutrition_
nutrient_values`-rij toe (additief, `sbPostQ`), nooit een `sbPatchQ`
op een bestaande rij -- historische reproduceerbaarheid blijft
gegarandeerd via hetzelfde, ongewijzigde Wave 3/4-mechanisme.

## Eerlijke beperkingen

- **Conflict-scherm (Screen 13) heeft de structuur maar geen echt,
  live-gedemonstreerd conflict-scenario in deze sessie** -- de
  onderliggende `hasConflict`-detectie is wel al eerder (Wave 4) live
  bewezen; de UI-rendering van een daadwerkelijk conflict is
  structureel gebouwd maar niet met een echt tegenstrijdig productpaar
  doorlopen binnen deze sessie.
- **Barcode-matching in Screen 12 zoekt op productnaam, niet op
  barcode** -- de OCR van een pure voedingswaardetabel levert geen
  productnaam op, dit is een eerlijke, al eerder (Wave 4) benoemde
  beperking, geen nieuwe.
- **Real device validation blijft OPEN** -- alle bovenstaande, echte
  verificatie liep in een headless/lokale browser, niet op een fysieke
  telefoon.
- **Ingrediënten/allergenen**: niet toegevoegd, conform instructie
  (niet reeds bewezen ondersteund).

## Real-device test checklist (voor Product Owner)

- Camera-toestemming (toestaan/weigeren)
- Live barcode scannen op een echt product
- Barcode vanaf een foto van de verpakking
- Voorkant-foto + etiket-foto in de foto-flow
- Komma-decimaal op een echt, Nederlands etiket
- kJ/kcal op een echt etiket met beide waarden
- Zout/natrium op een echt etiket
- Een écht conflict (bv. handmatig een net iets andere kcal-waarde
  invoeren dan het lokale product)
- Een écht onbekend product volledig via foto toevoegen
- Bevestigen dat na het sluiten van de foto-flow geen foto behouden
  blijft (geheugengebruik/Bestanden-app controleren)

## TESTS

`fVoedingUXSetB.test.js` (nieuw, 11/11): vendor-integriteit, geen
`node_modules`-referentie, geen duplicate runtime (5x), geen shadow
calculation, additieve correctie, VERIFIED-precedence-UI. Release
gate: 262/262 (was 261, +1). Android: 29/29. Security: 16/16. Doc
consistency: schoon. HYROX forensic regression: 386/386.

## MERGE RECOMMENDATION: niet van toepassing -- wacht op Product Owner
