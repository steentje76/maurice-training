# Herstel blocker T3 — herstelpreview kan de eigen Android-export niet selecteren (20 oktober 2026, TK-REL-SEC-34)

**PR:** #571 (Draft), branch `review/claude-android-export-20261020`, basis #569 (`review/claude-restore-canon-20261020`).
**Baseline:** `2e68b8f`, ongewijzigd sinds de vorige oplevering. Er is geen parallel werk op deze branch.

## Root cause

| Stap | Feit (bron) |
|---|---|
| Export | `TkBestandOpslaanPlugin`: `ACTION_CREATE_DOCUMENT`, `setType("application/octet-stream")`. De provider registreert het bestand als `application/octet-stream`: `.tkbackup` is geen bekend type, en ook de MediaStore leidt geen ander type af. |
| Import | `<input type="file" accept=".tkbackup,application/json">` (beide invoeren). |
| WebView → Capacitor | `BridgeWebChromeClient.showFilePicker()` (Capacitor 6.2.1): bij meerdere accept-items of een extensie gaat `getValidTypes()` naar `EXTRA_MIME_TYPES`. `getValidTypes()` zet een extensie om via `MimeTypeMap.getMimeTypeFromExtension()`; geeft die `null` (bij `.tkbackup`), dan **valt het item weg**. |
| Resultaat | `ACTION_GET_CONTENT` met alleen `application/json`. DocumentsUI toont het octet-stream-bestand uitgeschakeld (`enabled=false`), zoals de fysieke test aantoonde. |

`fBackupMimeContract` M1 controleert dat de Capacitor-code nog precies zo werkt, en M2 reproduceert het defect. Op de emulator laat `ImportKiezerSelecteerbaarheidTest` de echte DocumentsUI (`com.google.android.documentsui`) hetzelfde gedrag zien (CI-annotatie `emulator-kiezer`, commit `98e7c5c`):

| API | Oude lijst (`[application/json]`) | Nieuwe lijst (`[application/octet-stream, application/json]`) |
|---|---|---|
| 30 (Android 11) | UITGESCHAKELD: regel en 4 ouders `en=false` | SELECTEERBAAR: `en=true` |
| 34 | UITGESCHAKELD: `en=false` | SELECTEERBAAR: `en=true` |

## Ontwerpkeuze

**Gekozen:** één expliciet contract op beide bestandsinvoeren: `accept=".tkbackup,application/octet-stream,application/json"`. De native export blijft `application/octet-stream`, via de constante `EXPORT_MIME`.

**Onderzocht en afgewezen: export als `application/json`.**
1. Providers (`FileUtils.buildUniqueFile` in de DocumentsProvider van het platform) voegen bij een type dat niet bij de extensie past de standaardextensie toe. Dat geeft `….tkbackup.json`.
2. Reeds gemaakte bestanden (octet-stream, zoals het bestand van 1.322 bytes van 20-10) blijven dan onselecteerbaar, tenzij de import octet-stream toch toelaat.

Octet-stream in de importlijst is dus in beide gevallen nodig. De gekozen oplossing is de kleinste wijziging en ondersteunt zowel oude als nieuwe bestanden.

**Afgewezen: wildcard (`*/*`) of geen accept.** Die is breder dan nodig. M4 eist het exacte contract zonder wildcard.

**Afgewezen: een eigen native importkiezer (`ACTION_OPEN_DOCUMENT`).** Die vraagt meer native code en een tweede bestandsroute naast de WebView-route. Voor dit defect is dat niet nodig.

**Veiligheid.** MIME en extensie keuren niets goed. De bestaande controles blijven verplicht:

- grootte vóór het inlezen (maximaal 24 MB);
- JSON;
- exacte envelop;
- PBKDF2-iteraties;
- AES-GCM-authenticatietag;
- strikte inhoudsvalidatie tegen het bronmanifest;
- eigenaar = ingelogd account;
- accountcontrole na elke asynchrone stap.

M6 en K7 bewijzen dat een geldige kopie met een andere naam of een ander type wordt gelezen, en dat een `.tkbackup` met onzin wordt geweigerd. Er zijn geen nieuwe machtigingen, de browserexport is ongewijzigd en het `.tkbackup`-filter blijft in browsers werken.

**Opdracht C.** Na een export toont de melding een overzicht per bron, zonder inhoud:

