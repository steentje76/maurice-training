# B9-01 Existing-State Forensic Audit — Endurance Data Foundation

**Baseline:** main `a22fff9188a8b23822828572ffd1dcad9b14253c`, APP_VER v4.69.32.

## Data (live, schema-gefilterd `information_schema`)

### `public.sessions` (rijker dan het eerdere F13-P1-10-contract suggereerde)

Naast `distance`/`time_str` bevat `sessions` al: `duration_s` (integer,
seconden -- expliciete SI-eenheid, correct), `hr_avg`, `pace_sec`, `watt`,
`stroke_rate`, `stroke_type`, `calories`, `weather` (jsonb),
`training_instance_id`, `segment_index`/`start_at`/`finish_at` (voor
multi-discipline race-context op sessieniveau zelf). `duration_s` wordt
daadwerkelijk geschreven vanuit `finishSession()` (index.html regel
~16494), maar is **historisch grotendeels leeg** (bevestigd door een
bestaand commentaar in de code zelf: "verzonnen waarde bij ontbrekende
data (bv. duration_s, nog grotendeels leeg)").

`distance` blijft een `integer` zonder expliciete eenheid in de
kolomnaam.

### `public.race_segments`

Multi-discipline race-segmenten (HYROX/triathlon-brick), gekoppeld via
`training_instance_id` + `segment_index` (unieke index aanwezig).
Specifiek voor race-context, geen generiek laps/intervals-model.

### Wearable-connector (`netlify/functions/wearable-sync.js`)

**Bevestigd: uitsluitend HRV/RHR/slaap** (`GOOGLE_HEALTH_DATA_TYPES.hrv/
rhr/sleep`, schrijft naar `hrv_log`). Geen enkele provider-activiteit-
sync bestaat. Geen `provider_activity_id`-concept ergens in de repo
gevonden. Conform sectie 12 van de opdracht: dit blijft eerlijk OPEN,
geen fictieve connectorintegratie gebouwd.

### Overgebleven, zelf gevonden probleem

Een tijdelijke, nooit opgeruimde testindex uit de eerdere F13-P1-12-sprint
(`concurrently_test_idx_sessions_user_date`) staat nog live -- een exacte
duplicaat van de reeds bestaande `idx_sessions_user_date`. Wordt in deze
sprint opgeruimd (zie migratie).

## Calculations (classificatie conform de opdracht se categorieën)

| ID | Naam | Locatie | Classificatie |
|---|---|---|---|
| CALC-END-001 | Pace/Speed/Split-conversie | `core/cardio.js` (`splitFromDistTime`/`timeFromDistSplit`/`distFromTimeSplit`) | **CANONICAL** |
| CALC-END-002 | Erg-vermogen (Concept2-formule) | `core/cardio.js` (`wattFromSplit500`/`splitFromWatt500`) | **CANONICAL** |
| CALC-END-003 | Device-gemeten vs. afgeleid vermogen | Concept/contract, geen losse functie | **CANONICAL (contract-niveau)** |
| CALC-END-004 | Critical Speed | `core/cardio.js` (`criticalSpeed`) | **CANONICAL, bewust NOOIT automatisch op trainingsgeschiedenis gewired** -- expliciet, bestaand commentaar in de functie zelf: het datamodel heeft geen mechanisme om een gelogde rit als genuine maximale-inspanning-tijdrit te markeren. Deze architecturele beperking wordt in B9-01 gerespecteerd, niet opgelost (zou een productbeslissing over UI/markering vereisen -- scope creep). |
| CALC-END-004B | Critical Power | `core/cardio.js` (`criticalPower`) | **Idem als CALC-END-004** |
| CALC-END-005 | TRIMP/aerobic decoupling/HR-zones | -- | **NOT IMPLEMENTED** -- blijft zo, geen nieuwe calculation gebouwd in deze sprint (sectie 10/13: geen scope creep, geen wetenschappelijke claim toevoegen "omdat het logisch klinkt") |

Geen shadow-calculation gevonden. Geen calculation gedupliceerd.

## Consumers

- `sessions.distance`/`duration_s`/`hr_avg`/`watt`/`pace_sec`: gelezen door `finishSession()`, `renderExerciseRow()`, cardio-samenvattingsschermen, `sortExerciseList()`-context.
- `race_segments`: gelezen door de HYROX/triathlon-brick-afrondingsflow.
- Beide vereisen volledige backward compatibility -- `activities` wordt een AANVULLEND, parallel model, geen vervanging.

## Account deletion

`sessions` en `race_segments` staan al in `USER_DATA_TABLES`
(`netlify/functions/delete-account.js` regel 75/85). Nieuwe tabellen
moeten hier expliciet worden toegevoegd (sectie 9 van de opdracht) --
zie de implementatiesectie.

## Conclusie

Het bestaande F13-P1-10-contract is grotendeels bruikbaar, maar het
onderschatte de al bestaande rijkdom van `sessions` (`duration_s`/
`hr_avg`/`watt`/`pace_sec` bestonden al niet ten tijde van dat
contract). B9-01 bouwt een aanvullend, parallel `activities`-model voor
gedetailleerde, lap-niveau endurance-activiteiten -- `sessions` blijft
de canonieke bron voor de bestaande, eenvoudige cardio-logging-flow.
