-- migratie_v504.sql
-- MS-F9-02 (Clubs, Groups & Challenges -- Groups-gedeelte)
--
-- Athlete-created sociale groepen. Expliciet GEEN hergebruik van de
-- bestaande commerciële organizations/teams/memberships-architectuur
-- (F1/F11) -- dat is een ander vertrouwensmodel (billing/staff-permissies).

create table if not exists public.social_groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  join_mode text not null default 'open' check (join_mode in ('open','approval_required','invite_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.social_groups is
  'MS-F9-02 -- athlete-created sociale groepen. GEEN hergebruik van organizations/teams.';

alter table public.social_groups enable row level security;

create table if not exists public.social_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.social_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  status text not null default 'active' check (status in ('active','pending','removed')),
  created_at timestamptz not null default now(),
  constraint social_group_memberships_unique unique (group_id, user_id)
);
comment on table public.social_group_memberships is
  'MS-F9-02 -- lidmaatschap. role kan UITSLUITEND door de owner gewijzigd worden, nooit door het lid zelf.';

alter table public.social_group_memberships enable row level security;

-- SECURITY DEFINER-helpers (analoog aan het MS-F9-01-patroon: voorkomen dat
-- een RLS-subquery naar deze tabel vanuit een ANDERE tabel se policy zelf
-- weer onderworpen wordt aan de RLS van deze tabel).
create or replace function public.social_is_group_member(u uuid, g uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.social_group_memberships where user_id=u and group_id=g and status='active');
$$;

create or replace function public.social_is_group_owner(u uuid, g uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.social_group_memberships where user_id=u and group_id=g and status='active' and role='owner');
$$;

revoke all on function public.social_is_group_member(uuid, uuid) from public;
revoke all on function public.social_is_group_owner(uuid, uuid) from public;
revoke execute on function public.social_is_group_member(uuid, uuid) from anon;
revoke execute on function public.social_is_group_owner(uuid, uuid) from anon;
grant execute on function public.social_is_group_member(uuid, uuid) to authenticated;
grant execute on function public.social_is_group_owner(uuid, uuid) to authenticated;

create policy social_groups_lezen on public.social_groups
  for select using (
    auth.uid() is not null
    and (join_mode = 'open' or public.social_is_group_member(auth.uid(), id))
  );
create policy social_groups_owner_schrijft on public.social_groups
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy social_groups_aanmaken on public.social_groups
  for insert with check (owner_user_id = auth.uid());
create policy social_groups_owner_verwijdert on public.social_groups
  for delete using (owner_user_id = auth.uid());

-- ============================================================================
-- KRITIEKE GARANTIE (live adversarial getest, lering uit MS-F9-01): een lid
-- mag zichzelf NOOIT promoveren. INSERT door het lid zelf is uitsluitend
-- toegestaan met role='member' (nooit 'owner'). UPDATE (rolwijziging van
-- ANDEREN) is uitsluitend voor de owner, via de SECURITY DEFINER-check.
-- Live bevestigd: een lid dat zichzelf naar 'owner' probeerde te updaten,
-- bleef 'member' (RLS weigerde de mutatie stilzwijgend).
-- ============================================================================
create policy social_group_memberships_zelf_joinen on public.social_group_memberships
  for insert
  with check (user_id = auth.uid() and role = 'member');

create policy social_group_memberships_zelf_verlaten on public.social_group_memberships
  for delete
  using (user_id = auth.uid());

create policy social_group_memberships_owner_beheert on public.social_group_memberships
  for update
  using (public.social_is_group_owner(auth.uid(), group_id))
  with check (public.social_is_group_owner(auth.uid(), group_id));

create policy social_group_memberships_lezen on public.social_group_memberships
  for select
  using (
    auth.uid() is not null
    and (user_id = auth.uid() or public.social_is_group_member(auth.uid(), group_id))
  );

create index if not exists idx_sgm_group on public.social_group_memberships(group_id, status);
create index if not exists idx_sgm_user on public.social_group_memberships(user_id);
