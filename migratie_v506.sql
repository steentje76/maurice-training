-- migratie_v506.sql
-- MS-F9-03 (Sharing, Moderation & Notifications)
--
-- Hergebruikt social_reports uit MS-F9-01 (geen tweede reportmodel).
-- Moderatie-lifecycle-beheer expliciet buiten scope: geen nep-moderatorrol
-- zonder echte architectuur.

create table if not exists public.social_shared_activities (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references auth.users(id) on delete cascade,
  training_instance_id uuid references public.training_instances(id) on delete cascade,
  sport text,
  title text,
  completed_at timestamptz,
  duration_seconds integer,
  distance_meters numeric,
  achievement_label text,
  athlete_note text check (athlete_note is null or char_length(athlete_note) <= 500),
  visibility text not null default 'connections' check (visibility in ('connections','public')),
  created_at timestamptz not null default now()
);
comment on table public.social_shared_activities is
  'MS-F9-03 -- referentie naar training_instances + expliciete presentatie-whitelist. Verwijderen verwijdert nooit training_instance. Sharing is expliciet.';

alter table public.social_shared_activities enable row level security;

create policy social_shared_activities_eigenaar_schrijft on public.social_shared_activities
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- ============================================================================
-- KRITIEKE GARANTIE (live adversarial getest): block wint ALTIJD, ook over
-- publieke visibility. Live bevestigd: een geblokkeerde gebruiker die een
-- PUBLIEKE gedeelde activiteit van de blocker probeerde te lezen, kreeg
-- 0 rijen.
-- ============================================================================
create policy social_shared_activities_lezen on public.social_shared_activities
  for select using (
    auth.uid() is not null
    and (
      athlete_id = auth.uid()
      or (
        not public.social_is_blocked_pair(auth.uid(), athlete_id)
        and (
          visibility = 'public'
          or (visibility = 'connections' and exists (
            select 1 from public.social_connections c
            where c.follower_id = auth.uid() and c.followee_id = social_shared_activities.athlete_id and c.status = 'accepted'
          ))
        )
      )
    )
  );

create index if not exists idx_ssa_athlete on public.social_shared_activities(athlete_id, created_at desc);

-- ============================================================================
-- Notifications: minimaal model, uitsluitend recipient-leesbaar, geen
-- sensitive content-snapshot.
--
-- KRITIEKE GARANTIE (live adversarial getest): een gewone geauthenticeerde
-- gebruiker kan GEEN notificatie forgeren. Expliciet GEEN insert-policy
-- voor authenticated -- uitsluitend service_role. Live bevestigd: een
-- INSERT-poging door een gewone gebruiker gaf een expliciete RLS-schending.
-- ============================================================================
create table if not exists public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('connection_request','connection_accepted','group_invite','group_join_approved','challenge_invite')),
  actor_id uuid references auth.users(id) on delete set null,
  target_type text check (target_type in ('profile','group','challenge')),
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.social_notifications is
  'MS-F9-03 -- geen sensitive content-snapshot. Recipient-only leesbaar. INSERT uitsluitend via service_role.';

alter table public.social_notifications enable row level security;

create policy social_notifications_recipient_leest on public.social_notifications
  for select using (recipient_id = auth.uid());

create policy social_notifications_recipient_markeert_gelezen on public.social_notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create index if not exists idx_sn_recipient on public.social_notifications(recipient_id, created_at desc);

-- ============================================================================
-- SCOPE-BEPERKING (eerlijk vastgelegd): native push/e-mail-infrastructuur
-- bestaat niet en wordt niet gebouwd binnen deze sprint -- uitsluitend de
-- in-app notificatie-architectuur is IMPLEMENTED. Push/e-mail blijft
-- DEFERRED. Moderatie-lifecycle blijft eveneens DEFERRED -- geen aparte
-- moderator-rol/architectuur binnen deze sprint. social_reports (MS-F9-01)
-- blijft het enige reportmodel.
