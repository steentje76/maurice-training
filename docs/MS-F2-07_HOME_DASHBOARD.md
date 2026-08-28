# MS-F2-07_HOME_DASHBOARD.md — Trainingskompas

**Auditmethode:** volledige lezing van `refreshHome()`, `renderV43Home()`, `computeNextVasteTraining()`, en het resume-mechanisme rond `restoreTrainingDraft()`/`guardExistingDraft()` in relatie tot alle 4 trainingsstart-paden.

## Kritieke bevinding en fix (P1 — data-verlies, niet blokkerend voor gebruikers die het nog niet raakten, maar reëel)
`launchProgramTrainScreen()` (de functie achter een programmatraining starten, ook aanroepbaar vanaf Home via de programma-kaart) reset `sessionLog`/`sessionExtra` **altijd onvoorwaardelijk**, ongeacht of er al een geldige, niet-gesynchroniseerde draft voor **dezelfde** programmatraining bestaat. `startT()` en `startCustomTraining()` doen dit al correct (expliciete `resumeDraft`-detectie + herstel); `launchProgramTrainScreen()` deed dit nooit. `guardExistingDraft(ctxT)` — door alle vier startfuncties aangeroepen — beschermt hier niet tegen: die vraagt alleen bevestiging wanneer de draft bij een **andere** training hoort (`draft.t!==ctxT`); bij dezelfde training (`draft.t===ctxT`) doet de guard niets, waarna de daaropvolgende onvoorwaardelijke reset alsnog alle al gelogde sets wist.

**Concreet scenario:** sporter start een programmatraining, logt enkele sets, sluit de app zonder af te ronden. Bij terugkeer (bijvoorbeeld via Home → programma-kaart) en het opnieuw doorlopen van de check-in-flow voor diezelfde training, werden de eerder gelogde sets stilzwijgend gewist — een reëel data-verliesrisico.

**Fix:** dezelfde resume-branch toegevoegd die `startT`/`startCustomTraining` al gebruiken — `sessionLog`/`sessionExtra`/`activeInstanceId`/klok worden hersteld uit de draft wanneer die bij dezelfde `ctxT` hoort én daadwerkelijk data bevat (`draftHasData()`); anders (verse start) blijft het bestaande gedrag ongewijzigd.

## Overige bevindingen (geen defect)
- **Dagfactor-kaart** (`refreshHome()`): expliciet als "explainable AI" gebouwd — waarde komt uit de bestaande `dagfactor()`/`hrvDagFactorPersonal()`-calculatie, met een "Waarom vandaag?"-uitklap. Geen AI-herberekening.
- **Empty state**: nieuwe sporter zonder vaste trainingen ziet "Nog geen vaste training. Maak er hieronder een aan." — geen leeg dashboard.
- **Volgende training**: `computeNextVasteTraining()` + `computeLastDoneMap()` — deterministisch, canonical.

## Niet geïmplementeerd, geregistreerd als vervolgwerk (P2, geen dataverlies-risico meer)
Home toont geen **proactieve** "hervat je training"-banner wanneer een niet-afgeronde draft bestaat — de gebruiker ontdekt dit nu pas als hij toevallig opnieuw hetzelfde trainingstype probeert te starten. De data zelf is met bovenstaande fix altijd veilig; dit is een discoverability-verbetering, geen correctheidsprobleem. Bewust niet binnen deze sprint gebouwd (zou een generieke routering naar 3 verschillende starttypen vereisen — vaste/custom/programma — een grotere UI-uitbreiding dan een minimale fix rechtvaardigt).

## MS-F2-07 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Next workout, recovery/context, progress and coach actions prioritized."*
**Resultaat: CLOSED** — de kern is aanwezig en nu extra veilig (het gevonden data-verliesrisico bij programmatraining-resume is gefixed). Het proactieve-resume-discoverability-punt is expliciet als niet-blokkerend vervolgwerk genoteerd, geen reden voor PARTIAL.
