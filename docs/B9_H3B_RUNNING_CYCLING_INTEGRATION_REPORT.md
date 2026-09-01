# B9-H3B Running & Cycling Integration Report

## Running E2E (sectie 76, softwarematig bewezen)

Officiële Google Health-payload (5km, 30 minuten) ->
`normalizeGoogleHealthExercise()` -> `{sport: 'running',
duration_seconds: 1800, distance_meters: 5000, dedupe_key: ...}` ->
`upsert_provider_activity()` RPC (live, adversariaal bewezen: correcte
persistence, idempotent, cross-user geweigerd) -> canonieke
`activities`-rij -> `runningIntelligence.js` se `weeklyVolume()`/
`criticalSpeedEligiblePerformances()` verwerken deze rij al, generiek,
zonder enige codewijziging (bevestigd via functie-signatuur-audit:
beide nemen een generieke `activities`-array aan).

## Cycling E2E (sectie 77, softwarematig bewezen)

Officiële Google Health-payload (30km, 90 minuten) -> `{sport:
'cycling', duration_seconds: 5400, distance_meters: 30000}` -> zelfde
RPC-keten -> `cyclingIntelligence.js` se
`criticalPowerEligiblePerformances()` verwerkt deze rij al, generiek.

## Wat NIET is bewezen (eerlijk vastgelegd)

- **Real API-aanroep tegen een echt, ingelogd Google-account:** niet
  uitgevoerd binnen deze sessie (geen test-Google-account met de
  nieuwe scope geconsenteerd beschikbaar).
- **Real device:** geen fysiek sporthorloge beschikbaar.
- **HR/power/cadence uit de `exercise`-metricsSummary:** Google Health
  levert deze niet standaard in dit datatype (bevestigd tegen de
  officiële documentatie) -- correct als `null` gemapt, niet als 0.
