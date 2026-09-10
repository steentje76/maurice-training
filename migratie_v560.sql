-- migratie_v560.sql
-- DEVICES/WEARABLES MASTER SPRINT — Daily Activity (stappen).
--
-- ROOT CAUSE: Google Health-integratie haalde al HRV/RHR/slaap op, met de
-- OAuth-scope voor 'activity_and_fitness' al aangevraagd (migratie_v527/
-- wearable-auth-start.js) maar nooit daadwerkelijk gebruikt voor stappen --
-- exact het "permission aangevraagd maar functionaliteit nooit gebouwd"-
-- patroon.
--
-- MINIMALE UITBREIDING: hergebruikt VOLLEDIG de bestaande hrv_log-tabel +
-- upsert_daily_health-RPC (geen nieuwe tabel, geen nieuw dagelijks-
-- gezondheids-concept) -- dezelfde COALESCE-upsert-semantiek, hetzelfde
-- per-metric-provenance-patroon (hrv_source/rhr_source/sleep_source
-- bestonden al; steps_source volgt exact dat precedent).
--
-- UNKNOWN != ZERO (hard vereiste, sectie 3 van de opdracht): steps blijft
-- NULL tenzij de Google Health dailyRollUp-respons een daadwerkelijke
-- rollup-entry voor die dag bevat (zie netlify/functions/wearable-sync.js).
-- Een dag zonder trackergegevens (bv. "off-wrist") wordt NOOIT als 0
-- stappen weggeschreven.

ALTER TABLE public.hrv_log
  ADD COLUMN steps integer NULL,
  ADD COLUMN steps_source text NULL;

ALTER TABLE public.hrv_log
  ADD CONSTRAINT hrv_log_steps_check CHECK (steps IS NULL OR steps >= 0);

-- CORRECTIE (ontdekt tijdens live-uitvoering): CREATE OR REPLACE FUNCTION
-- matcht in Postgres op de VOLLEDIGE parameterlijst (aantal + types), niet
-- alleen de naam -- exact dezelfde les als migratie_v552 (schedule_my_
-- training). Een extra parameter (p_steps) toevoegen aan het EINDE, zelfs
-- met een DEFAULT, creëert een TWEEDE, overloaded functie i.p.v. de
-- bestaande 9-parameter-versie te vervangen. DROP FUNCTION op de exacte,
-- oude signatuur is daarom vereist vóór de nieuwe CREATE. Functioneel
-- ongewijzigd: de nieuwe functie ondersteunt nog steeds exact dezelfde
-- 9-argument-aanroep (10e parameter heeft een DEFAULT) -- geen bestaande
-- caller breekt, precies één functie-object na de migratie.
DROP FUNCTION IF EXISTS public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text);

CREATE OR REPLACE FUNCTION public.upsert_daily_health(
  p_user_id uuid,
  p_date date,
  p_hrv numeric DEFAULT NULL::numeric,
  p_rhr integer DEFAULT NULL::integer,
  p_sleep numeric DEFAULT NULL::numeric,
  p_cyclus_fase text DEFAULT NULL::text,
  p_edema text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text,
  p_source text DEFAULT 'manual'::text,
  p_steps integer DEFAULT NULL::integer
)
RETURNS hrv_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.hrv_log;
  v_caller uuid := auth.uid();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF v_caller IS NULL OR v_caller <> p_user_id THEN
      RAISE EXCEPTION 'not authorized to write daily health data for another user';
    END IF;
  END IF;

  IF p_source NOT IN ('manual','wearable','unknown') THEN
    RAISE EXCEPTION 'invalid source: %', p_source;
  END IF;

  INSERT INTO public.hrv_log (user_id, date, hrv, hrv_source, rhr, rhr_source, sleep, sleep_source, cyclus_fase, edema, note, steps, steps_source)
  VALUES (
    p_user_id, p_date,
    p_hrv,   CASE WHEN p_hrv   IS NOT NULL THEN p_source ELSE NULL END,
    p_rhr,   CASE WHEN p_rhr   IS NOT NULL THEN p_source ELSE NULL END,
    p_sleep, CASE WHEN p_sleep IS NOT NULL THEN p_source ELSE NULL END,
    p_cyclus_fase, p_edema, p_note,
    p_steps, CASE WHEN p_steps IS NOT NULL THEN p_source ELSE NULL END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    hrv          = COALESCE(EXCLUDED.hrv, public.hrv_log.hrv),
    hrv_source   = CASE WHEN EXCLUDED.hrv   IS NOT NULL THEN EXCLUDED.hrv_source   ELSE public.hrv_log.hrv_source   END,
    rhr          = COALESCE(EXCLUDED.rhr, public.hrv_log.rhr),
    rhr_source   = CASE WHEN EXCLUDED.rhr   IS NOT NULL THEN EXCLUDED.rhr_source   ELSE public.hrv_log.rhr_source   END,
    sleep        = COALESCE(EXCLUDED.sleep, public.hrv_log.sleep),
    sleep_source = CASE WHEN EXCLUDED.sleep IS NOT NULL THEN EXCLUDED.sleep_source ELSE public.hrv_log.sleep_source END,
    cyclus_fase  = COALESCE(EXCLUDED.cyclus_fase, public.hrv_log.cyclus_fase),
    edema        = COALESCE(EXCLUDED.edema, public.hrv_log.edema),
    note         = COALESCE(EXCLUDED.note, public.hrv_log.note),
    steps        = COALESCE(EXCLUDED.steps, public.hrv_log.steps),
    steps_source = CASE WHEN EXCLUDED.steps IS NOT NULL THEN EXCLUDED.steps_source ELSE public.hrv_log.steps_source END
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

COMMENT ON COLUMN public.hrv_log.steps IS
  'Devices/Wearables Master Sprint: dagelijkse stappen (Google Health dailyRollUp, dataType=steps, countSum-veld). NULL = onbekend (geen trackerdata die dag), NOOIT 0 tenzij de provider een daadwerkelijke, bevestigde rollup met countSum=0 teruggaf (sedentaire, wel-getrackte dag).';
