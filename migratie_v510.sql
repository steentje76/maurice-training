-- migratie_v510.sql
-- MS-F10-03 vervolg: volledige content-materialisatie (coach-template-
-- inhoud -> canonieke program_blocks/custom_trainings/training_exercises).
--
-- Vervangt de materialize_coach_assignment()-functie uit migratie_v509.sql
-- (die uitsluitend een leeg programs-record aanmaakte) door een volledige,
-- atomische materialisatie van de daadwerkelijke trainingsinhoud.
--
-- CONTENT-SCHEMA (v1), opgeslagen in coach_program_templates.content:
-- {
--   "schema_version": 1,
--   "days": [
--     { "week_nr": 1, "day_offset": 0, "training_name": "Squat Dag",
--       "exercises": [ { "exercise_id": "power_clean", "sets": 5, "reps": "5", "rpe": "8" } ] }
--   ]
-- }
--
-- CANONIEKE KETEN (bevestigd via audit van de bestaande, ongewijzigde
-- database-structuur, geen nieuwe tabellen nodig):
--   programs (1) -> program_blocks (N, training_ref -> custom_trainings.id)
--   custom_trainings (1) -> training_exercises (N, exercise_id = canoniek)
-- Alle drie child-tabellen hebben ELK hun EIGEN trg_set_user_id-trigger --
-- ownership wordt automatisch, correct afgedwongen voor alle child-records
-- zodra de materialisatie onder de sessie van de athlete zelf plaatsvindt.
-- Geen enkele wijziging aan deze bestaande triggers.
--
-- ATOMICITEIT: PL/pgSQL-functies zijn transactioneel -- een exception
-- ergens in dit blok annuleert alle voorgaande INSERT/UPDATE-statements
-- binnen deze ene functie-aanroep. Live adversarial bevestigd.
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

-- ============================================================================
-- LIVE ADVERSARIAL VERIFICATIE (transacties zonder commit, geen permanente
-- wijziging):
-- 1. Volledige flow -> alle vier eigenaarschapskolommen bevestigd correct
--    op de athlete, via directe query met alle vier JOINs.
-- 2. Onbekend exercise_id -> materialisatie geweigerd, 0 rijen aangemaakt.
-- 3. Midden-in-het-proces-fout (geldige dag 1, kapotte dag 2) -> 0 rijen
--    achtergebleven, volledige atomiciteit.
-- 4. Idempotentie: tweemaal aanroepen geeft 1 custom_trainings-rij, geen
--    duplicaat van de VOLLEDIGE content.
-- ============================================================================
