-- tools/verify-f-sec-005.sql — rollback-veilige verificatie van F-SEC-005 (tabelrechten). Draai in de SQL-editor;
-- eindigt met ROLLBACK. Verwacht na migratie_v572: alle "GEWEIGERD"-regels geweigerd, "TOEGESTAAN"-regels toegestaan,
-- tellingen 0, probe-tabel zonder TRUNCATE/REFERENCES/TRIGGER voor anon/authenticated. Testidentiteiten: de twee
-- oudste accounts, alleen binnen de transactie.
begin;
set local lock_timeout = '2s';
create temp table _r(k text, v text) on commit drop;
grant all on _r to authenticated, anon, service_role;
do $t$
declare a uuid; b uuid; r text; n0 int; n1 int; t text;
begin
  select id into a from auth.users order by created_at limit 1;
  select id into b from auth.users where id <> a order by created_at limit 1;
  t := 'bak_p_goals'; -- back-uptabel met weinig verkeer; vóór v572 hadden anon/authenticated hier TRUNCATE
  insert into _r select 'tabellen met TRUNCATE/REFERENCES/TRIGGER voor anon/authenticated', count(*)::text
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p') and (
      has_table_privilege('anon', c.oid, 'TRUNCATE') or has_table_privilege('authenticated', c.oid, 'TRUNCATE') or
      has_table_privilege('anon', c.oid, 'REFERENCES') or has_table_privilege('authenticated', c.oid, 'REFERENCES') or
      has_table_privilege('anon', c.oid, 'TRIGGER') or has_table_privilege('authenticated', c.oid, 'TRIGGER'));
  insert into _r select 'tabellen zonder RLS', count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity;
  insert into _r select 'tabellen zonder service_role TRUNCATE', count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p') and not has_table_privilege('service_role', c.oid, 'TRUNCATE');
  execute 'create table public._sec_probe(id int primary key)';
  insert into _r values ('nieuwe tabel: auth TRUNCATE/REFERENCES/TRIGGER', has_table_privilege('authenticated','public._sec_probe','TRUNCATE')||'/'||has_table_privilege('authenticated','public._sec_probe','REFERENCES')||'/'||has_table_privilege('authenticated','public._sec_probe','TRIGGER'));
  insert into _r values ('nieuwe tabel: anon TRUNCATE', has_table_privilege('anon','public._sec_probe','TRUNCATE')::text);
  select count(*) into n0 from public.social_connections;
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role','authenticated')::text, true);
  set local role authenticated;
  begin execute format('truncate table public.%I', t); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end;
  insert into _r values ('authenticated TRUNCATE', r);
  begin execute 'create function pg_temp._sec_t() returns trigger language plpgsql as $f$ begin return new; end $f$';
    execute format('create trigger _sec_trg before insert on public.%I for each row execute function pg_temp._sec_t()', t); r := 'TOEGESTAAN';
  exception when others then r := 'GEWEIGERD'; end;
  insert into _r values ('authenticated CREATE TRIGGER', r);
  begin delete from public.social_connections where (follower_id = a and followee_id = b) or (follower_id = b and followee_id = a);
    insert into public.social_connections (follower_id, followee_id, status) values (a, b, 'pending'); r := 'TOEGESTAAN';
  exception when others then r := 'GEWEIGERD: ' || left(sqlerrm, 60); end;
  insert into _r values ('authenticated legitieme INSERT (eigen volgverzoek, RLS + FK)', r);
  begin insert into public.social_connections (follower_id, followee_id, status) values (b, a, 'pending'); r := 'TOEGESTAAN';
  exception when others then r := 'GEWEIGERD'; end;
  insert into _r values ('authenticated cross-user INSERT (RLS)', r);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  begin execute format('truncate table public.%I', t); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end;
  insert into _r values ('anon TRUNCATE', r);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  set local role service_role;
  begin execute 'truncate table public._sec_probe'; r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end;
  insert into _r values ('service_role TRUNCATE (probe)', r);
  reset role;
end $t$;
select * from _r;
rollback;
