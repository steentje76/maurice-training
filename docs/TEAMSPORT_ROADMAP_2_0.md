# TEAMSPORT_ROADMAP_2_0.md — canonical extension to Roadmap 2.0

**Status:** PLANNED / PRODUCT DIRECTION — no implementation claim.
**Parent roadmap:** `docs/TRAININGSKOMPAS_MASTER_ROADMAP.md` (Roadmap 2.0 v1.1 canonical).
**Primary tracks/phases:** T3/F6 Endurance & Multisport Excellence + T15/F11 Gym/Club/Team Platform.

## 1. Product decision
Teamsport is a formal product domain in Trainingskompas and is not limited to logging a generic sport activity. It has two linked capability groups:

1. **TEAMSPORT PERFORMANCE** — athlete-facing sports performance context for team training and matches.
2. **TEAM OPERATIONS** — team organization, planning, attendance, selection, material/tasks, transport and communication.

These are separate domains but must exchange context through the existing athlete engine. No second calculation/coaching core may be created.

## 1A. Primary navigation decision (Roadmap Foundation Update, this sprint)
Teamsport is a first-class athlete domain and gets its own primary navigation destination. It is not a hidden sub-mode of Training, Endurance, Multisport, Gym/Club or "Meer/Profiel".

Conceptual primary navigation:
`Home → Training → Teamsport → Progressie → Coach → Meer/Profiel`

This is a roadmap/UX decision, not an instruction to rebuild the current navigation now. It fixes the target destination for whenever primary-navigation work is scheduled, so no future sprint quietly buries Teamsport under an existing tab. Teamsport Performance (§3) and Team Operations (§4) both live under this one destination; they remain separate capability domains internally, sharing the destination and the underlying athlete engine.

## 2. Architectural rule
Sports-performance data follows the existing chain:

`RAW DATA → NORMALIZATION/DATA QUALITY → CALCULATION → CONTEXT → DECISION/RULES → EVIDENCE/PROVENANCE → AI COACH → ATHLETE UX`

Team Operations provides planning/event context into the Context Engine, but does not become a source of physiological truth. The AI Coach may interpret validated outputs and context; it may not invent missing match, wearable, GPS or recovery data or recalculate metrics independently.

Example:

`team schedule → match Sunday → Context Engine → Decision Engine → permitted training recommendation context`

After a match:

`match → minutes played + RPE + wearable/GPS data → Calculation Engine → athlete history → recovery/readiness/context`

## 3. TEAMSPORT PERFORMANCE — T3 / F6

### Scope
Generic teamsport support with sport-specific extensions, initially suitable for sports such as football, field hockey, rugby, basketball, handball, volleyball and comparable team sports.

### Planned capabilities
- explicit teamsport context;
- distinguish training vs match;
- date, start time and duration;
- player position/role;
- minutes played;
- session/match RPE;
- sRPE/load where evidence and required inputs support it;
- heart-rate data where available;
- wearable data with provenance;
- GPS data where available and permitted;
- distance;
- speed;
- high-speed running/sprint metrics where provider definitions and evidence are explicit;
- acceleration/deceleration metrics only where the source can support them reliably;
- training and match load;
- recovery context;
- combined field + strength load/context;
- historical performance/load trends;
- sport-specific context for Calculation, Context, Decision and AI Coach;
- data-quality, confidence and limitations for provider-derived metrics.

### Hard constraints
- no universal injury prediction from load metrics;
- no hardcoded sport logic that prevents reuse across teamsports;
- provider-specific GPS definitions must not be silently treated as equivalent;
- wearable/GPS metrics require provenance, units and data-quality metadata;
- sport-specific calculations must enter the Calculation/Evidence Registry before they are treated as authoritative.

## 4. TEAM OPERATIONS — T15 / F11

### Team structure
Planned support for:
- team;
- season;
- team members;
- coaches/trainers;
- staff/team managers;
- roles and permissions;
- player positions;
- training groups;
- future multi-team organization support.

### Planning & event model
A training, match or other team event becomes the central operational object with, as applicable:
- date;
- start/end time;
- gathering time;
- location;
- attendance/invitation;
- present/absent response;
- optional absence reason under appropriate privacy rules;
- selection/squad;
- transport;
- event notes;
- linked material/tasks;
- linked communication;
- linked performance logging after the event.

Example event flow:

`Match Saturday 14:30 → gather 13:30 → location → squad → attendance → transport → material/tasks → event communication → match → performance logging`

### Tasks & material
Generic task/material model, not a hardcoded equipment list. A task should be able to contain:
- event;
- description;
- responsible person;
- due date/time;
- status;
- confirmation;
- optional reminder/notification.

Examples include balls, bibs, cones, bottles, first aid, goalkeeper material, match material, transport, laundry and other team responsibilities.

### Team communication
Planned capabilities:
- team chat;
- event-specific chat;
- announcements;
- polls;
- schedule-change notifications;
- reminders;
- task reminders.

Communication is deliberately later than the foundation and performance model so it reuses one team/event identity model rather than creating a second disconnected communication domain.

## 5. Privacy, consent and RBAC
Team functionality never implies automatic coach access to all athlete data.

