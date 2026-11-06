-- TK #504 / #603. STAGED migration tested ONLY in isolated PostgreSQL 17.
-- Mount staged migration to /tmp/tk504-typed-fk-stage.sql. All data synthetic.
\set ON_ERROR_STOP on
BEGIN;
create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table auth.users(id uuid primary key);
insert into auth.users(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
create function auth.uid() returns uuid language sql stable as
 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;

create table public.exercises (
 id text primary key,
 name text not null,
 category text not null,
 type text not null,
 scope text not null default 'personal'
   check (scope in ('personal','global','gym')),
 created_by uuid,
 user_id uuid,
 gym_id text,
 active boolean default true
);
alter table public.exercises enable row level security;
grant select,insert,update,delete on public.exercises to authenticated,service_role;
create policy exercise_select on public.exercises for select to authenticated
 using (scope='global' or (scope='personal' and created_by=auth.uid()));
-- Mirrors the actual permissive personal insert, deliberately WITHOUT
-- created_by=auth.uid() check, so the trigger is meaningfully challenged.
create policy exercise_insert on public.exercises for insert to authenticated
 with check (scope='personal' or scope='global');
create policy exercise_change on public.exercises for update to authenticated
 using (true) with check (true);
create policy exercise_delete on public.exercises for delete to authenticated
 using (true);

create table public.sessions(
 id uuid primary key,
 user_id uuid not null,
 exercise_id text references public.exercises(id),
 note text
);
alter table public.sessions enable row level security;
grant select,insert,update,delete on public.sessions to authenticated;
create policy session_owner on public.sessions for all to authenticated
 using (user_id=auth.uid()) with check (user_id=auth.uid());

-- The migration is exercised as the real PostgreSQL admin. It must be a
-- separate, explicit, staged migration and cannot insert any real alias.
\i /tmp/tk504-typed-fk-stage.sql
DO $smoke$
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings)<>0 THEN
   RAISE EXCEPTION 'DDL_ALREADY_GRANTED_ACCESS';
 END IF;
 IF (SELECT count(*) FROM public.exercises)<>0 THEN
   RAISE EXCEPTION 'DDL_INSERTED_EXERCISE';
 END IF;
 IF NOT has_table_privilege('service_role','public.movekit_catalog_fk_bindings','SELECT')
    OR has_table_privilege('service_role','public.movekit_catalog_fk_bindings','INSERT')
    OR has_table_privilege('authenticated','public.movekit_catalog_fk_bindings','SELECT')
    OR has_table_privilege('authenticated','public.movekit_catalog_fk_bindings','INSERT')
    OR has_table_privilege('anon','public.movekit_catalog_fk_bindings','SELECT')
 THEN RAISE EXCEPTION 'UNSAFE_BINDING_TABLE_PRIVILEGES'; END IF;
END
$smoke$;

-- Retain preexisting personal TK-looking records and old sessions.
insert into public.exercises
 (id,name,category,type,scope,created_by,user_id)
 values('TK-000038','synthetic personal historical name','Strength','strength',
        'personal','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.sessions(id,user_id,exercise_id,note)
 values('aaaaaaaa-0000-4000-8000-000000000001',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','TK-000038','historical unchanged');

-- Admin-only synthetic provisioning, 582 technical *inactive* global FK
-- placeholders; they never appear in the user's existing picker.
insert into public.exercises(id,name,category,type,scope,created_by,user_id,gym_id,active)
 select 'TKC-'||lpad(n::text,6,'0'),'Technical FK placeholder',
   'system','strength','global',null,null,null,false
 from generate_series(1,582) n;
insert into public.movekit_catalog_fk_bindings(catalog_id,exercise_id,provider_id)
 select 'TK-'||lpad(n::text,6,'0'),'TKC-'||lpad(n::text,6,'0'),
   'synthetic-vendor-'||lpad(n::text,6,'0')
 from generate_series(1,582) n;
DO $smoke$
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings)<>582 THEN
   RAISE EXCEPTION 'BINDING_COUNT';
 END IF;
 IF (SELECT count(*) FROM public.exercises WHERE scope='global' and id like 'TKC-%')<>582
 THEN RAISE EXCEPTION 'FK_COUNT'; END IF;
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE active)<>0
 THEN RAISE EXCEPTION 'CATALOG_RELEASED_WITHOUT_REVIEW'; END IF;
 IF (SELECT count(*) FROM public.exercises WHERE id='TK-000038' AND scope='personal')<>1
 THEN RAISE EXCEPTION 'OLD_PERSONAL_ID_CHANGED'; END IF;
 IF (SELECT count(*) FROM public.sessions WHERE exercise_id='TK-000038')<>1
 THEN RAISE EXCEPTION 'OLD_HISTORY_CHANGED'; END IF;
END
$smoke$;

