-- migratie_v580.sql
-- GAP-P2-018 R4/R5 — typed ingest-provenance voor slaap en HRV.
--
-- STATUS: ONTWERP IN DE REPOSITORY. Niet op productie toegepast. Toepassen is een aparte,
-- expliciet goed te keuren stap na review en merge.
--
-- AANLEIDING
--   R5. hrv_log.hrv_metric_type bestaat sinds migratie_v542 (rmssd | sdnn | unknown, default
--       'unknown') maar geen enkele writer zet hem: upsert_daily_health heeft er geen argument
--       voor. De ingest weet het type wel (GOOGLE_HEALTH_MAP: sourceMetric 'rmssd'); het gaat
--       verloren voor opslag. Dit is een niet-herberekenbaar ingestfeit.
--   R4. De providerparser valt bij een ontbrekende slaapduur terug op het interval van de
--       slaapsessie (tijd in bed). Die waarde wordt opgeslagen als hrv_log.sleep zonder dat
--       vastligt of het een gerapporteerde slaapduur of een terugval is. Achteraf is dat uit
--       de rij niet te reconstrueren.
--
-- WAT DEZE MIGRATIE DOET
--   1. Nieuwe kolom hrv_log.sleep_metric_type (asleep | time_in_bed | unknown, default
--      'unknown'), exact naar het voorbeeld van hrv_metric_type (migratie_v542). Bestaande
--      rijen worden 'unknown': er wordt niets gegokt en niets teruggerekend.
--   2. upsert_daily_health krijgt twee optionele argumenten AAN HET EINDE:
--      p_hrv_metric_type en p_sleep_metric_type. De bestaande tien argumenten, hun volgorde,
--      hun defaults en de merge-semantiek zijn ongewijzigd; elke bestaande aanroep (positioneel
--      of met namen) blijft werken.
--
-- SEMANTIEK VAN HET TYPE: het type hoort bij de WAARDE, net als <veld>_source.
--   - Levert deze aanroep een HRV, dan wordt het type dat van deze aanroep; zonder opgegeven
--     type is dat 'unknown' (een handmatige HRV krijgt geen verzonnen type).
--   - Levert deze aanroep GEEN HRV, dan blijft het bestaande type staan, ook als er een type
--     wordt meegegeven. Een update van alleen slaap wist het HRV-type dus niet.
--   - Idem voor slaap en sleep_metric_type.
--
-- SINGLE WRITER (migratie_v579) blijft gelden: er komt geen direct schrijfpad bij. De functie
-- blijft SECURITY DEFINER met vaste search_path, met dezelfde auth.uid()/service_role-toets,
-- en EXECUTE alleen voor authenticated en service_role.
--
-- OVERLOAD: CREATE OR REPLACE matcht op de volledige parameterlijst. Twee argumenten toevoegen
-- zou een TWEEDE functie naast de bestaande maken (les uit migratie_v552/v560). Daarom wordt
-- de 10-argument-versie eerst verwijderd. DROP en CREATE staan in dezelfde transactie; na de
-- migratie bestaat er precies één upsert_daily_health.
--
-- Geen wijziging aan RLS, policies of tabelrechten. Geen backfill. Geen datawijziging.

ALTER TABLE public.hrv_log
  ADD COLUMN IF NOT EXISTS sleep_metric_type text DEFAULT 'unknown'
  CHECK (sleep_metric_type IN ('asleep', 'time_in_bed', 'unknown'));

COMMENT ON COLUMN public.hrv_log.sleep_metric_type IS
  'GAP-P2-018 R4: wat de opgeslagen slaapwaarde meet. asleep = door de provider gerapporteerde slaapduur; '
  'time_in_bed = terugval op het interval van de slaapsessie (tijd in bed); unknown = niet vastgelegd '
  '(handmatige invoer, import, historische rijen). Het type hoort bij de waarde en verandert alleen '
  'wanneer upsert_daily_health een nieuwe slaapwaarde schrijft. Heeft geen effect op berekeningen.';

COMMENT ON COLUMN public.hrv_log.hrv_metric_type IS
  'Wat de opgeslagen HRV-waarde meet: rmssd | sdnn | unknown. RMSSD en SDNN zijn niet onderling vergelijkbaar. '
  'Het type hoort bij de waarde en wordt alleen gezet door upsert_daily_health wanneer die een HRV schrijft '
  '(migratie_v580). De Google Health-ingest leest het dagtype daily-heart-rate-variability, veld '
  'averageHeartRateVariabilityMilliseconds, dat de API documenteert als RMSSD; die schrijft dus rmssd. '
  'Handmatige invoer, imports en historische rijen blijven unknown.';

