# Trainingskompas Target Product Architecture — Final Completeness Audit

**Status:** FINAL ARCHITECTURE COMPLETENESS REVIEW — TARGET DESIGN  
**Date:** 2026-09-02  
**Scope:** beoordeelt of de functionele targetproductarchitectuur voldoende compleet is om de volgende productfase — Product Owner gecontroleerde UX/screen architecture — te starten. Dit document verklaart NIET dat targetfunctionaliteit al in runtime gebouwd of gevalideerd is.

## 1. Auditvraag

Is er nog een belangrijk productdomein waarvoor onvoldoende is bepaald:
- wat het product functioneel moet doen;
- wat de canonical source of truth is;
- hoe ownership/authorization/privacy werken;
- hoe het met Calculation/Context/Decision/Evidence/AI samenhangt;
- hoe offline/errors/versioning/provenance worden behandeld;
- hoe het met andere domeinen integreert?

## 2. Resultaat

**Conclusie: de target product architecture is voldoende compleet om de architectuuruitwerkingsfase af te sluiten en een afzonderlijke Product Owner UX/screen-designfase te starten.**

Dat betekent NIET:
- dat alle functies zijn gebouwd;
- dat alle benchmarkdomeinen runtime >=9 zijn;
- dat externe devices/providers gevalideerd zijn;
- dat prijzen/PSP's/partnercontracten zijn gekozen;
- dat medical/research regulatory approvals bestaan;
- dat de huidige UI al bij de targetarchitectuur past.

Het betekent wel dat er geen groot P0/P1 productdomein meer zichtbaar is waarvoor eerst nog een fundamenteel canonical functioneel model moet worden ontworpen voordat schermarchitectuur verantwoord kan beginnen.

## 3. Gedekte productlagen

### Athlete core
- Today/Home orchestration;
- conversational onboarding/activation;
- profile/account/privacy;
- training execution;
- exercises/training elements;
- workout builder/templates;
- programs/planning;
- events/competitions;
- history/performance/comparison;
- Insight;
- recovery/health context;
- nutrition;
- Women's Performance governance;
- devices/wearables;
- AI Coach;
- search/discovery;
- notifications/reminders;
- athlete subscriptions/entitlements.

### Human/community/org
- Human Coach/PT;
- social/feed/connections;
- groups;
- activity-bound cohorts;
- challenges;
- Teams;
- Gym/Club organizations;
- Gym commercial model;
- web management portal target;
- multi-role/multi-tenant privacy model.

### Platform/governance
- Calculation/Context/Decision/Evidence separation;
- data quality/confidence/provenance;
- integration/API/data portability;
- research/scientific product layer;
- internal operations/support/admin;
- accessibility/localization/time;
- medical/pain/injury boundary;
- entitlements versus authorization;
- export/delete;
- offline/retry/dedupe;
- observability/audit.

## 4. Source-of-truth architecture

Canonical chain remains:

```text
RAW SOURCES
  ↓
Normalization + Provenance + Data Quality
  ↓
Canonical Domain Models
  ↓
Calculation Engine
  ↓
Context Engine
  ↓
Decision / Rules Engine
  ↓
Evidence + Confidence
  ↓
AI Coach / Human Coach / Insight / Today
  ↓
Athlete / Team / Organization experiences
```

Hard rule: AI is not calculation or decision truth.

## 5. Canonical object boundaries now defined

Key distinctions are explicitly covered:
- Exercise/Training Element != Workout != Program != Planned Item != Execution;
- Event != Participation != Planned Item != Execution != Result;
- History != Insight != Coach;
- Group != Team != Activity Cohort != Organization;
- Organization membership != Gym commercial subscription != Athlete subscription != Entitlement != Authorization/Consent;
- Product/label data != Nutrition log != Supplement evidence;
- Device/connector != Canonical activity truth;
- Profile identity != Auth != Entitlement;
- Product use != Research participation;
- Pain context != Diagnosis.

