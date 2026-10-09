# ADR-ANDROID-SIGNING-001 — Eén stabiele Android-identiteit en een veilige migratie

Status: VOORGESTELD, wacht op PO-besluit (D1–D4). Datum: 9 oktober 2026. Sprint 7, Track A.
Baseline: main `7c33f779712db2cf95d9410bc8b54edee07119ad`, v4.70.23.

## 1. Context en bevindingen

| Onderdeel | Stand (geverifieerd) |
|---|---|
| applicationId / namespace | `com.trainingskompas.app` (`android/app/build.gradle`, `capacitor.config.json`) |
| Versie | versionCode 47023, versionName 4.70.23 (`major*10000 + minor*100 + patch`) |
| Debug-signing | geen eigen configuratie: de Android Gradle Plugin maakt op elke CI-runner een nieuwe `~/.android/debug.keystore` aan |
| Release-signing | `signingConfigs.release` uit `android/keystore.properties` of `TK_KEYSTORE_*`; zonder sleutel ongesigneerd, nooit terugval op debug |
| Workflows | `android-debug-apk.yml` (debug, geen secrets), `quality-gate.yml`; geen workflow gebruikt een signing-secret |
| Keystores in Git | geen (`.gitignore` dekt `android/keystore.properties`, `*.jks`, `*.keystore`) |
| Back-up | `android:allowBackup="false"`: een verwijderde app neemt al zijn lokale data mee |
| Deep links | geen (OAuth keert terug naar de web-origin) |
| GitHub Secrets | niet in te zien vanuit de ontwikkelsessie (API afgeschermd); de workflows verwijzen er niet naar |

Certificaten van de gepubliceerde debug-APK's (uit de APK's zelf):

| Pre-release | Datum | Certificaat SHA-256 (begin…eind) |
|---|---|---|
| `apk-debug-v4.70.7-ee277c920-run35` | 1 okt | `61:73:01:C8 … 3F:86` |
| `apk-debug-v4.70.7-4250ac61a-run39` | 1 okt | `A5:F5:88:2B … 94:E7` |
| `apk-debug-v4.70.22-28b6aef74-run43` | 8 okt | `A9:71:0C:BC … 98:4C` |

Drie builds, drie certificaten. De private sleutels bestonden alleen op de runner en zijn weg.

**HARD GATE.** Een APK kan een geïnstalleerde app alleen bijwerken als hij met hetzelfde certificaat is ondertekend. De enige uitzondering is sleutelrotatie (APK Signature Scheme v3, Android 9+). Daarvoor moet de nieuwe sleutel een lineage hebben die met de OUDE sleutel is ondertekend.

Die oude sleutels bestaan niet meer. Het certificaat van de huidige installatie kan dus **niet** worden hergebruikt, en ook niet worden geroteerd. Elke overstap naar een stabiele identiteit vraagt daarom één keer verwijderen en opnieuw installeren. Dit kan geen code oplossen.

Een mislukte installatiepoging met een ander certificaat is wel veilig. Android weigert de installatie en de bestaande app en zijn data blijven onaangetast.

## 2. Doelen

1. Eén stabiele identiteit voor het dagelijkse toestel, met updates zonder verwijderen.
2. Reproduceerbare CI-builds met herleidbare commit, versie en certificaat.
3. Signingmateriaal alleen in beschermde secrets: nooit in Git, logs of artefacten.
4. Duidelijk onderscheid tussen debug, interne test en productie.
5. Gecontroleerde sleutelrotatie en een herstelprocedure.

## 3. Opties

| | A. Stabiele interne sleutel (sideload) | B. Google Play Internal Testing | C. Huidige werkwijze |
|---|---|---|---|
| Identiteit | eigen sleutel `com.trainingskompas.app`, beheerd door de PO | Play App Signing: Google bewaart de app-signingsleutel, de PO alleen een upload-sleutel | per CI-run nieuw |
| Updates | sideload van elke interne APK, zonder verwijderen | via de Play Store, automatisch | onmogelijk |
| Sleutelverlies | identiteit weg, opnieuw migreren | upload-sleutel resetbaar via Google; app-sleutel kan niet verloren gaan | n.v.t. |
| Lekrisico | sleutel in een GitHub-environment-secret | upload-sleutel in een secret; lek is te herstellen via een reset | geen |
| Kosten en tijd | direct | Play Console-account (eenmalig), store-vermelding, interne review | — |
| Later naar Play | met "eigen app-signingsleutel uploaden" blijft de identiteit; anders een tweede migratie | al op Play | — |

