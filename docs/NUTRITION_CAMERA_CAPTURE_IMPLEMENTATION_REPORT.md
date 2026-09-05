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

## Wat NIET is gebouwd (bewust, eerlijk)

- Geen daadwerkelijke UI/scherm-integratie (bewust, "geen UX-redesign").
- Geen bundling/build-stap-integratie van Tesseract.js/BarcodeDetector
  in `index.html`.
- Geen observability-events daadwerkelijk toegevoegd aan een draaiend
  pad (geen UI-aanroep bestaat nog om ze te triggeren).
- Geen echte-telefoon-validatie binnen deze sessie.
- Geen ondersteuning voor niet-Nederlandse/Engelse etiketten getest.
- `TABLE_NOT_FOUND`/`IMAGE_BLURRY`-detectie (Fase 8) is **niet als
  aparte functie gebouwd** -- dit vereist daadwerkelijke beeldanalyse
  (bv. Laplacian-variantie voor blur-detectie) die buiten de pure,
  tekst-gebaseerde scope van deze sprint valt. Expliciet open, geen
  overclaim.

## TESTS

`nutritionCameraCapture.test.js`: 12/12. `nutritionLabelParser.test.js`:
26/26. `nutritionMultiSourceVerification.test.js`: 13/13. Release gate:
249/249 (was 246, +3 nieuwe testbestanden). Android: 29/29. Doc
consistency: schoon.

## REAL DEVICE BOUNDARY

**REAL DEVICE VALIDATION = OPEN**, expliciet, zoals toegestaan. Geen
enkele test in deze sprint gebruikte een echte telefoon, browser-
camera, of echte foto van een fysiek etiket.

## MATURITY

```
CAMERA CAPTURE FOUNDATION      = IMPLEMENTED + TESTED
BARCODE LIVE SCANNING          = ARCHITECTURE + CONTRACT ONLY (geen index.html-integratie)
BARCODE IMAGE RECOGNITION      = ARCHITECTURE + CONTRACT ONLY
LABEL OCR                      = TECHNOLOGY SELECTED, NOT INTEGRATED (Tesseract.js gekozen, niet gebundeld)
STRUCTURED LABEL EXTRACTION    = IMPLEMENTED + TESTED (parsing-laag, geen echte OCR-aanroep getest)
MULTI-SOURCE VERIFICATION      = IMPLEMENTED + TESTED
UNKNOWN PRODUCT CREATION       = ARCHITECTURALLY POSSIBLE (hergebruikt Wave 3 ingest, niet apart end-to-end getest)
CANONICAL INGEST               = HERGEBRUIKT, ONGEWIJZIGD (Wave 3)
HISTORICAL REPRODUCIBILITY     = HERGEBRUIKT, ONGEWIJZIGD (Wave 3-fundament)
REAL DEVICE VALIDATION         = OPEN
NORMAL NUTRITION UX            = NOT INTEGRATED
REAL USER VALIDATION           = OPEN
```

**Geen overclaim:** dit is een pure, technologie-onafhankelijke
contractlaag met sterke, adversariële testdekking op de kritieke
veiligheidsregels (decimaal/energie/zout-natrium/geen-gok-bij-conflict).
Er is geen enkele regel code die een camera aanraakt, een echte OCR-
engine aanroept, of op een telefoon heeft gedraaid.

## MERGE RECOMMENDATION: YES (voor de contractlaag)

Volledig additief, geen bestaande code gewijzigd, geen productierisico
(geen live camera/OCR-aanroep bestaat). Definitieve beslissing blijft
bij de Product Owner.
