-- migratie_v555.sql
-- SOCIAL / SAMEN MASTER SPRINT — S5 Messaging UI.
--
-- ROOT CAUSE (S0/S1 forensische audit): core/messaging.js + message_threads/
-- message_participants/messages bestaan, volledig getest (47/47), maar met
-- 0 UI-verwijzingen in index.html -- de messaging-laag was daarmee onbruikbaar
-- voor een gebruiker (backend capability != product capability).
--
-- BLOKKEREND SCHEMA-GAT (ontdekt tijdens UI-bouw, vóór enige codewijziging):
-- de bestaande RLS-policies staan uitsluitend toe dat een gebruiker ZICHZELF
-- als participant toevoegt (mp_insert_self) of, voor COACH_ATHLETE-threads,
-- de tegenpartij via een specifieke, gerelateerde policy
-- (mp_insert_coach_athlete_counterpart). Voor DIRECT-threads (1-op-1 tussen
-- twee social-connecties) bestaat GEEN policy om de tegenpartij toe te
-- voegen -- een gebruiker kan dus geen gesprek MET iemand anders starten,
-- alleen een thread aanmaken waar alleen hijzelf in zit. Dit is geen
-- architectuurwijziging maar het sluiten van een gat dat nooit werd
-- opgemerkt omdat er nooit UI was om het te raken.
--
-- MINIMALE OPLOSSING: één SECURITY DEFINER RPC die (a) een bestaande
-- geaccepteerde social_connection tussen de twee gebruikers vereist (geen
-- messaging naar vreemden -- hergebruikt het bestaande social-graph-concept,
-- geen nieuw relationship-model), (b) idempotent is (een herhaalde aanroep
-- voor dezelfde twee gebruikers vindt de bestaande DIRECT-thread terug i.p.v.
-- een tweede aan te maken -- zelfde "één intentie = één canonical mutatie"-
-- principe als eerdere sprints), en (c) nooit een derde partij aan een
-- bestaande DIRECT-thread kan toevoegen.

CREATE OR REPLACE FUNCTION public.get_or_create_direct_thread(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_thread_id uuid;
  v_heeft_connectie boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'get_or_create_direct_thread: geen ingelogde gebruiker';
  END IF;
  IF p_other_user_id IS NULL OR p_other_user_id = v_user_id THEN
    RAISE EXCEPTION 'get_or_create_direct_thread: ongeldige tegenpartij';
  END IF;

  -- Alleen messagen met een geaccepteerde social-connectie (voorkomt
  -- messaging naar vreemden; hergebruikt het bestaande social_connections-
  -- model, geen nieuw relationship-concept).
  SELECT EXISTS(
    SELECT 1 FROM public.social_connections
    WHERE status = 'accepted'
      AND ((follower_id = v_user_id AND followee_id = p_other_user_id)
        OR (follower_id = p_other_user_id AND followee_id = v_user_id))
  ) INTO v_heeft_connectie;
  IF NOT v_heeft_connectie THEN
    RAISE EXCEPTION 'get_or_create_direct_thread: geen geaccepteerde connectie met deze gebruiker';
  END IF;

  -- Idempotency: bestaat er al EXACT een DIRECT-thread met precies deze
  -- twee deelnemers (niet meer, niet minder)? Zo ja: die hergebruiken,
  -- nooit een tweede, parallelle DM-thread voor hetzelfde gesprek.
  SELECT t.id INTO v_thread_id
  FROM public.message_threads t
  WHERE t.thread_type = 'DIRECT'
    AND (SELECT count(*) FROM public.message_participants mp WHERE mp.thread_id = t.id) = 2
    AND EXISTS(SELECT 1 FROM public.message_participants mp WHERE mp.thread_id = t.id AND mp.user_id = v_user_id)
    AND EXISTS(SELECT 1 FROM public.message_participants mp WHERE mp.thread_id = t.id AND mp.user_id = p_other_user_id)
  LIMIT 1;

  IF v_thread_id IS NOT NULL THEN
    RETURN v_thread_id;
  END IF;

  INSERT INTO public.message_threads (thread_type, status)
  VALUES ('DIRECT', 'active')
  RETURNING id INTO v_thread_id;

  INSERT INTO public.message_participants (thread_id, user_id, participant_role)
  VALUES (v_thread_id, v_user_id, 'ATHLETE'), (v_thread_id, p_other_user_id, 'ATHLETE');

  RETURN v_thread_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_direct_thread IS
  'Social/Samen Master Sprint S5: enige schrijfpad om een DIRECT-messagingthread tussen twee gebruikers te starten. Vereist een geaccepteerde social_connection (geen messaging naar vreemden). Idempotent: hergebruikt een bestaande exact-2-deelnemers-DIRECT-thread i.p.v. een duplicaat aan te maken.';
