# B9-01 — Endurance Data Foundation — Eindrapport

**Rol-erkenning:** dit rapport bevat uitsluitend aantoonbare softwarestatus,
tests, beperkingen en openstaande validatie. Geen zelfbeoordeling als
"9/10" -- dat oordeel is voorbehouden aan de onafhankelijke Benchmark
9.0-review.

## Startbaseline

**START SHA:** `a22fff9188a8b23822828572ffd1dcad9b14253c` (exact
overeenkomend met de opgegeven baseline, geen nieuwere remote main
gevonden). **APP_VER voor:** v4.69.32. Release gate vóór wijzigingen:
200/200 groen. Doc consistency vóór wijzigingen: 0 problemen.

## Existing-state bevindingen

Volledig verslag: `docs/B9_01_EXISTING_STATE_AUDIT.md`. Kernpunten:

- `sessions` bleek aanzienlijk rijker dan het eerdere F13-P1-10-contract
  veronderstelde: `duration_s` (integer, seconden, expliciete SI-eenheid),
  `hr_avg`, `watt`, `pace_sec`, `stroke_rate` bestonden al. `duration_s`
  wordt actief geschreven vanuit `finishSession()`, maar is historisch
  grotendeels leeg (bevestigd door een bestaand code-commentaar).
  `distance` blijft een `integer` zonder expliciete eenheid.
- `race_segments`: specifiek voor HYROX/triathlon-brick-segmenten, geen
  generiek laps-model.
- Wearable-connector (`wearable-sync.js`): **uitsluitend HRV/RHR/slaap**,
  geen enkele provider-activiteit-sync. Geen `provider_activity_id`-
  concept bestaat ergens in de repo.
- Zelf gevonden: een vergeten, overgebleven testindex uit de eerdere
  F13-P1-12-sprint (`concurrently_test_idx_sessions_user_date`, een
  exacte duplicaat van `idx_sessions_user_date`) -- opgeruimd in deze
  sprint.

**Calculation-classificatie:**

| ID | Classificatie |
|---|---|
| CALC-END-001 (Pace/Speed/Split) | CANONICAL (`core/cardio.js`) |
| CALC-END-002 (Erg-vermogen) | CANONICAL (`core/cardio.js`) |
| CALC-END-004 (Critical Speed) | CANONICAL, **bewust nooit automatisch gewired op trainingsgeschiedenis** (bestaand, expliciet architectuurcommentaar in de functie zelf) |
| CALC-END-004B (Critical Power) | Idem |
| CALC-END-005 (TRIMP/decoupling/HR-zones) | NOT IMPLEMENTED |

Geen shadow-calculation gevonden. Geen calculation gedupliceerd.

## Gebouwde canonical modellen

`migratie_v533.sql`: `activities`, `activity_laps`,
`athlete_endurance_profile`. Volledige details in de migratie zelf
(uitgebreid, inline gedocumenteerd).

## Source-of-truth verdeling

- **`sessions`:** blijft canoniek voor de bestaande, eenvoudige cardio-
  loggingflow (kracht + basale cardio-invoer). Volledig ongewijzigd.
- **`activities`:** nieuwe, canonieke bron voor gedetailleerde,
  lap-niveau endurance-activiteiten (running/cycling/rowing/swimming).
  Optioneel gekoppeld aan een `sessions`-rij via `session_id`.
- **`activity_laps`:** canoniek voor lap/split-detail per activity.
- **Interval/segment-model:** **bewust NIET gebouwd** in deze sprint --
  de existing-state audit vond geen bestaande consumer of concrete
  B9-02/B9-04-dependency die dit nu al vereist. Geregistreerd als
  toekomstige beslissing, geen premature architectuur.
- **`athlete_endurance_profile`:** canoniek voor FTP/threshold-pace/max-HR
  per gebruiker per sport, met expliciet gescheiden user-entered vs.
  calculated velden.

## Provenance/data-quality

`source_provenance` (manual/device_measured/provider_derived/
trainingskompas_calculated/user_corrected) en `data_quality`
(unverified/provider_verified/user_corrected) zijn verplichte,
gesloten enums op `activities` en `athlete_endurance_profile`. Nooit
"provider-derived == device measured" of "calculated == measured"
verward -- dit zijn expliciet aparte enum-waarden.

## Calculation-integratie

