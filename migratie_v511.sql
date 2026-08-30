-- migratie_v511.sql
-- KRITIEKE HOTFIX (gevonden tijdens de F11 Baseline & Gap Audit, vóór enige
-- MS-F11-01-implementatie): public.memberships stond self-role-elevation
-- toe, ondanks dat GYM-RLS-SCOPING-001 in de Capability Registry als
-- VALIDATED stond.
--
-- BEWEZEN, LIVE ADVERSARIAAL (transacties zonder commit, geen permanente
-- wijziging, vóór deze fix):
-- 1. Een willekeurige, niet-gerelateerde authenticated gebruiker kon een
--    memberships-rij INSERTEN met role='owner' voor EEN ORGANISATIE VAN
--    IEMAND ANDERS, zonder enige uitnodiging of bestaand lidmaatschap.
--    De enige bestaande WITH CHECK was (auth.uid() = user_id) -- geen
--    enkele controle op de role-waarde.
-- 2. Een gewoon, legitiem lid ('member') kon zichzelf via een UPDATE
--    promoveren naar role='owner' -- de bestaande UPDATE-policy had
--    dezelfde, onvoldoende (auth.uid() = user_id)-check.
--
-- IMPACT: elke authenticated gebruiker kon zichzelf volledige eigenaars-
-- rechten geven over ELKE organisatie in het systeem. P1 cross-tenant
-- privilege-escalatie-kwetsbaarheid.
--
-- FIX: zelf-insert uitsluitend met de laagste, neutrale rol ('member'),
-- TENZIJ de aanvrager de eigenaar (organizations.owner_user_id) van de
-- organisatie is (bootstrap-scenario). Zelf-update uitsluitend voor de
-- owner -- gewone leden kunnen momenteel geen enkel veld van de eigen
-- membership-rij wijzigen via deze policy, inclusief role. Een apart,
-- veilig "lid verlaat zelf" (status-only) mechanisme volgt later, met een
-- kolom-bewuste aanpak zodat role nooit impliciet wijzigbaar is.
--
-- LIVE ADVERSARIAAL HERBEVESTIGD NA DEZE FIX:
-- 1. Dezelfde INSERT-aanval -> expliciete RLS-policy-schending.
-- 2. Dezelfde UPDATE-aanval -> 0 rijen geraakt, role blijft 'member'.
-- 3. Legitiem zelf-insert als 'member' -> slaagt correct.
-- 4. Legitiem owner-bootstrap-scenario -> slaagt correct.

drop policy if exists memberships_insert_own on public.memberships;
create policy memberships_insert_own on public.memberships
  for insert
  with check (
    auth.uid() = user_id
    and (
      role = 'member'
      or exists (select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = auth.uid())
    )
  );

drop policy if exists memberships_update_own on public.memberships;
create policy memberships_update_own on public.memberships
  for update
  using (
    auth.uid() = user_id
    and exists (select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = auth.uid())
  );
