# Nutrition Camera Capability Reality Audit

Methode: repository-brede grep + live Supabase Storage-check.

| Capability | Status | Bewijs |
|---|---|---|
| Camera-permissies (index.html) | MISSING | 0 treffers voor `getUserMedia`/`MediaDevices` |
| `getUserMedia`/`MediaDevices` | MISSING | 0 treffers |
| `BarcodeDetector`-gebruik | MISSING | 0 treffers |
| `<input capture>` (foto-upload) | MISSING | 0 treffers |
| QR/barcode-library (Quagga/ZXing) | MISSING | geen bestand gevonden |
| OCR-library (Tesseract e.d.) | MISSING | geen bestand gevonden |
| AI-vision-gebruik voor productherkenning | MISSING | geen bestand gevonden |
| Image-compressie/canvas-preprocessing | MISSING | geen bestand gevonden |
| Netlify Function voor image/OCR | MISSING | `netlify/functions/` bevat geen image/ocr/vision-bestand |
| **Supabase Storage buckets** | **MISSING** | live query op `storage.buckets`: **0 buckets bestaan** -- dit wijkt af van een eerdere, oudere aanname (een `exercise-media`-bucket) die niet meer klopt; gecorrigeerd op basis van actueel bewijs |
| EXIF-handling | MISSING | geen bestand gevonden |
| Offline image-handling | MISSING | geen bestand gevonden |
| Observability voor media-flows | MISSING | geen bestaand event-type hiervoor |
| Android-wrapper (Capacitor, bestaand) | EXISTS (algemeen) | `android/`-map bevestigd aanwezig uit eerdere sessies; camera-specifieke code niet onderzocht in deze sprint buiten wat hierboven staat |

## Conclusie

**Alles is MISSING.** Er bestaat geen enkele herbruikbare infrastructuur
voor camera, barcode-detectie, OCR, of image-opslag. Deze sprint bouwt
dus een volledig nieuwe, technische fundament-laag -- geen risico op
duplicatie, want er is niets om te dupliceren.

**Belangrijke, actuele correctie:** eerdere documentatie in dit project
noemde een bestaande `exercise-media`-Supabase-Storage-bucket. Een
live, huidige controle toont **0 storage buckets** in het project. Dit
wordt hier gecorrigeerd op basis van vers bewijs, niet stilzwijgend
overgenomen uit een oudere bron.
