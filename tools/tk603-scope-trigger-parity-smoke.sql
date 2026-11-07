-- ISOLATED ONLY. Actual captured scope trigger + staged migration, synthetic rows.
-- All changes are rolled back, including the proposal. NEVER run on production.
\set ON_ERROR_STOP on
BEGIN;
\i /tmp/tk603-parity-fixture.sql
\i /tmp/tk504-typed-fk-stage.sql
-- RED: existing captured scope trigger blocks trusted admin provisioning.
DO $proof$
declare caught boolean:=false;
begin
 begin
  insert into public.exercises(id,name,category,type,scope,active)
   values('TKC-000038','Synthetic typed alias','system','strength','global',false);
 exception when raise_exception then
  if SQLERRM not like 'Alleen een gym-owner%' then raise; end if;
  caught:=true;
 end;
 if not caught then raise exception 'Expected actual legacy scope trigger rejection'; end if;
 if exists(select 1 from public.exercises where id='TKC-000038') then raise exception 'Red probe persisted'; end if;
 raise notice 'RED REPRODUCED: captured production scope trigger rejects admin alias INSERT';
end $proof$;
-- Proposal changes ONLY the scope function and only the trusted reserved branch.
-- No trigger is disabled; the staged guard continues to enforce admin provenance.
\i /tmp/tk603-scope-proposal.sql
insert into public.exercises(id,name,category,type,scope,active)
 select 'TKC-'||lpad(n::text,6,'0'),'Synthetic typed alias','system','strength','global',false
 from generate_series(1,582)n;
DO $proof$
declare caught boolean:=false;
begin
 if (select count(*) from public.exercises where id like 'TKC-%' and scope='global' and created_by is null and user_id is null and gym_id is null)<>582
 then raise exception 'Unowned reserved aliases not provisioned'; end if;
 begin
  insert into public.exercises(id,name,category,type,scope)
   values('legacy-admin-global','Synthetic legacy global','strength','strength','global');
 exception when raise_exception then caught:=true; end;
 if not caught then raise exception 'Proposal broadened legacy admin global rules'; end if;
 caught:=false;
 begin
  insert into public.exercises(id,name,category,type,scope)
   values('TKC-000583','Outside reserved manifest','system','strength','global');
 exception when raise_exception then caught:=true; end;
 if not caught then raise exception 'Proposal accepted out-of-manifest alias'; end if;
 raise notice 'GREEN: 582 trusted unowned aliases; legacy global and out-of-range remain denied';
end $proof$;
-- A privileged definer-like context with a client role claim still cannot seed.
select set_config('request.jwt.claim.role','authenticated',true);
DO $proof$
declare caught boolean:=false;
begin
 begin
  insert into public.exercises(id,name,category,type,scope)
   values('TKC-000001','Synthetic claim spoof','system','strength','global');
 exception when insufficient_privilege then caught:=true; end;
 if not caught then raise exception 'Client role claim bypassed trusted context'; end if;
end $proof$;
select set_config('request.jwt.claim.role','',true);
-- Ordinary authenticated legacy INSERT rules are preserved.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select set_config('request.jwt.claim.role','authenticated',true);
set role authenticated;
insert into public.exercises(id,name,category,type,scope,created_by,gym_id)
 values('legacy-personal','Synthetic personal','strength','strength','personal',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','forged-gym');
DO $proof$
declare caught boolean:=false;
begin
 if not exists(select 1 from public.exercises where id='legacy-personal' and created_by=auth.uid() and gym_id is null)
 then raise exception 'Legacy personal ownership trigger altered'; end if;
 begin
  insert into public.exercises(id,name,category,type,scope)
   values('legacy-forbidden-global','Synthetic','strength','strength','global');
 exception when raise_exception then caught:=true; end;
 if not caught then raise exception 'Ordinary athlete gained global rights'; end if;
 caught:=false;
 begin
  insert into public.exercises(id,name,category,type,scope)
   values('TKC-000001','Synthetic forged','strength','strength','global');
 exception when insufficient_privilege then caught:=true; end;
 if not caught then raise exception 'Authenticated client changed reserved aliases'; end if;
end $proof$;
reset role;
-- Existing gym-owner semantics still set creator and clear gym for global.
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
set role authenticated;
insert into public.exercises(id,name,category,type,scope)
 values('legacy-gym','Synthetic gym','strength','strength','gym'),
       ('legacy-global','Synthetic global','strength','strength','global');
DO $proof$
begin
 if not exists(select 1 from public.exercises where id='legacy-gym' and gym_id='synthetic-gym' and created_by=auth.uid())
 then raise exception 'Legacy gym-owner gym semantics changed'; end if;
 if not exists(select 1 from public.exercises where id='legacy-global' and gym_id is null and created_by=auth.uid())
 then raise exception 'Legacy gym-owner global semantics changed'; end if;
 raise notice 'GREEN: captured personal/gym/global rules preserved; authenticated reserved writes denied';
end $proof$;
reset role;
-- Sessions trigger rewrites supplied user_id to current auth.uid(), as production does.
set role authenticated;
insert into public.sessions(id,date,exercise_id,user_id)
 values('bbbbbbbb-0000-4000-8000-000000000001','2026-11-07','legacy-global','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
DO $proof$
begin
 if not exists(select 1 from public.sessions where id='bbbbbbbb-0000-4000-8000-000000000001' and user_id=auth.uid())
 then raise exception 'Captured session owner rewrite missing'; end if;
 raise notice 'GREEN: captured session INSERT owner rewrite preserved';
end $proof$;
reset role;
-- Intentional coach access proves SELECT RLS is wider than own-athlete analytics.
insert into public.coach_athlete_relationships(id,coach_user_id,athlete_user_id,status)
 values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','active');
insert into public.coach_access_scopes(relationship_id,scope,enabled)
 values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','TRAINING_CORE',true);
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
set role authenticated;
DO $proof$
begin
 if (select count(*) from public.sessions where user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')<>1
 then raise exception 'Captured coach SELECT policy not reproduced'; end if;
 if (select count(*) from public.sessions where user_id=auth.uid())<>0
 then raise exception 'Own-session query unexpectedly included coached athlete'; end if;
 raise notice 'GREEN: captured coach RLS exposes coached sessions; own-user filter excludes them';
end $proof$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','',true);
ROLLBACK;
