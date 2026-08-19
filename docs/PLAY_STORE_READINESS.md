# PLAY_STORE_READINESS.md

**Datum** 19 augustus 2026 · **Versie** v4.48.0 · **Doel** Google Play — Internal Testing

Legenda: 🟢 klaar · 🟡 klaar maar verificatie nodig · 🔵 eigenaarsinvoer vereist · 🔴 blokkerend

---

## 1. Vermeldingsgegevens

| Veld | Waarde | Status |
|---|---|---|
| App-naam | **Trainingskompas** | 🟢 `strings.xml`, `manifest.json` |
| Applicatie-ID | `com.trainingskompas.app` | 🟢 `capacitor.config.json`, `build.gradle` |
| versionName | `4.48.0` | 🟢 gelijk aan `APP_VER` in de app |
| versionCode | `44800` | 🟢 schema `major*10000 + minor*100 + patch` |
| Ontwikkelaar | SteenSoft | 🟢 vermeld in het scherm Help |
| Standaardtaal | Nederlands (nl-NL) | 🟢 |
| Categorie | Gezondheid en fitness | 🟢 volgt uit `manifest.json` (`health, fitness, sports`) |
| Prijs | Gratis | 🔵 bevestigen in de Console |
| Landen | 🔵 | Bepaal zelf; voor Internal Testing niet relevant |

### Korte omschrijving (max. 80 tekens)

```
Je persoonlijke trainingslogboek met uitleg: wat je doet, en waarom het werkt.
```
(77 tekens.)

### Volledige omschrijving

```
Trainingskompas is een trainingslogboek en coach voor sporters die willen begrijpen
waarom iets werkt — niet alleen dat het werkt.

WAT DE APP DOET
• Trainingen maken, plannen en uitvoeren: kracht, cardio, WOD, kettlebell en carry.
• Sets, herhalingen, gewicht en RPE loggen tijdens de training, ook zonder internet.
• Werkgewichten, geschatte 1RM, volume en herstel per spiergroep berekenen.
• Je ochtend-check-in (slaap, gevoel, HRV) meewegen in het advies van vandaag.
• Verbanden vinden in je eigen gegevens: wat gaat bij jou samen met een goede dag?

WAAROM, NIET ALLEEN WAT
Elk advies is terug te lezen. Bij een uitgevoerde oefening zie je precies welke waarden
zijn gemeten, wat daaruit is berekend, welke regel de beslissing nam en welke versie van
die regel dat deed. De AI-coach legt uit en prioriteert, maar rekent nooit zelf en
verzint geen cijfers.

JOUW EIGEN GEGEVENS
Verbanden worden uitsluitend in je eigen historie gezocht. Er wordt niets met andere
gebruikers vergeleken en er worden geen uitspraken over oorzaak en gevolg gedaan. Is er
te weinig data, dan zegt de app dat — in plaats van een getal te tonen dat niets betekent.

OFFLINE
Trainen in een kelder zonder bereik werkt gewoon. Alles wat je logt wordt lokaal bewaard
en synchroniseert automatisch zodra je weer verbinding hebt.

OPTIONEEL
• Fitbit via Google Health voor HRV, rusthartslag en slaap.
• Concept2 PM5 via Bluetooth voor roei- en bike-data.
Beide zijn optioneel; de app werkt volledig zonder.

Trainingskompas geeft trainingsadvies, geen medisch advies.
```

🔵 Doorlezen en akkoord geven vóór publicatie.

---

## 2. Grafisch materiaal

| Middel | Eis | Status |
|---|---|---|
| App-icoon | 512 × 512 PNG, 32-bits | 🟢 `icon-512.png` — in RC0 ook doorgevoerd naar alle Android-mipmaps |
| Feature graphic | 1024 × 500 PNG/JPG | 🔵 nog te maken |
| Telefoon-screenshots | Minimaal 2, max. 8; 16:9 of 9:16, min. 320 px | 🔵 vereist een draaiende app op een toestel |
| Tablet-screenshots | Optioneel | ⚪ |