## 4. Besluit (voorstel)

1. **Productie en het dagelijkse toestel: optie B.** Play App Signing met een door Google beheerde app-signingsleutel, distributie via Internal Testing. Dit is de enige route waarin een verloren of gelekte sleutel geen nieuwe migratie veroorzaakt. `PLAY_STORE_READINESS.md` beschrijft de upload-sleutel al. `build.gradle` leest die al uit `TK_KEYSTORE_*`, ongewijzigd.
2. **Tot Play live is, of als Play niet gewenst is: optie A** als overbrugging. Een aparte interne sleutel, alleen voor sideload-builds van de release-variant (niet debuggable), via de nieuwe workflow `android-internal-apk.yml` in de beschermde environment `android-internal`. Gebruik niet de upload-sleutel: één sleutel per doel.
3. **Debug-builds** blijven tijdelijk ondertekend. Ze zijn bedoeld voor een testtoestel en nooit voor het dagelijkse toestel. De workflow legt nu de vingerafdruk vast en meldt dat zo'n APK niet updatebaar is.
4. Het dagelijkse toestel stapt **één keer** over: van de huidige debug-installatie naar A of B, met de migratieprocedure in §6. Als A eerst komt en B later, kan bij B een tweede overstap nodig zijn. Dat is niet nodig als de PO bij het aanmaken van de Play-app de interne sleutel als app-signingsleutel uploadt (D2).

## 5. Wat deze PR wel en niet doet

Wel (geen secrets nodig, gedrag zonder secrets ongewijzigd):
- `android-debug-apk.yml`: publieke certificaatvingerafdruk in de job-samenvatting, het artefact en de release-notes, met de melding "niet updatebaar".
- `android-internal-apk.yml`:
  - `preflight` draait op elke PR die de keten raakt.
  - `pipeline-dryrun` draait op een PR: ongesigneerde release-build, zipalign, apksigner met een wegwerpsleutel en controle van de vingerafdruk, zonder upload.
  - `build-internal` draait alleen handmatig, via de environment `android-internal`. De keystore staat dan alleen in `$RUNNER_TEMP` en wordt altijd verwijderd. De vingerafdruk moet gelijk zijn aan `android/signing/INTERNAL_CERT_SHA256`.
- `android/signing/INTERNAL_CERT_SHA256`: de publieke vingerafdruk. Staat op `NOG_NIET_VASTGESTELD`; zolang dat zo is, bouwt de interne workflow niet.
- `tools/android-signing-preflight.sh` en `tools/android-verify-cert.sh`, met de guard `core/fAndroidSigningFoundation.test.js`.

Niet:
- geen sleutel aangemaakt;
- geen GitHub Secret of environment gewijzigd;
- geen nieuwe applicationId;
- geen wijziging aan `build.gradle` of de app;
- geen Play-upload.

## 6. Migratieprocedure (eenmalig, dagelijkse toestel)

Voorwaarde: de nieuwe APK (A) of de Play-installatie (B) bestaat al en is op een testtoestel of in de webapp gecontroleerd. Doe dit na een training en niet ervoor.

1. Open de huidige app met internet, en wacht tot de oranje melding "… wachtend op sync" verdwenen is. Staat er iets in de wachtrij dat niet verdwijnt? Tik erop en noteer wat er staat. Ga niet verder.
2. Controleer in de huidige app dat er geen open begeleide training is ("Begeleide training opslaan" op Vandaag) en geen niet-afgeronde training.
3. Controleer op trainingskompas.com, met hetzelfde account:
   - je laatste trainingen staan in de historie;
   - je Mijn trainingen (Builder) staan in de lijst;
   - je voeding van vandaag staat er.
   Ontbreekt er iets? Ga niet verder: dat staat alleen nog lokaal.
