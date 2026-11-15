-- DEC-EXLINK-005 fase 3b — portie terugdraaien (alleen na expliciet besluit), met dezelfde _p3_map:
--   begin; select set_config('tk.exlink_owner','<uuid>',true); \i portieN.sql; \i reverse-portie.sql; commit;
-- Herstelt sessies, doelen, rusttijd, actief-stand en koppeling uit bak_tkx3_*. Sessies die ná de migratie
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
  update public.exercises e set active = b.active from public.bak_tkx3_exercises b join _p3_map m on m.exercise_id = b.id
   where e.id = b.id;
  update public.exercise_catalog_links l set migrated_at = b.migrated_at
    from public.bak_tkx3_exercise_catalog_links b join _p3_map m on m.exercise_id = b.exercise_id
   where l.user_id = v_owner and b.user_id = v_owner and l.exercise_id = b.exercise_id;
  raise notice 'P3R: portie teruggezet';
end $r$;
