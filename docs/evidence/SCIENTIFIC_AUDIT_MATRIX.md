# SCIENTIFIC_AUDIT_MATRIX.md

**Status:** ALL 9 SCIENTIFIC DOMAIN WAVES COMPLETE — remediation/closure gate pending.

| TK ID | Domain | Calculation | Interpretation | Decision | Athlete/AI claim | Initial verdict | Priority | Evidence IDs | Next scientific action |
|---|---|---|---|---|---|---|---|---|---|
| CALC-STR-002 | Strength | RPE/RIR working-weight pathway | Subjective/context-dependent; individual relationships outperform generic ones | Exact prescription model is practical, not universal physiology | Explain as suggested/estimated working weight | SUPPORTED_WITH_LIMITATIONS | V1-HIGH | EVID-STR-001,EVID-STR-002,EVID-STR-003,EVID-STR-016 | Preserve claim boundary; no exact RPE↔RIR physiology |
| CALC-STR-003 | Strength/Hypertrophy | Tonnage arithmetic valid (E/technical) | Tonnage is not equivalent to weekly hypertrophy set-volume | Must not drive hypertrophy prescription alone | “More tonnage = more growth” forbidden | EVIDENCE_CORRECTION_REQUIRED | V1-HIGH | EVID-STR-001,EVID-STR-005,EVID-STR-007 | SCI-GAP-V1-001: correct registry wording |
| DEC-PROG-001 | Strength | n/a | Autoregulation supported as a class | Exact RPE bands and fixed kg deltas not validated by reviewed evidence | Product rule; never evidence-derived optimum | PRODUCT_HEURISTIC_RETAIN_WITH_GUARDRAIL | V1-HIGH | EVID-STR-011,EVID-STR-012 | SCI-GAP-V1-002; consider relative/equipment-aware increments later |
| DEC-RECADJ-001 | Recovery | n/a | Combines dayfactor/muscle recovery/feeling/pain | Exact 0.90/0.97 and set/RPE deltas are product heuristics | Must not imply physiological precision | EVIDENCE_UPDATE_REQUIRED | V1-CRITICAL | — | Full recovery/muscle-recovery evidence wave |
| DEC-READY-001 | Readiness | n/a | Readiness zone is product interpretation | Exact ≥1.00/≥0.93 thresholds are product heuristics | No forced rest/medical diagnosis | EVIDENCE_UPDATE_REQUIRED | V1-CRITICAL | EVID-REC-001 | Audit CALC-REC-002 construction and each input before threshold judgment |
| DEC-REST-001 | Strength | n/a | Rest affects acute performance/volume; hypertrophy evidence favors avoiding very short rest | Exact 0.75–1.5× RPE scaling not validated | “Suggested rest”, not optimal rest | PRODUCT_HEURISTIC_RETAIN_WITH_GUARDRAIL | V1-HIGH | EVID-STR-008 | SCI-GAP-V1-003; future goal/exercise-aware model |
| CALC-STR-001 | Strength | e1RM estimate useful with exercise/rep limitations | Must remain estimate | Can feed prescription with inherited uncertainty | “Estimated 1RM” only | SUPPORTED_WITH_LIMITATIONS | V1-MEDIUM | existing formula-specific validation + EVID-STR-001 | No V1 blocker |
| CALC-STR-004 | Strength | Deterministic warm-up ladder | Warm-up useful; exact ladder not validated | No hard scientific action | Editable warm-up suggestion | TECHNICAL_HEURISTIC_APPROPRIATE | V1-LOW | EVID-STR-009,EVID-STR-010 | No scientific blocker |
| Hypertrophy weekly set volume | Hypertrophy | Muscle-level set construct needed | Dose-response exists, individual optimum uncertain | No universal minimum/maximum | Avoid “10 sets required” | SUPPORTED_WITH_LIMITATIONS | V1-HIGH | EVID-STR-001,EVID-STR-005 | SCI-GAP-V1-005 if used for decisions |
| CALC-REC-001 | Recovery/HRV | Personal Ln-RMSSD rolling baseline defensible | Autonomic signal, not local muscle recovery | One component only | No diagnosis/forced rest | SUPPORTED_WITH_LIMITATIONS | V1-HIGH | EVID-REC-001,EVID-REC-002,EVID-REC-003 | Preserve baseline; provenance/method confidence |
| CALC-REC-002 | Recovery | HRV×sleep×cycle arithmetic deterministic | Composite not physiologically validated | Feeds readiness rules | Derived TK index only | PRODUCT_COMPOSITE | V1-HIGH | EVID-REC-003,EVID-SLEEP-001 | SCI-GAP-V1-008 |
| CALC-REC-003 | Recovery | Weighted 0–100 composite deterministic | 45/30/15/10 weights/bands unvalidated | Advisory context only | Never “% body recovered” | EXPERIMENTAL_PRODUCT_INDEX | V1-HIGH | EVID-REC-005,EVID-SLEEP-001 | SCI-GAP-V1-007 |
| CALC-REC-004 | Recovery/RHR | Personal RHR delta descriptive | Nonspecific context signal | No standalone action | No causal/diagnostic claim | SUPPORTED_AS_CONTEXT | V1-HIGH | EVID-RHR-001 | SCI-GAP-V1-010 |
| CALC-STR-005 | Local recovery | Time×RPE model deterministic | Does not validate physiological muscle-recovery % | Must not independently adjust training | “78% recovered” forbidden | OVERCLAIM_REDIRECT | V1-CRITICAL | EVID-REC-004,EVID-REC-005,EVID-REC-006 | SCI-GAP-V1-006: redesign as local recovery context |
| DEC-RECADJ-001 | Recovery | n/a | Multi-signal adjustment concept plausible | Exact thresholds/deltas heuristic; muscle-% input overprecise | Advisory reasons/confidence | INPUT_AND_CLAIM_REVIEW | V1-CRITICAL | EVID-REC-005,EVID-REC-007 | SCI-GAP-V1-009 |
| DEC-READY-001 | Readiness | n/a | Composite zone is product interpretation | ≥1.00/≥0.93 not validated thresholds | Advisory only | PRODUCT_HEURISTIC_RETAIN_WITH_GUARDRAIL | V1-HIGH | EVID-REC-003,EVID-SLEEP-001 | SCI-GAP-V1-012 |
| CALC-LOAD-* | Load | pending | ACWR/load interpretation pending | ACWR guardrail currently documented intact | No injury prediction/safe zone | NOT_YET_AUDITED | V1-CRITICAL | — | Wave 3 |
| NUTR-* | Nutrition | pending | logging ≠ deficiency already guarded | current rules context/data-only | no fabricated dose/deficiency | NOT_YET_AUDITED | V1-HIGH | EVID-NUT-001 | Wave 5 |
| Wearable/provider metrics | Wearables | provider-specific | validity must be metric/device-specific | no direct action from low-validity metric alone | estimates labelled as estimates | NOT_YET_AUDITED | V1-HIGH | EVID-WEAR-001 | Wave 7 |

