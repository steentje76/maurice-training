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

create temp table if not exists _tkx_grp (target text not null, exercise_id text not null, primary key (target, exercise_id)) on commit drop;
truncate _tkx_grp;
insert into _tkx_grp select merged_into, merged_into from _tkx_map where merged_into is not null group by merged_into
  union select merged_into, exercise_id from _tkx_map where merged_into is not null;

-- Herstelt de stand van vóór apply.sql uit de back-ups. Rijen die NA apply op een doel zijn
-- gelogd blijven op het doel staan; doelen (PR/1RM/piekdoel) gaan terug naar de back-up.
do $tkx$
declare
  v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid;
  v_n bigint;
begin
  if v_owner is null then raise exception 'TKX: tk.exlink_owner ontbreekt'; end if;
  if to_regclass('public.bak_tkx20261114_sessions') is null then raise exception 'TKX: geen back-up gevonden'; end if;
  update public.sessions t set exercise_id = b.exercise_id from public.bak_tkx20261114_sessions b
   where b.id = t.id and b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  update public.program_block_exercises t set exercise_id = b.exercise_id from public.bak_tkx20261114_program_block_exercises b
   where b.id = t.id and b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  update public.training_exercises t set exercise_id = b.exercise_id from public.bak_tkx20261114_training_exercises b
   where b.id = t.id and b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  update public.custom_training_exercises t set exercise_id = b.exercise_id from public.bak_tkx20261114_custom_training_exercises b
   where b.id = t.id and b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  update public.race_segments t set exercise_id = b.exercise_id from public.bak_tkx20261114_race_segments b
   where b.id = t.id and b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  update public.goals t set exercise_id = b.exercise_id from public.bak_tkx20261114_goals b
   where b.id = t.id and b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  update public.training_instances t set snapshot = b.snapshot from public.bak_tkx20261114_training_instances b
   where b.id = t.id and b.user_id = v_owner and t.snapshot is distinct from b.snapshot;
  update public.planned_training_occurrences t set definition_snapshot = b.definition_snapshot from public.bak_tkx20261114_planned_training_occurrences b
   where b.id = t.id and b.creator_user_id = v_owner and t.definition_snapshot is distinct from b.definition_snapshot;
  update public.program_regeneration_log t set replaced_blocks_snapshot = b.replaced_blocks_snapshot from public.bak_tkx20261114_program_regeneration_log b
   where b.id = t.id and b.user_id = v_owner and t.replaced_blocks_snapshot is distinct from b.replaced_blocks_snapshot;
  update public.custom_trainings t set metadata = b.metadata from public.bak_tkx20261114_custom_trainings b
   where b.id = t.id and b.user_id = v_owner and t.metadata is distinct from b.metadata;
  update public.training_context t set avoid_exercises = b.avoid_exercises from public.bak_tkx20261114_training_context b
   where b.user_id = t.user_id and b.user_id = v_owner and t.avoid_exercises is distinct from b.avoid_exercises;
  -- exercise_goals: doelrijen terug naar back-up, nieuw aangemaakte doelrijen weg, verwijderde terug.
  delete from public.exercise_goals g using _tkx_grp x
   where g.exercise_id = x.exercise_id and g.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_exercise_goals b where b.id = g.id);
  update public.exercise_goals g set pr = b.pr, one_rm = b.one_rm, peak_goal = b.peak_goal, updated_at = b.updated_at, exercise_id = b.exercise_id
    from public.bak_tkx20261114_exercise_goals b where b.id = g.id and b.user_id = v_owner;
  insert into public.exercise_goals overriding system value
    select b.* from public.bak_tkx20261114_exercise_goals b where b.user_id = v_owner and not exists (select 1 from public.exercise_goals g where g.id = b.id);
  -- uitrusting en favorieten: groepsrijen van deze eigenaar exact terug naar de back-up.
  delete from public.exercise_equipment q using _tkx_grp x
   where q.exercise_id = x.exercise_id and q.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_exercise_equipment b where b.id = q.id);
  update public.exercise_equipment q set exercise_id = b.exercise_id from public.bak_tkx20261114_exercise_equipment b where b.id = q.id and b.user_id = v_owner;
  insert into public.exercise_equipment select b.* from public.bak_tkx20261114_exercise_equipment b
   where b.user_id = v_owner and not exists (select 1 from public.exercise_equipment q where q.id = b.id);
  delete from public.exercise_favorites f using _tkx_grp x
   where f.exercise_id = x.exercise_id and f.user_id = v_owner and not exists (select 1 from public.bak_tkx20261114_exercise_favorites b where b.exercise_id = f.exercise_id);
  insert into public.exercise_favorites select b.* from public.bak_tkx20261114_exercise_favorites b
   where b.user_id = v_owner and not exists (select 1 from public.exercise_favorites f where f.exercise_id = b.exercise_id);
  -- oefeningen: actief-stand en ratio-anker terug.
  update public.exercises e set active = b.active, ratio_anchor = b.ratio_anchor from public.bak_tkx20261114_exercises b
   where b.id = e.id and (e.active, e.ratio_anchor) is distinct from (b.active, b.ratio_anchor)
     and e.scope = 'personal' and e.created_by = v_owner;
  -- koppelingen: weg, en een eventuele eerdere stand terug.
  delete from public.exercise_catalog_links l using _tkx_map m where l.exercise_id = m.exercise_id and l.user_id = v_owner;
  insert into public.exercise_catalog_links select b.* from public.bak_tkx20261114_exercise_catalog_links b where b.user_id = v_owner
    on conflict do nothing;
  -- controle: geen rij wijkt nog af van de back-up.
  select count(*) into v_n from public.sessions t join public.bak_tkx20261114_sessions b on b.id = t.id where b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  if v_n <> 0 then raise exception 'TKX-REVERSE: sessions niet hersteld'; end if;
  select count(*) into v_n from public.program_block_exercises t join public.bak_tkx20261114_program_block_exercises b on b.id = t.id where b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  if v_n <> 0 then raise exception 'TKX-REVERSE: program_block_exercises niet hersteld'; end if;
  select count(*) into v_n from public.training_exercises t join public.bak_tkx20261114_training_exercises b on b.id = t.id where b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  if v_n <> 0 then raise exception 'TKX-REVERSE: training_exercises niet hersteld'; end if;
  select count(*) into v_n from public.custom_training_exercises t join public.bak_tkx20261114_custom_training_exercises b on b.id = t.id where b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  if v_n <> 0 then raise exception 'TKX-REVERSE: custom_training_exercises niet hersteld'; end if;
  select count(*) into v_n from public.race_segments t join public.bak_tkx20261114_race_segments b on b.id = t.id where b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  if v_n <> 0 then raise exception 'TKX-REVERSE: race_segments niet hersteld'; end if;
  select count(*) into v_n from public.goals t join public.bak_tkx20261114_goals b on b.id = t.id where b.user_id = v_owner and t.exercise_id is distinct from b.exercise_id;
  if v_n <> 0 then raise exception 'TKX-REVERSE: goals niet hersteld'; end if;
  raise notice 'TKX-REVERSE: hersteld';
end $tkx$;
