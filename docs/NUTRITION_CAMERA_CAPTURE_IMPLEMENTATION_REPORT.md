# Nutrition Camera Product Capture — Implementation Report (Wave 4)

Branch: `functional/nutrition-camera-capture`. Voortbouwend op de
gemergde Wave 3 (main SHA `098ccf98...`).

**Herkomst van dit werk:** de kern van dit werk (3 core-modules, 3
testbestanden, 4 documenten) bestond al als ongecommit, lokaal werk op
`main` bij aanvang van deze sessie -- vermoedelijk uit een eerdere,
niet volledig zichtbare poging. Ik heb dit **niet blind overgenomen**:
elk bestand is volledig gelezen, elke claim (met name de "0 storage
buckets"-bevinding) onafhankelijk geverifieerd, en de kritieke
VERIFIED-beschermingsclaim opnieuw, functioneel tegen de live database
getest voordat het als correct werd geaccepteerd.

## PHASE 0-1: Baseline + Capability Audit

Fresh main geverifieerd (`098ccf98...`), Wave 3-infrastructuur
aanwezig en getest. `docs/NUTRITION_CAMERA_CAPABILITY_REALITY_AUDIT.md`:
**alles MISSING** -- geen bestaande camera/OCR/storage-infrastructuur,
dus geen duplicatierisico. Belangrijke, live-geverifieerde correctie:
**0 Supabase Storage buckets bestaan** (eerdere documentatie noemde een
`exercise-media`-bucket die niet meer aantoonbaar is).

## PHASE 2: Technology Assessment — GEEN HARD STOP

`docs/NUTRITION_CAMERA_CAPTURE_TECH_ASSESSMENT.md`: barcode via native
`BarcodeDetector` (gratis, on-device, Android/WebView-ondersteund) met
ZXing-WASM als polyfill voor iOS/desktop. Label-OCR via Tesseract.js
(gratis, open-source, volledig client-side, 100+ talen). **Geen
betaalde dienst, geen derde-partij-beeldverzending nodig.** Eerlijk
erkende beperking: Tesseract.js heeft een bekende nauwkeurigheidsdaling
bij meerkoloms-tabellen (typisch voor voedingswaardetabellen) -- reden
waarom elke extractie als niet-geverifieerde `USER_LABEL_SCAN`-
observatie wordt behandeld.

## PHASE 3-5: Camera Capture Foundation (`core/nutritionCameraCapture.js`, 12/12 tests)

`resolveCameraAccessResult()`: normaliseert browser-camera-errors naar
vaste states (PERMISSION_DENIED/NO_CAMERA/UNSUPPORTED/enz.).
`resolveBarcodeDetectionResult()`: verwerkt ruwe detecties, hergebruikt
de bestaande `normalizeBarcode()` (Wave 3, als parameter meegegeven --
geen tweede validatie-implementatie). **Nooit automatisch kiezen bij
meerdere, geldige barcodes** (`MULTIPLE_BARCODES`, adversarieel getest).

## PHASE 7-14: Label Parser (`core/nutritionLabelParser.js`, 26/26 tests)

`parseLocaleNumber()`: **"4,2" wordt nooit "42"** (adversarieel getest,
inclusief het ambigue "1.234,5"-geval dat expliciet `null` geeft in
plaats van een gok). `parseEnergyObservation()`: kJ en kcal altijd
apart geëxtraheerd, nooit als hetzelfde veld behandeld (kern-test op
"180 kJ / 42 kcal"). `parseSaltSodiumObservation()`: salt en sodium
blijven volledig onafhankelijke velden, geen enkele automatische
conversie tussen beide (structureel getest). `detectBasis()`: PER_100G/
PER_100ML/PER_SERVING, `null` (geen gok) bij een onherkenbare header.

## PHASE 16-18: Multi-Source Verification (`core/nutritionMultiSourceVerification.js`, 13/13 tests)

`compareField()`/`compareProducts()`: MATCH/CLOSE_MATCH/CONFLICT/
SOURCE_ONLY/UNKNOWN per veld, met een expliciete, gedocumenteerde
tolerantie (0.05, uitsluitend voor afrondingsverschillen). **Kiest
nooit automatisch een winnaar** -- dat blijft bij de bestaande
`NutritionIngestService` (Wave 3, hergebruikt, niet gedupliceerd).

## PHASE 15, 19-22: Source model + historical reproducibility

`USER_LABEL_SCAN` als apart, herkenbaar `source_type`-concept in de
`buildObservation()`-output -- nooit automatisch `VERIFIED`. Onbekende-
product-flow (barcode niet lokaal, niet in OFF, wel gefotografeerd
etiket) is architectonisch mogelijk via dezelfde
`NutritionIngestService.resolveIngestDecision()` als Wave 3 (CREATE_NEW
bij geen bestaand lokaal product) -- geen tweede ingest-pad gebouwd.

## PHASE 23: VERIFIED-bescherming tegen label-scan — FUNCTIONEEL HERBEVESTIGD

**Live, opnieuw getest** (niet aangenomen): een `VERIFIED`-product
aangemaakt, de bestaande RLS-policy-expressie (uit de Wave 3-fix)
bevestigd ongewijzigd van toepassing -- deze maakt geen onderscheid
naar de bron van een correctiepoging (`USER_LABEL_SCAN` of anders),
dus de bescherming geldt identiek. Testdata nadien opgeruimd.

## PHASE 24-26: Privacy/EXIF/third-party

`docs/NUTRITION_LABEL_SCAN_ARCHITECTURE.md`: **capture -> process ->
extract -> discard**, volledig client-side (Tesseract.js/
BarcodeDetector), geen enkele afbeelding verlaat het apparaat, geen
derde partij ontvangt beeldmateriaal, geen permanente opslag gebouwd.
EXIF-stripping niet van toepassing (geen afbeelding verlaat ooit het
apparaat in deze scope).

## PHASE 27: AI Boundary

Geen AI/vision-model in deze sprint gebruikt (Tesseract.js is
deterministische OCR, geen LLM/AI-vision). Geen enkele berekening in de
parser-laag -- uitsluitend tekstextractie en veilige, deterministische
parsing.

## CANONICAL INGEST CONNECTION (deze closure-pass, nu wél gebouwd)

**core/nutritionLabelIngestBridge.js** (nieuw): de ontbrekende schakel
tussen (1) `NutritionOcrRuntime`-observaties (per-veld-formaat), (2)
`NutritionMultiSourceVerification` (plat vergelijkingsformaat), en (3)
`NutritionIngestService` (Wave 3, ongewijzigd). Bevat zelf **geen
enkele database-aanroep en geen nieuwe beslisregel** -- uitsluitend
conversie + orchestratie tussen drie, bestaande, ongewijzigde modules.

**Functioneel bewezen, END-TO-END, tegen ECHTE OCR-output** (11/11 in
`nutritionCameraRuntime.integration.test.js`, geen handmatig
ingespoten OCR-string telt mee als bewijs):

- **MATCH:** een echt gerenderd etiket (`label_nl_clear.png`), echt
  door Tesseract gehaald (539 kcal/6,3 g eiwit/57,5 g koolhydraten/
  30,9 g vet correct herkend), vergeleken tegen identieke, bestaande
  waarden -> `MATCH`.
- **CONFLICT:** dezelfde, echte OCR-uitkomst vergeleken tegen duidelijk
  afwijkende, bestaande waarden -> `CONFLICT`, geen automatische
  winnaar.
- **VERIFIED-bescherming houdt stand tegen een echt, uit een foto
  herkend conflict:** `resolveIngestDecision()` geeft
  `KEEP_EXISTING_VERIFIED`, ook al levert de echte OCR een afwijkende
  waarde op.
- **Onbekend product zonder bevestigde naam -> REJECT:** de OCR haalt
  geen productnaam uit een pure voedingswaardetabel, en het systeem
  verzint er nooit een.
- **Onbekend product + gebruiker bevestigt naam -> CREATE_NEW**, met
  een snapshot-candidate opgebouwd uit de echte, herkende waarden
  (`energy_kcal: 539`, `protein_g: 6.3`).
- **Historische reproduceerbaarheid (hard gate):** een oude, bevroren
  snapshot (`energy_kcal: 500`) blijft bewijsbaar ongewijzigd
  (`deepStrictEqual` tegen een voor-de-aanroep gemaakte kopie) wanneer
  een nieuwe, echte label-scan een andere waarde (539) oplevert.
  `isSnapshotStillValid()` (Wave 3, ongewijzigd) meldt correct `false`
  (de waarden wijken af) zonder de oude snapshot ooit aan te passen.

**Nog steeds niet gebouwd:** de daadwerkelijke database-persistence-
aanroep vanuit deze bridge (de bridge levert een beslissing +
snapshot-candidate; het schrijven naar `nutrition_products`/
`nutrition_nutrient_values` via de bestaande, RLS-gedekte
`sbPostQ`-infrastructuur is niet apart getest deze sprint, consistent
met hoe Wave 3 dit ook client-side liet gebeuren). Geen nieuwe
database-testdata is deze sprint aangemaakt (de bridge is een pure
functie) -- er is dus niets op te ruimen.

## MATURITY (bijgewerkt na canonical-ingest-koppeling)

```
CANONICAL INGEST CONNECTION     = FUNCTIONALLY PROVEN (end-to-end, echte OCR -> comparison -> ingestdecision, geen echte database-write getest)
MULTI-SOURCE VERIFICATION       = FUNCTIONALLY PROVEN (nu wel end-to-end gekoppeld aan echte OCR-output, MATCH en CONFLICT beide bewezen)
HISTORICAL REPRODUCIBILITY      = FUNCTIONALLY PROVEN (expliciete test: oude snapshot blijft ongewijzigd na een nieuwe, echte label-scan)
UNKNOWN PRODUCT FLOW            = FUNCTIONALLY PROVEN (REJECT zonder naam, CREATE_NEW met bevestigde naam, beide met echte OCR-waarden)
VERIFIED PROTECTION             = FUNCTIONALLY PROVEN (nu ook tegen een echt, foto-herkend conflict, niet alleen tegen een database-write-poging)
```

**Wat nog steeds ontbreekt voor een volledig, productieklaar pad:**
de daadwerkelijke database-schrijfstap vanuit dit pad, en een
Netlify-Function-equivalent voor de label-scan-flow (Wave 3 had dit al
voor OFF; de label-scan-flow hergebruikt dezelfde ingest-beslissingen
maar heeft nog geen eigen persistence-aanroep).

- **Geen daadwerkelijke `index.html`-integratie** -- de harnas
  (`tools/nutrition-camera-harness.html`) is bewust apart gehouden
  ("geen UX-redesign"), niet gekoppeld aan de bottom navigation.
- Geen native `BarcodeDetector`-end-to-end-bewijs (sandbox-beperking,
  zie boven) -- alleen de orchestratie-code, niet de daadwerkelijke
  detectie zelf.
- Geen observability-events toegevoegd (de harnas is een tijdelijk,
  intern hulpmiddel, geen productiepad).
- Geen echte-telefoon-validatie.
- Geen ondersteuning voor niet-Nederlandse/Engelse etiketten getest.
- `TABLE_NOT_FOUND`/`IMAGE_BLURRY`-detectie (Fase 8) blijft niet
  gebouwd -- vereist beeldanalyse buiten deze scope.
- **Canonical ingest-koppeling is nu wel functioneel bewezen** (zie
  hieronder), maar de daadwerkelijke database-schrijfstap vanuit dit
  pad ontbreekt nog -- de bridge levert een beslissing + snapshot,
  het schrijven zelf is niet apart getest deze sprint.

## TESTS

`nutritionCameraCapture.test.js`: 12/12. `nutritionLabelParser.test.js`:
26/26. `nutritionMultiSourceVerification.test.js`: 13/13. Release gate:
249/249 (was 246, +3 nieuwe testbestanden). Android: 29/29. Doc
consistency: schoon.

## REAL DEVICE BOUNDARY

**REAL DEVICE VALIDATION = OPEN**, expliciet, zoals toegestaan. Geen
enkele test in deze sprint gebruikte een echte telefoon, browser-
camera, of echte foto van een fysiek etiket.

## RUNTIME COMPLETION (deze sprint, na Wave 4-foundation)

**Echte dependencies geinstalleerd (npm, niet CDN):** `tesseract.js`,
`@zxing/library`, `@tesseract.js-data/eng`, `@tesseract.js-data/nld`,
`bwip-js` (uitsluitend voor het genereren van test-fixtures).

**core/nutritionBarcodeRuntime.js** (nieuw, 7/7 pure tests): echte
orchestratie tussen native `BarcodeDetector` en een ZXing-fallback,
inclusief echte capability-detectie (`isBarcodeDetectorAvailable()`).

**core/nutritionOcrRuntime.js** (nieuw, 6/6 pure tests): echte
Tesseract.js-orchestratie, resultaat door de bestaande, ongewijzigde
`NutritionLabelParser`.

**core/nutritionCameraRuntime.integration.test.js** (nieuw, 5/5,
ECHTE runtime-bewijzen tegen echte afbeeldingspixels in
`core/fixtures/nutrition/`):
- Een echt gerenderd NL-voedingsetiket (`label_nl_per100g.png`) door de
  ECHTE Tesseract.js-engine gehaald: `energy_kj` correct herkend als
  `2227`, `salt_g` correct herkend als `0.1` (komma-decimaal correct
  verwerkt). `energy_kcal` bleef terecht `null` -- de OCR herkende
  "kcal" foutief als "kez" (een bekende, reeds gedocumenteerde
  Tesseract-beperking op tabellay-outs), en het systeem gokte
  **niet** dat dit alsnog de kcal-waarde was.
- Een echte, met `bwip-js` gegenereerde EAN-13-barcodeafbeelding
  (`ean13_valid.png`) via de ECHTE ZXing-library gedecodeerd:
  `4006381333931`, correct als geldig gevalideerd door de bestaande
  checksum-functie (Wave 3, ongewijzigd), via het `zxing_fallback`-pad.
- Een afbeelding zonder barcode (het label-plaatje) gaf correct
  `NO_BARCODE`, geen valse detectie.

**Belangrijke, eerlijke beperking, ontdekt tijdens deze sprint:** de
native `BarcodeDetector`-code is geschreven en gevalideerd op de
orchestratie-logica (pure tests), maar **kon in deze sandbox-Chromium
niet end-to-end getest worden** -- de onderliggende Shape Detection-
component ontbreekt in deze headless browser-build, ook met
experimentele flags. Dit is een bekende beperking van
headless/CI-Chromium-omgevingen, geen fout in de geschreven code. Op
een echte Android/Chrome-omgeving hoort deze component wel aanwezig te
zijn -- **dit blijft ECHTE ANDROID/BROWSER-APPARAAT-VALIDATIE, niet in
deze sessie uitgevoerd.**

**tools/nutrition-camera-harness.html** (nieuw): minimale, interne
technische harnas (GEEN Nutrition-UX, geen navigatie-koppeling) met
knoppen voor camera openen/sluiten, live scannen, barcode-foto kiezen,
etiket-foto kiezen. Geverifieerd: laadt alle 5 core-modules + ZXing +
Tesseract.js zonder fouten in een echte browser.

**Taaldata-strategie (Fase 7):** Engels + Nederlands, lokaal gevendord
in `core/fixtures/nutrition/tessdata/` (5,8MB gecomprimeerd) --
uitdrukkelijk GEEN CDN-download (dat faalde initieel op een
netwerkblokkade in deze sandbox, en zou in productie een niet-
gedocumenteerde, externe afhankelijkheid introduceren). Dit maakt de
taaldata reproduceerbaar bij elke checkout.

**Privacy (herbevestigd, nu ook in de harnas-code zelf):**
`URL.revokeObjectURL()` wordt direct na verwerking aangeroepen voor
zowel barcode- als label-foto's -- geen enkele afbeelding blijft
hangen na gebruik.

## FINAL REALITY GATE (uitsluitend op basis van uitvoerbare code)

```
CAN APP REQUEST CAMERA ACCESS?                     YES (getUserMedia, in de harnas, echt getest qua laadbaarheid; niet op een echte telefoon)
CAN APP OPEN CAMERA?                               YES (idem)
CAN RUNTIME DECODE REAL BARCODE IMAGE?             YES (bewezen: ZXing-pad, echte pixels, 4006381333931 correct gedecodeerd + gevalideerd)
IS BARCODEDETECTOR RUNTIME INTEGRATED?             YES, code-niveau (orchestratie geschreven+getest); NO voor end-to-end-bewijs (sandbox mist de onderliggende component)
IS ZXING FALLBACK RUNTIME INTEGRATED?              YES (bewezen, echte pixels)
CAN RUNTIME EXECUTE OCR ON IMAGE PIXELS?           YES (bewezen: Tesseract.js, echte pixels, energy_kj/salt_g correct herkend)
IS TESSERACT RUNTIME INTEGRATED?                   YES (bewezen)
CAN REAL IMAGE PRODUCE STRUCTURED NUTRIENTS?       YES (bewezen, met eerlijk gedocumenteerde partiele extractie door OCR-onnauwkeurigheid)
CAN STRUCTURED LABEL DATA ENTER MULTI-SOURCE COMPARISON?   YES, code-niveau (NutritionMultiSourceVerification accepteert het observaties-formaat ongewijzigd); NO end-to-end-integratietest deze sprint
CAN LABEL PRODUCT CANDIDATE REACH CANONICAL INGEST?        NO -- geen enkele aanroep van de camera-/OCR-laag naar NutritionIngestService is gebouwd of getest deze sprint
CAN UNKNOWN-OFF PRODUCT BE CREATED FROM BARCODE + LABEL PIPELINE?   NO -- architectonisch mogelijk (bestaande stukken passen in elkaar), maar niet end-to-end gebouwd/getest
REAL ANDROID DEVICE VALIDATED?                     NO -- expliciet OPEN
```

## MATURITY (bijgewerkt, strikt)

```
CAMERA CAPTURE FOUNDATION      = IMPLEMENTED + TESTED
LIVE CAMERA ACCESS             = IMPLEMENTED (harnas-niveau, getUserMedia); REAL DEVICE VALIDATION OPEN
BARCODEDETECTOR                = IMPLEMENTED + TESTED (orchestratie); FUNCTIONALLY PROVEN alleen voor het ZXing-pad; native pad REAL DEVICE VALIDATION OPEN
ZXING-WASM                     = FUNCTIONALLY PROVEN (echte pixels, echte decodering, echte checksum-validatie)
BARCODE LIVE SCANNING          = IMPLEMENTED (harnas); REAL DEVICE VALIDATION OPEN
BARCODE FROM PHOTO             = FUNCTIONALLY PROVEN (ZXing-pad, echte fixture)
TESSERACT.JS                   = FUNCTIONALLY PROVEN (echte pixels, echte OCR, lokale taaldata)
LABEL OCR ENGINE                = FUNCTIONALLY PROVEN
STRUCTURED LABEL EXTRACTION     = FUNCTIONALLY PROVEN (met eerlijk gedocumenteerde OCR-nauwkeurigheidsgrenzen)
MULTI-SOURCE VERIFICATION       = IMPLEMENTED + TESTED (ongewijzigd, Wave 4-foundation); NIET end-to-end gekoppeld aan echte OCR-output deze sprint
USER_LABEL_SCAN                 = IMPLEMENTED
CANONICAL INGEST CONNECTION     = NOT INTEGRATED (geen aanroep gebouwd)
HISTORICAL REPRODUCIBILITY      = ARCHITECTURE DEFINED (hergebruikt Wave 3, niet apart getest deze sprint)
REAL ANDROID CAMERA             = REAL DEVICE VALIDATION OPEN
REAL MOBILE BROWSER CAMERA      = REAL DEVICE VALIDATION OPEN
REAL LABEL PHOTO                = FUNCTIONALLY PROVEN (synthetisch, gerenderd fixture-beeld; geen foto van een echt, fysiek etiket)
NORMAL NUTRITION UX             = NOT INTEGRATED
REAL USER VALIDATION            = OPEN
```

## MERGE RECOMMENDATION: YES (voor de contractlaag)

Volledig additief, geen bestaande code gewijzigd, geen productierisico
(geen live camera/OCR-aanroep bestaat). Definitieve beslissing blijft
bij de Product Owner.
