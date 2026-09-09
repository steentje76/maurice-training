-- migratie_v552.sql
-- SPRINT C2-D — Offline RPC Create / Retry Hardening voor schedule_my_training().
--
-- ROOT CAUSE (forensische audit): schedule_my_training() (migratie_v551) heeft
-- geen idempotency. Elke aanroep INSERT onvoorwaardelijk een nieuwe occurrence.
-- De enige bestaande dedupe is planned_training_assignments_unique_per_occurrence
-- (occurrence_id, athlete_user_id) -- die voorkomt een dubbele assignment op
-- DEZELFDE occurrence, maar houdt een replay die een TWEEDE occurrence aanmaakt
-- niet tegen. sbRpc() (de generieke RPC-laag) heeft daarnaast geen offline/retry-
-- laag: een timeout vóór of na de server-write laat de client zonder enige
-- herstelmogelijkheid achter (geen queue, geen retry).
--
-- ARCHITECTUURBESLISSING: geen nieuwe idempotency-kolom/-tabel. In plaats daarvan
-- wordt occurrence.id zelf client-gegenereerd (newTrainingInstanceId()-patroon,
-- exact zoals training_instances al doet) en als stabiele mutation-identity
-- gebruikt: dezelfde id bij elke retry/replay van dezelfde gebruikersintentie,
-- een nieuwe expliciete create krijgt een nieuwe id. De bestaande PRIMARY KEY op
-- planned_training_occurrences.id is daarmee de idempotency-garantie -- geen
-- extra constraint nodig. Concurrency (twee gelijktijdige retries van dezelfde
-- id) wordt door de database zelf afgedwongen via de PK-unique_violation-catch
-- hieronder, niet door een client-side lock.
--
-- Backward compatible: p_occurrence_id is een NIEUW, OPTIONEEL parameter met
-- DEFAULT NULL. Een aanroep zonder dit argument (oudere client, of een
-- toekomstige niet-offline-safe caller) gedraagt zich exact als voorheen
-- (server-gegenereerd id, geen dedupe) -- 0 regressie op bestaand gedrag.

CREATE OR REPLACE FUNCTION public.schedule_my_training(
  p_workout_definition_id text,
  p_planned_date date,
  p_definition_snapshot jsonb,
  p_occurrence_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owns boolean;
  v_occurrence_id uuid := COALESCE(p_occurrence_id, gen_random_uuid());
  v_existing_creator uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'schedule_my_training: geen ingelogde gebruiker';
  END IF;

  -- Idempotency, sequentiële replay (punt 4/5/16 van de opdracht): een offline
  -- create die client-side al een occurrence_id kreeg, en later (na reconnect,
  -- app-restart, of een timeout-after-write) opnieuw wordt verstuurd met exact
  -- diezelfde id, mag NOOIT een tweede occurrence opleveren. auth.uid()-scope
  -- op de check is defense-in-depth (RLS dekt dit al via creator_user_id), en
  -- voorkomt bovendien dat user B de occurrence_id van user A kan "claimen".
  IF p_occurrence_id IS NOT NULL THEN
    SELECT creator_user_id INTO v_existing_creator
      FROM public.planned_training_occurrences WHERE id = p_occurrence_id;
    IF v_existing_creator IS NOT NULL THEN
      IF v_existing_creator <> v_user_id THEN
        RAISE EXCEPTION 'schedule_my_training: occurrence_id reeds in gebruik door een andere gebruiker';
      END IF;
      RETURN p_occurrence_id; -- reeds verwerkt (replay) -- no-op, geen tweede write
    END IF;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.vaste_trainingen WHERE id = p_workout_definition_id AND user_id = v_user_id) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'schedule_my_training: workout_definition_id behoort niet toe aan de aanroepende gebruiker';
  END IF;

  BEGIN
    INSERT INTO public.planned_training_occurrences (id, creator_user_id, workout_definition_id, planned_date, definition_snapshot)
    VALUES (v_occurrence_id, v_user_id, p_workout_definition_id, p_planned_date, p_definition_snapshot);
  EXCEPTION WHEN unique_violation THEN
    -- Concurrency (punt 17 van de opdracht): twee gelijktijdige retries van
    -- dezelfde mutation-identity. De PRIMARY KEY-constraint (database-niveau,
    -- niet een client-side lock) vangt de race op die de voorafgaande SELECT
    -- niet kan dekken (sequentieel gelezen, gelijktijdig geschreven). Exact één
    -- transactie wint de insert; de andere valt hier terug op dezelfde
    -- no-op-return -- nooit een tweede canonical occurrence.
    RETURN v_occurrence_id;
  END;

  -- ON CONFLICT DO NOTHING: als de occurrence-insert hierboven slaagde maar een
  -- eerdere, deels mislukte poging de assignment al wel had weggeschreven (kan
  -- in theorie niet meer voorkomen zodra beide inserts in dezelfde functie-
  -- aanroep zitten, maar blijft hier als expliciete, goedkope veiligheidslaag
  -- tegen de bestaande planned_training_assignments_unique_per_occurrence-
  -- constraint i.p.v. die als onverwachte 500 te laten doorkomen).
  INSERT INTO public.planned_training_assignments (occurrence_id, athlete_user_id)
  VALUES (v_occurrence_id, v_user_id)
  ON CONFLICT (occurrence_id, athlete_user_id) DO NOTHING;

  RETURN v_occurrence_id;
END;
$$;

COMMENT ON FUNCTION public.schedule_my_training IS
  'Sprint C2-D: atomaire, owner-geverifieerde, offline/retry-idempotente creatie van één occurrence + exact één self-assignment. p_occurrence_id (optioneel, client-gegenereerd) maakt een exacte replay van dezelfde gebruikersintentie een veilige no-op i.p.v. een duplicate create -- PK-based idempotency, concurrency-safe via unique_violation-catch, geen client-side lock als enige bescherming.';

-- Geen schemawijziging (geen nieuwe kolom, geen nieuwe index, geen nieuwe
-- tabel) -- uitsluitend CREATE OR REPLACE FUNCTION. Geen backfill nodig:
-- bestaande rijen in planned_training_occurrences behouden hun server-
-- gegenereerde id: p_occurrence_id was altijd al optioneel en NULL voor elke
-- rij die vóór deze migratie is aangemaakt.
