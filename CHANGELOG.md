# Trainingskompas — Changelog

## v4.67.0 — A5-vervolg: functioneel bewezen state preservation + device-cleanup bij einde training (27 augustus 2026)

Vervolg op v4.66.0, binnen dezelfde MASTERSPRINT A5. Op expliciet verzoek
autonoom doorgewerkt tot A5 softwarematig aantoonbaar afgerond is.

**Nieuwe, functionele testharness** (`core/fA5DeviceConnectE2E.test.js`):
in tegenstelling tot de eerdere, statische (regex-gebaseerde) tests, worden
hier de daadwerkelijke `tkErgPair()`/`tkErgSelect()`/`tkErgConnectDevice()`-
functies **letterlijk uit `index.html` geëxtraheerd en in een echte
JavaScript-omgeving uitgevoerd** (Node's `vm`-module), tegen een gemockte
transport en de **echte, daadwerkelijke** trainingsstaat-variabelen
(`activeInstanceId`/`curT`/`resolvedWorkout`/`sessionLog`/`trainStart`/
`pausedAccumMs`). Dit bewijst — met echt gedrag, niet aangenomen —:
- **State preservation**: alle acht kritieke trainingsstaat-velden blijven
  bewijsbaar exact ongewijzigd vóór/na een daadwerkelijk uitgevoerde
  connect-flow.
- **Geen lifecycle-triggers**: disconnect/reconnect-events roepen
  aantoonbaar nooit `finishSession()`/`execLeaveDiscard()`/
  `completeTrainingInstance()` aan.
- **Geen dubbele subscriptions**: drie snelle taps op "verbinden"
  resulteren in exact één daadwerkelijke `connect()`-aanroep en exact één
  actieve metrics-/connection-subscription (bevestigd doordat dezelfde
  test, gedraaid tegen de OORSPRONKELIJKE, ongerepareerde code uit v4.65.0,
  daadwerkelijk 3 aanroepen en 3 gestapelde listeners opleverde — een
  concreet, gemeten bewijs, geen theoretische aanname).
- **Reconnect zonder stapeling**: na een simulatie van signaalverlies
  gevolgd door hernieuwd verbinden blijft het aantal actieve listeners
  exact één.
- **Robuustheid tegen ongeldige metrics**: null/NaN/malformed
  device-events veroorzaken geen crash in de live-update-keten.

**Nieuwe, echte bug gevonden en gerepareerd** (Prioriteiten 9/10 van de
A5-hardeningsopdracht): noch `execLeaveDiscard()` noch `finishSession()`
riep ooit `tkErgDisconnect()` aan. Een verbonden apparaat bleef daardoor
op de achtergrond actief (BLE-verbinding + metric-subscriptie) nadat de
training was verworpen of afgerond. Nieuwe functie
`tkErgDisconnectAll()` toegevoegd — itereert over alle oefeningen en
ontkoppelt uitsluitend de daadwerkelijk verbonden, ingehaakt op beide
plekken. Bewezen via bug-terugzet-simulatie (tests X1/X5).

**Onderzocht en bewust niet gebouwd** (Prioriteit 6, device-switch): een
smaller randgeval — twee VERSCHILLENDE oefeningen in dezelfde training
elk met een eigen device-verbinding, zonder expliciete disconnect
tussendoor — zou in theorie tot "ghost metrics" kunnen leiden. Gegeven dat
de onderliggende transport single-device is (één fysieke BLE-verbinding
tegelijk) en "Ander apparaat" altijd binnen dezelfde oefening blijft (al
correct gedekt door de v4.66.0-fix), is dit randgeval smal genoeg om niet
als blokkerende P0/P1 te classificeren. Gedocumenteerd als bekende,
kleine beperking, geen architectuurwijziging gebouwd.

**Hardwarevalidatie**: EXTERN BLOCKED — REAL PM5 VALIDATION. Geen fysiek
Concept2-apparaat beschikbaar in deze ontwikkelomgeving. Alle
softwarematige A5-vereisten zijn hiermee aantoonbaar afgerond.

Geen databasewijziging. Geen wijziging aan protected core. Protected core
en de device-specifieke kernbestanden: SHA256-bevestigd byte-identiek.

## v4.66.0 — A5: Device-connect-hardening, mid-workout-connect bewezen (27 augustus 2026)

MASTERSPRINT A5 (Real Device Validation & Live Training 2.0). Discovery
toonde aan dat mid-workout device-connect **al architecturaal bestond**:
`tkRenderErgConnect()` is ingebed in de oefening-body zelf (identiek voor
Training A/B, Workout, Losse oefening), en `_c2repaint()` werkt uitsluitend
op een lokaal DOM-fragment (`c2body-${exId}`) — geen aanraking van
`sessionLog`/`activeInstanceId`/`resolvedWorkout`/de trainingstimer.

**Twee echte, bewezen bugs gevonden en gerepareerd** (geen nieuwe
connect-flow gebouwd — het bestaande pad bleek grotendeels correct):

1. **Gestapelde subscriptions** (`tkErgConnectDevice()`): `subscribeMetrics()`/
   `subscribeConnection()` in `native/src/nativeConcept2BleTransport.js`
   gebruiken `array.push()` — stapelen listeners, vervangen niet. De
   aanroepende functie legde de teruggegeven unsubscribe-functies nooit
   vast, waardoor dubbel tikken of opnieuw verbinden meerdere, gestapelde
   listeners zou geven (dubbele DOM-updates, dubbele metric-callbacks).
   Gerepareerd: de exercise-specifieke unsubscribe-functies worden nu
   vastgelegd (`st._unsubMetrics`/`st._unsubConn`) en vóór elke nieuwe
   subscriptie eerst opgeruimd — **nooit** de transportbrede
   `unsubscribeMetrics()`, want dat zou een andere, gelijktijdig verbonden
   oefening in dezelfde training kunnen raken.
2. **Geen dubbel-tik-bescherming**: noch `tkErgPair()` (scannen) noch
   `tkErgConnectDevice()` (verbinden) had een busy-guard. Toegevoegd:
   `st._scanning`/`st._connecting`-vlaggen, correct teruggezet in alle
   uitgangen (succes, mislukt, catch).

Beide bugs bewezen via bug-terugzet-simulatie (tests W1/W6): de
gerichte tests falen correct zodra de fix wordt teruggedraaid.

**Bevestigd, niet gewijzigd** (al correct): machine-mismatch-detectie
(`Concept2Live.machineMatchesExercise()`), reconnect-afhandeling bij
signaalverlies, eerlijke web-fallback (nooit een nep-"verbonden"-status),
canonieke logging-koppeling via `liveWorkoutToActual()` met
provenance-tracking, RAW-naar-canoniek normalisatie via
`Concept2Live.normalizeLiveMetric()` (nooit ongefilterde RAW-data naar
UI/sessionLog/AI).

Geen databasewijziging. Geen wijziging aan protected core — expliciet
geverifieerd. Protected core (`calculation.js`/`decision.js`/
`relationship.js`/`athlete.js`/`coaching.js`/`progression.js`) én de
device-specifieke kernbestanden (`concept2Live.js`/`deviceIntegration.js`):
SHA256-bevestigd byte-identiek, onaangetast.

## v4.65.0 — A4: Readiness-consistentie + Herstel & Readiness-detail (27 augustus 2026)

MASTERSPRINT A4 (Daily Readiness & Recovery 2.0) — sluit uitsluitend de twee
tijdens de A4-discoveryronde bewezen gaps.

**Kernbevinding, gecorrigeerd t.o.v. de eerste hypothese**: `DecisionCore.
readinessDay()` (voedt Home) en `computeProgAdjustment()` (voedt de
pre-workout-flow) bleken bij nader onderzoek **geen** twee parallelle
Decision Engine-functies — `readinessDay()` roept **intern** exact
`computeProgAdjustment()` aan. Het enige echte verschil zit in de inputs:
Home geeft **structureel altijd** `gevoel:null, pijn:null` door (bevestigd:
de `hrv_log`-tabel heeft geen kolommen hiervoor), terwijl de pre-workout-
flow deze vers uit dezelfde check-in haalt. Dit verschil is bewezen met
echte, protected code: identieke dagfactor/herstel geeft op Home
`ongewijzigd`, maar bij pre-workout (met echte gevoel/pijn) `aangepast` met
concrete redenen — een legitiem, maar tot nu toe niet uitgelegd verschil.

**Consistentiebrug** (puur presentatie, geen nieuwe Decision Engine):
wanneer de pre-workout-flow een sessiespecifieke aanpassing doet terwijl
Home eerder "ready" toonde, verschijnt nu een korte, verklarende regel die
hergebruikt maakt van het al bestaande, alleen-te-lezen
`window._tkReadiness` (Home's eigen besluit). Geen nieuwe berekening, geen
wijziging aan `setsDelta`/`rpeDelta` — bewezen via bug-terugzet-simulatie
(test V3).

**Herstel & Readiness-detailweergave**: nieuwe, compacte modal vanuit de
bestaande Home-readinesskaart ("Bekijk herstel"). Toont uitsluitend reeds
bestaande, canonieke berekeningen: HRV (`hrvBaseline()`/`hrvStPersonal()`,
ongewijzigd), RHR (`rhrBaselineDelta()`, ongewijzigd), trainingsbelasting
(`TrainingLoadCore.classifyAcwr()`/`acwrAdvisoryText()`, ongewijzigd,
v4.58.0). Subjectieve data expliciet gemarkeerd als "zelf ingevuld", nooit
vermengd met meetdata. **Bewust geen nieuwe slaap-baselineformule**
ontworpen (bestond niet canoniek) — toont uitsluitend vandaag + recente
losse waarden, met een expliciete notitie dat een persoonlijk niveau nog
ontbreekt, in plaats van dit stilzwijgend te verzinnen. Elke sectie
verschijnt uitsluitend wanneer de onderliggende meting daadwerkelijk
aanwezig is — geen verzonnen 0, met een vriendelijke lege-staat wanneer
alle hersteldata ontbreekt.

Geen databasewijziging. Geen wijziging aan protected core — expliciet
geverifieerd dat `core/decision.js` en `core/calculation.js` geen enkele
referentie naar de nieuwe functies bevatten.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`/`progression.js`): SHA256-bevestigd byte-identiek, onaangetast.

**A4-eindconclusie**: Home-readiness bestond al en is correct; het
Home/pre-workout-verschil is niet langer misleidend (nu expliciet
uitgelegd); dezelfde canonieke readiness-basis wordt gebruikt (bevestigd:
`readinessDay()` roept intern `computeProgAdjustment()` aan); een compacte
herstel-detailweergave is toegevoegd. Geen P0/P1 meer resterend. A4 CLOSED
(zie DECISION_LOG.md DEC-041 en
`docs/Sprintrapporten/A4_Readiness_Consistency_Recovery_Detail.md`).

## v4.64.0 — A3: Load/trend-context in de pre-workout-aanbeveling (27 augustus 2026)

MASTERSPRINT A3 (Adaptive Training Intelligence) — sluit uitsluitend de tijdens
de A3-discoveryronde bewezen chain break. `evaluateProgAdjustment()` bleek al
een volledig, canoniek "PLAN→OBSERVATION→DECISION→RECOMMENDATION→EXPLANATION"-
model te zijn (`computeProgAdjustment()`, protected Decision Engine), maar
gebruikte uitsluitend readiness (HRV/slaap/spierherstel/subjectief gevoel).
Twee al bestaande, al berekende signalen — het gecorroboreerde
belastingssignaal (v4.60.0) en de per-oefening-progressietrend (v4.62.0) —
zaten uitsluitend in de AI-chatcontext, nooit in dit daadwerkelijke,
vóór-elke-training getoonde advies.

**Nieuwe functie**: `buildProgAdviesExtraContext(prog, rows)` — voegt
uitsluitend AANVULLENDE, DUIDELIJK GESCHEIDEN context toe aan de bestaande
`m-prog-advies`/`m-prog-intro`-modals:
- **Event-datum-context**: hergebruikt `ScheduleAdherenceCore.daysUntilEvent()`/
  `weeksUntilEvent()` (v4.56.0), geen nieuwe datumlogica.
- **Relevante oefeningtrend**: hergebruikt `computeExerciseTrends()` (v4.62.0),
  gefilterd tot uitsluitend oefeningen die in DEZE specifieke training
  voorkomen — geen irrelevante ruis.
- **Gecorroboreerd belastingssignaal**: hergebruikt exact
  `TrainingLoadCore.corroboratedLoadSignal()` (v4.60.0). Het aantal dalende
  oefeningen komt uit DEZELFDE trendberekening als hierboven — geen tweede,
  parallelle berekening. Neutrale taal ("controleer hoe de training vandaag
  voelt"), geen deload-/blessurerisico-taal.

**Kernprincipe, bewezen niet alleen beweerd**: `computeProgAdjustment()`
wordt aangeroepen met EXACT dezelfde vier parameters als vóór deze sprint —
geen vijfde argument, geen gewijzigde signature. De nieuwe context wordt
apart, NA de bestaande `adj`-berekening opgehaald en toegevoegd, en wijzigt
nergens `setsDelta`/`rpeDelta`. Bug-terugzet-simulatie bevestigt dit expliciet
(tests U5/U16 falen correct zodra de nieuwe functie een `rpeDelta`-toewijzing
zou bevatten).

**Single-signal-safety behouden**: het belastingssignaal verschijnt
uitsluitend bij de conjunctie van twee onafhankelijke bronnen
(`corroboratedLoadSignal()`, al zo ontworpen in v4.60.0) — nooit op ACWR of
één dalende oefening alleen.

Dezelfde aanvullende context wordt getoond ongeacht of er wel/geen
readiness-aanpassing nodig is (zowel het `m-prog-advies`- als het
`m-prog-intro`-pad) — consistente informatie.

Geen databasewijziging. Geen wijziging aan protected core — expliciet
geverifieerd dat `core/decision.js` geen enkele referentie naar de nieuwe
functie of `ScheduleAdherenceCore` bevat.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`/`progression.js`): SHA256-bevestigd byte-identiek, onaangetast.

**A3-eindconclusie**: Trainingskompas heeft nu één coherent pre-workout
adaptive-oppervlak waarin readiness-beslissing, schedule/programmacontext,
belastingscorroboratie en relevante oefeningprogressie samenkomen zonder
parallelle logica. Geen P0/P1 meer resterend. A3 CLOSED (zie DECISION_LOG.md
DEC-040).

## v4.63.0 — A2.6: Exercise Detail Drill-down (27 augustus 2026)

Afsluitende bouwstap van MASTERSPRINT A2 (Performance & Analytics 2.0).

**Cruciale discovery-bevinding vóór het bouwen**: `show1RMChart()` — al
gekoppeld aan elke oefeningregel in Voortgang — bleek **al te bestaan** als
een e1RM-grafiek + geschiedenislijst-modal, met een reeds bestaande
`drawChart()`-canvascomponent. Dit was al circa 80% van de gevraagde
Exercise Detail Drill-down. In plaats van een nieuwe modal/pagina te bouwen
(zoals de opdracht expliciet waarschuwde te vermijden bij grote scope), is
de **bestaande modal uitgebreid** met vier reeds berekende, canonieke
bronnen die er nog niet in stonden.

**Toegevoegd aan de bestaande modal**:
- **Trendlabel** ("↑ Stijgend"/"↓ Dalend"/"Onvoldoende data"), uit de
  gedeelde `computeExerciseTrends()` (v4.62.0) — exact dezelfde bron als
  Voortgang en de AI-coachcontext, geen nieuwe trendberekening.
- **Huidig vs. beste e1RM**, afgeleid uit de al berekende puntenreeks
  (`Math.max()`), geen tweede, parallelle 1RM-berekening.
- **PR per repbereik**, hergebruikt `loadRepPRs()`/`computeRepPRsFromSessions()`
  (Sprint 16, al bestaand) — geen nieuwe PR-definitie.
- **Doel/target**, hergebruikt `peakGoalFor()` — geen nieuw doelbegrip.
- **Transparantieregel**: "Gebaseerd op X geregistreerde trainingen".

**Bewust niet gebouwd**: volume (P2, expliciet uitgesteld conform opdracht
— e1RM/trend/PR/history hebben prioriteit), een nieuwe hoofdnavigatie-item,
een tweede Progressie-sectie, forecasting/extrapolatie in de grafiek.

**Architectuurgrens bewezen** (niet alleen beweerd): via bug-terugzet-
simulatie aangetoond dat forecasting-taal correct wordt gedetecteerd als
verboden (test J8). Geverifieerd dat `core/decision.js` en
`core/calculation.js` geen enkele referentie naar de uitgebreide UI-functie
bevatten.

Geen databasewijziging. Geen nieuwe Calculation Engine-module — 100%
hergebruik van reeds bestaande, geteste, protected functies en reeds
bestaande UI-componenten (`drawChart()`).

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`/`progression.js`): SHA256-bevestigd byte-identiek, onaangetast.

**A2-eindconclusie**: met deze sprint is de enige resterende P1
(oefeningdetail) afgerond. Geen echte P0/P1-analytics-gaps meer resterend
die V1 blokkeren. Zie DECISION_LOG.md DEC-039 voor de volledige
onderbouwing en formele A2-afsluiting.

## v4.62.0 — A2.5: Weekoverzicht, oefeningtrend en PR-tijdlijn (27 augustus 2026)

Bouwfase van MASTERSPRINT A2 (Performance & Analytics 2.0), voortbouwend op de
A2-discoveryronde die drie echte, bewezen gaps identificeerde. Uitsluitend
deze drie gebouwd, geen forecasting, geen nieuwe ACWR-berekening, geen
parallelle analytics-engine, geen nieuwe chart-library — conform expliciete
scope-begrenzing.

**Belangrijke discovery-bevinding vóór het bouwen**: een "PR per herhaling"-
kaart bleek al te bestaan (`computeRepPRsFromSessions()`) — grondig onderzocht
om geen dubbele PR-logica te bouwen. De nieuwe PR-tijdlijn hergebruikt exact
dezelfde bucket-/vergelijkingslogica, uitsluitend chronologisch geordend in
plaats van gegroepeerd per oefening.

**A2.5A — Weekoverzicht**: nieuwe `tkWeekOverview()`, uitsluitend aggregatie
van reeds bestaande, canonieke bronnen — `computeProgramProgress()`
(ongewijzigd, hier toegepast op de `program_blocks`-subset binnen de
kalenderweek in plaats van een heel programma) en `CalcCore.calculateVolume()`
(protected, ongewijzigd). Timezone-correcte weekgrenzen via de bestaande,
al eerder gecorrigeerde `isoWeekday()`/`addDaysStr()`. Toont uitsluitend
secties waarvoor daadwerkelijk data bestaat — trainingstijd blijft
bijvoorbeeld verborgen zolang `duration_s` grotendeels leeg is, in plaats
van een verzonnen "0m" te tonen.

**A2.5B — Oefeningtrend in Voortgang**: de per-oefening-trendberekening uit
`tkProgressionTrendContext()` (v4.59.0) is geëxtraheerd naar een gedeelde,
canonieke functie `computeExerciseTrends()`, zodat zowel de AI-coachcontext
als de nieuwe Voortgang-trendlabels **exact dezelfde berekening en drempel**
gebruiken — geen duplicate calculation path. De bestaande e1RM-lijst toont nu
per oefening "↑ Stijgend"/"↓ Dalend"/"Onvoldoende data" — tekst én icoon,
nooit uitsluitend kleur (accessibility). Geen nieuwe drempels, geen eigen
UI-trendberekening.

**A2.5C — PR-tijdlijn**: nieuwe "Recente records"-kaart naast de bestaande
"PR per herhaling"-kaart. `computePrTimelineFromSessions()` reconstrueert
chronologisch elk moment waarop een record daadwerkelijk werd verbroken
(geen expliciete PR-events in de database, dus retroactieve reconstructie
op basis van de bestaande sessions-tabel — bewuste, gedocumenteerde
beperking). Bewezen geen "future data leakage": sessies worden expliciet
oplopend gesorteerd vóór vergelijking, ongeacht aanlevervolgorde — getest
met zowel gesimuleerde als echte productiedata (oefening TK-000019: 8
genuine PR-events correct gereconstrueerd uit 13 sessies).

**Bug gevonden en gerepareerd tijdens deze sprint**: het weekoverzicht
gebruikte aanvankelijk een niet-gedefinieerde CSS-klasse (`v43-pstat-row`);
vervangen door correcte inline-stijl, met een nieuwe regressietest (I8b) die
dit specifiek bewaakt.

**Architectuurgrens bewezen** (niet alleen beweerd): geverifieerd dat
`core/decision.js` en `core/progression.js` geen enkele referentie naar de
nieuwe A2.5-functies bevatten. Bug-terugzet-simulatie bevestigt dat de
PR-vergelijkingslogica daadwerkelijk vereist is (test I11).

Geen databasewijziging. Geen nieuwe Calculation Engine-module — 100%
hergebruik van reeds bestaande, geteste, protected functies.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`/`progression.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.61.0 — A1 Final Gap Closure: actieve sessie vervangen/verwijderen/verwerpen (27 augustus 2026)

Afsluitende sprint van MASTERSPRINT A1 (Workout Execution 2.0). Voortbouwend
op de discovery- en verificatierondes die aantoonden dat Workout Execution
grotendeels al volwassen was.

**Drie fast-logging-punten alsnog geverifieerd, alle drie COMPLETE, geen
bouwwerk nodig**: (A) direct wijzigen van gewicht/reps zonder modal —
bevestigd via inline `<input type="number">`-velden met `onchange="logSet(...)"`.
(B) automatische rusttimer na set-afronding — bevestigd via
`autoRestAfterSet()`, expliciet aangeroepen bij het afvinken van een set.
(C) RPE/RIR niet-blokkerend — bevestigd: `toggleSetDone()` bevat geen enkele
RPE-validatie vóór het toestaan van set-afronding.

**Nieuw gebouwd (P1)**:
- **Oefening vervangen tijdens actieve sessie** (`execReplaceExercise()`):
  100% hergebruik van de bestaande, unified `openExPicker()`/`resolvePickerEx()`
  — geen tweede picker, geen tweede execution-path. Waarschuwt expliciet en
  vereist bevestiging wanneer voor de te vervangen oefening al sets zijn
  geregistreerd; die data wordt bewust NIET automatisch omgezet naar de
  nieuwe oefening (expliciete, veilige productregel).
- **Oefening verwijderen tijdens actieve sessie** (`execRemoveExercise()`):
  eenvoudige bevestiging bij een lege oefening, expliciete waarschuwing bij
  reeds gelogde data. Ruimt `sessionLog` correct op — voorkomt orphan/ghost-
  data in `finishSession()`.
- **Training expliciet verwerpen** (`execLeaveDiscard()`): een nieuwe,
  derde keuze naast "Training hervatten"/"Pauzeren" in een nieuwe 3-knops-
  modal (`m-exec-leave`, naar het bewezen `m-prog-schedule`-patroon uit
  Program Adaptation V1). Stopt timer/wake-lock/rusttimer, wist de autosave-
  draft, reset alle actieve-instance-state — **schrijft nergens een
  database-actie, roept nergens `finishSession()` of
  `completeTrainingInstance()` aan**. Discard ≠ finish, bewezen via bug-
  terugzet-simulatie (test T16).

**Bewust niet gebouwd**: oefeningen herordenen (P2) — geen bestaande,
eenvoudig herbruikbare reorder-component gevonden; zou nieuwe drag-drop-
infrastructuur vereisen, niet laag-risico. Doorgeschoven naar P2-backlog.
Advanced set types (drop sets/AMRAP/EMOM/endurance-intervals): uitsluitend
een architectuurnotitie geschreven
(`docs/00_Project_Management/ADVANCED_SET_TYPES_ARCHITECTUUR.md`), geen
enkele implementatie — conform expliciete instructie.

Geen databasewijziging. Geen wijziging aan protected core
(`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`/`progression.js`): SHA256-bevestigd byte-identiek — deze
feature raakt uitsluitend de UI-laag (`index.html`), geen enkele
Calculation/Decision Engine-functie.

**A1-eindconclusie**: Workout Execution wordt na deze sprint als
benchmark-volwassen genoeg voor V1 beschouwd. Zie DECISION_LOG.md DEC-037
voor de volledige onderbouwing.

## v4.60.0 — Blocker Elimination V2: gecorroboreerd belastingssignaal (27 augustus 2026)

Autonome implementatiebeslissing door Claude, na een "Blocker Elimination
V2"-onderzoeksronde die alle bestaande HOLD/BLOCKED-items systematisch
opnieuw beoordeelde (zie DECISION_LOG.md DEC-036).

**`duration_s`-registratie geverifieerd, geen actie nodig**: tot en met de
daadwerkelijke schrijfregel in `finishSession()` bevestigd dat dit al
volledig, correct gebouwd is (start/pauze/hervat-gebaseerde berekening,
universeel toegepast). De 0/116 bestaande sessies zijn volledig verklaard
door historische data van vóór deze feature — Groep B, bouwt zichzelf
vanaf nu op, geen te repareren keten.

**G4 (proactieve deload) herbeoordeeld met de volle breedte aan bestaande
inputs** (ACWR, monotonie, RPE, readiness, HRV, pijn, frequentie,
progressie, adherence — expliciet gevraagd, niet opnieuw alleen ACWR).
Twee eerder onderzochte ontwerpen bevestigd terecht afgewezen: (1) ACWR
alleen — tegenstrijdige signalen bij echte data; (2) Training Strain —
vereist persoonlijke-percentiel-vergelijking, geen vaste banden mogelijk
zonder pseudowetenschap.

**Nieuw ontwerp — corroboratie**: in plaats van één complex getal, een
eenvoudiger, conservatiever patroon. Een signaal wordt uitsluitend
afgegeven wanneer **twee onafhankelijke, al bestaande, al geteste
bronnen tegelijk** hetzelfde beeld geven: ACWR-classificatie (hoger/
sterk_hoger) ÉN minimaal twee oefeningen met een dalende progressie-
trend (beide reeds berekend in v4.58.0/v4.59.0). Nooit op één los
signaal — expliciet getest (`corroboratedLoadSignal()`, 11 nieuwe tests
in `core/trainingLoad.js`).

**Kleine, gerechtvaardigde aanpassing** van `tkProgressionTrendContext()`
(v4.59.0): retourneert nu `{tekst, aantalDalend}` in plaats van alleen
tekst, zodat het aantal dalende oefeningen herbruikt kan worden zonder
een tweede, parallelle berekening.

**AI-coachcontext uitgebreid**: bij corroboratie een nieuwe, duidelijk
gelabelde regel, expliciet geformuleerd als "geen automatische
aanpassing, geen advies zonder overleg" — puur een feitelijke constatering
voor een mens-tot-mens-gesprek, geen AI-beslissing, geen automatische
trainingsaanpassing.

**Architectuurgrens bewezen** (niet alleen beweerd): via bug-terugzet-
simulatie aangetoond dat het signaal geen sets/RPE-delta-logica bevat en
`computeProgAdjustment()` nergens aanroept (test S4). Expliciet
geverifieerd dat `core/decision.js` geen enkele referentie naar het
nieuwe signaal bevat (test S7).

Geen databasewijziging. Geen nieuwe Calculation Engine-berekening — 100%
hergebruik van reeds bestaande, geteste, protected `AthleteCore`/
`ProgressionCore`-functies.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`/`progression.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.59.0 — AI Coach: progressie-trend per oefening (27 augustus 2026)

Autonome implementatiebeslissing door Claude, na een "Autonomous Benchmark
Gap Discovery V9"-onderzoeksronde met echt, actueel (2026) extern
marktonderzoek (zie DECISION_LOG.md).

**Benchmarkbewijs**: Alpha Progression (al in Trainingskompas' eigen
benchmarklijst) en Dr. Muscle signaleren beide stagnatie/achteruitgang
**per specifieke oefening** ("lift-by-lift granularity... meer bruikbaar
dan het botte instrument van een one-size-fits-all deload") als kern van
hun product. Trainingskompas had de onderliggende data en berekening
(`ProgressionCore.trendBy()`, protected core) al, en toonde die al —
maar uitsluitend als **losse, passieve geruststelling** ná één individuele
sessie ("Licht dalend — herstel telt ook mee"), nooit als samenvattend
signaal over meerdere oefeningen tegelijk aan de AI Coach.

**Bevestigd met echte productiedata** (geen kunstmatige testdata): oefening
TK-000038 toont een stijgende trend (geschat 1RM 96,25→100 kg over 10
sessies); oefening TK-000019 toont een genuine dalende trend (geschat 1RM
90,7→50,0 kg over 13 sessies) — een reëel, waardevol signaal.

**Nieuwe functie**: `tkProgressionTrendContext()`, exact naar het bestaande
`tkHyroxCoachContext()`/`tkProgramEventContext()`-patroon. Groepeert
recente sessies per oefening, berekent per oefening met ≥3 vergelijkbare
sessies het geschatte 1RM (`CalcCore.oneRMRaw()`, Epley, protected,
ongewijzigd) en de trend (`ProgressionCore.trendBy()`, protected,
ongewijzigd — **dezelfde functie/drempel** als het bestaande post-sessie-
bericht). Verzamelt uitsluitend oefeningen met een daadwerkelijk dalende
trend in een korte, feitelijke tekst voor de AI-coachcontext.

**Expliciet geen deload-advies**: de tekst is uitdrukkelijk gelabeld
"reeds berekend door ProgressionCore, niet zelf herberekenen... geen
deload-advies of trainingsbeslissing hierop baseren tenzij de gebruiker
daar expliciet om vraagt". G4 (proactieve deload) blijft bewust HOLD —
deze feature signaleert uitsluitend, adviseert niets.

**Architectuurgrens bewezen** (niet alleen beweerd): via bug-terugzet-
simulatie aangetoond dat de nieuwe functie geen "deload"-taal, geen sets/
RPE-delta-logica bevat, en `computeProgAdjustment()` nergens aanroept
(tests R6/R7). Expliciet geverifieerd dat `core/progression.js` zelf geen
enkele referentie naar de nieuwe UI-laag-functie bevat (test R11).

Geen databasewijziging. Geen nieuwe Calculation Engine-module — 100%
hergebruik van reeds bestaande, geteste, protected `ProgressionCore`/
`CalcCore`-functies.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`/`progression.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.58.0 — Training Load Advisory: ACWR-classificatie (27 augustus 2026)

Autonome implementatiebeslissing door Claude, na een zelfstandige "Product
Evolution V8"-onderzoeksronde (zie DECISION_LOG.md).

**Cruciale, herziene bevinding**: eerdere sessierondes concludeerden dat G3
(ACWR/trainingsbelasting) volledig geblokkeerd bleef zolang
`sessions.duration_s` onvoldoende gevuld was. Grondig hernieuwd onderzoek
toonde aan dat dit **onvolledig** was: `AthleteCore.unifiedLoad()` (protected
core) is uitsluitend geblokkeerd bij **meerdere, ongelijksoortige eenheden**
tegelijk (bv. kracht + cardio mixen, waarvoor Foster session-RPE×duur nodig
is). Voor een **enkele modaliteit** (zoals overwegend krachttraining) werkt
de volume-gebaseerde belasting — via `tkCoachBelasting()` →
`AthleteCore.dailyModel()`/`serie()`/`acuteChronic()` — al **zonder**
`duration_s`. Bevestigd met echte, 5 maanden oude productiedata (35 unieke
trainingsdagen, ruim boven de 21-dagen-drempel): `acuteChronic()` gaf een
geldig, niet-`null` ACWR-resultaat (`reden:'ok'`).

**Echte ketenbreuk gevonden**: deze al berekende ACWR-waarde bereikte al de
AI Coach-context (via `tkCoachBelasting()` → `tkCoachDataBlok()` →
`buildCtx()`), maar zonder enige duiding — een kaal getal, geen betekenis.

**Nieuwe module**: `core/trainingLoad.js` (nieuw, puur, geen wijziging aan
protected core). `classifyAcwr()` classificeert de reeds berekende ACWR-
waarde volgens de breed gepubliceerde, geciteerde Gabbett (2016)-banden
(<0,8 lager / 0,8–1,3 vergelijkbaar / 1,3–1,5 hoger / ≥1,5 sterk hoger) —
geen zelfverzonnen formule. `acwrAdvisoryText()` levert uitsluitend
neutrale, beschrijvende taal — expliciet getest op afwezigheid van
blessurerisico-/medische-/dwingende taal.

**AI Coach-context uitgebreid**: één nieuwe, duidelijk gelabelde regel
("v4.58.0 — Training Load Advisory") toegevoegd aan de bestaande
`tkCoachDataBlok()`-tekst, direct na de bestaande belastingsregel. Toont
uitsluitend iets wanneer `AthleteCore.acuteChronic()` zelf een geldig
resultaat geeft — respecteert de bestaande, protected datadrempel.

**Architectuurgrens bewezen** (niet alleen beweerd): via bug-terugzet-
simulatie aangetoond dat de nieuwe ACWR-regel geen enkele `sets`/`RPE`-
delta-logica bevat en `computeProgAdjustment()` nergens raadpleegt (test
Q6) — **geen enkele invloed op de bestaande, protected, geteste sets/RPE-
aanpassing**. Puur aanvullende, informatieve AI-coachcontext.

Geen databasewijziging. Geen wijziging aan protected core
(`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`): SHA256-bevestigd byte-identiek, expliciet ook geverifieerd
dat `core/decision.js` zelf geen enkele referentie naar de nieuwe module
bevat.

## v4.57.0 — AI Coach: Goal/Event-Date-context (27 augustus 2026)

Autonome implementatiebeslissing door Claude, na een zelfstandige "Product Gap
Discovery V7"-onderzoeksronde (zie DECISION_LOG.md). Directe, laag-risico
vervolgstap op v4.56.0 (Goal/Event-Date Awareness).

**Gap-analyse**: `event_date`/`daysUntilEvent()` (v4.56.0) werden uitsluitend
gebruikt in de programma-overzicht-UI, nooit doorgegeven aan de AI Coach-
context (`buildCtx()`) — bevestigd via grep, 0 treffers. G3 (ACWR/
trainingsbelasting) opnieuw gecontroleerd en bevestigd nog steeds geblokkeerd
(`sessions.duration_s`: nog steeds 0 van 116 rijen gevuld) — blijft terecht
HOLD, geen nieuwe bouw. G4 blijft eveneens HOLD (afhankelijk van G3).

**Nieuwe functie**: `tkProgramEventContext()`, exact naar het bestaande,
bewezen patroon van `tkHyroxCoachContext()` — haalt het actieve programma met
een ingestelde `event_date` op, gebruikt uitsluitend `ScheduleAdherenceCore`
(geen eigen datumlogica), en levert een reeds berekende, feitelijke
tekstsamenvatting. Defensieve `.catch()`-fallback naar een lege string bij elke
fout — mag de coach-context nooit laten crashen.

**Context Engine-koppeling**: toegevoegd aan `buildCtx()`'s bestaande,
parallelle `Promise.all()`-ophaalronde, en aan de prompt met het label
"reeds berekend, niet zelf herberekenen — uitsluitend informatief, geen
trainingsbeslissing hierop baseren tenzij de gebruiker daar expliciet om
vraagt" — exact dezelfde taalkundige waarborg als bij de HYROX-race-context.

**Architectuurgrens bewezen** (niet alleen beweerd): via bug-terugzet-
simulatie aangetoond dat een fout in `tkProgramEventContext()` correct wordt
opgevangen (test P5), en dat Program Adaptation V1 deze nieuwe functie
nergens raadpleegt (test P9) — volledig gescheiden concerns.

Geen databasewijziging, geen nieuwe Calculation Engine-functie (hergebruikt
volledig `core/scheduleAdherence.js` uit v4.56.0), geen wijziging aan
protected core.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.56.0 — Goal/Event-Date Awareness (27 augustus 2026)

Autonome implementatiebeslissing door Claude, na een grondige, zelfstandige
gap-validatieronde (zie DECISION_LOG.md). Vervolg op de "Autonome Product Gap
Discovery"-onderzoekslijn: G1 (Goal/Event-Date Awareness) bewezen op
Bewijsniveau A — 0 referenties naar event_date/target_date/competition_date
in de volledige codebase én database, en actueel (2026) bevestigd dat
TrainHeroic/Boostcamp expliciet wedstrijddatum-centrisch programmeren.

**Waarom `goals.einddatum` dit niet al oploste**: onderzocht en bevestigd
een fundamenteel ander concept — `goals` is een zuiver numeriek
prestatiedoel-systeem (gewicht/PR/frequentie/volume), geen enkele foreign
key tussen `goals` en `programs`. Een wedstrijddatum zou daar nooit
zichtbaar worden op het programmascherm.

**Database**: `programs` uitgebreid met `event_date` (date, nullable) en
`event_name` (text, nullable). Geen nieuwe tabel — één bron van waarheid,
op programmaniveau (niet op `program_blocks`: het evenement is een
eigenschap van het hele programma, niet van één trainingsdag; niet op
`athlete`/`goals`: zou meerdere-programma's-per-atleet-scenario's en het
bestaande, andere `einddatum`-concept vermengen). Beide bestaande
programma's bevestigd inhoudelijk ongewijzigd na migratie.

**Calculation Engine**: `daysUntilEvent()`/`weeksUntilEvent()` toegevoegd
aan `core/scheduleAdherence.js` (uitbreiding, geen nieuwe module, geen
wijziging aan protected core). Puur, deterministisch: `null` bij
ontbrekende datum, correcte jaargrens-/schrikkeljaarafhandeling, een
verlopen evenement geeft expliciet `null` voor `weeksUntilEvent` (de UI
toont "verlopen", nooit een verwarrend negatief weken-getal).

**UI**: optionele wedstrijddatum + naam bij het aanmaken van een
programma; een "Nog X weken tot [evenement]"-regel op het bestaande
programma-overzicht. Puur informatief in V1 — bewezen (via bug-terugzet-
simulatie, tests O11/O12) volledig losgekoppeld van `phaseForWeek()`,
`completed_at`, `computeProgAdjustment()` en Program Adaptation V1: geen
enkele automatische planning-, fase-, readiness- of belastingsaanpassing.

**Audit-bevinding en fix (vóór merge, tijdens de zelfstandige eindcontrole)**:
de weergavelogica gaf bij een evenement dat VANDAAG plaatsvindt "Nog 0 weken
tot [naam]" i.p.v. het beoogde "Vandaag: [naam]" — `weeksUntilEvent()` geeft
correct `0` (niet `null`) terug op de eventdag zelf, maar de oorspronkelijke
UI-conditie controleerde `wRest!=null` vóór de "vandaag"-tak, waardoor die
tak onbereikbaar was. Gerepareerd door `dRest===0` als eerste, specifiekere
conditie te controleren. Bewezen via bug-terugzet-simulatie (test O13).

**Bewust op HOLD gehouden** (uit dezelfde onderzoekslijn, geen nieuwe
bouw): G2 (performance forecasting) en G3 (ACWR/trainingsbelasting-
activatie — `sessions.duration_s` heeft nog steeds 0 gevulde rijen).

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.55.0 — Program Adaptation V1: gemiste/verplaatste trainingen (27 augustus 2026)

Autonome implementatiebeslissing door Claude, uitgevoerd op basis van vooraf
door Maurice vastgestelde, bindende productbeslissingen (zie DECISION_LOG.md).

**Probleem**: een training die op een andere dag werd uitgevoerd dan gepland,
of volledig gemist werd, gaf geen enkele terugkoppeling — het program_block
bleef voor altijd stil "open" staan.

**Nieuwe module — Calculation/Decision Engine**: `core/scheduleAdherence.js`
(nieuw, puur, geen wijziging aan protected core). `resolveScheduleGap()`
bepaalt deterministisch FUTURE/TODAY/MISSED/COMPLETED/SKIPPED.
`hasScheduleConflict()`/`resolveRescheduleDecision()` voorkomen een stille
overschrijving wanneer een andere training al op de gekozen datum staat.

**Database**: `program_blocks` uitgebreid met `rescheduled_from` (date),
`reschedule_reason` (missed/early/manual), `schedule_status`
(on_time/rescheduled/skipped) — bestaande RLS-policy (`user_id = auth.uid()`)
dekt dit al, geen nieuwe policy nodig. Alle 32 bestaande rijen ongewijzigd
(nieuwe kolommen NULL). Geen nieuwe tabel.

**UI**: nieuwe, contextuele prompt (`m-prog-schedule`) bij het openen van een
niet-afgeronde training op een afwijkende datum — drie gelijkwaardige keuzes
("Deze training vandaag doen" / "Planning aanpassen" / "Overslaan"), gestileerde
modal (geen `confirm()`). "Vandaag doen" wijzigt `planned_date` bewust NIET en
hergebruikt de volledige, ongewijzigde readiness-check-in/`computeProgAdjustment()`-
flow. "Planning aanpassen" wijzigt uitsluitend het aangeklikte block — nooit
`week_nr`, `fase_naam`, of andere blocks. `heergenereerResterendeWeken()`
blijft ongewijzigd bestaan, wordt niet gebruikt als workaround.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.54.0 — Advanced Women's Performance Insights: trend per cyclus, symptomen × training (26 augustus 2026)

Women's Performance Blueprint Fase 3. Autonome implementatiebeslissing door
Claude tijdens een onbeheerde master-sprint (zie DECISION_LOG.md).

Gap-analyse: Fase 7-A/B/C (cyclus × training overview, data sufficiency) bleken
al grotendeels gebouwd in PR #47 (v4.53.0). Nieuw toegevoegd:

**core/cycleTraining.js (uitgebreid, geen nieuwe module)**:
- `cycleTrainingSummary()`: nieuwe transparantievelden (`aantalGebruikteTrainingen`,
  `aantalGeregistreerdeCycli`, `datumbereik`) — verplichte, expliciete
  "gebaseerd op X trainingen en Y cycli"-herkomstvermelding.
- `trainingTrendPerCycle()`: HISTORISCHE trend per afgeronde, individuele
  cyclus (aantal trainingen/gemiddelde RPE/duur) — uitsluitend voltooide
  cycli, nooit de huidige, nog lopende cyclus (geen extrapolatie/
  voorspelling).
- `symptomTrainingOverlap()`: feitelijke telling van hoeveel geregistreerde
  symptoomdagen samenvielen met een trainingsdag — drempel van minimaal 3
  symptoomdagen, geen causale taal.

**UI**: transparantieregel, trend-per-cyclus-kaart en symptomen-x-training-
kaart toegevoegd aan het bestaande cyclusscherm (Lichaam → Cyclus). Bestaande
designtaal, geen nieuwe visuele stijl.

**Bewust niet gebouwd** (conform de vier bestaande DECISION REQUIRED-
documenten): geen enkele zwangerschaps-, postpartum-, menopauze- of
anticonceptie-gerelateerde logica. Geen nieuwe trainingsbelastingformule
(bestaande RPE/duur-gemiddelden waren al voldoende betrouwbaar).

Geen databasewijziging — uitsluitend nieuwe, pure berekeningen op reeds
bestaande RAW DATA (`cycle_periods`, `cycle_symptom_logs`, `sessions`).

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.53.0 — Cyclus-training-correlatie + Women's Performance-dashboard + cycleContext()-bugfix (26 augustus 2026)

Women's Performance Blueprint Fase 2. Autonome implementatiebeslissing door
Claude tijdens een onbeheerde master-sprint (zie DECISION_LOG.md).

**Bugfix in reeds gemergede code (v4.51.0)**: `CycleCore.cycleContext()`'s
`menstruatieActief`-berekening controleerde altijd de LAATST GELOGDE periode,
ongeacht de opgevraagde datum. Dit klopte toevallig zolang uitsluitend
"vandaag" werd bevraagd, maar gaf een fout resultaat bij een historische
datum met meerdere gelogde cycli — ontdekt tijdens de bouw van de cyclus-
training-correlatie (die historische trainingsdata tegen cyclusdata legt).
Gerepareerd: dezelfde "meest recente periode die vóór of op de gevraagde
datum begon"-logica als `cycleDay()` al gebruikte. Bewezen effectief via
bug-terugzet-simulatie (nieuwe tests L1-L4 in fCycle.test.js).

**Nieuwe module — cyclus-training-correlatie**: `core/cycleTraining.js`
(nieuwe, pure Calculation Engine-module). Uitsluitend feitelijke tellingen/
gemiddelden: trainingen per geschatte cyclusfase, gemiddelde RPE/duur per
fase (drempel: minimaal 3 sessies per fase), trainingen tijdens
geregistreerde menstruatie. Geen enkele causale claim.

**Nieuwe UI — Women's Performance-dashboard**: geïntegreerd in het bestaande
cyclusscherm (Lichaam → Cyclus), toont uitsluitend onderdelen waarvoor
daadwerkelijk voldoende data bestaat, met een expliciet voorbehoud
("feitelijke tellingen, geen medische verklaring of advies"). Bestaande
designtaal, geen nieuwe visuele stijl.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.52.0 — Cyclustracking-audit + PMS/symptoomregistratie (26 augustus 2026)

Vervolg op v4.51.0's cyclustracking-MVP, uitgevoerd tijdens een onbeheerde
master-sprint (autonome implementatiebeslissing door Claude — zie DECISION_LOG.md).

**Audit-bevinding en fix**: `cyclusStartMenstruatie()` had geen server-bevraagde
controle op een reeds actieve (niet-afgeronde) periode — uitsluitend de UI-
knopzichtbaarheid voorkwam overlap. Concreet gereproduceerd (corrumpeerde
`averageCycleLength()` tot een onzinnige waarde); gerepareerd met een expliciete
check vóór het schrijven, bewezen effectief via bug-terugzet-simulatie.

**Nieuwe feature — PMS/symptoomregistratie**:
- Nieuwe tabel `cycle_symptom_logs` (RAW DATA: optionele, dagelijkse 0-10-
  schalen), RLS-trigger/policy identiek aan het gevestigde patroon.
- Nieuwe, pure `CycleCore.symptomPatternSummary()`: uitsluitend feitelijke
  tellingen ("je registreerde X op Y van Z cycli"), nooit causale/hormonale
  taal, harde drempel van ≥3 cycli vóór iets getoond wordt.
- UI: vijf symptoomsliders in het bestaande cyclusscherm, plus een neutraal
  patroonkaartje met expliciet voorbehoud.

**Privacy/AVG-fix**: `cycle_symptom_logs` ontbrak in de accountverwijderlijst
(`netlify/functions/delete-account.js`) en in de referentielijst van
`core/fRC0.test.js` — beide gerepareerd, bewezen effectief.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.51.0 — Cyclustracking-MVP (26 augustus 2026)

Nieuwe, optionele feature: menstruatiecyclus als trainingscontext (roadmap POST-V1
#7). Autonome implementatiebeslissing door Claude tijdens een master-sprint,
gebouwd volgens de bestaande Calculation & Evidence Architecture, geen medisch
hulpmiddel.

- **Database**: nieuwe tabel `cycle_periods` (start_date/end_date, RAW DATA),
  RLS-trigger/policy exact identiek aan het gevestigde patroon van `hrv_log`/
  `athlete_conditions` (`user_id = auth.uid()`, alle commando's). `migratie_v495.sql`.
- **Calculation Engine**: nieuwe, pure module `core/cycle.js` (cyclusdag,
  gemiddelde cycluslengte, geschatte volgende menstruatie, geschatte fase).
  Hergebruikt bewust de al bestaande, protected `CalcCore.cyclusDagFactor()`-
  vocabulaire (`menstruatie`/`folliculair`/`ovulatie`/`luteaal`, al aanwezig via
  de dagelijkse HRV-check-in) in plaats van een tweede vocabulaire te
  introduceren. Geen wijziging aan protected core.
- **UI**: nieuw subscherm Lichaam → Cyclus (opt-in, start/einde registreren,
  geschatte dag/fase met expliciete schattings-taal, historie, volledige
  verwijderopties), in de bestaande designtaal.
- **Medische grenzen**: expliciet geen anticonceptie-, zwangerschaps- of
  diagnoseclaims; voorspellingen alleen na ≥2 geregistreerde cycli, altijd
  gelabeld als schatting.
- **Bewust niet gedaan**: geen AI-koppeling (`buildCtx()`) voor cyclusdata —
  aparte, latere beslissing.

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`): SHA256-bevestigd byte-identiek, onaangetast.

