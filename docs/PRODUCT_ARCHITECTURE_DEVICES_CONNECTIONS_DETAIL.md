# Trainingskompas Target Product Architecture — Apparaten & Koppelingen

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** targetfunctionaliteit voor wearables, sportapparaten, health platforms, realtime devices, provenance, sync, data quality en gebruikersbeheer. Geen bewijs dat alle beschreven functionaliteit al gebouwd is.

## 1. Kernbeslissing

`Apparaten & koppelingen` is geen los sportproduct en geen primaire navigatiebestemming. Het is een centrale bron-/integratielaag onder Profiel/Instellingen die data levert aan Training, Historie, Inzicht, Coach en eventueel Team/Gym.

Gebruikerswaarde verschijnt in de normale sportcontext. Beheer van verbindingen gebeurt centraal.

Target:

PROFIEL / INSTELLINGEN
-> APPARATEN & KOPPELINGEN
   - Mijn apparaten
   - Verbonden accounts/platforms
   - Realtime apparaten
   - Synchronisatiestatus
   - Datatoegang / permissions
   - Databronvoorkeuren
   - Problemen oplossen
   - Ontkoppelen / data verwijderen

## 2. Harde productregel: no-wearable baseline

Iedere kernsport blijft bruikbaar zonder wearable.

- strength volledig handmatig;
- running/cycling via telefoon-GPS of handmatige invoer;
- swimming handmatig;
- Concept2 handmatig mogelijk indien device niet verbonden;
- recovery/context kan handmatig worden aangevuld.

Wearables verhogen datarijkdom/confidence; zij mogen basistraining niet blokkeren.

## 3. Integratiearchitectuur

Bronketen:

DEVICE / PLATFORM / MANUAL SOURCE
-> CONNECTOR / ADAPTER
-> RAW SOURCE RECORD + PROVENANCE
-> NORMALIZATION / CANONICAL MODEL
-> DATA QUALITY / DEDUPE / CONFLICT RESOLUTION
-> CALCULATION ENGINE
-> CONTEXT / DECISION
-> USER EXPERIENCE / AI COACH

AI ontvangt geen onbeheerde ruwe device-data als bron van waarheid.

## 4. Broncategorieën

### Wearables
Voorbeelden/doelcatalogus:
- Apple Watch / Apple Health;
- Garmin / Garmin Connect;
- Polar;
- WHOOP;
- Suunto;
- COROS;
- Fitbit / Google Health Connect waar ondersteund;
- toekomstige wearables.

### Sportapparaten / fitness equipment
- Concept2 PM5: RowErg, SkiErg, BikeErg;
- Technogym;
- EGYM;
- Life Fitness;
- Matrix;
- Precor;
- Keiser;
- Wattbike;
- Milon;
- Gym80;
- toekomstige vendors.

### Platformintegraties
- Health Connect / relevante Google health platformlaag;
- Apple Health;
- Strava;
- Garmin Connect;
- TrainingPeaks later indien passend;
- andere platforms via expliciete connector.

### Sensoren
- hartslagband;
- fietspowermeter;
- cadence sensor;
- footpod;
- GPS device;
- bewegingssensor / IMU zoals MoveSense-type integratie later;
- smart strength sensors.

## 5. Connector versus device

Niet iedere verbinding is hetzelfde.

`Connector` = software-integratie met provider/platform/vendor.
`Device` = fysiek apparaat of sensor.

Voorbeeld:
- Garmin Connect connector kan meerdere Garmin devices representeren;
- Bluetooth HR-band kan direct realtime device zijn zonder cloudaccount;
- Concept2 PM5 kan realtime BLE leveren;
- Health Connect kan data aggregeren van meerdere upstream bronnen.

De UI moet dit onderscheid begrijpelijk maken zonder technische complexiteit op de gebruiker af te schuiven.

## 6. Connection lifecycle

Statusmodel minimaal:
- NOT_CONNECTED;
- CONNECTING;
- CONNECTED;
- DEGRADED;
- PERMISSION_MISSING;
- TOKEN_EXPIRED;
- SYNC_ERROR;
- REAUTH_REQUIRED;
- DISCONNECTED.

Per verbinding zichtbaar:
- provider/device;
- status;
- laatste succesvolle sync;
- toegestane datacategorieën;
- relevante fout;
- opnieuw verbinden;
- ontkoppelen.

`Verbonden` mag niet groen worden weergegeven als benodigde scopes ontbreken of sync structureel faalt.

## 7. Permissions / scopes

