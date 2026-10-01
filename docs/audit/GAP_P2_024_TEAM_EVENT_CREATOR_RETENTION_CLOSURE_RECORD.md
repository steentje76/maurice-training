# GAP-P2-024 — Closure record

**Status:** CLOSED_PROVEN  
**Datum:** 1 oktober 2026  
**Implementatie-PR:** #500  
**Implementatie-main:** `f8bac6a00ef834dc45b1c98f25b7b077da78988e`  
**Exact-head Quality Gate:** `36833848714` — SUCCESS op `f4111d59b455155444cb2f42f22f11e7ccbadc11`  
**Post-merge Quality Gate:** `36834191270` — SUCCESS op `f8bac6a00ef834dc45b1c98f25b7b077da78988e`

## Acceptance claim

De oorspronkelijke gap stelde dat verwijderen van de organisator door `team_events.created_by ON DELETE CASCADE` het volledige gedeelde event kon verwijderen en daarmee attendance/responsibility-historie van andere teamleden kon meenemen. De closure vereist dat de organisator ontkoppeld wordt zonder het event te verwijderen.

## Bewijs

1. **Live schema:** `team_events_created_by_fkey = FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`; `created_by` is nullable.
2. **Data-baseline bij migratie:** `team_events=0`, `event_attendance=0`, `event_responsibilities=0`; er was geen bestaande eventdata die moest worden herschreven.
3. **Tweede delete-pad verwijderd:** `netlify/functions/delete-account.js` bevat geen `['team_events', ['created_by']]` meer. De verwijderde gebruiker zijn eigen attendance/responsibility-records blijven expliciet opruimbaar.
4. **Autorisatie ongewijzigd:** live `team_events_manage_staff` en `team_events_select` gebruiken alleen `team_has_access(team_id,...)`; creator-provenance is geen access-control-boundary.
5. **NULL-safe RPC:** `notify_team_event_created()` gebruikt `v_created_by IS DISTINCT FROM auth.uid()`; een event zonder creator kan de create-notificatie niet door een willekeurige caller laten herhalen.
6. **Privileges:** de RPC blijft `SECURITY DEFINER` met `search_path=public`; ACL is `postgres`, `authenticated`, `service_role`, zonder anon/PUBLIC EXECUTE.
7. **Regressie:** `core/fTeamEventCreatorRetention.test.js` = 24/24 groen op post-merge main. De F-SEC-010 function-grants guard = 31/31 groen; Native Concept2 transport = 176/176 groen.
8. **Quality Gates:** exact-head run `36833848714` en post-merge run `36834191270` zijn beide SUCCESS.

## Transparantie over eerste gate

De eerste PR-run `36833605555` faalde vóór enige productiemigratie omdat `core/fB9_H2CTeamOperations.test.js` nog de oude, inmiddels ongewenste expliciete `team_events.created_by`-delete als invariant vereiste. Die stale regressieverwachting is op dezelfde PR gereconcilieerd met het nieuwe retention-contract. Pas na de daaropvolgende groene exact-head gate is v577 op productie toegepast.

## Scopegrens

Geen wijziging aan Calculation Engine, Context Engine, Decision Engine, AI Coach, Team Operations-UI, attendance-FK of responsibility-FK. De closure betreft uitsluitend event-retention bij creator-accountverwijdering en de noodzakelijke NULL-safe notification-guard.
