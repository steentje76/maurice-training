-- tools/verify-residual-least-privilege.sql — rollback-veilige verificatie van F-SEC-007/-008/-009. Draai in de
-- SQL-editor; eindigt met ROLLBACK. Let op: de identity-insert (P1) verbruikt één sequencewaarde (normaal gedrag, geen
-- setval; sequences zijn niet transactioneel). Verwacht na migratie_v575: N-regels GEWEIGERD, P-regels TOEGESTAAN,
-- sequence-UPDATE voor anon/authenticated 0, nieuwe sequence zonder UPDATE maar met USAGE.
begin;
create temp table _r(k text, v text) on commit drop;
grant all on _r to authenticated, anon, service_role;
do $t$
declare a uuid; r text; f text := 'ai_coach'; d date := date '2000-01-01';
begin
  select id into a from auth.users order by created_at limit 1;
  insert into _r select 'sequences met UPDATE voor anon/authenticated', count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S' and (case when c.relkind = 'S' then has_sequence_privilege('anon', c.oid, 'UPDATE') or has_sequence_privilege('authenticated', c.oid, 'UPDATE') else false end);
  insert into _r select 'sequences met USAGE voor authenticated', count(*)::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S' and (case when c.relkind = 'S' then has_sequence_privilege('authenticated', c.oid, 'USAGE') else false end);
  execute 'create table public._sec_seq_probe(id bigint generated always as identity primary key, x int)';
  insert into _r select 'nieuwe sequence: authenticated UPDATE/USAGE', has_sequence_privilege('authenticated', pg_get_serial_sequence('public._sec_seq_probe','id')::regclass, 'UPDATE') || '/' || has_sequence_privilege('authenticated', pg_get_serial_sequence('public._sec_seq_probe','id')::regclass, 'USAGE');
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role','authenticated')::text, true);
  set local role authenticated;
  begin perform public.increment_usage(f, d, 1); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N1 authenticated increment_usage', r);
  begin perform public.consume_credit(gen_random_uuid(), 1); r := 'TOEGESTAAN'; exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'uitvoerbaar'; end; insert into _r values ('N2 authenticated consume_credit', r);
  begin insert into public.programs (user_id) values (a); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD: ' || left(sqlerrm, 60); end; insert into _r values ('P1 authenticated identity-insert (programs)', r);
  begin perform public.check_and_increment_usage(f, d, 1); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('P2 authenticated quota-flow (check_and_increment_usage)', r);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  begin perform public.increment_usage(f, d, 1); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N3 anon increment_usage', r);
  begin perform public.consume_credit(gen_random_uuid(), 1); r := 'TOEGESTAAN'; exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'uitvoerbaar'; end; insert into _r values ('N4 anon consume_credit', r);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  set local role service_role;
  begin perform public.consume_credit(gen_random_uuid(), 1); r := 'GEWEIGERD'; exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'TOEGESTAAN (uitvoerbaar)'; end; insert into _r values ('P3 service_role consume_credit uitvoerbaar', r);
  begin perform public.increment_usage(f, d, 1); r := 'TOEGESTAAN (uitvoerbaar)'; exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'TOEGESTAAN (uitvoerbaar)'; end; insert into _r values ('P4 service_role increment_usage uitvoerbaar', r);
  reset role;
end $t$;
select * from _r;
rollback;
