# ROLE_CAPABILITY_MATRIX.md

| Rol | Schermen | Capabilities (backend) | UI voor deze capabilities? |
|---|---|---|---|
| **ATHLETE** | Alle 44 schermen (dit is de enige rol met volledige UI-toegang) | Training, Recovery, Women's Performance, Nutrition, Social, wearable-koppeling | JA, vrijwel volledig |
| **COACH/PT** | Geen eigen schermen (s-coach is AI Coach, niet human-coach-beheer) | Relationship-lifecycle, consent-scopes, roster, program-templates, assignment, content-materialisatie, AI-intelligence-whitelist (F10, B9-H2D) | **NEE — 0% user-accessible**, UI-requirements klaar (`docs/B9_H2D_COACH_PT_UI_REQUIREMENTS.md`) |
| **TEAM COACH** | Geen eigen schermen | Team-events, availability/attendance-splitsing, responsibilities, notificaties (B9-H2C) | **NEE — 0% user-accessible**, UI-requirements klaar (`docs/B9_H2C_TEAM_OPERATIONS_UI_REQUIREMENTS.md`) |
| **GYM/CLUB (owner/staff)** | s-admin (legacy `users.gym_id`-laag) | Canonieke organizations/memberships/teams bestaat (B9-H2A/B), maar UI blijft op de oudere laag | GEDEELTELIJK — actieve UI werkt nog op legacy-laag, nieuwere canonieke laag heeft geen UI |
| **ORGANIZATION ADMIN** | Geen eigen schermen | `organizations.owner_user_id`-gebaseerde autorisatie bestaat | NEE |

## Gedeelde functionaliteit tussen rollen

- Alle rollen delen dezelfde onderliggende `activities`/`sessions`/Calculation Engine.
- Privacy-scopes zijn strikt per athlete-toestemming: een coach krijgt nooit automatisch HRV/Recovery/Women's Performance-data (aparte, geïsoleerde scopes, live bevestigd in meerdere sprints deze sessie).

## Backend-functionaliteit die bestaat maar nog geen UI heeft (per rol)

- **Coach/PT:** volledige relatie-/programma-/assignment-flow (F10).
- **Team Coach:** volledige team-event-/aanwezigheid-/taken-flow (B9-H2C).
- **Organization Admin:** canonieke organization-structuur (B9-H2A/B).