Toegang tot data is expliciet per connector. Mogelijke categorieën:
- activities/workouts;
- heart rate;
- HRV;
- resting heart rate;
- sleep;
- steps/activity;
- GPS/routes;
- power;
- cadence;
- body measurements;
- calories/energy als schatting;
- reproductive/women context alleen indien provider en governance dit expliciet toestaan.

Scope missing wordt als missing weergegeven, nooit geïnterpreteerd als nul.

## 8. Provenance

Iedere geïmporteerde/canonieke waarde behoudt herkomst:
- provider;
- connector;
- physical device indien bekend;
- source record id;
- source timestamp;
- ingest timestamp;
- sync run;
- original units;
- normalized units;
- manual correction status;
- quality/confidence metadata.

Gebruiker hoeft niet standaard alle technische metadata te zien, maar moet bij activiteit/metric minstens een begrijpelijke `Gegevensbron` kunnen openen.

## 9. Canonical model

Alle connectors mappen naar gedeelde objecten waar mogelijk:
- activities;
- sessions/workouts;
- sensor streams;
- recovery measurements;
- sleep;
- body measurements;
- routes;
- device metadata;
- provenance.

Vendorvelden die niet in generiek model passen kunnen als vendor extension worden bewaard, maar mogen geen tweede parallelle waarheid creëren.

## 10. Dedupe

Dezelfde activiteit kan via meerdere bronnen binnenkomen, bijvoorbeeld:
- Garmin -> Garmin Connect;
- Garmin -> Health Connect;
- Garmin -> Strava;
- handmatige import.

Trainingskompas moet duplication candidates detecteren op basis van expliciete criteria zoals source ids, tijdvenster, sport, duur, afstand en relevante fingerprints.

Geen stil dubbele activiteit aanmaken. Geen blind samenvoegen bij onvoldoende zekerheid.

Status kan zijn:
- UNIQUE;
- DUPLICATE_CONFIRMED;
- DUPLICATE_PROBABLE;
- CONFLICT_REVIEW_REQUIRED.

## 11. Bronvoorkeur / source precedence

Er is niet één universele `beste bron` voor alles.

Voorkeur kan per datacategorie gelden, bijvoorbeeld:
- route/GPS van Garmin;
- HR van borstband;
- power van powermeter;
- sleep van wearable;
- manual correction als bewuste gebruikerscorrectie.

Source precedence is deterministisch en uitlegbaar. AI kiest dit niet ad hoc.

Gebruiker mag voorkeuren beheren waar productmatig zinvol, maar mag geen ongeldige combinatie afdwingen die berekening corrupt maakt.

## 12. Manual data en corrections

Handmatige data is een legitieme bron, niet tweederangs `fout`.

Wel zichtbaar onderscheid:
- measured/device;
- imported;
- calculated;
- estimated;
- manual;
- manually corrected.

Een handmatige correctie mag bij latere sync niet stil overschreven worden. Conflict policy is expliciet.

## 13. Realtime versus achteraf sync

Twee flows:

### Realtime
Bijvoorbeeld Concept2 PM5, HR-band, bewegingssensor.

DEVICE
-> live stream
-> execution/session
-> live metrics
-> result
-> canonical storage

### Cloud/backfill
Provider API/platform levert activiteit na afloop of periodieke sync.

PROVIDER
-> ingest
-> canonical activity
-> dedupe
-> calculations
-> insights.

De UI toont verschil waar relevant. Een cloudactiviteit hoeft niet te doen alsof hij realtime door Trainingskompas is begeleid.

## 14. Realtime connection UX

Voor een realtime training:
- apparaat vinden;
- verbinden;
- signaalstatus;
- batterij indien beschikbaar;
- relevante sensors;
- start readiness;
- reconnect tijdens sessie;
- fallback bij verlies;
- sessie niet verliezen door korte disconnect.

Data die tijdens disconnect ontbreekt wordt missing, niet geïnterpoleerd zonder expliciete calculation rule.

## 15. Concept2

Concept2 wordt als shared ergometer capability gemodelleerd:
- RowErg;
- SkiErg;
- BikeErg.

Realtime metrics kunnen o.a. omvatten:
- distance;
- elapsed time;
- pace volgens apparaat/sportbasis;
- power;
- stroke rate/cadence;
- HR;
- splits;
- intervals;
- drag factor indien betrouwbaar beschikbaar;
- PM5/source metadata.

Concept2 sessie blijft compatibel met workout execution, ook wanneer het ergometerblok onderdeel is van HYROX/WOD/functional workout. Daarom geen blind model afdwingen waarbij elk Concept2-resultaat standalone activity moet zijn.

