# Wave 4 — Endurance: Running, Cycling, Rowing, SkiErg, Zones & Thresholds
**Status:** COMPLETE — 2026-09-18

## Verdict
TK's deterministic pace/split/power conversions are technically sound when inputs are sound. Critical Speed (CS) and Critical Power (CP) are useful performance-model constructs, but model fit, test selection, sport specificity and input provenance determine confidence. User-entered threshold pace/FTP must remain separate from calculated CS/CP.

### Pace / split / Concept2-like power
**SUPPORTED/TECHNICAL.** Unit conversions are arithmetic. Erg power relationships must be labelled device/model-derived when not directly measured. Device-measured and calculated watts are not interchangeable provenance.

### Critical Speed / Critical Power
**SUPPORTED_WITH_LIMITATIONS.** CS/CP can characterize the severe-intensity boundary and finite work/distance capacity above it, but estimates depend on protocol, model and quality/range of maximal performances. Do not call CS “lactate threshold”, FTP or VO2max. W′/D′ are model parameters, not literal fuel tanks.

### HR/intensity zones
**CONTEXT_DEPENDENT.** Zone boundaries depend on the method used (%HRmax, HR reserve, ventilatory/lactate thresholds, pace/power thresholds). TK must store the zone model/version and never silently mix models.

### Training-intensity distribution
Current evidence does not support one universally superior distribution. A 2025 individual-participant NMA and the 2026 Bayesian NMA found no definite universal winner across VO2max/time-trial outcomes; subgroup/context effects matter (PMID 39888556; PMID 42171506). High low-intensity volume is common in endurance practice, but “80/20” is not a universal law.

### Aerobic decoupling
**EVIDENCE_REVIEW_REQUIRED before prescriptive use.** HR-to-pace/power drift can be descriptively useful, but heat, hydration, terrain, cardiac drift, sensor error and pacing confound it. No universal 5% threshold is accepted here as a V1 decision rule.

## V1 gaps
- **SCI-GAP-V1-018 HIGH:** CS/CP outputs require protocol/model/input-quality provenance and minimum-data gates.
- **SCI-GAP-V1-019 HIGH:** measured vs calculated power/pace provenance must remain explicit.
- **SCI-GAP-V1-020 MEDIUM-HIGH:** zone model/version must be explicit; no cross-model silent equivalence.
- **SCI-GAP-V1-021 MEDIUM:** no universal polarized/80:20 prescription claim.
- **SCI-GAP-V1-022 MEDIUM:** aerobic-decoupling threshold rules remain experimental until separately validated.
- **SCI-GAP-V1-023 MEDIUM:** sport-specific validation: rowing/SkiErg/cycling/running models cannot inherit validity from another modality without evidence.

**Production code changed:** NO.
