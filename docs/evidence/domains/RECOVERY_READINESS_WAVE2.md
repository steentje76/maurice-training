# Wave 2 — Recovery, HRV, RHR, Sleep, Soreness & Muscle Recovery

**Audit date:** 2026-09-18  
**Baseline:** main `0dcb7cd542d97bcba13209f3ef9662384edc72f8`  
**Scope:** CALC-REC-001..004, CALC-STR-005, DEC-RECADJ-001, DEC-READY-001, subjective recovery/soreness and athlete-facing recovery/readiness claims.

## Executive verdict

TK's recovery architecture contains good guardrails and a defensible HRV baseline, but the current **muscle recovery percentage is not scientifically valid as a physiological percentage**. The recovery score and dayfactor are transparent product composites, not validated physiological constructs. They may remain as contextual product indices only if naming, precision, provenance and Decision Rule claims are tightened.

The most important V1 scientific action from this wave is to stop allowing a deterministic time×RPE model to look like measured local muscle recovery.

## CALC-REC-001 — HRV baseline

**Verdict: SUPPORTED_WITH_LIMITATIONS.**

Ln-RMSSD, repeated measurements, rolling/personal baseline and change interpretation are scientifically defensible monitoring practices. TK already correctly prevents HRV from independently diagnosing overtraining, predicting injury or forcing rest.

However, evidence does not establish that a low HRV value maps one-to-one to poor performance or incomplete recovery. Meta-analysis shows autonomic changes can occur in both positive adaptation and overreaching; HRV-guided training shows at most small/uncertain group-level performance advantages over predefined training.

**V1 actions:** retain personal baseline and confidence phases; remove/avoid any claim that HRV is a direct muscle-recovery measurement. Keep `HRV_SEVERE_DROP_PCT=0.15` explicitly heuristic. Method/device provenance remains important because RMSSD/SDNN and measurement conditions are not interchangeable.

## CALC-REC-002 — Dayfactor

**Verdict: PRODUCT_COMPOSITE / EVIDENCE_DOWNGRADE_RECOMMENDED from C to D/E for the composite itself.**

HRV and sleep each have evidence as contextual signals. Multiplying HRV × sleep × cycle and clamping 0.85–1.05 has no validation as a physiological readiness equation. Component evidence must not be inherited by the composition.

The multiplicative model also risks double-counting correlated phenomena (e.g. poor sleep influencing autonomic measures). The exact sleep and cycle multipliers are product rules.

**V1 action:** keep only as a transparent TK index if needed, label it as a derived product index, expose component provenance/confidence, and never describe 0.93 vs 0.94 as physiological precision.

## CALC-REC-003 — Recovery Score 0–100

**Verdict: EXPERIMENTAL_PRODUCT_INDEX / NOT A PHYSIOLOGICAL RECOVERY PERCENTAGE.**

The current 45/30/15/10 weights and ≥80/≥60 bands are not externally validated. Redistributing weights when inputs are missing is computationally sensible but changes the meaning of the score depending on available data: a score of 80 based on one signal is not construct-equivalent to 80 based on four.

The existing confidence field is a strong design choice but currently counts components, not their measurement quality, provenance, recency or construct validity.

**V1 action:** retain only if UI says “TK Recovery Score/Herstelindex” rather than “80% recovered”. Display confidence/data coverage. Provider scores must stay isolated. Candidate future validation: prospectively test score against pre-specified performance/wellbeing outcomes before stronger claims.

## CALC-STR-005 — RPE-based Muscle Recovery %

**Verdict: OVERCLAIM / V1-CRITICAL REDESIGN.**

Formula: elapsed hours divided by a muscle-specific base recovery duration × an RPE multiplier, capped at 100%.

No evidence located validates this as a quantitative estimate of local muscle recovery. RPE can describe perceived effort/internal load; elapsed time is obviously relevant; soreness and performance can change during recovery. But these facts do not validate a linear recovery trajectory or coefficients RPE≥9→1.3, RPE≥8→1.0, otherwise 0.85.

A displayed value such as “78% muscle recovered” therefore implies measurement precision and construct validity the model does not possess.

HRV does not rescue this construct: vmHRV reflects autonomic/vagal recovery and is not a direct measurement of local quadriceps/pectoralis/etc. recovery.

**Required V1 redesign options (ordered by scientific conservatism):**
1. Replace percentage with categorical **local recovery context**: recent load / time since stimulus / athlete-reported soreness / recent performance trend / confidence.
2. If percentage is retained for UX, explicitly rename to a **TK estimated recovery index**, not physiological recovery, and show low/medium/high confidence; however this remains weaker scientifically.
3. Do not let the current percentage independently change training.

Preferred audit recommendation: option 1.

## Muscle soreness

**Verdict: USEFUL SUBJECTIVE SIGNAL, NOT TISSUE-RECOVERY MEASUREMENT.**

Systematic reviews support subjective wellbeing measures as useful athlete-monitoring inputs. Muscle soreness is commonly used, but relationships with training load vary and recent meta-analysis rates certainty very low. Soreness may contribute to context but cannot establish tissue repair, readiness, injury or “percentage recovered”.

## Sleep

**Verdict: SUPPORTED CONTEXT SIGNAL; EXACT TK MULTIPLIERS NOT VALIDATED.**

Meta-analyses show acute sleep loss can impair endurance, strength, power, high-intensity and skill outcomes, with substantial heterogeneity. This supports sleep as a recovery/performance context signal.

It does not validate a universal deterministic conversion from “X hours sleep” to a fixed training multiplier. Duration alone also omits quality, regularity, timing, naps and individual sleep need.