## 6. Cross-domain propagation

Target architecture now has explicit contracts for major state changes.

Examples:
- workout moved -> Planning -> Today -> Notifications -> team/coach views;
- event postponed -> Event -> Program -> Planning -> Today -> Notifications;
- workout completed -> Execution -> History -> Calculation -> Recovery/Insight -> Program progress -> Today;
- device disconnect -> Connector -> Devices/Settings -> contextual execution fallback -> notification if relevant;
- coach consent revoked -> authorization -> coach access -> AI payload -> caches/materialized views;
- gym sponsorship ends -> entitlement resolver only; athlete history/privacy untouched;
- nutrition product recipe changes -> future product resolution version; historical logs unchanged;
- source correction -> provenance/correction -> Calculation recomputation -> downstream derived outputs;
- account deletion -> identity/data/connectors/files/relationships/exports according governance.

## 7. Functional architecture maturity matrix

| Domain | Target architecture completeness | Remaining before implementation closure |
|---|---|---|
| Today/Home | HIGH | UX + runtime orchestration tests |
| Onboarding | HIGH | conversation UX + extraction implementation/validation |
| Training/Exercises/Workouts | HIGH | canonical runtime refactor/build where gaps exist |
| Programs/Planning | HIGH | implementation + scheduling/adaptation tests |
| Events/Competition | HIGH | implementation + external source choices |
| History/Comparison | HIGH | implementation/UX hardening |
| Insight | HIGH | implementation/benchmark hardening |
| Recovery | HIGH | source/device validation + UX |
| Nutrition | HIGH | database/source licensing + implementation |
| Women's Performance | HIGH for current intended scope | pregnancy/postpartum/etc remain explicit future product decisions |
| Devices/Wearables | HIGH target | provider/device real-world validation remains |
| AI Coach | HIGH governance | model/runtime validation ongoing |
| Human Coach/PT | HIGH | user-facing UI and product entitlement decisions |
| Social/Groups/Challenges | HIGH | UX/runtime benchmark hardening |
| Team | HIGH | UI exposure + runtime hardening |
| Gym/Club | HIGH | canonical UI/web portal implementation; legacy model retirement |
| Commercial athlete | HIGH | feature matrix, pricing, PSP/store choices + implementation |
| Gym commercial/web | HIGH | PSP + portal implementation |
| Search/Discovery | HIGH | indexing/search implementation |
| Notifications | HIGH | infrastructure + UX/preferences implementation |
| Research | HIGH governance | external studies/ethics/partners remain external/product work |
| Integrations/API | HIGH | connector-specific implementation/validation |
| Internal Ops | HIGH | admin tooling implementation |
| Accessibility/Localization/Time | HIGH architecture | real UX/accessibility audit required |
| Pain/Injury/Medical boundary | HIGH boundary | no medical expansion without separate governed design |

## 8. Known open Product Owner decisions — not architecture blockers

These remain deliberately open and should not stop UX architecture:
- exact Free/Premium capability matrix;
- athlete pricing/trial duration;
- payment provider/store strategy;
- public profile fields/handle;
- detailed notification defaults;
- exact team/gym commercial packages;
- pregnancy/postpartum/menopause expansion;
- future verified medical-professional roles;
- public/community workout/program publishing;
- public API timing;
- research partner products;
- motion-sensor premium positioning;
- detailed telemetry opt-in policy;
- minors/family account architecture.

They become decision gates when their corresponding screen/implementation is reached.

## 9. External blockers — not architecture gaps

Examples:
- Google/other wearable production credentials;
- real device validation;
- Concept2 real-device validation;
- GS1 licensing/commercial terms;
- food/supplement source licensing;
- PSP/store agreements;
- organizer/event provider integrations;
- research ethics/contracts;
- future regulated/medical validation.

Target design must continue to label these honestly as external/open.

## 10. Current implementation versus target

