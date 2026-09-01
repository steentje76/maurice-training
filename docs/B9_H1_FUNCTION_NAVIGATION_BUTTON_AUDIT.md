# B9-H1 Function Location, Navigation & Button Audit

## Function Location Audit (steekproef, kernfuncties)

| FUNCTION | CURRENT LOCATION | EXPECTED MENTAL MODEL | COMPETITOR PATTERN | TAP COUNT | DISCOVERABILITY | KEEP/MOVE/MERGE/SPLIT/REMOVE/REVIEW |
|---|---|---|---|---|---|---|
| Voeding registreren | Lichaam -> 🍽️-icoon | Sommige gebruikers verwachten dit onder Training (i.v.m. timing_context) of een eigen hoofdplek | MyFitnessPal/Cronometer: eigen hoofdtab | 2 (Lichaam -> icoon -> toevoegen) | Middel (icoon is klein, geen label zichtbaar tot geopend) | REVIEW |
| Sociaal | Home -> 👥-icoon | Vergelijkbaar met Voeding: verwacht op een herkenbare, gelabelde plek | Strava: eigen hoofdtab ("Feed") | 2 | Middel | REVIEW |
| Hardlopen/Fietsen Inzichten | Binnen sportscherm, apart 📊-knop | Logisch (bij de sport zelf) | Garmin Connect: sub-tab binnen activiteit | 1 (vanaf sportscherm) | Hoog | KEEP |
| Multisport-overzicht | Voortgang-scherm, tussen kaarten | Kan ook logisch onder Training gevonden worden | Strava: los "Training"-overzicht | 1 (vanaf Voortgang) | Middel | REVIEW |
| HRV/Herstel | Home-hero (kaart) + Lichaam -> Gezondheidsgegevens | Consistent op beide plekken | WHOOP: eigen hoofdscherm | 0-1 | Hoog | KEEP |

## Navigation Audit

- **Bottom-navigatie:** 5 tabs (Home/Training/Lichaam/Coach/Voortgang),
  consistent op elk hoofdscherm dat een bottom-nav heeft. Geen
  duplicate destinations gevonden binnen de bottom-nav zelf.
- **Sociaal en Voeding zijn "orphan" t.o.v. de bottom-nav** -- ze zijn
  wel bereikbaar, maar niet zichtbaar als gelijkwaardig hoofddomein
  naast Training/Lichaam/Coach/Voortgang. Dit is geen "dead end" (er
  is een expliciete terug-knop), maar wel een discoverability-gap.
- **Terug-navigatie:** elk onderzocht subscherm heeft een expliciete
  `←`-knop naar het logische oudersscherm (bijv. Voeding -> Lichaam,
  Sociaal -> Home, Hardlopen-Inzichten -> Hardlopen). Geen "excessive
  depth" gevonden binnen de onderzochte kernschermen (max. 2-3 niveaus
  diep vanaf Home).
- **Geen wezenlijke, onverklaarde "wrong parent"-gevallen gevonden**
  binnen de onderzochte kernschermen.

## Button Audit (steekproef)

- **Opslaan-terminologie is inconsistent tussen domeinen:** Nutrition
  gebruikt "Toevoegen"/"Wijzigingen opslaan", Social gebruikt "Profiel
  opslaan"/"Groep aanmaken", Training gebruikt vermoedelijk andere
  termen (niet in deze steekproef bevestigd -- NOT ENOUGH EVIDENCE voor
  een volledige, repo-brede terminologie-inventaris binnen deze sprint).
  Zie B9G-UX-002.
- **Primaire actie-knoppen zijn consistent onderaan een kaart/formulier
  geplaatst** in de onderzochte, nieuwere schermen (Sociaal, Voeding) --
  consistent patroon, geen probleem gevonden.
- **Iconen zonder zichtbaar label** (🍽️ op Lichaam, 👥 op Home, ✎/🗑
  op Voeding-entries) hebben wel een `aria-label`, maar geen zichtbare
  tekst -- een nieuwe gebruiker moet het icoon interpreteren. Zie
  B9G-UX-001 (gerelateerd aan de discoverability-gap hierboven).

## Tap Count (kernworkflows, geschat op basis van bekende routecode)

| Workflow | Geschat aantal taps | Notitie |
|---|---|---|
| Voeding-entry toevoegen | 3 (Lichaam -> 🍽️ -> invullen -> Toevoegen) | Snel, geen overbodige stappen |
| Sociaal: iemand volgen | 3 (Home -> 👥 -> zoeken -> Volgen) | Acceptabel |
| Hardlopen starten (vrij) | 3-4 (Training -> Bouwen -> Hardlopen -> Vrij -> Start) | Consistent met eerdere B9-02-tapcount-metingen |
| Hydratatie snel loggen | 4 (Lichaam -> 🍽️ -> preset-knop -> Toevoegen) | Preset (+250ml) bespaart typewerk, maar het scherm zelf kost nog steeds 2 taps om te bereiken |

**NOT ENOUGH EVIDENCE** voor een volledige, herhaalbare tap-telling van
alle in sectie 18 genoemde workflows (set loggen, RPE invoeren, workout
afronden, coach-athlete openen) binnen de tijd van deze audit-sprint --
dit vereist live doorlopen van elke flow, wat voor een toekomstige,
diepere UX-sprint is voorbehouden.
