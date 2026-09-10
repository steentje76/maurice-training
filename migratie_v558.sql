-- migratie_v558.sql
-- COACH/PT MASTER SPRINT — CPT5 Workout Review / Human Feedback.
--
-- ROOT CAUSE (CPT0-audit): geen enkele coach_feedback/coach_note/
-- workout_feedback-tabel bestond -- niet als backend, niet als UI. Dit is
-- een echte, benchmark-bevestigde MUST HAVE (sectie 20/21 van de opdracht).
--
-- WAAROM GEEN HERGEBRUIK VAN SOCIAL COMMENTS (sectie 21, expliciet
-- onderzocht): social_comments hangt aan social_shared_activities (een
-- bewust, expliciet GEDEELDE training, zichtbaar voor connecties volgens
-- privacy-instellingen) -- coach-feedback moet juist bestaan OP ELKE
-- afgeronde training_instance, ongeacht of de sporter die ooit sociaal
-- deelde, en moet PRIVAAT blijven tussen uitsluitend coach en athlete (nooit
-- zichtbaar voor connecties/de feed). Dat is een wezenlijk andere privacy-/
-- lifecycle-semantiek dan Social Comments -- vandaar een eigen, minimale
-- tabel i.p.v. het geforceerd hergebruiken van social_comments.
--
-- Scope bewust beperkt tot coach->athlete (Human Coach Feedback, sectie 2:
-- nooit te verwarren met AI Coach -- deze tabel heeft geen enkele AI-
-- schrijftoegang). Athlete-feedback (reactie op coach-feedback) is
-- toegestaan als eenvoudige, symmetrische read/write op dezelfde rij-set
-- (geen aparte thread-tabel nodig voor deze eerste, minimale versie) --
-- LATER, niet nu: als benchmark een threaded discussie vereist, gebruik dan
-- de bestaande COACH_ATHLETE-messaging-foundation (CPT6), niet een tweede
-- comment-systeem hier.

CREATE TABLE public.coach_workout_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_instance_id uuid NOT NULL REFERENCES public.training_instances(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_workout_feedback_training_instance ON public.coach_workout_feedback(training_instance_id);
CREATE INDEX idx_coach_workout_feedback_athlete ON public.coach_workout_feedback(athlete_user_id);

ALTER TABLE public.coach_workout_feedback ENABLE ROW LEVEL SECURITY;

-- Lezen: uitsluitend de betrokken coach of athlete -- nooit de feed, nooit
-- connecties, nooit een derde coach (sectie 28: "Coach D krijgt geen
-- toegang tot B").
CREATE POLICY cwf_betrokkenen_lezen ON public.coach_workout_feedback
FOR SELECT
USING (coach_user_id = auth.uid() OR athlete_user_id = auth.uid());

-- Schrijven (aanmaken): uitsluitend de coach zelf, uitsluitend met een
-- ACTIEVE coach-athlete-relatie en TRAINING_CORE-scope (dezelfde autorisatie
-- als coach_program_assignments hergebruikt -- geen nieuw scope-concept),
-- EN de training_instance moet daadwerkelijk van de opgegeven athlete zijn
-- (voorkomt dat een coach feedback aan de verkeerde training/athlete kan
-- koppelen, ook al zou coach_has_scope al kloppen voor een andere training).
CREATE POLICY cwf_coach_schrijft ON public.coach_workout_feedback
FOR INSERT
WITH CHECK (
  coach_user_id = auth.uid()
  AND public.coach_has_scope(auth.uid(), athlete_user_id, 'TRAINING_CORE')
  AND EXISTS (
    SELECT 1 FROM public.training_instances ti
    WHERE ti.id = training_instance_id AND ti.user_id = athlete_user_id
  )
);

-- Wijzigen/verwijderen: uitsluitend de coach die de feedback zelf schreef
-- (sectie 24-precedent: eigen content, eigen levenscyclus).
CREATE POLICY cwf_coach_beheert_eigen ON public.coach_workout_feedback
FOR UPDATE
USING (coach_user_id = auth.uid())
WITH CHECK (coach_user_id = auth.uid());

CREATE POLICY cwf_coach_verwijdert_eigen ON public.coach_workout_feedback
FOR DELETE
USING (coach_user_id = auth.uid());

COMMENT ON TABLE public.coach_workout_feedback IS
  'Coach/PT Master Sprint CPT5: Human Coach-feedback op een specifieke afgeronde training_instance van een sporter. Athlete-zichtbaar (in tegenstelling tot CPT7 Coach Notes, die privé blijven). Nooit AI Coach -- geen enkele schrijftoegang voor AI-processen. Vereist een actieve coach-athlete-relatie met TRAINING_CORE-scope; de gekoppelde training_instance moet aantoonbaar van de betreffende athlete zijn.';
