-- DEC-EXLINK-005 — fase 3b: historie van de eigenaar naar het MoveKit-id, per portie.
--
-- Vooraf (in dezelfde transactie): eigenaar zetten en de portie vullen, bv. portie1.sql:
--   begin;
--   select set_config('tk.exlink_owner', '<uuid eigenaar>', true);
--   \i portie1.sql        -- vult _p3_map (exercise_id, catalog_id)
--   \i apply-portie.sql   -- dit bestand
--   commit;               -- proefrun: rollback;
--
-- Per koppeling E (eigen oefening) → C (MoveKit-catalogus-id TK-) → F (MoveKit-id TKC-):
--   sessies van de eigenaar E → F; doelen samengevoegd in F (hoogste waarde per veld); rusttijd E → F;
--   programma-/trainingsregels, racesegmenten, doelen (goals), favorieten, uitrusting, ratio-anker en snapshots
--   E → C (alleen als E ≠ C; zo nodig een inactieve FK-rij voor C); eigen persoonlijke rij E inactief;
--   koppeling migrated_at = now(). Race-oefeningen (HYROX/triathlon) worden geweigerd.
-- Alleen rijen van de eigenaar. Gedeelde (globale) rijen blijven ongemoeid. Herhaalbaar: een tweede run
-- verplaatst alleen achterblijvers (bv. een sessie die later uit de offline-wachtrij op E binnenkwam).
-- Terugdraaien: reverse-portie.sql met dezelfde _p3_map.

create temp table if not exists _p3_report (ord int, k text, v text) on commit drop;

