# B9-H3A Sport × Sensor Capability Matrix

**Legenda:** ✅ = ondersteund via bestaande, canonieke calculation (meestal handmatige invoer); 🔌 = ondersteund via een echte sensor/device-koppeling; ❌ = niet ondersteund; N.v.t. = niet relevant voor deze sport.

| Sport | HR | GPS | Distance | Pace/Speed | Power | Cadence | Laps | Sport-specific |
|---|---|---|---|---|---|---|---|---|
| Running | ✅ (handmatig) | ❌ | ✅ (handmatig) | ✅ (berekend) | ❌ | ❌ | ✅ (handmatig) | Critical Speed (B9-03) |
| Cycling | ✅ (handmatig) | ❌ | ✅ (handmatig) | ✅ (berekend) | ✅ (handmatig) | ❌ | ✅ (handmatig) | Critical Power (B9-05) |
| Strength | ❌ | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | N.v.t. | Sets/reps/RPE (canoniek, ongewijzigd) |
| Rowing | 🔌 (Concept2) | N.v.t. | 🔌 (Concept2) | 🔌 (Concept2) | 🔌 (Concept2-watt) | 🔌 (stroke rate) | 🔌 (Concept2 splits) | Drag factor (Concept2) |
| SkiErg | 🔌 (Concept2) | N.v.t. | 🔌 (Concept2) | 🔌 (Concept2) | 🔌 (Concept2-watt) | 🔌 (stroke rate) | 🔌 (Concept2 splits) | Zelfde Concept2-foundation |
| Swimming | ❌ | ❌ (open water niet ondersteund) | ✅ (handmatig, banen) | ✅ (berekend) | N.v.t. | N.v.t. | ✅ (handmatig) | Geen |
| HYROX | ✅ (handmatig) | ❌ | ✅ (per segment, handmatig) | ✅ (berekend) | N.v.t. | N.v.t. | ✅ (race_segments) | Station-volgorde (canoniek, B9-06) |
| Triathlon | ✅ (handmatig) | ❌ | ✅ (per segment, handmatig) | ✅ (berekend) | ✅ (bike, handmatig) | N.v.t. | ✅ (race_segments) | Transitietijden (canoniek) |
| Walking/Hiking | ✅ (handmatig) | ❌ | ✅ (handmatig) | ✅ (berekend) | N.v.t. | N.v.t. | ❌ | Geen apart model gevonden |
| Team Sports | ❌ | ❌ | ❌ | ❌ | N.v.t. | N.v.t. | N.v.t. | Attendance/responsibilities (B9-H2C, operationeel, geen sensordata) |

## Kernconclusie

Voor **alle** sporten behalve Rowing/SkiErg (via Concept2) is elke
metric vandaag **handmatige invoer**, niet sensor-afkomstig. Dit is
geen bug -- het is de eerlijke, huidige staat. De canonieke
Calculation Engines (Critical Speed/Power, HYROX-segmenten, Triathlon-
transities) zijn zelf al volledig sport-specifiek en volwassen (uit
eerdere B9-sprints), maar zijn "device-agnostisch" in de zin dat ze
nooit expliciet met een cloud-wearable zijn getest, simpelweg omdat
er geen cloud-wearable-koppeling bestaat om mee te testen.
