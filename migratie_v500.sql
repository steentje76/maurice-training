-- migratie_v500.sql
-- F3 Closure Hotfix — GAP-P1-008 (hrv_log concurrency / duplicate daily records)
--
-- Zie docs/DAILY_HEALTH_FIELD_RECONCILIATION_CONTRACT.md voor de volledige
-- forensische audit, de Field Reconciliation Contract en de reconciliatie-
-- beslissing per duplicate-groep. Deze migratie voert die beslissing uit.
--
-- VOLGORDE (sectie 18): preserve originals -> reconcile -> verify zero
-- duplicates -> add unique constraint -> verify -> nieuwe atomaire RPC.
-- Alles in één transactie (Supabase SQL editor-conventie, reeds bekend).

-- 1) PRESERVE AFFECTED ORIGINALS (forward-only, permanente archieftabel)
CREATE TABLE IF NOT EXISTS public.hrv_log_archive_v500 (
  LIKE public.hrv_log INCLUDING ALL
);
ALTER TABLE public.hrv_log_archive_v500
  ADD COLUMN IF NOT EXISTS archived_reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT now();

INSERT INTO public.hrv_log_archive_v500 (
  id, date, hrv, rhr, sleep, edema, note, created_at, user_id, cyclus_fase,
  hrv_source, rhr_source, sleep_source, archived_reason
)
SELECT h.id, h.date, h.hrv, h.rhr, h.sleep, h.edema, h.note, h.created_at,
       h.user_id, h.cyclus_fase, h.hrv_source, h.rhr_source, h.sleep_source,
       'GAP-P1-008 duplicate-reconciliation, migratie_v500'
FROM public.hrv_log h
WHERE (h.user_id, h.date) IN (
  SELECT user_id, date FROM public.hrv_log GROUP BY user_id, date HAVING count(*) > 1
)
ON CONFLICT (id) DO NOTHING;

-- 2) RECONCILE: groepen 1-3 (exacte duplicaten) — verwijder de jongste rij per groep.
--    Groep 4 (complementair) — vul rhr aan op de oudste rij, verwijder de jongste.
DO $$
DECLARE
  r RECORD;
  oudste_id uuid;
  jongste_id uuid;
BEGIN
  FOR r IN
    SELECT user_id, date FROM public.hrv_log GROUP BY user_id, date HAVING count(*) > 1
  LOOP
    SELECT id INTO oudste_id FROM public.hrv_log
      WHERE user_id = r.user_id AND date = r.date ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO jongste_id FROM public.hrv_log
      WHERE user_id = r.user_id AND date = r.date ORDER BY created_at DESC LIMIT 1;

    IF oudste_id IS NOT NULL AND jongste_id IS NOT NULL AND oudste_id <> jongste_id THEN
      -- Union-merge: vul alleen ontbrekende (null) velden op de oudste rij aan vanuit de jongste.
      -- Bij groep 1-3 zijn alle velden al gelijk, dus dit is een no-op op de waarden zelf.
      UPDATE public.hrv_log AS oud
      SET hrv          = COALESCE(oud.hrv, jong.hrv),
          rhr          = COALESCE(oud.rhr, jong.rhr),
          sleep        = COALESCE(oud.sleep, jong.sleep),
          hrv_source   = COALESCE(oud.hrv_source, jong.hrv_source),
          rhr_source   = COALESCE(oud.rhr_source, jong.rhr_source),
          sleep_source = COALESCE(oud.sleep_source, jong.sleep_source),
          note         = COALESCE(oud.note, jong.note),
          cyclus_fase  = COALESCE(oud.cyclus_fase, jong.cyclus_fase),
          edema        = COALESCE(oud.edema, jong.edema)
      FROM public.hrv_log AS jong
      WHERE oud.id = oudste_id AND jong.id = jongste_id;

      DELETE FROM public.hrv_log WHERE id = jongste_id;
    END IF;
  END LOOP;
