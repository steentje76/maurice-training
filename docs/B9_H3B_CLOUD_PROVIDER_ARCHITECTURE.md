# B9-H3B Cloud Provider Architecture

## Keten (daadwerkelijk gebouwd)

```
Google Health exercise-datapoint (officieel API-contract)
        |
core/cloudActivityIngestion.js (Provider Adapter)
  - mapSport(): Sport Capability Registry (SPORT_MAPPING)
  - parseGoogleHealthDuration()/millimetersToMeters(): Metric Mapper
  - buildDedupeKey(): deterministische provenance-sleutel
        |
netlify/functions/wearable-sync-activities.js (I/O-laag)
  - hergebruikt _wearableAuthLib.js (token-ophaal/refresh)
  - upsert_provider_activity() RPC (atomaire, veilige persistence)
        |
public.activities (bestaande, canonieke tabel, ONGEWIJZIGD schema)
        |
runningIntelligence.js / cyclingIntelligence.js (bestaand, ongewijzigd)
        |
Context/Decision/AI (bestaand, ongewijzigd)
```

## Provider-2-ready (sectie 82, architecturaal getest)

Een tweede provider (bijv. Garmin, zodra toegankelijk) vereist
uitsluitend:
1. Een nieuwe `normalizeXAdapter()`-functie in
   `core/cloudActivityIngestion.js` die dezelfde canonieke
   `activity`-vorm produceert (zelfde velden als
   `normalizeGoogleHealthExercise()`).
2. Een nieuwe of uitgebreide `SPORT_MAPPING`-registratie voor de
   provider-specifieke sporttypen.
3. Een nieuwe of uitgebreide Netlify-functie die deze adapter aanroept
   en dezelfde `upsert_provider_activity()`-RPC gebruikt.

**Geen wijziging nodig aan:** `activities`-schema, Running/Cycling
Calculation Engines, Context/Decision Engine, AI-laag. Dit is live
bevestigd doordat `runningIntelligence.js`/`cyclingIntelligence.js`
al, ongewijzigd, generiek op elke `activities`-rij werken (test 21a/
21b).

## Waarom geen nieuwe abstractielaag boven het bestaande is geforceerd

`core/deviceIntegration.js` se `normalizeMetric()`/`normalizeWorkout()`
-patroon (B9-H3A-bevinding) bleek bij nadere inspectie specifiek
ontworpen voor Concept2 se datastructuur (real-time stroke-data), niet
direct herbruikbaar voor een cloud-provider se JSON-API-response-
structuur. In plaats van dit patroon geforceerd te hergebruiken (wat
een kunstmatige, minder leesbare adapter zou hebben opgeleverd), is
een nieuwe, kleine, pure module (`cloudActivityIngestion.js`) gebouwd
die hetzelfde ARCHITECTUURPRINCIPE volgt (Adapter + Sport Mapper +
Metric Mapper, geen sportengine) zonder de bestaande Concept2-code
aan te raken of te vervormen.
