# MS-F7-02_EXERCISE_STAGNATION_PLATEAU_DETECTION.md — Trainingskompas

**Canonieke naam/acceptance:** "Exercise Stagnation & Plateau Detection" -- "Exercise-specific, not blunt global strain trigger." P1, dependencies MS-F3-02 + MS-F7-01 (beide CLOSED).

## Geregistreerde semantiek (vóór implementatie)
- IMPROVING: trendBy() rapporteert improving=true.
- STAGNATION_CANDIDATE: voldoende observaties (>= MIN_OBSERVATIONS=4), geen duidelijke verbetering, maar nog niet over de langere PLATEAU-drempel.
- PLATEAU: >= PLATEAU_OBSERVATIONS=6 vergelijkbare exposures zonder meaningful verbetering EN zonder een nieuwe PR. De enige term die "plateau" mag heten -- nooit op basis van een enkele sessie.
- TEMPORARY_REGRESSION: duidelijk dalende trend maar met minder dan PLATEAU_OBSERVATIONS.
- INSUFFICIENT_DATA: minder dan MIN_OBSERVATIONS. Nooit een classificatie fabriceren.

Plateau en stagnatie worden hier expliciet niet door elkaar gebruikt.

## Nieuw gebouwd: PlateauDetectionCore (core/plateauDetection.js)
Bouwt bovenop de bestaande, ongewijzigde ProgressionCore.trendBy()/comparableHistory()/isNewBest() -- geen tweede, gedupliceerde vergelijkingslogica. Canonieke exercise-identity via dezelfde key-conventie als computeExerciseTrends().

Transparante, inspecteerbare regels: eerst de stabiliteitsdrempel toetsen, dan pas richting, dan de observatie-drempel voor PLATEAU versus STAGNATION_CANDIDATE/TEMPORARY_REGRESSION.

Bug gevonden en gecorrigeerd tijdens ontwikkeling: de initiële volgorde controleerde eerst trend.improving===true vóórdat de stabiliteitsdrempel werd getoetst, waardoor een verwaarloosbare stap ten onrechte als IMPROVING werd geclassificeerd. Gecorrigeerd door de stabiliteitscheck eerst uit te voeren.

## Nooit plateau op basis van één sessie
Afgedwongen door de harde MIN_OBSERVATIONS-drempel: een enkele slechte sessie na 2 stabiele resulteert in INSUFFICIENT_DATA, nooit een plateau-classificatie.

## Geen whole-program deload-trigger
PlateauDetectionCore levert uitsluitend een classificatie-status, geen Decision-output, geen deload-instructie, geen koppeling aan ACWR.

## Tests
core/fPlateauDetection.test.js (nieuw, 10/10): golden cases en verplichte false-positive-cases (1 slechte sessie, nieuwe oefening, een PR die plateau voorkomt, canonieke exercise-isolatie). Sabotagebewijs geleverd.

## MS-F7-02 acceptance-gate-toetsing
Letterlijke acceptance gate: "Exercise-specific, not blunt global strain trigger."
Resultaat: CLOSED. Classificatie is strikt exercise-specifiek, geen globale trigger. Hergebruikt bestaande infrastructuur volledig.