**Aanbevolen screenshots** (dekken de kernlus): Home met de dag van vandaag · Training in
uitvoering met een set-invoer · Sessiesamenvatting na afronden · Logboek met 'ⓘ Waarom' open ·
Verbanden-overzicht · Lichaam/herstel.

---

## 3. Datavragenlijst (Data safety) — voorbereid

Dit is geverifieerd tegen het schema en de code, niet geschat.

| Gegevenstype | Verzameld | Gedeeld | Verplicht | Doel | Versleuteld onderweg | Verwijderbaar |
|---|---|---|---|---|---|---|
| E-mailadres | Ja | Nee | Ja | Accountbeheer | Ja | Ja |
| Naam | Ja | Nee | Nee | App-functionaliteit | Ja | Ja |
| Leeftijd, geslacht, lengte | Ja | Nee | Nee | Berekeningen en advies | Ja | Ja |
| Gezondheid en fitness (HRV, rusthartslag, slaap, gewicht, lichaamssamenstelling) | Ja | Nee | Nee | App-functionaliteit, personalisatie | Ja | Ja |
| Trainingsgegevens (sessies, sets, gewicht, RPE) | Ja | Nee | Nee | App-functionaliteit | Ja | Ja |
| Door de gebruiker vastgelegde aandachtspunten/condities | Ja | Nee | Nee | App-functionaliteit | Ja | Ja |
| Berichten in de app (coachgesprekken) | Ja | **Ja — alleen met toestemming** | Nee | App-functionaliteit | Ja | Ja |
| Locatie | **Nee** | — | — | — | — | — |
| Contacten, agenda, foto's, bestanden, financiële gegevens | **Nee** | — | — | — | — | — |
| Crashlogs / diagnostiek | **Nee** | — | — | — | — | — |
| Advertentie-identificatoren | **Nee** | — | — | — | — | — |

**Toelichting bij "gedeeld":** met toestemming van de gebruiker gaat coachcontext naar
Anthropic om het advies te formuleren. Dat is de enige gegevensstroom naar buiten, hij is
uitschakelbaar, en hij loopt server-side (`netlify/functions/coach.js`) — nooit rechtstreeks
vanuit het toestel.

**Accountverwijdering:** vereist door Play. Aanwezig in de app (Profiel → Account verwijderen)
en server-side afgedwongen via `netlify/functions/delete-account.js`. In RC0 uitgebreid tot
alle 34 tabellen met gebruikersgegevens, inclusief de OAuth-tokens van de wearable-koppeling.
🔵 In de Console moet daarnaast een **webadres voor accountverwijdering** worden opgegeven.

---

## 4. Rechten en waarom ze er zijn

| Recht | Reden | Zichtbaar voor de gebruiker |
|---|---|---|
| `INTERNET` | Synchronisatie met de database en de coach | Nee (normaal recht) |
| `BLUETOOTH_SCAN` (met `neverForLocation`) | Concept2 PM5 zoeken | Ja, alleen bij het koppelen |
| `BLUETOOTH_CONNECT` | Verbinden met de PM5 | Ja, alleen bij het koppelen |
| `BLUETOOTH`, `BLUETOOTH_ADMIN` (`maxSdkVersion=30`) | Legacy-BLE op Android 11 en ouder | Nee |
| `ACCESS_FINE_LOCATION` (`maxSdkVersion=30`) | Op Android ≤ 11 verplicht om te mogen BLE-scannen — **niet** voor locatie | Ja, alleen op oude toestellen |

`bluetooth_le` staat op `required="false"`: de app is in de kern een trainingslogboek en mag
het toestelbereik niet op BLE-hardware filteren.

---

## 5. Technische eisen

