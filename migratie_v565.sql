-- migratie_v565.sql — Structured Intervals B3 (Erg): canonieke ACTUAL-opslag in het sessions-domein.
-- Additief, nullable, forward-only, idempotent. Geen backfill, geen data-rewrite, geen RLS-wijziging
-- (de kolom erft de bestaande sessions-policies; daarom JSONB in de sessie-rij i.p.v. een child-tabel:
-- één atomaire write met de sessie en geen nieuwe, niet-bewijsbare policy — zelfde patroon als sets_detail).
-- Inhoud: erg_intervals_actual.v1 = {version, sport, blocks:[{lap_type, block_index, repeat_index,
-- duration_s, distance_m, power_w}], aborted}. UITSLUITEND gemeten actuals; ontbrekend blijft null/afwezig.
alter table public.sessions
  add column if not exists intervals_detail jsonb null;

comment on column public.sessions.intervals_detail is
  'Structured Intervals B3: erg_intervals_actual.v1 — werkelijk uitgevoerde interval-blokken van een ergometer-sessie (RowErg/BikeErg/SkiErg). Plan staat in training_instances.snapshot.intervalPrescription; hier staan uitsluitend gemeten actuals.';