The repository's existing application remains the CURRENT implementation source of truth. The TARGET documents describe the desired product architecture.

No target document may be used to claim runtime capability without code/database/tests/live validation.

## 11. Benchmark >=9 interpretation

From this point two different `>=9` concepts must remain separate:

### A. Architecture/Product Definition >=9
The function is sufficiently specified to build/test without inventing major product rules during UI implementation.

### B. Runtime/Product Quality >=9
The implemented capability is benchmark-competitive and proven through code/database/tests/live validation, security/privacy/error handling/offline/evidence/device validation as relevant.

This audit closes A at the whole-product architecture level, not B.

## 12. Remaining architectural risk areas

No new foundational block is required, but these need special attention during implementation/UX:
1. keeping one canonical organization/team model and retiring legacy gym parallelism;
2. preventing screen-specific duplicate logic during migration;
3. preserving the one central Execution/Logging chain;
4. preserving AI/Calculation/Decision boundaries;
5. preventing entitlement checks from becoming authorization shortcuts;
6. data-source licensing for nutrition/product databases;
7. real device/provider validation;
8. sensitive-data scope design in Coach/Team/Gym;
9. accessibility and timezone correctness during actual screen design;
10. user comprehension of complex capabilities without hiding important information.

## 13. UX phase entry gate

The product may now enter UX architecture only under these constraints:
- no bulk redesign/build without PO approval;
- screen-by-screen or coherent flow-by-flow;
- first show functional purpose/content/actions;
- then concrete visual example/mock-up;
- Product Owner reviews/corrects;
- only after approval implement;
- preserve canonical target architecture even if current screen structure differs;
- do not keep a current screen solely because it exists today.

## 14. Proposed target top-level navigation to test visually

Working target, not final UX approval:
- Vandaag;
- Trainen;
- Inzicht;
- Coach;
- Samen;
- Profile/Settings outside primary five.

Important: this is a hypothesis for the UX phase, not authorization to implement it.

## 15. Screen architecture work order

Recommended Product Owner review order:
1. global navigation/shell and role switching;
2. Vandaag;
3. Trainen overview;
4. Planning/Calendar;
5. Programma's;
6. Workout Builder/Training maken;
7. Execution — Strength;
8. Execution — Running/Cycling;
9. Execution — Ergometer/Hybrid/Multisport;
10. History/Activity Detail/Compare;
11. Inzicht;
12. Coach AI/Human;
13. Samen/Social/Groups/Team;
14. Nutrition;
15. Events;
16. Profile/Privacy/Devices/Settings;
17. subscription/paywall;
18. Gym/Club web portal;
19. onboarding/conversational activation;
20. admin/support/research surfaces where relevant.

Order can change after PO review, but implementation waits for approval.

## 16. Final architecture stop condition

Stop adding broad architecture documents unless one of the following occurs:
- completeness audit reveals a genuine missing domain;
- PO makes a new product decision that creates a new foundational capability;
- implementation exposes a canonical conflict;
- scientific/safety/legal evidence requires redesign;
- external integration imposes a material contract constraint.

Otherwise move to UX/product-flow specification rather than endless architecture expansion.

## 17. Final status

**TARGET PRODUCT ARCHITECTURE: DESIGN-COMPLETE ENOUGH FOR UX PHASE.**

**RUNTIME FUNCTIONAL BENCHMARK >=9: NOT IMPLIED; must still be proven capability-by-capability after implementation.**

**NEXT PHASE: Product Owner active UX architecture, screen/flow by screen/flow, example first, approval before build.**

## 18. Harde slotregels

`ARCHITECTURE COMPLETE != SOFTWARE COMPLETE.`

`NO SCREEN SHOULD INVENT PRODUCT LOGIC.`

`NO TARGET DOCUMENT IS PROOF OF IMPLEMENTATION.`

`UX NOW FOLLOWS THE CANONICAL PRODUCT MODEL — NOT THE OTHER WAY AROUND.`