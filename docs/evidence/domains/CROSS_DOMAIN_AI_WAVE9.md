# Wave 9 — Cross-Domain Decision Rules, AI Coach & Athlete-Facing Claims
**Status:** COMPLETE — 2026-09-18

## Verdict
TK's Calculation → Context → Decision → AI architecture is scientifically safer than allowing an LLM to prescribe directly. Current evidence supports keeping the AI as an explanation/interface layer, not a source of physiological truth or an autonomous Decision Engine.

A 2025 scoping review found evaluation of LLM exercise/health coaches fragmented and often low-rigor (PMID 41086432). A 2026 systematic review of exercise recommendation reported variable quality and important safety failures in published LLM systems (PMID 42422387). This reinforces TK's deterministic-engine boundary.

## Cross-domain audit
### DEC-READYDAY-001
**ARCHITECTURALLY SOUND, SCIENTIFICALLY LIMITED BY INPUTS.** The rule does not calculate new physiology and correctly returns no advice with insufficient data. However, Wave 2 identified unvalidated upstream composites/muscle-recovery %. A composition cannot have stronger validity than its decisive inputs.

### AI Output Contract
**STRONG PRODUCT SAFETY CONTROL.** Existing blocks against diagnosis, HRV-as-diagnosis, ACWR injury-risk percentages and personal nutrition calculations align with scientific claim boundaries. Regex/output validation is not proof of clinical safety and must be complemented by structured allowed-output contracts/tests.

### Explanation
AI may explain:
- already-calculated values;
- provenance, missing data and confidence;
- which versioned Decision Rule fired;
- registered evidence limitations.

AI may not:
- recalculate;
- fill missing values;
- create a new threshold;
- convert association into causation;
- diagnose;
- override Decision output;
- convert a product heuristic into “science says”.

## V1 gaps
- **SCI-GAP-V1-045 CRITICAL:** upstream scientific validity must gate downstream AI language; no polished explanation can legitimize an invalid input construct.
- **SCI-GAP-V1-046 HIGH:** every athlete-facing recommendation should expose rule/version/reasons/confidence at least through drill-down/audit evidence.
- **SCI-GAP-V1-047 HIGH:** AI output validation should be structured/allowlisted where feasible; regex alone is defense-in-depth, not proof.
- **SCI-GAP-V1-048 HIGH:** heuristic vs evidence-backed status must survive Calculation→Decision→AI without being lost.
- **SCI-GAP-V1-049 MEDIUM-HIGH:** causal language (“because X caused Y”) requires evidence; default to association/context.
- **SCI-GAP-V1-050 MEDIUM:** AI-coach effectiveness/safety needs real user/device evaluation; architecture correctness is not clinical effectiveness.

**Production code changed:** NO.
