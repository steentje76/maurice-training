# Wave 1 — Strength, Hypertrophy, RPE/RIR, Progression, Warm-up & Rest

**Audit date:** 2026-09-18  
**Baseline:** main `0dcb7cd542d97bcba13209f3ef9662384edc72f8`  
**Scope:** `CALC-STR-001..006`, strength/hypertrophy interpretation, `DEC-PROG-001`, `DEC-REST-001`, and related athlete-facing claims.  
**Method:** current TK registry/code evidence + current position stand/systematic-review/meta-analysis literature. Exact proprietary/coach heuristics are never upgraded by adjacent evidence.

## Executive verdict

The strength foundation is scientifically usable, but **three V1 corrections are warranted before scientific closure**:

1. `CALC-STR-003` conflates evidence for **weekly set volume** with the implemented **tonnage (sets × reps × load)** metric. The arithmetic is valid, but A-level hypertrophy evidence cannot be assigned to tonnage itself.
2. `DEC-PROG-001` is a defensible **product autoregulation heuristic**, but the exact RPE cutoffs and fixed +2.5/−7.5 kg changes are not established by the autoregulation literature. Athlete-facing language must not call them optimal/evidence-derived.
3. `DEC-REST-001` is also a product heuristic. Evidence supports adequate rest and suggests very short rests can compromise volume/performance, but does not validate TK's exact RPE→0.75/0.9/1/1.25/1.5 multipliers.

No finding requires removal of strength training functionality. The required action is mainly **claim/evidence separation and threshold governance**, not a wholesale algorithm rewrite.

## CALC-STR-001 — Epley e1RM

**Verdict: SUPPORTED_WITH_LIMITATIONS.**

TK correctly labels e1RM as an estimate and already documents formula-origin limitations, exercise dependence and decreasing confidence at higher reps. That is scientifically appropriate. The formula remains useful as a practical estimate/trend input, not a measured 1RM.

**V1 requirement:** preserve “estimated” language; retain exercise/source/date provenance. Do not expose false precision. A future formula-comparison/ensemble may improve robustness but is not a V1 blocker.

## CALC-STR-002 — Working Weight for Reps@RPE

**Verdict: SUPPORTED_WITH_LIMITATIONS.**

RPE/RIR/autoregulation has empirical support as a prescription strategy. However, TK's implementation contains two distinct layers:
- RPE/RIR as a subjective autoregulation signal: scientifically defensible.
- exact mapping `RIR = 10 − RPE` plus Brzycki-inverse and default RPE 8: a practical model, not universally exact physiology.

The 2024 RIR-velocity validation study found individual relationships more accurate than general relationships, supporting TK's existing warning that RPE/RIR is person/exercise/context dependent.

**V1 requirement:** never describe the calculated working weight as “the scientifically optimal weight.” Prefer “suggested/estimated working weight based on your 1RM estimate and RPE/RIR target.”

## CALC-STR-003 — Tonnage

**Verdict: EVIDENCE_CORRECTION_REQUIRED.**

`sets × reps × load` is a valid descriptive volume-load/tonnage calculation (**E** as arithmetic). But the current registry says **A** for the concept because ACSM supports volume as a hypertrophy driver. That citation mapping is too broad: contemporary hypertrophy dose-response evidence primarily concerns weekly hard-set volume, while tonnage can change because of load/reps without representing equivalent muscle stimulus.

Volume-matched load meta-analysis further demonstrates that equalized volume-load can coexist with different strength adaptations and similar hypertrophy across load ranges. Tonnage therefore should remain a descriptive workload metric, not an A-evidence hypertrophy proxy.

**Required correction:** separate:
- `tonnage` calculation evidence = E/technical;
- `weekly direct/fractional hard sets per muscle` = separate hypertrophy calculation/context construct with its own evidence;
- athlete claim: no “higher tonnage means more muscle growth.”

## Hypertrophy weekly set volume

**Verdict: SUPPORTED_WITH_LIMITATIONS.**

Current evidence supports a dose-response relationship between weekly set volume and hypertrophy, but not a universal magic number for every athlete/muscle. The 2025 meta-regression explicitly models direct/indirect sets and explores diminishing returns.

**TK translation:** muscle-level weekly set counting is more scientifically aligned than tonnage for hypertrophy context. If fractional indirect-set accounting is added, it must be a versioned model with uncertainty rather than hidden arithmetic.

**Forbidden:** “10 sets/week is the minimum required to grow” as a universal individual rule.

## Load selection

**Verdict: SUPPORTED_WITH_LIMITATIONS.**

Higher loads are more specific/effective for maximal 1RM strength; hypertrophy can occur across a broad load spectrum when effort/volume are adequate. TK should therefore distinguish **goal = maximal strength** from **goal = hypertrophy**, rather than using one load range as universally optimal.

## Proximity to failure / RIR

**Verdict: SUPPORTED_WITH_LIMITATIONS.**

Meta-regression suggests hypertrophy tends to increase as sets terminate closer to failure, while the strength relationship is much less clear. Meta-analysis does not show that momentary failure is required for strength or hypertrophy.

**TK rule:** proximity to failure is useful context; **0 RIR/failure is not a universal target**. RIR prescription should consider exercise, safety, fatigue, volume and athlete experience.

## DEC-PROG-001 — RPE progression

