# Architectuurnotitie — Advanced Set Types (A1 Final Gap Closure, v4.61.0)

Niet gebouwd deze sprint, conform expliciete instructie. Uitsluitend analyse.

## Drop sets

- **Datamodelvelden nodig**: `sessionLog[exId].sets[i].dropOf` (index van de
  hoofdset waar dit een drop van is) of een aparte `drops`-array per set.
- **Huidige ondersteuning**: geen. `sessionLog`-structuur (`{wu:[],sets:[]}`)
  kent geen concept van een set die "bij" een andere set hoort.
- **Execution-aanpassing**: een "+ Drop"-actie per set, die een extra,
  gekoppelde invoerrij toont zonder een nieuwe "set X van Y"-telling te
  breken.
- **Logging-aanpassing**: `finishSession()`'s huidige per-set-schrijfweg
  (`sets_detail`) zou een `is_drop`/`drop_of_set`-kolom nodig hebben.
- **Calculation/History-impact**: `oneRMRaw()`/PR-detectie moeten drops
  uitsluiten van 1RM-berekening (een drop-set is per definitie lichter,
  zou anders 1RM-trends vervuilen).
- **Classificatie: A2/A3 candidate.**

## AMRAP

- **Datamodelvelden**: geen vaste `reps`-target, wel een "zoveel mogelijk
  reps"-vlag op oefeningsniveau (`amrap:true` op het voorschrift).
- **Huidige ondersteuning**: het reps-invoerveld bestaat al generiek (vrije
  numerieke invoer) — een AMRAP-set kan technisch al gelogd worden als een
  normale set met een hoog repsgetal, maar zonder de AMRAP-semantiek
  (geen "dit was een AMRAP"-vlag, dus geen aparte weergave/interpretatie).
- **Execution-aanpassing**: label "AMRAP" op de set-kaart i.p.v. een vast
  reps-target.
- **Logging-aanpassing**: klein — een `is_amrap`-boolean zou volstaan,
  reps blijven gewoon reps.
- **Calculation/History-impact**: gering, e1RM-formules werken al met
  willekeurige reps-aantallen.
- **Classificatie: A2/A3 candidate** (kleinste van de vier, laagste
  drempel).

## EMOM

- **Datamodelvelden**: rondetijd (bv. 60s), aantal rondes, werk-per-ronde.
  Dit is fundamenteel **tijdgestuurd**, niet set-gestuurd.
- **Huidige ondersteuning**: geen. De bestaande rusttimer-infrastructuur
  (`startRestTimer()`) is ontworpen voor rust ná een set, niet voor een
  herhalende, vaste-intervaltimer die het WERK zelf aankondigt.
- **Execution-aanpassing**: substantieel — een aparte, herhalende
  countdown-modus, los van de huidige "1 set = 1 invoerveldenrij"-flow.
- **Logging-aanpassing**: per-ronde-data (voltooide reps per interval)
  i.p.v. per-set-data.
- **Calculation/History-impact**: nieuwe aggregatie nodig (totale
  volume over alle rondes).
- **Classificatie: LATER** — vereist een eigen, kleine sub-engine, geen
  incrementele uitbreiding van de bestaande set-logging.

## Endurance intervals (RowErg/BikeErg/SkiErg)

- **Expliciete waarschuwing uit de opdracht**: dit mag NIET als generieke
  strength-set-hack gebouwd worden. Terecht — intervaltraining op erg's
  heeft een fundamenteel andere datastructuur (afstand/tijd/watt/spm per
  interval, rust in seconden tussen intervallen, vaak gekoppeld aan een
  Concept2-device via de al bestaande BLE-integratie).
- **Huidige ondersteuning**: `resolveCardioType()`/cardio-specifieke velden
  bestaan al voor ÉÉN doorlopende cardio-inspanning, niet voor herhaalde
  intervallen binnen één sessie.
- **Execution-aanpassing**: substantieel, vergelijkbaar met EMOM qua
  scope, maar met device-integratie (Concept2 BLE) als extra dimensie.
- **Classificatie: EQUIPMENT/ENDURANCE sprint** — eigen, aparte sprint,
  niet incrementeel toe te voegen aan de huidige strength-executieketen.

## Samenvatting

| Type | Classificatie |
|---|---|
| Drop sets | A2/A3 candidate |
| AMRAP | A2/A3 candidate (laagste drempel) |
| EMOM | LATER |
| Endurance intervals | EQUIPMENT/ENDURANCE sprint |

Geen van deze vier opent A1 opnieuw — de basisexecution (straight sets,
supersets, warm-up sets, cardio-duur) is voor V1 voldoende volwassen,
onafhankelijk van deze toekomstige uitbreidingen.
