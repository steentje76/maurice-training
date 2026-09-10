-- migratie_v559.sql
-- COACH/PT MASTER SPRINT — CPT7 Coach Notes / Professional Workflow.
--
-- ROOT CAUSE (CPT0-audit): geen enkele coach-notitie-tabel bestaat.
-- Professionele coaching-platforms (TrainingPeaks Coach, TrueCoach,
-- Trainerize) hebben dit standaard als kernonderdeel van de professionele
-- workflow -- MUST HAVE per externe benchmark (sectie 24 van de opdracht).
--
-- WEZENLIJK ANDERS DAN CPT5 coach_workout_feedback: notities zijn:
-- - NOOIT athlete-zichtbaar (sectie 24: "niet automatisch zichtbaar voor
--   athlete") -- uitsluitend de coach zelf mag lezen/schrijven, geen
--   enkele SELECT-policy voor athlete_user_id=auth.uid().
-- - NIET gekoppeld aan één specifieke training_instance (professionele
--   observaties over de sporter in het algemeen, niet per se per sessie).
-- - GEEN AI Coach-geheugen (sectie 25: "AI mag Human Coach-note niet stil
--   wijzigen"/niet tonen aan athlete tenzij expliciet productontwerp dat
--   toestaat) -- geen enkele AI-schrijf- of leestoegang tot deze tabel.
-- - GEEN Social content -- geen relatie met social_* tabellen.
--
-- Vereist een coach-athlete-relatie die ooit actief is geweest (niet per se
-- op dit moment nog actief -- een coach mag terugkijken op notities van een
-- inmiddels beëindigde relatie, net zoals messaging-geschiedenis leesbaar
-- blijft na revocation, sectie 24: "export/retention indien relevant").
-- Nieuwe notities mogen echter uitsluitend bij een ACTIEVE relatie worden
-- aangemaakt (geen notities over een sporter zonder ooit een relatie te
-- hebben gehad).

CREATE TABLE public.coach_private_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_private_notes_coach_athlete ON public.coach_private_notes(coach_user_id, athlete_user_id);

ALTER TABLE public.coach_private_notes ENABLE ROW LEVEL SECURITY;

-- Lezen/verwijderen: UITSLUITEND de coach zelf (USING). Geen enkele
-- SELECT-policy voor de athlete -- dit is de kern van CPT7 (sectie 24).
-- Aanmaken/wijzigen (WITH CHECK) vereist bovendien een coach-athlete-
-- relatie die op dit moment ACTIEF is -- bestaande notities van een
-- inmiddels beëindigde relatie blijven leesbaar (USING dekt dat al), maar
-- kunnen na revocation niet meer aangemaakt of bewerkt worden (bewust
-- strenger dan messaging-geschiedenis: een oud-coach mag geen nieuwe/
-- gewijzigde professionele observaties meer vastleggen over een voormalige
-- cliënt). Eén enkele FOR ALL-policy i.p.v. losse INSERT/UPDATE-policies:
-- meerdere permissieve policies op dezelfde actie worden in Postgres met OR
-- gecombineerd, wat de extra relatie-eis stil zou hebben uitgeschakeld.
CREATE POLICY cpn_coach_beheert_eigen ON public.coach_private_notes
FOR ALL
USING (coach_user_id = auth.uid())
WITH CHECK (
  coach_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.coach_athlete_relationships r
    WHERE r.coach_user_id = auth.uid() AND r.athlete_user_id = coach_private_notes.athlete_user_id AND r.status = 'active'
  )
);

COMMENT ON TABLE public.coach_private_notes IS
  'Coach/PT Master Sprint CPT7: privé, professionele coach-notities over een sporter. NOOIT athlete-zichtbaar (geen enkele athlete-SELECT-policy), NOOIT AI Coach-geheugen (geen AI-toegang), NOOIT Social content. Aanmaken vereist een actieve coach-athlete-relatie; bestaande notities blijven leesbaar na relatiebeëindiging (zelfde precedent als messaging-geschiedenis).';