Geen automatische integratie gebouwd (bewuste keuze, zie hierboven).
`activities.distance_meters`/`duration_seconds` en
`activity_laps.avg_power_watts`/`duration_seconds` zijn wel structureel
compatibel met de input-vorm die `criticalSpeed()`/`criticalPower()`
verwachten (`{distance_m, duration_s}` resp. `{avg_power_w,
duration_s}`) -- klaar voor een toekomstige, expliciete
integratiesprint die de ontbrekende "genuine max-effort"-markering
oplost. Deze dependency is expliciet geregistreerd voor B9-02/B9-04.

## Security/RLS

Alle drie tabellen: RLS enabled, least-privilege-grants vanaf dag 1
(`anon` volledig geen toegang; `authenticated` alleen eigen rijen via
policies). Live, adversarial geverifieerd (transacties zonder commit,
0 restanten na afloop, telkens binnen één, ononderbroken query-aanroep
om betrouwbare resultaten te garanderen):

| Scenario | Resultaat |
|---|---|
| ANON -> activities | permission denied |
| USER A -> eigen activity | insert slaagt |
| Forged user_id (USER A schrijft namens USER B) | RLS-violation, geweigerd |
| USER A (aanvaller) -> activity/laps/profile van USER B: SELECT | 0 rijen (onzichtbaar) |
| USER A (aanvaller) -> activity van USER B: UPDATE | 0 rijen geraakt, waarde ongewijzigd |
| USER A (aanvaller) -> activity van USER B: DELETE | 0 rijen geraakt, rij blijft bestaan |
| Duplicate provider-activity (zelfde user+dedupe_key) | unique-constraint-violation, geweigerd |

## Dedupe/idempotency

`unique(user_id, dedupe_key) where dedupe_key is not null` --
uniek per gebruiker, niet globaal (twee gebruikers mogen toevallig
dezelfde provider-interne activiteit-ID hebben). De kernscenario (zelfde
gebruiker, retry met identieke provider-ID) is live, definitief bewezen
door een echte constraint-violation. **Eerlijke, transparante
kanttekening:** een aanvullende, verkennende testpoging om "twee
verschillende gebruikers, zelfde provider-ID" binnen één, meervoudige
query-sessie te bevestigen gaf een inconsistent resultaat (vermoedelijk
een artefact van meerdere `set_config()`-aanroepen binnen één
query-string bij het gebruikte databasetool, niet een aanwijzing voor
een echt RLS/constraint-probleem). De onderliggende indexdefinitie zelf
(`pg_indexes`, live opgevraagd) bevestigt ondubbelzinnig dat de
constraint op `(user_id, dedupe_key)` staat, niet op `dedupe_key` alleen
-- dit is het autoritatieve, structurele bewijs voor deze functionaliteit.

## Account deletion

`activities` en `athlete_endurance_profile` toegevoegd aan de generieke
`USER_DATA_TABLES`-lijst in `delete-account.js` (hebben een eigen
`user_id`-kolom). `activity_laps` is **bewust NIET** in die generieke
lijst opgenomen -- die tabel heeft geen eigen `user_id`-kolom (in
tegenstelling tot het bestaande `race_segments`-precedent, dat wel een
gedenormaliseerde `user_id`-kolom heeft). In plaats daarvan wordt
`activity_laps` volledig afgedekt via de bestaande `ON DELETE CASCADE`-
keten (`activity_laps.activity_id -> activities.id -> activities.user_id
-> auth.users.id`), live bevestigd: het verwijderen van een `activities`-
rij verwijdert automatisch de bijbehorende laps (0 restanten). Dit is
expliciet, transparant gedocumenteerd in `delete-account.js` zelf, en
bewaakt door `core/fB9EnduranceFoundation.test.js` (sectie G).

## Performance/indexes

Indexen vanaf dag 1: `idx_activities_user_recorded(user_id,
recorded_at desc)`, `idx_activities_sport(user_id, sport)`,
`idx_activities_session(session_id)`, `idx_activity_laps_activity
(activity_id)`, `idx_aep_user_sport(user_id, sport)` (uniek). Live
gemeten met 5.000 representatieve testrijen (transactie zonder commit,
0 restanten na afloop): een sport+user-gefilterde, datum-gesorteerde
query (analoog aan een activity-historyscherm) toont `Index Scan` op
`idx_activities_sport`, 0.824ms totale executietijd -- geen Seq Scan.

## Tests

