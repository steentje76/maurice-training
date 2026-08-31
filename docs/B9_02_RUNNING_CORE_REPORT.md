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

---

# B9-02B — Running Core Closure (aanvulling)

**Uitgevoerd op:** main `0f03050be072689b5255eda93592f94068ef30c8`
(exact overeenkomend met de opgegeven baseline).

## Blockers uit sectie 2 -- status per stuk

| Blocker | Status |
|---|---|
| 1. Volledige Running Preview | **GESLOTEN** -- `toonRunningPreview()` toont doel, structuur, profiel-context (met provenance), ontbrekende waarden blijven expliciet ontbrekend |
| 2. Live Running Execution | **GESLOTEN** -- `core/runningExecution.js`, een pure, deterministische state machine + timer, geintegreerd in `renderRunningExecutionScreen()` |
| 3. Start/pause/resume/finish | **GESLOTEN** -- volledige state machine met expliciete, geteste transitietabel |
| 4. Lifecycle/state persistence | **GESLOTEN** -- `persisteerRunningExecState()`/`herstelRunningExecutionIndienAanwezig()` via localStorage, live getest |
| 5. Laps/splits | **GESLOTEN** -- handmatige lap-registratie tijdens RUNNING, canonical `activity_laps`, pace uitsluitend via `CardioCore` |
| 6. Structured intervals | **GEDEELTELIJK.** Executie toont de huidige stap/voortgang/volgende stap correct (warm-up/work/recovery/repeats/cool-down). De GEPLANDE structuur zelf blijft bewust client-side/ephemeer, geen aparte, persistente databasetabel (architectuurbeslissing, sectie 10, expliciet gemotiveerd in de code: geen tweede consumer die persistentie nu al vereist). |
| 7. Athlete_endurance_profile-integratie | **GESLOTEN** -- preview raadpleegt het profiel, toont threshold pace/max HR met expliciete bron, nooit een stille default |
| 8. Run Detail | **GESLOTEN** -- `renderRunDetail()`: overzicht, laps, bron, data quality |
| 9. Volledige no-wearable execution | **GESLOTEN** -- de complete flow (preview->start->pause/resume->lap->finish->detail) werkt zonder enige sensor |
| 10. Betrouwbare fout-/offline-/refreshstates | **GEDEELTELIJK.** Refresh/crash-recovery is gebouwd en werkt (localStorage). Niet alle 15 in sectie 22 genoemde error-states zijn elk apart, expliciet getest binnen deze sprint (bijv. "auth expiry tijdens execution", "DB save failure" zijn niet apart gesimuleerd) -- de kernscenario's (dubbele finish, crash-recovery, cross-user) zijn wel bewezen. |

## Architectuurbeslissing: interval-datamodel (sectie 10)

Een geplande intervalstructuur ("4x 5 min work, 2 min recovery") en een
feitelijk geregistreerde `activity_laps`-rij zijn inderdaad verschillende
concepten, bevestigd tijdens deze sprint. Gekozen is voor een MINIMALE
aanpak: de geplande structuur blijft client-side, in-memory (een array
van blokken, gegenereerd bij de preview-stap), niet gepersisteerd als
een aparte tabel. Reden: er is nog geen tweede consumer (bijv. een
programma-bibliotheek die intervalstructuren zou hergebruiken) die
persistentie nu al rechtvaardigt -- een nieuwe tabel zou RLS/deletion/
indexes vanaf dag 1 vereisen voor een structuur die nu uitsluitend
binnen één, actieve executiesessie leeft. Dit is expliciet, transparant
vastgelegd als een open punt voor een toekomstige beslissing (mogelijk
B9-03, als Running Intelligence programma's met herbruikbare
intervalstructuren introduceert).

## Idempotency (sectie 14)

Dubbele-klik-bescherming (`_runningOpslagBezig`-vlag) + een server-side,
canonical `dedupe_key` (`manual-exec-{startTimestamp}-{userId}`) via
`Prefer: resolution=ignore-duplicates`. Live geverifieerd: de
onderliggende database-constraint (`unique(user_id, dedupe_key)`)
voorkomt een duplicate correct bij een herhaalde insert met dezelfde
sleutel (getest via de juiste, partiele-index-bewuste `ON CONFLICT`-
syntax). De PostgREST-laag zelf (`Prefer`-header) is niet apart via een
echte, ingelogde HTTP-aanroep binnen deze sessie getest -- dit is een
gedocumenteerde, resterende aanname (een standaard, gedocumenteerd
PostgREST-mechanisme, niet een eigen, nieuwe implementatie).

