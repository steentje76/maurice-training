-- migratie_v515.sql
-- MS-F11-02 (Gym Programming): hergebruikt de bestaande, canonieke F10
-- coach_program_templates/coach_program_assignments/materialize_coach_
-- assignment()-architectuur -- geen tweede workoutmodel. Een "gym-template"
-- is een coach_program_templates-rij met organization_id gezet, naast de
-- bestaande, ongewijzigde individuele coach-athlete-relatie-flow uit F10.

alter table public.coach_program_templates add column if not exists organization_id text references public.organizations(id) on delete cascade;
alter table public.coach_program_assignments add column if not exists organization_id text references public.organizations(id) on delete cascade;

create policy cpt_org_staff_beheert on public.coach_program_templates
  for all
  using (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff']))
  with check (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff']));

create policy cpt_org_member_leest on public.coach_program_templates
  for select
  using (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff','member']));

-- KRITIEKE, LIVE GECORRIGEERDE FOUT: de eerste policy-poging controleerde
-- per ongeluk tweemaal de aanroeper (org_has_role gebruikt intern
-- auth.uid()), niet of de athlete daadwerkelijk lid is. Gecorrigeerd met
-- een nieuwe functie die een specifieke gebruiker controleert.
create or replace function public.org_user_has_role(p_org_id text, p_user_id uuid, p_roles text[])
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.organizations o where o.id = p_org_id and o.owner_user_id = p_user_id
  ) or exists (
    select 1 from public.memberships m
    where m.organization_id = p_org_id and m.user_id = p_user_id and m.status = 'active' and m.role = any(p_roles)
  );
$$;
revoke all on function public.org_user_has_role(text, uuid, text[]) from public;
revoke execute on function public.org_user_has_role(text, uuid, text[]) from anon;
grant execute on function public.org_user_has_role(text, uuid, text[]) to authenticated;

create policy cpa_org_staff_wijst_toe on public.coach_program_assignments
  for insert
  with check (
    organization_id is not null
    and public.org_has_role(organization_id, array['owner','admin','staff'])
    and public.org_user_has_role(organization_id, athlete_user_id, array['owner','admin','staff','member'])
  );

-- materialize_coach_assignment() uitgebreid om gym-template-assignments te
-- ondersteunen. Zelfde, canonieke RPC -- geen tweede materialisatiefunctie.
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
  v_new_training_id text;
  v_day jsonb;
  v_exercise jsonb;
  v_week_nr int;
  v_day_offset int;
  v_unknown_count int;
begin
  select * into v_assignment from public.coach_program_assignments where id = p_assignment_id;
  if v_assignment is null then
    raise exception 'assignment niet gevonden';
  end if;
  if v_assignment.athlete_user_id <> auth.uid() then
    raise exception 'uitsluitend de athlete van deze assignment mag materialiseren';
  end if;

  if v_assignment.organization_id is not null then
    if not public.org_user_has_role(v_assignment.organization_id, v_assignment.athlete_user_id, array['owner','admin','staff','member']) then
      raise exception 'athlete is geen lid van de organisatie behorend bij deze assignment';
    end if;
  else
    if not public.coach_has_scope(v_assignment.coach_user_id, v_assignment.athlete_user_id, 'TRAINING_CORE') then
      raise exception 'geen actieve, toegestane coach-relatie voor deze assignment';
    end if;
  end if;

  if v_assignment.materialized_program_id is not null then
    return v_assignment.materialized_program_id;
  end if;

  select * into v_template from public.coach_program_templates where id = v_assignment.template_id;
  if v_template is null then
    raise exception 'template niet gevonden';
  end if;

  if (v_template.content->>'schema_version')::int is distinct from 1 then
    raise exception 'ongeldige of ontbrekende schema_version';
  end if;
  if v_template.content->'days' is null or jsonb_array_length(v_template.content->'days') < 1 then
    raise exception 'template bevat geen dagen';
  end if;

  select count(*) into v_unknown_count
  from jsonb_array_elements(v_template.content->'days') d,
       jsonb_array_elements(d->'exercises') e
  where not exists (select 1 from public.exercises ex where ex.id = e->>'exercise_id');
  if v_unknown_count > 0 then
    raise exception 'template bevat % onbekende exercise_id(s)', v_unknown_count;
  end if;

  insert into public.programs (naam, sport, status)
  values (v_template.title, v_template.sport, 'concept')
  returning id into v_new_program_id;

  for v_day in select * from jsonb_array_elements(v_template.content->'days')
  loop
    v_week_nr := (v_day->>'week_nr')::int;
    v_day_offset := (v_day->>'day_offset')::int;

    insert into public.custom_trainings (id, naam, source)
    values (gen_random_uuid()::text, v_day->>'training_name', 'coach_assignment')
    returning id into v_new_training_id;

    for v_exercise in select * from jsonb_array_elements(v_day->'exercises')
    loop
      insert into public.training_exercises (id, exercise_id, training_ref, sets, reps, rpe)
      values (
        gen_random_uuid()::text,
        v_exercise->>'exercise_id',
        v_new_training_id,
        (v_exercise->>'sets')::int,
        v_exercise->>'reps',
        v_exercise->>'rpe'
      );
    end loop;

    insert into public.program_blocks (program_id, week_nr, training_ref, planned_date)
    values (v_new_program_id, v_week_nr, v_new_training_id, current_date + v_day_offset);
  end loop;

  update public.coach_program_assignments
    set materialized_program_id = v_new_program_id, status = 'accepted', accepted_at = now(),
        revision_at_assignment = v_template.revision
    where id = p_assignment_id;

  return v_new_program_id;
end;
$$;

-- LIVE ADVERSARIAL VERIFICATIE (transacties zonder commit, geen permanente
-- wijziging):
-- 1. Owner maakt gym-template, wijst toe aan een lid, lid materialiseert --
--    slaagt, programs.user_id = het lid zelf.
-- 2. Owner probeert toe te wijzen aan een NIET-lid -> RLS-schending.
-- 3. Een gewoon lid probeert toe te wijzen aan een ander lid -> RLS-schending.
-- 4. Na verwijdering uit de organisatie blijft het reeds gematerialiseerde
--    programma bestaan voor de athlete.