## 16. Running / cycling devices

Outdoor activity kan device/platform-data leveren voor:
- GPS route;
- time/moving time;
- distance;
- pace/speed;
- HR;
- cadence;
- power;
- elevation;
- laps/splits;
- weather/context apart.

Vendor-specifieke advanced metrics worden alleen getoond als echt geleverd en semantisch bekend. Geen synthetische nulwaarden.

## 17. HRV en recovery provenance

HRV moet metric-type bewaren wanneer bekend, bijvoorbeeld RMSSD versus SDNN. Onbekend blijft `unknown`; nooit achteraf gokken uit alleen de numerieke waarde.

Recovery views tonen bron, recency en datakwaliteit. Eén device-signaal mag niet zelfstandig rust/overtraining bepalen.

## 18. Calories / energy

Wearable calorieverbruik is een schatting. UI en AI mogen dit niet als exact gemeten energieverbruik presenteren.

## 19. Bewegingssensoren / techniekcontrole

Premium toekomstige capability kan externe IMU/motion sensors gebruiken om beweging tijdens oefeningen te analyseren.

Architectuur:

MOTION SENSOR
-> calibrated raw motion stream
-> movement feature extraction
-> validated movement model
-> exercise context
-> technique signal + confidence
-> user/coach feedback.

Belangrijke regel: geen `correct/fout` claim zonder gevalideerd model en voldoende confidence. Sensorplaatsing, kalibratie, oefening, lichaamsbouw en devicekwaliteit moeten onderdeel van model/evidence zijn.

Dit wordt geen AI-camera-achtige goklaag. Calculation/model-output is bron; AI kan uitleggen.

## 20. Gym equipment integrations

Voor EGYM/Technogym/Life Fitness/etc. target:
- apparaat identificeren;
- user/session matchen;
- exercise/machine mapping;
- load/reps/duration/power/etc. importeren;
- canonical exercise/activity mapping;
- provenance;
- dedupe tegen handmatige log;
- gym/location context waar relevant.

Vendor-integratie mag Training Core niet vendor-afhankelijk maken.

## 21. Device Registry

Centrale registry per device/provider capability:
- provider_id;
- device_family;
- connection_type;
- supported sports;
- supported metrics;
- realtime/cloud;
- auth method;
- required scopes;
- units;
- data quality notes;
- validation status;
- firmware/app constraints;
- known limitations;
- test status;
- real-device validation status.

## 22. Validatiestatus

Per connector/device apart:
- ARCHITECTURE DEFINED;
- SOFTWARE IMPLEMENTED;
- TESTED;
- INTEGRATED;
- REAL ACCOUNT VALIDATED;
- REAL DEVICE VALIDATED;
- CLOSED.

`Software closed` en `real device validation open` mogen naast elkaar bestaan. Geen overclaim.

## 23. Datakwaliteit

Quality kan rekening houden met:
- source reliability;
- sample completeness;
- sampling rate;
- permission completeness;
- stale data;
- sensor dropout;
- GPS quality;
- device metadata;
- duplicate/conflict status;
- manual versus measured;
- known vendor limitations.

Quality is input voor Calculation/Decision/AI confidence en zichtbaar waar relevant.

## 24. Sync architectuur

Per connector:
- incremental sync;
- cursor/watermark indien provider ondersteunt;
- backfill gecontroleerd;
- idempotency;
- retry/backoff;
- rate-limit handling;
- token refresh;
- pagination;
- partial failure handling;
- last-success/last-attempt;
- observability.

Een mislukte deelbatch mag niet leiden tot dubbele volgende import.

## 25. Offline

Device cloud sync vereist netwerk, maar lokale execution moet waar mogelijk doorgaan.

Bij realtime BLE:
- korte disconnect opvangen;
- lokale buffering waar technisch passend;
- reconnect;
- geen dubbele samples/results bij sync.

## 26. Error states

Gebruiker krijgt begrijpelijke foutcategorieën:
- opnieuw inloggen nodig;
- toestemming ontbreekt;
- apparaat niet gevonden;
- Bluetooth uit;
- connector tijdelijk niet beschikbaar;
- sync mislukt;
- providerlimiet;
- data nog niet beschikbaar.

Geen technische providerstacktrace in normale UI.

## 27. Data verwijderen / ontkoppelen

Ontkoppelen en data verwijderen zijn verschillende acties.