END $$;

-- 3) VERIFY ZERO DUPLICATES (faalt de migratie hard als er nog steeds duplicaten zijn)
DO $$
DECLARE
  resterend integer;
BEGIN
  SELECT count(*) INTO resterend FROM (
    SELECT user_id, date FROM public.hrv_log GROUP BY user_id, date HAVING count(*) > 1
  ) sub;
  IF resterend > 0 THEN
    RAISE EXCEPTION 'GAP-P1-008-cleanup onvolledig: % duplicate-groepen resteren', resterend;
  END IF;
END $$;

-- 4) UNIQUE CONSTRAINT (nu veilig — geen duplicaten meer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hrv_log_user_date_unique'
  ) THEN
    ALTER TABLE public.hrv_log
      ADD CONSTRAINT hrv_log_user_date_unique UNIQUE (user_id, date);
  END IF;
END $$;

-- 5) ATOMAIRE UPSERT-RPC — lost het lost-update-probleem op (sectie 21-22): de
--    INSERT..ON CONFLICT..DO UPDATE is een enkele, atomaire database-operatie;
--    concurrente aanroepen serialiseren op rij-niveau, geen read-then-write-race
--    in applicatiecode meer nodig.
--
--    Autorisatie (sectie 27-28): een ingelogde eindgebruiker (auth.uid() niet null)
--    mag uitsluitend voor zichzelf schrijven. Een service-role-aanroep (auth.uid()
--    is null onder de service key, zoals wearable-sync.js al gebruikt) mag een
--    expliciete p_user_id meegeven — vertrouwd via de reeds bestaande, aparte
--    beveiligingsgrens van de Netlify-functie zelf (service key nooit aan de
--    client blootgesteld), consistent met hoe die functie al langer met de
--    service-rol werkt elders in de codebase.
CREATE OR REPLACE FUNCTION public.upsert_daily_health(
  p_user_id uuid,
  p_date date,
  p_hrv numeric DEFAULT NULL,
  p_rhr integer DEFAULT NULL,
  p_sleep numeric DEFAULT NULL,
  p_cyclus_fase text DEFAULT NULL,
  p_edema text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_source text DEFAULT 'manual'
) RETURNS public.hrv_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hrv_log;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RAISE EXCEPTION 'not authorized to write daily health data for another user';
  END IF;
  IF p_source NOT IN ('manual','wearable','unknown') THEN
    RAISE EXCEPTION 'invalid source: %', p_source;
  END IF;

  INSERT INTO public.hrv_log (user_id, date, hrv, hrv_source, rhr, rhr_source, sleep, sleep_source, cyclus_fase, edema, note)
  VALUES (
    p_user_id, p_date,
    p_hrv,   CASE WHEN p_hrv   IS NOT NULL THEN p_source ELSE NULL END,
    p_rhr,   CASE WHEN p_rhr   IS NOT NULL THEN p_source ELSE NULL END,
    p_sleep, CASE WHEN p_sleep IS NOT NULL THEN p_source ELSE NULL END,
    p_cyclus_fase, p_edema, p_note
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
    note         = COALESCE(EXCLUDED.note, public.hrv_log.note)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_daily_health TO authenticated, service_role;

COMMENT ON FUNCTION public.upsert_daily_health IS 'GAP-P1-008-closure: atomaire, per-veld-mergende upsert voor hrv_log. Vervangt het niet-atomaire lees-dan-PATCH/POST-patroon in tkMergeHealthRow()/wearable-sync.js.';

-- ROLLBACK (afgeraden na productiegebruik):
--   DROP FUNCTION IF EXISTS public.upsert_daily_health;
--   ALTER TABLE public.hrv_log DROP CONSTRAINT IF EXISTS hrv_log_user_date_unique;
--   (de archieftabel hrv_log_archive_v500 blijft staan als audit trail, nooit automatisch verwijderen)
