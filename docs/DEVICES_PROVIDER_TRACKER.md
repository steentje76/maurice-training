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

## Apple Health / HealthKit / Apple Watch -- ARCHITECTURE DESIGNED, IMPLEMENTATION BLOCKED (omgeving + productbeslissing)

- OFFICIAL API: Apple HealthKit -- native iOS-framework, GEEN REST-API, geen OAuth. Bevestigd (evidence-niveau A, developer.apple.com/documentation/healthkit): `HKHealthStore.requestAuthorization(toShare:read:)`, per-type systeemeigen iOS-permissiedialoog, uitsluitend binnen een native app-container.
- FUNDAMENTELE ARCHITECTUURWET (al eerder correct vastgesteld, deze ronde onafhankelijk herbevestigd tegen actuele Apple-documentatie): HealthKit-data leeft uitsluitend op het apparaat; een reine web/PWA-context kan HealthKit nooit aanroepen, ongeacht credentials. Zie docs/MS-F5-04_APPLE_HEALTHKIT_ARCHITECTURE.md voor het volledige, reeds bevestigde ontwerp (keten, autorisatiemodel, datatypen-tabel met HRV-methodologienuance, achtergrondlevering, privacygrens) -- niet hier herhaald.
- OMGEVINGSBLOKKADE (fundamenteel, niet credential-gerelateerd, bevestigd in docs/MS-F13-06_IOS_FEASIBILITY_RESEARCH.md): een werkende iOS Xcode-projectstructuur (`npx cap add ios`) vereist CocoaPods en de Xcode-command-line-tools, die uitsluitend op macOS bestaan. Deze sessie draait in een Linux-sandbox (bevestigd: geen `pod`/`xcodebuild`/`xcode-select`). Dit is dus GEEN kwestie van ontbrekende Apple Developer-credentials (die zijn alleen nodig om te signeren/publiceren) -- zelfs met credentials kan in déze omgeving geen ios/-map worden aangemaakt.
- PRODUCTBESLISSING NOG OPEN: docs/TRAININGSKOMPAS_MASTER_ROADMAP.md §24 ("iOS timing") is een expliciet nog-open Product Owner-beslissing die aan een native iOS-implementatie voorafgaat. De bestaande, getested architectuur-acceptance-gate (fHealthKitArchitectureDoc.test.js) bewaakt letterlijk dat er GEEN ios/-map bestaat zolang dit ontwerp-only blijft -- dat is een bewuste, bestaande governance-grens, geen omissie.
- SOFTWARE READINESS: canonical model (core/externalDataModel.js kent al `apple_healthkit`) en de Calculation/Context-laag zijn platform-neutraal en herbruikbaar zodra een adapter er is (fHealthKitArchitectureDoc.test.js bevestigt dit).
- IMPLEMENTATION STATUS: ARCHITECTURE DESIGNED -- IMPLEMENTATION BLOCKED. Geen ios/-map, geen Capacitor-iOS-dependency, geen Swift-code (bewust, correct, getest).
- WAT WEL AL KLAAR STAAT ZODRA DE OMGEVING ER IS: het volledige ontwerp (keten/datatypen/privacy/achtergrondlevering) in MS-F5-04, plus een bevestigd technisch onafhankelijk deelpad (Sign in with Apple, volledig web-based bouwbaar zonder native app -- zie MS-F13-06) dat NIET op de "iOS timing"-beslissing hoeft te wachten.

### PO ACTION CARD — APPLE