**V1 action:** sleep can influence context/readiness explanation; exact multiplier remains product heuristic. Do not infer sleep stages/quality from duration alone.

## CALC-REC-004 — RHR baseline delta

**Verdict: SUPPORTED_AS_CONTEXT / DATA-GATE_TOO_WEAK.**

RHR is affected by training and many non-training factors. Personal-baseline deviation is more defensible than population cutoffs, but TK's minimum of two observations is insufficiently robust for a strong “baseline” claim. No evidence found for TK's `100 − delta×6` score mapping.

**V1 action:** strengthen minimum-data/recency requirements or downgrade confidence aggressively. Keep RHR delta descriptive. The score conversion is a product heuristic.

## DEC-READY-001 — Readiness zones

**Verdict: PRODUCT_HEURISTIC_RETAIN_ONLY_AS_ADVISORY.**

The exact dayfactor thresholds ≥1.00 and ≥0.93 are not scientifically validated readiness thresholds. Because the upstream dayfactor is itself an unvalidated composite, zone names must not imply measured biological readiness.

“Klaar om te trainen / Train op gevoel / Houd het licht vandaag” may remain advisory if accompanied by reasons/confidence and never overrides symptoms/pain/user choice.

## DEC-RECADJ-001 — Recovery-based prescription adjustment

**Verdict: V1-CRITICAL CLAIM/INPUT REVIEW.**

The rule consumes dayfactor, muscle recovery %, subjective feeling and pain. Exact thresholds and −1.5/−0.5 RPE and −1 set changes are product heuristics.

More importantly, one input — muscle recovery % — is an overprecise construct. A deterministic Decision Rule should not inherit false precision from it.

**V1 action:** remove CALC-STR-005 percentage as an authoritative threshold input or replace with categorical/local recovery context. Subjective feeling is legitimate context; pain needs conservative safety handling and is not equivalent to ordinary soreness.

## RHR/HRV/sleep are not interchangeable

A central Wave-2 rule:
- HRV → autonomic/vagal signal.
- RHR → nonspecific cardiovascular/resting signal.
- sleep → behavioral/physiological recovery context.
- soreness → subjective perceptual/local symptom.
- performance trend → functional outcome.
- local muscle recovery → latent construct not directly measured by the above.

Combining them can support context, but does not create a directly measured biological percentage.

## Missing-data and confidence audit

Positive: TK generally avoids fabricating absent recovery data and Recovery Score exposes a confidence field.

Gap: confidence based only on number of components is insufficient. Future confidence should consider:
- source/method provenance;
- recency;
- baseline sample size;
- measurement consistency;
- whether a signal is direct/subjective/derived;
- missingness;
- provider/device method.

## Athlete-facing claim policy from Wave 2

Allowed:
- “Je HRV ligt onder/binnen/boven je persoonlijke recente referentie.”
- “Je slaap was korter dan gebruikelijk; slaaptekort kan prestaties beïnvloeden.”
- “Je rapporteert meer spierpijn/vermoeidheid.”
- “TK Herstelindex: 72/100 — gebaseerd op 3 van 4 beschikbare signalen; dit is geen medische meting.”
- “Vandaag zijn er meerdere signalen om de training conservatiever te benaderen.”

Not allowed:
- “Je spieren zijn 78% hersteld.”
- “Je HRV bewijst dat je spieren niet hersteld zijn.”
- “Je bent overtraind.”
- “Je hebt 7 uur nodig voordat deze spier volledig hersteld is.”
- “Recovery Score 82 betekent dat je lichaam 82% hersteld is.”
- “HRV onder baseline betekent verplichte rust.”
- “Deze readinesszone voorspelt blessurerisico.”

## Wave 2 V1 scientific gaps

### SCI-GAP-V1-006 — Muscle recovery percentage construct
**Severity: CRITICAL.** Replace physiological-looking percentage with local recovery context/categorical estimate, or explicitly demote to TK product index. Preferred: categorical context.

### SCI-GAP-V1-007 — Recovery Score construct validity
**Severity: HIGH.** Rename/position as TK composite index; preserve component breakdown; confidence must reflect data quality, not only component count.

### SCI-GAP-V1-008 — Dayfactor evidence inheritance
**Severity: HIGH.** Composite itself should not inherit C-level physiology merely because components have evidence. Classify as product composite.

### SCI-GAP-V1-009 — Recovery Decision Rule false precision
**Severity: HIGH.** DEC-RECADJ-001 must not threshold on an overprecise muscle-recovery percentage as if measured physiology.

### SCI-GAP-V1-010 — RHR minimum-data gate
**Severity: MEDIUM-HIGH.** Two measurements are too weak for a strong personal baseline claim; strengthen gate/confidence and retain descriptive interpretation.

### SCI-GAP-V1-011 — Recovery provenance/method quality
**Severity: HIGH.** Source/method/device provenance must flow into confidence; HRV method differences cannot be silently mixed.

### SCI-GAP-V1-012 — Readiness zone claim boundary
**Severity: MEDIUM-HIGH.** Exact thresholds remain product heuristic; zones advisory only and explanations must expose contributing signals.

### SCI-GAP-V1-013 — Sleep multiplier precision
**Severity: MEDIUM.** Sleep is evidence-backed context, but exact hour→factor mappings remain product heuristic and must not imply universal dose-response.

## Closure

**Wave 2 scientific audit: COMPLETE.**
Production code changed: **NO**.
Scientific remediation implemented: **NO — staged for V1 scientific gap remediation after audit review.**
Next wave: Training load / sRPE / TRIMP / ACWR / longitudinal load.
