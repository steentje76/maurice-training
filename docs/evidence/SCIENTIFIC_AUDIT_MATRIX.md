# SCIENTIFIC_AUDIT_MATRIX.md

**Status:** foundation seeded; domain-by-domain audit pending.

| TK ID | Domain | Calculation | Interpretation | Decision | Athlete/AI claim | Initial verdict | Priority | Evidence IDs | Next scientific action |
|---|---|---|---|---|---|---|---|---|---|
| CALC-STR-002 | Strength | RPE/RIR working-weight pathway | RPE/RIR is subjective/context-dependent | DEC-PROG-001 exact ≤7.5/≤8.5 and +2.5/−7.5 kg are product heuristics | May explain, never portray RIR as objective physiology | SUPPORTED_WITH_LIMITATIONS | V1-HIGH | EVID-STR-001,EVID-STR-002,EVID-STR-003 | Audit formula validity separately from exact progression thresholds |
| CALC-STR-003 | Strength/Hypertrophy | Tonnage arithmetic is valid | Tonnage is not hypertrophy stimulus itself | Must not drive hypertrophy prescription alone | “More tonnage = better growth” forbidden | SUPPORTED_WITH_LIMITATIONS | V1-HIGH | EVID-STR-001 | Re-evaluate registry's A-level wording: distinguish set-volume evidence from tonnage |
| DEC-PROG-001 | Strength | n/a | n/a | Exact RPE bands and fixed kg deltas currently have no formula-specific scientific source | Recommendation must be labelled product rule, not evidence-derived optimum | EVIDENCE_UPDATE_REQUIRED | V1-HIGH | EVID-STR-001,EVID-STR-002 | Search progression/autoregulation evidence; decide retain heuristic vs revise |
| DEC-RECADJ-001 | Recovery | n/a | Combines dayfactor/muscle recovery/feeling/pain | Exact 0.90/0.97 and set/RPE deltas are product heuristics | Must not imply physiological precision | EVIDENCE_UPDATE_REQUIRED | V1-CRITICAL | — | Full recovery/muscle-recovery evidence wave |
| DEC-READY-001 | Readiness | n/a | Readiness zone is product interpretation | Exact ≥1.00/≥0.93 thresholds are product heuristics | No forced rest/medical diagnosis | EVIDENCE_UPDATE_REQUIRED | V1-CRITICAL | EVID-REC-001 | Audit CALC-REC-002 construction and each input before threshold judgment |
| DEC-REST-001 | Strength | n/a | RPE can contextualize fatigue | Exact 0.75–1.5× rest scaling is product heuristic | Do not call individualized optimal rest | EVIDENCE_UPDATE_REQUIRED | V1-HIGH | EVID-STR-001 | Search inter-set rest evidence; compare strength/hypertrophy goals |
| CALC-REC-* | Recovery | pending | HRV/RHR/sleep/recovery interpretation pending | downstream rules pending | No “HRV = muscle recovered” claim | NOT_YET_AUDITED | V1-CRITICAL | EVID-REC-001 | Wave 2 |
| CALC-LOAD-* | Load | pending | ACWR/load interpretation pending | ACWR guardrail currently documented intact | No injury prediction/safe zone | NOT_YET_AUDITED | V1-CRITICAL | — | Wave 3 |
| NUTR-* | Nutrition | pending | logging ≠ deficiency already guarded | current rules context/data-only | no fabricated dose/deficiency | NOT_YET_AUDITED | V1-HIGH | EVID-NUT-001 | Wave 5 |
| Wearable/provider metrics | Wearables | provider-specific | validity must be metric/device-specific | no direct action from low-validity metric alone | estimates labelled as estimates | NOT_YET_AUDITED | V1-HIGH | EVID-WEAR-001 | Wave 7 |

## Immediate red-flag queue

1. **CALC-STR-003 evidence wording:** the registry currently gives A evidence to the concept around “volume” while the implementation is tonnage (`sets × reps × weight`). ACSM's hypertrophy-volume finding is expressed primarily in weekly set volume, not proof that tonnage is an A-level hypertrophy proxy. This needs correction or sharper separation after full strength wave.
2. **DEC-PROG-001:** exact fixed kg increments are explicitly product heuristics and require a deliberate V1 claim boundary.
3. **DEC-RECADJ-001 / DEC-READY-001:** numerical precision may exceed scientific support unless the underlying dayfactor and recovery model justify it.
4. **DEC-REST-001:** RPE-scaled rest factors should not be presented as scientifically optimal until goal-specific rest evidence is mapped.
5. **Muscle recovery percentages:** require dedicated audit of construct validity. A percentage-looking output can create false precision even when individual inputs are useful.