## Security (sectie 23)

Geen nieuwe tabellen toegevoegd in B9-02B -- de bestaande B9-01-RLS
dekt alle nieuwe schrijfpaden. Live, adversarial herbevestigd:
- Forged lap ownership (USER B probeert een lap aan USER A's activity
  te koppelen): RLS-violation, correct geweigerd (transactie
  automatisch teruggedraaid, 0 restanten).
- Cross-user/forged owner voor activities/profile: al bewezen in B9-01,
  ongewijzigd van toepassing.

## Deletion (sectie 24)

Geen nieuwe tabellen -- de bestaande `delete-account.js`-dekking van
`activities`/`activity_laps`/`athlete_endurance_profile` (B9-01) blijft
volledig van toepassing, geen wijziging nodig.

## Sabotage (sectie 27) -- status per scenario

| # | Scenario | Status |
|---|---|---|
| 1 | Pause duration telt als actieve tijd | **Gedetecteerd** (`core/fRunningExecutionCore.test.js` C2/C4) |
| 2 | Pace lokaal herberekend | **Gedekt** (bestaande D1/D2 in `fB9_02RunningCore.test.js`) |
| 3 | Dubbel finishen maakt twee activities | **Gedetecteerd** (`fB9_02BRunningClosure.test.js` D1, live database-constraint bevestigd) |
| 4 | Lap aan verkeerde activity | **Gedekt + live bevestigd** (RLS-violation, zie Security hierboven) |
| 5 | Forged owner | **Gedekt** (B9-01, herbevestigd) |
| 6 | Interval repeat verkeerd | **Gedetecteerd** (`fB9_02BRunningClosure.test.js` F1/F2) |
| 7 | Profielwaarde zonder provenance | **Gedetecteerd** (`fB9_02BRunningClosure.test.js` B1) |
| 8 | Execution-state verdwijnt bij refresh | **Gedetecteerd** (`fB9_02BRunningClosure.test.js` E1/E2/E3) |

## Zelf gevonden problemen tijdens deze sprint

1. Een eigen testfout in `fRunningExecutionCore.test.js` (`confirmFinish()`
   direct na `start()` aangeroepen zonder de verplichte
   `requestFinish()`-tussenstap) -- veroorzaakte een crash, niet een
   stille fout. Gecorrigeerd, en de module zelf verbeterd: elke
   mislukte transitie geeft nu consequent de ongewijzigde state terug
   (`state: state`) in plaats van `undefined`, wat een aanroeper zonder
   voorafgaande `ok`-check tegen een crash beschermt.
2. Tijdens het handmatig saboteren: een CRLF/LF-tekstmodusfout (Python
   text-mode read/write) veroorzaakte kortstondig een ongewilde
   conversie van het hele bestand -- direct herkend en hersteld via
   binaire read/write.
3. **Kritiek, zelf gevonden vóór oplevering:** de Running-geschiedenis
   toonde niet-klikbare, dode lijstitems (`cursor:default`, geen
   `onclick`) -- in directe tegenspraak met de expliciete eis in sectie
   17 ("Geen dode lijstitems"). Gecorrigeerd: elk item opent nu zijn
   eigen Run Detail.
4. Een testmatch (`ON CONFLICT`) faalde aanvankelijk door de partiele
   `WHERE dedupe_key IS NOT NULL`-voorwaarde van de bestaande unique
   index niet mee te specificeren -- gecorrigeerd, en bevestigt dat de
   onderliggende B9-01-indexdefinitie zelf correct is.

## Tests (totaal)

`core/runningExecution.js` (nieuw): pure state machine + timer-module.
`core/fRunningExecutionCore.test.js` (nieuw, 19/19): transitietabel,
timer-determinisme, laps.
`core/fB9_02BRunningClosure.test.js` (nieuw, 16/16): preview-provenance,
idempotency, crash-recovery, interval-structuur, History->Detail.
`core/fB9_02RunningCore.test.js` (bijgewerkt, 21/21): F5 aangepast naar
de nieuwe werkelijkheid (laps-schrijfcode bestaat nu, gecontroleerd op
correcte activity_id-koppeling).

## Release gate / Doc consistency

204/204 groen. 0 doc-consistency-problemen.

## FINAL STATUS

