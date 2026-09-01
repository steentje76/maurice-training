# B9-04 Preparation Audit — Cycling Core

**READ-ONLY.** Geen runtimecode gewijzigd. Uitsluitend gemaakt na een
groene B9-02-merge (`69faba47427bca42af69ef4296a98a1f059c9eb7`),
conform sectie 44 van de B9-02C-opdracht.

## CURRENT

- `s-cycling` (index.html): een first-class menu-item onder Training ->
  Bouwen & verkennen, functionele destination shell (B9-02): een
  basale, handmatige rit-log naar `activities` (sport='cycling',
  source_provenance='manual'), zichtbaar in de geschiedenis. Expliciet,
  transparant gelabeld: "Rit loggen — vermogen & FTP volgen in B9-04"
  (geen "coming soon"-alert, geen nepfunctionaliteit).
- `activities`-schema (B9-01) ondersteunt al `sport='cycling'` met
  `avg_power_watts`/`avg_cadence_rpm` (kolommen bestaan, worden nog
  niet vanuit de UI ingevuld).
- `athlete_endurance_profile`: `ftp_watts_user_entered`/
  `ftp_watts_calculated` bestaan al, met expliciete scheiding
  user-entered vs. calculated + `calculated_source_calculation_id`/
  `_version` voor traceerbaarheid. Nog niet geraadpleegd door een
  Cycling-scherm (er is nog geen Cycling-preview zoals bij Running).
- `core/cardio.js`: `criticalPower()` is CANONICAL, dezelfde
  architecturele beperking als Critical Speed (geen automatische
  wiring, geen mechanisme om een genuine max-effort-rit te
  herkennen).
- Geen bestaande power-zones-berekening (analoog aan CALC-END-005 voor
  HR-zones) -- ontbreekt canoniek.
- Geen device/wearable-integratie voor cycling-vermogen (geen Garmin/
  Wahoo/Zwift-connector bestaat in de repo).
- Concept2-rowing-integratie (bestaand, apart domein) gebruikt een
  vergelijkbaar erg-vermogen-concept (CALC-END-002) maar is functioneel
  en technisch volledig gescheiden van cycling-power.

## GAPS

1. Geen Cycling-preview/execution-flow (analoog aan Running s B9-02-
   traject) -- de huidige shell is uitsluitend een eenvoudig,
   direct-opslaan-formulier, geen state machine.
2. Geen power-zones-berekening canoniek geregistreerd.
3. Geen enkele wearable/devicebron voor cycling-vermogen -- elke
   toekomstige integratie zou een volledig nieuwe connector vereisen
   (geen bestaande code om op voort te bouwen, conform het B9-01/
   B9-02-precedent van "geen fictieve providerintegratie bouwen").
4. FTP-bepaling: alleen user-entered mogelijk vandaag; geen canonieke
   FTP-testprotocol-berekening bestaat.

## DEPENDENCIES

- B9-04 kan volledig voortbouwen op de bestaande `activities`/
  `athlete_endurance_profile`-schema's (B9-01) zonder migratie --
  de benodigde kolommen bestaan al.
- `core/runningExecution.js` is expliciet sport-neutraal ontworpen
  in zijn kernlogica (state machine/timer kennen geen "running"-
  specifieke aannames) -- **potentieel herbruikbaar** voor een
  Cycling-execution-flow zonder duplicatie, mits hernoemd/
  gegeneraliseerd (bijv. naar `core/enduranceExecution.js`) in plaats
  van een tweede, cycling-specifieke state machine te bouwen. Dit
  moet expliciet getoetst worden bij aanvang van B9-04 (geen aanname
  hier, alleen een sterke aanwijzing op basis van de huidige module-
  structuur).
- `criticalPower()` (CANONICAL, `core/cardio.js`) kan direct hergebruikt
  worden zodra er een expliciete markering voor max-effort-ritten komt.

## RISKS

- Het risico op een tweede, bijna-identieke execution-state-machine
  (in plaats van hergebruik van `core/runningExecution.js`) is reëel
  gezien de tijdsdruk waaronder sprints doorgaans worden uitgevoerd --
  expliciet aandacht vereist bij B9-04-planning.
- FTP zonder een canoniek testprotocol kan tot inconsistente,
  onvergelijkbare waarden tussen gebruikers leiden -- provenance
  (user-entered vs. calculated) blijft essentieel, geen stille
  aannames.

## RECOMMENDED BUILD ORDER

1. Onderzoek expliciet of `core/runningExecution.js` generiek gemaakt
   kan worden (sport-parameter) i.p.v. een tweede state machine te
   bouwen -- dit is de belangrijkste, eerste architectuurbeslissing
   van B9-04.
2. Cycling-preview/execution-UI (analoog aan het B9-02-traject).
3. Power-zones canoniek registreren (analoog aan CALC-END-005 voor
   Running) indien productmatig gewenst.
4. FTP-testprotocol-calculation (indien gewenst) -- canoniek
   registreren vóór implementatie.
5. Wearable/devicebron-onderzoek -- alleen bouwen als een concrete,
   bestaande provider-integratie hiervoor geschikt blijkt (geen
   fictieve connector).

**Geen implementatie gestart. B9-04 wacht op expliciete vrijgave.**
