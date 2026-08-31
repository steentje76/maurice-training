-- migratie_v529.sql
-- F13 POST-AUDIT REMEDIATION -- P1-12 (query scalability).
--
-- KRITIEKSTE BEVINDING: sessions had geen index op (user_id, date) -- de
-- meest gebruikte querypatroon in de hele app (Home/History/Progress/
-- Exercise history draaien allemaal op user_id + date-filters). Live
-- gemeten met 10.000 representatieve testrijen (transactie, nooit
-- gecommit, geen productiedata geraakt): 2.051ms met een volledige Seq
-- Scan (9658 onnodig gescande rijen) -> 0.052ms met deze index (Index
-- Scan, 0 onnodig gescande rijen) -- ongeveer 40x sneller, en dit
-- schaalt lineair erger naarmate een gebruiker meer trainingsgeschiedenis
-- opbouwt.
create index if not exists idx_sessions_user_date on public.sessions(user_id, date desc);

-- 15 unindexed foreign keys gevonden (live geinventariseerd via
-- information_schema, vergeleken met pg_indexes) -- vooral op
-- multi-tenant-tabellen (organization_id/gym-gerelateerd). Lagere
-- queryfrequentie dan sessions, maar wel relevant voor JOIN-performance
-- en CASCADE-deletes naarmate het aantal organisaties/gyms groeit.
-- Standaard, laag-risico index-toevoegingen, geen gedragswijziging.
create index if not exists idx_billing_events_target_org on public.billing_events(target_organization_id);
create index if not exists idx_coach_program_assignments_org on public.coach_program_assignments(organization_id);
create index if not exists idx_coach_program_assignments_materialized on public.coach_program_assignments(materialized_program_id);
create index if not exists idx_coach_program_templates_org on public.coach_program_templates(organization_id);
create index if not exists idx_equipment_catalog_org on public.equipment_catalog(organization_id);
create index if not exists idx_event_responsibilities_assigned_user on public.event_responsibilities(assigned_user_id);
create index if not exists idx_exercise_equipment_org on public.exercise_equipment(organization_id);
create index if not exists idx_gyms_org on public.gyms(organization_id);
create index if not exists idx_gyms_updated_by on public.gyms(updated_by);
create index if not exists idx_social_challenges_creator on public.social_challenges(creator_id);
create index if not exists idx_social_groups_owner on public.social_groups(owner_user_id);
create index if not exists idx_social_notifications_actor on public.social_notifications(actor_id);
create index if not exists idx_team_events_linked_training_instance on public.team_events(linked_training_instance_id);
create index if not exists idx_team_events_location on public.team_events(location_id);
create index if not exists idx_team_events_created_by on public.team_events(created_by);

-- LIVE, DEFINITIEF GEVERIFIEERD NA TOEPASSING OP DE ECHTE, HUIDIGE
-- PRODUCTIEDATA: EXPLAIN ANALYZE op de Home-achtige query (laatste 30
-- dagen sessies) toont nu "Index Scan" op idx_sessions_user_date i.p.v.
-- de eerdere "Seq Scan" -- 0 rijen onnodig gescand.
