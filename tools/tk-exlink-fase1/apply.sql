-- GEGENEREERD door tools/tk-exlink-fase1/build.cjs uit mapping.json (DEC-EXLINK-001). Niet met de hand wijzigen.
-- Vereist: transactie + set_config('tk.exlink_owner', '<uuid>', true) vooraf (zie build.cjs).
create temp table if not exists _tkx_map (
  exercise_id text primary key, catalog_id text not null, merged_into text, hidden boolean not null
) on commit drop;
truncate _tkx_map;
insert into _tkx_map (exercise_id, catalog_id, merged_into, hidden) values
  ('TK-000002', 'TK-000002', null, false),
  ('TK-000018', 'TK-000018', null, false),
  ('TK-000019', 'TK-000019', null, false),
  ('bench', 'TK-000019', 'TK-000019', false),
  ('paused_bench', 'TK-000019', 'TK-000019', false),
  ('TK-000020', 'TK-000020', null, false),
  ('bentoverrow', 'TK-000020', 'TK-000020', false),
  ('bicep_curl_bb', 'TK-000023', null, false),
  ('TK-000024', 'TK-000024', null, false),
  ('deadlift', 'TK-000024', 'TK-000024', false),
  ('deadlift_conv', 'TK-000024', 'TK-000024', false),
  ('TK-000030', 'TK-000030', null, false),
  ('overhead_press', 'TK-000030', 'TK-000030', false),
  ('shoulderpress', 'TK-000030', 'TK-000030', false),
  ('snatch', 'TK-000035', null, false),
  ('TK-000038', 'TK-000038', null, false),
  ('backsquat', 'TK-000038', 'TK-000038', false),
  ('pin_squat', 'TK-000038', 'TK-000038', false),
  ('safety_squat_bar', 'TK-000038', 'TK-000038', false),
  ('safity_bar_squat', 'TK-000038', 'TK-000038', false),
  ('thruster', 'TK-000041', null, false),
  ('box_squat', 'TK-000047', null, false),
  ('TK-000052', 'TK-000052', null, false),
  ('boxjump', 'TK-000057', null, false),
  ('burpee', 'TK-000059', null, false),
  ('cable_fly', 'TK-000071', null, false),
  ('tricep_pushdown', 'TK-000073', null, false),
  ('TK-000093', 'TK-000093', null, false),
  ('bicep_curl_db', 'TK-000093', 'TK-000093', false),
  ('TK-000105', 'TK-000105', null, false),
  ('TK-000106', 'TK-000106', null, false),
  ('incline_db_press', 'TK-000108', null, false),
  ('lateral_raise', 'TK-000113', null, false),
  ('tricep_overhead', 'TK-000122', null, false),
  ('TK-000125', 'TK-000125', null, false),
  ('TK-000147', 'TK-000147', null, false),
  ('good_morning', 'TK-000147', 'TK-000147', false),
  ('farmercarry', 'TK-000158', null, false),
  ('hyrox_farmers_carry', 'TK-000158', null, true),
  ('kb_swing', 'TK-000173', null, false),
  ('kb_windmill', 'TK-000175', null, false),
  ('hyrox_sandbag_lunges', 'TK-000177', null, true),
  ('sandbag_lunges', 'TK-000177', null, false),
  ('TK-000179', 'TK-000179', null, false),
  ('TK-000180', 'TK-000180', null, false),
  ('TK-000185', 'TK-000185', null, false),
  ('leg_extension', 'TK-000185', 'TK-000185', false),
  ('leg_press', 'TK-000186', null, false),
  ('TK-000191', 'TK-000191', null, false),
  ('TK-000192', 'TK-000192', null, false),
  ('cablerow', 'TK-000192', 'TK-000192', false),
  ('TK-000195', 'TK-000195', null, false),
  ('pullup_kip', 'TK-000198', 'pullup_strict', false),
  ('pullup_strict', 'TK-000198', null, false),
  ('TK-000199', 'TK-000199', null, false),
  ('bike_erg', 'TK-000235', null, false),
  ('swim_rug', 'TK-000241', null, false),
  ('cleanjerk', 'TK-000257', null, false),
  ('rdl', 'TK-000266', null, false),
  ('bounding', 'TK-000279', null, false),
  ('swim_school', 'TK-000281', null, false),
  ('burpee_broadjump', 'TK-000282', null, false),
  ('hyrox_burpee_broad_jump', 'TK-000282', null, true),
  ('swim_vlinder', 'TK-000284', null, false),
  ('kb_cleanpress', 'TK-000310', null, false),
  ('swim_vrij', 'TK-000350', null, false),
  ('triathlon_zwemmen', 'TK-000350', null, true),
  ('frontsquat', 'TK-000356', null, false),
  ('hpc', 'TK-000365', null, false),
  ('hps', 'TK-000366', null, false),
  ('doubleunders', 'TK-000381', null, false),
  ('kb_goblet', 'TK-000383', null, false),
  ('kb_tgu', 'TK-000387', null, false),
  ('lat_pulldown', 'TK-000392', null, false),
  ('duurloop', 'TK-000401', null, false),
  ('triathlon_hardlopen', 'TK-000401', null, true),
  ('leg_curl', 'TK-000404', null, false),
  ('muscleup', 'TK-000421', null, false),
  ('hyrox_row', 'TK-000458', null, true),
  ('roeien', 'TK-000458', null, false),
  ('interval_400', 'TK-000461', null, false),
  ('sprint_interval', 'TK-000461', 'interval_400', false),
  ('hyrox_skierg', 'TK-000505', null, true),
  ('ski_erg', 'TK-000505', null, false),
  ('hyrox_sled_pull', 'TK-000506', null, true),
  ('sledpull', 'TK-000506', null, false),
  ('hyrox_sled_push', 'TK-000507', null, true),
  ('sledpush', 'TK-000507', null, false),
  ('calf_raise', 'TK-000530', null, false),
  ('triathlon_fietsen', 'TK-000534', null, false),
  ('deadlift_sumo', 'TK-000539', null, false),
  ('tempo_run', 'TK-000544', null, false),
  ('toestobar', 'TK-000547', null, false),
  ('hexabar', 'TK-000553', null, false),
  ('hyrox_run', 'TK-000555', null, false),
  ('hyrox_wall_balls', 'TK-000566', null, true),
  ('wall_ball', 'TK-000566', null, false),
  ('wallball', 'TK-000566', 'wall_ball', false);

