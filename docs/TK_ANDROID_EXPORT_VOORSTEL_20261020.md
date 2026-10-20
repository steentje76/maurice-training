# Voorstel vervolgfase — Android-export van de versleutelde reddingskopie (20 oktober 2026)

**Status:** voorstel. Niet gebouwd. Het wordt een aparte Draft-PR, niet in de PR van de canonieke vergelijking.

**Aanleiding:** review F2 (#567). In de Capacitor-6-app doet een browserdownload niets; de app weigert nu met uitleg.

## Doel

1. Het versleutelde bestand native opslaan en delen.
2. Aantoonbare opslag buiten de app.
3. Het bestand teruglezen en cryptografisch controleren.
4. Geen schijnsucces bij mislukte opslag.
5. Acceptatie op een fysiek Android-toestel.

## Ontwerp

- **Opslag (keuze voor de eigenaar):**
  - **A — Storage Access Framework (aanbevolen).** Een kleine eigen Capacitor-plugin `TkBestandOpslaan` met `Intent.ACTION_CREATE_DOCUMENT` (mime `application/json`, naam `trainingskompas_lokaal_<datum>.tkbackup`). De gebruiker kiest zelf de locatie: Downloads, Drive of een SD-kaart. Er zijn geen opslagrechten nodig. Het resultaat is een `content://`-URI.
  - **B — `@capacitor/filesystem` + `@capacitor/share`.** Eerst schrijven naar `Directory.Cache`, daarna de share-sheet. Dit bewijst niet dat de gebruiker het bestand echt buiten de app heeft opgeslagen; "gedeeld" is geen opslag.
- **Aantoonbare opslag (bij A):**
  1. De plugin schrijft via `ContentResolver.openOutputStream(uri,"wt")`, met `flush`, `sync` en sluiten.
  2. Daarna leest de plugin het bestand via `openInputStream(uri)` terug en geeft de bytes (base64) aan de webkant.
  3. De webkant vergelijkt byte-voor-byte met de envelop en voert `TKLocalBackup.inspect` uit met de wachtzin, die nog in het geheugen staat en daarna wordt gewist. De authenticatietag, de eigenaar en het aantal items moeten kloppen.
  4. Pas dan meldt de app "opgeslagen en gecontroleerd", met de bestandsnaam en de grootte.
- **Fail-closed:**
  - annuleren, een schrijffout, een leesfout, een byteverschil of een mislukte `inspect` geeft "niet opgeslagen";
  - een half geschreven document wordt via `DocumentsContract.deleteDocument` verwijderd. Alleen het document dat de app zelf net heeft aangemaakt, met toestemming van de gebruiker in dezelfde actie;
  - na een accountwissel tijdens de opslag wordt niets gemeld als gelukt.
- **Herstelpreview op Android:** de bestaande bestandskeuze (`onShowFileChooser`) blijft ongewijzigd. Daarnaast een plugin-methode `TkBestandOpenen` (`ACTION_OPEN_DOCUMENT`) als de WebView-keuze op een toestel faalt.
- **Privacy:**
  - geen bestandsinhoud of wachtzin in logcat of telemetrie;
  - de URI wordt niet bewaard;
  - geen `FLAG_GRANT_PERSISTABLE_URI_PERMISSION`.

## Tests

- **Webkant (node en Chromium):** de plugin wordt nagebootst, met de paden annuleren, schrijffout, leesfout, byteverschil, verkeerde wachtzin, accountwissel en geslaagd. RED/GREEN en mutatietests. Bij elk mislukt pad is er geen succesmelding.
- **Android-instrumentatie (Espresso of UiAutomator):** het SAF-dialoog doorlopen, opslaan naar Downloads, teruglezen en controleren.
- **Fysiek toestel**, zonder bestaande installatie of data te wissen. Er wordt een nieuwe debug-APK naast de bestaande gebouwd, met de signing ongewijzigd en alleen na toestemming:
  - maken → app sluiten → bestand in de Bestanden-app zien → herstelpreview met het bestand → BESTAAT_AL voor alle records.

## Besluiten vooraf (eigenaar)

1. Optie A of B.
2. Een nieuwe APK-build en installatie op een testtoestel.
3. De plaats in de UI: dezelfde knop, met het platform automatisch herkend.

De de-installatiepoort blijft NO-GO.
