-- migratie_v507.sql
-- MS-F10-01 (Coach Consent & Permissions) -- granulaire toegangsscopes
--
-- Bouwt voort op de reeds bestaande, correcte coach_athlete_relationships
-- (RLS live geverifieerd: uitsluitend de athlete kan pending->active zetten;
-- zelf-elevation was al onmogelijk). Deze migratie voegt de ONTBREKENDE
-- granulaire scope-laag toe: een actieve relatie geeft NOOIT automatisch
-- toegang tot alles.

create table if not exists public.coach_access_scopes (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coach_athlete_relationships(id) on delete cascade,
  scope text not null check (scope in ('TRAINING_CORE','RECOVERY_HEALTH','WOMENS_PERFORMANCE')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint coach_access_scopes_unique unique (relationship_id, scope)
);
comment on table public.coach_access_scopes is
  'MS-F10-01 -- granulaire, athlete-gecontroleerde coach-toegangsscopes. Default bij activatie: TRAINING_CORE=true, RECOVERY_HEALTH=false, WOMENS_PERFORMANCE=false (server-side via trigger).';

alter table public.coach_access_scopes enable row level security;

create or replace function public.is_relationship_athlete(rel_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.coach_athlete_relationships where id = rel_id and athlete_user_id = auth.uid());
$$;

create or replace function public.is_relationship_coach(rel_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.coach_athlete_relationships where id = rel_id and coach_user_id = auth.uid());
$$;

create or replace function public.is_relationship_active(rel_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.coach_athlete_relationships where id = rel_id and status = 'active');
$$;

-- ============================================================================
-- KERN-AUTORISATIEFUNCTIE (live adversarial getest): heeft een coach, voor
-- een specifieke athlete, een ACTIEVE relatie MET de gevraagde scope AAN?
--
-- Live bevestigd: (1) coach zonder relatie -> 0 rijen, (2) self-elevation-
-- poging -> RLS-schending, (3) actieve relatie + default scopes ->
-- TRAINING_CORE zichtbaar, RECOVERY_HEALTH/WOMENS_PERFORMANCE niet,
-- (4) WOMENS_PERFORMANCE blijft geweigerd zelfs met TRAINING_CORE +
-- RECOVERY_HEALTH beide expliciet aan, (5) revoke stopt toegang
-- onmiddellijk, (6) een andere coach krijgt 0 rijen.
-- ============================================================================
create or replace function public.coach_has_scope(p_coach_id uuid, p_athlete_id uuid, p_scope text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.coach_athlete_relationships r
    join public.coach_access_scopes s on s.relationship_id = r.id
    where r.coach_user_id = p_coach_id and r.athlete_user_id = p_athlete_id
      and r.status = 'active' and s.scope = p_scope and s.enabled = true
  );
$$;

revoke all on function public.is_relationship_athlete(uuid) from public;
revoke all on function public.is_relationship_coach(uuid) from public;
revoke all on function public.is_relationship_active(uuid) from public;
revoke all on function public.coach_has_scope(uuid, uuid, text) from public;
revoke execute on function public.is_relationship_athlete(uuid) from anon;
revoke execute on function public.is_relationship_coach(uuid) from anon;
revoke execute on function public.is_relationship_active(uuid) from anon;
revoke execute on function public.coach_has_scope(uuid, uuid, text) from anon;
grant execute on function public.is_relationship_athlete(uuid) to authenticated;
grant execute on function public.is_relationship_coach(uuid) to authenticated;
grant execute on function public.is_relationship_active(uuid) to authenticated;
grant execute on function public.coach_has_scope(uuid, uuid, text) to authenticated;

-- Server-side default-scope-instelling bij activatie (nooit client-side).
create or replace function public.coach_relationship_set_default_scopes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'active' and (OLD.status is distinct from 'active') then
    insert into public.coach_access_scopes (relationship_id, scope, enabled) values
      (NEW.id, 'TRAINING_CORE', true),
      (NEW.id, 'RECOVERY_HEALTH', false),
      (NEW.id, 'WOMENS_PERFORMANCE', false)
    on conflict (relationship_id, scope) do nothing;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_coach_relationship_default_scopes on public.coach_athlete_relationships;
create trigger trg_coach_relationship_default_scopes
  after update on public.coach_athlete_relationships
  for each row execute function public.coach_relationship_set_default_scopes();

create policy coach_access_scopes_lezen on public.coach_access_scopes
  for select using (
    public.is_relationship_athlete(relationship_id) or public.is_relationship_coach(relationship_id)
  );

create policy coach_access_scopes_athlete_wijzigt on public.coach_access_scopes
  for update
  using (public.is_relationship_athlete(relationship_id))
  with check (public.is_relationship_athlete(relationship_id));

create index if not exists idx_cas_relationship on public.coach_access_scopes(relationship_id);

-- ============================================================================
-- Coach-leestoegang op athlete-datatabellen, UITSLUITEND via coach_has_scope().
-- Women's Performance staat op een APARTE scope, nooit onder TRAINING_CORE
-- of RECOVERY_HEALTH.
-- ============================================================================
create policy coach_reads_training_core_sessions on public.sessions
  for select using (public.coach_has_scope(auth.uid(), user_id, 'TRAINING_CORE'));

create policy coach_reads_recovery_health_hrv on public.hrv_log
  for select using (public.coach_has_scope(auth.uid(), user_id, 'RECOVERY_HEALTH'));

create policy coach_reads_womens_performance_cycle_periods on public.cycle_periods
  for select using (public.coach_has_scope(auth.uid(), user_id, 'WOMENS_PERFORMANCE'));

create policy coach_reads_womens_performance_symptom_logs on public.cycle_symptom_logs
  for select using (public.coach_has_scope(auth.uid(), user_id, 'WOMENS_PERFORMANCE'));

-- ============================================================================
-- CASCADE-DOCUMENTATIE-CORRECTIE: het bestaande codecommentaar in
-- netlify/functions/delete-account.js claimde dat er geen ON DELETE CASCADE-
-- relaties naar auth.users bestaan. Dit is feitelijk onjuist voor
-- coach_athlete_relationships (beide FK's hebben ON DELETE CASCADE,
-- bevestigd via pg_get_constraintdef). coach_access_scopes erft dit via een
-- tweede-niveau CASCADE. delete-account.js is aangepast om dit correct te
-- documenteren en beide tabellen alsnog expliciet te vermelden (defense-in-
-- depth, exact het bestaande race_segments-patroon).
