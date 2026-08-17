# Concept2 PM5 — Native Android BLE (concept2_native.v1)

Native Capacitor-shell die de bestaande Trainingskompas-web-app wrapt en een
**echte** Concept2 PM5 BLE-koppeling levert via `NativeConcept2BleTransport`,
gebouwd tegen het bestaande `window.TKDeviceTransport`-contract. Geen fake
verbinding, geen gegokte byte-layouts, geen tweede logging-systeem.

## Architectuur

```
Concept2 PM5
   └─ BLE
      └─ @capacitor-community/bluetooth-le  (bewezen plugin — alleen transport)
         └─ CapacitorBleGateway             (native/src/capacitorBleGateway.js)
            └─ NativeConcept2BleTransport    (native/src/nativeConcept2BleTransport.js — platform-onafhankelijk)
               └─ window.TKDeviceTransport
                  └─ core/concept2Live.js    (normalizeLiveMetric — canonical, ONGEWIJZIGD)
                     └─ bestaande Training-UI + liveWorkoutToActual (sessions/ACTUAL)
```

De plugin doet **uitsluitend** transport (scan/connect/notify/read). Alle
Concept2-UUID's, capture-mode en byte-parsers wonen in de adapter/core. De
web-laag (`concept2Live.js`) blijft platformonafhankelijk en ongewijzigd.

## Waarom deze opzet de web-app niet raakt

De repo-`index.html`, `sw.js` en `core/*.js` worden **niet** gewijzigd. `build:www`
kopieert de web-assets naar `www/`, bundelt de native laag tot
`www/native-transport.js` en injecteert de `<script>`-tag **alleen** in de
`www/`-kopie. Gevolg: geen service-worker-bump, geen CORE_SIG-impact, Netlify-web
ongewijzigd. Op web/PWA registreert de bootstrap niets (Capacitor niet native) →
de bestaande eerlijke melding "live koppeling in de app-versie" blijft staan.

## Bestanden

Toegevoegd (allemaal nieuw, additief):
- `package.json` — Capacitor + BLE-plugin + esbuild + scripts
- `capacitor.config.json` — appId `com.trainingskompas.app`, `webDir: www`
- `.gitignore` — `node_modules/`, `www/`, android-buildoutput, `*.apk`, capture-exports
- `scripts/build-www.mjs` — assembleert `www/` + bundelt native-transport + injecteert script-tag
- `native/src/nativeConcept2BleTransport.js` — de adapter (UMD, platform-onafhankelijk, in node getest)
- `native/src/capacitorBleGateway.js` — BleClient → BleGateway-binding (ESM)
- `native/src/bootstrap.js` — native entry; registreert `window.TKDeviceTransport`
- `native/nativeConcept2BleTransport.test.js` — 51 asserts, node, zonder fysiek PM5
- `native/android/AndroidManifest.additions.xml` — BLE-permissies (referentie; al toegepast in het meegeleverde `android/`)
- `android/` — het door Capacitor GEGENEREERDE native project, mét BLE-permissies in `android/app/src/main/AndroidManifest.xml` en de BLE-plugin in de Gradle-config.

## Build-status (deze sprint)

- Android-project: **GEGENEREERD** met `npx cap add android` (Capacitor 6, AGP 8.2.1, Gradle-wrapper 8.2.1). BLE-plugin `@capacitor-community/bluetooth-le@6.1.0` gedetecteerd en in `capacitor.settings.gradle` + `app/capacitor.build.gradle` opgenomen. `native-transport.js` + web-assets staan in `android/app/src/main/assets/public/`.
- BLE-permissies: **TOEGEPAST** in de gegenereerde manifest.
- APK: **NOT BUILT in deze cloud-omgeving — EXTERN BLOCKED.** Reden: (1) de netwerk-allowlist blokkeert `services.gradle.org` (proxy `HTTP 403`) én Google Maven (`dl.google.com`/`maven.google.com`) voor AGP/AndroidX; (2) er is geen Android SDK in de container (`ANDROID_HOME` leeg, geen `sdkmanager`). Dit is een omgevingslimiet, geen projectfout.

## Bouwstappen (lokaal — jij hebt Android SDK/Gradle/JDK)

Het `android/`-project is al gegenereerd en de permissies staan er al in. Lokaal:

