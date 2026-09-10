# Devices/Wearables — V1 MUST Provider Integration Tracker

Bijgewerkt: Devices/Wearables Real Integration Master Sprint (vervolg na FTMS).
Dit document is de enige, structurele bron van waarheid voor de status van
elke V1 MUST-provider/-ecosysteem.

**Bewijsniveaus**: A=authenticated-user runtime, B=RPC-autorisatielogica,
C=structurele policy/code-inspectie, D=privileged DB/schema-only. D is nooit
RLS-bewijs.

---

## Android Health Connect / Google Health

- OFFICIAL API: Google Health API (health.googleapis.com/v4).
- AUTH MODEL: OAuth 2.0, self-serve. Credentials al ingesteld en werkend.
- APPROVAL REQUIRED: Nee.
- SCOPES: activity_and_fitness, health_metrics_and_measurements, sleep (readonly).
- SUPPORTED DATA: HRV, RHR, slaap, stappen.
- CANONICAL MAPPING: hrv_log (+steps deze sprint). DEDUPE: (user_id,date) upsert.
- UI STATUS: Volledig. IMPLEMENTATION STATUS: PRODUCT WORKING. PRODUCTION: Live.
- REAL DEVICE STATUS: Extern geblokkeerd deze sessie (mocked transport in tests).
- EXTERNAL BLOCKER: Nee. PO ACTION: Geen.

---

## Concept2 PM5 / BLE Heart Rate / BLE Cycling Power / BLE CSC / FTMS

