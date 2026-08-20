-- ══════════════════════════════════════════════════════════
-- Migratie v335 — Apparatuur-catalogus (Leg Press, Lat Pulldown, ...)
-- ══════════════════════════════════════════════════════════
-- Los van equipment_types (instellingsvelden per oefening op een machine, bv.
-- "Zitting: 5") — dit is een catalogus van daadwerkelijke apparaten/machines, met
-- spiergroep-metadata, herbruikbaar in filters net als exercises.muscle_primary/secondary.
--
-- Zichtbaarheid — geen los scope-veld nodig, gym_id/user_id (nullable placeholders,
-- zelfde patroon als exercise_equipment) bepalen dit impliciet, precies één van beide is
-- altijd gezet:
--   - gym-leden zien de door hun gym-owner beheerde lijst (alleen owner mag schrijven —
--     net als de globale oefeningen-bibliotheek)
--   - losse atleten zonder gym_id beheren hun eigen lijst zelf, volledig
--
-- Geen automatische seed-INSERT: elke gym/atleet start met een lege tabel. De basislijst
-- (Leg Press, Lat Pulldown, Cable Row, Squat Rack, ...) wordt client-side getoond als
-- fallback zodra de tabel voor die gym/atleet leeg is — zelfde patroon als
-- ensureEquipmentTypesLoaded() al gebruikt. Dat voorkomt DB-rijen "van niemand" die de
-- eigenaarschaps-CHECK hieronder zouden schenden, en een gym-owner kan de fallback gewoon
-- overnemen/aanpassen als startpunt.
--
-- Idempotent: veilig opnieuw te draaien.

CREATE TABLE IF NOT EXISTS equipment_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  muscle_primary text[] NOT NULL DEFAULT '{}',
  muscle_secondary text[] NOT NULL DEFAULT '{}',
  usage_note text,
  gym_id text REFERENCES gyms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE equipment_catalog ADD CONSTRAINT equipment_catalog_owner_chk CHECK (
    (gym_id IS NOT NULL AND user_id IS NULL) OR (gym_id IS NULL AND user_id IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='equipment_catalog'
  LOOP
    EXECUTE format('DROP POLICY %I ON equipment_catalog', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY equipment_catalog_select ON equipment_catalog
  FOR SELECT TO authenticated
  USING (
    (gym_id IS NOT NULL AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text))
    OR (user_id = auth.uid())
  );

-- INSERT: iedereen mag proberen — de trigger hieronder bepaalt gym_id/user_id o.b.v. de
-- aanroeper zelf (nooit de client vertrouwen) en weigert hard als de rol niet toereikend
-- is. WITH CHECK true is bewust: het echte slot zit in de trigger, niet hier.
CREATE POLICY equipment_catalog_insert ON equipment_catalog
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY equipment_catalog_update ON equipment_catalog
  FOR UPDATE TO authenticated
  USING (
    (gym_id IS NOT NULL AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
    OR (user_id = auth.uid())
  )
  WITH CHECK (
    (gym_id IS NOT NULL AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
    OR (user_id = auth.uid())
  );

CREATE POLICY equipment_catalog_delete ON equipment_catalog
  FOR DELETE TO authenticated
  USING (
    (gym_id IS NOT NULL AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
    OR (user_id = auth.uid())
  );

-- Trigger: bepaalt gym_id/user_id o.b.v. de aanroeper zelf. Gym-leden (gym_id gezet op hun
-- eigen user-rij) mogen alleen schrijven als ze owner zijn (rolniveau >=3) — het resultaat
-- wordt dan gym-breed. Losse atleten (geen gym_id) mogen altijd hun eigen, persoonlijke
-- rij aanmaken/aanpassen.
CREATE OR REPLACE FUNCTION set_equipment_catalog_owner()
RETURNS TRIGGER AS $$
DECLARE
  caller_gym_id text;
  caller_role_level int;
BEGIN
  SELECT gym_id, gym_role_level INTO caller_gym_id, caller_role_level
  FROM users WHERE id = auth.uid()::text;

  IF caller_gym_id IS NOT NULL THEN
    IF caller_role_level IS NULL OR caller_role_level < 3 THEN
      RAISE EXCEPTION 'Alleen de gym-owner mag de apparatuur-catalogus van de gym beheren';
    END IF;
    NEW.gym_id := caller_gym_id;
    NEW.user_id := NULL;
  ELSE
    NEW.gym_id := NULL;
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_equipment_catalog_owner ON equipment_catalog;
CREATE TRIGGER trg_set_equipment_catalog_owner
  BEFORE INSERT ON equipment_catalog
  FOR EACH ROW EXECUTE FUNCTION set_equipment_catalog_owner();

-- ══════════════════════════════════════════════════════════
-- Let op — UI-flow volgt in dezelfde sessie als deze migratie (in tegenstelling tot v333,
-- dat schema/UI bewust splitste): Beheer-sectie "Apparatuur-catalogus" met spiergroep-
-- kiezer, alleen schrijfbaar voor gym-owner of losse atleet (teamRoleLevel>=3 of
-- teamRoleLevel===-1 client-side, hard gehandhaafd door bovenstaande RLS/trigger).
-- ══════════════════════════════════════════════════════════
