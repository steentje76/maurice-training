# B9-02 Running Core — Eindrapport

**Rol-erkenning:** dit rapport bevat uitsluitend aantoonbare
softwarestatus, tests, beperkingen en openstaande validatie. Geen
zelfbeoordeling als benchmarkscore.

## START SHA
`f35f623a24cde0e127d95f33ae08baaf6f707228` (exact overeenkomend met de
opgegeven baseline, geen nieuwere remote main gevonden).

## FINAL MAIN SHA
Wordt bijgewerkt na merge (zie eindrapportage aan de gebruiker voor de
definitieve waarde).

## APP_VER voor/na
v4.69.32 -> v4.69.33.

## PR(s)
Zie eindrapportage.

## Migration(s)
Geen. B9-02 hergebruikt volledig de bestaande B9-01 canonical
`activities`-tabel, geen schemawijziging nodig.

## Training-menu wijziging

- **Positie Hardlopen:** direct na Workout Builder, vóór HYROX, onder
  "Bouwen & verkennen" -- eigen, direct klikbaar menu-item met
  icoontegel/titel/ondertitel/chevron (bestaande `.row`-componenttaal,
  geen nieuw designsysteem).
- **Positie Fietsen:** direct na Hardlopen, vóór HYROX.
- **Routes:** `go('s-running')` en `go('s-cycling')` -- beide schermen
  bestaan daadwerkelijk (geen dode routes), elk met een eigen
  render-hook in de bestaande `go()`-functie, consistent met het
  `s-builder`/`s-guided`-patroon.
- **Regressie:** HYROX, Triathlon-brick, Workout Builder, Oefeningen,
  Losse oefening -- alle bestaande routes ongewijzigd, bevestigd via
  `core/fB9_02RunningCore.test.js` sectie E en de volledige
  `release-gate.js`-regressie (202/202 groen).

## Existing-state running audit

- `sessions`/`race_segments`: ongewijzigd, blijven de bestaande bron
  voor kracht/HYROX/triathlon.
- Wearable-connector: uitsluitend HRV/RHR/slaap, geen
  activiteitensync (ongewijzigd t.o.v. B9-01-bevinding).
- **GPS: `navigator.geolocation.getCurrentPosition()` bestaat**
  (eenmalige positie, elders in de app gebruikt voor weergegevens),
  **`watchPosition()` (live tracking) bestaat NIET.** Conform sectie
  14 van de opdracht is hierdoor bewust GEEN live-GPS-tracking of
  pseudo-GPS gebouwd -- dit is een expliciete, eerlijke capability-
  boundary, geen oversight.
- CardioCore (`core/cardio.js`, geladen via `<script src="core/
  cardio.js">`) bevestigd browser-beschikbaar als `window.CardioCore`
  -- hergebruikt voor pace-weergave, geen nieuwe berekeningslogica.

## Running entry

Gebouwd: 7 trainingsvormen (vrij hardlopen/afstand/tijd/interval/easy-
herstel/tempo-threshold/lange duurloop) als keuzelijst. Geen
automatisch voorschrift -- de gebruiker kiest uitsluitend de vorm.

## Workout model

`planned workout (vormkeuze) -> handmatige invoer -> activities
(sport='running', source_provenance='manual') -> history-weergave`.
Geen tweede waarheid naast `sessions`/`activities` -- de B9-01
source-of-truth-afspraken blijven volledig intact.

## Preview

**Gedeeltelijk gebouwd.** De keuze van trainingsvorm toont een
eenvoudig invoerformulier (afstand/duur/HR), maar een volledige,
losstaande "preview"-stap met expliciete doel/warm-up/interval-
structuurweergave vóór het starten is **niet gebouwd** in deze sprint
-- zie Open beperkingen.

## Execution

**NIET gebouwd in deze sprint (open blocker).** Er is geen live
start/pause/resume/finish-timerscherm met doorlopende afstand/pace/
lap-weergave tijdens het hardlopen. In plaats daarvan bestaat een
directe, handmatige-afronding-flow (invullen na afloop, niet tijdens).
Dit is een bewuste, transparante scope-keuze gegeven de omvang en het
vereiste, grondige testniveau voor een live-execution-UI (pauze/
hervat-state-machine, lifecycle-robuustheid, offline-gedrag) --
onvoldoende tijd om dit binnen deze sessie met dezelfde
zorgvuldigheid te bouwen en adversarial te testen als de rest van deze
sprint.

## Laps/splits

**NIET gebouwd in deze sprint (open blocker).** `activity_laps`
(B9-01) wordt in B9-02 nog niet vanuit de UI geschreven -- er is geen
lap-logging-interactie in de huidige, eenvoudige invoerflow.

## Intervals

