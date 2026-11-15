-- DEC-EXLINK-005 — 9 sessies van andere gebruikers op gedeelde oude catalogusoefeningen verwijderen.
-- Besluit eigenaar 15 november 2026: "Alleen de 9 sessies". Accounts en overige data blijven.
-- Vooraf: back-up in bak_tkx20261115_foreign_sessions. Afhankelijke activities: 0 (gecontroleerd).
-- Uitvoeren in één transactie, met de eigenaar-uuid via set_config (staat niet in dit bestand):
--   begin;
--   select set_config('tk.exlink_owner', '<uuid eigenaar>', true);
--   <inhoud hieronder>
--   commit;   -- proefrun: rollback;
do $$
declare
  v_owner uuid := nullif(current_setting('tk.exlink_owner', true), '')::uuid;
  v_ids uuid[] := array[
    '21dd5db9-1f0b-443a-8011-ac39c1d9db55','b6a596f5-5171-48fb-a073-95a59980837f','0041aa9a-f677-4315-8c17-f07264946321',
    'cd8a1f28-35b9-4768-95df-f6e06fdd6d25','c5044559-65ef-4c38-961f-39ad43d36c7d','746ae90b-d0a3-4627-9f26-3513c615e5f6',
    'a8aa4fe6-010b-45b7-a0a0-b8497841f293','805e2ffe-c37c-468b-a5ed-9a6c407dc2f7','32d19eda-762f-4a22-8970-03b91f3849a7']::uuid[];
  v_n int; v_del int;
begin
  if v_owner is null then raise exception 'tk.exlink_owner ontbreekt'; end if;
  -- Voorwaarden: precies deze 9, nooit van de eigenaar, alleen op gekoppelde TK-oefeningen van de eigenaar.
  select count(*) into v_n from public.sessions s
   where s.id = any(v_ids) and s.user_id is distinct from v_owner
     and s.exercise_id in (select l.exercise_id from public.exercise_catalog_links l
                           where l.user_id = v_owner and l.merged_into is null and not l.hidden and l.exercise_id ~ '^TK-[0-9]{6}$');
  if v_n <> 9 then raise exception 'voorwaarde: verwacht 9 sessies, gevonden %', v_n; end if;
  if exists (select 1 from public.activities a where a.session_id = any(v_ids)) then raise exception 'voorwaarde: afhankelijke activities'; end if;

  create table if not exists public.bak_tkx20261115_foreign_sessions (like public.sessions);
  alter table public.bak_tkx20261115_foreign_sessions enable row level security; -- geen policies: alleen beheer
  revoke all on public.bak_tkx20261115_foreign_sessions from public, anon, authenticated;
  insert into public.bak_tkx20261115_foreign_sessions
    select s.* from public.sessions s where s.id = any(v_ids)
      and not exists (select 1 from public.bak_tkx20261115_foreign_sessions b where b.id = s.id);

  delete from public.sessions s where s.id = any(v_ids) and s.user_id is distinct from v_owner;
  get diagnostics v_del = row_count;
  if v_del <> 9 then raise exception 'controle: % verwijderd, verwacht 9', v_del; end if;
  if (select count(*) from public.bak_tkx20261115_foreign_sessions where id = any(v_ids)) <> 9 then raise exception 'controle: back-up onvolledig'; end if;
  raise notice 'controles = geslaagd: 9 sessies verwijderd, back-up bak_tkx20261115_foreign_sessions';
end $$;
