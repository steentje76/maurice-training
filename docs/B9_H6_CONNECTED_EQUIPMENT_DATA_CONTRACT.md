# B9-H6 Connected Equipment Data Contract

## Canonical units (bevestigd, sectie 17)

| Metric | Unit | Notitie |
|---|---|---|
| distance | meter | canoniek, nooit display-format |
| time/duration | seconde | canoniek, nooit "mm:ss"-string als opslag |
| pace (RowErg/SkiErg) | sec/500m | Concept2-conventie |
| pace (BikeErg) | sec/1000m | **gecorrigeerd deze sprint** -- was ten onrechte 500m |
| power | watt | |
| stroke rate | spm | RowErg/SkiErg |
| cadence | rpm | BikeErg |
| heart rate | bpm | |

## Missing != zero (sectie 15, bevestigd)

`_num()` in `core/concept2Live.js` retourneert `null` voor ontbrekende/
ongeldige waarden, nooit `0`. Geconsumeerd door `normalizeLiveMetric()`.

## Sport mapping (bevestigd, geen shadow-domain-bug)

`MACHINE_EXERCISE = { rowerg: 'roeien', skierg: 'skierg', bikeerg:
'bikeerg', dynamic: 'roeien' }` -- elke machinefamilie heeft een eigen,
canonieke identiteit. `machineMatchesExercise()` detecteert actief een
mismatch tussen het gekoppelde apparaat en de gekozen oefening.

## Opslagbestemming (belangrijke, architecturale bevinding)

Concept2-familie-data (RowErg/SkiErg/BikeErg) wordt opgeslagen in de
`sessions`-tabel (per-exercise, legacy-architectuur), NIET in de
canonieke `activities`-tabel. Zie de existing-state audit voor de
volledige toelichting en de gevolgen hiervan.