**Verdict: PRODUCT_HEURISTIC_RETAIN_WITH_GUARDRAIL.**

Autoregulated training as a class is supported, including RPE-based approaches. But no reviewed evidence validates TK's exact:
- RPE ≤7.5 → +2.5 kg
- RPE ≤8.5 → 0
- otherwise → −7.5 kg/deload

These increments are also not equipment-relative: +2.5 kg has very different relative magnitude for a 20 kg curl vs a 200 kg squat.

**V1 action:** do not present exact deltas as evidence-derived optimal progression. Keep opt-in behavior. Candidate post-audit improvement: equipment-aware/relative progression increments with explicit Decision Registry versioning and feasibility checks.

## DEC-REST-001 — RPE-scaled rest

**Verdict: PRODUCT_HEURISTIC_RETAIN_WITH_GUARDRAIL / V1 correction needed.**

Evidence supports avoiding unnecessarily short rests when performance/volume retention matters; the 2024 hypertrophy meta-analysis suggests a small benefit above 60 s but no appreciable difference detected beyond roughly 90 s, with heterogeneity. This does **not** validate TK's exact RPE multipliers.

**V1 action:** athlete wording should say “suggested rest” rather than “optimal rest”. Exact multipliers remain product heuristic. Goal/exercise context is scientifically more defensible than RPE alone for future rest prescription.

## CALC-STR-004 — Warm-up ladder

**Verdict: TECHNICAL_HEURISTIC_APPROPRIATE.**

Warm-up can improve subsequent performance, but current evidence does not establish one universal best protocol. TK already labels its exact 40/55/70/80/90% ladder as Evidence E and explicitly says it is not scientifically validated. That classification is correct.

**V1 action:** no scientific blocker. Keep as editable suggestion; avoid “optimal warm-up”. Equipment-aware rounding is a practical strength.

## Periodization

**Verdict: CONTEXT_DEPENDENT.**

Volume-equated meta-analysis found a small advantage of periodized training for 1RM strength, especially in trained participants, but no clear hypertrophy advantage. Therefore TK must not imply complex periodization is necessary for hypertrophy.

## Frequency / split

**Verdict: VOLUME_DISTRIBUTION_CONTEXT.**

Current evidence does not justify claiming a specific split as inherently superior when weekly volume is equated. Frequency can be used to distribute tolerable volume and fit preferences/schedule.

## Range of motion

**Verdict: SUPPORTED_WITH_CONTEXT.**

Full ROM has evidence favoring strength and some lower-limb hypertrophy outcomes over partial ROM, but this should not become a universal “partial reps are wrong” rule. Exercise goal, joint tolerance and long-muscle-length research require contextual treatment.

## Strength-basis recency (CALC-STR-006)

**Verdict: SUPPORTED_WITH_LIMITATIONS.**

Using recent representative performance rather than a historical peak is conceptually sound. TK appropriately labels exact reps≤10 and age-quality bands as product choices and does not numerically decay the estimate merely because it is older.

## Athlete-facing claim policy from Wave 1

Allowed:
- “Geschat 1RM”
- “Voorgesteld werkgewicht”
- “Je set eindigde dichter bij falen”
- “Meer wekelijkse sets kan, gemiddeld, meer hypertrofie ondersteunen; individuele respons verschilt”
- “Voorgestelde rusttijd”
- “Opwarmsuggestie”

Not allowed without stronger evidence:
- “Dit is je exacte 1RM”
- “Dit gewicht is optimaal voor spiergroei”
- “RPE 7 betekent exact 3 herhalingen over voor iedereen”
- “10 sets is de minimale hoeveelheid voor groei”
- “Meer tonnage = meer spiergroei”
- “Je moet tot falen trainen”
- “Deze rusttijd is wetenschappelijk optimaal”
- “+2.5 kg is de wetenschappelijk juiste progressie”

## Wave 1 V1 scientific gaps

### SCI-GAP-V1-001 — Tonnage evidence conflation
**Severity:** HIGH.  
**Action:** change registry evidence wording; decouple tonnage from weekly-set hypertrophy evidence.

### SCI-GAP-V1-002 — Progression heuristic claim boundary
**Severity:** HIGH.  
**Action:** retain deterministic rule if desired, but explicitly classify exact cutoffs/deltas as product heuristic everywhere athlete/AI explanation can surface them.

### SCI-GAP-V1-003 — Rest heuristic claim boundary
**Severity:** MEDIUM-HIGH.  
**Action:** retain rule as suggestion; no “optimal” claim; plan goal/exercise-aware redesign only if needed.

### SCI-GAP-V1-004 — RPE/RIR false precision
**Severity:** MEDIUM.  
**Action:** ensure UI/AI consistently frames RIR as subjective estimate; no universal exact RPE↔RIR physiology.

### SCI-GAP-V1-005 — Hypertrophy volume construct
**Severity:** MEDIUM.  
**Action:** if TK uses hypertrophy-volume decisions, base them on explicit muscle-level set constructs, not tonnage alone; version direct/indirect-set assumptions.

## Closure

**Wave 1 scientific audit: COMPLETE.**  
Production code changed: **NO**.  
Scientific corrections implemented in production registry: **NO — findings are staged for explicit remediation after audit review.**  
Next wave: Recovery / HRV / RHR / sleep / soreness / muscle-recovery construct validity.
