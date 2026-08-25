-- ============================================================================
-- MASTER SPRINT — HYROX/TRIATHLON ARCHITECTURAL HARDENING (v4.90.0)
-- ============================================================================
-- DOEL: vervang de note-tijdstempel-workaround (hyrox_ts:start=...,end=...) door
-- echte, RAW-DATA-kolommen. RAW DATA (start_at/finish_at) is de bron van waarheid;
-- duur en transitietijd blijven Calculation Engine-output, gededuceerd uit deze
-- twee wall-clock-tijdstempels — nooit apart gematerialiseerd (principe: geen
-- derived data als raw data opslaan).
--
-- SCOPE-ONDERZOEK (vóór deze migratie uitgevoerd, read-only):
-- - Slechts 1 bestaande HYROX-rij in de live database, 0 Triathlon-brick-rijen
--   (verklaarbaar: de extraNote-bug blokkeerde vrijwel elke opslag vóór PR #34).
-- - Geen aparte training_segments/training_segment_events-tabel nodig: sessions
--   is al de gevestigde, door ALLE trainingstypen (kracht/cardio/WOD/HYROX)
--   gedeelde "segment"-tabel — dit is het bestaande, generieke patroon, geen
--   HYROX-specifieke hack. Een aparte tabel zou dat juist doorbreken.
-- - training_instances bevat al started_at/completed_at (instance-niveau) en
--   alle racecontextvelden (race_format/tier/gender/relay/adaptive) — dit IS al
--   de voorgestelde "training_instances + training_context"-structuur, correct
--   1:1 samengevoegd.
-- ============================================================================

alter table public.sessions
  add column if not exists start_at timestamptz;

alter table public.sessions
  add column if not exists finish_at timestamptz;

comment on column public.sessions.start_at is
  'v4.90.0 -- RAW DATA: wall-clock starttijdstip van dit segment (HYROX/Triathlon-brick). Vervangt de note-hack (hyrox_ts:start=...). Duur/transitie zijn Calculation Engine-output, hieruit gededuceerd, nooit apart opgeslagen.';
comment on column public.sessions.finish_at is
  'v4.90.0 -- RAW DATA: wall-clock eindtijdstip van dit segment. Transitietijd naar het VOLGENDE segment = volgende.start_at - dit.finish_at, altijd on-the-fly berekend.';

-- BACKFILL: de enige bestaande rij met de oude note-annotatie, migreren naar de
-- nieuwe kolommen. Geen data weggooien — de note-inhoud zelf blijft ongewijzigd
-- staan (onschadelijk technisch restant, de applicatiecode leest hem niet meer
-- als tijdstempel-annotatie na deze migratie).
update public.sessions
set start_at = to_timestamp((regexp_match(note, 'hyrox_ts:start=(\d+)'))[1]::bigint / 1000.0),
    finish_at = to_timestamp((regexp_match(note, 'hyrox_ts:start=\d+,end=(\d+)'))[1]::bigint / 1000.0)
where note like 'hyrox_ts:%'
  and start_at is null;
