# WEARABLE_ACTIVATION_AND_DEVICE_PROOF.md

Canoniek activatie- en bewijsregister voor Devices/Wearables V1 MUST.
Vervangt geen enkele claim uit docs/DEVICES_PROVIDER_TRACKER.md, maar
maakt per provider/device expliciet welke laag van de statusvocabulaire
bereikt is en welke niet.

## Fundamentele beperking van deze sessie (eerlijk vermeld, geldt voor het
## hele register hieronder)

Deze sessie draait in een gesandboxte Linux-container zonder fysieke
wereldtoegang: geen Bluetooth-radio, geen fysieke apparaten (PM5, HR-band,
powermeter, CSC-sensor, FTMS-machine, Samsung-toestel), geen macOS/Xcode,
en geen toegang tot fysieke iPhones -- ook niet als die elders voor de PO
beschikbaar zijn. Er zijn ook geen Polar/WHOOP/Oura/Garmin/COROS-
credentials aanwezig; die kan alleen de PO zelf aanmaken via de
respectievelijke developer-portalen. Elk "AUTH PROVEN"/"SYNC PROVEN" in
eerdere documentatie betekent daarom uitsluitend: bewezen tegen een
gemockte, doch tegen officiele documentatie geverifieerde, netwerkrespons
-- nooit tegen een echte provider-server of fysiek apparaat. Dit register
maakt dat onderscheid nu overal expliciet i.p.v. het te laten meeliften in
een algemene "compleet"-claim.

Statusvocabulaire (exact, per rij hieronder ingevuld):
SOFTWARE COMPLETE / UI ACCESSIBLE / PRODUCTION ACTIVE / ACTIVATION READY /
AUTH PROVEN / SYNC PROVEN / CANONICAL INGEST PROVEN / DEDUPE PROVEN /
RECONNECT PROVEN / REVOKE PROVEN / REAL PROVIDER PROVEN / REAL DEVICE
PROVEN / EXTERNAL BLOCKER.

---

## A. Google Health (incl. Fitbit-successor-pad, incl. workouts)

- V1 MUST: Ja.
- Software: COMPLETE. UI: ACCESSIBLE. Production: ACTIVE (live migraties,
  live Netlify functions).
- Credentials needed: Nee -- al geconfigureerd (client ID/secret staan al
  op Netlify, self-serve Google Cloud Console-project bestaat al).
- Partner approval: Nee. Hardware: Nee. macOS/Xcode: Nee.
- Callback URL: (bestaand, ongewijzigd deze sprint) -- zie
  wearable-auth-start.js/wearable-auth-callback.js.
- Scopes: HRV/RHR/sleep/steps (bestaand) + activity_and_fitness.readonly
  (workouts, code aanwezig, zie hieronder).
