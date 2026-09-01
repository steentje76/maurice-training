# B9-H1 Screen Inventory

**Dekking:** deze inventaris behandelt de 20 belangrijkste, meest
gebruikte kernschermen (op basis van gebruiksfrequentie/user-impact,
conform sectie 33). De repo bevat in totaal 93 `<div class="scr">`-
blokken; de resterende ~73 zijn grotendeels varianten (bijv.
meerdere, structureel identieke "Vaste Training A/B"-schermen die
hetzelfde patroon volgen als `s-train-detail`, en sub-schermen onder
Lichaam die een gedeelde renderer gebruiken). Confidence per scherm is
expliciet vermeld; waar onvoldoende bewijs beschikbaar was binnen deze
sprint staat dit als NOT ENOUGH EVIDENCE, niet als verzonnen score.

| SCREEN ID | SCREEN NAME | ROUTE/ENTRY | DOMAIN | PRIMARY USER | PRIMARY JOB | PRIMARY CTA | SECONDARY ACTIONS | BENCHMARK RELEVANCE | UX REVIEW REQUIRED |
|---|---|---|---|---|---|---|---|---|---|
| s-home | Home | App-start | Athlete Core | Alle | Dagoverzicht, snel naar training | Training starten (via card) | Coach-bericht, HRV-kaart, offline-badge, 👥-knop naar Sociaal | Hoog (eerste indruk elke sessie) | JA |
| s-train-mgr | Training | Bottom-nav "Training" | Athlete Core | Alle | Trainingsvorm kiezen/starten | Sport-switcher | Vandaag-plan, doorlink naar Bouwen & verkennen | Hoog | JA |
| s-builder | Workout Builder | Training -> Bouwen | Strength | Gevorderd | Eigen training samenstellen | Oefening toevoegen | Opslaan, sets/reps invullen | Middel | REVIEW |
| s-guided | Guided/Active Workout | Vanuit trainingstart | Strength | Alle | Sets loggen tijdens training | Set voltooien | RPE invoeren, rust-timer, volgende oefening | Hoog (kernactie tijdens training) | JA |
| s-running | Hardlopen | Training -> Bouwen -> Hardlopen | Endurance | Runners | Trainingsvorm kiezen, starten, geschiedenis | Start | Vrij/interval-keuze, geschiedenis-item | Hoog | REVIEW |
| s-running-insights | Hardlopen Inzichten | Hardlopen -> 📊 | Endurance | Runners | Volume/trend begrijpen | N.v.t. (leesscherm) | N.v.t. | Middel | NEE |
| s-cycling | Fietsen | Training -> Bouwen -> Fietsen | Endurance | Fietsers | Rit loggen | Opslaan | Inzichten-link | Middel | NEE |
| s-cycling-insights | Fietsen Inzichten | Fietsen -> 📊 | Endurance | Fietsers | Volume/vermogen begrijpen | N.v.t. | N.v.t. | Middel | NEE |
| s-hyrox | HYROX | Training -> Bouwen -> HYROX | Endurance/Strength | Gevorderd | HYROX-training uitvoeren | Start | Stations-navigatie | Laag-middel | NEE |
| s-lichaam | Lichaam | Bottom-nav "Lichaam" | Recovery/Health | Alle | Lichaamsstatus overzien | Meting toevoegen (＋) | Naar Voeding (🍽️), anatomie, trends | Hoog | JA |
| s-lich-health | Gezondheidsgegevens | Lichaam -> subscherm | Recovery | Wearable-gebruikers | HRV/slaap/RHR bekijken | N.v.t. | N.v.t. | Hoog (voor wearable-gebruikers) | REVIEW |
| s-nutrition | Voeding | Lichaam -> 🍽️ | Nutrition | Alle | Voeding/hydratatie registreren | Toevoegen | Bewerken, verwijderen, datumnavigatie | Middel-hoog (nieuw, B9-09/10/11) | JA |
| s-coach | Coach | Bottom-nav "Coach" | AI Coach | Alle | Coachgesprek/advies | Bericht sturen | N.v.t. | Hoog | REVIEW |
| s-stats | Voortgang | Bottom-nav "Voortgang" | Analytics | Alle | Trends/progressie begrijpen | N.v.t. (leesscherm) | Doelen, PR's, consistentie | Hoog | JA |
| s-social | Sociaal | Home -> 👥 | Social | Sociaal-actieve gebruikers | Profiel/connecties/groepen beheren | Volgen/toevoegen | Accepteren, blokkeren, rapporteren | Middel (nieuw, B9-07/08) | REVIEW |
| s-hist | Geschiedenis | Vanuit Training | Athlete Core | Alle | Eerdere trainingen terugvinden | Item openen | N.v.t. | Middel-hoog | NEE |
| s-onboarding | Onboarding | Eerste app-start | Athlete Core | Nieuwe gebruikers | Profiel/doel instellen | Doorgaan | N.v.t. | Hoog (eerste indruk) | JA |
| s-doelen | Doelen | Voortgang -> Doelen | Analytics | Alle | Doel instellen/volgen | Doel toevoegen | N.v.t. | Middel | NEE |
| s-kalender | Kalender | Training -> Kalender | Athlete Core | Gepland trainende gebruikers | Trainingsschema overzien | Dag selecteren | N.v.t. | Middel | NEE |
| s-settings | Instellingen | Profiel -> Instellingen | Platform | Alle | Account/privacy beheren | N.v.t. | Uitloggen, account verwijderen | Middel (privacy-kritisch) | NEE |

**Niet individueel behandeld in deze sprint (NOT ENOUGH EVIDENCE voor
een losse score, wel benoemd):** `s-library`/`s-programma`/
`s-programma-detail` (Programmabeheer), `s-lich-cyclus`/`s-lich-
metingen`/`s-lich-spieren`/`s-lich-verbanden` (Lichaam-subschermen),
`s-hyrox-perf`, `s-train-mine`/`s-train-detail` (en de daaruit
gegenereerde, meerdere vaste-trainingsvarianten), `s-meldingen`,
`s-profiel`, `s-privacy`, `s-admin`/`s-admin-pin` (beheerdersfunctie,
niet athlete-facing), `s-auth`/`s-auth-newpass`/`s-help`/`s-intake`.
