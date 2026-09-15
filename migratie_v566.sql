-- ==========================================================================
-- migratie_v566.sql — ERG CONTINUOUS PROTOCOL IDENTITY (query-projectie)
-- --------------------------------------------------------------------------
-- DOEL: efficiënt bevraagbaar maken WELK protocol een continue RowErg/BikeErg/
-- SkiErg-inspanning had (vrij / vaste afstand / vaste tijd), zodat toekomstige
-- protocol-specifieke historie en PB-lookups niet elk training_instance-
-- snapshot client-side hoeven te laden.
--
-- BRON VAN WAARHEID (hard, niet-onderhandelbaar):
--   De INTENTIE leeft in de prescriptie / het immutable
--   `training_instances.snapshot`. DEZE TWEE KOLOMMEN ZIJN EEN IMMUTABLE
--   QUERY-PROJECTIE DAARVAN — GEEN ZELFSTANDIGE WAARHEID.
--   Bij enige tegenspraak wint het snapshot.
--
-- ACTUAL MAG NOOIT INTENTIE BEPALEN:
--   Deze kolommen worden UITSLUITEND gevuld vanuit de prescriptie die vóór de
--   uitvoering is vastgelegd (core/ergProtocolIdentity.js ->
--   protocolProjectionFromPrescription(), die per constructie geen enkele
--   actual-waarde als parameter kent). Een gemeten 2000 m of 30:00 mag NOOIT
--   tot een protocol leiden. Geen ronde-getal-heuristiek, nooit.
--
-- CANONIEK VOCABULAIRE: identiek aan de reeds bestaande terminatiesemantiek
-- van interval_prescription.v1 (core/intervalEngine.js):
--   TERMINATION_TYPES = ['time','distance','manual']
-- Bewust GEEN tweede vocabulaire (geen fixed_distance/fixed_duration/free).
-- Atleet-labels (Vrij/Afstand/Tijd) zijn uitsluitend presentatie.
--
-- protocol_value-eenheid volgt het terminatietype:
--   'distance' -> meters (integer)
--   'time'     -> seconden (integer)
--   'manual'   -> NULL (een vrije inspanning heeft per definitie geen doel)
--
-- HISTORISCHE RIJEN: blijven NULL. Dat betekent expliciet "onbekende intentie"
-- (LEGACY_UNKNOWN), niet "vrij". Ze blijven volwaardige trainingsdata en tellen
-- ongewijzigd mee in volume/duur/belasting/Context; ze komen later alleen niet
-- in protocol-specifieke PB/trend. ER WORDT GEEN BACKFILL GEDAAN — intentie
-- afleiden uit historische actuals zou precies de gok zijn die deze
-- architectuur verbiedt.
--
-- Additief, nullable, idempotent, geen destructieve wijziging, geen RLS-
-- wijziging: de kolommen erven automatisch de bestaande owner-policies op
-- public.sessions (RLS filtert per rij, niet per kolom — zelfde precedent als
-- migratie_v547 edit_revision en migratie_v565 intervals_detail).
-- ==========================================================================

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS protocol_type text NULL,
  ADD COLUMN IF NOT EXISTS protocol_value integer NULL;

-- Canoniek vocabulaire afdwingen op databaseniveau. NULL blijft toegestaan
-- (historisch/onbekend). Een onbekende waarde kan zo nooit binnensluipen.
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_protocol_type_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_protocol_type_check
  CHECK (protocol_type IS NULL OR protocol_type IN ('manual', 'distance', 'time'));

-- Consistentie tussen type en waarde:
--   manual  -> geen waarde
--   distance/time -> positieve waarde verplicht
-- Zo kan er nooit een half protocol ontstaan (bv. 'distance' zonder meters).
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_protocol_value_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_protocol_value_check
  CHECK (
    (protocol_type IS NULL AND protocol_value IS NULL)
    OR (protocol_type = 'manual' AND protocol_value IS NULL)
    OR (protocol_type IN ('distance', 'time') AND protocol_value IS NOT NULL AND protocol_value > 0)
  );

COMMENT ON COLUMN public.sessions.protocol_type IS
  'IMMUTABLE QUERY-PROJECTIE van de protocolintentie uit training_instances.snapshot — GEEN zelfstandige bron van waarheid. Canoniek vocabulaire identiek aan interval_prescription.v1 TERMINATION_TYPES: manual|distance|time. Uitsluitend gevuld vanuit de vóór uitvoering vastgelegde prescriptie; NOOIT afgeleid uit een gemeten resultaat. NULL = onbekende intentie (historisch), niet "vrij".';

COMMENT ON COLUMN public.sessions.protocol_value IS
  'Doelwaarde bij protocol_type: meters bij distance, seconden bij time, NULL bij manual. Dit is de INTENTIE (doel), niet het behaalde resultaat — een afgebroken 2000 m die op 1800 m eindigt houdt protocol_value 2000 en actual distance 1800.';