-- JSON-verwijzingen E → C (alleen E ≠ C); zelfde regel als fase 1: sleutels exercise_id en id, en de lijst skipped.
create or replace function pg_temp.p3_map1(v jsonb) returns jsonb language sql stable as $f$
  select case when jsonb_typeof(v) = 'string'
    then coalesce((select to_jsonb(m.catalog_id) from _p3_map m where m.exercise_id <> m.catalog_id and m.exercise_id = (v #>> '{}')), v)
    else v end
$f$;
create or replace function pg_temp.p3_rw(j jsonb) returns jsonb language sql stable as $f$
  select case jsonb_typeof(j)
    when 'object' then coalesce((select jsonb_object_agg(e.k,
        case when e.k in ('exercise_id', 'id') then pg_temp.p3_map1(e.v)
             when e.k = 'skipped' and jsonb_typeof(e.v) = 'array'
               then coalesce((select jsonb_agg(pg_temp.p3_map1(a.v) order by a.o) from jsonb_array_elements(e.v) with ordinality as a(v, o)), '[]'::jsonb)
             else pg_temp.p3_rw(e.v) end) from jsonb_each(j) as e(k, v)), '{}'::jsonb)
    when 'array' then coalesce((select jsonb_agg(pg_temp.p3_rw(a.v) order by a.o) from jsonb_array_elements(j) with ordinality as a(v, o)), '[]'::jsonb)
    else j end
$f$;
-- training_context.avoid_exercises is een lijst van id-strings (geen objecten).
create or replace function pg_temp.p3_rw_list(j jsonb) returns jsonb language sql stable as $f$
  select case when jsonb_typeof(j) = 'array'
    then coalesce((select jsonb_agg(pg_temp.p3_map1(a.v) order by a.o) from jsonb_array_elements(j) with ordinality as a(v, o)), '[]'::jsonb)
    else pg_temp.p3_rw(j) end
$f$;
create or replace function pg_temp.p3_hit1(v jsonb) returns bigint language sql stable as $f$
  select case when jsonb_typeof(v) = 'string'
    then (select count(*) from _p3_map m where m.exercise_id <> m.catalog_id and m.exercise_id = (v #>> '{}'))
    else 0::bigint end
$f$;
create or replace function pg_temp.p3_hits(j jsonb) returns bigint language sql stable as $f$
  select case jsonb_typeof(j)
    when 'object' then coalesce((select sum(
        case when e.k in ('exercise_id', 'id') then pg_temp.p3_hit1(e.v)
             when e.k = 'skipped' and jsonb_typeof(e.v) = 'array'
               then coalesce((select sum(pg_temp.p3_hit1(a.v)) from jsonb_array_elements(e.v) as a(v)), 0)
             else pg_temp.p3_hits(e.v) end) from jsonb_each(j) as e(k, v)), 0)::bigint
    when 'array' then coalesce((select sum(pg_temp.p3_hits(a.v)) from jsonb_array_elements(j) as a(v)), 0)::bigint
    else 0::bigint end
$f$;
create or replace function pg_temp.p3_hits_list(j jsonb) returns bigint language sql stable as $f$
  select case when jsonb_typeof(j) = 'array'
    then coalesce((select sum(pg_temp.p3_hit1(a.v)) from jsonb_array_elements(j) as a(v)), 0)::bigint
    else pg_temp.p3_hits(j) end
$f$;

do $p3$
declare
  v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid;
  v_n bigint; v_m bigint; r record;
begin
  if v_owner is null then raise exception 'P3: tk.exlink_owner ontbreekt'; end if;
  if to_regclass('pg_temp._p3_map') is null then raise exception 'P3: _p3_map ontbreekt'; end if;
  alter table _p3_map add column if not exists fk_id text;
  update _p3_map set fk_id = 'TKC-' || substring(catalog_id from 4);

  -- ── 1. Voorwaarden ─────────────────────────────────────────────────────────
  if exists (select 1 from _p3_map where catalog_id !~ '^TK-[0-9]{6}$' or substring(catalog_id from 4)::int not between 1 and 582) then
    raise exception 'P3: ongeldig catalogus-id in de portie'; end if;
  select count(*) into v_n from _p3_map m join public.exercise_catalog_links l
      on l.user_id = v_owner and l.exercise_id = m.exercise_id and l.catalog_id = m.catalog_id
     and l.merged_into is null and not l.hidden;
  if v_n <> (select count(*) from _p3_map) then raise exception 'P3: portie bevat een id zonder zichtbare koppeling van de eigenaar'; end if;
  select count(*) into v_n from _p3_map m join public.movekit_catalog_fk_bindings b
      on b.catalog_id = m.catalog_id and b.exercise_id = m.fk_id and b.active and b.reviewed_at is not null
    join public.exercises e on e.id = m.fk_id;
  if v_n <> (select count(*) from _p3_map) then raise exception 'P3: MoveKit-id niet vrijgegeven of ontbreekt'; end if;

  -- Racedefinities (HYROX/triathlon) houden hun eigen id: die horen nooit in een portie.
  if exists (select 1 from _p3_map where exercise_id ~ '^(hyrox|triathlon)_') then raise exception 'P3: race-oefening in de portie'; end if;

  -- ── 2. Uitgangssituatie ────────────────────────────────────────────────────
  create temp table _p3_pre (k text primary key, v numeric) on commit drop;
  insert into _p3_pre select 'own:sessions', count(*) from public.sessions where user_id = v_owner;
  insert into _p3_pre select 'foreign:sessions', count(*) from public.sessions s join _p3_map m on s.exercise_id in (m.exercise_id, m.fk_id)
    where s.user_id is distinct from v_owner;
  for r in select * from _p3_map loop
    insert into _p3_pre select 'n:' || r.fk_id, count(*) from public.sessions s
      where s.user_id = v_owner and s.exercise_id in (r.exercise_id, r.fk_id);
    insert into _p3_pre select 'sum:' || r.fk_id,
      coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0) * coalesce(s.sets, 1) + coalesce(s.distance, 0) + coalesce(s.duration_s, 0)), 0)
      from public.sessions s where s.user_id = v_owner and s.exercise_id in (r.exercise_id, r.fk_id);
  end loop;
  insert into _p3_pre select 'foreign:exercises_active', count(*) from public.exercises e join _p3_map m on m.exercise_id = e.id
    where e.active and not (e.scope = 'personal' and e.created_by = v_owner);
  insert into _p3_pre select 'foreign:exercise_goals', count(*) from public.exercise_goals g join _p3_map m on g.exercise_id in (m.exercise_id, m.catalog_id, m.fk_id)
    where g.user_id is distinct from v_owner;

  -- Doelen: hoogste waarde per veld over E, C en F (1RM-datum van de rij met de hoogste 1RM).
  create temp table _p3_goal on commit drop as
    select m.fk_id as target,
           max(g.pr) as pr, max(g.one_rm) as one_rm, max(g.peak_goal) as peak_goal,
           (array_agg(g.updated_at order by g.one_rm desc nulls last))[1] as one_rm_at
      from _p3_map m join public.exercise_goals g on g.user_id = v_owner and g.exercise_id in (m.exercise_id, m.catalog_id, m.fk_id)
     group by m.fk_id;

  -- ── 3. Back-up (alleen beheer; geen client-toegang) ────────────────────────
  create table if not exists public.bak_tkx3_sessions (like public.sessions);
  create table if not exists public.bak_tkx3_exercise_goals (like public.exercise_goals);
  create table if not exists public.bak_tkx3_exercises (like public.exercises);
  create table if not exists public.bak_tkx3_exercise_catalog_links (like public.exercise_catalog_links);
  create table if not exists public.bak_tkx3_exercise_rest_settings (like public.exercise_rest_settings);
  create table if not exists public.bak_tkx3_exercise_equipment (like public.exercise_equipment);
  create table if not exists public.bak_tkx3_exercise_favorites (like public.exercise_favorites);
  create table if not exists public.bak_tkx3_program_block_exercises (like public.program_block_exercises);
  create table if not exists public.bak_tkx3_training_exercises (like public.training_exercises);
  create table if not exists public.bak_tkx3_custom_training_exercises (like public.custom_training_exercises);
  create table if not exists public.bak_tkx3_race_segments (like public.race_segments);
  create table if not exists public.bak_tkx3_goals (like public.goals);
  create table if not exists public.bak_tkx3_training_instances (like public.training_instances);
  create table if not exists public.bak_tkx3_planned_training_occurrences (like public.planned_training_occurrences);
  create table if not exists public.bak_tkx3_program_regeneration_log (like public.program_regeneration_log);
  create table if not exists public.bak_tkx3_custom_trainings (like public.custom_trainings);
  create table if not exists public.bak_tkx3_training_context (like public.training_context);
  alter table public.bak_tkx3_race_segments enable row level security;
  alter table public.bak_tkx3_goals enable row level security;
  alter table public.bak_tkx3_training_instances enable row level security;
  alter table public.bak_tkx3_planned_training_occurrences enable row level security;
  alter table public.bak_tkx3_program_regeneration_log enable row level security;
  alter table public.bak_tkx3_custom_trainings enable row level security;
  alter table public.bak_tkx3_training_context enable row level security;
  revoke all on public.bak_tkx3_race_segments, public.bak_tkx3_goals, public.bak_tkx3_training_instances,
    public.bak_tkx3_planned_training_occurrences, public.bak_tkx3_program_regeneration_log, public.bak_tkx3_custom_trainings,
    public.bak_tkx3_training_context from public, anon, authenticated;
  alter table public.bak_tkx3_sessions enable row level security;
  alter table public.bak_tkx3_exercise_goals enable row level security;
  alter table public.bak_tkx3_exercises enable row level security;
  alter table public.bak_tkx3_exercise_catalog_links enable row level security;
  alter table public.bak_tkx3_exercise_rest_settings enable row level security;
  alter table public.bak_tkx3_exercise_equipment enable row level security;
  alter table public.bak_tkx3_exercise_favorites enable row level security;
  alter table public.bak_tkx3_program_block_exercises enable row level security;
  alter table public.bak_tkx3_training_exercises enable row level security;
  alter table public.bak_tkx3_custom_training_exercises enable row level security;
  revoke all on public.bak_tkx3_sessions, public.bak_tkx3_exercise_goals, public.bak_tkx3_exercises,
    public.bak_tkx3_exercise_catalog_links, public.bak_tkx3_exercise_rest_settings, public.bak_tkx3_exercise_equipment,
    public.bak_tkx3_exercise_favorites, public.bak_tkx3_program_block_exercises, public.bak_tkx3_training_exercises,
    public.bak_tkx3_custom_training_exercises from public, anon, authenticated;

  insert into public.bak_tkx3_sessions select s.* from public.sessions s join _p3_map m on m.exercise_id = s.exercise_id
    where s.user_id = v_owner and not exists (select 1 from public.bak_tkx3_sessions b where b.id = s.id);
  insert into public.bak_tkx3_exercise_goals select g.* from public.exercise_goals g join _p3_map m on g.exercise_id in (m.exercise_id, m.catalog_id, m.fk_id)
    where g.user_id = v_owner and not exists (select 1 from public.bak_tkx3_exercise_goals b where b.id = g.id);
  insert into public.bak_tkx3_exercises select e.* from public.exercises e join _p3_map m on e.id in (m.exercise_id, m.catalog_id)
    where not exists (select 1 from public.bak_tkx3_exercises b where b.id = e.id);
  insert into public.bak_tkx3_exercise_catalog_links select l.* from public.exercise_catalog_links l join _p3_map m on m.exercise_id = l.exercise_id
    where l.user_id = v_owner and not exists (select 1 from public.bak_tkx3_exercise_catalog_links b where b.user_id = l.user_id and b.exercise_id = l.exercise_id);
  insert into public.bak_tkx3_exercise_rest_settings select t.* from public.exercise_rest_settings t join _p3_map m on t.exercise_id in (m.exercise_id, m.fk_id)
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx3_exercise_rest_settings b where b.user_id = t.user_id and b.exercise_id = t.exercise_id);
  insert into public.bak_tkx3_exercise_equipment select t.* from public.exercise_equipment t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx3_exercise_equipment b where b.id = t.id);
  insert into public.bak_tkx3_exercise_favorites select t.* from public.exercise_favorites t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx3_exercise_favorites b where b.user_id = t.user_id and b.exercise_id = t.exercise_id);
  insert into public.bak_tkx3_program_block_exercises select t.* from public.program_block_exercises t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx3_program_block_exercises b where b.id = t.id);
  insert into public.bak_tkx3_training_exercises select t.* from public.training_exercises t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx3_training_exercises b where b.id = t.id);
  insert into public.bak_tkx3_custom_training_exercises select t.* from public.custom_training_exercises t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx3_custom_training_exercises b where b.id = t.id);

  insert into public.bak_tkx3_race_segments select t.* from public.race_segments t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx3_race_segments b where b.id = t.id);
  insert into public.bak_tkx3_goals select t.* from public.goals t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx3_goals b where b.id = t.id);
  insert into public.bak_tkx3_training_instances select t.* from public.training_instances t
    where t.user_id = v_owner and t.snapshot is not null and pg_temp.p3_hits(t.snapshot) > 0 and not exists (select 1 from public.bak_tkx3_training_instances b where b.id = t.id);
  insert into public.bak_tkx3_planned_training_occurrences select t.* from public.planned_training_occurrences t
    where t.creator_user_id = v_owner and t.definition_snapshot is not null and pg_temp.p3_hits(t.definition_snapshot) > 0 and not exists (select 1 from public.bak_tkx3_planned_training_occurrences b where b.id = t.id);
  insert into public.bak_tkx3_program_regeneration_log select t.* from public.program_regeneration_log t
    where t.user_id = v_owner and t.replaced_blocks_snapshot is not null and pg_temp.p3_hits(t.replaced_blocks_snapshot) > 0 and not exists (select 1 from public.bak_tkx3_program_regeneration_log b where b.id = t.id);
  insert into public.bak_tkx3_custom_trainings select t.* from public.custom_trainings t
    where t.user_id = v_owner and t.metadata is not null and pg_temp.p3_hits(t.metadata) > 0 and not exists (select 1 from public.bak_tkx3_custom_trainings b where b.id = t.id);
  insert into public.bak_tkx3_training_context select t.* from public.training_context t
    where t.user_id = v_owner and t.avoid_exercises is not null and pg_temp.p3_hits_list(t.avoid_exercises) > 0 and not exists (select 1 from public.bak_tkx3_training_context b where b.user_id = t.user_id);
  insert into public.bak_tkx3_exercises select e.* from public.exercises e join _p3_map m on e.ratio_anchor = m.exercise_id and m.exercise_id <> m.catalog_id
    where e.scope = 'personal' and e.created_by = v_owner and not exists (select 1 from public.bak_tkx3_exercises b where b.id = e.id);

  -- ── 4. Sessies naar het MoveKit-id ─────────────────────────────────────────
  update public.sessions s set exercise_id = m.fk_id from _p3_map m
   where s.exercise_id = m.exercise_id and s.user_id = v_owner;

  -- ── 5. Doelen samenvoegen in F ─────────────────────────────────────────────
  for r in select * from _p3_goal loop
    if exists (select 1 from public.exercise_goals where user_id = v_owner and exercise_id = r.target) then
      update public.exercise_goals set pr = r.pr, one_rm = r.one_rm, peak_goal = r.peak_goal,
             updated_at = case when r.one_rm is not null then coalesce(r.one_rm_at, updated_at) else updated_at end
       where user_id = v_owner and exercise_id = r.target;
    else
      insert into public.exercise_goals (user_id, exercise_id, pr, one_rm, peak_goal, updated_at)
      values (v_owner, r.target, r.pr, r.one_rm, r.peak_goal, coalesce(r.one_rm_at, now()));
    end if;
  end loop;
  delete from public.exercise_goals g using _p3_map m
   where g.user_id = v_owner and g.exercise_id in (m.exercise_id, m.catalog_id) and g.exercise_id <> m.fk_id;

  -- ── 6. Rusttijd naar F (een bestaande F-waarde gaat voor) ──────────────────
  delete from public.exercise_rest_settings t using _p3_map m
   where t.user_id = v_owner and t.exercise_id = m.exercise_id
     and exists (select 1 from public.exercise_rest_settings d where d.user_id = v_owner and d.exercise_id = m.fk_id);
  update public.exercise_rest_settings t set exercise_id = m.fk_id from _p3_map m
   where t.user_id = v_owner and t.exercise_id = m.exercise_id;

  -- ── 7. Verwijzingen E → C (alleen als E ≠ C) ───────────────────────────────
  -- FK-rij voor C: bestaat hij niet, dan een inactieve technische rij (niet zichtbaar in de app).
  insert into public.exercises (id, name, category, type, scope, active, muscle_primary, muscle_secondary, sports)
    select m.catalog_id, e.name, e.category, e.type, 'personal', false, e.muscle_primary, e.muscle_secondary, e.sports
      from _p3_map m join public.exercises e on e.id = m.exercise_id
     where m.exercise_id <> m.catalog_id and not exists (select 1 from public.exercises x where x.id = m.catalog_id);
  update public.exercises x set created_by = v_owner from _p3_map m
   where x.id = m.catalog_id and m.exercise_id <> m.catalog_id and x.scope = 'personal' and x.created_by is null and not x.active;
  update public.program_block_exercises t set exercise_id = m.catalog_id from _p3_map m
   where t.exercise_id = m.exercise_id and m.exercise_id <> m.catalog_id and t.user_id = v_owner;
  update public.training_exercises t set exercise_id = m.catalog_id from _p3_map m
   where t.exercise_id = m.exercise_id and m.exercise_id <> m.catalog_id and t.user_id = v_owner;
  update public.custom_training_exercises t set exercise_id = m.catalog_id from _p3_map m
   where t.exercise_id = m.exercise_id and m.exercise_id <> m.catalog_id and t.user_id = v_owner;
  delete from public.exercise_favorites f using _p3_map m
   where f.exercise_id = m.exercise_id and m.exercise_id <> m.catalog_id and f.user_id = v_owner
     and exists (select 1 from public.exercise_favorites d where d.user_id = v_owner and d.exercise_id = m.catalog_id);
  update public.exercise_favorites f set exercise_id = m.catalog_id from _p3_map m
   where f.exercise_id = m.exercise_id and m.exercise_id <> m.catalog_id and f.user_id = v_owner;
  update public.exercise_equipment q set exercise_id = m.catalog_id from _p3_map m
   where q.exercise_id = m.exercise_id and m.exercise_id <> m.catalog_id and q.user_id = v_owner;
  update public.race_segments t set exercise_id = m.catalog_id from _p3_map m
   where t.exercise_id = m.exercise_id and m.exercise_id <> m.catalog_id and t.user_id = v_owner;
  update public.goals t set exercise_id = m.catalog_id from _p3_map m
   where t.exercise_id = m.exercise_id and m.exercise_id <> m.catalog_id and t.user_id = v_owner;
  update public.exercises e set ratio_anchor = m.catalog_id from _p3_map m
   where e.ratio_anchor = m.exercise_id and m.exercise_id <> m.catalog_id and e.scope = 'personal' and e.created_by = v_owner;
  update public.training_instances t set snapshot = pg_temp.p3_rw(t.snapshot)
   where t.user_id = v_owner and t.snapshot is not null and pg_temp.p3_hits(t.snapshot) > 0;
  update public.planned_training_occurrences t set definition_snapshot = pg_temp.p3_rw(t.definition_snapshot)
   where t.creator_user_id = v_owner and t.definition_snapshot is not null and pg_temp.p3_hits(t.definition_snapshot) > 0;
  update public.program_regeneration_log t set replaced_blocks_snapshot = pg_temp.p3_rw(t.replaced_blocks_snapshot)
   where t.user_id = v_owner and t.replaced_blocks_snapshot is not null and pg_temp.p3_hits(t.replaced_blocks_snapshot) > 0;
  update public.custom_trainings t set metadata = pg_temp.p3_rw(t.metadata)
   where t.user_id = v_owner and t.metadata is not null and pg_temp.p3_hits(t.metadata) > 0;
  update public.training_context t set avoid_exercises = pg_temp.p3_rw_list(t.avoid_exercises)
   where t.user_id = v_owner and t.avoid_exercises is not null and pg_temp.p3_hits_list(t.avoid_exercises) > 0;

  -- ── 8. Eigen persoonlijke rij inactief; koppeling gemigreerd ───────────────
  update public.exercises e set active = false from _p3_map m
   where e.id = m.exercise_id and e.scope = 'personal' and e.created_by = v_owner and e.active;
  update public.exercise_catalog_links l set migrated_at = now() from _p3_map m
   where l.user_id = v_owner and l.exercise_id = m.exercise_id and l.migrated_at is null;

  -- ── 9. Controles achteraf (fout = alles terug) ─────────────────────────────
  select count(*) into v_n from public.sessions where user_id = v_owner;
  if v_n <> (select v from _p3_pre where k = 'own:sessions') then raise exception 'P3: aantal sessies van de eigenaar gewijzigd'; end if;
  select count(*) into v_n from public.sessions s join _p3_map m on s.exercise_id in (m.exercise_id, m.fk_id) where s.user_id is distinct from v_owner;
  if v_n <> (select v from _p3_pre where k = 'foreign:sessions') then raise exception 'P3: sessies van andere accounts geraakt'; end if;
  select count(*) into v_n from public.sessions s join _p3_map m on m.exercise_id = s.exercise_id where s.user_id = v_owner;
  if v_n <> 0 then raise exception 'P3: % sessie(s) niet verplaatst', v_n; end if;
  for r in select m.fk_id, count(s.id) n,
      coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0) * coalesce(s.sets, 1) + coalesce(s.distance, 0) + coalesce(s.duration_s, 0)), 0) sm
    from _p3_map m left join public.sessions s on s.exercise_id = m.fk_id and s.user_id = v_owner group by m.fk_id loop
    if r.n <> (select v from _p3_pre where k = 'n:' || r.fk_id) or r.sm <> (select v from _p3_pre where k = 'sum:' || r.fk_id) then
      raise exception 'P3: sessies van % niet volledig behouden', r.fk_id; end if;
  end loop;
  for r in select * from _p3_goal loop
    if not exists (select 1 from public.exercise_goals g where g.user_id = v_owner and g.exercise_id = r.target
                   and g.pr is not distinct from r.pr and g.one_rm is not distinct from r.one_rm and g.peak_goal is not distinct from r.peak_goal) then
      raise exception 'P3: doelen van % niet de hoogste waarde', r.target; end if;
  end loop;
  select count(*) into v_n from public.exercise_goals g join _p3_map m on g.exercise_id in (m.exercise_id, m.catalog_id) and g.exercise_id <> m.fk_id
    where g.user_id = v_owner;
  if v_n <> 0 then raise exception 'P3: doelen op het oude id over'; end if;
  select count(*) into v_n from public.exercise_goals g join _p3_map m on g.exercise_id in (m.exercise_id, m.catalog_id, m.fk_id) where g.user_id is distinct from v_owner;
  if v_n <> (select v from _p3_pre where k = 'foreign:exercise_goals') then raise exception 'P3: doelen van andere accounts geraakt'; end if;
  select count(*) into v_n from public.exercises e join _p3_map m on m.exercise_id = e.id where e.active and not (e.scope = 'personal' and e.created_by = v_owner);
  if v_n <> (select v from _p3_pre where k = 'foreign:exercises_active') then raise exception 'P3: gedeelde oefening gewijzigd'; end if;
  select count(*) into v_n from public.exercises e join _p3_map m on m.exercise_id = e.id where e.active and e.scope = 'personal' and e.created_by = v_owner;
  if v_n <> 0 then raise exception 'P3: eigen persoonlijke rij nog actief'; end if;
  select (select count(*) from public.program_block_exercises t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id where t.user_id = v_owner)
       + (select count(*) from public.training_exercises t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id where t.user_id = v_owner)
       + (select count(*) from public.custom_training_exercises t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id where t.user_id = v_owner)
       + (select count(*) from public.race_segments t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id where t.user_id = v_owner)
       + (select count(*) from public.goals t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id where t.user_id = v_owner)
       + (select count(*) from public.exercise_favorites t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id where t.user_id = v_owner)
       + (select count(*) from public.exercise_equipment t join _p3_map m on m.exercise_id = t.exercise_id and m.exercise_id <> m.catalog_id where t.user_id = v_owner)
       + (select coalesce(sum(pg_temp.p3_hits(snapshot)), 0) from public.training_instances where user_id = v_owner and snapshot is not null)
       + (select coalesce(sum(pg_temp.p3_hits(definition_snapshot)), 0) from public.planned_training_occurrences where creator_user_id = v_owner and definition_snapshot is not null)
       + (select coalesce(sum(pg_temp.p3_hits(replaced_blocks_snapshot)), 0) from public.program_regeneration_log where user_id = v_owner and replaced_blocks_snapshot is not null)
       + (select coalesce(sum(pg_temp.p3_hits(metadata)), 0) from public.custom_trainings where user_id = v_owner and metadata is not null)
       + (select coalesce(sum(pg_temp.p3_hits_list(avoid_exercises)), 0) from public.training_context where user_id = v_owner and avoid_exercises is not null)
    into v_n;
  if v_n <> 0 then raise exception 'P3: % verwijzing(en) naar de eigen oefening niet omgezet', v_n; end if;
  select count(*) into v_n from _p3_map m where m.exercise_id <> m.catalog_id and not exists (select 1 from public.exercises x where x.id = m.catalog_id);
  if v_n <> 0 then raise exception 'P3: FK-rij voor het catalogus-id ontbreekt'; end if;
  select count(*) into v_n from public.exercise_catalog_links l join _p3_map m on m.exercise_id = l.exercise_id
    where l.user_id = v_owner and l.migrated_at is not null;
  if v_n <> (select count(*) from _p3_map) then raise exception 'P3: koppelingen niet allemaal gemigreerd'; end if;

  -- ── 10. Verslag ────────────────────────────────────────────────────────────
  select count(*) into v_m from public.sessions s join _p3_map m on m.fk_id = s.exercise_id where s.user_id = v_owner;
  insert into _p3_report values
    (1, 'koppelingen_in_portie', (select count(*) from _p3_map)::text),
    (2, 'sessies_op_movekit_id', v_m::text),
    (3, 'doelen_samengevoegd', (select count(*) from _p3_goal)::text),
    (4, 'eigenaar_sessies_totaal', (select v from _p3_pre where k = 'own:sessions')::text),
    (5, 'controles', 'geslaagd');
end $p3$;

select k, v from _p3_report order by ord;
