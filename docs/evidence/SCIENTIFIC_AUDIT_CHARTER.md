# TRAININGSKOMPAS V1 — Scientific Evidence & Decision Audit

**Status:** ACTIVE — foundation/gate 0  
**Baseline main:** `0dcb7cd542d97bcba13209f3ef9662384edc72f8`  
**Started:** 2026-09-18  
**Scope:** scientific validity and claim discipline across Calculation → Context → Decision → AI → athlete.

## Purpose

This audit determines whether a mathematically correct TK calculation, its interpretation, the Decision Rule built on it, and the athlete-facing/AI claim are each independently justified. Existing production behaviour is not changed in this foundation phase.

## Evidence hierarchy

1. Current position stands / clinical or sport guidelines relevant to the population.
2. Umbrella reviews and systematic reviews/meta-analyses.
3. Randomized controlled trials and prospective validation studies.
4. Observational/measurement-validation studies.
5. Expert consensus where higher-level evidence is unavailable.
6. Technical derivation/product heuristic — never upgraded into a scientific claim by repetition.

Evidence strength remains the canonical TK scale: **A strong/consistent; B good practical/empirical; C context-dependent; D controversial/limited; E technical/derived without standalone scientific claim.**

Evidence level is separate from **data quality**, **confidence**, and **applicability**.

## Mandatory audit unit

Every scientific audit record must evaluate separately:

- **Calculation validity** — formula/model and inputs.
- **Interpretation validity** — what the result can mean.
- **Decision validity** — whether a threshold/action follows from evidence.
- **Claim validity** — what UI/AI may say to the athlete.
- **Population/applicability** — trained/untrained, age, sex, sport, health status.
- **Minimum data / data quality.**
- **Uncertainty and limitations.**
- **Forbidden interpretations.**
- **Evidence freshness.**
- **Source provenance.**

A valid calculation does **not** automatically validate a Decision Rule.

## Verdict vocabulary

- `SUPPORTED`
- `SUPPORTED_WITH_LIMITATIONS`
- `EVIDENCE_UPDATE_REQUIRED`
- `OVERCLAIM`
- `UNDERUSED`
- `EXPERIMENTAL`
- `REMOVE_OR_DEPRECATE`
- `NOT_YET_AUDITED`

No item receives `SUPPORTED` solely because a competitor implements it.

## Domain waves

1. Strength / hypertrophy / RPE-RIR / warm-up / progression.
2. Recovery / HRV / RHR / sleep / soreness / muscle recovery.
3. Training load / sRPE / TRIMP / ACWR / longitudinal load.
4. Running / cycling / rowing / SkiErg / endurance thresholds and zones.
5. Nutrition / hydration / energy / protein / carbohydrate / timing.
6. Supplements and ergogenic aids.
7. Wearable/device measurement validity and provider provenance.
8. Female physiology/cycle context and other population-specific rules.
9. Cross-domain Decision Rules and AI/athlete-facing claims.

## Hard guardrails

- AI never becomes a scientific source or calculator.
- Competitor behaviour is hypothesis-generation only.
- Provider composite scores remain provider-labelled.
- Association is not causation.
- Wearable-derived energy expenditure is an estimate.
- HRV alone never diagnoses overtraining or mandates rest.
- ACWR never becomes an injury predictor or universal safe zone.
- Subjective soreness/pump are context signals unless stronger evidence justifies more.
- Medical diagnosis/treatment claims are outside the training Decision Engine.
- Historical evidence is not silently presented as current evidence.

## Gate 0 baseline findings

The current repository already has a substantial Calculation Registry and a Decision Rule Registry. The latter explicitly labels several exact thresholds as **Product heuristic**, including fixed RPE progression increments, readiness thresholds, recovery-adjustment thresholds and rest-time scaling. These are prime scientific-audit targets: their calculations may be useful while the exact action thresholds remain unvalidated.

The current main also states that model-v1.2 audit coverage is 86/86 but explicitly warns that complete audit coverage does not mean all gaps are closed or the product is release-ready. Scientific audit is therefore a distinct closure dimension, not a replacement for the A–J technical audit.

## Initial external anchors verified at start

- ACSM 2026 resistance-training Position Stand: overview of 137 systematic reviews (>30,000 participants); supports RT broadly, heavier loads for strength and higher weekly volume for hypertrophy, while several commonly emphasized prescription variables did not consistently change outcomes.
- Robinson et al. 2024 meta-regression: proximity to failure showed a clearer relationship with hypertrophy than strength, while exact dose-response remains uncertain.
- Refalo et al. 2023 meta-analysis: momentary muscular failure was not shown superior to non-failure training for hypertrophy.
- HRV-guided training meta-analysis: possible small benefits in some endurance outcomes; methodology/baseline practices remain important and superiority is not universal.
- Morton et al. protein meta-analysis: protein supplementation can augment resistance-training adaptations; application requires population/dose/context review rather than a single universal target.
- 2026 smartwatch validity review: measurement validity varies by metric/device; heart rate is generally better studied than energy expenditure/sleep and evidence remains heterogeneous.

These anchors seed the registry; they do not close every calculation that cites the topic.

## Deliverables

- `EVIDENCE_REGISTRY.md` — source-level registry.
- `SCIENTIFIC_AUDIT_MATRIX.md` — Calculation/Decision/claim verdicts.
- domain evidence dossiers under `docs/evidence/domains/`.
- `SCIENTIFIC_V1_GAP_REPORT.md` — only V1-relevant corrections after domain waves.
- traceability from Calculation IDs and Decision IDs to evidence IDs.
- final scientific closure gate with unresolved limitations explicitly retained.

## Change policy

This branch starts documentation-only. No production calculation, Decision Rule, database migration or AI prompt may be changed until a scientific finding has a traceable evidence record and a separately reviewed implementation action.
