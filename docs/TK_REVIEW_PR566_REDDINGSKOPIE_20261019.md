# Onafhankelijke beveiligingsacceptatie PR #566 — versleutelde lokale reddingskopie (19 oktober 2026)

**Beoordeeld:** `32f30cc` (`core/localBackup.js`, `core/fLocalEncryptedBackup*.test.js`, de export- en controlefuncties in `index.html`, het bronmanifest van fase 3).

**Methode:** de code is gelezen, en er zijn nieuwe negatieve tests geschreven (`core/fLocalBackupReview.test.js`, TK-REL-SEC-30). Eerdere groene tests telden niet als bewijs. Op `32f30cc` faalden 23 van de 32 checks.

**Oordeel over #566 zoals ingediend:** **NO-GO.** Er waren twee blockers. Door de eerste kwam het belangrijkste lokale gegeven (de offline-wachtrij) nooit in de kopie, terwijl de UI succes meldde. Door de tweede maakte de Android-app geen bestand, terwijl hij succes meldde. Beide zijn hersteld op een eigen Draft-PR (zie §3).

## 1. Bevindingen

| # | Ernst | Bevinding | Bewijs (RED op `32f30cc`) | Herstel |
|---|---|---|---|---|
| F1 | **Blocker** | `prepare()` verwachtte wachtrij-items als `{id, owner_uid, item:{…}}`. De echte store `maurice_offline/queue` bewaart platte records (`offlineQueueAdd`: `{…item, ts, owner_uid}`). Elk echt wachtrij-item werd daardoor als `invalid_queue_item` overgeslagen, en de unit-tests gebruikten de niet-bestaande vorm. | R12; Chromium met een echt IndexedDB-item: `entries` < 3 | De platte records worden gelezen; de inhoud is het record zonder `id`, `ts` en `owner_uid`. |
| F2 | **Blocker** | Android (Capacitor 6): `downloadFile()` gebruikt `<a download>` met een blob-URL. `BridgeActivity` en `BridgeWebViewClient` hebben geen `DownloadListener`, dus in de APK gebeurt niets. Toch meldde de UI "Versleutelde deelkopie aangeboden". | R2; Chromium-check met `Capacitor.isNativePlatform()` | De app weigert met uitleg en wist de wachtzin; er is geen schijnsucces meer. Voor echt opslaan is een native route nodig (zie §4). |
| F3 | P1 | De wachtrij werd gelezen via `offlineQueueAll()`, en die maskeert een IndexedDB-fout als `[]`. De controle `Array.isArray` was daardoor nooit onwaar, zodat niet-verstuurde writes stil konden ontbreken. | R1; Chromium met `getAll` dat faalt | Strikt lezen via `tkLeesWachtrijStrikt()`; bij een fout wordt geen kopie gemaakt. |
| F4 | P1 | PBKDF2-SHA256 gebruikte 210.000 iteraties, onder de OWASP-aanbeveling van 2023 (600.000). | R3 | Nieuwe bestanden gebruiken 600.000. v1-bestanden (210.000) blijven leesbaar; elke andere waarde wordt geweigerd vóór de sleutelafleiding, zodat een gemanipuleerd getal geen rekenbom kan zijn. |
| F5 | P1 | Resource-uitputting: de envelop tot 100.000.000 tekens werd eerst gedecodeerd en daarna afgeleid. Een bestand tot 100 MB werd volledig ingelezen. Onbekende envelopvelden werden geaccepteerd. | R4 (40 MB-envelop ging door tot de sleutelafleiding) | Bestand maximaal 24 MB, gecontroleerd vóór het inlezen. Ciphertext maximaal 16 MB, gecontroleerd vóór het decoderen. Exact de bekende envelopvelden; strikte base64. |
| F6 | P1 | De validatie na ontsleutelen was minimaal. Een geldig versleuteld bestand met een lege eigenaar, onbekende bron, bron die niet bij de sleutel past, enorme sleutel, waarde van het verkeerde type, 25.000 items of ongeldige `omissions` of datum werd geaccepteerd. | R5: 10 varianten | Strikte `valideer()`, met sleutel en bron gecontroleerd tegen het manifest. Dezelfde validatie geldt vóór het versleutelen. |
| F7 | P2 | Getrouwheid: geheimvelden werden stil weggelaten en waarden stil genormaliseerd, zonder markering. Een sleutel `__proto__` in gebruikersdata ging verloren, omdat het object gewone prototypes gebruikte. | R6 | Per item worden `redacted` en `normalized` gemarkeerd; objecten zonder prototype. |
| F8 | P2 | Accountisolatie: een wachtrij-item met een filter `user_id=eq.<ander>` kwam wel in de kopie. | R7 | Filters worden gecontroleerd. |
| F9 | P2 | Geheimhouding: `calendar_feed_tokens.token_hash`, `apikey` en `cookie` kwamen in de kopie. | R11 | Credential-tabellen worden overgeslagen en de lijst met geheimvelden is uitgebreid. |
| F10 | P3 | Een onbekende opslagbron werd geteld maar was niet herkenbaar. | R8 | Er komt een vingerafdruk van de sleutelnaam in de kopie, nooit de inhoud. |
| F11 | P3 | Bij een controle zonder bestand bleef de wachtzin in het veld staan. | R9 | Gewist op elk pad. |

## 2. Wat in orde was

- AES-256-GCM met een 12-byte IV en 16-byte salt uit `crypto.getRandomValues`.
- AAD gebonden aan het formaat; een gewijzigde salt, IV of ciphertext faalt op de authenticatietag.
- De sessie (`tk_auth_session`) werd niet geëxporteerd; de wachtzin werd niet opgeslagen.
- Eigenaarscontrole via de cache-eigenaar en het suffix.
- Een accountwissel tijdens het versleutelen gaf geen download (R10 groen op `32f30cc`).
- Geen logging, telemetrie of netwerkverkeer met inhoud of wachtzin.
- Android: `crypto.subtle` is beschikbaar (`androidScheme: https` is een veilige context). Bestandskeuze werkt via `BridgeWebChromeClient.onShowFileChooser`.

## 3. Herstel-PR

Branch `review/claude-backup-review-20261019`, gestapeld op #566.

| Test | Resultaat |
|---|---|
| `fLocalBackupReview` (nieuw) | 36/36; 23 RED op #566 |
| `fLocalEncryptedBackup` (wachtrijvorm gecorrigeerd naar de echte store) | 18/18 |
| `fLocalEncryptedBackupChromium` (echte IndexedDB-wachtrij, IndexedDB-fout, native app, iteraties) | 11/11 |
| Volledige core-suite | groen |

Mutatietests: 27 mutaties, 26 gedood. B5 is equivalent: `atob` decodeert niet-canonieke base64 naar dezelfde bytes, en elke niet-decodeerbare invoer faalt al.

## 4. Resterende risico's

1. **Android-opslag.** Een echte kopie op Android vraagt een native route: `@capacitor/filesystem` met een share-sheet, of een eigen plugin met de Storage Access Framework. Daarvoor is een nieuwe APK nodig. Tot dan is de reddingskopie op Android niet beschikbaar.
2. **Wachtzin.** Er is geen sterktemeting buiten de minimale lengte van 12. De wachtzin is niet te herstellen.
3. **Onvolledigheid.** De kopie blijft altijd onvolledig (`complete:false`): sessionStorage, toestelinstellingen en gegevens van andere gebruikers vallen erbuiten.
4. **Geen fysieke toesteltest.**
