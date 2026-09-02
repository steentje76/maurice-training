# B9-H6 Connected Equipment Capability Matrix

## Concept2 RowErg

**SPORT:** roeien (rowing). **CONNECTION METHOD:** BLE (PM5). **DISCOVERY:** Web Bluetooth. **AUTH:** N.v.t. (lokale pairing). **REALTIME DATA:** Ja (distance/elapsed/pace/stroke rate/power). **POST-WORKOUT DATA:** Ja. **CONTROL CAPABILITY:** Geen (read-only, correct conform sectie 33). **SUPPORTED METRICS:** distance(m)/time(s)/pace(sec/500m)/power(W)/stroke rate(spm)/HR(indien gekoppeld). **CANONICAL MAPPING:** correct, apart van SkiErg/BikeErg. **PROVENANCE:** Concept2, expliciet. **DEDUPE:** activeInstanceId-gebaseerd (bestaand, getest). **RECONNECT:** getest (`fConcept2MidWorkoutIsolation`). **OFFLINE BEHAVIOR:** niet apart geaudit deze sessie. **CALCULATION CONSUMPTION:** via `sessions`-tabel, niet via `activities`/`runningIntelligence`. **REAL DEVICE VALIDATION:** OPEN (geen fysieke hardware beschikbaar). **STATUS:** SOFTWARE TESTED.

## Concept2 SkiErg

**SPORT:** skierg (eigen, canonieke identiteit -- niet gelijkgesteld aan rowing). **Overige velden:** identiek patroon aan RowErg. **STATUS:** SOFTWARE TESTED.

## Concept2 BikeErg

**SPORT:** bikeerg (eigen, canonieke identiteit). **SUPPORTED METRICS:** distance(m)/time(s)/pace(sec/1000m -- **gecorrigeerd deze sprint**)/power(W)/cadence(rpm)/HR. **CANONICAL MAPPING:** correct, apart van RowErg -- device family != sport domain, bevestigd. **STATUS:** SOFTWARE TESTED, met een echte, kritieke splitbasis-bug gerepareerd deze sprint.

## Technogym / EGYM / Life Fitness / Matrix / Precor / Keiser / Wattbike / Milon / Gym80

**STATUS:** NOT PRESENT voor alle bovenstaande. Zie
`docs/B9_H6_CONNECTED_EQUIPMENT_PROVIDER_RESEARCH.md`.

## FTMS (generieke Bluetooth-standaard)

**STATUS:** NOT PRESENT. Geen enkele code-referentie gevonden.
