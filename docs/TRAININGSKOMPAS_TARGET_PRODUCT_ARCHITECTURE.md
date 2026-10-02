# Trainingskompas Target Product Architecture

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Doel:** toekomstige product- en schermarchitectuur vastleggen vóór UX-implementatie.  
**Belangrijk:** dit document beschrijft de **TARGET**-architectuur. Het is geen bewijs dat de beschreven functionaliteit al gebouwd is. Voor de actuele code-verified situatie blijft `docs/TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md` leidend.

## 1. Werkvolgorde

1. Productfunctionaliteit en productarchitectuur eerst compleet en richting benchmark >=9 brengen.
2. Daarna UX/schermen scherm-voor-scherm uitwerken.
3. Product owner ziet en beoordeelt eerst een concreet voorbeeld/mock-up.
4. Pas na goedkeuring implementeren.
5. Geen bestaande of verborgen capability verliezen door het redesign.

## 2. Voorgestelde hoofdstructuur

Primaire bestemmingen:

- Vandaag
- Trainen
- Inzicht
- Coach
- Samen

Profiel & Instellingen via profiel/avatar buiten de primaire vijf tabs.

### Vandaag

Doel: wat is vandaag belangrijk?

- Dagstatus
- Training(en) van vandaag
- Readiness/herstel
- Planning vandaag
- Belangrijkste signalen
- Coachadvies
- Recente voortgang
- Snelle acties

**Snelle acties zijn personaliseerbaar.** De gebruiker kan relevante acties toevoegen, verwijderen en herschikken. Er komt één centrale Quick Action Registry. Kritieke systeemmeldingen/planning mogen niet verdwijnen door personalisatie.

Voorbeelden: Training starten, Hardlopen, Fietsen, Kracht, Kalender, Training plannen, Mijn programma, Herstel, Routes, Oefening, Voeding, AI Coach, Team, Challenge.

## 3. Profiel & identiteit

Persoonlijk profiel en accountinstellingen worden conceptueel gescheiden.

Persoonlijk profiel:

- Profielfoto
- Naam
- Bio
- Sporten
- Niveau
- Doelen
- Bewust gekozen zichtbaarheid

**PROFILE-AVATAR-001:** gebruiker kan profielfoto uploaden, vervangen en verwijderen. Eén centrale avatarbron wordt hergebruikt in Profiel, Social, Team, Coach/PT, Gym/Club, Challenges en andere relevante productgebieden. Protected/private storage, filetype/size-validatie en fallback-avatar zijn vereist.

Account/instellingen:

- Apparaten & koppelingen
- Meldingen
- Privacy & toestemming
- Data/export
- Abonnement
- Account
- Help
- App-instellingen

## 4. Generiek sportmodel

Nieuwe sporten mogen niet als nieuwe parallelle apps worden gebouwd. Iedere sport gebruikt waar mogelijk dezelfde keten:

SPORT -> TRAININGSTYPE -> WORKOUT/SESSIE -> PROGRAMMA -> PLANNING -> UITVOERING -> DATA/SENSOREN -> RESULTAAT -> HISTORIE -> VERGELIJKEN -> ANALYSE -> CONTEXT/DECISION -> COACHING

Een SportDefinition bepaalt onder meer:

- sportfamilie
- indoor/outdoor
- individueel/team
- GPS/route
- elevation
- intervals/laps
- distance/duration
- pace/speed
- power
- heart rate
- cadence
- techniek/oefeningen
- programma's
- events/wedstrijden
- teamcapabilities
- ondersteunde devices
- calculations
- vergelijkingen

### Sportfamilies / doelcatalogus