## Immediate red-flag queue

1. **CALC-STR-003 evidence wording:** the registry currently gives A evidence to the concept around “volume” while the implementation is tonnage (`sets × reps × weight`). ACSM's hypertrophy-volume finding is expressed primarily in weekly set volume, not proof that tonnage is an A-level hypertrophy proxy. This needs correction or sharper separation after full strength wave.
2. **DEC-PROG-001:** exact fixed kg increments are explicitly product heuristics and require a deliberate V1 claim boundary.
3. **DEC-RECADJ-001 / DEC-READY-001:** numerical precision may exceed scientific support unless the underlying dayfactor and recovery model justify it.
4. **DEC-REST-001:** RPE-scaled rest factors should not be presented as scientifically optimal until goal-specific rest evidence is mapped.
5. **Muscle recovery percentages:** require dedicated audit of construct validity. A percentage-looking output can create false precision even when individual inputs are useful.


## Waves 3–9 closure summary

| Wave | Domain | Scientific verdict | Highest V1 issue |
|---|---|---|---|
| 3 | Load / sRPE / ACWR | Descriptive load useful; ACWR prediction prohibited | SCI-GAP-V1-014 HIGH |
| 4 | Endurance / CS / CP / zones | Models useful with protocol/provenance limits | SCI-GAP-V1-018 HIGH |
| 5 | Nutrition / hydration / energy | Current conservative context model appropriate | SCI-GAP-V1-024/025 HIGH |
| 6 | Supplements | Claim-level evidence only; no autonomous prescribing | SCI-GAP-V1-029/030 HIGH |
| 7 | Wearables | Metric×device×method validity required | SCI-GAP-V1-034 CRITICAL |
| 8 | Female physiology / cycle | Context/symptoms yes; automatic phase multiplier no | SCI-GAP-V1-040 CRITICAL |
| 9 | Cross-domain Decision + AI | Architecture strong; upstream validity must gate AI | SCI-GAP-V1-045 CRITICAL |

**Total registered scientific V1 gaps after Waves 1–9: 50.**
See `docs/evidence/SCIENTIFIC_V1_GAP_REPORT.md` for remediation order.
