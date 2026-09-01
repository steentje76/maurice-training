# B9-H2A Team/Coach/Gym 9+ Requirements

## Team Operations 9+

| CAPABILITY | CURRENT | TARGET 9+ | BACKEND READY | ENGINE READY | NEW DATA NEEDED | SECURITY READY | UI REQUIRED | UX APPROVAL REQUIRED | DEPENDENCIES |
|---|---|---|---|---|---|---|---|---|---|
| Team maken/beheren | Backend bestaat (`teams`), 0 UI | Coach/admin kan een team aanmaken binnen zijn organisatie | JA | N.v.t. | Nee | JA (RLS bevestigd aanwezig, niet dit-sprint live opnieuw adversarieel getest voor teams specifiek) | YES | YES | organizations canoniek (deze sprint) |
| Event/training plannen | Backend bestaat (`team_events`, incl. `linked_training_instance_id`) | Coach plant een teamtraining met tijd/locatie, optioneel gekoppeld aan een bestaande training | JA | Hergebruikt bestaande `training_instances` | Nee | JA (RLS aanwezig) | YES | YES | Team canoniek |
| Attendance | Backend bestaat (`event_attendance`, niet in detail geaudit deze sprint) | Deelnemers geven aanwezigheid door, coach ziet overzicht | JA (te bevestigen) | N.v.t. | Mogelijk niet | Te bevestigen bij implementatie | YES | YES | Event canoniek |
| Equipment/responsibilities | Backend bestaat (`event_responsibilities`) | "Wie neemt wat mee" toewijzen per event | JA | N.v.t. | Nee | Te bevestigen | YES | YES | Event canoniek |
| Communicatie/wijzigingen | Kan hergebruiken van bestaande `social_notifications`-infrastructuur (event-driven) | Deelnemers krijgen een melding bij wijziging | Deels (notificatie-infrastructuur bestaat, event_type moet worden uitgebreid) | JA (hergebruik B9-07B/B9G-SOC-002-patroon) | Nee (alleen constraint-uitbreiding, zoals eerder gedaan) | JA | YES (voor de trigger-momenten) | YES | Notificatie-infrastructuur (bestaand) |

## Coach/PT 9+

| CAPABILITY | CURRENT | TARGET 9+ | BACKEND READY | ENGINE READY | NEW DATA NEEDED | SECURITY READY | UI REQUIRED | UX APPROVAL REQUIRED | DEPENDENCIES |
|---|---|---|---|---|---|---|---|---|---|
| Relatie aangaan/opzeggen | Backend bestaat (`coach_athlete_relationships`, met `requested_by`/`consented_at`/`revoked_at` -- al een correcte, consent-bewuste levenscyclus) | Coach nodigt athlete uit, athlete accepteert/weigert, beide kunnen opzeggen | JA | N.v.t. | Nee | Te herbevestigen live | YES | YES | Geen (standalone, canoniek) |
| Programma toewijzen | Backend bestaat (`coach_program_assignments`, met `template_id`/`materialized_program_id`/optioneel `organization_id`) | Coach wijst een bestaand programma toe aan 1 athlete of een heel team | JA | Hergebruikt bestaande Workout Builder/Program-engine | Nee | Te herbevestigen live | YES | YES | Relatie canoniek, organizations (voor team-brede toewijzing) |
| Voortgang monitoren | Athlete se trainingsdata bestaat al (canoniek, alle B9-sprints) | Coach ziet relevante, toegestane voortgang van zijn athletes | Deels -- vereist een expliciete, allowlist-gebaseerde "wat mag een coach zien"-laag (nog niet gebouwd) | Nee (nieuw te bouwen, klein) | Mogelijk een view/RPC | NEE nog -- moet expliciet, veilig ontworpen worden (privacy vóór coach-gemak, sectie 29) | YES | YES | Relatie canoniek |
| Feedback/notities | Geen bestaande tabel gevonden binnen deze sprint | Coach kan een notitie bij een athlete/programma achterlaten | NEE | Nee | JA (kleine, nieuwe tabel) | N.v.t. (nog te bouwen) | YES | YES | Relatie canoniek |

## Gym/Club 9+

| CAPABILITY | CURRENT | TARGET 9+ | BACKEND READY | ENGINE READY | NEW DATA NEEDED | SECURITY READY | UI REQUIRED | UX APPROVAL REQUIRED | DEPENDENCIES |
|---|---|---|---|---|---|---|---|---|---|
| Organization/multi-tenancy | `organizations`/`memberships` bestaan, correct genormaliseerd | Een gebruiker kan lid zijn van meerdere organisaties met verschillende rollen | JA (architectuur), NEE (nog niet gevuld/gebruikt) | N.v.t. | Nee (migratie, geen nieuw schema) | JA (RLS bevestigd) | READY FOR PRODUCT/UX SPECIFICATION | YES | Deze sprint (architectuurbeslissing) |
| Gym-branding/billing | `gyms` volledig functioneel, actief in productie | Blijft werken, nu via `organizations` gekoppeld | JA | JA | Nee | JA | NO (bestaande UI blijft werken tijdens migratie) | NEE (geen zichtbare wijziging voor de eindgebruiker) | Migratie-fase 2 (toekomstig) |
| Multi-locatie | Geen locatie-tabel gevonden gekoppeld aan `organizations` binnen deze sprint | Een organisatie kan meerdere locaties hebben | Deels (`team_events.location_id` bestaat, verwijst naar een onbekende locations-tabel, niet in deze sprint geverifieerd) | Onbekend | Mogelijk | Te onderzoeken | YES | YES | Organizations canoniek |

**Belangrijkste conclusie:** de architectuur is nu (na deze sprint)
coherent en klaar. De meeste capabilities zijn `BACKEND READY: JA` maar
`UI REQUIRED: YES` -- conform sectie 41 van de opdracht worden deze
gemarkeerd als **READY FOR PRODUCT/UX SPECIFICATION**, niet
geïmplementeerd in deze sprint.
