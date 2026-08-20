-- ══════════════════════════════════════════════════════════
-- Migratie v331 — Gym-breed oefeningen delen + fix RLS-regressie
-- ══════════════════════════════════════════════════════════
-- Aanleiding: DEC-004 (31 juli) zette 'exercises' op read-only RLS voor
-- authenticated (alleen service_role mag schrijven). saveLosOefening() in
-- index.html doet echter nog steeds een client-side sbPostQ('exercises', ex)
-- met de user-JWT om een nieuwe oefening aan te maken — dat faalt sinds die
-- RLS-wijziging vermoedelijk stil. Deze migratie lost dat op door bewust
-- schrijfrecht te geven aan coach/manager/owner, geschopt tot hun eigen gym.
--
-- Ontwerp: gym_id NULL = bestaande globale referentiebibliotheek (blijft voor
-- iedereen leesbaar, ongewijzigd). gym_id gezet = gym-specifieke oefening,
-- alleen zichtbaar voor leden van die gym.
-- Idempotent: veilig opnieuw te draaien.

-- ── Stap 1: kolommen ──────────────────────────────────────────────
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gym_id text REFERENCES gyms(id) ON DELETE SET NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── Stap 2: bestaande SELECT-policies vervangen door gym-gescoopte variant ──
-- Dynamisch (niet op naam), zodat dit werkt ongeacht hoe de policy van
-- 31 juli precies heette.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='exercises' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON exercises', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY exercises_select_global_or_own_gym ON exercises
  FOR SELECT TO authenticated
  USING (
    gym_id IS NULL
    OR gym_id = (SELECT gym_id FROM users WHERE id = auth.uid()::text)
  );

-- ── Stap 3: trigger — stampt gym_id/created_by server-side, weigert leden ──
-- Zelfde patroon als trg_set_user_id: nooit de client vertrouwen voor wie de
-- oefening toevoegt of aan welke gym die hangt. Rolcheck zit hier (harde
-- weigering via exception) én in de RLS-policy hieronder (dubbele laag,
-- zelfde aanpak als elders in het project).
CREATE OR REPLACE FUNCTION set_exercise_gym_context()
RETURNS TRIGGER AS $$
DECLARE
  caller_gym_id text;
  caller_role_level int;
BEGIN
  SELECT gym_id, gym_role_level INTO caller_gym_id, caller_role_level
  FROM users WHERE id = auth.uid()::text;

  IF caller_role_level IS NULL OR caller_role_level < 1 THEN
    RAISE EXCEPTION 'Alleen coach, manager of owner mag oefeningen toevoegen aan de gym-bibliotheek';
  END IF;

  NEW.gym_id := caller_gym_id;
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_exercise_gym_context ON exercises;
CREATE TRIGGER trg_set_exercise_gym_context
  BEFORE INSERT ON exercises
  FOR EACH ROW EXECUTE FUNCTION set_exercise_gym_context();

-- ── Stap 4: INSERT/UPDATE/DELETE policies (alleen coach+, binnen eigen gym) ──
-- WITH CHECK evalueert ná de BEFORE-trigger, dus gym_id staat dan al vast op
-- de eigen gym — dit is een extra laag, niet de enige bescherming.
CREATE POLICY exercises_insert_gym_coach ON exercises
  FOR INSERT TO authenticated
  WITH CHECK (
    gym_id IS NOT NULL
    AND gym_id = (SELECT gym_id FROM users WHERE id = auth.uid()::text)
  );

CREATE POLICY exercises_update_gym_coach ON exercises
  FOR UPDATE TO authenticated
  USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid()::text)
    AND (SELECT gym_role_level FROM users WHERE id = auth.uid()::text) >= 1
  )
  WITH CHECK (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid()::text)
  );

CREATE POLICY exercises_delete_gym_coach ON exercises
  FOR DELETE TO authenticated
  USING (
    gym_id = (SELECT gym_id FROM users WHERE id = auth.uid()::text)
    AND (SELECT gym_role_level FROM users WHERE id = auth.uid()::text) >= 1
  );

-- Let op: de globale referentiebibliotheek (gym_id IS NULL) blijft voor
-- iedereen alleen-lezen — geen enkele policy hierboven staat schrijven op
-- gym_id IS NULL toe, dat blijft uitsluitend service_role (ongewijzigd
-- t.o.v. DEC-004).
