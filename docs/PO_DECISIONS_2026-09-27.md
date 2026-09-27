# Trainingskompas — PO decisions 2026-09-27

Status: **DECISION RECORD — implementation and proof still required unless explicitly noted otherwise**

Baseline used for this decision round: `main@f8ea45bc487d2bf9a53618da10c09b92cfd056e0`.

This record captures explicit product-owner decisions made after the audit/roadmap review. It does not by itself close audit gaps. `MERGED != CLOSED_PROVEN`: each implementation must still satisfy its closure contract, tests, runtime evidence and governance requirements.

## Decisions

| Gap | Decision | Canonical direction |
|---|---|---|
| GAP-P2-002 | C | Managed retention. Temporary DB snapshots/backups get purpose, owner, linked release/migration, creation time, rollback window and removal condition. PCC becomes the management model for release/recovery metadata. Do not remove legacy `bak_p_*` snapshots before dependency/recovery proof. |
| GAP-P2-003 | C | Observability becomes a privacy-by-design runtime contract with consistent events/error classes, release identity and PCC release-health integration. No secrets or unnecessary health/training payloads in telemetry. |
| GAP-P2-004 F-01/F-02 | C | Perform credential inventory/provenance first. Active credentials belong in an appropriate server-side secret store; PCC stores metadata/status only, never secret values. Delete legacy DB copies only after proven runtime independence. |
| GAP-P2-004 F-03 | C | Replace the historical shared coach/club PIN with account-bound RBAC. Preserve coach/club functionality and remove PIN only after positive and negative authorization proof. |
| GAP-P2-008 | C | Show a contextual “Training hervatten” card on Vandaag only for a valid resumable session; route into the existing Execution/Logging chain and create no parallel session state. |
| GAP-P2-009 | C | Collect optional post-workout RPE; calculate sRPE deterministically from registered duration and RPE. Use mainly as context/load signal; no input means no invented sRPE. Detailed visibility may be optional/advanced. |
| GAP-P2-010 | C | Harden existing offline/service-worker architecture: complete critical precache coverage and prove offline start, resume, logging, reconnect/sync and release cache invalidation. |
| GAP-P2-012 | C | HRV and RHR need not share an arbitrary minimum. Define evidence-based minimum inputs, data quality and confidence per metric; weak/early baselines must not be presented as mature personal baselines. |
| GAP-P2-014 | C | Make ContextEngineCore the canonical Context Engine. Inventory current production context paths, define contract, migrate incrementally, prove equivalence/regression, then retire superseded paths. Context structures data; it does not calculate or decide. |
| GAP-P2-015 | C | Recovery Score must explicitly incorporate input quality/confidence. Missing/invalid data is not “bad recovery”; avoid false precision and support insufficient-data/low-confidence states. |
| GAP-P2-022 | C | Retain Unified Load as a controlled multi-sport/context layer. Production wiring only after normalization/weighting, evidence, data quality and double-counting protections are explicit and tested. Preserve source metrics/provenance. |
| GAP-P2-024 | C | Separate user lifecycle from team/organization history. Account deletion must not silently cascade-delete legitimate team events; privacy/retention/anonymization remain explicit policies. |
| GAP-P2-032 | C | Keep EvidenceCore as canonical evidence/provenance layer, selectively consumed by Calculation/Decision/AI. It does not calculate or decide. Enable explainability such as “Waarom zegt TK dit?” from governed evidence. |
| GAP-P3-004 | C | Establish one canonical date/time contract and migrate remaining call sites with regression coverage for UTC, athlete-local calendar day, time zones, planned vs executed date and day boundaries. |
| GAP-P3-034 | C | Make SocialPrivacyCore the canonical privacy/visibility layer for social/team/coach relationships. UI hiding is never the security boundary; enforce access server-side/RLS. Role alone does not grant sensitive-data access. |
| GAP-P3-035 | C | Make LongitudinalTrendCore the canonical trend layer. Calculation produces validated metrics; trend layer derives longitudinal development; Context/Decision interpret it; AI explains but does not reconstruct trends from raw data. |
| GAP-P3-036 | C | Develop NutritionIntelligence as a governed nutrition domain using calculations, evidence, context and explicit rules. It is not a free-form AI diet/supplement adviser. Library presence does not imply recommendation. |
| GAP-P3-037 | C | Make CoachIntelligenceCore the canonical coach-support/prioritization layer. Human coach remains decision-maker. Add a responsive Coach/Club Web Portal using the same TK backend, accounts, RBAC/privacy and intelligence stack; PCC remains separate with mandatory 2FA. |
| GAP-P3-038 | C | Make CoachProgramCore the coach orchestration layer above the existing program/workout architecture. No second builder/execution engine. Web is a primary management interface; athlete execution remains the canonical Preview -> Execution -> Logging chain. |
| GAP-P3-039 | C | Make TeamAnalyticsCore/TeamPerformanceCore the canonical team analytics layer over individual calculations/trends, constrained by RBAC/privacy. Prefer personal-baseline signals and group insights over simplistic physiological rankings between athletes. |
| GAP-P3-040 | C | Make EquipmentCore canonical for equipment identity, capabilities and availability; integrate with exercise library, builder, programs, locations and device integrations. Do not expand it into generic asset accounting without a later product need. |
| GAP-P3-041 | C | Make OrganizationCore the canonical organization/tenant layer for clubs, locations, teams, memberships and roles. Organization membership does not transfer ownership of an athlete’s personal sport/health data. |

## Authentication boundary

For ordinary TK users, e-mail/password, Google or Apple is sufficient. Coach/club users use account-bound identity and RBAC. The PCC is a separate control plane and retains mandatory 2FA. TK authentication choices must never lower PCC security.

## Dependency-led implementation order

1. **Safety and platform hardening:** P2-004 credential provenance; P2-024 lifecycle/FK hardening; P3-004 date/time contract; P2-010 offline/precache; P2-003 observability.
2. **Calculation/context correctness:** P2-012 HRV/RHR quality contract; P2-015 Recovery Score confidence; P2-009 sRPE; P2-014 Context Engine; P2-032 EvidenceCore; P3-035 LongitudinalTrendCore.
3. **Immediate athlete UX:** P2-008 resumable-session card.
4. **Multi-sport intelligence:** P2-022 Unified Load after anti-double-counting/evidence proof; P3-036 NutritionIntelligence.
5. **Organization/privacy foundation:** P3-041 OrganizationCore plus P3-034 SocialPrivacyCore and account-bound RBAC migration.
6. **Coach/club platform:** P3-038 CoachProgramCore, P3-040 EquipmentCore, P3-039 TeamAnalytics/Performance, P3-037 CoachIntelligence and responsive Coach/Club Web Portal.
7. **PCC release/recovery governance:** P2-002 managed retention/rollback model, coordinated with release-health observability and proven recovery points.

## Guardrails

- Raw Data -> Calculation Engine -> Context Engine -> Decision/Rules Engine -> AI Coach -> athlete remains the primary decision architecture.
- Evidence/provenance and longitudinal trends are governed supporting layers, not alternative decision engines.
- AI never invents missing values, recomputes canonical metrics, creates new training rules, or upgrades evidence strength.
- No audit gap is closed merely because this product decision exists.
- Existing functionality must be reused where proven; do not create parallel builders, logging chains, auth systems, or data models.
- Concept2 work already in a parallel implementation stream must not be duplicated.
- Commercial/Entitlements GAP-P2-007 remains outside V1 unless separately re-scoped.
- GAP-P2-011 and GAP-P2-013 are already evidence-closed on the decision-round baseline and require no duplicate implementation.
