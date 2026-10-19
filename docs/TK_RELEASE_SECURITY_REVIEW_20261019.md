# TK-REL-SEC-01 — onafhankelijke integriteitsreview en releasebeperkingen

**Datum:** 19 oktober 2026
**Werkbranch:** `review/tk-release-audit-20261019` (afzonderlijke worktree, ontstaan vanaf PR #552 HEAD `146bb4b5469024c3539b3b67b2a1216778872c47`).
**Main:** `160fefc2e1dabc424922e907f7dc360e4f84543f`, ongewijzigd.
**Status:** DRAFT, NO MERGE / NO DEPLOY / NO (HER)INSTALLATIE. Dit is géén formele complete securityaudit van alle 39k+ appregels.

## 1. Eigen codebevindingen

1. **TK-REL-SEC-01a (P1) — onbetrouwbare queue-read bij Builder-herstel.** De reparatie uit PR #552 vroeg `offlineQueueAll()` op en controleerde `Array.isArray`. Maar die functie slikt elke IndexedDB-fout en retourneert een geldige lege array. Zelfs op #552 kon lokaal verwijderde training terugkomen. Herstel: `syncCustomTrainingsFromSupabase()` gebruikt de werkelijk transactionele `tkLeesWachtrijStrikt()`, die op abort, leesfout of ontbrekende getAll-uitkomst afbreekt vóór mutaties. Het ouder-kindbesluit is eveneens fail-closed.
2. **TK-REL-SEC-01b (P1 security) — anonieme legacy-items.** `flushOfflineQueue()` verstuurde oude records met `owner_uid == null` onder de huidige login. De eigenaar is niet bewijsbaar; herhaald afspelen is niet geoorloofd. Herstel: alleen een gelijk, niet-leeg `owner_uid` mag replayen; onbekende entries blijven in de queue voor **handmatige conservatieve reconciliatie, niet verwijderen**. Een accountwissel vóór of tijdens een netwerkverzoek stopt de run en laat het item staan.
3. **TK-REL-SEC-01c (P1) — onterechte status na storagefout.** `offlineQueueRemove()` kon `false` geven en de flush ging toch door alsof het item was afgehandeld. Herstel: stop bij mislukte verwijdering. Badge en afsluitende succesmelding gebruiken een strikte queue-read; onbekende opslag is zichtbaar.
4. **TK-REL-SEC-01d (veiligheidsmaatregel)**: de strikte lezer accepteert een `getAll`-resultaat pas bij succesvolle transactiesluiting en alleen als het werkelijk een array is.

Dit is een beperkte hardening van de bestaande queue: geen nieuwe database, geen datamigratie, geen UI-redesign en geen wijziging van Calculation-, Evidence-, Context-, Decision- of AI-contract.

## 2. RED / GREEN en gerichte lokale tests

- **RED vooraf:** `node core/fReleaseQueueIsolation.test.js` faalde aantoonbaar op de oude #552-code bij de simulatie van een onleesbare IndexedDB-queue.
- **GREEN na fix:** `core/fReleaseQueueIsolation.test.js` **8/8**: onleesbare queue, ontbrekende eigenaar, verkeerde eigenaar, accountwisseling in-flight, gewone bevestiging, verloren HTTP-response, mislukt lokaal verwijderen, transactie zonder geldige getAll.
- **Bestaande tests aangepast aan de nieuwe bronafhankelijkheid (alleen fixtures):** `fOfflineDeleteFailClosed` **6/6**; `fUpdateReadiness` **12/12 statisch** (lokaal geen Chromium); `fBackendOrderingIntegrity` **23/23**; `fOfflineEmptyServerRecovery` **4/4**; `fOfflineTrainingContentAck` **7/7**; `fTrainingExecutionEndToEndResilience` **8/8**; `fTrainingExecutionHyroxAndRaceMatrix` **11/11**; `fTrainingExecutionScenarioBDE` **10/10**. `fFase2`, `fOfflineQueueCrossAccountLeakage`, `fMyTrainingOfflineRpcHardening` en `fSessieIntegriteit` lokaal exit 0.
- **Lokale beperking:** Node 24/Windows, nog zonder npm-installatie en gegenereerde Android-assets: oorspronkelijke volle suite op het Windows-toestel had diverse CRLF-, dependency-, mock- en assetfouten. Deze lijst is geen bewijs van een schone volledige regressie. Alleen **nieuwe GitHub Quality Gate op exacte HEAD** en **CI Chromium met nul SKIP** mogen als laatste automatische acceptatie tellen.

## 3. Serverbevestiging en installatierisico

De bestaande `sb*Q({detail:true})` heeft `confirmed`, `queued`, `rejected`, `failed` en observability, maar HTTP 2xx en een lege queue bewijzen niet dat de **volledige lokaal opgebouwde inhoud** veilig op server staat. De eerdere Builder-inhoudsvergelijking geeft gedeeltelijke bevestiging; er is nog geen device-brede readback met user-id, tabel, row-id, canonical inhoud/hash en volledigheid per trainingsobject. Status voor migratie/uninstall: **ONBEKEND / NIET VEILIG**.

Nog vereist vóór uninstall/reinstall: offline queue, open workout en Guided-concept, alle lokale alleenstaande trainingsobjecten, sessies/sets, voeding en opslagfouten inventariseren **zonder mutatie**; dezelfde eigenaar en inhoud op Supabase read-only aantonen; daarna nogmaals testen bij verloren responses, dubbele writes, accountwissel, offline herstart en fysieke Android tests. Geen uninstall of data-afvoer om testbaar te worden.

## 4. Signing en Android — PR #532

Bron: `docs/ADR-ANDROID-SIGNING-001.md`, `.github/workflows/android-internal-apk.yml`, `android/app/build.gradle` op PR #532/baseline. `applicationId=com.trainingskompas.app`; `versionCode=47025`, `versionName=4.70.25`. Debug-CI gebruikt telkens andere tijdelijke sleutel; bestaand debug-certificaat is niet updatebaar naar nieuwe identiteit zonder oude private key. `allowBackup=false`: uninstall = lokale opslag weg. Interne release is afhankelijk van poortbesluiten D1–D4, beschermde environment, secrets en vastgelegde certificate fingerprint; geen van deze besluiten is hier genomen.

**Voorlopige bouwketen:** `npm ci` → `npm run cap:sync` → unsigned release Gradle → zipalign → sign only when authorized with stable protected key → apksigner/certificate check → SHA256/build SHA/version provenance → staged native/device acceptance. Nooit een debug-fallback. Signing PR #532 blijft onafhankelijk Draft; geen aanmaken van keystore, geen secretwijziging.

## 5. Architectuur- en releaseadvies

- Coach consumeert Decision-uitkomsten; geen AI-herberekening, geen nieuwe sportregels. Het scope-diff van #552 bevat enkel `readiness_day.v1.1` en copy/UI- en offlineherstelwijzigingen.
- UX heeft eigen branches. `index.html` blijft een gedeeld conflictbestand: voor latere UX-integratie diff-based cherry-pick/rebase en volledige browseracceptatie.
- De bestaande 10 gestapelde Draft-PR's zijn via ancestrie al verwerkt in #552: bij een latere expliciet toegestane merge oude drafts alleen administratief sluiten/superseden, geen dubbel mergen.
- **NO-GO** voor integratie naar main of APK-beta totdat aparte herreview, CI, Chromium, serverreadback, Android/Health Connect/Concept2-toestelacceptatie en D1–D4 zijn afgerond.
- Post-merge alleen na expliciete toestemming: regressie op feitelijke main-SHA, herhaal exact CI en browser, controleer RLS/owner-isolatie en native build, checksum en Play/internal distributie; bij falen revert code via Git, maar nooit automatisch lokaal opgeslagen sporterdata wissen.
