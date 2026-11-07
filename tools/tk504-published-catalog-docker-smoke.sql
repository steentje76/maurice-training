-- TK #504 #603: isolated PostgreSQL 17 staging-only publication security.
-- Synthetic data, offline Docker only. Do NOT run on Supabase.
\set ON_ERROR_STOP on
begin;
create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create function auth.uid() returns uuid language sql stable as
 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
create table public.exercises(
 id text primary key,name text not null,category text not null,type text not null,
 scope text not null default 'personal',active boolean default true,
 created_by uuid,user_id uuid,gym_id text);
create table public.sessions(
 id uuid primary key,user_id uuid not null,
 exercise_id text references public.exercises(id),note text);
insert into public.exercises(id,name,category,type,scope,created_by,user_id)
values('TK-000038','synthetic personal','strength','strength','personal',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.sessions(id,user_id,exercise_id,note)
values('aaaaaaaa-0000-4000-8000-000000000001',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','TK-000038','synthetic history');
\i /tmp/tk504-typed-fk-stage.sql
\i /tmp/tk504-published-catalog-stage.sql
insert into public.exercises(id,name,category,type,scope,active)
values('TKC-000227','Synthetic technical FK','system','strength','global',false);
insert into public.movekit_catalog_fk_bindings
(catalog_id,exercise_id,provider_id)
values('TK-000227','TKC-000227','synthetic-provider');
insert into public.movekit_v2_catalog_publications
(catalog_id,provider_id,metadata)
values('TK-000227','synthetic-provider',jsonb_build_object(
 'catalog_id','TK-000227',
 'source',jsonb_build_object('provider','movekit','provider_id','synthetic-provider'),
 'identity',jsonb_build_object('name','synthetic'),
 'intelligence','{}'::jsonb,'relations','{}'::jsonb,
 'flags','{}'::jsonb,'assets','[]'::jsonb));
do $qa$
declare denied boolean:=false;
begin
 if (select count(*) from public.movekit_v2_catalog_publications where status='published')<>0
 then raise exception 'UNREVIEWED_PUBLICATION'; end if;
 begin
  update public.movekit_v2_catalog_publications
   set status='published',reviewed_at=now(),approved_at=now(),published_at=now()
   where catalog_id='TK-000227';
 exception when check_violation then denied:=true; end;
 if not denied then raise exception 'UNVERIFIED_SESSION_BINDING_PUBLISHED'; end if;
end $qa$;
update public.movekit_catalog_fk_bindings
 set active=true,reviewed_at=now() where catalog_id='TK-000227';
do $qa$
declare denied boolean:=false;
begin
 begin
  update public.movekit_v2_catalog_publications
   set status='published',reviewed_at=now(),published_at=now()
   where catalog_id='TK-000227';
 exception when check_violation then denied:=true; end;
 if not denied then raise exception 'MISSING_OWNER_APPROVAL_PUBLISHED'; end if;
end $qa$;
update public.movekit_v2_catalog_publications
 set status='published',reviewed_at=now(),approved_at=now(),published_at=now()
 where catalog_id='TK-000227';
do $qa$
declare denied boolean:=false;
begin
 if (select count(*) from public.movekit_v2_catalog_publications
     where status='published' and catalog_id='TK-000227')<>1
 then raise exception 'REVIEWED_APPROVED_STAGING_TEST_NOT_PUBLISHED'; end if;
 begin
  update public.movekit_v2_catalog_publications
   set provider_id='forged-provider' where catalog_id='TK-000227';
 exception when check_violation then denied:=true; end;
 if not denied then raise exception 'PROVIDER_FK_MISMATCH_ALLOWED'; end if;
 if (select count(*) from public.sessions where exercise_id='TK-000038')<>1
 then raise exception 'PERSONAL_HISTORY_MUTATED'; end if;
end $qa$;
set role authenticated;
do $qa$
declare denied boolean:=false;
begin
 if has_table_privilege('authenticated','public.movekit_v2_catalog_publications','SELECT')
 then raise exception 'BROWSER_CATALOG_PRIVILEGE_GRANTED'; end if;
 begin
  perform count(*) from public.movekit_v2_catalog_publications;
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'BROWSER_READ_LICENSED_METADATA'; end if;
end $qa$;
reset role;
set role service_role;
do $qa$
begin
 if not has_table_privilege('service_role','public.movekit_v2_catalog_publications','SELECT')
 then raise exception 'BROKER_CANNOT_READ_PUBLISHED_METADATA'; end if;
 if has_table_privilege('service_role','public.movekit_v2_catalog_publications','UPDATE')
 then raise exception 'BROKER_CAN_MUTATE_PUBLICATION'; end if;
 if (select count(*) from public.movekit_v2_catalog_publications)<>1
 then raise exception 'BROKER_CANNOT_READ_LICENSED_METADATA'; end if;
end $qa$;
reset role;
select 'TK504_PRIVATE_CATALOG_PUBLICATION_RLS_ADMIN_ONLY_PASS' as result;
rollback;
