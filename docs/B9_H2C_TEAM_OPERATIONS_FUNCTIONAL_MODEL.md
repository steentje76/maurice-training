# B9-H2C Team Operations Functional Model

## Complete Operational Loop (sectie 10, per schakel geaudit)

| Schakel | Status | Bewijs |
|---|---|---|
| Team | CANONIEK | `teams`, gekoppeld aan `organizations` (B9-H2A/B) |
| Training/event plannen | COMPLEET | `team_events` (title/type/starts_at/ends_at/location_id/meeting_at) |
| Datum + tijd | COMPLEET | `starts_at`/`ends_at` |
| Verzameltijd | COMPLEET (nieuw) | `meeting_at`, apart veld i.p.v. verstopt in description |
| Locatie | COMPLEET | `location_id` -> bestaande `locations`-tabel (organization-aware, sectie 19) |
| Deelnemers | COMPLEET | impliciet: alle actieve `memberships` met `team_id` |
| Beschikbaarheid | COMPLEET (nieuw) | `event_attendance.stage='availability'` |
| Taken/materiaal | COMPLEET | `event_responsibilities` + `assign_event_responsibility_notify()` |
| Wijzigingen | COMPLEET (nieuw) | `update_team_event_notify()` -- geen duplicaat-event bij edit |
| Notificaties | COMPLEET (nieuw) | hergebruikt `social_notifications`/`social_create_notification()` |
| Aanwezigheid | COMPLEET (nieuw) | `event_attendance.stage='attendance'` |
| Training uitvoeren | ARCHITECTUUR AANWEZIG | `linked_training_instance_id` -> bestaande, canonieke training-flow |
| Persoonlijke trainingshistorie | ONGEWIJZIGD, BESCHERMD | geen enkele FK van athlete-owned data naar team-tabellen |
| Team operational history | COMPLEET | `team_events`/`event_attendance`/`event_responsibilities` blijven bestaan (geen hard delete bij cancel) |

## Event Lifecycle (sectie 13)

`planned -> cancelled` OF `planned -> completed`. Een tijd-/locatiewijziging
is een UPDATE van dezelfde rij (geen state-transitie, geen duplicaat),
conform sectie 25/26. Geen aparte `updated`-status: dat zou de vraag
"updated van wat naar wat" niet beantwoorden en voegt geen
onderscheidend gedrag toe t.o.v. gewoon de velden bijwerken.

## Availability ≠ Attendance (sectie 15/16)

Expliciet gesplitst via `event_attendance.stage` (`availability`/
`attendance`), met een aparte unique-constraint per `(event_id,
user_id, stage)` -- een gebruiker kan dus zowel een
beschikbaarheidsopgave als een latere, aparte aanwezigheidsregistratie
hebben voor hetzelfde event, zonder dat de een de ander overschrijft.

## Recurring Training (sectie 14)

Gekozen: de eenvoudigste, robuuste oplossing (`duplicated_from_event_id`,
een self-reference) i.p.v. een complete recurrence-engine. Een coach
dupliceert een bestaand event naar een nieuwe datum; de provenance
(welk event de bron was) blijft bewaard. Geen series-model, geen
"wijzig alle toekomstige herhalingen"-complexiteit -- niet aantoonbaar
noodzakelijk voor 9.0 binnen deze sprint.

## Team Communication (sectie 29)

**Chat/announcements: NIET gebouwd, P2/P3, non-blocking.** De
operationele communicatiebehoefte (nieuwe training, wijziging,
annulering, taaktoewijzing) wordt volledig gedekt door events +
notificaties. Een apart chatsysteem zou een tweede communicatiekanaal
naast de bestaande Social-infrastructuur creëren zonder een
aantoonbare, aanvullende user job op te lossen.

## Training Integration (sectie 31)

`team_events.linked_training_instance_id` bestond al vóór deze sprint
en verwijst naar de bestaande, canonieke `training_instances`-tabel --
geen tweede Team Training Engine. Een team-event dat een training
bevat, kan dus al conceptueel doorverwijzen naar de normale Training
Preview/Execution/Logging-flow. Dieper onderzoek naar
`coach_program_assignments`-gebaseerde teamtoewijzing (sectie 32)
viel buiten de tijdsscope van deze sprint -- geregistreerd als open
punt.

## Data Ownership (sectie 40)

- **Organization-owned:** `teams`, `team_events` (planning-attributen).
- **Team operational:** `event_attendance`, `event_responsibilities`.
- **Athlete-owned:** de daadwerkelijke, uitgevoerde training (via
  `linked_training_instance_id` naar de bestaande, ongewijzigde
  training-historie) -- nooit overschreven of gedupliceerd door een
  team-record.
