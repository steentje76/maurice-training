-- TK504 isolated Postgres test: ONLY run in disposable local Docker database.
-- Preconditions: create synthetic auth.users / roles, copy staged migration to /tmp.
\set ON_ERROR_STOP on
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111');
\i /tmp/tk504-grants.sql
INSERT INTO public.movekit_media_grants(user_id, grant_reference)
VALUES ('11111111-1111-4111-8111-111111111111', 'TK504-20261105-001');
DO $$
DECLARE
  grant_active boolean;
  rls_enabled boolean;
  grant_count bigint;
  rejected boolean := false;
BEGIN
  SELECT active INTO grant_active FROM public.movekit_media_grants;
  IF grant_active IS DISTINCT FROM false THEN RAISE EXCEPTION 'DEFAULT_GRANT_NOT_INACTIVE'; END IF;
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class WHERE oid='public.movekit_media_grants'::regclass;
  IF rls_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'RLS_NOT_ENABLED'; END IF;
  IF has_table_privilege('anon', 'public.movekit_media_grants','SELECT') OR
     has_table_privilege('anon', 'public.movekit_media_grants','INSERT') OR
     has_table_privilege('authenticated', 'public.movekit_media_grants','SELECT') OR
     has_table_privilege('authenticated', 'public.movekit_media_grants','UPDATE') OR
     has_table_privilege('authenticated', 'public.movekit_media_grants','DELETE') THEN
    RAISE EXCEPTION 'PUBLIC_OR_USER_GRANT_LEAK'; END IF;
  IF NOT has_table_privilege('service_role', 'public.movekit_media_grants','SELECT') OR
     has_table_privilege('service_role', 'public.movekit_media_grants','INSERT') OR
     has_table_privilege('service_role', 'public.movekit_media_grants','UPDATE') THEN
     RAISE EXCEPTION 'SERVER_GRANT_PERMISSION_ERROR'; END IF;
  BEGIN
    INSERT INTO public.movekit_media_grants(user_id,grant_reference)
    VALUES ('11111111-1111-4111-8111-111111111111', 'TK504-20261105-001');
  EXCEPTION WHEN unique_violation THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'DUPLICATE_ENTITLEMENT_ACCEPTED'; END IF;
  rejected:=false;
  BEGIN
    UPDATE public.movekit_media_grants
    SET active=true, revoked_at=now();
  EXCEPTION WHEN check_violation THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'ACTIVE_AND_REVOKED_ACCEPTED'; END IF;
  SELECT count(*) INTO grant_count FROM public.movekit_media_grants;
  IF grant_count <> 1 THEN RAISE EXCEPTION 'SYNTHETIC_GRANT_ROWS_CHANGED'; END IF;
  RAISE NOTICE 'TK504_DOCKER_GRANTS_PASS: inactive default, RLS, no browser access, server read-only, uniqueness, revocation consistency';
END
$$;