```
OFFICIAL PORTAL:              developer.apple.com
APPLE DEVELOPER PROGRAM:      Vereist (business/individueel, $99/jaar)
TEAM ID:                      Uitgegeven bij Developer Program-registratie
BUNDLE ID:                    Nog te kiezen (bv. com.trainingskompas.app), met
                               HealthKit-capability ingeschakeld in Xcode/App ID-configuratie
HEALTHKIT CAPABILITY:         Aan te vinken in Xcode (Signing & Capabilities) +
                               App ID-configuratie in het Developer Portal
ENTITLEMENTS:                 com.apple.developer.healthkit (automatisch via Xcode-
                               capability-toggle, geen handmatige aanvraag)
PROVISIONING:                 Development + Distribution provisioning profiles
SIGNING:                      Distribution-certificaat (Developer Program-lidmaatschap)
TEST IPHONE:                  Vereist -- HealthKit werkt niet in de iOS Simulator
                               (geen Health-data beschikbaar in Simulator)
APPLE WATCH VEREIST?:         Nee voor V1 -- Watch-data loopt via HealthKit op de
                               gekoppelde iPhone (Watch -> Health-app -> HealthKit -> TK),
                               geen aparte watchOS-app nodig tenzij een toekomstige
                               capability dit expliciet vereist
XCODE/MAC VEREIST?:           Ja -- fundamentele omgevingsvoorwaarde, ontbreekt in deze
                               sessie (Linux-sandbox). Dit is de kern-blokkade, los van
                               credentials.
TESTFLIGHT VEREIST?:          Voor interne test vóór App Store-publicatie, ja
WAT PO MOET AANLEVEREN:       1) Apple Developer Program-account; 2) een macOS-omgeving
                               met Xcode (eigen Mac, of een macOS CI-runner) waarin een
                               toekomstige sessie/ontwikkelaar `npx cap add ios` kan
                               uitvoeren; 3) een fysiek testtoestel; 4) een expliciete
                               beslissing over "iOS timing" (roadmap §24)
WAT CLAUDE DOET DAARNA:       Zodra een macOS-omgeving beschikbaar is: `npx cap add ios`,
                               het al-ontworpen HealthKit-adapterpatroon (MS-F5-04)
                               implementeren in Swift, canonieke JS-brug bouwen
                               (window.TKHealthKitTransport, analoog aan het bestaande
                               Concept2-patroon), en dezelfde _wearableSyncLib.js-
                               canonieke-mapping hergebruiken.
```

- EXTERNAL BLOCKER: Ja -- tweevoudig: (1) een macOS/Xcode-omgeving (fundamenteel, ontbreekt in deze sessie ongeacht credentials), (2) de nog-open "iOS timing"-productbeslissing.

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

## Fitbit -- V1 SUCCESSOR PATH CERTIFICATION

**A. Legacy Fitbit Web API einddatum**: 30 september 2026 (over ~3 weken vanaf vandaag) -- bevestigd via Fitbit's eigen developer-portaal (dev.fitbit.com/legal/coming-soon) en Fitbit's eigen community-aankondiging "Introducing the next phase of the Fitbit Web API". Nieuwe developer-app-registraties al gesloten sinds mei 2026 (dev.fitbit.com/apps/new, bevestigd via een gedateerde GitHub-issue).

**B/C. Officiële opvolger**: de Google Health API. Google's eigen documentatie noemt dit expliciet het voorgeschreven migratiepad voor bestaande Fitbit-integraties.

**D. Komt Fitbit-apparaatdata daar werkelijk in terecht?** JA -- bevestigd via officiële Google-documentatie: de Google Health API is "Google's cloud OAuth layer for Google Health data, and it aggregates data from Fitbit accounts, Health Connect, Google Fit, and other sources" (Fitbit-gebruikers zijn dus een eerste-partij-brondata-bron van deze API, geen aparte/losse integratie).

**E. Mogen derde partijen die data lezen?** JA -- exact de bestaande, al productie-actieve OAuth2-koppeling die Trainingskompas al heeft (client-ID/secret al geconfigureerd, token-vault al gebouwd).

**F/G/H. Coverage-matrix** (officieel bevestigd via developers.google.com/health/release-notes "Data Types Supporting Read" -- niet aangenomen):

