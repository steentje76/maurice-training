-- migratie_v518.sql
-- MS-F11-03 vervolg: complete adversarial matrix voor team_events/
-- event_attendance/event_responsibilities, uitgevoerd vóór MS-F11-03 als
-- CLOSED beschouwd kan worden. Drie genuine bevindingen gevonden en
-- gerepareerd, één bewust gedocumenteerd als open productpunt.

-- BEVINDING 1 (P1, cross-tenant): team_events stond toe dat een event werd
-- gekoppeld aan een location_id van een ANDERE organisatie dan het team
-- zelf. Live adversarial bevestigd.
create or replace function public.team_events_validate_location_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_team_org text;
  v_location_org text;
begin
  if NEW.location_id is null then
    return NEW;
  end if;
  select organization_id into v_team_org from public.teams where id = NEW.team_id;
  select organization_id into v_location_org from public.locations where id = NEW.location_id;
  if v_location_org is distinct from v_team_org then
    raise exception 'location_id behoort niet tot dezelfde organisatie als het team';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_team_events_validate_location_tenant on public.team_events;
create trigger trg_team_events_validate_location_tenant
  before insert or update on public.team_events
  for each row execute function public.team_events_validate_location_tenant();

-- BEVINDING 2 (lagere impact, vereist staff van beide teams, maar wel een
-- ongewenst patroon): team_events.team_id kon worden gewijzigd via UPDATE.
create or replace function public.prevent_team_events_team_id_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.team_id is distinct from OLD.team_id then
    raise exception 'team_id van een team_event is niet wijzigbaar na aanmaak';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_team_events_immutable_team_id on public.team_events;
create trigger trg_team_events_immutable_team_id
  before update on public.team_events
  for each row execute function public.prevent_team_events_team_id_change();

-- BEVINDING 3 (data-integriteit, GEEN direct data-lek): linked_training_
-- instance_id kon verwijzen naar een training_instance van een volledig
-- ongerelateerde gebruiker. GEEN daadwerkelijk data-lek (training_instances
-- behoudt de eigen, correcte RLS), maar wel een data-integriteitsprobleem.
create or replace function public.team_events_validate_linked_training()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ti_user_id uuid;
  v_team_org text;
begin
  if NEW.linked_training_instance_id is null then
    return NEW;
  end if;
  select user_id into v_ti_user_id from public.training_instances where id = NEW.linked_training_instance_id;
  if v_ti_user_id is null then
    raise exception 'linked_training_instance_id verwijst niet naar een bestaande training_instance';
  end if;
  select organization_id into v_team_org from public.teams where id = NEW.team_id;
  if not public.org_user_has_role(v_team_org, v_ti_user_id, array['owner','admin','staff','member']) then
    raise exception 'linked_training_instance_id behoort tot een gebruiker die geen lid is van de organisatie van dit team';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_team_events_validate_linked_training on public.team_events;
create trigger trg_team_events_validate_linked_training
  before insert or update on public.team_events
  for each row execute function public.team_events_validate_linked_training();

-- BEVINDING 4 (P2, tenant-identifier-immutabiliteit, zelfde patroon als
-- MS-F11-01): event_attendance.event_id/user_id en event_responsibilities.
-- event_id konden worden gewijzigd via UPDATE.
create or replace function public.prevent_event_attendance_identity_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.event_id is distinct from OLD.event_id then
    raise exception 'event_id van event_attendance is niet wijzigbaar na aanmaak';
  end if;
  if NEW.user_id is distinct from OLD.user_id then
    raise exception 'user_id van event_attendance is niet wijzigbaar na aanmaak';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_event_attendance_immutable_ids on public.event_attendance;
create trigger trg_event_attendance_immutable_ids
  before update on public.event_attendance
  for each row execute function public.prevent_event_attendance_identity_change();

create or replace function public.prevent_event_responsibilities_event_id_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.event_id is distinct from OLD.event_id then
    raise exception 'event_id van event_responsibilities is niet wijzigbaar na aanmaak';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_event_responsibilities_immutable_event on public.event_responsibilities;
create trigger trg_event_responsibilities_immutable_event
  before update on public.event_responsibilities
  for each row execute function public.prevent_event_responsibilities_event_id_change();

-- OPEN PRODUCTPUNT (bewust niet gerepareerd, geen security-lek): een
-- verantwoordelijkheid kan worden toegewezen aan een assigned_user_id die
-- geen lid is van het team. GEEN data-lek (de FK geeft geen toegang tot
-- data van de toegewezen persoon), kan een legitiem scenario zijn (bijv.
-- een vrijwilliger zonder formeel teamlidmaatschap). Bewust niet beperkt
-- binnen deze sprint.

-- LIVE ADVERSARIAAL GEVERIFIEERD NA ALLE FIXES (transacties zonder commit,
-- geen permanente wijziging):
-- 1. Cross-tenant location-koppeling -> expliciete fout; eigen locatie
--    blijft werken.
-- 2. team_id-wijziging -> expliciete fout; titelwijziging blijft werken.
-- 3. linked_training_instance_id van een niet-lid -> expliciete fout; van
--    een daadwerkelijk lid -> slaagt correct.
-- 4. event_id-wijziging op event_attendance -> expliciete fout; status-
--    wijziging blijft werken.
