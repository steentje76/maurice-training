# B9-H6 Ergometers & Connected Equipment — Forensische Existing-State Audit

## Kernbevinding

Concept2 (RowErg/SkiErg/BikeErg via PM5) is grondig, correct gebouwd
en getest (fConcept2Live 95/95, fConcept2MidWorkoutIsolation 10/10,
zelfstandig herdraaid, 0 gefaald vóór wijziging). Tijdens deze sprint
is één echte, definitief bevestigde bug gevonden en gerepareerd, en is
een belangrijke architecturale beperking vastgesteld en gedocumenteerd.

## Capability-overzicht

| CAPABILITY | STATUS | EVIDENCE |
|---|---|---|
| Concept2 realtime (BLE/PM5) | SOFTWARE IMPLEMENTED, SOFTWARE TESTED | `core/concept2Live.js`, 95/95 |
| Mid-workout isolatie (reconnect/disconnect-veiligheid) | SOFTWARE TESTED | `fConcept2MidWorkoutIsolation`, 10/10 |
| RowErg sport-mapping | IMPLEMENTED, correct | `roeien` |
| SkiErg sport-mapping | IMPLEMENTED, correct, apart van RowErg | `skierg`, eigen canonieke identiteit |
| BikeErg sport-mapping | IMPLEMENTED, correct, apart van RowErg | `bikeerg`, eigen canonieke identiteit |
| Machine-mismatch-detectie | IMPLEMENTED | `machineMatchesExercise()`, proactieve waarschuwing |
| **BikeErg-splitbasis** | **WAS UNSAFE (bug), NU GEREPAREERD** | zie hieronder |
| Missing != zero | IMPLEMENTED | `_num()`, retourneert null |
| RLS/security | IMPLEMENTED, live herbevestigd | anon geweigerd op functieniveau, cross-user geweigerd |
| Technogym/EGYM/andere vendors | NOT PRESENT | geen code/architectuur gevonden |
| FTMS (generieke BLE-standaard) | NOT PRESENT | 0 treffers in de codebase |
| Device control (resistance/target power) | NOT PRESENT | uitsluitend read/capture, geen control-functionaliteit -- correct, conform sectie 33 ("niet toevoegen in deze sprint") |

## Zelf gevonden en gerepareerde echte bug (kernresultaat van deze sprint)

**BikeErg gebruikte een onjuiste 500m-splitbasis in de handmatige-
invoer-configuratie (`CARDIO_TYPES.bikeerg` in `index.html`).**
Officieel, meervoudig bevestigd tegen de Concept2 PM5-productmanual en
meerdere onafhankelijke bronnen: Concept2 se eigen conventie is
expliciet "time/500m for indoor rowers and SkiErg; time/1000m for
BikeErg". De realtime PM5-weergave (`core/concept2Live.js` se
`paceBasisFor()`) gebruikte AL correct 1000m voor BikeErg -- de bug
zat uitsluitend in de aparte, handmatige-invoer-configuratie, die
hiermee inconsistent was. Dit zou een exact-factor-2-fout hebben
veroorzaakt in elke handmatig ingevoerde of via het formulier
opgeslagen BikeErg-pace.

**Gerepareerd:** `splitUnit`/`calc.basis` gecorrigeerd naar `/1000m`/
`1000`, consistent met de al-correcte realtime-code. Live sabotage
bevestigt de fix: teruggezet naar 500 -> 2 tests (`fB9_H6...` en het
reeds bestaande `cardio.test.js`) falen correct, teruggedraaid.

**Bijkomende bevinding:** de bestaande `core/cardio.test.js` bevatte
zelf de verouderde aanname ("Concept2-devices delen split-basis
500m") -- deze test is bijgewerkt naar de nu correcte, officieel
onderbouwde verwachting.

## Belangrijke architecturale bevinding: Concept2-familie loopt via `sessions`, niet `activities`

Concept2-gerelateerde workouts (RowErg/SkiErg/BikeErg, zowel realtime
als handmatig ingevoerd) worden opgeslagen in de oudere, per-exercise
`sessions`-tabel (`cardioDataToRow()` schrijft expliciet naar een
"sessions-row", bevestigd via code-commentaar), NIET in de nieuwere,
canonieke `activities`-tabel die door B9-01/B9-H3B is geïntroduceerd
voor Running/Cycling/Rowing/Swimming-cloud-ingestie. Dit betekent dat
Concept2-data **niet** wordt geconsumeerd door `runningIntelligence.js`/
`cyclingIntelligence.js` (die specifiek op `activities` filteren, bijv.
`sport=eq.cycling`). Repo-brede audit bevestigt: 0 queries filteren op
`sport=eq.bikeerg`/`sport=eq.skierg` tegen `activities` -- consistent
met deze vaststelling, geen inconsistentie gevonden.

**Dit is een bestaande, eerdere architectuurkeuze (niet nieuw
geïntroduceerd of per ongeluk ontstaan tijdens deze sprint), en wordt
niet binnen deze sprint gemigreerd** -- een volledige migratie van
`sessions` naar `activities` voor de Concept2-familie zou een grote,
risicovolle operatie zijn die buiten de scope en het risicoprofiel van
deze hardening-sprint valt. Vastgelegd als een reële, functionele
beperking: Concept2-trainingen profiteren nog niet van de moderne
trend/progression-analyse die Running/Cycling via `activities` wel
hebben. Geregistreerd als PRODUCT DECISION OPEN voor een toekomstige,
aparte sprint.

## Technogym/EGYM/andere vendors

Geen code, migratie, of architectuur gevonden die enige vendor uit
sectie 34 daadwerkelijk ondersteunt. Zie
`docs/B9_H6_CONNECTED_EQUIPMENT_PROVIDER_RESEARCH.md`.