| Fitbit-metric | Beschikbaar in Google Health API? | TK haalt dit al binnen? |
|---|---|---|
| Steps | JA (`steps`, dailyRollUp) | JA (deze sprint gebouwd) |
| Sleep | JA (`sleep`, session) | JA |
| HRV | JA (`daily-heart-rate-variability`) | JA |
| Resting HR | JA (`daily-resting-heart-rate`) | JA |
| Workouts/Exercise | JA (`exercise`, volledige sessie: type/duur/afstand/gem. HR) | **JA -- AL EERDER GEBOUWD** (zie hieronder, PR #215/#216, buiten deze sprint om ontdekt en nu pas daadwerkelijk aan de UI gekoppeld) |
| Continue hartslag | JA (`heart-rate`) | Nee, nog niet gebouwd |
| Afstand (los van workout) | JA (`distance`) | Nee |
| Actieve calorieën | JA (`total-calories`/`active-energy-burned`) | Nee |
| Lichaamsgewicht/-samenstelling | JA (`weight`, `body-fat`) | Nee (TK's `weight_log` is vooralsnog handmatige invoer) |
| Activiteitsintensiteit/-minuten | JA (`active-minutes`, `activity-level`) | Nee |

**I. Provenance/source-device**: `source_provenance='provider_derived'`, `source_provider='google_health'` -- provider-identiteit blijft bewaard (bevestigd in de reeds bestaande `upsert_provider_activity`-RPC).

**J. Productiegeschiktheid**: zie hieronder -- SOFTWARE COMPLETE, met één concreet, extern verificatiepunt.

### BELANGRIJKE FORENSISCHE ONTDEKKING TIJDENS DEZE CERTIFICERING

Workout-ingestion (Google Health `exercise`-datatype) bleek AL EERDER, buiten deze Devices/Wearables-sprint om, volledig gebouwd, adversarieel getest en GEMERGED te zijn (PR #215/#216, "B9-H3B/B9-H3C Cross-Sport Cloud Provider Integration") -- inclusief een eigen RPC (`upsert_provider_activity`, met manual-data-protection, cross-user-beveiliging en anon-revoke, alle drie live opnieuw geverifieerd deze ronde) en een eigen Netlify Function (`wearable-sync-activities.js`), bewust GESCHEIDEN van `wearable-sync.js` voor failure-isolation. Dit was mij niet bekend totdat een bestaande, eerder gebouwde regressietest (`fB9_H3BCloudProviderIntegration.test.js`) een eigen, foutieve poging om dit opnieuw te bouwen correct blokkeerde.

**Ontbrekend gebleken gat, nu gedicht**: de backend-functie bestond, was beveiligd en getest, maar werd NERGENS vanuit de UI aangeroepen (`wearableSyncNow()` riep het nooit aan). Dat is deze ronde gerepareerd: de client roept nu, na de hoofd-sync, ook `wearable-sync-activities.js` aan, in een eigen, geïsoleerde try/catch (een storing daar kan de al-succesvolle hoofdmelding niet meer verstoren).

**Resterend, echt extern verificatiepunt** (gedocumenteerd in `docs/B9_H3B_PROVIDER_SELECTION.md`, hier herbevestigd): de nieuwe OAuth-scope (`googlehealth.activity_and_fitness.readonly`) staat al in de live autorisatie-aanvraag (`wearable-auth-start.js`, geverifieerd), maar of deze scope daadwerkelijk is vrijgegeven op het OAuth-consent-scherm in de Google Cloud Console van het productieproject kon niet worden geverifieerd (geen toegang tot die Console binnen deze sessie). Als de scope daar nog moet worden toegevoegd/goedgekeurd, is dat een korte, zelfstandige PO-actie in een bestaande Console -- geen nieuwe provider-registratie, geen nieuw contract, geen codewijziging.

### FITBIT V1-BESLISSING

```
FITBIT
V1 MUST SATISFIED VIA OFFICIAL GOOGLE HEALTH SUCCESSOR PATH
-- voor steps/sleep/HRV/resting-HR/workouts (kernmetrics, nu volledig
   gebouwd, beveiligd, getest EN aan de UI gekoppeld).
PARTIALLY SATISFIED -- INTERNAL SCOPE DECISION (geen platformbeperking)
-- voor continue hartslag/afstand/calorieën/lichaamsgewicht/activiteits-
   minuten: door Google Health API officieel ondersteund, TK heeft er
   bewust nog geen ingestion voor gebouwd (productmatige prioriteitskeuze,
   geen technische blokkade).
```

- IMPLEMENTATION STATUS: workouts SOFTWARE COMPLETE + UI-GEKOPPELD deze ronde. Overige metrics NOT STARTED (geen blokkade, productmatige keuze).
- PO ACTION: verifieer in de Google Cloud Console of `googlehealth.activity_and_fitness.readonly` is vrijgegeven op het OAuth-consent-scherm; zo niet, voeg toe/vraag verificatie aan (geen nieuwe registratie).
- UX: de bestaande "Fitbit"-knop/-labels in de UI gebruiken al intern de Google Health-route -- functioneel correct, de merknaam is historisch maar niet misleidend voor de daadwerkelijke werking.
- EXTERNAL BLOCKER: mogelijk (OAuth-consent-scherm-verificatie, niet bevestigd binnen deze sessie) -- geen nieuwe provider-registratie of contract.

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

## Oura (direct) -- SOFTWARE COMPLETE deze sprint

- OFFICIAL API: Oura API v2 (api.ouraring.com), OAuth 2.0, self-serve (tot 10 gebruikers zonder Oura-goedkeuring, daarna goedkeuring vereist voor verdere groei -- bevestigd via cloud.ouraring.com/v2/docs).
- AUTORISATIE-ENDPOINT: https://cloud.ouraring.com/oauth/authorize -- Bewijsniveau A, cloud.ouraring.com/docs/authentication, verbatim teruggevonden.
- TOKEN-ENDPOINT: https://api.ouraring.com/oauth/token (authorization_code + refresh_token) -- Bewijsniveau A, zelfde bron.
- REVOKE-ENDPOINT: GET https://api.ouraring.com/oauth/revoke?access_token={access_token} -- Bewijsniveau A, EXACTE URL verbatim teruggevonden (beter bevestigd dan bij WHOOP/Garmin) -- daadwerkelijk aangeroepen in disconnect, niet alleen lokaal.
- SCOPES gebruikt: daily, heartrate, workout (van de 8 beschikbare: email, personal, daily, heartrate, workout, tag, session, spo2Daily).
- DATA-ENDPOINT (deze sprint): GET https://api.ouraring.com/v2/usercollection/workout, start_date/end_date, gepagineerd via next_token -- Bewijsniveau A, exact curl-voorbeeld verbatim teruggevonden op cloud.ouraring.com/v2/docs, gecorroboreerd door meerdere onafhankelijke clientbibliotheken met identieke veldnamen (activity als leesbare string, bv. "running"/"tableTennis" -- echt teruggevonden voorbeeldwaarden).
- CANONICAL MAPPING: activities-tabel, activity gemapt naar het strikte enum (running/cycling/rowing/swimming) -- niet-mapbare Oura-activiteiten (bv. tableTennis) bewust overgeslagen.
- DEDUPE: dedupe_key='oura-workout-'+id, bestaande unieke index, ignore-duplicates.
- TOKEN REFRESH: geimplementeerd, zelfde patroon als de andere providers.
- UI STATUS: Geimplementeerd (Lichaam -> Gezondheidsgegevens, eigen kaart).
- IMPLEMENTATION STATUS: SOFTWARE COMPLETE -- ACTIVATION BLOCKED (credentials ontbreken, self-serve, geen wachttijd tot 10 gebruikers).
- TEST STATUS: fOuraIntegration.test.js, 20/20 (OAuth-contract, activity-mapping, Vault-gebruik, daadwerkelijke revoke-aanroep geverifieerd).
- REAL DEVICE STATUS: OPEN.
- PO ACTION REQUIRED -- OURA:
  1. cloud.ouraring.com, account aanmaken/inloggen, een OAuth2-app registreren (niet het Personal Access Token-pad, dat is voor eigen-data-only-gebruik).
  2. Redirect URI registreren: https://maurice-art.netlify.app/.netlify/functions/oura-auth-callback
  3. Netlify env vars: OURA_CLIENT_ID, OURA_CLIENT_SECRET, OURA_REDIRECT_URI.
  4. Herdeploy -- direct bruikbaar voor de eerste 10 gebruikers; bij groei daarboven moet een Oura-goedkeuring worden aangevraagd (apart, niet-blokkerend aandachtspunt voor later).
- EXTERNAL BLOCKER: Ja (credentials ontbreken, self-serve, geen wachttijd).

---

## COROS (direct) -- architectuurmismatch gevonden, geen gok gebouwd

- OFFICIAL BRON: support.coros.com (COROS Help Center), eigen officiele artikelen "Connect Your Data", "Build on COROS MCP", "Partner API Access", "Submit an API Application" -- bewijsniveau A, alle vier onderling consistent.
- TWEE TOEGANGSPADEN (genuanceerder dan eerder aangenomen -- niet simpelweg "partner-gated zoals Garmin"):
  1. "Build on COROS MCP" -- zelfbediening, OAuth 2.0, GEEN goedkeuring nodig. Maar dit is letterlijk het Model Context Protocol (dezelfde soort interface als waarmee Claude zelf tools aanroept), expliciet omschreven voor "AI coaching apps that analyze training and prescribe workouts" -- ontworpen voor LIVE agent-toegang tijdens een gesprek, niet voor een geplande, server-side batch-sync-job die canonical data in een database wegschrijft (exact wat TK bij elke andere provider doet).
  2. "Partner API" -- multi-user OAuth-credentials, webhook push-notificaties, two-way data sync, GPX-routes -- architecturaal WEL de juiste vorm voor TK's daadwerkelijke behoefte, maar vereist een handmatige aanvraag (bedrijfsgegevens + technische contactpersonen + OAuth2-redirect-URI's naar api@coros.com, identiteits-/veiligheidsverificatie, standaardvoorwaarden accepteren) voordat er Client ID/Secret bestaan.
- CONCLUSIE: dit is geen eenvoudige "nog niet gebouwd, wel self-serve"-situatie zoals Fitbit/WHOOP/Oura waren. De zelfbedieningsroute (MCP) past architecturaal niet bij TK's canonical-sync-behoefte; de wel-passende route (Partner API) is partner-gated. Een MCP-client bouwen binnen een Netlify Function om alsnog batch-data te syncen zou een oneigenlijke, ongeteste architectuur-aanname zijn (JSON-RPC-achtig protocol i.p.v. eenvoudige REST-aanroepen) -- bewust niet gebouwd, geen gok.
- IMPLEMENTATION STATUS: NOT STARTED -- externe actie vereist voor de architecturaal juiste route.
- PO ACTION REQUIRED -- COROS:
  1. Beoordeel of Partner API-toegang de juiste stap is (vereist een gevestigd gebruikersbestand/platform -- controleer of TK daaraan voldoet).
  2. Zo ja: e-mail naar api@coros.com met bedrijfsgegevens, technische contactpersoon, en de beoogde OAuth2-redirect-URI (https://maurice-art.netlify.app/.netlify/functions/coros-auth-callback, naar analogie met de andere providers).
  3. Standaardvoorwaarden accepteren; na identiteits-/veiligheidsverificatie levert COROS een Client ID/Secret.
  4. Zodra credentials er zijn: de dan-toegankelijke, volledige Partner API-documentatie raadplegen voor exacte REST-endpoints (deze sessie kon dat detailniveau niet bevestigen, uitsluitend het toegangsmodel zelf) -- dan pas bouwen, zelfde discipline als de rest van deze sprint.
- EXTERNAL BLOCKER: Ja -- Partner API-goedkeuring is de architecturaal juiste, maar niet-software-oplosbare, vereiste stap.

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
- SOFTWARE COMPLETE -- ACTIVATION BLOCKED (credentials, self-serve, geen wachttijd): Polar, WHOOP, Oura (alle drie live op main).
- SOFTWARE FOUNDATION VERIFIED -- ACTIVATION BLOCKED (partner-goedkeuring vereist): Garmin.
- NOT APPLICABLE (platform sluit binnenkort, al gedekt via bestaande integratie): Fitbit -- zie eigen sectie, geen aparte code te bouwen.
- NOT STARTED, architectuurmismatch tussen de zelfbedieningsroute (MCP, voor AI-agents) en de architecturaal juiste maar partner-gated route (Partner API): COROS -- geen gok gebouwd, zie eigen sectie.
- NOT STARTED, harde platformvoorwaarde (native iOS-target): Apple HealthKit/Watch.
- GEDEELTELIJK GEDEKT via bestaande integratie, directe adapter niet bewezen noodzakelijk: Samsung Health/Galaxy Watch/Ring.

Devices/Wearables blijft NOT FROZEN totdat elke regel hierboven PRODUCT
WORKING is, of SOFTWARE COMPLETE/SOFTWARE FOUNDATION VERIFIED + exacte
external activation action known + no internal implementation gap. Voor
Garmin/COROS is dat laatste nu het geval. Apple en Samsung zijn de
eerstvolgende onderzoekspunten.

**Belangrijke les uit deze sprint**: eerder werd Garmin abusievelijk als
"NOT STARTED" geclassificeerd op basis van een te snelle, onvolledige
zoekopdracht binnen dit venster -- een volledige, degelijke fundering
bleek al te bestaan (eerder in dezelfde sessie gebouwd). Forensisch
onderzoek (git-geschiedenis, bestandsherkomst, onafhankelijke
herverificatie van elke brongebonden bewering) vóór het overschrijven of
weggooien van onverwacht aangetroffen werk is daarom vaste procedure
geworden, niet alleen voor Garmin. Bij COROS bleek het omgekeerde
probleem relevant: een op het eerste gezicht "self-serve, geen
goedkeuring nodig"-optie bleek bij nader onderzoek architecturaal niet te
passen bij wat TK nodig heeft -- zelfbediening is niet automatisch
hetzelfde als "de juiste, bruikbare optie".

