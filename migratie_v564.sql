-- migratie_v564.sql — Strength Basis Recency B1 (CALC-STR-006)
-- Additief, nullable, forward-only, idempotent. Geen backfill, geen data-rewrite, geen RLS-wijziging.
-- exercise_goals.updated_at = provenance-datum van de HANDMATIGE 1RM (alleen gezet bij one_rm-wijzigingen;
-- PR/peak_goal-updates raken deze kolom niet). Bestaande rijen blijven NULL = "datum onbekend" (fail-safe:
-- lage data-quality, geen numerieke straf).
alter table public.exercise_goals
  add column if not exists updated_at timestamptz null;

comment on column public.exercise_goals.updated_at is
  'Strength Basis Recency B1: datum van de laatste handmatige one_rm-wijziging (provenance). NULL = onbekend. Geen invloed op PR.';
