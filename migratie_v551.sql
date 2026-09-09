-- migratie_v551.sql
-- SPRINT C2-B — Mijn Trainingen Canonical Occurrence + Assignment Scheduling.
--
-- ARCHITECTUURBESLISSING (C2-A, PO-goedgekeurd): Occurrence + Assignment
-- is het canonical model, ZELFS voor individuele self-scheduling -- de
-- assignment-laag blijft niet leeg, exact zodat een latere coach/team-
-- uitbreiding geen tweede semantiek en geen schema-rewrite vereist. Dit
-- is direct gemodelleerd naar het bewezen bestaande precedent
-- coach_program_templates/coach_program_assignments (materialized_program_id/
-- revision_at_assignment), maar met een eigen SNAPSHOT i.p.v. een revisie-
-- nummer, omdat vaste_trainingen/training_exercises GEEN enkele
-- versioning-kolom hebben (geverifieerd vóór dit ontwerp) -- een fake
-- revisienummer zou expliciet verboden zijn. In plaats daarvan hergebruikt
-- de applicatielaag de AL BESTAANDE snapshotFromVasteTraining()-functie
-- (nu al gebruikt bij execution-start) op SCHEDULING-moment, exact
-- dezelfde, al-bewezen bevriezingslogica.
--
-- programs/program_blocks blijven volledig ONGEWIJZIGD (PO-beslissing 1B)
-- -- dit is uitsluitend voor Mijn Trainingen.
--
-- DATE-ONLY V1 (PO-beslissing 1F): uitsluitend planned_date (date), geen
-- tijdstip, geen recurrence rule.

CREATE TABLE public.planned_training_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_definition_id text NOT NULL, -- verwijst naar vaste_trainingen.id (text, geen FK naar een andere schema-eigenaar-tabel hier afgedwongen; owner-consistentie wordt geborgd via de RPC hieronder, zie punt 15 van de opdracht)
  planned_date date NOT NULL,
  definition_snapshot jsonb NOT NULL, -- bevroren workout-inhoud op planningsmoment (snapshotFromVasteTraining()-vorm, hergebruikt, geen nieuwe snapshotlogica)
  status text NOT NULL DEFAULT 'scheduled', -- occurrence-niveau: scheduled | cancelled (canceled door creator/coach -- NIET hetzelfde as assignment-skip, PO-beslissing 1E)
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planned_training_occurrences_status_check CHECK (status IN ('scheduled', 'cancelled'))
);

CREATE INDEX idx_ptocc_creator_date ON public.planned_training_occurrences (creator_user_id, planned_date);

CREATE TABLE public.planned_training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.planned_training_occurrences(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_date_override date NULL, -- effective date = COALESCE(personal_date_override, occurrence.planned_date). V1 self-scheduling heeft dit normaal NULL (creator==athlete, geen reden tot override), maar het veld bestaat vanaf nu zodat een toekomstige coach/team-personal-override geen schemawijziging vereist (PO-beslissing 1C).
  status text NOT NULL DEFAULT 'planned', -- assignment-niveau: planned | skipped | completed (completed wordt door de applicatielaag gezet bij succesvolle finish, zie training_instances-koppeling; NOOIT hier losstaand van echte executie)
  training_instance_id uuid NULL REFERENCES public.training_instances(id) ON DELETE SET NULL, -- stabiele FK-link naar de daadwerkelijke executie (vervangt voor dit nieuwe model het oudere 'prog_<id>'-stringpatroon -- hier WEL een echte FK, zoals de opdracht als voorkeur aangeeft)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planned_training_assignments_status_check CHECK (status IN ('planned', 'skipped', 'completed')),
  CONSTRAINT planned_training_assignments_unique_per_occurrence UNIQUE (occurrence_id, athlete_user_id) -- voorkomt duplicate-assignment voor dezelfde sporter op dezelfde occurrence (create-idempotency-bescherming op databaseniveau, punt 22 van de opdracht)
);

CREATE INDEX idx_ptass_athlete_date ON public.planned_training_assignments (athlete_user_id, personal_date_override);
CREATE INDEX idx_ptass_occurrence ON public.planned_training_assignments (occurrence_id);
CREATE INDEX idx_ptass_training_instance ON public.planned_training_assignments (training_instance_id);

ALTER TABLE public.planned_training_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_training_assignments ENABLE ROW LEVEL SECURITY;

