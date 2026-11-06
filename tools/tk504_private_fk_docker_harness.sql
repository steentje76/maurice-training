-- TK504 #603: disposable local Docker 17 harness. SYNTHETIC user history.
-- Requires /tmp/tk504-typed-fk-stage.sql (unapplied draft migration)
-- and /tmp/tk504-private-rollback-only.sql (generated private proof).
-- Run only inside --network none disposable Docker; NEVER on Supabase.
\set ON_ERROR_STOP on
create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create function auth.uid() returns uuid language sql stable as
  'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
create table public.exercises(
  id text primary key,
  name text not null,
  category text not null,
  type text not null,
  scope text not null default 'personal'
    check (scope in ('personal','gym','global')),
  active boolean default true,
  created_by uuid,
  user_id uuid,
  gym_id text
);
create table public.sessions(
 id uuid primary key,
 user_id uuid not null,
 exercise_id text references public.exercises(id),
 note text
);
insert into public.exercises
 (id,name,category,type,scope,created_by,user_id)
values
 ('TK-000038','SYNTHETIC LEGACY USER ROW','strength','strength','personal',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.sessions(id,user_id,exercise_id,note)
values('aaaaaaaa-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','TK-000038',
  'synthetic legacy history that must remain untouched');
\i /tmp/tk504-typed-fk-stage.sql
\i /tmp/tk504-private-rollback-only.sql
DO $qa$
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings)<>0 THEN
  RAISE EXCEPTION 'PRIVATE_DRYRUN_LEFT_BINDINGS_BEHIND';
 END IF;
 IF (SELECT count(*) FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$')<>0 THEN
  RAISE EXCEPTION 'PRIVATE_DRYRUN_LEFT_EXERCISE_ALIASES_BEHIND';
 END IF;
 IF (SELECT count(*) FROM public.exercises
      WHERE id='TK-000038' AND scope='personal')<>1 THEN
  RAISE EXCEPTION 'PRIVATE_DRYRUN_CHANGED_EXISTING_PERSONAL_ROW';
 END IF;
 IF (SELECT count(*) FROM public.sessions
      WHERE exercise_id='TK-000038'
        AND note='synthetic legacy history that must remain untouched')<>1 THEN
  RAISE EXCEPTION 'PRIVATE_DRYRUN_CHANGED_HISTORICAL_SESSION';
 END IF;
END $qa$;
select 'TK504_DOCKER_582_REAL_SOURCE_FK_DRY_RUN_ROLLBACK_VERIFIED' as result;
