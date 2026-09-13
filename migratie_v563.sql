-- migratie_v563.sql
-- STRUCTURED ENDURANCE INTERVALS — FASE B1 (running canonical lifecycle).
-- Additief, forward-only, nullable. Geen backfill, geen parsing van exNote,
-- geen reconstructie van historische intervallen, geen RLS-wijziging.
--
-- Architectuurbesluit (Structured Intervals Completion Audit, 13-09-2026):
--   PLAN            = custom_trainings.metadata.intervalPrescription
--                     (formaat: IntervalEngineCore.normalizePrescription, interval_prescription.v1)
--   PLAN-SNAPSHOT   = training_instances.snapshot (bestaand jsonb; krijgt intervalPrescription mee)
--   ACTUAL SESSION  = activities
--   ACTUAL BLOK/LAP = activity_laps
-- Planned waarden worden NIET naar activity_laps gedupliceerd.

-- 1. activities.training_instance_id — plan↔actual-koppeling (zelfde patroon als
--    sessions.training_instance_id in migratie_v536/v551: ON DELETE SET NULL, zodat het
--    verwijderen van een instance NOOIT historische activity-data verwijdert).
alter table public.activities
  add column if not exists training_instance_id uuid null
    references public.training_instances(id) on delete set null;
create index if not exists activities_training_instance_id_idx
  on public.activities (training_instance_id);

-- 2. activity_laps: bloksemantiek voor gestructureerde laps (nullable; oude laps blijven typeloos).
alter table public.activity_laps
  add column if not exists lap_type text null
    check (lap_type is null or lap_type in ('warmup','work','recovery','cooldown','manual'));
alter table public.activity_laps
  add column if not exists block_index integer null
    check (block_index is null or block_index >= 0);
alter table public.activity_laps
  add column if not exists repeat_index integer null
    check (repeat_index is null or repeat_index >= 0);

comment on column public.activities.training_instance_id is
  'Optionele koppeling naar training_instances (plan-snapshot). NULL voor legacy/ad-hoc activiteiten. ON DELETE SET NULL: historische activities blijven bestaan.';
comment on column public.activity_laps.lap_type is
  'Blocktype van de uitgevoerde lap (warmup|work|recovery|cooldown|manual). NULL = legacy handmatige lap zonder bloksemantiek.';
comment on column public.activity_laps.block_index is
  'Index in de genormaliseerde (uitgerolde) prescription.blocks van de instance-snapshot. NULL = legacy.';
comment on column public.activity_laps.repeat_index is
  'repeatIndex (0-based) van het blok in de prescription. NULL = legacy.';

-- RLS: activities/activity_laps behouden hun bestaande policies (user_id = auth.uid() resp.
-- via activity_id). Geen nieuwe policy nodig; geen verzwakking.
-- Rollback (handmatig, alleen indien nodig): alter table ... drop column ... — verliest uitsluitend
-- de nieuwe, nullable kolommen; geen bestaande data geraakt.
