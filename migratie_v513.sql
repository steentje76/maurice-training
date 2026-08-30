-- migratie_v513.sql
-- MS-F11-01 Security Completion Gate: drie kritieke bevindingen, live
-- gevonden en direct gerepareerd tijdens de verplichte adversarial
-- security-audit (vóór MS-F11-01 als CLOSED beschouwd kan worden).

-- BEVINDING 1 (P1, tenant escape): een gebruiker die owner is van ZOWEL
-- organisatie A als organisatie C kon een memberships-rij van een lid van A
-- verplaatsen naar C (organization_id wijzigen via UPDATE), zonder
-- toestemming van dat lid. RLS WITH CHECK kan de oude rij niet vergelijken
-- met de nieuwe; dit wordt daarom afgedwongen via een trigger.
--
-- LIVE ADVERSARIAAL BEVESTIGD: een owner van zowel org C1 als C2
-- verplaatste succesvol een membership van C1 naar C2 VOORDAT deze fix
-- bestond. LIVE HERBEVESTIGD NA DE FIX: dezelfde poging geeft nu een
-- expliciete foutmelding; legitieme rolwijziging blijft correct werken.
create or replace function public.memberships_prevent_tenant_identifier_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.organization_id is distinct from OLD.organization_id then
    raise exception 'organization_id van een membership is niet wijzigbaar na aanmaak';
  end if;
  if NEW.user_id is distinct from OLD.user_id then
    raise exception 'user_id van een membership is niet wijzigbaar na aanmaak';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_memberships_immutable_tenant_ids on public.memberships;
create trigger trg_memberships_immutable_tenant_ids
  before update on public.memberships
  for each row execute function public.memberships_prevent_tenant_identifier_change();

-- BEVINDING 2 (P1, hetzelfde patroon): dezelfde tenant-escape-kwetsbaarheid
-- bestond voor locations (organization_id), teams (organization_id) en
-- training_groups (team_id). Live adversarial bevestigd voor locations.
create or replace function public.prevent_organization_id_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.organization_id is distinct from OLD.organization_id then
    raise exception 'organization_id is niet wijzigbaar na aanmaak voor deze tabel';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_locations_immutable_org on public.locations;
create trigger trg_locations_immutable_org
  before update on public.locations
  for each row execute function public.prevent_organization_id_change();

drop trigger if exists trg_teams_immutable_org on public.teams;
create trigger trg_teams_immutable_org
  before update on public.teams
  for each row execute function public.prevent_organization_id_change();

create or replace function public.prevent_team_id_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.team_id is distinct from OLD.team_id then
    raise exception 'team_id is niet wijzigbaar na aanmaak voor training_groups';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_training_groups_immutable_team on public.training_groups;
create trigger trg_training_groups_immutable_team
  before update on public.training_groups
  for each row execute function public.prevent_team_id_change();

-- HARDENING: de drie bovenstaande trigger-functies kregen aanvankelijk geen
-- expliciete anon-EXECUTE-revoke (in tegenstelling tot org_has_role uit
-- migratie_v512.sql). Conform de minimale-privileges-eis alsnog ingetrokken.
revoke all on function public.memberships_prevent_tenant_identifier_change() from public;
revoke execute on function public.memberships_prevent_tenant_identifier_change() from anon;
revoke all on function public.prevent_organization_id_change() from public;
revoke execute on function public.prevent_organization_id_change() from anon;
revoke all on function public.prevent_team_id_change() from public;
revoke execute on function public.prevent_team_id_change() from anon;

-- BEVINDING 3 (delete-completeness): organizations.owner_user_id heeft GEEN
-- ON DELETE CASCADE naar auth.users -- zonder een expliciete stap in
-- delete-account.js zou het verwijderen van een organisatie-eigenaar's
-- account falen of wees-organisaties achterlaten. Gerepareerd in
-- netlify/functions/delete-account.js, hier uitsluitend gedocumenteerd
-- voor het volledige, samenhangende bewijs.
