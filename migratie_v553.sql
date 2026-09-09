-- migratie_v553.sql
-- ENDURANCE MASTER SPRINT — E0-correctie: Cycling FTP-remediation (CASE CYCLE-C).
--
-- ROOT CAUSE (forensische audit): athlete_endurance_profile (migratie_v533)
-- heeft 0 rijen in productie. ftp_watts_user_entered (cycling) en
-- threshold_pace_seconds_per_km (running) worden op twee pleken per sport
-- gelezen en getoond ("FTP: Nog niet ingesteld"), maar er bestaat NERGENS in
-- de client een schrijfpad -- geen invoerformulier, geen sbPost/sbPatch-
-- aanroep. FTP "bestaat feitelijk niet in de core workflow" (opdracht sectie
-- 3) ondanks de correcte provenance-architectuur eromheen. Dezelfde makke
-- geldt symmetrisch voor Running se threshold_pace_seconds_per_km.
--
-- MINIMALE REMEDIATION (CASE CYCLE-C, sectie 5): uitsluitend het ontbrekende
-- schrijfpad toevoegen. GEEN automatische power-zone-berekening, GEEN FTP-
-- test-protocol, GEEN nieuwe Calculation Registry-entry -- de waarde blijft
-- exact wat de architectuur al belooft: user-entered, expliciet
-- geprovenancet, nooit gepresenteerd als gemeten of automatisch bepaald.
--
-- Backward compatible: alleen een ADDITIEVE UNIQUE-constraint (0 bestaande
-- rijen geverifieerd, dus risicoloos) en een NIEUWE RPC. Geen wijziging aan
-- bestaande kolommen/policies/functies.

-- Vereist voor een veilige, atomaire ON CONFLICT-upsert (voorkomt dat twee
-- snelle aanroepen twee rijen voor dezelfde user+sport aanmaken -- er was nog
-- geen enkele schrijfpad, dus dit risico bestond nog niet, maar wordt hiermee
-- vanaf het eerste schrijfmoment uitgesloten).
ALTER TABLE public.athlete_endurance_profile
  ADD CONSTRAINT athlete_endurance_profile_user_sport_unique UNIQUE (user_id, sport);

-- Atomaire, owner-geverifieerde upsert. Schrijft uitsluitend het veld dat bij
-- de opgegeven sport hoort (cycling -> ftp, running -> threshold pace) --
-- een aanroep voor de ene sport kan nooit per ongeluk het veld van de andere
-- sport overschrijven, ook niet via NULL-defaults.
CREATE OR REPLACE FUNCTION public.upsert_endurance_profile_target(
  p_sport text,
  p_ftp_watts_user_entered numeric DEFAULT NULL,
  p_threshold_pace_seconds_per_km numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'upsert_endurance_profile_target: geen ingelogde gebruiker';
  END IF;
  IF p_sport NOT IN ('running','cycling') THEN
    RAISE EXCEPTION 'upsert_endurance_profile_target: ongeldige sport';
  END IF;
  IF p_sport='cycling' AND p_ftp_watts_user_entered IS NOT NULL AND (p_ftp_watts_user_entered<=0 OR p_ftp_watts_user_entered>2000) THEN
    RAISE EXCEPTION 'upsert_endurance_profile_target: ongeldige FTP-waarde';
  END IF;
  IF p_sport='running' AND p_threshold_pace_seconds_per_km IS NOT NULL AND (p_threshold_pace_seconds_per_km<=0 OR p_threshold_pace_seconds_per_km>3600) THEN
    RAISE EXCEPTION 'upsert_endurance_profile_target: ongeldige pace-waarde';
  END IF;

  INSERT INTO public.athlete_endurance_profile
    (user_id, sport, ftp_watts_user_entered, threshold_pace_seconds_per_km, data_quality, confidence, updated_at)
  VALUES
    (v_user_id, p_sport,
     CASE WHEN p_sport='cycling' THEN p_ftp_watts_user_entered ELSE NULL END,
     CASE WHEN p_sport='running' THEN p_threshold_pace_seconds_per_km ELSE NULL END,
     'unverified','middel', now())
  ON CONFLICT (user_id, sport) DO UPDATE SET
    ftp_watts_user_entered = CASE WHEN p_sport='cycling' THEN EXCLUDED.ftp_watts_user_entered
                                   ELSE public.athlete_endurance_profile.ftp_watts_user_entered END,
    threshold_pace_seconds_per_km = CASE WHEN p_sport='running' THEN EXCLUDED.threshold_pace_seconds_per_km
                                          ELSE public.athlete_endurance_profile.threshold_pace_seconds_per_km END,
    data_quality='unverified',
    updated_at=now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_endurance_profile_target IS
  'Endurance Master Sprint E0-correctie: enige schrijfpad voor athlete_endurance_profile. Schrijft uitsluitend het sport-specifieke doelveld (cycling: FTP, running: threshold pace); data_quality altijd unverified (puur user-entered, nooit gepresenteerd als gemeten/automatisch). Owner-geverifieerd via auth.uid(), atomair upsert via ON CONFLICT (user_id, sport).';
