-- DEC-EXLINK-005 — herstel portie 2 voor cardio- en WOD-oefeningen (15 november 2026).
-- Probleem: de app herkent cardio (hardlopen, zwemmen) en WOD alleen aan de eigen oefening (type/id).
-- Een MoveKit-tegel is altijd 'strength'. Na migratie zouden Duurloop, Interval 400m, Tempo Run, de
-- vier zwemslagen en Double Unders als krachtoefening gelogd worden. Er zijn 0 sessies, 0 doelen,
-- 0 programma-/trainingsregels en 0 favorieten op deze 8 geraakt; alleen actief-stand en migrated_at.
-- Herstel: eigen rij weer actief, koppeling niet meer gemigreerd. De inactieve FK-rij voor het
-- catalogus-id blijft staan (onzichtbaar, onschadelijk).
-- Uitvoeren met: begin; select set_config('tk.exlink_owner','<uuid>',true); <dit bestand> commit;
do $r$
declare
  v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid;
  v_ids text[] := array['duurloop','interval_400','tempo_run','swim_rug','swim_school','swim_vlinder','swim_vrij','doubleunders'];
  v_n int;
begin
  if v_owner is null then raise exception 'R2: tk.exlink_owner ontbreekt'; end if;
  select count(*) into v_n from public.exercise_catalog_links where user_id = v_owner and exercise_id = any(v_ids) and migrated_at is not null;
  if v_n <> 8 then raise exception 'R2: verwacht 8 gemigreerde koppelingen, gevonden %', v_n; end if;
  if exists (select 1 from public.sessions where user_id = v_owner and exercise_id in (select 'TKC-' || substring(catalog_id from 4) from public.exercise_catalog_links where user_id = v_owner and exercise_id = any(v_ids))) then
    raise exception 'R2: er staan intussen sessies op het MoveKit-id; eerst handmatig beoordelen'; end if;
  update public.exercises set active = true
   where id = any(v_ids) and scope = 'personal' and created_by = v_owner and not active;
  get diagnostics v_n = row_count;
  if v_n <> 8 then raise exception 'R2: % eigen rijen geactiveerd, verwacht 8', v_n; end if;
  update public.exercise_catalog_links set migrated_at = null where user_id = v_owner and exercise_id = any(v_ids);
  get diagnostics v_n = row_count;
  if v_n <> 8 then raise exception 'R2: % koppelingen hersteld, verwacht 8', v_n; end if;
  raise notice 'R2: 8 cardio/WOD-oefeningen terug op de eigen oefening';
end $r$;
