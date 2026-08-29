-- migratie_v499.sql
-- MS-F3-10 (Explainability & Provenance) — GAP-P1-007-closure
--
-- BEVINDING (live schema-audit + repo-brede write-path-audit):
-- hrv_log had GEEN provenance-kolommen. Handmatige check-in-writes
-- (upsertHrvLog/tkMergeHealthRow, index.html) en wearable-sync-writes
-- (netlify/functions/wearable-sync.js + _wearableSyncLib.js) schreven
-- allebei naar dezelfde (user_id,date)-rij, met als enige, reeds
-- bestaand provenance-signaal een ad-hoc "[src:fitbit]"-tekst-tag
-- VERSTOPT in het vrije-tekst `note`-veld (provenanceNote()/
-- tkMergeHealthRow()) — een RIJ-niveau, ondocumenteerd, regex-
-- gematcht signaal, niet een structureel, PER-VELD gegeven.
--
-- KRITIEK ONTWERPPUNT (opdracht sectie 14-16, expliciet onderzocht):
-- hrv_log heeft GEEN UNIQUE(user_id,date) (bevestigd, bewust zo
-- gelaten — zie het bestaande commentaar in wearable-sync.js regel
-- ~176). Zowel de handmatige als de wearable-writer lezen-mergen-
-- schrijven per VELD (hrv/rhr/sleep onafhankelijk behouden via
-- tkMergeHealthRow()/buildRow()) naar dezelfde rij. Dit betekent dat
-- ÉÉN rij aantoonbaar gemengde herkomst kan hebben: bv. HRV van
-- wearable-sync, RHR later handmatig gecorrigeerd. Een enkele
-- RIJ-niveau "source"-kolom zou dit foutief voorstellen. DAAROM:
-- per-veld provenance, niet één kolom.
--
-- FIX: 3 nieuwe, nullable kolommen — één per extern-afkomstig veld
-- (hrv/rhr/sleep; cyclus_fase/edema/note zijn altijd puur
-- gebruikersinvoer, geen wearable-sync-doel, dus geen provenance
-- nodig). Toegestane waarden: manual/wearable/unknown (bewust geen
-- aparte "provider"-kolom — er is momenteel precies één actieve
-- wearable-syncbron; een provider-kolom zou ongebruikte complexiteit
-- toevoegen, opdracht sectie 7/33: "alleen indien werkelijk nodig").
-- Bestaande rijen: NULL (= onbekend, geen enkele historische bron
-- geraden of gereconstrueerd — expliciet vereist, sectie 9).
--
-- FORWARD-ONLY. Additief. Geen bestaande rij inhoudelijk gewijzigd
-- (nieuwe kolommen krijgen default NULL). Geen bestaande query kan
-- breken.

ALTER TABLE public.hrv_log
  ADD COLUMN IF NOT EXISTS hrv_source   text,
  ADD COLUMN IF NOT EXISTS rhr_source   text,
  ADD COLUMN IF NOT EXISTS sleep_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hrv_log_hrv_source_check'
  ) THEN
    ALTER TABLE public.hrv_log
      ADD CONSTRAINT hrv_log_hrv_source_check
      CHECK (hrv_source IS NULL OR hrv_source IN ('manual','wearable','unknown'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hrv_log_rhr_source_check'
  ) THEN
    ALTER TABLE public.hrv_log
      ADD CONSTRAINT hrv_log_rhr_source_check
      CHECK (rhr_source IS NULL OR rhr_source IN ('manual','wearable','unknown'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hrv_log_sleep_source_check'
  ) THEN
    ALTER TABLE public.hrv_log
      ADD CONSTRAINT hrv_log_sleep_source_check
      CHECK (sleep_source IS NULL OR sleep_source IN ('manual','wearable','unknown'));
  END IF;
END $$;

COMMENT ON COLUMN public.hrv_log.hrv_source IS 'MS-F3-10/GAP-P1-007: herkomst van dit specifieke HRV-veld voor deze rij (manual/wearable/unknown=historisch onbekend). Per-veld, NIET rij-niveau.';
COMMENT ON COLUMN public.hrv_log.rhr_source IS 'MS-F3-10/GAP-P1-007: herkomst van dit specifieke RHR-veld voor deze rij (manual/wearable/unknown=historisch onbekend).';
COMMENT ON COLUMN public.hrv_log.sleep_source IS 'MS-F3-10/GAP-P1-007: herkomst van dit specifieke slaap-veld voor deze rij (manual/wearable/unknown=historisch onbekend).';

-- ROLLBACK (afgeraden na productiegebruik — verliest provenance-historie):
--   ALTER TABLE public.hrv_log
--     DROP COLUMN IF EXISTS hrv_source,
--     DROP COLUMN IF EXISTS rhr_source,
--     DROP COLUMN IF EXISTS sleep_source;
