-- migratie_v538.sql
-- Benchmark 9+ Functional Deep-Dive -- B9G-SOC-002 (kleine, veilige
-- functionele fix, geen UX-wijziging, expliciet als LAAG-complexiteit
-- geregistreerd in docs/BENCHMARK_9_PLUS_GAP_REGISTRY.md).
--
-- Breidt de bestaande, veilige social_notifications-infrastructuur
-- (B9-07B) uit met twee nieuwe, toegestane event_type-waarden
-- ('reaction'/'comment') en één nieuwe target_type-waarde
-- ('shared_activity') -- forward-only, geen bestaande data gewijzigd,
-- geen nieuwe tabel, hergebruikt de bestaande RLS/RPC-infrastructuur
-- volledig (social_create_notification blijft ongewijzigd, uitsluitend
-- de toegestane input-waarden worden verruimd).
alter table public.social_notifications drop constraint if exists social_notifications_event_type_check;
alter table public.social_notifications add constraint social_notifications_event_type_check
  check (event_type = any (array['connection_request','connection_accepted','group_invite','group_join_approved','challenge_invite','reaction','comment']));

alter table public.social_notifications drop constraint if exists social_notifications_target_type_check;
alter table public.social_notifications add constraint social_notifications_target_type_check
  check (target_type = any (array['profile','group','challenge','shared_activity']));

-- De RPC zelf heeft een eigen, interne validatie los van de database-
-- check-constraint (defense-in-depth) -- moet apart worden uitgebreid.
-- Alle bestaande security-eigenschappen ongewijzigd behouden: SECURITY
-- DEFINER, SET search_path (voorkomt search_path-hijacking), de
-- auth.uid()-authenticatiecheck, en de zelf-notificatie-preventie.
create or replace function public.social_create_notification(p_recipient_id uuid, p_event_type text, p_target_type text, p_target_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_event_type not in ('connection_request','connection_accepted','group_invite','group_join_approved','challenge_invite','reaction','comment') then
    raise exception 'invalid event_type';
  end if;
  if p_target_type not in ('profile','group','challenge','shared_activity') then
    raise exception 'invalid target_type';
  end if;
  if p_recipient_id = auth.uid() then
    return;
  end if;
  insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)
  values (p_recipient_id, p_event_type, auth.uid(), p_target_type, p_target_id);
end;
$function$;
