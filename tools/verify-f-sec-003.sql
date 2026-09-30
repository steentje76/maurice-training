-- tools/verify-f-sec-003.sql — rollback-veilige verificatie van F-SEC-003 (relatie-/lidmaatschapshelpers).
-- Draai in de SQL-editor; eindigt met ROLLBACK. Testidentiteiten: de vier oudste accounts, alleen binnen de
-- transactie; alle testcontext (coachrelatie + scopes, blokkade, organisatie/team/lidmaatschappen, groep, hrv-rij,
-- trainingen) bestaat alleen in de transactie. Verwacht na migratie_v574: alle 'LIVE A: ... derde' = false of
-- GEWEIGERD; eigen/geautoriseerde vragen true; RLS-regressies zoals vermeld; trigger lid TOEGESTAAN, niet-lid GEWEIGERD.
begin;
set local lock_timeout = '3s';
create temp table _r(k text, v text) on commit drop;
grant all on _r to authenticated, anon, service_role;
do $t$
declare a uuid; b uuid; c uuid; d uuid; rel uuid; g uuid; v_org text := 'sec3-org'; v_team text := 'sec3-team'; ti_c uuid; ti_a uuid; n int; r text;
begin
  select id into a from auth.users order by created_at limit 1;
  select id into b from auth.users where id <> a order by created_at limit 1;
  select id into c from auth.users where id not in (a,b) order by created_at limit 1;
  select id into d from auth.users where id not in (a,b,c) order by created_at limit 1;
  -- testcontext (alleen in deze transactie)
  delete from public.coach_athlete_relationships where coach_user_id = b and athlete_user_id = c;
  insert into public.coach_athlete_relationships (coach_user_id, athlete_user_id, status, requested_by) values (b, c, 'active', b) returning id into rel;
  insert into public.coach_access_scopes (relationship_id, scope, enabled) values (rel, 'TRAINING_CORE', true), (rel, 'RECOVERY_HEALTH', true);
  delete from public.social_blocks where (blocker_id in (b,c) and blocked_id in (b,c));
  insert into public.social_blocks (blocker_id, blocked_id) values (b, c);
  insert into public.organizations (id, name) values (v_org, 'sec3');
  insert into public.teams (id, organization_id, name) values (v_team, v_org, 'sec3');
  insert into public.memberships (user_id, organization_id, role, status) values (c, v_org, 'member', 'active'), (d, v_org, 'staff', 'active');
  insert into public.social_groups (owner_user_id, name, join_mode) values (b, 'sec3', 'invite_only') returning id into g;
  insert into public.social_group_memberships (group_id, user_id, role, status) values (g, b, 'owner', 'active'), (g, c, 'member', 'active');
  insert into public.hrv_log (user_id, date, hrv) values (c, date '2000-01-01', 50);
  insert into public.training_instances (user_id, status) values (c, 'active') returning id into ti_c;
  insert into public.training_instances (user_id, status) values (a, 'active') returning id into ti_a;


  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role','authenticated')::text, true);
  insert into _r select 'LIVE A: coach_has_scope(B,C) derde', public.coach_has_scope(b, c, 'TRAINING_CORE')::text;
  insert into _r select 'LIVE A: social_is_blocked_pair(B,C) derde', public.social_is_blocked_pair(b, c)::text;
  insert into _r select 'LIVE A: org_user_has_role(org,C) derde', public.org_user_has_role(v_org, c, array['owner','admin','staff','member'])::text;
  insert into _r select 'LIVE A: social_is_group_member(C,G) derde', public.social_is_group_member(c, g)::text;
  insert into _r select 'LIVE A: social_is_group_owner(B,G) derde', public.social_is_group_owner(b, g)::text;
  begin insert into _r select 'LIVE A: is_relationship_active(rel) derde', public.is_relationship_active(rel)::text; exception when others then insert into _r values ('LIVE A: is_relationship_active(rel) derde', 'GEWEIGERD'); end;
  insert into _r select 'LIVE A: RLS zicht op onderliggende rijen', (select count(*) from public.coach_athlete_relationships where id = rel)||'/'||(select count(*) from public.social_blocks where blocker_id = b)||'/'||(select count(*) from public.memberships where organization_id = v_org)||'/'||(select count(*) from public.social_group_memberships where group_id = g);
  reset role;

  -- positieve regressies (na de fix)
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', b::text, 'role','authenticated')::text, true);
  insert into _r select 'LIVE B(coach): coach_has_scope(B,C) eigen', public.coach_has_scope(b, c, 'TRAINING_CORE')::text;
  insert into _r select 'LIVE B(coach): RLS hrv_log van C (RECOVERY_HEALTH)', (select count(*) from public.hrv_log where user_id = c and date = date '2000-01-01')::text;
  insert into _r select 'LIVE B(owner): social_is_group_owner(B,G) eigen', public.social_is_group_owner(b, g)::text;
  begin update public.social_group_memberships set status = 'active' where group_id = g and user_id = c; get diagnostics n = row_count; r := n::text; exception when others then r := 'FOUT'; end;
  insert into _r values ('LIVE B(owner): RLS beheer groepsleden', r);
  perform set_config('request.jwt.claims', json_build_object('sub', c::text, 'role','authenticated')::text, true);
  insert into _r select 'LIVE C: social_is_blocked_pair(C,B) eigen', public.social_is_blocked_pair(c, b)::text;
  insert into _r select 'LIVE C: social_is_group_member(C,G) eigen', public.social_is_group_member(c, g)::text;
  insert into _r select 'LIVE C: RLS social_groups (invite_only, lid)', (select count(*) from public.social_groups where id = g)::text;
  insert into _r select 'LIVE C: org_user_has_role(org,C) zelf', public.org_user_has_role(v_org, c, array['owner','admin','staff','member'])::text;
  begin perform public.get_or_create_direct_thread(b); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD: '||left(sqlerrm, 60); end;
  insert into _r values ('LIVE C: direct thread met blokkerende B (keten)', r);
  perform set_config('request.jwt.claims', json_build_object('sub', d::text, 'role','authenticated')::text, true);
  insert into _r select 'LIVE D(org staff): org_user_has_role(org,C)', public.org_user_has_role(v_org, c, array['owner','admin','staff','member'])::text;
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role','authenticated')::text, true);
  insert into _r select 'LIVE A: RLS hrv_log van C', (select count(*) from public.hrv_log where user_id = c and date = date '2000-01-01')::text;
  insert into _r select 'LIVE A: RLS social_groups', (select count(*) from public.social_groups where id = g)::text;
  begin update public.social_group_memberships set status = 'active' where group_id = g and user_id = c; get diagnostics n = row_count; r := n::text; exception when others then r := 'FOUT'; end;
  insert into _r values ('LIVE A: RLS beheer groepsleden (geen owner)', r);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  begin insert into _r select 'LIVE anon: coach_has_scope', public.coach_has_scope(b, c, 'TRAINING_CORE')::text; exception when others then insert into _r values ('LIVE anon: coach_has_scope', 'GEWEIGERD'); end;
  reset role;
  -- trigger (loopt als owner): lid -> ok, niet-lid -> geweigerd
  begin insert into public.team_events (team_id, created_by, title, starts_at, linked_training_instance_id) values (v_team, d, 'sec3', now(), ti_c); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD: '||left(sqlerrm, 60); end;
  insert into _r values ('LIVE trigger: gekoppelde training van lid', r);
  begin insert into public.team_events (team_id, created_by, title, starts_at, linked_training_instance_id) values (v_team, d, 'sec3', now(), ti_a); r := 'TOEGESTAAN'; exception when others then r := 'GEWEIGERD'; end;
  insert into _r values ('LIVE trigger: gekoppelde training van niet-lid', r);
end $t$;
select * from _r;
rollback;
