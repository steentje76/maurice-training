# TRAINEN_V02_FUNCTIONAL_PRESERVATION_MATRIX.md

| Function | Current entry point | Current route | Target Trainen location | Preserve? | Migration method | Test | Status |
|---|---|---|---|---|---|---|---|
| Eerstvolgende training | `v43-train-plan`-div | `openTrainingPreview('vast', id)` | Sectie 1 (Eerstvolgende training) | JA | ongewijzigd (gedeelde `v43RenderPlan()`) | fTrainenV02Migration #7 | PRESERVED |
| Sport-switcher | `#sport-switcher` select | `setActiveSport(value)` | Boven sectie 1 | JA | ongewijzigd | fTrainenV02Migration #3 | PRESERVED |
| Mijn trainingen | rij-knop | `go('s-train-mine')` | Sectie 2 (Jouw training) | JA | herstyled naar `.tk-card-l3` | fTrainenV02Migration #2 | PRESERVED |
| Programma's | rij-knop | `go('s-programma')` | Sectie 2 | JA | herstyled | fTrainenV02Migration #2 | PRESERVED |
| Planning/Kalender | rij-knop | `go('s-kalender')` | Sectie 2 (hernoemd label "Planning") | JA | herstyled, zelfde route | fTrainenV02Migration #2 | PRESERVED |
| Kracht (Workout Builder) | rij-knop | `go('s-builder')` | Sectie 3 (Start een activiteit, tile 1) | JA | herstyled naar quick-act-tile | fTrainenV02Migration #2 | PRESERVED |
| Hardlopen | rij-knop | `go('s-running')` | Sectie 3, tile 2 | JA | herstyled | fTrainenV02Migration #2 | PRESERVED |
| Fietsen | rij-knop | `go('s-cycling')` | Sectie 3, tile 3 | JA | herstyled | fTrainenV02Migration #2 | PRESERVED |
| HYROX | rij-knop | `hyroxOpenSetupDirect('hyrox')` | Sectie 3, tile 4 | JA | herstyled | fTrainenV02Migration #2 | PRESERVED |
| Triathlon-brick | rij-knop | `hyroxOpenSetupDirect('brick')` | Sectie 3, "Meer"-uitklap | JA | verplaatst naar Meer (inline toggle, geen nieuw scherm) | fTrainenV02Migration #2, #4 | PRESERVED |
| Losse oefening | rij-knop | `openLosOefening()` | Sectie 3, "Meer"-uitklap | JA | verplaatst naar Meer | fTrainenV02Migration #2, #4 | PRESERVED |
| Oefeningen (Library) | rij-knop | `go('s-library')` | Sectie 4 (Maken & ontdekken) | JA | herstyled | fTrainenV02Migration #2 | PRESERVED |
| Trainingshistorie/Logboek | rij-knop | `go('s-hist')` | Sectie 5 (Terugkijken) | JA | herstyled | fTrainenV02Migration #2 | PRESERVED |
| Profiel | (nieuw op dit scherm) | `go('s-profiel')` | Header, avatar rechtsboven | N.v.t. (nieuw, bestaande route hergebruikt) | toegevoegd conform baseline | fTrainenV02Migration #1b | ADDED (bestaande route) |
| Dagdetail terug-navigatie | `s-train-detail` header ✕ | `go('s-train-mgr')` | ongewijzigd | JA | niet aangeraakt | fTrainenV02Migration #10 | PRESERVED |
| Kalender terug-navigatie | `s-kalender` header ✕ | `go('s-train-mgr')` | ongewijzigd | JA | niet aangeraakt | fTrainenV02Migration #10 | PRESERVED |
| Bottom-navigatie (5 tabs) | gedeelde `.bnav` | `go('s-home'/'s-lichaam'/'s-coach'/'s-stats')` | ongewijzigd (NAVIGATION MIGRATION DEPENDENCY) | JA | bewust NIET gemigreerd | fTrainenV02Migration #9 | PRESERVED, UNCHANGED BY DESIGN |

**Conclusie: 15 van 15 functies PRESERVED, 1 nieuwe, additieve route (Profiel-avatar, hergebruikt een reeds bestaande bestemming). 0 functies verwijderd.**
