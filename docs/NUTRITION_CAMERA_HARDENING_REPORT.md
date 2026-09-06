# Nutrition UX — Real Device Camera Hardening Report

Voortzetting op PR #240, branch `ux/nutrition-approved-v1`.

## BASELINE (vóór wijziging)

- main SHA: `d5c10c120773a0db5df4819cecfaf70d7623f2b1`
- PR #240 HEAD vóór wijziging: `db5c49ea503991d51b3ee81ae1a1d7be10da179c`
- Quality Gate vóór wijziging: `success` (onafhankelijk herbevestigd)
- PR-status: OPEN, mergeable, niet gemergd

## FORENSISCHE ROOT CAUSE

| Stap | Requested | Actual/derived | Kwaliteitsrisico | Bewijs |
|---|---|---|---|---|
| Camera stream | `{video:{facingMode:'environment'}}` -- **geen enkele resolutie-constraint** | Browser-eigen default (op veel Android Chrome-devices vaak laag, richting 640x480 zonder expliciete `ideal`-waarden) | **Hoog** -- root cause | `index.html`, `voedingCapturePhoto()`, vóór deze fix |
| Video element | `videoWidth`/`videoHeight` = ongewijzigde streamresolutie | Zelfde, lage resolutie als de stream | Volgt direct uit bovenstaande | idem |
| Capture | `canvas.drawImage(video,0,0)` -- puur videoframe, geen `ImageCapture.takePhoto()` | Canvas-afmeting = videoresolutie (geen extra downscale in deze stap zelf) | Middel -- geen extra verlies hier, maar ook geen gebruik van een eventueel hogere still-capture-resolutie | idem |
| Canvas | `canvas.width=video.videoWidth` | Idem aan stream | Volgt uit stream-resolutie | idem |
| Compressie | `toDataURL('image/jpeg',0.85)` | JPEG, kwaliteit 0.85 | Laag -- 0.85 is een redelijke kwaliteit, geen dominante factor | idem |
| OCR preprocessing | geen | Tesseract.js ontvangt de dataURL direct | n.v.t. -- geen aparte resize/preprocessing-stap gevonden die extra verlies toevoegt | `core/nutritionOcrRuntime.js`, ongewijzigd |
| OCR input | dezelfde, lage resolutie als de capture | idem | **Directe consequentie van de root cause** | idem |

**Geclassificeerde root cause:** het ontbreken van expliciete `ideal`-resolutie-constraints bij `getUserMedia()` in `voedingCapturePhoto()`. Dit is een reëel, bewezen risico -- niet aangenomen: de eerder, apart gebouwde barcode-scanner-functie (`voedingStartScanner()`) had wél al `width:{ideal:1280}, height:{ideal:720}` (inconsistent met de foto-capture-functie), wat bevestigt dat dit een missende instelling was, geen fundamentele beperking.

**Progressive enhancement (`ImageCapture.takePhoto()`) is NIET toegevoegd** in deze pass -- de ondersteuning hiervoor is inconsistent tussen browsers/Android-versies, en de bewezen, kleinste fix (hogere `ideal`-constraints + stabilisatiewachttijd + een harde kwaliteitspoort) pakt de bevestigde root cause al aan zonder deze aanvullende complexiteit. Dit blijft een mogelijke, toekomstige verbetering, niet toegepast omdat de opdracht vraagt om de **kleinste bewezen fix**.

## WIJZIGING

### `index.html` -- `voedingCapturePhoto()`

- **Wat:** `getUserMedia({video:{facingMode:'environment', width:{ideal:1920}, height:{ideal:1080}}})` (was: geen resolutie-constraint). Een `setTimeout(...,400)`-stabilisatiewachttijd vóór de daadwerkelijke capture. JPEG-kwaliteit verhoogd naar 0.9 (was 0.85).
- **Waarom:** direct gevolg van de forensische root-cause-analyse hierboven.
- **Waarom kleinste bewezen fix:** uitsluitend `ideal` (geen `exact`), dus veilig degraderend op elk device dat de gevraagde resolutie niet haalt -- geen enkele bestaande functionaliteit kan hierdoor breken.

