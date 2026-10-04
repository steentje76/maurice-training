-- tools/verify-hrv-single-writer.sql — rollback-veilige verificatie van de HRV single-writer-invariant
-- (migratie_v579). Draai in de SQL-editor; eindigt met ROLLBACK, er blijft niets achter.
-- Alle writes gebruiken de schildwachtdatum 1900-01-01, zodat geen bestaande dagrij wordt geraakt.
-- Testidentiteiten: twee vaste, synthetische UUID's (versie-nibble 0, dus nooit door auth/gen_random_uuid
-- uitgegeven). Er wordt GEEN echt account gekozen of aangeraakt. Dat kan omdat hrv_log.user_id geen FK naar
-- auth.users heeft en upsert_daily_health het bestaan van de gebruiker niet controleert (live vastgesteld
-- 2026-10-04). Bestaat een van beide UUID's toch als account of als hrv_log-rij, dan breekt het script af
-- vóór de eerste write.
-- Verwacht NA migratie_v579: elke regel eindigt op de waarde tussen haakjes in de omschrijving.
-- VOOR migratie_v579 tonen de regels 10-12 en 20-21 "TOEGESTAAN"/"GEWEIGERD (RLS)": dat is de te sluiten opening.
begin;
set local lock_timeout = '2s';
create temp table _r(k text, v text) on commit drop;
grant all on _r to authenticated, anon, service_role;
do $t$
declare
  a uuid := '00000000-0000-0000-0000-00000000a579';
  b uuid := '00000000-0000-0000-0000-00000000b579';
  r text; d date := date '1900-01-01';
begin
  if exists (select 1 from auth.users where id in (a, b)) or exists (select 1 from public.hrv_log where user_id in (a, b)) then
    raise exception 'verify-hrv-single-writer: synthetische testidentiteit bestaat als account of hrv_log-rij; afgebroken zonder write';
  end if;
  insert into _r values ('00 synthetische testidentiteiten: geen account, geen hrv_log-rij (true)', 'true');

  insert into _r select '01 mutatierechten anon/authenticated op hrv_log (0)', count(*)::text
    from unnest(array['anon','authenticated']) rol, unnest(array['INSERT','UPDATE','DELETE','TRUNCATE']) recht
    where has_table_privilege(rol, 'public.hrv_log', recht);
  insert into _r values ('02 authenticated SELECT op hrv_log (true)', has_table_privilege('authenticated', 'public.hrv_log', 'SELECT')::text);
  insert into _r values ('03 service_role SELECT/INSERT/UPDATE/DELETE (true)', (has_table_privilege('service_role', 'public.hrv_log', 'SELECT')
    and has_table_privilege('service_role', 'public.hrv_log', 'INSERT') and has_table_privilege('service_role', 'public.hrv_log', 'UPDATE')
    and has_table_privilege('service_role', 'public.hrv_log', 'DELETE'))::text);
  insert into _r select '04 RLS aan op hrv_log (true)', relrowsecurity::text from pg_class where oid = 'public.hrv_log'::regclass;
  insert into _r select '05 upsert_daily_health: aantal functies/SECURITY DEFINER/search_path (1/true/true)',
    count(*)::text || '/' || bool_and(prosecdef)::text || '/' || bool_and(proconfig::text like '%search_path=%')::text
    from pg_proc where pronamespace = 'public'::regnamespace and proname = 'upsert_daily_health';
  insert into _r select '06 EXECUTE anon/authenticated/service_role (false/true/true)',
    has_function_privilege('anon', oid, 'EXECUTE')::text || '/' || has_function_privilege('authenticated', oid, 'EXECUTE')::text || '/' || has_function_privilege('service_role', oid, 'EXECUTE')::text
    from pg_proc where pronamespace = 'public'::regnamespace and proname = 'upsert_daily_health';
  insert into _r select '07 andere functies die naar hrv_log schrijven (0)', count(*)::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog', 'information_schema') and p.prokind = 'f' and p.proname <> 'upsert_daily_health'
      and p.prosrc ~* '(insert\s+into|update|delete\s+from)\s+(public\.)?hrv_log\M';

  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.hrv_log (user_id, date, hrv) values (a, d, 50); r := 'TOEGESTAAN';
  exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'FOUT ' || sqlstate; end;
  insert into _r values ('10 authenticated directe INSERT eigen rij (GEWEIGERD)', r);
  begin update public.hrv_log set note = note where user_id = a and date = d; r := 'TOEGESTAAN';
  exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'FOUT ' || sqlstate; end;
  insert into _r values ('11 authenticated directe UPDATE eigen rij (GEWEIGERD)', r);
  begin delete from public.hrv_log where user_id = a and date = d; r := 'TOEGESTAAN';
  exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'FOUT ' || sqlstate; end;
  insert into _r values ('12 authenticated directe DELETE eigen rij (GEWEIGERD)', r);
  begin perform public.upsert_daily_health(a, d, 50, null, null, null, null, null, 'manual'); r := 'TOEGESTAAN';
  exception when others then r := 'GEWEIGERD ' || sqlstate; end;
  insert into _r values ('13 authenticated RPC eigen gebruiker (TOEGESTAAN)', r);
  begin perform public.upsert_daily_health(a, d, null, 55, null, null, null, null, 'wearable');
    select hrv::int || '/' || hrv_source || '/' || rhr || '/' || rhr_source into r from public.hrv_log where user_id = a and date = d;
  exception when others then r := 'FOUT ' || sqlstate; end;
  insert into _r values ('14 gedeeltelijke RPC behoudt waarde en bron per veld (50/manual/55/wearable)', r);
  begin perform public.upsert_daily_health(b, d, 50); r := 'TOEGESTAAN';
  exception when others then r := 'GEWEIGERD'; end;
  insert into _r values ('15 authenticated RPC voor andere gebruiker (GEWEIGERD)', r);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  begin insert into public.hrv_log (user_id, date, hrv) values (a, d, 50); r := 'TOEGESTAAN';
  exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'GEWEIGERD (RLS)'; end;
  insert into _r values ('20 anon directe INSERT (GEWEIGERD)', r);
  begin update public.hrv_log set note = note where date = d; r := 'TOEGESTAAN';
  exception when insufficient_privilege then r := 'GEWEIGERD'; when others then r := 'FOUT ' || sqlstate; end;
  insert into _r values ('21 anon directe UPDATE (GEWEIGERD)', r);
  begin perform public.upsert_daily_health(a, d, 50); r := 'TOEGESTAAN';
  exception when others then r := 'GEWEIGERD'; end;
  insert into _r values ('22 anon RPC (GEWEIGERD)', r);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  set local role service_role;
  begin perform public.upsert_daily_health(b, d, 61, null, null, null, null, null, 'wearable'); r := 'TOEGESTAAN';
  exception when others then r := 'GEWEIGERD ' || sqlstate; end;
  insert into _r values ('30 service_role RPC (wearable-sync) (TOEGESTAAN)', r);
  begin delete from public.hrv_log where user_id = b and date = d; r := 'TOEGESTAAN';
  exception when others then r := 'GEWEIGERD ' || sqlstate; end;
  insert into _r values ('31 service_role DELETE (accountverwijdering) (TOEGESTAAN)', r);
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $t$;
select k, v from _r order by k;
rollback;
