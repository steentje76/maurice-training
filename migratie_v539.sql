-- migratie_v539.sql
-- B9-H2B Organization Controlled Consolidation.
--
-- Voert Strategy C (B9-H2A) daadwerkelijk uit: koppelt bestaande gyms
-- aan een canonieke organizations-rij, en migreert de bestaande
-- users.gym_id/gym_role-toewijzingen naar canonieke memberships-rijen.
--
-- IDEMPOTENTIE (sectie 8/41 van de opdracht): deterministische
-- organization-id (= gym.id zelf, geen willekeurige uuid) zodat een
-- herhaalde uitvoering nooit een tweede organization voor dezelfde
-- gym aanmaakt. `on conflict do nothing` op zowel organizations als
-- memberships (de laatste hergebruikt de reeds bestaande unique
-- constraint memberships_user_id_organization_id_team_id_key).
--
-- ROLE MAPPING (sectie 10, fail-safe): uitsluitend de twee, live
-- bevestigde, bekende waarden ('owner'->'owner', 'lid'->'member')
-- worden gemapt. Elke andere/onbekende gym_role-waarde wordt NIET
-- automatisch gemigreerd naar een membership -- geen fictieve
-- toewijzing, geen automatische admin/owner-promotie (sectie 10).
--
-- GEEN self-elevation-route (sectie 11): deze migratie draait als
-- migratie/service-role, niet als een door de gebruiker aanroepbare
-- functie -- er ontstaat geen nieuwe, client-aanroepbare weg voor een
-- gebruiker om zijn eigen rol te verhogen.

-- P1-FIX (zelf gevonden tijdens live migratie-verificatie): de
-- bestaande trigger prevent_gyms_organization_id_change() blokkeerde
-- ONVOORWAARDELIJK elke wijziging aan gyms.organization_id -- ook de
-- legitieme, eerste toewijzing vanaf NULL die deze migratie zelf moet
-- uitvoeren. Gecorrigeerd naar de kennelijk bedoelde bescherming: een
-- eenmalige toewijzing (NULL -> waarde) blijft toegestaan, maar zodra
-- een waarde eenmaal is gezet, blijft elke verdere wijziging (waarde
-- -> andere waarde) geblokkeerd -- exact de bescherming tegen het
-- "kapen" van een bestaande gym-koppeling naar een andere organisatie,
-- zonder de legitieme, eerste consolidatie te blokkeren.
create or replace function public.prevent_gyms_organization_id_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if OLD.organization_id is not null and NEW.organization_id is distinct from OLD.organization_id then
    raise exception 'organization_id van een gyms-rij (branding) is niet wijzigbaar na aanmaak';
  end if;
  return NEW;
end;
$function$;

-- Stap 1: voor elke gym zonder organization_id, maak een canonieke
-- organization aan met een deterministische id (= gym.id). `distinct
-- on` beschermt tegen de (in de huidige data niet voorkomende, maar
-- theoretisch mogelijke) situatie van meerdere 'owner'-rijen per gym --
-- kiest deterministisch de eerste, op user-id gesorteerd.
insert into organizations (id, name, owner_user_id)
select distinct on (g.id) g.id, g.name, u.id::uuid
from gyms g
join users u on u.gym_id = g.id and u.gym_role = 'owner'
where g.organization_id is null
order by g.id, u.id
on conflict (id) do nothing;

-- Stap 2: koppel de gym aan de (nieuwe of reeds bestaande) organization.
-- De bestaande constraint gyms_owner_context_chk dwingt af dat
-- owner_email leeg moet zijn zodra organization_id gezet is -- dit is
-- exact de architectuurbeslissing zelf, al als database-constraint
-- aanwezig: zodra een organization-koppeling bestaat, is
-- organizations.owner_user_id de enige bron van waarheid voor
-- eigenaarschap, niet langer het legacy owner_email-veld.
update gyms g
set organization_id = g.id, owner_email = null
where g.organization_id is null
  and exists (select 1 from organizations o where o.id = g.id);

-- Stap 3: migreer bestaande gym-leden naar canonieke memberships,
-- uitsluitend voor de twee bekende, expliciet gemapte rollen.
--
-- P1-FIX (zelf gevonden tijdens live idempotentie-verificatie): `on
-- conflict (user_id, organization_id, team_id) do nothing` werkt NIET
-- betrouwbaar wanneer team_id NULL is -- PostgreSQL beschouwt twee
-- NULL-waarden in een unique constraint nooit als gelijk aan elkaar
-- (standaard SQL-semantiek), dus een conflict met een eerdere,
-- eveneens team_id=NULL rij wordt niet herkend en een tweede
-- uitvoering zou dubbele memberships aanmaken. Live, adversarial
-- bevestigd: een tweede, identieke uitvoering gaf 10 memberships i.p.v.
-- de verwachte 5. Vervangen door een expliciete `where not exists`-
-- check, die wel correct met NULL omgaat.
insert into memberships (user_id, organization_id, role, status)
select u.id::uuid, g.organization_id,
  case u.gym_role
    when 'owner' then 'owner'
    when 'lid' then 'member'
    else null
  end,
  'active'
from users u
join gyms g on g.id = u.gym_id
where g.organization_id is not null
  and u.gym_role in ('owner', 'lid')
  and not exists (
    select 1 from memberships m
    where m.user_id = u.id::uuid and m.organization_id = g.organization_id and m.team_id is null
  );