-- Groepen: per doel de doel-id plus de samengevoegde id's.
create temp table if not exists _tkx_grp (target text not null, exercise_id text not null, primary key (target, exercise_id)) on commit drop;
truncate _tkx_grp;
insert into _tkx_grp select merged_into, merged_into from _tkx_map where merged_into is not null group by merged_into
  union select merged_into, exercise_id from _tkx_map where merged_into is not null;
create temp table if not exists _tkx_pre (k text primary key, v numeric) on commit drop;
truncate _tkx_pre;
create temp table if not exists _tkx_report (ord int, k text, v text) on commit drop;
truncate _tkx_report;

-- Herschrijft id-verwijzingen (recursief): string-waarden onder de sleutels exercise_id en id, en de
-- elementen van een skipped-lijst, die exact een samengevoegde id zijn. Overige JSON blijft gelijk.
create or replace function pg_temp.tkx_map1(v jsonb) returns jsonb language sql stable as $f$
  select case when jsonb_typeof(v) = 'string'
    then coalesce((select to_jsonb(m.merged_into) from _tkx_map m where m.merged_into is not null and m.exercise_id = (v #>> '{}')), v)
    else v end
$f$;
create or replace function pg_temp.tkx_rw(j jsonb) returns jsonb language sql stable as $f$
  select case jsonb_typeof(j)
    when 'object' then coalesce((select jsonb_object_agg(e.k,
        case when e.k in ('exercise_id', 'id') then pg_temp.tkx_map1(e.v)
             when e.k = 'skipped' and jsonb_typeof(e.v) = 'array'
               then coalesce((select jsonb_agg(pg_temp.tkx_map1(a.v) order by a.o) from jsonb_array_elements(e.v) with ordinality as a(v, o)), '[]'::jsonb)
             else pg_temp.tkx_rw(e.v) end) from jsonb_each(j) as e(k, v)), '{}'::jsonb)
    when 'array' then coalesce((select jsonb_agg(pg_temp.tkx_rw(a.v) order by a.o) from jsonb_array_elements(j) with ordinality as a(v, o)), '[]'::jsonb)
    else j end
$f$;
-- Aantal id-verwijzingen (zelfde regel als tkx_rw) naar een samengevoegde id.
create or replace function pg_temp.tkx_hit1(v jsonb) returns bigint language sql stable as $f$
  select case when jsonb_typeof(v) = 'string'
    then (select count(*) from _tkx_map m where m.merged_into is not null and m.exercise_id = (v #>> '{}'))
    else 0::bigint end
$f$;
create or replace function pg_temp.tkx_hits(j jsonb) returns bigint language sql stable as $f$
  select case jsonb_typeof(j)
    when 'object' then coalesce((select sum(
        case when e.k in ('exercise_id', 'id') then pg_temp.tkx_hit1(e.v)
             when e.k = 'skipped' and jsonb_typeof(e.v) = 'array'
               then coalesce((select sum(pg_temp.tkx_hit1(a.v)) from jsonb_array_elements(e.v) as a(v)), 0)
             else pg_temp.tkx_hits(e.v) end) from jsonb_each(j) as e(k, v)), 0)::bigint
    when 'array' then coalesce((select sum(pg_temp.tkx_hits(a.v)) from jsonb_array_elements(j) as a(v)), 0)::bigint
    else 0::bigint end
$f$;

-- Back-uptabellen (eenmalig aangemaakt, deny-all RLS zoals bak_p_*).
create table if not exists public.bak_tkx20261114_sessions (like public.sessions);
alter table public.bak_tkx20261114_sessions enable row level security;
revoke all on public.bak_tkx20261114_sessions from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_program_block_exercises (like public.program_block_exercises);
alter table public.bak_tkx20261114_program_block_exercises enable row level security;
revoke all on public.bak_tkx20261114_program_block_exercises from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_training_exercises (like public.training_exercises);
alter table public.bak_tkx20261114_training_exercises enable row level security;
revoke all on public.bak_tkx20261114_training_exercises from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_custom_training_exercises (like public.custom_training_exercises);
alter table public.bak_tkx20261114_custom_training_exercises enable row level security;
revoke all on public.bak_tkx20261114_custom_training_exercises from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_race_segments (like public.race_segments);
alter table public.bak_tkx20261114_race_segments enable row level security;
revoke all on public.bak_tkx20261114_race_segments from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_goals (like public.goals);
alter table public.bak_tkx20261114_goals enable row level security;
revoke all on public.bak_tkx20261114_goals from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_training_instances (like public.training_instances);
alter table public.bak_tkx20261114_training_instances enable row level security;
revoke all on public.bak_tkx20261114_training_instances from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_planned_training_occurrences (like public.planned_training_occurrences);
alter table public.bak_tkx20261114_planned_training_occurrences enable row level security;
revoke all on public.bak_tkx20261114_planned_training_occurrences from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_program_regeneration_log (like public.program_regeneration_log);
alter table public.bak_tkx20261114_program_regeneration_log enable row level security;
revoke all on public.bak_tkx20261114_program_regeneration_log from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_custom_trainings (like public.custom_trainings);
alter table public.bak_tkx20261114_custom_trainings enable row level security;
revoke all on public.bak_tkx20261114_custom_trainings from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_training_context (like public.training_context);
alter table public.bak_tkx20261114_training_context enable row level security;
revoke all on public.bak_tkx20261114_training_context from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_exercise_goals (like public.exercise_goals);
alter table public.bak_tkx20261114_exercise_goals enable row level security;
revoke all on public.bak_tkx20261114_exercise_goals from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_exercise_equipment (like public.exercise_equipment);
alter table public.bak_tkx20261114_exercise_equipment enable row level security;
revoke all on public.bak_tkx20261114_exercise_equipment from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_exercise_favorites (like public.exercise_favorites);
alter table public.bak_tkx20261114_exercise_favorites enable row level security;
revoke all on public.bak_tkx20261114_exercise_favorites from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_exercises (like public.exercises);
alter table public.bak_tkx20261114_exercises enable row level security;
revoke all on public.bak_tkx20261114_exercises from public, anon, authenticated;
create table if not exists public.bak_tkx20261114_exercise_catalog_links (like public.exercise_catalog_links);
alter table public.bak_tkx20261114_exercise_catalog_links enable row level security;
revoke all on public.bak_tkx20261114_exercise_catalog_links from public, anon, authenticated;

do $tkx$
declare
  v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid;
  v_n bigint; v_m bigint; r record; v_bad text;
begin
  -- ── 0. Voorwaarden ──────────────────────────────────────────────────────────
  if v_owner is null then raise exception 'TKX: tk.exlink_owner ontbreekt'; end if;
  if not exists (select 1 from auth.users where id = v_owner) then raise exception 'TKX: eigenaar onbekend'; end if;
  select string_agg(x.id, ',') into v_bad from (
    select exercise_id id from _tkx_map union select merged_into from _tkx_map where merged_into is not null) x
    where not exists (select 1 from public.exercises e where e.id = x.id);
  if v_bad is not null then raise exception 'TKX: onbekende oefening(en): %', v_bad; end if;
  select string_agg(m.catalog_id, ',') into v_bad from (select distinct catalog_id from _tkx_map) m
    where not exists (select 1 from public.movekit_catalog_fk_bindings b where b.catalog_id = m.catalog_id);
  if v_bad is not null then raise exception 'TKX: onbekend MoveKit-item: %', v_bad; end if;
  select string_agg(e.id, ',') into v_bad from public.exercises e join _tkx_map m on m.exercise_id = e.id
    where m.merged_into is not null and e.scope = 'personal' and e.created_by is distinct from v_owner;
  if v_bad is not null then raise exception 'TKX: eigen oefening(en) van een ander account: %', v_bad; end if;

  -- ── 1. Meetwaarden vooraf ───────────────────────────────────────────────────
  insert into _tkx_pre select 'own:sessions', count(*) from public.sessions where user_id = v_owner;
  insert into _tkx_pre select 'foreign:sessions', count(*) from public.sessions t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  insert into _tkx_pre select 'own:program_block_exercises', count(*) from public.program_block_exercises where user_id = v_owner;
  insert into _tkx_pre select 'foreign:program_block_exercises', count(*) from public.program_block_exercises t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  insert into _tkx_pre select 'own:training_exercises', count(*) from public.training_exercises where user_id = v_owner;
  insert into _tkx_pre select 'foreign:training_exercises', count(*) from public.training_exercises t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  insert into _tkx_pre select 'own:custom_training_exercises', count(*) from public.custom_training_exercises where user_id = v_owner;
  insert into _tkx_pre select 'foreign:custom_training_exercises', count(*) from public.custom_training_exercises t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  insert into _tkx_pre select 'own:race_segments', count(*) from public.race_segments where user_id = v_owner;
  insert into _tkx_pre select 'foreign:race_segments', count(*) from public.race_segments t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  insert into _tkx_pre select 'own:goals', count(*) from public.goals where user_id = v_owner;
  insert into _tkx_pre select 'foreign:goals', count(*) from public.goals t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  insert into _tkx_pre select 'foreign:exercise_goals', count(*) from public.exercise_goals g join _tkx_map m on m.exercise_id = g.exercise_id where g.user_id is distinct from v_owner;
  insert into _tkx_pre select 'foreign:exercise_equipment', count(*) from public.exercise_equipment g join _tkx_map m on m.exercise_id = g.exercise_id where g.user_id is distinct from v_owner;
  insert into _tkx_pre select 'foreign:exercises_active', count(*) from public.exercises e join _tkx_map m on m.exercise_id = e.id where e.active and not (e.scope = 'personal' and e.created_by = v_owner);
  -- Per doelgroep: aantal sessies en een controlegetal over de gelogde waarden.
  insert into _tkx_pre select 'grp_n:' || g.target, count(s.id) from _tkx_grp g left join public.sessions s on s.exercise_id = g.exercise_id and s.user_id = v_owner group by g.target;
  insert into _tkx_pre select 'grp_sum:' || g.target,
      coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0) * coalesce(s.sets, 1) + coalesce(s.distance, 0) + coalesce(s.duration_s, 0)), 0)
    from _tkx_grp g left join public.sessions s on s.exercise_id = g.exercise_id and s.user_id = v_owner group by g.target;
  -- Verwachte doelen per groep: hoogste waarde per veld (eigenaarsbesluit 14-11-2026).
  create temp table if not exists _tkx_goal on commit drop as
    select g.target, max(eg.pr) pr, max(eg.one_rm) one_rm, max(eg.peak_goal) peak_goal,
           (array_agg(eg.updated_at order by eg.one_rm desc nulls last, eg.updated_at desc nulls last))[1] one_rm_at,
           count(eg.id) n
      from _tkx_grp g join public.exercise_goals eg on eg.exercise_id = g.exercise_id and eg.user_id = v_owner
      group by g.target;

  -- ── 2. Back-up (alleen rijen die nog niet geback-upt zijn) ─────────────────
  insert into public.bak_tkx20261114_sessions select t.* from public.sessions t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_sessions b where b.id = t.id);
  insert into public.bak_tkx20261114_program_block_exercises select t.* from public.program_block_exercises t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_program_block_exercises b where b.id = t.id);
  insert into public.bak_tkx20261114_training_exercises select t.* from public.training_exercises t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_training_exercises b where b.id = t.id);
  insert into public.bak_tkx20261114_custom_training_exercises select t.* from public.custom_training_exercises t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_custom_training_exercises b where b.id = t.id);
  insert into public.bak_tkx20261114_race_segments select t.* from public.race_segments t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_race_segments b where b.id = t.id);
  insert into public.bak_tkx20261114_goals select t.* from public.goals t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_goals b where b.id = t.id);
  insert into public.bak_tkx20261114_training_instances select t.* from public.training_instances t
    where t.user_id = v_owner and t.snapshot is not null and pg_temp.tkx_hits(t.snapshot) > 0 and not exists (select 1 from public.bak_tkx20261114_training_instances b where b.id = t.id);
  insert into public.bak_tkx20261114_planned_training_occurrences select t.* from public.planned_training_occurrences t
    where t.creator_user_id = v_owner and t.definition_snapshot is not null and pg_temp.tkx_hits(t.definition_snapshot) > 0 and not exists (select 1 from public.bak_tkx20261114_planned_training_occurrences b where b.id = t.id);
  insert into public.bak_tkx20261114_program_regeneration_log select t.* from public.program_regeneration_log t
    where t.user_id = v_owner and t.replaced_blocks_snapshot is not null and pg_temp.tkx_hits(t.replaced_blocks_snapshot) > 0 and not exists (select 1 from public.bak_tkx20261114_program_regeneration_log b where b.id = t.id);
  insert into public.bak_tkx20261114_custom_trainings select t.* from public.custom_trainings t
    where t.user_id = v_owner and t.metadata is not null and pg_temp.tkx_hits(t.metadata) > 0 and not exists (select 1 from public.bak_tkx20261114_custom_trainings b where b.id = t.id);
  insert into public.bak_tkx20261114_training_context select t.* from public.training_context t
    where t.user_id = v_owner and t.avoid_exercises is not null and pg_temp.tkx_hits(t.avoid_exercises) > 0 and not exists (select 1 from public.bak_tkx20261114_training_context b where b.user_id = t.user_id);
  insert into public.bak_tkx20261114_exercise_goals select t.* from public.exercise_goals t join _tkx_grp g on g.exercise_id = t.exercise_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_exercise_goals b where b.id = t.id);
  insert into public.bak_tkx20261114_exercise_equipment select t.* from public.exercise_equipment t join _tkx_grp g on g.exercise_id = t.exercise_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_exercise_equipment b where b.id = t.id);
  insert into public.bak_tkx20261114_exercise_favorites select t.* from public.exercise_favorites t join _tkx_grp g on g.exercise_id = t.exercise_id
    where t.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_exercise_favorites b where b.exercise_id = t.exercise_id);
  insert into public.bak_tkx20261114_exercises select e.* from public.exercises e join _tkx_map m on m.exercise_id = e.id
    where not exists (select 1 from public.bak_tkx20261114_exercises b where b.id = e.id);
  insert into public.bak_tkx20261114_exercises select e.* from public.exercises e join _tkx_map m on m.exercise_id = e.ratio_anchor and m.merged_into is not null
    where e.scope = 'personal' and e.created_by = v_owner and not exists (select 1 from public.bak_tkx20261114_exercises b where b.id = e.id);
  insert into public.bak_tkx20261114_exercise_catalog_links select l.* from public.exercise_catalog_links l join _tkx_map m on m.exercise_id = l.exercise_id
    where l.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_exercise_catalog_links b where b.user_id = l.user_id and b.exercise_id = l.exercise_id);

  -- ── 3. Verwijzingen omzetten naar het doel (alleen deze eigenaar) ──────────
  update public.sessions t set exercise_id = m.merged_into from _tkx_map m
    where m.exercise_id = t.exercise_id and m.merged_into is not null and t.user_id = v_owner;
  update public.program_block_exercises t set exercise_id = m.merged_into from _tkx_map m
    where m.exercise_id = t.exercise_id and m.merged_into is not null and t.user_id = v_owner;
  update public.training_exercises t set exercise_id = m.merged_into from _tkx_map m
    where m.exercise_id = t.exercise_id and m.merged_into is not null and t.user_id = v_owner;
  update public.custom_training_exercises t set exercise_id = m.merged_into from _tkx_map m
    where m.exercise_id = t.exercise_id and m.merged_into is not null and t.user_id = v_owner;
  update public.race_segments t set exercise_id = m.merged_into from _tkx_map m
    where m.exercise_id = t.exercise_id and m.merged_into is not null and t.user_id = v_owner;
  update public.goals t set exercise_id = m.merged_into from _tkx_map m
    where m.exercise_id = t.exercise_id and m.merged_into is not null and t.user_id = v_owner;
  update public.training_instances t set snapshot = pg_temp.tkx_rw(t.snapshot)
    where t.user_id = v_owner and t.snapshot is not null and pg_temp.tkx_hits(t.snapshot) > 0;
  update public.planned_training_occurrences t set definition_snapshot = pg_temp.tkx_rw(t.definition_snapshot)
    where t.creator_user_id = v_owner and t.definition_snapshot is not null and pg_temp.tkx_hits(t.definition_snapshot) > 0;
  update public.program_regeneration_log t set replaced_blocks_snapshot = pg_temp.tkx_rw(t.replaced_blocks_snapshot)
    where t.user_id = v_owner and t.replaced_blocks_snapshot is not null and pg_temp.tkx_hits(t.replaced_blocks_snapshot) > 0;
  update public.custom_trainings t set metadata = pg_temp.tkx_rw(t.metadata)
    where t.user_id = v_owner and t.metadata is not null and pg_temp.tkx_hits(t.metadata) > 0;
  update public.training_context t set avoid_exercises = pg_temp.tkx_rw(t.avoid_exercises)
    where t.user_id = v_owner and t.avoid_exercises is not null and pg_temp.tkx_hits(t.avoid_exercises) > 0;
  update public.exercises e set ratio_anchor = m.merged_into from _tkx_map m
    where m.exercise_id = e.ratio_anchor and m.merged_into is not null and e.scope = 'personal' and e.created_by = v_owner;

  -- ── 4. Doelen samenvoegen: hoogste waarde per veld op het doel ─────────────
  for r in select * from _tkx_goal loop
    if exists (select 1 from public.exercise_goals where user_id = v_owner and exercise_id = r.target) then
      update public.exercise_goals set pr = r.pr, one_rm = r.one_rm, peak_goal = r.peak_goal,
             updated_at = case when r.one_rm is not null then coalesce(r.one_rm_at, updated_at) else updated_at end
       where user_id = v_owner and exercise_id = r.target
         and (pr, one_rm, peak_goal) is distinct from (r.pr, r.one_rm, r.peak_goal);
    else
      insert into public.exercise_goals (user_id, exercise_id, pr, one_rm, peak_goal, updated_at)
      values (v_owner, r.target, r.pr, r.one_rm, r.peak_goal, coalesce(r.one_rm_at, now()));
    end if;
  end loop;
  delete from public.exercise_goals g using _tkx_map m
   where g.exercise_id = m.exercise_id and m.merged_into is not null and g.user_id = v_owner;

  -- ── 5. Uitrusting en favorieten: verplaatsen, dubbelen vervallen (geback-upt) ─
  delete from public.exercise_equipment q using _tkx_map m
   where q.exercise_id = m.exercise_id and m.merged_into is not null and q.user_id = v_owner
     and exists (select 1 from public.exercise_equipment d where d.exercise_id = m.merged_into and d.user_id = v_owner
                 and d.label is not distinct from q.label and d.value is not distinct from q.value);
  update public.exercise_equipment q set exercise_id = m.merged_into from _tkx_map m
   where q.exercise_id = m.exercise_id and m.merged_into is not null and q.user_id = v_owner;
  delete from public.exercise_favorites f using _tkx_map m
   where f.exercise_id = m.exercise_id and m.merged_into is not null and f.user_id = v_owner
     and exists (select 1 from public.exercise_favorites d where d.exercise_id = m.merged_into);
  update public.exercise_favorites f set exercise_id = m.merged_into from _tkx_map m
   where f.exercise_id = m.exercise_id and m.merged_into is not null and f.user_id = v_owner;

  -- ── 6. Samengevoegde eigen oefeningen op inactief (niet verwijderen) ───────
  update public.exercises e set active = false from _tkx_map m
   where m.exercise_id = e.id and m.merged_into is not null and e.scope = 'personal' and e.created_by = v_owner and e.active;

  -- ── 7. Koppelingen vastleggen ──────────────────────────────────────────────
  insert into public.exercise_catalog_links (user_id, exercise_id, catalog_id, merged_into, hidden)
    select v_owner, exercise_id, catalog_id, merged_into, hidden from _tkx_map
  on conflict (user_id, exercise_id) do update
    set catalog_id = excluded.catalog_id, merged_into = excluded.merged_into, hidden = excluded.hidden;

  -- ── 8. Controles achteraf (fout = alles terug) ─────────────────────────────
  select count(*) into v_n from public.sessions where user_id = v_owner;
  if v_n <> (select v from _tkx_pre where k = 'own:sessions') then raise exception 'TKX: aantal rijen sessions gewijzigd'; end if;
  select count(*) into v_n from public.sessions t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:sessions') then raise exception 'TKX: rijen van andere accounts in sessions geraakt'; end if;
  select count(*) into v_n from public.sessions t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null where t.user_id = v_owner;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in sessions niet omgezet', v_n; end if;
  select count(*) into v_n from public.program_block_exercises where user_id = v_owner;
  if v_n <> (select v from _tkx_pre where k = 'own:program_block_exercises') then raise exception 'TKX: aantal rijen program_block_exercises gewijzigd'; end if;
  select count(*) into v_n from public.program_block_exercises t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:program_block_exercises') then raise exception 'TKX: rijen van andere accounts in program_block_exercises geraakt'; end if;
  select count(*) into v_n from public.program_block_exercises t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null where t.user_id = v_owner;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in program_block_exercises niet omgezet', v_n; end if;
  select count(*) into v_n from public.training_exercises where user_id = v_owner;
  if v_n <> (select v from _tkx_pre where k = 'own:training_exercises') then raise exception 'TKX: aantal rijen training_exercises gewijzigd'; end if;
  select count(*) into v_n from public.training_exercises t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:training_exercises') then raise exception 'TKX: rijen van andere accounts in training_exercises geraakt'; end if;
  select count(*) into v_n from public.training_exercises t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null where t.user_id = v_owner;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in training_exercises niet omgezet', v_n; end if;
  select count(*) into v_n from public.custom_training_exercises where user_id = v_owner;
  if v_n <> (select v from _tkx_pre where k = 'own:custom_training_exercises') then raise exception 'TKX: aantal rijen custom_training_exercises gewijzigd'; end if;
  select count(*) into v_n from public.custom_training_exercises t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:custom_training_exercises') then raise exception 'TKX: rijen van andere accounts in custom_training_exercises geraakt'; end if;
  select count(*) into v_n from public.custom_training_exercises t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null where t.user_id = v_owner;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in custom_training_exercises niet omgezet', v_n; end if;
  select count(*) into v_n from public.race_segments where user_id = v_owner;
  if v_n <> (select v from _tkx_pre where k = 'own:race_segments') then raise exception 'TKX: aantal rijen race_segments gewijzigd'; end if;
  select count(*) into v_n from public.race_segments t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:race_segments') then raise exception 'TKX: rijen van andere accounts in race_segments geraakt'; end if;
  select count(*) into v_n from public.race_segments t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null where t.user_id = v_owner;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in race_segments niet omgezet', v_n; end if;
  select count(*) into v_n from public.goals where user_id = v_owner;
  if v_n <> (select v from _tkx_pre where k = 'own:goals') then raise exception 'TKX: aantal rijen goals gewijzigd'; end if;
  select count(*) into v_n from public.goals t join _tkx_map m on m.exercise_id = t.exercise_id where t.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:goals') then raise exception 'TKX: rijen van andere accounts in goals geraakt'; end if;
  select count(*) into v_n from public.goals t join _tkx_map m on m.exercise_id = t.exercise_id and m.merged_into is not null where t.user_id = v_owner;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in goals niet omgezet', v_n; end if;
  select coalesce(sum(pg_temp.tkx_hits(snapshot)), 0) into v_n from public.training_instances where user_id = v_owner and snapshot is not null;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in training_instances.snapshot niet omgezet', v_n; end if;
  select coalesce(sum(pg_temp.tkx_hits(definition_snapshot)), 0) into v_n from public.planned_training_occurrences where creator_user_id = v_owner and definition_snapshot is not null;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in planned_training_occurrences.definition_snapshot niet omgezet', v_n; end if;
  select coalesce(sum(pg_temp.tkx_hits(replaced_blocks_snapshot)), 0) into v_n from public.program_regeneration_log where user_id = v_owner and replaced_blocks_snapshot is not null;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in program_regeneration_log.replaced_blocks_snapshot niet omgezet', v_n; end if;
  select coalesce(sum(pg_temp.tkx_hits(metadata)), 0) into v_n from public.custom_trainings where user_id = v_owner and metadata is not null;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in custom_trainings.metadata niet omgezet', v_n; end if;
  select coalesce(sum(pg_temp.tkx_hits(avoid_exercises)), 0) into v_n from public.training_context where user_id = v_owner and avoid_exercises is not null;
  if v_n <> 0 then raise exception 'TKX: % verwijzing(en) in training_context.avoid_exercises niet omgezet', v_n; end if;
  select count(*) into v_n from public.exercise_goals g join _tkx_map m on m.exercise_id = g.exercise_id where g.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:exercise_goals') then raise exception 'TKX: doelen van andere accounts geraakt'; end if;
  select count(*) into v_n from public.exercise_equipment g join _tkx_map m on m.exercise_id = g.exercise_id where g.user_id is distinct from v_owner;
  if v_n <> (select v from _tkx_pre where k = 'foreign:exercise_equipment') then raise exception 'TKX: uitrusting van andere accounts geraakt'; end if;
  select count(*) into v_n from public.exercises e join _tkx_map m on m.exercise_id = e.id where e.active and not (e.scope = 'personal' and e.created_by = v_owner);
  if v_n <> (select v from _tkx_pre where k = 'foreign:exercises_active') then raise exception 'TKX: gedeelde oefening gewijzigd'; end if;
  for r in select g.target,
      count(s.id) n,
      coalesce(sum(coalesce(s.weight, 0) * coalesce(s.reps, 0) * coalesce(s.sets, 1) + coalesce(s.distance, 0) + coalesce(s.duration_s, 0)), 0) sm
    from _tkx_grp g left join public.sessions s on s.exercise_id = g.exercise_id and s.user_id = v_owner group by g.target loop
    if r.n <> (select v from _tkx_pre where k = 'grp_n:' || r.target) or r.sm <> (select v from _tkx_pre where k = 'grp_sum:' || r.target) then
      raise exception 'TKX: sessies van groep % niet volledig behouden', r.target;
    end if;
    select count(*) into v_m from public.sessions s join _tkx_grp g on g.exercise_id = s.exercise_id and g.target = r.target
      where s.user_id = v_owner and s.exercise_id <> r.target;
    if v_m <> 0 then raise exception 'TKX: groep % heeft nog sessies op samengevoegde id', r.target; end if;
  end loop;
  for r in select * from _tkx_goal loop
    if not exists (select 1 from public.exercise_goals g where g.user_id = v_owner and g.exercise_id = r.target
                   and g.pr is not distinct from r.pr and g.one_rm is not distinct from r.one_rm and g.peak_goal is not distinct from r.peak_goal) then
      raise exception 'TKX: doelen van % niet de hoogste waarde', r.target;
    end if;
  end loop;
  select count(*) into v_n from public.exercise_goals g join _tkx_map m on m.exercise_id = g.exercise_id and m.merged_into is not null where g.user_id = v_owner;
  if v_n <> 0 then raise exception 'TKX: doelen op samengevoegde id over'; end if;
  select count(*) into v_n from public.exercises e join _tkx_map m on m.exercise_id = e.id and m.merged_into is not null
    where e.scope = 'personal' and e.created_by = v_owner and e.active;
  if v_n <> 0 then raise exception 'TKX: samengevoegde eigen oefening nog actief'; end if;
  select count(*) into v_n from public.exercise_catalog_links l join _tkx_map m
      on m.exercise_id = l.exercise_id and m.catalog_id = l.catalog_id
     and m.merged_into is not distinct from l.merged_into and m.hidden = l.hidden
    where l.user_id = v_owner;
  if v_n <> (select count(*) from _tkx_map) then raise exception 'TKX: koppelingen onvolledig'; end if;

  -- ── 9. Verslag ─────────────────────────────────────────────────────────────
  insert into _tkx_report values
    (1, 'eigenaar_sessies', (select v from _tkx_pre where k = 'own:sessions')::text),
    (2, 'koppelingen', (select count(*) from _tkx_map)::text),
    (3, 'samengevoegd', (select count(*) from _tkx_map where merged_into is not null)::text),
    (4, 'verborgen_race', (select count(*) from _tkx_map where hidden)::text),
    (5, 'doelgroepen', (select count(distinct target) from _tkx_grp)::text),
    (6, 'doelen_samengevoegd', (select count(*) from _tkx_goal)::text),
    (7, 'controles', 'geslaagd');
end $tkx$;

select k, v from _tkx_report order by ord;
