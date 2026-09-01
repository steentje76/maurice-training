-- migratie_v540.sql
-- B9-H2C Team Operations 9+ Functional Enablement (backend-only).
--
-- Existing-state audit (migratie_v516/v517.sql) bevestigde dat het
-- fundament al bestaat: team_events/event_attendance/
-- event_responsibilities/team_has_access(), volledig RLS-beveiligd,
-- live adversarial herbevestigd in deze sprint (T3/T7 geweigerd).
-- Deze migratie vult uitsluitend de functionele gaten die zonder een
-- nieuwe UI-keuze veilig te bouwen zijn (sectie 59 van de opdracht).
--
-- 0 productiedata in alle drie tabellen (bevestigd, geen risico).

-- 1. Meeting time (sectie 18): starttijd != verzameltijd, apart veld
--    i.p.v. verstopt in description.
alter table public.team_events add column if not exists meeting_at timestamptz;

-- 2. Event lifecycle (sectie 10): planned -> cancelled/completed.
--    'updated' is bewust GEEN aparte status -- een wijziging van tijd/
--    locatie is een update van dezelfde rij (sectie 26: "Geen
--    duplicate event maken bij edit"), geen state-transitie.
alter table public.team_events add column if not exists status text not null default 'planned'
  check (status in ('planned', 'cancelled', 'completed'));

-- 3. Recurring/duplicate events (sectie 11): eenvoudigste, robuuste
--    oplossing -- een self-reference die aangeeft dat dit event een
--    kopie is van een eerder event, geen complexe recurrence-engine/
--    series-model.
alter table public.team_events add column if not exists duplicated_from_event_id uuid references public.team_events(id) on delete set null;

-- 4. Availability vs attendance (sectie 12/13): expliciet onderscheid
--    i.p.v. één, dubbelzinnig 'status'-veld. 'stage' geeft aan of de
--    rij een vooraf-opgegeven beschikbaarheid of een achteraf-
--    geregistreerde aanwezigheid representeert. Bestaande 'status'-
--    check-constraint blijft ongewijzigd (dezelfde waarden zijn
--    bruikbaar voor beide stages: 'maybe'/'no_response' typisch
--    availability, 'present'/'absent' typisch attendance -- de UI
--    bepaalt straks per stage welke subset relevant is).
alter table public.event_attendance add column if not exists stage text not null default 'attendance'
  check (stage in ('availability', 'attendance'));

alter table public.event_attendance drop constraint if exists event_attendance_unique;
alter table public.event_attendance add constraint event_attendance_event_id_user_id_stage_key unique (event_id, user_id, stage);

-- 5. Notificatie-integratie (sectie 23-27): hergebruikt de bestaande,
--    veilige social_notifications-infrastructuur (B9-07B/B9G-SOC-002)
--    -- geen tweede notificatiesysteem. Nieuwe, toegestane waarden.
alter table public.social_notifications drop constraint if exists social_notifications_event_type_check;
alter table public.social_notifications add constraint social_notifications_event_type_check
  check (event_type = any (array['connection_request','connection_accepted','group_invite','group_join_approved','challenge_invite','reaction','comment','team_event_created','team_event_updated','team_event_cancelled','responsibility_assigned']));

alter table public.social_notifications drop constraint if exists social_notifications_target_type_check;
alter table public.social_notifications add constraint social_notifications_target_type_check
  check (target_type = any (array['profile','group','challenge','shared_activity','team_event']));

-- 6. Idempotency (sectie 29): team_events toevoegen aan het bestaande,
--    generieke client-id-gebaseerde idempotency-mechanisme -- geen
--    nieuw framework.
-- (Deze regel is documentatie voor de client-side wijziging in
-- index.html, niet uitvoerbaar als SQL; zie IDEMPOTENT_TABELLEN_MET_
-- CLIENT_ID in index.html.)

-- 6b. De social_create_notification()-RPC heeft een eigen, interne
--     validatie los van de database-check-constraint (defense-in-depth,
--     zelfde les als B9G-SOC-002) -- moet apart worden uitgebreid. Alle
--     bestaande security-eigenschappen ongewijzigd behouden.
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
  if p_event_type not in ('connection_request','connection_accepted','group_invite','group_join_approved','challenge_invite','reaction','comment','team_event_created','team_event_updated','team_event_cancelled','responsibility_assigned') then
    raise exception 'invalid event_type';
  end if;
  if p_target_type not in ('profile','group','challenge','shared_activity','team_event') then
    raise exception 'invalid target_type';
  end if;
  if p_recipient_id = auth.uid() then
    return;
  end if;
  insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)
  values (p_recipient_id, p_event_type, auth.uid(), p_target_type, p_target_id);
