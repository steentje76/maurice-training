# B9-H1 Current Information Architecture

Gebaseerd op de daadwerkelijke, actuele bottom-navigatie (5 tabs,
identiek op elk hoofdscherm) en de route-structuur in `index.html`.
Nieuwe B9-07/08/09/10/11-bestemmingen (Sociaal, Voeding) hebben BEWUST
GEEN eigen bottom-nav-tab gekregen (zie eerdere sprintrapporten) --
ze zijn bereikbaar via een knop op een bestaand hoofdscherm, wat zelf
al een geregistreerde, open UX-vraag is (zie Gap Registry, B9G-UX-001).

```
Home (bottom-nav)
 ├─ Coach-bericht / HRV-kaart (op de hero)
 ├─ 👥 Sociaal (knop rechtsboven -- GEEN bottom-nav-item)
 │   ├─ Profiel/privacy
 │   ├─ Connecties (volgen/accepteren)
 │   ├─ Groepen
 │   ├─ Challenges
 │   ├─ Feed (gedeelde activiteiten, reacties)
 │   └─ Meldingen
 └─ Offline-badge (queue-status)

Training (bottom-nav)
 ├─ Sport-switcher + "Vandaag"-plan
 ├─ Bouwen & verkennen
 │   ├─ Workout Builder
 │   ├─ Hardlopen -> Inzichten (📊)
 │   ├─ Fietsen -> Inzichten (📊)
 │   └─ HYROX
 ├─ Kalender
 ├─ Mijn Trainingen (s-train-mine)
 └─ Geschiedenis (s-hist)

Lichaam (bottom-nav)
 ├─ Metingen toevoegen (＋)
 ├─ 🍽️ Voeding (knop rechtsboven -- GEEN bottom-nav-item)
 │   └─ Dagoverzicht / datumnavigatie / Inzichten (B9-11)
 ├─ Gezondheidsgegevens (HRV/slaap/RHR)
 ├─ Cyclus (Women's Performance, indien van toepassing)
 ├─ Metingen/spieren/verbanden (subschermen)
 └─ Anatomie/trends

Coach (bottom-nav)
 └─ AI-coachgesprek

Voortgang (bottom-nav)
 ├─ Doelen
 ├─ Persoonlijke records
 ├─ Consistentie
 └─ Multisport endurance-overzicht (B9-06)
```

## Waargenomen structurele bevindingen (nog niet aangepast, alleen geregistreerd)

- **Sociaal en Voeding hebben geen eigen bottom-nav-plek** -- beide
  zijn bereikbaar via een klein icoon op respectievelijk Home en
  Lichaam. Dit is een bewuste, conservatieve keuze geweest in eerdere
  sprints (om geen brede bottom-nav-refactor te riskeren), maar
  betekent wel een extra, minder voor de hand liggende stap voor twee
  volwaardige productdomeinen. Zie B9G-UX-001.
- **Vier van de vijf bottom-nav-labels dekken een enkel domein
  (Training/Lichaam/Coach/Voortgang), maar "Home" fungeert als een
  vijfde, generieke verzamelplek** die zelf ook weer naar Sociaal
  doorverwijst -- de navigatie is daarmee niet volledig orthogonaal.
