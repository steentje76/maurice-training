-- tools/verify-f-sec-002.sql — rollback-veilige verificatie van F-SEC-002 (AI-quota). Draai in de SQL-editor;
-- eindigt met ROLLBACK. Gebruikt feature 'ai_coach' in periode 2000-01-01 (nooit een echte maand) en de twee
-- oudste accounts, alleen binnen de transactie. Verwacht na migratie_v573: client-compensatie GEWEIGERD, quota na
-- volle stand blijft geweigerd, server-compensatie (service_role) werkt met vloer 0, geen cross-user effect.
begin;
create temp table _r(k text, v text) on commit drop;
grant all on _r to authenticated, anon, service_role;
do $t$
declare a uuid; b uuid; r text; ok boolean; n int; f text := 'ai_coach'; d date := date '2000-01-01';
begin
  select id into a from auth.users order by created_at limit 1;
  select id into b from auth.users where id <> a order by created_at limit 1;
  insert into public.usage_log (user_id, feature_key, periode, aantal) values (b, f, d, 5);
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role','authenticated')::text, true);
  set local role authenticated;
  select toegestaan into ok from public.check_and_increment_usage(f, d, 1); insert into _r values ('P1 verbruik binnen quota', ok::text);
  select toegestaan into ok from public.check_and_increment_usage(f, d, 1); insert into _r values ('N1 verbruik boven quota', ok::text);
  begin perform public.decrement_usage(f, d); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N2 client decrement_usage', r);
  begin perform public.decrement_usage_for_user(a, f, d); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N3 client decrement_usage_for_user (eigen id)', r);
  begin perform public.decrement_usage_for_user(b, f, d); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N4 client decrement_usage_for_user (forged id B)', r);
  select toegestaan into ok from public.check_and_increment_usage(f, d, 1); insert into _r values ('N5 na geweigerde compensatie nog steeds vol', ok::text);
  begin update public.usage_log set aantal = 0 where user_id = a; get diagnostics n = row_count; r := n || ' rijen'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N6 directe UPDATE usage_log', r);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  begin perform public.decrement_usage(f, d); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N7 anon decrement_usage', r);
  begin perform public.decrement_usage_for_user(a, f, d); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N8 anon decrement_usage_for_user', r);
  begin perform public.check_and_increment_usage(f, d, 1); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N9 anon check_and_increment_usage', r);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  set local role service_role;
  begin select public.decrement_usage_for_user(a, f, d) into n; r := 'TOEGESTAAN, stand ' || n; exception when others then r := 'GEWEIGERD: ' || left(sqlerrm, 50); end; insert into _r values ('P2 server-compensatie (service_role)', r);
  begin select public.decrement_usage_for_user(a, f, d) into n; select public.decrement_usage_for_user(a, f, d) into n; r := 'stand ' || n; exception when others then r := 'FOUT'; end; insert into _r values ('P3 herhaalde compensatie vloer 0', r);
  begin perform public.decrement_usage_for_user(null, f, d); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end; insert into _r values ('N10 compensatie zonder gebruiker', r);
  reset role;
  select aantal into n from public.usage_log where user_id = b and feature_key = f and periode = d; insert into _r values ('X1 stand B (cross-user)', n || ' (was 5)');
end $t$;
select * from _r;
rollback;
