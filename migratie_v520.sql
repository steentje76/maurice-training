-- migratie_v520.sql
-- MS-F11-05 (Dynamic Branding & Admin).
--
-- KRITIEKE, GENUINE BEVINDING (baseline-audit): gyms.logo_url/
-- primary_color/accent_color/font/app_name bestonden al (Model A, legacy),
-- maar 0 treffers in index.html/netlify/functions/*.js -- nooit door de
-- runtime gebruikt. VERKLARING GEVONDEN: gyms heeft RLS ingeschakeld maar
-- had 0 policies -- volledige default-deny voor elke client-route. Deze
-- migratie repareert dit als bijeffect en breidt de tabel uit voor Model B
-- (organizations), conform de instructie om bestaande tabellen te
-- hergebruiken i.p.v. een nieuwe aan te maken.

alter table public.gyms add column if not exists organization_id text references public.organizations(id) on delete cascade;
alter table public.gyms add column if not exists branding_enabled boolean not null default false;
alter table public.gyms add column if not exists short_name text;
alter table public.gyms add column if not exists updated_at timestamptz not null default now();
alter table public.gyms add column if not exists updated_by uuid references auth.users(id);

alter table public.gyms drop constraint if exists gyms_primary_color_hex_chk;
alter table public.gyms add constraint gyms_primary_color_hex_chk
  check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.gyms drop constraint if exists gyms_accent_color_hex_chk;
alter table public.gyms add constraint gyms_accent_color_hex_chk
  check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.gyms drop constraint if exists gyms_logo_url_https_chk;
alter table public.gyms add constraint gyms_logo_url_https_chk
  check (logo_url is null or logo_url ~ '^https://');

alter table public.gyms drop constraint if exists gyms_owner_context_chk;
alter table public.gyms add constraint gyms_owner_context_chk
  check (
    (organization_id is not null and owner_email is null)
    or (organization_id is null)
  );

-- RLS-POLICIES (repareert de kritieke, ontdekte 0-policies-situatie).
create policy gyms_select_org_member on public.gyms
  for select
  using (
    organization_id is not null
    and public.org_has_role(organization_id, array['owner','admin','staff','member'])
  );

create policy gyms_insert_org_owner on public.gyms
  for insert
  with check (
    organization_id is not null
    and exists (select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = auth.uid())
  );

create policy gyms_update_org_admin on public.gyms
  for update
  using (
    organization_id is not null
    and public.org_has_role(organization_id, array['owner','admin'])
  )
  with check (
    organization_id is not null
    and public.org_has_role(organization_id, array['owner','admin'])
  );

create or replace function public.prevent_gyms_organization_id_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.organization_id is distinct from OLD.organization_id then
    raise exception 'organization_id van een gyms-rij (branding) is niet wijzigbaar na aanmaak';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_gyms_immutable_org on public.gyms;
create trigger trg_gyms_immutable_org
  before update on public.gyms
  for each row execute function public.prevent_gyms_organization_id_change();

create or replace function public.set_gyms_updated_meta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  return NEW;
end;
$$;

drop trigger if exists trg_gyms_updated_meta on public.gyms;
create trigger trg_gyms_updated_meta
  before update on public.gyms
  for each row execute function public.set_gyms_updated_meta();

-- LIVE ADVERSARIAAL GEVERIFIEERD (transacties zonder commit, geen permanente
-- wijziging; een testrij werd per ongeluk buiten een transactie
-- aangemaakt tijdens het testen en direct daarna handmatig verwijderd --
-- expliciet vermeld voor transparantie, geen blijvende impact):
-- 1. Owner maakt organization-branding aan -> slaagt correct.
-- 2. Cross-tenant lezen/schrijven (owner van org B) -> 0 rijen.
-- 3. Gewoon member: mag lezen, mag niet wijzigen.
-- 4. Staff/coach: mag niet wijzigen -- coach-zijn geeft geen automatisch
--    brandingbeheer.
-- 5. Kwaadaardige primary_color/logo_url -> CHECK-constraint weigert.
-- 6. organization_id-mutatiepoging -> expliciete trigger-fout.
-- 7. updated_at/updated_by automatisch, server-side correct gezet.
