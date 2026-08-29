-- migratie_v501.sql
-- MS-F4-04 (Adaptive Weekly Program Loop) -- audit trail voor AI-gestuurde
-- weekregeneratie.
--
-- BEVINDING: de bestaande "weken opnieuw genereren"-flow (index.html,
-- herGenererenWeken()-achtige functie rond regel 11269) is al rule/evidence-
-- gestuurd (adherencePct + gemiddelde RPE-delta bepalen de regeneratie-
-- prompt) en vereist al expliciete gebruikersbevestiging (confirmModal) --
-- maar de oude, vervangen program_blocks worden hard verwijderd (sbDel)
-- zonder enige audit trail: geen record van WAT vervangen werd, WAAROM
-- (welke evidence), WANNEER, of door wie.
--
-- FIX: een nieuwe, forward-only, append-only logtabel. Nooit UPDATE/DELETE
-- op deze tabel vanuit de applicatie -- uitsluitend INSERT. Bewaart een
-- snapshot van de vervangen blocks (JSON) + de evidence die de regeneratie
-- triggerde, VOORDAT de destructieve delete plaatsvindt.

CREATE TABLE IF NOT EXISTS public.program_regeneration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id bigint NOT NULL,
  regenerated_weeks integer[] NOT NULL,
  evidence jsonb NOT NULL,
  replaced_blocks_snapshot jsonb NOT NULL,
  reden text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_regeneration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY eigen_data_alleen ON public.program_regeneration_log
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Alleen INSERT toegestaan vanuit de client -- append-only, geen UPDATE/DELETE-
-- policy, zodat een audit trail niet achteraf gewijzigd kan worden door de
-- gebruiker zelf (de "ALL"-policy hierboven zou dit technisch toestaan; de
-- applicatiecode roept bewust nooit PATCH/DELETE op deze tabel aan -- zie
-- core/fProgramRegenerationAudit.test.js voor de bewaking hiervan).

COMMENT ON TABLE public.program_regeneration_log IS 'MS-F4-04: append-only audit trail voor AI-gestuurde weekregeneratie. Bewaart de vervangen blocks + de evidence (adherence/RPE-delta) die de regeneratie triggerde, vóór de destructieve delete.';

-- ROLLBACK (afgeraden na productiegebruik -- verliest audit-geschiedenis):
--   DROP TABLE IF EXISTS public.program_regeneration_log;
