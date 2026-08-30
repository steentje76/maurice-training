-- migratie_v503.sql
-- MS-F9-01 (Social Identity & Privacy Foundation)
--
-- Hergebruikt auth.users (GEEN tweede accountsysteem). Forward-only, additief.
-- Dit bestand bevat de FINALE, LIVE GEVERIFIEERDE staat inclusief drie
-- kritieke fixes die tijdens verplichte live adversarial testing werden
-- ontdekt en direct gerepareerd.

create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  visibility text not null default 'private' check (visibility in ('private','connections','discoverable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.social_profiles is
  'MS-F9-01 -- sociale identiteit, hergebruikt auth.users. Default private: opt-in.';

alter table public.social_profiles enable row level security;

create policy social_profiles_eigen_schrijven on public.social_profiles
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_connections_no_self check (follower_id <> followee_id),
  constraint social_connections_unique unique (follower_id, followee_id)
);
comment on table public.social_connections is
  'MS-F9-01 -- asymmetrisch follow-model. Geen wederkerige "friend"-status.';

alter table public.social_connections enable row level security;

-- ============================================================================
-- FIX 1 (live adversarial test): de follower-policy was oorspronkelijk
-- FOR ALL, wat OOK UPDATE omvatte. Hierdoor kon de follower ZELF zijn eigen
-- 'pending'-verzoek naar 'accepted' zetten -- een self-role-elevation-
-- kwetsbaarheid. Live bevestigd: status werd 'accepted' via de follower's
-- eigen sessie. OPGELOST: follower krijgt uitsluitend INSERT + DELETE.
-- ============================================================================
create policy social_connections_follower_insert on public.social_connections
  for insert
  with check (follower_id = auth.uid() and status = 'pending');

create policy social_connections_follower_delete on public.social_connections
  for delete
  using (follower_id = auth.uid());

create policy social_connections_followee_accepteren on public.social_connections
  for update
  using (followee_id = auth.uid())
  with check (followee_id = auth.uid() and status = 'accepted');

create policy social_connections_beide_partijen_lezen on public.social_connections
  for select
  using (follower_id = auth.uid() or followee_id = auth.uid());

create index if not exists idx_social_connections_followee on public.social_connections(followee_id, status);

create table if not exists public.social_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint social_blocks_no_self check (blocker_id <> blocked_id),
  constraint social_blocks_unique unique (blocker_id, blocked_id)
);
comment on table public.social_blocks is
  'MS-F9-01 -- een block verbergt beide richtingen. De blocked_id-partij ziet dit record NOOIT.';

alter table public.social_blocks enable row level security;

create policy social_blocks_eigen_beheer on public.social_blocks
  for all
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- Expliciet GEEN select-policy voor blocked_id.

create index if not exists idx_social_blocks_blocked on public.social_blocks(blocked_id);

-- ============================================================================
-- FIX 2 (live adversarial test): een directe EXISTS-subquery naar
-- social_blocks vanuit de social_profiles-leespolicy wordt ZELF onderworpen
-- aan de RLS van social_blocks. Omdat de geblokkeerde partij bewust geen
-- select-toegang heeft tot de block-rij, FAALDE de block-check onopgemerkt
-- vanuit HAAR perspectief. Live bevestigd: 1 rij gezien waar 0 verwacht werd.
-- OPGELOST met een SECURITY DEFINER-functie die uitsluitend een boolean
-- teruggeeft (geen rij-data).
--
-- FIX 2b (SECURITY DEFINER-heraudit): anon had onbedoeld EXECUTE-rechten op
-- deze functie (Supabase-default-privilege, niet ondervangen door de
-- eerdere REVOKE ALL FROM PUBLIC). Beperkt lek: anon kon met twee bekende
-- user-ID's navragen of zij elkaar blokkeerden. OPGELOST: expliciete
-- REVOKE EXECUTE FROM anon.
-- ============================================================================
create or replace function public.social_is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.social_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

revoke all on function public.social_is_blocked_pair(uuid, uuid) from public;
revoke execute on function public.social_is_blocked_pair(uuid, uuid) from anon;
grant execute on function public.social_is_blocked_pair(uuid, uuid) to authenticated;

-- ============================================================================
-- FIX 3 (live adversarial test): de eerste versie van deze policy
-- controleerde niet expliciet of de aanvrager is ingelogd. De anon-rol kon
-- een 'discoverable'-profiel lezen. OPGELOST: auth.uid() IS NOT NULL als
-- eerste voorwaarde.
-- ============================================================================
create policy social_profiles_lezen_conform_privacy on public.social_profiles
  for select
  using (
    auth.uid() is not null
    and (
      user_id = auth.uid()
      or (
        not public.social_is_blocked_pair(auth.uid(), social_profiles.user_id)
        and (
          visibility = 'discoverable'
          or (
            visibility = 'connections'
            and exists (
              select 1 from public.social_connections c
              where c.follower_id = auth.uid() and c.followee_id = social_profiles.user_id and c.status = 'accepted'
            )
          )
        )
      )
    )
  );

-- ============================================================================
-- Report-architectuur (privacy/safety-foundation, vereist vóór MS-F9-01-sluiting)
-- ============================================================================
create table if not exists public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('profile')),
  reason_code text not null check (reason_code in ('harassment','spam','inappropriate_content','impersonation','other')),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  constraint social_reports_no_self_report check (reporter_user_id <> target_user_id)
);
comment on table public.social_reports is
  'MS-F9-01 -- vertrouwelijke reports. target_user_id mag dit NOOIT lezen. Alleen reporter ziet eigen reports; moderatie via service_role (nog geen aparte moderator-rol -- geen nep-rol gebouwd zonder architectuur).';

alter table public.social_reports enable row level security;

create policy social_reports_reporter_aanmaken on public.social_reports
  for insert
  with check (reporter_user_id = auth.uid());

create policy social_reports_reporter_lezen_eigen on public.social_reports
  for select
  using (reporter_user_id = auth.uid());

-- Expliciet GEEN update/delete-policy voor gewone gebruikers (reports zijn
-- onveranderlijk vanuit het perspectief van de reporter). Expliciet GEEN
-- select-policy voor target_user_id.

create index if not exists idx_social_reports_target on public.social_reports(target_user_id, status);
create index if not exists idx_social_reports_reporter on public.social_reports(reporter_user_id);
