# SCIENTIFIC_V1_GAP_REPORT.md
**Scientific audit waves 1–9:** COMPLETE  
**Audit date:** 2026-09-18  
**Baseline audited:** `main@0dcb7cd542d97bcba13209f3ef9662384edc72f8`

## Executive conclusion
TK has a strong evidence-governance architecture, but **scientific V1 closure is not yet achieved**. The audit found 50 traceable gaps. Most are claim/provenance/heuristic-governance issues rather than reasons to remove core training functionality.

### V1 scientific blockers / critical remediation
1. **SCI-GAP-V1-006:** current local muscle-recovery percentage overstates construct validity. Preferred remediation: categorical local recovery context rather than physiological-looking %.
2. **SCI-GAP-V1-034:** wearable provenance must preserve metric/method/source/device/provider/measured-vs-derived where available; confidence cannot be provider-generic.
3. **SCI-GAP-V1-040:** fixed menstrual-cycle phase multipliers must not automatically alter readiness/prescription without validation.
4. **SCI-GAP-V1-045:** downstream Decision/AI output must be gated by the scientific validity of decisive upstream inputs.

### High-priority V1 corrections
- Separate tonnage from hypertrophy weekly-set evidence (001).
- Keep exact progression/rest/readiness/recovery thresholds explicitly heuristic (002,003,007–009,012).
- Preserve HRV as autonomic context, not muscle recovery/diagnosis; method provenance (011).
- ACWR descriptive only; no injury prediction/safe zone (014).
- CS/CP and zones require model/protocol/input provenance (018–020).
- Nutrition: traceable evidence citations, no REDs/deficiency diagnosis, wearable calories estimate-only (024–026).
- Supplements: claim-level evidence and no AI-created dose/safety/interaction advice (029–031).
- Wearables: metric/device-specific confidence; sleep and calories remain estimates; provider composites isolated (035–039).
- Cycle phase is context, symptoms/personal patterns preferred; no hormone/fertility inference (041–043).
- AI: preserve evidence/heuristic status and expose reasons/confidence/rule provenance (046–049).

## Non-blocking / later validation
Items concerning richer hypertrophy set models, decoupling, TID optimization, supplement evidence refresh, additional population scopes and AI effectiveness studies can remain post-V1 provided current claims stay conservative and no unsupported automation depends on them.

## Remediation order
**R1 Scientific safety:** 006,034,040,045.  
**R2 Claim/evidence correctness:** 001,007,008,009,011,014,024,025,029,030,035,037,038,048.  
**R3 Data quality/provenance:** 010,015,016,018,019,020,026,032,039,041,046.  
**R4 Product refinement/post-V1:** remaining medium items.

## Release rule
Scientific V1 closure requires:
- all four critical items remediated and tested;
- no HIGH item capable of generating an unsupported athlete-facing prescription/diagnosis;
- registries updated to match runtime;
- AI/output-contract tests proving forbidden claims fail closed;
- real-device provenance paths tested where wearable inputs influence visible recovery/readiness;
- final independent re-audit against the remediated HEAD.

No production remediation was performed during Waves 1–9. This report is the handoff from **scientific discovery** to **scientific remediation**.
