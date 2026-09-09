-- migratie_v554.sql
-- ENDURANCE MASTER SPRINT — E4 Swimming Foundation.
--
-- Sectie 10 van de opdracht vereist minimaal onderscheid POOL/OPEN_WATER/
-- UNKNOWN voor een triatleet. Geen bestaand veld op `activities` dekt dit
-- (geverifieerd: geen kolom met 'context' in de naam). Minimale, additieve
-- kolom, NULL voor elke bestaande rij en voor elke andere sport (running/
-- cycling/rowing) -- irrelevant daar, dus NULL is correct, geen "N.v.t."-
-- placeholder nodig.
--
-- Geen nieuwe tabel, geen nieuwe execution engine, geen nieuw planningmodel
-- (sectie 8 van de opdracht) -- swimming hergebruikt de bestaande
-- `activities`-tabel (sport='swimming' was al toegestaan sinds migratie_v533)
-- en de bestaande `activity_laps`-tabel voor lengths/intervals (geen nieuw
-- onderscheid tussen LENGTH/LAP/INTERVAL, sectie 12: niet nodig gebleken).

ALTER TABLE public.activities
  ADD COLUMN swim_context text NULL;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_swim_context_check
  CHECK (swim_context IS NULL OR swim_context IN ('pool','open_water'));

COMMENT ON COLUMN public.activities.swim_context IS
  'Endurance Master Sprint E4: pool vs open-water-context, uitsluitend relevant voor sport=swimming. NULL voor elke andere sport en voor elke zwemactiviteit waarvan de context onbekend is (UNKNOWN-semantiek, sectie 10) -- nooit een geraden waarde.';