Planned roles include at minimum player, coach/trainer, team manager and administrator. Permissions must distinguish:
- team information;
- event planning;
- attendance;
- selection;
- performance information;
- personal wearable data;
- recovery;
- sleep;
- HRV;
- other sensitive health-related data.

Default posture is privacy by design and minimum necessary access. Broader coach access to personal health/recovery data requires an explicit product decision, suitable consent/legal basis and auditable authorization.

## 6. Delivery phases

### Teamsport Phase 1 — Foundation
Primary phase: F11 with dependencies into F6/context.
- generic team model;
- member/role model;
- training/match/event model;
- time/location/gathering time;
- attendance;
- selection;
- athlete-to-team link;
- event planning → Context Engine contract;
- privacy/RBAC boundaries.

### Teamsport Phase 2 — Performance
Primary phase: F6, using the Phase-1 event identity where needed.
- minutes played;
- position/role;
- RPE/sRPE;
- wearable/GPS ingestion and provenance;
- field/match load;
- strength + teamsport context;
- trends;
- Decision Engine context;
- AI Coach context;
- calculation/evidence definitions for any new metrics.

### Teamsport Phase 3 — Operations
Primary phase: F11.
- richer planning;
- materials;
- tasks/responsibilities;
- transport;
- reminders/notifications;
- event-centric operational workflow.

### Teamsport Phase 4 — Communication
Primary phase: F11 with T13 Social & Community dependencies where appropriate.
- team chat;
- event chat;
- announcements;
- polls;
- communication notifications;
- moderation/safety/privacy requirements.

### Teamsport Phase 5 — Club/Organization
Primary phase: later F11 / post-core expansion.
- multiple teams;
- club/organization administration;
- multiple coaches/staff;
- organization-wide scheduling;
- richer team/club dashboards;
- optional guardian/parent roles only after a separate product/privacy decision.

This phase is intentionally later and must not block the athlete-core roadmap.

## 7. Proposed epics and mastersprints
These are new product-plan IDs. They are **PLANNED** and must not be reported as implemented until repository/DB/test evidence supports maturity changes.

### New epics
- **E3.4 — Teamsport Performance** (T3/F6)
- **E15.4 — Team Operations Foundation** (T15/F11)
- **E15.5 — Team Operations & Logistics** (T15/F11)
- **E15.6 — Team Communication** (T15/T13/F11)

### Proposed mastersprints
- **MS-F6-07 — Teamsport Performance Context & Event Contract** — P2 — establish generic training/match context, role/position, minutes and athlete-event linkage. Dependencies: F3 context/data-quality/evidence contracts and canonical event identity.
- **MS-F6-08 — Teamsport Load, Wearable & GPS Performance** — P2 — RPE/sRPE, wearable/GPS provenance, field/match load and strength+field context. Dependencies: MS-F6-07, Connected Athlete/provider groundwork and relevant Calculation/Evidence Registry entries.
- **MS-F6-09 — Teamsport Trends & Explainable Coaching** — P2 — historical team-sport trends and Decision/AI context without invented metrics. Dependencies: MS-F6-08, Decision/Evidence/AI Output contracts.
- **MS-F11-07 — Team Operations Foundation** — P2 — teams, seasons, members, roles, event planning, attendance, selection, times/locations and RBAC. Dependencies: MS-F1-01 RLS closure plus identity/RBAC/organization foundations in F11.
- **MS-F11-08 — Team Logistics, Tasks & Material** — P2 — generic tasks/materials, responsible person, due/status/confirmation, transport and reminders. Dependencies: MS-F11-07.
- **MS-F11-09 — Team Communication & Event Chat** — P3 — team chat, event chat, announcements, polls and notifications with privacy/moderation controls. Dependencies: MS-F11-07 and applicable T13 communication governance.
- **MS-F11-10 — Club/Organization Expansion** — P3/P4 — multi-team organization scheduling/admin and richer dashboards. Dependencies: MS-F11-07/08; deliberately later and non-blocking for athlete core.

## 8. Dependency rules
- No real multi-tenant Team Operations data before `GYM-RLS-SCOPING-001 / MS-F1-01` is closed.
- Teamsport calculations must follow F3 Calculation/Context/Decision/Evidence contracts.
- Teamsport wearable/GPS features depend on provider feasibility, provenance and data quality in T11/F5.
- AI coaching for teamsport depends on the AI Output Contract and may only explain approved calculations/rules/context.
- Team Communication may reuse T13 infrastructure but may not weaken team/RBAC/privacy boundaries.
- F11 operations and F6 performance share event identity/context, but remain separate capability domains.

## 9. Definition of Done for future teamsport mastersprints
Each teamsport mastersprint must use the existing Roadmap 2.0 closure model and validation dimensions. Where applicable this includes software, database/RLS, integration, device, UX, scientific/evidence, privacy/security and documentation validation. Real-device/GPS provider claims require actual validation before VALIDATED/CLOSED.

## 10. Explicit out of scope for this roadmap update
This document adds product direction only. It does not create team tables, chat, notifications, GPS calculations, coach permissions or UI. It does not activate any new tracking or expose athlete health data to coaches.

**TEAMSPORT ROADMAP DECISION: INTEGRATED AS PLANNED PRODUCT DIRECTION**