- aanwezige bronnen;
- geëxporteerd, met het aantal records volgens het bronmanifest;
- overgeslagen, met reden;
- niet exporteerbaar (toestel/systeem).

De melding zegt er expliciet bij dat herstelbaarheid alleen via de herstelpreview blijkt.

## Gewijzigde bestanden

| Bestand | Wijziging |
|---|---|
| `index.html` | accept-contract op `tk-backup-file` en `tk-restore-file`; `tkBackupOverzicht()` in de exportmeldingen (web en Android) |
| `android/app/src/main/java/com/trainingskompas/app/TkBestandOpslaanPlugin.java` | `EXPORT_MIME`-constante (gedrag ongewijzigd) |
| `android/app/build.gradle` | `androidTestImplementation` uiautomator 2.3.0 (alleen tests) |
| `android/app/src/androidTest/…/ImportKiezerSelecteerbaarheidTest.java` | nieuw: echte DocumentsUI, accept uit de verpakte `index.html`, getValidTypes met de echte MimeTypeMap |
| `core/fBackupMimeContract.test.js` | nieuw |
| `core/fNativeBackupExport.test.js`, `core/fNativeBackupExportChromium.test.js` | N18 en K7 |
| `.github/workflows/tk-android-export-proef.yml` | emulators voor API 30 (Android 11) en API 34; APK-SHA-256, testaantallen, JUnit-faalberichten en kiezerstand als annotatie |
| `tools/ci/run-instrumentation.sh`, `tools/ci/junit-annotaties.py` | nieuw: instrumentatie met log, animaties uit, JUnit-XML → annotaties (CI-logs zijn hier niet leesbaar) |
| `sw.js` | cache v470271 |
| `docs/TK_ANDROID_EXPORT_TESTPROTOCOL_20261020.md` | versie 2: ADB-protocol T1–T12 plus T3b–T3e |

## Tests

| Suite | Resultaat | RED op `2e68b8f` |
|---|---|---|
| `fBackupMimeContract` | 11/11 | 5 (M3 2×, M4 2×, M5) |
| `fNativeBackupExport` | 41/41 | — (N18 nieuw) |
| `fNativeBackupExportChromium` | 11/11 | — (K7 nieuw) |
| `fRestorePreview`, `fRestorePreviewCanon`, `fLocalBackupReview`, `fLocalEncryptedBackup` | groen | — |
| Volledige core-suite (Node 20) | 491/491 | — |
| `ImportKiezerSelecteerbaarheidTest` (2) + `ContentBestemmingInstrumentedTest` (2), emulator API 30 en 34 | 4/4 per API (`98e7c5c`) | oude lijst = reproductie (moet niet-selecteerbaar zijn) |
| `TkExportSessieTest` (JUnit, CI) | 16/16 | — |
| Quality Gate, Real Chromium Browser Acceptance | groen | — |

Verloop in CI: de eerste emulatorruns faalden op de test zelf, niet op de app. API 30 startte niet door de animatie-instelling van de emulator-actie; daarna gaf DocumentsUI tijdens hertekenen een `StaleObjectException` bij het klikken. Opgelost met eigen animatie-instelling (`|| true`) en klikken met opnieuw zoeken. In één tussenliggende run slaagde API 34 al vóór die fix; de stand werd pas daarna gelogd.

Mutaties: 7/7 gedood (oude accept op elk van beide invoeren, wildcard, exporttype json, overzichtstelling, niet-exporteerbaar, inhoud in het overzicht).

## Restrisico's

1. Kiezers van fabrikanten (Samsung "Mijn bestanden" als standaardkiezer) kunnen anders filteren dan AOSP DocumentsUI. Daarom staat T3 op de fysieke A70 als verplicht bewijs.
2. Een bestand dat door een cloudprovider een ander MIME-type krijgt (bijv. `text/plain`), blijft onselecteerbaar. Te herstellen door de contractlijst uit te breiden, niet door een wildcard.
3. De lopende training (`actieve_training`) wordt geëxporteerd, maar is NIET_ONDERSTEUND voor herstel (by design).
4. De emulatortest maakt het bestand via MediaStore Downloads met type octet-stream, niet via het opslagdialoog van de app. Het fysieke pad export → kiezer → preview blijft dus alleen bewijsbaar op het toestel (T1–T3).
5. DocumentsUI-teksten ("Show roots", "Downloads") zijn Engels op de emulator; de test is daarvoor geen bewijs voor een Nederlandstalig toestel.