**Kracht & weerstand:** algemene kracht, bodybuilding/hypertrofie, powerlifting, weightlifting, calisthenics, functional/circuit strength.  
**Running:** hardlopen, trailrunning, treadmill.  
**Cycling:** road, mountainbike, gravel, indoor cycling/smart trainer, commuting/recreational.  
**Swimming:** pool swimming, open water.  
**Ergometers:** RowErg, SkiErg, BikeErg.  
**Hybrid:** HYROX, functional fitness/conditioning.  
**Multisport:** triathlon, duathlon, brick.  
**Outdoor:** walking, hiking, Nordic walking.  
**Team:** voetbal, hockey, basketbal, handbal, volleybal, rugby, American football, korfbal en uitbreidbaar.  
**Racket:** tennis, padel, badminton, squash, tafeltennis.  
**Winter:** skiën, snowboarden, langlaufen, schaatsen.

Niet iedere sport hoeft direct v1-volwassen te zijn; de architectuur moet uitbreiding zonder herbouw ondersteunen.

## 5. Trainen - target productstructuur

- Vandaag trainen
- Planning & Kalender
- Programma's
- Mijn trainingen
- Training maken
- Vrij trainen
- Oefeningen
- Routes
- Wedstrijden & events
- Historie

Belangrijk onderscheid:

- **Training maken** = één workout.
- **Programma maken** = reeks workouts over tijd.
- **Mijn trainingen** = herbruikbare workouts.
- **Mijn programma's** = programma's/planning over meerdere weken.

Workout Builder blijft conceptueel editor achter `Training maken`; normale starts convergeren naar één execution/logging-keten.

## 6. Planning & Kalender

Planning is een eersteklas capability, niet een hulpscherm.

Weergaven:

- Dag
- Week
- Maand
- Agenda/lijst

Planbare objecten:

- workout
- programmaworkout
- wedstrijd/event
- teamtraining/team-event
- herstel/rust
- testmoment
- custom sportevent

Gebruiker kan plannen, verplaatsen, dupliceren, overslaan, uitstellen, herhalen, vervangen en als uitgevoerd markeren. Verplaatsen mag de historie niet wissen.

Statusmodel minimaal:

- PLANNED
- READY
- STARTED
- COMPLETED
- SKIPPED
- MISSED
- MOVED
- CANCELLED

De kalender is sportoverstijgend: één planning voor de atleet, niet losse kalenders per sport.

### Gemiste training

Niet automatisch doorschuiven. Gebruiker kiest bijvoorbeeld:

- alsnog plannen
- overslaan
- vervangen
- aangeven dat hij/zij hem wel heeft uitgevoerd

### Kalender-sync

Target integraties:

- Google Calendar
- Apple Calendar
- Microsoft Outlook / Microsoft 365
- iCal

Fase 1: gecontroleerde export/sync vanuit Trainingskompas.  
Fase 2: gecontroleerde two-way sync van planningvelden zoals datum/tijd/duur/status. Externe agenda mag nooit trainingsinhoud of Decision Engine-regels overschrijven.

Trainingskompas blijft bron van waarheid voor trainingsinhoud.

Agenda-conflicten kunnen worden gesignaleerd, niet automatisch opgelost zonder toestemming.

Tijdzone moet expliciet bij event/planning worden gemodelleerd.

## 7. Programma's

Programmatypen naar bron:

- Trainingskompas-programma
- Zelfgemaakt programma
- Coach/PT-programma
- Team/Gym-programma

Programma's kunnen single-sport of multisport zijn.

Program object bevat minimaal:

- naam
- sport of sporten
- doel
- niveau
- startdatum
- event/doeldatum
- duur/weken
- fases
- weken
- geplande sessies
- progression rules
- recovery rules
- toegestane adaptaties
- sportcontext
- evidence/version

Voorbeelden:

- Running: start met hardlopen, 5 km, 10 km, halve marathon, marathon, trail, snelheid/threshold, wedstrijdvoorbereiding.
- Cycling: conditie, threshold/FTP, endurance, klimmen, Gran Fondo, time trial, MTB, indoor winterprogramma.
- Strength: algemene kracht, hypertrofie, maximale kracht, powerlifting.
- Swimming: beginner, techniek, endurance, snelheid, triathlon swim.
- HYROX: beginner/intermediate/advanced, wedstrijdvoorbereiding, station focus, running focus.
- Triathlon/multisport: sprint, olympisch, middle/long distance, duathlon, bricks.

