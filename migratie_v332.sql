-- ══════════════════════════════════════════════════════════
-- Migratie v332 — exercise_equipment: persoonlijke instellingen per atleet
-- ══════════════════════════════════════════════════════════
-- Aanleiding: zelfde RLS-regressie als bij exercises (migratie v331) — DEC-004
-- (31 juli) zette exercise_equipment op read-only voor authenticated. addEquipment()
-- in index.html doet nog steeds een client-side sbPost() met de user-JWT, dat faalt
-- sinds die RLS-wijziging stil.
--
-- Ontwerpbeslissing (Product Owner, 1 augustus 2026): machine-instellingen (pin-stand,
-- zitting, etc.) zijn persoonlijke instellingen van de atleet, GEEN gym-breed gedeelde
-- data — dus geen gym_id-scoping zoals bij exercises (migratie v331), maar user_id-
-- scoping: iedere atleet ziet en beheert uitsluitend zijn eigen instellingen.
-- Idempotent: veilig opnieuw te draaien.

-- ── Stap 1: kolom ──────────────────────────────────────────────
ALTER TABLE exercise_equipment ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── Stap 2: bestaande policies vervangen door user-gescoopte variant ──
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='exercise_equipment'
  LOOP
    EXECUTE format('DROP POLICY %I ON exercise_equipment', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY exercise_equipment_own_rows ON exercise_equipment
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Stap 3: trigger — stampt user_id server-side, nooit de client vertrouwen ──
-- Herbruikt hetzelfde patroon als trg_set_user_id elders in het project.
CREATE OR REPLACE FUNCTION set_exercise_equipment_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_exercise_equipment_user ON exercise_equipment;
CREATE TRIGGER trg_set_exercise_equipment_user
  BEFORE INSERT ON exercise_equipment
  FOR EACH ROW EXECUTE FUNCTION set_exercise_equipment_user();

-- Let op: gym_id blijft bestaan (ongebruikt, altijd null) — bewust nog niet verwijderd,
-- voor het geval een toekomstige gym-breed-gedeelde-presets-variant hier alsnog bovenop
-- gebouwd wordt. Voor nu is dat expliciet NIET de gekozen richting.
