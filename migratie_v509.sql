-- migratie_v509.sql
-- MS-F10-03 (Coach Programming & Assignment) -- HERZIENE, VEILIGE ARCHITECTUUR
--
-- Vervolg op de in migratie_v508.sql gedocumenteerde, gecorrigeerde blokkade
-- (GAP-P2-023). Product Owner-architectuurbeslissing: behoud de bestaande
-- trg_set_user_id/set_user_id_from_auth()-invariant volledig intact.
--
-- Drie gescheiden verantwoordelijkheden:
--   A. coach_program_templates -- coach-authored, coach-owned
--   B. coach_program_assignments -- coach X stelt template Y beschikbaar
--      aan athlete Z
--   C. public.programs -- athlete-owned executable programma (ongewijzigd,
--      trigger blijft intact), gematerialiseerd via een smalle,
--      athlete-geïnitieerde RPC

create table if not exists public.coach_program_templates (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  sport text,
  content jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.coach_program_templates is
  'MS-F10-03 -- coach-owned programma-ontwerp. content verwijst naar bestaande canonieke exercise-IDs. Nooit rechtstreeks athlete-owned.';

alter table public.coach_program_templates enable row level security;

create policy cpt_coach_beheert_eigen on public.coach_program_templates
  for all using (coach_user_id = auth.uid()) with check (coach_user_id = auth.uid());

alter table public.coach_program_assignments alter column program_id drop not null;
alter table public.coach_program_assignments drop constraint if exists cpa_unique_program;
alter table public.coach_program_assignments add column if not exists template_id uuid references public.coach_program_templates(id) on delete cascade;
alter table public.coach_program_assignments add column if not exists materialized_program_id bigint references public.programs(id) on delete set null;
alter table public.coach_program_assignments add column if not exists revision_at_assignment integer;
alter table public.coach_program_assignments add constraint cpa_unique_template_per_athlete unique (template_id, athlete_user_id);

create policy cpt_athlete_leest_via_assignment on public.coach_program_templates
  for select using (
    exists (
      select 1 from public.coach_program_assignments a
      where a.template_id = coach_program_templates.id and a.athlete_user_id = auth.uid()
    )
  );

-- ============================================================================
-- MATERIALISATIE-RPC (SECURITY DEFINER, MINIMAAL, NAUW SCOPE) -- LIVE
-- ADVERSARIAAL GETEST (transacties zonder commit, geen permanente wijziging):
-- 1. Volledige flow: coach maakt template, wijst toe, athlete materialiseert
--    -> nieuw programs-record met user_id=athlete (trg_set_user_id deed zijn
--    normale werk, GEEN bypass nodig).
-- 2. Coach probeert ZELF te materialiseren -> expliciete fout.
-- 3. Idempotentie: tweemaal aanroepen geeft hetzelfde program_id, 1 rij.
-- 4. Derde partij kan de assignment niet eens ophalen (RLS blokkeert al).
--
-- GEEN generieke "insert namens elke user"-functie. Geen vrije payload --
-- uitsluitend title/sport uit de template worden gekopieerd.
-- ============================================================================
create or replace function public.materialize_coach_assignment(p_assignment_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_template record;
  v_new_program_id bigint;
begin
  select * into v_assignment from public.coach_program_assignments where id = p_assignment_id;
  if v_assignment is null then
    raise exception 'assignment niet gevonden';
  end if;
  if v_assignment.athlete_user_id <> auth.uid() then
    raise exception 'uitsluitend de athlete van deze assignment mag materialiseren';
  end if;
  if not public.coach_has_scope(v_assignment.coach_user_id, v_assignment.athlete_user_id, 'TRAINING_CORE') then
    raise exception 'geen actieve, toegestane coach-relatie voor deze assignment';
  end if;
  if v_assignment.materialized_program_id is not null then
    return v_assignment.materialized_program_id;
  end if;

  select * into v_template from public.coach_program_templates where id = v_assignment.template_id;
  if v_template is null then
    raise exception 'template niet gevonden';
  end if;

  insert into public.programs (naam, sport, status)
  values (v_template.title, v_template.sport, 'concept')
  returning id into v_new_program_id;

  update public.coach_program_assignments
    set materialized_program_id = v_new_program_id, status = 'accepted', accepted_at = now()
    where id = p_assignment_id;

  return v_new_program_id;
end;
$$;

revoke all on function public.materialize_coach_assignment(uuid) from public;
revoke execute on function public.materialize_coach_assignment(uuid) from anon;
grant execute on function public.materialize_coach_assignment(uuid) to authenticated;