| Eis | Waarde | Status |
|---|---|---|
| Target API level | 36 (Android 16) | 🟡 Vereist sinds 31-08-2026. Configuratie staat goed, **verificatiebuild nodig** |
| Compile SDK | 36 | 🟡 idem |
| Min SDK | 22 (Android 5.1) | 🟢 Bewust laag gehouden |
| 64-bits | Ja | 🟢 Geen native code buiten Capacitor en de BLE-plug-in |
| Artefact | Android App Bundle (`.aab`) | 🟢 `./gradlew bundleRelease` |
| Omvang basismodule | ~14 MB web-assets | 🟢 Was 450 MB; video's worden nu on-demand opgehaald |
| Ondertekening | Upload-keystore | 🔵 Configuratie klaar, sleutel is eigenaarsinvoer |
| Debugbare build | Nee | 🟢 De release-buildtype valt bewust niet terug op de debug-sleutel |
| Productie-endpoints | Supabase `mhfxhzkdmgkaplicdszg`, Netlify Functions | 🟢 Geen test- of localhost-endpoints in de code |
| Secrets in de app | Geen | 🟢 Alleen de publishable key; service-role en OAuth-secrets staan uitsluitend server-side |

---

## 6. Verificatie vereist — waarom de build hier niet gemaakt kon worden

De bouwomgeving van deze sprint heeft **geen Android SDK** en kan `dl.google.com` en
`repo1.maven.org` niet bereiken (de proxy antwoordt met 403). Een AAB bouwen was dus
onmogelijk. De configuratie is wel volledig releasegereed gemaakt.

```bash
# Eenmalig: upload-sleutel aanmaken (JDK 17+)
keytool -genkeypair -v \
  -keystore ~/trainingskompas-upload.jks \
  -alias trainingskompas \
  -keyalg RSA -keysize 4096 -validity 10000

cp android/keystore.properties.voorbeeld android/keystore.properties
# vul storeFile, storePassword, keyAlias en keyPassword in
# (android/keystore.properties staat in .gitignore — nooit committen)

npm install
npm run cap:sync
cd android && ./gradlew clean bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab
```

**Controleer bij die eerste build specifiek:**

1. **Compileert het tegen API 36?** AGP is naar 8.9.1 gebracht en de Gradle-wrapper naar
   8.11.1. Klaagt Capacitor 6 over `minCompileSdk`, dan is een upgrade naar een nieuwere
   Capacitor-major de volgende stap — die is bewust *niet* blind doorgevoerd, omdat hij niet
   te verifiëren was en zowel `@capacitor/android` als `@capacitor-community/bluetooth-le`
   in hetzelfde tempo moet meebewegen.
2. **Terugveeg.** Vanaf een diep scherm terug: gaat de app een scherm terug in plaats van af
   te sluiten? Op Home: verschijnt "Nog een keer terug om te sluiten", en sluit de tweede
   veeg binnen 2,5 s de app wél af?
3. **Edge-to-edge.** Android 16 dwingt dit af bij targetSdk 35+. Staat de koptekst vrij van
   de statusbalk en de onderbalk vrij van de systeemnavigatie? `viewport-fit=cover` en de
   `max()`-marge op `.hdr` zijn hiervoor toegevoegd.
4. **Video's.** Open een oefening met een techniekvideo. Die komt nu van het web en wordt
   daarna lokaal gecachet — de eerste keer moet er dus verbinding zijn.
5. **Ondertekening.** `bundleRelease` mag geen regel loggen die begint met
   `[Trainingskompas] Geen keystore gevonden`.

---

## 7. Ondertekening

- Gebruik **Play App Signing** (aanbevolen): je uploadt met de upload-sleutel, Google beheert
  de distributiesleutel.
- Bewaar `trainingskompas-upload.jks` en de wachtwoorden buiten de repository én maak er een
  back-up van. Raak je de upload-sleutel kwijt, dan is een reset via Google nodig voordat je
  opnieuw kunt uploaden.
- `android/keystore.properties`, `*.jks` en `*.keystore` staan in `.gitignore`. In CI kun je
  in plaats daarvan `TK_KEYSTORE_FILE`, `TK_KEYSTORE_PASSWORD`, `TK_KEY_ALIAS` en
  `TK_KEY_PASSWORD` zetten.

---

## 8. Content rating

