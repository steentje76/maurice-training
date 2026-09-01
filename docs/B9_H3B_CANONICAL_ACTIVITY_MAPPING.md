# B9-H3B Canonical Activity Mapping

## Sport Capability Registry (SPORT_MAPPING, core/cloudActivityIngestion.js)

| Google Health exerciseType | Canonieke sport |
|---|---|
| RUNNING | running |
| TRAIL_RUNNING | running |
| TREADMILL_RUNNING | running |
| BIKING | cycling |
| ROAD_BIKING | cycling |
| MOUNTAIN_BIKING | cycling |
| INDOOR_CYCLING | cycling |
| (elk ander/onbekend type) | null (geweigerd, geen crash, geen gok) |

## Metric Mapping

| Google Health-veld | Eenheid | Canoniek veld | Conversie |
|---|---|---|---|
| `exercise.activeDuration` | string, bijv. "1800s" | `duration_seconds` | regex-parse + Math.round, null bij malformed |
| `exercise.metricsSummary.distanceMillimeters` | millimeter | `distance_meters` | `/1000`, 2 decimalen |
| `exercise.interval.startTime` | ISO8601 UTC | `recorded_at` | ongewijzigd doorgegeven (al canoniek) |
| `dataPoint.name` | provider-record-naam | `dedupe_key` | `"google_health:" + name` |

## Niet gemapt in deze sprint (missing, niet 0)

`elevation_gain_meters`, `avg_heart_rate_bpm`, `avg_power_watts`,
`avg_cadence_rpm` -- Google Health se `exercise.metricsSummary` levert
deze standaard niet (bevestigd tegen de officiële documentatie); HR
zit in een apart datatype (`heartRate`) dat in deze sprint niet is
geconsumeerd (bewuste, kleinere scope: Running/Cycling-basisdata eerst
bewijzen, sensor-verrijking is een logische, latere uitbreiding zonder
architectuurwijziging).

## Voorbeeld (echte, officiële Google Health-payload, live getest)

Input: 5km run in 30 minuten -> Output: `sport=running,
duration_seconds=1800, distance_meters=5000`.
Input: 30km rit in 90 minuten -> Output: `sport=cycling,
duration_seconds=5400, distance_meters=30000`.

Beide voorbeelden zijn live, handmatig geverifieerd tijdens deze
sprint (zie ook core/fB9_H3BCloudProviderIntegration.test.js, test 1-6).
