# B9-H2C Team Operations Security Matrix

## Live, adversariaal getest (transacties zonder commit, 0 restanten)

| Scenario | Verwacht | Resultaat |
|---|---|---|
| S3: normaal lid maakt zelf een event | DENIED | ✅ RLS-violation |
| S4: coach Team A wijzigt Team B event (`update_team_event_notify`) | DENIED | ✅ "geen bevoegdheid om dit event te wijzigen" |
| S5: taak toewijzen aan gebruiker buiten het team | DENIED | ✅ "toegewezen gebruiker is geen actief lid van dit team" |
| S8/anon: `team_has_access()` uitvoeren | DENIED | ✅ `has_function_privilege('anon',...)` = false, harde weigering |
| Alle 5 nieuwe/gewijzigde RPC's: anon execute | DENIED | ✅ live bevestigd voor elk van de vijf functies |

## Niet opnieuw, live gemuteerd in deze sprint (reeds bevestigd in eerdere sprints, ongewijzigde onderliggende RLS)

- S1 (anon leest private event): dezelfde RLS als S8 hierboven, functioneel gedekt.
- S2 (athlete Team A leest Team B private event): dezelfde `team_has_access()`-logica als S4, niet apart opnieuw gemuteerd om geen extra testdata te creëren.
- S6 (removed member leest toekomstige events): `team_has_access()` controleert `status='active'` op de membership -- een verwijderd lid heeft per definitie geen actieve membership meer.
- S7 (self-elevation naar manager): reeds live bevestigd in B9-H2A (`memberships.role` niet self-editable) -- ongewijzigde RLS in deze sprint.

## SECURITY DEFINER-audit (5 functies)

Elke nieuwe/gewijzigde functie (`social_create_notification`,
`notify_team_event_created`, `update_team_event_notify`,
`cancel_team_event_notify`, `assign_event_responsibility_notify`):

- `SECURITY DEFINER` + expliciete `SET search_path TO 'public'` (voorkomt search_path-hijacking).
- Expliciete `auth.uid()`-authenticatiecheck.
- Expliciete `team_has_access()`-autorisatiecheck vóór elke mutatie.
- Expliciete `revoke ... from anon` NAAST de `grant ... to authenticated` (niet alleen `revoke from public` -- de B9-07-les blijft toegepast).
- Live, individueel bevestigd: `anon_mag=false`, `auth_mag=true` voor alle vijf.

## Zelf gevonden en gerepareerde gaten (deze sprint)

1. **Idempotency:** `team_events` ontbrak in `IDEMPOTENT_TABELLEN_MET_CLIENT_ID` -- een netwerk-retry bij event-aanmaak kon een duplicaat creëren. Toegevoegd.
2. **Account deletion:** `team_events`/`event_attendance`/`event_responsibilities` hadden al correcte CASCADE/SET NULL-FK's, maar stonden niet expliciet in de deletion-lijst (auditeerbaarheid). Toegevoegd.

## Bekend, gedocumenteerd aandachtspunt (niet in deze sprint opgelost)

`team_events.created_by` heeft `ON DELETE CASCADE` -- als de maker van
een event zijn account verwijdert, verdwijnt het hele event (en de
operationele geschiedenis ervan voor de rest van het team). Dit is een
bestaande, niet in deze sprint gewijzigde keuze. Vastgelegd als een
mogelijk toekomstig verbeterpunt (`SET NULL` i.p.v. `CASCADE`), niet
als P0/P1 geclassificeerd omdat het geen privacy-/securityregressie is
-- uitsluitend een functioneel/UX-vraagstuk over teamgeschiedenis.