- Test account beschikbaar: Nee (geen Google-testaccount in deze sessie).
- AUTH PROVEN: Nee (mocked, tegen officiele foutcontracten/response-
  schema's, nooit tegen echte Google-servers).
- SYNC PROVEN: Nee (idem, mocked).
- CANONICAL INGEST PROVEN: Nee (mocked).
- DEDUPE PROVEN: Nee (ontwerp + unit-test tegen de dedupe_key-logica,
  geen echte dubbele provider-respons ooit verwerkt).
- RECONNECT/REVOKE PROVEN: Nee.
- REAL PROVIDER PROVEN: Nee. REAL DEVICE PROVEN: N.v.t. (cloud-API, geen
  apparaat).
- EXACT OPEN PUNT: verifieren of de scope
  `googlehealth.activity_and_fitness.readonly` is vrijgegeven op het
  OAuth-consent-scherm in de Google Cloud Console van het
  productieproject (zie eerdere Fitbit Successor Certification) --
  zonder die verificatie kan zelfs een PO met een eigen Google-account
  de workout-sync niet end-to-end proberen.
- EXTERNAL BLOCKER: Ja -- een test-Google-account (bij voorkeur van de
  PO zelf, `maurice@...`) dat de bestaande "Fitbit koppelen"-knop
  doorloopt, is de enige weg naar echte AUTH/SYNC/CANONICAL INGEST-
  proof. Dit is geen ontwikkelblocker.
- NEXT ACTION (PO): open Trainingskompas, ga naar Lichaam ->
  Gezondheidsgegevens, tik "Fitbit koppelen", doorloop de Google-
  toestemmingsflow met een echt Google-account, en meld terug wat er
  gebeurt (inclusief eventuele foutmelding exact overgetypt of
  gescreenshot). Dat ene rondje levert AUTH PROVEN + SYNC PROVEN op
  voor de kernmetrics in een keer.

## B. Polar AccessLink

- V1 MUST: Ja. Software: COMPLETE. UI: ACCESSIBLE. Production: ACTIVE
  (schema klaar, geen migratie nodig).
- Credentials needed: Ja (self-serve, geen wachttijd).
- Partner approval: Nee. Hardware: Nee. macOS/Xcode: Nee.
- PO ACTION CARD:
  ```
  OFFICIELE URL:        admin.polaraccesslink.com
  ACCOUNT:              Gratis Polar Flow-account (geen apparaat nodig)
  APP REGISTREREN:      "Create new client" in het AccessLink-dashboard
  REDIRECT URI:         https://maurice-art.netlify.app/.netlify/functions/polar-auth-callback
  CLIENT ID/SECRET:     Direct zichtbaar na aanmaken, eenmalig
  SCOPES:               accesslink.read_all (vast, geen keuze)
  WEBHOOK:              Niet gebruikt door deze implementatie (polling-
                         model via exercise-transactions)
  WAT PO TERUGGEEFT:    POLAR_CLIENT_ID, POLAR_CLIENT_SECRET,
                         POLAR_REDIRECT_URI als Netlify env vars, dan
                         herdeployen
  ```
- Test account beschikbaar: Nee. AUTH/SYNC/CANONICAL INGEST/DEDUPE/
  RECONNECT/REVOKE PROVEN: Nee (mocked, zie fPolarIntegration.test.js).
- REAL PROVIDER PROVEN: Nee.
- EXTERNAL BLOCKER: Credentials (self-serve, ~5 minuten werk voor de PO).
- NEXT ACTION (PO): bovenstaande kaart doorlopen, credentials terugkoppelen
  (of zelf op Netlify zetten), daarna een echte Polar-koppeling proberen.

## C. WHOOP

- V1 MUST: Ja. Software: COMPLETE. UI: ACCESSIBLE. Production: ACTIVE.
- PO ACTION CARD:
  ```
  OFFICIELE URL:        developer.whoop.com (dashboard achter id.whoop.com-login)
  ACCOUNT:              WHOOP-account (geen band vereist voor test-mode-apps)
  APP REGISTREREN:      Team aanmaken (indien nog niet gedaan) -> nieuwe App
  REDIRECT URI:         https://maurice-art.netlify.app/.netlify/functions/whoop-auth-callback
  CLIENT ID/SECRET:     Zichtbaar in het Developer Dashboard na aanmaken
  SCOPES:               offline read:profile read:recovery read:sleep
                         read:workout read:cycles read:body_measurement
  WEBHOOK:              Niet gebruikt door deze implementatie (polling)
  WAT PO TERUGGEEFT:    WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET,
                         WHOOP_REDIRECT_URI als Netlify env vars
  ```
- Test account beschikbaar: Nee. AUTH/SYNC/CANONICAL INGEST/DEDUPE/
  RECONNECT PROVEN: Nee (mocked, fWhoopIntegration.test.js).
- REVOKE PROVEN: Nee -- bovendien: het exacte externe revoke-endpoint is
  zelf niet met dezelfde zekerheid bevestigd als de OAuth-endpoints
  (zie eerdere bevinding); disconnect verwijdert lokale tokens sowieso.
- EXTERNAL BLOCKER: Credentials (self-serve).
- NEXT ACTION (PO): bovenstaande kaart doorlopen.

## D. Oura

- V1 MUST: Ja. Software: COMPLETE. UI: ACCESSIBLE. Production: ACTIVE.
- PO ACTION CARD:
  ```
  OFFICIELE URL:        cloud.ouraring.com (Oura Cloud-portaal)
  ACCOUNT:              Oura-account (fysieke ring niet vereist om een
                         API-applicatie te registreren, wel om er echte
                         data mee te genereren)
  APP REGISTREREN:      "API Applications" -> nieuwe applicatie
  REDIRECT URI:         https://maurice-art.netlify.app/.netlify/functions/oura-auth-callback
  CLIENT ID/SECRET:     Zichtbaar na aanmaken
  SCOPES:               daily heartrate workout
  WEBHOOK:              Niet gebruikt (polling)
  WAT PO TERUGGEEFT:    OURA_CLIENT_ID, OURA_CLIENT_SECRET,
                         OURA_REDIRECT_URI als Netlify env vars
  LET OP:               tot 10 gebruikers zonder Oura-goedkeuring;
                         daarboven is een aparte goedkeuringsstap nodig
                         (geen blokkade voor nu/testen)
  ```
- Test account beschikbaar: Nee. AUTH/SYNC/CANONICAL INGEST/DEDUPE/
  RECONNECT PROVEN: Nee (mocked, fOuraIntegration.test.js).
- REVOKE PROVEN: Nee, maar het externe revoke-endpoint zelf is wel
  A-niveau bevestigd (verbatim teruggevonden) en wordt al aangeroepen in
  disconnect -- alleen de daadwerkelijke live aanroep is nooit uitgevoerd.
- EXTERNAL BLOCKER: Credentials (self-serve).
- NEXT ACTION (PO): bovenstaande kaart doorlopen.

## E. Garmin

- V1 MUST: Ja. Software: FOUNDATION VERIFIED. UI: ACCESSIBLE (eerlijk
  disabled totdat actief). Production: ACTIVE (migratie v561 live).
- PO ACTION CARD: ongewijzigd t.o.v. de eerdere, exacte kaart in
  docs/DEVICES_PROVIDER_TRACKER.md (Garmin Connect Developer Program-
  aanvraag, zakelijke rechtvaardiging vereist, geen zelfregistratie).
- Test account beschikbaar: Nee. Niets hierboven PROVEN.
- EXTERNAL BLOCKER: Partnergoedkeuring (geen exacte doorlooptijd publiek
  bekend/bevestigd in deze sessie) -- dit is de enige provider in de V1-
  lijst waarbij zelfs het AANVRAGEN van credentials een menselijke
  beoordeling door Garmin doorloopt, dus dit kost realistisch meer tijd
  dan de self-serve providers.
- NEXT ACTION (PO): Developer Program-aanvraag indienen op
  developerportal.garmin.com. Dit is de PO-actie met de langste
  verwachte doorlooptijd in dit hele register -- overweeg deze het
  eerst te starten, ook al is de software er nog niet 100% klaar voor
  qua webhook-payload-schema (dat kan pas na portaaltoegang worden
  afgerond).

## F. COROS

- V1 MUST: Ja. Software: NOT STARTED (architectuurmismatch, geen gok
  gebouwd -- zie eigen sectie in de tracker).
- DOCUMENTATION + ACTIVATION BLOCKER: de architecturaal juiste route
  (Partner API) vereist een aanvraag (api@coros.com) vóórdat de volledige
  contractdocumentatie (exacte endpoints) uberhaupt toegankelijk is --
  dit is dus tegelijk een documentatie- EN activatieblokkade, niet
  alleen een activatieblokkade zoals bij Garmin (waar het contract zelf
  al wel publiek gedocumenteerd is).
- NEXT ACTION (PO): beoordeel eerst of COROS-ondersteuning de
  investering waard is gezien deze extra drempel; zo ja, e-mail naar
  api@coros.com conform de eerdere PO Action Card.

## G. Apple HealthKit / Apple Watch

- V1 MUST: Ja. Software: ARCHITECTURE DESIGNED (geen Swift-code, bewust).
- OMGEVINGSCONTROLE (herbevestigd deze ronde): geen `ios/`-map, geen
  `pod`/`xcodebuild`/`xcode-select` beschikbaar in deze sandbox.
- BELANGRIJK: de opdracht noemt twee beschikbare iPhones voor validatie.
  Ik kan die vanuit deze sessie niet aanspreken -- er is geen fysieke of
  netwerktoegang tot een iPhone vanuit deze Linux-container, en het
  Xcode-buildproces dat nodig is om er uberhaupt een testbare TK-app op
  te krijgen kan hier niet draaien (vereist macOS). De twee iPhones zijn
  dus pas bruikbaar zodra een macOS/Xcode-omgeving (van de PO, of een
  toekomstige sessie met die omgeving) `npx cap add ios` heeft gedraaid
  en een build naar die toestellen heeft gepusht.
- PO ACTION CARD: ongewijzigd t.o.v. de eerdere kaart (Apple Developer
  Program, macOS/Xcode-omgeving, HealthKit-capability, testtoestel --
  de twee iPhones vervullen die laatste eis al zodra er een build is).
- TESTPLAN (klaarzetten voor zodra de omgeving er is, NIET nu uit te
  voeren): iPhone A voor het happy path (install/permissions/HealthKit-
  read/sync/workout/steps/slaap/HR-RHR-HRV/disconnect-reconnect), iPhone
  B voor het adversariale pad (partiele/geweigerde permissies, herstart,
  herinstallatie, dubbele sync, ontbrekende data, ingetrokken permissies,
  verschillende bron-apps). Dit testplan staat klaar in
  docs/MS-F5-04_APPLE_HEALTHKIT_ARCHITECTURE.md en wordt hier niet
  herhaald.
- NEXT ACTION (PO): een macOS-omgeving beschikbaar stellen (eigen Mac of
  macOS CI-runner) waarin een toekomstige sessie `npx cap add ios` kan
  draaien; daarna is de eerste Xcode-build naar iPhone A het eerste
  concrete real-device-moment.

## H. Samsung Health / Galaxy Watch / Galaxy Ring

- V1 MUST: Ja. Software: onbevestigd of al (gedeeltelijk) gedekt via de
  bestaande Google Health-koppeling (architectuurnuance eerder
  gecorrigeerd).
- PO ACTION CARD: een Samsung-account met Galaxy Watch/Ring, gekoppeld
  aan zowel Samsung Health als de Google Health-cloud-koppeling van TK,
  beschikbaar stellen. Android-versie/SDK-vereisten voor een eventuele
  directe Samsung Health Data SDK-integratie zijn niet apart onderzocht
  deze ronde (pas relevant als de aggregatieroute onvoldoende blijkt).
- NEXT ACTION (PO): als een Galaxy-toestel beschikbaar is, eerst de
  bestaande "Fitbit koppelen"-knop (Google Health) ermee proberen en
  rapporteren welke metrics daadwerkelijk binnenkomen, vóórdat een
  aparte Samsung-adapter wordt overwogen.

## I-M. Concept2 PM5 / BLE HR / BLE Cycling Power / BLE CSC / FTMS

- V1 MUST: Ja voor alle vijf. Software: COMPLETE (alle vijf transports
  gebouwd, getest tegen officiele/adversarieel-bevestigde specificaties).
- REAL DEVICE PROVEN: Nee voor alle vijf -- deze sessie heeft geen
  Bluetooth-radio en geen fysieke apparaten. Geen enkel eerder testresultaat
  in deze codebase claimt iets anders; alle bestaande tests zijn tegen
  gesimuleerde GATT-payloads o.b.v. de officiele Bluetooth SIG-specificaties.
- NEXT ACTION (PO): zodra fysieke apparaten beschikbaar zijn (PM5,
  HR-band, powermeter, CSC-sensor, FTMS-machine), de bestaande testplannen
  uit de eerdere FTMS/BLE-sprintrapporten volgen (discovery/connect/
  mid-workout-attach/reconnect/disconnect, per sectie 16-21 van deze
  opdracht) -- de software-kant hiervan is al klaar, dit is zuiver
  hardware-in-de-hand-testen, geen ontwikkelwerk.

## N. Integrated duplicate-provider proof (dedupe real-world)

- Kan pas getest worden zodra minimaal twee overlappende bronnen
  (bv. Google Health + een self-serve provider, of PM5-proprietary +
  PM5-FTMS) tegelijk actief zijn met een echt account/apparaat. Nu
  NOT TESTABLE -- volgt vanzelf zodra A-D of I-M real-world actief zijn.

---

## Samenvatting: wat is de kortste weg naar het EERSTE echte bewijs?

Van alle providers in dit register zijn er precies **drie zonder enige
wachttijd**: Polar, WHOOP, Oura. Elke van de drie is een kwestie van
~5-10 minuten in een gratis developer-portaal, gevolgd door twee
Netlify-omgevingsvariabelen. Dat levert het eerste echte AUTH PROVEN +
SYNC PROVEN + CANONICAL INGEST PROVEN-bewijs in dit hele register op,
zonder te wachten op Garmin/COROS-goedkeuring of een macOS-omgeving.
Google Health kost zelfs nul setup-tijd (credentials staan al klaar) --
alleen een echt Google-account dat de bestaande knop doorloopt.

Dit register claimt daarom bewust NERGENS "REAL PROVIDER PROVEN" of
"REAL DEVICE PROVEN" — die kolommen blijven "Nee" totdat een van de
hierboven genoemde PO-acties daadwerkelijk is uitgevoerd en teruggemeld,
met de evidence-velden uit sectie 28 van de opdracht (datum, app-versie,
main-SHA, device, testcase, verwacht/werkelijk, screenshot/log).
