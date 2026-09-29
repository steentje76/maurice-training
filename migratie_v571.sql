-- migratie_v571.sql — F-SEC-001 closure: server-side autorisatie in public.social_create_notification.
--
-- Root cause (docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md, F-SEC-001): de functie is SECURITY DEFINER (nodig:
-- social_notifications heeft geen client-INSERT-policy) maar controleerde alleen of er een ingelogde caller
-- was en of event_type/target_type in een allowlist stonden. Ontvanger en doel waren volledig caller-gestuurd:
-- elke ingelogde gebruiker kon voor iedere andere gebruiker een notificatie van elk toegestaan type maken.
--
-- Fix: zelfde signature, zelfde SECURITY DEFINER/owner/search_path, maar per event_type een verplichte,
-- server-side bewezen relatie tussen auth.uid() (actor), p_recipient_id en p_target_id. Uitsluitend de typen die
-- aantoonbaar via deze functie worden geproduceerd zijn toegestaan; al het andere is fail-closed:
--   reaction              : actor heeft een reaction op social_shared_activities p_target_id, ontvanger = athlete_id
--   comment               : actor heeft een comment op social_shared_activities p_target_id, ontvanger = athlete_id
--   connection_request    : social_connections actor->ontvanger status 'pending', target = profiel van actor
--   connection_accepted   : social_connections ontvanger->actor status 'accepted', target = profiel van actor
--   responsibility_assigned: event_responsibilities(event p_target_id, assigned_user_id = ontvanger) en actor heeft
--                           team_has_access(owner/admin/staff) op het team van dat event (auth.uid()-gebonden helper)
-- Niet meer via deze functie: group_invite, group_join_approved, challenge_invite (geen producer), team_event_*
-- (worden door hun eigen geautoriseerde functies direct aangemaakt), new_message (trigger). Geen F-SEC-003-helpers
-- als security boundary gebruikt. Grants ongewijzigd t.o.v. v570 (geen PUBLIC/anon).

create or replace function public.social_create_notification(p_recipient_id uuid, p_event_type text, p_target_type text, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_ok boolean := false;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_event_type is null or p_event_type not in ('reaction','comment','connection_request','connection_accepted','responsibility_assigned') then
    raise exception 'invalid event_type';
  end if;
  if p_recipient_id is null or p_target_type is null or p_target_id is null then
    raise exception 'invalid notification';
  end if;
  -- Bestaand gedrag: geen notificatie aan jezelf (stil, geen fout).
  if p_recipient_id = v_actor then return; end if;

  if p_event_type = 'reaction' then
    v_ok := p_target_type = 'shared_activity' and exists (
      select 1 from public.social_shared_activities sa
      join public.social_reactions r on r.shared_activity_id = sa.id
      where sa.id = p_target_id and sa.athlete_id = p_recipient_id and r.user_id = v_actor);
  elsif p_event_type = 'comment' then
    v_ok := p_target_type = 'shared_activity' and exists (
      select 1 from public.social_shared_activities sa
      join public.social_comments c on c.shared_activity_id = sa.id
      where sa.id = p_target_id and sa.athlete_id = p_recipient_id and c.user_id = v_actor);
  elsif p_event_type = 'connection_request' then
    v_ok := p_target_type = 'profile' and p_target_id = v_actor and exists (
      select 1 from public.social_connections sc
      where sc.follower_id = v_actor and sc.followee_id = p_recipient_id and sc.status = 'pending');
  elsif p_event_type = 'connection_accepted' then
    v_ok := p_target_type = 'profile' and p_target_id = v_actor and exists (
      select 1 from public.social_connections sc
      where sc.follower_id = p_recipient_id and sc.followee_id = v_actor and sc.status = 'accepted');
  elsif p_event_type = 'responsibility_assigned' then
    v_ok := p_target_type = 'team_event' and exists (
      select 1 from public.event_responsibilities er
      join public.team_events te on te.id = er.event_id
      where er.event_id = p_target_id and er.assigned_user_id = p_recipient_id
        and public.team_has_access(te.team_id, array['owner','admin','staff']));
  end if;

  if not coalesce(v_ok, false) then raise exception 'not authorized for this notification'; end if;

  insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)
  values (p_recipient_id, p_event_type, v_actor, p_target_type, p_target_id);
end;
$function$;

revoke execute on function public.social_create_notification(uuid, text, text, uuid) from public, anon;
grant  execute on function public.social_create_notification(uuid, text, text, uuid) to authenticated, service_role;