end;
$function$;

-- 6c. Event-creatie zelf loopt via de gewone, RLS-beveiligde insert op
--     team_events (geen wijziging nodig -- RLS is al bewezen correct,
--     T3 live herbevestigd in deze sprint). Deze kleine RPC verstuurt
--     uitsluitend de "event created"-notificatie na een succesvolle
--     insert, zelfde patroon als update/cancel hierboven.
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
  select team_id, created_by into v_team_id, v_created_by from public.team_events where id = p_event_id;
  if v_team_id is null then
    raise exception 'event bestaat niet';
  end if;
  if v_created_by <> auth.uid() then
    raise exception 'uitsluitend de maker van het event kan de aanmaak-notificatie versturen';
  end if;

  insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)
  select m.user_id, 'team_event_created', auth.uid(), 'team_event', p_event_id
  from public.memberships m
  where m.team_id = v_team_id and m.status = 'active' and m.user_id <> auth.uid();
end;
$$;

revoke all on function public.notify_team_event_created(uuid) from public;
revoke execute on function public.notify_team_event_created(uuid) from anon;
grant execute on function public.notify_team_event_created(uuid) to authenticated;

-- 7. Event-update met geïntegreerde notificaties (sectie 23-27): een
--    enkele, veilige RPC die (a) autorisatie herbevestigt via het
--    bestaande team_has_access(), (b) het event bijwerkt (geen
--    duplicaat-event bij edit), en (c) notificaties genereert voor
--    alle actieve teamleden BEHALVE de acteur zelf (sectie 25), via de
--    reeds bestaande, veilige social_create_notification()-RPC -- geen
--    tweede notificatiesysteem, geen blinde organization-wide broadcast
--    (sectie 24: uitsluitend team-participanten).
create or replace function public.update_team_event_notify(
  p_event_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_meeting_at timestamptz,
  p_location_id uuid,
  p_description text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_team_id text;
begin
  select team_id into v_team_id from public.team_events where id = p_event_id;
  if v_team_id is null then
    raise exception 'event bestaat niet';
  end if;
  if not public.team_has_access(v_team_id, array['owner','admin','staff']) then
    raise exception 'geen bevoegdheid om dit event te wijzigen';
  end if;

  update public.team_events
  set title = coalesce(p_title, title),
      starts_at = coalesce(p_starts_at, starts_at),
      ends_at = coalesce(p_ends_at, ends_at),
      meeting_at = p_meeting_at,
      location_id = coalesce(p_location_id, location_id),
      description = coalesce(p_description, description),
      status = 'planned'
  where id = p_event_id;

  insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)
  select m.user_id, 'team_event_updated', auth.uid(), 'team_event', p_event_id
  from public.memberships m
  where m.team_id = v_team_id and m.status = 'active' and m.user_id <> auth.uid();
end;
$$;

revoke all on function public.update_team_event_notify(uuid, text, timestamptz, timestamptz, timestamptz, uuid, text) from public;
revoke execute on function public.update_team_event_notify(uuid, text, timestamptz, timestamptz, timestamptz, uuid, text) from anon;
grant execute on function public.update_team_event_notify(uuid, text, timestamptz, timestamptz, timestamptz, uuid, text) to authenticated;

-- 8. Event-annulering met notificatie (sectie 27): geen stille delete
--    -- status wordt 'cancelled', de rij (en daarmee de geschiedenis)
--    blijft bestaan, alle actieve teamleden krijgen een notificatie.
create or replace function public.cancel_team_event_notify(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_team_id text;
begin
  select team_id into v_team_id from public.team_events where id = p_event_id;
  if v_team_id is null then
    raise exception 'event bestaat niet';
  end if;
  if not public.team_has_access(v_team_id, array['owner','admin','staff']) then
    raise exception 'geen bevoegdheid om dit event te annuleren';
  end if;

  update public.team_events set status = 'cancelled' where id = p_event_id;

  insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)
  select m.user_id, 'team_event_cancelled', auth.uid(), 'team_event', p_event_id
  from public.memberships m
  where m.team_id = v_team_id and m.status = 'active' and m.user_id <> auth.uid();
end;
$$;

