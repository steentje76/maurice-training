-- migratie_v579.sql — HRV single-writer, Phase 2: de database dwingt de canonieke writer af.
--
-- Phase 1 (PR #513, v4.70.8) bracht alle applicatieroutes naar public.upsert_daily_health (check-in,
-- wearable-sync, bestand-import). De database zelf stond een directe mutatie nog toe.
--
-- Live baseline 2026-10-04 (read-only vastgesteld, PostgreSQL 17.6):
--   public.hrv_log: owner postgres, RLS aan; ACL anon=arwdm, authenticated=arwdm, service_role=arwdDxtm.
--   Policy eigen_data_alleen (ALL, rol public): user_id = auth.uid(). Geen views, FK's, publicaties of andere
--   functies die hrv_log aanspreken; geen pg_cron, pg_graphql of pg_net.
--   public.upsert_daily_health(uuid,date,numeric,integer,numeric,text,text,text,text,integer): SECURITY DEFINER,
--   owner postgres (tabel-owner, BYPASSRLS), search_path=public, EXECUTE alleen authenticated + service_role (v570).
--
-- Root cause: pg_default_acl van rol postgres in schema public geeft anon/authenticated INSERT/UPDATE/DELETE op
-- elke nieuwe tabel; RLS was de enige begrenzing. Een ingelogde gebruiker kon daardoor via een directe REST-call
-- zijn eigen hrv_log-rijen invoegen, wijzigen of verwijderen buiten de bronvalidatie, de per-veld COALESCE-merge
-- en de per-veld provenance van upsert_daily_health om.
--
-- Wijziging (alleen tabelrechten op public.hrv_log):
--   INSERT, UPDATE, DELETE en TRUNCATE intrekken van anon, authenticated en PUBLIC.
-- Behouden: SELECT (leesflows + RLS), alle rechten van service_role (wearable-sync via de RPC; accountverwijdering
-- en cleanup-unverified-accounts doen DELETE met de service-role-sleutel), RLS en policies, de functie zelf.
-- De functie is niet afhankelijk van tabelrechten van de aanroeper: zij draait als owner. De EXECUTE-rechten uit
-- v570 worden hieronder herhaald zodat het contract op één plek leesbaar is; dat verandert niets aan de live stand.
--
-- Bewust NIET gewijzigd: functiebody, RLS-policies, default privileges (andere tabellen), MAINTAIN, SELECT van anon
-- (levert door RLS geen rijen op), service_role.
--
-- Gevolg voor clients: versies van vóór v4.70.8 die nog rechtstreeks naar hrv_log schrijven (o.a. de bestand-import
-- t/m v4.70.7) krijgen 403/42501 op die ene write en melden die als mislukt. Geen dataverlies, geen datawijziging.
--
-- Idempotent: revoke/grant zijn herhaalbaar. De afsluitende controle laat de migratie falen (en dus terugdraaien)
-- als de invariant niet geldt.
--
-- Herstel (alleen indien een onvoorziene legitieme directe write blijkt te bestaan):
--   grant insert, update, delete on table public.hrv_log to anon, authenticated;
-- Dat herstelt exact de stand van vóór deze migratie; er wordt geen data geraakt.

revoke insert, update, delete, truncate on table public.hrv_log from anon, authenticated, public;

revoke execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer) from public, anon;
grant  execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer) to authenticated, service_role;

do $$
declare
  fn  regprocedure := 'public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer)'::regprocedure;
  tbl regclass     := 'public.hrv_log'::regclass;
  rol text;
  recht text;
begin
  foreach rol in array array['anon', 'authenticated'] loop
    foreach recht in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
      if has_table_privilege(rol, tbl, recht) then
        raise exception 'HRV single-writer: % heeft nog % op public.hrv_log', rol, recht;
      end if;
    end loop;
  end loop;
  if exists (select 1 from aclexplode((select relacl from pg_class where oid = tbl)) a
             where a.grantee = 0 and a.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')) then
    raise exception 'HRV single-writer: PUBLIC heeft nog een mutatierecht op public.hrv_log';
  end if;
  if not has_table_privilege('authenticated', tbl, 'SELECT') then
    raise exception 'HRV single-writer: authenticated mist SELECT op public.hrv_log (leesflows zouden breken)';
  end if;
  foreach recht in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
    if not has_table_privilege('service_role', tbl, recht) then
      raise exception 'HRV single-writer: service_role mist % op public.hrv_log (wearable-sync/accountverwijdering zouden breken)', recht;
    end if;
  end loop;
  if not (select relrowsecurity from pg_class where oid = tbl) then
    raise exception 'HRV single-writer: RLS staat uit op public.hrv_log';
  end if;
  if not (select prosecdef from pg_proc where oid = fn) then
    raise exception 'HRV single-writer: upsert_daily_health is niet SECURITY DEFINER en zou na deze revoke niet meer kunnen schrijven';
  end if;
  if not exists (select 1 from pg_proc p where p.oid = fn and p.proconfig is not null
                 and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')) then
    raise exception 'HRV single-writer: upsert_daily_health heeft geen vaste search_path';
  end if;
  if not (has_table_privilege((select proowner from pg_proc where oid = fn), tbl, 'INSERT')
          and has_table_privilege((select proowner from pg_proc where oid = fn), tbl, 'UPDATE')) then
    raise exception 'HRV single-writer: de owner van upsert_daily_health kan niet naar public.hrv_log schrijven';
  end if;
  if has_function_privilege('anon', fn, 'EXECUTE') then
    raise exception 'HRV single-writer: anon kan upsert_daily_health uitvoeren';
  end if;
  if exists (select 1 from aclexplode(coalesce((select proacl from pg_proc where oid = fn), acldefault('f', (select proowner from pg_proc where oid = fn)))) a
             where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'HRV single-writer: PUBLIC kan upsert_daily_health uitvoeren';
  end if;
  if not (has_function_privilege('authenticated', fn, 'EXECUTE') and has_function_privilege('service_role', fn, 'EXECUTE')) then
    raise exception 'HRV single-writer: authenticated of service_role mist EXECUTE op upsert_daily_health';
  end if;
end $$;
