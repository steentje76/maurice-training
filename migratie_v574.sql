-- migratie_v574.sql — F-SEC-003 closure: relatie-/lidmaatschapshelpers niet langer bruikbaar als orakel over derden.
--
-- Root cause (docs/SECURITY_AUDIT_PRIVILEGED_FUNCTIONS.md, F-SEC-003): zes SECURITY DEFINER-booleanhelpers waren via
-- PostgREST (rpc) aanroepbaar voor authenticated en beantwoordden vragen over willekeurige derden, voorbij wat RLS de
-- caller laat zien. Geen enkele TK-client of -serverfunctie roept ze direct aan; ze bestaan voor RLS-policies en
-- interne SECURITY DEFINER-functies.
--
-- Afhankelijkheden (live bepaald): alle policy-aanroepen van coach_has_scope, social_is_blocked_pair,
-- social_is_group_member en social_is_group_owner geven auth.uid() mee als partij; get_or_create_direct_thread en
-- materialize_coach_assignment eveneens. org_user_has_role wordt voor een derde gebruikt in policy
-- cpa_org_staff_wijst_toe (al voorafgegaan door org_has_role(owner/admin/staff) van de caller) en in de trigger
-- team_events_validate_linked_training. is_relationship_active heeft geen enkele caller.
--
-- Fix (policies, signatures, owners en search_path ongewijzigd; policies verwijzen naar dezelfde functie-objecten):
--  1. coach_has_scope: alleen een antwoord als de caller coach of athlete van het paar is, anders false;
--  2. social_is_blocked_pair: alleen als de caller één van beide partijen is, anders false;
--  3. social_is_group_member / social_is_group_owner: alleen voor de caller zelf, anders false;
--  4. org_user_has_role: voor de caller zelf, of voor een derde alleen als de caller owner/admin/staff van die
--     organisatie is (org_has_role, auth.uid()-gebonden) — exact de voorwaarde die de enige policy al stelt;
--  5. trigger team_events_validate_linked_training: de lidmaatschapscontrole inline (zelfde query als voorheen), zodat
--     de trigger niet van de caller-binding afhangt;
--  6. is_relationship_active: EXECUTE ingetrokken van PUBLIC, anon en authenticated (geen callers).
-- Geen RLS-versoepeling, geen nieuw rolmodel, service_role ongemoeid.

create or replace function public.coach_has_scope(p_coach_id uuid, p_athlete_id uuid, p_scope text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select auth.uid() is not null
    and auth.uid() in (p_coach_id, p_athlete_id)
    and exists (
      select 1 from public.coach_athlete_relationships r
      join public.coach_access_scopes s on s.relationship_id = r.id
      where r.coach_user_id = p_coach_id and r.athlete_user_id = p_athlete_id
        and r.status = 'active' and s.scope = p_scope and s.enabled = true
    );
$function$;

create or replace function public.social_is_blocked_pair(a uuid, b uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select auth.uid() is not null
    and auth.uid() in (a, b)
    and exists (
      select 1 from public.social_blocks
      where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
    );
$function$;

create or replace function public.social_is_group_member(u uuid, g uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select auth.uid() is not null
    and u = auth.uid()
    and exists (select 1 from public.social_group_memberships where user_id = u and group_id = g and status = 'active');
$function$;

create or replace function public.social_is_group_owner(u uuid, g uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select auth.uid() is not null
    and u = auth.uid()
    and exists (select 1 from public.social_group_memberships where user_id = u and group_id = g and status = 'active' and role = 'owner');
$function$;

create or replace function public.org_user_has_role(p_org_id text, p_user_id uuid, p_roles text[])
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select auth.uid() is not null
    and (p_user_id = auth.uid() or public.org_has_role(p_org_id, array['owner','admin','staff']))
    and (
      exists (select 1 from public.organizations o where o.id = p_org_id and o.owner_user_id = p_user_id)
      or exists (
        select 1 from public.memberships m
        where m.organization_id = p_org_id and m.user_id = p_user_id and m.status = 'active' and m.role = any(p_roles)
      )
    );
$function$;

create or replace function public.team_events_validate_linked_training()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  -- F-SEC-003: inline lidmaatschapscontrole (ongewijzigde semantiek), onafhankelijk van de caller-binding in
  -- org_user_has_role.
  if not (
    exists (select 1 from public.organizations o where o.id = v_team_org and o.owner_user_id = v_ti_user_id)
    or exists (
      select 1 from public.memberships m
      where m.organization_id = v_team_org and m.user_id = v_ti_user_id and m.status = 'active'
        and m.role = any(array['owner','admin','staff','member'])
    )
  ) then
    raise exception 'linked_training_instance_id behoort tot een gebruiker die geen lid is van de organisatie van dit team';
  end if;
  return NEW;
end;
$function$;

revoke execute on function public.is_relationship_active(uuid) from public, anon, authenticated;
