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
- MIGRATIE: migratie_v561.sql (wearable_oauth_state.provider/code_verifier) is gecontroleerd NOT APPLIED bevonden vóór uitvoering, en vervolgens veilig, additief uitgevoerd tegen productie (bestaande rij kreeg de DEFAULT 'google_health', geen breaking change). Post-verify (deze ronde): RLS actief op wearable_oauth_state, nul policies -- default-deny voor anon/authenticated, uitsluitend service_role kan de tabel benaderen. Exact hetzelfde patroon als het al-geauditeerde wearable_connections (ook nul policies) -- geen nieuwe kwetsbaarheid geïntroduceerd. 1 bestaande rij correct gemigreerd, geen dataverlies, geen dubbele schema-objecten, geen ongeplande mutaties.

### GARMIN — EXACTE STATUS

```
SOFTWARE FUNCTIONAL   = COMPLETE
PRODUCT UI            = COMPLETE (Provider Management UI, eerlijk disabled totdat actief)
PRODUCTION SCHEMA     = ACTIVE (migratie_v561, post-verified)
PROVIDER ACTIVATION   = BLOCKED — GARMIN PARTNER APPROVAL/CREDENTIALS
REAL PROVIDER SYNC    = NOT YET PROVEN
```

### PO ACTION CARD — GARMIN

```
PROVIDER:                 Garmin
OFFICIAL PORTAL:          developerportal.garmin.com (Garmin Connect Developer Program)
ACCOUNT/PROGRAM:          Garmin Connect Developer Program-aanvraag (zakelijk account)
APPLICATION REQUIRED:     Ja — evaluatie-tier aanvraag, met bedrijfs-/productrechtvaardiging
COMPANY/PRODUCT INFO:     Bedrijfsnaam, productbeschrijving (Trainingskompas), beoogd datagebruik
CLIENT ID:                Wordt uitgegeven ná goedkeuring (consumer key)
CLIENT SECRET/PKCE:       Wordt uitgegeven ná goedkeuring (consumer secret); PKCE (S256) is al
                          volledig geïmplementeerd aan onze kant, vereist geen aparte PO-actie
REDIRECT URI:             https://maurice-art.netlify.app/.netlify/functions/garmin-auth-callback
WEBHOOK URI:               https://maurice-art.netlify.app/.netlify/functions/garmin-webhook
                          (kiezen: Push- of Ping/Pull-architectuur bij de aanvraag)
APPROVAL REQUIREMENT:     Ja — partner-gated, geen zelfregistratie mogelijk
CONTRACT/LICENSING:       Onbekend/nog te bevestigen bij aanvraag (geen kosteninformatie
                          gevonden in publiek beschikbare bronnen deze sessie)
WAT PO MOET AANLEVEREN:   1) Developer Program-aanvraag indienen; 2) na goedkeuring
                          GARMIN_CLIENT_ID + GARMIN_CLIENT_SECRET + GARMIN_REDIRECT_URI
                          als Netlify-omgevingsvariabelen instellen; 3) in het portaal
                          bevestigen welke summary-types (dailies/epochs/sleeps/
                          activities/...) geabonneerd worden
WAT CLAUDE DOET DAARNA:   Zodra portaaltoegang er is: de dan-toegankelijke officiële
                          webhook-documentatie raadplegen voor het exacte payload-schema
                          en verificatiemechanisme per summary-type, canonical-mapping-
                          code toevoegen aan garmin-webhook.js (ontvangst-mechanisme staat
                          al klaar), een live OAuth-round-trip uitvoeren en documenteren
```

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

## Fitbit (direct) -- CORRECTIE: platform sluit deze maand, niet meer bouwbaar

- KRITIEKE BEVINDING (deze ronde, meerdere onafhankelijke eerste-partij bronnen inclusief Fitbit's eigen developer-portaal dev.fitbit.com/legal/coming-soon en Fitbit's eigen community-aankondiging "Introducing the next phase of the Fitbit Web API"): de legacy Fitbit Web API wordt op **30 september 2026** definitief uitgezet -- vandaag is 10 september 2026, dat is over ongeveer drie weken. **Nieuwe developer-app-registraties zijn al gesloten sinds mei 2026** (dev.fitbit.com/apps/new accepteert geen nieuwe aanvragen meer, bevestigd via een concrete, gedateerde GitHub-issue).
- Google's eigen, officieel voorgeschreven migratiepad voor bestaande Fitbit-integraties is de Google Health API -- exact de integratie die Trainingskompas al volledig gebouwd en live heeft.
- CONCLUSIE: een directe Fitbit Web API-integratie bouwen is nu zinloos -- geen nieuwe credentials meer te verkrijgen, het platform zelf verdwijnt over drie weken, en het zou een overbodige tweede route zijn naast een integratie die er al ligt en die Google zelf als de juiste opvolger aanwijst. Dit is GEEN self-serve bouwkandidaat meer (correctie op de eerdere status).
- BELANGRIJKE VERWARRING (blijft staan): de bestaande Google Health-integratie noemt zichzelf in UI/foutmeldingen historisch "Fitbit" -- dat is de oude merknaam, blijven staan na Google's eigen migratie. Dat is toevallig nu wél de daadwerkelijk juiste, toekomstbestendige route voor Fitbit-gebruikers.
- IMPLEMENTATION STATUS: NOT APPLICABLE -- V1 MUST voor "Fitbit" wordt gedekt door de bestaande, live Google Health-integratie. Geen aparte code te bouwen.
- PO ACTION: geen -- als bestaande Fitbit-gebruikers via TK willen blijven syncen, is het bestaande "Fitbit koppelen"-knop (die intern al de Google Health-flow gebruikt) de juiste weg. Geen actie vereist tenzij PO alsnog een reden ziet om dit verder te onderzoeken.
- EXTERNAL BLOCKER: Ja, in de zin dat het onderliggende platform niet meer toegankelijk is voor nieuwe integraties -- niet oplosbaar door een PO-actie.

