# MS-F2-03_WORKOUT_BUILDER.md — Trainingskompas

**Auditmethode:** volledige lezing van de WB-module (`saveWorkout`, `duplicateWorkout`, `deleteWorkout`, `resumeWorkout`, `moveItem`, `removeItem`) en de Library→Builder-integratie (`libAddToExistingTraining`).

## Bevindingen
Net als bij MS-F2-02 toont deze audit een al zorgvuldig gebouwde kern, geen nieuw defect van vergelijkbare ernst als MS-F2-01:

- **`saveWorkout(name, existingId)`** onderscheidt expliciet update (PATCH, geen nieuwe rij — commentaar bevestigt dit letterlijk: "geen dubbele rij") van een nieuwe training (POST, uniek `custom_<timestamp>`-ID). Renamen is gewoon een update met een nieuwe `name` — geen apart pad, geen risico op state-drift.
- **`duplicateWorkout(wid)`** is een aparte, bewuste actie (uitsluitend bereikbaar via een expliciete gebruikersactie) — nooit een onbedoelde duplicatie via het gewone opslaan.
- **`deleteWorkout(wid)`** verwijdert zowel lokaal (`customTrainings`-array + `localStorage`) als in de database (`sbDelQ`).
- **`resumeWorkout(wid)`** laadt universeel via `exercise_targets`, niet langer beperkt tot `source==='builder'` (expliciete commentaar bevestigt dat dit een eerdere beperking was die is opgeheven — elke custom training is nu hervatbaar in de Builder).
- **Canonical exercise-identity**: `libAddToExistingTraining()` gebruikt de Library's `catalogId` rechtstreeks als plan-item-`id` — geen apart Builder-ID-namespace, dus geen risico op "library-ID A vs builder-ID B voor dezelfde oefening" (sectie 21 van de opdracht).
- **`moveItem`/`removeItem`**: eenvoudige, bounds-checked array-operaties, direct gevolgd door een lokale draft-save.

## Productcontract (sectie 16, 18) bevestigd
"Training maken" opent de Builder als editor; een opgeslagen training verschijnt onder "Mijn trainingen" en loopt (reeds bevestigd in MS-F2-01) via dezelfde `openTrainingPreview('custom', id)` → canonieke Preview/Execution-keten. Geen aparte Builder-specifieke executie-engine.

## Niet onderzocht (buiten scope van deze sprint)
Diepgaande UX-validatie van de Builder-schermen zelf (visuele afronding, empty states) — dat hoort bij MS-F2-08 (UX Benchmark Pass), niet bij deze functionele/data-integriteitsaudit.

## Nieuw: regressiecontract
`core/fWorkoutBuilder.test.js` (13/13, sabotagebewijs geleverd voor de update/insert-onderscheiding) legt de bovenstaande garanties vast.

## MS-F2-03 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Builder as editor behind Training maken; reusable custom workouts."*
**Resultaat: CLOSED** — bevestigd op basis van bestaand, geverifieerd gedrag; geen nieuw gevonden defect vereiste een codewijziging.
