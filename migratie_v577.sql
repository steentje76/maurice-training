-- migratie_v577.sql — GAP-P2-024: behoud gedeelde teamhistorie bij accountverwijdering.
--
-- Live baseline 2026-10-01 (Maurice training / Trainingskompas):
--   team_events_created_by_fkey = FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
--   team_events.created_by = NOT NULL
--   team_events/event_attendance/event_responsibilities = 0/0/0 rijen
-- RLS autoriseert team_events uitsluitend via team_has_access(team_id, ...), niet via created_by.
--
-- Probleem: het verwijderen van de organisator verwijdert door CASCADE het hele event en vervolgens via event_id
-- ook attendance/responsibilities van andere actieve teamleden. Een team-event is gedeelde operationele historie;
-- de identiteit van een verwijderde organisator mag verdwijnen, het event zelf niet.
--
-- Scope:
--  1. created_by nullable maken;
--  2. de auth.users-FK wijzigen naar ON DELETE SET NULL;
--  3. notify_team_event_created() fail-closed maken voor een event zonder creator.
-- Geen RLS/policy/grant-uitbreiding, geen wijziging aan attendance/responsibility-FK's en geen Calculation/Context/
-- Decision/AI-semantiek.

alter table public.team_events
  alter column created_by drop not null;

alter table public.team_events
  drop constraint if exists team_events_created_by_fkey;

alter table public.team_events
  add constraint team_events_created_by_fkey
  foreign key (created_by) references auth.users(id)
  on delete set null;

-- Na SET NULL is "v_created_by <> auth.uid()" niet fail-closed: NULL <> uuid evalueert naar UNKNOWN.
-- IS DISTINCT FROM behandelt NULL expliciet als verschillend en weigert de RPC voor verweesde events.
create or replace function public.notify_team_event_created(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_team_id text;
  v_created_by uuid;
begin
  select team_id, created_by into v_team_id, v_created_by
  from public.team_events
  where id = p_event_id;

  if v_team_id is null then
    raise exception 'event bestaat niet';
  end if;

  if v_created_by is distinct from auth.uid() then
    raise exception 'uitsluitend de maker van het event kan de aanmaak-notificatie versturen';
  end if;

  insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)
  select m.user_id, 'team_event_created', auth.uid(), 'team_event', p_event_id
  from public.memberships m
  where m.team_id = v_team_id
    and m.status = 'active'
    and m.user_id <> auth.uid();
end;
$$;

revoke all on function public.notify_team_event_created(uuid) from public, anon;
grant execute on function public.notify_team_event_created(uuid) to authenticated;