-- Even though the globally reserved FK now exists, unreviewed catalog
-- logging is blocked at the database boundary, not merely by client flags.
DO $smoke$
declare caught boolean:=false;
begin
  begin
    insert into public.sessions(id,user_id,exercise_id,note) values
     ('aaaaaaaa-0000-4000-8000-000000000004',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'TKC-000227','invalid unreviewed row');
  exception when check_violation then caught:=true; end;
  if not caught then raise exception 'UNREVIEWED_CATALOG_SESSION_ALLOWED'; end if;
end $smoke$;
-- One explicitly reviewed synthetic binding is enough for shared FK sessions,
-- and does not release any media or the other 581 catalog entries.
update public.movekit_catalog_fk_bindings
 set reviewed_at=clock_timestamp(),active=true
 where catalog_id='TK-000038';
-- Canonical new sessions can reference ONE shared global FK alias, while
-- session RLS continues to own/isolate actual results.
insert into public.sessions(id,user_id,exercise_id,note) values
 ('aaaaaaaa-0000-4000-8000-000000000002',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','TKC-000038','synthetic A'),
 ('bbbbbbbb-0000-4000-8000-000000000002',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','TKC-000038','synthetic B');

-- A deliberately UNSAFE SECURITY DEFINER owned by postgres mimics a
-- potential future privileged RPC. The alias trigger must STILL refuse
-- it when the request carries an authenticated user's uid.
create function public.tk504_untrusted_definer_probe(target_id text)
returns void language plpgsql security definer set search_path=pg_catalog as $probe$
begin
 update public.exercises set name='unsafe-definer-write' where id=target_id;
end $probe$;
grant execute on function public.tk504_untrusted_definer_probe(text) to authenticated,service_role;

-- RLS user A and malicious UPDATE/DELETE/INSERT attempt against both aliases.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select set_config('request.jwt.claim.role','authenticated',true);
set role authenticated;
DO $smoke$
declare
  caught boolean;
begin
 if (select count(*) from public.exercises where scope='global' and id like 'TKC-%')<>582
 THEN RAISE EXCEPTION 'USER_A_CANNOT_SEE_GLOBAL_ALIAS'; END IF;
 if (select count(*) from public.sessions)<>2 THEN
   RAISE EXCEPTION 'USER_A_SESSIONS_RLS'; END IF;
 if public.tk504_resolve_catalog_fk('TK-000038','synthetic-vendor-000038')
       is distinct from 'TKC-000038' then
   raise exception 'USER_A_APPROVED_BINDING_NOT_RESOLVED'; end if;
 if public.tk504_resolve_catalog_fk('TK-000038','wrong-provider') is not null then
   raise exception 'PROVIDER_SPOOFED_BINDING_RESOLVED'; end if;
 if public.tk504_resolve_catalog_fk('TK-000227','synthetic-vendor-000227') is not null then
   raise exception 'UNREVIEWED_BINDING_RESOLVED'; end if;
 if public.tk504_historical_catalog_id('TKC-000038') is distinct from 'TK-000038'
 then raise exception 'OWNER_A_HISTORICAL_CATALOG_ID_UNAVAILABLE'; end if;
 if public.tk504_historical_catalog_id('TKC-000227') is not null
 then raise exception 'UNKNOWN_HISTORY_CATALOG_LEAK'; end if;
 caught:=false;
 begin
   insert into public.exercises(id,name,category,type,scope,created_by)
    values('TKC-000583','forged alias','system','strength','personal',
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 exception when insufficient_privilege then caught:=true; end;
 if not caught THEN RAISE EXCEPTION 'USER_INSERTED_RESERVED_ALIAS'; END IF;
 caught:=false;
 begin
   update public.exercises set name='forged' where id='TKC-000038';
 exception when insufficient_privilege then caught:=true; end;
 if not caught THEN RAISE EXCEPTION 'USER_UPDATED_RESERVED_ALIAS'; END IF;
 caught:=false;
 begin
   delete from public.exercises where id='TKC-000038';
 exception when insufficient_privilege then caught:=true; end;
 if not caught THEN RAISE EXCEPTION 'USER_DELETED_RESERVED_ALIAS'; END IF;
 caught:=false;
 begin
   perform public.tk504_untrusted_definer_probe('TKC-000038');
 exception when insufficient_privilege then caught:=true; end;
 if not caught THEN RAISE EXCEPTION 'DEFINER_USER_BYPASSED_FK_GUARD'; END IF;
 caught:=false;
 begin
   insert into public.sessions(id,user_id,exercise_id)
     values('bbbbbbbb-0000-4000-8000-000000000003',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','TKC-000038');
 exception when insufficient_privilege then caught:=true; end;
 if not caught THEN RAISE EXCEPTION 'USER_FORGED_OTHER_OWNER_SESSION'; END IF;
end
$smoke$;
reset role;

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
set role authenticated;
DO $smoke$
BEGIN
 IF (SELECT count(*) FROM public.sessions)<>1 THEN
   RAISE EXCEPTION 'USER_B_SESSIONS_RLS'; END IF;
 IF (SELECT count(*) FROM public.exercises WHERE id='TK-000038')<>0 THEN
   RAISE EXCEPTION 'PERSONAL_A_VISIBLE_TO_B'; END IF;
 IF public.tk504_historical_catalog_id('TKC-000038') is distinct from 'TK-000038'
 THEN RAISE EXCEPTION 'OWNER_B_HISTORICAL_CATALOG_ID_UNAVAILABLE'; END IF;
 IF public.tk504_historical_catalog_id('TKC-000227') is not null
 THEN RAISE EXCEPTION 'OWNER_B_OTHER_HISTORY_LEAK'; END IF;
END $smoke$;
reset role;

-- Service role SELECT only: can check binding but can neither create nor
-- activate a binding (even though BYPASSRLS).
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','service_role',true);
set role service_role;
DO $smoke$
declare caught boolean:=false;
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings)<>582 THEN
   RAISE EXCEPTION 'SERVICE_CANNOT_READ_BINDINGS'; END IF;
 begin
   update public.movekit_catalog_fk_bindings set active=true
   where catalog_id='TK-000038';
 exception when insufficient_privilege then caught:=true; end;
 IF NOT caught THEN RAISE EXCEPTION 'SERVICE_CHANGED_RELEASE_PERMISSION'; END IF;
 caught:=false;
 begin
   perform public.tk504_untrusted_definer_probe('TKC-000038');
 exception when insufficient_privilege then caught:=true; end;
 IF NOT caught THEN RAISE EXCEPTION 'SERVICE_DEFINER_CHANGED_ALIAS'; END IF;
 caught:=false;
 begin
   perform public.tk504_resolve_catalog_fk('TK-000038','synthetic-vendor-000038');
 exception when insufficient_privilege then caught:=true; end;
 if not caught then raise exception 'SERVICE_ROLE_WAS_GRANTED_CLIENT_BINDING_RPC'; end if;
 caught:=false;
 begin
   perform public.tk504_historical_catalog_id('TKC-000038');
 exception when insufficient_privilege then caught:=true; end;
 if not caught then raise exception 'SERVICE_ROLE_GRANTED_HISTORICAL_RPC'; end if;
END $smoke$;
reset role;
select set_config('request.jwt.claim.role','',true);

-- Revocation blocks NEW sessions immediately but leaves already saved
-- workout history editable/unchanged. There is no mass history migration.
update public.movekit_catalog_fk_bindings set active=false
 where catalog_id='TK-000038';
DO $smoke$
declare caught boolean:=false;
begin
 begin
  insert into public.sessions(id,user_id,exercise_id,note) values
   ('aaaaaaaa-0000-4000-8000-000000000005',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'TKC-000038','unlicensed after revocation');
 exception when check_violation then caught:=true; end;
 if not caught then raise exception 'REVOKED_BINDING_STILL_ALLOWS_NEW_LOG'; end if;
 update public.sessions set exercise_id='TKC-000038',note='existing row still editable'
   where id='aaaaaaaa-0000-4000-8000-000000000002';
 if not found then raise exception 'EXISTING_SESSION_LOST_ON_REVOCATION'; end if;
 if (select count(*) from public.sessions where exercise_id='TKC-000038')<>2
 then raise exception 'HISTORICAL_TYPED_SESSIONS_CHANGED'; end if;
end $smoke$;
-- History is independently accessible after revocation only to its owner.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
set role authenticated;
DO $smoke$
BEGIN
 IF public.tk504_historical_catalog_id('TKC-000038') is distinct from 'TK-000038'
 THEN RAISE EXCEPTION 'REVOKED_ALIAS_ERASED_OWNER_HISTORY'; END IF;
 IF public.tk504_resolve_catalog_fk('TK-000038','synthetic-vendor-000038') is not null
 THEN RAISE EXCEPTION 'REVOKED_ALIAS_ACTIVE_LOGGING_STILL_ALLOWED'; END IF;
END $smoke$;
reset role;
select set_config('request.jwt.claim.sub','',true);

-- Admin constraint checks: source mapping must exactly match the FK ID, and
-- activation without review is forbidden.
DO $smoke$
declare caught boolean:=false;
begin
 begin
  insert into public.movekit_catalog_fk_bindings(catalog_id,exercise_id,provider_id)
  values('TK-000999','TKC-000999','synthetic-bad');
 exception when check_violation then caught:=true; end;
 if not caught then raise exception 'OUT_OF_RANGE_CATALOG_ALLOWED'; end if;
 caught:=false;
 begin
  update public.movekit_catalog_fk_bindings
    set active=true where catalog_id='TK-000227';
 exception when check_violation then caught:=true; end;
 if not caught then raise exception 'UNREVIEWED_ACTIVATION_ALLOWED'; end if;
end
$smoke$;
select 'TK504 typed FK admin-only schema + RLS + 582 aliases + two owners + deny-by-default + preserved historical row PASS' AS result;
ROLLBACK;
