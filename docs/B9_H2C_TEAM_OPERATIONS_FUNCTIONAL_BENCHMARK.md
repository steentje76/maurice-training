# B9-H2C Team Operations Functional Benchmark

| Dimension | Before (6.8) | After (backend) | Evidence |
|---|---|---|---|
| Team/Roster | Backend bestond, 0 UI | Ongewijzigd (UI-gate, zie UI requirements) | `teams`/`memberships` canoniek (B9-H2A/B) |
| Planning | Geen meeting-time, geen lifecycle | Compleet (meeting_at, status planned/cancelled/completed) | migratie_v540.sql |
| Availability | Vermengd met attendance | Expliciet gesplitst (`stage`-veld) | migratie_v540.sql, unique per (event,user,stage) |
| Attendance | Vermengd met availability | Expliciet gesplitst | idem |
| Responsibilities | Backend bestond, geen notificatie | Notificatie-integratie + member-boundary-validatie | `assign_event_responsibility_notify()` |
| Update Communication | Geen notificaties bij wijziging | Compleet (create/update/cancel -> notificatie naar alle actieve teamleden behalve de acteur) | 3 nieuwe RPC's |
| Workout Integration | `linked_training_instance_id` bestond al | Ongewijzigd, bevestigd correct (geen tweede engine) | schema-audit |
| Lifecycle | Geen expliciete status | planned/cancelled/completed | migratie_v540.sql |
| Reliability (idempotency) | `team_events` niet in idempotency-registratie | Toegevoegd (zelf gevonden gat) | index.html |
| Security/Privacy | RLS bestond, ongetest in deze sprint-context | Live, opnieuw adversariaal bevestigd (S3/S4/S5/S8 + 5x RPC-anon-check) | zie Security Matrix |

## Competitor-vergelijking (functioneel, niet visueel)

| Product | Patroon | User job | TK-status na deze sprint |
|---|---|---|---|
| TeamSnap/Spond | Event + RSVP + reminder | Beschikbaarheid vóór training weten | Backend compleet (availability-stage), UI ontbreekt |
| Heja | Team-chat + planning | Operationele communicatie | Opgelost via events+notificaties, geen chat nodig (P2/P3) |
| TeamBuildr/TrainHeroic | Coach wijst workout toe aan team | Training-integratie | Architectuur aanwezig (`linked_training_instance_id`), diepere toewijzing-flow niet in deze sprint onderzocht |

**Geen feature-copying:** chat is bewust niet gebouwd omdat de
onderliggende user job (operationele communicatie) al wordt opgelost
door de bestaande combinatie van events, notificaties, en Social.

## Score-integriteit (sectie 57/58)

**VERIFIED BEFORE SCORE:** de baseline 6.8 wordt bevestigd als
functioneel accuraat vóór deze sprint -- het backend-fundament bestond
al (van een eerdere sprint), maar was voor een echte gebruiker
volledig onbereikbaar (0 UI), wat een score onder de 7.0 rechtvaardigt.

**BACKEND/FUNCTIONAL FOUNDATION SCORE (na deze sprint):** het
onderliggende model dekt nu de volledige, in sectie 10 beschreven
operationele lus, met notificaties, expliciete lifecycle, en
availability/attendance-scheiding. Dit fundament zou, op zichzelf
beoordeeld als backend-architectuur, een sterke score verdienen
(indicatief: 8.5-9.0-niveau qua volledigheid), maar dat is uitdrukkelijk
geen productscore.

**USER-ACCESSIBLE PRODUCT SCORE:** **onveranderd, laag** (indicatief
nog steeds rond de oorspronkelijke 6.8-7.0) -- een gebruiker kan
vandaag nog steeds geen enkel van deze capabilities daadwerkelijk
gebruiken, want er bestaat geen scherm. Conform sectie 58 wordt hier
expliciet GEEN 9.0 toegekend zolang dit zo is.

**UX SCORE: DEFERRED.**