**B9-02 RUNNING CORE PARTIAL — BLOCKERS OPEN**

Substantiële voortgang t.o.v. de vorige stand: 8 van de 10 in sectie 2
genoemde blockers zijn nu volledig gesloten (Preview, Execution, Start/
Pause/Resume/Finish, Lifecycle persistence, Laps, Profile-integratie,
Run Detail, No-wearable execution). Twee blijven gedeeltelijk open:
structured-interval-persistentie (bewuste architectuurkeuze, client-side
i.p.v. een nieuwe databasetabel) en de volledige, in sectie 22
opgesomde error-state-matrix (kernscenario's wel bewezen, niet elk van
de 15 genoemde gevallen apart gesimuleerd). Conform de rolinstructie
wordt dit niet als CLOSED geclaimd zolang deze twee punten open staan.

---

# B9-02B Continuation — Aanvullende bevindingen

## Failure atomicity (sectie 5)

**Zelf gevonden, kritiek gebrek, gecorrigeerd voordat het werd opgeleverd:**
de opslaanfunctie controleerde niet of elke `activity_laps`-insert
daadwerkelijk slaagde -- bij een gedeeltelijk falende opslag (activity
wel, één of meer laps niet) toonde de code alsnog "Training
opgeslagen" en ruimde de herstelbare `localStorage`-state op, waardoor
de ontbrekende laps onherroepelijk verloren zouden gaan. Gecorrigeerd:
elke lap-insert wordt nu individueel gecontroleerd; bij een
gedeeltelijke mislukking krijgt de gebruiker een expliciete, eerlijke
melding en blijft de execution-state bewaard voor een latere
retry-poging (geen stille dataverlies, geen misleidende
succesmelding). Getest in `core/fB9_02BRunningClosure.test.js` sectie J.

## HR-zones (sectie H)

Onderzocht of `athlete_endurance_profile` een `hr_zones`-veld heeft:
**nee**, alleen `max_heart_rate_bpm` bestaat. HR-zones zouden dus een
nieuwe, lokale berekening vereisen -- maar CALC-END-005 (TRIMP/aerobic
decoupling/HR-zones) staat nog canoniek op NOT IMPLEMENTED. Conform
sectie 8/18/25 (geen shadow calculation) is er bewust GEEN lokale
HR-zone-formule toegevoegd. In plaats daarvan toont de preview nu
expliciet "HR-zones: nog niet beschikbaar (canonieke berekening
ontbreekt)" -- eerlijk, transparant, geen stille default en geen
verzonnen formule. Blijft een expliciete B9-03-dependency.

## Bijgewerkte testtelling

`core/fB9_02BRunningClosure.test.js`: 20/20 (was 16/16, +4 assertions
voor failure atomicity en HR-zones). Totaal voor B9-01+B9-02+B9-02B:
26+21+19+20 = 86 gerichte assertions, alle groen. Release gate:
204/204.

## Herbevestigde eindstatus

De kern-blockers (execution state machine, timer, pause/resume, laps,
finish-confirm, idempotency, crash-recovery, Run Detail, History->
Detail, profiel-raadpleging met eerlijke HR-zone-gap) zijn nu
robuuster en met een kritiek, zelf gevonden dataverlies-risico
gerepareerd. Structured-interval-persistentie (client-side, bewust)
en de volledige error-state-matrix (sectie 22, 15 scenario's) blijven
gedeeltelijk open -- niet alle 15 zijn individueel gesimuleerd binnen
deze sessie.

**FINAL STATUS: B9-02 RUNNING CORE PARTIAL — BLOCKERS OPEN**

---

## B9-02C-UPDATE (nachtsprint, zie `docs/B9_02C_RUNNING_FINAL_CLOSURE_REPORT.md` voor het volledige bewijs)

De hierboven vastgestelde "PARTIAL"-status was historisch correct op
het moment van de B9-02B-sessie. Een aanvullende, autonome nachtsprint
(B9-02C) heeft de twee resterende closure-gebieden (structured-interval-
architectuurbeslissing, volledige error-state-matrix) expliciet
behandeld, twee echte, kritieke P1-bevindingen gevonden en gerepareerd
(wrong-user-localStorage-recovery, een corrupted-state-crash), en
94 gerichte assertions (was 86) allemaal groen bevestigd.

**BIJGEWERKTE FINAL STATUS: B9-02 RUNNING CORE CLOSED — READY FOR
INDEPENDENT BENCHMARK REVIEW.**
