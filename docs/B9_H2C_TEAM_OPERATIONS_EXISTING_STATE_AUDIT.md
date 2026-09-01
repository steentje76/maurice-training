# B9-H2C Team Operations Existing-State Audit

## Belangrijkste bevinding

Het volledige backend-fundament voor Team Operations bestond al,
volledig, vóór deze sprint (MS-F11-03, gedocumenteerd in
`migratie_v516.sql`/`migratie_v517.sql`) -- maar nergens toegankelijk
via de UI (bevestigd in B9-H1). Deze sprint vult de resterende,
functionele backend-gaten die zonder een nieuwe UI-keuze veilig
gebouwd konden worden.

## Bestaand vóór deze sprint (live herbevestigd)

- `teams` (canoniek, B9-H2A/B): id, organization_id, name, sport_id.
- `team_events`: id, team_id, created_by, title, description,
  event_type, starts_at, ends_at, timezone, location_id (-> bestaande
  `locations`-tabel), linked_training_instance_id (-> bestaande,
  canonieke `training_instances` -- geen tweede workoutmodel).
- `event_attendance`: id, event_id, user_id, status (present/absent/
  maybe/no_response), responded_at.
- `event_responsibilities`: id, event_id, task, assigned_user_id,
  status (open/done), deadline, note.
- `team_has_access(team_id, roles[])`: SECURITY DEFINER-functie,
  controleert zowel organisatiebrede staff-rollen
  (`org_has_role()`) als team-specifieke memberships
  (`memberships.team_id`) -- precies conform sectie 6 ("organization
  membership geeft niet automatisch team access").
- RLS: volledig aanwezig, live herbevestigd in deze sprint (T3: gewoon
  lid kan geen event aanmaken -> geweigerd; T7: self-elevation naar
  manager-rol -> geweigerd).

## Ontbrekend vóór deze sprint (nu toegevoegd, zie migratie_v540.sql)

1. **Meeting time** -- geen apart veld voor verzameltijd (sectie 18).
2. **Event lifecycle status** -- geen planned/cancelled/completed
   onderscheid (sectie 10).
3. **Availability vs attendance** -- één, dubbelzinnig `status`-veld
   dat beide concepten mengde (sectie 12/13).
4. **Recurring/duplicate events** -- geen enkele ondersteuning
   (sectie 11).
5. **Notificatie-integratie** -- `team_events`/`event_responsibilities`
   waren niet gekoppeld aan de bestaande `social_notifications`-
   infrastructuur (sectie 23-27).

## Nog steeds niet gebouwd (bewust, buiten scope van deze sprint)

- Team chat/announcements (sectie 40): niet gebouwd -- event-updates +
  notificaties + bestaande social-communicatie lossen de operationele
  user job al op. Geregistreerd als P2/P3, non-blocking.
- Team workout assignment aan een subset athletes (sectie 35): niet
  onderzocht binnen deze sprint -- vereist een aparte, gerichte audit
  van het bestaande `coach_program_assignments`-model.
- Volledige, zichtbare UI: expliciet buiten scope, zie
  `docs/B9_H2C_TEAM_OPERATIONS_UI_REQUIREMENTS.md`.