Programma kan automatisch in kalender worden geplaatst op basis van start/eventdatum, beschikbare trainingsdagen en andere vaste trainingen; gebruiker ziet preview en bevestigt.

Programma mag beperkte adaptatieregels bevatten, maar AI mag nooit zelfstandig buiten expliciete Decision Rules het programma herschrijven. AI legt alleen toegestane beslissingen uit.

Meerdere programma's tegelijk moeten mogelijk zijn; conflictanalyse signaleert combinaties maar blokkeert alleen als een expliciete regel dat vereist.

Coach/PT-programma's krijgen rechten zoals athlete_can_move, athlete_can_skip, athlete_can_edit_workout en eventueel coach approval.

## 8. Outdoor Route / GPS Capability

Routefunctionaliteit is gedeeld en niet hardcoded voor alleen running/cycling.

Geschikt voor o.a. running, trail, road cycling, MTB, gravel, walking, hiking, open-water swimming, skiën/langlaufen.

Canonical route/activity kan bevatten:

- route geometry/GPS samples
- start/finish
- distance
- total/moving time
- elevation gain/loss
- min/max elevation
- pace/speed
- HR
- power
- cadence
- laps/splits
- timestamped samples
- device/source/provenance
- data quality/confidence

Missing is niet hetzelfde als zero.

### Running

Trainingstypes o.a. free/easy/recovery/long/tempo/threshold/interval/fartlek/hills/race pace/trail/treadmill/test/race.

Outdoor detail kan tonen: grote routekaart, afstand, tijd, pace, HR, HR-zones, cadence, power indien werkelijk beschikbaar, elevation gain/loss, hoogteprofiel, splits/laps, weer/context, device/provenance.

### Cycling

Road/MTB/gravel/indoor/smart trainer/recreational. Trainingsvormen o.a. free/recovery/endurance/tempo/sweet spot/threshold/VO2/interval/climbing/long ride/time trial/race.

Outdoor detail kan tonen: kaart, distance, time/moving time, speed, power, cadence, HR, elevation, hoogteprofiel, laps/segments, weather, source/provenance.

### Route privacy

De eigenaar ziet de volledige route. Bij delen moeten privacyzones/start-einde-verberging mogelijk zijn zodat woon-/startlocaties niet onbedoeld zichtbaar worden. Delen naar social/team/coach volgt consent/scopes.

## 9. Historie

Historie beantwoordt: **Wat heb ik gedaan?**

Target structuur:

- Overzicht
- Trainingen
- Activiteiten
- Wedstrijden
- Programma's
- Tests
- Routes
- Vergelijken
- Records

Filters: sport, periode, programma, trainingstype, locatie, device/bron, indoor/outdoor. Zoeken is vereist voor grote historie.

Outdoor cards tonen bij voorkeur mini-routekaart plus sportrelevante kernmetrics. Strength/HYROX/etc. krijgen eigen sport-specifieke previews.

### Activiteitdetail

Generieke structuur:

- identiteit (sport, naam, datum/tijd, type, programma/event)
- kernresultaten
- visuele analyse
- segmenten/onderdelen
- sensordata
- planned vs actual
- PR's
- vergelijkingen
- context
- bron/datakwaltiteit

Niet-relevante of ontbrekende velden worden niet als nul getoond.

### Planned vs Actual

Bewaar beide kanten als afzonderlijke feiten. Voorbeeld: geplande duur/intensiteit/blokken versus werkelijk uitgevoerde duur/afstand/blokken. Niet achteraf via AI reconstrueren.

### Persoonlijke records

Sport-specifieke PR-engine. Onderscheid altijd:

- gemeten prestatie
- berekende prestatie
- geschatte prestatie

Een e1RM is dus geen daadwerkelijk uitgevoerde 1RM.

## 10. Comparison Engine

Eén centrale vergelijkingscapability:

- activity <-> activity
- workout <-> workout
- exercise <-> exercise
- route <-> route
- race <-> race
- week <-> week
- program phase <-> phase
- period <-> period