Vragenlijst in de Console. Op basis van de inhoud: geen geweld, geen seksuele inhoud, geen
gokken, geen gebruikersinteractie tussen onbekenden (delen gebeurt alleen binnen een gym die
je zelf koppelt), geen aankopen in de app. Verwachte uitkomst: **PEGI 3 / Iedereen**.
🔵 De vragenlijst zelf moet de eigenaar invullen.

---

## 9. Handmatige smoke-testmatrix

Uit te voeren op een toestel met de release-build, vóór de eerste interne test.

| # | Scenario | Verwacht |
|---|---|---|
| 1 | **Nieuwe gebruiker** — installeren, account maken | Intake verschijnt, profiel wordt opgeslagen, dashboard is leeg maar niet stuk |
| 2 | **Bestaande gebruiker, nieuw toestel** | Intake wordt overgeslagen (profiel staat in de database), historie verschijnt |
| 3 | **Tweede account op hetzelfde toestel** | Intake verschijnt opnieuw; géén data, doelen of coachvoorkeuren van de vorige gebruiker |
| 4 | **Geen data** | Elk scherm toont een lege staat, geen foutmelding, geen eeuwige laadindicator |
| 5 | **Echte data** | Logboek, voortgang, verbanden en coach tonen consistente cijfers |
| 6 | **Volledige kernlus** | Training kiezen → starten → sets loggen → afronden → verschijnt in het logboek → 'ⓘ Waarom' toont het bewijsspoor |
| 7 | **Offline trainen** | Vliegtuigmodus aan, training uitvoeren en afronden: alles blijft zichtbaar, badge toont wachtrij |
| 8 | **Weer online** | Wachtrij loopt leeg, melding verschijnt, **geen dubbele rijen** in het logboek |
| 9 | **App sluiten tijdens een training** | Opnieuw openen → hervatten aangeboden → afronden → sessie is compleet en de instance staat op `completed` |
| 10 | **Verlopen sessie** | Uren in de achtergrond, dan terug: gegevens komen terug (niet leeg), of er verschijnt een duidelijke inlogvraag |
| 11 | **Uitloggen / inloggen** | Geen resten van het vorige account |
| 12 | **Mislukt verzoek** | Duidelijke melding, geen stille mislukking |
| 13 | **Traag verzoek** | Scherm blokkeert niet; timeouts vallen terug op een lege staat |
| 14 | **Donkere modus** | Alle schermen leesbaar, voldoende contrast |
| 15 | **Klein scherm (≤ 360 dp)** | Geen overlappende of afgekapte tekst |
| 16 | **Terugknop en terugveeg** | Zie §6, punt 2 |
| 17 | **Toetsenbord** | Invoervelden blijven zichtbaar boven het toetsenbord |
| 18 | **Verwijderen en opnieuw installeren** | Verse installatie, inloggen herstelt alle gegevens uit de database |
| 19 | **Updaten over een bestaande installatie** | Geen gegevensverlies, geen migratiefout |
| 20 | **Account verwijderen** | Account weg, opnieuw inloggen onmogelijk, wearable-koppeling verbroken |

---

## 10. Openstaande punten voor de eigenaar

| # | Punt | Waarom niet autonoom |
|---|---|---|
| 1 | Play Console-account en app aanmelden | Financieel en juridisch |
| 2 | Upload-keystore aanmaken en veiligstellen | Onomkeerbare sleutelbeslissing |
| 3 | Verificatiebuild van de API 36-configuratie | Geen Android SDK in deze omgeving |
| 4 | Screenshots en feature graphic | Vereist een draaiende app |
| 5 | Supportadres (`SUPPORT_EMAIL` in `index.html` + Console) | Productbeslissing |
| 6 | Webadres voor accountverwijdering in de Console | Productbeslissing |
| 7 | Juridische toets van `privacy.html` | Juridisch |
| 8 | `auth_leaked_password_protection` aanzetten in Supabase | Instelling buiten de repository |
| 9 | Datavragenlijst en content rating invullen | Console; volledig voorbereid in §3 en §8 |
