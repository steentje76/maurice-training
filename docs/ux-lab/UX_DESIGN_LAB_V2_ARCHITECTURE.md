# Trainingskompas UX Design Lab v2 — Architecture

Status: FOUNDATION DRAFT — isolated branch, no runtime impact.
Baseline main: b7c77e4a2e5d8b995931a32b1c64ad559294c26b (2026-09-18).

## Goal
Create a pre-implementation UX environment that reads canonical Trainingskompas rules, preserves capabilities, explores multiple screen/flow scenarios, validates them against rules, and emits a frozen implementation contract for Claude only after Product Owner approval.

## Source hierarchy
Visual composition: canonical UX PNG baseline > TRAININGSKOMPAS_DESIGN_SYSTEM_V1 > runtime.
Function/data/behaviour: Product Architecture > Calculation/Context/Decision/Evidence > Capability Registry/canonical specs > UX baseline.
Navigation: TRAININGSKOMPAS_ROUTE_RULES + ROUTE_MAP.
Runtime truth: actual app behaviour/code/tests per DEVELOPMENT_CONTRACT.
Conflict: never silently resolve a genuine normative conflict. Mark PO_REVIEW_REQUIRED.

## Pipeline
GitHub main snapshot
→ Source adapters
→ Rule Normalizer
→ Conflict/precedence resolver
→ UX Rule Registry
→ Capability Preservation Registry
→ Route/Flow Graph
→ Scenario Composer
→ Interactive phone preview
→ Rule/flow/state validator
→ A/B/C compare
→ Product Owner selection
→ Design Freeze
→ Implementation Contract
→ Claude
→ Browser/runtime + visual + functional preservation validation.

## Core objects
Rule: id, domain, statement, level(HARD|SOFT|OPEN), status, source, source_sha, precedence, applies_to, verification.
Screen: id, purpose, primary_tab, canonical_visual, capabilities, states, components, data_contracts.
Flow: id, start, goal, nodes, edges, invariants, protected_state.
Scenario: id, flow_id, variant, screens, assumptions, deviations, metrics, validation.
ImplementationContract: frozen scenario + source SHA + rule IDs + components + states + routes + data mappings + acceptance tests.

## Required engines
1. Source Sync Engine — pins every run to a main SHA and detects changed source files.
2. Rule Engine — converts canonical prose/rules into machine-readable constraints.
3. Conflict Engine — detects contradictions/stale documents; no autonomous choice when hierarchy cannot settle it.
4. Capability Preservation Engine — mockup omission never removes existing functionality.
5. Flow Engine — models journeys, back behavior, primary-tab ownership and active-training state.
6. Scenario Engine — creates A/B/C alternatives without touching production code.
7. State Engine — loading/empty/partial/error/offline/syncing/stale/permission/unknown.
8. Evidence UX Guard — UI never recalculates; UNKNOWN != 0/GREEN; confidence/provenance respected.
9. Component Resolver — reuse canonical components before proposing a new one.
10. Validator — hard-rule pass/fail plus non-blocking observations; no opaque overall UX score.
11. Design Freeze Engine — only PO-selected scenario becomes buildable.
12. Contract Exporter — emits Claude-ready implementation contract and test checklist.

## UX Lab web UI
Left: Flows, Screens, Scenarios, Rules, Components, Conflicts.
Center: interactive phone frame; switch 320/360/390/430 and light/dark; click through whole flow.
Right: selected scenario inspector with applicable rules, capability preservation, routes, states, data sources, deviations and PO decisions.
Compare mode: A | B | C with synchronized flow step and measurable differences (taps, depth, component reuse, rule violations, unresolved decisions).
Evidence mode: click any visible element → why it exists, source rule IDs, data origin, state contract, component ID.

## Hard gates before Claude
- source SHA pinned;
- zero unresolved HARD conflicts;
- functional preservation complete;
- data-source mapping complete;
- route invariants pass;
- required states designed;
- accessibility contract present;
- canonical component reuse checked;
- no invented calculations/data;
- PO explicitly selects scenario and freezes it.

## Important repository finding
The current repository already contains enough normative material to seed this system, but it is not yet one coherent machine-readable rulebase. There are stale/overlapping documents. Example: Design System v1 approves teal as primary CTA, while Handbook H7 still specifies a navy primary button in light mode. The lab must surface this as a source conflict rather than letting Claude choose silently.

## Phase plan
V2.0 Foundation: registry + source hierarchy + conflict detection + route rules + baseline screen metadata.
V2.1 Scenario Lab: interactive flows, A/B/C variants, phone preview, compare mode.
V2.2 Validation: capability/state/a11y/evidence guards and source-change invalidation.
V2.3 Contract: design freeze + Claude implementation contract + regression/visual acceptance export.
V2.4 Continuous sync: GitHub main changes invalidate only affected rules/scenarios and queue them for re-review.
