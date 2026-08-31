-- migratie_v525.sql
-- F13 POST-AUDIT REMEDIATION -- P0-A.
--
-- KRITIEKE, LIVE BEVESTIGDE BEVINDING: public.upsert_daily_health() was
-- SECURITY DEFINER met EXECUTE voor anon/PUBLIC. De cross-user-check
-- werd volledig OVERGESLAGEN wanneer auth.uid() NULL was -- wat precies
-- het geval is voor een volledig anonieme (geen JWT) aanroep. Live
-- geverifieerd (transactie zonder commit, direct teruggedraaid): een
-- anonieme aanroep kon daadwerkelijk HRV/RHR/slaap/cyclus-data voor een
-- willekeurige gebruiker schrijven.
--
-- ROOT CAUSE: auth.uid() IS NULL werd gebruikt als (onjuiste) proxy voor
-- "vertrouwde, service-role-achtige aanroeper" -- maar dat is ook
-- precies de staat van een volledig anonieme aanroeper. service_role
-- heeft ook altijd auth.uid() IS NULL, dus de oorspronkelijke logica
-- kon nooit onderscheid maken tussen de vertrouwde server-sync en een
-- anonieme aanvaller.
--
-- FIX (defense-in-depth, twee onafhankelijke lagen):
-- 1. EXECUTE ingetrokken van anon en PUBLIC.
-- 2. De functielogica controleert expliciet auth.role() = 'service_role'
--    (hetzelfde, al bewezen patroon als protect_commercial_user_columns()).

revoke execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text) from public;
revoke execute on function public.upsert_daily_health(uuid, date, numeric, integer, numeric, text, text, text, text) from anon;

create or replace function public.upsert_daily_health(
  p_user_id uuid, p_date date, p_hrv numeric default null, p_rhr integer default null,
  p_sleep numeric default null, p_cyclus_fase text default null, p_edema text default null,
  p_note text default null, p_source text default 'manual'
)
returns hrv_log
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;

-- LIVE ADVERSARIAAL GEVERIFIEERD NA TOEPASSING (transacties zonder commit):
-- 1. anon: EXECUTE permission denied.
-- 2. authenticated, eigen user_id: toegestaan.
-- 3. authenticated, andere user_id: RAISE EXCEPTION.
-- 4. service_role: toegestaan voor elke user_id (wearable-sync.js blijft werken).

-- ==========================================================================
-- P0-B: hrv_log_archive_v500 -- RLS stond uit, anon/authenticated hadden
-- volledige SELECT/INSERT/UPDATE/DELETE/TRUNCATE. Bevestigd via repo-brede
-- code-scan: deze tabel wordt nergens in de applicatiecode gelezen of
-- geschreven -- uitsluitend een permanent, passief archief van de
-- F3-duplicate-reconciliatie (migratie_v500.sql). Geen data verwijderd:
-- RLS aan zonder client-policies + grants volledig ingetrokken.
-- ==========================================================================

alter table public.hrv_log_archive_v500 enable row level security;
-- Geen policies aangemaakt: volledige default-deny voor authenticated/anon.

revoke all on public.hrv_log_archive_v500 from anon;
revoke all on public.hrv_log_archive_v500 from authenticated;
-- service_role en postgres/table owner behouden toegang.

-- LIVE ADVERSARIAAL GEVERIFIEERD NA TOEPASSING:
-- 1. anon: SELECT permission denied.
-- 2. authenticated: SELECT permission denied.
-- 3. Data-integriteit: alle 8 originele rijen blijven onaangetast bestaan.