### `core/nutritionImageQualityGate.js` (nieuw)

- **Wat:** een pure, deterministische sharpness-metriek (Laplaciaanse variantie) + eenvoudige exposure-detectie (gemiddelde luminantie), gecombineerd tot een expliciete PASS/FAIL-beslissing.
- **Waarom:** Fase 4 vereist een echte, deterministische kwaliteitspoort vóór OCR -- geen AI-beoordeling.
- **Validatie, niet aangenomen:** de drempelwaarde (variantie >= 15) is getest tegen een echt, progressief vervaagd testpatroon (box-blur met toenemende radius). **Eerlijke, gedocumenteerde beperking:** dit is een heuristiek die evidente, zware onscherpte afvangt (bij een blur-radius van 5 pixels op een 50x50-testpatroon: score 4.5, terecht FAIL); een matige onscherpte (radius 3: score 164) blijft binnen de PASS-drempel. Dit wordt niet overclaimd als een perfecte detector.

### `voedingCapturePhoto()` -- integratie van de quality gate

- **Wat:** na de capture wordt de canvas-pixeldata omgezet naar grijswaarden en door `NutritionImageQualityGate.evaluateImageQuality()` gehaald. Bij `FAIL_BLUR`/`FAIL_TOO_DARK`/`FAIL_TOO_BRIGHT` wordt de foto **niet geaccepteerd** -- een in-app waarschuwing verschijnt (geen `alert()`), de camera blijft actief voor een nieuwe poging.
- **Waarom kleinste bewezen fix:** geen nieuwe navigatie-flow nodig, uitsluitend een extra controle vóór de bestaande acceptatie-stap.

### Overige, kleine fixes uit dezelfde opdracht

- **Supplement-dosering-placeholder** (`voeding-supp-dose`): `placeholder="5"` -> `placeholder="Hoeveelheid"`. Geen vooraf ingevulde/gesuggereerde dosering meer.
- **Foto-etiket-copy**: "Voor voedingswaarden en ingrediënten." -> "Voor voedingswaarden en productinformatie." -- geen functionele ingrediënten-ondersteuning bevestigd in de huidige Nutrition-schema's/services, dus geen impliciete claim meer.

## IMAGE QUALITY GATE (samenvatting)

- **Gebruikte metrics:** Laplaciaanse-variantie (sharpness), gemiddelde luminantie (exposure).
- **Thresholds:** sharpness >= 15 (variantie); exposure tussen 25 en 235 (0-255-schaal).
- **Fallback:** bij een `UNKNOWN`-resultaat (bv. te kleine afbeelding) wordt de foto wél geaccepteerd -- de poort blokkeert alleen bij een positief bewezen probleem, nooit bij onzekerheid over de meting zelf.
- **Beperkingen:** vangt uitsluitend evidente, zware blur/onder-/overbelichting. Matige onscherpte, glare/reflectie, en gedeeltelijke bijsnijding worden in deze pass **niet** gedetecteerd (expliciet buiten scope van de kleinste, bewezen fix).

## REGRESSIES (herbevestigd)

- **Supplement default:** leeg, geregressietest (`fVoedingUXSetB.test.js`).
- **Dialogs:** nog steeds 0 `alert`/`prompt`/`confirm` in de volledige Nutrition UX (hertest, ongewijzigd).
- **Portion:** de bestaande 25g-flow (product -> hoeveelheid -> maaltijd -> toevoegen) blijft ongewijzigd; geregressietest bevestigt dat de Portion Engine nog steeds hergebruikt wordt, geen UI-side berekening.
- **Barcode:** het aparte scannerscherm (vorige sprint) blijft ongewijzigd en functioneel.
- **OCR fallback:** de "Geen gegevens herkend" -> handmatige invoer-flow (vorige sprint) blijft ongewijzigd.
- **UNKNOWN-semantiek:** ongewijzigd, blijft null bij ontbrekende waarden.

