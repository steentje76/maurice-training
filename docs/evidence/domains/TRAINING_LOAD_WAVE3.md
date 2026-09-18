# Wave 3 — Training Load, sRPE, Rolling Load, ACWR & Longitudinal Load
**Status:** COMPLETE — 2026-09-18

## Verdict
TK's load architecture is scientifically strongest where it stays descriptive: session-RPE load, rolling sums and longitudinal trends. The existing ACWR guardrail is correct and must remain: ACWR is **not** a validated individual injury predictor and no universal “safe zone” may be used.

### CALC-LOAD-003 — sRPE
**SUPPORTED_WITH_LIMITATIONS.** Session duration × session RPE is a practical internal-load construct. It is dimensionless/arbitrary-unit load, not physiological work and not comparable between athletes as an absolute quantity. Timing/scale consistency matters.

### CALC-LOAD-005 — rolling load
**TECHNICALLY VALID / INTERPRETATION CONTEXTUAL.** A 7/28-day or other rolling sum is reproducible description. Window selection is a model choice; the sum itself does not establish adaptation, fatigue or injury risk.

### CALC-LOAD-001 — ACWR
**DESCRIPTIVE_ONLY / INJURY-PREDICTION CLAIM FORBIDDEN.** Recent meta-analysis reports associations but substantial heterogeneity, differing ACWR methods and uncertain practical applicability (PMID 41029871). Methodological concerns including coupling and denominator/window choices remain material. An observed association at group level does not create an individual causal threshold.

TK's current implementation is positive: DEC-ACWR-ADV-001 produces neutral text and the AI output contract blocks ACWR injury-risk percentages. Keep this.

### CALC-LOAD-002 / DEC-LOADCORR-001
**PRODUCT_HEURISTIC_WITH_GUARDRAIL.** Requiring a second independent signal before surfacing concern is more conservative than ACWR alone, but “two signals” is not a validated physiological rule.

## V1 gaps
- **SCI-GAP-V1-014 HIGH:** ACWR must remain descriptive; never “0.8–1.3 safe zone”, injury probability, or automatic prescription.
- **SCI-GAP-V1-015 MEDIUM:** rolling-window provenance/version must be visible because 7/28 etc. are model choices.
- **SCI-GAP-V1-016 MEDIUM:** sRPE scale/timing collection should be standardized; no cross-athlete absolute interpretation.
- **SCI-GAP-V1-017 MEDIUM:** corroborated-load rule is product logic; explanations must expose the two signals rather than imply validated risk detection.

**Production code changed:** NO.
