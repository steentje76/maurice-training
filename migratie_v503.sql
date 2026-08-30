-- migratie_v503.sql
-- MS-F9-01 (Social Identity & Privacy Foundation)
--
-- Doel: het kleinst mogelijke, veilige datamodel voor sociale identiteit,
-- connecties en blokkades. Hergebruikt de bestaande auth.users-identiteit
-- (GEEN tweede accountsysteem). Forward-only, additief.
--
-- Dit bestand bevat de FINALE, LIVE GEVERIFIEERDE versie inclusief een
-- kritieke fix die tijdens live adversarial testing werd ontdekt.

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

create policy social_connections_follower_beheer on public.social_connections
  for all
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

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

-- Expliciet GEEN select-policy voor blocked_id: de geblokkeerde partij mag
-- nooit zien dat/door wie zij geblokkeerd is.

create index if not exists idx_social_blocks_blocked on public.social_blocks(blocked_id);

-- ============================================================================
-- KRITIEKE FIX (live adversarial test tijdens deze sprint ontdekt):
--
-- Een directe EXISTS-subquery naar social_blocks vanuit de social_profiles-
-- leespolicy wordt ZELF onderworpen aan de RLS van social_blocks. Omdat de
-- geblokkeerde partij bewust GEEN select-toegang heeft tot de block-rij,
-- FAALDE de block-check onopgemerkt vanuit HAAR perspectief -- een
-- discoverable profiel van de blocker bleef zichtbaar ondanks een actieve
-- block. Live bevestigd (0 rijen verwacht, 1 rij gevonden vóór de fix).
--
-- OPGELOST met een SECURITY DEFINER-functie die de RLS van social_blocks
-- omzeilt UITSLUITEND voor deze specifieke, beperkte boolean-check.
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
grant execute on function public.social_is_blocked_pair(uuid, uuid) to authenticated;

-- Leesbeleid: uitsluitend ingelogde gebruikers, eigenaar altijd, anders
-- conform visibility EN geen actieve block in beide richtingen.
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