## TESTRESULTATEN (exact)

- `nutritionImageQualityGate.test.js` (nieuw): 10/10
- `fVoedingUXSetB.test.js` (uitgebreid): 24/24 (was 17, +7 nieuwe, gerichte tests voor deze fixes)
- `fVoedingUXSetA.test.js`: 10/10 (ongewijzigd)
- `fVoedingBarcodeScanner.test.js`: 13/13 (ongewijzigd)
- Release gate: 264/264 (was 262, +2 nieuwe testbestanden -- correctie: zie exacte CI-log)
- Android: 29/29
- Security: 16/16
- HYROX forensic regressie: 386/386
- Doc consistency: schoon

## BUILD

PASS -- `npm run build:www` succesvol, `core/nutritionImageQualityGate.js` correct meegenomen in `www/core/`.

## ANDROID

PASS -- 29/29.

## SECURITY

PASS -- 16/16, geen wijziging aan RLS/policies in deze pass.

## REAL DEVICE STATUS (exact, geen overclaim)

```
Android camera permission:                     VALIDATED (eerder, door PO, fysiek bevestigd)
Android preview/capture technisch:              VALIDATED (eerder, door PO, fysiek bevestigd)
camera image quality:                           SOFTWARE HARDENING TOEGEPAST -- NOG NIET
                                                 OPNIEUW FYSIEK GEVALIDEERD
successful physical-device barcode decode:      OPEN (niet apart, opnieuw fysiek bewezen deze pass)
barcode failure state:                          TESTED (browser/software)
OCR physical-device reliability:                OPEN -- softwarematige verbetering toegepast,
                                                 fysieke betrouwbaarheid vereist nieuwe telefoontest
manual correction:                              aanwezig (ongewijzigd)
25 g portion flow:                              VALIDATED in eerdere, fysieke opname (ongewijzigd,
                                                 niet opnieuw fysiek getest deze pass)
complete photo -> reliable OCR -> product ->
25 g -> meal -> persisted totals:               OPEN
```

**Expliciet, conform instructie:** camera image quality wordt NIET als "VALIDATED" bestempeld op basis van deze sessie (browser/emulator/CI-bewijs alleen). Uitsluitend de Product Owner kan dit sluiten na een nieuwe, fysieke telefoontest.

## REAL-DEVICE TESTPAKKET VOOR PRODUCT OWNER

**Test A -- voedingswaardetabel-foto**
1. Open "Foto etiket".
2. Geef cameratoestemming.
3. Maak een foto van een kleine voedingswaardetabel.
4. Controleer of de preview scherp oogt.
5. Ga door naar "Gegevens herkennen".
6. Controleer of de herkende waarden overeenkomen met het etiket.

**Test B -- bewust slechte foto**
1. Maak een bewust bewogen/onscherpe foto van een etiket.
2. **Verwacht:** "Foto niet scherp genoeg" verschijnt direct na de klik, camera blijft actief, geen stille doorgang naar OCR.

**Test C -- OCR-failure**
1. Fotografeer iets zonder leesbare voedingswaarden (bv. een egale achtergrond).
2. **Verwacht:** "Geen gegevens herkend" met "Opnieuw fotograferen" en "Gegevens handmatig invoeren".

**Test D -- volledige keten**
1. Foto -> kwaliteit PASS -> OCR -> gegevens controleren/corrigeren -> product -> "25 g" -> "Ontbijt" -> toevoegen.
2. Sluit de app / open opnieuw -> controleer of de maaltijd en de hoeveelheid bewaard zijn gebleven.

**Test E -- supplement**
1. Open "Supplement toevoegen".
2. **Verwacht:** het hoeveelheid-veld is leeg, geen vooraf ingevulde "5".

## MERGE

**NIET UITGEVOERD.** PR #240 blijft open, geen merge.
