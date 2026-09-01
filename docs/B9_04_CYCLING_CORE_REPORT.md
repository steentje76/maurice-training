# B9-04 Cycling Core — Eindrapport

**Rol-erkenning:** geen benchmarkscore toegekend.

**START SHA:** `dbe42de02cb119a3e84c5a712d5ea5f368b840e0`
**APP_VER voor/na:** v4.69.36 / v4.69.37
**Migration(s):** geen (volledig hergebruik van B9-01 `activities`-kolommen)

## Existing-state audit

De bestaande Cycling-shell (B9-02) was **PLACEHOLDER**: een enkel,
direct-opslaan-formulier zonder trainingsvormen/preview/execution.
`athlete_endurance_profile` had al `ftp_watts_user_entered`/
`ftp_watts_calculated` (CANONICAL, ongebruikt). `CardioCore.
criticalPower()` was CANONICAL maar bewust nooit gewired (identieke
architecturele beperking als Critical Speed). Geen power-zone-
berekening bestond (NOT IMPLEMENTED).

## Running Execution Engine audit (sectie 7/8)

Deep audit van `core/runningExecution.js` bevestigde: de kern (state
machine/timer/laps) was **volledig sport-neutraal** -- geen enkele
running-specifieke aanname (geen pace/afstand-eenheid-logica in de
module zelf). De enige "Running"-verwijzingen: de bestandsnaam,
exportnaam, en de statuswaarde `'RUNNING'` (een generiek state-label,
geen sport-claim).

**Architectuurbeslissing:** gegeneraliseerd naar `core/
enduranceExecution.js` (`EnduranceExecutionCore`). `core/
runningExecution.js` blijft ONGEWIJZIGD bestaan als dunne, backward-
compatible alias (Node: `require()`-doorverwijzing; browser: leest het
al geladen `EnduranceExecutionCore`-object). **Nul regressierisico**:
alle 126 bestaande Running-assertions (6 testbestanden) herbevestigd
groen na de refactor, zowel vóór als na het laden van de nieuwe
scripts-volgorde in `index.html`.

## Cycling Core

Volledige flow gebouwd, identiek patroon aan Running maar
cyclingspecifiek: 7 trainingsvormen, configuratie, Preview (FTP met
expliciete "door jou ingesteld"-provenance, powerzones expliciet "nog
niet beschikbaar"), live Execution (start/pause/resume/laps/structured
intervals/finish-confirm via de gedeelde `EnduranceExecutionCore`),
idempotente/atomaire Finish (dedupe_key + ignore-duplicates +
individuele lap-controle), Ride Detail (km/h uitsluitend via
`CardioCore.splitFromDistTime()`, triviale eenheidsconversie, geen
lokale formule), History -> Ride Detail.

## Shared device security (sectie 16)

De B9-02C-P1 (wrong-user-recovery) direct, preventief voorkomen: een
user-specifieke localStorage-key (`tk_cycling_execution_v1_{uid}`) +
expliciete `ownerUserId`-verificatie bij elk herstel + dezelfde,
strikte corrupted-state-validatie (`Array.isArray`/`isFinite`) als
Running. Niet opnieuw hoeven ontdekken -- de eerder geleerde les direct
toegepast.

## FTP / Power zones / Critical Power (sectie 24-27)

FTP: uitsluitend user-entered met expliciete provenance -- geen
canonieke berekening, dus geen "95%-van-20-min-power"-bro-science
toegevoegd. Power-zones: bewust niet gebouwd (geen canonieke formule).
Critical Power: `CardioCore.criticalPower()` blijft ongewijzigd, niet
automatisch gewired -- expliciet gedocumenteerd als B9-05-dependency
(analoog aan Critical Speed/B9-03).

## GPS (sectie 19)

Herbevestigd: geen `watchPosition()`-capability. Geen pseudo-GPS
gebouwd. **LIVE GPS — EXTERNAL/CONNECTED CAPABILITY OPEN**, blokkeert
Cycling Core niet.

## Tests

`core/fB9_04CyclingCore.test.js` (nieuw, 22/22): architectuur (gedeelde
engine), Training-IA-behoud, canonieke km/h, FTP-provenance, geen
power-zone-bro-science, shared-device security, idempotency/failure-
atomicity, RPE-hergebruik, geen extra bottom-nav-tab, geen pseudo-GPS.
`core/fB9_02RunningCore.test.js` bijgewerkt (F3, nieuwe implementatie).

## Sabotage

1. Cycling-owner-verificatie verwijderd -> gedetecteerd, teruggedraaid.
2. De `runningExecution.js`-alias-doorverwijzing verbroken -> **dubbel
   gedetecteerd**: zowel de eigen, nieuwe testsuite als de volledige,
   bestaande Running-testsuite crashte -- bevestigt hoe kritiek de
   alias is. Teruggedraaid, herbevestigd.

## Release gate

**207/207 uitgevoerd, 0 geskipt, 0 gefaald** (was 206, +1 nieuw
testbestand).

## Doc consistency

**0 problemen.**

## Open limitations

Power-zones, Critical Power Intelligence, canonieke FTP-berekening,
live GPS -- alle expliciet geregistreerd als B9-05-dependency.

## FINAL STATUS

**B9-04 CYCLING CORE CLOSED — READY FOR INDEPENDENT BENCHMARK REVIEW**
