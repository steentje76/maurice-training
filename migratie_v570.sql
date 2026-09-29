-- migratie_v570.sql — Security audit (privileged functions): minimale EXECUTE-hardening.
--
-- Bewezen in de read-only audit (docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md): vijf SECURITY DEFINER-
-- functies waren via de impliciete PUBLIC-grant ook door `anon` uitvoerbaar. Geen van de vijf is voor een
-- niet-ingelogde gebruiker bedoeld: alle client-aanroepen lopen met een gebruikers-JWT (sbRpc/sbRpcQ,
-- fetch met SB_H) en upsert_daily_health daarnaast server-side met service_role (wearable-sync.js).
-- Adversarial (teruggedraaid): anon werd door de functies zelf al geweigerd (auth.uid() is null) ->
-- classificatie B (onnodig blootgesteld), geen exploit.
--
-- Wijziging: EXECUTE van PUBLIC en anon intrekken; expliciet toekennen aan authenticated en service_role,
-- zodat het legitieme gedrag ongewijzigd blijft. Geen wijziging aan functiebody, SECURITY DEFINER,
-- search_path, owner, signatures, tabellen, RLS of policies. Zelfde conventie als migratie_v447.
-- Idempotent: revoke/grant kunnen veilig herhaald worden.

revoke execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer) from public, anon;
grant  execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer) to authenticated, service_role;

revoke execute on function public.schedule_my_training(text, date, jsonb, uuid) from public, anon;
grant  execute on function public.schedule_my_training(text, date, jsonb, uuid) to authenticated, service_role;

revoke execute on function public.get_or_create_direct_thread(uuid) from public, anon;
grant  execute on function public.get_or_create_direct_thread(uuid) to authenticated, service_role;

revoke execute on function public.upsert_endurance_profile_target(text, numeric, numeric) from public, anon;
grant  execute on function public.upsert_endurance_profile_target(text, numeric, numeric) to authenticated, service_role;

-- RLS-helper (policies op message_threads/messages/message_participants, rol public). anon heeft op die
-- tabellen geen SELECT/INSERT, dus anon heeft EXECUTE nooit nodig.
revoke execute on function public.is_thread_participant(uuid) from public, anon;
grant  execute on function public.is_thread_participant(uuid) to authenticated, service_role;