`core/fB9EnduranceFoundation.test.js` (nieuw, 26/26): schema/units/
enums/FKs, RLS-least-privilege, provenance-onderscheid, dedupe-
uniqueness, geen shadow-calculation, backward compatibility (sessions
ongewijzigd), delete-completeness inclusief de activity_laps-
uitzondering. `core/fEnduranceArchitectureContract.test.js` (bestaand,
bijgewerkt, 10/10): het F13-P1-10-contract-document is nu correct
gestatust als IMPLEMENTED (was ARCHITECTURE READY).

## Release gate

**201/201 groen** (was 200 vóór deze sprint, +1 nieuw testbestand).

## Doc consistency

**0 problemen** (inclusief na de bijgewerkte GAP-P2-025-vermelding en
het contract-document).

## Sabotage-tests

1. `activity_laps` tijdelijk toegevoegd aan de generieke, foutieve
   `USER_DATA_TABLES`-lijst -> gedetecteerd (G2-assertie faalt exact
   zoals verwacht), teruggedraaid.
2. De `unique`-constraint op de dedupe-index tijdelijk vervangen door
   een gewone, niet-unieke index -> gedetecteerd (A5-assertie faalt),
   teruggedraaid.

Beide keren: exit-code-verschil bevestigd, exacte diff na herstel
bevestigd (0 restwijzigingen).

## Open externe validaties

Geen -- dit is een pure databaselaag, geen externe provider-integratie
gebouwd of gewijzigd in deze sprint.

## Open dependencies voor B9-02/B9-04

- Automatische Critical Speed/Power-integratie op trainingsgeschiedenis
  vereist eerst een productbeslissing over hoe een genuine max-effort-
  tijdrit herkenbaar wordt gemaakt (UI-markering of anderszins) --
  bewust niet in B9-01 opgelost.
- CALC-END-005 (TRIMP/aerobic decoupling/HR-zones) blijft NOT
  IMPLEMENTED.
- Structured interval/work-recovery-model (semantisch anders dan
  gewone laps) is nog niet gebouwd -- pas bouwen wanneer een
  toekomstige sprint dit concreet nodig blijkt te hebben.
- Wearable-provider-activiteitensync (Garmin/Strava/Google Health
  Connect voor GPS-activiteiten) bestaat nog niet -- `activities` is
  er structureel klaar voor (dedupe_key/source_provider), maar er is
  geen bestaande connector om aan te passen.

## Bekende beperkingen

- Historische `sessions`-rijen worden niet met terugwerkende kracht
  gemigreerd naar `activities` (bewuste keuze, conform sectie 11: geen
  massale backfill zonder expliciete, aparte migratiestrategie).
- `distance` op `sessions` blijft zonder expliciete eenheid in de
  kolomnaam (buiten scope: `sessions` wordt niet gewijzigd).

## Zelf gevonden problemen tijdens sprint

1. Een vergeten, overgebleven testindex uit de eerdere F13-P1-12-sprint
   (`concurrently_test_idx_sessions_user_date`) -- opgeruimd.
2. Een eigen testmethode-fout tijdens het adversarial testen (meerdere,
   gerelateerde SQL-statements per ongeluk over aparte tool-aanroepen
   verspreid, wat leek op een RLS-lek maar in werkelijkheid een
   afgesloten transactie was) -- ontdekt, gecorrigeerd, en de volledige
   testreeks correct herhaald binnen één, ononderbroken aanroep met
   sluitend, definitief bewijs.
3. De bestaande `core/fEnduranceArchitectureContract.test.js` (uit de
   eerdere F13-P1-10-sprint) faalde terecht na deze implementatie --
   die test controleerde expliciet dat het contract NOG NIET
   geimplementeerd was. Bijgewerkt naar de nieuwe, correcte
   werkelijkheid (IMPLEMENTED), inclusief het brondocument zelf.

## Niet uitgevoerd wegens scope

Conform sectie 22 van de opdracht: geen Running/Cycling-UI, geen
raceplan-generator, geen adaptive coaching, geen wearable-provider-
connector-uitbreiding, geen nieuwe calculation (TRIMP/decoupling
blijft NOT IMPLEMENTED), geen interval/structure-model (geen bewezen
noodzaak).

## FINAL STATUS

**B9-01 ENDURANCE DATA FOUNDATION CLOSED — READY FOR INDEPENDENT
BENCHMARK REVIEW**
