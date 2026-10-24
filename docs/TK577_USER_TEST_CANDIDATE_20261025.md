# TK577 — Android-gebruikerstestkandidaat 25 oktober 2026

Opdracht: #577. Bronregistratie: #576, 24 oktober 2026. PR: #578.
Basis: `160fefc2e1dabc424922e907f7dc360e4f84543f`, main v4.70.25.
Kandidaat: v4.70.26; geen productievrijgave. #570/#575 en hun stacked keten zijn niet overgenomen.

## Bevindingen en resterende acceptatie

| TK-UT-20261024 | Code / bewijs | Status vóór fysieke hertest |
|---|---|---|
| 001 | Settings overschreef de bestaande header-safe-area met 14px. Hersteld naar minimaal 52px plus eventuele inset. Chromium op 320/360/390/430px. | CODE FIXED, DEVICE NOT VERIFIED |
| 002 | Alternatievenpicker kon eindigen op een lege lijst en stond onder de kaarten. Scroll naar vervangpaneel en bestaande bibliotheekpicker toegevoegd. Brondefinitie blijft intact; nieuwe oefening krijgt eigen historie; dubbele id wordt afgewezen. Verschillende trainingstypen worden niet stil geconverteerd. | CODE FIXED, DEVICE NOT VERIFIED; cross-type vervanging DEFERRED |
| 003 | Content werd tussen afbeelding, doel en vier actieknoppen tot een smalle flexkolom gedrukt. Grid met eigen contentkolom, aparte doel- en actieregels, 44px-acties. | CODE FIXED, DEVICE NOT VERIFIED |
| 004 | UI toonde generiek PM5 en een BLE-adressuffix. Nu volledig 9-cijferig serial uit een geldige PM5-naam (label Bluetooth-naam), en serial van CE060012 na verbinden. Geen id uit een suffix verzonnen; onbekend blijft zichtbaar. | CODE FIXED, DEVICE NOT VERIFIED; nickname/address-rotation-koppeling DEFERRED |
| 005 | De aangehaalde RowErg-melding kwam van een **naamhint**, niet een bevestigde machineclassificatie. Tekst gecorrigeerd naar onzekerheid; device-info UUID voor type was fout (0015=manufacturer, 0016=type). Nu read-only uitlezen en strikt decoderen van bekende 1-byte enumwaarden. Geen automatische oefening-/loggingconversie. | CODE FIXED, DEVICE NOT VERIFIED |
| 006 | `startIntervalExecution()` start de bestaande app-intervalengine. Bestaande CSAFE-code ondersteunt elders een gecontroleerd continu protocol; deze 6×60/60-knop is geen device-programmering. UI expliciet app-only. | DEFERRED voor PM5-programmering; communicatie hersteld |
| 007 | Reproduceerbare codebreuk: `getExerciseMuscles()` sloeg catalogus-only ids over. Exact-ID catalogusfallback toegevoegd. Synthetisch: 4×8×60 → sessions-row → JSON-readback → bestaande CalcCore → gelijke relevante waarden Home/Inzicht. Geen nieuwe formule of mapping. Werkelijke exercise_id, bronrij, timing en vóórmeting van de gemelde Good Morning zijn niet ingezien. | PARTIAL; oorspronkelijke melding NOT REPRODUCED, blijft open |
| 008 | Echte oninput-handler eerst rood: 67,5→500, 77,5→500, 0,5→5, 67.5→500. Clamp normaliseerde elk tussenliggend separator-teken weg. Clamp nu op change, rauwe editable warm-upstate tijdens invoer, directe autosave van geldige numerieke input, zichtbare invalid-state. | CODE FIXED, DEVICE NOT VERIFIED |
| 009 | Een recentere lege sessions-rij kon de relevante previous-performance verbergen; fallback naar bestaande `loadPrevPerformance`/`CalcCore.selectStrengthBasis`. Geen fuzzy exercise-id matching of nieuwe gewichtregel. Werkelijke oefeningnaam/id uit melding onbekend. | PARTIAL; gereproduceerde lege-rijbreuk hersteld, oorspronkelijke melding NOT REPRODUCED |
| 010 | Filters namen vrijwel alle toetsenbordruimte in; eerste modal werd bij Back gesloten. Filters inklapbaar, compacte resultaten bij <600px visual viewport; picker volgt hoogte/offset en wordt als bovenste laag gesloten. Callback en viewportlistener op sluiten opgeruimd. | CODE FIXED, DEVICE NOT VERIFIED |

