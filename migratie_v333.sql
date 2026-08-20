-- ══════════════════════════════════════════════════════════
-- Migratie v333 — 3-laags zichtbaarheidsmodel: persoonlijk / gym / globaal
-- ══════════════════════════════════════════════════════════
-- Vervangt het gym-only model uit migratie v331 (dat alleen laag 2 dekte) door een
-- volledig 3-laags model, van toepassing op zowel exercises als custom_trainings:
--   - personal: alleen de maker zelf, tenzij expliciet gedeeld met specifieke personen
--     via content_shares (peer-to-peer, bv. een trainingsmaatje — GEEN gym-brede deling)
--   - gym:      coach/manager/owner maakt aan, zichtbaar voor alle leden van die gym
--   - global:   een gym-owner (elke owner, niet alleen de app-eigenaar) maakt aan,
--     zichtbaar voor iedereen op het platform
--
-- Achtergrond: migratie v331 loste alleen op dat coach+ gym-specifieke oefeningen kon
-- toevoegen. Het bestaande Beheer-scherm (YT-links, spiergroepen, rust-tijd, peak goal,
-- ratio-anchor, 1RM, oefening deactiveren/toevoegen aan de GLOBALE bibliotheek) bleef
-- daarna nog steeds stuk, want v331's UPDATE-policy dekte alleen gym_id-rijen, niet de
-- bestaande globale bibliotheek (gym_id IS NULL). Dit vervangt v331 volledig.
--
-- Idempotent: veilig opnieuw te draaien. Bevat alleen schema + RLS — de UI-flows (delen-
-- knop, scope kiezen bij aanmaken, Beheer-scherm herstellen) volgen in een aparte sessie.

-- ══════════════════════════════════════════════════════════
-- DEEL 1: generieke deel-tabel (herbruikbaar voor exercises én custom_trainings,
-- en toekomstige entiteiten zonder opnieuw schema te hoeven bedenken)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS content_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('exercise','training')),
  content_id text NOT NULL,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, shared_with)
);
ALTER TABLE content_shares ENABLE ROW LEVEL SECURITY;
-- Policies + trigger voor content_shares staan pas aan het EIND van dit script (DEEL 5):
-- die verwijzen naar exercises.scope en custom_trainings.scope, die kolommen bestaan
-- pas na DEEL 2/3 hieronder. Volgorde-afhankelijkheid, expres zo neergezet.

