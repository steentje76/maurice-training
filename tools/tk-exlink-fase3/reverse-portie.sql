-- DEC-EXLINK-005 fase 3b — portie terugdraaien (alleen na expliciet besluit), met dezelfde _p3_map:
--   begin; select set_config('tk.exlink_owner','<uuid>',true); \i portieN.sql; \i reverse-portie.sql; commit;
-- Herstelt sessies, doelen, rusttijd, actief-stand, ratio-anker, verwijzingen, snapshots en koppeling uit bak_tkx3_*.
-- Snapshots worden per rij uit de back-up teruggezet (alle porties): alleen gebruiken voor de laatste portie. Sessies die ná de migratie
-- op het MoveKit-id zijn gelogd blijven daar staan.
do $r$
declare v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid;
begin
  if v_owner is null then raise exception 'P3R: tk.exlink_owner ontbreekt'; end if;
  update public.sessions s set exercise_id = b.exercise_id
    from public.bak_tkx3_sessions b join _p3_map m on m.exercise_id = b.exercise_id
   where s.id = b.id and s.user_id = v_owner;
  delete from public.exercise_goals g using _p3_map m
   where g.user_id = v_owner and g.exercise_id in (m.exercise_id, m.catalog_id, 'TKC-' || substring(m.catalog_id from 4));
  insert into public.exercise_goals select b.* from public.bak_tkx3_exercise_goals b join _p3_map m
      on b.exercise_id in (m.exercise_id, m.catalog_id, 'TKC-' || substring(m.catalog_id from 4))
   where b.user_id = v_owner on conflict do nothing;
  delete from public.exercise_rest_settings t using _p3_map m
   where t.user_id = v_owner and t.exercise_id in (m.exercise_id, 'TKC-' || substring(m.catalog_id from 4));
  insert into public.exercise_rest_settings select b.* from public.bak_tkx3_exercise_rest_settings b join _p3_map m
      on b.exercise_id in (m.exercise_id, 'TKC-' || substring(m.catalog_id from 4))
   where b.user_id = v_owner on conflict do nothing;
  update public.exercises e set active = b.active, ratio_anchor = b.ratio_anchor from public.bak_tkx3_exercises b
   where e.id = b.id and (b.id in (select exercise_id from _p3_map) or b.ratio_anchor in (select exercise_id from _p3_map where exercise_id <> catalog_id));
  -- Verwijzingen E → C terugzetten (alleen E ≠ C), per rij uit de back-up.
  update public.program_block_exercises t set exercise_id = b.exercise_id from public.bak_tkx3_program_block_exercises b join _p3_map m on m.exercise_id = b.exercise_id
   where t.id = b.id and t.user_id = v_owner;
  update public.training_exercises t set exercise_id = b.exercise_id from public.bak_tkx3_training_exercises b join _p3_map m on m.exercise_id = b.exercise_id
   where t.id = b.id and t.user_id = v_owner;
  update public.custom_training_exercises t set exercise_id = b.exercise_id from public.bak_tkx3_custom_training_exercises b join _p3_map m on m.exercise_id = b.exercise_id
   where t.id = b.id and t.user_id = v_owner;
  update public.race_segments t set exercise_id = b.exercise_id from public.bak_tkx3_race_segments b join _p3_map m on m.exercise_id = b.exercise_id
   where t.id = b.id and t.user_id = v_owner;
  update public.goals t set exercise_id = b.exercise_id from public.bak_tkx3_goals b join _p3_map m on m.exercise_id = b.exercise_id
   where t.id = b.id and t.user_id = v_owner;
  update public.exercise_equipment t set exercise_id = b.exercise_id from public.bak_tkx3_exercise_equipment b join _p3_map m on m.exercise_id = b.exercise_id
   where t.id = b.id and t.user_id = v_owner;
  delete from public.exercise_favorites f using public.bak_tkx3_exercise_favorites b join _p3_map m on m.exercise_id = b.exercise_id
   where f.user_id = v_owner and b.user_id = v_owner and f.exercise_id = m.catalog_id;
  insert into public.exercise_favorites select b.* from public.bak_tkx3_exercise_favorites b join _p3_map m on m.exercise_id = b.exercise_id
   where b.user_id = v_owner on conflict do nothing;
  update public.training_instances t set snapshot = b.snapshot from public.bak_tkx3_training_instances b where t.id = b.id and t.user_id = v_owner;
  update public.planned_training_occurrences t set definition_snapshot = b.definition_snapshot from public.bak_tkx3_planned_training_occurrences b where t.id = b.id and t.creator_user_id = v_owner;
  update public.program_regeneration_log t set replaced_blocks_snapshot = b.replaced_blocks_snapshot from public.bak_tkx3_program_regeneration_log b where t.id = b.id and t.user_id = v_owner;
  update public.custom_trainings t set metadata = b.metadata from public.bak_tkx3_custom_trainings b where t.id = b.id and t.user_id = v_owner;
  update public.training_context t set avoid_exercises = b.avoid_exercises from public.bak_tkx3_training_context b where t.user_id = b.user_id and t.user_id = v_owner;
  update public.exercise_catalog_links l set migrated_at = b.migrated_at
    from public.bak_tkx3_exercise_catalog_links b join _p3_map m on m.exercise_id = b.exercise_id
   where l.user_id = v_owner and b.user_id = v_owner and l.exercise_id = b.exercise_id;
  raise notice 'P3R: portie teruggezet';
end $r$;
