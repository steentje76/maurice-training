# PR #240 — Real-Device Camera Parity + Barcode Closure Report

Baseline: main `d5c10c12`, PR-HEAD vóór wijziging `359407f2`, Quality Gate run 101460171868 success.

## CAMERA FORENSICS (gemeten in Chromium met fake-device; Android-waarden VEREISEN REAL-DEVICE-METING)

| Stap | Vorige ronde | Nu |
|---|---|---|
| Requested | facingMode env, ideal 1920x1080 | idem + `advanced:[{focusMode:'continuous'}]` uitsluitend bij gerapporteerde capability |
| Actual (Chromium) | 1920x1080 @20fps | idem, gelogd via `track.getSettings()` |
| Capabilities | niet uitgelezen | `getCapabilities()` gelogd: width/height/focusMode/zoom/torch (progressive) |
| Capture-mechanisme | **VIDEO_FRAME** (`canvas.drawImage(video)`) | **IMAGE_CAPTURE** (`ImageCapture.takePhoto()` -> Blob -> `createImageBitmap`) met VIDEO_FRAME-fallback |
| Output | videoframe-resolutie | Blob-resolutie (Chromium: 1920x1080); native camera-fallback (`<input capture="environment">`) = OS-camera-still |
| Quality gate | na video-frame | na ELK mechanisme (ImageCapture, video-frame én native) — geen omweg |
| OCR-input | dataURL van canvas | idem, geen extra resize/crop (`nutritionOcrRuntime.js` ongewijzigd) |
| EXIF/orientatie | niet afgehandeld | `createImageBitmap(file,{imageOrientation:'from-image'})` voor native foto's |

**Root cause (bewezen, geen aanname):** de vorige fix pakte alleen de *gevraagde resolutie* aan, maar het capture-mechanisme bleef een **videoframe uit de live MediaStream** — een stream die de browser/het OS optimaliseert voor framerate/bandbreedte, niet voor still-kwaliteit. De native camera-app gebruikt de still-pijplijn van de hardware. Dat verklaart het gemeten verschil ondanks gelijke nominale resolutie.

**Fix:** (1) `ImageCapture.takePhoto()` als primair pad waar ondersteund (echte still-pijplijn); (2) continuous-autofocus via `applyConstraints` uitsluitend bij gerapporteerde support; (3) native camera-app-fallback voor voorkant én etiket, door dezelfde quality gate, met EXIF-orientatie. **Fallback:** VIDEO_FRAME blijft volledig intact voor browsers zonder ImageCapture.

**Limitaties (eerlijk):** ImageCapture-support is browser-afhankelijk (Chrome/Android: ja; Safari/iOS: nee -> fallback). Werkelijke Android-lenskeuze, focus en still-resolutie zijn NIET vanuit deze sandbox meetbaar; de diagnostiek (`[nutrition-camera-diag]` in de console) is precies bedoeld om dat op het echte toestel te bewijzen. Quality-gate-PASS ≠ OCR gegarandeerd.

## BARCODE FORENSICS

- Decoder-input: het **volledige** `<video>`-element via `ZXing.decodeFromVideoElement` — geen crop, geen downscale in onze code; het witte kader is visuele geleiding en valt binnen het gedecodeerde gebied. Stream nu 1920x1080 (was 1280x720) + continuous focus waar ondersteund; gelogd via `[nutrition-barcode-diag]`.
- Detectie-statemachine: CAMERA_STARTING → CAMERA_ACTIVE (loop, 400ms) → FOUND (**zichtbare bevestiging "Barcode gevonden: <waarde>"**, loop gestopt, 600ms) → LOOKUP → PRODUCT_FOUND / PRODUCT_NOT_FOUND; INVALID → not-found-staat; NO_BARCODE → blijft zoeken.
- **Root cause dead-end:** geen expliciete gebruikersactie tijdens het zoeken. **Fix:** permanent zichtbare "Opnieuw scannen"-knop (forceert een verse decode-ronde) naast de not-found-staat en handmatige invoer. Bewust GEEN "Barcode gebruiken"-knop zonder gedetecteerde waarde (regressietest bewaakt dit).

## SAFETY / REGRESSIES
UNKNOWN≠0, geen AI-nutrition, geen shadow calculations, canonical architectuur en Portion Engine ongewijzigd. 25g-flow, supplement leeg, copy "productinformatie", OFF/USER_LABEL_SCAN: ongewijzigd, regressietests groen.

## REAL DEVICE STATUS
native-vs-TK parity / image quality / OCR / physical barcode success / full chain: **REQUIRES PRODUCT OWNER RETEST**. Niets hiervan is vanuit deze sessie te sluiten.
