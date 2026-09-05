# Nutrition Camera Capture — Technology Assessment

Methode: gericht, actueel webonderzoek (september 2026).

## A/B. Barcode-herkenning (live + uit foto)

### Kandidaat 1: native `BarcodeDetector` API

| Criterium | Bevinding |
|---|---|
| Ondersteuning Android/Chrome | Werkt op Chrome/Chromium Android (sinds versie 83) en **Android WebView** -- relevant, want de Trainingskompas-Android-app is Capacitor-gebaseerd (WebView) |
| Ondersteuning desktop | Chrome/Edge: alleen macOS/ChromeOS, niet Windows/Linux |
| Ondersteuning iOS/Safari | **Geen ondersteuning** |
| Ondersteuning Firefox | Geen ondersteuning (alle platforms) |
| Formaten | EAN-8, EAN-13, UPC-A, en meer (Code128, QR, etc.) |
| Kosten | Gratis, browser-native |
| Privacy | Volledig on-device, geen netwerkverkeer |
| Vendor lock-in | Geen (open web-standaard, WICG Shape Detection API) |

### Kandidaat 2: ZXing-gebaseerde polyfill/WASM (bv. zxing-wasm)

| Criterium | Bevinding |
|---|---|
| Ondersteuning | Werkt in elke moderne browser met WebAssembly-ondersteuning (dus ook iOS Safari, Firefox, desktop) |
| Kosten | Gratis, open-source |
| Privacy | On-device |
| Nadeel | Groter bundle-formaat dan de native API, iets tragere detectie dan platform-native |

**Aanbeveling:** `auto`-strategie -- gebruik de native `BarcodeDetector`
waar beschikbaar (met name Android/WebView, de primaire Trainingskompas-
omgeving), val terug op een ZXing-WASM-polyfill waar de native API
ontbreekt (iOS/desktop-browsers). Geen enkele optie vereist een betaalde
dienst of stuurt beeldmateriaal naar een derde partij.

## C/D. Voedingsetiket-OCR + gestructureerde extractie

### Kandidaat: Tesseract.js

| Criterium | Bevinding |
|---|---|
| Licentie | Open-source (Tesseract-engine, Apache-achtige voorwaarden), gratis |
| Uitvoering | **Volledig client-side (browser/WebAssembly)** -- geen enkel beeld verlaat het apparaat |
| Kosten | Gratis, geen API-key, geen betaalmuur |
| Talen | 100+ talen ondersteund, inclusief Nederlands en Engels |
| Nauwkeurigheid | **Bekende, expliciet gedocumenteerde beperking:** nauwkeurigheid daalt merkbaar bij scheve, lage-resolutie, of meerkoloms-lay-outs -- precies het soort lay-out dat een voedingswaardetabel vaak heeft |
| Snelheid | Praktisch bruikbaar (bv. ~800ms voor een HD-frame op een moderne laptop, uit een onafhankelijke bron) |

**Geen betaalde/derde-partij vision-API vereist.** Conform de expliciete
instructie ("STOP if a paid or contract-bound OCR service is materially
required") is dit **geen hard-stop-situatie** -- Tesseract.js is gratis,
on-device, en voldoende voor een eerste, technische fundament-laag.

**Eerlijke beperking, expliciet erkend:** de bekende nauwkeurigheids-
beperking bij meerkoloms-tabellen betekent dat de kwaliteit van
automatische extractie op echte, fysieke etiketten **niet gegarandeerd
hoog** is zonder verdere, latere verfijning (bv. een gerichter
tabel-detectie-model). Dit is een reden om de output altijd als
`USER_LABEL_SCAN`-bronobservatie te behandelen die door de gebruiker
bevestigd moet worden, nooit als automatisch geverifieerd.

## Conclusie

Geen enkele technologie in deze assessment vereist een betaalde dienst,
een commercieel contract, of het verzenden van beeldmateriaal naar een
derde partij. **Geen HARD STOP van toepassing.** Beide kandidaten
(barcode + OCR) zijn client-side, gratis, en privacy-vriendelijk van
aard -- consistent met de privacy-architectuur (Fase 3/24) die stelt dat
een foto na verwerking niet standaard bewaard hoeft te worden.

**Niet in deze sprint geïmplementeerd (bewust):** de daadwerkelijke
integratie van deze libraries in `index.html` (bundling, laadstrategie,
UI-koppeling) -- dat vereist een concrete build-stap-beslissing die
buiten de "geen UX-redesign"-scope van deze wave valt. Deze sprint
bouwt de pure, technologie-onafhankelijke contractlaag (structured
result-formaten, parsing/veiligheidslogica) waar zo'n integratie later
tegenaan kan praten.
