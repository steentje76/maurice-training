# Android native export van de versleutelde reddingskopie (20 oktober 2026, TK-REL-SEC-33)

Branch `review/claude-android-export-20261020`, gestapeld op Draft-PR #569 (`adaf1e4`).

**Besluiten:**
- D1: eigen SAF-plugin;
- D2: alleen een geïsoleerde debug-APK;
- D3: de bestaande knop kiest zelf de route.

Er is niets gemerged, niets in productie aangepast, de database is niet gewijzigd en er is niets gemigreerd. Niets is op een fysiek toestel geïnstalleerd.

## Wat is gebouwd

| Onderdeel | Bestand |
|---|---|
| Native kern, zonder Android-afhankelijkheden: begrensd schrijven, sync, volledig teruglezen, grootte + SHA-256, verwijderen bij elke fout | `android/app/src/main/java/com/trainingskompas/app/export/TkExportSessie.java` |
| ContentResolver-bestemming: `openFileDescriptor("wt")`, `FileDescriptor.sync()`, `openInputStream`, `DocumentsContract.deleteDocument` | `…/export/ContentBestemming.java` |
| Capacitor 6-plugin `TkBestandOpslaan`: `ACTION_CREATE_DOCUMENT`, `CATEGORY_OPENABLE`, `EXTRA_TITLE`; methoden `start`, `schrijf`, `voltooi`, `afbreken`, `afronden`. Geregistreerd vóór `super.onCreate` | `…/TkBestandOpslaanPlugin.java`, `MainActivity.java` |
| JavaScript-bridge: delen van ≤ 256 KiB, eigen SHA-256 via WebCrypto, eigenaarscontrole vóór, tijdens en na, controle van de native uitkomst | `core/nativeBackupExport.js` |
| Integratie in de bestaande knop | `index.html` (`tkMaakVersleuteldeLokaleBackup`) |
| Geïsoleerde testvariant | `android/app/build.gradle`, buildType `exportproef` |
| CI: native unit tests, exportproef-APK, isolatiecontroles, emulator-instrumentatie | `.github/workflows/tk-android-export-proef.yml` |

**De knop kiest zelf de route:**
- web: ongewijzigde browserdownload;
- Android met plugin: SAF-export;
- Android zonder plugin (oudere APK): weigeren met uitleg, zonder schijnsucces.

**De bestaande lagen worden hergebruikt:**
- `TKLocalBackup` (prepare, encrypt, inspect);
- de wachtzincontrole;
- het bronmanifest;
- de strikte wachtrijlezing.

Er is geen encryptie in Java. De herstelpreview uit #568/#569 leest het bestand.

## Veiligheidscontract

| Status | Wanneer | Melding |
|---|---|---|
| `VERIFIED_READBACK` | geschreven, gesynchroniseerd, gesloten, volledig teruggelezen; grootte en SHA-256 gelijk, native én in de webcontrole; eigenaar ongewijzigd | "Versleutelde kopie weggeschreven en teruggelezen." + bestandsnaam + "Dit is nog geen garantie dat een cloudopslag (zoals Google Drive) het bestand al volledig heeft gesynchroniseerd." |
| `CANCELLED` | geen locatie gekozen | "Opslaan geannuleerd. Er is geen kopie gemaakt." |
| `WRITE_FAILED` | openen, schrijven (ook opslag vol), sluiten, sync, bridge, te groot, ongeldige invoer | "Opslaan mislukt…" (bij `opslag_vol`: "onvoldoende opslagruimte") |
| `READ_FAILED` | teruglezen mislukt | "…kon na het schrijven niet worden teruggelezen…" |
| `MISMATCH` | grootte of SHA-256 wijkt af (native of in de webcontrole) | "…wijkt af van wat geschreven is…" |
| `ACCOUNT_CHANGED` | ander account vóór de start, tussen delen of na terugkomst | "Er is intussen een ander account ingelogd; de kopie is afgebroken." |

- Bij elke niet-geslaagde uitkomst met een aangemaakt document wordt dat document verwijderd. De melding zegt of dat lukte; zo niet: "verwijder het zelf en gebruik het niet als back-up".
- Een onderbroken export (app gestopt) laat de markering `tk_export_bezig` achter, met alleen de naam en het tijdstip. De volgende keer verschijnt de waarschuwing dat dat bestand onvolledig kan zijn.
- Een gedeeltelijk bestand is bovendien nooit als kopie bruikbaar: de authenticatietag en de JSON-structuur falen, en de herstelpreview weigert het.
- Alleen de versleutelde envelop gaat over de bridge: ASCII, beginnend met de formaatmarker. De native kern weigert al het andere.
- Geen logging, geen SharedPreferences en geen app-opslag van inhoud.
- Geen algemene opslagrechten; in CI gecontroleerd op de gebouwde APK.

