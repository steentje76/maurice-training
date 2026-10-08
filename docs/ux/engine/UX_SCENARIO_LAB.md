# TK UX Scenario Lab v1

Before coding a material new or changed flow, the engine can place multiple flow scenarios side by side. It does not algorithmically decide what is pleasant; it exposes consequences so the Product Owner can choose before implementation.

## Mandatory use
Use Scenario Lab when there are two or more plausible navigation/interaction solutions, a new IA path, a changed primary task, or a high-impact screen migration. Small copy/style fixes may declare SCENARIO_NOT_REQUIRED with reason.

## Every scenario contains
The same requirement/start/end goal; optional mock-ups; exact click flow; system behaviour after every action; back/cancel/resume behaviour; relevant states/failure path; reuse/new-pattern count; primary-task taps, decision points, screen transitions and interruptions; relevant accessibility/science/data/privacy risks; descriptive pros/cons.

## Decision
No weighted score may auto-select a winner. `READY_FOR_PO` presents alternatives. Only explicit PO selection changes the comparison to `DECIDED`. The selected scenario is bound into the UX Build Package before `UX_SPEC_READY`.

When visual differences matter, matching `TK-MU-...` targets are made BEFORE Claude writes product code. Claude receives only the DECIDED scenario as implementation instruction; rejected scenarios remain decision history.