Sport bepaalt metrics.

Running: pace, HR, elevation, splits, cadence.  
Cycling: speed, power, HR, cadence, elevation.  
Strength: weight, reps, e1RM, volume, RPE/RIR.  
HYROX: stations, runs, transitions, total time.  
Swimming: pace, laps, stroke metrics waar werkelijk beschikbaar.  
Concept2: distance/time/pace/power/stroke/cadence/splits.

### Zelfde-route-herkenning

GPS-geometrieën kunnen routeclusters vormen. Gebruiker ziet uitvoeringen van dezelfde/sterk vergelijkbare route, beste/laatste/gemiddelde feitelijke prestaties en kan uitvoeringen vergelijken. Geen causale conclusie zoals `sneller = fitter` zonder voldoende context/evidence.

## 11. Wedstrijden & events

Centraal Event-model met minimaal:

- sport
- eventtype
- datum/tijd/timezone
- locatie
- doel
- afstand/categorie
- starttijd
- resultaat
- gekoppeld programma

Een wedstrijd kan programma-anker zijn. Bij wijziging eventdatum vraagt het systeem of programma opnieuw gepland moet worden; niet stil automatisch herschrijven.

## 12. Teamsport planning

Dezelfde kalenderengine wordt gebruikt voor teamtraining, wedstrijd, toernooi, test en meeting.

Team-event kan bevatten:

- locatie
- verzameltijd
- starttijd
- coach
- beschikbaarheid
- aanwezigheid
- taken
- materialen
- notificaties

Performancevelden alleen als geschikte device/data aanwezig is.

## 13. No-wearable baseline

Harde productregel: iedere kernsport blijft bruikbaar zonder wearable. Wearables vergroten richness/confidence, maar mogen basistraining niet blokkeren. Running/cycling kunnen telefoon-GPS of handmatige invoer gebruiken; strength werkt volledig handmatig; swimming kan handmatig worden gelogd.

## 14. Onderliggende intelligence-architectuur

User Experience
-> Product capabilities
-> Calculation Engine
-> Context Engine
-> Decision/Rules Engine
-> Evidence + Provenance + Data Quality + Confidence
-> AI Coach

AI is nooit bron van waarheid, berekent niet zelfstandig en mag geen ontbrekende waarden of nieuwe trainingsregels verzinnen.

Cross-cutting:

- RLS/security
- privacy/consent
- provenance
- dedupe
- offline/retry
- notifications
- entitlements
- observability
- export/delete
- multi-tenant organizations

## 15. Inzicht - target productarchitectuur

**Inzicht beantwoordt:** `Hoe ontwikkel ik mij en wat betekent mijn trainings- en hersteldata?`

Hier worden de huidige concepten `Lichaam` en `Voortgang` functioneel samengebracht, zonder de onderliggende capabilities te verliezen.

### Inzicht Overzicht

Persoonlijk samenvattingsscherm met uitsluitend de belangrijkste informatie:

- performance trend
- trainingsconsistentie
- actuele herstel/readiness-samenvatting
- trainingsbelasting
- voortgang richting doelen/programmas
- relevante sport-specifieke kernmetric(s)
- belangrijke verbanden/signalen
- toegestane Decision Engine-uitleg

Het overzicht is geen datadump. Detail blijft één niveau dieper.

### Prestaties

- sport kiezen / alle sporten
- persoonlijke records
- sport-specifieke trends
- wedstrijdprestaties
- routeprestaties
- exercise/lift performance
- Concept2/ergometer performance
- HYROX segment/station performance
- multisport performance
- periodevergelijking

### Trainingsbelasting

- sessiebelasting waar ondersteund
- volume/frequentie/duur
- sportverdeling
- rolling trends
- intensiteitsverdeling waar valide
- geplande versus uitgevoerde belasting
- context bij veranderingen

ACWR mag eventueel als berekende metric bestaan conform Calculation Registry maar nooit als harde blessurevoorspeller of universele veilige zone worden gepresenteerd.

