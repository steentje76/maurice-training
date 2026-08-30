-- migratie_v514.sql
-- MS-F11-02 (Gym Programming & Equipment)
--
-- Hergebruikt de bestaande, canonieke equipment_catalog/exercise_equipment-
-- tabellen (Model A, legacy gyms) -- geen tweede equipment-model. Uitgebreid
-- met organization_id zodat het nieuwe Model B (F11 organizations) dezelfde
-- structuur deelt. exercise_equipment.exercise_id blijft ongewijzigd
-- verwijzen naar de canonieke Exercise Library.

alter table public.equipment_catalog add column if not exists organization_id text references public.organizations(id) on delete cascade;
alter table public.exercise_equipment add column if not exists organization_id text references public.organizations(id) on delete cascade;

-- GENUINE, PRE-EXISTING BEVINDING (niet door F11 geintroduceerd, live
-- bevestigd): equipment_catalog_insert had WITH CHECK (true) -- een
-- volledige RLS-bypass. Live adversarial getest: een willekeurige gebruiker
-- kreeg echter alsnog een expliciete fout, OMDAT een bestaande, aparte
-- trigger (set_equipment_catalog_owner, SECURITY DEFINER) de daadwerkelijke
-- eigenaarscontrole uitvoert en de eigenaarskolommen altijd zelf overschrijft
-- -- GEEN actieve kwetsbaarheid, wel een architecturale inconsistentie
-- (RLS suggereert "alles mag", de trigger doet het echte werk). Behouden
-- (consistent met set_user_id_from_auth() elders) en uitgebreid met de
-- derde, organization-tak.
--
-- CORRECTIE TIJDENS LIVE TESTEN: de eerste triggerversie gaf altijd
-- voorrang aan Model A (users.gym_id) zodra die bestond, waardoor Model B
-- onbereikbaar was voor elke gebruiker die al bij een Model-A-gym hoorde.
-- Gecorrigeerd: een expliciet opgegeven organization_id krijgt nu altijd
-- voorrang.
create or replace function public.set_equipment_catalog_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_gym_id text;
  caller_role_level int;
begin
  if NEW.organization_id is not null then
    if not public.org_has_role(NEW.organization_id, array['owner','admin','staff']) then
      raise exception 'Alleen staff/admin/owner van de organisatie mag de apparatuur-catalogus beheren';
    end if;
    NEW.gym_id := null;
    NEW.user_id := null;
    return NEW;
  end if;

  select gym_id, gym_role_level into caller_gym_id, caller_role_level
  from users where id = auth.uid()::text;

  if caller_gym_id is not null then
    if caller_role_level is null or caller_role_level < 3 then
      raise exception 'Alleen de gym-owner mag de apparatuur-catalogus van de gym beheren';
    end if;
    NEW.gym_id := caller_gym_id;
    NEW.user_id := null;
  else
    NEW.gym_id := null;
    NEW.user_id := auth.uid();
  end if;
  return NEW;
end;
$$;

create or replace function public.set_exercise_equipment_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_gym_id text;
  caller_role_level int;
begin
  if NEW.organization_id is not null then
    if not public.org_has_role(NEW.organization_id, array['owner','admin','staff']) then
      raise exception 'Alleen staff/admin/owner van de organisatie mag exercise-equipment-mappings beheren';
    end if;
    NEW.gym_id := null;
    NEW.user_id := null;
    return NEW;
  end if;

  select gym_id, gym_role_level into caller_gym_id, caller_role_level
  from users where id = auth.uid()::text;

  if caller_gym_id is not null then
    if caller_role_level is null or caller_role_level < 3 then
      raise exception 'Alleen de gym-owner mag exercise-equipment-mappings van de gym beheren';
    end if;
    NEW.gym_id := caller_gym_id;
    NEW.user_id := null;
  else
    NEW.gym_id := null;
    NEW.user_id := auth.uid();
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_set_exercise_equipment_owner on public.exercise_equipment;
create trigger trg_set_exercise_equipment_owner
  before insert on public.exercise_equipment
  for each row execute function public.set_exercise_equipment_owner();

