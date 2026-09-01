# B9-H2D Coach/PT Functional Model

## Complete Coaching Chain (sectie 1, per schakel geaudit tegen bestaande F10-implementatie)

| Schakel | Status | Bewijs |
|---|---|---|
| Coach → athlete relationship | COMPLEET | `coach_athlete_relationships`, consent-lifecycle (F10-01) |
| Athlete context | COMPLEET (backend) | `CoachRosterCore`, sectie-filtering op scope |
| Goals | Hergebruikt bestaande, canonieke goal-infrastructuur (niet apart in F10 herbouwd) | Geen duplicaat |
| Programming | COMPLEET | `coach_program_templates`, coach-owned |
| Workout/program assignment | COMPLEET | `coach_program_assignments` + `materialize_coach_assignment()` |
| Scheduling | Hergebruikt canonieke `program_blocks`-structuur | Geen tweede calendar-engine |
| Adherence | COMPLEET (hergebruik) | `AdherenceIntelligenceCore`, ongewijzigd |
| Training history | Canoniek, athlete-owned, ongewijzigd | `programs.user_id` (trg_set_user_id) |
| Progress | Hergebruikt bestaande Calculation Engine-outputs | Geen shadow calculation (F10-15 bevestigd) |
| Recovery/context binnen toestemming | COMPLEET | `RECOVERY_HEALTH`-scope, apart van `WOMENS_PERFORMANCE` |
| Feedback | **NIET GEBOUWD** | Geen coach-notes/feedback-tabel gevonden binnen F10 of deze sessie |
| Adjustment | Coach kan een nieuwe assignment maken (nieuwe versie), historische executies blijven onveranderd | Snapshot-semantiek bevestigd |
| Relationship lifecycle | COMPLEET | revoke stopt toegang direct (F10-bewezen) |

## Nieuwe bevinding: Coach Notes/Feedback ontbreken volledig

Sectie 24-27 van deze opdracht vereist coach notes en feedback-
mechanismen. **Geen van beide bestaat** in de huidige codebase (F10 of
eerder). Dit is een echte, nieuwe functionele gap. Gegeven de
opdracht se voorkeur voor hergebruik (sectie 26: "Onderzoek bestaande
social/comments/notification mechanics. Hergebruik waar mogelijk"),
is de bestaande `social_comments`-infrastructuur (B9-07B) technisch
herbruikbaar, maar `social_comments.shared_activity_id` verwijst
specifiek naar `social_shared_activities` -- niet naar een
coach-assignment-context. Een generieke koppeling zou een nieuwe
FK-relatie vereisen.

**Besluit voor deze sprint:** coach-notes/feedback niet gebouwd. Dit
vereist een kleine, maar echte schema-uitbreiding (welke content-
objecten kunnen een coach-notitie krijgen) die zorgvuldiger overwogen
moet worden dan in de resterende scope van deze sessie past --
vastgelegd als P1-gap voor een toekomstige, gerichte sprint, niet als
blocker voor de huidige, al bewezen kernketen.

## Team Coach Intersection (sectie 37) -- bevestigd, bewuste scheiding

Een team-coach (via `team_has_access()`, B9-H2C) kan team-events/
attendance/responsibilities beheren voor zijn team. Dit geeft GEEN
automatische `coach_athlete_relationships`-rij. Bevestigd correct en
gewenst: team-coaching (operationeel, groepsniveau) en individuele
PT-coaching (persoonlijk, programma-niveau) zijn functioneel
verschillende jobs met verschillende autorisatiemodellen -- geen
samenvoeging nodig of gewenst.

## Independent PT (sectie 39) -- bevestigd werkend

`coach_athlete_relationships` heeft geen enkele foreign key of
afhankelijkheid naar `organizations`/`gyms`. Een zelfstandige coach
zonder organisatie kan het volledige, bestaande F10-platform gebruiken
zonder enige organisatie-context. Live, architecturaal bevestigd (0
NOT NULL-constraint op een organization-gerelateerd veld).

## Entitlement Boundary (sectie 40/41) -- gap gevonden, niet opgelost

Zie `docs/B9_H2D_COACH_PT_EXISTING_STATE_AUDIT.md`. 0 entitlement-
checks gevonden. Vereist een productbeslissing, niet in deze sprint
genomen.
