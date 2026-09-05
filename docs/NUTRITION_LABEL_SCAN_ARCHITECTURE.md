# Nutrition Label Scan Architecture + Privacy

## Data flow

```
Camera/upload -> ruwe afbeelding (uitsluitend in browser-/apparaatgeheugen)
  -> OCR (Tesseract.js, client-side, GEEN netwerkverkeer, zie tech assessment)
  -> ruwe, herkende tekst
  -> NutritionLabelParser (dit bestand-serie, pure functies)
     -> parseLocaleNumber / extractUnit / parseEnergyObservation /
        parseSaltSodiumObservation / detectBasis / buildObservation
  -> gestructureerde observaties, elk met source=USER_LABEL_SCAN
  -> NutritionMultiSourceVerification.compareProducts() tegen LOCAL/OFF
  -> NutritionIngestService.resolveIngestDecision() (Wave 3, hergebruikt)
  -> canonical persistence (via bestaande, RLS-gedekte infrastructuur)
```

**Geen enkele stap in deze keten stuurt de ruwe afbeelding naar een
server.** Alle verwerking (OCR + parsing + vergelijking) gebeurt
client-side, conform de Tesseract.js-technologiekeuze.

## Privacy-strategie (Fase 24, definitief voor deze sprint)

**capture -> process -> extract structured data -> discard original
image.** Er is in deze sprint geen enkel mechanisme gebouwd dat een
foto van een voedingsetiket permanent bewaart. Omdat de OCR-verwerking
client-side gebeurt (Tesseract.js), is er ook geen server-side
tijdelijke opslag nodig voor deze verwerkingsstap zelf.

| Vraag | Antwoord |
|---|---|
| Waar bestaat de afbeelding? | Uitsluitend in het geheugen van het apparaat/de browser tijdens verwerking |
| Hoe lang? | Tot de pagina/het proces de afbeelding vrijgeeft (geen expliciete, langere levensduur gebouwd) |
| Wie heeft toegang? | Niemand buiten het eigen apparaat van de gebruiker |
| Gaat het naar een derde partij? | **Nee** -- Tesseract.js is client-side, geen netwerkaanroep naar een OCR-provider |
| Wanneer verwijderd? | Er is niets om te verwijderen: er vindt geen persistente opslag plaats in deze sprint |

**Indien later alsnog server-side verwerking nodig blijkt** (bv. voor
een nauwkeuriger OCR-model): dit vereist een aparte, expliciete
Product Owner-beslissing (conform Fase 26, "if material privacy or
commercial decision is required: STOP for Product Owner"), inclusief
een concreet bewaartermijn-/verwijderingsmechanisme. Niet in deze
sprint nodig, dus niet gebouwd.

## EXIF (Fase 25)

**Niet van toepassing in deze sprint:** aangezien geen enkele
afbeelding het apparaat verlaat of persistent wordt opgeslagen, is er
geen EXIF-stripping-stap nodig binnen de gebouwde scope. Dit blijft
relevant als toekomstig werk zodra permanente opslag ooit wordt
overwogen.

## Third-party processing (Fase 26)

**Geen derde partij ontvangt beeldmateriaal** in de gebouwde scope
(Tesseract.js client-side, `BarcodeDetector`/ZXing-WASM client-side).
Geen STOP-conditie van toepassing.

## Toegang (Fase 29, herbevestigd)

Geen enkele nieuwe database-tabel of -kolom in deze sprint geeft coach,
gym, team, of andere sporters toegang tot label-scans of afgeleide
productdata buiten wat al via de bestaande, canonical
food/product-zichtbaarheidsregels (Wave 3, ongewijzigd) geldt. Private
nutrition-logs blijven strikt eigenaar-gebonden.