-- GENUINE, PRE-EXISTING BEVINDING: exercise_equipment had slechts één,
-- te restrictieve policy die NOOIT kon slagen voor gym-gebonden rijen.
-- Bevestigd ongebruikt (0 rijen met gym_id vóór deze sprint). Vervangen
-- door een volledige policy-set die alle drie contexten ondersteunt.
drop policy if exists exercise_equipment_own_rows on public.exercise_equipment;

create policy exercise_equipment_select on public.exercise_equipment
  for select using (
    (gym_id is not null and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text))
    or (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff','member']))
    or (user_id = auth.uid())
  );

-- WITH CHECK (true) is bewust veilig: de trigger hierboven forceert altijd
-- de correcte eigenaarskolommen, exact het bestaande equipment_catalog_insert-patroon.
create policy exercise_equipment_insert on public.exercise_equipment
  for insert with check (true);

create policy exercise_equipment_update on public.exercise_equipment
  for update
  using (
    (gym_id is not null and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 3)
    or (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff']))
    or (user_id = auth.uid())
  )
  with check (
    (gym_id is not null and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 3)
    or (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff']))
    or (user_id = auth.uid())
  );

create policy exercise_equipment_delete on public.exercise_equipment
  for delete using (
    (gym_id is not null and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 3)
    or (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff']))
    or (user_id = auth.uid())
  );

-- equipment_catalog: policies uitgebreid met de organization-tak (additief).
drop policy if exists equipment_catalog_select on public.equipment_catalog;
create policy equipment_catalog_select on public.equipment_catalog
  for select using (
    (gym_id is not null and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text))
    or (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff','member']))
    or (user_id = auth.uid())
  );

drop policy if exists equipment_catalog_update on public.equipment_catalog;
create policy equipment_catalog_update on public.equipment_catalog
  for update
  using (
    (gym_id is not null and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 3)
    or (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff']))
    or (user_id = auth.uid())
  )
  with check (
    (gym_id is not null and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 3)
    or (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff']))
    or (user_id = auth.uid())
  );

drop policy if exists equipment_catalog_delete on public.equipment_catalog;
create policy equipment_catalog_delete on public.equipment_catalog
  for delete using (
    (gym_id is not null and gym_id = (select users.gym_id from users where users.id = (auth.uid())::text) and (select users.gym_role_level from users where users.id = (auth.uid())::text) >= 3)
    or (organization_id is not null and public.org_has_role(organization_id, array['owner','admin','staff']))
    or (user_id = auth.uid())
  );

-- equipment_catalog_owner_chk uitgebreid met de derde, organization-optie
-- (forward-only, veilig: alle bestaande rijen voldoen al aan de oude regel).
alter table public.equipment_catalog drop constraint if exists equipment_catalog_owner_chk;
alter table public.equipment_catalog add constraint equipment_catalog_owner_chk check (
  (gym_id is not null and user_id is null and organization_id is null)
  or (gym_id is null and user_id is not null and organization_id is null)
  or (gym_id is null and user_id is null and organization_id is not null)
);
-- exercise_equipment krijgt BEWUST GEEN vergelijkbare CHECK-constraint: er
-- bestaat 1 historische rij met gym_id=NULL en user_id=NULL (overblijfsel
-- van de hierboven beschreven, nooit-correct-werkende policy). Geen
-- destructieve wijziging zonder expliciete noodzaak.

-- LIVE ADVERSARIAL VERIFICATIE (transacties zonder commit, geen permanente
-- wijziging):
-- 1. Organization-owner maakt equipment aan -> correct gestructureerd.
-- 2. Gewoon member probeert equipment aan te maken -> expliciete fout.
-- 3. Gewoon member kan de equipment-catalogus WEL lezen (member-niveau).
-- 4. Niet-lid kan de equipment-catalogus niet lezen -> 0 rijen.
