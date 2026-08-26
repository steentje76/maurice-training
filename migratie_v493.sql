-- ============================================================================
-- ROADMAP POST-V1 #5 (deel 1) — ONTBREKENDE FK-INDEXEN (v4.93.0)
-- ============================================================================
-- Reeds uitgevoerd op de live database (bevestigd via read-only verificatie:
-- alle 44 indexen aanwezig). Dit bestand dient als audit-trail/documentatie.
--
-- SCOPE-BESLISSING: de roadmap noemt twee onderdelen onder "Prestatiepunten uit
-- de Supabase-adviseur": (a) 82 x auth_rls_initplan, (b) 43 ontbrekende FK-
-- indexen ("zinvol vanaf enkele duizenden sessies").
--
-- UITSLUITEND (b) is in deze stap uitgevoerd. Reden voor het bewust NIET
-- meenemen van (a):
-- - RLS-policy's herschrijven (auth.uid() -> (select auth.uid())) raakt
--   TOEGANGSCONTROLE op vrijwel elke tabel in een live productiedatabase met
--   één actieve gebruiker die momenteel niet beschikbaar is. Een fout in een
--   van de tientallen policy's (waaronder complexe geneste EXISTS-subquery's
--   met users.gym_role_level-checks) kan toegang tot eigen data breken of,
--   in het ergste geval, data van andere gebruikers blootleggen.
-- - De roadmap zegt zelf expliciet dat dit "zinvol is vanaf enkele duizenden
--   sessies" -- het huidige datavolume is enkele rijen. Geen enkele meetbare
--   winst nu, wel reëel risico.
-- - Conform de MEGA MASTER SPRINT-stopregel: "STOP WEL wanneer... een
--   expliciete veiligheidsgrens wordt bereikt." Dit is bewust aangehouden
--   voor een moment met voldoende productiedata en/of eigenaarbeschikbaarheid
--   om eventuele regressie direct te kunnen verifiëren/herstellen.
--
-- (b) ONTBREKENDE FK-INDEXEN is wél uitgevoerd: PUUR ADDITIEF, geen enkele
-- wijziging aan queryresultaten, toegangscontrole of applicatiegedrag. Elke
-- CREATE INDEX IF NOT EXISTS is idempotent en veilig herhaalbaar.
-- ============================================================================

create index if not exists idx_exercises_created_by on public.exercises(created_by);
create index if not exists idx_sessions_exercise_id on public.sessions(exercise_id);
create index if not exists idx_gyms_plan_key on public.gyms(plan_key);
create index if not exists idx_users_individual_plan_key on public.users(individual_plan_key);
create index if not exists idx_users_gym_id on public.users(gym_id);
create index if not exists idx_exercise_equipment_user_id on public.exercise_equipment(user_id);
create index if not exists idx_program_blocks_program_id on public.program_blocks(program_id);
create index if not exists idx_training_exercises_exercise_id on public.training_exercises(exercise_id);
create index if not exists idx_program_block_exercises_exercise_id on public.program_block_exercises(exercise_id);
create index if not exists idx_custom_trainings_gym_id on public.custom_trainings(gym_id);
create index if not exists idx_custom_training_exercises_custom_training_id on public.custom_training_exercises(custom_training_id);
create index if not exists idx_plan_features_feature_key on public.plan_features(feature_key);
create index if not exists idx_plan_feature_quota_feature_key on public.plan_feature_quota(feature_key);
create index if not exists idx_usage_log_feature_key on public.usage_log(feature_key);
create index if not exists idx_credit_packs_feature_key on public.credit_packs(feature_key);
create index if not exists idx_user_credit_purchases_feature_key on public.user_credit_purchases(feature_key);
create index if not exists idx_user_credit_purchases_credit_pack_key on public.user_credit_purchases(credit_pack_key);
create index if not exists idx_wearable_oauth_state_user_id on public.wearable_oauth_state(user_id);
create index if not exists idx_gym_audit_log_gym_id on public.gym_audit_log(gym_id);
create index if not exists idx_content_shares_shared_by on public.content_shares(shared_by);
create index if not exists idx_content_shares_shared_with on public.content_shares(shared_with);
create index if not exists idx_equipment_catalog_gym_id on public.equipment_catalog(gym_id);
create index if not exists idx_equipment_catalog_user_id on public.equipment_catalog(user_id);
create index if not exists idx_goals_user_id on public.goals(user_id);
create index if not exists idx_goals_exercise_id on public.goals(exercise_id);
create index if not exists idx_exercise_goals_exercise_id on public.exercise_goals(exercise_id);
create index if not exists idx_organizations_owner_user_id on public.organizations(owner_user_id);
create index if not exists idx_teams_organization_id on public.teams(organization_id);
create index if not exists idx_training_groups_team_id on public.training_groups(team_id);
create index if not exists idx_memberships_training_group_id on public.memberships(training_group_id);
create index if not exists idx_memberships_organization_id on public.memberships(organization_id);
create index if not exists idx_memberships_team_id on public.memberships(team_id);
create index if not exists idx_coach_athlete_relationships_requested_by on public.coach_athlete_relationships(requested_by);
create index if not exists idx_external_records_connection_id on public.external_records(connection_id);
create index if not exists idx_training_programs_coach_user_id on public.training_programs(coach_user_id);
create index if not exists idx_program_sessions_microcycle_id on public.program_sessions(microcycle_id);
create index if not exists idx_program_sessions_custom_training_id on public.program_sessions(custom_training_id);
create index if not exists idx_assignments_program_session_id on public.assignments(program_session_id);
create index if not exists idx_assignments_assigned_by on public.assignments(assigned_by);
create index if not exists idx_assignments_executed_custom_training_id on public.assignments(executed_custom_training_id);
create index if not exists idx_seasons_organization_id on public.seasons(organization_id);
create index if not exists idx_macrocycles_season_id on public.macrocycles(season_id);
create index if not exists idx_mesocycles_macrocycle_id on public.mesocycles(macrocycle_id);
create index if not exists idx_race_segments_exercise_id on public.race_segments(exercise_id);