Zie eerdere sprintrapporten (PR's #293-#300).

- IMPLEMENTATION STATUS: PRODUCT WORKING voor alle vijf, gedeelde capacitorBleGateway.js.
- REAL DEVICE STATUS: OPEN (geen fysieke hardware in deze sessie) -- software-pad geverifieerd tegen officiele specs.
- EXTERNAL BLOCKER: Fysieke testhardware (zie Real Device Validation Register onderaan).
- PO ACTION: Testhardware beschikbaar stellen wanneer gewenst.

---

## Apple Health / HealthKit / Apple Watch

- OFFICIAL API: Apple HealthKit -- native iOS-framework, GEEN REST-API.
- AUTH MODEL: geen OAuth -- systeemeigen iOS-permissiedialoog, binnen een native app-container.
- HARDE ARCHITECTUURVOORWAARDE: uitsluitend bruikbaar vanuit een native iOS-app-target (Capacitor `npx cap add ios`). Een reine web/PWA-context kan HealthKit nooit aanroepen, ongeacht credentials.
- SOFTWARE READINESS: canonical model (externalDataModel.js kent al `apple_healthkit`) en Calculation/Context-laag zijn platform-neutraal, herbruikbaar (fHealthKitArchitectureDoc.test.js bevestigt dit eerder al).
- IMPLEMENTATION STATUS: NOT STARTED (vereist eerst een iOS-platformtarget).
- PO ACTION REQUIRED -- APPLE:
  1. Apple Developer Program-account ($99/jaar).
  2. Bundle ID met HealthKit-capability.
  3. Provisioning profile + signing certificates.
  4. Fysiek iOS-testtoestel of TestFlight.
  5. `npx cap add ios` (nieuw platformtarget, raakt geen bestaande code) -- daarna pas de adapter bouwen.
  6. Beslissing: Watch-data uitsluitend via HealthKit (aanbevolen) of een eigen companion-app.
- EXTERNAL BLOCKER: Ja -- Apple Developer-account + iOS-target zijn een harde technische voorwaarde.

---

## Samsung Health / Galaxy Watch / Galaxy Ring

- OFFICIAL API: Samsung Health Data SDK -- Android-native, geen cloud-REST-API voor derden.
- HEALTH CONNECT OVERLAP: Samsung Health schrijft standaard veel metrics door naar Android Health Connect -- de bestaande Google Health-integratie ontvangt Samsung-Watch/Ring-data dus al gedeeltelijk automatisch.
- PER METRIC (verwachting, NIET live tegen een echt apparaat bevestigd):
  - Stappen/HR/slaap/HRV: vermoedelijk HEALTH CONNECT VOLDOENDE.
  - SpO2/lichaamssamenstelling: onzeker.
  - Huid-/lichaamstemperatuur (Galaxy Ring), stress/Samsung-derived scores: vermoedelijk DIRECT SAMSUNG VEREIST.
- CONCLUSIE (voorlopig): geen directe Samsung-adapter bouwen tenzij bewezen dat Ring-specifieke sensors een V1-vereiste zijn -- voorkomt dubbele ingestion by design.
- IMPLEMENTATION STATUS: Health-Connect-pad al PRODUCT WORKING voor kernmetrics; directe SDK-integratie NOT STARTED.
- PO ACTION: een echt Galaxy Watch/Ring-account beschikbaar stellen om de tabel hierboven te bevestigen.
- EXTERNAL BLOCKER: Ja -- real-device-validatie nodig; SDK zelf is bovendien Android-native (Kotlin/Java).

---

## Garmin (direct, Garmin Connect Developer Program)

- OFFICIAL API: Garmin Health API (healthapi.garmin.com/apis.garmin.com).
- AUTH MODEL: OAuth 2.0 + PKCE.
- APPROVAL REQUIRED: JA -- PARTNER-GATED. Geen zelfregistratie; aanvraag moet eerst goedgekeurd worden voordat een consumer key/secret bestaat.
- FORENSISCHE HERKOMST (correctie): eerdere versie van dit document classificeerde Garmin als "NOT STARTED" -- onjuist. Bij nader forensisch onderzoek bleek een volledige OAuth2+PKCE-fundering al lokaal gebouwd te zijn (eerder in dezelfde sessie, buiten het op dat moment zichtbare venster), inclusief auth-start/auth-callback/status/disconnect/webhook-ontvanger en migratie_v561 (provider/code_verifier-kolommen op wearable_oauth_state). Onafhankelijk geverifieerd (niet blind vertrouwd): het geclaimde bewijsniveau A (developerportal.garmin.com/sites/default/files/OAuth2PKCE_1.pdf, Garmin's eigen officiele PKCE-specificatie) is door mij zelf herbevestigd via een aparte zoekopdracht, inclusief verbatim teruggevonden tekst uit het PDF zelf. Zie docs/WEARABLE_PROVIDER_SOURCE_PACK.md voor de volledige bronverantwoording.
- STATUS: SOFTWARE FOUNDATION VERIFIED -- ACTIVATION BLOCKED. Auth-start/callback/status/disconnect zijn met bewijsniveau A/C gebouwd en getest (17/17, gemockte netwerkrespons o.b.v. de officiele spec). Het deregistratie-endpoint (DELETE /wellness-api/rest/user/registration) is tijdens deze correctieronde alsnog met dezelfde zekerheid bevestigd en toegevoegd aan disconnect (was eerder bewust weggelaten wegens onvoldoende zekerheid op dat moment).
- WAT NIET GEBOUWD IS (bewust): de exacte webhook-payload-schema's per samenvattingstype en het officiele verificatiemechanisme (signature/gedeeld geheim) zijn niet met A/B-zekerheid bevestigd -- garmin-webhook.js ontvangt en logt daarom uitsluitend structurele, PII-vrije diagnostiek, schrijft geen canonical data.
- MIGRATIE: migratie_v561.sql (wearable_oauth_state.provider/code_verifier) is gecontroleerd NOT APPLIED bevonden voor uitvoering, en vervolgens veilig, additief uitgevoerd tegen productie (bestaande rij kreeg de DEFAULT 'google_health', geen breaking change).
- PO ACTION REQUIRED -- GARMIN:
  1. Garmin Connect Developer Program-aanvraag indienen (zakelijke rechtvaardiging vereist).
  2. Na goedkeuring: evaluatie-tier consumer key/secret genereren.
  3. Netlify env vars: GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET, GARMIN_REDIRECT_URI.
  4. Webhook-endpoint (Ping/Pull of Push, keuze bij aanvraag) registreren in het portaal, wijzend naar de gedeployde garmin-webhook.js-URL.
  5. Zodra portaaltoegang er is: de officiele webhook-documentatie raadplegen voor het exacte payload-schema per samenvattingstype en de verificatiemethode -- pas dan canonical-mapping-code aan garmin-webhook.js toevoegen (het ontvangst-mechanisme staat al klaar).
- EXTERNAL BLOCKER: Ja -- partner-goedkeuring is een harde voorwaarde vóór activatie; de software zelf is niet de blocker.

---

## Polar (direct, AccessLink) -- SOFTWARE COMPLETE, LIVE OP MAIN

- OFFICIAL API: Polar AccessLink v3 (polaraccesslink.com), OAuth via auth.polar.com/polarremote.com.
- AUTH MODEL: OAuth 2.0 authorization code + HTTP Basic Auth bij token-exchange.
- APPROVAL REQUIRED: NEE -- ZELFBEDIENING, geen goedkeuringswachttijd.
- CLIENT CREDENTIALS REQUIRED: Ja, nog niet ingesteld op Netlify (zie PO Action).
- SCOPES: accesslink.read_all.
- BACKFILL: uitsluitend laatste 90 dagen (harde providerbeperking).
- VERPLICHTE EXTRA STAP: POST /v3/users (member-id) na token-exchange -- geimplementeerd.
- TOKEN REFRESH: n.v.t. (langlevende tokens, geen refresh_token). REVOKE: DELETE /v3/users/{id}, geimplementeerd.
- SUPPORTED DATA (deze sprint): Exercises (sport/duur/afstand/gem. HR) via het exercise-transaction-model.
- CANONICAL MAPPING: activities-tabel, sport gemapt naar het bestaande strikte enum (running/cycling/rowing/swimming) -- niet-mapbare Polar-sporttypes worden bewust overgeslagen.
- DEDUPE: dedupe_key='polar-exercise-'+exerciseId, bestaande unieke index, ignore-duplicates.
- SECURITY: state eenmalig bruikbaar (direct verwijderd na opzoeken, vóór de leeftijdscontrole), provider='polar' expliciet gezet/gefilterd (consistentie sinds migratie_v561).
- UI STATUS: Geimplementeerd (Lichaam -> Gezondheidsgegevens, eigen kaart).
- IMPLEMENTATION STATUS: SOFTWARE COMPLETE -- ACTIVATION BLOCKED (credentials ontbreken).
- TEST STATUS: fPolarIntegration.test.js, 30/30.
- PRODUCTION STATUS: Live op main (PR #301, gemerged).
- REAL DEVICE STATUS: OPEN. EXTERNAL BLOCKER: Ja (credentials ontbreken, geen wachttijd).
- PO ACTION REQUIRED -- POLAR:
  1. admin.polaraccesslink.com, inloggen met een Polar Flow-account (geen apparaat nodig).
  2. Nieuwe API-client aanmaken. Callback-URL: https://maurice-art.netlify.app/.netlify/functions/polar-auth-callback
  3. Client ID + Client Secret noteren.
  4. Netlify env vars: POLAR_CLIENT_ID, POLAR_CLIENT_SECRET, POLAR_REDIRECT_URI (zelfde callback-URL).
  5. Herdeploy -- direct bruikbaar, geen verdere codewijziging nodig.

---

## Fitbit (direct)

- OFFICIAL API: Fitbit Web API (api.fitbit.com, onder Google-beheer), apart van Google Health aan te vragen.
- BELANGRIJKE VERWARRING RECHTGEZET: de bestaande Google Health-integratie noemt zichzelf in UI/foutmeldingen historisch "Fitbit" -- dat is de oude merknaam, blijven staan na de migratie naar de Google Health API, GEEN aparte tweede integratie. Er bestaat vandaag dus GEEN directe Fitbit Web API-koppeling.
- AUTH MODEL: OAuth 2.0, self-serve via dev.fitbit.com.
- IMPLEMENTATION STATUS: NOT STARTED -- bewust niet gebouwd deze sessie (tijdsbudget), geen technische blocker.
- PO ACTION: Fitbit-app registreren op dev.fitbit.com (self-serve) -- daarna direct bouwbaar naar hetzelfde patroon als Polar.
- EXTERNAL BLOCKER: Nee (self-serve). Eerstvolgende bouwkandidaat na Polar.
- DEDUPE-AANDACHTSPUNT: zodra gebouwd, dedupliceren tegen dezelfde activiteit die ook via de bestaande Google Health-koppeling binnenkomt.

---

## WHOOP (direct)

- OFFICIAL API: WHOOP Developer Platform (api.prod.whoop.com), OAuth 2.0, self-serve.
- SUPPORTED DATA: Cycles, Recovery, Sleep, Workouts, Body/profile. Recovery/Strain blijven PROVIDER_DERIVED.
- IMPLEMENTATION STATUS: NOT STARTED -- bewust niet gebouwd deze sessie.
- PO ACTION: developer.whoop.com-account, app registreren (self-serve).
- EXTERNAL BLOCKER: Nee (self-serve) -- nog niet gebouwd.

---

## Oura (direct)

- OFFICIAL API: Oura API v2 (api.ouraring.com), OAuth 2.0, self-serve.
- SUPPORTED DATA: Sleep, Readiness, Activity, Workouts, HR/HRV. Scores blijven PROVIDER_DERIVED.
- IMPLEMENTATION STATUS: NOT STARTED.
- PO ACTION: cloud.ouraring.com-developeraccount, OAuth2-app registreren.
- EXTERNAL BLOCKER: Nee (self-serve) -- nog niet gebouwd.

---

## COROS (direct)

- OFFICIAL API: COROS Open Platform/Partner API.
- APPROVAL REQUIRED: vermoedelijk partner-gate (vergelijkbaar met Garmin) -- NIET bevestigd via eerste-partij documentatie deze sessie.
- IMPLEMENTATION STATUS: NOT STARTED.
- PO ACTION: contact opnemen met COROS voor partner/developer-toegang; exacte procedure nog te bevestigen.
- EXTERNAL BLOCKER: Ja (vermoedelijk) -- laagste prioriteit gezien onzekerheid over zelfs de toegangsprocedure.

---

## Real Device Validation Register

| Device/Provider | Hardware/account beschikbaar? | Real test gedaan? | Open blocker |
|---|---|---|---|
| Concept2 PM5 | Nee | Nee | Fysieke PM5 nodig |
| BLE HR-band | Nee | Nee | Fysieke band nodig |
| BLE Cycling Power meter | Nee | Nee | Fysieke meter nodig |
| BLE CSC-sensor | Nee | Nee | Fysieke sensor nodig |
| FTMS-apparaat | Nee | Nee | Fysieke machine nodig |
| Google Health-account | Deels | Gedeeltelijk (mocked) | Geen live round-trip deze sessie |
| Apple Watch | Nee | Nee | iOS-target + Apple Developer-account |
| Galaxy Watch/Ring | Nee | Nee | Fysiek apparaat + Samsung-account |
| Garmin | Nee | Nee | Partner-goedkeuring + credentials |
| Polar | Nee | Nee | Credentials (self-serve) |
| Fitbit/WHOOP/Oura | Nee | Nee | Nog niet gebouwd |
| COROS | Nee | Nee | Toegangsprocedure onbevestigd |

---

## Samenvattende status

- PRODUCT WORKING: Google Health, Concept2/PM5, BLE HR, BLE Power, BLE CSC, FTMS.
- SOFTWARE COMPLETE -- ACTIVATION BLOCKED (credentials, self-serve, geen wachttijd): Polar (live op main).
- SOFTWARE FOUNDATION VERIFIED -- ACTIVATION BLOCKED (partner-goedkeuring vereist): Garmin.
- NOT STARTED, self-serve, geen blocker om te bouwen: Fitbit, WHOOP, Oura.
- NOT STARTED, partner-goedkeuring vereist vóór bouwen (onbevestigd of Garmin-achtig gated): COROS.
- NOT STARTED, harde platformvoorwaarde (native iOS-target): Apple HealthKit/Watch.
- GEDEELTELIJK GEDEKT via bestaande integratie, directe adapter niet bewezen noodzakelijk: Samsung Health/Galaxy Watch/Ring.

Devices/Wearables blijft NOT FROZEN totdat elke regel hierboven PRODUCT
WORKING is, of SOFTWARE COMPLETE/SOFTWARE FOUNDATION VERIFIED + exacte
external activation action known + no internal implementation gap. Voor
Garmin/Apple/Samsung/COROS is dat laatste nu het geval. Fitbit/WHOOP/Oura
zijn de eerstvolgende bouwkandidaten (geen externe blocker).

**Belangrijke les uit deze sprint**: eerder werd Garmin abusievelijk als
"NOT STARTED" geclassificeerd op basis van een te snelle, onvolledige
zoekopdracht binnen dit venster -- een volledige, degelijke fundering
bleek al te bestaan (eerder in dezelfde sessie gebouwd). Forensisch
onderzoek (git-geschiedenis, bestandsherkomst, onafhankelijke
herverificatie van elke brongebonden bewering) vóór het overschrijven of
weggooien van onverwacht aangetroffen werk is daarom vaste procedure
geworden, niet alleen voor Garmin.