Deze tabel sluit #576 niet. Synthetische/browser- en emulatorproeven bewijzen geen fysieke Samsung-IME of echte PM5-werking. Definitieve bouw-SHA, CI-runs en APK-checksum worden in het PR/issue-aflevercommentaar vastgelegd.

## Reproduceerbare controles

- `node core/fTk577InputRecovery.test.js`: echte appfuncties; separators, correcties, invalid-state, catalogus-id en opslag→Calculation→Home/Inzicht.
- `node core/fTk577Concept2Identity.test.js`: officiële UUID’s, bekende/onbekende enum, exacte serial, onzekere naamhint, stale verbinding verworpen.
- `node scripts/tk577-browser-acceptance.cjs`: echt Chromium, 320/360/390/430px, 130% previewtekst, lokale draft-readback, lege recentere historie, gewijzigde oefening door de bestaande execution-adapter naar sessions-row, keyboard-height viewport en Back.
- `.github/workflows/tk577-user-test-apk.yml`: volledige release-gate, native/coaching-regressie, geïsoleerde APK, pakket/label/signature/OCR-provenance en Android WebView-proeven op emulator API30/34. Alleen groen als werkelijk uitgevoerd; geen stille skip voor nieuwe browser-/deviceproeven.
- De documentatiecheck heeft **vier reeds bestaande fouten op de baseline** (mastersprintmetadata/validation/auditguard). Nieuwe check vergelijkt foutregels en exitstatus met de exacte baseline; bestaande fouten worden expliciet gemeld. Geen wijziging aan roadmap-evidence om een gate cosmetisch groen te maken.

## Afzonderlijke code- en securitycontrole

Geen database-, policy-, auth-, server-write- of protected calculation/decision-corewijziging. `CORE_SIG` blijft inhoudelijk gelijk; SW-caches en APP_VER worden naar 4.70.26 bijgewerkt. Geen historische records gecorrigeerd of verwijderd.

Gericht hergebruik uit PR #542 / `feat/set-logging-ux-20261018` (`8c91598dc753038e932b438b5dca8080fe105273`): uitsluitend het `logSet`-blok dat bestaande setvlaggen behoudt. Nieuwe regressie eerst rood: een gewichtsedit wiste `done`, `isAmrap` en `rest_sec`; na overname blijven ze bestaan. De overige branchwijzigingen zijn niet automatisch overgenomen.

Nieuwe warm-up draft-tekst wordt bij her-renderen HTML-geëscapet. PM5-ID is alleen displayinformatie, geen autorisatiebewijs; geen nieuwe telemetry/persistence van hardware-identifiers. Device-info leest onder id+generation-lease; laat antwoord kan niet aan een volgende verbinding worden gekoppeld. Picker-callback bewaakt eigenaar en slot; selectie maakt geen voltooid trainingsrecord.

Deze sessie heeft één uitvoerend model. Een afzonderlijke reviewpass, schone checkout, geautomatiseerde tegenproeven en GitHub CI vervangen **geen onafhankelijke tweede reviewer**. Die reviewgate en fysieke productacceptatie blijven open; daarom geen main-merge of productie-update op basis van deze kandidaat alleen.

## Installatie- en accountgrens

Pakket: `com.trainingskompas.app.gebruikerstest20261025`; label: **TK Test 25 oktober**. De testvariant registreert geen wearable-OAuth-return en kan die van de bestaande app niet onderscheppen. Bestaande app niet verwijderen; geen gegevens wissen; geen backup-import of datamigratie. De kandidaat gebruikt eigen lokale opslag, maar bij inloggen dezelfde backend. Daarom **uitsluitend een synthetisch testaccount**, geen eigen account met bestaande trainingshistorie zolang owner-binding, server read-after-write, offlinequeue, export/restore en installatie/signinggates niet volledig zijn geaccepteerd. De losse #570/#575-gates zijn niet stilzwijgend gesloten.

## Officiële Concept2-bron, gecontroleerd 24 oktober 2026

Via [Software Development](https://www.concept2.com/support/software-development) geraadpleegd:
[PM CSAFE Communication Definition](https://cms.concept2.com/sites/default/files/2026-03/Concept2%20PM%20CSAFE%20Communication%20Definition.pdf), device-info tabel (PDF p14/15), Appendix A machine-type enum (p101/102), GAP Device Name (p13). De PDF heeft inconsistent afgedrukte revisiekoppen (voorblad noemt 0.34, paginakop 0.31); verwijzing daarom met concrete tabel/pagina. Serial 0012, hardware 0013, firmware 0014, manufacturer 0015, machine type 0016. Geen propriëtaire ErgData-code gekopieerd of gegokte protocolbytes gebruikt.
