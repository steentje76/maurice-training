# EVIDENCE_REGISTRY.md — Trainingskompas Scientific Evidence Registry

**Registry version:** 0.1-foundation  
**Baseline:** `0dcb7cd542d97bcba13209f3ef9662384edc72f8`

This registry stores evidence at source level. A source can support multiple calculations/rules, but every use must state applicability and limitations in the Scientific Audit Matrix.

| Evidence ID | Domain | Source | Type | Population / scope | Initial evidence use | Status |
|---|---|---|---|---|---|---|
| EVID-STR-001 | Strength/Hypertrophy | Currier BS et al. 2026. *ACSM Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults*. Med Sci Sports Exerc. DOI 10.1249/MSS.0000000000003897; PMID 41843416. | Position stand / overview of 137 systematic reviews | Healthy adults ≥18; RT ≥6 weeks; >30,000 participants across reviews | RT prescription, strength/hypertrophy volume/load, limits of failure/periodization claims | VERIFIED_ANCHOR |
| EVID-STR-002 | Hypertrophy/RIR | Robinson ZP et al. 2024. *Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy*. Sports Med 54:2209–2231. DOI 10.1007/s40279-024-02069-2; PMID 38970765. | Exploratory multilevel meta-regression | Resistance training studies; estimated RIR | Proximity-to-failure interpretation; exact dose-response uncertainty | VERIFIED_ANCHOR |
| EVID-STR-003 | Hypertrophy/Failure | Refalo MC et al. 2023. *Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy*. Sports Med 53:649–665. DOI 10.1007/s40279-022-01784-y; PMID 36334240. | Systematic review/meta-analysis | Healthy adults, any age/training experience | Failure vs non-failure; prevents “failure required” overclaim | VERIFIED_ANCHOR |
| EVID-REC-001 | HRV/Endurance | Düking P et al. 2021. *Heart Rate Variability-Guided Training for Enhancing Cardiac-Vagal Modulation, Aerobic Fitness, and Endurance Performance*. | Methodological systematic review/meta-analysis | Endurance training studies | HRV-guided training; methodology/baseline limitations | VERIFIED_ANCHOR |
| EVID-NUT-001 | Protein | Morton RW et al. 2018. *Protein supplementation and resistance training-induced gains in muscle mass and strength*. Br J Sports Med 52:376–384. DOI 10.1136/bjsports-2017-097608; PMID 28698222 (with published correction PMID 32943392). | Systematic review/meta-analysis/meta-regression | Healthy adults undertaking resistance training | Protein intake/supplementation; dose-response context | VERIFIED_ANCHOR |
| EVID-WEAR-001 | Wearables | 2026 systematic review/meta-analysis, *Is my smartwatch a valid witness?* PMID 41819643. | Systematic review/meta-analysis | Major smartwatch brands; mostly healthy/laboratory populations | Metric-specific validity; heterogeneous evidence; no blanket wearable accuracy claim | VERIFIED_ANCHOR |

## Registry rules

1. DOI/PMID/title must be checked before `VERIFIED_ANCHOR`.
2. A paper's existence never determines TK evidence level by itself; consistency, directness and applicability matter.
3. Exact product thresholds require direct justification or remain labelled `Product heuristic`.
4. Secondary/marketing/competitor material cannot upgrade a calculation to A/B evidence.
5. Every evidence update records review date and supersession rather than silently rewriting historical rationale.