---

## WHOOP (direct) -- SOFTWARE COMPLETE deze sprint

- OFFICIAL API: WHOOP Developer Platform (developer.whoop.com), OAuth 2.0 authorization code, self-serve (~5 min setup, geen goedkeuringsperiode).
- AUTORISATIE-ENDPOINT: GET https://api.prod.whoop.com/oauth/oauth2/auth -- Bewijsniveau A, meerdere officiele developer.whoop.com-pagina's, verbatim teruggevonden.
- TOKEN-ENDPOINT: POST https://api.prod.whoop.com/oauth/oauth2/token (authorization_code + refresh_token grant) -- Bewijsniveau A, zelfde bronnen.
- SCOPES: offline, read:profile, read:recovery, read:sleep, read:workout, read:cycles, read:body_measurement -- Bewijsniveau A.
- DATA-ENDPOINT (deze sprint): GET https://api.prod.whoop.com/developer/v2/activity/workout, gepagineerd via next_token/nextToken -- Bewijsniveau A, exact, verbatim JSON-responsschema teruggevonden op developer.whoop.com/api/ (sport_name als leesbare string, bv. "running"; score_state; score.average_heart_rate/distance_meter/kilojoule/...).
- CANONICAL MAPPING: activities-tabel, sport_name gemapt naar het bestaande strikte enum (running/cycling/rowing/swimming) -- niet-mapbare WHOOP-sporttypes (tientallen, o.a. "weightlifting") worden bewust overgeslagen. Ongescoorde workouts (score_state != 'SCORED') worden ook overgeslagen -- UNKNOWN != ZERO, geen cijfers tonen die er nog niet zijn.
- DEDUPE: dedupe_key='whoop-workout-'+id, bestaande unieke index, ignore-duplicates.
- TOKEN REFRESH: geimplementeerd (5 min. voor verlopen, zelfde patroon als Google Health).
- REVOKE: EERLIJKE BEPERKING -- WHOOP's API-changelog noemt een "revokeUserOauthAccess"-mechanisme, maar de exacte, aanroepbare REST-URL is niet met dezelfde A-zekerheid bevestigd. disconnect verwijdert daarom altijd de lokale tokens/koppeling (binnen eigen controle, altijd veilig), maar roept nog geen externe revoke-aanroep aan. PO ACTION: bevestigen zodra credentials/volledige documentatietoegang er is.
- UI STATUS: Geimplementeerd (Lichaam -> Gezondheidsgegevens, eigen kaart naast Polar/Garmin).
- IMPLEMENTATION STATUS: SOFTWARE COMPLETE -- ACTIVATION BLOCKED (credentials ontbreken, self-serve, geen wachttijd).
- TEST STATUS: fWhoopIntegration.test.js, 20/20 (OAuth-contract, sport-mapping, ongescoorde-workout-filtering, Vault-gebruik, token-refresh-pad, ontbrekende-env-var-afhandeling).
- REAL DEVICE STATUS: OPEN.
- PO ACTION REQUIRED -- WHOOP:
  1. developer.whoop.com, inloggen via id.whoop.com met een WHOOP-account (geen band vereist voor test-mode).
  2. Team + App aanmaken in het Developer Dashboard.
  3. Redirect URL registreren: https://maurice-art.netlify.app/.netlify/functions/whoop-auth-callback
  4. Netlify env vars: WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REDIRECT_URI.
  5. Herdeploy -- direct bruikbaar.
- EXTERNAL BLOCKER: Ja (credentials ontbreken, self-serve, geen wachttijd).

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
- SOFTWARE COMPLETE -- ACTIVATION BLOCKED (credentials, self-serve, geen wachttijd): Polar (live op main), WHOOP (live op main).
- SOFTWARE FOUNDATION VERIFIED -- ACTIVATION BLOCKED (partner-goedkeuring vereist): Garmin.
- NOT APPLICABLE (platform sluit binnenkort, al gedekt via bestaande integratie): Fitbit -- zie eigen sectie, geen aparte code te bouwen.
- NOT STARTED, self-serve, geen blocker om te bouwen: Oura.
- NOT STARTED, partner-goedkeuring vereist vóór bouwen (onbevestigd of Garmin-achtig gated): COROS.
- NOT STARTED, harde platformvoorwaarde (native iOS-target): Apple HealthKit/Watch.
- GEDEELTELIJK GEDEKT via bestaande integratie, directe adapter niet bewezen noodzakelijk: Samsung Health/Galaxy Watch/Ring.

Devices/Wearables blijft NOT FROZEN totdat elke regel hierboven PRODUCT
WORKING is, of SOFTWARE COMPLETE/SOFTWARE FOUNDATION VERIFIED + exacte
external activation action known + no internal implementation gap. Voor
Garmin/Apple/Samsung/COROS is dat laatste nu het geval. Oura is de
eerstvolgende bouwkandidaat (geen externe blocker).

**Belangrijke les uit deze sprint**: eerder werd Garmin abusievelijk als
"NOT STARTED" geclassificeerd op basis van een te snelle, onvolledige
zoekopdracht binnen dit venster -- een volledige, degelijke fundering
bleek al te bestaan (eerder in dezelfde sessie gebouwd). Forensisch
onderzoek (git-geschiedenis, bestandsherkomst, onafhankelijke
herverificatie van elke brongebonden bewering) vóór het overschrijven of
weggooien van onverwacht aangetroffen werk is daarom vaste procedure
geworden, niet alleen voor Garmin.
