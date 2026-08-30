-- migratie_v512.sql
-- MS-F11-01 (Organization & Location Core)
--
-- Bouwt voort op het bestaande GYM-RLS-SCOPING-001-fundament (MS-F1-01):
-- organizations/memberships/teams/training_groups/seasons/macrocycles/
-- mesocycles/microcycles bestonden al met correcte, membership-gescoopte
-- SELECT-policies. Dit bestand voegt het ONTBREKENDE schrijf-fundament toe
-- (INSERT/UPDATE/DELETE) en een nieuwe locations-tabel. Geen tweede
-- autorisatiesysteem -- hergebruikt uitsluitend de bestaande, nu ook
-- self-elevation-veilige memberships-tabel (zie migratie_v511.sql).
--
-- LET OP: dit is EXPLICIET NIET hetzelfde model als het legacy gyms/
-- users.gym_id-systeem (netlify/functions/gym-team.js). Zie
-- docs/F11_EXISTING_ORGANIZATION_ARCHITECTURE_AUDIT.md. Beide modellen
-- blijven bewust gescheiden in deze sprint.

create policy organizations_insert_as_owner on public.organizations
  for insert with check (owner_user_id = auth.uid());
create policy organizations_owner_update on public.organizations
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy organizations_owner_delete on public.organizations
  for delete using (owner_user_id = auth.uid());

-- KERN-AUTORISATIEFUNCTIE (analoog aan het F10 coach_has_scope()-patroon):
-- heeft een gebruiker, binnen een specifieke organisatie, een van de
-- opgegeven rollen? De organization-owner heeft ALTIJD alle rollen.
create or replace function public.org_has_role(p_org_id text, p_roles text[])
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.organizations o where o.id = p_org_id and o.owner_user_id = auth.uid()
  ) or exists (
    select 1 from public.memberships m
    where m.organization_id = p_org_id and m.user_id = auth.uid() and m.status = 'active' and m.role = any(p_roles)
  );
$$;
revoke all on function public.org_has_role(text, text[]) from public;
revoke execute on function public.org_has_role(text, text[]) from anon;
grant execute on function public.org_has_role(text, text[]) to authenticated;

create policy teams_manage_staff on public.teams
  for all
  using (public.org_has_role(organization_id, array['owner','admin','staff']))
  with check (public.org_has_role(organization_id, array['owner','admin','staff']));

create policy training_groups_manage_staff on public.training_groups
  for all
  using (exists (select 1 from public.teams t where t.id = training_groups.team_id and public.org_has_role(t.organization_id, array['owner','admin','staff'])))
  with check (exists (select 1 from public.teams t where t.id = training_groups.team_id and public.org_has_role(t.organization_id, array['owner','admin','staff'])));

-- KRITIEKE AANVULLING (gevonden tijdens live adversarial testen): zonder
-- een aparte policy kan NIEMAND ooit een ander lid promoveren naar
-- 'admin'/'staff'. Deze policy staat UITSLUITEND de organization-owner toe
-- om ANDERE leden (nooit de eigen rij) te beheren.
create policy memberships_owner_manages_others on public.memberships
  for update
  using (
    user_id <> auth.uid()
    and exists (select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = auth.uid())
  )
  with check (
    user_id <> auth.uid()
    and exists (select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = auth.uid())
  );

-- Staff/admin/owner moeten ALLE memberships van de eigen organisatie kunnen
-- lezen (nodig voor een ledenlijst) -- de bestaande memberships_select_own
-- liet uitsluitend de eigen rij zien.
create policy memberships_select_org_staff on public.memberships
  for select
  using (public.org_has_role(organization_id, array['owner','admin','staff']));

-- Locations: nieuw, ontbrak volledig. Behoort tot exact één organization.
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  timezone text,
  created_at timestamptz not null default now()
);
comment on table public.locations is
  'MS-F11-01 -- een organization kan 0..N locaties hebben.';

alter table public.locations enable row level security;

create policy locations_select_member on public.locations
  for select using (public.org_has_role(organization_id, array['owner','admin','staff','member']));
create policy locations_manage_staff on public.locations
  for all
  using (public.org_has_role(organization_id, array['owner','admin','staff']))
  with check (public.org_has_role(organization_id, array['owner','admin','staff']));

create index if not exists idx_locations_org on public.locations(organization_id);

-- ============================================================================
-- LIVE ADVERSARIAL VERIFICATIE (transacties zonder commit, geen permanente
-- wijziging):
-- 1. Een gewoon 'member' kan GEEN team aanmaken -> RLS-schending.
-- 2. De organization-owner kan een ander lid promoveren naar 'staff' ->
--    slaagt correct.
-- 3. Het gepromoveerde staff-lid kan daarna WEL een team aanmaken ->
--    slaagt correct.
-- 4. Cross-tenant: geen membership -> geen team-aanmaak mogelijk -> RLS-
--    schending.
-- ============================================================================