## v4.50.0 — HYROX/Triathlon race_segments-architectuur, roadmap-raw-data en database hardening (26 augustus 2026)

Verzamelt de wijzigingen uit tien gemergede PR's (#33–#42) die sinds v4.49.0 geen
versiebump kregen (Wet 84-schending, hersteld in deze release):

- **HYROX/Triathlon-brick**: eerste-klas bereikbaar via Training → Bouwen & verkennen
  (PR #33). Kritieke productiebug gerepareerd: segmentopslag faalde op een niet-
  bestaande `extraNote`-kolom (PR #34). Volledige architectuurmigratie naar een
  dedicated `race_segments`-tabel met afdwingbare `NOT NULL`-FK en een expliciete
  `race_type`-kolom op `training_instances`, ter vervanging van de eerdere
  `note`-tekstannotatie-workaround (PR #35, `migratie_v490.sql`/`migratie_v491.sql`).
  Context Engine-koppeling: de AI Coach ontvangt nu voorberekende HYROX/Triathlon-
  racesamenvattingen (`tkHyroxCoachContext()`).
- **Calculation Engine-consolidatie**: vier resterende tonnage-/percentage-
  berekeningsduplicaten buiten `CalcCore` gevonden en geconsolideerd (PR #36).
- **Roadmap POST-V1, raw-datavastlegging**: `duration_s` per sessie (PR #37),
  daadwerkelijke rustduur per set in `sets_detail` (PR #38), weer per sessie via de
  bestaande weerinfrastructuur (PR #39) — alle drie bewust beperkt tot raw-data-
  vastlegging; de bijbehorende Relationship Engine-registryvlaggen blijven
  `beschikbaarheid:'toekomstig'` totdat er voldoende echte productiedata is om de
  nieuwe relaties te verifiëren.
- **Databasehardening**: 44 ontbrekende FK-indexen aangemaakt (PR #40). Vier
  bewijsbaar-altijd-gevulde nullable FK's (0 NULL-waarden over 276 rijen)
  aangescherpt naar `NOT NULL` (PR #42, `migratie_v494.sql`).
- **Accessibility**: pinch-zoom weer toegestaan — `maximum-scale=1,user-scalable=no`
  verwijderd uit de viewport-meta, zonder gedocumenteerde reden voor de eerdere
  restrictie (PR #41).

Protected core (`calculation.js`/`decision.js`/`relationship.js`/`athlete.js`/
`coaching.js`) is door alle tien PR's heen SHA256-bevestigd byte-identiek gebleven.

## v4.49.0 — HYROX, Adaptive Triathlon en correction-state remediation (24 augustus 2026)

HYROX-race-tracking (Single/Doubles/Relay/Adaptive) en triathlon-brick geïntegreerd, met de volledig bronbevestigde HYROX Adaptive-classificaties (13 waarden, rulebook 26/27). Race-context wordt vastgelegd via zes nieuwe, additieve kolommen op `training_instances` (`race_format`, `race_tier`, `race_gender`, `race_relay_age_category`, `race_relay_division`, `race_adaptive_class`), met een CHECK-constraint die uitsluitend de 13 canonieke Adaptive-waarden toestaat (live op Supabase geverifieerd). Bestaande HYROX-tijdrekenlogica (stationduur, transitietijd) is geconsolideerd in `core/cardio.js` (`CardioCore.stationDurationS`/`segmentTransitionS`) als enige bron van waarheid, in plaats van een los duplicaat in `index.html`.

**Correctie op een voltooid stationresultaat toonde de oude waarde (P1).** `hyroxCorrigeerLaatste()` patchte de database correct, maar werkte het live `hyroxActive.voltooid`-object nooit bij — het resultatenscherm en de lokaal opgeslagen racestatus (`tk_hyrox_active`) bleven daardoor de oude, ongecorrigeerde waarde tonen totdat de app opnieuw werd geladen. Gereproduceerd met een deterministische test vóór de fix; nu synchroniseert de correctie direct de live state, de lokale opslag én het scherm.

**HYROX/Adaptive Triathlon was voor een gebruiker onbereikbaar (P0).** Het startpunt in de Workout Builder (`#hyrox-entry`) ontbrak in de daadwerkelijke schermopbouw, waardoor de bijbehorende knop nergens verscheen en niemand het HYROX-opzetscherm kon openen. Hersteld; bevestigd met een echte DOM-test die zowel de knop als de koppeling naar het opzetscherm controleert.

## v4.48.0 — RC0: release candidate voor Google Play Internal Testing (19 augustus 2026)

Geen nieuwe functionaliteit. Deze release maakt bestaande functionaliteit betrouwbaar, zichtbaar en uitleverbaar. Volledige verantwoording in `docs/RELEASE_READINESS.md`, `docs/PLAY_STORE_READINESS.md` en `docs/RELEASE_CHANGELOG.md`.

**Verlopen sessie gaf stil dataverlies (P0).** Android bevriest achtergrondtimers, dus `scheduleAuthRefresh()` liep niet door zolang de app in de achtergrond stond. Bij terugkeer was het token verlopen en loog de app daarover: `sbGet` gaf `[]` (elk scherm toonde "geen data", niet te onderscheiden van dataverlies) en `sbPostQ` gaf `false` zónder te queuen — zojuist ingevoerde sets waren echt weg. Alle REST loopt nu via `sbFetch`: één 401 → één gedeelde refresh (single-flight, want Supabase roteert refresh-tokens) → één retry met een per poging opnieuw opgebouwde header. Mislukt de refresh, dan volgt een expliciete melding en het loginscherm. Schrijfacties met een herstelbare status (401/408/425/429/5xx) gaan naar de offline-wachtrij; 400/409/422 niet, want die zouden eeuwig herhalen.

**Dubbele sessierijen bij gelijktijdige sync (P0).** `flushOfflineQueue()` heeft drie aanroepbronnen (online-event, visibilitychange, opstart) en geen slot; twee doorlopen konden hetzelfde item versturen vóór de eerste het had verwijderd. Her-entree-slot toegevoegd; zonder sessie wordt er niets verstuurd en blijft de wachtrij intact. Terugkeer uit de achtergrond valideert nu eerst de sessie en synchroniseert daarna.

**Tweede sporter op één toestel sloeg de intake over (P1).** Tien geschreven `localStorage`-sleutels stonden niet in `PERSONAL_CACHE_KEYS`, met als zwaarste `tk_onboarding_done`: de tweede sporter kreeg meteen het dashboard, zonder profiel, doel of sport. Ook coachvoorkeuren, apparatuurgeheugen, machinelijsten en de gekozen cardio-machine (`sel_*`) erfde hij over. Aangevuld, plus een tweede bron van waarheid: een bestaand `atleet_profiel` telt als afgeronde onboarding, zodat dezelfde sporter op een nieuw toestel de intake niet opnieuw hoeft te doen. `fFase2.test.js` bevat nu een generiek net dat elke geschreven sleutel dwingt te classificeren als persoonlijk of toestelgebonden.

**Trainingskoppeling overleefde geen herstart (P1).** `activeInstanceId` zat niet in de draft. Sloot Android de app tijdens een training, dan was de koppeling bij hervatten weg en werd `completeTrainingInstance()` nooit aangeroepen — precies de 128 weesrijen die migratie v446 achteraf moest opruimen. De instance-id reist nu mee.

**Terugknop sloot de app af vanaf elk scherm (P1).** De app bouwde geen history-entries op, dus de standaard Capacitor-BridgeActivity sloot de activiteit bij elke terugveeg. Eén ondiepe schermstapel als omhulsel om `go()` (geen router, geen wijziging aan schermen of aan de honderden bestaande aanroepen) en één centrale popstate-handler die eerst een open modal sluit, de coach-regel uit v306 behoudt, en op het beginscherm pas bij de tweede terugveeg binnen 2,5 s laat afsluiten.

**Het bewijsspoor is zichtbaar geworden (P1).** `evidence_snapshot.v1` werd sinds Sprint 18 bij elke afronding weggeschreven in `sessions.sets_detail`, maar `tkEvidenceVanSessie` en `tkEvidenceVanSessieAlle` hadden nul aanroepers buiten de tests. Daarmee was de kernbelofte technisch aanwezig en voor de sporter onzichtbaar. Het logboek toont nu per oefening een knop 'ⓘ Waarom' — alleen wanneer er echt een snapshot in de rij zit — met exact de vijf secties van het contract. De weergavelaag roept geen enkele rekenfunctie aan, zodat het scherm nooit iets anders kan tonen dan wat destijds is besloten.

**Accountverwijdering was onvolledig (P1).** Elf tabellen met gebruikersgegevens bleven achter, waaronder `wearable_connections` — met het access- én refresh-token in leesbare vorm. In strijd met de eigen privacytekst en met de Play-eis. Aangevuld met `training_instances`, `training_context`, `common_data_points`, `external_records`, `external_connections`, `wearable_connections`, `wearable_oauth_state`, `memberships`, `usage_log` en `user_credit_purchases`, plus beide richtingen van `content_shares` en de persoonlijke rijen (gym_id leeg) van `equipment_catalog` en `exercise_equipment` — zodat gedeelde gym-inrichting van andere leden blijft bestaan.

**Beheer onbereikbaar voor een solo-sporter (P1).** `teamRoleLevel === -1` betekende zowel "geen gym" als "nog niet opgehaald", dus de solo-sporter kwam op de gedeelde pincode-muur terecht en kon zijn eigen apparatuur en oefeningen niet beheren — terwijl `canEditEquipmentCatalog()` hem dat recht wél geeft. Een aparte `teamAccessResolved`-vlag scheidt de twee.

**`[PLACEHOLDER]` stond zichtbaar in het scherm Help (P1).** Vervangen door een echt contactblok dat op één constante draait (`SUPPORT_EMAIL`). Het adres wordt niet verzonnen: staat de constante leeg, dan verschijnt een eerlijke tekst in plaats van een kapotte link.

**Privacyverklaring (Play-vereiste).** `privacy.html` toegevoegd: losstaand, scriptloos, opgesteld uit wat code en database feitelijk doen — verwerkers en hun regio's, de rol van de AI-coach, de RLS-scheiding, accountverwijdering, export, en een expliciete vermelding dat de app geen medisch hulpmiddel is. De app linkt ernaar vanuit Help.

**Android: van gegenereerde standaardconfiguratie naar een uploadbare release.**
- *targetSdk 34 → 36.* Google Play eist sinds 31-08-2025 minimaal API 35 en vanaf 31-08-2026 API 36. AGP 8.2.1 → 8.9.1, Gradle-wrapper 8.2.1 → 8.11.1.
- *Artefact van ~450 MB → 14 MB.* `videos/` (437 MB) werd integraal meegebundeld, ver boven het Play-plafond van 200 MB voor de basismodule. De service worker haalde video's al on-demand op en cachet ze met een LRU-plafond van 250 MB, dus bundelen was dubbelop; `MEDIA_ORIGIN` in `sw.js` regelt van welke oorsprong de native app ze haalt. Ook de 62 `*.test.js` gingen mee het artefact in; die worden nu gefilterd.
- *Ondertekening.* De release-buildtype had geen `signingConfig` en leverde een ongetekend artefact. Toegevoegd, lezend uit `android/keystore.properties` (gitignored) of uit omgevingsvariabelen, met een expliciet verbod op terugvallen op de debug-sleutel.
- *Back-up.* `android:allowBackup` stond op `true`; de WebView-opslag bevat het sessietoken. Uitgezet, met `data_extraction_rules.xml` en `backup_rules.xml` die alle domeinen uitsluiten voor zowel cloud-backup als toesteloverdracht.
- *Merkbeeld.* Launcher-iconen en splash waren nog het standaard Capacitor-logo. Alle resources afgeleid uit `icon-512.png` en `logo-wordmark.png`; generatiescript staat als `scripts/android-icons.py` in de repository.
- *Edge-to-edge.* `viewport-fit=cover` ontbrak, waardoor elke `env(safe-area-inset-*)`-regel 0 opleverde. De vaste bovenmarge van `.hdr` is een `max()` geworden: 52px blijft de ondergrens en groeit alleen mee bij een grote uitsparing.
- *Toestelbereik.* `bluetooth_le` staat op `required="false"`.
- *Versie.* `versionCode 1` / `versionName "1.0"` liepen uit de pas met de app zelf; nu 44800 / 4.48.0.

**Relationship-audit, tweede ronde.** Geen nieuwe relatie toegevoegd — het register telt onveranderd 21 variabelen, want geen van de zes ontbrekende variabelen kan worden ontsloten zonder eerst nieuwe data vast te leggen. Wel een correctie: de audits van sprint 25, 26 en de Fase-2-verificatie zijn gedraaid op een service-role-dump die de rijen van twee accounts bevatte. Dat kan in de app niet gebeuren (RLS), maar het maakte die cijfers wel onjuist. Opnieuw gedraaid op één gebruiker: 23 circulair uitgesloten (was 24), 187 kenbare relaties (was 186), 82 doorgerekend, **7** gevalideerde patronen (was 6) — het extra patroon is *Aantal sets ↔ Topgewicht*. Zie `docs/RELATIONSHIP_AUDIT.md`.

**Tests.** 66 bestanden groen, 0 rood. Release gate 12/12. Vier nieuwe suites: `fSessieIntegriteit` (38), `fAndroidRelease` (27), `fRC0` (26), `fNavigatie` (14). Geen test verwijderd of verzwakt; één aangescherpt (`fFase2` C2 keek naar tekenafstand in de bron en eist nu de juiste volgorde: sessie valideren vóór synchroniseren).

**Database.** Geen wijzigingen. 11/11 migraties geverifieerd tegen het productieschema; 65 tabellen, 85 policies, 0 tabellen zonder RLS.

## v4.47.0 — Fase 2 afronding: levenscyclus, robuustheid en bevestigde offline sync (19 augustus 2026)

Fase 2 is gedefinieerd als login, RLS, offline sync en multi-user (Product_Book.md). De kern daarvan stond er al; wat ontbrak waren de bevestiging, twee gaten en de opruiming.

**Levenscyclus van training_instances hersteld.** `completeTrainingInstance()` bestond sinds Werkblok A maar werd nergens aangeroepen. Elke via Preview of Guided gestarte training bleef daardoor voor altijd op status `active` staan: 139 rijen, waarvan 128 zonder ook maar één sessie. De aanroep zit nu in beide afrondingspaden, vóór `activeInstanceId` wordt gewist, via de offline-veilige `sbPatchQ` — een verbroken verbinding queuet de afronding in plaats van hem te verliezen. Een Guided-sessie zonder gelogde sets blijft bewust `active`. `migratie_v446.sql` ruimt de historische rijen op: rijen mét sessies worden `completed` met een afgeleide `completed_at`, rijen zonder sessies worden `abandoned`. Er wordt niets verwijderd; de snapshots blijven volledig bewaard.

**Robuustheid: 43 queries in 25 render- en refresh-functies lopen nu via `v43SafeGet`.** `sbGet` gooit nooit — bij een fout geeft hij al `[]` terug. Het enige wat ontbrak was een bovengrens op de wachttijd, waardoor een niet-antwoordende Supabase elk renderpad oneindig liet hangen. Het gedrag bij falen is identiek gebleven; alleen de oneindige wachttijd is weg. Home, Voortgang, Kalender, Lichaam, Programma's en de beheer-schermen zijn hiermee gedekt.

**Twee open Fase-2-vinkjes functioneel bevestigd.** Nieuw `core/fFase2.test.js` (25 asserts) draait de verzonden implementaties uit index.html in een zandbak met een nagebouwde localStorage, IndexedDB en fetch:
- per-user profielscheiding: cachesleutels, per-oefening-1RM's, de eigenaarswissel op één toestel, en het legen van de module-variabelen die ooit de 1RM's van het vorige account lieten staan;
- offline sync: queuen bij offline én bij netwerkfout, NIET queuen bij een serverfout, filters op PATCH/DELETE, volgorde bij afspelen, één mislukt item blokkeert de rest niet, wegvallend netwerk verliest niets, badge, meldingen en de drie synctriggers.

**Relatie-audit: één nieuwe grootheid, twee correcties.** Van elf berekende grootheden die nog niet in het variabelenregister stonden haalt er één alle vijf de criteria: **rustdagen vóór een training**. Deterministisch, met de kalender als enige ruwe invoer. Spierbelasting, dagzone en het progressiebesluit zijn bewust NIET toegevoegd (delen invoer met volume, dagfactor respectievelijk RPE); trainingsfase, -doel, niveau en cyclusfase zijn categorisch en dus ongeschikt voor een rangcorrelatie.

Daarbij bleek weekbelasting tegen rustdagen r = −0,41 op te leveren — puur omdat een rollende zevendaagse som daalt zodra je minder vaak traint. Dezelfde klasse fout als het weekbelasting/volume-schijnverband uit v4.45.1. `weekbelasting` en `load_vorige_dag` noemen daarom nu `kalender` als ruwe invoer, waarmee die tautologische paren correct worden geweigerd.

Effect op de huidige dataset: doorgerekende relaties 70 → 82, patronen 3 → 6. Nieuw gevonden: **rustdagen vóór een training ↔ zwaarste set, r = +0,455 over 32 dagen (matige samenhang)**.

**Correctie tijdens uitvoering.** De eerste versie van `migratie_v446.sql` gebruikte de statuswaarde `abandoned`. Die bestaat niet — `training_instances_status_check` staat alleen `active`, `completed` en `aborted` toe — waardoor stap 2 afbrak met fout 23514 en de hele migratie terugrolde (geen half uitgevoerde staat). De migratie gebruikt nu `aborted`, leest in stap 0 eerst zelf de constraint uit en draait als één alles-of-niets-transactie. `core/fFase2.test.js` sectie D (4 asserts) bewaakt voortaan dat zowel de app als elke migratie uitsluitend toegestane statuswaarden gebruikt, en dat geen migratie een destructieve opdracht bevat.

Tests: 62 bestanden groen, 0 rood. Release gate 12/12. Home, Training, Coach, Lichaam, Voortgang, Historie en Kalender byte-identiek geverifieerd tegen origin/main.

## v4.46.0 — Sprint 26: Relationship Visibility & Evidence (19 augustus 2026)

Geen nieuwe intelligentie. Deze sprint zorgt dat wat de engines al weten de sporter ook bereikt.

**Niets verdwijnt meer stilzwijgend.** `RelationshipCore.rank()` leverde alleen de afgekapte lijst; de UI liet daardoor 29 van de 43 doorgerekende kandidaten verdwijnen zonder melding. De functie levert nu ook `inAanmerking` (volledig, gerangschikt, ongekapt) en `maximum`. De afkapping blijft — een scherm met 68 kaarten leest niemand — maar het overzicht meldt hoeveel er niet getoond worden en de sporter kan ze uitklappen. Drempels en rangschikking ongewijzigd; `zichtbaar` is exact het eerste stuk van `inAanmerking`.

**"Meer data nodig" en "te weinig variatie" zijn niet langer hetzelfde.** Bij lichaamsgewicht stonden 35 vergelijkbare dagen (ruim boven de drempel van 30) onder de kop "Meer data nodig · nog 0 te gaan" — onwaar en verwarrend. Het onderscheid bestond al in de engine (`data_quality.bruikbaar` + `redenen`); de UI leest het nu en noemt bovendien wélke meting te weinig verandert. De zinloze teller verdwijnt bij een kwaliteits- of variatieweigering.

**Drie van de vier ontbrekende inputs aangesloten**, alle drie via bestaande functies: dagfactor en gereedheid via `hrvDagFactorPersonal` → `dagfactor` → `readinessPercent` (met de baseline van díe dag, niet die van vandaag), topgewicht als dagmaximum in AthleteCore. Cardio-split is bewust NIET aangesloten: een dagreeks eroverheen mengt machines (58 s/500 m op een bike-erg naast 108 op een roeier), wat in tegenspraak is met de bestaande machine-bewuste cardio-recordregel. Welke sleutel de reeks moet dragen is een productbeslissing.

**Evidence-aansluiting hersteld.** Het Guided-pad riep `buildStrengthSessionRow` aan zonder `at` en zonder `voorschrift`; `buildDecisionEvidence` markeert een snapshot zonder tijdstempel als ongeldig, waarna het bewijsspoor stil wegviel. Beide schrijfpaden geven nu dezelfde velden mee. De sessierij zelf is byte-identiek — evidence blijft additief in `sets_detail`.

Effect op de huidige dataset: doorgerekende relaties 43 → 70, patronen 2 → 3, kandidaten in aanmerking 43 → 68. Home, Training, Workout Builder, Coach en de Fitbit-keten zijn byte-identiek geverifieerd.

Tests: `core/fZichtbaarheid.test.js` (68 asserts). Regressie 61/61 groen, release gate 12/12.

## v4.45.0 — Night Sprint 19–23: Training Intelligence (18 augustus 2026)

Verbanden zijn geen vaste lijst meer. Wat de sporter ziet volgt uit welke meetreeksen er werkelijk zijn.

**Sprint 19 (v4.41.0) — Relationship Discovery Engine (`relationship.v1`).** Nieuw `core/relationship.js`: inventariseert beschikbare dagreeksen, vormt kandidaatparen, toetst spreiding en datakwaliteit, classificeert en rangschikt. Correleren blijft `CalcCore.spearman`, keuren blijft `DeviceCore.pairQuality`, vrijgeven en formuleren blijft `DecisionCore.releaseVerband` — de engine krijgt die ingespoten en weigert te draaien als ze ontbreken. 20 variabelen in vier domeinen. Vijf toestanden waarvan `NO_PATTERN` expliciet iets anders is dan `INSUFFICIENT_DATA`. Drempel voor een patroon blijft 30 dagen, gelijk aan de bestaande `VERBAND_MIN_N`.

**Sprint 20 (v4.42.0) — Verbanden-experience.** Nieuw scherm `s-lich-verbanden` met filters per domein, drie secties (gevonden patronen / onderzocht-geen-patroon / nog te weinig data) en een afsluitende zin die duidelijk maakt dat dit geen vaste lijst is. Detailscherm met periodekeuze 7/30/90 dagen/1 jaar en een blok "Hoe is dit bepaald?" met alle bepalende getallen en contractversies. Bij te weinig data nooit een conclusie, wel hoeveel dagen er nog nodig zijn.

**Sprint 21 (v4.43.0) — Unified Athlete Intelligence.** Nieuw `core/athlete.js`: dagbeeld per modaliteit, weekbelasting, frequentie, monotonie (Foster), acuut/chronisch en een prestatie-index ten opzichte van het eigen mediane niveau per oefening. Er komt bewust GEEN getal dat kracht en cardio optelt: dat vraagt sessie-RPE × duur en duur wordt niet opgeslagen. `unifiedLoad` levert daarom `null` met `ontbreekt:['duur_per_sessie']`. Multi-sport voorbereid via het bestaande `SportDefinitionCore`.

**Sprint 22 (v4.44.0) — Coach Intelligence (`coach_intelligence.v1`).** De AI krijgt geen ruwe reeksen meer maar uitkomsten: maximaal drie geprioriteerde, vrijgegeven patronen plus belasting en herstelstatus. `intelligenceAiPayload` houdt coëfficiënt, id en datakwaliteit tegen. Expliciet verboden: trainingsadvies afleiden uit een verband — dat komt uitsluitend uit de Decision Engine. Opgeruimd: `tkVerbandBereken`, `tkVerbandData`, `TK_VERBAND_VENSTER`, `openVerband`.

**v4.45.1 — schijnverband weggehaald.** Bij de eindanalyse op de echte data kwam `weekbelasting` als *sterk patroon* naar boven tegenover volume, sets en trainingsbelasting (r tussen 0,62 en 0,71, hoge betrouwbaarheid) — en twee daarvan haalden de coach. Dat was geen bevinding maar een fout in het variabelenregister: de weekbelasting is de rollende som van diezelfde dagwaarden, dus er werd een som met een van zijn eigen termen vergeleken. De invoerlijst van `weekbelasting` is gecorrigeerd naar de ruwe invoer die hij werkelijk gebruikt (inclusief die van gisteren, want het venster bevat gisteren), waardoor de circulariteitstoets deze paren nu weigert. Weekbelasting tegenover HRV, slaap of rusthartslag blijft wél een geldige kandidaat. Vier regressietests bewaken de hele klasse, niet alleen dit geval.

**Sprint 23 (v4.45.0) — Integratie en hardening.** 14 datascenario's (geen data, weinig data, dubbele dagen, ontbrekende en onmogelijke waarden, stilstaande reeksen, gaten in de tijd, meerdere sporten, vertraagde sync) door de hele keten. Architectuurgrenzen, prestatie, privacy en service worker vastgelegd in tests. Nieuw: `docs/RELATIONSHIP_ENGINE.md`.

Volledige regressie: 60 testbestanden groen, 0 rood, ~3470 asserts. Home, Training, de Workout Builder, de live coach uit Sprint 13 en de navigatie zijn ongewijzigd.


## v4.40.0 — 18 augustus 2026 (Sprint 18 — Evidence persistence & provenance)

De app kon al een licht bewijsobject samenstellen en legt daarmee vast welke regel gold bij het *plannen* van een training. Wat ontbrak was het bewijs achter een genomen beslissing: welke ruwe waarden lagen eronder, wat is daaruit berekend, welke regel besliste wat, en hoe is dat uitgelegd. Zonder dat is "ga naar 102,5 kg" achteraf niet te controleren.

### Wat er al was en dus niet is herbouwd

`evidence.v1` (`buildEvidence`, `decisionRulesSnapshot`) blijft ongewijzigd bestaan — die vorm wordt door bestaande tests vastgehouden en dient het planningsspoor in `training_instances.snapshot`. `core/scientificEvidence.js` (`evidence_store.v1`) doet iets anders: dat valideert wetenschappelijke bronnen achter regels, niet individuele beslissingen. Beide zijn niet aangeraakt.

Ook hergebruikt: de bestaande DataAccess-laag (`sbPostQ`/`sbPatchQ` met IndexedDB-wachtrij), het client-gegenereerde `training_instance_id`, en de jsonb-kolom `sessions.sets_detail`.

### Beslissingssnapshot — `evidence_snapshot.v1`

Een eigen versie-id, bewust niet `evidence.v1`: twee verschillende vormen onder één versienummer zou het contract juist onbetrouwbaar maken.

Vijf gescheiden secties, zodat later altijd te zien is waar een getal vandaan kwam: **raw** (wat de sporter leverde, inclusief wat er voorgeschreven was), **calculated** (wat daaruit is gerekend), **decision** (wat de Decision Engine besloot), **rule** (welke regel en welke versie dat deden) en **explanation** (de tekst, nooit een bron van waarheid). Daarnaast het tijdstip, de context en `versions` met de reken-, regel- en evidenceversie.

**Ontbrekende gegevens blijven ontbreken.** Een veld dat er niet was komt als `null` in de snapshot en staat met naam in `missing`. Er wordt niets geïnterpoleerd, geschat of door de AI aangevuld. Zonder beslissing of zonder tijdstip is de snapshot expliciet `geldig: false` — een bewijsstuk zonder beslissing bewaren heeft geen betekenis.

**Deterministisch.** Geen `Date.now` in de bouwer: het tijdstip wordt ingespoten. Dezelfde ruwe invoer, dezelfde engineversies en hetzelfde tijdstip geven byte-identiek dezelfde snapshot.

### Persistence zonder tweede opslagarchitectuur

Het spoor reist mee ín `sessions.sets_detail`: dezelfde jsonb-kolom, dezelfde rij, dezelfde offline-veilige schrijfweg, gekoppeld aan het bestaande `training_instance_id` plus oefening, datum en setnummer. Geen nieuwe tabel, geen migratie, geen tweede sleutelruimte. Bestaande lezers van `sets_detail` zien exact dezelfde velden als voorheen; `evidence` komt er additief bij.

Terugleeslaag: `tkEvidenceVanSessie(row, setNummer)` en `tkEvidenceVanSessieAlle(row)`. Beide geven `null` respectievelijk een lege lijst bij alles wat geen herkenbare snapshot is — er wordt nooit een vorm gereconstrueerd.

### Een snapshot verandert niet met terugwerkende kracht

Elke waarde wordt bij het bouwen gekopieerd, niet als referentie bewaard, en de lezer krijgt opnieuw een kopie. Wijzigt de sporter later een voorschrift, dan blijft de oude snapshot staan zoals hij was — getest door de bron ná het bouwen te wijzigen en door via de lezer te proberen te muteren. Twee sessies met een verschillend voorschrift leggen ook aantoonbaar verschillende waarden vast.

### Reproduceerbaarheid

`evidenceReproduceerbaar(snapshot, opnieuw)` vergelijkt de vastgelegde beslissing met een opnieuw genomen beslissing uit dezelfde ruwe waarden. Gelijk is `ok`; verschilt de uitkomst bij dezelfde regel, dan `andere_uitkomst`; is de regel zelf veranderd, dan `andere_regelversie`. Precies wat een bewijsspoor hoort te kunnen aantonen.

### AI-grens

Ongewijzigd en getest: `evidence` staat in geen enkele AI-whitelist, een meegegeven spoor lekt niet in de payload, en de coach gebruikt nog steeds het getal van de engine. De snapshotbouwer roept geen AI-laag aan en bevat geen rekenkunde.

### Offline

Onderzocht, niet herbouwd. Omdat het spoor ín de sessierij zit en niet apart wordt geschreven, kan er per definitie geen los bewijsstuk verdwijnen of dubbel ontstaan: één rij, één schrijfactie, dezelfde wachtrij. Het `training_instance_id` wordt client-side gezet en is dus ook offline beschikbaar. **Openstaand punt voor een volgende sprint:** een sessie die offline gequeued staat en later opnieuw wordt weggeschreven, wordt door de bestaande wachtrij afgehandeld — het gedrag van een volledige sync-conflictafhandeling is niet in deze sprint onderzocht en is bewust niet geïmproviseerd.

### Overig

`core/fEvidence.test.js` toegevoegd met 121 controles (A t/m L uit de opdracht). `core/fDataBehoud.test.js` is meeverhuisd met de uitgebreide schrijfweg en toetst nu ook dat het spoor additief is. Geen UI-wijziging: de diff op `index.html` raakt uitsluitend `buildStrengthSessionRow`, twee nieuwe leesfuncties, de aanroep in `finishSession` en `APP_VER` — nul toegevoegde regels met markup. `sw.js`: `CORE_SIG` naar `bd27a121da26563a` en de caches naar `v44000`.

## v4.39.0 — 18 augustus 2026 (Sprint 16 — Voortgang)

Het Voortgang-scherm bestond al vrijwel volledig: hero, recente vooruitgang, consistentie, doelen, challenges, persoonlijke records, krachtontwikkeling per oefening, krachtverhoudingen, volume per spiergroep, HRV-grafiek, roei- en cardiorecords en lichaamssamenstelling. Daar is dus niets van herbouwd. Deze release repareert drie dingen die bij de audit boven kwamen en voegt de enige regel toe die echt ontbrak.

### Een ontbrekende meting werd als nul getekend

De HRV-grafiek deed `r.hrv || 0`. Een dag zonder meting werd daardoor als 0 ms getekend en de lijn dook naar de bodem — een instorting die nooit gemeten is. Dat is precies wat `healthSeries` en `dataquality.v1` elders juist voorkomen door gaten op `null` te houden.

Dagen zonder meting worden nu overgeslagen. De grafiek verbindt alleen echt gemeten punten, en eronder staat wat er werkelijk aan de hand is: *"HRV: onvoldoende gegevens — 3 metingen, vanaf 4 is er een trend te zien."*

### Trend als expliciete uitkomst — `trend.v1`

Er was geen trendclassificatie. Een reeks van twee punten werd net zo stellig getoond als een reeks van dertig, en "onvoldoende gegevens" bestond niet als antwoord.

`CalcCore.trendClassify` levert nu `stijgend`, `stabiel`, `dalend` of `onvoldoende_data`. De richtingsregel is **niet nieuw**: hij is exact dezelfde als die van `DeviceCore.healthTrend`, die de Lichaam-schermen al gebruiken — eerste helft tegen tweede helft, pas een richting bij meer dan 3% verschil. Wat erbij komt is uitsluitend een expliciete ondergrens van vier meetpunten. Een test vergelijkt beide functies over 300 reeksen en eist nul verschil, zodat ze niet uit elkaar kunnen lopen.

Ontbrekende punten worden overgeslagen, nooit als nul geteld. Een echte 0 is wél een meting — het verschil tussen die twee is precies waar deze functie voor bestaat.

### Volume kwam uit een zesde, losse formule

`refreshVolumeSpiergroep` rekende het tonnage per spiergroep met de hand uit — `(sets||1)*(reps||1)*(weight||0)` — terwijl `CalcCore.calculateVolume` (`volume.v1`) al bestond en elders vijf keer gebruikt werd. Dat is nu de zesde plek die via de engine loopt; de uitkomst is identiek, alleen de bron is er nog maar één.

Datzelfde tonnage werd overigens al berekend maar nergens getoond: dode rekencode. Het staat nu naast het aantal sets, zodat "3 sets" ook laat zien hoeveel kilo daar onder zat.

### Bewust niet aangeraakt

Twee dingen zijn gevonden en gerapporteerd, maar niet gewijzigd omdat ze buiten Voortgang liggen en de bevroren schermen zouden raken: de trainingsdrempels van 12 en 6 sets per week staan vier keer hardgecodeerd in `index.html` (ook op de Lichaam-heatmaps), en de roeisplit wordt inline berekend terwijl `DeviceCore.splitFromDistTime` bestaat. Beide zijn pre-existent.

Home, Training, Lichaam, Coach, de navigatie en de actieve trainingsflow zijn ongewijzigd: een headless vergelijking geeft voor Home en Training exact dezelfde secties, labels en tekst als v4.38.0.

### Overig

`core/fVoortgang.test.js` toegevoegd met 100 controles, waaronder de gelijkloop met `healthTrend`, het onderscheid tussen een nul en een gat, en zestien onderdelen van het Voortgang-scherm die niet mogen verdwijnen. `sw.js`: `CORE_SIG` naar `cd5fd731542840de` en de caches naar `v43900`, omdat `core/calculation.js` is gewijzigd.

## v4.38.0 — 18 augustus 2026 (Sprint 15 — hardening & regressiebescherming)

Geen nieuwe functionaliteit. Deze release repareert één echte fout uit Sprint 14 en legt vast wat er is, zodat een volgende sprint niet ongemerkt sportlogica, het AI-contract of bestaande schermen kan wijzigen.

### De fout: readiness noemde zichzelf te vaak "volledig"

In `readinessDay` werd de datakwaliteit bepaald **voordat** onbetrouwbare signalen uit de lijst met beschikbare signalen werden gehaald. Het gevolg: een dag waarop HRV, rusthartslag én slaap alle drie als `no_data` binnenkwamen, hield nog steeds `datakwaliteit: 'volledig'` — terwijl er maar drie van de zes signalen bruikbaar waren. Precies het tegenovergestelde van wat deze laag hoort te doen.

De volgorde is omgedraaid: eerst filteren, dan tellen. Vijf of meer bruikbare signalen is volledig, twee tot vier is gedeeltelijk, minder is onvoldoende — nu gemeten over wat er écht overblijft. Een aanwezig maar onbetrouwbaar signaal telt vanaf nu even zwaar als een ontbrekend signaal, en verschijnt één keer in `ontbreekt`. De labels `current`, `partial` en `stale` blijven gewoon bruikbaar.

De rest van de beslissing is niet aangeraakt: dezelfde zones, dezelfde drempels, dezelfde trainingsaanpassing uit `computeProgAdjustment`.

### Wat er nu bewaakt wordt

`core/fHardening.test.js` legt vier dingen vast die tot nu toe alleen in de code stonden.

**Datakwaliteit.** Zeven combinaties van aanwezige signalen, één en meerdere ongeldige signalen, `no_data`, `sync_failed`, ontbrekende slaap, HRV en RHR, geen dubbele vermeldingen, en determinisme over veertig aanroepen. Plus een controle op de bronvolgorde zelf: filteren staat vóór tellen.

**Live coach.** Zeven RPE-waarden geven exact de delta van `progressionDecision`; zonder RPE geen gewichtsbeslissing en geen kilo in de tekst; zonder voorschrift geen afwijkingsclaim; zonder rustinstelling geen verzonnen rusttijd; geen AI-aanroep en geen engine-aanroep in die laag; deterministisch.

**Het AI-contract.** De drie whitelists staan nu letterlijk in de test. Groeit er ergens een veld bij zonder dat iemand dat bewust doet, dan faalt de test. Daarnaast wordt aangetoond dat een onbekend veld of een ruwe `sessionLog` er niet doorheen lekt.

**Home en Training.** Elf onderdelen van Home, acht van Training, de vijf bestemmingen in de bottom navigation en vijf onderdelen van het actieve trainingsscherm zijn vastgelegd op aanwezigheid. Deze controles ontwerpen niets en zeggen niets over volgorde, styling of opmaak — ze signaleren alleen dat iets verdwijnt of hernoemd wordt.

### Bekende duplicatie, bewust niet verplaatst

Drie grenzen staan zowel in een engine als, als afgeleide tekst of kleur, in `index.html`: de RPE-banden 7,5 en 8,5 achter de duiding "Sterke marge" en "Goede trainingsprikkel", de readinessgrenzen 1,00 en 0,93 achter de kleur van de herstelkaart, en de spierherstelgrens van 70%. Verplaatsen zou de bevroren Home-UI raken, dus dat gebeurt hier niet. In plaats daarvan zijn ze vastgepind: wijzigt de engine, dan faalt de test en moet de UI mee. Daarnaast wordt gecontroleerd dat elke engine-regel precies één implementatie heeft en dat wat in `index.html` op een engine-functie lijkt, altijd een doorgeefwrapper van één regel is.

### Overig

`sw.js`: `CORE_SIG` naar `48a3b1d3fc8def49` en de caches naar `v43800`, omdat `core/decision.js` is gewijzigd. Home en Training zijn ongewijzigd: headless vergelijking met de vorige versie geeft dezelfde secties, dezelfde labels en dezelfde tekst.

## v4.37.0 — 18 augustus 2026 (Sprint 14 — Recovery & readiness)

De onderdelen bestonden al: een herstelscore, een dagfactor, een readiness-zone, een trainingsaanpassing. Wat ontbrak was het antwoord dat de sporter 's ochtends wil: *hoe sta ik ervoor, en wat betekent dat voor de training die ik van plan was?* Die vier stukken lagen los op het scherm en moesten in het hoofd worden samengevoegd.

### Wat er al was en dus niet opnieuw is gebouwd

`recoveryScore` (`recovery_score.v1`), `trainReadiness` (`readiness.v1`), `computeProgAdjustment` (`progression_adjust.v1`), `calculateDayFactor` (`dayfactor.v1`), `applySessionRecovery`, `recoveryAdjustmentForToday`, beide bestaande check-ins, en de volledige Sprint 13-keten. Alles hergebruikt, niets vervangen.

Twee dingen zijn tijdens de audit expliciet vastgelegd in plaats van gegokt. **De naam `readiness.v1` was al bezet** door `trainReadiness`; die kapen zou stilzwijgend de betekenis van een bestaand contract veranderen. De nieuwe dagbeslissing heet daarom `readiness_day.v1`, in lijn met `progression_adjust.v1` en `recovery_score.v1`. En **een REST/STOP-zone is niet ingevoerd**: daar bestaat in deze applicatie geen expliciete regel voor — `computeProgAdjustment` gaat niet verder dan één set minder en RPE −1,5 — en een zone zonder regel zou een verzonnen oordeel zijn.

### Twee regels die in de UI stonden

`dayState` in `index.html` deelde de dag in vijf zones in, met eigen drempels, náást `trainReadiness` dat er drie kent: twee indelingen voor dezelfde vraag, waarvan één in de UI-laag. En `v43GereedheidScore` rekende `(factor − 0,85) / 0,20 × 100` uit — letterlijk dezelfde formule die al binnen `recoveryScore` stond.

Beide zijn verplaatst: `dayzone.v1` naar de Decision Engine, `readiness_percent.v1` naar de Calculation Engine, met doorgeefwrappers in `index.html` zodat er visueel niets verandert. `recoveryScore` gebruikt de omzetting nu intern, dus het getal bestaat nog maar op één plek. Een test loopt de hele factorrange langs en bewijst dat de uitkomst identiek is aan de oude formule.

### De dagbeslissing — `readiness_day.v1`

`DecisionCore.readinessDay` rekent niets en verzint geen regel. Het zet de reeds berekende waarden naast elkaar en roept uitsluitend bestaande regels aan: `trainReadiness` voor de zone, `dayZone` voor het dagthema, `computeProgAdjustment` voor de aanpassing. De herstelscore komt kant-en-klaar binnen en wordt niet nagerekend.

Beschikbaarheid is een feit, geen aanname. Zes signalen worden geteld — HRV, rusthartslag, slaap, spierherstel, gevoel, recente trainingsbelasting — en wat er niet is, staat in `ontbreekt`. Een signaal dat als `sync_failed` of `no_data` binnenkomt telt niet als aanwezig. Zonder dagfactor is er geen zone en geen advies: dan zegt de app dat ze het niet weet, in plaats van iets te middelen.

Drie zones: `ready` (geplande training normaal uitvoeren), `caution` (beheerst trainen), `reduce` (belasting aanpassen). "Reduce" gaat over de training, niet over de sporter — er wordt geen enkele uitspraak over gezondheid gedaan.

### De verwoording — `readinesscoach.v1`

Zelfde rolverdeling als de live coach uit Sprint 13. `buildReadinessContext` maakt expliciet wat beschikbaar is en wat ontbreekt; `readinessCoachMessage` zegt het in gewone taal en verzint niets bij; `readinessAiPayload` is de whitelist naar de AI. De AI krijgt de zone, de betekenis, de herstelscore, de trainingsaanpassing en de onderbouwing van de Decision Engine — nooit de ruwe signalen waarmee hij een eigen readiness zou kunnen afleiden.

### Op het scherm

Eén kaart op Home, tussen het coachbericht en het trainingsplan, zodat de sporter leest wat vandaag betekent en daarna meteen kan starten. Geen nieuwe hoofdsectie. Bewust géén score in de kop: Home toont al een dagfactor en een gereedheidsgetal, en een derde getal zou eerder verwarren dan helpen — de score staat in de onderbouwing.

*"Voorzichtig vandaag — Train beheerst en houd je inspanning in de gaten. Je geplande training blijft ongewijzigd. Je herstelscore van vandaag is 79/100 (gemiddeld). Nog niet alles is bekend: hoe je je voelt ontbreekt."*

### Doorgegeven aan de live coach

De beslissing wordt bewaard en gaat als feit mee in het live-contract van Sprint 13. De live coach léést de zone; hij berekent readiness nooit opnieuw. Een test controleert dat er in de code van die laag geen enkele aanroep naar `readinessDay`, `dayZone` of `readinessPercent` staat.

### Overig

`core/fReadiness.test.js` toegevoegd met 167 controles, inclusief een architectuurtest die afdwingt dat er precies één plek is die de beslissing opvraagt en dat de UI geen eigen drempels kent. `sw.js`: `CORE_SIG` naar `6c1939b561c292cc` en de caches naar `v43700`, omdat `core/calculation.js`, `core/decision.js` en `core/coaching.js` zijn gewijzigd.

## v4.36.0 — 18 augustus 2026 (Sprint 13 — AI Coach tijdens het trainen)

Tot nu toe kon de sporter tijdens een training alleen "Vraag de coach" gebruiken, en dat haalde hem uit de training: `go('s-coach')`, weg uit het scherm waar hij mee bezig was. Deze release beantwoordt de vraag "wat moet ik nu doen?" ín de training zelf, zonder dat er ergens een tweede rekenwaarheid ontstaat.

### De rustregel stond in de UI — `rest.v1`

`dynamicRestSec` bepaalde in `index.html` hoe de rusttijd met de RPE meeschaalt. Dat is een businessregel, geen presentatie, en die hoort in de Decision Engine. De inhoud is ongewijzigd overgenomen: dezelfde factoren, dezelfde ondergrens van 30 seconden, dezelfde afronding op vijf seconden, en zonder RPE gebeurt er nog steeds niets. `index.html` houdt een pure doorgeefwrapper, dus elke bestaande aanroep en de bestaande test blijven werken.

### Wat er van één set te zeggen valt — `setoutcome.v1`

De sporter logt een set; daarna telt de vraag of dit klopt met wat er stond en wat er nu moet gebeuren. Dat is een regel, geen coachpraatje, dus staat hij in de Decision Engine. `setOutcome` vergelijkt het voorgeschrevene met het uitgevoerde en haalt de gewichtsbeslissing op bij de **bestaande** progressieregel. Er komt geen tweede RPE-regel bij: zegt `computeProgression` niets, dan zegt `setOutcome` niets over gewicht.

Afwijkingen worden benoemd als feit, niet als oordeel: minder of meer herhalingen, lager of hoger gewicht, hogere of lagere RPE, of een set waarvoor niets is ingevuld. "Doel gehaald" wordt alleen ingevuld als beide kanten bekend zijn — anders blijft het onbekend, nooit "nee".

**Er wordt niets ingevuld wat er niet is.** Elk ontbrekend veld komt in `ontbreekt` te staan en de bijbehorende uitspraak vervalt. Zonder RPE geen gewichtsadvies. Zonder ingestelde rust geen rusttijd. Zonder voorschrift geen afwijkingen.

### Het coachcontract — `livecoach.v1`

`CoachingCore.buildLiveContext` maakt expliciet wat er beschikbaar is, wat ontbreekt, en wat gemeten, berekend, besloten of alleen uitgelegd is. `liveCoachMessage` verwoordt uitsluitend wat in het besluit staat: één korte actie, een "Waarom?" met de onderbouwing, en een eerlijke melding als iets mist. Deze laag rekent niet en beslist niet — een test dwingt af dat er in de code van dit blok geen enkele aanroep naar de Decision Engine of een rekenfunctie staat.

`liveAiPayload` is de grens naar de AI: een whitelist, net als het bestaande `aiPayload`. De AI krijgt de reeds genomen beslissing en de reeds bepaalde getallen, plus de herkomst en de lijst met wat ontbreekt — nooit de ruwe sessie om zelf mee te rekenen. In de systeemprompt staat er expliciet bij dat hij het advies en het getal niet mag wijzigen, ontbrekende gegevens niet mag invullen en geen oorzaak-gevolg mag beschrijven.

### Op het scherm

Eén compacte regel in de bestaande VANDAAG-kaart, direct onder de setstatus: de actie in vet, de waarneming eronder, en een "Waarom?" die uitklapt. Wie meer wil, klikt door naar de bestaande coach — die krijgt dan het gesaneerde contract mee. Geen nieuw scherm, geen nieuwe visuele taal: dezelfde accentkleur, grijstinten en typografie als de rest van de kaart.

Voorbeeld van wat er staat na een set van 100 kg × 5 bij RPE 7: *"Ga naar 102,5 kg voor je volgende set. Rust eerst 2 minuten."* met daaronder *"Je gaf RPE 7 op 100 kg. Binnen de progressieregel van de app is dat de zone om te verhogen, met 2,5 kg."* Bij een set zonder RPE: *"Rust 2 minuten en ga dan door."* plus *"Nog niet alles is ingevuld; dit advies gaat over wat er wél staat."* — en geen woord over gewicht.

### Overig

`core/fLiveCoach.test.js` toegevoegd met 148 controles, waaronder de ketenregressie die bewijst dat de coachzin het getal van de Decision Engine draagt en niet andersom, en een taalcontrole over alle gegenereerde zinnen. `fRestTimerSound.test.js` is meeverhuisd met de verplaatste rustregel en toetst nu ook dat de wrapper en de engine hetzelfde antwoord geven. `sw.js`: `CORE_SIG` naar `bbacf56e25a290cf` en de caches naar `v43600`, omdat `core/decision.js` en `core/coaching.js` zijn gewijzigd.

## v4.35.0 — 18 augustus 2026 (Sprint 12 — databehoud en één recordregel)

Sprint 11 (`a0062fd`) is nooit op main gekomen. De drie defecten die daar gerepareerd waren stonden dus nog onverkort in productie. Deze release brengt die fixes alsnog, voegt de ontbrekende dekking toe rond sessie-aggregatie en records, en haalt één regel uit de UI naar de Decision Engine.

### De drie fixes uit Sprint 11, alsnog

Een nieuw persoonlijk record werd niet bewaard: `logSet` werkt de PR-referentie in het geheugen direct bij zodat een volgende set op hetzelfde gewicht niet nóg een keer als record telt, en `finishSession` vergeleek daarna met díe waarde — `115 > 115` is onwaar. Opgelost met een sessie-basislijn die de PR vasthoudt zoals die vóór de sessie in de database stond.

Het eerste record van élke oefening verdween volledig: zonder rij in `exercise_goals` maakte `logSet` een entry aan die alleen in het geheugen bestond, waarna `upsertExerciseGoalField` een PATCH deed die nul rijen raakte. Zulke entries dragen nu de markering `_alleenGeheugen`; er wordt dan ingevoegd in plaats van gepatcht. Ook het peakdoel-scherm maakt dat onderscheid.

De VANDAAG-kaart toonde "nog te bepalen" terwijl de setvelden en het "Vorige keer"-blok op hetzelfde scherm 95 kg lieten zien. Het reeds bepaalde `rxWeight` wordt nu doorgegeven; er wordt niets berekend en zonder prescription-getal blijft "nog te bepalen" staan. En "Nieuw records!" is "Nieuwe records!" geworden.

### Eén recordregel — `record.v1`

De vraag "is dit een nieuw record?" stond op drie plaatsen in `index.html` los uitgeschreven: bij het afronden van een training, bij een losse oefening en bij Guided Execution. Drie kopieën van dezelfde vergelijking, elk met hun eigen invoer — precies het soort duplicatie waarin een verkeerde basislijn zich ongemerkt nestelt, zoals hierboven ook gebeurd is.

`DecisionCore.releaseRecord(kandidaat, basislijn)` is nu de enige plek waar die beslissing valt. Puur en deterministisch: strikt zwaarder dan de basislijn is een record, evenaren niet, een ontbrekende basislijn telt als nul, en een waarde die geen bruikbaar getal is — leeg, tekst, `NaN`, nul of negatief — levert nooit een record op. De uitkomst noemt ook de reden (`ok`, `evenaart`, `lager`, `geen_geldige_waarde`), zodat een uitkomst navolgbaar is in plaats van alleen waar of onwaar. De semantiek is exact gelijk aan wat er stond; alleen de plaats is veranderd. De drie aanroepers bepalen nog steeds zelf hun basislijn en schrijven zelf weg.

### Dekking die ontbrak

`buildStrengthSessionRow` — het hart van de sessie-aggregatie, waar elke afgeronde krachtoefening doorheen loopt — had geen enkele test. `core/fDataBehoud.test.js` dekt dat nu, samen met de vraag die er voor de sporter het meest toe doet: blijft mijn record staan? Getest met de échte functie en de échte beslisregels uit `index.html`, tegen een model dat een database (blijft bestaan) en geheugen (verdwijnt bij herladen) uit elkaar houdt: een nieuw record wordt bewaard, een training zonder record laat het bestaande record én de rest van de rij met rust, een record overleeft herladen, meerdere records bestaan naast elkaar zonder elkaar te overschrijven, de getoonde waarde is letterlijk één van de uitgevoerde sets, en lege of onzinnige invoer corrumpeert geen historie.

Daarbij is één ding vastgelegd dat eerder impliciet was: de sessie-basislijn wordt pas geleegd ná de lus over álle oefeningen. Zou dat per oefening gebeuren, dan zou de tweede oefening met een record in dezelfde sessie het weer verliezen.

### Overig

`sw.js`: `CORE_SIG` naar `1455da09c5ddbb13` en de caches naar `v43500`, omdat `core/decision.js` is gewijzigd. Geen bestaande test verwijderd of versoepeld; `fPrPersistentie` en `fPrescriptionConsistency` zijn meeverhuisd met de verplaatste regel en toetsen hetzelfde gedrag op de nieuwe plek.

## v4.34.1 — 18 augustus 2026 (Sprint 11 — acceptance & forensic closure)

Een verificatiesprint: de volledige keten van Home tot Coach end-to-end doorlopen in een echte browser, met een in-memory database achter de bestaande datalaag. Geen nieuwe functionaliteit, geen refactor. Drie reproduceerbare defecten gevonden en gerepareerd; de rest is bevestigd als PASS en ongewijzigd gelaten.

### Defect 1 — een nieuw persoonlijk record werd niet bewaard

`logSet` werkt de PR-referentie in het geheugen direct bij, zodat een volgende set op hetzelfde gewicht niet nóg een keer als record wordt gemarkeerd. `finishSession` vergeleek het zwaarste gewicht daarna met díe al bijgewerkte waarde. Bij een PR van 100 kg en een set van 115 kg was `115 > 115` onwaar: er werd niets naar `exercise_goals` geschreven, de afrondingskaart meldde geen record, en na herladen stond de oude PR er weer.

Opgelost met een sessie-basislijn (`sessionPrBase`) die de PR vasthoudt zoals die vóór de sessie in de database stond. `finishSession` vergelijkt daarmee. Het badge-gedrag tijdens de set is niet veranderd; de basislijn wordt alleen bij het afronden geleegd, wanneer geheugen en database weer gelijk zijn.

### Defect 2 — het eerste record van een oefening verdween helemaal

Dezelfde oorzaak, andere uitwerking. Had een oefening nog geen rij in `exercise_goals`, dan maakte `logSet` er één aan die alleen in het geheugen bestond. `upsertExerciseGoalField` zag die entry, koos daarom een PATCH, en die PATCH raakte nul rijen. Het allereerste record van élke oefening ging zo verloren — zonder foutmelding, terwijl de afrondingskaart wel "PR" meldde.

Zo'n geheugen-entry draagt nu een markering (`_alleenGeheugen`), en zowel `upsertExerciseGoalField` als het peakdoel-scherm behandelen hem als "nog geen rij": invoegen in plaats van patchen. Beide schrijfwegen bestaan nog; alleen de keuze ertussen is gerepareerd.

### Defect 3 — het trainingsscherm gaf twee antwoorden op dezelfde vraag

De VANDAAG-kaart in Execution las uitsluitend `ex.suggestedWeight`. Bij een vaste training staat dat veld er niet in, dus toonde de kaart "nog te bepalen" terwijl de setvelden en het "Vorige keer"-blok op hetzelfde scherm 95 kg lieten zien. Het scherm had al één prescription-waarheid (`rxWeight`); die werd alleen niet doorgegeven. Dat gebeurt nu — er wordt niets berekend, alleen doorgegeven, en zonder enig prescription-getal blijft er netjes "nog te bepalen" staan in plaats van een verzonnen gewicht.

Meegenomen: de afrondingskaart schreef "Nieuw records!" bij meer dan één record. Dat is nu "Nieuwe records!".

### Wat is geverifieerd en ongewijzigd gebleven

De volledige trainingsflow (start, prefill, sets, NL-komma's, RPE, afvinken, rust, tweede oefening, state na wegnavigeren en terugkeren, afronden, historie), de aggregatie naar `sessions` (zwaarste werkset als kop, alle sets in `sets_detail`), `dataquality.v1` inclusief de uitsluiting van de rusthartslag van 26 juli, `correlation.v1`, `verband.v1`, `verbandtraining.v1`, `recovery_score.v1`, de coach-context, de architectuurscheiding (geen enkele engine-functie is dubbel geïmplementeerd; de UI delegeert), de ingesloten posters en anatomie-SVG's, en de mobiele weergave op 390×844 zonder horizontale overflow.

De deployment is forensisch gecontroleerd: `sw.js` op productie draait `CORE_SIG 7cf9ba1fe4858a03` en cache `v43400`, en `core/decision.js` en `core/deviceIntegration.js` op productie bevatten de Sprint 10-functies met de juiste constanten.

## v4.34.0 — 18 augustus 2026 (Data Quality → Interpretatie → Coach Context)

De verbanden uit v4.32.0 rekenden over de ruwe rijen uit `hrv_log`. Deze release zet er de ontbrekende schakel voor: een datakwaliteitslaag tussen RAW DATA en de Calculation Engine. Geen redesign, geen nieuwe mock-up. Home, Training, Coach-scherm, Voortgang, de anatomie en de Fitbit-keten zijn niet aangeraakt.

### Wat er al was en dus niet opnieuw is gebouwd

Spearman (`correlation.v1`), `pairDaily`, `releaseVerband` (`verband.v1`) met de drempel van 30 dagen, de sterkteclassificatie, de circulariteitstoets, de niet-causale zin en de disclaimer, het verbandenoverzicht en het verbanddetail, `observation.v1` en `observationQuality`, `recoveryScore` (`recovery_score.v1`), en de knoppen *Wat betekent dit voor vandaag?* en *Welke training past hierbij?*. Allemaal ongewijzigd overgenomen.

### Datakwaliteit — `dataquality.v1`

Nieuw in `core/deviceIntegration.js`, direct naast `healthSeries` en `pairDaily` waar de data binnenkomt. Drie statussen per dag, meer niet: `valid`, `excluded`, `insufficient_data`. Een ontbrekende dag is `insufficient_data` en blijft `null` — nooit 0. Een aanwezige waarde die technisch niet bruikbaar is, wordt `excluded` mét reden: `niet_numeriek`, `buiten_contract` of `extreme_uitschieter`.

De laag geeft **geen medisch oordeel**. Hij stelt niet vast dat een meting fout is en zegt niets over gezondheid; hij bepaalt alleen of een getal bruikbaar is als invoer voor een berekening. Er wordt niets uit de database verwijderd en niets overschreven: uitsluiten gebeurt in het geheugen, per berekening, en is altijd herleidbaar.

**De grenzen komen niet uit deze laag.** Ze worden afgeleid uit het bestaande brondata-contract `GOOGLE_HEALTH_MAP` — HRV 0–400 ms, rusthartslag 20–120 bpm, slaap 0–1440 minuten (gedeeld door 60, want de app rekent in uren). Verandert dat contract, dan verandert dit mee. Er is dus geen tweede lijst met grenswaarden en geen zelfbedachte norm.

**Uitschieters** worden robuust en bewust conservatief herkend: de modified z-score van Iglewicz & Hoaglin over mediaan en MAD. De gangbare labelgrens daarvoor is 3,5; hier staat hij op 10 — ruim drie keer zo streng — omdat uitsluiten gevolgen heeft en echte fysiologische variatie nooit mag sneuvelen. Daar bovenop moet de waarde minstens 25% van de mediaan afwijken, zodat een strak verdeelde reeks (waarin de MAD bijna nul is) geen normale schommeling kan uitsluiten. Beide voorwaarden moeten gelden, en pas vanaf 20 metingen. Is de MAD nul, dan valt de schaal terug op de gemiddelde absolute afwijking; is ook die nul, dan wordt er niets uitgesloten in plaats van gedeeld door nul.

`pairQuality` keurt beide reeksen en koppelt uitsluitend dagen waarop **beide** waarden valide zijn. Het telt apart hoeveel dagen wél twee metingen hadden maar zijn afgevallen — precies de dagen die eerder stilzwijgend meerekenden. `duplicateDays` maakt zichtbaar welke datums meer dan één rij hebben; de keuze tussen die rijen (wearable boven check-in) blijft de bestaande, ongewijzigde regel in `healthSeries`.

### De keten klopt nu

RAW DATA → DATA QUALITY → CALCULATION ENGINE → DECISION ENGINE → UI → COACH. `tkVerbandBereken` koppelt via `pairQuality` in plaats van rechtstreeks via `pairDaily`. Ontbreekt de datakwaliteitslaag (oude, nog gecachte core), dan verschijnt er **geen** correlatie in plaats van een correlatie over ongekeurde data.

Het metric-detail keurt zijn reeks op één plek, zodat grafiek, trend, statistiek en observatie exact dezelfde punten zien: wat niet wordt meegerekend, wordt ook niet getekend. De ruwe waarde blijft ongewijzigd in de database en zichtbaar bij Metingen.

### De opvallende meting van 26 juli

Op 26 juli 2026 staat een rusthartslag van 28 bpm, terwijl de overige 43 metingen tussen 54 en 60 liggen (mediaan 57). Onderzocht en vastgesteld: de rij heeft geen `[src:...]`-tag en dateert van vóór de eerste Fitbit-synchronisatie (11 augustus), dus hij komt uit een handmatige check-in en niet uit de koppeling. Er is dus **geen** mapping- of conversiefout in de synchronisatieketen — die is niet aangepast. De waarde valt binnen de contractgrens van 20 bpm en werd daarom nergens tegengehouden; de robuuste uitschietertoets vangt hem nu wel (modified z ≈ 19,6). Hij is **niet verwijderd** uit de database en wordt alleen niet meegerekend.

Effect op de vrijgegeven verbanden: HRV ↔ rusthartslag gaat van r = −0,521 (n=38) naar r = −0,531 (n=37), slaap ↔ rusthartslag van r = −0,020 naar r = −0,092 (n=36). De uitkomst verschuift dus nauwelijks — het spreidingsdiagram wordt wel bruikbaar, omdat de verticale as niet langer wordt opgerekt tot 28.

### Uitsluitingstransparantie

De Decision Engine levert de melding, niet de UI: *"Eén dag is niet meegenomen omdat de gegevens niet betrouwbaar vergelijkbaar waren."* en voor één reeks *"Eén meting is niet meegerekend omdat de waarde niet betrouwbaar bij deze reeks past."* Nergens staat dat een meting fout is, en er wordt geen uitroepteken of waarschuwing gebruikt. Een test controleert dat over alle definities en alle tekens van de coëfficiënt.

### Interpretatie

`releaseVerband` levert naast de bestaande zin nu ook een uitleg per sterkteband, zodat "Coëfficiënt −0,53 · sterke samenhang" niet langer zonder duiding op het scherm staat: *"Het patroon is duidelijk en consequent zichtbaar in je metingen."* De volgorde op het detailscherm volgt de vragen die de gebruiker stelt: wat zie ik, wat betekent het, is het betrouwbaar, wat betekent dit voor mijn training. Geen nieuwe componenten, geen nieuwe kleuren.

### Trainingsbetekenis — `verbandtraining.v1`

Een samenhang is op zichzelf geen trainingsadvies. `verbandTrainingContext` spreekt daarom alleen wanneer de benodigde, reeds berekende context er is: een vrijgegeven verband mét richting én een herstelstatus uit `recovery_score.v1`. Ontbreekt er iets, dan is de uitkomst expliciet "niet beschikbaar" met een reden (`geen_verband`, `geen_richting`, `geen_herstelstatus`, `datakwaliteit_onvoldoende`) en wordt er niets aangevuld.

Wat de functie nooit doet is een gereedheidsoordeel vellen. Niet "je bent hersteld", niet "je lichaam is klaar voor een zware training". Ze verwijst naar de bestaande herstelstatus: *"In deze periode bewegen je HRV en je rusthartslag in tegengestelde richting. Je herstelstatus van vandaag is gemiddeld (70/100). Kijk naar je actuele herstelstatus voordat je de trainingsbelasting verhoogt."* Een lijst verboden formuleringen staat in de engine en wordt in de tests afgedwongen.

### Coach-context

De coach kreeg tot nu toe de laatste HRV/RHR/slaap-rij en de HRV-baselineduiding. Hij krijgt nu ook: datakwaliteit en trend per gegevenstype over 30 dagen inclusief het aantal uitgesloten metingen, alle verbanden met coëfficiënt, aantal dagen en sterkte plus de zin van de Decision Engine, de herstelstatus van vandaag met betrouwbaarheid en de sets/RPE-aanpassing, en het aantal trainingsdagen in de laatste 7 en 28 dagen.

Alles is al berekend voordat het in de prompt komt; de coach-contextbouwer roept zelf geen enkele rekenfunctie aan. De instructie erbij is expliciet: correlaties, herstelscores, dagfactoren en trends nooit zelf berekenen of tegenspreken, ontbrekende data als onzekerheid benoemen in plaats van opvullen, een samenhang nooit als oorzaak-gevolg beschrijven en niemand hersteld of trainingsklaar verklaren op basis van een verband. Mislukt het blok, dan valt het stil terug op leeg — de coach blijft altijd bruikbaar.

### Overig

`core/fDataQuality.test.js` toegevoegd met 175 controles. Twee bestaande assertions zijn meeverhuisd met een hernoeming (`_tkMetricRuweSerie`, `pairQuality`); er is geen enkele test verwijderd of versoepeld. `sw.js`: `CORE_SIG` naar `7cf9ba1fe4858a03` en de caches naar `v43400`, omdat `core/decision.js` is gewijzigd.

## v4.33.0 — 18 augustus 2026 (Gezondheidsgegevens & koppelingen)

Eén scherm onder Lichaam dat antwoord geeft op de vraag "waar komen mijn gegevens vandaan?". Geen redesign, geen nieuwe mock-up. Home, Training, Coach, Voortgang, de anatomie, de Calculation Engine, de Decision Engine en de Fitbit-keten zijn niet aangeraakt.

### Wat er al was en dus niet opnieuw is gebouwd

De volledige Fitbit/Google Health-keten (`wearable-status`, `wearable-connect`, `wearable-sync`, `wearable-disconnect`), `fetchWearableStatus`, `wearableConnect` / `wearableSyncNow` / `wearableDisconnect`, `deviceConnectionState`, de hele `observation.v1`-laag, `TK_DQ_TEKST`, `bodyMetricsFromLog`, `tkMetingHerkomst` en het bestaande privacyscherm `s-privacy` bestonden al en zijn hergebruikt. Er is geen tweede statusbron, geen tweede versheidsberekening en geen tweede herkomstlogica bijgekomen.

Een instelbare **bronvoorkeur** bestond niet en is bewust ook niet uitgevonden: het scherm legt uit welke voorrangsregel de app feitelijk hanteert (een wearablemeting wint van een handmatige check-in op dezelfde dag) in plaats van een keuzeschakelaar te tonen die nergens wordt gelezen.

### Nieuw scherm `s-lich-gegevens`

Bereikbaar via Lichaam → *Lichaam & gegevens* → **Gezondheidsgegevens & koppelingen**. Eén route, geen concurrerende ingang.

Bovenin een statuskop met de strengste kwaliteit over HRV, rusthartslag en slaap — gewicht telt daar bewust niet in mee, precies zoals `renderLichaamDataStatus` op het overzicht dat al deed. Daaronder per gegevenstype (HRV, rusthartslag, slaap, gewicht, lichaamsmetingen) of het **gemeten** of **ingevoerd** is, uit welke bron het komt, wanneer de laatste meting was en wat de datakwaliteit is. Staat de bron gelijk aan de soort, dan wordt die niet twee keer getoond.

De sectie **Koppelingen** toont Fitbit met de echte verbindingsstatus, de koppel- en synchronisatiedatum, welke gegevens de koppeling op dit moment daadwerkelijk levert, en de knoppen Sync nu / Loskoppelen dan wel Koppelen. Daarna **Databron** met de voorrangsregel, en **Privacy & gegevens** dat doorlinkt naar het bestaande `s-privacy`.

### Koppelacties staan nog op één plek

`renderWearableCard` op Profiel toonde tot nu toe zelf de koppel-, sync- en loskoppelknoppen. Die kaart toont nu alleen de status plus één knop naar het nieuwe scherm, zodat elke koppelactie exact één keer in de app voorkomt. Verwijzingen naar "Profiel → Wearable" in het privacy- en helpscherm zijn meegewijzigd. Na synchroniseren of loskoppelen ververst `tkVerversGegevensScherm` het scherm als het open staat.

### Lege toestanden

Vijf toestanden zijn expliciet uitgewerkt en headless gecontroleerd: geen wearable met alleen handmatige invoer, wel gekoppeld maar nog nooit gesynchroniseerd, gekoppeld en actueel, alleen handmatige gegevens, en helemaal geen gegevens. Een verlopen koppeling meldt "Synchronisatie mislukt" in plaats van stilzwijgend verouderde waarden te tonen.

### Overig

Foutgrens rond het scherm gelijk aan die van het metric- en verbanddetail. `core/fGezondheidsgegevens.test.js` toegevoegd met 74 controles. `sw.js` is niet gewijzigd: er zijn geen bestanden uit `CORE_FILES` aangeraakt, alleen `index.html`.

## v4.32.0 — 18 augustus 2026 (Verbanden V1)

De verbandensectie op Lichaam toont nu echte, berekende samenhangen in plaats van de veilige lege toestand. Geen nieuwe mock-up, geen redesign; Home, Training, Coach, Voortgang, de Fitbit-keten en de anatomie zijn niet aangeraakt.

### Calculation Engine — `spearman` (correlation.v1)

Eén pure functie in `core/calculation.js`: Spearman-rangcorrelatie over gekoppelde paren, met `{coefficient, n, direction}` als uitkomst. Deterministisch, geen `Date.now()`, geen random, geen externe bibliotheek.

Geïmplementeerd als Pearson **over de rangen**, niet met de bekende 6·Σd²-formule — die is onjuist zodra er gelijke waarden voorkomen. Ties krijgen de gemiddelde rang, en bij exact gelijke waarden beslist de oorspronkelijke index, zodat de uitkomst niet van de sorteervolgorde afhangt. Ongeldige paren (`null`, `NaN`, `Infinity`, tekst) worden verwijderd, nooit als 0 geteld. Is een van beide reeksen constant, dan is er geen rangvariatie en is de coëfficiënt `null` — niet 0, want 0 zou "geen samenhang" beweren waar niets te bepalen valt.

Spearman is gekozen omdat de gegevens ordinale schalen bevatten en losse uitschieters: er staat één rusthartslag van 28 tussen veertig waarden van 45–60. Onder Pearson zou dat ene punt elk verband met RHR meetrekken.

### Datakoppeling — `pairDaily`

In `core/deviceIntegration.js`, naast `healthSeries` waar hij hoort. Koppelt twee reeksen op kalenderdatum tot `{date, a, b}`. Een paar telt alleen mee als beide waarden die dag echt gemeten zijn; ontbrekende dagen verdwijnen. Geen invulling, geen interpolatie, geen forward of backward fill, nooit 0. Hergebruikt de bestaande datumvorm, dus er komt geen tweede datumlogica bij.

### Decision Engine — `releaseVerband` (verband.v1)

De Decision Engine bepaalt als enige of een verband zichtbaar mag worden en hoe het verwoord wordt. De UI kent de drempel niet, bepaalt geen sterkte en formuleert geen zinnen.

Minimum 30 vergelijkbare dagen (productbesluit). Sterkteclassificatie op |coëfficiënt| volgens de conventie van Cohen, expliciet vastgelegd zodat de UI ze niet kan verschuiven: onder 0,10 verwaarloosbaar · onder 0,30 zwak · onder 0,50 matig · vanaf 0,50 sterk. Bij een verwaarloosbare uitkomst wordt bewust **geen richting geclaimd** en verschijnt een zin zonder richting.

**Circulariteitsbescherming.** Elke definitie noemt haar ruwe invoer. Overlappen die verzamelingen, dan weigert de engine het verband — dagfactor komt uit HRV en slaap, herstel komt uit trainingsbelasting en RPE. Dat gebeurt in de engine, niet in de UI: verbergen is geen weigeren. Een definitie zonder bekende herkomst wordt eveneens geweigerd.

### Taal

De engine levert een kant-en-klare zin; de UI plaatst hem alleen. De zin begint met de conditie en beschrijft uitsluitend een waarneming: *"Op dagen waarop je langer sliep, lag je HRV gemiddeld hoger."* Daaronder het aantal dagen en *"Dit is een samenhang, geen oorzaak."* Geen enkel causaal woord komt voor in welke gegenereerde zin dan ook; een test controleert dat over alle definities en alle tekens van de coëfficiënt.

### Configuratiegedreven

De drie verbanden — slaap ↔ HRV, slaap ↔ rusthartslag, HRV ↔ rusthartslag — staan als configuratie in `VERBAND_DEFINITIES`. `releaseVerband` kent geen enkel verband bij naam; een vierde verband is een extra item in die lijst, geen tweede correlatie-implementatie.

### Op het scherm

De bestaande verbandensectie wordt alleen gevuld als er daadwerkelijk iets is vrijgegeven; anders blijft de bestaande lege toestand ongewijzigd staan. Elke kaart toont beide variabelen, de richting, de sterkte, de zin, het aantal vergelijkbare dagen en de disclaimer.

Nieuw detailscherm `s-lich-verband` met een spreidingsdiagram van de echte paren: één punt per dag, met datum en beide waarden in de tooltip. **Geen trendlijn en geen regressielijn** — die zou een verband suggereren dat niet is berekend. Daaronder coëfficiënt, aantal dagen, richting, sterkte, de gebruikte versies en de disclaimer. Het scherm heeft dezelfde foutgrens als het metric-detail.

### Getest
- Nieuw `core/fVerbandenV1.test.js` — 109 controles: Spearman op perfecte, monotone en willekeurige reeksen, ties, uitschieters, n=0/1, constante reeksen, vuile invoer, volgorde-onafhankelijkheid en determinisme; `pairDaily` op ontbrekende dagen, ISO-datums, NaN en fill-gedrag; de Decision Engine op n=29/30/31, alle sterktegrenzen, richting, circulariteit (ook bij n=100) en ongeldige definities; de taalcontrole over alle definities; en de renderpaden inclusief de eis dat de UI geen drempel, geen sterktegrens en geen eigen statistiek bevat.
- Volledige Quality Gate lokaal groen: **2.162 unit-checks over 47 bestanden, 0 mislukt**, plus 250 `logic_tests`, 51 native-tests, build en bestandscontroles.
- Headless mobiele controle (390×844) met echte productiegegevens: drie kaarten op het overzicht, detailscherm met 38 echte punten en 0 lijnen, foutgrens werkt en herstelt, onbekend id geeft een nette lege toestand, geen horizontale overflow, **0 console-fouten**.

### Gewijzigd
`core/calculation.js`, `core/decision.js`, `core/deviceIntegration.js`, `index.html`, `sw.js`, `CHANGELOG.md`, nieuw `core/fVerbandenV1.test.js`, plus één regel stijl-scope in vier bestaande testbestanden. `calculation.js` en `decision.js` staan in `CORE_FILES`, dus `CORE_SIG` is bijgewerkt naar `419e06e1ed24f7e8` en `CACHE_NAME`/`CACHE_STATIC` zijn gebumpt naar `v43200`, conform de bestaande sw-guard-regels.

## v4.31.0 — 18 augustus 2026 (Lichaam 2.1 — tabs, gedeelde zijde en de oefeningenketen)

Structuur- en UX-sprint op Lichaam. Geen redesign, geen nieuwe mock-up. Home, Training, Coach, Voortgang, de Calculation Engine, de Decision Engine en de Fitbit-keten zijn niet aangeraakt.

### P0 — eerst gecontroleerd, daarna pas gebouwd

**De datastatusregel sprak zichzelf schijnbaar tegen.** Er stond "bron: Fitbit · laatste meting 18 augustus 2026 · geen wearable gekoppeld". Beide feiten waren waar, maar het zijn twee verschillende dingen: de herkomst van de *meetwaarde* (de `[src:...]`-tag op de rij, historisch) en de stand van de *koppeling* (uit `deviceConnectionState`, nu). De bewoording maakt dat tijdsverschil expliciet: "gemeten met Fitbit · laatste meting … · nu geen wearable gekoppeld". Dezelfde twee velden, geen nieuwe bronlogica.

**"Geen trend" betekende twee verschillende dingen.** De trendkaart toonde die tekst zowel bij een echt vlakke reeks als bij te weinig metingen; alleen het statuslabel eronder maakte onderscheid. Bij minder dan zes punten staat er nu "te weinig metingen". De drempel van zes is de bestaande drempel uit `toonTrend` — er is geen nieuwe trendberekening.

**De grafieken bevatten geen fictieve data.** `healthSeries` en `weightSeries` lezen uitsluitend rijen; ontbrekende dagen blijven `null`. `lichSpark` breekt de lijn bij een gat en `tkRenderHealthChart` slaat lege punten over. Het opvallend regelmatige patroon in de eerdere voorbeeldrender kwam uit de testdata van de headless controle, niet uit de app.

**De top-4 was niet deterministisch.** Bij gelijke waarden bepaalde de invoervolgorde de uitkomst. Beide lijsten hebben nu een vaste tie-breaker op spiernaam. De herstelweergave toont bovendien conform de mock-up de best herstelde plus de drie laagste in plaats van vier keer de laagste — vier keer "100% hersteld" zegt niets, het contrast wel.

### Gebouwd

**Spiergroepen met vier tabs en één gedeelde zijde.** Overzicht · Per groep · Voorzijde · Achterzijde. De twee onafhankelijke voor/achter-schakelaars zijn verdwenen: het herstelfiguur en het belastingfiguur volgden elk hun eigen state en konden elkaar tegenspreken. Nu volgt alles één `lichSpierenSide`. De panelen worden getoond of verborgen — alle doel-ids blijven in de DOM, zodat `renderLichaam()` één renderpad houdt.

**Spierdetail met twee tabs.** Visueel (figuur, herstelstatus, kerncijfers, doorstappen) en Details (uren sinds belasting, basisherstelduur, RPE laatste sessie, formuleversie, recente sessies). Uitsluitend herstructurering: elke waarde komt uit dezelfde bron als voorheen.

**De keten is compleet: Lichaam → spiergroep → spier → oefeningen.** Nieuw scherm `s-lich-oefeningen` toont welke oefeningen deze groep in jouw logboek hebben belast, met sets, aantal keer en de laatste datum. Het leest `sessions` en de bestaande `getExerciseMuscles`-mapping via één gedeelde helper die ook het spierdetail gebruikt. Er is geen theoretische oefeningenlijst: staat een oefening niet in je logboek, dan staat hij hier niet. Zonder data een nette lege toestand, nooit een leeg scherm.

**Metingen met twee tabs.** Lichaamscompositie en Afmetingen. Alleen presentatie: dezelfde kaarten, dezelfde doel-ids, dezelfde renderer, dezelfde opslaglogica. Geen CRUD, geen nieuwe invoerflow.

**Mobiele pasvorm.** Vier tabs pasten op 390 px alleen in een compacte variant van hetzelfde segmented control; de oefeningregel is gestapeld (naam boven, meta eronder) omdat de meta anders buiten beeld liep.

### Bewust niet gebouwd
Verbandenmotor, minimum aantal waarnemingen, CRUD op `weight_log`/`body_comp`/`hrv_log`, één centrale meetinvoerflow, en het verplaatsen van de wearable-koppelingen. Allemaal buiten scope.

### Technische hygiëne
`.gitignore` met `node_modules/` en `www/`. `package-lock.json` wordt nu wél getrackt: `package.json` gebruikt caret-ranges op esbuild en de Capacitor-pakketten, en juist esbuild bouwt de native `www/`-bundle — zonder lockfile kan elke CI-run een andere versie pakken. De Quality Gate draait daarom `npm ci` met `cache-dependency-path: package-lock.json` in plaats van `npm install`.

### Getest
- Nieuw `core/fLichaam21Tabs.test.js` — 73 controles over zeven groepen: de deterministische top-4 (best plus drie laagste, vaste tie-breaker, tien identieke aanroepen geven tien identieke uitkomsten, groepen zonder percentage vallen af), de vier tabs met gedeelde zijde, het verdwijnen van beide oude schakelaars, de twee tabs op spierdetail en metingen, de oefeningenketen (alleen uit `sessions`, geen catalogus, nette lege toestand), de twee P0-bewoordingen en regressie op overzicht, anatomie, verbanden, Fitbit en het metric-detail.
- `core/fLichaamSpierDetail.test.js` volgt de verplaatste helper; drie testbestanden volgen de verbrede stijl-scope.
- Headless mobiele controle (390×844) van alle routes: tabs wisselen, beide figuren volgen dezelfde zijde, spierdetail wisselt van tab, het oefeningenscherm toont zowel de gevulde als de lege toestand, metingen wisselt van tab, het metric-detail werkt nog en beide anatomiefiguren staan er na terugkeer. **0 console-fouten.**
- Volledige Quality Gate lokaal groen, inclusief `logic_tests.js` en `npm ci`.

### Gewijzigd
`index.html`, `.github/workflows/quality-gate.yml`, `CHANGELOG.md`, nieuw `core/fLichaam21Tabs.test.js`, bijgewerkt `core/fLichaamPhase0.test.js`, `core/fLichaamSpierDetail.test.js` en `core/fLichaamMetricDetail.test.js`, nieuw `.gitignore` en `package-lock.json`. `core/*.js` is niet gewijzigd, dus `CORE_SIG` en de cachenamen in `sw.js` blijven ongemoeid.

## v4.30.1 — 18 augustus 2026 (Lichaam 2.0 — faalveilig metric-detail)

Productiebevinding na de uitrol van v4.30.0, direct na de deploy vastgesteld op de live app.

Een pagina die al openstond tijdens de deploy draaide nog op de `core/*.js` uit de vorige service-worker-cache. `DeviceCore` miste daardoor `availablePeriods` en `healthStats`, de renderer stopte halverwege op `dc.availablePeriods is not a function` en het metric-detailscherm bleef **leeg** — kop en titel wel, inhoud niet. Eén herlaadbeurt loste het op (`skipWaiting` + `clients.claim` doen hun werk), maar tot dat moment stond de gebruiker voor een leeg scherm zonder uitleg.

`renderLichaamMetricDetail` heeft nu dezelfde foutgrens als elke andere Lichaam-renderer: de opbouw zit in `_renderLichaamMetricDetail` en een fout levert de bestaande lege-toestandcomponent op met de tekst *"Dit scherm kon niet worden geladen — de app is zojuist bijgewerkt. Herlaad de pagina om verder te gaan; je gegevens zijn ongewijzigd."* Daarnaast wordt een onvolledige `DeviceCore` expliciet herkend in plaats van stilzwijgend omzeild: dit scherm rekent zelf niets uit, dus ontbrekende engines zijn een fout en geen reden om de UI iets te laten verzinnen.

Alleen `index.html` is gewijzigd; `core/*.js` niet, dus `CORE_SIG` en de cachenamen blijven ongemoeid (`index.html` wordt network-first geserveerd).

### Getest
- `core/fLichaamMetricDetail.test.js` uitgebreid van 73 naar 78 controles: de renderer heeft een foutgrens, de melding is bruikbaar, een onvolledige `DeviceCore` wordt herkend, de opbouw blijft één renderer, en de foutafhandeling laat het scherm nooit leeg achter.
- Headless browsercontrole met drie scenario's: normale weergave met data, `DeviceCore.availablePeriods` weggehaald (de melding verschijnt, het scherm is niet leeg), en herstel daarna. Geen pagina- of consolefouten.
- Volledige Quality Gate lokaal groen, inclusief `logic_tests.js`.

### Gewijzigd
`index.html` (foutgrens + `APP_VER` v4.30.1), `core/fLichaamMetricDetail.test.js`, `CHANGELOG.md`.

## v4.30.0 — 18 augustus 2026 (Lichaam 2.0 — metric-detail, statistiek en herkomst)

Roadmap-sprint met strakke scope. Geen redesign, geen nieuwe mock-up, geen wijziging aan Home, Training of de Fitbit-keten.

### Eén detailsjabloon voor vier metrics

HRV, rusthartslag, slaap en gewicht delen vanaf nu één scherm (`s-lich-metric`), één renderer (`renderLichaamMetricDetail`) en één configuratietabel (`TK_LICH_METRICS`). De gekozen metric staat in `lichMetricSel` — exact het patroon van `lichSpierSel` — en de route loopt via de bestaande `go()`-router en de al aanwezige `TK_LICH_METRIC_ROUTE`. Er is dus geen tweede router en er zijn geen vier bijna-identieke schermen bijgekomen.

Het scherm toont de hoofdwaarde met eenheid, versheid en herkomst uit `observation.v1`, de datakwaliteit uit `observationQuality`, de periodekeuze, de grafiek uit de bestaande `tkRenderHealthChart`, de readout met datum en bron, het statistiekblok, de datadekking, een beschrijvende uitleg met doorstap naar Coach, en het verbandenblok in zijn bestaande veilige toestand.

**Periodelogica.** 7 · 14 · 30 · 90 · 1 jaar, gebouwd op de bestaande `TK_HEALTH_PERIODS`. Een periode wordt alleen aangeboden wanneer er minstens twee echte metingen in vallen én wanneer hij méér metingen bevat dan de kortere periode ervoor. Anders is de knop een lege belofte: hetzelfde beeld onder een andere naam. Geen enkele periode geschikt, dan staat er een eerlijke lege toestand in plaats van een grafiek. Gaten blijven gaten: er wordt niet geïnterpoleerd en een dag zonder meting is nooit een nul.

### `healthStats` in de Calculation-laag

Eén nieuwe pure functie in `core/deviceIntegration.js`: gemiddelde, minimum, maximum, standaarddeviatie, aantal geldige metingen, dekking en volledigheid over precies dezelfde serie die de grafiek tekent. `now` wordt nergens gelezen — geen `Date.now()`, geen random, dezelfde invoer geeft altijd dezelfde uitkomst.

Spreiding is de populatie-standaarddeviatie over de aanwezige metingen. Bij minder dan twee metingen is hij `null` en niet `0`: nul zou "geen variatie" beweren waar niets te bepalen valt. Onbruikbare waarden tellen niet mee, zodat er nooit een `NaN` in het gemiddelde belandt.

Daarnaast twee kleine pure toevoegingen: `availablePeriods` (welke perioden mogen worden aangeboden) en `weightSeries` (gewicht uit `weight_log` in dezelfde serievorm als `healthSeries`). Het overzicht gebruikt nu diezelfde `weightSeries` in plaats van een eigen inline-constructie — de uitkomst is bewijsbaar identiek, maar overzicht en detail kunnen nu niet meer uiteenlopen.

### Metingen tonen hun herkomst

Elke waarde op het Metingen-scherm draagt nu bron, meetmoment en of hij is ingevoerd, gemeten of berekend. Gewicht komt uit `weight_log` en kan een andere datum en bron hebben dan de rest van de lichaamssamenstelling uit `body_comp`; dat stond eerder onder één noemer en is nu apart zichtbaar. BMI staat expliciet als berekend, met de invoer erbij. De versheid komt uit de bestaande observatielaag — `tkMetingHerkomst` bevat geen eigen tijdlogica.

Corrigeren en verwijderen zijn bewust **niet** toegevoegd. De datalaag ondersteunt het nog niet en de UI doet niet alsof.

### Bewust niet gebouwd

- **Verbanden.** Het minimum aantal vergelijkbare waarnemingen en de statistische methode zijn niet vastgesteld, dus is er niets vrij te geven. Zowel het overzicht als het nieuwe detailscherm tonen dezelfde veilige toestand. Er is geen correlatiemotor en geen zelfbedachte drempel.
- **De vierde statusgrens.** De Decision Engine blijft de enige bron van waarheid voor herstel- en belastingslabels. Geen nieuwe UI-drempels.
- **CRUD op metingen.** Aparte sprint, vereist eerst een veilige datalaag.

### Databaseonderhoud

De vier dubbele `hrv_log`-datums (18-08, 09-08, 08-07, 29-06) zijn onderzocht. Bij 09-08 en 08-07 stond het veld `edema` alleen op de oudste rij en was daardoor onzichtbaar, omdat de app overal de nieuwste rij per datum leest. Die waarde is naar de zichtbare rij gekopieerd — een `UPDATE` op een leeg veld, waarbij niets is overschreven en niets is verwijderd. De dubbele rijen zelf staan er nog: verwijderen is een onomkeerbare ingreep en gebeurt niet zonder aparte opdracht. Sinds v4.29.1 ontstaan er geen nieuwe duplicaten meer.

`.gitignore` is toegevoegd met `node_modules/`, `www/` en `package-lock.json`. Die stond in v4.29.0 beschreven en zat in v4.29.1 in de commit, maar viel weg bij de handmatige GitHub-upload omdat de webinterface bestanden met een punt overslaat.

### Getest
- Nieuw `core/fLichaamMetricDetail.test.js` — 73 controles: `healthStats` op alle randgevallen (gaten tellen niet als nul, één meting geeft geen spreiding, onbruikbare waarden vallen af, tien identieke aanroepen geven tien identieke uitkomsten), `availablePeriods` (langere perioden zonder extra metingen worden niet aangeboden, één meting levert geen enkele periode op), `weightSeries` (bewijsbaar identiek aan de vervangen inline-constructie), de route en de metricconfiguratie, en regressiecontroles op anatomie, verbanden, spierdetail, herstelberekening en de v4.29.1-Fitbit-fix.
- `core/fLichaamPhase0.test.js` (108) en `core/fLichaamSpierDetail.test.js` (105) bijgewerkt op de verbrede stijl-scope.
- Headless browsercontrole met echte renderpaden: alle vier de metrics openen, tekenen een grafiek, tonen statistiek en datadekking, wisselen van periode, tonen geen CRUD en geen verzonnen verbanden; na terugkeer staan beide anatomische figuren direct in beeld. Geen JavaScript-fouten in de console.
- Volledige Quality Gate lokaal gedraaid zoals de workflow hem draait: `coaching.test.js`, alle `core/*.test.js`, `npm run test:native`, `npm run build:www` en de bestandscontroles. Alles groen.

### Gewijzigd
`core/deviceIntegration.js`, `index.html`, `sw.js`, `CHANGELOG.md`, nieuw `core/fLichaamMetricDetail.test.js`, bijgewerkt `core/fLichaamPhase0.test.js` en `core/fLichaamSpierDetail.test.js`, nieuw `.gitignore`. `CORE_SIG` is ongewijzigd (`deviceIntegration.js` staat niet in `CORE_FILES`); `CACHE_NAME` en `CACHE_STATIC` zijn gebumpt naar `v43000`, anders blijft de service worker de oude `deviceIntegration.js` cache-first uitserveren.

## v4.29.1 — 18 augustus 2026 (INCIDENT — Fitbit-synchronisatie hersteld)

Incident-sprint. Geen roadmapwerk, geen redesign, geen wijziging aan Home of Training. Twee onafhankelijke defecten in de wearable-dataketen opgelost, beide met live bewijs uit productie.

### Defect 1 — rusthartslag synchroniseerde nooit (`parsed.rhr = 0`)

Live diagnostiek uit de productie-function (18-08-2026, 09:39): `http {hrv:200, rhr:200, sleep:200}` · `fetched {hrv:8, rhr:8, sleep:8}` · `parsed {hrv:8, rhr:0, sleep:8}` · `recordShape.rhr ["date","beatsPerMinute","dailyRestingHeartRateMetadata"]`.

Google Health léverde de rusthartslag dus wel — de parser gooide hem weg. `beatsPerMinute` is in de Google Health API een **int64**, en de proto3-JSON-mapping serialiseert int64 als **string** (`"57"`). De guard `typeof v === 'number'` verwierp die waarde. HRV (`averageHeartRateVariabilityMilliseconds`, een double) en slaap (afgeleid uit tijdstempels) zijn wél getallen — daarom faalde uitsluitend RHR.

`_wearableSyncLib.js` krijgt een pure `toNum`/`firstNum` die getal én numerieke string accepteert en bij alles wat geen eindig getal is `null` teruggeeft — nooit 0, nooit een verzonnen waarde. Toegepast op HRV, RHR en alle slaapduurvelden, want daar kan dezelfde klasse fout ontstaan. `hrv_log.rhr` is een integer-kolom, dus RHR wordt afgerond vóór opslag.

### Defect 2 — check-in overschaduwde gesynchroniseerde wearable-data

`saveHRV()` en `pchkSubmit()` deden een blinde `INSERT` in `hrv_log`. Vulde je in de check-in alléén je rusthartslag in, dan ontstond een **tweede rij voor dezelfde dag** met `hrv = null` en `sleep = null`. Elk scherm leest `order=date.desc,created_at.desc&limit=1` en pakte dus die nieuwste, half-lege rij: de al gesynchroniseerde HRV en slaap leken gewist en de dagfactor werd op onvolledige data berekend. Er ging geen data verloren, maar ze werd onbereikbaar.

Beide schrijfpaden gebruiken nu `upsertHrvLog()` — dezelfde bewezen vorm als `upsertWeightLog()`: rij van vandaag lezen, mergen via de pure `tkMergeHealthRow()`, PATCHen; alleen zonder bestaande rij nog een INSERT. Een leeg check-inveld betekent "niet ingevuld", nooit "wissen" (de velden worden nooit voorgevuld). De `[src:fitbit]`-provenance blijft behouden als je er een notitie bij typt.

Server-kant: de bestaande-rij-lookup in `wearable-sync.js` had geen `order` en kreeg van PostgREST dus een willekeurige rij terug. Zolang `hrv_log` geen `UNIQUE(user_id, date)` heeft, kon de sync daardoor een rij bijwerken die de app niet toont. Nu expliciet `order=created_at.desc` — de sync raakt exact de rij die de gebruiker ziet.

### Bruikbare foutafhandeling

`wearable-sync` gaf bij elke uitzondering dezelfde `500 "Serverfout"` terug, en legde de mislukking niet vast (`markSyncStatus` werd met `undefined` aangeroepen, waardoor `last_sync_status` op de vorige `ok` bleef staan — een storing was nergens zichtbaar).

Nu: interne foutcodes `AUTH_ERROR · TOKEN_REFRESH_ERROR · FITBIT_API_ERROR · RATE_LIMIT · NETWORK_ERROR · SUPABASE_ERROR · INVALID_RESPONSE · NOT_CONNECTED`, vastgelegd op de connectie én in de serverlog. De gebruiker ziet altijd dezelfde veilige tekst: "Synchroniseren met Fitbit is momenteel niet gelukt. Probeer het later opnieuw." Geen foutcodes, reasons of HTTP-statussen meer in de UI.

Een PostgREST-foutobject werd voorheen met `const [x] = obj` uitgepakt en gaf een `TypeError` → generieke 500. `sbRows()` maakt daar een getypeerde `SUPABASE_ERROR` van, en een storing wordt niet langer als "niet gekoppeld" getoond. Het antwoord bevat nu ook de HTTP-status per datatype, zodat een volgend incident te plaatsen is zónder toegang tot de Netlify-logs: `200 + fetched>0 + metrics=0` = parserfout, `4xx` = provider/permissie, `429` = rate limit.

Diagnostiek blijft strikt structureel — tellingen, statussen en veldnamen. Nooit tokens, secrets, payloads of gezondheidswaarden.

### Getest
- Nieuw `core/fHrvUpsertMerge.test.js` — extraheert `tkMergeHealthRow` uit `index.html` en meet dus de echte productiecode: het incidentscenario (RHR-only check-in na een sync) mag HRV en slaap niet verliezen, `0` blijft een geldige meting, lege invoer wist niets, provenance blijft staan.
- `core/fWearableSync.test.js` uitgebreid van 54 naar 79 controles: `toNum` op alle randgevallen, de exacte live RHR-shape met int64-string, afronding naar de integer-kolom, `sleepSummaryShape` (alleen keys) en `asArray`.
- `core/fWearableSyncHandler.test.js` uitgebreid van 29 naar 43 controles: de exacte live productie-shape end-to-end, de deterministische `order=created_at.desc`-lookup, een Supabase-fout die geen technische details lekt, en een 429 die geen valse "success" oplevert.
- Volledige Quality Gate lokaal gedraaid zoals de workflow hem draait: `coaching.test.js`, alle `core/*.test.js`, `npm run test:native`, `npm run build:www` en de bestandscontroles. Alles groen.

### Bekende beperkingen
- `hrv_log` heeft nog geen `UNIQUE(user_id, date)`. De code maakt geen nieuwe duplicaten meer, maar bestaande dubbele rijen (18-08 en 09-08) blijven staan tot ze expliciet worden opgeschoond — dat is een datawijziging en gebeurt niet zonder opdracht.
- Gewicht wordt (nog) niet uit Google Health gesynchroniseerd; alleen HRV, rusthartslag en slaap. De scope `health_metrics_and_measurements.readonly` dekt gewicht wel — bewust buiten deze incident-sprint gehouden.
- Of de slaapduur "werkelijk geslapen" of "tijd in bed" is, is nog niet hard bewezen: `sleep.summary` was in de live diagnostiek leeg, dus de sync valt terug op het interval. De nieuwe `sleepSummaryShape`-diagnostiek maakt dit na deze deploy zichtbaar.

### Gewijzigd
`netlify/functions/_wearableSyncLib.js`, `netlify/functions/wearable-sync.js`, `index.html`, `sw.js`, `CHANGELOG.md`, nieuw `core/fHrvUpsertMerge.test.js`, uitgebreid `core/fWearableSync.test.js` en `core/fWearableSyncHandler.test.js`, plus de `.gitignore` die in v4.29.0 wel beschreven maar niet meegeleverd was.

## v4.29.0 — 17 augustus 2026 (Lichaam Data Depth 1.0 — observatielaag)

Van de Lichaam-sectie een betrouwbare **observatielaag** gemaakt: elke getoonde waarde draagt nu zijn herkomst, meetmoment, versheid en dekking met zich mee. Geen redesign, geen nieuwe mock-up, geen correlatie- of verbandenmotor.

### Nieuw: `observation.v1` in de Calculation-laag
`core/deviceIntegration.js` krijgt twee pure, deterministische functies. `now` wordt ingespoten; er is geen `Date.now()`, geen random, geen DOM en geen query.

`observation(series, {today, unit, kind})` maakt van een `healthSeries`-reeks één observatie met: waarde, meetdatum, bron, soort (gemeten · ingevoerd · berekend), leeftijd in dagen, versheid, aantal metingen, vensterlengte, dekking, volledigheid, en eerste/laagste/hoogste meting mét hun eigen datum. Ontbrekende data levert `value: null` — nooit 0.

Versheid is expliciet en zonder interpretatie: vandaag · gisteren · recent (2 t/m 6 dagen) · verouderd (7 dagen of meer). Een meetdatum in de toekomst telt nooit als vers. Zonder referentiedatum is de versheid `unknown`, niet vers.

`observationQuality(obs, sync)` leidt daar één van zeven datakwaliteit-toestanden uit af: `no_data · syncing · sync_failed · source_unavailable · stale · partial · current`. De vololgorde is bewust: een lopende of mislukte sync weegt zwaarder dan de leeftijd van de meting, en bij twijfel komt er nooit een geruststellende status uit. De grens voor gedeeltelijke data staat expliciet op `PARTIAL_COVERAGE_MAX = 0.5`, zodat de UI die niet zelf kan verschuiven.

### Lichaam-UI verdiept, visueel ongewijzigd
Een statusregel direct onder de check-in — bestaande kaartstijl, bestaande statuskleuren, geen nieuwe tokens — toont in één zin hoe het met de gegevens staat, plus de bron, de laatste meting en de laatste synchronisatie. De syncstand komt uit de bestaande `fetchWearableStatus()` en wordt door `DeviceCore.deviceConnectionState` canoniek gemaakt.

Staan meerdere metrics er verschillend voor, dan wint de strengste: één mislukte sync of één verouderde reeks verdwijnt niet achter een actuele.

De vier trendkaarten tonen nu naast waarde, trend, sparkline en dekking ook het **meetmoment in gewone taal** ("vandaag gemeten", "12 dagen geleden") en de **herkomst** uit de observatielaag in plaats van uit de UI. Zonder meting staat er "niet gemeten" en geen tijdsaanduiding.

### Getest
- Nieuw `core/fObservation.test.js` — 77 controles: lege en null-invoer verzinnen niets, gaten tellen mee in dekking en verschuiven de waarde naar de laatste echte meting, versheid op alle grenzen, tien identieke aanroepen geven tien identieke uitkomsten, en geen enkele combinatie levert "actueel" op zonder verse meting. Plus een puurheidscontrole op het codeblok zelf: geen `Date.now`, geen random, geen DOM, geen query, en geen correlatie- of verbandlogica.
- Alle zeven datakwaliteit-toestanden end-to-end in de browser doorlopen met echte renderpaden: actueel via Fitbit, actueel via check-in, verouderd, sync mislukt, geen data en geen bron gekoppeld.
- **Home en Training: 0 verschillende pixels van 329.160** ten opzichte van de goedgekeurde baseline.
- Volledige Quality Gate lokaal gedraaid zoals de workflow hem draait: `coaching.test.js`, alle `core/*.test.js`, `npm run test:native`, `npm run build:www` en de bestandscontroles. Alles groen.

### Gewijzigd
`core/deviceIntegration.js`, `index.html`, `sw.js`, `CHANGELOG.md`, nieuw `core/fObservation.test.js` en een nieuwe `.gitignore` voor `node_modules/`, `www/` en `package-lock.json` — die worden door de Quality Gate zelf aangemaakt en horen niet in de repository.

`APP_VER` v4.28.0 → **v4.29.0**; cache → `trainingskompas-v42900`. `CORE_SIG` ongewijzigd: `deviceIntegration.js` valt niet onder de door `sw-guard` bewaakte core-bestanden.

### Bewust NIET gebouwd
Geen correlatie- of verbandenmotor, geen statistische verbanden, geen minimum-waarnemingsregel, geen causaliteitsclaims, geen AI-conclusies. De verbandensectie blijft "Nog geen verbanden vrijgegeven". Geen schema- of datawijziging, geen nieuwe providerintegratie, geen redesign.

---

## v4.28.0 — 17 augustus 2026 (Spiergroep-detail — Lichaam functioneel afgerond)

Het laatste ontbrekende niveau in de Lichaam-keten: klikken op een spiergroep opent nu een echt detailscherm. Geen redesign, geen nieuwe mock-up, geen nieuwe visuele stijl — het detail hergebruikt de bestaande kaart-, tegel- en labelstijlen en valt binnen dezelfde `:is()`-scope als de andere Lichaam-schermen.

### Nieuw scherm `s-lich-spier`
Hangt in de bestaande `go()`-router. De selectie loopt via een module-variabele (`lichSpierSel`), hetzelfde patroon als `_minePendingSeg` bij Training — geen nieuwe navigatiestructuur, geen tweede router.

Twee ingangen, één functie: de spierregels op het Lichaam-overzicht en de kaarten op "Alle spiergroepen" roepen allebei `openSpierDetail(naam)` aan.

Het detail toont:
- herstelpercentage, statuslabel en wat dat betekent voor belasting vandaag;
- het anatomiefiguur van de juiste zijde, met de gekozen groep gemarkeerd;
- uren sinds belasting, basisherstel, sets over 7 dagen en de belastingsstatus;
- **hoe het is berekend** — uren sinds belasting, basisuren, RPE van de laatste sessie en de formuleversie `recovery.v1`, met de expliciete melding dat het een vuistregel is en geen gemeten fysiologische waarde;
- de oefeningen die de groep de afgelopen 14 dagen belastten, met sets, datum en RPE, gelabeld *uit training*;
- doorstappen naar alle spiergroepen en naar Coach.

### Geen tweede rekenwaarheid
Elke waarde komt uit een bestaande bron: `v43OverallRecovery` (die `calculateMuscleRecoveryPct` gebruikt), `MUSCLE_RECOVERY_HOURS`, `muscleLoadBySvgId`, `getExerciseMuscles` en de `sessions`-tabel. Status en kleur komen uit dezelfde `lichRecStatus`/`lichLoadStatus`-helpers als het overzicht. Het scherm rekent zelf niets uit — de test bewijst dat er geen herstelberekening in de uitvoerbare code van het detail staat.

`lichSpierZijde(naam)` leidt de zijde af uit de bestaande `MUSCLE_NAME_TO_SVG_IDS`-mapping, zodat er geen tweede lijst met spiernamen ontstaat.

### Nieuwe test — `core/fLichaamSpierDetail.test.js`, 105 controles
Naast het scherm en de route bewaakt deze test de vraag uit de opdracht of dezelfde spiergroep overal hetzelfde wordt begrepen:

- elke groep in `MUSCLE_RECOVERY_HOURS` bestaat ook in `MUSCLE_NAME_TO_SVG_IDS` en omgekeerd, en beide lijsten zijn even lang (14 groepen);
- de zijde-afleiding geeft voor alle 14 groepen een geldige waarde, met expliciete controles op quadriceps, borst, hamstrings, billen, triceps en rug, en een veilige terugval bij een onbekende naam;
- elke gekoppelde svg-id volgt de naamconventie van de anatomie-assets;
- de drempels zijn ongewijzigd: herstel 85/50, belasting 12/6 sets, en 0 sets is een rustdag en geen lage belasting;
- de inline-handler mag het HTML-attribuut niet breken — dat ging in de eerste versie mis met een dubbele quote en is gerepareerd.

### Getest
- **Home en Training: 0 verschillende pixels van 329.160** ten opzichte van `git show 27fb416:index.html`.
- Alle 43 suites groen, `logic_tests` 250/250, release gate groen, sw-guard groen.
- Dertien routes gecontroleerd, inclusief het nieuwe scherm: steeds precies één actief scherm, geen consolefouten.
- Vier mobiele viewports (360×640 t/m 430×932): geen horizontale overflow, geen kaart buiten beeld, bottom navigation verankerd.
- Volledige klikflow: overzicht → spierrij → detail, en Alle spiergroepen → kaart → detail. Beide leveren dezelfde groep en dezelfde waarden.

### Gewijzigd
`index.html`, `sw.js`, `CHANGELOG.md`, nieuw `core/fLichaamSpierDetail.test.js`, en één assertie in `core/fLichaamPhase0.test.js` verbreed naar de nieuwe stijl-scope. `APP_VER` v4.27.1 → **v4.28.0**; cache → `trainingskompas-v42800`. `CORE_SIG` ongewijzigd — `core/*.js` is niet aangeraakt.

### Bewust niet gewijzigd
Home, Training, bottom navigation, alle engines, de sleep-unit normalisatie, wearable-sync, Fitbit, Google Health, Concept2, database, schema, data, bestaande tests, release gates, de sw-guard, de anatomie-SVG's en de kleurtokens.

---

## v4.27.1 — 17 augustus 2026 (Lichaam polish + UI freeze)

Gerichte polish op de bevroren Lichaam-baseline. Geen redesign, geen mock-up, geen nieuwe kleuren, geen nieuwe architectuur.

### Typografie
Het label liep aan elkaar vast als "HERSTELTRENDSlaatste 30 dagen". De labelregel is nu een flexregel met ruimte ertussen: **HERSTELTRENDS** links, *laatste 30 dagen* rechts. De rest van de pagina is nagelopen; geen vergelijkbare fouten gevonden.

Het losse label "Vandaag" boven de hero is verwijderd: de hero draagt die eyebrow zelf al. Dat scheelde een dubbeling én 42 px, waardoor de anatomie hoger in beeld komt.

### Anatomische visualisatie
Figuren van 190 naar **225 px** (+18%, binnen de gevraagde 15–25%). De kaart blijft rustig: toggle, twee figuren, legenda, vier spierregels en voettekst. Labels VOORZIJDE / ACHTERZIJDE, legenda en kleuren ongewijzigd.

Positie op vijf viewports gemeten — de figuren zijn op alle vijf direct zichtbaar bij het openen van Lichaam:

| Viewport | Bovenkant figuur | Zichtbaar |
|---|---|---|
| 360 × 640 | 607 px | ja |
| 360 × 780 | 607 px | ja |
| 390 × 844 | 569 px | ja |
| 412 × 915 | 551 px | ja |
| 430 × 932 | 551 px | ja |

### Hersteltrends — bronstatus toegevoegd
Elke trendkaart toont nu de bron van de meest recente meting (Check-in, Fitbit, Google Health, of de weegschaalbron bij gewicht). De bron komt uit `DeviceCore.healthSeries(...).source`; de UI leidt hem niet zelf af.

De lege staat zegt nu "niet gemeten · nog geen gegevens" in plaats van een streepje, zodat een ontbrekende meting niet als waarde leest. Onder zes meetpunten wordt geen trend getoond.

### Meetgegevens — ontbrekend is ontbrekend
`renderBodyMeasurements` gaf elke samenstellingswaarde een tegel, ook zonder meting: een groot "—" naast een gevulde BMI leest als nul. Alleen echt gemeten waarden krijgen nu een tegel; wat ontbreekt staat eronder als "Niet gemeten: Vet% · Spiermassa · BMR · Visceraal vet". De `||`-controles zijn vervangen door `!= null`, zodat een echte 0 niet meer als ontbrekend wordt gelezen.

### Aanraakvlakken
De Herstel/Belasting-schakelaar van 38 naar 44 px. Enige resterende target onder 44 px op Lichaam is de ronde `＋`-knop in de header (36 × 36) — dat is de app-brede `.ibtn`-klasse die ook op Home en Training staat; die laat ik ongemoeid.

### Getest
- **Home en Training: 0 verschillende pixels van 329.160** ten opzichte van `git show 27fb416:index.html`, identieke fixtures, 390 × 844.
- Alle 42 suites groen, `logic_tests` 250/250, release gate groen, `sw-guard` groen.
- Vijf mobiele viewports: geen horizontale overflow, geen kaart buiten beeld, bottom navigation onderaan verankerd.
- Routecontrole over dertien schermen, geen consolefouten.
- Slaap consistent tussen hero en trendkaart (6u 36m op beide) — geen dubbele /60- of ×60-conversie.

### Gewijzigd
`APP_VER` v4.27.0 → **v4.27.1**; `sw.js` cache → `trainingskompas-v42701`. `CORE_SIG` ongewijzigd — `core/*.js` is niet aangeraakt.

### Bewust niet gewijzigd
Home, Training, bottom navigation, Calculation Engine, Decision Engine, Context Engine, sleep-unit normalisatie (`sleep_unit.v1`, `normalizeSleepHours`, `sleepToHours`, `minutesToHours`, `MAX_SLEEP_HOURS = 20`), wearable-sync, Fitbit, Google Health, Concept2, database, schema, data, bestaande tests, release gates, service-worker-guard, de anatomie-SVG's, de kleurtokens en de app-brede `.ibtn`.

---

## v4.27.0 — 17 augustus 2026 (Visual restore Home & Training + Lichaam-overzicht volgens mock-up)

### Blokkerend opgelost — lege schermsecties
`index.html` riep `CalcCore.normalizeSleepHours` aan zonder terugval, terwijl `sw.js` `core/*.js` cache-first serveert en `index.html` network-first. Bij de eerste laadbeurt na een deploy draaide de app daardoor met nieuwe `index.html` en oude core: een `TypeError` in `dagfactor()` liet Snelacties, Volume en Consistentie op Home leeg, en een tweede in de slaapgrafiekreeks liet het scherm Gezondheid & herstel zonder grafieken. Nieuw is `tkSleepHours(v)`, één guard-helper die terugvalt op de ruwe waarde wanneer de engine-functie ontbreekt. Headless geverifieerd: met een oude core rendert Home nu identiek aan een nieuwe core.

### Home en Training terug naar de goedgekeurde baseline (27fb416)
Negen kleurpunten die in v4.25.0 ten onrechte waren omgezet, staan terug op `--green` / `--y` / `--red`: de dagfactor-ring en de drie legendabolletjes in `renderV43Home`, de spierherstel-minilijst bij het starten van een training, de Plate Calculator, de herhaal-preview, `refreshStats` op Voortgang en de apparaatstatus op Profiel.

`renderMuscleRecoveryHeatmap` wordt gedeeld door de Home-hero en Lichaam. In plaats van een tweede implementatie krijgt de functie de kleurfunctie geïnjecteerd: Home geeft `v43HomeRecColor` mee (baseline-kleuren), Lichaam gebruikt de standaard `v43RecColor` (dark-mode-proof statuskleuren).

**Bewijs:** pixelvergelijking van Home en Training tegen `git show 27fb416:index.html`, identieke fixtures, 390 × 844: **0 verschillende pixels van 329.160** op beide schermen.

### Lichaam-overzicht volgens het goedgekeurde mock-upcontract
- **Beide anatomiefiguren direct zichtbaar** bij het openen van de tab — voorzijde en achterzijde naast elkaar, zonder eerst te klikken. De kaart begint op 530 px, de figuren vallen binnen het eerste scherm.
- **Herstel/Belasting-schakelaar** die figuur, legenda, spierlijst én voettekst tegelijk omzet. Eén `lichAnatMode`-state, dus "figuur = belasting, lijst = herstel" kan constructief niet meer ontstaan.
- **Legenda** per modus: Hersteld / Aandacht / Vermoeid respectievelijk Hoog / Gemiddeld / Laag / Rustdag.
- **Spierlijst** met de vier relevantste groepen — bij herstel de laagste, bij belasting de zwaarst belaste — met doorstap naar alle spiergroepen.
- **Hersteltrends**: vier kaarten met waarde, trendrichting, sparkline, **datadekking** ("30 van 30 dagen") en status. Geen trend tonen onder zes meetpunten.
- **Verbanden**: eigen sectie met de Decision-Engine-status. Er staat nergens een drempelgetal — het minimum aantal vergelijkbare waarnemingen is nog een openstaande productbeslissing.
- Gebieden zonder herstelmodel (hoofd, handen, voeten) zijn neutraal in plaats van "volledig hersteld". Alleen op Lichaam, via `opts.neutralUnknown`; de Home-hero blijft ongewijzigd.

Beide anatomierenderers accepteren nu `opts.side` zodat voor- en achterzijde tegelijk getekend kunnen worden zonder de toggle-state van het detailscherm te verstoren. Zonder `opts` is het gedrag exact als voorheen. `muscleLoadBySvgId()` is één bron voor de belastingsdata van figuur, lijst en overzicht.

Alle waarden komen uit de bestaande engines en queries: `v43OverallRecovery`, `calculateMuscleRecoveryPct`, `DeviceCore.healthSeries`/`healthTrend`, `sessions`, `hrv_log`, `weight_log`. Geen voorbeeldwaarden, geen nieuwe berekening.

### Getest
- Release gate groen; alle 42 suites groen, `logic_tests` 250/250.
- `core/fLichaamPhase0.test.js` uitgebreid naar 108 controles, waaronder de harde acceptatie-eis dat beide figuren en de modus-schakelaar in de overzichtsmarkup staan, dat beide zijden tegelijk getekend worden, en dat er nergens een verzonnen verbandsdrempel staat. De assertie die `--red` app-breed verbood is ingeperkt tot de Lichaam-renderers, zodat Home en Training juist wél hun baseline-kleuren houden.
- `core/calculation.test.js`: de legacy-harness extraheert nu ook `tkSleepHours`, zodat `dagfactor` in de test dezelfde code draait als in de app. 79/79.
- Routecontrole over dertien schermen: steeds precies één actief scherm, geen consolefouten.

### Gewijzigd
`APP_VER` v4.26.0 → **v4.27.0**; `sw.js` cache → `trainingskompas-v42700`. `CORE_SIG` **ongewijzigd** (`fd2ef218783ea67e`): `core/*.js` is deze sprint niet aangeraakt.

### Bewust niet gewijzigd
Calculation Engine, Decision Engine, Context Engine, sleep-unit normalisatie, wearable-sync, Fitbit, Google Health, Concept2, database, schema, data, migraties, bestaande tests, release gates, service-worker-guard, de anatomie-SVG's, `--red`/`--green`/`--y`/`--accent`/`--accent2` en de grijsschaal, alle `#home-*`- en Training-CSS, de bottom navigation.

---

## v4.26.0 — 17 augustus 2026 (Slaapduur: één canonieke eenheid)

`hrv_log.sleep` bevatte twee eenheden. De check-in schreef decimale uren (`saveHRV`), de wearable-sync schreef minuten in dezelfde kolom (`netlify/functions/_wearableSyncLib.js`, `parseSleepPoint`). Op elke wearable-dag las `calculateDayFactor` daardoor een minutenwaarde als uren — een nacht van 432 telde als 432 uur slaap — en de slaapgrafiek deelde diezelfde kolom nog eens door 60.

**Canoniek is vanaf nu decimale uren.**

### Bron gecorrigeerd
`parseSleepPoint` rekent de minuten van de provider om naar uren vóór het wegschrijven, via de nieuwe, geëxporteerde `minutesToHours`. Er kunnen dus geen twee eenheden meer in één kolom terechtkomen. De diagnostische helper `sleepMinutesOf` blijft ongewijzigd minuten teruggeven.

### Compatibiliteitslaag voor bestaande rijen
`CalcCore.normalizeSleepHours` (`sleep_unit.v1`) normaliseert bij het **lezen**. Regel, deterministisch en conservatief: een nacht duurt nooit langer dan `MAX_SLEEP_HOURS` (20), dus alles daarboven kan alleen een minutenwaarde zijn en wordt door 60 gedeeld. De opgeslagen rij blijft ongewijzigd — geen migratie, geen schemawijziging.

### Dagfactor unit-consistent
`calculateDayFactor` normaliseert zijn `sleepHours` één keer en ontvangt daarmee uitsluitend decimale uren. De wrapper `dagfactor()` in `index.html` normaliseert vóór zowel `slaapDagFactor` als `calculateDayFactor`, zodat de getoonde slaapfactor en de berekende dagfactor niet uiteen kunnen lopen.

### Eén formatter
Er waren drie slaapformatters met twee verschillende eenheid-aannames: `fmtSleep` (uren), `v43SlaapTxt` (uren) en `_tkSleepFmt` (deelde door 60). Alle drie delegeren nu naar `tkFmtSleepHours`, die eerst normaliseert. De invoerkant loopt via `CalcCore.sleepToHours(uren, minuten)`; de check-in rekent niet langer zelf om. De slaapgrafiek normaliseert de reeks vóór weergave.

### Bestaande data gecontroleerd — geen migratie nodig
Read-only audit op de productiedatabase, uitsluitend aggregaten:

| | |
|---|---|
| Rijen in `hrv_log` | 56 |
| Rijen met een slaapwaarde | 41 |
| Waarden boven 20 (verdacht minuten) | **0** |
| Bereik | 4,17 – 7,85 |
| Periode | 21 april t/m 16 augustus 2026 |
| Rijen met een wearable-herkomst en slaap | **0** |

Alle bestaande slaapwaarden staan al in uren en zijn afkomstig uit de check-in. De sync heeft nog nooit een slaapwaarde weggeschreven, waardoor de fout in productie nooit is opgetreden. **Er is dus geen migratie nodig en die is ook niet uitgevoerd.** De compatibiliteitslaag blijft staan als vangnet voor rijen die vóór deze release alsnog via een sync binnen zouden komen.

### Getest
- Nieuw: `core/fSleepUnit.test.js` — 60 controles op invoer (7u48m → 7,8 · 7u12m → 7,2), sync (468/432/450 min → uren), leeslaag (legacy-minuten, grenswaarde 20, null en onzin), dagfactor-consistentie (7,2 uur en 432 minuten geven dezelfde factor; 390 minuten geeft 0,97 en niet 1,00), weergave en schrijfpaden.
- `core/fWearableSync.test.js` 54/54 en `core/fWearableSyncHandler.test.js` 29/29 — assertions bijgewerkt van minuten naar uren, plus zes nieuwe eenheidstests.
- Release gate groen; alle 41 suites groen, `logic_tests` 250/250.
- Headless browsercontrole: formatter en dagfactor geverifieerd op de echte pagina, geen consolefouten.

### Gewijzigd
- `APP_VER` v4.25.0 → **v4.26.0**; `sw.js` `CORE_SIG` → `fd2ef218783ea67e`, `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42600`. De `CORE_SIG`-bump is afgedwongen door `core/sw-guard.test.js`: `core/calculation.js` is gewijzigd, dus zonder bump serveert de service worker de oude core aan bestaande browsers.

### Niet gewijzigd
Geen schema, geen migratie, geen data. `core/decision.js`, `core/deviceIntegration.js` en `core/contextEngine.js` zijn byte-identiek. Geen UI-herontwerp: de Lichaam-schermen zijn alleen geraakt waar een slaapwaarde werd omgerekend of geformatteerd.

---

## v4.25.0 — 17 augustus 2026 (Lichaam UX 2.0 — Fase 0 + Fase 1)

Implementatie van uitsluitend Fase 0 (technische UX-fixes) en Fase 1 (Lichaam-overzicht en navigatiestructuur) uit het goedgekeurde ontwerp `Lichaam_UX_2.0_mockup_DEFINITIEF.html`. Fase 2 t/m 7 zijn bewust **niet** gebouwd.

### Fase 0.1 — statuskleuren dark-mode-proof
`--red` is `#111111` en werd in dark mode niet overschreven; status- en herstelkleuren renderden daardoor zwart. Nieuw zijn drie semantische aliassen — `--status-good`, `--status-warn`, `--status-bad` — op de al bestaande, per thema overschreven `--df-g/--df-y/--df-r`. Alle veertien stoplicht-kleurbeslissingen (1RM-doel, spierherstel, herstelheatmap, dagfactor, T/H-ratio, RPE-geschiedenis, apparaatstatus, legenda) gebruiken deze aliassen. **`--red` zelf is ongewijzigd** en houdt zijn bestaande rol voor actieknoppen, verwijderen en focus-accenten — die zijn geen status.

### Fase 0.2 — hrv_log-limiet versus de 90-dagenselector
De periodeknoppen boden 7/14/30/90 dagen aan, maar er werden altijd maar 35 rijen opgehaald: 90 dagen toonde in werkelijkheid hooguit 35. De eerste render houdt de goedkope limiet van 35 aan (dekt de standaardperiode én de HRV-baseline van 28 dagen); kiest de gebruiker een langere periode dan de opgehaalde reeks dekt, dan wordt precies zoveel bijgeladen als die periode nodig heeft en gecachet. Korter kiezen doet nooit een nieuwe query. De limiet is afgeleid van de periode (`_tkHealthLimitFor`), niet willekeurig groot, en begrensd op 400.

### Fase 0.3 — kleursemantiek van de twee anatomische figuren
De twee figuren gaven tegengestelde betekenis aan dezelfde kleuren: groen betekende "goed hersteld" op het ene figuur en "veel volume" op het andere, rood "vermoeid" én "weinig volume". Herstel blijft een stoplicht (drempels 85/50 ongewijzigd). Belasting is nu één intensiteitsramp laag → hoog (`--load-0` t/m `--load-3`, één tint op de bestaande `--df-b`-kleur, per thema overschreven); de drempels 12/6 sets zijn ongewijzigd. Hoge belasting is geen slechte uitkomst en wordt niet langer rood. Ook de belastingskaarten op Lichaam en de volumelijst op Voortgang volgen deze ramp; alleen "rust aanbevolen" blijft een aandachtsignaal.

### Fase 1 — compact Lichaam-overzicht
Het overzicht ging van ~4.300 px naar **1.366 px** gemeten scrollhoogte. Behouden: de hero met herstel, status, dagfactor, slaap, HRV en rusthartslag. Nieuw op het overzicht: een check-instrip die de **bestaande** check-in (`m-hrv`) opent — de hero vroeg voorheen om een check-in zonder route ernaartoe; een samenvattingskaart van het herstelmodel met doorstap naar alle spiergroepen; vier aanraakbare metric-kaarten (HRV, rusthartslag, slaap, gewicht); een feitenblok "Wat je lichaam laat zien"; en verwijskaarten naar Coach en Training.

Elke waarde toont nu of hij **gemeten** of **berekend** is.

### Fase 1 — navigatiestructuur
Drie nieuwe schermen in de bestaande `go()`-router, elk gevuld met de bestaande blokken en dezelfde renderers — geen lege of nagemaakte schermen:
- `s-lich-spieren` — herstel (figuur + lijst) en belasting (kaarten + figuur) als twee gescheiden secties met elk hun eigen schaal, plus de herstelgeschiedenis.
- `s-lich-health` — lichaamsmetingen en de historische grafieken met periodeselector.
- `s-lich-metingen` — de vijf bestaande metingenkaarten.

De metric-kaarten routeren via één tabel (`TK_LICH_METRIC_ROUTE`); een eigen detailscherm per metric komt in een latere fase en vergt dan alleen een wijziging in die tabel.

### Verwijderd
Het blok "Coachadvies vandaag" op Lichaam. Dat bevatte een eigen RPE-plafond (`df>=1.0?9:df>=0.93?8:7`) en de naam van de training van vandaag — een tweede source of truth naast `DecisionCore.computeProgAdjustment` en Home. Lichaam toont nu feiten en verwijst voor duiding naar Coach en voor planning naar Training. De bijbehorende dode CSS en de onjuiste bijschriftbelofte "tik een spier voor detail" zijn opgeruimd.

### Getest
- Release gate groen: `logic_tests` 250/250 en alle core-suites.
- Alle 40 testsuites groen, waaronder de nieuwe `core/fLichaamPhase0.test.js` (95 controles op de kleurtokens, de limiet-/dekkingslogica, de routetabel en de schermstructuur).
- Headless (Chromium, 390 px): vier Lichaam-schermen renderen in light én dark zonder console-fouten; routing van dertien schermen gecontroleerd, steeds precies één actief scherm.
- Aanraakvlakken van alle nieuwe knoppen ≥ 44 px.
- Kleuren geverifieerd op de gerenderde SVG: belasting laag→hoog `#9dc3e2 → #5295c6 → #006095` (light) en `#4b718b → #5d9bc5 → #92caf1` (dark); herstel stoplicht in beide thema's.

### Gewijzigd
- `APP_VER` v4.24.30 → **v4.25.0**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42499`.

### Niet gewijzigd
Geen wijziging aan Supabase, schema, migraties, `core/calculation.js`, `core/decision.js`, `core/contextEngine.js`, de anatomie-SVG's, `MUSCLE_RECOVERY_HOURS`, de HRV-baselinelogica, `healthSeries`, de providerintegraties, Home, Coach, authenticatie of de bottom navigation.

---

## v4.24.23 — 7 augustus 2026 (Nieuw: onboarding opnieuw doorlopen vanuit Instellingen)
*Praktische aanleiding: het testen van de onboarding-fixes liep vast op Supabase's e-mail-rate-limit bij het aanmaken van een nieuw testaccount, en het handmatig wissen van een localStorage-sleutel via de browserconsole is op mobiel niet haalbaar zonder USB-debugging.*

### Toegevoegd
Nieuwe knop "Onboarding opnieuw doorlopen" in Instellingen → App-informatie, direct onder Debuginformatie. Met bevestigingsvraag ("bestaande gegevens blijven behouden") om per ongeluk indrukken te voorkomen. Reset uitsluitend de lokale `tk_onboarding_done`-vlag en toont het onboardingscherm — raakt geen enkele trainingsdata, profielgegevens of instellingen.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- HTML div-balans vóór/na: consistent (3 nieuwe divs, gelijk aantal open/sluit).
- `logic_tests.js`: 211/211 geslaagd, geen regressie.

### Gewijzigd
- `APP_VER` v4.24.22 → **v4.24.23**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42423`.

---

## v4.24.22 — 7 augustus 2026 (Correctie op v4.24.21 — echte oorzaak: horizontaal, niet verticaal)
*De vorige fix (dvh-fallback + sticky) loste het verkeerde probleem op — een meegestuurde schermopname liet zien dat de "Volgende"-knop grotendeels RECHTS buiten beeld viel, niet onderaan.*

### Echte oorzaak, gevonden via vergelijking met werkende patronen
De hoofdnavigatie (`.ni`-knoppen, altijd correct werkend) gebruikt `flex:1` **zonder** `width:100%`. De onboarding-knoppen gebruiken de `.btn`-klasse, die wél `width:100%` heeft — in combinatie met de inline `flex:1` op de "Volgende"-knop leidde dat tot een verkeerde breedteberekening die de knop over de rand van het scherm duwde.

### Fix
- De `position:sticky`-toevoeging uit v4.24.21 teruggedraaid — loste het echte probleem niet op en week af van het bewezen-werkende patroon dat `.bnav` en modals elders al gebruiken (gewone flex-child, geen sticky).
- `width:auto` toegevoegd aan de inline-style van beide onboarding-knoppen (Terug én Volgende), zodat deze de conflicterende `width:100%` van `.btn` expliciet overschrijft en de breedteverdeling volledig aan `flex` wordt overgelaten — exact zoals `.ni` dat al zonder problemen doet.
- De `100dvh`-fallback op `#app` uit v4.24.21 blijft staan (onschadelijke, correcte verbetering, ook al was het niet de oorzaak van dít probleem).

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- HTML div-balans vóór/na: 0 verschil.
- `logic_tests.js`: 211/211 geslaagd, geen regressie.

### Gewijzigd
- `APP_VER` v4.24.21 → **v4.24.22**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42422`.

### Aandachtspunt voor een volgende sprint
Dezelfde `.btn`(`width:100%`) + `flex:1`-combinatie komt ook voor in meerdere modals (bv. `m-pass-reset`, `m-goal-add`, `m-vt-naam`). Daar niet zichtbaar als probleem in de beschikbare screenshots, maar de moeite waard om te controleren of hetzelfde patroon zich daar ook (subtieler) voordoet.

---

## v4.24.21 — 7 augustus 2026 (UI-fix — onboarding-navigatieknoppen buiten beeld)
*Gemeld: de Terug/Volgende-knoppen op het onboardingscherm vielen buiten het zichtbare scherm op een mobiel toestel. Niet live te reproduceren (onboarding is al doorlopen op de beschikbare test-accounts), dus opgelost op basis van grondige CSS-analyse.*

### Gevonden
`#app` (de buitenste wrapper van de hele app) gebruikte `min-height:100vh` **zonder** de `100dvh`-fallback die `.scr` (elk individueel scherm) zelf al wél had. Op mobiele browsers is `100vh` vaak groter dan de daadwerkelijk zichtbare hoogte (rekent soms mee met ruimte die door de systeem-navigatiebalk in beslag wordt genomen), wat content onderaan het scherm buiten beeld kan duwen.

### Fix
- `#app`: dezelfde `100dvh`-fallback toegevoegd als `.scr` al had.
- De onboarding-navigatiebalk zelf (Terug/Volgende) extra geborgd met `position:sticky;bottom:0` — garandeert dat de knoppen altijd binnen het zichtbare gebied blijven plakken, ongeacht eventuele resterende hoogteberekeningsverschillen tussen browsers/toestellen. Achtergrondkleur toegevoegd zodat scrollende inhoud er niet doorheen zichtbaar wordt.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- HTML div-balans vóór/na: 0 verschil (pure CSS-wijziging, geen structuurwijziging).
- `logic_tests.js`: 211/211 geslaagd, geen regressie (geen logicawijziging).

### Gewijzigd
- `APP_VER` v4.24.20 → **v4.24.21**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42421`.

### Ter verificatie
Niet live getest door Claude (geen reproductie mogelijk). Om zelf te controleren: onboarding is opnieuw te zien door in de browserconsole `localStorage.removeItem('tk_onboarding_done')` uit te voeren en de pagina te verversen.

---

## v4.24.20 — 7 augustus 2026 (Kritieke fix — PR & 1RM: gedeelde kolommen → per-gebruiker tabel)
*Vervolg op de peakdoelen-fix: na volledig uit-/inloggen bleek 'Geschatte 1RM' nog steeds harde waardes te tonen (Backsquat 95kg, Benchpress 80kg, etc.) op een account dat nog nooit had getraind. Grondoorzaak: exercises.pr en exercises.one_rm hadden exact hetzelfde architectuurprobleem als exercises.peak_goal.*

### Het probleem
`exercises.pr` (personal record) werd bij **elke nieuwe PR automatisch bijgewerkt op de gedeelde oefeningen-rij** — dus niet alleen een eenmalig ingesteld getal zoals bij peakdoelen, maar continu overschreven bij normaal gebruik, zichtbaar voor iedereen. `exercises.one_rm` (handmatig ingevoerde 1RM) had hetzelfde probleem. Gevonden op 12+ plekken: badges bij het loggen van een set, sessie-samenvattingen na een training, de Doelen-module (inclusief een Home-scherm-doelenkaart die niet eerder was gezien), AI-coach-context, en het Voortgang-scherm.

### Architectuurkeuze
In plaats van weer een nieuwe tabel: de bestaande `exercise_goals`-tabel (Sprint 6.0.1-vervolg, peakdoelen) uitgebreid met twee kolommen (`pr`, `one_rm`) — zelfde RLS, zelfde structuur, minder migratie-overhead. `peak_goal` moest daarvoor nullable gemaakt worden (niet elke rij heeft meer per se een peakdoel).

### App-code aangepast
- `exerciseGoals` (Map) uitgebreid van `exercise_id -> peak_goal` naar `exercise_id -> {peak_goal, pr, one_rm}`.
- Nieuwe `prFor(exId)`/`oneRMFor(exId)`, analoog aan `peakGoalFor()`.
- Nieuwe `upsertExerciseGoalField(exId, field, value)`-helper: bepaalt zelf patch (rij bestaat al) vs. post (nieuwe rij) op basis van de al-geladen Map, en werkt zowel online als offline (queue-aware) — nodig omdat PR-detectie een kernonderdeel is van het offline kunnen loggen van een training.
- **Belangrijke correctie tijdens het werk:** `savePeakGoal()` deed bij het wissen van een peakdoel voorheen `sbDel` op de **hele rij** — dat zou nu ook iemands PR/1RM voor diezelfde oefening hebben meegewist. Aangepast naar een gerichte PATCH die alleen `peak_goal` naar `null` zet.
- Alle 12+ vindplaatsen (`refreshStats`, `refreshStatsScreen`, `renderDoelenScreen`, `refreshHomeGoalsCard`, `computeGoalProgressPr`, `getCurrentValueForGoal`, `askCoachAboutGoal`, `getOneRM`, `estimatedOneRM`, de PR-badge-detectie tijdens het loggen, de daadwerkelijke PR-schrijfactie na een sessie, en `buildCtx()` voor de AI-coach) omgezet naar de nieuwe functies.
- `ensureExerciseGoalsLoaded()` ook toegevoegd aan `buildCtx()` (ontbrak nog) en `refreshHomeGoalsCard()` (een nieuw gevonden call-site, niet eerder gedekt).

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 206/206 (uit de cache-leak-fix) + 5 nieuwe tests (nieuwe gebruiker ziet niets, eigen PR/1RM correct, upsert overschrijft andere velden niet, nieuwe rij bij upsert, peakdoel wissen laat PR/1RM intact) = **211/211 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.19 → **v4.24.20**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42420`.

---

## v4.24.19 — 7 augustus 2026 (Kritieke fix — cross-account datalek via in-memory cache)
*Gevonden en bevestigd via een screenopname van de gebruiker: een compleet nieuw, nog nooit gebruikt account (maurice@medscan.nl) toonde bij Voortgang de 1RM-schattingen van het hoofdaccount op hetzelfde toestel.*

### Onderzoek (frame-voor-frame analyse van de meegestuurde schermopname)
Bevestigd: correct e-mailadres in Profiel, verse app-versie (v4.24.18, expliciet "Cache verversen" gedrukt), "Nog geen doelen" en "0/100 trainingen" correct leeg voor Doelen/Challenges. Maar op hetzelfde Voortgang-scherm: **"PR per herhaling" zei correct "Log sets om PR's te zien" (leeg), terwijl "Geschatte 1RM" direct eronder wél 95kg/80kg/80kg/85kg toonde** — exact de cijfers van het hoofdaccount. Dit contrast (twee componenten op één scherm, tegengestelde uitkomst) bewees dat het **geen RLS-/databaseprobleem** was — anders waren beide fout geweest — maar een client-side cache die niet werd geleegd.

### Grondoorzaak
`progExData` (de 1RM-cache achter "Geschatte 1RM") is een module-level JavaScript-variabele die **nooit werd gereset bij een accountwissel binnen dezelfde browsersessie** (deze app is een SPA — uitloggen/inloggen doet geen volledige page reload, dus in-memory variabelen blijven gewoon bestaan). De bestaande cross-account-bescherming (`resetPersonalCacheIfNewDeviceOwner`, sinds DEC-032) reset alleen `atleet`/`customTrainings`/`activeSport` — nooit uitgebreid toen er nieuwe caches bijkwamen.

### Onderzoek naar de volledige omvang
Bij het doorzoeken van alle vergelijkbare module-level caches bleken **minstens 10 andere** hetzelfde risico te lopen, waaronder recent toegevoegde: `estOneRMCache`, `repPRCache`, `goalsCache`, `programBlockExCache`, `exPickerRecentIds`, `vasteTrainingen` (+ laadvlag), `exercises` (+ laadvlag), **`favoriteExIds`/`exerciseGoals`** (de net gebouwde per-gebruiker favorieten/peakdoelen-caches uit Sprint 6.0.1 en de vorige fix — zelfde kwetsbaarheid, al bleek dit in de geteste sessie toevallig niet zichtbaar), `equipmentTypes`, `equipmentCatalog`.

### Fix
`resetPersonalCacheIfNewDeviceOwner()` reset nu alle 19 gevonden caches (10 databronnen + hun bijbehorende "al geladen"-vlaggen), zodat de eerstvolgende `ensureXLoaded()`-aanroep na een accountwissel gegarandeerd vers ophaalt in plaats van stale data te vertrouwen.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 203/203 (uit de peakdoel-fix) + 3 nieuwe tests (volledige resetlijst bevestigd, zelfde-gebruiker-geen-onnodige-reset, regressiebewaking tegen toekomstig vergeten caches) = **206/206 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.18 → **v4.24.19**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42419`.

### Resterend aandachtspunt
Dit patroon (nieuwe cache-variabele toegevoegd, vergeten aan de resetlijst toe te voegen) is nu twee keer voorgekomen (eerder ook al voor localStorage-sleutels, Sprint 5.9.3). Aanbeveling: bij het toevoegen van een nieuwe module-level cache in de toekomst, altijd expliciet controleren of deze ook hier moet worden opgenomen.

---

## v4.24.18 — 7 augustus 2026 (Kritieke fix — peakdoelen: gedeelde kolom → per-gebruiker tabel)
*Buiten het lopende sprintverband, op basis van een screenshot van de gebruiker die zijn eigen peakdoelen zag verschijnen en vroeg wat nodig was om te voorkomen dat nieuwe gebruikers dit zouden zien.*

### Het probleem (bevestigd, twee lagen)
1. **Hardcoded fallback:** `PEAK_FALLBACK` bevatte de exacte, persoonlijke streefgewichten van de ontwikkelaar voor 9 oefeningen, hardcoded in de broncode — hetzelfde patroon als de eerder opgeruimde RB1/RB2-bevindingen uit Sprint 5.6, maar toen gemist.
2. **Architectuur:** `peak_goal` stond als kolom op de **gedeelde** `exercises`-tabel. Omdat standaardoefeningen (Backsquat, Benchpress, etc.) voor iedereen dezelfde, gedeelde rij zijn, zag élke gebruiker — ook een gloednieuwe — het peakdoel dat één specifieke gebruiker er ooit op had ingesteld.

### Migratie (SQL, door de gebruiker zelf uitgevoerd na review — niet door Claude)
Nieuwe tabel `exercise_goals` (`user_id` + `exercise_id` + `peak_goal`, `UNIQUE(user_id, exercise_id)`, RLS met vier policies voor select/insert/update/delete op eigen rijen). 12 bestaande peakdoelen zijn eenmalig overgezet naar de eigen gebruiker-rij. De oude `exercises.peak_goal`-kolom blijft **bewust nog staan** (pas verwijderen in een latere, aparte stap, ná bevestiging dat alles werkt) — geen onomkeerbare stap in dezelfde migratie.

### App-code aangepast
- `PEAK_FALLBACK` volledig verwijderd.
- Nieuwe `exerciseGoals`-Map + `ensureExerciseGoalsLoaded()`, zelfde per-gebruiker-cache-patroon als `favoriteExIds` (Sprint 6.0.1). `peakGoalFor(exId)` leest nu hieruit i.p.v. de gedeelde kolom.
- `savePeakGoal()` schrijft nu naar `exercise_goals` (upsert bij een waarde, delete bij wissen) i.p.v. naar `exercises`.
- **Verder gevonden tijdens het doorzoeken op resterende `.peak_goal`-verwijzingen:** de Doelen-module (`computeGoalProgressPr`, de Doelen-renderlijst, en de AI-coach-samenvatting bij "vraag de coach over dit doel") gebruikte óók nog de gedeelde kolom voor PR-type doelen — dit was een breder lek dan aanvankelijk gezien (raakte ook Doelen, niet alleen Voortgang/Admin). Alle drie bijgewerkt naar `peakGoalFor()`.
- `ensureExerciseGoalsLoaded()` ingehaakt op app-start (fire-and-forget, zelfde patroon als favorieten) én expliciet in `refreshStatsScreen()`, `refreshStats()`, `refreshAdmin()` en `renderDoelenScreen()`, zodat elk render-pad de data heeft vóór het nodig is.
- `netlify/functions/delete-account.js`: `exercise_goals` toegevoegd aan de verwijderlijst.

### Getest
- `node --check` op alle 9 scriptblokken en op `delete-account.js`: OK.
- `logic_tests.js`: 199/199 (uit Sprint 6.0) + 4 nieuwe tests (nieuwe gebruiker ziet niets, eigen doel komt correct terug, twee gebruikers geen overlap, geen hardcoded fallback meer) = **203/203 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.17 → **v4.24.18**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42418`; `netlify/functions/delete-account.js`.

### Resterend punt
`exercises.peak_goal`-kolom staat nog in de database (bewust, zie boven) — kan in een volgende stap verwijderd worden zodra bevestigd is dat de nieuwe tabel overal correct werkt.

---

## v4.24.17 — 7 augustus 2026 (Sprint 6.0.5 — Navigatie Architectuur: dode routes opgeruimd)
*Onderdeel van Sprint 6.0. Uitsluitend 100% onbereikbare, zelf-gedocumenteerde legacy-schermen verwijderd — geen enkele actieve functionaliteit geraakt.*

### Gevonden en bevestigd
Van de 25 schermen in de app werden er (na uitsluiting van schermen die legitiem buiten `go()` om worden geactiveerd, zoals `s-auth`/`s-onboarding` vóór inloggen) twee gevonden die door **geen enkele code path** ooit bereikt worden: `s-train-schema` en `s-train-workouts`. Bevestigd via drie onafhankelijke checks: (1) geen letterlijke `go('s-train-schema')`/`go('s-train-workouts')`-aanroep in de hele codebase, (2) de enige dynamische route (`go('s-train-'+curT.toLowerCase())`) kan deze nooit produceren — `curT` neemt alleen 'A'/'B'/vaste-training-ID's/`custom_`-ID's aan, nooit 'schema' of 'workouts', (3) beide schermen documenteerden zelf al hun eigen overbodigheid: hun enige inhoud was een tekst die verwijst naar hun Sprint 5.1-opvolger "Mijn trainingen" (`s-train-mine`).

### Fix
Beide dode schermen volledig verwijderd. De modal ertussenin (`m-vt-naam`, nog actief gebruikt voor het toevoegen/hernoemen van een vaste training) en het opvolger-scherm `s-train-mine` zijn ongewijzigd gebleven.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- HTML div-balans van het hele bestand vóór/na vergeleken: exact 20 open- en 20 sluit-tags verwijderd (evenwichtig, geen structuur verstoord).
- `logic_tests.js`: 199/199 geslaagd, geen regressie.

### Gewijzigd
- `APP_VER` v4.24.16 → **v4.24.17**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42417`.

---

## v4.24.16 — 7 augustus 2026 (Sprint 6.0.2/6.0.3 — Domeinmodellen-bevinding + gedeelde Epley-formule)
*Onderdeel van Sprint 6.0, Enterprise Architecture & Data Foundation.*

### Werkpakket 6.0.2 — Domeinmodellen: bevinding, niet gefixt (te risicovol voor deze pas)
Het globale `exercises`-array (Supabase) gebruikt `.name` (Engels) voor de oefeningnaam; objecten uit de sessie-/trainingscontext (`TRAIN_CFG`, sessielog-samenvattingen) gebruiken `.naam` (Nederlands) voor hetzelfde concept — 28 vs. 9 vindplaatsen. Al minstens één plek in de code moest dit al defensief opvangen (`ex.naam||ex.name`). **Bewust niet aangepast:** een brede hernoeming raakt potentieel honderden regels zonder dat het volledige Supabase-schema hier inzichtelijk is — te groot regressierisico voor een losse stap. Opgenomen als hoofdbevinding voor het 6.0.8-adviesrapport.

### Werkpakket 6.0.3 — Businesslogica: gedeelde Epley-1RM-formule
De Epley-1RM-formule (`gewicht × (1 + reps/30)`) stond **letterlijk 7 keer los** in de code — één plek had dit zelf al erkend met de comment "zelfde formule/afronding als Stats-scherm". Nieuwe centrale functie `epley1RMRaw(kg,reps)`; de bestaande, afgeronde `epley1RM()` (met null-guards, al aanwezig maar nauwelijks gebruikt) hergebruikt 'm nu intern. Elke aanroeplocatie behield zijn **eigen afrondingskeuze** (sommige ronden meteen, sommige pas een uiteindelijke 'best'-waarde, sommige helemaal niet) — dat verschilt bewust per context en is dus geen duplicatie op zich; alleen de kale formule zelf is samengevoegd.

### Verificatie
Een losstaande simulatie bevestigde vooraf dat `epley1RMRaw()` voor 6 representatieve gevallen (incl. rand- en decimale gevallen) exact dezelfde uitkomst geeft als de oude inline-formule — 100% gedragsbehoud.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 196/196 (uit Sprint 6.0.1) + 3 nieuwe tests = **199/199 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.15 → **v4.24.16**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42416`.

---

## v4.24.15 — 7 augustus 2026 (Sprint 6.0.1 — Data Architectuur: favorieten samengevoegd)
*Onderdeel van Sprint 6.0, Enterprise Architecture & Data Foundation. Lost een sinds Sprint 5.9.3 bekende, tweemaal bewust uitgestelde bevinding op — nu wél in scope, want dit werkpakket vraagt letterlijk om "één duidelijke bron van waarheid" per gegevenssoort.*

### Probleem
Twee volledig gescheiden, nooit-gesynchroniseerde favorieten-systemen voor hetzelfde concept: `exercise_favorites` (Supabase, cross-device, gebruikt in de oefeningkiezer en de 1RM-statistieklijst) en `tk_lib_favs` (localStorage-only, gebruikt in het Bibliotheek-scherm). Een oefening favorieten vanuit de Bibliotheek toonde niet als favoriet elders in de app, en omgekeerd.

### Fix
- **Supabase (`exercise_favorites`) is nu de enige bron van waarheid.** `ExerciseCatalogService` (Bibliotheek-module) leest/schrijft niet langer een eigen lokale `_fav`-lijst, maar gebruikt de al bestaande, globale `favoriteExIds`/`toggleFavorite()`.
- `isFavorite()` blijft synchroon (leest de al-geladen `favoriteExIds`-Set — geen rendervertraging). `toggleFavorite()` is nu async (roept de bestaande Supabase-aanroep aan); de enige aanroeper (het favorietknopje in de detailweergave) is meegenomen naar `await`.
- **Eenmalige, veilige migratie** (`migrateLibraryFavoritesToSupabase()`): bestaande lokale Bibliotheek-favorieten worden overgezet naar Supabase zodra iemand na de update inlogt. De oude `tk_lib_favs`-sleutel wordt **uitsluitend opgeruimd als bevestigd is dat alles daadwerkelijk is overgezet** — bij een netwerkfout onderweg blijft de data staan voor een nieuwe poging bij de volgende app-load. Geen dataverlies mogelijk.
- Ingehaakt op app-start (`startAppAfterAuth`), zelfde fire-and-forget-patroon als de overige achtergrond-caches daar — laadt meteen ook `favoriteExIds` vroeg, ruim vóór een gebruiker bewust naar de Bibliotheek navigeert.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 192/192 (uit Sprint 5.9) + 4 nieuwe tests voor de migratielogica (niets te migreren, volledige migratie, geen dubbele overzetting bij overlap, data behouden bij mislukte overzetting) = **196/196 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.14 → **v4.24.15**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42415`.

---

## Sprint 5.9.8 — 7 augustus 2026 (Schaalbaarheidsanalyse) — geen codewijziging
*Onderdeel van Sprint 5.9. Zuiver analyserapport, geen implementatie — zie het volledige Sprint 5.9-eindrapport voor details.*

### Grootste bottlenecks bij schaalgroei (gerangschikt)
1. **Gedeelde `ANTHROPIC_API_KEY` in coach.js** — enige echte gedeelde-resource-bottleneck; wordt eerder een probleem dan de database.
2. **Ontbrekende paginering op de `gym-team.js`-ledenlijst-query** — geen huidig probleem, wel een onbegrensde resultaatset bij een hypothetisch zeer grote gym.
3. **Onbevestigde database-indexen** — geen toegang tot het Supabase-schema om dit te verifiëren vanuit deze omgeving.
4. **1,84 MB base64-posters** (Sprint 5.9.4) — wordt op grotere schaal een reële bandbreedtekostenpost.

### Sprint 5.9 — volledig afgerond
Zie het uitgebreide eindrapport (los gedeeld met de Product Owner) voor de complete samenvatting van alle 8 werkpakketten, vóór/na-metingen, en aanbevelingen voor Sprint 6.0.

---

## v4.24.14 — 7 augustus 2026 (Sprint 5.9.7 afronding — buildCtx() geparallelliseerd)
*Onderdeel van Sprint 5.9. Expliciet voorgelegd en akkoord gekregen vóór implementatie, gezien het risico op een subtiele fout in de afhankelijkheidsvolgorde van een kritieke functie. Exact dezelfde queries, dezelfde data, dezelfde prompt-inhoud — uitsluitend de gelijktijdigheid van ophalen is anders.*

### Probleem (in eigen woorden bevestigd: "de wachttijd is lang waardoor het geen vloeiend gesprek wordt")
`buildCtx()` deed 8-10 databasequery's **sequentieel** — elk wachtend op de vorige voordat de volgende begon — terwijl de meeste onderling onafhankelijk zijn (HRV, gewicht, lichaamscompositie en sessiegeschiedenis hebben geen relatie met elkaar).

### Fix
Hergestructureerd in twee parallelle rondes via `Promise.all()`:
- **Fase 1** (8 volledig onderlinge-onafhankelijke queries tegelijk): oefeningen laden, HRV, gewicht, lichaamscompositie, sessiegeschiedenis, vaste trainingen laden, pijn-samenvatting, condities-samenvatting.
- **Fase 2** (2 queries tegelijk, terecht wachtend op `vasteTrainingen` uit fase 1): "laatst gedane training per vaste training" en "meest recente sessie van een vaste training".
- Alle overige berekeningen (groepering, HRV-tekst, gewichtstekst, sportblok, sessiecontext) blijven pure, synchrone verwerking van de nu al beschikbare data — ongewijzigd.

### Verificatie (vóór livegang, gezien het risico)
Een losstaande simulatie (niet onderdeel van de reguliere testsuite — zie toelichting) met gemockte vertragingen per query bevestigde **twee dingen apart**:
1. **Functionele gelijkwaardigheid:** de oude sequentiële en de nieuwe parallelle orchestratie leverden, gevoed met identieke mock-data, byte-voor-byte identieke output (`exCtx`, `nextT`, `lastT`, HRV/gewicht/context-velden).
2. **Daadwerkelijke gelijktijdigheid:** alle 8 fase-1-queries startten binnen 0ms van elkaar (echt gelijktijdig, niet na elkaar). In het gesimuleerde scenario: 220ms (som van alle vertragingen, wat de oude versie minimaal zou kosten) → 60ms (nieuwe, parallelle versie) — een aanzienlijke, aantoonbare reductie in wachttijd vóór het AI-verzoek zelfs maar verstuurd wordt. Reële winst hangt af van daadwerkelijke netwerk-/Supabase-responstijden, niet gegarandeerd identiek aan dit gesimuleerde cijfer.

**Waarom geen nieuwe permanente test in `logic_tests.js`:** de berekeningslogica die deze orchestratie gebruikt (groepering per oefening, laatst-gedaan-bepaling) heeft al testdekking uit Sprint 5.8.1/5.9.1 — deze wijziging verandert alleen wannéér de queries lopen, niet wát er berekend wordt. Een genuine concurrency-test zou async/setTimeout-gebaseerde tests in het testbestand vereisen, wat de bestaande, bewust synchrone testvolgorde-conventie van dat bestand zou doorbreken (zie de les uit Sprint 5.8.2).

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 192/192 geslaagd, geen regressie.
- Losstaande simulatie (zie boven): functionele gelijkwaardigheid + daadwerkelijke gelijktijdigheid bevestigd.

### Gewijzigd
- `APP_VER` v4.24.13 → **v4.24.14**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42414`.

### Werkpakket 5.9.7 — volledig afgerond

---

## v4.24.13 — 7 augustus 2026 (Sprint 5.9.7 — AI Coach Performance, dode berekening)
*Onderdeel van Sprint 5.9. Uitsluitend prestaties/snelheid/kosten — de inhoud van de AI-coach-prompt is niet gewijzigd.*

### Gemeten: promptgrootte na Sprint 5.8.1's dataminimalisatie
- `SPORT_BLOCKS`: 15 sporten, 10.039 bytes totaal, maar `buildCtx()` stuurt al uitsluitend het blok van de **actieve** sport mee (~669 bytes gemiddeld) — al correct scoped, geen wijziging nodig.
- `hrvStr`/`hrvGuide`/blessure-/conditie-context: elk een eigen, niet-overlappende functie (ruwe data vs. interpretatie vs. gemelde pijn vs. vastgelegde condities) — geen inhoudelijke duplicatie gevonden.

### Gevonden en opgelost: dode berekening in buildCtx()
`const mf = mastersFactor(atleet?.leeftijd);` werd op elk AI-coach-bericht berekend, maar **nooit gebruikt** in de teruggegeven prompt-tekst — een overbodige functie-aanroep zonder enig effect op wat naar Anthropic gestuurd wordt. Verwijderd. Geen enkele wijziging aan de daadwerkelijke prompt-inhoud (de variabele deed toch al niets).

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 192/192 geslaagd, geen regressie.

### Gewijzigd
- `APP_VER` v4.24.12 → **v4.24.13**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42413`.

### Nog te voltooien binnen 5.9.7
Een grotere, waardevollere kansen: `buildCtx()` doet momenteel ~8-10 databasequery's **sequentieel** (elk wachtend op de vorige), terwijl de meeste onderling onafhankelijk zijn (HRV/gewicht/lichaamscompositie/sessiegeschiedenis hebben geen relatie met elkaar). Parallelliseren via `Promise.all()` zou de wachttijd vóórdat het AI-verzoek zelfs maar verstuurd wordt aanzienlijk kunnen verkorten — zelfde queries, zelfde data, zelfde prompt-inhoud, alleen sneller opgehaald. Dit raakt de kernstructuur van een kritieke functie; ik leg dit specifiek voor voordat ik het implementeer, gezien het risico op een subtiele fout in de afhankelijkheidsvolgorde.

---

## v4.24.12 — 7 augustus 2026 (Sprint 5.9.5 — Offline Betrouwbaarheid, kritieke fix)
*Onderdeel van Sprint 5.9. Uitsluitend een geverifieerde robuustheidsfix in de offline-synchronisatie — geen UX-wijziging, geen nieuwe functionaliteit.*

### Gevonden: één mislukt wachtrij-item blokkeerde de VOLLEDIGE synchronisatie, permanent
`flushOfflineQueue()` deed bij een serverfout op één item (`!r.ok` — bv. een validatiefout, of een verwijzing naar inmiddels verwijderde data) een `break`, waardoor **alle latere, op zichzelf staande wachtrij-items nooit meer geprobeerd werden** — ook niet bij een volgende sync-poging, want ze bleven achter hetzelfde blokkerende item staan. Dit raakt precies wat Werkpakket 5.9.5 expliciet vraagt te controleren: "dat trainingen nooit verloren gaan" en "dat synchronisatie robuust verloopt". Trainingen gingen niet *verloren* (ze bleven in de wachtrij staan), maar konden voor onbepaalde tijd onzichtbaar vast blijven zitten zonder ooit daadwerkelijk te synchroniseren.

### Fix
Onderscheid gemaakt tussen twee situaties die voorheen hetzelfde werden behandeld:
- **Serverfout op één item** (`!r.ok`) → dat ene item wordt overgeslagen (blijft in de wachtrij staan, zichtbaar/beheerbaar via het bestaande wachtrij-scherm), de rest van de wachtrij wordt gewoon geprobeerd.
- **Echte netwerkfout** (`catch`, daadwerkelijk weer offline) → de lus stopt terecht nog steeds meteen; verder proberen heeft dan sowieso geen zin.
- Nieuwe toast-melding als er items zijn overgeslagen, zodat de gebruiker weet dat er iets aandacht nodig heeft i.p.v. stille inactiviteit.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 188/188 (uit Sprint 5.9.4) + 4 nieuwe tests (alles-succesvol, serverfout-blokkeert-niet-meer, netwerkfout-stopt-terecht-wel, lege wachtrij) = **192/192 geslaagd**. De kern-regressietest bevestigt expliciet: bij een serverfout op item 2 van 3 worden items 1 én 3 alsnog gesynchroniseerd (was voorheen onmogelijk).

### Gewijzigd
- `APP_VER` v4.24.11 → **v4.24.12**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42412`.

---

## v4.24.11 — 7 augustus 2026 (Sprint 5.9.4 — Single-file Architectuur: analyse + adviesrapport)
*Onderdeel van Sprint 5.9. Expliciet géén grote architectuurrefactor deze sprint — uitsluitend één veilige, additieve optimalisatie geïmplementeerd; de rest is een objectief onderbouwd adviesrapport voor Sprint 6.x.*

### Gemeten: waar zit de 3,5 MB?
- `index.html` totaal: **3.561.114 bytes**.
- Ingebedde base64-posterafbeeldingen (206 stuks, MoveKit-bibliotheek): **1.928.538 bytes = 1,84 MB = 54,6% van het hele bestand.**
- Dit zijn dezelfde 206 posters die al eerder zijn geïdentificeerd voor migratie naar Supabase Storage (voorbereide SQL-migratie + importscript, wachtend op het aanmaken van de storage-bucket) — dit sprint-onderzoek bevestigt cijfermatig hoe groot de winst van die al geplande migratie zou zijn.

### Wél geïmplementeerd — veilige, additieve optimalisatie
`loading="lazy"` toegevoegd aan de YouTube-techniekvideo-thumbnails die per oefening in een trainingslijst verschijnen (`buildVideoMuscle` — kan meerdere keren per trainingsdag voorkomen). Puur browser-native, additief HTML-attribuut: geen gedragswijziging, geen refactor, alleen thumbnails die buiten beeld staan worden door de browser zelf uitgesteld geladen. (De oefeningenbibliotheek zelf had al een eigen, verfijnder IntersectionObserver-gebaseerd lazy-load-mechanisme — geen wijziging nodig.)

### Adviesrapport voor Sprint 6.x — NIET deze sprint geïmplementeerd (grote refactor)
1. **Base64-posters → Supabase Storage** (1,84 MB, 54,6% van het bestand). De grootste, reeds voorbereide winst. Vereist het daadwerkelijk aanmaken van de storage-bucket + uitvoeren van de bestaande migratie (Maurice's eigen actiepunt, los van deze sprint) — buiten scope van "geen grote architectuurherschrijving."
2. **`EXERCISE_ASSETS` wordt onvoorwaardelijk geparsed bij elke app-load**, ook voor gebruikers die de oefeningenbibliotheek nooit openen. Een echte lazy-load (pas ophalen bij eerste gebruik van de Bibliotheek) vereist dat de data als apart netwerk-resource beschikbaar is (dus dezelfde Storage-migratie als punt 1) — kan niet los daarvan.
3. **Single-file-architectuur zelf** (15.577 regels, 9 scriptblokken): modulair maken (aparte bestanden, dynamic imports) is een bewuste, nog niet genomen beslissing die aan een build-stap-keuze hangt (zie eerdere projectbeslissingen) — expliciet niet in deze sprint aan te raken.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 188/188 geslaagd, geen regressie.

### Gewijzigd
- `APP_VER` v4.24.10 → **v4.24.11**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42411`.

---

## v4.24.10 — 7 augustus 2026 (Sprint 5.9.3 — Browser Cache & Opslag)
*Onderdeel van Sprint 5.9. Uitsluitend geverifieerd dode opslag verwijderd — geen UX-wijziging, geen nieuwe functionaliteit.*

### Gecontroleerd: localStorage, sessionStorage, IndexedDB, Service Worker Cache
- **Cache-invalidering (Service Worker):** al correct — de `activate`-handler verwijdert bij elke nieuwe versie automatisch alle oude cache-namen (behalve de bewust stabiele video-cache). Geen wijziging nodig.
- **Onnodige polling/synchronisaties:** de drie `setInterval`-aanroepen in de app bleken uitsluitend lokale UI-klokken (trainingstimer, resttimer, guided-workout-resttimer) — geen enkele doet een netwerkverzoek. Geen polling-probleem gevonden.
- **Dode opslag, gevonden en opgeruimd:**
  - `tk_last_training` werd bij **elke afgeronde training** weggeschreven, maar wordt nergens in de codebase meer gelezen (de "volgende training"-logica leest sinds Sprint 5.9.1 uit Supabase). Write verwijderd.
  - `tk_rower` (enkelvoud) werd nergens ooit geschreven — de `getItem`-lookup gaf dus altijd `null` en viel altijd terug op `rowers[0]`. Vereenvoudigd naar direct `rowers[0]`, functioneel identiek, één overbodige lookup minder per app-load.

### Gevonden, bewust NIET aangepast: dubbele, losstaande favorieten-opslag
Er blijken **twee volledig gescheiden, nooit-gesynchroniseerde** favorieten-systemen te bestaan: `toggleFavorite()`/`exercise_favorites` (Supabase, gebruikt in de oefeningkiezer en de 1RM-statistieklijst) en `ExerciseCatalogService.toggleFavorite()`/`tk_lib_favs` (uitsluitend localStorage, gebruikt in het Bibliotheek-scherm). Een oefening favorieten vanuit de Bibliotheek toont dus niet als favoriet in de oefeningkiezer, en omgekeerd — en de Bibliotheek-favorieten zijn bovendien niet cross-device (alleen lokaal, verloren bij een nieuw toestel of cache-wissing).

Dit is een reële bevinding, maar **geen pure performance-optimalisatie**: de twee systemen samenvoegen betekent een keuze maken (welke set is leidend, hoe worden bestaande lokale Bibliotheek-favorieten gemigreerd) die zichtbaar gedrag verandert — dat valt buiten "geen UX-wijzigingen" voor déze sprint. Aanbevolen als een aparte bugfix-sprint (vergelijkbaar met Sprint 5.6), niet hier opgelost.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 188/188 geslaagd, geen regressie (uitsluitend dode code verwijderd, geen enkele functionele wijziging).

### Gewijzigd
- `APP_VER` v4.24.9 → **v4.24.10**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v42410`.

### Kleine aanvullende observatie (geen actie ondernomen)
`skierg_machines`/`assault_machines` localStorage-sleutels gebruiken nog geen `tk_`-prefix (gemist bij de Sprint 5.6.3-naamgevingsmigratie). Geen performance-impact, puur een naamgevingsinconsistentie — genoteerd voor een toekomstige opschoonronde, niet meegenomen in deze performance-sprint.

---

## v4.24.9 — 7 augustus 2026 (Sprint 5.9.2 — Rendering Performance, debounce zoekvelden)
*Onderdeel van Sprint 5.9. Expliciet voorgelegd en bevestigd vóór implementatie vanwege de "geen UX-wijzigingen"-grens — zie toelichting hieronder.*

### Gevonden
Beide zoekvelden van de oefeningenbibliotheek (hoofd-zoekveld én het "vergelijk oefeningen"-zoekveld) deden bij **elke toetsaanslag** een volledige her-render: de complete catalogus (~200+ oefeningen) doorzoeken, de hele resultatenlijst opnieuw als HTML opbouwen, en alle event-listeners herbinden — zonder debounce. Een al aanwezige cursor-positie-herstel-workaround in de code wees erop dat dit al eerder een bijwerking veroorzaakte.

### Afweging (expliciet voorgelegd, akkoord gekregen)
De voor de hand liggende fix — debouncen — introduceert strikt genomen een nieuwe, meetbare vertraging die er voorheen niet was. Voorgelegd met twee opties (debounce toevoegen, of niet aanpassen); gekozen voor **optie 1: debounce toevoegen**, met een vertraging (120ms) ruim onder de menselijke waarneembaarheidsgrens.

### Fix
Nieuwe gedeelde helper `_libDebouncedSearch()`: de cursor-positie wordt nog steeds **synchroon bij elke toetsaanslag** vastgelegd (geen enkel gedragsverschil daar), maar de dure her-render zelf wacht 120ms op typestilte. Bij snel typen (bv. 5 toetsaanslagen binnen 300ms) gaat dit van 5 volledige her-renders naar 1. Toegepast op beide zoekvelden (`lib-q` en `lib-cmp-q`).

### Gemeten (aantoonbaar, code-gebaseerd)
- Vóór: 1 volledige her-render per toetsaanslag (N toetsaanslagen = N her-renders).
- Ná: maximaal 1 her-render per 120ms-typepauze, ongeacht hoe snel getypt wordt.
- **Kanttekening:** dit is een structurele reductie in het AANTAL her-renders, geen live gemeten CPU-tijd (zie de kanttekening over meetbaarheid in het Sprint 5.9-analyserapport).

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 185/185 (uit Sprint 5.9.1) + 3 nieuwe tests voor het debounce-kerngedrag (alleen de laatste aanroep wint, geen opstapeling, normale trage interactie blijft ongewijzigd werken) = **188/188 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.8 → **v4.24.9**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4249`.

---

## v4.24.8 — 7 augustus 2026 (Sprint 5.9.1 — Database Performance, Programma/Voortgang)
*Onderdeel van Sprint 5.9. Uitsluitend een geverifieerde geneste N+1-fix — geen UX-wijziging, geen nieuwe functionaliteit, geen schemawijziging.*

### Gevonden: geneste N+1 in renderProgrammaList() / computeProgramProgress()
Precies het Voortgang/Programma-scherm dat de sprint expliciet noemt. Voor elk programma in de lijst: 1 query voor de blokken, en per **afgerond** blok daarbinnen nog eens 2 losse queries (oefeningen + sessies) om de RPE-afwijking te berekenen. Bij bv. 3 programma's van elk 8 weken met 12 afgeronde blokken totaal: 1 (programs) + 3 (blocks per programma) + 24 (2× per afgerond blok) = **28 queries** voor één scherm-load.

### Fix
- Alle programmablokken van alle programma's in **1 query** (`program_id=in.(...)`), client-side gegroepeerd per programma.
- Alle oefeningen en sessies van alle afgeronde blokken (over alle programma's heen) in **maximaal 2 query's** (`program_block_id=in.(...)` / `training_type=in.(...)`), client-side gegroepeerd per blok.
- Nieuwe pure functie `computeProgramProgressPure()` doet exact dezelfde berekening als de bestaande `computeProgramProgress()`, nu op de vooraf gegroepeerde data i.p.v. eigen live queries.
- `computeProgramProgress()` zelf blijft **ongewijzigd** en in gebruik voor het single-programma-pad (`heergenereerResterendeWeken` — een zeldzame, gebruiker-geïnitieerde actie, geen hot path, dus bewust niet meegenomen in deze fix).

### Gemeten (queryaantal, statisch tegen de code geverifieerd)
- Vóór: `1 + P + 2×(totaal afgeronde blokken over alle programma's)` — schaalt mee met zowel het aantal programma's als de voortgang daarbinnen. Voorbeeld hierboven: 28 queries.
- Ná: **maximaal 4 queries totaal**, ongeacht het aantal programma's of afgeronde blokken.
- Zelfde voorbeeld (3 programma's, 12 afgeronde blokken): 28 → 4 queries.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 182/182 (uit de vorige 5.9.1-fix) + 3 nieuwe tests (identieke uitkomst als het oude per-blok-pad, nul-staat zonder afgeronde blokken, geen crash bij ontbrekende RPE-data) = **185/185 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.7 → **v4.24.8**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4248`.

---

## v4.24.7 — 7 augustus 2026 (Sprint 5.9.1 — Database Performance, eerste fix)
*Onderdeel van Sprint 5.9, Enterprise Performance, Scalability & Production Readiness. Uitsluitend een geverifieerde N+1-fix — geen UX-wijziging, geen nieuwe functionaliteit, geen schemawijziging.*

### Gevonden: N+1-query in computeLastDoneMap()
Deed vóór deze fix N losse `sbGet`-aanroepen — één per vaste training — om te bepalen wanneer elke training voor het laatst gedaan is. Aangeroepen vanuit **3 plekken**, waarvan twee hot paths: `refreshHome()` (elke keer dat het Home-scherm ververst) en `buildCtx()` (elk AI-coach-bericht).

### Fix
Eén query (`training_type=in.(...)`), client-side gegroepeerd op de meest recente datum per training — zelfde patroon als de oefeningsgeschiedenis-fix uit Sprint 5.8.1. Identieke output (`map[trainingId] = laatste datum of null`), dus geen enkele aanroeper hoefde aangepast te worden.

### Gemeten (queryaantal, statisch tegen de code geverifieerd)
- Vóór: N queries per aanroep (N = aantal vaste trainingen van de gebruiker, doorgaans 2–6).
- Ná: **1 query** per aanroep, ongeacht N.
- Over 3 aanroeplocaties, waarvan 2 bij elke Home-load/AI-bericht: een aantoonbare, structurele reductie.

**Kanttekening bij metingen:** dit is een statische, code-geverifieerde queryaantal-reductie — geen live gemeten responstijd/CPU/geheugen (zie het bredere Sprint 5.9-analyserapport voor de volledige toelichting op wat wel en niet meetbaar is vanuit deze omgeving).

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 179/179 (uit Sprint 5.8) + 3 nieuwe tests (correcte groepering, lege historie, lege trainingslijst) = **182/182 geslaagd**. Test bevestigt identieke output-semantiek t.o.v. de oude per-training-loop.

### Gewijzigd
- `APP_VER` v4.24.6 → **v4.24.7**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4247`.

---

## Sprint 5.8.6 — 7 augustus 2026 (Security Audit, Privacy & AVG) — geen codewijziging
*Onderdeel van Sprint 5.8. Volledige audit van authenticatie, autorisatie, secrets, tokens en logging over alle server-side functies (`coach.js`, `gym-team.js`, `wearable-sync.js`, `delete-account.js`) en de client. Uitkomst: al goed beveiligd, geen wijziging nodig — hier gedocumenteerd voor traceerbaarheid.*

### Bevindingen
- **Authenticatie/autorisatie:** alle vier Netlify Functions verifiëren de JWT server-side bij Supabase Auth (nooit een client-aangeleverd user-id vertrouwd). `gym-team.js` controleert daarnaast `gym_role_level` server-side per actie én verifieert de coach-pincode server-side (SHA-256 tegen de database), niet alleen client-side.
- **Secrets/tokens:** geen hardcoded service-role-keys, API-keys of wachtwoorden. Alles uit `process.env`. De enige client-side sleutel is de Supabase publishable/anon key — per ontwerp veilig (RLS, niet geheimhouding, is de beveiligingslaag).
- **Logging:** geen enkele plek logt tokens, wachtwoorden of pincodes — uitsluitend generieke foutmeldingen (tabelnaam, HTTP-status).
- **`PIN_HASH`-observatie (Sprint 5.6.4), herbevestigd vanuit beveiligingsoogpunt:** de echte Team-acties lopen via `gym-team.js` met server-side rol- én pincode-verificatie; de client-side `PIN_HASH` geeft alleen toegang tot oefeningen-/uitrustingsbeheer (gedeelde catalogus, geen persoonlijke gezondheidsgegevens van andere leden). Geen kwetsbaarheid.
- **Ontwikkelaarsspecifieke informatie:** laatste volledige controle — niets resterend buiten de bewust-behouden migratiecode (die de oude `maurice_`-sleutelnamen nog even nodig heeft om te kunnen migreren).

### Conclusie
Geen codewijziging vereist. Geen `APP_VER`-bump.

---

## v4.24.6 — 7 augustus 2026 (Sprint 5.8.5 — Local Storage Audit, Privacy & AVG)
*Onderdeel van Sprint 5.8. Uitsluitend de cross-account cache-bescherming (DEC-032) — geen UX-herontwerp, geen nieuwe functionaliteit.*

### Gecontroleerd: localStorage, sessionStorage, IndexedDB, Service Worker Cache
- **sessionStorage:** geen enkel gebruik gevonden — niets te controleren.
- **Service Worker Cache:** al correct — `NO_CACHE_PATTERNS` sluit `supabase.co` en `api.anthropic.com` expliciet uit van caching; alleen statische app-shell-bestanden worden gecachet, nooit API-responses met persoonsgegevens. Geen wijziging nodig.
- **localStorage — kritieke bevinding:** de cross-account cache-bescherming (DEC-032, bedoeld om te voorkomen dat een volgende gebruiker op een gedeeld toestel de data van de vorige gebruiker ziet) wiste nog maar 5 sleutels + de dynamische 1RM-cache. Sinds die oorspronkelijke fix zijn er meerdere nieuwe persoonlijke datasets bijgekomen (guided workouts, workout builder, vaste-training-voortgang, favorieten, uitrusting-voorkeuren) die niet aan de lijst waren toegevoegd — exact hetzelfde lek als DEC-032 ooit oploste, nu weer deels open voor deze nieuwere features.
- **Extra bevinding:** `tk_ai_consent` (Sprint 5.8.2) stond ook niet in de lijst — een nieuwe gebruiker op hetzelfde toestel zou de AI-Coach-toestemming van de vorige gebruiker kunnen "erven" zonder zelf ooit gevraagd te zijn. Toestemming moet per gebruiker gelden.

### Fix
`PERSONAL_CACHE_KEYS` uitgebreid met alle huidige persoonlijke datasets: `tk_ai_consent`, `tk_gw_active/hist/log`, `tk_wb_draft/saved`, `tk_vt_meta`, `tk_lib_favs/recent/recentq`, `tk_plates`, `tk_rower(s)`, `tk_rest_default`.

### IndexedDB — reëel, bewust NIET automatisch opgelost risico
Bij onderzoek bleek `flushOfflineQueue()` elk item in de offline-queue te synchroniseren met de **huidige** sessie-token (`SB_H`), ongeacht wie het item oorspronkelijk queuede. Op een gedeeld toestel waar gebruiker A offline traint en vóór synchronisatie gebruiker B inlogt, zou A's trainingsdata bij synchronisatie onder B's account terecht kunnen komen (of, afhankelijk van RLS, de hele wachtrij blokkeren op de eerste mislukte match). Ik heb dit **niet** automatisch opgelost: de wachtrij simpelweg wissen bij een accountwissel voorkomt de privacy/integriteitskwestie, maar veroorzaakt gegarandeerd dataverlies van nog niet-gesynchroniseerde trainingen van gebruiker A — en "geen dataverlies" staat hoger in de productprioriteiten dan deze privacy-sprint. De juiste oplossing (bv. eerst proberen te synchroniseren onder de oude sessie vóórdat een nieuwe login wordt toegestaan) vereist een architectuurkeuze die buiten deze sprint valt. Expliciet voorgelegd, niet genegeerd.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 177/177 (uit Sprint 5.8.4) + 2 nieuwe tests (volledige sleutellijst wordt gewist; AI-consent erft niet over) = **179/179 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.5 → **v4.24.6**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4246`.

---

## Sprint 5.8.4 — 7 augustus 2026 (Account verwijderen geverifieerd, Privacy & AVG) — geen APP_VER-bump
*Onderdeel van Sprint 5.8. Uitsluitend `netlify/functions/delete-account.js` — index.html ongewijzigd deze deelstap.*

### Uitgangspunt
De bestaande verwijderprocedure bleek bij eerste analyse (zie Sprint 5.8-analyse) al goed gebouwd: server-side JWT-verificatie, expliciete tabellenlijst met correcte volgorde, aparte zorgvuldige behandeling van `exercises` (alleen personal-scope) en `users` (gym-lidmaatschap), en een `failedTables`-rapportage i.p.v. stil falen. Deze deelstap kruiste de tabellenlijst tegen alle daadwerkelijk in de app gebruikte Supabase-tabellen.

### Gevonden en opgelost
- **`goals`** en **`equipment_types`** ontbraken — beide zijn hetzelfde per-gebruiker-configureerbare patroon als het al wél behandelde `athlete_conditions` (user_id-scoped, geen shared/gym-content). Toegevoegd aan de standaard verwijderlijst.
- **`content_shares`**: gebruiker als *ontvanger* (kolom `shared_with`, bevestigd in de client-code) wordt nu meegenomen.

### Bewust NIET aangepast (onvoldoende zekerheid vanuit de front-end code)
- **`content_shares`, de delende partij**: de kolomnaam die de oorspronkelijke deler identificeert staat niet expliciet in de client-insert (waarschijnlijk een server-side `DEFAULT auth.uid()`-kolom). Een gok hier zou een verkeerde/no-op query kunnen opleveren die ten onrechte succes suggereert — bewust niet geraden.
- **`equipment_catalog`**: kan zowel persoonlijke als gym-gedeelde content bevatten (zelfde ambiguïteit als `exercises`, dat daarom al een aparte personal-scope-behandeling heeft). Zonder zicht op het exacte schema/de RLS-policies kan ik niet garanderen dat een blanket-delete niet ook gedeelde gym-content van andere leden zou raken.
- **`exercise_equipment`**: koppeltabel aan `exercise_id`; onduidelijk of er een `ON DELETE CASCADE` vanuit `exercises` bestaat.

Deze drie zijn een reëel, nog openstaand compliance-risico (mogelijk wees-data na accountverwijdering) — expliciet voor de Product Owner, niet stilzwijgend genegeerd.

### Getest
- `node --check` op `delete-account.js`: OK.
- **Beperking:** dit is een server-side Netlify Function; ik kan geen end-to-end verwijdertest tegen de live Supabase-database uitvoeren vanuit deze sandbox. Verificatie is beperkt tot syntaxcontrole en logische inspectie (kolomnamen gecontroleerd tegen daadwerkelijk client-side gebruik).

---

## v4.24.5 — 7 augustus 2026 (Sprint 5.8.3 — Privacyverklaring, Privacy & AVG)
*Onderdeel van Sprint 5.8. Uitsluitend tekst op de bestaande Privacy- en Help-schermen — geen UX-herontwerp, geen nieuwe schermen, geen nieuwe functionaliteit.*

### Belangrijke kanttekening
Claude is geen jurist. Deze deelstap maakt de bestaande Privacy-pagina feitelijk volledig en tegen de code geverifieerd, en vervangt losse placeholders — het levert geen door een jurist opgestelde, AVG-gecertificeerde privacyverklaring. Dat blijft expliciet zo vermeld op de pagina zelf.

### Bevindingen
- Privacy-pagina bevatte een expliciete `[PLACEHOLDER — juridische privacyverklaring]`.
- Help-pagina bevatte twee placeholders: een licentie-/dienstenoverzicht en een contact-/feedbackkanaal.
- Geen van beide pagina's noemde de daadwerkelijk gebruikte derde partijen, de afwezigheid van een automatische bewaartermijn, of de al bestaande gebruikersrechten (export, rectificatie) expliciet.

### Fix
- **Privacy-pagina:** twee nieuwe kaarten toegevoegd — **"Derde partijen"** (Supabase, Netlify, Anthropic, Google/Fitbit, elk met een concrete, geverifieerde beschrijving) en **"Jouw rechten"** (inzage &amp; dataportabiliteit via het al bestaande exportmenu — CSV en volledige JSON-backup, ontdekt tijdens verificatie —, rectificatie, verwijdering, toestemming intrekken). "Bewaartermijn" eerlijk gemaakt: er is geen automatische bewaartermijn, data blijft bestaan tot handmatige accountverwijdering (geen verzonnen bewaartermijn). De placeholder-disclaimer vervangen door een preciezere, minder alarmerende maar nog steeds eerlijke "geen juridisch advies"-tekst.
- **Help-pagina:** het licentie-/dienstenoverzicht ingevuld met de daadwerkelijk gebruikte diensten (dezelfde vier als op de Privacy-pagina).
- **Bewust NIET ingevuld:** het contact-/feedbackkanaal. Er is geen echt e-mailadres of formulier bekend in de projectdocumentatie — een placeholder verzinnen zou gebruikers een niet-werkend of onjuist kanaal voorspiegelen. Dit blijft open staan voor de Product Owner.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- Div-balans van het gewijzigde Privacy-scherm gecontroleerd (36/36).
- `logic_tests.js`: 177/177 geslaagd (geen regressie — uitsluitend tekstwijzigingen, geen nieuwe rekenlogica).

### Gewijzigd
- `APP_VER` v4.24.4 → **v4.24.5**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4245`.

### Resterend compliance-risico
Zoals op de pagina zelf vermeld: dit is geen juridisch gecertificeerde privacyverklaring. Vereist alsnog daadwerkelijke juridische beoordeling vóór een publieke/Store-release.

---

## v4.24.4 — 7 augustus 2026 (Sprint 5.8.2 — Toestemmingsflow AI Coach, Privacy & AVG)
*Onderdeel van Sprint 5.8. Uitsluitend een privacy-gate om bestaande functionaliteit — geen nieuwe AI-functionaliteit, geen UX-herontwerp, geen nieuwe schermen (hergebruikt bestaande modal- en toggle-mechanismen).*

### Bevinding
Er bestond geen enkele toestemmingsflow voor de AI Coach: deze was standaard actief zodra iemand inlogde, zonder ja/nee-keuze, zonder mogelijkheid te weigeren of later te wijzigen.

### Fix
- **`ensureAiConsent()`** (nieuw): tri-state opgeslagen in `tk_ai_consent` (nooit gevraagd / toegestaan / geweigerd). Bij het allereerste gebruik van de AI Coach verschijnt eenmalig een duidelijke vraag — hergebruikt de al bestaande `confirmModal()` (hetzelfde mechanisme als bijvoorbeeld bij accountverwijdering) — die expliciet benoemt wélke gegevens gedeeld worden (HRV, slaap, gewicht, lichaamssamenstelling, trainingsgeschiedenis, eventueel vastgelegde condities) en dat dit naar Anthropic gaat.
- **`sendMsg()`** aangepast: roept eerst `ensureAiConsent()` aan. Bij weigering wordt `buildCtx()` — en dus de hele Anthropic-aanroep — helemaal niet uitgevoerd; de gebruiker krijgt een duidelijke melding met verwijzing naar Instellingen → Privacy.
- **Privacy-scherm** (bestaand scherm, geen nieuw scherm): AI-coach-kaart uitgebreid met een toggle (`sw-ai-consent`, zelfde toggle-component als de bestaande meldingeninstellingen) waarmee de keuze op elk moment gewijzigd kan worden. Tekst iets preciezer gemaakt: de gegevens bereiken de AI-leverancier wél (via een server-side koppeling), niet "nooit" zoals de eerdere formulering suggereerde.
- Privacy-by-default: vóór een expliciete keuze staat de toggle uit en wordt de AI Coach niet gebruikt.

### Getest
- `node --check` op alle 9 scriptblokken: OK. HTML div-balans van het gewijzigde Privacy-scherm gecontroleerd (28/28).
- `logic_tests.js`: 172/172 (uit Sprint 5.8.1) + 5 nieuwe tests voor de consent-gate-logica (eenmalig vragen, nooit opnieuw vragen na een keuze, wijziging via Instellingen wordt gerespecteerd) = **177/177 geslaagd**.

### Gewijzigd
- `APP_VER` v4.24.3 → **v4.24.4**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4244`.

---

## v4.24.3 — 7 augustus 2026 (Sprint 5.8.1 afronding — trainingsgeschiedenis geminimaliseerd)
*Onderdeel van Sprint 5.8. Uitsluitend buildCtx() — geen UX-herontwerp, geen nieuwe AI-functionaliteit.*

### Opgelost: trainingsgeschiedenis in de AI-prompt was de volledige catalogus, elk bericht
`buildCtx()` deed voorheen een `sbGet`-aanroep **per oefening in de volledige catalogus** (potentieel honderden aanroepen per chatbericht) en stuurde zo bij elk bericht de complete trainingsgeschiedenis van élke ooit gelogde oefening naar Anthropic — ongeacht relevantie voor het huidige gesprek. Dit was zowel een resterend dataminimalisatie-punt (Werkpakket 5.8.1) als een performance-issue (N+1-patroon, al eerder gesignaleerd in het auditrapport).

**Fix:**
- **Actieve training loopt:** één query, gescoped op precies de oefeningen van díe training (`exercise_id=in.(...)`) — geen tijd-cutoff hierop, om te voorkomen dat net-iets-oudere geschiedenis van exact wat je nu doet wegvalt.
- **Geen actieve training (algemeen gesprek):** één query over een 30-dagen-venster (zelfde conventie als de bestaande `getRecentPainSummary()`), i.p.v. de volledige historie van alle oefeningen ooit.
- In beide gevallen: één databaseverzoek in plaats van honderden, en uitsluitend gegevens die daadwerkelijk relevant zijn voor het gesprek.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 169/169 (uit eerdere 5.8.1-deelstap) + 3 nieuwe tests voor de groepeer-/scope-logica = **172/172 geslaagd**. Expliciet getest: oefeningen buiten de actieve training worden niet meegestuurd; max. 2 sessies per oefening; lege scope geeft geen crash.

### Gewijzigd
- `APP_VER` v4.24.2 → **v4.24.3**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4243`.

### Werkpakket 5.8.1 — volledig afgerond
Beide onderdelen (persoonlijk medisch protocol verwijderd + trainingsgeschiedenis geminimaliseerd) zijn nu live.

---

## v4.24.2 — 7 augustus 2026 (Sprint 5.8.1 — AI Coach Privacy: dataminimalisatie, Privacy & AVG)
*Onderdeel van Sprint 5.8. Uitsluitend de AI-coach-systeemprompt (buildCtx) — geen UX-herontwerp, geen nieuwe AI-functionaliteit, geen databasewijziging.*

### Kritieke bevinding en fix: hardcoded persoonlijk medisch protocol verwijderd
Bij de privacy-inventarisatie (Werkpakket 5.8.1: "welke gegevens gaan naar Anthropic") bleek de AI-systeemprompt een **hardcoded, universeel-verstuurd persoonlijk medisch protocol** te bevatten — voor élke gebruiker van élke gym, niet alleen de oorspronkelijke ontwikkelaar:
> *"RHR ≤58 bpm = goed herstel... Post-sessie: 8-min lymfedrainage altijd. Lymphedema voeten: dagelijks variabel."*

Dit was zowel feitelijk onjuist voor alle andere gebruikers als een blootstelling van de gezondheidsgegevens van de ontwikkelaar in gedeelde productiecode (RB1-achtige single-user-hardcoding, gemist bij Sprint 5.6 omdat het verstopt zat in een grote tekstblob i.p.v. een losse variabele).

**Fix (op instructie van de Product Owner):** de app had al een volledig bestaande, per-gebruiker functionaliteit hiervoor die de AI-coach alleen nooit raadpleegde — de `athlete_conditions`-tabel (RLS-gescoped, met een eigen beheerscherm "Condities" in Instellingen). Nieuwe functie `getActiveConditionsSummary()` haalt nu bij elk chatbericht **uitsluitend de door de ingelogde gebruiker zelf vastgelegde condities** op en stuurt die (en niets anders) mee. Een gebruiker zonder vastgelegde condities krijgt geen enkel conditie-specifiek protocol meegestuurd — geen aannames, geen fallback.

### Extra: HRV-tekst in de AI-prompt afgestemd op Sprint 5.7.1
De vaste, verouderde absolute HRV-drempeltekst (24/18/14 ms) in de prompt was **niet meegenomen** toen Sprint 5.7.1 de HRV-engine zelf al naar een persoonlijke-baseline-methode omzette — de AI kreeg dus nog steeds de oude, wetenschappelijk achterhaalde instructie. Nu vervangen door een dynamische `hrvGuide`-tekst die de daadwerkelijke `hrvDagFactorPersonal()`-classificatie van de gebruiker beschrijft (referentiefase / voorlopige of volledige eigen baseline), inclusief een correcte 7-daagse rollend-gemiddelde-berekening (hergebruik van `hrvRollingRecent()` i.p.v. een ad-hoc gemiddelde over de nu bredere data-fetch).

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 162/162 (uit Sprint 5.7) + 7 nieuwe tests voor de conditie-samenvatting en HRV-gids-tekst = **169/169 geslaagd**. Expliciete test bevestigt: geen enkele testcase van het oude protocol (RHR/lymfedrainage) meer aanwezig in de nieuwe tekst.

### Gewijzigd
- `APP_VER` v4.24.1 → **v4.24.2**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4242`.

### Nog open binnen Werkpakket 5.8.1
Trainingsgeschiedenis in `buildCtx()` itereert nog over de **volledige oefeningencatalogus** (een sbGet-call per oefening, elk bericht) i.p.v. beperkt te blijven tot wat relevant is — dit is zowel een resterend dataminimalisatie-punt als een performance-issue. Apart op te pakken binnen 5.8.1, nog niet in deze deelstap gedaan.

---

## Sprint 5.7.3–5.7.6 — 7 augustus 2026 (Personalisatie-consistentie, terminologie, validatie) — geen versiebump
*Afronding van Sprint 5.7, Scientific Integrity & Personalisation Engine. 5.7.3-5.7.5 leverden geen codewijziging op (verificatie bevestigde bestaande consistentie); 5.7.6 voegt permanente testdekking toe.*

### 5.7.3 — Personalisatie Fase1→2→3, onderzocht
Kracht (1RM-ratiomotor) bleek al vóór Sprint 5.7 volledig conform (`RATIO_MIN_OBS`, betrouwbaarheid Laag/Middel/Hoog, bron eigen data/algemene richtlijn). HRV/dagfactor (nieuw in 5.7.1) volgt hetzelfde patroon met eigen, domein-passende terminologie. Herstel blijft bewust Fase1-only (5.7.2-besluit). Trainingsadvies erft de fase automatisch via de bestaande datastroom. Geen wijziging nodig.

### 5.7.4 + 5.7.5 — Referentie/persoonlijk/gemeten & transparantie, onderzocht
Cold-start-predictor ("Startschatting: ~X kg"), 1RM-ratiovergelijking (werkelijk vs. verwacht + bron + betrouwbaarheid) en de HRV/herstel-transparantie uit 5.7.1/5.7.2 bleken de belangrijkste cijferweergaven al correct te labelen. Geen medische claims of absolute gezondheidsuitspraken aangetroffen. De compacte "Gereedheid"-tegel in de hero blijft bewust een kaal cijfer (toelichting zit al één tik verderop in "Waarom vandaag?") — dat aanpassen zou de vaste stat-tegel-layout breken (UX-herontwerp, niet toegestaan). Geen wijziging nodig.

### 5.7.6 — Validatiematrix
Nieuw permanent testblok: volledige keten (HRV-baseline → dagfactor → clip) doorlopen voor alle door de sprint gevraagde persona's — nieuwe gebruiker, weinig historie, ervaren gebruiker met volledige baseline, veel trainingsdata (60 metingen), ontbrekende HRV, ontbrekende slaap, ontbrekend lichaamsgewicht, en een gecombineerd scenario dat bevestigt dat de dagfactor in élke combinatie binnen de 0,85–1,05-band blijft en nooit NaN oplevert.

### Getest
`logic_tests.js`: 154/154 (uit 5.7.1/5.7.2) + 8 nieuwe validatiematrix-tests = **162/162 geslaagd**. `index.html` ongewijzigd deze deelstap (9/9 scriptblokken syntax-OK, ter bevestiging opnieuw gecontroleerd).

### Sprint 5.7 — volledig afgerond
| Werkpakket | Resultaat |
|---|---|
| 5.7.1 HRV-baseline | Geïmplementeerd, live (v4.24.0) |
| 5.7.2 Herstelmodel-transparantie | Geïmplementeerd, live (v4.24.1) |
| 5.7.3 Personalisatie-consistentie | Onderzocht, al consistent — geen wijziging |
| 5.7.4 Referentie/persoonlijk/gemeten | Onderzocht, al consistent — geen wijziging |
| 5.7.5 Transparantie | Onderzocht, al gedekt door 5.7.1/5.7.2 |
| 5.7.6 Validatie | 8 nieuwe tests, 162/162 geslaagd |

---

## v4.24.1 — 7 augustus 2026 (Sprint 5.7.2 — Herstelmodel-transparantie, Scientific Integrity & Personalisation Engine)
*Onderdeel van Sprint 5.7. Uitsluitend transparantie/bronvermelding — geen wijziging aan de herstel-rekenlogica zelf, geen UX-herontwerp, geen nieuwe schermen.*

### Bewuste scope-beslissing
De 48/60/72u-basiswaarden en de RPE-multiplier (`MUSCLE_RECOVERY_HOURS`, `rpeMultiplier`) zijn **niet** herschreven. Een echte fysiologische personalisatie van hersteltijden vereist nieuwe, nu niet vastgelegde signalen en een zelfstandig te ontwerpen algoritme — dat hoort niet thuis onder een "waar mogelijk"-instructie zonder expliciet akkoord op de exacte methode. Voorgesteld en uitgevoerd: transparantie over wat het model wél en niet is. Personalisatie van het herstelmodel zelf blijft een aanbeveling voor een latere sprint.

### Wat wél is aangepast
- Lichaam-tab (per-spiergroep-kaarten): vaste, altijd zichtbare bronregel toegevoegd — *"Vuistregel (48–72u, RPE-afhankelijk) — geen gemeten fysiologische waarde"*.
- "Waarom vandaag?"-paneel (beide bestaande render-paden: de klassieke `dagfactor-detail`-uitklap én de nieuwere v43-hero-uitklap) tonen nu dezelfde disclaimer zodra er spierherstel-percentages worden getoond.
- HRV-baseline-transparantie uit Sprint 5.7.1 bleek via `dagfactorUitleg()` al automatisch door te werken naar beide "Waarom vandaag?"-paden — geen aparte wijziging nodig.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: 154/154 geslaagd (geen regressie — er is geen rekenlogica gewijzigd, alleen weergavetekst).

### Gewijzigd (versienummers)
- `APP_VER` v4.24.0 → **v4.24.1**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4241`.

---

## v4.24.0 — 7 augustus 2026 (Sprint 5.7.1 — HRV-baseline normaliseren, Scientific Integrity & Personalisation Engine)
*Onderdeel van Sprint 5.7, n.a.v. Enterprise Audit & Scientific Integrity Review v1.0 (KRITIEK #3: "HRV op absolute drempels zonder persoonlijke baseline"). Uitsluitend de HRV-/dagfactor-rekenmotor — geen UX-herontwerp, geen nieuwe schermen, geen databasewijziging, geen AI Coach-uitbreiding.*

### Wetenschappelijke onderbouwing
HRV-classificatie gebruikte vaste absolute ms-drempels (24/18/14 ms), ongeacht wie de gebruiker is. Vervangen door de **Plews/Buchheit "Smallest Worthwhile Change" (SWC)-methode**, gangbaar in de sportwetenschappelijke HRV-literatuur:
- Ln-RMSSD-transformatie voor statistische stabiliteit (Frontiers in Sports & Active Living, 2025, DOI 10.3389/fspor.2025.1578478).
- 7-daags rollend gemiddelde t.o.v. een persoonlijke SWC (gemiddelde ± 0,5×SD), berekend uit de eigen historische HRV-data van de gebruiker.
- Baselineperiode: **<14 dagen = referentiefase** (geen persoonlijke claim mogelijk), **≥14 dagen = voorlopige baseline**, **≥28 dagen = volledige/stabiele baseline** — drie onafhankelijke, convergerende bronnen (PMC9518028; TrainingPeaks/Kiviniemi-cyclistenstudie; athletedata.health 2026).
- Apart ernst-signaal bij **≥15% daling** t.o.v. het eigen rollend gemiddelde (athletedata.health, 2026).
- **Leeftijd is bewust géén aparte correctiefactor**: de literatuur (o.a. PMC11746954, masters- vs. jonge wielrenners) bevestigt dat absolute HRV weliswaar met leeftijd daalt, maar dat een persoonlijke-baseline-methode dit al automatisch opvangt — een aparte leeftijdscorrectie zou dubbel corrigeren. Losstaand van de bestaande `mastersFactor()` (IPF-krachtstandaarden), die een andere wetenschappelijke context betreft en hier niet is hergebruikt/vermengd.

### Gewijzigd
- Nieuwe functies: `hrvBaseline()`, `hrvRollingRecent()`, `hrvStPersonal()`, `hrvDagFactorPersonal()`.
- `dagfactor()` ontvangt nu een HRV-classificatie-object i.p.v. de losse hrv-ms-waarde (kernformule — slaap-/cyclusfactor, clip 0,85–1,05 — ongewijzigd). Alle 6 aanroeplocaties in de app bijgewerkt (bredere historie-fetch i.p.v. de vorige `limit=1`).
- "Waarom vandaag?"-paneel (bestaand, geen nieuw scherm) toont nu expliciet of de HRV-beoordeling in de referentiefase zit, op een voorlopige, of op een volledige eigen baseline berust (Werkpakket 5.7.4/5.7.5 — nooit meer een gemeten claim suggereren zonder genoeg eigen data).
- Kleine RB1-nazorg (buiten Sprint 5.7, onderweg tegengekomen): laatste resterende "Maurice"-verwijzingen in `logic_tests.js` (bestandsheader, twee testlabels) geneutraliseerd — geen testlogica gewijzigd.

### Getest
- `node --check` op alle 9 scriptblokken: OK.
- `logic_tests.js`: twee verouderde testblokken (absolute HRV-drempels, oude `dagfactor()`-signatuur) volledig herschreven; 11 nieuwe HRV-baseline-tests + 6 herschreven dagfactor-tests, met vooraf numeriek doorgerekende verwachtingswaarden (geen giswerk). **154/154 geslaagd.**
- Getest: referentiefase (n<4 of <14 dagen), voorlopige baseline (≥14 dagen), volledige baseline (≥28 dagen), stabiele HRV, milde daling (binnen SWC-marge), sterke daling (≥15%), volledig lege historie (geen crash).

### Gewijzigd (versienummers)
- `APP_VER` v4.23.3 → **v4.24.0** (minor i.p.v. patch — kernrekenmotor, niet louter een bugfix); `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4240`.

### Resterende aandachtspunten voor Sprint 5.7 (5.7.2 t/m 5.7.6)
Nog niet uitgevoerd: herstelmodel-transparantie (5.7.2 — voorstel: geen algoritmewijziging aan de 48/60/72u-basiswaarden zelf, wel bron-/disclaimertekst, ter bevestiging), personalisatie-consistentie fase1→2→3 buiten HRV (5.7.3), terminologie-consistentie referentie/persoonlijk/gemeten op resterende schermen (5.7.4), bredere transparantie-toelichtingen (5.7.5), volledige validatiematrix (5.7.6).

---

## Sprint 5.6.4 — 7 augustus 2026 (Controle op verborgen ontwikkelaarsdata, Release Blocker 6) — geen versiebump
*Onderdeel van Sprint 5.6, n.a.v. Enterprise Audit & Scientific Integrity Review v1.0. Uitsluitend onderzoek — geen codewijziging in deze deelstap.*

### Onderzocht (RB6): testaccounts, testdata, debugwaarden, verborgen demo's, feature flags, oude comments
- Geen testaccounts, hardcoded testdata, feature-flags, `TODO`/`FIXME`/`HACK`-markers, hardcoded credentials of `console.log`-statements aangetroffen.
- Twee bevindingen onderzocht en **bewust ongewijzigd gelaten**, met reden:
  1. **Debug-informatie-scherm** (Instellingen → toont app-versie + eerste 60 tekens van de user-agent van het eigen toestel). Audit classificeert dit al als LAAG. Dit is een expliciet gelabeld ("Debuginformatie"), gebruikersgerichte troubleshooting-functie die alléén het eigen toestel van de gebruiker aan zichzelf toont — geen verborgen ontwikkelaarsfunctie, geen data die het toestel verlaat. Niet verwijderd.
  2. **`PIN_HASH`-constante** (app-lock-pincode + admin-scherm-fallback wanneer de rol-check offline/onbekend is). Bij nader onderzoek: dit is **gedocumenteerde, opzettelijke functionaliteit** (zie bestaande comment: "Team gebruikt bewust nog steeds altijd de gedeelde pincode — extra beveiligingslaag boven op de rol-check"), geen verborgen backdoor. De daadwerkelijke Beheer-acties lopen apart via een server-side rolcheck (`/.netlify/functions/gym-team`). **Observatie voor de Product Owner** (geen wijziging uitgevoerd, buiten scope van een opschoon-sprint): dezelfde PIN-hash bedient zowel de persoonlijke app-lock als de Beheer-scherm-fallback; een 4-cijferige pincode-hash is met browser-devtools binnen milliseconden te brute-forcen. Dit is een architectuurkeuze, geen ontwikkelaars-hardcoding — een eventuele aanscherping (bv. losse geheimen, of alléén server-side gate) is een bewuste beveiligingsbeslissing die apart gepland moet worden, niet iets om terloops in een cleanup-sprint aan te passen.

### Conclusie
Geen codewijziging nodig — de codebase bevatte geen onveilig-te-laten verborgen ontwikkelaarsartefacten binnen RB6's scope. Geen `APP_VER`-bump.

---

## v4.23.3 — 7 augustus 2026 (Sprint 5.6.3 — Namespace-migratie & ontwikkelaarscomments, Release Blocker 1+5)
*Onderdeel van Sprint 5.6, n.a.v. Enterprise Audit & Scientific Integrity Review v1.0. Uitsluitend namespace/comments — geen UX-herontwerp, geen nieuwe functionaliteit, geen databasewijziging.*

### Opgelost — Release Blocker 1: single-user-erfenis in de kern
- Drie ontwikkelaars-specifieke comments geneutraliseerd (technische inhoud behouden, persoonlijke naamsverwijzing verwijderd): `mastersFactor()`-leeftijdscomment, de sport-blueprint-toelichting, en de DEC-032-bug-postmortem.
- Gedownload backupbestand heette `maurice_backup_....json` (zichtbaar voor élke gebruiker in hun eigen downloadmap) → `trainingskompas_backup_....json`.

### Opgelost — Release Blocker 5: localStorage-namespace opgeschoond
- Alle 20 vaste `maurice_*`-localStorage-sleutels + de dynamische `maurice_1rm_<oefening>`-sleutel hernoemd naar de **al bestaande** `tk_*`-conventie (dezelfde die `tk_wb_*`, `tk_gw_*`, `tk_lib_*` en `tk_vt_meta` al gebruiken — geen nieuwe naamgevingsstijl geïntroduceerd).
- **Automatische, eenmalige migratie** toegevoegd als allereerste code in het document (vóór alle overige scripts, incl. de thema-toepassing): elke oude sleutel wordt gelezen, onder de nieuwe naam teruggeschreven, en pas dán verwijderd. Draait precies één keer per device (`tk_ns_migrated`-vlag), faalt stil bij afwezige localStorage (privémodus) i.p.v. te crashen.
- **Bewust buiten scope:** de IndexedDB-databasenaam van de offline-sync-queue (`OFFLINE_DB_NAME`) blijft `maurice_offline`. Een live IndexedDB-rename vereist het asynchroon overzetten van alle records i.p.v. een synchrone key-copy, en raakt in het slechtste geval nog niet-gesynchroniseerde trainingssessies. Dat risico weegt niet op tegen de cosmetische winst — kandidaat voor een aparte, specifiek geteste migratie-sprint.

### Getest
- `node --check` op alle 9 scriptblokken (was 8 — de migratie is een nieuw, vroeg script): OK.
- `logic_tests.js`: 147/147 (uit 5.6.1+5.6.2) + 4 nieuwe tests = **151/151 geslaagd**.
- Losse, uitgebreide migratiesimulatie (19 scenario's, buiten de reguliere suite gedraaid ter extra zekerheid vóór opname): realistisch bestaand profiel (atleetgegevens, 1RM's, thema, onboarding-status, roeier-instellingen, meldingsvoorkeuren) volledig en correct gemigreerd; nieuwe gebruiker zonder oude data blijft schoon; migratie is idempotent (een tweede load overschrijft nooit opnieuw); niet-gerelateerde bestaande `tk_*`-sleutels (andere features) blijven ongemoeid; privémodus/localStorage-uitval crasht niet.
- Expliciet gecontroleerd: **geen enkele resterende `maurice_`-verwijzing** buiten de migratiecode zelf (die de oude namen bewust nog even nodig heeft) en de bewust uitgezonderde `OFFLINE_DB_NAME`.

### Gewijzigd
- `APP_VER` v4.23.2 → **v4.23.3**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4233` / `trainingskompas-static-v4233`.

---

## v4.23.2 — 7 augustus 2026 (Sprint 5.6.2 — Nieuwe-gebruiker-eerlijkheid, Release Blocker 4)
*Onderdeel van Sprint 5.6, n.a.v. Enterprise Audit & Scientific Integrity Review v1.0. Uitsluitend bestaande tekst-/filterlogica gecorrigeerd — geen UX-herontwerp, geen nieuwe functionaliteit, geen databasewijziging.*

### Opgelost — Release Blocker 4: geen 'volledig hersteld' zonder trainingsdata
- **Bevinding:** een deel van de app (Lichaam-tab, hero-kaart, "Waarom vandaag?") filterde al correct op `hours!==null` (bestaand DEC-027-patroon "geen verzonnen data"), maar twee andere plekken deden dit niet:
  - `buildCoachAdvice()` — de centrale coachtekst-bron achter `window.homeCoachText`, hergebruikt op 9 plekken (Home, trainingdetail, begeleide training, dashboarddetail) — claimde "Je lichaam is klaar voor belasting... volledig hersteld" voor spieren zonder enige lastHit-data (altijd pct:100 bij afwezigheid van sessies).
  - `DASHUI.recovery()` (oudere, nog actieve dashboardmodule) had exact dezelfde omissie.
- **Fix:** beide functies filteren nu ook op `r.hours!==null`, identiek aan het patroon dat elders al bestond. Een gebruiker zonder trainingshistorie krijgt nu de neutrale/generieke coachtekst ("grootste kans op progressie") i.p.v. een specifieke, ongefundeerde "volledig hersteld"-claim per spiergroep.
- **Bewust niet aangepast:** de rauwe percentage-weergave per spier in "Waarom vandaag?" (`renderDagfactorDetail`) en de Lichaam-tab-kaarten tonen al langer losse cijfers (bv. "Borst 100%") zonder headline-claim; dit is een bestaand, consistent patroon door de hele app en valt buiten de scope van deze sprint (geen nieuwe UI/copy per Design Freeze).

### Getest
- `node --check` op alle 8 scriptblokken: OK.
- `logic_tests.js`: 144/144 (uit 5.6.1) + 3 nieuwe tests voor de RB4-guard = **147/147 geslaagd**.
- Test bevestigt expliciet: bestaande gebruikers met echte trainingsdata zien geen gedragsverandering (dezelfde "volledig hersteld"-claim blijft correct werken zodra er wél lastHit-data is).

### Gewijzigd
- `APP_VER` v4.23.1 → **v4.23.2**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4232`.

---

## v4.23.1 — 7 augustus 2026 (Sprint 5.6.1 — Onboarding & Defaults, Release Blocker 2+3)
*Onderdeel van Sprint 5.6 "Scientific & New-User Integrity", n.a.v. Enterprise Audit & Scientific Integrity Review v1.0. Uitsluitend data/defaults/onboarding — geen UX-herontwerp, geen nieuwe functionaliteit, geen databasewijziging.*

### Opgelost — Release Blocker 2: single-user-defaults verwijderd
- Default-atleetprofiel gebruikte de ontwikkelaars-eigen waarden (leeftijd 50, geslacht man, lengte 180, gewichtsklasse 120+) als impliciete fallback voor élke nieuwe gebruiker. Nu neutraal (`null`/leeg) totdat de gebruiker dit zelf invult.
- `expected1RM()` (cold-start-predictor) rekende voorheen door met de default-leeftijd als een gebruiker zijn profiel nog niet had ingevuld, wat een misleidende 1RM-schatting opleverde. Geeft nu expliciet `null` terug zonder volledig profiel (leeftijd + lichaamsgewicht).
- Profiel-bewerkmodal en Profiel-/Coach-schermen toonden `50`/`Man`/`180`/"1.00×ˣ Masters factor" als vooraf ingevulde/berekende waarde i.p.v. een lege staat — gecorrigeerd naar "—"/leeg.
- Tweede, eerder gemiste vindplaats: de cross-account cache-resetfunctie (DEC-032) reset het profiel bij accountwissel op een gedeeld toestel nog naar `geslacht:'man'` — nu ook neutraal.

### Opgelost — Release Blocker 3: onboarding verplicht vóór berekening
- Nieuwe verplichte onboardingstap "Jouw gegevens" (leeftijd, lengte, geslacht) toegevoegd vóór de bestaande doel/niveau/sport-stappen. "Volgende" blijft uitgeschakeld tot alle drie ingevuld zijn — zelfde patroon als de bestaande privacy-akkoordstap.
- Alleen van toepassing op **nieuwe** onboardingsessies; de bestaande onboarding-gate (`maurice_onboarding_done`) is ongewijzigd, dus bestaande accounts zien deze stap nooit en ondervinden geen blokkade.

### Backward compatibility
- Geen wijziging aan de `maurice_atleet`-localStorage-structuur of aan Supabase-schema. Bestaande gebruikers hebben altijd al een opgeslagen waarde (eigen invoer of de oude default); de nieuwe `null`-defaults worden uitsluitend gebruikt wanneer er nog géén opgeslagen profiel bestaat (nieuwe accounts/toestellen).

### Getest
- `node --check` op alle 8 scriptblokken: OK, 0 syntaxfouten.
- `logic_tests.js`: 141/141 (bestaand) + 3 nieuwe tests voor de `expected1RM`-guard = **144/144 geslaagd**.
- Code-trace bevestigt: onboarding-gate-logica (`startAppAfterAuth`) niet aangeraakt → geen regressie voor bestaande accounts.

### Gewijzigd
- `APP_VER` v4.23.0 → **v4.23.1**; `sw.js` `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v4231` (app-shell only, `tk-videos-v1` ongewijzigd conform bestaande conventie).

### Bekend openstaand punt
- `CURRENT_STATE.md` en `DECISION_LOG.md` zijn niet gevonden op de verwachte locaties in de repo (root, `docs/`) — dit changelog-bestand zelf liep al ~80 versies achter (laatste entry v3.3.45 vs. huidige v4.23.0). Kan niet bijwerken wat ik niet kan lokaliseren; zie voortgangsrapport voor navraag bij Product Owner.

---

## v3.3.45 — 2 augustus 2026 (Home Dashboard 2.0 — Premium Morning Experience, deel 1)
*Home van "kaarten onder elkaar" naar een coachend dashboard. Geen nieuwe DB/AI/architectuur; uitsluitend bestaande data (DEC-027).*

### Toegevoegd / verbeterd
- **Verrijkte hero "Training van vandaag"**: premium donkere kaart met naam + **aantal oefeningen** + **spiergroepen** (uit `training_exercises` + `exercises.muscle_primary`) als chips, en een grote accent-**▶ Start training**-knop (48px+ tikvlak). Geen verzonnen duur/calorieën.
- **Stat-kaarten**: **Actieve dagen** (laatste 30) en **Weekvolume** met **%-verschil t.o.v. vorige week** — berekend uit bestaande sessies (weight × reps × sets).
- **Quick Actions**-rij (horizontaal scrollbaar): Plate Calculator (verplaatst), Stats, Logboek, Coach, Profiel — consistente lijn-iconen.
- Informatiehiërarchie: groet → dagfactor (herstel) → training van vandaag → week-stats → programma/doel → snelacties → recente sessies.

### Databron-eerlijkheid (DEC-027)
- Recovery blijft de bestaande **dagfactor** (geen verzonnen "recovery %"-score). Geen geschatte trainingsduur/calorieën. Eén betrouwbare waarheid boven een completer ogende kaart.

### Bewust NIET in dit deel (volgt in deel 2)
- Premium recente-sessie-kaarten (duur/rating), aparte "Coach Advies"-kaart met per-oefening progressie-hint, volledige Material 3-/responsive-/a11y-review en de resterende ~30 micro-polish-details. Eerlijk gerapporteerd: dit is deel 1 van Dashboard 2.0.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless render (hero + stats + quick actions) 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.45; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3345`.

---

## v3.3.44 — 2 augustus 2026 (Epic 1 — Morning Experience)
*Home wordt het Morning Report. Geen nieuwe DB/AI/architectuur; uitsluitend bestaande data, presentatie-verbetering.*

### Toegevoegd — Home = Morning Report
- **Persoonlijke ochtendtekst** bovenaan Home: tijdgebonden groet ("Goedemorgen, {naam}") + coach-zin afgeleid uit je eigen dagfactor + de training van vandaag. **Regelgebaseerd uit bestaande data** (dagfactor-motor, volgende vaste training, atleetnaam) — geen nieuwe AI/API-call, instant en offline-veilig (DEC-026).
- **Prominente primaire CTA "Training van vandaag: {training}"** met groot tikvlak (min-hoogte 66px) die de volgende vaste training direct start. Hiërarchie herstel-vóór-prestatie: groet → dagfactor → training van vandaag.
- Dagfactor blijft het dominante, tikbare dag-element met explainable uitleg (Waarom/Data/Logica/Confidence, v3.3.37).

### Premium polish
- Laatste Home-emoji vervangen door lijn-iconen: 🎯 (Doel) en 🗓️ (Programma). Home-scroll-spacing afgestemd op het report-ritme.

### Bewust NIET gedaan (conform opdracht + FASE 0)
- Geen nieuwe database, AI-logica of architectuur. De ochtendtekst gebruikt bewust de bestaande explainable rekenmotoren i.p.v. een AI-call op elke Home-load (zou latency/kosten/offline-risico toevoegen). Een live-AI ochtendbericht kan later als opt-in.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless render (ochtendtekst + CTA) 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.44; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3344`.

---

## SECURITY HOTFIX — 2 augustus 2026 (cross-account datalek — migratie_v338)
*Databasewijziging (RLS/data). Geen app-codewijziging — geen nieuwe `index.html`/`sw.js` nodig; alleen `migratie_v338.sql` uitvoeren in Supabase.*

### Probleem (kritiek, privacy)
- Een tweede/nieuwe gebruiker zag bij **Stats → "Geschatte 1RM"** de 1RM-waarden en peakdoelen van de oorspronkelijke gebruiker.

### Oorzaak
- `migratie_v333` (regel 45) backfillde alle bestaande, persoonlijke oefeningen naar `scope='global'`. De RLS-SELECT-policy toont elke `scope='global'`-rij aan iedere ingelogde gebruiker, terwijl per-gebruiker-data (`pr`/1RM, `peak_goal`) OP de oefening-rij staat → die waarden lekten naar alle gebruikers.

### Fix (migratie_v338)
- Alle gelekte `global`-oefeningen teruggezet naar `personal` en toegewezen aan de eigenaar (`created_by`). 72 rijen hersteld; eigenaar behoudt alles, andere gebruikers zien niets meer.

### Brede RLS-audit (uitgevoerd)
- RLS staat aan op **alle 37 publieke tabellen**. 10 tabellen met 0 policies = deny-all (veilig; billing/config Fase 5 + server-side OAuth). 15 persoonlijke tabellen correct met `auth.uid()`. `custom_trainings` gebruikt hetzelfde `scope='global'`-patroon maar is leeg → geen lek. `exercises` was het enige actieve lek, nu gedicht. Zie DEC-025.

### Architectuur-advies (aparte vervolgstap)
- Per-gebruiker-prestatiedata (`pr`/`peak_goal`) hoort nooit op deelbare (`global`/`gym`) rijen. Óf oefeningen per gebruiker houden + schone globale starter-catalogus seeden, óf `pr`/`peak_goal` naar een aparte per-gebruiker tabel. Details in `migratie_v338.sql`.

---

## v3.3.43 — 2 augustus 2026 (Wordmark op het login-scherm + laatste ART-restant weg)
*Volledige wordmark (logo + naam + tagline) op het inlogscherm.*

### Verbeterd
- **Login-scherm**: het oude A·R·T CrossFit-logo én de subtitel "AI TRAININGSCOACH 2026" (laatste merkrestant in de app) vervangen door de officiële **wordmark** ("Trainingskompas — Gericht trainen. Slimmer worden. Sterker blijven.") in een verzorgd, afgerond logo-kaartje dat in licht én donker thema werkt.
- Nieuw asset `logo-wordmark.png` (bijgesneden, geoptimaliseerd, 640px) toegevoegd en opgenomen in de offline-precache van de service worker.

### Upload-let op
- Nieuw binair bestand `logo-wordmark.png` → via **Add file ▸ Upload files** (met `index.html` en `sw.js`).

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · login-scherm gerenderd via lokale server (wordmark laadt, 640×521), 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.43; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3343`; `logo-wordmark.png` toegevoegd + in SW-precache.

---

## v3.3.42 — 2 augustus 2026 (Officieel logo ingebouwd)
*Definitief merklogo (kompas + atleet, navy/teal) doorgevoerd; vervangt de tijdelijke SVG-mark.*

### Verbeterd
- **App-iconen** `icon-192.png` en `icon-512.png` vervangen door het officiële logo (icon-only versie), content gecentreerd met veilige marge — geschikt voor zowel gewone als **maskable** weergave (Play Store/startscherm).
- **Home-header** toont nu het echte logo als een verzorgd, afgerond app-icon-tegeltje i.p.v. de tijdelijke bergpad-SVG.

### Upload-let op
- `icon-192.png` en `icon-512.png` zijn **binaire bestanden**: uploaden via GitHub **Add file ▸ Upload files** (niet via het potlood/plakken). Samen met `index.html` (en `sw.js` voor de cache-refresh).
- WCAG-notitie: logo's/merknamen zijn uitgezonderd van de contrasteis — de teal in het logo is geen probleem, ook niet in de Play Store.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · header-logo laadt (192×192) en gerenderd via lokale server · 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.42; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3342`; `icon-192.png` + `icon-512.png` vervangen.

---

## v3.3.41 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 6: Gerichte toegankelijkheid)
*Gerichte a11y-verbeteringen. Let op: dit is géén gecertificeerde WCAG-AA-audit — daarvoor zijn axe-core/Lighthouse en een echte-toestel-screenreadertest nodig, die in deze omgeving niet beschikbaar zijn (zie ook DEC-023).*

### Verbeterd
- **`aria-label`s toegevoegd aan de trainings-invoervelden**: gewicht ("Gewicht in kg"), herhalingen ("Herhalingen") en RPE ("RPE (ervaren zwaarte)"). Screenreaders benoemen deze nu correct i.p.v. een naamloos veld.

### Al op orde (geverifieerd, geen wijziging nodig)
- `<html lang="nl">` aanwezig · zichtbare focus (`:focus-visible`) · skip-link · `.sr-only`-utility · `prefers-reduced-motion` volledig ondersteund. De in Batch 2 toegevoegde componenten (bevestigingsmodal `role="dialog"`/`aria-modal` + Esc/Enter, dagfactor-uitklap met `aria-expanded`/`aria-controls`, icoonknoppen met `aria-label`) zijn toegankelijk gebouwd.

### Bevinding voor besluit (niet eigenhandig gewijzigd)
- **Contrast merkaccent**: `#00B894` op wit haalt **2,54:1** — onder WCAG AA (4,5:1 voor kleine tekst, 3:1 voor grote/bold). Dit raakt de vastgelegde merkkleur (DEC-010) en kleine accent-teksten/knoppen app-breed. Omdat dit een design-system-besluit is, is het **niet** in deze pass gewijzigd. Opties ter overweging: een iets donkerder teal (bv. `#00997a` = 3,6:1) uitsluitend voor tekst-op-wit, of accent-tekst altijd bold ≥ grote-tekst-grootte. Aanbevolen als apart besluit met de Product Owner.

### Aanbevolen vervolg (buiten deze omgeving)
- Draai Lighthouse + axe-core en een VoiceOver/TalkBack-doorloop op een echt toestel voor een volledige AA-bevestiging.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.41; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3341`.

---

## v3.3.40 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 5: Coach-scherm iconografie)
*Iconografie doorgetrokken naar het Coach-scherm.*

### Verbeterd
- **Coach-header**: 🕘 → geschiedenis-lijnicoon, 🗑 → prullenbak-lijnicoon (consistent met nav/Home-header). Verzendknop (`↑`) ongewijzigd — is al een strak teken.
- **Custom-trainingen**: verwijder-🗑 → prullenbak-lijnicoon, met `aria-label`.

### Bewuste scope-correctie (eerlijk)
- Een **volledige** emoji→lijnicoon-sweep over de héle app is groter dan eerder ingeschat (~50 emoji, veel in kaart-headers/labels waar ze deels decoratief/semantisch functioneren). De premium-kritische oppervlakken (bottom-nav, Home-header, werkset-acties, Coach-header) zijn nu gedaan; een uitputtende sweep is een aparte, grotere klus met lagere ROI en is bewust niet in deze pass meegenomen.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless render Coach-header bevestigd, 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.40; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3340`.

---

## v3.3.39 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 4: Merkeigen bevestigingsdialogen)
*Geen functionaliteit gewijzigd; alle native `confirm()`-dialogen vervangen door een merkeigen modal (Handbook/UX Constitution: geen native dialogen).*

### Verbeterd
- **Alle 22 native `confirm()`-aanroepen** vervangen door één herbruikbare `confirmModal()` — een verzorgde, gecentreerde merk-modal met titel, boodschap, "Annuleren" en een actieknop. Destructieve acties (verwijderen/loskoppelen/account) krijgen een **rode danger-knop** (`#B3454C`, H5), niet-destructieve (cache verversen, weken genereren, hervatten) de accent-knop. Elke knop heeft nu een **specifiek werkwoord** (Verwijderen/Loskoppelen/Wissen/Pauzeren/Hervatten) i.p.v. het generieke "OK".
- Betreft o.a.: uitloggen, account verwijderen (dubbele bevestiging), sessie pauzeren, set/opwarmset/oefening/programma/doel/training/apparaat verwijderen, wearable loskoppelen, gesprek wissen, cache verversen, training hervatten, weken her-genereren.

### Toegankelijkheid & interactie
- Toetsenbord: **Esc = annuleren, Enter = bevestigen**; focus springt naar de actieknop; klik op de achtergrond annuleert. `role="dialog"`, `aria-modal`. Nette in/uit-animatie via de motion-tokens; opgeruimd na sluiten.

### Technisch
- `confirmModal(message,{title,okLabel,cancelLabel,danger})` retourneert `Promise<boolean>`; boodschappen ge-escapet (XSS-veilig via `escHtml`). Vijf UI-handlers die voorheen synchroon waren (authSignOut, deleteCustomTraining, showSetMenu, showWarmupMenu, confirmLeave) zijn `async` gemaakt — ze worden alleen vanuit onclick aangeroepen, dus geen effect op aanroepers.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless: modal rendert, OK→`true`, Annuleren→`false`, geen achtergebleven modals, 0 code-fouten. `grep` bevestigt: geen native `confirm(` meer in de code.

### Gewijzigd
- `APP_VER` → v3.3.39; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3339`.

---

## v3.3.38 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 3: Werkset-ergonomie)
*Geen functionaliteit verwijderd; de hoogfrequente werkset-rij ergonomischer en premium gemaakt.*

### Verbeterd
- **Grotere, duidelijkere tikvlakken** in de werkset-rij: set-cirkel 38→42px; de rusttimer- en meer-knop krijgen een tikvlak van ≥36×42px (was ~24px) — beter voor de kernactie "set afvinken" en de masters-doelgroep.
- **⏱ en ⋮ emoji → lijn-iconen** (accent-groene klok voor de rusttimer, net drie-punts-menu), consistent met de nieuwe iconografie. Ook de opwarmset-⋮ meegenomen. `aria-label`s toegevoegd.

### Bewust behouden (geen functieverlies)
- Weight-mode-select (vast/+kg/%), RPE-stepper, rusttimer en meer-menu blijven volledig aanwezig. De RPE-stepper (verticaal) en de mode-select (8px, gedempt) waren al compact; een diepere flow-herstructurering (mode in het menu, ghost-values) is bewust níét in deze veilige pass gedaan wegens de sterk gekoppelde element-IDs — kandidaat voor een aparte, apart geverifieerde stap.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless: echte `buildWorkSetRow()` gerenderd (iconen + tikvlakken correct), 0 code-fouten.

### Gewijzigd
- `APP_VER` → v3.3.38; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3338`.

---

## v3.3.37 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 2: Dagfactor-promotie)
*Geen nieuwe functionaliteit; bestaande dagfactor-motor prominenter en uitlegbaar gemaakt (topaanbeveling Product Excellence Rapport §7/§14).*

### Verbeterd
- **Home: dagfactor gepromoveerd tot dominant, tikbaar dag-element.** Voorheen een kleine goud/tekst-regel onderaan de HRV-kaart; nu een kleur-gecodeerde hero-cirkel (accent-groen ≥1.00 · amber 0.93–0.99 · gedempt rood <0.93) met korte samenvatting bovenaan de kaart. Herstel vóór prestatie in de visuele hiërarchie (H3 P2).
- **Tikbare explainability (H8), zonder extra API-call.** "Waarom? →" klapt de onderbouwing uit met vier vaste velden: **Waarom** (leesbare samenvatting), **Data** (gebruikte HRV/RHR/slaap/cyclus), **Logica** (`factor = HRV × slaap[ × cyclus]`, geclipt 0.85–1.05, met de expliciete melding dat het informatief is en nooit automatisch gewicht aanpast), **Confidence** (Hoog/Middel/Laag op basis van aanwezige signalen).
- HRV/RHR/slaap-trio en de HRV-drempelpills blijven behouden als secundaire detaillaag onder de hero.

### Technisch
- `refreshHome()` HRV-kaart herbouwd; nieuwe `toggleDagfactorDetail()` (in/uitklappen, `aria-expanded` bijgewerkt). Hergebruikt de bestaande `dagfactor()`-motor (`{factor,hrvFactor,slaapFactor,cyclusFactor}`) — geen dubbele logica, geen nieuwe berekening.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless: toggle functioneel (uitleg klapt in/uit), 0 code-fouten, hero + uitleg visueel bevestigd.

### Gewijzigd
- `APP_VER` → v3.3.37; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3337`.

---

## v3.3.36 — 2 augustus 2026 (Premium Experience Sprint — Batch 2, deel 1: Iconografie)
*Geen nieuwe functionaliteit. Emoji-iconen vervangen door een consistente lijn-icon-set (H5), op de primaire schermen.*

### Verbeterd
- **Bottom-navigatie**: emoji (🏠🏋️💬👤📈) → consistente 1,8px lijn-iconen (huis, halter, chatbubbel, persoon, trendgrafiek) op een 24px-raster. Actief item kleurt nu ook qua icoon mee in accent-groen (voorheen alleen het label).
- **Home-header**: 📊 → HRV/dagfactor-puls-icoon; ⚙️ → sliders/beheer-icoon.
- **Plate Calculator-knop**: ⚖️ → halter-lijnicoon.

### Technisch
- DRY-aanpak: één `applyNavIcons()` mapt alle `.ni-icon`'s op basis van het label, i.p.v. de 12× gedupliceerde nav-markup handmatig te bewerken. Iconen erven `currentColor` (grijs → accent bij actief) en schalen mee met het thema.
- `.ibtn`/`.ni-icon` SVG-styling toegevoegd; iconen respecteren dark mode.

### Getest
- `node --check` OK · `logic_tests.js` 141/141 · headless render 0 code-fouten · 65 nav-iconen correct geplaatst (13 navs × 5), header + plate-calc visueel bevestigd.

### Nog open in Batch 2
- Overige per-scherm-emoji (Coach 🕘/🗑, Stats ↻, admin-acties) → lijn-iconen; werkset ≤2 tikken; Home volledig Morning Report; 19× native `confirm()` → merkmodals; volledige WCAG-AA + performance-pass.

### Gewijzigd
- `APP_VER` → v3.3.36; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3336`.

---

## v3.3.35 — 2 augustus 2026 (Premium Experience Sprint — Batch 1)
*Geen nieuwe functionaliteit. Doel: bestaande functionaliteit naar premium-niveau brengen — hogere kwaliteit, minder frictie, meer emotie, betere uitstraling. Batch 1 = veilige, hoog-zichtbare afwerking; structurele ingrepen volgen in Batch 2 (zie onderaan).*

### Brand cleanup (zichtbaar)
- **ART CrossFit-logo verwijderd** van het Home-scherm en vervangen door een eigen TrainingKompas-merkmark (bergpad-met-vlag-motief in de merkkleuren `#0B1D2A`/`#00B894`/`#E6EBEF`, conform H5). Live geverifieerd via headless render.
- **Home-subtitel** "AI Trainingscoach 2026" → tijdloze merkbelofte "Slimmer trainen, elke dag" (geen verouderend jaartal meer).
- **Stats-subtitel** "1RM & Peakdoel 15 aug 2026" → "1RM & peakdoel" (hardcoded, verouderende datum verwijderd; `id="stats-peak-sub"` toegevoegd voor toekomstige dynamische vulling).
- **Beheer-subtitel** placeholder "v2.8.5" verwijderd (werd al door JS met `APP_VER` overschreven; toonde kort een stale versie).
- **Systeemprompt** ontdaan van hardcoded persoonsnaam ("… van Latum van Steensel"); coach gebruikt nu `atleet.naam` met neutrale fallback "de atleet". Label "Maurice-specifiek" → "gebruiker-specifiek". Default atleet-`naam` niet meer "Maurice".
- **manifest.json** `short_name` "Kompas" → "Trainingskompas" (schond DEC-010: merknaam altijd zichtbaar).
- **sw.js** cachenamen `maurice-training-*` → `trainingskompas-*`; notificatie-fallbacktitel "Training Coach" → "Trainingskompas".

### Premium micro-interacties (H11-tokens nu daadwerkelijk toegepast)
- Zachte **schermtransitie** (`tk-screen-in`, `--motion-navigation`) bij elke navigatie.
- **PR-badge pop** (`tk-pop`, `--motion-success`) — het emotionele kernmoment krijgt nadruk.
- **Set-voltooid pop** op de set-cirkel (`tk-set-done`, `--motion-fast`) bij afvinken.
- **AI Apply-knop** bevestigingsanimatie (`apply-ok`) bij toepassen van een coach-advies.
- Druk-feedback op `.btn`/`.act-btn`/`.ibtn`. Alles neutraliseert onder `prefers-reduced-motion` (bestaande globale regel).

### Premium AI-chat (alleen presentatie, geen prompt-logica gewijzigd)
- **Markdown wordt nu gerenderd** i.p.v. letterlijke `**` te tonen — via een nieuwe veilige `mdInline()` (eerst HTML-escapen tegen XSS, daarna beperkte subset: vet/cursief/code/bullets).
- **AI- vs. gebruikersbubbel** visueel onderscheiden: coach = petrol `#0E3B4A` (AI-content, conform H5), gebruiker = donkerblauw; eigen bubbelvormen.
- Kale spinner → premium **typing-indicator** (drie pulserende puntjes).
- Foutmeldingen "Fout: …" en "Verbindingsfout. Check internet." → verzorgde, herstelgerichte copy. Status "Denkt na..." → "Coach denkt mee…".

### Premium states
- Zichtbare "Laden..."-placeholders in Stats (PR/volume/herstel) en Profiel-wearable → **skeleton-loaders** (`tk-skel`, shimmer).
- Lege spierbelasting-data → verzorgde empty state (`tk-empty`) met richting i.p.v. kale "Geen data".

### Bewuste, veilige afwijking (dataveiligheid — productprioriteit)
- **localStorage-sleutelprefix `maurice_` NIET hernoemd.** 47 sleutels (`maurice_auth_session`, `maurice_atleet`, `maurice_trainings`, `maurice_onboarding_done`, …) zijn opslag-identifiers; blind hernoemen zou alle bestaande gebruikersdata en de login wissen. Alleen zichtbare branding is opgeschoond; een eventuele sleutelmigratie hoort in een aparte, veilige migratiestap (Batch 2). Vastgelegd als beslissing.

### Getest
- `node --check` op alle ingebedde script-blokken: **OK**.
- `node logic_tests.js`: **141/141 geslaagd, 0 mislukt** — geen regressies.
- Headless boot (Playwright/Chromium): **0 code-fouten**; nieuwe Home-header visueel bevestigd.
- *Niet uitvoerbaar in deze omgeving (geen tooling, eerlijk gemeld):* `npm run lint/typecheck/test` (repo heeft geen `package.json`/npm-toolchain); Lighthouse/axe; volledige before/after van datagedreven schermen (vereisen ingelogde live sessie).

### Gewijzigd
- `APP_VER` → v3.3.35; `CACHE_NAME`/`CACHE_STATIC` → `trainingskompas-v3335`.

### Openstaand — Batch 2 (structureel, met voorstel/before-after)
- Emoji-navigatie → consistente lijn-icon-set (H5) + de 12× gedupliceerde bottom-nav dedupliceren (12 dubbele element-id's).
- Werkset-rij naar ≤2 interacties (RPE compacter, weight-mode uit de rij, ghost-values, grotere touch-targets).
- Home volledig als Morning Report met de dagfactor als dominant, tikbaar element (waarom/data/logica/confidence).
- 19× native `confirm()` → merkeigen bevestigingsmodals.
- Volledige WCAG-AA-pass (ARIA/focus/keyboard/contrast/touch-targets) en performance-pass.

---

## Sprint 3.1 — 2 augustus 2026 (Live Validatie, Release Closure & Quality Gate)
*Geen eigen versienummer — sluit v3.3.34 af met live validatie, geen codewijzigingen in dit deel.*

### Live bevestigd
- Doelen-module volledig end-to-end getest: Create/Read/Delete voor zowel PR-doel als eigen doel, Challenges tonen correcte live cijfers, 0 console-fouten over de volledige schermdoorloop (Doelen/Instellingen/Meldingen/Privacy/Help/Profiel/Statistieken/Coach/Dashboard).
- Beide vorige hotfixes (v3.3.33 user_id, v3.3.34 modal-breedte) herbevestigd correct.

### Expliciet niet geleverd (geen aannames/geen tooling)
- Lighthouse- en axe-core-scores — geen tool beschikbaar.
- Schaalbaarheidsbenchmarks (100–10.000 sessies) — zou synthetische data in productie of gefabriceerde cijfers vereisen.
- Screenshot-pack in `docs/screenshots/` — browserscreenshots landen lokaal bij de Product Owner, niet in de repo.
- Volledig Database Validatie Rapport — introspectiequeries klaargezet, resultaat nog niet ontvangen.

### Bekend gat
- Doelen-Update (bewerken) ontbreekt — alleen aanmaken/verwijderen is gebouwd.

Zie `docs/Sprintrapporten/Sprint3.1_Rapport.md` voor het volledige verslag.

---

## v3.3.34 — 2 augustus 2026 (Hotfix — modals te breed op desktop)

### Opgelost
- **Alle modals (~50 stuks) app-breed** — `.modal-bg`/`.modal` misten een breedtebegrenzing, waardoor modals op brede (desktop-)vensters de volle breedte van het scherm besloegen i.p.v. de 430px app-kolom. Live gemeld door de Product Owner tijdens een testsessie. Geen echte-telefoon-impact (viewport daar altijd <430px) — puur een desktop-testartefact, nu voor iedereen consistent opgelost (DEC-022).

### Gewijzigd
- `APP_VER` → v3.3.34, `CACHE_NAME` → maurice-training-v3334.

---

## v3.3.33 — 2 augustus 2026 (Hotfix — goals user_id ontbrak)

### Opgelost
- **`saveNewGoal()` stuurde geen `user_id` mee** — de RLS-policy op `goals` blokkeerde daardoor elke insert (42501 "new row violates row-level security policy"). Live gevonden via een end-to-end test in de browser (na migratie v337).
- **Live bevestigd correct na de fix:** testdoel aangemaakt (PR-doel op Hexabar Deadlift), opgeslagen, correct weergegeven (240/300 kg, 80%), daarna zelf weer gearchiveerd. Doelen-module is hiermee voor het eerst end-to-end bevestigd werkend, niet langer alleen code-gevalideerd.
- **Mobiele `100vh`-hotfix (v3.3.29) bevestigd** door Product Owner op een echt toestel.

### Gewijzigd
- `APP_VER` → v3.3.33, `CACHE_NAME` → maurice-training-v3333.

---

## v3.3.32 — 2 augustus 2026 (Hotfix — zichtbare HTML-commentaartekst)

### Opgelost
- **Live gemeld door Product Owner (telefoonscreenshots):** een stuk HTML-commentaar werd zichtbaar als gewone tekst onderaan het Instellingen-scherm, onder de bottom-navigatie. Oorzaak: bij het invoegen van het Doelen-scherm in Sprint 3 werd een bestaand commentaarblok per ongeluk doormidden geknipt — de laatste 3 regels ervan (incl. sluitende `-->`) bleven zonder openende `<!--` staan. Hersteld; comment-balans in het hele bestand geverifieerd (52/52).

### Gewijzigd
- `APP_VER` → v3.3.32, `CACHE_NAME` → maurice-training-v3332.

---

## v3.3.31 — 2 augustus 2026 (Hotfix — migratie v337 typefout)

### Opgelost
- **Migratie v337 faalde bij eerste uitvoering:** `goals.exercise_id` was aangemaakt als `bigint`, terwijl `exercises.id` in werkelijkheid `text` is — foreign key kon niet worden aangelegd. Gecorrigeerd naar `text`. Bijbehorende JS (`saveNewGoal()`) aangepast: stuurde `exercise_id` voorheen als `Number(...)`, nu als tekst.
- Migratie v337 succesvol uitgevoerd door Product Owner na deze fix.

### Gewijzigd
- `APP_VER` → v3.3.31, `CACHE_NAME` → maurice-training-v3331.

---

## v3.3.30 — 2 augustus 2026 (Sprint 3 — Doelen, Challenges & Persoonlijke Voortgang)

### Toegevoegd
- `migratie_v337.sql`: nieuwe `goals`-tabel (RLS, per gebruiker) — **nog niet uitgevoerd in Supabase**.
- Doelen-scherm (7.1): 9 doeltypes (gewicht/vetpercentage/spiermassa/PR/frequentie/volume/conditie/uithoudingsvermogen/eigen), elk met live berekende voortgang en een SMART-check.
- Persoonlijke Challenges (7.2): 100 trainingen, 30 dagen actief, 100 km roeien, 500 ton volume, 10 PR's — allemaal 100% herleid uit bestaande sessiedata, niets nieuws opgeslagen.
- Dashboard-integratie: compacte doelenkaart met voortgangsbalk.
- Profiel-integratie: nieuw toegangspunt "Doelen & Challenges".
- "Vraag de coach"-knop per doel — hergebruikt de bestaande AI-coach-chatfunctie (`sendMsg()`), geen nieuwe AI.

### Bewust niet toegevoegd
- Gym-/Team-challenges (DEC-018) — vereist cross-user aggregatie-infrastructuur die niet bestaat.
- "Perfecte trainingsweek" (DEC-018) — geen eenduidige bestaande definitie van "perfect".

### Opgelost (tijdens bouwen ontdekt en gecorrigeerd, nooit live geweest)
- Twee dubbele-backslash-escapefouten in stringliterals (`\\'` i.p.v. `\'`) die de syntax-check lieten falen — gecorrigeerd vóór commit.
- Eerste opzet van de "nieuw doel"-modal gebruikte niet-bestaande CSS-klassen/functienamen (`sbInsert` i.p.v. `sbPostQ`, verzonnen modal-structuur i.p.v. het bestaande `.modal-bg`/`.modal`-patroon) — rechtgezet door het bestaande patroon eerst op te zoeken.

### Gewijzigd
- `APP_VER` → v3.3.30, `CACHE_NAME` → maurice-training-v3330.

### Bekende problemen
- **Functioneel nog niet gevalideerd** — migratie v337 moet eerst uitgevoerd worden, daarna volgt een live doorloop van alle doeltypes.

---

## v3.3.29 — 2 augustus 2026 (Hotfix — mobiel 100vh-probleem)

### Opgelost
- **Kritiek, live gemeld door Product Owner (met telefoonscreenshot):** Terug/Volgende-knoppen op het onboarding-scherm vielen buiten het zichtbare gebied op een echt Android-toestel. Oorzaak: `height:100vh` op mobiele browsers rekent met de adresbalk mee, waardoor content onderaan buiten beeld valt. Fix: `height:100dvh` toegevoegd als progressive enhancement op `.scr` en `.pin-screen` (DEC-016).
- Geverifieerd geen regressie op desktop (waar `100dvh` gelijk is aan `100vh`).
- **Nog te bevestigen:** hertest op het echte toestel van de Product Owner.

### Gewijzigd
- `APP_VER` → v3.3.29, `CACHE_NAME` → maurice-training-v3329.

---

## v3.3.28 — 2 augustus 2026 (Sprint 2.5 — Validatie, Polish & Release Readiness)

### Toegevoegd
- `migratie_v336.sql`: `doel`-kolom op `atleet_profiel` (verplicht uit te voeren in Supabase — zie CURRENT_STATE.md).

### Opgelost
- **Kritiek (live gevonden):** onboarding kon de gekozen `doel`-waarde niet naar Supabase syncen — schema miste de kolom. Device-lokaal werkte het al (geen dataverlies), sync faalde stil op de achtergrond.
- **Pre-existing (live gevonden, niet Sprint 2):** `refreshStats()` crashte bij elk bezoek aan het Beheer-scherm, waardoor twee admin-secties (Roeiers, Custom-oefeningen) daar nooit ververst werden. Defensieve null-check toegevoegd.

### Gevalideerd (live, op productie)
- Alle 5 Sprint 2-schermen (Instellingen, Meldingen, Privacy, Help, Onboarding) bevestigd aanwezig en renderend op maurice-art.netlify.app.
- Dark mode visueel bevestigd leesbaar (donkerblauw/petrol-tokens).
- Onboarding privacy-checkbox-gate bevestigd functioneel (Volgende-knop correct disabled tot aanvinken).
- Geen gebroken netwerkverzoeken (fonts, Supabase REST, Netlify Functions — alle 200 OK).
- Dashboard-headertitel "Trainingskompas" bevestigd zonder overloop naast het kompas-icoon.

### Gewijzigd
- `APP_VER` → v3.3.28, `CACHE_NAME` → maurice-training-v3328.

### Bekende problemen / niet gevalideerd
- Geen Lighthouse-score, geen axe-core-scan, geen echte-devicetest (Android/tablet) — zie Sprint2.5_Rapport.md voor de volledige lijst van wat wél/niet kon worden vastgesteld.
- Migratie v336 nog niet uitgevoerd — tot die tijd blijft de onboarding-Supabase-sync falen voor `doel`.

---

## v3.3.27 — 2 augustus 2026 (Sprint 2 — Instellingen, Onboarding & Branding)

### Toegevoegd
- Instellingen-scherm (8.3): thema (light/dark/automatisch), taal (informatief), meldingen-doorverwijzing, geluid/trillingen-switches, privacy-doorverwijzing, offline-status + cache-verversen, app-informatie/debuginfo.
- Meldingen-scherm (8.2): 5 losse voorkeuren (training/herstel/coach/updates/systeem) + browsertoestemming-aanvraag.
- Privacy-scherm (9.6): feitelijke, code-geverifieerde uitleg + expliciet gemarkeerde placeholder voor de juridische privacyverklaring.
- Help-scherm (9.4/9.5/9.7): FAQ, contact (placeholder), over de app, licenties.
- Onboarding: volledige 9-staps wizard (welkom/intro/doel/niveau/sport/meldingen/offline-info/privacy-akkoord/start), verschijnt eenmalig na login.
- Nieuwe CSS-componenten: Switch (`role="switch"`, conform H7) en Segmented Control, hergebruikt over Instellingen/Meldingen/Onboarding.
- Handmatige thema-override (`data-theme`) naast de automatische `prefers-color-scheme`-detectie uit Sprint 1.

### Verbeterd
- Merkidentiteit doorgevoerd: Poppins-font (Barlow Condensed verwijderd, ook uit sw.js-precache), officiële kleuren `#0B1D2A`/`#0E3B4A`/`#00B894`/`#E6EBEF` op alle light-theme-tokens.
- Bestaande rusttimer-trilling respecteert nu de Trillingen-instelling.

### Gewijzigd
- KOMPAS-afkorting op login- en dashboardscherm gecorrigeerd naar "Trainingskompas" (DEC-010).
- `manifest.json`: `background_color`/`theme_color` bijgewerkt naar merkkleuren.
- `APP_VER` → v3.3.27, `CACHE_NAME` → maurice-training-v3327 (sw.js).

### Opgelost
- Geen functionele bugs gevonden tijdens QA; twee vooraf bestaande, niet door Sprint 2 veroorzaakte issues gedocumenteerd (dubbele `nav-train-dot`-id's, klein div-tag-onbalans) — zie CURRENT_STATE.md, Technische schuld.

### Bekende problemen
- Onboarding en thema-wissel nog niet getest op een echt device/browser (geen device beschikbaar tijdens deze sprint).
- Onboarding-gate is device-gescoped, niet account-gescoped (DEC-013).
- Privacy- en Help-schermen bevatten bewust gemarkeerde placeholders — geen verzonnen juridische tekst.
- Geluid-instelling heeft nog geen functioneel effect (geen audio-functionaliteit in de app).

---

## v3.3.26 — 2 augustus 2026 (Sprint 1 — Fundament, Accessibility & Stabilisatie)

### Toegevoegd
- Accessibility-fundament (WCAG 2.2 AA-basis): `role="navigation"` + label op alle bottom-navigaties, `aria-current="page"` op het actieve navigatie-item, `role="heading" aria-level="1"` op alle schermtitels, `role="dialog"`/`aria-modal` + focus-trap op modals, focus-verplaatsing bij schermwissel (`go()`), skip-link, `:focus-visible`-stijl, `.sr-only`-utility, aria-labels op alle icoon-only knoppen (`.ibtn`).
- Motion Framework: CSS-tokens conform Handbook H5/H11-naamgeving (`--motion-fast`, `--motion-standard`, `--motion-success` e.a.) + volledige `prefers-reduced-motion`-ondersteuning.
- Dark Mode-fundament: kleurtokens + automatische detectie via `prefers-color-scheme`, incl. dynamische `theme-color`-meta voor light/dark.

### Verbeterd
- Geen restyle van bestaande light-mode-kleuren — alle bestaande waarden ongewijzigd.

### Gewijzigd
- Label "Instellingen" op het Beheer-scherm (`s-admin`) gecorrigeerd naar "Beheer" — verwarde met het (nog te bouwen) Instellingen-scherm (H6, 8.3).
- `APP_VER` → v3.3.26, `CACHE_NAME` → maurice-training-v3326 (sw.js).

### Opgelost
- Geen functionele bugs gevonden tijdens de offline-/performance-/QA-controle van Sprint 1 (sw.js network-first: correct bevestigd; geen memory-leak-patronen; geen dode/dubbele functies aangetroffen).

### Bekende problemen
- Instellingen-scherm (8.3) blijft functioneel smal (alleen rusttimer-instelling) — geen Sprint 1-scope, gepland voor een volgende sprint.
- Accessibility-fundament is toegepast op herbruikbare componenten en kernnavigatie; een scherm-voor-scherm WCAG-doorloop (met name complexere formulieren/heatmaps) is nog niet uitgevoerd.
- Dark mode is alleen tokenmatig aanwezig — visuele restyle volgt in een aparte, expliciet gescopede sprint.

---

## v3.3.25 en eerder
Zie DECISION_LOG.md (DEC-001 t/m DEC-010) en CURRENT_STATE.md voor de volledige geschiedenis vóór dit CHANGELOG-bestand is gestart.