### Herstel

- readiness/recovery samenvatting
- HRV baseline/trend
- resting HR
- slaap
- subjectieve herstelinput
- relevante training context
- trend over tijd
- datakwaliteit/confidence

HRV is één signaal en bepaalt nooit zelfstandig rust/overtraining.

### Lichaam

- lichaamsmetingen
- gewicht/body composition waar beschikbaar
- spier-/belastingsoverzicht
- spierdetail
- oefening-relaties
- historische trends

Geen medische diagnose of ongefundeerde causaliteit.

### Trends

Generieke longitudinal analytics:

- week/maand/kwartaal
- volume
- trainingsfrequentie
- duur
- sportverdeling
- performance metrics
- herstelmetrics
- programma-adherence/completion

### Verbanden

Toont statistische/observationele samenhang waar daarvoor voldoende data en methodiek is. Taal moet onderscheid maken tussen correlatie/associatie en causaliteit. Voorbeelden kunnen zijn training versus hersteltrend, slaap versus volgende-dag-signalen, of sportvolume versus performance, maar alleen wanneer de Calculation/Evidence-laag dit ondersteunt.

### Women's Performance

Optionele trainingscontext, geen period tracker als zelfstandig product. Mogelijke zichtbare onderdelen:

- cycle phase/context waar ingevoerd
- symptoms/context
- confidence van schatting
- trends/correlaties
- trainingscontext

Geen causale hormoonclaims zonder evidence. Pregnancy/postpartum/menopause/contraception blijven afzonderlijke productbeslissingen totdat expliciet uitgewerkt/goedgekeurd.

### Voeding

Voeding blijft een relevante contextlaag binnen Inzicht en kan daarnaast een eigen invoerflow hebben. Mogelijke Inzicht-weergaven:

- geregistreerde voedingsmomenten
- timing rond training
- trends
- relatie tot planning/herstel uitsluitend binnen evidence/regels

Geen medische of voedingsclaims buiten toegestane evidence.

### Sport-specifieke Inzicht-pagina's

De generieke Inzicht-structuur krijgt sportcontext zonder aparte apps te maken.

Running: pace/performance, distance, route/elevation, splits, HR, cadence waar aanwezig, race/route trends.  
Cycling: speed/power/cadence/HR/elevation, route/segment trends.  
Strength: e1RM, load, volume, reps, RPE/RIR, exercise progress, spierbelasting.  
Swimming: distance/pace/laps/stroke metrics waar betrouwbaar beschikbaar.  
HYROX: run/station/transition/total trends.  
Concept2: pace/power/splits/stroke/cadence performance.  
Team: attendance/training exposure en performance alleen volgens rol/privacy/devicebeschikbaarheid.

### Inzicht versus Historie versus Coach

- **Historie:** wat heb ik gedaan?
- **Inzicht:** hoe ontwikkelt dit zich / welke patronen en signalen zijn aantoonbaar?
- **Coach:** wat kan ik hier binnen de regels mee doen?

Dit onderscheid voorkomt duplicatie van dezelfde statistieken over meerdere tabs.

## 16. Open productarchitectuurpunten

Nog verder uit te werken vóór schermbouw:

1. Coach: AI Coach versus menselijke Coach/PT, feedback/notities, assignments, consent en berichten.
2. Samen: social feed, groepen, challenges, Team, Gym/Club en privacy/moderation.
3. Apparaten & koppelingen: wearable/device-management en gebruikersflows.
4. Voeding: invoerflow versus Inzicht-context.
5. Onboarding/persoonlijke sportselectie en hoe SportDefinitions de UI personaliseren.
6. Exacte prioriteit per sport voor v1 versus later.
7. Subscription/entitlement UX na product-ownerbesluit.
8. Pregnancy/postpartum/menopause/contraception scope na product-ownerbesluit.

---

**Beslisregel:** nieuwe schermen worden pas gebouwd nadat productarchitectuur compleet genoeg is, de product owner het schermvoorstel/mock-up heeft gezien en expliciet heeft goedgekeurd.