-- RLS V1 (PO-beslissing: owner-only, GEEN brede coach/team-policy "voor
-- later" -- die komt pas wanneer coach/team scheduling daadwerkelijk
-- gebouwd wordt, gekoppeld aan coach_athlete_relationships/coach_access_scopes).
CREATE POLICY ptocc_select_own ON public.planned_training_occurrences
  FOR SELECT USING (creator_user_id = auth.uid());
CREATE POLICY ptocc_insert_own ON public.planned_training_occurrences
  FOR INSERT WITH CHECK (creator_user_id = auth.uid());
CREATE POLICY ptocc_update_own ON public.planned_training_occurrences
  FOR UPDATE USING (creator_user_id = auth.uid()) WITH CHECK (creator_user_id = auth.uid());
CREATE POLICY ptocc_delete_own ON public.planned_training_occurrences
  FOR DELETE USING (creator_user_id = auth.uid());

CREATE POLICY ptass_select_own ON public.planned_training_assignments
  FOR SELECT USING (athlete_user_id = auth.uid());
CREATE POLICY ptass_insert_own ON public.planned_training_assignments
  FOR INSERT WITH CHECK (athlete_user_id = auth.uid());
CREATE POLICY ptass_update_own ON public.planned_training_assignments
  FOR UPDATE USING (athlete_user_id = auth.uid()) WITH CHECK (athlete_user_id = auth.uid());
CREATE POLICY ptass_delete_own ON public.planned_training_assignments
  FOR DELETE USING (athlete_user_id = auth.uid());

-- OWNER-CONSISTENTIE RPC (punt 8/14/15 van de opdracht): garandeert atomair
-- dat een occurrence + exact één self-assignment samen ontstaan (geen
-- orphan occurrence door een half-mislukte create), en dat de
-- workout_definition daadwerkelijk aan de aanroepende gebruiker toebehoort
-- (user A kan geen occurrence maken voor vaste_training van user B --
-- dit wordt HIER, server-side in de functie, afgedwongen, niet uitsluitend
-- door de UI). SECURITY DEFINER is nodig om de aanroeper de INSERT op
-- beide tabellen te laten doen binnen één transactie; de functie zelf
-- controleert auth.uid() en definition-ownership vóór enige write.
CREATE OR REPLACE FUNCTION public.schedule_my_training(
  p_workout_definition_id text,
  p_planned_date date,
  p_definition_snapshot jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owns boolean;
  v_occurrence_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'schedule_my_training: geen ingelogde gebruiker';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.vaste_trainingen WHERE id = p_workout_definition_id AND user_id = v_user_id) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'schedule_my_training: workout_definition_id behoort niet toe aan de aanroepende gebruiker';
  END IF;

  INSERT INTO public.planned_training_occurrences (creator_user_id, workout_definition_id, planned_date, definition_snapshot)
  VALUES (v_user_id, p_workout_definition_id, p_planned_date, p_definition_snapshot)
  RETURNING id INTO v_occurrence_id;

  INSERT INTO public.planned_training_assignments (occurrence_id, athlete_user_id)
  VALUES (v_occurrence_id, v_user_id);

  RETURN v_occurrence_id;
END;
$$;

COMMENT ON TABLE public.planned_training_occurrences IS
  'Sprint C2-B: canonical gedeelde planningidentiteit voor Mijn Trainingen. Bevat GEEN sporter-specifieke status -- dat is planned_training_assignments. Future-ready voor coach/team: één occurrence kan later N assignments krijgen zonder schemawijziging.';
COMMENT ON TABLE public.planned_training_assignments IS
  'Sprint C2-B: sporter-specifieke koppeling aan een occurrence. V1 self-scheduling: exact één assignment per occurrence (creator==athlete). effective planned date = COALESCE(personal_date_override, occurrence.planned_date) -- puur afgeleid, nooit gedupliceerd opgeslagen.';
COMMENT ON FUNCTION public.schedule_my_training IS
  'Atomaire, owner-geverifieerde creatie van één occurrence + exact één self-assignment. Voorkomt orphan occurrences en cross-user definition-misbruik op databaseniveau (niet uitsluitend clientside).';

-- Geen wijziging aan programs/program_blocks/training_instances (behalve
-- de NIEUWE, additive, nullable FK training_instance_id op
-- planned_training_assignments zelf)/sessions/availability_periods/
-- coach_program_assignments. Geen backfill: na deze migratie zijn beide
-- nieuwe tabellen leeg (0 rijen), correct voor een feature zonder
-- bestaande historische geplande datums.
