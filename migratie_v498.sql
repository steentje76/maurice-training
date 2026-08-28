-- migratie_v498.sql
-- MS-F1-01 (Multi-tenant RLS Security Closure) — GYM-RLS-SCOPING-001
--
-- BEVINDING: organizations/teams/training_groups/seasons/macrocycles/
-- mesocycles/microcycles hadden een SELECT-policy "auth.role() =
-- 'authenticated'" — elke ingelogde gebruiker kon ALLE rijen van ALLE
-- (toekomstige) organisaties/teams/cycli lezen, ongeacht lidmaatschap.
-- 0 rijen in alle betrokken tabellen op moment van uitvoering (Phase 3/11
-- nog niet gestart) — geen actieve data-exposure, wel een noodzakelijke
-- afscherming vóórdat er echte Coach/Gym-data bijkomt.
--
-- FIX: membership-gescoopte policies, met een owner-bootstrap-uitzondering
-- (organizations.owner_user_id = auth.uid()) zodat een oprichter zijn eigen
-- organisatie kan zien vóórdat er ooit een aparte membership-rij voor
-- zichzelf is aangemaakt.
--
-- Live geverifieerd (transactie, rollback, met 2 volledig gescheiden
-- test-tenants):
--  - lid van tenant A ziet tenant A (organizations + teams): ALLOW
--  - lid van tenant A ziet tenant B: DENY (0 rijen)
--  - onbetrokken gebruiker C ziet geen van beide tenants: DENY (0 rijen)
--  - owner zonder eigen membership-rij ziet zijn eigen organisatie: ALLOW

DROP POLICY IF EXISTS organizations_select_all ON public.organizations;
CREATE POLICY organizations_select_member_or_owner ON public.organizations
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = organizations.id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS teams_select_all ON public.teams;
CREATE POLICY teams_select_member ON public.teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = teams.organization_id AND o.owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.memberships m WHERE (m.team_id = teams.id OR m.organization_id = teams.organization_id) AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS training_groups_select_all ON public.training_groups;
CREATE POLICY training_groups_select_member ON public.training_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams t JOIN public.organizations o ON o.id = t.organization_id
      WHERE t.id = training_groups.team_id AND o.owner_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.memberships m WHERE (m.training_group_id = training_groups.id OR m.team_id = training_groups.team_id) AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS seasons_select_all ON public.seasons;
CREATE POLICY seasons_select_member ON public.seasons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = seasons.organization_id AND o.owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = seasons.organization_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS macrocycles_select_all ON public.macrocycles;
CREATE POLICY macrocycles_select_member ON public.macrocycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.seasons s JOIN public.organizations o ON o.id = s.organization_id
      WHERE s.id = macrocycles.season_id AND (o.owner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = o.id AND m.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS mesocycles_select_all ON public.mesocycles;
CREATE POLICY mesocycles_select_member ON public.mesocycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.macrocycles mc
      JOIN public.seasons s ON s.id = mc.season_id
      JOIN public.organizations o ON o.id = s.organization_id
      WHERE mc.id = mesocycles.macrocycle_id AND (o.owner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = o.id AND m.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS microcycles_select_all ON public.microcycles;
CREATE POLICY microcycles_select_member ON public.microcycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mesocycles me
      JOIN public.macrocycles mc ON mc.id = me.macrocycle_id
      JOIN public.seasons s ON s.id = mc.season_id
      JOIN public.organizations o ON o.id = s.organization_id
      WHERE me.id = microcycles.mesocycle_id AND (o.owner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.organization_id = o.id AND m.user_id = auth.uid()))
    )
  );

-- ROLLBACK (afgeraden — herstelt de brede leestoegang):
--   Zie de "auth.role() = 'authenticated'"-varianten in de audithistorie
--   (docs/DB_VERIFICATION.md) voor de exacte oude policy-definities.
