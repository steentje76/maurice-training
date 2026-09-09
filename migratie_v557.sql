-- migratie_v557.sql
-- SOCIAL / SAMEN MASTER SPRINT — S9 Integrated Certification, gevonden gap.
--
-- ROOT CAUSE: social_is_blocked_pair() wordt consistent gebruikt in de
-- SELECT-policies van social_shared_activities/social_reactions/
-- social_comments -- block is daar dus al coherent afgedwongen. Messaging
-- (message_threads/message_participants/messages) gebruikt dit NIET: de
-- bestaande m_insert_own_sender-policy checkt alleen het thread-lokale
-- message_participants.is_blocked-veld (een losstaand, per-thread concept)
-- en de coach_athlete_relationship-status, nooit de algemene social_blocks-
-- tabel. get_or_create_direct_thread() checkt uitsluitend een geaccepteerde
-- social_connection, niet de afwezigheid van een block. Dit is exact de
-- sectie-42-eis: "A blockt B, maar B blijft via een andere Social-route A's
-- content/toegang behouden" -- messaging was die andere route.
--
-- MINIMALE FIX: social_is_blocked_pair() (bestaande, reeds SECURITY DEFINER
-- functie) ook toepassen op (a) het aanmaken van een nieuwe DIRECT-thread,
-- en (b) elke nieuwe message-insert t.o.v. de overige thread-deelnemers.
-- Geen nieuwe blokkeer-tabel, geen nieuw concept -- uitsluitend de al
-- bestaande, elders al bewezen functie hergebruikt.
--
-- Bestaande GESPREKKEN tussen twee inmiddels geblokkeerde gebruikers blijven
-- met deze migratie leesbaar (canReadHistoricalMessagesAfterRevocation-
-- precedent: geschiedenis blijft leesbaar, alleen NIEUWE berichten worden
-- geblokkeerd) -- consistent met het bestaande PO-besluit voor coach-
-- athlete-revocation (COMMENT op MessagingCore.canReadHistoricalMessages-
-- AfterRevocation in core/messaging.js), nu ook toegepast op een social-block.

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

  -- S9-fix: block wint altijd (sectie 42), ook bij het starten van een
  -- gesprek -- ongeacht een eventueel nog bestaande "accepted" connectie.
  IF public.social_is_blocked_pair(v_user_id, p_other_user_id) THEN
    RAISE EXCEPTION 'get_or_create_direct_thread: geblokkeerd';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.social_connections
    WHERE status = 'accepted'
      AND ((follower_id = v_user_id AND followee_id = p_other_user_id)
        OR (follower_id = p_other_user_id AND followee_id = v_user_id))
  ) INTO v_heeft_connectie;
  IF NOT v_heeft_connectie THEN
    RAISE EXCEPTION 'get_or_create_direct_thread: geen geaccepteerde connectie met deze gebruiker';
  END IF;

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

DROP POLICY IF EXISTS m_insert_own_sender ON public.messages;
CREATE POLICY m_insert_own_sender ON public.messages
FOR INSERT
WITH CHECK (
  sender_type <> 'SYSTEM'
  AND sender_user_id = auth.uid()
  AND is_thread_participant(thread_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.message_participants mp
    WHERE mp.thread_id = messages.thread_id AND mp.user_id = auth.uid() AND mp.is_blocked = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.message_threads t
    JOIN public.coach_athlete_relationships r ON r.id = t.context_relationship_id
    WHERE t.id = messages.thread_id AND t.thread_type = 'COACH_ATHLETE' AND r.status <> 'active'
  )
  -- S9-fix: dezelfde social_is_blocked_pair() als feed/reacties/comments --
  -- een actieve social-block t.o.v. WELKE andere deelnemer dan ook in deze
  -- thread blokkeert nieuwe berichten (geschiedenis blijft leesbaar).
  AND NOT EXISTS (
    SELECT 1 FROM public.message_participants mp2
    WHERE mp2.thread_id = messages.thread_id
      AND mp2.user_id <> auth.uid()
      AND public.social_is_blocked_pair(auth.uid(), mp2.user_id)
  )
);

COMMENT ON FUNCTION public.get_or_create_direct_thread IS
  'Social/Samen Master Sprint S5/S9: enige schrijfpad om een DIRECT-messagingthread tussen twee gebruikers te starten. Vereist een geaccepteerde social_connection EN de afwezigheid van een social-block (S9-fix, sectie 42: block wint altijd). Idempotent: hergebruikt een bestaande exact-2-deelnemers-DIRECT-thread i.p.v. een duplicaat aan te maken.';
