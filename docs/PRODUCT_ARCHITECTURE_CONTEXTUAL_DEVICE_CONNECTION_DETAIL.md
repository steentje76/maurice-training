# Trainingskompas Target Product Architecture — Contextual Device Connection

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Parent:** `PRODUCT_ARCHITECTURE_DEVICES_CONNECTIONS_DETAIL.md`

## Productbeslissing

Een gebruiker moet een geschikt realtime apparaat direct vanuit een workout of workoutonderdeel kunnen koppelen. Hiervoor hoeft de gebruiker niet eerst naar `Profiel -> Apparaten & koppelingen` te navigeren.

Dit is een harde target requirement voor Concept2 en een gedeelde capability voor andere realtime sensoren/apparaten.

## Kernflow

WORKOUT / WORKOUT BLOCK
-> detect required/compatible device capability
-> discover compatible nearby/saved device
-> connect/pair
-> validate signal/readiness
-> execute block
-> attach live data to exact execution/block
-> canonical result + provenance

## Concept2 voorbeeld

Een HYROX-workout kan bijvoorbeeld bestaan uit:
- Run 1 km
- SkiErg 1000 m
- Sled Push
- Run 1 km
- RowErg 1000 m

Wanneer het SkiErg-blok actief wordt toont Trainingskompas contextueel:
- `Concept2 PM5 verbinden`
- gevonden compatible PM5-apparaten;
- eerder gebruikt/opgeslagen apparaat indien beschikbaar;
- `Handmatig uitvoeren`;
- `Overslaan` waar de workoutregels dat toestaan.

Na verbinding worden realtime metrics aan precies dat SkiErg-blok gekoppeld. Het resultaat wordt geen kunstmatige losse standalone activity wanneer het onderdeel is van de canonical workout execution.

Hetzelfde geldt voor een RowErg- of BikeErg-blok binnen een gemengde workout.

## Pure Concept2 training

Ook een vrije ergometertraining ondersteunt dezelfde capability:

Vrij trainen
-> Ergometer
-> RowErg / SkiErg / BikeErg
-> Concept2 verbinden
-> uitvoering
-> resultaat

Er is dus één gedeelde Concept2 realtime capability, ongeacht of deze wordt gestart vanuit vrije training, een eigen workout, programmaworkout of HYROX/multisport-context.

## Automatisch herkennen

Als een gebruiker eerder een compatible PM5 heeft gekoppeld mag Trainingskompas dit contextueel voorstellen, bijvoorbeeld:

`Concept2 RowErg PM5 gevonden — Verbinden`

Niet automatisch verbinden zonder passende permission/productregel wanneer dat onverwacht of privacygevoelig kan zijn.

## Fallback is verplicht

Een deviceprobleem mag een normale workout niet blokkeren.

Minimaal waar zinvol:
- apparaat verbinden;
- handmatig uitvoeren/loggen;
- opnieuw proberen;
- onderdeel overslaan indien workoutregels dit toestaan.

`No-wearable baseline` blijft leidend.

## Meerdere devices in één workout

Een workout kan meerdere bronnen tegelijk gebruiken, bijvoorbeeld:

HYROX WORKOUT
- Run -> telefoon/Garmin GPS + Polar HR
- SkiErg -> Concept2 PM5
- Sled Push -> manual, later motion sensor
- RowErg -> Concept2 PM5
- Lunges -> manual, later motion sensor

Trainingskompas bewaart provenance per relevante metric/block. Eén workout kan dus meerdere devices en handmatige data combineren zonder de execution op te splitsen in kunstmatige onafhankelijke workouts.

## Shared device capability

De contextual connection capability moet generiek zijn en later ook bruikbaar voor:
- hartslagband;
- fietspowermeter;
- cadence sensor;
- smart trainer;
- footpod;
- bewegingssensor / IMU;
- smart strength/gym equipment;
- andere gevalideerde realtime apparaten.

Een SportDefinition/workout block bepaalt welke device capabilities relevant/compatible zijn.

## Device capability matching

Niet zoeken op merknaam alleen. Matching gebeurt op capability/context, bijvoorbeeld:
- ERGOMETER_ROW;
- ERGOMETER_SKI;
- ERGOMETER_BIKE;
- HEART_RATE;
- CYCLING_POWER;
- CADENCE;
- MOTION_SENSOR.

Een verkeerd apparaat mag niet stil aan een incompatibel workoutonderdeel worden gekoppeld.

## Connection lifecycle tijdens execution

Minimaal:
- DISCOVERING;
- FOUND;
- CONNECTING;
- CONNECTED;
- DEGRADED;
- DISCONNECTED;
- RECONNECTING;
- FAILED.

Korte disconnects mogen de hele workout niet vernietigen. Ontbrekende samples blijven missing; niet verzinnen/interpoleren zonder expliciete calculation rule.

## Live gebruikersinformatie

Bij een verbonden PM5 kan de execution afhankelijk van sport/context realtime tonen:
- elapsed time;
- distance;
- pace;
- power;
- stroke rate/cadence;
- HR als beschikbaar;
- interval/split progress;
- connection/signal status.

Alleen werkelijk beschikbare metrics tonen. Missing is niet zero.

## Exacte block association

Live data krijgt een expliciete relatie met:
- workout_execution_id;
- workout_block/exercise id;
- device/session id;
- start/end timestamps;
- provenance/source.

Dit voorkomt dat een Concept2-resultaat na afloop alleen los in Historie terechtkomt zonder relatie met de workout waarin het is uitgevoerd.

## Planned versus actual

Het geplande block kan bijvoorbeeld `SkiErg 1000 m` zijn. De actual execution bewaart feitelijk resultaat apart:
- actual distance;
- actual duration;
- actual pace/power;
- completion status;
- source/device.

Planning wordt niet overschreven door actual data.

## Dedupe

Als hetzelfde Concept2-resultaat later ook via een cloud/providerimport beschikbaar komt, moet de centrale dedupe/provenance-laag voorkomen dat een tweede execution/activity ontstaat.

Realtime result en latere cloudrecord kunnen naar dezelfde canonical execution verwijzen wanneer matching voldoende betrouwbaar is.

## Privacy en shared equipment

Bij een gedeeld gymapparaat moet vóór data-associatie voldoende zekerheid bestaan over de actieve athlete. Het feit dat een PM5/gymapparaat eigendom is van een gym geeft de gym niet automatisch eigendom/toegang tot alle persoonlijke trainingsdata.

## UX-regel

Dit document legt functionele flow vast, nog niet het definitieve schermontwerp. In de latere UX-fase wordt de contextual connect flow per relevante execution-screen als concrete mock-up aan de product owner voorgelegd vóór implementatie.

## Minimum acceptance

Voor een volwaardige contextual Concept2 flow is minimaal nodig:
- compatible PM5 vanuit workout/block kunnen ontdekken;
- verbinden zonder Settings-omweg;
- duidelijke connected/error status;
- live metrics aan exact block koppelen;
- reconnect/failure fallback;
- handmatige fallback;
- canonical result/provenance;
- geen dubbele standalone activity bij embedded ergometer block;
- dedupe tegen latere imports;
- tests voor wrong-device/wrong-block association en disconnect/retry.
