-- Read-only verificatie privileged functions (security audit). Draai na elke migratie die functies raakt.
-- Verwacht: anon_executable_secdef = 0, public_executable_secdef = 0, secdef_without_search_path = 0,
-- en de vijf v570-functies uitvoerbaar door authenticated + service_role, niet door anon.
select
  count(*) filter (where p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_executable_secdef,
  count(*) filter (where p.prosecdef and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                                                 where a.grantee = 0 and a.privilege_type = 'EXECUTE')) as public_executable_secdef,
  count(*) filter (where p.prosecdef and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))) as secdef_without_search_path
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';

select p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role,
  p.prosecdef as security_definer, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('upsert_daily_health','schedule_my_training','get_or_create_direct_thread','upsert_endurance_profile_target','is_thread_participant')
order by 1;
