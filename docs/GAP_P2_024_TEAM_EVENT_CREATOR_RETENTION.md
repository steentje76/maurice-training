# GAP-P2-024 — Team event creator retention

**Implementatiebaseline:** `main a50b4975b3364e8eba2835d73a9224f0064f9e0c`  
**Scope:** data-retentie bij accountverwijdering; geen nieuwe Team Operations-UI en geen wijziging aan Calculation → Context → Decision → AI.

## Live baseline

Op 1 oktober 2026 is de Trainingskompas-productiedatabase read-only geverifieerd:

- `team_events_created_by_fkey` = `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE`;
- `team_events.created_by` is `NOT NULL`;
- `team_events = 0`, `event_attendance = 0`, `event_responsibilities = 0`;
- de twee actieve RLS-policies autoriseren via `team_has_access(team_id, ...)`, niet via `created_by`;
- de bestaande triggers bewaken team-id, linked training en location tenant; geen daarvan gebruikt `created_by` als access-boundary.

Daarmee is de eerder geregistreerde GAP-P2-024 nog actueel, maar kan de schemawijziging zonder bestaande event-data-migratie worden uitgevoerd.

## Root cause

Er waren twee onafhankelijke delete-paden die hetzelfde ongewenste resultaat konden geven:

1. de database-FK op `team_events.created_by` gebruikte `ON DELETE CASCADE`;
2. `netlify/functions/delete-account.js` verwijderde daarnaast expliciet `team_events` waar `created_by` de te verwijderen gebruiker is.

Alleen de FK veranderen zou de gap dus niet sluiten: de server-side account-delete-flow zou het event alsnog verwijderen.

## Implementatiecontract

`migratie_v577.sql`:

1. maakt `team_events.created_by` nullable;
2. vervangt de creator-FK door `ON DELETE SET NULL`;
3. laat RLS, policies, event-attendance/responsibility-FK's en overige teamtabellen ongemoeid;
4. hardent `notify_team_event_created()`: `IS DISTINCT FROM auth.uid()` zorgt dat een event met `created_by = NULL` nooit door een willekeurige caller als eigen event wordt behandeld.

`delete-account.js` verwijdert niet langer het gedeelde `team_events`-record via `created_by`. De bestaande opruiming van de verwijderde gebruiker zijn eigen `event_attendance.user_id` en `event_responsibilities.assigned_user_id` blijft ongewijzigd.

## Verwachte uitkomst

Wanneer de organisator later zijn account verwijdert:

- het team-event blijft bestaan;
- attendance/responsibilities van andere teamleden blijven via hetzelfde `event_id` bestaan;
- `created_by` wordt `NULL` en kan in toekomstige UI als “verwijderde organisator” worden weergegeven;
- Team Operations-autorisatie blijft via `team_has_access()` lopen;
- de create-notification-RPC weigert een event zonder creator fail-closed.

## Bewijsstatus

Deze implementatie-PR houdt GAP-P2-024 bewust **OPEN** totdat de wijziging is gemerged, de exact-head én post-merge Quality Gate groen zijn en de productiedatabase de nieuwe FK/nullability aantoonbaar bevat. Pas daarna mag een aparte governance-closure de gap naar `CLOSED_PROVEN` zetten.
