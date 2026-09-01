# B9-03 Preparation Audit — Running Intelligence

**READ-ONLY.** Geen runtimecode gewijzigd. Uitsluitend gemaakt na een
groene B9-02-merge (`69faba47427bca42af69ef4296a98a1f059c9eb7`),
conform sectie 44 van de B9-02C-opdracht.

## CURRENT

- `activities` (sport='running') + `activity_laps`: canoniek,
  RLS-bewezen, live in productie (B9-01/B9-02/B9-02B/B9-02C).
- `athlete_endurance_profile`: threshold pace, FTP (user-entered/
  calculated, expliciet gescheiden), max HR -- geraadpleegd in de
  Running-preview, met provenance.
- `core/cardio.js`: CALC-END-001 (pace/speed/split) en CALC-END-002
  (erg-vermogen) zijn CANONICAL en in gebruik. CALC-END-004/004B
  (Critical Speed/Power) zijn CANONICAL maar bewust NOOIT automatisch
  gewired op trainingsgeschiedenis (geen mechanisme om een genuine
  max-effort-tijdrit te herkennen -- expliciet architectuurcommentaar
  in de functies zelf).
- `core/runningExecution.js`: pure state machine, geen calculation-
  functionaliteit (uitsluitend tijd/state).
- Bestaande, generieke load/trend-infrastructuur: CALC-LOAD-001
  (ACWR), CALC-LOAD-002 (Corroborated Load Signal), CALC-LOAD-003
  (Session Load/sRPE), CALC-LOAD-004 (Progression Trend/`trendBy`),
  CALC-LOAD-005 (Rolling Load Sum) -- allemaal sport-generiek, nog
  niet expliciet gevoed met Running-activity-data.

## GAPS

1. **CALC-END-005 (TRIMP/aerobic decoupling/HR-zones) is NOT
   IMPLEMENTED.** Dit blokkeert elke HR-zone-gebaseerde intelligentie
   (bijv. tijd-in-zone-trends) totdat dit canoniek gebouwd en
   geregistreerd is (Evidence Level, formule, bron, beperkingen).
2. Geen automatische Critical Speed/Power-integratie op
   trainingsgeschiedenis -- vereist eerst een productbeslissing over
   hoe een gebruiker een "genuine max-effort-tijdrit" kan markeren
   (UI-vraag, geen architectuurvraag).
3. Geen bestaand, sport-specifiek trend-dashboard voor Running (pace-
   trend, afstand-per-week, consistency) -- de generieke F7 Relationship/
   Trend-infrastructuur bestaat wel (CALC-LOAD-004), maar is nog niet
   toegepast op `activities`.
4. Geen race-goal-model (afstand/streefdatum) bestaat in het schema.

## DEPENDENCIES

- B9-03 is volledig afhankelijk van B9-01 (`activities`/
  `activity_laps`) en B9-02/B9-02B/B9-02C (Run Detail, geschiedenis) --
  beide CLOSED, dus dit blokkeert niets.
- CALC-END-005 (TRIMP/HR-zones) moet eerst canoniek geregistreerd
  worden vóór enige HR-zone-gebaseerde trend wordt gebouwd -- anders
  ontstaat een shadow calculation.
- Een productbeslissing over de max-effort-markering is nodig vóór
  Critical Speed/Power-trends geintegreerd kunnen worden.

## CALCULATIONS

Bruikbaar zonder nieuw werk: CALC-END-001/002 (pace/speed, al
gebruikt), CALC-LOAD-004/005 (generieke trend/rolling-sum,
toepasbaar op `activities.distance_meters`/`duration_seconds`).
Vereist nieuw, canoniek werk (Calculation & Evidence Architecture):
CALC-END-005 (TRIMP/decoupling/HR-zones) -- geen shadow calculation
bouwen als tijdelijke oplossing.

## EVIDENCE

CALC-END-005 heeft nog geen evidence-level/bron vastgelegd in
`docs/CALCULATION_EVIDENCE_SPEC.md` (bevestig dit bij aanvang van
B9-03 -- niet aangenomen in dit read-only onderzoek).

## RISKS

- Het bouwen van een HR-zone-berekening puur om een dashboard te
  vullen (zonder formele evidence-registratie) zou een shadow
  calculation zijn -- expliciet verboden.
- Trend-analyse op een klein aantal `activities`-rijen (nieuwe
  gebruikers) kan misleidend zijn zonder een minimum-datapunten-
  drempel (vergelijkbaar met de al bestaande k-anonimiteits-achtige
  aanpak uit F14 MS-F14-03).
- AI mag geen van deze trends zelf herberekenen (bestaande
  AI-boundary, herbevestigen bij B9-03-implementatie).

## RECOMMENDED BUILD ORDER

1. CALC-END-005 canoniek registreren en implementeren (TRIMP/HR-zones)
   -- fundament voor alle HR-gebaseerde intelligentie.
2. Pace-/afstand-trend op `activities` (hergebruik CALC-LOAD-004/005,
   geen nieuwe trend-engine).
3. Productbeslissing + implementatie voor Critical Speed/Power-
   markering en -integratie.
4. Race-goal-model (indien productmatig gewenst) -- nieuw, klein
   schema, RLS/deletion vanaf dag 1.

**Geen implementatie gestart. B9-03 wacht op expliciete vrijgave.**