`Ontkoppelen`:
- stopt toekomstige toegang/sync;
- tokens verwijderen/revoken waar mogelijk;
- bestaande rechtmatig opgeslagen trainingshistorie blijft volgens gekozen policy.

`Geïmporteerde data verwijderen`:
- expliciete aparte actie/policy;
- afhankelijkheden/calculated derived data correct herberekenen/verwijderen;
- audit/privacyregels volgen.

Account deletion verwijdert connector secrets/tokens volgens centrale delete-completeness regels.

## 28. Privacy

Device connection is persoonlijk tenzij expliciet organisatie/device use-case anders definieert.

Gym/coach/team krijgt niet automatisch toegang tot raw wearable data. Delen loopt via bestaande scopes/consent.

Location/route, HRV, sleep en andere gevoelige gegevens volgen hun specifieke privacybeleid.

## 29. Shared / gym devices

Een gym kan apparaten beheren die door meerdere leden worden gebruikt. Device ownership en data ownership zijn dan gescheiden.

GYM OWNS DEVICE
ATHLETE OWNS PERSONAL PERFORMANCE RECORD

Session association moet expliciet veilig zijn zodat resultaten niet bij verkeerde sporter belanden.

## 30. Pairing en identity bij shared devices

Mogelijke veilige matching later:
- QR/NFC;
- app-to-device pairing;
- temporary session code;
- vendor user mapping;
- staff-assisted assignment.

Geen herkenning uitsluitend op naam of toevallige tijd zonder voldoende zekerheid.

## 31. Device management voor Gym/Club

Privileged gymrollen kunnen later beheren:
- device inventory;
- locatie;
- type/model;
- status;
- pairing capability;
- maintenance flag;
- supported workouts;
- vendor integration status.

Gewoon MEMBER kan geen organisatiebrede apparatuurconfig wijzigen.

## 32. Device health / observability

Voor beheerde apparaten/connectors:
- online/offline indien bekend;
- last seen;
- firmware/version indien beschikbaar;
- sync errors;
- failed pairing rate;
- provider health.

Dit is operationele metadata, geen athlete health data.

## 33. Apparaten op Home/Training

Geen aparte hoofdnavigatietab nodig.

Contextueel:
- Home kan `Garmin sync mislukt` tonen;
- Training kan `Concept2 verbinden` tonen;
- Running kan actuele GPS/HR source tonen;
- Inzicht toont bron/confidence;
- Profile beheert alle connections.

## 34. Multi-device session

Eén training kan data combineren uit meerdere bronnen:
- telefoon GPS;
- borstband HR;
- powermeter;
- cadence sensor;
- wearable;
- gym machine.

Source merge is per metric, niet `één device wint alles`.

Voorbeeld:
GPS = phone
HR = chest strap
Power = bike power meter
Cadence = bike sensor

De canonical session behoudt provenance per metric/stream.

## 35. Sensor conflicts

Als twee bronnen dezelfde metric leveren:
- deterministic source rule;
- quality/confidence;
- explicit conflict handling;
- optionele user preference.

Geen gemiddelde nemen zonder gevalideerde calculation rule.

## 36. Security

Connector secrets/tokens:
- nooit client-side onbeveiligd opslaan;
- least privilege scopes;
- revocation;
- secure server storage;
- logs zonder secrets;
- OAuth state/PKCE waar providerflow dit vereist;
- CSRF/replay bescherming volgens flow.

Bluetooth/device identifiers worden alleen opgeslagen als nodig.

## 37. Entitlements

Basisverbindingen kunnen athlete-tier features zijn; geavanceerde realtime devices, motion analysis of gym fleet management kunnen premium/B2B capabilities worden.

Entitlement mag nooit privacy/security of data ownership omzeilen.

## 38. Minimum target voor functionele volwassenheid >=9

Voor Devices & Connections minimaal:
- centrale connection management UI;
- duidelijke status/last sync;
- permissions/scopes;
- reconnect/disconnect;
- provenance;
- canonical mapping;
- dedupe;
- source precedence/conflicts;
- no-wearable fallback;
- error states;
- retry/idempotency;
- security/token handling;
- delete/export behavior;
- data quality/confidence;
- real-account/device validationstatus expliciet;
- multi-device metric provenance;
- tests per connector;
- geen unsupported vendorclaims.

## 39. UX-regel

Nog geen definitieve schermvormgeving. Eerst functionele targetarchitectuur completeren; daarna Apparaten & Koppelingen scherm-voor-scherm visualiseren en pas na product-ownergoedkeuring bouwen.