-- ══════════════════════════════════════════════════════════
-- DEEL 2: exercises — scope-kolom + backfill + nieuwe policies (vervangt v331)
-- ══════════════════════════════════════════════════════════
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS scope text;
-- Backfill: alles wat vóór dit model bestond was de globale bibliotheek (gym_id NULL),
-- of — indien al gym-specifiek aangemaakt via v331's korte tussenperiode — 'gym'.
UPDATE exercises SET scope = CASE WHEN gym_id IS NOT NULL THEN 'gym' ELSE 'global' END WHERE scope IS NULL;
ALTER TABLE exercises ALTER COLUMN scope SET DEFAULT 'personal';
ALTER TABLE exercises ALTER COLUMN scope SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE exercises ADD CONSTRAINT exercises_scope_chk CHECK (scope IN ('personal','gym','global'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='exercises'
  LOOP
    EXECUTE format('DROP POLICY %I ON exercises', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY exercises_select_v333 ON exercises
  FOR SELECT TO authenticated
  USING (
    scope='global'
    OR (scope='gym' AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text))
    OR (scope='personal' AND created_by = auth.uid())
    OR (scope='personal' AND EXISTS(
        SELECT 1 FROM content_shares cs
        WHERE cs.content_type='exercise' AND cs.content_id=exercises.id AND cs.shared_with=auth.uid()))
  );

CREATE POLICY exercises_insert_v333 ON exercises
  FOR INSERT TO authenticated
  WITH CHECK (
    scope='personal'
    OR (scope='gym' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
    OR (scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
  );

CREATE POLICY exercises_update_v333 ON exercises
  FOR UPDATE TO authenticated
  USING (
    (scope='personal' AND created_by = auth.uid())
    OR (scope='gym' AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
    OR (scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
  )
  WITH CHECK (
    (scope='personal' AND created_by = auth.uid())
    OR (scope='gym' AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
    OR (scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
  );

CREATE POLICY exercises_delete_v333 ON exercises
  FOR DELETE TO authenticated
  USING (
    (scope='personal' AND created_by = auth.uid())
    OR (scope='gym' AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
    OR (scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
  );

-- Trigger vervangt v331's set_exercise_gym_context(): stampt gym_id/created_by o.b.v.
-- de gekozen scope, en weigert hard als de rol niet toereikend is voor die scope.
CREATE OR REPLACE FUNCTION set_exercise_scope_context()
RETURNS TRIGGER AS $$
DECLARE
  caller_gym_id text;
  caller_role_level int;
BEGIN
  SELECT gym_id, gym_role_level INTO caller_gym_id, caller_role_level
  FROM users WHERE id = auth.uid()::text;

  IF NEW.scope IS NULL THEN NEW.scope := 'personal'; END IF;

  IF NEW.scope = 'personal' THEN
    NEW.gym_id := NULL;
    NEW.created_by := auth.uid();
  ELSIF NEW.scope = 'gym' THEN
    IF caller_role_level IS NULL OR caller_role_level < 1 THEN
      RAISE EXCEPTION 'Alleen coach, manager of owner mag oefeningen gym-breed delen';
    END IF;
    NEW.gym_id := caller_gym_id;
    NEW.created_by := auth.uid();
  ELSIF NEW.scope = 'global' THEN
    IF caller_role_level IS NULL OR caller_role_level < 3 THEN
      RAISE EXCEPTION 'Alleen een gym-owner mag oefeningen aan de globale bibliotheek toevoegen';
    END IF;
    NEW.gym_id := NULL;
    NEW.created_by := auth.uid();
  ELSE
    RAISE EXCEPTION 'Ongeldige scope: %', NEW.scope;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS set_exercise_gym_context() CASCADE; -- v331, vervangen
DROP TRIGGER IF EXISTS trg_set_exercise_scope_context ON exercises;
CREATE TRIGGER trg_set_exercise_scope_context
  BEFORE INSERT ON exercises
  FOR EACH ROW EXECUTE FUNCTION set_exercise_scope_context();

-- ══════════════════════════════════════════════════════════
-- DEEL 3: custom_trainings — zelfde model. Alle bestaande rijen waren al impliciet
-- persoonlijk (single-user vóór vandaag), dus scope='personal' als default is hier
-- meteen correct — geen aparte backfill-logica nodig zoals bij exercises.
-- ══════════════════════════════════════════════════════════
ALTER TABLE custom_trainings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE custom_trainings ADD COLUMN IF NOT EXISTS gym_id text REFERENCES gyms(id) ON DELETE SET NULL;
ALTER TABLE custom_trainings ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'personal';
DO $$ BEGIN
  ALTER TABLE custom_trainings ADD CONSTRAINT custom_trainings_scope_chk CHECK (scope IN ('personal','gym','global'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Bestaande rijen zonder user_id (van vóór expliciete scoping) toewijzen aan de enige
-- huidige echte gebruiker, zodat ze niet wees worden. Bij een echt multi-user bestand
-- is dit een no-op (alle rijen hebben dan al een eigenaar).
UPDATE custom_trainings SET user_id = (SELECT id FROM auth.users WHERE email='steentje76@gmail.com')
  WHERE user_id IS NULL;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='custom_trainings'
  LOOP
    EXECUTE format('DROP POLICY %I ON custom_trainings', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY custom_trainings_select_v333 ON custom_trainings
  FOR SELECT TO authenticated
  USING (
    scope='global'
    OR (scope='gym' AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text))
    OR (scope='personal' AND user_id = auth.uid())
    OR (scope='personal' AND EXISTS(
        SELECT 1 FROM content_shares cs
        WHERE cs.content_type='training' AND cs.content_id=custom_trainings.id::text AND cs.shared_with=auth.uid()))
  );

CREATE POLICY custom_trainings_insert_v333 ON custom_trainings
  FOR INSERT TO authenticated
  WITH CHECK (
    scope='personal'
    OR (scope='gym' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
    OR (scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
  );

CREATE POLICY custom_trainings_update_v333 ON custom_trainings
  FOR UPDATE TO authenticated
  USING (
    (scope='personal' AND user_id = auth.uid())
    OR (scope='gym' AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
    OR (scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
  )
  WITH CHECK (
    (scope='personal' AND user_id = auth.uid())
    OR (scope='gym' AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
    OR (scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
  );

CREATE POLICY custom_trainings_delete_v333 ON custom_trainings
  FOR DELETE TO authenticated
  USING (
    (scope='personal' AND user_id = auth.uid())
    OR (scope='gym' AND gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
    OR (scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
  );

CREATE OR REPLACE FUNCTION set_training_scope_context()
RETURNS TRIGGER AS $$
DECLARE
  caller_gym_id text;
  caller_role_level int;
BEGIN
  SELECT gym_id, gym_role_level INTO caller_gym_id, caller_role_level
  FROM users WHERE id = auth.uid()::text;

  IF NEW.scope IS NULL THEN NEW.scope := 'personal'; END IF;

  IF NEW.scope = 'personal' THEN
    NEW.gym_id := NULL;
    NEW.user_id := auth.uid();
  ELSIF NEW.scope = 'gym' THEN
    IF caller_role_level IS NULL OR caller_role_level < 1 THEN
      RAISE EXCEPTION 'Alleen coach, manager of owner mag trainingen gym-breed delen';
    END IF;
    NEW.gym_id := caller_gym_id;
    NEW.user_id := auth.uid();
  ELSIF NEW.scope = 'global' THEN
    IF caller_role_level IS NULL OR caller_role_level < 3 THEN
      RAISE EXCEPTION 'Alleen een gym-owner mag trainingen globaal delen';
    END IF;
    NEW.gym_id := NULL;
    NEW.user_id := auth.uid();
  ELSE
    RAISE EXCEPTION 'Ongeldige scope: %', NEW.scope;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_training_scope_context ON custom_trainings;
CREATE TRIGGER trg_set_training_scope_context
  BEFORE INSERT ON custom_trainings
  FOR EACH ROW EXECUTE FUNCTION set_training_scope_context();

-- ══════════════════════════════════════════════════════════
-- DEEL 4: custom_training_exercises — zichtbaarheid/schrijfrecht volgt de parent
-- (custom_trainings) via een subquery-join, geen eigen scope-kolom nodig.
-- ══════════════════════════════════════════════════════════
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='custom_training_exercises'
  LOOP
    EXECUTE format('DROP POLICY %I ON custom_training_exercises', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY custom_training_exercises_select_v333 ON custom_training_exercises
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM custom_trainings ct WHERE ct.id = custom_training_exercises.custom_training_id
      AND (
        ct.scope='global'
        OR (ct.scope='gym' AND ct.gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text))
        OR (ct.scope='personal' AND ct.user_id = auth.uid())
        OR (ct.scope='personal' AND EXISTS(
            SELECT 1 FROM content_shares cs
            WHERE cs.content_type='training' AND cs.content_id=ct.id::text AND cs.shared_with=auth.uid()))
      ))
  );

CREATE POLICY custom_training_exercises_write_v333 ON custom_training_exercises
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM custom_trainings ct WHERE ct.id = custom_training_exercises.custom_training_id
      AND (
        (ct.scope='personal' AND ct.user_id = auth.uid())
        OR (ct.scope='gym' AND ct.gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
        OR (ct.scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
      ))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM custom_trainings ct WHERE ct.id = custom_training_exercises.custom_training_id
      AND (
        (ct.scope='personal' AND ct.user_id = auth.uid())
        OR (ct.scope='gym' AND ct.gym_id = (SELECT gym_id FROM users WHERE id=auth.uid()::text) AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 1)
        OR (ct.scope='global' AND (SELECT gym_role_level FROM users WHERE id=auth.uid()::text) >= 3)
      ))
  );

-- ══════════════════════════════════════════════════════════
-- DEEL 5: content_shares — policies + trigger (moet ná DEEL 2/3, verwijst naar
-- exercises.scope en custom_trainings.scope)
-- ══════════════════════════════════════════════════════════
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='content_shares'
  LOOP
    EXECUTE format('DROP POLICY %I ON content_shares', pol.policyname);
  END LOOP;
END $$;

-- Beide partijen (deler + ontvanger) mogen de share-rij zien; alleen de deler mag 'm
-- aanmaken/verwijderen. Server-side check dat je alleen je EIGEN personal-content mag
-- delen (niet andermans oefening/training) zit in de WITH CHECK hieronder.
CREATE POLICY content_shares_select_own ON content_shares
  FOR SELECT TO authenticated
  USING (shared_by = auth.uid() OR shared_with = auth.uid());

CREATE POLICY content_shares_insert_owner ON content_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    AND (
      (content_type='exercise' AND EXISTS(
        SELECT 1 FROM exercises e WHERE e.id=content_id AND e.scope='personal' AND e.created_by=auth.uid()))
      OR (content_type='training' AND EXISTS(
        SELECT 1 FROM custom_trainings ct WHERE ct.id::text=content_id AND ct.scope='personal' AND ct.user_id=auth.uid()))
    )
  );

CREATE POLICY content_shares_delete_owner ON content_shares
  FOR DELETE TO authenticated
  USING (shared_by = auth.uid());

CREATE OR REPLACE FUNCTION set_content_share_owner()
RETURNS TRIGGER AS $$
BEGIN
  NEW.shared_by := auth.uid(); -- nooit de client vertrouwen voor wie er deelt
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_content_share_owner ON content_shares;
CREATE TRIGGER trg_set_content_share_owner
  BEFORE INSERT ON content_shares
  FOR EACH ROW EXECUTE FUNCTION set_content_share_owner();

-- ══════════════════════════════════════════════════════════
-- Let op — nog NIET meegenomen in deze migratie (bewust, komt met de UI-sessie):
-- 1. De UI verstuurt nog geen 'scope' bij het aanmaken van een oefening/training —
--    zonder UI-wijziging valt alles terug op de kolom-default 'personal'. Voor
--    exercises betekent dit: saveLosOefening() se "+ Eigen oefening" (nu gate op
--    coach+ dankzij v331) moet opnieuw open voor iedereen, want 'personal' mag door
--    iedereen. Tot de UI is aangepast blijft de v331-gate in de front-end actief en
--    is dit onschadelijk (staat toe wat al toegestaan was, weigert verder niets nieuws).
-- 2. Geen "deel met persoon"-knop, geen scope-kiezer, geen Beheer-scherm-check op
--    system/owner-niveau in de UI — alleen het schema/RLS-fundament staat nu klaar.
-- ══════════════════════════════════════════════════════════
