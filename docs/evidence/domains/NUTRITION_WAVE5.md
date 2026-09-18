# Wave 5 — Nutrition, Hydration, Energy Availability & Training Context
**Status:** COMPLETE — 2026-09-18

## Verdict
TK's current nutrition architecture is unusually conservative and scientifically safer than attempting automatic personalized targets. Logging presence is not nutritional adequacy; this existing rule is retained.

### Protein
**SUPPORTED_WITH_CONTEXT.** Protein intake supports resistance-training adaptation; evidence supports useful population ranges, but individual prescription depends on energy intake, training, body composition goals and population. TK must not convert a generic range into a personalized medical/dietetic target without an explicit validated rule and context.

### Carbohydrate
**SUPPORTED_WITH_CONTEXT.** Carbohydrate availability is relevant especially for prolonged/high-intensity endurance work. Requirements are workload- and session-dependent. Generic “low carb = bad recovery” logic is prohibited.

### Hydration
**SUPPORTED_WITH_CONTEXT.** Hydration matters, but fixed universal fluid targets ignore sweat rate, environment, body size, session duration and sodium loss. TK's current no-ml-prescription approach is appropriate until individualized methodology exists.

### Energy availability / REDs
The IOC 2023 consensus defines REDs as health/performance impairment associated with problematic low energy availability in female and male athletes. This is a clinical/sports-medicine construct, not something TK can diagnose from incomplete food/exercise logs. Wearable calorie estimates are too uncertain to diagnose LEA/REDs.

### Energy expenditure
**ESTIMATE ONLY.** Wearable energy expenditure is device/model dependent and less reliable than many HR measurements. Do not build precise calorie deficits or REDs decisions from wearable expenditure.

### Current NUTR-RULE-001/002
**SUPPORTED AS SAFE CONTEXT DESIGN.** “No logging found” instead of “you ate too little” is scientifically and logically correct. Existing low-confidence qualitative timing context is acceptable; current evidence entries should be upgraded from vague “general consensus” citations to traceable source IDs.

## V1 gaps
- **SCI-GAP-V1-024 HIGH:** replace vague nutrition evidence citations with traceable consensus/review sources per claim.
- **SCI-GAP-V1-025 HIGH:** prohibit REDs/deficiency diagnosis from app logs or wearable energy expenditure.
- **SCI-GAP-V1-026 MEDIUM-HIGH:** wearable calories remain estimate-labelled and cannot create precise energy-balance targets.
- **SCI-GAP-V1-027 MEDIUM:** any future protein/carbohydrate/fluid target requires sport/session/population applicability + confidence, not a universal number.
- **SCI-GAP-V1-028 MEDIUM:** timing claims must avoid “anabolic window” deadlines and causal recovery guarantees.

**Production code changed:** NO.
