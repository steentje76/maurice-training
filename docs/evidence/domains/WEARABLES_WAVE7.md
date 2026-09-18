# Wave 7 — Wearables, Devices, Measurement Validity & Provenance
**Status:** COMPLETE — 2026-09-18

## Verdict
Wearable data can enrich TK, but validity is **metric × device × firmware/algorithm × context × population** specific. Provider name alone is not enough provenance.

A 2024 living umbrella review found only about 11% of commercially available wearables had validation for at least one biometric outcome across the included literature (PMID 39080098). A 2026 systematic review/meta-analysis found HR generally the most studied/accurate smartwatch measure while evidence was heterogeneous across activity, distance, energy expenditure and sleep (PMID 41819643).

### Heart rate
**USABLE WITH DEVICE/CONTEXT LIMITATIONS.** Optical HR accuracy varies with activity/motion/device. Chest-strap/device-grade sources and wrist optical measurements should not silently share identical confidence.

### Energy expenditure
**ESTIMATE ONLY.** Validation error is materially larger/less consistent; no precise calorie-balance decision.

### Sleep
Consumer wrist devices are not PSG. A 2025 meta-analysis found significant differences in total sleep time, efficiency, latency and wake-after-sleep-onset versus PSG (PMID 39484805). A 2026 review found poor-to-moderate concordance with subjective sleep quality (PMID 41946254). Use for trends/context, not sleep diagnosis.

### HRV
Method provenance is mandatory: RMSSD vs SDNN, recording duration, posture/time, sensor and provider processing matter. TK already identified this issue; it remains a V1 scientific requirement.

### Provider composite scores
WHOOP/Oura/Garmin composite scores remain **provider-labelled external signals**. Never rebrand them as TK calculations or reverse-engineer proprietary meaning.

## V1 gaps
- **SCI-GAP-V1-034 CRITICAL:** provenance schema must preserve metric method, source/device/provider and measured-vs-derived status where available.
- **SCI-GAP-V1-035 HIGH:** confidence must be metric/device/context-specific, not “wearable = reliable”.
- **SCI-GAP-V1-036 HIGH:** sleep stages/quality are contextual estimates; no diagnostic claims.
- **SCI-GAP-V1-037 HIGH:** wearable energy expenditure cannot drive precise calorie/REDs decisions.
- **SCI-GAP-V1-038 HIGH:** provider composite isolation must remain hard architectural boundary.
- **SCI-GAP-V1-039 MEDIUM-HIGH:** native Health Connect ingestion needs source attribution, duplicate/reconciliation rules and real-device validation before DEVICE_PROVEN.

**Production code changed:** NO.