DROP FUNCTION IF EXISTS public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer);

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
  p_steps integer DEFAULT NULL::integer,
  p_hrv_metric_type text DEFAULT NULL::text,
  p_sleep_metric_type text DEFAULT NULL::text
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

  IF p_hrv_metric_type IS NOT NULL AND p_hrv_metric_type NOT IN ('rmssd','sdnn','unknown') THEN
    RAISE EXCEPTION 'invalid hrv metric type: %', p_hrv_metric_type;
  END IF;

  IF p_sleep_metric_type IS NOT NULL AND p_sleep_metric_type NOT IN ('asleep','time_in_bed','unknown') THEN
    RAISE EXCEPTION 'invalid sleep metric type: %', p_sleep_metric_type;
  END IF;

  INSERT INTO public.hrv_log (user_id, date, hrv, hrv_source, hrv_metric_type, rhr, rhr_source, sleep, sleep_source, sleep_metric_type, cyclus_fase, edema, note, steps, steps_source)
  VALUES (
    p_user_id, p_date,
    p_hrv,   CASE WHEN p_hrv   IS NOT NULL THEN p_source ELSE NULL END,
             CASE WHEN p_hrv   IS NOT NULL THEN COALESCE(p_hrv_metric_type, 'unknown') ELSE 'unknown' END,
    p_rhr,   CASE WHEN p_rhr   IS NOT NULL THEN p_source ELSE NULL END,
    p_sleep, CASE WHEN p_sleep IS NOT NULL THEN p_source ELSE NULL END,
             CASE WHEN p_sleep IS NOT NULL THEN COALESCE(p_sleep_metric_type, 'unknown') ELSE 'unknown' END,
    p_cyclus_fase, p_edema, p_note,
    p_steps, CASE WHEN p_steps IS NOT NULL THEN p_source ELSE NULL END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    hrv               = COALESCE(EXCLUDED.hrv, public.hrv_log.hrv),
    hrv_source        = CASE WHEN EXCLUDED.hrv   IS NOT NULL THEN EXCLUDED.hrv_source        ELSE public.hrv_log.hrv_source        END,
    hrv_metric_type   = CASE WHEN EXCLUDED.hrv   IS NOT NULL THEN EXCLUDED.hrv_metric_type   ELSE public.hrv_log.hrv_metric_type   END,
    rhr               = COALESCE(EXCLUDED.rhr, public.hrv_log.rhr),
    rhr_source        = CASE WHEN EXCLUDED.rhr   IS NOT NULL THEN EXCLUDED.rhr_source        ELSE public.hrv_log.rhr_source        END,
    sleep             = COALESCE(EXCLUDED.sleep, public.hrv_log.sleep),
    sleep_source      = CASE WHEN EXCLUDED.sleep IS NOT NULL THEN EXCLUDED.sleep_source      ELSE public.hrv_log.sleep_source      END,
    sleep_metric_type = CASE WHEN EXCLUDED.sleep IS NOT NULL THEN EXCLUDED.sleep_metric_type ELSE public.hrv_log.sleep_metric_type END,
    cyclus_fase       = COALESCE(EXCLUDED.cyclus_fase, public.hrv_log.cyclus_fase),
    edema             = COALESCE(EXCLUDED.edema, public.hrv_log.edema),
    note              = COALESCE(EXCLUDED.note, public.hrv_log.note),
    steps             = COALESCE(EXCLUDED.steps, public.hrv_log.steps),
    steps_source      = CASE WHEN EXCLUDED.steps IS NOT NULL THEN EXCLUDED.steps_source      ELSE public.hrv_log.steps_source      END
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

-- Een nieuw functie-object begint met de standaardrechten van het schema. De rechten worden
-- daarom expliciet teruggezet op het contract van migratie_v570: geen PUBLIC, geen anon.
revoke execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer, text, text) from public, anon;
grant  execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text, integer, text, text) to authenticated, service_role;

-- Sluitende controle. Faalt een van deze voorwaarden, dan wordt de hele migratie teruggedraaid
-- (inclusief de DROP van de oude functie).
DO $assert$
DECLARE
  v_n integer;
  v_fn oid;
  v_secdef boolean;
  v_cfg text[];
  v_rol text;
  v_priv text;
BEGIN
  SELECT count(*) INTO v_n FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'upsert_daily_health';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'migratie_v580: verwacht precies 1 upsert_daily_health, gevonden %', v_n;
  END IF;

  SELECT p.oid, p.prosecdef, p.proconfig INTO v_fn, v_secdef, v_cfg
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'upsert_daily_health';
  IF v_fn::regprocedure::text <> 'upsert_daily_health(uuid,date,numeric,integer,numeric,text,text,text,text,integer,text,text)' THEN
    RAISE EXCEPTION 'migratie_v580: onverwachte signatuur %', v_fn::regprocedure::text;
  END IF;
  IF NOT v_secdef OR v_cfg IS NULL OR NOT ('search_path=public' = ANY (v_cfg)) THEN
    RAISE EXCEPTION 'migratie_v580: upsert_daily_health moet SECURITY DEFINER zijn met vaste search_path';
  END IF;

  IF has_function_privilege('anon', v_fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'migratie_v580: anon mag upsert_daily_health niet uitvoeren';
  END IF;
  IF EXISTS (SELECT 1 FROM aclexplode(COALESCE((SELECT proacl FROM pg_proc WHERE oid = v_fn), acldefault('f', (SELECT proowner FROM pg_proc WHERE oid = v_fn)))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') THEN
    RAISE EXCEPTION 'migratie_v580: PUBLIC mag upsert_daily_health niet uitvoeren';
  END IF;
  IF NOT has_function_privilege('authenticated', v_fn, 'EXECUTE') OR NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'migratie_v580: authenticated en service_role moeten upsert_daily_health kunnen uitvoeren';
  END IF;

  -- De single-writer-invariant van migratie_v579 mag door deze migratie niet veranderd zijn.
  FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH v_priv IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] LOOP
      IF has_table_privilege(v_rol, 'public.hrv_log', v_priv) THEN
        RAISE EXCEPTION 'migratie_v580: % heeft % op public.hrv_log; de single-writer-invariant is geschonden', v_rol, v_priv;
      END IF;
    END LOOP;
  END LOOP;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.hrv_log'::regclass) THEN
    RAISE EXCEPTION 'migratie_v580: RLS op public.hrv_log staat uit';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hrv_log' AND column_name = 'sleep_metric_type') THEN
    RAISE EXCEPTION 'migratie_v580: kolom sleep_metric_type ontbreekt';
  END IF;
END
$assert$;
