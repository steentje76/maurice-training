-- migratie_v521.sql
-- KRITIEKE P0/P1-BEVINDING (F11 Final Audit, terecht aangewezen als
-- verplichte gate vóór merge van MS-F11-05). Gevonden EN gerepareerd
-- VOORDAT migratie_v520.sql ooit werd gemergd naar main.
--
-- BEVINDING: de gyms_select_org_member-policy uit migratie_v520.sql gaf
-- ELK ACTIEF LID VAN DE ORGANISATIE toegang tot de VOLLEDIGE gyms-rij,
-- inclusief niet-branding-gerelateerde, gevoelige kolommen
-- (coach_pin_hash, plan_key, mollie_customer_id). RLS is row-level, niet
-- column-level.
--
-- LIVE ADVERSARIAAL BEVESTIGD: een gewoon lid kon coach_pin_hash en
-- mollie_customer_id direct uitlezen via een simpele SELECT op gyms.
--
-- FIX: de brede gyms_select_org_member-policy is volledig verwijderd.
-- Uitsluitend owner/admin mogen nog de volledige gyms-rij lezen (nodig
-- voor het admin-beheerscherm). Alle actieve leden krijgen de PUBLIEKE
-- brandingvelden uitsluitend via een nieuwe SECURITY DEFINER-functie
-- (get_organization_branding()) die zelf een kolom-projectie uitvoert,
-- onafhankelijk van de RLS die voor de aanroeper op de basistabel geldt.
--
-- BELANGRIJKE, EERLIJK GEDOCUMENTEERDE TUSSENSTAP: een eerste reparatie-
-- poging binnen dezelfde sessie gebruikte een database VIEW met
-- security_invoker=true, in de veronderstelling dat een kolom-beperkte
-- view afdoende bescherming zou bieden. Dit bleek ONJUIST: met
-- security_invoker=true wordt de RLS van de onderliggende tabel nog
-- steeds gecontroleerd voor de aanroeper zelf, dus als de tabel-RLS nog
-- steeds volledige-rij-toegang aan member/staff gaf, bood de view geen
-- extra bescherming. Deze tussenstap is nooit gemergd en direct binnen
-- dezelfde sessie gecorrigeerd naar de hieronder beschreven, daadwerkelijk
-- veilige SECURITY DEFINER-functie-aanpak.

drop policy if exists gyms_select_org_member on public.gyms;
drop view if exists public.organization_branding_public;

create policy gyms_select_org_admin_only on public.gyms
  for select
  using (
    organization_id is not null
    and public.org_has_role(organization_id, array['owner','admin'])
  );

create or replace function public.get_organization_branding(p_organization_id text)
returns table (
  organization_id text,
  display_name text,
  short_name text,
  logo_url text,
  primary_color text,
  accent_color text,
  branding_enabled boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select g.organization_id, g.name, g.short_name, g.logo_url, g.primary_color, g.accent_color, g.branding_enabled
  from public.gyms g
  where g.organization_id = p_organization_id
    and public.org_has_role(p_organization_id, array['owner','admin','staff','member']);
$$;

revoke all on function public.get_organization_branding(text) from public;
revoke execute on function public.get_organization_branding(text) from anon;
grant execute on function public.get_organization_branding(text) to authenticated;

-- LIVE ADVERSARIAAL GEVERIFIEERD NA DE FIX (transacties zonder commit, geen
-- permanente wijziging):
-- 1. Een gewoon lid krijgt 0 rijen bij een directe SELECT op de gyms-
--    basistabel (coach_pin_hash niet meer bereikbaar).
-- 2. Datzelfde lid krijgt via get_organization_branding() correct de
--    veilige, publieke brandingvelden -- geen coach_pin_hash, geen
--    mollie_customer_id, geen plan_key in de output.
-- 3. De owner/admin kan de volledige rij nog steeds direct lezen (nodig
--    voor het beheerscherm).