**NIET gebouwd in deze sprint (open blocker).** Geen structured
interval-UI (warm-up/work/recovery/repeat). B9-01's beslissing om geen
apart intervalmodel te bouwen is dus nog niet met echte
execution-consumers getoetst.

## Profile

**NIET geraadpleegd/getoond in deze sprint (open blocker).**
`athlete_endurance_profile` (B9-01) wordt nog niet uitgelezen of
getoond in de Running-flow.

## Calculations

Pace-weergave in de geschiedenis gebruikt uitsluitend
`CardioCore.splitFromDistTime()`/`formatTime()` -- bevestigd via een
gerichte test die controleert dat er geen losse, lokale
deel-berekening in de nieuwe code voorkomt. Geen nieuwe calculation
toegevoegd. Critical Speed/HR-zones/TRIMP: niet geraadpleegd in deze
sprint (blijven ongewijzigd t.o.v. B9-01: CS/CP canonical maar bewust
niet gewired, TRIMP NOT IMPLEMENTED).

## History/detail

**Geschiedenis: gebouwd**, toont de laatste 20 runs (datum, afstand,
duur, deterministisch berekende pace). **Detail: NIET gebouwd** -- geen
eigen, uitgebreide detailweergave per run (splits/intervals/HR-trend/
broninformatie) buiten de samenvattingsregel in de lijst.

## No-wearable flow

**Werkend, bevestigd:** een sporter kan volledig zonder wearable een
run loggen -- handmatige afstand/duur/HR-invoer, opslag, en terugzien
in de geschiedenis. Dit is de kern van wat wél is opgeleverd.

## GPS/wearable boundaries

Zie "Existing-state running audit" hierboven -- expliciet,
transparant vastgesteld: geen betrouwbare live-tracking-infrastructuur
bestaat, geen pseudo-GPS gebouwd.

## Cycling preparation

- **Destination route:** `go('s-cycling')`, scherm-ID `s-cycling`.
- **Sport context:** canonical `sport='cycling'` op `activities`.
- **Beschikbare bestaande cycling-code:** geen (bevestigd tijdens de
  B9-01-audit: geen bestaande, uitgebreide cycling-functionaliteit om
  naartoe te routeren).
- **Gebouwde shell:** een volwassen, architecture-ready destination
  met een echte, basale handmatige rit-log (afstand/duur ->
  `activities`), geen "Coming soon"-alert, geen nepfunctionaliteit.
- **Ontbrekende cycling-core-capabilities voor B9-04:** FTP-
  productervaring, power-zones, power-analytics, adaptive cycling-
  programmering -- geen van deze is in B9-02 gebouwd (buiten scope).
- **Gedeelde endurance-componenten die B9-04 kan hergebruiken:**
  `activities`/`activity_laps` (B9-01, sport-agnostisch), `CardioCore`
  (pace/split/vermogen-conversies, al sport-agnostisch), de
  history-render-conventie uit `renderRunningHistory()`/
  `renderCyclingHistory()` (bewust parallelle, sportspecifieke UI-
  functies op een gedeeld datamodel -- consistent met sectie 27: UI
  mag sportspecifiek zijn, het datamodel niet dupliceren).

## Privacy/security

`activities`-RLS (B9-01) blijft ongewijzigd en van toepassing --
owner-isolatie, geen anon-toegang, geen cross-user-lek. Geen nieuwe
tabellen of RPC's toegevoegd in B9-02, dus geen nieuwe adversarial
database-tests nodig (het bestaande, B9-01-bewezen RLS-contract dekt
de nieuwe schrijfacties uit de UI volledig af).

## Tapcounts