revoke all on function public.cancel_team_event_notify(uuid) from public;
revoke execute on function public.cancel_team_event_notify(uuid) from anon;
grant execute on function public.cancel_team_event_notify(uuid) to authenticated;

-- 9. Responsibility-toewijzing met notificatie (sectie 23: "responsibility
--    assigned"). Autorisatie: uitsluitend staff van het team (dezelfde
--    regel als event-wijziging), member-boundary (sectie 32): de
--    toegewezen gebruiker moet een geldig, actief teamlid zijn.
create or replace function public.assign_event_responsibility_notify(
  p_event_id uuid,
  p_task text,
  p_assigned_user_id uuid,
  p_deadline timestamptz,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_team_id text;
  v_new_id uuid;
begin
  select team_id into v_team_id from public.team_events where id = p_event_id;
  if v_team_id is null then
    raise exception 'event bestaat niet';
  end if;
  if not public.team_has_access(v_team_id, array['owner','admin','staff']) then
    raise exception 'geen bevoegdheid om taken toe te wijzen';
  end if;
  if p_assigned_user_id is not null and not exists (
    select 1 from public.memberships m where m.team_id = v_team_id and m.user_id = p_assigned_user_id and m.status = 'active'
  ) then
    raise exception 'toegewezen gebruiker is geen actief lid van dit team';
  end if;

  insert into public.event_responsibilities (event_id, task, assigned_user_id, status, deadline, note)
  values (p_event_id, p_task, p_assigned_user_id, 'open', p_deadline, p_note)
  returning id into v_new_id;

  if p_assigned_user_id is not null and p_assigned_user_id <> auth.uid() then
    perform public.social_create_notification(p_assigned_user_id, 'responsibility_assigned', 'team_event', p_event_id);
  end if;

  return v_new_id;
end;
$$;

revoke all on function public.assign_event_responsibility_notify(uuid, text, uuid, timestamptz, text) from public;
revoke execute on function public.assign_event_responsibility_notify(uuid, text, uuid, timestamptz, text) from anon;
grant execute on function public.assign_event_responsibility_notify(uuid, text, uuid, timestamptz, text) to authenticated;

-- 10. GAP GEVONDEN TIJDENS UI-REQUIREMENTS-ANALYSE (sectie 16/50): de
--     bestaande RLS op event_attendance stond UITSLUITEND self-mutatie
--     toe (user_id = auth.uid()) voor zowel INSERT als UPDATE -- een
--     coach kon dus GEEN aanwezigheid voor een ander teamlid
--     registreren, terwijl sectie 16 dit expliciet vereist ("na afloop
--     moet daadwerkelijk attendance geregistreerd kunnen worden").
--     Dit is een functionele backend-gap, geen UX-keuze (sectie 5).
--
--     Oplossing: staff (owner/admin/staff via team_has_access()) mag
--     nu MUTEREN voor stage='attendance' van een ANDER teamlid.
--     Availability (stage='availability') blijft strikt self-only,
--     conform sectie 49 ("Athlete mag availability van andere athlete
--     niet manipuleren") -- expliciet los gehouden per stage, geen
--     brede FOR ALL-policy.
drop policy if exists event_attendance_self_insert on public.event_attendance;
create policy event_attendance_self_or_staff_insert on public.event_attendance
  for insert with check (
    (stage = 'availability' and user_id = auth.uid())
    or (
      stage = 'attendance'
      and (
        user_id = auth.uid()
        or exists (
          select 1 from public.team_events e
          where e.id = event_attendance.event_id
            and public.team_has_access(e.team_id, array['owner','admin','staff'])
        )
      )
    )
  );

drop policy if exists event_attendance_self_update on public.event_attendance;
create policy event_attendance_self_or_staff_update on public.event_attendance
  for update using (
    (stage = 'availability' and user_id = auth.uid())
    or (
      stage = 'attendance'
      and (
        user_id = auth.uid()
        or exists (
          select 1 from public.team_events e
          where e.id = event_attendance.event_id
            and public.team_has_access(e.team_id, array['owner','admin','staff'])
        )
      )
    )
  ) with check (
    (stage = 'availability' and user_id = auth.uid())
    or (
      stage = 'attendance'
      and (
        user_id = auth.uid()
        or exists (
          select 1 from public.team_events e
          where e.id = event_attendance.event_id
            and public.team_has_access(e.team_id, array['owner','admin','staff'])
        )
      )
    )
  );
