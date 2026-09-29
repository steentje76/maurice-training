-- tools/verify-f-sec-001.sql — rollback-veilige adversarial verificatie van F-SEC-001 (social_create_notification).
-- Draai in de Supabase SQL-editor. Alles gebeurt in één transactie die eindigt met ROLLBACK: er blijft niets achter.
-- Vóór migratie v571 geeft 'N1 F-SEC-001 exploit' TOEGESTAAN; ná v571 moeten alle N-regels GEWEIGERD zijn en alle
-- P-regels TOEGESTAAN. Test-accounts: de drie oudste bestaande accounts (alleen binnen de transactie gebruikt, niet
-- vastgelegd). Testcontext (activity, reaction, comment, connecties, organisatie/team/event/taak) bestaat alleen in de tx.
begin;
create temp table _r(k text, v text) on commit drop;
grant all on _r to authenticated, anon;
do $t$
declare a uuid; b uuid; c uuid; sa uuid; t_id text; t_org text; ev uuid; n0 int; n1 int; r text;
  procedure_dummy int;
begin
  select id into a from auth.users order by created_at limit 1;
  select id into b from auth.users where id <> a order by created_at limit 1;
  select id into c from auth.users where id not in (a,b) order by created_at limit 1;
  select count(*) into n0 from public.social_notifications;
  -- testcontext (alleen binnen deze transactie)
  insert into public.social_shared_activities (athlete_id, title) values (b, 'sec-test') returning id into sa;
  insert into public.social_reactions (shared_activity_id, user_id) values (sa, a);
  insert into public.social_comments (shared_activity_id, user_id, body) values (sa, a, 'sec-test');
  delete from public.social_connections where (follower_id in (a,b,c) and followee_id in (a,b,c));
  insert into public.social_connections (follower_id, followee_id, status) values (a, b, 'pending');
  insert into public.social_connections (follower_id, followee_id, status) values (c, a, 'accepted');
  t_id := 'sec-test-team'; t_org := 'sec-test-org';
  insert into public.organizations (id, name) values (t_org, 'sec-test');
  insert into public.teams (id, organization_id, name) values (t_id, t_org, 'sec-test');
  if t_id is not null then
    insert into public.memberships (user_id, organization_id, team_id, role, status) values (a, t_org, t_id, 'staff', 'active'), (b, t_org, t_id, 'member', 'active');
    insert into public.team_events (team_id, created_by, title, starts_at) values (t_id, a, 'sec-test', now()) returning id into ev;
    insert into public.event_responsibilities (event_id, task, assigned_user_id, status) values (ev, 'sec-test', b, 'open');
  end if;
  insert into _r values ('team_context', coalesce(t_id is not null,false)::text);
  -- helper
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role','authenticated')::text, true);
  set local role authenticated;
  begin perform public.social_create_notification(b,'responsibility_assigned','team_event',gen_random_uuid()); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N1 F-SEC-001 exploit (A->B willekeurig doel)', r);
  begin perform public.social_create_notification(c,'reaction','shared_activity',sa); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N2 reaction naar niet-eigenaar (forged recipient)', r);
  begin perform public.social_create_notification(b,'reaction','shared_activity',sa); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('P1 reaction A->eigenaar B', r);
  begin perform public.social_create_notification(b,'comment','shared_activity',sa); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('P2 comment A->eigenaar B', r);
  begin perform public.social_create_notification(b,'reaction','profile',sa); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N3 geldig type verkeerde context', r);
  begin perform public.social_create_notification(b,'connection_request','profile',a); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('P3 connection_request A->B (pending)', r);
  begin perform public.social_create_notification(b,'connection_request','profile',b); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N4 connection_request forged target', r);
  begin perform public.social_create_notification(c,'connection_request','profile',a); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N5 connection_request zonder relatie', r);
  begin perform public.social_create_notification(c,'connection_accepted','profile',a); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('P4 connection_accepted A->C (C volgt A accepted)', r);
  begin perform public.social_create_notification(b,'connection_accepted','profile',a); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N6 connection_accepted bij pending', r);
  begin perform public.social_create_notification(b,'team_event_cancelled','team_event',gen_random_uuid()); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N7 team_event_cancelled via RPC', r);
  begin perform public.social_create_notification(b,'group_invite','group',gen_random_uuid()); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N8 group_invite (geen producer)', r);
  begin perform public.social_create_notification(b,'bogus','profile',a); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N9 onbekend type', r);
  begin perform public.social_create_notification(a,'reaction','shared_activity',sa); r:='OK(no-op)'; exception when others then r:='FOUT'; end; insert into _r values ('S1 zichzelf', r);
  if ev is not null then
    begin perform public.social_create_notification(b,'responsibility_assigned','team_event',ev); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('P5 responsibility_assigned staff A->toegewezen B', r);
    begin perform public.social_create_notification(c,'responsibility_assigned','team_event',ev); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N10 responsibility_assigned naar niet-toegewezene', r);
    begin perform public.assign_event_responsibility_notify(ev,'sec-test-2',b,null,null); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD: '||left(sqlerrm,60); end; insert into _r values ('P6 keten assign_event_responsibility_notify (staff)', r);
  end if;
  reset role;
  -- C: geen teamrechten, geen relaties
  perform set_config('request.jwt.claims', json_build_object('sub', c::text, 'role','authenticated')::text, true);
  set local role authenticated;
  if ev is not null then
    begin perform public.social_create_notification(b,'responsibility_assigned','team_event',ev); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N11 responsibility_assigned door niet-staff', r);
    begin perform public.assign_event_responsibility_notify(ev,'x',b,null,null); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N12 keten door niet-staff', r);
  end if;
  begin perform public.social_create_notification(b,'reaction','shared_activity',sa); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N13 reaction zonder eigen reaction (forged actor-context)', r);
  reset role;
  -- relatie verwijderd -> geweigerd
  delete from public.social_reactions where shared_activity_id=sa and user_id=a;
  perform set_config('request.jwt.claims', json_build_object('sub', a::text, 'role','authenticated')::text, true);
  set local role authenticated;
  begin perform public.social_create_notification(b,'reaction','shared_activity',sa); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N14 reaction na verwijderen relatie', r);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  begin perform public.social_create_notification(b,'reaction','shared_activity',sa); r:='TOEGESTAAN'; exception when others then r:='GEWEIGERD'; end; insert into _r values ('N15 anon', r);
  reset role;
  select count(*) into n1 from public.social_notifications;
  insert into _r values ('rijen_in_tx', (n1-n0)::text);
end $t$;
select * from _r;

rollback;