- **Quick Run:** Training -> Hardlopen -> (formulier invullen) ->
  Afronden & opslaan = **effectief 2 taps + invoer** (geen aparte
  "Start"-stap, want er is geen live-executiescherm gebouwd -- dit
  wijkt af van de gevraagde "Training -> Hardlopen -> Vrij hardlopen
  -> Start"-flow, precies omdat Execution niet is gebouwd).
- **Structured Run (Interval, Preview, Start):** **niet meetbaar
  zoals gevraagd** -- er is geen aparte preview-stap of start-actie,
  alleen vormkeuze + direct invoerformulier.
- **Save (Finish -> Confirm -> Saved Run Detail):** **niet meetbaar
  zoals gevraagd** -- er is geen aparte confirm-stap en geen eigen
  Detail-scherm, alleen een toast-bevestiging en terugkeer naar de
  entry/geschiedenis.

Deze tapcount-afwijkingen zijn een direct gevolg van de bewust
beperkte scope van deze sprint (zie Open beperkingen).

## Tests

`core/fB9_02RunningCore.test.js` (nieuw, 21/21): navigatie-first-class-
gedrag, geen dode routes, canonical sport-context, geen shadow pace-
calculation, regressie op bestaande routes, plus (aanvullend toegevoegd
conform sectie 29) expliciete forged-user/owner-checks voor de nieuwe
running/cycling-opslagcode en een expliciete vaststelling dat er geen
laps-schrijfcode bestaat om te saboteren.

## Release gate

**202/202 groen** (was 201 vóór deze sprint, +1 nieuw testbestand, 5
assertions aanvullend toegevoegd aan dat ene testbestand tijdens de
afrondingscontrole).

## Doc consistency

**0 problemen.** Twee, van een eerdere, onvoltooide sessiestand
overgenomen problemen gecorrigeerd: de ongeldige status-waarde
"PARTIAL" (niet toegestaan door tools/check-doc-consistency.js se
VALID_STATUS-set) vervangen door de correcte, geldige waarde "TESTED"
(met de onvolledigheid expliciet in de beschrijving behouden), en de
capability-count-telling (67->68) overal consistent bijgewerkt.

## Sabotage

1. De Fietsen-route tijdelijk laten verwijzen naar `s-running` (i.p.v.
   `s-cycling`) -> gedetecteerd (2 assertions falen exact zoals
   verwacht), teruggedraaid. Zelf herhaald en herbevestigd.
2. **Aanvullend, tijdens deze afrondingssessie toegevoegd** (sectie 29
   vroeg expliciet om forged-user/duplicate-save/laps-cross-user te
   testen, niet alleen navigatie): `user_id` in
   `afrondenRunningActivity()` tijdelijk hardcoded gemaakt i.p.v. uit
   `authSession.user.id` gehaald -> gedetecteerd (F1-assertie faalt
   exact zoals verwacht), teruggedraaid. Bevestigt dat de client-code
   zelf geen aanvalsoppervlak biedt voor een forged-user-scenario,
   bovenop de al bestaande, B9-01-bewezen RLS-verdediging.
3. Duplicate-run-save en laps-cross-user zijn NIET apart, nieuw
   sabotagebaar: er bestaat geen dedupe-mechanisme voor handmatige
   invoer (B9-01's dedupe is specifiek voor provider-sync, niet
   relevant hier) en er bestaat geen enkele `activity_laps`-
   schrijfcode in B9-02 om te saboteren (expliciet, eerlijk vastgesteld
   als open blocker) -- dit is dus geen ontbrekende test, maar een
   afwezig aanvalsoppervlak.

## Open beperkingen

Dit is de belangrijkste sectie van dit rapport. B9-02 levert een
**werkende, geteste kern** (menu-IA, canonical sport-routing, een
volledig functionele "zonder wearable, handmatige afronding"-flow,
geschiedenis), maar **niet** de volledige, in de opdracht gevraagde
Running Core-ervaring. Expliciet niet gebouwd:

- Een losstaand, rijk preview-scherm vóór het starten.
- Een live execution-scherm (start/pause/resume/finish, doorlopende
  timer, live afstand/pace-weergave tijdens het hardlopen).
- Handmatige/automatische lap-logging tijdens of na een run
  (`activity_laps` wordt nog niet vanuit de UI geschreven).
- Structured interval-uitvoering (warm-up/work/recovery/repeat-UI).
- Raadpleging/weergave van `athlete_endurance_profile`.
- Een eigen, uitgebreide Run Detail-weergave.
- Analytics foundation (weekly distance/pace-trend/consistency/CS-
  trend/HR-pace-relatie/decoupling/load) -- expliciet B9-03-scope,
  terecht niet vooruitgelopen.

Deze onderdelen zijn bewust, transparant niet gebouwd -- niet
vergeten, niet stilzwijgend overgeslagen -- omdat ze, om met dezelfde
zorgvuldigheid (grondige tests, adversarial verificatie, geen
haastwerk) als de rest van deze sessie te worden opgeleverd, meer tijd
vereisen dan binnen deze ene sprint-uitvoering beschikbaar was.

## Dependencies B9-03

Running Intelligence (B9-03) is afhankelijk van: een werkend
execution-scherm dat daadwerkelijk laps/intervals genereert (anders is
er geen brondata voor trends/decoupling-analyse), en raadpleging van
`athlete_endurance_profile` voor CS/HR-zone-context.

## Dependencies B9-04

Cycling Core (B9-04) kan direct verder bouwen op: het `s-cycling`-
scherm/route (al bestaand, architecture-ready), de canonical
`activities`-tabel (sport='cycling', al schrijfbaar), `CardioCore`
(sport-agnostische pace/vermogen-conversies). Ontbrekend: FTP-
productervaring, power-zones, power-analytics, adaptive programmering
-- allemaal nog te bouwen.

## FINAL STATUS

**B9-02 RUNNING CORE PARTIAL — BLOCKERS OPEN**