## Tests

| Suite | Resultaat | RED op `adaf1e4` |
|---|---|---|
| `TkExportSessieTest` (JUnit, native kern; lokaal met JDK 21 en een minimale JUnit-shim, in CI met Gradle) | 17/17 | klasse bestaat niet |
| `fNativeBackupExport` (echt exportblok + module, nep-plugin met het native contract) | 38/38 | N0 RED; met de module meegekopieerd 22 RED (UI weigert nog) |
| `fNativeBackupExportChromium` (echte UI, IndexedDB, WebCrypto; preview opent het bestand) | 7/7 | `TKNativeExport is not defined` |
| `fLocalEncryptedBackupChromium` (scenario "native zonder plugin" aangepast aan het nieuwe gedrag) | 11/11 | — |
| `ContentBestemmingInstrumentedTest` (emulator, echte ContentResolver, 2 MB + afwijking) | in CI | — |
| Volledige core-suite (Node 20) | groen | — |

Plugin en kern zijn lokaal type-gecontroleerd tegen minimale Android- en Capacitor-stubs. De echte compilatie gebeurt in CI.

**Dekking van de verplichte scenario's:**

| Scenario | Test |
|---|---|
| Geslaagde opslag | N1, K2, JUnit `geslaagd` |
| Annuleren | N2 |
| Schrijffout | N3, JUnit |
| Leesfout | N4, JUnit |
| Verschil | N5 (native en webcontrole), JUnit |
| Opslag vol | N6, JUnit `opslagVol` |
| Onderbreking | N7 |
| Accountwissel | N8 (vóór, tijdens, na) |
| Bridge-fout | N9 |
| Zelfde naam | N10 |
| Groot binnen en boven de grens | N11 (20 MB in 80 delen; 24 MB + 1 geweigerd), JUnit-grenzen |
| Geen plaintext in logs of native opslag | N12, K1, JUnit |
| Webexport | N13 |
| Herstelpreview | N14, K3 |

**Mutatietests:**
- JavaScript: 21/21 gedood.
- Java: 17 mutaties, 15 gedood. V2 en V3 zijn equivalent: de SHA-256-vergelijking na het teruglezen vangt hetzelfde af als de weggehaalde grootte- en schrijfcontrole.

## Debug-APK

- Buildtype `exportproef`:
  - `applicationIdSuffix ".exportproef"`, dus `com.trainingskompas.app.exportproef`;
  - `versionNameSuffix "-exportproef"`;
  - debug-ondertekening.
- Daardoor kan deze APK de bestaande app niet overschrijven en heeft hij eigen lokale opslag.
- De bestaande `applicationId`, de debug- en release-buildtypes en de productie-signing zijn ongewijzigd.
- De APK wordt in CI gebouwd en als artefact `trainingskompas-exportproef-apk` geüpload, met SHA-256 en commit. Lokaal kan dat niet: geen Android SDK, en `dl.google.com` en Maven zijn geblokkeerd.

## Resterende Android-specifieke risico's

1. **Providers.** Google Drive en sommige fabrikant-providers schrijven via een lokale cache en synchroniseren later. VERIFIED_READBACK bewijst de lokale kopie bij de provider, niet de cloud.
2. **`DocumentsContract.deleteDocument`** wordt niet door elke provider ondersteund. Dan wordt "kon niet worden verwijderd" gemeld.
3. **Procesdood tijdens het SAF-dialoog** (geheugendruk). Capacitor bewaart de call niet altijd; dan is er geen resultaat en geen succes. Het eventueel aangemaakte lege document blijft staan; de waarschuwing volgt bij de volgende export.
4. **Mime `application/octet-stream`**: sommige providers tonen geen extensie. De naam wordt via `DISPLAY_NAME` gemeld.
5. **Bestandsgrootte**: maximaal 24 MB (de grens van de kopie). Ruim voldoende voor localStorage plus de wachtrij, maar niet gemeten op een echt toestel met veel wachtrij-items.
6. **De `exportproef`-variant** gebruikt `matchingFallbacks` naar debug voor de Capacitor-modules; dat moet in CI bewezen zijn.
7. **Geen fysieke toesteltest uitgevoerd**; zie het protocol.

## GO / NO-GO

| Onderdeel | Oordeel |
|---|---|
| Code-integratie (webkant, JS-bridge, native kern) | CONDITIONAL GO: na groene CI inclusief de Android-workflow en jouw review |
| Android-release | NO-GO tot het protocol op een fysiek toestel is doorlopen |
| De-installatie | NO-GO |

Testprotocol: `docs/TK_ANDROID_EXPORT_TESTPROTOCOL_20261020.md`.
