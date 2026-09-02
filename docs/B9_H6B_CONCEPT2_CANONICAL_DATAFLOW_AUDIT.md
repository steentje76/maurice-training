# B9-H6B Concept2 Canonical Dataflow Audit

## Kernbevinding: `sessions` en `activities` zijn GEEN parallelle waarheden

Forensisch onderzoek (niet blind vertrouwd op de bestaande B9-06-
commentaar, zelfstandig geverifieerd via het live databaseschema)
toont aan: `sessions` is **niet** een verouderde, endurance-specifieke
tabel die "vervangen zou moeten worden" door `activities`. Het is de
generieke, canonieke **workout execution log** voor Training Core --
gebruikt voor kracht (sets/reps/weight/rpe), CrossFit/WOD (wod_name/
wod_type/rounds/score), én ergometer-cardio (distance/time_str/watt/
stroke_rate/pace_sec), allemaal gekoppeld via `exercise_id` en
optioneel `training_instance_id` (programma-koppeling).

`activities` (B9-01) is specifiek ontworpen voor **standalone,
GPS/duration-gebaseerde endurance-activiteiten** (Running/Cycling) die
niet noodzakelijk binnen een oefenprogramma vallen.

**Dit zijn twee, conceptueel verschillende modellen voor twee
verschillende soorten training-logging** (programma-/oefening-
gebonden workout-uitvoering vs. losstaande sport-activiteit) -- geen
duplicaat-waarheid voor dezelfde data.

## Beantwoording van de verplichte auditvragen

- **Welke Concept2-data zit uitsluitend in sessions?** Alle bestaande
  Concept2-data (11 live rijen met watt/stroke_rate gevuld, van 118
  totaal sessions).
- **Welke data kan veilig naar activities?** Conceptueel zou een
  volledig *standalone* Concept2-workout (10 van de 11 bestaande
  rijen hebben geen `training_instance_id`) qua vorm passen in
  `activities`. Maar dit zou de mogelijkheid verliezen om een
  Concept2-interval binnen een CrossFit-WOD te loggen (mogelijk via
  `sessions.wod_type`/`training_instance_id`) -- een echte, functionele
  regressie voor toekomstig gebruik, niet alleen een technische
  overweging.
- **Welke data hoort bewust in sessions te blijven?** Elke Concept2-
  workout die binnen een trainingsprogramma of WOD wordt gelogd.
- **Is sessions workout-execution history? Is activities sport/
  activity history?** Ja voor beide -- bevestigd, correct, geen
  overlap.
- **Moeten beide bestaan?** **JA.** Dit is geen technische schuld, dit
  is een bewuste, correcte scheiding tussen twee productcapabilities.
- **Moet activities een canonical projection worden?** **NEE** voor
  de volledige tabel. Een gedeeltelijke, alleen-lezen projectie voor
  longitudinal-intelligence-doeleinden (sectie 13) is wel mogelijk
  zonder de onderliggende opslag te wijzigen -- zie hieronder.
- **Is migratie of dual-write veiliger?** **Geen van beide is nodig.**
  Zowel migratie als dual-write zouden onnodige complexiteit en
  risico introduceren (dedupe-logica tussen twee tabellen, dubbele
  schrijfpaden, risico op het breken van de bestaande, werkende
  `concept2Live.js`/`index.html`-flow) voor een probleem dat bij
  nader onderzoek niet bestaat: er is geen bewezen functionele
  noodzaak (sectie 5: "refactor alleen als functioneel nodig").

## Live productiedata (bewijs voor "geen dataverlies"-vereiste)

118 totaal `sessions`-rijen, 11 met ergometer-velden gevuld (watt/
stroke_rate), waarvan 10 standalone (geen `training_instance_id`) en 1
binnen een programma. Geen enkele rij zou verloren gaan bij het NIET
migreren -- de conservatieve keuze (niets wijzigen aan de opslag)
introduceert per definitie 0 risico op dataverlies.

## Conclusie: bestaande B9-06-architectuurbeslissing bevestigd, niet blind overgenomen

De eerdere, in `index.html` gedocumenteerde beslissing ("Rowing/
Concept2 blijft LEGACY op sessions... geen bewezen noodzaak voor een
risicovolle refactor") is **zelfstandig, onafhankelijk herbevestigd**
via forensisch databaseonderzoek, niet blind aangenomen. De conclusie
is sterker onderbouwd dan voorheen: `sessions` is niet "legacy" in de
zin van verouderd/inferieur -- het is het architecturaal juiste model
voor programma-/oefening-gebonden workout-logging, waar Concept2
functioneel thuishoort naast kracht en WOD's.

## Wat WEL wordt gebouwd deze sprint (sectie 8: pace/unit safety)

Geen migratie. Wel: harde regressiebescherming tegen het exact
gerepareerde B9-H6-defect (BikeErg 500m-vs-1000m-split-basis-bug),
zodat een toekomstige wijziging deze fout niet per ongeluk
herintroduceert. Zie `core/fB9_H6BPaceBasisRegressionGuard.test.js`.