4. Optioneel: probeer de nieuwe APK eerst over de bestaande te installeren. Android weigert dat met "App niet geïnstalleerd". Dat bevestigt het andere certificaat en is onschadelijk.
5. Verwijder de oude app. Dit wist de lokale data, inclusief de instellingen die alleen op het toestel staan (thema, coachvoorkeuren, laatst gekozen machines).
6. Installeer de nieuwe APK (A) of installeer via Play (B), en log in met hetzelfde account.
7. Controleer:
   - de historie;
   - Mijn trainingen;
   - de voeding van vandaag;
   - Instellingen → Over: de versie.
8. Vanaf nu werkt elke nieuwe interne APK of Play-update als update. De app vraagt nooit meer om te verwijderen. Gebeurt dat toch, dan klopt de ondertekening niet: stop en meld het.

Servergegevens blijven altijd behouden: ze staan in Supabase onder het account, niet in de app. Alleen gegevens die nog niet gesynchroniseerd zijn, lopen risico. Stap 1–3 sluiten dat uit. Vanaf PR B (Sprint 7) toont de wachtrijmelding ook nog niet bevestigde Builder-trainingen.

## 7. Sleutelbeheer, rotatie en herstel

- **Aanmaken (PO, lokaal, offline):**
  `keytool -genkeypair -keystore trainingskompas-internal.jks -alias tk-internal -keyalg RSA -keysize 4096 -validity 10000`
- **Bewaren:** het `.jks`-bestand en de wachtwoorden in een wachtwoordkluis, plus één offline back-up (twee plekken). Nooit in Git, mail of chat.
- **Vastleggen:**
  1. Bepaal de publieke vingerafdruk met `keytool -list -v -keystore … -alias tk-internal`. Gebruik de SHA-256-waarde, zonder dubbele punten en in kleine letters.
  2. Zet die waarde via een reviewbare PR in `android/signing/INTERNAL_CERT_SHA256`.
  3. Maak in GitHub de environment `android-internal` aan, met jezelf als *required reviewer*.
  4. Zet daarin de secrets `TK_INTERNAL_KEYSTORE_B64` (`base64 -w0 trainingskompas-internal.jks`), `TK_INTERNAL_KEYSTORE_PASSWORD`, `TK_INTERNAL_KEY_ALIAS` en `TK_INTERNAL_KEY_PASSWORD`.
- **Rotatie (gepland):**
  1. Maak een nieuwe sleutel.
  2. Maak met `apksigner rotate --out lineage --old-signer … --new-signer …` een lineage. Daarvoor is de oude sleutel nodig.
  3. Teken met v3 en die lineage.
  4. Wijzig `INTERNAL_CERT_SHA256` via een PR.
  Installaties worden dan zonder verwijderen bijgewerkt (Android 9+).
- **Gelekte interne sleutel:** trek de secrets direct in. Een nieuwe sleutel betekent zonder lineage opnieuw migreren (§6). Bij B: laat de upload-sleutel resetten via Play Console. Gebruikers merken niets.
- **Verloren interne sleutel:** opnieuw migreren (§6). Bij B speelt dit niet voor de app-sleutel.

## 8. PO-beslispunten

- **D1.** Route voor het dagelijkse toestel: B (Play Internal Testing, aanbevolen), A (interne sleutel als overbrugging) of A nu en B later.
- **D2.** Als A en later B: de interne sleutel bij Play uploaden als app-signingsleutel (geen tweede migratie, maar de PO blijft verantwoordelijk voor die sleutel), of Google-beheerd (veiliger, één extra migratie).
- **D3.** Toestemming om de sleutel(s) aan te maken en de environment `android-internal` met secrets in te richten. De PO doet dit zelf. Claude maakt geen sleutels aan en wijzigt geen secrets.
- **D4.** Moment van de eenmalige migratie (§6) en of de debug-builds een eigen applicationId-achtervoegsel (`.debug`) krijgen. Met dat achtervoegsel installeert een debug-build naast de echte app, met eigen lokale data. Dat is een nieuwe identiteit naast de bestaande en daarom een apart besluit.
