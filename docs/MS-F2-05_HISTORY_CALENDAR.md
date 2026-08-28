# MS-F2-05_HISTORY_CALENDAR.md — Trainingskompas

**Auditmethode:** lezing van `loadHistory`, `td()`, `openRepeatWorkout`, `histOpenDay`/`toggleHistDay`, en een repo-brede scan op alternatieve datumberekeningspatronen (`toISOString().split('T')[0]`/`.slice(0,10)`).

## Bevinding: History is correct een presentatielaag over canonieke data
`loadHistory()` groepeert bestaande `sessions`-rijen per `date`, sorteert op de canonieke gelogde datum (`order=date.desc`), en gebruikt uitsluitend `CalcCore.calculateVolume()` (bestaande, canonieke berekening) voor de getoonde volumesamenvatting — geen herberekening van originele waarden, geen AI-reconstructie.

## Bevinding: `td()` correct, maar niet overal consistent toegepast (P3, niet blokkerend)
`td()` — de canonieke "vandaag"-datumfunctie — gebruikt terecht lokale datumcomponenten (`getFullYear()/getMonth()/getDate()`), niet `toISOString()`. Dit was een eerder gefixte bug ("coach blijft op oude datum hangen"), en `finishSession()` gebruikt deze functie correct om de datum van een voltooide training vast te leggen — **de kritieke schrijf-datum van een training is dus altijd lokaal correct.**

Repo-brede scan vond echter **18 andere plekken** die nog `toISOString().split('T')[0]`/`.slice(0,10)` gebruiken voor datumberekeningen. Analyse: al deze 18 zijn **bereikgrenzen** ("sessies van de laatste 7/14/28 dagen" voor dashboards/AI-context), niet de datum-attributie van een individuele training zelf. Het risico is beperkt tot een sessie die rond middernacht een paar uur te vroeg/laat in of uit een "laatste N dagen"-venster valt — geen "training staat op de verkeerde dag in de kalender"-defect.

**Besluit:** niet gefixed binnen deze sprint. 18 call sites tegelijk aanpassen zou een grotere, risicovollere ingreep zijn dan verantwoord als minimale fix (potentieel meerdere ongerelateerde dashboard-/AI-context-features raken zonder specifiek bewijs van een gebruikersgevoeld probleem). Geregistreerd als GAP-P3 voor gericht vervolgwerk.

## Repeat Workout-provenance (sectie 18, voorbereiding op GAP-P1-006)
`openRepeatWorkout(date, t)` haalt de originele sessies op via `date`+`training_type` (`t`) — voldoende provenance om een repeat-definitie te reconstrueren zonder de oude execution-identity te hergebruiken (bevestigd: `startRepeatWorkout()` reset `activeInstanceId` sinds MS-F2-01, dus een nieuwe uitvoering krijgt altijd een nieuwe identity). Deze audit bevestigt dat de benodigde brongegevens voor een toekomstige Definition Adapter (MS-F2-08/GAP-P1-006) al aanwezig en toegankelijk zijn.

## Nieuw: regressiecontract
`core/fHistoryCalendar.test.js` (8/8, sabotagebewijs geleverd voor zowel de `.toISOString()`-afwezigheid als de lokale-datumcomponenten-opbouw in `td()`) legt vast dat de kritieke schrijf-datum-functie nooit stilzwijgend teruggezet kan worden naar het bekende buggy patroon.

## MS-F2-05 acceptance-gate-toetsing
Letterlijke acceptance gate: *"History and future planning form one coherent flow."*
History-kant bevestigd coherent (canonieke data, geen herberekening, correcte datumattributie bij schrijven). "Future planning" (scheduling/kalender-vooruitblik) is niet apart als losstaande feature aangetroffen buiten de bestaande Programma-structuur (`program_blocks`) — geen aparte "kalender-planning"-UI gevonden die dit expliciet apart claimt; de bestaande Programma-flow (reeds gedekt in eerdere sprints) vervult deze rol.

**Resultaat: CLOSED** voor de History-kern; het P3-datumpatroon-punt is expliciet genoteerd als niet-blokkerend vervolgwerk, geen reden voor PARTIAL.
