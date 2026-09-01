-- migratie_v535.sql
-- B9-07B -- Social Product Layer Closure: minimale, gemotiveerde
-- schema-uitbreiding voor de resterende blockers (reactions/comments),
-- plus een veilige notificatie-creatiefunctie.

create table if not exists public.social_reactions (
  id uuid primary key default gen_random_uuid(),
  shared_activity_id uuid not null references public.social_shared_activities(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique(shared_activity_id, user_id)
);
alter table public.social_reactions enable row level security;

create policy social_reactions_lezen on public.social_reactions
  for select using (
    auth.uid() is not null and exists (
      select 1 from public.social_shared_activities sa
      where sa.id = social_reactions.shared_activity_id
        and (
          sa.athlete_id = auth.uid()
          or (
            not social_is_blocked_pair(auth.uid(), sa.athlete_id)
            and (
              sa.visibility = 'public'
              or (sa.visibility = 'connections' and exists (
                select 1 from public.social_connections c
                where c.follower_id = auth.uid() and c.followee_id = sa.athlete_id and c.status = 'accepted'
              ))
            )
          )
        )
    )
  );
create policy social_reactions_eigen_schrijven on public.social_reactions
  for all using (user_id = auth.uid()) with check (
    user_id = auth.uid() and exists (
      select 1 from public.social_shared_activities sa
      where sa.id = social_reactions.shared_activity_id
        and (
          sa.athlete_id = auth.uid()
          or (
            not social_is_blocked_pair(auth.uid(), sa.athlete_id)
            and (
              sa.visibility = 'public'
              or (sa.visibility = 'connections' and exists (
                select 1 from public.social_connections c
                where c.follower_id = auth.uid() and c.followee_id = sa.athlete_id and c.status = 'accepted'
              ))
            )
          )
        )
    )
  );

create table if not exists public.social_comments (
  id uuid primary key default gen_random_uuid(),
  shared_activity_id uuid not null references public.social_shared_activities(id) on delete cascade,
  user_id uuid not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.social_comments enable row level security;
create policy social_comments_lezen on public.social_comments
  for select using (
    auth.uid() is not null and exists (
      select 1 from public.social_shared_activities sa
      where sa.id = social_comments.shared_activity_id
        and (
          sa.athlete_id = auth.uid()
          or (
            not social_is_blocked_pair(auth.uid(), sa.athlete_id)
            and (
              sa.visibility = 'public'
              or (sa.visibility = 'connections' and exists (
                select 1 from public.social_connections c
                where c.follower_id = auth.uid() and c.followee_id = sa.athlete_id and c.status = 'accepted'
              ))
            )
          )
        )
    )
  );
create policy social_comments_eigen_aanmaken on public.social_comments
  for insert with check (
    user_id = auth.uid() and exists (
      select 1 from public.social_shared_activities sa
      where sa.id = social_comments.shared_activity_id
        and (
          sa.athlete_id = auth.uid()
          or (
            not social_is_blocked_pair(auth.uid(), sa.athlete_id)
            and (
              sa.visibility = 'public'
              or (sa.visibility = 'connections' and exists (
                select 1 from public.social_connections c
                where c.follower_id = auth.uid() and c.followee_id = sa.athlete_id and c.status = 'accepted'
              ))
            )
          )
        )
    )
  );
create policy social_comments_eigen_verwijderen on public.social_comments
  for delete using (user_id = auth.uid());

create index if not exists idx_social_reactions_activity on public.social_reactions(shared_activity_id);
create index if not exists idx_social_comments_activity on public.social_comments(shared_activity_id);

-- social_notifications had 0 insert-policies EN 0 triggers -- volledig
-- orphaned. Deze SECURITY DEFINER-functie is het enige, veilige
-- schrijfpad: een gebruiker kan nooit zelf een notificatie voor een
-- ander insereren (voorkomt spam/phishing), actor_id is altijd
-- auth.uid() zelf (geen impersonatie mogelijk). Respecteert het
-- bestaande, al vastgelegde contract van de tabel (event_type/
-- target_type check-constraints, NIET uitgebreid met nieuwe waarden
-- voor reactions/comments -- dat viel buiten het oorspronkelijke,
-- bewuste ontwerp).
create or replace function public.social_create_notification(
  p_recipient_id uuid,
  p_event_type text,
  p_target_type text,
  p_target_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_event_type not in ('connection_request','connection_accepted','group_invite','group_join_approved','challenge_invite') then
    raise exception 'invalid event_type';
  end if;
  if p_target_type not in ('profile','group','challenge') then
    raise exception 'invalid target_type';
  end if;
  if p_recipient_id = auth.uid() then
    return;
  end if;
  insert into public.social_notifications (recipient_id, event_type, actor_id, target_type, target_id)
  values (p_recipient_id, p_event_type, auth.uid(), p_target_type, p_target_id);
end;
$$;
revoke all on function public.social_create_notification(uuid, text, text, uuid) from public;
-- P0-FIX (zelf gevonden tijdens live verificatie): een expliciete revoke van
-- 'public' bleek onvoldoende -- anon had via een andere weg (mogelijk een
-- default privilege) alsnog execute-rechten op deze SECURITY DEFINER-functie.
-- Een expliciete, aparte revoke van 'anon' is daarom noodzakelijk, niet optioneel.
revoke all on function public.social_create_notification(uuid, text, text, uuid) from anon;
grant execute on function public.social_create_notification(uuid, text, text, uuid) to authenticated;