```bash
npm install
npm run cap:sync                    # build:www (vult www/ uit JOUW repo) + cap copy android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

`cap:sync` ververst de web-assets in het android-project vanuit je volledige repo
(inclusief manifest.json/icons/videos die in de cloud-werkkopie ontbraken).
`cap copy` overschrijft de AndroidManifest.xml NIET → de BLE-permissies blijven staan.
`npx cap open android` opent Android Studio voor signing/release.

> Let op JDK: de wrapper is Gradle 8.2.1 (ondersteunt JDK ≤ 20). Bouw met JDK 17
> (aanbevolen voor AGP 8.2), of upgrade de Gradle-wrapper naar 8.5+ voor JDK 21.

`npx cap open android` opent Android Studio voor signing/release. De web-code
werkt ongewijzigd; alleen `www/native-transport.js` voegt de BLE-transportlaag toe.

## Permission-flow (geen popup bij app-start)

```
Training → RowErg → [🔗 Apparaat koppelen] → permissie-check → (indien nodig) OS-dialoog → BLE-scan
```

`@capacitor-community/bluetooth-le` vraagt de runtime BLE-permissie bij de eerste
`requestLEScan` (dus bij [Apparaat koppelen]), niet bij app-start. Android 12+:
`BLUETOOTH_SCAN` (neverForLocation) + `BLUETOOTH_CONNECT`. Android ≤11: legacy
`BLUETOOTH`/`BLUETOOTH_ADMIN` + `ACCESS_FINE_LOCATION`.

## Discovery / connection

Scan gefilterd op de CE060 PM-service-UUID's uit `Concept2Live.CONCEPT2_BLE_UUIDS`.
Discovery levert echte devices `{id, name, machineType:'unknown', rssi}` — géén
hardcoded PM5 1/2/3, géén fake device. `machineType` is pre-connect bewust
`'unknown'` (de erg-machine-type-characteristic `0x0015` heeft een niet-bevestigde
byte-layout); de UI bevestigt/mismatcht via `Concept2Live.machineMatchesExercise`.
`connect()` maakt een echte BLE-verbinding; de UI toont `connected` uitsluitend
na een echte verbinding.

## Capture-mode (kern van deze sprint)

Zolang de byte-layouts UNKNOWN zijn, worden notificaties **niet** als metric
geïnterpreteerd. In plaats daarvan legt een expliciet in te schakelen capture-mode
de ruwe payloads vast voor validatie:

```js
window.TKDeviceCapture.enableCapture();
// … verbind met PM5, roei een korte sessie …
const json = window.TKDeviceCapture.exportCapture();
// records: [{ uuid, t(ms), len, hex }]  — deviceId gemaskeerd, GEEN health/PII
```

Elk record koppelt characteristic-UUID + timestamp + ruwe bytes (hex). Geen
health-waarden, geen PII, geen productie-logging. Gebruik deze capture om de
payload-layouts te bevestigen tegen de **officiële Concept2 PM5 Bluetooth-spec**
en registreer daarna pas een decoder:

```js
window.TKDeviceTransport.registerDecoder(
  'CE060035-43E5-11E4-916C-0800200C9A66',
  (dv) => ({ distanceM: /* uit spec */, elapsedTimeS: /*…*/, strokeRateSPM: /*…*/ }),
  'CONFIRMED'
);
```

Pas met een `CONFIRMED` decoder emit de adapter RAW metrics → `subscribeMetrics`
→ `Concept2Live.normalizeLiveMetric` → canonical. Tot die tijd: UNKNOWN blijft
UNKNOWN. **Geen gegokte decoder in productie.**

## ErgData-forensic gebruik

UUID's, machine-types, characteristic-rollen en het CSAFE/`workout_results`-domein
komen uit `docs/concept2-ergdata-forensic.md` (classificaties BOTH / APK_OBSERVED /
UNKNOWN). De adapter gebruikt de bevestigde UUID's voor scan/subscribe. Byte-layouts
per payload staan als UNKNOWN gemarkeerd en worden niet gegokt.

## UNKNOWN / EXTERN BLOCKED

- Byte-layout per characteristic (stroke/split/summary/force-curve/CSAFE-payload) — UNKNOWN tot capture + spec-validatie.
- Rol van `0x0016–18`, `0x003D/3E/43`, `0x0060–69` — UNKNOWN.
- `REAL PM5 CONNECT` — EXTERN BLOCKED (geen fysiek PM5 in deze omgeving).
- `PAYLOAD VALIDATION` — EXTERN BLOCKED (vereist echte capture).

## Test / verificatie

- `node native/nativeConcept2BleTransport.test.js` → 48 geslaagd, 0 mislukt (MockBleGateway, geen device).
- `node scripts/build-www.mjs` → `www/native-transport.js` bundelt met de echte plugin; script-tag geïnjecteerd.
- Bestaande web-suite (release-gate 12/12, 22 f-testbestanden) ongewijzigd — deze sprint raakt geen web-runtime.

## Bekende beperking (buiten scope deze sprint)

Server-afhankelijke features (Fitbit/Google Health/coach) gebruiken relatieve
`/.netlify/functions/`-paden. In de native app resolven die niet zonder absolute
basis-URL. Dat is bewust niet in deze sprint opgelost (focus: PM5 end-to-end);
het is het integratiepunt voor een volgende sprint (config `TK_API_BASE`).
