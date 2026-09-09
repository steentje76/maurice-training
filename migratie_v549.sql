-- migratie_v549.sql
-- SPRINT A — Canonical Availability/Vacation Foundation.
--
-- CONTEXT: baseline-audit (Programs/Planning/Calendar-domein) bevestigde
-- dat Trainingskompas GEEN enkele vorm van gebruikers-gedeclareerde
-- beschikbaarheid/vakantie-context kent. Repo-breed doorzocht: nul
-- treffers voor 'vakantie' als feature. Dit is de canonical foundation-
-- tabel (Sprint A) -- GEEN conflict-detectie of automatische
-- planningsactie (dat is Sprint B).
--
-- BELANGRIJKE ARCHITECTURALE BEVINDING (vóór schemaontwerp bevestigd):
-- training_instances.status is CHECK-beperkt tot uitsluitend
-- 'active'/'completed'/'aborted' (live geverifieerd: 128 aborted/13
-- completed/9 active in productie) -- een rij wordt pas aangemaakt op
-- het MOMENT van starten (createTrainingInstance() zet started_at en
-- status='active' gelijktijdig, geen 'planned'-status bestaat). Er is
-- dus GEEN "planned instance"-rij om tegen te muteren. Deze tabel deelt
-- daarom BEWUST geen statuskolom-semantiek met training_instances --
-- exact zoals vereist: availability krijgt geen tweede training-
-- statusmodel, het blijft context/beschikbaarheid van de gebruiker.
--
-- TWEE AFZONDERLIJKE CONCEPTEN (bewust niet samengevoegd):
-- 1. context_type: WAAROM de periode bijzonder is (vacation/travel/
--    personal/unavailable_period).
-- 2. training_availability: WAT trainen binnen die periode betekent
--    (normal/limited/unavailable) -- volledig onafhankelijk van
--    context_type. 'vacation' + 'normal' is een geldige, verwachte
--    combinatie (harde productregel: vakantie != automatisch rust).

CREATE TABLE public.availability_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  context_type text NOT NULL,
  training_availability text NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_periods_end_after_start CHECK (end_date >= start_date),
  CONSTRAINT availability_periods_context_type_check CHECK (context_type IN ('vacation', 'travel', 'personal', 'unavailable_period')),
  CONSTRAINT availability_periods_training_availability_check CHECK (training_availability IN ('normal', 'limited', 'unavailable')),
  CONSTRAINT availability_periods_note_length CHECK (note IS NULL OR char_length(note) <= 500)
);

-- OVERLAP-REGEL (V1, deterministisch, zie sprintopdracht sectie 7):
-- actieve availability-periods van dezelfde gebruiker mogen elkaar niet
-- overlappen, bij inclusieve datumgrenzen. Afgedwongen via een exclusion
-- constraint (btree_gist), niet uitsluitend applicatielaag-validatie --
-- garandeert dit ook bij gelijktijdige/race-condition-writes.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.availability_periods
  ADD CONSTRAINT availability_periods_no_overlap
  EXCLUDE USING gist (
    user_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  );

CREATE INDEX idx_availability_periods_user_dates ON public.availability_periods (user_id, start_date, end_date);

ALTER TABLE public.availability_periods ENABLE ROW LEVEL SECURITY;

-- RLS V1-default (sectie 8): uitsluitend owner. Geen coach-read-policy
-- gekopieerd (in tegenstelling tot sessions/training_instances, die wel
-- een coach_reads_*-policy hebben) -- expliciet niet functioneel vereist
-- in deze sprint, en vakantie-/reisdata is bewust extra privacygevoelig.
-- Geen anon-access, geen service-role in de client.
CREATE POLICY availability_periods_select_own ON public.availability_periods
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY availability_periods_insert_own ON public.availability_periods
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY availability_periods_update_own ON public.availability_periods
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY availability_periods_delete_own ON public.availability_periods
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE public.availability_periods IS
  'Sprint A (Programs/Planning/Calendar-domein): canonical, gebruiker-gedeclareerde beschikbaarheidscontext (vakantie/reis/persoonlijk/overig-niet-beschikbaar). GEEN trainingsstatusmodel -- deelt bewust geen vocabulaire met training_instances.status. GEEN conflict-detectie of automatische planningsactie (Sprint B). GEEN locatie/GPS/bestemming vereist (dataminimalisatie).';
COMMENT ON COLUMN public.availability_periods.context_type IS 'Waarom de periode bijzonder is: vacation, travel, personal, of unavailable_period. Onafhankelijk van training_availability.';
COMMENT ON COLUMN public.availability_periods.training_availability IS 'Wat trainen binnen deze periode betekent: normal, limited, of unavailable. Vakantie (context_type=vacation) betekent NIET automatisch unavailable -- de gebruiker kiest dit expliciet.';
COMMENT ON COLUMN public.availability_periods.note IS 'Optionele, vrije notitie (max 500 tekens). Geen gestructureerde equipment/locatie-data in V1.';

-- Geen wijziging aan training_instances, program_blocks, sessions, of
-- enige Endurance-tabel. Additive-only, geen bestaande data geraakt.
